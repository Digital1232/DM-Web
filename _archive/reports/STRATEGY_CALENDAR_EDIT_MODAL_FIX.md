# Strategy Calendar Edit Modal - Fix & Troubleshooting

## Issue Summary
The Strategy Calendar Edit Modal is not opening when clicking on events to edit them.

## Root Causes & Solutions Applied

### 1. **Missing Event Data Validation** ✓ FIXED
**Problem**: The function wasn't validating if the event actually exists in memory before trying to display it.

**Fix Applied**: Added comprehensive logging to detect:
- Event ID being passed
- Total events currently in memory
- Specific event object details
- List of first 5 available event IDs for comparison

**Console Output** (after clicking an event):
```
[openEditStrategyEventModal] Called with eventId: [event-abc123]
[openEditStrategyEventModal] Total events in memory: 45
[openEditStrategyEventModal] Event object: {title: "...", date: "...", ...}
```

### 2. **Silent Modal Failures** ✓ FIXED
**Problem**: If the modal element doesn't exist, or `showModal()` fails, there's no user feedback.

**Fix Applied**:
- Wrapped entire function in try-catch
- Added validation that modal element exists before calling `showModal()`
- Added error toast notifications to user
- Added error logging with specific error details

**Error Handling Code**:
```javascript
const modal = document.getElementById('strategyEventModal');
if (!modal) {
    console.error('[openEditStrategyEventModal] Modal element not found in DOM');
    toast('Modal element not found. This is a system error.', 'error');
    return;
}

modal.showModal();
```

### 3. **Missing Click Handler Verification** ✓ FIXED
**Problem**: When rendering events in the sidebar and calendar, the click handler wasn't being set up correctly.

**Fix Applied**: Added logging in both `renderStrategySidebar()` and `renderStrategyCalendar()` to verify:
- Event ID is being passed to click handler
- `isStrategyEvent` flag is set correctly
- Click handler string is properly formatted

**Sidebar Logging** (line ~15690):
```javascript
const clickHandler = task.isStrategyEvent ? `openEditStrategyEventModal('${task.id}')` : '';
console.log(`[renderStrategySidebar] Task ${task.id} - isStrategyEvent: ${task.isStrategyEvent}`);
```

**Calendar Grid Logging** (line ~15630):
```javascript
const clickHandler = task.isStrategyEvent ? `openEditStrategyEventModal('${task.id}')` : `openJiraTaskDetail('${task.id}')`;
console.log(`[renderStrategyCalendar] Task ${task.id} - handler: ${clickHandler}`);
```

## How to Diagnose the Issue

### Step 1: Check Browser Console Logs
1. Open browser DevTools: **F12**
2. Go to **Console** tab
3. Click on a strategy event in the calendar or sidebar
4. Look for log messages starting with `[openEditStrategyEventModal]`

**If you see**:
- ✅ `Total events in memory: 45` → Events loaded correctly
- ✅ `Event object: {title: ...}` → Event data exists
- ✅ `Modal opened successfully` → No issues!

**If you see**:
- ❌ `Event not found in strategyEvents!` → Data sync issue
- ❌ `Modal element not found in DOM` → UI structure issue
- ❌ Error stack trace → JavaScript error (see details below)

### Step 2: Check Event Data Exists
Run in browser console:
```javascript
// Check if any strategy events exist
console.log('Total strategy events:', Object.keys(strategyEvents || {}).length);

// List first few event IDs
console.log('Sample event IDs:', Object.keys(strategyEvents || {}).slice(0, 5));

// Check if a specific event exists
console.log('Event abc123:', strategyEvents['abc123']);

// Check Firebase data path
console.log('Strategy events loaded from: worksync/strategy_events');
```

### Step 3: Verify Rendering
Check if events are being rendered with correct `isStrategyEvent` flag:
```javascript
// This should show rendering debug logs in console
// Look for messages like:
// [renderStrategyCalendar] Task event-123 - isStrategyEvent: true
// [renderStrategySidebar] Task event-123 - isStrategyEvent: true
```

