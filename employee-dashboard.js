// Employee Self Performance Dashboard
// Independent module for self-performance analytics
// Completely separate from existing reports - no modifications to existing functionality

// ────────────────────────────────────────────────────────────────
// FILTER MANAGEMENT
// ────────────────────────────────────────────────────────────────

function handleEmployeeDashboardFilterChange() {
    console.log('=== FILTER CHANGE TRIGGERED ===');
    console.log('Current Report Tab:', currentReportTab);
    console.log('Active View:', activeView);
    console.log('Filter Elements:', {
        userFilterEl: !!document.getElementById('employee-dashboard-user-filter'),
        rangeFilterEl: !!document.getElementById('employee-dashboard-range-filter')
    });
    const filters = getEmployeeDashboardFilters();
    console.log('Filter Values:', filters);
    console.log('allTimeLogs available:', allTimeLogs?.length || 0);
    console.log('Calling renderEmployeeSelfPerformanceDashboard...');
    renderEmployeeSelfPerformanceDashboard();
}

function populateEmployeeDashboardFilters() {
    // Only populate if user is admin/manager - employees see only themselves
    // Check if isManager and isAdmin functions are available
    const isManagerFn = typeof window.isManager === 'function' ? window.isManager : () => false;
    const isAdminFn = typeof window.isAdmin === 'function' ? window.isAdmin : () => false;
    
    if (!isManagerFn() && !isAdminFn()) {
        document.getElementById('employee-dashboard-user-filter')?.classList.add('hidden');
        return;
    }

    const select = document.getElementById('employee-dashboard-user-filter');
    if (!select) return;

    const employees = Array.from(new Set((window.allTimeLogs || []).map(log => log.userId || log.userName).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b));
    
    select.innerHTML = '<option value="current">My Dashboard</option>' + 
        employees.map(emp => `<option value="${escapeHtml(emp)}">${escapeHtml(emp)}</option>`).join('');
}

function getEmployeeDashboardFilters() {
    return {
        user: document.getElementById('employee-dashboard-user-filter')?.value || 'current',
        timeRange: document.getElementById('employee-dashboard-range-filter')?.value || '30'
    };
}

// ────────────────────────────────────────────────────────────────
// DATA AGGREGATION
// ────────────────────────────────────────────────────────────────

function getSelectedEmployeeForDashboard() {
    const filters = getEmployeeDashboardFilters();
    const employeeName = (typeof window.currentUser !== 'undefined' && window.currentUser) 
        ? (window.currentUser.email || window.currentUser.name || 'Unknown')
        : 'Unknown';
    
    // Check if isManager and isAdmin functions are available
    const isManagerFn = typeof window.isManager === 'function' ? window.isManager : () => false;
    const isAdminFn = typeof window.isAdmin === 'function' ? window.isAdmin : () => false;
    
    if (filters.user === 'current' || (!isManagerFn() && !isAdminFn())) {
        console.log('Returning current employee:', employeeName);
        return employeeName;
    }
    
    console.log('Returning selected employee:', filters.user);
    return filters.user;
}

