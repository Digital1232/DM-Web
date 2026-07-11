/**
 * GET /api/meta/callback - Handle Meta OAuth callback
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

function encrypt(text) {
    const key = crypto
        .createHash('sha256')
        .update(String(process.env.MARKETING_HUB_ENCRYPTION_KEY || ''))
        .digest();
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
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
        const redirectUri = `${process.env.APP_URL || 'https://onedesk.vilpower.com'}/api/meta/callback`;
        const tokenResponse = await fetch(
            `https://graph.facebook.com/v19.0/oauth/access_token`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: process.env.FACEBOOK_APP_ID,
                    client_secret: process.env.FACEBOOK_APP_SECRET,
                    redirect_uri: redirectUri,
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
            `https://graph.facebook.com/v19.0/me?fields=id,name,email,picture&access_token=${tokenData.access_token}`
        );
        const meData = await meResponse.json();

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
            status: 'connected',
        };

        // Store in Firestore
        await db.collection('meta_connections').doc(userId).set(connectionData, { merge: true });

        await logAudit(userId, 'oauth_completed', {
            facebookId: meData.id,
            facebookName: meData.name,
        });

        // Redirect to success page
        const frontendUrl = process.env.FRONTEND_URL || 'https://onedesk.vilpower.com';
        return res.redirect(302, `${frontendUrl}?meta=connected&userId=${userId}`);
    } catch (error) {
        console.error('Callback error:', error);
        const frontendUrl = process.env.FRONTEND_URL || 'https://onedesk.vilpower.com';
        return res.redirect(302, `${frontendUrl}?meta=error&message=${encodeURIComponent(error.message)}`);
    }
};
