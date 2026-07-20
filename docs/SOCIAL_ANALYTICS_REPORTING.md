# Social Analytics Reporting Features

**Status:** ✅ Complete  
**Date:** July 16, 2026  
**Version:** 2.0

---

## Overview

The Social Analytics module now includes powerful reporting features that allow authorized users to:
1. **View top-performing posts from yesterday** in a beautifully designed modal
2. **Download monthly detailed reports** for each client in CSV or HTML format
3. **Send reports via email** (optional future enhancement)

---

## Features

### 1. Top Posts Report (Yesterday)

**Access:** Click the blue **"Report"** button in the Social Analytics header

**What it shows:**
- Top 5 most engaging posts from yesterday
- Ranked by total engagements (likes + comments + shares)
- Complete metrics for each post:
  - Post title (truncated with emoji)
  - Client name & platform
  - Post type (Video, Post, Image, etc.)
  - Views, Likes, Comments, Shares
  - Total Engagements

**Modal Design:**
- Clean card-based layout
- Color-coded post types and clients
- Engagement count prominently displayed
- Professional styling with hover effects

**Permissions:**
- Requires `canViewSocialAnalytics()` permission
- Users without permission see error message

**Download Option:**
- Download the report as CSV file
- Filename: `top-posts-YYYY-MM-DD.csv`
- Ready for Excel or Sheets

---

### 2. Monthly Client Reports

**Access:** Click the orange **"Download"** button in the Social Analytics header

**What it generates:**
- Detailed monthly analytics for a specific client
- Complete engagement breakdown
- Performance metrics across post types
- Detailed post-by-post data

**Report Includes:**
```
✓ Total Posts Count
✓ Total Views
✓ Total Engagements
✓ Average Engagement Rate %
✓ Breakdown by Post Type
✓ Top Performing Post
✓ Detailed Post Table
  - Date
  - Post Title
  - Post Type
  - Views
  - Likes
  - Comments
  - Shares
```

**Report Selection:**
```
Client Selection:
- Einstein
- IVN
- NTT
- Dream Daa
- Quade

Month Selection:
- January through December

Year Selection:
- 2024, 2025, 2026
```

**Download Formats:**
1. **CSV (Excel)** - Default
   - Standard spreadsheet format
   - Filename: `{ClientName}-report-{Month}-{Year}.csv`
   - Ready for Excel, Google Sheets, Numbers
   - Easy to filter and sort

2. **HTML (Detailed)**
   - Beautiful formatted report
   - Opens in new browser window
   - Print-ready design
   - Interactive table with styling
   - Print button included

**Permissions:**
- Requires `canViewSocialAnalytics()` permission
- Users without permission see error message

---

## UI Components

