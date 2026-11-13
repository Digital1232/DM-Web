/**
 * OneDesk – Complete Dashboard UI/UX Redesign & Feature Enhancement
 * Modular controller for Current Session metadata, Shift Progress (>100% / Overtime),
 * Current Task Focus, My Task Queue, Recently Synced, Live Team Overview,
 * Team Workload Analytics, Attention Required, and Productivity Insights.
 *
 * Strictly reuses existing OneDesk state, Firebase data, permissions, and task/attendance APIs.
 */
(function (window) {
    'use strict';

    const document = window.document;

    const state = {
        selectedFocusTaskId: null,
        queue: { status: 'all', sort: 'priority', search: '' },
        recent: { status: 'all', search: '' },
        team: { state: 'all', sort: 'status', search: '' },
        workload: { period: 'all', metric: 'count', scale: 'linear', sort: 'assigned' },
        insightsRangeDays: 7
    };

    function ctx() {
        return window.OneDeskBridge ? window.OneDeskBridge() : {};
    }

    function esc(v) {
        if (v === null || v === undefined) return '';
        return String(v).replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    function fmtTime(sec) {
        const s = Math.max(0, Math.floor(sec || 0));
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const r = s % 60;
        return [h, m, r].map(v => String(v).padStart(2, '0')).join(':');
    }

    function fmtShortDuration(sec) {
        const s = Math.max(0, Math.floor(sec || 0));
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    }

    function fmtRelative(ts) {
        if (!ts) return '—';
        const diffSec = Math.max(0, Math.floor((Date.now() - Number(ts)) / 1000));
        if (diffSec < 60) return 'Just now';
        const mins = Math.floor(diffSec / 60);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    }

    function parseDueMs(due) {
        if (!due) return null;
        const d = new Date(due);
        return isNaN(d.getTime()) ? null : d.getTime();
    }

    function isOverdueTask(t, c) {
        if (!t || !t.dueDate) return false;
        if (c.isDone?.(t.status) || c.isInternalDone?.(t.status) || c.isTaskCompletedStatus?.(t.status)) return false;
        const todayStr = typeof c.todayIso === 'function' ? c.todayIso() : new Date().toISOString().slice(0, 10);
        return String(t.dueDate).slice(0, 10) < todayStr;
    }

    function priorityRank(p) {
        const s = String(p || '').toLowerCase();
        if (s.includes('highest') || s.includes('critical') || s.includes('urgent')) return 0;
        if (s.includes('high')) return 1;
        if (s.includes('medium') || s.includes('normal')) return 2;
        if (s.includes('low')) return 3;
        return 4;
    }

    function priorityBadge(p) {
        const s = String(p || 'Medium');
        const low = s.toLowerCase();
        if (low.includes('highest') || low.includes('critical') || low.includes('urgent') || low.includes('high')) {
            return `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-[#F04465] border border-rose-200/60 dark:border-rose-900/40">${esc(s)}</span>`;
        }
        if (low.includes('low')) {
            return `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[#718096] dark:text-slate-400">${esc(s)}</span>`;
        }
        return `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-[#F59E0B] border border-amber-200/60 dark:border-amber-900/40">${esc(s)}</span>`;
    }

    function statusCategory(status, c) {
        const s = String(status || '').toLowerCase();
        if (c.isDone?.(status) || c.isInternalDone?.(status) || c.isTaskCompletedStatus?.(status)) return 'completed';
        if (s.includes('qc') && (s.includes('correction') || s.includes('rework'))) return 'qccorrection';
        if (s.includes('qc')) return 'qcpending';
        if (s.includes('hold')) return 'hold';
        if (c.isInProgress?.(status)) return 'inprogress';
        if (c.isTodo?.(status)) return 'todo';
        return 'other';
    }

    function getTaskLoggedSeconds(taskId, c) {
        if (!taskId) return 0;
        const logs = c.allTimeLogs || window.allTimeLogs || [];
        const target = String(taskId).toUpperCase();
        let total = 0;
        for (let i = 0; i < logs.length; i++) {
            const l = logs[i];
            if (String(l.taskId || '').toUpperCase() === target) {
                total += Number(l.durationSeconds || 0);
            }
        }
        if (c.activeTaskId && String(c.activeTaskId).toUpperCase() === target) {
            total += Number(c.taskSeconds || 0);
        }
        return total;
    }

    function getEstimatedSeconds(t) {
        if (!t) return 0;
        if (t.estimatedSeconds) return Number(t.estimatedSeconds) || 0;
        if (t.estimateHours) return Number(t.estimateHours) * 3600;
        if (t.estimatedHours) return Number(t.estimatedHours) * 3600;
        if (t.timeEstimate) return Number(t.timeEstimate) || 0;
        return 0;
    }

    // ─────────────────────────────────────────────────────────────
    // 1. CURRENT SESSION & DAILY SHIFT PROGRESS
    // ─────────────────────────────────────────────────────────────
    function syncSessionMetadata() {
        const c = ctx();
        const pill = document.getElementById('session-state-pill');
        const dot = document.getElementById('session-state-dot');
        const label = document.getElementById('session-state-label');
        const startEl = document.getElementById('session-start-time');
        const breakEl = document.getElementById('session-break-duration');
        const targetEl = document.getElementById('session-shift-target');

        const isCheckedIn = !!c.isCheckedIn;
        const onBreak = !!c.breakStartTime;
        const taskPaused = isCheckedIn && !onBreak && c.activeTaskId && c.taskOnHold;

        if (pill && dot && label) {
            if (!isCheckedIn) {
                pill.className = 'inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700';
                dot.className = 'w-1.5 h-1.5 rounded-full bg-slate-400';
                label.textContent = 'Checked Out';
            } else if (onBreak) {
                pill.className = 'inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 text-[#F59E0B] border border-amber-200/70 dark:border-amber-800/50';
                dot.className = 'w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse';
                label.textContent = 'On Break';
            } else if (taskPaused) {
                pill.className = 'inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-sky-50 dark:bg-sky-950/50 text-[#2695EB] border border-sky-200/70 dark:border-sky-800/50';
                dot.className = 'w-1.5 h-1.5 rounded-full bg-[#2695EB]';
                label.textContent = 'Paused';
            } else {
                pill.className = 'inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-[#10B981] border border-emerald-200/70 dark:border-emerald-800/50';
                dot.className = 'w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse';
                label.textContent = 'Working';
            }
        }

        if (startEl) {
            startEl.textContent = c.checkInTime
                ? new Date(c.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                : '—';
        }
        if (breakEl) {
            const activeBreakMs = c.breakStartTime ? Math.max(0, Date.now() - c.breakStartTime) : 0;
            const totalBreakSec = Math.floor(((c.totalBreakDuration || 0) + activeBreakMs) / 1000);
            breakEl.textContent = fmtShortDuration(totalBreakSec);
        }
        if (targetEl) {
            const goalH = ((c.getDailyGoalSeconds ? c.getDailyGoalSeconds() : 28800) / 3600).toFixed(1);
            targetEl.textContent = `${goalH}h`;
        }
    }

    function updateShiftProgress(workedSec, goalSec) {
        const safeGoal = Math.max(goalSec || 28800, 1);
        const rawPct = Math.round((workedSec / safeGoal) * 100);
        const hours = (workedSec / 3600).toFixed(1);
        const goalHours = (safeGoal / 3600).toFixed(1);

        const hText = document.getElementById('hours-text');
        const hPct = document.getElementById('hours-percent');
        const pBar = document.getElementById('progress-bar');
        const pOver = document.getElementById('progress-bar-overtime');
        const otBadge = document.getElementById('shift-overtime-badge');
        const remEl = document.getElementById('shift-remaining-text');
        const capEl = document.getElementById('shift-goal-caption');

        if (hText) hText.textContent = `${hours} / ${goalHours} hrs`;
        if (hPct) {
            hPct.textContent = `${rawPct}%`;
            hPct.className = rawPct >= 100
                ? 'text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-[#10B981] tabular-nums'
                : 'text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-[#5845F5]/10 text-[#5845F5] dark:text-indigo-300 tabular-nums';
        }

        if (workedSec <= safeGoal) {
            const fillPct = Math.min((workedSec / safeGoal) * 100, 100);
            if (pBar) pBar.style.width = `${fillPct}%`;
            if (pOver) pOver.style.width = '0%';
            if (otBadge) otBadge.classList.add('hidden');
            const remH = ((safeGoal - workedSec) / 3600).toFixed(1);
            if (remEl) remEl.textContent = `${remH}h remaining`;
            if (capEl) capEl.textContent = `${rawPct}% of daily goal achieved (breaks excluded).`;
        } else {
            // Represent > 100% accurately: scale base + overtime proportionally inside the bar
            const overtimeSec = workedSec - safeGoal;
            const totalScale = workedSec;
            const baseShare = (safeGoal / totalScale) * 100;
            const overShare = (overtimeSec / totalScale) * 100;
            if (pBar) pBar.style.width = `${baseShare.toFixed(1)}%`;
            if (pOver) pOver.style.width = `${overShare.toFixed(1)}%`;
            const otHours = (overtimeSec / 3600).toFixed(1);
            if (otBadge) {
                otBadge.textContent = `+${otHours}h Overtime`;
                otBadge.classList.remove('hidden');
            }
            if (remEl) remEl.textContent = 'Target achieved';
            if (capEl) capEl.textContent = `${rawPct}% of daily goal achieved (+${otHours}h overtime logged).`;
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 2. CURRENT TASK FOCUS (PRIMARY WORKSPACE)
    // ─────────────────────────────────────────────────────────────
    function findTaskById(id, c) {
        if (!id) return null;
        const targetStr = String(id).toUpperCase();
        const lists = [c.tasks || [], window.internalTasks || [], window.manualTasks || []];
        for (const list of lists) {
            const found = list.find(t => String(t.id).toUpperCase() === targetStr);
            if (found) return found;
        }
        if (c.activeTaskSnapshot && String(c.activeTaskSnapshot.id).toUpperCase() === targetStr) {
            return c.activeTaskSnapshot;
        }
        return null;
    }

    function renderTaskFocus() {
        const el = document.getElementById('active-task-card');
        if (!el) return;
        const c = ctx();
        let targetId = c.activeTaskId || state.selectedFocusTaskId;

        let t = targetId ? findTaskById(targetId, c) : null;
        if (!t && state.selectedFocusTaskId && !c.activeTaskId) {
            state.selectedFocusTaskId = null;
            targetId = null;
        }

        if (!targetId || !t) {
            if (targetId && !t && c.activeTaskId) {
                // Active task is known by ID, but full task data is still loading or synchronizing
                el.innerHTML = `
                    <div class="bg-[#F5F7FA] dark:bg-slate-800/50 rounded-xl p-5 border border-[#E8EDF4] dark:border-slate-700/60 space-y-3">
                        <div class="flex items-center justify-between gap-3">
                            <div class="flex items-center gap-2">
                                <span class="text-xs font-mono font-extrabold text-[#5845F5] dark:text-indigo-400">${esc(targetId)}</span>
                                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-[#5845F5]">Active Task</span>
                            </div>
                            <button type="button" onclick="toggleActiveTask('${esc(targetId)}')" class="text-slate-400 hover:text-[#F04465] p-1 rounded-lg transition-colors cursor-pointer shrink-0">
                                <iconify-icon icon="solar:close-circle-bold" width="18"></iconify-icon>
                            </button>
                        </div>
                        <p class="text-xs text-[#718096] dark:text-slate-400">Loading task details...</p>
                        <div class="flex items-center justify-between pt-2 border-t border-[#E8EDF4] dark:border-slate-700/60">
                            <span id="task-timer-display" class="text-2xl font-black text-[#171D32] dark:text-white font-mono tabular-nums">${fmtTime(c.taskSeconds)}</span>
                            <button type="button" onclick="endTask()" class="inline-flex items-center gap-1.5 bg-[#10B981] hover:bg-emerald-600 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer">
                                <iconify-icon icon="solar:check-circle-bold" width="15"></iconify-icon> End Task
                            </button>
                        </div>
                    </div>`;
                return;
            }

            el.innerHTML = `
                <div class="bg-[#F5F7FA] dark:bg-slate-800/50 rounded-xl p-6 border border-dashed border-[#E8EDF4] dark:border-slate-700 text-center flex flex-col items-center justify-center min-h-[210px]">
                    <div class="w-11 h-11 rounded-2xl bg-[#5845F5]/10 text-[#5845F5] dark:text-indigo-400 flex items-center justify-center mb-3">
                        <iconify-icon icon="solar:target-linear" width="22"></iconify-icon>
                    </div>
                    <h4 class="text-sm font-extrabold text-[#171D32] dark:text-white">No task selected</h4>
                    <p class="text-xs text-[#718096] dark:text-slate-400 mt-1 max-w-xs">Choose your next task from your queue and start working.</p>
                    <div class="flex items-center justify-center gap-2 flex-wrap mt-4">
                        <button type="button" onclick="document.getElementById('my-task-queue-section')?.scrollIntoView({behavior:'smooth'})"
                            class="px-3.5 py-2 rounded-xl bg-[#5845F5] hover:bg-[#4934DC] text-white text-xs font-bold transition-all cursor-pointer">
                            Browse Task Queue
                        </button>
                        <button type="button" onclick="switchView('tasks')"
                            class="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-[#171D32] dark:text-slate-200 border border-[#E8EDF4] dark:border-slate-700 text-xs font-semibold transition-all cursor-pointer">
                            View My Tasks
                        </button>
                        <button type="button" onclick="if(typeof openAddTaskModal==='function')openAddTaskModal('manual')"
                            class="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-[#5845F5] dark:text-indigo-400 border border-[#E8EDF4] dark:border-slate-700 text-xs font-semibold transition-all cursor-pointer">
                            + Quick Task
                        </button>
                    </div>
                </div>`;
            return;
        }

        const isActive = c.activeTaskId && String(c.activeTaskId) === String(t.id);
        const isPaused = isActive && !!c.taskOnHold;
        const domain = c.JIRA?.domain || 'vilpower.atlassian.net';
        const taskKeyHtml = t.manual
            ? esc(t.id)
            : `<a href="https://${esc(domain)}/browse/${encodeURIComponent(t.id)}" target="_blank" class="hover:underline inline-flex items-center gap-1">${esc(t.id)} <iconify-icon icon="solar:external-link-linear" width="12"></iconify-icon></a>`;

        const totalSpentSec = getTaskLoggedSeconds(t.id, c);
        const estSec = getEstimatedSeconds(t);
        const pct = estSec > 0 ? Math.min(Math.round((totalSpentSec / estSec) * 100), 100) : null;
        const statusCls = typeof c.statusClass === 'function' ? c.statusClass(t.status) : 'bg-slate-100 text-slate-700';

        el.innerHTML = `
            <div class="bg-[#F5F7FA] dark:bg-slate-800/50 rounded-xl p-5 border border-[#E8EDF4] dark:border-slate-700/60 space-y-4">
                <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0 space-y-1.5">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="text-xs font-mono font-extrabold text-[#5845F5] dark:text-indigo-400">${taskKeyHtml}</span>
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${statusCls}">${esc(t.status || 'To Do')}</span>
                            ${priorityBadge(t.priority)}
                            ${t.client ? `<span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-[#718096] dark:text-slate-300 border border-[#E8EDF4] dark:border-slate-700">${esc(t.client)}</span>` : ''}
                        </div>
                        <h4 class="text-sm font-extrabold text-[#171D32] dark:text-white leading-snug">${esc(t.desc || t.title || 'Untitled Task')}</h4>
                    </div>
                    ${isActive ? `
                        <button type="button" onclick="toggleActiveTask('${esc(t.id)}')" title="Clear focus"
                            class="text-slate-400 hover:text-[#F04465] p-1 rounded-lg transition-colors cursor-pointer shrink-0">
                            <iconify-icon icon="solar:close-circle-bold" width="18"></iconify-icon>
                        </button>` : `
                        <button type="button" onclick="window.OneDeskDashboard.clearFocusTask()" title="Deselect task"
                            class="text-slate-400 hover:text-[#F04465] p-1 rounded-lg transition-colors cursor-pointer shrink-0">
                            <iconify-icon icon="solar:close-circle-bold" width="18"></iconify-icon>
                        </button>`}
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs bg-white dark:bg-slate-900/70 p-3 rounded-xl border border-[#E8EDF4] dark:border-slate-800">
                    <div>
                        <p class="text-[10px] font-semibold uppercase text-[#718096] dark:text-slate-400">Assigned</p>
                        <p class="font-bold text-[#171D32] dark:text-slate-200 mt-0.5">${esc(t.created ? String(t.created).slice(0, 10) : (t.assignedDate || '—'))}</p>
                    </div>
                    <div>
                        <p class="text-[10px] font-semibold uppercase text-[#718096] dark:text-slate-400">Due Date</p>
                        <p class="font-bold ${isOverdueTask(t, c) ? 'text-[#F04465]' : 'text-[#171D32] dark:text-slate-200'} mt-0.5">${esc(t.dueDate ? String(t.dueDate).slice(0, 10) : '—')}</p>
                    </div>
                    <div>
                        <p class="text-[10px] font-semibold uppercase text-[#718096] dark:text-slate-400">Estimated</p>
                        <p class="font-bold text-[#171D32] dark:text-slate-200 mt-0.5">${estSec > 0 ? fmtShortDuration(estSec) : '—'}</p>
                    </div>
                    <div>
                        <p class="text-[10px] font-semibold uppercase text-[#718096] dark:text-slate-400">Total Spent</p>
                        <p class="font-bold text-[#5845F5] dark:text-indigo-400 mt-0.5 font-mono">${fmtShortDuration(totalSpentSec)}</p>
                    </div>
                </div>

                ${pct !== null ? `
                    <div class="space-y-1">
                        <div class="flex justify-between text-[11px] font-semibold text-[#718096] dark:text-slate-400">
                            <span>Estimated Progress</span>
                            <span class="font-bold text-[#171D32] dark:text-white">${pct}%</span>
                        </div>
                        <div class="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                            <div class="h-full bg-[#5845F5] rounded-full" style="width:${pct}%"></div>
                        </div>
                    </div>` : ''}

                <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E8EDF4] dark:border-slate-700/60">
                    <div>
                        <p class="text-[10px] font-bold uppercase tracking-wider text-[#718096] dark:text-slate-400">${isActive ? (isPaused ? 'Paused Timer' : 'Active Session') : 'Ready to Start'}</p>
                        <p id="task-timer-display" class="text-2xl font-black text-[#171D32] dark:text-white font-mono tabular-nums">${isActive ? fmtTime(c.taskSeconds) : '00:00:00'}</p>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                        ${!isActive ? `
                            <button type="button" onclick="toggleActiveTask('${esc(t.id)}')"
                                class="inline-flex items-center gap-1.5 bg-[#5845F5] hover:bg-[#4934DC] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer">
                                <iconify-icon icon="solar:play-circle-bold" width="16"></iconify-icon> Start Task
                            </button>` : `
                            <button id="task-hold-btn" type="button" onclick="holdTask()" class="${isPaused ? 'hidden' : ''} inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-[#F59E0B] border border-amber-200/70 text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer">
                                <iconify-icon icon="solar:pause-circle-bold" width="15"></iconify-icon> Pause
                            </button>
                            <button id="task-resume-btn" type="button" onclick="resumeTaskTimer()" class="${isPaused ? '' : 'hidden'} inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-[#10B981] border border-emerald-200/70 text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer">
                                <iconify-icon icon="solar:play-circle-bold" width="15"></iconify-icon> Resume
                            </button>
                            <button type="button" onclick="endTask()"
                                class="inline-flex items-center gap-1.5 bg-[#10B981] hover:bg-emerald-600 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer">
                                <iconify-icon icon="solar:check-circle-bold" width="15"></iconify-icon> Mark Completed
                            </button>`}
                        <button type="button" onclick="if(typeof openTaskResourcesDrawer==='function')openTaskResourcesDrawer('${esc(t.id)}')"
                            class="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-[#171D32] dark:text-slate-200 border border-[#E8EDF4] dark:border-slate-700 text-xs font-semibold px-3 py-2 rounded-xl transition-all cursor-pointer">
                            <iconify-icon icon="solar:notes-bold-duotone" width="15"></iconify-icon> Notes &amp; Links
                        </button>
                    </div>
                </div>
            </div>`;
    }

    // ─────────────────────────────────────────────────────────────
    // 3. RECENTLY SYNCED
    // ─────────────────────────────────────────────────────────────
    function renderRecentlySynced() {
        const el = document.getElementById('recent-tasks');
        if (!el) return;
        const c = ctx();
        const all = (c.tasks || []).slice();

        const search = state.recent.search.trim().toLowerCase();
        const stFilter = state.recent.status;

        const filtered = all
            .filter(t => {
                if (stFilter !== 'all' && statusCategory(t.status, c) !== stFilter) return false;
                if (search) {
                    const hay = `${t.id} ${t.desc || ''} ${t.client || ''} ${t.status || ''}`.toLowerCase();
                    if (!hay.includes(search)) return false;
                }
                return true;
            })
            .sort((a, b) => {
                const ta = Number(a.updatedAt || a.completedAt || a.createdAt || (a.updated ? new Date(a.updated).getTime() : 0) || 0);
                const tb = Number(b.updatedAt || b.completedAt || b.createdAt || (b.updated ? new Date(b.updated).getTime() : 0) || 0);
                return tb - ta;
            })
            .slice(0, 12);

        if (!filtered.length) {
            el.innerHTML = `<p class="p-6 text-center text-xs text-[#718096] dark:text-slate-400">No matching synced tasks found.</p>`;
            return;
        }

        el.innerHTML = filtered.map(t => {
            const ts = t.updatedAt || t.completedAt || t.createdAt || (t.updated ? new Date(t.updated).getTime() : null);
            const rel = fmtRelative(ts);
            const statusCls = typeof c.statusClass === 'function' ? c.statusClass(t.status) : 'bg-slate-100 text-slate-700';
            return `
                <div onclick="window.OneDeskDashboard.selectFocusTask('${esc(t.id)}')"
                    class="flex items-center justify-between gap-3 py-2.5 px-2.5 hover:bg-[#F5F7FA] dark:hover:bg-slate-800/60 transition-colors rounded-xl cursor-pointer">
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2">
                            <span class="text-[11px] font-mono font-bold text-[#5845F5] dark:text-indigo-400 shrink-0">${esc(t.id)}</span>
                            <span class="text-[10px] text-[#718096] dark:text-slate-400 truncate">${esc(t.client || 'General')}</span>
                            <span class="text-[10px] text-[#718096] dark:text-slate-500 ml-auto shrink-0">${esc(rel)}</span>
                        </div>
                        <p class="text-xs font-semibold text-[#171D32] dark:text-slate-200 truncate mt-0.5">${esc(t.desc || t.title || '')}</p>
                    </div>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${statusCls}">${esc(t.status || 'To Do')}</span>
                </div>`;
        }).join('');
    }

    // ─────────────────────────────────────────────────────────────
    // 4. MY TASK QUEUE
    // ─────────────────────────────────────────────────────────────
    function renderTaskQueue() {
        const listEl = document.getElementById('my-task-queue-list');
        const countEl = document.getElementById('my-queue-count');
        if (!listEl) return;
        const c = ctx();

        const myTasks = (c.tasks || []).filter(t => {
            const mine = typeof c.assigneeMatches === 'function' ? c.assigneeMatches(t, 'me') : true;
            if (!mine) return false;
            const cat = statusCategory(t.status, c);
            return cat !== 'completed';
        });

        const search = state.queue.search.trim().toLowerCase();
        const filter = state.queue.status;
        const filtered = myTasks.filter(t => {
            const cat = statusCategory(t.status, c);
            if (filter === 'todo' && cat !== 'todo') return false;
            if (filter === 'inprogress' && cat !== 'inprogress') return false;
            if (filter === 'hold' && cat !== 'hold') return false;
            if (filter === 'overdue' && !isOverdueTask(t, c)) return false;
            if (search) {
                const hay = `${t.id} ${t.desc || ''} ${t.client || ''} ${t.priority || ''}`.toLowerCase();
                if (!hay.includes(search)) return false;
            }
            return true;
        });

        filtered.sort((a, b) => {
            if (state.queue.sort === 'priority') return priorityRank(a.priority) - priorityRank(b.priority);
            if (state.queue.sort === 'duedate') {
                return (parseDueMs(a.dueDate) || 9e15) - (parseDueMs(b.dueDate) || 9e15);
            }
            if (state.queue.sort === 'recent') {
                return Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0);
            }
            return String(a.id).localeCompare(String(b.id));
        });

        if (countEl) countEl.textContent = String(filtered.length);

        if (!filtered.length) {
            listEl.innerHTML = `<div class="p-6 text-center text-xs text-[#718096] dark:text-slate-400 bg-[#F5F7FA] dark:bg-slate-800/40 rounded-xl border border-dashed border-[#E8EDF4] dark:border-slate-700">No tasks match the current queue filter.</div>`;
            return;
        }

        listEl.innerHTML = filtered.slice(0, 25).map(t => {
            const overdue = isOverdueTask(t, c);
            const isActive = c.activeTaskId && String(c.activeTaskId) === String(t.id);
            const isSelected = state.selectedFocusTaskId && String(state.selectedFocusTaskId) === String(t.id);
            const statusCls = typeof c.statusClass === 'function' ? c.statusClass(t.status) : 'bg-slate-100 text-slate-700';
            const estSec = getEstimatedSeconds(t);

            return `
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border ${isActive || isSelected ? 'border-[#5845F5] bg-[#5845F5]/5' : 'border-[#E8EDF4] dark:border-slate-800 bg-[#F5F7FA]/60 dark:bg-slate-800/30'} hover:border-[#5845F5]/50 transition-all">
                    <div class="min-w-0 flex-1 space-y-1">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="text-xs font-mono font-extrabold text-[#5845F5] dark:text-indigo-400">${esc(t.id)}</span>
                            ${priorityBadge(t.priority)}
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${statusCls}">${esc(t.status || 'To Do')}</span>
                            ${t.client ? `<span class="text-[10px] font-semibold text-[#718096] dark:text-slate-400">${esc(t.client)}</span>` : ''}
                            ${overdue ? `<span class="text-[10px] font-bold text-[#F04465] bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full">Overdue</span>` : ''}
                        </div>
                        <p class="text-xs font-bold text-[#171D32] dark:text-white truncate">${esc(t.desc || t.title || '')}</p>
                        <div class="flex items-center gap-3 text-[11px] text-[#718096] dark:text-slate-400">
                            <span>Due: <strong class="${overdue ? 'text-[#F04465]' : 'text-[#171D32] dark:text-slate-300'}">${esc(t.dueDate ? String(t.dueDate).slice(0, 10) : '—')}</strong></span>
                            ${estSec > 0 ? `<span>Est: <strong>${fmtShortDuration(estSec)}</strong></span>` : ''}
                        </div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                        <button type="button" onclick="window.OneDeskDashboard.selectFocusTask('${esc(t.id)}')"
                            class="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-[#171D32] dark:text-slate-200 border border-[#E8EDF4] dark:border-slate-700 hover:border-[#5845F5] transition-all cursor-pointer">
                            Select Task
                        </button>
                        <button type="button" onclick="toggleActiveTask('${esc(t.id)}')"
                            class="px-3 py-1.5 rounded-lg text-xs font-bold ${isActive ? 'bg-rose-50 dark:bg-rose-950/40 text-[#F04465] border border-rose-200 dark:border-rose-900/50' : 'bg-[#5845F5] hover:bg-[#4934DC] text-white'} transition-all cursor-pointer">
                            ${isActive ? 'Active' : 'Start'}
                        </button>
                    </div>
                </div>`;
        }).join('');
    }

    // ─────────────────────────────────────────────────────────────
    // 5. LIVE TEAM OVERVIEW (MANAGEMENT)
    // ─────────────────────────────────────────────────────────────
    function deriveUserState(u) {
        if (!u) return 'checkedout';
        if (u.activeSession?.state === 'paused' || u.timerState === 'paused') return 'break';
        if (u.currentTask?.state === 'working') return 'working';
        if (u.currentTask && u.currentTask.state !== 'working') return 'paused';
        if (u.online || u.activeSession?.state === 'running') return 'idle';
        return 'checkedout';
    }

    function renderLiveTeamOverview() {
        const list = document.getElementById('admin-current-work-list');
        const countEl = document.getElementById('admin-current-work-count');
        if (!list || !countEl) return;
        const c = ctx();
        if (!c.canViewDailySummary?.()) return;

        let users = (c.currentWorkUsers || []).slice();

        // Admin sees all users. Others only see their own task alone.
        const isAdminUser = typeof c.isAdmin === 'function' ? c.isAdmin() : (typeof window.isAdmin === 'function' ? window.isAdmin() : false);
        const myEmail = (c.currentUser?.email || window.currentUser?.email || '').toLowerCase().trim();

        // Toggle UI controls based on Admin status
        const titleEl = document.getElementById('admin-current-work-title');
        const subtitleEl = document.getElementById('admin-current-work-subtitle');
        const searchWrap = document.getElementById('team-search-wrap') || document.getElementById('team-search-input')?.parentElement;
        const sortSelect = document.getElementById('team-sort-select');
        const pillsWrap = document.getElementById('team-filter-pills');

        if (isAdminUser) {
            if (titleEl) titleEl.textContent = 'Live Team Overview';
            if (subtitleEl) subtitleEl.textContent = 'Real-time employee availability, active tasks & session timers';
            if (searchWrap) searchWrap.classList.remove('hidden');
            if (sortSelect) sortSelect.classList.remove('hidden');
            if (pillsWrap) pillsWrap.classList.remove('hidden');
            list.className = 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5';
        } else {
            users = users.filter(u => (u.email || '').toLowerCase().trim() === myEmail);
            if (users.length === 0 && c.currentUser) {
                users = [{
                    email: c.currentUser.email,
                    name: c.currentUser.name || c.currentUser.email,
                    role: c.currentUser.role || 'Team Member',
                    profilePicture: c.currentUser.profilePicture || null,
                    online: true,
                    currentTask: c.activeTaskId ? {
                        taskId: c.activeTaskId,
                        taskDesc: c.activeTaskSnapshot?.desc || 'Current Active Task',
                        client: c.activeTaskSnapshot?.client || '',
                        status: c.activeTaskSnapshot?.status || 'In Progress',
                        startedAt: window.taskStartTime || Date.now(),
                        state: window.taskOnHold ? 'paused' : 'working'
                    } : null
                }];
            }
            if (titleEl) titleEl.textContent = 'My Live Status';
            if (subtitleEl) subtitleEl.textContent = 'Real-time availability, active task & session timer';
            if (searchWrap) searchWrap.classList.add('hidden');
            if (sortSelect) sortSelect.classList.add('hidden');
            if (pillsWrap) pillsWrap.classList.add('hidden');
            list.className = 'flex flex-col gap-3.5';
        }

        const activeCount = users.filter(u => deriveUserState(u) === 'working').length;
        if (isAdminUser) {
            countEl.textContent = `${activeCount} Working`;
        } else {
            const myState = users[0] ? deriveUserState(users[0]) : 'idle';
            const stateLabels = { working: 'Working', paused: 'Paused', break: 'On Break', idle: 'Idle', checkedout: 'Checked Out' };
            countEl.textContent = stateLabels[myState] || 'Active';
        }

        const search = state.team.search.trim().toLowerCase();
        const stFilter = state.team.state;

        const taskCountsByEmail = new Map();
        (c.tasks || []).forEach(t => {
            const em = String(t.assigneeEmail || t.userId || '').toLowerCase();
            if (!em) return;
            taskCountsByEmail.set(em, (taskCountsByEmail.get(em) || 0) + 1);
        });

        let filtered = users;
        if (isAdminUser) {
            filtered = users.filter(u => {
                const st = deriveUserState(u);
                if (stFilter !== 'all' && st !== stFilter) return false;
                if (search) {
                    const hay = `${u.name || ''} ${u.email || ''} ${u.role || ''} ${u.currentTask?.taskId || ''}`.toLowerCase();
                    if (!hay.includes(search)) return false;
                }
                return true;
            });

            filtered.sort((a, b) => {
                if (state.team.sort === 'name') return (a.name || '').localeCompare(b.name || '');
                if (state.team.sort === 'duration') {
                    const da = a.currentTask?.startedAt ? Date.now() - a.currentTask.startedAt : 0;
                    const db = b.currentTask?.startedAt ? Date.now() - b.currentTask.startedAt : 0;
                    return db - da;
                }
                if (state.team.sort === 'workload') {
                    return (taskCountsByEmail.get(String(b.email).toLowerCase()) || 0) - (taskCountsByEmail.get(String(a.email).toLowerCase()) || 0);
                }
                const order = { working: 0, paused: 1, break: 2, idle: 3, checkedout: 4 };
                return (order[deriveUserState(a)] ?? 9) - (order[deriveUserState(b)] ?? 9) || (a.name || '').localeCompare(b.name || '');
            });

            if (!filtered.length) {
                list.innerHTML = `<p class="md:col-span-2 xl:col-span-3 p-6 text-center text-xs text-[#718096] dark:text-slate-400">No employees match the selected filter.</p>`;
                return;
            }
        }

        const badgeMap = {
            working: { label: 'Working', cls: 'bg-emerald-50 dark:bg-emerald-950/40 text-[#10B981] border-emerald-200/70 dark:border-emerald-900/40' },
            paused: { label: 'Paused', cls: 'bg-sky-50 dark:bg-sky-950/40 text-[#2695EB] border-sky-200/70 dark:border-sky-900/40' },
            break: { label: 'On Break', cls: 'bg-amber-50 dark:bg-amber-950/40 text-[#F59E0B] border-amber-200/70 dark:border-amber-900/40' },
            idle: { label: 'Idle', cls: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700' },
            checkedout: { label: 'Checked Out', cls: 'bg-slate-50 dark:bg-slate-900 text-slate-400 border-slate-200/60 dark:border-slate-800' }
        };

        if (!isAdminUser) {
            list.innerHTML = filtered.map(u => {
                const st = deriveUserState(u);
                const b = badgeMap[st] || badgeMap.idle;
                const task = u.currentTask;
                const elapsed = task?.startedAt ? fmtTime(Math.max(0, Math.floor((Date.now() - task.startedAt) / 1000))) : '00:00:00';
                const avatar = typeof c.getSafePdfUrl === 'function' && typeof c.getUserAvatarSrc === 'function'
                    ? c.getSafePdfUrl(u.profilePicture || c.getUserAvatarSrc(u))
                    : '';

                return `
                    <div class="rounded-2xl border border-[#E8EDF4] dark:border-slate-800 p-4 sm:p-5 bg-[#F5F7FA]/70 dark:bg-slate-800/40 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div class="flex items-center gap-3.5 min-w-[220px]">
                            <div class="relative shrink-0">
                                <img src="${esc(avatar)}" alt="${esc(u.name || u.email)}" class="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-[#E8EDF4] dark:border-slate-700 object-cover shadow-xs">
                                <span class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${u.online ? 'bg-[#10B981]' : 'bg-slate-300 dark:bg-slate-600'}"></span>
                            </div>
                            <div class="min-w-0">
                                <div class="flex items-center gap-2">
                                    <p class="text-sm font-extrabold text-[#171D32] dark:text-white truncate">${esc(u.name || u.email)}</p>
                                    <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${b.cls}">${b.label}</span>
                                </div>
                                <p class="text-[11px] font-semibold text-[#718096] dark:text-slate-400 uppercase tracking-wider mt-0.5 truncate">${esc(u.role || 'Team Member')}</p>
                            </div>
                        </div>

                        ${task ? `
                            <div class="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-[#E8EDF4] dark:border-slate-800 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                                <div class="min-w-0 flex-1">
                                    <div class="flex items-center gap-2 mb-1">
                                        <span class="text-xs font-mono font-extrabold text-[#5845F5] dark:text-indigo-400">${esc(task.taskId)}</span>
                                        ${task.status ? `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${c.statusClass ? c.statusClass(task.status) : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}">${esc(task.status)}</span>` : ''}
                                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[#718096] dark:text-slate-400">${esc(task.client || 'Internal')}</span>
                                    </div>
                                    <p class="text-xs font-bold text-[#171D32] dark:text-slate-200 truncate">${esc(task.taskDesc || 'Task in progress')}</p>
                                </div>
                                <div class="flex items-center gap-2.5 sm:border-l sm:border-slate-100 dark:sm:border-slate-800 sm:pl-4 shrink-0">
                                    <span class="relative flex h-2.5 w-2.5 ${st === 'working' ? 'inline-flex' : 'hidden'}">
                                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                    </span>
                                    <span class="live-task-timer font-mono text-base font-black text-[#171D32] dark:text-white" data-started="${task.startedAt || 0}" data-state="${task.state || 'idle'}">${elapsed}</span>
                                </div>
                            </div>` : `
                            <div class="flex-1 bg-white/70 dark:bg-slate-900/50 rounded-xl border border-dashed border-[#E8EDF4] dark:border-slate-800 p-3.5 text-center flex items-center justify-center">
                                <p class="text-xs text-[#718096] dark:text-slate-400 font-medium">No active task running · Select a task from your queue below to start tracking</p>
                            </div>`}
                    </div>`;
            }).join('');
            return;
        }

        list.innerHTML = filtered.map(u => {
            const st = deriveUserState(u);
            const b = badgeMap[st];
            const task = u.currentTask;
            const elapsed = task?.startedAt ? fmtTime(Math.max(0, Math.floor((Date.now() - task.startedAt) / 1000))) : '00:00:00';
            const avatar = typeof c.getSafePdfUrl === 'function' && typeof c.getUserAvatarSrc === 'function'
                ? c.getSafePdfUrl(u.profilePicture || c.getUserAvatarSrc(u))
                : '';
            const lastSeen = u.lastSeen || u.updatedAt || task?.startedAt || null;

            return `
                <div onclick="window.OneDeskDashboard.openEmployeeModal('${esc(u.email)}')"
                    class="rounded-xl border border-[#E8EDF4] dark:border-slate-800 p-4 bg-[#F5F7FA]/70 dark:bg-slate-800/40 hover:border-[#5845F5]/50 transition-all cursor-pointer flex flex-col justify-between gap-3">
                    <div class="flex items-start justify-between gap-2">
                        <div class="flex items-center gap-2.5 min-w-0">
                            <div class="relative shrink-0">
                                <img src="${esc(avatar)}" alt="${esc(u.name || u.email)}" class="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-[#E8EDF4] dark:border-slate-700 object-cover">
                                <span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${u.online ? 'bg-[#10B981]' : 'bg-slate-300 dark:bg-slate-600'}"></span>
                            </div>
                            <div class="min-w-0">
                                <p class="text-xs font-extrabold text-[#171D32] dark:text-white truncate">${esc(u.name || u.email)}</p>
                                <p class="text-[10px] font-semibold text-[#718096] dark:text-slate-400 uppercase tracking-wider truncate">${esc(u.role || 'Employee')}</p>
                            </div>
                        </div>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${b.cls}">${b.label}</span>
                    </div>

                    ${task ? `
                        <div class="bg-white dark:bg-slate-900 rounded-xl border border-[#E8EDF4] dark:border-slate-800 p-3 space-y-1.5">
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-[11px] font-mono font-extrabold text-[#5845F5] dark:text-indigo-400">${esc(task.taskId)}</span>
                                ${task.status ? `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${c.statusClass ? c.statusClass(task.status) : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}">${esc(task.status)}</span>` : ''}
                            </div>
                            <p class="text-xs font-semibold text-[#171D32] dark:text-slate-200 line-clamp-1">${esc(task.taskDesc || 'Task in progress')}</p>
                            <div class="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
                                <span class="text-[#718096] dark:text-slate-400 truncate">${esc(task.client || 'No Client')}</span>
                                <span class="live-task-timer font-mono font-bold text-[#171D32] dark:text-white" data-started="${task.startedAt || 0}" data-state="${task.state || 'idle'}">${elapsed}</span>
                            </div>
                        </div>` : `
                        <div class="bg-white/70 dark:bg-slate-900/50 rounded-xl border border-dashed border-[#E8EDF4] dark:border-slate-800 p-3 text-center">
                            <p class="text-[11px] text-[#718096] dark:text-slate-400">No active task${lastSeen ? ` · Last active ${fmtRelative(lastSeen)}` : ''}</p>
                        </div>`}
                </div>`;
        }).join('');
    }

    function openEmployeeModal(email) {
        const modal = document.getElementById('employeeActivityModal');
        const body = document.getElementById('employee-activity-modal-body');
        if (!modal || !body) return;
        const c = ctx();
        if (!c.canViewDailySummary?.()) return;

        const user = (c.currentWorkUsers || []).find(u => String(u.email).toLowerCase() === String(email).toLowerCase())
            || (c.knownUserByEmail ? c.knownUserByEmail(email) : null)
            || { email, name: email };

        const empTasks = (c.tasks || []).filter(t => String(t.assigneeEmail || t.userId || '').toLowerCase() === String(email).toLowerCase());
        const active = empTasks.filter(t => c.isInProgress?.(t.status));
        const completed = empTasks.filter(t => c.isDone?.(t.status) || c.isInternalDone?.(t.status) || c.isTaskCompletedStatus?.(t.status));

        const todayStr = typeof c.todayIso === 'function' ? c.todayIso() : new Date().toISOString().slice(0, 10);
        const logs = (c.allTimeLogs || window.allTimeLogs || []).filter(l => {
            if (String(l.userId || '').toLowerCase() !== String(email).toLowerCase() || !l.startTime) return false;
            const d = new Date(l.startTime);
            return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === todayStr;
        });
        const loggedTodaySec = logs.reduce((s, l) => s + Number(l.durationSeconds || 0), 0);

        body.innerHTML = `
            <div class="flex items-start justify-between gap-4 pb-4 border-b border-[#E8EDF4] dark:border-slate-800">
                <div>
                    <h3 class="text-base font-extrabold text-[#171D32] dark:text-white">${esc(user.name || user.email)}</h3>
                    <p class="text-xs text-[#718096] dark:text-slate-400">${esc(user.email)} · ${esc(user.role || 'Employee')}</p>
                </div>
                <button type="button" onclick="document.getElementById('employeeActivityModal')?.close()"
                    class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                    <iconify-icon icon="solar:close-circle-linear" width="20"></iconify-icon>
                </button>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
                <div class="p-3 rounded-xl bg-[#F5F7FA] dark:bg-slate-800/60">
                    <p class="text-[10px] font-bold uppercase text-[#718096]">Assigned</p>
                    <p class="text-lg font-black text-[#171D32] dark:text-white">${empTasks.length}</p>
                </div>
                <div class="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30">
                    <p class="text-[10px] font-bold uppercase text-[#5845F5]">In Progress</p>
                    <p class="text-lg font-black text-[#5845F5]">${active.length}</p>
                </div>
                <div class="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30">
                    <p class="text-[10px] font-bold uppercase text-[#10B981]">Completed</p>
                    <p class="text-lg font-black text-[#10B981]">${completed.length}</p>
                </div>
                <div class="p-3 rounded-xl bg-sky-50/70 dark:bg-sky-950/30">
                    <p class="text-[10px] font-bold uppercase text-[#2695EB]">Logged Today</p>
                    <p class="text-lg font-black text-[#2695EB] font-mono">${fmtShortDuration(loggedTodaySec)}</p>
                </div>
            </div>
            <div class="space-y-3 max-h-72 overflow-y-auto pr-1">
                <p class="text-xs font-bold uppercase tracking-wider text-[#718096]">Today's Work History &amp; Active Tasks</p>
                ${logs.length ? logs.map(l => `
                    <div class="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-[#E8EDF4] dark:border-slate-800 text-xs">
                        <div class="min-w-0">
                            <span class="font-mono font-bold text-[#5845F5]">${esc(l.taskId)}</span>
                            <span class="text-[#171D32] dark:text-slate-200 ml-1.5">${esc(l.taskDesc || '')}</span>
                        </div>
                        <span class="font-mono font-bold text-[#10B981] shrink-0">${fmtShortDuration(l.durationSeconds)}</span>
                    </div>`).join('') : '<p class="text-xs text-[#718096]">No completed time segments logged today yet.</p>'}
            </div>`;
        if (!modal.open) modal.showModal();
    }

    // ─────────────────────────────────────────────────────────────
    // 6. TEAM WORKLOAD ANALYTICS
    // ─────────────────────────────────────────────────────────────
    function renderWorkloadAnalytics() {
        const chart = document.getElementById('workload-chart');
        const totalEl = document.getElementById('workload-total');
        const stripEl = document.getElementById('workload-summary-strip');
        if (!chart || !totalEl) return;
        const c = ctx();
        if (!c.canViewDailySummary?.()) return;

        const now = Date.now();
        const period = state.workload.period;
        const periodMs = period === 'today' ? 86400000 : (period === 'week' ? 7 * 86400000 : (period === 'month' ? 30 * 86400000 : null));

        const map = new Map();
        (c.tasks || []).forEach(task => {
            if (periodMs) {
                const ts = Number(task.updatedAt || task.createdAt || (task.created ? new Date(task.created).getTime() : 0) || 0);
                if (ts && (now - ts) > periodMs) return;
            }
            const email = String(task.assigneeEmail || task.userId || '').toLowerCase();
            if (!email || email === 'unassigned') return;
            const rawName = typeof c.assigneeName === 'function' ? c.assigneeName(task) : email;
            if (!rawName || rawName === 'Unassigned') return;

            if (!map.has(email)) {
                const known = typeof c.knownUserByEmail === 'function' ? c.knownUserByEmail(email) : null;
                map.set(email, { email, name: known?.name || rawName, assigned: 0, inprogress: 0, completed: 0, pending: 0, estHours: 0 });
            }
            const row = map.get(email);
            row.assigned += 1;
            const cat = statusCategory(task.status, c);
            if (cat === 'completed') row.completed += 1;
            else if (cat === 'inprogress') row.inprogress += 1;
            else row.pending += 1;
            row.estHours += getEstimatedSeconds(task) / 3600;
        });

        const rows = [...map.values()];
        const metric = state.workload.metric; // 'count' | 'hours'
        const scale = state.workload.scale;   // 'linear' | 'log'

        rows.sort((a, b) => {
            if (metric === 'hours') return b.estHours - a.estHours;
            if (state.workload.sort === 'inprogress') return b.inprogress - a.inprogress;
            if (state.workload.sort === 'pending') return b.pending - a.pending;
            return b.assigned - a.assigned;
        });

        const totalAssigned = rows.reduce((s, r) => s + r.assigned, 0);
        const totalHours = rows.reduce((s, r) => s + r.estHours, 0);
        totalEl.textContent = metric === 'hours' ? `${totalHours.toFixed(1)}h Estimated` : `${totalAssigned} Assigned`;

        if (!rows.length) {
            if (stripEl) stripEl.innerHTML = '';
            chart.innerHTML = `<p class="p-6 text-center text-xs text-[#718096] dark:text-slate-400">No assigned tasks found for this timeframe.</p>`;
            return;
        }

        const highest = rows[0];
        const lowest = rows[rows.length - 1];
        if (stripEl) {
            stripEl.innerHTML = `
                <div class="p-3 rounded-xl bg-[#F5F7FA] dark:bg-slate-800/50 border border-[#E8EDF4] dark:border-slate-800">
                    <p class="text-[10px] font-bold uppercase text-[#718096] dark:text-slate-400">Highest Workload</p>
                    <p class="text-xs font-extrabold text-[#171D32] dark:text-white mt-0.5 truncate">${esc(highest.name)} (${metric === 'hours' ? `${highest.estHours.toFixed(1)}h` : highest.assigned})</p>
                </div>
                <div class="p-3 rounded-xl bg-[#F5F7FA] dark:bg-slate-800/50 border border-[#E8EDF4] dark:border-slate-800">
                    <p class="text-[10px] font-bold uppercase text-[#718096] dark:text-slate-400">Lowest Workload</p>
                    <p class="text-xs font-extrabold text-[#171D32] dark:text-white mt-0.5 truncate">${esc(lowest.name)} (${metric === 'hours' ? `${lowest.estHours.toFixed(1)}h` : lowest.assigned})</p>
                </div>
                <div class="p-3 rounded-xl bg-[#F5F7FA] dark:bg-slate-800/50 border border-[#E8EDF4] dark:border-slate-800">
                    <p class="text-[10px] font-bold uppercase text-[#718096] dark:text-slate-400">Total ${metric === 'hours' ? 'Est. Hours' : 'Assigned Tasks'}</p>
                    <p class="text-xs font-extrabold text-[#5845F5] dark:text-indigo-400 mt-0.5">${metric === 'hours' ? `${totalHours.toFixed(1)} hrs` : `${totalAssigned} tasks`}</p>
                </div>`;
        }

        const maxVal = Math.max(...rows.map(r => metric === 'hours' ? r.estHours : r.assigned), 1);

        chart.innerHTML = rows.map(r => {
            const val = metric === 'hours' ? r.estHours : r.assigned;
            const sharePct = totalAssigned ? Math.round((r.assigned / totalAssigned) * 100) : 0;
            // Accurate proportional width (no artificial minimum bar width)
            const barWidth = scale === 'log'
                ? (val > 0 ? (Math.log10(val + 1) / Math.log10(maxVal + 1)) * 100 : 0)
                : (val / maxVal) * 100;

            return `
                <div onclick="window.OneDeskDashboard.openEmployeeModal('${esc(r.email)}')" class="cursor-pointer group">
                    <div class="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                        <span class="text-xs font-bold text-[#171D32] dark:text-slate-200 group-hover:text-[#5845F5] dark:group-hover:text-indigo-400">${esc(r.name)}</span>
                        <div class="flex items-center gap-2.5 text-[11px] text-[#718096] dark:text-slate-400 tabular-nums">
                            <span>In Prog: <strong class="text-[#5845F5]">${r.inprogress}</strong></span>
                            <span>Done: <strong class="text-[#10B981]">${r.completed}</strong></span>
                            <span>Pending: <strong class="text-[#F59E0B]">${r.pending}</strong></span>
                            <span class="font-extrabold text-[#171D32] dark:text-white">${metric === 'hours' ? `${r.estHours.toFixed(1)}h` : `${r.assigned} (${sharePct}%)`}</span>
                        </div>
                    </div>
                    <div class="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div class="h-full bg-[#5845F5] rounded-full transition-all duration-500" style="width:${barWidth.toFixed(2)}%"></div>
                    </div>
                </div>`;
        }).join('');
    }

    // ─────────────────────────────────────────────────────────────
    // 7. ATTENTION REQUIRED (MANAGEMENT)
    // ─────────────────────────────────────────────────────────────
    function renderAttentionRequired() {
        const list = document.getElementById('attention-required-list');
        const badge = document.getElementById('attention-count-badge');
        if (!list || !badge) return;
        const c = ctx();
        if (!c.canViewDailySummary?.()) return;

        const issues = [];
        const todayStr = typeof c.todayIso === 'function' ? c.todayIso() : new Date().toISOString().slice(0, 10);

        (c.tasks || []).forEach(t => {
            const cat = statusCategory(t.status, c);
            if (cat === 'completed') return;
            if (isOverdueTask(t, c)) {
                issues.push({
                    urgency: 1, type: 'Overdue Task', color: 'text-[#F04465] bg-rose-50 dark:bg-rose-950/40',
                    ref: `${t.id} · ${t.desc || ''}`, detail: `Due ${String(t.dueDate).slice(0, 10)}`,
                    action: 'Re-prioritize', onClick: `window.OneDeskDashboard.selectFocusTask('${esc(t.id)}')`
                });
            } else if (cat === 'qccorrection') {
                issues.push({
                    urgency: 2, type: 'QC Correction', color: 'text-[#F59E0B] bg-amber-50 dark:bg-amber-950/40',
                    ref: `${t.id} · ${t.desc || ''}`, detail: `Status: ${t.status}`,
                    action: 'Inspect QC', onClick: `switchView('qc')`
                });
            } else if (cat === 'hold') {
                issues.push({
                    urgency: 3, type: 'Task on Hold', color: 'text-[#F59E0B] bg-amber-50 dark:bg-amber-950/40',
                    ref: `${t.id} · ${t.desc || ''}`, detail: `Assignee: ${c.assigneeName?.(t) || '—'}`,
                    action: 'Open Details', onClick: `window.OneDeskDashboard.selectFocusTask('${esc(t.id)}')`
                });
            } else if (!t.assigneeEmail && !t.userId) {
                issues.push({
                    urgency: 4, type: 'Unassigned Task', color: 'text-[#2695EB] bg-sky-50 dark:bg-sky-950/40',
                    ref: `${t.id} · ${t.desc || ''}`, detail: `Due: ${t.dueDate ? String(t.dueDate).slice(0, 10) : 'Not set'}`,
                    action: 'Assign in Hub', onClick: `switchView('tasks')`
                });
            } else if (t.dueDate && String(t.dueDate).slice(0, 10) === todayStr) {
                issues.push({
                    urgency: 5, type: 'Due Today', color: 'text-[#5845F5] dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40',
                    ref: `${t.id} · ${t.desc || ''}`, detail: `Assignee: ${c.assigneeName?.(t) || '—'}`,
                    action: 'Open Details', onClick: `window.OneDeskDashboard.selectFocusTask('${esc(t.id)}')`
                });
            }
        });

        (c.currentWorkUsers || []).forEach(u => {
            if (deriveUserState(u) === 'idle') {
                issues.push({
                    urgency: 3, type: 'Idle Employee', color: 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800',
                    ref: u.name || u.email, detail: 'Online with no active task',
                    action: 'View Activity', onClick: `window.OneDeskDashboard.openEmployeeModal('${esc(u.email)}')`
                });
            }
        });

        issues.sort((a, b) => a.urgency - b.urgency);
        badge.textContent = String(issues.length);

        if (!issues.length) {
            list.innerHTML = `<div class="md:col-span-2 p-5 text-center text-xs text-[#718096] dark:text-slate-400 bg-[#F5F7FA] dark:bg-slate-800/40 rounded-xl">All clear — no overdue tasks, QC corrections, or idle alerts right now.</div>`;
            return;
        }

        list.innerHTML = issues.slice(0, 8).map(item => `
            <div class="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-[#E8EDF4] dark:border-slate-800 bg-[#F5F7FA]/70 dark:bg-slate-800/40">
                <div class="min-w-0">
                    <span class="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${item.color} mb-1">${esc(item.type)}</span>
                    <p class="text-xs font-bold text-[#171D32] dark:text-white truncate">${esc(item.ref)}</p>
                    <p class="text-[11px] text-[#718096] dark:text-slate-400 truncate">${esc(item.detail)}</p>
                </div>
                <button type="button" onclick="${item.onClick}"
                    class="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-[#E8EDF4] dark:border-slate-700 text-[11px] font-bold text-[#5845F5] dark:text-indigo-400 hover:border-[#5845F5] shrink-0 cursor-pointer">
                    ${esc(item.action)}
                </button>
            </div>`).join('');
    }

    // ─────────────────────────────────────────────────────────────
    // 8. PRODUCTIVITY INSIGHTS
    // ─────────────────────────────────────────────────────────────
    function renderProductivityInsights() {
        const compChart = document.getElementById('insights-completed-chart');
        const hrsChart = document.getElementById('insights-hours-chart');
        const trendEl = document.getElementById('insights-weekly-trend');
        if (!compChart || !hrsChart || !trendEl) return;
        const c = ctx();
        if (!c.canViewDailySummary?.()) return;

        const days = state.insightsRangeDays || 7;
        const labels = [];
        const completedByDay = {};
        const hoursByDay = {};

        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            labels.push({ key, label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) });
            completedByDay[key] = 0;
            hoursByDay[key] = 0;
        }

        (c.tasks || []).forEach(t => {
            if (statusCategory(t.status, c) !== 'completed') return;
            const dStr = t.lastCompletedDate || (t.completedAt ? new Date(t.completedAt).toISOString().slice(0, 10) : null);
            if (dStr && dStr in completedByDay) completedByDay[dStr] += 1;
        });

        (c.allTimeLogs || window.allTimeLogs || []).forEach(l => {
            if (!l.startTime) return;
            const dStr = new Date(l.startTime).toISOString().slice(0, 10);
            if (dStr in hoursByDay) hoursByDay[dStr] += Number(l.durationSeconds || 0) / 3600;
        });

        const maxComp = Math.max(...Object.values(completedByDay), 1);
        const totalComp = Object.values(completedByDay).reduce((a, b) => a + b, 0);
        const compTotalEl = document.getElementById('insights-completed-total');
        if (compTotalEl) compTotalEl.textContent = `${totalComp} tasks`;

        compChart.innerHTML = labels.map(l => {
            const v = completedByDay[l.key];
            const hPct = Math.round((v / maxComp) * 100);
            return `
                <div class="flex-1 flex flex-col items-center gap-1 h-full justify-end" title="${esc(l.label)}: ${v} completed">
                    <span class="text-[10px] font-bold text-[#171D32] dark:text-slate-300">${v || ''}</span>
                    <div class="w-full max-w-[22px] bg-[#10B981] rounded-t-md transition-all" style="height:${Math.max(hPct, v > 0 ? 8 : 2)}%"></div>
                    <span class="text-[9px] text-[#718096] dark:text-slate-400 truncate w-full text-center">${esc(l.label.split(' ')[1])}</span>
                </div>`;
        }).join('');

        const maxHrs = Math.max(...Object.values(hoursByDay), 1);
        const totalHrs = Object.values(hoursByDay).reduce((a, b) => a + b, 0);
        const hrsTotalEl = document.getElementById('insights-hours-total');
        if (hrsTotalEl) hrsTotalEl.textContent = `${totalHrs.toFixed(1)}h`;

        hrsChart.innerHTML = labels.map(l => {
            const v = hoursByDay[l.key];
            const hPct = Math.round((v / maxHrs) * 100);
            return `
                <div class="flex-1 flex flex-col items-center gap-1 h-full justify-end" title="${esc(l.label)}: ${v.toFixed(1)}h">
                    <span class="text-[10px] font-bold text-[#171D32] dark:text-slate-300">${v > 0 ? v.toFixed(0) : ''}</span>
                    <div class="w-full max-w-[22px] bg-[#5845F5] rounded-t-md transition-all" style="height:${Math.max(hPct, v > 0 ? 8 : 2)}%"></div>
                    <span class="text-[9px] text-[#718096] dark:text-slate-400 truncate w-full text-center">${esc(l.label.split(' ')[1])}</span>
                </div>`;
        }).join('');

        // Clean SVG trend line for daily working hours
        const pts = labels.map((l, idx) => {
            const x = labels.length > 1 ? (idx / (labels.length - 1)) * 100 : 50;
            const y = 90 - (hoursByDay[l.key] / maxHrs) * 75;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');
        trendEl.innerHTML = `
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="w-full h-full overflow-visible">
                <polyline fill="none" stroke="#5845F5" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" points="${pts}" />
            </svg>`;
    }

    function updateFilterPills(containerId, dataAttr, activeVal) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.querySelectorAll('button').forEach(btn => {
            const isMatch = btn.getAttribute(dataAttr) === activeVal;
            btn.className = isMatch
                ? `${containerId === 'queue-filter-pills' ? 'queue-pill' : 'team-pill'} px-3 py-1.5 rounded-lg text-xs font-bold bg-[#5845F5] text-white cursor-pointer`
                : `${containerId === 'queue-filter-pills' ? 'queue-pill' : 'team-pill'} px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F5F7FA] dark:bg-slate-800 text-[#718096] dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 cursor-pointer`;
        });
    }

    window.OneDeskDashboard = {
        syncSessionMetadata,
        updateShiftProgress,
        renderTaskFocus,
        renderRecentlySynced,
        renderTaskQueue,
        renderLiveTeamOverview,
        renderWorkloadAnalytics,
        renderAttentionRequired,
        renderProductivityInsights,
        openEmployeeModal,
        selectFocusTask(id) {
            state.selectedFocusTaskId = id;
            renderTaskFocus();
            renderTaskQueue();
            const focusEl = document.getElementById('active-task-card');
            if (focusEl && typeof focusEl.scrollIntoView === 'function') {
                focusEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        },
        clearFocusTask() {
            state.selectedFocusTaskId = null;
            renderTaskFocus();
            renderTaskQueue();
        },
        setQueueFilter(key, val) {
            state.queue[key] = val;
            if (key === 'status') updateFilterPills('queue-filter-pills', 'data-qfilter', val);
            renderTaskQueue();
        },
        setRecentFilter(key, val) {
            state.recent[key] = val;
            renderRecentlySynced();
        },
        setTeamFilter(key, val) {
            state.team[key] = val;
            if (key === 'state') updateFilterPills('team-filter-pills', 'data-tfilter', val);
            renderLiveTeamOverview();
        },
        setWorkloadOption(key, val) {
            state.workload[key] = val;
            renderWorkloadAnalytics();
        },
        setInsightsRange(days) {
            state.insightsRangeDays = parseInt(days, 10) || 7;
            renderProductivityInsights();
        },
        refreshAll() {
            syncSessionMetadata();
            renderTaskFocus();
            renderRecentlySynced();
            renderTaskQueue();
            renderLiveTeamOverview();
            renderWorkloadAnalytics();
            renderAttentionRequired();
            renderProductivityInsights();
        }
    };

    if (typeof window.OneDeskBridge === 'function') {
        window.OneDeskDashboard.refreshAll();
    }
})(window);
