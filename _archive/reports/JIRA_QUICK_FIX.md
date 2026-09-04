# Jira Integration - Quick Fix Guide

## Problem: "ZERO tasks" returned from Jira

### ⚡ Quick Fixes (Try These First)

**1. Check Browser Console for Actual Error**
- Press **F12** → **Console** tab
- Look for messages containing "errorMessages" or "error"
- Copy the error message and follow specific solution below

**2. Verify Project Key**
```
Current: projectKey: 'J2'
Check: Does project J2 exist in https://vilpowerdigitalmarketing.atlassian.net/projects
If missing: Update to correct project key in Index.html line 903
```

**3. Check API Token Expiry**
```
Go to: https://id.atlassian.com/manage/api-tokens
Look for: Token creation date
If > 1 year old: Create new token and update Index.html line 901
```

**4. Verify Token Permissions**
```
Go to: https://id.atlassian.com/manage/api-tokens
Expand token details
Check for: offline_access, read:jira-work, write:jira-work
If missing: Delete token and create new one with correct scopes
```

**5. Check Google Script URL**
```
Current: https://script.google.com/macros/s/AKfycbyHTB_gISHJk8XL06doJZIivx_4w6jnCCBD2Zb65XjWsHgSN-rrpcMrPPyYkcwNZlBB/exec
Test: Open URL in browser - should load (not show error)
If fails: Redeploy Google Script and get new URL
```

---

## Configuration Quick Reference

**File:** `Index.html` (Line 899-905)

```javascript
const jiraConfig = {
    domain: 'vilpowerdigitalmarketing.atlassian.net',     // ← Your Jira instance
    token: 'ATATT3xFfGF0...',                             // ← Your API token
    projectKey: 'J2',                                     // ← Your project key
    gsUrl: 'https://script.google.com/macros/...'         // ← Google Script URL
};
```

---

## New Diagnostic Features

### ✨ Diagnose Connection Button
- Location: Dashboard → Left Sidebar → "Diagnose Connection"
- Tests:
  - ✓ Google Script connectivity
  - ✓ Jira API authentication
  - ✓ Project existence
  - ✓ Permission validation

### 📋 Enhanced Error Messages
- Better error reporting in alert boxes
- Specific troubleshooting steps included
- Console logs all details for debugging

### 🔍 Debug Console Output
Press F12, go to Console, look for:
```
=== JIRA DIAGNOSTICS ===           (Start of diagnostics)
Active Sync ID: ...                (Authenticated user ID)
Jira Domain: ...                   (Your domain)
Project Key: ...                   (Your project)
Sync Strategy: Trying JQL [...]    (Query being tried)
Jira Proxy Raw Data: {...}         (API response)
✓ Project Lookup Response: {...}   (Project verification)
```

---

## Step-by-Step Troubleshooting

### Issue: "Connection successful, but Jira returned ZERO tasks"

**Step 1:** Open Developer Tools
```
F12 → Console tab
Copy any error messages you see
```

**Step 2:** Run Diagnostics
```
Click: "Diagnose Connection" button in sidebar
Check: Alert message and console output
```

**Step 3:** Verify in Order
```
□ API token is not expired (check atlassian.net)
□ API token has required scopes
□ Project key "J2" exists in Jira
□ Project has at least one task
□ Authentication email is correct (digitalmarketing@vilpower.com)
□ Google Script URL is accessible
```

**Step 4:** Update Configuration
```
If any above failed:
1. Open Index.html
2. Go to line 899-905
3. Update the failing config value
4. Save file
5. Refresh browser
6. Try importing again
```

---

## API Token Management

### Create New Token
1. Go to https://id.atlassian.com/manage/api-tokens
2. Click "Create API token"
3. Name: "WorkSync Dashboard"
4. Click "Create"
5. Copy the token value
6. Update jiraConfig.token in Index.html line 901
7. Save and refresh browser

### Check Token Expiry
1. Go to https://id.atlassian.com/manage/api-tokens
2. Find the token in the list
3. Check the date it was created
4. If > 1 year old, create new token

### Required Scopes
- ✓ `offline_access` - Required
- ✓ `read:jira-work` - Required
- ✓ `write:jira-work` - Required (for logging time)

---

## Emergency Commands

### Force Refresh Diagnostics
```javascript
// Paste into browser console (F12)
diagnoseJiraConnection();
```

### View Current Config
```javascript
// Paste into browser console (F12)
console.log('Jira Config:', jiraConfig);
```

### Manually Fetch Tasks (Advanced)
```javascript
// Paste into browser console (F12)
fetchJiraTasks();
```

---

## Contacts & Resources

| Item | Link |
|------|------|
| Jira Instance | https://vilpowerdigitalmarketing.atlassian.net |
| API Token Manager | https://id.atlassian.com/manage/api-tokens |
| Jira REST API Docs | https://developer.atlassian.com/cloud/jira/rest/v3/ |
| Full Guide | See JIRA_TROUBLESHOOTING.md |

---

## Checklist Before Importing

- [ ] Logged in to dashboard
- [ ] Project key is correct (J2)
- [ ] API token is not expired
- [ ] API token has all required scopes
- [ ] Google Script URL is working
- [ ] Jira project has tasks
- [ ] Click Configuration → Check if Jira shows as "Connected"
- [ ] Click "Diagnose Connection" - no errors in console

✓ All checked? Click "Sync Tasks" to import from Jira

---

*Last Updated: January 31, 2026*
*For detailed info: See JIRA_TROUBLESHOOTING.md*
