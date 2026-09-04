# Sneha's Task Breakdown Report Enhancement

## 📋 Overview
Enhancement to display Sneha's completed tasks with detailed content work breakdown in the format:
**Task Title [ Work Items ] Status**

Example: **Alumni Registration Poster [ Poster Content, Captions ] Content Work**

## 🎯 Feature Requirements

### Display Format
For Sneha's completed tasks in "Today's Completed Tasks" and Task Hub:
```
Alumni Registration Poster [ Poster Content, Captions ] Content Work
↓ Task Title                ↓ Content Items Selected    ↓ Work Category
```

### Components
1. **Task Title**: The full task description/name
2. **Content Breakdown** (in brackets): What Sneha worked on
   - Poster Content
   - Captions
   - Video Thumbnail
   - QC Reviewed (if she reviewed it)
3. **Work Category**: Shows the type of work
   - Content Work (for content selections)
   - QC Review (for quality checks)
   - Internal (for assigned internal tasks)

## 📊 Data Structure

### Sneha's Work Selections
Stored in Firebase: `worksync/sneha_work_selections`
```json
{
  "selectionId": {
    "taskId": "JIRA-123",
    "taskDesc": "Alumni Registration Poster",
    "client": "Alumni Association",
    "selectedItems": ["Poster Content", "Captions"],
    "userId": "snehavilpower@gmail.com",
    "timestamp": "2026-07-14T10:30:00Z"
  }
}
```

### QC Reports
Stored in Firebase: `worksync/qc_reports`
```json
{
  "qcReportId": {
    "taskId": "JIRA-124",
    "qcEmail": "snehavilpower@gmail.com",
    "status": "Passed",
    "timestamp": "2026-07-14T15:45:00Z"
  }
}
```

## 🛠️ Implementation

### Key Functions

#### 1. `getSnehaTaskIds()` - Get all tasks Sneha worked on
Returns a Set of task IDs where Sneha:
- Made content selections (Poster, Captions, Video Thumbnail)
- Performed QC reviews
- Was assigned internal tasks

#### 2. `getSnehaTaskLabels(t)` - Get work items for specific task
Returns array of labels:
```javascript
[
  "Poster Content",     // Content selection
  "Captions",          // Content selection
  "QC Reviewed",       // QC work
  "Internal"           // Internal task
]
```

#### 3. `formatSnehaTaskBreakdown(t)` - NEW
Returns formatted string with breakdown:
```javascript
"Alumni Registration Poster [ Poster Content, Captions ]"
```

#### 4. `getSnehaWorkCategory(t)` - NEW
Returns the primary work category:
- "Content Work" - if content selections exist
- "QC Review" - if Sneha reviewed QC
- "Internal" - if internal task

### Display Locations

#### Location 1: Today's Completed Tasks Popup (17:30)
File: `index.html`
- Show Sneha's completed tasks with breakdown
- Format: Task Title [ Items ]
- Example shown in modal at 5:30 PM

#### Location 2: Task Hub > Completed Tab
File: `index.html`
- View all completed tasks with filters
- Display breakdown in task rows
- Filter by: Date Range, Client, Assignee

#### Location 3: Daily Summary Email
File: `email-templates/worksync-daily-summary.html`
- Include Sneha's work breakdown in daily email
- Format: [ Poster Content, Captions ] + Task Title

## 📝 Example Output

### Format 1: Inline Badge Display
```
JIRA-123  Alumni  Done  Manual  [ Poster Content, Captions ]
Alumni Registration Poster
Assignee: Sneha | Finished: 2026-07-14
```

### Format 2: Expanded Breakdown Display
```
┌─────────────────────────────────────────────────┐
│ Alumni Registration Poster                      │
├─────────────────────────────────────────────────┤
│ Work Items:                                     │
│  • Poster Content                               │
│  • Captions                                     │
│                                                 │
│ Category: Content Work                          │
│ Client: Alumni Association                      │
│ Status: Done | Completed: Jul 14, 2026 3:45 PM │
└─────────────────────────────────────────────────┘
```

## 🔄 Workflow

### When Sneha Starts a Task
1. Modal appears with content selection checkboxes
2. Sneha selects: "Poster Content" + "Captions"
3. Selection saved to Firebase

### When Task Completes
1. Task marked as "Done"
2. In completed tasks view, shows:
   - Title: "Alumni Registration Poster"
   - Breakdown: [ Poster Content, Captions ]
   - Category: "Content Work"

### In Reports
1. "Today's Completed" section groups by client
2. Shows: "Alumni Registration Poster [ Poster Content, Captions ]"
3. User can click to see full task details

## 🎨 UI Styling

### Breakdown Display
- **Brackets**: Gray color (#64748b)
- **Items**: Comma-separated list
- **Font**: Monospace for clarity
- **Examples**:
  - [ Poster Content, Captions ]
  - [ Video Thumbnail ]
  - [ QC Reviewed ]

### Badge Styling (if shown as badges)
- **Background**: Violet-50 (#f5f3ff)
- **Text**: Violet-600 (#7c3aed)
- **Border**: Violet-100/50 (#ede9fe)
- **Font Size**: Text-[9px]

## 📈 Benefits

1. **Clarity**: Shows exactly what Sneha worked on
2. **Accountability**: Tracks content selections per task
3. **Reporting**: Easy to aggregate work by type
4. **Filtering**: Can filter by content type worked on
5. **Quality**: Helps identify QC-reviewed tasks

## ✅ Testing Checklist

- [ ] Sneha's content selections display correctly
- [ ] QC reviews show "QC Reviewed" label
- [ ] Internal tasks show "Internal" label
- [ ] Today's Completed popup shows breakdown
- [ ] Task Hub completed tab displays breakdown
- [ ] Filters work correctly (date, client, assignee)
- [ ] Email includes breakdown formatting
- [ ] Mobile responsive display
- [ ] Dark mode colors correct
- [ ] Hover effects work on breakdowns

## 📌 Future Enhancements

1. Add breakdown to Daily Plan view
2. Add breakdown to Performance Reports
3. Create "Content Work" analytics dashboard
4. Track breakdown metrics over time
5. Add breakdown to exported reports (PDF/CSV)

---
**Created**: July 14, 2026  
**For**: Sneha's Task Tracking Report  
**Status**: Enhancement Specification
