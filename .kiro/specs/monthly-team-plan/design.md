# Monthly Team Plan - Technical Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│              Monthly Team Plan Feature                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │   UI Layer (Presentation)                        │  │
│  ├──────────────────────────────────────────────────┤  │
│  │  • Monthly Calendar Grid View                    │  │
│  │  • Day Expansion Panel                           │  │
│  │  • Team Workload Dashboard                       │  │
│  │  • Carry-Forward History Modal                   │  │
│  │  • Bulk Operations Interface                     │  │
│  └──────────────────────────────────────────────────┘  │
│                       ↓                                  │
│  ┌──────────────────────────────────────────────────┐  │
│  │   Business Logic Layer                           │  │
│  ├──────────────────────────────────────────────────┤  │
│  │  • Task Planning Engine                          │  │
│  │  • Carry-Forward Logic                           │  │
│  │  • Workload Calculator                           │  │
│  │  • Notification Manager                          │  │
│  │  • Export Generator                              │  │
│  └──────────────────────────────────────────────────┘  │
│                       ↓                                  │
│  ┌──────────────────────────────────────────────────┐  │
│  │   Data Layer (Persistence)                       │  │
│  ├──────────────────────────────────────────────────┤  │
│  │  Firebase Paths:                                 │  │
│  │  • /monthly_plans/{userId}/{monthYear}           │  │
│  │  • /carry_forward_log/{taskId}                   │  │
│  │  • /monthly_workload/{userId}/{monthYear}        │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Data Models

### Monthly Plan Entry
```javascript
{
  id: "MP-2026-07",                    // monthYear format
  userId: "user@email.com",
  month: 7,
  year: 2026,
  createdAt: 1720550400000,
  updatedAt: 1720550400000,
  
  // Day-level planning
  days: {
    "2026-07-01": {
      plannedTasks: ["TASK-123", "TASK-124"],
      carryForwardTasks: ["TASK-100", "TASK-101"],
      completedCount: 2,
      notes: "On track"
    },
    "2026-07-02": {
      plannedTasks: ["TASK-125"],
      carryForwardTasks: ["TASK-123"],  // carried from 2026-07-01
      completedCount: 0
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
  reason: "shoot_needed",              // shoot_needed, pending, incomplete
  carryForwardCount: 1,                // How many times carried forward
  createdAt: 1720550400000,
  status: "active"                     // active, completed, cancelled
}
```

### Team Workload Entry
```javascript
{
  id: "WL-2026-07",
  userId: "user@email.com",
  month: 7,
  year: 2026,
  
  stats: {
    totalAssigned: 45,
    byStatus: {
      "Shoot Needed": 8,
      "Content In Progress": 12,
      "Completed": 15,
      "Posted": 10
    },
    tasksPerDay: 2.1,                  // average
    completionRate: 0.72,              // 72%
    capacityUtilization: 0.95,         // 95%
    overloadDays: ["2026-07-05", "2026-07-12"]
  }
}
```

## Component Structure

### UI Components

```
MonthlyTeamPlan (Main Container)
├── MonthlyCalendarHeader
│   ├── MonthNavigation
│   ├── TeamMemberFilter
│   ├── ViewModeToggle (Month/Week/Day)
│   └── ExportButton
│
├── MonthlyCalendarGrid
│   ├── WeekdayHeaders
│   └── DayCell (x 28-31)
│       ├── DayCellHeader (date)
│       ├── TaskCountByMember
│       │   ├── MemberTaskBadge (red/green/blue)
│       │   └── CarryForwardIndicator
│       ├── PendingTaskCount
│       └── ExpandButton
│
├── DayDetailPanel (Expandable)
│   ├── DayHeader
│   ├── TasksSection
│   │   ├── NewTasksGroup
│   │   │   └── TaskRow (x N)
│   │   └── CarryForwardGroup
│   │       └── CarryForwardTask (x N)
│   ├── BulkActionToolbar
│   └── AddTaskButton
│
├── WorkloadDashboard (Right Sidebar / Collapsible)
│   ├── TeamMetrics
│   │   ├── TotalTasksCard
│   │   ├── ByStatusBreakdown
│   │   └── CompletionRateChart
│   ├── IndividualStats (per team member)
│   │   ├── AllocationCard
│   │   ├── OverloadWarning
│   │   └── PendingTasksList
│   └── BottleneckAlerts
│
└── CarryForwardHistoryModal
    ├── TaskDetails
    ├── CarryForwardTimeline
    └── ResolutionActions
```

## Key Functions

### Planning Engine

```javascript
// Initialize month planning
async function initMonthlyPlan(monthYear) {
  // Load existing plan or create new
  // Initialize workload calculations
  // Load all team member assignments for month
  // Calculate carry-forward status
}

// Render monthly calendar
function renderMonthlyCalendar() {
  // Generate calendar grid
  // Display task counts per member per day
  // Apply color coding (red/green/blue)
  // Show carry-forward indicators
}

// Handle day expansion
function expandDayDetail(dateStr) {
  // Load tasks for specific day
  // Separate into new vs carry-forward
  // Display workload metrics
  // Enable bulk operations
}
```

### Carry-Forward Engine

