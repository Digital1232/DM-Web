# 🚀 START HERE - Meta OAuth Vercel Deployment

**Status**: ✅ BACKEND READY FOR DEPLOYMENT  
**Your Next Action**: Follow the 7-step quick start below

---

## ⚡ 7-Step Deployment Process

### Step 1️⃣: Install Dependencies (1 minute)

```bash
npm install firebase-admin node-fetch
```

✅ This installs the required npm packages for your backend functions.

---

### Step 2️⃣: Gather Your Credentials (5 minutes)

You need 7 environment variables. Start collecting them now:

#### From Meta Developer Console (meta.com/developers)
```
1. FACEBOOK_APP_ID        → Copy from Settings → Basic
2. FACEBOOK_APP_SECRET    → Copy from Settings → Basic
```

#### From Firebase Console (console.firebase.google.com)
```
3. FIREBASE_PROJECT_ID    → Copy from Project Settings → General
4. FIREBASE_CLIENT_EMAIL  → Copy from Service Account JSON
5. FIREBASE_PRIVATE_KEY   → Copy from Service Account JSON (with \n characters)
```

#### Create These
```
6. MARKETING_HUB_ENCRYPTION_KEY → Generate random 32+ character string
                                 (Example: aB3#Xz9@mK2$pL5&nQ8*tV1-xW4)
7. APP_URL                      → Will be https://your-project.vercel.app
                                 (Get this after Vercel deployment)
```

**💾 Save these somewhere safe!** You'll need them in Step 5.

---

### Step 3️⃣: Commit Backend Code (2 minutes)

```bash
git add .
git commit -m "Add Meta OAuth serverless backend"
git push
```

✅ This pushes the 6 new serverless functions to GitHub.

---

### Step 4️⃣: Deploy to Vercel (5 minutes)

**Option A: Using Vercel CLI (Recommended)**

```bash
# Install Vercel CLI globally
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

**Option B: Using Vercel Dashboard**
- Go to vercel.com → Add New Project → Import Git Repository
- Select your GitHub repo and click Import

✅ Your backend is now live on Vercel!
📍 **Copy your Vercel URL** (looks like: https://dm-web.vercel.app)

---

### Step 5️⃣: Set Environment Variables on Vercel (5 minutes)

```bash
# Set each variable (use the values you gathered in Step 2)

vercel env add FACEBOOK_APP_ID
# → Paste your App ID and press Enter

vercel env add FACEBOOK_APP_SECRET
# → Paste your App Secret and press Enter

vercel env add FIREBASE_PROJECT_ID
# → Paste your Firebase Project ID and press Enter

vercel env add FIREBASE_CLIENT_EMAIL
# → Paste your Firebase client email and press Enter

vercel env add FIREBASE_PRIVATE_KEY
# → Paste your Firebase private key (with newlines) and press Enter

vercel env add MARKETING_HUB_ENCRYPTION_KEY
# → Paste your random encryption key and press Enter

vercel env add APP_URL
# → Paste your Vercel URL and press Enter
```

✅ All environment variables are now set on Vercel.

---

### Step 6️⃣: Redeploy with Environment Variables (2 minutes)

```bash
vercel --prod
```

✅ Backend is redeployed with all environment variables configured.

---

### Step 7️⃣: Create Firestore Collections (3 minutes)

Go to **Firebase Console** → Your Project → **Firestore Database**

Create these 4 collections (just click "Create Collection"):

1. `meta_connections` - Stores user connection data
2. `meta_oauth_state` - Stores temporary OAuth states
3. `meta_audit_log` - Logs all user actions (optional)
4. `meta_sync_log` - Logs all data syncs (optional)

**Important**: Enable TTL on `meta_oauth_state`
- Click the collection
- Click "TTL" (top right menu)
- Select the `expiresAt` field
- Click "Enable"

✅ Firestore is ready!

---

## ✨ Verification - Your Backend is Live!

After Step 7, verify everything works:

```bash
# Check that Vercel logs show no errors
vercel logs

# You should see your functions running
# Look for: /api/meta/connect, /api/meta/callback, etc.
```

### Test the Complete Flow

1. Open your app: `https://your-project.vercel.app/dashboard?view=meta-integration`
2. Click **"Connect Meta Account"** button
3. You'll be redirected to Meta/Facebook login
4. Login with your Meta account credentials
5. Grant permissions when prompted
6. Browser redirects back to your app
7. You should see **Instagram profile card** with:
   - ✅ Profile picture
   - ✅ Username (@handle)
   - ✅ Account ID
   - ✅ Account type (BUSINESS)
   - ✅ Followers count
8. Also see Facebook page and Ad accounts info

**If all 8 items above work → You're Done! 🎉**

---

## 📹 Record Your Screencast

Meta wants to see a video (< 3 minutes) showing:

