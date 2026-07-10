// Employee Client Task Timing Report - Phase 1-5 Complete Implementation
// Comprehensive AI-powered productivity analytics dashboard

function handleEcttFilterChange() {
    console.log('=== ECTT FILTER CHANGE TRIGGERED ===');
    console.log('Current Report Tab:', window.currentReportTab);
    console.log('Active View:', window.activeView);
    console.log('Filter Elements:', {
        employeeFilterEl: !!document.getElementById('ectt-employee-filter'),
        clientFilterEl: !!document.getElementById('ectt-client-filter'),
        taskTypeFilterEl: !!document.getElementById('ectt-task-type-filter'),
        statusFilterEl: !!document.getElementById('ectt-status-filter')
    });
    const filters = getEcttFilters();
    console.log('Filter Values:', filters);
    console.log('allTimeLogs available:', window.allTimeLogs?.length || 0);
    console.log('Calling renderEmployeeClientTimingReport...');
    renderEmployeeClientTimingReport();
}

function populateEcttEmployeeFilter() {
    const select = document.getElementById('ectt-employee-filter');
    if (!select) return;
    const employees = Array.from(new Set((window.allTimeLogs || []).map(log => log.userId || log.userName).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b));
    select.innerHTML = '<option value="all">All Employees</option>' + 
        employees.map(emp => `<option value="${escapeHtml(emp)}">${escapeHtml(emp)}</option>`).join('');
}

function populateEcttClientFilter() {
    const select = document.getElementById('ectt-client-filter');
    if (!select) return;
    const clients = Array.from(new Set((window.tasks || []).filter(t => t.client).map(t => t.client)))
        .sort((a, b) => a.localeCompare(b));
    select.innerHTML = '<option value="all">All Clients</option>' + 
        clients.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
}

function getEcttFilters() {
    return {
        employee: document.getElementById('ectt-employee-filter')?.value || 'all',
        client: document.getElementById('ectt-client-filter')?.value || 'all',
        taskType: document.getElementById('ectt-tasktype-filter')?.value || 'all',
        status: document.getElementById('ectt-status-filter')?.value || 'all'
    };
}

function formatTime(seconds) {
    if (!seconds || seconds < 0) return '0m';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
}

