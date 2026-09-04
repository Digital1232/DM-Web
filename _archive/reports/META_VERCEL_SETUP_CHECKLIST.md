# Meta OAuth - Vercel Deployment Checklist

**Status**: Ready for Deployment ✅  
**Time Required**: 20-30 minutes

---

## Phase 1: Gather Credentials (5 minutes)

### From Meta Developer Console
- [ ] Copy `FACEBOOK_APP_ID`
- [ ] Copy `FACEBOOK_APP_SECRET`
- [ ] Add Valid OAuth Redirect URI: `https://your-project.vercel.app/api/meta/callback`
- [ ] Add Valid OAuth Redirect URI: `http://localhost:3000/api/meta/callback` (for local testing)

### From Firebase Console
- [ ] Go to Project Settings → Service Accounts
- [ ] Generate New Private Key
- [ ] Copy `FIREBASE_PROJECT_ID`
- [ ] Copy `FIREBASE_CLIENT_EMAIL`
- [ ] Copy `FIREBASE_PRIVATE_KEY` (with \n characters)

### Create Local Environment
- [ ] Create `.env.local` file with all credentials
- [ ] Create encryption key: `MARKETING_HUB_ENCRYPTION_KEY` (32+ character random string)
- [ ] Set `APP_URL=https://your-project.vercel.app` (after Vercel deployment)

---

## Phase 2: Install Dependencies (2 minutes)

```bash
npm install firebase-admin node-fetch
```

- [ ] `firebase-admin` installed
- [ ] `node-fetch` installed
- [ ] `package.json` updated
- [ ] `package-lock.json` committed to git

---

## Phase 3: Backend Files Already Created ✅

These files have been created for you:

- [ ] `api/meta/connect.js` - OAuth initiation
- [ ] `api/meta/callback.js` - OAuth callback handler
- [ ] `api/meta/profile.js` - Get connection data
- [ ] `api/meta/disconnect.js` - Disconnect account
- [ ] `api/meta/sync.js` - Sync latest data
- [ ] `api/meta/refresh.js` - Refresh connection status

**Action**: Commit these files to git

```bash
git add api/meta/*.js
git commit -m "Add Meta OAuth serverless functions"
git push
```

---

## Phase 4: Deploy to Vercel (5-10 minutes)

### Option A: Using CLI (Recommended)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel

# 4. Deploy to production
vercel --prod
```

- [ ] Vercel CLI installed
- [ ] Logged in to Vercel
- [ ] Project deployed
- [ ] Deployment successful
- [ ] Vercel URL obtained: `https://your-project.vercel.app`

### Option B: GitHub Integration

- [ ] Link GitHub repo to Vercel
- [ ] Vercel automatically deploys on push

---

## Phase 5: Set Environment Variables (5 minutes)

On Vercel Dashboard:

1. Go to **Settings** → **Environment Variables**
2. Add each variable for `Production`, `Preview`, `Development`:

- [ ] `FACEBOOK_APP_ID` = your_id
- [ ] `FACEBOOK_APP_SECRET` = your_secret
- [ ] `FIREBASE_PROJECT_ID` = your_project_id
- [ ] `FIREBASE_CLIENT_EMAIL` = your_email@appspot.gserviceaccount.com
- [ ] `FIREBASE_PRIVATE_KEY` = full_private_key_with_newlines
- [ ] `MARKETING_HUB_ENCRYPTION_KEY` = your_encryption_key
- [ ] `APP_URL` = https://your-project.vercel.app

**Important**: Redeploy after adding env vars!

```bash
vercel --prod
```

- [ ] All environment variables set on Vercel
- [ ] Redeployed after adding variables
- [ ] No configuration errors

---

## Phase 6: Configure Firestore (3 minutes)

In Firebase Console → Firestore Database:

Create these collections:

- [ ] `meta_connections` collection
- [ ] `meta_oauth_state` collection
- [ ] `meta_audit_log` collection
- [ ] `meta_sync_log` collection

Enable TTL on `meta_oauth_state`:

- [ ] Open `meta_oauth_state` collection
- [ ] Click **TTL** menu (top right)
- [ ] Select `expiresAt` field
- [ ] Click **Enable**

---

## Phase 7: Verify Deployment (5 minutes)

### Test Endpoints

```bash
# Replace your-project with your actual Vercel project name

# Should return successfully (after auth)
curl -X GET https://your-project.vercel.app/api/meta/profile

# Should handle OAuth (test with browser)
https://your-project.vercel.app/api/meta/callback?code=TEST&state=TEST
```

- [ ] `/api/meta/connect` accessible
- [ ] `/api/meta/callback` accessible
- [ ] `/api/meta/profile` accessible
- [ ] `/api/meta/disconnect` accessible
- [ ] `/api/meta/sync` accessible
- [ ] `/api/meta/refresh` accessible

### View Logs

```bash
vercel logs
```

- [ ] No 500 errors in logs
- [ ] No missing module errors
- [ ] Functions initializing correctly

---

