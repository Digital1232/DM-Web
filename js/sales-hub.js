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
    let salesVisits = [];
    let salesTarget = 500000; // Default ₹5 Lakhs monthly target
    let salesUnsub = null;
    let targetUnsub = null;
    let visitsUnsub = null;
    let currentSalesViewTab = 'pipeline'; // 'pipeline' | 'table' | 'quotation' | 'analytics' | 'visits'
    let currentLeadFilterStage = 'all';
    let currentLeadFilterSource = 'all';
    let currentLeadSearchQuery = '';
    let currentVisitFilterUser = 'all';
    let currentVisitFilterDate = 'today';
    let currentVisitSearchQuery = '';
    let visitsLeafletMap = null;
    let visitsMapMarkersLayer = null;
    let activeVisitTimerInterval = null;
    let currentCheckInPhotoBase64 = null;

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

        // Listen for field sales visits
        if (visitsUnsub) visitsUnsub();
        const visitsRef = ref(window.db, 'worksync/sales_visits');
        visitsUnsub = onValue(visitsRef, (snapshot) => {
            const data = snapshot.val() || {};
            salesVisits = Object.entries(data).map(([id, item]) => ({
                id,
                ...item
            })).sort((a, b) => (b.checkInTime || b.createdAt || 0) - (a.checkInTime || a.createdAt || 0));

            updateActiveVisitBanner();
            if (currentSalesViewTab === 'visits') {
                renderVisitsDashboard();
            }
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
        } else if (currentSalesViewTab === 'visits') {
            renderVisitsDashboard();
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
                        <button type="button" onclick="openSalesCheckInModal('${lead.id}')"
                                class="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-all flex items-center justify-center"
                                title="GPS Check-In at Client Site">
                            <iconify-icon icon="solar:map-point-wave-bold" width="16"></iconify-icon>
                        </button>
                        ${lead.address || (lead.lat && lead.lng) ? `
                            <button type="button" onclick="openClientNavigation('${lead.id}')"
                                    class="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-all flex items-center justify-center"
                                    title="Navigate to Client in Google Maps">
                                <iconify-icon icon="solar:routing-2-bold" width="16"></iconify-icon>
                            </button>
                        ` : ''}
                        <button type="button" onclick="openLeadDetailsModal('${lead.id}')"
                                class="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-all"
                                title="View / Edit Lead Details">
                            <iconify-icon icon="solar:pen-bold" width="16"></iconify-icon>
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
                        <div class="flex items-center justify-end gap-1.5">
                            <button type="button" onclick="openSalesCheckInModal('${lead.id}')"
                                    class="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-all"
                                    title="GPS Check-In at Client Site">
                                <iconify-icon icon="solar:map-point-wave-bold" width="16"></iconify-icon>
                            </button>
                            ${lead.address || (lead.lat && lead.lng) ? `
                                <button type="button" onclick="openClientNavigation('${lead.id}')"
                                        class="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-all"
                                        title="Navigate in Google Maps">
                                    <iconify-icon icon="solar:routing-2-bold" width="16"></iconify-icon>
                                </button>
                            ` : ''}
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

        document.getElementById('lead-address').value = prefill.address || '';
        document.getElementById('lead-lat').value = prefill.lat || '';
        document.getElementById('lead-lng').value = prefill.lng || '';

        const titleEl = document.getElementById('leadModalTitle') || document.getElementById('lead-modal-title');
        if (titleEl) titleEl.textContent = prefill.id ? 'Edit Sales Lead' : 'Add New Client Lead';
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

            const address = document.getElementById('lead-address')?.value?.trim() || '';
            const lat = document.getElementById('lead-lat')?.value ? Number(document.getElementById('lead-lat').value) : (existing?.lat || null);
            const lng = document.getElementById('lead-lng')?.value ? Number(document.getElementById('lead-lng').value) : (existing?.lng || null);

            const leadData = {
                id,
                clientName,
                contactPerson,
                phone,
                email,
                address,
                lat,
                lng,
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
        document.getElementById('sales-visits-container')?.classList.toggle('hidden', tab !== 'visits');

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


    // ═══════════════════════════════════════════════════════════════════════════
    // GPS GEOLOCATION & FIELD SALES VISIT TRACKING
    // ═══════════════════════════════════════════════════════════════════════════

    // ── Helper: Get High-Accuracy GPS Position ──
    function getCurrentGPSPosition() {
        return new Promise((resolve, reject) => {
            if (!('geolocation' in navigator)) {
                return reject(new Error('Geolocation is not supported on this device.'));
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    resolve({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        accuracy: Math.round(pos.coords.accuracy || 0),
                        timestamp: pos.timestamp || Date.now()
                    });
                },
                (err) => {
                    let msg = 'Unable to fetch GPS position.';
                    if (err.code === 1) msg = 'Location permission denied. Please allow location access in your device settings.';
                    else if (err.code === 2) msg = 'GPS signal unavailable. Please ensure location is enabled.';
                    else if (err.code === 3) msg = 'GPS request timed out. Please try again.';
                    reject(new Error(msg));
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
            );
        });
    }

    // ── Helper: Reverse Geocode Coordinates into Landmark/Address ──
    async function reverseGeocode(lat, lng) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);
            const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
                signal: controller.signal,
                headers: { 'Accept-Language': 'en' }
            });
            clearTimeout(timeoutId);
            if (!resp.ok) throw new Error('Geocoding service unavailable');
            const data = await resp.json();
            const addr = data.address || {};
            const parts = [
                addr.amenity || addr.shop || addr.building || addr.office,
                addr.road || addr.street,
                addr.suburb || addr.neighbourhood || addr.residential,
                addr.city || addr.town || addr.village || addr.county,
                addr.state
            ].filter(Boolean);
            return parts.length > 0 ? parts.join(', ') : (data.display_name || `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
        } catch (e) {
            return `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
        }
    }

    // ── Open Sales Check-In Modal ──
    window.openSalesCheckInModal = async function (prefillLeadId = null) {
        const modal = document.getElementById('salesCheckInModal');
        if (!modal) return;

        // Reset form & state
        currentCheckInPhotoBase64 = null;
        document.getElementById('salesCheckInForm')?.reset();
        document.getElementById('checkin-photo-preview-wrap')?.classList.add('hidden');
        document.getElementById('checkin-custom-client-fields')?.classList.add('hidden');
        
        // Populate Leads Dropdown
        const leadSelect = document.getElementById('checkin-lead-select');
        if (leadSelect) {
            leadSelect.innerHTML = `
                <option value="">-- Choose Existing Lead / Client --</option>
                ${salesLeads.map(l => `
                    <option value="${l.id}">${escapeHtml(l.clientName || 'Unnamed')} (${escapeHtml(l.contactPerson || 'Contact')})</option>
                `).join('')}
                <option value="new_client">+ New Prospect / Walk-in Client</option>
            `;
            if (prefillLeadId) {
                leadSelect.value = prefillLeadId;
            }
        }

        // Set detecting UI state
        const statusEl = document.getElementById('checkin-gps-status');
        const addressEl = document.getElementById('checkin-gps-address');
        const coordsEl = document.getElementById('checkin-gps-coords');
        const iconEl = document.getElementById('checkin-gps-icon');

        if (statusEl) statusEl.textContent = 'Detecting high-accuracy GPS...';
        if (addressEl) addressEl.textContent = 'Acquiring satellite lock & address...';
        if (coordsEl) coordsEl.textContent = '';
        if (iconEl) iconEl.innerHTML = '<iconify-icon icon="solar:radar-2-bold-duotone" width="20" class="animate-spin text-indigo-600 dark:text-indigo-400"></iconify-icon>';

        modal.showModal();

        // Trigger GPS acquisition
        await refreshCheckInGps();
    };

    // ── Refresh Check-In GPS Position ──
    window.refreshCheckInGps = async function () {
        const statusEl = document.getElementById('checkin-gps-status');
        const addressEl = document.getElementById('checkin-gps-address');
        const coordsEl = document.getElementById('checkin-gps-coords');
        const iconEl = document.getElementById('checkin-gps-icon');

        if (statusEl) statusEl.textContent = 'Acquiring GPS satellite fix...';
        if (iconEl) iconEl.innerHTML = '<iconify-icon icon="solar:radar-2-bold-duotone" width="20" class="animate-spin text-indigo-600 dark:text-indigo-400"></iconify-icon>';

        try {
            const pos = await getCurrentGPSPosition();
            document.getElementById('checkin-lat').value = pos.lat;
            document.getElementById('checkin-lng').value = pos.lng;
            document.getElementById('checkin-accuracy').value = pos.accuracy;

            if (coordsEl) coordsEl.textContent = `Coordinates: ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)} (±${pos.accuracy}m accuracy)`;
            if (statusEl) statusEl.textContent = 'GPS Verified & Locked ✓';
            if (iconEl) iconEl.innerHTML = '<iconify-icon icon="solar:check-circle-bold" width="22" class="text-emerald-600 dark:text-emerald-400"></iconify-icon>';

            const resolvedAddress = await reverseGeocode(pos.lat, pos.lng);
            document.getElementById('checkin-address').value = resolvedAddress;
            if (addressEl) addressEl.textContent = resolvedAddress;
        } catch (err) {
            console.warn('[GPS CheckIn Error]:', err);
            if (statusEl) statusEl.textContent = 'GPS Warning';
            if (addressEl) addressEl.textContent = err.message || 'Could not verify exact coordinates.';
            if (iconEl) iconEl.innerHTML = '<iconify-icon icon="solar:danger-triangle-bold" width="20" class="text-amber-500"></iconify-icon>';
        }
    };

    // ── Handle Check-In Lead Selection ──
    window.handleCheckInLeadSelect = function (val) {
        const customFields = document.getElementById('checkin-custom-client-fields');
        if (!customFields) return;
        if (val === 'new_client') {
            customFields.classList.remove('hidden');
        } else {
            customFields.classList.add('hidden');
        }
    };

    // ── Photo Preview Handler for Check-In ──
    window.previewCheckInPhoto = function (input) {
        if (!input.files || !input.files[0]) return;
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = function (e) {
            // Compress image to maintain high performance in Realtime DB
            const img = new Image();
            img.onload = function () {
                const canvas = document.createElement('canvas');
                const maxDim = 800;
                let w = img.width, h = img.height;
                if (w > h && w > maxDim) { h = Math.round(h * (maxDim / w)); w = maxDim; }
                else if (h > maxDim) { w = Math.round(w * (maxDim / h)); h = maxDim; }
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                currentCheckInPhotoBase64 = canvas.toDataURL('image/jpeg', 0.7);
                const previewImg = document.getElementById('checkin-photo-preview');
                if (previewImg) previewImg.src = currentCheckInPhotoBase64;
                document.getElementById('checkin-photo-preview-wrap')?.classList.remove('hidden');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    };

    window.removeCheckInPhoto = function () {
        currentCheckInPhotoBase64 = null;
        if (document.getElementById('checkin-photo-file')) document.getElementById('checkin-photo-file').value = '';
        document.getElementById('checkin-photo-preview-wrap')?.classList.add('hidden');
    };

    // ── Submit Check-In to Firebase ──
    window.submitSalesCheckIn = async function (e) {
        if (e) e.preventDefault();
        if (!window.db) return;

        const leadChoice = document.getElementById('checkin-lead-select')?.value;
        if (!leadChoice) {
            if (typeof window.toast === 'function') window.toast('Please select a client or choose New Prospect', 'error');
            return;
        }

        let clientId = null;
        let clientName = '';
        let contactPerson = '';
        let phone = '';
        let address = document.getElementById('checkin-address')?.value || '';

        if (leadChoice === 'new_client') {
            clientName = document.getElementById('checkin-custom-name')?.value?.trim();
            contactPerson = document.getElementById('checkin-custom-person')?.value?.trim() || '';
            phone = document.getElementById('checkin-custom-phone')?.value?.trim() || '';
            if (!clientName) {
                if (typeof window.toast === 'function') window.toast('Please enter company/brand name for new prospect', 'error');
                return;
            }
        } else {
            const lead = salesLeads.find(l => l.id === leadChoice);
            if (lead) {
                clientId = lead.id;
                clientName = lead.clientName || 'Unnamed Client';
                contactPerson = lead.contactPerson || '';
                phone = lead.phone || '';
                if (!address && lead.address) address = lead.address;
            }
        }

        const latVal = document.getElementById('checkin-lat')?.value;
        const lngVal = document.getElementById('checkin-lng')?.value;
        const lat = latVal ? Number(latVal) : null;
        const lng = lngVal ? Number(lngVal) : null;
        const accuracy = Number(document.getElementById('checkin-accuracy')?.value) || 0;
        const meetingType = document.getElementById('checkin-meeting-type')?.value || 'Requirement Discussion';
        const initialNotes = document.getElementById('checkin-notes')?.value?.trim() || '';

        const visitId = 'VISIT-' + Date.now();
        const visitData = {
            id: visitId,
            salesUserEmail: window.currentUser?.email || 'princevilpower@gmail.com',
            salesUserName: window.currentUser?.name || 'Prince (Sales Exec)',
            clientId,
            clientName,
            contactPerson,
            phone,
            address,
            checkInTime: Date.now(),
            checkInLat: lat,
            checkInLng: lng,
            checkInAccuracy: accuracy,
            meetingType,
            initialNotes,
            photoUrl: currentCheckInPhotoBase64 || null,
            status: 'active',
            createdAt: Date.now()
        };

        try {
            const { ref, set, update } = window.firebaseDatabase || {};
            await set(ref(window.db, `worksync/sales_visits/${visitId}`), visitData);

            // If linked to lead, save verified GPS location to lead if lead doesn't have one
            if (clientId && lat && lng) {
                await update(ref(window.db, `worksync/sales_leads/${clientId}`), {
                    lat,
                    lng,
                    address: address || undefined,
                    lastVisitedAt: Date.now()
                });
            }

            document.getElementById('salesCheckInModal')?.close();
            if (typeof window.toast === 'function') window.toast(`📍 Checked in at ${clientName} successfully!`, 'success');
            updateActiveVisitBanner();
            if (currentSalesViewTab === 'visits') renderVisitsDashboard();
        } catch (err) {
            console.error('[CheckIn Submit Error]:', err);
            if (typeof window.toast === 'function') window.toast('Failed to record check-in: ' + err.message, 'error');
        }
    };

    // ── Open Check-Out Modal ──
    window.openSalesCheckOutModal = async function (visitId = null) {
        let visit = null;
        if (visitId) {
            visit = salesVisits.find(v => v.id === visitId);
        } else {
            const myEmail = (window.currentUser?.email || '').toLowerCase();
            visit = salesVisits.find(v => v.status === 'active' && (v.salesUserEmail || '').toLowerCase() === myEmail);
        }

        if (!visit) {
            if (typeof window.toast === 'function') window.toast('No active visit found to check out.', 'info');
            return;
        }

        const modal = document.getElementById('salesCheckOutModal');
        if (!modal) return;

        document.getElementById('salesCheckOutForm')?.reset();
        document.getElementById('checkout-visit-id').value = visit.id;
        document.getElementById('checkout-client-name').textContent = visit.clientName || 'Client Visit';

        const startTimeStr = new Date(visit.checkInTime || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const elapsedMins = Math.max(1, Math.round((Date.now() - (visit.checkInTime || Date.now())) / 60000));

        document.getElementById('checkout-time-info').textContent = `Checked in at ${startTimeStr} · Meeting Purpose: ${visit.meetingType || 'Discussion'}`;
        document.getElementById('checkout-duration-badge').textContent = `⏱️ ${elapsedMins} mins`;

        // Pre-fill tomorrow's date for follow-up as default convenience
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        if (document.getElementById('checkout-followup-date')) {
            document.getElementById('checkout-followup-date').value = tomorrowStr;
        }

        // Try getting checkout coordinates in background
        getCurrentGPSPosition().then(pos => {
            document.getElementById('checkout-lat').value = pos.lat;
            document.getElementById('checkout-lng').value = pos.lng;
        }).catch(() => {});

        modal.showModal();
    };

    // ── Submit Check-Out to Firebase ──
    window.submitSalesCheckOut = async function (e) {
        if (e) e.preventDefault();
        if (!window.db) return;

        const visitId = document.getElementById('checkout-visit-id')?.value;
        if (!visitId) return;

        const visit = salesVisits.find(v => v.id === visitId);
        const checkOutTime = Date.now();
        const durationMinutes = visit?.checkInTime ? Math.max(1, Math.round((checkOutTime - visit.checkInTime) / 60000)) : 1;
        const outcome = document.getElementById('checkout-outcome')?.value || 'Discussion Ongoing';
        const meetingNotes = document.getElementById('checkout-notes')?.value?.trim() || '';
        const followUpDate = document.getElementById('checkout-followup-date')?.value || '';
        const followUpAction = document.getElementById('checkout-followup-action')?.value?.trim() || '';

        const latVal = document.getElementById('checkout-lat')?.value;
        const lngVal = document.getElementById('checkout-lng')?.value;

        const updateData = {
            checkOutTime,
            durationMinutes,
            outcome,
            meetingNotes,
            followUpDate,
            followUpAction,
            status: 'completed',
            updatedAt: Date.now()
        };

        if (latVal && lngVal) {
            updateData.checkOutLat = Number(latVal);
            updateData.checkOutLng = Number(lngVal);
        }

        try {
            const { ref, update } = window.firebaseDatabase || {};
            await update(ref(window.db, `worksync/sales_visits/${visitId}`), updateData);

            // If visit linked to lead, update lead's follow up and stage if Won
            if (visit && visit.clientId) {
                const leadUpdates = {
                    lastVisitedAt: checkOutTime,
                    nextFollowup: followUpDate || undefined,
                    updatedAt: Date.now()
                };
                if (outcome.includes('Closed Won')) {
                    leadUpdates.stage = 'won';
                    leadUpdates.closedAt = Date.now();
                }
                await update(ref(window.db, `worksync/sales_leads/${visit.clientId}`), leadUpdates);
            }

            document.getElementById('salesCheckOutModal')?.close();
            if (typeof window.toast === 'function') window.toast(`🏁 Visit at ${visit?.clientName || 'Client'} completed (${durationMinutes} mins)!`, 'success');
            updateActiveVisitBanner();
            if (currentSalesViewTab === 'visits') renderVisitsDashboard();
        } catch (err) {
            console.error('[CheckOut Error]:', err);
            if (typeof window.toast === 'function') window.toast('Failed to record check-out: ' + err.message, 'error');
        }
    };

    // ── Active Visit Sticky Banner ──
    function updateActiveVisitBanner() {
        const banner = document.getElementById('sales-active-visit-banner');
        if (!banner) return;

        const myEmail = (window.currentUser?.email || '').toLowerCase();
        const active = salesVisits.find(v => v.status === 'active' && (v.salesUserEmail || '').toLowerCase() === myEmail);

        if (activeVisitTimerInterval) {
            clearInterval(activeVisitTimerInterval);
            activeVisitTimerInterval = null;
        }

        if (!active) {
            banner.classList.add('hidden');
            banner.innerHTML = '';
            return;
        }

        function updateElapsedText() {
            const elapsedMins = Math.max(1, Math.round((Date.now() - (active.checkInTime || Date.now())) / 60000));
            const timerEl = document.getElementById('active-visit-elapsed-timer');
            if (timerEl) timerEl.textContent = `${elapsedMins} mins elapsed`;
        }

        const startTimeStr = new Date(active.checkInTime || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        banner.classList.remove('hidden');
        banner.innerHTML = `
            <div class="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xl shadow-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-emerald-400/30 animate-pulse-slow">
                <div class="flex items-center gap-3.5">
                    <div class="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-inner">
                        <iconify-icon icon="solar:map-point-wave-bold" width="28"></iconify-icon>
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-white text-emerald-800 uppercase tracking-widest">Active Meeting</span>
                            <span class="text-xs text-emerald-100 font-semibold">Started at ${startTimeStr}</span>
                        </div>
                        <h4 class="text-base font-black text-white mt-0.5">${escapeHtml(active.clientName || 'Client Visit')}</h4>
                        <p class="text-xs text-emerald-100/90 font-medium">${escapeHtml(active.address || active.meetingType || 'On-site Client Meeting')}</p>
                    </div>
                </div>

                <div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <span id="active-visit-elapsed-timer" class="px-3.5 py-1.5 rounded-xl bg-black/20 text-xs font-mono font-black text-white">1 min elapsed</span>
                    <button type="button" onclick="openSalesCheckOutModal('${active.id}')"
                            class="px-5 py-2.5 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 font-black text-xs shadow-lg transition-all flex items-center gap-1.5 active:scale-95">
                        <iconify-icon icon="solar:flag-2-bold" width="16"></iconify-icon>
                        <span>Complete Visit</span>
                    </button>
                </div>
            </div>
        `;

        updateElapsedText();
        activeVisitTimerInterval = setInterval(updateElapsedText, 30000);
    }

    // ── Render Full Field GPS & Visits Dashboard ──
    function renderVisitsDashboard() {
        const container = document.getElementById('sales-visits-container');
        if (!container) return;

        // Apply filters
        let filtered = salesVisits;
        if (currentVisitFilterUser !== 'all') {
            filtered = filtered.filter(v => (v.salesUserEmail || '').toLowerCase() === currentVisitFilterUser.toLowerCase());
        }

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoTs = weekAgo.getTime();

        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        const monthAgoTs = monthAgo.getTime();

        if (currentVisitFilterDate === 'today') {
            filtered = filtered.filter(v => {
                const dStr = new Date(v.checkInTime || 0).toISOString().split('T')[0];
                return dStr === todayStr;
            });
        } else if (currentVisitFilterDate === 'yesterday') {
            filtered = filtered.filter(v => {
                const dStr = new Date(v.checkInTime || 0).toISOString().split('T')[0];
                return dStr === yesterdayStr;
            });
        } else if (currentVisitFilterDate === 'week') {
            filtered = filtered.filter(v => (v.checkInTime || 0) >= weekAgoTs);
        } else if (currentVisitFilterDate === 'month') {
            filtered = filtered.filter(v => (v.checkInTime || 0) >= monthAgoTs);
        }

        if (currentVisitSearchQuery) {
            const q = currentVisitSearchQuery.toLowerCase();
            filtered = filtered.filter(v => 
                (v.clientName || '').toLowerCase().includes(q) ||
                (v.contactPerson || '').toLowerCase().includes(q) ||
                (v.address || '').toLowerCase().includes(q) ||
                (v.salesUserName || '').toLowerCase().includes(q) ||
                (v.meetingNotes || '').toLowerCase().includes(q) ||
                (v.outcome || '').toLowerCase().includes(q)
            );
        }

        // Metrics Calculation
        const visitsToday = salesVisits.filter(v => new Date(v.checkInTime || 0).toISOString().split('T')[0] === todayStr).length;
        const totalDurationMins = filtered.reduce((sum, v) => sum + (Number(v.durationMinutes) || 0), 0);
        const totalMeetingHours = (totalDurationMins / 60).toFixed(1);
        const completedCount = filtered.filter(v => v.status === 'completed').length;
        const activeCount = filtered.filter(v => v.status === 'active').length;

        // Unique sales users for filter dropdown
        const salesUsersMap = new Map();
        salesVisits.forEach(v => {
            if (v.salesUserEmail) {
                salesUsersMap.set(v.salesUserEmail.toLowerCase(), v.salesUserName || v.salesUserEmail);
            }
        });

        container.innerHTML = `
            <!-- Metrics Summary Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-xl flex items-center justify-between">
                    <div>
                        <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Field Activity</span>
                        <h4 class="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">${visitsToday}</h4>
                        <p class="text-xs text-slate-400 mt-0.5">Client visits today</p>
                    </div>
                    <div class="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <iconify-icon icon="solar:map-point-wave-bold" width="24"></iconify-icon>
                    </div>
                </div>

                <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-xl flex items-center justify-between">
                    <div>
                        <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Meeting Time</span>
                        <h4 class="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">${totalMeetingHours} <span class="text-sm font-sans font-bold text-slate-500">hrs</span></h4>
                        <p class="text-xs text-slate-400 mt-0.5">On-site client discussion</p>
                    </div>
                    <div class="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <iconify-icon icon="solar:clock-circle-bold-duotone" width="24"></iconify-icon>
                    </div>
                </div>

                <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-xl flex items-center justify-between">
                    <div>
                        <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Visits Completed</span>
                        <h4 class="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">${completedCount}</h4>
                        <p class="text-xs text-slate-400 mt-0.5">With notes & outcomes</p>
                    </div>
                    <div class="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <iconify-icon icon="solar:check-circle-bold-duotone" width="24"></iconify-icon>
                    </div>
                </div>

                <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-xl flex items-center justify-between">
                    <div>
                        <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Active Check-Ins</span>
                        <h4 class="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">${activeCount}</h4>
                        <p class="text-xs text-slate-400 mt-0.5">Ongoing client meetings</p>
                    </div>
                    <div class="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                        <iconify-icon icon="solar:user-speak-bold-duotone" width="24"></iconify-icon>
                    </div>
                </div>
            </div>

            <!-- Search & Filters Bar -->
            <div class="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-slate-800 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
                <div class="relative w-full md:w-80">
                    <iconify-icon icon="solar:magnifer-linear" width="18" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></iconify-icon>
                    <input type="search" id="visit-search-input" value="${escapeHtml(currentVisitSearchQuery)}" oninput="filterSalesVisits()" placeholder="Search visits by client, rep, address..."
                           class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-white">
                </div>

                <div class="flex items-center gap-3 w-full md:w-auto flex-wrap justify-between md:justify-end">
                    <!-- Date Filter -->
                    <select id="visit-date-filter" onchange="filterSalesVisits()"
                            class="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none">
                        <option value="today" ${currentVisitFilterDate === 'today' ? 'selected' : ''}>Today's Visits</option>
                        <option value="yesterday" ${currentVisitFilterDate === 'yesterday' ? 'selected' : ''}>Yesterday</option>
                        <option value="week" ${currentVisitFilterDate === 'week' ? 'selected' : ''}>Last 7 Days</option>
                        <option value="month" ${currentVisitFilterDate === 'month' ? 'selected' : ''}>Last 30 Days</option>
                        <option value="all" ${currentVisitFilterDate === 'all' ? 'selected' : ''}>All Recorded Visits</option>
                    </select>

                    <!-- Sales Person Filter -->
                    <select id="visit-user-filter" onchange="filterSalesVisits()"
                            class="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none">
                        <option value="all">All Sales Executives</option>
                        ${Array.from(salesUsersMap.entries()).map(([email, name]) => `
                            <option value="${email}" ${currentVisitFilterUser.toLowerCase() === email ? 'selected' : ''}>${escapeHtml(name)}</option>
                        `).join('')}
                    </select>

                    <button type="button" onclick="openSalesCheckInModal()"
                            class="px-4 py-2 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all flex items-center gap-1.5">
                        <iconify-icon icon="solar:map-point-wave-bold" width="16"></iconify-icon>
                        <span>+ New Check-In</span>
                    </button>
                </div>
            </div>

            <!-- Interactive Leaflet Map Container -->
            <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-xl space-y-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2.5">
                        <div class="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <iconify-icon icon="solar:map-bold-duotone" width="20"></iconify-icon>
                        </div>
                        <div>
                            <h4 class="text-sm font-black text-slate-900 dark:text-white">Field Visit GPS Map</h4>
                            <p class="text-[11px] text-slate-400 font-semibold">Live pins for client meetings & GPS-verified site visits</p>
                        </div>
                    </div>

                    <div class="flex items-center gap-2">
                        <span class="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> Active Meeting
                        </span>
                        <span class="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                            <span class="w-2 h-2 rounded-full bg-indigo-500"></span> Completed Visit
                        </span>
                    </div>
                </div>

                <div id="sales-map-container" class="w-full h-[400px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 relative z-0">
                    <!-- Leaflet map rendered here -->
                </div>
            </div>

            <!-- Visits Timeline & History -->
            <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-xl space-y-4">
                <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div class="flex items-center gap-2.5">
                        <div class="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <iconify-icon icon="solar:history-bold-duotone" width="20"></iconify-icon>
                        </div>
                        <div>
                            <h4 class="text-sm font-black text-slate-900 dark:text-white">Visit Logs & Outcomes Timeline</h4>
                            <p class="text-[11px] text-slate-400 font-semibold">Detailed logs of meetings, discussions, and next steps</p>
                        </div>
                    </div>
                    <span class="text-xs font-mono font-bold text-slate-400">${filtered.length} visits found</span>
                </div>

                <div id="sales-visits-timeline-list" class="space-y-4 pt-2">
                    ${filtered.length === 0 ? `
                        <div class="py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                            <iconify-icon icon="solar:map-point-wave-bold" width="36" class="text-slate-300 dark:text-slate-600 mb-2"></iconify-icon>
                            <p class="text-xs font-bold text-slate-500">No client visits recorded for this filter.</p>
                            <button type="button" onclick="openSalesCheckInModal()" class="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow">
                                Check-In First Visit
                            </button>
                        </div>
                    ` : filtered.map(v => renderVisitCardHtml(v)).join('')}
                </div>
            </div>
        `;

        // Initialize or update Leaflet Map
        setTimeout(() => {
            initOrUpdateVisitsMap(filtered);
        }, 150);
    }

    // ── Render Individual Visit Card HTML ──
    function renderVisitCardHtml(v) {
        const checkInDate = new Date(v.checkInTime || Date.now());
        const timeStr = checkInDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateStr = checkInDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
        const durationText = v.durationMinutes ? `⏱️ ${v.durationMinutes} mins` : 'In Progress';
        const isActive = v.status === 'active';

        return `
            <div class="p-5 rounded-2xl border ${isActive ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20' : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40'} shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-start justify-between gap-4">
                <div class="space-y-2 flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black ${isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 animate-pulse' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}">
                            ${isActive ? '🟢 Active Meeting' : '✓ Completed Visit'}
                        </span>
                        <span class="text-xs font-bold text-slate-400">· ${dateStr} at ${timeStr}</span>
                        <span class="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            ${durationText}
                        </span>
                        <span class="text-xs font-bold text-slate-500 dark:text-slate-400">by ${escapeHtml(v.salesUserName || 'Sales Exec')}</span>
                    </div>

                    <div class="flex items-baseline gap-2">
                        <h4 class="text-base font-black text-slate-900 dark:text-white">${escapeHtml(v.clientName || 'Client Visit')}</h4>
                        ${v.contactPerson ? `<span class="text-xs font-medium text-slate-500">(${escapeHtml(v.contactPerson)})</span>` : ''}
                    </div>

                    <!-- Meeting Type & Location Address -->
                    <div class="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 flex-wrap">
                        <span class="flex items-center gap-1 font-semibold">
                            <iconify-icon icon="solar:tag-bold" class="text-indigo-500"></iconify-icon> ${escapeHtml(v.meetingType || 'Meeting')}
                        </span>
                        ${v.address ? `
                            <span class="flex items-center gap-1 font-medium truncate max-w-md" title="${escapeHtml(v.address)}">
                                <iconify-icon icon="solar:map-point-bold" class="text-emerald-500"></iconify-icon> ${escapeHtml(v.address)}
                            </span>
                        ` : ''}
                    </div>

                    <!-- Discussion Notes & Outcomes -->
                    ${v.initialNotes ? `
                        <p class="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                            <strong class="text-slate-700 dark:text-slate-300 font-bold">Agenda:</strong> ${escapeHtml(v.initialNotes)}
                        </p>
                    ` : ''}

                    ${v.meetingNotes ? `
                        <div class="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 space-y-1">
                            <div class="flex items-center justify-between">
                                <span class="font-black text-emerald-600 dark:text-emerald-400">Outcome: ${escapeHtml(v.outcome || 'Completed')}</span>
                                ${v.followUpDate ? `<span class="text-[10px] font-bold text-amber-600 dark:text-amber-400">📅 Follow-up: ${v.followUpDate}</span>` : ''}
                            </div>
                            <p class="text-slate-600 dark:text-slate-400 mt-1">${escapeHtml(v.meetingNotes)}</p>
                            ${v.followUpAction ? `<p class="text-[11px] font-semibold text-slate-500"><strong>Next Action:</strong> ${escapeHtml(v.followUpAction)}</p>` : ''}
                        </div>
                    ` : ''}
                </div>

                <!-- Right Photo Thumbnail & Quick Actions -->
                <div class="flex flex-row md:flex-col items-center md:items-end justify-between gap-3 shrink-0 w-full md:w-auto">
                    ${v.photoUrl ? `
                        <a href="${v.photoUrl}" target="_blank" title="View Site Photo" class="relative group">
                            <img src="${v.photoUrl}" class="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm group-hover:scale-105 transition-all" alt="Site Photo">
                            <span class="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity">Zoom</span>
                        </a>
                    ` : ''}

                    <div class="flex items-center gap-2">
                        ${v.checkInLat && v.checkInLng ? `
                            <button type="button" onclick="openDirectLocationNavigation(${v.checkInLat}, ${v.checkInLng}, '${encodeURIComponent(v.clientName || 'Client')}')"
                                    class="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-bold text-xs flex items-center gap-1 transition-all"
                                    title="Open Google Maps turn-by-turn navigation">
                                <iconify-icon icon="solar:routing-2-bold" width="14"></iconify-icon>
                                <span>Navigate</span>
                            </button>
                        ` : ''}

                        ${isActive ? `
                            <button type="button" onclick="openSalesCheckOutModal('${v.id}')"
                                    class="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1">
                                <iconify-icon icon="solar:flag-2-bold" width="14"></iconify-icon>
                                <span>Check-Out</span>
                            </button>
                        ` : ''}

                        ${(typeof window.isAdmin === 'function' && window.isAdmin()) ? `
                            <button type="button" onclick="deleteSalesVisit('${v.id}')"
                                    class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition-colors" title="Delete Visit Log">
                                <iconify-icon icon="solar:trash-bin-trash-bold" width="16"></iconify-icon>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    // ── Leaflet Interactive Map Initialization ──
    function initOrUpdateVisitsMap(visits) {
        const mapContainer = document.getElementById('sales-map-container');
        if (!mapContainer || typeof L === 'undefined') return;

        if (!visitsLeafletMap) {
            visitsLeafletMap = L.map('sales-map-container', {
                zoomControl: true,
                attributionControl: true
            }).setView([8.7139, 77.7567], 12); // Default fallback Tirunelveli coords

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(visitsLeafletMap);

            visitsMapMarkersLayer = L.layerGroup().addTo(visitsLeafletMap);
        }

        // Invalidate map size to ensure tiles render properly in tabs
        visitsLeafletMap.invalidateSize();

        if (visitsMapMarkersLayer) {
            visitsMapMarkersLayer.clearLayers();
        }

        const validCoords = [];

        visits.forEach(v => {
            if (!v.checkInLat || !v.checkInLng) return;
            const lat = Number(v.checkInLat);
            const lng = Number(v.checkInLng);
            if (isNaN(lat) || isNaN(lng)) return;

            validCoords.push([lat, lng]);

            const isActive = v.status === 'active';
            const markerBg = isActive ? '#10b981' : '#6366f1';
            const markerIcon = isActive ? '📍' : '✓';

            const customIcon = L.divIcon({
                className: 'custom-gps-pin',
                html: `
                    <div style="background:${markerBg};color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;box-shadow:0 4px 12px rgba(0,0,0,0.3);border:2px solid white;${isActive ? 'animation: pulse 1.5s infinite;' : ''}">
                        ${markerIcon}
                    </div>
                `,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
                popupAnchor: [0, -16]
            });

            const popupHtml = `
                <div style="font-family:inherit;min-width:180px;padding:2px;">
                    <div style="display:flex;align-items:center;gap:4px;margin-bottom:4px;">
                        <span style="font-size:9px;font-weight:900;padding:2px 6px;border-radius:99px;background:${isActive ? '#d1fae5;color:#065f46' : '#e0e7ff;color:#3730a3'}">${isActive ? 'Active Visit' : 'Completed'}</span>
                        <span style="font-size:10px;color:#64748b;">${v.durationMinutes ? v.durationMinutes + ' mins' : 'Meeting now'}</span>
                    </div>
                    <h4 style="font-size:13px;font-weight:900;margin:0 0 2px 0;color:#0f172a;">${escapeHtml(v.clientName || 'Client')}</h4>
                    <p style="font-size:11px;color:#64748b;margin:0 0 6px 0;">${escapeHtml(v.address || v.meetingType || '')}</p>
                    <p style="font-size:10px;font-weight:700;color:#4f46e5;margin:0 0 8px 0;">Rep: ${escapeHtml(v.salesUserName || 'Sales Exec')}</p>
                    <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank"
                       style="display:inline-block;padding:4px 10px;background:#4f46e5;color:#fff;border-radius:8px;font-size:11px;font-weight:700;text-decoration:none;">
                        🧭 Open Google Navigation
                    </a>
                </div>
            `;

            const marker = L.marker([lat, lng], { icon: customIcon }).bindPopup(popupHtml);
            visitsMapMarkersLayer.addLayer(marker);
        });

        // Add saved client locations as purple pins
        salesLeads.forEach(l => {
            if (l.lat && l.lng) {
                const lat = Number(l.lat);
                const lng = Number(l.lng);
                if (isNaN(lat) || isNaN(lng)) return;

                const clientPinIcon = L.divIcon({
                    className: 'custom-client-pin',
                    html: `
                        <div style="background:#8b5cf6;color:#fff;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;box-shadow:0 3px 8px rgba(0,0,0,0.25);border:2px solid white;">
                            🏢
                        </div>
                    `,
                    iconSize: [26, 26],
                    iconAnchor: [13, 13],
                    popupAnchor: [0, -13]
                });

                const popupHtml = `
                    <div style="font-family:inherit;min-width:160px;padding:2px;">
                        <span style="font-size:9px;font-weight:900;padding:2px 6px;border-radius:99px;background:#f3e8ff;color:#6b21a8;">Client Office</span>
                        <h4 style="font-size:12px;font-weight:900;margin:3px 0 2px 0;">${escapeHtml(l.clientName || '')}</h4>
                        <p style="font-size:10px;color:#64748b;margin:0 0 6px 0;">${escapeHtml(l.address || '')}</p>
                        <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank"
                           style="display:inline-block;padding:3px 8px;background:#8b5cf6;color:#fff;border-radius:6px;font-size:10px;font-weight:700;text-decoration:none;">
                            🧭 Navigate
                        </a>
                    </div>
                `;

                const marker = L.marker([lat, lng], { icon: clientPinIcon }).bindPopup(popupHtml);
                visitsMapMarkersLayer.addLayer(marker);
            }
        });

        if (validCoords.length > 0) {
            visitsLeafletMap.fitBounds(validCoords, { padding: [40, 40], maxZoom: 15 });
        }
    }

    // ── Filter Sales Visits Trigger ──
    window.filterSalesVisits = function () {
        currentVisitSearchQuery = document.getElementById('visit-search-input')?.value?.trim() || '';
        currentVisitFilterDate = document.getElementById('visit-date-filter')?.value || 'today';
        currentVisitFilterUser = document.getElementById('visit-user-filter')?.value || 'all';
        renderVisitsDashboard();
    };

    // ── Delete Sales Visit (Admin Only) ──
    window.deleteSalesVisit = async function (visitId) {
        if (!confirm('Are you sure you want to remove this visit record?')) return;
        try {
            const { ref, set } = window.firebaseDatabase || {};
            await set(ref(window.db, `worksync/sales_visits/${visitId}`), null);
            if (typeof window.toast === 'function') window.toast('Visit record deleted', 'success');
        } catch (err) {
            if (typeof window.toast === 'function') window.toast('Failed to delete visit: ' + err.message, 'error');
        }
    };

    // ── Open Client Google Maps Navigation ──
    window.openClientNavigation = function (leadId) {
        const lead = salesLeads.find(l => l.id === leadId);
        if (!lead) return;

        let dest = '';
        if (lead.lat && lead.lng) {
            dest = `${lead.lat},${lead.lng}`;
        } else if (lead.address) {
            dest = lead.address;
        } else {
            dest = lead.clientName || '';
        }

        window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`, '_blank');
    };

    window.openDirectLocationNavigation = function (lat, lng, label) {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    };

    // ── Auto-Fill Lead GPS Address in Add Lead Modal ──
    window.autoFillLeadGpsAddress = async function () {
        const addressInput = document.getElementById('lead-address');
        const latInput = document.getElementById('lead-lat');
        const lngInput = document.getElementById('lead-lng');

        if (addressInput) addressInput.value = 'Fetching GPS coordinates...';

        try {
            const pos = await getCurrentGPSPosition();
            if (latInput) latInput.value = pos.lat;
            if (lngInput) lngInput.value = pos.lng;

            const resolvedAddress = await reverseGeocode(pos.lat, pos.lng);
            if (addressInput) addressInput.value = resolvedAddress;

            if (typeof window.toast === 'function') window.toast('Current GPS location captured!', 'success');
        } catch (err) {
            if (addressInput) addressInput.value = '';
            if (typeof window.toast === 'function') window.toast('GPS error: ' + err.message, 'error');
        }
    };

    // Export to global scope
    window.isSalesUser = isSalesUser;
    window.initSalesHub = initSalesHub;
    window.renderSalesHub = renderSalesHub;
    window.calculateQuotation = calculateQuotation;
    window.copyQuotationToClipboard = copyQuotationToClipboard;
    window.saveQuotationAsLead = saveQuotationAsLead;

})();