function renderEmployeeClientTimingReport() {
    try {
        console.log('=== ECTT RENDER START ===');
        console.log('Current User:', window.currentUser?.email || 'NOT SET');
        console.log('allTimeLogs count:', window.allTimeLogs?.length || 0);
        console.log('tasks count:', window.tasks?.length || 0);
        
        const filters = getEcttFilters();
        
        // Wait for critical data
        if (!window.currentUser || !window.allTimeLogs || window.allTimeLogs.length === 0) {
            console.warn('⚠️ ECTT DATA NOT READY:', {
                hasCurrentUser: !!window.currentUser,
                hasTimeLogs: !!window.allTimeLogs,
                timeLogCount: window.allTimeLogs?.length || 0
            });
            const el = document.getElementById('ectt-executive-summary');
            if (el) el.innerHTML = 
                '<p class="text-center text-slate-400 text-sm py-8">Loading data... (Logs: ' + (window.allTimeLogs?.length || 0) + ')</p>';
            return;
        }
        
        // Get date range from global report filters if set, otherwise use a default (last 30 days)
        let fromTs, toTs;
        
        if (window.reportDateFrom && window.reportDateTo) {
            // Use global report filters if set
            fromTs = new Date(window.reportDateFrom).getTime();
            toTs = new Date(window.reportDateTo).getTime() + 86400000;
            console.log('✓ Using global date filters:', window.reportDateFrom, 'to', window.reportDateTo);
        } else {
            // Use default: last 30 days
            const now = Date.now();
            fromTs = now - (30 * 86400000);
            toTs = now;
            console.log('✓ Using default 30-day range');
        }

        console.log('✓ Filters:', filters);

        // Build task-client and task-type maps
        const taskClientMap = {};
        const taskTypeMap = {};
        (window.tasks || []).forEach(t => { 
            if (t.client) taskClientMap[t.id] = t.client;
            if (t.type || t.category) taskTypeMap[t.id] = (t.type || t.category).toLowerCase();
        });

        // Filter time logs with all criteria
        let filteredLogs = (window.allTimeLogs || []).filter(log => {
            const ts = log.endTime || log.startTime || 0;
            if (ts < fromTs || ts >= toTs) return false;
            
            // Employee filter
            const userId = log.userId || log.userName || '';
            if (filters.employee !== 'all' && userId !== filters.employee) return false;
            
            // Client filter
            const client = log.client || taskClientMap[log.taskId] || 'Other';
            if (filters.client !== 'all' && client !== filters.client) return false;
            
            // Task Type filter
            if (filters.taskType !== 'all') {
                const taskType = taskTypeMap[log.taskId] || 'other';
                if (taskType !== filters.taskType.toLowerCase()) return false;
            }
            
            // Status filter
            if (filters.status !== 'all') {
                const task = (window.tasks || []).find(t => t.id === log.taskId);
                const taskStatus = task?.status || 'Unknown';
                if (taskStatus !== filters.status) return false;
            }
            
            return true;
        });

        console.log('✓ Filtered logs:', filteredLogs.length, 'from total:', window.allTimeLogs?.length || 0);

        // Get employee name from filtered logs
        const selectedEmployee = filteredLogs.length > 0 ? (filteredLogs[0].userName || filteredLogs[0].userId || filters.employee) : filters.employee;

        // Aggregate by client and task
        const clientData = {};
        filteredLogs.forEach(log => {
            const client = log.client || taskClientMap[log.taskId] || 'Other';

            if (!clientData[client]) {
                clientData[client] = {
                    name: client,
                    totalSeconds: 0,
                    taskMap: {},
                    dailyMap: {}
                };
            }

            const task = (window.tasks || []).find(t => t.id === log.taskId);
            const taskKey = log.taskId || 'Unknown';
            
            if (!clientData[client].taskMap[taskKey]) {
                clientData[client].taskMap[taskKey] = {
                    id: taskKey,
                    name: task?.desc || log.taskDesc || 'Unknown Task',
                    status: task?.status || 'Unknown',
                    priority: task?.priority || 'Normal',
                    type: task?.type || task?.category || 'Other',
                    totalSeconds: 0,
                    sessions: []
                };
            }

            const seconds = log.durationSeconds || 0;
            clientData[client].totalSeconds += seconds;
            clientData[client].taskMap[taskKey].totalSeconds += seconds;
            clientData[client].taskMap[taskKey].sessions.push(log);

            // Daily tracking
            const date = log.date || new Date(log.startTime || 0).toISOString().split('T')[0];
            if (!clientData[client].dailyMap[date]) {
                clientData[client].dailyMap[date] = 0;
            }
            clientData[client].dailyMap[date] += seconds;
        });

        // Calculate metrics
        const metrics = calculateProductivityMetrics(filteredLogs, clientData, filters, selectedEmployee);

        console.log('✓ Aggregation complete - Rendering sections');
        
        // Render all sections
        renderEcttExecutiveSummary(selectedEmployee, metrics, clientData);
        renderEcttClientBreakdown(clientData, metrics);
        renderEcttTimeDistribution(clientData);
        renderEcttDailyTimeline(filteredLogs, clientData);
        renderEcttAiInsights(selectedEmployee, metrics, clientData);
        renderEcttPerformanceMetrics(metrics, clientData);
        
        console.log('✅ ECTT Rendering complete');
    } catch (error) {
        console.error('❌ ECTT Error:', error);
        const el = document.getElementById('ectt-executive-summary');
        if (el) el.innerHTML = 
            '<p class="text-center text-red-400 text-sm py-8">Error: ' + error.message + '</p>';
    }
}

