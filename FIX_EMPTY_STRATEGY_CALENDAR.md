# Fix Empty Strategy Calendar - Step-by-Step Guide

## Status
**Calendar is showing**: ✓ Grid structure, ✓ Dates visible  
**Calendar is missing**: ✗ No events/tasks on any dates

## Root Cause
The Firebase database (`worksync/strategy_events`) likely has no data OR the data isn't loading properly.

---

## QUICK FIX (2 minutes)

### Option 1: Create Test Data (Immediate Fix)
1. Open browser DevTools: **F12**
2. Click **Console** tab
3. Paste and run this command:
   ```javascript
   createStrategyTestData()
   ```
4. You should see output like:
   ```
   Creating test strategy events...
   ✓ Created: Test Campaign Launch
   ✓ Created: Design Review
   ✓ Created: Social Media Planning
   ✓ Created: General Event (No Client)
   Test data creation complete. Calendar should update automatically.
   ```
5. **Calendar should now show 4 test events**

### Option 2: Verify Data Exists (Diagnosis)
1. Open browser DevTools: **F12**
2. Click **Console** tab
3. Run this command:
   ```javascript
   debugStrategyCalendar()
   ```
4. Look at the output:
   - If "Total events: 0" → **No data exists, use Option 1**
   - If "Total events: 5+" → **Data exists but not displaying, see Advanced Fixes**

---

## DETAILED TROUBLESHOOTING

### Step 1: Verify Firebase Connection

**Command**:
```javascript
console.log('Firebase:', db ? '✓ Connected' : '✗ Not connected');
console.log('User:', currentUser?.email || '✗ Not logged in');
```

**Expected Result**: Both should show connected/logged in  
**If not**: Refresh page, check login status

---

### Step 2: Check Event Data in Database

**Command**:
```javascript
get(ref(db, 'worksync/strategy_events')).then(snap => {
    if (snap.exists()) {
        console.log('✓ Events found:', snap.val());
    } else {
        console.log('✗ No events in database');
    }
}).catch(err => console.error('Error:', err.message));
```

**Expected Result**:
- If it shows events → Data exists, go to Step 3
- If "✗ No events" → Create test data using Option 1 above

---

### Step 3: Check Data Format

Verify your data matches this format:

```javascript
// CORRECT FORMAT:
{
    'event-id-123': {
        id: 'event-id-123',
        title: 'Event Name',
        date: '2026-07-20',           // ← MUST be YYYY-MM-DD
        client: 'ClientName',          // Optional
        status: 'To Do',               // Optional
        desc: 'Description',           // Optional
        owner: 'user@example.com'      // Optional
    }
}
```

**Check your data**:
```javascript
// Run this to inspect your events
Object.entries(strategyEvents).slice(0, 3).forEach(([id, ev]) => {
    console.log('Event:', id);
    console.log('- Title:', ev.title);
    console.log('- Date:', ev.date, '(format check:', 
        /^\d{4}-\d{2}-\d{2}$/.test(ev.date) ? '✓ OK' : '✗ WRONG');
    console.log('- Client:', ev.client || 'General');
});
```

**If dates are wrong format**:
- They need to be: `YYYY-MM-DD` (e.g., `2026-07-20`)
- If format is different, update all events to correct format

---

### Step 4: Verify Rendering Logic

Test if the calendar can display events:

```javascript
// Manually call render function
console.log('Events available:', Object.keys(strategyEvents).length);
renderStrategyCalendar();
console.log('Render complete, check calendar');
```

**If calendar is still empty**:
- Check browser console for JavaScript errors (red messages)
- Look for errors starting with "Uncaught Error" or "ReferenceError"

---

## ADVANCED FIXES

### Fix 1: Events Exist But Not Showing

**Check if filtering is hiding them**:
```javascript
console.log('Current filter:', activeStrategyClientFilter);
// Should be 'All'
// If not, reset it:
activeStrategyClientFilter = 'All';
renderStrategyCalendar();
```

### Fix 2: Data Loading Delayed

Calendar might render before Firebase loads data. Fix:

```javascript
// Manually trigger reload from Firebase
if (strategyEventsUnsub) strategyEventsUnsub();

strategyEventsUnsub = onValue(ref(db, 'worksync/strategy_events'), (snap) => {
    strategyEvents = snap.val() || {};
    console.log('Data reloaded:', Object.keys(strategyEvents).length, 'events');
    renderStrategyClientTabs();
    renderStrategyCalendar();
    renderStrategySidebar();
});
```

### Fix 3: Browser Cache Issue

Cache might have old/empty data:

1. Press: **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac)
2. Wait for page to reload
3. Check calendar again

### Fix 4: Firebase Permissions Issue

User might not have read access:

```javascript
// Test read permission
get(ref(db, 'worksync/strategy_events'))
    .then(snap => console.log('✓ Read permission OK'))
    .catch(err => console.error('✗ Permission denied:', err.message));
```

