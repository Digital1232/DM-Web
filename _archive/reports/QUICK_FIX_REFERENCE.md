# Quick Fix Reference: Client Delivery Dashboard Count Mismatch

## TL;DR - What to Do NOW

### The Issue
"Planned Video and Poster Counts are not same as the strategy Plan"

### The Fix (3 Steps)

**Step 1**: Open browser → Press `F12` → Go to **Console** tab

**Step 2**: Type in console:
```javascript
debugStrategyEvents()
```

**Step 3**: Look at console output:
- Find a line like: `videosCount: 7, postersCount: 4`
- Compare with what you entered in Strategy Calendar
- If they match: Problem is in display/aggregation
- If they don't match: Problem is in saving/loading

---

## Most Common Issues & Quick Fixes

### Issue #1: Console shows `videosCount: 0, postersCount: 0`
**Problem**: Event saved with zero counts  
**Fix**: 
1. Go to Strategy Calendar → Edit the event
2. Change Videos Count to a number (don't leave as 0)
3. Change Posters Count to a number (don't leave as 0)
4. Save
5. Go back to dashboard, refresh

### Issue #2: Dashboard shows 0 but console shows correct numbers
**Problem**: Date range or client name mismatch  
**Fix**:
1. Check date range at top of Reports page
2. Make sure event date is within that range
3. Check client name in event exactly matches dashboard
4. Refresh the dashboard (click another tab, then back)

### Issue #3: No console output at all
**Problem**: Dashboard not loading  
**Fix**:
1. Make sure you're on "Client Delivery Dashboard" tab (scroll right in Reports)
2. Make sure date range is set at top of Reports
3. Press F12 to see any error messages
4. Refresh page

### Issue #4: Event shows in Strategy Calendar but not dashboard
**Problem**: Date outside report range  
**Fix**:
1. Note the event date
2. Go to Reports
3. Set date range to include that date
4. Dashboard will now show it

---

## Test in 2 Minutes

1. Create event: Videos=5, Posters=3, Date=Today
2. Go to Reports → Client Delivery Dashboard
3. Set date range to Today
4. Check console: Should see `videosCount: 5, postersCount: 3`
5. Check dashboard: Should display 5 and 3
6. If all match: **System working!**

---

## Console Commands You Need

### See all events with their exact values:
```javascript
debugStrategyEvents()
```

### Manually refresh dashboard:
```javascript
renderClientDeliveryDashboard()
```

### Check current filter:
```javascript
console.log({
  dateFrom: reportDateFrom,
  dateTo: reportDateTo
})
```

---

## Check Firebase for Data

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Find your project
3. Click **Realtime Database**
4. Go to `worksync` → `strategy_events`
5. Find your event
6. Look for `videosCount` and `postersCount` fields
7. Do the values match what you entered?
   - YES: Problem is in app display
   - NO: Problem is in saving

---

## What Console Logs Mean

| If you see... | It means... |
|---|---|
| `videosCount: 5, postersCount: 3` | Data is loaded from Firebase correctly |
| `videosCount: undefined` | Event is old (before this field existed) |
| `videosCount: 0` | Event was saved with 0 count |
| No `[Client Delivery]` logs | Dashboard not loading or date range not set |
| Events processed: 1 | One event matched the date filter |
| Events processed: 0 | No events matched (wrong date/missing client) |

---

## Before Asking for Help

- [ ] Run `debugStrategyEvents()` 
- [ ] Screenshot console output
- [ ] Check Firebase data
- [ ] Verify event date is in report range
- [ ] Verify client name matches exactly
- [ ] Try refreshing page

---

## Emergency Check List

If the dashboard counts are still wrong after trying the above:

**Check 1**: Do all events show with correct counts in Firebase?
```
Firebase Console → worksync → strategy_events
Look at videosCount and postersCount values
```

**Check 2**: Does console output match Firebase?
```javascript
debugStrategyEvents()
Compare logged values with Firebase values
```

**Check 3**: Does dashboard match console output?
```
Look at table in Client Delivery Dashboard
Compare with [Client Delivery] console logs
```

**Where they differ** = Where the problem is

---

## One-Liner Diagnostics

**Show all events**: `console.table(Object.entries(strategyEvents).map(([id, ev]) => ({title: ev.title, client: ev.client, v: ev.videosCount, p: ev.postersCount})))`

**Count total videos**: `Object.values(strategyEvents).reduce((sum, e) => sum + (e.videosCount || 0), 0)`

**Count total posters**: `Object.values(strategyEvents).reduce((sum, e) => sum + (e.postersCount || 0), 0)`

**Check if data loaded**: `Object.keys(strategyEvents).length > 0 ? 'YES' : 'NO - No data!'`

---

## Bottom Line

1. **Run**: `debugStrategyEvents()` in console
2. **Compare**: Console output with Strategy Calendar
3. **Check**: Firebase if numbers don't match
4. **Identify**: Where the numbers change
5. **Report**: Exact findings (which stage fails)

That's it!
