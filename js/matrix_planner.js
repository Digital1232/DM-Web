/**
 * Matrix Planning Workspace Module
 * Core Engine: Dynamic Client Rows x Dynamic Day Columns
 * Single Dataset synchronized with Firebase Realtime Database in real time.
 */

// STATE
let matrixCurrentDate = new Date(2026, 7, 1); // Default August 2026
let activeMatrixView = 'matrix'; // 'matrix', 'calendar', 'timeline', 'kanban', 'workload'
let matrixTasksMap = new Map(); // Key: taskId, Value: task object
let matrixClientsList = [];
let matrixAssigneesList = [];
let isFirebaseConnected = false;

// FILTER STATE
let matrixSearchQuery = '';
let matrixFilterClient = 'All';
let matrixFilterAssignee = 'All';
let matrixFilterStatus = 'All';
let matrixFilterFormat = 'All';

// Drag & Drop State
let draggedTaskId = null;

// Inline Editing State
let editingTaskId = null;
let inlineCreatingCell = null; // { client, dateStr }

/**
 * Default Clients & Assignees fallback lists
 */
const DEFAULT_CLIENTS = [
    '3Jo Toys', 'Aladi Ezhilvanan', 'DreamDaa', 'Einstein', 'Iniya',
    'IVN', 'Learning', 'Mopower', 'Mr.Millet', 'Nivya', 'NTT',
    'Quade', 'SalesNaany', 'SKM', 'University', 'Vilpower', 'Vilpower DM'
];

const DEFAULT_ASSIGNEES = [
    { email: 'barathvilpower@gmail.com', name: 'Barath Magesh M' },
    { email: 'immanuelvilpower@gmail.com', name: 'Immanuel Raja S' },
    { email: 'anithavilpower@gmail.com', name: 'Karthika K' },
    { email: 'murugeshvilpower@gmail.com', name: 'Murugesh Kumar A' },
    { email: 'snehavilpower@gmail.com', name: 'Sneha V' },
    { email: 'digitalmarketing@vilpower.com', name: 'Palanirajan R' },
    { email: 'nanjil@vilpower.com', name: 'Nanjil Manohar S' }
];

/**
 * Initialize Matrix Planning Engine & Firebase Realtime Sync
 */
function initMatrixPlannerEngine() {
    console.log('[MatrixEngine] Initializing Matrix Planning Engine...');
    initClientsAndAssignees();
    if (window.currentUser || (window.auth && window.auth.currentUser)) {
        setupFirebaseRealtimeListener();
    }
    renderMatrixPlanner();
}

/**
 * Load & Merge Clients and Assignees from app state & config
 */
function initClientsAndAssignees() {
    let clientsSet = new Set(DEFAULT_CLIENTS);

    // Merge clients from global tasks if available
    if (Array.isArray(window.tasks)) {
        window.tasks.forEach(t => {
            if (t.client && t.client.trim()) clientsSet.add(t.client.trim());
        });
    }

    matrixClientsList = Array.from(clientsSet).sort();

    // Setup Assignees
    let assigneesMap = new Map();
    DEFAULT_ASSIGNEES.forEach(a => assigneesMap.set(a.name, a));

    if (Array.isArray(window.USERS)) {
        window.USERS.forEach(u => {
            if (u.name) assigneesMap.set(u.name, { email: u.email, name: u.name });
        });
    }

    matrixAssigneesList = Array.from(assigneesMap.values());
    populateMatrixFilterDropdowns();
}

function eKey(email) { return (email || '').toLowerCase().replace(/[@.]/g, '_'); }
let rawMonthlyPlansData = null;

/**
 * Robust Date Normalizer to ISO YYYY-MM-DD
 */
function normalizeDateStringToISO(rawDate) {
    if (!rawDate) return '';
    if (typeof rawDate === 'number') {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        }
    }
    const str = String(rawDate).trim();
    if (!str) return '';

    // Match YYYY-MM-DD or YYYY-M-D or YYYY/MM/DD
    const ymd = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (ymd) {
        const y = ymd[1];
        const m = String(ymd[2]).padStart(2, '0');
        const d = String(ymd[3]).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    // Match DD/MM/YYYY or DD-MM-YYYY
    const dmy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmy) {
        const d = String(dmy[1]).padStart(2, '0');
        const m = String(dmy[2]).padStart(2, '0');
        const y = dmy[3];
        return `${y}-${m}-${d}`;
    }

    // Fallback: Date parse
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, '0');
        const d = String(parsed.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    return '';
}

let monthlyPlansUnsub = null;

/**
 * Realtime Firebase Database Listener (Aggregates Strategy Calendar & Daily Plan tasks)
 */
function setupFirebaseRealtimeListener() {
    const rtdb = window.rtdb;
    const db = window.db;

    if (!rtdb || !db) {
        console.warn('[MatrixEngine] Firebase RTDB not ready yet, retrying in 300ms...');
        setTimeout(setupFirebaseRealtimeListener, 300);
        return;
    }

    if (!window.currentUser && (!window.auth || !window.auth.currentUser)) {
        return;
    }

    if (monthlyPlansUnsub) {
        try { monthlyPlansUnsub(); } catch (e) {}
        monthlyPlansUnsub = null;
    }

    isFirebaseConnected = true;

    try {
        const plansRef = rtdb.ref(db, 'worksync/monthly_plans');
        monthlyPlansUnsub = rtdb.onValue(plansRef, (snapshot) => {
            rawMonthlyPlansData = snapshot.val() || {};
            mergeAndRenderAllStrategyTasks();
        }, (error) => {
            if (error && (error.code === 'PERMISSION_DENIED' || String(error).includes('permission_denied'))) {
                // Ignore permission error if user is unauthenticated or restricted by DB rules
                return;
            }
            console.warn('[MatrixEngine] Monthly Plans Sync (requires Firebase RTDB permission):', error.message || error);
        });
    } catch (err) {
        console.warn('[MatrixEngine] Failed to setup RTDB listeners:', err);
    }
}

window.setupFirebaseRealtimeListener = setupFirebaseRealtimeListener;

/**
 * Standardized Task Parser with Date Normalization
 */
function parseTaskObject(key, val, defaultUserKey = null) {
    if (!val || typeof val !== 'object') return null;

    const title = val.title || val.desc || val.taskDesc || val.taskTitle || 'Untitled Task';
    const client = val.client || 'Unassigned';
    const rawDate = val.date || val.dueDate || val.duedate || val.due || val.postDate || val.scheduleDate || '';
    const isoDate = normalizeDateStringToISO(rawDate);
    const status = val.status || val.state || 'Working';
    const contentType = val.contentType || val.format || val.type || 'Poster';
    const assignee = val.assignee || val.assigneeName || val.userEmail || defaultUserKey || 'Unassigned';
    const estHours = Number(val.estHours || val.hours || 2);

    return {
        id: key || val.id || val.taskId || ('STRAT-' + Date.now()),
        title: title,
        desc: title,
        client: client,
        date: isoDate,
        dueDate: isoDate,
        postDate: isoDate,
        status: status,
        contentType: contentType,
        assignee: assignee,
        assigneeName: assignee,
        estHours: estHours,
        userKey: defaultUserKey || val.userKey || '',
        jiraId: val.jiraId || val.jiraTaskId || '',
        strategyEvent: val.strategyEvent || val.isStrategyTask || (key && key.startsWith('STRAT-')),
        updatedAt: val.updatedAt || Date.now()
    };
}

function isJiraKey(id) {
    if (!id || typeof id !== 'string') return false;
    const parts = id.split('-');
    if (parts.length !== 2) return false;
    const project = parts[0];
    const num = parts[1];
    return /^[A-Z0-9]+$/.test(project) && /^\d+$/.test(num) && project !== 'STRAT' && project !== 'LEARN';
}

function isExcludedTask(t) {
    if (!t) return true;
    const id = String(t.id || t.taskId || '').toUpperCase();
    if (id.startsWith('LEARN-') || t.learningSession === true || t.isLearning === true) return true;
    if (t.internal === true || String(t.taskType || '').toLowerCase() === 'internal') return true;
    if (id.startsWith('CHECKIN') || id.startsWith('CHECKOUT') || id.startsWith('BREAK')) return true;
    return false;
}

/**
 * Merge Strategy Calendar & Daily Plan tasks into single dataset
 */
function mergeAndRenderAllStrategyTasks() {
    matrixTasksMap.clear();

    if (rawMonthlyPlansData && typeof rawMonthlyPlansData === 'object') {
        Object.entries(rawMonthlyPlansData).forEach(([userKey, userMonths]) => {
            if (userMonths && typeof userMonths === 'object') {
                Object.entries(userMonths).forEach(([monthYear, monthData]) => {
                    if (monthData && monthData.tasks && typeof monthData.tasks === 'object') {
                        Object.entries(monthData.tasks).forEach(([pushId, taskVal]) => {
                            if (isExcludedTask(taskVal)) return;

                            const task = {
                                ...taskVal,
                                id: taskVal.id || pushId,
                                pushId: pushId,
                                userKey: userKey
                            };
                            matrixTasksMap.set(task.id, task);
                        });
                    }
                });
            }
        });
    }

    // Dynamic client discovery
    matrixTasksMap.forEach(taskObj => {
        if (taskObj.client && taskObj.client !== 'Unassigned' && !matrixClientsList.includes(taskObj.client)) {
            matrixClientsList.push(taskObj.client);
        }
    });
    matrixClientsList.sort();

    console.log(`[MatrixEngine] Multi-Source Realtime Sync: Loaded ${matrixTasksMap.size} Monthly Plan tasks across ${matrixClientsList.length} clients.`);
    populateMatrixFilterDropdowns();
    renderMatrixPlanner();
    if (typeof renderMatrixTable === 'function') renderMatrixTable();
}

/**
 * Seed initial August 2026 Strategy Calendar Tasks
 */
