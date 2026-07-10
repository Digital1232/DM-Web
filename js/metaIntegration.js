/**
 * Meta Integration Module
 * Production-ready Meta Business Account integration for One Desk
 * Specifically designed for Meta App Review requirements
 */

// ════════════════════════════════════════════════════════════════════
// STATE MANAGEMENT
// ════════════════════════════════════════════════════════════════════

let metaConnectionState = {
    connected: false,
    business: null,
    page: null,
    instagram: null,
    adAccounts: [],
    permissions: [],
    lastSync: null,
    loading: false
};

// ════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ════════════════════════════════════════════════════════════════════

async function initMetaIntegration() {
    try {
        console.log('initMetaIntegration: Starting...');
        
        // Ensure container exists
        const container = document.getElementById('view-meta-integration-panel');
        if (!container) {
            console.error('Meta integration panel container not found!');
            return;
        }
        
        console.log('initMetaIntegration: Container found, loading data...');
        await loadMetaConnectionData();
        
        console.log('initMetaIntegration: Data loaded, rendering view...');
        renderMetaIntegrationView();
        
        console.log('initMetaIntegration: Complete');
    } catch (error) {
        console.error('Meta integration init error:', error);
        // Show fallback empty state even if error occurs
        renderMetaIntegrationView();
    }
}

async function loadMetaConnectionData() {
    try {
        // Get currentUser from window scope
        const user = window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);
        
        // Check if user is logged in
        if (!user || !user.uid) {
            metaConnectionState.connected = false;
            return;
        }
        
        // Get Firebase ID token
        const idToken = await window.getFirebaseIdToken();
        if (!idToken) {
            metaConnectionState.connected = false;
            return;
        }
        
        // Check if backend is available
        const response = await fetch('/api/meta/profile', {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load meta profile');
        }

        const data = await response.json();
        if (data.success && data.data) {
            metaConnectionState = {
                ...metaConnectionState,
                connected: true,
                business: data.data.businessName,
                ...data.data
            };
        } else {
            metaConnectionState.connected = false;
        }
    } catch (error) {
        console.error('Load meta data error:', error);
        // Backend not available yet - show setup state
        metaConnectionState.connected = false;
        metaConnectionState.loading = false;
    }
}

// ════════════════════════════════════════════════════════════════════
// RENDERING
// ════════════════════════════════════════════════════════════════════

function renderMetaIntegrationView() {
    const container = document.getElementById('view-meta-integration-panel');
    if (!container) {
        console.error('Meta integration panel container not found!');
        return;
    }

    console.log('renderMetaIntegrationView: Rendering...', { connected: metaConnectionState.connected, business: metaConnectionState.business });

    try {
        if (metaConnectionState.connected && metaConnectionState.business) {
            console.log('renderMetaIntegrationView: Showing connected state');
            container.innerHTML = renderConnectedState();
        } else {
            console.log('renderMetaIntegrationView: Showing empty state');
            container.innerHTML = renderEmptyState();
        }
    } catch (error) {
        console.error('renderMetaIntegrationView: Error rendering view:', error);
        // Fallback to empty state
        container.innerHTML = renderEmptyState();
    }
}

