# Strategy Calendar - Troubleshooting Guide

## Issues Fixed

### 1. ✓ Missing Clients in Filter Tabs
**Problem**: Client tabs only showed clients that had existing tasks. If a client had no events, they didn't appear in the filter dropdown.

**Solution**: Modified `renderStrategyClientTabs()` to include **all configured clients** (`customClients`) plus any additional clients from existing events.

**Code Change** (Line ~14754):
```javascript
// OLD - Only used clients from events
const uniqueClients = new Set();
Object.values(strategyEvents).forEach(ev => {
    if (ev.client) uniqueClients.add(ev.client);
});

// NEW - Includes both configured and active clients
const uniqueClients = new Set([...customClients]);
Object.values(strategyEvents).forEach(ev => {
    if (ev.client) uniqueClients.add(ev.client);
});
```

**Impact**: Now all clients from the settings appear in tabs, even if they have no tasks yet.

### 2. ✓ Added Diagnostic Logging
**Problem**: No visibility into why tasks might be missing or why clients weren't showing.

**Solution**: Added comprehensive logging to help diagnose data loading issues.

**Console Output** (When Strategy Calendar loads):
```
=== STRATEGY CALENDAR LOADED ===
Total events: 45
Events with dates: 42
Events with clients: 35
Unique clients in events: 8 (NTT, Einstein, Ashmithasree, ...)
Available customClients: 22 (NTT, Einstein, ..., Ashmithasree)
```

### 3. ✓ Added Debug Utility Function
**Purpose**: Inspect calendar data from browser console to diagnose issues.

**Usage**: Open browser DevTools (F12) → Console → Type:
```javascript
debugStrategyCalendar()
```

**Output**: Shows:
- Total events count
- Current filter selection
- Current calendar month
- Events missing DATE field (with details)
- Breakdown of events by client
- List of configured custom clients
- Sample events to inspect structure

## How to Diagnose Missing Tasks

### Step 1: Check Console Logs
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for "=== STRATEGY CALENDAR LOADED ===" message
4. Check the counts:
   - Total events should be > 0
   - Events with dates should match or be close to total
   - If "Events with dates" is 0, tasks without dates are missing

### Step 2: Run Debug Function
1. In Console, type: `debugStrategyCalendar()`
2. Inspect the output table showing events by client
3. If a client is missing, it won't appear in the table
4. Look for warnings about missing DATE fields

