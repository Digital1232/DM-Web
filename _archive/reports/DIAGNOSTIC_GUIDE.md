# DIAGNOSTIC GUIDE - Filter Issues

## Purpose
To systematically identify why the filters aren't working for Employee Dashboard and Employee Client Task Timing Report.

## Instructions

### Step 1: Open Browser Console
1. Press **F12** to open Developer Tools
2. Click the **Console** tab
3. Keep console visible while testing

### Step 2: Navigate to Reports
1. Go to main menu
2. Click **Reports & Analytics**
3. Watch console for messages (should see various log messages)

### Step 3: Test Employee Dashboard Filters

1. Click on **Employee Reports** → **Employee Dashboard** tab
2. **In console, you should see:**
   ```
   === FILTER CHANGE TRIGGERED ===
   Current Report Tab: employee-dashboard
   Active View: reports
   Filter Elements: {userFilterEl: true, rangeFilterEl: true}
   Filter Values: {user: "current", timeRange: "30"}
   allTimeLogs available: [NUMBER]
   Calling renderEmployeeSelfPerformanceDashboard...
   === DASHBOARD RENDER START ===
   ```

3. **If you see "allTimeLogs available: 0"** → DATA IS NOT LOADING
   - This is the ROOT CAUSE
   - See "Diagnosing Empty Data" below

4. **If you see data loaded but dashboard still blank:**
   - Look for error messages in console
   - Check the render output

### Step 4: Change Filters and Observe

1. Change the **Employee** dropdown
2. **Console should show:**
   ```
   === FILTER CHANGE TRIGGERED ===
   Filter Values: {user: "..."}
   Calling renderEmployeeSelfPerformanceDashboard...
   === DASHBOARD RENDER START ===
   ```

3. Change the **Time Range** dropdown
4. Same messages should appear

### Step 5: Test Employee Client Task Timing Report

1. Click on **Employee Reports** → **Employee Client Task Timing** tab
2. **In console, look for:**
   ```
   === FILTER CHANGE TRIGGERED ===
   === ECTT RENDER START ===
   Filters: {employee, client, taskType, status}
   ✓ Filtered logs: [NUMBER]
   ```

3. Change each filter:
   - **Employee** dropdown
   - **Client** dropdown
   - **Task Type** dropdown
   - **Status** dropdown

4. After each change, console should show filter change messages

---

## Diagnosis Flowchart

### Issue: Filters Don't Update Dashboard

#### Q1: Do you see "=== FILTER CHANGE TRIGGERED ===" in console?
- **NO** → Filters aren't connected properly
  - The onchange event isn't firing
  - Check HTML onchange handlers
  
- **YES** → Go to Q2

#### Q2: Does console show "allTimeLogs available: 0"?
- **YES** → **ROOT CAUSE: DATA NOT LOADING**
  - Time logs are not being fetched from Firebase
  - Data loading issue, not filter issue
  - Check Firebase connection
  - Check user permissions
  
- **NO** (shows number > 0) → Go to Q3

#### Q3: Do you see "✓ Filtered logs: [NUMBER]" or "✓ Data aggregated"?
- **NO** → Rendering is failing
  - Look for error messages
  - Check browser console for JavaScript errors
  
- **YES** → Go to Q4

#### Q4: Do the dashboard sections appear after render messages?
- **NO** → Rendering function completed but HTML didn't update
  - Check if render functions are missing
  - Check HTML element IDs match function expectations
  
- **YES** → Filters ARE working
  - If dashboard doesn't update when you change filters, issue is with filter UI responsiveness

---

## Specific Issues and Solutions

### Issue: "Loading data... (Logs: 0)"
**Cause:** `allTimeLogs` is empty when dashboard tries to render
**Solution:**
1. Check if you're on the Reports page (data only loads there)
2. Wait 3-5 seconds for Firebase to fetch data
3. Refresh page if stuck
4. Check user permissions (you need access to view reports)

### Issue: Filter onchange event not firing
**Check console for:**
```
Filter Elements: {userFilterEl: false, rangeFilterEl: false}
```
**This means:** HTML elements don't exist
**Solution:**
1. Check HTML has correct element IDs:
   - `employee-dashboard-user-filter`
   - `employee-dashboard-range-filter`
2. Check onchange handlers are present in HTML

### Issue: Console shows no messages when filters change
**This means:** `handleEmployeeDashboardFilterChange()` is NOT being called
**Check:**
1. HTML select elements have `onchange="handleEmployeeDashboardFilterChange()"`
2. `employee-dashboard.js` is loaded (check in Network tab)
3. JavaScript has no errors preventing function definition

---

## What to Report

When you encounter an issue, collect and share:

1. **Browser console screenshot** showing:
   - All messages when you click Employee Dashboard tab
   - Messages when you change filters

2. **Specific behavior** you see:
   - Dashboard blank? (with "Loading..." message?)
   - Dashboard showing old data? (doesn't update on filter change?)
   - No filter dropdown elements? (filters not visible?)

3. **Data status:**
   - Does console show `allTimeLogs available: 0` or a number?
   - Does it say "✓ Filtered logs: [NUMBER]"?

4. **Error messages:**
   - Any red text in console?
   - Any errors in browser Network tab?

---

## Quick Checklist

- [ ] Open F12 console before testing
- [ ] Navigate to Reports page
- [ ] Click Employee Dashboard tab
- [ ] Check console for "FILTER CHANGE TRIGGERED" message
- [ ] Note the "allTimeLogs available: [NUMBER]"
- [ ] Try changing filters
- [ ] Take screenshot of all console messages
- [ ] Share console output when reporting issues

---

## Console Message Legend

| Symbol | Meaning |
|--------|---------|
| `===` | Major section start |
| `✓` | Success / working correctly |
| `⚠️` | Warning / data not ready |
| `❌` | Error / failure |
| No symbol | Informational message |

Look for these patterns to understand what's happening!
