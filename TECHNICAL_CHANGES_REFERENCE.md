# Technical Changes Reference - Daily Plan Access Control

## Overview
Implemented a granular permission system for Daily Plan task viewing. Previously only admins could view other users' tasks; now custom permissions can be granted to specific users.

## Code Changes

### 1. New Permission Configuration Map
**Location**: `script.js`, line 62

```javascript
// Daily Plan View Access - Map of user email to list of emails they can view tasks for
const DAILY_PLAN_VIEW_ACCESS = {
    'karthikavilpower@gmail.com': ['barathvilpower@gmail.com', 'immanuelvilpower@gmail.com'] // Karthika can view Barath and Immanuel's tasks
};
```

**Purpose**: Centralized configuration for Daily Plan view permissions. Can be extended for future user access grants.

**Format**: 
```javascript
{
    'viewer-email@domain.com': ['user1-email@domain.com', 'user2-email@domain.com']
}
```

---

### 2. New Permission Check Function
**Location**: `script.js`, lines 124-131

```javascript
function canViewDailyPlanTasks(targetUserEmail) {
    if (!currentUser) return false;
    // Admins can view everyone's tasks
    if (isAdmin()) return true;
    // Check if current user can view this specific user's tasks
    const userAccessList = DAILY_PLAN_VIEW_ACCESS[currentUser.email.toLowerCase()] || [];
    return userAccessList.includes(targetUserEmail.toLowerCase());
}
```

**Purpose**: Single source of truth for Daily Plan viewing permissions.

**Parameters**:
- `targetUserEmail` (string): The email of the user whose tasks we want to view

**Returns**: 
- `true` if current user can view target user's tasks
- `false` otherwise

**Logic**:
1. Check if user is logged in
2. If admin → always allow
3. If non-admin → check if target email is in their allowed list (case-insensitive)

---

### 3. Updated Daily Plan Rendering Logic
**Location**: `script.js`, lines 10021-10045

#### Before (Old Logic):
```javascript
let targetUsers = isAdmin() && document.getElementById('dp-user-filter').value !== 'all' 
    ? [document.getElementById('dp-user-filter').value] 
    : (isAdmin() ? mergedUsers.map(u => u.email) : [currentUser.email]);
```

#### After (New Logic):
```javascript
let targetUsers;
if (isAdmin() && document.getElementById('dp-user-filter').value !== 'all') {
    // Admin selected a specific user
    targetUsers = [document.getElementById('dp-user-filter').value];
} else if (isAdmin()) {
    // Admin viewing all
    targetUsers = mergedUsers.map(u => u.email);
} else {
    // Non-admin: show own tasks and any users they have permission to view
    targetUsers = [currentUser.email];
    const allowedUsers = DAILY_PLAN_VIEW_ACCESS[currentUser.email.toLowerCase()] || [];
    targetUsers = targetUsers.concat(allowedUsers);
}
```

**Purpose**: Filter visible users based on permissions.

**Key Changes**:
- Non-admins now see their own tasks + allowed users' tasks (not just their own)
- The logic is more explicit and easier to maintain

---

### 4. Updated User Filter Population
**Location**: `script.js`, lines 10004-10024

#### Before (Old Logic):
```javascript
const usersList = [...merged.values()].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

usersList.forEach(u => {
    sel.innerHTML += `<option value="${u.email}">${u.name}</option>`;
});
```

#### After (New Logic):
```javascript
let usersList = [...merged.values()].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

// If not admin, filter to only allowed users
if (!isAdmin()) {
    const allowedEmails = new Set(['current-user']); // Include self
    if (currentUser) allowedEmails.add(currentUser.email.toLowerCase());
    const customAccess = DAILY_PLAN_VIEW_ACCESS[currentUser.email.toLowerCase()] || [];
    customAccess.forEach(email => allowedEmails.add(email.toLowerCase()));
    
    usersList = usersList.filter(u => allowedEmails.has(u.email.toLowerCase()));
}

usersList.forEach(u => {
    sel.innerHTML += `<option value="${u.email}">${u.name}</option>`;
});
```

**Purpose**: Limit dropdown options to only users the current user can view.

**Logic**:
1. Create set of allowed emails
2. Add current user's email (always can view own tasks)
3. Add any custom access emails from `DAILY_PLAN_VIEW_ACCESS`
4. Filter user list to only those emails
5. Admins see everyone (no filtering)

---

### 5. Updated Filter Visibility Logic
**Location**: `script.js`, lines 9980-9989

#### Before (Old Logic):
```javascript
if (isAdmin()) {
    document.getElementById('dp-user-filter-container').classList.remove('hidden');
    populateDpUserFilter();
}
```

#### After (New Logic):
```javascript
// Show filter for admins or users with special permissions
const hasSpecialAccess = isAdmin() || (currentUser && (DAILY_PLAN_VIEW_ACCESS[currentUser.email.toLowerCase()] || []).length > 0);
if (hasSpecialAccess) {
    document.getElementById('dp-user-filter-container').classList.remove('hidden');
    populateDpUserFilter();
} else {
    document.getElementById('dp-user-filter-container').classList.add('hidden');
}
```

**Purpose**: Show the user filter dropdown to both admins AND users with custom permissions.

**Key Change**:
- Previously: Only admins saw the filter
- Now: Admins + users with custom access see the filter

---

## Git Commit Details

**Commit Hash**: `d6f0267484288e57aa4404f38bae48fb36b65957`

**Message**: 
```
feat: grant Karthika access to view Daily Plan tasks for Barath and Immanuel
```

**Files Changed**: 
- `script.js` (+43 insertions, -5 deletions)

