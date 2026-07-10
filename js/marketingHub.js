/**
 * Marketing Hub Module
 * Central management for all digital marketing integrations
 * Supports Meta, Facebook, Instagram, Meta Ads, and future providers
 */

// ════════════════════════════════════════════════════════════════════
// STATE MANAGEMENT
// ════════════════════════════════════════════════════════════════════

let currentMarketingTab = 'overview';
let marketingConnections = {};
let marketingAnalytics = {};
let marketingSyncStatus = {};
let marketingLoading = false;

// ════════════════════════════════════════════════════════════════════
// TAB NAVIGATION
// ════════════════════════════════════════════════════════════════════

function switchMarketingTab(tabName) {
    currentMarketingTab = tabName;
    localStorage.setItem('mh_currentTab', tabName);

    // Hide all tabs
    document.querySelectorAll('.mh-tab-content').forEach(el => {
        el.classList.add('hidden');
    });

    // Remove active class from all buttons
    document.querySelectorAll('.mh-tab-btn').forEach(btn => {
        btn.classList.remove('mh-tab-active');
    });

    // Show active tab
    const tabElement = document.getElementById(`mh-tab-${tabName}`);
    if (tabElement) {
        tabElement.classList.remove('hidden');
    }

    // Mark button as active
    const btnElement = document.querySelector(`[data-mh-tab="${tabName}"]`);
    if (btnElement) {
        btnElement.classList.add('mh-tab-active');
    }

    // Render tab content
    renderMarketingTabContent(tabName);
}

function renderMarketingTabContent(tabName) {
    switch(tabName) {
        case 'overview':
            renderMarketingOverview();
            break;
        case 'connections':
            renderMarketingConnections();
            break;
        case 'facebook':
            renderFacebookTab();
            break;
        case 'instagram':
            renderInstagramTab();
            break;
        case 'meta-ads':
            renderMetaAdsTab();
            break;
        case 'analytics':
            renderAnalyticsTab();
            break;
        case 'reports':
            renderReportsTab();
            break;
        case 'ai-insights':
            renderAiInsightsTab();
            break;
        case 'settings':
            renderSettingsTab();
            break;
    }
}

// ════════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ════════════════════════════════════════════════════════════════════

function renderMarketingOverview() {
    const container = document.getElementById('mh-tab-overview');
    if (!container) return;

    // Load connections first
    loadMarketingConnections().then(() => {
        let html = '<div class="space-y-6">';
        html += '<h3 class="text-lg font-bold text-slate-900">Connected Platforms</h3>';

        // Platform cards grid
        html += '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">';

        // Meta Business
        const metaConnection = marketingConnections.meta;
        html += renderPlatformCard('Meta Business', metaConnection, 'meta');

        // Facebook
        const fbConnection = marketingConnections.facebook;
        html += renderPlatformCard('Facebook', fbConnection, 'facebook');

        // Instagram
        const igConnection = marketingConnections.instagram;
        html += renderPlatformCard('Instagram', igConnection, 'instagram');

        // Meta Ads
        const adsConnection = marketingConnections.meta_ads;
        html += renderPlatformCard('Meta Ads', adsConnection, 'meta_ads');

        // Coming soon platforms
        html += renderComingSoonCard('Google Ads');
        html += renderComingSoonCard('Google Analytics');
        html += renderComingSoonCard('LinkedIn');
        html += renderComingSoonCard('YouTube');

        html += '</div></div>';
        container.innerHTML = html;
    });
}

