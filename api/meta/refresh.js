/**
 * Vercel Serverless Function: Meta Refresh
 * Endpoint: /api/meta/refresh
 * Method: POST
 * Purpose: Refresh Meta connection status and validate token
 */

const admin = require('firebase-admin');

// Initialize Firebase if not already initialized
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    });
}

const db = admin.firestore();

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

        // Get connection data
        const connectionDoc = await db.collection('meta_connections').doc(userId).get();
        if (!connectionDoc.exists) {
            return res.status(200).json({ 
                success: true, 
                connected: false,
                message: 'No Meta connection found'
            });
        }

        const connection = connectionDoc.data();

        // Check if token is still valid (expires in more than 1 day)
        const expiresAt = new Date(connection.expiresAt?.toDate?.() || connection.expiresAt);
        const now = new Date();
        const daysUntilExpiry = (expiresAt - now) / (1000 * 60 * 60 * 24);

        return res.status(200).json({ 
            success: true, 
            connected: true,
            data: {
                businessName: connection.businessName,
                businessEmail: connection.businessEmail,
                instagramUsername: connection.instagramUsername,
                pageName: connection.pageName,
                status: connection.status,
                connectedAt: connection.connectedAt,
                lastSync: connection.lastSync,
                expiresAt: connection.expiresAt,
                daysUntilExpiry: Math.max(0, Math.floor(daysUntilExpiry))
            }
        });

    } catch (error) {
        console.error('Meta refresh error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Failed to refresh status: ' + error.message 
        });
    }
};
