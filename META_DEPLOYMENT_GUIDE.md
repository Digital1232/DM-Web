# Meta Integration - Deployment & Testing Guide

**Date**: July 10, 2026  
**Version**: 1.0.0  
**Status**: Ready for Deployment

---

## 📋 Pre-Deployment Checklist

### Environment Setup ✅
- [ ] Node.js 14+ installed
- [ ] npm or yarn available
- [ ] Firebase project created
- [ ] Meta app created in developer console
- [ ] Text editor or IDE ready

### Environment Variables ✅
Create `.env` file with:
```bash
# Meta Credentials
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret
APP_URL=http://localhost:5000  # For development

# Encryption
MARKETING_HUB_ENCRYPTION_KEY=your_32_character_minimum_key_here

# Firebase
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY=your-firebase-private-key
FIREBASE_CLIENT_EMAIL=your-firebase-client-email@appspot.gserviceaccount.com
```

### Dependencies ✅
```bash
npm install firebase-admin express node-fetch cors
```

---

## 🔧 Step-by-Step Setup

### Step 1: Copy Backend Files (2 minutes)

Copy these files to your project:
```
api/metaIntegration.js     → Copy to your api/ folder
routes/meta.js             → Copy to your routes/ folder
```

**Verify file locations**:
```
your-project/
├── api/
│   └── metaIntegration.js        ✅
├── routes/
│   └── meta.js                   ✅
└── app.js (or server.js)
```

### Step 2: Update Main App File (5 minutes)

In your `app.js` or `server.js`:

```javascript
// 1. Add imports at the top
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

// 2. Initialize Firebase
admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL
});

const app = express();

// 3. Add middleware
app.use(express.json());
app.use(cors());

// 4. Create Firebase auth middleware
const firebaseAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ success: false });
        }

        const token = authHeader.substring(7);
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = { uid: decodedToken.uid, email: decodedToken.email };
        next();
    } catch (error) {
        res.status(401).json({ success: false });
    }
};

// 5. Import Meta routes
const metaIntegration = require('./api/metaIntegration');
const metaRoutes = require('./routes/meta');

// 6. Register callback FIRST (no auth)
app.get('/api/meta/callback', async (req, res) => {
    await metaIntegration.handleCallback(req, res);
});

// 7. Register other routes WITH auth
app.use('/api/meta', firebaseAuth, metaRoutes);

// 8. Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Meta API endpoints ready`);
});
```

### Step 3: Configure Firestore (3 minutes)

1. Go to Firebase Console
2. Select your project
3. Go to Firestore Database
4. Create these collections:
   - `meta_connections`
   - `meta_oauth_state`
   - `meta_audit_log`
   - `meta_sync_log`

**Set TTL on `meta_oauth_state`**:
1. Click on `meta_oauth_state` collection
2. Click "TTL" menu (top right)
3. Select `expiresAt` field
4. Click "Enable"

### Step 4: Verify Frontend Integration (1 minute)

Check that `js/metaIntegration.js` already calls:
```javascript
fetch('/api/meta/connect', ...)      // ✅ Frontend ready
fetch('/api/meta/callback', ...)     // ✅ Backend handles
fetch('/api/meta/profile', ...)      // ✅ Frontend ready
fetch('/api/meta/disconnect', ...)   // ✅ Frontend ready
fetch('/api/meta/sync', ...)         // ✅ Frontend ready
```

**Frontend is already configured!** ✅

---

## 🧪 Testing

### Test 1: Start Server

```bash
npm start
# or
npm run dev
```

Expected output:
```
Server running on port 5000
Meta API endpoints ready
```

### Test 2: Check Endpoints Are Accessible

```bash
curl http://localhost:5000/health
# Should return: {"status":"ok",...}
```

### Test 3: Test OAuth Endpoint

**In your browser console** (logged in user):

```javascript
// Get your Firebase token
const token = await firebase.auth().currentUser.getIdToken();

