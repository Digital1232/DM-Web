/**
 * Marketing Hub Backend Service
 * Handles OAuth, token management, and data synchronization for all providers
 */

const admin = require('firebase-admin');
const crypto = require('crypto');

const db = admin.database();
const ENCRYPTION_KEY = process.env.MARKETING_HUB_ENCRYPTION_KEY || 'your-secure-key-here';

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
// META OAUTH HANDLERS
// ════════════════════════════════════════════════════════════════════

async function initiateMetaConnect(req, res) {
    try {
        const state = req.query.state;
        const appId = process.env.FACEBOOK_APP_ID;
        const redirectUri = `${process.env.APP_URL}/api/marketing/meta/callback`;

        const scope = [
            'pages_read_engagement',
            'pages_read_user_content',
            'instagram_basic',
            'instagram_graph_api',
            'business_management'
        ].join(',');

        const oauthUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`;

        res.redirect(oauthUrl);
    } catch (error) {
        console.error('Meta connect initiation error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}

async function handleMetaCallback(req, res) {
    try {
        const { code, state } = req.query;
        const userId = req.user?.uid;

        if (!code || !userId) {
            return res.status(400).json({ success: false, message: 'Missing code or user' });
        }

        // Exchange code for access token
        const tokenResponse = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
            method: 'POST',
            body: new URLSearchParams({
                client_id: process.env.FACEBOOK_APP_ID,
                client_secret: process.env.FACEBOOK_APP_SECRET,
                redirect_uri: `${process.env.APP_URL}/api/marketing/meta/callback`,
                code: code
            })
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            throw new Error(tokenData.error.message);
        }

        const shortLivedToken = tokenData.access_token;

        // Exchange for long-lived token
        const longLivedTokenResponse = await fetch(
            `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.FACEBOOK_APP_ID}&client_secret=${process.env.FACEBOOK_APP_SECRET}&fb_exchange_token=${shortLivedToken}`
        );

        const longLivedTokenData = await longLivedTokenResponse.json();
        const longLivedToken = longLivedTokenData.access_token;

        // Get user business information
        const userResponse = await fetch(
            `https://graph.facebook.com/me?fields=id,name,email,businesses&access_token=${longLivedToken}`
        );
        const userData = await userResponse.json();

        // Store connection in Firestore
        const connection = {
            provider: 'meta',
            userId: userId,
            accessToken: encrypt(longLivedToken),
            businessId: userData.id,
            businessName: userData.name || 'Meta Business',
            permissions: ['pages_read_engagement', 'business_management'],
            status: 'active',
            connectedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastSync: null
        };

        const connectionRef = db.ref(`marketing_integrations/${userId}/meta`);
        await connectionRef.set(connection);

        res.redirect(`/dashboard?view=marketing-hub&tab=connections&status=connected`);
    } catch (error) {
        console.error('Meta callback error:', error);
        res.redirect(`/dashboard?view=marketing-hub&status=error&message=${encodeURIComponent(error.message)}`);
    }
}

// ════════════════════════════════════════════════════════════════════
// FETCH CONNECTIONS
// ════════════════════════════════════════════════════════════════════

async function getConnections(req, res) {
    try {
        const userId = req.user?.uid;
        if (!userId) return res.status(401).json({ success: false });

        const snapshot = await db.ref(`marketing_integrations/${userId}`).once('value');
        const connections = snapshot.val() || {};

        // Decrypt sensitive data
        const safeConnections = {};
        for (const [key, conn] of Object.entries(connections)) {
            safeConnections[key] = {
                ...conn,
                accessToken: undefined // Never send token to client
            };
        }

        res.json(safeConnections);
    } catch (error) {
        console.error('Get connections error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}

// ════════════════════════════════════════════════════════════════════
// SYNC DATA
// ════════════════════════════════════════════════════════════════════

async function syncMetaData(req, res) {
    try {
        const userId = req.user?.uid;
        if (!userId) return res.status(401).json({ success: false });

        const connSnapshot = await db.ref(`marketing_integrations/${userId}/meta`).once('value');
        const connection = connSnapshot.val();

        if (!connection) {
            return res.status(400).json({ success: false, message: 'Meta not connected' });
        }

        const accessToken = decrypt(connection.accessToken);

        // Fetch pages
        const pagesResponse = await fetch(
            `https://graph.facebook.com/me/accounts?fields=id,name,followers_count&access_token=${accessToken}`
        );
        const pagesData = await pagesResponse.json();

        // Update last sync time
        await db.ref(`marketing_integrations/${userId}/meta/lastSync`).set(new Date().toISOString());

        res.json({ success: true, data: pagesData });
    } catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}

// ════════════════════════════════════════════════════════════════════
// DISCONNECT
// ════════════════════════════════════════════════════════════════════

async function disconnectMeta(req, res) {
    try {
        const userId = req.user?.uid;
        if (!userId) return res.status(401).json({ success: false });

        await db.ref(`marketing_integrations/${userId}/meta`).remove();

        res.json({ success: true, message: 'Meta account disconnected' });
    } catch (error) {
        console.error('Disconnect error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}

// ════════════════════════════════════════════════════════════════════
// REFRESH CONNECTION
// ════════════════════════════════════════════════════════════════════

async function refreshMetaConnection(req, res) {
    try {
        const userId = req.user?.uid;
        if (!userId) return res.status(401).json({ success: false });

        // Note: In production, would refresh the token if it's about to expire
        // For now, just verify the connection is still valid
        const connSnapshot = await db.ref(`marketing_integrations/${userId}/meta`).once('value');
        const connection = connSnapshot.val();

        if (!connection) {
            return res.status(400).json({ success: false, message: 'Meta not connected' });
        }

        res.json({ success: true, connection: { ...connection, accessToken: undefined } });
    } catch (error) {
        console.error('Refresh error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}

// ════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════

module.exports = {
    initiateMetaConnect,
    handleMetaCallback,
    getConnections,
    syncMetaData,
    disconnectMeta,
    refreshMetaConnection
};
