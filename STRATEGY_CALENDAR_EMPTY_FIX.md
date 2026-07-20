# Strategy Calendar Empty - Troubleshooting & Fix

## Issue
Strategy Calendar is showing an empty calendar grid with:
- ✓ Calendar structure present (dates, grid)
- ✗ NO events/tasks displaying
- ✗ NO data visible on any dates

## Root Cause Analysis

### Possible Causes (in order of likelihood):

1. **Firebase Database is Empty**
   - No strategy events exist in `worksync/strategy_events`
   - This is the MOST LIKELY cause

2. **Firebase Listener Not Connected**
   - Network issue preventing data load
   - Firebase not initialized properly
   - User permissions don't allow reading events

3. **Data Loading Delayed**
   - Calendar rendered before Firebase data arrives
   - Listener set up but data not yet loaded

4. **Client Filter Hiding All Events**
   - Current filter accidentally set to show no events
   - Though this would show empty list, not empty calendar

## Diagnostic Steps

### Step 1: Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. **Look for "=== STRATEGY CALENDAR LOADED ===" message**

**If you see it:**
```
=== STRATEGY CALENDAR LOADED ===
Total events: 0
Events with dates: 0
Events with clients: 0
```

**This confirms**: Firebase is connected but NO events exist in database

**If you DON'T see it:**
- Firebase listener might not be connecting
- Check for network errors in Console
- Check for permission errors

### Step 2: Check Firebase Console
1. Go to: https://console.firebase.google.com
2. Select your project (VilPower)
3. Navigate to: Realtime Database → `worksync/strategy_events`

**Expected**:
- Should see a list of event documents
- Each document has: `date`, `title`, `client` fields

**If empty**:
- No strategy events created yet
- Need to create test data or check if data was deleted

### Step 3: Verify Firebase Connection
```javascript
// In browser console:
console.log('Firebase DB:', db);
console.log('Current user:', currentUser);
console.log('StrategyEvents object:', strategyEvents);
```

**Expected output**:
- `db` should be an object (Firebase reference)
- `currentUser` should have an email
- `strategyEvents` should be an object

### Step 4: Force Data Reload
```javascript
// In browser console:
// Manually trigger reload from Firebase
get(ref(db, 'worksync/strategy_events')).then(snap => {
    console.log('Firebase snapshot:', snap.val());
});
```

## Solutions

### Solution 1: Create Test Data (Temporary Fix)
If Firebase is connected but has no data:

```javascript
// Run in browser console to add test events:
const testEvents = {
    'event-1': {
        id: 'event-1',
        title: 'Test Campaign',
        date: '2026-07-20',  // Today
        client: 'Ashmithasree',
        status: 'To Do',
        desc: 'Test event',
        owner: currentUser?.email || ''
    },
    'event-2': {
        id: 'event-2',
        title: 'Design Work',
        date: '2026-07-21',
        client: 'NTT',
        status: 'In Progress',
        desc: 'Design task',
        owner: currentUser?.email || ''
    }
};

// Add to Firebase
testEvents.forEach((ev, key) => {
    set(ref(db, `worksync/strategy_events/${key}`), ev);
});

console.log('Test data added. Reload calendar...');
renderStrategyCalendar();
```

### Solution 2: Verify Data Structure
If data exists but isn't showing, check format:

**Correct Format**:
```javascript
{
    'event-abc123': {
        id: 'event-abc123',
        title: 'Campaign Name',
        date: '2026-07-20',              // REQUIRED - YYYY-MM-DD format
        client: 'ClientName',             // Optional
        status: 'To Do',                  // Optional
        desc: 'Description',              // Optional
        owner: 'user@example.com',        // Optional
        platform: 'Instagram',            // Optional
        jiraTaskId: 'JULY-123'            // Optional
    }
}
```

**Check if your data matches this structure**:
```javascript
// In console
Object.entries(strategyEvents).slice(0, 1).forEach(([key, ev]) => {
    console.log('Sample event:', { key, ...ev });
    console.log('Has date?', !!ev.date);
    console.log('Date format:', ev.date);
    console.log('Valid format?', /^\d{4}-\d{2}-\d{2}$/.test(ev.date));
});
```

### Solution 3: Check Firebase Permissions
The user might not have read access to strategy_events.

**To verify**:
```javascript
// Try to read directly
try {
    get(ref(db, 'worksync/strategy_events')).then(snap => {
        if (snap.exists()) {
            console.log('✓ Has permission to read');
            console.log('Events:', snap.val());
        } else {
            console.log('✗ No data OR no permission');
        }
    }).catch(err => {
        console.error('✗ Permission denied:', err.message);
    });
} catch (err) {
    console.error('Error:', err);
}
```

