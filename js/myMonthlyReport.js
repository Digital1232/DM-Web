/**
 * My Monthly Report Module
 * Employee Self-Service Monthly Reporting System
 * Enterprise SaaS Operations, HRMS & Productivity Analytics
 *
 * Integrated with OneDeskReportingEngine, Firebase RTDB & Chart.js
 */

(function (window) {
    'use strict';

    const Engine = window.OneDeskReportingEngine;

    // Module State
    const MMR = {
        selectedYear: new Date().getFullYear(),
        selectedMonth: new Date().getMonth() + 1, // 1-12
        dateMode: 'current_month', // 'current_month', 'prev_month', 'custom_month', 'custom_range'
        customFrom: '',
        customTo: '',
        activeSubTab: 'overview',
        taskSearchTerm: '',
        taskStatusFilter: 'all',
        internalCategoryFilter: 'all',
        qcCategoryFilter: 'all',
        selectedTaskIdForModal: null,
        charts: {},
        cachedReportData: null
    };

    window.MyMonthlyReportState = MMR;

    // Helper: Escaping HTML
    // Safe DOM element retrieval
    function getEl(id) {
        if (typeof window !== 'undefined' && window.document && typeof window.document.getElementById === 'function') {
            return window.document.getElementById(id);
        }
        if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
            return document.getElementById(id);
        }
        return null;
    }

    function safeQueryAll(selector) {
        if (typeof window !== 'undefined' && window.document && typeof window.document.querySelectorAll === 'function') {
            return Array.from(window.document.querySelectorAll(selector));
        }
        if (typeof document !== 'undefined' && typeof document.querySelectorAll === 'function') {
            return Array.from(document.querySelectorAll(selector));
        }
        return [];
    }


    function esc(val) {
        if (val === null || val === undefined) return '';
        if (typeof window.escapeHtml === 'function') return window.escapeHtml(val);
        return String(val).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    // Helper: Format Seconds to HH:MM:SS or duration
    function formatHoursMinutes(seconds) {
        const sec = Math.max(0, Math.floor(seconds || 0));
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        if (h === 0 && m === 0) return '0h 0m';
        return `${h}h ${m}m`;
    }

    function formatDurationHM(seconds) {
        return formatHoursMinutes(seconds);
    }

    function formatDurationHMS(seconds) {
        const sec = Math.max(0, Math.floor(seconds || 0));
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
    }

    function formatTimeStr(timestamp) {
        if (!timestamp) return '—';
        const d = new Date(timestamp);
        if (isNaN(d.getTime())) return '—';
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    function formatDateStr(timestamp) {
        if (!timestamp) return '—';
        const d = new Date(timestamp);
        if (isNaN(d.getTime())) return '—';
        return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    }

    // Helper: Robust duration extraction across all timelog schemas
    function getLogDurationSec(l) {
        if (!l) return 0;
        if (typeof l.durationSeconds === 'number' && !isNaN(l.durationSeconds)) return Math.max(0, Math.floor(l.durationSeconds));
        if (l.durationSeconds && !isNaN(Number(l.durationSeconds))) return Math.max(0, Math.floor(Number(l.durationSeconds)));
        if (l.duration && !isNaN(Number(l.duration))) {
            const d = Number(l.duration);
            return d > 86400 ? Math.max(0, Math.floor(d / 1000)) : Math.max(0, Math.floor(d));
        }
        const start = Engine.parseTimestamp(l.startTime || l.startedAt || l.timestamp);
        const end = Engine.parseTimestamp(l.endTime || l.completedAt);
        if (start && end && end > start) {
            return Math.max(0, Math.floor((end - start) / 1000));
        }
        if (l.hours && !isNaN(Number(l.hours))) {
            return Math.max(0, Math.floor(Number(l.hours) * 3600));
        }
        return 0;
    }

    // ─────────────────────────────────────────────────────────────
    // 1. ROLE-BASED ACCESS CONTROL (AIRTIGHT SECURITY)
    // ─────────────────────────────────────────────────────────────

    const DEFAULT_ADMIN_EMAILS = [
        'digitalmarketing@vilpower.com',
        'nanjil@vilpower.com',
        'murugeshvilpower@gmail.com',
        'murugesh@vilpower.com',
        'palanirajan@vilpower.com',
        'alexvilpower@gmail.com',
        'admin@vilpower.com'
    ];

    const DEFAULT_ADMIN_ROLES = [
        'admin',
        'super admin',
        'administrator',
        'system admin',
        'head of operations',
        'md & core team',
        'senior manager',
        'manager',
        'lead'
    ];

    function checkIsAdmin() {
        if (!window.currentUser) return false;
        if (typeof window.isAdmin === 'function' && window.isAdmin()) return true;
        if (typeof window.isManager === 'function' && window.isManager()) return true;

        const email = String(window.currentUser.email || '').toLowerCase().trim();
        const role = String(window.currentUser.role || '').toLowerCase().trim();

        // 1. Direct role keywords check
        if (
            role === 'admin' ||
            role === 'super admin' ||
            role.includes('admin') ||
            role.includes('manager') ||
            role.includes('head of operations') ||
            role.includes('lead')
        ) {
            return true;
        }

        // 2. Known company admin/manager emails
        const adminEmails = Array.isArray(window.ADMIN_EMAILS) && window.ADMIN_EMAILS.length > 0
            ? window.ADMIN_EMAILS.map(e => String(e).toLowerCase().trim())
            : DEFAULT_ADMIN_EMAILS;

        if (adminEmails.includes(email) || DEFAULT_ADMIN_EMAILS.includes(email)) return true;

        // 3. Known admin roles list
        const adminRoles = Array.isArray(window.ADMIN_ROLES) && window.ADMIN_ROLES.length > 0
            ? window.ADMIN_ROLES.map(r => String(r).toLowerCase().trim())
            : DEFAULT_ADMIN_ROLES;

        if (adminRoles.some(r => role.includes(r))) return true;

        return false;
    }

    function getAuthorizedUserEmail() {
        if (!window.currentUser || !window.currentUser.email) return null;
        const currentEmail = String(window.currentUser.email).trim().toLowerCase();
        const isAdmin = checkIsAdmin();

        // 1. ADMIN ACCESS: Admin has full access to view any employee's report
        if (isAdmin) {
            if (MMR.selectedUserEmail) {
                return MMR.selectedUserEmail.trim().toLowerCase();
            }
            const selectorEl = getEl('mmr-user-select');
            if (selectorEl && selectorEl.value) {
                const val = selectorEl.value.trim().toLowerCase();
                if (val) {
                    MMR.selectedUserEmail = val;
                    return val;
                }
            }
            return currentEmail;
        }

        // 2. NORMAL USER / EMPLOYEE ACCESS:
        // Regular employees can ONLY see their own report under all circumstances.
        // Even if DOM elements are tampered with or parameters altered, strictly enforce currentEmail.
        MMR.selectedUserEmail = currentEmail;
        return currentEmail;
    }

    function getManagerAuthorizedEmails(managerEmail) {
        const list = [managerEmail];
        // Read leave approval chains or team members
        if (typeof window.LEAVE_APPROVAL_CHAINS !== 'undefined' && window.LEAVE_APPROVAL_CHAINS) {
            Object.entries(window.LEAVE_APPROVAL_CHAINS).forEach(([empEmail, approvers]) => {
                if (Array.isArray(approvers) && approvers.some(a => a.toLowerCase() === managerEmail)) {
                    list.push(empEmail.toLowerCase());
                }
            });
        }
        return [...new Set(list)];
    }

    // ─────────────────────────────────────────────────────────────
    // 2. PERIOD RESOLUTION (Timezone Safe +05:30)
    // ─────────────────────────────────────────────────────────────

    function resolveReportPeriod() {
        const now = new Date();
        let fromDate, toDate;
        let periodLabel = '';
        let statusText = 'Completed Period';
        let isCurrentMonth = false;

        if (MMR.dateMode === 'current_month') {
            fromDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            isCurrentMonth = true;
            statusText = 'In-Progress Period';
            periodLabel = fromDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        } else if (MMR.dateMode === 'prev_month') {
            fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
            toDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
            isCurrentMonth = false;
            statusText = 'Completed Period';
            periodLabel = fromDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        } else if (MMR.dateMode === 'custom_month') {
            fromDate = new Date(MMR.selectedYear, MMR.selectedMonth - 1, 1, 0, 0, 0, 0);
            toDate = new Date(MMR.selectedYear, MMR.selectedMonth, 0, 23, 59, 59, 999);
            const isPast = (MMR.selectedYear < now.getFullYear() || (MMR.selectedYear === now.getFullYear() && MMR.selectedMonth < now.getMonth() + 1));
            isCurrentMonth = (MMR.selectedYear === now.getFullYear() && MMR.selectedMonth === now.getMonth() + 1);
            statusText = isPast ? 'Completed Period' : (isCurrentMonth ? 'In-Progress Period' : 'Future Planning Period');
            periodLabel = fromDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        } else if (MMR.dateMode === 'custom_range') {
            const fStr = MMR.customFrom || getEl('mmr-date-from')?.value;
            const tStr = MMR.customTo || getEl('mmr-date-to')?.value;
            if (fStr && tStr) {
                const [fy, fm, fd] = fStr.split('-').map(Number);
                const [ty, tm, td] = tStr.split('-').map(Number);
                fromDate = new Date(fy, fm - 1, fd, 0, 0, 0, 0);
                toDate = new Date(ty, tm - 1, td, 23, 59, 59, 999);
                periodLabel = `${fStr} to ${tStr}`;
                isCurrentMonth = false;
                statusText = 'Custom Range Period';
            } else {
                fromDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
                toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                isCurrentMonth = true;
                statusText = 'In-Progress Period';
                periodLabel = fromDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            }
        }

        const fromTs = fromDate.getTime();
        const toTs = toDate.getTime();

        // Calculate previous comparison period of identical duration
        const durationMs = (toTs - fromTs) + 1;
        const prevToTs = fromTs - 1;
        const prevFromTs = prevToTs - durationMs + 1;

        return {
            fromDate,
            toDate,
            fromTs,
            toTs,
            periodLabel,
            statusText,
            isCurrentMonth,
            prevFromTs,
            prevToTs,
            daysInPeriod: Math.round((toTs - fromTs) / 86400000)
        };
    }

    // ─────────────────────────────────────────────────────────────
    // 3. CORE METRIC EXTRACTION & CALCULATION ENGINE
    // ─────────────────────────────────────────────────────────────

    // Auto-fetch historical Jira space key if not yet loaded in window.tasks
    const _fetchingKeys = new Set();
    function maybeFetchHistoricalSpaceKey(projectKey) {
        if (!projectKey || _fetchingKeys.has(projectKey)) return;
        const allTasks = Array.isArray(window.tasks) ? window.tasks : ((typeof tasks !== 'undefined' && Array.isArray(tasks)) ? tasks : []);
        const hasTasks = allTasks.some(t => String(t.id || '').toUpperCase().startsWith(projectKey.toUpperCase() + '-'));
        if (hasTasks) return;

        _fetchingKeys.add(projectKey);
        console.log(`[MyMonthlyReport] Historical tasks for space key ${projectKey} missing in memory. Fetching from Jira Cloud...`);

        if (typeof window.fetchAllJiraIssues === 'function') {
            const jql = `project = '${projectKey}' ORDER BY updated DESC`;
            window.fetchAllJiraIssues(jql, 'summary,status,priority,labels,assignee,duedate,issuetype,parent,components')
                .then(issues => {
                    if (issues && issues.length > 0 && typeof window.mapJiraIssues === 'function') {
                        const newTasks = window.mapJiraIssues(issues);
                        const existingMap = new Map();
                        (window.tasks || []).forEach(t => existingMap.set(t.id, t));
                        newTasks.forEach(t => existingMap.set(t.id, t));
                        window.tasks = Array.from(existingMap.values());
                        if (typeof tasks !== 'undefined') tasks = window.tasks;
                        if (typeof safeSetLocalStorage === 'function') {
                            safeSetLocalStorage('worksync_tasks', JSON.stringify(window.tasks));
                        }
                        console.log(`[MyMonthlyReport] Successfully fetched and cached ${newTasks.length} ${projectKey} tasks.`);
                        if (window.MyMonthlyReport && typeof window.MyMonthlyReport.refresh === 'function') {
                            window.MyMonthlyReport.refresh();
                        }
                    }
                })
                .catch(err => {
                    console.warn(`[MyMonthlyReport] Failed to fetch historical tasks for ${projectKey}:`, err);
                })
                .finally(() => {
                    _fetchingKeys.delete(projectKey);
                });
        }
    }

    function computeMyMonthlyReportData(targetEmail) {
        if (!targetEmail) return null;
        const period = resolveReportPeriod();
        const normalizedTarget = targetEmail.trim().toLowerCase();
        const isAll = (normalizedTarget === 'all' || normalizedTarget === 'all_employees');

        // 1. Employee Profile Lookup
        const catalogUser = (typeof window.USERS !== 'undefined' && Array.isArray(window.USERS))
            ? window.USERS.find(u => u && u.email && u.email.toLowerCase() === normalizedTarget)
            : null;

        const rawUserObj = isAll
            ? { name: 'All Employees', role: 'Enterprise Team Overview', department: 'Organization Wide' }
            : ((typeof window.allUsersMap !== 'undefined' && window.allUsersMap.get(normalizedTarget)) ||
                catalogUser ||
                (typeof window.knownUserByEmail === 'function' && window.knownUserByEmail(normalizedTarget)) ||
                (window.currentUser && window.currentUser.email.toLowerCase() === normalizedTarget ? window.currentUser : { email: normalizedTarget, name: normalizedTarget }));

        const canonicalName = (catalogUser && catalogUser.name) || rawUserObj.name || rawUserObj.displayName || normalizedTarget;

        const employeeProfile = {
            email: normalizedTarget,
            name: canonicalName,
            designation: (catalogUser && catalogUser.role) || rawUserObj.role || rawUserObj.designation || 'Team Member',
            department: rawUserObj.department || (((catalogUser && catalogUser.role) || rawUserObj.role || '').includes('Designer') ? 'Visual Design' : (((catalogUser && catalogUser.role) || rawUserObj.role || '').includes('Video') ? 'Video Production' : 'Operations & Creative Delivery')),
            avatar: isAll ? 'img/favicon.svg' : (rawUserObj.profilePicture || (typeof window.getUserAvatarSrc === 'function' ? window.getUserAvatarSrc(rawUserObj) : ''))
        };

        const KNOWN_NAME_ALIASES = {
            'barathvilpower@gmail.com': ['barath magesh m', 'barath magesh', 'barath'],
            'karthikavilpower@gmail.com': ['karthika k', 'karthika soundarrajan', 'karthika'],
            'immanuelvilpower@gmail.com': ['immanuel raja s', 'immanuel raja', 'immanuel'],
            'muthuvilpower@gmail.com': ['muthu kumar', 'muthukumar', 'muthu'],
            'murugeshvilpower@gmail.com': ['murugesh', 'murugesh kumar', 'murugesh k'],
            'ajithvilpower@gmail.com': ['ajith', 'ajith kumar'],
            'alexvilpower@gmail.com': ['alex', 'alexander', 'alex vilpower'],
            'nanjilvilpower@gmail.com': ['nanjil', 'nanjil nathan'],
            'palanivilpower@gmail.com': ['palani', 'palani bharathi'],
            'digitalmarketing@vilpower.com': ['admin', 'digital marketing', 'vilpower admin']
        };

        const targetAliases = new Set([
            normalizedTarget,
            canonicalName.toLowerCase(),
            (rawUserObj.name || '').toLowerCase(),
            ...(KNOWN_NAME_ALIASES[normalizedTarget] || [])
        ].filter(Boolean));

        const targetFirstToken = canonicalName.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().split(/\s+/)[0];

        function matchesTargetEmployee(entity) {
            if (!entity) return false;
            if (isAll) return true;

            if (typeof window.OneDeskReportingEngine !== 'undefined' && typeof window.OneDeskReportingEngine.matchesUser === 'function') {
                if (window.OneDeskReportingEngine.matchesUser(entity, normalizedTarget)) return true;
            }
            if (typeof window.assigneeMatches === 'function') {
                try {
                    if (window.assigneeMatches(entity, normalizedTarget)) return true;
                } catch (e) { }
            }

            const em = (entity.assigneeEmail || entity.userId || entity.email || entity.userEmail || entity.authorEmail || '').toLowerCase().trim();
            if (em && (em === normalizedTarget || targetAliases.has(em))) return true;

            const nm = (entity.assignee || entity.assigneeName || entity.userName || entity.name || '').toLowerCase().trim();
            if (nm) {
                if (targetAliases.has(nm)) return true;
                const cleanNm = nm.replace(/[^a-z0-9\s]/g, '').trim();
                if (targetAliases.has(cleanNm)) return true;
                const cleanTarget = canonicalName.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
                if (cleanNm === cleanTarget || cleanNm.startsWith(cleanTarget) || cleanTarget.startsWith(cleanNm)) return true;
                const first = cleanNm.split(/\s+/)[0];
                if (targetFirstToken && targetFirstToken.length >= 3 && first && first.length >= 3) {
                    if (targetFirstToken === first || targetFirstToken.startsWith(first) || first.startsWith(targetFirstToken)) return true;
                }
            }
            return false;
        }

        // 2. Tasks Segregation (Jira vs Internal)
        const allTasks = Array.isArray(window.tasks) ? window.tasks : ((typeof tasks !== 'undefined' && Array.isArray(tasks)) ? tasks : []);
        const isInternalFn = typeof window.isInternalTask === 'function' ? window.isInternalTask : (t => {
            if (!t) return false;
            const tId = String(t.id || t.taskId || '').toUpperCase().trim();
            if (tId.startsWith('M-') || tId.startsWith('LEARN-')) return true;
            return t.manual === true || t.manual === 'true' || t.taskType === 'internal';
        });

        const userTasks = isAll ? allTasks : allTasks.filter(matchesTargetEmployee);

        // Map Tasks with Time Logs & Sessions
        let allLogs = Array.isArray(window.allTimeLogs) && window.allTimeLogs.length > 0
            ? window.allTimeLogs
            : ((typeof allTimeLogs !== 'undefined' && Array.isArray(allTimeLogs) && allTimeLogs.length > 0)
                ? allTimeLogs
                : (typeof window.timeLogs !== 'undefined' && Array.isArray(window.timeLogs) && window.timeLogs.length > 0 ? window.timeLogs : []));

        if (allLogs.length === 0 && typeof localStorage !== 'undefined') {
            try {
                const cached = localStorage.getItem('worksync_all_timelogs') || localStorage.getItem('worksync_timelogs');
                if (cached) allLogs = JSON.parse(cached);
            } catch (e) { }
        }
        const userLogs = isAll ? allLogs : allLogs.filter(matchesTargetEmployee);

        // Filter logs strictly within period
        const periodLogs = userLogs.filter(l => {
            const start = Engine.parseTimestamp(l.startTime || l.startedAt || l.timestamp);
            const durSec = getLogDurationSec(l);
            const end = Engine.parseTimestamp(l.endTime || l.completedAt) || (start + durSec * 1000);
            return (start >= period.fromTs && start <= period.toTs) || (end >= period.fromTs && end <= period.toTs);
        });

        // Task sessions map: taskId -> logs (case-insensitive)
        const taskLogsMap = new Map();
        periodLogs.forEach(log => {
            const tId = String(log.taskId || 'general').trim().toLowerCase();
            if (!taskLogsMap.has(tId)) taskLogsMap.set(tId, []);
            taskLogsMap.get(tId).push(log);
        });

        // Auto-fetch missing historical space key (e.g. OCT) in the background if tasks not in memory
        const repMonth = period.fromDate.getMonth() + 1; // 1-12
        const repYear = period.fromDate.getFullYear();
        if (repMonth === 10 && repYear === 2026 && typeof maybeFetchHistoricalSpaceKey === 'function') {
            maybeFetchHistoricalSpaceKey('OCT');
        }

        // UNIFIED TASK CANDIDATE POOL:
        // 1. Tasks assigned to or matched with the employee in allTasks
        // 2. PLUS any task the employee worked on during this period (from periodLogs)!
        // If a task was worked on by this employee, IT MUST BE INCLUDED IN THE REPORT.
        // If the Jira task is not in memory, we synthesize a complete task record from the logged session.
        const taskByIdMap = new Map();
        allTasks.forEach(t => {
            if (t && t.id) taskByIdMap.set(String(t.id).trim().toLowerCase(), t);
        });

        const candidateUserTasks = [...userTasks];
        const candidateTaskIds = new Set(candidateUserTasks.map(t => String(t.id).trim().toLowerCase()));

        periodLogs.forEach(log => {
            const tId = String(log.taskId || '').trim();
            if (!tId || tId.toLowerCase() === 'general' || tId.toLowerCase() === 'undefined' || tId.toLowerCase() === 'null') return;
            const tIdLower = tId.toLowerCase();
            if (!candidateTaskIds.has(tIdLower)) {
                if (taskByIdMap.has(tIdLower)) {
                    candidateUserTasks.push(taskByIdMap.get(tIdLower));
                    candidateTaskIds.add(tIdLower);
                } else {
                    const isInternal = tId.startsWith('M-') || log.taskType === 'internal';
                    const dashIdx = tId.indexOf('-');
                    const pKey = dashIdx !== -1 ? tId.substring(0, dashIdx).toUpperCase() : '';
                    const syntheticTask = {
                        id: tId,
                        desc: log.taskDesc || log.taskTitle || log.title || tId,
                        client: log.client || 'Client',
                        status: log.status || 'Done',
                        priority: log.priority || 'Medium',
                        assignee: employeeProfile.name,
                        assigneeEmail: employeeProfile.email,
                        manual: isInternal,
                        taskType: isInternal ? 'internal' : 'jira',
                        project: pKey || (repMonth === 10 ? 'OCT' : (repMonth === 11 ? 'NOV' : '')),
                        isSyntheticFromLog: true
                    };
                    candidateUserTasks.push(syntheticTask);
                    candidateTaskIds.add(tIdLower);
                }
            }
        });

        // Include live timer if logged-in user is viewing their own current month report
        const isCurrentPeriod = (period.fromTs <= Date.now() && Date.now() <= period.toTs);
        const isSelf = window.currentUser && String(window.currentUser.email || '').toLowerCase() === normalizedTarget;
        if (isCurrentPeriod && isSelf && window.activeTaskId && typeof window.taskSeconds === 'number' && window.taskSeconds > 0) {
            const liveTask = allTasks.find(t => String(t.id).toLowerCase() === String(window.activeTaskId).toLowerCase());
            const liveLog = {
                taskId: window.activeTaskId,
                taskDesc: liveTask?.desc || liveTask?.title || 'Active Live Session',
                userId: normalizedTarget,
                userName: employeeProfile.name,
                startTime: (typeof window.taskStartTime === 'number' && window.taskStartTime > 0) ? window.taskStartTime : (Date.now() - window.taskSeconds * 1000),
                endTime: Date.now(),
                durationSeconds: window.taskSeconds,
                isLive: true
            };
            periodLogs.push(liveLog);
            const liveTId = String(window.activeTaskId).trim().toLowerCase();
            if (!taskLogsMap.has(liveTId)) taskLogsMap.set(liveTId, []);
            taskLogsMap.get(liveTId).push(liveLog);
        }

        // Filter tasks that are relevant to this month:
        const mappings = (typeof window.getRegisteredProjectKeys === 'function' ? window.jiraProjectMappings : null) || [];

        // Determine if there is at least one space-key mapping registered for the reporting month.
        const hasMappingForMonth = mappings.some(m => {
            const matchesMonth = Number(m.month) === repMonth;
            const matchesYear = m.year === 'all' || !m.year || Number(m.year) === repYear;
            return matchesMonth && matchesYear;
        }) || (repMonth === 11 && repYear === 2026) || (repMonth === 10 && repYear === 2026);

        const relevantTasks = candidateUserTasks.filter(t => {
            const tId = String(t.id || '').toUpperCase().trim();
            const dashIdx = tId.indexOf('-');
            const pKey = t.project ? String(t.project).toUpperCase().trim() : (dashIdx !== -1 ? tId.substring(0, dashIdx) : '');

            // 1. Is this task's space key mapped to the reporting month?
            let isSpaceKeyMonth = false;
            if (pKey) {
                const mapEntry = mappings.find(m => String(m.projectKey).toUpperCase() === pKey);
                if (mapEntry) {
                    const matchesMonth = Number(mapEntry.month) === repMonth;
                    const matchesYear = mapEntry.year === 'all' || !mapEntry.year || Number(mapEntry.year) === repYear;
                    isSpaceKeyMonth = matchesMonth && matchesYear;
                } else if (pKey === 'NOV' && repMonth === 11 && repYear === 2026) {
                    isSpaceKeyMonth = true;
                } else if (pKey === 'OCT' && repMonth === 10 && repYear === 2026) {
                    isSpaceKeyMonth = true;
                }
            }

            let cTs = Engine.parseTimestamp(t.createdAt || t.created);
            if (!cTs && typeof t.id === 'string' && /^M-\d{12,14}$/.test(t.id)) {
                const rawMs = parseInt(t.id.replace('M-', ''), 10);
                if (!isNaN(rawMs) && rawMs > 1600000000000 && rawMs < 2500000000000) {
                    cTs = rawMs;
                }
            }
            const uTs = Engine.parseTimestamp(t.updatedAt || t.updated);
            const compTs = Engine.parseTimestamp(t.completedAt || t.lastCompletedDate);
            const dTs = Engine.parseTimestamp(t.dueDate || t.duedate);
            const postTs = Engine.parseTimestamp(t.postDate);
            const hasLogsInPeriod = taskLogsMap.has(String(t.id).trim().toLowerCase());

            const isDone = typeof window.isCompletedTask === 'function'
                ? window.isCompletedTask(t.status)
                : (typeof window.isDone === 'function' ? window.isDone(t.status) : Engine.isCompletedStatus(t.status));

            const inRange = (cTs >= period.fromTs && cTs <= period.toTs) ||
                (uTs >= period.fromTs && uTs <= period.toTs) ||
                (compTs >= period.fromTs && compTs <= period.toTs) ||
                (dTs >= period.fromTs && dTs <= period.toTs) ||
                (postTs >= period.fromTs && postTs <= period.toTs);

            const isInternal = isInternalFn(t);

            if (isInternal) {
                // If the employee logged time on this internal task in this month, it belongs to this report!
                if (hasLogsInPeriod) return true;
                if (isDone) {
                    return (compTs >= period.fromTs && compTs <= period.toTs) ||
                        (dTs >= period.fromTs && dTs <= period.toTs);
                }
                const createdBeforeOrInPeriod = (!cTs || cTs <= period.toTs);
                const dueInOrBeforePeriod = (!dTs || dTs <= period.toTs);
                return (createdBeforeOrInPeriod && dueInOrBeforePeriod) || inRange;
            }

            // Jira Tasks:
            // 1. If the employee worked on this task during this period (has logs in period):
            // It MUST be included in the report! Real work performed during this month must be represented.
            if (hasLogsInPeriod) {
                return true;
            }

            // 2. If the task was completed or due within this reporting period:
            if ((compTs >= period.fromTs && compTs <= period.toTs) || (dTs >= period.fromTs && dTs <= period.toTs)) {
                return true;
            }

            // 3. Otherwise, if space-key mapping exists for this month, require the space key
            if (hasMappingForMonth) {
                return isSpaceKeyMonth;
            }

            // Fallback: date range
            return inRange;
        });

        // Separate Jira and Internal
        const jiraTasks = [];
        const internalTasks = [];

        // QC Performance Data Lookups
        const allQc = Array.isArray(window.allQcReports) ? window.allQcReports : (Array.isArray(window.qcReports) ? window.qcReports : ((typeof allQcReports !== 'undefined' && Array.isArray(allQcReports)) ? allQcReports : []));
        const userTaskIds = new Set();
        userTasks.forEach(t => {
            if (t.id) {
                userTaskIds.add(String(t.id));
                userTaskIds.add(String(t.id).toUpperCase());
                userTaskIds.add(String(t.id).toLowerCase());
            }
        });

        function isQcReportFailed(r) {
            if (!r) return false;
            const action = String(r.actionStatus || r.status || r.action || r.newStatus || '').toLowerCase();
            if (action.includes('rework') || action.includes('reject') || action.includes('fail')) return true;
            const mistakeCount = Array.isArray(r.mistakeItems) ? r.mistakeItems.length : (r.mistakeItems ? 1 : 0);
            if (mistakeCount > 0) return true;
            if (typeof r.qcScore === 'number' && r.qcScore < 75) return true;
            return false;
        }

        relevantTasks.forEach(t => {
            const tLogs = taskLogsMap.get(String(t.id).trim().toLowerCase()) || [];
            const taskTotalTimeSec = tLogs.reduce((acc, l) => acc + getLogDurationSec(l), 0);
            const sessionCount = tLogs.length;

            const isDone = typeof window.isCompletedTask === 'function'
                ? window.isCompletedTask(t.status)
                : (typeof window.isDone === 'function' ? window.isDone(t.status) : Engine.isCompletedStatus(t.status));

            const taskQcReports = allQc.filter(r => String(r.taskId || '').toLowerCase() === String(t.id || '').toLowerCase());
            const qcReworkRounds = taskQcReports.filter(isQcReportFailed).length;
            const isCurrentlyRework = (typeof window.isReworkStatus === 'function')
                ? window.isReworkStatus(t.status)
                : (String(t.status || '').toLowerCase().includes('rework') || String(t.status || '').toLowerCase().includes('correction'));
            const calculatedReworkCount = Math.max(Number(t.reworkCount) || 0, qcReworkRounds, isCurrentlyRework ? 1 : 0);
            const isRework = calculatedReworkCount > 0;
            const isProgress = Engine.isInProgressStatus(t.status);

            const enriched = {
                ...t,
                workingTimeSec: taskTotalTimeSec,
                workSessionsCount: sessionCount,
                workSessions: tLogs,
                isCompleted: isDone,
                isRework: isRework,
                reworkCount: calculatedReworkCount,
                isInProgress: isProgress
            };

            if (isInternalFn(t)) {
                internalTasks.push(enriched);
            } else {
                jiraTasks.push(enriched);
            }
        });

        // 3. Attendance & Breaks Evaluation
        const rawAttendance = Array.isArray(window.attendanceEvents) ? window.attendanceEvents : ((typeof attendanceEvents !== 'undefined' && Array.isArray(attendanceEvents)) ? attendanceEvents : []);
        const userAttendance = rawAttendance.filter(e => {
            if (isAll) return true;
            return matchesTargetEmployee(e);
        });

        const periodAttendance = userAttendance.filter(e => {
            const ts = e.timestamp || 0;
            return ts >= period.fromTs && ts <= period.toTs;
        });

        // Daily calendar map (YYYY-MM-DD)
        const dailyAttendanceMap = {};
        let totalBreakSeconds = 0;
        let totalAttendanceSeconds = 0;
        let lateCheckInCount = 0;
        let earlyCheckOutCount = 0;
        const breakSessions = [];

        // Step A: Process attendance events (check-ins, check-outs, breaks)
        periodAttendance.forEach(evt => {
            const dateStr = evt.timestamp ? Engine.formatLocalDate(new Date(evt.timestamp)) : (evt.date || '');
            if (!dateStr) return;
            if (!dailyAttendanceMap[dateStr]) {
                dailyAttendanceMap[dateStr] = {
                    date: dateStr,
                    checkIns: [],
                    checkOuts: [],
                    breaks: [],
                    workLogs: [],
                    totalWorkSec: 0,
                    totalBreakSec: 0,
                    attendanceSec: 0,
                    status: 'Present' // 'Present', 'Late', 'Half Day', 'Leave', 'Holiday'
                };
            }

            const dayObj = dailyAttendanceMap[dateStr];
            if (evt.type === 'check_in') {
                dayObj.checkIns.push(evt.timestamp);
                const checkInDate = new Date(evt.timestamp);
                if (checkInDate.getHours() > 10 || (checkInDate.getHours() === 10 && checkInDate.getMinutes() > 15)) {
                    lateCheckInCount++;
                    dayObj.isLate = true;
                }
            } else if (evt.type === 'check_out') {
                dayObj.checkOuts.push(evt.timestamp);
                const checkOutDate = new Date(evt.timestamp);
                if (checkOutDate.getHours() < 18 || (checkOutDate.getHours() === 18 && checkOutDate.getMinutes() < 30)) {
                    earlyCheckOutCount++;
                    dayObj.isEarly = true;
                }
            } else if (evt.type === 'break_end' && evt.duration) {
                const bSec = Math.floor(evt.duration / 1000);
                dayObj.totalBreakSec += bSec;
                totalBreakSeconds += bSec;
                const bObj = {
                    date: dateStr,
                    start: evt.timestamp - evt.duration,
                    end: evt.timestamp,
                    durationSeconds: bSec
                };
                dayObj.breaks.push(bObj);
                breakSessions.push(bObj);
            }
        });

        // Step B: Attach logged task sessions to daily attendance
        periodLogs.forEach(log => {
            const startTs = Engine.parseTimestamp(log.startTime || log.startedAt || log.timestamp);
            if (!startTs) return;
            const durSec = getLogDurationSec(log);
            const dateStr = Engine.formatLocalDate(new Date(startTs));

            if (!dailyAttendanceMap[dateStr]) {
                dailyAttendanceMap[dateStr] = {
                    date: dateStr,
                    checkIns: [],
                    checkOuts: [],
                    breaks: [],
                    workLogs: [],
                    totalWorkSec: 0,
                    totalBreakSec: 0,
                    attendanceSec: 0,
                    status: 'Present',
                    isSynthetic: true
                };
            }

            const dayObj = dailyAttendanceMap[dateStr];
            dayObj.workLogs.push(log);
            dayObj.totalWorkSec += durSec;
        });

        // Step C: Ensure every day with work logs has check-in and check-out bounds
        let presentDaysCount = 0;
        Object.values(dailyAttendanceMap).forEach(day => {
            if (day.checkIns.length === 0 && day.workLogs.length > 0) {
                const starts = day.workLogs.map(l => Engine.parseTimestamp(l.startTime || l.startedAt || l.timestamp)).filter(Boolean);
                const ends = day.workLogs.map(l => {
                    const s = Engine.parseTimestamp(l.startTime || l.startedAt || l.timestamp);
                    const d = getLogDurationSec(l);
                    return Engine.parseTimestamp(l.endTime || l.completedAt) || (s + d * 1000);
                }).filter(Boolean);
                if (starts.length > 0) day.checkIns.push(Math.min(...starts));
                if (ends.length > 0) day.checkOuts.push(Math.max(...ends));
            }

            day.checkIns.sort((a, b) => a - b);
            day.checkOuts.sort((a, b) => a - b);
            const firstIn = day.checkIns[0];
            const lastOut = day.checkOuts[day.checkOuts.length - 1];

            if (firstIn) {
                presentDaysCount++;
                if (lastOut && lastOut > firstIn) {
                    day.attendanceSec = Math.max(day.totalWorkSec, Math.floor((lastOut - firstIn) / 1000));
                } else {
                    const todayStr = Engine.formatLocalDate(new Date());
                    if (day.date === todayStr) {
                        day.attendanceSec = Math.max(day.totalWorkSec, Math.floor((Date.now() - firstIn) / 1000));
                    } else {
                        day.attendanceSec = Math.max(day.totalWorkSec, 28800); // Standard 8 hours or actual work
                    }
                }
            }
            totalAttendanceSeconds += day.attendanceSec;
        });

        // Calculate work days: for current month, only count days elapsed to date
        const now = new Date();
        const isCurrentMonth = period.fromDate <= now && now <= period.toDate;
        const effectiveEndForAttendance = isCurrentMonth ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999) : period.toDate;

        let workingDaysToDate = 0;
        let totalMonthWorkingDays = 0;
        const curD = new Date(period.fromDate);
        while (curD <= period.toDate) {
            if (curD.getDay() !== 0) { // Sunday = 0
                totalMonthWorkingDays++;
                if (curD <= effectiveEndForAttendance) {
                    workingDaysToDate++;
                }
            }
            curD.setDate(curD.getDate() + 1);
        }

        // 4. QC Performance Data (Traceable Reviewer Records)
        const userQcSubmissions = allQc.filter(r => {
            const ts = Engine.parseTimestamp(r.timestamp || r.date || r.createdAt);
            if (ts && (ts < period.fromTs || ts > period.toTs)) return false;

            if (typeof window.isQcReportForUser === 'function') {
                if (window.isQcReportForUser(r, normalizedTarget, userTaskIds)) return true;
            }
            const rId = String(r.taskId || '').toLowerCase();
            return matchesTargetEmployee(r) || (rId && userTaskIds.has(rId));
        });

        const qcFailed = userQcSubmissions.filter(isQcReportFailed);
        const qcPassed = userQcSubmissions.filter(r => !isQcReportFailed(r));
        const qcTotalCount = userQcSubmissions.length;
        const qcPassPct = qcTotalCount > 0 ? Math.round((qcPassed.length / qcTotalCount) * 100) : null;
        const qcFailPct = qcTotalCount > 0 ? Math.round((qcFailed.length / qcTotalCount) * 100) : null;
        const avgQcScore = qcTotalCount > 0 ? Math.round(userQcSubmissions.reduce((sum, r) => sum + (Number(r.qcScore) || 0), 0) / qcTotalCount) : null;
        const avgQcRating = qcTotalCount > 0 ? (userQcSubmissions.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / qcTotalCount).toFixed(1) : null;

        // Categorize failed submissions
        const failedQcDetails = qcFailed.map(f => {
            let cat = 'Other';
            const notes = (f.notes || '').toLowerCase();
            const mistakeStr = Array.isArray(f.mistakeItems) ? f.mistakeItems.join(' ').toLowerCase() : String(f.mistakeItems || '').toLowerCase();
            const combinedText = `${notes} ${mistakeStr}`;

            if (combinedText.includes('typography') || combinedText.includes('font') || combinedText.includes('hierarchy') || combinedText.includes('kerning')) cat = 'Typography';
            else if (combinedText.includes('spelling') || combinedText.includes('grammar') || combinedText.includes('typos') || combinedText.includes('misspell')) cat = 'Spelling and Grammar';
            else if (combinedText.includes('brand') || combinedText.includes('guideline') || combinedText.includes('logo')) cat = 'Brand Guideline Violation';
            else if (combinedText.includes('dimension') || combinedText.includes('ratio') || combinedText.includes('size')) cat = 'Incorrect Dimensions';
            else if (combinedText.includes('image') || combinedText.includes('blur') || combinedText.includes('resolution')) cat = 'Image Quality';
            else if (combinedText.includes('content') || combinedText.includes('copy') || combinedText.includes('mismatch')) cat = 'Content Mismatch';
            else if (combinedText.includes('client') || combinedText.includes('brief')) cat = 'Client Requirement Mismatch';
            else if (combinedText.includes('design') || combinedText.includes('layout') || combinedText.includes('color')) cat = 'Design Quality';
            else if (combinedText.includes('technical') || combinedText.includes('render') || combinedText.includes('audio')) cat = 'Technical Error';

            return {
                id: f.id,
                taskId: f.taskId || '—',
                taskName: f.taskDesc || f.taskTitle || 'Deliverable Review',
                submissionDate: formatDateStr(f.timestamp),
                reviewer: f.qcUser || 'Sneha (QC Incharge)',
                failureReason: f.notes || 'Revisions requested on visual checklist',
                failureCategory: cat,
                reviewerComments: f.notes || 'Please adjust elements per guidelines',
                requiredCorrections: Array.isArray(f.mistakeItems) && f.mistakeItems.length > 0 ? f.mistakeItems.join('; ') : (f.notes || 'General revisions'),
                qcScore: f.qcScore || 0,
                rating: f.rating || 1,
                finalResult: 'Rework Required'
            };
        });

        // 5. Rework & Revision Analysis
        const allCombinedTasks = [...jiraTasks, ...internalTasks];
        const reworkTasks = allCombinedTasks.filter(t => t.isRework || (t.reworkCount && t.reworkCount > 0));
        const totalReworkOccurrences = reworkTasks.reduce((sum, t) => sum + Math.max(1, t.reworkCount || 1), 0);
        const internalQcReworkCount = qcFailed.length;
        const clientRequestedRevisionsCount = Math.max(0, totalReworkOccurrences - internalQcReworkCount);

        // 6. Timing & Productivity Totals
        const totalWorkedSeconds = periodLogs.reduce((sum, l) => sum + getLogDurationSec(l), 0);
        const effectiveActiveSeconds = totalAttendanceSeconds > 0 ? totalAttendanceSeconds : (totalWorkedSeconds + totalBreakSeconds);
        const workUtilizationPct = effectiveActiveSeconds > 0 ? Math.min(100, Math.round((totalWorkedSeconds / effectiveActiveSeconds) * 100)) : 0;
        const avgDailyWorkHours = presentDaysCount > 0 ? (totalWorkedSeconds / 3600 / presentDaysCount).toFixed(1) : '0.0';
        const avgDailyBreakMins = presentDaysCount > 0 ? Math.round(totalBreakSeconds / 60 / presentDaysCount) : 0;

        // Longest break
        let longestBreakSec = 0;
        breakSessions.forEach(b => {
            if (b.durationSeconds > longestBreakSec) longestBreakSec = b.durationSeconds;
        });

        // Delivery score (on-time delivery %)
        const completedDeliverables = allCombinedTasks.filter(t => t.isCompleted);
        let onTimeCount = 0;
        completedDeliverables.forEach(t => {
            const dueTs = Engine.parseTimestamp(t.dueDate || t.duedate);
            const compTs = Engine.parseTimestamp(t.completedAt || t.lastCompletedDate || t.updatedAt);
            if (dueTs > 0 && compTs > 0) {
                if (compTs <= (dueTs + 86399999)) onTimeCount++;
            } else {
                onTimeCount++; // if no due date specified, consider on-time
            }
        });
        const deliveryScorePct = completedDeliverables.length > 0 ? Math.round((onTimeCount / completedDeliverables.length) * 100) : 100;

        // 7. Previous Period Comparison (Deltas)
        const prevLogs = userLogs.filter(l => {
            const start = Engine.parseTimestamp(l.startTime || l.startedAt || l.timestamp);
            return start >= period.prevFromTs && start <= period.prevToTs;
        });
        const prevWorkedSec = prevLogs.reduce((sum, l) => sum + getLogDurationSec(l), 0);
        const prevCompletedCount = userTasks.filter(t => {
            const compTs = Engine.parseTimestamp(t.completedAt || t.lastCompletedDate);
            return compTs >= period.prevFromTs && compTs <= period.prevToTs;
        }).length;

        const deltaWorkPct = prevWorkedSec > 0 ? Math.round(((totalWorkedSeconds - prevWorkedSec) / prevWorkedSec) * 100) : null;
        const deltaCompleted = prevCompletedCount > 0 ? (completedDeliverables.length - prevCompletedCount) : null;

        return {
            period,
            employee: employeeProfile,
            kpis: {
                totalAssigned: allCombinedTasks.length,
                jiraAssigned: jiraTasks.length,
                internalAssigned: internalTasks.length,
                completed: completedDeliverables.length,
                pending: allCombinedTasks.filter(t => !t.isCompleted).length,
                inProgress: allCombinedTasks.filter(t => t.isInProgress).length,
                rework: reworkTasks.length,
                totalWorkedSeconds,
                totalWorkingHours: (totalWorkedSeconds / 3600).toFixed(1),
                attendanceDays: presentDaysCount,
                totalWorkingDays: totalMonthWorkingDays,
                workingDaysToDate: workingDaysToDate,
                absentDays: Math.max(0, workingDaysToDate - presentDaysCount),
                totalBreakSeconds,
                totalBreakFormatted: formatHoursMinutes(totalBreakSeconds),
                qcScore: avgQcScore,
                qcRating: avgQcRating,
                deliveryScore: deliveryScorePct,
                utilizationPct: workUtilizationPct,
                avgDailyWorkHours,
                avgDailyBreakMins,
                longestBreakSec,
                lateCheckIns: lateCheckInCount,
                earlyCheckOuts: earlyCheckOutCount,
                comparison: {
                    prevWorkedSec,
                    prevCompletedCount,
                    deltaWorkPct,
                    deltaCompleted,
                    hasPrevData: prevWorkedSec > 0 || prevCompletedCount > 0
                }
            },
            jiraTasks,
            internalTasks,
            allTasks: allCombinedTasks,
            taskLogsMap,
            periodLogs,
            dailyAttendanceMap,
            breakSessions,
            qc: {
                totalSubmissions: qcTotalCount,
                passedCount: qcPassed.length,
                failedCount: qcFailed.length,
                passPct: qcPassPct,
                failPct: qcFailPct,
                avgScore: avgQcScore,
                avgRating: avgQcRating,
                failedDetails: failedQcDetails
            },
            rework: {
                totalTasks: reworkTasks.length,
                totalOccurrences: totalReworkOccurrences,
                internalQcRework: internalQcReworkCount,
                clientRevisions: clientRequestedRevisionsCount,
                reworkTaskList: reworkTasks
            }
        };
    }

    // ─────────────────────────────────────────────────────────────
    // 4. AI PERSONAL MONTHLY INSIGHTS GENERATOR (DATA-BACKED)
    // ─────────────────────────────────────────────────────────────

    function generatePersonalAiInsights(data) {
        if (!data) return [];
        const insights = [];
        const k = data.kpis;
        const empName = data.employee.name.split(' ')[0] || 'Team Member';

        // 1. Output & Completion
        if (k.completed > 0) {
            insights.push({
                type: 'win',
                category: 'Task Delivery',
                title: 'Strong Output & Completion Rhythm',
                message: `${empName}, you completed ${k.completed} deliverable${k.completed === 1 ? '' : 's'} this month with an outstanding ${k.deliveryScore}% on-time delivery rate.`
            });
        } else if (k.totalWorkedSeconds > 0) {
            insights.push({
                type: 'info',
                category: 'Delivery Focus',
                title: 'High Active Effort Logged',
                message: `You accumulated ${k.totalWorkingHours} hours across key work streams. Focus on closing out active assignments before starting new work.`
            });
        }

        // 2. Jira vs Internal Breakdown
        if (k.jiraAssigned > 0 && k.internalAssigned > 0) {
            const jiraRatio = Math.round((k.jiraAssigned / k.totalAssigned) * 100);
            insights.push({
                type: 'neutral',
                category: 'Workload Balance',
                title: 'Dual-Channel Work Balance',
                message: `Your allocation was ${jiraRatio}% client-facing Jira tasks and ${100 - jiraRatio}% internal organizational tasks, maintaining a healthy contribution across client deliverables and internal growth.`
            });
        }

        // 3. Quality & QC Checkpoints
        if (data.qc.totalSubmissions > 0) {
            if (data.qc.passPct !== null && data.qc.passPct >= 80) {
                insights.push({
                    type: 'win',
                    category: 'Quality Excellence',
                    title: 'High First-Pass Quality Score',
                    message: `Your QC pass rate was ${data.qc.passPct}% across ${data.qc.totalSubmissions} evaluated deliverables with an average rating of ${data.qc.avgRating}/5.0.`
                });
            } else {
                const topMistake = data.qc.failedDetails.length > 0 ? data.qc.failedDetails[0].failureCategory : 'guideline compliance';
                insights.push({
                    type: 'attention',
                    category: 'Quality Optimization',
                    title: 'Attention Area: Quality Review Rounds',
                    message: `QC pass rate was ${data.qc.passPct}%. The primary correction theme was "${topMistake}". Review the pre-delivery brand checklist before final submission to eliminate repeated correction rounds.`
                });
            }
        } else {
            insights.push({
                type: 'neutral',
                category: 'Quality Status',
                title: 'Self-Verified Deliverables',
                message: `No external QC evaluation rounds were recorded during this period; deliverable quality was maintained through direct workflow execution.`
            });
        }

        // 4. Attendance & Utilization
        if (k.attendanceDays > 0) {
            const lateNote = k.lateCheckIns > 0 ? ` with ${k.lateCheckIns} late check-in${k.lateCheckIns === 1 ? '' : 's'}` : ' with 100% on-time punctuality';
            insights.push({
                type: k.lateCheckIns <= 2 ? 'win' : 'attention',
                category: 'Attendance & Routine',
                title: 'Operational Consistency',
                message: `Present for ${k.attendanceDays} of ${k.totalWorkingDays} company working days${lateNote}. You maintained a work utilization rate of ${k.utilizationPct}%.`
            });
        }

        // 5. Delta Comparison
        if (k.comparison.hasPrevData && k.comparison.deltaWorkPct !== null) {
            const sign = k.comparison.deltaWorkPct >= 0 ? '+' : '';
            insights.push({
                type: k.comparison.deltaWorkPct >= 0 ? 'win' : 'neutral',
                category: 'Monthly Trajectory',
                title: 'Month-over-Month Velocity',
                message: `Compared to the previous month, total logged working hours shifted by ${sign}${k.comparison.deltaWorkPct}%, reflecting your dynamic operational capacity.`
            });
        }

        return insights;
    }

    // ─────────────────────────────────────────────────────────────
    // 5. CHART.JS VISUAL ANALYTICS (8 RESPONSIVE CHARTS)
    // ─────────────────────────────────────────────────────────────

    function renderProductivityCharts(data) {
        if (!data || typeof Chart === 'undefined') return;

        // Destroy previous instances to avoid canvas reuse bugs
        Object.keys(MMR.charts).forEach(key => {
            if (MMR.charts[key]) {
                try { MMR.charts[key].destroy(); } catch (e) { }
            }
        });
        MMR.charts = {};

        const days = Object.keys(data.dailyAttendanceMap).sort();
        const displayDays = days.map(d => d.slice(5)); // MM-DD

        // 1. Daily Working Hours Chart
        const dailyWorkCtx = getEl('mmr-chart-daily-hours')?.getContext('2d');
        if (dailyWorkCtx) {
            const workHours = days.map(d => (data.dailyAttendanceMap[d].totalWorkSec / 3600).toFixed(2));
            MMR.charts.dailyHours = new Chart(dailyWorkCtx, {
                type: 'bar',
                data: {
                    labels: displayDays.length > 0 ? displayDays : ['No Activity'],
                    datasets: [{
                        label: 'Working Hours',
                        data: workHours.length > 0 ? workHours : [0],
                        backgroundColor: '#7c3aed',
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, title: { display: true, text: 'Hours' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        // 2. Daily Completed Tasks Chart
        const dailyCompCtx = getEl('mmr-chart-daily-completed')?.getContext('2d');
        if (dailyCompCtx) {
            const compCounts = days.map(d => {
                return data.allTasks.filter(t => {
                    const compStr = Engine.formatLocalDate(new Date(Engine.parseTimestamp(t.completedAt || t.lastCompletedDate || t.updatedAt)));
                    return t.isCompleted && compStr === d;
                }).length;
            });
            MMR.charts.dailyCompleted = new Chart(dailyCompCtx, {
                type: 'bar',
                data: {
                    labels: displayDays.length > 0 ? displayDays : ['No Activity'],
                    datasets: [{
                        label: 'Completed Tasks',
                        data: compCounts.length > 0 ? compCounts : [0],
                        backgroundColor: '#10b981',
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1 } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        // 3. Jira vs Internal Task Allocation Chart
        const taskAllocCtx = getEl('mmr-chart-task-allocation')?.getContext('2d');
        if (taskAllocCtx) {
            MMR.charts.taskAlloc = new Chart(taskAllocCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Jira Tasks', 'Internal Tasks'],
                    datasets: [{
                        data: [data.jiraTasks.length, data.internalTasks.length],
                        backgroundColor: ['#6366f1', '#ec4899'],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } }
                }
            });
        }

        // 4. QC Pass vs Failure Chart
        const qcPassCtx = getEl('mmr-chart-qc-pass')?.getContext('2d');
        if (qcPassCtx) {
            const passed = data.qc.passedCount;
            const failed = data.qc.failedCount;
            MMR.charts.qcPass = new Chart(qcPassCtx, {
                type: 'doughnut',
                data: {
                    labels: ['QC Passed', 'QC Revisions'],
                    datasets: [{
                        data: (passed + failed > 0) ? [passed, failed] : [1, 0],
                        backgroundColor: (passed + failed > 0) ? ['#10b981', '#f43f5e'] : ['#e2e8f0', '#cbd5e1'],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } }
                }
            });
        }

        // 5. Daily Break Duration Chart
        const dailyBreakCtx = getEl('mmr-chart-daily-break')?.getContext('2d');
        if (dailyBreakCtx) {
            const breakMins = days.map(d => Math.round(data.dailyAttendanceMap[d].totalBreakSec / 60));
            MMR.charts.dailyBreak = new Chart(dailyBreakCtx, {
                type: 'line',
                data: {
                    labels: displayDays.length > 0 ? displayDays : ['No Activity'],
                    datasets: [{
                        label: 'Break Minutes',
                        data: breakMins.length > 0 ? breakMins : [0],
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.15)',
                        fill: true,
                        tension: 0.3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, title: { display: true, text: 'Minutes' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        // 6. Rework Trends Chart
        const reworkTrendCtx = getEl('mmr-chart-rework-trend')?.getContext('2d');
        if (reworkTrendCtx) {
            MMR.charts.reworkTrend = new Chart(reworkTrendCtx, {
                type: 'bar',
                data: {
                    labels: ['First-Time Approved', 'Internal QC Rework', 'Client Revisions'],
                    datasets: [{
                        label: 'Count',
                        data: [
                            Math.max(0, data.kpis.completed - data.rework.totalTasks),
                            data.rework.internalQcRework,
                            data.rework.clientRevisions
                        ],
                        backgroundColor: ['#10b981', '#f59e0b', '#8b5cf6'],
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                }
            });
        }

        // 7. Task Completion Trend (Cumulative)
        const compTrendCtx = getEl('mmr-chart-completion-trend')?.getContext('2d');
        if (compTrendCtx) {
            let runningSum = 0;
            const cumulative = days.map(d => {
                const cCount = data.allTasks.filter(t => {
                    const compStr = Engine.formatLocalDate(new Date(Engine.parseTimestamp(t.completedAt || t.lastCompletedDate || t.updatedAt)));
                    return t.isCompleted && compStr === d;
                }).length;
                runningSum += cCount;
                return runningSum;
            });
            MMR.charts.compTrend = new Chart(compTrendCtx, {
                type: 'line',
                data: {
                    labels: displayDays.length > 0 ? displayDays : ['No Activity'],
                    datasets: [{
                        label: 'Cumulative Completed Tasks',
                        data: cumulative.length > 0 ? cumulative : [0],
                        borderColor: '#7c3aed',
                        backgroundColor: 'rgba(124, 58, 237, 0.1)',
                        fill: true,
                        tension: 0.2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true } }
                }
            });
        }

        // 8. Weekly Productivity Comparison
        const weeklyProdCtx = getEl('mmr-chart-weekly-productivity')?.getContext('2d');
        if (weeklyProdCtx) {
            // Group by 4 calendar weeks
            const weekBuckets = [0, 0, 0, 0, 0];
            days.forEach((d, idx) => {
                const dayNum = parseInt(d.slice(8), 10);
                const wIdx = Math.min(4, Math.floor((dayNum - 1) / 7));
                weekBuckets[wIdx] += (data.dailyAttendanceMap[d].totalWorkSec / 3600);
            });
            MMR.charts.weeklyProd = new Chart(weeklyProdCtx, {
                type: 'bar',
                data: {
                    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'],
                    datasets: [{
                        label: 'Working Hours',
                        data: weekBuckets.map(v => v.toFixed(1)),
                        backgroundColor: '#6366f1',
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, title: { display: true, text: 'Hours' } } }
                }
            });
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 6. UI RENDERING PIPELINE
    // ─────────────────────────────────────────────────────────────

    function renderMyMonthlyReport() {
        // Ensure RBAC user dropdown is updated and visible for Admin immediately
        updateRbacUserSelector();

        const targetEmail = getAuthorizedUserEmail();
        if (!targetEmail) {
            console.warn('[MyMonthlyReport] User email not authenticated');
            return;
        }

        const data = computeMyMonthlyReportData(targetEmail);
        MMR.cachedReportData = data;
        if (!data) return;

        // 1. Render Header & Profile Banner
        const nameEl = getEl('mmr-header-name');
        const roleEl = getEl('mmr-header-role');
        const deptEl = getEl('mmr-header-dept');
        const monthEl = getEl('mmr-header-period');
        const genTimeEl = getEl('mmr-header-generated-time');
        const avatarEl = getEl('mmr-header-avatar');
        const adminBadgeEl = getEl('mmr-admin-view-badge');

        if (nameEl) nameEl.textContent = data.employee.name;
        if (roleEl) roleEl.textContent = data.employee.designation;
        if (deptEl) deptEl.textContent = data.employee.department;
        if (monthEl) monthEl.textContent = data.period.periodLabel;
        if (genTimeEl) genTimeEl.textContent = `Report generated on ${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })} (Asia/Kolkata)`;
        if (avatarEl && data.employee.avatar) avatarEl.src = data.employee.avatar;

        if (adminBadgeEl) {
            const isAdmin = checkIsAdmin();
            const currentEmail = String(window.currentUser?.email || '').trim().toLowerCase();
            const isViewingOther = isAdmin && data.employee.email.toLowerCase() !== currentEmail;
            if (isViewingOther) {
                adminBadgeEl.classList.remove('hidden');
                adminBadgeEl.innerHTML = `
                    <div class="flex items-center justify-between gap-3 bg-purple-50/80 border border-purple-200 px-4 py-2.5 rounded-2xl">
                        <div class="flex items-center gap-2 text-xs text-purple-900 font-medium">
                            <iconify-icon icon="solar:shield-user-bold" width="16" class="text-purple-600 shrink-0"></iconify-icon>
                            <span>Administrator Mode: Viewing monthly performance report for <strong class="font-bold text-purple-950">${esc(data.employee.name)}</strong> (${esc(data.employee.email)})</span>
                        </div>
                        <button type="button" onclick="window.MyMonthlyReport.switchToMyReport()"
                            class="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-sm shadow-purple-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                            <iconify-icon icon="solar:user-circle-bold" width="14"></iconify-icon>
                            Switch to My Report
                        </button>
                    </div>
                `;
            } else {
                adminBadgeEl.classList.add('hidden');
                adminBadgeEl.innerHTML = '';
            }
        }

        // 2. Render 12 Executive KPI Cards
        renderKpiCards(data);

        // 3. Render Sub-Tabs (Overview, Jira, Internal, Timing, QC, Rework, Attendance, Breaks, Insights)
        renderActiveSubTab(data);

        // 4. Update Navigation/RBAC selector
        updateRbacUserSelector();

        // 5. Render Active Filter Summary Bar
        renderActiveFilterSummary(data);
    }

    function renderKpiCards(data) {
        const k = data.kpis;
        const prev = k.comparison;

        const kpisConfig = [
            { id: 'total-assigned', label: 'Total Assigned Tasks', val: k.totalAssigned, sub: `${k.jiraAssigned} Jira + ${k.internalAssigned} Internal`, icon: 'solar:clipboard-list-bold-duotone', color: 'text-purple-600 bg-purple-50' },
            { id: 'jira-assigned', label: 'Jira Assigned Tasks', val: k.jiraAssigned, sub: 'Client deliverables', icon: 'solar:widget-bold-duotone', color: 'text-indigo-600 bg-indigo-50' },
            { id: 'internal-assigned', label: 'Internal Assigned Tasks', val: k.internalAssigned, sub: 'Learning, meetings, admin', icon: 'solar:document-text-bold-duotone', color: 'text-fuchsia-600 bg-fuchsia-50' },
            { id: 'completed-tasks', label: 'Completed Tasks', val: k.completed, sub: prev.hasPrevData ? (prev.deltaCompleted !== null ? `${prev.deltaCompleted >= 0 ? '+' : ''}${prev.deltaCompleted} vs last month` : 'Steady output') : 'First recorded month', icon: 'solar:check-circle-bold-duotone', color: 'text-emerald-600 bg-emerald-50' },
            { id: 'pending-tasks', label: 'Pending Tasks', val: k.pending, sub: `${k.inProgress} currently in-progress`, icon: 'solar:hourglass-bold-duotone', color: 'text-amber-600 bg-amber-50' },
            { id: 'in-progress-tasks', label: 'In-Progress Tasks', val: k.inProgress, sub: 'Active work in pipeline', icon: 'solar:stopwatch-play-bold-duotone', color: 'text-blue-600 bg-blue-50' },
            { id: 'rework-tasks', label: 'Rework Tasks', val: k.rework, sub: `${data.rework.totalOccurrences} total rework loops`, icon: 'solar:refresh-circle-bold-duotone', color: 'text-rose-600 bg-rose-50' },
            { id: 'working-hours', label: 'Total Working Hours', val: `${k.totalWorkingHours}h`, sub: prev.hasPrevData ? (prev.deltaWorkPct !== null ? `${prev.deltaWorkPct >= 0 ? '+' : ''}${prev.deltaWorkPct}% vs last month` : 'Time tracked') : 'Tracked hours', icon: 'solar:clock-circle-bold-duotone', color: 'text-purple-600 bg-purple-50' },
            {
                id: 'attendance-days',
                label: 'Attendance Days',
                val: `${k.attendanceDays} / ${k.workingDaysToDate || k.totalWorkingDays}`,
                sub: (k.workingDaysToDate && k.workingDaysToDate < k.totalWorkingDays)
                    ? `${k.absentDays} absent so far (${k.totalWorkingDays} days in month)`
                    : `${k.absentDays} absent, ${k.lateCheckIns} late`,
                icon: 'solar:calendar-check-bold-duotone',
                color: 'text-teal-600 bg-teal-50'
            },
            { id: 'break-time', label: 'Total Break Time', val: k.totalBreakFormatted, sub: `Avg ${k.avgDailyBreakMins}m / present day`, icon: 'solar:cup-bold-duotone', color: 'text-orange-600 bg-orange-50' },
            { id: 'qc-score', label: 'QC Score', val: k.qcScore !== null ? `${k.qcScore}%` : 'N/A', sub: k.qcRating ? `Avg rating: ${k.qcRating}/5.0` : 'No QC evaluations', icon: 'solar:shield-check-bold-duotone', color: 'text-violet-600 bg-violet-50' },
            { id: 'delivery-score', label: 'Delivery Score', val: `${k.deliveryScore}%`, sub: 'On-time delivery performance', icon: 'solar:rocket-bold-duotone', color: 'text-emerald-600 bg-emerald-50' }
        ];

        const container = getEl('mmr-kpis-grid');
        if (!container) return;

        container.innerHTML = kpisConfig.map(c => `
            <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-semibold text-slate-500">${c.label}</span>
                    <div class="w-8 h-8 rounded-xl flex items-center justify-center ${c.color}">
                        <iconify-icon icon="${c.icon}" width="18"></iconify-icon>
                    </div>
                </div>
                <div class="mt-3">
                    <p class="text-2xl font-black text-slate-900 tracking-tight">${c.val}</p>
                    <p class="text-[11px] font-medium text-slate-400 mt-0.5 truncate">${c.sub}</p>
                </div>
            </div>
        `).join('');
    }

    function renderActiveSubTab(data) {
        const tab = MMR.activeSubTab;

        // Hide all tab panels
        const tabPanels = [
            'overview', 'jira', 'internal', 'timing', 'client-timing', 'qc', 'rework', 'attendance', 'breaks', 'insights', 'goals'
        ];
        tabPanels.forEach(t => {
            getEl(`mmr-tab-${t}`)?.classList.add('hidden');
            const btn = getEl(`mmr-subtab-btn-${t}`);
            if (btn) {
                btn.classList.remove('bg-purple-600', 'text-white', 'shadow-sm');
                btn.classList.add('text-slate-600', 'hover:bg-slate-100');
            }
        });

        const activePanel = getEl(`mmr-tab-${tab}`);
        if (activePanel) activePanel.classList.remove('hidden');

        const activeBtn = getEl(`mmr-subtab-btn-${tab}`);
        if (activeBtn) {
            activeBtn.classList.remove('text-slate-600', 'hover:bg-slate-100');
            activeBtn.classList.add('bg-purple-600', 'text-white', 'shadow-sm');
        }

        // Render contents based on active tab
        if (tab === 'overview') {
            setTimeout(() => renderProductivityCharts(data), 20);
        } else if (tab === 'jira') {
            renderJiraTab(data);
        } else if (tab === 'internal') {
            renderInternalTab(data);
        } else if (tab === 'timing') {
            renderTimingTab(data);
        } else if (tab === 'client-timing') {
            renderClientTimingTab(data);
        } else if (tab === 'qc') {
            renderQcTab(data);
        } else if (tab === 'rework') {
            renderReworkTab(data);
        } else if (tab === 'attendance') {
            renderAttendanceTab(data);
        } else if (tab === 'breaks') {
            renderBreaksTab(data);
        } else if (tab === 'insights') {
            renderInsightsTab(data);
        } else if (tab === 'goals') {
            renderGoalsTab(data);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // SUB-TAB 1: JIRA TASKS
    // ─────────────────────────────────────────────────────────────

    function renderJiraTab(data) {
        const tbody = getEl('mmr-jira-tasks-tbody');
        if (!tbody) return;

        let filtered = data.jiraTasks;
        if (MMR.taskSearchTerm) {
            const term = MMR.taskSearchTerm.toLowerCase();
            filtered = filtered.filter(t => (t.id || '').toLowerCase().includes(term) || (t.desc || '').toLowerCase().includes(term) || (t.client || '').toLowerCase().includes(term));
        }
        if (MMR.taskStatusFilter !== 'all') {
            filtered = filtered.filter(t => Engine.normalizeStatus(t.status).toLowerCase() === MMR.taskStatusFilter.toLowerCase());
        }

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="p-8 text-center text-slate-400 font-medium">No Jira tasks found for this period.</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(t => {
            const isOverdue = t.duedate && new Date(t.duedate).getTime() < Date.now() && !t.isCompleted;
            const norm = Engine.normalizeStatus(t.status);
            let statusBadge = 'bg-slate-100 text-slate-700';
            if (norm === 'Approved') statusBadge = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
            else if (norm === 'In Progress') statusBadge = 'bg-blue-50 text-blue-700 border border-blue-200';
            else if (norm === 'Rework') statusBadge = 'bg-rose-50 text-rose-700 border border-rose-200';
            else if (norm === 'QC Review') statusBadge = 'bg-amber-50 text-amber-700 border border-amber-200';

            return `
                <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                    <td class="px-4 py-3 font-mono font-bold text-xs text-purple-700">
                        <button onclick="window.MyMonthlyReport.openTaskDetailModal('${esc(t.id)}')" class="hover:underline flex items-center gap-1.5">
                            <iconify-icon icon="solar:link-circle-bold" width="14"></iconify-icon>
                            ${esc(t.id)}
                        </button>
                    </td>
                    <td class="px-4 py-3">
                        <p class="font-semibold text-xs text-slate-900 line-clamp-2">${esc(t.desc || t.title)}</p>
                        <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">${esc(t.client || 'General')}</span>
                    </td>
                    <td class="px-4 py-3 text-xs font-medium text-slate-600">${esc(t.priority || 'Medium')}</td>
                    <td class="px-4 py-3 text-xs text-slate-500">${formatDateStr(t.created || t.createdAt)}</td>
                    <td class="px-4 py-3 text-xs">
                        <span class="${isOverdue ? 'text-rose-600 font-bold flex items-center gap-1' : 'text-slate-500'}">
                            ${isOverdue ? '<iconify-icon icon="solar:danger-triangle-bold" width="12"></iconify-icon>' : ''}
                            ${t.duedate || '—'}
                        </span>
                    </td>
                    <td class="px-4 py-3">
                        <span class="px-2.5 py-1 text-[11px] font-bold rounded-lg ${statusBadge}">${esc(t.status || 'Assigned')}</span>
                    </td>
                    <td class="px-4 py-3 text-xs font-mono font-semibold text-slate-800">${formatDurationHMS(t.workingTimeSec)}</td>
                    <td class="px-4 py-3 text-xs font-bold text-center text-slate-700">${t.workSessionsCount}</td>
                    <td class="px-4 py-3 text-xs font-bold text-center ${t.reworkCount > 0 ? 'text-rose-600' : 'text-slate-400'}">${t.reworkCount || 0}</td>
                </tr>
            `;
        }).join('');
    }

    // ─────────────────────────────────────────────────────────────
    // SUB-TAB 2: INTERNAL TASKS
    // ─────────────────────────────────────────────────────────────

    function renderInternalTab(data) {
        const tbody = getEl('mmr-internal-tasks-tbody');
        if (!tbody) return;

        let filtered = data.internalTasks;
        if (MMR.internalCategoryFilter !== 'all') {
            filtered = filtered.filter(t => (t.category || 'Other Activities').toLowerCase() === MMR.internalCategoryFilter.toLowerCase());
        }

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-slate-400 font-medium">No internal tasks found for this period.</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(t => {
            const cat = t.category || (t.desc && t.desc.toLowerCase().includes('learn') ? 'Learning & Training' : 'Administrative Work');
            return `
                <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                    <td class="px-4 py-3 font-mono font-bold text-xs text-fuchsia-700">
                        <button onclick="window.MyMonthlyReport.openTaskDetailModal('${esc(t.id)}')" class="hover:underline flex items-center gap-1.5">
                            <iconify-icon icon="solar:folder-with-files-bold" width="14"></iconify-icon>
                            ${esc(t.id)}
                        </button>
                    </td>
                    <td class="px-4 py-3 font-semibold text-xs text-slate-900">${esc(t.desc || t.title)}</td>
                    <td class="px-4 py-3">
                        <span class="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-100">${esc(cat)}</span>
                    </td>
                    <td class="px-4 py-3 text-xs text-slate-500">${formatDateStr(t.created || t.createdAt)}</td>
                    <td class="px-4 py-3 text-xs text-slate-500">${t.duedate || '—'}</td>
                    <td class="px-4 py-3">
                        <span class="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-700">${esc(t.status || 'Completed')}</span>
                    </td>
                    <td class="px-4 py-3 text-xs font-mono font-semibold text-slate-800">${formatDurationHMS(t.workingTimeSec)}</td>
                    <td class="px-4 py-3 text-xs font-bold text-center text-slate-700">${t.workSessionsCount}</td>
                </tr>
            `;
        }).join('');
    }

    // ─────────────────────────────────────────────────────────────
    // SUB-TAB 3: TASK-WISE TIME REPORT
    // ─────────────────────────────────────────────────────────────

    function renderTimingTab(data) {
        const tbody = getEl('mmr-timing-tasks-tbody');
        if (!tbody) return;

        const all = data.allTasks;
        if (all.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-400 font-medium">No task timing logs found for this period.</td></tr>`;
            return;
        }

        tbody.innerHTML = all.map(t => {
            const source = t.manual || t.taskType === 'internal' ? 'Internal' : 'Jira';
            const sourceClass = source === 'Jira' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100';
            return `
                <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                    <td class="px-4 py-3">
                        <p class="font-bold text-xs text-slate-900">${esc(t.desc || t.title)}</p>
                        <p class="font-mono text-[10px] text-purple-700">${esc(t.id)}</p>
                    </td>
                    <td class="px-4 py-3">
                        <span class="px-2 py-0.5 text-[10px] font-bold rounded-md border ${sourceClass}">${source}</span>
                    </td>
                    <td class="px-4 py-3 text-xs font-bold text-slate-700 text-center">${t.workSessionsCount}</td>
                    <td class="px-4 py-3 text-xs font-mono font-bold text-slate-900">${formatDurationHMS(t.workingTimeSec)}</td>
                    <td class="px-4 py-3 text-xs font-bold text-center ${t.reworkCount > 0 ? 'text-rose-600' : 'text-slate-400'}">${t.reworkCount || 0}</td>
                    <td class="px-4 py-3 text-xs">
                        <span class="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-700">${esc(t.status || 'Active')}</span>
                    </td>
                    <td class="px-4 py-3 text-right">
                        <button onclick="window.MyMonthlyReport.openTaskDetailModal('${esc(t.id)}')" class="px-3 py-1.5 text-xs font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg transition-colors">
                            View Sessions
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ─────────────────────────────────────────────────────────────
    // SUB-TAB 4: QC PERFORMANCE
    // ─────────────────────────────────────────────────────────────

    function renderQcTab(data) {
        const tbody = getEl('mmr-qc-failures-tbody');
        if (!tbody) return;

        let failed = data.qc.failedDetails;
        if (MMR.qcCategoryFilter !== 'all') {
            failed = failed.filter(f => f.failureCategory.toLowerCase() === MMR.qcCategoryFilter.toLowerCase());
        }

        if (failed.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-400 font-medium">No recorded QC failures or revisions in this period. Outstanding quality!</td></tr>`;
            return;
        }

        tbody.innerHTML = failed.map(f => `
            <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                <td class="px-4 py-3 font-mono font-bold text-xs text-purple-700">${esc(f.taskId)}</td>
                <td class="px-4 py-3">
                    <p class="font-semibold text-xs text-slate-900">${esc(f.taskName)}</p>
                    <span class="text-[10px] text-slate-400">${f.submissionDate}</span>
                </td>
                <td class="px-4 py-3 text-xs text-slate-700 font-medium">${esc(f.reviewer)}</td>
                <td class="px-4 py-3">
                    <span class="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-rose-50 text-rose-700 border border-rose-100">${esc(f.failureCategory)}</span>
                </td>
                <td class="px-4 py-3 text-xs text-slate-600 line-clamp-2">${esc(f.failureReason)}</td>
                <td class="px-4 py-3 text-xs text-slate-500">${esc(f.requiredCorrections)}</td>
                <td class="px-4 py-3">
                    <span class="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-50 text-amber-700 border border-amber-200">${esc(f.finalResult)}</span>
                </td>
            </tr>
        `).join('');
    }

    // ─────────────────────────────────────────────────────────────
    // SUB-TAB 5: REWORK & REVISION REPORT
    // ─────────────────────────────────────────────────────────────

    function renderReworkTab(data) {
        const tbody = getEl('mmr-rework-tbody');
        if (!tbody) return;

        const list = data.rework.reworkTaskList;
        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-400 font-medium">No rework or revisions recorded in this period.</td></tr>`;
            return;
        }

        tbody.innerHTML = list.map(t => {
            const occ = Math.max(1, t.reworkCount || 1);
            return `
                <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                    <td class="px-4 py-3 font-mono font-bold text-xs text-purple-700">${esc(t.id)}</td>
                    <td class="px-4 py-3 font-semibold text-xs text-slate-900">${esc(t.desc || t.title)}</td>
                    <td class="px-4 py-3 text-xs font-bold text-slate-700">${esc(t.client || 'General')}</td>
                    <td class="px-4 py-3 text-xs font-bold text-center text-rose-600">${occ}</td>
                    <td class="px-4 py-3 text-xs font-mono text-slate-800">${formatDurationHMS(t.workingTimeSec)}</td>
                    <td class="px-4 py-3 text-xs text-slate-500">
                        ${t.reworkReason || 'Standard review correction cycle'}
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ─────────────────────────────────────────────────────────────
    // SUB-TAB 6: ATTENDANCE CALENDAR & DAILY LOGS
    // ─────────────────────────────────────────────────────────────

    function renderAttendanceTab(data) {
        const tbody = getEl('mmr-attendance-tbody');
        if (!tbody) return;

        const days = Object.keys(data.dailyAttendanceMap).sort();
        if (days.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-400 font-medium">No attendance records logged for this period.</td></tr>`;
            return;
        }

        tbody.innerHTML = days.map(dStr => {
            const day = data.dailyAttendanceMap[dStr];
            const firstIn = day.checkIns[0];
            const lastOut = day.checkOuts[day.checkOuts.length - 1];
            let badge = 'bg-emerald-50 text-emerald-700 border-emerald-100';
            let label = 'Present';
            if (day.isLate) {
                badge = 'bg-amber-50 text-amber-700 border-amber-200';
                label = 'Late Check-in';
            }
            if (day.isEarly) {
                badge = 'bg-rose-50 text-rose-700 border-rose-200';
                label = 'Early Check-out';
            }

            return `
                <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                    <td class="px-4 py-3 font-bold text-xs text-slate-900">${dStr}</td>
                    <td class="px-4 py-3 text-xs font-mono text-slate-600">${formatTimeStr(firstIn)}</td>
                    <td class="px-4 py-3 text-xs font-mono text-slate-600">${formatTimeStr(lastOut)}</td>
                    <td class="px-4 py-3 text-xs font-mono font-semibold text-slate-800">${formatHoursMinutes(day.attendanceSec)}</td>
                    <td class="px-4 py-3 text-xs font-mono text-purple-700 font-bold">${formatHoursMinutes(day.totalWorkSec)}</td>
                    <td class="px-4 py-3 text-xs font-mono text-amber-600">${formatHoursMinutes(day.totalBreakSec)}</td>
                    <td class="px-4 py-3">
                        <span class="px-2.5 py-1 text-[10px] font-bold rounded-lg border ${badge}">${label}</span>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ─────────────────────────────────────────────────────────────
    // SUB-TAB 7: BREAKS & TIME UTILIZATION
    // ─────────────────────────────────────────────────────────────

    function renderBreaksTab(data) {
        const tbody = getEl('mmr-breaks-tbody');
        if (!tbody) return;

        const breaks = data.breakSessions;
        if (breaks.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400 font-medium">No recorded break sessions in this period.</td></tr>`;
            return;
        }

        tbody.innerHTML = breaks.map((b, idx) => `
            <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                <td class="px-4 py-3 text-xs font-bold text-slate-700">#${idx + 1}</td>
                <td class="px-4 py-3 text-xs text-slate-800 font-semibold">${b.date}</td>
                <td class="px-4 py-3 text-xs font-mono text-slate-600">${formatTimeStr(b.start)}</td>
                <td class="px-4 py-3 text-xs font-mono text-slate-600">${formatTimeStr(b.end)}</td>
                <td class="px-4 py-3 text-xs font-mono font-bold text-amber-700">${formatDurationHMS(b.durationSeconds)}</td>
            </tr>
        `).join('');
    }

    // ─────────────────────────────────────────────────────────────
    // SUB-TAB 8: AI MONTHLY INSIGHTS
    // ─────────────────────────────────────────────────────────────

    function renderInsightsTab(data) {
        const container = getEl('mmr-insights-container');
        if (!container) return;

        const insights = generatePersonalAiInsights(data);
        if (insights.length === 0) {
            container.innerHTML = `<div class="p-8 text-center text-slate-400 font-medium">No automated insights available yet for this period.</div>`;
            return;
        }

        const typeStyles = {
            win: { border: 'border-emerald-200', bg: 'bg-emerald-50/40', icon: 'solar:medal-ribbons-star-bold-duotone', iconColor: 'text-emerald-600' },
            attention: { border: 'border-amber-200', bg: 'bg-amber-50/40', icon: 'solar:danger-triangle-bold-duotone', iconColor: 'text-amber-600' },
            info: { border: 'border-blue-200', bg: 'bg-blue-50/40', icon: 'solar:info-circle-bold-duotone', iconColor: 'text-blue-600' },
            neutral: { border: 'border-purple-200', bg: 'bg-purple-50/40', icon: 'solar:stars-bold-duotone', iconColor: 'text-purple-600' }
        };

        container.innerHTML = insights.map(i => {
            const st = typeStyles[i.type] || typeStyles.neutral;
            return `
                <div class="p-5 rounded-2xl border ${st.border} ${st.bg} flex items-start gap-4">
                    <div class="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0 ${st.iconColor}">
                        <iconify-icon icon="${st.icon}" width="22"></iconify-icon>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] font-black uppercase tracking-wider text-slate-400">${i.category}</span>
                        </div>
                        <h4 class="text-sm font-bold text-slate-900 mt-0.5">${esc(i.title)}</h4>
                        <p class="text-xs text-slate-600 mt-1 leading-relaxed">${esc(i.message)}</p>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ─────────────────────────────────────────────────────────────
    // SUB-TAB 9: GOALS & FEEDBACK
    // ─────────────────────────────────────────────────────────────

    function renderGoalsTab(data) {
        const empKey = data.employee.email.replace(/[.#$\\[\\]]/g, '_');
        const periodKey = `${data.period.fromDate.getFullYear()}_${data.period.fromDate.getMonth() + 1}`;
        const storageKey = `worksync_monthly_goals_${empKey}_${periodKey}`;

        let saved = {};
        try {
            saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
        } catch (e) { }

        const goalsInput = getEl('mmr-goals-text');
        const selfAssessInput = getEl('mmr-self-assessment-text');
        const managerFeedbackInput = getEl('mmr-manager-feedback-text');

        if (goalsInput) goalsInput.value = saved.goals || '';
        if (selfAssessInput) selfAssessInput.value = saved.selfAssessment || '';
        if (managerFeedbackInput) {
            managerFeedbackInput.value = saved.managerFeedback || '';
            const isAdminOrManager = (typeof window.isAdmin === 'function' && window.isAdmin()) ||
                (typeof window.isManager === 'function' && window.isManager());
            managerFeedbackInput.disabled = !isAdminOrManager;
        }
    }

    window.saveMonthlyGoalsAndFeedback = function () {
        const data = MMR.cachedReportData;
        if (!data) return;

        const empKey = data.employee.email.replace(/[.#$\\[\\]]/g, '_');
        const periodKey = `${data.period.fromDate.getFullYear()}_${data.period.fromDate.getMonth() + 1}`;
        const storageKey = `worksync_monthly_goals_${empKey}_${periodKey}`;

        const payload = {
            goals: getEl('mmr-goals-text')?.value || '',
            selfAssessment: getEl('mmr-self-assessment-text')?.value || '',
            managerFeedback: getEl('mmr-manager-feedback-text')?.value || '',
            updatedAt: Date.now(),
            updatedBy: window.currentUser?.email || ''
        };

        try {
            localStorage.setItem(storageKey, JSON.stringify(payload));
            if (typeof window.toast === 'function') {
                window.toast('Personal goals & self-assessment saved successfully!', 'success');
            } else {
                alert('Saved successfully!');
            }
        } catch (e) {
            console.error('Failed to save monthly goals:', e);
        }
    };

    // ─────────────────────────────────────────────────────────────
    // 7. TASK DETAILS MODAL (SESSION AUDIT TRAIL)
    // ─────────────────────────────────────────────────────────────

    function openTaskDetailModal(taskId) {
        const data = MMR.cachedReportData;
        if (!data) return;

        const task = data.allTasks.find(t => String(t.id).toLowerCase() === String(taskId).toLowerCase());
        if (!task) return;

        const modal = getEl('mmr-task-modal');
        if (!modal) return;

        getEl('mmr-modal-task-id').textContent = task.id;
        getEl('mmr-modal-task-title').textContent = task.desc || task.title;
        getEl('mmr-modal-task-status').textContent = task.status || 'Active';
        getEl('mmr-modal-task-time').textContent = formatHoursMinutes(task.workingTimeSec);
        getEl('mmr-modal-task-sessions-count').textContent = task.workSessionsCount;

        const sessionsList = getEl('mmr-modal-sessions-list');
        if (sessionsList) {
            if (task.workSessions && task.workSessions.length > 0) {
                sessionsList.innerHTML = task.workSessions.map((s, idx) => `
                    <div class="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                        <div>
                            <span class="text-xs font-bold text-slate-800">Session #${idx + 1}</span>
                            <p class="text-[10px] text-slate-400 mt-0.5">${formatDateStr(s.startTime)} • ${formatTimeStr(s.startTime)} - ${formatTimeStr(s.endTime)}</p>
                        </div>
                        <span class="text-xs font-mono font-bold text-purple-700">${formatDurationHMS(getLogDurationSec(s))}</span>
                    </div>
                `).join('');
            } else {
                sessionsList.innerHTML = `<p class="text-xs text-slate-400 text-center py-4">No granular session breakdown recorded.</p>`;
            }
        }

        modal.classList.remove('hidden');
    }

    function closeTaskDetailModal() {
        getEl('mmr-task-modal')?.classList.add('hidden');
    }

    // ─────────────────────────────────────────────────────────────
    // 8. EXPORTING CAPABILITIES (PDF & EXCEL)
    // ─────────────────────────────────────────────────────────────

    function computeClientTimingSummary(data) {
        if (!data) return { clients: [], totalSeconds: 0 };
        const taskMap = new Map();
        (data.allTasks || []).forEach(t => {
            if (t && t.id) taskMap.set(String(t.id).trim().toLowerCase(), t);
        });
        const globalTasks = (typeof window !== 'undefined' && Array.isArray(window.tasks)) ? window.tasks : [];
        globalTasks.forEach(t => {
            if (t && t.id) {
                const key = String(t.id).trim().toLowerCase();
                if (!taskMap.has(key)) taskMap.set(key, t);
            }
        });

        const clientMap = new Map();
        let totalClientSeconds = 0;

        function getClientEntry(cName) {
            const key = cName.toLowerCase();
            if (!clientMap.has(key)) {
                clientMap.set(key, {
                    name: cName,
                    tasks: [],
                    taskIds: new Set(),
                    totalSeconds: 0,
                    sessionsCount: 0,
                    completedCount: 0
                });
            }
            return clientMap.get(key);
        }

        if (Array.isArray(data.periodLogs) && data.periodLogs.length > 0) {
            data.periodLogs.forEach(log => {
                const dur = getLogDurationSec(log);
                if (dur <= 0) return;
                const tId = String(log.taskId || '').trim();
                const task = tId ? taskMap.get(tId.toLowerCase()) : null;
                const cName = resolveClientName(log, task);
                const cObj = getClientEntry(cName);

                cObj.totalSeconds += dur;
                cObj.sessionsCount += 1;
                totalClientSeconds += dur;

                if (task && task.id && !cObj.taskIds.has(task.id)) {
                    cObj.taskIds.add(task.id);
                    cObj.tasks.push(task);
                    if (task.isCompleted) cObj.completedCount++;
                }
            });
        }

        // 2. Incorporate tasks from allTasks (so clients with assigned tasks also appear and counts match)
        (data.allTasks || []).forEach(task => {
            if (!task) return;
            const cName = resolveClientName(null, task);
            const cObj = getClientEntry(cName);

            if (task.id && !cObj.taskIds.has(task.id)) {
                cObj.taskIds.add(task.id);
                cObj.tasks.push(task);
                if (task.isCompleted) cObj.completedCount++;
            }

            // Fallback for periods without raw log streams
            if ((!data.periodLogs || data.periodLogs.length === 0) && (task.workingTimeSec || 0) > 0) {
                cObj.totalSeconds += task.workingTimeSec;
                cObj.sessionsCount += (task.workSessionsCount || 1);
                totalClientSeconds += task.workingTimeSec;
            }
        });

        const list = Array.from(clientMap.values()).map(c => {
            const pct = totalClientSeconds > 0 ? Math.round((c.totalSeconds / totalClientSeconds) * 100) : 0;
            return {
                ...c,
                pct,
                formattedTime: formatDurationHM(c.totalSeconds),
                tasksCount: c.tasks.length
            };
        });
        list.sort((a, b) => b.totalSeconds - a.totalSeconds);
        return { clients: list, totalSeconds: totalClientSeconds };
    }

    function exportReportAsPdf() {
        const data = MMR.cachedReportData;
        if (!data) return;

        const printWin = window.open('', '_blank');
        if (!printWin) {
            alert('Please allow popups to generate the printable PDF.');
            return;
        }

        const k = data.kpis;
        const clientSummary = computeClientTimingSummary(data);
        const insights = generatePersonalAiInsights(data);
        const taskTimingList = [...data.allTasks].sort((a, b) => (b.workingTimeSec || 0) - (a.workingTimeSec || 0));
        const totalTaskSec = k.totalWorkedSeconds || 1;
        const nowStr = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

        // Generate initials for avatar fallback
        const nameParts = (data.employee.name || 'User').trim().split(/\s+/);
        const initials = (nameParts[0][0] + (nameParts.length > 1 ? nameParts[nameParts.length - 1][0] : '')).toUpperCase();

        function renderHeader(pageNum, sectionName) {
            return `
                <div class="flex items-center justify-between border-b border-slate-200 pb-2 mb-4">
                    <div class="flex items-center gap-2">
                        <span class="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block"></span>
                        <span class="text-[11px] font-black tracking-wider uppercase text-slate-800">VilPower OneDesk</span>
                        <span class="text-[11px] text-slate-300 font-bold">•</span>
                        <span class="text-[11px] font-bold text-purple-700 uppercase tracking-wide">Monthly Performance Statement</span>
                        <span class="text-[11px] text-slate-300 font-bold">•</span>
                        <span class="text-[11px] font-medium text-slate-500">${esc(sectionName)}</span>
                    </div>
                    <div class="text-[10px] font-bold text-slate-500">
                        ${esc(data.employee.name)} • ${esc(data.period.periodLabel)}
                    </div>
                </div>
            `;
        }

        function renderFooter(pageNum) {
            return `
                <div class="flex items-center justify-between border-t border-slate-200 pt-2.5 mt-4 text-[9px] text-slate-400 font-medium">
                    <span>Generated on ${nowStr} • OneDesk Reporting Engine</span>
                    <span class="tracking-wide uppercase font-semibold text-slate-500">VilPower Digital Operations • Confidential</span>
                    <span class="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">Page ${pageNum} of 7</span>
                </div>
            `;
        }

        printWin.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Monthly Performance Report - ${esc(data.employee.name)} - ${esc(data.period.periodLabel)}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @page {
            size: A4 portrait;
            margin: 10mm 12mm 12mm 12mm;
        }
        @media print {
            body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            .page-break {
                page-break-after: always !important;
                break-after: page !important;
            }
            .no-print {
                display: none !important;
            }
            table {
                page-break-inside: auto;
            }
            tr {
                page-break-inside: avoid;
                page-break-after: auto;
            }
            thead {
                display: table-header-group;
            }
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            -webkit-font-smoothing: antialiased;
        }
        .print-page {
            min-height: 268mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            box-sizing: border-box;
            padding: 4px 0;
        }
        .print-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
        }
    </style>
</head>
<body class="bg-white text-slate-900 p-2">

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- PAGE 1: EXECUTIVE OVERVIEW & SCORECARD (SUBTAB 1)            -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <div class="print-page page-break">
        <div>
            ${renderHeader(1, 'Executive Overview & Scorecard')}

            <!-- Profile Banner Card -->
            <div class="p-4 bg-gradient-to-r from-purple-50/70 via-indigo-50/40 to-slate-50 border border-purple-100 rounded-xl mb-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3.5">
                        ${data.employee.avatar ? `
                            <img src="${esc(data.employee.avatar)}" alt="${esc(data.employee.name)}" class="w-13 h-13 rounded-xl object-cover ring-2 ring-purple-300">
                        ` : `
                            <div class="w-13 h-13 rounded-xl bg-purple-600 text-white font-black text-lg flex items-center justify-center ring-2 ring-purple-300">
                                ${initials}
                            </div>
                        `}
                        <div>
                            <div class="flex items-center gap-2">
                                <h1 class="text-lg font-black text-slate-900">${esc(data.employee.name)}</h1>
                                <span class="px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full bg-purple-100 text-purple-700 tracking-wider">${esc(data.employee.department)}</span>
                            </div>
                            <p class="text-xs text-slate-600 font-semibold mt-0.5">${esc(data.employee.designation)}</p>
                            <p class="text-[11px] text-slate-400 font-mono">${esc(data.employee.email)}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <span class="inline-block px-2.5 py-1 text-[10px] font-extrabold rounded-lg bg-emerald-100 text-emerald-800 tracking-wide uppercase">${esc(data.period.statusText)}</span>
                        <p class="text-xs font-black text-purple-700 mt-1">${esc(data.period.periodLabel)}</p>
                        <p class="text-[10px] text-slate-500 font-medium">Reporting Range: ${Engine.formatLocalDate(data.period.fromDate)} to ${Engine.formatLocalDate(data.period.toDate)}</p>
                    </div>
                </div>
            </div>

            <!-- 12 Executive KPI Cards Grid (4x3) -->
            <div class="mb-4">
                <h2 class="text-xs font-black text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <span class="w-1.5 h-3.5 bg-purple-600 rounded-sm inline-block"></span>
                    Monthly Executive Performance Scorecard (12 Key Indicators)
                </h2>
                <div class="grid grid-cols-4 gap-2.5">
                    <!-- KPI 1 -->
                    <div class="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Assigned Tasks</span>
                        <div class="text-xl font-black text-slate-900 mt-0.5">${k.totalAssigned}</div>
                        <span class="text-[9px] font-medium text-slate-500">${k.jiraAssigned} Jira + ${k.internalAssigned} Internal</span>
                    </div>
                    <!-- KPI 2 -->
                    <div class="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                        <span class="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block">Jira Deliverables</span>
                        <div class="text-xl font-black text-indigo-700 mt-0.5">${k.jiraAssigned}</div>
                        <span class="text-[9px] font-medium text-slate-500">Client deliverables</span>
                    </div>
                    <!-- KPI 3 -->
                    <div class="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                        <span class="text-[9px] font-bold text-fuchsia-400 uppercase tracking-wider block">Internal Tasks</span>
                        <div class="text-xl font-black text-fuchsia-700 mt-0.5">${k.internalAssigned}</div>
                        <span class="text-[9px] font-medium text-slate-500">Learning, admin, meetings</span>
                    </div>
                    <!-- KPI 4 -->
                    <div class="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                        <span class="text-[9px] font-bold text-emerald-500 uppercase tracking-wider block">Completed Tasks</span>
                        <div class="text-xl font-black text-emerald-600 mt-0.5">${k.completed}</div>
                        <span class="text-[9px] font-medium text-emerald-700">${k.deliveryScore}% on-time completion</span>
                    </div>
                    <!-- KPI 5 -->
                    <div class="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                        <span class="text-[9px] font-bold text-amber-500 uppercase tracking-wider block">Pending Tasks</span>
                        <div class="text-xl font-black text-amber-600 mt-0.5">${k.pending}</div>
                        <span class="text-[9px] font-medium text-slate-500">${k.inProgress} currently in-progress</span>
                    </div>
                    <!-- KPI 6 -->
                    <div class="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                        <span class="text-[9px] font-bold text-blue-500 uppercase tracking-wider block">In-Progress Tasks</span>
                        <div class="text-xl font-black text-blue-600 mt-0.5">${k.inProgress}</div>
                        <span class="text-[9px] font-medium text-slate-500">Active work in pipeline</span>
                    </div>
                    <!-- KPI 7 -->
                    <div class="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                        <span class="text-[9px] font-bold text-rose-500 uppercase tracking-wider block">Rework Deliverables</span>
                        <div class="text-xl font-black text-rose-600 mt-0.5">${k.rework}</div>
                        <span class="text-[9px] font-medium text-slate-500">${data.rework.totalOccurrences} total rework loops</span>
                    </div>
                    <!-- KPI 8 -->
                    <div class="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                        <span class="text-[9px] font-bold text-purple-500 uppercase tracking-wider block">Total Working Hours</span>
                        <div class="text-xl font-black text-purple-700 mt-0.5">${k.totalWorkingHours}h</div>
                        <span class="text-[9px] font-medium text-purple-700">${k.utilizationPct}% work utilization</span>
                    </div>
                    <!-- KPI 9 -->
                    <div class="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                        <span class="text-[9px] font-bold text-teal-500 uppercase tracking-wider block">Attendance Days</span>
                        <div class="text-xl font-black text-teal-700 mt-0.5">${k.attendanceDays} / ${k.totalWorkingDays}</div>
                        <span class="text-[9px] font-medium text-slate-500">${k.absentDays} absent, ${k.lateCheckIns} late</span>
                    </div>
                    <!-- KPI 10 -->
                    <div class="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                        <span class="text-[9px] font-bold text-orange-500 uppercase tracking-wider block">Total Break Time</span>
                        <div class="text-xl font-black text-orange-600 mt-0.5">${k.totalBreakFormatted}</div>
                        <span class="text-[9px] font-medium text-slate-500">Avg ${k.avgDailyBreakMins}m / present day</span>
                    </div>
                    <!-- KPI 11 -->
                    <div class="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                        <span class="text-[9px] font-bold text-violet-500 uppercase tracking-wider block">QC Quality Score</span>
                        <div class="text-xl font-black text-violet-700 mt-0.5">${k.qcScore !== null ? `${k.qcScore}%` : '100%'}</div>
                        <span class="text-[9px] font-medium text-slate-500">Avg rating ${data.qc.avgRating || '5.0'}/5.0</span>
                    </div>
                    <!-- KPI 12 -->
                    <div class="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                        <span class="text-[9px] font-bold text-emerald-500 uppercase tracking-wider block">On-Time Delivery</span>
                        <div class="text-xl font-black text-emerald-700 mt-0.5">${k.deliveryScore}%</div>
                        <span class="text-[9px] font-medium text-slate-500">Schedule adherence rate</span>
                    </div>
                </div>
            </div>

            <!-- Executive Performance Highlights Summary -->
            <div>
                <h2 class="text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span class="w-1.5 h-3.5 bg-indigo-600 rounded-sm inline-block"></span>
                    Monthly Executive Performance Highlights
                </h2>
                <div class="grid grid-cols-3 gap-3">
                    <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span class="text-[11px] font-black text-slate-800">Operational Velocity</span>
                        </div>
                        <p class="text-[10px] text-slate-600 leading-relaxed">
                            Completed <strong>${k.completed}</strong> assignments out of <strong>${k.totalAssigned}</strong> assigned deliverables with an active working investment of <strong>${k.totalWorkingHours} hours</strong>.
                        </p>
                    </div>
                    <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="w-2 h-2 rounded-full bg-purple-500"></span>
                            <span class="text-[11px] font-black text-slate-800">Quality Benchmark</span>
                        </div>
                        <p class="text-[10px] text-slate-600 leading-relaxed">
                            Maintained a <strong>${k.qcScore !== null ? `${k.qcScore}%` : '100%'}</strong> checklist review score across <strong>${data.qc.totalSubmissions}</strong> formal inspections, upholding deliverable standards.
                        </p>
                    </div>
                    <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
                            <span class="text-[11px] font-black text-slate-800">Punctuality & Presence</span>
                        </div>
                        <p class="text-[10px] text-slate-600 leading-relaxed">
                            Reported present for <strong>${k.attendanceDays}</strong> days with <strong>${k.lateCheckIns}</strong> late log-ins and an average daily working focus of <strong>${k.avgDailyWorkHours} hours</strong>.
                        </p>
                    </div>
                </div>
            </div>
        </div>
        ${renderFooter(1)}
    </div>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- PAGE 2: JIRA CLIENT DELIVERABLES (SUBTAB 2)                  -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <div class="print-page page-break">
        <div>
            ${renderHeader(2, 'Jira Tasks')}
            <div class="flex items-center justify-between mb-3">
                <div>
                    <h2 class="text-sm font-black text-slate-900 uppercase tracking-wide">Jira Client Deliverables</h2>
                    <p class="text-[10px] text-slate-500">Client-facing production assignments, external deliverables, deadlines, and working times</p>
                </div>
                <span class="px-2.5 py-1 text-xs font-black rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                    ${data.jiraTasks.length} Deliverables
                </span>
            </div>

            <table class="w-full text-left text-[10px] border border-slate-200 rounded-lg overflow-hidden">
                <thead class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                        <th class="p-2 w-20">Issue ID</th>
                        <th class="p-2">Task Title & Client</th>
                        <th class="p-2 w-16 text-center">Priority</th>
                        <th class="p-2 w-20 text-center">Due Date</th>
                        <th class="p-2 w-24 text-center">Status</th>
                        <th class="p-2 w-20 text-right">Logged Time</th>
                        <th class="p-2 w-14 text-center">Sessions</th>
                        <th class="p-2 w-14 text-center">Rework</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    ${data.jiraTasks.length === 0 ? `
                        <tr><td colspan="8" class="p-6 text-center text-slate-400 font-medium">No Jira client tasks recorded for this period.</td></tr>
                    ` : data.jiraTasks.map((t, idx) => `
                        <tr class="${idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}">
                            <td class="p-2 font-mono font-bold text-indigo-700">${esc(t.id)}</td>
                            <td class="p-2">
                                <div class="font-bold text-slate-900 leading-tight">${esc(t.desc || t.title)}</div>
                                <div class="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">${esc(t.client || 'Client Deliverable')}</div>
                            </td>
                            <td class="p-2 text-center">
                                <span class="px-1.5 py-0.5 rounded text-[9px] font-bold ${String(t.priority).toLowerCase() === 'high' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'}">
                                    ${esc(t.priority || 'Medium')}
                                </span>
                            </td>
                            <td class="p-2 text-center text-slate-600 font-mono text-[9px]">${formatDateStr(t.dueDate || t.duedate)}</td>
                            <td class="p-2 text-center">
                                <span class="px-2 py-0.5 rounded-full text-[9px] font-bold ${t.isCompleted ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-blue-50 text-blue-700 border border-blue-100'}">
                                    ${esc(t.status || 'Active')}
                                </span>
                            </td>
                            <td class="p-2 text-right font-mono font-bold text-slate-900">${formatDurationHMS(t.workingTimeSec)}</td>
                            <td class="p-2 text-center text-slate-600 font-semibold">${t.workSessionsCount || 0}</td>
                            <td class="p-2 text-center font-bold ${t.reworkCount > 0 ? 'text-rose-600' : 'text-slate-400'}">${t.reworkCount || 0}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ${renderFooter(2)}
    </div>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- PAGE 3: INTERNAL & OPERATIONAL TASKS (SUBTAB 3)              -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <div class="print-page page-break">
        <div>
            ${renderHeader(3, 'Internal Tasks')}
            <div class="flex items-center justify-between mb-3">
                <div>
                    <h2 class="text-sm font-black text-slate-900 uppercase tracking-wide">Internal & Learning Tasks</h2>
                    <p class="text-[10px] text-slate-500">Organizational workflows, design system upgrades, learning tasks, and department meetings</p>
                </div>
                <span class="px-2.5 py-1 text-xs font-black rounded-lg bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-100">
                    ${data.internalTasks.length} Internal Tasks
                </span>
            </div>

            <table class="w-full text-left text-[10px] border border-slate-200 rounded-lg overflow-hidden">
                <thead class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                        <th class="p-2 w-28">Task ID</th>
                        <th class="p-2">Task Title & Category</th>
                        <th class="p-2 w-20 text-center">Priority</th>
                        <th class="p-2 w-28 text-center">Status</th>
                        <th class="p-2 w-24 text-right">Working Time</th>
                        <th class="p-2 w-16 text-center">Sessions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    ${data.internalTasks.length === 0 ? `
                        <tr><td colspan="6" class="p-6 text-center text-slate-400 font-medium">No internal tasks recorded for this period.</td></tr>
                    ` : data.internalTasks.map((t, idx) => `
                        <tr class="${idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}">
                            <td class="p-2 font-mono font-bold text-fuchsia-700">${esc(t.id)}</td>
                            <td class="p-2">
                                <div class="font-bold text-slate-900 leading-tight">${esc(t.desc || t.title)}</div>
                                <div class="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">${esc(t.client || 'Internal Operations')}</div>
                            </td>
                            <td class="p-2 text-center">
                                <span class="px-1.5 py-0.5 rounded text-[9px] font-bold ${String(t.priority).toLowerCase() === 'high' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'}">
                                    ${esc(t.priority || 'Medium')}
                                </span>
                            </td>
                            <td class="p-2 text-center">
                                <span class="px-2 py-0.5 rounded-full text-[9px] font-bold ${t.isCompleted ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}">
                                    ${esc(t.status || 'Active')}
                                </span>
                            </td>
                            <td class="p-2 text-right font-mono font-bold text-slate-900">${formatDurationHMS(t.workingTimeSec)}</td>
                            <td class="p-2 text-center text-slate-600 font-semibold">${t.workSessionsCount || 0}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ${renderFooter(3)}
    </div>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- PAGE 4: TASK & CLIENT TIMING BREAKDOWN (SUBTABS 4 & 5)       -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <div class="print-page page-break">
        <div>
            ${renderHeader(4, 'Timing Breakdown')}

            <!-- Subtab 4: Task-Wise Timing -->
            <div class="mb-5">
                <div class="flex items-center justify-between mb-2">
                    <div>
                        <h2 class="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                            <span class="w-1.5 h-3.5 bg-purple-600 rounded-sm inline-block"></span>
                            Task-Wise Timing Distribution (Top Tasks Ranked by Working Time)
                        </h2>
                    </div>
                    <span class="text-[10px] text-slate-400 font-medium">Total: ${k.totalWorkingHours} Hours</span>
                </div>
                <table class="w-full text-left text-[9px] border border-slate-200 rounded-lg overflow-hidden">
                    <thead class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                            <th class="p-2">Task Title & ID</th>
                            <th class="p-2 w-16 text-center">Type</th>
                            <th class="p-2 w-14 text-center">Sessions</th>
                            <th class="p-2 w-20 text-right">Logged Time</th>
                            <th class="p-2 w-16 text-right">Time Share</th>
                            <th class="p-2 w-20 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${taskTimingList.slice(0, 10).map((t, idx) => {
                            const isInternal = t.manual || t.taskType === 'internal';
                            const sharePct = Math.round(((t.workingTimeSec || 0) / totalTaskSec) * 100);
                            return `
                                <tr class="${idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}">
                                    <td class="p-1.5">
                                        <div class="font-bold text-slate-900 truncate max-w-xs">${esc(t.desc || t.title)}</div>
                                        <div class="font-mono text-[8px] text-purple-700">${esc(t.id)}</div>
                                    </td>
                                    <td class="p-1.5 text-center">
                                        <span class="px-1.5 py-0.5 rounded text-[8px] font-bold ${isInternal ? 'bg-fuchsia-50 text-fuchsia-700' : 'bg-indigo-50 text-indigo-700'}">
                                            ${isInternal ? 'Internal' : 'Jira'}
                                        </span>
                                    </td>
                                    <td class="p-1.5 text-center font-semibold text-slate-600">${t.workSessionsCount || 0}</td>
                                    <td class="p-1.5 text-right font-mono font-bold text-slate-900">${formatDurationHMS(t.workingTimeSec)}</td>
                                    <td class="p-1.5 text-right font-bold text-purple-700">${sharePct}%</td>
                                    <td class="p-1.5 text-center">
                                        <span class="px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-100 text-slate-700">${esc(t.status || 'Active')}</span>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Subtab 5: Client-Wise Timing -->
            <div>
                <div class="flex items-center justify-between mb-2">
                    <div>
                        <h2 class="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                            <span class="w-1.5 h-3.5 bg-indigo-600 rounded-sm inline-block"></span>
                            Client-Wise Timing Breakdown (Account Allocation)
                        </h2>
                    </div>
                    <span class="text-[10px] text-slate-400 font-medium">${clientSummary.clients.length} Client Accounts</span>
                </div>
                <table class="w-full text-left text-[9px] border border-slate-200 rounded-lg overflow-hidden">
                    <thead class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                            <th class="p-2">Client / Account Name</th>
                            <th class="p-2 w-24 text-center">Deliverables</th>
                            <th class="p-2 w-20 text-center">Sessions</th>
                            <th class="p-2 w-24 text-right">Logged Time</th>
                            <th class="p-2 w-28 text-right">Allocation Share</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${clientSummary.clients.length === 0 ? `
                            <tr><td colspan="5" class="p-4 text-center text-slate-400 font-medium">No client timing data recorded.</td></tr>
                        ` : clientSummary.clients.map((c, idx) => `
                            <tr class="${idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}">
                                <td class="p-1.5 font-bold text-slate-900">${esc(c.name)}</td>
                                <td class="p-1.5 text-center font-semibold text-slate-600">${c.tasksCount} tasks</td>
                                <td class="p-1.5 text-center text-slate-500">${c.sessionsCount} sessions</td>
                                <td class="p-1.5 text-right font-mono font-bold text-slate-900">${c.formattedTime}</td>
                                <td class="p-1.5 text-right">
                                    <span class="px-2 py-0.5 rounded text-[8px] font-black bg-indigo-50 text-indigo-700 border border-indigo-100">${c.pct}%</span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        ${renderFooter(4)}
    </div>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- PAGE 5: QC QUALITY & REWORK / REVISIONS (SUBTABS 6 & 7)       -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <div class="print-page page-break">
        <div>
            ${renderHeader(5, 'QC Quality & Rework')}

            <!-- Subtab 6: QC Quality -->
            <div class="mb-4">
                <div class="flex items-center justify-between mb-2">
                    <h2 class="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                        <span class="w-1.5 h-3.5 bg-violet-600 rounded-sm inline-block"></span>
                        Quality Control (QC) Performance Scorecard
                    </h2>
                </div>

                <!-- Mini Scorecard -->
                <div class="grid grid-cols-4 gap-2 mb-3">
                    <div class="p-2.5 bg-violet-50/50 border border-violet-100 rounded-lg text-center">
                        <span class="text-[8px] font-bold text-violet-500 uppercase block">Average QC Score</span>
                        <span class="text-lg font-black text-violet-700">${data.qc.avgScore !== null ? `${data.qc.avgScore}%` : '100%'}</span>
                    </div>
                    <div class="p-2.5 bg-emerald-50/50 border border-emerald-100 rounded-lg text-center">
                        <span class="text-[8px] font-bold text-emerald-500 uppercase block">First-Pass Rate</span>
                        <span class="text-lg font-black text-emerald-700">${data.qc.passPct !== null ? `${data.qc.passPct}%` : '100%'}</span>
                    </div>
                    <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
                        <span class="text-[8px] font-bold text-slate-500 uppercase block">Submissions</span>
                        <span class="text-lg font-black text-slate-800">${data.qc.totalSubmissions}</span>
                    </div>
                    <div class="p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-lg text-center">
                        <span class="text-[8px] font-bold text-indigo-500 uppercase block">Reviewer Rating</span>
                        <span class="text-lg font-black text-indigo-700">${data.qc.avgRating || '5.0'} / 5.0</span>
                    </div>
                </div>

                <!-- QC Submissions / Failures Log -->
                <table class="w-full text-left text-[9px] border border-slate-200 rounded-lg overflow-hidden">
                    <thead class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                            <th class="p-1.5 w-18">Task ID</th>
                            <th class="p-1.5">Deliverable Title</th>
                            <th class="p-1.5 w-20">Date</th>
                            <th class="p-1.5 w-24">Reviewer</th>
                            <th class="p-1.5 w-24">Mistake Theme</th>
                            <th class="p-1.5">Required Corrections</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${data.qc.failedDetails.length === 0 ? `
                            <tr><td colspan="6" class="p-3 text-center text-slate-400 font-medium">Zero recorded QC rejections in this period. Outstanding quality standards maintained!</td></tr>
                        ` : data.qc.failedDetails.slice(0, 5).map((f, idx) => `
                            <tr class="${idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}">
                                <td class="p-1.5 font-mono font-bold text-purple-700">${esc(f.taskId)}</td>
                                <td class="p-1.5 font-bold text-slate-900">${esc(f.taskName)}</td>
                                <td class="p-1.5 text-slate-500 font-mono">${f.submissionDate}</td>
                                <td class="p-1.5 text-slate-700 font-semibold">${esc(f.reviewer)}</td>
                                <td class="p-1.5">
                                    <span class="px-1.5 py-0.5 rounded text-[8px] font-bold bg-rose-50 text-rose-700 border border-rose-100">${esc(f.failureCategory)}</span>
                                </td>
                                <td class="p-1.5 text-slate-600">${esc(f.requiredCorrections)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Subtab 7: Rework & Revisions -->
            <div>
                <div class="flex items-center justify-between mb-2">
                    <h2 class="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                        <span class="w-1.5 h-3.5 bg-rose-600 rounded-sm inline-block"></span>
                        Rework & Revision Analysis
                    </h2>
                </div>

                <div class="grid grid-cols-4 gap-2 mb-3">
                    <div class="p-2.5 bg-rose-50/50 border border-rose-100 rounded-lg text-center">
                        <span class="text-[8px] font-bold text-rose-500 uppercase block">Rework Tasks</span>
                        <span class="text-lg font-black text-rose-700">${data.rework.totalTasks}</span>
                    </div>
                    <div class="p-2.5 bg-amber-50/50 border border-amber-100 rounded-lg text-center">
                        <span class="text-[8px] font-bold text-amber-500 uppercase block">Total Rework Loops</span>
                        <span class="text-lg font-black text-amber-700">${data.rework.totalOccurrences}</span>
                    </div>
                    <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
                        <span class="text-[8px] font-bold text-slate-500 uppercase block">QC Internal Flags</span>
                        <span class="text-lg font-black text-slate-800">${data.rework.internalQcRework}</span>
                    </div>
                    <div class="p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-lg text-center">
                        <span class="text-[8px] font-bold text-indigo-500 uppercase block">Client Revisions</span>
                        <span class="text-lg font-black text-indigo-700">${data.rework.clientRevisions}</span>
                    </div>
                </div>

                <table class="w-full text-left text-[9px] border border-slate-200 rounded-lg overflow-hidden">
                    <thead class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                            <th class="p-1.5 w-20">Task ID</th>
                            <th class="p-1.5">Deliverable Title</th>
                            <th class="p-1.5 w-20 text-center">Rework Loops</th>
                            <th class="p-1.5 w-24 text-center">Current Status</th>
                            <th class="p-1.5 w-24 text-right">Logged Effort</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${data.rework.reworkTaskList.length === 0 ? `
                            <tr><td colspan="5" class="p-3 text-center text-slate-400 font-medium">Zero rework loops recorded during this period.</td></tr>
                        ` : data.rework.reworkTaskList.slice(0, 5).map((t, idx) => `
                            <tr class="${idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}">
                                <td class="p-1.5 font-mono font-bold text-purple-700">${esc(t.id)}</td>
                                <td class="p-1.5 font-bold text-slate-900">${esc(t.desc || t.title)}</td>
                                <td class="p-1.5 text-center font-bold text-rose-600">${t.reworkCount || 1} loops</td>
                                <td class="p-1.5 text-center">
                                    <span class="px-2 py-0.5 rounded text-[8px] font-bold bg-slate-100 text-slate-700">${esc(t.status || 'Active')}</span>
                                </td>
                                <td class="p-1.5 text-right font-mono font-bold text-slate-900">${formatDurationHMS(t.workingTimeSec)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        ${renderFooter(5)}
    </div>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- PAGE 6: ATTENDANCE, SHIFTS & BREAKS (SUBTABS 8 & 9)           -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <div class="print-page page-break">
        <div>
            ${renderHeader(6, 'Attendance & Breaks')}
            <div class="mb-3">
                <h2 class="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                    <span class="w-1.5 h-3.5 bg-teal-600 rounded-sm inline-block"></span>
                    Attendance, Working Hours & Shift Distribution
                </h2>

                <!-- Metrics Grid -->
                <div class="grid grid-cols-6 gap-2 mb-3">
                    <div class="p-2 bg-teal-50 border border-teal-100 rounded-lg text-center">
                        <span class="text-[8px] font-bold text-teal-600 uppercase block">Present Days</span>
                        <span class="text-base font-black text-teal-800">${k.attendanceDays} / ${k.totalWorkingDays}</span>
                    </div>
                    <div class="p-2 bg-rose-50 border border-rose-100 rounded-lg text-center">
                        <span class="text-[8px] font-bold text-rose-600 uppercase block">Absent Days</span>
                        <span class="text-base font-black text-rose-800">${k.absentDays}</span>
                    </div>
                    <div class="p-2 bg-amber-50 border border-amber-100 rounded-lg text-center">
                        <span class="text-[8px] font-bold text-amber-600 uppercase block">Late Log-ins</span>
                        <span class="text-base font-black text-amber-800">${k.lateCheckIns}</span>
                    </div>
                    <div class="p-2 bg-purple-50 border border-purple-100 rounded-lg text-center">
                        <span class="text-[8px] font-bold text-purple-600 uppercase block">Total Break</span>
                        <span class="text-base font-black text-purple-800">${k.totalBreakFormatted}</span>
                    </div>
                    <div class="p-2 bg-blue-50 border border-blue-100 rounded-lg text-center">
                        <span class="text-[8px] font-bold text-blue-600 uppercase block">Avg Daily Break</span>
                        <span class="text-base font-black text-blue-800">${k.avgDailyBreakMins}m</span>
                    </div>
                    <div class="p-2 bg-slate-50 border border-slate-200 rounded-lg text-center">
                        <span class="text-[8px] font-bold text-slate-500 uppercase block">Longest Break</span>
                        <span class="text-base font-black text-slate-800">${Math.round(k.longestBreakSec / 60)}m</span>
                    </div>
                </div>

                <!-- Attendance Day-by-Day Table -->
                <table class="w-full text-left text-[9px] border border-slate-200 rounded-lg overflow-hidden">
                    <thead class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                            <th class="p-1.5 w-24">Date</th>
                            <th class="p-1.5 w-20">Day</th>
                            <th class="p-1.5 w-24 text-center">First In</th>
                            <th class="p-1.5 w-24 text-center">Last Out</th>
                            <th class="p-1.5 w-24 text-right">Working Time</th>
                            <th class="p-1.5 w-24 text-right">Break Duration</th>
                            <th class="p-1.5 w-24 text-center">Day Status</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${Object.values(data.dailyAttendanceMap).length === 0 ? `
                            <tr><td colspan="7" class="p-4 text-center text-slate-400 font-medium">No attendance records found for this period.</td></tr>
                        ` : Object.values(data.dailyAttendanceMap).slice(0, 18).map((day, idx) => {
                            const dObj = new Date(day.date + 'T00:00:00');
                            const dayName = isNaN(dObj.getTime()) ? '' : dObj.toLocaleDateString('en-US', { weekday: 'short' });
                            const inTime = day.checkIns.length > 0 ? formatTimeStr(day.checkIns[0]) : '—';
                            const outTime = day.checkOuts.length > 0 ? formatTimeStr(day.checkOuts[day.checkOuts.length - 1]) : '—';
                            return `
                                <tr class="${idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}">
                                    <td class="p-1 font-mono font-bold text-slate-800">${day.date}</td>
                                    <td class="p-1 font-semibold text-slate-500">${dayName}</td>
                                    <td class="p-1 text-center font-mono text-slate-700">${inTime}</td>
                                    <td class="p-1 text-center font-mono text-slate-700">${outTime}</td>
                                    <td class="p-1 text-right font-mono font-bold text-purple-700">${formatDurationHM(day.totalWorkSec)}</td>
                                    <td class="p-1 text-right font-mono text-slate-600">${formatDurationHM(day.totalBreakSec)}</td>
                                    <td class="p-1 text-center">
                                        <span class="px-2 py-0.5 rounded text-[8px] font-bold ${day.isLate ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}">
                                            ${day.isLate ? 'Late In' : 'Present'}
                                        </span>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        ${renderFooter(6)}
    </div>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- PAGE 7: AI INSIGHTS, GOALS & APPRAISAL (SUBTABS 10 & 11)     -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <div class="print-page">
        <div>
            ${renderHeader(7, 'Insights & Assessment')}

            <!-- Subtab 10: AI Performance Insights -->
            <div class="mb-4">
                <h2 class="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5 mb-2.5">
                    <span class="w-1.5 h-3.5 bg-purple-600 rounded-sm inline-block"></span>
                    AI Personal Performance Insights (Data-Driven Evaluation)
                </h2>
                <div class="space-y-2">
                    ${insights.map(item => `
                        <div class="p-2.5 rounded-lg border ${item.type === 'win' ? 'bg-emerald-50/60 border-emerald-200' : (item.type === 'attention' ? 'bg-rose-50/60 border-rose-200' : 'bg-slate-50 border-slate-200')}">
                            <div class="flex items-center gap-1.5 mb-0.5">
                                <span class="px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${item.type === 'win' ? 'bg-emerald-200 text-emerald-900' : (item.type === 'attention' ? 'bg-rose-200 text-rose-900' : 'bg-slate-200 text-slate-800')}">${esc(item.category)}</span>
                                <h3 class="text-[11px] font-black text-slate-900">${esc(item.title)}</h3>
                            </div>
                            <p class="text-[10px] text-slate-600 leading-snug">${esc(item.message)}</p>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Subtab 11: Goals & Assessment -->
            <div class="mb-5">
                <h2 class="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                    <span class="w-1.5 h-3.5 bg-indigo-600 rounded-sm inline-block"></span>
                    Monthly Deliverables, OKRs & Professional Growth
                </h2>
                <div class="grid grid-cols-2 gap-3 text-[10px]">
                    <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <div class="font-black text-slate-800 uppercase text-[9px] mb-1 text-purple-700">Production Deliverables Target</div>
                        <p class="text-slate-600 leading-relaxed">
                            Completed <strong>${k.completed}</strong> client and internal deliverables with <strong>${k.deliveryScore}%</strong> on-time turnaround. Active backlog stands at <strong>${k.pending}</strong> deliverables in delivery pipeline.
                        </p>
                    </div>
                    <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <div class="font-black text-slate-800 uppercase text-[9px] mb-1 text-indigo-700">Quality & Skill Development</div>
                        <p class="text-slate-600 leading-relaxed">
                            Logged <strong>${k.internalAssigned}</strong> skill acquisition and internal assignments with zero critical defects. First-pass QC score registered at <strong>${data.qc.passPct || 100}%</strong>.
                        </p>
                    </div>
                </div>
            </div>

            <!-- Formal Appraisal & Sign-off Section -->
            <div class="border-t border-slate-200 pt-3">
                <h2 class="text-xs font-black text-slate-800 uppercase tracking-wide mb-3">
                    Formal Monthly Performance Review & Appraisal Sign-Off
                </h2>
                <div class="grid grid-cols-2 gap-6 pt-2">
                    <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-8">Employee Self-Acknowledgment</p>
                        <div class="border-t border-dashed border-slate-300 pt-2 flex items-center justify-between">
                            <div>
                                <p class="text-[11px] font-black text-slate-800">${esc(data.employee.name)}</p>
                                <p class="text-[9px] text-slate-400">${esc(data.employee.designation)}</p>
                            </div>
                            <span class="text-[9px] text-slate-400 font-mono">Date: ____________</span>
                        </div>
                    </div>
                    <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-8">Reviewing Manager / Operations Admin</p>
                        <div class="border-t border-dashed border-slate-300 pt-2 flex items-center justify-between">
                            <div>
                                <p class="text-[11px] font-black text-slate-800">VilPower Operations Reviewer</p>
                                <p class="text-[9px] text-slate-400">Creative Delivery & Operations Management</p>
                            </div>
                            <span class="text-[9px] text-slate-400 font-mono">Date: ____________</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        ${renderFooter(7)}
    </div>

    <script>
        window.onload = function() {
            setTimeout(function() {
                try {
                    window.focus();
                    window.print();
                } catch(e) {
                    console.warn('[OneDeskPrint] Print preview:', e);
                }
            }, 750);
        };
    </script>
</body>
</html>`);
        printWin.document.close();
    }

    function exportDetailedTaskReportExcel() {
        const data = MMR.cachedReportData;
        if (!data) return;

        let csvContent = 'data:text/csv;charset=utf-8,';
        csvContent += 'Task ID,Source,Title,Client,Priority,Status,Created Date,Due Date,Working Time (HMS),Working Seconds,Work Sessions,Rework Count\n';

        data.allTasks.forEach(t => {
            const source = t.manual || t.taskType === 'internal' ? 'Internal' : 'Jira';
            const cleanTitle = `"${(t.desc || t.title || '').replace(/"/g, '""')}"`;
            const cleanClient = `"${(t.client || '').replace(/"/g, '""')}"`;
            csvContent += `${t.id},${source},${cleanTitle},${cleanClient},${t.priority || 'Medium'},${t.status || 'Active'},${t.created || ''},${t.duedate || ''},${formatDurationHMS(t.workingTimeSec)},${t.workingTimeSec},${t.workSessionsCount},${t.reworkCount || 0}\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `Monthly_Tasks_${data.employee.email}_${data.period.periodLabel.replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function exportAttendanceReportCsv() {
        const data = MMR.cachedReportData;
        if (!data) return;

        let csvContent = 'data:text/csv;charset=utf-8,';
        csvContent += 'Date,First Check In,Last Check Out,Attendance Duration (HMS),Working Duration (HMS),Break Duration (HMS),Status\n';

        Object.keys(data.dailyAttendanceMap).sort().forEach(dStr => {
            const day = data.dailyAttendanceMap[dStr];
            csvContent += `${dStr},${formatTimeStr(day.checkIns[0])},${formatTimeStr(day.checkOuts[day.checkOuts.length - 1])},${formatDurationHMS(day.attendanceSec)},${formatDurationHMS(day.totalWorkSec)},${formatDurationHMS(day.totalBreakSec)},${day.status}\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `Monthly_Attendance_${data.employee.email}_${data.period.periodLabel.replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function exportQcFailureReportCsv() {
        const data = MMR.cachedReportData;
        if (!data) return;

        let csvContent = 'data:text/csv;charset=utf-8,';
        csvContent += 'Task ID,Task Name,Submission Date,Reviewer,Failure Category,Failure Reason,Required Corrections\n';

        data.qc.failedDetails.forEach(f => {
            csvContent += `${f.taskId},"${(f.taskName || '').replace(/"/g, '""')}",${f.submissionDate},"${f.reviewer}","${f.failureCategory}","${(f.failureReason || '').replace(/"/g, '""')}","${(f.requiredCorrections || '').replace(/"/g, '""')}"\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `Monthly_QC_Failures_${data.employee.email}_${data.period.periodLabel.replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }


    // ─────────────────────────────────────────────────────────────
    // 8B. ACTIVE FILTER SUMMARY & CLIENT-WISE TIMING
    // ─────────────────────────────────────────────────────────────

    function renderActiveFilterSummary(data) {
        const bar = getEl('mmr-active-filter-summary-bar');
        if (!bar) return;

        const p = data.period;
        const emp = data.employee;

        const startDateStr = Engine.formatLocalDate(p.fromDate);
        const endDateStr = Engine.formatLocalDate(p.toDate);
        const rangeStr = `${startDateStr} – ${endDateStr}`;

        const isAll = (emp.email === 'all' || emp.email === 'all_employees');
        const empLabel = isAll ? 'All Employees' : emp.name;
        const roleLabel = isAll ? 'Enterprise Team Overview' : (emp.designation || 'Team Member');

        let statusBadgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
        if (p.statusText === 'Completed Period') {
            statusBadgeClass = 'bg-purple-50 text-purple-700 border-purple-200';
        } else if (p.statusText === 'In-Progress Period') {
            statusBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        } else if (p.statusText === 'Custom Range Period') {
            statusBadgeClass = 'bg-indigo-50 text-indigo-700 border-indigo-200';
        }

        const lastUpdatedStr = new Date().toLocaleString('en-US', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        bar.innerHTML = `
            <div class="flex items-center gap-2.5 flex-wrap">
                <div class="flex items-center gap-1.5 text-slate-600">
                    <span class="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Reporting Period:</span>
                    <strong class="text-slate-800 font-bold">${esc(p.periodLabel)} (${esc(rangeStr)})</strong>
                </div>
                <span class="text-slate-300 hidden sm:inline">|</span>
                <div class="flex items-center gap-1.5 text-slate-600">
                    <span class="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Employee:</span>
                    <strong class="text-purple-700 font-bold">${esc(empLabel)}</strong>
                    <span class="text-slate-500 text-[11px]">(${esc(roleLabel)})</span>
                </div>
                <span class="text-slate-300 hidden sm:inline">|</span>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusBadgeClass}">
                    ${esc(p.statusText || 'Reporting Period')}
                </span>
            </div>
            <div class="flex items-center gap-3 flex-wrap text-slate-500 text-[11px]">
                <span class="flex items-center gap-1 font-medium">
                    <iconify-icon icon="solar:clock-circle-linear" width="13" class="text-slate-400"></iconify-icon>
                    Last Updated: ${esc(lastUpdatedStr)} (Asia/Kolkata)
                </span>
                <span class="flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200/80">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Jira Synced: ${esc((typeof window !== 'undefined' && window.JIRA && window.JIRA.projectKey) ? window.JIRA.projectKey : 'NOV')}
                </span>
            </div>
        `;
    }

    function detectClientFromText(text) {
        if (!text || typeof text !== 'string') return '';
        const txtLower = text.toLowerCase();
        const catalog = (typeof window !== 'undefined' && Array.isArray(window.CLIENTS))
            ? window.CLIENTS
            : ['NTT', 'Einstein', 'IVN', 'DreamDaa', 'Aladi Ezhilvanan', 'Vilpower', 'Vilpower DM', 'Quade', 'Nivya', 'Mr.Millet', 'Mopower', 'Iniya', '3Jo Toys', 'SalesNaany', 'University', 'SKM', 'Ramachandran', 'Ashmithasree', 'Porsche'];

        const sorted = [...catalog].sort((a, b) => b.length - a.length);
        for (const c of sorted) {
            if (!c) continue;
            const cLower = c.toLowerCase();
            if (['others', 'client', 'discussion', 'learning', 'general'].includes(cLower)) continue;
            if (txtLower.includes(cLower)) {
                return c;
            }
        }
        return '';
    }

    function resolveClientName(log, task) {
        let client = '';
        const genericValues = new Set(['', 'general', 'undefined', 'null', 'other', 'others', 'n/a', 'none', '-', 'client']);

        // 1. Direct client on log
        if (log && typeof log.client === 'string' && log.client.trim()) {
            const raw = log.client.trim();
            if (!genericValues.has(raw.toLowerCase())) client = raw;
        }

        // 2. Direct client on task
        if (!client && task && typeof task.client === 'string' && task.client.trim()) {
            const raw = task.client.trim();
            if (!genericValues.has(raw.toLowerCase())) client = raw;
        }

        // 3. Task client alias on log
        if (!client && log && typeof log.taskClient === 'string' && log.taskClient.trim()) {
            const raw = log.taskClient.trim();
            if (!genericValues.has(raw.toLowerCase())) client = raw;
        }

        // 4. Labels / Components on task
        if (!client && task) {
            const labels = Array.isArray(task.clientLabels) ? task.clientLabels : (Array.isArray(task.labels) ? task.labels : []);
            for (const lbl of labels) {
                if (lbl && !genericValues.has(String(lbl).trim().toLowerCase())) {
                    client = String(lbl).trim();
                    break;
                }
            }
            if (!client && Array.isArray(task.clientComponents)) {
                for (const cmp of task.clientComponents) {
                    if (cmp && !genericValues.has(String(cmp).trim().toLowerCase())) {
                        client = String(cmp).trim();
                        break;
                    }
                }
            }
        }

        // 5. Detect from summary/description
        if (!client) {
            const textToScan = (log?.taskDesc || log?.taskTitle || log?.title || task?.desc || task?.summary || task?.title || '').trim();
            if (textToScan) {
                if (typeof window !== 'undefined' && typeof window.detectClientFromSummary === 'function') {
                    const detected = window.detectClientFromSummary(textToScan);
                    if (detected && !genericValues.has(detected.toLowerCase())) client = detected;
                }
                if (!client) {
                    const detected = detectClientFromText(textToScan);
                    if (detected) client = detected;
                }
            }
        }

        // 6. Internal / Operations classification
        if (!client) {
            const tId = String(log?.taskId || task?.id || '').trim().toUpperCase();
            const isInternal = tId.startsWith('M-') || tId.startsWith('LEARN-') || log?.taskType === 'internal' || task?.manual || task?.taskType === 'internal';
            if (isInternal) {
                client = 'Internal / Operations';
            } else {
                client = 'General / Internal';
            }
        }

        return client.trim();
    }

    function renderClientTimingTab(data) {
        if (!data) {
            if (MMR.cachedReportData) data = MMR.cachedReportData;
            else return;
        }

        const taskMap = new Map();
        (data.allTasks || []).forEach(t => {
            if (t && t.id) taskMap.set(String(t.id).trim().toLowerCase(), t);
        });
        const globalTasks = (typeof window !== 'undefined' && Array.isArray(window.tasks)) ? window.tasks : [];
        globalTasks.forEach(t => {
            if (t && t.id) {
                const key = String(t.id).trim().toLowerCase();
                if (!taskMap.has(key)) taskMap.set(key, t);
            }
        });

        const clientMap = new Map();
        let totalClientSeconds = 0;

        function getClientEntry(cName) {
            const key = cName.toLowerCase();
            if (!clientMap.has(key)) {
                clientMap.set(key, {
                    name: cName,
                    tasks: [],
                    taskIds: new Set(),
                    totalSeconds: 0,
                    sessionsCount: 0,
                    completedCount: 0
                });
            }
            return clientMap.get(key);
        }

        // 1. Process time logs (source of truth for hours worked during the reporting period)
        if (Array.isArray(data.periodLogs) && data.periodLogs.length > 0) {
            data.periodLogs.forEach(log => {
                const dur = getLogDurationSec(log);
                if (dur <= 0) return;
                const tId = String(log.taskId || '').trim();
                const task = tId ? taskMap.get(tId.toLowerCase()) : null;
                const cName = resolveClientName(log, task);
                const cObj = getClientEntry(cName);

                cObj.totalSeconds += dur;
                cObj.sessionsCount += 1;
                totalClientSeconds += dur;

                if (task && task.id && !cObj.taskIds.has(task.id)) {
                    cObj.taskIds.add(task.id);
                    cObj.tasks.push(task);
                    if (task.isCompleted) cObj.completedCount++;
                }
            });
        }

        // 2. Incorporate tasks from allTasks (so clients with assigned tasks also appear and counts match)
        (data.allTasks || []).forEach(task => {
            if (!task) return;
            const cName = resolveClientName(null, task);
            const cObj = getClientEntry(cName);

            if (task.id && !cObj.taskIds.has(task.id)) {
                cObj.taskIds.add(task.id);
                cObj.tasks.push(task);
                if (task.isCompleted) cObj.completedCount++;
            }

            // Fallback for periods without raw log streams (e.g. pre-calculated or synthetic tasks)
            if ((!data.periodLogs || data.periodLogs.length === 0) && (task.workingTimeSec || 0) > 0) {
                cObj.totalSeconds += task.workingTimeSec;
                cObj.sessionsCount += (task.workSessionsCount || 1);
                totalClientSeconds += task.workingTimeSec;
            }
        });

        const clientsList = Array.from(clientMap.values()).sort((a, b) => b.totalSeconds - a.totalSeconds);

        // 1. KPI cards
        const totalClients = clientsList.length;
        const topClient = clientsList.length > 0 ? clientsList[0].name : 'None';
        const topClientTime = clientsList.length > 0 ? formatDurationHM(clientsList[0].totalSeconds) : '0h 0m';
        const avgSeconds = totalClients > 0 ? Math.round(totalClientSeconds / totalClients) : 0;
        const totalSessions = clientsList.reduce((acc, c) => acc + c.sessionsCount, 0);

        const kpisContainer = getEl('mmr-client-timing-kpis');
        if (kpisContainer) {
            kpisContainer.innerHTML = `
                <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <span class="text-xs font-semibold text-slate-500">Active Clients</span>
                        <p class="text-2xl font-black text-slate-900 mt-1">${totalClients}</p>
                        <p class="text-[11px] text-slate-400 mt-0.5">With assigned work</p>
                    </div>
                    <div class="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                        <iconify-icon icon="solar:buildings-bold-duotone" width="22"></iconify-icon>
                    </div>
                </div>
                <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <span class="text-xs font-semibold text-slate-500">Top Client</span>
                        <p class="text-xl font-black text-slate-900 mt-1 truncate max-w-[140px]">${esc(topClient)}</p>
                        <p class="text-[11px] text-purple-600 font-bold mt-0.5">${topClientTime} logged</p>
                    </div>
                    <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <iconify-icon icon="solar:star-fall-bold-duotone" width="22"></iconify-icon>
                    </div>
                </div>
                <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <span class="text-xs font-semibold text-slate-500">Avg Time / Client</span>
                        <p class="text-2xl font-black text-slate-900 mt-1">${formatDurationHM(avgSeconds)}</p>
                        <p class="text-[11px] text-slate-400 mt-0.5">Across active clients</p>
                    </div>
                    <div class="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                        <iconify-icon icon="solar:clock-circle-bold-duotone" width="22"></iconify-icon>
                    </div>
                </div>
                <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <span class="text-xs font-semibold text-slate-500">Client Sessions</span>
                        <p class="text-2xl font-black text-slate-900 mt-1">${totalSessions}</p>
                        <p class="text-[11px] text-slate-400 mt-0.5">Total focus sessions</p>
                    </div>
                    <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                        <iconify-icon icon="solar:stopwatch-play-bold-duotone" width="22"></iconify-icon>
                    </div>
                </div>
            `;
        }

        const badgeEl = getEl('mmr-client-total-badge');
        if (badgeEl) badgeEl.textContent = `${totalClients} Client${totalClients === 1 ? '' : 's'}`;

        // 2. Table rows
        const tbody = getEl('mmr-client-timing-tbody');
        if (tbody) {
            if (clientsList.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-slate-400 font-medium">No client task timing records for this period.</td></tr>';
            } else {
                tbody.innerHTML = clientsList.map(c => {
                    const pct = totalClientSeconds > 0 ? Math.round((c.totalSeconds / totalClientSeconds) * 100) : 0;
                    return `
                        <tr class="hover:bg-slate-50/80 transition-colors">
                            <td class="px-4 py-3">
                                <div class="flex items-center gap-2.5">
                                    <div class="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 font-black text-xs flex items-center justify-center shrink-0">
                                        ${esc((c.name || 'G').charAt(0).toUpperCase())}
                                    </div>
                                    <span class="font-bold text-slate-900">${esc(c.name)}</span>
                                </div>
                            </td>
                            <td class="px-4 py-3 text-center font-semibold text-slate-700">${c.tasks.length}</td>
                            <td class="px-4 py-3 text-center font-semibold text-slate-700">${c.sessionsCount}</td>
                            <td class="px-4 py-3 font-mono font-bold text-purple-700">${formatDurationHM(c.totalSeconds)}</td>
                            <td class="px-4 py-3">
                                <div class="flex items-center gap-2">
                                    <div class="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                                        <div class="bg-purple-600 h-2 rounded-full" style="width: ${pct}%"></div>
                                    </div>
                                    <span class="text-[11px] font-bold text-slate-600">${pct}%</span>
                                </div>
                            </td>
                            <td class="px-4 py-3 text-center">
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${c.completedCount === c.tasks.length && c.tasks.length > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}">
                                    ${c.completedCount} / ${c.tasks.length}
                                </span>
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        }

        // Clean up any existing chart instance
        if (MMR.charts.clientTiming) {
            try { MMR.charts.clientTiming.destroy(); } catch (e) { }
            MMR.charts.clientTiming = null;
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 9. RBAC USER SELECTOR UPDATE
    // ─────────────────────────────────────────────────────────────

    function updateRbacUserSelector() {
        const select = getEl('mmr-user-select');
        const container = getEl('mmr-user-select-container');
        const lockBadge = getEl('mmr-user-lock-badge');

        // Dynamically populate historical and future years in the Year Dropdown
        const yearSelect = getEl('mmr-custom-year-select');
        if (yearSelect && ((yearSelect.options ? yearSelect.options.length : 0) <= 1 || !(typeof yearSelect.querySelector === 'function' && yearSelect.querySelector(`option[value="${MMR.selectedYear}"]`)))) {
            const curY = new Date().getFullYear();
            const years = [];
            for (let y = curY - 3; y <= curY + 2; y++) years.push(y);
            yearSelect.innerHTML = years.map(y => `<option value="${y}" ${y === MMR.selectedYear ? 'selected' : ''}>${y}</option>`).join('');
        } else if (yearSelect) {
            yearSelect.value = String(MMR.selectedYear);
        }

        const monthSelect = getEl('mmr-custom-month-select');
        if (monthSelect) {
            monthSelect.value = String(MMR.selectedMonth);
        }

        if (container) {
            container.classList?.remove?.('hidden');
            if (container.style?.setProperty) {
                container.style.setProperty('display', 'flex', 'important');
            }
        }

        if (!select) return;

        const isAdmin = checkIsAdmin();
        const isMgr = (typeof window.isManager === 'function' && window.isManager());
        const myEmail = String(window.currentUser?.email || '').toLowerCase().trim();
        const targetEmail = getAuthorizedUserEmail() || myEmail;
        const employees = Engine.getAllEmployees();

        if (isAdmin) {
            select.disabled = false;
            select.classList?.remove?.('opacity-70', 'cursor-not-allowed');
            lockBadge?.classList?.add?.('hidden');

            // Sort employees: My Report first, then alphabetical
            employees.sort((a, b) => {
                if (a.email === myEmail) return -1;
                if (b.email === myEmail) return 1;
                return (a.name || '').localeCompare(b.name || '');
            });

            let optionsHtml = `<option value="all" ${targetEmail === 'all' ? 'selected' : ''}>🏢 All Employees (Enterprise Overview)</option>`;
            optionsHtml += employees.map(emp => {
                const empEmail = emp.email.toLowerCase();
                const isSelected = empEmail === targetEmail.toLowerCase();
                const isMe = empEmail === myEmail;
                const label = isMe ? `${esc(emp.name)} (My Report - Admin)` : `${esc(emp.name)} (${esc(emp.role || 'Team Member')})`;
                return `<option value="${esc(emp.email)}" ${isSelected ? 'selected' : ''}>${label}</option>`;
            }).join('');

            select.innerHTML = optionsHtml;
            select.value = targetEmail;
        } else if (isMgr) {
            select.disabled = false;
            select.classList?.remove?.('opacity-70', 'cursor-not-allowed');
            lockBadge?.classList?.add?.('hidden');

            const optionsHtml = employees.map(emp => {
                const empEmail = emp.email.toLowerCase();
                const isSelected = empEmail === targetEmail.toLowerCase();
                const isMe = empEmail === myEmail;
                const label = isMe ? `${esc(emp.name)} (My Report - Manager)` : `${esc(emp.name)} (${esc(emp.role || 'Team Member')})`;
                return `<option value="${esc(emp.email)}" ${isSelected ? 'selected' : ''}>${label}</option>`;
            }).join('');

            select.innerHTML = optionsHtml;
            select.value = targetEmail;
        } else {
            // Normal Employee: Locked to self
            select.disabled = true;
            select.classList?.add?.('opacity-70', 'cursor-not-allowed');
            lockBadge?.classList?.remove?.('hidden');

            const myName = window.currentUser?.name || myEmail;
            const myRole = window.currentUser?.role || 'Team Member';
            select.innerHTML = `<option value="${esc(myEmail)}" selected>${esc(myName)} (${esc(myRole)})</option>`;
            select.value = myEmail;
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 10. PUBLIC CONTROLLER API
    // ─────────────────────────────────────────────────────────────

    window.MyMonthlyReport = {
        init: function () {
            updateRbacUserSelector();
            this.setPeriodPreset('current_month');
        },
        refresh: function () {
            renderMyMonthlyReport();
        },
        setPeriodPreset: function (preset) {
            MMR.dateMode = preset;
            MMR.customFrom = '';
            MMR.customTo = '';

            const fromEl = getEl('mmr-date-from');
            const toEl = getEl('mmr-date-to');
            if (fromEl) fromEl.value = '';
            if (toEl) toEl.value = '';

            const rangeContainer = getEl('mmr-custom-range-container');
            if (rangeContainer) {
                rangeContainer.classList.remove('ring-2', 'ring-purple-500', 'border-purple-300', 'bg-purple-50/40');
            }
            const monthContainer = getEl('mmr-month-year-container');
            if (monthContainer) {
                monthContainer.classList.remove('ring-2', 'ring-purple-500', 'border-purple-300', 'bg-purple-50/40');
            }

            safeQueryAll('.mmr-preset-btn').forEach(btn => {
                btn.classList.remove('bg-purple-600', 'text-white', 'shadow-sm');
                btn.classList.add('text-slate-600', 'hover:text-slate-900');
            });
            const activeBtn = getEl(`mmr-preset-${preset}`);
            if (activeBtn) {
                activeBtn.classList.remove('text-slate-600', 'hover:text-slate-900');
                activeBtn.classList.add('bg-purple-600', 'text-white', 'shadow-sm');
            }
            renderMyMonthlyReport();
        },
        switchSubTab: function (subTabId) {
            MMR.activeSubTab = subTabId;
            if (MMR.cachedReportData) {
                renderActiveSubTab(MMR.cachedReportData);
            } else {
                renderMyMonthlyReport();
            }
        },
        handleUserChange: function (userEmail) {
            if (!checkIsAdmin() && !(typeof window.isManager === 'function' && window.isManager())) {
                console.warn('[MyMonthlyReport] Access denied: Only Administrators and Managers can view other users reports');
                return;
            }
            const select = getEl('mmr-user-select');
            const newEmail = userEmail || (select ? select.value : null);
            if (newEmail) {
                MMR.selectedUserEmail = newEmail.trim().toLowerCase();
                renderMyMonthlyReport();
                if (typeof toast === 'function') {
                    const empName = MMR.cachedReportData?.employee?.name || newEmail;
                    toast(`Viewing monthly report for: ${empName}`, 'info');
                }
            }
        },
        switchToMyReport: function () {
            const myEmail = String(window.currentUser?.email || '').trim().toLowerCase();
            MMR.selectedUserEmail = myEmail;
            const select = getEl('mmr-user-select');
            if (select) select.value = myEmail;
            renderMyMonthlyReport();
            if (typeof toast === 'function') toast('Switched to My Report', 'info');
        },
        setSelectedUser: function (email) {
            if (!checkIsAdmin() && !(typeof window.isManager === 'function' && window.isManager())) {
                console.warn('[MyMonthlyReport] Access denied: Only Administrators and Managers can view other users reports');
                return;
            }
            MMR.selectedUserEmail = (email || '').trim().toLowerCase();
            renderMyMonthlyReport();
        },
        handleCustomMonthChange: function (yearVal, monthVal) {
            MMR.selectedYear = parseInt(yearVal, 10);
            MMR.selectedMonth = parseInt(monthVal, 10);
            MMR.dateMode = 'custom_month';
            MMR.customFrom = '';
            MMR.customTo = '';

            const fromEl = getEl('mmr-date-from');
            const toEl = getEl('mmr-date-to');
            if (fromEl) fromEl.value = '';
            if (toEl) toEl.value = '';

            safeQueryAll('.mmr-preset-btn').forEach(btn => {
                btn.classList.remove('bg-purple-600', 'text-white', 'shadow-sm');
                btn.classList.add('text-slate-600', 'hover:text-slate-900');
            });

            const monthContainer = getEl('mmr-month-year-container');
            if (monthContainer) {
                monthContainer.classList.add('ring-2', 'ring-purple-500', 'border-purple-300', 'bg-purple-50/40');
            }
            const rangeContainer = getEl('mmr-custom-range-container');
            if (rangeContainer) {
                rangeContainer.classList.remove('ring-2', 'ring-purple-500', 'border-purple-300', 'bg-purple-50/40');
            }

            renderMyMonthlyReport();
        },
        applyCustomDateRange: function () {
            const fromEl = getEl('mmr-date-from');
            const toEl = getEl('mmr-date-to');
            const fromVal = fromEl?.value;
            const toVal = toEl?.value;

            if (!fromVal || !toVal) {
                if (typeof toast === 'function') {
                    toast('Please select both Start Date and End Date', 'warning');
                } else {
                    alert('Please select both Start Date and End Date');
                }
                return;
            }

            if (fromVal > toVal) {
                if (typeof toast === 'function') {
                    toast('End Date cannot be earlier than Start Date', 'error');
                } else {
                    alert('End Date cannot be earlier than Start Date');
                }
                if (toEl) {
                    toEl.classList.add('text-rose-600', 'font-black');
                    setTimeout(() => toEl.classList.remove('text-rose-600', 'font-black'), 3000);
                }
                return;
            }

            MMR.customFrom = fromVal;
            MMR.customTo = toVal;
            MMR.dateMode = 'custom_range';

            safeQueryAll('.mmr-preset-btn').forEach(btn => {
                btn.classList.remove('bg-purple-600', 'text-white', 'shadow-sm');
                btn.classList.add('text-slate-600', 'hover:text-slate-900');
            });

            const rangeContainer = getEl('mmr-custom-range-container');
            if (rangeContainer) {
                rangeContainer.classList.add('ring-2', 'ring-purple-500', 'border-purple-300', 'bg-purple-50/40');
            }
            const monthContainer = getEl('mmr-month-year-container');
            if (monthContainer) {
                monthContainer.classList.remove('ring-2', 'ring-purple-500', 'border-purple-300', 'bg-purple-50/40');
            }

            renderMyMonthlyReport();
            if (typeof toast === 'function') toast(`Applied custom range: ${fromVal} to ${toVal}`, 'success');
        },
        resetFilters: function () {
            const fromEl = getEl('mmr-date-from');
            const toEl = getEl('mmr-date-to');
            if (fromEl) fromEl.value = '';
            if (toEl) toEl.value = '';
            MMR.customFrom = '';
            MMR.customTo = '';

            const rangeContainer = getEl('mmr-custom-range-container');
            if (rangeContainer) {
                rangeContainer.classList.remove('ring-2', 'ring-purple-500', 'border-purple-300', 'bg-purple-50/40');
            }
            const monthContainer = getEl('mmr-month-year-container');
            if (monthContainer) {
                monthContainer.classList.remove('ring-2', 'ring-purple-500', 'border-purple-300', 'bg-purple-50/40');
            }

            const now = new Date();
            MMR.selectedYear = now.getFullYear();
            MMR.selectedMonth = now.getMonth() + 1;
            const monthSelect = getEl('mmr-custom-month-select');
            if (monthSelect) monthSelect.value = String(MMR.selectedMonth);
            const yearSelect = getEl('mmr-custom-year-select');
            if (yearSelect) yearSelect.value = String(MMR.selectedYear);

            this.setPeriodPreset('current_month');
            if (typeof toast === 'function') toast('Filters reset to Current Month', 'info');
        },
        handleTaskSearch: function (val) {
            MMR.taskSearchTerm = val;
            if (MMR.cachedReportData) renderJiraTab(MMR.cachedReportData);
        },
        handleTaskStatusFilter: function (statusVal) {
            MMR.taskStatusFilter = statusVal;
            if (MMR.cachedReportData) renderJiraTab(MMR.cachedReportData);
        },
        handleInternalCategoryFilter: function (catVal) {
            MMR.internalCategoryFilter = catVal;
            if (MMR.cachedReportData) renderInternalTab(MMR.cachedReportData);
        },
        handleQcCategoryFilter: function (catVal) {
            MMR.qcCategoryFilter = catVal;
            if (MMR.cachedReportData) renderQcTab(MMR.cachedReportData);
        },
        openTaskDetailModal: openTaskDetailModal,
        closeTaskDetailModal: closeTaskDetailModal,
        exportPdf: exportReportAsPdf,
        exportExcel: exportDetailedTaskReportExcel,
        exportAttendanceCsv: exportAttendanceReportCsv,
        exportQcCsv: exportQcFailureReportCsv
    };

})(typeof window !== 'undefined' ? window : this);
