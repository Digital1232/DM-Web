/**
 * One Report – calculation engine (no DOM access).
 *
 * Builds one report model from raw Firebase data. The dashboard, charts and
 * every export (Excel / PDF / CSV) read from this same model, so totals always
 * reconcile. Permission scoping happens here, before any metric is computed.
 */
(function (window) {
    'use strict';

    const HOUR = 3600;
    const DAY_MS = 86400000;

    const DEFAULT_SETTINGS = {
        hoursPerDay: 8,
        lateAfterMinutes: 9 * 60 + 45, // 9:45 AM – same rule as the HR attendance view
        workWeek: [1, 2, 3, 4, 5, 6]   // Mon–Sat (Sunday off)
    };

    const AGGREGATE_LABEL = 'Monthly Aggregate – Historical';
    const INTERNAL_CLIENT = 'Internal (VilPower)';

    // Client names that are not real clients → work counts as internal.
    const NON_CLIENT_NAMES = new Set([
        '', 'general', 'others', 'other', 'internal', 'vilpower', 'vil power', 'vilpower internal',
        'learnings', 'learning', 'none', 'na', 'n/a', 'unassigned', 'office', '-', 'internal (vilpower)'
    ]);

    // Task category is derived from the task title (the data has no category field).
    // Order matters: first match wins.
    const CATEGORY_RULES = [
        ['QC Review', /^\[qc\]|\bqc\b|quality check/],
        ['Learning', /\blearning|training|morning learn/],
        ['Shoot', /\bshoot|photoshoot|filming/],
        ['Business Development', /business development|\bbd\b|\bsales\b|\blead(s)?\b|proposal|pitch|prospect|client meeting|onboarding call/],
        ['Video Editing', /\bvideo|\breel|\bedit|youtube|shorts|motion|animation|\bvfx\b/],
        ['Design', /\bdesign|poster|thumbnail|creative|banner|\blogo|graphic|carousel|brochure|flyer|mockup/],
        ['Content Writing', /\bcontent|caption|\bcopy\b|copywrit|script|\bblog|article|writ/],
        ['Ads & Campaigns', /\bads?\b|campaign|meta ads|google ads|\bppc\b|boost/],
        ['SEO & Web', /\bseo\b|website|web page|landing page|wordpress|backlink|\bgmb\b|google business/],
        ['Social Media Management', /\bpost(ing|ed)?\b|schedul|social media|instagram|facebook|linkedin|engagement|analytics/],
        ['Strategy & Planning', /strategy|\bplan(ning)?\b|calendar|research|audit/],
        ['Meetings & Reporting', /meeting|\breport|\bcall\b|review|discussion|\bdpr\b/]
    ];
    const CATEGORIES = CATEGORY_RULES.map(r => r[0]).concat(['Other']);

    const ADMIN_ROLES = ['system admin', 'administrator', 'owner', 'super admin'];

    // ─────────────────────────────────────────────────────────────
    // Small helpers
    // ─────────────────────────────────────────────────────────────

    function engine() { return window.OneDeskReportingEngine || null; }

    function normEmail(e) {
        const E = engine();
        if (E && typeof E.normalizeEmail === 'function') return E.normalizeEmail(e);
        return String(e || '').trim().toLowerCase();
    }

    function toTs(val) {
        if (val === null || val === undefined || val === '') return 0;
        if (typeof val === 'number') return isFinite(val) ? val : 0;
        if (val instanceof Date) return val.getTime();
        if (typeof val === 'object' && (val.seconds || val._seconds)) return (val.seconds || val._seconds) * 1000;
        const s = String(val).trim();
        if (/^\d+$/.test(s)) return parseInt(s, 10);
        const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (m) return new Date(+m[1], +m[2] - 1, +m[3]).getTime();
        const p = Date.parse(s);
        return isNaN(p) ? 0 : p;
    }

    function localDateStr(ts) {
        const d = new Date(ts);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function parseDateStr(s) {
        const m = String(s || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
    }

    function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
    function hours(sec) { return sec / HOUR; }

    function num(v) {
        if (v === null || v === undefined || v === '') return null;
        const n = Number(v);
        return isFinite(n) ? n : null;
    }

    function isJiraKey(id) {
        return /^[A-Z][A-Z0-9]+-\d+$/.test(String(id || '').trim().toUpperCase()) &&
            !/^(M|LEARN|SHOOT)-/i.test(String(id || '').trim());
    }

    function isInternalTaskObj(t, taskId) {
        const id = String(taskId || (t && (t.id || t.taskId)) || '').toUpperCase().trim();
        if (id.startsWith('M-') || id.startsWith('LEARN-')) return true;
        if (t) {
            if (t.manual === true || t.manual === 'true' || t.internal === true || t.internal === 'true') return true;
            if (String(t.taskType || '').toLowerCase() === 'internal') return true;
            if (String(t.taskType || '').toLowerCase() === 'jira') return false;
        }
        return !isJiraKey(id);
    }

    // Client spellings that differ only by case/spacing are merged during a build
    // (Excel's SUMIFS treats them as equal too, so totals stay consistent).
    let clientCanon = null;
    const clientKey = s => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();

    function cleanClient(raw) {
        const s = String(raw || '').trim().replace(/\s+/g, ' ');
        if (NON_CLIENT_NAMES.has(s.toLowerCase())) return INTERNAL_CLIENT;
        return (clientCanon && clientCanon.get(clientKey(s))) || s;
    }

    function buildClientCanon(ctx) {
        const counts = new Map(); // key -> Map(variant -> count)
        const add = v => {
            const s = String(v || '').trim().replace(/\s+/g, ' ');
            if (!s || NON_CLIENT_NAMES.has(s.toLowerCase())) return;
            const k = clientKey(s);
            const m = counts.get(k) || new Map();
            m.set(s, (m.get(s) || 0) + 1);
            counts.set(k, m);
        };
        (ctx.timeLogs || []).forEach(l => l && add(l.client || l.clientName));
        (ctx.tasks || []).forEach(t => t && add(t.client));
        (ctx.qcReports || []).forEach(r => r && add(r.client));
        const canon = new Map();
        // Most frequent spelling wins; ties go to the first seen.
        counts.forEach((m, k) => canon.set(k, [...m.entries()].sort((a, b) => b[1] - a[1])[0][0]));
        return canon;
    }

    function deriveCategory(desc, task) {
        const text = `${desc || ''} ${(task && (task.issueType || '')) || ''}`.toLowerCase();
        if (task && (task.shootPlan || task.shootGroupId)) return 'Shoot';
        if (task && (task.learningSession === true || String(task.id || '').toUpperCase().startsWith('LEARN-'))) return 'Learning';
        for (const [name, re] of CATEGORY_RULES) if (re.test(text)) return name;
        return 'Other';
    }

    function deriveWorkType(client, category) {
        if (category === 'Business Development') return 'Business Development';
        return client === INTERNAL_CLIENT ? 'Internal' : 'Client';
    }

    function isBreakLog(raw) {
        const id = String(raw.taskId || '').toLowerCase();
        const d = String(raw.taskDesc || raw.taskName || '').trim().toLowerCase();
        return id === 'break' || id.startsWith('break-') || raw.isBreak === true ||
            /^(lunch|tea|coffee|short)?\s*break$/.test(d) || d === 'on break';
    }

    function isExplicitAggregate(raw) {
        const tags = [raw.entryType, raw.source, raw.type, raw.kind, raw.logType].map(v => String(v || '').toLowerCase());
        return raw.isAggregate === true || raw.aggregate === true || raw.historical === true || raw.isHistorical === true ||
            tags.some(t => t.includes('aggregate') || t.includes('historical') || t === 'monthly');
    }

    // ─────────────────────────────────────────────────────────────
    // Period
    // ─────────────────────────────────────────────────────────────

    function resolvePeriod(p, now) {
        now = now || Date.now();
        const today = new Date(now);
        let from, to, label;
        const mode = (p && p.mode) || 'current_month';
        if (mode === 'prev_month') {
            from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            to = new Date(today.getFullYear(), today.getMonth(), 0);
        } else if (mode === 'month' && p.month) {
            const [y, m] = String(p.month).split('-').map(Number);
            from = new Date(y, m - 1, 1);
            to = new Date(y, m, 0);
        } else if (mode === 'custom' && p.from && p.to) {
            from = parseDateStr(p.from);
            to = parseDateStr(p.to);
            if (from > to) { const x = from; from = to; to = x; }
        } else {
            from = new Date(today.getFullYear(), today.getMonth(), 1);
            to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        }
        const fromTs = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
        const toTs = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999).getTime();
        const isFullMonth = from.getDate() === 1 && to.getDate() === new Date(to.getFullYear(), to.getMonth() + 1, 0).getDate() &&
            from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear();
        label = isFullMonth
            ? from.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            : `${localDateStr(fromTs)} to ${localDateStr(toTs)}`;
        // Capacity is measured up to today for in-progress periods.
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).getTime();
        const capacityToTs = Math.min(toTs, endOfToday);
        return {
            mode, fromTs, toTs, label, isFullMonth,
            fromStr: localDateStr(fromTs), toStr: localDateStr(toTs),
            capacityToTs, capacityToStr: capacityToTs >= fromTs ? localDateStr(capacityToTs) : null,
            inProgress: toTs > endOfToday && fromTs <= endOfToday
        };
    }

    // ─────────────────────────────────────────────────────────────
    // Permissions
    // ─────────────────────────────────────────────────────────────

    /**
     * Returns { level, emails } where emails === null means "all employees".
     * Admin/Owner → all. Manager → all. Team Lead → self + direct reports
     * (from the leave approval chains). Everyone else → self only.
     */
    function resolveScope(viewer, ctx) {
        const email = normEmail(viewer && viewer.email);
        if (!email) return { level: 'none', emails: new Set() };
        const role = String((viewer && viewer.role) || '').trim().toLowerCase();
        const adminEmails = (ctx.adminEmails || []).map(normEmail);
        const managerEmails = (ctx.managerEmails || []).map(normEmail);

        if (adminEmails.includes(email) || ADMIN_ROLES.some(r => role === r)) return { level: 'admin', emails: null };
        if (managerEmails.includes(email) || role === 'manager') return { level: 'manager', emails: null };

        const chains = ctx.approvalChains || {};
        const reports = Object.entries(chains)
            .filter(([, approvers]) => Array.isArray(approvers) && approvers.some(a => normEmail(a) === email))
            .map(([emp]) => normEmail(emp));
        if (reports.length > 0 || /\blead\b/.test(role)) {
            return { level: 'lead', emails: new Set([email, ...reports]) };
        }
        return { level: 'employee', emails: new Set([email]) };
    }

    function inScope(scope, email) {
        if (!scope) return false;
        if (scope.emails === null) return true;
        return scope.emails.has(normEmail(email));
    }

    // ─────────────────────────────────────────────────────────────
    // Employees directory
    // ─────────────────────────────────────────────────────────────

    // A "name" that is really an email or email prefix (e.g. "anithavilpower") is not a display name.
    function isEmailLikeName(name, email) {
        const n = String(name || '').trim().toLowerCase();
        if (!n) return true;
        if (n.includes('@')) return true;
        const prefix = String(email || '').split('@')[0].toLowerCase();
        return n === prefix || n.replace(/[^a-z0-9]/g, '') === prefix.replace(/[^a-z0-9]/g, '');
    }

    // Readable fallback when no real name exists: "anithavilpower@gmail.com" → "Anithavilpower".
    function nameFromEmail(email) {
        const p = String(email || '').split('@')[0].replace(/[._-]+/g, ' ').trim();
        return p ? p.replace(/\b\w/g, c => c.toUpperCase()) : email;
    }

    /**
     * Display names, by trust: staff catalogue (rank 3) > login profile (2) > name saved on
     * a time log (1). A lower-ranked source never overrides a higher one, and email-like
     * names are only used when nothing better exists.
     */
    function buildDirectory(ctx) {
        const map = new Map();
        const add = (email, name, role, rank, fromCatalog) => {
            const e = normEmail(email);
            if (!e || e.startsWith('name:')) return;
            const nm = String(name || '').trim();
            const usable = nm && !isEmailLikeName(nm, e);
            const cur = map.get(e);
            if (!cur) {
                map.set(e, { email: e, name: usable ? nm : '', nameRank: usable ? rank : 0, role: role || '', roleRank: role ? rank : 0, catalog: !!fromCatalog });
                return;
            }
            if (usable && rank > cur.nameRank) { cur.name = nm; cur.nameRank = rank; }
            if (role && rank > cur.roleRank) { cur.role = role; cur.roleRank = rank; }
            if (fromCatalog) cur.catalog = true;
        };
        (ctx.staff || []).forEach(u => add(u.email, u.name, u.role || u.designation, 3, true));
        (ctx.users || []).forEach(u => add(u.email, u.name, u.role || u.designation, 2, true));
        (ctx.timeLogs || []).forEach(l => add(l.userId || l.email, l.userName, '', 1, false));
        map.forEach(p => { if (!p.name) p.name = nameFromEmail(p.email); });
        return map;
    }

    // ─────────────────────────────────────────────────────────────
    // Time log normalisation
    // ─────────────────────────────────────────────────────────────

    function normalizeLogs(ctx, taskMap, dir) {
        const out = [];
        const seen = new Set();
        let breaksExcluded = 0;
        let undated = 0;

        (ctx.timeLogs || []).forEach((raw, idx) => {
            if (!raw || typeof raw !== 'object') return;
            const email = normEmail(raw.userId || raw.email || raw.userEmail);
            if (!email) return;
            if (isBreakLog(raw)) { breaksExcluded++; return; }

            const start = toTs(raw.startTime || raw.startedAt);
            const end = toTs(raw.endTime || raw.completedAt);
            let dur = num(raw.durationSeconds);
            if (dur === null && num(raw.duration) !== null) {
                const d = num(raw.duration);
                dur = d > 86400 ? d / 1000 : d;
            }
            if (dur === null && start && end && end > start) dur = (end - start) / 1000;
            if (dur === null && num(raw.hours) !== null) dur = num(raw.hours) * HOUR;
            dur = Math.max(0, Math.floor(dur || 0));
            if (dur === 0) return;

            const aggregate = isExplicitAggregate(raw) || (!start && !end);
            const dateTs = start || end || toTs(raw.date) || toTs(raw.timestamp) ||
                (raw.month ? toTs(`${raw.month}-01`) : 0);
            if (!dateTs) { undated++; return; }

            const key = raw.id || `${String(raw.taskId || raw.taskDesc || '').trim().toLowerCase()}_${start || dateTs}_${email}`;
            if (seen.has(key)) return;
            seen.add(key);

            const taskId = String(raw.taskId || '').trim();
            const task = taskId ? taskMap.get(taskId.toLowerCase()) : null;
            const desc = String(raw.taskDesc || raw.taskName || raw.title || (task && (task.desc || task.summary)) || '').trim();
            const client = cleanClient(raw.client || raw.clientName || (task && task.client));
            const category = deriveCategory(desc, task);
            const person = dir.get(email);

            out.push({
                idx,
                id: String(key),
                email,
                employee: (person && person.name) || raw.userName || email,
                dateTs,
                date: localDateStr(dateTs),
                start: aggregate ? 0 : start,
                end: aggregate ? 0 : end,
                rawSeconds: dur,
                seconds: dur,
                taskId: taskId || '—',
                source: isInternalTaskObj(task, taskId) ? 'Internal' : 'Jira',
                client,
                category,
                workType: deriveWorkType(client, category),
                description: desc || 'Untitled task',
                entryType: aggregate ? AGGREGATE_LABEL : 'Session',
                remarks: aggregate ? AGGREGATE_LABEL + ' (no start/end recorded)' : ''
            });
        });

        // Build earliest check-in map & merged disjoint break intervals per user BEFORE overlap sweep
        const checkInByDate = {};
        const rawBreaksByUser = {};
        (ctx.attendanceEvents || []).forEach(e => {
            if (!e) return;
            const em = normEmail(e.userId || e.email);
            if (!em) return;
            const ts = toTs(e.timestamp);
            if (e.type === 'check_in' && ts) {
                const d = localDateStr(ts);
                const k = `${em}|${d}`;
                if (!checkInByDate[k] || ts < checkInByDate[k]) checkInByDate[k] = ts;
            } else if (e.type === 'break_end' && e.duration && ts) {
                const bDur = Math.floor(Number(e.duration) / 1000);
                const bStart = ts - bDur * 1000;
                if (bStart > 0 && ts > bStart) {
                    (rawBreaksByUser[em] = rawBreaksByUser[em] || []).push({ start: bStart, end: ts });
                }
            }
        });

        const mergedBreaksByUser = {};
        Object.keys(rawBreaksByUser).forEach(em => {
            const sorted = rawBreaksByUser[em].sort((a, b) => a.start - b.start);
            const merged = [];
            sorted.forEach(b => {
                if (!merged.length || b.start >= merged[merged.length - 1].end) {
                    merged.push({ start: b.start, end: b.end });
                } else {
                    merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, b.end);
                }
            });
            mergedBreaksByUser[em] = merged;
        });

        // Remove accidental ghost sessions and clamp sessions to first check-in BEFORE overlap trimming
        const filteredOut = [];
        out.forEach(l => {
            if (l.entryType === 'Session' && l.start) {
                const d = localDateStr(l.start);
                const chk = checkInByDate[`${l.email}|${d}`];
                if (chk) {
                    const startH = new Date(l.start).getHours();
                    const chkH = new Date(chk).getHours();
                    if (chkH >= 8 && startH <= 6) return; // Ghost overnight session
                    const origEnd = l.end && l.end > l.start ? l.end : l.start + l.rawSeconds * 1000;
                    if (l.start < chk) {
                        if (origEnd <= chk) return; // Entirely prior to check-in
                        l.start = chk;
                        l.end = origEnd;
                        l.dateTs = chk;
                        l.date = localDateStr(chk);
                        const clampedSec = Math.floor((origEnd - chk) / 1000);
                        l.rawSeconds = Math.min(l.rawSeconds, clampedSec);
                        l.seconds = Math.min(l.seconds, clampedSec);
                        l.remarks = l.remarks ? `${l.remarks} | Clamped to check-in` : 'Clamped to check-in';
                    }
                }
            }
            filteredOut.push(l);
        });
        out.length = 0;
        filteredOut.forEach(l => out.push(l));

        // Remove overlap between sessions AND deduct disjoint break overlaps only from non-overlapping slices
        const byUser = {};
        out.filter(l => l.entryType === 'Session' && l.start).forEach(l => (byUser[l.email] = byUser[l.email] || []).push(l));
        let overlapSecondsRemoved = 0;
        Object.values(byUser).forEach(list => {
            list.sort((a, b) => a.start - b.start);
            let cursor = 0;
            list.forEach(l => {
                const end = l.end && l.end > l.start ? l.end : l.start + l.rawSeconds * 1000;
                const effStart = cursor ? Math.max(l.start, cursor) : l.start;
                if (effStart > l.start) {
                    const overlap = Math.floor((Math.min(end, cursor) - l.start) / 1000);
                    if (overlap > 0) {
                        const cut = Math.min(overlap, l.seconds);
                        l.seconds -= cut;
                        overlapSecondsRemoved += cut;
                        l.remarks = `Overlaps another session – ${Math.round(cut / 60)}m not double-counted`;
                    }
                }
                cursor = Math.max(cursor, end);

                if (effStart < end && l.seconds > 0) {
                    const userBreaks = mergedBreaksByUser[l.email] || [];
                    let breakOverlapSec = 0;
                    userBreaks.forEach(b => {
                        if (b.end > effStart && b.start < end) {
                            breakOverlapSec += Math.floor((Math.min(end, b.end) - Math.max(effStart, b.start)) / 1000);
                        }
                    });
                    if (breakOverlapSec > 0) {
                        const bCut = Math.min(breakOverlapSec, l.seconds);
                        l.seconds = Math.max(0, l.seconds - bCut);
                        const prevRemark = l.remarks ? l.remarks + ' | ' : '';
                        l.remarks = `${prevRemark}Break (${Math.round(bCut / 60)}m) deducted`;
                    }
                }
            });
        });

        return { logs: out, breaksExcluded, undated, overlapSecondsRemoved };
    }

    // ─────────────────────────────────────────────────────────────
    // Attendance, leave & capacity
    // ─────────────────────────────────────────────────────────────

    function workingDaysBetween(fromTs, toTs, settings) {
        const days = [];
        if (!toTs || toTs < fromTs) return days;
        const d = new Date(fromTs);
        d.setHours(0, 0, 0, 0);
        while (d.getTime() <= toTs) {
            if (settings.workWeek.includes(d.getDay())) days.push(localDateStr(d.getTime()));
            d.setDate(d.getDate() + 1);
        }
        return days;
    }

    function leaveIndex(requests) {
        // email → { leave: Map(date → fraction), saturdayOff: Set(date) }
        const idx = {};
        (requests || []).forEach(r => {
            if (!r || String(r.status || '').toLowerCase() !== 'approved') return;
            const email = normEmail(r.userId || r.userEmail || r.email);
            if (!email) return;
            const slot = idx[email] = idx[email] || { leave: new Map(), saturdayOff: new Set() };
            if (r.type === 'saturday' && r.date) {
                slot.saturdayOff.add(String(r.date).slice(0, 10));
            } else if (r.type === 'leave' && r.fromDate) {
                const from = parseDateStr(r.fromDate);
                const to = parseDateStr(r.toDate || r.fromDate) || from;
                if (!from) return;
                const half = r.leaveDays === 0.5 || /half/.test(String(r.leaveDuration || '').toLowerCase());
                const d = new Date(from);
                while (d <= to) {
                    const ds = localDateStr(d.getTime());
                    slot.leave.set(ds, Math.max(slot.leave.get(ds) || 0, half ? 0.5 : 1));
                    d.setDate(d.getDate() + 1);
                }
            }
        });
        return idx;
    }

    function buildAttendance(ctx, emails, period, settings, nowTs) {
        const todayStr = localDateStr(nowTs);
        const days = {}; // email → date → rec
        (ctx.attendanceEvents || []).forEach(e => {
            if (!e) return;
            const email = normEmail(e.userId || e.email);
            if (!emails.has(email)) return;
            const ts = toTs(e.timestamp);
            if (!ts) return;
            const date = e.date || localDateStr(ts);
            const dTs = toTs(date);
            if (dTs < period.fromTs || dTs > period.toTs) return;
            const u = days[email] = days[email] || {};
            const rec = u[date] = u[date] || { date, ins: [], outs: [], breakSec: 0 };
            if (e.type === 'check_in') rec.ins.push(ts);
            else if (e.type === 'check_out') rec.outs.push(ts);
            else if (e.type === 'break_end' && num(e.duration)) rec.breakSec += Math.floor(num(e.duration) / 1000);
        });

        const result = {};
        emails.forEach(email => {
            const recs = Object.values(days[email] || {});
            let present = 0, late = 0, breakSec = 0, workSec = 0, missingCheckout = 0;
            recs.forEach(r => {
                if (!r.ins.length) return;
                present++;
                const firstIn = Math.min(...r.ins);
                const fin = new Date(firstIn);
                if (fin.getHours() * 60 + fin.getMinutes() > settings.lateAfterMinutes) late++;
                breakSec += r.breakSec;
                const lastOut = r.outs.length ? Math.max(...r.outs) : 0;
                if (lastOut > firstIn) {
                    workSec += Math.max(0, Math.floor((lastOut - firstIn) / 1000) - r.breakSec);
                } else if (r.date !== todayStr) {
                    missingCheckout++; // hours not counted – never assumed
                }
            });
            result[email] = { present, late, breakSec, workSec, missingCheckout, recordedDays: recs.length };
        });
        return result;
    }

    // ─────────────────────────────────────────────────────────────
    // Tasks, QC, shoots
    // ─────────────────────────────────────────────────────────────

    function taskMatchesEmail(t, email) {
        const E = engine();
        if (E && typeof E.matchesUser === 'function') {
            try { return E.matchesUser(t, email); } catch (e) { /* fall through */ }
        }
        return [t.assigneeEmail, t.userId, t.email].some(v => normEmail(v) === email);
    }

    function taskPasses(t, filters) {
        const id = t.id || t.taskId;
        const client = cleanClient(t.client);
        const source = isInternalTaskObj(t, id) ? 'Internal' : 'Jira';
        const category = deriveCategory(t.desc || t.summary || t.title, t);
        if (filters.client !== 'all' && client !== filters.client) return false;
        if (filters.source !== 'all' && source !== filters.source) return false;
        if (filters.category !== 'all' && category !== filters.category) return false;
        return true;
    }

    function auditTasks(ctx, email, period, filters, nowTs) {
        const E = engine();
        const all = (ctx.tasks || []).filter(t => t && !t.parentId);
        const mine = all.filter(t => taskMatchesEmail(t, email) && taskPasses(t, filters));
        // Pipeline statuses such as "Shoot Completed" / "Post Completed" are not in the shared taxonomy.
        const DONE_RE = /\b(completed?|done|posted|client approved|client sent)\b/i;
        const isDone = s => (E && E.isCompletedStatus(s)) || DONE_RE.test(String(s || ''));
        const isProg = s => E ? E.isInProgressStatus(s) : /progress|working/i.test(String(s || ''));
        const isRework = s => E ? E.isReworkStatus(s) : /rework|revision|correction/i.test(String(s || ''));
        const isCancelled = s => /cancel/i.test(String(s || ''));

        const res = { assigned: 0, completed: 0, pending: 0, inProgress: 0, overdue: 0, rework: 0 };
        mine.forEach(t => {
            if (isCancelled(t.status)) return;
            const created = toTs(t.createdAt || t.created);
            const updated = toTs(t.updatedAt || t.updated);
            const completed = toTs(t.completedAt || t.lastCompletedDate);
            const dueStr = String(t.duedate || t.dueDate || '').slice(0, 10);
            const due = toTs(dueStr);
            const inRange = v => v >= period.fromTs && v <= period.toTs;
            const touches = inRange(created) || inRange(updated) || inRange(completed) || inRange(due);
            const done = isDone(t.status);

            if (done) {
                const when = completed || updated || due;
                if (!(when ? inRange(when) : touches)) return;
                res.completed++;
                res.assigned++;
            } else {
                // Open tasks are "assigned" if they existed by the end of the period.
                if (created && created > period.toTs) return;
                res.assigned++;
                res.pending++;
                if (isProg(t.status)) res.inProgress++;
                if (due && dueStr < (period.toTs < nowTs ? localDateStr(period.toTs) : localDateStr(nowTs))) res.overdue++;
            }
            if (isRework(t.status) || (Number(t.reworkCount) > 0 && touches)) res.rework++;
        });
        return res;
    }

    function buildQc(ctx, scope, filters, period, taskMap, dir) {
        const all = (ctx.qcReports || []).filter(Boolean).map(r => ({ ...r, _ts: toTs(r.timestamp || r.date || r.createdAt) }));
        // Rework rounds are counted across all history, then reported for in-period reviews.
        const failsByTask = {};
        all.slice().sort((a, b) => a._ts - b._ts).forEach(r => {
            const tid = r.taskId || r.id;
            if (String(r.status || '').toLowerCase() === 'rework') failsByTask[tid] = (failsByTask[tid] || 0) + 1;
            r._roundsSoFar = failsByTask[tid] || 0;
        });
        const nameOf = e => (dir.get(e) && dir.get(e).name) || e;

        const rows = [];
        all.forEach(r => {
            if (r._ts < period.fromTs || r._ts > period.toTs) return;
            const creator = normEmail(r.assigneeEmail);
            const reviewer = normEmail(r.qcEmail);
            if (!inScope(scope, creator) && !inScope(scope, reviewer)) return;
            if (filters.employee !== 'all' && creator !== filters.employee && reviewer !== filters.employee) return;
            const task = taskMap.get(r.taskId) || null;
            const client = cleanClient(r.client || (task && task.client));
            const source = isInternalTaskObj(task, r.taskId) ? 'Internal' : 'Jira';
            const category = deriveCategory(r.taskDesc || (task && task.desc), task);
            if (filters.client !== 'all' && client !== filters.client) return;
            if (filters.source !== 'all' && source !== filters.source) return;
            if (filters.category !== 'all' && category !== filters.category) return;
            const status = String(r.status || '').toLowerCase();
            const passed = status === 'approved' ? true : (status === 'rework' ? false : null);
            const reasons = Array.isArray(r.mistakeItems) ? r.mistakeItems.filter(Boolean) : [];
            rows.push({
                creator: creator ? nameOf(creator) : (r.assignee || '—'),
                reviewer: reviewer ? nameOf(reviewer) : (r.qcUser || '—'),
                submissionId: r.taskId || r.id || '—',
                description: r.taskDesc || (task && task.desc) || '',
                client,
                dateTs: r._ts,
                date: localDateStr(r._ts),
                reviewStatus: r.status || 'Reviewed',
                result: passed === true ? 'Pass' : (passed === false ? 'Fail' : 'N/A'),
                failureReason: passed === false ? (reasons.join('; ') || r.notes || 'Not recorded') : '',
                reworkRounds: r._roundsSoFar,
                qcSeconds: Math.max(0, Math.floor(num(r.durationSeconds) || 0)),
                score: num(r.qcScore)
            });
        });
        rows.sort((a, b) => a.dateTs - b.dateTs);
        const passed = rows.filter(r => r.result === 'Pass').length;
        const failed = rows.filter(r => r.result === 'Fail').length;
        return {
            rows,
            reviews: rows.length,
            passed,
            failed,
            passRate: (passed + failed) > 0 ? passed / (passed + failed) : null,
            qcSeconds: rows.reduce((s, r) => s + r.qcSeconds, 0)
        };
    }

    function mergedIntervalSeconds(intervals) {
        const list = intervals.filter(i => i[1] > i[0]).sort((a, b) => a[0] - b[0]);
        let total = 0, curS = null, curE = null;
        list.forEach(([s, e]) => {
            if (curS === null) { curS = s; curE = e; return; }
            if (s <= curE) curE = Math.max(curE, e);
            else { total += curE - curS; curS = s; curE = e; }
        });
        if (curS !== null) total += curE - curS;
        return Math.floor(total / 1000);
    }

    function buildShoots(ctx, scope, filters, period, logs, dir) {
        if (filters.source === 'Jira') return { rows: [], productionSeconds: 0 };
        if (filters.category !== 'all' && filters.category !== 'Shoot') return { rows: [], productionSeconds: 0 };
        const groups = {};
        (ctx.tasks || []).forEach(t => {
            if (!t || !(t.shootPlan || t.shootGroupId)) return;
            const gid = t.shootGroupId || t.id;
            (groups[gid] = groups[gid] || []).push(t);
        });
        const logsByTask = {};
        logs.forEach(l => (logsByTask[l.taskId] = logsByTask[l.taskId] || []).push(l));
        const rank = s => ['shoot cancelled', 'shoot needed', 'shoot planned', 'shoot in progress', 'shoot completed']
            .indexOf(String(s || '').toLowerCase());

        const rows = [];
        Object.entries(groups).forEach(([gid, list]) => {
            const dateStr = String(list[0].duedate || list[0].dueDate || '').slice(0, 10);
            const dTs = toTs(dateStr);
            if (!dTs || dTs < period.fromTs || dTs > period.toTs) return;
            const client = cleanClient(list[0].client);
            if (filters.client !== 'all' && client !== filters.client) return;
            const emails = [...new Set(list.map(t => normEmail(t.assigneeEmail || t.userId)).filter(Boolean))];
            const visible = emails.filter(e => inScope(scope, e));
            if (!visible.length) return;
            if (filters.employee !== 'all' && !emails.includes(filters.employee)) return;

            const groupLogs = list.flatMap(t => logsByTask[t.id] || []);
            const sessionLogs = groupLogs.filter(l => l.entryType === 'Session' && l.start);
            const wallSec = mergedIntervalSeconds(sessionLogs.map(l => [l.start, l.start + l.seconds * 1000]));
            const personSec = groupLogs.reduce((s, l) => s + l.seconds, 0);
            const statuses = list.map(t => t.status);
            const best = statuses.reduce((a, s) => rank(s) > rank(a) ? s : a, statuses[0]);
            const hidden = emails.length - visible.length;

            rows.push({
                shootId: gid,
                title: list[0].desc || '',
                client,
                dateTs: dTs,
                date: dateStr,
                assignees: visible.map(e => (dir.get(e) && dir.get(e).name) || e).join(', ') + (hidden > 0 ? ` +${hidden} other${hidden > 1 ? 's' : ''}` : ''),
                assigneeCount: emails.length,
                shootSeconds: sessionLogs.length ? wallSec : null,
                productionSeconds: groupLogs.length ? personSec : null,
                editingSeconds: null, // edit tasks are not linked to shoots in the data
                status: best || '—'
            });
        });
        rows.sort((a, b) => a.dateTs - b.dateTs);
        return { rows, productionSeconds: rows.reduce((s, r) => s + (r.productionSeconds || 0), 0) };
    }

    // ─────────────────────────────────────────────────────────────
    // Main builder
    // ─────────────────────────────────────────────────────────────

    function build(ctx, opts) {
        clientCanon = buildClientCanon(ctx || {});
        try {
            return buildReport(ctx || {}, opts || {});
        } finally {
            clientCanon = null;
        }
    }

    function buildReport(ctx, opts) {
        const nowTs = opts.now || Date.now();
        const settings = Object.assign({}, DEFAULT_SETTINGS, opts.settings || {});
        const period = resolvePeriod(opts.period || {}, nowTs);
        const scope = resolveScope(opts.viewer, ctx);
        const f = Object.assign({ employee: 'all', client: 'all', category: 'all', source: 'all' }, opts.filters || {});
        f.employee = f.employee === 'all' ? 'all' : normEmail(f.employee);
        if (f.client !== 'all') f.client = cleanClient(f.client);

        // An employee outside the viewer's scope is never honoured.
        if (f.employee !== 'all' && !inScope(scope, f.employee)) f.employee = 'all';

        const dir = buildDirectory(ctx);
        const taskMap = new Map();
        (ctx.tasks || []).forEach(t => { if (t && (t.id || t.taskId)) taskMap.set(String(t.id || t.taskId).trim().toLowerCase(), t); });

        const norm = normalizeLogs(ctx, taskMap, dir);

        // 1. Permission scope → 2. period → 3. user filters
        // Ghost filtering & check-in clamping already ran in normalizeLogs before overlap trimming.
        const scopedLogs = norm.logs.filter(l => inScope(scope, l.email));
        const periodLogs = scopedLogs.filter(l => {
            if (l.start && l.end && l.end > l.start) {
                return l.start <= period.toTs && l.end >= period.fromTs;
            }
            return l.dateTs >= period.fromTs && l.dateTs <= period.toTs;
        }).map(l => {
            if (l.entryType === 'Session' && l.start && l.end && l.end > l.start) {
                const effectiveStart = Math.max(l.start, period.fromTs);
                const effectiveEnd = Math.min(l.end, period.toTs);
                if (effectiveEnd > effectiveStart) {
                    const clampedSec = Math.floor((effectiveEnd - effectiveStart) / 1000);
                    if (clampedSec !== l.seconds) {
                        return Object.assign({}, l, {
                            start: effectiveStart,
                            end: effectiveEnd,
                            seconds: Math.min(l.seconds, clampedSec),
                            rawSeconds: Math.min(l.rawSeconds, clampedSec),
                            dateTs: effectiveStart,
                            date: localDateStr(effectiveStart)
                        });
                    }
                }
            }
            return l;
        });
        const entries = periodLogs.filter(l =>
            (f.employee === 'all' || l.email === f.employee) &&
            (f.client === 'all' || l.client === f.client) &&
            (f.category === 'all' || l.category === f.category) &&
            (f.source === 'all' || l.source === f.source)
        ).sort((a, b) => (a.dateTs - b.dateTs) || a.employee.localeCompare(b.employee) || (a.start - b.start));

        // Employees in the report: catalogue staff in scope who use time tracking (have ever logged
        // time), plus anyone in scope who logged time this period. Staff who never track time
        // (e.g. owners) would otherwise inflate team capacity.
        const trackers = new Set(norm.logs.map(l => l.email));
        const employeeEmails = new Set();
        dir.forEach((p, e) => { if (p.catalog && trackers.has(e) && inScope(scope, e)) employeeEmails.add(e); });
        periodLogs.forEach(l => employeeEmails.add(l.email));
        if (scope.emails) scope.emails.forEach(e => employeeEmails.add(e));
        let reportEmails = [...employeeEmails];
        if (f.employee !== 'all') reportEmails = reportEmails.filter(e => e === f.employee);
        const nameOf = e => (dir.get(e) && dir.get(e).name) || e;
        reportEmails.sort((a, b) => nameOf(a).localeCompare(nameOf(b)));

        // Options for filter dropdowns (scoped, period-independent where sensible)
        const options = {
            employees: [...employeeEmails].map(e => ({ email: e, name: nameOf(e) })).sort((a, b) => a.name.localeCompare(b.name)),
            clients: [...new Set(periodLogs.map(l => l.client).concat(
                (ctx.tasks || []).map(t => cleanClient(t && t.client)).filter(c => c && c !== INTERNAL_CLIENT)
            ))].sort((a, b) => a === INTERNAL_CLIENT ? 1 : b === INTERNAL_CLIENT ? -1 : a.localeCompare(b)),
            categories: CATEGORIES.slice(),
            sources: ['Jira', 'Internal']
        };

        // ── Capacity & attendance
        const leaves = ctx.requests ? leaveIndex(ctx.requests) : null;
        const capDays = workingDaysBetween(period.fromTs, period.capacityToTs, settings);
        const attendance = buildAttendance(ctx, new Set(reportEmails), period, settings, nowTs);

        const sumBy = (list, pred) => list.reduce((s, l) => s + (pred(l) ? l.seconds : 0), 0);

        const team = reportEmails.map(email => {
            const mine = entries.filter(l => l.email === email);
            const lv = leaves ? (leaves[email] || { leave: new Map(), saturdayOff: new Set() }) : null;
            const myDays = lv ? capDays.filter(d => !lv.saturdayOff.has(d)) : capDays;
            const workingDays = myDays.length;
            // Leave only counts on the employee's own working days (never on an approved Saturday off).
            const leaveDays = lv ? myDays.reduce((s, d) => s + (lv.leave.get(d) || 0), 0) : null;
            const availableSec = Math.max(0, (workingDays - (leaveDays || 0)) * settings.hoursPerDay * HOUR);
            const loggedSec = sumBy(mine, () => true);
            const att = attendance[email];
            return {
                email,
                employee: nameOf(email),
                role: (dir.get(email) && dir.get(email).role) || '',
                workingDays,
                leaveDays,
                availableSec,
                loggedSec,
                clientSec: sumBy(mine, l => l.workType === 'Client'),
                internalSec: sumBy(mine, l => l.workType === 'Internal'),
                bdSec: sumBy(mine, l => l.workType === 'Business Development'),
                utilization: availableSec > 0 ? loggedSec / availableSec : null,
                entries: mine.filter(l => l.entryType === 'Session').length,
                aggregateEntries: mine.filter(l => l.entryType !== 'Session').length,
                attendance: att
            };
        });

        const totalSec = sumBy(entries, () => true);
        const capacitySec = team.reduce((s, r) => s + r.availableSec, 0);

        // ── Client summary
        const clientMap = {};
        entries.forEach(l => {
            const c = clientMap[l.client] = clientMap[l.client] || { client: l.client, seconds: 0, emails: new Set(), cats: {} };
            c.seconds += l.seconds;
            c.emails.add(l.email);
            c.cats[l.category] = (c.cats[l.category] || 0) + l.seconds;
        });
        const clients = Object.values(clientMap).map(c => {
            const top = Object.entries(c.cats).sort((a, b) => b[1] - a[1])[0];
            return {
                client: c.client,
                seconds: c.seconds,
                share: totalSec > 0 ? c.seconds / totalSec : null,
                employeeCount: c.emails.size,
                topCategory: top ? top[0] : '—'
            };
        }).sort((a, b) => b.seconds - a.seconds);

        // ── Member × Client matrix
        const matrixClients = clients.map(c => c.client);
        const matrix = team.map(r => {
            const cells = {};
            matrixClients.forEach(c => { cells[c] = 0; });
            entries.filter(l => l.email === r.email).forEach(l => { cells[l.client] += l.seconds; });
            return { employee: r.employee, email: r.email, cells, total: r.loggedSec };
        });

        // ── Task breakdown (category × employee × client)
        const tb = {};
        entries.forEach(l => {
            const k = `${l.category}\u0001${l.email}\u0001${l.client}`;
            const row = tb[k] = tb[k] || { category: l.category, employee: l.employee, email: l.email, client: l.client, seconds: 0 };
            row.seconds += l.seconds;
        });
        const taskBreakdown = Object.values(tb).map(r => Object.assign(r, { share: totalSec > 0 ? r.seconds / totalSec : null }))
            .sort((a, b) => a.category.localeCompare(b.category) || b.seconds - a.seconds);
        const categoryTotals = {};
        entries.forEach(l => { categoryTotals[l.category] = (categoryTotals[l.category] || 0) + l.seconds; });

        // ── Task performance
        const performance = reportEmails.map(email => Object.assign({ employee: nameOf(email), email }, auditTasks(ctx, email, period, f, nowTs)));
        const perfTotals = performance.reduce((t, r) => {
            ['assigned', 'completed', 'pending', 'inProgress', 'overdue', 'rework'].forEach(k => { t[k] += r[k]; });
            return t;
        }, { assigned: 0, completed: 0, pending: 0, inProgress: 0, overdue: 0, rework: 0 });

        // ── QC & shoots
        const qc = buildQc(ctx, scope, f, period, taskMap, dir);
        const shoots = buildShoots(ctx, scope, f, period, periodLogs.filter(l => f.employee === 'all' || l.email === f.employee), dir);

        // ── Attendance rows
        const attendanceRows = team.map(r => ({
            employee: r.employee,
            email: r.email,
            workingDays: r.workingDays,
            presentDays: r.attendance ? r.attendance.present : 0,
            leaveDays: r.leaveDays,
            lateArrivals: r.attendance ? r.attendance.late : 0,
            breakSec: r.attendance ? r.attendance.breakSec : 0,
            workSec: r.attendance ? r.attendance.workSec : 0,
            missingCheckout: r.attendance ? r.attendance.missingCheckout : 0
        }));
        const attendanceHasData = attendanceRows.some(r => r.presentDays > 0);

        const sessions = entries.filter(l => l.entryType === 'Session').length;

        const kpis = {
            totalSec,
            clientSec: sumBy(entries, l => l.workType === 'Client'),
            internalSec: sumBy(entries, l => l.workType === 'Internal'),
            bdSec: sumBy(entries, l => l.workType === 'Business Development'),
            capacitySec,
            utilization: capacitySec > 0 ? totalSec / capacitySec : null,
            employeeCount: team.length,
            activeClients: clients.filter(c => c.client !== INTERNAL_CLIENT && c.seconds > 0).length,
            timeEntries: sessions,
            aggregateEntries: entries.length - sessions,
            assigned: perfTotals.assigned,
            completed: perfTotals.completed,
            pending: perfTotals.pending,
            qcPassed: qc.reviews ? qc.passed : null,
            qcFailed: qc.reviews ? qc.failed : null,
            qcPassRate: qc.passRate,
            reworkCount: qc.reviews ? qc.failed : null
        };

        const notes = [];
        if (norm.breaksExcluded) notes.push(`${norm.breaksExcluded} break entr${norm.breaksExcluded === 1 ? 'y' : 'ies'} excluded from work hours.`);
        if (norm.overlapSecondsRemoved) notes.push(`${round2(hours(norm.overlapSecondsRemoved))}h of overlapping sessions not double-counted.`);
        if (kpis.aggregateEntries) notes.push(`${kpis.aggregateEntries} historical monthly aggregate entr${kpis.aggregateEntries === 1 ? 'y is' : 'ies are'} included in hours but not counted as work sessions.`);
        if (!leaves) notes.push('Leave requests could not be loaded – leave days shown as N/A and capacity is not leave-adjusted.');
        if (period.inProgress) notes.push(`Period in progress – capacity counted up to ${period.capacityToStr}.`);
        if (norm.undated) notes.push(`${norm.undated} time entr${norm.undated === 1 ? 'y' : 'ies'} without any date were skipped.`);
        notes.push('Task category is derived from the task title.');

        return {
            generatedAt: nowTs,
            period,
            settings,
            scope: { level: scope.level, all: scope.emails === null },
            filters: f,
            options,
            kpis,
            team,
            clients,
            matrix: { clients: matrixClients, rows: matrix },
            taskBreakdown,
            categoryTotals,
            entries,
            performance,
            performanceTotals: perfTotals,
            qc,
            shoots,
            attendance: { rows: attendanceRows, hasData: attendanceHasData },
            notes
        };
    }

    window.OneReportEngine = {
        build,
        resolvePeriod,
        resolveScope,
        deriveCategory,
        cleanClient,
        CATEGORIES,
        INTERNAL_CLIENT,
        AGGREGATE_LABEL,
        DEFAULT_SETTINGS,
        _internal: { normalizeLogs, mergedIntervalSeconds, workingDaysBetween, leaveIndex, isJiraKey }
    };
})(typeof window !== 'undefined' ? window : globalThis);
