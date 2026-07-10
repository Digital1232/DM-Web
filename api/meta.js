/**
 * Meta Integration API - Consolidated Serverless Handler
 * Handles all Meta OAuth and connection endpoints
 * Deployed to Vercel as a single serverless function
 */

const admin = require('firebase-admin');
const fetch = require('node-fetch');
const crypto = require('crypto');

// ════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ════════════════════════════════════════════════════════════════════

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    const serviceAccount = {
        type: process.env.FIREBASE_TYPE || 'service_account',
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
        token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
    };

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const db = admin.firestore();

// ════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ════════════════════════════════════════════════════════════════════

const META_CONFIG = {
    APP_ID: process.env.FACEBOOK_APP_ID,
    APP_SECRET: process.env.FACEBOOK_APP_SECRET,
    REDIRECT_URI: `${process.env.APP_URL || 'https://dm-fcr6shc1p-digital1232s-projects.vercel.app'}/api/meta/callback`,
    GRAPH_API_VERSION: 'v19.0',
    ENCRYPTION_KEY: process.env.MARKETING_HUB_ENCRYPTION_KEY || '',
};

// ════════════════════════════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════════════════════════════

/**
 * Encrypt a string using AES-256-CBC
 */
function encrypt(text) {
    if (!META_CONFIG.ENCRYPTION_KEY) {
        throw new Error('Encryption key not configured');
    }
    
    const key = crypto
        .createHash('sha256')
        .update(String(META_CONFIG.ENCRYPTION_KEY))
        .digest();
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt a string using AES-256-CBC
 */
function decrypt(text) {
    if (!META_CONFIG.ENCRYPTION_KEY) {
        throw new Error('Encryption key not configured');
    }
    
    const key = crypto
        .createHash('sha256')
        .update(String(META_CONFIG.ENCRYPTION_KEY))
        .digest();
    
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    let decrypted = decipher.update(parts[1], 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}

/**
 * Generate CSRF state token
 */
function generateState() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Verify authentication from request
 */
async function verifyAuth(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Unauthorized: Missing bearer token');
    }
    
    const token = authHeader.substring(7);
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        return decodedToken;
    } catch (error) {
        throw new Error('Unauthorized: Invalid token');
    }
}

/**
 * Log audit event
 */
async function logAudit(userId, action, details) {
    try {
        await db.collection('meta_audit_log').add({
            userId,
            action,
            details,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
        console.error('Failed to log audit:', error);
    }
}

// ════════════════════════════════════════════════════════════════════
// OAUTH FLOW HANDLERS
// ════════════════════════════════════════════════════════════════════

/**
 * Initiate OAuth flow - returns URL to redirect user to
 */
async function handleConnect(req, res, decodedToken) {
    try {
        // Generate and store CSRF state
        const state = generateState();
        await db.collection('meta_oauth_state').add({
            userId: decodedToken.uid,
            state,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000)), // 10 min expiry
        });

        const scope = [
            'pages_read_user_content',
            'pages_read_engagement',
            'instagram_basic',
            'instagram_graph_api',
            'business_management',
            'ads_management',
            'leads_retrieval',
        ];

        const oauthUrl = `https://www.facebook.com/${META_CONFIG.GRAPH_API_VERSION}/dialog/oauth?` +
            `client_id=${META_CONFIG.APP_ID}` +
            `&redirect_uri=${encodeURIComponent(META_CONFIG.REDIRECT_URI)}` +
            `&scope=${scope.join(',')}` +
            `&state=${state}` +
            `&response_type=code`;

        await logAudit(decodedToken.uid, 'oauth_initiated', { redirectUrl: oauthUrl });

        return res.status(200).json({
            success: true,
            oauthUrl,
        });
    } catch (error) {
        console.error('Connect error:', error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

/**
 * Handle OAuth callback - exchange code for token
 */
async function handleCallback(req, res) {
    try {
        const { code, state } = req.query;

        if (!code || !state) {
            return res.status(400).json({
                success: false,
                message: 'Missing code or state parameter',
            });
        }

        // Verify state token
        const stateDoc = await db
            .collection('meta_oauth_state')
            .where('state', '==', state)
            .limit(1)
            .get();

        if (stateDoc.empty) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired state token',
            });
        }

        const stateData = stateDoc.docs[0].data();
        const userId = stateData.userId;

        // Clean up used state token
        await stateDoc.docs[0].ref.delete();

        // Exchange code for access token
        const tokenResponse = await fetch(
            `https://graph.facebook.com/${META_CONFIG.GRAPH_API_VERSION}/oauth/access_token`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: META_CONFIG.APP_ID,
                    client_secret: META_CONFIG.APP_SECRET,
                    redirect_uri: META_CONFIG.REDIRECT_URI,
                    code,
                }).toString(),
            }
        );

        const tokenData = await tokenResponse.json();

        if (!tokenData.access_token) {
            throw new Error(tokenData.error?.message || 'Failed to get access token');
        }

        // Get user info from Facebook
        const meResponse = await fetch(
            `https://graph.facebook.com/${META_CONFIG.GRAPH_API_VERSION}/me?fields=id,name,email,picture&access_token=${tokenData.access_token}`
        );
        const meData = await meResponse.json();

        // Get Instagram account connected to the user
        const instagramResponse = await fetch(
            `https://graph.facebook.com/${META_CONFIG.GRAPH_API_VERSION}/me?fields=ig_user&access_token=${tokenData.access_token}`
        );
        const instagramData = await instagramResponse.json();

        // Encrypt and store connection data
        const encryptedToken = encrypt(tokenData.access_token);

        const connectionData = {
            userId,
            facebookId: meData.id,
            facebookName: meData.name,
            facebookEmail: meData.email,
            profilePicture: meData.picture?.data?.url || '',
            accessToken: encryptedToken,
            tokenType: tokenData.token_type,
            connectedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastSync: null,
            igUserId: instagramData.ig_user?.id || null,
            status: 'connected',
        };

        // Store in Firestore
        await db.collection('meta_connections').doc(userId).set(connectionData, { merge: true });

        await logAudit(userId, 'oauth_completed', {
            facebookId: meData.id,
            facebookName: meData.name,
        });

        // Redirect to success page
        const frontendUrl = process.env.FRONTEND_URL || 'https://dm-fcr6shc1p-digital1232s-projects.vercel.app';
        return res.redirect(302, `${frontendUrl}?meta=connected&userId=${userId}`);
    } catch (error) {
        console.error('Callback error:', error);
        const frontendUrl = process.env.FRONTEND_URL || 'https://dm-fcr6shc1p-digital1232s-projects.vercel.app';
        return res.redirect(302, `${frontendUrl}?meta=error&message=${encodeURIComponent(error.message)}`);
    }
}

