/**
 * One Desk - Push Notification Dispatch API (FCM)
 * Sends background push notifications to mobile devices via Firebase Admin SDK.
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
    try {
        const serviceAccount = {
            type: process.env.FIREBASE_TYPE || 'service_account',
            project_id: process.env.FIREBASE_PROJECT_ID || 'worksync-vilpower',
            private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
            private_key: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
            client_id: process.env.FIREBASE_CLIENT_ID,
            auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
            token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
            auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
        };

        if (serviceAccount.private_key && serviceAccount.client_email) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://worksync-vilpower-default-rtdb.firebaseio.com'
            });
        } else {
            admin.initializeApp();
        }
    } catch (e) {
        console.warn('[PushAPI] Firebase admin initialization fallback:', e.message);
    }
}

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { userKey, tokens, title, body, data } = req.body || {};

        if (!title && !body) {
            return res.status(400).json({ error: 'Notification title and body are required.' });
        }

        let targetTokens = Array.isArray(tokens) ? tokens : [];

        // If userKey provided, fetch stored FCM tokens from Firebase Realtime DB
        if ((!targetTokens || targetTokens.length === 0) && userKey) {
            try {
                const db = admin.database();
                const snapshot = await db.ref(`worksync/fcm_tokens/${userKey}`).once('value');
                const val = snapshot.val();
                if (val) {
                    targetTokens = Object.values(val).map(item => item.token).filter(Boolean);
                }
            } catch (err) {
                console.warn('[PushAPI] Could not fetch tokens from DB:', err.message);
            }
        }

        if (!targetTokens || targetTokens.length === 0) {
            return res.status(200).json({ success: true, message: 'No registered device tokens for user.', sentCount: 0 });
        }

        const messagePayload = {
            notification: {
                title: title || 'One Desk Notification',
                body: body || ''
            },
            data: Object.fromEntries(
                Object.entries(data || {}).map(([k, v]) => [k, String(v)])
            ),
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    channelId: 'onedesk_notifications',
                    priority: 'high'
                }
            }
        };

        const response = await admin.messaging().sendEachForMulticast({
            tokens: targetTokens,
            ...messagePayload
        });

        console.log(`[PushAPI] Push delivered: ${response.successCount} succeeded, ${response.failureCount} failed.`);

        return res.status(200).json({
            success: true,
            sentCount: response.successCount,
            failCount: response.failureCount
        });

    } catch (error) {
        console.error('[PushAPI] Error sending push notification:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};
