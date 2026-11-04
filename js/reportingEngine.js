/**
 * OneDesk Reporting Engine & Single Source of Truth for Team Reports
 * Agency Operations & Employee Performance Intelligence Platform
 * Standardized KPI Calculations, Task Lifecycle, Time Tracking & Audit Trail
 */

(function (window) {
    'use strict';

    const OneDeskReportingEngine = {
        version: '2.0.0',

        // ─────────────────────────────────────────────────────────────
        // 1. DATE & TIME UTILITIES (Local Timezone Safe)
        // ─────────────────────────────────────────────────────────────

        parseLocalDate: function (dateVal) {
            if (!dateVal) return new Date();
            if (dateVal instanceof Date) return new Date(dateVal.getTime());
            if (typeof dateVal === 'number') return new Date(dateVal);
            if (typeof dateVal === 'string') {
                const s = dateVal.trim();
                const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
                if (m) {
                    return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10), 0, 0, 0, 0);
                }
                const parsed = new Date(s);
                if (!isNaN(parsed.getTime())) return parsed;
            }
            return new Date();
        },

        formatLocalDate: function (dateObj) {
            if (!dateObj) return '';
            const d = (dateObj instanceof Date) ? dateObj : new Date(dateObj);
            if (isNaN(d.getTime())) return '';
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        },

        formatDuration: function (seconds) {
            const sec = Math.max(0, Math.floor(seconds || 0));
            const hours = Math.floor(sec / 3600);
            const minutes = Math.floor((sec % 3600) / 60);
            if (hours === 0 && minutes === 0 && sec > 0) return `${sec}s`;
            if (hours === 0) return `${minutes}m`;
            return `${hours}h ${minutes}m`;
        },

        formatDurationHMS: function (seconds) {
            const sec = Math.max(0, Math.floor(seconds || 0));
            const h = Math.floor(sec / 3600);
            const m = Math.floor((sec % 3600) / 60);
            const s = sec % 60;
            return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
        },

        parseTimestamp: function (val) {
            if (!val) return 0;
            if (typeof val === 'number') return val;
            if (val && typeof val === 'object') {
                if (val.seconds || val._seconds) return (val.seconds || val._seconds) * 1000;
                if (val instanceof Date) return val.getTime();
            }
            if (typeof val === 'string') {
                const s = val.trim();
                if (/^\d+$/.test(s)) return parseInt(s, 10);
                const ym = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
                if (ym) {
                    return new Date(parseInt(ym[1], 10), parseInt(ym[2], 10) - 1, parseInt(ym[3], 10), 0, 0, 0, 0).getTime();
                }
                const parsed = Date.parse(s);
                if (!isNaN(parsed)) return parsed;
            }
            return 0;
        },

        getDateRange: function (preset, customFrom, customTo) {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            let fromDate, toDate;

            switch (preset) {
                case 'today':
                    fromDate = new Date(today);
                    toDate = new Date(today);
                    break;
                case 'yesterday':
                    fromDate = new Date(today);
                    fromDate.setDate(today.getDate() - 1);
                    toDate = new Date(fromDate);
                    break;
                case 'this_week': {
                    const day = today.getDay();
                    const diff = day === 0 ? -6 : 1 - day; // Monday start
                    fromDate = new Date(today);
                    fromDate.setDate(today.getDate() + diff);
                    toDate = new Date(fromDate);
                    toDate.setDate(fromDate.getDate() + 6);
                    break;
                }
                case 'last_week': {
                    const day = today.getDay();
                    const diff = day === 0 ? -6 : 1 - day;
                    const thisMon = new Date(today);
                    thisMon.setDate(today.getDate() + diff);
                    fromDate = new Date(thisMon);
                    fromDate.setDate(thisMon.getDate() - 7);
                    toDate = new Date(fromDate);
                    toDate.setDate(fromDate.getDate() + 6);
                    break;
                }
                case 'this_month':
                    fromDate = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
                    toDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 0, 0, 0, 0);
                    break;
                case 'last_month':
                    fromDate = new Date(today.getFullYear(), today.getMonth() - 1, 1, 0, 0, 0, 0);
                    toDate = new Date(today.getFullYear(), today.getMonth(), 0, 0, 0, 0, 0);
                    break;
                case 'custom':
                default:
                    if (customFrom && customTo) {
                        fromDate = this.parseLocalDate(customFrom);
                        toDate = this.parseLocalDate(customTo);
                    } else {
                        fromDate = new Date(today);
                        toDate = new Date(today);
                    }
                    break;
            }

            const fromTs = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate(), 0, 0, 0, 0).getTime();
            const toTs = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate(), 23, 59, 59, 999).getTime();

            return {
                preset: preset || 'custom',
                fromDateStr: this.formatLocalDate(fromDate),
                toDateStr: this.formatLocalDate(toDate),
                fromTs,
                toTs,
                durationMs: toTs - fromTs
            };
        },

        getPreviousEquivalentRange: function (fromTs, toTs) {
            const spanMs = (toTs - fromTs) + 1;
            const prevToTs = fromTs - 1;
            const prevFromTs = prevToTs - spanMs + 1;
            return {
                fromTs: prevFromTs,
                toTs: prevToTs,
                fromDateStr: this.formatLocalDate(new Date(prevFromTs)),
                toDateStr: this.formatLocalDate(new Date(prevToTs))
            };
        },

        // ─────────────────────────────────────────────────────────────
        // 2. USER NORMALIZATION & IDENTITY RESOLUTION
        // ─────────────────────────────────────────────────────────────

        normalizeEmail: function (email) {
            if (!email) return '';
            const raw = String(email).trim().toLowerCase();
            const CANONICAL_EMAIL_MAP = {
                'barath@vilpower.com': 'barathvilpower@gmail.com',
                'alex@vilpower.com': 'alexvilpower@gmail.com',
                'karthika@vilpower.com': 'karthikavilpower@gmail.com',
                'immanuel@vilpower.com': 'immanuelvilpower@gmail.com',
                'muthu@vilpower.com': 'muthuvilpower@gmail.com',
                'murugesh@vilpower.com': 'murugeshvilpower@gmail.com',
                'murugeshkumar@vilpower.com': 'murugeshvilpower@gmail.com',
                'ajith@vilpower.com': 'ajithvilpower@gmail.com',
                'sneha@vilpower.com': 'snehavilpower@gmail.com',
                'nanjilvilpower@gmail.com': 'nanjil@vilpower.com',
                'palani@vilpower.com': 'digitalmarketing@vilpower.com',
                'palanivilpower@gmail.com': 'digitalmarketing@vilpower.com',
                'admin@vilpower.com': 'digitalmarketing@vilpower.com'
            };
            return CANONICAL_EMAIL_MAP[raw] || raw;
        },

        matchesUser: function (entity, targetUserEmail) {
            if (!targetUserEmail || targetUserEmail === 'all') return true;
            if (!entity) return false;

            // 1. Use global assigneeMatches for tasks (handles Jira display names, aliases, first names, etc.)
            if (typeof window.assigneeMatches === 'function') {
                try {
                    if (window.assigneeMatches(entity, targetUserEmail)) return true;
                } catch (e) {}
            }

            const target = this.normalizeEmail(targetUserEmail);

            // 2. Direct email, userId, and name fields
            const fields = [
                entity.userId,
                entity.email,
                entity.userEmail,
                entity.assigneeEmail,
                entity.assignee,
                entity.assigneeName,
                entity.userName,
                entity.name,
                entity.authorEmail
            ];

            for (const f of fields) {
                if (!f) continue;
                const fNorm = this.normalizeEmail(f);
                if (fNorm && fNorm === target) return true;
            }

            // 3. User Aliases (Alex, Murugesh, Ajith, Barath, Karthika, Immanuel)
            const ALIAS_GROUPS = [
                ['alexvilpower@gmail.com', 'alex@vilpower.com'],
                ['murugeshvilpower@gmail.com', 'murugesh@vilpower.com', 'murugeshkumar@vilpower.com'],
                ['ajithvilpower@gmail.com', 'ajith@vilpower.com'],
                ['barathvilpower@gmail.com', 'barath@vilpower.com'],
                ['karthikavilpower@gmail.com', 'karthika@vilpower.com'],
                ['immanuelvilpower@gmail.com', 'immanuel@vilpower.com'],
                ['muthuvilpower@gmail.com', 'muthu@vilpower.com'],
                ['snehavilpower@gmail.com', 'sneha@vilpower.com']
            ];

            for (const group of ALIAS_GROUPS) {
                if (group.includes(target)) {
                    for (const f of fields) {
                        if (!f) continue;
                        const fNorm = this.normalizeEmail(f);
                        if (group.includes(fNorm)) return true;
                    }
                }
            }

            // 4. Name match via allUsersMap or USERS catalog
            const userObj = (typeof window.allUsersMap !== 'undefined' && window.allUsersMap?.get(target)) ||
                (typeof window.knownUserByEmail === 'function' && window.knownUserByEmail(target));
            if (userObj && userObj.name) {
                const normTargetName = String(userObj.name).toLowerCase().replace(/[^a-z0-9]/g, '');
                for (const f of fields) {
                    if (!f) continue;
                    const normField = String(f).toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (normField && normField.length >= 3 && normTargetName.length >= 3) {
                        if (normField === normTargetName || normField.startsWith(normTargetName) || normTargetName.startsWith(normField)) {
                            return true;
                        }
                    }
                }
            }

            return false;
        },

        getAllEmployees: function () {
            const usersMap = new Map();

            const addUser = (emailRaw, nameRaw, roleRaw, picRaw) => {
                const email = this.normalizeEmail(emailRaw);
                if (!email) return;
                if (email === 'alex@vilpower.com' || email.includes('thanush')) return;

                const existing = usersMap.get(email);
                const name = nameRaw || (existing ? existing.name : email);
                const role = roleRaw || (existing ? existing.role : 'Team Member');
                const profilePicture = picRaw || (existing ? existing.profilePicture : '');

                // Prefer fuller display names (e.g. "Barath Magesh M" over "Barath Magesh")
                let chosenName = name;
                if (existing && existing.name) {
                    if (name.length > existing.name.length || (!existing.name.includes(' ') && name.includes(' '))) {
                        chosenName = name;
                    } else {
                        chosenName = existing.name;
                    }
                }

                usersMap.set(email, {
                    email,
                    name: chosenName,
                    role: (role && role !== 'Team Member') ? role : (existing ? existing.role : role),
                    profilePicture: profilePicture || (existing ? existing.profilePicture : '')
                });
            };

            // 1. System USERS catalog first (canonical source of truth for names & roles)
            if (typeof window.USERS !== 'undefined' && Array.isArray(window.USERS)) {
                window.USERS.forEach(u => {
                    addUser(u.email, u.name, u.role || u.designation, u.profilePicture || u.avatar);
                });
            }

            // 2. allUsersMap (Firebase users)
            if (typeof window.allUsersMap !== 'undefined' && window.allUsersMap) {
                Array.from(window.allUsersMap.values()).forEach(u => {
                    addUser(u.email, u.name, u.role || u.designation, u.profilePicture);
                });
            }

            // 3. Current user
            if (typeof window.currentUser !== 'undefined' && window.currentUser && window.currentUser.email) {
                addUser(window.currentUser.email, window.currentUser.name, window.currentUser.role, window.currentUser.profilePicture);
            }

            // 4. Unique assignee users from task tracking system
            if (typeof window.getUniqueAssigneeUsers === 'function') {
                try {
                    const assignees = window.getUniqueAssigneeUsers();
                    if (Array.isArray(assignees)) {
                        assignees.forEach(u => {
                            addUser(u.email, u.name, u.role || u.designation, u.profilePicture);
                        });
                    }
                } catch (e) {}
            }

            // 5. Tasks assignees
            if (typeof window.tasks !== 'undefined' && Array.isArray(window.tasks)) {
                window.tasks.forEach(t => {
                    const email = t.assigneeEmail || t.userId;
                    const name = t.assignee;
                    if (email && !email.startsWith('name:')) {
                        addUser(email, name, 'Team Member', '');
                    }
                });
            }

            // 6. Time log users
            if (typeof window.allTimeLogs !== 'undefined' && Array.isArray(window.allTimeLogs)) {
                window.allTimeLogs.forEach(l => {
                    addUser(l.userId || l.email, l.userName, 'Team Member', '');
                });
            }

            return Array.from(usersMap.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        },

        // ─────────────────────────────────────────────────────────────
        // 3. TASK LIFECYCLE & STATUS TAXONOMY
        // ─────────────────────────────────────────────────────────────

        STANDARD_STATUSES: [
            'Assigned',
            'In Progress',
            'On Hold',
            'Design Completed',
            'QC Review',
            'QC Approved',
            'Client Sent',
            'Revision Requested',
            'Revision In Progress',
            'Approved',
            'Rework',
            'Cancelled'
        ],

        normalizeStatus: function (statusRaw) {
            if (!statusRaw) return 'Assigned';
            const s = String(statusRaw).trim().toLowerCase();

            if (s === 'done' || s === 'completed' || s === 'client approved' || s === 'posted') return 'Approved';
            if (s.includes('rework') || s.includes('correction')) return 'Rework';
            if (s.includes('revision in progress')) return 'Revision In Progress';
            if (s.includes('revision')) return 'Revision Requested';
            if (s.includes('client sent')) return 'Client Sent';
            if (s.includes('qc approved')) return 'QC Approved';
            if (s.includes('qc review') || s.includes('quality check') || s === 'qc') return 'QC Review';
            if (s.includes('design completed') || s === 'completed design') return 'Design Completed';
            if (s.includes('hold')) return 'On Hold';
            if (s.includes('progress') || s.includes('working') || s === 'active') return 'In Progress';
            if (s.includes('cancel')) return 'Cancelled';
            return 'Assigned';
        },

        isCompletedStatus: function (status) {
            const norm = this.normalizeStatus(status);
            return norm === 'Approved' || norm === 'Client Sent' || norm === 'QC Approved' || norm === 'Design Completed';
        },

        isFinalApprovedStatus: function (status) {
            const norm = this.normalizeStatus(status);
            return norm === 'Approved';
        },

        isInProgressStatus: function (status) {
            const norm = this.normalizeStatus(status);
            return norm === 'In Progress' || norm === 'Revision In Progress';
        },

        isOnHoldStatus: function (status) {
            const norm = this.normalizeStatus(status);
            return norm === 'On Hold';
        },

        isReworkStatus: function (status) {
            const norm = this.normalizeStatus(status);
            return norm === 'Rework' || norm === 'Revision Requested' || norm === 'Revision In Progress';
        },

        // ─────────────────────────────────────────────────────────────
        // 4. AUDITED LOGS & SESSIONS CONSOLIDATION
        // ─────────────────────────────────────────────────────────────

        getConsolidatedTimeLogs: function (fromTs, toTs, selectedUser = 'all') {
            const rawLogs = (typeof window.allTimeLogs !== 'undefined' && Array.isArray(window.allTimeLogs))
                ? window.allTimeLogs
                : ((typeof window.timeLogs !== 'undefined' && Array.isArray(window.timeLogs)) ? window.timeLogs : []);

            const result = [];
            const seenLogKeys = new Set();

            // 1. Historical closed logs within range
            rawLogs.forEach(log => {
                if (!this.matchesUser(log, selectedUser)) return;

                const start = this.parseTimestamp(log.startTime || log.startedAt || log.timestamp);
                const end = this.parseTimestamp(log.endTime || log.completedAt || log.timestamp) || (start + (log.durationSeconds || 0) * 1000);

                // Check overlap with the [fromTs, toTs] period
                const logTime = end || start;
                if (logTime < fromTs || logTime > toTs) return;

                const durationSec = Math.max(0, log.durationSeconds || Math.floor((end - start) / 1000) || 0);
                const key = `${log.taskId || log.taskDesc}_${start}_${log.userId || log.email}`;

                if (!seenLogKeys.has(key)) {
                    seenLogKeys.add(key);
                    result.push({
                        id: log.id || key,
                        taskId: log.taskId || '',
                        taskName: log.taskName || log.taskDesc || log.title || 'General Task',
                        client: log.client || log.clientName || 'General',
                        userId: this.normalizeEmail(log.userId || log.email),
                        userName: log.userName || log.name || log.userId || 'Team Member',
                        startTime: start,
                        endTime: end,
                        durationSeconds: durationSec,
                        isLive: false,
                        anomaly: null
                    });
                }
            });

            // 2. Append currently running live sessions from currentWorkUsers / active user timer
            if (typeof window.currentWorkUsers !== 'undefined' && Array.isArray(window.currentWorkUsers)) {
                const now = Date.now();
                window.currentWorkUsers.forEach(u => {
                    const uEmail = this.normalizeEmail(u.email);
                    if (!uEmail || !this.matchesUser(u, selectedUser)) return;

                    let curTask = u.currentTask;

                    // If viewing the current logged-in user, check activeTaskId and local timer
                    if (window.currentUser && uEmail === this.normalizeEmail(window.currentUser.email) && window.activeTaskId) {
                        const curTaskObj = (window.tasks || []).find(t => t.id === window.activeTaskId);
                        curTask = {
                            taskId: window.activeTaskId,
                            taskDesc: curTaskObj?.desc || curTaskObj?.title || '',
                            client: curTaskObj?.client || '',
                            state: window.taskOnHold ? 'on_hold' : 'working',
                            startedAt: window.taskStartTime || now,
                            currentSeconds: window.taskSeconds || 0
                        };
                    }

                    if (curTask && curTask.taskId && curTask.state === 'working') {
                        const start = curTask.startedAt || now;
                        // Only add if active within range
                        if (start <= toTs && now >= fromTs) {
                            const curSec = Math.max(0, curTask.currentSeconds || Math.floor((now - start) / 1000));
                            const key = `LIVE_${curTask.taskId}_${start}_${uEmail}`;
                            if (!seenLogKeys.has(key)) {
                                seenLogKeys.add(key);
                                result.push({
                                    id: key,
                                    taskId: curTask.taskId,
                                    taskName: curTask.taskDesc || 'Active Task',
                                    client: curTask.client || 'General',
                                    userId: uEmail,
                                    userName: u.name || uEmail,
                                    startTime: start,
                                    endTime: now,
                                    durationSeconds: curSec,
                                    isLive: true,
                                    anomaly: null
                                });
                            }
                        }
                    }
                });
            }

            // 3. Anomaly Detection: Detect overlapping sessions and abnormal durations (>12h)
            result.sort((a, b) => a.startTime - b.startTime);
            for (let i = 0; i < result.length; i++) {
                const item = result[i];
                if (item.durationSeconds > 43200) { // >12 hours
                    item.anomaly = 'Abnormal Duration (>12h)';
                }
                for (let j = i + 1; j < result.length; j++) {
                    const next = result[j];
                    if (next.userId === item.userId && next.startTime < item.endTime) {
                        // Check if overlap is significant (> 1 minute)
                        if ((item.endTime - next.startTime) > 60000) {
                            next.anomaly = 'Overlapping Session';
                        }
                    } else if (next.startTime >= item.endTime) {
                        break;
                    }
                }
            }

            return result;
        },

        getAuditedAttendance: function (fromTs, toTs, selectedUser = 'all') {
            const rawEvents = (typeof window.attendanceEvents !== 'undefined' && Array.isArray(window.attendanceEvents))
                ? window.attendanceEvents
                : [];

            const filtered = rawEvents.filter(e => {
                const ts = e.timestamp || 0;
                if (ts < fromTs || ts > toTs) return false;
                return this.matchesUser(e, selectedUser);
            });

            // Group attendance events by user & date (YYYY-MM-DD local)
            const daysMap = {};
            let totalBreakSeconds = 0;
            let missingCheckouts = 0;

            filtered.forEach(evt => {
                const dateKey = evt.date || this.formatLocalDate(new Date(evt.timestamp));
                const userKey = this.normalizeEmail(evt.userId || evt.email);
                const comboKey = `${userKey}__${dateKey}`;

                if (!daysMap[comboKey]) {
                    daysMap[comboKey] = {
                        userKey,
                        userName: evt.userName || userKey,
                        date: dateKey,
                        checkIns: [],
                        checkOuts: [],
                        breaks: [],
                        activeSeconds: 0,
                        breakSeconds: 0
                    };
                }

                if (evt.type === 'check_in') {
                    daysMap[comboKey].checkIns.push(evt.timestamp);
                } else if (evt.type === 'check_out') {
                    daysMap[comboKey].checkOuts.push(evt.timestamp);
                } else if (evt.type === 'break_end' && evt.duration) {
                    const bSec = Math.floor(evt.duration / 1000);
                    daysMap[comboKey].breakSeconds += bSec;
                    totalBreakSeconds += bSec;
                    daysMap[comboKey].breaks.push({
                        start: evt.timestamp - evt.duration,
                        end: evt.timestamp,
                        durationSeconds: bSec
                    });
                }
            });

            let totalActiveSeconds = 0;
            Object.values(daysMap).forEach(day => {
                day.checkIns.sort((a, b) => a - b);
                day.checkOuts.sort((a, b) => a - b);

                const firstCheckIn = day.checkIns[0];
                const lastCheckOut = day.checkOuts[day.checkOuts.length - 1];

                if (firstCheckIn && lastCheckOut && lastCheckOut > firstCheckIn) {
                    day.activeSeconds = Math.max(0, Math.floor((lastCheckOut - firstCheckIn) / 1000));
                } else if (firstCheckIn && !lastCheckOut) {
                    // Ongoing session or missing checkout
                    const todayStr = this.formatLocalDate(new Date());
                    if (day.date === todayStr) {
                        day.activeSeconds = Math.max(0, Math.floor((Date.now() - firstCheckIn) / 1000));
                    } else {
                        // Flag missing checkout for past days, assume standard 8h (28800s) max
                        missingCheckouts++;
                        day.activeSeconds = 28800;
                        day.hasMissingCheckout = true;
                    }
                }
                totalActiveSeconds += day.activeSeconds;
            });

            return {
                events: filtered,
                daysMap,
                totalBreakSeconds,
                totalActiveSeconds,
                missingCheckouts
            };
        },

        // ─────────────────────────────────────────────────────────────
        // 5. TASK AUDITING & LIFECYCLE EVALUATION
        // ─────────────────────────────────────────────────────────────

        getAuditedTasks: function (fromTs, toTs, selectedUser = 'all') {
            const allTasks = (typeof window.tasks !== 'undefined' && Array.isArray(window.tasks))
                ? window.tasks
                : [];

            const assignedInRange = [];
            const completedInRange = [];
            const pendingInRange = [];
            const reworkInRange = [];
            const overdueTasks = [];
            const onHoldTasks = [];

            const now = Date.now();
            const fromDateStr = this.formatLocalDate(new Date(fromTs));
            const toDateStr = this.formatLocalDate(new Date(toTs));

            allTasks.forEach(t => {
                if (!this.matchesUser(t, selectedUser)) return;

                const status = this.normalizeStatus(t.status);
                const compTs = this.parseTimestamp(t.completedAt || t.lastCompletedDate);
                const updatedTs = this.parseTimestamp(t.updatedAt || t.updated);
                const createdTs = this.parseTimestamp(t.createdAt || t.created);
                const dueTs = this.parseTimestamp(t.dueDate || t.duedate || t.date);
                const dueStr = t.dueDate || t.duedate || '';

                // Is task relevant to period?
                // Created, updated, completed, or due in range
                const inRange = (createdTs >= fromTs && createdTs <= toTs) ||
                    (updatedTs >= fromTs && updatedTs <= toTs) ||
                    (compTs >= fromTs && compTs <= toTs) ||
                    (dueTs >= fromTs && dueTs <= toTs);

                // 1. Completed Tasks (strictly completed within period)
                const isDone = this.isCompletedStatus(t.status);
                if (isDone) {
                    if (compTs > 0) {
                        if (compTs >= fromTs && compTs <= toTs) completedInRange.push(t);
                    } else if (updatedTs >= fromTs && updatedTs <= toTs) {
                        completedInRange.push(t);
                    } else if (dueTs >= fromTs && dueTs <= toTs) {
                        completedInRange.push(t);
                    } else if (inRange) {
                        completedInRange.push(t);
                    }
                } else {
                    // 2. Pending Tasks (Any open, incomplete task assigned to user)
                    if (status !== 'Cancelled') {
                        pendingInRange.push(t);
                        // Check if overdue
                        if (dueStr && dueStr < fromDateStr) {
                            overdueTasks.push(t);
                        } else if (dueTs > 0 && dueTs < now) {
                            overdueTasks.push(t);
                        }
                    }
                }

                if (inRange || !isDone) {
                    assignedInRange.push(t);
                }

                if (this.isOnHoldStatus(t.status) || t.isOnHold) {
                    onHoldTasks.push(t);
                }

                if (this.isReworkStatus(t.status) || (t.reworkCount && t.reworkCount > 0)) {
                    if (inRange || !isDone) reworkInRange.push(t);
                }
            });

            return {
                allAssigned: assignedInRange,
                completed: completedInRange,
                pending: pendingInRange,
                rework: reworkInRange,
                overdue: overdueTasks,
                onHold: onHoldTasks
            };
        },

        // ─────────────────────────────────────────────────────────────
        // 6. QC METRICS & SAMPLE SIZE ENGINE
        // ─────────────────────────────────────────────────────────────

        getQcMetrics: function (fromTs, toTs, selectedUser = 'all') {
            const rawQc = (typeof window.allQcReports !== 'undefined' && Array.isArray(window.allQcReports))
                ? window.allQcReports
                : [];

            const matched = rawQc.filter(r => {
                const ts = this.parseTimestamp(r.timestamp || r.date || r.createdAt);
                if (ts < fromTs || ts > toTs) return false;
                return this.matchesUser(r, selectedUser);
            });

            if (matched.length === 0) {
                return {
                    hasData: false,
                    averageScore: null,
                    sampleCount: 0,
                    reports: [],
                    displayText: 'Not available (No QC reviews in period)',
                    qualityBand: 'No Data'
                };
            }

            const totalScore = matched.reduce((sum, r) => sum + (Number(r.qcScore) || 0), 0);
            const avg = Math.round(totalScore / matched.length);

            let band = 'Standard';
            if (avg >= 90) band = 'Exceptional';
            else if (avg >= 80) band = 'Proficient';
            else if (avg >= 65) band = 'Needs Improvement';
            else band = 'Critical Focus Required';

            return {
                hasData: true,
                averageScore: avg,
                sampleCount: matched.length,
                reports: matched,
                displayText: `${avg}% (Based on ${matched.length} reviewed deliverable${matched.length === 1 ? '' : 's'})`,
                qualityBand: band
            };
        },

        // ─────────────────────────────────────────────────────────────
        // 7. TASK DELIVERY & COMPLETE 11-STAGE LIFECYCLE ENGINE
        // ─────────────────────────────────────────────────────────────

        DELIVERY_STAGES: [
            'Task Received',
            'Task Assigned',
            'Design Started',
            'Design Completed',
            'Internal QC',
            'QC Approved',
            'Client Sent',
            'Client Feedback',
            'Revision Requested',
            'Revision Completed',
            'Client Approved'
        ],

        getDeliveryLifecycleMetrics: function (fromTs, toTs, selectedUser = 'all', selectedClient = 'all') {
            const tasksList = (typeof window.tasks !== 'undefined' && Array.isArray(window.tasks))
                ? window.tasks
                : [];

            const notifs = (typeof window.taskNotifications !== 'undefined' && Array.isArray(window.taskNotifications))
                ? window.taskNotifications
                : [];

            const deliveryItems = [];
            let totalDesignTATSec = 0, designTATCount = 0;
            let totalQcTATSec = 0, qcTATCount = 0;
            let totalClientDeliveryTATSec = 0, clientDeliveryCount = 0;
            let totalTurnaroundTATSec = 0, totalTurnaroundCount = 0;
            let onTimeDeliveredCount = 0, eligibleDeliveredCount = 0;

            tasksList.forEach(t => {
                if (!this.matchesUser(t, selectedUser)) return;
                if (selectedClient !== 'all' && (t.client || '').toLowerCase() !== selectedClient.toLowerCase()) return;

                const cTs = this.parseTimestamp(t.createdAt || t.created);
                const assignedTs = this.parseTimestamp(t.assignedAt || t.createdAt);
                const designStartTs = this.parseTimestamp(t.designStartedAt || t.startedAt);
                const designCompTs = this.parseTimestamp(t.designCompletedAt || t.updatedAt);
                const qcStartTs = this.parseTimestamp(t.qcStartedAt);
                const qcApprovedTs = this.parseTimestamp(t.qcApprovedAt);
                const clientSentTs = this.parseTimestamp(t.clientSentAt);
                const revisionReqTs = this.parseTimestamp(t.revisionRequestedAt);
                const revisionCompTs = this.parseTimestamp(t.revisionCompletedAt);
                const clientApproveTs = this.parseTimestamp(t.clientApprovedAt || t.completedAt);
                const dueTs = this.parseTimestamp(t.dueDate || t.duedate);

                // Fallback check in task notifications for transition timestamps
                const taskNotifs = notifs.filter(n => n.taskId === t.id);
                const dcNotif = taskNotifs.find(n => (n.type === 'design_completed' || (n.newStatus || '').toLowerCase() === 'design completed'));
                const csNotif = taskNotifs.find(n => (n.type === 'client_sent' || (n.newStatus || '').toLowerCase() === 'client sent'));

                const effectiveDcTs = designCompTs || (dcNotif ? Number(dcNotif.timestamp) : 0);
                const effectiveCsTs = clientSentTs || (csNotif ? Number(csNotif.timestamp) : 0);

                // Relevant to period check
                const latestTs = clientApproveTs || effectiveCsTs || effectiveDcTs || cTs;
                if (latestTs < fromTs || latestTs > toTs) return;

                // 1. Design Turnaround Time
                let designTAT = null;
                if (effectiveDcTs > 0 && designStartTs > 0 && effectiveDcTs >= designStartTs) {
                    const sec = Math.floor((effectiveDcTs - designStartTs) / 1000);
                    designTAT = sec;
                    totalDesignTATSec += sec;
                    designTATCount++;
                }

                // 2. Client Delivery Turnaround (Design Completed -> Client Sent)
                let clientDeliveryTAT = null;
                if (effectiveCsTs > 0 && effectiveDcTs > 0 && effectiveCsTs >= effectiveDcTs) {
                    const sec = Math.floor((effectiveCsTs - effectiveDcTs) / 1000);
                    clientDeliveryTAT = sec;
                    totalClientDeliveryTATSec += sec;
                    clientDeliveryCount++;
                }

                // 3. Total Task Turnaround (Creation -> Final Client Approval)
                let totalTAT = null;
                if (clientApproveTs > 0 && cTs > 0 && clientApproveTs >= cTs) {
                    const sec = Math.floor((clientApproveTs - cTs) / 1000);
                    totalTAT = sec;
                    totalTurnaroundTATSec += sec;
                    totalTurnaroundCount++;
                }

                // 4. On-Time Delivery Check
                let isOnTime = null;
                if (effectiveCsTs > 0 || clientApproveTs > 0) {
                    eligibleDeliveredCount++;
                    const deliveryFinishTs = clientApproveTs || effectiveCsTs;
                    if (dueTs > 0) {
                        isOnTime = deliveryFinishTs <= (dueTs + 86399999);
                        if (isOnTime) onTimeDeliveredCount++;
                    } else {
                        isOnTime = true;
                        onTimeDeliveredCount++;
                    }
                }

                // Determine Current Lifecycle Stage
                const normStatus = this.normalizeStatus(t.status);
                let currentStage = 'Task Received';
                if (normStatus === 'Approved') currentStage = 'Client Approved';
                else if (normStatus === 'Client Sent') currentStage = 'Client Sent';
                else if (normStatus === 'QC Approved') currentStage = 'QC Approved';
                else if (normStatus === 'QC Review') currentStage = 'Internal QC';
                else if (normStatus === 'Design Completed') currentStage = 'Design Completed';
                else if (normStatus === 'Revision In Progress') currentStage = 'Revision In Progress';
                else if (normStatus === 'Revision Requested') currentStage = 'Revision Requested';
                else if (normStatus === 'In Progress') currentStage = 'Design Started';
                else if (t.userId || t.assignee) currentStage = 'Task Assigned';

                deliveryItems.push({
                    task: t,
                    taskId: t.id,
                    taskName: t.desc || t.title || t.summary || 'Deliverable',
                    client: t.client || 'General',
                    status: t.status || 'Assigned',
                    currentStage,
                    stageNumber: this.DELIVERY_STAGES.indexOf(currentStage) + 1 || 1,
                    timestamps: {
                        received: cTs || null,
                        assigned: assignedTs || null,
                        designStarted: designStartTs || null,
                        designCompleted: effectiveDcTs || null,
                        clientSent: effectiveCsTs || null,
                        clientApproved: clientApproveTs || null,
                        dueDate: dueTs || null
                    },
                    tat: {
                        designSec: designTAT,
                        clientDeliverySec: clientDeliveryTAT,
                        totalSec: totalTAT
                    },
                    isOnTime
                });
            });

            return {
                items: deliveryItems,
                trackedCount: deliveryItems.length,
                avgDesignTAT: designTATCount > 0 ? Math.round(totalDesignTATSec / designTATCount) : null,
                avgClientDeliveryTAT: clientDeliveryCount > 0 ? Math.round(totalClientDeliveryTATSec / clientDeliveryCount) : null,
                avgTotalTAT: totalTurnaroundCount > 0 ? Math.round(totalTurnaroundTATSec / totalTurnaroundCount) : null,
                onTimeDeliveryRate: eligibleDeliveredCount > 0 ? Math.round((onTimeDeliveredCount / eligibleDeliveredCount) * 100) : 100
            };
        },

        // ─────────────────────────────────────────────────────────────
        // 8. CENTRALIZED KPI ENGINE (SINGLE SOURCE OF TRUTH)
        // ─────────────────────────────────────────────────────────────

        computeComprehensiveKPIs: function (fromTs, toTs, selectedUser = 'all') {
            const timeLogs = this.getConsolidatedTimeLogs(fromTs, toTs, selectedUser);
            const attendance = this.getAuditedAttendance(fromTs, toTs, selectedUser);
            const tasks = this.getAuditedTasks(fromTs, toTs, selectedUser);
            const qc = this.getQcMetrics(fromTs, toTs, selectedUser);
            const delivery = this.getDeliveryLifecycleMetrics(fromTs, toTs, selectedUser);

            // 1. Total Worked Time
            const totalWorkedSeconds = timeLogs.reduce((sum, log) => sum + (log.durationSeconds || 0), 0);

            // 2. Break Time
            const totalBreakSeconds = attendance.totalBreakSeconds;

            // 3. Active Tracked Time
            let totalActiveSeconds = attendance.totalActiveSeconds;
            if (totalActiveSeconds === 0) {
                // Legitimate fallback if attendance not logged: sum worked and breaks without synthetic idle inflation
                totalActiveSeconds = totalWorkedSeconds > 0 ? (totalWorkedSeconds + totalBreakSeconds) : 0;
            }

            // 4. Hold Time (Derive strictly from on-hold tasks or logs, NO fake multipliers)
            const holdTaskCount = tasks.onHold.length;
            const totalHoldSeconds = holdTaskCount > 0
                ? Math.min(Math.max(0, totalActiveSeconds - totalWorkedSeconds - totalBreakSeconds), holdTaskCount * 900)
                : 0;

            // 5. Idle Time
            const totalIdleSeconds = Math.max(0, totalActiveSeconds - totalWorkedSeconds - totalBreakSeconds - totalHoldSeconds);

            // 6. Time Utilization Rate (Worked Time / Total Available Active Time)
            const timeUtilizationRate = totalActiveSeconds > 0
                ? Math.min(100, Math.round((totalWorkedSeconds / totalActiveSeconds) * 100))
                : 0;

            // 7. Active Task Productivity Rate (Worked Time / Available Non-Break Time)
            const productiveTimeBase = Math.max(0, totalActiveSeconds - totalBreakSeconds);
            const taskProductivityRate = productiveTimeBase > 0
                ? Math.min(100, Math.round((totalWorkedSeconds / productiveTimeBase) * 100))
                : (totalWorkedSeconds > 0 ? 100 : 0);

            // 8. Task Completion Rate
            const totalEligibleAssigned = tasks.completed.length + tasks.pending.length;
            const taskCompletionRate = totalEligibleAssigned > 0
                ? Math.min(100, Math.round((tasks.completed.length / totalEligibleAssigned) * 100))
                : 0;

            // 9. Rework Rate
            const totalReviewed = tasks.completed.length + tasks.rework.length;
            const reworkRate = totalReviewed > 0
                ? Math.min(100, Math.round((tasks.rework.length / totalReviewed) * 100))
                : 0;

            // 10. Hourly Distribution
            const hourlyMap = {};
            for (let h = 8; h <= 21; h++) hourlyMap[h] = 0;
            timeLogs.forEach(l => {
                const hour = new Date(l.startTime).getHours();
                hourlyMap[hour] = (hourlyMap[hour] || 0) + (l.durationSeconds || 0);
            });

            let peakHour = null;
            let peakHourSec = 0;
            Object.entries(hourlyMap).forEach(([h, sec]) => {
                if (sec > peakHourSec) {
                    peakHourSec = sec;
                    peakHour = `${h}:00`;
                }
            });

            // 11. Client Breakdown
            const clientDistribution = {};
            timeLogs.forEach(l => {
                const c = l.client || 'General';
                clientDistribution[c] = (clientDistribution[c] || 0) + (l.durationSeconds || 0);
            });

            return {
                scope: {
                    fromTs,
                    toTs,
                    selectedUser,
                    periodLabel: `${this.formatLocalDate(new Date(fromTs))} to ${this.formatLocalDate(new Date(toTs))}`
                },
                timing: {
                    workedSeconds: totalWorkedSeconds,
                    breakSeconds: totalBreakSeconds,
                    activeSeconds: totalActiveSeconds,
                    holdSeconds: totalHoldSeconds,
                    idleSeconds: totalIdleSeconds,
                    utilizationPct: timeUtilizationRate,
                    productivityPct: taskProductivityRate,
                    peakHour: peakHour || '—',
                    peakHourSeconds: peakHourSec,
                    hourlyMap
                },
                tasks: {
                    assignedCount: totalEligibleAssigned,
                    completedCount: tasks.completed.length,
                    pendingCount: tasks.pending.length,
                    reworkCount: tasks.rework.length,
                    overdueCount: tasks.overdue.length,
                    onHoldCount: tasks.onHold.length,
                    completionRatePct: taskCompletionRate,
                    reworkRatePct: reworkRate,
                    completedList: tasks.completed,
                    pendingList: tasks.pending,
                    reworkList: tasks.rework,
                    overdueList: tasks.overdue
                },
                qc,
                delivery,
                clientDistribution,
                anomalies: {
                    missingCheckouts: attendance.missingCheckouts,
                    overlappingLogs: timeLogs.filter(l => l.anomaly === 'Overlapping Session').length,
                    abnormalLogs: timeLogs.filter(l => l.anomaly === 'Abnormal Duration (>12h)').length
                },
                rawLogs: timeLogs
            };
        },

        // ─────────────────────────────────────────────────────────────
        // 9. AI MANAGEMENT INSIGHTS ENGINE (Data-Driven, No Hallucinations)
        // ─────────────────────────────────────────────────────────────

        generateManagementInsights: function (kpis, prevKpis, scopeType = 'daily') {
            const wins = [];
            const bottlenecks = [];
            const recommendations = [];

            const workedFmt = this.formatDuration(kpis.timing.workedSeconds);
            const compTasks = kpis.tasks.completedCount;
            const pendTasks = kpis.tasks.pendingCount;
            const overdueTasks = kpis.tasks.overdueCount;
            const reworkPct = kpis.tasks.reworkRatePct;
            const utilPct = kpis.timing.utilizationPct;
            const onTimePct = kpis.delivery.onTimeDeliveryRate;

            // 1. Productivity & Output Insights
            if (compTasks > 0) {
                wins.push(`Completed ${compTasks} task${compTasks === 1 ? '' : 's'} with ${onTimePct}% on-time delivery across ${workedFmt} logged.`);
            } else if (kpis.timing.workedSeconds > 0) {
                bottlenecks.push(`Active work logged (${workedFmt}) across ongoing tasks, but 0 tasks reached final completion.`);
            } else {
                bottlenecks.push('No task time logged for this reporting period.');
            }

            // 2. Workload & Capacity Insights
            if (overdueTasks > 0) {
                bottlenecks.push(`${overdueTasks} task${overdueTasks === 1 ? ' is' : 's are'} currently overdue past the target deadline.`);
                recommendations.push(`Prioritize resolution of overdue task${overdueTasks === 1 ? '' : 's'} before starting new assignments.`);
            } else if (pendTasks > 8) {
                bottlenecks.push(`Heavy pending queue (${pendTasks} tasks assigned); risk of bottleneck formation.`);
                recommendations.push('Rebalance queue distribution across available team members.');
            } else {
                wins.push(`Pending queue is balanced with ${pendTasks} active task${pendTasks === 1 ? '' : 's'}.`);
            }

            // 3. Quality & Turnaround
            if (kpis.qc.hasData) {
                if (kpis.qc.averageScore >= 85) {
                    wins.push(`High QC standards maintained: ${kpis.qc.displayText}.`);
                } else {
                    bottlenecks.push(`QC score is ${kpis.qc.averageScore}% (${kpis.qc.sampleCount} reviews); attention needed on revision quality.`);
                    recommendations.push('Conduct a peer-review session to address common QC revision criteria.');
                }
            }

            if (reworkPct > 15) {
                bottlenecks.push(`Rework rate is elevated at ${reworkPct}% (${kpis.tasks.reworkCount} deliverables revised).`);
            }

            // 4. Comparison Deltas (if prev period exists)
            let deltaSummary = '';
            if (prevKpis && prevKpis.timing.workedSeconds > 0) {
                const deltaWorked = Math.round(((kpis.timing.workedSeconds - prevKpis.timing.workedSeconds) / prevKpis.timing.workedSeconds) * 100);
                const deltaTasks = kpis.tasks.completedCount - prevKpis.tasks.completedCount;
                deltaSummary = `Compared to the previous period, logged work changed by ${deltaWorked > 0 ? '+' : ''}${deltaWorked}%, with a net change of ${deltaTasks > 0 ? '+' : ''}${deltaTasks} completed tasks.`;
            }

            return {
                title: `${scopeType.toUpperCase()} MANAGEMENT INTELLIGENCE`,
                headline: wins.length > 0 ? wins[0] : (bottlenecks[0] || 'Operational status steady'),
                wins,
                bottlenecks,
                recommendations,
                deltaSummary,
                dataTimestamp: Date.now()
            };
        }
    };

    // Export to global window scope
    window.OneDeskReportingEngine = OneDeskReportingEngine;

})(typeof window !== 'undefined' ? window : this);
