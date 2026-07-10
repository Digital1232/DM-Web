/**
 * Meta Integration Backend Service
 * Handles OAuth flow, token management, and Meta data synchronization
 * Production-ready implementation for One Desk Meta App Review
 */

const admin = require('firebase-admin');
const crypto = require('crypto');
const fetch = require('node-fetch');

const db = admin.firestore();
const ENCRYPTION_KEY = process.env.MARKETING_HUB_ENCRYPTION_KEY || process.env.META_ENCRYPTION_KEY || 'your-secure-key-here';

// ════════════════════════════════════════════════════════════════════
// ENCRYPTION UTILITIES
// ════════════════════════════════════════════════════════════════════

function encrypt(text) {
    if (!text) return text;
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
    if (!text) return text;
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(parts[1], 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// ════════════════════════════════════════════════════════════════════
// STATE MANAGEMENT (CSRF Protection)
// ════════════════════════════════════════════════════════════════════

function generateState() {
    return crypto.randomBytes(32).toString('hex');
}

function generateRandomString(length = 16) {
    return crypto.randomBytes(length / 2).toString('hex');
}

// ════════════════════════════════════════════════════════════════════
// META OAUTH FLOW
// ════════════════════════════════════════════════════════════════════

/**
 * Initiates Meta OAuth flow
 * Redirects user to Facebook login
 */
async function initiateConnect(req, res) {
    try {
        const userId = req.user?.uid;
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Unauthorized: User not authenticated' 
            });
        }

        // Generate state for CSRF protection
        const state = generateState();
        
        // Store state in cache with expiration (10 minutes)
        await db.collection('meta_oauth_state').doc(state).set({
            userId: userId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: new Date(Date.now() + 10 * 60 * 1000)
        });

        const appId = process.env.FACEBOOK_APP_ID;
        const redirectUri = `${process.env.APP_URL || 'http://localhost:5000'}/api/meta/callback`;
        
        const scope = [
            'business_management',
            'pages_read_engagement',
            'pages_read_user_content',
            'instagram_basic',
            'instagram_graph_api',
            'ads_read'
        ].join(',');

        const oauthUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
            `client_id=${appId}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `scope=${encodeURIComponent(scope)}&` +
            `state=${state}&` +
            `response_type=code`;

        res.json({ 
            success: true, 
            authUrl: oauthUrl 
        });
    } catch (error) {
        console.error('Meta connect initiation error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to initiate connection: ' + error.message 
        });
    }
}

/**
 * Handles OAuth callback from Meta
 * Exchanges authorization code for access token
 */
async function handleCallback(req, res) {
    try {
        const { code, state } = req.query;

        if (!code || !state) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing authorization code or state' 
            });
        }

        // Verify state for CSRF protection
        const stateDoc = await db.collection('meta_oauth_state').doc(state).get();
        if (!stateDoc.exists) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid or expired state parameter' 
            });
        }

        const stateData = stateDoc.data();
        const userId = stateData.userId;

        // Delete state to prevent reuse
        await db.collection('meta_oauth_state').doc(state).delete();

        // Exchange code for access token
        const appId = process.env.FACEBOOK_APP_ID;
        const appSecret = process.env.FACEBOOK_APP_SECRET;
        const redirectUri = `${process.env.APP_URL || 'http://localhost:5000'}/api/meta/callback`;

        const tokenResponse = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
            method: 'POST',
            body: new URLSearchParams({
                client_id: appId,
                client_secret: appSecret,
                redirect_uri: redirectUri,
                code: code
            })
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            throw new Error(`Facebook OAuth Error: ${tokenData.error.message}`);
        }

        const shortLivedToken = tokenData.access_token;

        // Exchange for long-lived token
        const longTokenResponse = await fetch(
            `https://graph.facebook.com/v18.0/oauth/access_token?` +
            `grant_type=fb_exchange_token&` +
            `client_id=${appId}&` +
            `client_secret=${appSecret}&` +
            `fb_exchange_token=${shortLivedToken}`
        );

        const longTokenData = await longTokenResponse.json();
        if (longTokenData.error) {
            throw new Error(`Token Exchange Error: ${longTokenData.error.message}`);
        }

        const longLivedToken = longTokenData.access_token;
        const expiresIn = longTokenData.expires_in; // 60 days for long-lived token

        // Fetch user business information
        const userResponse = await fetch(
            `https://graph.facebook.com/v18.0/me?` +
            `fields=id,name,email,businesses&` +
            `access_token=${longLivedToken}`
        );
        const userData = await userResponse.json();

        if (userData.error) {
            throw new Error(`User Info Error: ${userData.error.message}`);
        }

        // Fetch Facebook Pages
        const pagesResponse = await fetch(
            `https://graph.facebook.com/v18.0/me/accounts?` +
            `fields=id,name,category,followers_count&` +
            `access_token=${longLivedToken}`
        );
        const pagesData = await pagesResponse.json();

        let facebookPage = null;
        if (pagesData.data && pagesData.data.length > 0) {
            facebookPage = pagesData.data[0]; // Use first page
        }

        // Fetch Instagram Business Account (if available)
        let instagramAccount = null;
        if (facebookPage) {
            const igResponse = await fetch(
                `https://graph.facebook.com/v18.0/${facebookPage.id}?` +
                `fields=instagram_business_account&` +
                `access_token=${longLivedToken}`
            );
            const igData = await igResponse.json();
            
            if (igData.instagram_business_account) {
                const igDetailsResponse = await fetch(
                    `https://graph.facebook.com/v18.0/${igData.instagram_business_account.id}?` +
                    `fields=id,username,name,profile_picture_url,followers_count&` +
                    `access_token=${longLivedToken}`
                );
                instagramAccount = await igDetailsResponse.json();
            }
        }

        // Fetch Ad Accounts
        let adAccounts = [];
        if (userData.businesses && userData.businesses.data && userData.businesses.data.length > 0) {
            const businessId = userData.businesses.data[0].id;
            const adsResponse = await fetch(
                `https://graph.facebook.com/v18.0/${businessId}/adaccounts?` +
                `fields=id,name,currency,timezone&` +
                `access_token=${longLivedToken}`
            );
            const adsData = await adsResponse.json();
            if (adsData.data) {
                adAccounts = adsData.data;
            }
        }

        // Create connection record
        const connectionData = {
            userId: userId,
            provider: 'meta',
            businessId: userData.id,
            businessName: userData.name || 'Meta Business',
            businessEmail: userData.email || '',
            
            // Facebook Page
            pageId: facebookPage?.id || '',
            pageName: facebookPage?.name || '',
            pageCategory: facebookPage?.category || '',
            pageFollowers: facebookPage?.followers_count || 0,
            
            // Instagram Business Account
            instagramId: instagramAccount?.id || '',
            instagramUsername: instagramAccount?.username || '',
            instagramFollowers: instagramAccount?.followers_count || 0,
            instagramProfilePicture: instagramAccount?.profile_picture_url || '',
            
            // Ad Accounts
            adAccounts: adAccounts.map(account => ({
                id: account.id,
                name: account.name,
                currency: account.currency,
                timezone: account.timezone
            })),
            
            // Permissions
            permissions: [
                'business_management',
                'pages_read_engagement',
                'pages_read_user_content',
                'instagram_basic',
                'instagram_graph_api',
                'ads_read'
            ],
            
            // Token Management
            accessToken: encrypt(longLivedToken),
            tokenType: 'bearer',
            expiresAt: new Date(Date.now() + expiresIn * 1000),
            
            // Timestamps
            connectedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastSync: null,
            
            // Status
            status: 'active'
        };

        // Store in Firestore
        await db.collection('meta_connections').doc(userId).set(connectionData);

        res.json({ 
            success: true, 
            message: 'Meta account connected successfully',
            redirect: '/dashboard?view=meta-integration&status=connected'
        });
    } catch (error) {
        console.error('Meta callback error:', error);
        res.status(400).json({ 
            success: false, 
            message: error.message || 'OAuth callback failed'
        });
    }
}