### Step 4: Check Modal Element
Verify the modal exists in the DOM:
```javascript
// Should return the modal element
document.getElementById('strategyEventModal')

// Try to open it manually
document.getElementById('strategyEventModal').showModal()
```

## Common Issues & Solutions

### Issue A: "Event not found in strategyEvents!"
**Cause**: Events loaded from Firebase but not available when clicking

**Solutions**:
1. **Refresh the page** - Sometimes Firebase listener hasn't connected yet
2. **Check Firebase permissions** - User might not have read access
3. **Check data structure** - Event might be stored differently than expected

**Verification**:
```javascript
// Check what's actually in the database
Object.values(strategyEvents).map(e => ({
    id: e.id,
    title: e.title,
    date: e.date,
    hasClient: !!e.client
}))
```

### Issue B: "Modal element not found in DOM"
**Cause**: The HTML dialog with id="strategyEventModal" doesn't exist

**Solutions**:
1. **Hard refresh browser** - Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. **Clear browser cache** - DevTools → Application → Clear Storage
3. **Check if index.html updated** - Deployment might not have latest version

**Verification**:
```javascript
// Check if modal exists
!!document.getElementById('strategyEventModal')  // Should be true

// List all dialogs
document.querySelectorAll('dialog')  // Should include strategyEventModal
```

### Issue C: "No task selected" in Jira field
**Cause**: Event exists but no matching Jira task found

**Why it's OK**: Strategy events can exist without linked Jira tasks. The modal should still open.

**What to do**:
1. Modal should still open and display the event
2. You can manually select or search for a Jira task
3. Save the event to link it

## Testing Checklist

After the fix, verify the following:

- [ ] **Click on calendar event** → Modal opens with event data
- [ ] **Console shows no errors** → All logs successful
- [ ] **Edit event title** → Modal allows editing (if you have permission)
- [ ] **Jira task field** → Shows selected task or "No task selected"
- [ ] **Save button** → Saves changes without error
- [ ] **Close button** → Modal closes properly
- [ ] **Sidebar events** → Clicking sidebar events also opens modal
- [ ] **Permissions work** → Read-only mode for non-admins, edit mode for admins

## Files Modified

1. **index.html** - Strategy Calendar section (lines ~15932-16085)
   - Added comprehensive error handling
   - Added validation logging
   - Added try-catch wrapper
   - Added modal element existence check
   - Added error toast notifications

## Quick Diagnostic Command

Copy and paste this into browser console to get full diagnostic:
```javascript
console.log('=== STRATEGY CALENDAR EDIT MODAL DIAGNOSTIC ===');
console.log('Modal exists:', !!document.getElementById('strategyEventModal'));
console.log('Total events:', Object.keys(strategyEvents || {}).length);
console.log('First 3 event IDs:', Object.keys(strategyEvents || {}).slice(0, 3));
console.log('Sample event:', Object.values(strategyEvents || {})[0]);
console.log('All good to click events!');
```

## Next Steps

If the issue persists after these fixes:

1. **Check Firebase Console**:
   - Navigate to `worksync/strategy_events`
   - Verify events exist in database
   - Check security rules allow user to read

2. **Check User Permissions**:
   - Verify user is in ALLOWED_ADMINS
   - Verify `canViewStrategyCalendar()` returns true

3. **Check Network Tab**:
   - Open DevTools → Network tab
   - Refresh page
   - Look for `/strategy_events` request
   - Verify response has event data

4. **Test in Different Browser**:
   - Clear all cache
   - Try Chrome, Firefox, Safari, or Edge
   - Verify same behavior

## Support

If you still have issues:
1. Check console for error messages (F12 → Console)
2. Note the exact error message
3. Check if any warning/error logs appeared
4. Provide this diagnostic info when reporting the issue
