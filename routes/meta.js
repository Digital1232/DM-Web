/**
 * Meta Integration Routes
 * Express router for all Meta-related API endpoints
 */

const express = require('express');
const router = express.Router();
const metaIntegration = require('../api/metaIntegration');

// Middleware to verify authentication
const authenticateUser = (req, res, next) => {
    // This should be replaced with your actual Firebase auth middleware
    // For now, we'll assume the user is attached to req.user by Firebase middleware
    if (!req.user || !req.user.uid) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    next();
};

// ════════════════════════════════════════════════════════════════════
// OAUTH ROUTES
// ════════════════════════════════════════════════════════════════════

/**
 * POST /api/meta/connect
 * Initiates Meta OAuth flow
 * Returns OAuth URL to redirect user to Facebook login
 */
router.post('/connect', authenticateUser, async (req, res) => {
    await metaIntegration.initiateConnect(req, res);
});

/**
 * GET /api/meta/callback
 * Handles OAuth callback from Meta
 * Exchanges authorization code for access token
 */
router.get('/callback', async (req, res) => {
    await metaIntegration.handleCallback(req, res);
});

// ════════════════════════════════════════════════════════════════════
// CONNECTION DATA ROUTES
// ════════════════════════════════════════════════════════════════════

/**
 * GET /api/meta/profile
 * Retrieves stored Meta connection data for authenticated user
 * Returns: business info, pages, Instagram, ad accounts, permissions
 */
router.get('/profile', authenticateUser, async (req, res) => {
    await metaIntegration.getProfile(req, res);
});

/**
 * POST /api/meta/refresh
 * Refreshes Meta connection data
 * Validates token and updates connection status
 */
router.post('/refresh', authenticateUser, async (req, res) => {
    await metaIntegration.refresh(req, res);
});

/**
 * POST /api/meta/sync
 * Syncs latest Meta data from Graph API
 * Updates pages, Instagram followers, and other metrics
 */
router.post('/sync', authenticateUser, async (req, res) => {
    await metaIntegration.sync(req, res);
});

// ════════════════════════════════════════════════════════════════════
// ACCOUNT MANAGEMENT ROUTES
// ════════════════════════════════════════════════════════════════════

/**
 * POST /api/meta/disconnect
 * Disconnects Meta account and removes all stored connection data
 */
router.post('/disconnect', authenticateUser, async (req, res) => {
    await metaIntegration.disconnect(req, res);
});

// ════════════════════════════════════════════════════════════════════
// ERROR HANDLING
// ════════════════════════════════════════════════════════════════════

router.use((error, req, res, next) => {
    console.error('Meta routes error:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

module.exports = router;
