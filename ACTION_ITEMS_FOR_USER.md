# Action Items: Debugging Planned Count Mismatch

## Current Status
Enhanced diagnostic logging has been added to the Client Delivery Dashboard to identify why "Planned Video and Poster Counts are not same as the strategy Plan".

## What You Need to Do

### Option A: Quick Self-Diagnostic (Recommended First Step)

1. **Open the application in your browser**
2. **Press `F12`** to open Developer Tools → **Console** tab
3. **Go to Reports** → Find and click **"Client Delivery Dashboard"** tab
4. **Set a date range** using the date filters at top of page (or use preset buttons)
5. **Look at the console output** for messages starting with `[Client Delivery Dashboard]`
   
   You should see logs like:
   ```
   [Client Delivery Dashboard] Data Sources: {strategyEventsCount: X...}
   [Client Delivery Dashboard] Sample Events (first 3): {...}
   [Client Delivery] Event: EventTitle (ClientName) - Videos: X, Posters: X
   [Client Delivery] TOTALS - Videos: X, Posters: X
   ```

6. **Compare the logged counts with what you entered** in the Strategy Calendar event
   - If they match: Problem is in how counts are aggregated or displayed
   - If they don't match: Problem is in how counts are being saved/loaded

### Option B: Run Diagnostic Function (Advanced)

If you want more detailed information, in the browser console type:

```javascript
debugStrategyEvents()
```

This will:
- List every strategy event with its exact database values
- Show current report filter settings
- Re-render the dashboard
- Output to console for inspection

---

## What the Logs Show

### If working correctly, you'll see:

```
[Client Delivery Dashboard] Sample Events (first 3):
  Event ID: -NdxK8pQ {
    title: "Summer Campaign",
    client: "Acme",
    videosCount: 5,        ← Should match what you entered
    postersCount: 3,       ← Should match what you entered
    format: "Video"
  }

[Client Delivery] Event: Summer Campaign (Acme) - Videos: 5, Posters: 3, Raw: v=5, p=3
[Client Delivery] TOTALS - Videos: 5, Posters: 3
```

### Common Issues and What They Mean:

| Issue | Diagnosis | Next Step |
|---|---|---|
| `videosCount: 0` or `postersCount: 0` in logs | Event was saved with 0 count | Go back to Strategy Calendar, edit event, enter correct numbers |
| `videosCount: undefined` | Old event without count fields | Edit event in Strategy Calendar to add explicit counts |
| Logs show correct counts but dashboard displays 0 | Date filter or client name mismatch | Check date range includes event date; verify client name exact match |
| No console logs appear | Not on Client Delivery tab OR date range not set | Find Client Delivery tab in Reports; set date range with date pickers |

---

## Step-by-Step Test

Follow this to verify the system is working:

### Step 1: Create a Test Event
1. Go to **Strategy Calendar** (not Reports)
2. Click **"Add"** or click on today's date
3. Fill in:
   - **Title**: "Test Event" (anything)
   - **Client**: Pick a specific client (e.g., "Acme")
   - **Date**: Today's date (or tomorrow)
   - **Format**: "Video" or "Poster"
   - **Videos Count**: `7` (use a distinct number)
   - **Posters Count**: `4` (use a distinct number)
4. Click **"Save Event"**

### Step 2: View in Dashboard
1. Go to **Reports**
2. Find **"Client Delivery Dashboard"** tab (might need to scroll right)
3. Set date range to include today (use Today preset or click date picker)
4. Dashboard should show your test event

### Step 3: Check Console
1. Press `F12` → **Console** tab
2. Look for console logs
3. Check if logged videosCount = 7 and postersCount = 4

### Step 4: Verify in Table
1. Look at the dashboard table
2. Find your client name (e.g., "Acme")
3. Check "Videos Count" column shows 7
4. Check "Posters Count" column shows 4

### Expected Results:
- ✓ Console shows correct values
- ✓ Dashboard table shows correct values
- ✓ Edit event again, values are still there
= **System is working correctly**

If any step shows wrong values:
- Console logs show different numbers than you entered → Check Firebase data
- Dashboard shows different numbers than console logs → Report this specific issue
- Nothing appears in console → Dashboard not loading → Check date range and tab