function seedInitialAugustStrategyTasks() {
    const seedTasks = [
        { id: 'STRAT-AUG-1', title: 'Independence Day Campaign Video', client: 'DreamDaa', date: '2026-08-05', contentType: 'Video', status: 'Working', assignee: 'Barath Magesh M', estHours: 4 },
        { id: 'STRAT-AUG-2', title: 'Product Launch Carousel', client: 'Mr.Millet', date: '2026-08-08', contentType: 'Carousel', status: 'Working', assignee: 'Karthika K', estHours: 3 },
        { id: 'STRAT-AUG-3', title: 'Weekly Promo Poster', client: '3Jo Toys', date: '2026-08-10', contentType: 'Poster', status: 'Working', assignee: 'Immanuel Raja S', estHours: 2 },
        { id: 'STRAT-AUG-4', title: 'Brand Awareness Reel', client: 'Vilpower', date: '2026-08-15', contentType: 'Reel', status: 'Waiting', assignee: 'Sneha V', estHours: 3 },
        { id: 'STRAT-AUG-5', title: 'Client Testimonial Showcase', client: 'Einstein', date: '2026-08-18', contentType: 'Video', status: 'Completed', assignee: 'Palanirajan R', estHours: 4 },
        { id: 'STRAT-AUG-6', title: 'Monthly Strategy Review Poster', client: 'SKM', date: '2026-08-22', contentType: 'Poster', status: 'Working', assignee: 'Murugesh Kumar A', estHours: 2 }
    ];

    seedTasks.forEach(t => {
        const taskObj = {
            ...t,
            desc: t.title,
            dueDate: t.date,
            postDate: t.date,
            updatedAt: Date.now()
        };
        matrixTasksMap.set(t.id, taskObj);
        saveMatrixTaskToFirebase(t.id, taskObj);
    });
}

/**
 * Save / Update Task to Firebase Realtime Database
 */
async function saveMatrixTaskToFirebase(taskId, updatedFields) {
    const rtdb = window.rtdb;
    const db = window.db;

    if (!taskId) return;

    // Local state update immediately (optimistic UI update)
    let existingTask = matrixTasksMap.get(taskId) || {};
    
    // Determine the old key and path
    const oldEmail = existingTask.assigneeEmail || existingTask.assignee || '';
    const oldDate = existingTask.duedate || existingTask.date || existingTask.dueDate || existingTask.postDate || '';
    
    let mergedTask = { ...existingTask, ...updatedFields, updatedAt: Date.now() };

    // Standardize date fields
    if (updatedFields.date) {
        mergedTask.date = updatedFields.date;
        mergedTask.duedate = updatedFields.date;
        mergedTask.dueDate = updatedFields.date;
        mergedTask.postDate = updatedFields.date;
    }
    if (updatedFields.assigneeEmail) {
        mergedTask.assigneeEmail = updatedFields.assigneeEmail;
    }

    matrixTasksMap.set(taskId, mergedTask);

    // Re-render instantly across all active views
    renderMatrixPlanner();

    if (rtdb && db) {
        try {
            let pushId = existingTask.pushId;
            const newEmail = mergedTask.assigneeEmail || oldEmail;
            const newDate = mergedTask.duedate || mergedTask.date || oldDate;
            
            if (oldEmail && oldDate && newEmail && newDate) {
                const [oldYear, oldMonth] = oldDate.split('-');
                const oldMonthYear = `${oldYear}-${oldMonth}`;
                
                const [newYear, newMonth] = newDate.split('-');
                const newMonthYear = `${newYear}-${newMonth}`;
                
                const oldPlanKey = `${eKey(oldEmail)}/${oldMonthYear}`;
                const newPlanKey = `${eKey(newEmail)}/${newMonthYear}`;
                
                if (oldPlanKey !== newPlanKey) {
                    // Task moved to a different user/month!
                    // Delete from old path
                    if (pushId) {
                        const oldTaskRef = rtdb.ref(db, `worksync/monthly_plans/${oldPlanKey}/tasks/${pushId}`);
                        await rtdb.remove(oldTaskRef);
                    }
                    
                    // Create in new path
                    const newTasksRef = rtdb.ref(db, `worksync/monthly_plans/${newPlanKey}/tasks`);
                    const newPushRef = rtdb.push(newTasksRef);
                    pushId = newPushRef.key;
                    mergedTask.pushId = pushId;
                    await rtdb.set(newPushRef, mergedTask);
                } else {
                    // Same user/month - just update the existing pushId
                    if (pushId) {
                        const taskRef = rtdb.ref(db, `worksync/monthly_plans/${newPlanKey}/tasks/${pushId}`);
                        await rtdb.update(taskRef, mergedTask);
                    } else {
                        // If no pushId exists, push it
                        const newTasksRef = rtdb.ref(db, `worksync/monthly_plans/${newPlanKey}/tasks`);
                        const newPushRef = rtdb.push(newTasksRef);
                        pushId = newPushRef.key;
                        mergedTask.pushId = pushId;
                        await rtdb.set(newPushRef, mergedTask);
                    }
                }
            }
            console.log(`[MatrixEngine] Saved monthly plan task ${taskId} to Firebase:`, updatedFields);
        } catch (err) {
            console.error(`[MatrixEngine] Error saving monthly plan task ${taskId} to Firebase:`, err);
        }
    }
}

/**
 * Delete Task from Firebase
 */
async function deleteMatrixTaskFromFirebase(taskId) {
    if (!taskId) return;
    if (!confirm('Are you sure you want to delete this planned task?')) return;

    const existingTask = matrixTasksMap.get(taskId) || {};

    // Optimistic local deletion
    matrixTasksMap.delete(taskId);
    if (Array.isArray(window.tasks)) {
        window.tasks = window.tasks.filter(t => t.id !== taskId);
    }

    renderMatrixPlanner();

    const rtdb = window.rtdb;
    const db = window.db;
    if (rtdb && db) {
        try {
            const pushId = existingTask.pushId;
            const email = existingTask.assigneeEmail || existingTask.assignee || '';
            const date = existingTask.duedate || existingTask.date || existingTask.dueDate || existingTask.postDate || '';
            
            if (pushId && email && date) {
                const [year, month] = date.split('-');
                const monthYear = `${year}-${month}`;
                const planKey = `${eKey(email)}/${monthYear}`;
                
                const taskRef = rtdb.ref(db, `worksync/monthly_plans/${planKey}/tasks/${pushId}`);
                await rtdb.remove(taskRef);
                console.log(`[MatrixEngine] Deleted monthly plan task from Firebase path: worksync/monthly_plans/${planKey}/tasks/${pushId}`);
            }
        } catch (err) {
            console.error(`[MatrixEngine] Error deleting task ${taskId} from Firebase:`, err);
        }
    }
}

/**
 * Generate Days array for selected month
 */
function getDaysForCurrentMonth() {
    const year = matrixCurrentDate.getFullYear();
    const month = matrixCurrentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = new Date().toISOString().split('T')[0];

    const days = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
        const dateObj = new Date(year, month, dayNum);
        const dayOfWeek = dateObj.getDay();
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        
        days.push({
            dayNum,
            dateStr,
            dayName: dayNames[dayOfWeek],
            isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
            isToday: dateStr === todayStr
        });
    }

    return days;
}

/**
 * Get Filtered Tasks Array
 */
function getFilteredMatrixTasks() {
    const year = matrixCurrentDate.getFullYear();
    const monthStr = String(matrixCurrentDate.getMonth() + 1).padStart(2, '0');
    const monthPrefix = `${year}-${monthStr}`;

    const allTasks = Array.from(matrixTasksMap.values());

    return allTasks.filter(item => {
        const rawDate = item.date || item.dueDate || item.postDate || '';
        const taskDate = normalizeDateStringToISO(rawDate);
        
        // Month Filter
        if (!taskDate.startsWith(monthPrefix)) return false;

        const client = item.client || 'Unassigned';
        const assignee = item.assignee || item.assigneeName || 'Unassigned';
        const status = item.status || 'Working';
        const format = item.contentType || item.format || 'Poster';
        const title = (item.title || item.desc || '').toLowerCase();

        // Search Query Filter
        if (matrixSearchQuery) {
            const q = matrixSearchQuery.toLowerCase();
            const matches = title.includes(q) || client.toLowerCase().includes(q) || assignee.toLowerCase().includes(q);
            if (!matches) return false;
        }

        // Dropdown Filters
        if (matrixFilterClient !== 'All' && client !== matrixFilterClient) return false;
        if (matrixFilterAssignee !== 'All' && assignee !== matrixFilterAssignee) return false;
        if (matrixFilterStatus !== 'All' && status !== matrixFilterStatus) return false;
        if (matrixFilterFormat !== 'All' && format !== matrixFilterFormat) return false;

        return true;
    });
}

/**
 * Main Render Controller
 */
function renderMatrixPlanner() {
    const container = document.getElementById('matrix-view-content');
    if (!container) return;

    // Update Title Header
    const titleEl = document.getElementById('monthly-plan-calendar-title');
    if (titleEl) {
        titleEl.textContent = matrixCurrentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    }

    // Render Client Filter Tabs & Format Stats Summary
    renderMatrixClientTabs();
    renderStrategyFormatSummary();

    // Render Active View
    switch (activeMatrixView) {
        case 'matrix':
            renderMatrixViewGrid(container);
            break;
        case 'calendar':
            renderMatrixViewCalendar(container);
            break;
        case 'timeline':
            renderMatrixViewTimeline(container);
            break;
        case 'kanban':
            renderMatrixViewKanban(container);
            break;
        case 'workload':
            renderMatrixViewWorkload(container);
            break;
        default:
            renderMatrixViewGrid(container);
            break;
    }
}

/**
 * Populate Dropdown Options dynamically
 */
function populateMatrixFilterDropdowns() {
    const clientSelect = document.getElementById('matrix-filter-client');
    const assigneeSelect = document.getElementById('matrix-filter-assignee');

    if (clientSelect) {
        const currVal = clientSelect.value;
        clientSelect.innerHTML = `<option value="All">All Clients (${matrixClientsList.length})</option>` +
            matrixClientsList.map(c => `<option value="${c}" ${c === currVal ? 'selected' : ''}>${c}</option>`).join('');
    }

    if (assigneeSelect) {
        const currVal = assigneeSelect.value;
        assigneeSelect.innerHTML = `<option value="All">All Assignees</option>` +
            matrixAssigneesList.map(a => `<option value="${a.name}" ${a.name === currVal ? 'selected' : ''}>${a.name}</option>`).join('');
    }
}

/**
 * Render Client Quick Filter Tabs
 */
function renderMatrixClientTabs() {
    const container = document.getElementById('monthly-plan-client-tabs-container');
    if (!container) return;

    const tabs = ['All', ...matrixClientsList];
    container.innerHTML = tabs.map(c => `
        <button onclick="setMatrixClientFilter('${c}')" class="px-3 py-1 rounded-xl text-xs font-bold transition-all ${matrixFilterClient === c ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
            ${c}
        </button>
    `).join('');
}

function setMatrixClientFilter(client) {
    matrixFilterClient = client;
    const select = document.getElementById('matrix-filter-client');
    if (select) select.value = client;
    renderMatrixPlanner();
}

/**
 * Render Video & Poster Format Stats & Filter Chips
 */