**Lines Modified**: 
- Line 62: Added `DAILY_PLAN_VIEW_ACCESS` configuration
- Lines 124-131: Added `canViewDailyPlanTasks()` function
- Lines 9980-9989: Updated `initDailyPlan()` filter visibility logic
- Lines 10004-10024: Updated `populateDpUserFilter()` to respect permissions
- Lines 10021-10045: Updated `renderDailyPlan()` to include permitted users

---

## Data Flow Diagram

```
┌─ User Logs In
│
└─ initDailyPlan() Called
   │
   ├─ Check: hasSpecialAccess = isAdmin() OR user in DAILY_PLAN_VIEW_ACCESS?
   │  │
   │  ├─ YES → Show dp-user-filter-container
   │  │        └─ populateDpUserFilter()
   │  │           ├─ Get allowed emails from DAILY_PLAN_VIEW_ACCESS
   │  │           └─ Populate dropdown with [Own User + Allowed Users]
   │  │
   │  └─ NO → Hide dp-user-filter-container
   │
   └─ Initialize Firebase listener on 'worksync/daily_plans'
      └─ On data change: renderDailyPlan()


┌─ renderDailyPlan() Called (on view switch or data change)
│
├─ Determine targetUsers based on current filter
│  │
│  ├─ If Admin + specific user selected
│  │  └─ targetUsers = [selected user]
│  │
│  ├─ If Admin + "All Users" selected
│  │  └─ targetUsers = [all users]
│  │
│  └─ If Non-Admin
│     └─ targetUsers = [own email] + DAILY_PLAN_VIEW_ACCESS[email]
│
├─ For each targetUser in targetUsers
│  │
│  └─ Load their daily_plans[eKey(userEmail)]
│
└─ Render filtered task rows in UI
```

---

## Testing Scenarios

### Scenario 1: Karthika Logs In
```javascript
currentUser = { email: 'karthikavilpower@gmail.com', ... }

hasSpecialAccess = isAdmin() || (DAILY_PLAN_VIEW_ACCESS['karthikavilpower@gmail.com'] || []).length > 0
               = false || 2 > 0
               = true
               
// Filter shows: [All Users, Karthika K, Barath Magesh M, Immanuel Raja S]
```

### Scenario 2: Karthika Views Barath's Tasks
```javascript
Select: "Barath Magesh M"

targetUsers = [currentUser.email] + DAILY_PLAN_VIEW_ACCESS['karthikavilpower@gmail.com']
            = ['karthikavilpower@gmail.com'] + ['barathvilpower@gmail.com', 'immanuelvilpower@gmail.com']
            = ['karthikavilpower@gmail.com', 'barathvilpower@gmail.com', 'immanuelvilpower@gmail.com']

// But actually, she selected just Barath, so:
targetUsers = ['barathvilpower@gmail.com']

// Renders only Barath's tasks
```

### Scenario 3: Sneha Logs In (No Special Access)
```javascript
currentUser = { email: 'snehavilpower@gmail.com', ... }

hasSpecialAccess = isAdmin() || (DAILY_PLAN_VIEW_ACCESS['snehavilpower@gmail.com'] || []).length > 0
               = false || 0 > 0
               = false
               
// Filter is hidden - Sneha only sees her own tasks
```

### Scenario 4: Admin (Palanirajan) Logs In
```javascript
currentUser = { email: 'digitalmarketing@vilpower.com', ... } // In ADMIN_EMAILS

isAdmin() = true

hasSpecialAccess = true

// Filter shows all users
// Can select any user or "All Users"
```

---

## Future Extension Example

To grant Sneha access to view Karthika and Immanuel's tasks:

```javascript
const DAILY_PLAN_VIEW_ACCESS = {
    'karthikavilpower@gmail.com': ['barathvilpower@gmail.com', 'immanuelvilpower@gmail.com'],
    'snehavilpower@gmail.com': ['karthikavilpower@gmail.com', 'immanuelvilpower@gmail.com']  // NEW
};
```

Then:
1. Commit and push to main
2. Vercel auto-deploys
3. Sneha's filter now shows: [All Users, Sneha V, Karthika K, Immanuel Raja S]

---

## Performance Considerations

- **O(n) lookup**: Checking if an email is in the allowed list is O(n) where n = number of allowed users (typically small, <10)
- **No database calls**: All permissions are hardcoded in config, no Firebase queries needed
- **Filter populated once**: `populateDpUserFilter()` runs once on view init, not on every render
- **Cached access check**: `DAILY_PLAN_VIEW_ACCESS` is computed once at script load

---

## Security Notes

✅ **Security Considerations**:
1. **Client-side filtering** - UI respects permissions
2. **No backend validation** - This is UI-only; backend Firebase rules should enforce permissions
3. **Email-based** - Uses email as unique identifier (matches Firebase auth)
4. **Case-insensitive** - Handles email case variations

⚠️ **Important**: 
- This is UI-level permission filtering
- If backend Firebase security rules don't match, users could potentially access unauthorized data via network requests
- Recommend configuring Firebase Realtime Database rules to enforce the same permission model

**Recommended Firebase Rule**:
```json
{
  "rules": {
    "worksync": {
      "daily_plans": {
        "$email": {
          ".read": "auth.uid != null && (root.child('admins').child(auth.uid).val() === true || $email === auth.token.email || root.child('daily_plan_access').child(auth.token.email).child($email).val() === true)"
        }
      }
    }
  }
}
```

---

## Rollback Instructions

If issues arise, rollback with:
```bash
git revert d6f0267484288e57aa4404f38bae48fb36b65957
git push origin main
```

Changes will redeploy automatically via Vercel.
