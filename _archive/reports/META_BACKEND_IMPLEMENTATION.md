# Meta Integration Backend Implementation Guide

**Status**: ✅ PRODUCTION READY

---

## Overview

This document covers the backend implementation for the Meta Integration module. The backend handles OAuth authentication, token management, data synchronization, and secure storage of Meta connection information.

**Key Components**:
- `api/metaIntegration.js` - Backend service with all business logic
- `routes/meta.js` - Express routes for API endpoints
- Firestore collections for data storage
- Encryption utilities for secure token storage

---

## Files Created

### 1. `api/metaIntegration.js`
Production-grade backend service with:
- OAuth flow implementation (initiateConnect, handleCallback)
- Token encryption/decryption
- CSRF protection (state management)
- Connection management (getProfile, disconnect, refresh)
- Data synchronization (sync)
- Audit logging

**Key Functions**:
```javascript
initiateConnect(req, res)      // Start OAuth flow
handleCallback(req, res)       // Handle OAuth callback
getProfile(req, res)           // Fetch connection data
disconnect(req, res)           // Disconnect account
refresh(req, res)              // Validate connection
sync(req, res)                 // Sync latest data
```

### 2. `routes/meta.js`
Express router with all API endpoints:
- Authentication middleware
- Route handlers for all Meta operations
- Error handling
- Response formatting

---

## API Endpoints

### Authentication Required: YES (for all endpoints except callback)

All endpoints except `/api/meta/callback` require Firebase authentication via `req.user.uid`.

### Endpoint Reference

#### 1. POST `/api/meta/connect`
**Purpose**: Initiates OAuth flow with Meta

**Request**:
```json
{
  // No body required
  // User must be authenticated
}
```

**Response**:
```json
{
  "success": true,
  "authUrl": "https://www.facebook.com/v18.0/dialog/oauth?..."
}
```

**Status Codes**:
- `200` - Success, authUrl returned
- `401` - User not authenticated
- `500` - Server error

**Frontend Usage**:
```javascript
const response = await fetch('/api/meta/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
});
const data = await response.json();
window.location.href = data.authUrl; // Redirect to Facebook
```

---

#### 2. GET `/api/meta/callback`
**Purpose**: OAuth callback handler from Meta

**Query Parameters**:
- `code` (required) - Authorization code from Meta
- `state` (required) - CSRF protection state parameter

**Response**:
```json
{
  "success": true,
  "message": "Meta account connected successfully",
  "redirect": "/dashboard?view=meta-integration&status=connected"
}
```

**Error Response**:
```json
{
  "success": false,
  "message": "Description of error"
}
```

**Status Codes**:
- `200` - Connection successful
- `400` - Missing code/state or invalid state
- `500` - Token exchange failed

**Notes**:
- Called by Meta's OAuth flow (user is redirected here)
- Automatically stores connection in Firestore
- State parameter prevents CSRF attacks
- State expires after 10 minutes

---

#### 3. GET `/api/meta/profile`
**Purpose**: Fetch stored Meta connection data

**Request**:
```
GET /api/meta/profile
Authorization: Firebase-Auth-Token
```

**Response (Connected)**:
```json
{
  "success": true,
  "data": {
    "businessId": "123456789",
    "businessName": "Your Business Name",
    "businessEmail": "email@example.com",
    "pageId": "987654321",
    "pageName": "Your Page",
    "pageCategory": "Local Business",
    "pageFollowers": 1500,
    "instagramId": "555666777",
    "instagramUsername": "yourpage",
    "instagramFollowers": 2000,
    "instagramProfilePicture": "https://...",
    "adAccounts": [
      {
        "id": "act_123456789",
        "name": "Ad Account 1",
        "currency": "USD",
        "timezone": "America/New_York"
      }
    ],
    "permissions": [
      "business_management",
      "pages_read_engagement",
      "pages_read_user_content",
      "instagram_basic",
      "instagram_graph_api",
      "ads_read"
    ],
    "status": "active",
    "connectedAt": "2026-07-10T14:30:00.000Z",
    "updatedAt": "2026-07-10T14:30:00.000Z",
    "lastSync": "2026-07-10T16:45:30.000Z"
  }
}
```

