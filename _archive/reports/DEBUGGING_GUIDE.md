# Client Delivery Dashboard - Debugging Guide

## Quick Diagnosis

### Step 1: Open Browser Console
Press `F12` → Select **Console** tab

### Step 2: Go to Reports → Client Delivery Dashboard

### Step 3: Check for These Log Messages

Look for messages starting with `[` and containing these keywords:

```
[initReportFilters] Initial fetch
[Firebase Listener] Strategy events updated
[Client Delivery Dashboard] Data Sources
[Client Delivery] Event
[Client Delivery] Final metrics
[Client Delivery] Render complete
```

---

## Diagnosis by Console Output

### Scenario 1: "0 events" in console

```
[initReportFilters] Initial fetch - Strategy events loaded: 0 events
```

**Problem**: No strategy events exist in Firebase database  
**Solution**:
1. Go to **Strategy Calendar** view
2. Create at least one event:
   - Click "Add" button
   - Fill in Event Title
   - Set Videos Count to 5 (test value)
   - Set Posters Count to 3 (test value)
   - Select a Client
   - Select a Date
   - Click "Save Event"
3. Come back to Client Delivery Dashboard
4. Set date range to include the event date
5. Check console again - should now show "1 events"

---

### Scenario 2: Events loaded but counts don't show

```
[initReportFilters] Initial fetch - Strategy events loaded: 2 events
[Client Delivery] Final metrics: {
  "ClientA": {videosCount: 0, postersCount: 0, completed: 0, ...}
}
```

**Problem**: Events loaded but counts are 0  
**Solution**:
1. Go back to **Strategy Calendar**
2. Click on the event to edit it
3. Scroll down to find "Videos Count" and "Posters Count" fields
4. Enter numeric values (e.g., 5 and 3)
5. Click "Save Event"
6. Return to Reports → Client Delivery Dashboard
7. Check console - counts should now be populated

---

### Scenario 3: Specific event shows in logs but not in table

```
[Client Delivery] Event: My Event (ClientName) - Videos: 5, Posters: 3
[Client Delivery] Final metrics: {}
```

**Problem**: Event is loaded but client name not matching or date filtering  
**Solution**:

1. **Check client name**: Is it spelled exactly in the event? Case-sensitive!
   - Event: "Acme Corp" ✓
   - Different: "ACME CORP" ✗

2. **Check date range**: Is the event date within the selected range?
   - Report dates: July 1 - July 31 ✓
   - Event date: July 15 ✓
   - Different: August 5 ✗

3. **Check event client field**: 
   - Go to Strategy Calendar → Edit event
   - Verify "Client" dropdown has a selection
   - Don't leave it blank or "-- General / No Client --"

---

### Scenario 4: No console messages at all

**Problem**: Dashboard isn't rendering at all  
**Solution**:

1. **Is Client Delivery tab visible?**
   - Scroll right in the Reports tabs
   - Look for camera icon (📹)
   - Click on "Client Delivery" tab

2. **Is date range set?**
   - Check top of Reports page
   - Should see date picker filled with dates
   - If empty, click on dates or use preset buttons

3. **Check page load errors**:
   - Look at console for red error messages
   - Look for Firebase connection errors
   - Check network tab (F12 → Network) for failed requests

---

## Advanced Debugging

### View All Strategy Events in Console

Paste this in console:
```javascript
console.table(strategyEvents);
```

Shows all loaded strategy events in a table format.

### Check Specific Event

```javascript
// Replace "event123" with actual event ID
console.log(strategyEvents.event123);
```

Shows structure of a specific event, including videosCount and postersCount values.

### Manually Trigger Dashboard Render

```javascript
renderClientDeliveryDashboard();
```

Forces re-render immediately. Check if data appears.

### Check Current Filters

```javascript
console.log({
  reportDateFrom,
  reportDateTo,
  currentReportTab,
  activeView
});
```

Verifies the report filters are set correctly.

---

## Common Issues & Quick Fixes

### Issue: "Please select a date range to view data"

**Fix**: 
- Click date picker at top of Reports
- Select start date and end date
- Or use preset buttons (Today, This Week, This Month)

### Issue: Dashboard shows empty even after creating events

**Fix**:
1. Refresh the page (Ctrl+R or Cmd+R)
2. If still empty, check Firebase path has data:
   ```javascript
   console.log(Object.keys(strategyEvents));
   ```
   Should show at least one event ID like `"-NdxK8pQ..."` (Firebase auto-IDs)

### Issue: Table shows but all counts are 0

