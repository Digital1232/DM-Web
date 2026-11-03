/**
 * OneDesk Team Reports UI & Rendering Modules
 * Modernized SaaS reporting interfaces for:
 * A. Productivity Analytics
 * B. Daily Summary
 * C. Weekly Summary
 * D. Detailed Audit Log
 * E. Employee Performance
 * F. Individual Performance Analytics
 * G. Task Delivery & Timing Report
 *
 * Integrated with OneDeskReportingEngine as Single Source of Truth
 */

(function (window) {
    'use strict';

    const Engine = window.OneDeskReportingEngine;
    if (!Engine) {
        console.error('OneDeskReportingEngine is required before loading reportingModules.js');
        return;
    }

    // Helper to format local currency or metrics
    const esc = (val) => {
        if (typeof window.escapeHtml === 'function') return window.escapeHtml(val || '');
        return String(val || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    };

    // ─────────────────────────────────────────────────────────────
    // GLOBAL FILTER ENHANCEMENTS
    // ─────────────────────────────────────────────────────────────

    window.populateReportUserFilter = function () {
        const userInput = document.getElementById('report-user-filter');
        const weeklyUserInput = document.getElementById('weekly-report-user-filter');
        const indivSelect = document.getElementById('indiv-perf-user-select');
        const ecttUser = document.getElementById('ectt-employee-filter');

        const employees = Engine.getAllEmployees();
        const selects = [userInput, weeklyUserInput, indivSelect, ecttUser].filter(Boolean);

        selects.forEach(selectEl => {
            const currentVal = selectEl.value || window.reportSelectedUser || 'all';
            const isIndivOnly = (selectEl === indivSelect);

            selectEl.innerHTML = isIndivOnly
                ? '<option value="">-- Select Team Member --</option>'
                : '<option value="all">All Members (Organization)</option>';

            employees.forEach(emp => {
                const opt = document.createElement('option');
                opt.value = emp.email;
                opt.textContent = `${emp.name} (${emp.role || 'Member'})`;
                selectEl.appendChild(opt);
            });

            if ([...selectEl.options].some(o => o.value === currentVal)) {
                selectEl.value = currentVal;
            } else if (isIndivOnly && employees.length > 0) {
                // Default to first employee or current user if available
                const curUserEmail = Engine.normalizeEmail(window.currentUser?.email);
                const defaultEmp = employees.find(e => e.email === curUserEmail) || employees[0];
                selectEl.value = defaultEmp.email;
            }
        });
    };

    window.setReportDatePreset = function (preset) {
        const fromInput = document.getElementById('report-date-from');
        const toInput = document.getElementById('report-date-to');
        if (!fromInput || !toInput) return;

        const range = Engine.getDateRange(preset);
        fromInput.value = range.fromDateStr;
        toInput.value = range.toDateStr;
        window.reportDateFrom = range.fromDateStr;
        window.reportDateTo = range.toDateStr;

        const picker = document.getElementById('report-datepicker')?.litepicker;
        if (picker) {
            try {
                picker.setDateRange(new Date(range.fromTs), new Date(range.toTs));
            } catch (e) {
                console.warn('Litepicker sync notice:', e);
            }
        }

        document.querySelectorAll('.report-preset-btn').forEach(btn => {
            btn.classList.remove('bg-white', 'text-indigo-600', 'shadow-sm');
            btn.classList.add('text-slate-500');
        });
        const activeBtn = document.querySelector(`button[onclick*="setReportDatePreset('${preset}')"]`);
        if (activeBtn) {
            activeBtn.classList.add('bg-white', 'text-indigo-600', 'shadow-sm');
            activeBtn.classList.remove('text-slate-500');
        }

        window.handleReportFilterChange();
    };

    // ─────────────────────────────────────────────────────────────
    // A. PRODUCTIVITY ANALYTICS MODULE
    // ─────────────────────────────────────────────────────────────

    window.renderAnalyticsReport = function () {
        const metricsGrid = document.getElementById('analytics-metrics-grid');
        const chartDiv = document.getElementById('analytics-chart');
        if (!metricsGrid || !chartDiv) return;

        if (!window.reportDateFrom || !window.reportDateTo) {
            chartDiv.innerHTML = `<p class="text-center text-slate-400 text-sm py-8 col-span-2">Please select a valid date range to compute analytics.</p>`;
            return;
        }

        const range = Engine.getDateRange('custom', window.reportDateFrom, window.reportDateTo);
        const kpis = Engine.computeComprehensiveKPIs(range.fromTs, range.toTs, window.reportSelectedUser);
        const prevRange = Engine.getPreviousEquivalentRange(range.fromTs, range.toTs);
        const prevKpis = Engine.computeComprehensiveKPIs(prevRange.fromTs, prevRange.toTs, window.reportSelectedUser);

        // Previous period delta calculations
        const deltaWorkedSec = kpis.timing.workedSeconds - prevKpis.timing.workedSeconds;
        const deltaWorkedPct = prevKpis.timing.workedSeconds > 0
            ? Math.round((deltaWorkedSec / prevKpis.timing.workedSeconds) * 100)
            : (kpis.timing.workedSeconds > 0 ? 100 : 0);

        const deltaUtil = kpis.timing.utilizationPct - prevKpis.timing.utilizationPct;
        const deltaTasks = kpis.tasks.completedCount - prevKpis.tasks.completedCount;

        const deltaBadge = (val, isPct = false, suffix = '') => {
            const isPos = val > 0;
            const isZero = val === 0;
            const color = isZero ? 'bg-slate-100 text-slate-600' : (isPos ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200');
            const sign = isPos ? '+' : '';
            return `<span class="inline-flex items-center text-[10px] font-black px-2 py-0.5 rounded-md ${color}">${sign}${val}${isPct ? '%' : ''}${suffix} vs prev period</span>`;
        };

        // Render Top 4 KPI Cards
        metricsGrid.innerHTML = `
            <div class="bg-gradient-to-br from-indigo-50/60 to-white border border-indigo-100/80 rounded-2xl p-5 shadow-xs relative overflow-hidden group">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-[11px] font-black text-slate-500 uppercase tracking-wider">Total Logged Work</span>
                    <div class="w-8 h-8 rounded-xl bg-indigo-100/80 text-indigo-700 flex items-center justify-center shrink-0">
                        <iconify-icon icon="solar:stopwatch-bold" width="18"></iconify-icon>
                    </div>
                </div>
                <div class="text-2xl font-black text-slate-900 tracking-tight">${Engine.formatDurationHMS(kpis.timing.workedSeconds)}</div>
                <div class="mt-2 flex items-center justify-between">
                    <span class="text-[11px] text-slate-400 font-semibold">${Engine.formatDuration(kpis.timing.workedSeconds)}</span>
                    ${deltaBadge(deltaWorkedPct, true)}
                </div>
            </div>

            <div class="bg-gradient-to-br from-emerald-50/60 to-white border border-emerald-100/80 rounded-2xl p-5 shadow-xs relative overflow-hidden group">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-[11px] font-black text-slate-500 uppercase tracking-wider">Time Utilization</span>
                    <div class="w-8 h-8 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0">
                        <iconify-icon icon="solar:chart-2-bold" width="18"></iconify-icon>
                    </div>
                </div>
                <div class="text-2xl font-black text-slate-900 tracking-tight">${kpis.timing.utilizationPct}%</div>
                <div class="mt-2 flex items-center justify-between">
                    <span class="text-[11px] text-slate-400 font-semibold">Active: ${Engine.formatDuration(kpis.timing.activeSeconds)}</span>
                    ${deltaBadge(deltaUtil, true)}
                </div>
            </div>

            <div class="bg-gradient-to-br from-amber-50/60 to-white border border-amber-100/80 rounded-2xl p-5 shadow-xs relative overflow-hidden group">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-[11px] font-black text-slate-500 uppercase tracking-wider">Peak Productive Hour</span>
                    <div class="w-8 h-8 rounded-xl bg-amber-100/80 text-amber-700 flex items-center justify-center shrink-0">
                        <iconify-icon icon="solar:cup-star-bold" width="18"></iconify-icon>
                    </div>
                </div>
                <div class="text-2xl font-black text-slate-900 tracking-tight">${kpis.timing.peakHour}</div>
                <div class="mt-2 flex items-center justify-between">
                    <span class="text-[11px] text-slate-400 font-semibold">${Engine.formatDuration(kpis.timing.peakHourSeconds)} output</span>
                    <span class="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">Max Intensity</span>
                </div>
            </div>

            <div class="bg-gradient-to-br from-violet-50/60 to-white border border-violet-100/80 rounded-2xl p-5 shadow-xs relative overflow-hidden group">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-[11px] font-black text-slate-500 uppercase tracking-wider">Task Completion Rate</span>
                    <div class="w-8 h-8 rounded-xl bg-violet-100/80 text-violet-700 flex items-center justify-center shrink-0">
                        <iconify-icon icon="solar:checklist-bold" width="18"></iconify-icon>
                    </div>
                </div>
                <div class="text-2xl font-black text-slate-900 tracking-tight">${kpis.tasks.completionRatePct}%</div>
                <div class="mt-2 flex items-center justify-between">
                    <span class="text-[11px] text-slate-400 font-semibold">${kpis.tasks.completedCount} / ${kpis.tasks.assignedCount} tasks</span>
                    ${deltaBadge(deltaTasks, false, ' tasks')}
                </div>
            </div>
        `;

        // Render Formula & Definition Explanations
        const totalBase = Math.max(kpis.timing.activeSeconds, (kpis.timing.workedSeconds + kpis.timing.breakSeconds + kpis.timing.holdSeconds) || 1);
        const workedPct = Math.round((kpis.timing.workedSeconds / totalBase) * 100);
        const breakPct = Math.round((kpis.timing.breakSeconds / totalBase) * 100);
        const holdPct = Math.round((kpis.timing.holdSeconds / totalBase) * 100);
        const idlePct = Math.max(0, 100 - workedPct - breakPct - holdPct);

        // Render Charts & Breakdown
        chartDiv.innerHTML = `
            <!-- Time Allocation Breakdown -->
            <div class="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-5">
                <div class="flex items-center justify-between border-b border-slate-50 pb-3">
                    <div>
                        <h4 class="text-sm font-black text-slate-900">Time Allocation Breakdown</h4>
                        <p class="text-[11px] text-slate-400 font-semibold">Distribution of tracked active hours across work, breaks, hold, and idle</p>
                    </div>
                    <span class="text-xs font-bold text-slate-500">Base: ${Engine.formatDuration(totalBase)}</span>
                </div>

                <!-- Visual Stacked Bar -->
                <div class="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                    <div class="bg-indigo-600 h-full transition-all" style="width: ${workedPct}%" title="Logged Work: ${workedPct}% (${Engine.formatDuration(kpis.timing.workedSeconds)})"></div>
                    <div class="bg-amber-400 h-full transition-all" style="width: ${breakPct}%" title="Breaks: ${breakPct}% (${Engine.formatDuration(kpis.timing.breakSeconds)})"></div>
                    <div class="bg-sky-400 h-full transition-all" style="width: ${holdPct}%" title="On Hold: ${holdPct}% (${Engine.formatDuration(kpis.timing.holdSeconds)})"></div>
                    <div class="bg-slate-300 h-full transition-all" style="width: ${idlePct}%" title="Idle Time: ${idlePct}% (${Engine.formatDuration(kpis.timing.idleSeconds)})"></div>
                </div>

                <!-- Metric Details Grid -->
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div class="p-3 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                        <div class="flex items-center gap-1.5 text-indigo-700 text-xs font-bold mb-1">
                            <span class="w-2.5 h-2.5 rounded-full bg-indigo-600"></span> Logged Work
                        </div>
                        <div class="text-base font-black text-slate-900">${Engine.formatDuration(kpis.timing.workedSeconds)}</div>
                        <div class="text-[10px] text-indigo-600 font-semibold">${workedPct}% of session</div>
                    </div>
                    <div class="p-3 rounded-2xl bg-amber-50/50 border border-amber-100">
                        <div class="flex items-center gap-1.5 text-amber-700 text-xs font-bold mb-1">
                            <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Break Duration
                        </div>
                        <div class="text-base font-black text-slate-900">${Engine.formatDuration(kpis.timing.breakSeconds)}</div>
                        <div class="text-[10px] text-amber-600 font-semibold">${breakPct}% of session</div>
                    </div>
                    <div class="p-3 rounded-2xl bg-sky-50/50 border border-sky-100">
                        <div class="flex items-center gap-1.5 text-sky-700 text-xs font-bold mb-1">
                            <span class="w-2.5 h-2.5 rounded-full bg-sky-500"></span> Task On Hold
                        </div>
                        <div class="text-base font-black text-slate-900">${Engine.formatDuration(kpis.timing.holdSeconds)}</div>
                        <div class="text-[10px] text-sky-600 font-semibold">${holdPct}% of session</div>
                    </div>
                    <div class="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                        <div class="flex items-center gap-1.5 text-slate-600 text-xs font-bold mb-1">
                            <span class="w-2.5 h-2.5 rounded-full bg-slate-400"></span> Untracked / Idle
                        </div>
                        <div class="text-base font-black text-slate-900">${Engine.formatDuration(kpis.timing.idleSeconds)}</div>
                        <div class="text-[10px] text-slate-500 font-semibold">${idlePct}% of session</div>
                    </div>
                </div>

                <!-- Calculation Standards Explainer -->
                <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 space-y-1">
                    <p class="font-bold text-slate-800 flex items-center gap-1">
                        <iconify-icon icon="solar:info-circle-bold" class="text-indigo-600" width="14"></iconify-icon>
                        KPI Calculation Logic:
                    </p>
                    <p>• <strong>Time Utilization:</strong> (Logged Work / Available Active Time) × 100 = <strong>${kpis.timing.utilizationPct}%</strong></p>
                    <p>• <strong>Active Productivity:</strong> (Logged Work / Non-Break Active Time) × 100 = <strong>${kpis.timing.productivityPct}%</strong></p>
                </div>
            </div>

            <!-- Hourly Productivity Intensity -->
            <div class="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-5">
                <div class="flex items-center justify-between border-b border-slate-50 pb-3">
                    <div>
                        <h4 class="text-sm font-black text-slate-900">Hourly Productivity Intensity</h4>
                        <p class="text-[11px] text-slate-400 font-semibold">Logged work distribution across working hours (08:00 to 21:00)</p>
                    </div>
                    <span class="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Peak: ${kpis.timing.peakHour}</span>
                </div>

                <div class="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    ${Object.entries(kpis.timing.hourlyMap).map(([hour, sec]) => {
            const maxVal = Math.max(...Object.values(kpis.timing.hourlyMap), 1);
            const barWidth = Math.round((sec / maxVal) * 100);
            const isPeak = (`${hour}:00` === kpis.timing.peakHour && sec > 0);
            return `
                            <div class="flex items-center gap-3">
                                <span class="text-[11px] font-bold w-12 text-slate-500">${hour}:00</span>
                                <div class="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden relative">
                                    <div class="${isPeak ? 'bg-amber-500' : 'bg-emerald-500'} h-full rounded-full transition-all" style="width: ${barWidth}%"></div>
                                </div>
                                <span class="text-[11px] font-black w-16 text-right ${isPeak ? 'text-amber-600 font-extrabold' : 'text-slate-700'}">${Engine.formatDuration(sec)}</span>
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;
    };

    // ─────────────────────────────────────────────────────────────
    // B. DAILY SUMMARY MODULE
    // ─────────────────────────────────────────────────────────────

    window.renderSummaryReport = function () {
        const container = document.getElementById('summary-chart-container');
        if (!container) return;

        if (!window.reportDateFrom || !window.reportDateTo) {
            container.innerHTML = `<p class="text-center text-slate-400 text-sm py-8">Please select a date range to view the Daily Summary.</p>`;
            return;
        }

        const range = Engine.getDateRange('custom', window.reportDateFrom, window.reportDateTo);
        const kpis = Engine.computeComprehensiveKPIs(range.fromTs, range.toTs, window.reportSelectedUser);
        const prevRange = Engine.getPreviousEquivalentRange(range.fromTs, range.toTs);
        const prevKpis = Engine.computeComprehensiveKPIs(prevRange.fromTs, prevRange.toTs, window.reportSelectedUser);
        const insights = Engine.generateManagementInsights(kpis, prevKpis, 'daily');

        // Group metrics by local date
        const byDate = {};
        for (let d = new Date(range.fromTs); d.getTime() <= range.toTs; d.setDate(d.getDate() + 1)) {
            const dateStr = Engine.formatLocalDate(d);
            byDate[dateStr] = { date: dateStr, workedSec: 0, breakSec: 0, tasksDone: 0 };
        }

        kpis.rawLogs.forEach(log => {
            const d = Engine.formatLocalDate(new Date(log.startTime));
            if (byDate[d]) byDate[d].workedSec += (log.durationSeconds || 0);
        });

        kpis.tasks.completedList.forEach(t => {
            const cTs = Engine.parseTimestamp(t.completedAt || t.lastCompletedDate || t.updatedAt);
            if (cTs > 0) {
                const d = Engine.formatLocalDate(new Date(cTs));
                if (byDate[d]) byDate[d].tasksDone++;
            }
        });

        const dayList = Object.values(byDate);
        const daysWithWork = dayList.filter(d => d.workedSec > 0).length;
        const avgDailySec = daysWithWork > 0 ? Math.round(kpis.timing.workedSeconds / daysWithWork) : 0;

        container.innerHTML = `
            <!-- Top Daily Summary Stats -->
            <div class="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3 mb-6">
                <div class="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Total Logged Time</span>
                    <span class="text-xl font-black text-slate-900">${Engine.formatDurationHMS(kpis.timing.workedSeconds)}</span>
                    <span class="text-[10px] text-slate-400 font-semibold block mt-1">${Engine.formatDuration(kpis.timing.workedSeconds)}</span>
                </div>
                <div class="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Daily Average</span>
                    <span class="text-xl font-black text-slate-900">${Engine.formatDuration(avgDailySec)}</span>
                    <span class="text-[10px] text-slate-400 font-semibold block mt-1">Across ${daysWithWork} active day${daysWithWork === 1 ? '' : 's'}</span>
                </div>
                <div class="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    <span class="text-[10px] font-black text-emerald-600 uppercase tracking-wider block mb-1">Completed Tasks</span>
                    <span class="text-xl font-black text-emerald-700">${kpis.tasks.completedCount}</span>
                    <span class="text-[10px] text-emerald-600 font-semibold block mt-1">${kpis.tasks.completionRatePct}% completion rate</span>
                </div>
                <div class="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    <span class="text-[10px] font-black text-amber-600 uppercase tracking-wider block mb-1">Pending Workload</span>
                    <span class="text-xl font-black text-amber-700">${kpis.tasks.pendingCount}</span>
                    <span class="text-[10px] text-amber-600 font-semibold block mt-1">${kpis.tasks.overdueCount} overdue</span>
                </div>
                <div class="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    <span class="text-[10px] font-black text-indigo-600 uppercase tracking-wider block mb-1">Active Utilization</span>
                    <span class="text-xl font-black text-indigo-700">${kpis.timing.utilizationPct}%</span>
                    <span class="text-[10px] text-indigo-600 font-semibold block mt-1">No artificial minimum</span>
                </div>
                <div class="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    <span class="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">QC Quality Score</span>
                    <span class="text-xl font-black text-slate-800">${kpis.qc.hasData ? `${kpis.qc.averageScore}%` : '—'}</span>
                    <span class="text-[10px] text-slate-400 font-semibold block mt-1">${kpis.qc.hasData ? `${kpis.qc.sampleCount} reviews` : 'No QC logs'}</span>
                </div>
            </div>

            <!-- AI Management Daily Insights Banner -->
            <div class="mb-6 bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
                <div class="flex items-center gap-3 mb-3">
                    <div class="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-amber-300">
                        <iconify-icon icon="solar:magic-stick-3-bold" width="18"></iconify-icon>
                    </div>
                    <div>
                        <h4 class="text-sm font-black tracking-wide uppercase text-indigo-200">AI Daily Operations Intelligence</h4>
                        <p class="text-xs font-semibold text-white/90">${esc(insights.headline)}</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/10 text-xs">
                    <div class="space-y-1.5">
                        <p class="text-[10px] font-black uppercase tracking-wider text-emerald-300">Operational Wins</p>
                        ${insights.wins.map(w => `<p class="flex items-start gap-1.5"><iconify-icon icon="solar:check-circle-bold" class="text-emerald-400 shrink-0 mt-0.5" width="13"></iconify-icon><span>${esc(w)}</span></p>`).join('') || '<p class="text-white/60">No specific wins recorded for this period.</p>'}
                    </div>
                    <div class="space-y-1.5">
                        <p class="text-[10px] font-black uppercase tracking-wider text-amber-300">Action Recommendations</p>
                        ${insights.recommendations.map(r => `<p class="flex items-start gap-1.5"><iconify-icon icon="solar:arrow-right-bold" class="text-amber-400 shrink-0 mt-0.5" width="13"></iconify-icon><span>${esc(r)}</span></p>`).join('') || '<p class="text-white/60">Workload is proceeding according to plan.</p>'}
                    </div>
                </div>
            </div>

            <!-- Daily Work Progression & Client Contribution -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <!-- Day-by-Day Bar Progression -->
                <div class="lg:col-span-8 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                    <div class="flex items-center justify-between border-b border-slate-50 pb-3">
                        <h4 class="text-sm font-black text-slate-900">Day-by-Day Output & Target (8h Base)</h4>
                        <span class="text-xs font-semibold text-slate-400">Total: ${Engine.formatDuration(kpis.timing.workedSeconds)}</span>
                    </div>

                    <div class="space-y-3">
                        ${dayList.map(d => {
            const targetSec = 28800; // 8 hours
            const pct = Math.min(100, Math.round((d.workedSec / targetSec) * 100));
            const isMet = d.workedSec >= targetSec;
            return `
                                <div class="flex items-center gap-3">
                                    <span class="text-xs font-bold w-24 text-slate-600">${d.date}</span>
                                    <div class="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden relative">
                                        <div class="${isMet ? 'bg-emerald-500' : 'bg-indigo-600'} h-full rounded-full transition-all" style="width: ${pct}%"></div>
                                    </div>
                                    <span class="text-xs font-black text-slate-800 w-20 text-right">${Engine.formatDuration(d.workedSec)}</span>
                                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${isMet ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'} w-14 text-center">${pct}%</span>
                                </div>
                            `;
        }).join('')}
                    </div>
                </div>

                <!-- Client-Wise Distribution -->
                <div class="lg:col-span-4 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                    <div class="flex items-center justify-between border-b border-slate-50 pb-3">
                        <h4 class="text-sm font-black text-slate-900">Client Contribution</h4>
                        <span class="text-xs font-semibold text-slate-400">${Object.keys(kpis.clientDistribution).length} Clients</span>
                    </div>

                    <div class="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                        ${Object.entries(kpis.clientDistribution).sort((a, b) => b[1] - a[1]).map(([client, sec]) => {
            const pct = kpis.timing.workedSeconds > 0 ? Math.round((sec / kpis.timing.workedSeconds) * 100) : 0;
            return `
                                <div class="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center justify-between">
                                    <div>
                                        <p class="text-xs font-black text-slate-800">${esc(client)}</p>
                                        <p class="text-[10px] text-slate-400 font-semibold">${Engine.formatDuration(sec)}</p>
                                    </div>
                                    <span class="text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-xl">${pct}%</span>
                                </div>
                            `;
        }).join('') || '<p class="text-xs text-slate-400 py-6 text-center">No client time recorded.</p>'}
                    </div>
                </div>
            </div>
        `;
    };

    // ─────────────────────────────────────────────────────────────
    // C. WEEKLY SUMMARY MODULE
    // ─────────────────────────────────────────────────────────────

    window.renderWeeklyReport = function () {
        const container = document.getElementById('weekly-report-container');
        if (!container) return;

        if (!window.reportDateFrom || !window.reportDateTo) {
            container.innerHTML = `<p class="text-center text-slate-400 text-sm py-12">Please select a date range to generate weekly performance reports.</p>`;
            return;
        }

        const range = Engine.getDateRange('custom', window.reportDateFrom, window.reportDateTo);
        const kpis = Engine.computeComprehensiveKPIs(range.fromTs, range.toTs, window.reportSelectedUser);
        const prevRange = Engine.getPreviousEquivalentRange(range.fromTs, range.toTs);
        const prevKpis = Engine.computeComprehensiveKPIs(prevRange.fromTs, prevRange.toTs, window.reportSelectedUser);

        // Employee rankings across organization if 'all' is selected
        const employees = Engine.getAllEmployees();
        const rankingList = employees.map(emp => {
            const empKpis = Engine.computeComprehensiveKPIs(range.fromTs, range.toTs, emp.email);
            return {
                emp,
                workedSec: empKpis.timing.workedSeconds,
                completedTasks: empKpis.tasks.completedCount,
                pendingTasks: empKpis.tasks.pendingCount,
                overdueTasks: empKpis.tasks.overdueCount,
                utilization: empKpis.timing.utilizationPct,
                qcScore: empKpis.qc.hasData ? empKpis.qc.averageScore : null
            };
        }).sort((a, b) => b.completedTasks - a.completedTasks || b.workedSec - a.workedSec);

        container.innerHTML = `
            <!-- Top Weekly Overview Header -->
            <div class="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Worked Hours</span>
                    <span class="text-2xl font-black text-slate-900">${Engine.formatDurationHMS(kpis.timing.workedSeconds)}</span>
                    <span class="text-xs font-semibold text-slate-500 block mt-1">${Engine.formatDuration(kpis.timing.workedSeconds)} logged</span>
                </div>
                <div>
                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Deliverables Completed</span>
                    <span class="text-2xl font-black text-emerald-600">${kpis.tasks.completedCount} Tasks</span>
                    <span class="text-xs font-semibold text-emerald-700 block mt-1">${kpis.tasks.completionRatePct}% completion rate</span>
                </div>
                <div>
                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Active Backlog</span>
                    <span class="text-2xl font-black text-amber-600">${kpis.tasks.pendingCount} Tasks</span>
                    <span class="text-xs font-semibold text-amber-700 block mt-1">${kpis.tasks.overdueCount} approaching / overdue</span>
                </div>
                <div>
                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Quality & Rework Rate</span>
                    <span class="text-2xl font-black text-indigo-600">${kpis.tasks.reworkRatePct}% Rework</span>
                    <span class="text-xs font-semibold text-indigo-700 block mt-1">${kpis.qc.hasData ? `QC: ${kpis.qc.averageScore}%` : 'No QC issues'}</span>
                </div>
            </div>

            <!-- Overdue Tasks Risk Panel -->
            ${kpis.tasks.overdueCount > 0 ? `
                <div class="bg-rose-50/60 border border-rose-200 rounded-3xl p-6 shadow-sm space-y-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <iconify-icon icon="solar:danger-triangle-bold" class="text-rose-600" width="20"></iconify-icon>
                            <h4 class="text-sm font-black text-rose-900">Overdue Deliverables Alert (${kpis.tasks.overdueCount} Tasks)</h4>
                        </div>
                        <span class="text-[10px] font-black bg-rose-200/60 text-rose-800 px-3 py-1 rounded-full uppercase tracking-wider">Action Needed</span>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        ${kpis.tasks.overdueList.slice(0, 6).map(t => `
                            <div class="bg-white border border-rose-100 rounded-2xl p-3 shadow-2xs">
                                <span class="text-[9px] font-bold text-rose-600 uppercase tracking-wider">Due: ${esc(t.dueDate || t.duedate || 'Overdue')}</span>
                                <p class="text-xs font-bold text-slate-800 truncate mt-0.5">${esc(t.desc || t.title || t.summary || 'Task')}</p>
                                <span class="text-[10px] text-slate-400 font-semibold block mt-1">Client: ${esc(t.client || 'General')}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Employee Weekly Performance Ranking Table -->
            <div class="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                <div class="flex items-center justify-between border-b border-slate-50 pb-4">
                    <div>
                        <h4 class="text-sm font-black text-slate-900">Employee Output & Workload Distribution</h4>
                        <p class="text-[11px] text-slate-400 font-semibold">Comparative productivity, deliverables completed, and active queues</p>
                    </div>
                    <span class="text-xs font-bold text-slate-400">${rankingList.length} Team Members</span>
                </div>

                <div class="overflow-x-auto border border-slate-100 rounded-2xl">
                    <table class="w-full text-left">
                        <thead class="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            <tr>
                                <th class="px-4 py-3">Team Member</th>
                                <th class="px-4 py-3 text-center">Worked Hours</th>
                                <th class="px-4 py-3 text-center">Completed</th>
                                <th class="px-4 py-3 text-center">Pending Queue</th>
                                <th class="px-4 py-3 text-center">Overdue</th>
                                <th class="px-4 py-3 text-center">Utilization</th>
                                <th class="px-4 py-3 text-center">QC Score</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50 text-xs">
                            ${rankingList.map(r => `
                                <tr class="hover:bg-slate-50/80 transition-colors">
                                    <td class="px-4 py-3">
                                        <div class="font-bold text-slate-800">${esc(r.emp.name)}</div>
                                        <div class="text-[10px] text-slate-400">${esc(r.emp.role || r.emp.email)}</div>
                                    </td>
                                    <td class="px-4 py-3 text-center font-black text-slate-800">${Engine.formatDuration(r.workedSec)}</td>
                                    <td class="px-4 py-3 text-center">
                                        <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">${r.completedTasks}</span>
                                    </td>
                                    <td class="px-4 py-3 text-center">
                                        <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700">${r.pendingTasks}</span>
                                    </td>
                                    <td class="px-4 py-3 text-center">
                                        ${r.overdueTasks > 0 ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">${r.overdueTasks}</span>` : '<span class="text-slate-300 font-bold">—</span>'}
                                    </td>
                                    <td class="px-4 py-3 text-center font-bold text-slate-700">${r.utilization}%</td>
                                    <td class="px-4 py-3 text-center font-black ${r.qcScore !== null ? 'text-indigo-600' : 'text-slate-400'}">${r.qcScore !== null ? `${r.qcScore}%` : 'N/A'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    };

    // ─────────────────────────────────────────────────────────────
    // D. DETAILED AUDIT LOG MODULE
    // ─────────────────────────────────────────────────────────────

    window.renderDetailedReport = function () {
        const table = document.getElementById('detailed-report-list');
        const tbody = document.getElementById('detailed-report-body') || table?.querySelector('tbody');
        if (!table || !tbody) return;

        if (!window.reportDateFrom || !window.reportDateTo) {
            tbody.innerHTML = `<tr><td colspan="9" class="px-4 py-10 text-center text-slate-400 text-sm">Please select a date range to view the audit log.</td></tr>`;
            return;
        }

        const range = Engine.getDateRange('custom', window.reportDateFrom, window.reportDateTo);
        const timeLogs = Engine.getConsolidatedTimeLogs(range.fromTs, range.toTs, window.reportSelectedUser);
        const attendance = Engine.getAuditedAttendance(range.fromTs, range.toTs, window.reportSelectedUser);

        // Build unified chronological event records
        const auditTrail = [];

        // 1. Attendance Events
        attendance.events.forEach(e => {
            const typeLabel = (e.type || '').replace('_', ' ').toUpperCase();
            const dateStr = e.date || Engine.formatLocalDate(new Date(e.timestamp));
            const dur = e.duration ? Engine.formatDuration(Math.floor(e.duration / 1000)) : '—';
            auditTrail.push({
                timestamp: e.timestamp,
                dateStr,
                userName: e.userName || e.userId || 'Team Member',
                eventType: 'ATTENDANCE',
                eventBadge: typeLabel,
                taskName: '—',
                client: 'Internal Operations',
                startTimeStr: new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                endTimeStr: '—',
                duration: dur,
                durationSeconds: e.duration ? Math.floor(e.duration / 1000) : 0,
                anomaly: null
            });
        });

        // 2. Task Work Sessions
        timeLogs.forEach(l => {
            const dateStr = Engine.formatLocalDate(new Date(l.startTime));
            auditTrail.push({
                timestamp: l.startTime,
                dateStr,
                userName: l.userName || l.userId || 'Team Member',
                eventType: 'TASK WORK',
                eventBadge: l.isLive ? 'LIVE ACTIVE' : 'WORK LOG',
                taskName: l.taskName,
                client: l.client,
                startTimeStr: new Date(l.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                endTimeStr: new Date(l.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                duration: Engine.formatDurationHMS(l.durationSeconds),
                durationSeconds: l.durationSeconds,
                anomaly: l.anomaly
            });
        });

        // Sort descending (most recent first)
        auditTrail.sort((a, b) => b.timestamp - a.timestamp);

        // Ensure Table Header has full metadata columns
        const thead = table.querySelector('thead');
        if (thead) {
            thead.innerHTML = `
                <tr class="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <th class="px-4 py-3">Date</th>
                    <th class="px-4 py-3">Employee</th>
                    <th class="px-4 py-3">Event Type</th>
                    <th class="px-4 py-3">Task Details</th>
                    <th class="px-4 py-3">Client</th>
                    <th class="px-4 py-3 text-center">Start Time</th>
                    <th class="px-4 py-3 text-center">End Time</th>
                    <th class="px-4 py-3 text-right">Duration</th>
                    <th class="px-4 py-3 text-center">Audit Status</th>
                </tr>
            `;
        }

        if (auditTrail.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="px-4 py-12 text-center text-slate-400 text-sm">No activity recorded for the selected filter parameters.</td></tr>`;
            return;
        }

        window._cachedAuditTrail = auditTrail;

        tbody.innerHTML = auditTrail.map(evt => {
            const isTask = evt.eventType === 'TASK WORK';
            const badgeClass = isTask ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-100 text-slate-700 border-slate-200';
            const anomalyBadge = evt.anomaly
                ? `<span class="inline-flex items-center text-[9px] font-black px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">${esc(evt.anomaly)}</span>`
                : `<span class="inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">Verified</span>`;

            return `
                <tr class="hover:bg-slate-50/70 transition-colors text-xs">
                    <td class="px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">${evt.dateStr}</td>
                    <td class="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">${esc(evt.userName)}</td>
                    <td class="px-4 py-3 whitespace-nowrap">
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${badgeClass}">${evt.eventBadge}</span>
                    </td>
                    <td class="px-4 py-3 font-semibold text-slate-900 max-w-xs truncate" title="${esc(evt.taskName)}">${esc(evt.taskName)}</td>
                    <td class="px-4 py-3 font-bold text-slate-600 whitespace-nowrap">${esc(evt.client)}</td>
                    <td class="px-4 py-3 text-center text-slate-500 font-semibold whitespace-nowrap">${evt.startTimeStr}</td>
                    <td class="px-4 py-3 text-center text-slate-500 font-semibold whitespace-nowrap">${evt.endTimeStr}</td>
                    <td class="px-4 py-3 text-right font-black text-slate-900 whitespace-nowrap">${evt.duration}</td>
                    <td class="px-4 py-3 text-center whitespace-nowrap">${anomalyBadge}</td>
                </tr>
            `;
        }).join('');
    };

    // ─────────────────────────────────────────────────────────────
    // E. EMPLOYEE PERFORMANCE MODULE
    // ─────────────────────────────────────────────────────────────

    window.renderPerformanceReport = function () {
        const list = document.getElementById('performance-report-list');
        if (!list) return;

        list.innerHTML = `<div class="text-center py-8 text-slate-400 text-xs"><iconify-icon icon="solar:loading-bold" width="24" class="animate-spin inline-block"></iconify-icon><p class="mt-2 font-bold">Computing employee intelligence diagnostics...</p></div>`;

        const range = Engine.getDateRange('custom', window.reportDateFrom, window.reportDateTo);
        const prevRange = Engine.getPreviousEquivalentRange(range.fromTs, range.toTs);
        const employees = Engine.getAllEmployees();

        if (employees.length === 0) {
            list.innerHTML = `<p class="text-center text-slate-400 py-10 text-xs">No active employee profiles found in directory.</p>`;
            return;
        }

        const cardsHtml = employees.map(emp => {
            const kpis = Engine.computeComprehensiveKPIs(range.fromTs, range.toTs, emp.email);
            const prevKpis = Engine.computeComprehensiveKPIs(prevRange.fromTs, prevRange.toTs, emp.email);

            const deltaComp = kpis.tasks.completedCount - prevKpis.tasks.completedCount;
            const deltaWorkSec = kpis.timing.workedSeconds - prevKpis.timing.workedSeconds;

            // Workload Capacity Status
            let capacityBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
            let capacityLabel = 'Optimal Load';
            if (kpis.tasks.pendingCount > 12 || kpis.tasks.overdueCount > 3) {
                capacityBadge = 'bg-rose-50 text-rose-700 border-rose-200';
                capacityLabel = 'High / Overloaded';
            } else if (kpis.tasks.pendingCount > 6) {
                capacityBadge = 'bg-amber-50 text-amber-700 border-amber-200';
                capacityLabel = 'Moderate Queue';
            }

            return `
                <div class="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all space-y-4">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-50 pb-4">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-base flex items-center justify-center shrink-0 shadow-sm">
                                ${esc(emp.name.substring(0, 2).toUpperCase())}
                            </div>
                            <div>
                                <h4 class="text-sm font-black text-slate-900">${esc(emp.name)}</h4>
                                <p class="text-xs text-slate-400 font-semibold">${esc(emp.role || emp.email)}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black border ${capacityBadge}">
                                ${capacityLabel}
                            </span>
                            <span class="text-[10px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                                ${kpis.timing.utilizationPct}% Utilization
                            </span>
                        </div>
                    </div>

                    <!-- Metrics Grid -->
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div class="p-3 rounded-2xl bg-slate-50/70 border border-slate-100">
                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Logged Hours</span>
                            <span class="text-base font-black text-slate-900">${Engine.formatDuration(kpis.timing.workedSeconds)}</span>
                            <span class="text-[10px] text-slate-400 font-semibold block mt-0.5">${deltaWorkSec >= 0 ? '+' : ''}${Engine.formatDuration(deltaWorkSec)} vs prev</span>
                        </div>
                        <div class="p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                            <span class="text-[10px] font-black text-emerald-600 uppercase tracking-wider block mb-1">Tasks Completed</span>
                            <span class="text-base font-black text-emerald-700">${kpis.tasks.completedCount}</span>
                            <span class="text-[10px] text-emerald-600 font-semibold block mt-0.5">${kpis.tasks.completionRatePct}% completion</span>
                        </div>
                        <div class="p-3 rounded-2xl bg-amber-50/50 border border-amber-100">
                            <span class="text-[10px] font-black text-amber-600 uppercase tracking-wider block mb-1">Pending / Overdue</span>
                            <span class="text-base font-black text-amber-700">${kpis.tasks.pendingCount} <span class="text-xs font-semibold text-rose-600">(${kpis.tasks.overdueCount} od)</span></span>
                            <span class="text-[10px] text-amber-600 font-semibold block mt-0.5">Active backlog</span>
                        </div>
                        <div class="p-3 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                            <span class="text-[10px] font-black text-indigo-600 uppercase tracking-wider block mb-1">QC Quality Score</span>
                            <span class="text-base font-black text-indigo-700">${kpis.qc.hasData ? `${kpis.qc.averageScore}%` : 'N/A'}</span>
                            <span class="text-[10px] text-indigo-600 font-semibold block mt-0.5">${kpis.qc.hasData ? `${kpis.qc.sampleCount} reviews` : 'No QC submissions'}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        list.innerHTML = cardsHtml;
    };

    // ─────────────────────────────────────────────────────────────
    // F. INDIVIDUAL PERFORMANCE ANALYTICS MODULE
    // ─────────────────────────────────────────────────────────────

    window.renderIndivPerfReport = function () {
        const container = document.getElementById('indiv-perf-report-content');
        const userSelect = document.getElementById('indiv-perf-user-select');
        if (!container || !userSelect) return;

        const email = userSelect.value;
        if (!email) {
            container.innerHTML = `<p class="text-center text-slate-400 text-xs py-8">Please select a team member from the dropdown above.</p>`;
            return;
        }

        const range = Engine.getDateRange('custom', window.reportDateFrom, window.reportDateTo);
        const kpis = Engine.computeComprehensiveKPIs(range.fromTs, range.toTs, email);
        const prevRange = Engine.getPreviousEquivalentRange(range.fromTs, range.toTs);
        const prevKpis = Engine.computeComprehensiveKPIs(prevRange.fromTs, prevRange.toTs, email);
        const insights = Engine.generateManagementInsights(kpis, prevKpis, 'individual');

        container.innerHTML = `
            <!-- Top KPI Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div class="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Time Logged</span>
                    <span class="text-2xl font-black text-slate-900">${Engine.formatDuration(kpis.timing.workedSeconds)}</span>
                    <span class="text-[11px] font-bold text-slate-400 block mt-1">${Engine.formatDurationHMS(kpis.timing.workedSeconds)}</span>
                </div>
                <div class="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                    <span class="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Completed Deliverables</span>
                    <span class="text-2xl font-black text-emerald-700">${kpis.tasks.completedCount}</span>
                    <span class="text-[11px] font-bold text-emerald-600 block mt-1">${kpis.tasks.completionRatePct}% completion rate</span>
                </div>
                <div class="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                    <span class="text-[10px] font-black text-amber-600 uppercase tracking-widest block mb-1">Pending Backlog</span>
                    <span class="text-2xl font-black text-amber-700">${kpis.tasks.pendingCount}</span>
                    <span class="text-[11px] font-bold text-rose-600 block mt-1">${kpis.tasks.overdueCount} overdue</span>
                </div>
                <div class="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                    <span class="text-[10px] font-black text-indigo-600 uppercase tracking-widest block mb-1">QC Score & Sample</span>
                    <span class="text-2xl font-black text-indigo-700">${kpis.qc.hasData ? `${kpis.qc.averageScore}%` : 'N/A'}</span>
                    <span class="text-[11px] font-bold text-indigo-600 block mt-1">${esc(kpis.qc.displayText)}</span>
                </div>
            </div>

            <!-- AI Performance Diagnostics -->
            <div class="mb-6 bg-slate-900 text-white rounded-3xl p-6 shadow-md space-y-4">
                <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div class="flex items-center gap-2">
                        <iconify-icon icon="solar:shield-check-bold" class="text-emerald-400" width="18"></iconify-icon>
                        <h4 class="text-sm font-black uppercase tracking-wider text-slate-200">Verified Management Diagnostics</h4>
                    </div>
                    <span class="text-[10px] font-bold text-slate-400">${range.periodLabel}</span>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div class="space-y-1.5">
                        <p class="text-[10px] font-black uppercase tracking-wider text-emerald-300">Observed Strengths</p>
                        ${insights.wins.map(w => `<p class="flex items-start gap-1.5"><iconify-icon icon="solar:check-circle-bold" class="text-emerald-400 shrink-0 mt-0.5" width="13"></iconify-icon><span>${esc(w)}</span></p>`).join('') || '<p class="text-slate-400">Steady baseline performance.</p>'}
                    </div>
                    <div class="space-y-1.5">
                        <p class="text-[10px] font-black uppercase tracking-wider text-amber-300">Support & Guidance Areas</p>
                        ${insights.recommendations.map(r => `<p class="flex items-start gap-1.5"><iconify-icon icon="solar:arrow-right-bold" class="text-amber-400 shrink-0 mt-0.5" width="13"></iconify-icon><span>${esc(r)}</span></p>`).join('') || '<p class="text-slate-400">No urgent interventions required.</p>'}
                    </div>
                </div>
            </div>

            <!-- Delivery & Timing Lifecycle Report -->
            <div class="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-50 pb-4">
                    <div>
                        <h4 class="text-sm font-black text-slate-900">Task Delivery & Turnaround Lifecycle</h4>
                        <p class="text-[11px] text-slate-400 font-semibold">11-stage delivery turnaround tracking with legitimate audit timestamps</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="px-3 py-1 text-[10px] font-black rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                            ${kpis.delivery.trackedCount} Tasks Audited
                        </span>
                        <span class="px-3 py-1 text-[10px] font-black rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                            ${kpis.delivery.onTimeDeliveryRate}% On-Time Delivery
                        </span>
                    </div>
                </div>

                ${kpis.delivery.items.length > 0 ? `
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1">
                        ${kpis.delivery.items.map(item => {
            const dcStr = item.timestamps.designCompleted ? new Date(item.timestamps.designCompleted).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not available';
            const csStr = item.timestamps.clientSent ? new Date(item.timestamps.clientSent).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not available';
            const tatStr = item.tat.clientDeliverySec ? Engine.formatDuration(item.tat.clientDeliverySec) : 'Not available (pending send)';

            return `
                                <div class="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 space-y-3">
                                    <div class="flex items-center justify-between">
                                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${esc(item.client)}</span>
                                        <span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white text-slate-700 border border-slate-200">${esc(item.currentStage)}</span>
                                    </div>
                                    <p class="text-xs font-bold text-slate-900 leading-snug">${esc(item.taskName)}</p>
                                    <div class="grid grid-cols-2 gap-2 text-[10px] bg-white rounded-xl p-2.5 border border-slate-100">
                                        <div>
                                            <p class="text-[9px] font-black text-slate-400 uppercase">Design Completed</p>
                                            <p class="font-bold text-slate-700">${dcStr}</p>
                                        </div>
                                        <div>
                                            <p class="text-[9px] font-black text-slate-400 uppercase">Client Sent</p>
                                            <p class="font-bold text-slate-700">${csStr}</p>
                                        </div>
                                    </div>
                                    <div class="flex items-center justify-between text-[10px] pt-1">
                                        <span class="text-slate-400">Turnaround Duration:</span>
                                        <span class="font-black text-indigo-700">${tatStr}</span>
                                    </div>
                                </div>
                            `;
        }).join('')}
                    </div>
                ` : `
                    <div class="p-8 text-center bg-slate-50 rounded-2xl text-slate-400 text-xs">
                        <iconify-icon icon="solar:box-minimalistic-bold" width="32" class="mb-2 text-slate-300"></iconify-icon>
                        <p class="font-bold">No deliverables completed or moved to client sent in this period.</p>
                    </div>
                `}
            </div>
        `;
    };

    // ─────────────────────────────────────────────────────────────
    // G. TASK DELIVERY & TIMING REPORT MODULE
    // ─────────────────────────────────────────────────────────────

    window.renderClientDeliveryDashboard = function () {
        const tableBody = document.getElementById('cd-table-body');
        if (!tableBody) return;

        if (!window.reportDateFrom || !window.reportDateTo) {
            tableBody.innerHTML = '<tr><td colspan="8" class="px-4 py-8 text-center text-slate-400 text-xs">Please select a valid date range to view delivery turnaround.</td></tr>';
            return;
        }

        const range = Engine.getDateRange('custom', window.reportDateFrom, window.reportDateTo);
        const delivery = Engine.getDeliveryLifecycleMetrics(range.fromTs, range.toTs, window.reportSelectedUser);

        if (delivery.items.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" class="px-4 py-12 text-center text-slate-400 text-xs font-semibold">No deliverables transitioned through the delivery lifecycle in this period.</td></tr>';
            return;
        }

        tableBody.innerHTML = delivery.items.map(item => {
            const dcStr = item.timestamps.designCompleted
                ? new Date(item.timestamps.designCompleted).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : '<span class="text-slate-400 font-semibold">Not available</span>';

            const csStr = item.timestamps.clientSent
                ? new Date(item.timestamps.clientSent).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : '<span class="text-slate-400 font-semibold">Not available</span>';

            const tatStr = item.tat.clientDeliverySec
                ? Engine.formatDuration(item.tat.clientDeliverySec)
                : '<span class="text-slate-400 font-semibold">Pending send</span>';

            const onTimeBadge = item.isOnTime === true
                ? '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">On Time</span>'
                : (item.isOnTime === false ? '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-50 text-rose-700 border border-rose-200">Delayed</span>' : '<span class="text-slate-300 font-bold">—</span>');

            return `
                <tr class="hover:bg-slate-50/70 transition-colors text-xs border-b border-slate-50">
                    <td class="px-4 py-3 font-black text-slate-700">${esc(item.taskId)}</td>
                    <td class="px-4 py-3 font-bold text-slate-800">${esc(item.client)}</td>
                    <td class="px-4 py-3 font-semibold text-slate-900 max-w-xs truncate" title="${esc(item.taskName)}">${esc(item.taskName)}</td>
                    <td class="px-4 py-3">
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-slate-100 text-slate-700">${esc(item.currentStage)}</span>
                    </td>
                    <td class="px-4 py-3 text-slate-600 font-semibold whitespace-nowrap">${dcStr}</td>
                    <td class="px-4 py-3 text-slate-600 font-semibold whitespace-nowrap">${csStr}</td>
                    <td class="px-4 py-3 font-black text-indigo-700 whitespace-nowrap">${tatStr}</td>
                    <td class="px-4 py-3 text-center whitespace-nowrap">${onTimeBadge}</td>
                </tr>
            `;
        }).join('');
    };

    // ─────────────────────────────────────────────────────────────
    // CSV EXPORT ROUTERS (Data-Consistent)
    // ─────────────────────────────────────────────────────────────

    window.exportDetailedReportCsv = function () {
        const list = window._cachedAuditTrail || [];
        if (list.length === 0) return alert('No audit records available to export.');

        let csv = 'Date,Employee,Event Type,Task Name,Client,Start Time,End Time,Duration,Anomaly\n';
        list.forEach(item => {
            const row = [
                item.dateStr,
                `"${(item.userName || '').replace(/"/g, '""')}"`,
                item.eventType,
                `"${(item.taskName || '').replace(/"/g, '""')}"`,
                `"${(item.client || '').replace(/"/g, '""')}"`,
                item.startTimeStr,
                item.endTimeStr,
                item.duration,
                `"${(item.anomaly || 'Verified').replace(/"/g, '""')}"`
            ];
            csv += row.join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `detailed-audit-log_${window.reportDateFrom || 'period'}_to_${window.reportDateTo || 'period'}.csv`;
        link.click();
    };

    window.exportReportsCsv = function () {
        if (window.currentReportTab === 'detailed') {
            window.exportDetailedReportCsv();
            return;
        }

        const range = Engine.getDateRange('custom', window.reportDateFrom, window.reportDateTo);
        const kpis = Engine.computeComprehensiveKPIs(range.fromTs, range.toTs, window.reportSelectedUser);

        let csv = `OneDesk Team Operations Report - ${range.periodLabel}\n\n`;
        csv += `Employee Scope,${window.reportSelectedUser}\n`;
        csv += `Total Worked Hours,${Engine.formatDurationHMS(kpis.timing.workedSeconds)}\n`;
        csv += `Total Break Duration,${Engine.formatDurationHMS(kpis.timing.breakSeconds)}\n`;
        csv += `Active Utilization Rate,${kpis.timing.utilizationPct}%\n`;
        csv += `Completed Deliverables,${kpis.tasks.completedCount}\n`;
        csv += `Pending Workload,${kpis.tasks.pendingCount}\n`;
        csv += `Overdue Tasks,${kpis.tasks.overdueCount}\n`;
        csv += `Rework Rate,${kpis.tasks.reworkRatePct}%\n`;
        csv += `QC Score,${kpis.qc.hasData ? `${kpis.qc.averageScore}% (${kpis.qc.sampleCount} reviews)` : 'Not available'}\n\n`;

        csv += 'Client Breakdown\nClient,Logged Hours\n';
        Object.entries(kpis.clientDistribution).forEach(([c, sec]) => {
            csv += `"${c.replace(/"/g, '""')}",${Engine.formatDuration(sec)}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `team-operations-report_${window.reportDateFrom}_to_${window.reportDateTo}.csv`;
        link.click();
    };

    window.filterDetailedReportTable = function (searchVal) {
        const q = (searchVal || '').trim().toLowerCase();
        const rows = document.querySelectorAll('#detailed-report-body tr');
        rows.forEach(r => {
            const text = r.textContent.toLowerCase();
            r.classList.toggle('hidden', q && !text.includes(q));
        });
    };

    console.log('✓ OneDesk Reporting Modules 2.0 initialized successfully');

})(typeof window !== 'undefined' ? window : this);
