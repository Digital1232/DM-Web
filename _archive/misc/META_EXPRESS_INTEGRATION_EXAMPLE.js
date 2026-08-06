/**
 * Meta Integration - Express Setup Example
 * Copy relevant sections into your main app.js or server.js
 */

// ════════════════════════════════════════════════════════════════════
// OPTION 1: BASIC SETUP (Recommended)
// ════════════════════════════════════════════════════════════════════

const express = require('express');
const admin = require('firebase-admin');

const app = express();

// Initialize Firebase Admin
admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL
});

// Middleware
app.use(express.json());

// ════════════════════════════════════════════════════════════════════
// FIREBASE AUTH MIDDLEWARE
// ════════════════════════════════════════════════════════════════════

/**
 * Verifies Firebase ID token and attaches user to request
 */
const firebaseAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Missing or invalid authorization header'
            });
        }

        const token = authHeader.substring(7);
        const decodedToken = await admin.auth().verifyIdToken(token);

        // Attach user to request
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            emailVerified: decodedToken.email_verified
        };

        next();
    } catch (error) {
        console.error('Auth error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};

// ════════════════════════════════════════════════════════════════════
// CORS MIDDLEWARE (if needed)
// ════════════════════════════════════════════════════════════════════

const cors = require('cors');
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:5000',
        process.env.APP_URL
    ],
    credentials: true
}));

// ════════════════════════════════════════════════════════════════════
// ROUTE REGISTRATION
// ════════════════════════════════════════════════════════════════════

// Import meta routes
const metaRoutes = require('./routes/meta');

// Register routes with auth middleware
// Note: The callback route doesn't need auth (it's called by Meta)
app.use('/api/meta', firebaseAuth, metaRoutes);

// ════════════════════════════════════════════════════════════════════
// HANDLE CALLBACK ROUTE (without auth)
// ════════════════════════════════════════════════════════════════════

/**
 * Special handler for OAuth callback (no auth required)
 * This is called directly by Meta's OAuth flow
 */
const metaIntegration = require('./api/metaIntegration');

app.get('/api/meta/callback', async (req, res) => {
    // No auth middleware needed - Meta calls this directly
    await metaIntegration.handleCallback(req, res);
});

// ════════════════════════════════════════════════════════════════════
// OPTION 2: ADVANCED SETUP (with error handling & logging)
// ════════════════════════════════════════════════════════════════════

/**
 * Enhanced Firebase auth middleware with logging
 */
const firebaseAuthWithLogging = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.warn('Auth: Missing auth header', {
                path: req.path,
                method: req.method,
                ip: req.ip
            });
            return res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        const token = authHeader.substring(7);
        
        try {
            const decodedToken = await admin.auth().verifyIdToken(token);
            
            req.user = {
                uid: decodedToken.uid,
                email: decodedToken.email,
                emailVerified: decodedToken.email_verified
            };

            // Log successful auth
            console.log('Auth: Token verified', {
                uid: req.user.uid,
                path: req.path,
                method: req.method
            });

            next();
        } catch (tokenError) {
            console.warn('Auth: Invalid token', {
                error: tokenError.message,
                path: req.path
            });
            res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Authentication failed'
        });
    }
};

// Use enhanced middleware
app.use('/api/meta', firebaseAuthWithLogging, metaRoutes);

// ════════════════════════════════════════════════════════════════════
// OPTION 3: SEPARATE CALLBACK HANDLING
// ════════════════════════════════════════════════════════════════════

/**
 * If you want to separate the callback from other routes
 */

// Create separate routes for callback
const callbackRouter = express.Router();
callbackRouter.get('/api/meta/callback', async (req, res) => {
    await metaIntegration.handleCallback(req, res);
});

// Register callback BEFORE auth middleware
app.use(callbackRouter);

// Register other Meta routes WITH auth middleware
app.use('/api/meta', firebaseAuthWithLogging, metaRoutes);

// ════════════════════════════════════════════════════════════════════
// ERROR HANDLING MIDDLEWARE
// ════════════════════════════════════════════════════════════════════

/**
 * Global error handler
 */
