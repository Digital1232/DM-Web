# Strategy Calendar - Quick Reference Console Commands

## Open Console
**F12** → Click **Console** tab

---

## The 3 Essential Commands

### 1️⃣ Load Tasks from Jira
```javascript
syncTasks()
```
**Wait 20-30 seconds for:** `Synced X Jira tasks` ✓

### 2️⃣ Check What Matched
```javascript
diagnosticStrategyTaskMatching()
```
**Look for:**
- ✅ MATCHED EVENTS: (number)
- ❌ UNMATCHED EVENTS: (number)

### 3️⃣ Verify Success
```javascript
tasks.length
```
**Should show:** A number > 0 (number of tasks loaded)

---

## Expected Output

### ✅ SUCCESS
```
✅ MATCHED EVENTS: 12
❌ UNMATCHED EVENTS: 0
📊 Total tasks: 247
```

### ⚠️ NEEDS FIXING
```
✅ MATCHED EVENTS: 10
❌ UNMATCHED EVENTS: 2
📊 Total tasks: 247
```
→ Use manual task selection for the 2 unmatched events

### ❌ PROBLEM
```
📊 Total tasks: 0
```
→ Jira sync failed, check Jira credentials

---

## Common Issues Quick Fix

| Issue | Command | Expected Result |
|-------|---------|-----------------|
| Tasks not showing | `syncTasks()` | Wait 30s for success toast |
| Want to verify fix | `diagnosticStrategyTaskMatching()` | See matched/unmatched count |
| Check tasks loaded | `tasks.length` | Should show number > 0 |
| See first 5 tasks | `tasks.slice(0,5)` | Shows task ID and titles |
| Check client names | `console.log(customClients)` | Shows available clients |
| Debug specific match | `findMatchedStrategyTask("title", "desc", null, true)` | Shows match/no-match reason |

---

## For Unmatched Events

### Option 1: Auto-match (Simplest)
1. Reload page (F5)
2. Run diagnostic again
3. New algorithm might catch it

### Option 2: Manual link (Most reliable)
1. Click event in calendar
2. Find "Search Jira Tasks" field
3. Type task name
4. Click task from dropdown
5. Save

### Option 3: Use exact ID (Guaranteed)
1. Edit event title
2. Change to: `JUN-123: Your Event Name`
3. Replace JUN-123 with task ID
4. Save - will auto-match

---

## Testing It Works

```javascript
// First, sync:
syncTasks()

// Wait 30 seconds, then:
diagnosticStrategyTaskMatching()

// Scroll output to see:
// ✅ MATCHED EVENTS: [number]
// ❌ UNMATCHED EVENTS: [number]

// If mostly matched → WORKING ✓
// If many unmatched → See "For Unmatched Events" section above
```

---

## Emergency Commands

```javascript
// Check EVERYTHING about task matching
console.log('Tasks:', tasks.length)
console.log('Events:', Object.keys(strategyEvents).length)
console.log('Clients:', customClients)

// Try matching a specific event
const event = Object.values(strategyEvents)[0]
console.log('Event:', event)
findMatchedStrategyTask(event.title, event.desc, event.jiraId, true)

// Create test data to verify system works
createStrategyTestData()

// Full diagnostic (most detailed)
diagnosticStrategyTaskMatching()
```

---

## Copy-Paste Ready

### Test Everything (Paste this all at once)
```javascript
syncTasks();
console.log('Syncing... wait 30 seconds, then run the next command');
```

**After 30 seconds, paste:**
```javascript
diagnosticStrategyTaskMatching()
```

### Minimal Test (Just check if working)
```javascript
tasks.length > 0 ? console.log('✅ Tasks loaded: ' + tasks.length) : console.log('❌ No tasks')
```

### Debug Specific Event (For problem cases)
```javascript
const ev = Object.values(strategyEvents)[0];
console.log('Debugging:', ev.title);
findMatchedStrategyTask(ev.title, ev.desc, ev.jiraId, true);
```

---

## What Each Output Means

| Output | Meaning | Action |
|--------|---------|--------|
| `tasks.length = 0` | Tasks not synced from Jira | Run `syncTasks()` |
| `tasks.length > 0` | Tasks loaded successfully | Continue testing |
| `MATCHED EVENTS: X` | X events found matching tasks | Good - tasks showing |
| `UNMATCHED EVENTS: X` | X events without matching tasks | Use manual selection or adjust titles |
| `[findMatchedStrategyTask] ✅ Matched by...` | Match succeeded | Task will show in calendar |
| `[findMatchedStrategyTask] ❌ ...` | Match failed | Event won't show task status |

---

## If You Get An Error

### "diagnosticStrategyTaskMatching is not defined"
**Fix:** Reload page (F5) and try again

### "syncTasks is not defined"
**Fix:** Reload page (F5) and try again

### "Cannot read property 'length' of undefined"
**Fix:** Run `syncTasks()` first to load tasks

### Other error
**Fix:** Open browser console (F12) and check red error messages

---

## Performance Guide

| Command | Time | What to expect |
|---------|------|---|
| `syncTasks()` | 20-30s | "Synced X tasks" toast message |
| `diagnosticStrategyTaskMatching()` | 1-2s | Detailed console output |
| `tasks.length` | Instant | Number appears in console |
| Page reload | 2-3s | Page reloads with new code |

---

## Final Checklist

- [ ] Opened console (F12)
- [ ] Ran `syncTasks()`
- [ ] Waited 30 seconds
- [ ] Ran `diagnosticStrategyTaskMatching()`
- [ ] Checked output for matched/unmatched counts
- [ ] Tasks are showing in calendar ✓

---

## One-Minute Test

```
STEP 1: F12 → Console
STEP 2: Paste and run: syncTasks()
STEP 3: Wait 30 seconds
STEP 4: Paste and run: diagnosticStrategyTaskMatching()
STEP 5: Look for: ✅ MATCHED EVENTS: [number]
STEP 6: If > 0, then working ✓
```

---

## Bookmark This For Later

- Save this file
- Use these commands whenever testing
- Share with team members
- Reference when troubleshooting

**All commands are safe** - Read only, no data modification.