function getEmployeeDashboardData(employee, daysBack = 30) {
    if (!employee || employee === 'current') {
        // If no employee selected, use current user
        const currentUserObj = (typeof window.currentUser !== 'undefined' && window.currentUser) ? window.currentUser : {};
        const currentUserName = currentUserObj.email || currentUserObj.name || 'Unknown';
        employee = currentUserName;
    }
    
    const now = Date.now();
    const fromTs = now - (daysBack * 86400000);
    
    console.log('Aggregating data for:', employee, 'from:', new Date(fromTs), 'to:', new Date(now));
    
    // Filter time logs for employee
    let logs;
    if (typeof window.getPeriodTimeLogs === 'function') {
        logs = window.getPeriodTimeLogs(fromTs, now, employee);
    } else {
        logs = (window.allTimeLogs || []).filter(log => {
            const logUser = log.userId || log.userName;
            const logTs = log.endTime || log.startTime || 0;
            return logUser === employee && logTs >= fromTs && logTs <= now;
        });
    }

    console.log('Filtered logs for employee:', logs.length, 'from total:', window.allTimeLogs?.length || 0);

    // Build task info map
    const taskMap = {};
    (window.tasks || []).forEach(t => {
        if (t.id) {
            taskMap[t.id] = {
                id: t.id,
                desc: t.desc || 'Unknown',
                client: t.client || 'Unassigned',
                status: t.status || 'Unknown',
                priority: t.priority || 'Normal',
                type: t.type || t.category || 'Other',
                createdDate: t.createdDate || null,
                dueDate: t.dueDate || null
            };
        }
    });

    console.log('Task map built with', Object.keys(taskMap).length, 'tasks');

    // Aggregate data
    let totalSeconds = 0;
    let totalSessions = 0;
    let completedCount = 0;
    let pendingCount = 0;
    const taskData = {};
    const clientData = {};
    const typeData = {};
    const dailyData = {};
    const hourlyData = {};
    const priorityData = {};

    logs.forEach(log => {
        const taskId = log.taskId || 'Unknown';
        const task = taskMap[taskId] || { 
            desc: log.taskDesc || 'Unknown Task',
            client: 'Unknown',
            status: 'Unknown',
            type: 'Other',
            priority: 'Normal'
        };

        const seconds = log.durationSeconds || 0;
        totalSeconds += seconds;
        totalSessions += 1;

        // Task aggregation
        if (!taskData[taskId]) {
            taskData[taskId] = {
                id: taskId,
                desc: task.desc,
                client: task.client,
                status: task.status,
                priority: task.priority,
                type: task.type,
                totalSeconds: 0,
                sessions: 0
            };
        }
        taskData[taskId].totalSeconds += seconds;
        taskData[taskId].sessions += 1;

        // Client aggregation
        const client = task.client || 'Unassigned';
        if (!clientData[client]) {
            clientData[client] = { name: client, totalSeconds: 0, taskCount: 0 };
        }
        clientData[client].totalSeconds += seconds;
        clientData[client].taskCount += 1;

        // Type aggregation
        const type = task.type || 'Other';
        typeData[type] = (typeData[type] || 0) + seconds;

        // Priority aggregation
        const priority = task.priority || 'Normal';
        priorityData[priority] = (priorityData[priority] || 0) + seconds;

        // Daily aggregation
        const date = log.date || new Date(log.startTime || 0).toISOString().split('T')[0];
        dailyData[date] = (dailyData[date] || 0) + seconds;

        // Hourly aggregation
        const hour = new Date(log.startTime || 0).getHours();
        hourlyData[hour] = (hourlyData[hour] || 0) + seconds;

        // Count completion status
        if (task.status && ['Completed', 'Done', 'Closed'].includes(task.status)) {
            completedCount += 1;
        } else if (task.status === 'Pending') {
            pendingCount += 1;
        }
    });

    console.log('Aggregation complete:', {
        totalSeconds,
        totalSessions,
        uniqueTasks: Object.keys(taskData).length,
        uniqueClients: Object.keys(clientData).length
    });

    return {
        employee,
        totalSeconds,
        totalSessions,
        completedCount,
        pendingCount,
        uniqueTasks: Object.keys(taskData).length,
        uniqueClients: Object.keys(clientData).length,
        taskData,
        clientData,
        typeData,
        priorityData,
        dailyData,
        hourlyData,
        logs,
        daysBack
    };
}

// ────────────────────────────────────────────────────────────────
// MAIN RENDER FUNCTION
// ────────────────────────────────────────────────────────────────

