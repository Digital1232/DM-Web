/**
 * Vercel Serverless Function: Meta Disconnect
 * Endpoint: /api/meta/disconnect
 * Method: POST
 * Purpose: Disconnect Meta account and remove all stored connection data
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

        // Check if connection exists
        const connectionDoc = await db.collection('meta_connections').doc(userId).get();
        if (!connectionDoc.exists) {
            return res.status(200).json({ 
                success: true, 
                message: 'No Meta connection found to disconnect'
            });
        }

        // Delete connection
        await db.collection('meta_connections').doc(userId).delete();

        // Log disconnection
        await db.collection('meta_audit_log').add({
            userId: userId,
            action: 'disconnect',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            details: {
                businessId: connectionDoc.data().businessId,
                businessName: connectionDoc.data().businessName
            }
        });

        return res.status(200).json({ 
            success: true, 
            message: 'Meta account disconnected successfully' 
        });

    } catch (error) {
        console.error('Meta disconnect error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Failed to disconnect: ' + error.message 
        });
    }
};
