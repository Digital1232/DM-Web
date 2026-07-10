# Monthly Team Plan - Complete Specification Summary

## Feature Overview

The **Monthly Team Plan** feature provides team-wide planning and visibility across an entire month. It extends the existing Daily Plan functionality with:

- **Month-long calendar view** showing all team members' tasks
- **Automatic carry-forward logic** for "Shoot Needed" and pending tasks
- **Team workload metrics** to identify bottlenecks and overload
- **Bulk operations** for efficient task management
- **Smart notifications** for assignments, carry-forwards, and alerts
- **Export capabilities** (CSV, PDF, text summary)

## Key Features

### 1. Monthly Calendar Grid
- 7-column calendar layout (Sun-Sat)
- Day cells showing task counts per team member
- Color-coded status indicators (Red/Green/Blue)
- Carry-forward badges (Amber)
- Overload warnings
- Clickable to expand for detailed view

### 2. Day Expansion Panel
- View all tasks assigned to a specific day
- Separate "New Tasks" and "Carry Forward" sections
- Task details: title, status, client, assignee
- Carry-forward history and timeline
- Bulk action toolbar

### 3. Carry-Forward Automation
- **"Shoot Needed"** status → Always carry forward
- **Pending tasks** → Carry forward unless marked "On Hold"
- **Auto-transition** at end of each day
- **Carry count** tracking (max 5 carries)
- **Manual override** capability
- **Audit log** for all operations

### 4. Team Workload Dashboard
- Total tasks assigned per member
- Breakdown by status (Pending, Completed, Posted)
- Completion rate tracking
- Capacity utilization % (Green/Amber/Red)
- Overload detection with alerts
- Workload trend charts

### 5. Bulk Operations
- Multi-select tasks across the month
- Bulk reschedule to different date
- Bulk reassign to different team member
- Bulk status update
- Undo capability (last 5 operations)

### 6. Smart Notifications
- Task assignment notifications
- Carry-forward alerts with history
- End-of-day pending task reminders
- Overload warnings to managers
- Persistent carry-forward alerts (3+ carries)

### 7. Export & Reporting
- **CSV Export**: Spreadsheet-compatible with all details
- **PDF Report**: Professional formatted monthly summary
- **Text Summary**: Human-readable format for easy sharing
- Customizable filters (date range, team member, status)
- Scheduled/recurring exports

### 8. Access Control
- **Admin**: Full access to all monthly plans
- **Manager**: Access to team members' plans
- **Team Lead**: Access to assigned team members
- **Team Member**: Own plan only (read-only team plans)

## Data Structures

### Monthly Plan Entry
```javascript
{
  id: "MP-2026-07",
  userId: "user@email.com",
  month: 7,
  year: 2026,
  days: {
    "2026-07-01": {
      plannedTasks: ["TASK-123", "TASK-124"],
      carryForwardTasks: ["TASK-100"],
      completedCount: 2
    }
  }
}
```

### Carry-Forward Log Entry
```javascript
{
  id: "CF-2026-07-123",
  taskId: "TASK-123",
  originalDate: "2026-07-01",
  carryForwardDate: "2026-07-02",
  reason: "shoot_needed",
  carryForwardCount: 1
}
```

### Workload Metrics
```javascript
{
  userId: "user@email.com",
  month: 7,
  year: 2026,
  stats: {
    totalAssigned: 45,
    byStatus: {
      "Shoot Needed": 8,
      "Completed": 15,
      "Posted": 10
    },
    capacityUtilization: 0.95,
    completionRate: 0.72
  }
}
```

## User Workflows

### Workflow 1: Monthly Planning
1. Manager opens Monthly Plan for team
2. Filters by team member or views all
3. Sees task distribution across month
4. Identifies overload days
5. Reschedules tasks to balance workload
6. Assigns new tasks to available slots

### Workflow 2: Daily Transition
1. System runs at configured time (e.g., 6 PM daily)
2. Identifies all tasks not completed for the day
3. Checks status:
   - "Shoot Needed" → carry forward automatically
   - Other pending → carry forward unless marked "On Hold"
4. Creates carry-forward entries
5. Updates next day's plan
6. Sends notifications to assignees
7. Logs all operations

### Workflow 3: Carry-Forward Management
1. Team member sees carry-forward notification
2. Can view carry-forward history modal
3. Can click to view full task history
4. Options:
   - Complete the task now
   - Mark as "On Hold" to pause carries
   - Request reassignment
5. Manager can override and reschedule

### Workflow 4: Team Workload Monitoring
1. Manager opens Monthly Plan
2. Reviews Team Workload Dashboard
3. Sees overload warnings (red indicators)
4. Analyzes individual stats per team member
5. Sees trends (tasks increasing/decreasing)
6. Takes action: reschedule, reassign, or hire