### Step 3: Check Firebase Data
1. Go to Firebase Console (https://console.firebase.google.com)
2. Navigate to `worksync/strategy_events`
3. Examine several documents to verify:
   - Each event has a `date` field in format YYYY-MM-DD
   - Events have `client` field populated (or empty for "General")
   - Events have `title` field

### Step 4: Verify Custom Clients Configuration
1. In Console, type: `customClients`
2. Verify all expected clients are in the array
3. Compare with CLIENTS array: `window.CLIENTS`
4. Check Firebase at `worksync/settings/custom_clients`

## Common Issues & Solutions

### Issue: No tasks appear on calendar
**Possible Causes:**
1. All events missing `date` field
2. Permission issue - user can't read events
3. Firebase listener not connected
4. Events filtered by incorrect client filter

**Solution**:
```javascript
// Check in console:
debugStrategyCalendar()

// If "Events with dates: 0", all tasks lack dates
// If "Total events: 0", Firebase isn't loading data
// If total > 0 but displayed < total, check activeStrategyClientFilter
```

### Issue: Specific client doesn't appear in tabs
**Possible Causes:**
1. Client name spelled differently in database
2. Client not in `customClients` array
3. Case sensitivity mismatch

**Solution**:
```javascript
// Check if client is in customClients
customClients.includes('YourClientName')  // true/false

// Check exact spellings in events
Object.values(strategyEvents)
    .map(e => e.client)
    .filter(c => c)  // Exclude empty
    .sort()
    
// Compare with CLIENTS array
window.CLIENTS
```

### Issue: Tasks appear but without client names
**Possible Cause:** Client display fix not applied or reverted

**Solution**: Verify the rendering code includes client name display:
```javascript
// Should show client below title:
<div class="truncate">${escapeHtml(ev.title)}</div>
<div class="text-[8px] opacity-75 truncate">${escapeHtml(clientName)}</div>
```

### Issue: Calendar shows wrong count of tasks
**Possible Cause:** Active filter is hiding tasks from other clients

**Solution**:
```javascript
// Click "All" tab to see all events
setStrategyClientFilter('All')

// Then check specific client
setStrategyClientFilter('Ashmithasree')
```

## Testing Checklist

After applying fixes, verify:

- [ ] Browser console shows events loading without errors
- [ ] Debug function returns complete data (run `debugStrategyCalendar()`)
- [ ] All clients from settings appear in filter tabs
- [ ] Tasks with all clients show when "All" is selected
- [ ] Filtering by specific client shows only that client's tasks
- [ ] "General" tab shows tasks without client assignment
- [ ] Each task displays with title and client name
- [ ] Tasks display on correct calendar dates
- [ ] Hover tooltip shows full event info with status

## Data Structure Verification

### Required Event Fields
```javascript
{
    id: "event-123",              // ✓ Required
    title: "Campaign Launch",     // ✓ Required
    date: "2026-07-15",           // ✓ CRITICAL - Missing dates hide task
    client: "Ashmithasree",       // Optional - empty = "General"
    status: "To Do",              // Optional
    owner: "email@example.com",   // Optional
    desc: "Description",          // Optional
    platform: "Instagram",        // Optional
    jiraTaskId: "JULY-123"        // Optional
}
```

### Custom Clients Array
Located at `worksync/settings/custom_clients`:
```javascript
[
    "NTT",
    "Einstein",
    "IVN",
    "Ashmithasree",
    // ... more clients
]
```

## Performance Optimization

If calendar is slow with many events:

1. **Limit date range** - Show only current/next 3 months
2. **Lazy load** - Load events on demand per month
3. **Pagination** - Split very long task lists
4. **Caching** - Use local storage for frequently accessed data

## Files Modified

1. **index.html** (Strategy Calendar section)
   - Line ~14754: Updated `renderStrategyClientTabs()` to include all customClients
   - Line ~14702: Added diagnostic logging to `initStrategyCalendar()`
   - Line ~14755: Added `debugStrategyCalendar()` utility function
   - Line ~14983: Updated event rendering to show client names (previous fix)

## Quick Commands for Console

```javascript
// Check total events
Object.keys(strategyEvents).length

// Check events by client
Object.entries(strategyEvents).reduce((acc, [_, e]) => {
    const client = e.client || 'General';
    acc[client] = (acc[client] || 0) + 1;
    return acc;
}, {})

// Check all client names used
[...new Set(Object.values(strategyEvents).map(e => e.client || 'General'))]

// Verify specific client events
Object.values(strategyEvents).filter(e => e.client === 'Ashmithasree')

// Full diagnostic
debugStrategyCalendar()
```

## Getting Help

If issues persist after applying these fixes:

1. **Collect Information**:
   ```javascript
   debugStrategyCalendar()  // Copy console output
   ```

2. **Check Permissions**: Verify user has read access to `worksync/strategy_events`

3. **Review Firebase Rules**: Ensure security rules allow reading events

4. **Check Data Integrity**: 
   - All events have required fields
   - No corrupted/malformed data

5. **Clear Cache**: Browser cache might be stale
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Or: Settings → Clear Browsing Data

## Summary

✓ All client names now appear in filter tabs (not just those with tasks)
✓ Diagnostic logging added to console for visibility
✓ Debug utility function available for troubleshooting
✓ Client names display below task titles in calendar
✓ Ready for comprehensive testing
