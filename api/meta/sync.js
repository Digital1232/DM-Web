/**
 * Vercel Serverless Function: Meta Sync
 * Endpoint: /api/meta/sync
 * Method: POST
 * Purpose: Sync latest Meta data from Graph API
 */

const admin = require('firebase-admin');
const crypto = require('crypto');
const fetch = require('node-fetch');

// Initialize Firebase if not already initialized
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    });
}

const db = admin.firestore();
const ENCRYPTION_KEY = process.env.MARKETING_HUB_ENCRYPTION_KEY || process.env.META_ENCRYPTION_KEY || 'your-secure-key-here';

// Decryption utility
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

// Encryption utility
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
            return res.status(400).json({ 
                success: false, 
                message: 'No Meta connection found'
            });
        }

        const connection = connectionDoc.data();
        const accessToken = decrypt(connection.accessToken);

        // Fetch latest follower counts and data
        let updatedData = { ...connection };

        // Update Facebook page data
        if (connection.pageId) {
            const pageResponse = await fetch(
                `https://graph.facebook.com/v18.0/${connection.pageId}?` +
                `fields=id,name,category,followers_count&` +
                `access_token=${accessToken}`
            );
            const pageData = await pageResponse.json();
            if (!pageData.error) {
                updatedData.pageFollowers = pageData.followers_count || 0;
            }
        }

        // Update Instagram data
        if (connection.instagramId) {
            const igResponse = await fetch(
                `https://graph.facebook.com/v18.0/${connection.instagramId}?` +
                `fields=id,username,name,profile_picture_url,followers_count&` +
                `access_token=${accessToken}`
            );
            const igData = await igResponse.json();
            if (!igData.error) {
                updatedData.instagramFollowers = igData.followers_count || 0;
                updatedData.instagramProfilePicture = igData.profile_picture_url || '';
                updatedData.instagramUsername = igData.username || '';
            }
        }

        // Update timestamp
        updatedData.lastSync = admin.firestore.FieldValue.serverTimestamp();
        updatedData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

        // Save updated data
        await db.collection('meta_connections').doc(userId).set(updatedData);

        // Log sync
        await db.collection('meta_sync_log').add({
            userId: userId,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            success: true,
            updates: {
                pageFollowers: updatedData.pageFollowers,
                instagramFollowers: updatedData.instagramFollowers
            }
        });

        return res.status(200).json({ 
            success: true, 
            message: 'Meta data synced successfully',
            data: {
                pageFollowers: updatedData.pageFollowers,
                instagramFollowers: updatedData.instagramFollowers,
                lastSync: updatedData.lastSync
            }
        });

    } catch (error) {
        console.error('Meta sync error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Failed to sync data: ' + error.message 
        });
    }
};
