/**
 * ═══════════════════════════════════════════════════════════════════════════
 * One Desk - Sales Executive Hub & CRM Pipeline
 * Dedicated module for Prince (Sales Executive) & Admins
 * Realtime Firebase sync for Leads, Pipelines, Targets, and Quotations
 * ═══════════════════════════════════════════════════════════════════════════
 */

(function () {
    'use strict';

    // State
    let salesLeads = [];
    let salesTarget = 500000; // Default ₹5 Lakhs monthly target
    let salesUnsub = null;
    let targetUnsub = null;
    let currentSalesViewTab = 'pipeline'; // 'pipeline' | 'table' | 'quotation' | 'analytics'
    let currentLeadFilterStage = 'all';
    let currentLeadFilterSource = 'all';
    let currentLeadSearchQuery = '';

    // Stages Configuration
    const PIPELINE_STAGES = [
        { id: 'new', name: 'New Inquiries', icon: 'solar:inbox-in-bold-duotone', color: 'slate', badgeBg: 'bg-slate-100 dark:bg-slate-800', badgeText: 'text-slate-700 dark:text-slate-300' },
        { id: 'contacted', name: 'Contacted / Intro Call', icon: 'solar:phone-calling-bold-duotone', color: 'blue', badgeBg: 'bg-blue-100 dark:bg-blue-950/60', badgeText: 'text-blue-700 dark:text-blue-400' },
        { id: 'discussion', name: 'Requirement / Demo', icon: 'solar:users-group-two-rounded-bold-duotone', color: 'indigo', badgeBg: 'bg-indigo-100 dark:bg-indigo-950/60', badgeText: 'text-indigo-700 dark:text-indigo-400' },
        { id: 'proposal', name: 'Proposal / Quote Sent', icon: 'solar:document-text-bold-duotone', color: 'amber', badgeBg: 'bg-amber-100 dark:bg-amber-950/60', badgeText: 'text-amber-700 dark:text-amber-400' },
        { id: 'negotiation', name: 'Negotiation', icon: 'solar:handshake-bold-duotone', color: 'purple', badgeBg: 'bg-purple-100 dark:bg-purple-950/60', badgeText: 'text-purple-700 dark:text-purple-400' },
        { id: 'won', name: 'Closed Won 🎉', icon: 'solar:cup-star-bold-duotone', color: 'emerald', badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60', badgeText: 'text-emerald-700 dark:text-emerald-400' },
        { id: 'lost', name: 'Closed Lost', icon: 'solar:close-circle-bold-duotone', color: 'rose', badgeBg: 'bg-rose-100 dark:bg-rose-950/60', badgeText: 'text-rose-700 dark:text-rose-400' }
    ];

    // Standard Agency Service Catalog
    const AGENCY_SERVICES = [
        { id: 'smm', name: 'Social Media Management', defaultPrice: 15000, desc: '12-15 Posts, 8 Reels, Stories & Monthly Calendar' },
        { id: 'meta_ads', name: 'Performance Marketing (Meta Ads)', defaultPrice: 20000, desc: 'Lead Gen & Sales Campaigns, Audience Research & Optimization' },
        { id: 'google_ads', name: 'Google Ads & Search Marketing', defaultPrice: 18000, desc: 'Search, Shopping & YouTube Ads with ROI tracking' },
        { id: 'reels_pkg', name: 'Video Production & 10 Reels', defaultPrice: 25000, desc: 'Shoot, Scripting, Professional Editing & Sound Design' },
        { id: 'branding', name: 'Brand Identity & Graphic Design', defaultPrice: 18000, desc: 'Logo, Brand Guidelines, Business Stationery & Templates' },
        { id: 'web_dev', name: 'Custom Website & SEO Landing Page', defaultPrice: 35000, desc: 'Responsive, High Conversion UI, Fast Loading & SEO Optimized' },
        { id: 'seo_growth', name: 'SEO & Organic Growth', defaultPrice: 15000, desc: 'On-page SEO, Technical Audit, Backlinks & Rank Tracking' }
    ];

    // ── Helper: Check Sales Access ──
    function isSalesUser() {
        if (typeof window.currentUser === 'undefined' || !window.currentUser) return false;
        const u = window.currentUser;
        const email = (u.email || '').toLowerCase().trim();
        const name = (u.name || '').toLowerCase();
        const role = (u.role || '').toLowerCase();
        return (typeof window.isAdmin === 'function' && window.isAdmin()) ||
            email === 'digitalmarketing@vilpower.com' || // Palanirajan R
            email === 'palanirajan@vilpower.com' ||       // Palanirajan R
            name.includes('palanirajan') ||
            email === 'princevilpower@gmail.com' ||       // Prince (Sales Executive)
            email === 'prince@vilpower.com' ||
            role.includes('sales') ||
            role.includes('executive') ||
            role.includes('manager') ||
            role.includes('admin');
    }

    // ── Month Key Helper ──
    function getMonthKey(date = new Date()) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}`;
    }

    // ── Format Currency ──
    function formatINR(num) {
        const val = Number(num) || 0;
        return '₹' + val.toLocaleString('en-IN');
    }

    // ── Clean Phone Number ──
    function cleanPhoneNumber(phone) {
        if (!phone) return '';
        let cleaned = String(phone).replace(/[^\d+]/g, '');
        if (!cleaned.startsWith('+') && cleaned.length === 10) {
            cleaned = '91' + cleaned;
        } else if (cleaned.startsWith('+')) {
            cleaned = cleaned.substring(1);
        }
        return cleaned;
    }

    // ── Initialize Sales Hub Listeners ──
    function initSalesHub() {
        if (!isSalesUser() || typeof window.db === 'undefined' || !window.db) return;

        // Listen for leads
        const { ref, onValue } = window.firebaseDatabase || {};
        if (!ref || !onValue) return;

        if (salesUnsub) salesUnsub();
        const leadsRef = ref(window.db, 'worksync/sales_leads');
        salesUnsub = onValue(leadsRef, (snapshot) => {
            const data = snapshot.val() || {};
            salesLeads = Object.entries(data).map(([id, item]) => ({
                id,
                ...item
            })).sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));

            renderSalesHub();
            updateSalesBadge();
        });

        // Listen for monthly target
        const currentMonth = getMonthKey();
        const targetRef = ref(window.db, `worksync/sales_targets/${currentMonth}`);
        targetUnsub = onValue(targetRef, (snapshot) => {
            const data = snapshot.val();
            if (data && data.targetAmount) {
                salesTarget = Number(data.targetAmount) || 500000;
            } else {
                salesTarget = 500000;
            }
            renderSalesKpis();
        });
    }

    // ── Update Notification Badge for Follow-ups Due Today ──
    function updateSalesBadge() {
        const badge = document.getElementById('sales-hub-badge');
        if (!badge) return;

        const todayStr = new Date().toISOString().split('T')[0];
        const dueTodayCount = salesLeads.filter(l => {
            if (!l.nextFollowup || l.stage === 'won' || l.stage === 'lost') return false;
            return l.nextFollowup.startsWith(todayStr) || l.nextFollowup < todayStr;
        }).length;

        if (dueTodayCount > 0) {
            badge.textContent = dueTodayCount;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    // ── Main Render Router ──
    function renderSalesHub() {
        if (!isSalesUser()) return;
        renderSalesKpis();
        if (currentSalesViewTab === 'pipeline') {
            renderSalesPipeline();
        } else if (currentSalesViewTab === 'table') {
            renderSalesTable();
        } else if (currentSalesViewTab === 'quotation') {
            renderQuotationCalculator();
        } else if (currentSalesViewTab === 'analytics') {
            renderSalesAnalytics();
        }
    }

    // ── Render Top KPI Metric Cards ──
    function renderSalesKpis() {
        const kpiContainer = document.getElementById('sales-kpi-cards');
        if (!kpiContainer) return;

        const currentMonth = getMonthKey();
        let totalActivePipeline = 0;
        let wonRevenueThisMonth = 0;
        let wonDealsCount = 0;
        let totalClosedDeals = 0;
        let followupsDueToday = 0;
        let followupsOverdue = 0;
        const todayStr = new Date().toISOString().split('T')[0];

        salesLeads.forEach(l => {
            const val = Number(l.dealValue) || 0;
            if (['new', 'contacted', 'discussion', 'proposal', 'negotiation'].includes(l.stage)) {
                totalActivePipeline += val;
            }

            if (l.stage === 'won') {
                totalClosedDeals++;
                wonDealsCount++;
                const closedMonth = l.closedAt ? getMonthKey(new Date(l.closedAt)) : (l.updatedAt ? getMonthKey(new Date(l.updatedAt)) : currentMonth);
                if (closedMonth === currentMonth) {
                    wonRevenueThisMonth += val;
                }
            } else if (l.stage === 'lost') {
                totalClosedDeals++;
            }

            if (l.nextFollowup && l.stage !== 'won' && l.stage !== 'lost') {
                if (l.nextFollowup.startsWith(todayStr)) {
                    followupsDueToday++;
                } else if (l.nextFollowup < todayStr) {
                    followupsOverdue++;
                }
            }
        });

        const targetPct = salesTarget > 0 ? Math.min(100, Math.round((wonRevenueThisMonth / salesTarget) * 100)) : 0;
        const winRate = totalClosedDeals > 0 ? Math.round((wonDealsCount / totalClosedDeals) * 100) : 0;

        kpiContainer.innerHTML = `
            <!-- 1. Monthly Target & Progress -->
            <div class="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-2.5">
                        <div class="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                            <iconify-icon icon="solar:target-bold-duotone" width="22"></iconify-icon>
                        </div>
                        <div>
                            <span class="text-[10px] font-bold uppercase tracking-widest text-indigo-200">Monthly Sales Goal</span>
                            <h4 class="text-lg font-black tracking-tight">${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</h4>
                        </div>
                    </div>
                    <button type="button" onclick="openEditTargetModal()" class="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all text-xs font-bold flex items-center gap-1">
                        <iconify-icon icon="solar:pen-bold" width="14"></iconify-icon>
                        <span>Set Goal</span>
                    </button>
                </div>

                <div class="space-y-3">
                    <div class="flex items-baseline justify-between">
                        <div>
                            <span class="text-2xl sm:text-3xl font-black tracking-tight font-mono">${formatINR(wonRevenueThisMonth)}</span>
                            <span class="text-xs text-indigo-200 font-semibold"> / ${formatINR(salesTarget)}</span>
                        </div>
                        <span class="text-sm font-black px-2.5 py-1 bg-white/20 rounded-xl backdrop-blur-md font-mono">${targetPct}%</span>
                    </div>

                    <!-- Progress Bar -->
                    <div class="w-full bg-black/20 rounded-full h-3 overflow-hidden p-0.5">
                        <div class="bg-gradient-to-r from-emerald-400 to-teal-300 h-full rounded-full transition-all duration-500" style="width: ${targetPct}%"></div>
                    </div>
                </div>
            </div>

            <!-- 2. Active Pipeline Value -->
            <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-xl flex flex-col justify-between">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-2.5">
                        <div class="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <iconify-icon icon="solar:chart-square-bold-duotone" width="22"></iconify-icon>
                        </div>
                        <div>
                            <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Active Deals Value</span>
                            <h4 class="text-xs font-bold text-slate-700 dark:text-slate-300">In Pipeline</h4>
                        </div>
                    </div>
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        ${salesLeads.filter(l => ['new', 'contacted', 'discussion', 'proposal', 'negotiation'].includes(l.stage)).length} Leads
                    </span>
                </div>
                <div>
                    <h3 class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">${formatINR(totalActivePipeline)}</h3>
                    <p class="text-xs text-slate-400 mt-1">Total value across ongoing discussions & proposals</p>
                </div>
            </div>

            <!-- 3. Follow-ups & Calls Today -->
            <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-xl flex flex-col justify-between">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-2.5">
                        <div class="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                            <iconify-icon icon="solar:phone-calling-bold-duotone" width="22"></iconify-icon>
                        </div>
                        <div>
                            <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Client Touchpoints</span>
                            <h4 class="text-xs font-bold text-slate-700 dark:text-slate-300">Scheduled Actions</h4>
                        </div>
                    </div>
                    ${followupsOverdue > 0 ? `<span class="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 animate-pulse">${followupsOverdue} Overdue</span>` : ''}
                </div>
                <div>
                    <div class="flex items-baseline gap-2">
                        <h3 class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">${followupsDueToday}</h3>
                        <span class="text-xs font-bold text-slate-500">Calls / Meetings Today</span>
                    </div>
                    <p class="text-xs text-slate-400 mt-1">Stay proactive to close deals faster</p>
                </div>
            </div>

            <!-- 4. Conversion & Win Rate -->
            <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-xl flex flex-col justify-between">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-2.5">
                        <div class="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                            <iconify-icon icon="solar:cup-star-bold-duotone" width="22"></iconify-icon>
                        </div>
                        <div>
                            <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sales Efficiency</span>
                            <h4 class="text-xs font-bold text-slate-700 dark:text-slate-300">Win Rate</h4>
                        </div>
                    </div>
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                        ${wonDealsCount} Won
                    </span>
                </div>
                <div>
                    <h3 class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">${winRate}%</h3>
                    <p class="text-xs text-slate-400 mt-1">${wonDealsCount} converted out of ${totalClosedDeals} total closures</p>
                </div>
            </div>
        `;
    }

    // ── Render Pipeline (Kanban Board) ──
    function renderSalesPipeline() {
        const board = document.getElementById('sales-kanban-board');
        if (!board) return;

        let filtered = salesLeads;
        if (currentLeadSearchQuery) {
            const q = currentLeadSearchQuery.toLowerCase();
            filtered = filtered.filter(l =>
                (l.clientName || '').toLowerCase().includes(q) ||
                (l.contactPerson || '').toLowerCase().includes(q) ||
                (l.phone || '').includes(q) ||
                (l.notes || '').toLowerCase().includes(q)
            );
        }
        if (currentLeadFilterSource !== 'all') {
            filtered = filtered.filter(l => l.source === currentLeadFilterSource);
        }

        board.innerHTML = PIPELINE_STAGES.map(stage => {
            const stageLeads = filtered.filter(l => (l.stage || 'new') === stage.id);
            const stageValue = stageLeads.reduce((sum, l) => sum + (Number(l.dealValue) || 0), 0);

            return `
                <div class="flex-shrink-0 w-80 bg-slate-50/70 dark:bg-slate-900/50 rounded-3xl border border-slate-200/70 dark:border-slate-800 p-4 flex flex-col max-h-[calc(100vh-320px)]"
                     ondragover="event.preventDefault()" ondrop="handleSalesDrop(event, '${stage.id}')">
                    
                    <!-- Column Header -->
                    <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/60 dark:border-slate-800">
                        <div class="flex items-center gap-2">
                            <iconify-icon icon="${stage.icon}" width="18" class="${stage.badgeText}"></iconify-icon>
                            <h4 class="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">${stage.name}</h4>
                        </div>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-black ${stage.badgeBg} ${stage.badgeText}">
                            ${stageLeads.length}
                        </span>
                    </div>

                    <div class="text-[11px] font-bold text-slate-400 mb-3 px-1 flex justify-between">
                        <span>Total:</span>
                        <span class="font-mono text-slate-700 dark:text-slate-300">${formatINR(stageValue)}</span>
                    </div>

                    <!-- Column Cards List -->
                    <div class="space-y-3 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                        ${stageLeads.length === 0 ? `
                            <div class="py-10 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                                <p class="text-xs font-bold text-slate-400">No leads in this stage</p>
                            </div>
                        ` : stageLeads.map(lead => renderLeadCardHtml(lead)).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    // ── Render Individual Lead Card HTML ──
    function renderLeadCardHtml(lead) {
        const cleanPhone = cleanPhoneNumber(lead.phone);
        const todayStr = new Date().toISOString().split('T')[0];
        let followupBadge = '';

        if (lead.nextFollowup && lead.stage !== 'won' && lead.stage !== 'lost') {
            if (lead.nextFollowup.startsWith(todayStr)) {
                followupBadge = `<span class="px-2 py-0.5 rounded-md text-[9px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">📞 Call Today</span>`;
            } else if (lead.nextFollowup < todayStr) {
                followupBadge = `<span class="px-2 py-0.5 rounded-md text-[9px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300">⚠️ Overdue (${lead.nextFollowup})</span>`;
            } else {
                followupBadge = `<span class="px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">📅 ${lead.nextFollowup}</span>`;
            }
        }

        const servicesBadges = (lead.services || []).map(s => `
            <span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 truncate max-w-[120px]">${escapeHtml(s)}</span>
        `).join('');

        const whatsappText = encodeURIComponent(`Hi ${lead.contactPerson || lead.clientName || 'there'},\n\nThis is Prince from VilPower Digital. Following up regarding your digital marketing and creative requirements.\n\nLooking forward to speaking with you!`);

        return `
            <div class="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group"
                 draggable="true" ondragstart="handleSalesDragStart(event, '${lead.id}')">
                
                <!-- Card Header -->
                <div class="flex items-start justify-between gap-2 mb-2">
                    <div>
                        <h5 class="text-sm font-black text-slate-900 dark:text-white leading-snug">${escapeHtml(lead.clientName || 'Unnamed Client')}</h5>
                        ${lead.contactPerson ? `<p class="text-xs text-slate-500 dark:text-slate-400 font-medium">${escapeHtml(lead.contactPerson)}</p>` : ''}
                    </div>
                    <span class="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400 shrink-0">
                        ${formatINR(lead.dealValue)}
                    </span>
                </div>

                <!-- Services Tags -->
                ${lead.services && lead.services.length ? `
                    <div class="flex flex-wrap gap-1 mb-3">
                        ${servicesBadges}
                    </div>
                ` : ''}

                <!-- Follow-up Alert & Source -->
                <div class="flex items-center justify-between gap-1 mb-3">
                    ${followupBadge || `<span></span>`}
                    ${lead.source ? `<span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">${escapeHtml(lead.source)}</span>` : ''}
                </div>

                <!-- Notes Snippet -->
                ${lead.notes ? `
                    <p class="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-3 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                        ${escapeHtml(lead.notes)}
                    </p>
                ` : ''}

                <!-- Quick Action Buttons -->
                <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
                    <div class="flex items-center gap-1.5">
                        ${cleanPhone ? `
                            <a href="https://wa.me/${cleanPhone}?text=${whatsappText}" target="_blank"
                               class="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-all flex items-center justify-center"
                               title="Chat on WhatsApp">
                                <iconify-icon icon="solar:chat-round-dots-bold" width="16"></iconify-icon>
                            </a>
                            <a href="tel:${cleanPhone}"
                               class="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-all flex items-center justify-center"
                               title="Call Client">
                                <iconify-icon icon="solar:phone-bold" width="16"></iconify-icon>
                            </a>
                        ` : ''}
                        <button type="button" onclick="openLeadDetailsModal('${lead.id}')"
                                class="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-all"
                                title="View / Add Call Log">
                            <iconify-icon icon="solar:notes-bold" width="16"></iconify-icon>
                        </button>
                    </div>

                    <!-- Quick Stage Selector -->
                    <select onchange="updateLeadStage('${lead.id}', this.value)"
                            class="text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 py-1 outline-none text-slate-700 dark:text-slate-300">
                        ${PIPELINE_STAGES.map(s => `
                            <option value="${s.id}" ${lead.stage === s.id ? 'selected' : ''}>${s.name}</option>
                        `).join('')}
                    </select>
                </div>
            </div>
        `;
    }

    // ── Render All Leads (Table View) ──
    function renderSalesTable() {
        const tableBody = document.getElementById('sales-table-tbody');
        if (!tableBody) return;

        let filtered = salesLeads;
        if (currentLeadSearchQuery) {
            const q = currentLeadSearchQuery.toLowerCase();
            filtered = filtered.filter(l =>
                (l.clientName || '').toLowerCase().includes(q) ||
                (l.contactPerson || '').toLowerCase().includes(q) ||
                (l.phone || '').includes(q) ||
                (l.notes || '').toLowerCase().includes(q)
            );
        }
        if (currentLeadFilterStage !== 'all') {
            filtered = filtered.filter(l => (l.stage || 'new') === currentLeadFilterStage);
        }
        if (currentLeadFilterSource !== 'all') {
            filtered = filtered.filter(l => l.source === currentLeadFilterSource);
        }

        if (filtered.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="py-12 text-center text-slate-400 font-bold">
                        No leads found matching your criteria.
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = filtered.map(lead => {
            const stageObj = PIPELINE_STAGES.find(s => s.id === lead.stage) || PIPELINE_STAGES[0];
            const cleanPhone = cleanPhoneNumber(lead.phone);
            const whatsappText = encodeURIComponent(`Hi ${lead.contactPerson || lead.clientName || 'there'},\n\nThis is Prince from VilPower Digital.`);

            return `
                <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800">
                    <td class="py-3.5 px-4">
                        <div class="font-black text-slate-900 dark:text-white">${escapeHtml(lead.clientName || 'Unnamed')}</div>
                        ${lead.contactPerson ? `<div class="text-xs text-slate-400 font-medium">${escapeHtml(lead.contactPerson)}</div>` : ''}
                    </td>
                    <td class="py-3.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                        ${lead.phone ? `
                            <div class="flex items-center gap-2">
                                <span>${escapeHtml(lead.phone)}</span>
                                <a href="https://wa.me/${cleanPhone}?text=${whatsappText}" target="_blank" class="text-emerald-600 hover:text-emerald-700" title="WhatsApp"><iconify-icon icon="solar:chat-round-dots-bold" width="16"></iconify-icon></a>
                                <a href="tel:${cleanPhone}" class="text-blue-600 hover:text-blue-700" title="Call"><iconify-icon icon="solar:phone-bold" width="16"></iconify-icon></a>
                            </div>
                        ` : '—'}
                    </td>
                    <td class="py-3.5 px-4 font-mono font-black text-emerald-600 dark:text-emerald-400">
                        ${formatINR(lead.dealValue)}
                    </td>
                    <td class="py-3.5 px-4">
                        <span class="px-2.5 py-1 rounded-full text-xs font-black ${stageObj.badgeBg} ${stageObj.badgeText}">
                            ${stageObj.name}
                        </span>
                    </td>
                    <td class="py-3.5 px-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        ${lead.nextFollowup || '—'}
                    </td>
                    <td class="py-3.5 px-4 text-xs text-slate-500">
                        <span class="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold">${escapeHtml(lead.source || 'Direct')}</span>
                    </td>
                    <td class="py-3.5 px-4 text-right">
                        <div class="flex items-center justify-end gap-2">
                            <button type="button" onclick="openLeadDetailsModal('${lead.id}')"
                                    class="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                                    title="Edit & Activity Notes">
                                <iconify-icon icon="solar:pen-new-square-bold" width="16"></iconify-icon>
                            </button>
                            <button type="button" onclick="deleteSalesLead('${lead.id}')"
                                    class="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 hover:bg-rose-100 transition-all"
                                    title="Delete Lead">
                                <iconify-icon icon="solar:trash-bin-trash-bold" width="16"></iconify-icon>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ── Render Quotation & Service Estimator ──
    function renderQuotationCalculator() {
        const container = document.getElementById('sales-quotation-container');
        if (!container) return;

        container.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <!-- Left: Service Package Selector -->
                <div class="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-slate-800 shadow-xl space-y-6">
                    <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                        <div>
                            <h3 class="text-lg font-black text-slate-900 dark:text-white">Agency Service Package Estimator</h3>
                            <p class="text-xs text-slate-400">Select services to generate instant client proposals with GST calculation</p>
                        </div>
                        <button type="button" onclick="resetQuotationCalculator()" class="text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors">
                            Reset All
                        </button>
                    </div>

                    <!-- Client Target Name -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Client / Brand Name</label>
                            <input type="text" id="quote-client-name" placeholder="e.g. Acme Retail Pvt Ltd" oninput="calculateQuotation()"
                                   class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Contact Person</label>
                            <input type="text" id="quote-contact-person" placeholder="e.g. Mr. Sharma" oninput="calculateQuotation()"
                                   class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20">
                        </div>
                    </div>

                    <!-- Service Checklist -->
                    <div class="space-y-3">
                        <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Agency Deliverables</label>
                        ${AGENCY_SERVICES.map(service => `
                            <div class="flex items-center justify-between p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer">
                                <label class="flex items-start gap-3 cursor-pointer flex-1 mr-4">
                                    <input type="checkbox" value="${service.id}" data-price="${service.defaultPrice}" data-name="${service.name}"
                                           onchange="calculateQuotation()"
                                           class="quote-service-checkbox w-5 h-5 rounded-lg text-indigo-600 focus:ring-indigo-500 mt-0.5 cursor-pointer">
                                    <div>
                                        <h5 class="text-sm font-bold text-slate-800 dark:text-slate-200">${service.name}</h5>
                                        <p class="text-xs text-slate-400 mt-0.5">${service.desc}</p>
                                    </div>
                                </label>
                                <div class="flex items-center gap-2 shrink-0">
                                    <span class="text-xs text-slate-400 font-bold">₹</span>
                                    <input type="number" id="price-${service.id}" value="${service.defaultPrice}" oninput="calculateQuotation()"
                                           class="w-24 text-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-black text-slate-800 dark:text-white outline-none">
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <!-- Custom Additional Service Item -->
                    <div class="p-4 rounded-2xl border border-dashed border-indigo-200 dark:border-indigo-900 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3">
                        <h5 class="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">+ Add Custom Scope / Deliverable</h5>
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <input type="text" id="quote-custom-title" placeholder="Service title (e.g. Influencer Campaign)" oninput="calculateQuotation()"
                                   class="sm:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none">
                            <input type="number" id="quote-custom-price" placeholder="Price (₹)" min="0" oninput="calculateQuotation()"
                                   class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none">
                        </div>
                    </div>
                </div>

                <!-- Right: Summary & Copy to WhatsApp -->
                <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-slate-800 shadow-xl flex flex-col justify-between space-y-6">
                    <div>
                        <div class="flex items-center gap-3 mb-6">
                            <div class="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                                <iconify-icon icon="solar:bill-list-bold-duotone" width="22"></iconify-icon>
                            </div>
                            <div>
                                <h4 class="text-base font-black text-slate-900 dark:text-white">Proposal Summary</h4>
                                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">VilPower Digital Marketing</span>
                            </div>
                        </div>

                        <!-- Selected Items List -->
                        <div id="quote-summary-list" class="space-y-2 mb-6 divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
                            <p class="text-xs text-slate-400 py-4 text-center">Select services from the left to calculate quotation.</p>
                        </div>

                        <!-- Pricing Math -->
                        <div class="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
                            <div class="flex justify-between font-semibold text-slate-600 dark:text-slate-400">
                                <span>Subtotal:</span>
                                <span id="quote-subtotal" class="font-mono font-bold text-slate-900 dark:text-white">₹0</span>
                            </div>
                            <div class="flex justify-between font-semibold text-slate-600 dark:text-slate-400">
                                <span>GST (18%):</span>
                                <span id="quote-gst" class="font-mono font-bold text-slate-900 dark:text-white">₹0</span>
                            </div>
                            <div class="flex justify-between text-base font-black text-slate-900 dark:text-white pt-3 border-t border-slate-100 dark:border-slate-800">
                                <span>Total Quotation:</span>
                                <span id="quote-total" class="font-mono text-emerald-600 dark:text-emerald-400">₹0</span>
                            </div>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                        <button type="button" onclick="copyQuotationToClipboard()"
                                class="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-200 dark:shadow-none transition-all">
                            <iconify-icon icon="solar:copy-bold" width="18"></iconify-icon>
                            <span>Copy Proposal for WhatsApp / Email</span>
                        </button>
                        <button type="button" onclick="saveQuotationAsLead()"
                                class="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold transition-all">
                            <iconify-icon icon="solar:user-plus-bold" width="16"></iconify-icon>
                            <span>Save as New Lead</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        calculateQuotation();
    }

    // ── Calculate Quotation Live ──
    function calculateQuotation() {
        const checkboxes = document.querySelectorAll('.quote-service-checkbox:checked');
        const summaryList = document.getElementById('quote-summary-list');
        if (!summaryList) return;

        let subtotal = 0;
        const selectedItems = [];

        checkboxes.forEach(cb => {
            const id = cb.value;
            const name = cb.getAttribute('data-name');
            const priceInput = document.getElementById(`price-${id}`);
            const price = Number(priceInput?.value) || Number(cb.getAttribute('data-price')) || 0;
            subtotal += price;
            selectedItems.push({ name, price });
        });

        const customTitle = document.getElementById('quote-custom-title')?.value?.trim();
        const customPrice = Number(document.getElementById('quote-custom-price')?.value) || 0;
        if (customTitle && customPrice > 0) {
            subtotal += customPrice;
            selectedItems.push({ name: customTitle, price: customPrice });
        }

        const gst = Math.round(subtotal * 0.18);
        const total = subtotal + gst;

        document.getElementById('quote-subtotal').textContent = formatINR(subtotal);
        document.getElementById('quote-gst').textContent = formatINR(gst);
        document.getElementById('quote-total').textContent = formatINR(total);

        if (selectedItems.length === 0) {
            summaryList.innerHTML = `<p class="text-xs text-slate-400 py-4 text-center">Select services from the left to calculate quotation.</p>`;
        } else {
            summaryList.innerHTML = selectedItems.map(item => `
                <div class="flex justify-between items-center py-2 text-xs">
                    <span class="font-medium text-slate-700 dark:text-slate-300">${escapeHtml(item.name)}</span>
                    <span class="font-mono font-bold text-slate-900 dark:text-white">${formatINR(item.price)}</span>
                </div>
            `).join('');
        }
    }

    // ── Copy Proposal Text to Clipboard ──
    function copyQuotationToClipboard() {
        const clientName = document.getElementById('quote-client-name')?.value?.trim() || 'Client';
        const contactPerson = document.getElementById('quote-contact-person')?.value?.trim() || 'Sir/Madam';
        const checkboxes = document.querySelectorAll('.quote-service-checkbox:checked');

        const items = [];
        let subtotal = 0;
        checkboxes.forEach(cb => {
            const id = cb.value;
            const name = cb.getAttribute('data-name');
            const priceInput = document.getElementById(`price-${id}`);
            const price = Number(priceInput?.value) || Number(cb.getAttribute('data-price')) || 0;
            subtotal += price;
            items.push(`• ${name} — ${formatINR(price)}`);
        });

        const customTitle = document.getElementById('quote-custom-title')?.value?.trim();
        const customPrice = Number(document.getElementById('quote-custom-price')?.value) || 0;
        if (customTitle && customPrice > 0) {
            subtotal += customPrice;
            items.push(`• ${customTitle} — ${formatINR(customPrice)}`);
        }

        if (items.length === 0) {
            if (typeof window.toast === 'function') window.toast('Select at least one service package', 'error');
            return;
        }

        const gst = Math.round(subtotal * 0.18);
        const total = subtotal + gst;

        const text = `*PROPOSAL & QUOTATION* 📑\n` +
            `*VilPower Digital Marketing Agency*\n\n` +
            `Dear ${contactPerson} (${clientName}),\n\n` +
            `Thank you for discussing your business growth requirements with us. Here is our customized service package:\n\n` +
            `*Deliverables & Scope:*\n` +
            items.join('\n') + `\n\n` +
            `*Subtotal:* ${formatINR(subtotal)}\n` +
            `*GST (18%):* ${formatINR(gst)}\n` +
            `*Total Investment:* ${formatINR(total)}\n\n` +
            `Let me know if you would like to proceed or if you need any customizations.\n\n` +
            `Best regards,\n` +
            `*Prince | Sales Executive*\n` +
            `VilPower Digital Marketing`;

        navigator.clipboard.writeText(text).then(() => {
            if (typeof window.toast === 'function') window.toast('Proposal copied to clipboard! Ready to send on WhatsApp.', 'success');
        }).catch(err => {
            if (typeof window.toast === 'function') window.toast('Failed to copy: ' + err.message, 'error');
        });
    }

    // ── Save Current Quotation as Lead ──
    function saveQuotationAsLead() {
        const clientName = document.getElementById('quote-client-name')?.value?.trim();
        const contactPerson = document.getElementById('quote-contact-person')?.value?.trim();
        const checkboxes = document.querySelectorAll('.quote-service-checkbox:checked');

        if (!clientName) {
            if (typeof window.toast === 'function') window.toast('Please enter client/brand name', 'error');
            return;
        }

        const services = [];
        let subtotal = 0;
        checkboxes.forEach(cb => {
            const id = cb.value;
            const name = cb.getAttribute('data-name');
            const priceInput = document.getElementById(`price-${id}`);
            const price = Number(priceInput?.value) || Number(cb.getAttribute('data-price')) || 0;
            subtotal += price;
            services.push(name);
        });

        const customTitle = document.getElementById('quote-custom-title')?.value?.trim();
        const customPrice = Number(document.getElementById('quote-custom-price')?.value) || 0;
        if (customTitle && customPrice > 0) {
            subtotal += customPrice;
            services.push(customTitle);
        }

        openAddLeadModal({
            clientName,
            contactPerson,
            dealValue: subtotal,
            services,
            stage: 'proposal'
        });
    }

    // ── Render Sales Analytics ──
    function renderSalesAnalytics() {
        const container = document.getElementById('sales-analytics-container');
        if (!container) return;

        // Group by Source
        const sourceMap = {};
        let totalVal = 0;
        salesLeads.forEach(l => {
            const src = l.source || 'Direct Outreach';
            sourceMap[src] = (sourceMap[src] || 0) + 1;
            totalVal += (Number(l.dealValue) || 0);
        });

        // Group by Stage
        const stageMap = {};
        PIPELINE_STAGES.forEach(s => stageMap[s.id] = 0);
        salesLeads.forEach(l => {
            const st = l.stage || 'new';
            stageMap[st] = (stageMap[st] || 0) + 1;
        });

        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <!-- Lead Sources Breakdown -->
                <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-slate-800 shadow-xl space-y-6">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                            <iconify-icon icon="solar:pie-chart-2-bold-duotone" width="22"></iconify-icon>
                        </div>
                        <div>
                            <h4 class="text-base font-black text-slate-900 dark:text-white">Lead Acquisition Sources</h4>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Channel Performance</span>
                        </div>
                    </div>

                    <div class="space-y-4">
                        ${Object.entries(sourceMap).map(([src, count]) => {
            const pct = salesLeads.length > 0 ? Math.round((count / salesLeads.length) * 100) : 0;
            return `
                                <div class="space-y-1.5">
                                    <div class="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                                        <span>${escapeHtml(src)}</span>
                                        <span class="font-mono">${count} leads (${pct}%)</span>
                                    </div>
                                    <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                        <div class="bg-indigo-600 h-full rounded-full" style="width: ${pct}%"></div>
                                    </div>
                                </div>
                            `;
        }).join('')}
                    </div>
                </div>

                <!-- Conversion Funnel Stages -->
                <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-slate-800 shadow-xl space-y-6">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                            <iconify-icon icon="solar:funnel-bold-duotone" width="22"></iconify-icon>
                        </div>
                        <div>
                            <h4 class="text-base font-black text-slate-900 dark:text-white">Conversion Pipeline Funnel</h4>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stage Volumes</span>
                        </div>
                    </div>

                    <div class="space-y-3">
                        ${PIPELINE_STAGES.map(stage => {
            const count = stageMap[stage.id] || 0;
            const pct = salesLeads.length > 0 ? Math.round((count / salesLeads.length) * 100) : 0;
            return `
                                <div class="flex items-center justify-between p-3 rounded-xl ${stage.badgeBg} border border-slate-200/50 dark:border-slate-800">
                                    <div class="flex items-center gap-2">
                                        <iconify-icon icon="${stage.icon}" width="16" class="${stage.badgeText}"></iconify-icon>
                                        <span class="text-xs font-bold ${stage.badgeText}">${stage.name}</span>
                                    </div>
                                    <span class="text-xs font-mono font-black ${stage.badgeText}">${count}</span>
                                </div>
                            `;
        }).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    // ── Drag and Drop Handlers ──
    window.handleSalesDragStart = function (ev, leadId) {
        ev.dataTransfer.setData('text/plain', leadId);
    };

    window.handleSalesDrop = function (ev, targetStage) {
        ev.preventDefault();
        const leadId = ev.dataTransfer.getData('text/plain');
        if (leadId && targetStage) {
            updateLeadStage(leadId, targetStage);
        }
    };

    // ── Update Lead Stage in Firebase ──
    window.updateLeadStage = async function (leadId, newStage) {
        if (!leadId || !newStage || !window.db) return;
        try {
            const { ref, update } = window.firebaseDatabase || {};
            const updates = {
                [`worksync/sales_leads/${leadId}/stage`]: newStage,
                [`worksync/sales_leads/${leadId}/updatedAt`]: Date.now()
            };
            if (newStage === 'won') {
                updates[`worksync/sales_leads/${leadId}/closedAt`] = Date.now();
            }
            await update(ref(window.db), updates);
            if (typeof window.toast === 'function') window.toast(`Lead stage updated to ${newStage}`, 'success');
        } catch (err) {
            if (typeof window.toast === 'function') window.toast('Failed to update stage: ' + err.message, 'error');
        }
    };

    // ── Open Add Lead Modal ──
    window.openAddLeadModal = function (prefill = {}) {
        const modal = document.getElementById('addLeadModal');
        if (!modal) return;

        document.getElementById('lead-edit-id').value = prefill.id || '';
        document.getElementById('lead-client-name').value = prefill.clientName || '';
        document.getElementById('lead-contact-person').value = prefill.contactPerson || '';
        document.getElementById('lead-phone').value = prefill.phone || '';
        document.getElementById('lead-email').value = prefill.email || '';
        document.getElementById('lead-deal-value').value = prefill.dealValue || '';
        document.getElementById('lead-stage-select').value = prefill.stage || 'new';
        document.getElementById('lead-source-select').value = prefill.source || 'Meta Ads';
        document.getElementById('lead-followup-date').value = prefill.nextFollowup || '';
        document.getElementById('lead-notes').value = prefill.notes || '';

        // Prefill services
        const selectedServices = prefill.services || [];
        document.querySelectorAll('.lead-service-checkbox').forEach(cb => {
            cb.checked = selectedServices.includes(cb.value);
        });

        document.getElementById('lead-modal-title').textContent = prefill.id ? 'Edit Sales Lead' : 'Add New Client Lead';
        modal.showModal();
    };

    // ── Save Lead to Firebase ──
    window.saveSalesLead = async function () {
        const id = document.getElementById('lead-edit-id')?.value || ('LEAD-' + Date.now());
        const clientName = document.getElementById('lead-client-name')?.value?.trim();
        const contactPerson = document.getElementById('lead-contact-person')?.value?.trim();
        const phone = document.getElementById('lead-phone')?.value?.trim();
        const email = document.getElementById('lead-email')?.value?.trim();
        const dealValue = Number(document.getElementById('lead-deal-value')?.value) || 0;
        const stage = document.getElementById('lead-stage-select')?.value || 'new';
        const source = document.getElementById('lead-source-select')?.value || 'Meta Ads';
        const nextFollowup = document.getElementById('lead-followup-date')?.value || '';
        const notes = document.getElementById('lead-notes')?.value?.trim() || '';

        if (!clientName) {
            if (typeof window.toast === 'function') window.toast('Please enter client/company name', 'error');
            return;
        }

        const services = [];
        document.querySelectorAll('.lead-service-checkbox:checked').forEach(cb => {
            services.push(cb.value);
        });

        try {
            const { ref, update } = window.firebaseDatabase || {};
            const existing = salesLeads.find(l => l.id === id);

            const leadData = {
                id,
                clientName,
                contactPerson,
                phone,
                email,
                dealValue,
                stage,
                source,
                services,
                nextFollowup,
                notes,
                createdBy: existing?.createdBy || window.currentUser?.email || 'princevilpower@gmail.com',
                createdAt: existing?.createdAt || Date.now(),
                updatedAt: Date.now()
            };

            if (stage === 'won' && !existing?.closedAt) {
                leadData.closedAt = Date.now();
            }

            await update(ref(window.db), {
                [`worksync/sales_leads/${id}`]: leadData
            });

            document.getElementById('addLeadModal')?.close();
            if (typeof window.toast === 'function') window.toast(`Lead "${clientName}" saved successfully!`, 'success');
        } catch (err) {
            if (typeof window.toast === 'function') window.toast('Failed to save lead: ' + err.message, 'error');
        }
    };

    // ── Delete Lead ──
    window.deleteSalesLead = async function (leadId) {
        if (!confirm('Are you sure you want to remove this lead?')) return;
        try {
            const { ref, set } = window.firebaseDatabase || {};
            await set(ref(window.db, `worksync/sales_leads/${leadId}`), null);
            if (typeof window.toast === 'function') window.toast('Lead deleted', 'success');
        } catch (err) {
            if (typeof window.toast === 'function') window.toast('Failed to delete lead: ' + err.message, 'error');
        }
    };

    // ── Lead Details / Activity Notes Modal ──
    window.openLeadDetailsModal = function (leadId) {
        const lead = salesLeads.find(l => l.id === leadId);
        if (!lead) return;

        openAddLeadModal(lead);
    };

    // ── Open Edit Monthly Target Modal ──
    window.openEditTargetModal = function () {
        const modal = document.getElementById('editTargetModal');
        if (!modal) return;
        document.getElementById('target-amount-input').value = salesTarget;
        modal.showModal();
    };

    window.saveMonthlyTarget = async function () {
        const amount = Number(document.getElementById('target-amount-input')?.value) || 500000;
        const currentMonth = getMonthKey();
        try {
            const { ref, set } = window.firebaseDatabase || {};
            await set(ref(window.db, `worksync/sales_targets/${currentMonth}`), {
                targetAmount: amount,
                updatedAt: Date.now(),
                updatedBy: window.currentUser?.email || 'admin'
            });
            salesTarget = amount;
            document.getElementById('editTargetModal')?.close();
            renderSalesKpis();
            if (typeof window.toast === 'function') window.toast(`Monthly target updated to ${formatINR(amount)}`, 'success');
        } catch (err) {
            if (typeof window.toast === 'function') window.toast('Failed to save target: ' + err.message, 'error');
        }
    };

    // ── Tab Switcher ──
    window.switchSalesHubTab = function (tab) {
        currentSalesViewTab = tab;
        document.querySelectorAll('.sales-tab-btn').forEach(btn => {
            const isTarget = btn.getAttribute('data-tab') === tab;
            btn.classList.toggle('sales-tab-active', isTarget);
            btn.classList.toggle('bg-indigo-600', isTarget);
            btn.classList.toggle('text-white', isTarget);
            btn.classList.toggle('bg-slate-100', !isTarget);
            btn.classList.toggle('dark:bg-slate-800', !isTarget);
            btn.classList.toggle('text-slate-600', !isTarget);
            btn.classList.toggle('dark:text-slate-300', !isTarget);
        });

        document.getElementById('sales-kanban-board')?.classList.toggle('hidden', tab !== 'pipeline');
        document.getElementById('sales-table-view-container')?.classList.toggle('hidden', tab !== 'table');
        document.getElementById('sales-quotation-container')?.classList.toggle('hidden', tab !== 'quotation');
        document.getElementById('sales-analytics-container')?.classList.toggle('hidden', tab !== 'analytics');

        renderSalesHub();
    };

    window.filterSalesLeads = function () {
        currentLeadSearchQuery = document.getElementById('sales-search-input')?.value?.trim() || '';
        currentLeadFilterStage = document.getElementById('sales-stage-filter')?.value || 'all';
        currentLeadFilterSource = document.getElementById('sales-source-filter')?.value || 'all';
        renderSalesHub();
    };

    window.resetQuotationCalculator = function () {
        document.querySelectorAll('.quote-service-checkbox').forEach(cb => cb.checked = false);
        if (document.getElementById('quote-client-name')) document.getElementById('quote-client-name').value = '';
        if (document.getElementById('quote-contact-person')) document.getElementById('quote-contact-person').value = '';
        if (document.getElementById('quote-custom-title')) document.getElementById('quote-custom-title').value = '';
        if (document.getElementById('quote-custom-price')) document.getElementById('quote-custom-price').value = '';
        calculateQuotation();
    };

    // Export to global scope
    window.isSalesUser = isSalesUser;
    window.initSalesHub = initSalesHub;
    window.renderSalesHub = renderSalesHub;
    window.calculateQuotation = calculateQuotation;
    window.copyQuotationToClipboard = copyQuotationToClipboard;
    window.saveQuotationAsLead = saveQuotationAsLead;

})();
