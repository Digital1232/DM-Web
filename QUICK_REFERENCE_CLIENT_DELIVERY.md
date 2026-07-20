# Quick Reference - Client Delivery Dashboard

## ✓ Status: FULLY INTEGRATED & READY

---

## Access the Dashboard

**Reports & Analytics → Client Reports → Video Delivery Dashboard**

---

## What You See

### Table Columns:
| Column | Meaning |
|--------|---------|
| **Client** | Client name |
| **Videos Total** | All video tasks |
| **Completed** ✓ | Done/QC'd/Client Sent |
| **Posted** 📤 | Delivered to client |
| **Pending** ⏳ | Still in progress |
| **Completion %** | % Complete (color-coded) |
| **Avg Hours** | Hours per video |

### Color Coding:
- **Green** (≥80%) = On track
- **Yellow** (50-79%) = In progress
- **Red** (<50%) = Behind

---

## Quick Actions

### View Toggle
- Click **Table** button for detailed metrics
- Click **Chart** button for visual overview

### Update Date Range
1. Use date filters at top of Reports page
2. Dashboard automatically updates
3. Period badge shows selected dates

### Sort Data
- Clients are alphabetically sorted
- Table is ready for additional sorting features

---

## Integration Details

### Menu Location
- Reports & Analytics → Client Reports section
- Below "Client Performance"

### Metrics Source
- Pulls from task list
- Filters: `issuetype === 'Video'` or `labels: video`
- Groups by: client field

### Permissions
- ✓ Admin can access
- ✓ Manager can access
- ✗ Other roles cannot access

---

## Status Classifications

```
Task Status → Dashboard Metric
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
completed       → Completed
done            → Completed
client sent     → Completed + Posted
qc done         → Completed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
to do           → Pending
in progress     → Pending
in review       → Pending
corrections     → Pending
```

---

## Technical Reference

### Key Functions
- `switchClientDeliveryView(view)` - Toggle table/chart
- `renderClientDeliveryDashboard()` - Populate metrics

### Panel ID
- `report-panel-client-delivery`

### Tab Button ID
- `report-tab-client-delivery`

### Data Container
- `cd-table-body` - Table data rows
- `cd-table-view` - Table view wrapper
- `cd-chart-view` - Chart view wrapper

---

## Common Scenarios

### "How is client X doing?"
→ Look at their row, check Completion %

### "What's our overall progress?"
→ Review Completion % across all clients

### "Which clients need attention?"
→ Look for red (<50%) completion %

### "How many videos are posted?"
→ Sum the "Posted" column

---

## Files to Reference

- **User Guide**: DASHBOARD_USER_GUIDE.md
- **Technical Docs**: CLIENT_DELIVERY_DASHBOARD_COMPLETE.md
- **Implementation**: index.html (lines 7386-7443)
- **Functions**: index.html (lines 36238-36280)

---

## Testing Checklist

- [x] Button visible in menu
- [x] Tab switches to dashboard
- [x] Metrics display correctly
- [x] Colors update based on completion %
- [x] Date filters work
- [x] No data shows "No video tasks found"
- [x] Admin/Manager access works
- [x] Non-admin users blocked

---

## Support Matrix

| Issue | Solution |
|-------|----------|
| No data showing | Check admin/manager role + date range |
| Dashboard missing | Refresh page, check permissions |
| Wrong metrics | Verify task issuetype = "Video" |
| Can't access | Confirm you're admin or manager |
| Dates not updating | Use date filter at top of Reports |

---

**Version**: 1.0 | **Status**: Production Ready | **Date**: July 13, 2026