1. **Start** (0:00-0:30): Navigate to Integrations section
2. **OAuth** (0:30-1:30): Show the login & permission flow
3. **Connected** (1:30-2:30): Show Instagram card with all data
4. **End** (2:30-3:00): Show Sync/Disconnect buttons

**Total**: < 3 minutes

---

## 📚 Documentation Reference

If you need more details:

| Document | Purpose |
|----------|---------|
| **VERCEL_QUICK_DEPLOY.txt** | Copy-paste commands (what you just did) |
| **VERCEL_DEPLOYMENT_GUIDE.md** | Detailed explanations & troubleshooting |
| **META_VERCEL_SETUP_CHECKLIST.md** | Checkbox format to track progress |
| **DEPLOYMENT_READY_SUMMARY.md** | Overview of what was created |
| **META_APP_REVIEW_REQUIREMENTS.md** | What Meta wants to see |

---

## ❌ Troubleshooting Common Issues

### "Cannot find module 'firebase-admin'"
✅ Solution: Run `npm install firebase-admin node-fetch`

### "FIREBASE_PRIVATE_KEY is undefined"
✅ Solution: Check environment variables are set on Vercel dashboard

### "Invalid state parameter" error
✅ Solution: Make sure `meta_oauth_state` collection is created in Firestore

### OAuth redirects to error page
✅ Solution: Check that OAuth redirect URI in Meta app settings matches your Vercel URL

### Very slow responses (> 2 seconds)
✅ Solution: Wait for Firestore indexes to build (usually 5-10 minutes after deployment)

**Still stuck?** See `VERCEL_DEPLOYMENT_GUIDE.md` → Troubleshooting section

---

## 🎯 Success Checklist

After deployment, verify:

- [ ] Dependencies installed (firebase-admin, node-fetch)
- [ ] Code committed and pushed to GitHub
- [ ] Deployed to Vercel successfully
- [ ] All 7 environment variables set on Vercel
- [ ] Redeployed with environment variables
- [ ] Firestore collections created (4 collections)
- [ ] TTL enabled on meta_oauth_state
- [ ] Test: Click "Connect Meta Account" button
- [ ] Test: Redirected to Facebook login
- [ ] Test: Completed OAuth flow
- [ ] Test: Redirected back to app
- [ ] Test: Instagram card displays with profile picture
- [ ] Test: Username, Account ID, type, followers all visible
- [ ] No errors in browser console
- [ ] No errors in Vercel logs
- [ ] Screencast recorded (< 3 minutes)

**All checked?** → Ready for Meta App Review! 🚀

---

## 📊 What's Running

After deployment, these endpoints are live:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/meta/connect | POST | Start OAuth |
| /api/meta/callback | GET | Finish OAuth |
| /api/meta/profile | GET | Get connection data |
| /api/meta/disconnect | POST | Disconnect |
| /api/meta/sync | POST | Update data |
| /api/meta/refresh | POST | Check status |

---

## ⏱️ Timeline

If you follow these steps:

```
0-5 min    Step 1-2: Install & gather credentials
5-10 min   Step 3: Commit code
10-20 min  Step 4-5: Deploy & set env vars
20-25 min  Step 6: Redeploy
25-30 min  Step 7: Create Firestore collections
30-35 min  Verification & testing

Total: 30-35 minutes to fully working backend ✅
```

---

## 🎉 You're Done!

Your Meta OAuth backend is now deployed and working!

### What Happens Next:

1. Users can click "Connect Meta Account" button
2. Complete OAuth flow with Meta
3. See all their Instagram business account data
4. Data is encrypted and securely stored
5. Can sync/refresh/disconnect anytime

### Ready for Meta Review:

1. Record screencast (< 3 minutes)
2. Document what you're showing
3. Submit to Meta
4. Wait for approval
5. Launch! 🚀

---

## 📞 Need Help?

- **Quick questions?** See the FAQ section in `VERCEL_DEPLOYMENT_GUIDE.md`
- **Getting an error?** See Troubleshooting in `VERCEL_DEPLOYMENT_GUIDE.md`
- **Want more details?** Read `DEPLOYMENT_READY_SUMMARY.md`
- **Need the setup checklist?** Use `META_VERCEL_SETUP_CHECKLIST.md`

---

## 🔒 Security Note

Your backend is secure:
- ✅ OAuth 2.0 authentication
- ✅ CSRF protection with state parameter
- ✅ Token encryption (AES-256)
- ✅ HTTPS-only communication
- ✅ Tokens never exposed to frontend
- ✅ Firebase auth verification
- ✅ Automatic token cleanup

---

**Ready to deploy?** Start with **Step 1** above! 🚀

If you have any questions during setup, refer to `VERCEL_DEPLOYMENT_GUIDE.md` for detailed help.