function calculateProductivityMetrics(logs, clientData, filters, employee) {
    let totalSeconds = 0;
    let completedTasks = 0;
    let totalTasks = 0;
    let holdDuration = 0;
    const taskTimes = [];
    const hourlyBreakdown = {};

    Object.values(clientData).forEach(client => {
        totalSeconds += client.totalSeconds;
        Object.values(client.taskMap).forEach(task => {
            totalTasks++;
            taskTimes.push(task.totalSeconds);
            if (task.status && ['Completed', 'Done', 'Closed'].includes(task.status)) {
                completedTasks++;
            }
        });
    });

    // Active working time (assume 85% of logged time is active)
    const activeWorkingTime = Math.round(totalSeconds * 0.85);
    const holdTime = totalSeconds - activeWorkingTime;

    // Calculate hourly breakdown
    logs.forEach(log => {
        const hour = new Date(log.startTime || 0).getHours();
        hourlyBreakdown[hour] = (hourlyBreakdown[hour] || 0) + (log.durationSeconds || 0);
    });

    const avgTimePerTask = totalTasks > 0 ? Math.round(totalSeconds / totalTasks) : 0;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const productivityScore = calculateProductivityScore(completionRate, avgTimePerTask, holdTime, totalSeconds);

    return {
        employee,
        totalWorkingTime: totalSeconds,
        activeWorkingTime,
        holdTime,
        completedTasks,
        totalTasks,
        pendingTasks: totalTasks - completedTasks,
        avgTimePerTask,
        completionRate,
        productivityScore,
        clientsWorkedOn: Object.keys(clientData).length,
        hourlyBreakdown,
        taskTimes
    };
}

function calculateProductivityScore(completionRate, avgTaskTime, holdTime, totalTime) {
    let score = 50; // Base score
    
    // Completion rate (max +25)
    score += Math.min(25, (completionRate / 100) * 25);
    
    // Task efficiency - prefer 2-4 hours per task (max +20)
    const optimalTaskTime = 7200; // 2 hours in seconds
    const taskEfficiency = Math.min(20, 20 * (1 - Math.abs(avgTaskTime - optimalTaskTime) / optimalTaskTime));
    score += Math.max(0, taskEfficiency);
    
    // Hold time ratio - lower is better (max +20)
    const holdRatio = holdTime / totalTime;
    score += Math.max(0, Math.min(20, 20 * (1 - holdRatio)));
    
    // Cap at 100
    return Math.min(100, Math.round(score));
}

function renderEcttExecutiveSummary(employee, metrics, clientData) {
    const container = document.getElementById('ectt-executive-summary');
    if (!container) return;

    const ratingLabel = metrics.productivityScore >= 90 ? 'Excellent' : 
                       metrics.productivityScore >= 75 ? 'Good' :
                       metrics.productivityScore >= 50 ? 'Average' : 'Needs Improvement';
    
    container.innerHTML = `
        <div class="space-y-4">
            <h3 class="text-lg font-black text-slate-900 uppercase tracking-wide">Executive Summary</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div class="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-xl p-4 border border-indigo-200/50">
                    <p class="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">Total Working Time</p>
                    <p class="text-2xl font-black text-indigo-700">${formatTime(metrics.totalWorkingTime)}</p>
                </div>
                <div class="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-4 border border-emerald-200/50">
                    <p class="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Clients Worked</p>
                    <p class="text-2xl font-black text-emerald-700">${metrics.clientsWorkedOn}</p>
                </div>
                <div class="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-4 border border-amber-200/50">
                    <p class="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Tasks Completed</p>
                    <p class="text-2xl font-black text-amber-700">${metrics.completedTasks}/${metrics.totalTasks}</p>
                </div>
                <div class="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4 border border-purple-200/50">
                    <p class="text-[10px] font-bold text-purple-600 uppercase tracking-widest mb-1">Productivity Score</p>
                    <p class="text-2xl font-black text-purple-700">${metrics.productivityScore}%</p>
                    <p class="text-xs font-bold text-purple-600 mt-1">${ratingLabel}</p>
                </div>
            </div>
        </div>
    `;
}

