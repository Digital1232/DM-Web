/**
 * One Report – agency-wide reporting view with Excel / PDF / CSV export.
 *
 * All numbers come from OneReportEngine.build(), which applies role
 * scoping first. Every table, chart and export reads the same model, so the
 * dashboard and downloaded files always agree.
 */
(function (window) {
    'use strict';

    const document = window.document;
    const PANEL_ID = 'view-one-report-panel';
    const BRAND = { name: 'VilPower', product: 'One Desk', primary: '4F46E5', primaryDark: '3730A3', light: 'EEF2FF' };
    const LIBS = {
        exceljs: 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js',
        jspdf: 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
        autotable: 'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js'
    };
    const CHART_COLORS = ['#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#64748B', '#84CC16', '#F97316', '#06B6D4'];
    const TABS = [
        ['overview', 'Overview & Charts'],
        ['team', 'Team Summary'],
        ['clients', 'Client Summary'],
        ['matrix', 'Member x Client'],
        ['breakdown', 'Task Breakdown'],
        ['timelog', 'Detailed Time Log'],
        ['performance', 'Task Performance'],
        ['qc', 'QC Report'],
        ['shoots', 'Shoot & Production'],
        ['attendance', 'Attendance']
    ];

    const state = {
        period: { mode: 'current_month', month: '', from: '', to: '' },
        filters: { employee: 'all', client: 'all', category: 'all', source: 'all' },
        tab: 'overview',
        logLimit: 200,
        requests: null,
        requestsLoading: false,
        model: null,
        charts: {},
        rendered: false,
        refreshTimer: null
    };

    // ─────────────────────────────────────────────────────────────
    // Formatting
    // ─────────────────────────────────────────────────────────────

    function esc(v) {
        if (v === null || v === undefined) return '';
        return String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
    const h2 = sec => (sec / 3600);
    const fmtH = sec => (sec === null || sec === undefined) ? 'N/A' : `${h2(sec).toFixed(2)} h`;
    const fmtPct = v => (v === null || v === undefined) ? 'N/A' : `${(v * 100).toFixed(1)}%`;
    const fmtNum = v => (v === null || v === undefined) ? 'N/A' : String(v);
    const fmtTime = ts => ts ? new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
    const fmtDate = s => {
        if (!s) return '—';
        const [y, m, d] = String(s).split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };
    const $ = id => document.getElementById(id);

    function notify(msg, type) {
        if (typeof window.toast === 'function') window.toast(msg, type || 'info');
        else console[type === 'error' ? 'error' : 'log']('[OneReport]', msg);
    }

    function loadScript(url) {
        loadScript.cache = loadScript.cache || {};
        if (!loadScript.cache[url]) {
            loadScript.cache[url] = new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = url;
                s.async = true;
                s.onload = resolve;
                s.onerror = () => { delete loadScript.cache[url]; reject(new Error('Could not load ' + url)); };
                document.head.appendChild(s);
            });
        }
        return loadScript.cache[url];
    }

    // ─────────────────────────────────────────────────────────────
    // Data
    // ─────────────────────────────────────────────────────────────

    function collectUsers() {
        const list = [];
        (Array.isArray(window.USERS) ? window.USERS : []).forEach(u => list.push(u));
        if (window.allUsersMap && typeof window.allUsersMap.values === 'function') {
            Array.from(window.allUsersMap.values()).forEach(u => u && u.email && list.push({ email: u.email, name: u.name, role: u.role || u.designation }));
        }
        return list;
    }

    function loadRequests() {
        if (state.requests || state.requestsLoading) return;
        const rtdb = window.rtdb;
        if (!window.db || !rtdb || typeof rtdb.onValue !== 'function') return;
        state.requestsLoading = true;
        try {
            rtdb.onValue(rtdb.ref(window.db, 'worksync/requests'), snap => {
                const val = snap.val() || {};
                state.requests = Object.values(val).filter(r => r && (r.type === 'leave' || r.type === 'saturday'));
                state.requestsLoading = false;
                refresh();
            }, err => {
                console.warn('[OneReport] Leave requests unavailable:', err && err.message);
                state.requestsLoading = false;
            }, { onlyOnce: true });
        } catch (e) {
            state.requestsLoading = false;
        }
    }

    function buildModel() {
        const E = window.OneReportEngine;
        if (!E || !window.currentUser) return null;
        const ctx = {
            users: collectUsers(),
            adminEmails: window.ADMIN_EMAILS || [],
            managerEmails: window.MANAGER_EMAILS || [],
            approvalChains: window.LEAVE_APPROVAL_CHAINS || {},
            tasks: Array.isArray(window.tasks) ? window.tasks : [],
            timeLogs: Array.isArray(window.allTimeLogs) ? window.allTimeLogs : [],
            attendanceEvents: Array.isArray(window.attendanceEvents) ? window.attendanceEvents : [],
            qcReports: Array.isArray(window.allQcReports) ? window.allQcReports : [],
            requests: state.requests
        };
        return E.build(ctx, {
            viewer: { email: window.currentUser.email, role: window.currentUser.role },
            period: state.period,
            filters: state.filters
        });
    }

    // ─────────────────────────────────────────────────────────────
    // Shell
    // ─────────────────────────────────────────────────────────────

    const selectCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10';
    const labelCls = 'block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1';

    function renderShell() {
        const panel = $(PANEL_ID);
        if (!panel) return false;
        const now = new Date();
        const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        if (!state.period.month) state.period.month = thisMonth;

        panel.innerHTML = `
        <div class="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <iconify-icon icon="solar:document-text-bold-duotone" width="28"></iconify-icon>
                    </div>
                    <div>
                        <h3 class="text-xl font-black text-slate-900 tracking-tight">One Report</h3>
                        <p class="text-xs text-slate-500" id="or-subtitle">Agency time, delivery, QC and attendance report</p>
                    </div>
                </div>
                <div class="flex flex-wrap gap-2">
                    <button onclick="OneReport.exportExcel()" id="or-btn-xlsx" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm">
                        <iconify-icon icon="vscode-icons:file-type-excel" width="18"></iconify-icon> Excel</button>
                    <button onclick="OneReport.exportPdf()" id="or-btn-pdf" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-rose-600 text-white hover:bg-rose-700 shadow-sm">
                        <iconify-icon icon="vscode-icons:file-type-pdf2" width="18"></iconify-icon> PDF</button>
                    <button onclick="OneReport.exportCsv()" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-slate-800 text-white hover:bg-slate-900 shadow-sm">
                        <iconify-icon icon="solar:file-text-linear" width="18"></iconify-icon> CSV</button>
                </div>
            </div>

            <div class="mt-5 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 items-end">
                <div>
                    <label class="${labelCls}" for="or-period">Period</label>
                    <select id="or-period" class="${selectCls}" onchange="OneReport.setPeriodMode(this.value)">
                        <option value="current_month">Current month</option>
                        <option value="prev_month">Previous month</option>
                        <option value="month">Month &amp; year</option>
                        <option value="custom">Custom range</option>
                    </select>
                </div>
                <div id="or-month-wrap" class="hidden">
                    <label class="${labelCls}" for="or-month">Month</label>
                    <input type="month" id="or-month" class="${selectCls}" value="${esc(state.period.month)}" onchange="OneReport.setPeriodValue('month', this.value)">
                </div>
                <div id="or-from-wrap" class="hidden">
                    <label class="${labelCls}" for="or-from">From</label>
                    <input type="date" id="or-from" class="${selectCls}" onchange="OneReport.setPeriodValue('from', this.value)">
                </div>
                <div id="or-to-wrap" class="hidden">
                    <label class="${labelCls}" for="or-to">To</label>
                    <input type="date" id="or-to" class="${selectCls}" onchange="OneReport.setPeriodValue('to', this.value)">
                </div>
                <div>
                    <label class="${labelCls}" for="or-employee">Employee</label>
                    <select id="or-employee" class="${selectCls}" onchange="OneReport.setFilter('employee', this.value)"></select>
                </div>
                <div>
                    <label class="${labelCls}" for="or-client">Client</label>
                    <select id="or-client" class="${selectCls}" onchange="OneReport.setFilter('client', this.value)"></select>
                </div>
                <div>
                    <label class="${labelCls}" for="or-category">Task category</label>
                    <select id="or-category" class="${selectCls}" onchange="OneReport.setFilter('category', this.value)"></select>
                </div>
                <div>
                    <label class="${labelCls}" for="or-source">Task source</label>
                    <select id="or-source" class="${selectCls}" onchange="OneReport.setFilter('source', this.value)">
                        <option value="all">Jira + Internal</option>
                        <option value="Jira">Jira</option>
                        <option value="Internal">Internal</option>
                    </select>
                </div>
                <div>
                    <button onclick="OneReport.resetFilters()" class="w-full px-3 py-2 rounded-xl text-sm font-bold border border-slate-200 text-slate-600 hover:bg-slate-50">
                        Reset filters</button>
                </div>
            </div>
            <div id="or-scope" class="mt-3 text-[11px] text-slate-500"></div>
        </div>

        <div id="or-kpis" class="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3"></div>
        <div id="or-notes"></div>

        <div class="bg-white rounded-3xl border border-slate-200/80 shadow-sm">
            <div class="flex gap-1 overflow-x-auto px-4 pt-4 border-b border-slate-100" id="or-tabs">
                ${TABS.map(([id, label]) => `<button data-tab="${id}" onclick="OneReport.switchTab('${id}')"
                    class="or-tab whitespace-nowrap px-4 py-2 text-sm font-semibold rounded-t-xl border-b-2 border-transparent text-slate-500 hover:text-indigo-600">${label}</button>`).join('')}
            </div>
            <div id="or-tab-body" class="p-5"></div>
        </div>`;
        state.rendered = true;
        syncPeriodInputs();
        return true;
    }

    function syncPeriodInputs() {
        const mode = state.period.mode;
        if ($('or-period')) $('or-period').value = mode;
        $('or-month-wrap') && $('or-month-wrap').classList.toggle('hidden', mode !== 'month');
        $('or-from-wrap') && $('or-from-wrap').classList.toggle('hidden', mode !== 'custom');
        $('or-to-wrap') && $('or-to-wrap').classList.toggle('hidden', mode !== 'custom');
        if ($('or-month')) $('or-month').value = state.period.month || '';
        if ($('or-from')) $('or-from').value = state.period.from || '';
        if ($('or-to')) $('or-to').value = state.period.to || '';
    }

    function fillSelect(id, allLabel, items, current) {
        const el = $(id);
        if (!el) return;
        el.innerHTML = (allLabel ? `<option value="all">${esc(allLabel)}</option>` : '') +
            items.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('');
        el.value = items.some(([v]) => v === current) ? current : 'all';
    }

    // ─────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────

    function refresh() {
        clearTimeout(state.refreshTimer);
        state.refreshTimer = setTimeout(render, 150);
    }

    function render() {
        if (!$(PANEL_ID)) return;
        if (!state.rendered || !$('or-kpis')) renderShell();
        loadRequests();
        const m = buildModel();
        state.model = m;
        if (!m) {
            $('or-tab-body').innerHTML = '<p class="text-sm text-slate-400 p-8 text-center">Sign in to view reports.</p>';
            return;
        }
        // The engine may have dropped an out-of-scope employee filter.
        state.filters.employee = m.filters.employee;

        const empOptions = m.options.employees.map(e => [e.email, e.name]);
        fillSelect('or-employee', m.scope.level === 'employee' ? null : 'All employees', empOptions, m.filters.employee);
        if (m.scope.level === 'employee' && $('or-employee')) $('or-employee').disabled = true;
        fillSelect('or-client', 'All clients', m.options.clients.map(c => [c, c]), m.filters.client);
        fillSelect('or-category', 'All categories', m.options.categories.map(c => [c, c]), m.filters.category);
        if ($('or-source')) $('or-source').value = m.filters.source;

        const scopeText = {
            admin: 'Admin access – all employees',
            manager: 'Manager access – all team members',
            lead: 'Team lead access – you and your direct reports',
            employee: 'Employee access – your own report only'
        }[m.scope.level] || '';
        $('or-subtitle').textContent = `${m.period.label} · ${fmtDate(m.period.fromStr)} – ${fmtDate(m.period.toStr)}`;
        $('or-scope').innerHTML = `<iconify-icon icon="solar:shield-user-linear" class="align-middle"></iconify-icon> ${esc(scopeText)}`;

        renderKpis(m);
        renderNotes(m);
        renderTab();
    }

    function kpiCard(label, value, sub, icon, color) {
        return `<div class="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
            <div class="flex items-center justify-between">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">${esc(label)}</span>
                <iconify-icon icon="${icon}" width="18" class="${color}"></iconify-icon>
            </div>
            <div class="mt-2 text-xl font-black text-slate-900">${esc(value)}</div>
            ${sub ? `<div class="text-[11px] text-slate-400 mt-0.5">${esc(sub)}</div>` : ''}
        </div>`;
    }

    function renderKpis(m) {
        const k = m.kpis;
        const qcSub = k.qcPassRate === null ? 'No QC reviews' : `${fmtPct(k.qcPassRate)} pass rate`;
        $('or-kpis').innerHTML = [
            kpiCard('Total logged', fmtH(k.totalSec), `${k.timeEntries} sessions`, 'solar:clock-circle-bold-duotone', 'text-indigo-500'),
            kpiCard('Client delivery', fmtH(k.clientSec), fmtPct(k.totalSec ? k.clientSec / k.totalSec : null) + ' of total', 'solar:case-round-bold-duotone', 'text-sky-500'),
            kpiCard('Internal', fmtH(k.internalSec), null, 'solar:home-2-bold-duotone', 'text-slate-500'),
            kpiCard('Business dev.', fmtH(k.bdSec), null, 'solar:graph-up-bold-duotone', 'text-emerald-500'),
            kpiCard('Team capacity', fmtH(k.capacitySec), m.period.inProgress ? `to ${fmtDate(m.period.capacityToStr)}` : `${m.settings.hoursPerDay}h / working day`, 'solar:users-group-rounded-bold-duotone', 'text-violet-500'),
            kpiCard('Utilization', fmtPct(k.utilization), 'logged ÷ capacity', 'solar:chart-2-bold-duotone', 'text-amber-500'),
            kpiCard('Employees', fmtNum(k.employeeCount), null, 'solar:user-id-bold-duotone', 'text-indigo-500'),
            kpiCard('Active clients', fmtNum(k.activeClients), null, 'solar:buildings-2-bold-duotone', 'text-sky-500'),
            kpiCard('Time entries', fmtNum(k.timeEntries), k.aggregateEntries ? `+${k.aggregateEntries} historical aggregate` : null, 'solar:list-check-bold-duotone', 'text-slate-500'),
            kpiCard('Assigned tasks', fmtNum(k.assigned), null, 'solar:clipboard-list-bold-duotone', 'text-violet-500'),
            kpiCard('Completed', fmtNum(k.completed), null, 'solar:check-circle-bold-duotone', 'text-emerald-500'),
            kpiCard('Pending', fmtNum(k.pending), null, 'solar:hourglass-bold-duotone', 'text-amber-500'),
            kpiCard('QC pass / fail', k.qcPassed === null ? 'N/A' : `${k.qcPassed} / ${k.qcFailed}`, qcSub, 'solar:shield-check-bold-duotone', 'text-emerald-500'),
            kpiCard('Rework count', fmtNum(k.reworkCount), 'QC rejections', 'solar:restart-bold-duotone', 'text-rose-500')
        ].join('');
    }

    function renderNotes(m) {
        $('or-notes').innerHTML = m.notes.length ? `<div class="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-800 space-y-0.5">
            ${m.notes.map(n => `<div>• ${esc(n)}</div>`).join('')}</div>` : '';
    }

    function table(headers, rows, opts) {
        opts = opts || {};
        if (!rows.length) return `<div class="p-10 text-center text-sm text-slate-400">${esc(opts.empty || 'No data for the selected filters.')}</div>`;
        const th = headers.map((h, i) => `<th class="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 ${opts.right && opts.right.includes(i) ? 'text-right' : 'text-left'} whitespace-nowrap">${esc(h)}</th>`).join('');
        const body = rows.map(r => `<tr class="border-t border-slate-100 hover:bg-slate-50/60">${r.map((c, i) =>
            `<td class="px-3 py-2 text-[13px] text-slate-700 ${opts.right && opts.right.includes(i) ? 'text-right tabular-nums' : ''}">${c}</td>`).join('')}</tr>`).join('');
        const foot = opts.foot ? `<tfoot><tr class="border-t-2 border-slate-200 bg-slate-50 font-bold">${opts.foot.map((c, i) =>
            `<td class="px-3 py-2 text-[13px] text-slate-900 ${opts.right && opts.right.includes(i) ? 'text-right tabular-nums' : ''}">${c}</td>`).join('')}</tr></tfoot>` : '';
        return `<div class="overflow-x-auto rounded-2xl border border-slate-100"><table class="w-full"><thead class="bg-slate-50"><tr>${th}</tr></thead><tbody>${body}</tbody>${foot}</table></div>`;
    }

    function switchTab(tab) {
        state.tab = tab;
        renderTab();
    }

    function renderTab() {
        const m = state.model;
        if (!m) return;
        document.querySelectorAll('#or-tabs .or-tab').forEach(b => {
            const on = b.dataset.tab === state.tab;
            b.classList.toggle('text-indigo-600', on);
            b.classList.toggle('border-indigo-600', on);
            b.classList.toggle('text-slate-500', !on);
        });
        destroyCharts();
        const body = $('or-tab-body');
        const r = {
            overview: renderOverview,
            team: renderTeam,
            clients: renderClients,
            matrix: renderMatrix,
            breakdown: renderBreakdown,
            timelog: renderTimeLog,
            performance: renderPerformance,
            qc: renderQc,
            shoots: renderShoots,
            attendance: renderAttendance
        }[state.tab] || renderOverview;
        body.innerHTML = r(m);
        if (state.tab === 'overview') drawCharts(m);
    }

    function renderTeam(m) {
        const t = m.team;
        const tot = t.reduce((a, r) => ({ av: a.av + r.availableSec, lg: a.lg + r.loggedSec, cl: a.cl + r.clientSec, in: a.in + r.internalSec, bd: a.bd + r.bdSec, lv: a.lv === null || r.leaveDays === null ? null : a.lv + r.leaveDays }), { av: 0, lg: 0, cl: 0, in: 0, bd: 0, lv: 0 });
        return table(['Employee', 'Available', 'Logged', 'Client', 'Internal', 'Business dev.', 'Leave days', 'Utilization'],
            t.map(r => [`<div class="font-semibold text-slate-900">${esc(r.employee)}</div><div class="text-[11px] text-slate-400">${esc(r.role)}</div>`,
                fmtH(r.availableSec), fmtH(r.loggedSec), fmtH(r.clientSec), fmtH(r.internalSec), fmtH(r.bdSec), fmtNum(r.leaveDays), utilBadge(r.utilization)]),
            { right: [1, 2, 3, 4, 5, 6, 7], foot: ['Total', fmtH(tot.av), fmtH(tot.lg), fmtH(tot.cl), fmtH(tot.in), fmtH(tot.bd), fmtNum(tot.lv), fmtPct(tot.av > 0 ? tot.lg / tot.av : null)] });
    }

    function utilBadge(u) {
        if (u === null) return '<span class="text-slate-400">N/A</span>';
        const c = u >= 0.85 ? 'bg-emerald-50 text-emerald-700' : u >= 0.6 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700';
        return `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold ${c}">${fmtPct(u)}</span>`;
    }

    function renderClients(m) {
        return table(['Client', 'Total hours', '% of team hours', 'Employees', 'Top task category'],
            m.clients.map(c => [esc(c.client), fmtH(c.seconds), fmtPct(c.share), c.employeeCount, esc(c.topCategory)]),
            { right: [1, 2, 3], foot: ['Total', fmtH(m.kpis.totalSec), m.kpis.totalSec ? '100.0%' : 'N/A', '', ''] });
    }

    function renderMatrix(m) {
        const cols = m.matrix.clients;
        const colTot = cols.map(c => m.matrix.rows.reduce((s, r) => s + r.cells[c], 0));
        const cell = s => s ? h2(s).toFixed(2) : '<span class="text-slate-300">–</span>';
        return table(['Employee', ...cols, 'Total'],
            m.matrix.rows.map(r => [esc(r.employee), ...cols.map(c => cell(r.cells[c])), `<b>${h2(r.total).toFixed(2)}</b>`]),
            { right: cols.map((_, i) => i + 1).concat([cols.length + 1]), foot: ['Total', ...colTot.map(s => h2(s).toFixed(2)), h2(m.kpis.totalSec).toFixed(2)], empty: 'No time logged for the selected filters.' }) +
            '<p class="text-[11px] text-slate-400 mt-2">Values in hours.</p>';
    }

    function renderBreakdown(m) {
        const cats = Object.entries(m.categoryTotals).sort((a, b) => b[1] - a[1]);
        const summary = cats.length ? `<div class="flex flex-wrap gap-2 mb-4">${cats.map(([c, s]) =>
            `<span class="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">${esc(c)} · ${fmtH(s)} · ${fmtPct(m.kpis.totalSec ? s / m.kpis.totalSec : null)}</span>`).join('')}</div>` : '';
        return summary + table(['Task category', 'Employee', 'Client', 'Total hours', '% of total'],
            m.taskBreakdown.map(r => [esc(r.category), esc(r.employee), esc(r.client), fmtH(r.seconds), fmtPct(r.share)]),
            { right: [3, 4], foot: ['Total', '', '', fmtH(m.kpis.totalSec), m.kpis.totalSec ? '100.0%' : 'N/A'] });
    }

    function renderTimeLog(m) {
        const rows = m.entries.slice(0, state.logLimit);
        const more = m.entries.length > rows.length
            ? `<div class="text-center mt-3"><button onclick="OneReport.showMoreLogs()" class="px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 hover:bg-slate-50">Show more (${rows.length} of ${m.entries.length})</button></div>` : '';
        return table(['Date', 'Employee', 'Client', 'Task ID', 'Source', 'Category', 'Description', 'Start', 'End', 'Duration', 'Remarks'],
            rows.map(l => [fmtDate(l.date), esc(l.employee), esc(l.client), `<span class="font-mono text-xs">${esc(l.taskId)}</span>`,
                `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${l.source === 'Jira' ? 'bg-sky-50 text-sky-700' : 'bg-violet-50 text-violet-700'}">${l.source}</span>`,
                esc(l.category), `<div class="max-w-[280px] truncate" title="${esc(l.description)}">${esc(l.description)}</div>`,
                fmtTime(l.start), fmtTime(l.end), fmtH(l.seconds),
                l.remarks ? `<span class="text-[11px] ${l.entryType === 'Session' ? 'text-amber-600' : 'text-slate-500 italic'}">${esc(l.remarks)}</span>` : '']),
            { right: [9], foot: ['Total', '', '', '', '', '', `${m.entries.length} entries`, '', '', fmtH(m.kpis.totalSec), ''] }) + more;
    }

    function renderPerformance(m) {
        const t = m.performanceTotals;
        return table(['Employee', 'Assigned', 'Completed', 'Pending', 'In progress', 'Overdue', 'Rework'],
            m.performance.map(r => [esc(r.employee), r.assigned, r.completed, r.pending, r.inProgress, r.overdue, r.rework]),
            { right: [1, 2, 3, 4, 5, 6], foot: ['Total', t.assigned, t.completed, t.pending, t.inProgress, t.overdue, t.rework] }) +
            '<p class="text-[11px] text-slate-400 mt-2">Completed = finished in this period. Pending = open at the end of the period. Overdue = open and past due date.</p>';
    }

    function renderQc(m) {
        const q = m.qc;
        const head = `<div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            ${[['Reviews', q.reviews], ['Passed', q.passed], ['Failed', q.failed], ['Pass rate', fmtPct(q.passRate)], ['QC time', fmtH(q.qcSeconds)]]
                .map(([l, v]) => `<div class="rounded-2xl bg-slate-50 p-3"><div class="text-[10px] font-bold uppercase text-slate-400">${l}</div><div class="text-lg font-black text-slate-900">${esc(v)}</div></div>`).join('')}</div>`;
        return head + table(['Content writer / creator', 'QC reviewer', 'Submission ID', 'Client', 'Date', 'Review status', 'Pass/fail', 'Failure reason', 'Rework rounds', 'QC time'],
            q.rows.map(r => [esc(r.creator), esc(r.reviewer), `<span class="font-mono text-xs">${esc(r.submissionId)}</span>`, esc(r.client), fmtDate(r.date), esc(r.reviewStatus),
                r.result === 'Pass' ? '<span class="text-emerald-600 font-bold">Pass</span>' : r.result === 'Fail' ? '<span class="text-rose-600 font-bold">Fail</span>' : 'N/A',
                `<div class="max-w-[260px] text-[12px]">${esc(r.failureReason)}</div>`, r.reworkRounds, fmtH(r.qcSeconds)]),
            { right: [8, 9], empty: 'No QC reviews recorded in this period.' });
    }

    function renderShoots(m) {
        return table(['Shoot ID', 'Title', 'Client', 'Shoot date', 'Assigned', 'Shoot duration', 'Production hours', 'Editing hours', 'Status'],
            m.shoots.rows.map(r => [`<span class="font-mono text-xs">${esc(r.shootId)}</span>`, esc(r.title), esc(r.client), fmtDate(r.date), esc(r.assignees),
                fmtH(r.shootSeconds), fmtH(r.productionSeconds), 'N/A', esc(r.status)]),
            { right: [5, 6, 7], empty: 'No shoots scheduled in this period.' }) +
            '<p class="text-[11px] text-slate-400 mt-2">Shoot duration counts overlapping crew time once. Production hours = total person-hours logged on the shoot. Editing hours are N/A because edit tasks are not linked to shoots in the data.</p>';
    }

    function renderAttendance(m) {
        const a = m.attendance;
        if (!a.hasData) return '<div class="p-10 text-center text-sm text-slate-400">No attendance check-ins recorded for this period.</div>';
        return table(['Employee', 'Working days', 'Present days', 'Leave days', 'Late arrivals', 'Break duration', 'Working hours', 'Missing check-outs'],
            a.rows.map(r => [esc(r.employee), r.workingDays, r.presentDays, fmtNum(r.leaveDays), r.lateArrivals, fmtH(r.breakSec), fmtH(r.workSec), r.missingCheckout || '–']),
            { right: [1, 2, 3, 4, 5, 6, 7] }) +
            `<p class="text-[11px] text-slate-400 mt-2">Late = first check-in after 9:45 AM. Working hours = first check-in to last check-out minus breaks; days with a missing check-out are not counted. Client, category and source filters do not apply to attendance.</p>`;
    }

    // ─────────────────────────────────────────────────────────────
    // Charts
    // ─────────────────────────────────────────────────────────────

    const CHARTS = [
        ['employee', 'Employee-wise hours'],
        ['client', 'Client-wise allocation'],
        ['category', 'Task-category distribution'],
        ['utilization', 'Utilization by employee'],
        ['tasks', 'Completed vs pending tasks'],
        ['qc', 'QC pass / fail'],
        ['shoot', 'Shoot vs editing time'],
        ['attendance', 'Attendance summary']
    ];

    function renderOverview() {
        return `<div class="grid grid-cols-1 lg:grid-cols-2 gap-5">${CHARTS.map(([id, title]) => `
            <div class="rounded-2xl border border-slate-100 p-4">
                <h4 class="text-sm font-bold text-slate-800 mb-3">${title}</h4>
                <div class="relative h-64"><canvas id="or-chart-${id}"></canvas></div>
                <p id="or-chart-${id}-empty" class="hidden text-xs text-slate-400 text-center -mt-36 mb-32">No data</p>
            </div>`).join('')}</div>`;
    }

    function destroyCharts() {
        Object.values(state.charts).forEach(c => { try { c.destroy(); } catch (e) { /* ignore */ } });
        state.charts = {};
    }

    function chartConfigs(m) {
        const hrs = s => +h2(s).toFixed(2);
        const team = m.team.filter(r => r.loggedSec > 0 || r.availableSec > 0);
        const topClients = m.clients.slice(0, 10);
        const cats = Object.entries(m.categoryTotals).sort((a, b) => b[1] - a[1]);
        const k = m.kpis;
        const shootSec = m.categoryTotals['Shoot'] || 0;
        const editSec = m.categoryTotals['Video Editing'] || 0;
        const att = m.attendance.rows;
        const base = { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { labels: { boxWidth: 12, font: { size: 11 } } } } };
        const noLegend = Object.assign({}, base, { plugins: { legend: { display: false } } });
        return {
            employee: team.some(r => r.loggedSec) && {
                type: 'bar',
                data: { labels: team.map(r => r.employee), datasets: [
                    { label: 'Client', data: team.map(r => hrs(r.clientSec)), backgroundColor: '#4F46E5' },
                    { label: 'Internal', data: team.map(r => hrs(r.internalSec)), backgroundColor: '#94A3B8' },
                    { label: 'Business dev.', data: team.map(r => hrs(r.bdSec)), backgroundColor: '#10B981' }] },
                options: Object.assign({}, base, { scales: { x: { stacked: true }, y: { stacked: true, title: { display: true, text: 'Hours' } } } })
            },
            client: topClients.length && {
                type: 'doughnut',
                data: { labels: topClients.map(c => c.client), datasets: [{ data: topClients.map(c => hrs(c.seconds)), backgroundColor: CHART_COLORS }] },
                options: Object.assign({}, base, { plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10 } } } } })
            },
            category: cats.length && {
                type: 'bar',
                data: { labels: cats.map(c => c[0]), datasets: [{ label: 'Hours', data: cats.map(c => hrs(c[1])), backgroundColor: '#0EA5E9' }] },
                options: Object.assign({}, noLegend, { indexAxis: 'y' })
            },
            utilization: team.some(r => r.utilization !== null) && {
                type: 'bar',
                data: { labels: team.map(r => r.employee), datasets: [{ label: 'Utilization %', data: team.map(r => r.utilization === null ? null : +(r.utilization * 100).toFixed(1)), backgroundColor: team.map(r => r.utilization === null ? '#CBD5E1' : r.utilization >= 0.85 ? '#10B981' : r.utilization >= 0.6 ? '#F59E0B' : '#EF4444') }] },
                options: Object.assign({}, noLegend, { scales: { y: { beginAtZero: true, suggestedMax: 100, title: { display: true, text: '%' } } } })
            },
            tasks: (k.completed + k.pending) > 0 && {
                type: 'doughnut',
                data: { labels: ['Completed', 'Pending'], datasets: [{ data: [k.completed, k.pending], backgroundColor: ['#10B981', '#F59E0B'] }] },
                options: base
            },
            qc: m.qc.reviews > 0 && {
                type: 'doughnut',
                data: { labels: ['Pass', 'Fail'], datasets: [{ data: [m.qc.passed, m.qc.failed], backgroundColor: ['#10B981', '#EF4444'] }] },
                options: base
            },
            shoot: (shootSec + editSec) > 0 && {
                type: 'bar',
                data: { labels: ['Shoot', 'Video editing'], datasets: [{ label: 'Hours', data: [hrs(shootSec), hrs(editSec)], backgroundColor: ['#8B5CF6', '#EC4899'] }] },
                options: noLegend
            },
            attendance: m.attendance.hasData && {
                type: 'bar',
                data: { labels: att.map(r => r.employee), datasets: [
                    { label: 'Present', data: att.map(r => r.presentDays), backgroundColor: '#10B981' },
                    { label: 'Leave', data: att.map(r => r.leaveDays || 0), backgroundColor: '#F59E0B' },
                    { label: 'Late', data: att.map(r => r.lateArrivals), backgroundColor: '#EF4444' }] },
                options: Object.assign({}, base, { scales: { y: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: 'Days' } } } })
            }
        };
    }

    function drawCharts(m) {
        if (typeof window.Chart !== 'function') return;
        const cfgs = chartConfigs(m);
        CHARTS.forEach(([id]) => {
            const canvas = $(`or-chart-${id}`);
            const empty = $(`or-chart-${id}-empty`);
            if (!canvas) return;
            if (!cfgs[id]) { empty && empty.classList.remove('hidden'); return; }
            state.charts[id] = new window.Chart(canvas.getContext('2d'), cfgs[id]);
        });
    }

    // Renders charts on an off-screen canvas for the PDF, independent of the active tab.
    function chartImages(m) {
        if (typeof window.Chart !== 'function') return {};
        const cfgs = chartConfigs(m);
        const out = {};
        // Larger text so labels stay readable when the chart is scaled down on the page.
        const prevFont = window.Chart.defaults.font.size;
        window.Chart.defaults.font.size = 16;
        const holder = document.createElement('div');
        holder.style.cssText = 'position:fixed;left:-10000px;top:0;width:800px;height:400px;';
        document.body.appendChild(holder);
        CHARTS.forEach(([id]) => {
            if (!cfgs[id]) return;
            const canvas = document.createElement('canvas');
            canvas.width = 800; canvas.height = 400;
            holder.appendChild(canvas);
            const cfg = JSON.parse(JSON.stringify(cfgs[id]).replace(/"size":1[01]/g, '"size":15'));
            cfg.options = Object.assign({}, cfg.options, { responsive: false, animation: false, devicePixelRatio: 1.5 });
            const ch = new window.Chart(canvas.getContext('2d'), cfg);
            // White background so the image is not transparent in the PDF
            const ctx = canvas.getContext('2d');
            ctx.save(); ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.restore();
            out[id] = canvas.toDataURL('image/jpeg', 0.92); // JPEG keeps the PDF small
            ch.destroy();
        });
        holder.remove();
        window.Chart.defaults.font.size = prevFont;
        return out;
    }

    // ─────────────────────────────────────────────────────────────
    // Shared export helpers
    // ─────────────────────────────────────────────────────────────

    function fileBase(m) {
        const p = m.period;
        const label = p.isFullMonth ? p.label.replace(/\s+/g, '_') : `${p.fromStr}_to_${p.toStr}`;
        return `VilPower_One_Report_${label}`;
    }

    function filterSummary(m) {
        const f = m.filters;
        const emp = f.employee === 'all' ? 'All employees' : ((m.options.employees.find(e => e.email === f.employee) || {}).name || f.employee);
        return [
            ['Period', `${m.period.label} (${fmtDate(m.period.fromStr)} – ${fmtDate(m.period.toStr)})`],
            ['Employee', emp],
            ['Client', f.client === 'all' ? 'All clients' : f.client],
            ['Task category', f.category === 'all' ? 'All categories' : f.category],
            ['Task source', f.source === 'all' ? 'Jira + Internal' : f.source]
        ];
    }

    function download(blob, name) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    }

    // Excel stores dates without a time zone; shift so local times appear unchanged.
    function xlDate(ts) {
        if (!ts) return null;
        const d = new Date(ts);
        return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()));
    }
    function xlDay(dateStr) {
        const [y, mo, d] = String(dateStr).split('-').map(Number);
        return new Date(Date.UTC(y, mo - 1, d));
    }

    function setBusy(id, busy, label) {
        const b = $(id);
        if (!b) return;
        b.disabled = busy;
        b.style.opacity = busy ? '0.6' : '';
        if (busy) { b.dataset.label = b.innerHTML; b.innerHTML = label; } else if (b.dataset.label) b.innerHTML = b.dataset.label;
    }

    // ─────────────────────────────────────────────────────────────
    // CSV
    // ─────────────────────────────────────────────────────────────

    function exportCsv() {
        const m = state.model || buildModel();
        if (!m) return;
        const q = v => {
            let s = v === null || v === undefined ? '' : String(v);
            // Text such as "=cmd" would run as a formula when the CSV is opened in Excel.
            if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
            return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const head = ['Date', 'Employee', 'Employee Email', 'Client', 'Task ID', 'Task Source', 'Task Category', 'Work Type', 'Task Description', 'Start Time', 'End Time', 'Duration (h)', 'Duration (hh:mm)', 'Entry Type', 'Remarks'];
        const hm = s => `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`;
        const lines = [head.map(q).join(',')].concat(m.entries.map(l => [
            l.date, l.employee, l.email, l.client, l.taskId, l.source, l.category, l.workType, l.description,
            l.start ? fmtTime(l.start) : '', l.end ? fmtTime(l.end) : '', h2(l.seconds).toFixed(2), hm(l.seconds), l.entryType, l.remarks
        ].map(q).join(',')));
        lines.push(['TOTAL', '', '', '', '', '', '', '', '', '', '', h2(m.kpis.totalSec).toFixed(2), hm(m.kpis.totalSec), '', ''].map(q).join(','));
        download(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), `${fileBase(m)}_Time_Log.csv`);
        notify(`CSV exported (${m.entries.length} entries)`, 'success');
    }

    // ─────────────────────────────────────────────────────────────
    // Excel
    // ─────────────────────────────────────────────────────────────

    async function exportExcel() {
        const m = state.model || buildModel();
        if (!m) return;
        setBusy('or-btn-xlsx', true, 'Building…');
        try {
            await loadScript(LIBS.exceljs);
            const wb = buildWorkbook(m, window.ExcelJS);
            const buf = await wb.xlsx.writeBuffer();
            download(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${fileBase(m)}.xlsx`);
            notify('Excel report downloaded', 'success');
        } catch (e) {
            console.error('[OneReport] Excel export failed', e);
            notify('Excel export failed: ' + e.message, 'error');
        } finally {
            setBusy('or-btn-xlsx', false);
        }
    }

    function buildWorkbook(m, ExcelJS) {
        const wb = new ExcelJS.Workbook();
        wb.creator = `${BRAND.product} – ${BRAND.name}`;
        wb.created = new Date();
        // Excel recalculates on open, so the formulas stay authoritative if the file is edited.
        wb.calcProperties.fullCalcOnLoad = true;

        const FMT_H = '#,##0.00';
        const FMT_PCT = '0.0%';
        const thin = { style: 'thin', color: { argb: 'FFE2E8F0' } };
        const border = { top: thin, left: thin, bottom: thin, right: thin };

        const title = (ws, text, sub, span) => {
            ws.mergeCells(1, 1, 1, span);
            const c = ws.getCell(1, 1);
            c.value = text;
            c.font = { bold: true, size: 15, color: { argb: 'FFFFFFFF' } };
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND.primaryDark } };
            c.alignment = { vertical: 'middle', indent: 1 };
            ws.getRow(1).height = 28;
            ws.mergeCells(2, 1, 2, span);
            const s = ws.getCell(2, 1);
            s.value = sub;
            s.font = { italic: true, size: 10, color: { argb: 'FF475569' } };
            s.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND.light } };
            s.alignment = { indent: 1 };
        };
        const header = (ws, rowIdx, labels, widths) => {
            const row = ws.getRow(rowIdx);
            labels.forEach((l, i) => {
                const c = row.getCell(i + 1);
                c.value = l;
                c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
                c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND.primary } };
                c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                c.border = border;
            });
            row.height = 22;
            (widths || []).forEach((w, i) => { ws.getColumn(i + 1).width = w; });
            ws.views = [{ state: 'frozen', ySplit: rowIdx }];
        };
        const styleBody = (ws, from, to, cols) => {
            for (let r = from; r <= to; r++) {
                for (let c = 1; c <= cols; c++) {
                    const cell = ws.getCell(r, c);
                    cell.border = border;
                    if ((r - from) % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
                }
            }
        };
        const totalRow = (ws, r, cols) => {
            for (let c = 1; c <= cols; c++) {
                const cell = ws.getCell(r, c);
                cell.font = { bold: true };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };
                cell.border = { top: { style: 'medium', color: { argb: 'FF' + BRAND.primary } }, bottom: thin, left: thin, right: thin };
            }
        };
        const f = (formula, result) => ({ formula, result });
        const subtitle = `${BRAND.name} · ${m.period.label} · ${fmtDate(m.period.fromStr)} – ${fmtDate(m.period.toStr)} · Generated ${new Date(m.generatedAt).toLocaleString('en-GB')}`;
        const hrs = s => s / 3600;

        // Sheet order matches the familiar workbook; content is filled after the data sheets exist.
        const wsOverview = wb.addWorksheet('Report Overview', { properties: { tabColor: { argb: 'FF' + BRAND.primary } } });
        const wsHow = wb.addWorksheet('How to Use');
        const wsSetup = wb.addWorksheet('Setup');
        const wsLog = wb.addWorksheet('Time Log');
        const wsTeam = wb.addWorksheet('Team Summary');
        const wsClient = wb.addWorksheet('Client Summary');
        const wsMatrix = wb.addWorksheet('Member x Client');
        const wsBreak = wb.addWorksheet('Task Breakdown');
        const wsAtt = wb.addWorksheet('Attendance');
        const wsPerf = wb.addWorksheet('Task Performance');
        const wsQc = wb.addWorksheet('QC Report');
        const wsShoot = wb.addWorksheet('Shoot Report');

        // ── Setup
        title(wsSetup, 'Report Setup', subtitle, 7);
        const setupRows = [
            ['Period start', xlDay(m.period.fromStr)],
            ['Period end', xlDay(m.period.toStr)],
            ['Capacity counted through', m.period.capacityToStr ? xlDay(m.period.capacityToStr) : 'N/A'],
            ['Standard hours per working day', m.settings.hoursPerDay],
            ['Working week', 'Monday – Saturday'],
            ['Late arrival after', '9:45 AM']
        ];
        setupRows.forEach((r, i) => {
            const row = wsSetup.getRow(4 + i);
            row.getCell(1).value = r[0];
            row.getCell(1).font = { bold: true };
            row.getCell(2).value = r[1];
            if (r[1] instanceof Date) row.getCell(2).numFmt = 'dd-mmm-yyyy';
        });
        wsSetup.getCell('B7').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
        wsSetup.getCell('C7').value = '← change to recalculate available hours';
        wsSetup.getCell('C7').font = { italic: true, color: { argb: 'FF92400E' }, size: 9 };
        const HPD = "Setup!$B$7";
        const empHeaderRow = 12;
        wsSetup.getCell(empHeaderRow - 1, 1).value = 'Employees & capacity';
        wsSetup.getCell(empHeaderRow - 1, 1).font = { bold: true, size: 12, color: { argb: 'FF' + BRAND.primaryDark } };
        header(wsSetup, empHeaderRow, ['Employee', 'Email', 'Role', 'Working days', 'Leave days', 'Available days', 'Available hours'], [26, 32, 34, 14, 12, 15, 16]);
        wsSetup.views = [];
        const setupRowOf = {};
        m.team.forEach((r, i) => {
            const rr = empHeaderRow + 1 + i;
            setupRowOf[r.email] = rr;
            const row = wsSetup.getRow(rr);
            row.getCell(1).value = r.employee;
            row.getCell(2).value = r.email;
            row.getCell(3).value = r.role;
            row.getCell(4).value = r.workingDays;
            row.getCell(5).value = r.leaveDays === null ? 'N/A' : r.leaveDays;
            const availDays = r.workingDays - (r.leaveDays || 0);
            row.getCell(6).value = f(`D${rr}-IF(ISNUMBER(E${rr}),E${rr},0)`, availDays);
            row.getCell(7).value = f(`F${rr}*${HPD}`, hrs(r.availableSec));
            row.getCell(7).numFmt = FMT_H;
        });
        styleBody(wsSetup, empHeaderRow + 1, empHeaderRow + Math.max(1, m.team.length), 7);

        // ── Time Log (source data for the summary formulas)
        title(wsLog, 'Detailed Time Log', subtitle, 14);
        const LOG_HEAD = 4;
        header(wsLog, LOG_HEAD, ['Date', 'Employee', 'Employee Email', 'Client', 'Task ID', 'Task Source', 'Task Category', 'Work Type', 'Task Description', 'Start Time', 'End Time', 'Duration (h)', 'Entry Type', 'Remarks'],
            [13, 22, 28, 24, 16, 12, 22, 20, 48, 11, 11, 13, 28, 40]);
        m.entries.forEach((l, i) => {
            const row = wsLog.getRow(LOG_HEAD + 1 + i);
            row.values = [xlDay(l.date), l.employee, l.email, l.client, l.taskId, l.source, l.category, l.workType, l.description,
                l.start ? xlDate(l.start) : '', l.end ? xlDate(l.end) : '', hrs(l.seconds), l.entryType, l.remarks];
            row.getCell(1).numFmt = 'dd-mmm-yyyy';
            row.getCell(10).numFmt = 'hh:mm AM/PM';
            row.getCell(11).numFmt = 'hh:mm AM/PM';
            row.getCell(12).numFmt = FMT_H;
            if (l.entryType !== 'Session') row.getCell(13).font = { italic: true, color: { argb: 'FF64748B' } };
        });
        const logFirst = LOG_HEAD + 1;
        const logLast = LOG_HEAD + Math.max(1, m.entries.length);
        styleBody(wsLog, logFirst, logLast, 14);
        if (m.entries.length) wsLog.autoFilter = { from: { row: LOG_HEAD, column: 1 }, to: { row: logLast, column: 14 } };
        const logTotalRow = logLast + 1;
        wsLog.getCell(logTotalRow, 1).value = 'TOTAL';
        wsLog.getCell(logTotalRow, 12).value = f(`SUBTOTAL(9,L${logFirst}:L${logLast})`, hrs(m.kpis.totalSec));
        wsLog.getCell(logTotalRow, 12).numFmt = FMT_H;
        totalRow(wsLog, logTotalRow, 14);

        const R = col => `'Time Log'!$${col}$${logFirst}:$${col}$${logLast}`;
        const HOURS = R('L'), EMAIL = R('C'), CLIENT = R('D'), CAT = R('G'), WTYPE = R('H');
        // Client names are free text: SUMIFS would read * ? ~ < > = in them as wildcards/operators,
        // so client lookups use SUMPRODUCT with a plain (exact, case-insensitive) comparison.
        const sumWhere = (...conds) => `SUMPRODUCT(${conds.map(([range, ref]) => `(${range}=${ref})`).join('*')}*${HOURS})`;

        // ── Team Summary
        title(wsTeam, 'Team Summary', subtitle, 10);
        const T_HEAD = 4;
        header(wsTeam, T_HEAD, ['Employee', 'Email', 'Available Hours', 'Logged Hours', 'Client Hours', 'Internal Hours', 'Business Dev. Hours', 'Leave Days', 'Utilization', 'Sessions'],
            [24, 30, 15, 14, 14, 14, 18, 12, 13, 11]);
        m.team.forEach((r, i) => {
            const rr = T_HEAD + 1 + i;
            const sr = setupRowOf[r.email];
            const row = wsTeam.getRow(rr);
            row.getCell(1).value = r.employee;
            row.getCell(2).value = r.email;
            row.getCell(3).value = f(`Setup!G${sr}`, hrs(r.availableSec));
            row.getCell(4).value = f(`SUMIFS(${HOURS},${EMAIL},B${rr})`, hrs(r.loggedSec));
            row.getCell(5).value = f(`SUMIFS(${HOURS},${EMAIL},B${rr},${WTYPE},"Client")`, hrs(r.clientSec));
            row.getCell(6).value = f(`SUMIFS(${HOURS},${EMAIL},B${rr},${WTYPE},"Internal")`, hrs(r.internalSec));
            row.getCell(7).value = f(`SUMIFS(${HOURS},${EMAIL},B${rr},${WTYPE},"Business Development")`, hrs(r.bdSec));
            row.getCell(8).value = f(`Setup!E${sr}`, r.leaveDays === null ? 'N/A' : r.leaveDays);
            row.getCell(9).value = f(`IF(IF(ISNUMBER(C${rr}),C${rr},0)=0,"N/A",D${rr}/C${rr})`, r.utilization === null ? 'N/A' : r.utilization);
            row.getCell(10).value = r.entries;
            [3, 4, 5, 6, 7].forEach(c => { row.getCell(c).numFmt = FMT_H; });
            row.getCell(9).numFmt = FMT_PCT;
        });
        const tFirst = T_HEAD + 1, tLast = T_HEAD + Math.max(1, m.team.length), tTot = tLast + 1;
        styleBody(wsTeam, tFirst, tLast, 10);
        const teamTot = m.team.reduce((a, r) => ({ av: a.av + r.availableSec, lg: a.lg + r.loggedSec, cl: a.cl + r.clientSec, in: a.in + r.internalSec, bd: a.bd + r.bdSec, lv: a.lv + (r.leaveDays || 0), s: a.s + r.entries }), { av: 0, lg: 0, cl: 0, in: 0, bd: 0, lv: 0, s: 0 });
        wsTeam.getCell(tTot, 1).value = 'TOTAL';
        [['C', teamTot.av], ['D', teamTot.lg], ['E', teamTot.cl], ['F', teamTot.in], ['G', teamTot.bd]].forEach(([col, v]) => {
            wsTeam.getCell(`${col}${tTot}`).value = f(`SUM(${col}${tFirst}:${col}${tLast})`, hrs(v));
            wsTeam.getCell(`${col}${tTot}`).numFmt = FMT_H;
        });
        wsTeam.getCell(`H${tTot}`).value = f(`SUM(H${tFirst}:H${tLast})`, teamTot.lv);
        wsTeam.getCell(`I${tTot}`).value = f(`IF(IF(ISNUMBER(C${tTot}),C${tTot},0)=0,"N/A",D${tTot}/C${tTot})`, m.kpis.utilization === null ? 'N/A' : m.kpis.utilization);
        wsTeam.getCell(`I${tTot}`).numFmt = FMT_PCT;
        wsTeam.getCell(`J${tTot}`).value = f(`SUM(J${tFirst}:J${tLast})`, teamTot.s);
        totalRow(wsTeam, tTot, 10);

        // ── Client Summary
        title(wsClient, 'Client Summary', subtitle, 5);
        const C_HEAD = 4;
        header(wsClient, C_HEAD, ['Client', 'Total Hours', '% of Team Hours', 'Employees', 'Top Task Category'], [32, 14, 16, 12, 26]);
        const cFirst = C_HEAD + 1, cLast = C_HEAD + Math.max(1, m.clients.length), cTot = cLast + 1;
        m.clients.forEach((c, i) => {
            const rr = C_HEAD + 1 + i;
            const row = wsClient.getRow(rr);
            row.getCell(1).value = c.client;
            row.getCell(2).value = f(sumWhere([CLIENT, `A${rr}`]), hrs(c.seconds));
            row.getCell(2).numFmt = FMT_H;
            row.getCell(3).value = f(`IF(IF(ISNUMBER($B$${cTot}),$B$${cTot},0)=0,"N/A",B${rr}/$B$${cTot})`, c.share === null ? 'N/A' : c.share);
            row.getCell(3).numFmt = FMT_PCT;
            row.getCell(4).value = c.employeeCount;
            row.getCell(5).value = c.topCategory;
        });
        styleBody(wsClient, cFirst, cLast, 5);
        wsClient.getCell(cTot, 1).value = 'TOTAL';
        wsClient.getCell(cTot, 2).value = f(`SUM(B${cFirst}:B${cLast})`, hrs(m.kpis.totalSec));
        wsClient.getCell(cTot, 2).numFmt = FMT_H;
        wsClient.getCell(cTot, 3).value = f(`IF(IF(ISNUMBER(B${cTot}),B${cTot},0)=0,"N/A",1)`, m.kpis.totalSec ? 1 : 'N/A');
        wsClient.getCell(cTot, 3).numFmt = FMT_PCT;
        totalRow(wsClient, cTot, 5);

        // ── Member x Client
        const mc = m.matrix.clients;
        const mCols = mc.length + 3;
        title(wsMatrix, 'Member x Client (hours)', subtitle, Math.max(mCols, 4));
        const M_HEAD = 4;
        header(wsMatrix, M_HEAD, ['Employee', 'Email', ...mc, 'Total'], [24, 28, ...mc.map(c => Math.min(22, Math.max(11, c.length + 2))), 12]);
        wsMatrix.views = [{ state: 'frozen', xSplit: 2, ySplit: M_HEAD }];
        const colL = n => { let s = ''; n++; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };
        const mFirst = M_HEAD + 1, mLast = M_HEAD + Math.max(1, m.matrix.rows.length), mTot = mLast + 1;
        m.matrix.rows.forEach((r, i) => {
            const rr = M_HEAD + 1 + i;
            const row = wsMatrix.getRow(rr);
            row.getCell(1).value = r.employee;
            row.getCell(2).value = r.email;
            mc.forEach((c, j) => {
                const cl = colL(2 + j);
                row.getCell(3 + j).value = f(sumWhere([EMAIL, `$B${rr}`], [CLIENT, `${cl}$${M_HEAD}`]), hrs(r.cells[c]));
                row.getCell(3 + j).numFmt = '#,##0.00;-#,##0.00;"–"';
            });

            row.getCell(3 + mc.length).value = mc.length ? f(`SUM(C${rr}:${colL(1 + mc.length)}${rr})`, hrs(r.total)) : 0;
            row.getCell(3 + mc.length).numFmt = FMT_H;
        });
        styleBody(wsMatrix, mFirst, mLast, mCols);
        wsMatrix.getCell(mTot, 1).value = 'TOTAL';
        for (let j = 0; j <= mc.length; j++) {
            const cl = colL(2 + j);
            const v = j < mc.length ? m.matrix.rows.reduce((s, r) => s + r.cells[mc[j]], 0) : m.kpis.totalSec;
            wsMatrix.getCell(mTot, 3 + j).value = f(`SUM(${cl}${mFirst}:${cl}${mLast})`, hrs(v));
            wsMatrix.getCell(mTot, 3 + j).numFmt = FMT_H;
        }
        totalRow(wsMatrix, mTot, mCols);

        // ── Task Breakdown
        title(wsBreak, 'Task Breakdown', subtitle, 6);
        const B_HEAD = 4;
        header(wsBreak, B_HEAD, ['Task Category', 'Employee', 'Email', 'Client', 'Total Hours', '% of Total'], [24, 22, 28, 28, 13, 12]);
        const bFirst = B_HEAD + 1, bLast = B_HEAD + Math.max(1, m.taskBreakdown.length), bTot = bLast + 1;
        m.taskBreakdown.forEach((r, i) => {
            const rr = B_HEAD + 1 + i;
            const row = wsBreak.getRow(rr);
            row.getCell(1).value = r.category;
            row.getCell(2).value = r.employee;
            row.getCell(3).value = r.email;
            row.getCell(4).value = r.client;
            row.getCell(5).value = f(sumWhere([CAT, `A${rr}`], [EMAIL, `C${rr}`], [CLIENT, `D${rr}`]), hrs(r.seconds));
            row.getCell(5).numFmt = FMT_H;
            row.getCell(6).value = f(`IF(IF(ISNUMBER($E$${bTot}),$E$${bTot},0)=0,"N/A",E${rr}/$E$${bTot})`, r.share === null ? 'N/A' : r.share);
            row.getCell(6).numFmt = FMT_PCT;
        });
        styleBody(wsBreak, bFirst, bLast, 6);
        wsBreak.getCell(bTot, 1).value = 'TOTAL';
        wsBreak.getCell(bTot, 5).value = f(`SUM(E${bFirst}:E${bLast})`, hrs(m.kpis.totalSec));
        wsBreak.getCell(bTot, 5).numFmt = FMT_H;
        totalRow(wsBreak, bTot, 6);
        if (m.taskBreakdown.length) wsBreak.autoFilter = { from: { row: B_HEAD, column: 1 }, to: { row: bLast, column: 6 } };

        // ── Attendance
        title(wsAtt, 'Attendance', subtitle, 8);
        header(wsAtt, 4, ['Employee', 'Working Days', 'Present Days', 'Leave Days', 'Late Arrivals', 'Break Duration (h)', 'Working Hours (h)', 'Missing Check-outs'], [24, 14, 14, 12, 13, 17, 17, 17]);
        if (m.attendance.hasData) {
            m.attendance.rows.forEach((r, i) => {
                const row = wsAtt.getRow(5 + i);
                row.values = [r.employee, r.workingDays, r.presentDays, r.leaveDays === null ? 'N/A' : r.leaveDays, r.lateArrivals, hrs(r.breakSec), hrs(r.workSec), r.missingCheckout];
                row.getCell(6).numFmt = FMT_H;
                row.getCell(7).numFmt = FMT_H;
            });
            const aLast = 4 + m.attendance.rows.length;
            styleBody(wsAtt, 5, aLast, 8);
            wsAtt.getCell(aLast + 1, 1).value = 'TOTAL';
            ['C', 'D', 'E', 'F', 'G', 'H'].forEach(col => {
                wsAtt.getCell(`${col}${aLast + 1}`).value = { formula: `SUM(${col}5:${col}${aLast})` };
                if (col === 'F' || col === 'G') wsAtt.getCell(`${col}${aLast + 1}`).numFmt = FMT_H;
            });
            totalRow(wsAtt, aLast + 1, 8);
        } else {
            wsAtt.getCell('A5').value = 'No attendance check-ins recorded for this period.';
        }
        wsAtt.getCell(`A${7 + m.attendance.rows.length}`).value = 'Late = first check-in after 9:45 AM. Working hours exclude breaks; days with a missing check-out are not counted.';
        wsAtt.getCell(`A${7 + m.attendance.rows.length}`).font = { italic: true, size: 9, color: { argb: 'FF64748B' } };

        // ── Task Performance
        title(wsPerf, 'Task Performance', subtitle, 7);
        header(wsPerf, 4, ['Employee', 'Assigned', 'Completed', 'Pending', 'In Progress', 'Overdue', 'Rework'], [24, 12, 12, 12, 12, 12, 12]);
        m.performance.forEach((r, i) => { wsPerf.getRow(5 + i).values = [r.employee, r.assigned, r.completed, r.pending, r.inProgress, r.overdue, r.rework]; });
        const pLast = 4 + Math.max(1, m.performance.length);
        styleBody(wsPerf, 5, pLast, 7);
        wsPerf.getCell(pLast + 1, 1).value = 'TOTAL';
        ['B', 'C', 'D', 'E', 'F', 'G'].forEach((col, i) => {
            const key = ['assigned', 'completed', 'pending', 'inProgress', 'overdue', 'rework'][i];
            wsPerf.getCell(`${col}${pLast + 1}`).value = f(`SUM(${col}5:${col}${pLast})`, m.performanceTotals[key]);
        });
        totalRow(wsPerf, pLast + 1, 7);

        // ── QC Report
        title(wsQc, 'QC Report', subtitle, 11);
        header(wsQc, 4, ['Content Writer / Creator', 'QC Reviewer', 'Submission ID', 'Task', 'Client', 'Submission Date', 'Review Status', 'Pass/Fail', 'Failure Reason', 'Rework Rounds', 'QC Time (h)'],
            [22, 20, 16, 40, 22, 14, 14, 10, 44, 13, 12]);
        if (m.qc.rows.length) {
            m.qc.rows.forEach((r, i) => {
                const row = wsQc.getRow(5 + i);
                row.values = [r.creator, r.reviewer, r.submissionId, r.description, r.client, xlDay(r.date), r.reviewStatus, r.result, r.failureReason, r.reworkRounds, hrs(r.qcSeconds)];
                row.getCell(6).numFmt = 'dd-mmm-yyyy';
                row.getCell(11).numFmt = FMT_H;
                row.getCell(8).font = { bold: true, color: { argb: r.result === 'Pass' ? 'FF059669' : r.result === 'Fail' ? 'FFDC2626' : 'FF64748B' } };
                row.getCell(9).alignment = { wrapText: true, vertical: 'top' };
            });
            const qLast = 4 + m.qc.rows.length;
            styleBody(wsQc, 5, qLast, 11);
            const q = qLast + 2;
            [['Reviews', f(`COUNTA(H5:H${qLast})`, m.qc.reviews)], ['Passed', f(`COUNTIF(H5:H${qLast},"Pass")`, m.qc.passed)],
                ['Failed', f(`COUNTIF(H5:H${qLast},"Fail")`, m.qc.failed)],
                ['Pass rate', f(`IF((B${q + 1}+B${q + 2})=0,"N/A",B${q + 1}/(B${q + 1}+B${q + 2}))`, m.qc.passRate === null ? 'N/A' : m.qc.passRate)],
                ['Total QC time (h)', f(`SUM(K5:K${qLast})`, hrs(m.qc.qcSeconds))]].forEach(([l, v], i) => {
                wsQc.getCell(q + i, 1).value = l;
                wsQc.getCell(q + i, 1).font = { bold: true };
                wsQc.getCell(q + i, 2).value = v;
            });
            wsQc.getCell(q + 3, 2).numFmt = FMT_PCT;
            wsQc.getCell(q + 4, 2).numFmt = FMT_H;
        } else {
            wsQc.getCell('A5').value = 'No QC reviews recorded in this period.';
        }

        // ── Shoot Report
        title(wsShoot, 'Shoot & Production Report', subtitle, 9);
        header(wsShoot, 4, ['Shoot ID', 'Title', 'Client', 'Shoot Date', 'Assigned Employees', 'Shoot Duration (h)', 'Production Hours', 'Editing Hours', 'Completion Status'], [20, 32, 22, 13, 36, 17, 16, 14, 18]);
        if (m.shoots.rows.length) {
            m.shoots.rows.forEach((r, i) => {
                const row = wsShoot.getRow(5 + i);
                row.values = [r.shootId, r.title, r.client, xlDay(r.date), r.assignees, r.shootSeconds === null ? 'N/A' : hrs(r.shootSeconds), r.productionSeconds === null ? 'N/A' : hrs(r.productionSeconds), 'N/A', r.status];
                row.getCell(4).numFmt = 'dd-mmm-yyyy';
                row.getCell(6).numFmt = FMT_H;
                row.getCell(7).numFmt = FMT_H;
            });
            styleBody(wsShoot, 5, 4 + m.shoots.rows.length, 9);
        } else {
            wsShoot.getCell('A5').value = 'No shoots scheduled in this period.';
        }
        const sNote = 6 + m.shoots.rows.length;
        wsShoot.getCell(`A${sNote}`).value = 'Shoot duration counts overlapping crew time once. Production hours = person-hours logged on the shoot. Editing hours are N/A: edit tasks are not linked to shoots in the source data.';
        wsShoot.getCell(`A${sNote}`).font = { italic: true, size: 9, color: { argb: 'FF64748B' } };

        // ── Report Overview
        title(wsOverview, `${BRAND.name} – One Report`, subtitle, 4);
        wsOverview.getColumn(1).width = 34;
        wsOverview.getColumn(2).width = 22;
        wsOverview.getColumn(3).width = 52;
        wsOverview.getColumn(4).width = 4;
        let r = 4;
        const section = text => {
            wsOverview.getCell(r, 1).value = text;
            wsOverview.getCell(r, 1).font = { bold: true, size: 12, color: { argb: 'FF' + BRAND.primaryDark } };
            r++;
        };
        section('Report filters');
        filterSummary(m).concat([['Access level', { admin: 'Admin – all employees', manager: 'Manager – all team members', lead: 'Team lead – self & direct reports', employee: 'Employee – own report' }[m.scope.level]],
            ['Generated by', (window.currentUser && (window.currentUser.name || window.currentUser.email)) || '']]).forEach(([k, v]) => {
            wsOverview.getCell(r, 1).value = k;
            wsOverview.getCell(r, 1).font = { bold: true };
            wsOverview.getCell(r, 2).value = v;
            r++;
        });
        r++;
        section('Key metrics');
        header(wsOverview, r, ['Metric', 'Value', 'Source / note'], [34, 22, 52]);
        wsOverview.views = [];
        r++;
        const kp = m.kpis;
        const tsRef = col => `'Team Summary'!${col}${tTot}`;
        const kpiRows = [
            ['Total logged hours', f(tsRef('D'), hrs(kp.totalSec)), FMT_H, 'Sum of Time Log duration'],
            ['Client delivery hours', f(tsRef('E'), hrs(kp.clientSec)), FMT_H, 'Work tagged to a client'],
            ['Internal hours', f(tsRef('F'), hrs(kp.internalSec)), FMT_H, 'Work not tagged to a client'],
            ['Business development hours', f(tsRef('G'), hrs(kp.bdSec)), FMT_H, 'Sales / BD tasks'],
            ['Team capacity (hours)', f(tsRef('C'), hrs(kp.capacitySec)), FMT_H, `(Working days − leave) × ${m.settings.hoursPerDay}h${m.period.inProgress ? `, through ${m.period.capacityToStr}` : ''}`],
            ['Team utilization', f(tsRef('I'), kp.utilization === null ? 'N/A' : kp.utilization), FMT_PCT, 'Logged ÷ capacity (N/A when capacity is 0)'],
            ['Employee count', kp.employeeCount, null, ''],
            ['Active clients', kp.activeClients, null, 'Clients with logged hours'],
            ['Total time entries', kp.timeEntries, null, kp.aggregateEntries ? `Excludes ${kp.aggregateEntries} historical monthly aggregate entries` : 'Work sessions'],
            ['Assigned tasks', kp.assigned, null, 'See Task Performance'],
            ['Completed tasks', kp.completed, null, ''],
            ['Pending tasks', kp.pending, null, ''],
            ['QC passed', kp.qcPassed === null ? 'N/A' : kp.qcPassed, null, 'See QC Report'],
            ['QC failed', kp.qcFailed === null ? 'N/A' : kp.qcFailed, null, ''],
            ['QC pass rate', kp.qcPassRate === null ? 'N/A' : kp.qcPassRate, FMT_PCT, ''],
            ['Rework count', kp.reworkCount === null ? 'N/A' : kp.reworkCount, null, 'QC rejections sent to rework']
        ];
        const kFirst = r;
        kpiRows.forEach(([label, val, fmt, note]) => {
            wsOverview.getCell(r, 1).value = label;
            wsOverview.getCell(r, 2).value = val;
            if (fmt) wsOverview.getCell(r, 2).numFmt = fmt;
            wsOverview.getCell(r, 2).alignment = { horizontal: 'right' };
            wsOverview.getCell(r, 3).value = note;
            wsOverview.getCell(r, 3).font = { size: 9, color: { argb: 'FF64748B' } };
            r++;
        });
        styleBody(wsOverview, kFirst, r - 1, 3);
        r++;
        if (m.notes.length) {
            section('Data notes');
            m.notes.forEach(n => { wsOverview.getCell(r, 1).value = '• ' + n; wsOverview.mergeCells(r, 1, r, 3); r++; });
        }

        // ── How to Use
        title(wsHow, 'How to Use This Workbook', subtitle, 2);
        wsHow.getColumn(1).width = 22;
        wsHow.getColumn(2).width = 100;
        [
            ['Report Overview', 'Headline KPIs and the filters used for this export. Hour KPIs link to the Team Summary totals.'],
            ['Setup', 'Period, standard hours per day and each employee\'s working days, leave days and available hours. Change the hours-per-day cell (yellow) to recalculate capacity and utilization.'],
            ['Time Log', 'Every work entry in the report. All hour totals in the other sheets are formulas (SUMIFS / SUMPRODUCT) over this sheet, so editing a duration here updates every summary.'],
            ['Team Summary', 'Available vs logged hours per employee, split into client, internal and business development work. Utilization shows N/A when available hours are zero.'],
            ['Client Summary', 'Hours per client with share of total team hours. "Internal (VilPower)" collects work not tagged to a client.'],
            ['Member x Client', 'Hours per employee per client with row and column totals.'],
            ['Task Breakdown', 'Hours by task category, employee and client. Task category is derived from the task title.'],
            ['Attendance', 'Working, present and leave days, late arrivals, breaks and working hours from check-in/check-out records.'],
            ['Task Performance', 'Assigned, completed, pending, in-progress, overdue and rework task counts per employee.'],
            ['QC Report', 'Every QC review in the period with pass/fail result, failure reasons, rework rounds and QC time.'],
            ['Shoot Report', 'Shoots scheduled in the period. Shoot duration counts overlapping crew time once.'],
            ['Entry Type', `"${window.OneReportEngine.AGGREGATE_LABEL}" rows are imported monthly totals, not individual work sessions. They count towards hours but have no start/end time.`],
            ['Breaks', 'Breaks are never counted as work hours.']
        ].forEach(([k, v], i) => {
            const row = wsHow.getRow(4 + i);
            row.getCell(1).value = k;
            row.getCell(1).font = { bold: true, color: { argb: 'FF' + BRAND.primaryDark } };
            row.getCell(2).value = v;
            row.getCell(2).alignment = { wrapText: true, vertical: 'top' };
            row.getCell(1).alignment = { vertical: 'top' };
        });

        // Print setup for all sheets
        wb.eachSheet(ws => {
            ws.pageSetup = Object.assign({}, ws.pageSetup, { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 });
            ws.headerFooter = { oddFooter: `&L${BRAND.name} – ${m.period.label}&RPage &P of &N` };
        });
        return wb;
    }

    // ─────────────────────────────────────────────────────────────
    // PDF
    // ─────────────────────────────────────────────────────────────

    async function imageToDataUrl(src) {
        try {
            const res = await fetch(src);
            if (!res.ok) return null;
            const blob = await res.blob();
            return await new Promise(resolve => {
                const fr = new FileReader();
                fr.onload = () => resolve(fr.result);
                fr.onerror = () => resolve(null);
                fr.readAsDataURL(blob);
            });
        } catch (e) { return null; }
    }

    async function exportPdf() {
        const m = state.model || buildModel();
        if (!m) return;
        setBusy('or-btn-pdf', true, 'Building…');
        try {
            await loadScript(LIBS.jspdf);
            await loadScript(LIBS.autotable);
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4', compress: true });
            // Built-in PDF fonts only cover Latin-1, so swap dashes and drop other symbols.
            const pdfSafe = t => String(t === null || t === undefined ? '' : t).replace(/[–—]/g, '-').replace(/•/g, '-').replace(/[^\x00-\xFF]/g, '');
            const rawText = doc.text.bind(doc);
            doc.text = (t, ...rest) => rawText(Array.isArray(t) ? t.map(pdfSafe) : pdfSafe(t), ...rest);
            const W = doc.internal.pageSize.getWidth();
            const H = doc.internal.pageSize.getHeight();
            const M = 36;
            const primary = [79, 70, 229];
            const logo = await imageToDataUrl('img/onedesk-logo.png');

            // Cover header
            doc.setFillColor(55, 48, 163);
            doc.rect(0, 0, W, 78, 'F');
            if (logo) { try { doc.addImage(logo, 'PNG', M, 16, 46, 46); } catch (e) { /* ignore bad image */ } }
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(20);
            doc.text(`${BRAND.name} – One Report`, logo ? M + 58 : M, 40);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            doc.text(`${m.period.label}  ·  ${fmtDate(m.period.fromStr)} – ${fmtDate(m.period.toStr)}`, logo ? M + 58 : M, 60);
            doc.setTextColor(30, 41, 59);

            let y = 98;
            doc.setFontSize(9);
            const filters = filterSummary(m).slice(1).map(([k, v]) => `${k}: ${v}`).join('   ·   ');
            doc.text(filters, M, y);
            doc.text(`Generated ${new Date(m.generatedAt).toLocaleString('en-GB')} by ${(window.currentUser && (window.currentUser.name || window.currentUser.email)) || ''}`, M, y + 13);
            y += 30;

            // KPI tiles
            const k = m.kpis;
            const tiles = [
                ['Total logged', fmtH(k.totalSec)], ['Client delivery', fmtH(k.clientSec)], ['Internal', fmtH(k.internalSec)], ['Business dev.', fmtH(k.bdSec)],
                ['Team capacity', fmtH(k.capacitySec)], ['Utilization', fmtPct(k.utilization)], ['Employees', fmtNum(k.employeeCount)],
                ['Active clients', fmtNum(k.activeClients)], ['Time entries', fmtNum(k.timeEntries)], ['Assigned tasks', fmtNum(k.assigned)],
                ['Completed', fmtNum(k.completed)], ['Pending', fmtNum(k.pending)],
                ['QC pass / fail', k.qcPassed === null ? 'N/A' : `${k.qcPassed} / ${k.qcFailed}`], ['Rework count', fmtNum(k.reworkCount)]
            ];
            const perRow = 7;
            const gap = 8;
            const tw = (W - 2 * M - gap * (perRow - 1)) / perRow;
            tiles.forEach(([label, val], i) => {
                const x = M + (i % perRow) * (tw + gap);
                const ty = y + Math.floor(i / perRow) * 52;
                doc.setFillColor(238, 242, 255);
                doc.roundedRect(x, ty, tw, 44, 6, 6, 'F');
                doc.setFontSize(7.5);
                doc.setTextColor(100, 116, 139);
                doc.text(label.toUpperCase(), x + 8, ty + 14);
                doc.setFontSize(13);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(30, 41, 59);
                doc.text(String(val), x + 8, ty + 34);
                doc.setFont('helvetica', 'normal');
            });
            y += 2 * 52 + 6;

            if (m.notes.length) {
                doc.setFontSize(8);
                doc.setTextColor(146, 64, 14);
                m.notes.forEach(n => { doc.text('• ' + n, M, y); y += 11; });
                doc.setTextColor(30, 41, 59);
            }

            // Charts – two per row, four per page
            const imgs = chartImages(m);
            const chartList = CHARTS.filter(([id]) => imgs[id]);
            if (chartList.length) {
                doc.addPage();
                y = M;
                const cw = (W - 2 * M - 20) / 2;
                const chh = cw / 2;
                chartList.forEach(([id, titleText], i) => {
                    if (i > 0 && i % 4 === 0) { doc.addPage(); y = M; }
                    const slot = i % 4;
                    const x = M + (slot % 2) * (cw + 20);
                    const cy = y + Math.floor(slot / 2) * (chh + 34);
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'bold');
                    doc.text(titleText, x, cy + 10);
                    doc.setFont('helvetica', 'normal');
                    doc.addImage(imgs[id], 'JPEG', x, cy + 16, cw, chh, undefined, 'FAST');
                });
            }

            const tableOpts = (head, body, foot, startY) => ({
                head: [head], body, foot: foot ? [foot] : undefined, startY: startY || M + 20, margin: { left: M, right: M, top: M + 10, bottom: 40 },
                styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
                headStyles: { fillColor: primary, textColor: 255, fontStyle: 'bold' },
                footStyles: { fillColor: [224, 231, 255], textColor: [30, 41, 59], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                didParseCell: d => { d.cell.text = (d.cell.text || []).map(pdfSafe); },
                theme: 'grid'
            });
            const sectionTable = (heading, head, body, foot, emptyText) => {
                doc.addPage();
                doc.setFontSize(13);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(55, 48, 163);
                doc.text(heading, M, M + 6);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(30, 41, 59);
                if (!body.length) { doc.setFontSize(9); doc.text(emptyText || 'No data for the selected filters.', M, M + 28); return; }
                doc.autoTable(tableOpts(head, body, foot));
            };

            const tt = m.team.reduce((a, r) => ({ av: a.av + r.availableSec, lg: a.lg + r.loggedSec, cl: a.cl + r.clientSec, in: a.in + r.internalSec, bd: a.bd + r.bdSec }), { av: 0, lg: 0, cl: 0, in: 0, bd: 0 });
            sectionTable('Team Summary', ['Employee', 'Available', 'Logged', 'Client', 'Internal', 'Business dev.', 'Leave days', 'Utilization'],
                m.team.map(r => [r.employee, fmtH(r.availableSec), fmtH(r.loggedSec), fmtH(r.clientSec), fmtH(r.internalSec), fmtH(r.bdSec), fmtNum(r.leaveDays), fmtPct(r.utilization)]),
                ['Total', fmtH(tt.av), fmtH(tt.lg), fmtH(tt.cl), fmtH(tt.in), fmtH(tt.bd), '', fmtPct(k.utilization)]);
            sectionTable('Client Summary', ['Client', 'Total hours', '% of team hours', 'Employees', 'Top task category'],
                m.clients.map(c => [c.client, fmtH(c.seconds), fmtPct(c.share), c.employeeCount, c.topCategory]),
                ['Total', fmtH(k.totalSec), k.totalSec ? '100.0%' : 'N/A', '', '']);
            const cats = Object.entries(m.categoryTotals).sort((a, b) => b[1] - a[1]);
            sectionTable('Task Category Distribution', ['Task category', 'Hours', '% of total'],
                cats.map(([c, s]) => [c, fmtH(s), fmtPct(k.totalSec ? s / k.totalSec : null)]), ['Total', fmtH(k.totalSec), k.totalSec ? '100.0%' : 'N/A']);
            const pt = m.performanceTotals;
            sectionTable('Task Performance', ['Employee', 'Assigned', 'Completed', 'Pending', 'In progress', 'Overdue', 'Rework'],
                m.performance.map(r => [r.employee, r.assigned, r.completed, r.pending, r.inProgress, r.overdue, r.rework]),
                ['Total', pt.assigned, pt.completed, pt.pending, pt.inProgress, pt.overdue, pt.rework]);
            sectionTable('QC Report', ['Creator', 'Reviewer', 'Submission', 'Client', 'Date', 'Result', 'Failure reason', 'Rounds', 'QC time'],
                m.qc.rows.map(r => [r.creator, r.reviewer, r.submissionId, r.client, fmtDate(r.date), r.result, r.failureReason, r.reworkRounds, fmtH(r.qcSeconds)]),
                m.qc.rows.length ? ['Total', '', `${m.qc.reviews} reviews`, '', '', `${m.qc.passed} pass / ${m.qc.failed} fail`, '', '', fmtH(m.qc.qcSeconds)] : null,
                'No QC reviews recorded in this period.');
            sectionTable('Shoot & Production', ['Shoot ID', 'Title', 'Client', 'Date', 'Assigned', 'Shoot duration', 'Production hours', 'Status'],
                m.shoots.rows.map(r => [r.shootId, r.title, r.client, fmtDate(r.date), r.assignees, fmtH(r.shootSeconds), fmtH(r.productionSeconds), r.status]),
                null, 'No shoots scheduled in this period.');
            sectionTable('Attendance', ['Employee', 'Working days', 'Present', 'Leave', 'Late', 'Breaks', 'Working hours', 'Missing check-outs'],
                m.attendance.hasData ? m.attendance.rows.map(r => [r.employee, r.workingDays, r.presentDays, fmtNum(r.leaveDays), r.lateArrivals, fmtH(r.breakSec), fmtH(r.workSec), r.missingCheckout]) : [],
                null, 'No attendance check-ins recorded for this period.');

            // Footer with page numbers on every page
            const pages = doc.internal.getNumberOfPages();
            for (let p = 1; p <= pages; p++) {
                doc.setPage(p);
                doc.setFontSize(8);
                doc.setTextColor(148, 163, 184);
                doc.text(`${BRAND.name} · ${BRAND.product} · ${m.period.label} · Confidential`, M, H - 18);
                doc.text(`Page ${p} of ${pages}`, W - M, H - 18, { align: 'right' });
            }
            doc.save(`${fileBase(m)}.pdf`);
            notify('PDF report downloaded', 'success');
        } catch (e) {
            console.error('[OneReport] PDF export failed', e);
            notify('PDF export failed: ' + e.message, 'error');
        } finally {
            setBusy('or-btn-pdf', false);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────

    window.OneReport = {
        init() {
            if (typeof window.loadAllTimeLogs === 'function') window.loadAllTimeLogs();
            if (typeof window.loadAttendanceEvents === 'function') window.loadAttendanceEvents();
            if (typeof window.loadQcReports === 'function') window.loadQcReports();
            render();
        },
        refresh() { if ($(PANEL_ID) && !$(PANEL_ID).classList.contains('hidden')) refresh(); },
        setPeriodMode(mode) {
            state.period.mode = mode;
            if (mode === 'custom' && (!state.period.from || !state.period.to)) {
                const r = window.OneReportEngine.resolvePeriod({ mode: 'current_month' });
                state.period.from = r.fromStr;
                state.period.to = r.toStr;
            }
            syncPeriodInputs();
            render();
        },
        setPeriodValue(key, val) { state.period[key] = val; render(); },
        setFilter(key, val) { state.filters[key] = val; state.logLimit = 200; render(); },
        resetFilters() {
            state.period = { mode: 'current_month', month: '', from: '', to: '' };
            state.filters = { employee: 'all', client: 'all', category: 'all', source: 'all' };
            state.logLimit = 200;
            renderShell();
            render();
        },
        switchTab,
        showMoreLogs() { state.logLimit += 500; renderTab(); },
        exportExcel,
        exportPdf,
        exportCsv,
        getModel: () => state.model,
        _buildWorkbook: buildWorkbook
    };
})(window);
