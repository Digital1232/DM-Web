# Client Delivery Dashboard - User Guide

## Quick Start

### Accessing the Dashboard
1. Click **Reports & Analytics** in main navigation
2. In the left sidebar under **Client Reports**, click **Video Delivery Dashboard**
3. The dashboard loads with current metrics

### Understanding the Metrics

#### Videos Total
Total number of video tasks assigned to each client

#### Completed ✓
Number of videos that have reached completion (status: completed, done, client sent, or QC done)

#### Posted 📤
Number of videos that have been posted to client (status: client sent or completed)

#### Pending ⏳
Number of videos still in progress (status: to do, in progress, in review, or corrections)

#### Completion %
Percentage of videos completed per client
- **Green (≥80%)**: On track - excellent progress
- **Yellow (50-79%)**: In progress - moderate pace
- **Red (<50%)**: Behind - needs attention

#### Avg Hours
Average hours spent per video task (framework ready)

---

## Features

### View Toggle
- **Table View**: Detailed metrics in table format
- **Chart View**: Visual representation (coming soon)

### Date Range Filter
- Use the report filters at top to select custom date range
- Period badge shows selected dates
- Metrics update to reflect selected timeframe

### Sorting
- Clients are displayed alphabetically
- Click column headers to sort (when implemented)

---

## Tips & Tricks

### Quick Status Check
- Check "Completion %" column for overall progress at a glance
- Green is good, red needs attention

### Identify Bottlenecks
- Compare "Pending" count with "Completed" to find clients with backlog
- High pending count = focus area

### Track Posted Content
- "Posted" metric shows client-facing content
- Difference between "Completed" and "Posted" = internal QC pending

### Missing Clients
- Only clients with video tasks appear
- New clients need at least one video task assigned

---

## Permission Requirements

- **Admin**: Full access to all metrics
- **Manager**: Full access to all metrics
- **Team Members**: Limited or no access (depends on role)

---

## Troubleshooting

### No Data Showing?
- Check if you have admin/manager permissions
- Verify date range includes tasks
- Ensure tasks have issue type "Video" or "video" label

### Dashboard Not Appearing?
- Refresh the page
- Check browser console for errors
- Verify JavaScript is enabled

### Dates Not Updating?
- Use date filter at top of Reports section
- Period badge should show selected dates
- Data refreshes when switching tabs

---

## Common Use Cases

### Daily Standup Report
1. Select "Today" date range
2. Check completion % for all clients
3. Flag clients with <80% completion

### Weekly Status
1. Select last 7 days
2. Review posted vs pending per client
3. Identify clients needing attention

### Client Performance Review
1. Select month range
2. Analyze completion trends
3. Share metrics with client

### Workload Planning
1. Review pending counts
2. Assess team capacity
3. Balance video tasks across team

---

## Support

For questions or issues:
1. Check this guide
2. Review specification document: CLIENT_VIDEO_REPORT_SPEC.md
3. Contact your administrator

---

**Version**: 1.0  
**Last Updated**: July 13, 2026
