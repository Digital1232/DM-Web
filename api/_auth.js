const admin = require('firebase-admin');

function ensureFirebaseAdmin() {
  if (!admin.apps.length) {
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const databaseURL = process.env.FIREBASE_DATABASE_URL || 'https://worksync-vilpower-default-rtdb.firebaseio.com';

    if (privateKey && clientEmail) {
      admin.initializeApp({
        credential: admin.credential.cert({
          type: process.env.FIREBASE_TYPE || 'service_account',
          project_id: process.env.FIREBASE_PROJECT_ID || 'worksync-vilpower',
          private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
          private_key: privateKey,
          client_email: clientEmail,
          client_id: process.env.FIREBASE_CLIENT_ID,
          auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
          token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
          auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs'
        }),
        databaseURL
      });
    } else {
      admin.initializeApp({ databaseURL });
    }
  }
  return admin;
}

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/([a-z0-9-]+\.)?vercel\.app$/i,
  /^https:\/\/onedesk\.vilpower\.com$/i,
  /^https:\/\/digital1232\.github\.io$/i,
  /^capacitor:\/\/localhost$/i,
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i
];

function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (process.env.APP_URL && origin === process.env.APP_URL) return true;
  return ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin));
}

function applyCors(req, res, { methods = 'GET,POST,OPTIONS', headers = 'Content-Type, Authorization', credentials = false } = {}) {
  const origin = req.headers && req.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    if (credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
  }
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', headers);
}

async function verifyFirebaseBearer(req) {
  const authHeader = (req.headers && req.headers.authorization) || '';
  if (!authHeader.startsWith('Bearer ')) {
    const err = new Error('Unauthorized: Missing bearer token');
    err.statusCode = 401;
    throw err;
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    const err = new Error('Unauthorized: Empty bearer token');
    err.statusCode = 401;
    throw err;
  }
  ensureFirebaseAdmin();
  try {
    return await admin.auth().verifyIdToken(token);
  } catch (e) {
    const err = new Error('Unauthorized: Invalid token');
    err.statusCode = 401;
    throw err;
  }
}

module.exports = {
  ensureFirebaseAdmin,
  applyCors,
  verifyFirebaseBearer
};

