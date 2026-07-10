# Meta API Backend - Implementation Checklist

## 📦 Files Created

### Backend Services (4 files)
- [x] `api/meta.js` - Core Meta Graph API service
- [x] `api/meta-tokens.js` - Secure token storage and management
- [x] `api/meta-sync.js` - Data sync and import engine
- [x] `api/meta-config.js` - Configuration constants

### Documentation (5 files)
- [x] `META_API_INTEGRATION_PLAN.md` - High-level 9-phase strategy
- [x] `api/META_SETUP_GUIDE.md` - Detailed implementation guide
- [x] `api/meta-integration-example.js` - Copy-paste ready functions
- [x] `META_BACKEND_SUMMARY.md` - Quick reference guide
- [x] `IMPLEMENTATION_CHECKLIST.md` - This file

## 🎯 Implementation Steps

### Phase 1: Get Credentials (1 day)

- [ ] Go to [developers.facebook.com](https://developers.facebook.com)
- [ ] Create new Business App
- [ ] Go to Settings → Basic
- [ ] Copy **App ID** and save it
- [ ] Copy **App Secret** and save it securely
- [ ] Add Product: Facebook Graph API
- [ ] Add Product: Instagram Graph API
- [ ] Go to Settings → Basic → Allowed Domains
- [ ] Add your domain (localhost:3000 for dev, yourdomain.com for prod)

### Phase 2: Setup Environment (1 day)

- [ ] Create `.env` file in project root if not exists
- [ ] Add these variables:
```env
REACT_APP_META_APP_ID=YOUR_APP_ID_HERE
REACT_APP_META_APP_SECRET=YOUR_APP_SECRET_HERE
REACT_APP_META_REDIRECT_URI=http://localhost:3000/auth/meta/callback
```
- [ ] Save and commit `.env` to .gitignore (don't commit secrets!)

### Phase 3: Create Callback Page (1 day)

- [ ] Create new file: `auth/meta-callback.html`
- [ ] Copy this template:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Meta Authentication</title>
    <style>
        body {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #f5f5f5;
        }
        .container {
            text-align: center;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
    </style>
</head>
<body>
    <div class="container">
        <h2>Authenticating with Meta...</h2>
        <p id="status">Please wait...</p>
    </div>

    <script src="../index.html"></script> <!-- Or wherever your main JS is -->
    <script>
        // Wait for Meta services to load, then handle callback
        function attemptCallback() {
            if (typeof handleMetaAuthCallback === 'function') {
                handleMetaAuthCallback();
            } else {
                document.getElementById('status').textContent = 'Loading...';
                setTimeout(attemptCallback, 500);
            }
        }
        attemptCallback();
    </script>
</body>
</html>
```

- [ ] Add redirect URI to Meta Developer settings:
  - Settings → Basic → Valid OAuth Redirect URIs
  - Add: `http://localhost:3000/auth/meta/callback`

### Phase 4: Add Scripts to HTML (1 day)

**In your `index.html`, add these script tags before your closing `</body>` tag:**

```html
<!-- Meta API Services (add these in this order) -->
<script src="api/meta-config.js"></script>
<script src="api/meta.js"></script>
<script src="api/meta-tokens.js"></script>
<script src="api/meta-sync.js"></script>
<script src="api/meta-integration-example.js"></script>
```

- [ ] Make sure scripts are loaded after Firebase setup
- [ ] Check browser console for any script errors

### Phase 5: Add UI Buttons (1 day)

**In your Social Analytics panel header, add these buttons:**

#### 5a: Connect Button
```html
<button id="meta-connect-btn" onclick="connectMetaAccount()" 
    class="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-bold transition">
    <iconify-icon icon="mdi:facebook" width="16"></iconify-icon>
    Connect Meta
</button>
```

#### 5b: Connected Status
```html
<span id="meta-status-badge" class="hidden">
    <span class="inline-flex items-center gap-2 text-xs font-bold bg-green-50 text-green-700 px-3 py-1 rounded-full">
        <iconify-icon icon="solar:check-circle-bold" width="14"></iconify-icon>
        <span id="meta-page-count">0</span> connected
    </span>
</span>
```

#### 5c: Manual Sync Button
```html
<button id="manual-sync-btn" onclick="manualSyncMeta()" 
    class="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-bold transition">
    <iconify-icon icon="solar:refresh-bold" width="16"></iconify-icon>
    Sync Meta Data
</button>
```

#### 5d: Auto-Sync Controls
```html
<div class="flex items-center gap-3 flex-wrap border-t border-slate-100 pt-4">
    <label class="flex items-center gap-2 text-sm font-bold">
        <input type="checkbox" id="auto-sync-toggle" onchange="toggleAutoSync(event)" />
        Auto-Sync
    </label>
    
    <select id="meta-sync-frequency" onchange="updateSyncFrequency(this.value)"
        class="text-xs border border-slate-200 rounded px-3 py-1">
        <option value="360">Every 6 Hours</option>
        <option value="720" selected>Every 12 Hours</option>
        <option value="1440">Every 24 Hours</option>
    </select>
    
    <span id="meta-last-sync" class="text-xs text-slate-400">Last synced: Never</span>
</div>
```

### Phase 6: Test Connection (1 day)

```javascript
// In browser console, test these:

// 1. Initialize services
initializeMetaServices();

// 2. Check if initialized
console.log(metaAPI, metaTokens, metaSync);

// 3. Try connecting
connectMetaAccount();

// 4. After connecting, check status
await updateMetaConnectionStatus();

// 5. Try manual sync
await manualSyncMeta();

// 6. Check sync status
checkSyncStatus();
```

- [ ] Click "Connect Meta" button
- [ ] Facebook login window opens
- [ ] Grant permissions
- [ ] Returns to app
- [ ] Status shows connected pages
- [ ] Click "Sync Meta Data"
- [ ] See posts appear in analytics

### Phase 7: Submit App for Review (3-7 days)

- [ ] In Meta Developer Dashboard
- [ ] Go to App Roles → Test Users
- [ ] Add test user if testing
- [ ] Go to Permissions & Features → Requested Features
- [ ] Add these required permissions:
  - [ ] `pages_read_engagement`
  - [ ] `pages_read_user_content`
  - [ ] `instagram_basic`
  - [ ] `instagram_graph_api`
- [ ] Submit for review
- [ ] Wait for approval (usually 3-7 days)
- [ ] Check email for approval status

### Phase 8: Production Setup (1 day)

**Update environment variables for production:**

```env
REACT_APP_META_APP_ID=YOUR_PRODUCTION_APP_ID
REACT_APP_META_APP_SECRET=YOUR_PRODUCTION_APP_SECRET
REACT_APP_META_REDIRECT_URI=https://yourdomain.com/auth/meta/callback
```

- [ ] Update redirect URI in Meta app settings
- [ ] Update all localhost URLs to production domain
- [ ] Ensure HTTPS is enabled
- [ ] Test end-to-end on production

### Phase 9: Deploy & Monitor (1 day)

- [ ] Deploy code to production
- [ ] Test Meta connection on live site
- [ ] Monitor sync operations
- [ ] Setup error logging (Sentry or similar)
- [ ] Document for team

## 🔍 Verification Tests

### Test 1: Services Initialize
```javascript
console.log('metaAPI:', metaAPI ? '✓' : '✗');
console.log('metaTokens:', metaTokens ? '✓' : '✗');
console.log('metaSync:', metaSync ? '✓' : '✗');
```

### Test 2: OAuth Flow
```javascript
// Should open login window
connectMetaAccount();
```

### Test 3: Token Storage
```javascript
// Should show connected pages
const pages = await metaTokens.getConnectedPages();
console.log('Connected pages:', pages);
```

### Test 4: Manual Sync
```javascript
// Should sync posts
const results = await metaSync.manualSync(currentUser.uid);
console.log('Sync results:', results);
```

### Test 5: Auto-Sync
```javascript
// Should enable auto-sync
enableAutoSync(720); // 12 hours
```

## 📋 Pre-Launch Checklist

### Code Quality
- [ ] All console errors resolved
- [ ] No JavaScript syntax errors
- [ ] All functions accessible in console
- [ ] No memory leaks (check DevTools)

### Functionality
- [ ] OAuth login works
- [ ] Tokens save to Firebase
- [ ] Manual sync imports posts
- [ ] Posts appear in analytics
- [ ] Deduplication works
- [ ] Auto-sync runs on schedule

### Security
- [ ] No secrets in console
- [ ] HTTPS enabled in production
- [ ] Tokens are encrypted
- [ ] OAuth state parameter used
- [ ] Rate limiting works

### UX/UI
- [ ] Connect button visible and clickable
- [ ] Sync button visible and clickable
- [ ] Loading states show progress
- [ ] Error messages are clear
- [ ] Success notifications appear
- [ ] Status updates in real-time

### Data
- [ ] Posts import with correct data
- [ ] Metrics are accurate
- [ ] Dates formatted correctly
- [ ] No data loss on sync
- [ ] No duplicates created

## 📊 Success Metrics

After launch, monitor these:

- [ ] Successful connections: Target 100%
- [ ] Sync success rate: Target >95%
- [ ] Average sync time: Should be <30 seconds
- [ ] API rate limit usage: Should be <50% of 200/hour
- [ ] User adoption: Track active syncs
- [ ] Error rate: Should be <5%

## 🐛 Troubleshooting Guide

### Issue: "App ID not set"
```
Solution: Check REACT_APP_META_APP_ID in .env is correct
```

### Issue: "Invalid redirect URI"
```
Solution: Make sure Meta app settings match your .env REDIRECT_URI
```

### Issue: "No posts synced"
```
Solution: 
1. Check page has posts on Meta
2. Check token has correct permissions
3. Check rate limits not exceeded
4. Check browser console for errors
```

### Issue: "Duplicate posts appearing"
```
Solution: 
1. Clear browser cache
2. Check Firebase database for duplicates
3. Run deduplication manually if needed
```

### Issue: "Auto-sync not working"
```
Solution:
1. Check intervalId was saved: console.log(syncIntervalId)
2. Check service is still running
3. Check browser tab is not closed/suspended
```

## 📝 Documentation Links

- Setup Guide: `api/META_SETUP_GUIDE.md`
- Integration Plan: `META_API_INTEGRATION_PLAN.md`
- Backend Summary: `META_BACKEND_SUMMARY.md`
- Example Code: `api/meta-integration-example.js`

## 🎓 Learning Resources

- [Meta Graph API Docs](https://developers.facebook.com/docs/graph-api)
- [Facebook Login](https://developers.facebook.com/docs/facebook-login/web)
- [Instagram Graph API](https://developers.facebook.com/docs/instagram-api)
- [OAuth 2.0 Guide](https://oauth.net/2/)
- [Firebase Realtime Database](https://firebase.google.com/docs/database)

## ✅ Final Sign-Off

When all items are checked:

- [ ] All 5 backend files are created
- [ ] Environment variables configured
- [ ] Callback page created
- [ ] Scripts added to HTML
- [ ] UI buttons implemented
- [ ] All tests passing
- [ ] App submitted for review
- [ ] Production credentials ready
- [ ] Deployed and monitored
- [ ] Team trained

**Estimated Total Time: 1-2 weeks** (including Meta app review)

---

## Next Actions (Today)

1. Download Meta app credentials
2. Create .env file with credentials
3. Create callback page
4. Add scripts to HTML
5. Add buttons to UI
6. Test connection

**Good luck! 🚀**