function renderPlatformCard(name, connection, provider) {
    const isConnected = connection && connection.status === 'active';
    const logoMap = {
        'meta': '📘',
        'facebook': '📕',
        'instagram': '📷',
        'meta_ads': '🎯'
    };
    const logo = logoMap[provider] || '📱';

    let html = `<div class="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 hover:shadow-2xl transition-all">
        <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-3">
                <div class="text-3xl">${logo}</div>
                <div>
                    <h3 class="text-sm font-bold text-slate-900">${name}</h3>
                    <p class="text-xs ${isConnected ? 'text-emerald-600' : 'text-slate-500'}">
                        ${isConnected ? '✓ Connected' : 'Not Connected'}
                    </p>
                </div>
            </div>`;

    if (isConnected) {
        html += `<span class="bg-emerald-100 text-emerald-600 text-xs font-bold px-2.5 py-1 rounded-full">ACTIVE</span>`;
    } else {
        html += `<span class="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full">INACTIVE</span>`;
    }

    html += `</div><div class="space-y-2 text-sm mb-4">`;

    if (isConnected) {
        html += `<p class="text-slate-600">Last Sync: <span class="font-bold">${formatLastSync(connection.lastSync)}</span></p>`;
        html += `<p class="text-slate-600">Status: <span class="font-bold text-emerald-600">Connected</span></p>`;
    } else {
        html += `<p class="text-slate-600">Connect to start tracking ${name} data</p>`;
    }

    html += `</div>
        <button onclick="switchMarketingTab('connections')" 
            class="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 py-2 rounded-xl text-xs font-bold transition-all">
            ${isConnected ? 'Manage' : 'Connect'}
        </button>
    </div>`;

    return html;
}

function renderComingSoonCard(name) {
    return `<div class="bg-slate-50 rounded-3xl p-6 border border-slate-200 opacity-60">
        <div class="flex items-center gap-3 mb-4">
            <div class="text-3xl">⏰</div>
            <div>
                <h3 class="text-sm font-bold text-slate-700">${name}</h3>
                <p class="text-xs text-slate-500">Coming Soon</p>
            </div>
        </div>
        <button disabled class="w-full bg-slate-200 text-slate-500 py-2 rounded-xl text-xs font-bold cursor-not-allowed">
            Coming Soon
        </button>
    </div>`;
}

function formatLastSync(timestamp) {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return date.toLocaleDateString();
}

// ════════════════════════════════════════════════════════════════════
// CONNECTIONS TAB
// ════════════════════════════════════════════════════════════════════

function renderMarketingConnections() {
    const container = document.getElementById('mh-tab-connections');
    if (!container) return;

    loadMarketingConnections().then(() => {
        let html = '<div class="space-y-6">';

        const metaConnection = marketingConnections.meta;

        if (!metaConnection) {
            // Not connected - show hero card
            html += renderConnectionHeroCard();
        } else {
            // Connected - show connection details
            html += renderConnectionOverview(metaConnection);
            html += renderPermissionsCard(metaConnection);
            html += renderSyncCard(metaConnection);
        }

        html += '</div>';
        container.innerHTML = html;
    });
}

function renderConnectionHeroCard() {
    return `<div class="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-2 border-indigo-200 rounded-3xl p-12 shadow-lg">
        <div class="flex flex-col md:flex-row items-center gap-8">
            <div class="w-24 h-24 bg-white rounded-2xl flex items-center justify-center shadow-md shrink-0">
                <span class="text-5xl">📘</span>
            </div>
            <div class="flex-1 text-center md:text-left">
                <h2 class="text-2xl font-black text-slate-900 mb-2">Meta Business Integration</h2>
                <p class="text-slate-600 mb-6">Connect your Meta Business Account to securely access:</p>
                <ul class="text-slate-600 mb-6 space-y-1">
                    <li>✓ Facebook Pages</li>
                    <li>✓ Instagram Professional Accounts</li>
                    <li>✓ Meta Ads Accounts</li>
                    <li>✓ Business Manager Analytics</li>
                </ul>
                <div class="flex flex-col md:flex-row gap-3">
                    <button onclick="connectMetaBusiness()" 
                        class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-200">
                        Connect Meta Account
                    </button>
                    <button onclick="openMetaLearnMore()" 
                        class="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-6 py-2.5 rounded-xl font-bold transition-all">
                        Learn More
                    </button>
                </div>
            </div>
        </div>
    </div>`;
}