**Fix**:
1. Open DevTools Console
2. Check for this log: `[Client Delivery] Final metrics:`
3. If videosCount is 0, go edit the event and verify counts are filled in
4. Ensure events have actual numeric values in Videos Count and Posters Count

### Issue: Events appear in some clients but not others

**Fix**:
- Check if client name in event matches exactly
- Firebase is case-sensitive
- "Acme" ≠ "acme" ≠ "ACME"

### Issue: Date range shows old data

**Fix**:
- Manually change date range
- Or use "This Week" preset to reset
- Verify event date is actually within the selected range

---

## Chrome DevTools Tips

### Enable Long Stack Traces (better error info)
1. F12 → Settings (gear icon)
2. Sources → Check "Capture async stack traces"
3. Reload page

### Filter Console Logs
1. Type in console search box: `[Client Delivery`
2. Shows only relevant logs

### Copy Entire Object
```javascript
copy(strategyEvents);
// Then paste in text editor to see full structure
```

### Performance Check
```javascript
console.time('Dashboard Render');
renderClientDeliveryDashboard();
console.timeEnd('Dashboard Render');
```

Shows how long dashboard takes to render.

---

## Firebase Data Structure Check

### To verify data is actually in Firebase:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Find your project
3. Go to **Realtime Database** or **Cloud Firestore**
4. Navigate to `worksync → strategy_events`
5. You should see documents like:
   ```
   -Nd1K8pQ (document ID)
   ├─ title: "Summer Campaign"
   ├─ videosCount: 5
   ├─ postersCount: 3
   ├─ client: "Acme"
   ├─ date: "2026-07-20"
   └─ ... other fields
   ```

If this doesn't exist:
- **Problem**: No strategy events saved yet
- **Solution**: Create one in the app's Strategy Calendar

---

## Performance Debugging

### Monitor Real-Time Updates

Add this to console and watch for updates:
```javascript
let updateCount = 0;
if (strategyEventsUnsub) strategyEventsUnsub();
strategyEventsUnsub = onValue(ref(db, 'worksync/strategy_events'), (snap) => {
    updateCount++;
    console.log(`[Update #${updateCount}] Events loaded:`, Object.keys(snap.val() || {}).length);
});
```

Every time Firebase data changes, it will log the update.

---

## Still Not Working?

### 1. Check Permissions
- Verify user is Admin or Manager (dashboard only shows for these roles)
- Look for permission errors in console

### 2. Clear Cache
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Or: F12 → Settings → Clear site data

### 3. Check Network
- F12 → Network tab
- Look for failed requests to Firebase
- Check for 403 (permission denied) or 404 (not found) errors

### 4. Verify Firebase Connection
```javascript
console.log('Firebase DB:', db);
console.log('Authenticated user:', currentUser);
```

Both should show values, not undefined/null

### 5. Try Different Browser
- Some issues are browser-specific
- Try Chrome, Firefox, Safari, or Edge

### 6. Check for JavaScript Errors
- Any red errors in console?
- Fix those first, then test dashboard

---

## Escalation Checklist

Before reporting issue, verify:
- [ ] Browser console shows no red errors
- [ ] Firebase is connected (check `db` variable)
- [ ] User is Admin or Manager role
- [ ] At least one strategy event created with videosCount and postersCount
- [ ] Date range includes the event date
- [ ] Page refreshed recently
- [ ] Tested in different browser
- [ ] Logged all console output starting with `[`

---

## Useful Console Commands

```javascript
// List all events
Object.entries(strategyEvents).forEach(([id, ev]) => {
  console.log(`${id}: ${ev.title} (${ev.client}) - Videos: ${ev.videosCount}, Posters: ${ev.postersCount}`);
});

// Find events for specific client
const clientName = "Acme";
Object.values(strategyEvents).filter(e => e.client === clientName).forEach(e => {
  console.log(`${e.title}: ${e.videosCount} videos, ${e.postersCount} posters`);
});

// Check date filtering
const from = new Date(reportDateFrom).getTime();
const to = new Date(reportDateTo).getTime() + 86400000;
Object.values(strategyEvents).forEach(e => {
  const eventTs = new Date(e.date).getTime();
  console.log(`${e.title}: ${eventTs >= from && eventTs < to ? 'IN RANGE' : 'OUT OF RANGE'}`);
});
```

---

## Contact Support

If issue persists after all above steps:
1. Take screenshot of console logs (starting with `[`)
2. Note the date range used
3. List all events created in Strategy Calendar
4. Note which client names are used
5. Provide this information to support team