```javascript
// Auto carry-forward unfinished tasks
async function performDayTransition(date) {
  // Get all tasks assigned to date
  // Check status:
  //   - "Shoot Needed" → carry forward
  //   - "Pending" → carry forward
  //   - "Completed"/"Posted" → complete
  // Create carry-forward entries
  // Update next day's plan
  // Send notifications
  // Log audit trail
}

// Check if task should carry forward
function shouldCarryForward(task) {
  // Return true if:
  // - Status is "Shoot Needed" (always)
  // - Status in NOT_COMPLETED list and not marked "On Hold"
  // - Not already completed or posted
}

// Manual carry-forward trigger
async function carryForwardTask(taskId, fromDate, toDate) {
  // Create carry-forward log entry
  // Add to next date's plan
  // Update monthly plan
  // Notify assignee
}
```

### Workload Calculator

```javascript
// Calculate team workload metrics
async function calculateTeamWorkload(monthYear) {
  // For each team member:
  //   - Count total assigned tasks
  //   - Count by status
  //   - Calculate completion rate
  //   - Check capacity utilization
  //   - Identify overload conditions
  // Store in workload collection
}

// Calculate individual stats
function getUserWorkloadStats(userId, monthYear) {
  // Get all tasks for user for month
  // Group by day/status
  // Calculate averages
  // Return metrics object
}

// Identify overload conditions
function checkOverloadStatus(userId, monthYear) {
  // Calculate capacity threshold
  // Compare assigned vs threshold
  // Return overload flag and days affected
}
```

### Notification System

```javascript
// Send carry-forward notifications
async function sendCarryForwardNotification(userId, tasks, fromDate, toDate) {
  // Create notification message
  // Include affected tasks
  // Specify new dates
  // Send via notification service
}

// Send overload warning
async function sendOverloadWarning(userId, affectedDays) {
  // Alert manager/team lead
  // Show affected days
  // Suggest rebalancing
}

// Send end-of-day reminder
async function sendEODReminder(userId, unfinishedTasks) {
  // List pending tasks
  // Warn about carry-forward implications
  // Allow marking complete from notification
}
```

### Export Functions

```javascript
// Export to CSV
async function exportMonthlyPlanCSV(monthYear, filters) {
  // Generate CSV with headers
  // Include task details
  // Include metrics
  // Download file
}

// Generate PDF report
async function generatePDFReport(monthYear, filters) {
  // Create formatted report
  // Include calendar view
  // Include metrics charts
  // Include summary tables
  // Download PDF
}

// Generate text summary (like Daily Plan)
function generateMonthlyTextSummary(monthYear) {
  // Format as readable text
  // Group by day
  // Include stats
  // Return as string
}
```

## Database Schema

### Firebase Collections

```
/monthly_plans/{userId}/{monthYear}
  ├── id: "MP-2026-07"
  ├── days
  │   ├── "2026-07-01": {...}
  │   ├── "2026-07-02": {...}
  │   └── ...
  ├── createdAt
  └── updatedAt

/carry_forward_log/{taskId}
  ├── id: "CF-2026-07-123"
  ├── originalDate: "2026-07-01"
  ├── carryForwardDate: "2026-07-02"
  ├── reason: "shoot_needed"
  ├── carryForwardCount: 1
  ├── createdAt
  └── status: "active"

/monthly_workload/{userId}/{monthYear}
  ├── id: "WL-2026-07"
  ├── stats
  │   ├── totalAssigned
  │   ├── byStatus
  │   ├── tasksPerDay
  │   ├── completionRate
  │   └── capacityUtilization
  └── updatedAt
```

## UI/UX Design Patterns

### Color Coding System
```
Red (#EF4444)     → Not Completed: "Shoot Needed", "Design Hold", etc.
Green (#22C55E)   → Completed: "Completed", "Design Completed"
Blue (#3B82F6)    → Posted: "Posted", "Analytics", "Done"
Amber (#F59E0B)   → Carry-Forward indicator
Gray (#94A3B8)    → Neutral/completed tasks
```

### Layout Patterns
- **Desktop**: 2-column (Calendar + Workload Dashboard)
- **Tablet**: Stacked, workload dashboard collapsible
- **Mobile**: Single column, week view by default

### Interaction Patterns
- Click day cell → Expand inline detail panel
- Hover task → Show full description in tooltip
- Multi-select → Checkboxes enable bulk actions
- Drag task → Reschedule to different day (future enhancement)

## Integration Points

### With Existing Systems

1. **Daily Plan Integration**
   - Reuse existing task data model
   - Link to Daily Plan for individual day view
   - Sync carry-forward decisions

2. **Task Management**
   - Read tasks from existing tasks collection
   - Update task status from monthly plan
   - Create carry-forward log entries

3. **User System**
   - Use existing user authentication
   - Leverage team member list
   - Apply existing permission model

4. **Notification System**
   - Integrate with existing notification service
   - Use same messaging template
   - Follow existing notification preferences

5. **DPR (Daily Plan Report)**
   - Monthly version of existing DPR
   - Export same metrics
   - Generate combined monthly/daily reports

## Performance Considerations

- **Data Fetching**: Load month data once, cache in memory
- **Real-time Updates**: Use Firebase listeners for live task changes
- **Rendering**: Virtual scroll for large task lists
- **Calculations**: Debounce workload calculations (recalc on task change)
- **Storage**: Archive old monthly plans after 90 days

## Testing Strategy

- Unit tests: Carry-forward logic, workload calculations
- Integration tests: Firebase operations, notifications
- UI tests: Calendar rendering, bulk operations
- Performance tests: Large team (50+ members) rendering
- E2E tests: Complete workflow from planning to carry-forward
