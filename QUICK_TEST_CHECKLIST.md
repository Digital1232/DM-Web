# Quick Test Checklist - Meta OAuth User Fix

**Time Required**: ~5 minutes  
**Goal**: Verify that Meta OAuth authentication is working after fixes

---

## Pre-Test Setup

- [ ] Go to https://onedesk.vilpower.com
- [ ] Open DevTools: Press **F12**
- [ ] Click on **Console** tab
- [ ] Keep console visible during entire test

---

## Step 1: Login & Verify User Data (1 minute)

### 1.1 Log In
- [ ] Enter your username/email
- [ ] Enter your password
- [ ] Click "Sign In"
- [ ] Wait for page to fully load (status should show "SYSTEM ONLINE")

### 1.2 Check User Data in Console
Run these commands one by one in the console:

```javascript
window.currentUser
```
✅ Should show object with: `{uid: "...", email: "...", name: "...", ...}`  
❌ If shows: `undefined` → Problem with window.currentUser exposure

```javascript
window.auth.currentUser
```
✅ Should show Firebase user with email  
❌ If shows: `undefined` → Problem with window.auth exposure

```javascript
JSON.parse(localStorage.getItem('worksync_user'))
```
✅ Should show user object  
❌ If shows: `null` → localStorage not being set

---

## Step 2: Navigate to Meta Integration (1 minute)

### 2.1 Open Integration View
- [ ] Click **"Integrations"** in the left sidebar navigation
- [ ] Look for **"Meta Business Integration"** option
- [ ] Click on it

### 2.2 Wait for Panel Load
- [ ] Panel should load on the right side
- [ ] Should show either:
  - [ ] "Connect Meta Account" button (if not connected yet) ✅
  - [ ] Or Meta account details (if already connected) ✅
- [ ] No error messages ✅

---

## Step 3: Test OAuth Button (2 minutes)

### 3.1 Click Connect Button
- [ ] Click the blue **"Connect Meta Account"** button
- [ ] DO NOT CLOSE CONSOLE - watch for messages

### 3.2 Monitor Console Output
Watch for these messages in sequence (copy from console):

**Expected Console Messages** ✅
```
startMetaOAuth called
window.currentUser: {uid: "abc123...", email: "user@company.com", ...}
window.auth: object
Got user from window.currentUser
Final user object: {uid: "abc123...", email: "..."}
User authenticated, uid: abc123...
Got Firebase ID token
Backend response status: 200
Redirecting to: https://www.facebook.com/...
```

**If you see different messages**, note them:

Alternative (localStorage fallback - also OK) ✅
```
Got user from localStorage
```

Alternative (Firebase auth fallback - also OK) ✅
```
Got user from Firebase auth.currentUser
```

**Error Messages** ❌ (Problem - don't see these)
```
ReferenceError: currentUser is not defined
TypeError: toast is not a function
User not logged in - user: null
```

### 3.3 Expected Redirect
- [ ] Page redirects to Facebook login
- [ ] You see: "Facebook Login" page
- [ ] OR you see: Facebook permission request (if already logged into Facebook)

---

## Step 4: Complete Facebook OAuth (1 minute)

### 4.1 Facebook Login (if needed)
- [ ] Log in with your Facebook account (if not already logged in)

### 4.2 Grant Permissions
- [ ] Review permissions requested by One Desk
- [ ] Click "Continue as [Your Name]" or "Allow"

### 4.3 Return to One Desk
- [ ] Page should return to One Desk
- [ ] Should show **"Meta Account Connected"** status
- [ ] Should display:
  - [ ] Profile picture
  - [ ] Instagram account name
  - [ ] Account ID
  - [ ] Account type
  - [ ] Followers count
  - [ ] Sync status

---

## Verification Summary

### ✅ Test Passed If:
- [ ] Logged in successfully
- [ ] `window.currentUser` shows user object in console
- [ ] `window.auth` is available in console
- [ ] Clicked "Connect Meta Account" button
- [ ] Console showed user retrieval success message
- [ ] Redirected to Facebook login/permissions
- [ ] Completed Facebook OAuth flow
- [ ] Returned to One Desk
- [ ] Meta account data displays

### ❌ Test Failed If:
- [ ] Console shows ReferenceError about currentUser
- [ ] Console shows TypeError about toast
- [ ] "Please login first" popup appears
- [ ] No redirect to Facebook
- [ ] Error in console about auth or user data
- [ ] localStorage shows null for worksync_user

---

## Troubleshooting

### Issue: "Please login first" popup

**Check 1**: Clear browser cache and reload
```
1. Press Ctrl+Shift+Delete (Cmd+Shift+Delete on Mac)
2. Clear "All time"
3. Reload https://onedesk.vilpower.com
4. Log in again
5. Try again
```

**Check 2**: Verify user data in console
```javascript
window.currentUser  // Should NOT be null
window.auth.currentUser  // Should NOT be null
localStorage.getItem('worksync_user')  // Should NOT be null
```

**Check 3**: Try Force Reload
```
Press Ctrl+F5 (or Cmd+Shift+R on Mac)
```

### Issue: ReferenceError about currentUser

This should NOT happen anymore - indicates old code.
```
1. Hard refresh: Ctrl+F5
2. Clear cache: Ctrl+Shift+Delete → All time → Clear
3. Reload page
4. Try again
```

### Issue: TypeError about toast

This should NOT happen anymore - indicates old code.
```
Same as above - hard refresh and clear cache
```

### Issue: Page stuck redirecting

```javascript
// Stop redirect and debug
window.location  // Note current URL
localStorage.getItem('worksync_user')  // Should have user data
```

---

## Next Steps After Successful Test

1. **Note Success**: Save the meta account details for reference
2. **Test Sync**: Click "Sync Now" to update latest data
3. **Test Disconnect**: Try disconnecting (button should exist) 
4. **Test Reconnect**: Try connecting again

---

## Sharing Results

If reporting this, include:
- [ ] Console messages (copy/paste from console)
- [ ] Current URL (should be facebook.com during OAuth)
- [ ] Browser and OS (Chrome on Windows, etc.)
- [ ] Steps taken before error

---

## Support

If test fails:
1. Follow troubleshooting steps above
2. Try different browser (Chrome, Firefox, Safari)
3. Try incognito/private browsing
4. Check that you have permission to connect Meta accounts
5. Contact administrator if issues persist

---

**Test Date**: ________________  
**Tested By**: ________________  
**Result**: ✅ PASS / ❌ FAIL  
**Notes**: ________________

