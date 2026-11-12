/**
 * App Usage – which apps / websites each employee used while checked in, and for how long.
 *
 * Data is written by the Windows desktop agent (desktop-agent/agent.ps1):
 *   worksync/app_usage/<yyyy-MM-dd>/<userKey>/<machine>/<appKey> = { n: name, c: category, s: seconds }
 *   worksync/app_usage_agents/<userKey> = { email, machine, version, lastSeen, state, currentApp }
 *
 * Visibility follows One Report: admins / managers see everyone, team leads see
 * their reports, employees see only themselves (OneReportEngine.resolveScope).
 */
(function (window) {
    'use strict';

    const document = window.document;
    const PANEL_ID = 'view-app-usage-panel';
    const DOWNLOAD_URL = 'downloads/OneDeskTracker.zip';
    const LIVE_MS = 3 * 60 * 1000;
    const MAX_DAYS = 62;
    const CAT_COLORS = {
        'Design': '#8B5CF6', 'Video': '#EC4899', 'Work': '#4F46E5', 'Office': '#0EA5E9',
        'Communication': '#10B981', 'AI Tools': '#14B8A6', 'Social Media': '#F59E0B',
        'Development': '#6366F1', 'Browser': '#64748B', 'Entertainment': '#EF4444',
        'System': '#94A3B8', 'Other': '#A1A1AA', 'Idle': '#CBD5E1'
    };
    const PERIODS = [['today', 'Today'], ['yesterday', 'Yesterday'], ['last7', 'Last 7 days'], ['month', 'This month'], ['custom', 'Custom']];

    const state = {
        period: 'today', from: '', to: '',
        employee: 'all',
        days: {},          // date -> snapshot value
        subs: {},          // date -> unsubscribe
        agents: {},
        agentsUnsub: null,
        tick: null,
        rendered: false
    };

    // ───────────────────────────── helpers
    const $ = id => document.getElementById(id);
    const esc = v => String(v === null || v === undefined ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const norm = e => String(e || '').trim().toLowerCase();
    const keyOf = e => norm(e).replace(/[@.]/g, '_');
    const pad = n => String(n).padStart(2, '0');
    const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const parseYmd = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
    const catColor = c => CAT_COLORS[c] || CAT_COLORS.Other;

    function fmtDur(sec) {
        sec = Math.round(sec || 0);
        const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
        if (h === 0 && m === 0) return sec > 0 ? '<1m' : '0m';
        return h ? `${h}h ${pad(m)}m` : `${m}m`;
    }
    const fmtPct = (part, total) => total > 0 ? `${((part / total) * 100).toFixed(1)}%` : '0%';
    function ago(ms) {
        const s = Math.max(0, (Date.now() - ms) / 1000);
        if (s < 90) return 'just now';
        if (s < 3600) return `${Math.round(s / 60)} min ago`;
        if (s < 86400) return `${Math.round(s / 3600)} h ago`;
        return `${Math.round(s / 86400)} days ago`;
    }

    function dateRange() {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        let from = new Date(today), to = new Date(today);
        if (state.period === 'yesterday') { from.setDate(from.getDate() - 1); to = new Date(from); }
        else if (state.period === 'last7') { from.setDate(from.getDate() - 6); }
        else if (state.period === 'month') { from = new Date(today.getFullYear(), today.getMonth(), 1); }
        else if (state.period === 'custom' && state.from && state.to) {
            from = parseYmd(state.from); to = parseYmd(state.to);
            if (from > to) [from, to] = [to, from];
        }
        const dates = [];
        for (let d = new Date(from); d <= to && dates.length < MAX_DAYS; d.setDate(d.getDate() + 1)) dates.push(ymd(d));
        return dates;
    }

    // ───────────────────────────── people & scope
    function directory() {
        const byKey = new Map();
        (window.USERS || []).forEach(u => { if (u && u.email && u.email.includes('@')) byKey.set(keyOf(u.email), { email: norm(u.email), name: u.name || u.email }); });
        Object.entries(state.agents).forEach(([k, a]) => {
            if (!byKey.has(k) && a && a.email) byKey.set(k, { email: norm(a.email), name: String(a.email).split('@')[0] });
        });
        return byKey;
    }

    function viewerScope() {
        const u = window.currentUser || {};
        const E = window.OneReportEngine;
        if (E && typeof E.resolveScope === 'function') {
            return E.resolveScope({ email: u.email, role: u.role }, {
                adminEmails: window.ADMIN_EMAILS || [], managerEmails: window.MANAGER_EMAILS || [],
                approvalChains: window.LEAVE_APPROVAL_CHAINS || {}
            });
        }
        const all = (typeof window.isAdmin === 'function' && window.isAdmin()) || (typeof window.isManager === 'function' && window.isManager());
        return all ? { level: 'admin', emails: null } : { level: 'employee', emails: new Set([norm(u.email)]) };
    }

    function visibleKeys(scope, dir) {
        const keys = new Set();
        if (scope.emails === null) {
            dir.forEach((_, k) => keys.add(k));
            Object.values(state.days).forEach(day => Object.keys(day || {}).forEach(k => keys.add(k)));
        } else {
            scope.emails.forEach(e => keys.add(keyOf(e)));
        }
        return keys;
    }

    // ───────────────────────────── data
    function subscribe(dates) {
        const rtdb = window.rtdb;
        if (!rtdb || !window.db) return;
        const want = new Set(dates);
        Object.keys(state.subs).forEach(d => {
            if (!want.has(d)) { try { state.subs[d](); } catch (e) { } delete state.subs[d]; delete state.days[d]; }
        });
        dates.forEach(d => {
            if (state.subs[d]) return;
            state.subs[d] = rtdb.onValue(rtdb.ref(window.db, `worksync/app_usage/${d}`), snap => {
                state.days[d] = snap.val() || {};
                scheduleRender();
            }, err => console.warn('[AppUsage] read failed', d, err && err.message));
        });
        if (!state.agentsUnsub) {
            state.agentsUnsub = rtdb.onValue(rtdb.ref(window.db, 'worksync/app_usage_agents'), snap => {
                state.agents = snap.val() || {};
                scheduleRender();
            }, err => console.warn('[AppUsage] agents read failed', err && err.message));
        }
    }

    /** Sum all machines and days into { apps: Map(name -> {sec, cat}), total, idle, byDay } per user key. */
    function aggregate(keys, dates) {
        const out = new Map();
        keys.forEach(k => out.set(k, { apps: new Map(), total: 0, idle: 0, byDay: {} }));
        dates.forEach(d => {
            const day = state.days[d] || {};
            keys.forEach(k => {
                const machines = day[k];
                if (!machines) return;
                const rec = out.get(k);
                Object.values(machines).forEach(apps => {
                    Object.values(apps || {}).forEach(a => {
                        if (!a || !(a.s > 0)) return;
                        const name = String(a.n || 'Unknown'), cat = String(a.c || 'Other'), sec = Number(a.s) || 0;
                        const cur = rec.apps.get(name) || { sec: 0, cat };
                        cur.sec += sec; rec.apps.set(name, cur);
                        rec.total += sec;
                        if (cat === 'Idle') rec.idle += sec;
                        rec.byDay[d] = (rec.byDay[d] || 0) + sec;
                    });
                });
            });
        });
        return out;
    }

    function sortedApps(apps) {
        return [...apps.entries()].map(([name, v]) => ({ name, sec: v.sec, cat: v.cat })).sort((a, b) => b.sec - a.sec);
    }

    function agentStatus(key) {
        const a = state.agents[key];
        if (!a || !a.lastSeen) return { kind: 'none', label: 'Not installed' };
        const live = Date.now() - a.lastSeen < LIVE_MS;
        if (!live) return { kind: 'offline', label: `Offline · seen ${ago(a.lastSeen)}`, machine: a.machine };
        if (a.state === 'running' && a.currentApp) return { kind: 'live', label: `Live · ${a.currentApp}`, machine: a.machine };
        if (a.state === 'paused') return { kind: 'paused', label: 'Live · on break', machine: a.machine };
        return { kind: 'paused', label: 'Live · not checked in', machine: a.machine };
    }

    // ───────────────────────────── render
    let renderQueued = false;
    function scheduleRender() {
        if (renderQueued) return;
        renderQueued = true;
        requestAnimationFrame(() => { renderQueued = false; render(); });
    }

    function shell() {
        const panel = $(PANEL_ID);
        if (!panel || state.rendered) return;
        state.rendered = true;
        panel.innerHTML = `
<style>
#${PANEL_ID}{--au-card:#fff;--au-border:#e2e8f0;--au-muted:#64748b;--au-text:#0f172a;--au-soft:#f1f5f9;--au-accent:#4f46e5}
html.dark #${PANEL_ID}{--au-card:#1a2236;--au-border:#1e2a3a;--au-muted:#94a3b8;--au-text:#f1f5f9;--au-soft:#131929}
#${PANEL_ID} .au-card{background:var(--au-card);border:1px solid var(--au-border);border-radius:24px;padding:20px;color:var(--au-text)}
#${PANEL_ID} .au-row{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between}
#${PANEL_ID} .au-h{font-size:20px;font-weight:700;margin:0}
#${PANEL_ID} .au-sub{font-size:13px;color:var(--au-muted);margin-top:2px}
#${PANEL_ID} .au-seg{display:inline-flex;flex-wrap:wrap;gap:4px;background:var(--au-soft);padding:4px;border-radius:12px}
#${PANEL_ID} .au-seg button{border:0;background:transparent;color:var(--au-muted);font-size:12px;font-weight:600;padding:6px 10px;border-radius:9px;cursor:pointer}
#${PANEL_ID} .au-seg button.on{background:var(--au-card);color:var(--au-accent);box-shadow:0 1px 2px rgba(0,0,0,.08)}
#${PANEL_ID} select,#${PANEL_ID} input[type=date]{background:var(--au-card);color:var(--au-text);border:1px solid var(--au-border);border-radius:10px;padding:6px 10px;font-size:13px}
#${PANEL_ID} .au-btn{border:1px solid var(--au-border);background:var(--au-card);color:var(--au-text);font-size:12px;font-weight:600;padding:7px 12px;border-radius:10px;cursor:pointer;text-decoration:none;display:inline-flex;gap:6px;align-items:center}
#${PANEL_ID} .au-btn.primary{background:var(--au-accent);border-color:var(--au-accent);color:#fff}
#${PANEL_ID} .au-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}
#${PANEL_ID} .au-kpi .l{font-size:12px;color:var(--au-muted);font-weight:600;text-transform:uppercase;letter-spacing:.04em}
#${PANEL_ID} .au-kpi .v{font-size:24px;font-weight:700;margin-top:4px}
#${PANEL_ID} .au-kpi .s{font-size:12px;color:var(--au-muted);margin-top:2px}
#${PANEL_ID} .au-grid{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:16px}
@media (max-width:1024px){#${PANEL_ID} .au-grid{grid-template-columns:1fr}}
#${PANEL_ID} .au-title{font-size:15px;font-weight:700;margin:0 0 12px}
#${PANEL_ID} .au-app{display:grid;grid-template-columns:minmax(120px,1.2fr) 2fr 72px 56px;gap:12px;align-items:center;padding:8px 0;border-top:1px solid var(--au-border);font-size:13px}
#${PANEL_ID} .au-app:first-of-type{border-top:0}
#${PANEL_ID} .au-name{display:flex;gap:8px;align-items:center;min-width:0}
#${PANEL_ID} .au-name b{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#${PANEL_ID} .au-name small{color:var(--au-muted);font-size:11px;white-space:nowrap}
#${PANEL_ID} .au-dot{width:10px;height:10px;border-radius:3px;flex:none}
#${PANEL_ID} .au-bar{height:8px;background:var(--au-soft);border-radius:99px;overflow:hidden}
#${PANEL_ID} .au-bar i{display:block;height:100%;border-radius:99px}
#${PANEL_ID} .au-num{text-align:right;font-variant-numeric:tabular-nums;font-weight:600}
#${PANEL_ID} .au-pct{text-align:right;font-variant-numeric:tabular-nums;color:var(--au-muted)}
#${PANEL_ID} .au-stack{display:flex;height:14px;border-radius:99px;overflow:hidden;background:var(--au-soft);margin-bottom:12px}
#${PANEL_ID} .au-legend{display:flex;flex-direction:column;gap:8px;font-size:13px}
#${PANEL_ID} .au-legend div{display:flex;align-items:center;gap:8px}
#${PANEL_ID} .au-legend span.r{margin-left:auto;font-variant-numeric:tabular-nums;color:var(--au-muted)}
#${PANEL_ID} table{width:100%;border-collapse:collapse;font-size:13px}
#${PANEL_ID} th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--au-muted);padding:8px;border-bottom:1px solid var(--au-border)}
#${PANEL_ID} td{padding:10px 8px;border-bottom:1px solid var(--au-border);vertical-align:middle}
#${PANEL_ID} tr.click{cursor:pointer}
#${PANEL_ID} tr.click:hover td{background:var(--au-soft)}
#${PANEL_ID} .au-chip{display:inline-flex;gap:5px;align-items:center;font-size:11px;padding:3px 8px;border-radius:99px;background:var(--au-soft);margin:2px 4px 2px 0;white-space:nowrap}
#${PANEL_ID} .au-status{display:inline-flex;align-items:center;gap:6px;font-size:12px;white-space:nowrap}
#${PANEL_ID} .au-status:before{content:"";width:8px;height:8px;border-radius:50%;background:#cbd5e1}
#${PANEL_ID} .au-status.live:before{background:#10b981}
#${PANEL_ID} .au-status.paused:before{background:#f59e0b}
#${PANEL_ID} .au-status.offline:before{background:#94a3b8}
#${PANEL_ID} .au-empty{padding:28px 8px;text-align:center;color:var(--au-muted);font-size:13px}
#${PANEL_ID} .au-install ol{margin:8px 0 0 18px;font-size:13px;line-height:1.7;color:var(--au-muted)}
#${PANEL_ID} .au-scroll{overflow-x:auto}
</style>
<div class="au-card">
  <div class="au-row">
    <div>
      <h3 class="au-h">App Usage</h3>
      <div class="au-sub">Apps and websites used while checked in. Idle = no mouse or keyboard for 2+ minutes.</div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="au-btn" id="au-csv" type="button">Export CSV</button>
      <a class="au-btn primary" href="${DOWNLOAD_URL}" download>Download tracker</a>
    </div>
  </div>
  <div class="au-row" style="margin-top:16px;justify-content:flex-start">
    <div class="au-seg" id="au-periods">${PERIODS.map(([k, l]) => `<button type="button" data-p="${k}">${l}</button>`).join('')}</div>
    <span id="au-custom" style="display:none;gap:6px;align-items:center"><input type="date" id="au-from"> to <input type="date" id="au-to"></span>
    <select id="au-employee" aria-label="Employee"></select>
  </div>
</div>
<div id="au-install-slot"></div>
<div id="au-body" style="display:flex;flex-direction:column;gap:16px"></div>`;

        $('au-periods').addEventListener('click', e => {
            const b = e.target.closest('button[data-p]');
            if (!b) return;
            state.period = b.dataset.p;
            if (state.period === 'custom' && !state.from) { const t = ymd(new Date()); state.from = t; state.to = t; $('au-from').value = t; $('au-to').value = t; }
            refresh();
        });
        $('au-from').addEventListener('change', e => { state.from = e.target.value; refresh(); });
        $('au-to').addEventListener('change', e => { state.to = e.target.value; refresh(); });
        $('au-employee').addEventListener('change', e => { state.employee = e.target.value; render(); });
        $('au-csv').addEventListener('click', exportCsv);
        $('au-body').addEventListener('click', e => {
            const tr = e.target.closest('tr[data-k]');
            if (tr) { state.employee = tr.dataset.k; render(); window.scrollTo && $(PANEL_ID).scrollTo({ top: 0, behavior: 'smooth' }); }
        });
    }

    function appRows(list, total) {
        if (!list.length) return '<div class="au-empty">No usage recorded for this period.</div>';
        const max = list[0].sec || 1;
        return list.map(a => `
<div class="au-app">
  <div class="au-name"><span class="au-dot" style="background:${catColor(a.cat)}"></span><b title="${esc(a.name)}">${esc(a.name)}</b><small>${esc(a.cat)}</small></div>
  <div class="au-bar"><i style="width:${Math.max(1, (a.sec / max) * 100).toFixed(1)}%;background:${catColor(a.cat)}"></i></div>
  <div class="au-num">${fmtDur(a.sec)}</div>
  <div class="au-pct">${fmtPct(a.sec, total)}</div>
</div>`).join('');
    }

    function categoryCard(list, total) {
        const cats = new Map();
        list.forEach(a => cats.set(a.cat, (cats.get(a.cat) || 0) + a.sec));
        const rows = [...cats.entries()].sort((a, b) => b[1] - a[1]);
        if (!rows.length) return '';
        return `
<div class="au-card"><h4 class="au-title">By category</h4>
  <div class="au-stack">${rows.map(([c, s]) => `<span title="${esc(c)} ${fmtDur(s)}" style="width:${(s / total) * 100}%;background:${catColor(c)}"></span>`).join('')}</div>
  <div class="au-legend">${rows.map(([c, s]) => `<div><span class="au-dot" style="background:${catColor(c)}"></span>${esc(c)}<span class="r">${fmtDur(s)} · ${fmtPct(s, total)}</span></div>`).join('')}</div>
</div>`;
    }

    function kpis(items) {
        return `<div class="au-kpis">${items.map(([l, v, s]) => `<div class="au-card au-kpi"><div class="l">${esc(l)}</div><div class="v">${esc(v)}</div><div class="s">${esc(s || '')}</div></div>`).join('')}</div>`;
    }

    function render() {
        const panel = $(PANEL_ID);
        if (!panel || !window.currentUser) return;
        shell();

        const dates = dateRange();
        const scope = viewerScope();
        const dir = directory();
        const keys = [...visibleKeys(scope, dir)];
        const nameOf = k => (dir.get(k) && dir.get(k).name) || k;
        const multi = scope.emails === null || keys.length > 1;
        const meKey = keyOf(window.currentUser.email);
        if (!multi) state.employee = meKey;
        if (state.employee !== 'all' && !keys.includes(state.employee)) state.employee = multi ? 'all' : meKey;

        // controls
        [...$('au-periods').children].forEach(b => b.classList.toggle('on', b.dataset.p === state.period));
        $('au-custom').style.display = state.period === 'custom' ? 'inline-flex' : 'none';
        const sel = $('au-employee');
        sel.style.display = multi ? '' : 'none';
        const opts = [['all', 'All employees'], ...keys.map(k => [k, nameOf(k)]).sort((a, b) => a[1].localeCompare(b[1]))];
        const html = opts.map(([v, l]) => `<option value="${esc(v)}"${v === state.employee ? ' selected' : ''}>${esc(l)}</option>`).join('');
        if (sel.innerHTML !== html) sel.innerHTML = html;

        // install prompt for the viewer if their PC has never reported
        const mine = state.agents[meKey];
        $('au-install-slot').innerHTML = (mine && mine.lastSeen) ? '' : `
<div class="au-card au-install">
  <h4 class="au-title" style="margin:0">Set up the tracker on your PC</h4>
  <ol>
    <li><a href="${DOWNLOAD_URL}" download style="color:var(--au-accent);font-weight:600">Download OneDeskTracker.zip</a> and extract it (right-click → Extract All).</li>
    <li>Double-click <b>install.cmd</b>. If Windows shows "Windows protected your PC", click More info → Run anyway.</li>
    <li>Type <b>Y</b>, then sign in with your One Desk email and password.</li>
  </ol>
  <div class="au-sub" style="margin-top:8px">It runs in the background, starts with Windows, and records only while you are checked in. Window titles, keystrokes and screenshots are never recorded.</div>
</div>`;

        const body = $('au-body');
        const loading = dates.some(d => !(d in state.days));
        const agg = aggregate(keys, dates);
        const periodLabel = dates.length === 1 ? parseYmd(dates[0]).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }) : `${dates.length} days`;

        if (state.employee === 'all') {
            const team = { apps: new Map(), total: 0, idle: 0 };
            const rows = keys.map(k => ({ k, rec: agg.get(k), st: agentStatus(k) })).filter(r => r.rec.total > 0 || r.st.kind !== 'none' || dir.has(r.k));
            rows.forEach(({ rec }) => {
                team.total += rec.total; team.idle += rec.idle;
                rec.apps.forEach((v, n) => { const c = team.apps.get(n) || { sec: 0, cat: v.cat }; c.sec += v.sec; team.apps.set(n, c); });
            });
            const teamList = sortedApps(team.apps);
            const active = team.total - team.idle;
            const tracked = rows.filter(r => r.rec.total > 0).length;
            const liveNow = rows.filter(r => r.st.kind === 'live').length;
            rows.sort((a, b) => (b.rec.total - a.rec.total) || nameOf(a.k).localeCompare(nameOf(b.k)));

            body.innerHTML = kpis([
                ['Employees tracked', `${tracked} / ${rows.length}`, `${liveNow} working right now`],
                ['Active time', fmtDur(active), periodLabel],
                ['Idle time', fmtDur(team.idle), fmtPct(team.idle, team.total) + ' of tracked'],
                ['Top app', teamList.find(a => a.cat !== 'Idle')?.name || '—', teamList.find(a => a.cat !== 'Idle') ? fmtDur(teamList.find(a => a.cat !== 'Idle').sec) : '']
            ]) + `
<div class="au-card"><h4 class="au-title">Team</h4><div class="au-scroll"><table>
  <thead><tr><th>Employee</th><th>Tracker</th><th style="text-align:right">Active</th><th style="text-align:right">Idle</th><th>Top apps</th></tr></thead>
  <tbody>${rows.length ? rows.map(({ k, rec, st }) => {
                const top = sortedApps(rec.apps).filter(a => a.cat !== 'Idle').slice(0, 4);
                return `<tr class="click" data-k="${esc(k)}">
      <td style="font-weight:600">${esc(nameOf(k))}</td>
      <td><span class="au-status ${st.kind}" title="${esc(st.machine || '')}">${esc(st.label)}</span></td>
      <td class="au-num">${fmtDur(rec.total - rec.idle)}</td>
      <td class="au-pct">${fmtDur(rec.idle)}</td>
      <td>${top.length ? top.map(a => `<span class="au-chip"><span class="au-dot" style="background:${catColor(a.cat)}"></span>${esc(a.name)} ${fmtDur(a.sec)}</span>`).join('') : '<span class="au-sub">—</span>'}</td>
    </tr>`;
            }).join('') : `<tr><td colspan="5" class="au-empty">${loading ? 'Loading…' : 'No employees to show.'}</td></tr>`}</tbody>
</table></div></div>
<div class="au-grid">
  <div class="au-card"><h4 class="au-title">Team apps &amp; websites</h4>${loading && !teamList.length ? '<div class="au-empty">Loading…</div>' : appRows(teamList, team.total)}</div>
  ${categoryCard(teamList, team.total)}
</div>`;
            return;
        }

        const rec = agg.get(state.employee) || { apps: new Map(), total: 0, idle: 0, byDay: {} };
        const list = sortedApps(rec.apps);
        const st = agentStatus(state.employee);
        const top = list.find(a => a.cat !== 'Idle');
        const activeDays = Object.keys(rec.byDay).length;

        body.innerHTML = `
<div class="au-card au-row">
  <div><div style="font-weight:700;font-size:16px">${esc(nameOf(state.employee))}</div><div class="au-sub">${esc(periodLabel)}</div></div>
  <span class="au-status ${st.kind}">${esc(st.label)}${st.machine ? ` <span class="au-sub" style="margin:0">(${esc(st.machine)})</span>` : ''}</span>
</div>` + kpis([
            ['Tracked time', fmtDur(rec.total), dates.length > 1 ? `${activeDays} day${activeDays === 1 ? '' : 's'} with data` : 'while checked in'],
            ['Active time', fmtDur(rec.total - rec.idle), fmtPct(rec.total - rec.idle, rec.total)],
            ['Idle time', fmtDur(rec.idle), fmtPct(rec.idle, rec.total)],
            ['Top app', top ? top.name : '—', top ? `${fmtDur(top.sec)} · ${fmtPct(top.sec, rec.total)}` : '']
        ]) + `
<div class="au-grid">
  <div class="au-card"><h4 class="au-title">Apps &amp; websites</h4>${loading && !list.length ? '<div class="au-empty">Loading…</div>' : appRows(list, rec.total)}</div>
  ${categoryCard(list, rec.total)}
</div>`;
    }

    function exportCsv() {
        const dates = dateRange();
        const scope = viewerScope();
        const dir = directory();
        let keys = [...visibleKeys(scope, dir)];
        if (state.employee !== 'all') keys = keys.filter(k => k === state.employee);
        const lines = [['Date', 'Employee', 'Email', 'App / Website', 'Category', 'Hours', 'Minutes'].join(',')];
        const q = v => `"${String(v).replace(/"/g, '""')}"`;
        dates.forEach(d => keys.forEach(k => {
            const one = aggregate([k], [d]).get(k);
            sortedApps(one.apps).forEach(a => {
                const p = dir.get(k) || {};
                lines.push([d, q(p.name || k), q(p.email || ''), q(a.name), q(a.cat), (a.sec / 3600).toFixed(2), Math.round(a.sec / 60)].join(','));
            });
        }));
        const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `app-usage_${dates[0]}_to_${dates[dates.length - 1]}.csv`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }

    function hasAccess() {
        return norm((window.currentUser || {}).email) === 'digitalmarketing@vilpower.com';
    }

    function refresh() {
        if (!hasAccess()) return;
        subscribe(dateRange());
        render();
    }

    function init() {
        if (!hasAccess()) {
            const p = $(PANEL_ID);
            if (p) p.innerHTML = '<div class="au-card au-empty">Access restricted to digitalmarketing@vilpower.com.</div>';
            return;
        }
        shell();
        refresh();
        // Re-render every 30 s so "Live" / "last seen" stay current while the view is open.
        if (!state.tick) {
            state.tick = setInterval(() => {
                if (!hasAccess()) return;
                const p = $(PANEL_ID);
                if (p && !p.classList.contains('hidden') && p.offsetParent !== null) render();
            }, 30000);
        }
    }

    window.AppUsage = { init, refresh, _internal: { aggregate, fmtDur, dateRange, state } };
})(window);
