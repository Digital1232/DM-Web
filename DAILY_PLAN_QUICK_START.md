# Daily Plan Assignment - Quick Start Guide

## What Was Fixed

Enhanced the Daily Plan Assignment feature with:
- ✓ Better selection toggle (click to select/deselect)
- ✓ Console logging for debugging
- ✓ Clear error messages
- ✓ Debug utility function

## How to Use (Normal User)

### Step 1: Open the Modal
- Click on the Daily Plan feature
- Click "Assign Tasks to Plan" or similar button
- The "Assign Task to Daily Plan" modal opens

### Step 2: Select Tasks
- **Click a task** in the list to select it
  - Selected tasks show with a blue ring/highlight
  - Task appears in "Selected Tasks" section at bottom
- **Click again** to deselect
- Select as many as you need

### Step 3: Set Assignment Details
- **Assign To**: Choose which user gets these tasks
- **Plan Date**: Pick the date for the plan

### Step 4: Submit
- Click **"Assign to Plan"** button
- Button will show "Assigning..." while processing
- Success message appears when complete

## What Changed

### For Users
- Tasks now toggle select/deselect on click (instead of using checkboxes)
- Better visual feedback (blue ring when selected)
- Tasks show in "Selected Tasks" section as you select them
- Clearer error messages

### For Support/Debugging
- Console now logs all actions for debugging
- New debug function available: `debugDailyPlanAssignment()`
- Better error tracking throughout the process

## If Something Isn't Working

### Check 1: Are Tasks Selectable?
1. Open modal
2. Click any task
3. Open browser console (F12)
4. Look for messages like: `[Daily Plan] Task selected: TASK-123, Total selected: 1`

**If you see those logs:** Selection is working ✓
**If you don't see logs:** There may be a JavaScript error (check console for red text)

### Check 2: Do Tasks Stay Selected?
1. Select a task
2. Type in the search box to filter
3. Does the task still appear selected when list re-renders?

**If yes:** Everything is working ✓
**If no:** Clear browser cache and hard-refresh (Ctrl+Shift+R)

### Check 3: Can You Submit?
1. Select a task
2. Pick a user
3. Pick a date
4. Click "Assign to Plan"
5. Check browser console (F12)

**You should see**:
```
[Daily Plan] submitAssignPlan called. Selected tasks: 1
[Daily Plan] Assigning to user: email@example.com, Date: 2026-07-20
[Daily Plan] Firebase write successful!
```

**If you see these logs:** Submission is working ✓
**If you see errors:** Check the error message in console

## Keyboard Shortcut to Debug

Press **F12** to open browser console, then type:
```javascript
debugDailyPlanAssignment()
```

This will show you the current state of all selections.

## Common Questions

**Q: How do I select multiple tasks?**
A: Just keep clicking tasks. Each click toggles the selection. All selected tasks appear in the "Selected Tasks" section.

**Q: Can I search for tasks while keeping selections?**
A: Yes! Type in the search box. Your selections will be remembered when you filter.

**Q: What if I accidentally select the wrong task?**
A: Click it again to deselect, or click the × button next to it in the "Selected Tasks" section.

**Q: Does the selection save if I close the modal?**
A: No, selections are cleared when you open the modal fresh next time.

**Q: What if the page crashes?**
A: Hard refresh your browser (Ctrl+Shift+R) and try again.

## Support Information

If you experience issues, provide:
1. Browser type and version
2. Console output (F12 → Console tab)
3. The exact steps you took
4. Screenshot of the error (if any)

Then refer to `DAILY_PLAN_ASSIGNMENT_DEBUG.md` for detailed troubleshooting.
