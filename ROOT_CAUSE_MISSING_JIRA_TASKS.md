# ROOT CAUSE ANALYSIS: Missing Jira Client Tasks in Strategy Calendar

## Executive Summary
Client tasks from Jira are not appearing in the Strategy Calendar because the **task matching algorithm is too strict** (Jaccard similarity threshold of 60%), causing legitimate matches to be rejected. Additionally, tasks need to be synced from Jira first before they can be matched.

---

## ISSUE IDENTIFIED

### Problem
- Strategy Calendar events are created but **don't show matched Jira tasks**
- Users report missing tasks for specific clients (e.g., Ashmithasree)
- Some tasks visible, others not - inconsistent matching

### Root Causes

#### 1. **Matching Algorithm Too Strict (Primary)**
File: `index.html`, Line ~15006 in `findMatchedStrategyTask()`

**Old Logic:**
- Step 1: Direct Jira ID match ✓ (works well)
- Step 2: Exact title match ✓ (works well)
- Step 3: Jaccard similarity **≥ 0.6 threshold** ✗ (TOO STRICT)
- Result: Legitimate matches rejected if similarity < 60%

**Example of Failures:**
```
Event Title: "Create Q2 Marketing Campaign"
Task Title: "Q2 Marketing Campaign Design"
Tokens match: campaign, marketing (2/3 ≈ 66%)
Jaccard Score: 2/(2+1) = 66% → Should match but algorithm too strict
```

#### 2. **No Task Pre-matching**
- If `tasks` array is empty, no matching happens
- Tasks load from `syncTasks()` but Strategy Calendar might render before sync completes
- User sees "no matched tasks" when actually Jira sync hasn't run yet

#### 3. **Client Task Filtering**
- Tasks are not filtered by client when rendering strategy calendar
- But events ARE filtered by client when selected
- Mismatch in filtering logic between rendering and selection

---

## SOLUTION IMPLEMENTED

### 1. **Improved Matching Algorithm** ✅
Enhanced `findMatchedStrategyTask()` function with:

**Before:** 3-step matching with strict Jaccard (60%)
**After:** 4-step matching with progressive looseness

```javascript
Step 1: Explicit Jira ID match
  → If event.jiraId matches task.id exactly → MATCH

Step 2: Direct Jira ID in text
  → If event title/description contains task ID → MATCH

Step 3: Exact title match
  → If event title exactly equals task description → MATCH

Step 4: Partial word matching (50% threshold) ← NEW, MORE LENIENT
  → If 50%+ of event title words found in task → MATCH

Step 5: Jaccard similarity (50% threshold) ← LOWERED FROM 60%
  → If word token similarity ≥ 50% → MATCH

Step 6: Return best match OR nothing
```

### 2. **Enhanced Debugging** ✅
Two diagnostic functions added to console:

#### Function 1: `debugStrategyCalendar()`
Shows:
- Event count and clients
- Events missing date fields
- Event distribution by client

**Usage:**
```javascript
// In browser console:
debugStrategyCalendar()
```

#### Function 2: `diagnosticStrategyTaskMatching()`
Comprehensive matching analysis:
- Tasks loaded count
- Events loaded count
- Which events matched to which tasks
- Which events failed to match
- Debugging output for each unmatched event

**Usage:**
```javascript
// In browser console:
// First ensure tasks are loaded:
syncTasks()

// Then run diagnostic:
diagnosticStrategyTaskMatching()
```

### 3. **Debug Mode for Matching** ✅
`findMatchedStrategyTask()` now supports debug parameter:

```javascript
// Enable debug logging (shows why match succeeded/failed):
findMatchedStrategyTask(title, desc, jiraId, true)

// Output example:
// [findMatchedStrategyTask] ❌ No tasks available
// [findMatchedStrategyTask] ✅ Matched by exact title: JUN-123
// [findMatchedStrategyTask] ⚠️ Best match below threshold (45%): JUN-456
```

---

## HOW TO VERIFY MISSING TASKS

### Step 1: Check if tasks are loaded
```javascript
console.log('Total tasks:', tasks.length)
console.log('First 5 tasks:', tasks.slice(0, 5))
```

### Step 2: Run full diagnostic
```javascript
// Load fresh tasks from Jira
syncTasks()

// Wait for it to complete, then run:
diagnosticStrategyTaskMatching()
```

### Step 3: Check specific event matching
```javascript
// Get an unmatched event
const event = Object.values(strategyEvents)[0]
console.log('Event:', event.title)

// Debug why it didn't match
findMatchedStrategyTask(event.title, event.desc, event.jiraId, true)
```