### Workflow 5: Bulk Reassignment
1. Manager filters calendar for specific period
2. Multi-selects 5+ tasks
3. Clicks "Bulk Reassign"
4. Selects target team member
5. System checks if would cause overload
6. Shows warning if yes
7. Manager confirms or cancels
8. Tasks reassigned, notifications sent

### Workflow 6: Monthly Report
1. Manager opens Monthly Plan
2. Clicks Export button
3. Selects format (CSV/PDF/Text)
4. Customizes filters and date range
5. System generates report
6. File downloads to computer
7. Manager shares with stakeholders

## Integration Points

### With Daily Plan
- Load task data from Daily Plan assignments
- Sync carry-forward decisions
- Link to individual day view
- Share notification system

### With Task Management
- Read/write task status
- Update task assignments
- Create carry-forward log entries
- Maintain audit trail

### With User System
- Leverage existing authentication
- Use existing team member list
- Apply permission model
- Track user actions

### With Notification System
- Integration with existing service
- Same message templates
- Respect user preferences
- Support multiple channels (in-app, email, SMS)

## Color Scheme

```
Red (#EF4444)     → Not Completed: Shoot Needed, Design Hold, etc.
Green (#22C55E)   → Completed: Completed, Design Completed
Blue (#3B82F6)    → Posted: Posted, Analytics, Done
Amber (#F59E0B)   → Carry-Forward indicator / Pending
Gray (#94A3B8)    → Neutral / Completed items
```

## Performance Targets

- Initial load: < 2 seconds for 50-person team
- Calendar rendering: Smooth, no visible lag
- Metric calculations: < 500ms
- Export generation: < 5 seconds
- Real-time updates: < 1 second propagation

## Browser/Device Support

- **Desktop**: Chrome, Firefox, Safari, Edge (latest versions)
- **Tablet**: iPad, Android tablets (responsive layout)
- **Mobile**: iOS, Android phones (week view, optimized UI)
- **Dark Mode**: Full support using existing design system

## Security & Privacy

- Permission-based access (role checked on all operations)
- Audit logging for all carry-forward operations
- Data encryption in transit (HTTPS)
- User isolation (no access to unauthorized team members)
- Rate limiting on bulk operations

## Configuration Options

```javascript
// System administrator settings
{
  monthlyPlanConfig: {
    carryForwardTime: "18:00",              // 6 PM daily
    maxCarryForwardCount: 5,                // Max times to carry
    capacityThreshold: 10,                  // Tasks/day threshold
    overloadThreshold: 1.2,                 // 120% utilization
    enableNotifications: true,
    notificationChannels: ["in-app", "email", "sms"],
    archiveAfterDays: 90
  }
}
```

## Future Enhancements

1. **Drag & Drop**: Drag tasks between days to reschedule
2. **AI Suggestions**: Auto-suggest optimal task redistribution
3. **Resource Allocation**: Link to budget/resource planning
4. **Gantt Chart View**: Visual timeline for project tasks
5. **Team Capacity Planning**: Predict capacity needs
6. **Integration with Time Tracking**: Actual vs. planned hours
7. **Mobile App**: Native iOS/Android application
8. **Calendar Sync**: Integrate with Google Calendar, Outlook
9. **Slack Integration**: Notifications and commands via Slack
10. **Weekly Planning Mode**: Support for weekly-based planning

## Implementation Timeline

- **Weeks 1-3**: UI & Core Calendar (Phase 1-2)
- **Weeks 4-6**: Metrics & Automation (Phase 3-4)
- **Weeks 6-8**: Bulk Ops & Notifications (Phase 5-6)
- **Weeks 8-10**: Export & Integration (Phase 7-8)
- **Weeks 10-12**: Testing & Documentation (Phase 9)

**Total: 10-12 weeks, ~150-170 hours**

## Success Metrics

- **Adoption**: >80% of managers using Monthly Plan within 1 month
- **Time Saved**: 40% reduction in task rescheduling time
- **Efficiency**: Reduce "Shoot Needed" carry-forwards by 30%
- **Visibility**: Improve team communication by 50% (survey)
- **Accuracy**: <5% data inconsistency between Monthly Plan and Daily Plan
- **Performance**: <2 second load time maintained

## Support & Maintenance

- **Documentation**: User guides, FAQs, video tutorials
- **Training**: 30-minute team demo session
- **Support**: In-app help, email support, Slack channel
- **Monitoring**: Track usage metrics and performance
- **Updates**: Monthly feature releases and bug fixes