// ════════════════════════════════════════════════════════════════════
// FETCH CONNECTION DATA
// ════════════════════════════════════════════════════════════════════

/**
 * Retrieves stored Meta connection data for authenticated user
 */
async function getProfile(req, res) {
    try {
        const userId = req.user?.uid;
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Unauthorized' 
            });
        }

        const connectionDoc = await db.collection('meta_connections').doc(userId).get();

        if (!connectionDoc.exists) {
            return res.json({ 
                success: true, 
                data: null,
                message: 'No Meta connection found'
            });
        }

        const connection = connectionDoc.data();

        // Return safe data (never include encrypted token)
        res.json({ 
            success: true, 
            data: {
                businessId: connection.businessId,
                businessName: connection.businessName,
                businessEmail: connection.businessEmail,
                pageId: connection.pageId,
                pageName: connection.pageName,
                pageCategory: connection.pageCategory,
                pageFollowers: connection.pageFollowers,
                instagramId: connection.instagramId,
                instagramUsername: connection.instagramUsername,
                instagramFollowers: connection.instagramFollowers,
                instagramProfilePicture: connection.instagramProfilePicture,
                adAccounts: connection.adAccounts,
                permissions: connection.permissions,
                status: connection.status,
                connectedAt: connection.connectedAt?.toDate?.() || connection.connectedAt,
                updatedAt: connection.updatedAt?.toDate?.() || connection.updatedAt,
                lastSync: connection.lastSync?.toDate?.() || connection.lastSync
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch profile: ' + error.message 
        });
    }
}

