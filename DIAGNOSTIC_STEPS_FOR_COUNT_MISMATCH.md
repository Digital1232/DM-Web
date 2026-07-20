# Diagnostic Steps: Planned Count Mismatch Issue

## Problem Statement
User reports: "Planned Video and Poster Counts are not same as the strategy Plan"

This means the dashboard's "Videos Count" and "Posters Count" columns don't match what was entered when creating strategy events.

---

## Changes Made to Debug This

### 1. Enhanced Logging in Dashboard Render
The `renderClientDeliveryDashboard()` function now logs more diagnostic information:

- **Data Sources Summary**: Shows total strategy events loaded and date range
- **Sample Events Display**: Shows first 3 events with their raw videosCount/postersCount values
- **Per-Event Logging**: Each event is logged with:
  - Title, Client, Videos count, Posters count
  - **New**: Raw field values (v=X, p=X) to show exact data
  - **New**: Format field for reference
- **First Pass Summary**: Shows how many events were processed vs skipped
- **Total Counts**: Shows aggregate totals of all videos and posters

### 2. Improved Count Logic
The count aggregation now:
- No longer forces values to 1 based on format (was causing issues)
- Respects explicit 0 values entered by user
- Only uses format as fallback if the field doesn't exist at all (for backward compatibility)
- Logs both processed values and raw values for comparison

### 3. New Debug Console Function
Added `debugStrategyEvents()` function that can be called from browser console:

```javascript
debugStrategyEvents()
```

This function:
1. Lists all strategy events with their exact data
2. Shows current report filter settings
3. Re-renders the dashboard
4. Outputs to console for inspection

---

## How to Diagnose the Issue

### Step 1: Open Browser Developer Tools
- Press `F12` on Windows or `Cmd+Option+I` on Mac
- Go to **Console** tab

### Step 2: Create or Edit a Strategy Event
1. Go to **Strategy Calendar**
2. Create a new event OR edit existing one
3. Enter specific numbers:
   - **Videos Count**: 7 (use a distinct number)
   - **Posters Count**: 4 (use a distinct number)
   - **Client**: Pick a specific client
   - **Date**: Pick a date in your report range
4. Click **Save Event**

### Step 3: Check Console Logs
Go back to **Reports** → **Client Delivery Dashboard**

Look for console logs starting with `[Client Delivery Dashboard]` and `[Client Delivery]`

Expected logs should show:
```
[Client Delivery Dashboard] Data Sources: {strategyEventsCount: 1, ...}
[Client Delivery Dashboard] Sample Events (first 3):
  Event ID: -NdxK8pQ... {
    title: "Your Event Title",
    date: "2026-07-20",
    client: "Your Client",
    videosCount: 7,  ← Should match what you entered
    postersCount: 4,  ← Should match what you entered
    format: "Video" or "Poster"
  }
[Client Delivery] Event: Your Event Title (Your Client) - Videos: 7, Posters: 4, Format: Video, Raw: v=7, p=4
[Client Delivery] First pass summary: 1 events processed, 0 skipped
[Client Delivery] TOTALS - Videos: 7, Posters: 4
```

### Step 4: Run Debug Function
In the console, type:
```javascript
debugStrategyEvents()
```

This will output:
1. All strategy events with their exact values
2. Current report filter dates
3. Re-render the dashboard (so you can watch console in real-time)

---

## Troubleshooting by Console Output

### Issue: Console shows videosCount: 0 or postersCount: 0

**Probable Cause**: Event was saved with 0 count