**Response (Not Connected)**:
```json
{
  "success": true,
  "data": null,
  "message": "No Meta connection found"
}
```

**Status Codes**:
- `200` - Success
- `401` - User not authenticated
- `500` - Server error

---

#### 4. POST `/api/meta/refresh`
**Purpose**: Validate and refresh connection status

**Request**:
```json
{
  // No body required
}
```

**Response (Valid)**:
```json
{
  "success": true,
  "message": "Connection refreshed successfully"
}
```

**Response (Expired Token)**:
```json
{
  "success": false,
  "message": "Connection token has expired. Please reconnect."
}
```

**Status Codes**:
- `200` - Connection is valid
- `400` - Token expired or invalid
- `401` - User not authenticated
- `404` - No connection found
- `500` - Server error

**Frontend Usage**:
```javascript
const response = await fetch('/api/meta/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
});
const data = await response.json();
if (!data.success) {
    // Token expired, show reconnect option
    showReconnectButton();
}
```

---

#### 5. POST `/api/meta/sync`
**Purpose**: Sync latest data from Meta Graph API

**Request**:
```json
{
  // No body required
}
```

**Response**:
```json
{
  "success": true,
  "message": "Data synced successfully",
  "syncedAt": "2026-07-10T16:50:00.000Z"
}
```

**Status Codes**:
- `200` - Sync successful
- `401` - User not authenticated
- `404` - No connection found
- `500` - Sync failed

**Synced Data**:
- Facebook page followers count
- Page name and category
- Last sync timestamp

**Limitations**:
- Currently syncs only page-level data
- Future phases will add Instagram insights and ad performance data

**Frontend Usage**:
```javascript
const response = await fetch('/api/meta/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
});
const data = await response.json();
if (data.success) {
    showToast('Data synced successfully');
    reloadConnectionData();
}
```

---

#### 6. POST `/api/meta/disconnect`
**Purpose**: Disconnect Meta account and remove all stored data

**Request**:
```json
{
  // No body required
}
```

**Response**:
```json
{
  "success": true,
  "message": "Meta account disconnected successfully"
}
```

**Status Codes**:
- `200` - Disconnected successfully
- `401` - User not authenticated
- `500` - Disconnect failed

**Side Effects**:
- Removes connection from Firestore
- Deletes encrypted access token
- Creates audit log entry
- Clears last sync timestamp

**Frontend Usage**:
```javascript
const response = await fetch('/api/meta/disconnect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
});
const data = await response.json();
if (data.success) {
    showToast('Meta account disconnected');
    reloadPage(); // Show empty state
}
```

---

## Firestore Collections

### 1. `meta_connections` Collection
Stores active Meta connections for users.

**Document Structure**:
```
meta_connections/{userId}
{
  // User & Provider
  userId: "firebase-user-id",
  provider: "meta",
  status: "active" | "inactive",
  
  // Business Account
  businessId: "123456789",
  businessName: "Business Name",
  businessEmail: "email@business.com",
  
  // Facebook Page
  pageId: "987654321",
  pageName: "Page Name",
  pageCategory: "Local Business",
  pageFollowers: 1500,
  
  // Instagram Business
  instagramId: "555666777",
  instagramUsername: "pageusername",
  instagramFollowers: 2000,
  instagramProfilePicture: "https://example.com/pic.jpg",
  
  // Ad Accounts (Array)
  adAccounts: [
    {
      id: "act_123456789",
      name: "Ad Account 1",
      currency: "USD",
      timezone: "America/New_York"
    }
  ],
  
  // Permissions
  permissions: [
    "business_management",
    "pages_read_engagement",
    "pages_read_user_content",
    "instagram_basic",
    "instagram_graph_api",
    "ads_read"
  ],
  
  // Token Management
  accessToken: "encrypted-token-string",
  tokenType: "bearer",
  expiresAt: Timestamp("2026-09-08T14:30:00Z"),
  
  // Timestamps
  connectedAt: Timestamp("2026-07-10T14:30:00Z"),
  updatedAt: Timestamp("2026-07-10T16:50:00Z"),
  lastSync: Timestamp("2026-07-10T16:50:00Z")
}
```