// Test connect endpoint
fetch('/api/meta/connect', {
    method: 'POST',
    headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
}).then(r => r.json()).then(d => console.log(d));
```

Expected response:
```json
{
  "success": true,
  "authUrl": "https://www.facebook.com/v18.0/dialog/oauth?..."
}
```

### Test 4: Test Profile Endpoint

```javascript
// Test get profile
fetch('/api/meta/profile', {
    headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json()).then(d => console.log(d));
```

Expected response (when not connected):
```json
{
  "success": true,
  "data": null,
  "message": "No Meta connection found"
}
```

### Test 5: Complete OAuth Flow

1. Open: `http://localhost:5000/dashboard?view=meta-integration`
2. Click "Connect Meta Account"
3. Login with your Meta test account
4. Grant permissions
5. Verify redirect back to app
6. Check connection data displays

---

## 🚀 Deployment to Production

### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add FACEBOOK_APP_ID
vercel env add FACEBOOK_APP_SECRET
vercel env add APP_URL
vercel env add MARKETING_HUB_ENCRYPTION_KEY
# ... etc

# Redeploy with env vars
vercel --prod
```

### Option 2: Firebase Functions

```bash
# Install Firebase CLI
npm i -g firebase-tools

# Login
firebase login

# Deploy functions
firebase deploy --only functions
```

### Option 3: Docker

```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV PORT=5000
CMD ["node", "app.js"]
```

```bash
docker build -t meta-integration .
docker run -p 5000:5000 \
  -e FACEBOOK_APP_ID=your_id \
  -e FACEBOOK_APP_SECRET=your_secret \
  meta-integration
```

### Option 4: Traditional Node.js Server

```bash
# On your server:
git clone your-repo
cd your-repo
npm install
npm start

# Use PM2 for persistence
npm i -g pm2
pm2 start app.js --name "meta-integration"
pm2 startup
pm2 save
```

---

## 🔍 Verification Checklist

### Before Going Live

- [ ] All environment variables set
- [ ] Firestore collections created
- [ ] TTL configured on oauth_state
- [ ] Firebase auth middleware working
- [ ] All 6 endpoints responding
- [ ] OAuth flow tested end-to-end
- [ ] Error handling working
- [ ] Logging working
- [ ] Database writes working
- [ ] Frontend loading correctly

### Post-Deployment

- [ ] Check server logs for errors
- [ ] Test all 6 endpoints with curl
- [ ] Verify database entries created
- [ ] Monitor error rate (should be < 1%)
- [ ] Check response times (should be < 500ms)
- [ ] Verify OAuth redirect works
- [ ] Test on mobile browser
- [ ] Test dark mode display

---

## 📊 Monitoring

### Key Metrics to Track

1. **Error Rate**
   - Target: < 1%
   - Check: `/api/meta/` endpoint errors
   - Alert: If > 5%

2. **Response Time**
   - Target: < 500ms
   - Check: Database query time
   - Alert: If > 2s

3. **OAuth Success Rate**
   - Target: > 95%
   - Check: Successful authentications
   - Alert: If < 90%

4. **Database Size**
   - Monitor: `meta_connections` collection growth
   - Action: Archive old oauth_state documents

### Logs to Monitor

```bash
# View logs in real-time
tail -f logs/meta-integration.log

# Check for errors
grep "error" logs/meta-integration.log

# Monitor specific endpoint
grep "/api/meta" logs/meta-integration.log
```

---

## 🐛 Troubleshooting

### Issue: "Cannot find module 'firebase-admin'"
**Solution**: Run `npm install firebase-admin`

### Issue: "FACEBOOK_APP_ID is undefined"
**Solution**: Add to `.env` file and restart server

### Issue: OAuth returns "Invalid state"
**Solution**: 
- Check Firestore connectivity
- Verify `meta_oauth_state` collection exists
- Check TTL is configured

### Issue: "401 Unauthorized" on endpoints
**Solution**:
- Verify auth middleware is installed
- Check Authorization header format: `Bearer TOKEN`
- Test with valid Firebase token

### Issue: "Token is not a valid JWT"
**Solution**:
- Verify Firebase project ID matches
- Check Firebase credentials are correct
- Regenerate service account key

### Issue: Slow responses (> 2 seconds)
**Solution**:
- Check database indexes
- Monitor CPU/memory usage
- Consider caching responses

---

## 📱 Testing on Different Platforms

### Desktop Browser
- Chrome, Firefox, Safari
- Test OAuth redirect
- Test all buttons
- Check responsive design

### Mobile Browser
- iPhone Safari
- Android Chrome
- Test touch interactions
- Verify layout scaling

### Dark Mode
- Toggle dark mode
- Verify colors match
- Check text contrast
- Test on all sections

---

## 🎯 Final Verification

### Before Meta App Review

1. **Record Screen Capture**
   - [ ] Show empty state
   - [ ] Click "Connect Meta"
   - [ ] Complete OAuth
   - [ ] Show connected state
   - [ ] Test Refresh button
   - [ ] Test Disconnect button
   - **Total time**: < 3 minutes

2. **Prepare Documentation**
   - [ ] Document permissions used
   - [ ] Explain why each permission
   - [ ] List data being collected
   - [ ] Explain data storage

3. **Test Error Scenarios**
   - [ ] Expired token
   - [ ] Missing permissions
   - [ ] Network error
   - [ ] Invalid token

4. **Final Code Review**
   - [ ] No console errors
   - [ ] No sensitive data logged
   - [ ] Proper error messages
   - [ ] No hardcoded values

---

## ✅ Deployment Complete

### After Deployment

1. **Monitor First 24 Hours**
   - Watch error logs
   - Track performance
   - Monitor database growth

2. **Gather User Feedback**
   - Test with team members
   - Collect bug reports
   - Note improvement suggestions

3. **Document Issues**
   - Create GitHub issues
   - Track resolution
   - Update troubleshooting guide

4. **Plan Phase 2**
   - Instagram insights
   - Meta Ads data
   - Analytics dashboard

---

## 📞 Support

### If Something Goes Wrong

1. Check logs: `tail -f logs/meta-integration.log`
2. Check error traceback
3. Reference `META_BACKEND_IMPLEMENTATION.md` → Troubleshooting
4. Check `META_BACKEND_SETUP.md` → Debugging Tips
5. Contact support with error details

---

## 🎉 Success!

Once deployed and tested:

- ✅ Backend operational
- ✅ OAuth working
- ✅ Database storing data
- ✅ Frontend displaying info
- ✅ Ready for users
- ✅ Ready for Meta App Review

---

**Estimated Time**: ~30 minutes for deployment  
**Estimated Time**: ~1 hour for testing  
**Total Time to Production**: ~2-3 hours

**Ready to deploy?** Follow the step-by-step guide above!

---

**Last Updated**: July 10, 2026  
**Version**: 1.0.0