function renderConnectionOverview(connection) {
    return `<div class="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
        <div class="mb-6">
            <p class="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-2">Connection Status</p>
            <h3 class="text-lg font-black text-slate-900">Meta Business Connected</h3>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div class="bg-slate-50 rounded-2xl p-4">
                <p class="text-xs text-slate-500 font-bold uppercase mb-1">Business Name</p>
                <p class="text-lg font-black text-slate-900">${connection.businessName || 'N/A'}</p>
            </div>
            <div class="bg-slate-50 rounded-2xl p-4">
                <p class="text-xs text-slate-500 font-bold uppercase mb-1">Business ID</p>
                <p class="text-lg font-mono text-slate-900">${connection.businessId || 'N/A'}</p>
            </div>
            <div class="bg-emerald-50 rounded-2xl p-4">
                <p class="text-xs text-emerald-600 font-bold uppercase mb-1">Status</p>
                <p class="text-lg font-black text-emerald-600">✓ Connected</p>
            </div>
            <div class="bg-slate-50 rounded-2xl p-4">
                <p class="text-xs text-slate-500 font-bold uppercase mb-1">Connected Since</p>
                <p class="text-lg font-black text-slate-900">${new Date(connection.connectedAt).toLocaleDateString()}</p>
            </div>
        </div>
        <div class="flex gap-3">
            <button onclick="refreshMetaConnection()" 
                class="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2">
                <iconify-icon icon="solar:restart-bold" width="18"></iconify-icon>
                Refresh Data
            </button>
            <button onclick="reconnectMeta()" 
                class="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 py-2.5 rounded-xl font-bold transition-all">
                Reconnect
            </button>
            <button onclick="disconnectMeta()" 
                class="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 py-2.5 rounded-xl font-bold transition-all">
                Disconnect
            </button>
        </div>
    </div>`;
}

function renderPermissionsCard(connection) {
    const permissions = connection.permissions || [];
    return `<div class="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
        <div class="mb-6">
            <p class="text-[10px] font-bold text-violet-600 uppercase tracking-widest mb-2">Permissions Granted</p>
            <h3 class="text-lg font-black text-slate-900">Active Scopes</h3>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            ${permissions.map(p => `<div class="flex items-center gap-2 bg-slate-50 p-3 rounded-xl">
                <span class="text-emerald-600">✓</span>
                <span class="text-sm font-bold text-slate-700">${p}</span>
            </div>`).join('')}
        </div>
        ${permissions.length === 0 ? '<p class="text-slate-500 text-sm">No permissions granted yet</p>' : ''}
    </div>`;
}

function renderSyncCard(connection) {
    const lastSync = connection.lastSync ? new Date(connection.lastSync) : null;
    const lastSyncText = lastSync ? lastSync.toLocaleString() : 'Never';

    return `<div class="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
        <div class="mb-6">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Data Synchronization</p>
            <h3 class="text-lg font-black text-slate-900">Sync Status</h3>
        </div>
        <div class="bg-slate-50 rounded-2xl p-4 mb-6">
            <p class="text-xs text-slate-500 font-bold uppercase mb-1">Last Sync</p>
            <p class="text-lg font-black text-slate-900">${lastSyncText}</p>
        </div>
        <button onclick="syncMarketingData()" 
            class="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100">
            <iconify-icon icon="solar:refresh-bold" width="18"></iconify-icon>
            Sync Now
        </button>
    </div>`;
}

// ════════════════════════════════════════════════════════════════════
// OTHER TABS (Placeholder)
// ════════════════════════════════════════════════════════════════════

function renderFacebookTab() {
    const container = document.getElementById('mh-tab-facebook');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-12"><p class="text-slate-500">Facebook data coming soon...</p></div>';
}

function renderInstagramTab() {
    const container = document.getElementById('mh-tab-instagram');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-12"><p class="text-slate-500">Instagram data coming soon...</p></div>';
}