### Report Button (Blue)
```html
<button id="sa-report-btn" onclick="showTopPostsReport()">
    📊 Report
</button>
```
- **Position:** Social Analytics header, next to "Add Entry" button
- **Color:** Blue gradient (#0ea5e9 → #0284c7)
- **Icon:** Chart icon
- **Action:** Shows yesterday's top posts

### Download Button (Orange)
```html
<button id="sa-download-btn" onclick="openMonthlyReportDialog()">
    ⬇️ Download
</button>
```
- **Position:** Social Analytics header, right of "Report" button
- **Color:** Orange gradient (#f97316 → #ea580c)
- **Icon:** Download icon
- **Action:** Opens monthly report dialog

---

## JavaScript Functions

### Core Functions

#### `showTopPostsReport()`
```javascript
showTopPostsReport()
```
- Shows yesterday's top 5 posts
- Populates the modal with post data
- Requires view permission
- Handles empty data gracefully

#### `downloadTopPostsReport()`
```javascript
downloadTopPostsReport()
```
- Downloads top posts as CSV
- Filename includes date
- Shows success toast

#### `openMonthlyReportDialog()`
```javascript
openMonthlyReportDialog()
```
- Opens the monthly report selection dialog
- User selects client, month, year
- Allows format selection

#### `generateAndDownloadMonthlyReport()`
```javascript
generateAndDownloadMonthlyReport()
```
- Generates report based on selections
- Supports CSV and HTML formats
- Downloads or displays report
- Shows success/error toasts

### Helper Functions (from socialAnalyticsImport.js)

#### `getTopPostsForYesterday(records, sortBy, limit)`
```javascript
getTopPostsForYesterday(analyticsData, 'engagements', 5)
```
- Parameters:
  - `records`: Array of analytics records
  - `sortBy`: 'views', 'likes', 'engagements', 'shares', 'reach'
  - `limit`: Number of top posts to return (default: 5)
- Returns: Sorted array of top posts

#### `generateMonthlyClientReport(records, client, month, year)`
```javascript
generateMonthlyClientReport(data, 'Einstein', 7, 2026)
```
- Parameters:
  - `records`: All analytics records
  - `client`: Client name
  - `month`: Month number (1-12)
  - `year`: Year (2024-2026)
- Returns: Report object with aggregated metrics

#### `formatReportAsHTML(report)`
```javascript
formatReportAsHTML(reportObject)
```
- Converts report object to HTML
- Includes styling and formatting
- Ready for display or print

#### `downloadReportPDF(report, format)`
```javascript
downloadReportPDF(reportObject, 'csv')
```
- Parameters:
  - `report`: Report object
  - `format`: 'csv' or 'pdf'
- Downloads report in specified format

---

## Data Flow

### Top Posts Report
```
User clicks "Report" button
    ↓
showTopPostsReport() called
    ↓
Check canViewSocialAnalytics() permission
    ↓
Get yesterday's date
    ↓
Filter records for yesterday
    ↓
Sort by engagements (highest first)
    ↓
Take top 5 posts
    ↓
Populate modal with post cards
    ↓
Display modal with download option
```

### Monthly Report
```
User clicks "Download" button
    ↓
openMonthlyReportDialog() opens modal
    ↓
User selects:
  - Client (Einstein, IVN, etc.)
  - Month (1-12)
  - Year (2024-2026)
  - Format (CSV or HTML)
    ↓
generateAndDownloadMonthlyReport() called
    ↓
Filter records for selected month/year/client
    ↓
Aggregate metrics:
  - Total posts, views, engagements
  - Breakdown by post type
  - Calculate engagement rate
  - Identify top post
    ↓
Format report (CSV or HTML)
    ↓
Download or display report
    ↓
Show success toast
```

---

## Styling

### Modal Styling
```css
.fixed.inset-0.bg-black.bg-opacity-50.z-50.flex.items-center.justify-center
- Full screen overlay
- Semi-transparent dark background
- Centered modal dialog
```

### Button Styling
```css
#sa-report-btn {
    background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
    box-shadow: 0 2px 8px rgba(14, 165, 233, 0.2);
    hover: box-shadow: 0 4px 16px rgba(14, 165, 233, 0.3);
}

#sa-download-btn {
    background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
    box-shadow: 0 2px 8px rgba(249, 115, 22, 0.2);
    hover: box-shadow: 0 4px 16px rgba(249, 115, 22, 0.3);
}
```

### Card Styling
- Rounded corners (rounded-2xl)
- Subtle shadows
- Hover effects with shadow enhancement
- Grid layout for metrics

---

## Permissions

### Required Permissions
- `canViewSocialAnalytics()` - View reports
- `canEditSocialAnalytics()` - Generate reports

### User Roles with Access
- **Admins** - Full access to all reports
- **Social Media Managers** - Full access to reports
- **Team Leads** - Can view reports for their clients
- **Analysts** - Can view reports (read-only)

---

## CSV Report Format

### Top Posts CSV
```
Social Analytics - Top Posts Report
Generated: 2026-07-16 10:30:45
Date: 2026-07-15

Post Title,Client,Type,Views,Likes,Comments,Shares,Total Engagements
"Sample Post Title","Einstein","Video","4149","149","1","137","287"
"Another Post","IVN","Post","126","6","0","0","6"
```

### Monthly Report CSV
```
Social Analytics Report
Client: Einstein
Period: July 2026
Generated: 2026-07-16 10:30:45

Summary Metrics
Total Posts,10
Total Views,45000
Total Engagements,2500
Engagement Rate,5.56%

Detailed Posts
Date,Post Title,Type,Views,Likes,Comments,Shares
"2026-07-01","Post Title","Video","4149","149","1","137"
"2026-07-02","Post Title 2","Post","1121","26","0","10"
```

---

## HTML Report Format

### Features
- Professional styling
- Color-coded metrics
- Responsive tables
- Print-ready design
- Interactive sorting (in browser)
- Print button

### Components
1. **Header** - Client name and period
2. **Summary Cards** - Key metrics
3. **Breakdown Section** - By engagement type
4. **Post Type Breakdown** - Count by type
5. **Top Post Highlight** - Featured best performer
6. **Detailed Table** - All posts with metrics

---

## Error Handling

### Common Errors & Solutions

#### "You do not have permission to view reports"
- **Cause:** User lacks view permission
- **Solution:** Contact admin to grant access

#### "No analytics data available"
- **Cause:** No data imported yet
- **Solution:** Import CSV data first using Import button

#### "No posts found for yesterday"
- **Cause:** No posts recorded for that date
- **Solution:** Check that dates are correct in data

#### "No data found for {client} in {period}"
- **Cause:** No records match selected criteria
- **Solution:** Select different period or check imports

---

## Testing

### Test Scenario 1: View Yesterday's Top Posts
1. Import sample analytics data (7-15-2026)
2. Click "Report" button
3. Should show top 5 posts from yesterday
4. Click "Download Report"
5. CSV file should download

### Test Scenario 2: Generate Monthly Report
1. Ensure data exists for July 2026
2. Click "Download" button
3. Select "Einstein" as client
4. Select "July" and "2026"
5. Select "CSV" format
6. Click "Generate Report"
7. File should download: `Einstein-report-July-2026.csv`

### Test Scenario 3: HTML Report
1. Follow same steps as Scenario 2
2. Select "HTML" format instead
3. Click "Generate Report"
4. Report should open in new window
5. Should show formatted table with styling
6. Print button should work

---

## Future Enhancements

Potential additions:
- [ ] Email reports directly to stakeholders
- [ ] Schedule weekly/monthly reports
- [ ] Compare month-over-month performance
- [ ] Trend analysis and predictions
- [ ] Custom date range selection
- [ ] Export to PDF with charts
- [ ] Real-time dashboard updates
- [ ] Performance benchmarking

---

## Files Modified

- **index.html** - Added buttons, modals, CSS, and functions
- **js/socialAnalyticsImport.js** - Added reporting utility functions
- **templates/social-analytics-import-template.csv** - Updated format

---

## Integration Checklist

- [x] Report button added to Social Analytics header
- [x] Download button added to Social Analytics header
- [x] Top posts modal created and styled
- [x] Monthly report modal created and styled
- [x] JavaScript functions implemented
- [x] CSV export working
- [x] HTML report working
- [x] Permission checks in place
- [x] Error handling implemented
- [x] Toast notifications added
- [x] Responsive design implemented
- [x] Documentation complete

---

## Support

For issues or questions:
1. Check error messages shown in toast notifications
2. Review console (F12 → Console) for detailed errors
3. Verify permissions are set correctly
4. Ensure data has been imported
5. Check date formats in imported data

---

**Status:** ✅ READY FOR PRODUCTION

These reporting features are fully implemented and tested. Users can now easily view top-performing posts and download detailed monthly analytics reports for all clients.
