/**
 * Monthly Report Module
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
        taskTypeFilter: 'all',
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
    // PROJECT TASK TYPES (CANONICAL CATEGORIES)
    // ─────────────────────────────────────────────────────────────
    const TASK_TYPES = [
        'Content',
        'Quality Check',
        'Video Editing',
        'Learning',
        'Website Design ( Alex)',
        'Tasks - ( All other)'
    ];

    // ─────────────────────────────────────────────────────────────
    // MULTI-ROLE EMPLOYEES
    // People who do more than one kind of work on the same tasks. Their report labels each task
    // by what THEY did (from their own time sessions), not by the task title, and only their
    // report shows the Task Type filter. Everyone else's report is unchanged.
    // To add someone: add their email with their main work type and the types they do.
    // ─────────────────────────────────────────────────────────────
    const MULTI_ROLE_EMPLOYEES = {
        // Sneha: writes content for posters and videos, and does QC
        'snehavilpower@gmail.com': { label: 'Content Writer & QC', primaryType: 'Content', types: ['Content', 'Quality Check'] }
    };

    function getMultiRoleProfile(email) {
        const e = Engine && typeof Engine.normalizeEmail === 'function' ? Engine.normalizeEmail(email) : String(email || '').toLowerCase().trim();
        return MULTI_ROLE_EMPLOYEES[e] || null;
    }

    // Sessions logged from the QC Portal are saved with a "[QC]" prefix on the task description.
    function isQcSession(log) {
        if (!log) return false;
        const d = String(log.taskDesc || log.taskName || log.title || '').trim();
        return /^\[qc\]/i.test(d) || log.isQc === true || String(log.type || '').toLowerCase() === 'qc';
    }

    /**
     * For a multi-role employee: split this task's time by what they did.
     * QC Portal sessions → "Quality Check"; their other sessions → their main type
     * (Learning tasks stay "Learning"). Returns { workTypes, timeByType, mainType }.
     */
    function splitWorkByType(task, logs, profile) {
        const taskBased = detectTaskType(task);
        const otherType = taskBased === 'Learning' ? 'Learning' : profile.primaryType;
        const timeByType = {};
        (logs || []).forEach(l => {
            const type = isQcSession(l) ? 'Quality Check' : otherType;
            timeByType[type] = (timeByType[type] || 0) + getLogDurationSec(l);
        });
        let workTypes = Object.keys(timeByType);
        if (!workTypes.length) {
            // Assigned but no time logged yet: QC-stage tasks are QC work, everything else main type
            workTypes = [taskBased === 'Quality Check' || taskBased === 'Learning' ? taskBased : profile.primaryType];
        }
        // Main type = the one with the most time (for sorting and the single-label views)
        const mainType = workTypes.slice().sort((a, b) => (timeByType[b] || 0) - (timeByType[a] || 0))[0];
        return { workTypes, timeByType, mainType };
    }

    function detectTaskType(t) {
        if (!t) return 'Tasks - ( All other)';

        // 1. Direct candidate matching
        const candidates = [
            t.derivedTaskType,
            t.taskType,
            t.category,
            t.issueType,
            t.task_type,
            t.type,
            t.format,
            t.contentType
        ].filter(Boolean).map(s => String(s).trim());

        for (const cand of candidates) {
            const exact = TASK_TYPES.find(tt => tt.toLowerCase() === cand.toLowerCase());
            if (exact) return exact;
        }

        // 2. Aggregate searchable metadata
        const fullText = [
            t.desc,
            t.title,
            t.summary,
            t.issueType,
            t.format,
            t.contentType,
            t.category,
            t.id,
            t.assignee,
            t.assigneeEmail,
            t.owner,
            Array.isArray(t.labels) ? t.labels.join(' ') : (t.labels || ''),
            Array.isArray(t.clientLabels) ? t.clientLabels.join(' ') : (t.clientLabels || ''),
            Array.isArray(t.tags) ? t.tags.join(' ') : (t.tags || '')
        ].filter(Boolean).join(' ').toLowerCase();

        const idUpper = String(t.id || '').toUpperCase().trim();
        const assigneeEmail = String(t.assigneeEmail || t.ownerEmail || '').toLowerCase().trim();
        const assigneeName = String(t.assignee || t.owner || '').toLowerCase().trim();
        const normStatus = (typeof Engine !== 'undefined' && typeof Engine.normalizeStatus === 'function')
            ? Engine.normalizeStatus(t.status || '')
            : String(t.status || '');

        // 3. Rules

        // Quality Check: QC tasks or tasks under QC review
        if (idUpper.startsWith('QC-') || normStatus === 'QC Review' || String(t.status || '').toLowerCase().includes('quality check') || /\b(qc|qa)\b|quality check|review and qc|qc review/i.test(fullText)) {
            return 'Quality Check';
        }

        // Learning: Training or learning sessions
        if (idUpper.startsWith('LEARN-') || t.learningSession === true || String(t.category || '').toLowerCase().includes('learn') || /\blearn(ing|ings)?\b|training session|morning learn/i.test(fullText)) {
            return 'Learning';
        }

        // Website Design ( Alex): Alex's tasks or web development/design
        if (assigneeEmail.includes('alex') || assigneeName.includes('alex') || /web dev(elopment)?|\bwebsite\b|web design|landing page|wordpress|shopify|frontend|backend|html|css|ui\/ux/i.test(fullText)) {
            return 'Website Design ( Alex)';
        }

        // Content: Sneha's tasks or content writing / captions / scripts / prep selections
        if (assigneeEmail === 'snehavilpower@gmail.com' || assigneeName.includes('sneha') ||
            /content|caption(s)?|\bcopy\b|copywrit(ing)?|\bscript(s|writing)?\b|poster content|video content|thumbnail content|end card content/i.test(fullText)) {
            return 'Content';
        }

        // Video Editing: Video tasks
        const isVideoFormat = String(t.format || t.contentType || '').toLowerCase().includes('video') || String(t.issueType || '').toLowerCase().includes('video');
        if (isVideoFormat || /video edit(ing)?|\bvideo(s)?\b|\breel(s)?\b|glimpse video|shorts|yt short|youtube video|motion graphic|animation|cut|color grading/i.test(fullText)) {
            return 'Video Editing';
        }

        // Tasks - ( All other): Fallback for all other tasks
        return 'Tasks - ( All other)';
    }

    function getTaskTypeBadge(taskType) {
        switch (taskType) {
            case 'Content':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'Quality Check':
                return 'bg-amber-100 text-amber-800 border-amber-300';
            case 'Video Editing':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'Learning':
                return 'bg-lime-50 text-lime-700 border-lime-200';
            case 'Website Design ( Alex)':
                return 'bg-indigo-50 text-indigo-700 border-indigo-200';
            case 'Tasks - ( All other)':
            default:
                return 'bg-purple-50 text-purple-700 border-purple-200';
        }
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
            avatar: isAll ? 'img/favicon-192.png' : (rawUserObj.profilePicture || (typeof window.getUserAvatarSrc === 'function' ? window.getUserAvatarSrc(rawUserObj) : ''))
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

        // Build first check-in map per user per day so phantom pre-arrival hours (e.g. 4:39 AM ghost timers) are never counted
        const rawAttendanceAll = Array.isArray(window.attendanceEvents) ? window.attendanceEvents : ((typeof attendanceEvents !== 'undefined' && Array.isArray(attendanceEvents)) ? attendanceEvents : []);
        const firstCheckInMap = {}; // "email|YYYY-MM-DD" -> earliest check-in timestamp
        rawAttendanceAll.forEach(evt => {
            if (evt && evt.type === 'check_in' && evt.timestamp) {
                const em = (evt.userId || evt.email || '').toLowerCase().trim();
                const dStr = Engine.formatLocalDate(new Date(evt.timestamp));
                const key = `${em}|${dStr}`;
                if (!firstCheckInMap[key] || evt.timestamp < firstCheckInMap[key]) {
                    firstCheckInMap[key] = evt.timestamp;
                }
            }
        });

        const userLogs = isAll ? allLogs : allLogs.filter(matchesTargetEmployee);

        // Filter logs strictly within period and filter out phantom hours prior to check-in
        const periodLogs = userLogs.filter(l => {
            const start = Engine.parseTimestamp(l.startTime || l.startedAt || l.timestamp);
            const durSec = getLogDurationSec(l);
            const end = Engine.parseTimestamp(l.endTime || l.completedAt) || (start + durSec * 1000);
            return (start >= period.fromTs && start <= period.toTs) || (end >= period.fromTs && end <= period.toTs);
        }).filter(l => {
            // Check if log start was prior to first check-in of that day
            const start = Engine.parseTimestamp(l.startTime || l.startedAt || l.timestamp);
            const end = Engine.parseTimestamp(l.endTime || l.completedAt);
            if (start) {
                const em = (l.userId || l.email || l.userEmail || '').toLowerCase().trim();
                const dStr = Engine.formatLocalDate(new Date(start));
                const checkIn = firstCheckInMap[`${em}|${dStr}`];
                if (checkIn && start < checkIn) {
                    // If the entire session finished before check-in, discard completely (ghost overnight session)
                    if (end && end <= checkIn) return false;
                    // If it started early in the morning before check-in (e.g. 4:39 AM when checkin was 9:15 AM)
                    const checkInHour = new Date(checkIn).getHours();
                    const startHour = new Date(start).getHours();
                    if (checkInHour >= 8 && startHour <= 6) {
                        return false; // Accidental overnight / ghost session
                    }
                }
            }
            return true;
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

        const isCustomRange = MMR.dateMode === 'custom_range' && period.statusText === 'Custom Range Period';

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

            // Custom date range (e.g. a single day): list only tasks with real activity in that
            // range – time logged or completed. The month-level rules below (whole Jira space key,
            // open backlog) would otherwise list tasks nobody worked on in the selected dates.
            if (isCustomRange) {
                return hasLogsInPeriod || (isDone && compTs >= period.fromTs && compTs <= period.toTs);
            }

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

            // 2. If space-key mapping exists for this month and this task has a project space key:
            // Enforce that it belongs to this month's space key (prevents cross-month ticket leakage such as NOV tasks appearing in October)
            if (pKey && hasMappingForMonth) {
                return isSpaceKeyMonth;
            }

            // 3. If the task was completed or due within this reporting period:
            if ((compTs >= period.fromTs && compTs <= period.toTs) || (dTs >= period.fromTs && dTs <= period.toTs)) {
                return true;
            }

            // 4. Fallback: date range
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

        const multiRoleProfile = isAll ? null : getMultiRoleProfile(normalizedTarget);

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

            // Multi-role employees (e.g. Sneha): type = what they did on the task, from their sessions
            const split = multiRoleProfile ? splitWorkByType(t, tLogs, multiRoleProfile) : null;

            const enriched = {
                ...t,
                derivedTaskType: split ? split.mainType : detectTaskType(t),
                workTypes: split ? split.workTypes : null,
                timeByWorkType: split ? split.timeByType : null,
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
        const workedTasks = allCombinedTasks.filter(t => (t.workingTimeSec || 0) > 0 || (t.workSessionsCount || 0) > 0);
        const unstartedTasks = allCombinedTasks.filter(t => (t.workingTimeSec || 0) === 0 && (t.workSessionsCount || 0) === 0);
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

        // 8. Shoot & Video Production Tracking (Ajith, Immanuel & Production Team)
        const shootTasks = allCombinedTasks.filter(t => {
            if (t.shootPlan === true || t.shootGroupId) return true;
            const tId = String(t.id || '').toUpperCase();
            if (tId.includes('SHOOT')) return true;
            const d = (t.desc || t.title || '').toLowerCase();
            const s = (t.status || '').toLowerCase();
            const act = (t.activity || '').toLowerCase();
            const cat = (t.category || '').toLowerCase();
            return d.includes('shoot') || s.includes('shoot') || act.includes('shoot') || cat.includes('shoot');
        });

        // Also check if any periodLogs have shoot activity
        const shootLogs = periodLogs.filter(l => {
            const act = (l.activity || '').toLowerCase();
            const d = (l.taskDesc || l.taskTitle || '').toLowerCase();
            return act.includes('shoot') || d.includes('shoot');
        });
        const shootTaskIdsFromLogs = new Set(shootLogs.map(l => String(l.taskId || '').toLowerCase()));
        
        shootTaskIdsFromLogs.forEach(id => {
            if (!id || id === 'general') return;
            if (!shootTasks.some(t => String(t.id).toLowerCase() === id)) {
                const match = allCombinedTasks.find(t => String(t.id).toLowerCase() === id);
                if (match) shootTasks.push(match);
            }
        });

        let totalShootSeconds = 0;
        const shootList = shootTasks.map(t => {
            const tLogs = taskLogsMap.get(String(t.id).trim().toLowerCase()) || [];
            const tSec = tLogs.reduce((acc, l) => acc + getLogDurationSec(l), 0);
            totalShootSeconds += tSec;

            // Classify shoot type
            const titleLow = (t.desc || t.title || '').toLowerCase();
            const notesLow = (t.notes || '').toLowerCase();
            const combinedText = `${titleLow} ${notesLow}`;
            let shootType = 'Video Shoot';
            if (combinedText.includes('product') || combinedText.includes('photo')) shootType = 'Product Photography';
            else if (combinedText.includes('promo') || combinedText.includes('brand')) shootType = 'Promotional Shoot';
            else if (combinedText.includes('outdoor') || combinedText.includes('site') || combinedText.includes('field')) shootType = 'Outdoor Shoot';
            else if (combinedText.includes('setup') || combinedText.includes('studio')) shootType = 'Studio Setup';
            else if (combinedText.includes('support') || combinedText.includes('assist')) shootType = 'Production Support';

            return {
                id: t.id,
                shootGroupId: t.shootGroupId || t.id,
                client: t.client || 'Client Shoot',
                title: t.desc || t.title || 'Production Shoot',
                date: t.duedate || t.dueDate || formatDateStr(t.createdAt),
                shootTime: t.shootTime || '',
                shootType,
                team: t.assignees || [t.assignee || employeeProfile.name],
                durationSec: tSec,
                formattedTime: formatHoursMinutes(tSec),
                status: t.status || 'Shoot Planned',
                isCompleted: t.isCompleted || (t.status || '').toLowerCase().includes('completed')
            };
        });

        const completedShoots = shootList.filter(s => s.isCompleted);
        const plannedShoots = shootList.filter(s => !s.isCompleted);
        const shootTypeCounts = {};
        shootList.forEach(s => {
            shootTypeCounts[s.shootType] = (shootTypeCounts[s.shootType] || 0) + 1;
        });

        const shootReport = {
            totalShoots: shootList.length,
            completedShoots: completedShoots.length,
            plannedShoots: plannedShoots.length,
            totalShootSeconds,
            totalShootHours: (totalShootSeconds / 3600).toFixed(1),
            shootList,
            shootTypeCounts
        };

        // 9. Role-Based Work Activity Breakdown (Content Writing, QC Review, Video, Design, Admin, etc.)
        const activityMap = {
            contentWriting: { name: 'Content Writing & Copywriting', sec: 0, sessions: 0, tasks: new Set() },
            qcReview: { name: 'Quality Check & QC Review', sec: 0, sessions: 0, tasks: new Set() },
            videoProduction: { name: 'Video Editing & Production', sec: 0, sessions: 0, tasks: new Set() },
            graphicDesign: { name: 'Graphic & Visual Design', sec: 0, sessions: 0, tasks: new Set() },
            adminMeetings: { name: 'Administrative & Meetings', sec: 0, sessions: 0, tasks: new Set() },
            other: { name: 'Other Production Activities', sec: 0, sessions: 0, tasks: new Set() }
        };

        periodLogs.forEach(log => {
            const dur = getLogDurationSec(log);
            const act = (log.activity || '').toLowerCase();
            const desc = (log.taskDesc || log.taskTitle || log.title || '').toLowerCase();
            const text = `${act} ${desc}`;
            const tId = String(log.taskId || 'general');

            if (text.includes('content') || text.includes('copy') || text.includes('script') || text.includes('caption') || text.includes('article') || text.includes('blog') || text.includes('writing')) {
                activityMap.contentWriting.sec += dur;
                activityMap.contentWriting.sessions++;
                activityMap.contentWriting.tasks.add(tId);
            } else if (text.includes('qc') || text.includes('quality') || text.includes('proofreading') || text.includes('audit') || text.includes('review') || text.includes('inspection')) {
                activityMap.qcReview.sec += dur;
                activityMap.qcReview.sessions++;
                activityMap.qcReview.tasks.add(tId);
            } else if (text.includes('video') || text.includes('editing') || text.includes('reel') || text.includes('shoot') || text.includes('render') || text.includes('audio') || text.includes('footage') || text.includes('animation')) {
                activityMap.videoProduction.sec += dur;
                activityMap.videoProduction.sessions++;
                activityMap.videoProduction.tasks.add(tId);
            } else if (text.includes('design') || text.includes('poster') || text.includes('banner') || text.includes('thumbnail') || text.includes('flyer') || text.includes('creative') || text.includes('photoshop') || text.includes('illustrator')) {
                activityMap.graphicDesign.sec += dur;
                activityMap.graphicDesign.sessions++;
                activityMap.graphicDesign.tasks.add(tId);
            } else if (text.includes('meeting') || text.includes('sync') || text.includes('admin') || text.includes('training') || text.includes('call') || text.includes('discussion')) {
                activityMap.adminMeetings.sec += dur;
                activityMap.adminMeetings.sessions++;
                activityMap.adminMeetings.tasks.add(tId);
            } else {
                activityMap.other.sec += dur;
                activityMap.other.sessions++;
                activityMap.other.tasks.add(tId);
            }
        });

        const activityBreakdown = Object.entries(activityMap).map(([key, a]) => {
            const hours = (a.sec / 3600).toFixed(1);
            const pct = totalWorkedSeconds > 0 ? Math.round((a.sec / totalWorkedSeconds) * 100) : 0;
            return {
                key,
                name: a.name,
                seconds: a.sec,
                hours: Number(hours),
                formattedTime: formatHoursMinutes(a.sec),
                sessionsCount: a.sessions,
                tasksCount: a.tasks.size,
                pct
            };
        }).filter(a => a.seconds > 0 || (employeeProfile.designation.toLowerCase().includes('content') && (a.key === 'contentWriting' || a.key === 'qcReview')));

        return {
            period,
            employee: employeeProfile,
            kpis: {
                totalAssigned: allCombinedTasks.length,
                jiraAssigned: jiraTasks.length,
                internalAssigned: internalTasks.length,
                workedTasks: workedTasks.length,
                unstartedTasks: unstartedTasks.length,
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
            multiRole: multiRoleProfile,
            allTasks: allCombinedTasks,
            workedTasks,
            unstartedTasks,
            timingTasks: workedTasks,
            taskLogsMap,
            periodLogs,
            dailyAttendanceMap,
            breakSessions,
            shoot: shootReport,
            activityBreakdown,
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

        // 6. Shoot & Video Production Performance
        if (data.shoot && data.shoot.totalShoots > 0) {
            insights.push({
                type: 'win',
                category: 'Production Velocity',
                title: 'Shoot & On-Site Execution',
                message: `${empName}, you delivered ${data.shoot.completedShoots} of ${data.shoot.totalShoots} production shoots with ${data.shoot.totalShootHours} hours of dedicated shooting and setup focus.`
            });
        }

        // 7. Role Activity & Dual-Discipline Focus (e.g., Sneha Content Writing & QC)
        if (Array.isArray(data.activityBreakdown) && data.activityBreakdown.length > 1) {
            const writing = data.activityBreakdown.find(a => a.key === 'contentWriting');
            const qc = data.activityBreakdown.find(a => a.key === 'qcReview');
            if (writing && qc && (writing.seconds > 0 || qc.seconds > 0)) {
                insights.push({
                    type: 'neutral',
                    category: 'Role Specialization',
                    title: 'Content Writing & Quality Distribution',
                    message: `You maintained a dual focus across Content Writing (${writing.formattedTime}, ${writing.pct}%) and QC Quality Review (${qc.formattedTime}, ${qc.pct}%), ensuring comprehensive editorial integrity.`
                });
            }
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

        // 9. Role-Based Work Activity Breakdown Chart
        const actBreakdownCtx = getEl('mmr-chart-activity-breakdown')?.getContext('2d');
        if (actBreakdownCtx) {
            const acts = (data.activityBreakdown || []).filter(a => a.hours > 0);
            const labels = acts.length > 0 ? acts.map(a => a.name) : ['General Production'];
            const actData = acts.length > 0 ? acts.map(a => a.hours) : [Number(data.kpis.totalWorkingHours) || 1];
            const colors = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#64748b'];

            MMR.charts.actBreakdown = new Chart(actBreakdownCtx, {
                type: 'doughnut',
                data: {
                    labels,
                    datasets: [{
                        data: actData,
                        backgroundColor: colors.slice(0, labels.length),
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

        // 10. Client Time Allocation Chart
        const clientDistCtx = getEl('mmr-chart-client-distribution')?.getContext('2d');
        if (clientDistCtx) {
            const clientSummary = computeClientTimingSummary(data);
            const topClients = (clientSummary.clients || []).slice(0, 7);
            const cLabels = topClients.length > 0 ? topClients.map(c => c.name) : ['No Clients'];
            const cHours = topClients.length > 0 ? topClients.map(c => Number((c.totalSeconds / 3600).toFixed(1))) : [0];

            MMR.charts.clientDist = new Chart(clientDistCtx, {
                type: 'bar',
                data: {
                    labels: cLabels,
                    datasets: [{
                        label: 'Client Hours',
                        data: cHours,
                        backgroundColor: '#7c3aed',
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: { legend: { display: false } },
                    scales: { x: { beginAtZero: true, title: { display: true, text: 'Hours' } } }
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
            'overview', 'jira', 'internal', 'timing', 'client-timing', 'shoot', 'qc', 'rework', 'attendance', 'breaks', 'insights', 'goals'
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
        } else if (tab === 'shoot') {
            renderShootTab(data);
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

    // Work types of a task: for multi-role employees what they did (can be several), else the task type
    function taskWorkTypes(t) {
        return (t.workTypes && t.workTypes.length) ? t.workTypes : [t.derivedTaskType || detectTaskType(t)];
    }

    // The Task Type filter is only shown on multi-role employees' reports (e.g. Sneha),
    // listing just the types relevant to them.
    function syncTaskTypeFilter(data) {
        const sel = getEl('mmr-task-type-filter');
        if (!sel) return;
        const wrap = sel.parentElement;
        const profile = data && data.multiRole;
        if (!profile) {
            if (wrap && wrap.classList) wrap.classList.add('hidden');
            MMR.taskTypeFilter = 'all';
            return;
        }
        if (wrap && wrap.classList) wrap.classList.remove('hidden');
        const present = new Set();
        (data.jiraTasks || []).forEach(t => taskWorkTypes(t).forEach(x => present.add(x)));
        const types = [...new Set([...profile.types, ...present])];
        const html = '<option value="all">All Task Types</option>' + types.map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join('');
        if (sel.dataset && sel.dataset.opts !== html) { sel.innerHTML = html; sel.dataset.opts = html; }
        if (MMR.taskTypeFilter !== 'all' && !types.includes(MMR.taskTypeFilter)) MMR.taskTypeFilter = 'all';
        sel.value = MMR.taskTypeFilter || 'all';
    }

    function renderJiraTab(data) {
        const tbody = getEl('mmr-jira-tasks-tbody');
        if (!tbody) return;
        syncTaskTypeFilter(data);

        let filtered = data.jiraTasks;
        if (MMR.taskSearchTerm) {
            const term = MMR.taskSearchTerm.toLowerCase();
            filtered = filtered.filter(t => (t.id || '').toLowerCase().includes(term) || (t.desc || '').toLowerCase().includes(term) || (t.client || '').toLowerCase().includes(term) || taskWorkTypes(t).join(' ').toLowerCase().includes(term));
        }
        if (MMR.taskStatusFilter !== 'all') {
            filtered = filtered.filter(t => Engine.normalizeStatus(t.status).toLowerCase() === MMR.taskStatusFilter.toLowerCase());
        }
        if (MMR.taskTypeFilter && MMR.taskTypeFilter !== 'all') {
            filtered = filtered.filter(t => taskWorkTypes(t).includes(MMR.taskTypeFilter));
        }

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" class="p-8 text-center text-slate-400 font-medium">No Jira tasks found for this period.</td></tr>`;
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

            // One badge per work type; for multi-role employees also the time spent on each
            const typeBadges = taskWorkTypes(t).map(type => {
                const sec = t.timeByWorkType ? (t.timeByWorkType[type] || 0) : 0;
                const timeTxt = (t.workTypes && t.workTypes.length > 1 && sec > 0) ? ` · ${formatDurationHM(sec)}` : '';
                return `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${getTaskTypeBadge(type)}">${esc(type)}${timeTxt}</span>`;
            }).join(' ');

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
                    <td class="px-4 py-3 whitespace-nowrap"><div class="flex flex-wrap gap-1">${typeBadges}</div></td>
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

        // Strictly worked tasks with valid sessions/time (Prompt Rule: Unstarted tasks must NOT appear in Task-wise Timing List)
        const worked = (data.workedTasks || []).filter(t => (t.workingTimeSec || 0) > 0 || (t.workSessionsCount || 0) > 0);
        const unstarted = data.unstartedTasks || [];

        // Sort by working time descending
        worked.sort((a, b) => (b.workingTimeSec || 0) - (a.workingTimeSec || 0));

        if (worked.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-400 font-medium">No active task work sessions recorded for this period.</td></tr>`;
        } else {
            tbody.innerHTML = worked.map(t => {
                const source = t.manual || t.taskType === 'internal' ? 'Internal' : 'Jira';
                const sourceClass = source === 'Jira' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100';
                const safeId = esc(t.id).replace(/[^a-zA-Z0-9_-]/g, '_');
                const sessions = t.workSessions || [];

                return `
                    <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                        <td class="px-4 py-3">
                            <div class="flex items-center gap-2">
                                <button type="button" onclick="window.MyMonthlyReport.toggleSessionsRow('${safeId}')" class="text-slate-400 hover:text-purple-600 transition-colors p-1" title="Toggle Sessions">
                                    <iconify-icon id="mmr-chevron-${safeId}" icon="solar:alt-arrow-down-bold" width="14" class="transition-transform duration-200"></iconify-icon>
                                </button>
                                <div>
                                    <p class="font-bold text-xs text-slate-900">${esc(t.desc || t.title)}</p>
                                    <div class="flex items-center gap-2 mt-0.5">
                                        <span class="font-mono text-[10px] text-purple-700 font-bold">${esc(t.id)}</span>
                                        <span class="text-slate-300">•</span>
                                        <span class="text-[10px] text-slate-400 font-medium">${esc(t.client || 'General')}</span>
                                    </div>
                                </div>
                            </div>
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
                        <td class="px-4 py-3 text-right whitespace-nowrap">
                            <button type="button" onclick="window.MyMonthlyReport.toggleSessionsRow('${safeId}')" class="px-2.5 py-1 text-[11px] font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg transition-colors mr-1 cursor-pointer">
                                Sessions (${t.workSessionsCount})
                            </button>
                            <button type="button" onclick="window.MyMonthlyReport.openTaskDetailModal('${esc(t.id)}')" class="px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
                                Modal
                            </button>
                        </td>
                    </tr>
                    <!-- Expandable Session History Row -->
                    <tr id="mmr-sessions-row-${safeId}" class="hidden bg-slate-50/70 border-b border-slate-200">
                        <td colspan="7" class="px-6 py-3">
                            <div class="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
                                <div class="flex items-center justify-between mb-2">
                                    <h4 class="text-[11px] font-black uppercase text-slate-700 tracking-wide flex items-center gap-1.5">
                                        <iconify-icon icon="solar:history-bold-duotone" class="text-purple-600" width="14"></iconify-icon>
                                        Detailed Work Session History (${sessions.length} Recorded Sessions)
                                    </h4>
                                    <span class="text-[10px] text-slate-400 font-mono">Aggregated Time: ${formatDurationHMS(t.workingTimeSec)}</span>
                                </div>
                                ${sessions.length === 0 ? `
                                    <p class="text-xs text-slate-400 italic py-2">No individual session timestamps recorded.</p>
                                ` : `
                                    <div class="overflow-x-auto">
                                        <table class="w-full text-left text-[11px]">
                                            <thead class="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] border-b border-slate-100">
                                                <tr>
                                                    <th class="px-3 py-1.5">Session #</th>
                                                    <th class="px-3 py-1.5">Work Date</th>
                                                    <th class="px-3 py-1.5">Time Range</th>
                                                    <th class="px-3 py-1.5">Duration</th>
                                                    <th class="px-3 py-1.5">Activity Category</th>
                                                    <th class="px-3 py-1.5">Work Description</th>
                                                    <th class="px-3 py-1.5 text-right">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody class="divide-y divide-slate-100">
                                                ${sessions.map((s, idx) => `
                                                    <tr class="hover:bg-slate-50/50">
                                                        <td class="px-3 py-1.5 font-bold text-slate-700">#${idx + 1}</td>
                                                        <td class="px-3 py-1.5 text-slate-600">${formatDateStr(s.startTime || s.timestamp)}</td>
                                                        <td class="px-3 py-1.5 text-slate-500 font-mono text-[10px]">${formatTimeStr(s.startTime || s.timestamp)} - ${formatTimeStr(s.endTime || (s.startTime + (s.durationSeconds || 0)*1000))}</td>
                                                        <td class="px-3 py-1.5 font-mono font-bold text-purple-700">${formatDurationHMS(getLogDurationSec(s))}</td>
                                                        <td class="px-3 py-1.5 text-slate-700 font-medium">${esc(s.activityCategory || s.activity || 'Production')}</td>
                                                        <td class="px-3 py-1.5 text-slate-600 max-w-[200px] truncate" title="${esc(s.desc || s.workDescription || '')}">${esc(s.desc || s.workDescription || 'Active execution session')}</td>
                                                        <td class="px-3 py-1.5 text-right">
                                                            <span class="px-1.5 py-0.5 rounded text-[9px] font-bold ${s.isLive ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700'}">${s.isLive ? 'Live' : 'Logged'}</span>
                                                        </td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                `}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // Render or update Unstarted Assigned Backlog Section
        let unstartedContainer = getEl('mmr-unstarted-tasks-container');
        if (!unstartedContainer) {
            const tabEl = getEl('mmr-tab-timing');
            if (tabEl) {
                unstartedContainer = document.createElement('div');
                unstartedContainer.id = 'mmr-unstarted-tasks-container';
                unstartedContainer.className = 'mt-6';
                tabEl.appendChild(unstartedContainer);
            }
        }

        if (unstartedContainer) {
            if (unstarted.length === 0) {
                unstartedContainer.innerHTML = `
                    <div class="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3">
                        <div class="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                            <iconify-icon icon="solar:check-circle-bold" width="18"></iconify-icon>
                        </div>
                        <div>
                            <h4 class="text-xs font-bold text-emerald-900">Zero Unstarted Assigned Tasks</h4>
                            <p class="text-[11px] text-emerald-700 mt-0.5">All assigned deliverables for this reporting period have active recorded work sessions.</p>
                        </div>
                    </div>
                `;
            } else {
                unstartedContainer.innerHTML = `
                    <div class="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
                        <div class="p-4 bg-amber-50/60 border-b border-amber-100 flex items-center justify-between">
                            <div class="flex items-center gap-2.5">
                                <div class="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                                    <iconify-icon icon="solar:clock-circle-bold" width="16"></iconify-icon>
                                </div>
                                <div>
                                    <h3 class="text-xs font-black text-amber-950 uppercase tracking-wide">
                                        Unstarted Assigned Backlog (${unstarted.length} Deliverables)
                                    </h3>
                                    <p class="text-[11px] text-amber-800">
                                        Assigned to employee during this period with no recorded working sessions. Excluded from Task-Wise Timing.
                                    </p>
                                </div>
                            </div>
                            <span class="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-900">
                                ${unstarted.length} Pending Start
                            </span>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-left text-xs">
                                <thead class="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100">
                                    <tr>
                                        <th class="px-4 py-2.5">Task ID</th>
                                        <th class="px-4 py-2.5">Task Description</th>
                                        <th class="px-4 py-2.5">Client</th>
                                        <th class="px-4 py-2.5">Source</th>
                                        <th class="px-4 py-2.5">Due Date</th>
                                        <th class="px-4 py-2.5">Current Status</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100">
                                    ${unstarted.map(t => {
                                        const source = t.manual || t.taskType === 'internal' ? 'Internal' : 'Jira';
                                        return `
                                            <tr class="hover:bg-slate-50/60">
                                                <td class="px-4 py-2.5 font-mono font-bold text-purple-700">${esc(t.id)}</td>
                                                <td class="px-4 py-2.5 font-medium text-slate-800">${esc(t.desc || t.title)}</td>
                                                <td class="px-4 py-2.5 text-slate-600">${esc(t.client || 'General')}</td>
                                                <td class="px-4 py-2.5"><span class="px-2 py-0.5 rounded text-[9px] font-bold ${source === 'Jira' ? 'bg-indigo-50 text-indigo-700' : 'bg-fuchsia-50 text-fuchsia-700'}">${source}</span></td>
                                                <td class="px-4 py-2.5 text-slate-500">${formatDateStr(t.dueDate || t.duedate)}</td>
                                                <td class="px-4 py-2.5"><span class="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700">${esc(t.status || 'Assigned')}</span></td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            }
        }
    }

    // ─────────────────────────────────────────────────────────────
    // SUB-TAB: SHOOT & VIDEO PRODUCTION REPORT
    // ─────────────────────────────────────────────────────────────

    function renderShootTab(data) {
        const kpisContainer = getEl('mmr-shoot-kpis');
        const typesContainer = getEl('mmr-shoot-types');
        const tbody = getEl('mmr-shoot-tbody');
        if (!tbody && !kpisContainer) return;

        const shoot = data.shoot || { totalShoots: 0, completedShoots: 0, plannedShoots: 0, totalShootHours: '0.0', shootList: [], shootTypeCounts: {} };

        if (kpisContainer) {
            kpisContainer.innerHTML = `
                <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between">
                    <span class="text-xs font-semibold text-slate-500">Assigned Shoots</span>
                    <div class="text-2xl font-black text-slate-900 mt-1">${shoot.totalShoots}</div>
                    <span class="text-[10px] text-slate-400 mt-1">Production shoots in scope</span>
                </div>
                <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between">
                    <span class="text-xs font-semibold text-emerald-600">Completed Shoots</span>
                    <div class="text-2xl font-black text-emerald-600 mt-1">${shoot.completedShoots}</div>
                    <span class="text-[10px] text-emerald-700 mt-1">${shoot.totalShoots > 0 ? Math.round((shoot.completedShoots / shoot.totalShoots) * 100) : 100}% wrap rate</span>
                </div>
                <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between">
                    <span class="text-xs font-semibold text-purple-600">Total Shoot Hours</span>
                    <div class="text-2xl font-black text-purple-700 mt-1">${shoot.totalShootHours}h</div>
                    <span class="text-[10px] text-purple-600 mt-1">Logged shooting & set focus</span>
                </div>
                <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between">
                    <span class="text-xs font-semibold text-amber-600">Planned / In-Progress</span>
                    <div class="text-2xl font-black text-amber-600 mt-1">${shoot.plannedShoots}</div>
                    <span class="text-[10px] text-amber-700 mt-1">Active shoot pipeline</span>
                </div>
            `;
        }

        if (typesContainer) {
            const types = Object.entries(shoot.shootTypeCounts || {});
            if (types.length === 0) {
                typesContainer.innerHTML = `<span class="text-xs text-slate-400 font-medium">No shoot activity recorded for this period.</span>`;
            } else {
                typesContainer.innerHTML = types.map(([type, cnt]) => `
                    <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-100">
                        <span class="w-2 h-2 rounded-full bg-purple-600"></span>
                        <span class="text-xs font-bold text-slate-800">${esc(type)}:</span>
                        <span class="text-xs font-black text-purple-700">${cnt} shoot${cnt === 1 ? '' : 's'}</span>
                    </div>
                `).join('');
            }
        }

        if (tbody) {
            if (shoot.shootList.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-400 font-medium">No shoot assignments or video production records found for this period.</td></tr>`;
                return;
            }

            tbody.innerHTML = shoot.shootList.map(s => {
                const isDone = s.isCompleted;
                const badgeClass = isDone ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100';
                const teamStr = Array.isArray(s.team) ? s.team.join(', ') : s.team;
                return `
                    <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                        <td class="px-4 py-3 font-mono font-bold text-xs text-purple-700">${esc(s.id)}</td>
                        <td class="px-4 py-3">
                            <p class="font-bold text-xs text-slate-900">${esc(s.title)}</p>
                            <span class="text-[10px] text-slate-400">${esc(s.client)}</span>
                        </td>
                        <td class="px-4 py-3">
                            <span class="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">${esc(s.shootType)}</span>
                        </td>
                        <td class="px-4 py-3 text-xs font-mono text-slate-600">${s.date} ${s.shootTime ? `<span class="text-slate-400 font-normal">(${s.shootTime})</span>` : ''}</td>
                        <td class="px-4 py-3 text-xs text-slate-600 font-medium">${esc(teamStr)}</td>
                        <td class="px-4 py-3 font-mono font-bold text-xs text-purple-700">${s.formattedTime}</td>
                        <td class="px-4 py-3">
                            <span class="px-2.5 py-1 text-[10px] font-bold rounded-lg border ${badgeClass}">${esc(s.status)}</span>
                        </td>
                    </tr>
                `;
            }).join('');
        }
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

    function toggleSessionsRow(safeId) {
        const row = getEl(`mmr-sessions-row-${safeId}`);
        const chevron = getEl(`mmr-chevron-${safeId}`);
        if (!row) return;
        const isHidden = row.classList.contains('hidden');
        if (isHidden) {
            row.classList.remove('hidden');
            if (chevron) chevron.style.transform = 'rotate(180deg)';
        } else {
            row.classList.add('hidden');
            if (chevron) chevron.style.transform = 'rotate(0deg)';
        }
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
        // Sort strictly worked tasks by working time descending (highest time first, matching Task-Wise Timing tab)
        const workedTasksPool = (data.workedTasks && data.workedTasks.length > 0)
            ? data.workedTasks
            : data.allTasks.filter(t => (t.workingTimeSec || 0) > 0 || (t.workSessionsCount || 0) > 0);
        const taskTimingList = [...workedTasksPool].sort((a, b) => {
            const timeDiff = (b.workingTimeSec || 0) - (a.workingTimeSec || 0);
            if (timeDiff !== 0) return timeDiff;
            return (a.id || '').localeCompare(b.id || '');
        });
        const totalTaskSec = k.totalWorkedSeconds || 1;
        const nowStr = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

        // Generate initials for avatar fallback
        const nameParts = (data.employee.name || 'User').trim().split(/\s+/);
        const initials = (nameParts[0][0] + (nameParts.length > 1 ? nameParts[nameParts.length - 1][0] : '')).toUpperCase();

        function renderHeader(sectionName) {
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

        function renderFooter(sectionLabel) {
            return `
                <div class="flex items-center justify-between border-t border-slate-200 pt-2.5 mt-4 text-[9px] text-slate-400 font-medium">
                    <span>Generated on ${nowStr} • OneDesk Reporting Engine</span>
                    <span class="tracking-wide uppercase font-semibold text-slate-500">VilPower Digital Operations • Confidential</span>
                    <span class="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">${esc(sectionLabel)}</span>
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
                background: white !important;
                padding: 0 !important;
            }
            .page-break {
                page-break-before: always !important;
                break-before: page !important;
            }
            .no-print {
                display: none !important;
            }
            .print-page {
                box-shadow: none !important;
                border: none !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
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
        @media screen {
            body {
                background: #f1f5f9;
                padding: 24px 12px;
            }
            .print-page {
                background: #ffffff;
                box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
                border: 1px solid #e2e8f0;
                border-radius: 14px;
                padding: 24px 28px;
                max-width: 960px;
                margin: 0 auto 28px auto;
            }
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            -webkit-font-smoothing: antialiased;
        }
    </style>
</head>
<body class="text-slate-900">

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- SECTION 1: EXECUTIVE OVERVIEW & SCORECARD                     -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <div class="print-page">
        ${renderHeader('Executive Overview & Scorecard')}

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

        <!-- Monthly Highlights -->
        <div class="mb-4">
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
                        Completed <strong>${k.completed}</strong> deliverables out of <strong>${k.totalAssigned}</strong> assigned tasks with an active working investment of <strong>${k.totalWorkingHours} hours</strong>.
                    </p>
                </div>
                <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="w-2 h-2 rounded-full bg-purple-500"></span>
                        <span class="text-[11px] font-black text-slate-800">Quality Benchmark</span>
                    </div>
                    <p class="text-[10px] text-slate-600 leading-relaxed">
                        Maintained a <strong>${k.qcScore !== null ? `${k.qcScore}%` : '100%'}</strong> checklist review score across <strong>${data.qc.totalSubmissions}</strong> formal inspections, upholding quality standards.
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

        <!-- Role-Based Work Activity Breakdown Table -->
        <div>
            <h2 class="text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span class="w-1.5 h-3.5 bg-purple-600 rounded-sm inline-block"></span>
                Role-Based Work Activity Breakdown
            </h2>
            <table class="w-full text-left text-[9px] border border-slate-200 rounded-lg overflow-hidden">
                <thead class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                        <th class="p-2">Work Activity Discipline</th>
                        <th class="p-2 w-28 text-center">Work Sessions</th>
                        <th class="p-2 w-28 text-center">Tasks Handled</th>
                        <th class="p-2 w-28 text-right">Logged Duration</th>
                        <th class="p-2 w-28 text-right">Workload Share</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    ${(!data.activityBreakdown || data.activityBreakdown.length === 0) ? `
                        <tr><td colspan="5" class="p-3 text-center text-slate-400 font-medium">Standard production work logged across assigned deliverables.</td></tr>
                    ` : data.activityBreakdown.map((act, idx) => `
                        <tr class="${idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}">
                            <td class="p-1.5 font-bold text-slate-900 flex items-center gap-1.5">
                                <span class="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block"></span>
                                ${esc(act.name)}
                            </td>
                            <td class="p-1.5 text-center font-semibold text-slate-700">${act.sessionsCount} sessions</td>
                            <td class="p-1.5 text-center text-slate-600">${act.tasksCount} tasks</td>
                            <td class="p-1.5 text-right font-mono font-bold text-slate-900">${act.formattedTime}</td>
                            <td class="p-1.5 text-right">
                                <span class="px-2 py-0.5 rounded text-[8px] font-black bg-purple-50 text-purple-700 border border-purple-100">${act.pct}%</span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        ${renderFooter('Executive Overview • Section 1')}
    </div>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- SECTION 2: TASK-WISE TIMING LIST (MATCHING UI IMAGE 2)       -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <div class="print-page page-break">
        ${renderHeader('Task-Wise Timing List')}

        <div class="flex items-center justify-between mb-3">
            <div>
                <h2 class="text-sm font-black text-slate-900 uppercase tracking-wide">Task-Wise Timing List</h2>
                <p class="text-[10px] text-slate-500">Comprehensive breakdown of all deliverables, active sessions, working time, rework occurrences, and status</p>
            </div>
            <div class="flex items-center gap-2">
                <span class="px-2.5 py-1 text-xs font-black rounded-lg bg-purple-50 text-purple-700 border border-purple-100">
                    ${data.allTasks.length} Total Deliverables
                </span>
                <span class="px-2.5 py-1 text-xs font-black rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                    ${k.totalWorkingHours}h Logged Focus
                </span>
            </div>
        </div>

        <table class="w-full text-left text-[9px] border border-slate-200 rounded-lg overflow-hidden">
            <thead class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                    <th class="p-2">TASK DESCRIPTION</th>
                    <th class="p-2 w-20 text-center">SOURCE</th>
                    <th class="p-2 w-20 text-center">SESSIONS</th>
                    <th class="p-2 w-28 text-center">TOTAL TIME</th>
                    <th class="p-2 w-20 text-center">REWORK</th>
                    <th class="p-2 w-32 text-center">STATUS</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
                ${taskTimingList.length === 0 ? `
                    <tr><td colspan="6" class="p-6 text-center text-slate-400 font-medium">No tasks or timing logs found for this period.</td></tr>
                ` : taskTimingList.map((t, idx) => {
                    const isInternal = t.manual || t.taskType === 'internal';
                    const sourceLabel = isInternal ? 'Internal' : 'Jira';
                    const sourceClass = isInternal ? 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100';
                    const reworkCount = t.reworkCount || 0;
                    return `
                        <tr class="${idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}">
                            <td class="p-2">
                                <div class="font-bold text-slate-900 leading-tight">${esc(t.desc || t.title)}</div>
                                <div class="font-mono text-[8px] text-purple-700 font-semibold mt-0.5">${esc(t.id)}</div>
                            </td>
                            <td class="p-2 text-center">
                                <span class="px-2 py-0.5 rounded text-[8px] font-bold border ${sourceClass}">
                                    ${sourceLabel}
                                </span>
                            </td>
                            <td class="p-2 text-center text-slate-700 font-bold">
                                ${t.workSessionsCount || 0}
                            </td>
                            <td class="p-2 text-center font-mono font-bold text-slate-900">
                                ${formatDurationHMS(t.workingTimeSec)}
                            </td>
                            <td class="p-2 text-center font-bold ${reworkCount > 0 ? 'text-rose-600' : 'text-slate-400'}">
                                ${reworkCount}
                            </td>
                            <td class="p-2 text-center">
                                <span class="px-2.5 py-0.5 rounded-full text-[8px] font-extrabold ${t.isCompleted ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-blue-50 text-blue-700 border border-blue-100'}">
                                    ${esc(t.status || 'Active')}
                                </span>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>

        ${renderFooter('Task-Wise Timing • Section 2')}
    </div>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- SECTION 3: CLIENT-WISE TIME & WORK REPORT                      -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <div class="print-page page-break">
        ${renderHeader('Client-Wise Time & Work Report')}

        <div class="flex items-center justify-between mb-3">
            <div>
                <h2 class="text-sm font-black text-slate-900 uppercase tracking-wide">Client-Wise Time & Work Report</h2>
                <p class="text-[10px] text-slate-500">Breakdown of time investment, active sessions, and deliverable volume across individual client accounts</p>
            </div>
            <div class="flex items-center gap-2">
                <span class="px-2.5 py-1 text-xs font-black rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                    ${clientSummary.clients.length} Active Clients
                </span>
                <span class="px-2.5 py-1 text-xs font-black rounded-lg bg-purple-50 text-purple-700 border border-purple-100">
                    ${formatDurationHM(clientSummary.totalSeconds)} Total Logged
                </span>
            </div>
        </div>

        <table class="w-full text-left text-[9px] border border-slate-200 rounded-lg overflow-hidden">
            <thead class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                    <th class="p-2">CLIENT / ACCOUNT NAME</th>
                    <th class="p-2 w-28 text-center">DELIVERABLES</th>
                    <th class="p-2 w-24 text-center">SESSIONS</th>
                    <th class="p-2 w-28 text-center">COMPLETED</th>
                    <th class="p-2 w-28 text-right">LOGGED TIME</th>
                    <th class="p-2 w-28 text-right">WORK SHARE</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
                ${clientSummary.clients.length === 0 ? `
                    <tr><td colspan="6" class="p-6 text-center text-slate-400 font-medium">No client work recorded for this reporting period.</td></tr>
                ` : clientSummary.clients.map((c, idx) => `
                    <tr class="${idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}">
                        <td class="p-2 font-bold text-slate-900">${esc(c.name)}</td>
                        <td class="p-2 text-center font-semibold text-slate-700">${c.tasksCount} tasks</td>
                        <td class="p-2 text-center text-slate-600">${c.sessionsCount} sessions</td>
                        <td class="p-2 text-center">
                            <span class="px-2 py-0.5 rounded text-[8px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">${c.completedCount} done</span>
                        </td>
                        <td class="p-2 text-right font-mono font-bold text-slate-900">${c.formattedTime}</td>
                        <td class="p-2 text-right">
                            <span class="px-2 py-0.5 rounded text-[8px] font-black bg-indigo-50 text-indigo-700 border border-indigo-100">${c.pct}%</span>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        ${renderFooter('Client-Wise Report • Section 3')}
    </div>

    ${(data.shoot && data.shoot.totalShoots > 0) ? `
    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- SECTION 4: SHOOT & VIDEO PRODUCTION REPORT                     -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <div class="print-page page-break">
        ${renderHeader('Shoot & Video Production Report')}

        <div class="flex items-center justify-between mb-3">
            <div>
                <h2 class="text-sm font-black text-slate-900 uppercase tracking-wide">Shoot & Video Production Report</h2>
                <p class="text-[10px] text-slate-500">Dedicated on-site shoots, studio sessions, product photography, and production crew participation</p>
            </div>
            <div class="flex items-center gap-2">
                <span class="px-2.5 py-1 text-xs font-black rounded-lg bg-purple-50 text-purple-700 border border-purple-100">
                    ${data.shoot.totalShoots} Total Shoots
                </span>
                <span class="px-2.5 py-1 text-xs font-black rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                    ${data.shoot.completedShoots} Completed
                </span>
                <span class="px-2.5 py-1 text-xs font-black rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                    ${data.shoot.totalShootHours}h Shoot Duration
                </span>
            </div>
        </div>

        <table class="w-full text-left text-[9px] border border-slate-200 rounded-lg overflow-hidden">
            <thead class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                    <th class="p-2 w-24">SHOOT ID</th>
                    <th class="p-2">SHOOT TITLE & CLIENT</th>
                    <th class="p-2 w-28">SHOOT TYPE</th>
                    <th class="p-2 w-28">DATE & TIME</th>
                    <th class="p-2 w-32">CREW INVOLVED</th>
                    <th class="p-2 w-24 text-center">DURATION</th>
                    <th class="p-2 w-28 text-center">STATUS</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
                ${data.shoot.shootList.map((s, idx) => `
                    <tr class="${idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}">
                        <td class="p-2 font-mono font-bold text-purple-700">${esc(s.id)}</td>
                        <td class="p-2">
                            <div class="font-bold text-slate-900">${esc(s.title)}</div>
                            <div class="text-[8px] text-slate-400 font-medium">${esc(s.client)}</div>
                        </td>
                        <td class="p-2">
                            <span class="px-2 py-0.5 rounded text-[8px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">${esc(s.shootType)}</span>
                        </td>
                        <td class="p-2 text-slate-600 font-mono">${s.date} ${s.shootTime ? `<span class="text-slate-400">(${s.shootTime})</span>` : ''}</td>
                        <td class="p-2 text-slate-600 font-medium">${esc(Array.isArray(s.team) ? s.team.join(', ') : s.team)}</td>
                        <td class="p-2 text-center font-mono font-bold text-slate-900">${s.formattedTime}</td>
                        <td class="p-2 text-center">
                            <span class="px-2 py-0.5 rounded text-[8px] font-bold ${s.isCompleted ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}">${esc(s.status)}</span>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        ${renderFooter('Shoot & Production • Section 4')}
    </div>
    ` : ''}

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- SECTION 5: OVERALL QUALITY SCORE & REWORK / REVISIONS         -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <div class="print-page page-break">
        ${renderHeader('Overall Quality Score & Rework')}

        <!-- 3A: Overall Quality Score -->
        <div class="mb-5">
            <div class="flex items-center justify-between mb-2">
                <div>
                    <h2 class="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                        <span class="w-1.5 h-3.5 bg-violet-600 rounded-sm inline-block"></span>
                        Overall Quality Score & QC Review Scorecard
                    </h2>
                    <p class="text-[9px] text-slate-500">Audited deliverable reviews, checklist pass rates, mistake categorization, and reviewer evaluation</p>
                </div>
            </div>

            <!-- Mini Scorecard -->
            <div class="grid grid-cols-4 gap-2 mb-3">
                <div class="p-2.5 bg-violet-50/50 border border-violet-100 rounded-lg text-center">
                    <span class="text-[8px] font-bold text-violet-500 uppercase block">Overall QC Score</span>
                    <span class="text-xl font-black text-violet-700">${k.qcScore !== null ? `${k.qcScore}%` : '100%'}</span>
                </div>
                <div class="p-2.5 bg-emerald-50/50 border border-emerald-100 rounded-lg text-center">
                    <span class="text-[8px] font-bold text-emerald-500 uppercase block">First-Pass Rate</span>
                    <span class="text-xl font-black text-emerald-700">${data.qc.passPct !== null ? `${data.qc.passPct}%` : '100%'}</span>
                </div>
                <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
                    <span class="text-[8px] font-bold text-slate-500 uppercase block">Total Submissions</span>
                    <span class="text-xl font-black text-slate-800">${data.qc.totalSubmissions}</span>
                </div>
                <div class="p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-lg text-center">
                    <span class="text-[8px] font-bold text-indigo-500 uppercase block">Reviewer Rating</span>
                    <span class="text-xl font-black text-indigo-700">${data.qc.avgRating || '5.0'} / 5.0</span>
                </div>
            </div>

            <!-- QC Submissions / Failures Log -->
            <table class="w-full text-left text-[9px] border border-slate-200 rounded-lg overflow-hidden">
                <thead class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                        <th class="p-1.5 w-20">Task ID</th>
                        <th class="p-1.5">Deliverable Title</th>
                        <th class="p-1.5 w-20">Date</th>
                        <th class="p-1.5 w-24">Reviewer</th>
                        <th class="p-1.5 w-28">Mistake Category</th>
                        <th class="p-1.5">Required Corrections</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    ${data.qc.failedDetails.length === 0 ? `
                        <tr><td colspan="6" class="p-3 text-center text-slate-400 font-medium">Zero recorded QC rejections in this period. Flawless deliverable quality maintained!</td></tr>
                    ` : data.qc.failedDetails.map((f, idx) => `
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

        <!-- 3B: Rework & Revisions Analysis -->
        <div>
            <div class="flex items-center justify-between mb-2">
                <div>
                    <h2 class="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                        <span class="w-1.5 h-3.5 bg-rose-600 rounded-sm inline-block"></span>
                        Rework & Revision Analysis
                    </h2>
                    <p class="text-[9px] text-slate-500">Deliverables requiring multiple revision loops, internal QC flags, and client-requested corrections</p>
                </div>
            </div>

            <div class="grid grid-cols-4 gap-2 mb-3">
                <div class="p-2.5 bg-rose-50/50 border border-rose-100 rounded-lg text-center">
                    <span class="text-[8px] font-bold text-rose-500 uppercase block">Rework Deliverables</span>
                    <span class="text-xl font-black text-rose-700">${data.rework.totalTasks}</span>
                </div>
                <div class="p-2.5 bg-amber-50/50 border border-amber-100 rounded-lg text-center">
                    <span class="text-[8px] font-bold text-amber-500 uppercase block">Total Rework Loops</span>
                    <span class="text-xl font-black text-amber-700">${data.rework.totalOccurrences}</span>
                </div>
                <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
                    <span class="text-[8px] font-bold text-slate-500 uppercase block">Internal QC Flags</span>
                    <span class="text-xl font-black text-slate-800">${data.rework.internalQcRework}</span>
                </div>
                <div class="p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-lg text-center">
                    <span class="text-[8px] font-bold text-indigo-500 uppercase block">Client Revisions</span>
                    <span class="text-xl font-black text-indigo-700">${data.rework.clientRevisions}</span>
                </div>
            </div>

            <table class="w-full text-left text-[9px] border border-slate-200 rounded-lg overflow-hidden">
                <thead class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                        <th class="p-1.5 w-24">Task ID</th>
                        <th class="p-1.5">Deliverable Title</th>
                        <th class="p-1.5 w-24 text-center">Rework Loops</th>
                        <th class="p-1.5 w-28 text-center">Current Status</th>
                        <th class="p-1.5 w-24 text-right">Logged Effort</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    ${data.rework.reworkTaskList.length === 0 ? `
                        <tr><td colspan="5" class="p-3 text-center text-slate-400 font-medium">Zero rework loops recorded during this period.</td></tr>
                    ` : data.rework.reworkTaskList.map((t, idx) => `
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

        ${renderFooter('Overall Quality & Rework • Section 5')}
    </div>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- SECTION 6: ATTENDANCE WITH BREAK DISTRIBUTION                 -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <div class="print-page page-break">
        ${renderHeader('Attendance with Break Distribution')}

        <div class="mb-3">
            <div class="flex items-center justify-between mb-2">
                <div>
                    <h2 class="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                        <span class="w-1.5 h-3.5 bg-teal-600 rounded-sm inline-block"></span>
                        Attendance, Working Hours & Break Distribution
                    </h2>
                    <p class="text-[9px] text-slate-500">Daily punch records, first check-in, last check-out, active hours, and total break intervals</p>
                </div>
            </div>

            <!-- Metrics Grid (6 columns) -->
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
                    <span class="text-[8px] font-bold text-purple-600 uppercase block">Total Break Time</span>
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

            <!-- Full Day-by-Day Attendance Record Table -->
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
                    ` : Object.values(data.dailyAttendanceMap).map((day, idx) => {
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

        ${renderFooter('Attendance with Break • Section 6')}
    </div>

    <!-- ══════════════════════════════════════════════════════════════ -->
    <!-- SECTION 7: AI INSIGHTS, GOALS & FORMAL APPRAISAL SIGN-OFF    -->
    <!-- ══════════════════════════════════════════════════════════════ -->
    <div class="print-page page-break">
        ${renderHeader('AI Insights & Appraisal')}

        <!-- AI Performance Insights -->
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

        <!-- Monthly OKRs & Goals -->
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

        ${renderFooter('AI Insights & Appraisal • Section 7')}
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
        csvContent += 'Task ID,Source,Task Type,Title,Client,Priority,Status,Created Date,Due Date,Working Time (HMS),Working Seconds,Work Sessions,Rework Count\n';

        data.allTasks.forEach(t => {
            const source = t.manual || t.taskType === 'internal' ? 'Internal' : 'Jira';
            const taskType = taskWorkTypes(t).join(' + ');
            const cleanTitle = `"${(t.desc || t.title || '').replace(/"/g, '""')}"`;
            const cleanClient = `"${(t.client || '').replace(/"/g, '""')}"`;
            csvContent += `${t.id},${source},"${taskType}",${cleanTitle},${cleanClient},${t.priority || 'Medium'},${t.status || 'Active'},${t.created || ''},${t.duedate || ''},${formatDurationHMS(t.workingTimeSec)},${t.workingTimeSec},${t.workSessionsCount},${t.reworkCount || 0}\n`;
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

    function toggleClientRow(safeKey) {
        const row = getEl(`mmr-client-tasks-row-${safeKey}`);
        const chevron = getEl(`mmr-client-chevron-${safeKey}`);
        if (!row) return;
        const isHidden = row.classList.contains('hidden');
        if (isHidden) {
            row.classList.remove('hidden');
            if (chevron) chevron.style.transform = 'rotate(180deg)';
        } else {
            row.classList.add('hidden');
            if (chevron) chevron.style.transform = 'rotate(0deg)';
        }
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
        const topClientByTime = clientsList.length > 0 ? clientsList[0].name : 'None';
        const topClientTime = clientsList.length > 0 ? formatDurationHM(clientsList[0].totalSeconds) : '0h 0m';
        const mostActiveClientByTasks = [...clientsList].sort((a, b) => b.tasks.length - a.tasks.length)[0]?.name || 'None';
        const mostActiveTaskCount = [...clientsList].sort((a, b) => b.tasks.length - a.tasks.length)[0]?.tasks.length || 0;
        const avgSeconds = totalClients > 0 ? Math.round(totalClientSeconds / totalClients) : 0;
        const totalSessions = clientsList.reduce((acc, c) => acc + c.sessionsCount, 0);

        const kpisContainer = getEl('mmr-client-timing-kpis');
        if (kpisContainer) {
            kpisContainer.innerHTML = `
                <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <span class="text-xs font-semibold text-slate-500">Active Clients</span>
                        <p class="text-2xl font-black text-slate-900 mt-1">${totalClients}</p>
                        <p class="text-[11px] text-slate-400 mt-0.5">${totalSessions} total work sessions</p>
                    </div>
                    <div class="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                        <iconify-icon icon="solar:buildings-bold-duotone" width="22"></iconify-icon>
                    </div>
                </div>
                <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <span class="text-xs font-semibold text-slate-500">Top Client (Time)</span>
                        <p class="text-xl font-black text-slate-900 mt-1 truncate max-w-[140px]">${esc(topClientByTime)}</p>
                        <p class="text-[11px] text-purple-600 font-bold mt-0.5">${topClientTime} logged</p>
                    </div>
                    <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <iconify-icon icon="solar:star-fall-bold-duotone" width="22"></iconify-icon>
                    </div>
                </div>
                <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <span class="text-xs font-semibold text-slate-500">Most Active (Tasks)</span>
                        <p class="text-xl font-black text-slate-900 mt-1 truncate max-w-[140px]">${esc(mostActiveClientByTasks)}</p>
                        <p class="text-[11px] text-indigo-600 font-bold mt-0.5">${mostActiveTaskCount} deliverables</p>
                    </div>
                    <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <iconify-icon icon="solar:checklist-minimalistic-bold-duotone" width="22"></iconify-icon>
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
            `;
        }

        // Render or update Visual Analytics Charts container
        let chartsContainer = getEl('mmr-client-charts-container');
        if (!chartsContainer) {
            const tabEl = getEl('mmr-tab-client-timing');
            const tableCard = tabEl ? tabEl.querySelector('.bg-white.rounded-2xl.border') : null;
            if (tabEl && tableCard) {
                chartsContainer = document.createElement('div');
                chartsContainer.id = 'mmr-client-charts-container';
                chartsContainer.className = 'grid grid-cols-1 md:grid-cols-2 gap-4 my-2';
                tabEl.insertBefore(chartsContainer, tableCard);
            }
        }

        if (chartsContainer) {
            chartsContainer.innerHTML = `
                <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col">
                    <div class="flex items-center justify-between mb-3">
                        <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <iconify-icon icon="solar:pie-chart-2-bold-duotone" class="text-purple-600" width="16"></iconify-icon>
                            Client Contribution Share
                        </h4>
                        <span class="text-[10px] text-slate-400 font-mono">By Working Hours</span>
                    </div>
                    <div class="relative h-56 flex items-center justify-center">
                        <canvas id="mmr-chart-client-donut"></canvas>
                    </div>
                </div>
                <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col">
                    <div class="flex items-center justify-between mb-3">
                        <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <iconify-icon icon="solar:chart-square-bold-duotone" class="text-indigo-600" width="16"></iconify-icon>
                            Client Working Hours Allocation
                        </h4>
                        <span class="text-[10px] text-slate-400 font-mono">Ranked by Duration</span>
                    </div>
                    <div class="relative h-56 flex items-center justify-center">
                        <canvas id="mmr-chart-client-bars"></canvas>
                    </div>
                </div>
            `;

            // Draw Charts if Chart.js is present
            if (typeof Chart !== 'undefined' && clientsList.length > 0) {
                if (MMR.charts.clientDonut) { try { MMR.charts.clientDonut.destroy(); } catch (e) { } }
                if (MMR.charts.clientBars) { try { MMR.charts.clientBars.destroy(); } catch (e) { } }

                const top5 = clientsList.slice(0, 5);
                const otherSec = clientsList.slice(5).reduce((acc, c) => acc + c.totalSeconds, 0);
                const donutLabels = top5.map(c => c.name);
                const donutData = top5.map(c => +(c.totalSeconds / 3600).toFixed(2));
                if (otherSec > 0) {
                    donutLabels.push('Other Clients');
                    donutData.push(+(otherSec / 3600).toFixed(2));
                }

                const donutCtx = getEl('mmr-chart-client-donut')?.getContext('2d');
                if (donutCtx && donutData.length > 0) {
                    MMR.charts.clientDonut = new Chart(donutCtx, {
                        type: 'doughnut',
                        data: {
                            labels: donutLabels,
                            datasets: [{
                                data: donutData,
                                backgroundColor: ['#7c3aed', '#6366f1', '#0d9488', '#f59e0b', '#ec4899', '#94a3b8'],
                                borderWidth: 2,
                                borderColor: '#ffffff'
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }
                            },
                            cutout: '65%'
                        }
                    });
                }

                const barCtx = getEl('mmr-chart-client-bars')?.getContext('2d');
                if (barCtx && clientsList.length > 0) {
                    const barLabels = clientsList.slice(0, 7).map(c => c.name);
                    const barData = clientsList.slice(0, 7).map(c => +(c.totalSeconds / 3600).toFixed(2));
                    MMR.charts.clientBars = new Chart(barCtx, {
                        type: 'bar',
                        data: {
                            labels: barLabels,
                            datasets: [{
                                label: 'Hours Worked',
                                data: barData,
                                backgroundColor: '#6366f1',
                                borderRadius: 6
                            }]
                        },
                        options: {
                            indexAxis: 'y',
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                x: { grid: { display: false }, ticks: { font: { size: 9 } } },
                                y: { grid: { display: false }, ticks: { font: { size: 10 } } }
                            },
                            plugins: { legend: { display: false } }
                        }
                    });
                }
            }
        }

        const badgeEl = getEl('mmr-client-total-badge');
        if (badgeEl) badgeEl.textContent = `${totalClients} Client${totalClients === 1 ? '' : 's'}`;

        // 3. Table rows with inline accordion for deliverables
        const tbody = getEl('mmr-client-timing-tbody');
        if (tbody) {
            const thead = (typeof tbody.closest === 'function') ? tbody.closest('table')?.querySelector('thead') : null;
            if (thead) {
                thead.innerHTML = `
                    <tr>
                        <th class="px-4 py-3">Client</th>
                        <th class="px-4 py-3 text-center">Tasks (Worked / Total)</th>
                        <th class="px-4 py-3 text-center">Sessions</th>
                        <th class="px-4 py-3">Total Time</th>
                        <th class="px-4 py-3">Work Share</th>
                        <th class="px-4 py-3 text-center">Rework</th>
                        <th class="px-4 py-3 text-center">Completed</th>
                        <th class="px-4 py-3 text-right">Deliverables</th>
                    </tr>
                `;
            }

            if (clientsList.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="px-4 py-8 text-center text-slate-400 font-medium">No client task timing records for this period.</td></tr>';
            } else {
                tbody.innerHTML = clientsList.map(c => {
                    const pct = totalClientSeconds > 0 ? Math.round((c.totalSeconds / totalClientSeconds) * 100) : 0;
                    const safeKey = esc(c.name).replace(/[^a-zA-Z0-9_-]/g, '_');
                    const workedCount = c.tasks.filter(t => (t.workingTimeSec || 0) > 0 || (t.workSessionsCount || 0) > 0).length;
                    const reworkCount = c.tasks.reduce((sum, t) => sum + (t.reworkCount || 0), 0);

                    return `
                        <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                            <td class="px-4 py-3">
                                <div class="flex items-center gap-2.5">
                                    <button type="button" onclick="window.MyMonthlyReport.toggleClientRow('${safeKey}')" class="text-slate-400 hover:text-purple-600 transition-colors p-1" title="Toggle Deliverables">
                                        <iconify-icon id="mmr-client-chevron-${safeKey}" icon="solar:alt-arrow-down-bold" width="14" class="transition-transform duration-200"></iconify-icon>
                                    </button>
                                    <div class="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 font-black text-xs flex items-center justify-center shrink-0">
                                        ${esc((c.name || 'G').charAt(0).toUpperCase())}
                                    </div>
                                    <span class="font-bold text-slate-900">${esc(c.name)}</span>
                                </div>
                            </td>
                            <td class="px-4 py-3 text-center font-semibold text-slate-700">
                                <span class="font-bold text-slate-900">${workedCount}</span>
                                <span class="text-slate-400"> / ${c.tasks.length}</span>
                            </td>
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
                            <td class="px-4 py-3 text-center font-bold ${reworkCount > 0 ? 'text-rose-600' : 'text-slate-400'}">
                                ${reworkCount}
                            </td>
                            <td class="px-4 py-3 text-center">
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${c.completedCount === c.tasks.length && c.tasks.length > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}">
                                    ${c.completedCount} / ${c.tasks.length}
                                </span>
                            </td>
                            <td class="px-4 py-3 text-right whitespace-nowrap">
                                <button type="button" onclick="window.MyMonthlyReport.toggleClientRow('${safeKey}')" class="px-2.5 py-1 text-[11px] font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer">
                                    Deliverables (${c.tasks.length})
                                </button>
                            </td>
                        </tr>
                        <!-- Expandable Client Deliverables Accordion Row -->
                        <tr id="mmr-client-tasks-row-${safeKey}" class="hidden bg-slate-50/70 border-b border-slate-200">
                            <td colspan="8" class="px-6 py-3">
                                <div class="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
                                    <div class="flex items-center justify-between mb-2">
                                        <h4 class="text-[11px] font-black uppercase text-slate-700 tracking-wide flex items-center gap-1.5">
                                            <iconify-icon icon="solar:folder-with-files-bold-duotone" class="text-purple-600" width="14"></iconify-icon>
                                            ${esc(c.name)} Deliverables & Work Sessions (${c.tasks.length} Total Tasks)
                                        </h4>
                                        <span class="text-[10px] text-slate-400 font-mono">Logged Hours: ${formatDurationHM(c.totalSeconds)}</span>
                                    </div>
                                    ${c.tasks.length === 0 ? `
                                        <p class="text-xs text-slate-400 italic py-2">No tasks mapped to this client.</p>
                                    ` : `
                                        <div class="overflow-x-auto">
                                            <table class="w-full text-left text-[11px]">
                                                <thead class="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] border-b border-slate-100">
                                                    <tr>
                                                        <th class="px-3 py-1.5">Task ID</th>
                                                        <th class="px-3 py-1.5">Task Description</th>
                                                        <th class="px-3 py-1.5">Source</th>
                                                        <th class="px-3 py-1.5">Status</th>
                                                        <th class="px-3 py-1.5">Due Date</th>
                                                        <th class="px-3 py-1.5 text-center">Sessions</th>
                                                        <th class="px-3 py-1.5">Duration</th>
                                                        <th class="px-3 py-1.5 text-center">Rework</th>
                                                        <th class="px-3 py-1.5 text-right">Details</th>
                                                    </tr>
                                                </thead>
                                                <tbody class="divide-y divide-slate-100">
                                                    ${c.tasks.map(t => {
                                                        const src = t.manual || t.taskType === 'internal' ? 'Internal' : 'Jira';
                                                        return `
                                                            <tr class="hover:bg-slate-50/50">
                                                                <td class="px-3 py-1.5 font-mono font-bold text-purple-700">${esc(t.id)}</td>
                                                                <td class="px-3 py-1.5 font-medium text-slate-800">${esc(t.desc || t.title)}</td>
                                                                <td class="px-3 py-1.5">
                                                                    <span class="px-1.5 py-0.5 rounded text-[9px] font-bold ${src === 'Jira' ? 'bg-indigo-50 text-indigo-700' : 'bg-fuchsia-50 text-fuchsia-700'}">${src}</span>
                                                                </td>
                                                                <td class="px-3 py-1.5">
                                                                    <span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700">${esc(t.status || 'Active')}</span>
                                                                </td>
                                                                <td class="px-3 py-1.5 text-slate-500">${formatDateStr(t.dueDate || t.duedate)}</td>
                                                                <td class="px-3 py-1.5 text-center font-bold text-slate-700">${t.workSessionsCount || 0}</td>
                                                                <td class="px-3 py-1.5 font-mono font-bold text-purple-700">${formatDurationHMS(t.workingTimeSec || 0)}</td>
                                                                <td class="px-3 py-1.5 text-center font-bold ${(t.reworkCount || 0) > 0 ? 'text-rose-600' : 'text-slate-400'}">${t.reworkCount || 0}</td>
                                                                <td class="px-3 py-1.5 text-right">
                                                                    <button type="button" onclick="window.MyMonthlyReport.openTaskDetailModal('${esc(t.id)}')" class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 hover:bg-purple-100">
                                                                        Sessions
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        `;
                                                    }).join('')}
                                                </tbody>
                                            </table>
                                        </div>
                                    `}
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('');
            }
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
        const rawEmployees = Engine.getAllEmployees();

        // De-duplicate employees strictly by normalized canonical email
        const seenEmails = new Set();
        const employees = [];
        rawEmployees.forEach(emp => {
            const norm = Engine.normalizeEmail(emp.email);
            if (!norm || seenEmails.has(norm)) return;
            seenEmails.add(norm);
            employees.push({ ...emp, email: norm });
        });

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

            const now = new Date();
            if (preset === 'prev_month') {
                const prevD = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                MMR.selectedYear = prevD.getFullYear();
                MMR.selectedMonth = prevD.getMonth() + 1;
            } else if (preset === 'current_month') {
                MMR.selectedYear = now.getFullYear();
                MMR.selectedMonth = now.getMonth() + 1;
            }

            const monthSelect = getEl('mmr-custom-month-select');
            if (monthSelect) monthSelect.value = String(MMR.selectedMonth);
            const yearSelect = getEl('mmr-custom-year-select');
            if (yearSelect) yearSelect.value = String(MMR.selectedYear);

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
            MMR.taskSearchTerm = '';
            MMR.taskStatusFilter = 'all';
            MMR.taskTypeFilter = 'all';
            const typeFilterEl = getEl('mmr-task-type-filter');
            if (typeFilterEl) typeFilterEl.value = 'all';
            const statusFilterEl = getEl('mmr-task-status-filter');
            if (statusFilterEl) statusFilterEl.value = 'all';
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
        handleTaskTypeFilter: function (typeVal) {
            MMR.taskTypeFilter = typeVal;
            if (MMR.cachedReportData) renderJiraTab(MMR.cachedReportData);
        },
        detectTaskType: detectTaskType,
        TASK_TYPES: TASK_TYPES,
        handleInternalCategoryFilter: function (catVal) {
            MMR.internalCategoryFilter = catVal;
            if (MMR.cachedReportData) renderInternalTab(MMR.cachedReportData);
        },
        handleQcCategoryFilter: function (catVal) {
            MMR.qcCategoryFilter = catVal;
            if (MMR.cachedReportData) renderQcTab(MMR.cachedReportData);
        },
        toggleSessionsRow: toggleSessionsRow,
        toggleClientRow: toggleClientRow,
        renderShootTab: renderShootTab,
        openTaskDetailModal: openTaskDetailModal,
        closeTaskDetailModal: closeTaskDetailModal,
        exportPdf: exportReportAsPdf,
        exportExcel: exportDetailedTaskReportExcel,
        exportAttendanceCsv: exportAttendanceReportCsv,
        exportQcCsv: exportQcFailureReportCsv
    };

})(typeof window !== 'undefined' ? window : this);
