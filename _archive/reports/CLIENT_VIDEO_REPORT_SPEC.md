# Client Video & Pending Tasks Report Feature

## Overview
Add a new comprehensive report section showing:
- Videos completed and posted by client
- Pending task count by client
- Comparison metrics

## Feature Requirements

### 1. New Report Section: "Client Delivery Dashboard"
Location: Reports View (below existing reports)

### 2. Data Metrics to Track

**Per Client:**
- Total Videos Assigned
- Videos Completed (status = "Completed" OR "Client Sent" OR "QC Done")
- Videos Posted (status = "Client Sent" or verified posted)
- Videos Pending (status = "To Do" OR "In Progress" OR "In Review" OR "Corrections")
- Completion Rate (%)
- Avg. Time to Complete (in hours)

### 3. Report Table Structure

| Client Name | Videos Total | Videos Completed | Videos Posted | Pending Videos | Completion % | Avg Hours |
|---|---|---|---|---|---|---|
| Client A | 15 | 12 | 10 | 3 | 80% | 4.2h |
| Client B | 8 | 6 | 5 | 2 | 75% | 3.8h |

### 4. Display Options

- **Table View** (Primary)
  - Sortable columns
  - Color-coded completion rates
  - Expandable rows for task details

- **Chart View**
  - Stacked bar chart: Completed vs Pending per client
  - Pie chart: Overall completion rate

### 5. Filters
- Date Range (Today, This Week, This Month, Custom)
- Video Status Filter
- Client Multi-select

### 6. Color Coding
- Green: ≥ 80% completion
- Yellow: 50-79% completion
- Red: < 50% completion

## Implementation Notes
- Query tasks with type = 'video' or tags containing 'video'
- Count by status and client
- Calculate metrics in real-time
- Add to reports navigation menu
- Mobile responsive design

## Status
Ready for implementation
