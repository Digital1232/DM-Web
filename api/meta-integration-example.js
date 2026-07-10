/**
 * Meta Integration Example
 * Copy and adapt these functions into your main HTML/JS
 * This file shows practical examples of how to use the Meta services
 */

// ═══════════════════════════════════════════════════════════════════
// GLOBAL REFERENCES
// ═══════════════════════════════════════════════════════════════════

let metaAPI = null;
let metaTokens = null;
let metaSync = null;
let syncIntervalId = null;

// ═══════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Initialize Meta services after user login
 * Call this when user authenticates
 */
async function initializeMetaServices() {
    if (!currentUser) {
        console.warn('No user logged in');
        return;
    }

    try {
        // Get credentials from environment or config
        const appId = process.env.REACT_APP_META_APP_ID || 'YOUR_APP_ID';
        const appSecret = process.env.REACT_APP_META_APP_SECRET || 'YOUR_APP_SECRET';
        const redirectUri = process.env.REACT_APP_META_REDIRECT_URI || 
                          'http://localhost:3000/auth/meta/callback';

        // Create service instances
        metaAPI = new MetaAPIService(appId, appSecret, redirectUri);
        metaTokens = new MetaTokenService(db, currentUser.uid);
        metaSync = new MetaSyncService(db, metaAPI, metaTokens);

        console.log('Meta services initialized');
        
        // Update UI status
        updateMetaConnectionStatus();
    } catch (error) {
        console.error('Failed to initialize Meta services:', error);
        toast('Failed to initialize Meta integration', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════════
// CONNECTION & AUTH
// ═══════════════════════════════════════════════════════════════════

/**
 * Initiate Meta account connection
 * Opens OAuth login in new window
 */
async function connectMetaAccount() {
    if (!metaAPI) {
        toast('Meta services not initialized', 'error');
        return;
    }

    try {
        const loginUrl = metaAPI.getLoginUrl();
        console.log('Opening Meta login:', loginUrl);
        
        // Open in new window
        const width = 800;
        const height = 600;
        const left = (window.innerWidth - width) / 2;
        const top = (window.innerHeight - height) / 2;

        window.open(
            loginUrl,
            'Meta Login',
            `width=${width},height=${height},left=${left},top=${top}`
        );

        // Listen for callback (setup in your callback page)
        // Or use window.opener.handleMetaAuthCallback(code, state)
    } catch (error) {
        console.error('Connection error:', error);
        toast('Failed to start Meta connection', 'error');
    }
}

/**
 * Handle Meta OAuth callback
 * Call this from your redirect page (/auth/meta/callback)
 */
async function handleMetaAuthCallback() {
    try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const error = params.get('error');

        if (error) {
            console.error('OAuth error:', error);
            toast(`Meta login failed: ${error}`, 'error');
            return;
        }

        if (!code) {
            console.error('No authorization code received');
            toast('No authorization code received', 'error');
            return;
        }

        // Show progress
        const statusEl = document.getElementById('meta-auth-status');
        if (statusEl) statusEl.innerHTML = '<div class="flex items-center gap-2"><iconify-icon icon="solar:loading-bold" class="animate-spin"></iconify-icon> Authenticating...</div>';

        // Step 1: Exchange code for token
        console.log('Exchanging code for token...');
        const shortToken = await metaAPI.exchangeCodeForToken(code);

        // Step 2: Convert to long-lived token
        console.log('Getting long-lived token...');
        const longToken = await metaAPI.getLongLivedToken(shortToken.accessToken);

        // Step 3: Get user info
        console.log('Getting user info...');
        const userInfo = await metaAPI.getUserInfo(longToken.accessToken);

        // Step 4: Get user's pages
        console.log('Getting pages...');
        const pages = await metaAPI.getFacebookPages(longToken.accessToken);

        if (!pages || pages.length === 0) {
            toast('No pages found for your account', 'warning');
            setTimeout(() => window.close(), 2000);
            return;
        }

        // Step 5: Save tokens for each page
        console.log(`Saving tokens for ${pages.length} pages...`);
        const savedTokenIds = [];

        for (const page of pages) {
            try {
                const tokenId = await metaTokens.saveTokens({
                    accessToken: page.access_token,
                    refreshToken: longToken.accessToken,
                    expiresAt: new Date(Date.now() + longToken.expiresIn * 1000),
                    platform: 'facebook',
                    pageId: page.id,
                    pageName: page.name,
                });
                savedTokenIds.push(tokenId);
                console.log(`Saved token for page: ${page.name}`);
            } catch (pageError) {
                console.error(`Error saving token for page ${page.name}:`, pageError);
            }
        }

        // Success message
        if (statusEl) {
            statusEl.innerHTML = `
                <div class="flex items-center gap-2 text-green-600">
                    <iconify-icon icon="solar:check-circle-bold" width="20"></iconify-icon>
                    <span>Connected ${savedTokenIds.length} page(s)!</span>
                </div>
            `;
        }

        console.log(`Successfully saved ${savedTokenIds.length} tokens`);
        toast(`Connected ${savedTokenIds.length} page(s)!`, 'success');

        // Close window after 2 seconds
        setTimeout(() => {
            window.close();
            // Notify parent window
            if (window.opener) {
                window.opener.updateMetaConnectionStatus();
            }
        }, 2000);

    } catch (error) {
        console.error('Auth callback error:', error);
        toast('Authentication failed: ' + error.message, 'error');
    }
}

// ═══════════════════════════════════════════════════════════════════
// STATUS & MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

/**
 * Update Meta connection status in UI
 */
async function updateMetaConnectionStatus() {
    if (!metaTokens) return;

    try {
        const pages = await metaTokens.getConnectedPages();
        const statusBadge = document.getElementById('meta-status-badge');
        const connectBtn = document.getElementById('meta-connect-btn');

        if (pages.length === 0) {
            if (statusBadge) statusBadge.classList.add('hidden');
            if (connectBtn) connectBtn.classList.remove('hidden');
        } else {
            if (statusBadge) {
                statusBadge.classList.remove('hidden');
                statusBadge.innerHTML = `
                    <span class="inline-flex items-center gap-2 text-xs font-bold bg-green-50 text-green-700 px-3 py-1 rounded-full">
                        <iconify-icon icon="solar:check-circle-bold" width="14"></iconify-icon>
                        ${pages.length} page(s) connected
                    </span>
                `;
            }
            if (connectBtn) connectBtn.classList.add('hidden');
        }

        // Update pages dropdown if exists
        const pagesSelect = document.getElementById('meta-pages-select');
        if (pagesSelect) {
            pagesSelect.innerHTML = '<option value="">Select a page...</option>';
            pages.forEach(page => {
                const opt = document.createElement('option');
                opt.value = page.tokenId;
                opt.textContent = `${page.pageName} (${page.platform})`;
                pagesSelect.appendChild(opt);
            });
        }
    } catch (error) {
        console.error('Update status error:', error);
    }
}

/**
 * Disconnect a Meta page
 */
async function disconnectMetaPage(tokenId) {
    if (!metaTokens) return;

    try {
        const confirmed = confirm('Are you sure you want to disconnect this page?');
        if (!confirmed) return;

        await metaTokens.deleteToken(tokenId);
        toast('Page disconnected', 'success');
        updateMetaConnectionStatus();
    } catch (error) {
        console.error('Disconnect error:', error);
        toast('Failed to disconnect page', 'error');
    }
}

/**
 * Show list of connected pages
 */
async function showConnectedPages() {
    if (!metaTokens) return;

    try {
        const pages = await metaTokens.getConnectedPages();

        if (pages.length === 0) {
            alert('No connected pages. Connect a Meta account first.');
            return;
        }

        let info = 'Connected Pages:\n\n';
        pages.forEach((page, i) => {
            info += `${i + 1}. ${page.pageName}\n`;
            info += `   Platform: ${page.platform}\n`;
            info += `   Connected: ${new Date(page.connectedAt).toLocaleDateString()}\n`;
            info += `   Last Used: ${page.lastUsed ? new Date(page.lastUsed).toLocaleDateString() : 'Never'}\n\n`;
        });

        alert(info);
    } catch (error) {
        console.error('Show pages error:', error);
        toast('Failed to get pages list', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════════
// SYNC OPERATIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Manually sync all connected Meta pages
 * This is the main sync button click handler
 */
async function manualSyncMeta() {
    if (!metaSync) {
        toast('Meta services not ready', 'error');
        return;
    }

    if (!currentUser) {
        toast('Please log in first', 'error');
        return;
    }

    const btn = document.getElementById('manual-sync-btn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<iconify-icon icon="solar:loading-bold" class="animate-spin" /> Syncing Meta data...';
    }

    try {
        console.log('Starting manual sync...');
        const startTime = Date.now();

        const results = await metaSync.manualSync(currentUser.uid);

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        // Show results
        console.log('Sync Results:', results);

        if (results.success) {
            const msg = `Synced ${results.posts.length} posts in ${duration}s`;
            toast(msg, 'success');
            console.log(msg);

            // Show page details
            if (results.pages.length > 0) {
                console.log('Pages synced:');
                results.pages.forEach(p => {
                    console.log(`- ${p.pageName}: ${p.postCount || 0} posts`);
                });
            }

            // Refresh analytics dashboard
            if (typeof filterSocialAnalytics === 'function') {
                filterSocialAnalytics();
            }
        } else {
            const errorMsg = results.errors
                .map(e => typeof e === 'string' ? e : e.error || e.message)
                .join(', ');
            toast(`Sync failed: ${errorMsg}`, 'error');
            console.error('Sync errors:', results.errors);
        }

    } catch (error) {
        console.error('Manual sync error:', error);
        toast('Sync failed: ' + error.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<iconify-icon icon="solar:refresh-bold" /> Sync Meta Data';
        }
    }
}

/**
 * Enable auto-sync at specified interval
 */
function enableAutoSync(intervalMinutes = 720) { // Default: 12 hours
    if (!metaSync) {
        toast('Meta services not ready', 'error');
        return;
    }

    if (syncIntervalId) {
        toast('Auto-sync already enabled', 'info');
        return;
    }

    try {
        syncIntervalId = metaSync.startScheduledSync(currentUser.uid, intervalMinutes);
        const intervalName = intervalMinutes < 60 ? `${intervalMinutes}m` :
                           intervalMinutes < 1440 ? `${(intervalMinutes/60).toFixed(0)}h` :
                           `${(intervalMinutes/1440).toFixed(1)}d`;
        toast(`Auto-sync enabled (every ${intervalName})`, 'success');
        updateAutoSyncUI(true);
    } catch (error) {
        console.error('Enable auto-sync error:', error);
        toast('Failed to enable auto-sync', 'error');
    }
}

/**
 * Disable auto-sync
 */
function disableAutoSync() {
    if (!syncIntervalId) {
        toast('Auto-sync not enabled', 'info');
        return;
    }

    try {
        metaSync.stopScheduledSync(syncIntervalId);
        syncIntervalId = null;
        toast('Auto-sync disabled', 'info');
        updateAutoSyncUI(false);
    } catch (error) {
        console.error('Disable auto-sync error:', error);
        toast('Failed to disable auto-sync', 'error');
    }
}

/**
 * Toggle auto-sync on/off
 */
function toggleAutoSync(event) {
    const enabled = event.target.checked;

    if (enabled) {
        const intervalSelect = document.getElementById('meta-sync-frequency');
        const interval = intervalSelect ? parseInt(intervalSelect.value) || 720 : 720;
        enableAutoSync(interval);
    } else {
        disableAutoSync();
    }
}

/**
 * Update auto-sync UI
 */
function updateAutoSyncUI(enabled) {
    const checkbox = document.getElementById('auto-sync-toggle');
    if (checkbox) checkbox.checked = enabled;

    const statusEl = document.getElementById('meta-auto-sync-status');
    if (statusEl) {
        if (enabled) {
            statusEl.innerHTML = `
                <div class="flex items-center gap-2 text-green-600 text-xs font-bold">
                    <iconify-icon icon="solar:check-circle-bold" width="14"></iconify-icon>
                    Auto-sync enabled
                </div>
            `;
        } else {
            statusEl.innerHTML = '';
        }
    }
}

/**
 * Check and display sync status
 */
function checkSyncStatus() {
    if (!metaSync) {
        console.log('Meta services not ready');
        return;
    }

    const status = metaSync.getSyncStatus();
    console.log('=== Sync Status ===');
    console.log('In Progress:', status.syncInProgress);
    console.log('Last Synced:', status.lastSyncFormatted);
    console.log('Raw Time:', status.lastSyncTime);

    // Update UI
    const statusEl = document.getElementById('meta-last-sync');
    if (statusEl) {
        statusEl.textContent = `Last synced: ${status.lastSyncFormatted}`;
    }
}

// ═══════════════════════════════════════════════════════════════════
// EVENT LISTENERS SETUP
// ═══════════════════════════════════════════════════════════════════

/**
 * Setup event listeners after DOM loads
 */
function setupMetaEventListeners() {
    // Connect button
    const connectBtn = document.getElementById('meta-connect-btn');
    if (connectBtn) {
        connectBtn.addEventListener('click', connectMetaAccount);
    }

    // Manual sync button
    const syncBtn = document.getElementById('manual-sync-btn');
    if (syncBtn) {
        syncBtn.addEventListener('click', manualSyncMeta);
    }

    // Auto-sync toggle
    const autoSyncToggle = document.getElementById('auto-sync-toggle');
    if (autoSyncToggle) {
        autoSyncToggle.addEventListener('change', toggleAutoSync);
    }

    // Sync frequency dropdown
    const freqSelect = document.getElementById('meta-sync-frequency');
    if (freqSelect) {
        freqSelect.addEventListener('change', (e) => {
            if (syncIntervalId) {
                disableAutoSync();
                enableAutoSync(parseInt(e.target.value));
            }
        });
    }

    // Show pages button
    const showPagesBtn = document.getElementById('show-meta-pages-btn');
    if (showPagesBtn) {
        showPagesBtn.addEventListener('click', showConnectedPages);
    }

    console.log('Meta event listeners setup complete');
}

// ═══════════════════════════════════════════════════════════════════
// INIT ON PAGE LOAD
// ═══════════════════════════════════════════════════════════════════

// Call this when user is authenticated
document.addEventListener('DOMContentLoaded', () => {
    if (currentUser) {
        initializeMetaServices();
        setupMetaEventListeners();
        updateMetaConnectionStatus();
        checkSyncStatus();
    }
});

// Also initialize when user logs in
window.addEventListener('userAuthenticated', () => {
    initializeMetaServices();
    setupMetaEventListeners();
    updateMetaConnectionStatus();
});
