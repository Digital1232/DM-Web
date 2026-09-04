# Client Delivery Dashboard - Setup & Troubleshooting Guide

## Overview
The Client Delivery Dashboard displays **planned** videos and posters count per client from strategy calendar events, combined with **actual** task completion tracking. The planned counts come from strategy events and are used as the baseline for calculating completion percentages.

### Key Concept: Planned vs. Actual
- **Planned** (Videos Count, Posters Count): Come from strategy events. These are what the team committed to deliver.
- **Actual** (Completed, Posted, Pending): Come from task tracking. These show what was actually completed.

## How It Works

### Data Flow
1. **Strategy Events** → User creates events in Strategy Calendar with Videos Count and Posters Count
2. **Firebase Storage** → Data saved to `worksync/strategy_events` with fields:
   - `videosCount`: Number of videos planned
   - `postersCount`: Number of posters planned
   - `date`: Date of the event
   - `client`: Client name
3. **Dashboard Load** → When Reports view opens, Firebase listener loads strategy events
4. **Aggregation** → Counts grouped by client and date range
5. **Rendering** → Table displays videos/posters per client with task completion status

---

## Step 1: Create Strategy Events with Video/Poster Counts

### In Strategy Calendar:
1. Go to **Strategy Calendar** view
2. Click "Add" button or click on a date
3. Fill in the form:
   - **Event Title**: e.g., "Summer Campaign - Video Bundle"
   - **Date**: Select date
   - **Format**: Choose "Video" or "Poster"
   - **Client**: Select client name
   - **Videos Count**: Enter number (e.g., 5)
   - **Posters Count**: Enter number (e.g., 3)
   - Fill other fields as needed
4. Click "Save Event"

### Expected Result:
- Event appears in Strategy Calendar
- Data saved to Firebase at `worksync/strategy_events/{eventId}`

---

## Step 2: View in Client Delivery Dashboard

### In Reports View:
1. Go to **Reports** tab
2. Scroll down or find **"Client Delivery Dashboard"** tab
3. Select a date range using the date filter (top of Reports)
4. Dashboard automatically filters events for that date range
5. Table shows:
   - **Client**: Client name
   - **Videos Count**: Total videos planned (from all events for that client in date range)
   - **Posters Count**: Total posters planned (from all events for that client in date range)
   - **Completed**: Tasks with "Completed" status
   - **Posted**: Tasks with "Posted" status
   - **Pending**: Tasks with "Pending" status
   - **Completion %**: Percentage of completion
   - **Avg Hours**: Average hours (currently 0)

---

## Troubleshooting

### Issue 1: Dashboard Shows "No data found"

**Possible Causes:**
1. No strategy events created yet for the date range
2. Strategy events don't have client names assigned
3. Date range doesn't match event dates

**Solution:**
- Open **Strategy Calendar**
- Create new events with proper:
  - Client name selected
  - Date within your selected report date range
  - Videos Count and Posters Count filled in

### Issue 2: Video/Poster Counts Show 0

**Check Browser Console for Logs:**

Press `F12` to open Developer Tools, go to **Console** tab, and look for these messages:

```
[initReportFilters] Initial fetch - Strategy events loaded: X events
[Client Delivery Dashboard] Data Sources: {...}
[Client Delivery] Event: [title] ([client]) - Videos: X, Posters: X
[Client Delivery] Final metrics: {...}
```

**If you see "0 events":**
- No strategy events exist in Firebase for that path
- Check: `worksync/strategy_events` collection in Firebase

**If you see events but counts are 0:**
- Check: Each event has `videosCount` and `postersCount` fields
- Verify: Fields have numeric values, not null/undefined

**If console shows no logs at all:**
- Client Delivery tab might not be active
- Click on "Client Delivery" tab explicitly
- Check date range is set (top of Reports)

### Issue 3: Data Not Updating After Adding Events

**Solution:**
1. The Firebase listener should auto-update
2. If not, try:
   - Switch away from Reports, then back
   - Refresh the page
   - Check browser console for Firebase errors

### Issue 4: Alignment/Overlapping Issues

**Solution:**
- The panel should display below other report panels
- If overlapping, try:
  - Refresh page
  - Clear browser cache
  - Check screen resolution (try resizing window)
  - Test in different browser

---

## Database Structure

### Strategy Event Document
```json
{
  "title": "Summer Campaign Videos",
  "date": "2026-07-20",
  "client": "ClientName",
  "videosCount": 5,
  "postersCount": 3,
  "format": "Video",
  "status": "In Progress",
  "desc": "Campaign description",
  "owner": "user@example.com",
  "createdAt": 1689000000000,
  "updatedAt": 1689000000000
}
```

### Aggregation Logic
```javascript
// Example with two events for same client
Event 1: Client "Acme", Videos: 5, Posters: 2
Event 2: Client "Acme", Videos: 3, Posters: 1

// Dashboard shows for Acme:
Videos Count: 8 (5+3)
Posters Count: 3 (2+1)
```

---

## Console Debugging

When troubleshooting, check console logs in this order:

1. **Firebase Connection**
   ```
   [initReportFilters] Initial fetch - Strategy events loaded: X events
   ```
   - Should show > 0 events if data exists

2. **Data Aggregation**
   ```
   [Client Delivery Dashboard] Data Sources: {strategyEventsCount: X, ...}
   ```
   - Shows how many strategy events were found

3. **Per-Event Logging**
   ```
   [Client Delivery] Event: [title] ([client]) - Videos: X, Posters: X
   ```
   - Shows each event that matched the date range

4. **Final Result**
   ```
   [Client Delivery] Final metrics: {clientName: {videosCount: X, postersCount: X, ...}}
   ```
   - Shows aggregated data by client

---

## Common Workflow

### Daily Use:
1. **Morning**: Create strategy events for planned content in Strategy Calendar
   - Add estimated Videos Count and Posters Count
   - Assign to appropriate clients
   
2. **Throughout Day**: Update event status as work progresses
   - "In Progress" → "Completed" → "Posted"
   
3. **End of Day/Week**: View Client Delivery Dashboard in Reports
   - Check progress against planned videos/posters
   - Identify bottlenecks or delays
   - Use completion % to track team efficiency

---

## Related Features

- **Strategy Calendar**: Main interface for creating and managing events
- **Reports**: Parent view that contains the Client Delivery Dashboard
- **Task Management**: Completion status tracked separately from planned counts
- **Dark Mode**: Dashboard fully styled for both light and dark themes

---

## Support

If issues persist:
1. Check all console logs (search for "[" prefix)
2. Verify Firebase data exists at `worksync/strategy_events`
3. Confirm user has read/write permissions
4. Try in different browser (rule out browser-specific issues)
5. Clear browser cache and refresh

