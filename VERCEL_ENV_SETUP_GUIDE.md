# Vercel Environment Variables Setup Guide

This guide shows exactly where to find each required credential for the Meta OAuth backend.

---

## 1. Firebase Service Account Credentials

**Where to get them:**

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **worksync-vilpower**
3. Click **⚙️ Settings** (gear icon) → **Project Settings**
4. Go to the **Service Accounts** tab
5. Click **Generate New Private Key** button
6. A JSON file will download - this contains all your Firebase credentials

**The JSON file looks like:**
```json
{
  "type": "service_account",
  "project_id": "worksync-vilpower",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBA...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxx@worksync-vilpower.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

**Extract these values:**

| Variable | Value from JSON |
|----------|----------------|
| `FIREBASE_TYPE` | `"type"` field → should be `service_account` |
| `FIREBASE_PROJECT_ID` | `"project_id"` → `worksync-vilpower` |
| `FIREBASE_PRIVATE_KEY_ID` | `"private_key_id"` → the long hash string |
| `FIREBASE_PRIVATE_KEY` | `"private_key"` → **Include the `-----BEGIN...-----END-----` lines, keep `\n` newlines** |
| `FIREBASE_CLIENT_EMAIL` | `"client_email"` → `firebase-adminsdk-xxx@...` |
| `FIREBASE_CLIENT_ID` | `"client_id"` → numeric ID |
| `FIREBASE_AUTH_URI` | Usually `https://accounts.google.com/o/oauth2/auth` |
| `FIREBASE_TOKEN_URI` | Usually `https://oauth2.googleapis.com/token` |
| `FIREBASE_AUTH_PROVIDER_X509_CERT_URL` | Usually `https://www.googleapis.com/oauth2/v1/certs` |

---

## 2. Meta (Facebook) App Credentials

**Where to get them:**

1. Go to [Meta Developers](https://developers.facebook.com)
2. Click **My Apps** → **[Your App Name]** (or create one if needed)
3. Go to **Settings** → **Basic**

**Get these values:**

| Variable | Where to find |
|----------|--------------|
| `FACEBOOK_APP_ID` | Under "Basic" - **App ID** field (large number) |
| `FACEBOOK_APP_SECRET` | Under "Basic" - **App Secret** field (click to reveal) |

⚠️ **IMPORTANT:** Keep App Secret hidden! Never share it.

---

## 3. Application URLs

| Variable | Value |
|----------|-------|
| `APP_URL` | Your deployed app URL: **`https://onedesk.vilpower.com`** or your Vercel URL |
| `FRONTEND_URL` | Same as `APP_URL` for now: **`https://onedesk.vilpower.com`** |

---

## 4. Encryption Key

| Variable | Value |
|----------|-------|
| `MARKETING_HUB_ENCRYPTION_KEY` | Generate a random 32-character string, e.g., `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6` |

Generate one using: `openssl rand -hex 16` (outputs 32 hex chars)

Or just use: **`a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`** (or any random 32+ char string)

---

## How to Add to Vercel

1. Go to **Vercel Dashboard** → Your Project
2. Click **Settings** → **Environment Variables**
3. Click **Add New** for each variable:
   - Paste the **Variable Name** (e.g., `FIREBASE_TYPE`)
   - Paste the **Value** 
   - Select Production/Preview/Development as needed
   - Click **Save**

4. After adding all variables, trigger a **Redeploy**:
   - Go to **Deployments**
   - Click the **...** menu on latest deployment
   - Select **Redeploy**

---

## Checklist

- [ ] Firebase Service Account JSON downloaded
- [ ] `FIREBASE_TYPE` added to Vercel
- [ ] `FIREBASE_PROJECT_ID` added
- [ ] `FIREBASE_PRIVATE_KEY_ID` added
- [ ] `FIREBASE_PRIVATE_KEY` added (with newlines)
- [ ] `FIREBASE_CLIENT_EMAIL` added
- [ ] `FIREBASE_CLIENT_ID` added
- [ ] `FIREBASE_AUTH_URI` added
- [ ] `FIREBASE_TOKEN_URI` added
- [ ] `FIREBASE_AUTH_PROVIDER_X509_CERT_URL` added
- [ ] `FACEBOOK_APP_ID` added
- [ ] `FACEBOOK_APP_SECRET` added
- [ ] `APP_URL` added
- [ ] `FRONTEND_URL` added
- [ ] `MARKETING_HUB_ENCRYPTION_KEY` added
- [ ] Project redeployed after adding variables

---

## Testing After Setup

Once variables are added and deployment completes:

1. Go to your app
2. Click **Connect Meta Account** button
3. You should be redirected to Facebook login
4. After authorization, you'll be redirected back to your app with connection confirmed

If you get `404 Not Found` again, it means:
- Variables weren't saved properly (check Vercel dashboard)
- Redeploy hasn't completed yet (wait 2-3 minutes)
- Check browser console for exact error

---

## Troubleshooting

**"Firebase auth not configured"** → Check `FIREBASE_PROJECT_ID` and `FIREBASE_CLIENT_EMAIL` are correct

**"Invalid Facebook credentials"** → Check `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET` are correct and exact

**"Private key format error"** → Make sure `FIREBASE_PRIVATE_KEY` includes the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines with `\n` newlines preserved

