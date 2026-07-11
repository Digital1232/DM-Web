/**
 * POST /api/meta/connect - Initiate Meta OAuth flow
 */

const admin = require('firebase-admin');
const crypto = require('crypto');

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

function generateState() {
    return crypto.randomBytes(32).toString('hex');
}

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

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        // Verify authentication
        const decodedToken = await verifyAuth(req);

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

        const redirectUri = `${process.env.APP_URL || 'https://onedesk.vilpower.com'}/api/meta/callback`;
        const oauthUrl = `https://www.facebook.com/v19.0/dialog/oauth?` +
            `client_id=${process.env.FACEBOOK_APP_ID}` +
            `&redirect_uri=${encodeURIComponent(redirectUri)}` +
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
        return res.status(error.message.includes('Unauthorized') ? 401 : 500).json({
            success: false,
            message: error.message,
        });
    }
};