### Solution 4: Check for Network Issues
```javascript
// In console
navigator.onLine  // Should be true
// Network tab in DevTools: Check firebase requests for 403/401 errors
```

## Complete Diagnostic Command

Run this in browser console for full diagnosis:

```javascript
console.group('🔍 STRATEGY CALENDAR COMPLETE DIAGNOSTIC');

console.log('=== FIREBASE CONNECTION ===');
console.log('DB connected:', !!db);
console.log('Current user:', currentUser?.email || 'Not logged in');

console.log('=== STRATEGY EVENTS DATA ===');
console.log('Total events loaded:', Object.keys(strategyEvents).length);
console.log('Events object:', strategyEvents);

console.log('=== EVENT DETAILS ===');
const sampleEvents = Object.entries(strategyEvents).slice(0, 3);
sampleEvents.forEach(([id, ev]) => {
    console.log(`Event ${id}:`, {
        title: ev.title,
        date: ev.date,
        dateValid: /^\d{4}-\d{2}-\d{2}$/.test(ev.date),
        client: ev.client,
        status: ev.status
    });
});

console.log('=== RENDER STATE ===');
console.log('Current filter:', activeStrategyClientFilter);
console.log('Calendar month:', strategyCurrentDate.toLocaleDateString());
console.log('Grid element exists:', !!document.getElementById('strategy-calendar-grid'));

console.log('=== BROWSER STATE ===');
console.log('Online:', navigator.onLine);
console.log('Current time:', new Date().toLocaleString());

console.groupEnd();
```

## Quick Fixes to Try

### Quick Fix 1: Hard Refresh
- Windows: `Ctrl+Shift+R`
- Mac: `Cmd+Shift+R`
- This clears browser cache that might have old/empty data

### Quick Fix 2: Clear LocalStorage
```javascript
localStorage.clear();
location.reload();
```

### Quick Fix 3: Reset Filter
If somehow filter is wrong:
```javascript
activeStrategyClientFilter = 'All';
renderStrategyCalendar();
```

### Quick Fix 4: Check Network Tab
1. Open DevTools (F12)
2. Go to Network tab
3. Filter for "firebase" or "strategy"
4. Look for 200 status (success)
5. Check if data is being downloaded

## Data Creation Workflow

If you need to add real strategy events:

1. **Via UI** (Recommended):
   - Go to Strategy Calendar
   - Click any date cell
   - Click "+ Add Campaign/Event" button
   - Fill in details:
     - Title (required)
     - Client (optional)
     - Date (required)
     - Status (optional)
   - Click Save

2. **Via Firebase Console**:
   - Go to Firebase Console
   - Navigate to `worksync/strategy_events`
   - Click "Add child" or "+" button
   - Create new document with structure above

3. **Via Console (Development only)**:
   ```javascript
   // Get next available ID
   const newId = 'event-' + Date.now();
   
   // Create event
   const newEvent = {
       id: newId,
       title: 'New Campaign',
       date: '2026-07-22',  // YYYY-MM-DD
       client: 'TestClient',
       status: 'To Do',
       owner: currentUser?.email,
       desc: 'Test'
   };
   
   // Save to Firebase
   set(ref(db, `worksync/strategy_events/${newId}`), newEvent)
       .then(() => {
           console.log('Event created');
           renderStrategyCalendar();
       });
   ```

## Expected Resolution

Once data is present in Firebase:

1. ✓ Console shows "Total events: [number]"
2. ✓ Events appear on calendar dates
3. ✓ Client names display below titles
4. ✓ Filtering works correctly

## Prevention

To prevent empty calendar in future:

1. **Add placeholder events** during setup
2. **Monitor Firebase** to ensure data persists
3. **Test filter** that it doesn't hide all events
4. **Check permissions** regularly

## Emergency Fallback

If Firebase is completely down, you could:

1. Add fallback test data to browser
2. Cache last known state in localStorage
3. Show "Data loading..." message while connecting

## Additional Resources

- Firebase Console: https://console.firebase.google.com
- Browser DevTools: Press F12
- Network Debugging: DevTools → Network tab
- Console Commands: Type commands in DevTools Console

---

**Summary**: Calendar is empty because Firebase has no strategy events OR data isn't loading. Run diagnostic commands above to determine which, then apply appropriate solution.