function renderMetaAdsTab() {
    const container = document.getElementById('mh-tab-meta-ads');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-12"><p class="text-slate-500">Meta Ads data coming soon...</p></div>';
}

function renderAnalyticsTab() {
    const container = document.getElementById('mh-tab-analytics');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-12"><p class="text-slate-500">Analytics dashboard coming soon...</p></div>';
}

function renderReportsTab() {
    const container = document.getElementById('mh-tab-reports');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-12"><p class="text-slate-500">Reports generator coming soon...</p></div>';
}

function renderAiInsightsTab() {
    const container = document.getElementById('mh-tab-ai-insights');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-12"><p class="text-slate-500">AI Insights coming soon...</p></div>';
}

function renderSettingsTab() {
    const container = document.getElementById('mh-tab-settings');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-12"><p class="text-slate-500">Settings panel coming soon...</p></div>';
}

// ════════════════════════════════════════════════════════════════════
// DATA MANAGEMENT
// ════════════════════════════════════════════════════════════════════

async function loadMarketingConnections() {
    try {
        const response = await fetch('/api/marketing/connections');
        const data = await response.json();
        marketingConnections = data || {};
        return data;
    } catch (error) {
        console.error('Error loading connections:', error);
        toast('Failed to load connections', 'error');
        return {};
    }
}

async function syncMarketingData() {
    if (marketingLoading) return;
    marketingLoading = true;

    try {
        const response = await fetch('/api/marketing/sync', { method: 'POST' });
        const data = await response.json();

        if (data.success) {
            toast('Sync completed successfully', 'success');
            await loadMarketingConnections();
            renderMarketingConnections();
        } else {
            toast('Sync failed: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Sync error:', error);
        toast('Failed to sync data', 'error');
    } finally {
        marketingLoading = false;
    }
}

// ════════════════════════════════════════════════════════════════════
// META CONNECTION FUNCTIONS
// ════════════════════════════════════════════════════════════════════

function connectMetaBusiness() {
    // Initiate OAuth flow
    const state = generateRandomString(32);
    localStorage.setItem('meta_oauth_state', state);
    window.location.href = `/api/marketing/meta/connect?state=${state}`;
}

function reconnectMeta() {
    if (confirm('This will open the Meta authentication page. Continue?')) {
        connectMetaBusiness();
    }
}

async function disconnectMeta() {
    if (confirm('Are you sure you want to disconnect your Meta account? This action cannot be undone.')) {
        try {
            const response = await fetch('/api/marketing/meta/disconnect', { method: 'POST' });
            const data = await response.json();

            if (data.success) {
                toast('Meta account disconnected', 'success');
                await loadMarketingConnections();
                renderMarketingConnections();
            } else {
                toast('Failed to disconnect', 'error');
            }
        } catch (error) {
            console.error('Disconnect error:', error);
            toast('Failed to disconnect', 'error');
        }
    }
}

async function refreshMetaConnection() {
    try {
        const response = await fetch('/api/marketing/meta/refresh', { method: 'POST' });
        const data = await response.json();

        if (data.success) {
            toast('Connection refreshed', 'success');
            await loadMarketingConnections();
            renderMarketingConnections();
        } else {
            toast('Failed to refresh connection', 'error');
        }
    } catch (error) {
        console.error('Refresh error:', error);
        toast('Failed to refresh connection', 'error');
    }
}

function openMetaLearnMore() {
    // Open learn more modal or new tab
    window.open('https://developers.facebook.com/docs/facebook-login', '_blank');
}

// ════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ════════════════════════════════════════════════════════════════════

function generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Export for use
window.switchMarketingTab = switchMarketingTab;
window.connectMetaBusiness = connectMetaBusiness;
window.reconnectMeta = reconnectMeta;
window.disconnectMeta = disconnectMeta;
window.refreshMetaConnection = refreshMetaConnection;
window.openMetaLearnMore = openMetaLearnMore;
window.syncMarketingData = syncMarketingData;