## Phase 8: Frontend Testing (5 minutes)

Open your app: `https://your-project.vercel.app`

- [ ] App loads successfully
- [ ] Logged in with Firebase auth
- [ ] Navigate to Settings → Integrations
- [ ] "Connect Meta Account" button visible
- [ ] Click button (should redirect to Facebook login)
- [ ] Complete Meta authentication
- [ ] Redirected back to app
- [ ] Instagram profile card displays
- [ ] Profile picture shows
- [ ] Username displays (@handle)
- [ ] Account ID displays
- [ ] Account type displays (BUSINESS)
- [ ] Followers count displays
- [ ] No console errors

---

## Phase 9: Update Meta App Settings (2 minutes)

In Meta Developer Console:

1. Go to **Settings** → **Basic**
   - [ ] App Domains updated: `your-project.vercel.app`

2. Go to **Products** → **Facebook Login** → **Settings**
   - [ ] Valid OAuth Redirect URIs updated: `https://your-project.vercel.app/api/meta/callback`

3. Go to **App Review** → **Permissions**
   - [ ] Verify all permissions are requested
   - [ ] Check: `business_management`
   - [ ] Check: `pages_read_engagement`
   - [ ] Check: `pages_read_user_content`
   - [ ] Check: `instagram_basic`
   - [ ] Check: `instagram_graph_api`
   - [ ] Check: `ads_read`

---

## Phase 10: Record Screencast (3-5 minutes)

Record a video showing:

1. **Empty State** (30 seconds)
   - [ ] Navigate to Settings → Integrations
   - [ ] Show "No Meta Account Connected"
   - [ ] Show "Connect Meta Account" button

2. **OAuth Flow** (1 minute)
   - [ ] Click "Connect Meta Account"
   - [ ] Show Facebook login page
   - [ ] Enter Meta credentials
   - [ ] Show permission request
   - [ ] Click "Allow"

3. **Connected State** (1 minute)
   - [ ] Show "✓ Connected Successfully" banner
   - [ ] Show Instagram card with:
     - [ ] Profile picture (circular thumbnail)
     - [ ] Username (@account)
     - [ ] Account ID
     - [ ] Account type (BUSINESS)
     - [ ] Followers count
   - [ ] Show Facebook page card
   - [ ] Show Ad accounts section
   - [ ] Show permissions list

4. **Features Demo** (30 seconds)
   - [ ] Show "Sync Now" button
   - [ ] Show "Refresh" button
   - [ ] Show "Disconnect" button
   - [ ] Show dark mode (if applicable)

**Total Duration**: < 3 minutes ✓

- [ ] Screencast recorded
- [ ] No errors visible
- [ ] Video quality: 1080p or higher
- [ ] Audio clear (narration optional)
- [ ] File saved and ready to submit

---

## Phase 11: Submit to Meta for Review ✅

Once everything is working:

- [ ] Complete OAuth flow tested
- [ ] All data displays correctly
- [ ] Screencast recorded (< 3 minutes)
- [ ] Screencast shows all requirements
- [ ] No errors or warnings
- [ ] Ready for Meta review

**Document to Submit**:
- [ ] Screencast video
- [ ] Permissions used (business_management, pages_read_engagement, etc.)
- [ ] Data being collected (profile info, followers, etc.)
- [ ] Data storage method (encrypted in Firestore)
- [ ] Security measures (OAuth 2.0, CSRF protection, HTTPS)

---

## Troubleshooting Quick Links

If you encounter issues, refer to:

- **Deployment Issues**: See `VERCEL_DEPLOYMENT_GUIDE.md` → Troubleshooting
- **OAuth Issues**: See `META_BACKEND_IMPLEMENTATION.md` → Troubleshooting
- **Firestore Issues**: See Firebase Console → Firestore → Error logs
- **Code Issues**: Check `vercel logs` for detailed error messages

---

## ✅ Success Criteria

All of the following should be TRUE:

- [ ] All env vars set on Vercel
- [ ] All Firestore collections exist
- [ ] All backend endpoints accessible
- [ ] OAuth flow completes successfully
- [ ] User redirected to app after OAuth
- [ ] Instagram profile displays
- [ ] Profile picture shows (or initials fallback)
- [ ] All profile fields populated
- [ ] Sync/Refresh/Disconnect buttons work
- [ ] No console errors
- [ ] Vercel logs show no errors
- [ ] Screencast recorded and ready
- [ ] Ready for Meta app review

---

## Summary

**Your deployment status:**

✅ Backend code created and ready  
✅ Frontend already configured  
✅ Firestore ready  
✅ Dependencies added to package.json  

**What you need to do:**

1. Install dependencies: `npm install`
2. Deploy to Vercel: `vercel --prod`
3. Set environment variables on Vercel
4. Create Firestore collections
5. Test the full flow
6. Record screencast
7. Submit to Meta for review

**Estimated Total Time**: 20-30 minutes

---

**Need help?** Check `VERCEL_DEPLOYMENT_GUIDE.md` for detailed step-by-step instructions!

