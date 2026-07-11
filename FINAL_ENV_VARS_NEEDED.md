# Final Environment Variables to Add to Vercel

You've already added most! Just add these 7 remaining variables to complete the setup.

---

## Variables to Add (Copy-Paste)

Add each to Vercel Dashboard: **Settings** → **Environment Variables** → **Add New**

### 1. FIREBASE_TYPE
- **Variable Name:** `FIREBASE_TYPE`
- **Value:** `service_account`
- **Scope:** Production and Preview

### 2. FIREBASE_PRIVATE_KEY_ID
- **Variable Name:** `FIREBASE_PRIVATE_KEY_ID`
- **Value:** `614bfcbcaf8cf43d55cbf95e98224b6b0d117877`
- **Scope:** Production and Preview

### 3. FIREBASE_CLIENT_ID
- **Variable Name:** `FIREBASE_CLIENT_ID`
- **Value:** `103562695390106586283`
- **Scope:** Production and Preview

### 4. FIREBASE_AUTH_URI
- **Variable Name:** `FIREBASE_AUTH_URI`
- **Value:** `https://accounts.google.com/o/oauth2/auth`
- **Scope:** Production and Preview

### 5. FIREBASE_TOKEN_URI
- **Variable Name:** `FIREBASE_TOKEN_URI`
- **Value:** `https://oauth2.googleapis.com/token`
- **Scope:** Production and Preview

### 6. FIREBASE_AUTH_PROVIDER_X509_CERT_URL
- **Variable Name:** `FIREBASE_AUTH_PROVIDER_X509_CERT_URL`
- **Value:** `https://www.googleapis.com/oauth2/v1/certs`
- **Scope:** Production and Preview

### 7. FRONTEND_URL
- **Variable Name:** `FRONTEND_URL`
- **Value:** `https://onedesk.vilpower.com`
- **Scope:** Production and Preview

---

## After Adding Variables

1. ✅ Add all 7 variables above
2. Go to **Deployments**
3. Click **...** on latest deployment
4. Select **Redeploy**
5. Wait 2-3 minutes for deployment to complete

---

## Then Test

Once deployment completes:

1. Go to your app: **https://onedesk.vilpower.com**
2. Navigate to **Integration** page
3. Click **Connect Meta Account** button
4. You should be redirected to **Facebook Login**
5. Log in and authorize
6. You'll be redirected back with connection confirmed!

---

## Current Status

```
✅ APP_URL
✅ MARKETING_HUB_ENCRYPTION_KEY
✅ FIREBASE_PRIVATE_KEY
✅ FIREBASE_CLIENT_EMAIL
✅ FIREBASE_PROJECT_ID
✅ FACEBOOK_APP_SECRET
✅ FACEBOOK_APP_ID

⏳ FIREBASE_TYPE (ADD NOW)
⏳ FIREBASE_PRIVATE_KEY_ID (ADD NOW)
⏳ FIREBASE_CLIENT_ID (ADD NOW)
⏳ FIREBASE_AUTH_URI (ADD NOW)
⏳ FIREBASE_TOKEN_URI (ADD NOW)
⏳ FIREBASE_AUTH_PROVIDER_X509_CERT_URL (ADD NOW)
⏳ FRONTEND_URL (ADD NOW)
```

Once all 7 are added and redeployed → **Meta OAuth will be fully functional!**

