/**
 * Google Drive File Upload API
 * Handles uploading chat attachments directly to Google Drive
 */

const admin = require('firebase-admin');
const { google } = require('googleapis');
const fetch = require('node-fetch');

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

const db = admin.firebasestore();

// Google Drive Service Account Configuration
const driveServiceAccount = {
    type: 'service_account',
    project_id: process.env.GOOGLE_DRIVE_PROJECT_ID,
    private_key_id: process.env.GOOGLE_DRIVE_PRIVATE_KEY_ID,
    private_key: (process.env.GOOGLE_DRIVE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    client_email: process.env.GOOGLE_DRIVE_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_DRIVE_CLIENT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
};

/**
 * Initialize Google Drive Client
 */
function initializeDrive() {
    const auth = new google.auth.GoogleAuth({
        credentials: driveServiceAccount,
        scopes: ['https://www.googleapis.com/auth/drive'],
    });

    return google.drive({ version: 'v3', auth });
}

/**
 * Verify Firebase token
 */
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

/**
 * Upload file to Google Drive
 */
async function uploadFileToDrive(fileName, fileBuffer, mimeType, conversationId, userId) {
    try {
        const drive = initializeDrive();
        const chatFolderId = process.env.GOOGLE_DRIVE_CHAT_FOLDER_ID || 'root';

        // Create folder structure: Chat Files / Conversation ID
        let parentFolderId = chatFolderId;

        // Create conversation folder if it doesn't exist
        const existingFolders = await drive.files.list({
            q: `name='${conversationId}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            spaces: 'drive',
            fields: 'files(id, name)',
            pageSize: 1,
        });

        if (existingFolders.data.files && existingFolders.data.files.length > 0) {
            parentFolderId = existingFolders.data.files[0].id;
        } else {
            // Create new conversation folder
            const folderRes = await drive.files.create({
                resource: {
                    name: conversationId,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [chatFolderId],
                },
                fields: 'id',
            });
            parentFolderId = folderRes.data.id;
        }

        // Upload file to conversation folder
        const fileRes = await drive.files.create({
            resource: {
                name: fileName,
                parents: [parentFolderId],
                description: `Uploaded from WorkSync Chat by ${userId}`,
                properties: {
                    conversationId,
                    uploadedBy: userId,
                    uploadedAt: new Date().toISOString(),
                },
            },
            media: {
                mimeType: mimeType,
                body: fileBuffer,
            },
            fields: 'id, webViewLink, webContentLink, name, mimeType, size, createdTime',
        });

        return {
            driveFileId: fileRes.data.id,
            fileName: fileRes.data.name,
            mimeType: fileRes.data.mimeType,
            fileSize: fileRes.data.size,
            webViewLink: fileRes.data.webViewLink,
            webContentLink: fileRes.data.webContentLink,
            uploadedAt: fileRes.data.createdTime,
        };
    } catch (error) {
        console.error('Failed to upload to Google Drive:', error);
        throw new Error(`Failed to upload file: ${error.message}`);
    }
}

/**
 * Handle file upload request
 */
async function handleUpload(req, res, decodedToken) {
    try {
        const { fileName, mimeType, conversationId } = req.body;

        if (!fileName || !mimeType || !conversationId) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: fileName, mimeType, conversationId',
            });
        }

        // Get file buffer from request
        // Note: Express.js middleware should handle this
        // If using raw buffer, convert to Buffer
        let fileBuffer = req.body.fileBuffer;
        if (typeof fileBuffer === 'string') {
            // Handle base64 encoded data
            fileBuffer = Buffer.from(fileBuffer, 'base64');
        } else if (!Buffer.isBuffer(fileBuffer)) {
            // If body is the buffer itself
            fileBuffer = Buffer.from(req.body);
        }

        if (fileBuffer.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'File buffer is empty',
            });
        }

        // Check file size (limit to 100MB)
        const maxSize = 100 * 1024 * 1024;
        if (fileBuffer.length > maxSize) {
            return res.status(413).json({
                success: false,
                message: 'File too large. Maximum size is 100MB',
            });
        }

        // Upload to Google Drive
        const driveData = await uploadFileToDrive(
            fileName,
            fileBuffer,
            mimeType,
            conversationId,
            decodedToken.email
        );

        // Store reference in Firebase
        const msgRef = await db.collection('worksync').collection('drive_uploads').add({
            userId: decodedToken.uid,
            userEmail: decodedToken.email,
            conversationId,
            fileName,
            mimeType,
            fileSize: fileBuffer.length,
            driveFileId: driveData.driveFileId,
            webViewLink: driveData.webViewLink,
            webContentLink: driveData.webContentLink,
            uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return res.status(200).json({
            success: true,
            message: 'File uploaded to Google Drive',
            data: {
                uploadId: msgRef.id,
                ...driveData,
            },
        });
    } catch (error) {
        console.error('Upload error:', error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

/**
 * Get shareable link for uploaded file
 */
async function getShareableLink(req, res, decodedToken) {
    try {
        const { driveFileId } = req.body;

        if (!driveFileId) {
            return res.status(400).json({
                success: false,
                message: 'Missing driveFileId',
            });
        }

        const drive = initializeDrive();

        // Make file publicly readable
        await drive.permissions.create({
            fileId: driveFileId,
            resource: {
                role: 'reader',
                type: 'anyone',
            },
        });

        // Get file metadata including links
        const file = await drive.files.get({
            fileId: driveFileId,
            fields: 'webViewLink, webContentLink',
        });

        return res.status(200).json({
            success: true,
            data: {
                viewLink: file.data.webViewLink,
                downloadLink: file.data.webContentLink,
            },
        });
    } catch (error) {
        console.error('Get link error:', error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

/**
 * Delete file from Google Drive
 */
async function deleteFile(req, res, decodedToken) {
    try {
        const { driveFileId } = req.body;

        if (!driveFileId) {
            return res.status(400).json({
                success: false,
                message: 'Missing driveFileId',
            });
        }

        const drive = initializeDrive();

        // Delete from Drive
        await drive.files.delete({
            fileId: driveFileId,
        });

        return res.status(200).json({
            success: true,
            message: 'File deleted from Google Drive',
        });
    } catch (error) {
        console.error('Delete error:', error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

/**
 * List files in conversation folder
 */
async function listConversationFiles(req, res, decodedToken) {
    try {
        const { conversationId } = req.query;

        if (!conversationId) {
            return res.status(400).json({
                success: false,
                message: 'Missing conversationId',
            });
        }

        const drive = initializeDrive();
        const chatFolderId = process.env.GOOGLE_DRIVE_CHAT_FOLDER_ID || 'root';

        // Find conversation folder
        const folders = await drive.files.list({
            q: `name='${conversationId}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            spaces: 'drive',
            fields: 'files(id)',
            pageSize: 1,
        });

        if (!folders.data.files || folders.data.files.length === 0) {
            return res.status(200).json({
                success: true,
                data: { files: [] },
            });
        }

        // List files in folder
        const files = await drive.files.list({
            q: `'${folders.data.files[0].id}' in parents and trashed=false`,
            spaces: 'drive',
            fields: 'files(id, name, mimeType, size, createdTime, webViewLink)',
            pageSize: 50,
        });

        return res.status(200).json({
            success: true,
            data: { files: files.data.files || [] },
        });
    } catch (error) {
        console.error('List files error:', error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

// ════════════════════════════════════════════════════════════════════
// VERCEL SERVERLESS HANDLER
// ════════════════════════════════════════════════════════════════════

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

    try {
        // Parse URL path
        const urlPath = req.url.split('?')[0];
        const pathParts = urlPath.split('/').filter(Boolean);
        const endpoint = pathParts[pathParts.length - 1];

        // All routes require authentication (except pre-signed URLs)
        const decodedToken = await verifyAuth(req);

        if (req.method === 'POST' && endpoint === 'upload') {
            return handleUpload(req, res, decodedToken);
        } else if (req.method === 'POST' && endpoint === 'shareable-link') {
            return getShareableLink(req, res, decodedToken);
        } else if (req.method === 'POST' && endpoint === 'delete') {
            return deleteFile(req, res, decodedToken);
        } else if (req.method === 'GET' && endpoint === 'list') {
            return listConversationFiles(req, res, decodedToken);
        }

        return res.status(404).json({
            success: false,
            message: 'Endpoint not found',
        });
    } catch (error) {
        console.error('Handler error:', error);
        return res.status(error.message.includes('Unauthorized') ? 401 : 500).json({
            success: false,
            message: error.message,
        });
    }
};
