# Daily Completed Tasks - Test Checklist

## Pre-Test Setup
- [ ] Open browser DevTools (F12)
- [ ] Go to Console tab
- [ ] Leave console open while testing

## Test 1: Tab Click & Initial Load
- [ ] Navigate to Task Hub (Dashboard > Click "Tasks Hub")
- [ ] Click "Today's Completed" tab button
- [ ] Console should show logs starting with `[CompletedTasks]`
- [ ] **Expected**: Task list appears (or "No completed tasks" message)
- [ ] **NOT expected**: Red error message

### Console Output Expected:
```
[CompletedTasks] Starting load, tasks array: X
[CompletedTasks] Admin viewing all tasks: X (or appropriate message)
[CompletedTasks] Sample task: {...}
[CompletedTasks] Found completed tasks: Y
```

## Test 2: KPI Cards
- [ ] Verify KPI cards display numbers (not errors)
- [ ] **Expected metrics**:
  - Completed Tasks: Count of tasks completed
  - Clients Worked: Number of unique clients
  - Hours: Total hours/minutes worked
  - Avg Time: Average time per task

## Test 3: Date Range Buttons
- [ ] Click "Today" button
  - Console should show date range starting today
- [ ] Click "Yesterday" button
  - Console should show different date range
  - Task list should update
- [ ] Click "This Week" button
  - Should show current week range
  - Task list should update
- [ ] Click "Custom" button
  - Should show date picker (if implemented)

## Test 4: Search Functionality
- [ ] In the search box, type part of a task name
- [ ] Task list should filter to matching tasks
- [ ] Clear search box - all tasks should reappear

## Test 5: Admin Features (if admin)
- [ ] Look for "All Employees" filter dropdown
- [ ] Click to expand - should show list of employees
- [ ] Select a specific employee
  - Task list should filter to that employee's tasks only
  - KPIs should update
- [ ] Select "All Employees" again
  - Should show all employees' completed tasks

## Test 6: Task Display
- [ ] Each task should show:
  - [ ] Task name/description
  - [ ] Task ID
  - [ ] Completion time
  - [ ] Duration (or "No duration")
  - [ ] Status badge (should show "Done")
- [ ] Tasks should be grouped by client
- [ ] Each client group should show count

## Test 7: Collapse/Expand Groups
- [ ] Click on a client group header
- [ ] Group should collapse/expand
- [ ] Arrow icon should rotate

## Test 8: No Results Cases
- [ ] Select a date range with no completed tasks
- [ ] Should show: "No completed tasks found for this date range"
- [ ] Should NOT show error message
- [ ] KPIs should show 0 values

## Test 9: Right Sidebar (if visible)
- [ ] "Today's Summary" section should show:
  - [ ] Total tasks completed
  - [ ] Total time worked
  - [ ] Average time per task
  - [ ] Completion percentage (100%)
- [ ] "AI Daily Summary" should have helpful text
- [ ] Statistics should update based on selected date range

## Test 10: Page Navigation
- [ ] From "Today's Completed" tab:
  - [ ] Click another tab (e.g., "Jira Tasks")
  - [ ] Click back to "Today's Completed"
  - [ ] Tab should reload fresh data
  - [ ] Should NOT show cached/stale data

## Test 11: Browser Console - Data Structure
- [ ] Look at console logs
- [ ] Verify sample task shows fields:
  - [ ] `id` or `key` (task identifier)
  - [ ] `desc` or `summary` (task name)
  - [ ] `status` (task status)
  - [ ] `client` (project/client)
  - [ ] One of: `completedAt`, `updatedAt`, `duedate`, `createdAt`
  - [ ] `duration` or `estimatedHours` (optional)

## Test 12: Export Features (if buttons visible)
- [ ] Click "Export PDF" button
  - [ ] Should show message or start download (implementation pending)
- [ ] Click "Export Excel" button
  - [ ] Should show message or start download (implementation pending)

## Known Limitations / Expected Behavior

- **Export PDF/Excel**: Currently shows "coming soon" message (feature not yet implemented)
- **Custom Date Range**: Date picker UI not yet implemented
- **No Duration**: If task lacks duration data, displays "No duration" instead of time
- **Empty State**: When no tasks match filters, shows friendly message with icon

## Issues to Report

If you encounter:

1. **Red Error Message**:
   - Note the exact error text
   - Copy the console output with `[CompletedTasks]` logs
   - Report this

2. **Tasks Not Showing but Array Has Data**:
   - Check console for status values
   - Verify if they're in the completed status list
   - Report the status values seen

3. **Wrong Dates**:
   - Report which date field should have been used
   - Provide example task data

4. **Incorrect Duration**:
   - Check if tasks have duration data
   - Report the field names seen in console

## Success Criteria

✅ **All tests pass when**:
1. Tab loads without errors
2. KPI cards show numbers
3. Task list displays completed tasks
4. Date range filters work
5. Search filters tasks
6. No red error messages
7. Console shows only `[CompletedTasks]` info logs (no errors)

## Recovery Steps If Issues Occur

1. **Hard refresh page**: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
2. **Clear browser cache**: Clear all cache, reload
3. **Check console for errors**: Report any red error messages
4. **Try different date ranges**: See if any show tasks
5. **Try different employees** (if admin): See if pattern emerges