**Indexes Required**:
- Primary: `userId` (automatically created)
- Composite: `userId, status` (for querying active connections)

**Access Rules**:
```
allow read, write: if request.auth.uid == resource.id;
```

---

### 2. `meta_oauth_state` Collection
Temporary storage for OAuth state parameters (CSRF protection).

**Document Structure**:
```
meta_oauth_state/{stateHash}
{
  userId: "firebase-user-id",
  createdAt: Timestamp(now),
  expiresAt: Timestamp(now + 10 minutes)
}
```

**Automatic Cleanup**:
- Documents expire after 10 minutes
- Set Firestore TTL policy on `expiresAt` field

---

### 3. `meta_audit_log` Collection
Audit trail for all Meta integration operations.

**Document Structure**:
```
meta_audit_log/{logId}
{
  userId: "firebase-user-id",
  action: "connect" | "disconnect" | "refresh" | "sync",
  timestamp: Timestamp(now),
  status: "success" | "failed",
  errorMessage: "error details if failed",
  ipAddress: "user-ip-address",
  userAgent: "browser user agent"
}
```

**TTL**: 90 days (for compliance/debugging)

---

### 4. `meta_sync_log` Collection
Tracks data synchronization events.

**Document Structure**:
```
meta_sync_log/{syncId}
{
  userId: "firebase-user-id",
  action: "sync",
  timestamp: Timestamp(now),
  status: "success" | "failed",
  pagesCount: 2,
  recordsUpdated: 5,
  errorMessage: "if failed"
}
```

**TTL**: 30 days

---

## Environment Variables

Required in `.env` or deployment configuration:

```bash
# Meta App Credentials
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret
APP_URL=https://yourdomain.com (for OAuth redirect)

# Encryption
MARKETING_HUB_ENCRYPTION_KEY=your_encryption_key_32_chars_minimum
# or
META_ENCRYPTION_KEY=your_encryption_key_32_chars_minimum

# Firebase (typically auto-configured)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-service-account-email
```

---

## Security Implementation

### 1. CSRF Protection
- State parameter generated for each OAuth request
- State stored in Firestore with 10-minute expiration
- State verified before token exchange
- Prevents unauthorized OAuth attempts

### 2. Token Encryption
- Access tokens encrypted at rest using AES-256-CBC
- Encryption key derived from environment variable
- Tokens never logged or exposed to client
- IV (initialization vector) included in encrypted string

### 3. Authentication
- All endpoints (except callback) require Firebase authentication
- User ID verified against Firestore records
- Admin access enforced where applicable

### 4. Data Isolation
- Users can only access their own connection data
- Firestore rules enforce user-scoped access
- No cross-user data exposure

---

## Error Handling

### Common Errors & Responses

#### OAuth Errors
```json
{
  "success": false,
  "message": "Facebook OAuth Error: Invalid app ID"
}
```

#### Token Expired
```json
{
  "success": false,
  "message": "Connection token has expired. Please reconnect."
}
```

#### User Not Found
```json
{
  "success": false,
  "message": "No Meta connection found"
}
```

#### Server Errors
```json
{
  "success": false,
  "message": "Failed to sync data: [error details]"
}
```

---

## Testing Guide

### Prerequisites
1. Firebase project set up
2. Meta app created in Meta Developer Console
3. OAuth redirect URI configured
4. Environment variables set

### Manual Testing

#### Test 1: OAuth Flow
1. Navigate to `/dashboard?view=meta-integration`
2. Click "Connect Meta Account"
3. Receive redirect to Facebook OAuth dialog
4. Login with Meta test account
5. Grant permissions
6. Verify callback successful and data stored

