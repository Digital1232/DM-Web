# Meta OAuth - Complete Testing Guide

This guide walks you through testing the complete Meta OAuth integration end-to-end.

---

## Prerequisites

Before testing, ensure:
- ✓ You have a Meta/Facebook account
- ✓ You have an Instagram account (connected to the same Meta account)
- ✓ Vercel deployment successful
- ✓ Environment variables set on Vercel
- ✓ Firestore collections created (run `node scripts/setup-firestore.js`)
- ✓ TTL NOT YET enabled (optional for testing, required for production)

---

## Test Scenario 1: OAuth Flow - New Connection

### Step 1: Access the Application
1. Go to https://onedesk.vilpower.com
2. Log in with your Firebase credentials (email/password)
3. You should see the main dashboard

### Step 2: Navigate to Integrations
1. Look for **"Integrations"** in the sidebar navigation
2. Click it to open the Integrations section
3. You should see tabs or cards for different integrations
4. Find and click on the **"Meta"** tab or card

**Expected State**: Empty integration view
```
[Meta Logo] Meta Integration
"Not connected"
[Button: Connect Meta Account]
```

### Step 3: Initiate OAuth Flow
1. Click **"Connect Meta Account"** button
2. One of these should happen:
   - **Modal appears**: Shows OAuth setup instructions + "Start Login" button
   - **Direct redirect**: Browser redirects to Facebook login

**If modal appears**: Click "Start Login" button

### Step 4: Facebook Login
1. You're redirected to Facebook login page
2. Enter your Meta/Facebook credentials
3. Click **"Log in"**

**URL should be**: `https://www.facebook.com/v19.0/dialog/oauth?...`

### Step 5: Grant Permissions
1. Facebook shows permission request screen
2. You'll see permissions being requested:
   - pages_read_user_content
   - instagram_basic
   - instagram_graph_api
   - business_management
   - etc.
3. Click **"Continue"** or **"Allow"**

### Step 6: Redirect Back
1. Browser redirects back to your app
2. URL should contain: `?meta=connected`
3. Page shows success message or reloads to Integrations

### Step 7: View Connected State
1. You're back in Integrations > Meta section
2. **Expected display**:
   ```
   ✓ Meta Account Connected
   
   [Instagram Profile Picture]
   Username: @your_instagram_handle
   Account ID: 12345678
   Account Type: Business
   Followers: 5,432
   
   [Button: Sync Data]
   [Button: Disconnect]
   ```

### Step 8: Test Data Sync
1. Click **"Sync Data"** button
2. The button shows loading state
3. App fetches latest follower count from Instagram
4. Followers count updates (may be same if no change)
5. Last sync timestamp updates

**What happened server-side**:
- Firestore stored your connection data (encrypted)
- Document added to `meta_sync_log` collection
- Audit log recorded "sync_completed"

---

## Test Scenario 2: Connection Persistence

### Step 1: Refresh Page
1. You're viewing the connected Meta state
2. Press F5 or click refresh button
3. Page reloads

**Expected**: Connected state persists (profile still shows)

**Behind the scenes**:
- Frontend called `GET /api/meta/profile`
- Server decrypted your stored token
- Fetched your profile data from Firebase
- Displayed without needing to re-authenticate

### Step 2: Navigate Away and Back
1. Go to different section (e.g., Tasks)
2. Navigate back to Integrations > Meta

**Expected**: Connected state still shows

---

## Test Scenario 3: Disconnect

### Step 1: Click Disconnect
1. In connected state view, click **"Disconnect"** button
2. Confirmation modal or message appears
3. Confirm disconnect

**What happened**:
- Server sent `POST /api/meta/disconnect`
- Firestore deleted your connection document
- Audit log recorded "disconnected"

### Step 2: Verify Disconnection
1. You're back in empty state:
   ```
   [Meta Logo] Meta Integration
   "Not connected"
   [Button: Connect Meta Account]
   ```

---

## Test Scenario 4: Error Handling

### Scenario 4A: Invalid OAuth State Token
1. Try to access callback URL directly:
   `https://onedesk.vilpower.com/api/meta/callback?code=invalid&state=invalid`
2. **Expected**: Error page or redirect with `?meta=error&message=...`

### Scenario 4B: Expired State Token
1. In OAuth flow, wait 15+ minutes before clicking "Allow" on Facebook
2. Complete OAuth flow
3. **Expected**: Error about expired or invalid state

### Scenario 4C: Network Error During Sync
1. Click "Sync Data"
2. Disable internet or wait for timeout
3. **Expected**: Error notification appears

---

## Test Scenario 5: Security Verification

### Verify Token Encryption
1. Connect Meta account
2. Go to Firebase Console > Firestore
3. Find your document in `meta_connections` collection
4. Check `accessToken` field
5. **Expected**: Shows encrypted value like `a1b2c3d4:e5f6g7h8...`
   - Should NOT show your actual Facebook token
   - Should NOT be readable plaintext

### Verify Audit Log
1. Go to Firebase Console > Firestore
2. Open `meta_audit_log` collection
3. **Expected**: See entries for:
   - oauth_initiated (when you started login)
   - oauth_completed (when OAuth finished)
   - sync_completed (when you synced data)
   - disconnected (when you disconnected)

### Verify OAuth State Tokens
1. Go to Firebase Console > Firestore
2. Open `meta_oauth_state` collection
3. **Expected**: See documents with:
   - `state`: CSRF token (long random string)
   - `userId`: Your Firebase UID
   - `expiresAt`: 10 minutes from creation
   - `createdAt`: Timestamp

