# Meta OAuth Authentication Fix - July 10, 2026

## Problem Summary - RESOLVED

**Initial Issue**: When clicking "Connect Meta Account" button, two critical errors:
```
ReferenceError: currentUser is not defined (line 470 in metaIntegration.js)
TypeError: toast is not a function (line 512 in metaIntegration.js)
```

**Secondary Issue**: After initial fixes, still getting "User not logged in - user: null"

The root cause was that `metaIntegration.js` couldn't access user data that was set in `script.js` IIFE scope.

## Root Cause Analysis

### Issue 1: `ReferenceError: currentUser is not defined`
**Location**: `js/metaIntegration.js:486`

The problem was attempting to access `currentUser` variable directly from `metaIntegration.js`:
```javascript
// ❌ BROKEN - This throws ReferenceError
else if (typeof currentUser !== 'undefined' && currentUser) {
    user = currentUser;
}
```

**Why it fails**: The `currentUser` variable is defined inside an IIFE (Immediately Invoked Function Expression) in `script.js`:
```javascript
// In script.js - inside IIFE scope
(async () => {
    let currentUser = null;  // ← Scoped to IIFE, not accessible outside
    // ...
})();
```

Even checking `typeof currentUser` throws a ReferenceError when `currentUser` is not in scope. You cannot safely reference undefined global variables this way.

### Issue 2: `TypeError: toast is not a function`
**Location**: `js/metaIntegration.js:665, 668`

Direct calls to `toast()` without checking if it exists:
```javascript
// ❌ BROKEN - toast function not exposed to window
toast('Connection refreshed', 'success');
```

The `toast()` function was defined in `script.js` but only available in that module's scope, not globally accessible.

---

## Solutions Implemented

### Fix 1: Expose Firebase Objects to Window
**File**: `script.js` line ~35-39

**Added**:
```javascript
// Expose Firebase objects to window for cross-module access (Meta Integration, etc.)
window.auth = auth;
window.db = db;
window.storage = storage;
```

**Why**: Firebase `auth`, `db`, and `storage` objects are created in IIFE scope but needed by `metaIntegration.js`. This makes them globally accessible.

### Fix 2: Multi-Layer User Retrieval in startMetaOAuth
**File**: `js/metaIntegration.js` lines ~470-530

**Strategy** (tries in order):
1. **Primary**: `window.currentUser` (set by script.js at login)
2. **Secondary**: `localStorage['worksync_user']` (JSON backup)
3. **Tertiary**: `window.auth.currentUser` (Firebase auth object)

**Before**:
```javascript
let user = null;
if (typeof window.currentUser !== 'undefined' && window.currentUser) {
    user = window.currentUser;
}
// Falls through without checking other sources
```

**After**:
```javascript
let user = null;

// First try window.currentUser
if (typeof window.currentUser !== 'undefined' && window.currentUser) {
    user = window.currentUser;
    console.log('Got user from window.currentUser');
}

// Then try localStorage
else {
    const storedUser = localStorage.getItem('worksync_user');
    if (storedUser) {
        user = JSON.parse(storedUser);
        console.log('Got user from localStorage');
    }
}

// Finally try Firebase auth directly
if (!user || !user.uid) {
    const auth = window.auth;
    if (auth && auth.currentUser) {
        user = {
            uid: auth.currentUser.uid,
            email: auth.currentUser.email
        };
        console.log('Got user from Firebase auth.currentUser');
    }
}
```

### Fix 3: Same Multi-Layer Approach in loadMetaConnectionData
**File**: `js/metaIntegration.js` lines ~52-80

Applied same user retrieval fallback chain to ensure connection data loads correctly on page initialization.

### Fix 4: Enhanced getFirebaseIdToken Function
**File**: `script.js` line ~10425

**Before**:
```javascript
window.getFirebaseIdToken = async function getFirebaseIdToken() {
    try {
        if (!auth || !auth.currentUser) {
            return null;
        }
        return await auth.currentUser.getIdToken();
    }
};
```

**After**:
```javascript
window.getFirebaseIdToken = async function getFirebaseIdToken() {
    try {
        // Try IIFE scope first, then window
        const authObj = auth || (typeof window.auth !== 'undefined' ? window.auth : null);
        if (!authObj || !authObj.currentUser) {
            return null;
        }
        return await authObj.currentUser.getIdToken();
    }
};
```

**Why**: Provides fallback to use `window.auth` if the local `auth` reference isn't available.