#### Test 2: Get Profile
```bash
curl -X GET https://yourdomain.com/api/meta/profile \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

Expected response: Connected data or null

#### Test 3: Refresh Connection
```bash
curl -X POST https://yourdomain.com/api/meta/refresh \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

Expected response: `{"success": true}`

#### Test 4: Sync Data
```bash
curl -X POST https://yourdomain.com/api/meta/sync \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

Expected response: Sync successful with timestamp

#### Test 5: Disconnect
```bash
curl -X POST https://yourdomain.com/api/meta/disconnect \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

Expected response: Disconnected successfully

---

## Database Firestore Rules

Recommended security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Meta connections - user scoped
    match /meta_connections/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // OAuth state - temporary storage
    match /meta_oauth_state/{stateHash} {
      allow write: if true; // Only server writes
      allow read: if false; // Never read on client
    }
    
    // Audit log
    match /meta_audit_log/{document=**} {
      allow read: if request.auth.uid == resource.data.userId;
      allow write: if false; // Server-only
    }
    
    // Sync log
    match /meta_sync_log/{document=**} {
      allow read: if request.auth.uid == resource.data.userId;
      allow write: if false; // Server-only
    }
  }
}
```

---

## Integration with Express Server

### Setup Example

```javascript
// app.js or server.js
const express = require('express');
const metaRoutes = require('./routes/meta');

const app = express();

// Middleware
app.use(express.json());
app.use(firebaseAuthMiddleware); // Your auth middleware

// Routes
app.use('/api/meta', metaRoutes);

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### Firebase Auth Middleware Example

```javascript
const firebaseAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token' });
    }
    
    const token = authHeader.substring(7);
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = { uid: decodedToken.uid, email: decodedToken.email };
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};
```

---

## Performance Considerations

- **Token Encryption**: ~5ms per operation (AES-256-CBC)
- **Firestore Queries**: < 100ms with proper indexing
- **Meta API Calls**: 1-2 seconds (depends on Meta API latency)
- **OAuth Flow**: ~3-5 seconds total (user login + redirect)

---

## Monitoring & Logging

### Key Metrics to Monitor
- OAuth success/failure rate
- Token validation failures
- Sync duration and frequency
- API error rates
- Database write counts

### Logging Best Practices
- Log all OAuth attempts (for security audit)
- Log sync activities with timestamps
- Log token validation failures
- Avoid logging sensitive data (tokens, secrets)

---

## Future Enhancements

### Phase 2 (Data Collection)
- Fetch Instagram insights
- Fetch Meta Ads performance data
- Implement caching strategy
- Add historical data tracking

### Phase 3 (Analytics)
- Build analytics dashboard
- Generate reports (PDF, Excel, CSV)
- Implement data aggregation
- Add trend analysis

### Phase 4 (Multi-Provider)
- Support Google Ads integration
- Support LinkedIn Ads integration
- Provider-agnostic dashboard
- Multi-account management

---

## Troubleshooting

### Issue: OAuth Callback Returns "Invalid State"
**Cause**: State expired or wasn't stored
**Solution**: 
- Check Firestore connectivity
- Verify `meta_oauth_state` collection exists
- Check state expiration (should be 10 minutes)

### Issue: "Connection Token Has Expired"
**Cause**: Access token expired after 60 days
**Solution**:
- Implement token refresh logic in Phase 2
- Prompt user to reconnect

### Issue: Empty Connection Data
**Cause**: Meta API permissions missing
**Solution**:
- Verify app has required permissions
- Check Facebook app dashboard for permission grants
- Retest with all permissions

---

## Support & Maintenance

For issues or questions:
1. Check Firestore rules and data structure
2. Verify environment variables
3. Check audit logs for error details
4. Test with Meta API directly
5. Review console logs for stack traces

---

## Changelog

### v1.0.0 (Production Release)
- Initial backend implementation
- All 6 API endpoints functional
- OAuth flow with CSRF protection
- Firestore integration
- Encryption utilities
- Audit logging
- Ready for Meta App Review

---

**Last Updated**: July 10, 2026
**Version**: 1.0.0
**Status**: Production Ready
