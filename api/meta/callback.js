/**
 * Vercel Serverless Function: Meta Callback (OAuth Redirect)
 * Endpoint: /api/meta/callback
 * Method: GET
 * Purpose: Handle Meta OAuth callback, exchange code for token
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

// Encryption utilities
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
        const { code, state } = req.query;

        if (!code || !state) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing authorization code or state' 
            });
        }

        // Verify state for CSRF protection
        const stateDoc = await db.collection('meta_oauth_state').doc(state).get();
        if (!stateDoc.exists) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid or expired state parameter' 
            });
        }

        const stateData = stateDoc.data();
        const userId = stateData.userId;

        // Delete state to prevent reuse
        await db.collection('meta_oauth_state').doc(state).delete();

        // Exchange code for access token
        const appId = process.env.FACEBOOK_APP_ID;
        const appSecret = process.env.FACEBOOK_APP_SECRET;
        const appUrl = process.env.APP_URL || 'http://localhost:3000';
        const redirectUri = `${appUrl}/api/meta/callback`;

        const tokenResponse = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
            method: 'POST',
            body: new URLSearchParams({
                client_id: appId,
                client_secret: appSecret,
                redirect_uri: redirectUri,
                code: code
            })
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            throw new Error(`Facebook OAuth Error: ${tokenData.error.message}`);
        }

        const shortLivedToken = tokenData.access_token;

        // Exchange for long-lived token
        const longTokenResponse = await fetch(
            `https://graph.facebook.com/v18.0/oauth/access_token?` +
            `grant_type=fb_exchange_token&` +
            `client_id=${appId}&` +
            `client_secret=${appSecret}&` +
            `fb_exchange_token=${shortLivedToken}`
        );

        const longTokenData = await longTokenResponse.json();
        if (longTokenData.error) {
            throw new Error(`Token Exchange Error: ${longTokenData.error.message}`);
        }

        const longLivedToken = longTokenData.access_token;
        const expiresIn = longTokenData.expires_in;

        // Fetch user business information
        const userResponse = await fetch(
            `https://graph.facebook.com/v18.0/me?` +
            `fields=id,name,email,businesses&` +
            `access_token=${longLivedToken}`
        );
        const userData = await userResponse.json();

        if (userData.error) {
            throw new Error(`User Info Error: ${userData.error.message}`);
        }

        // Fetch Facebook Pages
        const pagesResponse = await fetch(
            `https://graph.facebook.com/v18.0/me/accounts?` +
            `fields=id,name,category,followers_count&` +
            `access_token=${longLivedToken}`
        );
        const pagesData = await pagesResponse.json();

        let facebookPage = null;
        if (pagesData.data && pagesData.data.length > 0) {
            facebookPage = pagesData.data[0];
        }

        // Fetch Instagram Business Account
        let instagramAccount = null;
        if (facebookPage) {
            const igResponse = await fetch(
                `https://graph.facebook.com/v18.0/${facebookPage.id}?` +
                `fields=instagram_business_account&` +
                `access_token=${longLivedToken}`
            );
            const igData = await igResponse.json();
            
            if (igData.instagram_business_account) {
                const igDetailsResponse = await fetch(
                    `https://graph.facebook.com/v18.0/${igData.instagram_business_account.id}?` +
                    `fields=id,username,name,profile_picture_url,followers_count&` +
                    `access_token=${longLivedToken}`
                );
                instagramAccount = await igDetailsResponse.json();
            }
        }

        // Fetch Ad Accounts
        let adAccounts = [];
        if (userData.businesses && userData.businesses.data && userData.businesses.data.length > 0) {
            const businessId = userData.businesses.data[0].id;
            const adsResponse = await fetch(
                `https://graph.facebook.com/v18.0/${businessId}/adaccounts?` +
                `fields=id,name,currency,timezone&` +
                `access_token=${longLivedToken}`
            );
            const adsData = await adsResponse.json();
            if (adsData.data) {
                adAccounts = adsData.data;
            }
        }

        // Create connection record
        const connectionData = {
            userId: userId,
            provider: 'meta',
            businessId: userData.id,
            businessName: userData.name || 'Meta Business',
            businessEmail: userData.email || '',
            
            // Facebook Page
            pageId: facebookPage?.id || '',
            pageName: facebookPage?.name || '',
            pageCategory: facebookPage?.category || '',
            pageFollowers: facebookPage?.followers_count || 0,
            
            // Instagram Business Account
            instagramId: instagramAccount?.id || '',
            instagramUsername: instagramAccount?.username || '',
            instagramFollowers: instagramAccount?.followers_count || 0,
            instagramProfilePicture: instagramAccount?.profile_picture_url || '',
            
            // Ad Accounts
            adAccounts: adAccounts.map(account => ({
                id: account.id,
                name: account.name,
                currency: account.currency,
                timezone: account.timezone
            })),
            
            // Permissions
            permissions: [
                'business_management',
                'pages_read_engagement',
                'pages_read_user_content',
                'instagram_basic',
                'instagram_graph_api',
                'ads_read'
            ],
            
            // Token Management
            accessToken: encrypt(longLivedToken),
            tokenType: 'bearer',
            expiresAt: new Date(Date.now() + expiresIn * 1000),
            
            // Timestamps
            connectedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastSync: null,
            
            // Status
            status: 'active'
        };

        // Store in Firestore
        await db.collection('meta_connections').doc(userId).set(connectionData);

        // Redirect to app with success
        const appHomeUrl = `${appUrl}/dashboard?view=meta-integration&status=connected`;
        res.redirect(appHomeUrl);

    } catch (error) {
        console.error('Meta callback error:', error);
        const appUrl = process.env.APP_URL || 'http://localhost:3000';
        res.redirect(`${appUrl}/dashboard?view=meta-integration&error=${encodeURIComponent(error.message)}`);
    }
};
