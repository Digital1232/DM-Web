# Strategy Calendar - Missing Tasks Quick Fix Guide

## Problem
Client tasks from Jira are not showing in the Strategy Calendar, even though events are created.

## Quick Fix (Follow These Steps)

### Step 1: Force Sync Tasks from Jira
Open browser console (F12 → Console tab) and run:
```javascript
syncTasks()
```
Wait 20-30 seconds for completion. Should see toast: "Synced X Jira tasks"

### Step 2: Verify Tasks Are Loaded
In console, run:
```javascript
console.log('Total tasks loaded:', tasks.length)
```

**If result is 0:** Jira sync failed, check Jira credentials
**If result > 0:** Tasks loaded successfully ✓

### Step 3: Check What Happened
In console, run:
```javascript
diagnosticStrategyTaskMatching()
```

This shows:
- ✅ Which events matched to tasks
- ❌ Which events failed to match
- 💡 Why they failed

### Step 4: Fix Unmatched Events

**Option A: Auto-fix (if matching is close)**
- Reload page - should auto-match with new algorithm
- Run `diagnosticStrategyTaskMatching()` again

**Option B: Manual fix**
1. Click an unmatched event in calendar
2. Find "Search Jira Tasks" field
3. Type task name
4. Select from dropdown
5. Save event - now linked to Jira task

**Option C: Rename event to match Jira exactly**
1. Click event to edit
2. Change title to exactly match Jira task title
3. Click event again - should now match automatically

---

## Common Issues & Solutions

### ❌ Issue: "Total tasks loaded: 0"
**Cause:** Jira sync failed or hasn't run
**Fix:**
```javascript
syncTasks()  // Run again
```

### ❌ Issue: Tasks show but specific client's tasks missing
**Cause:** Client name mismatch or tasks not created for client
**Fix:**
```javascript
// Check client names:
console.log('Custom Clients:', customClients)

// Check if tasks exist for client:
console.log(tasks.filter(t => t.client === 'Ashmithasree'))
```

### ❌ Issue: Event created but no task appearing
**Cause:** Title doesn't match Jira task closely enough
**Fix 1 - Use exact Jira ID:**
- Edit event title to: `JUN-123: Your Event Name`
- Replace JUN-123 with actual task ID
- Save - should auto-match

**Fix 2 - Manual selection:**
- Edit event
- Use "Search Jira Tasks" field
- Select correct task from list
- Save

### ❌ Issue: "diagnosticStrategyTaskMatching is not defined"
**Cause:** Page not fully loaded or code not deployed
**Fix:**
```javascript
// Reload page
location.reload()

// Then try again:
diagnosticStrategyTaskMatching()
```

---

## Verification Checklist

Before reporting issue, verify:

- [ ] `syncTasks()` completed successfully (saw success toast)
- [ ] `tasks.length > 0` (tasks are loaded)
- [ ] Ran `diagnosticStrategyTaskMatching()` (saw diagnostic output)
- [ ] Event title closely matches Jira task title
- [ ] Client name in event matches CLIENTS array
- [ ] Tried manual task selection in event modal

---

## When To Use Each Matching Method

### Use **Exact Jira ID** when:
- You want guaranteed match
- Jira task ID is `JUN-123`
- Title format: `JUN-123: Campaign Launch`

### Use **Auto-match** when:
- Jira task title is very close to event title
- Example: Event "Q2 Planning" matches "Q2 Campaign Planning" (67% match)

### Use **Manual selection** when:
- Title doesn't match well
- Multiple similar tasks exist
- You want to be 100% sure of the match

---

## Testing It Works

### Quick Test
```javascript
// 1. Load tasks
syncTasks()

// 2. Create test event (check current month):
const today = new Date()
const dateStr = today.getFullYear() + '-' + 
                String(today.getMonth()+1).padStart(2,'0') + '-' +
                String(today.getDate()).padStart(2,'0')

// 3. Create event with title matching a real task:
// Go to calendar, click a date, create event titled exactly like a Jira task

// 4. Verify match:
diagnosticStrategyTaskMatching()
// Should show your event as ✅ MATCHED
```

---

## Need More Help?

### For Debugging
- Open `ROOT_CAUSE_MISSING_JIRA_TASKS.md` for detailed technical info
- Use `diagnosticStrategyTaskMatching()` for detailed analysis

### For Manual Matching
- Edit event in Strategy Calendar
- Use "Search Jira Tasks" dropdown field
- Select task explicitly

### For Bulk Issues
- Check if Jira sync completed: `tasks.length`
- Check client names: `console.log(customClients)`
- Run diagnostic: `diagnosticStrategyTaskMatching()`

---

## Console Commands Summary

```javascript
// ESSENTIAL
syncTasks()                              // Load tasks from Jira
diagnosticStrategyTaskMatching()         // Show what matched/didn't match
tasks.length                             // Count tasks loaded

// DIAGNOSTIC
debugStrategyCalendar()                  // Show calendar stats
console.log(customClients)               // Show available clients
console.log(tasks.slice(0, 5))          // Show first 5 tasks

// TESTING
createStrategyTestData()                 // Create sample events for testing
```

---

## Expected Results

✅ After fix:
- More tasks appear automatically in calendar
- Events show matched Jira status and assignee
- Diagnostic clearly shows matched/unmatched events
- Manual task selection available for edge cases

✅ You should see:
- No "0 tasks" in unmatched events
- Client tasks appearing when selected
- Task status synchronized from Jira
- Clear diagnostic output showing matches
