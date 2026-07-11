# Meta OAuth Setup Status

## ✅ What's Been Fixed

### Frontend (100% Complete)
- **Firebase Auth Shim** ✅ 
  - Fixed timing issue where `window.auth` was undefined
  - Added proper exposure of Firebase objects to window
  - Shim now waits up to 20 seconds for module to initialize
  - Console logging to track initialization progress

- **Meta Integration Module** ✅
  - Updated to use localStorage fallback for user data
  - Now properly retrieves Firebase ID token
  - Sends correct `Authorization: Bearer {token}` header

- **Error Handling** ✅
  - Better error messages on failed auth
  - Console logs help diagnose issues

### Backend (Configuration Complete, Credentials Pending)
- **API Endpoint** ✅
  - `/api/meta/connect` - Initiates OAuth flow
  - `/api/meta/callback` - Handles Facebook callback
  - `/api/meta/profile` - Gets connection status
  - `/api/meta/disconnect` - Removes connection
  - All endpoints in `api/meta.js`

- **Vercel Configuration** ✅
  - `vercel.json` created with proper routing
  - Node.js runtime configured
  - Environment variable placeholders set

---

## ⏳ What's Needed Now

### 1. Set Environment Variables in Vercel (10 minutes)

Follow **VERCEL_ENV_SETUP_GUIDE.md** to get credentials from:
- **Firebase Console** (Service Account JSON)
- **Meta Developers** (App ID & Secret)
- **Generate** encryption key

Add to Vercel dashboard under **Settings** → **Environment Variables**

### 2. Redeploy After Adding Variables

- Go to **Vercel Deployments**
- Click **...** on latest deployment
- Select **Redeploy**
- Wait 2-3 minutes for deployment to complete

---

## Testing Flow

Once credentials are set and deployed:

1. **Open App** → go to Integration page
2. **Click "Connect Meta Account"** button
3. **Expected:** Redirected to Facebook login
4. **Log in** with your Meta account
5. **Authorize** the app permissions
6. **Redirected back** to app with "Connected!" message

---

## Current State

```
Frontend: ✅ READY
Backend Code: ✅ READY
Vercel Config: ✅ READY
Environment Variables: ⏳ PENDING (user action required)
```

---

## What Happens When "Connect Meta Account" Is Clicked

### Current (Without Env Vars)
1. Frontend gets Firebase ID token ✅
2. Sends POST to `/api/meta/connect` with token ✅
3. **Backend can't start → 404 error** ❌
   - (Because Firebase credentials not available)

### After Env Vars Are Set
1. Frontend gets Firebase ID token ✅
2. Sends POST to `/api/meta/connect` with token ✅
3. Backend verifies Firebase token ✅
4. Backend generates Facebook OAuth URL ✅
5. **Frontend redirected to Facebook login** ✅

---

## Credentials Checklist

Get from Firebase Console:
- [ ] `FIREBASE_PROJECT_ID`
- [ ] `FIREBASE_PRIVATE_KEY_ID`
- [ ] `FIREBASE_PRIVATE_KEY` (with newlines)
- [ ] `FIREBASE_CLIENT_EMAIL`
- [ ] `FIREBASE_CLIENT_ID`

Get from Meta Developers:
- [ ] `FACEBOOK_APP_ID`
- [ ] `FACEBOOK_APP_SECRET`

Generate/Set:
- [ ] `APP_URL` = `https://onedesk.vilpower.com`
- [ ] `FRONTEND_URL` = `https://onedesk.vilpower.com`
- [ ] `MARKETING_HUB_ENCRYPTION_KEY` = (generate random 32 chars)

---

## Next Steps

1. **Read** `VERCEL_ENV_SETUP_GUIDE.md` for detailed instructions
2. **Gather** all credentials
3. **Add** to Vercel environment variables
4. **Redeploy** your project
5. **Test** the "Connect Meta Account" button

Once done, the OAuth flow will be fully functional!

