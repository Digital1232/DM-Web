/**
 * Vercel Serverless Function: Meta Connect (Initiate OAuth)
 * Endpoint: /api/meta/connect
 * Method: POST
 * Purpose: Initiate Meta OAuth flow by generating OAuth URL
 */

const admin = require('firebase-admin');
const crypto = require('crypto');

// Initialize Firebase if not already initialized
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    });
}

const db = admin.firestore();

// Helper functions
function generateState() {
    return crypto.randomBytes(32).toString('hex');
}

function verifyFirebaseToken(token) {
    return admin.auth().verifyIdToken(token);
}

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token,X-Requested-With,Accept,Accept-Version,Content-Length,Content-MD5,Content-Type,Date,X-Api-Version,Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // Get Firebase token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ 
                success: false, 
                message: 'Unauthorized: No token provided' 
            });
        }

        const token = authHeader.substring(7);
        const decodedToken = await verifyFirebaseToken(token);
        const userId = decodedToken.uid;

        // Generate state for CSRF protection
        const state = generateState();
        
        // Store state in Firestore with 10-minute expiration
        await db.collection('meta_oauth_state').doc(state).set({
            userId: userId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: new Date(Date.now() + 10 * 60 * 1000)
        });

        const appId = process.env.FACEBOOK_APP_ID;
        const appUrl = process.env.APP_URL || 'http://localhost:3000';
        const redirectUri = `${appUrl}/api/meta/callback`;
        
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

        return res.status(200).json({ 
            success: true, 
            authUrl: oauthUrl 
        });

    } catch (error) {
        console.error('Meta connect error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Failed to initiate connection: ' + error.message 
        });
    }
};