// ════════════════════════════════════════════════════════════════════
// CONNECTION DATA HANDLERS
// ════════════════════════════════════════════════════════════════════

/**
 * Get stored Meta connection data
 */
async function handleProfile(req, res, decodedToken) {
    try {
        const doc = await db.collection('meta_connections').doc(decodedToken.uid).get();

        if (!doc.exists) {
            return res.status(404).json({
                success: false,
                message: 'No Meta connection found',
            });
        }

        const data = doc.data();
        
        // Don't return the encrypted token
        delete data.accessToken;

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        console.error('Profile error:', error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

/**
 * Refresh/validate connection
 */
async function handleRefresh(req, res, decodedToken) {
    try {
        const doc = await db.collection('meta_connections').doc(decodedToken.uid).get();

        if (!doc.exists) {
            return res.status(404).json({
                success: false,
                message: 'No Meta connection found',
            });
        }

        // In a real implementation, you would check token validity here
        const data = doc.data();
        delete data.accessToken;

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        console.error('Refresh error:', error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

/**
 * Sync latest Meta data
 */
async function handleSync(req, res, decodedToken) {
    try {
        const doc = await db.collection('meta_connections').doc(decodedToken.uid).get();

        if (!doc.exists) {
            return res.status(404).json({
                success: false,
                message: 'No Meta connection found',
            });
        }

        const data = doc.data();
        const accessToken = decrypt(data.accessToken);

        // Fetch latest Instagram follower count (example)
        let followers = 0;
        if (data.igUserId) {
            try {
                const igResponse = await fetch(
                    `https://graph.instagram.com/${data.igUserId}?fields=followers_count&access_token=${accessToken}`
                );
                const igData = await igResponse.json();
                followers = igData.followers_count || 0;
            } catch (error) {
                console.warn('Failed to fetch Instagram data:', error);
            }
        }

        // Update sync time and data
        await db.collection('meta_connections').doc(decodedToken.uid).update({
            lastSync: admin.firestore.FieldValue.serverTimestamp(),
            igFollowers: followers,
        });

        await db.collection('meta_sync_log').add({
            userId: decodedToken.uid,
            syncedAt: admin.firestore.FieldValue.serverTimestamp(),
            followers,
        });

        return res.status(200).json({
            success: true,
            synced: true,
            followers,
        });
    } catch (error) {
        console.error('Sync error:', error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

// ════════════════════════════════════════════════════════════════════
// ACCOUNT MANAGEMENT
// ════════════════════════════════════════════════════════════════════

/**
 * Disconnect Meta account
 */
async function handleDisconnect(req, res, decodedToken) {
    try {
        const doc = await db.collection('meta_connections').doc(decodedToken.uid).get();

        if (!doc.exists) {
            return res.status(404).json({
                success: false,
                message: 'No Meta connection found',
            });
        }

        await db.collection('meta_connections').doc(decodedToken.uid).delete();

        await logAudit(decodedToken.uid, 'disconnected', {});

        return res.status(200).json({
            success: true,
            message: 'Meta account disconnected',
        });
    } catch (error) {
        console.error('Disconnect error:', error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

// ════════════════════════════════════════════════════════════════════
// VERCEL SERVERLESS HANDLER
// ════════════════════════════════════════════════════════════════════

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token,X-Requested-With,Accept,Accept-Version,Content-Length,Content-MD5,Content-Type,Date,X-Api-Version,Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const [, , path] = req.url.split('/').slice(0, 4);
        const fullPath = `/${path}${req.url.includes('?') ? '?' + req.url.split('?')[1] : ''}`;

        // Public routes (no auth required)
        if (req.method === 'GET' && req.url.includes('/api/meta/callback')) {
            return handleCallback(req, res);
        }

        // Protected routes (auth required)
        const decodedToken = await verifyAuth(req);

        if (req.method === 'POST' && fullPath.startsWith('/connect')) {
            return handleConnect(req, res, decodedToken);
        } else if (req.method === 'GET' && fullPath.startsWith('/profile')) {
            return handleProfile(req, res, decodedToken);
        } else if (req.method === 'POST' && fullPath.startsWith('/refresh')) {
            return handleRefresh(req, res, decodedToken);
        } else if (req.method === 'POST' && fullPath.startsWith('/sync')) {
            return handleSync(req, res, decodedToken);
        } else if (req.method === 'POST' && fullPath.startsWith('/disconnect')) {
            return handleDisconnect(req, res, decodedToken);
        }

        return res.status(404).json({
            success: false,
            message: 'Endpoint not found',
        });
    } catch (error) {
        console.error('Handler error:', error);
        return res.status(error.message.includes('Unauthorized') ? 401 : 500).json({
            success: false,
            message: error.message,
        });
    }
};
