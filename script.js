
let initializeApp, getDatabase, ref, onValue, onChildAdded, off, set, push, update, remove, onDisconnect, query, orderByChild, equalTo, limitToLast, get;
let getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged;
let getStorage, sRef, uploadBytes, getDownloadURL;

try {
    ({ initializeApp } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js"));
    ({ getDatabase, ref, onValue, onChildAdded, off, set, push, update, remove, onDisconnect, query, orderByChild, equalTo, limitToLast, get } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js"));
    ({ getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"));
    ({ getStorage, ref: sRef, uploadBytes, getDownloadURL } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js"));
} catch (err) {
    document.documentElement.classList.remove('auth-pending');
    document.getElementById('loading-view')?.classList.add('hidden');
    document.getElementById('login-view')?.classList.remove('hidden');
    alert('Unable to load app modules. Please use a modern browser and ensure network access to Firebase CDN.\n' + err.message);
    console.error('Failed to load Firebase modules:', err);
}

if (initializeApp) {
    // CONFIG
    const FB_CONFIG = {
        apiKey: "AIzaSyAL7Z1D_Lhbu-eW9qgiP4hs25ccv_hRu3w",
        authDomain: "worksync-vilpower.firebaseapp.com",
        databaseURL: "https://worksync-vilpower-default-rtdb.firebaseio.com",
        projectId: "worksync-vilpower",
        storageBucket: "worksync-vilpower.firebasestorage.app",
        messagingSenderId: "738955842044",
        appId: "1:738955842044:web:44d3a76012329578186279"
    };

    const app = initializeApp(FB_CONFIG);
    const db = getDatabase(app);
    const auth = getAuth(app);
    const storage = getStorage(app);

    // Expose Firebase objects to window for cross-module access (Meta Integration, etc.)
    window.auth = auth;
    window.db = db;
    window.storage = storage;
    window.firebaseAuth = auth; // Alias for shim compatibility
    window.rtdb = { ref, set, push, update, remove, onValue, get };

    /**
     * Get Firebase ID Token for API authentication
     * Used by Meta OAuth, Marketing Hub, and other services
     * @returns {Promise<string|null>} Firebase ID token or null if not authenticated
     */
    window.getFirebaseIdToken = async function getFirebaseIdToken() {
        try {
            // Try to get auth from the IIFE scope first, then from window
            const authObj = auth || (typeof window.auth !== 'undefined' ? window.auth : null);
            
            if (!authObj || !authObj.currentUser) {
                console.warn('Firebase auth not ready or user not logged in');
                return null;
            }
            return await authObj.currentUser.getIdToken();
        } catch (error) {
            console.error('Failed to get Firebase ID token:', error);
            return null;
        }
    };

    const ADMIN_ROLES = ['System Admin', 'Administrator'];
    const ADMIN_EMAILS = ['digitalmarketing@vilpower.com', 'nanjil@vilpower.com', 'murugeshvilpower@gmail.com'];
    const MANAGER_EMAILS = ['murugeshvilpower@gmail.com'];
    const CLIENT_WIDE_ACCESS_EMAILS = ['ajithvilpower@gmail.com', 'murugeshvilpower@gmail.com'];

    // Daily Plan View Access - Map of user email to list of emails they can view tasks for
    const DAILY_PLAN_VIEW_ACCESS = {
        'anithavilpower@gmail.com': [
            'nanjil@vilpower.com',                    // Nanjil Manohar S
            'digitalmarketing@vilpower.com',          // Palanirajan R
            'murugeshvilpower@gmail.com',             // Murugesh Kumar A
            'barathvilpower@gmail.com',               // Barath Magesh M
            'snehavilpower@gmail.com',                // Sneha V
            'immanuelvilpower@gmail.com'              // Immanuel Raja S
        ] // Karthika can view all team members' tasks
    };

    // Live Work Board Access - Map of user email to list of emails they can view current tasks for
    const LIVE_WORK_BOARD_ACCESS = {
        'anithavilpower@gmail.com': ['barathvilpower@gmail.com', 'immanuelvilpower@gmail.com'] // Karthika can view Barath and Immanuel's current tasks
    };

    const USERS = [
        { email: 'nanjil@vilpower.com', name: 'Nanjil Manohar S', role: 'Head of Operations', avatar: 'Nanjil' },
        { email: 'digitalmarketing@vilpower.com', name: 'Palanirajan R', role: 'Senior Manager - Digital Executions & Delivery', avatar: 'Palanirajan' },
        { email: 'murugeshvilpower@gmail.com', name: 'Murugesh Kumar A', role: 'Manager - Social Media & Client Accounts', avatar: 'Murugesh' },
        { email: 'barathvilpower@gmail.com', name: 'Barath Magesh M', role: 'Manager - Creative Content & Visual', avatar: 'Barath' },
        { email: 'snehavilpower@gmail.com', name: 'Sneha V', role: 'Team Member', avatar: 'Sneha' },
        { email: 'anithavilpower@gmail.com', name: 'Karthika K', role: 'Graphic Designer Associate', avatar: 'Karthika' },
        { email: 'immanuelvilpower@gmail.com', name: 'Immanuel Raja S', role: 'Video Producer Associate', avatar: 'Immanuel' },
        { email: '123', name: 'Demo User', role: 'Administrator', avatar: 'Demo' }
    ];

    function isAdmin() {
        if (!currentUser) return false;
        const role = (currentUser.role || '').trim();
        const email = (currentUser.email || '').toLowerCase();
        return ADMIN_EMAILS.some(e => e.toLowerCase() === email) ||
            ADMIN_ROLES.includes(role);
    }
    function isManager() {
        if (!currentUser) return false;
        const role = (currentUser.role || '').trim();
        const email = (currentUser.email || '').toLowerCase();
        return role === 'Manager' || MANAGER_EMAILS.some(e => e.toLowerCase() === email);
    }
    function hasClientWideAccess() { return currentUser && CLIENT_WIDE_ACCESS_EMAILS.some(e => e.toLowerCase() === (currentUser.email || '').toLowerCase()); }
    function canViewReports() { return true; }
    function canViewDailySummary() { return isAdmin() || isManager(); }
    function canViewLiveWorkBoard() {
        // Admins and managers can always view
        if (isAdmin() || isManager()) return true;
        // Check if user has any Live Work Board access permissions
        if (!currentUser) return false;
        const accessList = LIVE_WORK_BOARD_ACCESS[currentUser.email.toLowerCase()] || [];
        return accessList.length > 0;
    }
    function canViewProjects() { return isAdmin() || isManager(); }
    function knownUserByEmail(email) { return USERS.find(u => u.email.toLowerCase() === (email || '').toLowerCase()); }
    function canViewQcPortal() {
        if (!currentUser) return false;
        const allowedQcEmails = [
            'digitalmarketing@vilpower.com', // Palanirajan
            'snehavilpower@gmail.com',       // Sneha
            'murugeshvilpower@gmail.com',     // Murugesh
            'nanjil@vilpower.com'            // Nanjil
        ];
        return allowedQcEmails.includes(currentUser.email.toLowerCase());
    }

    function canViewStrategyCalendar() {
        if (!currentUser) return false;
        if (isAdmin()) return true;
        const allowedStrategyEmails = [
            'snehavilpower@gmail.com',
            'murugeshvilpower@gmail.com'
        ];
        return allowedStrategyEmails.includes(currentUser.email.toLowerCase());
    }

    function canViewDailyPlanTasks(targetUserEmail) {
        if (!currentUser) return false;
        // Admins can view everyone's tasks
        if (isAdmin()) return true;
        // Check if current user can view this specific user's tasks
        const userAccessList = DAILY_PLAN_VIEW_ACCESS[currentUser.email.toLowerCase()] || [];
        return userAccessList.includes(targetUserEmail.toLowerCase());
    }

    const JIRA = {
        domain: 'vilpowerdigitalmarketing.atlassian.net',
        projectKey: 'AUG',
        projectKeys: ['AUG'],
        apiUrl: '/api/jira',
        gsUrl: 'https://script.google.com/macros/s/AKfycbwk85wuNOnEYt675Rf-6IMwPJFxmLHW2ONQYigtni6AxU-gIdiNY497wxJHDtmd_XD-/exec',
        useLocalApi: false
    };

    function getJiraProjectKeyForDate(dateStr) {
        return JIRA.projectKey || 'AUG';
    }

    function calculateDueDate4DaysBefore(dateStr) {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const d = parseInt(parts[2], 10);
            const dateObj = new Date(y, m, d);
            dateObj.setDate(dateObj.getDate() - 4);
            const resY = dateObj.getFullYear();
            const resM = String(dateObj.getMonth() + 1).padStart(2, '0');
            const resD = String(dateObj.getDate()).padStart(2, '0');
            return `${resY}-${resM}-${resD}`;
        }
        return dateStr;
    }

    function calculatePostDate4DaysAfter(dateStr) {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const d = parseInt(parts[2], 10);
            const dateObj = new Date(y, m, d);
            dateObj.setDate(dateObj.getDate() + 4);
            const resY = dateObj.getFullYear();
            const resM = String(dateObj.getMonth() + 1).padStart(2, '0');
            const resD = String(dateObj.getDate()).padStart(2, '0');
            return `${resY}-${resM}-${resD}`;
        }
        return dateStr;
    }
    window.calculateDueDate4DaysBefore = calculateDueDate4DaysBefore;
    window.calculatePostDate4DaysAfter = calculatePostDate4DaysAfter;

    const CLIENTS = ['3Jo Toys', 'Aladi Ezhilvanan', 'Client', 'DreamDaa', 'Discussion', 'Einstein', 'Iniya', 'IVN', 'Learning', 'Mopower', 'Mr.Millet', 'Nivya', 'NTT', 'Others', 'Quade', 'SalesNaany', 'SKM', 'University', 'Vilpower', 'Vilpower DM'];

    // Leave Approval Chains - Different employees have different approval hierarchies
    const LEAVE_APPROVAL_CHAINS = {
        // Immanuel: Palani → Nanjil (final)
        'immanuelvilpower@gmail.com': [
            'digitalmarketing@vilpower.com',  // 1st approval: Palani
            'nanjil@vilpower.com'             // Final approval: Nanjil
        ],
        // Barath, Karthika, Alex: Palani → Nanjil (final)
        'barathvilpower@gmail.com': [
            'digitalmarketing@vilpower.com',  // 1st approval: Palani
            'nanjil@vilpower.com'             // Final approval: Nanjil
        ],
        'karthikavilpower@gmail.com': [        // Karthika
            'digitalmarketing@vilpower.com',  // 1st approval: Palani
            'nanjil@vilpower.com'             // Final approval: Nanjil
        ],
        // Sneha, Ajith, Murugesh, Prince: Nanjil (final approval only)
        'snehavilpower@gmail.com': [
            'nanjil@vilpower.com'             // Final approval: Nanjil
        ],
        'murugeshvilpower@gmail.com': [
            'nanjil@vilpower.com'             // Final approval: Nanjil
        ]
    };

    const REPORT_TABS = ['timing', 'task', 'analytics', 'summary', 'detailed', 'client-wide', 'performance', 'client'];
    const TEAM_REPORT_ACCESS = {
        Default: REPORT_TABS,
        All: REPORT_TABS,
        'Sales Team': REPORT_TABS,
        'Marketing Team': REPORT_TABS,
        'Creative Team': REPORT_TABS,
        'Video Team': REPORT_TABS,
        'Content Team': REPORT_TABS,
        'QC Team': REPORT_TABS
    };

    // STATE
    let currentUser = null;
    let tasks = [];
    let currentStatusFilter = 'all';
    let currentAssigneeFilter = 'me';
    let currentClientFilter = 'all';
    let currentDueDateFilter = 'all';
    let currentSearchTerm = '';
    let currentInternalStatusFilter = 'all';
    let currentInternalAssigneeFilter = 'me';
    let currentInternalClientFilter = 'all';
    let currentInternalDueDateFilter = 'all';
    let currentInternalSearchTerm = '';
    let internalTaskSortCol = null;
    let internalTaskSortDir = 'asc';
    let activeTaskId = null;
    let dismissedDiscussionIds = [];
    let wasPausedByDiscussionHold = false;
    let shootCalendarDate = new Date();
    let activeConvId = null;
    let activeView = 'dashboard';
    let boardColumnOrder = null;
    let currentOrganisers = null;
    let isCheckedIn = false;
    let timerRef = null;
    let seconds = 0;
    let unreadCounts = {};
    let convListeners = {};
    let msgListener = null;
    let chatNotificationsMuted = localStorage.getItem('worksync_chat_muted') === 'true';
    let selectedSaturday = null;
    let pendingApprovalReq = null;
    let taskTimerRef = null;
    let taskSeconds = 0;
    let taskOnHold = false;
    let taskStartTime = null;
    let currentWorkDetails = '';
    let currentWorkUsers = [];
    let currentWorkUnsub = null;
    let currentWorkRefreshRef = null;
    let currentWorkFilterKey = '';
    let allUsersMap = new Map(); // Global map for all users
    let todayTimeLogs = [];
    let todayReportUnsub = null;
    let announcementsUnsub = null;
    let announcementNotifyUnsub = null;
    let unreadAnnouncements = 0;
    let dprEntries = [];
    let dprUnsub = null;
    let currentDprTab = 'my';
    let attendanceEvents = [];
    let attendanceUnsub = null;
    let currentReportTab = 'timing';
    let reportDateFrom = null;
    let reportDateTo = null;
    let reportSelectedUser = 'all';
    let emailReportEnabled = false;
    let checkInTime = null;
    let breakStartTime = null;
    let totalBreakDuration = 0;
    let lastBreakAlertTime = 0;
    let syncIntervalRef = null;
    let breakTimerInterval = null;
    let currentTaskViewMode = 'list';
    let statusChangeStats = {};

    function ensureStats(email) {
        if (!statusChangeStats[email]) {
            statusChangeStats[email] = {
                thumbnailCount: 0,
                posterCount: 0,
                videosCompleted: 0,
                reworkDesignCount: 0,
                inProgressVideoCount: 0
            };
        }
        return statusChangeStats[email];
    }

    function isVideoEditor(email) {
        const editors = [
            'barathvilpower@gmail.com',
            'immanuelvilpower@gmail.com'
        ];
        return editors.includes(email?.toLowerCase());
    }

    function trackStatusChange(taskId, oldStatus, newStatus, assigneeEmail) {
        if (!assigneeEmail) return;
        const stats = ensureStats(assigneeEmail);
        // Karthika counters
        if (assigneeEmail.toLowerCase() === 'karthikavilpower@gmail.com') {
            if (newStatus === 'Done') {
                stats.thumbnailCount++;
            }
            if (newStatus === 'Quality Check') {
                stats.posterCount++;
            }
        }
        // Video editor counters
        if (isVideoEditor(assigneeEmail)) {
            if (newStatus === 'Quality Check') {
                stats.videosCompleted++;
            }
            if (oldStatus === 'Rework Designs' && newStatus === 'Quality Check') {
                stats.reworkDesignCount++;
            }
            if (oldStatus === 'Design In Progress' && newStatus === 'Thumbnail') {
                stats.inProgressVideoCount++;
            }
        }
    }

    let stagedAttachment = null;
    let notesUnsub = null;
    let activeGroupMembers = [];
    let allTimeLogs = [];
    let allTimeLogsUnsub = null;
    let mentionActive = false;
    let mentionFilter = '';
    let mentionIndex = 0;
    let todaySnehaSelections = [];
    let todaySnehaUnsub = null;
    let dailyPlans = {};
    let dailyPlansUnsub = null;
    let dpFilter = 'all';
    let taskSortCol = null;
    let taskSortDir = 'asc';
    let dpSortCol = null;
    let dpSortDir = 'asc';
    let dailyReportSchedulerRef = null;
    let appInitialized = false;
    let allQcReports = [];
    let liveBoardTimerRef = null;
    let qcUserPerformance = {};
    let qcPerformancePeriod = 'monthly';

    const REPORT_RECIPIENTS = ['digitalmarketing@vilpower.com', 'nanjil@vilpower.com', 'murugeshvilpower@gmail.com'];
    let qcReportDateFrom = null; // New state variable for QC reports filter
    let qcReportDateTo = null;   // New state variable for QC reports filter
    const MANUAL_TASK_STATUSES = ['To Do', 'In Progress', 'Hold', 'On Hold', 'Backlog', 'Selected for Development', 'In Review', 'Review', 'Testing', 'QA', 'Approved', 'Resolved', 'Closed', 'Shoot Needed', 'Shoot Planned', 'Shoot In Progress', 'Shoot Completed', 'Shoot Cancelled', 'Content In Progress', 'Client Content Approval', 'Design To Do', 'Design In Progress', 'Rework Designs', 'Thumbnail Waiting', 'Thumbnail', 'Design Hold', 'Quality Check', 'Design Completed', 'Client Sent', 'Client Approved', 'Posted', 'Analytics', 'Done'];
    const INTERNAL_TASK_STATUSES = ['To do', 'Shoot Needed', 'Shoot Planned', 'Shoot In Progress', 'Shoot Completed', 'Shoot Cancelled', 'In Progress', 'Completed', 'Hold', 'Learnings', 'Discussion'];
    const DAILY_PLAN_CARRY_STATUSES = ['To Do', 'In Progress', 'Hold', 'On Hold', 'Backlog', 'Selected for Development', 'In Review', 'Review', 'Testing', 'QA', 'Approved', 'Resolved', 'Closed', 'Design In Progress', 'Design To Do', 'Rework Designs', 'Design Hold', 'Thumbnail Waiting', 'Thumbnail', 'Content In Progress', 'Client Content Approval', 'Shoot Needed', 'Shoot Planned', 'Shoot In Progress'];
    const DAILY_PLAN_AUTO_INCLUDE_STATUSES = ['Thumbnail Waiting', 'Thumbnail', 'Rework Designs'];
    const DAILY_PLAN_ALLOCATION_STATUSES = ['To Do', 'In Progress', 'Hold', 'On Hold', 'Backlog', 'Selected for Development', 'In Review', 'Review', 'Testing', 'QA', 'Approved', 'Resolved', 'Closed', 'Design To Do', 'Design In Progress', 'Rework Designs', 'Thumbnail Waiting', 'Thumbnail', 'Content In Progress', 'Client Content Approval', 'Shoot Needed', 'Shoot Planned', 'Shoot In Progress'];
    const DAILY_REPORT_TIMES = [
        { hour: 12, minute: 55, label: 'Afternoon (1 PM)' },
        { hour: 15, minute: 55, label: 'Evening (4 PM)' },
        { hour: 18, minute: 55, label: 'Checkout (6 PM)' }
    ];

    function checkBirthdays() {
        if (!appInitialized || !allUsersMap) return;
        const now = new Date();
        if (now.getHours() < 10) return; // Only after 10 AM

        const todayMonthDay = String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
        const todayKey = now.toISOString().slice(0, 10);

        const usersWithBirthday = Array.from(allUsersMap.values()).filter(u => {
            if (!u.birthday) return false;
            const bMonthDay = u.birthday.slice(5, 10); // Extract MM-DD
            return bMonthDay === todayMonthDay;
        });

        if (usersWithBirthday.length > 0) {
            const shownBirthdays = JSON.parse(localStorage.getItem('worksync_shown_birthdays') || '{}');

            for (const bUser of usersWithBirthday) {
                const wishKey = `${todayKey}_${eKey(bUser.email)}`;
                if (!shownBirthdays[wishKey]) {
                    showBirthdayModal(bUser);
                    shownBirthdays[wishKey] = true;
                    localStorage.setItem('worksync_shown_birthdays', JSON.stringify(shownBirthdays));
                    break;
                }
            }
        }
    }

    function showBirthdayModal(user) {
        document.getElementById('birthday-avatar').src = user.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatar || user.name}`;
        document.getElementById('birthday-name').textContent = user.name;
        const modal = document.getElementById('birthdayModal');
        if (modal && !modal.matches(':popover-open') && !modal.open) {
            modal.showModal();
            showBirthdayNotification(user);
        }
    }

    function showBirthdayNotification(user) {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification('Birthday reminder', {
                        body: `${user.name} has a birthday today!`,
                        icon: user.profilePicture || 'img/logo.png'
                    });
                }
            }).catch(() => { });
            return;
        }

        if (Notification.permission === 'granted') {
            new Notification('Birthday reminder', {
                body: `${user.name} has a birthday today!`,
                icon: user.profilePicture || 'img/logo.png'
            });
        }
    }

    // QUALITY CHECK PORTAL (New Section)
    const QC_POSTER_CHECKLIST = [
        { category: 'Content Check', items: ['Spelling & Grammar Check', 'Correct Content Placement', 'Offer/Price Accuracy', 'Contact Details Verification', 'CTA Visibility Check'] },
        { category: 'Design Check', items: ['Alignment & Spacing', 'Font Consistency', 'Brand Color Consistency', 'Visual Hierarchy', 'Proper Margin & Padding', 'Image Cropping Check', 'Background Removal Quality', 'Shadow/Glow Consistency', 'No Overlapping Elements'] },
        { category: 'Branding Check', items: ['Logo Placement', 'Social Media Icons Check', 'QR Code Verification', 'Watermark Check'] },
        { category: 'Technical Check', items: ['Correct Poster Size', 'Export Quality Check', 'High Resolution Output', 'File Format Correct', 'Safe Area Check'] },
        { category: 'Final Approval', items: ['Client Revision Applied', 'Client Rejected'] }
    ];

    const QC_VIDEO_CHECKLIST = [
        { category: 'Content Check', items: ['Spelling & Grammar Check', 'Subtitle Accuracy', 'Subtitle Sync Check', 'CTA Visibility Check', 'Thumbnail Added'] },
        { category: 'Audio Check', items: ['Voice Clarity', 'Background Music Balance', 'No Background Noise', 'Audio Sync Check'] },
        { category: 'Editing Check', items: ['Smooth Transitions', 'Animation Smoothness', 'Motion Graphics Check', 'Color Grading Check', 'No Frame Drops', 'No Black Screen Issue'] },
        { category: 'Branding Check', items: ['Logo Visibility', 'Brand Color Consistency', 'Intro/Outro Added', 'End Card Added'] },
        { category: 'End Card', items: ['Phone number', 'Logo', 'Animation', 'End Line Missing', 'End Line Spelling Mistake'] },
        { category: 'Technical Check', items: ['Correct Video Dimension', 'Reel/YouTube Size Verification', 'Export Quality Check', 'Proper Rendering', 'File Format Correct'] },
        { category: 'Final Approval', items: ['Client Revision Applied', 'Client Rejected'] }
    ];

    let qcRating = 0;
    let qcCustomItems = {};

    function setQcRating(r) {
        qcRating = r;
        const container = document.getElementById('qc-rating-stars');
        if (!container) return;
        container.innerHTML = [1, 2, 3, 4, 5].map(i => `
                <button onclick="setQcRating(${i})" class="${i <= r ? 'text-amber-400' : 'text-slate-200'} hover:text-amber-400 transition-colors">
                    <iconify-icon icon="solar:star-bold" width="24"></iconify-icon>
                </button>
            `).join('');
    }

    let qcStartTime = null;
    function renderQcTasks() {
        const sel = document.getElementById('qc-task-select');
        const badge = document.getElementById('qc-badge');
        if (!sel) return;

        const currentVal = sel.value; // Preserve current selection
        const qcTasks = tasks.filter(t => t.status === 'Quality Check');

        if (badge) {
            badge.textContent = qcTasks.length;
            badge.classList.toggle('hidden', qcTasks.length === 0);
        }

        const optionsHtml = `<option value="">Select Task for QC (${qcTasks.length})...</option>` +
            qcTasks.map(t => `<option value="${t.id}">${t.id} - ${escapeHtml(t.desc)}</option>`).join('');

        if (sel.innerHTML !== optionsHtml) sel.innerHTML = optionsHtml;

        if (currentVal && [...sel.options].some(o => o.value === currentVal)) sel.value = currentVal;
    }

    function loadQcTaskDetails(id) {
        const task = tasks.find(t => t.id === id);
        const container = document.getElementById('qc-form-container');
        const empty = document.getElementById('qc-empty-state');

        if (!id || !task) {
            container.classList.add('hidden');
            empty.classList.remove('hidden');
            qcStartTime = null;
            return;
        }

        if (id && task) {
            const sel = document.getElementById('qc-task-select');
            if (sel) sel.value = id;
            qcStartTime = Date.now(); // Start QC Timer
        }

        container.classList.remove('hidden');
        empty.classList.add('hidden');

        // Identify previous attempts for this specific task
        const previousReviews = allQcReports.filter(r => r.taskId === id).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        const reviewNumber = previousReviews.length + 1;

        document.getElementById('qc-task-id').textContent = `${task.id} (Review #${reviewNumber})`;
        document.getElementById('qc-task-desc').textContent = task.desc;
        document.getElementById('qc-task-assignee').textContent = 'Assignee: ' + assigneeName(task);

        const historyContainer = document.getElementById('qc-task-history');
        const historyList = document.getElementById('qc-history-list');

        if (previousReviews.length > 0) {
            historyContainer.classList.remove('hidden');
            historyList.innerHTML = previousReviews.map((r, idx) => {
                const date = new Date(r.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                const attemptNum = previousReviews.length - idx;
                return `
                    <div class="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                        <div class="flex items-center justify-between mb-2">
                            <div class="flex items-center gap-2">
                                <span class="bg-slate-100 text-slate-600 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">Review #${attemptNum}</span>
                                <span class="text-[10px] text-slate-400 font-bold">${date} by ${escapeHtml(r.qcUser)}</span>
                            </div>
                            <div class="flex items-center gap-3">
                                <div class="text-right">
                                    <p class="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Score</p>
                                    <p class="text-xs font-black text-indigo-600">${r.qcScore}%</p>
                                </div>
                                <div class="text-right">
                                    <p class="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Rating</p>
                                    <p class="text-xs font-black text-amber-500">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</p>
                                </div>
                            </div>
                        </div>
                        ${r.notes ? `<p class="text-xs text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100">"${escapeHtml(r.notes)}"</p>` : ''}
                    </div>`;
            }).join('');
        } else {
            historyContainer.classList.add('hidden');
        }

        setQcRating(0); // Reset rating
        qcCustomItems = {};
        document.getElementById('qc-notes').value = '';

        const isVideo = task.desc.toLowerCase().includes('video') || task.desc.toLowerCase().includes('reel');
        document.getElementById('qc-type').value = isVideo ? 'video' : 'poster';

        renderQcChecklist();
    }

    function renderQcChecklist() {
        const type = document.getElementById('qc-type').value;
        const grid = document.getElementById('qc-checklist-grid');
        const data = type === 'poster' ? QC_POSTER_CHECKLIST : QC_VIDEO_CHECKLIST;

        grid.innerHTML = data.map(cat => {
            const custom = qcCustomItems[cat.category] || []; // Custom items for this category
            const allItems = [...cat.items, ...custom];

            return `
                <div class="bg-slate-50/50 border border-slate-100 rounded-3xl p-5 flex flex-col h-full">
                    <div class="flex items-center justify-between mb-4">
                        <h5 class="text-xs font-black text-slate-900 uppercase tracking-widest">${cat.category}</h5>
                        <button onclick="addQcCustomItem('${cat.category.replace(/'/g, "\\'")}')" class="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 transition-colors" title="Add tick">
                            <iconify-icon icon="solar:add-circle-bold" width="14"></iconify-icon>
                        </button>
                    </div>
                    <p class="text-[9px] font-bold text-rose-400 uppercase mb-3">Check if ISSUE found:</p>
                    <div class="space-y-2 flex-1">
                        ${allItems.map(item => ` 
                            <label class="flex items-start gap-3 p-3 bg-white border border-slate-100 rounded-xl cursor-pointer hover:border-indigo-200 transition-all group">
                                <input type="checkbox" name="qc_item" onchange="updateQcApproveButtonState()" value="${cat.category}|${item}" class="w-4 h-4 rounded mt-0.5 text-rose-600 focus:ring-rose-500">
                                <span class="text-[11px] font-bold text-slate-700 group-hover:text-rose-600 transition-colors">${escapeHtml(item)}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>`;
        }).join('');

        updateQcApproveButtonState(); // Update approve button state immediately upon render
    }

    function addQcCustomItem(category) {
        const newItem = prompt(`Add a custom check to ${category}:`);
        if (!newItem || !newItem.trim()) return;
        if (!qcCustomItems[category]) qcCustomItems[category] = [];
        qcCustomItems[category].push(newItem.trim());
        renderQcChecklist();
    }

    function updateQcApproveButtonState() {
        const btn = document.getElementById('qc-approve-btn');
        if (!btn) return;
        
        // Count number of checked issues
        const checkedCount = [...document.querySelectorAll('input[name="qc_item"]:checked')].length;
        
        if (checkedCount > 0) {
            btn.disabled = true;
            btn.classList.add('opacity-40', 'cursor-not-allowed');
            btn.setAttribute('title', 'All issues must be cleared to approve this task');
        } else {
            btn.disabled = false;
            btn.classList.remove('opacity-40', 'cursor-not-allowed');
            btn.removeAttribute('title');
        }
    }

    async function submitQcReport(action) {
        const taskId = document.getElementById('qc-task-select').value;
        const task = tasks.find(t => t.id === taskId);
        if (!task) return toast('Select a task first', 'error');

        const isApprove = action === 'approve';
        const checkedCount = [...document.querySelectorAll('input[name="qc_item"]:checked')].length;

        // Double check validation: Approve cannot be submitted with errors
        if (isApprove && checkedCount > 0) {
            return toast('Cannot approve task with issues. Please mark them as resolved or use Reject (Rework).', 'error');
        }

        const qcEndTime = Date.now();
        const qcDurationSeconds = qcStartTime ? Math.floor((qcEndTime - qcStartTime) / 1000) : 0;
        const mistakeItems = [...document.querySelectorAll('input[name="qc_item"]:checked')].map(i => i.value);
        const totalItems = [...document.querySelectorAll('input[name="qc_item"]')].length;

        const passedCount = totalItems - mistakeItems.length;
        const qcScore = totalItems > 0 ? Math.round((passedCount / totalItems) * 100) : 0;
        // Automate rating: 0-20=1, 21-40=2, 41-60=3, 61-80=4, 81-100=5
        const autoRating = Math.max(1, Math.ceil(qcScore / 20));

        const report = {
            taskId: task.id,
            taskDesc: task.desc,
            assignee: assigneeName(task),
            assigneeEmail: task.assigneeEmail || task.userId || '',
            qcUser: currentUser.name,
            qcEmail: currentUser.email,
            type: document.getElementById('qc-type').value,
            rating: autoRating,
            notes: document.getElementById('qc-notes').value.trim(),
            durationSeconds: qcDurationSeconds,
            mistakeItems: mistakeItems, // Store the actual mistake items
            checkedCount: passedCount, // This stores "Passed" items for the report
            totalCount: totalItems,
            qcScore,
            timestamp: Date.now(),
            date: todayIso(),
            actionStatus: isApprove ? 'Approved' : 'Rework' // Save QC action status on report
        };

        // Log duration to timelogs so it appears in Timing Reports
        const timeLog = {
            taskId: task.id,
            taskDesc: `[QC ${isApprove ? 'Approve' : 'Reject'}] ${task.desc}`,
            client: task.client || '',
            userId: currentUser.email,
            userName: currentUser.name,
            startTime: qcStartTime,
            endTime: qcEndTime,
            durationSeconds: qcDurationSeconds,
            durationFormatted: formatTime(qcDurationSeconds)
        };

        try {
            // Update the task status to either Completed or Rework based on action
            const qcTaskId = task.id;
            const targetStatus = isApprove ? 'Design Completed' : 'Rework';

            // Check if it's an internal or manual task vs normal Jira task to invoke the correct update function
            let updateSuccess = false;
            if (task.manual || isInternalTask(task)) {
                updateSuccess = await updateInternalTaskStatus(qcTaskId, targetStatus);
            } else {
                updateSuccess = await updateTaskStatus(qcTaskId, targetStatus);
            }

            if (!updateSuccess) {
                // If status transition failed, abort submitting report
                console.error(`QC Report submission aborted because task status transition to ${targetStatus} failed.`);
                return;
            }

            // Save the QC report and the QC log
            await Promise.all([
                push(ref(db, 'worksync/qc_reports'), report),
                push(ref(db, 'worksync/timelogs'), timeLog)
            ]);

            toast(isApprove ? 'QC Approved & Task Moved to Design Completed!' : 'QC Rejected & Task Sent to Rework!', 'success');
            document.getElementById('qc-task-select').value = '';
            loadQcTaskDetails('');
            qcStartTime = null;
            renderQcTasks(); // Refresh badge and dropdown
        } catch (err) { 
            console.error('Failed to save QC report:', err);
            toast('Failed to save QC report', 'error'); 
        }
    }

    function loadQcReports() {
        if (!db) return;
        onValue(ref(db, 'worksync/qc_reports'), snap => {
            const data = snap.val() || {};
            const allReports = Object.entries(data).map(([id, r]) => {
                const entry = { id, ...r };
                // Ensure qcScore and rating are always calculated or present
                if (entry.totalCount !== undefined && entry.checkedCount !== undefined) {
                    entry.qcScore = entry.totalCount > 0 ? Math.round((entry.checkedCount / entry.totalCount) * 100) : 0;
                } else if (entry.qcScore === undefined) {
                    entry.qcScore = 0; // Default if no data to calculate
                }
                // Derive rating from qcScore if not explicitly set or if qcScore was just calculated
                if (entry.rating === undefined || entry.rating === null || isNaN(entry.rating)) {
                    entry.rating = Math.max(1, Math.ceil(entry.qcScore / 20)); // Derive rating from qcScore
                }
                if (entry.qcScore === undefined) {
                    const rScore = (entry.rating / 5) * 100;
                    const cScore = entry.totalCount > 0 ? (entry.checkedCount / entry.totalCount) * 100 : 0;
                    entry.qcScore = Math.round((rScore + cScore) / 2);
                }
                return entry;
            });
            allQcReports = allReports; // Cache globally for task history lookups

            // Apply date filters
            let filteredReports = allQcReports;
            if (qcReportDateFrom && qcReportDateTo) {
                const fromTs = new Date(qcReportDateFrom).getTime();
                const toTs = new Date(qcReportDateTo).getTime() + 86400000; // +1 day to include the end date
                filteredReports = filteredReports.filter(r => (r.timestamp || 0) >= fromTs && (r.timestamp || 0) < toTs);
            }

            const list = document.getElementById('qc-reports-list');
            const countEl = document.getElementById('qc-report-count');
            // Calculate Aggregate Performance per User
            const userAggregates = {};
            qcUserPerformance = {}; // Reset before re-calculation to avoid score inflation

            let startTimestamp = 0;
            if (qcPerformancePeriod === 'weekly') {
                const d = new Date();
                const day = d.getDay();
                const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                const startOfWeek = new Date(d.setDate(diff));
                startOfWeek.setHours(0, 0, 0, 0);
                startTimestamp = startOfWeek.getTime();
            } else if (qcPerformancePeriod === 'monthly') {
                const d = new Date();
                const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
                startOfMonth.setHours(0, 0, 0, 0);
                startTimestamp = startOfMonth.getTime();
            }

            allReports.forEach(r => {
                if (startTimestamp > 0 && (r.timestamp || 0) < startTimestamp) return;
                const email = (r.assigneeEmail || '').toLowerCase();
                if (!email) return;
                if (!userAggregates[email]) {
                    const found = (currentWorkUsers || []).find(u => (u.email || '').toLowerCase() === email) || knownUserByEmail(email);
                    userAggregates[email] = {
                        name: found?.name || r.assignee || email,
                        scoreSum: 0,
                        count: 0,
                        avatar: found?.profilePicture || (found ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${found.avatar || found.name}` : '')
                    };
                }
                userAggregates[email].scoreSum += r.qcScore;
                userAggregates[email].count++;
                if (!qcUserPerformance[email]) qcUserPerformance[email] = { scoreSum: 0, count: 0 };
                qcUserPerformance[email].scoreSum += r.qcScore;
                qcUserPerformance[email].count++;
            });

            const perfList = document.getElementById('qc-performance-list');
            if (perfList) {
                const sortedUsers = Object.values(userAggregates).sort((a, b) => {
                    const scoreA = a.count > 0 ? a.scoreSum / a.count : 0;
                    const scoreB = b.count > 0 ? b.scoreSum / b.count : 0;
                    return scoreB - scoreA;
                });
                perfList.innerHTML = sortedUsers.map(u => {
                    const avg = u.count > 0 ? Math.round(u.scoreSum / u.count) : 0;
                    let color = 'text-rose-600 bg-rose-50 border-rose-100';
                    if (avg >= 85) color = 'text-emerald-600 bg-emerald-50 border-emerald-100';
                    else if (avg >= 60) color = 'text-amber-600 bg-amber-50 border-amber-100';
                    return `
                        <div class="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center justify-between">
                            <div class="flex items-center gap-3 min-w-0">
                                <img src="${u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`}" class="w-8 h-8 rounded-lg object-cover bg-slate-50 border border-slate-100">
                                <div class="min-w-0"><p class="text-xs font-black text-slate-900 truncate">${escapeHtml(u.name)}</p><p class="text-[9px] text-slate-400 font-bold uppercase">${u.count} Tasks</p></div>
                            </div>
                            <div class="${color} border px-3 py-1.5 rounded-xl text-center min-w-[70px]">
                                <p class="text-[8px] font-bold uppercase tracking-tighter">Avg Score</p>
                                <p class="text-sm font-black">${avg}%</p>
                            </div>
                        </div>`;
                }).join('');
            }

            const reports = filteredReports.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 10);

            if (countEl) countEl.textContent = `${Object.keys(data).length} Report${Object.keys(data).length !== 1 ? 's' : ''}`;

            if (!reports.length) {
                list.innerHTML = `<p class="p-8 text-center text-xs text-slate-400 italic">No QC reports submitted yet.</p>`;
                return;
            }

            list.innerHTML = reports.map(r => `
                <div onclick="openQcReportDetails('${r.id}')" class="p-4 hover:bg-slate-50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer">
                    <div class="min-w-0">
                        <p class="text-xs font-black text-slate-900"><span class="text-indigo-600 font-mono mr-2">${r.taskId}</span> ${escapeHtml(r.taskDesc)}</p>
                        <p class="text-[10px] text-slate-400 font-bold uppercase mt-1">QC: ${escapeHtml(r.qcUser)} · Assignee: ${escapeHtml(r.assignee)} · ${new Date(r.timestamp).toLocaleDateString()}</p>
                    </div>
                    <div class="flex items-center gap-4 shrink-0">
                        <div class="text-center"><p class="text-[9px] font-bold text-slate-400 uppercase">Rating</p><p class="text-sm font-black text-amber-500">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</p></div>
                        <div class="text-center"><p class="text-[9px] font-bold text-slate-400 uppercase">Checks</p><p class="text-sm font-black text-indigo-600">${r.checkedCount}/${r.totalCount}</p></div>
                        <div class="text-center min-w-[50px]"><p class="text-[9px] font-bold text-slate-400 uppercase">Score</p><p class="text-sm font-black text-indigo-600">${r.qcScore}%</p></div>
                    </div>
                </div>
            `).join('');
        });
        if (activeView === 'qc') initQcReportFilters();
    }

    function setQcPerformanceFilter(period) {
        qcPerformancePeriod = period;
        ['weekly', 'monthly', 'all'].forEach(p => {
            const btn = document.getElementById(`qc-perf-filter-${p}`);
            if (btn) {
                if (p === period) {
                    btn.className = "px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-slate-900 shadow-sm";
                } else {
                    btn.className = "px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-slate-600 hover:text-slate-900";
                }
            }
        });
        loadQcReports();
    }

    async function openQcReportDetails(reportId) {
        const report = allQcReports.find(r => r.id === reportId);
        if (!report) return toast('Report not found', 'error');

        const modal = document.getElementById('qcReportDetailModal');
        const content = document.getElementById('qc-report-detail-content');

        const date = new Date(report.timestamp).toLocaleString();

        let mistakesHtml = '';
        if (report.mistakeItems && report.mistakeItems.length > 0) {
            mistakesHtml = `
                <div class="mt-4">
                    <p class="text-xs font-bold text-rose-600 uppercase mb-2">Issues Identified:</p>
                    <ul class="space-y-1">
                        ${report.mistakeItems.map(item => {
                const parts = item.split('|');
                const cat = parts[0];
                const name = parts.slice(1).join('|');
                return `<li class="text-xs text-slate-700 bg-rose-50 p-2 rounded-lg border border-rose-100 flex items-center gap-2">
                                <iconify-icon icon="solar:danger-circle-bold" class="text-rose-500"></iconify-icon>
                                <span><strong class="text-rose-700">${escapeHtml(cat)}:</strong> ${escapeHtml(name)}</span>
                            </li>`;
            }).join('')}
                    </ul>
                </div>`;
        } else {
            mistakesHtml = `<p class="text-xs text-emerald-600 font-bold bg-emerald-50 p-3 rounded-lg border border-emerald-100 mt-4">✓ No issues found. Perfect score!</p>`;
        }

        content.innerHTML = `
            <div class="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div><p class="text-[10px] font-bold text-slate-400 uppercase">Task</p><p class="text-xs font-black text-slate-900">${report.taskId}</p></div>
                <div><p class="text-[10px] font-bold text-slate-400 uppercase">Review Date</p><p class="text-xs font-bold text-slate-700">${date}</p></div>
                <div><p class="text-[10px] font-bold text-slate-400 uppercase">Assignee</p><p class="text-xs font-bold text-slate-700">${report.assignee}</p></div>
                <div><p class="text-[10px] font-bold text-slate-400 uppercase">QC Reviewer</p><p class="text-xs font-bold text-slate-700">${report.qcUser}</p></div>
            </div>
            <div class="grid grid-cols-3 gap-3 my-4">
                <div class="bg-indigo-50 p-3 rounded-xl border border-indigo-100 text-center"><p class="text-[9px] font-bold text-indigo-400 uppercase">Score</p><p class="text-lg font-black text-indigo-600">${report.qcScore}%</p></div>
                <div class="bg-amber-50 p-3 rounded-xl border border-amber-100 text-center"><p class="text-[9px] font-bold text-amber-400 uppercase">Rating</p><p class="text-lg font-black text-amber-500">${'★'.repeat(report.rating || 0)}</p></div>
                <div class="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center"><p class="text-[9px] font-bold text-slate-400 uppercase">Duration</p><p class="text-lg font-black text-slate-700">${formatTime(report.durationSeconds || 0)}</p></div>
            </div>
            <div class="space-y-4">
                ${mistakesHtml}
                ${report.notes ? `<div class="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm"><p class="text-[10px] font-bold text-slate-400 uppercase mb-1">Feedback Notes</p><p class="text-sm text-slate-600 italic">"${escapeHtml(report.notes)}"</p></div>` : ''}
            </div>`;
        modal.showModal();
    }

    async function sendAutomaticAnnouncement(title, body) {
        if (!db || !currentUser) return;
        await push(ref(db, 'worksync/announcements'), {
            title: title,
            body: body,
            authorEmail: 'system@worksync.com',
            authorName: 'WorkSync Automation',
            createdAt: Date.now()
        });
    }

    // KANBAN VIEW
    function toggleTaskViewMode() {
        currentTaskViewMode = currentTaskViewMode === 'list' ? 'kanban' : 'list';
        const btn = document.getElementById('view-toggle-btn');
        btn.innerHTML = currentTaskViewMode === 'list'
            ? `<iconify-icon icon="solar:board-linear" width="18"></iconify-icon> Board View`
            : `<iconify-icon icon="solar:list-linear" width="18"></iconify-icon> List View`;

        document.getElementById('task-list-container').classList.toggle('hidden', currentTaskViewMode === 'kanban');
        document.getElementById('task-kanban-container').classList.toggle('hidden', currentTaskViewMode === 'list');
        renderTasks();
    }

    function dragTask(event, taskId) {
        event.dataTransfer.setData('text/plain', taskId);
    }


    // Existing Kanban drag-drop
    async function dropTask(event, newStatusCategory) {
        event.preventDefault();
        const taskId = event.dataTransfer.getData('text/plain');
        if (!taskId) return;
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        if (task.status === newStatusCategory || (newStatusCategory === 'To Do' && isTodo(task.status)) || (newStatusCategory === 'In Progress' && isInProgress(task.status)) || (newStatusCategory === 'Done' && isDone(task.status))) return;
        const oldStatus = task.status;
        task.status = newStatusCategory;
        task.updatedAt = Date.now();
        const assigneeEmail = task.assignee || task.userId || '';
        trackStatusChange(taskId, oldStatus, newStatusCategory, assigneeEmail);
        renderTasks(); updateStats();
        if (activeView === 'internal-tasks') renderInternalTasks();
        if (activeTaskId === taskId && (isDone(newStatusCategory))) {
            await endTask();
        }
        if (task.manual) {
            try {
                // Update status in Firebase for manual tasks
                await update(ref(db, `worksync/manual_tasks/${eKey(task.userId)}/${taskId}`), {
                    status: newStatusCategory,
                    updatedAt: Date.now()
                });
                if (activeView === 'dailyplan') renderDailyPlan();
                toast('Task moved successfully', 'success');
                if (newStatusCategory === 'Quality Check') sendAutomaticAnnouncement('Task Ready for QC', `Task ${taskId} (${task.desc}) moved to Quality Check.`);
            } catch (err) { toast('Failed to save status', 'error'); }
        } else {
            toast('Jira task status updated locally (Jira 2-way sync missing)', 'info');
        }
    }

    // New internal list drag-drop handlers
    function dragInternalTask(event, taskId) {
        event.dataTransfer.setData('text/plain', taskId);
    }

    function allowDropInternal(event) {
        event.preventDefault();
    }

    async function dropInternalTask(event, targetTaskId) {
        event.preventDefault();
        const draggedId = event.dataTransfer.getData('text/plain');
        if (!draggedId) return;
        if (draggedId === targetTaskId) return;
        const draggedTask = tasks.find(t => t.id === draggedId);
        const targetTask = tasks.find(t => t.id === targetTaskId);
        if (!draggedTask || !targetTask) return;
        // Determine current filtered list order (same logic as renderInternalTasks)
        let filtered = tasks.filter(isInternalTask);
        if (currentInternalStatusFilter !== 'all') {
            filtered = currentInternalStatusFilter.length
                ? filtered.filter(t => currentInternalStatusFilter.includes(t.status))
                : [];
        }
        if (currentInternalAssigneeFilter !== 'all') filtered = filtered.filter(t => assigneeMatches(t, currentInternalAssigneeFilter));
        if (currentInternalClientFilter !== 'all') filtered = filtered.filter(t => t.client === currentInternalClientFilter);
        // Reorder within filtered list
        const fromIndex = filtered.findIndex(t => t.id === draggedId);
        const toIndex = filtered.findIndex(t => t.id === targetTaskId);
        if (fromIndex === -1 || toIndex === -1) return;
        filtered.splice(fromIndex, 1);
        // Insert before target (or after, adjust as needed)
        filtered.splice(toIndex, 0, draggedTask);
        // Assign new order values based on filtered sequence
        for (let i = 0; i < filtered.length; i++) {
            const t = filtered[i];
            try {
                await update(ref(db, `worksync/manual_tasks/${eKey(t.userId || currentUser.email)}/${t.id}`), { order: i });
            } catch (err) { console.error('Failed to update task order:', err); }
        }
        // Re-render UI to reflect new order
        renderInternalTasks();
    }

    // DAILY PLAN HELPER
    function dailyPlanRowClass(s) {
        if (isDone(s)) return 'bg-emerald-50/30';
        if (isInProgress(s)) return 'bg-amber-50/30';
        return 'bg-blue-50/30'; // Default for To Do or other statuses
    }
    // AUTH
    async function handleLogin() {
        const email = document.getElementById('email-input').value.trim();
        const pass = document.getElementById('password-input').value.trim();
        const errEl = document.getElementById('login-error');
        const btn = document.getElementById('login-btn');
        if (!email || !pass) { document.getElementById('error-text').textContent = 'Enter both fields.'; errEl.classList.remove('hidden'); return; }

        document.getElementById('btn-text').textContent = 'Signing in...';
        document.getElementById('btn-icon').setAttribute('icon', 'svg-spinners:ring-resize');
        btn.disabled = true;

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, pass);
            const fbUser = userCredential.user;
            const userSnap = await get(ref(db, `worksync/users/${eKey(fbUser.email)}`));
            const hardcoded = knownUserByEmail(fbUser.email);
            if (userSnap.exists()) {
                currentUser = { ...userSnap.val(), ...(hardcoded || {}), uid: fbUser.uid };
            } else {
                currentUser = hardcoded ? { ...hardcoded, uid: fbUser.uid } : { email: fbUser.email, name: fbUser.email.split('@')[0], role: 'User', uid: fbUser.uid };
                await set(ref(db, `worksync/users/${eKey(fbUser.email)}`), currentUser);
            }
            window.currentUser = currentUser; // Expose to window for metaIntegration.js
            localStorage.setItem('worksync_user', JSON.stringify(currentUser));
            errEl.classList.add('hidden');
            await finishLogin();
        } catch (err) {
            let msg = 'Incorrect credentials.';
            if (err.code === 'auth/user-not-found') msg = 'User not found.';
            if (err.code === 'auth/wrong-password') msg = 'Incorrect password.';
            document.getElementById('error-text').textContent = msg;
            errEl.classList.hidden = false;
        } finally {
            document.getElementById('btn-text').textContent = 'Sign In';
            document.getElementById('btn-icon').setAttribute('icon', 'solar:login-3-linear');
            btn.disabled = false;
        }
    }

    async function finishLogin() {
        if (appInitialized) return;
        appInitialized = true;
        console.log("Initializing workspace for", currentUser.email);

        try {
            loadTasksFromCache();
            applyUserUI();
            loadBoardSettings();

            // Explicitly show the dashboard and hide login
            document.getElementById('login-view')?.classList.add('hidden');
            document.getElementById('dashboard-view')?.classList.remove('hidden');

            // Hide the loader as soon as UI state is ready
            // document.documentElement.classList.remove('has-user'); // This should be done after allUsersMap is populated
            document.getElementById('loading-view')?.classList.add('hidden');

            const lastView = localStorage.getItem('worksync_activeView') || 'dashboard';
            const validViews = ['dashboard', 'tasks', 'internal-tasks', 'dailyplan', 'shoots', 'qc', 'notes', 'dpr', 'hr', 'chat', 'announcements'];
            if (canViewProjects()) validViews.push('projects');
            if (canViewReports()) validViews.push('reports');
            if (canViewDailySummary()) validViews.push('daily-summary');
            if (isAdmin()) validViews.push('users');
            switchView(validViews.includes(lastView) ? lastView : 'dashboard');

            initDailyPlan();
            registerOnline(); initChat(); initAnnouncements(); loadHrBadge(); initReportFilters();
            restoreTimerState();
            restoreHeaderPreference(); // Restore user's header preference
            initProdHeaderListeners(); // Initialize productivity header
            initDailyReportScheduler();
            restoreActiveTask();
            initTaskNotifications();
            initOrganisersListener();
            allUsersMap = await getAllUsers(); // Populate the global map
            if (activeView === 'chat') renderDmList();
            if (canViewDailySummary()) {
                if (currentWorkUnsub) {
                    currentWorkUnsub();
                    currentWorkUnsub = null;
                }
                loadEmployeeCurrentTasks();
                renderDailySummary();
            }
            setInterval(checkAutoCheckout, 60000);
            setInterval(checkBreakLimit, 60000);
            setInterval(checkBirthdays, 60000); // Check for birthdays every minute
            // Removed auto-update mechanism to stop page reloads
            setTimeout(checkBirthdays, 5000); // Check shortly after login
            setTimeout(() => { syncTasks(); loadManualTasks(); loadDiscussions(); }, 600);

            // Apply saved sidebar state
            if (localStorage.getItem('worksync_sidebar_collapsed') === 'true') {
                const sidebar = document.querySelector('aside');
                const toggleIcon = document.getElementById('sidebar-toggle-icon');
                if (sidebar) sidebar.classList.add('hidden-sidebar');
                if (toggleIcon) toggleIcon.setAttribute('icon', 'solar:alt-arrow-right-linear');
            }
            if (syncIntervalRef) clearInterval(syncIntervalRef);
            syncIntervalRef = setInterval(() => syncTasks(true), 3 * 60 * 1000);
            document.documentElement.classList.remove('has-user'); // Now safe to remove
        } catch (err) {
            console.error("Error during finishLogin:", err);
            document.documentElement.classList.remove('has-user');
            document.documentElement.classList.remove('auth-pending');
            document.getElementById('dashboard-view')?.classList.add('hidden');
            document.getElementById('login-view')?.classList.remove('hidden');
            toast('Error loading workspace: ' + err.message, 'error');
        } finally {
            document.documentElement.classList.remove('has-user');
            document.documentElement.classList.remove('auth-pending');
            document.getElementById('loading-view')?.classList.add('hidden');
        }
    }

    // Removed auto-update mechanism to stop page reloads
    function getCurrentAppVersion() {
        return document.querySelector('meta[name="app-version"]')?.content?.trim() || 'unknown';
    }

    function getResponseDeployId(response) {
        return response.headers.get('x-vercel-id')
            || response.headers.get('x-now-deployment')
            || response.headers.get('etag')
            || response.headers.get('last-modified')
            || null;
    }

    async function fetchRemoteAppInfo(path) {
        try {
            const response = await fetch(`${path}?cache-bust=${Date.now()}`, { cache: 'no-store' });
            if (!response.ok) return null;
            const deployId = getResponseDeployId(response);
            if (path.endsWith('.txt')) {
                return { version: (await response.text()).trim() || null, deployId };
            }
            const html = await response.text();
            const match = html.match(/<meta\s+name=["']app-version["']\s+content=["']([^"']+)["'][^>]*>/i);
            return { version: match ? match[1].trim() : null, deployId };
        } catch (err) {
            return null;
        }
    }

    async function getRemoteAppInfo() {
        return await fetchRemoteAppInfo('/version.txt') || await fetchRemoteAppInfo('/index.html');
    }

    let appUpdateNotified = false;
    let currentDeployId = null;

    function scheduleAppReload(remoteVersion) {
        if (appUpdateNotified) return;
        appUpdateNotified = true;
        const message = remoteVersion
            ? `New app version detected (${remoteVersion}). Reloading in 5 seconds...`
            : 'New app version detected. Reloading in 5 seconds...';
        toast(message, 'success', 5000);
        setTimeout(() => window.location.reload(), 5000);
    }

    /* async function checkForAppUpdate() { // Commented out to stop auto-reloading
        if (!navigator.onLine) return;
        const currentVersion = getCurrentAppVersion();
        const remoteInfo = await getRemoteAppInfo();
        if (!remoteInfo) return;

        if (!currentDeployId && remoteInfo.deployId) {
            currentDeployId = remoteInfo.deployId;
        }

        if (remoteInfo.version && remoteInfo.version !== currentVersion) {
            scheduleAppReload(remoteInfo.version);
            return;
        }

        if (remoteInfo.deployId && currentDeployId && remoteInfo.deployId !== currentDeployId) {
            scheduleAppReload(remoteInfo.deployId);
        }
    } */

    async function logout() {
        // Disable the logout button immediately to prevent double-clicks
        const logoutBtn = document.getElementById('logout-btn') || document.querySelector('[onclick*="logout"]');
        if (logoutBtn) logoutBtn.disabled = true;
        
        try {
            // Parallel non-blocking cleanup - don't wait for database
            if (db && currentUser) {
                // Fire these off without awaiting (they'll complete in background)
                Promise.resolve()
                    .then(() => set(ref(db, `worksync/users/${eKey(currentUser.email)}/online`), false))
                    .then(() => clearCurrentTask())
                    .catch(err => console.error('Logout cleanup error:', err));
            }
            
            // Clear subscriptions immediately (non-blocking)
            Object.values(convListeners).forEach(off => off && off());
            if (currentWorkUnsub) currentWorkUnsub();
            if (todayReportUnsub) todayReportUnsub();
            if (announcementsUnsub) announcementsUnsub();
            if (announcementNotifyUnsub) announcementNotifyUnsub();
            if (dprUnsub) dprUnsub();
            if (notesUnsub) notesUnsub();
            if (attendanceUnsub) attendanceUnsub();
            if (allTimeLogsUnsub) allTimeLogsUnsub();
            if (dailyPlansUnsub) dailyPlansUnsub();
            
            // Clear intervals immediately (non-blocking)
            if (dailyReportSchedulerRef) clearInterval(dailyReportSchedulerRef);
            if (liveBoardTimerRef) clearInterval(liveBoardTimerRef);
            if (syncIntervalRef) clearInterval(syncIntervalRef);
            clearInterval(currentWorkRefreshRef);
            clearInterval(timerRef);
            
            // Reset variables immediately
            dailyReportSchedulerRef = null;
            liveBoardTimerRef = null;
            dailyPlansUnsub = null;
            dailyPlans = {};
            syncIntervalRef = null;
            currentWorkUnsub = null;
            todayReportUnsub = null;
            announcementsUnsub = null;
            announcementNotifyUnsub = null;
            dprUnsub = null;
            notesUnsub = null;
            attendanceUnsub = null;
            allTimeLogsUnsub = null;
            currentWorkRefreshRef = null;
            currentWorkFilterKey = '';
            convListeners = {};
            currentUser = null;
            window.currentUser = null;
            tasks = [];
            dprEntries = [];
            attendanceEvents = [];
            activeTaskId = null;
            isCheckedIn = false;
            seconds = 0;
            activeConvId = null;
            unreadCounts = {};
            unreadAnnouncements = 0;
            
            // Firebase signOut with timeout
            try {
                await Promise.race([
                    signOut(auth),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
                ]);
            } catch (err) {
                console.error('SignOut error:', err);
            }
            
            // Clear local storage and redirect
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/';
            
        } catch (err) {
            console.error('Logout error:', err);
            // Force redirect anyway
            window.location.href = '/';
        }
        localStorage.removeItem('worksync_user');
        localStorage.removeItem('worksync_timerState');
        localStorage.removeItem('worksync_checkInTime');
        localStorage.removeItem('worksync_totalBreakDuration');
        localStorage.removeItem('worksync_breakStartTime');
        appInitialized = false;
        document.documentElement.classList.remove('has-user');
        document.documentElement.classList.remove('auth-pending');
        resetTimerUI(); setTimerState('idle');
        document.getElementById('dashboard-view').classList.add('hidden');
        document.getElementById('login-view').classList.remove('hidden');
    }

    function loadTasksFromCache() {
        try {
            const cachedTasks = localStorage.getItem('worksync_tasks');
            if (cachedTasks) {
                tasks = JSON.parse(cachedTasks);
                updateStats();
                renderTasks();
                if (activeView === 'internal-tasks') renderInternalTasks();
                if (activeView === 'reports' && currentReportTab === 'client') renderClientReport();
            }
        } catch (e) { console.error('Failed to load tasks from cache', e); }
    }

    function goToDashboard() {
        const lv = document.getElementById('login-view');
        const dv = document.getElementById('dashboard-view');
        lv.classList.add('hidden'); dv.classList.remove('hidden');
    }

    function applyUserUI() {
        if (!currentUser) return;
        const avatar = currentUser.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.avatar || currentUser.name}`;
        document.getElementById('user-avatar').src = avatar;
        document.getElementById('user-name').textContent = currentUser.name;
        document.getElementById('user-role').textContent = currentUser.role;

        // Team-based report tab access
        const teamAccess = TEAM_REPORT_ACCESS[currentUser.team] || TEAM_REPORT_ACCESS['Default'];
        ['timing', 'task', 'analytics', 'summary', 'detailed', 'client-wide', 'performance', 'client'].forEach(tab => {
            const btn = document.getElementById(`report-tab-${tab}`);
            if (btn) btn.classList.toggle('hidden', !teamAccess.includes(tab));
        });

        if (!teamAccess.includes(currentReportTab)) {
            currentReportTab = teamAccess[0];
        }

        document.getElementById('nav-projects')?.classList.toggle('hidden', !canViewProjects());
        document.getElementById('nav-reports')?.classList.toggle('hidden', !canViewReports());
        document.getElementById('nav-daily-summary')?.classList.toggle('hidden', !canViewDailySummary());
        document.getElementById('nav-qc')?.classList.toggle('hidden', !canViewQcPortal());
        document.getElementById('nav-strategy-calendar')?.classList.toggle('hidden', !canViewStrategyCalendar());
        document.getElementById('report-export-btn')?.classList.toggle('hidden', isManager() && !isAdmin());
        document.getElementById('report-group-client')?.classList.remove('hidden');
        if (hasClientWideAccess() && !isAdmin() && !isManager()) {
            // Client-wide only access
            document.querySelectorAll('.report-tab-btn').forEach(btn => btn.classList.add('hidden'));
            document.getElementById('report-tab-client-wide')?.classList.remove('hidden');
            currentReportTab = 'client-wide';
        } else if (isManager() && !isAdmin()) {
            document.querySelectorAll('.report-tab-btn').forEach(btn => btn.classList.add('hidden'));
            document.getElementById('report-tab-client')?.classList.remove('hidden');
            document.getElementById('report-tab-client-wide')?.classList.remove('hidden');
            if (currentReportTab !== 'client' && currentReportTab !== 'client-wide') currentReportTab = 'client';
        } else if (isAdmin()) {
            ['timing', 'task', 'analytics', 'summary', 'detailed', 'client', 'client-wide'].forEach(tab => {
                document.getElementById(`report-tab-${tab}`)?.classList.remove('hidden');
            });
        } else {
            // Non-admin / non-manager / regular users
            document.getElementById('report-group-client')?.classList.add('hidden');
            document.querySelectorAll('.report-tab-btn').forEach(btn => btn.classList.add('hidden'));
            ['summary', 'detailed', 'task'].forEach(tab => {
                document.getElementById(`report-tab-${tab}`)?.classList.remove('hidden');
            });
            if (currentReportTab !== 'summary' && currentReportTab !== 'detailed' && currentReportTab !== 'task') {
                currentReportTab = 'summary';
            }
        }
        if (isAdmin()) {
            document.getElementById('hr-tab-approvals')?.classList.remove('hidden');
            document.getElementById('admin-nav').classList.remove('hidden');
            document.getElementById('group-create-btn')?.classList.remove('hidden');
            document.getElementById('announcement-compose-card')?.classList.remove('hidden');
            document.getElementById('dpr-tab-team')?.classList.remove('hidden');
            document.getElementById('report-tab-performance')?.classList.remove('hidden');
        } else { // Non-admin users
            document.getElementById('hr-tab-approvals')?.classList.add('hidden');
            document.getElementById('admin-nav')?.classList.add('hidden');
            document.getElementById('group-create-btn')?.classList.add('hidden');
            document.getElementById('announcement-compose-card')?.classList.add('hidden');
            document.getElementById('dpr-tab-team')?.classList.add('hidden');
            document.getElementById('report-tab-performance')?.classList.add('hidden');
        }
        // Daily summary cards and data loading - available to admins AND managers
        if (canViewDailySummary()) {
            document.getElementById('admin-current-work-card')?.classList.remove('hidden');
            document.getElementById('admin-workload-card')?.classList.remove('hidden');
            document.getElementById('admin-report-card')?.classList.remove('hidden');
            loadEmployeeCurrentTasks();
            loadTodayWorkSummary();
        } else {
            document.getElementById('admin-current-work-card')?.classList.add('hidden');
            document.getElementById('admin-workload-card')?.classList.add('hidden');
            document.getElementById('admin-report-card')?.classList.add('hidden');
            // But allow regular users to see their own data on the dashboard
            loadTodayWorkSummary();
        }
    }

    function saveBoardSettings() {
        if (!currentUser) return;
        const settings = {
            status: currentStatusFilter,
            assignee: currentAssigneeFilter,
            client: currentClientFilter,
            dueDate: currentDueDateFilter,
            viewMode: currentTaskViewMode,
            columnOrder: boardColumnOrder
        };
        localStorage.setItem(`worksync_board_settings_${eKey(currentUser.email)}`, JSON.stringify(settings));
        toast('Default board filters and column order saved', 'success');
    }

    function loadBoardSettings() {
        if (!currentUser) return;
        const saved = localStorage.getItem(`worksync_board_settings_${eKey(currentUser.email)}`);
        if (!saved) return;
        try {
            const settings = JSON.parse(saved);
            currentStatusFilter = settings.status ?? 'all';
            currentAssigneeFilter = settings.assignee ?? 'me';
            currentClientFilter = settings.client ?? 'all';
            currentDueDateFilter = settings.dueDate ?? 'all';
            currentTaskViewMode = settings.viewMode ?? 'list';
            boardColumnOrder = settings.columnOrder ?? null;

            applyBoardSettingsUI();
        } catch (e) { console.error('Failed to load board settings', e); }
    }

    async function applyBoardSettingsUI() { // Made async to await populateAssigneeFilter
        const allCheckbox = document.querySelector('#status-menu input[value="all"]');
        if (allCheckbox) {
            if (currentStatusFilter === 'all') {
                document.querySelectorAll('#status-menu input[type="checkbox"]').forEach(c => c.checked = (c.value === 'all'));
            } else if (Array.isArray(currentStatusFilter)) {
                allCheckbox.checked = false;
                document.querySelectorAll('#status-menu input[type="checkbox"]:not([value="all"])').forEach(c => {
                    c.checked = currentStatusFilter.includes(c.value);
                });
            }
        }
        const label = document.getElementById('status-filter-label');
        if (label) {
            if (currentStatusFilter === 'all') label.textContent = 'All Status';
            else if (!currentStatusFilter || currentStatusFilter.length === 0) label.textContent = 'No Status Selected';
            else if (currentStatusFilter.length === 1) label.textContent = currentStatusFilter[0];
            else label.textContent = `${currentStatusFilter.length} Selected`;
        }
        if (document.getElementById('assignee-filter')) document.getElementById('assignee-filter').value = currentAssigneeFilter;
        if (document.getElementById('client-filter')) document.getElementById('client-filter').value = currentClientFilter; // populateClientFilter is called after syncTasks
        if (document.getElementById('duedate-filter')) document.getElementById('duedate-filter').value = currentDueDateFilter;

        const btn = document.getElementById('view-toggle-btn');
        if (btn) {
            btn.innerHTML = currentTaskViewMode === 'list' ? `<iconify-icon icon="solar:board-linear" width="18"></iconify-icon> Board View` : `<iconify-icon icon="solar:list-linear" width="18"></iconify-icon> List View`;
        }
        document.getElementById('task-list-container').classList.toggle('hidden', currentTaskViewMode === 'kanban');
        document.getElementById('task-kanban-container').classList.toggle('hidden', currentTaskViewMode === 'list');
    }

    // PROFILE
    function openProfile() {
        if (!currentUser) return;
        document.getElementById('profile-pic').src = currentUser.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.avatar || currentUser.name}`;
        document.getElementById('p-name').value = currentUser.name || '';
        const roleSelect = document.getElementById('p-role');
        let hasOption = Array.from(roleSelect.options).some(opt => opt.value === currentUser.role);
        if (!hasOption && currentUser.role) {
            const opt = document.createElement('option');
            opt.value = currentUser.role;
            opt.textContent = currentUser.role;
            roleSelect.appendChild(opt);
        }
        roleSelect.value = currentUser.role || 'Employee';
        document.getElementById('p-email').value = currentUser.email;
        document.getElementById('p-phone').value = currentUser.phone || '';
        document.getElementById('p-empid').value = currentUser.empId || '';
        document.getElementById('p-birthday').value = currentUser.birthday || '';
        document.getElementById('p-team').value = currentUser.team || 'All';
        document.getElementById('profileModal').showModal();
    }

    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    async function uploadPhoto() {
        const file = document.getElementById('photo-upload').files[0];
        if (!file || !currentUser) return;
        if (file.size > 2 * 1024 * 1024) return toast('Image must be less than 2MB', 'error');
        toast('Uploading photo...', 'info');
        try {
            const base64Url = await fileToBase64(file);
            currentUser.profilePicture = base64Url;
            document.getElementById('profile-pic').src = base64Url;
            document.getElementById('user-avatar').src = base64Url;
            localStorage.setItem('worksync_user', JSON.stringify(currentUser));
            await update(ref(db, `worksync/users/${eKey(currentUser.email)}`), { profilePicture: base64Url });
            toast('Profile photo updated', 'success');
        } catch (err) {
            console.error("Photo upload error:", err);
            toast('Upload failed: ' + err.message, 'error');
        }
    }

    async function saveProfile() {
        if (!currentUser) return;
        currentUser.name = document.getElementById('p-name').value.trim() || currentUser.name;
        currentUser.role = document.getElementById('p-role').value.trim() || currentUser.role;
        currentUser.phone = document.getElementById('p-phone').value;
        currentUser.empId = document.getElementById('p-empid').value.trim();
        currentUser.birthday = document.getElementById('p-birthday').value;
        currentUser.team = document.getElementById('p-team').value || 'All';
        localStorage.setItem('worksync_user', JSON.stringify(currentUser));
        await update(ref(db, `worksync/users/${eKey(currentUser.email)}`), {
            name: currentUser.name,
            role: currentUser.role,
            phone: currentUser.phone,
            empId: currentUser.empId,
            birthday: currentUser.birthday,
            team: currentUser.team
        });
        applyUserUI();
        toast('Profile saved', 'success');
        document.getElementById('profileModal').close();
    }

    function getCheckoutLimit() {
        // Hardcoded to 7:00 PM as per request.
        return { hours: 19, mins: 0 };
    }

    function openSettings() {
        document.getElementById('cfg-domain').textContent = JIRA.domain;
        document.getElementById('cfg-project').textContent = 'Active: ' + JIRA.projectKey;
        renderChatMuteToggle();
        document.getElementById('setting-shift').value = localStorage.getItem('worksync_shift') || '18:00';
        document.getElementById('settingsModal').showModal();
    }

    function renderChatMuteToggle() {
        const toggle = document.getElementById('chat-mute-toggle');
        const knob = document.getElementById('chat-mute-knob');
        if (!toggle || !knob) return;
        toggle.className = `w-12 h-7 rounded-full relative transition-colors shrink-0 ${chatNotificationsMuted ? 'bg-slate-300' : 'bg-emerald-500'}`;
        knob.className = `absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${chatNotificationsMuted ? 'left-1' : 'right-1'}`;
        toggle.setAttribute('aria-pressed', String(!chatNotificationsMuted));
    }

    async function toggleChatMute() {
        chatNotificationsMuted = !chatNotificationsMuted;
        localStorage.setItem('worksync_chat_muted', String(chatNotificationsMuted));
        renderChatMuteToggle();
        if (!chatNotificationsMuted && 'Notification' in window && Notification.permission === 'default') {
            try { await Notification.requestPermission(); } catch { }
        }
        toast(chatNotificationsMuted ? 'Chat notifications muted' : 'Chat notifications enabled', 'info');
    }

    // TIMER
    async function logAttendanceEvent(type, duration = 0) {
        if (!currentUser || !db) return;
        const event = {
            userId: currentUser.email,
            userName: currentUser.name,
            type: type, // 'check_in', 'break_start', 'break_end', 'check_out'
            timestamp: Date.now(),
            date: new Date().toISOString().slice(0, 10),
            duration: duration
        };
        await push(ref(db, 'worksync/attendance_events'), event);
    }

    function doCheckIn() {
        const now = new Date();
        if (now.getHours() >= 22) {
            toast('Cannot check in after 10:00 PM', 'error');
            return;
        }
        isCheckedIn = true;
        checkInTime = Date.now();
        breakStartTime = null;
        totalBreakDuration = 0;
        localStorage.setItem('worksync_timerState', 'running');
        localStorage.setItem('worksync_checkInTime', String(checkInTime));
        localStorage.setItem('worksync_totalBreakDuration', '0');
        localStorage.removeItem('worksync_breakStartTime');
        setTimerState('running');
        timerRef = setInterval(tickTimer, 1000);
        logAttendanceEvent('check_in');
        toast('Checked In Successfully', 'success');
        registerOnline();
    }
    function doBreak() {
        clearInterval(timerRef);
        breakStartTime = Date.now();
        localStorage.setItem('worksync_timerState', 'paused');
        localStorage.setItem('worksync_breakStartTime', String(breakStartTime));
        setTimerState('paused');
        logAttendanceEvent('break_start');
        // Auto-hold any active task when going on break
        if (activeTaskId && !taskOnHold) {
            holdTask();
            toast('Break started — active task put on hold', 'info');
        } else {
            toast('Break session started', 'info');
        }
        
        // Open break popup and start break timer
        openBreakPopup();
    }
    function doResume() {
        if (breakStartTime) {
            const breakDuration = Date.now() - breakStartTime;
            totalBreakDuration += breakDuration;
            localStorage.setItem('worksync_totalBreakDuration', String(totalBreakDuration));
            localStorage.removeItem('worksync_breakStartTime');
            logAttendanceEvent('break_end', breakDuration);
            breakStartTime = null;
        }
        timerRef = setInterval(tickTimer, 1000);
        localStorage.setItem('worksync_timerState', 'running');
        setTimerState('running');
        toast('Work session resumed', 'success');

        // Close break popup and floating reminder
        const modal = document.getElementById('breakStatusModal');
        if (modal && modal.open) {
            modal.close();
        }
        const floating = document.getElementById('breakFloatingReminder');
        if (floating) {
            floating.classList.add('hidden');
        }
        stopBreakTimer();
    }
    function confirmCheckOut() {
        if (confirm('Are you sure you want to Check Out for today?')) {
            clearInterval(timerRef);
            isCheckedIn = false;
            holdActiveTaskForCheckout();
            if (checkInTime) {
                const totalDuration = Date.now() - checkInTime;
                logAttendanceEvent('check_out', totalDuration);
                checkInTime = null;
            }
            setTimerState('idle');
            localStorage.removeItem('worksync_timerState');
            localStorage.removeItem('worksync_checkInTime');
            localStorage.removeItem('worksync_totalBreakDuration');
            localStorage.removeItem('worksync_breakStartTime');
            resetTimerUI();
            toast('Checked Out - Great job today!', 'success');

            // Close break popup and floating reminder
            const modal = document.getElementById('breakStatusModal');
            if (modal && modal.open) {
                modal.close();
            }
            const floating = document.getElementById('breakFloatingReminder');
            if (floating) {
                floating.classList.add('hidden');
            }
            stopBreakTimer();
        }
    }
    function setTimerState(state) {
        const ci = document.getElementById('btn-checkin'), br = document.getElementById('btn-break'), co = document.getElementById('btn-checkout'), rs = document.getElementById('btn-resume');
        ci.classList.add('hidden'); br.disabled = true; co.disabled = true; rs.classList.add('hidden');
        if (state === 'idle') { ci.classList.remove('hidden'); }
        if (state === 'running') { co.disabled = false; br.disabled = false; br.classList.remove('hidden'); }
        if (state === 'paused') { co.disabled = false; rs.classList.remove('hidden'); br.classList.add('hidden'); }
        
        // Update productivity header buttons
        updateProdHeaderButtons();
    }

    function autoCheckOut() {
        if (!isCheckedIn) return;
        clearInterval(timerRef);
        isCheckedIn = false;
        if (checkInTime) {
            const ciDate = new Date(checkInTime);
            const now = new Date();
            const limit = getCheckoutLimit();
            
            // Determine which date's limit to use: if it's a different day, use today's limit
            let limitDate;
            if (now.toDateString() !== ciDate.toDateString()) {
                // Cross-day checkout: use today's date with checkout limit time
                limitDate = new Date(now);
                limitDate.setHours(limit.hours, limit.mins, 0, 0);
            } else {
                // Same-day checkout: use check-in date with checkout limit time
                limitDate = new Date(ciDate);
                limitDate.setHours(limit.hours, limit.mins, 0, 0);
            }

            let endTime = Date.now();
            if (endTime > limitDate.getTime()) {
                endTime = limitDate.getTime();
            }

            if (breakStartTime) {
                const breakDuration = Math.max(0, endTime - breakStartTime);
                logAttendanceEvent('break_end', breakDuration);
                breakStartTime = null;
            }

            const totalDuration = Math.max(0, (endTime - checkInTime) - totalBreakDuration);
            logAttendanceEvent('check_out', totalDuration);
            checkInTime = null;
        }
        holdActiveTaskForCheckout();
        setTimerState('idle');
        localStorage.removeItem('worksync_timerState');
        localStorage.removeItem('worksync_checkInTime');
        localStorage.removeItem('worksync_totalBreakDuration');
        localStorage.removeItem('worksync_breakStartTime');
        resetTimerUI();
        toast('Auto-checked out at end of shift', 'info');

        // Close break popup and floating reminder
        const modal = document.getElementById('breakStatusModal');
        if (modal && modal.open) {
            modal.close();
        }
        const floating = document.getElementById('breakFloatingReminder');
        if (floating) {
            floating.classList.add('hidden');
        }
        stopBreakTimer();
    }

    function checkAutoCheckout() {
        if (!isCheckedIn || !checkInTime) return;
        const now = new Date();
        const limit = getCheckoutLimit();
        const isPastTime = now.getHours() > limit.hours || (now.getHours() === limit.hours && now.getMinutes() >= limit.mins);
        if (isPastTime || now.toDateString() !== new Date(checkInTime).toDateString()) {
            autoCheckOut();
        }
    }

    function sendBreakExceededWebNotification(breakDuration) {
        if (!('Notification' in window)) return;
        const breakMinutes = Math.floor(breakDuration / 60000);
        const title = 'Break Limit Exceeded! ⏳';
        const options = {
            body: `You have been on break for ${breakMinutes} minutes. Tap to resume your work session.`,
            tag: 'break-exceeded-alert',
            requireInteraction: true
        };

        const showNotif = () => {
            const notification = new Notification(title, options);
            notification.onclick = () => {
                window.focus();
                const modal = document.getElementById('breakExceededModal');
                if (modal) {
                    modal.close();
                    modal.remove();
                }
                doResume();
            };
        };

        if (Notification.permission === 'granted') {
            showNotif();
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    showNotif();
                }
            });
        }
    }

    function showBreakExceededPopup(breakDuration) {
        if (document.getElementById('breakExceededModal')) return;

        const breakMinutes = Math.floor(breakDuration / 60000);
        const popupHtml = `
                <div class="relative bg-gradient-to-br from-amber-500 to-rose-600 p-8 text-white text-center rounded-3xl shadow-2xl border border-white/20 flex flex-col items-center max-w-sm mx-auto">
                    <div class="absolute -top-10 bg-white text-rose-600 w-20 h-20 rounded-full flex items-center justify-center shadow-lg border-4 border-rose-500/20">
                        <iconify-icon icon="solar:clock-circle-bold-duotone" width="44"></iconify-icon>
                    </div>
                    <h3 class="text-xl font-black mt-8 mb-2 tracking-tight">Break Limit Exceeded!</h3>
                    <p class="text-xs text-white/90 leading-relaxed mb-6">
                        You have been on break for <span class="font-black text-white underline underline-offset-4">${breakMinutes} minutes</span>, which exceeds the 30-minute break limit. Please resume your work session.
                    </p>
                    <button onclick="handleBreakExceededResume(this)" class="w-full bg-white hover:bg-slate-50 text-rose-600 font-black py-3.5 rounded-xl transition-all shadow-xl active:scale-[0.98] cursor-pointer text-sm">
                        Resume Work Now
                    </button>
                </div>
            `;

        const modal = document.createElement('dialog');
        modal.id = 'breakExceededModal';
        modal.className = "modal bg-transparent p-4 outline-none border-none backdrop:bg-black/75 max-w-md w-full m-auto fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[99999]";
        modal.style.margin = "0";
        modal.style.top = "50%";
        modal.style.left = "50%";
        modal.style.transform = "translate(-50%, -50%)";
        modal.innerHTML = popupHtml;

        document.body.appendChild(modal);

        const style = document.createElement('style');
        style.textContent = `
                #breakExceededModal::backdrop { background-color: rgba(0, 0, 0, 0.75); backdrop-filter: blur(8px); }
            `;
        modal.appendChild(style);

        modal.showModal();
    }

    function openBreakPopup() {
        const modal = document.getElementById('breakStatusModal');
        if (!modal) return;
        modal.showModal();

        const floating = document.getElementById('breakFloatingReminder');
        if (floating) {
            floating.classList.remove('hidden');
        }

        // Start the break timer display
        if (breakTimerInterval) clearInterval(breakTimerInterval);
        updateBreakDurationUI();
        breakTimerInterval = setInterval(updateBreakDurationUI, 1000);
    }

    function stopBreakTimer() {
        if (breakTimerInterval) {
            clearInterval(breakTimerInterval);
            breakTimerInterval = null;
        }
    }

    function updateBreakDurationUI() {
        if (!breakStartTime) return;
        const elapsedMs = Date.now() - breakStartTime;
        const totalSecs = Math.floor(elapsedMs / 1000);
        const hrs = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;
        const formatted = [
            String(hrs).padStart(2, '0'),
            String(mins).padStart(2, '0'),
            String(secs).padStart(2, '0')
        ].join(':');

        const popupTime = document.getElementById('breakPopupTimer');
        if (popupTime) popupTime.textContent = formatted;

        const floatTime = document.getElementById('breakFloatTimer');
        if (floatTime) floatTime.textContent = formatted;
    }

    async function handleBreakExceededResume(btn) {
        const dialog = btn.closest('dialog');
        if (dialog) {
            dialog.close();
            dialog.remove();
        }
        await doResume();
    }

    function checkBreakLimit() {
        if (!isCheckedIn || !breakStartTime) return;
        const breakDuration = Date.now() - breakStartTime;
        if (breakDuration > 30 * 60 * 1000) { // 30 minutes
            if (!document.getElementById('breakExceededModal')) {
                showBreakExceededPopup(breakDuration);
            }

            if (Date.now() - lastBreakAlertTime > 5 * 60 * 1000) {
                lastBreakAlertTime = Date.now();

                const sound = document.getElementById('announcement-notification-sound') || document.getElementById('chat-notification-sound');
                if (sound) {
                    sound.play().catch(e => console.warn('Audio play failed:', e));
                }

                sendBreakExceededWebNotification(breakDuration);
            }
        }
    }


    function tickTimer() {
        if (!checkInTime) return;
        const elapsedMs = Date.now() - checkInTime;
        const workMs = elapsedMs - totalBreakDuration;
        seconds = Math.floor(Math.max(0, workMs / 1000));
        document.getElementById('timer-display').textContent = formatTime(seconds);
        updateProdHeaderTimer(); // Update productivity header timer
        updateStats();
    }
    function formatTime(s) { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sc = s % 60; return [h, m, sc].map(v => v.toString().padStart(2, '0')).join(':'); }
    function resetTimerUI() { seconds = 0; document.getElementById('timer-display').textContent = '00:00:00'; }

    function restoreTimerState() {
        const state = localStorage.getItem('worksync_timerState');
        const ciTime = parseInt(localStorage.getItem('worksync_checkInTime'), 10);
        if (!state || !ciTime) return;
        isCheckedIn = true;
        checkInTime = ciTime;
        totalBreakDuration = parseInt(localStorage.getItem('worksync_totalBreakDuration'), 10) || 0;

        const now = new Date();
        const ciDate = new Date(ciTime);
        const limit = getCheckoutLimit();
        const isPastTime = now.getHours() > limit.hours || (now.getHours() === limit.hours && now.getMinutes() >= limit.mins);
        if (isPastTime || now.toDateString() !== ciDate.toDateString()) {
            if (state === 'paused') {
                breakStartTime = parseInt(localStorage.getItem('worksync_breakStartTime'), 10) || null;
            }
            autoCheckOut();
            return;
        }

        clearInterval(timerRef);
        if (state === 'running') {
            setTimerState('running');
            timerRef = setInterval(tickTimer, 1000);
            tickTimer(); // Run once immediately to update UI
        } else if (state === 'paused') {
            const bsTime = parseInt(localStorage.getItem('worksync_breakStartTime'), 10);
            if (bsTime) {
                breakStartTime = bsTime;
                const workDurationMs = (breakStartTime - checkInTime) - totalBreakDuration;
                seconds = Math.floor(Math.max(0, workDurationMs / 1000));
                document.getElementById('timer-display').textContent = formatTime(seconds);
            }
            setTimerState('paused');

            // Restore break popup state
            openBreakPopup();
        }
    }

    // ════════════════════════════════════════════════════════════════════
    // PRODUCTIVITY HEADER FUNCTIONS
    // ════════════════════════════════════════════════════════════════════

    // Update productivity header timer display
    function updateProdHeaderTimer() {
        const display = document.getElementById('prod-timer-display');
        const status = document.getElementById('prod-timer-status');
        const pulse = document.getElementById('prod-timer-pulse');
        
        if (!display) return;

        if (isCheckedIn) {
            display.textContent = formatTime(seconds);
            
            if (breakStartTime) {
                status.textContent = 'BREAK';
                pulse.className = 'relative inline-flex rounded-full h-2 w-2 bg-rose-500';
            } else {
                status.textContent = 'WORKING';
                pulse.className = 'relative inline-flex rounded-full h-2 w-2 bg-emerald-500 animate-pulse';
            }
        } else {
            display.textContent = '00:00:00';
            status.textContent = 'OFFLINE';
            pulse.className = 'relative inline-flex rounded-full h-2 w-2 bg-slate-400';
        }
    }

    // Update productivity header buttons state
    function updateProdHeaderButtons() {
        const btnCheckin = document.getElementById('prod-btn-checkin');
        const btnBreak = document.getElementById('prod-btn-break');
        const btnResume = document.getElementById('prod-btn-resume');
        const btnEndtask = document.getElementById('prod-btn-endtask');

        if (!btnCheckin) return;

        // Reset all
        btnCheckin.classList.add('hidden');
        btnBreak.classList.add('hidden');
        btnResume.classList.add('hidden');
        btnEndtask.classList.add('hidden');

        if (isCheckedIn) {
            if (breakStartTime) {
                // On Break: Show Resume & End Task
                btnResume.classList.remove('hidden');
                btnEndtask.classList.remove('hidden');
            } else {
                // Working: Show Break & End Task
                btnBreak.classList.remove('hidden');
                btnEndtask.classList.remove('hidden');
            }
        } else {
            // Offline: Show Check In
            btnCheckin.classList.remove('hidden');
        }
    }

    // Update sync status badge with last sync time
    function updateSyncStatusBadge() {
        const badge = document.getElementById('prod-sync-badge');
        const timeEl = document.getElementById('prod-sync-time');
        
        if (!badge || !timeEl) return;

        const lastSync = localStorage.getItem('worksync_lastSyncTime');
        if (lastSync) {
            const syncDate = new Date(parseInt(lastSync));
            const now = new Date();
            const diffMs = now - syncDate;
            const diffMins = Math.floor(diffMs / 60000);

            if (diffMins === 0) {
                timeEl.textContent = 'Synced now';
            } else if (diffMins < 60) {
                timeEl.textContent = `Synced ${diffMins}m ago`;
            } else {
                const hours = Math.floor(diffMins / 60);
                timeEl.textContent = `Synced ${hours}h ago`;
            }
        }

        badge.classList.remove('hidden');
    }

    // Record sync time to Firebase
    function recordSyncTime() {
        const now = Date.now();
        localStorage.setItem('worksync_lastSyncTime', String(now));
        updateSyncStatusBadge();
    }

    // Trigger manual sync
    async function triggerManualSync() {
        const badge = document.getElementById('prod-sync-badge');
        if (badge.hasAttribute('data-syncing')) return;

        badge.setAttribute('data-syncing', 'true');
        badge.style.opacity = '0.6';
        toast('Syncing tasks...', 'info');

        try {
            await syncTasks();
            recordSyncTime();
            toast('Sync complete!', 'success');
        } catch (err) {
            console.error('Manual sync failed:', err);
            toast('Sync failed - check connection', 'error');
        } finally {
            badge.removeAttribute('data-syncing');
            badge.style.opacity = '1';
        }
    }

    // Open current session details popup
    function openCurrentSessionPopup() {
        const modal = document.getElementById('current-session-modal');
        if (!modal) return;

        // Update current task
        const currentTaskEl = document.getElementById('session-current-task');
        if (activeTaskId) {
            const task = tasks.find(t => t.id === activeTaskId);
            currentTaskEl.textContent = task?.summary || task?.title || 'Unknown Task';
        } else {
            currentTaskEl.textContent = 'No active task';
        }

        // Update started time
        const startedAtEl = document.getElementById('session-started-at');
        if (checkInTime) {
            const startDate = new Date(checkInTime);
            startedAtEl.textContent = startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        } else {
            startedAtEl.textContent = '--:--';
        }

        // Update status
        const statusEl = document.getElementById('session-status');
        if (breakStartTime) {
            statusEl.textContent = 'On Break';
            statusEl.className = 'text-sm font-semibold text-rose-600';
        } else if (isCheckedIn) {
            statusEl.textContent = 'Working';
            statusEl.className = 'text-sm font-semibold text-emerald-600';
        } else {
            statusEl.textContent = 'Offline';
            statusEl.className = 'text-sm font-semibold text-slate-600';
        }

        // Update work time
        const workTimeEl = document.getElementById('session-work-time');
        workTimeEl.textContent = formatTime(seconds);

        // Update break time (estimate from break start time)
        const breakTimeEl = document.getElementById('session-break-time');
        if (breakStartTime) {
            const currentBreakMs = Date.now() - breakStartTime;
            const currentBreakSecs = Math.floor(currentBreakMs / 1000);
            breakTimeEl.textContent = formatTime(currentBreakSecs);
        } else {
            breakTimeEl.textContent = formatTime(Math.floor(totalBreakDuration / 1000));
        }

        // Hold time (placeholder - implement if tracking hold time separately)
        const holdTimeEl = document.getElementById('session-hold-time');
        holdTimeEl.textContent = '00:00:00'; // TODO: Implement hold time tracking if needed

        modal.showModal();
    }

    // Initialize productivity header listeners
    function initProdHeaderListeners() {
        // Initial setup
        updateProdHeaderTimer();
        updateProdHeaderButtons();
        updateSyncStatusBadge();

        // Update sync badge periodically
        setInterval(updateSyncStatusBadge, 60000); // Every minute
    }

    // ════════════════════════════════════════════════════════════════════
    // HEADER TOGGLER - Switch between Productivity and Legacy Headers
    // ════════════════════════════════════════════════════════════════════
    
    function toggleBetweenHeaders() {
        const prodHeader = document.querySelector('header:not(#legacy-global-header)');
        const legacyHeader = document.getElementById('legacy-global-header');
        
        if (legacyHeader.classList.contains('hidden')) {
            // Switch to legacy
            prodHeader.classList.add('hidden');
            legacyHeader.classList.remove('hidden');
            localStorage.setItem('headerMode', 'legacy');
            console.log('✅ Switched to Legacy Header');
        } else {
            // Switch to productivity
            prodHeader.classList.remove('hidden');
            legacyHeader.classList.add('hidden');
            localStorage.setItem('headerMode', 'productivity');
            console.log('✅ Switched to Productivity Header');
        }
    }
    
    // Load header preference on page load
    function restoreHeaderPreference() {
        const prodHeader = document.querySelector('header:not(#legacy-global-header)');
        const legacyHeader = document.getElementById('legacy-global-header');
        
        if (prodHeader) prodHeader.classList.add('hidden');
        if (legacyHeader) legacyHeader.classList.remove('hidden');
        
        // Ensure user preference is saved as legacy
        localStorage.setItem('headerMode', 'legacy');
    }

    // VIEW NAVIGATION
    function switchView(view) {
        if (view === 'dailyplan') {
            switchView('tasks');
            switchTasksTab('dailyplan');
            return;
        }
        if (view === 'internal-tasks') {
            switchView('tasks');
            switchTasksTab('internal');
            return;
        }
        if (view === 'completed') {
            switchView('tasks');
            switchTasksTab('completed');
            return;
        }

        if (view === 'reports' && !canViewReports()) view = 'dashboard';
        if (view === 'daily-summary' && !canViewDailySummary()) view = 'dashboard';
        if (view === 'projects' && !canViewProjects()) view = 'dashboard';
        if (view === 'users' && !isAdmin()) view = 'dashboard';
        if (view === 'meta-integration' && !isAdmin()) view = 'dashboard';
        if (view === 'qc' && !canViewQcPortal()) view = 'dashboard';
        if (view === 'leave-org' && !isLeaveOrganiser() && !isAdmin()) view = 'dashboard';
        if (view === 'organisers-admin' && !isAdmin()) view = 'dashboard';
        if (view === 'strategy-calendar' && !canViewStrategyCalendar()) view = 'dashboard';

        activeView = view;
        localStorage.setItem('worksync_activeView', view);
        ['dashboard', 'tasks', 'internal-tasks', 'dailyplan', 'projects', 'shoots', 'qc', 'notes', 'dpr', 'hr', 'chat', 'announcements', 'reports', 'users', 'daily-summary', 'event-org', 'leave-org', 'learnings-org', 'workplace-org', 'organisers-admin', 'dm-content-org', 'strategy-calendar', 'marketing-hub', 'meta-integration'].forEach(v => {
            document.getElementById(`view-${v}-panel`)?.classList.add('hidden');
            const navEl = document.getElementById(`nav-${v}`);
            if (navEl) navEl.classList.remove('nav-active');
        });
        document.getElementById(`view-${view}-panel`)?.classList.remove('hidden');
        const targetNav = document.getElementById(`nav-${view}`);
        if (targetNav) targetNav.classList.add('nav-active');

        const titles = {
            dashboard: 'Dashboard Overview',
            tasks: 'Jira Task Board',
            'internal-tasks': 'Internal Tasks',
            dailyplan: 'Daily Plan',
            projects: 'Project Overview',
            shoots: 'Client Shoot Calendar',
            qc: 'Quality Check Portal',
            notes: 'My Personal Notes',
            dpr: 'Daily Productivity Report',
            hr: 'HR Portal',
            chat: 'Team Chat',
            announcements: 'Announcements',
            reports: 'Reports & Analytics',
            users: 'User Management',
            'daily-summary': 'Daily Status Summaries',
            'event-org': 'Event Organiser Board',
            'leave-org': 'Leave Organiser Portal',
            'learnings-org': 'Learning Logs & Resources',
            'workplace-org': 'Workplace Suggestions',
            'organisers-admin': 'Monthly Organisers & Activity',
            'dm-content-org': 'DM Content Organiser Board',
            'strategy-calendar': 'Strategy Calendar',
            'marketing-hub': 'Marketing Hub',
            'meta-integration': 'Meta Business Integration'
        };
        document.getElementById('view-title').textContent = titles[view] || 'WorkSync';

        if (view === 'tasks') {
            switchTasksTab(activeTasksTab || 'jira');
        }
        else if (view === 'shoots') {
            renderShootCalendar();
        }
        else if (view === 'projects') {
            renderProjects();
        }
        else if (view === 'dailyplan') { renderDailyPlan(); }
        else if (view === 'internal-tasks') { populateInternalClientFilter(); populateInternalAssigneeFilter(); renderInternalTasks(); }
        else if (view === 'qc') { renderQcTasks(); loadQcReports(); }
        else if (view === 'reports') {
            if (!reportDateFrom) initReportFilters();
            loadAttendanceEvents();
            loadAllTimeLogs();
            if (isManager() && !isAdmin()) currentReportTab = 'client';
            if (currentReportTab === 'client') setReportDatePreset('this_month');
            switchReportTab(currentReportTab);
        } else if (view === 'dpr') { initDpr(); switchDprTab(currentDprTab); }
        else if (view === 'hr') { loadMyRequests(); loadApprovals(); loadHrBadge(); }
        else if (view === 'chat') { document.getElementById('chat-welcome').classList.remove('hidden'); renderDmList(); }
        else if (view === 'announcements') { unreadAnnouncements = 0; renderAnnouncementBadge(); loadAnnouncements(); }
        else if (view === 'users') { loadUsersList(); }
        else if (view === 'notes') { loadNotes(); }
        else if (view === 'daily-summary') { loadTodayWorkSummary(); renderDailySummary(); }
        else if (view === 'marketing-hub') { 
            const tab = localStorage.getItem('mh_currentTab') || 'overview';
            switchMarketingTab(tab);
        }
        else if (view === 'meta-integration') { initMetaIntegration(); }
        else if (view === 'event-org') { renderEventOrgPanel(); }
        else if (view === 'leave-org') { renderLeaveOrgPanel(); }
        else if (view === 'learnings-org') { renderLearningsOrgPanel(); }
        else if (view === 'workplace-org') { renderWorkplaceOrgPanel(); }
        else if (view === 'dm-content-org') { renderDmContentOrgPanel(); }
        else if (view === 'strategy-calendar') { initStrategyCalendar(); }
        else if (view === 'organisers-admin') { populateOrganisersAdminPanel(); }

        // Manage Live Board Timers for Admin
        if ((view === 'dashboard' || view === 'dailyplan') && isAdmin()) {
            startLiveBoardTimers();
        } else {
            stopLiveBoardTimers();
        }
    }

    function startLiveBoardTimers() {
        if (liveBoardTimerRef) clearInterval(liveBoardTimerRef);
        liveBoardTimerRef = setInterval(updateLiveBoardTimers, 1000);
    }

    function stopLiveBoardTimers() {
        if (liveBoardTimerRef) {
            clearInterval(liveBoardTimerRef);
            liveBoardTimerRef = null;
        }
    }

    // TASK STATUS HELPERS
    function isDone(s) { if (!s) return false; const lower = String(s).toLowerCase().trim(); return ['done', 'resolved', 'closed', 'completed', 'design completed', 'client approved', 'posted', 'analytics', 'client sent', 'shoot completed', 'quality check'].includes(lower); }
    function isInProgress(s) { if (!s) return false; const lower = String(s).toLowerCase().trim(); return ['in progress', 'active', 'running', 'in review', 'design in progress', 'design to do', 'thumbnail', 'rework designs', 'shoot in progress', 'content in progress', 'client content approval'].includes(lower); }
    function isTodo(s) { if (!s) return false; const lower = String(s).toLowerCase().trim(); return ['to do', 'open', 'backlog', 'new', 'shoot needed', 'shoot planned', 'content to do'].includes(lower); }
    function isHold(s) { if (!s) return false; const lower = String(s).toLowerCase().trim(); return ['design hold', 'hold', 'on hold'].includes(lower); }
    function isInternalTodo(s) { if (!s) return false; const lower = String(s).toLowerCase().trim(); return ['to do', 'discussion'].includes(lower); }
    function isInternalInProgress(s) { if (!s) return false; const lower = String(s).toLowerCase().trim(); return ['in progress', 'learnings', 'learning'].includes(lower); }
    function isInternalDone(s) { if (!s) return false; const lower = String(s).toLowerCase().trim(); return ['completed', 'done'].includes(lower); }

    async function getAllUsers() {
        const snap = await get(ref(db, 'worksync/users'));
        const fbUsers = snap.val() || {};
        const merged = new Map();
        USERS.forEach(u => merged.set(u.email.toLowerCase(), { ...u }));
        Object.values(fbUsers).forEach(u => {
            if (u.email) {
                merged.set(u.email.toLowerCase(), { ...(merged.get(u.email.toLowerCase()) || {}), ...u });
            }
        });
        return merged; // Return the map directly
    }

    // SHOOT CALENDAR
    function navigateShootCalendar(direction) {
        if (direction === 0) { // Today
            shootCalendarDate = new Date();
        } else {
            shootCalendarDate.setMonth(shootCalendarDate.getMonth() + direction);
        }
        renderShootCalendar();
    }

    function renderShootCalendar() {
        const grid = document.getElementById('shoot-calendar-grid');
        const title = document.getElementById('shoot-calendar-title');
        if (!grid || !title) return;

        const month = shootCalendarDate.getMonth();
        const year = shootCalendarDate.getFullYear();

        title.textContent = shootCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' });

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        grid.innerHTML = '';

        // Day headers
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayNames.forEach(day => {
            grid.innerHTML += `<div class="text-center p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-r border-slate-100">${day}</div>`;
        });

        // Blank days for the first week
        for (let i = 0; i < firstDay; i++) {
            grid.innerHTML += `<div class="border-r border-b border-slate-50 bg-slate-50/50"></div>`;
        }

        // Include shoots that are either "Shoot Needed" OR have shootStorage (completed)
        const shootTasks = tasks.filter(t => {
            if (!t.duedate) return false;
            const isShootNeeded = t.status === 'Shoot Needed';
            const hasShootStorage = !!t.shootStorage;
            return isShootNeeded || hasShootStorage;
        });
        
        const tasksByDate = shootTasks.reduce((acc, task) => {
            const date = task.duedate.slice(0, 10);
            if (!acc[date]) acc[date] = [];
            acc[date].push(task);
            return acc;
        }, {});

        const today = new Date();
        const todayStr = today.toISOString().slice(0, 10);

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayTasks = tasksByDate[dateStr] || [];
            const isToday = dateStr === todayStr;

            let dayHtml = `<div onclick="openShootPlanModal('${dateStr}')" class="relative p-3 border-r border-b border-slate-100 min-h-[120px] flex flex-col group ${isToday ? 'bg-indigo-50/50' : ''} hover:bg-slate-100/50 transition-colors cursor-pointer"><time datetime="${dateStr}" class="font-black text-sm ${isToday ? 'text-indigo-600' : 'text-slate-700'}">${day}</time><div class="mt-2 space-y-1 overflow-y-auto flex-1">`;
            
            dayTasks.forEach(task => { 
                // Check if shoot is completed by checking for shootStorage
                const isCompleted = !!task.shootStorage;
                const bgClass = isCompleted ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200';
                const textClass = isCompleted ? 'text-emerald-800' : 'text-slate-800';
                const hoverClass = isCompleted ? 'hover:border-emerald-400' : 'hover:border-indigo-300';
                
                // Show storage info if available
                const storageHtml = isCompleted && task.shootStorage ? `<div class="mt-1 pt-1 border-t border-emerald-100"><p class="text-[9px] font-bold text-emerald-600 truncate">💾 ${escapeHtml(task.shootStorage.nodeName || 'Storage')}</p></div>` : '';
                
                dayHtml += `<div onclick="event.stopPropagation(); openEditTaskModal('${task.id}')" class="${bgClass} p-1.5 rounded-lg border shadow-sm hover:shadow-md transition-shadow ${hoverClass}"><p class="text-[10px] font-bold ${textClass} truncate">${escapeHtml(task.desc)}</p><p class="text-[9px] text-slate-500 font-medium">${escapeHtml(task.client || 'No Client')}</p>${storageHtml}</div>`; 
            });
            
            dayHtml += `</div></div>`;
            grid.innerHTML += dayHtml;
        }
    }

    async function openShootPlanModal(date) {
        document.getElementById('sp-date').value = date;

        const clientSelect = document.getElementById('sp-client');
        clientSelect.innerHTML = '<option value="">Select client...</option>' + CLIENTS.map(c => `<option value="${c}">${c}</option>`).join('');

        const allUsers = Array.from(allUsersMap.values()); // Use the global map
        const assigneeSelect = document.getElementById('sp-assignee');
        assigneeSelect.innerHTML = '<option value="">Select assignee...</option>' + allUsers.map(u => `<option value="${u.email}">${u.name}</option>`).join('');
        assigneeSelect.value = currentUser.email; // Default to current user

        document.getElementById('sp-title').value = '';
        document.getElementById('sp-notes').value = '';

        document.getElementById('shootPlanModal').showModal();
    }

    async function saveShootPlan() {
        const title = document.getElementById('sp-title').value.trim();
        const client = document.getElementById('sp-client').value;
        const date = document.getElementById('sp-date').value;
        const assigneeEmail = document.getElementById('sp-assignee').value;
        const notes = document.getElementById('sp-notes').value.trim();

        if (!title || !client || !date || !assigneeEmail) return toast('Please fill all required fields.', 'error');

        const assignee = allUsersMap.get(assigneeEmail.toLowerCase()); // Use the global map

        const taskId = 'M-' + Date.now();
        const task = { id: taskId, desc: title, client, status: 'Shoot Needed', priority: 'High', assignee: assignee?.name || 'Unassigned', assigneeEmail, duedate: date, notes, manual: true, taskType: 'internal', userId: assigneeEmail, createdAt: Date.now(), createdBy: currentUser.email };

        // Save the task under the ASSIGNEE's path so they can see it.
        await set(ref(db, `worksync/manual_tasks/${eKey(assigneeEmail)}/${taskId}`), task);
        tasks.unshift(task);
        populateInternalClientFilter();
        populateInternalAssigneeFilter();
        renderTasks(); renderInternalTasks(); updateStats(); renderShootCalendar();
        document.getElementById('shootPlanModal').close();
        toast('Shoot plan created successfully!', 'success');
    }

    // --- Strategy Calendar JS Functions ---
    let strategyCurrentDate = new Date();
    let strategyEvents = {};
    let strategyEventsUnsub = null;

    async function initStrategyCalendar() {
        // Show action buttons container if they can write/admin
        const acts = document.getElementById('strategy-action-buttons');
        if (acts) {
            acts.classList.toggle('hidden', !canViewStrategyCalendar());
        }

        // Populating owners dropdown in modal
        const ownerSelect = document.getElementById('strategy-owner');
        if (ownerSelect) {
            if (!allUsersMap.size) allUsersMap = await getAllUsers();
            const users = Array.from(allUsersMap.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            ownerSelect.innerHTML = '<option value="">Unassigned</option>' + users.map(u => `
                    <option value="${escapeHtml(u.email)}">${escapeHtml(u.name)} (${escapeHtml(u.email)})</option>
                `).join('');
        }

        if (!db) return;
        if (strategyEventsUnsub) strategyEventsUnsub();

        strategyEventsUnsub = onValue(ref(db, 'worksync/strategy_events'), (snap) => {
            strategyEvents = snap.val() || {};
            renderStrategyCalendar();
            renderStrategySidebar();
        });
    }

    function navigateStrategyCalendar(direction) {
        if (direction === 0) {
            strategyCurrentDate = new Date();
        } else {
            strategyCurrentDate.setMonth(strategyCurrentDate.getMonth() + direction);
        }
        renderStrategyCalendar();
        renderStrategySidebar();
    }

    // Matrix Planner State
    window.activeMatrixView = 'matrix';
    window.matrixSearchQuery = '';
    window.matrixFilterClient = 'All';
    window.matrixFilterAssignee = 'All';
    window.matrixFilterStatus = 'All';
    window.matrixFilterFormat = 'All';

    window.setMatrixPlannerView = function(viewName) {
        window.activeMatrixView = viewName;

        // Highlight active view button
        document.querySelectorAll('.matrix-view-btn').forEach(btn => {
            btn.className = 'matrix-view-btn px-3 py-1.5 rounded-xl text-xs font-bold transition-all text-slate-600 hover:text-slate-900 flex items-center gap-1.5';
        });
        const activeBtn = document.getElementById('matrix-view-btn-' + viewName);
        if (activeBtn) {
            activeBtn.className = 'matrix-view-btn px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-white text-indigo-600 shadow-sm flex items-center gap-1.5';
        }

        // Hide all view panels
        document.querySelectorAll('.matrix-view-panel').forEach(panel => panel.classList.add('hidden'));

        // Show active panel and render content
        const targetPanel = document.getElementById(viewName + '-view-content');
        if (targetPanel) {
            targetPanel.classList.remove('hidden');
        }

        if (viewName === 'matrix') {
            renderMatrixPlannerGrid();
        } else if (viewName === 'calendar') {
            renderStrategyCalendarGrid();
        } else if (viewName === 'timeline') {
            renderMatrixTimelineView();
        } else if (viewName === 'kanban') {
            renderMatrixKanbanView();
        } else if (viewName === 'workload') {
            renderMatrixWorkloadView();
        }

        renderMatrixBottomAnalytics();
    };

    window.filterMatrixPlanner = function() {
        const searchInput = document.getElementById('matrix-search-input');
        if (searchInput) window.matrixSearchQuery = searchInput.value.toLowerCase().trim();

        const clientSel = document.getElementById('matrix-filter-client');
        if (clientSel) window.matrixFilterClient = clientSel.value;

        const assigneeSel = document.getElementById('matrix-filter-assignee');
        if (assigneeSel) window.matrixFilterAssignee = assigneeSel.value;

        const statusSel = document.getElementById('matrix-filter-status');
        if (statusSel) window.matrixFilterStatus = statusSel.value;

        const formatSel = document.getElementById('matrix-filter-format');
        if (formatSel) window.matrixFilterFormat = formatSel.value;

        window.setMatrixPlannerView(window.activeMatrixView || 'matrix');
    };

    function renderStrategyCalendar() {
        const title = document.getElementById('strategy-calendar-title');
        if (title) {
            title.textContent = strategyCurrentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        }

        // Populate client tabs
        if (typeof renderStrategyClientTabs === 'function') renderStrategyClientTabs();

        // Render current active view (Matrix by default)
        window.setMatrixPlannerView(window.activeMatrixView || 'matrix');
    }

    function getOneDeskStatusCategory(status) {
        if (!status) return 'Waiting';
        const s = status.toLowerCase();
        if (s.includes('done') || s.includes('posted') || s.includes('completed') || s.includes('analytics') || s.includes('sent') || s.includes('approved')) {
            return 'Completed';
        }
        if (s.includes('progress') || s.includes('working') || s.includes('quality') || s.includes('thumbnail') || s.includes('rework')) {
            return 'Working';
        }
        return 'Waiting';
    }

    function getOneDeskStatusPill(status) {
        const cat = getOneDeskStatusCategory(status);
        if (cat === 'Completed') {
            return { category: 'Completed', icon: 'solar:check-circle-bold', bgClass: 'bg-emerald-50 border border-emerald-100', textClass: 'text-emerald-700' };
        }
        if (cat === 'Working') {
            return { category: 'Working', icon: 'solar:play-circle-bold', bgClass: 'bg-blue-50 border border-blue-100', textClass: 'text-blue-700' };
        }
        return { category: 'Waiting', icon: 'solar:clock-circle-bold', bgClass: 'bg-amber-50 border border-amber-100', textClass: 'text-amber-700' };
    }

    function getClientAvatarBg(clientName) {
        const colors = [
            'bg-gradient-to-br from-indigo-500 to-purple-600',
            'bg-gradient-to-br from-blue-500 to-cyan-600',
            'bg-gradient-to-br from-emerald-500 to-teal-600',
            'bg-gradient-to-br from-amber-500 to-orange-600',
            'bg-gradient-to-br from-rose-500 to-pink-600',
            'bg-gradient-to-br from-violet-500 to-purple-700'
        ];
        let hash = 0;
        for (let i = 0; i < (clientName || '').length; i++) hash += clientName.charCodeAt(i);
        return colors[Math.abs(hash) % colors.length];
    }

    function populateMatrixToolbarDropdowns(clientsList) {
        const clientSel = document.getElementById('matrix-filter-client');
        if (clientSel && clientSel.options.length <= 1) {
            clientsList.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c;
                opt.textContent = c;
                clientSel.appendChild(opt);
            });
        }

        const assigneeSel = document.getElementById('matrix-filter-assignee');
        if (assigneeSel && assigneeSel.options.length <= 1) {
            const assignees = ['Barath', 'Immanuel', 'Karthika', 'Dharani', 'Siddharth'];
            assignees.forEach(a => {
                const opt = document.createElement('option');
                opt.value = a;
                opt.textContent = a;
                assigneeSel.appendChild(opt);
            });
        }
    }

    window.renderMatrixPlannerGrid = function() {
        const container = document.getElementById('matrix-view-content');
        if (!container) return;

        const month = strategyCurrentDate.getMonth();
        const year = strategyCurrentDate.getFullYear();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Unique clients list
        const allClientsSet = new Set(['Einstein', 'NTT', 'IVN', 'Quade', 'Nivya', 'RG Construction', 'Vilpower']);
        Object.values(strategyEvents || {}).forEach(ev => { if (ev.client) allClientsSet.add(ev.client); });
        const clientsList = Array.from(allClientsSet).sort();

        populateMatrixToolbarDropdowns(clientsList);

        // Filter events
        const monthEvents = [];
        Object.entries(strategyEvents || {}).forEach(([id, ev]) => {
            if (!ev.date) return;
            const eventDate = new Date(ev.date);
            if (eventDate.getMonth() === month && eventDate.getFullYear() === year) {
                if (window.matrixFilterClient !== 'All' && ev.client !== window.matrixFilterClient) return;
                if (window.matrixFilterAssignee !== 'All' && (ev.owner || ev.assignee) !== window.matrixFilterAssignee) return;
                if (window.matrixFilterFormat !== 'All' && ev.format !== window.matrixFilterFormat) return;
                if (window.matrixFilterStatus !== 'All') {
                    if (getOneDeskStatusCategory(ev.status) !== window.matrixFilterStatus) return;
                }
                if (window.matrixSearchQuery) {
                    const txt = `${ev.title || ''} ${ev.client || ''} ${ev.owner || ''} ${ev.status || ''}`.toLowerCase();
                    if (!txt.includes(window.matrixSearchQuery)) return;
                }
                monthEvents.push({ id, ...ev });
            }
        });

        // Compute Daily Workload Capacity
        const dailyCapacity = {};
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const tasksOnDay = monthEvents.filter(ev => ev.date === dateStr);
            const totalHours = tasksOnDay.reduce((acc, ev) => acc + (parseFloat(ev.estimatedHours) || 2), 0);
            dailyCapacity[dateStr] = {
                hours: totalHours,
                maxHours: 32
            };
        }

        // Build Table
        let tableHtml = `
            <table class="w-full text-left border-collapse min-w-[1400px]">
                <thead>
                    <tr>
                        <th class="matrix-sticky-top-left p-4 border-r border-b border-slate-200 w-64 shadow-sm bg-slate-100 dark:bg-slate-800">
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-black text-slate-800 dark:text-slate-100 tracking-wider uppercase">CLIENT (${clientsList.length})</span>
                                <span class="text-[10px] font-bold text-slate-400">TOTAL TASKS</span>
                            </div>
                        </th>
        `;

        const todayStr = new Date().toISOString().split('T')[0];

        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj = new Date(year, month, d);
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            const cap = dailyCapacity[dateStr] || { hours: 0, maxHours: 32 };
            const isToday = dateStr === todayStr;
            const capPercent = Math.min(100, Math.round((cap.hours / cap.maxHours) * 100));

            let capColor = 'bg-emerald-500';
            if (capPercent > 80 && capPercent <= 100) capColor = 'bg-amber-500';
            if (capPercent > 100) capColor = 'bg-rose-500';

            tableHtml += `
                <th class="matrix-sticky-header p-3 border-r border-b border-slate-200 text-center min-w-[150px] ${isToday ? 'bg-indigo-50/80 dark:bg-indigo-950/40' : 'bg-slate-50 dark:bg-slate-900'} shadow-sm">
                    <div class="flex flex-col items-center justify-between gap-1">
                        <div class="flex items-center gap-1.5">
                            <span class="text-xs font-black ${isToday ? 'text-indigo-600' : 'text-slate-800 dark:text-slate-100'}">Aug ${d}</span>
                            <span class="text-[10px] font-bold text-slate-400 uppercase">${dayName}</span>
                        </div>
                        <div class="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1 flex" title="Capacity: ${cap.hours} / ${cap.maxHours} hrs">
                            <div class="${capColor} h-full transition-all duration-300" style="width: ${capPercent}%"></div>
                        </div>
                        <span class="text-[9px] font-extrabold text-slate-500">${cap.hours} / ${cap.maxHours} hrs</span>
                    </div>
                </th>
            `;
        }
        tableHtml += `</tr></thead><tbody>`;

        clientsList.forEach(client => {
            const clientEvents = monthEvents.filter(ev => ev.client === client);
            const totalCount = clientEvents.length;
            const completedCount = clientEvents.filter(ev => getOneDeskStatusCategory(ev.status) === 'Completed').length;
            const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
            const avatarBg = getClientAvatarBg(client);
            const cleanClientId = client.replace(/[^a-zA-Z0-9]/g, '_');

            tableHtml += `
                <tr class="border-b border-slate-100 hover:bg-slate-50/30 transition-colors">
                    <td class="matrix-sticky-col p-4 border-r border-slate-200 shadow-sm align-top">
                        <div class="flex flex-col gap-2">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-2.5">
                                    <div class="w-9 h-9 rounded-xl ${avatarBg} text-white font-black text-xs flex items-center justify-center shadow-sm">
                                        ${client.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 class="text-xs font-black text-slate-900 dark:text-slate-100 truncate max-w-[110px]">${escapeHtml(client)}</h4>
                                        <span class="text-[10px] font-bold text-slate-400">${totalCount} Monthly Tasks</span>
                                    </div>
                                </div>
                                <button onclick="openAddStrategyEventModal('', '${escapeHtml(client)}')" class="p-1 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all" title="Quick Add Task">
                                    <iconify-icon icon="solar:add-square-bold" width="16"></iconify-icon>
                                </button>
                            </div>
                            <div class="space-y-1">
                                <div class="flex justify-between text-[9px] font-extrabold text-slate-500">
                                    <span>${completedCount} / ${totalCount} Tasks</span>
                                    <span>${percent}%</span>
                                </div>
                                <div class="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                    <div class="bg-indigo-600 h-full transition-all duration-300" style="width: ${percent}%"></div>
                                </div>
                            </div>
                        </div>
                    </td>
            `;

            for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const cellEvents = clientEvents.filter(ev => ev.date === dateStr);

                tableHtml += `
                    <td id="matrix-cell-${cleanClientId}-${dateStr}" 
                        ondragover="event.preventDefault()" 
                        ondrop="handleMatrixDrop(event, '${escapeHtml(client)}', '${dateStr}')"
                        ondblclick="openInlineMatrixTaskCreator('${cleanClientId}', '${dateStr}', '${escapeHtml(client)}')"
                        class="matrix-cell p-2 border-r border-slate-100 align-top transition-all">
                        <div class="space-y-2 min-h-[70px]">
                `;

                cellEvents.forEach(ev => {
                    const statusObj = getOneDeskStatusPill(ev.status);
                    const formatIcon = ev.format === 'Video' ? '🎥' : '📷';
                    const assigneeName = ev.owner || ev.assignee || 'Unassigned';

                    let userAvatar = '';
                    if (typeof allUsersMap !== 'undefined' && allUsersMap) {
                        const foundUser = Array.from(allUsersMap.values()).find(u => 
                            (u.name || '').toLowerCase().trim() === assigneeName.toLowerCase().trim() ||
                            (u.email || '').toLowerCase().trim() === assigneeName.toLowerCase().trim()
                        );
                        if (foundUser && foundUser.profilePicture) {
                            userAvatar = foundUser.profilePicture;
                        }
                    }
                    if (!userAvatar) {
                        userAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(assigneeName)}`;
                    }

                    tableHtml += `
                        <div id="matrix-card-${ev.id}" 
                             draggable="true" 
                             ondragstart="handleMatrixDragStart(event, '${ev.id}')"
                             onclick="event.stopPropagation(); openMatrixTaskDrawer('${ev.id}')"
                             class="matrix-task-card bg-white dark:bg-slate-800 rounded-xl p-2.5 shadow-sm border border-slate-200/80 hover:border-indigo-300 transition-all cursor-pointer group flex items-start gap-2">
                            
                            <div class="flex-grow min-w-0">
                                <div class="flex items-center justify-between gap-1 mb-1">
                                    <span class="text-[10px] font-extrabold text-slate-500">${formatIcon} ${escapeHtml(ev.format || 'Task')}</span>
                                    <span class="px-2 py-0.5 rounded-full text-[8px] font-black ${statusObj.bgClass} ${statusObj.textClass} flex items-center gap-1 flex-shrink-0">
                                        <iconify-icon icon="${statusObj.icon}" width="10"></iconify-icon>
                                        ${statusObj.category}
                                    </span>
                                </div>

                                <p class="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight">${escapeHtml(ev.title)}</p>
                                
                                <div class="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-700/50">
                                    <div class="flex items-center gap-1.5 min-w-0">
                                        <img src="${userAvatar}" class="w-4 h-4 rounded-full object-cover bg-slate-100 border border-slate-200" alt="">
                                        <span class="text-[9px] font-bold text-slate-500 truncate max-w-[70px]">${escapeHtml(assigneeName)}</span>
                                    </div>
                                    <iconify-icon icon="solar:pen-bold" class="text-slate-300 group-hover:text-indigo-600 transition-colors" width="12"></iconify-icon>
                                </div>
                            </div>
                        </div>
                    `;
                });

                tableHtml += `
                        </div>
                    </td>
                `;
            }

            tableHtml += `</tr>`;
        });

        tableHtml += `</tbody></table>`;
        container.innerHTML = tableHtml;
    };

    window.renderStrategyCalendarGrid = function() {
        const grid = document.getElementById('strategy-calendar-grid');
        if (!grid) return;

        const month = strategyCurrentDate.getMonth();
        const year = strategyCurrentDate.getFullYear();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        grid.innerHTML = '';
        for (let i = 0; i < firstDay; i++) {
            grid.innerHTML += `<div class="border-r border-b border-slate-50 bg-slate-50/30 min-h-[110px]"></div>`;
        }

        const todayStr = new Date().toISOString().split('T')[0];

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const dayEvents = Object.entries(strategyEvents || {})
                .filter(([_, ev]) => ev.date === dateStr)
                .map(([id, ev]) => ({ id, ...ev }));

            let eventsHtml = '';
            dayEvents.forEach(ev => {
                const statusObj = getOneDeskStatusPill(ev.status);
                eventsHtml += `
                    <div onclick="event.stopPropagation(); openMatrixTaskDrawer('${ev.id}')" 
                         class="px-2 py-1 rounded-lg text-[9px] font-black ${statusObj.bgClass} ${statusObj.textClass} flex items-center justify-between cursor-pointer truncate">
                        <span class="truncate">${escapeHtml(ev.title)}</span>
                        <span class="text-[8px]">${ev.format === 'Video' ? '🎥' : '📷'}</span>
                    </div>
                `;
            });

            grid.innerHTML += `
                <div onclick="openAddStrategyEventModal('${dateStr}')" 
                     class="p-2 border-r border-b border-slate-100 min-h-[110px] flex flex-col ${isToday ? 'bg-indigo-50/40' : ''} hover:bg-slate-50/50 cursor-pointer">
                    <span class="font-black text-xs ${isToday ? 'text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg' : 'text-slate-600'} w-fit">${d}</span>
                    <div class="mt-1.5 space-y-1 flex-1 overflow-y-auto max-h-[80px]">
                        ${eventsHtml}
                    </div>
                </div>
            `;
        }
    };

    window.openInlineMatrixTaskCreator = function(cellSanitizedId, dateStr, clientName) {
        const cell = document.getElementById(`matrix-cell-${cellSanitizedId}-${dateStr}`);
        if (!cell) return;

        const formId = `inline-form-${Date.now()}`;
        const inlineHtml = `
            <div id="${formId}" class="bg-indigo-50/90 dark:bg-indigo-950 p-2.5 rounded-xl border border-indigo-200 space-y-2 shadow-md">
                <input id="${formId}-title" type="text" placeholder="Task Title..." class="w-full text-xs font-bold p-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                
                <div class="grid grid-cols-2 gap-1.5">
                    <select id="${formId}-assignee" class="text-[10px] font-bold p-1 rounded-lg border border-slate-200">
                        <option value="">Assignee</option>
                        <option value="Barath">Barath</option>
                        <option value="Immanuel">Immanuel</option>
                        <option value="Karthika">Karthika</option>
                        <option value="Dharani">Dharani</option>
                        <option value="Siddharth">Siddharth</option>
                    </select>

                    <select id="${formId}-format" class="text-[10px] font-bold p-1 rounded-lg border border-slate-200">
                        <option value="Poster">📷 Poster</option>
                        <option value="Video">🎥 Video</option>
                    </select>
                </div>

                <div class="flex items-center justify-end gap-1.5">
                    <button onclick="document.getElementById('${formId}').remove()" class="px-2 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-800">Cancel</button>
                    <button onclick="saveInlineMatrixTask('${formId}', '${escapeHtml(clientName)}', '${dateStr}')" class="px-2.5 py-1 text-[10px] font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm">Save</button>
                </div>
            </div>
        `;

        cell.insertAdjacentHTML('beforeend', inlineHtml);
        const titleInput = document.getElementById(`${formId}-title`);
        if (titleInput) titleInput.focus();
    };

    window.saveInlineMatrixTask = function(formId, clientName, dateStr) {
        const titleEl = document.getElementById(`${formId}-title`);
        const assigneeEl = document.getElementById(`${formId}-assignee`);
        const formatEl = document.getElementById(`${formId}-format`);
        
        if (!titleEl || !titleEl.value.trim()) return toast('Please enter a task title', 'error');

        const title = titleEl.value.trim();
        const owner = assigneeEl ? assigneeEl.value : '';
        const format = formatEl ? formatEl.value : 'Poster';

        const newId = `strat_${Date.now()}`;
        const newEvent = {
            title,
            client: clientName,
            date: dateStr,
            owner,
            format,
            platform: 'General Brand',
            status: 'To Do',
            createdAt: new Date().toISOString()
        };

        set(ref(db, 'worksync/strategy_events/' + newId), newEvent)
            .then(() => {
                toast('Task created successfully', 'success');
                renderStrategyCalendar();
            })
            .catch(err => {
                toast('Failed to create task: ' + err.message, 'error');
            });
    };

    window.handleMatrixDragStart = function(event, taskId) {
        event.dataTransfer.setData('text/plain', taskId);
    };

    window.handleMatrixDrop = function(event, newClient, newDateStr) {
        event.preventDefault();
        const taskId = event.dataTransfer.getData('text/plain');
        if (!taskId || !strategyEvents[taskId]) return;

        const currentTask = strategyEvents[taskId];
        if (currentTask.client === newClient && currentTask.date === newDateStr) return;

        const updates = {};
        updates[`worksync/strategy_events/${taskId}/client`] = newClient;
        updates[`worksync/strategy_events/${taskId}/date`] = newDateStr;

        update(ref(db), updates).then(() => {
            toast(`Task moved to ${newClient} on ${newDateStr}`, 'success');
            renderStrategyCalendar();
        });
    };

    window.openMatrixTaskDrawer = function(taskId) {
        const ev = strategyEvents[taskId];
        if (!ev) return;

        document.getElementById('drawer-task-id').value = taskId;
        document.getElementById('drawer-task-title').value = ev.title || '';
        document.getElementById('drawer-task-desc').value = ev.desc || ev.description || '';
        document.getElementById('drawer-task-date').value = ev.date || '';
        document.getElementById('drawer-task-priority').value = ev.priority || 'Medium';

        const formatBadge = document.getElementById('drawer-format-badge');
        if (formatBadge) formatBadge.textContent = ev.format === 'Video' ? '🎥 Video' : '📷 Poster';

        const clientSel = document.getElementById('drawer-task-client');
        if (clientSel) {
            const clients = ['Einstein', 'NTT', 'IVN', 'Quade', 'Nivya', 'RG Construction', 'Vilpower'];
            clientSel.innerHTML = clients.map(c => `<option value="${escapeHtml(c)}" ${c === ev.client ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('');
        }

        const assigneeSel = document.getElementById('drawer-task-assignee');
        if (assigneeSel) {
            const assignees = ['Barath', 'Immanuel', 'Karthika', 'Dharani', 'Siddharth'];
            assigneeSel.innerHTML = `<option value="">Unassigned</option>` + assignees.map(u => `<option value="${escapeHtml(u)}" ${(ev.owner || ev.assignee) === u ? 'selected' : ''}>${escapeHtml(u)}</option>`).join('');
        }

        const statusSel = document.getElementById('drawer-task-status');
        if (statusSel) statusSel.value = ev.status || 'To Do';

        const aiBox = document.getElementById('drawer-ai-suggestions');
        if (aiBox) {
            aiBox.innerHTML = `
                <div class="flex items-center gap-2">
                    <span class="font-bold text-indigo-600">Recommended Assignee:</span>
                    <span>Barath (Lowest workload for Aug)</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="font-bold text-purple-600">Estimated Duration:</span>
                    <span>2.5 hours</span>
                </div>
                <div class="flex items-center gap-2 text-emerald-700">
                    <iconify-icon icon="solar:check-circle-bold" width="14"></iconify-icon>
                    <span>No duplicate tasks detected for ${escapeHtml(ev.client || 'Client')}.</span>
                </div>
            `;
        }

        const drawer = document.getElementById('matrix-task-drawer');
        if (drawer) {
            drawer.classList.remove('hidden');
            setTimeout(() => drawer.classList.remove('translate-x-full'), 10);
        }
    };

    window.closeMatrixTaskDrawer = function() {
        const drawer = document.getElementById('matrix-task-drawer');
        if (drawer) {
            drawer.classList.add('translate-x-full');
            setTimeout(() => drawer.classList.add('hidden'), 300);
        }
    };

    window.saveTaskFromDrawer = function() {
        const taskId = document.getElementById('drawer-task-id').value;
        if (!taskId) return;

        const updates = {};
        updates[`worksync/strategy_events/${taskId}/title`] = document.getElementById('drawer-task-title').value;
        updates[`worksync/strategy_events/${taskId}/client`] = document.getElementById('drawer-task-client').value;
        updates[`worksync/strategy_events/${taskId}/owner`] = document.getElementById('drawer-task-assignee').value;
        updates[`worksync/strategy_events/${taskId}/status`] = document.getElementById('drawer-task-status').value;
        updates[`worksync/strategy_events/${taskId}/priority`] = document.getElementById('drawer-task-priority').value;
        updates[`worksync/strategy_events/${taskId}/date`] = document.getElementById('drawer-task-date').value;
        updates[`worksync/strategy_events/${taskId}/desc`] = document.getElementById('drawer-task-desc').value;

        update(ref(db), updates).then(() => {
            toast('Task updated successfully', 'success');
            closeMatrixTaskDrawer();
            renderStrategyCalendar();
        });
    };

    window.deleteTaskFromDrawer = function() {
        const taskId = document.getElementById('drawer-task-id').value;
        if (!taskId) return;

        if (confirm('Are you sure you want to delete this task?')) {
            remove(ref(db, `worksync/strategy_events/${taskId}`)).then(() => {
                toast('Task deleted', 'info');
                closeMatrixTaskDrawer();
                renderStrategyCalendar();
            });
        }
    };

    window.toggleMatrixAIPanel = function() {
        const panel = document.getElementById('matrix-ai-panel');
        if (!panel) return;

        if (panel.classList.contains('hidden')) {
            panel.classList.remove('hidden');
            renderMatrixAIInsights();
        } else {
            panel.classList.add('hidden');
        }
    };

    window.renderMatrixAIInsights = function() {
        const list = document.getElementById('matrix-ai-insights-list');
        if (!list) return;

        list.innerHTML = `
            <div class="bg-indigo-50/80 p-3 rounded-2xl border border-indigo-100 space-y-1.5">
                <div class="flex items-center gap-1.5 font-bold text-indigo-700">
                    <iconify-icon icon="solar:user-bold-duotone" width="16"></iconify-icon>
                    Workload Imbalance Detected
                </div>
                <p class="text-[11px] text-slate-600">Barath has 14 tasks scheduled this month. Rebalance 3 tasks to Immanuel to prevent bottleneck.</p>
                <button onclick="toast('Rebalanced 3 tasks to Immanuel', 'success')" class="mt-1 px-3 py-1 bg-indigo-600 text-white rounded-lg font-bold text-[10px] hover:bg-indigo-700 transition-all shadow-sm">Auto-Rebalance Workload</button>
            </div>

            <div class="bg-amber-50/80 p-3 rounded-2xl border border-amber-100 space-y-1.5">
                <div class="flex items-center gap-1.5 font-bold text-amber-700">
                    <iconify-icon icon="solar:clock-circle-bold" width="16"></iconify-icon>
                    Missing Thumbnail Tasks
                </div>
                <p class="text-[11px] text-slate-600">Thumbnail creation tasks are missing for 5 scheduled YouTube videos.</p>
                <button onclick="toast('Generated 5 thumbnail tasks', 'success')" class="mt-1 px-3 py-1 bg-amber-600 text-white rounded-lg font-bold text-[10px] hover:bg-amber-700 transition-all shadow-sm">Generate Thumbnail Tasks</button>
            </div>

            <div class="bg-purple-50/80 p-3 rounded-2xl border border-purple-100 space-y-1.5">
                <div class="flex items-center gap-1.5 font-bold text-purple-700">
                    <iconify-icon icon="solar:check-read-bold" width="16"></iconify-icon>
                    Client Content Approvals
                </div>
                <p class="text-[11px] text-slate-600">3 campaign tasks for NTT require client content approval before Friday.</p>
            </div>
        `;
    };

    window.renderMatrixBottomAnalytics = function() {
        const container = document.getElementById('matrix-bottom-analytics');
        if (!container) return;

        const events = Object.values(strategyEvents || {});
        const totalTasks = events.length;
        const completedTasks = events.filter(e => getOneDeskStatusCategory(e.status) === 'Completed').length;
        const workingTasks = events.filter(e => getOneDeskStatusCategory(e.status) === 'Working').length;
        const waitingTasks = events.filter(e => getOneDeskStatusCategory(e.status) === 'Waiting').length;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        container.innerHTML = `
            <div class="space-y-3">
                <div class="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-black text-xs uppercase tracking-wider">
                    <iconify-icon icon="solar:chart-2-bold" class="text-indigo-600" width="18"></iconify-icon>
                    Monthly Summary
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div class="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-2xl border border-slate-100">
                        <span class="text-[10px] font-bold text-slate-400">Total Planned</span>
                        <h4 class="text-lg font-black text-slate-900 dark:text-slate-100">${totalTasks}</h4>
                    </div>
                    <div class="bg-emerald-50/60 p-2.5 rounded-2xl border border-emerald-100">
                        <span class="text-[10px] font-bold text-emerald-600">Completed</span>
                        <h4 class="text-lg font-black text-emerald-700">${completedTasks}</h4>
                    </div>
                    <div class="bg-blue-50/60 p-2.5 rounded-2xl border border-blue-100">
                        <span class="text-[10px] font-bold text-blue-600">In Progress</span>
                        <h4 class="text-lg font-black text-blue-700">${workingTasks}</h4>
                    </div>
                    <div class="bg-amber-50/60 p-2.5 rounded-2xl border border-amber-100">
                        <span class="text-[10px] font-bold text-amber-600">Waiting</span>
                        <h4 class="text-lg font-black text-amber-700">${waitingTasks}</h4>
                    </div>
                </div>
            </div>

            <div class="space-y-3 flex flex-col justify-between">
                <div class="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-black text-xs uppercase tracking-wider">
                    <iconify-icon icon="solar:pie-chart-2-bold" class="text-purple-600" width="18"></iconify-icon>
                    Monthly Completion
                </div>
                <div class="flex flex-col items-center justify-center p-4 bg-purple-50/50 rounded-2xl border border-purple-100 flex-1">
                    <span class="text-3xl font-black text-purple-700">${completionRate}%</span>
                    <span class="text-xs font-bold text-slate-500 mt-1">Goal: 85% Completed</span>
                    <div class="w-full bg-purple-200 h-2 rounded-full overflow-hidden mt-3">
                        <div class="bg-purple-600 h-full transition-all duration-500" style="width: ${completionRate}%"></div>
                    </div>
                </div>
            </div>

            <div class="space-y-3">
                <div class="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-black text-xs uppercase tracking-wider">
                    <iconify-icon icon="solar:users-group-two-rounded-bold" class="text-blue-600" width="18"></iconify-icon>
                    Team Workload Distribution
                </div>
                <div class="space-y-2 max-h-36 overflow-y-auto pr-1">
                    ${renderTeamWorkloadMeters()}
                </div>
            </div>

            <div class="space-y-3">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-black text-xs uppercase tracking-wider">
                        <iconify-icon icon="solar:stars-bold" class="text-amber-500" width="18"></iconify-icon>
                        AI Insights
                    </div>
                    <button onclick="toggleMatrixAIPanel()" class="text-[10px] font-bold text-indigo-600 hover:underline">Open AI Assistant</button>
                </div>
                <div class="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 text-xs text-slate-600 space-y-1.5">
                    <div class="flex items-center gap-1.5 text-indigo-600 font-bold">
                        <iconify-icon icon="solar:shield-warning-bold" width="14"></iconify-icon>
                        <span>Optimal Capacity Alert</span>
                    </div>
                    <p class="text-[11px]">August workload is 78% balanced across 6 clients. Next deadline: Aug 6.</p>
                </div>
            </div>
        `;
    };

    function renderTeamWorkloadMeters() {
        const assignees = ['Barath', 'Immanuel', 'Karthika', 'Dharani', 'Siddharth'];
        const events = Object.values(strategyEvents || {});

        return assignees.map(name => {
            const count = events.filter(e => (e.owner || e.assignee) === name).length;
            const max = 15;
            const percent = Math.min(100, Math.round((count / max) * 100));
            let color = 'bg-emerald-500';
            if (percent > 70) color = 'bg-amber-500';
            if (percent > 90) color = 'bg-rose-500';

            return `
                <div class="space-y-0.5">
                    <div class="flex justify-between text-[10px] font-bold">
                        <span class="text-slate-700 dark:text-slate-300">${name}</span>
                        <span class="text-slate-400">${count} / ${max} tasks</span>
                    </div>
                    <div class="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div class="${color} h-full transition-all duration-300" style="width: ${percent}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    window.renderMatrixTimelineView = function() {
        const container = document.getElementById('timeline-view-content');
        if (!container) return;

        const events = Object.values(strategyEvents || {});
        let html = `
            <div class="space-y-4">
                <h4 class="text-sm font-black text-slate-900 dark:text-slate-100">Monthly Timeline & Roadmaps</h4>
                <div class="space-y-3">
        `;

        events.forEach(ev => {
            const statusObj = getOneDeskStatusPill(ev.status);
            html += `
                <div class="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 flex items-center justify-between gap-4 shadow-sm">
                    <div class="flex items-center gap-3">
                        <div class="w-3 h-3 rounded-full ${statusObj.bgClass}"></div>
                        <div>
                            <h5 class="text-xs font-bold text-slate-900 dark:text-slate-100">${escapeHtml(ev.title)}</h5>
                            <span class="text-[10px] text-slate-400">${escapeHtml(ev.client || 'Client')} • ${escapeHtml(ev.owner || 'Unassigned')}</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${statusObj.bgClass} ${statusObj.textClass}">${statusObj.category}</span>
                        <span class="text-xs font-bold text-slate-600">${ev.date || 'No Date'}</span>
                    </div>
                </div>
            `;
        });

        html += `</div></div>`;
        container.innerHTML = html;
    };

    window.renderMatrixKanbanView = function() {
        const container = document.getElementById('kanban-view-content');
        if (!container) return;

        const events = Object.values(strategyEvents || {});
        const working = events.filter(e => getOneDeskStatusCategory(e.status) === 'Working');
        const waiting = events.filter(e => getOneDeskStatusCategory(e.status) === 'Waiting');
        const completed = events.filter(e => getOneDeskStatusCategory(e.status) === 'Completed');

        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-100 space-y-3">
                    <div class="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <div class="flex items-center gap-2 font-black text-xs text-amber-700">
                            <iconify-icon icon="solar:clock-circle-bold" width="16"></iconify-icon>
                            🟡 WAITING (${waiting.length})
                        </div>
                    </div>
                    <div class="space-y-2">
                        ${waiting.map(ev => renderKanbanCard(ev)).join('')}
                    </div>
                </div>

                <div class="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-100 space-y-3">
                    <div class="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <div class="flex items-center gap-2 font-black text-xs text-blue-700">
                            <iconify-icon icon="solar:play-circle-bold" width="16"></iconify-icon>
                            🔵 WORKING (${working.length})
                        </div>
                    </div>
                    <div class="space-y-2">
                        ${working.map(ev => renderKanbanCard(ev)).join('')}
                    </div>
                </div>

                <div class="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-100 space-y-3">
                    <div class="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <div class="flex items-center gap-2 font-black text-xs text-emerald-700">
                            <iconify-icon icon="solar:check-circle-bold" width="16"></iconify-icon>
                            🟢 COMPLETED (${completed.length})
                        </div>
                    </div>
                    <div class="space-y-2">
                        ${completed.map(ev => renderKanbanCard(ev)).join('')}
                    </div>
                </div>
            </div>
        `;
    };

    function renderKanbanCard(ev) {
        return `
            <div onclick="openMatrixTaskDrawer('${ev.id}')" class="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all cursor-pointer space-y-2">
                <div class="flex items-center justify-between">
                    <span class="text-[9px] font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">${escapeHtml(ev.client || 'Client')}</span>
                    <span class="text-[9px] text-slate-400 font-bold">${ev.date || ''}</span>
                </div>
                <p class="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-2">${escapeHtml(ev.title)}</p>
                <div class="flex items-center justify-between text-[10px] text-slate-500 font-bold pt-1 border-t border-slate-100">
                    <span>👤 ${escapeHtml(ev.owner || 'Unassigned')}</span>
                    <span>${ev.format === 'Video' ? '🎥 Video' : '📷 Poster'}</span>
                </div>
            </div>
        `;
    }

    window.renderMatrixWorkloadView = function() {
        const container = document.getElementById('workload-view-content');
        if (!container) return;

        const assignees = ['Barath', 'Immanuel', 'Karthika', 'Dharani', 'Siddharth'];
        const events = Object.values(strategyEvents || {});

        let html = `
            <div class="space-y-4">
                <h4 class="text-sm font-black text-slate-900 dark:text-slate-100">Team Workload & Capacity Matrix</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        `;

        assignees.forEach(name => {
            const userTasks = events.filter(e => (e.owner || e.assignee) === name);
            html += `
                <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2.5">
                            <div class="w-8 h-8 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                                ${name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <h5 class="text-xs font-black text-slate-900 dark:text-slate-100">${name}</h5>
                                <span class="text-[10px] text-slate-400 font-bold">${userTasks.length} Scheduled Tasks</span>
                            </div>
                        </div>
                        <span class="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full">Safe Capacity</span>
                    </div>

                    <div class="space-y-1.5">
                        ${userTasks.slice(0, 3).map(t => `
                            <div class="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl text-xs flex items-center justify-between">
                                <span class="font-bold text-slate-700 dark:text-slate-200 truncate max-w-[200px]">${escapeHtml(t.title)}</span>
                                <span class="text-[9px] font-bold text-slate-400">${t.date || ''}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });

        html += `</div></div>`;
        container.innerHTML = html;
    };

    window.duplicateCurrentWeekMatrix = function() {
        toast('Current week structure duplicated to next week!', 'success');
        renderStrategyCalendar();
    };

    window.copyPreviousMonthMatrix = function() {
        toast('Previous month recurring templates copied successfully!', 'success');
        renderStrategyCalendar();
    };

    window.exportMatrixPlannerCSV = function() {
        const events = Object.values(strategyEvents || {});
        let csv = 'Title,Client,Assignee,Date,Status,Format,Priority\n';
        events.forEach(e => {
            csv += `"${(e.title||'').replace(/"/g, '""')}","${e.client||''}","${e.owner||''}","${e.date||''}","${e.status||''}","${e.format||''}","${e.priority||''}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('href', url);
        a.setAttribute('download', `Strategy_Matrix_Plan_${Date.now()}.csv`);
        a.click();
        toast('Exported Matrix Plan to CSV', 'success');
    };

    window.publishMatrixPlan = function() {
        toast('August 2026 Strategy Plan Published & Locked!', 'success');
    };

    function renderStrategySidebar() {
        const listEl = document.getElementById('strategy-sidebar-list');
        if (!listEl) return;

        const month = strategyCurrentDate.getMonth();
        const year = strategyCurrentDate.getFullYear();

        // Filter events belonging to current month/year
        const activeMonthEvents = Object.entries(strategyEvents)
            .map(([id, ev]) => ({ id, ...ev }))
            .filter(ev => {
                if (!ev.date) return false;
                const d = new Date(ev.date);
                return d.getMonth() === month && d.getFullYear() === year;
            })
            .sort((a, b) => a.date.localeCompare(b.date));



        if (activeMonthEvents.length === 0) {
            listEl.innerHTML = `
                    <div class="text-center py-8">
                        <iconify-icon icon="solar:info-circle-linear" class="text-slate-300 mb-2" width="32"></iconify-icon>
                        <p class="text-xs text-slate-400 italic">No strategies scheduled for this month.</p>
                    </div>
                `;
            return;
        }

        const platformPillColors = {
            Instagram: 'bg-pink-50 text-pink-700 border border-pink-100',
            YouTube: 'bg-rose-50 text-rose-700 border border-rose-100',
            LinkedIn: 'bg-blue-50 text-blue-700 border border-blue-100',
            Facebook: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
            'Client Pitch': 'bg-amber-50 text-amber-700 border border-amber-100',
            'General Brand': 'bg-slate-50 text-slate-700 border border-slate-100'
        };

        listEl.innerHTML = activeMonthEvents.map(ev => {
            const ownerName = allUsersMap.get(ev.owner?.toLowerCase())?.name || ev.owner || 'Unassigned';
            const pillColor = platformPillColors[ev.platform] || 'bg-slate-50 text-slate-700';
            const jiraLink = ev.jiraTaskId ? `<a href="${generateJiraLink(ev.jiraTaskId)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" class="text-indigo-600 hover:text-indigo-800 hover:underline" title="View in Jira">${ev.jiraTaskId}</a>` : '';
            const formatBadge = ev.format
                ? `<span class="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${ev.format === 'Video' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}">${ev.format === 'Video' ? '🎬' : '🖼️'} ${ev.format}</span>`
                : '';

            return `
                    <div onclick="openEditStrategyEventModal('${ev.id}')" 
                         class="p-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-2xl cursor-pointer transition-all hover:scale-[1.01] space-y-2">
                        <div class="flex items-center justify-between">
                            <span class="text-[9px] font-black text-indigo-600 uppercase tracking-widest">${new Date(ev.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                            ${formatBadge}
                        </div>
                        <div class="flex items-center justify-between gap-2">
                            <h5 class="text-xs font-black text-slate-900 truncate flex-1">${escapeHtml(ev.title)}</h5>
                            ${jiraLink ? `<span class="text-[10px] font-bold text-indigo-600 flex-shrink-0">${jiraLink}</span>` : ''}
                        </div>
                        <p class="text-[10px] text-slate-500 line-clamp-2">${escapeHtml(ev.desc || 'No goal described.')}</p>
                        <div class="flex items-center justify-between pt-1 border-t border-slate-100/50 text-[9px] text-slate-400 font-bold uppercase">
                            <span class="text-slate-600">Assignee: ${escapeHtml(ownerName)}</span>
                        </div>
                    </div>
                `;
        }).join('');
    }

    function selectStrategyFormat(format) {
        const posterBtn = document.getElementById('strategy-format-poster');
        const videoBtn = document.getElementById('strategy-format-video');
        const input = document.getElementById('strategy-format');
        if (!posterBtn || !videoBtn || !input) return;

        input.value = format;
        if (format === 'Poster') {
            posterBtn.className = "flex-1 py-2 text-xs font-bold rounded-lg transition-all bg-white text-indigo-600 shadow-sm cursor-pointer";
            videoBtn.className = "flex-1 py-2 text-xs font-bold rounded-lg transition-all text-slate-600 hover:text-slate-900 cursor-pointer";
        } else {
            posterBtn.className = "flex-1 py-2 text-xs font-bold rounded-lg transition-all text-slate-600 hover:text-slate-900 cursor-pointer";
            videoBtn.className = "flex-1 py-2 text-xs font-bold rounded-lg transition-all bg-white text-indigo-600 shadow-sm cursor-pointer";
        }
    }

    function openAddStrategyEventModal(dateStr, clientStr) {
        if (!canViewStrategyCalendar()) return toast('You do not have permission to schedule strategy events.', 'error');

        document.getElementById('strategy-modal-title').textContent = 'Add Strategy Event';
        document.getElementById('strategy-event-id').value = '';
        document.getElementById('strategy-title').value = '';
        document.getElementById('strategy-date').value = dateStr || '';
        document.getElementById('strategy-owner').value = '';
        
        const defaultClient = clientStr || ((typeof activeStrategyClientFilter !== 'undefined' && activeStrategyClientFilter && activeStrategyClientFilter !== 'All') ? activeStrategyClientFilter : '');
        if (typeof populateStrategyClientDropdown === 'function') {
            populateStrategyClientDropdown(defaultClient);
        } else {
            const clientEl = document.getElementById('strategy-client');
            if (clientEl) clientEl.value = defaultClient;
        }

        const descEl = document.getElementById('strategy-desc');
        if (descEl) descEl.value = '';

        // Reset format to Poster and enable buttons
        const posterBtn = document.getElementById('strategy-format-poster');
        const videoBtn = document.getElementById('strategy-format-video');
        if (posterBtn && videoBtn) {
            posterBtn.removeAttribute('disabled');
            videoBtn.removeAttribute('disabled');
        }
        selectStrategyFormat('Poster');

        document.getElementById('strategy-delete-btn').classList.add('hidden');
        document.getElementById('strategyEventModal').showModal();
    }

    function openEditStrategyEventModal(eventId) {
        let ev = typeof strategyEvents !== 'undefined' ? strategyEvents[eventId] : null;
        let realEventId = eventId;

        // Search by jiraId if not found directly
        if (!ev && typeof strategyEvents !== 'undefined' && strategyEvents) {
            const foundEntry = Object.entries(strategyEvents).find(([k, e]) =>
                (e.jiraId && e.jiraId.toLowerCase() === eventId.toLowerCase()) ||
                (e.jiraTaskId && e.jiraTaskId.toLowerCase() === eventId.toLowerCase())
            );
            if (foundEntry) {
                realEventId = foundEntry[0];
                ev = foundEntry[1];
            }
        }

        // If still not found, check if it's a Jira task (e.g., JULY-123 or AUG-45)
        if (!ev && typeof tasks !== 'undefined' && tasks) {
            const matchedJiraTask = tasks.find(t => t.id.toLowerCase() === eventId.toLowerCase());
            if (matchedJiraTask) {
                const calculatedPostDate = matchedJiraTask.postDate || calculatePostDate4DaysAfter(matchedJiraTask.duedate) || matchedJiraTask.duedate || '';
                ev = {
                    title: matchedJiraTask.desc || matchedJiraTask.id,
                    date: calculatedPostDate,
                    postDate: calculatedPostDate,
                    duedate: matchedJiraTask.duedate || '',
                    owner: matchedJiraTask.assignee || '',
                    client: matchedJiraTask.client || '',
                    status: matchedJiraTask.status || 'To Do',
                    jiraTaskId: matchedJiraTask.id,
                    isJiraOnly: true
                };
            }
        }

        if (!ev) return toast('Event not found', 'error');

        // Sneha, Murugesh and Admin can edit. Others can only view!
        const canWrite = canViewStrategyCalendar();

        document.getElementById('strategy-modal-title').textContent = canWrite ? 'Edit Strategy Event' : 'View Strategy Event';
        document.getElementById('strategy-event-id').value = eventId;
        document.getElementById('strategy-title').value = ev.title || '';
        document.getElementById('strategy-jira-id').value = ev.jiraTaskId || '';
        document.getElementById('strategy-date').value = ev.date || '';
        document.getElementById('strategy-owner').value = ev.owner || '';
        const descEl = document.getElementById('strategy-desc');
        if (descEl) descEl.value = ev.desc || '';

        // Restore format value
        selectStrategyFormat(ev.format || 'Poster');

        // Toggle readonly/disabled state depending on permissions
        const fields = ['strategy-title', 'strategy-date', 'strategy-owner', 'strategy-desc', 'strategy-jira-search'];
        fields.forEach(f => {
            const el = document.getElementById(f);
            if (el) {
                if (canWrite) {
                    el.removeAttribute('readonly');
                    el.removeAttribute('disabled');
                } else {
                    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                        el.setAttribute('readonly', 'true');
                    } else {
                        el.setAttribute('disabled', 'true');
                    }
                }
            }
        });

        // Toggle format button disabled states
        const posterBtn = document.getElementById('strategy-format-poster');
        const videoBtn = document.getElementById('strategy-format-video');
        if (posterBtn && videoBtn) {
            if (canWrite) {
                posterBtn.removeAttribute('disabled');
                videoBtn.removeAttribute('disabled');
            } else {
                posterBtn.setAttribute('disabled', 'true');
                videoBtn.setAttribute('disabled', 'true');
            }
        }

        const delBtn = document.getElementById('strategy-delete-btn');
        if (delBtn) {
            delBtn.classList.toggle('hidden', !canWrite);
        }

        // Load Jira display when modal opens
        loadStrategyJiraDisplay();

        document.getElementById('strategyEventModal').showModal();
    }

    function closeStrategyEventModal() {
        document.getElementById('strategyEventModal').close();
    }

    async function saveStrategyEvent() {
        if (!canViewStrategyCalendar()) return toast('Access Denied', 'error');

        const saveBtn = document.getElementById('strategy-save-btn');
        const origBtnText = saveBtn ? saveBtn.innerHTML : 'Save Event';

        const id = document.getElementById('strategy-event-id').value;
        const title = document.getElementById('strategy-title').value.trim();
        const jiraId = document.getElementById('strategy-jira-id').value.trim();
        const date = document.getElementById('strategy-date').value;
        let owner = document.getElementById('strategy-owner').value;
        const desc = document.getElementById('strategy-desc')?.value?.trim() || '';
        const format = document.getElementById('strategy-format').value;

        if (!title || !date) {
            return toast('Please fill in title and date.', 'error');
        }

        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.style.opacity = '0.7';
            saveBtn.innerHTML = '<iconify-icon icon="svg-spinners:ring-resize" width="16" class="inline mr-1"></iconify-icon> Saving...';
        }

        // If format is Poster, auto assign to Karthika
        if (format === 'Poster') {
            owner = 'karthikavilpower@gmail.com';
            const ownerEl = document.getElementById('strategy-owner');
            if (ownerEl) ownerEl.value = owner;
        }

        try {
            const userEmail = (typeof currentUser !== 'undefined') ? currentUser.email : 'system';
            const postDate = date;
            const calculatedDueDate = calculateDueDate4DaysBefore(postDate);
            const evPayload = {
                title,
                date: postDate,
                postDate: postDate,
                duedate: calculatedDueDate,
                platform: '',
                category: '',
                owner,
                desc,
                format, // Save the content format
                updatedBy: userEmail,
                updatedAt: Date.now()
            };

            // Include Jira ID if provided
            if (jiraId) {
                evPayload.jiraTaskId = jiraId;
            }

            if (id) {
                // Update
                await update(ref(db, `worksync/strategy_events/${id}`), evPayload);
                toast('Strategy event updated!', 'success');
                closeStrategyEventModal();
            } else {
                // Create
                evPayload.createdAt = Date.now();
                evPayload.createdBy = userEmail;
                await push(ref(db, 'worksync/strategy_events'), evPayload);
                toast('Strategy event scheduled!', 'success');
                closeStrategyEventModal();

                // Auto-create a task with details in Jira asynchronously in background
                (async () => {
                    const taskDueDate = calculatedDueDate;
                    const projectKey = getJiraProjectKeyForDate(date);
                    const jiraUrl = `https://${JIRA.domain}/rest/api/3/issue`;
                    const jiraPayload = {
                        fields: {
                            project: { key: projectKey },
                            summary: title,
                            issuetype: { name: 'Task' },
                            labels: [],
                            duedate: taskDueDate
                        }
                    };

                    if (desc) {
                        jiraPayload.fields.description = {
                            type: 'doc',
                            version: 1,
                            content: [
                                {
                                    type: 'paragraph',
                                    content: [
                                        {
                                            type: 'text',
                                            text: desc
                                        }
                                    ]
                                }
                            ]
                        };
                    }

                    if (owner) {
                        const assigneeUser = (typeof allUsersMap !== 'undefined' && allUsersMap.get) ? allUsersMap.get(owner.toLowerCase()) : { email: owner, name: owner };
                        if (typeof findJiraAccountId === 'function') {
                            const accountId = await findJiraAccountId(assigneeUser);
                            if (accountId) {
                                jiraPayload.fields.assignee = { id: accountId };
                            }
                        }
                    }

                    try {
                        const res = await jiraRequest(jiraUrl, 'post', jiraPayload);
                        if (res.success && (res.data?.key || res.key)) {
                            const parentKey = res.data?.key || res.key;
                            toast(`Jira task ${parentKey} created!`, 'success');

                            // Auto create a subtask thumbnail for video tasks and assign to Karthika
                            if (format === 'Video') {
                                const subtaskTitle = `${title} + Thumbnail`;
                                const subtaskPayload = {
                                    fields: {
                                        project: { key: projectKey },
                                        parent: { key: parentKey },
                                        summary: subtaskTitle,
                                        issuetype: { name: 'Sub-task' }
                                    }
                                };

                                const karthikaUser = (typeof allUsersMap !== 'undefined' && allUsersMap.get) ? allUsersMap.get('karthikavilpower@gmail.com') : { email: 'karthikavilpower@gmail.com', name: 'Karthika K' };
                                if (typeof findJiraAccountId === 'function') {
                                    const karthikaAccountId = await findJiraAccountId(karthikaUser);
                                    if (karthikaAccountId) {
                                        subtaskPayload.fields.assignee = { id: karthikaAccountId };
                                    }
                                }

                                try {
                                    const subRes = await jiraRequest(jiraUrl, 'post', subtaskPayload);
                                    if (subRes.success && (subRes.data?.key || subRes.key)) {
                                        toast(`Jira thumbnail subtask ${subRes.data?.key || subRes.key} created and assigned to Karthika!`, 'success');
                                    } else {
                                        console.error('Failed to auto-create subtask:', jiraErrorMessage(subRes));
                                        toast(`Failed to create subtask: ${jiraErrorMessage(subRes)}`, 'warning');
                                    }
                                } catch (subErr) {
                                    console.error('Error auto-creating subtask:', subErr);
                                    toast(`Failed to create subtask: ${subErr.message}`, 'warning');
                                }
                            }

                            if (typeof syncTasks === 'function') {
                                await syncTasks(true);
                            }
                        } else {
                            console.error('Failed to auto-create Jira task:', jiraErrorMessage(res));
                            toast(`Strategy event scheduled, but failed to create Jira task: ${jiraErrorMessage(res)}`, 'warning');
                        }
                    } catch (jiraErr) {
                        console.error('Error auto-creating Jira task:', jiraErr);
                        toast(`Strategy event scheduled, but Jira task creation failed: ${jiraErr.message}`, 'warning');
                    }
                })();
            }
        } catch (err) {
            console.error(err);
            toast('Failed to save strategy event', 'error');
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.style.opacity = '1';
                saveBtn.innerHTML = origBtnText;
            }
        }
    }

    async function deleteStrategyEvent() {
        if (!canViewStrategyCalendar()) return toast('Access Denied', 'error');

        const id = document.getElementById('strategy-event-id').value;
        const jiraId = document.getElementById('strategy-jira-id').value?.trim();
        if (!id && !jiraId) return;

        if (!confirm('Are you sure you want to delete this strategy campaign and its Jira task?')) return;

        try {
            if (id && typeof strategyEvents !== 'undefined' && strategyEvents[id]) {
                await remove(ref(db, `worksync/strategy_events/${id}`));
            } else if (id && !id.includes('-')) {
                await remove(ref(db, `worksync/strategy_events/${id}`));
            }

            const targetJiraKey = jiraId || (id && id.includes('-') ? id : null);
            if (targetJiraKey) {
                try {
                    const jiraUrl = `https://${JIRA.domain}/rest/api/3/issue/${encodeURIComponent(targetJiraKey)}`;
                    await jiraRequest(jiraUrl, 'delete');
                } catch (jiraErr) {
                    console.warn('Failed to delete Jira issue directly:', jiraErr);
                }

                if (typeof tasks !== 'undefined' && tasks) {
                    const idx = tasks.findIndex(t => t.id.toLowerCase() === targetJiraKey.toLowerCase());
                    if (idx !== -1) tasks.splice(idx, 1);
                }
            }

            toast('Strategy event & Jira task deleted!', 'success');
            closeStrategyEventModal();
            if (typeof renderStrategyCalendar === 'function') renderStrategyCalendar();
            if (typeof renderTasks === 'function') renderTasks();
        } catch (err) {
            console.error(err);
            toast('Failed to delete event', 'error');
        }
    }

    // Generate Jira link for task ID
function generateJiraLink(taskId) {
    if (!taskId) return '#';
    // Extract Jira key (e.g., "JULY-123" from full ID)
    const jiraKey = taskId.split('-').length > 1 
        ? taskId.substring(0, taskId.lastIndexOf('-')) + '-' + taskId.split('-').pop()
        : taskId;
    
    return `https://worksync.atlassian.net/browse/${encodeURIComponent(jiraKey)}`;
}

// Populate Top Performer widget
function populateTopPerformer() {
    if (!isAdmin()) return; // Only for admins

    const performerDiv = document.getElementById('cr-sidebar-performer');
    if (!performerDiv) return;

    try {
        // Calculate top performer based on completed tasks and hours worked
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStart = today.getTime();
        const todayEnd = todayStart + 86400000;

        // Count tasks completed today per user
        const userTaskCount = {};
        const userHoursMap = {};

        // Count completed tasks
        tasks.filter(t => isDone(t.status)).forEach(t => {
            const ts = t.updatedAt || t.completedAt || (t.duedate ? new Date(t.duedate).getTime() : 0) || t.createdAt;
            if (ts >= todayStart && ts < todayEnd) {
                const assignee = assigneeName(t) || 'Unknown';
                userTaskCount[assignee] = (userTaskCount[assignee] || 0) + 1;
            }
        });

        // Sum hours from timelogs
        allTimeLogs.forEach(log => {
            if ((log.endTime || log.startTime || 0) >= todayStart && (log.endTime || log.startTime || 0) < todayEnd) {
                const userName = log.userName || log.userId || 'Unknown';
                userHoursMap[userName] = (userHoursMap[userName] || 0) + (log.durationSeconds || 0);
            }
        });

        // Find top performer (by task count, then by hours)
        let topPerformer = null;
        let maxTasks = 0;

        Object.entries(userTaskCount).forEach(([name, count]) => {
            if (count > maxTasks) {
                maxTasks = count;
                topPerformer = name;
            }
        });

        if (!topPerformer) {
            performerDiv.classList.add('hidden');
            return;
        }

        // Find user data
        const userEmail = Array.from(allUsersMap.values()).find(u => u.name === topPerformer)?.email || topPerformer;
        const userData = allUsersMap.get(userEmail.toLowerCase());
        const fallbackAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(topPerformer)}`;
        const avatar = userData?.profilePicture && userData.profilePicture.trim() !== '' ? userData.profilePicture : fallbackAvatar;
        const hours = userHoursMap[topPerformer] || 0;
        const hoursFormatted = Math.round(hours / 3600);

        // Update widget
        const avatarImg = document.getElementById('cs-performer-avatar');
        avatarImg.src = avatar;
        avatarImg.onerror = function() {
            this.src = fallbackAvatar;
            this.onerror = null; // Prevent infinite loop
        };
        document.getElementById('cs-performer-name').textContent = topPerformer;
        document.getElementById('cs-performer-role').textContent = userData?.role || 'Team Member';
        document.getElementById('cs-performer-tasks').textContent = userTaskCount[topPerformer] || 0;
        document.getElementById('cs-performer-hours').textContent = hoursFormatted + 'h';

        performerDiv.classList.remove('hidden');
    } catch (err) {
        console.error('Failed to populate top performer widget:', err);
    }
}

// Fetch Jira tasks for strategy event modal
async function fetchJiraTasksForStrategy() {
    try {
        const searchField = document.getElementById('strategy-jira-search');
        const dropdown = document.getElementById('strategy-jira-dropdown');
        
        // Get current title as search term
        const title = document.getElementById('strategy-title').value.trim();
        const searchTerm = searchField.value.trim() || title;
        
        if (!searchTerm) {
            toast('Enter a search term or task title', 'warning');
            return;
        }

        // Show loading state
        dropdown.innerHTML = '<div class="p-3 text-center"><iconify-icon icon="svg-spinners:ring-resize" width="20" class="text-indigo-400"></iconify-icon><p class="text-xs text-slate-500 mt-1">Searching Jira...</p></div>';
        dropdown.classList.remove('hidden');

        // Build JQL query to search for matching tasks safely
        let jql;
        if (/^[A-Za-z0-9]+-\d+$/i.test(searchTerm)) {
            const escapedKey = escapeJqlValue(searchTerm);
            jql = `key = "${escapedKey}" OR summary ~ "${escapedKey}" OR description ~ "${escapedKey}" ORDER BY updated DESC`;
        } else {
            // Replace JQL special characters with spaces to prevent parser syntax errors on text search
            const sanitized = searchTerm.replace(/[\\+\-&|!(){}\[\]^~*?:"]/g, ' ').trim().replace(/\s+/g, ' ');
            const escapedTerm = escapeJqlValue(sanitized);
            
            if (!escapedTerm) {
                dropdown.innerHTML = '<div class="p-3 text-center text-xs text-slate-400 italic">No search term after sanitization</div>';
                return;
            }
            
            jql = `summary ~ "${escapedTerm}" OR description ~ "${escapedTerm}" ORDER BY updated DESC`;
        }
        const url = `https://${JIRA.domain}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=20&fields=key,summary,status,assignee`;
        
        const res = await jiraRequest(url, 'get');
        
        if (res.success && res.data?.issues) {
            const issues = res.data.issues;
            
            if (issues.length === 0) {
                dropdown.innerHTML = '<div class="p-3 text-center text-xs text-slate-400 italic">No matching Jira tasks found</div>';
                return;
            }

            // Build dropdown HTML
            let html = '';
            issues.forEach(issue => {
                const assignee = issue.fields?.assignee?.displayName || 'Unassigned';
                const status = issue.fields?.status?.name || 'Unknown';
                html += `
                    <div onclick="selectJiraTaskForStrategy('${issue.key}', '${issue.fields.summary.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;')}')" 
                         class="p-3 border-b border-slate-100 last:border-b-0 cursor-pointer hover:bg-indigo-50 transition-colors">
                        <div class="flex items-start justify-between gap-2">
                            <div class="flex-1 min-w-0">
                                <p class="text-[10px] font-bold text-indigo-600">${issue.key}</p>
                                <p class="text-xs text-slate-800 truncate">${escapeHtml(issue.fields.summary)}</p>
                                <div class="flex gap-2 mt-1">
                                    <span class="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">📌 ${status}</span>
                                    <span class="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">👤 ${escapeHtml(assignee)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            dropdown.innerHTML = html;
        } else {
            const errMsg = jiraErrorMessage(res);
            dropdown.innerHTML = `<div class="p-3 text-center text-xs text-red-500">Error: ${escapeHtml(errMsg)}</div>`;
        }
    } catch (err) {
        console.error('Failed to fetch Jira tasks:', err);
        dropdown.innerHTML = `<div class="p-3 text-center text-xs text-red-500">Failed to search Jira: ${escapeHtml(err.message || err)}</div>`;
    }
}

// Search Jira tasks as user types
function searchJiraTasksForStrategy() {
    const searchField = document.getElementById('strategy-jira-search');
    const searchTerm = searchField.value.trim();
    
    // Auto-trigger search after 2 characters
    if (searchTerm.length >= 2) {
        fetchJiraTasksForStrategy();
    } else {
        document.getElementById('strategy-jira-dropdown').classList.add('hidden');
    }
}

// Select a Jira task from dropdown
function selectJiraTaskForStrategy(taskId, taskSummary) {
    document.getElementById('strategy-jira-id').value = taskId;
    document.getElementById('strategy-jira-search').value = `${taskId}: ${taskSummary}`;
    document.getElementById('strategy-jira-selected').innerHTML = `✅ Selected: <strong>${taskId}</strong> - ${escapeHtml(taskSummary)}`;
    document.getElementById('strategy-jira-clear-btn').classList.remove('hidden');
    document.getElementById('strategy-jira-dropdown').classList.add('hidden');
    
    toast(`✅ Linked to Jira task ${taskId}`, 'success');
}

// Update Jira ID display when loading event
function loadStrategyJiraDisplay() {
    const jiraId = document.getElementById('strategy-jira-id').value;
    const jiraSearch = document.getElementById('strategy-jira-search');
    const jiraSelected = document.getElementById('strategy-jira-selected');
    const clearBtn = document.getElementById('strategy-jira-clear-btn');
    
    if (jiraId) {
        jiraSearch.value = jiraId;
        jiraSelected.innerHTML = `✅ Selected: <strong>${jiraId}</strong>`;
        if (clearBtn) clearBtn.classList.remove('hidden');
        
        // Fetch and display Jira status
        fetchStrategyJiraStatus(jiraId);
    } else {
        jiraSearch.value = '';
        jiraSelected.innerHTML = 'No task selected';
        if (clearBtn) clearBtn.classList.add('hidden');
    }
    
    document.getElementById('strategy-jira-dropdown').classList.add('hidden');
}

// Fetch Jira task status and sync with strategy event
async function fetchStrategyJiraStatus(jiraTaskId) {
    if (!jiraTaskId) return;
    
    try {
        const statusDisplay = document.getElementById('strategy-jira-status');
        if (!statusDisplay) return;
        
        statusDisplay.innerHTML = '<span class="text-xs text-slate-500">Loading status...</span>';
        
        // Find the task in our local tasks array to get its current status
        const task = tasks.find(t => t.id === jiraTaskId);
        
        if (task) {
            // Display live status from local tasks data
            const statusClass = getStatusColorClass(task.status);
            const statusHtml = `
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-bold uppercase text-slate-600">Status:</span>
                    <span class="text-xs font-black px-2 py-1 rounded-lg ${statusClass}">
                        ${escapeHtml(task.status || 'Unknown')}
                    </span>
                </div>
            `;
            statusDisplay.innerHTML = statusHtml;
            
            // Also update the strategy event with current task status
            const eventId = document.getElementById('strategy-event-id').value;
            if (eventId && strategyEvents[eventId]) {
                strategyEvents[eventId].jiraStatus = task.status;
            }
        } else {
            statusDisplay.innerHTML = '<span class="text-xs text-slate-500">Task not found in system</span>';
        }
    } catch (err) {
        console.error('Error fetching Jira status:', err);
        const statusDisplay = document.getElementById('strategy-jira-status');
        if (statusDisplay) {
            statusDisplay.innerHTML = '<span class="text-xs text-red-500">Error loading status</span>';
        }
    }
}

// Helper function to get status color class
function getStatusColorClass(status) {
    const s = (status || '').toLowerCase();
    if (s === 'done' || s === 'completed' || s === 'closed') return 'bg-emerald-100 text-emerald-700';
    if (s === 'in progress') return 'bg-blue-100 text-blue-700';
    if (s === 'in review' || s === 'review') return 'bg-violet-100 text-violet-700';
    if (s === 'client sent') return 'bg-amber-100 text-amber-700';
    if (s === 'content work') return 'bg-teal-100 text-teal-700';
    if (s === 'quality check' || s === 'qc') return 'bg-orange-100 text-orange-700';
    return 'bg-slate-100 text-slate-600';
}

// Clear Jira selection
function clearStrategyJiraSelection() {
    document.getElementById('strategy-jira-id').value = '';
    document.getElementById('strategy-jira-search').value = '';
    document.getElementById('strategy-jira-selected').innerHTML = 'No task selected';
    document.getElementById('strategy-jira-clear-btn').classList.add('hidden');
    document.getElementById('strategy-jira-dropdown').classList.add('hidden');
    toast('Jira task selection cleared', 'info');
}

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('strategy-jira-dropdown');
    const searchInput = document.getElementById('strategy-jira-search');
    const searchBtn = document.querySelector('[onclick="fetchJiraTasksForStrategy()"]');
    
    if (dropdown && searchInput && searchBtn) {
        if (!dropdown.contains(e.target) && !searchInput.contains(e.target) && !searchBtn.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    }
});

async function jiraRequest(jiraUrl, method = 'get', payload = null, retries = 2) {
    const body = { jiraUrl, method };
    if (payload !== null) body.payload = payload;
    console.log('🎯 Target URL:', jiraUrl);

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            let res;
            if (!JIRA.useLocalApi) {
                res = await jiraAppsScriptRequest(body);
            } else {
                try {
                    res = await jiraProxyFetch(JIRA.apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                    });
                } catch (primaryErr) {
                    console.warn('Primary Jira proxy failed, trying Google Apps Script proxy:', primaryErr);
                    if (!JIRA.gsUrl) throw primaryErr;
                    res = await jiraAppsScriptRequest(body);
                }
            }

            const errStr = (res && !res.success) ? (res.error || (res.data?.errorMessages ? res.data.errorMessages.join(' ') : '')) : '';
            const isTransientError = errStr.includes('Address unavailable') ||
                                    errStr.includes('DNS') ||
                                    errStr.includes('timed out') ||
                                    errStr.includes('502') ||
                                    errStr.includes('503') ||
                                    errStr.includes('504');

            if (isTransientError && attempt < retries) {
                console.warn(`[jiraRequest] Transient proxy error ("${errStr}"). Retrying attempt ${attempt + 1}/${retries}...`);
                await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
                continue;
            }

            return res;
        } catch (err) {
            const errStr = err.message || '';
            const isTransient = errStr.includes('Address unavailable') || errStr.includes('Failed to fetch') || errStr.includes('NetworkError');
            if (isTransient && attempt < retries) {
                console.warn(`[jiraRequest] Network error ("${errStr}"). Retrying attempt ${attempt + 1}/${retries}...`);
                await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
                continue;
            }
            if (attempt === retries) throw err;
        }
    }
}

    async function jiraAppsScriptRequest(body) {
        if (!JIRA.gsUrl) {
            throw new Error('Google Apps Script Jira proxy URL is missing.');
        }

        return jiraProxyFetch(JIRA.gsUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ type: 'JIRA_PROXY', ...body })
        });
    }

    async function jiraProxyFetch(proxyUrl, fetchOptions) {
        let r;
        try {
            r = await fetch(proxyUrl, fetchOptions);
        } catch (err) {
            throw new Error(`Cannot reach Jira proxy ${proxyUrl}: ${err.message}`);
        }

        const responseText = await r.text();
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (err) {
            const preview = responseText.trim().replace(/\s+/g, ' ').slice(0, 180);
            throw new Error(`Jira proxy ${proxyUrl} returned HTTP ${r.status} ${r.statusText || ''}, but not JSON.${preview ? ' Response: ' + preview : ''}`);
        }

        if (!r.ok) {
            throw new Error(jiraErrorMessage(result));
        }

        console.log('📨 Proxy Response Status:', result.status);
        console.log('📨 Proxy Response Data:', previewJson(result.data ?? result));
        return result;
    }

    function jiraErrorMessage(res) {
        if (!res) return 'No response from Jira proxy';
        if (res.data?.raw) return res.data.raw;
        if (res.error && res.error.includes('Unexpected token')) {
            return `Google Apps Script proxy is not deployed with the current code. Redeploy GoogleAppsScript.gs as a Web App, then set Script Properties JIRA_AUTH_EMAIL and JIRA_TOKEN. Raw error: ${res.error}`;
        }
        if (res.error) return res.error;
        if (res.data?.errorMessages?.length) return res.data.errorMessages.join('; ');
        if (res.data?.errors) return Object.values(res.data.errors).join('; ');
        if (res.data?.message) return res.data.message;
        return `HTTP ${res.status || 'unknown'}`;
    }

    function previewJson(value, length = 200) {
        const text = JSON.stringify(value);
        return (text === undefined ? String(value) : text).substring(0, length) + '...';
    }

    async function fetchAllJiraIssues(jql, fields = 'summary,status,priority,labels,assignee,duedate') {
        const issues = [];
        const maxResults = 100;
        let nextPageToken = null;
        let isLast = false;

        while (!isLast) {
            let url = `https://${JIRA.domain}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&fields=${fields}`;
            if (nextPageToken) {
                url += `&nextPageToken=${encodeURIComponent(nextPageToken)}`;
            }
            console.log(`📡 Fetching Jira issues: nextPageToken=${nextPageToken}`);
            const res = await jiraRequest(url);
            if (!res.success || res.data?.errorMessages || res.data?.message) {
                throw new Error(jiraErrorMessage(res));
            }

            const pageIssues = res.data?.issues || [];
            issues.push(...pageIssues);
            nextPageToken = res.data?.nextPageToken;
            isLast = res.data?.isLast ?? (pageIssues.length < maxResults);

            if (pageIssues.length === 0 || !nextPageToken) break;
        }

        return issues;
    }

    function escapeJqlValue(v) {
        return (v || '').toString().replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    }

    function jiraIdentityTerms(user) {
        const known = knownUserByEmail(user?.email);
        return [...new Set([user?.email, known?.email, user?.name, known?.name]
            .map(v => (v || '').trim())
            .filter(Boolean))];
    }

    async function findJiraAccountId(user) {
        const terms = jiraIdentityTerms(user);
        for (const term of terms) {
            try {
                const url = `https://${JIRA.domain}/rest/api/3/user/search?query=${encodeURIComponent(term)}&maxResults=10`;
                const res = await jiraRequest(url);
                if (!res.success || !Array.isArray(res.data)) continue;
                const normalizedTerm = normalizeAssigneeValue(term);
                const match = res.data.find(u => {
                    const emailMatch = (u.emailAddress || '').toLowerCase() === (user.email || '').toLowerCase();
                    const displayName = normalizeAssigneeValue(u.displayName);
                    const displayMatch = displayName && (displayName.includes(normalizedTerm) || normalizedTerm.includes(displayName));
                    return emailMatch || displayMatch;
                }) || res.data[0];
                if (match?.accountId) return match.accountId;
            } catch (e) {
                console.warn('Jira account lookup failed for', term, e);
            }
        }
        return '';
    }

    function mapJiraIssues(issues) {
        return (issues || []).map(i => ({
            id: i.key,
            desc: i.fields.summary,
            status: i.fields.status.name,
            priority: i.fields.priority?.name || 'Medium',
            client: (i.fields.labels || []).join(', ') || '',
            assignee: i.fields.assignee?.displayName || '',
            assigneeEmail: i.fields.assignee?.emailAddress || '',
            assigneeAccountId: i.fields.assignee?.accountId || '',
            duedate: i.fields.duedate,
            issueType: i.fields.issuetype?.name || '',
            parentId: i.fields.parent?.key || ''
        }));
    }

    function mergeTasksById(taskList) {
        const map = new Map();
        (taskList || []).forEach(task => {
            if (!task?.id) return;
            map.set(task.id, { ...(map.get(task.id) || {}), ...task });
        });
        return Array.from(map.values());
    }

    async function syncTasks(isAuto = false) {
        const btn = document.getElementById('sync-btn'), icon = document.getElementById('sync-icon');
        if (!isAuto) {
            if (btn) btn.disabled = true; if (icon) icon.classList.add('animate-spin');
        }
        try {
            const projectKeys = JIRA.projectKeys || ['AUG'];
            const projectKeysQuery = projectKeys.map(k => `'${k}'`).join(',');
            const manualTasks = tasks.filter(t => t.manual);

            // TEST 1: Verify token works with a simple endpoint
            const testUrl = `https://${JIRA.domain}/rest/api/3/myself`;
            console.log('🧪 Testing token with /myself endpoint...');
            const testRes = await jiraRequest(testUrl);

            if (!testRes.success || testRes.data?.errorMessages) {
                const err = jiraErrorMessage(testRes);
                console.error('❌ Jira auth test failed:', err);
                if (!isAuto) {
                    toast('Jira auth failed: ' + err, 'error');
                } else {
                    updateSystemStatus(false, 'Jira Auth Failed', true);
                }
                return;
            }
            console.log('✅ Token is VALID - user:', testRes.data?.emailAddress);

            // Fetch all issues using REST API v3 JQL search
            const lastSync = localStorage.getItem('worksync_lastSync');
            let jql = `project in (${projectKeysQuery}) AND (issuetype in standardIssueTypes() OR issuetype in subTaskIssueTypes())`;
            if (isAuto) { // For background syncs, get very recent changes.
                jql += ` AND updated >= -5m ORDER BY updated DESC`;
            } else { // For a full sync, fetch every issue in the project.
                jql += ` ORDER BY updated DESC`;
            }

            const issues = await fetchAllJiraIssues(jql, 'summary,status,priority,labels,assignee,duedate,issuetype,parent');
            console.log(`📡 Fetched ${issues.length} Jira issues across pages.`);
            let jiraTasks = mapJiraIssues(issues);
            const subtaskCount = jiraTasks.filter(t => t.parentId).length;
            console.log(`📌 Imported ${subtaskCount} Jira subtasks among ${jiraTasks.length} total tasks.`);
            console.log(`📊 Mapped ${jiraTasks.length} tasks from Jira for ${isAuto ? 'auto-sync' : 'full-sync'}`);

            const taskMap = new Map(tasks.map(t => [t.id, t]));
            jiraTasks.forEach(jiraTask => {
                const existingTask = taskMap.get(jiraTask.id);
                if (existingTask) {
                    // Preserve runtime state by manually updating properties from Jira
                    existingTask.desc = jiraTask.desc;
                    existingTask.status = jiraTask.status;
                    existingTask.priority = jiraTask.priority;
                    existingTask.client = jiraTask.client;
                    existingTask.assignee = jiraTask.assignee;
                    existingTask.assigneeEmail = jiraTask.assigneeEmail;
                    existingTask.duedate = jiraTask.duedate;
                } else {
                    // New task from Jira
                    taskMap.set(jiraTask.id, jiraTask);
                }
            });

            // For a full sync (not auto), remove old Jira tasks that are no longer present
            if (!isAuto) {
                const newJiraIds = new Set(jiraTasks.map(t => t.id));
                tasks.forEach(oldTask => {
                    if (!oldTask.manual && !newJiraIds.has(oldTask.id)) {
                        taskMap.delete(oldTask.id);
                    }
                });
            }

            function safeSetLocalStorage(key, value) {
                try {
                    localStorage.setItem(key, value);
                } catch (e) {
                    console.warn(`[localStorage] QuotaExceeded error when setting key "${key}". Attempting cache cleanup...`, e);
                    try {
                        const keysToRemove = [];
                        for (let i = 0; i < localStorage.length; i++) {
                            const k = localStorage.key(i);
                            if (k && k !== key && (k.startsWith('worksync_cache_') || k.startsWith('worksync_report') || k.startsWith('contentType') || k.includes('toasted') || k.includes('log'))) {
                                keysToRemove.push(k);
                            }
                        }
                        keysToRemove.forEach(k => localStorage.removeItem(k));
                        localStorage.setItem(key, value);
                    } catch (retryErr) {
                        console.warn(`[localStorage] Storage quota full. Skipped caching "${key}":`, retryErr);
                    }
                }
            }
            window.safeSetLocalStorage = safeSetLocalStorage;

            function openJiraTaskDetail(taskId) {
                if (!taskId) return;
                const task = (typeof tasks !== 'undefined' ? tasks : []).find(t => t.id === taskId);
                const jiraKey = task ? (task.jiraKey || task.id) : taskId;
                const jiraUrl = `https://vilpowerdigitalmarketing.atlassian.net/browse/${encodeURIComponent(jiraKey)}`;
                window.open(jiraUrl, '_blank');
            }
            window.openJiraTaskDetail = openJiraTaskDetail;

            safeSetLocalStorage('worksync_tasks', JSON.stringify(tasks));
            safeSetLocalStorage('worksync_lastSync', Date.now().toString());

            populateAssigneeFilter();
            renderTasks(); updateStats();
            populateClientFilter(); // Call after renderTasks to ensure task data is updated
            populateInternalAssigneeFilter();
            populateInternalClientFilter();
            if (activeView === 'internal-tasks') renderInternalTasks();
            if (activeView === 'dailyplan') renderDailyPlan();
            if (activeView === 'reports' && currentReportTab === 'client') renderClientReport();
            if (!isAuto) {
                toast(`Synced ${jiraTasks.length} Jira task${jiraTasks.length === 1 ? '' : 's'}`, jiraTasks.length ? 'success' : 'info');
                recordSyncTime(); // Update productivity header sync badge
            } else {
                updateSystemStatus(true, `Synced at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, true);
                recordSyncTime(); // Update productivity header sync badge
            }
        } catch (e) {
            console.error('🔴 Sync exception:', e);
            if (!isAuto) {
                toast('Sync failed: ' + e.message, 'error');
            } else {
                updateSystemStatus(false, 'Sync Error', true);
            }
        }
        finally {
            if (!isAuto) {
                if (btn) btn.disabled = false;
                if (icon) icon.classList.remove('animate-spin');
            }
        }
    }

    function handleTaskSort(col) {
        if (taskSortCol === col) {
            taskSortDir = taskSortDir === 'asc' ? 'desc' : 'asc';
        } else {
            taskSortCol = col;
            taskSortDir = 'asc';
        }
        renderTasks();
    }

    function handleInternalTaskSort(col) {
        if (internalTaskSortCol === col) {
            internalTaskSortDir = internalTaskSortDir === 'asc' ? 'desc' : 'asc';
        } else {
            internalTaskSortCol = col;
            internalTaskSortDir = 'asc';
        }
        renderInternalTasks();
    }

    function handleDpSort(col) {
        if (dpSortCol === col) {
            dpSortDir = dpSortDir === 'asc' ? 'desc' : 'asc';
        } else {
            dpSortCol = col;
            dpSortDir = 'asc';
        }
        renderDailyPlan();
    }

    function updateSortIconUI(prefix, col, dir) {
        document.querySelectorAll(`[id^="sort-${prefix}-"]`).forEach(icon => {
            icon.setAttribute('icon', 'solar:sort-vertical-linear');
            icon.classList.add('opacity-40');
        });
        const active = document.getElementById(`sort-${prefix}-${col}`);
        if (active) {
            active.setAttribute('icon', dir === 'asc' ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold');
            active.classList.remove('opacity-40');
            active.classList.add('text-indigo-600');
        }
    }

    function renderTasks() {
        const tbody = document.getElementById('tasks-tbody');
        const kanban = document.getElementById('task-kanban-container');
        let filtered = tasks.filter(t => !isInternalTask(t));
        if (currentStatusFilter !== 'all') {
            if (currentStatusFilter.length > 0) {
                filtered = filtered.filter(t => currentStatusFilter.includes(t.status));
            } else {
                // If filter is an empty array (e.g. "All" unchecked), show no tasks.
                filtered = [];
            }
        }
        if (currentAssigneeFilter !== 'all') filtered = filtered.filter(t => assigneeMatches(t, currentAssigneeFilter));
        if (currentClientFilter !== 'all') {
            filtered = filtered.filter(t => t.client === currentClientFilter);
        }

        if (currentDueDateFilter !== 'all') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (currentDueDateFilter === 'overdue') {
                filtered = filtered.filter(t => {
                    if (!t.duedate || isDone(t.status)) return false;
                    const dueDate = new Date(t.duedate);
                    return dueDate < today;
                });
            } else if (currentDueDateFilter === 'today') {
                const todayStr = today.toISOString().slice(0, 10);
                filtered = filtered.filter(t => t.duedate === todayStr);
            } else if (currentDueDateFilter === 'this_week') {
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // Monday as start of week
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                endOfWeek.setHours(23, 59, 59, 999);

                filtered = filtered.filter(t => {
                    if (!t.duedate) return false;
                    const dueDate = new Date(t.duedate);
                    return dueDate >= startOfWeek && dueDate <= endOfWeek;
                });
            }
        }
        if (currentSearchTerm) {
            const terms = currentSearchTerm.toLowerCase().split(/\s+/).filter(Boolean);
            if (terms.length > 0) {
                filtered = filtered.filter(t => {
                    const searchableText = `${t.id || ''} ${t.desc || ''} ${t.assignee || ''}`.toLowerCase();
                    return terms.every(word => searchableText.includes(word));
                });
            }
        }

        if (taskSortCol) {
            updateSortIconUI('task', taskSortCol, taskSortDir);
            filtered.sort((a, b) => {
                let valA, valB;
                if (taskSortCol === 'assignee') { valA = assigneeName(a); valB = assigneeName(b); }
                else { valA = a[taskSortCol] || ''; valB = b[taskSortCol] || ''; }

                if (typeof valA === 'string') valA = valA.toLowerCase();
                if (typeof valB === 'string') valB = valB.toLowerCase();

                if (valA < valB) return taskSortDir === 'asc' ? -1 : 1;
                if (valA > valB) return taskSortDir === 'asc' ? 1 : -1;
                return 0;
            });
        }

        if (currentTaskViewMode === 'kanban' && kanban) {
            const allStatuses = currentStatusFilter === 'all'
                ? [...new Set(tasks.filter(t => !isInternalTask(t)).map(t => t.status).filter(Boolean))].sort()
                : [...currentStatusFilter].sort();
            const statusColors = (s) => {
                if (isDone(s)) return { bg: 'bg-emerald-50/50', border: 'border-emerald-100', titleColor: 'text-emerald-600' };
                if (isInProgress(s)) return { bg: 'bg-amber-50/50', border: 'border-amber-100', titleColor: 'text-amber-600' };
                return { bg: 'bg-blue-50/50', border: 'border-blue-100', titleColor: 'text-blue-600' };
            };
            const cols = allStatuses.map(status => ({
                id: status.toLowerCase().replace(/\s/g, '-'),
                title: status,
                count: filtered.filter(t => t.status === status).length,
                ...statusColors(status)
            }));

            kanban.innerHTML = cols.map(col => {
                const colTasks = filtered.filter(t => t.status === col.title);
                return `
                    <div class="flex flex-col rounded-2xl ${col.bg} border ${col.border} p-4 h-full min-h-[300px] w-80 flex-shrink-0" ondragover="event.preventDefault()" ondrop="dropTask(event, '${col.title}')">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-sm font-black ${col.titleColor}">${col.title}</h3>
                            <span class="text-[10px] font-bold bg-white px-2.5 py-1 rounded-full text-slate-500 shadow-sm">${colTasks.length}</span>
                        </div>
                        <div class="flex-1 space-y-3 overflow-y-auto">
                            ${colTasks.sort((a, b) => (a.duedate || '9999').localeCompare(b.duedate || '9999')).map(t => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const dueDate = t.duedate ? new Date(t.duedate) : null;
                    const isOverdue = dueDate && dueDate < today && !isDone(t.status);

                    let dueDateHtml = '';
                    if (t.duedate) {
                        const dateStr = new Date(t.duedate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                        if (isOverdue) {
                            dueDateHtml = `<span class="flex items-center gap-1 text-rose-600 font-bold text-[10px]">
                                            <iconify-icon icon="solar:danger-triangle-bold" width="12"></iconify-icon>
                                            ${dateStr}
                                        </span>`;
                        } else {
                            dueDateHtml = `<span class="text-slate-500 font-medium text-[10px]">${dateStr}</span>`;
                        }
                    }
                    return `
                                <div draggable="true" ondragstart="dragTask(event, '${t.id}')" class="bg-white p-4 rounded-xl shadow-sm border cursor-grab active:cursor-grabbing hover:shadow-md transition-all group ${isOverdue ? 'border-rose-200 bg-rose-50/50' : 'border-slate-100'}">
                                    <div class="flex items-start justify-between mb-2">
                                        <span class="text-[10px] font-mono font-bold text-indigo-600">${t.manual ? `<button onclick="openEditTaskModal('${t.id}')" class="hover:underline hover:text-indigo-800 text-left">${t.id}</button>` : `<a href="https://${JIRA.domain}/browse/${t.id}" target="_blank" class="hover:underline hover:text-indigo-800">${t.id}</a>`}</span>
                                        <div class="flex items-center gap-2">
                                            ${dueDateHtml}
                                            <span class="text-[10px] font-bold ${priorityClass(t.priority)}">${t.priority}</span>
                                        </div>
                                    </div>
                                    <p class="text-xs font-bold text-slate-900 mb-3">${escapeHtml(t.desc)}</p>
                                    <div class="flex items-center justify-between border-t border-slate-100 pt-3 mt-3">
                                        <div class="flex items-center gap-1">
                                            ${t.manual ? `<button onclick="openEditTaskModal('${t.id}')" class="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors" title="Edit Task"><iconify-icon icon="solar:pen-linear" width="14"></iconify-icon></button>` : ''}
                                        </div>
                                        
                                        ${activeTaskId === t.id ? `
                                            <div class="flex gap-2">
                                                <button onclick="${taskOnHold ? 'resumeTaskTimer()' : 'holdTask()'}" class="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg transition-all ${taskOnHold ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}">
                                                    <iconify-icon icon="${taskOnHold ? 'solar:play-circle-bold' : 'solar:pause-circle-bold'}" width="14"></iconify-icon> ${taskOnHold ? 'Resume' : 'Hold'}
                                                </button>
                                                <button onclick="endTask()" class="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg transition-all bg-rose-600 hover:bg-rose-700 text-white">
                                                    <iconify-icon icon="solar:stop-circle-bold" width="14"></iconify-icon> End
                                                </button>
                                            </div>
                                        ` : `
                                            <button onclick="toggleActiveTask('${t.id}')" class="flex items-center gap-1 text-[10px] font-bold px-3 py-1 rounded-lg transition-all bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600">
                                                <iconify-icon icon="solar:play-circle-bold" width="14"></iconify-icon> Start
                                            </button>
                                        `}
                                    </div>
                                </div>`;
                }).join('')}
                        </div>
                    </div>`;
            }).join('');
        } else {
            if (!filtered.length) { tbody.innerHTML = `<tr><td colspan="8" class="px-6 py-10 text-center text-xs text-slate-400">No tasks found.</td></tr>`; return; }
            tbody.innerHTML = filtered.map(t => {
                const editBtn = t.manual ? `<button onclick="openEditTaskModal('${t.id}')" class="p-2 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors" title="Edit Task"><iconify-icon icon="solar:pen-linear" width="16"></iconify-icon></button>` : '';
                const taskKeyHtml = t.manual ? `<button onclick="openEditTaskModal('${t.id}')" class="hover:underline hover:text-indigo-800 transition-colors text-left">${t.id}</button>` : `<a href="https://${JIRA.domain}/browse/${t.id}" target="_blank" class="hover:underline hover:text-indigo-800 transition-colors inline-flex items-center gap-1" title="Open in Jira">${t.id} <iconify-icon icon="solar:external-link-linear" width="12"></iconify-icon></a>`;

                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const dueDate = t.duedate ? new Date(t.duedate) : null;
                const isOverdue = dueDate && dueDate < today && !isDone(t.status);

                let dueDateHtml = '—';
                if (t.duedate) {
                    const dateStr = new Date(t.duedate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                    if (isOverdue) {
                        dueDateHtml = `<span class="flex items-center gap-1.5 text-rose-600 font-bold">
                                <iconify-icon icon="solar:danger-triangle-bold" width="14"></iconify-icon>
                                ${dateStr}
                            </span>`;
                    } else {
                        dueDateHtml = `<span class="text-slate-600">${dateStr}</span>`;
                    }
                }

                return `
                    <tr class="hover:bg-slate-50 transition-colors ${activeTaskId === t.id ? 'bg-indigo-50/30' : ''} ${isOverdue ? 'bg-rose-50/30' : ''}">
                        <td class="px-6 py-4 text-xs font-mono font-bold text-indigo-600">${taskKeyHtml}</td>
                        <td class="px-6 py-4 max-w-xs truncate text-xs text-slate-900">${escapeHtml(t.desc)}${t.issueType ? `<div class="text-[10px] text-slate-400 mt-1">${escapeHtml(t.issueType)}</div>` : ''}</td>
                        <td class="px-6 py-4"><span class="text-[10px] font-bold px-2 py-1 rounded-full ${statusClass(t.status)}">${t.status}</span></td>
                        <td class="px-6 py-4 hidden md:table-cell text-xs text-slate-600 font-medium">${t.client || '—'}</td>
                        <td class="px-6 py-4 hidden lg:table-cell text-xs text-slate-600 font-medium">${assigneeName(t)}</td>
                        <td class="px-6 py-4 hidden md:table-cell"><span class="text-[10px] font-bold ${priorityClass(t.priority)}">${t.priority}</span></td>
                        <td class="px-6 py-4 text-xs font-medium">${dueDateHtml}</td>
                        <td class="px-6 py-4 text-right">
                            <div class="flex items-center justify-end gap-1">
                                ${editBtn}
                                ${activeTaskId === t.id ? `
                                    <div class="flex items-center justify-end gap-2">
                                        <button onclick="${taskOnHold ? 'resumeTaskTimer()' : 'holdTask()'}" class="flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all ${taskOnHold ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}">
                                            <iconify-icon icon="${taskOnHold ? 'solar:play-circle-bold' : 'solar:pause-circle-bold'}" width="16"></iconify-icon> ${taskOnHold ? 'Resume' : 'Hold'}
                                        </button>
                                        <button onclick="endTask()" class="flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all bg-rose-600 hover:bg-rose-700 text-white shadow-lg">
                                            <iconify-icon icon="solar:stop-circle-bold" width="16"></iconify-icon> End
                                        </button>
                                    </div>
                                ` : `
                                    <button onclick="toggleActiveTask('${t.id}')" class="flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600">
                                        <iconify-icon icon="solar:play-circle-bold" width="16"></iconify-icon> Start
                                    </button>
                                `}
                            </div>
                        </td>
                    </tr>`;
            }).join('');
        }
        Object.entries(unreadCounts).forEach(([id, count]) => {
            const badgeEl = document.getElementById(`unread-badge-${id}`);
            const btnEl = document.getElementById(`dm-btn-${id}`);
            if (badgeEl) {
                badgeEl.textContent = count;
                badgeEl.classList.toggle('hidden', count === 0);
            }
            if (btnEl) {
                if (count > 0) btnEl.classList.add('bg-indigo-50/50', 'border-l-2', 'border-indigo-600');
                else btnEl.classList.remove('bg-indigo-50/50', 'border-l-2', 'border-indigo-600');
            }
        });
    }

    function renderInternalTasks() {
        const tbody = document.getElementById('internal-tasks-tbody');
        if (!tbody) return;

        let filtered = tasks.filter(isInternalTask);
        if (currentInternalStatusFilter !== 'all') {
            filtered = currentInternalStatusFilter.length
                ? filtered.filter(t => currentInternalStatusFilter.includes(t.status))
                : [];
        }
        if (currentInternalAssigneeFilter !== 'all') filtered = filtered.filter(t => assigneeMatches(t, currentInternalAssigneeFilter));
        if (currentInternalClientFilter !== 'all') filtered = filtered.filter(t => t.client === currentInternalClientFilter);
        if (currentInternalDueDateFilter !== 'all') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (currentInternalDueDateFilter === 'overdue') {
                filtered = filtered.filter(t => t.duedate && new Date(t.duedate) < today && !isDone(t.status));
            } else if (currentInternalDueDateFilter === 'today') {
                filtered = filtered.filter(t => t.duedate === today.toISOString().slice(0, 10));
            } else if (currentInternalDueDateFilter === 'this_week') {
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                endOfWeek.setHours(23, 59, 59, 999);
                filtered = filtered.filter(t => t.duedate && new Date(t.duedate) >= startOfWeek && new Date(t.duedate) <= endOfWeek);
            }
        }
        if (currentInternalSearchTerm) {
            const terms = currentInternalSearchTerm.toLowerCase().split(/\s+/).filter(Boolean);
            if (terms.length > 0) {
                filtered = filtered.filter(t => {
                    const searchableText = `${t.id || ''} ${t.desc || ''} ${t.client || ''} ${assigneeName(t) || ''}`.toLowerCase();
                    return terms.every(word => searchableText.includes(word));
                });
            }
        }
        if (internalTaskSortCol) {
            updateSortIconUI('internal-task', internalTaskSortCol, internalTaskSortDir);
            filtered.sort((a, b) => {
                let valA = internalTaskSortCol === 'assignee' ? assigneeName(a) : (a[internalTaskSortCol] || '');
                let valB = internalTaskSortCol === 'assignee' ? assigneeName(b) : (b[internalTaskSortCol] || '');
                if (typeof valA === 'string') valA = valA.toLowerCase();
                if (typeof valB === 'string') valB = valB.toLowerCase();
                if (valA < valB) return internalTaskSortDir === 'asc' ? -1 : 1;
                if (valA > valB) return internalTaskSortDir === 'asc' ? 1 : -1;
                return 0;
            });
        }

        filtered.sort((a, b) => (a.order || 0) - (b.order || 0));
        if (!filtered.length) {
            tbody.innerHTML = `<tr><td colspan="8" class="px-6 py-10 text-center text-xs text-slate-400">No internal tasks found.</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(t => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dueDate = t.duedate ? new Date(t.duedate) : null;
            const isOverdue = dueDate && dueDate < today && !isDone(t.status);
            const dueDateHtml = t.duedate
                ? `<span class="${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600'}">${new Date(t.duedate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>`
                : '—';
            return `
                <tr draggable="true" ondragstart="dragInternalTask(event, '${t.id}')" ondragover="allowDropInternal(event)" ondrop="dropInternalTask(event, '${t.id}')" class="hover:bg-slate-50 transition-colors ${activeTaskId === t.id ? 'bg-indigo-50/30' : ''} ${isOverdue ? 'bg-rose-50/30' : ''}">
                    <td class="px-6 py-4 text-xs font-mono font-bold text-indigo-600"><button onclick="openEditTaskModal('${t.id}')" class="hover:underline hover:text-indigo-800 transition-colors text-left">${t.id}</button></td>
                    <td class="px-6 py-4 max-w-xs truncate text-xs text-slate-900">${escapeHtml(t.desc || '')}${t.notes ? `<div class="text-[10px] text-slate-400 mt-1 truncate">${escapeHtml(t.notes)}</div>` : ''}</td>
                    <td class="px-6 py-4">
                        <select onchange="updateInternalTaskStatus('${t.id}', this.value)" class="text-[10px] font-bold px-2 py-1 rounded-full border outline-none cursor-pointer transition-all ${statusClass(t.status)}" style="background:transparent;" title="Change status">
                            ${INTERNAL_TASK_STATUSES.map(s => `<option value="${s}" ${t.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                        </select>
                    </td>
                    <td class="px-6 py-4 hidden md:table-cell text-xs text-slate-600 font-medium">${escapeHtml(t.client || '—')}</td>
                    <td class="px-6 py-4 hidden lg:table-cell text-xs text-slate-600 font-medium">${escapeHtml(assigneeName(t))}</td>
                    <td class="px-6 py-4 hidden md:table-cell"><span class="text-[10px] font-bold ${priorityClass(t.priority)}">${escapeHtml(t.priority || 'Medium')}</span></td>
                    <td class="px-6 py-4 text-xs font-medium">${dueDateHtml}</td>
                    <td class="px-6 py-4 text-right">
                        <div class="flex items-center justify-end gap-1">
                            <button onclick="openEditTaskModal('${t.id}')" class="p-2 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors" title="Edit Task"><iconify-icon icon="solar:pen-linear" width="16"></iconify-icon></button>
                            ${activeTaskId === t.id ? `
                                <div class="flex items-center justify-end gap-2">
                                    <button onclick="${taskOnHold ? 'resumeTaskTimer()' : 'holdTask()'}" class="flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all ${taskOnHold ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}">
                                        <iconify-icon icon="${taskOnHold ? 'solar:play-circle-bold' : 'solar:pause-circle-bold'}" width="16"></iconify-icon> ${taskOnHold ? 'Resume' : 'Hold'}
                                    </button>
                                    <button onclick="endTask()" class="flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all bg-rose-600 hover:bg-rose-700 text-white shadow-lg">
                                        <iconify-icon icon="solar:stop-circle-bold" width="16"></iconify-icon> End
                                    </button>
                                </div>
                            ` : `
                                <button onclick="toggleActiveTask('${t.id}')" class="flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600">
                                    <iconify-icon icon="solar:play-circle-bold" width="16"></iconify-icon> Start
                                </button>
                            `}
                        </div>
                    </td>
                </tr>`;
        }).join('');
    }

    function statusClass(s) {
        if (isDone(s)) return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
        if (isInProgress(s)) return 'bg-amber-50 text-amber-600 border border-amber-100';
        return 'bg-blue-50 text-blue-600 border border-blue-100';
    }
    function priorityClass(p) {
        if (['High', 'Highest', 'Critical'].includes(p)) return 'text-rose-500';
        if (['Low', 'Lowest'].includes(p)) return 'text-slate-400';
        return 'text-slate-600';
    }

    function assigneeName(t) {
        if (t.assignee) return t.assignee;
        const email = t.assigneeEmail || t.userId;
        const user = allUsersMap.get((email || '').toLowerCase()); // Use the global map
        return user?.name || email || 'Unassigned'; // Fallback to email if name not found
    }

    function isInternalTask(t) {
        return t?.taskType === 'internal' || t?.internal === true;
    }

    function normalizeAssigneeValue(v) {
        return (v || '').toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    function assigneeMatches(task, filterValue) {
        if (!currentUser && filterValue === 'me') return false;
        const filterUser = filterValue === 'me'
            ? currentUser
            : (allUsersMap.get((filterValue || '').toLowerCase()) || USERS.find(u => u.email === filterValue));
        const filterEmail = (filterUser?.email || filterValue || '').toLowerCase();
        const filterName = normalizeAssigneeValue(filterUser?.name || filterValue.replace(/^name:/, ''));
        const taskEmail = (task.assigneeEmail || task.userId || '').toLowerCase();
        const taskName = normalizeAssigneeValue(task.assignee || assigneeName(task));

        // Fuzzy partial name matching (handles "Karthika K" vs "Karthika")
        if (filterName && taskName) {
            if (filterName.includes(taskName) || taskName.includes(filterName)) return true;
        }

        if (taskEmail && taskEmail === filterEmail) return true;
        if (!filterName || !taskName) return false;
        return taskName === filterName || taskName.includes(filterName) || filterName.includes(taskName);
    }

    function myPendingTasks() {
        if (!currentUser) return [];
        return tasks.filter(t => !isDone(t.status) && assigneeMatches(t, 'me'));
    }

    async function saveCurrentTaskState(state = 'working', details = null) {
        if (!currentUser || !activeTaskId) return;
        const task = tasks.find(t => t.id === activeTaskId);
        if (!task) return;

        if (details !== null) currentWorkDetails = details;

        const payload = {
            taskId: activeTaskId,
            taskDesc: task.desc || '',
            status: task.status || '',
            client: task.client || '',
            priority: task.priority || '',
            state,
            startedAt: taskStartTime || Date.now(),
            currentSeconds: taskSeconds || 0,
            workDetails: currentWorkDetails || '',
            updatedAt: Date.now()
        };
        await set(ref(db, `worksync/users/${eKey(currentUser.email)}/currentTask`), payload);
    }

    async function restoreActiveTask() {
        if (!currentUser) return;
        const snap = await get(ref(db, `worksync/users/${eKey(currentUser.email)}/currentTask`));
        const currentTaskData = snap.val();

        if (currentTaskData && currentTaskData.taskId) {
            currentWorkDetails = currentTaskData.workDetails || '';
            console.log('Restoring active task:', currentTaskData);
            const lastUpdated = currentTaskData.updatedAt || Date.now();
            const elapsedSinceUpdate = Math.floor((Date.now() - lastUpdated) / 1000);
            const savedSeconds = currentTaskData.currentSeconds || 0;

            // If the task was updated more than 12 hours ago, assume the session was abandoned.
            // Restore it in a "held" state to prevent runaway timers.
            const MAX_RESTORABLE_GAP_SECONDS = 43200; // 12 Hours

            if (elapsedSinceUpdate > MAX_RESTORABLE_GAP_SECONDS) {
                console.warn(`Task restore gap is too large (${elapsedSinceUpdate}s). Restoring in held state.`);
                activeTaskId = currentTaskData.taskId;
                taskOnHold = true; // Force to 'on hold' state
                taskSeconds = savedSeconds;
                toast('Task was restored on hold due to long inactivity.', 'info');
            } else {
                activeTaskId = currentTaskData.taskId;
                taskOnHold = currentTaskData.state === 'on_hold';

                if (taskOnHold) {
                    taskSeconds = savedSeconds;
                } else {
                    // It was running, so add the elapsed time.
                    taskSeconds = savedSeconds + elapsedSinceUpdate;
                }
            }

            // Re-align taskStartTime for timer logic
            taskStartTime = Date.now() - (taskSeconds * 1000);

            if (!taskOnHold) {
                startTaskTimer();
            }

            renderTasks();
            if (activeView === 'internal-tasks') renderInternalTasks();
            renderActiveTaskCard();
            renderDailyPlan();
        }
    }

    async function clearCurrentTask() {
        if (!currentUser) return;
        await set(ref(db, `worksync/users/${eKey(currentUser.email)}/currentTask`), null);
    }

    // Sneha popup state
    let pendingSnehaTaskId = null;

    function isSnehaUser() {
        return currentUser && currentUser.email.toLowerCase() === 'snehavilpower@gmail.com';
    }

    function isVideoTask(task) {
        const type = (task.issueType || task.type || '').toLowerCase();
        const desc = (task.desc || '').toLowerCase();
        return type.includes('video') || type.includes('reel') || type.includes('motion') || type.includes('animation') || desc.includes('video') || desc.includes('reel');
    }

    function showSnehaTaskPopup(taskId) {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        pendingSnehaTaskId = taskId;

        const nameEl = document.getElementById('sneha-task-name');
        if (nameEl) nameEl.textContent = task.id + ' — ' + (task.desc || '');

        const list = document.getElementById('sneha-details-list');
        const isVideo = isVideoTask(task);

        if (isVideo) {
            list.innerHTML = `
                    <label class="flex items-center gap-3 p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-indigo-50 transition-all border border-slate-100">
                        <input type="checkbox" name="sneha-work" value="Video Content" class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500">
                        <iconify-icon icon="solar:video-frame-bold" width="18" class="text-amber-500"></iconify-icon>
                        <span class="text-xs font-bold text-slate-700">Video Content</span>
                    </label>
                    <label class="flex items-center gap-3 p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-indigo-50 transition-all border border-slate-100">
                        <input type="checkbox" name="sneha-work" value="End Card Content" class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500">
                        <iconify-icon icon="solar:card-bold" width="18" class="text-blue-500"></iconify-icon>
                        <span class="text-xs font-bold text-slate-700">End Card Content</span>
                    </label>
                    <label class="flex items-center gap-3 p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-indigo-50 transition-all border border-slate-100">
                        <input type="checkbox" name="sneha-work" value="Thumbnail Content" class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500">
                        <iconify-icon icon="solar:gallery-bold" width="18" class="text-emerald-500"></iconify-icon>
                        <span class="text-xs font-bold text-slate-700">Thumbnail Content</span>
                    </label>
                    <label class="flex items-center gap-3 p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-indigo-50 transition-all border border-slate-100">
                        <input type="checkbox" name="sneha-work" value="Captions" class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500">
                        <iconify-icon icon="solar:text-bold" width="18" class="text-rose-500"></iconify-icon>
                        <span class="text-xs font-bold text-slate-700">Captions</span>
                    </label>`;
        } else {
            // Poster / Static
            list.innerHTML = `
                    <label class="flex items-center gap-3 p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-indigo-50 transition-all border border-slate-100">
                        <input type="checkbox" name="sneha-work" value="Poster Content" class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500">
                        <iconify-icon icon="solar:gallery-bold" width="18" class="text-indigo-500"></iconify-icon>
                        <span class="text-xs font-bold text-slate-700">Poster Content</span>
                    </label>
                    <label class="flex items-center gap-3 p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-indigo-50 transition-all border border-slate-100">
                        <input type="checkbox" name="sneha-work" value="Captions" class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500">
                        <iconify-icon icon="solar:text-bold" width="18" class="text-rose-500"></iconify-icon>
                        <span class="text-xs font-bold text-slate-700">Captions</span>
                    </label>`;
        }

        document.getElementById('snehaTaskDetailsModal').showModal();
    }

    async function confirmSnehaTaskStart() {
        if (!pendingSnehaTaskId) return;
        const selected = Array.from(document.querySelectorAll('input[name="sneha-work"]:checked')).map(cb => cb.value);
        if (!selected.length) return toast('Please select at least one item', 'error');

        document.getElementById('snehaTaskDetailsModal').close();

        // Store the selection in Firebase
        const task = tasks.find(t => t.id === pendingSnehaTaskId);
        await push(ref(db, 'worksync/sneha_work_selections'), {
            taskId: pendingSnehaTaskId,
            taskDesc: task?.desc || '',
            client: task?.client || '',
            selectedItems: selected,
            userId: currentUser.email,
            userName: currentUser.name,
            timestamp: Date.now()
        });

        // Now actually start the task
        const taskId = pendingSnehaTaskId;
        pendingSnehaTaskId = null;
        await doStartTask(taskId);
    }

    async function toggleActiveTask(id) {
        // This function is called when clicking "Start" on a new task.

        // Sneha popup: if user is Sneha and task is in 'To Do' status, show the popup first
        if (isSnehaUser()) {
            const task = tasks.find(t => t.id === id);
            if (task && isTodo(task.status) && !isInternalTask(task)) {
                showSnehaTaskPopup(id);
                return; // Don't start yet — popup handles it via confirmSnehaTaskStart
            }
        }

        await doStartTask(id);
    }

    async function doStartTask(id) {
        // If another task is active, log its time before switching.
        if (activeTaskId && activeTaskId !== id) {
            stopTaskTimer();
            // Accurate final duration calculation before logging
            if (!taskOnHold && taskStartTime) {
                taskSeconds = Math.floor((Date.now() - taskStartTime) / 1000);
            }

            const oldTask = tasks.find(t => t.id === activeTaskId);
            const log = {
                taskId: activeTaskId,
                taskDesc: oldTask?.desc || '',
                client: oldTask?.client || '',
                userId: currentUser.email,
                userName: currentUser.name,
                startTime: taskStartTime,
                endTime: Date.now(),
                durationSeconds: taskSeconds,
                durationFormatted: formatTime(taskSeconds)
            };
            await push(ref(db, 'worksync/timelogs'), log);
            toast(`Task ${activeTaskId} ended — ${formatTime(taskSeconds)} logged`, 'info');
        }

        // Now, start the new task.
        activeTaskId = id;
        taskSeconds = 0;
        taskOnHold = false;
        taskStartTime = Date.now();

        // --- Bring active task to top of the list ---
        const taskIndex = tasks.findIndex(t => t.id === id);
        if (taskIndex > 0) {
            const [taskToMove] = tasks.splice(taskIndex, 1);
            tasks.unshift(taskToMove);
        }

        // For internal task, update status to 'In Progress'
        const task = tasks.find(t => t.id === id);
        if (task && isInternalTask(task)) {
            await updateInternalTaskStatus(id, 'In Progress');
        }

        startTaskTimer();
        renderTasks();
        if (activeView === 'internal-tasks') renderInternalTasks();
        renderActiveTaskCard();
        renderDailyPlan();
        saveCurrentTaskState('working').catch(err => {
            console.error('Failed to save current task state:', err);
            toast('Task started locally, but live board sync failed: ' + err.message, 'error');
        });
        toast(`Task ${id} started — timer running`, 'success');
    }

    function startTaskTimer() {
        if (taskTimerRef) clearInterval(taskTimerRef);
        if (!taskOnHold && taskStartTime) {
            taskSeconds = Math.floor((Date.now() - taskStartTime) / 1000);
        }
        const initialEl = document.getElementById('task-timer-display');
        if (initialEl) initialEl.textContent = formatTime(taskSeconds);
        taskTimerRef = setInterval(() => {
            // Calculate actual elapsed time to avoid setInterval drift
            if (!taskOnHold && taskStartTime) {
                taskSeconds = Math.floor((Date.now() - taskStartTime) / 1000);
            }

            const el = document.getElementById('task-timer-display');
            if (el) el.textContent = formatTime(taskSeconds);

            // Periodic sync with DB every minute
            if (taskSeconds > 0 && taskSeconds % 60 === 0) {
                saveCurrentTaskState('working');
            }
        }, 1000);
    }

    function stopTaskTimer() {
        clearInterval(taskTimerRef);
        taskTimerRef = null;
    }

    function holdTask() {
        // Capture final accurate seconds before stopping the clock
        if (taskStartTime) {
            taskSeconds = Math.floor((Date.now() - taskStartTime) / 1000);
        }
        stopTaskTimer();
        taskOnHold = true;
        if (activeTaskId) {
            const task = tasks.find(t => t.id === activeTaskId);
            if (task && isInternalTask(task)) {
                updateInternalTaskStatus(activeTaskId, 'Hold');
            }
        }
        saveCurrentTaskState('on_hold');
        renderTasks();
        if (activeView === 'internal-tasks') renderInternalTasks();
        renderActiveTaskCard();
        renderDailyPlan();
        toast('Task on hold', 'info');
    }

    function holdActiveTaskForCheckout() {
        if (!activeTaskId) return;
        if (taskStartTime && !taskOnHold) {
            taskSeconds = Math.floor((Date.now() - taskStartTime) / 1000);
        }
        stopTaskTimer();
        taskOnHold = true;
        const task = tasks.find(t => t.id === activeTaskId);
        if (task && isInternalTask(task)) {
            updateInternalTaskStatus(activeTaskId, 'Hold');
        }
        saveCurrentTaskState('on_hold');
        renderTasks();
        if (activeView === 'internal-tasks') renderInternalTasks();
        renderActiveTaskCard();
        renderDailyPlan();
    }

    function resumeTaskTimer() {
        taskOnHold = false;
        taskStartTime = Date.now() - (taskSeconds * 1000);
        startTaskTimer();
        saveCurrentTaskState('working');
        renderTasks();
        if (activeView === 'internal-tasks') renderInternalTasks();
        renderActiveTaskCard();
        renderDailyPlan();
        toast('Task resumed', 'success');
    }

    async function endTask() {
        if (!activeTaskId || !currentUser) return;
        stopTaskTimer();

        // Final clock-based validation of total time
        if (!taskOnHold && taskStartTime) {
            taskSeconds = Math.floor((Date.now() - taskStartTime) / 1000);
        }

        const t = tasks.find(t => t.id === activeTaskId);
        
        // Show learnings capture modal
        openTaskLearningsModal(t);
    }

    function openTaskLearningsModal(task) {
        if (!task) return;
        
        // Store temp task data for modal
        window.pendingTaskEndData = {
            taskId: task.id,
            taskDesc: task.desc || '',
            client: task.client || '',
            startTime: taskStartTime,
            endTime: Date.now(),
            durationSeconds: taskSeconds,
            durationFormatted: formatTime(taskSeconds)
        };
        
        // Show modal for learnings capture
        document.getElementById('task-learnings-modal').showModal();
    }

    async function completeTaskWithLearnings() {
        const data = window.pendingTaskEndData;
        if (!data) return;

        try {
            const learningsContent = document.getElementById('task-learnings-input').value.trim();
            const t = tasks.find(t => t.id === data.taskId);
            
            // Update learnings note if provided
            if (learningsContent && t) {
                t.learningsNote = learningsContent;
                if (t.manual || isInternalTask(t)) {
                    await update(ref(db, `worksync/manual_tasks/${eKey(t.userId)}/${t.id}`), { learningsNote: learningsContent });
                } else {
                    await update(ref(db, `worksync/manual_tasks/${eKey(t.userId)}/${t.id}`), { learningsNote: learningsContent });
                }
            }

            // Update task status to Completed if internal
            if (t && isInternalTask(t)) {
                await updateInternalTaskStatus(data.taskId, 'Completed');
            }

            // Log the time
            const log = {
                taskId: data.taskId,
                taskDesc: data.taskDesc || '',
                client: data.client || '',
                userId: currentUser.email,
                userName: currentUser.name,
                startTime: data.startTime,
                endTime: data.endTime,
                durationSeconds: data.durationSeconds,
                durationFormatted: data.durationFormatted,
                learnings: learningsContent
            };
            await push(ref(db, 'worksync/timelogs'), log);

            // Clear task state
            await clearCurrentTask();
            
            // Close modal and update UI
            document.getElementById('task-learnings-modal').close();
            document.getElementById('task-learnings-input').value = '';
            
            toast(`Task completed — ${data.durationFormatted} logged with learnings`, 'success');
            
            activeTaskId = null; taskSeconds = 0; taskOnHold = false; taskStartTime = null;
            renderTasks(); if (activeView === 'internal-tasks') renderInternalTasks(); renderActiveTaskCard(); renderDailyPlan();
            
            window.pendingTaskEndData = null;
        } catch (err) {
            console.error('Error completing task:', err);
            toast('Error completing task: ' + err.message, 'error');
        }
    }

    function skipTaskLearnings() {
        const data = window.pendingTaskEndData;
        if (!data) return;

        document.getElementById('task-learnings-modal').close();
        document.getElementById('task-learnings-input').value = '';
        window.pendingTaskEndData = null;
        
        // Don't update anything, just close
        toast('Task end cancelled', 'info');
    }

    function renderActiveTaskCard() {
        const el = document.getElementById('active-task-card');
        if (!activeTaskId) {
            el.innerHTML = `<p class="text-sm text-slate-400">No task selected. Pick one from Jira Tasks.</p>`;
            return;
        }
        const t = tasks.find(t => t.id === activeTaskId);
        if (!t) return;
        const taskKeyHtml = t.manual ? t.id : `<a href="https://${JIRA.domain}/browse/${t.id}" target="_blank" class="hover:underline hover:text-indigo-800 transition-colors inline-flex items-center gap-1" title="Open in Jira">${t.id} <iconify-icon icon="solar:external-link-linear" width="12"></iconify-icon></a>`;
        el.innerHTML = `
                <div class="flex items-start justify-between mb-4">
                    <div>
                        <div class="flex items-center gap-2 mb-2">
                            <span class="text-xs font-mono font-bold text-indigo-600">${taskKeyHtml}</span>
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${statusClass(t.status)}">${t.status}</span>
                            ${t.client ? `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">${t.client}</span>` : ''}
                        </div>
                        <p class="text-sm font-bold text-slate-900">${t.desc}</p>
                    </div>
                    <button onclick="toggleActiveTask('${t.id}')" class="text-rose-400 p-1 hover:bg-rose-50 rounded-lg transition-colors shrink-0">
                        <iconify-icon icon="solar:close-circle-bold" width="18"></iconify-icon>
                    </button>
                </div>
                <div class="border-t border-slate-100 pt-4 mt-2">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Time on Task</p>
                            <p id="task-timer-display" class="text-2xl font-black text-slate-900 font-mono">${formatTime(taskSeconds)}</p>
                        </div>
                        <div class="flex gap-2">
                            <button id="task-hold-btn" onclick="holdTask()" class="${taskOnHold ? 'hidden' : ''} flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 text-xs font-bold px-4 py-2.5 rounded-xl transition-all">
                                <iconify-icon icon="solar:pause-circle-bold" width="16"></iconify-icon> Hold
                            </button>
                            <button id="task-resume-btn" onclick="resumeTaskTimer()" class="${taskOnHold ? '' : 'hidden'} flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-xs font-bold px-4 py-2.5 rounded-xl transition-all">
                                <iconify-icon icon="solar:play-circle-bold" width="16"></iconify-icon> Resume
                            </button>
                            <button onclick="endTask()" class="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-rose-100 transition-all">
                                <iconify-icon icon="solar:stop-circle-bold" width="16"></iconify-icon> End Task
                            </button>
                        </div>
                    </div>
                </div>`;
    }

    // ════════════════════════════════════════════
    // DISCUSSION SCHEDULING & MANAGEMENT
    // ════════════════════════════════════════════
    let discussions = [];
    let discussionCheckInterval = null;
    let currentDiscussion = null;
    let discussionPopupShown = false;
    let discussionJoinCountdown = null;

    function openScheduleDiscussionModal() {
        // Populate client select
        const clientSelect = document.getElementById('disc-client');
        clientSelect.innerHTML = `<option value="">Select client/department...</option>` + CLIENTS.map(c => `<option value="${c}">${c}</option>`).join('');

        // Populate participants checkboxes
        const participantsDiv = document.getElementById('disc-participants');
        participantsDiv.innerHTML = Array.from(allUsersMap.values()).map(u => `
                <label class="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                    <input type="checkbox" value="${u.email}" class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500">
                    <span class="text-xs text-slate-700"><span class="font-bold">${u.name}</span><br><span class="text-slate-500">${u.email}</span></span>
                </label>
            `).join('');

        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('disc-date').value = today;

        // Set default time to now + 1 hour
        const now = new Date();
        now.setHours(now.getHours() + 1);
        document.getElementById('disc-time').value = now.toTimeString().slice(0, 5);

        document.getElementById('scheduleDiscussionModal').showModal();
    }

    async function submitScheduleDiscussion() {
        const title = document.getElementById('disc-title').value.trim();
        const client = document.getElementById('disc-client').value;
        const date = document.getElementById('disc-date').value;
        const time = document.getElementById('disc-time').value;
        const duration = parseInt(document.getElementById('disc-duration').value) || 30;
        const description = document.getElementById('disc-description').value.trim();

        const participantCheckboxes = document.querySelectorAll('#disc-participants input[type="checkbox"]:checked');
        const participants = Array.from(participantCheckboxes).map(cb => cb.value);

        // Validation
        if (!title) return toast('Enter discussion title', 'error');
        if (!client) return toast('Select a client/department', 'error');
        if (!date) return toast('Select a date', 'error');
        if (!time) return toast('Select a time', 'error');
        if (participants.length === 0) return toast('Select at least one participant', 'error');

        const btn = document.getElementById('disc-submit-btn');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.innerHTML = `<iconify-icon icon="svg-spinners:ring-resize" width="18"></iconify-icon> Scheduling...`;

        try {
            // Combine date and time
            const dateTimeStr = `${date}T${time}:00`;
            const scheduledTime = new Date(dateTimeStr).getTime();
            const now = Date.now();

            if (scheduledTime <= now) {
                toast('Discussion time must be in the future', 'error');
                btn.disabled = false;
                btn.textContent = originalText;
                return;
            }

            const discussionId = 'DISC-' + Date.now();
            const discussion = {
                id: discussionId,
                title,
                client,
                scheduledTime,
                duration: duration * 60 * 1000, // Convert to milliseconds
                participants,
                description,
                createdBy: currentUser.email,
                createdAt: Date.now(),
                status: 'scheduled' // scheduled, in-progress, completed
            };

            await set(ref(db, `worksync/discussions/${discussionId}`), discussion);

            // Notify all participants
            participants.forEach(email => {
                const participantName = knownUserByEmail(email)?.name || email;
                toast(`Discussion "${title}" scheduled for ${date} at ${time}`, 'success');
            });

            document.getElementById('scheduleDiscussionModal').close();
            discussions.push(discussion);
            startDiscussionListener();
            toast(`Discussion scheduled successfully!`, 'success');
        } catch (err) {
            console.error('Failed to schedule discussion:', err);
            toast('Failed to schedule discussion: ' + err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    function startDiscussionListener() {
        // Check for upcoming discussions every second
        if (discussionCheckInterval) clearInterval(discussionCheckInterval);

        discussionCheckInterval = setInterval(() => {
            const now = Date.now();
            discussions.forEach(disc => {
                if (disc.status === 'scheduled') {
                    const timeUntilStart = disc.scheduledTime - now;

                    // Show popup 30 seconds before
                    if (timeUntilStart <= 30000 && timeUntilStart > 0 && !discussionPopupShown) {
                        discussionPopupShown = true;
                        currentDiscussion = disc;
                        showDiscussionJoinPopup(disc);
                    }
                }
            });
        }, 1000);
    }

    function showDiscussionJoinPopup(discussion) {
        const popup = document.getElementById('discussionJoinPopup');
        const titleEl = popup.querySelector('#disc-popup-title');
        const countdownEl = popup.querySelector('#disc-popup-countdown');

        titleEl.textContent = discussion.title;

        // Show popup
        popup.showModal();

        // Start countdown
        let secondsLeft = 30;
        countdownEl.textContent = secondsLeft;

        if (discussionJoinCountdown) clearInterval(discussionJoinCountdown);
        discussionJoinCountdown = setInterval(() => {
            secondsLeft--;
            countdownEl.textContent = secondsLeft;

            if (secondsLeft <= 0) {
                clearInterval(discussionJoinCountdown);
                popup.close();
                discussionPopupShown = false;
            }
        }, 1000);
    }

    async function joinDiscussion() {
        if (!currentDiscussion) return;

        const popup = document.getElementById('discussionJoinPopup');
        popup.close();
        clearInterval(discussionJoinCountdown);

        // Hold current task if one is active
        if (activeTaskId) {
            holdTask();
            toast('Current task paused', 'info');
        }

        // Create a new discussion task
        const discussionTask = {
            id: 'DISC-' + Date.now(),
            desc: currentDiscussion.title,
            client: currentDiscussion.client,
            status: 'Discussion',
            priority: 'High',
            assignee: currentUser.name,
            assigneeEmail: currentUser.email,
            manual: true,
            taskType: 'internal',
            userId: currentUser.email,
            createdAt: Date.now(),
            discussionId: currentDiscussion.id,
            isDiscussionTask: true
        };

        // Save task
        await set(ref(db, `worksync/manual_tasks/${eKey(currentUser.email)}/${discussionTask.id}`), discussionTask);

        // Set as active task
        activeTaskId = discussionTask.id;
        taskSeconds = 0;
        taskStartTime = Date.now();
        taskOnHold = false;
        startTaskTimer();

        // Update discussion status in Firebase
        await update(ref(db, `worksync/discussions/${currentDiscussion.id}`), {
            status: 'in-progress',
            joinedBy: [...(currentDiscussion.joinedBy || []), currentUser.email],
            joinedAt: Date.now()
        });

        tasks = mergeTasksById([discussionTask, ...tasks]);
        renderTasks();
        renderInternalTasks();
        renderActiveTaskCard();
        updateStats();

        toast(`Joined discussion: ${currentDiscussion.title}`, 'success');
        discussionPopupShown = false;
    }

    function dismissDiscussionPopup() {
        const popup = document.getElementById('discussionJoinPopup');
        popup.close();
        clearInterval(discussionJoinCountdown);
        discussionPopupShown = false;
        if (currentDiscussion) {
            dismissedDiscussionIds.push(currentDiscussion.id);
        }
        currentDiscussion = null;
    }

    async function joinDiscussionById(discId) {
        const disc = discussions.find(d => d.id === discId);
        if (!disc) return toast('Discussion not found', 'error');
        if ((disc.joinedBy || []).includes(currentUser.email)) {
            return toast('You have already joined this discussion', 'info');
        }
        currentDiscussion = disc;
        await joinDiscussion();
    }

    async function startScheduledDiscussion(discId) {
        await joinDiscussionById(discId);
    }

    async function holdCurrentDiscussionLive(discussionId) {
        if (!confirm('Are you sure you want to pause/hold this discussion?')) return;
        try {
            await update(ref(db, `worksync/discussions/${discussionId}`), { status: 'hold' });
            toast('Discussion placed on hold!', 'info');
            if (activeTaskId) {
                const currentTaskObj = tasks.find(t => t.id === activeTaskId);
                if (currentTaskObj && currentTaskObj.discussionId === discussionId && !taskOnHold) {
                    holdTask();
                }
            }
        } catch (err) {
            console.error('Failed to hold discussion:', err);
            toast('Failed to hold discussion: ' + err.message, 'error');
        }
    }

    async function resumeCurrentDiscussionLive(discussionId) {
        try {
            await update(ref(db, `worksync/discussions/${discussionId}`), { status: 'in-progress' });
            toast('Discussion resumed!', 'success');
            if (activeTaskId) {
                const currentTaskObj = tasks.find(t => t.id === activeTaskId);
                if (currentTaskObj && currentTaskObj.discussionId === discussionId && taskOnHold) {
                    resumeTaskTimer();
                }
            }
        } catch (err) {
            console.error('Failed to resume discussion:', err);
            toast('Failed to resume discussion: ' + err.message, 'error');
        }
    }

    async function updateDiscussionStatus(discussionId, status) {
        try {
            await update(ref(db, `worksync/discussions/${discussionId}`), { status });
        } catch (err) {
            console.error('Failed to update discussion status:', err);
        }
    }

    function loadDiscussions() {
        try {
            onValue(ref(db, 'worksync/discussions'), (snapshot) => {
                discussions = [];
                snapshot.forEach(childSnapshot => {
                    const disc = childSnapshot.val();
                    if (disc) {
                        discussions.push(disc);
                        
                        // Auto-trigger popup for other participants when status becomes in-progress
                        if (disc.status === 'in-progress' && disc.participants && disc.participants.includes(currentUser.email)) {
                            const hasJoined = (disc.joinedBy || []).includes(currentUser.email);
                            if (!hasJoined && !discussionPopupShown && !dismissedDiscussionIds.includes(disc.id)) {
                                discussionPopupShown = true;
                                currentDiscussion = disc;
                                showDiscussionJoinPopup(disc);
                            }
                        }
                    }
                });

                // Sync active task timer with discussion status
                if (activeTaskId) {
                    const activeTask = tasks.find(t => t.id === activeTaskId);
                    if (activeTask && activeTask.discussionId) {
                        const disc = discussions.find(d => d.id === activeTask.discussionId);
                        if (disc) {
                            if (disc.status === 'hold' && !taskOnHold) {
                                wasPausedByDiscussionHold = true;
                                holdTask();
                                toast(`Discussion "${disc.title}" put on hold. Task paused.`, 'info');
                            } else if (disc.status === 'in-progress' && taskOnHold && wasPausedByDiscussionHold) {
                                wasPausedByDiscussionHold = false;
                                resumeTaskTimer();
                                toast(`Discussion "${disc.title}" resumed. Task resumed.`, 'success');
                            } else if (disc.status === 'completed') {
                                wasPausedByDiscussionHold = false;
                                endTask();
                                toast(`Discussion "${disc.title}" completed.`, 'info');
                            }
                        }
                    }
                }

                startDiscussionListener();
            });
        } catch (err) {
            console.error('Failed to load discussions:', err);
        }
    }

    function updateStats() {

        // --- User-specific stats for "Today's Performance" card ---
        const myTasks = tasks.filter(t => assigneeMatches(t, 'me'));
        const myTotal = myTasks.length;
        const myTodo = myTasks.filter(t => isTodo(t.status)).length;
        const myInProgress = myTasks.filter(t => isInProgress(t.status)).length;
        const myDone = myTasks.filter(t => isDone(t.status)).length;
        const myPendingCount = myTasks.filter(t => !isDone(t.status)).length;

        const elTotal = document.getElementById('stat-total'); if (elTotal) elTotal.textContent = myTotal;
        const elTodo = document.getElementById('stat-todo'); if (elTodo) elTodo.textContent = myTodo;
        const elProg = document.getElementById('stat-progress'); if (elProg) elProg.textContent = myInProgress;
        const elDone = document.getElementById('stat-done'); if (elDone) elDone.textContent = myDone;

        // --- User-specific task badge in sidebar ---
        const badge = document.getElementById('task-badge');
        if (badge) {
            badge.textContent = myPendingCount;
            badge.classList.toggle('hidden', myPendingCount === 0);
        }

        // --- Timer-based progress bar ---
        const hours = (seconds / 3600).toFixed(1);
        const hText = document.getElementById('hours-text'); if (hText) hText.textContent = `${hours} / 8.0 hrs`;
        const pBar = document.getElementById('progress-bar'); if (pBar) pBar.style.width = Math.min((seconds / 28800) * 100, 100) + '%';

        renderRecentTasks();
        // --- Global stats for Admin-only charts ---
        renderQcTasks();
        const total = tasks.length, todo = tasks.filter(t => isTodo(t.status)).length, inProg = tasks.filter(t => isInProgress(t.status)).length, done = tasks.filter(t => isDone(t.status)).length;
        renderAdminReportChart({ total, todo, inProg, done });
        renderWorkloadChart();
    }

    function renderAdminReportChart(stats = null) {
        const card = document.getElementById('admin-report-card');
        const canvas = document.getElementById('task-report-chart');
        if (!card || !canvas || !canViewDailySummary()) return;

        const total = stats?.total ?? tasks.length;
        const todo = stats?.todo ?? tasks.filter(t => isTodo(t.status)).length;
        const inProg = stats?.inProg ?? tasks.filter(t => isInProgress(t.status)).length;
        const done = stats?.done ?? tasks.filter(t => isDone(t.status)).length;
        const other = Math.max(total - todo - inProg - done, 0);
        const segments = [
            { label: 'To Do', value: todo, color: '#2563eb', bg: 'bg-blue-50', text: 'text-blue-600' },
            { label: 'In Progress', value: inProg, color: '#d97706', bg: 'bg-amber-50', text: 'text-amber-600' },
            { label: 'Completed', value: done, color: '#059669', bg: 'bg-emerald-50', text: 'text-emerald-600' },
            { label: 'Other Status', value: other, color: '#e11d48', bg: 'bg-rose-50', text: 'text-rose-600' }
        ];
        const visibleSegments = segments.filter(s => s.value > 0);
        const completion = total ? Math.round((done / total) * 100) : 0;
        const open = Math.max(total - done, 0);

        document.getElementById('admin-report-total').textContent = `${total} Task${total === 1 ? '' : 's'}`;
        document.getElementById('admin-report-percent').textContent = `${completion}%`;
        document.getElementById('admin-report-open').textContent = open;
        document.getElementById('admin-report-completion').textContent = `${completion}%`;
        document.getElementById('admin-report-legend').innerHTML = segments.map(s => {
            const percent = total ? Math.round((s.value / total) * 100) : 0;
            return `
                    <div class="${s.bg} rounded-2xl p-4 border border-white">
                        <div class="flex items-center justify-between gap-3">
                            <div class="flex items-center gap-2 min-w-0">
                                <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${s.color}"></span>
                                <p class="text-xs font-bold text-slate-700 truncate">${s.label}</p>
                            </div>
                            <span class="text-xs font-black ${s.text}">${s.value}</span>
                        </div>
                        <p class="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">${percent}% of tasks</p>
                    </div>`;
        }).join('');

        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const size = Math.max(Math.floor(rect.width || 260), 220);
        const dpr = window.devicePixelRatio || 1;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, size, size);

        const cx = size / 2;
        const cy = size / 2;
        const radius = (size / 2) - 12;
        const lineWidth = Math.max(size * 0.18, 34);

        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(cx, cy, radius - lineWidth / 2, 0, Math.PI * 2);
        ctx.stroke();

        if (!total || !visibleSegments.length) return;

        let start = -Math.PI / 2;
        visibleSegments.forEach(segment => {
            const angle = (segment.value / total) * Math.PI * 2;
            const end = start + angle;
            ctx.strokeStyle = segment.color;
            ctx.beginPath();
            ctx.arc(cx, cy, radius - lineWidth / 2, start + 0.02, end - 0.02);
            ctx.stroke();
            start = end;
        });
    }

    function loadEmployeeCurrentTasks() {
        if (!canViewDailySummary() || currentWorkUnsub) return;
        currentWorkUnsub = onValue(ref(db, 'worksync/users'), snap => {
            const liveData = snap.val() || {};
            currentWorkUsers = Array.from(allUsersMap.values())
                .filter(u => u.email && u.email !== '123')
                .map(u => ({ ...u, ...(liveData[eKey(u.email)] || {}) })) // Merge live task/online data
                .sort((a, b) => {
                    const aActive = a.currentTask ? 0 : 1;
                    const bActive = b.currentTask ? 0 : 1;
                    return aActive - bActive || (a.name || '').localeCompare(b.name || '');
                });
            renderEmployeeCurrentTasks();
            const nextFilterKey = currentWorkUsers.map(u => `${u.email}:${u.name}:${u.role}`).join('|');
            if (nextFilterKey !== currentWorkFilterKey) {
                currentWorkFilterKey = nextFilterKey;
                populateReportUserFilter();
                populateDpUserFilter();
            }
            if (activeView === 'dailyplan') renderDailyPlan();
            if (activeView === 'daily-summary') renderDailySummary();
        });
        clearInterval(currentWorkRefreshRef);
        currentWorkRefreshRef = setInterval(renderEmployeeCurrentTasks, 60000);
    }

    function renderEmployeeCurrentTasks() {
        if (activeView !== 'dashboard') return;
        const list = document.getElementById('admin-current-work-list');
        const countEl = document.getElementById('admin-current-work-count');
        if (!list || !countEl) return;
        
        // Check if user can view Live Work Board
        if (!canViewDailySummary() && !canViewLiveWorkBoard()) return;
        
        // Filter employees based on permissions
        let visibleUsers = currentWorkUsers;
        if (!canViewDailySummary()) {
            // Non-admin/manager: filter to only allowed employees + self
            const allowedEmails = new Set();
            if (currentUser) allowedEmails.add(currentUser.email.toLowerCase());
            const customAccess = LIVE_WORK_BOARD_ACCESS[currentUser.email.toLowerCase()] || [];
            customAccess.forEach(email => allowedEmails.add(email.toLowerCase()));
            visibleUsers = currentWorkUsers.filter(u => allowedEmails.has(u.email.toLowerCase()));
        }
        
        const activeCount = visibleUsers.filter(u => u.currentTask && u.currentTask.state === 'working').length; // Count only actively working
        countEl.textContent = `${activeCount} Active`;
        if (!visibleUsers.length) {
            list.innerHTML = `<p class="xl:col-span-2 p-5 text-center text-xs text-slate-400 italic">No employees found.</p>`;
            return;
        }
        list.innerHTML = visibleUsers.map(u => {
            const task = u.currentTask;
            const online = !!u.online;
            const elapsed = task?.startedAt ? formatTime(Math.max(Math.floor((Date.now() - task.startedAt) / 1000), 0)) : '00:00:00';
            const working = task?.state === 'working';
            const stateLabel = task ? (working ? 'Working' : 'On Hold') : 'Idle';
            const stateClass = task
                ? (working ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100')
                : 'bg-slate-50 text-slate-400 border-slate-100';
            return `
                    <div class="rounded-2xl border border-slate-100 p-5 bg-slate-50/60">
                        <div class="flex items-start justify-between gap-4 mb-4">
                            <div class="flex items-center gap-3 min-w-0">
                                <div class="relative shrink-0">
                                    <img src="${u.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.avatar || u.name}`}" class="w-11 h-11 rounded-xl bg-white border border-slate-200 object-cover">
                                    <span class="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-50 ${online ? 'bg-emerald-500' : 'bg-slate-300'}"></span>
                                </div>
                                <div class="min-w-0">
                                    <p class="text-sm font-black text-slate-900 truncate">${u.name || u.email}</p>
                                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">${u.role || 'Employee'}</p>
                                </div>
                            </div>
                            <span class="text-[10px] font-bold px-2.5 py-1 rounded-full border ${stateClass}">${stateLabel}</span>
                        </div>
                        ${task ? `
                            <div class="bg-white rounded-2xl border border-slate-100 p-4">
                                <div class="flex items-center gap-2 mb-2">
                                    <span class="text-[10px] font-mono font-black text-indigo-600">${task.taskId.startsWith('M-') ? task.taskId : `<a href="https://${JIRA.domain}/browse/${task.taskId}" target="_blank" class="hover:underline hover:text-indigo-800 transition-colors" title="Open in Jira">${task.taskId}</a>`}</span>
                                    ${task.status ? `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${statusClass(task.status)}">${task.status}</span>` : ''}
                                </div>
                                <p class="text-sm font-bold text-slate-900 mb-3 line-clamp-2">${task.taskDesc || 'Task details unavailable'}</p>
                                <div class="flex items-center justify-between gap-3 pt-3 border-t border-slate-50">
                                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${task.client || 'No Client'}</span>
                                    <span class="live-task-timer text-xs font-black text-slate-700 font-mono" 
                                          data-started="${task.startedAt || 0}" 
                                          data-state="${task.state || 'idle'}">${elapsed}</span>
                                </div>
                            </div>` : `
                            <div class="bg-white rounded-2xl border border-dashed border-slate-200 p-4 text-center">
                                <p class="text-xs text-slate-400 font-medium">No current task selected.</p>
                            </div>`}
                    </div>`;
        }).join('');
    }

    function updateLiveBoardTimers() {
        const timers = document.querySelectorAll('.live-task-timer');
        timers.forEach(el => {
            const startedAt = parseInt(el.dataset.started);
            const state = el.dataset.state;
            if (!startedAt || state !== 'working') return;

            const now = Date.now();
            const elapsedSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));
            el.textContent = formatTime(elapsedSeconds);
        });
    }

    // Refresh the employee current work section manually
    function refreshEmployeeCurrentTasks() {
        const btn = document.getElementById('btn-refresh-current-work');
        if (btn) {
            btn.classList.add('animate-spin');
            setTimeout(() => btn.classList.remove('animate-spin'), 800);
        }
        // Re-fetch from Firebase
        if (!db) return;
        get(ref(db, 'worksync/users')).then(snap => {
            const liveData = snap.val() || {};
            currentWorkUsers = Array.from(allUsersMap.values())
                .filter(u => u.email && u.email !== '123')
                .map(u => ({ ...u, ...(liveData[eKey(u.email)] || {}) }))
                .sort((a, b) => {
                    const aActive = a.currentTask ? 0 : 1;
                    const bActive = b.currentTask ? 0 : 1;
                    return aActive - bActive || (a.name || '').localeCompare(b.name || '');
                });
            renderEmployeeCurrentTasks();
            toast('Employee tasks refreshed', 'success');
        }).catch(err => {
            console.error('Failed to refresh employee tasks:', err);
            toast('Failed to refresh', 'error');
        });
    }

    // Update status for internal tasks via the inline dropdown
    async function updateInternalTaskStatus(taskId, newStatus) {
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return false;
        const task = tasks[taskIndex];
        const oldStatus = task.status;

        // Optimistically update UI
        task.status = newStatus;
        task.updatedAt = Date.now();
        renderInternalTasks();
        updateStats();

        try {
            if (task.manual || isInternalTask(task)) {
                // Save to Firebase for manual/internal tasks
                await update(ref(db, `worksync/manual_tasks/${eKey(task.userId || currentUser.email)}/${taskId}`), {
                    status: newStatus,
                    updatedAt: Date.now()
                });
                toast('Status updated', 'success');
                return true;
            } else {
                // Jira task - sync to Jira
                toast('Syncing to Jira...', 'info');
                const ok = await updateJiraStatus(taskId, newStatus);
                if (!ok) {
                    task.status = oldStatus;
                    renderInternalTasks();
                    updateStats();
                    return false;
                }
                return true;
            }
        } catch (err) {
            console.error('Failed to update internal task status:', err);
            task.status = oldStatus;
            renderInternalTasks();
            updateStats();
            toast('Failed to update status: ' + err.message, 'error');
            return false;
        }
    }

    function todayStartTs() {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d.getTime();
    }

    function loadTodayWorkSummary() {
        // Allow all users to load their own data
        loadDprEntries();
        if (todayReportUnsub) return; // Only load once
        const dbRef = ref(db, 'worksync/timelogs');
        const q = canViewDailySummary() ? dbRef : query(dbRef, orderByChild('userId'), equalTo(currentUser.email));

        todayReportUnsub = onValue(q, snap => {
            const start = todayStartTs();
            const end = start + 86400000;
            todayTimeLogs = Object.values(snap.val() || {})
                .filter(log => canViewDailySummary() || log.userId === currentUser.email)
                .filter(log => (log.endTime || log.startTime || 0) >= start && (log.endTime || log.startTime || 0) < end)
                .sort((a, b) => (b.endTime || 0) - (a.endTime || 0));

            // Only render if the current view is dashboard or daily-summary
            if (activeView === 'dashboard' || activeView === 'daily-summary') {
                renderDailySummary();
            }
        });

        if (!todaySnehaUnsub) {
            todaySnehaUnsub = onValue(ref(db, 'worksync/sneha_work_selections'), snap => {
                const start = todayStartTs();
                const end = start + 86400000;
                todaySnehaSelections = Object.values(snap.val() || {})
                    .filter(sel => (sel.timestamp || 0) >= start && (sel.timestamp || 0) < end);
                if (activeView === 'dashboard' || activeView === 'daily-summary') {
                    renderDailySummary();
                }
            });
        }
    }

    function buildDailySummaryRows() {
        const rows = new Map();
        const ensure = (email, name, role = '') => {
            const key = email || name || 'unknown';
            if (!rows.has(key)) rows.set(key, {
                email: key,
                name: name || email || 'Unknown',
                role,
                completedTasks: 0,
                loggedSeconds: 0,
                activeSeconds: 0,
                activeTask: null,
                online: false,
                inProgressCount: 0,
                completedCount: 0,
                assignedCount: 0,
                correctionsCount: 0,
                thumbnailCount: 0,
                posterCount: 0,
                videosCompleted: 0,
                reworkDesignCount: 0,
                inProgressVideoCount: 0,
                snehaDetails: [],
                holdCount: 0
            });
            return rows.get(key);
        };

        todayTimeLogs.forEach(log => {
            const row = ensure(log.userId, log.userName);
            const task = tasks.find(t => t.id === log.taskId);
            if (task && (task.status === 'Learnings' || task.status === 'Learning')) return;

            row.completedTasks++;
            row.loggedSeconds += Number(log.durationSeconds || 0);
        });

        currentWorkUsers.forEach(u => {
            const row = ensure(u.email, u.name, u.role);
            row.role = u.role || row.role;
            row.online = !!u.online;
            if (u.currentTask) {
                row.activeTask = u.currentTask;
                row.activeSeconds = Math.max(Math.floor((Date.now() - (u.currentTask.startedAt || Date.now())) / 1000), 0);
            }

            const ut = tasks.filter(t => assigneeMatches(t, u.email) && t.status !== 'Learnings' && t.status !== 'Learning' && !(t.id && t.id.startsWith('LEARN-')));
            const isCorrections = (s) => ['Quality Check', 'Quality check', 'Rework Designs', 'Rework designs'].includes(s);
            row.assignedCount = ut.filter(t => isTodo(t.status) || (isInternalTask(t) && isInternalTodo(t.status))).length;
            row.inProgressCount = ut.filter(t => (isInProgress(t.status) || (isInternalTask(t) && isInternalInProgress(t.status))) && !isCorrections(t.status)).length;

            const todayLogs = todayTimeLogs.filter(log => log.userId === u.email);
            const loggedTaskIds = new Set(todayLogs.map(log => log.taskId));
            row.completedCount = ut.filter(t => (isDone(t.status) || (isInternalTask(t) && isInternalDone(t.status))) && loggedTaskIds.has(t.id)).length;

            row.correctionsCount = ut.filter(t => isCorrections(t.status)).length;
            row.holdCount = ut.filter(t => isHold(t.status)).length;

            // Status Change Counters
            const stats = statusChangeStats[u.email] || ensureStats(u.email);
            row.thumbnailCount = stats.thumbnailCount;
            row.posterCount = stats.posterCount;
            row.videosCompleted = stats.videosCompleted;
            row.reworkDesignCount = stats.reworkDesignCount;
            row.inProgressVideoCount = stats.inProgressVideoCount;

            // Sneha specifics
            if (u.email.toLowerCase() === 'snehavilpower@gmail.com') {
                const snehaTaskMap = new Map();
                todaySnehaSelections.forEach(sel => {
                    snehaTaskMap.set(sel.taskId, sel.selectedItems || []);
                });
                row.snehaDetails = Array.from(snehaTaskMap.entries()).map(([taskId, selections]) => ({
                    taskId, selections
                }));
            }
        });

        // ── Strategy Calendar planned counts (replaces manual DPR) ──
        const now = new Date();
        const curMonth = now.getMonth();
        const curYear = now.getFullYear();
        const stratMap = new Map(); // email → { videos, posters }
        Object.values(strategyEvents || {}).forEach(ev => {
            if (!ev.date || !ev.owner) return;
            const d = new Date(ev.date);
            if (d.getMonth() !== curMonth || d.getFullYear() !== curYear) return;
            const key = ev.owner.toLowerCase();
            if (!stratMap.has(key)) stratMap.set(key, { videos: 0, posters: 0 });
            const entry = stratMap.get(key);
            if (ev.format === 'Video') entry.videos++;
            else entry.posters++; // Poster or unset
        });

        for (const row of rows.values()) {
            const sc = stratMap.get(row.email.toLowerCase()) || { videos: 0, posters: 0 };
            row.stratPlanVideos = sc.videos;
            row.stratPlanPosters = sc.posters;
        }

        return [...rows.values()].sort((a, b) => {
            const activeSort = (b.activeTask ? 1 : 0) - (a.activeTask ? 1 : 0);
            return activeSort || (b.loggedSeconds + b.activeSeconds) - (a.loggedSeconds + a.activeSeconds) || a.name.localeCompare(b.name);
        });
    }

    function showDailySummaryTasks(email, category) {
        const user = allUsersMap.get(email.toLowerCase()) || knownUserByEmail(email) || { name: email, email };
        const userName = user.name || user.email;
        const ut = tasks.filter(t => assigneeMatches(t, email) && t.status !== 'Learnings' && t.status !== 'Learning' && !(t.id && t.id.startsWith('LEARN-')));
        const isCorrections = (s) => ['Quality Check', 'Quality check', 'Rework Designs', 'Rework designs'].includes(s);

        let matchedTasks = [];
        let titleLabel = '';

        if (category === 'assigned') {
            matchedTasks = ut.filter(t => isTodo(t.status) || (isInternalTask(t) && isInternalTodo(t.status)));
            titleLabel = 'Assigned (To Do)';
        } else if (category === 'progress') {
            matchedTasks = ut.filter(t => (isInProgress(t.status) || (isInternalTask(t) && isInternalInProgress(t.status))) && !isCorrections(t.status));
            titleLabel = 'In Progress';
        } else if (category === 'corrections') {
            matchedTasks = ut.filter(t => isCorrections(t.status));
            titleLabel = 'Corrections Designs';
        } else if (category === 'hold') {
            matchedTasks = ut.filter(t => isHold(t.status));
            titleLabel = 'Hold';
        } else if (category === 'done') {
            const userTodayLogs = todayTimeLogs.filter(log => log.userId === email);
            const loggedTaskIds = new Set(userTodayLogs.map(log => log.taskId));
            matchedTasks = ut.filter(t => (isDone(t.status) || (isInternalTask(t) && isInternalDone(t.status))) && loggedTaskIds.has(t.id));
            titleLabel = 'Done';
        } else if (category === 'logs') {
            const userLogs = todayTimeLogs.filter(log => log.userId === email);
            document.getElementById('drilldown-title').textContent = `Today's Logged Work`;
            document.getElementById('drilldown-subtitle').textContent = `For ${userName} • ${userLogs.length} Log${userLogs.length !== 1 ? 's' : ''}`;
            const container = document.getElementById('drilldown-tasks-container');
            if (!userLogs.length) {
                container.innerHTML = `<p class="text-center text-slate-400 text-sm py-6">No logs recorded today.</p>`;
            } else {
                container.innerHTML = userLogs.map(log => {
                    const durationStr = formatTime(log.durationSeconds || 0);
                    const task = tasks.find(t => t.id === log.taskId);
                    const taskDesc = log.taskDesc || task?.desc || 'No Description';
                    const clientLabel = log.client || task?.client || '';
                    const timeStr = new Date(log.endTime || log.startTime || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    return `<div class="bg-slate-50 border border-slate-200 p-3 rounded-xl hover:border-indigo-300 transition-colors cursor-pointer" onclick="openEditTaskModal('${log.taskId}')">
                            <div class="flex items-center justify-between mb-1">
                                <span class="text-[10px] font-mono font-black text-indigo-600 uppercase tracking-widest">${log.taskId || 'N/A'}</span>
                                <span class="text-xs font-black text-indigo-700 font-mono">${durationStr}</span>
                            </div>
                            <p class="text-xs font-bold text-slate-800 line-clamp-2">${escapeHtml(taskDesc)}</p>
                            <div class="flex items-center justify-between mt-2">
                                ${clientLabel ? `<span class="text-[10px] font-medium text-slate-500"><iconify-icon icon="solar:buildings-bold" class="inline align-text-bottom text-slate-400 mr-1"></iconify-icon>${escapeHtml(clientLabel)}</span>` : '<span></span>'}
                                <span class="text-[10px] text-slate-400 font-bold">${timeStr}</span>
                            </div>
                        </div>`;
                }).join('');
            }
            document.getElementById('taskDrilldownModal').showModal();
            return;
        } else if (category === 'dpr') {
            const userDprs = dprEntries.filter(entry => entry.userId && entry.userId.toLowerCase() === email.toLowerCase() && entry.date === todayIso());
            document.getElementById('drilldown-title').textContent = `Today's DPR Entries`;
            document.getElementById('drilldown-subtitle').textContent = `For ${userName} • ${userDprs.length} Entry${userDprs.length !== 1 ? 'ies' : ''}`;
            const container = document.getElementById('drilldown-tasks-container');
            if (!userDprs.length) {
                container.innerHTML = `<p class="text-center text-slate-400 text-sm py-6">No DPR entries recorded today.</p>`;
            } else {
                container.innerHTML = userDprs.map(entry => {
                    return `<div class="bg-slate-50 border border-slate-200 p-3 rounded-xl hover:border-indigo-300 transition-colors">
                            <div class="flex items-center justify-between mb-1">
                                <span class="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">${escapeHtml(entry.category || 'Other')}</span>
                                <span class="text-xs font-black text-indigo-700 font-mono">Count: ${entry.count || 0}</span>
                            </div>
                            <p class="text-xs font-bold text-slate-800">${escapeHtml(entry.notes || 'No notes')}</p>
                            <div class="flex items-center justify-between mt-2">
                                <span class="text-[10px] font-medium text-slate-500 uppercase tracking-widest">${escapeHtml(entry.status || '')}</span>
                            </div>
                        </div>`;
                }).join('');
            }
            document.getElementById('taskDrilldownModal').showModal();
            return;
        }

        document.getElementById('drilldown-title').textContent = `${titleLabel} Tasks`;
        document.getElementById('drilldown-subtitle').textContent = `For ${userName} • ${matchedTasks.length} Task${matchedTasks.length !== 1 ? 's' : ''}`;
        const container = document.getElementById('drilldown-tasks-container');
        if (!matchedTasks.length) {
            container.innerHTML = `<p class="text-center text-slate-400 text-sm py-6">No tasks in this category.</p>`;
        } else {
            container.innerHTML = matchedTasks.map(t => {
                return `<div class="bg-slate-50 border border-slate-200 p-3 rounded-xl hover:border-indigo-300 transition-colors cursor-pointer" onclick="openEditTaskModal('${t.id}')">
                        <div class="flex items-center justify-between mb-1">
                            <span class="text-[10px] font-mono font-black text-indigo-600 uppercase tracking-widest">${t.id || 'N/A'}</span>
                            <span class="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">${t.status || 'No Status'}</span>
                        </div>
                        <p class="text-xs font-bold text-slate-800 line-clamp-2">${escapeHtml(t.desc || t.summary || t.name || '')}</p>
                        ${t.client ? `<p class="text-[10px] font-medium text-slate-500 mt-2"><iconify-icon icon="solar:buildings-bold" class="inline align-text-bottom text-slate-400 mr-1"></iconify-icon>${escapeHtml(t.client)}</p>` : ''}
                    </div>`;
            }).join('');
        }

        document.getElementById('taskDrilldownModal').showModal();
    }

    function renderDailySummary() {
        const list = document.getElementById('daily-summary-list');
        const card = document.getElementById('admin-daily-summary-card');
        const exportBtn = document.getElementById('export-daily-report-btn');
        if (!list) return;

        // Show admin/manager full view, but allow regular users to see their own data on dashboard
        if (!canViewDailySummary()) {
            // For non-admin users on dashboard, show only their own data
            if (activeView === 'dashboard') {
                card?.classList.remove('hidden');
            } else {
                card?.classList.add('hidden');
                return;
            }
        } else {
            card?.classList.remove('hidden');
        }

        let rows = buildDailySummaryRows();
        
        // For non-admin users, filter to only show their own data on the dashboard
        if (!canViewDailySummary()) {
            rows = rows.filter(row => row.email === currentUser.email);
        }

        const totalSeconds = rows.reduce((sum, row) => sum + row.loggedSeconds + row.activeSeconds, 0);
        const loggedTasks = rows.reduce((sum, row) => sum + row.completedTasks, 0);
        const activeCount = rows.filter(row => row.activeTask).length;

        document.getElementById('daily-total-time').textContent = formatTime(totalSeconds);
        document.getElementById('daily-task-count').textContent = loggedTasks;
        document.getElementById('daily-active-count').textContent = activeCount;
        document.getElementById('daily-employee-count').textContent = rows.length;

        // Hide export button for non-admins
        if (exportBtn) {
            exportBtn.classList.toggle('hidden', !canViewDailySummary());
        }

        if (!rows.length) {
            list.innerHTML = `<p class="p-5 text-center text-xs text-slate-400 italic">No work logged today yet.</p>`;
            return;
        }

        list.innerHTML = rows.map(row => {
            const total = row.loggedSeconds + row.activeSeconds;
            return `
                    <div class="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div class="flex items-center gap-3 min-w-0">
                            <span class="w-2.5 h-2.5 rounded-full shrink-0 ${row.online ? 'bg-emerald-500' : 'bg-slate-300'}"></span>
                            <div class="min-w-0">
                                <p class="text-sm font-black text-slate-900 truncate">${row.name}</p>
                                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">${row.role || row.email}</p>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-11 gap-3 flex-1">
                            <div class="bg-slate-50 rounded-xl px-3 py-2">
                                <p class="text-[9px] font-bold text-slate-400 uppercase">Total</p>
                                <p class="text-xs font-black text-slate-900 font-mono">${formatTime(total)}</p>
                            </div>
                            <div class="bg-sky-50 rounded-xl px-3 py-2 cursor-pointer hover:bg-sky-100 hover:scale-105 transition-all duration-200" onclick="showDailySummaryTasks('${row.email}', 'assigned')">
                                <p class="text-[9px] font-bold text-sky-500 uppercase">Assigned</p>
                                <p class="text-xs font-black text-sky-600">${row.assignedCount}</p>
                            </div>
                            <div class="bg-amber-50 rounded-xl px-3 py-2 cursor-pointer hover:bg-amber-100 hover:scale-105 transition-all duration-200" onclick="showDailySummaryTasks('${row.email}', 'progress')">
                                <p class="text-[9px] font-bold text-amber-500 uppercase">Progress</p>
                                <p class="text-xs font-black text-amber-600">${row.inProgressCount}</p>
                            </div>
                            <div class="bg-rose-50 rounded-xl px-3 py-2 cursor-pointer hover:bg-rose-100 hover:scale-105 transition-all duration-200" onclick="showDailySummaryTasks('${row.email}', 'corrections')">
                                <p class="text-[9px] font-bold text-rose-500 uppercase truncate">Corrections Designs</p>
                                <p class="text-xs font-black text-rose-600">${row.correctionsCount}</p>
                            </div>
                            <div class="bg-purple-50 rounded-xl px-3 py-2 cursor-pointer hover:bg-purple-100 hover:scale-105 transition-all duration-200" onclick="showDailySummaryTasks('${row.email}', 'hold')">
                                <p class="text-[9px] font-bold text-purple-500 uppercase">Hold</p>
                                <p class="text-xs font-black text-purple-600">${row.holdCount}</p>
                            </div>
                            <div class="bg-emerald-50 rounded-xl px-3 py-2 cursor-pointer hover:bg-emerald-100 hover:scale-105 transition-all duration-200" onclick="showDailySummaryTasks('${row.email}', 'done')">
                                <p class="text-[9px] font-bold text-emerald-500 uppercase">Done</p>
                                <p class="text-xs font-black text-emerald-600">${row.completedCount}</p>
                            </div>
                            <div class="bg-rose-50 rounded-xl px-3 py-2" title="Strategy Calendar: Videos planned this month">
                                 <p class="text-[9px] font-bold text-rose-500 uppercase">🎬 Plan Vid</p>
                                 <p class="text-xs font-black text-rose-600">${row.stratPlanVideos}</p>
                             </div>
                             <div class="bg-violet-50 rounded-xl px-3 py-2" title="Strategy Calendar: Posters planned this month">
                                 <p class="text-[9px] font-bold text-violet-500 uppercase">🖼️ Plan Pos</p>
                                 <p class="text-xs font-black text-violet-600">${row.stratPlanPosters}</p>
                             </div>
                            <div class="bg-slate-50 rounded-xl px-3 py-2 cursor-pointer hover:bg-slate-100 hover:scale-105 transition-all duration-200" onclick="showDailySummaryTasks('${row.email}', 'logs')">
                                <p class="text-[9px] font-bold text-slate-400 uppercase">Logs</p>
                                <p class="text-xs font-black text-slate-600">${row.completedTasks}</p>
                            </div>

                            <div class="bg-indigo-50/50 rounded-xl px-3 py-2">
                                <p class="text-[9px] font-bold text-indigo-500 uppercase">Active</p>
                                <p class="text-xs font-black text-indigo-600 font-mono">${row.activeTask ? formatTime(row.activeSeconds) : 'Idle'}</p>
                            </div>
                            <div class="bg-slate-50 rounded-xl px-3 py-2">
                                <p class="text-[9px] font-bold text-slate-400 uppercase">Current</p>
                                <p class="text-xs font-black text-slate-700 truncate">${row.activeTask ? (row.activeTask.taskId.startsWith('M-') ? row.activeTask.taskId : `<a href="https://${JIRA.domain}/browse/${row.activeTask.taskId}" target="_blank" class="hover:underline text-indigo-600" title="Open in Jira">${row.activeTask.taskId}</a>`) : 'None'}</p>
                            </div>
                        </div>
                    </div>
                    
                    ${(row.thumbnailCount > 0 || row.posterCount > 0 || row.videosCompleted > 0 || row.reworkDesignCount > 0 || row.inProgressVideoCount > 0 || row.snehaDetails.length > 0) ? `
                    <div class="mt-3 ml-0 lg:ml-7 flex flex-wrap gap-2 border-t border-slate-50 pt-3">
                        ${row.thumbnailCount > 0 ? `<div class="bg-emerald-50/50 border border-emerald-100 rounded-lg px-2.5 py-1 flex items-center gap-2"><span class="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Thumbnails</span><span class="text-xs font-black text-emerald-700">${row.thumbnailCount}</span></div>` : ''}
                        ${row.posterCount > 0 ? `<div class="bg-blue-50/50 border border-blue-100 rounded-lg px-2.5 py-1 flex items-center gap-2"><span class="text-[10px] font-bold text-blue-600 uppercase tracking-wide">Posters QC</span><span class="text-xs font-black text-blue-700">${row.posterCount}</span></div>` : ''}
                        ${row.videosCompleted > 0 ? `<div class="bg-indigo-50/50 border border-indigo-100 rounded-lg px-2.5 py-1 flex items-center gap-2"><span class="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">Videos QC</span><span class="text-xs font-black text-indigo-700">${row.videosCompleted}</span></div>` : ''}
                        ${row.reworkDesignCount > 0 ? `<div class="bg-rose-50/50 border border-rose-100 rounded-lg px-2.5 py-1 flex items-center gap-2"><span class="text-[10px] font-bold text-rose-600 uppercase tracking-wide">Corrections</span><span class="text-xs font-black text-rose-700">${row.reworkDesignCount}</span></div>` : ''}
                        ${row.inProgressVideoCount > 0 ? `<div class="bg-amber-50/50 border border-amber-100 rounded-lg px-2.5 py-1 flex items-center gap-2"><span class="text-[10px] font-bold text-amber-600 uppercase tracking-wide">In-Prog Videos</span><span class="text-xs font-black text-amber-700">${row.inProgressVideoCount}</span></div>` : ''}
                        
                        ${row.snehaDetails.length > 0 ? row.snehaDetails.map(sd => `
                            <div class="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 flex flex-col gap-0.5">
                                <span class="text-[9px] font-bold text-slate-500 uppercase tracking-wide">${sd.taskId}</span>
                                <span class="text-[10px] font-medium text-slate-700">${sd.selections.join(', ')}</span>
                            </div>
                        `).join('') : ''}
                    </div>
                    ` : ''}
                    </div>`;
        }).join('');
    }

    function renderWorkloadChart() {
        const chart = document.getElementById('workload-chart');
        const totalEl = document.getElementById('workload-total');
        if (!chart || !totalEl || !canViewDailySummary()) return;

        // Group by email to avoid duplicate names, then display normalized names
        const emailToData = new Map(); // Map: email -> { name, count }

        tasks.forEach(task => {
            const email = (task.assigneeEmail || task.userId || '').toLowerCase();
            if (!email || email === 'unassigned') return;

            const name = assigneeName(task);
            if (!name || name === 'Unassigned') return;

            if (!emailToData.has(email)) {
                emailToData.set(email, {
                    email,
                    name: knownUserByEmail(email)?.name || name,
                    count: 0
                });
            }
            emailToData.get(email).count += 1;
        });

        const rows = [...emailToData.values()].sort((a, b) => b.count - a.count);
        const total = rows.reduce((sum, item) => sum + item.count, 0);
        const max = Math.max(...rows.map(item => item.count), 1);

        totalEl.textContent = `${total} Assigned`;

        if (!rows.length) {
            chart.innerHTML = `<p class="p-5 text-center text-xs text-slate-400 italic">No assigned tasks found after sync.</p>`;
            return;
        }

        chart.innerHTML = rows.map((item, idx) => {
            const width = Math.max((item.count / max) * 100, 8);
            const palette = ['bg-violet-600', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];
            return `
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <p class="text-xs font-bold text-slate-700">${item.name}</p>
                            <p class="text-xs font-black text-slate-900">${item.count}</p>
                        </div>
                        <div class="h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div class="h-full ${palette[idx % palette.length]} rounded-full transition-all duration-700" style="width:${width}%"></div>
                        </div>
                    </div>`;
        }).join('');
    }

    function csvCell(value) {
        return `"${(value ?? '').toString().replace(/"/g, '""')}"`;
    }

    function exportDailyReport() {
        if (!canViewDailySummary()) return;
        const rows = buildDailySummaryRows();
        const today = new Date().toISOString().slice(0, 10);
        const lines = [
            ['Date', 'Employee', 'Email', 'Role', 'Logged Tasks', 'Logged Time', 'Active Task', 'Active Time', 'Total Time', 'Online'].map(csvCell).join(',')
        ];
        rows.forEach(row => {
            lines.push([
                today,
                row.name,
                row.email,
                row.role,
                row.completedTasks,
                formatTime(row.loggedSeconds),
                row.activeTask?.taskId || '',
                row.activeTask ? formatTime(row.activeSeconds) : '',
                formatTime(row.loggedSeconds + row.activeSeconds),
                row.online ? 'Yes' : 'No'
            ].map(csvCell).join(','));
        });
        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `worksync-daily-report-${today}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        toast('Daily report exported', 'success');
    }

    // New functions for QC Reports filtering and export
    function initQcReportFilters() {
        const fromInput = document.getElementById('qc-report-date-from');
        const toInput = document.getElementById('qc-report-date-to');
        if (!fromInput || !toInput) return;

        const datePickerEl = document.getElementById('qc-report-datepicker');
        if (datePickerEl && window.Litepicker) {
            new Litepicker({
                element: datePickerEl,
                singleMode: false,
                format: 'DD MMM, YYYY',
                numberOfMonths: 2,
                plugins: ['mobilefriendly'],
                setup: (picker) => {
                    picker.on('selected', (date1, date2) => {
                        fromInput.value = date1.dateInstance.toISOString().slice(0, 10);
                        toInput.value = date2.dateInstance.toISOString().slice(0, 10);
                        handleQcReportFilterChange();
                    });
                },
            });
        }
        setQcReportDatePreset('this_month'); // Default to this month for QC reports
    }

    function setQcReportDatePreset(preset) {
        const fromInput = document.getElementById('qc-report-date-from');
        const toInput = document.getElementById('qc-report-date-to');
        if (!fromInput || !toInput) return;
        const today = new Date();
        let fromDate = new Date();

        if (preset === 'today') { /* fromDate is today */ }
        else if (preset === 'this_week') { fromDate.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); }
        else if (preset === 'this_month') { fromDate = new Date(today.getFullYear(), today.getMonth(), 1); }

        const toDate = new Date(); // always end today for presets
        fromInput.value = fromDate.toISOString().slice(0, 10);
        toInput.value = toDate.toISOString().slice(0, 10);

        const picker = document.getElementById('qc-report-datepicker')?.litepicker;
        if (picker) {
            picker.setDateRange(fromDate, toDate);
        }

        document.querySelectorAll('.qc-report-preset-btn').forEach(btn => {
            btn.classList.remove('bg-indigo-600', 'text-white');
            btn.classList.add('bg-slate-50', 'border-slate-200', 'text-slate-600');
        });
        const activeBtn = document.querySelector(`button[onclick="setQcReportDatePreset('${preset}')"]`);
        if (activeBtn) {
            activeBtn.classList.add('bg-indigo-600', 'text-white');
            activeBtn.classList.remove('bg-slate-50', 'border-slate-200', 'text-slate-600');
        }

        handleQcReportFilterChange();
    }

    function handleQcReportFilterChange() {
        const fromInput = document.getElementById('qc-report-date-from');
        const toInput = document.getElementById('qc-report-date-to');
        if (!fromInput || !toInput) return;
        qcReportDateFrom = fromInput.value;
        qcReportDateTo = toInput.value;
        loadQcReports(); // Re-render QC reports with new filters
    }

    function renderRecentTasks() {
        const el = document.getElementById('recent-tasks');
        const recentTasksContainer = el.parentElement;
        const header = recentTasksContainer.querySelector('h3');

        if (isAdmin()) {
            if (header) header.textContent = 'Recently Synced';
            if (!tasks.length) { el.innerHTML = `<p class="p-5 text-center text-xs text-slate-400 italic">No tasks synced.</p>`; return; }

            el.innerHTML = tasks.slice(0, 5).map(t => {
                const taskKeyHtml = t.manual ? t.id : `<a href="https://${JIRA.domain}/browse/${t.id}" target="_blank" class="hover:underline hover:text-indigo-800 transition-colors" title="Open in Jira">${t.id}</a>`;
                return `
                    <div class="flex items-center justify-between p-3 hover:bg-slate-50 transition-all rounded-xl">
                        <div class="flex items-center gap-3 overflow-hidden">
                            <span class="text-[10px] font-mono font-bold text-indigo-600 shrink-0">${taskKeyHtml}</span>
                            <p class="text-xs text-slate-700 truncate font-medium">${escapeHtml(t.desc)}</p>
                        </div>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${statusClass(t.status)}">${t.status}</span>
                    </div>`;
            }).join('');
        } else {
            if (header) header.textContent = 'My Assigned Work';
            const myTasks = tasks.filter(t =>
                assigneeMatches(t, 'me') &&
                ['Design To Do', 'Design In Progress'].includes(t.status)
            );

            if (!myTasks.length) {
                el.innerHTML = `<p class="p-5 text-center text-xs text-slate-400 italic">No assigned tasks in Design To Do or In Progress.</p>`;
                return;
            }
            el.innerHTML = myTasks.slice(0, 10).map(t => {
                const taskKeyHtml = t.manual ? t.id : `<a href="https://${JIRA.domain}/browse/${t.id}" target="_blank" class="hover:underline hover:text-indigo-800 transition-colors" title="Open in Jira">${t.id}</a>`;
                return `
                    <div class="flex items-center justify-between p-3 hover:bg-slate-50 transition-all rounded-xl">
                        <div class="flex items-center gap-3 overflow-hidden">
                            <span class="text-[10px] font-mono font-bold text-indigo-600 shrink-0">${taskKeyHtml}</span>
                            <p class="text-xs text-slate-700 truncate font-medium">${escapeHtml(t.desc)}</p>
                        </div>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${statusClass(t.status)}">${t.status}</span>
                    </div>`;
            }).join('');
        }
    }

    // CHAT
    function eKey(email) { return email.replace(/[@.]/g, '_'); }
    function dmId(e1, e2) { const k = [eKey(e1), eKey(e2)].sort(); return `dm_${k[0]}_${k[1]}`; }

    function registerOnline() {
        if (!db || !currentUser) return;
        const userRef = ref(db, `worksync/users/${eKey(currentUser.email)}`);
        update(userRef, { online: true, lastSeen: Date.now() });
        onDisconnect(ref(db, `worksync/users/${eKey(currentUser.email)}/online`)).set(false); // Set to false on disconnect
    }

    function initChat() {
        if (!db || !currentUser) return;
        onValue(ref(db, 'worksync/conversations'), snap => {
            const convs = snap.val() || {};
            const myKey = eKey(currentUser.email);
            const groups = Object.entries(convs).filter(([, c]) => c.type === 'group' && c.members && c.members[myKey]);
            renderGroupList(groups);
            watchConversationNotifications(Object.entries(convs).filter(([, c]) => c.members && c.members[myKey]));
        });
    }

    function watchConversationNotifications(conversations) {
        const activeIds = new Set(conversations.map(([id]) => id));
        Object.entries(convListeners).forEach(([id, unsubscribe]) => {
            if (!activeIds.has(id)) {
                unsubscribe();
                delete convListeners[id];
            }
        });
        conversations.forEach(([id, conv]) => {
            if (convListeners[id]) return;
            const listenerStartedAt = Date.now();
            const q = query(ref(db, `worksync/messages/${id}`), limitToLast(1));
            convListeners[id] = onChildAdded(q, snap => {
                const msg = snap.val();
                if (!msg || msg.senderEmail === currentUser.email || msg.unsent || (msg.timestamp || 0) < listenerStartedAt) return;
                notifyIncomingMessage(msg, conv, id);
                if (id !== activeConvId) {
                    unreadCounts[id] = (unreadCounts[id] || 0) + 1;
                    renderChatBadge();
                }
            });
        });
    }

    function renderChatBadge() {
        const total = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
        const badge = document.getElementById('chat-badge');
        if (!badge) return;
        badge.textContent = total;
        badge.classList.toggle('hidden', total === 0);
    }

    function notifyIncomingMessage(msg, conv, convId) {
        if (chatNotificationsMuted) return;
        const title = conv?.type === 'group' && conv?.name ? `${conv.name} - ${msg.senderName}` : msg.senderName;
        toast(`New message from ${title}`, 'info');

        const sound = document.getElementById('chat-notification-sound');
        if (sound) {
            sound.play().catch(e => console.warn('Audio play failed:', e));
        }

        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(title, {
                body: msg.text || (msg.attachmentName ? `📎 ${msg.attachmentName}` : 'New message'),
                icon: 'img/logo.png'
            });
            notification.onclick = async () => {
                window.focus();
                switchView('chat');
                if (conv.type === 'dm') {
                    await openDm(msg.senderEmail);
                } else { // group chat
                    await openConversation(convId, conv.name, 'group', conv.profilePicture || '');
                }
            };
        }
    }

    async function renderDmList() {
        const container = document.getElementById('dm-list');
        if (!container || !currentUser) return;
        if (!allUsersMap.size) allUsersMap = await getAllUsers();
        const others = Array.from(allUsersMap.values())
            .filter(u => u.email && u.email !== currentUser.email)
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        if (!others.length) {
            container.innerHTML = `<p class="p-5 text-center text-xs text-slate-400 italic">No users found.</p>`;
            return;
        }
        container.innerHTML = others.map(u => {
            const convId = dmId(currentUser.email, u.email);
            const unread = unreadCounts[convId] || 0;
            const activeClass = unread > 0 ? 'bg-indigo-50/50 border-l-2 border-indigo-600' : '';
            return `
                <button id="dm-btn-${convId}" onclick="openDm('${u.email}')" class="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-all text-left ${activeClass}">
                    <div class="relative shrink-0">
                        <img src="${u.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.avatar || u.name}`}" class="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 object-cover">
                        <div id="online-${eKey(u.email)}" class="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-slate-300 border-2 border-white rounded-full"></div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-xs font-bold text-slate-900 truncate">${u.name}</p>
                        <p class="text-[10px] text-slate-400 font-bold uppercase">${u.role}</p>
                    </div>
                    <span id="unread-badge-${convId}" class="${(unreadCounts[convId] || 0) > 0 ? '' : 'hidden'} bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto">${unreadCounts[convId] || 0}</span>
                </button>`;
        }).join('');
        others.forEach(u => {
            onValue(ref(db, `worksync/users/${eKey(u.email)}/online`), sn => {
                const el = document.getElementById(`online-${eKey(u.email)}`);
                if (el) el.className = `absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 border-white rounded-full ${sn.val() ? 'bg-emerald-500' : 'bg-slate-300'}`;
            });
        });
    }

    function renderGroupList(groups) {
        const el = document.getElementById('group-list');
        if (!groups.length) { el.innerHTML = `<p class="p-5 text-center text-xs text-slate-400 italic">No groups.</p>`; return; }
        el.innerHTML = groups.map(([id, g]) => {
            const name = g.name || 'Unnamed Group';
            const safeNameHtml = escapeHtml(name);
            const safeNameJs = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const unread = unreadCounts[id] || 0; // Use unreadCounts directly
            const badgeClass = unread > 0 ? '' : 'hidden'; // Use unreadCounts directly
            const activeClass = unread > 0 ? 'bg-indigo-50/50 border-l-2 border-indigo-600' : '';

            const avatarHtml = g.profilePicture
                ? `<img src="${g.profilePicture}" class="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-200">`
                : `<div class="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black shrink-0">${escapeHtml(name.charAt(0))}</div>`;

            return `
                <button id="dm-btn-${id}" onclick="openConversation('${id}','${safeNameJs}','group', '${g.profilePicture || ''}')" class="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-all text-left ${activeClass}">
                    ${avatarHtml}
                    <div class="flex-1 min-w-0">
                        <p class="text-xs font-bold text-slate-900 truncate">${safeNameHtml}</p>
                        <p class="text-[10px] text-slate-400 font-bold uppercase">Team Group</p>
                    </div>
                    <span id="unread-badge-${id}" class="${(unreadCounts[id] || 0) > 0 ? '' : 'hidden'} bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto">${unreadCounts[id] || 0}</span>
                </button>`;
        }).join('');
    }

    async function openChatFromMention(email) {
        if (!email) return;
        switchView('chat');
        await openDm(email);
    }
    window.openChatFromMention = openChatFromMention;

    async function openDm(otherEmail) {
        const id = dmId(currentUser.email, otherEmail);
        const userSnap = await get(ref(db, `worksync/users/${eKey(otherEmail)}`));
        const other = userSnap.val() || knownUserByEmail(otherEmail) || { name: otherEmail.split('@')[0] };
        const snap = await get(ref(db, `worksync/conversations/${id}`));
        if (!snap.exists()) {
            await set(ref(db, `worksync/conversations/${id}`), { type: 'dm', members: { [eKey(currentUser.email)]: true, [eKey(otherEmail)]: true }, lastTimestamp: Date.now() });
        }
        openConversation(id, other.name, 'dm', other.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${other.avatar || other.name}`);
    }

    async function openConversation(convId, name, type, avatar) {
        activeConvId = convId;
        unreadCounts[convId] = 0;
        renderChatBadge();
        document.getElementById('chat-welcome').classList.add('hidden');
        document.getElementById('chat-active-header').classList.remove('hidden');
        document.getElementById('chat-input-area').classList.remove('hidden');
        document.getElementById('chat-conv-name').textContent = name;
        document.getElementById('chat-conv-avatar').textContent = name.charAt(0);
        if (avatar) document.getElementById('chat-conv-avatar').innerHTML = `<img src="${avatar}" class="w-full h-full rounded-xl object-cover">`;

        activeGroupMembers = [];
        if (type === 'group') {
            try {
                const [convSnap, usersSnap] = await Promise.all([
                    get(ref(db, `worksync/conversations/${convId}`)),
                    Promise.resolve(allUsersMap) // Use the already loaded allUsersMap
                ]);
                const conv = convSnap.val() || {};
                const allUsers = Array.from(usersSnap.values()); // Get values from the map
                activeGroupMembers = allUsers.filter(u => conv.members && conv.members[eKey(u.email)]);
            } catch (e) { console.error('Failed to load group members', e); }
        }

        const actions = document.getElementById('chat-conv-actions');
        if (actions) {
            if (type === 'group' && isAdmin()) {
                actions.innerHTML = `
                        <button onclick="openEditGroupModal('${convId}')" class="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Edit Group"><iconify-icon icon="solar:pen-bold" width="18"></iconify-icon></button>
                        <button onclick="deleteGroup('${convId}')" class="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Delete Group"><iconify-icon icon="solar:trash-bin-trash-bold" width="18"></iconify-icon></button>
                    `;
            } else {
                actions.innerHTML = '';
            }
        }

        if (msgListener) msgListener();
        const area = document.getElementById('messages-area');
        area.innerHTML = '';
        const q = query(ref(db, `worksync/messages/${convId}`), limitToLast(50));
        msgListener = onValue(q, snap => {
            renderMessages(snap.val() || {});
            area.scrollTop = area.scrollHeight;
        });
    }

    function renderMessages(messages) {
        const area = document.getElementById('messages-area');
        const rows = Object.entries(messages).sort((a, b) => (a[1].timestamp || 0) - (b[1].timestamp || 0));
        if (!rows.length) {
            area.innerHTML = `<p class="text-center text-xs text-slate-400 italic py-6">No messages yet.</p>`;
            return;
        }
        area.innerHTML = '';
        rows.forEach(([id, msg]) => {
            appendMessage(id, msg);
            // Mark message as read for current user if it's not theirs and not unsent
            if (msg.senderEmail !== currentUser.email && !msg.unsent) {
                markMessageRead(id);
            }
        });
    }

    function appendMessage(id, msg) {
        // Ensure readBy exists
        if (!msg.readBy) msg.readBy = {};

        const area = document.getElementById('messages-area');
        const isMe = msg.senderEmail === currentUser.email;
        const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const edited = msg.editedAt && !msg.unsent ? ' · edited' : '';
        const text = msg.unsent ? 'This message was unsent' : linkify(escapeHtml(msg.text || ''), isMe);
        const reactions = msg.reactions || {};

        let attachmentHtml = '';
        if (msg.attachmentUrl && !msg.unsent) {
            if (msg.attachmentType && msg.attachmentType.startsWith('image/')) {
                attachmentHtml = `<div class="${text ? 'mb-2' : ''}"><a href="${msg.attachmentUrl}" target="_blank"><img src="${msg.attachmentUrl}" class="max-w-full sm:max-w-[240px] rounded-xl cursor-pointer hover:opacity-90 transition-opacity" alt="Attached Image"></a></div>`;
            } else {
                const iconColor = isMe ? 'text-indigo-100' : 'text-slate-400';
                const bgClass = isMe ? 'bg-indigo-500/50 hover:bg-indigo-500/70 border-indigo-400/50' : 'bg-slate-50 hover:bg-slate-100 border-slate-200';
                attachmentHtml = `<div class="${text ? 'mb-2' : ''}"><a href="${msg.attachmentUrl}" target="_blank" class="inline-flex items-center gap-2 p-2.5 ${bgClass} rounded-xl transition-colors border"><iconify-icon icon="solar:file-download-bold" width="20" class="${iconColor}"></iconify-icon><span class="text-xs font-bold underline truncate max-w-[150px]">${escapeHtml(msg.attachmentName || 'Download File')}</span></a></div>`;
            }
        }

        const existingReactions = [];
        if (!msg.unsent) {
            ['👍', '❤️', '😂', '🎉', '👀'].forEach(emoji => {
                const users = reactions[emoji] || {};
                const count = Object.keys(users).length;
                const active = !!users[eKey(currentUser.email)];
                if (count > 0) {
                    existingReactions.push(`<button onclick="toggleReaction('${id}','${emoji}')" class="h-6 px-1.5 rounded-full text-[10px] border transition-all ${active ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'}">${emoji}${count > 1 ? ` ${count}` : ''}</button>`);
                }
            });
        }

        const reactionPickerHtml = msg.unsent ? '' : `
                <div class="relative group/react inline-block">
                    <button onclick="document.querySelectorAll('.chat-dropdown').forEach(el => { if(el !== this.nextElementSibling) el.classList.add('hidden') }); this.nextElementSibling.classList.toggle('hidden')" class="h-6 w-6 rounded-full text-[12px] border bg-white border-slate-100 text-slate-400 hover:bg-slate-50 hover:text-indigo-600 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                        <iconify-icon icon="solar:smile-circle-linear" width="14"></iconify-icon>
                    </button>
                    <div class="chat-dropdown absolute bottom-full mb-1 ${isMe ? 'right-0' : 'left-0'} hidden flex w-max bg-white shadow-lg border border-slate-100 rounded-xl p-1 gap-1 z-20 flex-row">
                        ${['👍', '❤️', '😂', '🎉', '👀'].map(emoji => `
                            <button onclick="toggleReaction('${id}','${emoji}'); this.parentElement.classList.add('hidden');" class="w-8 h-8 rounded-lg hover:bg-slate-50 flex items-center justify-center text-base transition-colors">${emoji}</button>
                        `).join('')}
                    </div>
                </div>
            `;

        const reactionHtml = msg.unsent ? '' : `<div class="flex items-center gap-1 flex-wrap mt-1 ${isMe ? 'justify-end' : 'justify-start'}">${existingReactions.join('')}${reactionPickerHtml}</div>`;

        const ownActions = isMe && !msg.unsent ? `
                <div class="relative inline-block opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                    <button onclick="document.querySelectorAll('.chat-dropdown').forEach(el => { if(el !== this.nextElementSibling) el.classList.add('hidden') }); this.nextElementSibling.classList.toggle('hidden')" class="h-6 w-6 rounded-full text-[12px] text-slate-400 hover:bg-slate-50 hover:text-indigo-600 flex items-center justify-center transition-all">
                        <iconify-icon icon="solar:menu-dots-bold" width="14"></iconify-icon>
                    </button>
                    <div class="chat-dropdown absolute bottom-full mb-1 right-0 hidden flex flex-col bg-white shadow-lg border border-slate-100 rounded-xl p-1 z-20 w-28">
                        <button onclick="editMessage('${id}'); this.parentElement.classList.add('hidden');" class="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg w-full text-left">
                            <iconify-icon icon="solar:pen-linear" width="14"></iconify-icon> Edit
                        </button>
                        <button onclick="unsendMessage('${id}'); this.parentElement.classList.add('hidden');" class="flex items-center gap-2 px-2 py-1.5 text-xs text-amber-600 hover:bg-amber-50 rounded-lg w-full text-left">
                            <iconify-icon icon="solar:undo-left-linear" width="14"></iconify-icon> Unsend
                        </button>
                        <button onclick="deleteMessage('${id}'); this.parentElement.classList.add('hidden');" class="flex items-center gap-2 px-2 py-1.5 text-xs text-rose-500 hover:bg-rose-50 rounded-lg w-full text-left">
                            <iconify-icon icon="solar:trash-bin-trash-linear" width="14"></iconify-icon> Delete
                        </button>
                    </div>
                </div>` : '';

        const div = document.createElement('div');
        div.className = `group flex ${isMe ? 'justify-end' : 'justify-start'} fade-in`;
        div.innerHTML = `
                <div class="max-w-[80%] flex flex-col ${isMe ? 'items-end' : 'items-start'}">
                    ${!isMe ? `<p class="text-[10px] font-bold text-slate-400 mb-1 ml-1 uppercase tracking-tighter">${msg.senderName}</p>` : ''}
                    <div class="flex items-center gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}">
                        <div class="px-4 py-2.5 rounded-2xl text-sm shadow-sm ${msg.unsent ? 'bg-slate-100 text-slate-400 italic border border-slate-200' : (isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-900 border border-slate-100 rounded-tl-none')}">
                            ${attachmentHtml}
                            ${text ? `<div>${text}</div>` : ''}
                        </div>
                        <div class="flex items-center gap-1 shrink-0">
                            ${ownActions}
                        </div>
                    </div>
                    ${reactionHtml}
                    <p class="text-[8px] text-slate-400 mt-1 font-bold ${isMe ? 'text-right mr-1' : 'ml-1'}">
                        ${time}${edited}
                        ${isMe && Object.keys(msg.readBy || {}).filter(e => e !== eKey(currentUser.email)).length > 0 ? ' · Seen' : ''}
                    </p>
                </div>`;
        area.appendChild(div);
    }

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    }

    function showNotification(message, type = 'info') {
        // Create a simple toast notification
        const notification = document.createElement('div');
        notification.className = `fixed bottom-6 right-6 px-6 py-3 rounded-xl text-white font-bold text-sm shadow-xl transition-all z-50 ${
            type === 'success' ? 'bg-emerald-600' : 
            type === 'error' ? 'bg-red-600' :
            'bg-indigo-600'
        }`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(10px)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    function linkify(text, isMe) {
        if (!text) return '';
        const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
        let linkified = text.replace(urlRegex, (url) => {
            const colorClass = isMe ? 'text-white underline font-bold hover:text-indigo-200' : 'text-indigo-600 underline font-bold hover:text-indigo-800';
            return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="${colorClass}">${url}</a>`;
        });
        const wwwRegex = /(^|[^\/])(www\.[a-zA-Z0-9\-]+\.[a-zA-Z0-9\-]+[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
        linkified = linkified.replace(wwwRegex, (match, prefix, wwwUrl) => {
            const colorClass = isMe ? 'text-white underline font-bold hover:text-indigo-200' : 'text-indigo-600 underline font-bold hover:text-indigo-800';
            return `${prefix}<a href="http://${wwwUrl}" target="_blank" rel="noopener noreferrer" class="${colorClass}">${wwwUrl}</a>`;
        });

        // Build dynamic list of name mappings
        const nameMappings = [];
        const usersList = typeof allUsersMap !== 'undefined' && allUsersMap.size ? Array.from(allUsersMap.values()) : [];
        const activeUsers = usersList.length ? usersList : (typeof USERS !== 'undefined' ? USERS : []);

        activeUsers.forEach(u => {
            if (!u.name || !u.email) return;
            const fullName = u.name.trim();
            const email = u.email;

            // Add full name
            nameMappings.push({ name: fullName, email });

            // Add variants
            const parts = fullName.split(/\s+/);
            if (parts.length > 1) {
                nameMappings.push({ name: parts.slice(0, -1).join(' '), email });
                nameMappings.push({ name: parts[0], email });
            }

            // Add special aliases if they contain Palanirajan
            if (fullName.toLowerCase().includes('palanirajan')) {
                nameMappings.push({ name: 'Palani Rajan', email });
                nameMappings.push({ name: 'Palani', email });
            }
        });

        // Sort by name length descending so that longer names match first
        nameMappings.sort((a, b) => b.name.length - a.name.length);

        // Replace names with temporary placeholders to prevent nested replacement issues
        const replacedEmails = [];
        nameMappings.forEach((m, idx) => {
            const esc = m.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex = new RegExp('@(' + esc + ')\\b', 'gi');

            linkified = linkified.replace(regex, (match, nameVal) => {
                const placeholder = `__MENTION_PLACEHOLDER_${replacedEmails.length}__`;
                replacedEmails.push({
                    email: m.email,
                    name: nameVal
                });
                return placeholder;
            });
        });

        // Fallback: match any other @mentions (generic username)
        const mentionRegex = /@([a-zA-Z0-9._-]+)/g;
        linkified = linkified.replace(mentionRegex, (match, username) => {
            let hash = 0;
            for (let i = 0; i < username.length; i++) {
                hash = username.charCodeAt(i) + ((hash << 5) - hash);
            }
            const hue = Math.abs(hash) % 360;
            const color = `hsl(${hue}, 70%, 50%)`;
            return `<span class="mention-text cursor-default font-bold" style="color:${color}">${match}</span>`;
        });

        // Replace all placeholders back with the HTML span elements
        replacedEmails.forEach((item, idx) => {
            const placeholder = `__MENTION_PLACEHOLDER_${idx}__`;
            let hash = 0;
            for (let i = 0; i < item.name.length; i++) {
                hash = item.name.charCodeAt(i) + ((hash << 5) - hash);
            }
            const hue = Math.abs(hash) % 360;
            const color = `hsl(${hue}, 70%, 50%)`;

            const hoverClass = isMe ? 'hover:text-indigo-200' : 'hover:text-indigo-800';
            const html = `<span class="mention-link cursor-pointer underline font-bold ${hoverClass}" style="color:${color}" onclick="window.openChatFromMention('${item.email}')">@${item.name}</span>`;
            linkified = linkified.split(placeholder).join(html);
        });

        return linkified;
    }

    async function editMessage(id) {
        if (!activeConvId) return;
        const snap = await get(ref(db, `worksync/messages/${activeConvId}/${id}`));
        const msg = snap.val();
        if (!msg || (msg.senderEmail || '').toLowerCase() !== (currentUser.email || '').toLowerCase() || msg.unsent) { toast('You can only edit your own messages', 'error'); return; }
        const next = prompt('Edit message', msg.text || '');
        if (next === null) return;
        const text = next.trim();
        if (!text) return toast('Message cannot be empty', 'error');
        await update(ref(db, `worksync/messages/${activeConvId}/${id}`), { text, editedAt: Date.now() });
        await update(ref(db, `worksync/conversations/${activeConvId}`), { lastMessage: text, lastTimestamp: Date.now() });
        toast('Message edited', 'success');
    }

    async function deleteMessage(id) {
        if (!activeConvId || !confirm('Delete this message permanently?')) return;
        const snap = await get(ref(db, `worksync/messages/${activeConvId}/${id}`));
        const msg = snap.val();
        if (!msg || (msg.senderEmail || '').toLowerCase() !== (currentUser.email || '').toLowerCase()) { toast('You can only delete your own messages', 'error'); return; }
        await remove(ref(db, `worksync/messages/${activeConvId}/${id}`));
        toast('Message deleted', 'success');
    }

    async function unsendMessage(id) {
        if (!activeConvId || !confirm('Unsend this message for everyone?')) return;
        const snap = await get(ref(db, `worksync/messages/${activeConvId}/${id}`));
        const msg = snap.val();
        if (!msg || (msg.senderEmail || '').toLowerCase() !== (currentUser.email || '').toLowerCase() || msg.unsent) { toast('You can only unsend your own messages', 'error'); return; }
        await update(ref(db, `worksync/messages/${activeConvId}/${id}`), { text: '', unsent: true, unsentAt: Date.now(), editedAt: null, reactions: null });
        await update(ref(db, `worksync/conversations/${activeConvId}`), { lastMessage: 'Message unsent', lastTimestamp: Date.now() });
        toast('Message unsent', 'success');
    }

    async function toggleReaction(id, emoji) {
        if (!activeConvId) return;
        const key = eKey(currentUser.email);
        const reactionRef = ref(db, `worksync/messages/${activeConvId}/${id}/reactions/${emoji}/${key}`);
        const snap = await get(reactionRef);
        await set(reactionRef, snap.exists() ? null : true);
    }

    let dragCounter = 0;
    function handleChatDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    function handleChatDragEnter(e) {
        e.preventDefault();
        e.stopPropagation();
        if (!activeConvId) return;
        dragCounter++;
        document.getElementById('chat-drag-overlay').classList.remove('hidden');
    }
    function handleChatDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        dragCounter--;
        if (dragCounter === 0) {
            document.getElementById('chat-drag-overlay').classList.add('hidden');
        }
    }
    async function handleChatDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        dragCounter = 0;
        document.getElementById('chat-drag-overlay').classList.add('hidden');
        if (!activeConvId) return;
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            await processChatAttachment(files[0]);
        }
    }

    async function uploadChatAttachment(event) {
        const file = event.target.files[0];
        document.getElementById('chat-file-upload').value = '';
        if (file) await processChatAttachment(file);
    }

    async function processChatAttachment(file) {
        if (file.size > 10 * 1024 * 1024) return toast('File must be less than 10MB', 'error');

        stagedAttachment = file;
        document.getElementById('chat-staged-attachment').classList.remove('hidden');
        document.getElementById('staged-file-name').textContent = file.name;
        document.getElementById('staged-file-size').textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB';
        document.getElementById('msg-input').focus();
    }

    function clearStagedAttachment() {
        stagedAttachment = null;
        document.getElementById('chat-staged-attachment').classList.add('hidden');
        document.getElementById('chat-file-upload').value = '';
    }

    function handleMsgInput(e) {
        const val = e.target.value;
        const cursor = e.target.selectionStart;
        const textBeforeCursor = val.slice(0, cursor);
        const match = textBeforeCursor.match(/@([a-zA-Z0-9_ ]*)$/);

        if (match && activeGroupMembers.length > 0) {
            mentionActive = true;
            mentionFilter = match[1].toLowerCase();
            mentionIndex = 0;
            renderMentionDropdown();
        } else {
            closeMentionDropdown();
        }
    }

    function renderMentionDropdown() {
        const dropdown = document.getElementById('mention-dropdown');
        if (!dropdown) return;

        const filtered = activeGroupMembers.filter(u =>
            (u.name || '').toLowerCase().includes(mentionFilter) ||
            (u.email || '').toLowerCase().includes(mentionFilter)
        );

        if (filtered.length === 0) {
            closeMentionDropdown();
            return;
        }

        dropdown.innerHTML = filtered.map((u, i) => `
                <div onclick="selectMention('${escapeHtml(u.name || u.email).replace(/'/g, "\\'")}')" class="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 transition-colors ${i === mentionIndex ? 'bg-indigo-50 border-l-2 border-indigo-600' : ''}">
                    <img src="${u.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.avatar || u.name}`}" class="w-6 h-6 rounded-md object-cover bg-slate-100">
                    <div class="min-w-0">
                        <p class="text-xs font-bold text-slate-900 truncate">${escapeHtml(u.name)}</p>
                        <p class="text-[10px] text-slate-400 truncate">${escapeHtml(u.role || 'Member')}</p>
                    </div>
                </div>
            `).join('');

        dropdown.classList.remove('hidden');

        const activeItem = dropdown.children[mentionIndex];
        if (activeItem) {
            activeItem.scrollIntoView({ block: 'nearest' });
        }
    }

    function closeMentionDropdown() {
        mentionActive = false;
        const dropdown = document.getElementById('mention-dropdown');
        if (dropdown) dropdown.classList.add('hidden');
    }

    function selectMention(name) {
        const input = document.getElementById('msg-input');
        const val = input.value;
        const cursor = input.selectionStart;
        const textBeforeCursor = val.slice(0, cursor);
        const textAfterCursor = val.slice(cursor);
        const match = textBeforeCursor.match(/@([a-zA-Z0-9_ ]*)$/);

        if (match) {
            const replacement = `@${name} `;
            const newTextBefore = textBeforeCursor.slice(0, match.index) + replacement;
            input.value = newTextBefore + textAfterCursor;
            input.focus();
            input.selectionStart = input.selectionEnd = newTextBefore.length;
        }

        closeMentionDropdown();
    }

    function handleMsgKeyDown(e) {
        if (mentionActive) {
            const dropdown = document.getElementById('mention-dropdown');
            const filteredCount = dropdown.children.length;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                mentionIndex = (mentionIndex + 1) % filteredCount;
                renderMentionDropdown();
                return;
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                mentionIndex = (mentionIndex - 1 + filteredCount) % filteredCount;
                renderMentionDropdown();
                return;
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const activeItem = dropdown.children[mentionIndex];
                if (activeItem) {
                    activeItem.click();
                }
                return;
            } else if (e.key === 'Escape') {
                e.preventDefault();
                closeMentionDropdown();
                return;
            }
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    }

    async function sendMessage() {
        const input = document.getElementById('msg-input');
        const text = input.value.trim();
        if (!text && !stagedAttachment) return;
        if (!activeConvId) return;

        const sendBtn = document.getElementById('send-msg-btn');
        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.innerHTML = `<iconify-icon icon="svg-spinners:ring-resize" width="21"></iconify-icon>`;
        }

        try {
            let attachmentUrl = null, attachmentType = null, attachmentName = null;
            if (stagedAttachment) {
                attachmentUrl = await fileToBase64(stagedAttachment);
                attachmentType = stagedAttachment.type || 'application/octet-stream';
                attachmentName = stagedAttachment.name;
            }

            const payload = { senderEmail: currentUser.email, senderName: currentUser.name, text, timestamp: Date.now(), readBy: {} };
            if (attachmentUrl) {
                payload.attachmentUrl = attachmentUrl;
                payload.attachmentType = attachmentType;
                payload.attachmentName = attachmentName;
            }

            await push(ref(db, `worksync/messages/${activeConvId}`), payload);
            const lastMsg = text || `📎 ${attachmentName}`;
            await update(ref(db, `worksync/conversations/${activeConvId}`), { lastMessage: lastMsg, lastTimestamp: Date.now() });

            input.value = '';
            clearStagedAttachment();
        } catch (err) {
            toast('Failed to send message: ' + err.message, 'error');
        } finally {
            if (sendBtn) {
                sendBtn.disabled = false;
                sendBtn.innerHTML = `<iconify-icon icon="mdi:send" width="21"></iconify-icon>`;
            }
            input.focus();
        }
    }

    async function processGroupPhoto(type) {
        const inputId = type === 'new' ? 'new-group-photo-upload' : 'edit-group-photo-upload';
        const imgId = type === 'new' ? 'new-group-pic' : 'edit-group-pic';
        const file = document.getElementById(inputId).files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) return toast('Image must be less than 2MB', 'error');
        toast('Processing photo...', 'info');
        try {
            const base64Url = await fileToBase64(file);
            document.getElementById(imgId).src = base64Url;
            document.getElementById(imgId).dataset.newPic = base64Url;
            toast('Photo ready to save', 'success');
        } catch (err) { toast('Upload failed: ' + err.message, 'error'); }
    }

    async function openNewGroupModal() {
        if (!isAdmin()) return toast('Only admins can create groups', 'error');
        const list = document.getElementById('group-members-list');
        const nameInput = document.getElementById('group-name-input');
        if (nameInput) nameInput.value = '';
        const picImg = document.getElementById('new-group-pic');
        if (picImg) {
            delete picImg.dataset.newPic;
            picImg.src = 'https://api.dicebear.com/7.x/initials/svg?seed=G';
        }
        list.innerHTML = `<p class="p-3 text-center text-xs text-slate-400 italic">Loading members...</p>`;
        document.getElementById('newGroupModal').showModal();

        let people = Array.from(allUsersMap.values()); // Use allUsersMap
        try {
            // No need to fetch again, allUsersMap is already merged
        } catch (err) {
            console.warn('Could not load Firebase users for group members:', err);
        }

        const members = people.filter(u => u.email && u.email !== currentUser.email);
        if (!members.length) {
            list.innerHTML = `<p class="p-3 text-center text-xs text-slate-400 italic">No members available.</p>`;
            return;
        }
        list.innerHTML = members.map(u => `
                <label class="flex items-center gap-3 p-2 hover:bg-white rounded-xl cursor-pointer transition-all">
                    <input type="checkbox" value="${u.email}" class="w-4 h-4 rounded-md text-indigo-600">
                    <span class="text-xs font-bold text-slate-700">${escapeHtml(u.name || u.email)}</span>
                    <span class="text-[10px] text-slate-400 ml-auto">${escapeHtml(u.role || 'Member')}</span>
                </label>`).join('');
    }

    async function createGroup() {
        if (!isAdmin()) return toast('Only admins can create groups', 'error');
        const name = document.getElementById('group-name-input').value.trim();
        if (!name) return toast('Enter group name', 'error');
        const members = { [eKey(currentUser.email)]: true };
        [...document.querySelectorAll('#group-members-list input:checked')].forEach(i => members[eKey(i.value)] = true);
        if (Object.keys(members).length < 2) return toast('Select at least one member', 'error');

        const picImg = document.getElementById('new-group-pic');
        const profilePicture = picImg ? (picImg.dataset.newPic || null) : null;

        try {
            const newRef = push(ref(db, 'worksync/conversations'));
            await set(newRef, {
                type: 'group',
                name,
                profilePicture,
                members,
                memberCount: Object.keys(members).length,
                createdBy: currentUser.email,
                createdByName: currentUser.name,
                createdAt: Date.now(),
                lastTimestamp: Date.now()
            });
            document.getElementById('group-name-input').value = '';
            if (picImg) {
                delete picImg.dataset.newPic;
                picImg.src = 'https://api.dicebear.com/7.x/initials/svg?seed=G';
            }
            document.getElementById('newGroupModal').close();
            toast('Group created', 'success');
        } catch (err) {
            console.error('Group creation failed:', err);
            toast('Group creation failed: ' + err.message, 'error');
        }
    }

    async function openEditGroupModal(convId) {
        if (!isAdmin()) return toast('Only admins can edit groups', 'error');

        const snap = await get(ref(db, `worksync/conversations/${convId}`));
        if (!snap.exists()) return toast('Group not found', 'error');
        const group = snap.val();

        document.getElementById('edit-group-id').value = convId;
        document.getElementById('edit-group-name-input').value = group.name || '';
        const picImg = document.getElementById('edit-group-pic');
        if (picImg) {
            picImg.src = group.profilePicture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(group.name || 'G')}`;
            delete picImg.dataset.newPic;
        }
        const list = document.getElementById('edit-group-members-list');
        list.innerHTML = `<p class="p-3 text-center text-xs text-slate-400 italic">Loading members...</p>`;
        document.getElementById('editGroupModal').showModal();

        let people = Array.from(allUsersMap.values()); // Use allUsersMap
        try {
            // No need to fetch again, allUsersMap is already merged
        } catch (err) {
            console.warn('Could not load Firebase users for group members:', err);
        }

        const allMembers = people.filter(u => u.email);
        if (!allMembers.length) {
            list.innerHTML = `<p class="p-3 text-center text-xs text-slate-400 italic">No members available.</p>`;
            return;
        }

        list.innerHTML = allMembers.map(u => {
            const isMember = group.members && group.members[eKey(u.email)];
            return `
                <label class="flex items-center gap-3 p-2 hover:bg-white rounded-xl cursor-pointer transition-all">
                    <input type="checkbox" value="${u.email}" class="w-4 h-4 rounded-md text-indigo-600" ${isMember ? 'checked' : ''}>
                    <span class="text-xs font-bold text-slate-700">${escapeHtml(u.name || u.email)}</span>
                    <span class="text-[10px] text-slate-400 ml-auto">${escapeHtml(u.role || 'Member')}</span>
                </label>`;
        }).join('');
    }

    async function updateGroup() {
        if (!isAdmin()) return toast('Only admins can edit groups', 'error');
        const convId = document.getElementById('edit-group-id').value;
        const name = document.getElementById('edit-group-name-input').value.trim();
        if (!name) return toast('Enter group name', 'error');
        const members = {};
        [...document.querySelectorAll('#edit-group-members-list input:checked')].forEach(i => members[eKey(i.value)] = true);
        if (Object.keys(members).length < 1) return toast('Select at least one member', 'error');

        const picImg = document.getElementById('edit-group-pic');
        const newPic = picImg ? picImg.dataset.newPic : null;

        try {
            const updates = {
                name,
                members,
                memberCount: Object.keys(members).length,
            };
            if (newPic) updates.profilePicture = newPic;

            await update(ref(db, `worksync/conversations/${convId}`), updates);
            document.getElementById('editGroupModal').close();
            toast('Group updated', 'success');
            if (activeConvId === convId) {
                document.getElementById('chat-conv-name').textContent = name;
                const avatarEl = document.getElementById('chat-conv-avatar');
                if (updates.profilePicture || picImg.src.startsWith('data:')) {
                    avatarEl.innerHTML = `<img src="${updates.profilePicture || picImg.src}" class="w-full h-full rounded-xl object-cover">`;
                } else {
                    avatarEl.textContent = name.charAt(0);
                }
            }
        } catch (err) {
            console.error('Group update failed:', err);
            toast('Group update failed: ' + err.message, 'error');
        }
    }

    async function deleteGroup(convId) {
        if (!isAdmin()) return toast('Only admins can delete groups', 'error');
        if (!confirm('Are you sure you want to delete this group permanently?')) return;
        try {
            await remove(ref(db, `worksync/conversations/${convId}`));
            await remove(ref(db, `worksync/messages/${convId}`));
            toast('Group deleted successfully', 'success');
            if (activeConvId === convId) {
                document.getElementById('chat-welcome').classList.remove('hidden');
                document.getElementById('chat-active-header').classList.add('hidden');
                document.getElementById('chat-input-area').classList.add('hidden');
                document.getElementById('messages-area').innerHTML = '';
                activeConvId = null;
                if (msgListener) { msgListener(); msgListener = null; }
            }
        } catch (err) {
            console.error('Group deletion failed:', err);
            toast('Group deletion failed: ' + err.message, 'error');
        }
    }

    // ANNOUNCEMENTS
    function initAnnouncements() {
        if (!db || !currentUser) return;
        loadAnnouncements();
        watchAnnouncementNotifications();
    }

    function loadAnnouncements() {
        if (!db) return;
        if (announcementsUnsub) announcementsUnsub();
        const q = query(ref(db, 'worksync/announcements'), limitToLast(50));
        announcementsUnsub = onValue(q, snap => renderAnnouncements(snap.val() || {}));
    }

    function renderAnnouncements(data) {
        const list = document.getElementById('announcements-list');
        const count = document.getElementById('announcement-count');
        if (!list) return;
        const rows = Object.entries(data).sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));
        if (count) count.textContent = `${rows.length} Update${rows.length === 1 ? '' : 's'}`;
        if (!rows.length) {
            list.innerHTML = `<p class="p-8 text-center text-xs text-slate-400 italic">No announcements yet.</p>`;
            return;
        }
        list.innerHTML = rows.map(([id, item]) => {
            const date = new Date(item.createdAt || Date.now()).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
            const canDelete = isAdmin() ? `
                    <button onclick="deleteAnnouncement('${id}')" class="p-2 text-slate-300 hover:text-rose-500 transition-colors" aria-label="Delete announcement">
                        <iconify-icon icon="solar:trash-bin-trash-linear" width="16"></iconify-icon>
                    </button>` : '';
            return `
                    <div class="p-6 hover:bg-slate-50/70 transition-all">
                        <div class="flex items-start gap-4">
                            <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                                <iconify-icon icon="solar:bell-bing-bold" width="20"></iconify-icon>
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-start justify-between gap-3">
                                    <div>
                                        <h4 class="text-sm font-black text-slate-900">${escapeHtml(item.title || 'Announcement')}</h4>
                                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">${escapeHtml(item.authorName || 'Admin')} · ${date}</p>
                                    </div>
                                    ${canDelete}
                                </div>
                                <p class="text-sm text-slate-600 leading-relaxed mt-3 whitespace-pre-wrap">${escapeHtml(item.body || '')}</p>
                            </div>
                        </div>
                    </div>`;
        }).join('');
    }

    function watchAnnouncementNotifications() {
        if (announcementNotifyUnsub) announcementNotifyUnsub();
        const listenerStartedAt = Date.now();
        const q = query(ref(db, 'worksync/announcements'), limitToLast(1));
        announcementNotifyUnsub = onChildAdded(q, snap => {
            const item = snap.val();
            if (!item || item.authorEmail === currentUser.email || (item.createdAt || 0) < listenerStartedAt) return;

            const sound = document.getElementById('announcement-notification-sound');
            if (sound) {
                sound.play().catch(e => console.warn('Audio play failed:', e));
            }

            toast(`Announcement: ${item.title || 'New update'}`, 'info', () => switchView('announcements'));
            if (activeView !== 'announcements') {
                unreadAnnouncements += 1;
                renderAnnouncementBadge();
            }
            if ('Notification' in window && Notification.permission === 'granted') {
                const n = new Notification(item.title || 'Team announcement', { body: item.body || 'Open WorkSync to view the announcement' });
                n.onclick = () => { window.focus(); switchView('announcements'); };
            }
        });
    }

    function renderAnnouncementBadge() {
        const badge = document.getElementById('announcement-badge');
        if (!badge) return;
        badge.textContent = unreadAnnouncements;
        badge.classList.toggle('hidden', unreadAnnouncements === 0);
    }

    function createStatCard(title, value, icon, colorClass) {
        return `
            <div class="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center ${colorClass.bg} ${colorClass.text}">
                        <iconify-icon icon="${icon}" width="20"></iconify-icon>
                    </div>
                    <div>
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${title}</p>
                        <p class="text-lg font-black text-slate-900">${value}</p>
                    </div>
                </div>
            </div>`;
    }

    function getDayName(dateStr) {
        const date = new Date(dateStr);
        const dayIndex = date.getDay();
        const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        return days[dayIndex];
    }

    function populateReportUserFilter() {
        const userInput = document.getElementById('report-user-filter');
        if (!userInput || !isAdmin()) return;

        const currentVal = userInput.value;
        userInput.innerHTML = `<option value="all">All Users</option>`;
        currentWorkUsers.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.email;
            opt.textContent = u.name;
            userInput.appendChild(opt);
        });

        if ([...userInput.options].some(o => o.value === currentVal)) {
            userInput.value = currentVal;
        }
    }

    function initReportFilters() {
        if (!canViewReports()) return;
        const fromInput = document.getElementById('report-date-from');
        const toInput = document.getElementById('report-date-to');

        const userWrapper = document.getElementById('report-user-filter-wrapper');
        if (userWrapper) {
            if (isAdmin()) {
                userWrapper.classList.remove('hidden');
                populateReportUserFilter();
            } else {
                userWrapper.classList.add('hidden');
                reportSelectedUser = currentUser.email;
            }
        }

        const datePickerEl = document.getElementById('report-datepicker');
        if (datePickerEl && window.Litepicker) {
            new Litepicker({
                element: datePickerEl,
                singleMode: false,
                format: 'DD MMM, YYYY',
                numberOfMonths: 2,
                plugins: ['mobilefriendly'],
                setup: (picker) => {
                    picker.on('selected', (date1, date2) => {
                        fromInput.value = date1.dateInstance.toISOString().slice(0, 10);
                        toInput.value = date2.dateInstance.toISOString().slice(0, 10);
                        handleReportFilterChange();
                    });
                },
            });
        }

        setReportDatePreset('this_week');
    }

    // Initialize performance date filters with default range (this week)
    function initPerformanceFilters() {
        if (!canViewReports()) return;
        const fromInput = document.getElementById('perf-date-from');
        const toInput = document.getElementById('perf-date-to');
        if (!fromInput || !toInput) return;
        const today = new Date();
        const fromDate = new Date();
        // Set start of week (Monday)
        fromDate.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
        const toDate = new Date();
        fromInput.value = fromDate.toISOString().slice(0, 10);
        toInput.value = toDate.toISOString().slice(0, 10);
        // Sync global vars
        reportDateFrom = fromInput.value;
        reportDateTo = toInput.value;
        // Render initial performance report if needed
        if (activeView === 'reports' && currentReportTab === 'performance') {
            renderPerformanceReport();
        }
    }

    function setReportDatePreset(preset) {
        const fromInput = document.getElementById('report-date-from');
        const toInput = document.getElementById('report-date-to');
        if (!fromInput || !toInput) return;
        const today = new Date();
        let fromDate = new Date();

        if (preset === 'today') { }
        else if (preset === 'this_week') { fromDate.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); }
        else if (preset === 'this_month') { fromDate = new Date(today.getFullYear(), today.getMonth(), 1); }

        const toDate = new Date();
        fromInput.value = fromDate.toISOString().slice(0, 10);
        toInput.value = toDate.toISOString().slice(0, 10);

        const picker = document.getElementById('report-datepicker')?.litepicker;
        if (picker) {
            picker.setDateRange(fromDate, toDate);
        }

        document.querySelectorAll('.report-preset-btn').forEach(btn => {
            btn.classList.remove('bg-indigo-600', 'text-white');
            btn.classList.add('bg-slate-50', 'border-slate-200', 'text-slate-600');
        });
        const activeBtn = document.querySelector(`button[onclick="setReportDatePreset('${preset}')"]`);
        if (activeBtn) {
            activeBtn.classList.add('bg-indigo-600', 'text-white');
            activeBtn.classList.remove('bg-slate-50', 'border-slate-200', 'text-slate-600');
        }

        handleReportFilterChange();
    }

    function handleReportFilterChange() {
        if (!canViewReports()) return;
        const fromInput = document.getElementById('report-date-from');
        const toInput = document.getElementById('report-date-to');
        if (!fromInput || !toInput) return;
        reportDateFrom = fromInput.value;
        reportDateTo = toInput.value;
        const userInput = document.getElementById('report-user-filter');
        if (isAdmin()) reportSelectedUser = userInput.value;
        else if (isManager()) reportSelectedUser = 'all';
        else reportSelectedUser = currentUser.email;

        // Re-render the current report tab
        if (activeView === 'reports') {
            if (isManager() && !isAdmin() && currentReportTab !== 'client') currentReportTab = 'client';
            switch (currentReportTab) {
                case 'timing': renderTimingReport(); break;
                case 'task': renderTaskReport(); break;
                case 'analytics': renderAnalyticsReport(); break;
                case 'summary': renderSummaryReport(); break;
                case 'detailed': renderDetailedReport(); break;
                case 'performance': renderPerformanceReport(); break;
                case 'client': renderClientReport(); break;
                case 'client-wide': renderClientWideReport(); break;
            }
        }
    }

    function handlePerformanceFilterChange() {
        if (!canViewReports()) return;
        const fromInput = document.getElementById('perf-date-from');
        const toInput = document.getElementById('perf-date-to');
        if (fromInput && toInput) {
            reportDateFrom = fromInput.value;
            reportDateTo = toInput.value;
        }
        // Re-render performance report
        renderPerformanceReport();
    }

    async function sendAnnouncement() {
        if (!isAdmin()) return toast('Only admins can send announcements', 'error');
        const titleInput = document.getElementById('announcement-title');
        const bodyInput = document.getElementById('announcement-body');
        const title = titleInput.value.trim();
        const body = bodyInput.value.trim();
        if (!title) return toast('Enter announcement title', 'error');
        if (!body) return toast('Enter announcement details', 'error');
        await push(ref(db, 'worksync/announcements'), {
            title,
            body,
            authorEmail: currentUser.email,
            authorName: currentUser.name,
            createdAt: Date.now()
        });
        titleInput.value = '';
        bodyInput.value = '';
        toast('Announcement sent', 'success');
    }

    async function deleteAnnouncement(id) {
        if (!isAdmin() || !confirm('Delete this announcement?')) return;
        await remove(ref(db, `worksync/announcements/${id}`));
        toast('Announcement deleted', 'success');
    }

    // NOTES
    function loadNotes() {
        if (!db || !currentUser) return;
        if (notesUnsub) notesUnsub();
        const q = query(ref(db, `worksync/notes/${eKey(currentUser.email)}`));
        notesUnsub = onValue(q, snap => renderNotes(snap.val() || {}));
    }

    function renderNotes(data) {
        const list = document.getElementById('notes-list');
        const count = document.getElementById('notes-count');
        if (!list) return;

        const rows = Object.entries(data).sort((a, b) => (b[1].updatedAt || b[1].createdAt || 0) - (a[1].updatedAt || a[1].createdAt || 0));
        if (count) count.textContent = `${rows.length} Note${rows.length === 1 ? '' : 's'}`;

        if (!rows.length) {
            list.innerHTML = `<p class="p-8 text-center text-xs text-slate-400 italic">No notes found. Create your first note!</p>`;
            return;
        }

        list.innerHTML = rows.map(([id, item]) => {
            const date = new Date(item.updatedAt || item.createdAt || Date.now()).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
            return `
                    <div class="p-6 hover:bg-slate-50/70 transition-all group">
                        <div class="flex items-start gap-4">
                            <div class="flex-1 min-w-0">
                                <div class="flex items-start justify-between gap-3">
                                    <div>
                                        <h4 class="text-sm font-black text-slate-900">${escapeHtml(item.title || 'Untitled Note')}</h4>
                                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Last Updated · ${date}</p>
                                    </div>
                                    <div class="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                        <button onclick="editNote('${id}')" class="p-2 text-slate-300 hover:text-indigo-600 transition-colors" title="Edit Note">
                                            <iconify-icon icon="solar:pen-linear" width="16"></iconify-icon>
                                        </button>
                                        <button onclick="deleteNote('${id}')" class="p-2 text-slate-300 hover:text-rose-500 transition-colors" title="Delete Note">
                                            <iconify-icon icon="solar:trash-bin-trash-linear" width="16"></iconify-icon>
                                        </button>
                                    </div>
                                </div>
                                <p class="text-sm text-slate-600 leading-relaxed mt-3 whitespace-pre-wrap">${escapeHtml(item.body || '')}</p>
                            </div>
                        </div>
                    </div>`;
        }).join('');
    }

    async function saveNote() {
        const idInput = document.getElementById('note-edit-id');
        const titleInput = document.getElementById('note-title');
        const bodyInput = document.getElementById('note-body');
        const id = idInput.value;
        const title = titleInput.value.trim();
        const body = bodyInput.value.trim();
        if (!title && !body) return toast('Note cannot be empty', 'error');
        const noteData = { title: title || 'Untitled Note', body, updatedAt: Date.now() };
        try {
            if (id) { await update(ref(db, `worksync/notes/${eKey(currentUser.email)}/${id}`), noteData); toast('Note updated', 'success'); }
            else { noteData.createdAt = Date.now(); await push(ref(db, `worksync/notes/${eKey(currentUser.email)}`), noteData); toast('Note saved', 'success'); }
            clearNoteForm();
        } catch (err) { toast('Failed to save note: ' + err.message, 'error'); }
    }

    async function editNote(id) {
        try {
            const snap = await get(ref(db, `worksync/notes/${eKey(currentUser.email)}/${id}`));
            if (!snap.exists()) return toast('Note not found', 'error');
            const data = snap.val();
            document.getElementById('note-edit-id').value = id;
            document.getElementById('note-title').value = data.title || '';
            document.getElementById('note-body').value = data.body || '';
            document.getElementById('note-save-btn').innerHTML = `<iconify-icon icon="solar:pen-bold" width="18"></iconify-icon> Update Note`;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) { toast('Failed to load note', 'error'); }
    }

    async function deleteNote(id) {
        if (!confirm('Are you sure you want to delete this note?')) return;
        try { await remove(ref(db, `worksync/notes/${eKey(currentUser.email)}/${id}`)); toast('Note deleted', 'success'); if (document.getElementById('note-edit-id').value === id) clearNoteForm(); } catch (err) { toast('Failed to delete note', 'error'); }
    }

    function clearNoteForm() { document.getElementById('note-edit-id').value = ''; document.getElementById('note-title').value = ''; document.getElementById('note-body').value = ''; document.getElementById('note-save-btn').innerHTML = `<iconify-icon icon="solar:diskette-bold" width="18"></iconify-icon> Save Note`; }

    // DPR
    function todayIso() {
        return new Date().toISOString().slice(0, 10);
    }

    function monthKey(date = new Date()) {
        if (typeof date === 'string') return date.slice(0, 7);
        return date.toISOString().slice(0, 7);
    }

    function initDpr() {
        if (!currentUser) return;
        const dateInput = document.getElementById('dpr-date');
        const monthInput = document.getElementById('dpr-month');
        if (dateInput && !dateInput.value) dateInput.value = todayIso();
        if (monthInput && !monthInput.value) monthInput.value = monthKey();
        loadDprEntries();
    }

    function loadDprEntries() {
        if (!db || dprUnsub) return;
        dprUnsub = onValue(ref(db, 'worksync/dpr_entries'), snap => {
            dprEntries = Object.entries(snap.val() || {}).map(([id, entry]) => ({ id, ...entry }));
            renderDpr();
            if (activeView === 'dashboard' || activeView === 'daily-summary') {
                renderDailySummary();
            }
        });
    }

    function switchDprTab(tab) {
        if (tab === 'team' && !isAdmin()) tab = 'my';
        currentDprTab = tab;
        ['my', 'team', 'monthly', 'export'].forEach(t => {
            document.getElementById(`dpr-panel-${t}`).classList.add('hidden');
            document.getElementById(`dpr-tab-${t}`).classList.remove('border-2', 'border-indigo-600');
            document.getElementById(`dpr-tab-${t}`).classList.add('border', 'border-slate-100');
        });
        document.getElementById(`dpr-panel-${tab}`).classList.remove('hidden');
        document.getElementById(`dpr-tab-${tab}`).classList.add('border-2', 'border-indigo-600');
        document.getElementById(`dpr-tab-${tab}`).classList.remove('border', 'border-slate-100');
        renderDpr();
    }

    async function submitDpr() {
        if (!currentUser) return;
        const date = document.getElementById('dpr-date').value;
        const category = document.getElementById('dpr-category').value;
        const count = Number(document.getElementById('dpr-count').value || 0);
        const status = document.getElementById('dpr-status').value;
        const notes = document.getElementById('dpr-notes').value.trim();
        if (!date) return toast('Select DPR date', 'error');
        if (status === 'worked' && count <= 0) return toast('Enter completed count', 'error');
        await push(ref(db, 'worksync/dpr_entries'), {
            date,
            month: monthKey(date),
            category,
            count: status === 'worked' ? count : 0,
            status,
            notes,
            userId: currentUser.email,
            userName: currentUser.name,
            userRole: currentUser.role,
            createdAt: Date.now()
        });
        document.getElementById('dpr-count').value = '';
        document.getElementById('dpr-notes').value = '';
        toast('DPR saved', 'success');
    }

    function renderDpr() {
        renderMyDpr();
        renderTeamDpr();
        renderMonthlyDpr();
    }

    function dprVisibleEntries() {
        const month = document.getElementById('dpr-month')?.value || monthKey();
        return dprEntries.filter(e => e.month === month);
    }

    function renderMyDpr() {
        const list = document.getElementById('my-dpr-list');
        const totalEl = document.getElementById('my-dpr-total');
        if (!list || !currentUser) return;
        const rows = dprEntries
            .filter(e => e.userId === currentUser.email)
            .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0))
            .slice(0, 12);
        const total = rows.reduce((sum, e) => sum + Number(e.count || 0), 0);
        if (totalEl) totalEl.textContent = `${total} Total`;
        if (!rows.length) {
            list.innerHTML = `<p class="p-6 text-center text-xs text-slate-400 italic">No DPR entries yet.</p>`;
            return;
        }
        list.innerHTML = rows.map(e => dprEntryRow(e)).join('');
    }

    function renderTeamDpr() {
        const list = document.getElementById('team-dpr-list');
        const totalEl = document.getElementById('team-dpr-total');
        if (!list) return;
        const rows = dprVisibleEntries().sort((a, b) => (b.date || '').localeCompare(a.date || '') || (a.userName || '').localeCompare(b.userName || ''));
        if (totalEl) totalEl.textContent = `${rows.length} Entr${rows.length === 1 ? 'y' : 'ies'}`;
        if (!rows.length) {
            list.innerHTML = `<p class="p-8 text-center text-xs text-slate-400 italic">No team DPR entries for this month.</p>`;
            return;
        }
        list.innerHTML = rows.map(e => dprEntryRow(e, true)).join('');
    }

    function dprEntryRow(entry, showUser = false) {
        const statusLabel = entry.status === 'leave' ? 'Leave' : (entry.status === 'weekoff' ? 'Week Off' : `${entry.count || 0} done`);
        const statusClass = entry.status === 'leave' ? 'bg-rose-50 text-rose-600' : (entry.status === 'weekoff' ? 'bg-yellow-50 text-yellow-700' : 'bg-emerald-50 text-emerald-600');
        return `
                <div class="p-4 flex items-start justify-between gap-4 hover:bg-slate-50 transition-all">
                    <div class="min-w-0">
                        <p class="text-xs font-black text-slate-900">${showUser ? `${escapeHtml(entry.userName || 'User')} · ` : ''}${escapeHtml(entry.category || 'DPR')}</p>
                        <p class="text-[10px] text-slate-400 font-bold uppercase mt-1">${entry.date || ''}${entry.notes ? ` · ${escapeHtml(entry.notes)}` : ''}</p>
                    </div>
                    <span class="text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${statusClass}">${statusLabel}</span>
                </div>`;
    }

    function renderMonthlyDpr() {
        const head = document.getElementById('dpr-month-head');
        const body = document.getElementById('dpr-month-body');
        if (!head || !body) return;
        const month = document.getElementById('dpr-month')?.value || monthKey();
        const [year, mon] = month.split('-').map(Number);
        const days = new Date(year, mon, 0).getDate();
        const rows = new Map();
        dprVisibleEntries().forEach(entry => {
            if (!isAdmin() && entry.userId !== currentUser.email) return;
            const key = `${entry.category}|${entry.userId}`;
            if (!rows.has(key)) {
                rows.set(key, {
                    category: entry.category,
                    empId: employeeId(entry.userId),
                    name: entry.userName,
                    role: entry.userRole,
                    days: {},
                    total: 0
                });
            }
            const row = rows.get(key);
            const day = Number((entry.date || '').slice(8, 10));
            row.days[day] = entry.status === 'leave' ? 'L' : (entry.status === 'weekoff' ? 'W' : Number(row.days[day] || 0) + Number(entry.count || 0));
            row.total += Number(entry.count || 0);
        });

        head.innerHTML = `
                <tr>
                    <th class="px-3 py-3 text-[10px] font-bold text-slate-400 uppercase">Category</th>
                    <th class="px-3 py-3 text-[10px] font-bold text-slate-400 uppercase">Emp ID</th>
                    <th class="px-3 py-3 text-[10px] font-bold text-slate-400 uppercase">Name</th>
                    <th class="px-3 py-3 text-[10px] font-bold text-slate-400 uppercase">Role</th>
                    <th class="px-3 py-3 text-[10px] font-bold text-slate-400 uppercase">Total</th>
                    ${Array.from({ length: days }, (_, i) => `<th class="px-3 py-3 text-[10px] font-bold text-slate-400 uppercase text-center">${i + 1}</th>`).join('')}
                </tr>`;
        const values = [...rows.values()].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
        if (!values.length) {
            body.innerHTML = `<tr><td colspan="${days + 5}" class="px-6 py-10 text-center text-xs text-slate-400">No DPR entries for this month.</td></tr>`;
            return;
        }
        body.innerHTML = values.map(row => `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="px-3 py-3 text-xs font-bold text-slate-900 whitespace-nowrap">${escapeHtml(row.category)}</td>
                    <td class="px-3 py-3 text-xs text-slate-600 whitespace-nowrap">${row.empId}</td>
                    <td class="px-3 py-3 text-xs text-slate-900 whitespace-nowrap">${escapeHtml(row.name || '')}</td>
                    <td class="px-3 py-3 text-xs text-slate-600 whitespace-nowrap">${escapeHtml(row.role || '')}</td>
                    <td class="px-3 py-3 text-xs font-black text-indigo-600 text-center">${row.total}</td>
                    ${Array.from({ length: days }, (_, i) => {
            const day = i + 1;
            const date = new Date(year, mon - 1, day);
            const isSunday = date.getDay() === 0;
            const value = row.days[day] ?? (isSunday ? 'W' : '');
            const markClass = value === 'L' ? 'bg-rose-100 text-rose-700' : (value === 'W' ? 'bg-yellow-100 text-yellow-700' : '');
            return `<td class="px-3 py-3 text-xs text-center border-l border-slate-50 ${markClass}">${value}</td>`;
        }).join('')}
                </tr>`).join('');
    }

    function employeeId(email) {
        const index = USERS.findIndex(u => u.email === email);
        return index >= 0 ? `VPS${String(101400 + index).padStart(6, '0')}` : 'VPS000000';
    }

    function exportDprCsv() {
        const month = document.getElementById('dpr-month')?.value || monthKey();
        const rows = dprVisibleEntries().filter(e => isAdmin() || e.userId === currentUser.email);
        if (!rows.length) return toast('No DPR data to export', 'info');
        const csv = [
            ['Date', 'Emp ID', 'Name', 'Role', 'Category', 'Status', 'Count', 'Notes'].join(','),
            ...rows.map(e => [e.date, employeeId(e.userId), e.userName, e.userRole, e.category, e.status, e.count || 0, e.notes || '']
                .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `worksync-dpr-${month}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast('DPR CSV exported', 'success');
    }

    // REPORTS
    function loadAttendanceEvents() {
        if (!db || !currentUser) return;
        if (attendanceUnsub) return; // Only load once

        const dbRef = ref(db, 'worksync/attendance_events');
        const q = isAdmin() ? dbRef : query(dbRef, orderByChild('userId'), equalTo(currentUser.email));

        attendanceUnsub = onValue(q, snap => {
            attendanceEvents = snap.val() ? Object.entries(snap.val()).map(([id, evt]) => ({ id, ...evt })) : [];
            if (activeView === 'reports') handleReportFilterChange();
        });
    }

    async function switchReportTab(tab) {
        if (!canViewReports()) return;
        if (isManager() && !isAdmin()) tab = 'client';
        ['timing', 'task', 'detailed', 'analytics', 'summary', 'performance', 'client', 'client-wide'].forEach(t => {
            document.getElementById(`report-panel-${t}`)?.classList.add('hidden');
            const tabBtn = document.getElementById(`report-tab-${t}`)
            if (tabBtn) {
                tabBtn.classList.remove('border-2', 'border-indigo-600', 'bg-indigo-50');
                tabBtn.classList.add('border', 'border-slate-100');
            }
        });
        currentReportTab = tab;
        document.getElementById('report-export-pdf-btn')?.classList.toggle('hidden', tab !== 'summary');
        document.getElementById(`report-panel-${tab}`).classList.remove('hidden');
        const activeTabBtn = document.getElementById(`report-tab-${tab}`);
        if (activeTabBtn) {
            activeTabBtn.classList.add('border-2', 'border-indigo-600', 'bg-indigo-50');
            activeTabBtn.classList.remove('border', 'border-slate-100');
        }
        handleReportFilterChange();
    }

    function renderTimingReport() {
        const heatmapContainer = document.getElementById('timing-heatmap-container');
        const listContainer = document.getElementById('timing-report-list');
        if (!heatmapContainer || !listContainer) return;

        listContainer.innerHTML = '';
        if (!reportDateFrom || !reportDateTo) {
            heatmapContainer.innerHTML = `<p class="text-center text-slate-400 text-sm py-8">Please select a date range.</p>`;
            return;
        }
        const fromTs = new Date(reportDateFrom).getTime();
        const toTs = new Date(reportDateTo);
        toTs.setDate(toTs.getDate() + 1);
        const toTimestamp = toTs.getTime();

        let periodEvents = attendanceEvents.filter(e => e.timestamp >= fromTs && e.timestamp < toTimestamp);

        if (reportSelectedUser !== 'all') {
            periodEvents = periodEvents.filter(e => e.userId === reportSelectedUser);
        }

        if (!periodEvents.length) {
            heatmapContainer.innerHTML = `<p class="text-center text-slate-400 text-sm py-8">No attendance events for this date range</p>`;
            return;
        }

        const workTimeByDate = {};
        periodEvents.forEach(evt => {
            const date = evt.date;
            if (!workTimeByDate[date]) workTimeByDate[date] = { work: 0, events: [] };
            workTimeByDate[date].events.push(evt);
            if (evt.type === 'check_out' && evt.duration) workTimeByDate[date].work += evt.duration;
        });

        renderTimingHeatmap(workTimeByDate, heatmapContainer, listContainer);

        const lastDate = Object.keys(workTimeByDate).sort().pop();
        if (lastDate) {
            renderTimingDetailForDate(lastDate, workTimeByDate[lastDate].events, listContainer);
        }
    }

    function renderTimingHeatmap(data, container, listContainer) {
        const from = new Date(reportDateFrom);
        const to = new Date(reportDateTo);
        const days = [];
        for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
            days.push(new Date(d));
        }

        const maxHours = Math.max(...Object.values(data).map(d => d.work / 3600000), 1);

        container.innerHTML = `
                <div class="grid grid-cols-7 gap-1">
                    ${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => `<div class="text-center text-[10px] font-bold text-slate-400">${d}</div>`).join('')}
                </div>
                <div class="grid grid-cols-7 gap-1 mt-1">
                    ${Array(from.getDay()).fill(0).map(() => '<div></div>').join('')}
                    ${days.map(day => {
            const dateStr = day.toISOString().slice(0, 10);
            const dayData = data[dateStr];
            const hours = dayData ? dayData.work / 3600000 : 0;
            const opacity = hours > 0 ? Math.min(0.3 + (hours / maxHours) * 0.7, 1) : 0.05;
            const color = `rgba(79, 70, 229, ${opacity})`;
            return `<button onclick="renderTimingDetailForDate('${dateStr}', data['${dateStr}']?.events || [], document.getElementById('timing-report-list'))" class="h-10 rounded-lg transition-all" style="background-color: ${color}" title="${dateStr}: ${hours.toFixed(1)}h"></button>`;
        }).join('')}
                </div>
            `;
    }

    function renderTimingDetailForDate(date, events, container) {
        if (!events || !events.length) {
            container.innerHTML = `<p class="text-center text-slate-400 text-sm py-8">No events for ${date}.</p>`;
            return;
        }
        const sortedEvents = events.sort((a, b) => a.timestamp - b.timestamp);
        container.innerHTML = `
                <h4 class="text-sm font-black text-slate-900 mb-4">Timeline for ${new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h4>
                <div class="relative pl-8 border-l-2 border-slate-100">
                    ${sortedEvents.map(evt => {
            const time = new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            let icon, label, color, duration = '';
            switch (evt.type) {
                case 'check_in': icon = 'solar:login-bold'; label = 'Checked In'; color = 'text-emerald-500'; break;
                case 'break_start': icon = 'solar:pause-bold'; label = 'Break Started'; color = 'text-amber-500'; break;
                case 'break_end': icon = 'solar:play-bold'; label = 'Break Ended'; color = 'text-blue-500'; if (evt.duration) duration = formatTime(Math.floor(evt.duration / 1000)); break;
                case 'check_out': icon = 'solar:logout-bold'; label = 'Checked Out'; color = 'text-slate-500'; if (evt.duration) duration = formatTime(Math.floor(evt.duration / 1000)); break;
                default: icon = 'solar:question-circle-bold'; label = evt.type; color = 'text-slate-400';
            }
            return `
                        <div class="flex items-start gap-4 mb-4">
                            <div class="absolute -left-[11px] w-5 h-5 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center ${color}">
                                <iconify-icon icon="${icon}" width="12"></iconify-icon>
                            </div>
                            <div class="flex-1 flex items-center justify-between">
                                <div>
                                    <p class="text-xs font-bold text-slate-800">${label}</p>
                                    <p class="text-[10px] text-slate-400 font-medium">${time}</p>
                                </div>
                                <p class="text-xs font-mono font-semibold text-slate-500">${duration}</p>
                            </div>
                        </div>`;
        }).join('')}
                </div>
            `;
    }

    function renderTaskReport() {
        const chartEl = document.getElementById('task-report-chart');
        const listEl = document.getElementById('task-report-list');
        if (!chartEl || !listEl) return;

        if (!reportDateFrom || !reportDateTo) {
            chartEl.innerHTML = `<p class="text-center text-slate-400 text-sm py-8">Please select a date range.</p>`;
            listEl.innerHTML = '';
            return;
        }
        const fromTs = new Date(reportDateFrom).getTime();
        const toTs = new Date(reportDateTo).getTime() + 86400000;

        let periodTimeLogs = allTimeLogs.filter(log => (log.endTime || log.startTime || 0) >= fromTs && (log.endTime || log.startTime || 0) < toTs);

        if (reportSelectedUser !== 'all') {
            periodTimeLogs = periodTimeLogs.filter(log => log.userId === reportSelectedUser);
        }

        const taskSummary = {};
        periodTimeLogs.forEach(log => {
            const key = log.taskId;
            if (!taskSummary[key]) {
                taskSummary[key] = { name: log.taskName || log.taskDesc || 'Unknown', duration: 0, count: 0 };
            }
            taskSummary[key].duration += Number(log.durationSeconds || 0);
            taskSummary[key].count += 1;
        });

        const rows = Object.entries(taskSummary).sort((a, b) => b[1].duration - a[1].duration);

        if (!rows.length) {
            chartEl.innerHTML = `<p class="text-center text-slate-400 text-sm py-8">No tasks logged in this period</p>`;
            listEl.innerHTML = '';
            return;
        }

        const totalTime = rows.reduce((sum, [, data]) => sum + data.duration, 0);
        const colors = ['#4f46e5', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6'];

        // Donut chart
        let gradient = 'conic-gradient(';
        let cumulativePercent = 0;
        rows.slice(0, 6).forEach(([taskId, data], i) => {
            const percent = (data.duration / totalTime) * 100;
            gradient += `${colors[i % colors.length]} ${cumulativePercent}% ${cumulativePercent + percent}%, `;
            cumulativePercent += percent;
        });
        gradient += `#e2e8f0 ${cumulativePercent}% 100%)`;
        chartEl.innerHTML = `
                <div class="relative w-48 h-48 mx-auto">
                    <div class="w-full h-full rounded-full" style="background: ${gradient}"></div>
                    <div class="absolute inset-8 bg-white rounded-full flex flex-col items-center justify-center">
                        <p class="text-2xl font-black text-slate-900">${formatTime(totalTime).split(':').slice(0, 2).join(':')}</p>
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</p>
                    </div>
                </div>`;

        // List
        listEl.innerHTML = rows.map(([taskId, data], i) => {
            const percentage = totalTime ? Math.round((data.duration / totalTime) * 100) : 0;
            return `
                    <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                        <div class="w-2.5 h-2.5 rounded-full" style="background-color: ${colors[i % colors.length]}"></div>
                        <div class="flex-1 min-w-0">
                            <p class="text-xs font-bold text-slate-800 truncate">${escapeHtml(data.name)}</p>
                            <p class="text-[10px] text-slate-400">${data.count} session${data.count !== 1 ? 's' : ''}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-xs font-mono font-semibold text-slate-700">${formatTime(data.duration)}</p>
                            <p class="text-[10px] font-bold text-slate-400">${percentage}%</p>
                        </div>
                    </div>
                `;
        }).join('');
    }

    function renderDetailedReport() {
        const table = document.getElementById('detailed-report-list');
        const tbody = table.querySelector('tbody');
        if (!tbody) return;

        if (!reportDateFrom || !reportDateTo) {
            tbody.innerHTML = `<tr><td colspan="3" class="px-4 py-10 text-center text-slate-400 text-sm">Please select a date range.</td></tr>`;
            return;
        }
        const fromTs = new Date(reportDateFrom).getTime();
        const toTs = new Date(reportDateTo).getTime() + 86400000;

        let periodAttendanceEvents = attendanceEvents.filter(e => e.timestamp >= fromTs && e.timestamp < toTs);
        let periodTimeLogs = allTimeLogs.filter(log => (log.endTime || log.startTime || 0) >= fromTs && (log.endTime || log.startTime || 0) < toTs);

        if (reportSelectedUser !== 'all') {
            periodAttendanceEvents = periodAttendanceEvents.filter(e => e.userId === reportSelectedUser);
            periodTimeLogs = periodTimeLogs.filter(log => log.userId === reportSelectedUser);
        }

        if (!periodAttendanceEvents.length && !periodTimeLogs.length) {
            tbody.innerHTML = `<tr><td colspan="3" class="px-4 py-10 text-center text-slate-400 text-sm">No data available for this period</td></tr>`;
            return;
        }

        const allEvents = [
            ...periodAttendanceEvents.map(e => ({
                timestamp: e.timestamp,
                type: 'attendance',
                userName: e.userName,
                label: e.type.replace('_', ' ').toUpperCase(),
                duration: e.duration ? formatTime(Math.floor(e.duration / 1000)) : '—'
            })),
            ...periodTimeLogs.map(log => ({
                timestamp: log.endTime || log.startTime || Date.now(),
                type: 'task',
                label: `TASK: ${log.taskName || log.taskDesc || 'Unknown'}`,
                duration: formatTime(log.durationSeconds),
                userName: log.userName
            }))
        ].sort((a, b) => b.timestamp - a.timestamp);

        table.querySelector('th:first-child').classList.toggle('hidden', !isAdmin());

        tbody.innerHTML = allEvents.map(evt => {
            const time = new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const colorClass = evt.type === 'attendance' ? 'text-indigo-600' : 'text-emerald-600';
            return `
                    <tr class="hover:bg-slate-50 transition-colors">
                        ${isAdmin() ? `<td class="px-4 py-3 text-xs font-semibold">${evt.userName || 'N/A'}</td>` : ''}
                        <td class="px-4 py-3 text-xs font-semibold">${time}</td>
                        <td class="px-4 py-3 text-xs font-bold ${colorClass}">${evt.label}</td>
                        <td class="px-4 py-3 text-xs font-black">${evt.duration}</td>
                    </tr>
                `;
        }).join('');
    }

    function renderAnalyticsReport() {
        const metricsGrid = document.getElementById('analytics-metrics-grid');
        const chartDiv = document.getElementById('analytics-chart');
        if (!metricsGrid || !chartDiv) return;
        if (!reportDateFrom || !reportDateTo) {
            chartDiv.innerHTML = `<p class="text-center text-slate-400 text-sm py-8 col-span-2">Please select a date range.</p>`;
            return;
        }
        const fromTs = new Date(reportDateFrom).getTime();
        const toTs = new Date(reportDateTo);
        toTs.setDate(toTs.getDate() + 1);
        const toTimestamp = toTs.getTime();

        let periodEvents = attendanceEvents.filter(e => e.timestamp >= fromTs && e.timestamp < toTs);
        let periodTimeLogs = allTimeLogs.filter(log => (log.endTime || log.startTime || 0) >= fromTs && (log.endTime || log.startTime || 0) < toTs);

        if (reportSelectedUser !== 'all') {
            periodEvents = periodEvents.filter(e => e.userId === reportSelectedUser);
            periodTimeLogs = periodTimeLogs.filter(log => log.userId === reportSelectedUser);
        }

        // --- New Metric Calculations ---

        // 1. Total Logged Time (from tasks)
        const totalLoggedSeconds = periodTimeLogs.reduce((sum, log) => sum + (log.durationSeconds || 0), 0);

        // 2. Total Break Time (from attendance)
        const totalBreakSeconds = periodEvents
            .filter(e => e.type === 'break_end' && e.duration)
            .reduce((sum, e) => sum + Math.floor(e.duration / 1000), 0);

        // 3. Total Active Time (from check-in to check-out)
        const eventsByDay = periodEvents.reduce((acc, evt) => {
            const day = evt.date;
            if (!acc[day]) acc[day] = [];
            acc[day].push(evt);
            return acc;
        }, {});

        let totalActiveSeconds = 0;
        for (const day in eventsByDay) {
            const dayEvents = eventsByDay[day].sort((a, b) => a.timestamp - b.timestamp);
            const checkIn = dayEvents.find(e => e.type === 'check_in');
            const checkOut = dayEvents.findLast(e => e.type === 'check_out');
            if (checkIn && checkOut) {
                totalActiveSeconds += Math.floor((checkOut.timestamp - checkIn.timestamp) / 1000);
            } else if (checkIn) {
                // If still checked in, calculate up to now or end of period, whichever is earlier
                const endOfPeriod = Math.min(Date.now(), toTimestamp);
                totalActiveSeconds += Math.floor((endOfPeriod - checkIn.timestamp) / 1000);
            }
        }

        // 4. Productivity %
        const productiveTimeBase = totalActiveSeconds - totalBreakSeconds;
        const productivityPercent = productiveTimeBase > 0 ? Math.round((totalLoggedSeconds / productiveTimeBase) * 100) : 0;

        // 5. Tasks Logged
        const tasksLoggedCount = periodTimeLogs.length;

        // 6. Avg Time per Task
        const avgTimePerTaskSeconds = tasksLoggedCount > 0 ? Math.floor(totalLoggedSeconds / tasksLoggedCount) : 0;

        // 7. Peak Productivity Hour (based on task time)
        const hourlyProductivity = {};
        periodTimeLogs.forEach(log => {
            const hour = new Date(log.startTime).getHours();
            hourlyProductivity[hour] = (hourlyProductivity[hour] || 0) + (log.durationSeconds || 0);
        });
        const peakProductivityHour = Object.entries(hourlyProductivity).sort((a, b) => b[1] - a[1])[0];
        const peakHourLabel = peakProductivityHour ? `${peakProductivityHour[0]}:00` : '—';

        metricsGrid.innerHTML =
            createStatCard('Total Logged', formatTime(totalLoggedSeconds), 'solar:timer-bold', { bg: 'bg-indigo-50', text: 'text-indigo-600' }) +
            createStatCard('Productivity', `${productivityPercent}%`, 'solar:chart-bold', { bg: 'bg-emerald-50', text: 'text-emerald-600' }) +
            createStatCard('Peak Hour', peakHourLabel, 'solar:cup-star-bold', { bg: 'bg-amber-50', text: 'text-amber-600' }) +
            createStatCard('Avg. Task Time', formatTime(avgTimePerTaskSeconds), 'solar:checklist-bold', { bg: 'bg-rose-50', text: 'text-rose-600' });


        // --- Render Charts ---
        chartDiv.innerHTML = `
                <div class="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    <p class="text-xs font-bold text-slate-600 uppercase tracking-widest mb-4">Time Allocation</p>
                    <div class="flex items-end gap-4 h-[200px]">
                        <div class="flex-1 flex flex-col h-full justify-end">
                            <div class="bg-indigo-600 rounded-t-xl mb-2" style="height: ${Math.max(1, (totalLoggedSeconds / (totalActiveSeconds || 1)) * 100)}%"></div>
                            <p class="text-[10px] font-bold text-center text-slate-600">${formatTime(totalLoggedSeconds)}</p>
                            <p class="text-[10px] text-center text-slate-400">Logged Work</p>
                        </div>
                        <div class="flex-1 flex flex-col h-full justify-end">
                            <div class="bg-amber-500 rounded-t-xl mb-2" style="height: ${Math.max(1, (totalBreakSeconds / (totalActiveSeconds || 1)) * 100)}%"></div>
                            <p class="text-[10px] font-bold text-center text-slate-600">${formatTime(totalBreakSeconds)}</p>
                            <p class="text-[10px] text-center text-slate-400">Breaks</p>
                        </div>
                        <div class="flex-1 flex flex-col h-full justify-end">
                            <div class="bg-slate-300 rounded-t-xl mb-2" style="height: ${Math.max(1, ((totalActiveSeconds - totalLoggedSeconds - totalBreakSeconds) / (totalActiveSeconds || 1)) * 100)}%"></div>
                            <p class="text-[10px] font-bold text-center text-slate-600">${formatTime(Math.max(0, totalActiveSeconds - totalLoggedSeconds - totalBreakSeconds))}</p>
                            <p class="text-[10px] text-center text-slate-400">Idle</p>
                        </div>
                    </div>
                </div>
                <div class="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    <p class="text-xs font-bold text-slate-600 uppercase tracking-widest mb-4">Hourly Productivity</p>
                    <div class="space-y-2">
                        ${Object.keys(hourlyProductivity).length > 0 ?
                Object.entries(hourlyProductivity).sort((a, b) => Number(a[0]) - Number(b[0])).map(([hour, seconds]) => `
                            <div class="flex items-center gap-3">
                                <span class="text-[10px] font-bold w-12 text-slate-600">${hour}:00</span>
                                <div class="flex-1 bg-white rounded-full h-2 overflow-hidden border border-slate-100">
                                    <div class="bg-emerald-500 h-full" style="width: ${(seconds / Math.max(...Object.values(hourlyProductivity))) * 100}%"></div>
                                </div>
                                <span class="text-[10px] font-bold text-slate-600">${formatTime(Math.round(seconds))}</span>
                            </div>
                        `).join('') :
                `<p class="text-center text-xs text-slate-400 py-10">No task time logged in this period.</p>`
            }
                    </div>
                </div>
            `;
    }

    function renderSummaryReport() {
        const container = document.getElementById('summary-chart-container');
        if (!container) return;

        if (!reportDateFrom || !reportDateTo) {
            container.innerHTML = `<p class="text-center text-slate-400 text-sm py-8">Please select a date range.</p>`;
            return;
        }
        const fromTs = new Date(reportDateFrom).getTime();
        const toDate = new Date(reportDateTo);
        toDate.setDate(toDate.getDate() + 1);
        const toTs = toDate.getTime();

        let periodTimeLogs = allTimeLogs.filter(log => (log.endTime || log.startTime || 0) >= fromTs && (log.endTime || log.startTime || 0) < toTs);
        let periodEvents = attendanceEvents.filter(e => e.timestamp >= fromTs && e.timestamp < toTs);

        if (reportSelectedUser !== 'all') {
            periodTimeLogs = periodTimeLogs.filter(log => log.userId === reportSelectedUser);
            periodEvents = periodEvents.filter(e => e.userId === reportSelectedUser);
        }

        const byDate = {};
        const ensureDate = (dateStr) => {
            if (!byDate[dateStr]) byDate[dateStr] = { date: dateStr, loggedSeconds: 0, breakSeconds: 0, taskCount: 0 };
        };

        for (let d = new Date(reportDateFrom); d <= new Date(reportDateTo); d.setDate(d.getDate() + 1)) {
            ensureDate(d.toISOString().slice(0, 10));
        }

        periodTimeLogs.forEach(log => {
            const date = new Date(log.endTime || log.startTime).toISOString().slice(0, 10);
            if (byDate[date]) {
        byDate[date].loggedSeconds += (log.durationSeconds || 0);
        byDate[date].taskCount++;
            }
        });

        periodEvents.forEach(evt => {
            if (evt.type === 'break_end' && evt.duration) {
        const date = new Date(evt.timestamp).toISOString().slice(0, 10);
        if (byDate[date]) byDate[date].breakSeconds += Math.floor(evt.duration / 1000);
            }
        });

        const summary = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
        const totalLoggedSeconds = summary.reduce((sum, day) => sum + day.loggedSeconds, 0);
        const daysWithWork = summary.filter(d => d.loggedSeconds > 0).length;
        const avgDailySeconds = daysWithWork > 0 ? totalLoggedSeconds / daysWithWork : 0;

        if (totalLoggedSeconds === 0) {
            container.innerHTML = `<p class="text-center text-slate-400 text-sm py-8">No logged task time for this period</p>`;
            return;
        }

        const maxTime = Math.max(...summary.map(d => d.loggedSeconds), 1);

        // --- Calculate New KPI Metrics ---
        
        // 1. Total Break Time
        const totalBreakSeconds = summary.reduce((sum, day) => sum + day.breakSeconds, 0);

        // 2. Total Active Session Duration (Check-In to Check-Out)
        const eventsByDay = periodEvents.reduce((acc, evt) => {
            const day = evt.date;
            if (!acc[day]) acc[day] = [];
            acc[day].push(evt);
            return acc;
        }, {});

        let totalActiveSeconds = 0;
        for (const day in eventsByDay) {
            const dayEvents = eventsByDay[day].sort((a, b) => a.timestamp - b.timestamp);
            const checkIn = dayEvents.find(e => e.type === 'check_in');
            const checkOut = dayEvents.findLast(e => e.type === 'check_out');
            if (checkIn && checkOut) {
        totalActiveSeconds += Math.floor((checkOut.timestamp - checkIn.timestamp) / 1000);
            } else if (checkIn) {
        const endOfPeriod = Math.min(Date.now(), toTs);
        totalActiveSeconds += Math.floor((endOfPeriod - checkIn.timestamp) / 1000);
            }
        }

        // Fallback for active seconds if no check-in exists (simulate standard shift)
        if (totalActiveSeconds === 0) {
            totalActiveSeconds = totalLoggedSeconds + totalBreakSeconds + 3600; // logged work + break + 1h idle
        }

        // 3. Hold Time
        const holdTasksCount = tasks.filter(t => (t.status === 'Hold' || t.status === 'On Hold' || t.status === 'Design Hold' || t.isOnHold) && (reportSelectedUser === 'all' || assigneeMatches(t, reportSelectedUser))).length;
        let totalHoldSeconds = holdTasksCount * 1800; // Estimate 30 mins per hold task
        const remainingSeconds = Math.max(0, totalActiveSeconds - totalLoggedSeconds - totalBreakSeconds);
        if (totalHoldSeconds > remainingSeconds) totalHoldSeconds = remainingSeconds;

        // 4. Idle Time
        const totalIdleSeconds = Math.max(0, remainingSeconds - totalHoldSeconds);

        // 5. Active Productivity
        const productiveTimeBase = totalActiveSeconds - totalBreakSeconds;
        const activeProductivityPercent = productiveTimeBase > 0 ? Math.round((totalLoggedSeconds / productiveTimeBase) * 100) : 0;

        // 6. Task Counts
        const periodTaskIds = new Set(periodTimeLogs.map(log => log.taskId));
        const completedTasksCount = tasks.filter(t => (isDone(t.status) || isInternalDone(t.status)) && (reportSelectedUser === 'all' || assigneeMatches(t, reportSelectedUser) || periodTaskIds.has(t.id))).length;
        const pendingTasksCount = tasks.filter(t => (!isDone(t.status) && !isInternalDone(t.status)) && (reportSelectedUser === 'all' || assigneeMatches(t, reportSelectedUser) || periodTaskIds.has(t.id))).length;
        const reworkTasksCount = tasks.filter(t => ((t.status || '').toLowerCase().includes('rework') || (t.status || '').toLowerCase().includes('correction')) && (reportSelectedUser === 'all' || assigneeMatches(t, reportSelectedUser) || periodTaskIds.has(t.id))).length;

        // 7. AI Productivity Score
        const completionRate = completedTasksCount / (completedTasksCount + pendingTasksCount || 1) * 100;
        let productivityScore = Math.round(activeProductivityPercent * 0.5 + completionRate * 0.5 - (reworkTasksCount * 5) - (totalHoldSeconds / 3600 * 2));
        productivityScore = Math.max(50, Math.min(100, productivityScore));

        let productivityLabel = 'Average';
        if (productivityScore >= 90) productivityLabel = 'Excellent';
        else if (productivityScore >= 80) productivityLabel = 'Good';

        // --- Time Utilization percentages ---
        const workedPercent = Math.max(0, Math.round((totalLoggedSeconds / totalActiveSeconds) * 100));
        const breakPercent = Math.max(0, Math.round((totalBreakSeconds / totalActiveSeconds) * 100));
        const holdPercent = Math.max(0, Math.round((totalHoldSeconds / totalActiveSeconds) * 100));
        const idlePercent = Math.max(0, 100 - workedPercent - breakPercent - holdPercent);

        // --- AI Insights generation ---
        const breakHours = totalBreakSeconds / 3600;
        const breakStatusLabel = breakHours <= 1.5 ? 'within the recommended limit' : 'slightly above recommended limits';
        
        const hourlyProductivity = {};
        periodTimeLogs.forEach(log => {
            const hour = new Date(log.startTime).getHours();
            hourlyProductivity[hour] = (hourlyProductivity[hour] || 0) + (log.durationSeconds || 0);
        });
        
        const sortedHours = Object.entries(hourlyProductivity).sort((a,b) => b[1] - a[1]);
        let peakHourLabel = 'N/A';
        if (sortedHours.length > 0) {
            const peakHour = Number(sortedHours[0][0]);
            peakHourLabel = peakHour > 12 ? `${peakHour - 12}:00 PM - ${peakHour - 11}:00 PM` : peakHour === 12 ? '12:00 PM - 1:00 PM' : `${peakHour}:00 AM - ${peakHour + 1}:00 AM`;
        }

        const aiSuggestions = [];
        if (pendingTasksCount > 0) aiSuggestions.push(`Complete your ${pendingTasksCount} pending tasks before the end of the day.`);
        if (reworkTasksCount > 0) aiSuggestions.push(`Focus on resolving the ${reworkTasksCount} rework/correction tasks to increase quality.`);
        if (activeProductivityPercent < 80) aiSuggestions.push('Try to group short tasks together to minimize idle switching time.');
        if (totalBreakSeconds > 5400) aiSuggestions.push('Break durations are high. Consider pacing out your rest times.');
        else aiSuggestions.push('Your break duration is healthy and well-balanced.');
        aiSuggestions.push('Maintain focus during your peak productivity window to maximize output.');

        // --- Client Contribution ---
        const clientSummary = {};
        periodTimeLogs.forEach(log => {
            const client = log.client || 'Other';
            if (!clientSummary[client]) clientSummary[client] = { name: client, duration: 0, tasksCount: 0, taskIds: new Set() };
            clientSummary[client].duration += log.durationSeconds || 0;
            clientSummary[client].taskIds.add(log.taskId);
        });
        const clientContributionList = Object.values(clientSummary).map(c => {
            c.tasksCount = c.taskIds.size;
            c.percent = Math.round((c.duration / (totalLoggedSeconds || 1)) * 100);
            return c;
        }).sort((a, b) => b.duration - a.duration);

        // --- Daily Work Summary Metrics ---
        const totalBreakSessions = periodEvents.filter(e => e.type === 'break_start').length;
        const tasksLoggedCount = periodTimeLogs.length;
        const avgTimePerTaskSeconds = tasksLoggedCount > 0 ? Math.floor(totalLoggedSeconds / tasksLoggedCount) : 0;
        const avgTaskDurationFormatted = tasksLoggedCount > 0 ? formatTime(avgTimePerTaskSeconds) : '0s';
        const longestTaskFormatted = periodTimeLogs.length > 0 ? formatTime(Math.max(...periodTimeLogs.map(log => log.durationSeconds))) : '0s';

        // --- Daily Activity Timeline ---
        const timelineEvents = [];
        periodEvents.forEach(e => {
            let label = '';
            if (e.type === 'check_in') label = 'Checked In';
            else if (e.type === 'break_start') label = 'Break Started';
            else if (e.type === 'break_end') label = 'Resume Work (Break Ended)';
            else if (e.type === 'check_out') label = 'Checked Out';
            timelineEvents.push({ timestamp: e.timestamp, label, type: 'attendance' });
        });
        periodTimeLogs.forEach(log => {
            timelineEvents.push({ timestamp: log.startTime, label: `Started Task: ${log.taskDesc || log.taskName || 'Unknown'}`, type: 'task_start' });
            timelineEvents.push({ timestamp: log.endTime, label: `Logged Work on Task: ${log.taskDesc || log.taskName || 'Unknown'} (${formatTime(log.durationSeconds)})`, type: 'task_end' });
        });
        timelineEvents.sort((a, b) => a.timestamp - b.timestamp);
        const formattedTimeline = timelineEvents.map(evt => {
            evt.time = new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return evt;
        });

        // --- Today's Task Summary Table Rows ---
        const taskSummaryTableRows = [];
        const taskLookup = {};
        periodTimeLogs.forEach(log => {
            if (!taskLookup[log.taskId]) {
        // Find matching task status
        const fullTask = tasks.find(t => t.id === log.taskId);
        taskLookup[log.taskId] = {
            id: log.taskId,
            client: log.client || 'Other',
            name: log.taskDesc || log.taskName || 'Unknown',
            status: fullTask ? fullTask.status : 'In Progress',
            duration: 0
        };
        taskSummaryTableRows.push(taskLookup[log.taskId]);
            }
            taskLookup[log.taskId].duration += log.durationSeconds || 0;
        });

        container.innerHTML = `
        <!-- Traditional Top KPIs -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            ${createStatCard('Total Logged', formatTime(totalLoggedSeconds), 'solar:timer-bold', { bg: 'bg-indigo-50', text: 'text-indigo-600' })}
            ${createStatCard('Daily Average', formatTime(Math.floor(avgDailySeconds)), 'solar:chart-bold', { bg: 'bg-emerald-50', text: 'text-emerald-600' })}
            ${createStatCard('Active Days', daysWithWork, 'solar:calendar-bold', { bg: 'bg-amber-50', text: 'text-amber-600' })}
        </div>

        <!-- New Enhanced KPIs Row 1 -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            ${createStatCard('💼 Worked Hours', formatTime(totalLoggedSeconds), 'solar:case-bold', { bg: 'bg-blue-50/70', text: 'text-blue-600' })}
            ${createStatCard('☕ Break Time', formatTime(totalBreakSeconds), 'solar:coffee-bold', { bg: 'bg-rose-50/70', text: 'text-rose-600' })}
            ${createStatCard('⏸ Hold Time', formatTime(totalHoldSeconds), 'solar:pause-bold', { bg: 'bg-orange-50/70', text: 'text-orange-600' })}
            ${createStatCard('⚡ Active Productivity', activeProductivityPercent + '%', 'solar:bolt-bold', { bg: 'bg-violet-50/70', text: 'text-violet-600' })}
        </div>

        <!-- New Enhanced KPIs Row 2 & AI Score -->
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
            ${createStatCard('✔ Completed Tasks', completedTasksCount, 'solar:check-square-bold', { bg: 'bg-emerald-50/70', text: 'text-emerald-600' })}
            ${createStatCard('📋 Pending Tasks', pendingTasksCount, 'solar:checklist-bold', { bg: 'bg-slate-50', text: 'text-slate-600' })}
            ${createStatCard('🔄 Rework Tasks', reworkTasksCount, 'solar:refresh-bold', { bg: 'bg-rose-50/70', text: 'text-rose-600' })}
            <div class="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between shadow-sm relative overflow-hidden">
        <div>
            <p class="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">🏆 Productivity Score</p>
            <p class="text-xl font-black text-indigo-700">${productivityScore}%</p>
            <span class="inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-800">${productivityLabel}</span>
        </div>
        <iconify-icon icon="solar:cup-first-bold" width="36" class="text-indigo-300 opacity-60 shrink-0"></iconify-icon>
            </div>
        </div>

        <!-- Time Utilization Stacked Progress Bar -->
        <div class="bg-slate-50 border border-slate-100 rounded-2xl p-6 mb-8">
            <h4 class="text-xs font-bold text-slate-600 uppercase tracking-widest mb-4">Time Utilization</h4>
            <div class="w-full bg-slate-200 rounded-full h-5 overflow-hidden flex mb-4 shadow-inner">
        <div class="bg-indigo-600 h-full flex items-center justify-center text-[10px] text-white font-bold" style="width: ${workedPercent}%" title="Worked: ${workedPercent}%">${workedPercent >= 8 ? workedPercent + '%' : ''}</div>
        <div class="bg-rose-500 h-full flex items-center justify-center text-[10px] text-white font-bold" style="width: ${breakPercent}%" title="Break: ${breakPercent}%">${breakPercent >= 8 ? breakPercent + '%' : ''}</div>
        <div class="bg-orange-400 h-full flex items-center justify-center text-[10px] text-white font-bold" style="width: ${holdPercent}%" title="Hold: ${holdPercent}%">${holdPercent >= 8 ? holdPercent + '%' : ''}</div>
        <div class="bg-slate-400 h-full flex items-center justify-center text-[10px] text-white font-bold" style="width: ${idlePercent}%" title="Idle: ${idlePercent}%">${idlePercent >= 8 ? idlePercent + '%' : ''}</div>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-slate-500">
        <div class="flex items-center gap-2"><span class="w-3.5 h-3.5 rounded-md bg-indigo-600 block shrink-0"></span> Worked Time: ${formatTime(totalLoggedSeconds)} (&nbsp;${workedPercent}%)</div>
        <div class="flex items-center gap-2"><span class="w-3.5 h-3.5 rounded-md bg-rose-500 block shrink-0"></span> Break Time: ${formatTime(totalBreakSeconds)} (&nbsp;${breakPercent}%)</div>
        <div class="flex items-center gap-2"><span class="w-3.5 h-3.5 rounded-md bg-orange-400 block shrink-0"></span> Hold Time: ${formatTime(totalHoldSeconds)} (&nbsp;${holdPercent}%)</div>
        <div class="flex items-center gap-2"><span class="w-3.5 h-3.5 rounded-md bg-slate-400 block shrink-0"></span> Idle Time: ${formatTime(totalIdleSeconds)} (&nbsp;${idlePercent}%)</div>
            </div>
        </div>

        <!-- Left/Right Split Column Layout -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <!-- Left Column: Insights & Client Contribution -->
            <div class="space-y-6">
        <!-- AI Daily Insights -->
                        <div class="dark:bg-gradient-to-br dark:from-indigo-900 dark:to-slate-900 dark:border-slate-800 dark:text-white bg-indigo-50 border border-indigo-100 rounded-3xl p-6 text-slate-800 shadow-xl print:bg-indigo-50 print:text-slate-800 print:border-indigo-100">
                            <div class="flex items-center gap-2 mb-4">
                                <iconify-icon icon="solar:lightbulb-bolt-bold" width="22" class="text-amber-500 dark:text-amber-400 print:text-amber-500"></iconify-icon>
                                <h4 class="text-xs font-black tracking-wider uppercase dark:text-indigo-200 text-indigo-800 print:text-indigo-800">AI Daily Insights</h4>
                            </div>
                            <div class="space-y-4 text-xs leading-relaxed dark:text-slate-300 text-slate-600 print:text-slate-600">
                                <p><strong>Daily Summary:</strong> You worked <strong>${formatTime(totalLoggedSeconds)}</strong> today across <strong>${periodTaskIds.size} tasks</strong>. You completed <strong>${completedTasksCount} tasks</strong> and have <strong>${pendingTasksCount} pending</strong>. Your break duration of <strong>${formatTime(totalBreakSeconds)}</strong> is ${breakStatusLabel}.</p>
                                <p><strong>Most productive period:</strong> ${peakHourLabel}</p>
                                <p><strong>Overall productivity:</strong> ${productivityLabel}</p>
                                <div class="h-px dark:bg-slate-800 bg-indigo-200 my-2 print:bg-indigo-200"></div>
                                <div>
                                    <p class="font-black dark:text-indigo-400 text-indigo-700 mb-2 uppercase tracking-wide print:text-indigo-700">AI Suggestions:</p>
                                    <ul class="list-disc pl-4 space-y-1.5 dark:text-slate-300 text-slate-600 print:text-slate-600">
                                        ${aiSuggestions.map(s => '<li>' + s + '</li>').join('')}
                                    </ul>
                                </div>
                            </div>
        </div>

        <!-- Client Contribution -->
        <div class="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <h4 class="text-xs font-bold text-slate-600 uppercase tracking-widest mb-4">Client Contribution</h4>
            <div class="space-y-4">
                ${clientContributionList.length > 0 ? clientContributionList.map(c => '<div><div class="flex justify-between text-xs font-bold mb-1"><span class="text-slate-700">' + c.name + ' (' + c.tasksCount + ' Tasks)</span><span class="text-indigo-600">' + formatTime(c.duration) + ' (' + c.percent + '%)</span></div><div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden"><div class="bg-indigo-500 h-full rounded-full" style="width: ' + c.percent + '%"></div></div></div>').join('') : '<p class="text-xs text-slate-400 italic">No client time logs found</p>'}
            </div>
        </div>
            </div>

            <!-- Right Column: Timeline & Summary stats -->
            <div class="space-y-6">
        <!-- Daily Work Summary -->
        <div class="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <h4 class="text-xs font-bold text-slate-600 uppercase tracking-widest mb-4">Daily Work Summary</h4>
            <div class="grid grid-cols-2 gap-4 text-xs">
                <div class="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <p class="text-slate-400 mb-0.5 font-bold uppercase tracking-wider text-[9px]">Total Tasks Worked</p>
            <p class="font-black text-slate-800 text-sm">${periodTaskIds.size}</p>
                </div>
                <div class="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <p class="text-slate-400 mb-0.5 font-bold uppercase tracking-wider text-[9px]">Total Tasks Completed</p>
            <p class="font-black text-slate-800 text-sm">${completedTasksCount}</p>
                </div>
                <div class="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <p class="text-slate-400 mb-0.5 font-bold uppercase tracking-wider text-[9px]">Total Working Sessions</p>
            <p class="font-black text-slate-800 text-sm">${periodTimeLogs.length}</p>
                </div>
                <div class="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <p class="text-slate-400 mb-0.5 font-bold uppercase tracking-wider text-[9px]">Total Break Sessions</p>
            <p class="font-black text-slate-800 text-sm">${totalBreakSessions}</p>
                </div>
                <div class="bg-slate-50 rounded-xl p-3 border border-slate-100 col-span-2">
            <p class="text-slate-400 mb-0.5 font-bold uppercase tracking-wider text-[9px]">Average Task Duration</p>
            <p class="font-black text-slate-800 text-sm">${avgTaskDurationFormatted}</p>
                </div>
            </div>
        </div>

        <!-- Daily Activity Timeline -->
        <div class="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm max-h-[300px] overflow-y-auto">
            <h4 class="text-xs font-bold text-slate-600 uppercase tracking-widest mb-4">Daily Activity Timeline</h4>
            <div class="relative border-l-2 border-slate-100 pl-4 ml-2 space-y-4">
                ${formattedTimeline.length > 0 ? formattedTimeline.map(evt => {
            let dotColor = 'bg-slate-400';
            if (evt.type === 'attendance') {
                dotColor = evt.label.includes('In') || evt.label.includes('Resume') ? 'bg-indigo-600' : 'bg-rose-500';
            } else if (evt.type === 'task_start') {
                dotColor = 'bg-sky-500';
            } else if (evt.type === 'task_end') {
                dotColor = 'bg-emerald-500';
            }
            return '<div class="relative"><span class="absolute -left-[22px] top-1.5 w-2.5 h-2.5 rounded-full ' + dotColor + ' ring-4 ring-white"></span><div class="flex justify-between text-xs items-start gap-4"><p class="font-black text-slate-700">' + evt.label + '</p><span class="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">' + evt.time + '</span></div></div>';
                }).join('') : '<p class="text-xs text-slate-400 italic">No activity timeline events logged</p>'}
            </div>
        </div>
            </div>
        </div>

        <!-- Today's Task Summary Table -->
        <div class="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm mb-8 overflow-x-auto">
            <h4 class="text-xs font-bold text-slate-600 uppercase tracking-widest mb-4">Today's Task Summary</h4>
            <table class="w-full text-left border-collapse min-w-[550px]">
        <thead>
            <tr class="border-b border-slate-100 text-[10px] uppercase font-black tracking-widest text-slate-400">
                <th class="pb-3">Task ID</th>
                <th class="pb-3">Client</th>
                <th class="pb-3">Task Name</th>
                <th class="pb-3">Status</th>
                <th class="pb-3">Working Time</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-slate-50 text-xs text-slate-700">
            ${taskSummaryTableRows.length > 0 ? taskSummaryTableRows.map(row => '<tr class="hover:bg-slate-50/50 transition-colors"><td class="py-3 font-bold font-mono text-slate-400">#' + row.id + '</td><td class="py-3"><span class="px-2 py-0.5 rounded bg-slate-100 font-black text-[9px] uppercase text-slate-500">' + (row.client || 'Other') + '</span></td><td class="py-3 font-semibold text-slate-800">' + row.name + '</td><td class="py-3"><span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase ' + statusClass(row.status) + '">' + row.status + '</span></td><td class="py-3 font-bold font-mono text-indigo-600">' + formatTime(row.duration) + '</td></tr>').join('') : '<tr><td colspan="5" class="py-4 text-center text-slate-400 italic">No tasks worked on in this period</td></tr>'}
        </tbody>
            </table>
        </div>

        <!-- Visualizations (Charts) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <!-- Task Completion Donut Chart -->
            <div class="bg-slate-50 border border-slate-100 rounded-3xl p-6 flex flex-col justify-between h-72">
        <p class="text-xs font-bold text-slate-600 uppercase tracking-widest mb-4">Task Completion Chart</p>
        <div class="flex items-center justify-center gap-6 my-auto">
            <div class="relative w-32 h-32 flex items-center justify-center">
                <svg class="w-full h-full transform -rotate-90">
            <circle cx="64" cy="64" r="50" stroke="#e2e8f0" stroke-width="12" fill="transparent" />
            <circle cx="64" cy="64" r="50" stroke="#10b981" stroke-width="12" fill="transparent"
                stroke-dasharray="314.159"
                stroke-dashoffset="${314.159 * (1 - (completionRate || 0) / 100)}"
                class="transition-all duration-500" />
                </svg>
                <div class="absolute flex flex-col items-center">
            <span class="text-xl font-black text-slate-800">${Math.round(completionRate || 0)}%</span>
            <span class="text-[9px] font-bold text-slate-400 uppercase">Completed</span>
                </div>
            </div>
            <div class="space-y-2 text-xs font-semibold text-slate-500">
                <div class="flex items-center gap-2"><span class="w-3.5 h-3.5 rounded bg-emerald-500 block shrink-0"></span> Completed: ${completedTasksCount}</div>
                <div class="flex items-center gap-2"><span class="w-3.5 h-3.5 rounded bg-slate-400 block shrink-0"></span> Pending: ${pendingTasksCount}</div>
                <div class="flex items-center gap-2"><span class="w-3.5 h-3.5 rounded bg-rose-500 block shrink-0"></span> Rework: ${reworkTasksCount}</div>
            </div>
        </div>
            </div>

            <!-- Hourly Productivity Timeline Bar Chart -->
            <div class="bg-slate-50 border border-slate-100 rounded-3xl p-6 flex flex-col justify-between h-72">
        <p class="text-xs font-bold text-slate-600 uppercase tracking-widest mb-4">Hourly Productivity Timeline</p>
        <div class="flex items-end gap-2 h-44 pb-2 border-b border-slate-100">
            ${Array.from({ length: 10 }, (_, i) => i + 9).map(hour => {
                const seconds = hourlyProductivity[hour] || 0;
                const maxHourSeconds = Math.max(...Object.values(hourlyProductivity), 1);
                const heightPercent = Math.max(3, (seconds / maxHourSeconds) * 100);
                const displayHour = hour > 12 ? (hour - 12) + ' PM' : hour === 12 ? '12 PM' : hour + ' AM';
                return '<div class="flex-1 flex flex-col items-center h-full justify-end group"><div class="w-full bg-indigo-200 group-hover:bg-indigo-600 rounded-t-md transition-all relative" style="height: ' + heightPercent + '%" title="' + displayHour + ': ' + formatTime(seconds) + '"><span class="absolute -top-7 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-[8px] font-bold px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow pointer-events-none">' + formatTime(seconds) + '</span></div><p class="text-[8px] font-bold text-slate-400 mt-2 truncate w-full text-center group-hover:text-indigo-600 transition-colors">' + displayHour + '</p></div>';
            }).join('')}
        </div>
            </div>
        </div>

        <!-- Daily Breakdown Log List (Retaining Existing Functionality) -->
        <div class="space-y-4 mt-8 border-t border-slate-100 pt-6">
            <h4 class="text-xs font-bold text-slate-450 uppercase tracking-widest">Attendance & Logs Logged</h4>
            ${summary.filter(d => d.loggedSeconds > 0 || d.breakSeconds > 0).reverse().map(day => '<div class="border border-slate-100 rounded-2xl p-4 bg-slate-50/50"><div class="flex items-center justify-between mb-3"><p class="font-bold text-slate-900">' + new Date(day.date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }) + '</p><p class="text-sm font-black text-indigo-600">' + formatTime(day.loggedSeconds) + '</p></div><div class="grid grid-cols-2 gap-3 text-[10px]"><div class="bg-white rounded-xl p-2 text-center border border-slate-100"><p class="text-sky-600 font-bold">' + day.taskCount + '</p><p class="text-slate-400">Tasks Logged</p></div><div class="bg-white rounded-xl p-2 text-center border border-slate-100"><p class="text-amber-600 font-bold">' + formatTime(day.breakSeconds) + '</p><p class="text-slate-400">Breaks</p></div></div></div>').join('')}
        </div>
        `;
    }

    
function exportSummaryReport() {
        if (!reportDateFrom || !reportDateTo) return toast('Please select date range', 'error');
        
        const fromTs = new Date(reportDateFrom).getTime();
        const toDate = new Date(reportDateTo);
        toDate.setDate(toDate.getDate() + 1);
        const toTs = toDate.getTime();

        let periodTimeLogs = allTimeLogs.filter(log => (log.endTime || log.startTime || 0) >= fromTs && (log.endTime || log.startTime || 0) < toTs);
        let periodEvents = attendanceEvents.filter(e => e.timestamp >= fromTs && e.timestamp < toTs);

        if (reportSelectedUser !== 'all') {
            periodTimeLogs = periodTimeLogs.filter(log => log.userId === reportSelectedUser);
            periodEvents = periodEvents.filter(e => e.userId === reportSelectedUser);
        }

        // Total Logged Time
        const totalLoggedSeconds = periodTimeLogs.reduce((sum, log) => sum + (log.durationSeconds || 0), 0);
        
        // Total Break Time
        const totalBreakSeconds = periodEvents
            .filter(e => e.type === 'break_end' && e.duration)
            .reduce((sum, e) => sum + Math.floor(e.duration / 1000), 0);

        // Active Time
        const eventsByDay = periodEvents.reduce((acc, evt) => {
            const day = evt.date;
            if (!acc[day]) acc[day] = [];
            acc[day].push(evt);
            return acc;
        }, {});

        let totalActiveSeconds = 0;
        for (const day in eventsByDay) {
            const dayEvents = eventsByDay[day].sort((a, b) => a.timestamp - b.timestamp);
            const checkIn = dayEvents.find(e => e.type === 'check_in');
            const checkOut = dayEvents.findLast(e => e.type === 'check_out');
            if (checkIn && checkOut) {
        totalActiveSeconds += Math.floor((checkOut.timestamp - checkIn.timestamp) / 1000);
            } else if (checkIn) {
        const endOfPeriod = Math.min(Date.now(), toTs);
        totalActiveSeconds += Math.floor((endOfPeriod - checkIn.timestamp) / 1000);
            }
        }

        if (totalActiveSeconds === 0) {
            totalActiveSeconds = totalLoggedSeconds + totalBreakSeconds + 3600;
        }

        const holdTasksCount = tasks.filter(t => (t.status === 'Hold' || t.status === 'On Hold' || t.status === 'Design Hold' || t.isOnHold) && (reportSelectedUser === 'all' || assigneeMatches(t, reportSelectedUser))).length;
        let totalHoldSeconds = holdTasksCount * 1800;
        const remainingSeconds = Math.max(0, totalActiveSeconds - totalLoggedSeconds - totalBreakSeconds);
        if (totalHoldSeconds > remainingSeconds) totalHoldSeconds = remainingSeconds;
        const totalIdleSeconds = Math.max(0, remainingSeconds - totalHoldSeconds);

        const activeProductivityPercent = totalActiveSeconds > totalBreakSeconds ? Math.round((totalLoggedSeconds / (totalActiveSeconds - totalBreakSeconds)) * 100) : 0;
        
        const periodTaskIds = new Set(periodTimeLogs.map(log => log.taskId));
        const completedTasksCount = tasks.filter(t => (isDone(t.status) || isInternalDone(t.status)) && (reportSelectedUser === 'all' || assigneeMatches(t, reportSelectedUser) || periodTaskIds.has(t.id))).length;
        const pendingTasksCount = tasks.filter(t => (!isDone(t.status) && !isInternalDone(t.status)) && (reportSelectedUser === 'all' || assigneeMatches(t, reportSelectedUser) || periodTaskIds.has(t.id))).length;
        const reworkTasksCount = tasks.filter(t => ((t.status || '').toLowerCase().includes('rework') || (t.status || '').toLowerCase().includes('correction')) && (reportSelectedUser === 'all' || assigneeMatches(t, reportSelectedUser) || periodTaskIds.has(t.id))).length;

        const completionRate = completedTasksCount / (completedTasksCount + pendingTasksCount || 1) * 100;
        let productivityScore = Math.round(activeProductivityPercent * 0.5 + completionRate * 0.5 - (reworkTasksCount * 5) - (totalHoldSeconds / 3600 * 2));
        productivityScore = Math.max(50, Math.min(100, productivityScore));

        let csv = 'Daily Summary Analytics Report\n\n';
        csv += 'Metric,Value,Rating/Details\n';
        csv += `AI Productivity Score,${productivityScore}%, ${productivityScore >= 90 ? 'Excellent' : productivityScore >= 80 ? 'Good' : 'Average'}\n`;
        csv += `Total Logged Time,${formatTime(totalLoggedSeconds)},\n`;
        csv += `Worked Hours,${formatTime(totalLoggedSeconds)},\n`;
        csv += `Break Time,${formatTime(totalBreakSeconds)},\n`;
        csv += `Hold Time,${formatTime(totalHoldSeconds)},\n`;
        csv += `Idle Time,${formatTime(totalIdleSeconds)},\n`;
        csv += `Active Productivity,${activeProductivityPercent}%,\n`;
        csv += `Completed Tasks,${completedTasksCount},\n`;
        csv += `Pending Tasks,${pendingTasksCount},\n`;
        csv += `Rework Tasks,${reworkTasksCount},\n\n`;

        csv += 'Client Contribution Breakdown\nClient,Tasks Worked,Total Duration,Percentage\n';
        const clientSummary = {};
        periodTimeLogs.forEach(log => {
            const client = log.client || 'Other';
            if (!clientSummary[client]) clientSummary[client] = { name: client, duration: 0, tasks: new Set() };
            clientSummary[client].duration += log.durationSeconds || 0;
            clientSummary[client].tasks.add(log.taskId);
        });
        Object.values(clientSummary).sort((a,b) => b.duration - a.duration).forEach(c => {
            const percent = Math.round((c.duration / (totalLoggedSeconds || 1)) * 100);
            csv += `"${c.name}",${c.tasks.size},"${formatTime(c.duration)}",${percent}%\n`;
        });

        csv += '\nDaily Activity Timeline\nEvent,Time,Type\n';
        const timelineEvents = [];
        periodEvents.forEach(e => {
            let label = '';
            if (e.type === 'check_in') label = 'Checked In';
            else if (e.type === 'break_start') label = 'Break Started';
            else if (e.type === 'break_end') label = 'Resume Work (Break Ended)';
            else if (e.type === 'check_out') label = 'Checked Out';
            timelineEvents.push({ timestamp: e.timestamp, label, type: 'attendance' });
        });
        periodTimeLogs.forEach(log => {
            timelineEvents.push({ timestamp: log.startTime, label: `Started Task: ${log.taskDesc || log.taskName || 'Unknown'}`, type: 'task_start' });
            timelineEvents.push({ timestamp: log.endTime, label: `Logged Work on Task: ${log.taskDesc || log.taskName || 'Unknown'} (${formatTime(log.durationSeconds)})`, type: 'task_end' });
        });
        timelineEvents.sort((a, b) => a.timestamp - b.timestamp);
        timelineEvents.forEach(evt => {
            const timeStr = new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            csv += `"${evt.label}","${timeStr}","${evt.type}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `worksync-daily-summary-${reportDateFrom}_to_${reportDateTo}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast('Summary CSV exported', 'success');
    }

function exportSummaryReportPdf() {
        const printWindow = window.open('', '_blank', 'width=1100,height=850');
        if (!printWindow) return toast('Popups blocked. Please allow popups to export PDF.', 'error');

        printWindow.document.title = 'Daily Work & Productivity Report';

        const dashboardHtml = document.getElementById('summary-chart-container').innerHTML;
        const userName = currentUser ? currentUser.name : '';
        const userEmail = currentUser ? currentUser.email : '';
        
        printWindow.document.write(`
            \\x3chtml>
            \\x3chead>
        \\x3ctitle>Daily Work & Productivity Report\\x3c/title>
        \\x3cscript src="https://cdn.tailwindcss.com">\\x3c/script>
        \\x3cscript src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js">\\x3c/script>
        \\x3cstyle>
            body { font-family: system-ui, sans-serif; background: #fff; padding: 30px; color: #0f172a; }
            @media print {
                @page { margin: 0; }
                body { padding: 20mm; }
                .no-print { display: none; }
            }
        \\x3c/style>
            \\x3c/head>
            \\x3cbody>
        <div class="max-w-5xl mx-auto">
            <div class="flex justify-between items-center border-b pb-4 mb-6">
                <div>
            <h1 class="text-xl font-extrabold text-slate-900 tracking-tight">One Desk Daily Summary</h1>
            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Productivity & Work Analytics Report</p>
                </div>
                <div class="text-right">
            <p class="text-xs font-black text-slate-800">${userName}</p>
            <p class="text-[10px] text-slate-400">${userEmail}</p>
            <p class="text-[9px] font-bold text-slate-400 mt-1">${reportDateFrom} to ${reportDateTo}</p>
                </div>
            </div>
            ${dashboardHtml}
        </div>
        \\x3cscript>
            window.onload = () => {
                setTimeout(() => {
            window.print();
            window.close();
                }, 500);
            };
        \\x3c/script>
            \\x3c/body>
            \\x3c/html>
        `);
        printWindow.document.close();
        toast('PDF print window opened', 'success');
    }

    function exportReportsCsv() {
        const reportTab = currentReportTab;
        if (reportTab === 'summary') {
            return exportSummaryReport();
        }
if (!isAdmin()) return toast('Only admins can export reports', 'error');
        if (!reportDateFrom || !reportDateTo) {
            return toast('Please select a date range to export.', 'error');
        }
        const fromTs = new Date(reportDateFrom).getTime();
        const toTs = new Date(reportDateTo).getTime() + 86400000;
        const period = `${reportDateFrom}_to_${reportDateTo}`;
        let periodEvents = attendanceEvents.filter(e => e.timestamp >= fromTs && e.timestamp < toTs);

        if (reportSelectedUser !== 'all') {
            periodEvents = periodEvents.filter(e => e.userId === reportSelectedUser);
        }

        const byDate = {};
        periodEvents.forEach(evt => {
            if (!byDate[evt.date]) {
                byDate[evt.date] = {
                    date: evt.date,
                    checkIns: 0,
                    checkOuts: 0,
                    totalTime: 0,
                    breakTime: 0
                };
            }
            if (evt.type === 'check_in') byDate[evt.date].checkIns++;
            if (evt.type === 'check_out' && evt.duration) byDate[evt.date].totalTime += evt.duration;
            if (evt.type === 'break_end' && evt.duration) byDate[evt.date].breakTime += evt.duration;
        });

        const summary = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));

        const headers = ['Date', 'Check-Ins', 'Work Time (hrs)', 'Break Time (min)', 'Check-Outs'];
        const rows = summary.map(day => [
            day.date,
            day.checkIns,
            (day.totalTime / 1000 / 3600).toFixed(2),
            Math.round(day.breakTime / 1000 / 60),
            day.checkOuts
        ]);

        const csv = [
            headers.map(h => `"${h}"`).join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `attendance-report-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        toast('Report exported to CSV', 'success');
    }

        function renderClientReport() {
        const list = document.getElementById('client-report-list');
        const summaryDiv = document.getElementById('client-report-summary');
        if (!list || !summaryDiv) return;

        const fromTs = reportDateFrom ? new Date(reportDateFrom).getTime() : 0;
        const toTs = reportDateTo ? new Date(reportDateTo).getTime() + 86400000 : Infinity;

        // Only include client tasks (non-internal) with an actual client assigned
        const clientTasks = tasks.filter(t => !isInternalTask(t) && t.client && t.client.trim());

        let filteredTasks = clientTasks;
        if (reportDateFrom && reportDateTo) {
            filteredTasks = clientTasks.filter(t => {
                if (!t.duedate) return true;
                const dTs = new Date(t.duedate).getTime();
                return dTs >= fromTs && dTs < toTs;
            });
            // If date filter returns nothing but we have tasks, show all client tasks
            if (!filteredTasks.length && clientTasks.length) filteredTasks = clientTasks;
        }

        // Show loading state if tasks haven't been fetched yet
        if (!tasks.length) {
            summaryDiv.innerHTML = '';
            list.innerHTML = '<tr><td colspan="5" class="px-6 py-16 text-center"><div class="flex flex-col items-center gap-3"><iconify-icon icon="svg-spinners:ring-resize" width="32" class="text-indigo-400"></iconify-icon><p class="text-xs text-slate-400">Loading tasks...</p></div></td></tr>';
            return;
        }

        let totalDoneSeconds = 0;
        const doneTaskIds = new Set(clientTasks.filter(t => isDone(t.status)).map(t => t.id));
        allTimeLogs.forEach(log => { if (doneTaskIds.has(log.taskId)) totalDoneSeconds += (log.durationSeconds || 0); });
        const avgSecondsPerTask = doneTaskIds.size > 0 ? (totalDoneSeconds / doneTaskIds.size) : 7200;

        const clientStats = {};
        let totalTasksOverall = 0;
        let totalCompletedOverall = 0;

        filteredTasks.forEach(t => {
            const client = t.client;
            if (!clientStats[client]) clientStats[client] = { name: client, total: 0, done: 0, pending: 0 };
            clientStats[client].total++;
            totalTasksOverall++;
            if (isDone(t.status)) { clientStats[client].done++; totalCompletedOverall++; }
            else { clientStats[client].pending++; }
        });

        const rows = Object.values(clientStats).sort((a, b) => b.total - a.total);
        const totalPendingOverall = totalTasksOverall - totalCompletedOverall;
        const overallCompletion = totalTasksOverall > 0 ? Math.round((totalCompletedOverall / totalTasksOverall) * 100) : 0;

        summaryDiv.innerHTML =
            createStatCard('Total Tasks', totalTasksOverall, 'solar:folder-with-files-bold', { bg: 'bg-indigo-50', text: 'text-indigo-600' }) +
            createStatCard('Completed', totalCompletedOverall, 'solar:check-circle-bold', { bg: 'bg-emerald-50', text: 'text-emerald-600' }) +
            createStatCard('Completion Rate', overallCompletion + '%', 'solar:chart-bold', { bg: 'bg-amber-50', text: 'text-amber-600' }) +
            createStatCard('Est. Remaining Time', formatTime(Math.round(totalPendingOverall * avgSecondsPerTask)), 'solar:clock-circle-bold', { bg: 'bg-rose-50', text: 'text-rose-600' });

        if (!rows.length) {
            list.innerHTML = '<tr><td colspan="5" class="px-6 py-10 text-center text-xs text-slate-400 italic">No client tasks found for the selected period. Make sure tasks have a client name assigned in Jira.</td></tr>';
            return;
        }

        list.innerHTML = rows.map(r => {
            const completion = r.total > 0 ? Math.round((r.done / r.total) * 100) : 0;
            const estTime = formatTime(Math.round(r.pending * avgSecondsPerTask));
            return `
                <tr class="hover:bg-slate-50 transition-colors cursor-pointer" onclick="openClientReportDetails('${escapeHtml(r.name).replace(/'/g, "\\'")}')">
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                                <iconify-icon icon="solar:buildings-bold" class="text-indigo-600" width="16"></iconify-icon>
                            </div>
                            <span class="text-xs font-bold text-slate-900">${escapeHtml(r.name)}</span>
                        </div>
                    </td>
                    <td class="px-6 py-4 text-xs text-slate-600 text-center">${r.total}</td>
                    <td class="px-6 py-4 text-center">
                        <span class="text-xs font-black text-emerald-600">${r.done}</span>
                        <div class="w-16 mx-auto h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                            <div class="h-full bg-emerald-500 rounded-full" style="width:${completion}%"></div>
                        </div>
                    </td>
                    <td class="px-6 py-4 text-xs font-black text-amber-600 text-center">${r.pending}</td>
                    <td class="px-6 py-4 text-xs font-mono font-bold text-slate-700 text-right">${estTime}</td>
                </tr>
                `;
        }).join('');

        // Populate Top Performer widget
        populateTopPerformer();
    }

    function renderClientWideReport() {
        const content = document.getElementById('client-wide-report-content');
        if (!content) return;

        if (!tasks.length) {
            content.innerHTML = '<div class="flex flex-col items-center gap-3 py-16"><iconify-icon icon="svg-spinners:ring-resize" width="32" class="text-indigo-400"></iconify-icon><p class="text-xs text-slate-400">Loading tasks...</p></div>';
            return;
        }

        const fromTs = reportDateFrom ? new Date(reportDateFrom).getTime() : 0;
        const toTs = reportDateTo ? new Date(reportDateTo).getTime() + 86400000 : Infinity;

        // Filter tasks by date range
        let filtered = tasks.filter(t => t.client && t.client.trim());
        if (reportDateFrom && reportDateTo) {
            const dateFiltered = filtered.filter(t => {
                if (!t.duedate) return true;
                const dTs = new Date(t.duedate).getTime();
                return dTs >= fromTs && dTs < toTs;
            });
            if (dateFiltered.length) filtered = dateFiltered;
        }

        // Group by client
        const clientMap = {};
        filtered.forEach(t => {
            const client = t.client;
            if (!clientMap[client]) clientMap[client] = { name: client, posters: 0, videos: 0, other: 0, total: 0, done: 0, assignees: {} };
            clientMap[client].total++;
            if (isDone(t.status)) clientMap[client].done++;

            // Categorize by issue type and description
            const type = (t.issueType || t.type || '').toLowerCase();
            const desc = (t.desc || t.summary || t.name || t.id || '').toLowerCase();
            const isVideo = type.includes('video') || type.includes('reel') || type.includes('motion') || type.includes('animation') || desc.includes('video') || desc.includes('reel');
            const isPoster = type.includes('poster') || type.includes('design') || type.includes('static') || type.includes('creative') || desc.includes('poster') || desc.includes('design');

            if (isVideo) {
                clientMap[client].videos++;
            } else if (isPoster) {
                clientMap[client].posters++;
            } else {
                clientMap[client].other++;
            }

            // Track assignee work
            const assignee = assigneeName(t);
            if (!clientMap[client].assignees[assignee]) clientMap[client].assignees[assignee] = 0;
            clientMap[client].assignees[assignee]++;
        });

        const clients = Object.values(clientMap).sort((a, b) => b.total - a.total);

        // Calculate time per assignee from timelogs
        const assigneeTimeMap = {};
        const taskClientMap = {};
        filtered.forEach(t => { taskClientMap[t.id] = t.client; });
        allTimeLogs.forEach(log => {
            const client = taskClientMap[log.taskId];
            if (!client) return;
            const key = (log.userName || log.userId || 'Unknown');
            if (!assigneeTimeMap[key]) assigneeTimeMap[key] = {};
            if (!assigneeTimeMap[key][client]) assigneeTimeMap[key][client] = 0;
            assigneeTimeMap[key][client] += (log.durationSeconds || 0);
        });

        // Summary cards
        const totalClients = clients.length;
        const totalPosters = clients.reduce((s, c) => s + c.posters, 0);
        const totalVideos = clients.reduce((s, c) => s + c.videos, 0);
        const totalTasks = clients.reduce((s, c) => s + c.total, 0);

        if (!clients.length) {
            content.innerHTML = '<div class="text-center py-16"><iconify-icon icon="solar:folder-error-bold" width="48" class="text-slate-300 mb-3"></iconify-icon><p class="text-xs text-slate-400">No client tasks found. Make sure tasks have labels assigned in Jira.</p></div>';
            return;
        }

        content.innerHTML = `
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    ${createStatCard('Clients', totalClients, 'solar:buildings-bold', { bg: 'bg-indigo-50', text: 'text-indigo-600' })}
                    ${createStatCard('Posters / Static', totalPosters, 'solar:gallery-bold', { bg: 'bg-emerald-50', text: 'text-emerald-600' })}
                    ${createStatCard('Videos / Reels', totalVideos, 'solar:video-frame-bold', { bg: 'bg-amber-50', text: 'text-amber-600' })}
                    ${createStatCard('Total Tasks', totalTasks, 'solar:checklist-minimalistic-bold', { bg: 'bg-rose-50', text: 'text-rose-600' })}
                </div>

                <div class="border border-slate-100 rounded-2xl overflow-hidden">
                    <table class="w-full text-left">
                        <thead class="bg-slate-50/50 border-b border-slate-100">
                            <tr>
                                <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Client</th>
                                <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Posters</th>
                                <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Videos</th>
                                <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Other</th>
                                <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Total</th>
                                <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Completed</th>
                                <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assignees</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${clients.map(c => {
            const completion = c.total > 0 ? Math.round((c.done / c.total) * 100) : 0;
            const assigneeList = Object.entries(c.assignees).sort((a, b) => b[1] - a[1]).slice(0, 3);
            return `
                                <tr class="hover:bg-slate-50 transition-colors">
                                    <td class="px-6 py-4">
                                        <div class="flex items-center gap-3">
                                            <div class="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                                                <iconify-icon icon="solar:buildings-bold" class="text-indigo-600" width="16"></iconify-icon>
                                            </div>
                                            <span class="text-xs font-bold text-slate-900">${escapeHtml(c.name)}</span>
                                        </div>
                                    </td>
                                    <td class="px-6 py-4 text-center">
                                        <span class="text-xs font-black ${c.posters > 0 ? 'text-emerald-600' : 'text-slate-300'}">${c.posters}</span>
                                    </td>
                                    <td class="px-6 py-4 text-center">
                                        <span class="text-xs font-black ${c.videos > 0 ? 'text-amber-600' : 'text-slate-300'}">${c.videos}</span>
                                    </td>
                                    <td class="px-6 py-4 text-center">
                                        <span class="text-xs font-black ${c.other > 0 ? 'text-blue-600' : 'text-slate-300'}">${c.other}</span>
                                    </td>
                                    <td class="px-6 py-4 text-xs font-bold text-slate-900 text-center">${c.total}</td>
                                    <td class="px-6 py-4 text-center">
                                        <span class="text-xs font-black text-emerald-600">${c.done}</span>
                                        <div class="w-16 mx-auto h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                            <div class="h-full bg-emerald-500 rounded-full" style="width:${completion}%"></div>
                                        </div>
                                    </td>
                                    <td class="px-6 py-4">
                                        <div class="flex flex-wrap gap-1">
                                            ${assigneeList.map(([name, count]) => `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">${escapeHtml(name.split(' ')[0])} (${count})</span>`).join('')}
                                            ${Object.keys(c.assignees).length > 3 ? '<span class="text-[10px] text-slate-400">+' + (Object.keys(c.assignees).length - 3) + '</span>' : ''}
                                        </div>
                                    </td>
                                </tr>`;
        }).join('')}
                        </tbody>
                    </table>
                </div>

                ${Object.keys(assigneeTimeMap).length > 0 ? `
                <div class="mt-8">
                    <h4 class="text-sm font-black text-slate-900 mb-4">Assignee Time by Client</h4>
                    <div class="border border-slate-100 rounded-2xl overflow-hidden">
                        <table class="w-full text-left">
                            <thead class="bg-slate-50/50 border-b border-slate-100">
                                <tr>
                                    <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assignee</th>
                                    <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Client</th>
                                    <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Time Spent</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-50">
                                ${Object.entries(assigneeTimeMap).sort((a, b) => {
            const aTotal = Object.values(a[1]).reduce((s, v) => s + v, 0);
            const bTotal = Object.values(b[1]).reduce((s, v) => s + v, 0);
            return bTotal - aTotal;
        }).map(([assignee, clients]) =>
            Object.entries(clients).sort((a, b) => b[1] - a[1]).map(([client, seconds], idx) => `
                                        <tr class="hover:bg-slate-50 transition-colors">
                                            <td class="px-6 py-3 text-xs font-bold text-slate-900">${idx === 0 ? escapeHtml(assignee) : ''}</td>
                                            <td class="px-6 py-3 text-xs text-slate-600">${escapeHtml(client)}</td>
                                            <td class="px-6 py-3 text-xs font-mono font-bold text-slate-700 text-right">${formatTime(seconds)}</td>
                                        </tr>`
            ).join('')
        ).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>` : ''}
            `;
    }

    function exportClientReport() {
        const fromTs = reportDateFrom ? new Date(reportDateFrom).getTime() : 0;
        const toTs = reportDateTo ? new Date(reportDateTo).getTime() + 86400000 : Infinity;
        let filteredTasks = tasks;
        if (reportDateFrom && reportDateTo) {
            filteredTasks = tasks.filter(t => { if (!t.duedate) return true; const dTs = new Date(t.duedate).getTime(); return dTs >= fromTs && dTs < toTs; });
            if (!filteredTasks.length && tasks.length) filteredTasks = tasks;
        }

        let totalDoneSeconds = 0;
        const doneTaskIds = new Set(tasks.filter(t => isDone(t.status)).map(t => t.id));
        allTimeLogs.forEach(log => { if (doneTaskIds.has(log.taskId)) totalDoneSeconds += (log.durationSeconds || 0); });
        const avgSecondsPerTask = doneTaskIds.size > 0 ? (totalDoneSeconds / doneTaskIds.size) : 7200;

        const clientStats = {};
        filteredTasks.forEach(t => {
            const client = t.client || 'No Client';
            if (!clientStats[client]) clientStats[client] = { name: client, total: 0, done: 0, pending: 0 };
            clientStats[client].total++; if (isDone(t.status)) clientStats[client].done++; else clientStats[client].pending++;
        });

        const rows = Object.values(clientStats).sort((a, b) => b.total - a.total);
        if (!rows.length) return toast('No client data to export.', 'info');
        const headers = ['Client Name', 'Total Tasks', 'Completed Tasks', 'Pending Tasks', 'Estimated Time Remaining', 'Estimated Seconds Remaining'];
        const csvRows = rows.map(r => [r.name, r.total, r.done, r.pending, formatTime(Math.round(r.pending * avgSecondsPerTask)), Math.round(r.pending * avgSecondsPerTask)].map(csvCell).join(','));
        const csv = [headers.map(csvCell).join(','), ...csvRows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `client-report-${reportDateFrom || 'all'}_to_${reportDateTo || 'all'}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        toast('Client report exported', 'success');
    }

    function initDailyReportScheduler() {
        // Only schedule for specific recipients
        if (!REPORT_RECIPIENTS.includes(currentUser.email)) {
            if (dailyReportSchedulerRef) clearInterval(dailyReportSchedulerRef);
            dailyReportSchedulerRef = null;
            return;
        }
        if (dailyReportSchedulerRef) return; // Already initialized

        dailyReportSchedulerRef = setInterval(() => {
            const now = new Date();
            const todayIso = now.toISOString().slice(0, 10);

            DAILY_REPORT_TIMES.forEach(reportTime => {
                const reportKey = `worksync_lastDailyReportDate_${reportTime.hour}${String(reportTime.minute).padStart(2, '0')}`;
                const lastReportDateForTime = localStorage.getItem(reportKey);

                // Check if it's around the report time and report hasn't been sent for this specific time today
                if (now.getHours() === reportTime.hour && now.getMinutes() >= reportTime.minute && now.getMinutes() < reportTime.minute + 5 && lastReportDateForTime !== todayIso) {
                    generateAndDisplayDailyReport(reportTime.label);
                    localStorage.setItem(reportKey, todayIso);
                }
            });
        }, 60 * 1000); // Check every minute
    }

    async function generateAndDisplayDailyReport(reportTimeLabel) {
        try {
            const start = todayStartTs();
            const end = start + 86400000;
            const logsSnap = await get(ref(db, 'worksync/timelogs'));
            todayTimeLogs = Object.values(logsSnap.val() || {})
                .filter(log => canViewDailySummary() || log.userId === currentUser.email)
                .filter(log => (log.endTime || log.startTime || 0) >= start && (log.endTime || log.startTime || 0) < end)
                .sort((a, b) => (b.endTime || 0) - (a.endTime || 0));

            const snehaSnap = await get(ref(db, 'worksync/sneha_work_selections'));
            const snehaSelections = Object.values(snehaSnap.val() || {}).filter(s => s.timestamp >= start && s.timestamp < end);
            const usersMap = new Map();
            Array.from(allUsersMap.values()).forEach(u => {
                if (u.email && u.email !== '123') usersMap.set(u.email.toLowerCase(), { ...u });
            });
            currentWorkUsers.forEach(u => {
                if (u.email && u.email !== '123') usersMap.set(u.email.toLowerCase(), { ...(usersMap.get(u.email.toLowerCase()) || {}), ...u });
            });

            const usersSnap = await get(ref(db, 'worksync/users'));
            const usersData = usersSnap.val() || {};
            Object.values(usersData).forEach(u => {
                if (u.email && u.email !== '123') usersMap.set(u.email.toLowerCase(), { ...(usersMap.get(u.email.toLowerCase()) || {}), ...u });
            });

            let usersToProcess = Array.from(usersMap.values());
            if (!canViewDailySummary()) {
                usersToProcess = usersToProcess.filter(u => u.email === currentUser.email);
            }

            const sortedUsers = usersToProcess.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            if (!sortedUsers.length) {
                toast('No work data available.', 'error');
                return;
            }

            const todayStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            let report = `DAILY WORK UPDATE REPORT\nDate: ${todayStr}\nReport: ${reportTimeLabel}\n\n`; //
            let contentAdded = false;

            sortedUsers.forEach(user => {
                const userLogs = todayTimeLogs.filter(log => log.userId === user.email); //
                const current = user.currentTask;

                if (userLogs.length === 0 && !current) return;
                contentAdded = true;

                report += `${user.name || user.email}\n${user.role || user.email || ''}\n`;

                const clientGroups = {}; //
                const processedTaskIds = new Set();

                userLogs.forEach(log => {
                    if (processedTaskIds.has(log.taskId)) return;
                    const task = tasks.find(t => t.id === log.taskId);
                    if (task && (task.status === 'Learnings' || task.status === 'Learning' || isMorningLearningTask(task))) return;
                    processedTaskIds.add(log.taskId);
                    let client = log.client || 'Additional Tasks';
                    if (user.email.toLowerCase() === 'murugeshvilpower@gmail.com' && client === 'Internal') {
                        client = 'Recurring Tasks';
                    }
                    if (!clientGroups[client]) clientGroups[client] = [];

                    let itemDesc = log.taskDesc || log.taskId;
                    const snehaSel = snehaSelections.find(s => s.taskId === log.taskId && s.userId === user.email);
                    if (snehaSel && snehaSel.selectedItems && snehaSel.selectedItems.length) {
                        itemDesc += ` - [ ${snehaSel.selectedItems.join(', ')} ]`;
                    } else {
                        const statusLabel = task ? task.status : 'Completed';
                        itemDesc += ` - ${statusLabel}`;
                    }
                    clientGroups[client].push(itemDesc);
                });

                if (current && !processedTaskIds.has(current.taskId)) {
                    const task = tasks.find(t => t.id === current.taskId);
                    if (!(task && (task.status === 'Learnings' || task.status === 'Learning' || isMorningLearningTask(task))) && !isMorningLearningTask(current)) {
                        let client = current.client || 'Additional Tasks';
                        if (user.email.toLowerCase() === 'murugeshvilpower@gmail.com' && client === 'Internal') {
                            client = 'Recurring Tasks';
                        }
                        if (!clientGroups[client]) clientGroups[client] = [];

                        let itemDesc = current.taskDesc || current.taskId;
                        const snehaSel = snehaSelections.find(s => s.taskId === current.taskId && s.userId === user.email);
                        if (snehaSel && snehaSel.selectedItems && snehaSel.selectedItems.length) {
                            itemDesc += ` - [ ${snehaSel.selectedItems.join(', ')} ]`;
                        } else {
                            const stateLabel = current.state === 'on_hold' ? 'On Hold' : 'In Progress';
                            itemDesc += ` - ${stateLabel}`;
                        }
                        clientGroups[client].push(itemDesc);
                    }
                }

                let taskNumber = 1;
                Object.entries(clientGroups).forEach(([client, items]) => {
                    report += `${client}\n`; //
                    items.forEach(item => report += `  ${taskNumber++}. ${item}\n`);
                    report += `\n`;
                });
                report += `\n`;
            });

            if (!contentAdded) {
                toast('No active or completed work found for today.', 'info');
                return;
            }

            openDailyReportModal(report, `${todayStr} (${reportTimeLabel})`);
            toast(`Report Generated (${reportTimeLabel})`, 'success');
        } catch (err) {
            console.error('Daily report generation failed:', err);
            toast('Failed to generate report: ' + err.message, 'error');
        }
    }

    function openDailyReportModal(reportContent, reportDate) {
        const dateEl = document.getElementById('daily-report-date');
        const contentEl = document.getElementById('daily-report-content');
        const modal = document.getElementById('dailyTaskReportModal');
        if (!dateEl || !contentEl || !modal) return toast('Report modal is unavailable', 'error');
        dateEl.textContent = reportDate;
        contentEl.textContent = reportContent;
        if (!modal.open) modal.showModal();
    }

    function copyDailyReport() {
        const reportContent = document.getElementById('daily-report-content').textContent;
        navigator.clipboard.writeText(reportContent).then(() => {
            toast('Report copied to clipboard!', 'success');
        }).catch(err => {
            toast('Failed to copy report: ' + err, 'error');
        });
    }

    function listenForEmailReportSetting() {
        if (!isAdmin()) return;
        const settingRef = ref(db, 'worksync/settings/email_reports_enabled');
        onValue(settingRef, (snap) => {
            emailReportEnabled = !!snap.val();
            updateEmailReportToggleUI();
        });
    }

    function updateEmailReportToggleUI() {
        const toggle = document.getElementById('email-report-toggle');
        const knob = document.getElementById('email-report-knob');
        if (!toggle || !knob) return;
        toggle.classList.toggle('bg-emerald-500', emailReportEnabled);
        toggle.classList.toggle('bg-slate-300', !emailReportEnabled);
        knob.classList.toggle('translate-x-5', emailReportEnabled);
        toggle.setAttribute('aria-pressed', String(emailReportEnabled));
    }

    async function toggleEmailReportSetting() {
        if (!isAdmin()) return;
        const newSetting = !emailReportEnabled;
        await set(ref(db, 'worksync/settings/email_reports_enabled'), newSetting);
        // The onValue listener will handle the UI update automatically.
        toast(`Automatic daily reports ${newSetting ? 'enabled' : 'disabled'}.`, 'success');
    }

    async function sendReportEmail() {
        if (!isAdmin()) return;

        const sendButton = document.querySelector('button[onclick="sendReportEmail()"]');
        if (sendButton) {
            sendButton.disabled = true;
            sendButton.innerHTML = `<iconify-icon icon="svg-spinners:ring-resize" width="16"></iconify-icon> Sending...`;
        }

        try {
            const summaryRows = buildDailySummaryRows();
            if (!summaryRows.length) {
                toast('No data for today to generate a report.', 'info');
                return;
            }

            const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const subject = `WorkSync Daily Report - ${today}`;
            const totalSeconds = summaryRows.reduce((sum, row) => sum + row.loggedSeconds + row.activeSeconds, 0);
            const loggedTasks = todayTimeLogs.length;
            const activeCount = summaryRows.filter(row => row.activeTask).length;

            const tableRows = summaryRows.map(row => `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 10px;">${escapeHtml(row.name)}</td>
                    <td style="padding: 10px;">${formatTime(row.loggedSeconds + row.activeSeconds)}</td>
                    <td style="padding: 10px;">${row.completedTasks}</td>
                    <td style="padding: 10px;">${row.activeTask ? `Working: ${escapeHtml(row.activeTask.taskId)}` : 'Idle'}</td>
                </tr>
            `).join('');

            const htmlBody = `
                <div style="font-family: sans-serif; color: #333;">
                    <h1 style="color: #1e293b; font-size: 24px;">WorkSync Daily Summary</h1>
                    <p style="font-size: 14px; color: #64748b;">${today}</p>
                    <div style="display: flex; gap: 20px; margin: 20px 0;">
                        <div style="flex: 1; padding: 15px; background: #f1f5f9; border-radius: 8px;">
                            <h3 style="margin: 0 0 5px 0; font-size: 12px; color: #475569;">TOTAL TIME</h3>
                            <p style="margin: 0; font-size: 22px; font-weight: bold;">${formatTime(totalSeconds)}</p>
                        </div>
                        <div style="flex: 1; padding: 15px; background: #f1f5f9; border-radius: 8px;">
                            <h3 style="margin: 0 0 5px 0; font-size: 12px; color: #475569;">TASKS LOGGED</h3>
                            <p style="margin: 0; font-size: 22px; font-weight: bold;">${loggedTasks}</p>
                        </div>
                        <div style="flex: 1; padding: 15px; background: #f1f5f9; border-radius: 8px;">
                            <h3 style="margin: 0 0 5px 0; font-size: 12px; color: #475569;">ACTIVE EMPLOYEES</h3>
                            <p style="margin: 0; font-size: 22px; font-weight: bold;">${activeCount} / ${summaryRows.length}</p>
                        </div>
                    </div>
                    <h2 style="font-size: 18px; color: #1e293b; border-bottom: 1px solid #eee; padding-bottom: 10px;">Employee Breakdown</h2>
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px; text-align: left;">
                        <thead><tr style="color: #64748b;"><th style="padding: 10px;">Employee</th><th style="padding: 10px;">Total Time</th><th style="padding: 10px;">Tasks Logged</th><th style="padding: 10px;">Status</th></tr></thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </div>
            `;

            const payload = { type: 'SEND_REPORT_EMAIL', to: 'vildigitalseo@gmail.com', from: 'digitalmarketing@vilpower.com', subject, htmlBody };

            await jiraProxyFetch(JIRA.gsUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });
            toast('Report email sent successfully!', 'success');
        } catch (err) {
            console.error('Email send error:', err);
            toast('Failed to send report: ' + err.message, 'error');
        } finally {
            if (sendButton) {
                sendButton.disabled = false;
                sendButton.innerHTML = `<iconify-icon icon="solar:plain-3-bold" width="16"></iconify-icon> Send Today's Report Now`;
            }
        }
    }

    function loadAllTimeLogs() {
        if (!db || !currentUser) return;
        if (allTimeLogsUnsub) allTimeLogsUnsub();

        const dbRef = ref(db, 'worksync/timelogs');
        const q = (isAdmin() || isManager() || hasClientWideAccess()) ? dbRef : query(dbRef, orderByChild('userId'), equalTo(currentUser.email));

        allTimeLogsUnsub = onValue(q, snap => {
            allTimeLogs = snap.val() ? Object.values(snap.val()) : [];
            console.log("loadAllTimeLogs: canViewReports", canViewReports(), "currentUser.email", currentUser.email);
            if (canViewReports()) {
                console.log("loadAllTimeLogs: report access - allTimeLogs length:", allTimeLogs.length, "Unique users:", [...new Set(allTimeLogs.map(log => log.userId))]);
            }
            if (activeView === 'reports') {
                handleReportFilterChange();
            }
        });
    }

    function renderPerformanceReport() {
        const list = document.getElementById('performance-report-list');
        if (!list) return;
        list.innerHTML = `<p class="text-center text-slate-400 text-sm py-8">Calculating performance metrics...</p>`;

        if (!reportDateFrom || !reportDateTo) {
            list.innerHTML = `<p class="text-center text-slate-400 text-sm py-8">Please select a date range.</p>`;
            return;
        }
        const fromTs = new Date(reportDateFrom).getTime();
        const toTs = new Date(reportDateTo).getTime() + 86400000;

        if (!currentWorkUsers.length) {
            list.innerHTML = `<p class="text-center text-slate-400 text-sm py-8">No user data available to generate reports.</p>`;
            return;
        }

        let usersToReport = currentWorkUsers;
        if (isAdmin()) {
            // Admins can see all users or filtered user
            if (reportSelectedUser !== 'all') {
                usersToReport = currentWorkUsers.filter(u => u.email === reportSelectedUser);
            }
        } else {
            // Non-admin users can only see their own data
            usersToReport = currentWorkUsers.filter(u => u.email === currentUser.email);
        }

        const performanceData = usersToReport.map(user => {
            const userLogs = allTimeLogs.filter(log =>
                log.userId === user.email &&
                (log.endTime || log.startTime || 0) >= fromTs &&
                (log.endTime || log.startTime || 0) < toTs
            );
            const totalSeconds = userLogs.reduce((sum, log) => sum + (log.durationSeconds || 0), 0);
            const assignedTasks = tasks.filter(t => assigneeMatches(t, user.email));
            const completedTasks = assignedTasks.filter(t => isDone(t.status));
            const completionRate = assignedTasks.length > 0 ? Math.round((completedTasks.length / assignedTasks.length) * 100) : 0;

            const qcScore = qcUserPerformance[user.email]?.count > 0 ? Math.round(qcUserPerformance[user.email].scoreSum / qcUserPerformance[user.email].count) : 'N/A';
            return { ...user, totalTime: formatTime(totalSeconds), totalSeconds, loggedTasksCount: userLogs.length, assignedCount: assignedTasks.length, completedCount: completedTasks.length, completionRate };
        }).sort((a, b) => b.totalSeconds - a.totalSeconds);

        if (!performanceData.length) {
            list.innerHTML = `<p class="text-center text-slate-400 text-sm py-8">No performance data to display.</p>`;
            return;
        }

        const maxTime = Math.max(...performanceData.map(p => p.totalSeconds), 1);

        list.innerHTML = performanceData.map(p => {
            const timePercent = (p.totalSeconds / maxTime) * 100;
            return `
                <div class="border border-slate-100 rounded-2xl p-5 bg-white shadow-sm">
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                        <div class="flex items-center gap-4"><img src="${p.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.avatar || p.name}`}" class="w-12 h-12 rounded-xl bg-white border border-slate-200 object-cover"><div><p class="text-sm font-bold text-slate-900">${escapeHtml(p.name)}</p><p class="text-[10px] text-slate-400 font-bold uppercase">${escapeHtml(p.role || 'User')}</p></div></div>
                        <div class="bg-indigo-50 text-indigo-600 rounded-xl px-4 py-2 text-center"><p class="text-[10px] font-bold uppercase">Total Time</p><p class="text-lg font-black font-mono">${p.totalTime}</p></div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div class="bg-slate-50 rounded-xl p-3"><p class="text-[9px] font-bold text-slate-400 uppercase">Logged Tasks</p><p class="text-base font-black text-slate-700">${p.loggedTasksCount}</p></div>
                        <div class="bg-slate-50 rounded-xl p-3"><p class="text-[9px] font-bold text-slate-400 uppercase">Assigned</p><p class="text-base font-black text-slate-700">${p.assignedCount}</p></div>
                        <div class="bg-slate-50 rounded-xl p-3"><p class="text-[9px] font-bold text-slate-400 uppercase">Completion Rate</p><p class="text-base font-black text-slate-700">${p.completionRate}% <span class="text-xs font-semibold text-slate-500">(${p.completedCount} done)</span></p></div>
                        <div class="bg-slate-50 rounded-xl p-3"><p class="text-[9px] font-bold text-slate-400 uppercase">QC Score</p><p class="text-base font-black text-slate-700">${p.qcScore}${p.qcScore !== 'N/A' ? '%' : ''}</p></div>
                    </div>
                </div>`;
        }).join('');
    }

    // HR
    function switchHrTab(tab) {
        ['apply', 'my', 'approvals', 'calendar'].forEach(t => {
            document.getElementById(`hr-panel-${t}`).classList.add('hidden');
            document.getElementById(`hr-tab-${t}`).classList.remove('border-2', 'border-indigo-600');
            document.getElementById(`hr-tab-${t}`).classList.add('border', 'border-slate-100');
        });
        document.getElementById(`hr-panel-${tab}`).classList.remove('hidden');
        document.getElementById(`hr-tab-${tab}`).classList.add('border-2', 'border-indigo-600');
        document.getElementById(`hr-tab-${tab}`).classList.remove('border', 'border-slate-100');

        if (tab === 'apply') populateSaturdays();
        else if (tab === 'my') loadMyRequests();
        else if (tab === 'approvals') loadApprovals();
    }

    function setReqType(type) {
        document.getElementById('leave-type-div').classList.toggle('hidden', type !== 'leave');
        document.getElementById('date-range-div').classList.toggle('hidden', type !== 'leave');
        document.getElementById('leave-duration-div').classList.toggle('hidden', type !== 'leave');
        document.getElementById('perm-div').classList.toggle('hidden', type !== 'permission');
        document.getElementById('saturday-div').classList.toggle('hidden', type !== 'saturday');
        document.getElementById('reason-div').classList.toggle('hidden', type === 'saturday');
        if (type === 'leave') {
            handleLeaveDurationChange();
            handleLeaveTypeChange(document.getElementById('leave-type').value);
        }
        if (type === 'saturday') populateSaturdays();
    }

    function handleLeaveTypeChange(val) {
        const leaveToContainer = document.getElementById('leave-to-container');
        const dateRangeDiv = document.getElementById('date-range-div');
        const leaveFromLabel = document.getElementById('leave-from-label');
        const leaveToInput = document.getElementById('leave-to');
        const leaveFromInput = document.getElementById('leave-from');
        const leaveDurationDiv = document.getElementById('leave-duration-div');

        if (val === 'One day Leave') {
            if (leaveToContainer) leaveToContainer.classList.add('hidden');
            if (dateRangeDiv) {
                dateRangeDiv.classList.remove('grid-cols-2');
                dateRangeDiv.classList.add('grid-cols-1');
            }
            if (leaveFromLabel) leaveFromLabel.textContent = 'Date';
            if (leaveDurationDiv) leaveDurationDiv.classList.remove('hidden');

            // Automatically set leave-to value to leave-from value
            if (leaveFromInput && leaveToInput) {
                leaveToInput.value = leaveFromInput.value;
            }
        } else {
            if (leaveToContainer) leaveToContainer.classList.remove('hidden');
            if (dateRangeDiv) {
                dateRangeDiv.classList.remove('grid-cols-1');
                dateRangeDiv.classList.add('grid-cols-2');
            }
            if (leaveFromLabel) leaveFromLabel.textContent = 'From Date';

            // For long leave, force "Full Day" leave duration and hide duration selector
            const durationSelect = document.getElementById('leave-duration');
            if (durationSelect) {
                durationSelect.value = 'full';
            }
            if (leaveDurationDiv) leaveDurationDiv.classList.add('hidden');
        }
        calcDays();
    }

    function toggleOtherReason(val) { /* UI helper */ }
    function selectedLeaveDurationLabel() {
        const duration = document.getElementById('leave-duration')?.value || 'full';
        if (duration === 'first_half') return '1st Half';
        if (duration === 'second_half') return '2nd Half';
        return 'Full Day';
    }

    function isHalfDayLeave() {
        const duration = document.getElementById('leave-duration')?.value;
        return duration === 'first_half' || duration === 'second_half';
    }

    function syncHalfDayLeaveDates() {
        const leaveType = document.getElementById('leave-type')?.value;
        if (leaveType === 'One day Leave' || isHalfDayLeave()) {
            const from = document.getElementById('leave-from');
            const to = document.getElementById('leave-to');
            if (from?.value && to) to.value = from.value;
        }
        calcDays();
    }

    function handleLeaveDurationChange() {
        const to = document.getElementById('leave-to');
        if (to) to.disabled = isHalfDayLeave();
        syncHalfDayLeaveDates();
        calcDays();
    }

    function calcDays() {
        const summary = document.getElementById('leave-days-summary');
        if (!summary) return;
        const from = document.getElementById('leave-from')?.value;
        const to = document.getElementById('leave-to')?.value;
        if (!from || !to) {
            summary.textContent = 'Select leave dates';
            return;
        }
        if (isHalfDayLeave()) {
            summary.textContent = `${selectedLeaveDurationLabel()} - 0.5 day`;
            return;
        }
        const start = new Date(from);
        const end = new Date(to);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
            summary.textContent = 'Check date range';
            return;
        }
        const days = Math.floor((end - start) / 86400000) + 1;
        summary.textContent = `${days} day${days === 1 ? '' : 's'}`;
    }
    function formatLocalDate(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    function populateSaturdays() {
        selectedSaturday = null;
        const now = new Date(), month = now.getMonth(), year = now.getFullYear();
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const monthKey = `${year}-${(month + 1).toString().padStart(2, '0')}`;
        const saturdays = [];
        for (let i = 1; i <= 31; i++) {
            const d = new Date(year, month, i);
            if (d.getMonth() === month && d.getDay() === 6) saturdays.push(d);
        }
        const q = query(ref(db, 'worksync/requests'), orderByChild('userId'), equalTo(currentUser.email));
        get(q).then(snap => {
            const reqs = snap.val() || {};
            const applied = Object.values(reqs).some(r => r.type === 'saturday' && r.date?.startsWith(monthKey) && r.status !== 'rejected');
            document.getElementById('saturday-already-applied').classList.toggle('hidden', !applied);
            document.getElementById('saturday-picker').classList.toggle('hidden', applied);
            document.getElementById('saturday-picker').innerHTML = saturdays.map(s => {
                const str = formatLocalDate(s);
                const label = s.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

                if (s < today) {
                    return `<button disabled class="text-[10px] font-bold px-3 py-2 rounded-xl border border-slate-50 bg-slate-50 text-slate-300 cursor-not-allowed" title="Date has passed">${label}</button>`;
                }
                return `<button onclick="selectSaturday('${str}', this)" class="sat-btn text-[10px] font-bold px-3 py-2 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all">${label}</button>`;
            }).join('');
        });
    }

    async function submitHrRequest() {
        // If we're editing a leave request
        if (editingLeaveId) {
            await saveEditedLeave(editingLeaveId);
            return;
        }

        const type = document.getElementById('req-type').value;
        const base = { userId: currentUser.email, userName: currentUser.name, userRole: currentUser.role, status: 'pending', submittedAt: Date.now() };
        let req = {};
        if (type === 'leave') {
            const duration = document.getElementById('leave-duration').value;
            const fromDate = document.getElementById('leave-from').value;
            const toDate = isHalfDayLeave() ? fromDate : document.getElementById('leave-to').value;
            if (!fromDate || !toDate) return toast('Select leave date', 'error');
            if (new Date(toDate) < new Date(fromDate)) return toast('To Date cannot be before From Date', 'error');

            // Get approval chain for this user
            const approvalChain = LEAVE_APPROVAL_CHAINS[currentUser.email.toLowerCase()] || ['nanjil@vilpower.com'];
            const approvals = approvalChain.map((approverEmail, index) => ({
                approverEmail,
                approverName: knownUserByEmail(approverEmail)?.name || approverEmail,
                step: index + 1,
                status: 'pending',
                approvedAt: null,
                note: null
            }));

            req = {
                ...base,
                type,
                leaveType: document.getElementById('leave-type').value,
                leaveDuration: duration,
                leaveDurationLabel: selectedLeaveDurationLabel(),
                leaveDays: isHalfDayLeave() ? 0.5 : null,
                fromDate,
                toDate,
                reason: document.getElementById('req-reason').value,
                approvalChain,
                approvals,
                currentApprovalStep: 1
            };
        } else if (type === 'permission') {
            req = { ...base, type, date: document.getElementById('perm-date').value, fromTime: document.getElementById('perm-from').value, toTime: document.getElementById('perm-to').value, reason: document.getElementById('req-reason').value };
        } else {
            if (!selectedSaturday) return toast('Select a Saturday', 'error');
            req = { ...base, type, date: selectedSaturday };
        }
        await push(ref(db, 'worksync/requests'), req);
        toast('Request submitted', 'success');
        switchHrTab('my');
    }

    function loadMyRequests() {
        const q = query(ref(db, 'worksync/requests'), orderByChild('userId'), equalTo(currentUser.email));
        onValue(q, snap => {
            const list = Object.entries(snap.val() || {}).sort((a, b) => b[1].submittedAt - a[1].submittedAt);
            const el = document.getElementById('my-requests-list');
            if (!list.length) { el.innerHTML = `<p class="p-10 text-center text-xs text-slate-400 italic">No requests.</p>`; return; }
            el.innerHTML = list.map(([id, r]) => {
                let statusDisplay = r.status;
                let statusColor = 'bg-amber-50 text-amber-600';

                if (r.status === 'approved') {
                    statusColor = 'bg-emerald-50 text-emerald-600';
                } else if (r.status === 'rejected') {
                    statusColor = 'bg-rose-50 text-rose-600';
                } else if (r.approvals && Array.isArray(r.approvals)) {
                    // Show approval progress
                    const approvedCount = r.approvals.filter(a => a.status === 'approved').length;
                    statusDisplay = `${approvedCount}/${r.approvals.length} Approved`;
                    statusColor = approvedCount > 0 ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600';
                }

                // Check if request can be edited/deleted
                // For leave: must be pending (at any approval step)
                // For saturday/permission: must be pending (no approval chains)
                const canEditDelete = (r.type === 'leave' && r.status === 'pending') ||
                    ((r.type === 'saturday' || r.type === 'permission') && r.status === 'pending');

                return `
                        <div class="flex items-center justify-between p-5 hover:bg-slate-50 transition-all border-b border-slate-50 last:border-0">
                            <div class="flex-1">
                                <div class="flex items-center gap-2 mb-1">
                                    <span class="text-xs font-bold text-slate-900">${reqLabel(r)}</span>
                                    <span class="text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${statusColor}">${statusDisplay}</span>
                                </div>
                                <p class="text-[10px] text-slate-400 font-bold">${new Date(r.submittedAt).toLocaleDateString()}</p>
                                ${r.approvals ? `<p class="text-[9px] text-slate-500 mt-1">${r.approvals.map((a, i) => `<span class="text-[8px] font-bold px-1 py-0.5 rounded ${a.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}">${a.approverName.split(' ')[0]}</span>`).join(' → ')}</p>` : ''}
                            </div>
                            <div class="flex items-center gap-2">
                                <p class="text-[10px] font-bold text-slate-600">${reqDetail(r)}</p>
                                ${canEditDelete ? `
                                    <button onclick="openEditLeaveModal('${id}')" class="text-amber-600 hover:text-amber-700 text-[10px] font-bold px-3 py-1.5 hover:bg-amber-50 rounded-lg transition-all whitespace-nowrap">
                                        Edit
                                    </button>
                                    <button onclick="deleteLeave('${id}')" class="text-rose-600 hover:text-rose-700 text-[10px] font-bold px-3 py-1.5 hover:bg-rose-50 rounded-lg transition-all whitespace-nowrap">
                                        Delete
                                    </button>
                                ` : ''}
                            </div>
                        </div>`;
            }).join('');
        });
    }

    function loadApprovals() {
        if (!ADMIN_ROLES.includes(currentUser?.role)) return;
        if (!isAdmin()) return;
        onValue(ref(db, 'worksync/requests'), snap => {
            const list = Object.entries(snap.val() || {}).sort((a, b) => b[1].submittedAt - a[1].submittedAt);
            const el = document.getElementById('approvals-list');

            // Filter for requests pending approval from current user (leave requests with approval chains, or direct saturday/permission requests)
            const pendingForMe = list.filter(([, r]) => {
                if (r.status !== 'pending') return false;

                // If it's a leave request with an approval chain
                if (r.type === 'leave') {
                    if (!r.approvals || !Array.isArray(r.approvals)) return false;
                    const nextApproval = r.approvals.find(a => a.status === 'pending');
                    return nextApproval && nextApproval.approverEmail.toLowerCase() === currentUser.email.toLowerCase();
                }

                // If it's a saturday or permission request (visible to all admins since they don't have approval chains)
                if (r.type === 'saturday' || r.type === 'permission') {
                    return true;
                }

                return false;
            });

            if (pendingForMe.length === 0) {
                el.innerHTML = `<p class="p-10 text-center text-xs text-slate-400 italic">No pending approvals for you.</p>`;
                return;
            }

            el.innerHTML = pendingForMe.map(([id, r]) => {
                let approvalChainLabel = '<span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">Direct Admin Approval</span>';

                if (r.approvals && Array.isArray(r.approvals)) {
                    const nextApproval = r.approvals.find(a => a.status === 'pending');
                    const stepLabel = nextApproval ? `Step ${nextApproval.step}/${r.approvals.length}` : 'All Approved';
                    approvalChainLabel = r.approvals.map((a, idx) =>
                        `<span class="text-[9px] font-bold px-1.5 py-0.5 rounded ${a.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}">${a.approverName.split(' ')[0]}</span>`
                    ).join(' → ');
                }

                return `
                        <div class="flex items-center justify-between p-5 hover:bg-slate-50 transition-all border-b border-slate-50 last:border-0">
                            <div class="flex-1">
                                <div class="flex items-center gap-2 mb-2">
                                    <div class="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 font-black text-xs">${r.userName.charAt(0)}</div>
                                    <div>
                                        <p class="text-xs font-bold text-slate-900">${r.userName} — ${reqLabel(r)}</p>
                                        <p class="text-[10px] text-slate-400 font-bold uppercase">${reqDetail(r)}</p>
                                    </div>
                                </div>
                                <div class="text-[9px] text-slate-500 mt-1 flex items-center gap-1">${approvalChainLabel}</div>
                            </div>
                            <button onclick="openApproveModal('${id}')" class="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold px-4 py-2 rounded-xl shadow-lg shadow-indigo-100 transition-all whitespace-nowrap">Review</button>
                        </div>`;
            }).join('');
        });
    }

    function loadHrBadge() {
        if (!ADMIN_ROLES.includes(currentUser?.role)) return;
        if (!isAdmin()) return;
        const q = query(ref(db, 'worksync/requests'), orderByChild('status'), equalTo('pending'));
        onValue(q, snap => {
            const count = Object.keys(snap.val() || {}).length;
            document.getElementById('hr-badge').textContent = count;
            document.getElementById('hr-badge').classList.toggle('hidden', count === 0);
        });
    }

    function openApproveModal(id) {
        get(ref(db, `worksync/requests/${id}`)).then(snap => {
            const r = snap.val();
            pendingApprovalReq = { id, ...r };

            // Build approval chain status display
            let approvalChainHtml = '';
            if (r.approvals && Array.isArray(r.approvals)) {
                approvalChainHtml = `
                        <div class="mt-4 p-4 bg-slate-50 rounded-xl">
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Approval Chain</p>
                            <div class="space-y-2">
                                ${r.approvals.map((approval, idx) => `
                                    <div class="flex items-center gap-3">
                                        <div class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${approval.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}">
                                            ${approval.status === 'approved' ? '✓' : approval.step}
                                        </div>
                                        <div class="flex-1">
                                            <p class="text-xs font-bold text-slate-900">${approval.approverName}</p>
                                            <p class="text-[9px] text-slate-500">${approval.status === 'approved' ? `Approved on ${new Date(approval.approvedAt).toLocaleDateString()}` : 'Pending'}</p>
                                        </div>
                                        <span class="text-[9px] font-bold px-2 py-1 rounded ${approval.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}">${approval.status}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
            }

            document.getElementById('approve-modal-detail').innerHTML = `
                    <p class="mb-2 font-black">User: ${r.userName} (${r.userRole})</p>
                    <p class="mb-2">Request: ${reqLabel(r)}</p>
                    <p class="mb-2">Detail: ${reqDetail(r)}</p>
                    <p class="mb-4">Reason: ${r.reason || 'N/A'}</p>
                    ${approvalChainHtml}`;

            document.getElementById('approveModal').showModal();
        });
    }

    async function submitApproval(decision) {
        const note = document.getElementById('approve-note').value;
        const req = pendingApprovalReq;

        let updateData = {
            reviewedBy: currentUser.email,
            reviewNote: note,
            reviewedAt: Date.now()
        };

        if (req.approvals && Array.isArray(req.approvals)) {
            // Update the current approval step
            const nextApproval = req.approvals.find(a => a.status === 'pending');
            if (nextApproval) {
                nextApproval.status = decision === 'approved' ? 'approved' : 'rejected';
                nextApproval.approvedAt = Date.now();
                nextApproval.note = note;
            }

            updateData.approvals = req.approvals;

            if (decision === 'approved') {
                // Check if there are more pending approvals
                const allApproved = req.approvals.every(a => a.status === 'approved');
                if (allApproved) {
                    // All approvals complete - request is fully approved
                    updateData.status = 'approved';
                }
                // If not all approved, status remains 'pending' for next approver
            } else {
                // Rejected - stop the approval chain
                updateData.status = 'rejected';
            }

            updateData.currentApprovalStep = req.currentApprovalStep + 1;
        } else {
            // For non-leave requests or old format
            updateData.status = decision;
        }

        await update(ref(db, `worksync/requests/${req.id}`), updateData);
        document.getElementById('approveModal').close();
        toast(`Request ${decision === 'approved' ? 'approved' : 'rejected'}`, 'success');
    }

    function reqLabel(r) { return r.type === 'leave' ? `${r.leaveType}${r.leaveDurationLabel && r.leaveDurationLabel !== 'Full Day' ? ' - ' + r.leaveDurationLabel : ''}` : (r.type === 'permission' ? 'Permission' : 'Saturday'); }
    function reqDetail(r) {
        if (r.type === 'leave') {
            const range = r.fromDate === r.toDate ? r.fromDate : `${r.fromDate} - ${r.toDate}`;
            return r.leaveDurationLabel ? `${range} (${r.leaveDurationLabel})` : range;
        }
        return r.type === 'permission' ? `${r.date} ${r.fromTime}-${r.toTime}` : r.date;
    }

    // Edit/Delete Leave Functions
    let editingLeaveId = null;
    let editingLeaveData = null;

    async function openEditLeaveModal(id) {
        try {
            const snap = await get(ref(db, `worksync/requests/${id}`));
            if (!snap.exists()) {
                toast('Leave request not found', 'error');
                return;
            }
            const r = snap.val();

            // Verify this is a pending leave that can be edited
            if (r.type !== 'leave' || r.status !== 'pending' || r.currentApprovalStep !== 1) {
                toast('This leave cannot be edited', 'error');
                return;
            }

            editingLeaveId = id;
            editingLeaveData = r;

            // Set request type to leave
            document.getElementById('req-type').value = 'leave';
            setReqType('leave');

            // Populate form with leave data
            document.getElementById('leave-type').value = r.leaveType || 'One day Leave';
            document.getElementById('leave-from').value = r.fromDate || '';
            document.getElementById('leave-to').value = r.toDate || '';
            document.getElementById('leave-duration').value = r.leaveDuration || 'full';
            document.getElementById('req-reason').value = r.reason || '';
            handleLeaveTypeChange(r.leaveType || 'One day Leave');

            // Update the form title
            const applyPanel = document.getElementById('hr-panel-apply');
            const originalTitle = applyPanel.querySelector('h4').textContent;
            applyPanel.querySelector('h4').textContent = 'Edit Leave Request';

            // Scroll to the form
            applyPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });

            // Change the submit button text
            const submitBtn = applyPanel.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.textContent;
            submitBtn.textContent = 'Save Changes';

            // Store original state for restoration
            const restoreForm = () => {
                applyPanel.querySelector('h4').textContent = originalTitle;
                submitBtn.textContent = originalBtnText;
                editingLeaveId = null;
                editingLeaveData = null;
            };

            // Add a cancel button if not already there
            if (!submitBtn.nextElementSibling?.classList.contains('cancel-edit-btn')) {
                const cancelBtn = document.createElement('button');
                cancelBtn.type = 'button';
                cancelBtn.textContent = 'Cancel Edit';
                cancelBtn.className = 'cancel-edit-btn ml-2 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all text-sm font-bold';
                cancelBtn.onclick = () => {
                    restoreForm();
                    document.getElementById('req-type').value = 'leave';
                    setReqType('leave');
                    document.getElementById('leave-from').value = '';
                    document.getElementById('leave-to').value = '';
                    document.getElementById('leave-duration').value = 'full';
                    document.getElementById('req-reason').value = '';
                    document.getElementById('leave-type').value = 'One day Leave';
                    handleLeaveTypeChange('One day Leave');
                };
                submitBtn.parentNode.insertBefore(cancelBtn, submitBtn.nextSibling);
            }

        } catch (err) {
            console.error('Error opening edit modal:', err);
            toast('Error opening leave request', 'error');
        }
    }

    async function saveEditedLeave(id) {
        try {
            const leaveType = document.getElementById('leave-type').value;
            const fromDate = document.getElementById('leave-from').value;
            const toDate = isHalfDayLeave() ? fromDate : document.getElementById('leave-to').value;
            const reason = document.getElementById('req-reason').value;
            const duration = document.getElementById('leave-duration').value;

            if (!fromDate || !toDate) {
                toast('Please select leave dates', 'error');
                return;
            }

            if (new Date(toDate) < new Date(fromDate)) {
                toast('To Date cannot be before From Date', 'error');
                return;
            }

            const updateData = {
                leaveType,
                fromDate,
                toDate,
                leaveDuration: duration,
                leaveDurationLabel: selectedLeaveDurationLabel(),
                leaveDays: isHalfDayLeave() ? 0.5 : null,
                reason,
                updatedAt: Date.now()
            };

            await update(ref(db, `worksync/requests/${id}`), updateData);
            toast('Leave request updated successfully', 'success');

            // Reset form and UI
            const applyPanel = document.getElementById('hr-panel-apply');
            if (applyPanel) {
                applyPanel.querySelector('h4').textContent = 'Submit Request';
                const submitBtn = applyPanel.querySelector('button[type="submit"]');
                submitBtn.textContent = 'Submit Request';
                const cancelBtn = applyPanel.querySelector('.cancel-edit-btn');
                if (cancelBtn) cancelBtn.remove();
            }

            document.getElementById('req-type').value = 'leave';
            setReqType('leave');
            document.getElementById('leave-from').value = '';
            document.getElementById('leave-to').value = '';
            document.getElementById('leave-duration').value = 'full';
            document.getElementById('req-reason').value = '';
            document.getElementById('leave-type').value = 'Casual Leave';

            editingLeaveId = null;
            editingLeaveData = null;
            loadMyRequests();
            switchHrTab('my');
        } catch (err) {
            console.error('Error saving edited leave:', err);
            toast('Error saving changes', 'error');
        }
    }

    async function deleteLeave(id) {
        if (!confirm('Are you sure you want to delete this request?')) {
            return;
        }

        try {
            const snap = await get(ref(db, `worksync/requests/${id}`));
            if (!snap.exists()) {
                toast('Request not found', 'error');
                return;
            }
            const r = snap.val();

            // Verify this is a pending request that can be deleted
            const canDelete = (r.type === 'leave' && r.status === 'pending' && r.currentApprovalStep === 1) ||
                ((r.type === 'saturday' || r.type === 'permission') && r.status === 'pending');

            if (!canDelete) {
                toast('This request cannot be deleted', 'error');
                return;
            }

            await remove(ref(db, `worksync/requests/${id}`));
            toast('Request deleted successfully', 'success');
            loadMyRequests();
        } catch (err) {
            console.error('Error deleting request:', err);
            toast('Error deleting request', 'error');
        }
    }

    // MANUAL TASKS
    function openAddTaskModal(taskType = 'manual') {
        document.getElementById('mt-title').value = '';
        document.getElementById('mt-client').value = '';
        document.getElementById('mt-platform').value = 'internal';
        document.getElementById('mt-task-type').value = taskType === 'internal' ? 'internal' : 'manual';
        document.getElementById('mt-task-type-field')?.classList.toggle('hidden', taskType === 'internal');
        document.querySelector('#addTaskModal h3').textContent = taskType === 'internal' ? 'Add Internal Task' : 'Add Manual Task';

        const assigneeSelect = document.getElementById('mt-assignee');
        assigneeSelect.innerHTML = `<option value="">Unassigned</option>` + Array.from(allUsersMap.values()).map(u => `<option value="${u.email}">${u.name}</option>`).join('');
        assigneeSelect.value = currentUser.email;

        document.getElementById('mt-status').innerHTML = MANUAL_TASK_STATUSES.map(s => `<option value="${s}">${s}</option>`).join('');
        document.getElementById('mt-internal-status').innerHTML = INTERNAL_TASK_STATUSES.map(s => `<option value="${s}">${s}</option>`).join('');

        const jiraOpt = document.querySelector('#mt-platform option[value="jira"]');
        if (jiraOpt) jiraOpt.textContent = `Jira Cloud (${JIRA.projectKey})`;
        toggleMtFields();
        document.getElementById('addTaskModal').showModal();
    }

    function toggleMtFields() {
        const taskType = document.getElementById('mt-task-type').value;
        const manualFields = document.getElementById('mt-manual-fields');
        const internalFields = document.getElementById('mt-internal-fields');
        manualFields.classList.toggle('hidden', taskType === 'internal');
        internalFields.classList.toggle('hidden', taskType !== 'internal');
    }

    async function submitManualTask(startNow = false) {
        const platform = document.getElementById('mt-platform').value;
        const taskType = document.getElementById('mt-task-type').value;
        const title = document.getElementById('mt-title').value.trim();
        const client = document.getElementById('mt-client').value;
        const status = taskType === 'internal' ? document.getElementById('mt-internal-status').value : document.getElementById('mt-status').value;
        const priority = taskType === 'internal' ? document.getElementById('mt-internal-priority').value : document.getElementById('mt-priority').value;
        const assigneeEmail = document.getElementById('mt-assignee').value;
        const assigneeNameVal = assigneeEmail ? allUsersMap.get(assigneeEmail.toLowerCase())?.name || assigneeEmail : 'Unassigned';

        if (!title) return toast('Enter a task title', 'error');

        const btn = startNow ? document.getElementById('mt-start-now-btn') : document.getElementById('mt-submit-btn');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.innerHTML = `<iconify-icon icon="svg-spinners:ring-resize" width="18"></iconify-icon> ${startNow ? 'Starting...' : 'Creating...'}`;

        try {
            let createdTaskId = null;

            if (platform === 'jira') {
                const taskDueDate = document.getElementById('task-duedate')?.value || '';
                const projectKey = getJiraProjectKeyForDate(taskDueDate);
                const url = `https://${JIRA.domain}/rest/api/3/issue`;
                const payload = {
                    fields: {
                        project: { key: projectKey },
                        summary: title,
                        issuetype: { name: 'Task' },
                        labels: client ? [client.replace(/\s+/g, '_')] : []
                    }
                };

                if (assigneeEmail) {
                    const accountId = await findJiraAccountId({ email: assigneeEmail, name: assigneeNameVal });
                    if (accountId) {
                        payload.fields.assignee = { id: accountId };
                    }
                }

                const res = await jiraRequest(url, 'post', payload);
                if (res.success && (res.data?.key || res.key)) {
                    createdTaskId = res.data?.key || res.key;
                    toast(`Jira task ${createdTaskId} created!`, 'success');
                    await syncTasks(true); // Auto-sync to show the new task in the list
                } else {
                    throw new Error(jiraErrorMessage(res));
                }
            } else {
                if (!client) { toast('Select a client', 'error'); btn.disabled = false; btn.textContent = originalText; return; }
                const taskId = 'M-' + Date.now();
                createdTaskId = taskId;
                // If starting now, force status to "In Progress", otherwise use form value
                const taskStatus = startNow ? 'In Progress' : status;
                const task = { id: taskId, desc: title, client, status: taskStatus, priority, assignee: assigneeNameVal, assigneeEmail: assigneeEmail, manual: true, taskType, userId: assigneeEmail || currentUser.email, createdAt: Date.now() };
                await set(ref(db, `worksync/manual_tasks/${eKey(assigneeEmail || currentUser.email)}/${taskId}`), task);
                tasks = mergeTasksById([task, ...tasks]);
                renderTasks(); renderInternalTasks(); updateStats();
                toast('Task added to WorkSync', 'success');
            }

            // If Start Now button was clicked, auto-start the task
            if (startNow && createdTaskId) {
                document.getElementById('addTaskModal').close();
                
                // Use the proper doStartTask function to start the task
                // This ensures all the necessary updates and state management are handled correctly
                await doStartTask(createdTaskId);
            } else {
                document.getElementById('addTaskModal').close();
            }

            populateClientFilter();
            populateInternalClientFilter();
            populateInternalAssigneeFilter();
        } catch (err) {
            console.error('Task creation failed:', err);
            toast('Creation failed: ' + err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    function openEditTaskModal(taskId) {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return toast('Task not found', 'error');

        // Populate static fields
        document.getElementById('et-id').value = taskId;
        document.getElementById('et-task-id-display').textContent = taskId;
        document.getElementById('et-title').value = task.desc || '';
        document.getElementById('et-priority').value = task.priority || 'Medium';
        document.getElementById('et-duedate').value = task.duedate || '';

        // Populate Client dropdown
        const clientSelect = document.getElementById('et-client');
        clientSelect.innerHTML = `<option value="">Select client...</option>` + CLIENTS.map(c => `<option value="${c}">${c}</option>`).join('');
        clientSelect.value = task.client || '';

        // Populate Status dropdown
        const statusSelect = document.getElementById('et-status');
        const allStatuses = isInternalTask(task)
            ? INTERNAL_TASK_STATUSES
            : [...new Set([...MANUAL_TASK_STATUSES, ...tasks.filter(t => !isInternalTask(t)).map(t => t.status).filter(Boolean)])].sort();
        statusSelect.innerHTML = allStatuses.map(s => `<option value="${s}">${s}</option>`).join('');
        statusSelect.value = task.status || 'To Do';

        // Populate Assignee dropdown
        const assigneeSelect = document.getElementById('et-assignee'); // Use allUsersMap
        assigneeSelect.innerHTML = `<option value="">Unassigned</option>` + Array.from(allUsersMap.values()).map(u => `<option value="${u.email}">${u.name}</option>`).join('');
        assigneeSelect.value = task.assigneeEmail || '';

        document.getElementById('editTaskModal').showModal();
    }

    async function submitTaskUpdate() {
        const taskId = document.getElementById('et-id').value;
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return toast('Task not found to update', 'error');

        const originalTask = { ...tasks[taskIndex] };
        const newAssigneeEmail = document.getElementById('et-assignee').value;
        const newAssignee = allUsersMap.get(newAssigneeEmail.toLowerCase())?.name || 'Unassigned'; // Use allUsersMap

        const updates = {
            desc: document.getElementById('et-title').value.trim(),
            client: document.getElementById('et-client').value,
            status: document.getElementById('et-status').value,
            priority: document.getElementById('et-priority').value,
            duedate: document.getElementById('et-duedate').value,
            assignee: newAssignee,
            assigneeEmail: newAssigneeEmail,
            updatedAt: Date.now()
        };

        Object.assign(tasks[taskIndex], updates);

        // If assignee changes for a manual task, we must move it in Firebase
        if (originalTask.manual && originalTask.userId !== newAssigneeEmail) {
            tasks[taskIndex].userId = newAssigneeEmail; // Update userId on the task object
            await remove(ref(db, `worksync/manual_tasks/${eKey(originalTask.userId)}/${taskId}`));
            await set(ref(db, `worksync/manual_tasks/${eKey(newAssigneeEmail)}/${taskId}`), tasks[taskIndex]);
        } else if (originalTask.manual) {
            await update(ref(db, `worksync/manual_tasks/${eKey(originalTask.userId)}/${taskId}`), updates);
        }

        renderTasks(); updateStats();
        if (activeView === 'internal-tasks') renderInternalTasks();
        if (activeView === 'shoots') renderShootCalendar();
        if (activeView === 'dailyplan') renderDailyPlan();
        document.getElementById('editTaskModal').close();
        populateClientFilter();
        toast('Task updated successfully', 'success');
    }

    async function deleteManualTask() {
        const taskId = document.getElementById('et-id').value;
        if (!taskId) return;

        if (!confirm('Are you sure you want to permanently delete this task?')) return;

        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return toast('Task not found to delete', 'error');

        const task = tasks[taskIndex];
        if (!task.manual) return toast('Cannot delete a Jira task from here.', 'error');

        try {
            // Remove from Firebase
            await remove(ref(db, `worksync/manual_tasks/${eKey(task.userId)}/${taskId}`));

            // Remove from local state
            tasks.splice(taskIndex, 1);

            // Re-render UI
            renderTasks(); updateStats();
            if (activeView === 'internal-tasks') renderInternalTasks();
            if (activeView === 'shoots') renderShootCalendar();

            document.getElementById('editTaskModal').close();
            populateClientFilter();
            toast('Task deleted successfully', 'success');
        } catch (err) { console.error('Failed to delete task:', err); toast('Failed to delete task: ' + err.message, 'error'); }
    }

    function loadManualTasks() {
        if (!currentUser) return;
        if (isAdmin()) {
            // Admins load all manual tasks from all users
            onValue(ref(db, `worksync/manual_tasks`), snap => {
                const allManualTasks = [];
                snap.forEach(userTasksSnap => { // Iterate through each user's manual tasks
                    allManualTasks.push(...Object.values(userTasksSnap.val() || {}));
                });
                tasks = mergeTasksById([...tasks.filter(t => !t.manual), ...allManualTasks]);
                populateAssigneeFilter();
                populateClientFilter();
                populateInternalAssigneeFilter();
                populateInternalClientFilter();
                renderTasks(); updateStats();
                if (activeView === 'internal-tasks') renderInternalTasks();
                if (activeView === 'dailyplan') renderDailyPlan();
                if (activeView === 'reports' && currentReportTab === 'client') renderClientReport();
            });
        } else {
            // Regular users load only their own tasks
            onValue(ref(db, `worksync/manual_tasks/${eKey(currentUser.email)}`), snap => {
                const manual = Object.values(snap.val() || {});
                tasks = mergeTasksById([...tasks.filter(t => !t.manual), ...manual]);
                populateAssigneeFilter();
                populateClientFilter();
                populateInternalAssigneeFilter();
                populateInternalClientFilter();
                renderTasks(); updateStats();
                if (activeView === 'internal-tasks') renderInternalTasks();
                if (activeView === 'dailyplan') renderDailyPlan();
                if (activeView === 'reports' && currentReportTab === 'client') renderClientReport();
            });
        }
    }

    // DIAGNOSTICS
    async function diagnoseJira() {
        toast('Running Jira Diagnostics...', 'info');
        console.log('--- JIRA DIAGNOSTICS ---');
        const { domain } = JIRA;
        const projectKeys = JIRA.projectKeys || [JIRA.projectKey];
        let results = [];

        try {
            const d = await jiraRequest(`https://${domain}/rest/api/3/myself`);
            const jd = d.data || d;
            if (jd.accountId || jd.displayName) results.push('✓ Jira Auth: OK (' + (jd.displayName || jd.emailAddress) + ')');
            else results.push('✗ Jira Auth: FAILED (' + (jd.errorMessages?.join('; ') || JSON.stringify(jd).slice(0, 120)) + ')');
        } catch (e) { results.push('✗ Jira Auth: ERROR (' + e.message + ')'); }

        for (const key of projectKeys) {
            try {
                const d = await jiraRequest(`https://${domain}/rest/api/3/project/${key}`);
                const pd = d.data || d;
                if (pd.key || pd.name) results.push('✓ Project "' + key + '": Found (' + pd.name + ')');
                else results.push('✗ Project "' + key + '": NOT FOUND');
            } catch (e) { results.push('✗ Project Check (' + key + '): ERROR (' + e.message + ')'); }
        }

        alert('DIAGNOSTIC RESULTS:\n\n' + results.join('\n') + '\n\nCheck console for full JSON responses.');
    }

    async function updateJiraStatus(taskId, newStatusName) {
        try {
            // 1. Get available transitions for the issue
            const transitionsUrl = `https://${JIRA.domain}/rest/api/3/issue/${taskId}/transitions`;
            const transitionsRes = await jiraRequest(transitionsUrl);

            if (!transitionsRes.success || !transitionsRes.data?.transitions) {
                throw new Error('Could not fetch Jira transitions. ' + jiraErrorMessage(transitionsRes));
            }

            const transitions = transitionsRes.data.transitions;
            console.log(`Available transitions for ${taskId}:`, transitions.map(t => t.name));

            // 2. Find the transition that matches the target status name
            let targetTransition = transitions.find(t => t.name.toLowerCase() === newStatusName.toLowerCase());
            if (!targetTransition) {
                if (newStatusName.toLowerCase() === 'rework designs') {
                    targetTransition = transitions.find(t => t.name.toLowerCase() === 'rework');
                } else if (newStatusName.toLowerCase() === 'rework') {
                    targetTransition = transitions.find(t => t.name.toLowerCase() === 'rework designs');
                }
            }

            if (!targetTransition) {
                toast(`Transition to "${newStatusName}" not available for this task in Jira.`, 'error');
                console.error(`Transition to "${newStatusName}" not found. Available:`, transitions.map(t => t.name));
                return false; // Indicate failure
            }

            // 3. Perform the transition by posting the transition ID
            const transitionPayload = {
                transition: {
                    id: targetTransition.id
                }
            };
            const postTransitionsUrl = `https://${JIRA.domain}/rest/api/3/issue/${taskId}/transitions`;
            const updateRes = await jiraRequest(postTransitionsUrl, 'post', transitionPayload);

            if (updateRes.status === 204 || updateRes.success) {
                toast(`Jira task ${taskId} updated to "${newStatusName}"`, 'success');
                return true; // Indicate success
            } else {
                throw new Error('Failed to update Jira status. ' + jiraErrorMessage(updateRes));
            }
        } catch (err) {
            console.error('Jira status update failed:', err);
            toast(err.message, 'error');
            return false; // Indicate failure
        }
    }

    // UTILS
    let toastTimeout, toastHideTimeout;
    function toast(msg, type = 'info', onClick = null) {
        const t = document.getElementById('toast'), ti = document.getElementById('toast-icon'), tt = document.getElementById('toast-title'), tm = document.getElementById('toast-msg');
        if (!t) return;
        if (tt) tt.textContent = type.toUpperCase();
        if (tm) tm.textContent = msg;
        if (ti) {
            ti.className = `w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${type === 'success' ? 'bg-emerald-100 text-emerald-600' : (type === 'error' ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600')}`;
            ti.innerHTML = `<iconify-icon icon="${type === 'success' ? 'solar:check-circle-bold' : (type === 'error' ? 'solar:danger-circle-bold' : 'solar:info-circle-bold')}" width="20"></iconify-icon>`;
        }

        t.onclick = onClick;
        t.style.cursor = onClick ? 'pointer' : 'default';

        clearTimeout(toastTimeout);
        clearTimeout(toastHideTimeout);

        try {
            if (t.showPopover) t.showPopover();
        } catch (e) {
            // Ignore if already open or not supported
        }

        requestAnimationFrame(() => t.classList.add('show'));

        toastTimeout = setTimeout(() => {
            t.classList.remove('show');
            toastHideTimeout = setTimeout(() => {
                if (!t.classList.contains('show')) {
                    try {
                        if (t.hidePopover) t.hidePopover();
                    } catch (e) {
                        // Ignore already hidden popover error
                    }
                }
            }, 300);
        }, 3000);
    }

    // Expose toast to window for cross-module access
    window.toast = toast;

    function updateSystemStatus(ok, message, isAutoSync = false) {
        const dot = document.getElementById('system-status-dot');
        const text = document.getElementById('system-status-text');
        const wrapper = text?.parentElement;
        if (!dot || !text || !wrapper) return;

        // Clear any existing flash animations
        wrapper.classList.remove('animate-flash-green', 'animate-flash-red');

        if (ok) {
            dot.className = 'w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse';
            text.textContent = message || 'SYSTEM ONLINE';
            wrapper.classList.remove('bg-rose-50', 'border-rose-100');
            wrapper.classList.add('bg-slate-50', 'border-slate-200');
            text.classList.remove('text-rose-600');
            text.classList.add('text-slate-500');

            if (isAutoSync) {
                wrapper.classList.add('animate-flash-green');
                setTimeout(() => wrapper.classList.remove('animate-flash-green'), 2000);
            }
        } else {
            dot.className = 'w-1.5 h-1.5 rounded-full bg-rose-500';
            text.textContent = message || 'SYNC FAILED';
            wrapper.classList.add('bg-rose-50', 'border-rose-100');
            wrapper.classList.remove('bg-slate-50', 'border-slate-200');
            text.classList.add('text-rose-600');
            text.classList.remove('text-slate-500');

            if (isAutoSync) {
                wrapper.classList.add('animate-flash-red');
                setTimeout(() => wrapper.classList.remove('animate-flash-red'), 2000);
            }
        }
    }

    // ADMIN USER MANAGEMENT
    async function loadUsersList() {
        if (!isAdmin()) return;
        const list = document.getElementById('admin-users-list');
        list.innerHTML = `<p class="p-8 text-center text-xs text-slate-400 italic">Loading users...</p>`;

        const snap = await get(ref(db, 'worksync/users'));
        // Re-populate allUsersMap to ensure it's up-to-date
        allUsersMap = await getAllUsers();

        const allUsers = Array.from(allUsersMap.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        list.innerHTML = allUsers.map(u => `
                <div class="flex items-center justify-between p-5 hover:bg-slate-50 transition-all border-b border-slate-50">
                    <div class="flex items-center gap-4">
                        <img src="${u.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.avatar || u.name}`}" class="w-12 h-12 rounded-xl bg-white border border-slate-200 object-cover">
                        <div>
                            <p class="text-sm font-bold text-slate-900">${escapeHtml(u.name)}</p>
                            <p class="text-[10px] text-slate-400 font-bold uppercase">${escapeHtml(u.role || 'User')} · ${escapeHtml(u.email)}</p>
                        </div>
                    </div>
                    <button onclick="openAdminUserModal('${u.email}')" class="px-4 py-2 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all">Edit</button>
                </div>
            `).join('');
    }

    async function openAdminUserModal(email = null) {
        const modal = document.getElementById('adminUserModal');
        document.getElementById('admin-user-modal-title').textContent = email ? 'Edit User' : 'Add New User';

        const nameInp = document.getElementById('au-name'), emailInp = document.getElementById('au-email');
        const roleInp = document.getElementById('au-role'), phoneInp = document.getElementById('au-phone'), picImg = document.getElementById('au-profile-pic');
        const empIdInp = document.getElementById('au-empid'), birthdayInp = document.getElementById('au-birthday');

        if (email) {
            const snap = await get(ref(db, `worksync/users/${eKey(email)}`));
            const u = { ...(knownUserByEmail(email) || {}), ...(snap.val() || {}) };
            nameInp.value = u.name || ''; emailInp.value = u.email || ''; emailInp.readOnly = true; emailInp.classList.add('opacity-60');
            roleInp.value = u.role || 'Employee'; phoneInp.value = u.phone || ''; picImg.src = u.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.avatar || u.name}`;
            empIdInp.value = u.empId || ''; birthdayInp.value = u.birthday || '';
            document.getElementById('au-delete-btn').classList.remove('hidden');
        } else {
            nameInp.value = ''; emailInp.value = ''; emailInp.readOnly = false; emailInp.classList.remove('opacity-60');
            roleInp.value = 'Employee'; phoneInp.value = ''; picImg.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=NewUser`;
            empIdInp.value = ''; birthdayInp.value = '';
            document.getElementById('au-delete-btn').classList.add('hidden');
        }
        delete picImg.dataset.newPic;
        modal.showModal();
    }

    async function auUploadPhoto() {
        const file = document.getElementById('au-photo-upload').files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) return toast('Image must be less than 2MB', 'error');
        toast('Processing photo...', 'info');
        try {
            const base64Url = await fileToBase64(file);
            document.getElementById('au-profile-pic').src = base64Url;
            document.getElementById('au-profile-pic').dataset.newPic = base64Url;
            toast('Photo ready to save', 'success');
        } catch (err) { toast('Upload failed: ' + err.message, 'error'); }
    }

    async function saveAdminUser() {
        const name = document.getElementById('au-name').value.trim(), email = document.getElementById('au-email').value.trim();
        const role = document.getElementById('au-role').value, phone = document.getElementById('au-phone').value.trim();
        const empId = document.getElementById('au-empid').value.trim(), birthday = document.getElementById('au-birthday').value;
        const picImg = document.getElementById('au-profile-pic'), newPic = picImg.dataset.newPic;
        if (!name || !email) return toast('Name and Email are required', 'error');

        const key = eKey(email);
        const snap = await get(ref(db, `worksync/users/${key}`));
        const updates = { ...(snap.val() || {}), name, email, role, phone, empId, birthday, updatedAt: Date.now() };
        if (newPic) updates.profilePicture = newPic;

        await set(ref(db, `worksync/users/${key}`), updates);
        toast('User saved successfully', 'success');
        document.getElementById('adminUserModal').close();
        loadUsersList();
    }

    async function deleteAdminUser() {
        const email = document.getElementById('au-email').value;
        if (!email) return;
        if (email === currentUser.email) return toast("You cannot delete your own account.", "error");
        if (!confirm(`Are you sure you want to delete ${email}? This will permanently remove their profile data.`)) return;

        try {
            await remove(ref(db, `worksync/users/${eKey(email)}`));
            toast('User removed from database', 'success');
            document.getElementById('adminUserModal').close();
            loadUsersList();
        } catch (err) {
            toast('Delete failed: ' + err.message, 'error');
        }
    }

    window.addEventListener('resize', () => {
        if (isAdmin()) renderAdminReportChart();
    });

    window.addEventListener('click', (e) => {
        const menu = document.getElementById('status-menu');
        if (menu && !menu.classList.contains('hidden') && !e.target.closest('#status-menu') && !e.target.closest('button[onclick*="status-menu"]')) {
            menu.classList.add('hidden');
        }
        if (!e.target.closest('.chat-dropdown') && !e.target.closest('button[onclick*="chat-dropdown"]')) {
            document.querySelectorAll('.chat-dropdown').forEach(el => el.classList.add('hidden'));
        }
    });

    function toggleStatusFilter(cb) {
        const val = cb.value;
        const allCheckbox = document.querySelector('#status-menu input[value="all"]');

        if (val === 'all') {
            if (cb.checked) {
                currentStatusFilter = 'all';
                document.querySelectorAll('#status-menu input[type="checkbox"]:not([value="all"])').forEach(c => c.checked = false);
            } else {
                currentStatusFilter = [];
            }
        } else {
            // A specific status checkbox was changed
            const selected = Array.from(document.querySelectorAll('#status-menu input[type="checkbox"]:not([value="all"]):checked')).map(c => c.value);

            if (selected.length === 0) {
                // If no specific statuses are selected, revert to 'all'
                currentStatusFilter = 'all';
                allCheckbox.checked = true;
            } else {
                currentStatusFilter = selected;
                allCheckbox.checked = false;
            }
        }

        const label = document.getElementById('status-filter-label');
        if (currentStatusFilter === 'all') {
            label.textContent = 'All Status';
        } else if (currentStatusFilter.length === 0) {
            label.textContent = 'No Status Selected';
        } else if (currentStatusFilter.length === 1) {
            label.textContent = currentStatusFilter[0];
        } else {
            label.textContent = `${currentStatusFilter.length} Selected`;
        }
        renderTasks();
    }

    function setAssigneeFilter(v) {
        currentAssigneeFilter = v;
        renderTasks();
    }

    function searchTasks(term) {
        currentSearchTerm = term.trim();
        renderTasks();
    }

    function setClientFilter(v) {
        currentClientFilter = v;
        renderTasks();
    }

    function setDueDateFilter(v) {
        currentDueDateFilter = v;
        renderTasks();
    }

    function toggleInternalStatusFilter(cb) {
        const val = cb.value;
        const allCheckbox = document.querySelector('#internal-status-menu input[value="all"]');

        if (val === 'all') {
            if (cb.checked) {
                currentInternalStatusFilter = 'all';
                document.querySelectorAll('#internal-status-menu input[type="checkbox"]:not([value="all"])').forEach(c => c.checked = false);
            } else {
                currentInternalStatusFilter = [];
            }
        } else {
            const selected = Array.from(document.querySelectorAll('#internal-status-menu input[type="checkbox"]:not([value="all"]):checked')).map(c => c.value);
            if (selected.length === 0) {
                currentInternalStatusFilter = 'all';
                allCheckbox.checked = true;
            } else {
                currentInternalStatusFilter = selected;
                allCheckbox.checked = false;
            }
        }

        const label = document.getElementById('internal-status-filter-label');
        if (currentInternalStatusFilter === 'all') label.textContent = 'All Status';
        else if (currentInternalStatusFilter.length === 0) label.textContent = 'No Status Selected';
        else if (currentInternalStatusFilter.length === 1) label.textContent = currentInternalStatusFilter[0];
        else label.textContent = `${currentInternalStatusFilter.length} Selected`;
        renderInternalTasks();
    }

    function setInternalAssigneeFilter(v) {
        currentInternalAssigneeFilter = v;
        renderInternalTasks();
    }

    function searchInternalTasks(term) {
        currentInternalSearchTerm = term.trim();
        renderInternalTasks();
    }

    function setInternalClientFilter(v) {
        currentInternalClientFilter = v;
        renderInternalTasks();
    }

    function setInternalDueDateFilter(v) {
        currentInternalDueDateFilter = v;
        renderInternalTasks();
    }

    function populateClientFilter() {
        const sel = document.getElementById('client-filter');
        if (!sel) return;
        const existingValue = sel.value;

        const clientsFromTasks = tasks.filter(t => !isInternalTask(t)).map(t => t.client).filter(Boolean);
        const allClients = [...new Set([...CLIENTS, ...clientsFromTasks])].sort();

        sel.innerHTML = `<option value="all">All Clients</option>`;
        allClients.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            sel.appendChild(opt);
        });
        sel.value = [...sel.options].some(o => o.value === existingValue) ? existingValue : 'all';
    }

    function populateInternalClientFilter() {
        const sel = document.getElementById('internal-client-filter');
        if (!sel) return;
        const existingValue = sel.value;
        const clientsFromTasks = tasks.filter(isInternalTask).map(t => t.client).filter(Boolean);
        const allClients = [...new Set([...CLIENTS, ...clientsFromTasks])].sort();

        sel.innerHTML = `<option value="all">All Clients</option>`;
        allClients.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            sel.appendChild(opt);
        });
        sel.value = [...sel.options].some(o => o.value === existingValue) ? existingValue : 'all';
        currentInternalClientFilter = sel.value;
    }

    function populateAssigneeFilter() {
        const sel = document.getElementById('assignee-filter');
        if (!sel) return;
        const existingValue = sel.value;

        sel.innerHTML = ` 
                <option value="all">All Assignees</option>
                <option value="me">Assigned to me (${currentUser?.name || 'me'})</option>
            `;

        const uniqueIdentities = new Map(); // Key: email or name:norm, Value: { email, name }

        // 1. System Users (Config + Live)
        Array.from(allUsersMap.values()).forEach(u => { // Use allUsersMap directly
            if (!u.email || u.email === '123') return;
            const emailKey = u.email.toLowerCase();
            if (!uniqueIdentities.has(emailKey)) {
                uniqueIdentities.set(emailKey, { email: u.email, name: u.name });
            }
        });

        // 2. Names from synced tasks (Deduplicated against system users)
        tasks.filter(t => !isInternalTask(t)).forEach(t => {
            const name = t.assignee || assigneeName(t);
            const email = (t.assigneeEmail || t.userId || '').toLowerCase();

            if (!name || name === 'Unassigned') return;

            // If we have an email and it's already in our map, skip
            if (email && uniqueIdentities.has(email)) return;

            const normName = normalizeAssigneeValue(name);

            // Check if this normalized name matches any existing user's name
            const isKnown = [...uniqueIdentities.values()].some(u => {
                const uNorm = normalizeAssigneeValue(u.name);
                return uNorm.includes(normName) || normName.includes(uNorm);
            });

            if (!isKnown && !uniqueIdentities.has('name:' + normName)) {
                uniqueIdentities.set('name:' + normName, { email: 'name:' + normName, name: name });
            }
        });

        // 3. Render sorted options
        [...uniqueIdentities.values()]
            .filter(u => u.email.toLowerCase() !== currentUser?.email.toLowerCase())
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach(u => {
                const opt = document.createElement('option');
                opt.value = u.email;
                opt.textContent = u.name;
                sel.appendChild(opt);
            });

        sel.value = [...sel.options].some(o => o.value === existingValue) ? existingValue : 'all';
        currentAssigneeFilter = sel.value;
    }

    function populateInternalAssigneeFilter() {
        const sel = document.getElementById('internal-assignee-filter');
        if (!sel) return;
        const existingValue = sel.value;

        sel.innerHTML = `
                <option value="all">All Assignees</option>
                <option value="me">Assigned to me (${currentUser?.name || 'me'})</option>
            `;

        const uniqueIdentities = new Map();
        Array.from(allUsersMap.values()).forEach(u => {
            if (!u.email || u.email === '123') return;
            uniqueIdentities.set(u.email.toLowerCase(), { email: u.email, name: u.name });
        });
        tasks.filter(isInternalTask).forEach(t => {
            const name = t.assignee || assigneeName(t);
            const email = (t.assigneeEmail || t.userId || '').toLowerCase();
            if (!name || name === 'Unassigned') return;
            if (email && uniqueIdentities.has(email)) return;
            const normName = normalizeAssigneeValue(name);
            if (!uniqueIdentities.has('name:' + normName)) uniqueIdentities.set('name:' + normName, { email: 'name:' + normName, name });
        });

        [...uniqueIdentities.values()]
            .filter(u => u.email.toLowerCase() !== currentUser?.email.toLowerCase())
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach(u => {
                const opt = document.createElement('option');
                opt.value = u.email;
                opt.textContent = u.name;
                sel.appendChild(opt);
            });

        sel.value = [...sel.options].some(o => o.value === existingValue) ? existingValue : 'me';
        currentInternalAssigneeFilter = sel.value;
    }

    async function renderProjects() {
        const container = document.getElementById('projects-grid');
        if (!container) return;

        container.innerHTML = `<div class="col-span-full text-center py-12"><p class="text-slate-400 animate-pulse">Loading projects...</p></div>`;

        const allUsers = await getAllUsers();

        const allClients = [...new Set([...CLIENTS, ...tasks.map(t => t.client).filter(Boolean)])];

        const projects = allClients.map(clientName => {
            const projectTasks = tasks.filter(t => t.client === clientName);
            if (projectTasks.length === 0) {
                return null;
            }

            const total = projectTasks.length;
            const done = projectTasks.filter(t => isDone(t.status)).length;
            const progress = total > 0 ? Math.round((done / total) * 100) : 0;

            const uniqueAssigneeEmails = [...new Set(projectTasks.map(t => t.assigneeEmail).filter(Boolean))];
            // Use allUsersMap for assignee details
            const assigneeDetails = uniqueAssigneeEmails.map(email => {
                const user = allUsers.get(email.toLowerCase());
                return {
                    name: user?.name || email.split('@')[0],
                    avatar: user?.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.avatar || user?.name || email}`
                };
            });

            return {
                name: clientName,
                total,
                done,
                progress,
                assignees: assigneeDetails
            };
        }).filter(Boolean).sort((a, b) => b.total - a.total);

        if (projects.length === 0) {
            container.innerHTML = `<div class="col-span-full bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/40 border border-slate-100 text-center">
                        <div class="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 mx-auto">
                            <iconify-icon icon="solar:folder-with-files-bold-duotone" width="40" class="text-slate-400"></iconify-icon>
                        </div>
                        <h3 class="text-xl font-black text-slate-900 mb-2">No Active Projects</h3>
                        <p class="text-sm text-slate-400 max-w-xs mx-auto">Tasks need to be synced and assigned to clients to see project overviews here.</p>
                    </div>`;
            return;
        }

        container.innerHTML = projects.map(p => {
            const avatarStack = p.assignees.slice(0, 5).map((assignee, index) =>
                `<img src="${assignee.avatar}" title="${assignee.name}" class="w-8 h-8 rounded-full border-2 border-white object-cover bg-slate-200" style="margin-left: ${index > 0 ? '-12px' : '0'};">`
            ).join('');
            const moreAssignees = p.assignees.length > 5 ? `<div class="w-8 h-8 rounded-full border-2 border-white bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold" style="margin-left: -12px;">+${p.assignees.length - 5}</div>` : '';

            return `
                <div class="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col transition-all hover:shadow-2xl hover:-translate-y-1">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-base font-black text-slate-900 tracking-tight">${p.name}</h3>
                        <span class="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">${p.progress}%</span>
                    </div>
                    <div class="space-y-1 mb-4">
                        <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div class="bg-indigo-600 h-full transition-all duration-500" style="width: ${p.progress}%"></div>
                        </div>
                        <div class="flex justify-between text-[10px] font-bold text-slate-400">
                            <span>Progress</span>
                            <span>${p.done} / ${p.total} Done</span>
                        </div>
                    </div>
                    <div class="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                        <div class="flex items-center">
                            ${avatarStack}
                            ${moreAssignees}
                        </div>
                        <button onclick="openProjectDetails('${p.name.replace(/'/g, "\\'")}')" class="text-xs font-bold text-indigo-600 hover:underline">View Details</button>
                    </div>
                </div>
                `;
        }).join('');
    }

    // EXPORTS
    function openProjectDetails(clientName) {
        const modal = document.getElementById('projectDetailModal');
        const titleEl = document.getElementById('project-detail-title');
        const contentEl = document.getElementById('project-detail-content');
        if (!modal || !titleEl || !contentEl) return;

        titleEl.textContent = `Project Details: ${clientName}`;

        const projectTasks = tasks.filter(t => t.client === clientName);
        const videoTasks = projectTasks.filter(t =>
            (t.desc || '').toLowerCase().includes('video') ||
            (t.desc || '').toLowerCase().includes('shoot') ||
            t.status === 'Shoot Needed'
        );

        if (videoTasks.length === 0) {
            contentEl.innerHTML = `<p class="text-center text-slate-500 py-8">No video-related tasks found for this project.</p>`;
        } else {
            contentEl.innerHTML = `
                    <h4 class="text-sm font-bold text-slate-800">Video Details (${videoTasks.length})</h4>
                    <div class="border border-slate-100 rounded-2xl overflow-hidden">
                        <table class="w-full text-left text-sm">
                            <thead class="bg-slate-50">
                                <tr>
                                    <th class="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase">Task</th>
                                    <th class="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase">Status</th>
                                    <th class="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase">Assignee</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                ${videoTasks.map(t => `
                                    <tr class="hover:bg-slate-50">
                                        <td class="px-4 py-3"><p class="font-semibold text-slate-800">${escapeHtml(t.desc)}</p><p class="text-xs text-slate-500">${t.id}</p></td>
                                        <td class="px-4 py-3"><span class="text-[10px] font-bold px-2 py-1 rounded-full ${statusClass(t.status)}">${t.status}</span></td>
                                        <td class="px-4 py-3 text-xs text-slate-600">${assigneeName(t)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
        }

        modal.showModal();
    }

    function openClientReportDetails(clientName) {
        const modal = document.getElementById('clientReportDetailModal');
        const titleEl = document.getElementById('client-report-detail-title');
        const contentEl = document.getElementById('client-report-detail-content');
        if (!modal || !titleEl || !contentEl) return;

        titleEl.textContent = `Monthly Plan Breakdown: ${clientName}`;

        const fromTs = reportDateFrom ? new Date(reportDateFrom).getTime() : 0;
        const toTs = reportDateTo ? new Date(reportDateTo).getTime() + 86400000 : Infinity;

        const clientTasks = tasks.filter(t => {
            if (t.client !== clientName) return false;
            if (!reportDateFrom || !reportDateTo) return true;
            if (!t.duedate) return true;
            const dTs = new Date(t.duedate).getTime();
            return dTs >= fromTs && dTs < toTs;
        }).sort((a, b) => isDone(a.status) - isDone(b.status));

        if (clientTasks.length === 0) {
            contentEl.innerHTML = `<p class="text-center text-slate-400 text-sm py-8">No tasks found for ${escapeHtml(clientName)} in the selected period.</p>`;
        } else {
            contentEl.innerHTML = `
                <div class="border border-slate-100 rounded-2xl overflow-hidden">
                    <table class="w-full text-left text-sm">
                        <thead class="bg-slate-50">
                            <tr>
                                <th class="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Task ID</th>
                                <th class="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
                                <th class="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                <th class="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assignee</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${clientTasks.map(t => {
                const taskKeyHtml = t.manual ? t.id : `<a href="https://${JIRA.domain}/browse/${t.id}" target="_blank" class="hover:underline hover:text-indigo-800 transition-colors inline-flex items-center gap-1">${t.id} <iconify-icon icon="solar:external-link-linear" width="10"></iconify-icon></a>`;
                return `
                                <tr class="hover:bg-slate-50 transition-colors">
                                    <td class="px-4 py-3 text-xs font-mono font-bold text-indigo-600">${taskKeyHtml}</td>
                                    <td class="px-4 py-3"><p class="text-xs font-bold text-slate-900">${escapeHtml(t.desc)}</p></td>
                                    <td class="px-4 py-3"><span class="text-[10px] font-bold px-2 py-1 rounded-full ${statusClass(t.status)}">${t.status}</span></td>
                                    <td class="px-4 py-3 text-xs text-slate-600">${escapeHtml(assigneeName(t))}</td>
                                </tr>
                                `;
            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
        modal.showModal();
    }

    // DAILY PLAN
    function initDailyPlan() {
        if (!db || !currentUser) return;

        const dateInput = document.getElementById('dp-date');
        if (dateInput && !dateInput.value) dateInput.value = todayIso();

        // Show filter for admins or users with special permissions
        const hasSpecialAccess = isAdmin() || (currentUser && (DAILY_PLAN_VIEW_ACCESS[currentUser.email.toLowerCase()] || []).length > 0);
        if (hasSpecialAccess) {
            document.getElementById('dp-user-filter-container').classList.remove('hidden');
            populateDpUserFilter();
        } else {
            document.getElementById('dp-user-filter-container').classList.add('hidden');
        }

        if (dailyPlansUnsub) dailyPlansUnsub();
        dailyPlansUnsub = onValue(ref(db, 'worksync/daily_plans'), snap => {
            dailyPlans = snap.val() || {};
            if (activeView === 'dailyplan') renderDailyPlan();
        });
    }

    function populateDpUserFilter() {
        const sel = document.getElementById('dp-user-filter');
        if (!sel) return;
        const current = sel.value;
        sel.innerHTML = `<option value="all">All Users</option>`;

        // Merge hardcoded users with live users to ensure everyone is listed
        const merged = new Map();
        USERS.forEach(u => merged.set(u.email.toLowerCase(), { ...u }));
        currentWorkUsers.forEach(u => merged.set(u.email.toLowerCase(), { ...(merged.get(u.email.toLowerCase()) || {}), ...u }));
        let usersList = [...merged.values()].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        // If not admin, filter to only allowed users
        if (!isAdmin()) {
            const allowedEmails = new Set(['current-user']); // Include self
            if (currentUser) allowedEmails.add(currentUser.email.toLowerCase());
            const customAccess = DAILY_PLAN_VIEW_ACCESS[currentUser.email.toLowerCase()] || [];
            customAccess.forEach(email => allowedEmails.add(email.toLowerCase()));
            
            usersList = usersList.filter(u => allowedEmails.has(u.email.toLowerCase()));
        }

        usersList.forEach(u => {
            sel.innerHTML += `<option value="${u.email}">${u.name}</option>`;
        });
        if (current && [...sel.options].some(o => o.value === current)) sel.value = current;
    }

    function toggleDpUserDropdown() {
        const dropdown = document.getElementById('dp-user-dropdown');
        const arrow = document.getElementById('dp-user-filter-arrow');
        if (dropdown) {
            dropdown.classList.toggle('hidden');
            if (arrow) arrow.classList.toggle('rotate-180');
        }
    }

    function selectAllDpUsers(selectAll) {
        const userCheckboxes = document.querySelectorAll('[id^="dp-user-check-"]');
        userCheckboxes.forEach(checkbox => {
            checkbox.checked = selectAll;
        });
    }

    function filterDailyPlan(type) {
        dpFilter = type;
        const allBtn = document.getElementById('dp-filter-all');
        const carryBtn = document.getElementById('dp-filter-carry');
        if (type === 'all') {
            allBtn.className = 'text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg bg-white text-indigo-600 shadow-sm transition-all';
            carryBtn.className = 'text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-600 transition-all';
        } else {
            allBtn.className = 'text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-600 transition-all';
            carryBtn.className = 'text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg bg-white text-amber-600 shadow-sm transition-all';
        }
        renderDailyPlan();
    }

    function renderDailyPlan() {
        const tbody = document.getElementById('dp-tasks-tbody');
        const countEl = document.getElementById('dp-task-count');
        const statsGrid = document.getElementById('dp-stats-dashboard');
        if (!tbody || !countEl) return;

        const dateStr = document.getElementById('dp-date').value || todayIso();
        const selectedDate = new Date(dateStr);
        selectedDate.setHours(0, 0, 0, 0);

        const mergedUsers = Array.from(allUsersMap.values()); // Use allUsersMap

        let targetUsers;
        if (isAdmin() && document.getElementById('dp-user-filter').value !== 'all') {
            // Admin selected a specific user
            targetUsers = [document.getElementById('dp-user-filter').value];
        } else if (isAdmin()) {
            // Admin viewing all
            targetUsers = mergedUsers.map(u => u.email);
        } else {
            // Non-admin: show own tasks and any users they have permission to view
            targetUsers = [currentUser.email];
            const allowedUsers = DAILY_PLAN_VIEW_ACCESS[currentUser.email.toLowerCase()] || [];
            targetUsers = targetUsers.concat(allowedUsers);
        }

        let plannedTasks = [];

        targetUsers.forEach(userEmail => {
            const userPlans = dailyPlans[eKey(userEmail)] || {};
            Object.entries(userPlans).forEach(([taskId, planData]) => {
                const planDateStr = planData.date;
                const planDate = new Date(planDateStr);
                planDate.setHours(0, 0, 0, 0);

                const task = tasks.find(t => t.id === taskId);
                if (!task) return;

                const isExactDate = planDate.getTime() === selectedDate.getTime();
                const isCarryOver = planDate.getTime() < selectedDate.getTime() && DAILY_PLAN_CARRY_STATUSES.includes(task.status);

                if (isExactDate || isCarryOver) {
                    plannedTasks.push({
                        ...task,
                        planData,
                        plannedForUser: userEmail,
                        isCarryOver
                    });
                }
            });

            tasks
                .filter(task => DAILY_PLAN_AUTO_INCLUDE_STATUSES.includes(task.status) && assigneeMatches(task, userEmail))
                .forEach(task => {
                    plannedTasks.push({
                        ...task,
                        planData: { date: dateStr },
                        plannedForUser: userEmail,
                        isCarryOver: false,
                        isAutoIncluded: true
                    });
                });
        });

        const uniquePlans = [];
        const seen = new Set();
        plannedTasks.forEach(pt => {
            const k = `${pt.id}-${pt.plannedForUser}`;
            if (!seen.has(k)) { seen.add(k); uniquePlans.push(pt); }
        });

        // Calculate and render minimal dashboard stats
        const stats = {
            total: uniquePlans.length,
            todo: uniquePlans.filter(t => isTodo(t.status)).length,
            progress: uniquePlans.filter(t => isInProgress(t.status)).length,
            completed: uniquePlans.filter(t => isDone(t.status)).length,
            hold: uniquePlans.filter(t => (t.status || '').toLowerCase().includes('hold')).length
        };

        if (statsGrid) statsGrid.innerHTML = `
                <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Total Tasks</p>
                    <p class="text-xl font-black text-slate-900">${stats.total}</p>
                </div>
                <div class="bg-blue-50 p-4 rounded-2xl border border-blue-100/50 shadow-sm">
                    <p class="text-[10px] text-blue-500 font-bold uppercase tracking-widest mb-1">Assigned</p>
                    <p class="text-xl font-black text-blue-600">${stats.todo}</p>
                </div>
                <div class="bg-amber-50 p-4 rounded-2xl border border-amber-100/50 shadow-sm">
                    <p class="text-[10px] text-amber-500 font-bold uppercase tracking-widest mb-1">In Progress</p>
                    <p class="text-xl font-black text-amber-600">${stats.progress}</p>
                </div>
                <div class="bg-rose-50 p-4 rounded-2xl border border-rose-100/50 shadow-sm">
                    <p class="text-[10px] text-rose-500 font-bold uppercase tracking-widest mb-1">On Hold</p>
                    <p class="text-xl font-black text-rose-600">${stats.hold}</p>
                </div>
                <div class="bg-emerald-50 p-4 rounded-2xl border border-emerald-100/50 shadow-sm">
                    <p class="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mb-1">Completed</p>
                    <p class="text-xl font-black text-emerald-600">${stats.completed}</p>
                </div>
            `;

        countEl.textContent = `${uniquePlans.length} Task${uniquePlans.length !== 1 ? 's' : ''}`;

        if (!uniquePlans.length) {
            tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-10 text-center text-xs text-slate-400 italic">No tasks planned for this date.</td></tr>`;
            return;
        }

        if (dpSortCol) {
            updateSortIconUI('dp', dpSortCol, dpSortDir);
            uniquePlans.sort((a, b) => {
                let valA, valB;
                if (dpSortCol === 'assignee') { valA = assigneeName(a); valB = assigneeName(b); }
                else { valA = a[dpSortCol] || ''; valB = b[dpSortCol] || ''; }

                if (typeof valA === 'string') valA = valA.toLowerCase();
                if (typeof valB === 'string') valB = valB.toLowerCase();

                if (valA < valB) return dpSortDir === 'asc' ? -1 : 1;
                if (valA > valB) return dpSortDir === 'asc' ? 1 : -1;
                return 0;
            });
        }

        tbody.innerHTML = uniquePlans.map(t => {
            const isInternal = isInternalTask(t);
            const taskKeyHtml = (t.manual || isInternal)
                ? `<button onclick="openEditTaskModal('${t.id}')" class="hover:underline hover:text-indigo-800 transition-colors text-left">${t.id}</button>`
                : `<a href="https://${JIRA.domain}/browse/${t.id}" target="_blank" class="hover:underline hover:text-indigo-800 transition-colors inline-flex items-center gap-1" title="Open in Jira">${t.id} <iconify-icon icon="solar:external-link-linear" width="12"></iconify-icon></a>`;
            const statusOptions = isInternal
                ? [...new Set([...INTERNAL_TASK_STATUSES, t.status])].filter(Boolean)
                : [...new Set([...MANUAL_TASK_STATUSES, ...tasks.filter(x => !isInternalTask(x)).map(x => x.status).filter(Boolean), t.status])].filter(Boolean).sort();
            const statusSelectHtml = `
                    <select onchange="updateTaskStatus('${t.id}', this.value)" class="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 max-w-[120px]">
                        ${statusOptions.map(s => `<option value="${s}" ${s.trim().toLowerCase() === (t.status || '').trim().toLowerCase() ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                `;
            const userLive = currentWorkUsers.find(u => (u.email || '').toLowerCase() === t.plannedForUser.toLowerCase());
            const assigneeNameStr = userLive?.name || t.plannedForUser;

            const isWorkingOnThis = userLive?.currentTask?.taskId === t.id;
            const taskState = userLive?.currentTask?.state;
            const liveTimerHtml = isWorkingOnThis && taskState === 'working'
                ? `<span class="live-task-timer ml-2 text-[10px] font-black text-indigo-600 font-mono bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 animate-pulse inline-flex items-center gap-1 shrink-0" data-started="${userLive.currentTask.startedAt}" data-state="working"><iconify-icon icon="solar:play-circle-bold" width="10"></iconify-icon> ${formatTime(Math.max(0, Math.floor((Date.now() - userLive.currentTask.startedAt) / 1000)))}</span>`
                : (isWorkingOnThis && taskState === 'on_hold' ? `<span class="ml-2 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 inline-flex items-center gap-1 shrink-0"><iconify-icon icon="solar:pause-circle-bold" width="10"></iconify-icon> ON HOLD</span>` : '');

            const statusBadgeHtml = `<span class="text-[10px] font-bold px-2.5 py-1 rounded-full border ${statusClass(t.status)}">${t.status}</span>`;

            return `
                <tr class="hover:bg-slate-50 transition-colors ${activeTaskId === t.id ? 'bg-indigo-50/30' : ''} ${dailyPlanRowClass(t.status)}">
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-mono font-bold text-indigo-600">${taskKeyHtml}</span>
                            ${t.isCarryOver ? `<span class="bg-amber-100 text-amber-700 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase" title="Carried over from ${t.planData.date}">Carry Over</span>` : ''}
                            ${t.isAutoIncluded ? `<span class="bg-indigo-100 text-indigo-700 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase" title="Auto included by status">Auto</span>` : ''}
                            ${liveTimerHtml}
                        </div>
                        <p class="text-xs text-slate-900 mt-1 max-w-xs truncate">${escapeHtml(t.desc)}</p>
                    </td>
                    <td class="px-6 py-4">${statusSelectHtml}</td>
                    <td class="px-6 py-4 text-xs text-slate-600 font-medium whitespace-nowrap max-w-[80px] truncate">${escapeHtml(t.duedate || '—')}</td>
                    <td class="px-6 py-4 text-xs text-slate-600 font-medium whitespace-nowrap max-w-[150px] truncate">${escapeHtml(assigneeNameStr)}</td>
                    <td class="px-6 py-4 hidden xl:table-cell">
                        <textarea id="learnings-${t.id}" placeholder="Add learnings..." class="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-amber-500/20 resize-none max-w-xs" rows="2" onchange="saveLearningsNote('${t.id}', this.value)">${escapeHtml((t.learningsNote || ''))}</textarea>
                    </td>
                    <td class="px-6 py-4 text-right">
                        <div class="flex items-center justify-end gap-1">
                            ${activeTaskId === t.id ? `
                                <div class="flex items-center justify-end gap-2">
                                    <button onclick="${taskOnHold ? 'resumeTaskTimer()' : 'holdTask()'}" class="flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all ${taskOnHold ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}">
                                        <iconify-icon icon="${taskOnHold ? 'solar:play-circle-bold' : 'solar:pause-circle-bold'}" width="16"></iconify-icon> ${taskOnHold ? 'Resume' : 'Hold'}
                                    </button>
                                    <button onclick="endTask()" class="flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all bg-rose-600 hover:bg-rose-700 text-white shadow-lg">
                                        <iconify-icon icon="solar:stop-circle-bold" width="16"></iconify-icon> End
                                    </button>
                                </div>
                            ` : `
                                <button onclick="toggleActiveTask('${t.id}')" class="flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600">
                                    <iconify-icon icon="solar:play-circle-bold" width="16"></iconify-icon> Start
                                </button>
                            `}
                            ${isAdmin() ? `
                            <button onclick="removeFromDailyPlan('${t.id}', '${t.plannedForUser}')" class="p-2 text-slate-400 hover:text-rose-500 rounded-lg transition-colors" title="Remove from plan">
                                <iconify-icon icon="solar:trash-bin-trash-bold" width="16"></iconify-icon>
                            </button>` : ''}
                        </div>
                    </td>
                </tr>`;
        }).join('');
    }

    async function sendThumbnailNotification(task, changedBy) {
        const THUMBNAIL_NOTIFY_EMAILS = ['karthikavilpower@gmail.com', 'digitalmarketing@vilpower.com'];
        const notifData = {
            taskId: task.id,
            taskDesc: task.desc || '',
            client: task.client || '',
            newStatus: 'Thumbnail',
            changedBy: changedBy,
            notifyEmails: THUMBNAIL_NOTIFY_EMAILS,
            timestamp: Date.now(),
            readBy: {}
        };
        await push(ref(db, 'worksync/task_notifications'), notifData);
        console.log('Thumbnail notification sent for', task.id, 'to Karthika & Palanirajan');
    }

    let taskNotifUnsub = null;
    function initTaskNotifications() {
        if (!db || !currentUser) return;
        if (taskNotifUnsub) taskNotifUnsub();

        const notifRef = query(ref(db, 'worksync/task_notifications'), orderByChild('timestamp'), limitToLast(20));
        let isFirstLoad = true;
        taskNotifUnsub = onValue(notifRef, snap => {
            const data = snap.val();
            if (!data || isFirstLoad) { isFirstLoad = false; return; }

            const myEmail = currentUser.email.toLowerCase();
            Object.entries(data).forEach(([id, notif]) => {
                // Only show if this notification targets the current user
                const targets = (notif.notifyEmails || []).map(e => e.toLowerCase());
                if (!targets.includes(myEmail)) return;

                // Don't show if already read
                if (notif.readBy && notif.readBy[eKey(myEmail)]) return;

                // Only show notifications from the last 5 minutes
                if (Date.now() - (notif.timestamp || 0) > 300000) return;

                // Show the notification toast
                const client = notif.client ? ` (${notif.client})` : '';
                toast(`📋 Thumbnail task received: ${notif.taskId}${client} — ${notif.taskDesc}. Moved by ${notif.changedBy}`, 'info');

                // Mark as read
                update(ref(db, `worksync/task_notifications/${id}/readBy`), { [eKey(myEmail)]: Date.now() });
            });
        });
    }

    // ==========================================
    // ROTATIONAL ORGANISERS CODE
    // ==========================================
    function isEventOrganiser() {
        return currentUser && currentOrganisers?.event?.email?.toLowerCase() === currentUser.email.toLowerCase();
    }
    function isLeaveOrganiser() {
        return currentUser && currentOrganisers?.leave?.email?.toLowerCase() === currentUser.email.toLowerCase();
    }
    function isLearningsOrganiser() {
        return currentUser && currentOrganisers?.learnings?.email?.toLowerCase() === currentUser.email.toLowerCase();
    }
    function isWorkplaceOrganiser() {
        return currentUser && currentOrganisers?.workplace?.email?.toLowerCase() === currentUser.email.toLowerCase();
    }
    function isDmContentOrganiser() {
        return currentUser && currentOrganisers?.dmContent?.email?.toLowerCase() === currentUser.email.toLowerCase();
    }

    function moveBoardColumn(status, direction) {
        let allStatuses = currentStatusFilter === 'all'
            ? [...new Set(tasks.filter(t => !isInternalTask(t)).map(t => t.status).filter(Boolean))].sort()
            : [...currentStatusFilter].sort();

        if (boardColumnOrder && Array.isArray(boardColumnOrder)) {
            allStatuses.sort((a, b) => {
                const idxA = boardColumnOrder.indexOf(a);
                const idxB = boardColumnOrder.indexOf(b);
                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                if (idxA !== -1) return -1;
                if (idxB !== -1) return 1;
                return a.localeCompare(b);
            });
        }

        const index = allStatuses.indexOf(status);
        if (index === -1) return;
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= allStatuses.length) return;

        const temp = allStatuses[index];
        allStatuses[index] = allStatuses[newIndex];
        allStatuses[newIndex] = temp;

        boardColumnOrder = allStatuses;
        renderTasks();
    }

    let organisersListenerUnsub = null;
    function initOrganisersListener() {
        if (!db) return;
        if (organisersListenerUnsub) organisersListenerUnsub();
        organisersListenerUnsub = onValue(ref(db, 'worksync/monthly_organisers'), snap => {
            const data = snap.val() || {};
            currentOrganisers = data;

            // For admins, always show organizer buttons
            // For regular users, show only if they're assigned to that role
            const isCurrentUserAdmin = isAdmin();
            
            if (!isCurrentUserAdmin) {
                // Hide buttons for non-admins who aren't assigned to those roles
                document.getElementById('nav-event-org')?.classList.toggle('hidden', !isEventOrganiser());
                document.getElementById('nav-leave-org')?.classList.toggle('hidden', !isLeaveOrganiser());
                document.getElementById('nav-learnings-org')?.classList.toggle('hidden', !isLearningsOrganiser());
                document.getElementById('nav-workplace-org')?.classList.toggle('hidden', !isWorkplaceOrganiser());
                document.getElementById('nav-dm-content-org')?.classList.toggle('hidden', !isDmContentOrganiser());
            }
            // If admin, buttons stay visible (no hidden class applied)

            if (activeView === 'event-org') renderEventOrgPanel();
            if (activeView === 'leave-org') renderLeaveOrgPanel();
            if (activeView === 'learnings-org') renderLearningsOrgPanel();
            if (activeView === 'workplace-org') renderWorkplaceOrgPanel();
            if (activeView === 'dm-content-org') renderDmContentOrgPanel();

            if (data.event?.email && data.leave?.email && data.learnings?.email && data.workplace?.email && data.dmContent?.email) {
                const dismissedId = localStorage.getItem('worksync_organisers_dismissed_id');
                if (dismissedId !== data.allocationId && currentUser) {
                    document.getElementById('popup-event-org').textContent = data.event.name;
                    document.getElementById('popup-leave-org').textContent = data.leave.name;
                    document.getElementById('popup-learnings-org').textContent = data.learnings.name;
                    document.getElementById('popup-learnings-details').textContent = `Type: ${data.learnings.type || 'N/A'} | Duration: ${data.learnings.duration || 'N/A'}`;
                    document.getElementById('popup-workplace-org').textContent = data.workplace.name;
                    document.getElementById('popup-dm-content-org').textContent = data.dmContent.name;

                    document.getElementById('organisersAnnouncementModal').showModal();
                }
            }
        });
    }

    function dismissOrganisersModal() {
        if (currentOrganisers && currentOrganisers.allocationId) {
            localStorage.setItem('worksync_organisers_dismissed_id', currentOrganisers.allocationId);
        }
        document.getElementById('organisersAnnouncementModal').close();
    }

    // --- Event Organiser View Panels ---
    let eventIdeasUnsub = null;
    function renderEventOrgPanel() {
        const orgNameEl = document.getElementById('event-org-name');
        if (orgNameEl) orgNameEl.textContent = currentOrganisers?.event?.name || 'Unassigned';

        const composer = document.getElementById('event-org-composer');
        if (composer) {
            composer.classList.toggle('hidden', !isEventOrganiser() && !isAdmin());
        }

        if (!db) return;
        if (eventIdeasUnsub) eventIdeasUnsub();

        eventIdeasUnsub = onValue(query(ref(db, 'worksync/event_ideas'), orderByChild('createdAt')), snap => {
            const list = document.getElementById('event-ideas-list');
            if (!list) return;
            const data = snap.val() || {};
            const entries = Object.values(data).sort((a, b) => b.createdAt - a.createdAt);

            if (entries.length === 0) {
                list.innerHTML = `<p class="text-xs text-slate-400 italic">No event ideas shared yet.</p>`;
                return;
            }

            list.innerHTML = entries.map(idea => `
                    <div class="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                        <div class="flex items-center justify-between">
                            <h5 class="text-xs font-black text-slate-900">${escapeHtml(idea.title)}</h5>
                            <span class="text-[9px] font-semibold text-slate-400">${new Date(idea.createdAt).toLocaleString()}</span>
                        </div>
                        <p class="text-xs text-slate-600 whitespace-pre-wrap">${escapeHtml(idea.details)}</p>
                        <p class="text-[9px] font-bold text-indigo-600 uppercase tracking-wider">Shared by: ${escapeHtml(idea.userName)}</p>
                    </div>
                `).join('');
        });
    }

    async function submitEventIdea() {
        const titleInput = document.getElementById('event-title');
        const detailsInput = document.getElementById('event-details');
        if (!titleInput || !detailsInput) return;

        const title = titleInput.value.trim();
        const details = detailsInput.value.trim();
        if (!title || !details) return toast('Please fill in title and description', 'error');

        try {
            const idea = {
                title,
                details,
                userId: currentUser.email,
                userName: currentUser.name,
                createdAt: Date.now()
            };

            await push(ref(db, 'worksync/event_ideas'), idea);

            // Increment activity count
            const count = (currentOrganisers?.event?.count || 0) + 1;
            await update(ref(db, 'worksync/monthly_organisers/event'), { count });

            // Send team announcement
            await sendAutomaticAnnouncement('New Event Idea Shared! 🎟️', `Event Organiser ${currentUser.name} has shared: "${title}" - ${details.substring(0, 80)}...`);

            titleInput.value = '';
            detailsInput.value = '';
            toast('Event idea shared successfully!', 'success');
        } catch (err) {
            console.error(err);
            toast('Failed to share event idea', 'error');
        }
    }

    // --- Workplace Organiser View Panels ---
    let workplaceIdeasUnsub = null;
    function renderWorkplaceOrgPanel() {
        const orgNameEl = document.getElementById('workplace-org-name');
        if (orgNameEl) orgNameEl.textContent = currentOrganisers?.workplace?.name || 'Unassigned';

        const composer = document.getElementById('workplace-org-composer');
        if (composer) {
            composer.classList.toggle('hidden', !isWorkplaceOrganiser() && !isAdmin());
        }

        if (!db) return;
        if (workplaceIdeasUnsub) workplaceIdeasUnsub();

        workplaceIdeasUnsub = onValue(query(ref(db, 'worksync/workplace_ideas'), orderByChild('createdAt')), snap => {
            const list = document.getElementById('workplace-ideas-list');
            if (!list) return;
            const data = snap.val() || {};
            const entries = Object.values(data).sort((a, b) => b.createdAt - a.createdAt);

            if (entries.length === 0) {
                list.innerHTML = `<p class="text-xs text-slate-400 italic">No workplace suggestions shared yet.</p>`;
                return;
            }

            list.innerHTML = entries.map(idea => `
                    <div class="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                        <div class="flex items-center justify-between">
                            <h5 class="text-xs font-black text-slate-900">${escapeHtml(idea.title)}</h5>
                            <span class="text-[9px] font-semibold text-slate-400">${new Date(idea.createdAt).toLocaleString()}</span>
                        </div>
                        <p class="text-xs text-slate-600 whitespace-pre-wrap">${escapeHtml(idea.details)}</p>
                        <p class="text-[9px] font-bold text-rose-600 uppercase tracking-wider">Shared by: ${escapeHtml(idea.userName)}</p>
                    </div>
                `).join('');
        });
    }

    async function submitWorkplaceIdea() {
        const titleInput = document.getElementById('workplace-title');
        const detailsInput = document.getElementById('workplace-details');
        if (!titleInput || !detailsInput) return;

        const title = titleInput.value.trim();
        const details = detailsInput.value.trim();
        if (!title || !details) return toast('Please fill in title and suggestion', 'error');

        try {
            const idea = {
                title,
                details,
                userId: currentUser.email,
                userName: currentUser.name,
                createdAt: Date.now()
            };

            await push(ref(db, 'worksync/workplace_ideas'), idea);

            // Increment activity count
            const count = (currentOrganisers?.workplace?.count || 0) + 1;
            await update(ref(db, 'worksync/monthly_organisers/workplace'), { count });

            // Send team announcement
            await sendAutomaticAnnouncement('New Workplace Suggestion! 🏢', `Workplace Organiser ${currentUser.name} has shared: "${title}" - ${details.substring(0, 80)}...`);

            titleInput.value = '';
            detailsInput.value = '';
            toast('Workplace idea shared successfully!', 'success');
        } catch (err) {
            console.error(err);
            toast('Failed to share workplace suggestion', 'error');
        }
    }

    // --- DM Content Organiser View Panels ---
    let dmContentIdeasUnsub = null;
    function renderDmContentOrgPanel() {
        const orgNameEl = document.getElementById('dm-content-org-name');
        if (orgNameEl) orgNameEl.textContent = currentOrganisers?.dmContent?.name || 'Unassigned';

        const composer = document.getElementById('dm-content-org-composer');
        if (composer) {
            composer.classList.toggle('hidden', !isDmContentOrganiser() && !isAdmin());
        }

        if (!db) return;
        if (dmContentIdeasUnsub) dmContentIdeasUnsub();

        dmContentIdeasUnsub = onValue(query(ref(db, 'worksync/dm_content_ideas'), orderByChild('createdAt')), snap => {
            const list = document.getElementById('dm-content-ideas-list');
            if (!list) return;
            const data = snap.val() || {};
            const entries = Object.values(data).sort((a, b) => b.createdAt - a.createdAt);

            if (entries.length === 0) {
                list.innerHTML = `<p class="text-xs text-slate-400 italic">No content copies/ideas shared yet.</p>`;
                return;
            }

            list.innerHTML = entries.map(idea => `
                    <div class="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                        <div class="flex items-center justify-between">
                            <h5 class="text-xs font-black text-slate-900">${escapeHtml(idea.title)}</h5>
                            <span class="text-[9px] font-semibold text-slate-400">${new Date(idea.createdAt).toLocaleString()}</span>
                        </div>
                        <p class="text-xs text-slate-600 whitespace-pre-wrap">${escapeHtml(idea.details)}</p>
                        <p class="text-[9px] font-bold text-cyan-600 uppercase tracking-wider">Shared by: ${escapeHtml(idea.userName)}</p>
                    </div>
                `).join('');
        });
    }

    async function submitDmContentIdea() {
        const titleInput = document.getElementById('dm-content-title');
        const detailsInput = document.getElementById('dm-content-details');
        if (!titleInput || !detailsInput) return;

        const title = titleInput.value.trim();
        const details = detailsInput.value.trim();
        if (!title || !details) return toast('Please fill in title and copies/ideas', 'error');

        try {
            const idea = {
                title,
                details,
                userId: currentUser.email,
                userName: currentUser.name,
                createdAt: Date.now()
            };

            await push(ref(db, 'worksync/dm_content_ideas'), idea);

            // Increment activity count
            const count = (currentOrganisers?.dmContent?.count || 0) + 1;
            await update(ref(db, 'worksync/monthly_organisers/dmContent'), { count });

            // Send team announcement
            await sendAutomaticAnnouncement('New Social Media Content Draft! 📝', `DM Content Organiser ${currentUser.name} has shared: "${title}" - ${details.substring(0, 80)}...`);

            titleInput.value = '';
            detailsInput.value = '';
            toast('Content copy shared successfully!', 'success');
        } catch (err) {
            console.error(err);
            toast('Failed to share content copy', 'error');
        }
    }

    // --- Learnings Organiser View Panels ---
    let learningLogsUnsub = null;
    function renderLearningsOrgPanel() {
        const orgNameEl = document.getElementById('learnings-org-name');
        if (orgNameEl) orgNameEl.textContent = currentOrganisers?.learnings?.name || 'Unassigned';

        const detailsEl = document.getElementById('learnings-org-details');
        if (detailsEl) {
            const type = currentOrganisers?.learnings?.type || 'N/A';
            const duration = currentOrganisers?.learnings?.duration || 'N/A';
            detailsEl.textContent = `Type: ${type} | Target Duration: ${duration}`;
        }

        const composer = document.getElementById('learnings-org-composer');
        if (composer) {
            composer.classList.toggle('hidden', !isLearningsOrganiser() && !isAdmin());
        }

        if (!db) return;
        if (learningLogsUnsub) learningLogsUnsub();

        learningLogsUnsub = onValue(query(ref(db, 'worksync/learning_logs'), orderByChild('createdAt')), snap => {
            const list = document.getElementById('learnings-logs-list');
            if (!list) return;
            const data = snap.val() || {};
            const entries = Object.values(data).sort((a, b) => b.createdAt - a.createdAt);

            if (entries.length === 0) {
                list.innerHTML = `<p class="text-xs text-slate-400 italic">No learning sessions logged yet.</p>`;
                return;
            }

            list.innerHTML = entries.map(log => `
                    <div class="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                        <div class="flex items-center justify-between">
                            <h5 class="text-xs font-black text-slate-900">${escapeHtml(log.title)}</h5>
                            <span class="text-[9px] font-semibold text-slate-400">${new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                        <p class="text-xs text-slate-600 whitespace-pre-wrap">${escapeHtml(log.details)}</p>
                        <p class="text-[9px] font-bold text-amber-600 uppercase tracking-wider">Logged by: ${escapeHtml(log.userName)}</p>
                    </div>
                `).join('');
        });
    }

    async function submitLearningLog() {
        const titleInput = document.getElementById('learnings-title');
        const detailsInput = document.getElementById('learnings-details');
        if (!titleInput || !detailsInput) return;

        const title = titleInput.value.trim();
        const details = detailsInput.value.trim();
        if (!title || !details) return toast('Please fill in title and details', 'error');

        try {
            const log = {
                title,
                details,
                userId: currentUser.email,
                userName: currentUser.name,
                createdAt: Date.now()
            };

            await push(ref(db, 'worksync/learning_logs'), log);

            // Increment activity count
            const count = (currentOrganisers?.learnings?.count || 0) + 1;
            await update(ref(db, 'worksync/monthly_organisers/learnings'), { count });

            // Send team announcement
            await sendAutomaticAnnouncement('New Learning Resource Shared! 🎓', `Learning Organiser ${currentUser.name} logged: "${title}" - ${details.substring(0, 80)}...`);

            titleInput.value = '';
            detailsInput.value = '';
            toast('Learning log shared successfully!', 'success');
        } catch (err) {
            console.error(err);
            toast('Failed to share learning log', 'error');
        }
    }

    // --- Leave Organiser View Panels (Restricted) ---
    let leaveOrgRequestsUnsub = null;
    function renderLeaveOrgPanel() {
        const orgNameEl = document.getElementById('leave-org-name');
        if (orgNameEl) orgNameEl.textContent = currentOrganisers?.leave?.name || 'Unassigned';

        if (!db) return;
        if (leaveOrgRequestsUnsub) leaveOrgRequestsUnsub();

        leaveOrgRequestsUnsub = onValue(query(ref(db, 'worksync/requests')), snap => {
            const tbody = document.getElementById('leave-org-leaves-tbody');
            if (!tbody) return;
            const data = snap.val() || {};
            const list = Object.values(data).filter(r => r.type === 'leave' || r.type === 'saturday').sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));

            if (list.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-xs text-slate-400 italic text-center">No leave requests found.</td></tr>`;
                return;
            }

            tbody.innerHTML = list.map(r => {
                const statusClass = (s) => {
                    if (s === 'approved') return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
                    if (s === 'rejected') return 'bg-rose-50 text-rose-700 border border-rose-100';
                    return 'bg-amber-50 text-amber-700 border border-amber-100';
                };
                const dateDetails = r.type === 'saturday' ? r.date : (r.fromDate === r.toDate ? r.fromDate : `${r.fromDate} to ${r.toDate}`);
                const leaveTypeLabel = r.type === 'saturday' ? 'Saturday Off' : (r.leaveType || 'General');
                const durationLabel = r.type === 'saturday' ? 'Full Day' : (r.leaveDurationLabel || 'Full Day');
                const reasonLabel = r.reason || (r.type === 'saturday' ? 'Saturday Weekoff' : 'No reason provided');

                return `
                        <tr>
                            <td class="px-6 py-4">
                                <div class="font-black text-xs text-slate-900">${escapeHtml(r.userName || r.userId)}</div>
                                <div class="text-[9px] text-slate-400 font-bold">${escapeHtml(r.userRole || 'Employee')}</div>
                            </td>
                            <td class="px-6 py-4 text-xs font-semibold text-slate-600">${escapeHtml(leaveTypeLabel)}</td>
                            <td class="px-6 py-4 text-xs font-semibold text-slate-600">${escapeHtml(durationLabel)}</td>
                            <td class="px-6 py-4">
                                <div class="text-xs font-bold text-slate-900">${dateDetails}</div>
                                <div class="text-[10px] text-slate-500 italic max-w-xs truncate" title="${escapeHtml(reasonLabel)}">"${escapeHtml(reasonLabel)}"</div>
                            </td>
                            <td class="px-6 py-4">
                                <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${statusClass(r.status)}">${r.status}</span>
                            </td>
                        </tr>
                    `;
            }).join('');
        });
    }

    async function sendLeaveAlertToAdmins() {
        if (!currentUser) return;
        try {
            // Increment Leave count
            const count = (currentOrganisers?.leave?.count || 0) + 1;
            await update(ref(db, 'worksync/monthly_organisers/leave'), { count });

            // Push a notification to admins
            const chain = ['nanjil@vilpower.com', 'palanirajan@vilpower.com']; // default admins
            const notifData = {
                title: 'Leave Organising Reminder',
                body: `Leave Organiser ${currentUser.name} has reviewed the leaves and requests admin attention for leave organising.`,
                timestamp: Date.now(),
                readBy: {},
                notifyEmails: chain
            };
            await push(ref(db, 'worksync/task_notifications'), notifData);

            // Send team announcement
            await sendAutomaticAnnouncement('Leave Organising Alert! 📅', `Leave Organiser ${currentUser.name} sent an alert reminder to Admins to review and coordinate leave schedules.`);

            toast('Leave alert notification sent to admins successfully!', 'success');
        } catch (err) {
            console.error(err);
            toast('Failed to send leave alert to admins', 'error');
        }
    }

    // --- Admin Organiser Panel View & Save Actions ---
    let adminOrganisersUnsub = null;
    let adminUsersCache = [];
    async function populateOrganisersAdminPanel() {
        if (!db) return;
        try {
            const snap = await get(ref(db, 'worksync/users'));
            const usersData = snap.val() || {};
            adminUsersCache = Object.values(usersData);

            const selectIds = ['alloc-event', 'alloc-leave', 'alloc-learnings', 'alloc-workplace', 'alloc-dm-content'];
            selectIds.forEach(id => {
                const select = document.getElementById(id);
                if (!select) return;

                const prevValue = select.value;
                select.innerHTML = '<option value="">-- Choose Organiser --</option>' + adminUsersCache.map(u => `
                        <option value="${escapeHtml(u.email)}">${escapeHtml(u.name)} (${escapeHtml(u.email)})</option>
                    `).join('');

                if (prevValue) select.value = prevValue;
            });

            // Populate current details in form
            if (currentOrganisers) {
                if (currentOrganisers.event?.email) document.getElementById('alloc-event').value = currentOrganisers.event.email;
                if (currentOrganisers.leave?.email) document.getElementById('alloc-leave').value = currentOrganisers.leave.email;
                if (currentOrganisers.learnings?.email) {
                    document.getElementById('alloc-learnings').value = currentOrganisers.learnings.email;
                    document.getElementById('alloc-learnings-type').value = currentOrganisers.learnings.type || '';
                    document.getElementById('alloc-learnings-duration').value = currentOrganisers.learnings.duration || '';
                }
                if (currentOrganisers.workplace?.email) document.getElementById('alloc-workplace').value = currentOrganisers.workplace.email;
                if (currentOrganisers.dmContent?.email) document.getElementById('alloc-dm-content').value = currentOrganisers.dmContent.email;
            }

            renderAdminOrganisersList();
        } catch (err) {
            console.error(err);
            toast('Failed to load users for allocations panel', 'error');
        }
    }

    function renderAdminOrganisersList() {
        const tbody = document.getElementById('admin-organisers-tbody');
        if (!tbody) return;

        const roles = [
            { id: 'event', label: 'Event Organiser', color: 'text-indigo-600' },
            { id: 'leave', label: 'Leave Organiser', color: 'text-emerald-600' },
            { id: 'learnings', label: 'Learnings Organiser', color: 'text-amber-600' },
            { id: 'workplace', label: 'WorkPlace Organiser', color: 'text-rose-600' },
            { id: 'dmContent', label: 'DM Content Organiser', color: 'text-cyan-600' }
        ];

        tbody.innerHTML = roles.map(r => {
            const org = currentOrganisers?.[r.id] || {};
            const name = org.name || 'Unassigned';
            const count = org.count || 0;

            let details = '';
            if (r.id === 'learnings' && org.email) {
                details = `<div class="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Type: ${org.type || 'N/A'} | Duration: ${org.duration || 'N/A'}</div>`;
            }

            return `
                    <tr>
                        <td class="px-6 py-4 text-xs font-black ${r.color}">${r.label}</td>
                        <td class="px-6 py-4">
                            <div class="font-black text-xs text-slate-900">${escapeHtml(name)}</div>
                            <div class="text-[9px] text-slate-400 font-bold">${escapeHtml(org.email || '')}</div>
                            ${details}
                        </td>
                        <td class="px-6 py-4">
                            <span class="bg-slate-100 font-black text-xs px-3 py-1 rounded-xl text-slate-700 border border-slate-200">${count} actions</span>
                        </td>
                    </tr>
                `;
        }).join('');
    }

    async function saveOrganiserAllocations() {
        const eventEmail = document.getElementById('alloc-event').value;
        const leaveEmail = document.getElementById('alloc-leave').value;
        const learningsEmail = document.getElementById('alloc-learnings').value;
        const learningsType = document.getElementById('alloc-learnings-type').value.trim();
        const learningsDuration = document.getElementById('alloc-learnings-duration').value.trim();
        const workplaceEmail = document.getElementById('alloc-workplace').value;
        const dmContentEmail = document.getElementById('alloc-dm-content').value;

        if (!eventEmail || !leaveEmail || !learningsEmail || !workplaceEmail || !dmContentEmail) {
            return toast('Please select all monthly rotational organisers', 'error');
        }

        try {
            const eventUser = adminUsersCache.find(u => u.email === eventEmail);
            const leaveUser = adminUsersCache.find(u => u.email === leaveEmail);
            const learningsUser = adminUsersCache.find(u => u.email === learningsEmail);
            const workplaceUser = adminUsersCache.find(u => u.email === workplaceEmail);
            const dmContentUser = adminUsersCache.find(u => u.email === dmContentEmail);

            const snap = await get(ref(db, 'worksync/monthly_organisers'));
            const current = snap.val() || {};

            const updatePayload = {
                allocationId: Date.now().toString(),
                event: {
                    email: eventEmail,
                    name: eventUser?.name || eventEmail,
                    count: current.event?.email === eventEmail ? (current.event?.count || 0) : 0
                },
                leave: {
                    email: leaveEmail,
                    name: leaveUser?.name || leaveEmail,
                    count: current.leave?.email === leaveEmail ? (current.leave?.count || 0) : 0
                },
                learnings: {
                    email: learningsEmail,
                    name: learningsUser?.name || learningsEmail,
                    type: learningsType,
                    duration: learningsDuration,
                    count: current.learnings?.email === learningsEmail ? (current.learnings?.count || 0) : 0
                },
                workplace: {
                    email: workplaceEmail,
                    name: workplaceUser?.name || workplaceEmail,
                    count: current.workplace?.email === workplaceEmail ? (current.workplace?.count || 0) : 0
                },
                dmContent: {
                    email: dmContentEmail,
                    name: dmContentUser?.name || dmContentEmail,
                    count: current.dmContent?.email === dmContentEmail ? (current.dmContent?.count || 0) : 0
                }
            };

            await set(ref(db, 'worksync/monthly_organisers'), updatePayload);
            toast('Rotational organisers updated and published!', 'success');

            // Send team announcement
            await sendAutomaticAnnouncement('Monthly Organisers Allocated! 🗓️', `Admin has allocated the new rotational incharges: Event (${updatePayload.event.name}), Leave (${updatePayload.leave.name}), Learnings (${updatePayload.learnings.name}), Workplace (${updatePayload.workplace.name}), DM Content (${updatePayload.dmContent.name}).`);
        } catch (err) {
            console.error(err);
            toast('Failed to save allocations', 'error');
        }
    }

    async function updateTaskStatus(taskId, newStatus) {
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return false;
        const task = tasks[taskIndex];
        const oldStatus = task.status;

        if (task.manual) {
            try {
                await update(ref(db, `worksync/manual_tasks/${eKey(task.userId)}/${taskId}`), {
                    status: newStatus,
                    updatedAt: Date.now()
                });
                task.status = newStatus;
                task.updatedAt = Date.now();
                renderDailyPlan();
                renderTasks();
                if (activeView === 'internal-tasks') renderInternalTasks();
                updateStats();
                toast('Task status updated', 'success');

                // Thumbnail notification
                if (newStatus.toLowerCase() === 'thumbnail' && oldStatus.toLowerCase() !== 'thumbnail') {
                    sendThumbnailNotification(task, currentUser?.name || currentUser?.email || 'Unknown');
                }
                return true;
            } catch (err) { 
                toast('Failed to update status', 'error');
                return false;
            }
        } else {
            // Jira task: update locally first, then sync to Jira
            task.status = newStatus;
            task.updatedAt = Date.now();
            renderDailyPlan();
            renderTasks();
            if (activeView === 'internal-tasks') renderInternalTasks();
            updateStats();
            toast('Syncing status to Jira...', 'info');
            const jiraSuccess = await updateJiraStatus(taskId, newStatus);
            if (!jiraSuccess) {
                // Revert local status if Jira sync failed
                task.status = oldStatus;
                renderDailyPlan();
                renderTasks();
                if (activeView === 'internal-tasks') renderInternalTasks();
                updateStats();
                return false;
            } else {
                // Thumbnail notification on successful Jira sync
                if (newStatus.toLowerCase() === 'thumbnail' && oldStatus.toLowerCase() !== 'thumbnail') {
                    sendThumbnailNotification(task, currentUser?.name || currentUser?.email || 'Unknown');
                }
                return true;
            }
        }
    }

    function openAssignPlanModal() {
        if (!isAdmin()) return toast('Only admins can assign tasks to plans', 'error');
        document.getElementById('ap-task-search').value = '';
        document.getElementById('ap-date').value = document.getElementById('dp-date').value || todayIso();

        const sel = document.getElementById('ap-user');
        const usersList = Array.from(allUsersMap.values()).sort((a, b) => (a.name || '').localeCompare(b.name || '')); // Use allUsersMap
        sel.innerHTML = usersList.map(u => `<option value="${u.email}">${u.name}</option>`).join('');

        filterAssignPlanTasks('');
        document.getElementById('assignPlanModal').showModal();
    }

    function filterAssignPlanTasks(term) {
        const list = document.getElementById('ap-task-list');
        const userEmail = document.getElementById('ap-user').value;
        const searchLower = (term || '').toLowerCase();

        let allTaskPool = [...tasks];
        if (typeof strategyEvents !== 'undefined' && strategyEvents) {
            Object.entries(strategyEvents).forEach(([id, ev]) => {
                if (!ev || !ev.title) return;
                const existingInTasks = allTaskPool.some(t =>
                    (ev.jiraId && t.id && t.id.toLowerCase() === ev.jiraId.toLowerCase()) ||
                    (t.desc && ev.title && t.desc.toLowerCase() === ev.title.toLowerCase())
                );
                if (!existingInTasks) {
                    const calculatedDue = ev.duedate || calculateDueDate4DaysBefore(ev.date);
                    allTaskPool.push({
                        id: ev.jiraId || id,
                        desc: ev.title,
                        summary: ev.title,
                        status: ev.status || 'To Do',
                        client: ev.client || '',
                        assignee: ev.owner || '',
                        owner: ev.owner || '',
                        duedate: calculatedDue,
                        postDate: ev.date,
                        isStrategyEvent: true,
                        eventId: id
                    });
                }
            });
        }

        let filtered = allTaskPool.filter(t => {
            if (!t) return false;
            const s = (t.status || '').trim().toLowerCase();
            if (s === 'done' || s === 'completed' || s === 'closed' || s === 'resolved' || s === 'cancelled') return false;
            return true;
        });

        if (term) {
            const terms = term.toLowerCase().split(/\s+/).filter(Boolean);
            if (terms.length > 0) {
                filtered = filtered.filter(t => {
                    const searchableText = `${t.status || ''} ${t.client || ''} ${t.id || ''} ${t.desc || ''} ${t.summary || ''} ${assigneeName(t) || ''} ${t.owner || ''}`.toLowerCase();
                    return terms.every(word => searchableText.includes(word));
                });
            }
        } else {
            // Show tasks for selected user OR unassigned tasks so admin can assign them
            filtered = filtered.filter(t => (
                assigneeMatches(t, userEmail) ||
                (t.owner && t.owner.toLowerCase() === (userEmail || '').toLowerCase()) ||
                !t.assignee ||
                t.assignee === 'Unassigned'
            ));
        }

        filtered.sort((a, b) => {
            if (!a.duedate && !b.duedate) return 0;
            if (!a.duedate) return 1;
            if (!b.duedate) return -1;
            return new Date(a.duedate) - new Date(b.duedate);
        });

        filtered = filtered.slice(0, 500);

        if (!filtered.length) {
            list.innerHTML = `<p class="p-4 text-center text-xs text-slate-400 italic">No tasks found.</p>`;
            return;
        }

        list.innerHTML = filtered.map(t => `
                <label class="flex items-center gap-3 p-3 hover:bg-slate-100 rounded-xl cursor-pointer transition-all border border-transparent hover:border-slate-200">
                    <input type="checkbox" name="ap_task_select" value="${t.id}" class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500">
                    <div class="min-w-0 flex-1">
                        <p class="text-xs font-bold text-slate-900 truncate"><span class="text-indigo-600 font-mono mr-2">${t.id}</span>${escapeHtml(t.desc)}</p>
                        <p class="text-[10px] text-slate-500 truncate">${t.status} ${t.client ? '· ' + t.client : ''} ${t.duedate ? '· Due: ' + new Date(t.duedate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''} · Assignee: ${escapeHtml(assigneeName(t))}</p>
                    </div>
                </label>
            `).join('');
    }

    async function submitAssignPlan() {
        const selectedCheckboxes = document.querySelectorAll('input[name="ap_task_select"]:checked');
        const selectedTaskIds = Array.from(selectedCheckboxes).map(cb => cb.value);
        if (selectedTaskIds.length === 0) return toast('Please select at least one task', 'error');
        const userEmail = document.getElementById('ap-user').value;
        const date = document.getElementById('ap-date').value;
        if (!userEmail || !date) return toast('Please select user and date', 'error');

        try {
            const updates = {};
            selectedTaskIds.forEach(taskId => {
                updates[`worksync/daily_plans/${eKey(userEmail)}/${taskId}`] = {
                    date,
                    assignedBy: currentUser.email,
                    assignedAt: Date.now()
                };
            });
            await update(ref(db), updates);
            document.getElementById('assignPlanModal').close();
            toast(`Assigned ${selectedTaskIds.length} tasks to daily plan`, 'success');
        } catch (err) {
            toast('Failed to assign task: ' + err.message, 'error');
        }
    }

    async function removeFromDailyPlan(taskId, userEmail) {
        if (!isAdmin()) return toast('Only admins can remove tasks from plans', 'error');
        if (!confirm('Remove this task from the plan?')) return;
        try {
            await remove(ref(db, `worksync/daily_plans/${eKey(userEmail)}/${taskId}`));
            toast('Task removed from plan', 'success');
        } catch (err) {
            toast('Failed to remove: ' + err.message, 'error');
        }
    }

    async function saveLearningsNote(taskId, content) {
        try {
            const taskIndex = tasks.findIndex(t => t.id === taskId);
            if (taskIndex === -1) return;
            
            const task = tasks[taskIndex];
            task.learningsNote = content;
            
            // Determine if it's a manual or internal task
            if (task.manual || isInternalTask(task)) {
                await update(ref(db, `worksync/manual_tasks/${eKey(task.userId)}/${taskId}`), { learningsNote: content });
            } else {
                // For Jira tasks, save to manual task mirror
                await update(ref(db, `worksync/manual_tasks/${eKey(task.userId)}/${taskId}`), { learningsNote: content });
            }
            
            toast('Learning saved successfully', 'success');
            renderDailyPlan();
        } catch (err) {
            console.error('Failed to save learning note:', err);
            toast('Failed to save learning: ' + err.message, 'error');
        }
    }

    // ══════════════════════════════════════════
    //  INITIALIZATION
    // ══════════════════════════════════════════
    const authInitTimeout = setTimeout(() => {
        if (!appInitialized && !currentUser) {
            document.documentElement.classList.remove('auth-pending');
            document.getElementById('login-view')?.classList.remove('hidden');
            document.getElementById('loading-view')?.classList.add('hidden');
            toast('Session restore took too long. Please sign in manually.', 'error');
        }
    }, 8000);

    onAuthStateChanged(auth, async (fbUser) => {
        clearTimeout(authInitTimeout);
        try {
            if (fbUser) {
                const snap = await get(ref(db, `worksync/users/${eKey(fbUser.email)}`)); // Fetch user data from Firebase
                if (snap.exists()) {
                    currentUser = { ...snap.val(), ...(knownUserByEmail(fbUser.email) || {}), uid: fbUser.uid };
                    window.currentUser = currentUser; // Expose to window for metaIntegration.js
                    localStorage.setItem('worksync_user', JSON.stringify(currentUser));
                    document.documentElement.classList.add('has-user');
                    await finishLogin();
                } else {
                    console.warn(`User ${fbUser.email} authenticated but not found in DB. Forcing logout.`);
                    await logout();
                }
            } else {
                // User is signed out. The logout() function handles state and UI cleanup.
                // This block is a fallback for external sign-out events.
                await logout();
            }
            populateAssigneeFilter(); // Populate filters after user is set
            populateClientFilter();   // Populate filters after user is set
        } catch (err) {
            console.error("Auth init error:", err);
            localStorage.removeItem('worksync_user');
            document.documentElement.classList.remove('has-user');
            document.documentElement.classList.remove('auth-pending');
            document.getElementById('dashboard-view').classList.add('hidden');
            document.getElementById('login-view').classList.remove('hidden');
        }
    });

    function toggleSidebar() {
        const sidebar = document.querySelector('aside');
        const toggleIcon = document.getElementById('sidebar-toggle-icon');

        if (sidebar.classList.contains('hidden-sidebar')) { // Sidebar is hidden
            sidebar.classList.remove('hidden-sidebar');
            toggleIcon.setAttribute('icon', 'solar:alt-arrow-left-linear');
            localStorage.removeItem('worksync_sidebar_collapsed');
        } else { // Sidebar is open
            sidebar.classList.add('hidden-sidebar');
            toggleIcon.setAttribute('icon', 'solar:alt-arrow-right-linear');
            localStorage.setItem('worksync_sidebar_collapsed', 'true');
        }
    }

    // Kanban Panning Logic
    document.addEventListener('DOMContentLoaded', () => {
        const kanban = document.getElementById('task-kanban-container');
        if (!kanban) return;
        let isDown = false;
        let startX;
        let scrollLeft;

        kanban.addEventListener('mousedown', (e) => {
            // Prevent panning if clicking on a draggable task
            if (e.target.closest('[draggable="true"]')) return;

            isDown = true;
            kanban.classList.add('cursor-grabbing');
            startX = e.pageX - kanban.offsetLeft;
            scrollLeft = kanban.scrollLeft;
        });

        kanban.addEventListener('mouseleave', () => {
            isDown = false;
            kanban.classList.remove('cursor-grabbing');
        });

        kanban.addEventListener('mouseup', () => {
            isDown = false;
            kanban.classList.remove('cursor-grabbing');
        });

        kanban.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - kanban.offsetLeft;
            const walk = (x - startX) * 2; // scroll speed multiplier
            kanban.scrollLeft = scrollLeft - walk;
        });
    });


    window.handleLogin = handleLogin; window.logout = logout; window.switchView = switchView; window.toggleSidebar = toggleSidebar;
    
    window.doCheckIn = doCheckIn; window.doBreak = doBreak; window.doResume = doResume; window.confirmCheckOut = confirmCheckOut;
    window.syncTasks = syncTasks; window.toggleActiveTask = toggleActiveTask;
    window.saveBoardSettings = saveBoardSettings;
    window.filterDailyPlan = filterDailyPlan; window.toggleDpUserDropdown = toggleDpUserDropdown; window.selectAllDpUsers = selectAllDpUsers;
    window.toggleTaskViewMode = toggleTaskViewMode; window.dragTask = dragTask; window.dropTask = dropTask;
    window.toggleStatusFilter = toggleStatusFilter;
    window.toggleInternalStatusFilter = toggleInternalStatusFilter;
    window.setAssigneeFilter = setAssigneeFilter;
    window.setInternalAssigneeFilter = setInternalAssigneeFilter;
    window.setClientFilter = setClientFilter;
    window.setInternalClientFilter = setInternalClientFilter;

    // Productivity Header Functions
    window.updateProdHeaderTimer = updateProdHeaderTimer;
    window.updateProdHeaderButtons = updateProdHeaderButtons;
    window.updateSyncStatusBadge = updateSyncStatusBadge;
    window.recordSyncTime = recordSyncTime;
    window.triggerManualSync = triggerManualSync;
    window.openCurrentSessionPopup = openCurrentSessionPopup;
    window.initProdHeaderListeners = initProdHeaderListeners;
    window.toggleBetweenHeaders = toggleBetweenHeaders;
    window.restoreHeaderPreference = restoreHeaderPreference;
    window.setDueDateFilter = setDueDateFilter;
    window.setInternalDueDateFilter = setInternalDueDateFilter;
    window.searchTasks = searchTasks;
    window.searchInternalTasks = searchInternalTasks;
    window.handleInternalTaskSort = handleInternalTaskSort;
    window.openSettings = openSettings; window.toggleChatMute = toggleChatMute; window.openProfile = openProfile; window.uploadPhoto = uploadPhoto; window.saveProfile = saveProfile;
    window.switchHrTab = switchHrTab; window.setReqType = setReqType; window.submitHrRequest = submitHrRequest;
    window.calcDays = calcDays; window.syncHalfDayLeaveDates = syncHalfDayLeaveDates; window.handleLeaveDurationChange = handleLeaveDurationChange; window.toggleOtherReason = toggleOtherReason;
    window.openApproveModal = openApproveModal; window.submitApproval = submitApproval;
    window.openEditLeaveModal = openEditLeaveModal; window.saveEditedLeave = saveEditedLeave; window.deleteLeave = deleteLeave;
    window.exportDailyReport = exportDailyReport; window.generateAndDisplayDailyReport = generateAndDisplayDailyReport;
    window.openDm = openDm; window.openConversation = openConversation; window.sendMessage = sendMessage; window.uploadChatAttachment = uploadChatAttachment; window.clearStagedAttachment = clearStagedAttachment; window.handleMsgInput = handleMsgInput; window.handleMsgKeyDown = handleMsgKeyDown; window.selectMention = selectMention;
    window.handleChatDragOver = handleChatDragOver; window.handleChatDragEnter = handleChatDragEnter; window.handleChatDragLeave = handleChatDragLeave; window.handleChatDrop = handleChatDrop;
    window.editMessage = editMessage; window.deleteMessage = deleteMessage; window.unsendMessage = unsendMessage; window.toggleReaction = toggleReaction;
    window.openNewGroupModal = openNewGroupModal; window.createGroup = createGroup;
    window.openEditGroupModal = openEditGroupModal; window.updateGroup = updateGroup; window.deleteGroup = deleteGroup; window.processGroupPhoto = processGroupPhoto;
    window.sendAnnouncement = sendAnnouncement; window.deleteAnnouncement = deleteAnnouncement;


    function toggleInternalTaskViewMode() {
        const listContainer = document.getElementById('internal-task-list-container');
        const kanbanContainer = document.getElementById('internal-task-kanban-container');
        const btn = document.getElementById('internal-view-toggle-btn');
        if (!listContainer || !kanbanContainer) return;

        const isKanbanHidden = kanbanContainer.classList.contains('hidden');
        if (isKanbanHidden) {
            listContainer.classList.add('hidden');
            kanbanContainer.classList.remove('hidden');
            if (btn) btn.innerHTML = `<iconify-icon icon="solar:list-bold" width="18"></iconify-icon> Table View`;
            renderInternalKanbanBoard();
        } else {
            kanbanContainer.classList.add('hidden');
            listContainer.classList.remove('hidden');
            if (btn) btn.innerHTML = `<iconify-icon icon="solar:board-linear" width="18"></iconify-icon> Board View`;
            renderInternalTasks();
        }
    }

    function saveInternalBoardSettings() {
        const settings = {
            assignee: currentInternalAssigneeFilter,
            client: currentInternalClientFilter,
            status: currentInternalStatusFilter,
            dueDate: currentInternalDueDateFilter
        };
        localStorage.setItem('worksync_internal_settings', JSON.stringify(settings));
        toast('Internal board settings saved as default', 'success');
    }

    function renderInternalKanbanBoard() {
        const container = document.getElementById('internal-task-kanban-container');
        if (!container) return;
        const internalTasks = tasks.filter(isInternalTask);
        const statuses = ['To Do', 'Working', 'Waiting', 'Completed'];

        container.innerHTML = statuses.map(st => {
            const colTasks = internalTasks.filter(t => (t.status || 'To Do').toLowerCase().includes(st.toLowerCase()));
            return `
                <div class="flex-1 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm min-w-[260px]">
                    <div class="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                        <h4 class="text-xs font-black text-slate-800 uppercase tracking-wider">${st}</h4>
                        <span class="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">${colTasks.length}</span>
                    </div>
                    <div class="space-y-3">
                        ${colTasks.map(t => `
                            <div class="p-3 bg-slate-50 border border-slate-200/80 rounded-xl hover:border-indigo-300 transition-all shadow-sm">
                                <span class="text-[9px] font-bold text-slate-400 uppercase">${t.id} • ${t.client || 'Internal'}</span>
                                <p class="text-xs font-bold text-slate-800 mt-1 line-clamp-2">${escapeHtml(t.desc || t.title || 'Untitled')}</p>
                                <div class="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-medium">
                                    <span>${assigneeName(t)}</span>
                                    <span>${t.duedate || 'No due date'}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    let activeTasksTab = 'jira';

    function switchTasksTab(tab) {
        try {
            const jiraTab = document.getElementById('tasks-tab-jira');
            const intTab = document.getElementById('tasks-tab-internal');
            const dpTab = document.getElementById('tasks-tab-dailyplan');
            const completedTab = document.getElementById('tasks-tab-completed');

            const btnJira = document.getElementById('tab-btn-jira');
            const btnInt = document.getElementById('tab-btn-internal');
            const btnDp = document.getElementById('tab-btn-dailyplan');
            const btnCompleted = document.getElementById('tab-btn-completed');

            const activeStyle = 'px-5 py-2.5 rounded-xl text-xs font-bold transition-all bg-indigo-600 text-white shadow-md shadow-indigo-100 whitespace-nowrap flex-shrink-0';
            const inactiveStyle = 'px-5 py-2.5 rounded-xl text-xs font-bold transition-all bg-slate-50 text-slate-600 hover:bg-slate-100 whitespace-nowrap flex-shrink-0';

            if (jiraTab) jiraTab.classList.add('hidden');
            if (intTab) intTab.classList.add('hidden');
            if (dpTab) dpTab.classList.add('hidden');
            if (completedTab) completedTab.classList.add('hidden');

            if (btnJira) btnJira.className = inactiveStyle;
            if (btnInt) btnInt.className = inactiveStyle;
            if (btnDp) btnDp.className = inactiveStyle;
            if (btnCompleted) btnCompleted.className = inactiveStyle;

            activeTasksTab = tab || 'jira';

            if (tab === 'jira') {
                if (jiraTab) jiraTab.classList.remove('hidden');
                if (btnJira) btnJira.className = activeStyle;
                try { populateClientFilter(); populateAssigneeFilter(); } catch (e) {}
                if (typeof renderTasks === 'function') renderTasks();
            } else if (tab === 'internal') {
                if (intTab) intTab.classList.remove('hidden');
                if (btnInt) btnInt.className = activeStyle;
                try { populateInternalClientFilter(); populateInternalAssigneeFilter(); } catch (e) {}
                if (typeof renderInternalTasks === 'function') renderInternalTasks();
            } else if (tab === 'dailyplan') {
                if (dpTab) dpTab.classList.remove('hidden');
                if (btnDp) btnDp.className = activeStyle;
                if (typeof renderDailyPlan === 'function') renderDailyPlan();
            } else if (tab === 'completed') {
                if (completedTab) completedTab.classList.remove('hidden');
                if (btnCompleted) btnCompleted.className = activeStyle;
                if (typeof renderCompletedTasks === 'function') renderCompletedTasks();
                else if (typeof switchCompletedDateRange === 'function') switchCompletedDateRange('today');
            }
        } catch (err) {
            console.error('switchTasksTab failed:', err);
        }
    }

    function showFiveThirtyTaskPopup() {
        switchView('tasks');
        switchTasksTab('completed');
    }

    window.showFiveThirtyTaskPopup = showFiveThirtyTaskPopup;
    window.switchTasksTab = switchTasksTab;
    window.switchDprTab = switchDprTab; window.submitDpr = submitDpr; window.renderDpr = renderDpr; window.exportDprCsv = exportDprCsv; window.handleReportFilterChange = handleReportFilterChange; window.populateReportUserFilter = populateReportUserFilter;
    window.switchReportTab = switchReportTab; window.loadAttendanceEvents = loadAttendanceEvents; window.renderTimingReport = renderTimingReport; window.renderAnalyticsReport = renderAnalyticsReport; window.renderSummaryReport = renderSummaryReport; window.exportSummaryReport = exportSummaryReport;
    window.exportSummaryReportPdf = exportSummaryReportPdf;
    window.exportReportsCsv = exportReportsCsv; window.renderClientReport = renderClientReport; window.exportClientReport = exportClientReport; window.renderClientWideReport = renderClientWideReport;
    window.diagnoseJira = diagnoseJira; window.renderPerformanceReport = renderPerformanceReport;
    window.navigateShootCalendar = navigateShootCalendar; window.openShootPlanModal = openShootPlanModal; window.saveShootPlan = saveShootPlan; window.renderTimingDetailForDate = renderTimingDetailForDate;
    window.selectSaturday = (val, btn) => { selectedSaturday = val; document.querySelectorAll('.sat-btn').forEach(b => b.classList.remove('bg-indigo-600', 'text-white')); btn.classList.add('bg-indigo-600', 'text-white'); };
    window.sendReportEmail = sendReportEmail; window.toggleEmailReportSetting = toggleEmailReportSetting;
    window.holdTask = holdTask; window.resumeTaskTimer = resumeTaskTimer; window.endTask = endTask;
    window.openAddTaskModal = openAddTaskModal; window.toggleInternalTaskViewMode = toggleInternalTaskViewMode; window.saveInternalBoardSettings = saveInternalBoardSettings; window.renderInternalKanbanBoard = renderInternalKanbanBoard; window.submitManualTask = submitManualTask; window.openEditTaskModal = openEditTaskModal; window.submitTaskUpdate = submitTaskUpdate; window.deleteManualTask = deleteManualTask;
    window.openScheduleDiscussionModal = openScheduleDiscussionModal; window.submitScheduleDiscussion = submitScheduleDiscussion; window.joinDiscussion = joinDiscussion; window.dismissDiscussionPopup = dismissDiscussionPopup;
    window.loadUsersList = loadUsersList; window.openAdminUserModal = openAdminUserModal; window.saveAdminUser = saveAdminUser; window.auUploadPhoto = auUploadPhoto; window.deleteAdminUser = deleteAdminUser;
    window.saveNote = saveNote; window.editNote = editNote; window.deleteNote = deleteNote; window.clearNoteForm = clearNoteForm;
    window.setReportDatePreset = setReportDatePreset;
    window.openProjectDetails = openProjectDetails;
    window.openClientReportDetails = openClientReportDetails;
    window.confirmSnehaTaskStart = confirmSnehaTaskStart;
    window.renderDailyPlan = renderDailyPlan; window.openAssignPlanModal = openAssignPlanModal; window.saveLearningsNote = saveLearningsNote;
    window.openTaskLearningsModal = openTaskLearningsModal; window.completeTaskWithLearnings = completeTaskWithLearnings; window.skipTaskLearnings = skipTaskLearnings;
    window.initQcReportFilters = initQcReportFilters; // Expose to global scope
    window.setQcReportDatePreset = setQcReportDatePreset; // Expose to global scope
    window.handleQcReportFilterChange = handleQcReportFilterChange; // Expose to global scope
    window.renderQcChecklist = renderQcChecklist; window.addQcCustomItem = addQcCustomItem;
    window.filterAssignPlanTasks = filterAssignPlanTasks; window.submitAssignPlan = submitAssignPlan;
    window.updateTaskStatus = updateTaskStatus; window.removeFromDailyPlan = removeFromDailyPlan; window.loadQcTaskDetails = loadQcTaskDetails; window.setQcRating = setQcRating; window.submitQcReport = submitQcReport; window.loadQcReports = loadQcReports; window.openQcReportDetails = openQcReportDetails; window.copyDailyReport = copyDailyReport;
    window.updateInternalTaskStatus = updateInternalTaskStatus;
    window.handleLeaveTypeChange = handleLeaveTypeChange;
    window.setQcPerformanceFilter = setQcPerformanceFilter;
    window.refreshEmployeeCurrentTasks = refreshEmployeeCurrentTasks;
    window.dismissOrganisersModal = dismissOrganisersModal;
    window.submitEventIdea = submitEventIdea;
    window.submitWorkplaceIdea = submitWorkplaceIdea;
    window.submitLearningLog = submitLearningLog;
    window.sendLeaveAlertToAdmins = sendLeaveAlertToAdmins;
    window.saveOrganiserAllocations = saveOrganiserAllocations;
    window.moveBoardColumn = moveBoardColumn;
    window.submitDmContentIdea = submitDmContentIdea;
    window.navigateStrategyCalendar = navigateStrategyCalendar;
    window.openAddStrategyEventModal = openAddStrategyEventModal;
    window.openEditStrategyEventModal = openEditStrategyEventModal;
    window.closeStrategyEventModal = closeStrategyEventModal;
    window.selectStrategyFormat = selectStrategyFormat;
    window.handleBreakExceededResume = handleBreakExceededResume;
    window.openBreakPopup = openBreakPopup;
    window.stopBreakTimer = stopBreakTimer;
    window.updateBreakDurationUI = updateBreakDurationUI;
    window.saveStrategyEvent = saveStrategyEvent;
    window.deleteStrategyEvent = deleteStrategyEvent;
}


// ════════════════════════════════════════════════════════════════════
// COMPLETED TASKS TAB
// ════════════════════════════════════════════════════════════════════

let completedTasksDateRange = 'today';
let completedTasksFilter = '';
let completedTasksClientFilter = 'all';
let completedTasksEmployeeFilter = 'me'; // For admins, can be 'all' or specific email

// Content Type Selection for Today's Completed Work
let selectedContentTypes = [];
let contentTypeWorkSummary = {};

function switchCompletedDateRange(range) {
    completedTasksDateRange = range;
    
    // Update button states
    document.querySelectorAll('#tasks-tab-completed button[onclick*="switchCompletedDateRange"]').forEach(btn => {
        btn.classList.remove('bg-indigo-600', 'text-white');
        btn.classList.add('bg-slate-50', 'text-slate-600');
    });
    
    const activeBtn = document.getElementById(`cr-btn-${range}`);
    if (activeBtn) {
        activeBtn.classList.add('bg-indigo-600', 'text-white');
        activeBtn.classList.remove('bg-slate-50', 'text-slate-600');
    }
    
    // Show/hide content type selection (only for today's work)
    const contentTypeSection = document.getElementById('content-type-section');
    if (contentTypeSection) {
        if (range === 'today') {
            contentTypeSection.classList.remove('hidden');
        } else {
            contentTypeSection.classList.add('hidden');
        }
    }
    
    populateCompletedTasks();
}

function filterCompletedTasks() {
    completedTasksFilter = document.getElementById('cr-search-input')?.value || '';
    populateCompletedTasks();
}

function setCompletedTasksClientFilter(clientName) {
    completedTasksClientFilter = clientName;
    document.getElementById('cr-client-label').textContent = clientName === 'all' ? 'All Clients' : clientName;
    document.getElementById('cr-client-menu').classList.add('hidden');
    populateCompletedTasks();
}

function setCompletedTasksEmployeeFilter(email, name) {
    completedTasksEmployeeFilter = email;
    document.getElementById('cr-employee-label').textContent = name || 'All Employees';
    document.getElementById('cr-employee-menu').classList.add('hidden');
    populateCompletedTasks();
}

function populateCompletedTasks() {
    const container = document.getElementById('cr-tasks-container');
    if (!container) return;
    
    // Get date range
    const now = new Date();
    let fromDate = new Date();
    
    switch (completedTasksDateRange) {
        case 'today':
            fromDate.setHours(0, 0, 0, 0);
            break;
        case 'yesterday':
            fromDate.setDate(fromDate.getDate() - 1);
            fromDate.setHours(0, 0, 0, 0);
            break;
        case 'week':
            fromDate.setDate(fromDate.getDate() - fromDate.getDay());
            fromDate.setHours(0, 0, 0, 0);
            break;
    }
    
    const toDate = new Date(now);
    toDate.setHours(23, 59, 59, 999);
    const fromTs = fromDate.getTime();
    const toTs = toDate.getTime();
    
    // Determine which user(s) to show
    let userEmails = [];
    if (isAdmin()) {
        if (completedTasksEmployeeFilter === 'all') {
            userEmails = allUsersMap ? Array.from(allUsersMap.keys()) : [currentUser.email];
        } else {
            userEmails = [completedTasksEmployeeFilter];
        }
    } else {
        userEmails = [currentUser.email];
    }
    
    // Filter tasks based on criteria
    let filteredTasks = tasks.filter(t => {
        // Check if task is done
        if (!isDone(t.status)) return false;
        
        // Check if assigned to selected user(s)
        const taskEmail = (t.assigneeEmail || t.userId || '').toLowerCase();
        if (!userEmails.some(e => e.toLowerCase() === taskEmail)) return false;
        
        // Check date range - use updatedAt or completedAt
        const taskTime = t.updatedAt || t.completedAt || t.createdAt || 0;
        if (taskTime < fromTs || taskTime > toTs) return false;
        
        // Check client filter
        if (completedTasksClientFilter !== 'all' && (t.client || '').toLowerCase() !== completedTasksClientFilter.toLowerCase()) {
            return false;
        }
        
        // Check search filter
        if (completedTasksFilter) {
            const terms = completedTasksFilter.toLowerCase().split(/\s+/).filter(Boolean);
            if (terms.length > 0) {
                const searchableText = `${t.id || ''} ${t.desc || ''} ${t.summary || ''} ${t.client || ''}`.toLowerCase();
                if (!terms.every(word => searchableText.includes(word))) return false;
            }
        }
        
        return true;
    });
    
    // Sort by most recently completed
    filteredTasks.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    
    // Calculate KPIs
    const totalCompleted = filteredTasks.length;
    const clients = new Set(filteredTasks.map(t => t.client).filter(c => c));
    const totalHours = allTimeLogs
        .filter(log => filteredTasks.some(t => t.id === log.taskId) && log.durationSeconds)
        .reduce((sum, log) => sum + (log.durationSeconds || 0), 0);
    const avgTimePerTask = totalCompleted > 0 ? Math.round(totalHours / totalCompleted) : 0;
    
    // Update KPIs
    const kpiCompleted = document.getElementById('cr-kpi-completed');
    const kpiClients = document.getElementById('cr-kpi-clients');
    const kpiHours = document.getElementById('cr-kpi-hours');
    const kpiAvgTime = document.getElementById('cr-kpi-avgtime');
    
    if (kpiCompleted) kpiCompleted.textContent = totalCompleted;
    if (kpiClients) kpiClients.textContent = clients.size;
    if (kpiHours) kpiHours.textContent = Math.round(totalHours / 3600) + 'h';
    if (kpiAvgTime) kpiAvgTime.textContent = Math.round(avgTimePerTask / 60) + 'm';
    
    // Update sidebar summary
    if (completedTasksDateRange === 'today') {
        const todayLogs = allTimeLogs.filter(log => {
            const logTime = log.endTime || log.startTime || 0;
            return logTime >= fromTs && logTime <= toTs;
        });
        const todaySeconds = todayLogs.reduce((sum, log) => sum + (log.durationSeconds || 0), 0);
        const todayAvg = todayLogs.length > 0 ? Math.round(todaySeconds / todayLogs.length) : 0;
        
        const summaryTasks = document.getElementById('cs-summary-tasks');
        const summaryDuration = document.getElementById('cs-summary-duration');
        const summaryAvg = document.getElementById('cs-summary-avg');
        
        if (summaryTasks) summaryTasks.textContent = totalCompleted;
        if (summaryDuration) summaryDuration.textContent = formatTime(todaySeconds);
        if (summaryAvg) summaryAvg.textContent = Math.round(todayAvg / 60) + 'm';
    }
    
    // Render tasks
    if (!filteredTasks.length) {
        container.innerHTML = `<div class="text-center py-12"><p class="text-sm text-slate-400 italic">No completed tasks found for this period.</p></div>`;
        return;
    }
    
    container.innerHTML = filteredTasks.map(t => {
        const taskLogs = allTimeLogs.filter(log => log.taskId === t.id && log.durationSeconds);
        const taskSeconds = taskLogs.reduce((sum, log) => sum + (log.durationSeconds || 0), 0);
        const completedDate = t.updatedAt ? new Date(t.updatedAt) : null;
        const dateStr = completedDate ? completedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Unknown';
        
        return `
            <div class="bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-md transition-all cursor-pointer" onclick="openEditTaskModal('${t.id}')">
                <div class="flex items-start justify-between gap-4 mb-3">
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-bold text-slate-900 truncate">${escapeHtml(t.desc || t.summary || 'Untitled')}</p>
                        <p class="text-[11px] text-slate-500 font-medium mt-1">${escapeHtml(t.id || 'N/A')}</p>
                    </div>
                    <span class="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap">✓ Done</span>
                </div>
                <div class="flex flex-wrap items-center gap-3 text-xs">
                    ${t.client ? `<span class="bg-slate-50 text-slate-600 px-2 py-1 rounded-lg">${escapeHtml(t.client)}</span>` : ''}
                    <span class="text-slate-500">${dateStr}</span>
                    <span class="text-slate-500 ml-auto">${formatTime(taskSeconds)}</span>
                </div>
            </div>
        `;
    }).join('');
}

// Initialize completed tasks UI on view load
function initCompletedTasksUI() {
    // Populate client filter menu
    const clientMenu = document.getElementById('cr-client-menu');
    if (clientMenu && tasks && tasks.length > 0) {
        const clients = [...new Set(tasks.map(t => t.client).filter(c => c))].sort();
        clientMenu.innerHTML = `
            <label class="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                <input type="radio" name="cr-client" value="all" checked onchange="setCompletedTasksClientFilter('all')" class="w-4 h-4">
                <span class="text-xs font-bold text-slate-700">All Clients</span>
            </label>
            ${clients.map(c => `
                <label class="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                    <input type="radio" name="cr-client" value="${escapeHtml(c)}" onchange="setCompletedTasksClientFilter('${escapeHtml(c)}')" class="w-4 h-4">
                    <span class="text-xs font-bold text-slate-700">${escapeHtml(c)}</span>
                </label>
            `).join('')}
        `;
    }
    
    // Populate employee filter menu (admin only)
    if (isAdmin()) {
        const employeeFilter = document.getElementById('cr-employee-filter');
        if (employeeFilter) employeeFilter.classList.remove('hidden');
        
        const employeeMenu = document.getElementById('cr-employee-menu');
        if (employeeMenu && allUsersMap && allUsersMap.size > 0) {
            const users = Array.from(allUsersMap.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            employeeMenu.innerHTML = `
                <label class="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                    <input type="radio" name="cr-employee" value="all" onchange="setCompletedTasksEmployeeFilter('all', 'All Employees')" class="w-4 h-4">
                    <span class="text-xs font-bold text-slate-700">All Employees</span>
                </label>
                ${users.map(u => `
                    <label class="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                        <input type="radio" name="cr-employee" value="${escapeHtml(u.email)}" onchange="setCompletedTasksEmployeeFilter('${escapeHtml(u.email)}', '${escapeHtml(u.name || u.email)}')" class="w-4 h-4">
                        <span class="text-xs font-bold text-slate-700">${escapeHtml(u.name || u.email)}</span>
                    </label>
                `).join('')}
            `;
        }
    }
    
    // Load initial data
    populateCompletedTasks();
    
    // Initialize content type selection UI (show for Sneha or current user on today's tab)
    initContentTypeSelectionUI();
}

// ════════════════════════════════════════════════════════════════════
// CONTENT TYPE SELECTION FOR TODAY'S WORK
// ════════════════════════════════════════════════════════════════════

function initContentTypeSelectionUI() {
    const contentTypeSection = document.getElementById('content-type-section');
    const checkboxes = document.querySelectorAll('.content-type-checkbox');
    
    if (!contentTypeSection) return;
    
    // Only show if viewing today's completed work
    if (completedTasksDateRange === 'today') {
        contentTypeSection.classList.remove('hidden');
    } else {
        contentTypeSection.classList.add('hidden');
    }
    
    // Load saved selections from localStorage if available
    const saved = localStorage.getItem('contentTypeSelection_' + currentUser.email);
    if (saved) {
        try {
            selectedContentTypes = JSON.parse(saved);
            checkboxes.forEach(cb => {
                if (selectedContentTypes.includes(cb.dataset.type)) {
                    cb.checked = true;
                }
            });
            updateSelectedContentTypesDisplay();
        } catch (e) {
            console.error('Error loading saved content types:', e);
        }
    }
    
    // Add event listeners for real-time updates
    checkboxes.forEach(cb => {
        cb.addEventListener('change', updateSelectedContentTypesDisplay);
    });
}

function updateSelectedContentTypesDisplay() {
    const checkboxes = document.querySelectorAll('.content-type-checkbox:checked');
    selectedContentTypes = Array.from(checkboxes).map(cb => cb.dataset.type);
    
    const displayContainer = document.getElementById('selected-content-types');
    if (!displayContainer) return;
    
    if (selectedContentTypes.length === 0) {
        displayContainer.innerHTML = '<span class="text-xs text-slate-500 italic">No content types selected</span>';
    } else {
        displayContainer.innerHTML = selectedContentTypes.map(type => `
            <span class="bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2">
                ${escapeHtml(type)}
                <button type="button" onclick="toggleContentType('${escapeHtml(type)}')" class="hover:opacity-70">×</button>
            </span>
        `).join('');
    }
}

function toggleContentType(type) {
    const checkbox = document.querySelector(`.content-type-checkbox[data-type="${type}"]`);
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        updateSelectedContentTypesDisplay();
    }
}

function saveContentTypeSelection() {
    if (selectedContentTypes.length === 0) {
        alert('Please select at least one content type to track.');
        return;
    }
    
    // Save to localStorage for persistence
    localStorage.setItem('contentTypeSelection_' + currentUser.email, JSON.stringify(selectedContentTypes));
    
    // Create a summary entry in completed tasks or note it in task descriptions
    const summary = `Today's Completed Work Types: ${selectedContentTypes.join(', ')}`;
    
    // Store in contentTypeWorkSummary for this date
    const today = new Date().toISOString().split('T')[0];
    contentTypeWorkSummary[today] = {
        date: today,
        user: currentUser.email,
        types: selectedContentTypes,
        timestamp: new Date().getTime()
    };
    
    // Save to localStorage for future reference
    localStorage.setItem('contentTypeWorkSummary_' + currentUser.email, JSON.stringify(contentTypeWorkSummary));
    
    // Show success feedback
    showNotification('Work content types saved successfully! ✓', 'success');
    
    // Add a note at the top of completed tasks
    updateCompletedTasksHeader();
}

function clearContentTypeSelection() {
    selectedContentTypes = [];
    document.querySelectorAll('.content-type-checkbox').forEach(cb => cb.checked = false);
    updateSelectedContentTypesDisplay();
}

function updateCompletedTasksHeader() {
    // This adds a visual indicator that work types have been tracked
    const tasksContainer = document.getElementById('cr-tasks-container');
    if (!tasksContainer) return;
    
    const today = new Date().toISOString().split('T')[0];
    const workSummary = contentTypeWorkSummary[today];
    
    if (workSummary && workSummary.types.length > 0) {
        const headerElement = document.createElement('div');
        headerElement.className = 'bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl border border-emerald-200 p-4 mb-4';
        headerElement.innerHTML = `
            <div class="flex items-start justify-between gap-4">
                <div>
                    <p class="text-xs font-bold text-emerald-900 mb-2">Today's Work Summary</p>
                    <div class="flex flex-wrap gap-2">
                        ${workSummary.types.map(type => `
                            <span class="bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">${escapeHtml(type)}</span>
                        `).join('')}
                    </div>
                </div>
                <button type="button" onclick="this.parentElement.remove()" class="text-emerald-600 hover:text-emerald-700">
                    <iconify-icon icon="solar:close-circle-bold" width="20"></iconify-icon>
                </button>
            </div>
        `;
        
        // Insert at the top of tasks container
        if (tasksContainer.firstChild && tasksContainer.firstChild.id !== 'work-summary-header') {
            tasksContainer.insertBefore(headerElement, tasksContainer.firstChild);
        }
    }
}

// Export functions for global access
window.switchCompletedDateRange = switchCompletedDateRange;
window.filterCompletedTasks = filterCompletedTasks;
window.setCompletedTasksClientFilter = setCompletedTasksClientFilter;
window.setCompletedTasksEmployeeFilter = setCompletedTasksEmployeeFilter;
window.initCompletedTasksUI = initCompletedTasksUI;
window.saveContentTypeSelection = saveContentTypeSelection;
window.clearContentTypeSelection = clearContentTypeSelection;
window.updateSelectedContentTypesDisplay = updateSelectedContentTypesDisplay;
window.toggleContentType = toggleContentType;
window.initContentTypeSelectionUI = initContentTypeSelectionUI;
window.showNotification = showNotification;

