# Phase 4: Carry-Forward Automation - Implementation Complete

## Overview
Phase 4 of the Monthly Team Plan feature implements automated and manual carry-forward logic for unfinished tasks. This automation ensures that tasks with "Shoot Needed" status or other incomplete statuses automatically move to the next day, maintaining work continuity.

## Commit
**Commit Hash**: `e3eb979`
**Commit Message**: "Phase 4: Implement carry-forward automation with manual and daily transition logic"

## Implemented Features

### 1. **Carry-Forward Configuration & Status Mapping**
- **File**: `index.html` (lines 33692-33699)
- **Description**: Centralized configuration for carry-forward rules
- **Key Properties**:
  - `maxCarryCount`: 5 (max times a task can be carried)
  - `transitionTime`: '18:00' (6 PM end-of-day trigger)
  - Status categorization into 3 groups:
    - Not Completed (Red): to do, shoot needed, content in progress, client content approval, design to do, design in progress, rework designs, thumbnail waiting, design hold
    - Completed (Green): quality check, design completed, client sent, client approved
    - Posted (Blue): posted, analytics, done

### 2. **Carry-Forward Eligibility Logic**
**Function**: `shouldTaskCarryForward(task)`
- **Location**: Lines 33701-33729
- **Logic**:
  - "Shoot Needed" status → ALWAYS carries forward
  - "Design Hold" or marked "On Hold" → do NOT carry forward
  - Other NOT_COMPLETED statuses → carry forward
  - Completed/Posted statuses → do NOT carry forward
- **Returns**: boolean indicating if task should carry forward

### 3. **Carry-Forward Count Tracking**
**Function**: `getTaskCarryForwardCount(taskId)`
- **Location**: Lines 33731-33745
- **Description**: Queries Firebase carry_forward_log to get count of active carry-forward entries
- **Firebase Path**: `worksync/carry_forward_log`
- **Query**: Searches by taskId and filters for status = 'active'
- **Returns**: Integer count (0 if not found or error)

### 4. **Carry-Forward Log Entry Creation**
**Function**: `createCarryForwardLogEntry(taskId, fromDate, toDate, reason, carryCount)`
- **Location**: Lines 33747-33769
- **Purpose**: Creates audit trail for each carry-forward operation
- **Firebase Structure**:
  ```javascript
  {
    id: "CF-{timestamp}-{random}",
    taskId: taskId,
    fromDate: "2026-07-01",
    toDate: "2026-07-02",
    reason: "shoot_needed" | "pending" | "incomplete" | "manual",
    carryCount: 1-5,
    createdBy: currentUser.email,
    createdAt: timestamp,
    status: "active" | "completed" | "cancelled"
  }
  ```
- **Firebase Path**: `worksync/carry_forward_log/{logId}`

### 5. **Automated Daily Transition (End-of-Day Job)**
**Function**: `performDailyTransition(dateStr)`
- **Location**: Lines 33771-33835
- **Description**: Runs at end of day (configurable 6 PM) to automatically carry forward tasks
- **Process**:
  1. Iterates through all tasks
  2. Checks if task was assigned to the transition date
  3. Evaluates if task should carry forward using `shouldTaskCarryForward()`
  4. Checks against max carry-forward limit (5)
  5. Creates carry-forward log entry
  6. Updates daily plan for next date in Firebase
  7. Sends notifications to affected team members
- **Returns**: `{ success: true, transitionCount: number, affectedTasks: array }`
- **Firebase Operations**:
  - Updates `worksync/daily_plans/{email}/{taskId}` with new date and carry info
  - Creates entry in `worksync/carry_forward_log`

### 6. **Carry-Forward Notifications**
**Function**: `sendCarryForwardNotifications(affectedTasks, fromDate, toDate)`
- **Location**: Lines 33837-33875
- **Description**: Sends in-app notifications to affected team members
- **Notification Format**:
  ```javascript
  {
    id: "CF-{timestamp}-{random}",
    type: "carry_forward",
    message: "{count} task(s) carried forward from {fromDate} to {toDate}",
    fromDate: "2026-07-01",
    toDate: "2026-07-02",
    taskCount: number,
    createdAt: timestamp,
    read: false
  }
  ```
- **Firebase Path**: `worksync/notifications/{email}/{notificationId}`
- **Grouping**: Groups tasks by assignee to create single notification per user

### 7. **Manual Carry-Forward Trigger (Manager Control)**
**Function**: `manuallyCarryForwardTask(taskId, fromDate, toDate)`
- **Location**: Lines 33877-33937
- **Access**: Admin/Manager only
- **Process**:
  1. Validates task exists
  2. Validates date range (toDate > fromDate)
  3. Checks task eligibility for carry-forward
  4. Enforces max carry-forward limit
  5. Creates carry-forward log entry
  6. Updates daily plan
  7. Sends success notification
  8. Refreshes Monthly Plan UI if open