---

## If You Find a Mismatch

### Gather This Information:
1. **Screenshot of console output** (F12 → Console)
2. **Screenshot of the event you created** in Strategy Calendar
3. **Screenshot of the dashboard table** showing what it displays
4. **Result of `debugStrategyEvents()`** - copy all console output

### Then Check Firebase:
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Find your project
3. Go to **Realtime Database** → `worksync` → `strategy_events`
4. Find your event
5. **Screenshot the values** shown in Firebase
6. Compare Firebase values with:
   - What you entered in Strategy Calendar
   - What dashboard displays

---

## Common Causes and Fixes

### "Videos and Posters all show 0"
**Probable Cause**: Events exist but don't have count values  
**Fix**: 
1. Edit each event in Strategy Calendar
2. Fill in Videos Count and Posters Count
3. Save
4. Check dashboard again

### "Dashboard blank but console shows events"
**Probable Cause**: Date range doesn't include event dates  
**Fix**:
1. Check event dates in console output
2. Set report date range to include those dates
3. Refresh dashboard

### "Event appears but with wrong counts"
**Probable Cause**: Event was edited but new values didn't save  
**Fix**:
1. Go to Strategy Calendar
2. Click on the event to edit
3. Check Videos Count and Posters Count fields
4. If wrong, fix them
5. Click Save
6. Go to dashboard and refresh

### "I see an event in Strategy Calendar but not in dashboard"
**Probable Cause**: Event date is outside report date range  
**Fix**:
1. Note the event date
2. Go to Reports
3. Adjust date range to include that date
4. Dashboard should now show it

---

## Technical Details (For Reference)

### What Changed:
1. Added more detailed console logging to track data flow
2. Fixed count logic to respect user-entered values exactly
3. Added `debugStrategyEvents()` function for manual inspection
4. Improved diagnostics to help identify where the mismatch occurs

### Data Flow:
```
Strategy Calendar → Save Event → Firebase → Load to Dashboard → Display
```

If counts are wrong:
- **Step 1-2**: Check strategy calendar and Firebase have same values
- **Step 2-3**: Check Firebase to App loading is correct
- **Step 3-4**: Check dashboard calculation is correct

### Console Commands (For Technical Users):

View all events:
```javascript
console.table(Object.entries(strategyEvents).map(([id, ev]) => ({
  id, title: ev.title, client: ev.client, 
  videosCount: ev.videosCount, postersCount: ev.postersCount
})));
```

Manually re-render:
```javascript
renderClientDeliveryDashboard();
```

Check filter state:
```javascript
console.log({ reportDateFrom, reportDateTo, currentReportTab });
```

---

## Need Help?

### Before Contacting Support:
- [ ] Run `debugStrategyEvents()` and save output
- [ ] Screenshot console logs starting with `[Client Delivery`
- [ ] Screenshot Firebase event data
- [ ] Screenshot what dashboard displays
- [ ] List the steps you took to create the event
- [ ] Note which client name you used
- [ ] Note the date you used

### Information to Provide:
1. Console output
2. Screenshots (strategy calendar, dashboard, firebase)
3. The exact counts you entered
4. The date range you're viewing

This information will help identify whether the issue is in:
- Saving to Firebase
- Loading from Firebase  
- Aggregating counts
- Filtering by date/client
- Displaying in table

---

## Files to Reference

If you want more detailed information:
- `DIAGNOSTIC_STEPS_FOR_COUNT_MISMATCH.md` - Step-by-step debugging guide
- `RECENT_UPDATES_DEBUGGING.md` - Technical explanation of changes
- `CLIENT_DELIVERY_DASHBOARD_GUIDE.md` - How the feature is supposed to work
- `DEBUGGING_GUIDE.md` - Original debugging strategies

---

## Summary

The enhanced diagnostics should help identify exactly where the count mismatch is occurring. Follow the Quick Self-Diagnostic steps above, check the console output, and compare with what's in Firebase. This will tell us whether the problem is in saving, loading, aggregating, or displaying the counts.

Once we know which stage is failing, the fix should be straightforward.