**If permission denied**: Contact Firebase admin to add read permissions for user

---

## COMPREHENSIVE DIAGNOSTIC

Run all diagnostics at once:

```javascript
console.group('📊 STRATEGY CALENDAR FULL DIAGNOSTIC');

// 1. Connection
console.log('=== CONNECTION ===');
console.log('Firebase connected:', !!db);
console.log('User logged in:', !!currentUser);
console.log('User email:', currentUser?.email);

// 2. Data
console.log('=== DATA STATUS ===');
const eventCount = Object.keys(strategyEvents).length;
console.log('Total events loaded:', eventCount);
if (eventCount === 0) {
    console.warn('⚠️ NO EVENTS - Try: createStrategyTestData()');
} else {
    console.log('✓ Events found');
}

// 3. Event Details
console.log('=== SAMPLE EVENTS ===');
Object.entries(strategyEvents).slice(0, 2).forEach(([id, ev]) => {
    console.log(`${id}:`, {
        title: ev.title,
        date: ev.date,
        dateValid: /^\d{4}-\d{2}-\d{2}$/.test(ev.date || ''),
        client: ev.client
    });
});

// 4. Render State
console.log('=== RENDER STATE ===');
console.log('Filter:', activeStrategyClientFilter);
console.log('Calendar showing:', strategyCurrentDate.toLocaleDateString());
console.log('Grid element:', !!document.getElementById('strategy-calendar-grid'));

// 5. Browser
console.log('=== BROWSER ===');
console.log('Online:', navigator.onLine);
console.log('Time:', new Date().toLocaleString());

console.groupEnd();
```

---

## SOLUTION SUMMARY

| Issue | Solution | Command |
|-------|----------|---------|
| **No events in database** | Create test data | `createStrategyTestData()` |
| **Events exist but not showing** | Reload rendering | `renderStrategyCalendar()` |
| **Filter hiding everything** | Reset filter | `activeStrategyClientFilter = 'All'; renderStrategyCalendar();` |
| **Data not loading from Firebase** | Reconnect listener | See "Fix 2" above |
| **Browser cache stale** | Hard refresh | Ctrl+Shift+R or Cmd+Shift+R |
| **Permission denied** | Check Firebase rules | Contact admin |

---

## TESTING AFTER FIX

Once you've applied a fix, verify it works:

### Verification Checklist
- [ ] Run `debugStrategyCalendar()` in console
- [ ] Output shows "Total events: [number > 0]"
- [ ] Calendar displays events on dates
- [ ] Events show with title + client name
- [ ] Clicking event opens modal
- [ ] Filtering by client works
- [ ] No console errors (red messages)

---

## CREATING REAL DATA (Not Test Data)

### Via UI (Recommended)
1. Go to Strategy Calendar
2. Click any date cell
3. Click "Add Campaign/Event" button
4. Fill in details:
   - **Title** (required): Event name
   - **Client** (optional): Select from dropdown
   - **Date** (required): Calendar date
   - **Status** (optional): To Do, In Progress, etc.
5. Click Save

### Via Firebase Console
1. Go to https://console.firebase.google.com
2. Select project → Realtime Database
3. Navigate to `worksync` → `strategy_events`
4. Click `+` button to add child
5. Enter data matching the format shown in Step 3 above

---

## CONSOLE COMMANDS QUICK REFERENCE

```javascript
// Check everything
debugStrategyCalendar()

// Create test events
createStrategyTestData()

// Check event count
Object.keys(strategyEvents).length

// Check if events have dates
Object.values(strategyEvents).filter(e => e.date).length

// Re-render calendar
renderStrategyCalendar()

// Reset filter
activeStrategyClientFilter = 'All'; renderStrategyCalendar()

// Check Firebase connection
console.log('Connected:', !!db, 'User:', currentUser?.email)

// Get all clients in events
[...new Set(Object.values(strategyEvents).map(e => e.client || 'General'))]
```

---

## STILL NOT WORKING?

If none of the above fixes work:

1. **Collect diagnostic output**:
   ```javascript
   // Copy everything from this output
   debugStrategyCalendar()
   ```

2. **Include error messages**: Check console for red messages (errors)

3. **Check Firebase Rules**: May need admin to verify permissions

4. **Verify data structure**: Compare your events with the format shown in Step 3

5. **Clear browser cache**: 
   - Windows: Ctrl+Shift+Delete
   - Mac: Cmd+Shift+Delete
   - Then hard refresh: Ctrl+Shift+R or Cmd+Shift+R

---

## FINAL RESOLUTION

✓ **If you followed these steps**, one of these should have worked:
1. Created test data and see events on calendar
2. Found existing data and fixed format/filter issues
3. Identified permission/connection problem for admin

**Expected Result**: Calendar shows events on dates with client names visible

---

**Last Updated**: July 20, 2026  
**Status**: Ready to Deploy  
**Estimated Fix Time**: 2-10 minutes