app.use((error, req, res, next) => {
    console.error('Global error handler:', {
        message: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method
    });

    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

// ════════════════════════════════════════════════════════════════════
// REQUEST LOGGING MIDDLEWARE
// ════════════════════════════════════════════════════════════════════

/**
 * Log all requests to Meta endpoints
 */
app.use('/api/meta', (req, res, next) => {
    const start = Date.now();

    // Log request
    console.log('Meta API Request:', {
        method: req.method,
        path: req.path,
        timestamp: new Date().toISOString(),
        userId: req.user?.uid
    });

    // Log response
    const originalSend = res.send;
    res.send = function(data) {
        const duration = Date.now() - start;
        console.log('Meta API Response:', {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            userId: req.user?.uid
        });
        return originalSend.call(this, data);
    };

    next();
});

// ════════════════════════════════════════════════════════════════════
// TESTING HELPER - REMOVE IN PRODUCTION
// ════════════════════════════════════════════════════════════════════

/**
 * Health check endpoint (no auth required)
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        meta: {
            connected: process.env.FACEBOOK_APP_ID ? 'yes' : 'no',
            encryption: process.env.MARKETING_HUB_ENCRYPTION_KEY ? 'yes' : 'no'
        }
    });
});

/**
 * Debug endpoint - REMOVE IN PRODUCTION
 */
app.get('/debug/env', (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({ error: 'Not available in production' });
    }

    res.json({
        FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID ? 'SET' : 'MISSING',
        FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET ? 'SET' : 'MISSING',
        APP_URL: process.env.APP_URL,
        ENCRYPTION_KEY: process.env.MARKETING_HUB_ENCRYPTION_KEY ? 'SET' : 'MISSING'
    });
});

// ════════════════════════════════════════════════════════════════════
// START SERVER
// ════════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Meta Integration API ready`);
    console.log(`Endpoints:`);
    console.log(`  - POST /api/meta/connect`);
    console.log(`  - GET /api/meta/callback`);
    console.log(`  - GET /api/meta/profile`);
    console.log(`  - POST /api/meta/refresh`);
    console.log(`  - POST /api/meta/sync`);
    console.log(`  - POST /api/meta/disconnect`);
});

// ════════════════════════════════════════════════════════════════════
// COMPLETE EXAMPLE - Copy this into your app.js
// ════════════════════════════════════════════════════════════════════

/*

const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

// Initialize app
const app = express();

// Initialize Firebase
admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL
});

// Middleware
app.use(express.json());
app.use(cors());

// Auth middleware
const firebaseAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ success: false });
        }

        const token = authHeader.substring(7);
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = { uid: decodedToken.uid, email: decodedToken.email };
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

// Import meta integration
const metaIntegration = require('./api/metaIntegration');
const metaRoutes = require('./routes/meta');

// Register callback FIRST (no auth)
app.get('/api/meta/callback', async (req, res) => {
    await metaIntegration.handleCallback(req, res);
});

// Register other routes WITH auth
app.use('/api/meta', firebaseAuth, metaRoutes);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server on port ${PORT}`);
    console.log(`Meta API ready`);
});

*/

// ════════════════════════════════════════════════════════════════════
// TROUBLESHOOTING
// ════════════════════════════════════════════════════════════════════

/*

PROBLEM: "Cannot find module 'routes/meta'"
SOLUTION: Make sure routes/meta.js exists and is in the correct path

PROBLEM: "FIREBASE_PROJECT_ID is undefined"
SOLUTION: Add to .env file and restart server

PROBLEM: "GET /api/meta/callback returns 401"
SOLUTION: Callback route should NOT have auth middleware
         Register it BEFORE other meta routes

PROBLEM: "POST /api/meta/connect returns 401"
SOLUTION: Make sure auth middleware is working
         Check Authorization header format: "Bearer TOKEN"

PROBLEM: "State parameter invalid"
SOLUTION: Firestore must be accessible
         Check firebase-admin initialization
         Verify meta_oauth_state collection exists

*/

// ════════════════════════════════════════════════════════════════════
// PRODUCTION DEPLOYMENT NOTES
// ════════════════════════════════════════════════════════════════════

/*

1. ENVIRONMENT VARIABLES
   Set these in your hosting platform:
   - FACEBOOK_APP_ID
   - FACEBOOK_APP_SECRET
   - APP_URL (must match OAuth redirect URI)
   - MARKETING_HUB_ENCRYPTION_KEY
   - FIREBASE_PROJECT_ID
   - FIREBASE_PRIVATE_KEY
   - FIREBASE_CLIENT_EMAIL

2. CORS CONFIGURATION
   Update the cors() call to only allow your domain:
   app.use(cors({
       origin: ['https://yourdomain.com'],
       credentials: true
   }));

3. HTTPS REQUIREMENT
   All endpoints must be over HTTPS in production
   Meta OAuth only works with HTTPS

4. RATE LIMITING
   Add rate limiting middleware:
   const rateLimit = require('express-rate-limit');
   const limiter = rateLimit({
       windowMs: 15 * 60 * 1000,
       max: 100
   });
   app.use('/api/meta', limiter);

5. SECURITY HEADERS
   Add security headers:
   const helmet = require('helmet');
   app.use(helmet());

6. REQUEST VALIDATION
   Validate all input parameters before processing
   Use libraries like joi or express-validator

7. DATABASE BACKUPS
   Ensure Firestore automated backups are enabled
   Test restore procedure

*/

module.exports = app;
