/**
 * GET /api/meta/profile - Get stored Meta connection data
 */

const admin = require('firebase-admin');

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

    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        const decodedToken = await verifyAuth(req);

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
        return res.status(error.message.includes('Unauthorized') ? 401 : 500).json({
            success: false,
            message: error.message,
        });
    }
};