**Verification**:
1. Check Firebase: Go to [Firebase Console](https://console.firebase.google.com)
2. Navigate to `worksync → strategy_events`
3. Find your event document
4. Check the exact values in `videosCount` and `postersCount` fields

**Fix**:
1. Go back to Strategy Calendar
2. Edit the event
3. Scroll to Videos Count and Posters Count fields
4. Enter the correct numbers (don't leave them as 0)
5. Save Event

### Issue: Console shows event but videosCount shows as undefined

**Probable Cause**: Event was created before videosCount/postersCount fields existed

**Expected Behavior**:
- Code will use `format` field as fallback
- Video format events will show 1 video
- Poster format events will show 1 poster

**Fix**:
1. Edit the old event in Strategy Calendar
2. Enter explicit counts in Videos Count and Posters Count fields
3. Save

### Issue: Logs show correct counts but dashboard table shows 0

**Probable Cause**: 
- Date filter not matching event date
- Client name mismatch (case-sensitive)
- Table not refreshed

**Check**:
1. **Date Range**: Look at report date filter at top of Reports page
   - Does it include the event date?
   - Format: YYYY-MM-DD (e.g., 2026-07-20)

2. **Client Name Exact Match**:
   - Event shows client: "Acme Corp"
   - Dashboard looking for: "acme corp" (different case!)
   - Solution: Must match exactly

3. **Refresh Dashboard**:
   - Click on another tab in Reports
   - Click back on Client Delivery
   - Or use `renderClientDeliveryDashboard()` in console

### Issue: No console logs appear

**Probable Cause**: 
- Not viewing Client Delivery Dashboard tab
- Date range not set
- User not Admin or Manager

**Check**:
1. **Tab Selection**: 
   - In Reports, scroll right to find Client Delivery tab (📹 icon)
   - Click on it

2. **Date Range**:
   - Top of Reports page
   - Should have dates filled in report-date-from and report-date-to
   - Use preset buttons or date pickers

3. **Permissions**:
   - Dashboard only shows for Admin and Manager roles
   - Check your role in System Settings

---

## Console Commands for Inspection

### List all strategy events
```javascript
Object.entries(strategyEvents).forEach(([id, ev]) => {
  console.log(`${ev.title} (${ev.client}) - V:${ev.videosCount} P:${ev.postersCount}`);
});
```

### Check specific event
```javascript
// Replace "eventId" with actual ID from Firebase
console.log(strategyEvents.eventId);
```

### Manually re-render dashboard
```javascript
renderClientDeliveryDashboard();
```

### Check report filter state
```javascript
console.log({
  dateFrom: reportDateFrom,
  dateTo: reportDateTo,
  currentTab: currentReportTab,
  activeView: activeView
});
```

### Compare database vs dashboard
```javascript
let dbTotal = 0;
Object.values(strategyEvents).forEach(ev => {
  dbTotal += (ev.videosCount || 0);
});
console.log('Total videos in Firebase:', dbTotal);
console.log('Check against dashboard Videos Count column sum');
```

---

## The Complete Data Flow

```
Strategy Calendar Form
  ↓
User enters: Videos Count = 7, Posters Count = 4
  ↓
saveStrategyEvent() reads values
  ↓
parseInt(document.getElementById('strategy-videos-count').value) → 7
  ↓
Firebase `worksync/strategy_events/{eventId}` receives:
{
  videosCount: 7,
  postersCount: 4,
  ...other fields
}
  ↓
initReportFilters() loads strategy events on page load
  ↓
Firebase listener updates strategyEvents object
  ↓
User selects date range in Reports
  ↓
handleReportFilterChange() calls renderClientDeliveryDashboard()
  ↓
renderClientDeliveryDashboard() reads strategyEvents object
  ↓
First pass: Aggregates videosCount and postersCount by client
  ↓
Dashboard table displays aggregated values
```

---

## What to Provide When Reporting Issue

If the console debugging doesn't reveal the issue, gather this information:

1. **Screenshot of console output** (starting with `[Client Delivery Dashboard]`)
2. **Screenshot of the event you created** in Strategy Calendar (showing Videos Count and Posters Count fields)
3. **Screenshot of the dashboard** showing what counts it displays
4. **Date range used** in the report filter
5. **Client name used** in the event
6. **Result of `debugStrategyEvents()`** - copy and paste console output

---

## Quick Reference: What Each Log Means

| Log Message | What It Shows |
|---|---|
| `[initReportFilters] Initial fetch - Strategy events loaded: X events` | Firebase connection working, X events exist in database |
| `[Firebase Listener] Strategy events updated: X events` | Real-time listener working, data updated |
| `[Client Delivery Dashboard] Data Sources: {strategyEventsCount: X...}` | Dashboard render started, X events loaded |
| `[Client Delivery Dashboard] Sample Events (first 3):` | First 3 events with their exact database values |
| `[Client Delivery] Event: ... Videos: 7, Posters: 4` | Event counted toward aggregation with these values |
| `[Client Delivery] First pass summary: X processed, Y skipped` | X events used, Y filtered out (wrong date/missing data) |
| `[Client Delivery] TOTALS - Videos: X, Posters: Y` | Final aggregated counts for all clients combined |

---

## Still Stuck?

Try these additional steps:

1. **Clear browser cache**: Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)
2. **Hard refresh**: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
3. **Test in private/incognito window**: Rules out extension interference
4. **Check Firebase rules**: Ensure your user has read access to `worksync/strategy_events`
5. **Verify authent ication**: Check `currentUser` object in console

---

## See Also
- `CLIENT_DELIVERY_DASHBOARD_GUIDE.md` - Setup and workflow guide
- `DEBUGGING_GUIDE.md` - More detailed debugging strategies
- `IMPLEMENTATION_NOTES.md` - Technical architecture details
