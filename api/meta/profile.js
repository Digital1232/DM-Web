/**
 * Vercel Serverless Function: Meta Profile (Get Connection Data)
 * Endpoint: /api/meta/profile
 * Method: GET
 * Purpose: Retrieve stored Meta connection data for authenticated user
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

        // Get connection data from Firestore
        const connectionDoc = await db.collection('meta_connections').doc(userId).get();

        if (!connectionDoc.exists) {
            return res.status(200).json({ 
                success: true, 
                data: null,
                message: 'No Meta connection found'
            });
        }

        const connection = connectionDoc.data();

        // Return safe data (never expose encrypted token)
        return res.status(200).json({ 
            success: true, 
            data: {
                businessId: connection.businessId,
                businessName: connection.businessName,
                businessEmail: connection.businessEmail,
                
                // Facebook Page
                pageId: connection.pageId,
                pageName: connection.pageName,
                pageCategory: connection.pageCategory,
                pageFollowers: connection.pageFollowers,
                
                // Instagram Business Account
                instagram: {
                    id: connection.instagramId,
                    username: connection.instagramUsername,
                    followers: connection.instagramFollowers,
                    profilePicture: connection.instagramProfilePicture,
                    type: connection.instagramType || 'BUSINESS'
                },
                
                // Ad Accounts
                adAccounts: connection.adAccounts || [],
                
                // Permissions
                permissions: connection.permissions || [],
                
                // Status
                status: connection.status,
                connectedAt: connection.connectedAt,
                updatedAt: connection.updatedAt,
                lastSync: connection.lastSync,
                expiresAt: connection.expiresAt
            }
        });

    } catch (error) {
        console.error('Meta profile error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch profile: ' + error.message 
        });
    }
};
