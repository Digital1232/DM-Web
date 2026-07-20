# Verify Strategy Calendar Fixes - Step-by-Step Guide

## Quick Verification (5 minutes)

### Step 1: Open Strategy Calendar
1. Log in to the application
2. Click "Strategy Calendar" from navigation
3. Wait for page to load completely (2-3 seconds)

### Step 2: Check Browser Console for Automatic Diagnostics
1. Press `F12` to open Developer Tools
2. Click "Console" tab
3. **Look for this message**:
   ```
   === STRATEGY CALENDAR LOADED ===
   Total events: [number]
   Events with dates: [number]
   Events with clients: [number]
   Unique clients in events: [number] [list]
   Available customClients: [number] [list]
   ```

**Expected Result**:
- Total events > 0 (if calendar has any tasks)
- Events with dates should be close to total
- customClients should include all expected clients

### Step 3: Visual Check - Client Filter Tabs
Look at the filter buttons above the calendar

**Before Fix**:
- Might see: "All", "General", "NTT", "Einstein" (only 4 clients)

**After Fix**:
- Should see: "All", "General", "NTT", "Einstein", "Ashmithasree", "IVN", etc.
- Should include ALL clients from settings, not just active ones

### Step 4: Run Debug Function
1. In browser Console, type:
   ```javascript
   debugStrategyCalendar()
   ```
2. Press Enter

**Expected Output**:
```
🔍 STRATEGY CALENDAR DEBUG INFO

Total events: 45
Current filter: All
Current date: 7/20/2026

[Table showing counts by client]
Client1: 12
Client2: 8
Ashmithasree: 5
...

Custom Clients: Array(22)
[list of all clients]

Sample events: Array(3)
[3 sample events with full details]
```

**What This Tells You**:
- ✓ If "Total events" > 0, data is loading
- ✓ If "⚠️ 0 events missing DATE field", all tasks are valid
- ✓ If all expected clients appear in table, filtering will work
- ✓ Sample events show data structure is correct

## Detailed Verification (15 minutes)

### Test 1: Client Tab Visibility

**What to Check**: Do all clients appear in filter tabs?

**Test Steps**:
1. Look at all filter tabs at top of calendar
2. Count the number of tabs
3. Compare with known client list

**Pass Criteria**:
- All clients from settings appear (even if no tasks)
- Clicking each tab doesn't cause errors
- Page doesn't freeze or slow down

**If Failing**:
- Run `debugStrategyCalendar()`
- Check "Custom Clients:" section
- Compare with what's visible in UI

### Test 2: Task Display on Calendar

**What to Check**: Do tasks appear on correct calendar dates?

**Test Steps**:
1. Click "All" tab to show all tasks
2. Look at calendar grid (7 columns × rows)
3. Count visible tasks
4. Check a few tasks to see dates

**Pass Criteria**:
- Tasks appear on calendar dates
- Each task shows title + client name (2 lines)
- No overlapping or hidden tasks

**If Failing**:
- Run `debugStrategyCalendar()`
- Check "Events with dates:" value
- If close to total, issue is display
- If much lower, many tasks lack dates in database

### Test 3: Client Filtering

**What to Check**: Does filtering by client work correctly?

**Test Steps**:
1. Note total task count with "All" selected
2. Click on specific client tab (e.g., "Ashmithasree")
3. Count visible tasks (should be fewer)
4. Verify only that client's tasks show
5. Try another client

**Pass Criteria**:
- Each client shows only their own tasks
- Numbers decrease as expected
- No errors in console
- "General" tab shows unassigned tasks

**If Failing**:
- Run `debugStrategyCalendar()`
- Check table showing event counts by client
- Verify filter is changing: `activeStrategyClientFilter`
- Check if issue is data or display

### Test 4: Data Integrity

**What to Check**: Is all event data correct?

**Test Steps**:
1. Run `debugStrategyCalendar()`
2. Expand "Sample events:" section
3. Check each event has:
   - `id`: Unique identifier
   - `title`: Event name
   - `date`: YYYY-MM-DD format
   - `client`: Client name or empty string
4. Hover over a task to see tooltip

**Pass Criteria**:
- All sample events have required fields
- Dates are in correct format
- Client names match UI display
- Tooltip shows full information

**If Failing**:
- Check Firebase database directly
- Verify event structure
- Look for malformed records

### Test 5: Navigation and Filtering

**What to Check**: Can you navigate months and switch filters smoothly?

**Test Steps**:
1. Click "Today" button (calendar should jump to current month)
2. Click next month arrow (>)
3. Click previous month arrow (<)
4. Switch between different client tabs
5. Open a task by clicking on it

**Pass Criteria**:
- Navigation buttons work smoothly
- Client tabs switch without lag
- Modal opens when clicking tasks
- No console errors

**If Failing**:
- Check browser console for errors
- Look for JavaScript exceptions
- Check Firefox/Chrome performance

## Advanced Diagnostics

### Console Commands for Detailed Inspection

#### Check Event Count by Date
```javascript
const byDate = {};
Object.values(strategyEvents).forEach(e => {
    if (e.date) byDate[e.date] = (byDate[e.date] || 0) + 1;
});
console.table(byDate);
```

