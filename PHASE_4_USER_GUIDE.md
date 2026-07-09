# Phase 4: Carry-Forward Automation - User Guide

## Overview
Phase 4 adds automatic and manual carry-forward functionality to the Monthly Team Plan. Tasks that aren't completed are automatically carried forward to the next day, ensuring nothing falls through the cracks.

## For Team Members

### Viewing Carry-Forward History
1. Go to **Monthly Plan** view
2. Click on any date to expand the day detail panel
3. Find a task in the "New Tasks" or "Carry Forward" sections
4. Click the **⋯ (menu)** button on the task row
5. Select **"View History"**
6. See the complete carry-forward timeline with dates and reasons

### Understanding Task Status

**Tasks that carry forward (Red status):**
- Shoot Needed
- Content In Progress
- Design To Do
- Design In Progress
- Rework Designs
- Thumbnail Waiting
- Client Content Approval
- To Do

**Tasks that do NOT carry forward:**
- ✓ Completed (Green)
- ✓ Posted (Blue)
- 🔒 Design Hold (won't carry even if incomplete)
- 🔒 Marked as "On Hold"

### Notification About Carry-Forwards
When tasks are carried forward at end-of-day, you'll receive a notification showing:
- Number of tasks carried forward
- Date range (from → to)

## For Managers/Admins

### Manual Carry-Forward (Admin Only)
1. Go to **Monthly Plan** view
2. Click on any date to expand the day detail panel
3. Find a task you want to manually carry forward
4. Click the **⋯ (menu)** button on the task row
5. Select **"Carry Forward to Tomorrow"**
6. Task will be moved to tomorrow's daily plan

**Restrictions:**
- Can only manually carry forward incomplete tasks
- Cannot exceed 5 carry-forwards per task
- Requires Admin permission

### Automating Daily Transitions
**To run the automated daily transition (typically at 6 PM):**

```javascript
// Run this at end of day for the target date
await performDailyTransition('2026-07-15');

// Or for today:
await performDailyTransition(todayIso());
```

**What happens automatically:**
1. System scans all tasks assigned for that day
2. Identifies tasks that are incomplete
3. Checks carry-forward eligibility
4. Moves unfinished tasks to tomorrow
5. Creates audit log entry
6. Sends notifications to affected team members

### Viewing Carry-Forward Statistics
In the Monthly Plan **Workload Dashboard** (right sidebar):
- **Status Breakdown** shows total incomplete tasks
- **Team Allocation** shows per-member pending task counts
- Hover over team member cards to see detailed breakdowns

### Interpreting the Carry-Forward Indicator
In the day detail panel, tasks show a carry badge:
- **"Carried 1x"** - First time carried forward
- **"Carried 2x"** - Carried twice (getting concerning)
- **"Carried 5x"** - Hit max limit (action needed!)

## Carry-Forward Audit Trail

### What Gets Logged
Every carry-forward operation creates a log entry including:
- Task ID
- Source date (where it was carried from)
- Target date (where it was moved to)
- Reason (shoot_needed, pending, incomplete, manual)
- Carry count (1-5)
- Created by (admin email who triggered it)
- Timestamp

### Where It's Stored
Firebase Path: `worksync/carry_forward_log/{logId}`

### Accessing the Log (Developers)
```javascript
// Get all carry-forward entries for a task
const history = await getTaskCarryForwardHistory('TASK-123');

// Get carry count for a task
const count = await getTaskCarryForwardCount('TASK-123');
```

## Common Scenarios

### Scenario 1: "Shoot Needed" Task Not Done by EOD
**Automatic Action:**
- Task status is "Shoot Needed"
- At 6 PM, system runs daily transition
- Task automatically carries to next day
- Assignee receives notification

**Manual Alternative (Admin):**
1. Click task menu → "Carry Forward to Tomorrow"
2. Task moved to tomorrow immediately
3. No notification delay

### Scenario 2: Task Carried 5 Times (Max Reached)
**What Happens:**
- Cannot be auto-carried anymore
- Admins can still manually move it, but will see error
- Suggests task needs resolution (completion or reassignment)

**Admin Action:**
- Review task status and assignee workload
- Either complete the task or reassign it
- Consider if status should change to "Design Hold"

### Scenario 3: Task on "Design Hold"
**Behavior:**
- Even though status is incomplete
- Will NOT automatically carry forward
- Can only be moved manually by admin if needed
- Designed to prevent forced carries on blocked tasks

**Unblocking:**
- Change status from "Design Hold" to next appropriate status
- Next auto-transition will carry it forward normally

## Tips for Managers

### Best Practices
1. **Monitor carry counts** - Tasks carried 3+ times need attention
2. **Review at week end** - Check which tasks keep getting carried
3. **Adjust workloads early** - Don't wait for tasks to hit max carries
4. **Use "Design Hold"** properly - For genuinely blocked work, not avoidance
5. **Check notifications** - Review who has overloaded daily plans

### Troubleshooting
- **Task not carrying forward?** Check status (might be completed/posted/on hold)
- **Manual carry-forward failed?** Verify you're admin and task is incomplete
- **Notification not received?** Check notification settings in Profile
- **History empty?** Task hasn't been carried forward yet

## Technical Details

### Carry-Forward Logic
```javascript
// A task carries forward if:
shouldTaskCarryForward(task) returns true when:
  - Status is "Shoot Needed" (ALWAYS carries) OR
  - Status is in NOT_COMPLETED list AND not "Design Hold" AND not marked "On Hold"
```

### Firebase Collections
- **Daily Plans**: `worksync/daily_plans/{email}/{taskId}`
- **Carry Log**: `worksync/carry_forward_log/{logId}`
- **Notifications**: `worksync/notifications/{email}/{notificationId}`

### Configuration
Edit `CARRY_FORWARD_CONFIG` in index.html to adjust:
- `maxCarryCount`: Current 5 (max carries per task)
- `transitionTime`: Current '18:00' (6 PM)
- Status arrays: Categorization into Not Completed/Completed/Posted

## Frequently Asked Questions

**Q: Can I see why a task was carried forward?**
A: Yes! Click the task menu → "View History" to see the reason (shoot_needed, pending, incomplete, or manual)

**Q: What happens when a task reaches max carries (5)?**
A: It stops auto-carrying. Managers must manually move it or resolve the underlying issue.

**Q: Can I prevent a task from being carried forward?**
A: Mark it as "Design Hold" or "On Hold" to stop auto-carries. Or mark it complete/posted.

**Q: Who can manually carry forward tasks?**
A: Only Admins and Managers with admin permissions.

**Q: Are carries logged somewhere?**
A: Yes, in `worksync/carry_forward_log` - full audit trail with timestamps and user info.

**Q: Can I undo a carry-forward?**
A: In the current version, no. This is coming in Phase 5 (Bulk Operations & Undo).

**Q: How do I set up the daily 6 PM transition?**
A: Phase 4 provides the function `performDailyTransition()`. You need to set up a Cloud Function or server job to call this at 6 PM daily.