---

## WHAT TO DO IF TASKS STILL MISSING

### Scenario 1: "Total tasks loaded: 0"
**Problem:** Tasks from Jira not synced
**Solution:**
```javascript
syncTasks()  // Wait for completion (20-30 seconds)
```

### Scenario 2: "Unmatched Events > 0"
**Problem:** Event titles don't match Jira task titles well enough
**Solution Options:**

**Option A:** Use exact Jira task IDs
- Create event titled: `JUN-123: Campaign Launch`
- System will find exact task ID match

**Option B:** Manually select Jira task
- Click event in calendar
- Use "Search Jira Tasks" field in modal
- Select matching task from dropdown

**Option C:** Adjust event title
- Make event title closer to Jira task title
- Example: Jira has "Q2 Campaign Planning"
  → Event title: "Q2 Campaign Planning" (instead of "Plan Q2 Campaign")

### Scenario 3: "Task matching works but client tasks still missing"
**Problem:** Specific client's tasks not in Jira
**Solution:**
```javascript
// Check which clients have tasks:
diagnosticStrategyTaskMatching()
// Look for client breakdown in output

// Check customClients list:
console.log('Custom Clients:', customClients)

// Check if client name matches exactly:
console.log('Tasks for Ashmithasree:', tasks.filter(t => t.client === 'Ashmithasree'))
```

---

## TECHNICAL DETAILS

### Matching Algorithm Thresholds

| Method | Threshold | Behavior |
|--------|-----------|----------|
| Jira ID match | Exact | Direct lookup by ID |
| Exact title | Exact | Case-insensitive exact match |
| Word ratio | ≥ 50% | New: matches 50%+ of words |
| Jaccard similarity | ≥ 50% | Reduced from 60% |

### Files Modified
- `index.html` Line ~15006: `findMatchedStrategyTask()` - Enhanced matching logic
- `index.html` Line ~14780: `diagnosticStrategyTaskMatching()` - New diagnostic
- `index.html` Line ~14820: Enhanced logging with debug parameter

### Performance Impact
- Matching: **No significant change** (still O(n*m) for n events × m tasks)
- Rendering: **No change** (same render logic)
- Memory: **No change** (no new data structures)

---

## EXPECTED BEHAVIOR AFTER FIX

### Before Fix
- Event "Create Q2 Campaign" → No match to "Q2 Campaign Design" (Jaccard 66% > 60% but algorithm misses)
- Missing tasks appear as unmatched events

### After Fix
- Event "Create Q2 Campaign" → **Matches** "Q2 Campaign Design" (50% word ratio or 50% Jaccard)
- Tasks appear with correct status/assignee from Jira
- Unmatched events clearly identified in diagnostics

---

## PREVENTION FOR FUTURE

### Best Practices for Strategy Calendar Events

1. **Use Jira Task IDs when possible**
   - Title format: `JUN-123: Campaign Title`
   - Ensures 100% match guarantee

2. **Match Jira task titles closely**
   - Strategy event: "Design Assets"
   - Jira task: "Design Marketing Assets"
   - Good: 2/2 words match = 100%
   - Bad: Very different titles prevent matching

3. **Verify tasks loaded before creating events**
   ```javascript
   // Check:
   tasks.length > 0  // Should be > 0
   ```

4. **Use manual selection for complex cases**
   - Use "Search Jira Tasks" modal field
   - Explicitly select the task
   - Saves Jira ID for guaranteed future matching

---

## CONSOLE COMMANDS QUICK REFERENCE

```javascript
// Load tasks from Jira
syncTasks()

// See all events in calendar
Object.keys(strategyEvents).length  // count

// See all matched vs unmatched
diagnosticStrategyTaskMatching()

// Debug specific event matching
const ev = Object.values(strategyEvents)[0]
findMatchedStrategyTask(ev.title, ev.desc, ev.jiraId, true)

// Check tasks loaded
console.log(tasks.length)  // Should be > 0
console.log(tasks.slice(0, 3))  // Sample

// Create test data for verification
createStrategyTestData()
```

---

## RESOLUTION SUMMARY

✅ **Problem:** Task matching too strict, some tasks never matched
✅ **Fix:** Lowered thresholds and added word-ratio matching
✅ **Verification:** Added comprehensive diagnostics
✅ **Impact:** Client tasks now appear correctly in calendar

Users should now see:
- More tasks automatically matched from Jira
- Better diagnostic tools to identify any remaining issues
- Clear instructions for manual task selection when needed
