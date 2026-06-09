
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

        const ADMIN_ROLES = ['System Admin', 'Administrator'];
        const ADMIN_EMAILS = ['digitalmarketing@vilpower.com', 'nanjil@vilpower.com'];
        const MANAGER_EMAILS = ['murugeshvilpower@gmail.com'];
        const CLIENT_WIDE_ACCESS_EMAILS = ['ajithvilpower@gmail.com', 'murugeshvilpower@gmail.com'];

        const USERS = [
            { email: 'nanjil@vilpower.com', name: 'Nanjil Manohar S', role: 'Head of Operations', avatar: 'Nanjil' },
            { email: 'digitalmarketing@vilpower.com', name: 'Palanirajan R', role: 'Senior Manager - Digital Executions & Delivery', avatar: 'Palanirajan' },
            { email: 'murugeshvilpower@gmail.com', name: 'Murugesh Kumar A', role: 'Manager - Social Media & Client Accounts', avatar: 'Murugesh' },
            { email: 'thanushvilpower@gmail.com', name: 'Thanush V', role: 'Manager - Digital Content Productions', avatar: 'Thanush' },
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

        function canApproveLeaves() {
            if (!currentUser) return false;
            const email = (currentUser.email || '').toLowerCase();
            return isAdmin() || LEAVE_APPROVER_EMAILS.includes(email);
        }

        function resolveLeaveRequesterEmail(r) {
            const raw = (r?.userId || r?.userEmail || '').toLowerCase().trim();
            if (LEAVE_APPROVAL_CHAINS[raw]) return raw;
            const byUser = USERS.find(u => u.email.toLowerCase() === raw);
            if (byUser) return byUser.email.toLowerCase();
            const byName = USERS.find(u => (r?.userName || '').toLowerCase() === u.name.toLowerCase());
            if (byName) return byName.email.toLowerCase();
            return raw;
        }

        function getLeaveApprovalChainForRequester(requesterEmail) {
            const key = resolveLeaveRequesterEmail({ userId: requesterEmail, userEmail: requesterEmail });
            return LEAVE_APPROVAL_CHAINS[key] || ['nanjil@vilpower.com'];
        }

        function isUserInLeaveApprovalChain(requesterEmail, approverEmail) {
            const me = (approverEmail || '').toLowerCase();
            return getLeaveApprovalChainForRequester(requesterEmail).some(e => e.toLowerCase() === me);
        }

        /** Canonical approval steps from LEAVE_APPROVAL_CHAINS (ignores wrong stored chains). */
        function buildApprovalsFromChain(requesterEmail, existingApprovals) {
            const requester = resolveLeaveRequesterEmail({ userId: requesterEmail, userEmail: requesterEmail });
            const chain = getLeaveApprovalChainForRequester(requester);
            const existing = Array.isArray(existingApprovals) ? existingApprovals : [];
            return chain.map((approverEmail, index) => {
                const step = index + 1;
                const match = existing.find(a => a.approverEmail?.toLowerCase() === approverEmail.toLowerCase());
                const status = match?.status === 'approved' || match?.status === 'rejected' ? match.status : 'pending';
                return {
                    approverEmail,
                    approverName: knownUserByEmail(approverEmail)?.name || approverEmail,
                    step,
                    status,
                    approvedAt: match?.approvedAt || null,
                    note: match?.note || null
                };
            });
        }

        function getNextPendingApproval(r) {
            if (r.type !== 'leave') return null;
            const approvals = buildApprovalsFromChain(resolveLeaveRequesterEmail(r), r.approvals);
            if (approvals.some(a => a.status === 'rejected')) return null;
            const approvedCount = approvals.filter(a => a.status === 'approved').length;
            if (approvedCount >= approvals.length) return null;
            return approvals[approvedCount] || null;
        }

        function isRequestPendingForApprover(r, approverEmail) {
            if (r.status !== 'pending') return false;
            const me = (approverEmail || currentUser?.email || '').toLowerCase();
            if (r.type === 'leave') {
                const next = getNextPendingApproval(r);
                return !!(next && next.approverEmail?.toLowerCase() === me);
            }
            if (r.type === 'saturday' || r.type === 'permission') {
                // Use the approval chain if the requester has one defined (same Palanirajan → Nanjil flow)
                const requesterEmail = resolveLeaveRequesterEmail(r);
                const chain = LEAVE_APPROVAL_CHAINS[requesterEmail];
                if (chain && chain.length > 0) {
                    const next = getNextPendingApproval(r);
                    return !!(next && next.approverEmail?.toLowerCase() === me);
                }
                return isAdmin();
            }
            return false;
        }
        function hasClientWideAccess() { return currentUser && CLIENT_WIDE_ACCESS_EMAILS.some(e => e.toLowerCase() === (currentUser.email || '').toLowerCase()); }
        function canViewReports() { return isAdmin() || isManager() || hasClientWideAccess(); }
        function canViewDailySummary() { return isAdmin() || isManager(); }
        function canViewDailyPlanTeamAccess() { return isAdmin() || isManager(); }
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

        const JIRA = {
            domain: 'vilpowerdigitalmarketing.atlassian.net',
            projectKey: 'JUN',
            apiUrl: '/api/jira',
            gsUrl: 'https://script.google.com/macros/s/AKfycbwk85wuNOnEYt675Rf-6IMwPJFxmLHW2ONQYigtni6AxU-gIdiNY497wxJHDtmd_XD-/exec',
            useLocalApi: false
        };

        const CLIENTS = ['NTT', 'Einstein', 'IVN', 'DreamDaa', 'Aladi Ezhilvanan', 'Vilpower', 'Others', 'Vilpower DM', 'Quade', 'Discussion', 'Learning', 'Nivya', 'Mr.Millet', 'Mopower', 'Iniya', '3Jo Toys', 'SalesNaany', 'University', 'Client', 'SKM', 'AshmithaSree'];
        let clientLabelMap = {};
        let customClients = [...CLIENTS];
        
        // Leave Approval Chains - Different employees have different approval hierarchies
        const LEAVE_APPROVAL_CHAINS = {
            'immanuelvilpower@gmail.com': [
                'thanushvilpower@gmail.com',
                'digitalmarketing@vilpower.com',
                'nanjil@vilpower.com'
            ],
            'barathvilpower@gmail.com': [
                'digitalmarketing@vilpower.com',
                'nanjil@vilpower.com'
            ],
            'anithavilpower@gmail.com': [
                'digitalmarketing@vilpower.com',
                'nanjil@vilpower.com'
            ],
            'alex@vilpower.com': [
                'digitalmarketing@vilpower.com',
                'nanjil@vilpower.com'
            ],
            'alexvilpower@gmail.com': [
                'digitalmarketing@vilpower.com',
                'nanjil@vilpower.com'
            ],
            'thanushvilpower@gmail.com': [
                'digitalmarketing@vilpower.com',
                'nanjil@vilpower.com'
            ],
            'snehavilpower@gmail.com': ['nanjil@vilpower.com'],
            'murugeshvilpower@gmail.com': ['nanjil@vilpower.com'],
            'ajithvilpower@gmail.com': ['nanjil@vilpower.com'],
            'princevilpower@gmail.com': ['nanjil@vilpower.com']
        };

        const LEAVE_APPROVER_EMAILS = [...new Set(
            Object.values(LEAVE_APPROVAL_CHAINS).flat().map(e => e.toLowerCase())
        )];

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
        let shootCalendarDate = new Date();
        let activeConvId = null;
        let currentConvMessages = {};
        let chatGalleryImages = [];
        let chatGalleryIndex = 0;
        let activeView = 'dashboard';
        let boardColumnOrder = null;
        let projectCalendarDate = new Date();
        let shownTaskNotifIds = new Set(JSON.parse(localStorage.getItem('worksync_toasted_notifs') || '[]'));
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
        let syncIntervalRef = null;
        let currentTaskViewMode = 'list';
        let stagedAttachments = [];
        let notesUnsub = null;
        let activeGroupMembers = [];
        let allTimeLogs = [];
        let allTimeLogsUnsub = null;
        let mentionActive = false;
        let mentionFilter = '';
        let mentionIndex = 0;
        let dailyPlans = {};
        let dailyPlansUnsub = null;
        let dpFilter = 'all';
        let dpViewMode = 'table';
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
        const MANUAL_TASK_STATUSES = ['To Do', 'Shoot Needed', 'Content In Progress', 'Client Content Approval', 'Design To Do', 'Design In Progress', 'Rework Designs', 'Thumbnail', 'Design Hold', 'Quality Check', 'Design Completed', 'Client Sent', 'Client Approved', 'Posted', 'Analytics', 'Done'];
        const INTERNAL_TASK_STATUSES = ['To do', 'Shoot Needed', 'In Progress', 'Completed', 'Hold', 'Learnings', 'Discussion'];
        const DAILY_PLAN_CARRY_STATUSES = ['To Do', 'Design In Progress', 'Design To Do', 'Rework Designs', 'Design Hold', 'Thumbnail', 'Content In Progress', 'Client Content Approval'];
        const DAILY_PLAN_AUTO_INCLUDE_STATUSES = ['Thumbnail', 'Rework Designs'];
        const DAILY_PLAN_ALLOCATION_STATUSES = ['To Do', 'Design To Do', 'Design In Progress', 'Rework Designs', 'Thumbnail', 'Content In Progress', 'Client Content Approval', 'Shoot Needed'];
        const INTERNAL_DAILY_PLAN_CARRY_STATUSES = ['To do', 'In Progress', 'Hold', 'Discussion', 'Learnings', 'Shoot Needed'];
        const INTERNAL_DAILY_PLAN_AUTO_INCLUDE_STATUSES = ['To do', 'In Progress', 'Hold', 'Discussion', 'Learnings'];
        const INTERNAL_DAILY_PLAN_ALLOCATION_STATUSES = ['To do', 'In Progress', 'Hold', 'Discussion', 'Learnings', 'Shoot Needed'];
        const MORNING_LEARNING_SLOT = '09:00-10:00';
        const MORNING_LEARNING_TITLE = 'Morning Learning (9:00 AM – 10:00 AM)';
        const MORNING_LEARNING_EXCLUDED_EMAILS = ['princevilpower@gmail.com', 'prince@vilpower.com'];
        let morningLearningEnsureStarted = false;
        const DAILY_REPORT_TIMES = [
            { hour: 12, minute: 50, label: 'Afternoon (1 PM)' },
            { hour: 15, minute: 50, label: 'Evening (4 PM)' },
            { hour: 18, minute: 15, label: 'Checkout (6 PM)' }
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
                }).catch(() => {});
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
            { category: 'Final Approval', items: ['Client Revision Applied', 'Client Rejected' ] }
        ];
        
        const QC_VIDEO_CHECKLIST = [
            { category: 'Content Check', items: ['Spelling & Grammar Check', 'Subtitle Accuracy', 'Subtitle Sync Check', 'CTA Visibility Check', 'Thumbnail Added'] },
            { category: 'Audio Check', items: ['Voice Clarity', 'Background Music Balance', 'No Background Noise', 'Audio Sync Check'] },
            { category: 'Editing Check', items: ['Smooth Transitions', 'Animation Smoothness', 'Motion Graphics Check', 'Color Grading Check', 'No Frame Drops', 'No Black Screen Issue'] },
            { category: 'Branding Check', items: ['Logo Visibility', 'Brand Color Consistency', 'Intro/Outro Added', 'End Card Added'] },
            { category: 'End Card', items: ['Phone number', 'Logo', 'Animation', 'End Line Missing', 'End Line Spelling Mistake'] },
            { category: 'Technical Check', items: ['Correct Video Dimension', 'Reel/YouTube Size Verification', 'Export Quality Check', 'Proper Rendering', 'File Format Correct'] },
            { category: 'Final Approval', items: ['Client Revision Applied','Client Rejected' ] }
        ];
        
        let qcRating = 0;
        let qcCustomItems = {};

        function setQcRating(r) {
            qcRating = r;
            const container = document.getElementById('qc-rating-stars');
            if (!container) return;
            container.innerHTML = [1,2,3,4,5].map(i => `
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
                                    <p class="text-xs font-black text-amber-500">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</p>
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
                                <input type="checkbox" name="qc_item" value="${cat.category}|${item}" class="w-4 h-4 rounded mt-0.5 text-rose-600 focus:ring-rose-500">
                                <span class="text-[11px] font-bold text-slate-700 group-hover:text-rose-600 transition-colors">${escapeHtml(item)}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>`;
            }).join('');
        }
        
        function addQcCustomItem(category) {
            const newItem = prompt(`Add a custom check to ${category}:`);
            if (!newItem || !newItem.trim()) return;
            if (!qcCustomItems[category]) qcCustomItems[category] = [];
            qcCustomItems[category].push(newItem.trim());
            renderQcChecklist();
        }
        
        async function submitQcReport() {
            const taskId = document.getElementById('qc-task-select').value;
            const task = tasks.find(t => t.id === taskId);
            if (!task) return toast('Select a task first', 'error');

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
                date: todayIso()
            };

            // Log duration to timelogs so it appears in Timing Reports
            const timeLog = {
                taskId: task.id,
                taskDesc: `[QC] ${task.desc}`,
                client: task.client || '',
                userId: currentUser.email,
                userName: currentUser.name,
                startTime: qcStartTime,
                endTime: qcEndTime,
                durationSeconds: qcDurationSeconds,
                durationFormatted: formatTime(qcDurationSeconds)
            };

            try {
                await Promise.all([
                    push(ref(db, 'worksync/qc_reports'), report),
                    push(ref(db, 'worksync/timelogs'), timeLog)
                ]);
                toast('QC Report Submitted Successfully!', 'success');
                document.getElementById('qc-task-select').value = '';
                loadQcTaskDetails('');
                qcStartTime = null;
                renderQcTasks(); // Refresh badge and dropdown
            } catch (err) { toast('Failed to save QC report', 'error'); }
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
                        <div class="text-center"><p class="text-[9px] font-bold text-slate-400 uppercase">Rating</p><p class="text-sm font-black text-amber-500">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</p></div>
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

    async function sendAutomaticAnnouncement(title, body, image = null) {
        if (!db || !currentUser) return;
        const payload = {
            title: title,
            body: body,
            authorEmail: 'system@worksync.com',
            authorName: 'WorkSync Automation',
            createdAt: Date.now()
        };
        if (image) payload.image = image;
        await push(ref(db, 'worksync/announcements'), payload);
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
            event.dataTransfer.effectAllowed = 'move';
            // Add dragging class to the card
            const card = event.currentTarget || event.target;
            if (card) setTimeout(() => card.classList.add('opacity-50'), 0);
        }

        function dragTaskEnd(event) {
            // Remove dragging styles
            const card = event.currentTarget || event.target;
            if (card) card.classList.remove('opacity-50');
            // Remove all drag-over highlights from columns
            document.querySelectorAll('[data-kanban-col]').forEach(col => col.classList.remove('ring-2', 'ring-indigo-400', 'bg-indigo-50/30'));
        }

        function dragTaskEnter(event, col) {
            event.preventDefault();
            col.classList.add('ring-2', 'ring-indigo-400', 'bg-indigo-50/30');
        }

        function dragTaskLeave(event, col) {
            col.classList.remove('ring-2', 'ring-indigo-400', 'bg-indigo-50/30');
        }
        
        async function dropTask(event, newStatusCategory) {
            event.preventDefault();
            event.stopPropagation();
            // Remove column highlight
            const col = event.currentTarget;
            if (col) col.classList.remove('ring-2', 'ring-indigo-400', 'bg-indigo-50/30');

            const taskId = event.dataTransfer.getData('text/plain');
            if (!taskId) return;
            
            const task = tasks.find(t => t.id === taskId);
            if (!task) return;
            if (task.status === newStatusCategory) return;

            const oldStatus = task.status;
            task.status = newStatusCategory;
            renderTasks(); updateStats();
            if (activeView === 'internal-tasks') renderInternalTasks();
            
            if (activeTaskId === taskId && (isDone(newStatusCategory))) {
                await endTask();
            }

            if (task.manual) {
                try {
                    await update(ref(db, `worksync/manual_tasks/${eKey(task.userId)}/${taskId}`), { status: newStatusCategory });
                    if (activeView === 'dailyplan') renderDailyPlan();
                    toast('Task moved successfully', 'success');
                    if (newStatusCategory === 'Quality Check') sendAutomaticAnnouncement('Task Ready for QC', `Task ${taskId} (${task.desc}) moved to Quality Check.`);
                } catch (err) {
                    task.status = oldStatus;
                    renderTasks(); updateStats();
                    toast('Failed to save status: ' + err.message, 'error');
                }
            } else {
                toast('Syncing to Jira...', 'info');
                // Map Kanban column titles to Jira status names (adjust if they differ)
                const jiraStatusMap = {
                    'To Do': 'To Do',
                    'In Progress': 'In Progress',
                    'Done': 'Done',
                    // Add custom mappings as needed
                };
                const jiraStatus = jiraStatusMap[newStatusCategory] || newStatusCategory;
                const jiraSuccess = await updateJiraStatus(taskId, jiraStatus);
                if (!jiraSuccess) {
                    task.status = oldStatus;
                    renderTasks(); updateStats();
                    if (activeView === 'internal-tasks') renderInternalTasks();
                    toast(`Could not move "${taskId}" to "${newStatusCategory}" in Jira — status reverted. Check available transitions.`, 'error');
                } else {
                    toast('Jira board updated ✓', 'success');
                }
            }
        }

        // DAILY PLAN HELPER
        function dailyPlanRowClass(s, task = null) {
            if (task && isInternalTask(task)) {
                if (isInternalDone(s)) return 'bg-emerald-50/30';
                if (isInternalInProgress(s)) return 'bg-amber-50/30';
                return 'bg-blue-50/30';
            }
            if (isDone(s)) return 'bg-emerald-50/30';
            if (isInProgress(s)) return 'bg-amber-50/30';
            return 'bg-blue-50/30';
        }

        function dailyPlanCarryStatuses(task) {
            return isInternalTask(task) ? INTERNAL_DAILY_PLAN_CARRY_STATUSES : DAILY_PLAN_CARRY_STATUSES;
        }

        function taskEligibleForDailyPlanAllocation(task) {
            if (isInternalTask(task)) return INTERNAL_DAILY_PLAN_ALLOCATION_STATUSES.includes(task.status);
            return DAILY_PLAN_ALLOCATION_STATUSES.includes(task.status);
        }

        function collectDailyPlanTasksForUser(userEmail, dateStr) {
            const selectedDate = new Date(dateStr);
            selectedDate.setHours(0, 0, 0, 0);
            const userPlans = dailyPlans[eKey(userEmail)] || {};
            let plannedTasks = [];

            Object.entries(userPlans).forEach(([taskId, planData]) => {
                const task = tasks.find(t => t.id === taskId);
                if (!task) return;

                const planDate = new Date(planData.date);
                planDate.setHours(0, 0, 0, 0);

                const isExactDate = planDate.getTime() === selectedDate.getTime();
                const isCarryOver = planDate.getTime() < selectedDate.getTime() && dailyPlanCarryStatuses(task).includes(task.status);

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

            tasks
                .filter(task => isInternalTask(task) && INTERNAL_DAILY_PLAN_AUTO_INCLUDE_STATUSES.includes(task.status) && assigneeMatches(task, userEmail))
                .forEach(task => {
                    plannedTasks.push({
                        ...task,
                        planData: { date: dateStr },
                        plannedForUser: userEmail,
                        isCarryOver: false,
                        isAutoIncluded: true
                    });
                });

            const uniquePlans = [];
            const seen = new Set();
            plannedTasks.forEach(pt => {
                const k = `${pt.id}-${pt.plannedForUser}`;
                if (!seen.has(k)) {
                    seen.add(k);
                    uniquePlans.push(pt);
                }
            });
            return uniquePlans;
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
                localStorage.setItem('worksync_user', JSON.stringify(currentUser));
                errEl.classList.add('hidden');
                await finishLogin();
            } catch (err) {
                let msg = 'Incorrect credentials.';
                if (err.code === 'auth/user-not-found') msg = 'User not found.';
                if (err.code === 'auth/wrong-password') msg = 'Incorrect password.';
                document.getElementById('error-text').textContent = msg;
                errEl.classList.remove('hidden');
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
                if (isAdmin()) validViews.push('users', 'clients-admin');
                switchView(validViews.includes(lastView) ? lastView : 'dashboard');

                initClientSettings();
                initDailyPlan();
                registerOnline(); initChat(); initAnnouncements(); loadHrBadge(); initReportFilters();
                restoreTimerState();
                initDailyReportScheduler();
                restoreActiveTask();
                initTaskNotifications();
                loadAllNotificationsForUser();
                initOrganisersListener();
                allUsersMap = await getAllUsers(); // Populate the global map
                runMorningLearningSetup();
                ensureMurugeshDailyTasks();
                if (activeView === 'chat') renderDmList();
                if (canViewDailySummary()) {
                    if (currentWorkUnsub) {
                        currentWorkUnsub();
                        currentWorkUnsub = null;
                    }
                    loadEmployeeCurrentTasks();
                    renderDailySummary();
                }
                initAdminCheckoutReasonNotifications();
                setInterval(checkAutoCheckout, 60000);
                setInterval(checkBirthdays, 60000); // Check for birthdays every minute
                setInterval(checkDailyPlanProgressNotification, 60000);
                // Removed auto-update mechanism to stop page reloads
                setTimeout(checkBirthdays, 5000); // Check shortly after login
                setTimeout(checkDailyPlanProgressNotification, 5000); // Check daily plan progress alert shortly after login
                setTimeout(() => { syncTasks(); loadManualTasks(); loadDiscussions(); }, 600);

                // Apply saved sidebar state or force collapse on mobile
                const isMobile = window.innerWidth < 768;
                if (isMobile || localStorage.getItem('worksync_sidebar_collapsed') === 'true') {
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
            toast(message, 'success', () => window.location.reload());
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
            if (db && currentUser) {
                await set(ref(db, `worksync/users/${eKey(currentUser.email)}/online`), false);
                await clearCurrentTask();
            }
            await signOut(auth);
            Object.values(convListeners).forEach(off => off && off());
            if (checkoutReasonsUnsub) { checkoutReasonsUnsub(); checkoutReasonsUnsub = null; }
            if (currentWorkUnsub) currentWorkUnsub();
            if (todayReportUnsub) todayReportUnsub();
            if (announcementsUnsub) announcementsUnsub();
            if (announcementNotifyUnsub) announcementNotifyUnsub();
            if (dprUnsub) dprUnsub();
            if (notesUnsub) notesUnsub();
            if (attendanceUnsub) attendanceUnsub();
            if (allTimeLogsUnsub) allTimeLogsUnsub();
            if (organisersListenerUnsub) { organisersListenerUnsub(); organisersListenerUnsub = null; }
            if (dailyPlansUnsub) dailyPlansUnsub();
            if (dailyReportSchedulerRef) clearInterval(dailyReportSchedulerRef);
            dailyReportSchedulerRef = null;
            if (liveBoardTimerRef) clearInterval(liveBoardTimerRef);
            liveBoardTimerRef = null;
            dailyPlansUnsub = null; dailyPlans = {};
            if (syncIntervalRef) clearInterval(syncIntervalRef);
            clearInterval(currentWorkRefreshRef);
            currentWorkUnsub = null;
            todayReportUnsub = null;
            announcementsUnsub = null;
            announcementNotifyUnsub = null;
            dprUnsub = null;
            notesUnsub = null;
            attendanceUnsub = null;
            allTimeLogsUnsub = null;
            currentWorkRefreshRef = null;
            syncIntervalRef = null;
            currentWorkFilterKey = '';
            convListeners = {};
            currentUser = null; currentOrganisers = null; tasks = []; dprEntries = []; attendanceEvents = []; activeTaskId = null; isCheckedIn = false;
            shownTaskNotifIds = new Set();
            localStorage.removeItem('worksync_toasted_notifs');
            updateOrganiserNavVisibility();
            clearInterval(timerRef); seconds = 0; activeConvId = null; unreadCounts = {}; unreadAnnouncements = 0;
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
            } else {
                ['timing', 'task', 'analytics', 'summary', 'detailed', 'client', 'client-wide'].forEach(tab => {
                    document.getElementById(`report-tab-${tab}`)?.classList.remove('hidden');
                });
            }
            if (canApproveLeaves()) {
                document.getElementById('hr-tab-approvals')?.classList.remove('hidden');
            } else {
                document.getElementById('hr-tab-approvals')?.classList.add('hidden');
            }
            if (isAdmin() || isManager()) {
                document.getElementById('manager-nav')?.classList.remove('hidden');
            } else {
                document.getElementById('manager-nav')?.classList.add('hidden');
            }
            if (isAdmin()) {
                document.getElementById('admin-nav').classList.remove('hidden');
                document.getElementById('admin-current-work-card')?.classList.remove('hidden');
                document.getElementById('admin-workload-card')?.classList.remove('hidden');
                document.getElementById('admin-report-card')?.classList.remove('hidden');
                document.getElementById('group-create-btn')?.classList.remove('hidden');
                document.getElementById('announcement-compose-card')?.classList.remove('hidden');
                document.getElementById('dpr-tab-team')?.classList.remove('hidden');
                loadEmployeeCurrentTasks();
                document.getElementById('report-tab-performance')?.classList.remove('hidden');
                loadTodayWorkSummary();
            } else { // Non-admin users
                document.getElementById('admin-nav')?.classList.add('hidden');
                document.getElementById('admin-current-work-card')?.classList.add('hidden');
                document.getElementById('admin-workload-card')?.classList.add('hidden');
                document.getElementById('admin-report-card')?.classList.add('hidden');
                document.getElementById('group-create-btn')?.classList.add('hidden');
                document.getElementById('announcement-compose-card')?.classList.add('hidden');
                document.getElementById('dpr-tab-team')?.classList.add('hidden');
                document.getElementById('report-tab-performance')?.classList.add('hidden');
                if (canViewDailySummary()) {
                    loadEmployeeCurrentTasks();
                    loadTodayWorkSummary();
                }
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
            showCheckInPendingTasksReminder();
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
        }
        async function doResume() {
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
            
            try {
                if (currentUser) {
                    const snap = await get(ref(db, `worksync/users/${eKey(currentUser.email)}/currentTask`));
                    const currentTaskData = snap.val();
                    if (currentTaskData && currentTaskData.taskId) {
                        activeTaskId = currentTaskData.taskId;
                        taskSeconds = currentTaskData.currentSeconds || 0;
                        taskOnHold = false;
                        taskStartTime = Date.now() - (taskSeconds * 1000);
                        startTaskTimer();
                        await saveCurrentTaskState('working');
                        renderTasks();
                        if (activeView === 'internal-tasks') renderInternalTasks();
                        renderActiveTaskCard();
                        renderDailyPlan();
                        toast('Paused task auto-resumed', 'success');
                    }
                } else if (activeTaskId && taskOnHold) {
                    resumeTaskTimer();
                }
            } catch (err) {
                console.error('Failed to auto-resume task:', err);
                if (activeTaskId && taskOnHold) {
                    resumeTaskTimer();
                }
            }
        }
        function getDailyPlanStats(userEmail, dateStr = todayIso()) {
            const uniquePlans = collectDailyPlanTasksForUser(userEmail, dateStr);
            const total = uniquePlans.length;
            const completed = uniquePlans.filter(t => isDone(t.status) || isInternalDone(t.status)).length;
            return { total, completed, tasks: uniquePlans };
        }

        function confirmCheckOut() {
            if (!currentUser) return;
            const stats = getDailyPlanStats(currentUser.email);
            if (stats.total > 0 && stats.completed < stats.total) {
                // Incomplete daily plan! Show the reason submission modal.
                document.getElementById('checkout-reason-text').value = '';
                document.getElementById('checkoutReasonModal').showModal();
            } else {
                if (confirm('Are you sure you want to Check Out for today?')) {
                    executeCheckOut();
                }
            }
        }

        function executeCheckOut() {
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
        }

        async function submitCheckoutReason() {
            const txt = document.getElementById('checkout-reason-text').value.trim();
            if (!txt) {
                toast('Please provide a reason before checking out.', 'error');
                return;
            }
            try {
                // Save reason to Firebase
                const reasonData = {
                    userId: currentUser.email,
                    userName: currentUser.name,
                    reason: txt,
                    timestamp: Date.now(),
                    date: todayIso(),
                    readBy: {}
                };
                await push(ref(db, 'worksync/checkout_reasons'), reasonData);
                document.getElementById('checkoutReasonModal').close();
                executeCheckOut();
            } catch (err) {
                console.error(err);
                toast('Failed to save reason. Please try again.', 'error');
            }
        }

        let checkoutReasonsUnsub = null;
        function initAdminCheckoutReasonNotifications() {
            if (!db || !currentUser) return;
            if (!isAdmin()) return; // Only Admins should listen to checkout reasons

            if (checkoutReasonsUnsub) checkoutReasonsUnsub();

            const pageLoadTime = Date.now();
            const reasonsRef = query(ref(db, 'worksync/checkout_reasons'), orderByChild('timestamp'), limitToLast(5));
            
            checkoutReasonsUnsub = onValue(reasonsRef, snap => {
                const data = snap.val();
                if (!data) return;

                // Sort entries by timestamp to process oldest to newest
                const entries = Object.entries(data).sort((a, b) => a[1].timestamp - b[1].timestamp);

                entries.forEach(([id, item]) => {
                    // Only show notifications if they happened after page load
                    // and if this admin hasn't read it yet.
                    if (item.timestamp <= pageLoadTime) return;
                    if (item.readBy && item.readBy[eKey(currentUser.email)]) return;

                    // Display popup to Admin
                    showAdminReasonPopup(item, id);
                });
            });
        }

        function showAdminReasonPopup(item, id) {
            const userEl = document.getElementById('admin-reason-user');
            const timeEl = document.getElementById('admin-reason-time');
            const bodyEl = document.getElementById('admin-reason-body');
            const modal = document.getElementById('adminReasonPopupModal');

            if (!userEl || !timeEl || !bodyEl || !modal) return;

            userEl.textContent = `${item.userName} (${item.userId})`;
            timeEl.textContent = new Date(item.timestamp).toLocaleString();
            bodyEl.textContent = item.reason;

            // Mark as read immediately when shown
            update(ref(db, `worksync/checkout_reasons/${id}/readBy`), { [eKey(currentUser.email)]: Date.now() });

            if (!modal.open) {
                modal.showModal();
            }
        }

        function checkDailyPlanProgressNotification() {
            if (!currentUser || !db) return;
            const now = new Date();
            // We want to trigger it at or after 5:00 PM (17:00)
            if (now.getHours() < 17) return;

            const today = todayIso();
            const localKey = `worksync_speedup_notified_${today}`;
            if (localStorage.getItem(localKey)) return;

            const stats = getDailyPlanStats(currentUser.email, today);
            if (stats.total === 0) return; // No tasks planned

            const completionRate = stats.completed / stats.total;
            if (completionRate < 0.75) {
                // Show local toast
                toast(`⚠️ Speed up the work! You have completed only ${Math.round(completionRate * 100)}% of your daily plan by 5:00 PM.`, 'info');
                
                // Write to task_notifications for record / push notification
                const notifData = {
                    title: 'Speed Up Reminder',
                    body: `Speed up the work! You have completed only ${Math.round(completionRate * 100)}% of your daily plan (${stats.completed}/${stats.total} completed) by 5:00 PM.`,
                    timestamp: Date.now(),
                    readBy: {},
                    notifyEmails: [currentUser.email]
                };
                push(ref(db, 'worksync/task_notifications'), notifData);
            }
            
            // Set flag so we don't check again today
            localStorage.setItem(localKey, 'true');
        }
        function setTimerState(state) {
            const ci = document.getElementById('btn-checkin'), br = document.getElementById('btn-break'), co = document.getElementById('btn-checkout'), rs = document.getElementById('btn-resume');
            if (ci && br && co && rs) {
                ci.classList.add('hidden'); br.disabled = true; co.disabled = true; rs.classList.add('hidden');
                if (state === 'idle') { ci.classList.remove('hidden'); }
                if (state === 'running') { co.disabled = false; br.disabled = false; br.classList.remove('hidden'); }
                if (state === 'paused') { co.disabled = false; rs.classList.remove('hidden'); br.classList.add('hidden'); }
            }

            // Sync with global header attendance bar
            const hCi = document.getElementById('header-btn-checkin');
            const hBr = document.getElementById('header-btn-break');
            const hRs = document.getElementById('header-btn-resume');
            const hCo = document.getElementById('header-btn-checkout');
            const hDot = document.getElementById('header-timer-dot');
            const hStatus = document.getElementById('header-timer-status');

            if (hCi && hBr && hRs && hCo && hDot && hStatus) {
                hCi.classList.add('hidden');
                hBr.classList.add('hidden');
                hRs.classList.add('hidden');
                hCo.classList.add('hidden');

                if (state === 'idle') {
                    hCi.classList.remove('hidden');
                    hDot.innerHTML = '<span class="relative inline-flex rounded-full h-2 w-2 bg-slate-400"></span>';
                    hStatus.textContent = 'OFFLINE';
                } else if (state === 'running') {
                    hBr.classList.remove('hidden');
                    hCo.classList.remove('hidden');
                    hDot.innerHTML = '<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>';
                    hStatus.textContent = 'WORKING';
                } else if (state === 'paused') {
                    hRs.classList.remove('hidden');
                    hCo.classList.remove('hidden');
                    hDot.innerHTML = '<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>';
                    hStatus.textContent = 'ON BREAK';
                }
            }
        }

        function autoCheckOut() {
            if (!isCheckedIn) return;
            clearInterval(timerRef);
            isCheckedIn = false;
            if (checkInTime) {
                const ciDate = new Date(checkInTime);
                const limitDate = new Date(ciDate);
                const limit = getCheckoutLimit();
                limitDate.setHours(limit.hours, limit.mins, 0, 0);
                
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

        function tickTimer() {
            if (!checkInTime) return;
            const elapsedMs = Date.now() - checkInTime;
            const workMs = elapsedMs - totalBreakDuration;
            seconds = Math.floor(Math.max(0, workMs / 1000));
            const formatted = formatTime(seconds);
            document.getElementById('timer-display').textContent = formatted;
            const headerDisplay = document.getElementById('header-timer-display');
            if (headerDisplay) headerDisplay.textContent = formatted;
            updateStats();
        }
        function formatTime(s) { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sc = s % 60; return [h, m, sc].map(v => v.toString().padStart(2, '0')).join(':'); }
        function resetTimerUI() { 
            seconds = 0; 
            document.getElementById('timer-display').textContent = '00:00:00'; 
            const headerDisplay = document.getElementById('header-timer-display');
            if (headerDisplay) headerDisplay.textContent = '00:00:00'; 
        }

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
                    const formatted = formatTime(seconds);
                    document.getElementById('timer-display').textContent = formatted;
                    const headerDisplay = document.getElementById('header-timer-display');
                    if (headerDisplay) headerDisplay.textContent = formatted;
                }
                setTimerState('paused');
            }
        }

        // VIEW NAVIGATION
        function switchView(view) {
            if (view === 'reports' && !canViewReports()) view = 'dashboard';
            if (view === 'daily-summary' && !canViewDailySummary()) view = 'dashboard';
            if (view === 'projects' && !canViewProjects()) view = 'dashboard';
            if (view === 'users' && !isAdmin()) view = 'dashboard';
            if (view === 'qc' && !canViewQcPortal()) view = 'dashboard';
            if (view === 'event-org' && !isEventOrganiser() && !isAdmin()) view = 'dashboard';
            if (view === 'leave-org' && !isLeaveOrganiser() && !isAdmin()) view = 'dashboard';
            if (view === 'learnings-org' && !isLearningsOrganiser() && !isAdmin()) view = 'dashboard';
            if (view === 'workplace-org' && !isWorkplaceOrganiser() && !isAdmin()) view = 'dashboard';
            if (view === 'dm-content-org' && !isDmContentOrganiser() && !isAdmin()) view = 'dashboard';
            if (view === 'organisers-admin' && !isAdmin()) view = 'dashboard';
            if (view === 'clients-admin' && !isAdmin()) view = 'dashboard';
            if (view === 'strategy-calendar' && !canViewStrategyCalendar()) view = 'dashboard';

            activeView = view;
            localStorage.setItem('worksync_activeView', view);
            ['dashboard', 'tasks', 'internal-tasks', 'dailyplan', 'projects', 'shoots', 'qc', 'notes', 'dpr', 'hr', 'chat', 'announcements', 'reports', 'users', 'clients-admin', 'daily-summary', 'event-org', 'leave-org', 'learnings-org', 'workplace-org', 'organisers-admin', 'dm-content-org', 'strategy-calendar', 'discussions'].forEach(v => {
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
                'clients-admin': 'Client Names',
                'daily-summary': 'Daily Status Summaries',
                'event-org': 'Event Organiser Board',
                'leave-org': 'Leave Organiser Portal',
                'learnings-org': 'Learning Logs & Resources',
                'workplace-org': 'Workplace Suggestions',
                'organisers-admin': 'Monthly Organisers & Activity',
                'dm-content-org': 'DM Content Organiser Board',
                'strategy-calendar': 'Strategy Calendar',
                discussions: 'Discussion History & Schedule'
            };
            document.getElementById('view-title').textContent = titles[view] || 'WorkSync';

            if (view === 'shoots') {
                renderShootCalendar();
            }
            else if (view === 'projects') {
                onProjectPeriodModeChange();
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
            else if (view === 'announcements') { markAnnouncementsSeen(); loadAnnouncements(); }
            else if (view === 'users') { loadUsersList(); }
            else if (view === 'clients-admin') { ensureCustomClientsSeeded().then(() => loadClientNamesAdmin()); }
            else if (view === 'notes') { loadNotes(); }
            else if (view === 'daily-summary') { loadTodayWorkSummary(); renderDailySummary(); }
            else if (view === 'event-org') { renderEventOrgPanel(); }
            else if (view === 'leave-org') { renderLeaveOrgPanel(); }
            else if (view === 'learnings-org') { renderLearningsOrgPanel(); }
            else if (view === 'workplace-org') { renderWorkplaceOrgPanel(); }
            else if (view === 'dm-content-org') { renderDmContentOrgPanel(); }
            else if (view === 'strategy-calendar') { initStrategyCalendar(); }
            else if (view === 'organisers-admin') { populateOrganisersAdminPanel(); }
            else if (view === 'discussions') { renderDiscussionsView(); }
            
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
        function isDone(s) { return ['Done', 'Resolved', 'Closed', 'Completed', 'Design Completed', 'Client Approved', 'Posted'].includes(s); }
        function isInProgress(s) { return ['In Progress', 'Active', 'Running', 'In Review', 'Content In Progress', 'Client Content Approval', 'Design In Progress', 'Rework Designs', 'Thumbnail', 'Quality Check', 'Client Sent', 'Analytics'].includes(s); }
        function isTodo(s) { return ['To Do', 'To do', 'Open', 'Backlog', 'New', 'Shoot Needed', 'Content To Do', 'Design To Do'].includes(s); }
        function isInternalTodo(s) { return ['To do', 'To Do', 'Discussion'].includes(s); }
        function isInternalInProgress(s) { return ['In Progress', 'Learnings', 'Learning'].includes(s); }
        function isInternalDone(s) { return ['Completed', 'Done'].includes(s); }

        async function getAllUsers() {
            const snap = await get(ref(db, 'worksync/users'));
            const fbUsers = snap.val() || {};
            const merged = new Map();
            USERS.forEach(u => merged.set(u.email.toLowerCase(), {...u}));
            Object.values(fbUsers).forEach(u => {
                if(u.email) {
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

            const shootTasks = tasks.filter(t => t.status === 'Shoot Needed' && t.duedate);
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
                    dayHtml += `<div onclick="event.stopPropagation(); openEditTaskModal('${task.id}')" class="bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow hover:border-indigo-300">
                        <p class="text-[10px] font-bold text-slate-800 truncate">${escapeHtml(task.desc)}</p>
                        <p class="text-[9px] text-slate-500 font-medium truncate">${escapeHtml(assigneeName(task))}${task.client ? ' · ' + escapeHtml(task.client) : ''}</p>
                    </div>`;
                });
                dayHtml += `</div></div>`;
                grid.innerHTML += dayHtml;
            }
        }

        function getSelectedShootAssignees() {
            return Array.from(document.querySelectorAll('#sp-assignees input[name="sp_assignee"]:checked'))
                .map(cb => cb.value)
                .filter(Boolean);
        }

        function renderShootAssigneeCheckboxes() {
            const container = document.getElementById('sp-assignees');
            if (!container) return;
            const users = Array.from(allUsersMap.values())
                .filter(u => u.email && u.email !== '123')
                .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            if (!users.length) {
                container.innerHTML = `<p class="text-xs text-slate-400 italic p-2">No team members available.</p>`;
                return;
            }
            const myEmail = (currentUser?.email || '').toLowerCase();
            container.innerHTML = users.map(u => `
                <label class="flex items-center gap-2 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors">
                    <input type="checkbox" name="sp_assignee" value="${escapeHtml(u.email)}"
                        class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        ${u.email.toLowerCase() === myEmail ? 'checked' : ''}>
                    <span class="text-xs font-bold text-slate-700">${escapeHtml(u.name)}</span>
                    <span class="text-[9px] text-slate-400 truncate">${escapeHtml(u.email)}</span>
                </label>
            `).join('');
        }

        async function openShootPlanModal(date) {
            document.getElementById('sp-date').value = date;
            
            const clientSelect = document.getElementById('sp-client');
            populateClientSelect(clientSelect);
            renderShootAssigneeCheckboxes();

            document.getElementById('sp-title').value = '';
            document.getElementById('sp-notes').value = '';

            document.getElementById('shootPlanModal').showModal();
        }

        async function saveShootPlan() {
            const title = document.getElementById('sp-title').value.trim();
            const client = document.getElementById('sp-client').value;
            const date = document.getElementById('sp-date').value;
            const assigneeEmails = getSelectedShootAssignees();
            const notes = document.getElementById('sp-notes').value.trim();

            if (!title || !client || !date) return toast('Please fill all required fields.', 'error');
            if (!assigneeEmails.length) return toast('Select at least one assignee.', 'error');

            const submitBtn = document.querySelector('#shoot-plan-form button[type="submit"]');
            const btnLabel = submitBtn?.textContent;
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Creating...';
            }

            try {
                const shootGroupId = 'SHOOT-' + Date.now();
                const createdTasks = [];

                for (let i = 0; i < assigneeEmails.length; i++) {
                    const assigneeEmail = assigneeEmails[i];
                    const assignee = allUsersMap.get(assigneeEmail.toLowerCase());
                    const taskId = `M-${shootGroupId}-${i}`;
                    const task = {
                        id: taskId,
                        desc: title,
                        client,
                        status: 'Shoot Needed',
                        priority: 'High',
                        assignee: assignee?.name || 'Unassigned',
                        assigneeEmail,
                        duedate: date,
                        notes,
                        manual: true,
                        taskType: 'internal',
                        shootPlan: true,
                        shootGroupId,
                        userId: assigneeEmail,
                        createdAt: Date.now(),
                        createdBy: currentUser.email
                    };
                    await set(ref(db, `worksync/manual_tasks/${eKey(assigneeEmail)}/${taskId}`), task);
                    createdTasks.push(task);
                }

                tasks = mergeTasksById([...createdTasks, ...tasks]);
                populateInternalClientFilter();
                populateInternalAssigneeFilter();
                populateClientFilter();
                renderTasks();
                renderInternalTasks();
                updateStats();
                renderShootCalendar();
                document.getElementById('shootPlanModal').close();
                toast(`Shoot plan created for ${createdTasks.length} team member${createdTasks.length === 1 ? '' : 's'}`, 'success');
            } catch (err) {
                console.error('saveShootPlan failed:', err);
                toast('Failed to create shoot plan: ' + err.message, 'error');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = btnLabel || 'Create Shoot Plan';
                }
            }
        }

        // --- Strategy Calendar JS Functions ---
        let strategyCurrentDate = new Date();
        let strategyEvents = {};
        let strategyEventsUnsub = null;
        let activeStrategyClientFilter = 'All';

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
                const users = Array.from(allUsersMap.values()).sort((a,b) => (a.name || '').localeCompare(b.name || ''));
                ownerSelect.innerHTML = '<option value="">-- Select Owner --</option>' + users.map(u => `
                    <option value="${escapeHtml(u.email)}">${escapeHtml(u.name)} (${escapeHtml(u.email)})</option>
                `).join('');
            }

            // Populating clients dropdown in modal
            const clientSelect = document.getElementById('strategy-client');
            if (clientSelect) {
                clientSelect.innerHTML = '<option value="">-- General / No Client --</option>' + customClients.map(c => `
                    <option value="${escapeHtml(c)}">${escapeHtml(c)}</option>
                `).join('');
            }

            if (!db) return;
            if (strategyEventsUnsub) strategyEventsUnsub();

            strategyEventsUnsub = onValue(ref(db, 'worksync/strategy_events'), (snap) => {
                strategyEvents = snap.val() || {};
                renderStrategyClientTabs();
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

        function renderStrategyClientTabs() {
            const container = document.getElementById('strategy-client-tabs-container');
            if (!container) return;

            // Get unique clients from strategyEvents that actually exist
            const uniqueClients = new Set();
            Object.values(strategyEvents).forEach(ev => {
                if (ev.client) {
                    uniqueClients.add(ev.client);
                }
            });

            const sortedClients = Array.from(uniqueClients).sort();
            
            // Build tab list starting with "All"
            const tabs = ['All'];
            
            // Check if there is any strategy event with no client
            const hasGeneral = Object.values(strategyEvents).some(ev => !ev.client);
            if (hasGeneral) {
                tabs.push('General');
            }

            sortedClients.forEach(c => tabs.push(c));

            // Ensure the active filter is still valid (if not, reset to 'All')
            if (!tabs.includes(activeStrategyClientFilter)) {
                activeStrategyClientFilter = 'All';
            }

            container.innerHTML = tabs.map(tab => {
                const isActive = activeStrategyClientFilter === tab;
                const activeClass = isActive 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100 hover:border-slate-200';
                
                return `
                    <button onclick="setStrategyClientFilter('${tab}')" 
                        class="px-4 py-2 rounded-2xl text-xs font-bold transition-all ${activeClass}">
                        ${escapeHtml(tab)}
                    </button>
                `;
            }).join('');
        }

        function setStrategyClientFilter(client) {
            activeStrategyClientFilter = client;
            renderStrategyClientTabs();
            renderStrategyCalendar();
            renderStrategySidebar();
        }

        function renderStrategyCalendar() {
            const grid = document.getElementById('strategy-calendar-grid');
            const title = document.getElementById('strategy-calendar-title');
            if (!grid || !title) return;

            const month = strategyCurrentDate.getMonth();
            const year = strategyCurrentDate.getFullYear();

            title.textContent = strategyCurrentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            grid.innerHTML = '';

            // Blank days for start of month
            for (let i = 0; i < firstDay; i++) {
                grid.innerHTML += `<div class="border-r border-b border-slate-50 bg-slate-50/30 min-h-[110px]"></div>`;
            }

            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

            const eventsByDate = {};
            Object.entries(strategyEvents).forEach(([id, ev]) => {
                if (!ev.date) return;

                // Filter by client
                if (activeStrategyClientFilter !== 'All') {
                    if (activeStrategyClientFilter === 'General') {
                        if (ev.client) return;
                    } else {
                        if (ev.client !== activeStrategyClientFilter) return;
                    }
                }

                const d = ev.date; // YYYY-MM-DD
                if (!eventsByDate[d]) eventsByDate[d] = [];
                eventsByDate[d].push({ id, ...ev });
            });

            // Render days
            for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const isToday = dateStr === todayStr;
                const dayEvents = eventsByDate[dateStr] || [];

                // Platform tags styles
                const platformStyles = {
                    Instagram: 'bg-gradient-to-r from-pink-500 to-purple-600 text-white',
                    YouTube: 'bg-gradient-to-r from-red-500 to-rose-600 text-white',
                    LinkedIn: 'bg-gradient-to-r from-blue-600 to-sky-600 text-white',
                    Facebook: 'bg-gradient-to-r from-blue-800 to-indigo-700 text-white',
                    'Client Pitch': 'bg-gradient-to-r from-amber-500 to-orange-600 text-white',
                    'General Brand': 'bg-gradient-to-r from-slate-600 to-slate-700 text-white'
                };

                let eventsHtml = '';
                dayEvents.forEach(ev => {
                    const badgeClass = platformStyles[ev.platform] || 'bg-slate-500 text-white';
                    eventsHtml += `
                        <div onclick="event.stopPropagation(); openEditStrategyEventModal('${ev.id}')" 
                             class="${badgeClass} px-2 py-1 rounded-lg text-[9px] font-black truncate shadow-sm transition-all hover:scale-105 active:scale-95" 
                             title="${escapeHtml(ev.title)} [${escapeHtml(ev.platform)}]">
                            ${escapeHtml(ev.title)}
                        </div>
                    `;
                });

                grid.innerHTML += `
                    <div onclick="openAddStrategyEventModal('${dateStr}')" 
                         class="relative p-3 border-r border-b border-slate-100 min-h-[110px] flex flex-col group ${isToday ? 'bg-indigo-50/40' : ''} hover:bg-slate-50/50 transition-colors cursor-pointer">
                        <span class="font-black text-xs ${isToday ? 'text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg' : 'text-slate-600'} w-fit">
                            ${d}
                        </span>
                        <div class="mt-2 space-y-1 overflow-y-auto flex-1 max-h-[80px] custom-scrollbar">
                            ${eventsHtml}
                        </div>
                    </div>
                `;
            }

            // Fill empty cells at the end to keep layout clean
            const totalCellsSoFar = firstDay + daysInMonth;
            const remainingCells = (7 - (totalCellsSoFar % 7)) % 7;
            for (let i = 0; i < remainingCells; i++) {
                grid.innerHTML += `<div class="border-r border-b border-slate-50 bg-slate-50/30 min-h-[110px]"></div>`;
            }
        }

        function renderStrategySidebar() {
            const listEl = document.getElementById('strategy-sidebar-list');
            if (!listEl) return;

            const month = strategyCurrentDate.getMonth();
            const year = strategyCurrentDate.getFullYear();

            // Filter events belonging to current month/year and client
            const activeMonthEvents = Object.entries(strategyEvents)
                .map(([id, ev]) => ({ id, ...ev }))
                .filter(ev => {
                    if (!ev.date) return false;
                    const d = new Date(ev.date);
                    const sameMonthYear = d.getMonth() === month && d.getFullYear() === year;
                    if (!sameMonthYear) return false;

                    // Filter by client
                    if (activeStrategyClientFilter !== 'All') {
                        if (activeStrategyClientFilter === 'General') {
                            if (ev.client) return false;
                        } else {
                            if (ev.client !== activeStrategyClientFilter) return false;
                        }
                    }
                    return true;
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
                
                return `
                    <div onclick="openEditStrategyEventModal('${ev.id}')" 
                         class="p-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-2xl cursor-pointer transition-all hover:scale-[1.01] space-y-2">
                        <div class="flex items-center justify-between">
                            <span class="text-[9px] font-black text-indigo-600 uppercase tracking-widest">${new Date(ev.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                            <span class="text-[9px] font-bold px-2 py-0.5 rounded-full ${pillColor}">${escapeHtml(ev.platform)}</span>
                        </div>
                        <h5 class="text-xs font-black text-slate-900 truncate">${escapeHtml(ev.title)}</h5>
                        <p class="text-[10px] text-slate-500 line-clamp-2">${escapeHtml(ev.desc || 'No goal described.')}</p>
                        <div class="flex items-center justify-between pt-1 border-t border-slate-100/50 text-[9px] text-slate-400 font-bold uppercase">
                            <span>Category: ${escapeHtml(ev.category)}</span>
                            <span class="text-slate-600">By: ${escapeHtml(ownerName)}</span>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function openAddStrategyEventModal(dateStr) {
            if (!canViewStrategyCalendar()) return toast('You do not have permission to schedule strategy events.', 'error');
            
            document.getElementById('strategy-modal-title').textContent = 'Add Strategy Event';
            document.getElementById('strategy-event-id').value = '';
            document.getElementById('strategy-title').value = '';
            document.getElementById('strategy-date').value = dateStr || '';
            document.getElementById('strategy-platform').value = 'Instagram';
            document.getElementById('strategy-category').value = 'Educational';
            document.getElementById('strategy-owner').value = currentUser.email;
            document.getElementById('strategy-client').value = '';
            document.getElementById('strategy-desc').value = '';

            document.getElementById('strategy-delete-btn').classList.add('hidden');
            document.getElementById('strategyEventModal').showModal();
        }

        function openEditStrategyEventModal(eventId) {
            const ev = strategyEvents[eventId];
            if (!ev) return;

            // Sneha, Murugesh and Admin can edit. Others can only view!
            const canWrite = canViewStrategyCalendar();

            document.getElementById('strategy-modal-title').textContent = canWrite ? 'Edit Strategy Event' : 'View Strategy Event';
            document.getElementById('strategy-event-id').value = eventId;
            document.getElementById('strategy-title').value = ev.title || '';
            document.getElementById('strategy-date').value = ev.date || '';
            document.getElementById('strategy-platform').value = ev.platform || 'Instagram';
            document.getElementById('strategy-category').value = ev.category || 'Educational';
            document.getElementById('strategy-owner').value = ev.owner || '';
            document.getElementById('strategy-client').value = ev.client || '';
            document.getElementById('strategy-desc').value = ev.desc || '';

            // Toggle readonly/disabled state depending on permissions
            const fields = ['strategy-title', 'strategy-date', 'strategy-platform', 'strategy-category', 'strategy-owner', 'strategy-desc', 'strategy-client'];
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

            const delBtn = document.getElementById('strategy-delete-btn');
            if (delBtn) {
                delBtn.classList.toggle('hidden', !canWrite);
            }

            document.getElementById('strategyEventModal').showModal();
        }

        function closeStrategyEventModal() {
            document.getElementById('strategyEventModal').close();
        }

        async function saveStrategyEvent() {
            if (!canViewStrategyCalendar()) return toast('Access Denied', 'error');

            const id = document.getElementById('strategy-event-id').value;
            const title = document.getElementById('strategy-title').value.trim();
            const date = document.getElementById('strategy-date').value;
            const platform = document.getElementById('strategy-platform').value;
            const category = document.getElementById('strategy-category').value;
            const owner = document.getElementById('strategy-owner').value;
            const client = document.getElementById('strategy-client').value;
            const desc = document.getElementById('strategy-desc').value.trim();

            if (!title || !date || !owner) {
                return toast('Please fill in title, date and owner.', 'error');
            }

            try {
                const evPayload = {
                    title,
                    date,
                    platform,
                    category,
                    owner,
                    client,
                    desc,
                    updatedBy: currentUser.email,
                    updatedAt: Date.now()
                };

                if (id) {
                    // Update
                    await update(ref(db, `worksync/strategy_events/${id}`), evPayload);
                    toast('Strategy event updated!', 'success');
                } else {
                    // Create
                    evPayload.createdAt = Date.now();
                    evPayload.createdBy = currentUser.email;
                    await push(ref(db, 'worksync/strategy_events'), evPayload);
                    toast('Strategy event scheduled!', 'success');
                }

                closeStrategyEventModal();
            } catch (err) {
                console.error(err);
                toast('Failed to save strategy event', 'error');
            }
        }

        async function deleteStrategyEvent() {
            if (!canViewStrategyCalendar()) return toast('Access Denied', 'error');

            const id = document.getElementById('strategy-event-id').value;
            if (!id) return;

            if (!confirm('Are you sure you want to delete this strategy campaign?')) return;

            try {
                await remove(ref(db, `worksync/strategy_events/${id}`));
                toast('Strategy event removed!', 'success');
                closeStrategyEventModal();
            } catch (err) {
                console.error(err);
                toast('Failed to delete event', 'error');
            }
        }

        async function jiraRequest(jiraUrl, method = 'get', payload = null) {
            const body = { jiraUrl, method };
            if (payload !== null) body.payload = payload;
            console.log('🎯 Target URL:', jiraUrl);

            if (!JIRA.useLocalApi) {
                return jiraAppsScriptRequest(body);
            }

            try {
                return await jiraProxyFetch(JIRA.apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
            } catch (primaryErr) {
                console.warn('Primary Jira proxy failed, trying Google Apps Script proxy:', primaryErr);
                if (!JIRA.gsUrl) throw primaryErr;

                return jiraAppsScriptRequest(body);
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
            let startAt = 0;
            let total = null;

            while (total === null || startAt < total) {
                const url = `https://${JIRA.domain}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&startAt=${startAt}&maxResults=${maxResults}&fields=${fields}`;
                console.log(`📡 Fetching Jira issues: startAt=${startAt}, maxResults=${maxResults}`);
                const res = await jiraRequest(url);
                if (!res.success || res.data?.errorMessages || res.data?.message) {
                    throw new Error(jiraErrorMessage(res));
                }

                const pageIssues = res.data?.issues || [];
                issues.push(...pageIssues);
                total = Number(res.data?.total ?? pageIssues.length);
                startAt += Number(res.data?.maxResults ?? maxResults);

                if (pageIssues.length === 0) break;
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

        function isJiraCloudTask(task) {
            return task && !task.manual && /^[A-Z][A-Z0-9]*-\d+$/i.test(task.id || '');
        }

        function applyLocalTaskAssignee(taskId, userEmail, accountId = '') {
            const user = allUsersMap.get((userEmail || '').toLowerCase()) || knownUserByEmail(userEmail);
            const name = user?.name || (userEmail || '').split('@')[0];
            const idx = tasks.findIndex(t => t.id === taskId);
            if (idx === -1) return;
            tasks[idx] = {
                ...tasks[idx],
                assignee: name,
                assigneeEmail: userEmail,
                assigneeAccountId: accountId || tasks[idx].assigneeAccountId || ''
            };
        }

        async function assignJiraIssueToUser(issueKey, userEmail) {
            const user = allUsersMap.get((userEmail || '').toLowerCase()) || knownUserByEmail(userEmail) || { email: userEmail, name: userEmail };
            const accountId = await findJiraAccountId(user);
            if (!accountId) {
                throw new Error(`No Jira account found for ${user.name || userEmail}`);
            }
            const url = `https://${JIRA.domain}/rest/api/3/issue/${encodeURIComponent(issueKey)}`;
            const res = await jiraRequest(url, 'put', { fields: { assignee: { accountId } } });
            if (!res.success || res.data?.errorMessages?.length) {
                throw new Error(jiraErrorMessage(res));
            }
            return accountId;
        }

        function normalizeLabelKey(label) {
            return String(label || '').trim().toLowerCase();
        }

        function resolveClientLabel(label) {
            const trimmed = String(label || '').trim();
            if (!trimmed) return '';
            const mapped = clientLabelMap[normalizeLabelKey(trimmed)];
            return mapped || trimmed;
        }

        function clientFromJiraLabels(labels) {
            const arr = (labels || []).map(l => String(l).trim()).filter(Boolean);
            if (!arr.length) return '';
            return [...new Set(arr.map(l => resolveClientLabel(l)).filter(Boolean))].join(', ');
        }

        function resolveClientDisplay(raw) {
            if (!raw) return '';
            return [...new Set(raw.split(',').map(s => resolveClientLabel(s.trim())).filter(Boolean))].join(', ');
        }

        function getClientCatalog() {
            const fromMap = Object.values(clientLabelMap).filter(Boolean);
            const fromTasks = tasks.map(t => t.client).filter(Boolean);
            return [...new Set([...customClients, ...fromMap, ...fromTasks])].sort((a, b) => a.localeCompare(b));
        }

        function populateClientSelect(selectEl, selectedValue = '', emptyLabel = 'Select client...') {
            if (!selectEl) return;
            const catalog = getClientCatalog();
            selectEl.innerHTML = `<option value="">${emptyLabel}</option>` +
                catalog.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
            if (selectedValue) selectEl.value = selectedValue;
        }

        function refreshAllTaskClientDisplay() {
            let changed = false;
            tasks.forEach(t => {
                if (t.manual) return;
                const next = t.clientLabels?.length
                    ? clientFromJiraLabels(t.clientLabels)
                    : (t.client ? resolveClientDisplay(t.client) : '');
                if (!next && !t.client) return;
                if (t.client !== next) {
                    t.client = next;
                    changed = true;
                }
            });
            if (changed) localStorage.setItem('worksync_tasks', JSON.stringify(tasks));
            populateClientFilter();
            populateInternalClientFilter();
            if (activeView === 'tasks') renderTasks();
            if (activeView === 'internal-tasks') renderInternalTasks();
            if (activeView === 'dailyplan') renderDailyPlan();
            if (activeView === 'projects') renderProjects();
            if (activeView === 'shoots') renderShootCalendar();
        }

        function initClientSettings() {
            if (!db) return;
            onValue(ref(db, 'worksync/settings'), snap => {
                const settings = snap.val() || {};
                clientLabelMap = settings.client_label_map || {};
                if (Array.isArray(settings.custom_clients) && settings.custom_clients.length) {
                    customClients = settings.custom_clients;
                }
                refreshAllTaskClientDisplay();
                if (activeView === 'clients-admin') loadClientNamesAdmin();
            });
        }

        async function ensureCustomClientsSeeded() {
            if (!db) return;
            const snap = await get(ref(db, 'worksync/settings/custom_clients'));
            if (!snap.exists() || !Array.isArray(snap.val()) || !snap.val().length) {
                await set(ref(db, 'worksync/settings/custom_clients'), [...CLIENTS]);
                customClients = [...CLIENTS];
            }
        }

        function loadClientNamesAdmin() {
            renderClientLabelMapTable();
            renderCustomClientsList();
        }

        function renderClientLabelMapTable() {
            const tbody = document.getElementById('client-label-map-tbody');
            if (!tbody) return;
            const entries = Object.entries(clientLabelMap).sort((a, b) => a[1].localeCompare(b[1]));
            if (!entries.length) {
                tbody.innerHTML = `<tr><td colspan="3" class="px-6 py-10 text-center text-xs text-slate-400 italic">No label mappings yet. Add one or import labels from synced Jira tasks.</td></tr>`;
                return;
            }
            tbody.innerHTML = entries.map(([key, displayName]) => `
                <tr class="hover:bg-slate-50/80 transition-colors">
                    <td class="px-6 py-4">
                        <span class="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">${escapeHtml(key)}</span>
                    </td>
                    <td class="px-6 py-4 text-sm font-bold text-slate-900">${escapeHtml(displayName)}</td>
                    <td class="px-6 py-4 text-right whitespace-nowrap">
                        <button type="button" onclick='openClientMapModal(${JSON.stringify(key)})' class="text-indigo-600 hover:text-indigo-800 text-[10px] font-bold px-3 py-1.5 hover:bg-indigo-50 rounded-lg transition-all">Edit</button>
                        <button type="button" onclick='deleteClientMapEntry(${JSON.stringify(key)})' class="text-rose-600 hover:text-rose-800 text-[10px] font-bold px-3 py-1.5 hover:bg-rose-50 rounded-lg transition-all">Delete</button>
                    </td>
                </tr>`).join('');
        }

        function renderCustomClientsList() {
            const el = document.getElementById('custom-clients-list');
            if (!el) return;
            const items = customClients.map((name, i) => ({ name, i })).sort((a, b) => a.name.localeCompare(b.name));
            if (!items.length) {
                el.innerHTML = `<p class="p-8 text-center text-xs text-slate-400 italic">No manual clients yet.</p>`;
                return;
            }
            el.innerHTML = items.map(({ name, i }) => `
                <div class="flex items-center justify-between px-4 py-3 hover:bg-slate-50 rounded-xl transition-colors">
                    <span class="text-sm font-bold text-slate-800">${escapeHtml(name)}</span>
                    <div class="flex gap-1">
                        <button type="button" onclick="openCustomClientModal(${i})" class="text-indigo-600 hover:text-indigo-800 text-[10px] font-bold px-3 py-1.5 hover:bg-indigo-50 rounded-lg transition-all">Edit</button>
                        <button type="button" onclick="deleteCustomClient(${i})" class="text-rose-600 hover:text-rose-800 text-[10px] font-bold px-3 py-1.5 hover:bg-rose-50 rounded-lg transition-all">Delete</button>
                    </div>
                </div>`).join('');
        }

        function collectJiraLabelsFromTasks() {
            const labels = new Set();
            tasks.filter(t => !t.manual).forEach(t => {
                const source = t.clientLabels?.length
                    ? t.clientLabels
                    : (t.client ? t.client.split(',').map(s => s.trim()) : []);
                source.forEach(l => { if (l) labels.add(l); });
            });
            return [...labels].sort((a, b) => a.localeCompare(b));
        }

        async function importUnmappedJiraLabels() {
            const labels = collectJiraLabelsFromTasks().filter(l => !clientLabelMap[normalizeLabelKey(l)]);
            if (!labels.length) return toast('No new labels found on synced tasks', 'info');
            let added = 0;
            const nextMap = { ...clientLabelMap };
            labels.forEach(label => {
                const key = normalizeLabelKey(label);
                if (!nextMap[key]) {
                    nextMap[key] = label;
                    added++;
                }
            });
            await set(ref(db, 'worksync/settings/client_label_map'), nextMap);
            clientLabelMap = nextMap;
            refreshAllTaskClientDisplay();
            loadClientNamesAdmin();
            toast(`Imported ${added} label${added === 1 ? '' : 's'} — edit display names as needed`, 'success');
        }

        function openClientMapModal(editKey = '') {
            document.getElementById('client-map-edit-key').value = editKey || '';
            const labelInput = document.getElementById('client-map-jira-label');
            const displayInput = document.getElementById('client-map-display-name');
            const title = document.getElementById('client-map-modal-title');
            if (editKey) {
                title.textContent = 'Edit label mapping';
                labelInput.value = editKey;
                labelInput.readOnly = true;
                labelInput.classList.add('opacity-70');
                displayInput.value = clientLabelMap[editKey] || '';
            } else {
                title.textContent = 'Add label mapping';
                labelInput.value = '';
                labelInput.readOnly = false;
                labelInput.classList.remove('opacity-70');
                displayInput.value = '';
            }
            document.getElementById('clientMapModal').showModal();
        }

        async function saveClientMapEntry() {
            const editKey = document.getElementById('client-map-edit-key').value.trim();
            const jiraLabel = document.getElementById('client-map-jira-label').value.trim();
            const displayName = document.getElementById('client-map-display-name').value.trim();
            if (!jiraLabel || !displayName) return toast('Enter both Jira label and display name', 'error');
            const key = editKey || normalizeLabelKey(jiraLabel);
            if (!key) return toast('Invalid label', 'error');
            const nextMap = { ...clientLabelMap, [key]: displayName };
            await set(ref(db, 'worksync/settings/client_label_map'), nextMap);
            clientLabelMap = nextMap;
            document.getElementById('clientMapModal').close();
            refreshAllTaskClientDisplay();
            loadClientNamesAdmin();
            toast('Label mapping saved', 'success');
        }

        async function deleteClientMapEntry(key) {
            if (!key || !clientLabelMap[key]) return;
            if (!confirm(`Remove mapping for label "${key}"?`)) return;
            const nextMap = { ...clientLabelMap };
            delete nextMap[key];
            await set(ref(db, 'worksync/settings/client_label_map'), nextMap);
            clientLabelMap = nextMap;
            refreshAllTaskClientDisplay();
            loadClientNamesAdmin();
            toast('Mapping removed', 'info');
        }

        function openCustomClientModal(editIndex = '') {
            document.getElementById('custom-client-edit-index').value = editIndex === '' ? '' : String(editIndex);
            const nameInput = document.getElementById('custom-client-name');
            const title = document.getElementById('custom-client-modal-title');
            if (editIndex !== '' && customClients[editIndex] !== undefined) {
                title.textContent = 'Edit client';
                nameInput.value = customClients[editIndex];
            } else {
                title.textContent = 'Add client';
                nameInput.value = '';
            }
            document.getElementById('customClientModal').showModal();
        }

        async function saveCustomClientEntry() {
            const name = document.getElementById('custom-client-name').value.trim();
            if (!name) return toast('Enter a client name', 'error');
            const editIndex = document.getElementById('custom-client-edit-index').value;
            const next = [...customClients];
            const idx = editIndex !== '' ? parseInt(editIndex, 10) : -1;
            if (editIndex !== '' && (Number.isNaN(idx) || idx < 0)) return;
            if (next.some((c, i) => i !== idx && c.toLowerCase() === name.toLowerCase())) {
                return toast('Client already exists', 'error');
            }
            if (idx >= 0) next[idx] = name;
            else next.push(name);
            next.sort((a, b) => a.localeCompare(b));
            await set(ref(db, 'worksync/settings/custom_clients'), next);
            customClients = next;
            document.getElementById('customClientModal').close();
            populateClientFilter();
            populateInternalClientFilter();
            loadClientNamesAdmin();
            toast('Client saved', 'success');
        }

        async function deleteCustomClient(index) {
            const name = customClients[index];
            if (!name) return;
            if (!confirm(`Remove "${name}" from manual client list?`)) return;
            const next = customClients.filter((_, i) => i !== index);
            await set(ref(db, 'worksync/settings/custom_clients'), next);
            customClients = next;
            loadClientNamesAdmin();
            populateClientFilter();
            populateInternalClientFilter();
            toast('Client removed', 'info');
        }

        function mapJiraIssues(issues) {
            return (issues || []).map(i => {
                const labels = i.fields.labels || [];
                return {
                    id: i.key,
                    desc: i.fields.summary,
                    status: i.fields.status.name,
                    priority: i.fields.priority?.name || 'Medium',
                    clientLabels: labels,
                    client: clientFromJiraLabels(labels),
                    assignee: i.fields.assignee?.displayName || '',
                    assigneeEmail: i.fields.assignee?.emailAddress || '',
                    assigneeAccountId: i.fields.assignee?.accountId || '',
                    duedate: i.fields.duedate,
                    issueType: i.fields.issuetype?.name || '',
                    parentId: i.fields.parent?.key || ''
                };
            });
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
                const { projectKey } = JIRA;
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
                let jql = `project=${projectKey} AND (issuetype in standardIssueTypes() OR issuetype in subTaskIssueTypes())`;
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
                        const oldAssigneeEmail = existingTask.assigneeEmail;
                        // Preserve runtime state by manually updating properties from Jira
                        existingTask.desc = jiraTask.desc;
                        existingTask.status = jiraTask.status;
                        existingTask.priority = jiraTask.priority;
                        existingTask.clientLabels = jiraTask.clientLabels;
                        existingTask.client = jiraTask.client;
                        existingTask.assignee = jiraTask.assignee;
                        existingTask.assigneeEmail = jiraTask.assigneeEmail;
                        existingTask.duedate = jiraTask.duedate;
                        
                        if (jiraTask.assigneeEmail && jiraTask.assigneeEmail !== oldAssigneeEmail) {
                            checkAndCreateThumbnailSubTask(existingTask, jiraTask.assigneeEmail);
                        }
                    } else {
                        // New task from Jira
                        taskMap.set(jiraTask.id, jiraTask);
                        if (jiraTask.assigneeEmail) {
                            checkAndCreateThumbnailSubTask(jiraTask, jiraTask.assigneeEmail);
                        }
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

                tasks = mergeTasksById(Array.from(taskMap.values()));

                localStorage.setItem('worksync_tasks', JSON.stringify(tasks));
                localStorage.setItem('worksync_lastSync', Date.now().toString());

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
                } else {
                    updateSystemStatus(true, `Synced at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, true);
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

        function formatTaskDueDate(duedate) {
            if (!duedate) return null;
            const d = new Date(duedate);
            if (Number.isNaN(d.getTime())) return null;
            return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        }

        function formatTaskDueDateHtml(duedate, status) {
            const label = formatTaskDueDate(duedate);
            if (!label) return '<span class="text-slate-400 text-xs">—</span>';
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dueDate = new Date(duedate);
            const isOverdue = dueDate < today && !isDone(status);
            if (isOverdue) {
                return `<span class="inline-flex items-center gap-1 text-rose-600 font-bold text-xs"><iconify-icon icon="solar:danger-triangle-bold" width="12"></iconify-icon>${label}</span>`;
            }
            return `<span class="text-slate-600 text-xs font-medium">${label}</span>`;
        }

        function getSortableTaskValue(task, col) {
            switch (col) {
                case 'assignee': return assigneeName(task).toLowerCase();
                case 'duedate': return task.duedate || '';
                case 'priority': return (task.priority || '').toLowerCase();
                case 'id': return (task.id || '').toLowerCase();
                case 'desc': return (task.desc || '').toLowerCase();
                case 'status': return (task.status || '').toLowerCase();
                case 'client': return (task.client || '').toLowerCase();
                default: return String(task[col] ?? '').toLowerCase();
            }
        }

        function compareTasksForSort(a, b, col, dir) {
            if (col === 'duedate') {
                const aEmpty = !a.duedate;
                const bEmpty = !b.duedate;
                if (aEmpty && bEmpty) return 0;
                if (aEmpty) return dir === 'asc' ? 1 : -1;
                if (bEmpty) return dir === 'asc' ? -1 : 1;
                const valA = new Date(a.duedate).getTime();
                const valB = new Date(b.duedate).getTime();
                if (valA < valB) return dir === 'asc' ? -1 : 1;
                if (valA > valB) return dir === 'asc' ? 1 : -1;
                return 0;
            }
            const valA = getSortableTaskValue(a, col);
            const valB = getSortableTaskValue(b, col);
            if (valA < valB) return dir === 'asc' ? -1 : 1;
            if (valA > valB) return dir === 'asc' ? 1 : -1;
            return 0;
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
            if (currentSearchTerm) filtered = filtered.filter(t => {
                const searchLower = currentSearchTerm.toLowerCase();
                return (t.id && t.id.toLowerCase().includes(searchLower)) ||
                       (t.desc && t.desc.toLowerCase().includes(searchLower)) ||
                       (t.assignee && t.assignee.toLowerCase().includes(searchLower));
            });
            
            if (taskSortCol) {
                updateSortIconUI('task', taskSortCol, taskSortDir);
                filtered.sort((a, b) => compareTasksForSort(a, b, taskSortCol, taskSortDir));
            }

            if (currentTaskViewMode === 'kanban' && kanban) {
                let allStatuses = currentStatusFilter === 'all'
                    ? [...new Set(tasks.filter(t => !isInternalTask(t)).map(t => t.status).filter(Boolean))]
                    : [...currentStatusFilter];
                allStatuses = sortBoardStatuses(allStatuses);
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
                    const statusJs = JSON.stringify(col.title);
                    return `
                    <div data-kanban-col="${escapeHtml(col.title)}" class="flex flex-col rounded-2xl ${col.bg} border ${col.border} p-4 h-full min-h-[300px] w-80 flex-shrink-0 transition-all" ondragover="event.preventDefault(); event.dataTransfer.dropEffect='move';" ondragenter="dragTaskEnter(event, this)" ondragleave="dragTaskLeave(event, this)" ondrop="dropTask(event, ${statusJs})">
                        <div class="flex items-center justify-between mb-4 gap-2">
                            <h3 class="text-sm font-black ${col.titleColor} truncate flex-1">${escapeHtml(col.title)}</h3>
                            <div class="flex items-center gap-1 shrink-0">
                                <button type="button" onclick="moveBoardColumn(${statusJs}, -1)" class="p-1 rounded-lg bg-white/80 hover:bg-white text-slate-500 shadow-sm" title="Move column left"><iconify-icon icon="solar:alt-arrow-left-linear" width="14"></iconify-icon></button>
                                <button type="button" onclick="moveBoardColumn(${statusJs}, 1)" class="p-1 rounded-lg bg-white/80 hover:bg-white text-slate-500 shadow-sm" title="Move column right"><iconify-icon icon="solar:alt-arrow-right-linear" width="14"></iconify-icon></button>
                                <span class="text-[10px] font-bold bg-white px-2.5 py-1 rounded-full text-slate-500 shadow-sm">${colTasks.length}</span>
                            </div>
                        </div>
                        <div class="flex-1 space-y-3 overflow-y-auto">
                            ${colTasks.sort((a,b) => (a.duedate || '9999').localeCompare(b.duedate || '9999')).map(t => {
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
                                <div draggable="true" ondragstart="dragTask(event, '${t.id}')" class="bg-white p-4 rounded-xl shadow-sm border cursor-grab active:cursor-grabbing hover:shadow-md transition-all group ${isOverdue ? 'border-rose-200 bg-rose-50/50' : (t.isOnHold && activeTaskId !== t.id ? 'border-amber-200 bg-amber-50/30' : 'border-slate-100')}">
                                    <div class="flex items-start justify-between mb-2">
                                        <span class="text-[10px] font-mono font-bold text-indigo-600">${t.manual ? `<button onclick="openEditTaskModal('${t.id}')" class="hover:underline hover:text-indigo-800 text-left">${t.id}</button>` : `<a href="https://${JIRA.domain}/browse/${t.id}" target="_blank" class="hover:underline hover:text-indigo-800">${t.id}</a>`}</span>
                                        <div class="flex items-center gap-2">
                                            ${t.isOnHold && activeTaskId !== t.id ? `<span class="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1"><iconify-icon icon="solar:pause-circle-bold" width="10"></iconify-icon>On Hold</span>` : ''}
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
                                            <button onclick="toggleActiveTask('${t.id}')" class="flex items-center gap-1 text-[10px] font-bold px-3 py-1 rounded-lg transition-all ${t.isOnHold ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'}">
                                                <iconify-icon icon="${t.isOnHold ? 'solar:play-circle-bold' : 'solar:play-circle-bold'}" width="14"></iconify-icon> ${t.isOnHold ? 'Resume' : 'Start'}
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
                    <tr class="hover:bg-slate-50 transition-colors ${activeTaskId === t.id ? 'bg-indigo-50/30' : ''} ${isOverdue ? 'bg-rose-50/30' : ''} ${t.isOnHold && activeTaskId !== t.id ? 'bg-amber-50/20' : ''}">
                        <td class="px-6 py-4 text-xs font-mono font-bold text-indigo-600">${taskKeyHtml}</td>
                        <td class="px-6 py-4 max-w-xs truncate text-xs text-slate-900">${escapeHtml(t.desc)}${t.issueType ? `<div class="text-[10px] text-slate-400 mt-1">${escapeHtml(t.issueType)}</div>` : ''}</td>
                        <td class="px-6 py-4"><span class="text-[10px] font-bold px-2 py-1 rounded-full ${statusClass(t.status)}">${t.status}</span>${t.isOnHold && activeTaskId !== t.id ? `<span class="ml-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">On Hold</span>` : ''}</td>
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
                                    <button onclick="toggleActiveTask('${t.id}')" class="flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all ${t.isOnHold ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600'}">
                                        <iconify-icon icon="solar:play-circle-bold" width="16"></iconify-icon> ${t.isOnHold ? 'Resume' : 'Start'}
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
                    filtered = filtered.filter(t => t.duedate && new Date(t.duedate) < today && !isDone(t.status) && !isInternalDone(t.status));
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
                const term = currentInternalSearchTerm.toLowerCase();
                filtered = filtered.filter(t =>
                    (t.id || '').toLowerCase().includes(term) ||
                    (t.desc || '').toLowerCase().includes(term) ||
                    (t.client || '').toLowerCase().includes(term) ||
                    (assigneeName(t) || '').toLowerCase().includes(term)
                );
            }
            if (internalTaskSortCol) {
                updateSortIconUI('internal-task', internalTaskSortCol, internalTaskSortDir);
                filtered.sort((a, b) => compareTasksForSort(a, b, internalTaskSortCol, internalTaskSortDir));
            }

            if (!filtered.length) {
                tbody.innerHTML = `<tr><td colspan="8" class="px-6 py-10 text-center text-xs text-slate-400">No internal tasks found.</td></tr>`;
                return;
            }

            tbody.innerHTML = filtered.map(t => {
                const taskCompleted = isInternalDone(t.status) || isDone(t.status);
                const dueDateHtml = formatTaskDueDateHtml(t.duedate, taskCompleted ? 'Completed' : t.status);
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);
                const isOverdue = t.duedate && !taskCompleted && new Date(t.duedate) < todayStart;
                return `
                <tr class="hover:bg-slate-50 transition-colors ${activeTaskId === t.id ? 'bg-indigo-50/30' : ''} ${isOverdue ? 'bg-rose-50/30' : ''}">
                    <td class="px-6 py-4 text-xs font-mono font-bold text-indigo-600"><button onclick="openEditTaskModal('${t.id}')" class="hover:underline hover:text-indigo-800 transition-colors text-left">${t.id}</button></td>
                    <td class="px-6 py-4 max-w-xs truncate text-xs text-slate-900">
                        ${escapeHtml(t.desc || '')}
                        ${isMorningLearningTask(t) ? `<span class="ml-1 text-[8px] font-bold uppercase text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">9–10 AM</span>` : ''}
                        ${(t.description || t.notes) ? `<div class="text-[10px] text-slate-400 mt-1 truncate">${escapeHtml(t.description || t.notes)}</div>` : ''}
                    </td>
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

        function morningLearningTaskId(email) {
            return `LEARN-${eKey(email)}`;
        }

        function isMorningLearningTask(task) {
            return task?.learningSession === true || String(task?.id || '').startsWith('LEARN-');
        }

        function isExcludedFromMorningLearning(email) {
            if (!email) return false;
            const normalized = email.toLowerCase();
            return MORNING_LEARNING_EXCLUDED_EMAILS.some(e => e.toLowerCase() === normalized);
        }

        function getLearningEmployees() {
            const base = allUsersMap?.size
                ? Array.from(allUsersMap.values())
                : USERS;
            return base.filter(u => u.email && u.email !== '123' && !isExcludedFromMorningLearning(u.email));
        }

        function buildMorningLearningTask(user) {
            const email = user.email;
            return {
                id: morningLearningTaskId(email),
                desc: MORNING_LEARNING_TITLE,
                description: '',
                client: 'Learning',
                status: 'Learnings',
                priority: 'Medium',
                assignee: user.name || email,
                assigneeEmail: email,
                manual: true,
                taskType: 'internal',
                learningSession: true,
                recurring: 'weekday-morning',
                timeSlot: MORNING_LEARNING_SLOT,
                userId: email,
                createdAt: Date.now(),
                duedate: todayIso()
            };
        }

        async function ensureMorningLearningTaskForUser(user) {
            if (!db || !user?.email || user.email === '123') return null;
            const taskId = morningLearningTaskId(user.email);
            const path = `worksync/manual_tasks/${eKey(user.email)}/${taskId}`;

            if (isExcludedFromMorningLearning(user.email)) {
                const existing = await get(ref(db, path));
                if (existing.exists()) {
                    await remove(ref(db, path));
                    tasks = tasks.filter(t => t.id !== taskId);
                }
                return null;
            }

            const snap = await get(ref(db, path));
            const today = todayIso();

            if (!snap.exists()) {
                const task = buildMorningLearningTask(user);
                await set(ref(db, path), task);
                tasks = mergeTasksById([task, ...tasks]);
                return task;
            }

            const existing = snap.val();
            const updates = {};

            if (!existing.learningSession) {
                updates.learningSession = true;
                updates.recurring = 'weekday-morning';
                updates.timeSlot = MORNING_LEARNING_SLOT;
                updates.client = existing.client || 'Learning';
                updates.taskType = 'internal';
                updates.manual = true;
                if (!existing.desc || !String(existing.desc).includes('Morning Learning')) {
                    updates.desc = MORNING_LEARNING_TITLE;
                }
            }

            const completedToday = existing.lastCompletedDate === today;
            const needsDailyReset = existing.lastCompletedDate && existing.lastCompletedDate < today
                && (existing.status === 'Completed' || isInternalDone(existing.status));

            if (needsDailyReset && !completedToday) {
                updates.status = 'Learnings';
                updates.duedate = today;
            } else if (!existing.duedate || existing.duedate < today) {
                if (existing.status !== 'Completed' && !isInternalDone(existing.status)) {
                    updates.duedate = today;
                }
            }

            if (Object.keys(updates).length) {
                await update(ref(db, path), updates);
                const idx = tasks.findIndex(t => t.id === taskId);
                if (idx >= 0) Object.assign(tasks[idx], updates);
            }
            return { ...existing, ...updates };
        }

        async function ensureMorningLearningTasks() {
            const users = getLearningEmployees();
            for (const user of users) {
                try {
                    await ensureMorningLearningTaskForUser(user);
                } catch (err) {
                    console.warn('Morning learning task ensure failed:', user.email, err);
                }
            }
            if (activeView === 'internal-tasks') renderInternalTasks();
            if (activeView === 'dailyplan') renderDailyPlan();
        }

        const MURUGESH_TASKS_CONFIG = [
            { title: "Client Message for Daily Task", needsClient: false },
            { title: "Learnings", needsClient: false },
            { title: "Quade - Meeting & Work", needsClient: false },
            { title: "Social media comments & Messages reply", needsClient: true },
            { title: "Google Review reply", needsClient: true },
            { title: "IVN Amazon Orders", needsClient: false },
            { title: "Ads", needsClient: true },
            { title: "Report to MD", needsClient: false },
            { title: "Client send", needsClient: false },
            { title: "Stories Upload", needsClient: true },
            { title: "Internal status track", needsClient: false },
            { title: "Social media posting", needsClient: false },
            { title: "Client message for closing", needsClient: false }
        ];

        let murugeshTasksEnsureStarted = false;

        async function ensureMurugeshDailyTasks() {
            if (!currentUser || currentUser.email.toLowerCase() !== 'murugeshvilpower@gmail.com') return;
            if (murugeshTasksEnsureStarted) return;
            murugeshTasksEnsureStarted = true;
            
            try {
                const email = currentUser.email;
                const ownerKey = eKey(email);
                const today = todayIso();
                
                for (let i = 0; i < MURUGESH_TASKS_CONFIG.length; i++) {
                    const taskConfig = MURUGESH_TASKS_CONFIG[i];
                    const baseIdStr = taskConfig.title.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8).toUpperCase();
                    const taskId = `M-${baseIdStr}-${i}`;
                    const path = `worksync/manual_tasks/${ownerKey}/${taskId}`;
                    
                    const snap = await get(ref(db, path));
                    
                    if (!snap.exists()) {
                        const task = {
                            id: taskId,
                            desc: taskConfig.title,
                            description: taskConfig.needsClient ? 'Requires Client Selection' : 'Daily Recurring Task',
                            client: 'Internal',
                            status: 'To Do',
                            priority: 'Medium',
                            assignee: currentUser.name,
                            assigneeEmail: email,
                            manual: true,
                            taskType: 'internal',
                            murugeshTask: true,
                            needsClient: taskConfig.needsClient,
                            userId: email,
                            createdAt: Date.now(),
                            duedate: today
                        };
                        await set(ref(db, path), task);
                        tasks = mergeTasksById([task, ...tasks]);
                    } else {
                        const existing = snap.val();
                        const completedToday = existing.lastCompletedDate === today;
                        const needsDailyReset = existing.lastCompletedDate && existing.lastCompletedDate < today
                            && (existing.status === 'Completed' || isInternalDone(existing.status));

                        let updates = {};
                        if (needsDailyReset && !completedToday) {
                            updates.status = 'To Do';
                            updates.duedate = today;
                        } else if (!existing.duedate || existing.duedate < today) {
                            if (existing.status !== 'Completed' && !isInternalDone(existing.status)) {
                                updates.duedate = today;
                            }
                        }
                        
                        if (!existing.murugeshTask) updates.murugeshTask = true;
                        if (existing.needsClient !== taskConfig.needsClient) updates.needsClient = taskConfig.needsClient;

                        if (Object.keys(updates).length) {
                            await update(ref(db, path), updates);
                            const idx = tasks.findIndex(t => t.id === taskId);
                            if (idx >= 0) Object.assign(tasks[idx], updates);
                        }
                    }
                }
                
                if (activeView === 'internal-tasks') renderInternalTasks();
                if (activeView === 'dailyplan') renderDailyPlan();
                
            } catch (err) {
                console.warn('Murugesh tasks setup failed:', err);
                murugeshTasksEnsureStarted = false;
            }
        }

        async function runMorningLearningSetup() {
            if (!currentUser || morningLearningEnsureStarted) return;
            morningLearningEnsureStarted = true;
            try {
                await ensureMorningLearningTaskForUser({
                    email: currentUser.email,
                    name: currentUser.name
                });
                if (isAdmin()) await ensureMorningLearningTasks();
            } catch (err) {
                console.warn('Morning learning setup failed:', err);
                morningLearningEnsureStarted = false;
            }
        }

        async function completeMorningLearningTask(task) {
            if (!task || !isMorningLearningTask(task) || !db) return false;
            const today = todayIso();
            if (task.lastCompletedDate === today) return true;

            const userEmail = (task.assigneeEmail || task.userId || currentUser?.email || '').toLowerCase();
            const user = allUsersMap.get(userEmail) || {
                email: task.assigneeEmail || task.userId,
                name: task.assignee || 'Employee'
            };
            const notes = (task.description || task.notes || '').trim();
            const details = notes
                ? `${notes}\n\n— Attendance: Morning learning session (${MORNING_LEARNING_SLOT}) on ${today}.`
                : `Attended morning learning session (${MORNING_LEARNING_SLOT}) on ${today}.`;

            await push(ref(db, 'worksync/learning_logs'), {
                title: `${MORNING_LEARNING_TITLE} — ${user.name}`,
                details,
                logType: 'attendance',
                sessionType: 'Morning Learning',
                timeSlot: MORNING_LEARNING_SLOT,
                userId: user.email,
                userName: user.name,
                taskId: task.id,
                attendanceDate: today,
                createdAt: Date.now()
            });

            const ownerKey = eKey(task.userId || user.email);
            await update(ref(db, `worksync/manual_tasks/${ownerKey}/${task.id}`), {
                status: 'Completed',
                lastCompletedDate: today,
                completedAt: Date.now()
            });

            const idx = tasks.findIndex(t => t.id === task.id);
            if (idx >= 0) {
                tasks[idx].status = 'Completed';
                tasks[idx].lastCompletedDate = today;
            }

            renderInternalTasks();
            renderDailyPlan();
            if (activeView === 'learnings-org') renderLearningsOrgPanel();
            toast('Morning learning completed — attendance logged', 'success');
            return true;
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

        let pendingMurugeshTaskId = null;
        
        function showMurugeshClientPopup(taskId) {
            const task = tasks.find(t => t.id === taskId);
            if (!task) return;
            pendingMurugeshTaskId = taskId;

            const nameEl = document.getElementById('murugesh-task-name');
            if (nameEl) nameEl.textContent = task.id + ' — ' + (task.desc || '');

            const select = document.getElementById('murugesh-client-select');
            if (select) {
                select.innerHTML = '<option value="" disabled selected>Select a client...</option>' + 
                    CLIENTS.map(c => `<option value="${c}">${c}</option>`).join('');
            }

            document.getElementById('murugeshClientModal').showModal();
        }

        async function confirmMurugeshClientStart() {
            if (!pendingMurugeshTaskId) return;
            const select = document.getElementById('murugesh-client-select');
            const client = select.value;
            
            if (!client) return toast('Please select a client', 'error');

            document.getElementById('murugeshClientModal').close();

            const baseTask = tasks.find(t => t.id === pendingMurugeshTaskId);
            pendingMurugeshTaskId = null;
            
            // Create a new manual task for this specific client
            const newTaskId = `M-${Math.floor(Math.random() * 900000) + 100000}`;
            const newTask = {
                ...baseTask,
                id: newTaskId,
                desc: `${baseTask.desc} - ${client}`,
                client: client,
                murugeshTask: false, // Don't treat it as the base recurring task anymore
                needsClient: false,
                status: 'In Progress',
                createdAt: Date.now()
            };
            
            const ownerKey = eKey(newTask.userId || currentUser.email);
            await set(ref(db, `worksync/manual_tasks/${ownerKey}/${newTaskId}`), newTask);
            tasks.unshift(newTask);
            
            // Start the new task immediately
            await doStartTask(newTaskId);
        }

        async function toggleActiveTask(id) {
            // This function is called when clicking "Start" on a new task.

            // Murugesh client selection for specific tasks
            const task = tasks.find(t => t.id === id);
            if (task && task.murugeshTask && task.needsClient) {
                showMurugeshClientPopup(id);
                return; // Don't start yet, wait for client selection
            }

            // Sneha task preparation popup: only show for Sneha starting any Jira (non-internal) task
            if (isSnehaUser()) {
                if (task && !isInternalTask(task)) {
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
                
                // If previous task was on hold, persist that hold state to Firebase
                if (taskOnHold && activeTaskId) {
                    const prevTask = tasks.find(t => t.id === activeTaskId);
                    if (prevTask) {
                        prevTask.isOnHold = true;
                        if (prevTask.manual) {
                            try {
                                await update(ref(db, `worksync/manual_tasks/${eKey(prevTask.userId || currentUser.email)}/${activeTaskId}`), { isOnHold: true });
                            } catch(e) { /* non-critical */ }
                        }
                    }
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
                toast(`Task ${activeTaskId} ${taskOnHold ? 'kept on hold' : 'ended'} — ${formatTime(taskSeconds)} logged`, 'info');
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

            // Clear the hold state on the task being started
            const task = tasks.find(t => t.id === id);
            if (task) {
                task.isOnHold = false;
                if (task.manual) {
                    try {
                        await update(ref(db, `worksync/manual_tasks/${eKey(task.userId || currentUser.email)}/${id}`), { isOnHold: false });
                    } catch(e) { /* non-critical */ }
                }
            }

            // For internal task, update status to 'In Progress' (except recurring morning learning)
            if (task && isInternalTask(task) && !isMorningLearningTask(task)) {
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
                if (task && isInternalTask(task) && !isMorningLearningTask(task)) {
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
            if (task && isInternalTask(task) && !isMorningLearningTask(task)) {
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
            if (t && isMorningLearningTask(t)) {
                await completeMorningLearningTask(t);
            } else if (t && isInternalTask(t)) {
                await updateInternalTaskStatus(activeTaskId, 'Completed');
            }
            const log = {
                taskId: activeTaskId,
                taskDesc: t?.desc || '',
                client: t?.client || '',
                userId: currentUser.email,
                userName: currentUser.name,
                startTime: taskStartTime,
                endTime: Date.now(),
                durationSeconds: taskSeconds,
                durationFormatted: formatTime(taskSeconds)
            };
            await push(ref(db, 'worksync/timelogs'), log);
            await clearCurrentTask();
            toast(`Task ended — ${formatTime(taskSeconds)} logged`, 'success');
            activeTaskId = null; taskSeconds = 0; taskOnHold = false; taskStartTime = null;
            renderTasks(); if (activeView === 'internal-tasks') renderInternalTasks(); renderActiveTaskCard(); renderDailyPlan();
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
            populateClientSelect(clientSelect, '', 'Select client/department...');
            
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
                
                await push(ref(db, 'worksync/task_notifications'), {
                    title: 'Discussion Scheduled',
                    body: `You have been added to a discussion: "${title}" on ${date} at ${time}.`,
                    timestamp: Date.now(),
                    readBy: {},
                    notifyEmails: participants
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
                            if (disc.participants && disc.participants.includes(currentUser.email)) {
                                discussionPopupShown = true;
                                currentDiscussion = disc;
                                showDiscussionJoinPopup(disc);
                            }
                        }
                        
                        // Mark as in-progress when time arrives
                        if (timeUntilStart <= 0 && disc.status === 'scheduled') {
                            disc.status = 'in-progress';
                            updateDiscussionStatus(disc.id, 'in-progress');
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

            // Notify other participants that this person has joined the discussion
            const otherParticipants = (currentDiscussion.participants || []).filter(e => e !== currentUser.email);
            if (otherParticipants.length > 0) {
                await push(ref(db, 'worksync/task_notifications'), {
                    title: 'Discussion Started',
                    body: `${currentUser.name} has joined the discussion: "${currentDiscussion.title}" and a task has been created.`,
                    timestamp: Date.now(),
                    readBy: {},
                    notifyEmails: otherParticipants
                });
            }

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
            currentDiscussion = null;
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
                        // Only track discussions where the current user is a participant
                        if (disc && disc.participants && disc.participants.includes(currentUser.email)) {
                            discussions.push(disc);
                        }
                    });
                    startDiscussionListener();
                    if (activeView === 'discussions') {
                        renderDiscussionsView();
                    }
                });
            } catch (err) {
                console.error('Failed to load discussions:', err);
            }
        }

        function renderDiscussionsView() {
            const liveSection = document.getElementById('live-discussion-section');
            const upcomingList = document.getElementById('upcoming-discussions-list');
            const pastList = document.getElementById('past-discussions-list');

            if (!liveSection || !upcomingList || !pastList) return;

            const now = Date.now();
            const activeDisc = discussions.find(d => d.status === 'in-progress');

            if (activeDisc) {
                liveSection.classList.remove('hidden');
                
                const participantsHtml = (activeDisc.participants || []).map(p => {
                    const hasJoined = (activeDisc.joinedBy || []).includes(p);
                    const userObj = knownUserByEmail(p);
                    const name = userObj?.name || p;
                    const badgeClass = hasJoined 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                        : 'bg-white/5 text-slate-400 border border-white/10';
                    return `
                        <span class="text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${badgeClass}">
                            <iconify-icon icon="${hasJoined ? 'solar:check-circle-bold' : 'solar:clock-circle-bold'}" width="12"></iconify-icon>
                            ${escapeHtml(name)}
                        </span>
                    `;
                }).join('');

                liveSection.innerHTML = `
                    <div class="bg-gradient-to-br from-indigo-900 to-slate-950 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden mb-6">
                        <div class="relative z-10 space-y-6">
                            <div class="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                                <div class="flex items-center gap-3">
                                    <span class="flex h-3 w-3 relative">
                                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                      <span class="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                                    </span>
                                    <h4 class="text-base font-black uppercase tracking-wider text-rose-400">Live Meeting Happening Now</h4>
                                </div>
                                <div class="flex gap-2">
                                    <button onclick="endCurrentDiscussionLive('${activeDisc.id}')" class="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-lg shadow-rose-900/30 flex items-center gap-2">
                                        <iconify-icon icon="solar:stop-bold" width="14"></iconify-icon> Complete & End Discussion
                                    </button>
                                </div>
                            </div>

                            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div class="space-y-4">
                                    <div>
                                        <h3 class="text-2xl font-black text-white tracking-tight">${escapeHtml(activeDisc.title)}</h3>
                                        <p class="text-xs text-indigo-200 mt-1 font-bold">Client: <span class="text-white">${escapeHtml(activeDisc.client)}</span></p>
                                    </div>
                                    <div class="bg-white/5 border border-white/10 rounded-2xl p-4">
                                        <h5 class="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-1.5">Agenda / Description</h5>
                                        <p class="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">${escapeHtml(activeDisc.description || 'No agenda provided.')}</p>
                                    </div>
                                    <div>
                                        <h5 class="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-2">Participants</h5>
                                        <div class="flex flex-wrap gap-2">
                                            ${participantsHtml}
                                        </div>
                                    </div>
                                </div>

                                <div class="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col gap-4">
                                    <div class="flex items-center justify-between">
                                        <h5 class="text-xs font-bold text-indigo-300 uppercase tracking-widest">Meeting Notes / Minutes</h5>
                                        <span class="text-[10px] text-slate-400 italic">Auto-saves on typing</span>
                                    </div>
                                    <textarea id="live-disc-notes" oninput="saveLiveDiscussionNotes('${activeDisc.id}', this.value)" placeholder="Write summary, action items, decision logs, or key notes here..." class="flex-1 bg-slate-950/40 border border-white/10 rounded-2xl p-4 text-xs text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none min-h-[180px] leading-relaxed custom-scrollbar">${escapeHtml(activeDisc.notes || '')}</textarea>
                                </div>
                            </div>
                        </div>
                        <div class="absolute -right-16 -top-16 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl"></div>
                        <div class="absolute -left-16 -bottom-16 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl"></div>
                    </div>
                `;
            } else {
                liveSection.classList.add('hidden');
                liveSection.innerHTML = '';
            }

            // Render Upcoming List
            const upcoming = discussions
                .filter(d => d.status === 'scheduled' && d.scheduledTime > now)
                .sort((a, b) => a.scheduledTime - b.scheduledTime);

            if (upcoming.length === 0) {
                upcomingList.innerHTML = `
                    <div class="text-center py-12">
                        <iconify-icon icon="solar:info-circle-linear" class="text-slate-300 mb-2" width="36"></iconify-icon>
                        <p class="text-xs text-slate-400 italic">No upcoming discussions scheduled.</p>
                    </div>
                `;
            } else {
                upcomingList.innerHTML = upcoming.map(disc => {
                    const dateStr = new Date(disc.scheduledTime).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
                    const timeStr = new Date(disc.scheduledTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                    
                    const participantNames = (disc.participants || []).map(p => {
                        const userObj = knownUserByEmail(p);
                        return userObj?.name || p;
                    }).join(', ');

                    return `
                        <div class="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                            <div class="flex items-center justify-between">
                                <span class="text-[10px] font-black text-indigo-600 uppercase tracking-wider">${dateStr} @ ${timeStr}</span>
                                <span class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">${escapeHtml(disc.client)}</span>
                            </div>
                            <h5 class="text-xs font-black text-slate-900">${escapeHtml(disc.title)}</h5>
                            <p class="text-xs text-slate-500 line-clamp-2">${escapeHtml(disc.description || 'No description.')}</p>
                            <div class="pt-2 border-t border-slate-200/50 text-[10px] text-slate-400 font-bold">
                                Participants: <span class="text-slate-600 font-medium">${escapeHtml(participantNames)}</span>
                            </div>
                        </div>
                    `;
                }).join('');
            }

            // Render Past / Completed List
            const past = discussions
                .filter(d => d.status === 'completed' || (d.status === 'scheduled' && d.scheduledTime <= now))
                .sort((a, b) => b.scheduledTime - a.scheduledTime);

            if (past.length === 0) {
                pastList.innerHTML = `
                    <div class="text-center py-12">
                        <iconify-icon icon="solar:info-circle-linear" class="text-slate-300 mb-2" width="36"></iconify-icon>
                        <p class="text-xs text-slate-400 italic">No past discussion history found.</p>
                    </div>
                `;
            } else {
                pastList.innerHTML = past.map(disc => {
                    const dateStr = new Date(disc.scheduledTime).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
                    const timeStr = new Date(disc.scheduledTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                    
                    const participantNames = (disc.participants || []).map(p => {
                        const userObj = knownUserByEmail(p);
                        return userObj?.name || p;
                    }).join(', ');

                    return `
                        <div class="p-5 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-3">
                            <div class="flex items-center justify-between">
                                <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider">${dateStr} @ ${timeStr}</span>
                                <span class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">${escapeHtml(disc.client)}</span>
                            </div>
                            <h5 class="text-xs font-black text-slate-900">${escapeHtml(disc.title)}</h5>
                            <p class="text-xs text-slate-500 leading-relaxed">${escapeHtml(disc.description || 'No description.')}</p>
                            
                            <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/50 text-[10px] text-slate-400">
                                <div>Participants: <span class="text-slate-600 font-bold">${escapeHtml(participantNames)}</span></div>
                                <button onclick="togglePastDiscussionNotes('${disc.id}')" class="text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1">
                                    <iconify-icon icon="solar:document-text-bold" width="14"></iconify-icon> View Minutes/Notes
                                </button>
                            </div>
                            
                            <div id="past-notes-${disc.id}" class="hidden mt-3 p-4 bg-white border border-slate-200/60 rounded-xl space-y-2">
                                <h6 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Meeting Notes / Minutes</h6>
                                <p class="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">${escapeHtml(disc.notes || 'No notes were captured for this discussion.')}</p>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }

        let liveNotesSaveTimeout = null;
        function saveLiveDiscussionNotes(discussionId, notes) {
            if (liveNotesSaveTimeout) clearTimeout(liveNotesSaveTimeout);
            liveNotesSaveTimeout = setTimeout(async () => {
                try {
                    await update(ref(db, `worksync/discussions/${discussionId}`), { notes });
                } catch (err) {
                    console.error('Failed to auto-save notes:', err);
                }
            }, 500);
        }

        async function endCurrentDiscussionLive(discussionId) {
            if (!confirm('Are you sure you want to complete and end this discussion?')) return;
            try {
                await update(ref(db, `worksync/discussions/${discussionId}`), { status: 'completed' });
                toast('Discussion completed and logged!', 'success');
                if (activeTaskId) {
                    const currentTaskObj = tasks.find(t => t.id === activeTaskId);
                    if (currentTaskObj && currentTaskObj.discussionId === discussionId) {
                        await endTask();
                    }
                }
            } catch (err) {
                console.error('Failed to end discussion:', err);
                toast('Failed to end discussion: ' + err.message, 'error');
            }
        }

        function togglePastDiscussionNotes(id) {
            const el = document.getElementById(`past-notes-${id}`);
            if (el) {
                el.classList.toggle('hidden');
            }
        }

        function updateStats() {

            // --- User-specific stats for "Today's Performance" card ---
            const myTasks = tasks.filter(t => assigneeMatches(t, 'me'));
            
            const assignedGroup = ['todo', 'to do', 'design to do', 'rework designs'];
            const progressGroup = ['design inprogress', 'design in progress', 'in progress', 'inprogress'];
            const holdGroup = ['hold', 'design hold', 'on hold'];
            const completedGroup = ['design completed', 'completed', 'done'];

            const myAssigned = myTasks.filter(t => assignedGroup.includes((t.status || '').toLowerCase())).length;
            const myInProgress = myTasks.filter(t => progressGroup.includes((t.status || '').toLowerCase())).length;
            const myHold = myTasks.filter(t => holdGroup.includes((t.status || '').toLowerCase())).length;
            const myCompleted = myTasks.filter(t => completedGroup.includes((t.status || '').toLowerCase())).length;
            const myPendingCount = myTasks.filter(t => !completedGroup.includes((t.status || '').toLowerCase())).length;
            
            const elTotal = document.getElementById('stat-total'); if (elTotal) elTotal.textContent = myTasks.length;
            const elTodo = document.getElementById('stat-todo'); if (elTodo) elTodo.textContent = myInProgress;
            const elProg = document.getElementById('stat-progress'); if (elProg) elProg.textContent = myHold;
            const elDone = document.getElementById('stat-done'); if (elDone) elDone.textContent = myCompleted;
            
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
            if (!card || !canvas || !isAdmin()) return;

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
            if (!list || !countEl || !isAdmin()) return;
            const activeCount = currentWorkUsers.filter(u => u.currentTask && u.currentTask.state === 'working').length; // Count only actively working
            countEl.textContent = `${activeCount} Active`;
            if (!currentWorkUsers.length) {
                list.innerHTML = `<p class="xl:col-span-2 p-5 text-center text-xs text-slate-400 italic">No employees found.</p>`;
                return;
            }
            list.innerHTML = currentWorkUsers.map(u => {
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
            if (taskIndex === -1) return;
            const task = tasks[taskIndex];
            const oldStatus = task.status;

            if (isMorningLearningTask(task) && (newStatus === 'Completed' || isInternalDone(newStatus))) {
                task.description = task.description || task.notes || '';
                await completeMorningLearningTask(task);
                return;
            }

            // Optimistically update UI
            task.status = newStatus;
            renderInternalTasks();
            updateStats();

            try {
                if (task.manual || isInternalTask(task)) {
                    const ownerKey = eKey(task.userId || task.assigneeEmail || currentUser.email);
                    await update(ref(db, `worksync/manual_tasks/${ownerKey}/${taskId}`), { status: newStatus });
                    toast('Status updated', 'success');
                } else {
                    // Jira task - sync to Jira
                    toast('Syncing to Jira...', 'info');
                    const ok = await updateJiraStatus(taskId, newStatus);
                    if (!ok) {
                        task.status = oldStatus;
                        renderInternalTasks();
                        updateStats();
                    }
                }
            } catch (err) {
                console.error('Failed to update internal task status:', err);
                task.status = oldStatus;
                renderInternalTasks();
                updateStats();
                toast('Failed to update status: ' + err.message, 'error');
            }
        }

        function todayStartTs() {
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            return d.getTime();
        }

        function loadTodayWorkSummary() {
            if (!canViewDailySummary()) return;
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
                    assignedCount: 0,
                    inProgressCount: 0,
                    completedCount: 0,
                    correctionsCount: 0
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

                const ut = tasks.filter(t => assigneeMatches(t, u.email) && t.status !== 'Learnings' && t.status !== 'Learning');
                const isCorrections = (s) => ['Quality Check', 'Quality check', 'Rework Designs', 'Rework designs'].includes(s);
                row.assignedCount = ut.filter(t => isTodo(t.status) || (isInternalTask(t) && isInternalTodo(t.status))).length;
                row.inProgressCount = ut.filter(t => (isInProgress(t.status) || (isInternalTask(t) && isInternalInProgress(t.status))) && !isCorrections(t.status)).length;
                row.completedCount = ut.filter(t => isDone(t.status) || (isInternalTask(t) && isInternalDone(t.status))).length;
                row.correctionsCount = ut.filter(t => isCorrections(t.status)).length;
            });

            return [...rows.values()].sort((a, b) => {
                const activeSort = (b.activeTask ? 1 : 0) - (a.activeTask ? 1 : 0);
                return activeSort || (b.loggedSeconds + b.activeSeconds) - (a.loggedSeconds + a.activeSeconds) || a.name.localeCompare(b.name);
            });
        }

        function renderDailySummary() {
            const list = document.getElementById('daily-summary-list');
            const card = document.getElementById('admin-daily-summary-card');
            const exportBtn = document.getElementById('export-daily-report-btn');
            if (!list || !canViewDailySummary()) return;

            if (!canViewDailySummary() && activeView !== 'daily-summary') {
                card?.classList.add('hidden');
                return;
            } else {
                card?.classList.remove('hidden');
            }

            let rows = buildDailySummaryRows();
            const totalSeconds = rows.reduce((sum, row) => sum + row.loggedSeconds + row.activeSeconds, 0);
            const loggedTasks = rows.reduce((sum, row) => sum + row.completedTasks, 0);
            const activeCount = rows.filter(row => row.activeTask).length;

            document.getElementById('daily-total-time').textContent = formatTime(totalSeconds);
            document.getElementById('daily-task-count').textContent = loggedTasks;
            document.getElementById('daily-active-count').textContent = activeCount;
            document.getElementById('daily-employee-count').textContent = rows.length;

            // Hide export button for non-admins
            if (exportBtn) {
                exportBtn.classList.toggle('hidden', !isAdmin());
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
                        <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 flex-1">
                            <div class="bg-slate-50 rounded-xl px-3 py-2">
                                <p class="text-[9px] font-bold text-slate-400 uppercase">Total</p>
                                <p class="text-xs font-black text-slate-900 font-mono">${formatTime(total)}</p>
                            </div>
                            <div class="bg-sky-50 rounded-xl px-3 py-2">
                                <p class="text-[9px] font-bold text-sky-500 uppercase">Assigned</p>
                                <p class="text-xs font-black text-sky-600">${row.assignedCount}</p>
                            </div>
                            <div class="bg-amber-50 rounded-xl px-3 py-2">
                                <p class="text-[9px] font-bold text-amber-500 uppercase">Progress</p>
                                <p class="text-xs font-black text-amber-600">${row.inProgressCount}</p>
                            </div>
                            <div class="bg-rose-50 rounded-xl px-3 py-2">
                                <p class="text-[9px] font-bold text-rose-500 uppercase truncate">Corrections Designs</p>
                                <p class="text-xs font-black text-rose-600">${row.correctionsCount}</p>
                            </div>
                            <div class="bg-emerald-50 rounded-xl px-3 py-2">
                                <p class="text-[9px] font-bold text-emerald-500 uppercase">Done</p>
                                <p class="text-xs font-black text-emerald-600">${row.completedCount}</p>
                            </div>
                            <div class="bg-slate-50 rounded-xl px-3 py-2">
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
                    </div>`;
            }).join('');
        }

        function renderWorkloadChart() {
            const chart = document.getElementById('workload-chart');
            const totalEl = document.getElementById('workload-total');
            if (!chart || !totalEl || !isAdmin()) return;
            
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
            if (!isAdmin()) return;
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
            if(activeBtn) {
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
        function eKey(email) { return (email || '').toLowerCase().replace(/[@.]/g, '_'); }
        function dmId(e1, e2) { const k = [eKey(e1), eKey(e2)].sort(); return `dm_${k[0]}_${k[1]}`; }

        function registerOnline() {
            if (!db || !currentUser) return;
            const userRef = ref(db, `worksync/users/${eKey(currentUser.email)}`);
            update(userRef, { online: true, lastSeen: Date.now() });
            onDisconnect(ref(db, `worksync/users/${eKey(currentUser.email)}/online`)).set(false); // Set to false on disconnect
        }

        function formatChatTime(ts) {
            if (!ts) return '';
            const d = new Date(ts);
            const today = new Date();
            if (d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()) {
                return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }

        let chatConversations = {};

        function togglePinChat(convId, event) {
            if (event) event.stopPropagation();
            if (!currentUser) return;
            const pinnedKey = `worksync_pinned_chats_${eKey(currentUser.email)}`;
            let pinnedList = JSON.parse(localStorage.getItem(pinnedKey) || '[]');
            if (pinnedList.includes(convId)) {
                pinnedList = pinnedList.filter(id => id !== convId);
                toast('Chat unpinned', 'success');
            } else {
                pinnedList.push(convId);
                toast('Chat pinned', 'success');
            }
            localStorage.setItem(pinnedKey, JSON.stringify(pinnedList));
            
            const myKey = eKey(currentUser.email);
            const groups = Object.entries(chatConversations).filter(([, c]) => c.type === 'group' && c.members && c.members[myKey]);
            renderGroupList(groups);
            renderDmList();
        }

        function initChat() {
            if (!db || !currentUser) return;
            onValue(ref(db, 'worksync/conversations'), snap => {
                chatConversations = snap.val() || {};
                const myKey = eKey(currentUser.email);
                const groups = Object.entries(chatConversations).filter(([, c]) => c.type === 'group' && c.members && c.members[myKey]);
                renderGroupList(groups);
                watchConversationNotifications(Object.entries(chatConversations).filter(([, c]) => c.members && c.members[myKey]));
                if (activeView === 'chat') {
                    renderDmList();
                }
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
            
            const pinnedKey = `worksync_pinned_chats_${eKey(currentUser.email)}`;
            const pinnedList = JSON.parse(localStorage.getItem(pinnedKey) || '[]');
            
            const others = Array.from(allUsersMap.values())
                .filter(u => u.email && u.email !== currentUser.email);
                
            const mappedOthers = others.map(u => {
                const convId = dmId(currentUser.email, u.email);
                const conv = chatConversations[convId] || {};
                const isPinned = pinnedList.includes(convId);
                const lastTimestamp = conv.lastTimestamp || 0;
                return { user: u, convId, isPinned, lastTimestamp };
            });
            
            mappedOthers.sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                if (a.lastTimestamp !== b.lastTimestamp) {
                    return b.lastTimestamp - a.lastTimestamp;
                }
                return (a.user.name || '').localeCompare(b.user.name || '');
            });

            if (!mappedOthers.length) {
                container.innerHTML = `<p class="p-5 text-center text-xs text-slate-400 italic">No users found.</p>`;
                return;
            }
            
            container.innerHTML = mappedOthers.map(item => {
                const u = item.user;
                const convId = item.convId;
                const isPinned = item.isPinned;
                const unread = unreadCounts[convId] || 0;
                const activeClass = unread > 0 ? 'bg-indigo-50/50 border-l-2 border-indigo-600' : '';
                return `
                <button id="dm-btn-${convId}" onclick="openDm('${u.email}')" class="group w-full flex items-center gap-3 px-5 py-1.5 hover:bg-slate-50 transition-all text-left ${activeClass}">
                    <div class="relative shrink-0">
                        <img src="${u.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.avatar || u.name}`}" class="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 object-cover">
                        <div id="online-${eKey(u.email)}" class="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-slate-300 border-2 border-white rounded-full"></div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between gap-1">
                            <div class="flex items-center gap-1 min-w-0">
                                <p class="text-xs ${unread > 0 ? 'font-black text-slate-900' : 'font-bold text-slate-700'} truncate">${u.name}</p>
                                <span onclick="togglePinChat('${convId}', event); event.stopPropagation();" class="p-0.5 hover:text-indigo-600 rounded-md transition-colors ${isPinned ? 'text-indigo-600' : 'text-slate-300 opacity-0 group-hover:opacity-100'}" title="${isPinned ? 'Unpin chat' : 'Pin chat'}">
                                    <iconify-icon icon="solar:pin-bold" width="12"></iconify-icon>
                                </span>
                            </div>
                            ${item.lastTimestamp ? `<span class="text-[9px] ${unread > 0 ? 'font-bold text-indigo-600' : 'text-slate-400'} whitespace-nowrap shrink-0">${formatChatTime(item.lastTimestamp)}</span>` : ''}
                        </div>
                        <div class="flex items-center justify-between mt-0.5">
                            <p class="text-[10px] ${unread > 0 ? 'text-slate-600 font-bold' : 'text-slate-400'} uppercase truncate">${u.role || 'Member'}</p>
                            <span id="unread-badge-${convId}" class="${unread > 0 ? '' : 'hidden'} bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 min-w-[1.25rem] text-center">${unread}</span>
                        </div>
                    </div>
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
            
            const pinnedKey = `worksync_pinned_chats_${eKey(currentUser.email)}`;
            const pinnedList = JSON.parse(localStorage.getItem(pinnedKey) || '[]');
            
            const mappedGroups = groups.map(([id, g]) => {
                const isPinned = pinnedList.includes(id);
                const lastTimestamp = g.lastTimestamp || 0;
                return { id, group: g, isPinned, lastTimestamp };
            });
            
            mappedGroups.sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                if (a.lastTimestamp !== b.lastTimestamp) {
                    return b.lastTimestamp - a.lastTimestamp;
                }
                return (a.group.name || '').localeCompare(b.group.name || '');
            });

            el.innerHTML = mappedGroups.map(item => {
                const id = item.id;
                const g = item.group;
                const isPinned = item.isPinned;
                const name = g.name || 'Unnamed Group';
                const safeNameHtml = escapeHtml(name);
                const safeNameJs = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
                const unread = unreadCounts[id] || 0;
                const activeClass = unread > 0 ? 'bg-indigo-50/50 border-l-2 border-indigo-600' : '';
                
                const avatarHtml = g.profilePicture
                    ? `<img src="${g.profilePicture}" class="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-200">`
                    : `<div class="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black shrink-0">${escapeHtml(name.charAt(0))}</div>`;

                return `
                <button id="dm-btn-${id}" onclick="openConversation('${id}','${safeNameJs}','group', '${g.profilePicture || ''}')" class="group w-full flex items-center gap-3 px-5 py-1.5 hover:bg-slate-50 transition-all text-left ${activeClass}">
                    ${avatarHtml}
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between gap-1">
                            <div class="flex items-center gap-1 min-w-0">
                                <p class="text-xs ${unread > 0 ? 'font-black text-slate-900' : 'font-bold text-slate-700'} truncate">${safeNameHtml}</p>
                                <span onclick="togglePinChat('${id}', event); event.stopPropagation();" class="p-0.5 hover:text-indigo-600 rounded-md transition-colors ${isPinned ? 'text-indigo-600' : 'text-slate-300 opacity-0 group-hover:opacity-100'}" title="${isPinned ? 'Unpin chat' : 'Pin chat'}">
                                    <iconify-icon icon="solar:pin-bold" width="12"></iconify-icon>
                                </span>
                            </div>
                            ${item.lastTimestamp ? `<span class="text-[9px] ${unread > 0 ? 'font-bold text-indigo-600' : 'text-slate-400'} whitespace-nowrap shrink-0">${formatChatTime(item.lastTimestamp)}</span>` : ''}
                        </div>
                        <div class="flex items-center justify-between mt-0.5">
                            <p class="text-[10px] ${unread > 0 ? 'text-slate-600 font-bold' : 'text-slate-400'} uppercase truncate">Team Group</p>
                            <span id="unread-badge-${id}" class="${unread > 0 ? '' : 'hidden'} bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 min-w-[1.25rem] text-center">${unread}</span>
                        </div>
                    </div>
                </button>`;
            }).join('');
        }

        function closeChat() {
            const chatWelcome = document.getElementById('chat-welcome');
            const chatHeader = document.getElementById('chat-active-header');
            const chatInput = document.getElementById('chat-input-area');
            const messagesArea = document.getElementById('messages-area');
            const chatPanel = document.getElementById('view-chat-panel');

            if (chatWelcome) chatWelcome.classList.remove('hidden');
            if (chatHeader) chatHeader.classList.add('hidden');
            if (chatInput) chatInput.classList.add('hidden');
            if (messagesArea) messagesArea.innerHTML = '';
            
            activeConvId = null;
            if (msgListener) { 
                try {
                    msgListener(); 
                } catch(e) {}
                msgListener = null; 
            }

            if (chatPanel) {
                chatPanel.classList.add('no-active-chat');
                chatPanel.classList.remove('active-chat');
            }
        }
        window.closeChat = closeChat;
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

            const chatPanel = document.getElementById('view-chat-panel');
            if (chatPanel) {
                chatPanel.classList.remove('no-active-chat');
                chatPanel.classList.add('active-chat');
            }
            document.getElementById('chat-conv-name').textContent = name;
            document.getElementById('chat-conv-avatar').textContent = name.charAt(0);
            if (avatar) document.getElementById('chat-conv-avatar').innerHTML = `<img src="${avatar}" class="w-full h-full rounded-xl object-cover">`;

            activeGroupMembers = [];
            let convCreator = null;
            if (type === 'group') {
                try {
                    const [convSnap, usersSnap] = await Promise.all([
                        get(ref(db, `worksync/conversations/${convId}`)),
                        Promise.resolve(allUsersMap) // Use the already loaded allUsersMap
                    ]);
                    const conv = convSnap.val() || {};
                    convCreator = conv.createdBy;
                    const allUsers = Array.from(usersSnap.values()); // Get values from the map
                    activeGroupMembers = allUsers.filter(u => conv.members && conv.members[eKey(u.email)]);
                } catch (e) { console.error('Failed to load group members', e); }
            }

            const actions = document.getElementById('chat-conv-actions');
            if (actions) {
                const isCreator = convCreator === currentUser.email;
                if (type === 'group' && (isAdmin() || isCreator)) {
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
                currentConvMessages = snap.val() || {};
                renderMessages(currentConvMessages);
                scrollChatToBottom();
            });
        }

        function normalizeMessageAttachments(msg) {
            if (!msg || msg.unsent) return [];
            if (Array.isArray(msg.attachments) && msg.attachments.length) return msg.attachments;
            if (msg.attachmentUrl) {
                return [{ url: msg.attachmentUrl, type: msg.attachmentType || '', name: msg.attachmentName || '' }];
            }
            return [];
        }

        function getMessageImageAttachments(msg) {
            return normalizeMessageAttachments(msg).filter(a => a.url && (a.type || '').startsWith('image/'));
        }

        function renderChatGallerySlide() {
            const img = document.getElementById('chat-gallery-image');
            const counter = document.getElementById('chat-gallery-counter');
            const caption = document.getElementById('chat-gallery-caption');
            const prev = document.getElementById('chat-gallery-prev');
            const next = document.getElementById('chat-gallery-next');
            if (!img || !chatGalleryImages.length) return;
            const item = chatGalleryImages[chatGalleryIndex];
            img.src = item.url;
            img.alt = item.caption;
            const multi = chatGalleryImages.length > 1;
            if (counter) {
                counter.textContent = `${chatGalleryIndex + 1} / ${chatGalleryImages.length}`;
                counter.classList.toggle('hidden', !multi);
            }
            if (caption) caption.textContent = item.caption;
            if (prev) {
                prev.classList.toggle('hidden', !multi);
                prev.disabled = chatGalleryIndex <= 0;
            }
            if (next) {
                next.classList.toggle('hidden', !multi);
                next.disabled = chatGalleryIndex >= chatGalleryImages.length - 1;
            }
        }

        function openChatImageGallery(messageId, imageIndex = 0) {
            const msg = currentConvMessages[messageId];
            if (!msg) return;
            const images = getMessageImageAttachments(msg).map((a, i) => ({
                url: a.url,
                caption: a.name || msg.senderName || 'Image',
                fileName: a.name || `chat-image-${i + 1}.png`
            }));
            if (!images.length) return;
            chatGalleryImages = images;
            chatGalleryIndex = Math.max(0, Math.min(imageIndex, images.length - 1));
            renderChatGallerySlide();
            document.getElementById('chatImageGalleryModal')?.showModal();
        }

        function closeChatImageGallery() {
            document.getElementById('chatImageGalleryModal')?.close();
        }

        function stepChatImageGallery(delta) {
            if (chatGalleryImages.length <= 1) return;
            chatGalleryIndex = Math.max(0, Math.min(chatGalleryImages.length - 1, chatGalleryIndex + delta));
            renderChatGallerySlide();
        }

        function downloadChatGalleryImage() {
            const item = chatGalleryImages[chatGalleryIndex];
            if (!item?.url) return;
            const link = document.createElement('a');
            link.href = item.url;
            link.download = item.fileName || 'chat-image.png';
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast('Download started', 'success');
        }

        function renderMessages(messages) {
            currentConvMessages = messages || {};
            const area = document.getElementById('messages-area');
            const rows = Object.entries(messages).sort((a, b) => (a[1].timestamp || 0) - (b[1].timestamp || 0));
            if (!rows.length) {
                area.innerHTML = `<p class="text-center text-xs text-slate-400 italic py-6">No messages yet.</p>`;
                return;
            }
            area.innerHTML = '';
            rows.forEach(([id, msg]) => appendMessage(id, msg));
            scrollChatToBottom();
        }

        function appendMessage(id, msg) {
            const area = document.getElementById('messages-area');
            const isMe = msg.senderEmail === currentUser.email;
            const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const edited = msg.editedAt && !msg.unsent ? ' · edited' : '';
            const text = msg.unsent ? 'This message was unsent' : linkify(escapeHtml(msg.text || ''), isMe);
            const reactions = msg.reactions || {};
            
            let attachmentHtml = '';
            if (!msg.unsent) {
                const allAttachments = normalizeMessageAttachments(msg);
                const imageAttachments = getMessageImageAttachments(msg);
                const fileAttachments = allAttachments.filter(a => !(a.type || '').startsWith('image/'));

                if (imageAttachments.length) {
                    const gridClass = imageAttachments.length > 1
                        ? 'grid grid-cols-2 gap-1.5 max-w-[280px]'
                        : 'max-w-[240px]';
                    attachmentHtml += `<div class="${text ? 'mb-2' : ''} ${gridClass}">` +
                        imageAttachments.map((a, i) => `
                            <img src="${a.url}" onclick="openChatImageGallery('${id}', ${i})"
                                class="w-full rounded-xl cursor-pointer hover:opacity-90 transition-opacity object-cover ${imageAttachments.length > 1 ? 'max-h-32' : 'max-h-60'}"
                                alt="${escapeHtml(a.name || 'Attached image')}" role="button" tabindex="0">`
                        ).join('') + `</div>`;
                }

                fileAttachments.forEach(a => {
                    const iconColor = isMe ? 'text-indigo-100' : 'text-slate-400';
                    const bgClass = isMe ? 'bg-indigo-500/50 hover:bg-indigo-500/70 border-indigo-400/50' : 'bg-slate-50 hover:bg-slate-100 border-slate-200';
                    attachmentHtml += `<div class="${text ? 'mb-2' : ''} mt-1"><a href="${a.url}" download="${escapeHtml(a.name || 'file')}" class="inline-flex items-center gap-2 p-2.5 ${bgClass} rounded-xl transition-colors border"><iconify-icon icon="solar:file-download-bold" width="20" class="${iconColor}"></iconify-icon><span class="text-xs font-bold underline truncate max-w-[150px]">${escapeHtml(a.name || 'Download File')}</span></a></div>`;
                });
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
                            ${text ? `<div class="whitespace-pre-wrap break-words">${text}</div>` : ''}
                        </div>
                        <div class="flex items-center gap-1 shrink-0">
                                 </div>
                    </div>
                    ${reactionHtml}
                    <p class="text-[8px] text-slate-400 mt-1 font-bold ${isMe ? 'text-right mr-1' : 'ml-1'}">${time}${edited}</p>
                </div>`;
            area.appendChild(div);
        }

        function escapeHtml(value) {
            return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
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
            if (!msg || msg.senderEmail !== currentUser.email || msg.unsent) return;
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
            if (!msg || msg.senderEmail !== currentUser.email) return;
            await remove(ref(db, `worksync/messages/${activeConvId}/${id}`));
            toast('Message deleted', 'success');
        }

        async function unsendMessage(id) {
            if (!activeConvId || !confirm('Unsend this message for everyone?')) return;
            const snap = await get(ref(db, `worksync/messages/${activeConvId}/${id}`));
            const msg = snap.val();
            if (!msg || msg.senderEmail !== currentUser.email || msg.unsent) return;
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
            const files = Array.from(e.dataTransfer.files || []);
            for (const file of files) {
                await processChatAttachment(file, true);
            }
            renderStagedAttachmentsPreview();
        }

        async function handleMsgPaste(event) {
            const clipboardData = event.clipboardData || window.clipboardData;
            if (!clipboardData) return;
            
            const items = clipboardData.items;
            let imageFound = false;
            
            if (items) {
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    if (item.type.indexOf('image') !== -1) {
                        const file = item.getAsFile();
                        if (file) {
                            event.preventDefault();
                            await processChatAttachment(file, true);
                            imageFound = true;
                        }
                    }
                }
            }
            
            if (imageFound) {
                renderStagedAttachmentsPreview();
                return;
            }
            
            const files = Array.from(clipboardData.files || []);
            if (files.length > 0) {
                event.preventDefault();
                for (const file of files) {
                    await processChatAttachment(file, true);
                }
                renderStagedAttachmentsPreview();
            }
        }

        async function uploadChatAttachment(event) {
            const files = Array.from(event.target.files || []);
            document.getElementById('chat-file-upload').value = '';
            for (const file of files) {
                await processChatAttachment(file, true);
            }
            renderStagedAttachmentsPreview();
        }

        async function processChatAttachment(file, deferPreview = false) {
            if (file.size > 10 * 1024 * 1024) {
                toast(`${file.name} skipped — must be less than 10MB`, 'error');
                return;
            }
            stagedAttachments.push(file);
            if (!deferPreview) renderStagedAttachmentsPreview();
            document.getElementById('msg-input')?.focus();
        }

        function renderStagedAttachmentsPreview() {
            const box = document.getElementById('chat-staged-attachment');
            const list = document.getElementById('staged-attachments-list');
            if (!box || !list) return;
            if (!stagedAttachments.length) {
                box.classList.add('hidden');
                list.innerHTML = '';
                return;
            }
            box.classList.remove('hidden');
            list.innerHTML = stagedAttachments.map((file, i) => {
                const isImage = file.type?.startsWith('image/');
                const preview = isImage
                    ? `<img src="${URL.createObjectURL(file)}" class="w-12 h-12 rounded-lg object-cover border border-slate-200" alt="">`
                    : `<div class="w-12 h-12 rounded-lg bg-white border border-slate-200 flex items-center justify-center"><iconify-icon icon="solar:file-bold" class="text-indigo-500" width="20"></iconify-icon></div>`;
                return `
                    <div class="relative flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1.5 pr-7">
                        ${preview}
                        <div class="min-w-0 max-w-[120px]">
                            <p class="text-[10px] font-bold text-slate-700 truncate">${escapeHtml(file.name)}</p>
                            <p class="text-[9px] text-slate-400">${(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button type="button" onclick="removeStagedAttachment(${i})" class="absolute -top-1.5 -right-1.5 p-0.5 text-slate-400 hover:text-rose-500 bg-white rounded-full shadow">
                            <iconify-icon icon="solar:close-circle-bold" width="14"></iconify-icon>
                        </button>
                    </div>`;
            }).join('');
        }

        function removeStagedAttachment(index) {
            stagedAttachments.splice(index, 1);
            renderStagedAttachmentsPreview();
        }

        function clearStagedAttachment() {
            stagedAttachments = [];
            document.getElementById('chat-staged-attachment')?.classList.add('hidden');
            document.getElementById('chat-file-upload').value = '';
            const list = document.getElementById('staged-attachments-list');
            if (list) list.innerHTML = '';
        }

        function handleMsgInput(e) {
            const input = e.target;
            input.style.height = '46px';
            const newHeight = Math.min(input.scrollHeight, 128);
            input.style.height = newHeight + 'px';

            const val = input.value;
            const cursor = input.selectionStart;
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
                input.style.height = '46px';
                const newHeight = Math.min(input.scrollHeight, 128);
                input.style.height = newHeight + 'px';
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
                if (e.shiftKey) {
                    // Let the default textarea behavior insert a newline
                } else {
                    e.preventDefault();
                    sendMessage();
                }
            }
        }

        async function sendMessage() {
            const input = document.getElementById('msg-input');
            const text = input.value.trim();
            if (!text && !stagedAttachments.length) return;
            if (!activeConvId) return;
            
            const sendBtn = document.getElementById('send-msg-btn');
            if(sendBtn) {
                sendBtn.disabled = true;
                sendBtn.innerHTML = `<iconify-icon icon="svg-spinners:ring-resize" width="21"></iconify-icon>`;
            }

            try {
                const payload = { senderEmail: currentUser.email, senderName: currentUser.name, text, timestamp: Date.now() };
                let lastMsg = text;

                if (stagedAttachments.length) {
                    const attachments = [];
                    for (const file of stagedAttachments) {
                        attachments.push({
                            url: await fileToBase64(file),
                            type: file.type || 'application/octet-stream',
                            name: file.name
                        });
                    }
                    payload.attachments = attachments;
                    if (attachments.length === 1) {
                        payload.attachmentUrl = attachments[0].url;
                        payload.attachmentType = attachments[0].type;
                        payload.attachmentName = attachments[0].name;
                    }
                    lastMsg = text || (attachments.length > 1
                        ? `📎 ${attachments.length} attachments`
                        : `📎 ${attachments[0].name}`);
                }

                await push(ref(db, `worksync/messages/${activeConvId}`), payload);
                await update(ref(db, `worksync/conversations/${activeConvId}`), { lastMessage: lastMsg, lastTimestamp: Date.now() });
                
                input.value = '';
                input.style.height = '46px';
                clearStagedAttachment();
            } catch (err) {
                toast('Failed to send message: ' + err.message, 'error');
            } finally {
                if(sendBtn) {
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
            const snap = await get(ref(db, `worksync/conversations/${convId}`));
            if (!snap.exists()) return toast('Group not found', 'error');
            const group = snap.val();
            const isCreator = group.createdBy === currentUser.email;
            if (!isAdmin() && !isCreator) return toast('Only admins or the group creator can edit this group', 'error');

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
            const convId = document.getElementById('edit-group-id').value;
            const snap = await get(ref(db, `worksync/conversations/${convId}`));
            const group = snap.val() || {};
            const isCreator = group.createdBy === currentUser.email;
            if (!isAdmin() && !isCreator) return toast('Only admins or the group creator can edit this group', 'error');
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
            const snap = await get(ref(db, `worksync/conversations/${convId}`));
            const group = snap.val() || {};
            const isCreator = group.createdBy === currentUser.email;
            if (!isAdmin() && !isCreator) return toast('Only admins or the group creator can delete this group', 'error');
            if (!confirm('Are you sure you want to delete this group permanently?')) return;
            try {
                await remove(ref(db, `worksync/conversations/${convId}`));
                await remove(ref(db, `worksync/messages/${convId}`));
                toast('Group deleted successfully', 'success');
                if (activeConvId === convId) {
                    closeChat();
                }
            } catch (err) {
                console.error('Group deletion failed:', err);
                toast('Group deletion failed: ' + err.message, 'error');
            }
        }

        // ANNOUNCEMENTS
        function getLastSeenAnnouncementAt() {
            if (!currentUser) return 0;
            return parseInt(localStorage.getItem(`worksync_last_seen_announcement_${eKey(currentUser.email)}`) || '0', 10);
        }

        function markAnnouncementsSeen(announcementsData) {
            if (!currentUser) return;
            let latest = Date.now();
            if (announcementsData) {
                latest = Math.max(0, ...Object.values(announcementsData).map(a => a.createdAt || 0));
            }
            const prev = getLastSeenAnnouncementAt();
            const next = Math.max(prev, latest);
            localStorage.setItem(`worksync_last_seen_announcement_${eKey(currentUser.email)}`, String(next));
            unreadAnnouncements = 0;
            renderAnnouncementBadge();
            const t = document.getElementById('toast');
            if (t?.classList.contains('show')) {
                t.classList.remove('show');
                if (t.hidePopover && t.matches(':popover-open')) t.hidePopover();
            }
        }

        function refreshUnreadAnnouncements(data) {
            const lastSeen = getLastSeenAnnouncementAt();
            unreadAnnouncements = Object.values(data || {}).filter(a => (a.createdAt || 0) > lastSeen).length;
            renderAnnouncementBadge();
        }

        function initAnnouncements() {
            if (!db || !currentUser) return;
            loadAnnouncements();
            watchAnnouncementNotifications();
        }

        function loadAnnouncements() {
            if (!db) return;
            if (announcementsUnsub) announcementsUnsub();
            const q = query(ref(db, 'worksync/announcements'), limitToLast(50));
            announcementsUnsub = onValue(q, snap => {
                const data = snap.val() || {};
                renderAnnouncements(data);
                if (activeView === 'announcements') markAnnouncementsSeen(data);
                else refreshUnreadAnnouncements(data);
            });
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
                                ${item.image ? `
                                <div class="mt-3">
                                    <img src="${item.image}" alt="Announcement attachment"
                                        onclick="openImagePreview(this.src, '${escapeHtml(item.title || 'Announcement')}')"
                                        class="max-h-40 rounded-xl border border-slate-200 cursor-pointer hover:opacity-95 transition-all">
                                    <p class="text-[10px] text-indigo-600 font-bold mt-1">Tap image to enlarge</p>
                                </div>` : ''}
                            </div>
                        </div>
                    </div>`;
            }).join('');
        }

        function handleAnnouncementNotificationClick(item) {
            window.focus();
            if (item?.image) {
                openImagePreview(item.image, item.title || 'Announcement');
            } else {
                switchView('announcements');
            }
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

                if ((item.createdAt || 0) <= getLastSeenAnnouncementAt()) return;

                const announceClick = () => {
                    markAnnouncementsSeen();
                    handleAnnouncementNotificationClick(item);
                };
                const imageHint = item.image ? ' — tap to view image' : '';
                toast(`Announcement: ${item.title || 'New update'}${imageHint}`, 'info', announceClick);
                if (activeView !== 'announcements') {
                    unreadAnnouncements += 1;
                    renderAnnouncementBadge();
                }
                if ('Notification' in window && Notification.permission === 'granted') {
                    const n = new Notification(item.title || 'Team announcement', { body: item.image ? (item.body || 'Tap to view the attached image') : (item.body || 'Open WorkSync to view the announcement') });
                    n.onclick = announceClick;
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

        function setReportDatePreset(preset) {
            const fromInput = document.getElementById('report-date-from');
            const toInput = document.getElementById('report-date-to');
            if (!fromInput || !toInput) return;
            const today = new Date();
            let fromDate = new Date();

            if (preset === 'today') { /* fromDate is today */ } 
            else if (preset === 'this_week') { fromDate.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); } 
            else if (preset === 'this_month') { fromDate = new Date(today.getFullYear(), today.getMonth(), 1); }
            
            const toDate = new Date(); // always end today for presets
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
            if(activeBtn) {
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
                switch(currentReportTab) {
                    case 'timing': renderTimingReport(); break;
                    case 'task': renderTaskReport(); break;
                    case 'analytics': renderAnalyticsReport(); break;
                    case 'summary': renderSummaryReport(); break;
                    case 'detailed': renderDetailedReport(); break;
                    case 'performance': renderPerformanceReport(); break;
                    case 'client': renderClientReport(); break;
                    case 'client-wide': renderClientWideReport(); break;
                    case 'client-wise-timing': renderClientWiseTimingReport(); break;
                }
            }
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
            ['timing', 'task', 'detailed', 'analytics', 'summary', 'performance', 'client', 'client-wide', 'client-wise-timing'].forEach(t => {
                document.getElementById(`report-panel-${t}`)?.classList.add('hidden');
                const tabBtn = document.getElementById(`report-tab-${t}`)
                if (tabBtn) {
                    tabBtn.classList.remove('border-2', 'border-indigo-600', 'bg-indigo-50');
                    tabBtn.classList.add('border', 'border-slate-100');
                }
            });
            currentReportTab = tab;
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
                        switch(evt.type) {
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
                        <p class="text-2xl font-black text-slate-900">${formatTime(totalTime).split(':').slice(0,2).join(':')}</p>
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
                createStatCard('Total Logged', formatTime(totalLoggedSeconds), 'solar:timer-bold', {bg: 'bg-indigo-50', text: 'text-indigo-600'}) +
                createStatCard('Productivity', `${productivityPercent}%`, 'solar:chart-bold', {bg: 'bg-emerald-50', text: 'text-emerald-600'}) +
                createStatCard('Peak Hour', peakHourLabel, 'solar:cup-star-bold', {bg: 'bg-amber-50', text: 'text-amber-600'}) +
                createStatCard('Avg. Task Time', formatTime(avgTimePerTaskSeconds), 'solar:checklist-bold', {bg: 'bg-rose-50', text: 'text-rose-600'});


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
 
            container.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    ${createStatCard('Total Logged', formatTime(totalLoggedSeconds), 'solar:timer-bold', {bg: 'bg-indigo-50', text: 'text-indigo-600'})}
                    ${createStatCard('Daily Average', formatTime(Math.floor(avgDailySeconds)), 'solar:chart-bold', {bg: 'bg-emerald-50', text: 'text-emerald-600'})}
                    ${createStatCard('Active Days', daysWithWork, 'solar:calendar-bold', {bg: 'bg-amber-50', text: 'text-amber-600'})}
                </div>
                <div class="flex items-end h-full gap-2 border-b-2 border-slate-100 pb-2 mb-8" style="height: 200px;">
                    ${summary.map(day => {
                        const height = Math.max((day.loggedSeconds / maxTime) * 100, 1);
                        return `
                        <div class="flex-1 flex flex-col items-center gap-2 group">
                            <div class="w-full bg-indigo-100 hover:bg-indigo-500 rounded-t-lg transition-all" style="height: ${height}%" title="${day.date}: ${formatTime(day.loggedSeconds)}"></div>
                            <p class="text-[10px] font-bold text-slate-400 group-hover:text-indigo-600 transition-colors">${getDayName(day.date)}</p>
                        </div>`;
                    }).join('')}
                </div>
                <div class="space-y-4">
                    <h4 class="text-xs font-bold text-slate-400 uppercase tracking-widest">Daily Breakdown</h4>
                    ${summary.filter(d => d.loggedSeconds > 0 || d.breakSeconds > 0).reverse().map(day => `
                        <div class="border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
                            <div class="flex items-center justify-between mb-3">
                                <p class="font-bold text-slate-900">${new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                                <p class="text-sm font-black text-indigo-600">${formatTime(day.loggedSeconds)}</p>
                            </div>
                            <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-[10px]">
                                <div class="bg-white rounded-xl p-2 text-center border border-slate-100">
                                    <p class="text-sky-600 font-bold">${day.taskCount}</p>
                                    <p class="text-slate-400">Tasks Logged</p>
                                </div>
                                <div class="bg-white rounded-xl p-2 text-center border border-slate-100">
                                    <p class="text-amber-600 font-bold">${formatTime(day.breakSeconds)}</p>
                                    <p class="text-slate-400">Breaks</p>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>`;
        }

        function exportReportsCsv() {
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
                createStatCard('Total Tasks', totalTasksOverall, 'solar:folder-with-files-bold', {bg: 'bg-indigo-50', text: 'text-indigo-600'}) +
                createStatCard('Completed', totalCompletedOverall, 'solar:check-circle-bold', {bg: 'bg-emerald-50', text: 'text-emerald-600'}) +
                createStatCard('Completion Rate', overallCompletion + '%', 'solar:chart-bold', {bg: 'bg-amber-50', text: 'text-amber-600'}) +
                createStatCard('Est. Remaining Time', formatTime(Math.round(totalPendingOverall * avgSecondsPerTask)), 'solar:clock-circle-bold', {bg: 'bg-rose-50', text: 'text-rose-600'});

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
        }

        function switchReportMainTab(tab) {
            const cTab = document.getElementById('main-tab-client');
            const tTab = document.getElementById('main-tab-task');
            const cGroup = document.getElementById('client-reports-group');
            const tGroup = document.getElementById('task-reports-group');
            if (!cTab || !tTab || !cGroup || !tGroup) return;

            if (tab === 'client') {
                cTab.className = "bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold rounded-xl px-5 py-2.5 shadow-lg shadow-indigo-100 transition-all";
                tTab.className = "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold rounded-xl px-5 py-2.5 transition-all";
                cGroup.classList.remove('hidden');
                tGroup.classList.add('hidden');
                switchReportTab('client-wide');
            } else {
                tTab.className = "bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold rounded-xl px-5 py-2.5 shadow-lg shadow-indigo-100 transition-all";
                cTab.className = "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold rounded-xl px-5 py-2.5 transition-all";
                tGroup.classList.remove('hidden');
                cGroup.classList.add('hidden');
                switchReportTab('task');
            }
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
                    ${createStatCard('Clients', totalClients, 'solar:buildings-bold', {bg: 'bg-indigo-50', text: 'text-indigo-600'})}
                    ${createStatCard('Posters / Static', totalPosters, 'solar:gallery-bold', {bg: 'bg-emerald-50', text: 'text-emerald-600'})}
                    ${createStatCard('Videos / Reels', totalVideos, 'solar:video-frame-bold', {bg: 'bg-amber-50', text: 'text-amber-600'})}
                    ${createStatCard('Total Tasks', totalTasks, 'solar:checklist-minimalistic-bold', {bg: 'bg-rose-50', text: 'text-rose-600'})}
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

        function renderClientWiseTimingReport() {
            const content = document.getElementById('client-wise-timing-report-content');
            if (!content) return;

            if (!tasks.length) {
                content.innerHTML = '<div class="flex flex-col items-center gap-3 py-16"><iconify-icon icon="svg-spinners:ring-resize" width="32" class="text-indigo-400"></iconify-icon><p class="text-xs text-slate-400">Loading tasks...</p></div>';
                return;
            }

            const fromTs = reportDateFrom ? new Date(reportDateFrom).getTime() : 0;
            const toTs = reportDateTo ? new Date(reportDateTo).getTime() + 86400000 : Infinity;

            // Filter time logs by date range
            let periodTimeLogs = allTimeLogs.filter(log => (log.endTime || log.startTime || 0) >= fromTs && (log.endTime || log.startTime || 0) < toTs);
            if (reportSelectedUser !== 'all') {
                periodTimeLogs = periodTimeLogs.filter(log => log.userId === reportSelectedUser);
            }

            if (!periodTimeLogs.length) {
                content.innerHTML = '<div class="text-center py-16"><iconify-icon icon="solar:clock-circle-bold" width="48" class="text-slate-300 mb-3"></iconify-icon><p class="text-xs text-slate-400">No time logs found for the selected period.</p></div>';
                return;
            }

            // Build task-to-client lookup from tasks
            const taskClientMap = {};
            tasks.forEach(t => { if (t.client) taskClientMap[t.id] = t.client; });

            // Aggregate: { assignee: { client: totalSeconds } }
            const assigneeClientTime = {};
            let grandTotalSeconds = 0;
            const allClients = new Set();
            const allAssignees = new Set();

            periodTimeLogs.forEach(log => {
                const client = log.client || taskClientMap[log.taskId] || 'Other';
                const assignee = log.userName || log.userId || 'Unknown';
                const seconds = log.durationSeconds || 0;
                if (seconds <= 0) return;

                if (!assigneeClientTime[assignee]) assigneeClientTime[assignee] = {};
                if (!assigneeClientTime[assignee][client]) assigneeClientTime[assignee][client] = 0;
                assigneeClientTime[assignee][client] += seconds;
                grandTotalSeconds += seconds;
                allClients.add(client);
                allAssignees.add(assignee);
            });

            const sortedClients = [...allClients].sort();
            const sortedAssignees = Object.entries(assigneeClientTime)
                .map(([name, clients]) => ({ name, clients, total: Object.values(clients).reduce((s, v) => s + v, 0) }))
                .sort((a, b) => b.total - a.total);

            // Client totals
            const clientTotals = {};
            sortedClients.forEach(c => { clientTotals[c] = 0; });
            sortedAssignees.forEach(a => {
                Object.entries(a.clients).forEach(([c, s]) => { clientTotals[c] = (clientTotals[c] || 0) + s; });
            });

            // Top clients by time
            const topClients = Object.entries(clientTotals).sort((a, b) => b[1] - a[1]);

            content.innerHTML = `
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    ${createStatCard('Team Members', allAssignees.size, 'solar:users-group-rounded-bold', {bg: 'bg-indigo-50', text: 'text-indigo-600'})}
                    ${createStatCard('Clients', allClients.size, 'solar:buildings-bold', {bg: 'bg-emerald-50', text: 'text-emerald-600'})}
                    ${createStatCard('Total Time', formatTime(grandTotalSeconds), 'solar:clock-circle-bold', {bg: 'bg-amber-50', text: 'text-amber-600'})}
                    ${createStatCard('Avg/Member', formatTime(sortedAssignees.length > 0 ? Math.round(grandTotalSeconds / sortedAssignees.length) : 0), 'solar:chart-bold', {bg: 'bg-rose-50', text: 'text-rose-600'})}
                </div>

                <!-- Top Clients Bar -->
                ${topClients.length > 0 ? `
                <div class="mb-8 bg-slate-50/50 rounded-2xl p-6 border border-slate-100">
                    <h4 class="text-sm font-black text-slate-900 mb-4">Top Clients by Time</h4>
                    <div class="space-y-3">
                        ${topClients.slice(0, 8).map(([client, seconds]) => {
                            const pct = grandTotalSeconds > 0 ? Math.round((seconds / grandTotalSeconds) * 100) : 0;
                            return `
                            <div class="flex items-center gap-3">
                                <span class="text-xs font-bold text-slate-700 w-32 truncate shrink-0" title="${escapeHtml(client)}">${escapeHtml(client)}</span>
                                <div class="flex-1 h-5 bg-slate-200/60 rounded-full overflow-hidden">
                                    <div class="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all flex items-center justify-end pr-2" style="width:${Math.max(pct, 3)}%">
                                        ${pct >= 10 ? `<span class="text-[9px] font-bold text-white">${formatTime(seconds)}</span>` : ''}
                                    </div>
                                </div>
                                <span class="text-[10px] font-bold text-slate-500 w-10 text-right">${pct}%</span>
                            </div>`;
                        }).join('')}
                    </div>
                </div>` : ''}

                <!-- Detailed Table: Assignee x Client -->
                <div class="border border-slate-100 rounded-2xl overflow-hidden">
                    <table class="w-full text-left">
                        <thead class="bg-slate-50/50 border-b border-slate-100">
                            <tr>
                                <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest sticky left-0 bg-slate-50/50">Team Member</th>
                                ${sortedClients.map(c => `<th class="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center" title="${escapeHtml(c)}">${escapeHtml(c.length > 12 ? c.slice(0, 12) + '…' : c)}</th>`).join('')}
                                <th class="px-6 py-4 text-[10px] font-bold text-indigo-500 uppercase tracking-widest text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${sortedAssignees.map(a => `
                            <tr class="hover:bg-slate-50 transition-colors">
                                <td class="px-6 py-3 sticky left-0 bg-white">
                                    <span class="text-xs font-bold text-slate-900">${escapeHtml(a.name)}</span>
                                </td>
                                ${sortedClients.map(c => {
                                    const seconds = a.clients[c] || 0;
                                    return `<td class="px-4 py-3 text-center"><span class="text-xs font-mono ${seconds > 0 ? 'font-bold text-slate-700' : 'text-slate-200'}">${seconds > 0 ? formatTime(seconds) : '—'}</span></td>`;
                                }).join('')}
                                <td class="px-6 py-3 text-right"><span class="text-xs font-mono font-black text-indigo-600">${formatTime(a.total)}</span></td>
                            </tr>`).join('')}
                            <tr class="bg-slate-50/80 border-t-2 border-slate-200">
                                <td class="px-6 py-3 sticky left-0 bg-slate-50/80"><span class="text-xs font-black text-slate-900">Total</span></td>
                                ${sortedClients.map(c => `<td class="px-4 py-3 text-center"><span class="text-xs font-mono font-black text-slate-700">${formatTime(clientTotals[c] || 0)}</span></td>`).join('')}
                                <td class="px-6 py-3 text-right"><span class="text-xs font-mono font-black text-indigo-700">${formatTime(grandTotalSeconds)}</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
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
                const line = '========================================'; //
                const subLine = '----------------------------------------'; //
                let report = `${line}\nDAILY WORK UPDATE REPORT\n${line}\nDate: ${todayStr}\nReport: ${reportTimeLabel}\n\n`; //
                let contentAdded = false;

                sortedUsers.forEach(user => {
                    const userLogs = todayTimeLogs.filter(log => log.userId === user.email); //
                    const current = user.currentTask;

                    if (userLogs.length === 0 && !current) return;
                    contentAdded = true;

                    report += `${subLine}\n${user.name || user.email}\n${user.role || user.email || ''}\n${subLine}\n`;

                    const clientGroups = {}; //
                    const processedTaskIds = new Set();

                    userLogs.forEach(log => {
                        if (processedTaskIds.has(log.taskId)) return;
                        const task = tasks.find(t => t.id === log.taskId);
                        if (task && (task.status === 'Learnings' || task.status === 'Learning' || isMorningLearningTask(task))) return;
                        processedTaskIds.add(log.taskId);
                        const client = log.client || 'Additional Tasks';
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
                            const client = current.client || 'Additional Tasks';
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
            const q = canViewReports() ? dbRef : query(dbRef, orderByChild('userId'), equalTo(currentUser.email));

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
            if (!isAdmin()) return;

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
            if (reportSelectedUser !== 'all') {
                usersToReport = currentWorkUsers.filter(u => u.email === reportSelectedUser);
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
                const panel = document.getElementById(`hr-panel-${t}`);
                const tabBtn = document.getElementById(`hr-tab-${t}`);
                if (panel) panel.classList.add('hidden');
                if (tabBtn) {
                    tabBtn.classList.remove('border-2', 'border-indigo-600', 'border-violet-600');
                    tabBtn.classList.add('border', 'border-slate-100');
                }
            });
            document.getElementById(`hr-panel-${tab}`).classList.remove('hidden');
            const activeTabBtn = document.getElementById(`hr-tab-${tab}`);
            if (activeTabBtn) {
                activeTabBtn.classList.add('border-2', tab === 'calendar' ? 'border-violet-600' : 'border-indigo-600');
                activeTabBtn.classList.remove('border', 'border-slate-100');
            }
            
            if (tab === 'apply') populateSaturdays();
            else if (tab === 'my') loadMyRequests();
            else if (tab === 'approvals') loadApprovals();
            else if (tab === 'calendar') renderLeaveCalendar();
        }

        // ═══ LEAVE CALENDAR ═══
        let leaveCalYear = new Date().getFullYear();
        let leaveCalMonth = new Date().getMonth();
        let leaveCalRequestsUnsub = null;

        function leaveCalNav(dir) {
            if (dir === 0) {
                leaveCalYear = new Date().getFullYear();
                leaveCalMonth = new Date().getMonth();
            } else {
                leaveCalMonth += dir;
                if (leaveCalMonth > 11) { leaveCalMonth = 0; leaveCalYear++; }
                if (leaveCalMonth < 0)  { leaveCalMonth = 11; leaveCalYear--; }
            }
            renderLeaveCalendar();
        }

        // User avatar colors — cycles through a palette per user
        const AVATAR_PALETTE = ['bg-indigo-500','bg-violet-500','bg-rose-500','bg-amber-500','bg-emerald-500','bg-sky-500','bg-pink-500','bg-teal-500','bg-orange-500','bg-cyan-500'];
        const _avatarColorMap = {};
        let _avatarColorIdx = 0;
        function avatarColor(email) {
            if (!_avatarColorMap[email]) {
                _avatarColorMap[email] = AVATAR_PALETTE[_avatarColorIdx % AVATAR_PALETTE.length];
                _avatarColorIdx++;
            }
            return _avatarColorMap[email];
        }
        function initials(name) {
            if (!name) return '?';
            const parts = name.trim().split(/\s+/);
            return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase();
        }

        function renderLeaveCalendar() {
            const grid = document.getElementById('leave-cal-grid');
            const label = document.getElementById('leave-cal-month-label');
            if (!grid || !label) return;

            const monthName = new Date(leaveCalYear, leaveCalMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            label.textContent = monthName;
            grid.innerHTML = `<div class="col-span-7 py-10 text-center text-xs text-slate-400"><iconify-icon icon="solar:loading-bold" width="24" class="animate-spin"></iconify-icon><p class="mt-2">Loading leaves...</p></div>`;

            if (leaveCalRequestsUnsub) leaveCalRequestsUnsub();

            leaveCalRequestsUnsub = onValue(ref(db, 'worksync/requests'), snap => {
                const data = snap.val() || {};
                const allRequests = Object.values(data).filter(r => r.type === 'leave' || r.type === 'saturday');

                // Build a map: dateStr → [{userName, email, leaveType, status}]
                const dateMap = {};
                const firstDay = new Date(leaveCalYear, leaveCalMonth, 1);
                const lastDay = new Date(leaveCalYear, leaveCalMonth + 1, 0);

                allRequests.forEach(r => {
                    if (r.status === 'rejected') return;

                    if (r.type === 'saturday') {
                        if (!r.date) return;
                        const ds = r.date;
                        if (!dateMap[ds]) dateMap[ds] = [];
                        dateMap[ds].push({
                            userName: r.userName || r.userId,
                            email: r.userId,
                            leaveType: 'Saturday Off',
                            status: r.status
                        });
                    } else if (r.type === 'leave') {
                        if (!r.fromDate || !r.toDate) return;
                        let cur = new Date(r.fromDate + 'T00:00:00Z');
                        const end = new Date(r.toDate + 'T00:00:00Z');
                        while (cur <= end) {
                            const ds = cur.toISOString().slice(0, 10);
                            if (!dateMap[ds]) dateMap[ds] = [];
                            dateMap[ds].push({
                                userName: r.userName || r.userId,
                                email: r.userId,
                                leaveType: r.leaveType || 'Leave',
                                status: r.status
                            });
                            cur.setUTCDate(cur.getUTCDate() + 1);
                        }
                    }
                });

                // Build calendar grid cells
                const today = new Date();
                let cells = '';

                // Leading blank cells for start day-of-week
                const startDow = firstDay.getDay(); // 0=Sun
                for (let i = 0; i < startDow; i++) {
                    cells += `<div class="min-h-[90px] bg-slate-50/50 p-2"></div>`;
                }

                // Day cells
                for (let d = 1; d <= lastDay.getDate(); d++) {
                    const dt = new Date(leaveCalYear, leaveCalMonth, d);
                    const ds = `${leaveCalYear}-${String(leaveCalMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const isToday = dt.getFullYear() === today.getFullYear() &&
                                    dt.getMonth() === today.getMonth() &&
                                    dt.getDate() === today.getDate();
                    const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;
                    const leaves = dateMap[ds] || [];

                    const chips = leaves.map(l => {
                        const isApproved = l.status === 'approved';
                        const bgClass = isApproved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200';
                        const displayName = l.userName.split(' ')[0]; // Show first name

                        return `<span class="relative group/chip block w-full">
                            <span class="block text-[9px] font-bold px-1.5 py-0.5 rounded border ${bgClass} truncate cursor-default select-none text-center" title="${escapeHtml(l.userName)} — ${escapeHtml(l.leaveType)} (${l.status})">
                                ${escapeHtml(displayName)}
                            </span>
                            <span class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-max max-w-[120px] rounded-lg bg-slate-900 text-white text-[9px] font-bold px-2 py-1 opacity-0 group-hover/chip:opacity-100 transition-opacity z-10 text-center leading-tight">
                                ${escapeHtml(l.userName)}<br><span class="text-slate-300 font-normal">${escapeHtml(l.leaveType)}</span>
                            </span>
                        </span>`;
                    }).join('');

                    cells += `<div class="min-h-[90px] p-2 ${isWeekend ? 'bg-slate-50/70' : 'bg-white'} hover:bg-slate-50 transition-colors ${isToday ? 'bg-indigo-50/40' : ''}">
                        <p class="text-xs font-black mb-1.5 ${isToday ? 'text-indigo-600 bg-indigo-100 w-6 h-6 rounded-full flex items-center justify-center' : (isWeekend ? 'text-slate-400' : 'text-slate-700')}">${d}</p>
                        <div class="flex flex-col gap-1">${chips}</div>
                        ${leaves.length > 0 ? `<p class="text-[8px] text-slate-400 mt-1 font-medium">${leaves.length} on leave</p>` : ''}
                    </div>`;
                }

                // Trailing blank cells to complete the week row
                const endDow = lastDay.getDay();
                for (let i = endDow + 1; i < 7; i++) {
                    cells += `<div class="min-h-[90px] bg-slate-50/50 p-2"></div>`;
                }

                grid.innerHTML = cells;
            }, err => {
                grid.innerHTML = `<div class="col-span-7 py-10 text-center text-xs text-rose-400">Failed to load leave data.</div>`;
            });
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
            
            const approvalChain = LEAVE_APPROVAL_CHAINS[currentUser.email.toLowerCase()] || ['nanjil@vilpower.com'];
            const approvals = approvalChain.map((approverEmail, index) => ({
                approverEmail,
                approverName: knownUserByEmail(approverEmail)?.name || approverEmail,
                step: index + 1,
                status: 'pending',
                approvedAt: null,
                note: null
            }));

            if (type === 'leave') {
                const duration = document.getElementById('leave-duration').value;
                const fromDate = document.getElementById('leave-from').value;
                const toDate = isHalfDayLeave() ? fromDate : document.getElementById('leave-to').value;
                if (!fromDate || !toDate) return toast('Select leave date', 'error');
                if (new Date(toDate) < new Date(fromDate)) return toast('To Date cannot be before From Date', 'error');
                
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
                req = { 
                    ...base, 
                    type, 
                    date: document.getElementById('perm-date').value, 
                    fromTime: document.getElementById('perm-from').value, 
                    toTime: document.getElementById('perm-to').value, 
                    reason: document.getElementById('req-reason').value,
                    approvalChain,
                    approvals,
                    currentApprovalStep: 1
                };
            } else {
                if (!selectedSaturday) return toast('Select a Saturday', 'error');
                req = { 
                    ...base, 
                    type, 
                    date: selectedSaturday,
                    approvalChain,
                    approvals,
                    currentApprovalStep: 1
                };
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
                    const canEditDelete = r.status === 'pending' && (r.currentApprovalStep === 1 || !r.currentApprovalStep);
                    
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
            if (!canApproveLeaves()) return;
            const el = document.getElementById('approvals-list');
            if (!el) return;
            onValue(ref(db, 'worksync/requests'), snap => {
                const list = Object.entries(snap.val() || {}).sort((a, b) => b[1].submittedAt - a[1].submittedAt);
                const filterVal = document.getElementById('approval-filter')?.value || 'pending';
                const myEmail = currentUser.email.toLowerCase();

                const pendingForMe = list.filter(([, r]) => {
                    if (filterVal === 'pending') return isRequestPendingForApprover(r, myEmail);
                    return isUserInLeaveApprovalChain(resolveLeaveRequesterEmail(r), myEmail);
                });
                
                if (pendingForMe.length === 0) {
                    el.innerHTML = `<p class="p-10 text-center text-xs text-slate-400 italic">No pending approvals for you.</p>`;
                    return;
                }
                
                el.innerHTML = pendingForMe.map(([id, r]) => {
                    let approvalChainLabel = '<span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">Direct Admin Approval</span>';
                    
                    const chainApprovals = buildApprovalsFromChain(resolveLeaveRequesterEmail(r), r.approvals);
                    approvalChainLabel = chainApprovals.map(a => {
                        const cls = a.status === 'approved' ? 'bg-emerald-50 text-emerald-600'
                            : (a.status === 'rejected' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600');
                        return `<span class="text-[9px] font-bold px-1.5 py-0.5 rounded ${cls}">${a.approverName.split(' ')[0]}</span>`;
                    }).join(' → ');
                    
                    const periodLabel = r.type === 'permission' ? 'When' : (r.type === 'leave' ? 'Leave period' : 'Date');
                    return `
                        <div class="flex items-start justify-between gap-4 p-5 hover:bg-slate-50 transition-all border-b border-slate-50 last:border-0">
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 mb-3">
                                    <div class="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 font-black text-xs shrink-0">${r.userName.charAt(0)}</div>
                                    <div class="min-w-0">
                                        <p class="text-sm font-bold text-slate-900">${r.userName} — ${reqLabel(r)}</p>
                                    </div>
                                </div>
                                <div class="space-y-2 ml-10 sm:ml-0 sm:pl-10">
                                    <div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0">Submitted</span>
                                        <span class="text-xs font-bold text-slate-800">${formatHrDateTime(r.submittedAt)}</span>
                                    </div>
                                    <div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0">${periodLabel}</span>
                                        <span class="text-xs font-bold text-indigo-700">${formatHrRequestPeriod(r)}</span>
                                    </div>
                                </div>
                                <div class="text-[9px] text-slate-500 mt-2 flex flex-wrap items-center gap-1">${approvalChainLabel}</div>
                            </div>
                            <button onclick="openApproveModal('${id}')" class="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold px-4 py-2 rounded-xl shadow-lg shadow-indigo-100 transition-all whitespace-nowrap shrink-0">Review</button>
                        </div>`;
                }).join('');
            });
        }

        function loadHrBadge() {
            const badge = document.getElementById('hr-badge');
            if (!badge || !canApproveLeaves()) {
                badge?.classList.add('hidden');
                return;
            }
            onValue(ref(db, 'worksync/requests'), snap => {
                const list = Object.values(snap.val() || {});
                const count = list.filter(r => isRequestPendingForApprover(r, currentUser.email)).length;
                badge.textContent = count;
                badge.classList.toggle('hidden', count === 0);
            });
        }

        function openApproveModal(id) {
            get(ref(db, `worksync/requests/${id}`)).then(snap => {
                const r = snap.val();
                if (!r) return toast('Request not found', 'error');
                if (!isRequestPendingForApprover(r, currentUser.email)) {
                    return toast('This request is not waiting for your approval', 'error');
                }
                pendingApprovalReq = { id, ...r };
                
                const chainApprovals = buildApprovalsFromChain(resolveLeaveRequesterEmail(r), r.approvals);

                // Build approval chain status display
                let approvalChainHtml = '';
                if (chainApprovals.length) {
                    approvalChainHtml = `
                        <div class="mt-4 p-4 bg-slate-50 rounded-xl">
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Approval Chain</p>
                            <div class="space-y-2">
                                ${chainApprovals.map((approval, idx) => `
                                    <div class="flex items-center gap-3">
                                        <div class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${approval.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}">
                                            ${approval.status === 'approved' ? '✓' : approval.step}
                                        </div>
                                        <div class="flex-1">
                                            <p class="text-xs font-bold text-slate-900">${approval.approverName}</p>
                                            <p class="text-[9px] text-slate-500">${approval.status === 'approved' ? `Approved ${formatHrDateTime(approval.approvedAt)}` : 'Pending'}</p>
                                        </div>
                                        <span class="text-[9px] font-bold px-2 py-1 rounded ${approval.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}">${approval.status}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }
                
                const periodLabel = r.type === 'permission' ? 'Date & time' : (r.type === 'leave' ? 'Leave period' : 'Date');
                document.getElementById('approve-modal-detail').innerHTML = `
                    <p class="mb-3 font-black text-slate-900">User: ${escapeHtml(r.userName)} <span class="text-slate-500 font-bold">(${escapeHtml(r.userRole || '')})</span></p>
                    <p class="mb-3 text-slate-700"><span class="font-black text-slate-500">Request:</span> ${escapeHtml(reqLabel(r))}</p>
                    <div class="grid grid-cols-1 gap-2 mb-3">
                        <div class="bg-white rounded-xl border border-slate-200 px-4 py-3">
                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Submitted</p>
                            <p class="text-sm font-bold text-slate-900">${formatHrDateTime(r.submittedAt)}</p>
                        </div>
                        <div class="bg-white rounded-xl border border-slate-200 px-4 py-3">
                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">${periodLabel}</p>
                            <p class="text-sm font-bold text-indigo-700">${formatHrRequestPeriod(r)}</p>
                        </div>
                    </div>
                    <p class="mb-4 text-slate-700"><span class="font-black text-slate-500">Reason:</span> ${escapeHtml(r.reason || 'N/A')}</p>
                    ${approvalChainHtml}`;
                document.getElementById('approve-note').value = '';
                document.getElementById('approveModal').showModal();
            });
        }

        function closeApproveModal() {
            pendingApprovalReq = null;
            const note = document.getElementById('approve-note');
            if (note) note.value = '';
            document.getElementById('approveModal')?.close();
        }

        async function submitApproval(decision) {
            const note = document.getElementById('approve-note').value;
            const req = pendingApprovalReq;
            
            let updateData = {
                reviewedBy: currentUser.email,
                reviewNote: note,
                reviewedAt: Date.now()
            };
            
            if (!isRequestPendingForApprover(req, currentUser.email)) {
                return toast('This request is not awaiting your approval', 'error');
            }
            const requesterEmail = resolveLeaveRequesterEmail(req);
            const approvals = buildApprovalsFromChain(requesterEmail, req.approvals);
            const approvedCount = approvals.filter(a => a.status === 'approved').length;
            const currentStep = approvals[approvedCount];
            if (!currentStep || currentStep.approverEmail?.toLowerCase() !== currentUser.email.toLowerCase()) {
                return toast('This request is not awaiting your approval', 'error');
            }
            currentStep.status = decision === 'approved' ? 'approved' : 'rejected';
            currentStep.approvedAt = Date.now();
            currentStep.note = note;

            updateData.approvals = approvals;
            updateData.approvalChain = getLeaveApprovalChainForRequester(requesterEmail);
            updateData.currentApprovalStep = approvedCount + 1;

            if (decision === 'rejected') {
                updateData.status = 'rejected';
            } else if (approvals.every(a => a.status === 'approved')) {
                updateData.status = 'approved';
            } else {
                updateData.status = 'pending';
            }
            
            await update(ref(db, `worksync/requests/${req.id}`), updateData);
            document.getElementById('approveModal').close();
            toast(`Request ${decision === 'approved' ? 'approved' : 'rejected'}`, 'success');

            if (req.userId) {
                const nanjilEmail = 'nanjil@vilpower.com';
                const approverIsNanjil = currentUser.email.toLowerCase() === nanjilEmail;
                if (updateData.status === 'approved' || updateData.status === 'rejected') {
                    await notifyLeaveApplicant(req, updateData.status, note);
                } else if (decision === 'approved' && approverIsNanjil) {
                    await notifyLeaveApplicant(req, 'progress', note, 'Your request has been approved by Nanjil and is moving to the next step if required.');
                }
            }
        }

        async function notifyLeaveApplicant(req, status, note, customBody) {
            if (!db || !req?.userId) return;
            const label = reqLabel(req);
            const detail = reqDetail(req);
            let title = 'Request Update';
            let body = customBody;
            if (!body) {
                if (status === 'approved') {
                    title = 'Request Approved';
                    body = `Your request (${label}, ${detail}) has been fully approved.`;
                } else if (status === 'rejected') {
                    title = 'Request Rejected';
                    body = `Your request (${label}, ${detail}) was rejected by ${currentUser.name}.${note ? ' Note: ' + note : ''}`;
                } else {
                    body = `Update on your request (${label}, ${detail}).`;
                }
            }
            await push(ref(db, 'worksync/task_notifications'), {
                title,
                body,
                timestamp: Date.now(),
                readBy: {},
                notifyEmails: [req.userId]
            });
        }

        function reqLabel(r) { return r.type === 'leave' ? `${r.leaveType}${r.leaveDurationLabel && r.leaveDurationLabel !== 'Full Day' ? ' - ' + r.leaveDurationLabel : ''}` : (r.type === 'permission' ? 'Permission' : 'Saturday'); }

        function formatHrDateTime(ts) {
            if (!ts) return '—';
            return new Date(ts).toLocaleString([], {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        }

        function formatHrDateOnly(dateStr) {
            if (!dateStr) return '—';
            const d = new Date(`${dateStr}T12:00:00`);
            if (Number.isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
        }

        function formatHrTimeOnly(timeStr) {
            if (!timeStr) return '';
            const parts = String(timeStr).split(':').map(Number);
            const d = new Date();
            d.setHours(parts[0] || 0, parts[1] || 0, 0, 0);
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        }

        function formatHrRequestPeriod(r) {
            if (r.type === 'leave') {
                const from = formatHrDateOnly(r.fromDate);
                const to = formatHrDateOnly(r.toDate);
                const range = r.fromDate === r.toDate ? from : `${from} → ${to}`;
                return r.leaveDurationLabel && r.leaveDurationLabel !== 'Full Day'
                    ? `${range} · ${r.leaveDurationLabel}`
                    : range;
            }
            if (r.type === 'permission') {
                const from = formatHrTimeOnly(r.fromTime);
                const to = formatHrTimeOnly(r.toTime);
                return `${formatHrDateOnly(r.date)} · ${from} – ${to}`;
            }
            return formatHrDateOnly(r.date);
        }

        function reqDetail(r) {
            return formatHrRequestPeriod(r);
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
                const canDelete = r.status === 'pending' && (r.currentApprovalStep === 1 || !r.currentApprovalStep);
                
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
            const internalDueEl = document.getElementById('mt-internal-duedate');
            if (internalDueEl) internalDueEl.value = '';
            const internalDescEl = document.getElementById('mt-internal-description');
            if (internalDescEl) internalDescEl.value = '';
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
            populateClientSelect(document.getElementById('mt-client'));
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

        async function submitManualTask() {
            const platform = document.getElementById('mt-platform').value;
            const taskType = document.getElementById('mt-task-type').value;
            const title = document.getElementById('mt-title').value.trim();
            const client = document.getElementById('mt-client').value;
            const status = taskType === 'internal' ? document.getElementById('mt-internal-status').value : document.getElementById('mt-status').value;
            const priority = taskType === 'internal' ? document.getElementById('mt-internal-priority').value : document.getElementById('mt-priority').value;
            const assigneeEmail = document.getElementById('mt-assignee').value;
            const assigneeNameVal = assigneeEmail ? allUsersMap.get(assigneeEmail.toLowerCase())?.name || assigneeEmail : 'Unassigned';
            const duedate = taskType === 'internal'
                ? (document.getElementById('mt-internal-duedate')?.value || null)
                : null;
            const description = taskType === 'internal'
                ? (document.getElementById('mt-internal-description')?.value.trim() || '')
                : '';
            
            if (!title) return toast('Enter a task title', 'error');

            const btn = document.getElementById('mt-submit-btn');
            const originalText = btn.textContent;
            btn.disabled = true;
            btn.innerHTML = `<iconify-icon icon="svg-spinners:ring-resize" width="18"></iconify-icon> Creating...`;

            try {
                if (platform === 'jira') {
                    const url = `https://${JIRA.domain}/rest/api/3/issue`;
                    const payload = {
                        fields: {
                            project: { key: JIRA.projectKey },
                            summary: title,
                            issuetype: { name: 'Task' },
                            labels: client ? [client.replace(/\s+/g, '_')] : []
                        }
                    };
                    
                    if (assigneeEmail) {
                        const accountId = await findJiraAccountId({email: assigneeEmail, name: assigneeNameVal});
                        if (accountId) {
                            payload.fields.assignee = { id: accountId };
                        }
                    }

                    const res = await jiraRequest(url, 'post', payload);
                    if (res.success && (res.data?.key || res.key)) {
                        toast(`Jira task ${(res.data?.key || res.key)} created!`, 'success');
                        await syncTasks(true); // Auto-sync to show the new task in the list
                    } else {
                        throw new Error(jiraErrorMessage(res));
                    }
                } else {
                    if (!client) { toast('Select a client', 'error'); btn.disabled = false; btn.textContent = originalText; return; }
                    const taskId = 'M-' + Date.now();
                    const task = {
                        id: taskId,
                        desc: title,
                        client,
                        status,
                        priority,
                        assignee: assigneeNameVal,
                        assigneeEmail: assigneeEmail,
                        manual: true,
                        taskType,
                        userId: assigneeEmail || currentUser.email,
                        createdAt: Date.now(),
                        ...(duedate ? { duedate } : {}),
                        ...(description ? { description } : {})
                    };
                    await set(ref(db, `worksync/manual_tasks/${eKey(assigneeEmail || currentUser.email)}/${taskId}`), task);
                    tasks = mergeTasksById([task, ...tasks]);
                    renderTasks(); renderInternalTasks(); updateStats();
                    toast('Task added to WorkSync', 'success');
                }
                document.getElementById('addTaskModal').close();
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
            document.getElementById('et-duedate').value = task.duedate ? String(task.duedate).slice(0, 10) : '';
            const descWrap = document.getElementById('et-description-wrap');
            const descInput = document.getElementById('et-description');
            if (descWrap) descWrap.classList.toggle('hidden', !isInternalTask(task));
            if (descInput) descInput.value = task.description || task.notes || '';

            // Populate Client dropdown
            const clientSelect = document.getElementById('et-client');
            populateClientSelect(clientSelect, task.client || '');

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

            const deleteBtn = document.querySelector('#editTaskModal button[onclick="deleteManualTask()"]');
            if (deleteBtn) deleteBtn.classList.toggle('hidden', isMorningLearningTask(task));

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
                duedate: document.getElementById('et-duedate').value || null,
                assignee: newAssignee,
                assigneeEmail: newAssigneeEmail,
            };
            if (isInternalTask(originalTask)) {
                updates.description = document.getElementById('et-description')?.value.trim() || '';
            }

            if (isMorningLearningTask(originalTask) && (updates.status === 'Completed' || isInternalDone(updates.status))) {
                originalTask.description = updates.description;
                await completeMorningLearningTask({ ...originalTask, ...updates });
                document.getElementById('editTaskModal').close();
                return;
            }

            Object.assign(tasks[taskIndex], updates);

            // If assignee changes for a manual task, we must move it in Firebase
            if (originalTask.manual && originalTask.userId !== newAssigneeEmail) {
                tasks[taskIndex].userId = newAssigneeEmail; // Update userId on the task object
                await remove(ref(db, `worksync/manual_tasks/${eKey(originalTask.userId)}/${taskId}`));
                await set(ref(db, `worksync/manual_tasks/${eKey(newAssigneeEmail)}/${taskId}`), tasks[taskIndex]);
            } else if (originalTask.manual) {
                await update(ref(db, `worksync/manual_tasks/${eKey(originalTask.userId)}/${taskId}`), updates);
            }

            if (newAssigneeEmail && newAssigneeEmail !== originalTask.assigneeEmail) {
                await checkAndCreateThumbnailSubTask(tasks[taskIndex], newAssigneeEmail);
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
            if (isMorningLearningTask(task)) return toast('Recurring morning learning tasks cannot be deleted.', 'error');

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
            const { domain, projectKey } = JIRA;
            let results = [];

            try {
                const d = await jiraRequest(`https://${domain}/rest/api/3/myself`);
                const jd = d.data || d;
                if (jd.accountId || jd.displayName) results.push('✓ Jira Auth: OK (' + (jd.displayName || jd.emailAddress) + ')');
                else results.push('✗ Jira Auth: FAILED (' + (jd.errorMessages?.join('; ') || JSON.stringify(jd).slice(0, 120)) + ')');
            } catch (e) { results.push('✗ Jira Auth: ERROR (' + e.message + ')'); }

            try {
                const d = await jiraRequest(`https://${domain}/rest/api/3/project/${projectKey}`);
                const pd = d.data || d;
                if (pd.key || pd.name) results.push('✓ Project "' + projectKey + '": Found (' + pd.name + ')');
                else results.push('✗ Project "' + projectKey + '": NOT FOUND');
            } catch (e) { results.push('✗ Project Check: ERROR (' + e.message + ')'); }

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
                const targetTransition = transitions.find(t => t.name.toLowerCase() === newStatusName.toLowerCase());

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
            tt.textContent = type.toUpperCase(); tm.textContent = msg;
            ti.className = `w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${type === 'success' ? 'bg-emerald-100 text-emerald-600' : (type === 'error' ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600')}`;
            ti.innerHTML = `<iconify-icon icon="${type === 'success' ? 'solar:check-circle-bold' : (type === 'error' ? 'solar:danger-circle-bold' : 'solar:info-circle-bold')}" width="20"></iconify-icon>`;
            
            t.onclick = onClick;
            t.style.cursor = onClick ? 'pointer' : 'default';

            clearTimeout(toastTimeout);
            clearTimeout(toastHideTimeout);

            if (t.showPopover && !t.matches(':popover-open')) {
                t.showPopover();
            }
            
            requestAnimationFrame(() => t.classList.add('show'));
            
            toastTimeout = setTimeout(() => { 
                t.classList.remove('show');
                toastHideTimeout = setTimeout(() => {
                    if (!t.classList.contains('show') && t.hidePopover && t.matches(':popover-open')) t.hidePopover();
                }, 300);
            }, 3000);
        }

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
            
            const allUsers = Array.from(allUsersMap.values()).sort((a,b) => (a.name||'').localeCompare(b.name||''));
            
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
            const allClients = [...new Set([...getClientCatalog(), ...clientsFromTasks])].sort((a, b) => a.localeCompare(b));

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
            const allClients = [...new Set([...getClientCatalog(), ...clientsFromTasks])].sort((a, b) => a.localeCompare(b));

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
                .sort((a,b) => a.name.localeCompare(b.name))
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

        function getProjectPeriodRange() {
            const mode = document.getElementById('project-period-mode')?.value || 'month';
            const now = new Date();
            let start, end, label;

            if (mode === 'week') {
                const day = now.getDay();
                const diffToMon = day === 0 ? -6 : 1 - day;
                start = new Date(now);
                start.setDate(now.getDate() + diffToMon);
                start.setHours(0, 0, 0, 0);
                end = new Date(start);
                end.setDate(start.getDate() + 6);
                end.setHours(23, 59, 59, 999);
                label = `Week of ${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
            } else if (mode === 'calendar') {
                start = new Date(projectCalendarDate.getFullYear(), projectCalendarDate.getMonth(), 1);
                end = new Date(projectCalendarDate.getFullYear(), projectCalendarDate.getMonth() + 1, 0, 23, 59, 59, 999);
                label = start.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
            } else {
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                label = start.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
            }
            return { start, end, label, mode };
        }

        function taskMatchesProjectPeriod(task, range) {
            if (!task.duedate) return true;
            const d = new Date(task.duedate);
            if (Number.isNaN(d.getTime())) return true;
            d.setHours(12, 0, 0, 0);
            return d >= range.start && d <= range.end;
        }

        function onProjectPeriodModeChange() {
            const mode = document.getElementById('project-period-mode')?.value || 'month';
            const nav = document.getElementById('project-calendar-nav');
            if (nav) nav.classList.toggle('hidden', mode !== 'calendar');
            if (mode === 'calendar') updateProjectCalendarTitle();
            renderProjects();
        }

        function navigateProjectCalendar(delta) {
            if (delta === 0) projectCalendarDate = new Date();
            else projectCalendarDate.setMonth(projectCalendarDate.getMonth() + delta);
            updateProjectCalendarTitle();
            renderProjects();
        }

        function updateProjectCalendarTitle() {
            const el = document.getElementById('project-calendar-title');
            if (el) el.textContent = projectCalendarDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
        }

        async function renderProjects() {
            const container = document.getElementById('projects-grid');
            if (!container) return;

            container.innerHTML = `<div class="col-span-full text-center py-12"><p class="text-slate-400 animate-pulse">Loading projects...</p></div>`;

            const period = getProjectPeriodRange();
            const labelEl = document.getElementById('projects-period-label');
            if (labelEl) labelEl.textContent = period.label;

            const allUsers = await getAllUsers();
            const periodTasks = tasks.filter(t => taskMatchesProjectPeriod(t, period));

            const allClients = [...new Set([...getClientCatalog(), ...periodTasks.map(t => t.client).filter(Boolean)])].sort((a, b) => a.localeCompare(b));

            const projects = allClients.map(clientName => {
                const projectTasks = periodTasks.filter(t => t.client === clientName);
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

            if (canViewDailyPlanTeamAccess()) {
                document.getElementById('dp-user-filter-container').classList.remove('hidden');
                populateDpUserFilter();
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
            
            const merged = new Map();
            USERS.forEach(u => merged.set(u.email.toLowerCase(), { ...u }));
            currentWorkUsers.forEach(u => merged.set(u.email.toLowerCase(), { ...(merged.get(u.email.toLowerCase()) || {}), ...u }));
            Array.from(allUsersMap.values()).forEach(u => {
                if (u.email && u.email !== '123') merged.set(u.email.toLowerCase(), { ...(merged.get(u.email.toLowerCase()) || {}), ...u });
            });
            const usersList = [...merged.values()].sort((a,b) => (a.name||'').localeCompare(b.name||''));

            usersList.forEach(u => {
                sel.innerHTML += `<option value="${u.email}">${u.name}</option>`;
            });
            if (current && [...sel.options].some(o => o.value === current)) sel.value = current;
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

        function getDailyPlanTargetUserEmails() {
            const mergedUsers = Array.from(allUsersMap.values()).filter(u => u.email && u.email !== '123');
            if (canViewDailyPlanTeamAccess()) {
                const filterVal = document.getElementById('dp-user-filter')?.value || 'all';
                if (filterVal !== 'all') return [filterVal];
                return mergedUsers.map(u => u.email).sort((a, b) => {
                    const nameA = (allUsersMap.get(a.toLowerCase())?.name || a).toLowerCase();
                    const nameB = (allUsersMap.get(b.toLowerCase())?.name || b).toLowerCase();
                    return nameA.localeCompare(nameB);
                });
            }
            return [currentUser.email];
        }

        function getDailyPlanScopeLabel() {
            if (!canViewDailyPlanTeamAccess()) return currentUser?.name || 'My Plan';
            const filterVal = document.getElementById('dp-user-filter')?.value || 'all';
            if (filterVal === 'all') return 'All Team Members';
            const opt = document.getElementById('dp-user-filter')?.selectedOptions?.[0];
            return opt?.textContent?.trim() || filterVal;
        }

        function collectDailyPlanRowsForView() {
            const dateStr = document.getElementById('dp-date')?.value || todayIso();
            let uniquePlans = [];
            getDailyPlanTargetUserEmails().forEach(userEmail => {
                uniquePlans.push(...collectDailyPlanTasksForUser(userEmail, dateStr));
            });
            const seen = new Set();
            uniquePlans = uniquePlans.filter(pt => {
                const k = `${pt.id}-${pt.plannedForUser}`;
                if (seen.has(k)) return false;
                seen.add(k);
                return true;
            });
            if (dpFilter === 'carryover') {
                uniquePlans = uniquePlans.filter(t => t.isCarryOver);
            }
            return uniquePlans;
        }

        function buildDailyPlanTextReport() {
            const dateStr = document.getElementById('dp-date')?.value || todayIso();
            const dateLabel = new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-GB', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
            const line = '========================================';
            const subLine = '----------------------------------------';
            const filterLabel = dpFilter === 'carryover' ? 'Carry Forward Only' : 'All Tasks';
            const scopeLabel = getDailyPlanScopeLabel();
            const allRows = collectDailyPlanRowsForView();

            let report = `${line}\nDAILY PLAN CLIENT TASK REPORT\n${line}\n`;
            report += `Date: ${dateLabel}\n`;
            report += `Scope: ${scopeLabel}\n`;
            report += `Filter: ${filterLabel}\n`;
            report += `Total tasks: ${allRows.length}\n\n`;

            const clientGroups = new Map();
            allRows.forEach(task => {
                const client = (task.client || 'Unassigned Client').trim() || 'Unassigned Client';
                if (!clientGroups.has(client)) clientGroups.set(client, []);
                clientGroups.get(client).push(task);
            });

            const sortedClientGroups = [...clientGroups.entries()].sort(([a], [b]) => a.localeCompare(b));
            sortedClientGroups.forEach(([client, plans]) => {
                plans.sort((a, b) => {
                    const assigneeA = (allUsersMap.get((a.plannedForUser || '').toLowerCase())?.name || a.plannedForUser || '').toLowerCase();
                    const assigneeB = (allUsersMap.get((b.plannedForUser || '').toLowerCase())?.name || b.plannedForUser || '').toLowerCase();
                    return assigneeA.localeCompare(assigneeB) || (a.desc || '').localeCompare(b.desc || '');
                });

                report += `${subLine}\n`;
                report += `${client}\n`;
                report += `Tasks: ${plans.length}\n`;
                report += `${subLine}\n`;

                plans.forEach((task, index) => {
                    const assignee = allUsersMap.get((task.plannedForUser || '').toLowerCase())?.name || task.plannedForUser || 'Unassigned';
                    const flags = [];
                    if (task.isCarryOver) flags.push('Carry Over');
                    if (task.isAutoIncluded) flags.push('Auto');
                    const flagSuffix = flags.length ? ` [${flags.join(', ')}]` : '';
                    report += `  ${index + 1}. ${task.desc || 'Untitled'}${flagSuffix}\n`;
                    report += `     Assignee: ${assignee}\n`;
                });
                report += `\n`;
            });

            if (!sortedClientGroups.length) {
                report += `No planned tasks for this date and filter.\n`;
            }

            return report;

            const emails = getDailyPlanTargetUserEmails();
            let membersWithPlans = 0;

            emails.forEach(email => {
                let plans = collectDailyPlanTasksForUser(email, dateStr);
                if (dpFilter === 'carryover') plans = plans.filter(t => t.isCarryOver);
                if (!plans.length) return;

                membersWithPlans++;
                const user = allUsersMap.get(email.toLowerCase()) || { name: email, email, role: '' };
                const completed = plans.filter(t => isDone(t.status) || isInternalDone(t.status)).length;

                report += `${subLine}\n`;
                report += `${user.name || email}\n`;
                report += `${user.role || email}\n`;
                report += `Planned: ${plans.length} | Completed: ${completed}\n`;
                report += `${subLine}\n`;

                plans.forEach((t, index) => {
                    const flags = [];
                    if (t.isCarryOver) flags.push('Carry Over');
                    if (t.isAutoIncluded) flags.push('Auto');
                    const flagSuffix = flags.length ? ` [${flags.join(', ')}]` : '';
                    const due = formatTaskDueDate(t.duedate) || '—';
                    report += `  ${index + 1}. ${t.id} — ${t.desc || 'Untitled'}${flagSuffix}\n`;
                    report += `     Client: ${t.client || '—'} | Status: ${t.status} | Due: ${due}\n`;
                });
                report += `\n`;
            });

            if (!membersWithPlans) {
                report += `No planned tasks for this date and filter.\n`;
            }

            return report;
        }

        function updateDailyPlanViewButtons() {
            const tableBtn = document.getElementById('dp-view-table');
            const textBtn = document.getElementById('dp-view-text');
            const active = 'text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg bg-white text-indigo-600 shadow-sm transition-all';
            const inactive = 'text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-600 transition-all';
            if (tableBtn) tableBtn.className = dpViewMode === 'table' ? active : inactive;
            if (textBtn) textBtn.className = dpViewMode === 'text' ? active : inactive;
        }

        function setDailyPlanView(mode) {
            dpViewMode = mode === 'text' ? 'text' : 'table';
            document.getElementById('dp-table-view')?.classList.toggle('hidden', dpViewMode !== 'table');
            document.getElementById('dp-text-view')?.classList.toggle('hidden', dpViewMode !== 'text');
            updateDailyPlanViewButtons();
            if (dpViewMode === 'text') renderDailyPlanTextReport();
            else renderDailyPlan();
        }

        function renderDailyPlanTextReport() {
            const meta = document.getElementById('dp-text-report-meta');
            const content = document.getElementById('dp-text-report-content');
            const dateStr = document.getElementById('dp-date')?.value || todayIso();
            const dateLabel = new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-GB', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
            if (meta) {
                meta.textContent = `${dateLabel} · ${getDailyPlanScopeLabel()} · ${dpFilter === 'carryover' ? 'Carry forward only' : 'All tasks'}`;
            }
            if (content) content.textContent = buildDailyPlanTextReport();
        }

        function openDailyPlanTextReport() {
            setDailyPlanView('text');
            document.getElementById('dp-text-view')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        function copyDailyPlanReport() {
            const text = document.getElementById('dp-text-report-content')?.textContent || '';
            if (!text) return toast('Nothing to copy', 'info');
            navigator.clipboard.writeText(text).then(() => {
                toast('Daily plan report copied to clipboard', 'success');
            }).catch(err => {
                toast('Failed to copy: ' + err.message, 'error');
            });
        }

        function renderDailyPlanStats(uniquePlans) {
            const statsGrid = document.getElementById('dp-stats-dashboard');
            const countDpStatus = (status) => uniquePlans.filter(t => t.status === status).length;
            const stats = {
                total: uniquePlans.length,
                designInProgress: countDpStatus('Design In Progress'),
                hold: countDpStatus('Design Hold'),
                thumbnail: countDpStatus('Thumbnail'),
                rework: countDpStatus('Rework Designs'),
                completed: uniquePlans.filter(t => isDone(t.status) || isInternalDone(t.status)).length
            };
            if (!statsGrid) return;
            statsGrid.innerHTML = `
                <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Total Tasks</p>
                    <p class="text-xl font-black text-slate-900">${stats.total}</p>
                </div>
                <div class="bg-amber-50 p-4 rounded-2xl border border-amber-100/50 shadow-sm">
                    <p class="text-[10px] text-amber-600 font-bold uppercase tracking-widest mb-1">In Progress</p>
                    <p class="text-[9px] text-amber-500/90 font-semibold mb-0.5">Design In Progress</p>
                    <p class="text-xl font-black text-amber-700">${stats.designInProgress}</p>
                </div>
                <div class="bg-rose-50 p-4 rounded-2xl border border-rose-100/50 shadow-sm">
                    <p class="text-[10px] text-rose-500 font-bold uppercase tracking-widest mb-1">Hold Count</p>
                    <p class="text-xl font-black text-rose-600">${stats.hold}</p>
                </div>
                <div class="bg-violet-50 p-4 rounded-2xl border border-violet-100/50 shadow-sm">
                    <p class="text-[10px] text-violet-500 font-bold uppercase tracking-widest mb-1">Thumbnail Count</p>
                    <p class="text-xl font-black text-violet-600">${stats.thumbnail}</p>
                </div>
                <div class="bg-orange-50 p-4 rounded-2xl border border-orange-100/50 shadow-sm">
                    <p class="text-[10px] text-orange-500 font-bold uppercase tracking-widest mb-1">Rework Design</p>
                    <p class="text-xl font-black text-orange-600">${stats.rework}</p>
                </div>
                <div class="bg-emerald-50 p-4 rounded-2xl border border-emerald-100/50 shadow-sm">
                    <p class="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mb-1">Completed</p>
                    <p class="text-xl font-black text-emerald-600">${stats.completed}</p>
                </div>
            `;
        }

        function renderDailyPlan() {
            const tbody = document.getElementById('dp-tasks-tbody');
            const countEl = document.getElementById('dp-task-count');
            if (!tbody || !countEl) return;

            const uniquePlans = collectDailyPlanRowsForView();
            renderDailyPlanStats(uniquePlans);
            countEl.textContent = `${uniquePlans.length} Task${uniquePlans.length !== 1 ? 's' : ''}`;

            if (dpViewMode === 'text') {
                document.getElementById('dp-table-view')?.classList.add('hidden');
                document.getElementById('dp-text-view')?.classList.remove('hidden');
                updateDailyPlanViewButtons();
                renderDailyPlanTextReport();
                return;
            }

            document.getElementById('dp-table-view')?.classList.remove('hidden');
            document.getElementById('dp-text-view')?.classList.add('hidden');
            updateDailyPlanViewButtons();

            if (!uniquePlans.length) {
                tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-10 text-center text-xs text-slate-400 italic">No tasks planned for this date.</td></tr>`;
                return;
            }

            if (dpSortCol) {
                updateSortIconUI('dp', dpSortCol, dpSortDir);
                uniquePlans.sort((a, b) => {
                    if (dpSortCol === 'assignee') {
                        const nameA = (currentWorkUsers.find(u => (u.email || '').toLowerCase() === (a.plannedForUser || '').toLowerCase())?.name || a.plannedForUser || '').toLowerCase();
                        const nameB = (currentWorkUsers.find(u => (u.email || '').toLowerCase() === (b.plannedForUser || '').toLowerCase())?.name || b.plannedForUser || '').toLowerCase();
                        if (nameA < nameB) return dpSortDir === 'asc' ? -1 : 1;
                        if (nameA > nameB) return dpSortDir === 'asc' ? 1 : -1;
                        return 0;
                    }
                    return compareTasksForSort(a, b, dpSortCol, dpSortDir);
                });
            }

            tbody.innerHTML = uniquePlans.map(t => {
                const isInternal = isInternalTask(t);
                const taskKeyHtml = (t.manual || isInternal)
                    ? `<button onclick="openEditTaskModal('${t.id}')" class="hover:underline hover:text-indigo-800 transition-colors text-left">${t.id}</button>`
                    : `<a href="https://${JIRA.domain}/browse/${t.id}" target="_blank" class="hover:underline hover:text-indigo-800 transition-colors inline-flex items-center gap-1" title="Open in Jira">${t.id} <iconify-icon icon="solar:external-link-linear" width="12"></iconify-icon></a>`;
                const statusOptions = isInternal
                    ? INTERNAL_TASK_STATUSES
                    : [...new Set(tasks.filter(x => !isInternalTask(x)).map(x => x.status).filter(Boolean))].sort();
                const statusSelectHtml = `
                    <select onchange="updateTaskStatus('${t.id}', this.value)" class="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 w-full max-w-[180px]">
                        ${statusOptions.map(s => `<option value="${s}" ${s === t.status ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                `;
                const userLive = currentWorkUsers.find(u => (u.email || '').toLowerCase() === t.plannedForUser.toLowerCase());
                const assigneeNameStr = userLive?.name || t.plannedForUser;
                
                const isWorkingOnThis = userLive?.currentTask?.taskId === t.id;
                const taskState = userLive?.currentTask?.state;
                const liveTimerHtml = isWorkingOnThis && taskState === 'working' 
                    ? `<span class="live-task-timer ml-2 text-[10px] font-black text-indigo-600 font-mono bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 animate-pulse inline-flex items-center gap-1 shrink-0" data-started="${userLive.currentTask.startedAt}" data-state="working"><iconify-icon icon="solar:play-circle-bold" width="10"></iconify-icon> ${formatTime(Math.max(0, Math.floor((Date.now() - userLive.currentTask.startedAt) / 1000)))}</span>`
                    : (isWorkingOnThis && taskState === 'on_hold' ? `<span class="ml-2 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 inline-flex items-center gap-1 shrink-0"><iconify-icon icon="solar:pause-circle-bold" width="10"></iconify-icon> ON HOLD</span>` : '');

                return `
                <tr class="hover:bg-slate-50 transition-colors ${activeTaskId === t.id ? 'bg-indigo-50/30' : ''} ${dailyPlanRowClass(t.status, t)}">
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="text-xs font-mono font-bold text-indigo-600">${taskKeyHtml}</span>
                            ${isInternal ? `<span class="bg-violet-100 text-violet-700 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">Internal</span>` : ''}
                            ${t.isCarryOver ? `<span class="bg-amber-100 text-amber-700 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase" title="Carried over from ${t.planData.date}">Carry Over</span>` : ''}
                            ${t.isAutoIncluded ? `<span class="bg-indigo-100 text-indigo-700 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase" title="Auto included by status">Auto</span>` : ''}
                            ${liveTimerHtml}
                        </div>
                        <p class="text-xs text-slate-900 mt-1 max-w-xs truncate">${escapeHtml(t.desc)}</p>
                    </td>
                    <td class="px-6 py-4">${statusSelectHtml}</td>
                    <td class="px-6 py-4 hidden md:table-cell text-xs text-slate-600 font-medium">${escapeHtml(t.client || '—')}</td>
                    <td class="px-6 py-4 hidden md:table-cell">${formatTaskDueDateHtml(t.duedate, t.status)}</td>
                    <td class="px-6 py-4 text-xs text-slate-600 font-medium">${escapeHtml(assigneeNameStr)}</td>
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
            const THUMBNAIL_NOTIFY_EMAILS = ['anithavilpower@gmail.com', 'digitalmarketing@vilpower.com'];
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
                    if (shownTaskNotifIds.has(id)) return;

                    // Only show if this notification targets the current user
                    const targets = (notif.notifyEmails || []).map(e => e.toLowerCase());
                    if (targets.length > 0 && !targets.includes(myEmail)) return;

                    // Don't show if already read
                    if (notif.readBy && notif.readBy[eKey(myEmail)]) return;

                    // Only show notifications from the last 5 minutes
                    if (Date.now() - (notif.timestamp || 0) > 300000) return;

                    shownTaskNotifIds.add(id);
                    localStorage.setItem('worksync_toasted_notifs', JSON.stringify(Array.from(shownTaskNotifIds)));

                    const openNotif = () => {
                        window.focus();
                        if (notif.image) openImagePreview(notif.image, notif.title || 'Notification');
                    };

                    // Show the notification toast
                    if (notif.body) {
                        const imageHint = notif.image ? ' — tap to view image' : '';
                        toast(`🔔 ${notif.title || 'Notification'}: ${notif.body}${imageHint}`, 'info', notif.image ? openNotif : null);
                    } else {
                        const client = notif.client ? ` (${notif.client})` : '';
                        toast(`📋 Thumbnail task received: ${notif.taskId}${client} — ${notif.taskDesc}. Moved by ${notif.changedBy}`, 'info');
                    }
                });
            });
        }

        let notificationsList = [];
        let unreadNotifCount = 0;

        function loadAllNotificationsForUser() {
            if (!db || !currentUser) return;
            const notifRef = query(ref(db, 'worksync/task_notifications'), orderByChild('timestamp'), limitToLast(50));
            onValue(notifRef, snap => {
                const data = snap.val() || {};
                notificationsList = [];
                unreadNotifCount = 0;
                const myEmail = currentUser.email.toLowerCase();

                Object.entries(data).forEach(([id, notif]) => {
                    const targets = (notif.notifyEmails || []).map(e => e.toLowerCase());
                    if (targets.length > 0 && !targets.includes(myEmail)) return;
                    
                    const isRead = !!(notif.readBy && notif.readBy[eKey(myEmail)]);
                    if (!isRead) unreadNotifCount++;
                    
                    notificationsList.push({
                        id,
                        ...notif,
                        isRead
                    });
                });
                
                notificationsList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                updateNotificationBellBadge();
                renderNotificationDropdownList();
            });
        }

        function toggleNotificationDropdown(event) {
            if (event) event.stopPropagation();
            const dropdown = document.getElementById('header-notif-dropdown');
            if (!dropdown) return;
            
            const isHidden = dropdown.classList.contains('hidden');
            if (isHidden) {
                dropdown.classList.remove('hidden');
                setTimeout(() => {
                    dropdown.classList.remove('scale-95', 'opacity-0');
                    dropdown.classList.add('scale-100', 'opacity-100');
                }, 10);
            } else {
                dropdown.classList.remove('scale-100', 'opacity-100');
                dropdown.classList.add('scale-95', 'opacity-0');
                setTimeout(() => {
                    dropdown.classList.add('hidden');
                }, 150);
            }
        }

        function updateNotificationBellBadge() {
            const badge = document.getElementById('header-notif-badge');
            if (!badge) return;
            if (unreadNotifCount > 0) {
                badge.textContent = unreadNotifCount;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }

        function renderNotificationDropdownList() {
            const listContainer = document.getElementById('header-notif-list');
            if (!listContainer) return;
            
            if (notificationsList.length === 0) {
                listContainer.innerHTML = `
                    <div class="text-center py-8">
                        <iconify-icon icon="solar:bell-off-linear" class="text-slate-300 mb-1" width="28"></iconify-icon>
                        <p class="text-[10px] text-slate-400 italic">No notifications yet</p>
                    </div>
                `;
                return;
            }

            listContainer.innerHTML = notificationsList.map(notif => {
                const dateStr = new Date(notif.timestamp).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
                const timeStr = new Date(notif.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                
                const title = notif.title || 'Notification';
                const body = notif.body || (notif.taskDesc ? `Thumbnail task received: ${notif.taskId} - ${notif.taskDesc}` : '');
                
                const unreadDot = !notif.isRead 
                    ? `<span class="w-2 h-2 rounded-full bg-indigo-600 shrink-0"></span>` 
                    : '';
                const bgClass = !notif.isRead ? 'bg-indigo-50/20' : 'hover:bg-slate-50/50';

                return `
                    <div onclick="clickNotificationItem('${notif.id}', '${notif.image || ''}', event)" class="p-3.5 flex gap-3 cursor-pointer transition-colors ${bgClass} items-start">
                        <div class="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                            <iconify-icon icon="solar:bell-bold" width="16"></iconify-icon>
                        </div>
                        <div class="flex-1 min-w-0 space-y-1">
                            <div class="flex items-center justify-between gap-2">
                                <h5 class="text-[11px] font-black text-slate-900 truncate">${escapeHtml(title)}</h5>
                                <span class="text-[9px] text-slate-400 font-bold shrink-0">${dateStr} ${timeStr}</span>
                            </div>
                            <p class="text-[10px] text-slate-500 leading-relaxed line-clamp-3">${escapeHtml(body)}</p>
                            ${notif.image ? `<span class="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-600 mt-1"><iconify-icon icon="solar:gallery-bold" width="10"></iconify-icon> View Attachment</span>` : ''}
                        </div>
                        ${unreadDot}
                    </div>
                `;
            }).join('');
        }

        async function clickNotificationItem(id, image, event) {
            if (event) event.stopPropagation();
            const myEmail = currentUser.email.toLowerCase();
            try {
                await update(ref(db, `worksync/task_notifications/${id}/readBy`), { [eKey(myEmail)]: Date.now() });
            } catch(e) {
                console.error('Failed to mark notification as read', e);
            }
            if (image) {
                openImagePreview(image, 'Notification Attachment');
            }
        }

        async function markAllNotificationsAsRead(event) {
            if (event) event.stopPropagation();
            const myEmail = currentUser.email.toLowerCase();
            const unreadNotifs = notificationsList.filter(n => !n.isRead);
            if (unreadNotifs.length === 0) return;

            const updates = {};
            unreadNotifs.forEach(notif => {
                updates[`worksync/task_notifications/${notif.id}/readBy/${eKey(myEmail)}`] = Date.now();
            });

            try {
                await update(ref(db), updates);
                toast('All notifications marked as read', 'success');
            } catch(e) {
                console.error('Failed to mark all as read', e);
                toast('Failed to mark all as read', 'error');
            }
        }
        
        document.addEventListener('click', () => {
            const dropdown = document.getElementById('header-notif-dropdown');
            if (dropdown && !dropdown.classList.contains('hidden')) {
                dropdown.classList.remove('scale-100', 'opacity-100');
                dropdown.classList.add('scale-95', 'opacity-0');
                setTimeout(() => {
                    dropdown.classList.add('hidden');
                }, 150);
            }
        });

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

        function updateOrganiserNavVisibility() {
            const showEvent = isEventOrganiser() || isAdmin();
            const showLeave = isLeaveOrganiser() || isAdmin();
            const showLearnings = isLearningsOrganiser() || isAdmin();
            const showWorkplace = isWorkplaceOrganiser() || isAdmin();
            const showDmContent = isDmContentOrganiser() || isAdmin();
            const anyVisible = showEvent || showLeave || showLearnings || showWorkplace || showDmContent;

            document.getElementById('nav-event-org')?.classList.toggle('hidden', !showEvent);
            document.getElementById('nav-leave-org')?.classList.toggle('hidden', !showLeave);
            document.getElementById('nav-learnings-org')?.classList.toggle('hidden', !showLearnings);
            document.getElementById('nav-workplace-org')?.classList.toggle('hidden', !showWorkplace);
            document.getElementById('nav-dm-content-org')?.classList.toggle('hidden', !showDmContent);
            document.getElementById('nav-organisers-divider')?.classList.toggle('hidden', !anyVisible);
            document.getElementById('nav-organisers-heading')?.classList.toggle('hidden', !anyVisible);

            if (!anyVisible && ['event-org', 'leave-org', 'learnings-org', 'workplace-org', 'dm-content-org'].includes(activeView)) {
                switchView('dashboard');
            }
        }

        function sortBoardStatuses(statuses) {
            const list = [...statuses];
            if (boardColumnOrder && Array.isArray(boardColumnOrder)) {
                list.sort((a, b) => {
                    const idxA = boardColumnOrder.indexOf(a);
                    const idxB = boardColumnOrder.indexOf(b);
                    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                    if (idxA !== -1) return -1;
                    if (idxB !== -1) return 1;
                    return a.localeCompare(b);
                });
            } else {
                list.sort((a, b) => a.localeCompare(b));
            }
            return list;
        }

        function moveBoardColumn(status, direction) {
            let allStatuses = currentStatusFilter === 'all'
                ? [...new Set(tasks.filter(t => !isInternalTask(t)).map(t => t.status).filter(Boolean))]
                : [...currentStatusFilter];
            allStatuses = sortBoardStatuses(allStatuses);

            const index = allStatuses.indexOf(status);
            if (index === -1) return;
            const newIndex = index + direction;
            if (newIndex < 0 || newIndex >= allStatuses.length) return;

            const temp = allStatuses[index];
            allStatuses[index] = allStatuses[newIndex];
            allStatuses[newIndex] = temp;

            boardColumnOrder = allStatuses;
            renderTasks();
            toast('Column order updated — click Save Settings to keep as default', 'info');
        }

        let organisersListenerUnsub = null;
        function initOrganisersListener() {
            if (!db) return;
            if (organisersListenerUnsub) organisersListenerUnsub();
            organisersListenerUnsub = onValue(ref(db, 'worksync/monthly_organisers'), snap => {
                const data = snap.val() || {};
                currentOrganisers = data;
                updateOrganiserNavVisibility();

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
                const entries = Object.values(data).sort((a,b) => b.createdAt - a.createdAt);
                
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
                        ${idea.image ? `
                        <div class="mt-2">
                            <img src="${idea.image}" onclick="openImagePreview(this.src, '${escapeHtml(idea.title)}')" class="max-h-32 rounded-lg border border-slate-200 cursor-pointer hover:opacity-95 transition-all">
                        </div>` : ''}
                        <p class="text-[9px] font-bold text-indigo-600 uppercase tracking-wider">Shared by: ${escapeHtml(idea.userName)}</p>
                    </div>
                `).join('');
            });
        }

        async function submitEventIdea() {
            const titleInput = document.getElementById('event-title');
            const detailsInput = document.getElementById('event-details');
            const imageInput = document.getElementById('event-image-input');
            if (!titleInput || !detailsInput) return;

            const title = titleInput.value.trim();
            const details = detailsInput.value.trim();
            if (!title || !details) return toast('Please fill in title and description', 'error');

            try {
                let base64Image = null;
                if (imageInput && imageInput.files && imageInput.files[0]) {
                    base64Image = await fileToBase64(imageInput.files[0]);
                }

                const idea = {
                    title,
                    details,
                    userId: currentUser.email,
                    userName: currentUser.name,
                    createdAt: Date.now()
                };
                if (base64Image) idea.image = base64Image;

                await push(ref(db, 'worksync/event_ideas'), idea);
                
                // Increment activity count
                const count = (currentOrganisers?.event?.count || 0) + 1;
                await update(ref(db, 'worksync/monthly_organisers/event'), { count });

                // Send team announcement
                await sendAutomaticAnnouncement('New Event Idea Shared! 🎟️', `Event Organiser ${currentUser.name} has shared: "${title}" - ${details.substring(0, 80)}...`, base64Image);

                titleInput.value = '';
                detailsInput.value = '';
                if (imageInput) {
                    imageInput.value = '';
                    const preview = document.getElementById('event-img-preview');
                    if (preview) preview.textContent = 'No file chosen';
                }
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
                const entries = Object.values(data).sort((a,b) => b.createdAt - a.createdAt);
                
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
                        ${idea.image ? `
                        <div class="mt-2">
                            <img src="${idea.image}" onclick="openImagePreview(this.src, '${escapeHtml(idea.title)}')" class="max-h-32 rounded-lg border border-slate-200 cursor-pointer hover:opacity-95 transition-all">
                        </div>` : ''}
                        <p class="text-[9px] font-bold text-rose-600 uppercase tracking-wider">Shared by: ${escapeHtml(idea.userName)}</p>
                    </div>
                `).join('');
            });
        }

        async function submitWorkplaceIdea() {
            const titleInput = document.getElementById('workplace-title');
            const detailsInput = document.getElementById('workplace-details');
            const imageInput = document.getElementById('workplace-image-input');
            if (!titleInput || !detailsInput) return;

            const title = titleInput.value.trim();
            const details = detailsInput.value.trim();
            if (!title || !details) return toast('Please fill in title and suggestion', 'error');

            try {
                let base64Image = null;
                if (imageInput && imageInput.files && imageInput.files[0]) {
                    base64Image = await fileToBase64(imageInput.files[0]);
                }

                const idea = {
                    title,
                    details,
                    userId: currentUser.email,
                    userName: currentUser.name,
                    createdAt: Date.now()
                };
                if (base64Image) idea.image = base64Image;

                await push(ref(db, 'worksync/workplace_ideas'), idea);

                // Increment activity count
                const count = (currentOrganisers?.workplace?.count || 0) + 1;
                await update(ref(db, 'worksync/monthly_organisers/workplace'), { count });

                // Send team announcement
                await sendAutomaticAnnouncement('New Workplace Suggestion! 🏢', `Workplace Organiser ${currentUser.name} has shared: "${title}" - ${details.substring(0, 80)}...`, base64Image);

                titleInput.value = '';
                detailsInput.value = '';
                if (imageInput) {
                    imageInput.value = '';
                    const preview = document.getElementById('workplace-img-preview');
                    if (preview) preview.textContent = 'No file chosen';
                }
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
                const entries = Object.values(data).sort((a,b) => b.createdAt - a.createdAt);
                
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
                        ${idea.image ? `
                        <div class="mt-2">
                            <img src="${idea.image}" onclick="openImagePreview(this.src, '${escapeHtml(idea.title)}')" class="max-h-32 rounded-lg border border-slate-200 cursor-pointer hover:opacity-95 transition-all">
                        </div>` : ''}
                        <p class="text-[9px] font-bold text-cyan-600 uppercase tracking-wider">Shared by: ${escapeHtml(idea.userName)}</p>
                    </div>
                `).join('');
            });
        }

        async function submitDmContentIdea() {
            const titleInput = document.getElementById('dm-content-title');
            const detailsInput = document.getElementById('dm-content-details');
            const imageInput = document.getElementById('dm-content-image-input');
            if (!titleInput || !detailsInput) return;

            const title = titleInput.value.trim();
            const details = detailsInput.value.trim();
            if (!title || !details) return toast('Please fill in title and copies/ideas', 'error');

            try {
                let base64Image = null;
                if (imageInput && imageInput.files && imageInput.files[0]) {
                    base64Image = await fileToBase64(imageInput.files[0]);
                }

                const idea = {
                    title,
                    details,
                    userId: currentUser.email,
                    userName: currentUser.name,
                    createdAt: Date.now()
                };
                if (base64Image) idea.image = base64Image;

                await push(ref(db, 'worksync/dm_content_ideas'), idea);

                // Increment activity count
                const count = (currentOrganisers?.dmContent?.count || 0) + 1;
                await update(ref(db, 'worksync/monthly_organisers/dmContent'), { count });

                // Send team announcement
                await sendAutomaticAnnouncement('New Social Media Content Draft! 📝', `DM Content Organiser ${currentUser.name} has shared: "${title}" - ${details.substring(0, 80)}...`, base64Image);

                titleInput.value = '';
                detailsInput.value = '';
                if (imageInput) {
                    imageInput.value = '';
                    const preview = document.getElementById('dm-content-img-preview');
                    if (preview) preview.textContent = 'No file chosen';
                }
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
                const entries = Object.values(data).sort((a,b) => b.createdAt - a.createdAt);
                
                if (entries.length === 0) {
                    list.innerHTML = `<p class="text-xs text-slate-400 italic">No learning sessions logged yet.</p>`;
                    return;
                }

                list.innerHTML = entries.map(log => {
                    const isAttendance = log.logType === 'attendance';
                    const typeBadge = isAttendance
                        ? `<span class="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Attendance</span>`
                        : (log.logType ? `<span class="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">${escapeHtml(log.logType)}</span>` : '');
                    const slotLine = log.timeSlot ? `<p class="text-[9px] font-bold text-slate-500">${escapeHtml(log.timeSlot)}${log.attendanceDate ? ` · ${log.attendanceDate}` : ''}</p>` : '';
                    return `
                    <div class="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2 ${isAttendance ? 'border-emerald-100' : ''}">
                        <div class="flex items-start justify-between gap-2">
                            <h5 class="text-xs font-black text-slate-900">${escapeHtml(log.title)}</h5>
                            <div class="flex flex-col items-end gap-1 shrink-0">
                                ${typeBadge}
                                <span class="text-[9px] font-semibold text-slate-400">${new Date(log.createdAt).toLocaleString()}</span>
                            </div>
                        </div>
                        ${slotLine}
                        <p class="text-xs text-slate-600 whitespace-pre-wrap">${escapeHtml(log.details)}</p>
                        ${log.image ? `
                        <div class="mt-2">
                            <img src="${log.image}" onclick="openImagePreview(this.src, '${escapeHtml(log.title)}')" class="max-h-32 rounded-lg border border-slate-200 cursor-pointer hover:opacity-95 transition-all">
                        </div>` : ''}
                        <p class="text-[9px] font-bold text-amber-600 uppercase tracking-wider">Logged by: ${escapeHtml(log.userName)}</p>
                    </div>`;
                }).join('');
            });
        }

        async function submitLearningLog() {
            const titleInput = document.getElementById('learnings-title');
            const detailsInput = document.getElementById('learnings-details');
            const imageInput = document.getElementById('learnings-image-input');
            if (!titleInput || !detailsInput) return;

            const title = titleInput.value.trim();
            const details = detailsInput.value.trim();
            if (!title || !details) return toast('Please fill in title and details', 'error');

            try {
                let base64Image = null;
                if (imageInput && imageInput.files && imageInput.files[0]) {
                    base64Image = await fileToBase64(imageInput.files[0]);
                }

                const log = {
                    title,
                    details,
                    userId: currentUser.email,
                    userName: currentUser.name,
                    createdAt: Date.now()
                };
                if (base64Image) log.image = base64Image;

                await push(ref(db, 'worksync/learning_logs'), log);

                // Increment activity count
                const count = (currentOrganisers?.learnings?.count || 0) + 1;
                await update(ref(db, 'worksync/monthly_organisers/learnings'), { count });

                // Send team announcement
                await sendAutomaticAnnouncement('New Learning Resource Shared! 🎓', `Learning Organiser ${currentUser.name} logged: "${title}" - ${details.substring(0, 80)}...`, base64Image);

                titleInput.value = '';
                detailsInput.value = '';
                if (imageInput) {
                    imageInput.value = '';
                    const preview = document.getElementById('learnings-img-preview');
                    if (preview) preview.textContent = 'No file chosen';
                }
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
                const list = Object.values(data).filter(r => r.type === 'leave' || r.type === 'saturday').sort((a,b) => (b.submittedAt || 0) - (a.submittedAt || 0));

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
                const imageInput = document.getElementById('leave-alert-image-input');
                let base64Image = null;
                if (imageInput?.files?.[0]) {
                    if (imageInput.files[0].size > 2 * 1024 * 1024) return toast('Image must be less than 2MB', 'error');
                    base64Image = await fileToBase64(imageInput.files[0]);
                }

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
                if (base64Image) notifData.image = base64Image;
                await push(ref(db, 'worksync/task_notifications'), notifData);

                // Send team announcement
                await sendAutomaticAnnouncement('Leave Organising Alert! 📅', `Leave Organiser ${currentUser.name} sent an alert reminder to Admins to review and coordinate leave schedules.`, base64Image);

                if (imageInput) {
                    imageInput.value = '';
                    const preview = document.getElementById('leave-alert-img-preview');
                    if (preview) preview.textContent = 'No file chosen';
                }

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
            if (taskIndex === -1) return;
            const task = tasks[taskIndex];
            const oldStatus = task.status;

            if (task.manual) {
                try {
                    await update(ref(db, `worksync/manual_tasks/${eKey(task.userId)}/${taskId}`), { status: newStatus });
                    task.status = newStatus;
                    renderDailyPlan();
                    renderTasks();
                    if (activeView === 'internal-tasks') renderInternalTasks();
                    updateStats();
                    toast('Task status updated', 'success');

                    // Thumbnail notification
                    if (newStatus.toLowerCase() === 'thumbnail' && oldStatus.toLowerCase() !== 'thumbnail') {
                        sendThumbnailNotification(task, currentUser?.name || currentUser?.email || 'Unknown');
                    }
                } catch (err) { toast('Failed to update status', 'error'); }
            } else {
                // Jira task: update locally first, then sync to Jira
                task.status = newStatus;
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
                } else {
                    // Thumbnail notification on successful Jira sync
                    if (newStatus.toLowerCase() === 'thumbnail' && oldStatus.toLowerCase() !== 'thumbnail') {
                        sendThumbnailNotification(task, currentUser?.name || currentUser?.email || 'Unknown');
                    }
                }
            }
        }

        async function checkAndCreateThumbnailSubTask(task, newAssigneeEmail) {
            if (!task || !newAssigneeEmail) return;
            const videoEditors = [
                'thanushvilpower@gmail.com',
                'barathvilpower@gmail.com',
                'ajithvilpower@gmail.com',
                'princevilpower@gmail.com',
                'murugeshvilpower@gmail.com',
                'alexvilpower@gmail.com',
                'alex@vilpower.com'
            ];
            
            if (!videoEditors.includes(newAssigneeEmail.toLowerCase())) return;
            
            const descLower = (task.desc || '').toLowerCase();
            if (descLower.includes('thumbnail')) return;
            
            const targetKarthikaEmail = 'anithavilpower@gmail.com';
            const karthikaUser = allUsersMap.get(targetKarthikaEmail) || knownUserByEmail(targetKarthikaEmail);
            const karthikaName = karthikaUser?.name || 'Karthika';
            
            const exists = tasks.some(t => 
                t.parentTaskId === task.id || 
                (t.desc && t.desc.toLowerCase().includes('thumbnail') && t.desc.toLowerCase().includes(task.id.toLowerCase()))
            );
            
            if (exists) {
                console.log('Thumbnail sub-task already exists for task', task.id);
                return;
            }
            
            const subTaskId = 'M-' + Date.now();
            const subTask = {
                id: subTaskId,
                parentTaskId: task.id,
                desc: `Thumbnail - ${task.id} - ${task.desc}`,
                client: task.client || 'Others',
                status: 'To Do',
                priority: task.priority || 'Medium',
                assignee: karthikaName,
                assigneeEmail: targetKarthikaEmail,
                manual: true,
                taskType: 'manual',
                userId: targetKarthikaEmail,
                createdAt: Date.now()
            };
            
            try {
                await set(ref(db, `worksync/manual_tasks/${eKey(targetKarthikaEmail)}/${subTaskId}`), subTask);
                tasks = mergeTasksById([subTask, ...tasks]);
                renderTasks();
                if (activeView === 'internal-tasks') renderInternalTasks();
                if (activeView === 'dailyplan') renderDailyPlan();
                updateStats();
                toast(`Auto-assigned thumbnail sub-task to Karthika for ${task.id}`, 'success');
            } catch(e) {
                console.error('Failed to auto-assign thumbnail sub-task', e);
            }
        }

        function openAssignPlanModal() {
            document.getElementById('ap-task-search').value = '';
            document.getElementById('ap-date').value = document.getElementById('dp-date').value || todayIso();
            
            const sel = document.getElementById('ap-user');
            if (isAdmin()) {
                const usersList = Array.from(allUsersMap.values()).sort((a,b) => (a.name||'').localeCompare(b.name||'')); // Use allUsersMap
                sel.innerHTML = usersList.map(u => `<option value="${u.email}">${u.name}</option>`).join('');
                sel.disabled = false;
            } else {
                sel.innerHTML = `<option value="${currentUser.email}">${currentUser.name || currentUser.email}</option>`;
                sel.value = currentUser.email;
                sel.disabled = true;
            }

            filterAssignPlanTasks('');
            document.getElementById('assignPlanModal').showModal();
        }

        function filterAssignPlanTasks(term) {
            const list = document.getElementById('ap-task-list');
            const userEmail = document.getElementById('ap-user').value;
            const searchLower = (term || '').toLowerCase();
            
            let filtered = tasks.filter(taskEligibleForDailyPlanAllocation);

            if (term) {
                filtered = filtered.filter(t => 
                    (t.status && t.status.toLowerCase().includes(searchLower)) ||
                    (t.client && t.client.toLowerCase().includes(searchLower)) ||
                    (t.id && t.id.toLowerCase().includes(searchLower)) ||
                    (t.desc && t.desc.toLowerCase().includes(searchLower))
                );
            } else {
                // Show tasks for selected user OR unassigned tasks so admin can assign them
                filtered = filtered.filter(t => (assigneeMatches(t, userEmail) || !t.assignee || t.assignee === 'Unassigned'));
            }

            filtered.sort((a, b) => {
                if (!a.duedate && !b.duedate) return 0;
                if (!a.duedate) return 1;
                if (!b.duedate) return -1;
                return new Date(a.duedate) - new Date(b.duedate);
            });

            filtered = filtered.slice(0, 50);

            if (!filtered.length) {
                list.innerHTML = `<p class="p-4 text-center text-xs text-slate-400 italic">No tasks found.</p>`;
                return;
            }

            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            list.innerHTML = filtered.map(t => {
                const dueClass = !t.duedate || isDone(t.status) ? 'text-slate-700'
                    : (new Date(t.duedate) < todayStart ? 'text-rose-600' : 'text-slate-700');
                return `
                <label class="flex items-center gap-3 p-3 hover:bg-slate-100 rounded-xl cursor-pointer transition-all border border-transparent hover:border-slate-200">
                    <input type="checkbox" name="ap_task_select" value="${t.id}" class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 shrink-0">
                    <div class="min-w-0 flex-1">
                        <p class="text-xs font-bold text-slate-900 truncate"><span class="text-indigo-600 font-mono mr-2">${t.id}</span>${escapeHtml(t.desc)}</p>
                        <p class="text-[10px] text-slate-500 truncate">${escapeHtml(t.status)}${t.client ? ' · ' + escapeHtml(t.client) : ''} · ${escapeHtml(assigneeName(t))}</p>
                    </div>
                    <div class="shrink-0 text-right min-w-[72px]">
                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Due</p>
                        <p class="text-xs font-bold ${dueClass}">${formatTaskDueDate(t.duedate) || '—'}</p>
                    </div>
                </label>`;
            }).join('');
        }

        async function submitAssignPlan() {
            const selectedCheckboxes = document.querySelectorAll('input[name="ap_task_select"]:checked');
            const selectedTaskIds = Array.from(selectedCheckboxes).map(cb => cb.value);
            if (selectedTaskIds.length === 0) return toast('Please select at least one task', 'error');
            const userEmail = document.getElementById('ap-user').value;
            const date = document.getElementById('ap-date').value;
            if (!userEmail || !date) return toast('Please select user and date', 'error');

            const btn = document.querySelector('#assignPlanModal button[onclick="submitAssignPlan()"]');
            const btnLabel = btn?.textContent;
            if (btn) {
                btn.disabled = true;
                btn.textContent = 'Assigning...';
            }

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

                let jiraAssigned = 0;
                let jiraFailed = 0;
                const jiraErrors = [];

                for (const taskId of selectedTaskIds) {
                    const task = tasks.find(t => t.id === taskId);
                    if (!task) continue;

                    // Trigger thumbnail subtask auto assign to Karthika if assigned to a video editor
                    if (userEmail && userEmail !== task.assigneeEmail) {
                        await checkAndCreateThumbnailSubTask(task, userEmail);
                    }

                    if (isJiraCloudTask(task)) {
                        try {
                            const accountId = await assignJiraIssueToUser(taskId, userEmail);
                            applyLocalTaskAssignee(taskId, userEmail, accountId);
                            jiraAssigned++;
                        } catch (err) {
                            console.warn('Jira assignee update failed:', taskId, err);
                            jiraFailed++;
                            jiraErrors.push(`${taskId}: ${err.message}`);
                            applyLocalTaskAssignee(taskId, userEmail);
                        }
                    } else {
                        const oldUserEmail = task.assigneeEmail || task.userId || currentUser.email;
                        applyLocalTaskAssignee(taskId, userEmail);
                        if (task.manual) {
                            const oldUserKey = eKey(oldUserEmail);
                            const newUserKey = eKey(userEmail);
                            if (oldUserKey !== newUserKey) {
                                const manualTaskUpdate = { ...task, assigneeEmail: userEmail, userId: userEmail };
                                const user = allUsersMap.get(userEmail.toLowerCase()) || knownUserByEmail(userEmail);
                                manualTaskUpdate.assignee = user?.name || userEmail.split('@')[0];
                                
                                const manualUpdates = {};
                                manualUpdates[`worksync/manual_tasks/${newUserKey}/${taskId}`] = manualTaskUpdate;
                                manualUpdates[`worksync/manual_tasks/${oldUserKey}/${taskId}`] = null;
                                await update(ref(db), manualUpdates);
                            }
                        }
                    }
                }

                renderTasks();
                renderDailyPlan();
                if (activeView === 'internal-tasks') renderInternalTasks();
                updateStats();
                populateAssigneeFilter();

                document.getElementById('assignPlanModal').close();

                if (jiraFailed === 0) {
                    const jiraNote = jiraAssigned > 0 ? ` (${jiraAssigned} updated in Jira)` : '';
                    toast(`Assigned ${selectedTaskIds.length} task(s) to daily plan${jiraNote}`, 'success');
                } else if (jiraAssigned > 0) {
                    toast(`Plan saved. Jira: ${jiraAssigned} assigned, ${jiraFailed} failed. ${jiraErrors[0] || ''}`, 'error');
                } else {
                    toast(`Daily plan saved but Jira assign failed: ${jiraErrors[0] || 'Unknown error'}`, 'error');
                }
            } catch (err) {
                toast('Failed to assign task: ' + err.message, 'error');
            } finally {
                if (btn) {
                    btn.disabled = false;
                    if (btnLabel) btn.textContent = btnLabel;
                }
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
            const backdrop = document.getElementById('sidebar-backdrop');
            const isMobile = window.innerWidth < 768;

            if (sidebar.classList.contains('hidden-sidebar')) { // Sidebar is hidden
                sidebar.classList.remove('hidden-sidebar');
                if (toggleIcon) toggleIcon.setAttribute('icon', 'solar:alt-arrow-left-linear');
                localStorage.removeItem('worksync_sidebar_collapsed');
                if (isMobile && backdrop) {
                    backdrop.classList.remove('hidden');
                }
            } else { // Sidebar is open
                sidebar.classList.add('hidden-sidebar');
                if (toggleIcon) toggleIcon.setAttribute('icon', 'solar:alt-arrow-right-linear');
                localStorage.setItem('worksync_sidebar_collapsed', 'true');
                if (backdrop) {
                    backdrop.classList.add('hidden');
                }
            }
        }
        window.handleLogin = handleLogin; window.logout = logout; window.switchView = switchView; window.toggleSidebar = toggleSidebar;
        window.doCheckIn = doCheckIn; window.doBreak = doBreak; window.doResume = doResume; window.confirmCheckOut = confirmCheckOut; window.submitCheckoutReason = submitCheckoutReason;
        window.syncTasks = syncTasks; window.toggleActiveTask = toggleActiveTask;
        window.saveBoardSettings = saveBoardSettings;
        window.filterDailyPlan = filterDailyPlan;
        window.toggleTaskViewMode = toggleTaskViewMode; window.dragTask = dragTask; window.dropTask = dropTask;
        window.toggleStatusFilter = toggleStatusFilter;
        window.toggleInternalStatusFilter = toggleInternalStatusFilter;
        window.setAssigneeFilter = setAssigneeFilter;
        window.setInternalAssigneeFilter = setInternalAssigneeFilter;
        window.setClientFilter = setClientFilter;
        window.setInternalClientFilter = setInternalClientFilter;
        window.setDueDateFilter = setDueDateFilter;
        window.setInternalDueDateFilter = setInternalDueDateFilter;
        window.searchTasks = searchTasks;
        window.searchInternalTasks = searchInternalTasks;
        window.handleTaskSort = handleTaskSort;
        window.handleInternalTaskSort = handleInternalTaskSort;
        window.handleDpSort = handleDpSort;
        window.openSettings = openSettings; window.toggleChatMute = toggleChatMute; window.openProfile = openProfile; window.uploadPhoto = uploadPhoto; window.saveProfile = saveProfile;
        window.switchHrTab = switchHrTab; window.setReqType = setReqType; window.submitHrRequest = submitHrRequest;
        window.leaveCalNav = leaveCalNav; window.renderLeaveCalendar = renderLeaveCalendar;
        window.calcDays = calcDays; window.syncHalfDayLeaveDates = syncHalfDayLeaveDates; window.handleLeaveDurationChange = handleLeaveDurationChange; window.toggleOtherReason = toggleOtherReason;
        window.openApproveModal = openApproveModal; window.closeApproveModal = closeApproveModal; window.submitApproval = submitApproval;
        window.openEditLeaveModal = openEditLeaveModal; window.saveEditedLeave = saveEditedLeave; window.deleteLeave = deleteLeave;
        window.exportDailyReport = exportDailyReport; window.generateAndDisplayDailyReport = generateAndDisplayDailyReport;
        function scrollChatToBottom() {
            const area = document.getElementById('messages-area');
            if (area) {
                setTimeout(() => { area.scrollTop = area.scrollHeight; }, 100);
            }
        }
        
        window.openDm = openDm; window.openConversation = openConversation; window.sendMessage = sendMessage; window.uploadChatAttachment = uploadChatAttachment; window.clearStagedAttachment = clearStagedAttachment; window.handleMsgInput = handleMsgInput; window.handleMsgKeyDown = handleMsgKeyDown; window.selectMention = selectMention; window.handleMsgPaste = handleMsgPaste;
        window.toggleNotificationDropdown = toggleNotificationDropdown; window.clickNotificationItem = clickNotificationItem; window.markAllNotificationsAsRead = markAllNotificationsAsRead; window.scrollChatToBottom = scrollChatToBottom;
        window.handleChatDragOver = handleChatDragOver; window.handleChatDragEnter = handleChatDragEnter; window.handleChatDragLeave = handleChatDragLeave; window.handleChatDrop = handleChatDrop;
        window.dragTaskEnd = dragTaskEnd; window.dragTaskEnter = dragTaskEnter; window.dragTaskLeave = dragTaskLeave; window.dragTask = dragTask; window.dropTask = dropTask;
        window.editMessage = editMessage; window.deleteMessage = deleteMessage; window.unsendMessage = unsendMessage; window.toggleReaction = toggleReaction;
        window.openNewGroupModal = openNewGroupModal; window.createGroup = createGroup;
        window.openEditGroupModal = openEditGroupModal; window.updateGroup = updateGroup; window.deleteGroup = deleteGroup; window.processGroupPhoto = processGroupPhoto; window.togglePinChat = togglePinChat;
        window.sendAnnouncement = sendAnnouncement; window.deleteAnnouncement = deleteAnnouncement;
        window.switchDprTab = switchDprTab; window.submitDpr = submitDpr; window.renderDpr = renderDpr; window.exportDprCsv = exportDprCsv; window.handleReportFilterChange = handleReportFilterChange; window.populateReportUserFilter = populateReportUserFilter;
        window.switchReportTab = switchReportTab; window.switchReportMainTab = switchReportMainTab; window.loadAttendanceEvents = loadAttendanceEvents; window.renderTimingReport = renderTimingReport; window.renderAnalyticsReport = renderAnalyticsReport; window.renderSummaryReport = renderSummaryReport; window.exportReportsCsv = exportReportsCsv; window.renderClientReport = renderClientReport; window.exportClientReport = exportClientReport; window.renderClientWideReport = renderClientWideReport; window.renderClientWiseTimingReport = renderClientWiseTimingReport;
        window.diagnoseJira = diagnoseJira; window.renderPerformanceReport = renderPerformanceReport;
        window.navigateShootCalendar = navigateShootCalendar; window.openShootPlanModal = openShootPlanModal; window.saveShootPlan = saveShootPlan; window.renderTimingDetailForDate = renderTimingDetailForDate;
        window.selectSaturday = (val, btn) => { selectedSaturday = val; document.querySelectorAll('.sat-btn').forEach(b => b.classList.remove('bg-indigo-600', 'text-white')); btn.classList.add('bg-indigo-600', 'text-white'); };
        window.sendReportEmail = sendReportEmail; window.toggleEmailReportSetting = toggleEmailReportSetting;
        window.holdTask = holdTask; window.resumeTaskTimer = resumeTaskTimer; window.endTask = endTask;
        window.openAddTaskModal = openAddTaskModal; window.submitManualTask = submitManualTask; window.openEditTaskModal = openEditTaskModal; window.submitTaskUpdate = submitTaskUpdate; window.deleteManualTask = deleteManualTask;
        window.openScheduleDiscussionModal = openScheduleDiscussionModal; window.submitScheduleDiscussion = submitScheduleDiscussion; window.joinDiscussion = joinDiscussion; window.dismissDiscussionPopup = dismissDiscussionPopup;
        window.loadUsersList = loadUsersList; window.openAdminUserModal = openAdminUserModal; window.saveAdminUser = saveAdminUser; window.auUploadPhoto = auUploadPhoto; window.deleteAdminUser = deleteAdminUser;
        window.openClientMapModal = openClientMapModal; window.saveClientMapEntry = saveClientMapEntry; window.deleteClientMapEntry = deleteClientMapEntry;
        window.openCustomClientModal = openCustomClientModal; window.saveCustomClientEntry = saveCustomClientEntry; window.deleteCustomClient = deleteCustomClient;
        window.importUnmappedJiraLabels = importUnmappedJiraLabels;
        window.saveNote = saveNote; window.editNote = editNote; window.deleteNote = deleteNote; window.clearNoteForm = clearNoteForm;
        window.setReportDatePreset = setReportDatePreset;
        window.openProjectDetails = openProjectDetails;
    window.openClientReportDetails = openClientReportDetails;
        window.confirmSnehaTaskStart = confirmSnehaTaskStart;
        window.confirmMurugeshClientStart = confirmMurugeshClientStart;
        window.renderDailyPlan = renderDailyPlan; window.openAssignPlanModal = openAssignPlanModal;
        window.setDailyPlanView = setDailyPlanView; window.openDailyPlanTextReport = openDailyPlanTextReport;
        window.copyDailyPlanReport = copyDailyPlanReport;
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
        window.onProjectPeriodModeChange = onProjectPeriodModeChange;
        window.navigateProjectCalendar = navigateProjectCalendar;
        window.submitDmContentIdea = submitDmContentIdea;
        window.navigateStrategyCalendar = navigateStrategyCalendar;
        window.openAddStrategyEventModal = openAddStrategyEventModal;
        window.openEditStrategyEventModal = openEditStrategyEventModal;
        window.closeStrategyEventModal = closeStrategyEventModal;
        window.saveStrategyEvent = saveStrategyEvent;
        window.deleteStrategyEvent = deleteStrategyEvent;
        window.setStrategyClientFilter = setStrategyClientFilter;
        window.renderDiscussionsView = renderDiscussionsView;
        window.saveLiveDiscussionNotes = saveLiveDiscussionNotes;
        window.endCurrentDiscussionLive = endCurrentDiscussionLive;
        window.togglePastDiscussionNotes = togglePastDiscussionNotes;

        function previewUpload(input, spanId) {
            const span = document.getElementById(spanId);
            if (!span) return;
            if (input.files && input.files[0]) {
                span.textContent = input.files[0].name;
            } else {
                span.textContent = 'No file chosen';
            }
        }

        function openImagePreview(src, title = 'Notification Image') {
            const modal = document.getElementById('imagePreviewModal');
            const content = document.getElementById('image-preview-content');
            const titleEl = document.getElementById('image-preview-title');
            if (!modal || !content) return;
            content.src = src;
            if (titleEl) titleEl.textContent = title;
            modal.showModal();
        }

        function getCheckInPendingTasks(userEmail) {
            const stats = getDailyPlanStats(userEmail);
            return stats.tasks.filter(t => !isDone(t.status));
        }

        function showPendingTasksModal(pending) {
            const listEl = document.getElementById('pending-tasks-reminder-list');
            const modal = document.getElementById('pendingTasksReminderModal');
            if (!listEl || !modal) return;

            listEl.innerHTML = pending.map(t => {
                let badgeClass = 'bg-blue-50 text-blue-600 border-blue-100';
                if (isDone(t.status)) badgeClass = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                else if (isInProgress(t.status)) badgeClass = 'bg-amber-50 text-amber-600 border-amber-100';
                const client = t.client ? escapeHtml(t.client) : '—';
                const priority = t.priority ? escapeHtml(t.priority) : '—';
                const carryBadge = t.isCarryOver ? `<span class="text-[8px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">Carry-over</span>` : '';
                return `
                    <div class="bg-white p-3 rounded-xl border border-slate-100 shadow-sm space-y-2">
                        <div class="flex items-start justify-between gap-3">
                            <div class="min-w-0 flex-1">
                                <p class="text-xs font-bold text-slate-800 leading-snug">${escapeHtml(t.desc)}</p>
                                <p class="text-[10px] text-slate-400 font-mono mt-0.5">${escapeHtml(t.id)}</p>
                            </div>
                            <div class="flex flex-col items-end gap-1 shrink-0">
                                <span class="text-[9px] font-bold px-2 py-0.5 rounded-full border ${badgeClass}">${escapeHtml(t.status)}</span>
                                ${carryBadge}
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-2 text-[10px]">
                            <div class="bg-slate-50 rounded-lg px-2 py-1.5 border border-slate-100">
                                <p class="text-slate-400 font-bold uppercase tracking-wider text-[8px]">Client</p>
                                <p class="font-semibold text-slate-700 truncate">${client}</p>
                            </div>
                            <div class="bg-slate-50 rounded-lg px-2 py-1.5 border border-slate-100">
                                <p class="text-slate-400 font-bold uppercase tracking-wider text-[8px]">Priority</p>
                                <p class="font-semibold text-slate-700 truncate">${priority}</p>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            modal.showModal();
        }

        function showCheckInPendingTasksReminder() {
            if (!currentUser) return;
            const pending = getCheckInPendingTasks(currentUser.email);
            if (pending.length > 0) showPendingTasksModal(pending);
        }

        window.previewUpload = previewUpload;
        window.openImagePreview = openImagePreview;
        window.openChatImageGallery = openChatImageGallery;
        window.closeChatImageGallery = closeChatImageGallery;
        window.stepChatImageGallery = stepChatImageGallery;
        window.downloadChatGalleryImage = downloadChatGalleryImage;
        window.removeStagedAttachment = removeStagedAttachment;
        window.showCheckInPendingTasksReminder = showCheckInPendingTasksReminder;
        }
            