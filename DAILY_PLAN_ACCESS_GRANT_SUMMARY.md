# Daily Plan Task Access Grant - Karthika

## Summary
Successfully granted **Karthika K** access to view the Daily Plan task view for **Barath Magesh M** and **Immanuel Raja S**.

## Changes Made

### 1. Added Permission Configuration (`script.js` - Line 62)
Created a new `DAILY_PLAN_VIEW_ACCESS` map that defines which users can view whose Daily Plan tasks:
```javascript
const DAILY_PLAN_VIEW_ACCESS = {
    'karthikavilpower@gmail.com': ['barathvilpower@gmail.com', 'immanuelvilpower@gmail.com']
};
```

### 2. Added Permission Check Function (`script.js` - Line 124)
Created `canViewDailyPlanTasks()` function:
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

### 3. Updated Daily Plan Rendering Logic (`script.js` - Line 10021)
Modified `renderDailyPlan()` to filter tasks based on permissions:
- **Before**: Only admins could view other users' tasks
- **After**: Users with explicit permissions can now view their allowed users' tasks

```javascript
let targetUsers;
if (isAdmin() && document.getElementById('dp-user-filter').value !== 'all') {
    targetUsers = [document.getElementById('dp-user-filter').value];
} else if (isAdmin()) {
    targetUsers = mergedUsers.map(u => u.email);
} else {
    // Non-admin: show own tasks and any users they have permission to view
    targetUsers = [currentUser.email];
    const allowedUsers = DAILY_PLAN_VIEW_ACCESS[currentUser.email.toLowerCase()] || [];
    targetUsers = targetUsers.concat(allowedUsers);
}
```

### 4. Updated User Filter Population (`script.js` - Line 10004)
Modified `populateDpUserFilter()` to:
- Show filter dropdown for users with special permissions (not just admins)
- Limit dropdown options to only allowed users for non-admins

### 5. Updated Filter Visibility Logic (`script.js` - Line 9980)
Modified `initDailyPlan()` to:
- Show the user filter container for both admins AND users with special access permissions
- Previously only showed for admins

## Access Configuration

**User**: Karthika K (`karthikavilpower@gmail.com`)
- **Can View**: Barath's tasks (`barathvilpower@gmail.com`)
- **Can View**: Immanuel's tasks (`immanuelvilpower@gmail.com`)
- **Cannot View**: Other team members' tasks (unless admin)

## Deployment
✅ **Pushed to Production**
- Branch: `main`
- Commit Hash: `d6f0267`
- Deployment: Automatic via Vercel (GitHub integration)

## How to Use (Karthika's Perspective)

1. Log in to WorkSync
2. Navigate to **Daily Plan** view
3. A user filter dropdown will appear (new)
4. Select from:
   - **All Users** → Shows only her tasks and Barath + Immanuel's tasks combined
   - **Karthika K** → Shows only her tasks
   - **Barath Magesh M** → Shows only Barath's tasks
   - **Immanuel Raja S** → Shows only Immanuel's tasks

## Future Extensibility

To add more users or modify access:
1. Edit the `DAILY_PLAN_VIEW_ACCESS` map in `script.js` (line 62)
2. Example to grant access to a 3rd user:
```javascript
const DAILY_PLAN_VIEW_ACCESS = {
    'karthikavilpower@gmail.com': [
        'barathvilpower@gmail.com', 
        'immanuelvilpower@gmail.com',
        'snehavilpower@gmail.com'  // New access
    ]
};
```
3. Commit and push to main branch for automatic deployment

## Testing Checklist
- [x] Karthika can see Daily Plan tasks for Barath
- [x] Karthika can see Daily Plan tasks for Immanuel
- [x] Karthika cannot see other users' tasks (access denied)
- [x] User filter shows only allowed users
- [x] Admins still have access to view all users
- [x] Date filtering works correctly
- [x] Status filtering (All/Carry) works correctly

## Related Files Modified
- `script.js` - Core permission logic and rendering functions

## Commit Message
```
feat: grant Karthika access to view Daily Plan tasks for Barath and Immanuel
```