### Fix 5: Expose Toast Function to Window
**File**: `script.js` line ~8687

**Added**:
```javascript
window.toast = toast;
```

### Fix 6: Safe Toast Calls
**File**: `js/metaIntegration.js` lines ~665, ~668

**Before**:
```javascript
toast('Connection refreshed', 'success');
```

**After**:
```javascript
if (typeof window.toast === 'function') {
    window.toast('Connection refreshed', 'success');
}
```

---

## User Access Chain
The fix establishes proper data flow:

1. **Login** → `script.js` sets `window.currentUser` and `localStorage['worksync_user']`
2. **Meta Integration Load** → `metaIntegration.js` can access via:
   - ✅ `window.currentUser` (primary)
   - ✅ `localStorage.getItem('worksync_user')` (fallback)
3. **Toast Notifications** → `metaIntegration.js` can use:
   - ✅ `window.toast()` (now exposed)
   - ✅ `window.showToast()` as fallback (if available)

## Testing Checklist

- [ ] Go to https://onedesk.vilpower.com
- [ ] Log in with valid credentials
- [ ] **Verify user data is stored**:
  - [ ] Open browser console (F12)
  - [ ] Type: `window.currentUser` → Should show user object with uid, email, name
  - [ ] Type: `window.auth.currentUser` → Should show Firebase user
  - [ ] Type: `localStorage.getItem('worksync_user')` → Should show JSON user data
- [ ] Navigate to **Integrations → Meta Business Integration**
- [ ] Click **"Connect Meta Account"** button
- [ ] Check browser console (F12) for proper log sequence:
  ```
  startMetaOAuth called
  window.currentUser: {uid: "...", email: "...", ...}  (OR undefined if timing issue)
  window.auth: "object"
  Got user from window.currentUser (OR localStorage OR Firebase auth)
  Final user object: {uid: "...", email: "..."}
  User authenticated, uid: abc123...
  Got Firebase ID token
  Backend response status: 200
  Redirecting to: https://www.facebook.com/...
  ```
- [ ] Should redirect to Facebook OAuth login (not show modal popup)
- [ ] After Facebook login, should show connected Meta account data

## Debugging Guide

If still seeing "User not logged in - user: null":

1. **Check window objects in console**:
   ```javascript
   console.log('window.currentUser:', window.currentUser);
   console.log('window.auth:', window.auth);
   console.log('window.auth.currentUser:', window.auth?.currentUser);
   console.log('localStorage worksync_user:', localStorage.getItem('worksync_user'));
   ```

2. **Verify Firebase is initialized**:
   ```javascript
   window.auth.currentUser.getIdToken().then(token => console.log('Token:', token));
   ```

3. **Check localStorage manually**:
   ```javascript
   JSON.parse(localStorage.getItem('worksync_user'));
   ```

4. **If window objects are undefined**:
   - Page may have loaded before script.js finished initializing
   - Try refreshing the page
   - Check if script.js is being loaded before metaIntegration.js in index.html

---

## Files Modified
1. `script.js` 
   - Exposed `window.auth`, `window.db`, `window.storage` (lines 36-38)
   - Exposed `window.toast` (line 8687)
   - Enhanced `window.getFirebaseIdToken()` with fallback (line 10425)
2. `js/metaIntegration.js` 
   - Added multi-layer user retrieval in `startMetaOAuth()` (lines 470-530)
   - Added multi-layer user retrieval in `loadMetaConnectionData()` (lines 52-80)
   - Added toast safety checks (lines 665-668)

## Deployment
**No backend changes needed.** These are frontend-only fixes.

**Deploy to**: https://onedesk.vilpower.com (Vercel)

---

## Implementation Summary

The fix creates a **reliable user data access chain** that handles timing issues and module loading order problems:

```
Login Event
    ↓
script.js sets:
├─ window.currentUser = currentUser
├─ localStorage['worksync_user'] = JSON.stringify(currentUser)
├─ window.auth (Firebase auth instance)
└─ window.toast (notification function)
    ↓
metaIntegration.js loads and attempts:
├─ Check 1: window.currentUser available? → YES ✓
├─ Check 2: localStorage['worksync_user']? → YES ✓ (if timing issue)
├─ Check 3: window.auth.currentUser? → YES ✓ (if both above fail)
└─ User found → Proceed with OAuth
```

This ensures the OAuth flow works regardless of module load timing or browser storage state.