// ════════════════════════════════════════════════════════════════════
// DISCONNECT
// ════════════════════════════════════════════════════════════════════

/**
 * Disconnects Meta account and removes stored connection data
 */
async function disconnect(req, res) {
    try {
        const userId = req.user?.uid;
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Unauthorized' 
            });
        }

        // Delete connection from Firestore
        await db.collection('meta_connections').doc(userId).delete();

        // Log the disconnection
        await db.collection('meta_audit_log').add({
            userId: userId,
            action: 'disconnect',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: 'success'
        });

        res.json({ 
            success: true, 
            message: 'Meta account disconnected successfully' 
        });
    } catch (error) {
        console.error('Disconnect error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to disconnect: ' + error.message 
        });
    }
}

// ════════════════════════════════════════════════════════════════════
// REFRESH CONNECTION
// ════════════════════════════════════════════════════════════════════

/**
 * Refreshes Meta connection data
 * Currently validates the connection; full token refresh can be added
 */
async function refresh(req, res) {
    try {
        const userId = req.user?.uid;
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Unauthorized' 
            });
        }

        const connectionDoc = await db.collection('meta_connections').doc(userId).get();

        if (!connectionDoc.exists) {
            return res.status(404).json({ 
                success: false, 
                message: 'No Meta connection found' 
            });
        }

        const connection = connectionDoc.data();

        // Verify token is still valid by making a simple API call
        try {
            const accessToken = decrypt(connection.accessToken);
            const testResponse = await fetch(
                `https://graph.facebook.com/v18.0/me?access_token=${accessToken}`
            );
            const testData = await testResponse.json();

            if (testData.error) {
                // Token is invalid
                await db.collection('meta_connections').doc(userId).update({
                    status: 'inactive',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                return res.status(400).json({ 
                    success: false, 
                    message: 'Connection token has expired. Please reconnect.'
                });
            }
        } catch (error) {
            throw new Error(`Token validation failed: ${error.message}`);
        }

        // Update last sync time
        await db.collection('meta_connections').doc(userId).update({
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ 
            success: true, 
            message: 'Connection refreshed successfully'
        });
    } catch (error) {
        console.error('Refresh error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to refresh connection: ' + error.message 
        });
    }
}

// ════════════════════════════════════════════════════════════════════
// SYNC DATA
// ════════════════════════════════════════════════════════════════════

/**
 * Syncs latest Meta data (pages, Instagram, ads, insights)
 */
async function sync(req, res) {
    try {
        const userId = req.user?.uid;
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Unauthorized' 
            });
        }

        const connectionDoc = await db.collection('meta_connections').doc(userId).get();

        if (!connectionDoc.exists) {
            return res.status(404).json({ 
                success: false, 
                message: 'No Meta connection found' 
            });
        }

        const connection = connectionDoc.data();
        const accessToken = decrypt(connection.accessToken);

        // Fetch latest pages
        const pagesResponse = await fetch(
            `https://graph.facebook.com/v18.0/me/accounts?` +
            `fields=id,name,category,followers_count&` +
            `access_token=${accessToken}`
        );
        const pagesData = await pagesResponse.json();

        let updatedPage = null;
        if (pagesData.data && pagesData.data.length > 0) {
            // Find and update the stored page
            const storedPage = pagesData.data.find(p => p.id === connection.pageId);
            if (storedPage) {
                updatedPage = storedPage;
            }
        }

        // Update last sync time and latest data
        await db.collection('meta_connections').doc(userId).update({
            lastSync: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            ...(updatedPage && {
                pageFollowers: updatedPage.followers_count,
                pageName: updatedPage.name,
                pageCategory: updatedPage.category
            })
        });

        // Log sync activity
        await db.collection('meta_sync_log').add({
            userId: userId,
            action: 'sync',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: 'success',
            pagesCount: pagesData.data?.length || 0
        });

        res.json({ 
            success: true, 
            message: 'Data synced successfully',
            syncedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to sync data: ' + error.message 
        });
    }
}

// ════════════════════════════════════════════════════════════════════
// HELPER: Validate Admin Access
// ════════════════════════════════════════════════════════════════════

async function requireAdmin(req, res, next) {
    try {
        const userId = req.user?.uid;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return res.status(403).json({ success: false, message: 'User not found' });
        }

        const userData = userDoc.data();
        if (userData.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }

        next();
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// ════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════

module.exports = {
    // OAuth
    initiateConnect,
    handleCallback,
    
    // Data Fetch
    getProfile,
    
    // Account Management
    disconnect,
    refresh,
    sync,
    
    // Helpers
    requireAdmin,
    generateState,
    encrypt,
    decrypt
};