function renderEmptyState() {
    return `
        <div class="flex items-center justify-center min-h-screen">
            <div class="w-full max-w-2xl">
                <!-- Premium Hero Card -->
                <div class="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-3xl p-12 shadow-xl border border-blue-200">
                    <div class="flex flex-col md:flex-row items-center gap-8">
                        <!-- Meta Logo -->
                        <div class="w-24 h-24 rounded-2xl bg-white flex items-center justify-center shadow-md flex-shrink-0">
                            <div class="text-4xl font-black text-blue-600">f</div>
                        </div>
                        
                        <!-- Content -->
                        <div class="flex-1 text-center md:text-left">
                            <h2 class="text-2xl font-black text-slate-900 mb-3">Meta Business Integration</h2>
                            <p class="text-slate-700 mb-6 leading-relaxed">Securely connect your Meta Business Account to access Facebook Pages, Instagram Professional Accounts and Meta Ads all within One Desk.</p>
                            
                            <!-- Benefits List -->
                            <ul class="space-y-2 mb-8 text-left">
                                <li class="flex items-center gap-2 text-sm text-slate-700">
                                    <span class="text-lg">✓</span>
                                    <span>Facebook Pages Management</span>
                                </li>
                                <li class="flex items-center gap-2 text-sm text-slate-700">
                                    <span class="text-lg">✓</span>
                                    <span>Instagram Professional Accounts</span>
                                </li>
                                <li class="flex items-center gap-2 text-sm text-slate-700">
                                    <span class="text-lg">✓</span>
                                    <span>Meta Ads Account Integration</span>
                                </li>
                            </ul>
                            
                            <!-- Action Buttons -->
                            <div class="flex flex-col md:flex-row gap-3">
                                <button onclick="startMetaOAuth()"
                                    class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2">
                                    <iconify-icon icon="solar:login-3-linear" width="18"></iconify-icon>
                                    Connect Meta Account
                                </button>
                                <button onclick="openMetaDocumentation()"
                                    class="flex-1 bg-white hover:bg-slate-50 text-slate-600 font-bold py-3 px-6 rounded-xl border border-slate-200 transition-all">
                                    Learn More
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderConnectedState() {
    const business = metaConnectionState.business || {};
    const page = metaConnectionState.page || {};
    const instagram = metaConnectionState.instagram || {};
    const adAccounts = metaConnectionState.adAccounts || [];
    const permissions = metaConnectionState.permissions || [];
    const lastSync = metaConnectionState.lastSync ? new Date(metaConnectionState.lastSync) : null;

    return `
        <div class="space-y-6 fade-in">
            
            <!-- SECTION 1: Connection Status -->
            <div class="bg-gradient-to-r from-emerald-50 to-green-50 rounded-3xl p-8 shadow-xl border border-emerald-200">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                    <div>
                        <p class="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-2">Connection Status</p>
                        <h2 class="text-2xl font-black text-slate-900">✓ Connected Successfully</h2>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="refreshMetaConnection()"
                            class="px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 font-bold rounded-xl border border-slate-200 transition-all flex items-center gap-2 whitespace-nowrap">
                            <iconify-icon icon="solar:restart-bold" width="16"></iconify-icon>
                            Refresh
                        </button>
                        <button onclick="reconnectMeta()"
                            class="px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 font-bold rounded-xl border border-slate-200 transition-all flex items-center gap-2 whitespace-nowrap">
                            <iconify-icon icon="solar:rewind-back-linear" width="16"></iconify-icon>
                            Reconnect
                        </button>
                        <button onclick="disconnectMeta()"
                            class="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl border border-rose-200 transition-all flex items-center gap-2 whitespace-nowrap">
                            <iconify-icon icon="solar:logout-linear" width="16"></iconify-icon>
                            Disconnect
                        </button>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="bg-white rounded-2xl p-4 border border-slate-100">
                        <p class="text-xs text-slate-500 font-bold uppercase mb-1">Business Name</p>
                        <p class="text-lg font-black text-slate-900">${escapeHtml(business.name || 'N/A')}</p>
                    </div>
                    <div class="bg-white rounded-2xl p-4 border border-slate-100">
                        <p class="text-xs text-slate-500 font-bold uppercase mb-1">Business ID</p>
                        <p class="text-lg font-mono text-slate-900">${escapeHtml(business.id || 'N/A')}</p>
                    </div>
                    <div class="bg-white rounded-2xl p-4 border border-slate-100">
                        <p class="text-xs text-slate-500 font-bold uppercase mb-1">Connected Since</p>
                        <p class="text-lg font-black text-slate-900">${formatConnectionDate(business.connectedAt)}</p>
                    </div>
                    <div class="bg-white rounded-2xl p-4 border border-slate-100">
                        <p class="text-xs text-slate-500 font-bold uppercase mb-1">Last Sync</p>
                        <p class="text-lg font-black text-slate-900">${lastSync ? formatSyncTime(lastSync) : 'Never'}</p>
                    </div>
                </div>
            </div>

            <!-- SECTION 2: Facebook Page -->
            ${renderFacebookCard(page)}

            <!-- SECTION 3: Instagram Business -->
            ${renderInstagramCard(instagram)}

            <!-- SECTION 4: Meta Ads Accounts -->
            ${renderAdAccountsSection(adAccounts)}

            <!-- SECTION 5: Granted Permissions -->
            ${renderPermissionsCard(permissions)}

            <!-- SECTION 6: Sync Status -->
            ${renderSyncCard(lastSync)}

        </div>
    `;
}

function renderFacebookCard(page) {
    if (!page || !page.id) {
        return `
            <div class="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 opacity-50">
                <div class="flex items-center gap-4 mb-6">
                    <div class="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-2xl">f</div>
                    <div>
                        <h3 class="text-sm font-bold text-slate-900">Facebook Page</h3>
                        <p class="text-xs text-slate-500">Not Connected</p>
                    </div>
                </div>
                <p class="text-sm text-slate-500">No Facebook page data available</p>
            </div>
        `;
    }

    return `
        <div class="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
            <div class="flex items-center justify-between mb-6">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-2xl">f</div>
                    <div>
                        <h3 class="text-sm font-bold text-slate-900">Facebook Page</h3>
                        <p class="text-xs text-emerald-600 font-bold">✓ Connected</p>
                    </div>
                </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-slate-50 rounded-2xl p-4">
                    <p class="text-xs text-slate-500 font-bold uppercase mb-1">Page Name</p>
                    <p class="font-bold text-slate-900">${escapeHtml(page.name || 'N/A')}</p>
                </div>
                <div class="bg-slate-50 rounded-2xl p-4">
                    <p class="text-xs text-slate-500 font-bold uppercase mb-1">Page ID</p>
                    <p class="font-mono text-slate-900 text-sm">${escapeHtml(page.id || 'N/A')}</p>
                </div>
                <div class="bg-slate-50 rounded-2xl p-4">
                    <p class="text-xs text-slate-500 font-bold uppercase mb-1">Category</p>
                    <p class="font-bold text-slate-900">${escapeHtml(page.category || 'N/A')}</p>
                </div>
                <div class="bg-slate-50 rounded-2xl p-4">
                    <p class="text-xs text-slate-500 font-bold uppercase mb-1">Followers</p>
                    <p class="font-bold text-slate-900">${page.followers ? page.followers.toLocaleString() : 'N/A'}</p>
                </div>
            </div>
        </div>
    `;
}

function renderInstagramCard(instagram) {
    if (!instagram || !instagram.id) {
        return `
            <div class="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 opacity-50">
                <div class="flex items-center gap-4 mb-6">
                    <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl text-white">@</div>
                    <div>
                        <h3 class="text-sm font-bold text-slate-900">Instagram Professional Account</h3>
                        <p class="text-xs text-slate-500">Not Connected</p>
                    </div>
                </div>
                <p class="text-sm text-slate-500">No Instagram business account data available</p>
            </div>
        `;
    }

    return `
        <div class="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
            <div class="flex items-center justify-between mb-6">
                <div class="flex items-center gap-4">
                    ${instagram.profilePicture ? `
                        <img src="${escapeHtml(instagram.profilePicture)}" alt="Profile" class="w-12 h-12 rounded-full object-cover border-2 border-pink-200">
                    ` : `
                        <div class="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">@</div>
                    `}
                    <div>
                        <h3 class="text-sm font-bold text-slate-900">Instagram Professional Account</h3>
                        <p class="text-xs text-emerald-600 font-bold">✓ Connected</p>
                    </div>
                </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-slate-50 rounded-2xl p-4">
                    <p class="text-xs text-slate-500 font-bold uppercase mb-1">Username</p>
                    <p class="font-bold text-slate-900">@${escapeHtml(instagram.username || 'N/A')}</p>
                </div>
                <div class="bg-slate-50 rounded-2xl p-4">
                    <p class="text-xs text-slate-500 font-bold uppercase mb-1">Account ID</p>
                    <p class="font-mono text-slate-900 text-sm">${escapeHtml(instagram.id || 'N/A')}</p>
                </div>
                <div class="bg-slate-50 rounded-2xl p-4">
                    <p class="text-xs text-slate-500 font-bold uppercase mb-1">Account Type</p>
                    <p class="font-bold text-slate-900">${escapeHtml(instagram.type || 'BUSINESS')}</p>
                </div>
                <div class="bg-slate-50 rounded-2xl p-4">
                    <p class="text-xs text-slate-500 font-bold uppercase mb-1">Followers</p>
                    <p class="font-bold text-slate-900">${instagram.followers ? instagram.followers.toLocaleString() : 'N/A'}</p>
                </div>
            </div>
        </div>
    `;
}

function renderAdAccountsSection(adAccounts) {
    if (!adAccounts || adAccounts.length === 0) {
        return `
            <div class="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 opacity-50">
                <div class="flex items-center gap-4 mb-6">
                    <div class="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-2xl">📊</div>
                    <div>
                        <h3 class="text-sm font-bold text-slate-900">Meta Ads</h3>
                        <p class="text-xs text-slate-500">Not Connected</p>
                    </div>
                </div>
                <p class="text-sm text-slate-500">No ad accounts available</p>
            </div>
        `;
    }

    return `
        <div class="space-y-4">
            ${adAccounts.map((account, idx) => `
                <div class="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
                    <div class="flex items-center justify-between mb-6">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-2xl">📊</div>
                            <div>
                                <h3 class="text-sm font-bold text-slate-900">Meta Ads Account ${idx + 1}</h3>
                                <p class="text-xs text-emerald-600 font-bold">✓ Connected</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="bg-slate-50 rounded-2xl p-4">
                            <p class="text-xs text-slate-500 font-bold uppercase mb-1">Account Name</p>
                            <p class="font-bold text-slate-900">${escapeHtml(account.name || 'N/A')}</p>
                        </div>
                        <div class="bg-slate-50 rounded-2xl p-4">
                            <p class="text-xs text-slate-500 font-bold uppercase mb-1">Account ID</p>
                            <p class="font-mono text-slate-900 text-sm">${escapeHtml(account.id || 'N/A')}</p>
                        </div>
                        <div class="bg-slate-50 rounded-2xl p-4">
                            <p class="text-xs text-slate-500 font-bold uppercase mb-1">Currency</p>
                            <p class="font-bold text-slate-900">${escapeHtml(account.currency || 'USD')}</p>
                        </div>
                        <div class="bg-slate-50 rounded-2xl p-4">
                            <p class="text-xs text-slate-500 font-bold uppercase mb-1">Timezone</p>
                            <p class="font-bold text-slate-900">${escapeHtml(account.timezone || 'N/A')}</p>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderPermissionsCard(permissions) {
    const permissionList = [
        'ads_read',
        'business_management',
        'pages_show_list',
        'pages_read_engagement',
        'read_insights',
        'instagram_business_basic',
        'instagram_manage_insights'
    ];

    return `
        <div class="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Granted Permissions</p>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                ${permissionList.map(perm => {
                    const granted = permissions.includes(perm);
                    return `
                        <div class="flex items-center gap-3 p-3 rounded-xl ${granted ? 'bg-emerald-50 border border-emerald-100' : 'bg-slate-50 border border-slate-100'}">
                            <span class="text-lg ${granted ? 'text-emerald-600' : 'text-slate-400'}">
                                ${granted ? '✓' : '○'}
                            </span>
                            <span class="text-sm font-bold ${granted ? 'text-emerald-700' : 'text-slate-600'}">${perm}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

function renderSyncCard(lastSync) {
    return `
        <div class="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Data Synchronization</p>
            
            <div class="bg-slate-50 rounded-2xl p-4 mb-6">
                <p class="text-xs text-slate-500 font-bold uppercase mb-2">Last Sync</p>
                <p class="text-lg font-black text-slate-900">${lastSync ? formatSyncTime(lastSync) : 'Never synced'}</p>
            </div>
            
            <button onclick="syncMetaData()"
                class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2">
                <iconify-icon icon="solar:refresh-bold" width="18"></iconify-icon>
                Sync Now
            </button>
        </div>
    `;
}

// ════════════════════════════════════════════════════════════════════
// OAUTH FUNCTIONS
// ════════════════════════════════════════════════════════════════════

async function startMetaOAuth() {
    try {
        // Debug: Log what we're checking
        console.log('startMetaOAuth called');
        console.log('window.currentUser:', window.currentUser);
        console.log('typeof currentUser:', typeof currentUser);
        
        // Get user - try multiple ways
        let user = null;
        if (typeof window.currentUser !== 'undefined') {
            user = window.currentUser;
            console.log('Got user from window.currentUser');
        } else if (typeof currentUser !== 'undefined') {
            user = currentUser;
            console.log('Got user from local currentUser');
        }
        
        console.log('Final user object:', user);
        
        if (!user || !user.uid) {
            console.warn('User not logged in - user:', user);
            alert('Please login first');
            return;
        }

        console.log('User authenticated, uid:', user.uid);

        // Get Firebase ID token from window global function
        const idToken = await window.getFirebaseIdToken();
        if (!idToken) {
            alert('Authentication error. Please try logging in again.');
            return;
        }

        console.log('Got Firebase ID token');

        // Call backend to initiate OAuth
        const connectResponse = await fetch('/api/meta/connect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            }
        });

        console.log('Backend response status:', connectResponse.status);

        if (!connectResponse.ok) {
            if (connectResponse.status === 401) {
                alert('Authentication failed. Please login again.');
            } else if (connectResponse.status === 503) {
                alert('Meta integration backend not ready. Please contact administrator.');
            } else {
                const errorData = await connectResponse.json().catch(() => ({}));
                alert(errorData.message || 'Failed to initiate OAuth flow');
            }
            return;
        }

        const data = await connectResponse.json();
        console.log('Backend response data:', data);
        
        if (data.success && data.oauthUrl) {
            // Redirect to Facebook OAuth login
            console.log('Redirecting to:', data.oauthUrl);
            window.location.href = data.oauthUrl;
        } else {
            alert('Failed to get authorization URL from server');
        }
    } catch (error) {
        console.error('OAuth start error:', error);
        alert(`Error: ${error.message}`);
    }
}

function handleConnectMetaClick() {
    // Show a helpful message if backend isn't deployed
    const message = `Meta Integration Backend Setup Required

To enable Meta Account connections, follow these steps:

1. Deploy Backend Files:
   - api/metaIntegration.js
   - routes/meta.js

2. Set Environment Variables:
   - FACEBOOK_APP_ID
   - FACEBOOK_APP_SECRET
   - APP_URL
   - MARKETING_HUB_ENCRYPTION_KEY

3. Configure Firestore Collections

See: META_DEPLOYMENT_GUIDE.md for detailed instructions`;

    // Try to connect, but if backend not ready, show guide
    if (typeof startMetaOAuth === 'function') {
        startMetaOAuth();
    } else {
        alert(message);
    }
}

function showMetaSetupGuide() {
    // Open the proper modal dialog
    const modal = document.getElementById('metaSetupGuideModal');
    if (modal) {
        modal.showModal();
    } else {
        // Fallback if modal doesn't exist
        alert('Meta Integration Setup Required\n\nDeploy backend files:\n- api/metaIntegration.js\n- routes/meta.js\n\nSet environment variables:\n- FACEBOOK_APP_ID\n- FACEBOOK_APP_SECRET\n- APP_URL\n- MARKETING_HUB_ENCRYPTION_KEY\n\nSee: META_DEPLOYMENT_GUIDE.md');
    }
}

async function reconnectMeta() {
    if (confirm('This will open the Meta authentication page. Continue?')) {
        startMetaOAuth();
    }
}

async function disconnectMeta() {
    if (confirm('Are you sure? This will disconnect your Meta account from One Desk.')) {
        try {
            metaConnectionState.loading = true;
            
            // Get Firebase ID token
            const idToken = await window.getFirebaseIdToken();
            if (!idToken) {
                const toastFn = typeof window.toast === 'function' ? window.toast : 
                               typeof window.showToast === 'function' ? window.showToast : 
                               () => alert('Error');
                toastFn('Authentication error. Please try logging in again.', 'error');
                return;
            }
            
            const response = await fetch('/api/meta/disconnect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                }
            });

            if (!response.ok) throw new Error('Disconnect failed');

            metaConnectionState = {
                connected: false,
                business: null,
                page: null,
                instagram: null,
                adAccounts: [],
                permissions: [],
                lastSync: null,
                loading: false
            };

            renderMetaIntegrationView();
            
            const toastFn = typeof window.toast === 'function' ? window.toast : 
                           typeof window.showToast === 'function' ? window.showToast : 
                           () => {};
            toastFn('Meta account disconnected successfully', 'success');
        } catch (error) {
            console.error('Disconnect error:', error);
            const toastFn = typeof window.toast === 'function' ? window.toast : 
                           typeof window.showToast === 'function' ? window.showToast : 
                           () => alert('Error');
            toastFn('Failed to disconnect Meta account', 'error');
        } finally {
            metaConnectionState.loading = false;
        }
    }
}

async function refreshMetaConnection() {
    try {
        metaConnectionState.loading = true;
        await loadMetaConnectionData();
        renderMetaIntegrationView();
        toast('Connection refreshed', 'success');
    } catch (error) {
        console.error('Refresh error:', error);
        toast('Failed to refresh connection', 'error');
    } finally {
        metaConnectionState.loading = false;
    }
}

async function syncMetaData() {
    try {
        metaConnectionState.loading = true;
        
        // Get Firebase ID token
        const idToken = await window.getFirebaseIdToken();
        if (!idToken) {
            const toastFn = typeof window.toast === 'function' ? window.toast : 
                           typeof window.showToast === 'function' ? window.showToast : 
                           () => alert('Error');
            toastFn('Authentication error. Please try logging in again.', 'error');
            return;
        }
        
        const response = await fetch('/api/meta/sync', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            }
        });

        if (!response.ok) throw new Error('Sync failed');

        await loadMetaConnectionData();
        renderMetaIntegrationView();
        
        const toastFn = typeof window.toast === 'function' ? window.toast : 
                       typeof window.showToast === 'function' ? window.showToast : 
                       () => {};
        toastFn('Data synced successfully', 'success');
    } catch (error) {
        console.error('Sync error:', error);
        const toastFn = typeof window.toast === 'function' ? window.toast : 
                       typeof window.showToast === 'function' ? window.showToast : 
                       () => alert('Error');
        toastFn('Failed to sync data', 'error');
    } finally {
        metaConnectionState.loading = false;
    }
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

function formatConnectionDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatSyncTime(date) {
    if (!date) return 'Never';
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
    
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric'
    });
}

function openMetaDocumentation() {
    window.open('https://developers.facebook.com/docs/facebook-login', '_blank');
}

// ════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════

window.initMetaIntegration = initMetaIntegration;
window.startMetaOAuth = startMetaOAuth;
window.handleConnectMetaClick = handleConnectMetaClick;
window.showMetaSetupGuide = showMetaSetupGuide;
window.renderMetaIntegrationView = renderMetaIntegrationView;
window.renderEmptyState = renderEmptyState;
window.reconnectMeta = reconnectMeta;
window.disconnectMeta = disconnectMeta;
window.refreshMetaConnection = refreshMetaConnection;
window.syncMetaData = syncMetaData;
window.openMetaDocumentation = openMetaDocumentation;