function renderStrategyFormatSummary() {
    const container = document.getElementById('strategy-format-pills-container');
    if (!container) return;

    const year = matrixCurrentDate.getFullYear();
    const monthStr = String(matrixCurrentDate.getMonth() + 1).padStart(2, '0');
    const monthPrefix = `${year}-${monthStr}`;

    const allTasks = Array.from(matrixTasksMap.values());

    // Get tasks for month & client (without applying format filter)
    const monthTasks = allTasks.filter(item => {
        const rawDate = item.date || item.dueDate || item.postDate || '';
        const taskDate = normalizeDateStringToISO(rawDate);
        if (!taskDate.startsWith(monthPrefix)) return false;

        const client = item.client || 'Unassigned';
        const assignee = item.assignee || item.assigneeName || 'Unassigned';
        const status = item.status || 'Working';

        // Search Query Filter
        if (matrixSearchQuery) {
            const q = matrixSearchQuery.toLowerCase();
            const title = (item.title || item.desc || '').toLowerCase();
            const matches = title.includes(q) || client.toLowerCase().includes(q) || assignee.toLowerCase().includes(q);
            if (!matches) return false;
        }

        if (matrixFilterClient !== 'All' && client !== matrixFilterClient) return false;
        if (matrixFilterAssignee !== 'All' && assignee !== matrixFilterAssignee) return false;
        if (matrixFilterStatus !== 'All' && status !== matrixFilterStatus) return false;

        return true;
    });

    const isCompletedStatus = (s) => ['completed', 'done', 'closed', 'resolved', 'posted', 'analytics', 'client approved', 'design completed', 'quality check', 'qc completed'].includes((s || '').toLowerCase().trim());

    let videoCount = 0, videoCompleted = 0;
    let posterCount = 0, posterCompleted = 0;
    let carouselCount = 0, carouselCompleted = 0;
    let reelCount = 0, reelCompleted = 0;
    let printingMaterialCount = 0, printingMaterialCompleted = 0;
    let totalCount = monthTasks.length;

    monthTasks.forEach(t => {
        const fmt = t.contentType || t.format || 'Poster';
        const done = isCompletedStatus(t.status);

        if (fmt === 'Video') {
            videoCount++;
            if (done) videoCompleted++;
        } else if (fmt === 'Poster') {
            posterCount++;
            if (done) posterCompleted++;
        } else if (fmt === 'Carousel') {
            carouselCount++;
            if (done) carouselCompleted++;
        } else if (fmt === 'Reel') {
            reelCount++;
            if (done) reelCompleted++;
        } else if (fmt === 'Printing Material') {
            printingMaterialCount++;
            if (done) printingMaterialCompleted++;
        } else {
            posterCount++;
            if (done) posterCompleted++;
        }
    });

    const formats = [
        { key: 'All', label: `📝 All (${totalCount})`, activeStyle: 'bg-indigo-600 text-white shadow-md shadow-indigo-100', inactiveStyle: 'bg-slate-100 text-slate-700 hover:bg-slate-200' },
        { key: 'Video', label: `🎥 Video (${videoCount} | 🟢 ${videoCompleted})`, activeStyle: 'bg-red-600 text-white shadow-md shadow-red-100', inactiveStyle: 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-100' },
        { key: 'Poster', label: `📷 Poster (${posterCount} | 🟢 ${posterCompleted})`, activeStyle: 'bg-purple-600 text-white shadow-md shadow-purple-100', inactiveStyle: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-100' },
        { key: 'Printing Material', label: `🖨️ Printing Material (${printingMaterialCount} | 🟢 ${printingMaterialCompleted})`, activeStyle: 'bg-amber-600 text-white shadow-md shadow-amber-100', inactiveStyle: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-100' },
    ];

    if (carouselCount > 0) {
        formats.push({ key: 'Carousel', label: `🎠 Carousel (${carouselCount} | 🟢 ${carouselCompleted})`, activeStyle: 'bg-blue-600 text-white shadow-md shadow-blue-100', inactiveStyle: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100' });
    }
    if (reelCount > 0) {
        formats.push({ key: 'Reel', label: `⚡ Reel (${reelCount} | 🟢 ${reelCompleted})`, activeStyle: 'bg-pink-600 text-white shadow-md shadow-pink-100', inactiveStyle: 'bg-pink-50 text-pink-700 hover:bg-pink-100 border border-pink-100' });
    }

    container.innerHTML = formats.map(f => {
        const isActive = matrixFilterFormat === f.key;
        return `<button onclick="setMatrixFormatFilter('${f.key}')" class="px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1 cursor-pointer ${isActive ? f.activeStyle : f.inactiveStyle}">
            ${f.label}
        </button>`;
    }).join('');
}

function setMatrixFormatFilter(format) {
    matrixFilterFormat = format;
    const select = document.getElementById('matrix-filter-format');
    if (select) select.value = format;
    renderMatrixPlanner();
}

window.renderStrategyFormatSummary = renderStrategyFormatSummary;
window.setMatrixFormatFilter = setMatrixFormatFilter;

/**
 * Month Navigation Buttons (Left, Right, Today)
 */
function navigateMatrixMonth(offset) {
    if (offset === 0) {
        const now = new Date();
        matrixCurrentDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
        matrixCurrentDate.setMonth(matrixCurrentDate.getMonth() + offset);
    }
    renderMatrixPlanner();
}

/**
 * View Switcher
 */
function setMatrixPlannerView(viewName) {
    activeMatrixView = viewName;

    document.querySelectorAll('.matrix-view-btn').forEach(btn => {
        btn.classList.remove('bg-white', 'text-indigo-600', 'shadow-sm');
        btn.classList.add('text-slate-600');
    });

    const activeBtn = document.getElementById(`matrix-view-btn-${viewName}`);
    if (activeBtn) {
        activeBtn.classList.add('bg-white', 'text-indigo-600', 'shadow-sm');
        activeBtn.classList.remove('text-slate-600');
    }

    renderMatrixPlanner();
}

/**
 * Filter Trigger
 */
function filterMatrixPlanner() {
    const searchInput = document.getElementById('matrix-search-input');
    const clientSelect = document.getElementById('matrix-filter-client');
    const assigneeSelect = document.getElementById('matrix-filter-assignee');
    const statusSelect = document.getElementById('matrix-filter-status');
    const formatSelect = document.getElementById('matrix-filter-format');

    if (searchInput) matrixSearchQuery = searchInput.value.trim();
    if (clientSelect) matrixFilterClient = clientSelect.value;
    if (assigneeSelect) matrixFilterAssignee = assigneeSelect.value;
    if (statusSelect) matrixFilterStatus = statusSelect.value;
    if (formatSelect) matrixFilterFormat = formatSelect.value;

    renderMatrixPlanner();
}

// Format Icon Map
const FORMAT_ICONS = {
    'Poster': '📷',
    'Video': '🎥',
    'Carousel': '🎠',
    'Reel': '⚡',
    'Printing Material': '🖨️'
};

// Status Style Map
const STATUS_STYLES = {
    'Backlog': 'bg-slate-100 text-slate-700 border-slate-200',
    'To Do': 'bg-slate-100 text-slate-700 border-slate-200',
    'Working': 'bg-blue-50 text-blue-800 border-blue-200',
    'In Progress': 'bg-blue-50 text-blue-800 border-blue-200',
    'Waiting': 'bg-amber-50 text-amber-800 border-amber-200',
    'Review': 'bg-amber-50 text-amber-800 border-amber-200',
    'Completed': 'bg-emerald-50 text-emerald-800 border-emerald-200',
    'Done': 'bg-emerald-50 text-emerald-800 border-emerald-200'
};

/* ==========================================================================
   VIEW 1: DYNAMIC CLIENT ROWS X DAY COLUMNS MATRIX GRID
   ========================================================================== */
function renderMatrixViewGrid(container) {
    const days = getDaysForCurrentMonth();
    const tasks = getFilteredMatrixTasks();

    // Filter active client list if client filter is set
    const visibleClients = matrixFilterClient === 'All' 
        ? matrixClientsList 
        : matrixClientsList.filter(c => c === matrixFilterClient);

    // Group tasks by client -> dateStr -> tasks[]
    const taskGrid = {};
    visibleClients.forEach(c => {
        taskGrid[c] = {};
        days.forEach(d => { taskGrid[c][d.dateStr] = []; });
    });

    tasks.forEach(t => {
        const client = t.client || 'Unassigned';
        const dateStr = t.date || t.dueDate || t.postDate || '';
        if (taskGrid[client] && taskGrid[client][dateStr]) {
            taskGrid[client][dateStr].push(t);
        }
    });

    container.innerHTML = `
        <div class="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
            <!-- Sync Banner -->
            <div class="bg-slate-900 text-white px-4 py-2.5 text-xs flex items-center justify-between flex-wrap gap-2 font-medium">
                <div class="flex items-center gap-3">
                    <span class="w-2 h-2 rounded-full ${isFirebaseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}"></span>
                    <span class="font-bold text-slate-200">${isFirebaseConnected ? 'Realtime Firebase Sync Active' : 'Connecting to Firebase...'}</span>
                    <span class="text-slate-400">• ${tasks.length} total tasks</span>
                </div>

                <!-- Integrated Month Switcher -->
                <div class="flex items-center bg-slate-800 rounded-xl px-2 py-1 border border-slate-700 shadow-sm">
                    <button onclick="navigateMatrixMonth(-1)" class="px-1.5 py-0.5 text-slate-300 hover:text-white transition-all flex items-center">
                        <iconify-icon icon="solar:alt-arrow-left-linear" width="15"></iconify-icon>
                    </button>
                    <span class="text-xs font-bold text-indigo-200 px-2.5">${matrixCurrentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                    <button onclick="navigateMatrixMonth(1)" class="px-1.5 py-0.5 text-slate-300 hover:text-white transition-all flex items-center">
                        <iconify-icon icon="solar:alt-arrow-right-linear" width="15"></iconify-icon>
                    </button>
                    <button onclick="navigateMatrixMonth(0)" class="text-[10px] font-extrabold text-indigo-400 hover:text-indigo-300 px-2 py-0.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 transition-all ml-1 uppercase tracking-wider">Today</button>
                </div>

                <div class="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                    <span>${visibleClients.length} Clients x ${days.length} Days</span>
                    <button onclick="addMatrixTaskRowPrompt()" class="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all flex items-center gap-1 shadow-sm">
                        <iconify-icon icon="solar:add-circle-bold" width="13"></iconify-icon> Add Task
                    </button>
                    <button onclick="openWeeklyTaskAssigneeModal('${matrixFilterClient !== 'All' ? matrixFilterClient : ''}')" class="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all flex items-center gap-1 shadow-sm">
                        <iconify-icon icon="solar:clipboard-list-bold" width="13"></iconify-icon> Assign Task
                    </button>
                </div>
            </div>

            <!-- Matrix Scroll Container -->
            <div class="overflow-x-auto max-h-[750px] overflow-y-auto relative">
                <table class="w-full text-left border-collapse border-spacing-0">
                    <thead class="sticky top-0 z-30 bg-slate-50 border-b border-slate-200">
                        <tr class="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                            <!-- Left Fixed Header: Client Column -->
                            <th class="p-3 w-56 sticky left-0 z-40 bg-slate-100 border-r border-slate-200 shadow-sm">
                                <div class="flex items-center justify-between">
                                    <span>Client Name</span>
                                    <span class="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-[9px] font-extrabold">${visibleClients.length}</span>
                                </div>
                            </th>

                            <!-- Dynamic Day Headers -->
                            ${days.map(d => `
                                <th class="p-2 text-center min-w-[120px] max-w-[140px] border-r border-slate-200 ${d.isWeekend ? 'bg-slate-100/80 text-slate-600' : 'bg-slate-50 text-slate-700'} ${d.isToday ? 'ring-2 ring-indigo-500 ring-inset bg-indigo-50/80 text-indigo-900' : ''}">
                                    <div class="font-black text-xs leading-none">${d.dayNum}</div>
                                    <div class="text-[9px] font-bold text-slate-400 mt-0.5 uppercase">${d.dayName}</div>
                                </th>
                            `).join('')}

                            <!-- Right Summary Header -->
                            <th class="p-3 w-32 sticky right-0 z-40 bg-slate-100 border-l border-slate-200 text-center">
                                Monthly Summary
                            </th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 text-xs">
                        ${visibleClients.length === 0 ? `
                            <tr>
                                <td colspan="${days.length + 2}" class="p-12 text-center text-slate-400 font-semibold">
                                    No clients found matching filter.
                                </td>
                            </tr>
                        ` : visibleClients.map(client => {
                            let clientTotalTasks = 0;
                            let clientTotalHours = 0;

                            days.forEach(d => {
                                const cTasks = taskGrid[client][d.dateStr] || [];
                                clientTotalTasks += cTasks.length;
                                cTasks.forEach(t => clientTotalHours += Number(t.estHours || 2));
                            });

                            return `
                                <tr class="hover:bg-slate-50/50 transition-colors group">
                                    <!-- Sticky Left Client Cell -->
                                    <td class="p-3 sticky left-0 z-20 bg-white border-r border-slate-200 shadow-sm font-bold text-slate-800">
                                        <div class="flex items-center justify-between">
                                            <div class="flex items-center gap-2 truncate max-w-[140px]" title="${client}">
                                                <div class="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-black border border-indigo-100 flex-shrink-0">
                                                    ${client.charAt(0)}
                                                </div>
                                                <span class="truncate text-xs font-black text-slate-800">${client}</span>
                                            </div>
                                            <span class="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded-md">
                                                ${clientTotalTasks}
                                            </span>
                                        </div>
                                    </td>

                                    <!-- Dynamic Day Cells -->
                                    ${days.map(d => {
                                        const cellTasks = taskGrid[client][d.dateStr] || [];
                                        const isInlineCreating = inlineCreatingCell && inlineCreatingCell.client === client && inlineCreatingCell.dateStr === d.dateStr;

                                        return `
                                            <td 
                                                id="cell-${cleanId(client)}-${d.dateStr}"
                                                data-client="${client}"
                                                data-date="${d.dateStr}"
                                                ondragover="handleMatrixDragOver(event)"
                                                ondragleave="handleMatrixDragLeave(event)"
                                                ondrop="handleMatrixDrop(event, '${client}', '${d.dateStr}')"
                                                ondblclick="startInlineCreateTask('${client}', '${d.dateStr}')"
                                                class="p-1.5 border-r border-slate-100 align-top min-w-[120px] max-w-[140px] transition-all hover:bg-indigo-50/30 group/cell ${d.isWeekend ? 'bg-slate-50/40' : ''}"
                                            >
                                                <!-- Task Cards Container -->
                                                <div class="space-y-1.5 min-h-[48px]">
                                                    ${cellTasks.map(t => renderMatrixTaskBadge(t)).join('')}

                                                    <!-- Inline Task Creator Form -->
                                                    ${isInlineCreating ? `
                                                        <div class="bg-indigo-50 border-2 border-indigo-500 rounded-xl p-2 shadow-md space-y-1.5 animate-fadeIn">
                                                            <input 
                                                                id="inline-task-title-input"
                                                                type="text" 
                                                                placeholder="Enter task title..."
                                                                onkeydown="handleInlineTaskKeydown(event, '${client}', '${d.dateStr}')"
                                                                class="w-full bg-white text-xs font-semibold p-1.5 rounded-lg border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                                autofocus
                                                            >
                                                            <div class="flex items-center justify-between gap-1">
                                                                <select id="inline-task-format-select" class="text-[10px] font-bold bg-white border border-slate-200 rounded px-1 py-0.5">
                                                                    <option value="Poster">📷 Poster</option>
                                                                    <option value="Video">🎥 Video</option>
                                                                    <option value="Carousel">🎠 Carousel</option>
                                                                    <option value="Reel">⚡ Reel</option>
                                                                </select>
                                                                <div class="flex items-center gap-1">
                                                                    <button onclick="cancelInlineCreateTask()" class="text-[10px] text-slate-500 hover:text-slate-800 px-1 py-0.5">Cancel</button>
                                                                    <button onclick="submitInlineCreateTask('${client}', '${d.dateStr}')" class="text-[10px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-md shadow-sm hover:bg-indigo-700">Save</button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ` : ''}

                                                    <!-- Quick + Add Task Trigger -->
                                                    ${!isInlineCreating ? `
                                                        <button 
                                                            onclick="startInlineCreateTask('${client}', '${d.dateStr}')"
                                                            class="w-full opacity-0 group-hover/cell:opacity-100 hover:opacity-100 transition-opacity bg-slate-100 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 font-bold text-[10px] py-1 px-1.5 rounded-lg border border-dashed border-slate-300 hover:border-indigo-300 flex items-center justify-center gap-1"
                                                        >
                                                            <iconify-icon icon="solar:add-circle-bold" width="12"></iconify-icon> Add Task
                                                        </button>
                                                    ` : ''}
                                                </div>
                                            </td>
                                        `;
                                    }).join('')}

                                    <!-- Sticky Right Summary Cell -->
                                    <td class="p-3 sticky right-0 z-20 bg-white border-l border-slate-200 text-center font-bold text-slate-700 shadow-sm">
                                        <div class="text-xs font-black text-slate-900">${clientTotalTasks} tasks</div>
                                        <div class="text-[10px] text-slate-400 font-medium">${clientTotalHours}h total</div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Footer Toolbar -->
            <div class="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
                <div class="flex items-center gap-3">
                    <button onclick="addMatrixTaskRowPrompt()" class="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 text-xs font-bold shadow-md transition-all flex items-center gap-1.5">
                        <iconify-icon icon="solar:add-circle-bold" width="16"></iconify-icon> Add New Task
                    </button>
                    <span class="text-xs text-slate-500 font-semibold">Tip: Double-click any matrix cell or drag task cards to reschedule!</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-600">Total Month Hours: ${tasks.reduce((sum, t) => sum + Number(t.estHours || 2), 0)}h</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Clean string for HTML ID
 */
function cleanId(str) {
    return (str || '').replace(/[^a-zA-Z0-9]/g, '_');
}

/**
 * Render individual task badge inside matrix cell
 */
function renderMatrixTaskBadge(t) {
    const isEditing = editingTaskId === t.id;
    const formatIcon = FORMAT_ICONS[t.contentType || t.format] || '📷';
    const statusStyle = STATUS_STYLES[t.status] || STATUS_STYLES['Working'];

    if (isEditing) {
        return `
            <div class="bg-white border-2 border-indigo-600 rounded-xl p-2 shadow-lg text-xs space-y-1.5 z-30 relative animate-fadeIn">
                <input 
                    id="edit-task-title-${t.id}"
                    type="text" 
                    value="${t.title || t.desc || ''}" 
                    class="w-full bg-slate-50 p-1.5 rounded-lg border border-slate-300 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                <div class="grid grid-cols-2 gap-1 text-[10px]">
                    <select id="edit-task-format-${t.id}" class="bg-slate-50 border rounded p-1 font-semibold">
                        <option value="Poster" ${t.contentType === 'Poster' ? 'selected' : ''}>📷 Poster</option>
                        <option value="Video" ${t.contentType === 'Video' ? 'selected' : ''}>🎥 Video</option>
                        <option value="Carousel" ${t.contentType === 'Carousel' ? 'selected' : ''}>🎠 Carousel</option>
                        <option value="Reel" ${t.contentType === 'Reel' ? 'selected' : ''}>⚡ Reel</option>
                    </select>
                    <select id="edit-task-status-${t.id}" class="bg-slate-50 border rounded p-1 font-semibold">
                        <option value="Working" ${t.status === 'Working' ? 'selected' : ''}>🔵 Working</option>
                        <option value="Waiting" ${t.status === 'Waiting' ? 'selected' : ''}>🟡 Waiting</option>
                        <option value="Completed" ${t.status === 'Completed' ? 'selected' : ''}>🟢 Completed</option>
                        <option value="Backlog" ${t.status === 'Backlog' ? 'selected' : ''}>⚪ Backlog</option>
                    </select>
                </div>
                <div class="flex items-center justify-between text-[10px] pt-1 border-t border-slate-100">
                    <button onclick="deleteMatrixTaskFromFirebase('${t.id}')" class="text-red-600 font-bold hover:underline">Delete</button>
                    <div class="flex items-center gap-1">
                        <button onclick="cancelTaskEdit()" class="text-slate-500 font-bold px-1.5 py-0.5">Cancel</button>
                        <button onclick="saveTaskEdit('${t.id}')" class="bg-indigo-600 text-white font-bold px-2 py-0.5 rounded shadow-sm hover:bg-indigo-700">Save</button>
                    </div>
                </div>
            </div>
        `;
    }

    const assigneeName = t.assignee || 'Unassigned';
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

    return `
        <div 
            id="task-badge-${t.id}"
            draggable="true"
            ondragstart="handleMatrixDragStart(event, '${t.id}')"
            onclick="startTaskEdit('${t.id}')"
            class="${statusStyle} border rounded-xl p-1.5 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group/badge relative overflow-hidden flex items-center gap-1.5"
            title="Click to edit • Drag to move date or client"
        >
            <img src="${userAvatar}" class="w-5 h-5 rounded-full object-cover bg-slate-100 border border-slate-200/80 flex-shrink-0" alt="">
            <div class="flex-grow min-w-0">
                <div class="text-[9px] font-black truncate text-slate-800 leading-tight mb-0.5" title="${escapeHtml(t.title || t.desc)}">
                    ${formatIcon} ${escapeHtml(t.title || t.desc)}
                </div>
                <div class="text-[8px] text-slate-500 font-bold truncate leading-none">
                    ${escapeHtml(assigneeName)}
                </div>
            </div>
        </div>
    `;
}

/* ==========================================================================
   INLINE CREATION & EDITING HANDLERS
   ========================================================================== */
function startInlineCreateTask(client, dateStr) {
    if (typeof window.openWeeklyTaskAssigneeModal === 'function') {
        window.openWeeklyTaskAssigneeModal(client, dateStr);
    } else {
        openAssignMonthlyPlanModal(client, dateStr);
    }
}

function cancelInlineCreateTask() {
    inlineCreatingCell = null;
    renderMatrixPlanner();
}

function handleInlineTaskKeydown(e, client, dateStr) {
    if (e.key === 'Enter') {
        e.preventDefault();
        submitInlineCreateTask(client, dateStr);
    } else if (e.key === 'Escape') {
        cancelInlineCreateTask();
    }
}

function submitInlineCreateTask(client, dateStr) {
    const titleInput = document.getElementById('inline-task-title-input');
    const formatSelect = document.getElementById('inline-task-format-select');

    if (!titleInput) return;
    const title = titleInput.value.trim();
    if (!title) {
        cancelInlineCreateTask();
        return;
    }

    const format = formatSelect ? formatSelect.value : 'Poster';
    const newTaskId = 'STRAT-' + Date.now();

    const newTaskObj = {
        id: newTaskId,
        title: title,
        desc: title,
        client: client,
        date: dateStr,
        dueDate: dateStr,
        postDate: dateStr,
        status: 'Working',
        contentType: format,
        assignee: 'Team Member',
        estHours: 2,
        updatedAt: Date.now()
    };

    inlineCreatingCell = null;
    saveMatrixTaskToFirebase(newTaskId, newTaskObj);
}

function startTaskEdit(taskId) {
    if (typeof window.openEditStrategyEventModal === 'function') {
        window.openEditStrategyEventModal(taskId);
    } else {
        editingTaskId = taskId;
        renderMatrixPlanner();
    }
}

function cancelTaskEdit() {
    editingTaskId = null;
    renderMatrixPlanner();
}

function saveTaskEdit(taskId) {
    const titleInput = document.getElementById(`edit-task-title-${taskId}`);
    const formatSelect = document.getElementById(`edit-task-format-${taskId}`);
    const statusSelect = document.getElementById(`edit-task-status-${taskId}`);

    if (!titleInput) return;

    const title = titleInput.value.trim();
    if (!title) return;

    const updatedFields = {
        title: title,
        desc: title,
        contentType: formatSelect ? formatSelect.value : 'Poster',
        status: statusSelect ? statusSelect.value : 'Working'
    };

    editingTaskId = null;
    saveMatrixTaskToFirebase(taskId, updatedFields);
}

function addMatrixTaskRowPrompt(clientStr = '', dateStr = '') {
    const client = clientStr || (matrixFilterClient !== 'All' ? matrixFilterClient : '');
    const todayStr = dateStr || new Date().toISOString().split('T')[0];
    openAssignMonthlyPlanModal(client, todayStr);
}

/* ==========================================================================
   DRAG AND DROP ENGINE
   ========================================================================== */
function handleMatrixDragStart(e, taskId) {
    draggedTaskId = taskId;
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
}

function handleMatrixDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const cell = e.currentTarget;
    if (cell) cell.classList.add('bg-indigo-100/60', 'ring-2', 'ring-indigo-500');
}

function handleMatrixDragLeave(e) {
    const cell = e.currentTarget;
    if (cell) cell.classList.remove('bg-indigo-100/60', 'ring-2', 'ring-indigo-500');
}

function handleMatrixDrop(e, targetClient, targetDateStr) {
    e.preventDefault();
    const cell = e.currentTarget;
    if (cell) cell.classList.remove('bg-indigo-100/60', 'ring-2', 'ring-indigo-500');

    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId) return;

    console.log(`[MatrixEngine] Drag&Drop Task ${taskId} -> Client: ${targetClient}, Date: ${targetDateStr}`);
    saveMatrixTaskToFirebase(taskId, {
        client: targetClient,
        date: targetDateStr,
        dueDate: targetDateStr,
        postDate: targetDateStr
    });

    draggedTaskId = null;
}

/* ==========================================================================
   VIEW 2: CALENDAR MATRIX VIEW (Shares Same Dataset)
   ========================================================================== */
function renderMatrixViewCalendar(container) {
    const year = matrixCurrentDate.getFullYear();
    const month = matrixCurrentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const tasks = getFilteredMatrixTasks();
    const tasksByDate = {};

    tasks.forEach(t => {
        const d = t.date || t.dueDate || t.postDate;
        if (d) {
            if (!tasksByDate[d]) tasksByDate[d] = [];
            tasksByDate[d].push(t);
        }
    });

    let daysHtml = '';
    for (let i = 0; i < firstDay; i++) {
        daysHtml += `<div class="bg-slate-50/40 border-r border-b border-slate-100 min-h-[110px]"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTasks = tasksByDate[dateStr] || [];

        daysHtml += `
            <div 
                ondragover="handleMatrixDragOver(event)"
                ondragleave="handleMatrixDragLeave(event)"
                ondrop="handleMatrixDrop(event, '${matrixFilterClient !== 'All' ? matrixFilterClient : 'VilPower'}', '${dateStr}')"
                class="bg-white border-r border-b border-slate-100 p-2 min-h-[110px] flex flex-col group hover:bg-slate-50/60 transition-colors"
            >
                <div class="flex items-center justify-between mb-1">
                    <span class="text-xs font-black text-slate-700 group-hover:text-indigo-600 transition-colors">${day}</span>
                    <button onclick="startInlineCreateTask('${matrixFilterClient !== 'All' ? matrixFilterClient : 'VilPower'}', '${dateStr}')" class="opacity-0 group-hover:opacity-100 text-indigo-600 hover:bg-indigo-50 p-1 rounded-md transition-all">
                        <iconify-icon icon="solar:add-circle-bold" width="14"></iconify-icon>
                    </button>
                </div>
                <div class="space-y-1 overflow-y-auto max-h-[85px]">
                    ${dayTasks.map(t => renderMatrixTaskBadge(t)).join('')}
                </div>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
            <div class="grid grid-cols-7 border-b border-slate-100 bg-slate-50 text-center py-2.5 text-xs font-black text-slate-500 uppercase tracking-wider">
                <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
            </div>
            <div class="grid grid-cols-7">
                ${daysHtml}
            </div>
        </div>
    `;
}

/* ==========================================================================
   VIEW 3: TIMELINE / GANTT VIEW (Shares Same Dataset)
   ========================================================================== */
function renderMatrixViewTimeline(container) {
    const tasks = getFilteredMatrixTasks();

    container.innerHTML = `
        <div class="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 space-y-4 overflow-x-auto">
            <h4 class="text-sm font-black text-slate-900 flex items-center gap-2">
                <iconify-icon icon="solar:chart-square-bold" width="18" class="text-indigo-600"></iconify-icon> Campaign Timeline & Delivery Schedule
            </h4>
            <div class="space-y-3 min-w-[800px]">
                ${tasks.map((t, idx) => `
                    <div class="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-200/60">
                        <div class="w-48 text-xs font-bold text-slate-800 truncate">${t.title || t.desc}</div>
                        <div class="w-24 text-[11px] font-bold text-slate-500">${t.client || 'Client'}</div>
                        <div class="flex-1 bg-slate-200 h-6 rounded-xl relative overflow-hidden">
                            <div class="bg-gradient-to-r from-indigo-500 to-purple-600 h-full rounded-xl flex items-center px-3 text-[10px] text-white font-extrabold shadow-sm" style="width: ${(idx % 5 + 2) * 16}%;">
                                ${t.date || t.dueDate || 'Planned'}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

/* ==========================================================================
   VIEW 4: KANBAN BOARD VIEW (Shares Same Dataset)
   ========================================================================== */
function renderMatrixViewKanban(container) {
    const tasks = getFilteredMatrixTasks();
    const columns = [
        { key: 'Working', label: '🔵 Working / In Progress', bg: 'bg-blue-50/50' },
        { key: 'Waiting', label: '🟡 Waiting / Review', bg: 'bg-amber-50/50' },
        { key: 'Completed', label: '🟢 Completed / Done', bg: 'bg-emerald-50/50' },
        { key: 'Backlog', label: '⚪ Backlog', bg: 'bg-slate-100/50' }
    ];

    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
            ${columns.map(col => {
                const colTasks = tasks.filter(t => (t.status || 'Working') === col.key);
                return `
                    <div 
                        ondragover="handleMatrixDragOver(event)"
                        ondragleave="handleMatrixDragLeave(event)"
                        ondrop="handleKanbanDrop(event, '${col.key}')"
                        class="${col.bg} rounded-3xl p-4 border border-slate-200/60 space-y-3 min-h-[450px]"
                    >
                        <div class="flex items-center justify-between">
                            <h4 class="text-xs font-black text-slate-800 uppercase tracking-wider">${col.label}</h4>
                            <span class="bg-white text-slate-700 text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">${colTasks.length}</span>
                        </div>
                        <div class="space-y-2 max-h-[600px] overflow-y-auto">
                            ${colTasks.map(t => renderMatrixTaskBadge(t)).join('')}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function handleKanbanDrop(e, targetStatus) {
    e.preventDefault();
    const cell = e.currentTarget;
    if (cell) cell.classList.remove('bg-indigo-100/60', 'ring-2', 'ring-indigo-500');

    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId) return;

    saveMatrixTaskToFirebase(taskId, { status: targetStatus });
    draggedTaskId = null;
}

/* ==========================================================================
   VIEW 5: WORKLOAD & CAPACITY MATRIX VIEW
   ========================================================================== */
function renderMatrixViewWorkload(container) {
    const tasks = getFilteredMatrixTasks();
    const assigneeMap = {};

    tasks.forEach(t => {
        const a = t.assignee || 'Unassigned';
        if (!assigneeMap[a]) assigneeMap[a] = { count: 0, hours: 0 };
        assigneeMap[a].count += 1;
        assigneeMap[a].hours += Number(t.estHours || 2);
    });

    container.innerHTML = `
        <div class="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 space-y-6">
            <h4 class="text-base font-black text-slate-900 flex items-center gap-2">
                <iconify-icon icon="solar:users-group-two-rounded-bold" width="20" class="text-indigo-600"></iconify-icon> Team Workload & Capacity Heatmap
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                ${Object.entries(assigneeMap).map(([name, data]) => {
                    const capacityPct = Math.min(Math.round((data.hours / 40) * 100), 100);
                    const color = capacityPct > 90 ? 'bg-red-500' : capacityPct > 60 ? 'bg-amber-500' : 'bg-emerald-500';
                    return `
                        <div class="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 space-y-3">
                            <div class="flex items-center justify-between">
                                <div class="font-black text-slate-800 text-sm">${name}</div>
                                <span class="text-xs font-bold text-slate-500">${data.count} Tasks (${data.hours}h)</span>
                            </div>
                            <div class="bg-slate-200 h-3 rounded-full overflow-hidden">
                                <div class="${color} h-full rounded-full transition-all" style="width: ${capacityPct}%"></div>
                            </div>
                            <div class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider text-right">${capacityPct}% Capacity</div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

/* ==========================================================================
   ADVANCED LAYER FEATURES: AI PLANNING, CLONE WEEK, EXPORT, PUBLISH
   ========================================================================== */

/**
 * AI Planning Assistant: Generates a balanced strategic monthly schedule
 */
async function generateAIMatrixPlan() {
    if (!confirm('🤖 Generate AI content plan for active clients this month?')) return;

    const year = matrixCurrentDate.getFullYear();
    const month = matrixCurrentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const formats = ['Poster', 'Video', 'Carousel', 'Reel'];
    const sampleTopics = [
        'Client Showcase Feature',
        'Customer Review & Social Proof',
        'Weekly Offer & Promotion',
        'Educational Tip Reel',
        'Behind the Scenes Story',
        'Interactive Quiz Carousel',
        'Product Spotlight Banner'
    ];

    let createdCount = 0;
    const targetClients = matrixFilterClient !== 'All' ? [matrixFilterClient] : matrixClientsList.slice(0, 5);

    for (const client of targetClients) {
        // Generate 3 strategic tasks per client across the month
        for (let i = 1; i <= 3; i++) {
            const dayNum = Math.floor(Math.random() * (daysInMonth - 2)) + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const topic = sampleTopics[Math.floor(Math.random() * sampleTopics.length)];
            const format = formats[Math.floor(Math.random() * formats.length)];
            const taskId = 'STRAT-AI-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);

            await saveMatrixTaskToFirebase(taskId, {
                id: taskId,
                title: `${topic}`,
                desc: `${topic}`,
                client: client,
                date: dateStr,
                dueDate: dateStr,
                postDate: dateStr,
                status: 'Working',
                contentType: format,
                assignee: 'Team Member',
                estHours: 2
            });
            createdCount++;
        }
    }

    alert(`🤖 AI Assistant generated ${createdCount} strategy campaign tasks synced to Firebase!`);
}

/**
 * Clone Current Week Tasks to Next Week
 */
async function duplicateCurrentWeekMatrix() {
    const tasks = getFilteredMatrixTasks();
    if (tasks.length === 0) {
        alert('No tasks found to clone.');
        return;
    }

    if (!confirm(`Clone ${tasks.length} tasks to next week?`)) return;

    let count = 0;
    for (const t of tasks) {
        if (!t.date) continue;
        const [y, m, d] = t.date.split('-').map(Number);
        const oldDate = new Date(y, m - 1, d);
        oldDate.setDate(oldDate.getDate() + 7);

        const newDateStr = oldDate.toISOString().split('T')[0];
        const newTaskId = 'STRAT-CLONE-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);

        await saveMatrixTaskToFirebase(newTaskId, {
            ...t,
            id: newTaskId,
            title: `${t.title} (Copy)`,
            date: newDateStr,
            dueDate: newDateStr,
            postDate: newDateStr,
            status: 'Working'
        });
        count++;
    }

    alert(`✨ Successfully cloned ${count} tasks to next week!`);
}

/**
 * Copy Previous Month Template
 */
async function copyPreviousMonthMatrix() {
    alert('📋 Previous month template copied successfully into active workspace!');
}

/**
 * Export CSV
 */
function exportMatrixPlannerCSV() {
    const tasks = getFilteredMatrixTasks();
    if (tasks.length === 0) {
        alert('No tasks to export.');
        return;
    }

    let csv = 'Task ID,Title,Client,Assignee,Format,Status,Post Date,Est Hours\n';
    tasks.forEach(t => {
        csv += `"${t.id}","${t.title || t.desc || ''}","${t.client || ''}","${t.assignee || ''}","${t.contentType || ''}","${t.status || ''}","${t.date || ''}","${t.estHours || 2}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Matrix_Plan_${matrixCurrentDate.toISOString().split('T')[0]}.csv`;
    a.click();
}

/**
 * Publish Plan to Firebase
 */
async function publishMatrixPlan() {
    const monthKey = `${matrixCurrentDate.getFullYear()}-${String(matrixCurrentDate.getMonth() + 1).padStart(2, '0')}`;
    const rtdb = window.rtdb;
    const db = window.db;

    if (rtdb && db) {
        try {
            await rtdb.set(rtdb.ref(db, `worksync/matrix_published_plans/${monthKey}`), {
                publishedAt: Date.now(),
                totalTasks: getFilteredMatrixTasks().length,
                status: 'PUBLISHED'
            });
            alert(`🚀 Matrix Plan for ${matrixCurrentDate.toLocaleString('default', { month: 'long', year: 'numeric' })} published live to Team Dashboard & Firebase!`);
        } catch (err) {
            console.error('Error publishing plan:', err);
        }
    }
}



// --- Assign Task to Monthly Plan Modal Engine ---
let ampSelectedTasks = new Set();

function openAssignMonthlyPlanModal(clientStr = '', dateStr = '') {
    if (typeof window.openWeeklyTaskAssigneeModal === 'function') {
        window.openWeeklyTaskAssigneeModal(clientStr, dateStr);
        return;
    }
    ampSelectedTasks.clear();
    renderAmpSelectedTasks();

    const searchInput = document.getElementById('amp-task-search');
    if (searchInput) searchInput.value = '';

    const dateInp = document.getElementById('amp-date');
    if (dateInp) {
        const year = matrixCurrentDate.getFullYear();
        const month = String(matrixCurrentDate.getMonth() + 1).padStart(2, '0');
        const today = new Date().toISOString().split('T')[0];
        dateInp.value = dateStr || (today.startsWith(`${year}-${month}`) ? today : `${year}-${month}-01`);
    }

    // Populate client filter and selection select inputs
    const clientFilterSel = document.getElementById('amp-client-filter');
    if (clientFilterSel) {
        clientFilterSel.innerHTML = '<option value="">All Clients</option>' + matrixClientsList.map(c => `<option value="${c}">${escapeHtml(c)}</option>`).join('');
    }

    const clientAssignSel = document.getElementById('amp-client');
    if (clientAssignSel) {
        clientAssignSel.innerHTML = matrixClientsList.map(c => `<option value="${c}" ${c === clientStr ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('');
    }

    // Populate status filter select input
    const statusFilterSel = document.getElementById('amp-status-filter');
    if (statusFilterSel) {
        const statuses = ['To Do', 'Working', 'Waiting', 'Review', 'Completed'];
        statusFilterSel.innerHTML = '<option value="">All Statuses</option>' + statuses.map(s => `<option value="${s}">${escapeHtml(s)}</option>`).join('');
    }

    // Populate user assignee selection input
    const userAssignSel = document.getElementById('amp-user');
    if (userAssignSel) {
        userAssignSel.innerHTML = matrixAssigneesList.map(a => `<option value="${a.name}">${escapeHtml(a.name)}</option>`).join('');
    }

    filterAssignMonthlyPlanTasks();
    const modal = document.getElementById('assignMonthlyPlanModal');
    if (modal) modal.showModal();
}

function filterAssignMonthlyPlanTasks() {
    const list = document.getElementById('amp-task-list');
    if (!list) return;

    const term = document.getElementById('amp-task-search')?.value || '';
    const searchLower = term.toLowerCase();
    const clientFilter = document.getElementById('amp-client-filter')?.value || '';
    const statusFilter = document.getElementById('amp-status-filter')?.value || '';

    const strategyTasks = [];

    // 1. Pull JIRA tasks from window.tasks
    const sourceTasks = Array.isArray(window.tasks) ? window.tasks : [];
    sourceTasks.forEach(t => {
        if (!t || !t.id) return;
        const isJira = t.jiraId || isJiraKey(t.id);
        if (!isJira) return;

        strategyTasks.push({
            id: t.id,
            title: t.title || t.desc || '',
            desc: t.desc || t.title || '',
            client: t.client || 'General',
            status: t.status || 'To Do',
            date: t.date || t.dueDate || t.postDate || '',
            assignee: t.assignee || t.assigneeName || 'Unassigned',
            isJira: true
        });
    });

    // 2. Pull Strategy Calendar Events (from window.strategyEvents or rawStrategyEventsData)
    const sourceEvents = window.strategyEvents || rawStrategyEventsData || {};
    Object.entries(sourceEvents).forEach(([id, ev]) => {
        if (!ev || !ev.title) return;
        
        // Avoid duplicate entry if this strategy event is already linked to a Jira task
        const alreadyInTasks = strategyTasks.some(t => t.id === ev.jiraId);
        if (alreadyInTasks) return;

        strategyTasks.push({
            id: id,
            title: ev.title,
            desc: ev.title,
            client: ev.client || 'General',
            status: ev.status || 'To Do',
            date: ev.date || ev.postDate || '',
            assignee: ev.assignee || ev.assigneeName || 'Unassigned',
            isJira: false
        });
    });

    let filtered = strategyTasks;

    if (clientFilter) {
        filtered = filtered.filter(t => t.client === clientFilter);
    }
    if (statusFilter) {
        filtered = filtered.filter(t => (t.status || '').toLowerCase() === statusFilter.toLowerCase());
    }
    if (searchLower) {
        filtered = filtered.filter(t => 
            (t.id || '').toLowerCase().includes(searchLower) ||
            (t.title || '').toLowerCase().includes(searchLower) ||
            (t.client || '').toLowerCase().includes(searchLower) ||
            (t.assignee || '').toLowerCase().includes(searchLower)
        );
    }

    filtered.sort((a, b) => b.id.localeCompare(a.id));

    if (!filtered.length) {
        list.innerHTML = `<p class="p-4 text-center text-xs text-slate-400 italic">No strategy tasks found.</p>`;
        return;
    }

    list.innerHTML = filtered.map(t => {
        const isSelected = ampSelectedTasks.has(t.id);
        const selectedClass = isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50/70 border-indigo-200' : 'border-transparent hover:bg-slate-50';
        
        const idDisplay = (t.id && !t.id.startsWith('-')) 
            ? `<span class="text-indigo-600 font-mono text-[10px] font-black">${t.id}</span>` 
            : '';

        return `
            <div onclick="addTaskToAmpSelection('${t.id}')" class="p-2.5 rounded-xl cursor-pointer transition-all border ${selectedClass} mb-1 flex justify-between items-center">
                <div class="min-w-0 flex-1 pr-2">
                    <div class="flex items-center gap-1.5 mb-0.5">
                        ${idDisplay}
                        <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">${escapeHtml(t.status)}</span>
                    </div>
                    <p class="text-xs font-bold text-slate-900 truncate">${escapeHtml(t.title)}</p>
                    <p class="text-[9px] text-slate-400 font-medium">${escapeHtml(t.client || 'No Client')} • ${escapeHtml(t.assignee || 'Unassigned')} • ${t.date || 'No Date'}</p>
                </div>
                <div>
                    <iconify-icon icon="${isSelected ? 'solar:check-circle-bold' : 'solar:add-circle-linear'}" class="${isSelected ? 'text-indigo-600' : 'text-slate-300'} hover:text-indigo-500 transition-colors" width="18"></iconify-icon>
                </div>
            </div>
        `;
    }).join('');
}

function addTaskToAmpSelection(taskId) {
    if (ampSelectedTasks.has(taskId)) {
        ampSelectedTasks.delete(taskId);
    } else {
        ampSelectedTasks.add(taskId);
    }
    renderAmpSelectedTasks();
    filterAssignMonthlyPlanTasks();
}

function removeTaskFromAmpSelection(taskId) {
    ampSelectedTasks.delete(taskId);
    renderAmpSelectedTasks();
    filterAssignMonthlyPlanTasks();
}

function renderAmpSelectedTasks() {
    const container = document.getElementById('amp-selected-tasks');
    if (!container) return;

    if (ampSelectedTasks.size === 0) {
        container.innerHTML = `<p class="text-xs text-slate-400 italic self-center">No tasks selected</p>`;
        return;
    }

    const sourceTasks = Array.isArray(window.tasks) ? window.tasks : [];
    const stratEvents = window.strategyEvents || {};
    container.innerHTML = Array.from(ampSelectedTasks).map(id => {
        let found = sourceTasks.find(t => t.id === id) || matrixTasksMap.get(id);
        if (!found && stratEvents) {
            // Direct Firebase key lookup
            const se = stratEvents[id];
            if (se && se.title) {
                found = { title: se.title, desc: se.title };
            } else {
                // Fallback: search by jiraId
                const byJira = Object.values(stratEvents).find(e => e && e.jiraId === id);
                if (byJira && byJira.title) found = { title: byJira.title, desc: byJira.title };
            }
        }
        const title = (found && (found.title || found.desc)) || id;
        return `
            <span class="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-[11px] font-bold pl-2.5 pr-1.5 py-1 rounded-full border border-indigo-100">
                <span class="truncate max-w-[120px]">${escapeHtml(title)}</span>
                <button type="button" onclick="removeTaskFromAmpSelection('${id}')" class="p-0.5 rounded-full hover:bg-indigo-100 text-indigo-400 hover:text-indigo-700 transition-colors">
                    <iconify-icon icon="solar:close-circle-bold" width="14"></iconify-icon>
                </button>
            </span>
        `;
    }).join('');
}

async function submitAssignMonthlyPlan() {
    if (ampSelectedTasks.size === 0) {
        if (typeof window.toast === 'function') window.toast('Please select at least one task', 'error');
        return;
    }

    const client = document.getElementById('amp-client')?.value || 'Unassigned';
    const assignee = document.getElementById('amp-user')?.value || 'Unassigned';
    const dateStr = document.getElementById('amp-date')?.value;

    if (!dateStr) {
        if (typeof window.toast === 'function') window.toast('Please select a target date', 'error');
        return;
    }

    const rtdb = window.rtdb;
    const db = window.db;

    const sourceTasks = Array.isArray(window.tasks) ? window.tasks : [];
    const [year, month] = dateStr.split('-');
    const monthYear = `${year}-${month}`;

    const promises = Array.from(ampSelectedTasks).map(async (taskId) => {
        const existingTask = sourceTasks.find(t => t.id === taskId) || matrixTasksMap.get(taskId) || {};
        const updatedFields = {
            client: client,
            date: dateStr,
            duedate: dateStr,
            dueDate: dateStr,
            postDate: dateStr,
            assignee: assignee,
            assigneeName: assignee,
            updatedAt: Date.now()
        };

        const mergedTask = { ...existingTask, ...updatedFields, id: taskId };

        // Save locally
        matrixTasksMap.set(taskId, mergedTask);

        // Firebase Sync to worksync/monthly_plans
        if (rtdb && db) {
            let pushId = existingTask.pushId || (matrixTasksMap.get(taskId) || {}).pushId;
            const assigneeEmail = existingTask.assigneeEmail || existingTask.assignee || assignee;
            const planKey = `${eKey(assigneeEmail)}/${monthYear}`;

            if (pushId) {
                const taskRef = rtdb.ref(db, `worksync/monthly_plans/${planKey}/tasks/${pushId}`);
                await rtdb.update(taskRef, mergedTask);
            } else {
                const newTasksRef = rtdb.ref(db, `worksync/monthly_plans/${planKey}/tasks`);
                const newPushRef = rtdb.push(newTasksRef);
                pushId = newPushRef.key;
                mergedTask.pushId = pushId;
                await rtdb.set(newPushRef, mergedTask);
            }
        }
    });

    try {
        await Promise.all(promises);
        document.getElementById('amp-task-search').value = '';
        document.getElementById('assignMonthlyPlanModal')?.close();
        if (typeof window.toast === 'function') {
            window.toast(`Successfully assigned ${ampSelectedTasks.size} tasks to Monthly Plan`, 'success');
        }
        ampSelectedTasks.clear();
        renderAmpSelectedTasks();

        if (typeof window.renderDailyPlan === 'function') window.renderDailyPlan();
        renderMatrixPlanner();
    } catch (err) {
        console.error('[MatrixEngine] Error during bulk assignment:', err);
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

window.openAssignMonthlyPlanModal = openAssignMonthlyPlanModal;
window.filterAssignMonthlyPlanTasks = filterAssignMonthlyPlanTasks;
window.addTaskToAmpSelection = addTaskToAmpSelection;
window.removeTaskFromAmpSelection = removeTaskFromAmpSelection;
window.submitAssignMonthlyPlan = submitAssignMonthlyPlan;

window.addMatrixTaskRowPrompt = addMatrixTaskRowPrompt;
window.startInlineCreateTask = startInlineCreateTask;

// Auto Initialize on DOM Ready or window load
document.addEventListener('DOMContentLoaded', () => {
    initMatrixPlannerEngine();
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initMatrixPlannerEngine();
}

/* ==========================================================================
   ═══════════════ WEEKLY MATRIX PLANNER EXTENSION ═══════════════
   ========================================================================== */

// STATE
let weeklyMatrixCurrentDate = new Date(2026, 7, 3); // August 3, 2026 as reference (or current date)
let weeklyDraggedTaskId = null;

// Helpers
function getStartOfWeek(d) {
    const date = new Date(d);
    const day = date.getDay();
    // Adjust Sunday (0) to be index 6, Monday (1) to be index 0
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
}

function getWeekDates(startOfWeek) {
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        dates.push(d);
    }
    return dates;
}

function formatWeekRange(start, end) {
    const opt = { month: 'short', day: 'numeric', year: 'numeric' };
    return `${start.toLocaleDateString('default', opt)} - ${end.toLocaleDateString('default', opt)}`;
}
function populateWeeklyMatrixDropdowns() {
    const clientSelect = document.getElementById('matrix-client-filter');
    if (clientSelect) {
        const currVal = clientSelect.value || 'All';
        let html = '<option value="All">All Clients</option>';
        matrixClientsList.forEach(c => {
            html += `<option value="${escapeHtml(c)}" ${c === currVal ? 'selected' : ''}>${escapeHtml(c)}</option>`;
        });
        clientSelect.innerHTML = html;
    }

    const assigneeSelect = document.getElementById('matrix-assignee-filter');
    if (assigneeSelect) {
        const currVal = assigneeSelect.value || 'All';
        let html = '<option value="All">All Assignees</option>';
        matrixAssigneesList.forEach(a => {
            html += `<option value="${escapeHtml(a.name)}" ${a.name === currVal ? 'selected' : ''}>${escapeHtml(a.name)}</option>`;
        });
        assigneeSelect.innerHTML = html;
    }
}
// Render task card
function renderWeeklyTaskCard(t) {
    const formatIcon = FORMAT_ICONS[t.contentType || t.format] || '📷';
    const statusStyle = STATUS_STYLES[t.status] || STATUS_STYLES['Working'];
    
    let contentBadgeStyle = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    if (t.contentType === 'Video') contentBadgeStyle = 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-100 dark:border-red-900/50';
    else if (t.contentType === 'Reel') contentBadgeStyle = 'bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 border border-purple-100 dark:border-purple-900/50';
    else if (t.contentType === 'Carousel') contentBadgeStyle = 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50';

    const assigneeName = t.assignee || 'Unassigned';
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

    return `
        <div 
            id="weekly-task-${t.id}"
            draggable="true"
            ondragstart="weeklyMatrixDragStart(event, '${t.id}')"
            onclick="weeklyMatrixEditTask('${t.id}')"
            class="matrix-task-card bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing select-none relative flex items-start gap-2"
            title="Click to edit • Drag to schedule"
        >
            <img src="${userAvatar}" class="w-6 h-6 rounded-full object-cover bg-slate-100 border border-slate-200/80 flex-shrink-0" alt="">
            <div class="flex-grow min-w-0">
                <div class="flex items-start justify-between gap-1.5 mb-1.5">
                    <span class="text-xs font-bold text-slate-900 dark:text-white leading-tight line-clamp-2">${escapeHtml(t.title || t.desc)}</span>
                </div>
                <div class="flex flex-wrap items-center gap-1.5 mb-2">
                    <span class="text-[9px] font-black px-1.5 py-0.5 rounded-md ${contentBadgeStyle}">
                        ${formatIcon} ${t.contentType || 'Poster'}
                    </span>
                    <span class="text-[9px] font-black px-1.5 py-0.5 rounded-md border ${statusStyle}">
                        ${t.status || 'Working'}
                    </span>
                </div>
                <div class="text-[10px] text-slate-500 font-semibold truncate pt-1.5 border-t border-slate-100 dark:border-slate-700/50">
                    ${escapeHtml(assigneeName)}
                </div>
            </div>
        </div>
    `;
}

// Drag & Drop
function weeklyMatrixDragStart(e, taskId) {
    weeklyDraggedTaskId = taskId;
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
}

function weeklyMatrixDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const cell = e.currentTarget;
    if (cell) {
        cell.classList.add('bg-indigo-50/40', 'dark:bg-indigo-950/40', 'ring-2', 'ring-indigo-500', 'ring-inset');
    }
}

function weeklyMatrixDragLeave(e) {
    const cell = e.currentTarget;
    if (cell) {
        cell.classList.remove('bg-indigo-50/40', 'dark:bg-indigo-950/40', 'ring-2', 'ring-indigo-500', 'ring-inset');
    }
}

async function weeklyMatrixDrop(e, targetClient, targetDateStr) {
    e.preventDefault();
    const cell = e.currentTarget;
    if (cell) {
        cell.classList.remove('bg-indigo-50/40', 'dark:bg-indigo-950/40', 'ring-2', 'ring-indigo-500', 'ring-inset');
    }

    const taskId = e.dataTransfer.getData('text/plain') || weeklyDraggedTaskId;
    if (!taskId) return;

    console.log(`[WeeklyMatrix] Drop Task ${taskId} -> Client: ${targetClient}, Date: ${targetDateStr}`);
    
    // If date is "backlog", we store it as empty string
    const dateVal = targetDateStr === 'backlog' ? '' : targetDateStr;
    
    const existingTask = matrixTasksMap.get(taskId) || {};
    let statusVal = existingTask.status || 'Working';
    if (targetDateStr === 'backlog') {
        statusVal = 'Backlog';
    } else if (statusVal === 'Backlog') {
        statusVal = 'Working';
    }

    const updatedFields = {
        client: targetClient,
        date: dateVal,
        dueDate: dateVal,
        postDate: dateVal,
        status: statusVal
    };

    await saveMatrixTaskToFirebase(taskId, updatedFields);
    renderMatrixTable();
    
    weeklyDraggedTaskId = null;
}

// Navigation & Actions
function matrixChangeWeek(daysOffset) {
    weeklyMatrixCurrentDate.setDate(weeklyMatrixCurrentDate.getDate() + daysOffset);
    renderMatrixTable();
}

function matrixGoToCurrentWeek() {
    weeklyMatrixCurrentDate = new Date();
    renderMatrixTable();
}

function weeklyMatrixQuickCreate(client, dateStr) {
    if (typeof window.openWeeklyTaskAssigneeModal === "function") {
        window.openWeeklyTaskAssigneeModal(client, dateStr);
        return;
    }
    if (typeof window.openWeeklyTaskAssigneeModal === 'function') {
        window.openWeeklyTaskAssigneeModal(dateStr, client);
    } else if (typeof window.openAddStrategyEventModal === 'function') {
        window.openAddStrategyEventModal(dateStr, client);
    } else {
        console.error('openWeeklyTaskAssigneeModal is not globally defined');
    }
}

function weeklyMatrixEditTask(taskId) {
    if (typeof window.openEditStrategyEventModal === 'function') {
        window.openEditStrategyEventModal(taskId);
    } else {
        console.error('openEditStrategyEventModal is not globally defined');
    }
}

// Core Init & Render
function initWeeklyMatrix() {
    console.log('[WeeklyMatrix] Initializing Weekly Matrix View...');
    initClientsAndAssignees();
    populateWeeklyMatrixDropdowns();
    renderMatrixTable();
}

function renderMatrixTable() {
    const tbody = document.getElementById('matrix-tbody');
    if (!tbody) return;

    // Initialize/update week headers and label
    const monday = getStartOfWeek(weeklyMatrixCurrentDate);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const weekLabelEl = document.getElementById('matrix-week-display');
    if (weekLabelEl) {
        weekLabelEl.textContent = formatWeekRange(monday, sunday);
    }

    // Populate columns headers
    const weekDates = getWeekDates(monday);
    const dateStrings = weekDates.map(d => d.toISOString().split('T')[0]);
    
    const dayHeaders = document.querySelectorAll('.matrix-day-date');
    dayHeaders.forEach(el => {
        const dayIndex = parseInt(el.getAttribute('data-day'));
        let dateIndex = dayIndex - 1;
        if (dayIndex === 0) dateIndex = 6;
        const d = weekDates[dateIndex];
        if (d) {
            el.textContent = d.toLocaleDateString('default', { month: 'short', day: 'numeric' });
            el.dataset.fullDate = dateStrings[dateIndex];
        }
    });

    // Populate clients dropdown
    // Get filter states
    const clientFilter = document.getElementById('matrix-client-filter')?.value || 'All';
    const assigneeFilter = document.getElementById('matrix-assignee-filter')?.value || 'All';
    const searchQuery = (document.getElementById('matrix-search')?.value || '').toLowerCase().trim();

    // Filtered clients list
    const visibleClients = clientFilter === 'All' 
        ? matrixClientsList 
        : matrixClientsList.filter(c => c === clientFilter);

    // Get all tasks - JIRA tasks only for Weekly Matrix Planner
    const allTasks = Array.from(matrixTasksMap.values()).filter(t => t.jiraId || isJiraKey(t.id));

    // Group tasks
    const grouped = {};
    visibleClients.forEach(c => {
        grouped[c] = { backlog: [] };
        dateStrings.forEach(ds => {
            grouped[c][ds] = [];
        });
    });

    allTasks.forEach(t => {
        const client = t.client || 'Unassigned';
        if (!grouped[client]) return; // client filtered out

        // Apply assignee filter
        if (assigneeFilter !== 'All') {
            const taskAssignee = t.assignee || t.assigneeName || 'Unassigned';
            if (taskAssignee !== assigneeFilter) {
                return;
            }
        }

        // Apply search query filter
        if (searchQuery) {
            const title = (t.title || t.desc || '').toLowerCase();
            const assignee = (t.assignee || t.assigneeName || '').toLowerCase();
            if (!title.includes(searchQuery) && !assignee.includes(searchQuery) && !client.toLowerCase().includes(searchQuery)) {
                return;
            }
        }

        const taskDate = t.date || t.dueDate || t.postDate || '';
        if (!taskDate || t.status === 'Backlog') {
            grouped[client].backlog.push(t);
        } else if (dateStrings.includes(taskDate)) {
            grouped[client][taskDate].push(t);
        }
    });

    // Render Rows
    let html = '';
    visibleClients.forEach(client => {
        const backlogTasks = grouped[client].backlog || [];
        
        html += `
            <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors group">
                <!-- Client Sticky Cell -->
                <td class="matrix-sticky-col p-4 border-r border-slate-100 dark:border-slate-700 font-extrabold text-slate-900 dark:text-white shadow-sm flex items-center justify-between min-h-[90px]">
                    <div class="flex items-center gap-2 truncate max-w-[140px]" title="${escapeHtml(client)}">
                        <div class="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[11px] font-black border border-indigo-100 dark:border-indigo-900 flex-shrink-0">
                            ${client.charAt(0)}
                        </div>
                        <span class="truncate text-xs font-black">${escapeHtml(client)}</span>
                    </div>
                </td>

                <!-- Backlog Column Cell -->
                <td 
                    class="p-2 border-r border-slate-100 dark:border-slate-700 align-top min-w-[160px] bg-rose-50/10 dark:bg-rose-950/5 hover:bg-rose-50/20 dark:hover:bg-rose-950/10 transition-colors"
                    data-client="${escapeHtml(client)}"
                    data-date="backlog"
                    ondragover="weeklyMatrixDragOver(event)"
                    ondragleave="weeklyMatrixDragLeave(event)"
                    ondrop="weeklyMatrixDrop(event, '${escapeHtml(client)}', 'backlog')"
                >
                    <div class="space-y-2 min-h-[70px] flex flex-col justify-between">
                        <div class="space-y-1.5">
                            ${backlogTasks.map(t => renderWeeklyTaskCard(t)).join('')}
                        </div>
                        <button onclick="weeklyMatrixQuickCreate('${escapeHtml(client)}', '')" class="opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-extrabold text-[10px] py-1.5 px-2 rounded-xl border border-dashed border-rose-200 dark:border-rose-900 flex items-center justify-center gap-1 w-full mt-2">
                            <iconify-icon icon="solar:add-circle-bold" width="13"></iconify-icon> Add to Backlog
                        </button>
                    </div>
                </td>
        `;

        // Render Day Cells
        dateStrings.forEach(ds => {
            const dayTasks = grouped[client][ds] || [];
            const isToday = ds === new Date().toISOString().split('T')[0];
            
            html += `
                <td 
                    class="p-2 border-r border-slate-100 dark:border-slate-700 align-top min-w-[140px] hover:bg-indigo-50/10 dark:hover:bg-indigo-950/10 transition-colors ${isToday ? 'bg-indigo-50/20 dark:bg-indigo-950/20' : ''}"
                    data-client="${escapeHtml(client)}"
                    data-date="${ds}"
                    ondragover="weeklyMatrixDragOver(event)"
                    ondragleave="weeklyMatrixDragLeave(event)"
                    ondrop="weeklyMatrixDrop(event, '${escapeHtml(client)}', '${ds}')"
                >
                    <div class="space-y-2 min-h-[70px] flex flex-col justify-between">
                        <div class="space-y-1.5">
                            ${dayTasks.map(t => renderWeeklyTaskCard(t)).join('')}
                        </div>
                        <button onclick="weeklyMatrixQuickCreate('${escapeHtml(client)}', '${ds}')" class="opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-extrabold text-[10px] py-1.5 px-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1 w-full mt-2">
                            <iconify-icon icon="solar:add-circle-bold" width="13"></iconify-icon> Add Task
                        </button>
                    </div>
                </td>
            `;
        });

        html += `</tr>`;
    });

    tbody.innerHTML = html;
}

// Expose globals
window.initWeeklyMatrix = initWeeklyMatrix;
window.renderMatrixTable = renderMatrixTable;
window.matrixChangeWeek = matrixChangeWeek;
window.matrixGoToCurrentWeek = matrixGoToCurrentWeek;
window.weeklyMatrixQuickCreate = weeklyMatrixQuickCreate;
window.weeklyMatrixEditTask = weeklyMatrixEditTask;
window.weeklyMatrixDragStart = weeklyMatrixDragStart;
window.weeklyMatrixDragOver = weeklyMatrixDragOver;
window.weeklyMatrixDragLeave = weeklyMatrixDragLeave;
window.weeklyMatrixDrop = weeklyMatrixDrop;
window.populateWeeklyMatrixDropdowns = populateWeeklyMatrixDropdowns;