- **Returns**: boolean (true on success, false on failure)
- **Error Handling**: Toast notifications for validation failures

### 8. **Carry-Forward History Retrieval**
**Function**: `getTaskCarryForwardHistory(taskId)`
- **Location**: Lines 33939-33953
- **Description**: Retrieves complete carry-forward timeline for a task
- **Query**: Searches `worksync/carry_forward_log` by taskId
- **Sorting**: By createdAt descending (newest first)
- **Returns**: Array of carry-forward entries

### 9. **Carry-Forward History Modal**
**Function**: `openCarryForwardHistoryModal(taskId)`
- **Location**: Lines 33955-34009
- **Description**: Displays modal showing:
  - Task details (ID, title, assignee)
  - Chronological carry-forward history (newest first)
  - Each entry shows: source date, target date, reason, performed by, timestamp
  - Current status with carry count
  - "Carry Forward to Tomorrow" button for admins (if under max limit)
- **UI Features**:
  - Scrollable history list (max-height 300px)
  - Color-coded reason badges
  - Admin-only quick carry-forward action
  - Close button with automatic modal cleanup

### 10. **Enhanced Task Context Menu**
**Function**: `openMonthlyPlanTaskMenu(event, taskId)` (Updated)
- **Location**: Lines 34011-34047
- **New Options**:
  - "Carry Forward to Tomorrow" (Admin only) - Carries task forward by 1 day
  - "View History" (All users) - Opens carry-forward history modal
  - "Close" - Closes context menu
- **Implementation**: Context menu appears at cursor position with hover effects
- **Auto-cleanup**: Menu removes itself when clicking outside or on another element

## Integration Points

### Firebase Collections Used
- **`worksync/carry_forward_log`**: Stores all carry-forward operations with full audit trail
- **`worksync/daily_plans/{email}/{taskId}`**: Updated with carry information
- **`worksync/notifications/{email}/{id}`**: Sends notifications to affected users

### Permission Model
- **Daily Transition**: Admin only (scheduled background job)
- **Manual Carry-Forward**: Admin/Manager only (via UI button)
- **View History**: All team members (read-only)

### Data Dependencies
- Uses existing `tasks` array
- Uses existing `allUsersMap` for user lookups
- Uses existing `currentUser` for permission checks
- Uses existing `isAdmin()` permission function
- Uses Firebase `ref()`, `get()`, `query()`, `set()`, `update()` functions

## Testing Checklist

- [ ] Task with "Shoot Needed" status carries forward automatically
- [ ] Tasks with "Design Hold" do NOT carry forward
- [ ] Tasks with "Completed" or "Posted" do NOT carry forward
- [ ] Carry-forward count increments correctly
- [ ] Max carry-forward limit (5) is enforced
- [ ] Manual carry-forward updates daily plan in Firebase
- [ ] Carry-forward history displays correctly with chronological order
- [ ] Notifications sent to affected team members
- [ ] Context menu appears on task row hover
- [ ] Admins can manually carry forward tasks
- [ ] Non-admins cannot see manual carry-forward button
- [ ] Monthly Plan UI refreshes after manual carry-forward
- [ ] Firebase audit trail created for each carry-forward

## Next Steps (Phase 5)

The next phase will implement:
1. **Bulk Operations** - Multi-select and batch operations
2. **Advanced Filtering** - Filter by status, date, member
3. **Undo Capability** - Revert carry-forward operations
4. **Workspace Integration** - Link with other project features

## Files Modified

- `index.html`:
  - Added Phase 4 functions (500+ lines)
  - Updated `renderMonthlyPlanTaskRow()` to use enhanced context menu
  - Added Phase 4 functions to global `window` scope
  - Integrated carry-forward with existing Monthly Plan UI

## Known Limitations

1. **Daily Transition Scheduling**: Currently requires manual trigger via `performDailyTransition()` - needs separate Cloud Function or server-side scheduler
2. **Real-time Updates**: Carry-forward updates are created but may not be reflected in UI until page refresh
3. **Batch Operations**: Cannot carry forward multiple tasks at once (Phase 5 feature)
4. **Historical Carry-Forward**: Cannot edit or undo past carry-forward entries yet

## Performance Considerations

- Carry-forward count lookup uses Firebase query (O(n) on first load, indexed after)
- History modal query filters by taskId (efficient with proper indexing)
- Notification creation happens in loop (consider batching for 50+ tasks)
- No pagination on history modal (typically < 10 entries per task)

## Security Notes

- All carry-forward operations check `isAdmin()` before executing
- Carry-forward log is created with current user email for audit trail
- Firebase rules should restrict `carry_forward_log` to admins for creation
- Manual carry-forward only available to admins (UI + permission check)