Shows how many tasks are on each date.

#### Check Client Counts
```javascript
const byClient = {};
Object.values(strategyEvents).forEach(e => {
    const c = e.client || 'General';
    byClient[c] = (byClient[c] || 0) + 1;
});
console.table(byClient);
```

Shows how many tasks each client has.

#### Find Events Without Dates
```javascript
Object.entries(strategyEvents)
    .filter(([_, e]) => !e.date)
    .map(([id, e]) => ({ id, title: e.title, client: e.client }))
```

Lists all events missing date field (these won't show on calendar).

#### Verify Custom Clients
```javascript
console.log('customClients:', customClients);
console.log('CLIENTS array:', window.CLIENTS);
console.log('Diff (in CLIENTS but not customClients):',
    window.CLIENTS.filter(c => !customClients.includes(c))
);
```

Shows discrepancies between configured and active clients.

#### Check Current Filter State
```javascript
console.log('Active filter:', activeStrategyClientFilter);
console.log('Total events:', Object.keys(strategyEvents).length);
console.log('Filtered events:',
    Object.values(strategyEvents).filter(e => {
        if (activeStrategyClientFilter === 'All') return true;
        if (activeStrategyClientFilter === 'General') return !e.client;
        return e.client === activeStrategyClientFilter;
    }).length
);
```

Shows how many tasks match current filter.

## Troubleshooting Guide

### Symptom: No tasks appear on calendar
**Diagnosis**:
```javascript
debugStrategyCalendar()
// Check "Total events" and "Events with dates"
```

**Possible Causes**:
1. **Total events = 0**: Firebase not loading data
   - Check network connection
   - Verify Firebase permissions
   - Ensure `worksync/strategy_events` exists

2. **Events with dates << Total events**: Many events lack dates
   - Check database for missing date fields
   - Events must have `date` in YYYY-MM-DD format

3. **Events show in debug but not on calendar**: Display issue
   - Browser cache issue - try F5 refresh
   - Check for JavaScript errors in console

### Symptom: Client tabs incomplete
**Diagnosis**:
```javascript
console.log('Missing clients:',
    window.CLIENTS.filter(c => !document.querySelector(`button[data-client="${c}"]`))
);
```

**Possible Causes**:
1. **customClients not loaded**: Check Firebase settings
   ```javascript
   console.log('customClients:', customClients);
   ```

2. **Spelling mismatch**: Compare exactly with CLIENTS array
   ```javascript
   // Find typos/mismatches
   customClients.filter(c => !window.CLIENTS.includes(c))
   ```

### Symptom: Tasks show but without client names
**Diagnosis**:
Check rendered HTML:
1. Right-click on task → Inspect
2. Look for nested `<div>` elements
3. Should see: title div + client div

**Possible Causes**:
1. CSS hiding the client name (opacity/color)
2. Rendering code not updated
3. Browser cache issue

**Fix**: Hard refresh browser:
- Windows: `Ctrl+Shift+R`
- Mac: `Cmd+Shift+R`

## Performance Check

### How to Benchmark Calendar Performance

```javascript
// Time how long it takes to render
console.time('Calendar Render');
renderStrategyCalendar();
console.timeEnd('Calendar Render');

// Time how long it takes to filter
console.time('Client Filter');
setStrategyClientFilter('Ashmithasree');
console.timeEnd('Client Filter');
```

**Expected Results**:
- Render: < 100ms
- Filter: < 50ms
- If much slower, may have too many events

## Success Criteria Checklist

✓ All fixes are considered successful when:

- [ ] Console shows calendar loading with event counts
- [ ] All configured clients visible in filter tabs
- [ ] Running `debugStrategyCalendar()` shows comprehensive data
- [ ] Tasks display on calendar with dates visible
- [ ] Client names appear below task titles
- [ ] Filtering by client works correctly
- [ ] All clients from settings appear in tabs
- [ ] No console errors or warnings
- [ ] Navigation (month arrows, Today button) works smoothly
- [ ] Modal opens when clicking tasks
- [ ] Performance is acceptable (< 200ms per action)

## Report Issues

If issues persist after verification:

1. **Collect Console Output**:
   ```javascript
   debugStrategyCalendar()
   // Copy entire output
   ```

2. **Include Environment Info**:
   - Browser type and version
   - Windows/Mac/Linux
   - Date/time of issue

3. **Provide Screenshots**:
   - Calendar view (what you see)
   - Browser console (what logs show)
   - Developer tools → Network (if data isn't loading)

4. **Run These Commands** (copy output):
   ```javascript
   navigator.userAgent  // Browser info
   Object.keys(strategyEvents).length  // Event count
   customClients  // Available clients
   debugStrategyCalendar()  // Full diagnostic
   ```

## Next Steps

After verification:

1. **Monitor Performance**: Watch for any slowdowns
2. **Gather Feedback**: Ask team if all tasks are visible
3. **Document Issues**: Note any remaining problems
4. **Plan Improvements**: Consider optimization if needed

---

**Last Updated**: July 20, 2026  
**Status**: Ready for Verification  
**Estimated Time**: 5-15 minutes