function renderEmployeeSelfPerformanceDashboard() {
    try {
        console.log('=== DASHBOARD RENDER START ===');
        console.log('Current User:', window.currentUser?.email || 'NOT SET');
        console.log('allTimeLogs count:', window.allTimeLogs?.length || 0);
        console.log('tasks count:', window.tasks?.length || 0);
        
        // Wait for critical data
        if (!window.currentUser || !window.allTimeLogs || window.allTimeLogs.length === 0) {
            console.warn('⚠️ DASHBOARD DATA NOT READY:', {
                hasCurrentUser: !!window.currentUser,
                hasTimeLogs: !!window.allTimeLogs,
                timeLogCount: window.allTimeLogs?.length || 0
            });
            const summaryEl = document.getElementById('employee-dashboard-summary');
            if (summaryEl) {
                summaryEl.innerHTML = 
                    '<p class="text-center text-slate-400 text-sm py-8">Loading data... (Logs: ' + (window.allTimeLogs?.length || 0) + ')</p>';
            }
            return;
        }

        const employee = getSelectedEmployeeForDashboard();
        const filters = getEmployeeDashboardFilters();
        const daysBack = parseInt(filters.timeRange) || 30;
        
        console.log('✓ Dashboard rendering for:', employee, '| Days back:', daysBack, '| Filter user:', filters.user);
        
        // For dashboard, we don't depend on reportDateFrom/reportDateTo
        // We use the daysBack value directly
        const data = getEmployeeDashboardData(employee, daysBack);

        console.log('✓ Data aggregated:', {
            totalSessions: data.totalSessions,
            totalSeconds: data.totalSeconds,
            uniqueTasks: data.uniqueTasks,
            uniqueClients: data.uniqueClients
        });

        if (!data || data.totalSessions === 0) {
            const summaryEl = document.getElementById('employee-dashboard-summary');
            if (summaryEl) {
                summaryEl.innerHTML = 
                    '<p class="text-center text-slate-400 text-sm py-8">No data available for ' + employee + ' in the last ' + daysBack + ' days.</p>';
            }
            console.warn('⚠️ No sessions found for:', employee);
            return;
        }

        // Render all sections
        console.log('📊 Rendering all dashboard sections...');
        renderEmployeeDashboardHeader(employee, data);
        renderEmployeeDashboardSummaryCards(data);
        renderEmployeeDashboardWorkDistribution(data);
        renderEmployeeDashboardClientMetrics(data);
        renderEmployeeDashboardTaskPerformance(data);
        renderEmployeeDashboardHourlyHeatmap(data);
        renderEmployeeDashboardWeeklyTrend(data);
        renderEmployeeDashboardAiSummary(employee, data);
        
        console.log('✅ Employee Dashboard: Rendering complete');
    } catch (error) {
        console.error('❌ Employee Dashboard Error:', error);
        const summaryEl = document.getElementById('employee-dashboard-summary');
        if (summaryEl) {
            summaryEl.innerHTML = 
                '<p class="text-center text-red-400 text-sm py-8">Error: ' + error.message + '</p>';
        }
    }
}

// ────────────────────────────────────────────────────────────────
// RENDERING FUNCTIONS
// ────────────────────────────────────────────────────────────────

function renderEmployeeDashboardHeader(employee, data) {
    const container = document.getElementById('employee-dashboard-header');
    if (!container) return;

    const avgSessionTime = data.totalSessions > 0 ? Math.round(data.totalSeconds / data.totalSessions) : 0;
    const completionRate = data.uniqueTasks > 0 ? Math.round((data.completedCount / data.uniqueTasks) * 100) : 0;

    container.innerHTML = `
        <div class="space-y-2">
            <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                    <iconify-icon icon="solar:user-id-bold" class="text-indigo-600" width="24"></iconify-icon>
                </div>
                <div>
                    <h2 class="text-2xl font-black text-slate-900">${escapeHtml(employee)}</h2>
                    <p class="text-xs text-slate-400 font-bold uppercase tracking-widest">Performance Dashboard</p>
                </div>
            </div>
            <p class="text-sm text-slate-600 ml-15">Last ${data.daysBack} days • ${data.totalSessions} work sessions • ${data.uniqueTasks} unique tasks</p>
        </div>
    `;
}