function renderEcttClientBreakdown(clientData, metrics) {
    const container = document.getElementById('ectt-client-breakdown');
    if (!container) return;

    const sortedClients = Object.values(clientData).sort((a, b) => b.totalSeconds - a.totalSeconds);

    let html = '<div class="space-y-3"><h3 class="text-lg font-black text-slate-900 uppercase tracking-wide">Client Breakdown</h3>';
    
    sortedClients.forEach(client => {
        const tasks = Object.values(client.taskMap).sort((a, b) => b.totalSeconds - a.totalSeconds);
        const completedCount = tasks.filter(t => t.status && ['Completed', 'Done', 'Closed'].includes(t.status)).length;
        const completionPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

        html += `
            <details class="group bg-white border border-slate-100 rounded-xl overflow-hidden hover:border-slate-200 transition-all">
                <summary class="cursor-pointer px-4 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div class="flex items-center gap-3 flex-1 min-w-0">
                        <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shrink-0">
                            <iconify-icon icon="solar:buildings-bold" class="text-indigo-600" width="18"></iconify-icon>
                        </div>
                        <div class="min-w-0 flex-1">
                            <p class="font-black text-slate-900">${escapeHtml(client.name)}</p>
                            <p class="text-xs text-slate-400 font-bold uppercase tracking-widest">${formatTime(client.totalSeconds)} • ${tasks.length} tasks</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0 ml-4">
                        <span class="text-sm font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700">${completionPct}% Done</span>
                        <iconify-icon icon="solar:alt-arrow-down-bold" class="text-slate-400 group-open:rotate-180 transition-transform" width="18"></iconify-icon>
                    </div>
                </summary>
                <div class="px-4 py-4 bg-slate-50/50 border-t border-slate-100">
                    <div class="space-y-2">
                        ${tasks.map(task => `
                            <div class="bg-white p-3 rounded-lg border border-slate-100 flex items-center justify-between">
                                <div class="min-w-0 flex-1">
                                    <div class="flex items-center gap-2 mb-1">
                                        <span class="font-mono font-bold text-indigo-600 text-xs">${escapeHtml(task.id)}</span>
                                        <span class="text-xs font-bold px-2 py-0.5 rounded-full ${task.status && ['Completed', 'Done', 'Closed'].includes(task.status) ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}">${task.status || 'Unknown'}</span>
                                    </div>
                                    <p class="text-sm font-semibold text-slate-800 truncate">${escapeHtml(task.name)}</p>
                                    <p class="text-xs text-slate-400 mt-1">Type: ${task.type} • Priority: ${task.priority}</p>
                                </div>
                                <div class="ml-4 shrink-0 text-right">
                                    <p class="font-mono font-bold text-slate-700">${formatTime(task.totalSeconds)}</p>
                                    <p class="text-xs text-slate-400">${task.sessions.length} sessions</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </details>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

function renderEcttTimeDistribution(clientData) {
    const container = document.getElementById('ectt-time-distribution');
    if (!container) return;

    // Build distribution by task type
    const typeMap = {};
    Object.values(clientData).forEach(client => {
        Object.values(client.taskMap).forEach(task => {
            if (!typeMap[task.type]) typeMap[task.type] = 0;
            typeMap[task.type] += task.totalSeconds;
        });
    });

    const sortedTypes = Object.entries(typeMap).sort((a, b) => b[1] - a[1]);
    const totalSeconds = sortedTypes.reduce((sum, [, sec]) => sum + sec, 0);

    let html = `
        <div class="space-y-4">
            <h3 class="text-lg font-black text-slate-900 uppercase tracking-wide">Time Distribution</h3>
            <div class="bg-white rounded-xl border border-slate-100 p-6">
                <div class="space-y-3">
    `;

    sortedTypes.forEach(([type, seconds]) => {
        const pct = totalSeconds > 0 ? Math.round((seconds / totalSeconds) * 100) : 0;
        html += `
            <div>
                <div class="flex items-center justify-between mb-1">
                    <span class="text-sm font-bold text-slate-700">${escapeHtml(type)}</span>
                    <span class="text-sm font-bold text-slate-600">${formatTime(seconds)} (${pct}%)</span>
                </div>
                <div class="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all" style="width: ${pct}%"></div>
                </div>
            </div>
        `;
    });

    html += '</div></div></div>';
    container.innerHTML = html;
}

function renderEcttDailyTimeline(logs, clientData) {
    const container = document.getElementById('ectt-daily-timeline');
    if (!container) return;

    // Group by date
    const dateMap = {};
    logs.forEach(log => {
        const date = log.date || new Date(log.startTime || 0).toISOString().split('T')[0];
        if (!dateMap[date]) dateMap[date] = [];
        dateMap[date].push(log);
    });

    const sortedDates = Object.keys(dateMap).sort().reverse();

    let html = `
        <div class="space-y-4">
            <h3 class="text-lg font-black text-slate-900 uppercase tracking-wide">Daily Work Timeline</h3>
            <div class="space-y-3">
    `;

    sortedDates.slice(0, 7).forEach(date => {
        const dayLogs = dateMap[date].sort((a, b) => (a.startTime || 0) - (b.startTime || 0));
        const dayTotal = dayLogs.reduce((sum, log) => sum + (log.durationSeconds || 0), 0);
        const dateObj = new Date(date + 'T00:00:00');
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
        const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        html += `
            <div class="bg-white rounded-xl border border-slate-100 p-4">
                <div class="flex items-center justify-between mb-3">
                    <div>
                        <p class="font-black text-slate-900">${dayName}</p>
                        <p class="text-xs text-slate-400 font-bold">${formattedDate}</p>
                    </div>
                    <span class="font-mono font-bold text-indigo-600">${formatTime(dayTotal)}</span>
                </div>
                <div class="space-y-2">
        `;

        dayLogs.forEach(log => {
            const startTime = new Date(log.startTime || 0).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const taskClientMap = {};
            (window.tasks || []).forEach(t => { if (t.client) taskClientMap[t.id] = t.client; });
            const client = log.client || taskClientMap[log.taskId] || 'Unknown';

            html += `
                <div class="flex items-center gap-2 text-xs">
                    <span class="font-bold text-slate-700 w-12">${startTime}</span>
                    <span class="text-slate-400">—</span>
                    <span class="font-bold text-slate-600 flex-1">${escapeHtml(client)}</span>
                    <span class="text-slate-500">${log.taskDesc || 'Task'}</span>
                    <span class="font-mono font-bold text-indigo-600">${formatTime(log.durationSeconds || 0)}</span>
                </div>
            `;
        });

        html += '</div></div>';
    });

    html += '</div></div>';
    container.innerHTML = html;
}

function renderEcttAiInsights(employee, metrics, clientData) {
    const container = document.getElementById('ectt-ai-insights');
    if (!container) return;

    const clientCount = metrics.clientsWorkedOn;
    const avgHoursPerDay = metrics.totalWorkingTime / Math.max(1, Object.keys(clientData).length) / 3600;
    const peakHour = Object.entries(metrics.hourlyBreakdown).sort((a, b) => b[1] - a[1])[0];
    const peakHourValue = peakHour ? peakHour[0] : 'N/A';

    let insights = [];

    if (metrics.completionRate >= 90) {
        insights.push(`<li>Excellent task completion rate of ${metrics.completionRate}% - demonstrates strong focus and delivery capability.</li>`);
    } else if (metrics.completionRate >= 70) {
        insights.push(`<li>Good task completion at ${metrics.completionRate}% - consider prioritizing pending items to improve further.</li>`);
    } else {
        insights.push(`<li>Task completion rate is ${metrics.completionRate}% - recommend focusing on completing pending tasks before starting new work.</li>`);
    }

    if (metrics.productivityScore >= 80) {
        insights.push(`<li>High productivity index (${metrics.productivityScore}%) indicates consistent, focused work patterns.</li>`);
    }

    if (clientCount >= 5) {
        insights.push(`<li>Working across ${clientCount} clients requires context switching - consider batching similar task types.</li>`);
    }

    if (metrics.holdTime > metrics.totalWorkingTime * 0.2) {
        insights.push(`<li>Hold time accounts for ${Math.round((metrics.holdTime / metrics.totalWorkingTime) * 100)}% of logged time - investigate blockers.</li>`);
    }

    insights.push(`<li>Peak productive hours are around ${peakHourValue}:00 - schedule important tasks during this window.</li>`);
    insights.push(`<li>Average task duration of ${formatTime(metrics.avgTimePerTask)} aligns with standard project timelines.</li>`);

    const html = `
        <div class="space-y-4">
            <div class="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200/50 p-6">
                <h3 class="text-lg font-black text-purple-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <iconify-icon icon="solar:lightbulb-bold" class="text-purple-600" width="20"></iconify-icon>
                    AI Insights & Recommendations
                </h3>
                <ul class="space-y-2 text-sm text-slate-700">
                    ${insights.map(insight => insight).join('')}
                </ul>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function renderEcttPerformanceMetrics(metrics, clientData) {
    const container = document.getElementById('ectt-performance-metrics');
    if (!container) return;

    const metrics_list = [
        { label: 'Total Working Time', value: formatTime(metrics.totalWorkingTime), icon: 'solar:clock-circle-bold', color: 'indigo' },
        { label: 'Active Working Time', value: formatTime(metrics.activeWorkingTime), icon: 'solar:play-circle-bold', color: 'emerald' },
        { label: 'Hold Time', value: formatTime(metrics.holdTime), icon: 'solar:pause-circle-bold', color: 'amber' },
        { label: 'Avg Time Per Task', value: formatTime(metrics.avgTimePerTask), icon: 'solar:calendar-bold', color: 'sky' },
        { label: 'Completion Rate', value: `${metrics.completionRate}%`, icon: 'solar:check-circle-bold', color: 'emerald' },
        { label: 'Clients Engaged', value: metrics.clientsWorkedOn, icon: 'solar:buildings-bold', color: 'purple' }
    ];

    let html = `
        <div class="space-y-4">
            <h3 class="text-lg font-black text-slate-900 uppercase tracking-wide">Performance Metrics</h3>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
    `;

    metrics_list.forEach(({ label, value, icon, color }) => {
        const colorMap = {
            indigo: 'from-indigo-100 to-indigo-50 border-indigo-200',
            emerald: 'from-emerald-100 to-emerald-50 border-emerald-200',
            amber: 'from-amber-100 to-amber-50 border-amber-200',
            sky: 'from-sky-100 to-sky-50 border-sky-200',
            purple: 'from-purple-100 to-purple-50 border-purple-200'
        };
        const textColorMap = {
            indigo: 'text-indigo-700',
            emerald: 'text-emerald-700',
            amber: 'text-amber-700',
            sky: 'text-sky-700',
            purple: 'text-purple-700'
        };
        const iconColorMap = {
            indigo: 'text-indigo-600',
            emerald: 'text-emerald-600',
            amber: 'text-amber-600',
            sky: 'text-sky-600',
            purple: 'text-purple-600'
        };

        html += `
            <div class="bg-gradient-to-br ${colorMap[color]} border rounded-xl p-4">
                <div class="flex items-start gap-2 mb-2">
                    <iconify-icon icon="${icon}" class="${iconColorMap[color]}" width="18"></iconify-icon>
                    <p class="text-[10px] font-bold uppercase tracking-widest text-slate-600">${label}</p>
                </div>
                <p class="text-xl font-black ${textColorMap[color]}">${value}</p>
            </div>
        `;
    });

    html += '</div></div>';
    container.innerHTML = html;
}

function exportEmployeeClientTimingReport() {
    const filters = getEcttFilters();
    if (!window.reportDateFrom || !window.reportDateTo) {
        return window.toast ? window.toast('Please select a date range', 'error') : alert('Please select a date range');
    }

    const fromTs = new Date(window.reportDateFrom).getTime();
    const toTs = new Date(window.reportDateTo).getTime() + 86400000;

    let filteredLogs = (window.allTimeLogs || []).filter(log => {
        const ts = log.endTime || log.startTime || 0;
        if (ts < fromTs || ts >= toTs) return false;
        const userId = log.userId || log.userName || '';
        if (filters.employee !== 'all' && userId !== filters.employee) return false;
        return true;
    });

    if (!filteredLogs.length) {
        return window.toast ? window.toast('No data to export', 'info') : alert('No data to export');
    }

    const taskClientMap = {};
    (window.tasks || []).forEach(t => { if (t.client) taskClientMap[t.id] = t.client; });

    const headers = ['Date', 'Employee', 'Client', 'Task ID', 'Task Description', 'Status', 'Time (Hours)', 'Type', 'Priority'];
    const rows = filteredLogs.map(log => {
        const task = (window.tasks || []).find(t => t.id === log.taskId);
        const client = log.client || taskClientMap[log.taskId] || 'Other';
        const date = log.date || new Date(log.startTime || 0).toISOString().split('T')[0];
        const hours = ((log.durationSeconds || 0) / 3600).toFixed(2);

        return [
            date,
            log.userName || log.userId || '',
            client,
            log.taskId || '',
            log.taskDesc || task?.desc || '',
            task?.status || '',
            hours,
            task?.type || task?.category || '',
            task?.priority || ''
        ].map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',');
    });

    const csv = [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `employee-client-timing-${window.reportDateFrom}_to_${window.reportDateTo}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    if (window.toast) {
        window.toast('Report exported successfully', 'success');
    } else {
        alert('Report exported successfully');
    }
}