---

## Test Scenario 6: Multiple Users

### Step 1: Create Second Test Account
1. Create new Firebase account (different email)
2. Log in as second user
3. Navigate to Integrations > Meta
4. Connect with different Meta/Facebook account or same account

### Step 2: Verify Isolation
1. Go back to first user
2. First user's Meta connection still shows
3. Switch to second user
4. Second user sees their own connection (or empty if disconnected)

**Expected**: Each user's data is completely isolated in Firestore

---

## Expected Firestore Collections After Testing

### meta_connections
```
{
  userId: "user123",
  facebookId: "123456789",
  facebookName: "John Doe",
  facebookEmail: "john@example.com",
  profilePicture: "https://platform-lookaside.fbsbx.com/...",
  accessToken: "encrypted_long_string",
  tokenType: "bearer",
  connectedAt: Timestamp(2026-07-10T14:30:00Z),
  lastSync: Timestamp(2026-07-10T14:45:00Z),
  igUserId: "123456789",
  status: "connected",
  igFollowers: 5432
}
```

### meta_oauth_state
```
{
  userId: "user123",
  state: "random_csrf_token_string",
  createdAt: Timestamp(...),
  expiresAt: Timestamp(...10 min later),
}
```

### meta_audit_log
```
[
  {
    userId: "user123",
    action: "oauth_initiated",
    details: { redirectUrl: "https://..." },
    timestamp: Timestamp(...)
  },
  {
    userId: "user123",
    action: "oauth_completed",
    details: { facebookId: "...", facebookName: "..." },
    timestamp: Timestamp(...)
  },
  ...
]
```

### meta_sync_log
```
[
  {
    userId: "user123",
    syncedAt: Timestamp(...),
    followers: 5432
  }
]
```

---

## Troubleshooting Common Issues

### Issue: Blank screen after "Connect Meta Account" click
**Causes**:
- OAuth URL not being generated correctly
- Firebase auth token invalid
- Server error in `POST /api/meta/connect`

**Solution**:
1. Check browser console for errors (F12)
2. Check Vercel logs: `vercel logs --prod`
3. Verify FACEBOOK_APP_ID and FACEBOOK_APP_SECRET on Vercel

### Issue: "Redirect URI mismatch" error from Facebook
**Cause**: OAuth callback URL doesn't match Facebook app settings

**Solution**:
1. Go to Meta App Dashboard > Settings > Basic
2. Find "Valid OAuth Redirect URIs"
3. Add: `https://dm-ngo7xz7iy-digital1232s-projects.vercel.app/api/meta/callback`
4. Or use your alias: `https://onedesk.vilpower.com/api/meta/callback`

### Issue: Connected state shows but profile picture is broken
**Cause**: Temporary issue with Instagram API or image URL expired

**Solution**:
1. Click "Sync Data" to refresh
2. Wait a few seconds
3. Refresh page
4. If still broken, may be Instagram API rate limit (wait 1 hour)

### Issue: "Unauthorized: Invalid token" error
**Cause**: Firebase auth token expired or invalid

**Solution**:
1. Log out and log back in
2. Refresh Firebase token
3. Try OAuth flow again

### Issue: Sync shows old follower count
**Cause**: Instagram API caching or delay

**Solution**:
1. Wait a few minutes (Instagram updates not instant)
2. Try sync again
3. Check Instagram app directly to verify current count

---

## Recording for Meta App Review

Once everything works, record a ~2-3 minute video showing:

1. **Opening**
   - Show browser at app URL
   - Show login screen
   - Log in

2. **Navigation**
   - Click Integrations
   - Click Meta tab
   - Show empty state with "Connect" button

3. **OAuth Flow**
   - Click "Connect Meta Account"
   - Show Facebook login screen
   - Enter credentials
   - Show permission request
   - Grant permissions
   - Show redirect back to app

4. **Connected State**
   - Show profile picture loading
   - Show username, followers, account type
   - Pause to let Meta team see the data

5. **Data Sync**
   - Click "Sync Data"
   - Show loading state
   - Show data updated

6. **Closing**
   - Show Data Protection / Privacy section (if available)
   - Mention data is encrypted
   - Mention no data is shared with third parties

**Video checklist**:
- [ ] Clear audio (can use voiceover)
- [ ] 1920x1080 or better resolution
- [ ] Smooth navigation (no jerky movements)
- [ ] All buttons clickable and responsive
- [ ] No error messages visible
- [ ] Data loads quickly
- [ ] UI is professional and clean

---

## Success Criteria

Your Meta OAuth integration is working correctly when:

✓ OAuth flow completes without errors  
✓ Profile picture loads from Instagram  
✓ Follower count displays accurately  
✓ Data persists across page refreshes  
✓ Sync updates follower count  
✓ Disconnect removes all data  
✓ Multiple users are isolated  
✓ Tokens are encrypted in Firestore  
✓ Audit logs record all actions  
✓ Error handling is graceful  

---

## Next Steps

1. **Test the complete flow** using this guide
2. **Enable TTL** on meta_oauth_state collection
3. **Delete placeholder documents** from collections
4. **Record screencast** for Meta App Review
5. **Submit app for review** to Meta
6. **Wait for approval** (typically 2-5 business days)
7. **Monitor logs** after going live

---

Good luck! Your Meta OAuth integration is ready! 🚀