function renderEmployeeDashboardSummaryCards(data) {
    const container = document.getElementById('employee-dashboard-summary');
    if (!container) return;

    const avgSessionTime = data.totalSessions > 0 ? Math.round(data.totalSeconds / data.totalSessions) : 0;
    const completionRate = data.uniqueTasks > 0 ? Math.round((data.completedCount / data.uniqueTasks) * 100) : 0;
    const efficiencyScore = Math.min(100, Math.round((completionRate * 0.6) + ((100 - (data.totalSeconds > 144000 ? 100 : (data.totalSeconds / 1440))) * 0.4)));

    const cards = [
        {
            label: 'Total Hours Logged',
            value: formatTime(data.totalSeconds),
            icon: 'solar:clock-circle-bold',
            color: 'indigo',
            subtitle: `${data.totalSessions} sessions`
        },
        {
            label: 'Tasks Completed',
            value: `${data.completedCount}/${data.uniqueTasks}`,
            icon: 'solar:check-circle-bold',
            color: 'emerald',
            subtitle: `${completionRate}% completion`
        },
        {
            label: 'Active Clients',
            value: data.uniqueClients,
            icon: 'solar:buildings-bold',
            color: 'sky',
            subtitle: 'unique clients'
        },
        {
            label: 'Efficiency Score',
            value: `${efficiencyScore}%`,
            icon: 'solar:graph-up-bold',
            color: 'purple',
            subtitle: efficiencyScore >= 80 ? 'Excellent' : efficiencyScore >= 60 ? 'Good' : 'Needs Improvement'
        }
    ];

    const colorGradients = {
        indigo: 'from-indigo-50 to-indigo-100/50 border-indigo-200',
        emerald: 'from-emerald-50 to-emerald-100/50 border-emerald-200',
        sky: 'from-sky-50 to-sky-100/50 border-sky-200',
        purple: 'from-purple-50 to-purple-100/50 border-purple-200'
    };

    const textColors = {
        indigo: 'text-indigo-700',
        emerald: 'text-emerald-700',
        sky: 'text-sky-700',
        purple: 'text-purple-700'
    };

    const iconColors = {
        indigo: 'text-indigo-600',
        emerald: 'text-emerald-600',
        sky: 'text-sky-600',
        purple: 'text-purple-600'
    };

    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            ${cards.map(card => `
                <div class="bg-gradient-to-br ${colorGradients[card.color]} rounded-xl p-5 border">
                    <div class="flex items-start justify-between mb-3">
                        <iconify-icon icon="${card.icon}" class="${iconColors[card.color]}" width="20"></iconify-icon>
                    </div>
                    <p class="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">${card.label}</p>
                    <p class="text-2xl font-black ${textColors[card.color]} mb-2">${card.value}</p>
                    <p class="text-xs text-slate-500 font-semibold">${card.subtitle}</p>
                </div>
            `).join('')}
        </div>
    `;
}

function renderEmployeeDashboardWorkDistribution(data) {
    const container = document.getElementById('employee-dashboard-distribution');
    if (!container) return;

    const sortedTypes = Object.entries(data.typeData)
        .sort((a, b) => b[1] - a[1]);
    const totalSeconds = Object.values(data.typeData).reduce((sum, sec) => sum + sec, 0);

    let html = `
        <div class="bg-white rounded-xl border border-slate-100 p-6">
            <h3 class="text-lg font-black text-slate-900 uppercase tracking-wide mb-4">Work Distribution by Type</h3>
            <div class="space-y-4">
    `;

    sortedTypes.forEach(([type, seconds]) => {
        const pct = totalSeconds > 0 ? Math.round((seconds / totalSeconds) * 100) : 0;
        html += `
            <div>
                <div class="flex items-center justify-between mb-2">
                    <span class="font-semibold text-slate-700">${escapeHtml(type)}</span>
                    <span class="text-sm font-bold text-slate-600">${formatTime(seconds)} (${pct}%)</span>
                </div>
                <div class="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-indigo-500 to-purple-500" style="width: ${pct}%"></div>
                </div>
            </div>
        `;
    });

    html += '</div></div>';
    container.innerHTML = html;
}

function renderEmployeeDashboardClientMetrics(data) {
    const container = document.getElementById('employee-dashboard-clients');
    if (!container) return;

    const sortedClients = Object.values(data.clientData)
        .sort((a, b) => b.totalSeconds - a.totalSeconds);

    let html = `
        <div class="space-y-3">
            <h3 class="text-lg font-black text-slate-900 uppercase tracking-wide">Client Engagement</h3>
    `;

    sortedClients.forEach(client => {
        html += `
            <div class="bg-white rounded-lg border border-slate-100 p-4">
                <div class="flex items-center justify-between mb-2">
                    <div>
                        <p class="font-bold text-slate-900">${escapeHtml(client.name)}</p>
                        <p class="text-xs text-slate-400">${client.taskCount} tasks</p>
                    </div>
                    <span class="font-mono font-bold text-indigo-600">${formatTime(client.totalSeconds)}</span>
                </div>
                <div class="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div class="h-full bg-indigo-500" style="width: ${Math.min(100, (client.totalSeconds / Math.max(...Object.values(data.clientData).map(c => c.totalSeconds))) * 100)}%"></div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

function renderEmployeeDashboardTaskPerformance(data) {
    const container = document.getElementById('employee-dashboard-tasks');
    if (!container) return;

    const sortedTasks = Object.values(data.taskData)
        .sort((a, b) => b.totalSeconds - a.totalSeconds)
        .slice(0, 10);

    let html = `
        <div class="space-y-3">
            <h3 class="text-lg font-black text-slate-900 uppercase tracking-wide">Top 10 Tasks</h3>
    `;

    sortedTasks.forEach(task => {
        const statusColor = task.status && ['Completed', 'Done', 'Closed'].includes(task.status) 
            ? 'bg-emerald-50 text-emerald-700' 
            : task.status === 'Pending' 
            ? 'bg-amber-50 text-amber-700'
            : 'bg-slate-50 text-slate-700';

        html += `
            <div class="bg-white rounded-lg border border-slate-100 p-4">
                <div class="flex items-start justify-between gap-3 mb-2">
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="font-mono text-xs font-bold text-indigo-600">${escapeHtml(task.id)}</span>
                            <span class="text-xs font-bold px-2 py-0.5 rounded-full ${statusColor}">${task.status || 'Unknown'}</span>
                        </div>
                        <p class="text-sm font-semibold text-slate-800 truncate">${escapeHtml(task.desc)}</p>
                        <p class="text-xs text-slate-400 mt-1">${escapeHtml(task.client)} • ${task.type}</p>
                    </div>
                    <div class="text-right shrink-0">
                        <p class="font-mono font-bold text-slate-700">${formatTime(task.totalSeconds)}</p>
                        <p class="text-xs text-slate-400">${task.sessions} sessions</p>
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

function renderEmployeeDashboardHourlyHeatmap(data) {
    const container = document.getElementById('employee-dashboard-hourly');
    if (!container) return;

    const maxHours = Math.max(...Object.values(data.hourlyData), 1);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    let html = `
        <div class="space-y-3">
            <h3 class="text-lg font-black text-slate-900 uppercase tracking-wide">Work Hours Distribution</h3>
            <div class="bg-white rounded-xl border border-slate-100 p-6">
                <div class="grid grid-cols-12 gap-1">
    `;

    hours.forEach(hour => {
        const seconds = data.hourlyData[hour] || 0;
        const intensity = seconds > 0 ? (seconds / maxHours) * 100 : 0;
        const bgColor = intensity === 0 ? 'bg-slate-100' : intensity < 30 ? 'bg-indigo-200' : intensity < 60 ? 'bg-indigo-400' : 'bg-indigo-600';

        html += `
            <div class="flex flex-col items-center gap-1">
                <div class="w-full h-12 ${bgColor} rounded-lg transition-all hover:ring-2 hover:ring-indigo-300 cursor-help" 
                     title="${hour}:00 - ${formatTime(seconds)}"></div>
                <span class="text-xs font-bold text-slate-500">${hour}</span>
            </div>
        `;
    });

    html += '</div></div></div>';
    container.innerHTML = html;
}

function renderEmployeeDashboardWeeklyTrend(data) {
    const container = document.getElementById('employee-dashboard-trend');
    if (!container) return;

    const sortedDays = Object.entries(data.dailyData)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-7);

    const maxSeconds = Math.max(...sortedDays.map(d => d[1]), 1);

    let html = `
        <div class="space-y-3">
            <h3 class="text-lg font-black text-slate-900 uppercase tracking-wide">Weekly Work Trend</h3>
            <div class="bg-white rounded-xl border border-slate-100 p-6">
                <div class="flex items-end justify-between gap-2 h-32">
    `;

    sortedDays.forEach(([date, seconds]) => {
        const pct = (seconds / maxSeconds) * 100;
        const dayObj = new Date(date + 'T00:00:00');
        const dayName = dayObj.toLocaleDateString('en-US', { weekday: 'short' });

        html += `
            <div class="flex-1 flex flex-col items-center gap-2">
                <div class="w-full bg-gradient-to-t from-indigo-500 to-indigo-400 rounded-t-lg transition-all hover:from-indigo-600 hover:to-indigo-500" 
                     style="height: ${pct}%; min-height: 10px;" 
                     title="${date}: ${formatTime(seconds)}"></div>
                <span class="text-xs font-bold text-slate-500">${dayName}</span>
            </div>
        `;
    });

    html += '</div></div></div>';
    container.innerHTML = html;
}

function renderEmployeeDashboardAiSummary(employee, data) {
    const container = document.getElementById('employee-dashboard-ai');
    if (!container) return;

    const completionRate = data.uniqueTasks > 0 ? Math.round((data.completedCount / data.uniqueTasks) * 100) : 0;
    const avgSessionTime = data.totalSessions > 0 ? Math.round(data.totalSeconds / data.totalSessions) : 0;
    const peakHour = Object.entries(data.hourlyData).sort((a, b) => b[1] - a[1])[0];
    const peakHourValue = peakHour ? peakHour[0] : 'N/A';
    const topClient = Object.entries(data.clientData).sort((a, b) => b[1].totalSeconds - a[1].totalSeconds)[0];
    const topType = Object.entries(data.typeData).sort((a, b) => b[1] - a[1])[0];

    let insights = [];

    if (completionRate >= 85) {
        insights.push(`You're maintaining an excellent task completion rate of ${completionRate}% - keep up the momentum!`);
    } else if (completionRate >= 60) {
        insights.push(`Your completion rate is ${completionRate}% - consider prioritizing pending tasks to improve further.`);
    } else {
        insights.push(`Your completion rate is ${completionRate}% - focus on completing pending work before starting new tasks.`);
    }

    if (data.uniqueClients >= 3) {
        insights.push(`You're juggling ${data.uniqueClients} clients - consider batching similar work types to reduce context switching.`);
    }

    if (topClient) {
        insights.push(`Your primary focus is ${escapeHtml(topClient[0])} with ${Math.round((topClient[1].totalSeconds / data.totalSeconds) * 100)}% of your time.`);
    }

    if (avgSessionTime > 7200) {
        insights.push(`Your average session is ${formatTime(avgSessionTime)} - consider breaking work into smaller chunks for better focus.`);
    } else if (avgSessionTime < 1800) {
        insights.push(`Your sessions average ${formatTime(avgSessionTime)} - this could indicate frequent context switching.`);
    }

    if (peakHourValue !== 'N/A') {
        const hour = parseInt(peakHourValue);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        insights.push(`Your most productive hours are around ${displayHour}:00 ${ampm} - schedule important tasks then.`);
    }

    insights.push(`You've logged ${data.totalSessions} work sessions over the last ${data.daysBack} days with an average of ${Math.round(data.totalSessions / data.daysBack)} sessions per day.`);

    const html = `
        <div class="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200/50 p-6">
            <div class="flex items-start gap-3 mb-4">
                <iconify-icon icon="solar:lightbulb-bold" class="text-indigo-600 shrink-0" width="20"></iconify-icon>
                <h3 class="text-lg font-black text-slate-900 uppercase tracking-wide">AI Performance Summary</h3>
            </div>
            <ul class="space-y-2 text-sm text-slate-700">
                ${insights.map(insight => `<li class="flex gap-2"><span class="text-indigo-600 font-bold">•</span> ${insight}</li>`).join('')}
            </ul>
        </div>
    `;

    container.innerHTML = html;
}

// ────────────────────────────────────────────────────────────────
// EXPORT FUNCTION
// ────────────────────────────────────────────────────────────────

function exportEmployeeDashboard() {
    const employee = getSelectedEmployeeForDashboard();
    const filters = getEmployeeDashboardFilters();
    const daysBack = parseInt(filters.timeRange) || 30;
    const data = getEmployeeDashboardData(employee, daysBack);

    if (data.totalSessions === 0) {
        return toast('No data to export', 'info');
    }

    const headers = ['Date', 'Time', 'Duration', 'Task ID', 'Task Description', 'Client', 'Type', 'Status'];
    const rows = data.logs
        .sort((a, b) => (a.startTime || 0) - (b.startTime || 0))
        .map(log => {
            const task = data.taskData[log.taskId] || {};
            const date = log.date || new Date(log.startTime || 0).toISOString().split('T')[0];
            const time = new Date(log.startTime || 0).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const duration = formatTime(log.durationSeconds || 0);

            return [
                date,
                time,
                duration,
                log.taskId || '',
                log.taskDesc || task.desc || '',
                task.client || '',
                task.type || '',
                task.status || ''
            ].map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',');
        });

    const csv = [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `employee-dashboard-${employee}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast('Dashboard exported successfully', 'success');
}

// ────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS (Local scope - not global)
// ────────────────────────────────────────────────────────────────

function formatTime(seconds) {
    if (!seconds || seconds < 0) return '0m';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
}
