# Meta Integration - Vercel Deployment Guide

**Status**: Ready for Deployment ✅  
**Date**: July 10, 2026  
**Version**: 1.0.0

---

## 📋 Quick Start (5 Minutes)

This guide walks you through deploying the Meta OAuth backend to Vercel as serverless functions.

### Prerequisites ✅
- [ ] Vercel account (free tier works)
- [ ] GitHub account (to link repo)
- [ ] Meta/Facebook App created in developer.facebook.com
- [ ] Firebase project with Firestore enabled
- [ ] 15-30 minutes for complete setup

---

## 🔑 Step 1: Gather Your Credentials (5 minutes)

You need these values to set as environment variables on Vercel.

### From Meta/Facebook Developer Console

1. Go to **[developer.facebook.com](https://developer.facebook.com)**
2. Click **My Apps** → Select your app
3. Go to **Settings** → **Basic**
4. Copy these values:
   - `FACEBOOK_APP_ID` - Your App ID
   - `FACEBOOK_APP_SECRET` - Your App Secret (keep this secret!)

5. Go to **Products** → **Facebook Login** → **Settings**
6. Add **Valid OAuth Redirect URIs**:
   - For Vercel: `https://your-project.vercel.app/api/meta/callback`
   - For local testing: `http://localhost:3000/api/meta/callback`

### From Firebase Console

1. Go to **[console.firebase.google.com](https://console.firebase.google.com)**
2. Select your project
3. Go to **Project Settings** (gear icon)
4. Click **Service Accounts** tab
5. Click **Generate New Private Key**
6. Open the downloaded JSON file and copy:
   - `FIREBASE_PROJECT_ID` - "projectId"
   - `FIREBASE_CLIENT_EMAIL` - "client_email"
   - `FIREBASE_PRIVATE_KEY` - "private_key" (entire string with \n characters)

### Create Environment Variables

Create a `.env.local` file in your project root:

```env
# Meta Credentials (from Facebook Developer Console)
FACEBOOK_APP_ID=your_app_id_here
FACEBOOK_APP_SECRET=your_app_secret_here

# Firebase Credentials (from Firebase Console)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email@appspot.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Encryption Key (create a random 32+ character string)
MARKETING_HUB_ENCRYPTION_KEY=your_super_secret_encryption_key_min_32_chars

# App URL (set this after Vercel deployment)
APP_URL=https://your-project.vercel.app
```

**IMPORTANT**: 
- Never commit `.env.local` to git (it's in .gitignore)
- Keep these values secret!

---

## 🚀 Step 2: Install Dependencies (2 minutes)

Your backend serverless functions need dependencies installed.

```bash
npm install firebase-admin node-fetch
```

**Verify** in your `package.json`:
```json
"dependencies": {
    "firebase-admin": "^12.0.0",
    "node-fetch": "^2.7.0"
}
```

---

## 🌐 Step 3: Deploy to Vercel (5 minutes)

### Option A: Using Vercel CLI (Recommended)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy
vercel

# 4. Link to existing project (if prompted)
# Answer yes if you want to link to existing Vercel project

# 5. Deploy to production
vercel --prod
```

### Option B: Using Vercel Dashboard

1. Go to **[vercel.com](https://vercel.com)**
2. Sign in to your account
3. Click **Add New** → **Project**
4. Select **Import Git Repository**
5. Choose your GitHub repo
6. Click **Import**
7. Go to **Settings** → **Environment Variables**
8. Add all variables from Step 1
9. Click **Deploy**

---

## 🔧 Step 4: Configure Environment Variables on Vercel (5 minutes)

Using Vercel CLI:

```bash
# Add each variable
vercel env add FACEBOOK_APP_ID
# Paste: your_app_id

vercel env add FACEBOOK_APP_SECRET
# Paste: your_app_secret

vercel env add FIREBASE_PROJECT_ID
# Paste: your_project_id

vercel env add FIREBASE_CLIENT_EMAIL
# Paste: your_service_account_email@appspot.gserviceaccount.com

vercel env add FIREBASE_PRIVATE_KEY
# Paste: entire private key with newlines

vercel env add MARKETING_HUB_ENCRYPTION_KEY
# Paste: your_encryption_key

vercel env add APP_URL
# Paste: https://your-project.vercel.app
```

Or using **Vercel Dashboard**:

1. Go to your project on **vercel.com**
2. Click **Settings** → **Environment Variables**
3. Add each variable:
   - Click **Add New**
   - Enter Name and Value
   - Select environments (Production, Preview, Development)
   - Click **Save**

**Important**: Make sure `APP_URL` matches your actual Vercel deployment URL!

---

## 📝 Step 5: Update Your Frontend (2 minutes)

Update `js/metaIntegration.js` to use your Vercel URL:

In the `handleConnectMetaClick()` function, the fetch call should be:

```javascript
// This is already correct - it uses relative paths
fetch('/api/meta/connect', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
})
```

Vercel automatically routes `/api/*` to your serverless functions! ✅

---

## ✅ Step 6: Verify Deployment (5 minutes)

### Check Endpoints Are Live

After deployment, check that your endpoints are live:

```bash
# Get your Vercel URL from the deployment output
# It looks like: https://your-project.vercel.app

# These should all return 404 (not 500 or connection refused)
curl https://your-project.vercel.app/api/meta/connect
curl https://your-project.vercel.app/api/meta/callback
curl https://your-project.vercel.app/api/meta/profile
```

### View Logs

```bash
# View real-time logs
vercel logs

# View logs for specific endpoint
vercel logs /api/meta/connect

# View error logs
vercel logs --error
```

### Test OAuth Flow

1. Open your app: `https://your-project.vercel.app/dashboard?view=meta-integration`
2. You should be logged in (using Firebase auth)
3. Click "Connect Meta Account" button
4. You should be redirected to Facebook login
5. Complete OAuth flow
6. Should redirect back to your app
7. Should see Instagram profile card with data

---

## 🔐 Step 7: Configure Firestore Collections (3 minutes)

Your backend needs these Firestore collections to work:

### Create Collections

In **Firebase Console** → **Firestore Database**:

1. **Create Collection**: `meta_connections`
   - Document ID: auto-generated
   - This stores user Meta connections

2. **Create Collection**: `meta_oauth_state`
   - Document ID: auto-generated
   - This stores temporary OAuth state (for CSRF protection)

3. **Create Collection**: `meta_audit_log`
   - Document ID: auto-generated
   - This logs all Meta actions (optional but recommended)

4. **Create Collection**: `meta_sync_log`
   - Document ID: auto-generated
   - This logs all sync operations (optional but recommended)

### Set TTL on oauth_state (Important!)

This automatically deletes old OAuth states after 10 minutes:

1. Go to `meta_oauth_state` collection
2. Click **three dots** (top right)
3. Select **TTL** or **Set TTL**
4. Select `expiresAt` field
5. Click **Enable**

---

## 📊 Vercel Project Structure

Your project should now look like this:

```
your-project/
├── api/
│   ├── meta/
│   │   ├── connect.js      ✅ Vercel auto-deploys this
│   │   ├── callback.js     ✅ Vercel auto-deploys this
│   │   ├── profile.js      ✅ Vercel auto-deploys this
│   │   ├── disconnect.js   ✅ Vercel auto-deploys this
│   │   ├── sync.js         ✅ Vercel auto-deploys this
│   │   └── refresh.js      ✅ Vercel auto-deploys this
│   └── metaIntegration.js  (old, can keep for reference)
├── js/
│   ├── metaIntegration.js  ✅ Frontend code
│   └── ...
├── index.html              ✅ Frontend
├── package.json            ✅ Updated with new deps
├── .env.local              (LOCAL ONLY - not committed)
└── vercel.json             (optional, auto-created)
```

---

## 🧪 Testing the Full Flow

### Test 1: Check Endpoints Exist

```bash
# Get your Vercel deployment URL
# Run these commands to verify endpoints are up:

curl -X POST https://your-project.vercel.app/api/meta/connect \
  -H "Authorization: Bearer your_firebase_token"

# Should return: {"success": true, "authUrl": "https://..."}
```

### Test 2: Complete OAuth Flow

1. Open app in browser
2. Navigate to Meta Integration section
3. Click "Connect Meta Account"
4. Login with Meta credentials
5. Grant permissions
6. Check redirect back to app
7. Verify Instagram data displays

### Test 3: Verify Data Saved

Check Firebase Console → Firestore:
1. Look at `meta_connections` collection
2. Should have document with your user ID
3. Should contain all connection data

---

## 🐛 Troubleshooting

### Error: "Cannot find module 'firebase-admin'"

**Solution**: Dependencies weren't installed before deploy

```bash
npm install firebase-admin node-fetch
git add package.json package-lock.json
git commit -m "Add Meta backend dependencies"
git push
```

Then redeploy:
```bash
vercel --prod
```

### Error: "FIREBASE_PRIVATE_KEY is undefined"

**Solution**: Environment variables not set on Vercel

1. Go to Vercel project → Settings → Environment Variables
2. Verify all variables are set
3. Make sure `FIREBASE_PRIVATE_KEY` has full key with `\n` characters
4. Redeploy: `vercel --prod`

### Error: "Invalid state parameter"

**Solution**: Firestore collection not created

1. Go to Firebase Console
2. Create `meta_oauth_state` collection (if missing)
3. Re-enable TTL on `expiresAt` field
4. Try OAuth flow again

### Slow Response Times (> 2 seconds)

**Solution**: Firestore indexes may be building

1. Go to Firebase Console → Firestore → Indexes
2. Wait for all indexes to finish building
3. Try again

### 401 Unauthorized on all endpoints

**Solution**: Firebase auth token issue

1. Check that Firebase token is valid:
   - Token must be from `admin.auth().verifyIdToken()`
   - Token format: `Authorization: Bearer TOKEN`
2. Check Firebase project ID matches
3. Check service account credentials are correct

---

## 📈 Monitoring & Logs

### View Deployment Logs

```bash
# Real-time logs
vercel logs --follow

# Last 100 lines
vercel logs

# Specific function
vercel logs /api/meta/profile
```

### Monitor in Firebase Console

1. Go to **Firebase Console** → Your Project
2. Go to **Firestore** → **Collections**
3. Watch `meta_connections` grow as users connect
4. Check `meta_audit_log` for connection history

### Key Metrics to Track

- **Error Rate**: Should be < 1%
- **Response Time**: Should be < 500ms
- **OAuth Success**: Should be > 95%

---

## 🎯 After Deployment

### Update Meta App Settings

1. Go to Meta Developer Console
2. Go to **Settings** → **Basic**
3. Update **App Domains** to your Vercel URL:
   - `your-project.vercel.app`

4. Go to **Products** → **Facebook Login** → **Settings**
5. Add **Valid OAuth Redirect URI**:
   - `https://your-project.vercel.app/api/meta/callback`

### Test Full Integration

1. Open app at `https://your-project.vercel.app`
2. Navigate to **Settings** → **Integrations**
3. Click **Connect Meta Account**
4. Complete OAuth flow
5. Verify Instagram card displays

### Record Screencast

Now that everything is deployed:

1. Show empty state (before connecting)
2. Click "Connect Meta Account"
3. Complete OAuth flow
4. Show connected state with Instagram data
5. Show all profile information
6. Total time: < 3 minutes

---

## 🚀 Production Checklist

Before submitting to Meta for review:

- [ ] Backend deployed to Vercel
- [ ] All environment variables configured
- [ ] Firestore collections created
- [ ] OAuth flow tested end-to-end
- [ ] Instagram profile data displays correctly
- [ ] Profile picture shows
- [ ] Username displays with @
- [ ] Account ID displays
- [ ] Followers count displays
- [ ] No console errors
- [ ] No sensitive data in logs
- [ ] Mobile tested
- [ ] Dark mode tested
- [ ] Screencast recorded (< 3 minutes)

---

## 📞 Support

### If Something Goes Wrong

1. **Check Logs**: `vercel logs`
2. **Check Firebase**: Verify collections exist
3. **Check Env Vars**: Verify on Vercel dashboard
4. **Check GitHub**: Verify code was pushed
5. **Redeploy**: `vercel --prod`

### Common Issues Checklist

- [ ] Endpoint returns 404? → Check `api/meta/` files exist
- [ ] Firebase error? → Check project ID and credentials
- [ ] OAuth error? → Check Meta App ID and Secret
- [ ] Slow? → Check Firestore indexes
- [ ] 401 errors? → Check authorization header and token

---

## ✅ Success Indicators

You'll know it's working when:

✅ OAuth URL redirects to Facebook login  
✅ Meta login completes successfully  
✅ Browser redirects back to your app  
✅ Instagram profile data displays  
✅ Profile picture shows in circular thumbnail  
✅ Username displays with @ symbol  
✅ Account ID, type, and followers display  
✅ No errors in browser console  
✅ No errors in Vercel logs  
✅ Data visible in Firestore  

---

## 🎉 Next Steps

After successful deployment:

1. **Record screencast** (< 3 minutes)
2. **Document what's shown** (permissions, data)
3. **Submit to Meta for app review**
4. **Wait for Meta approval**
5. **Launch to production**

---

## 📝 Notes

- Vercel free tier includes 100 GB/month bandwidth (plenty for this)
- Serverless functions scale automatically
- No server to manage
- Automatic HTTPS
- CDN included

**Estimated Deploy Time**: 10-15 minutes  
**Estimated Testing Time**: 5-10 minutes  
**Total Time to Production**: 20-30 minutes

---

**Ready to deploy?** Follow the steps above and your Meta OAuth backend will be live! 🚀

