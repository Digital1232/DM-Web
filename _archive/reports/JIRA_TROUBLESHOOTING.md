# Jira Integration Troubleshooting Guide

## Error: "Connection successful, but Jira returned ZERO tasks"

This error occurs when the Jira API connection works, but no tasks are returned. This typically means one of the following:

### Root Causes & Solutions

#### 1. **API Token Permissions Issue** ❌
**Symptom:** Connection succeeds but zero tasks returned

**Solution:**
- Verify the API token has the correct scopes:
  - ✓ `offline_access` - Access Jira without re-authentication
  - ✓ `read:jira-work` - Read access to Jira issues
  - ✓ `write:jira-work` - Write access (if logging work)
  
**Steps to Check:**
1. Log in to Jira Cloud at `https://id.atlassian.com/manage/api-tokens`
2. Find the token used (should be associated with `digitalmarketing@vilpower.com`)
3. Verify it has these scopes listed
4. If missing scopes, delete and create a new token with proper permissions

---

#### 2. **Project Key is Incorrect or Doesn't Exist** ❌
**Current Config:** `projectKey: 'J2'`

**Solution:**
- Verify the project key exists in your Jira instance
- Go to `https://vilpowerdigitalmarketing.atlassian.net/projects`
- Check if project `J2` is listed
- If not found, use the correct project key

**To Find Your Project Key:**
1. Open your Jira instance
2. Click on any project
3. The URL will show: `https://vilpowerdigitalmarketing.atlassian.net/browse/[PROJECT_KEY]`
4. The part in brackets is your project key

---

#### 3. **API Token is Expired** ❌
**Token Lifespan:** API tokens are valid for 1 year from creation

**Solution:**
- Go to `https://id.atlassian.com/manage/api-tokens`
- Look for the token's creation date
- If older than 1 year, create a new token:
  1. Click "Create API token"
  2. Give it a descriptive name (e.g., "WorkSync Dashboard")
  3. Copy the token
  4. Update the `jiraConfig.token` in the code

---

#### 4. **Google Script Proxy URL is Down** ❌
**Current Config:** `gsUrl: 'https://script.google.com/macros/s/AKfycbyHTB_gISHJk8XL06doJZIivx_4w6jnCCBD2Zb65XjWsHgSN-rrpcMrPPyYkcwNZlBB/exec'`

**Solution:**
- The proxy URL may have been deactivated or deployed incorrectly
- Test it directly: Open the URL in a browser - it should show a message
- If it returns a blank page or error:
  1. Access the Google Sheet connected to this script
  2. Tools > Script Editor
  3. Verify the deployment is "New"
  4. Redeploy as a web app
  5. Copy the new URL to `jiraConfig.gsUrl`

---

#### 5. **No Tasks in the Jira Project** ❌
**Symptom:** Project exists and connection works, but it's empty

**Solution:**
- Manually check the project: `https://vilpowerdigitalmarketing.atlassian.net/browse/J2`
- Create test tasks if needed
- Verify the assignee/reporter filters match the current user

---

#### 6. **Wrong Authentication Email** ❌
**Current Config:** `const authEmail = 'digitalmarketing@vilpower.com';`

**Issue:** If the API token doesn't belong to this email, the query may fail silently

**Solution:**
- Verify the API token owner:
  1. Go to `https://id.atlassian.com/manage/api-tokens`
  2. Check which account created the token
  3. Update `authEmail` to match the token owner
  4. Or create a new token under the correct account

---

## Diagnostic Tools

### Run Connection Diagnostic in Dashboard
1. Click **"Diagnose Connection"** button in the sidebar (under Configuration)
2. This runs comprehensive tests:
   - Google Script connectivity
   - Jira API authentication
   - Project access verification
3. Check the browser console for detailed output (F12 → Console tab)

### Browser Console Debugging
1. Open Developer Tools: **F12** or **Ctrl+Shift+I**
2. Go to **Console** tab
3. Look for logs prefixed with:
   - ✓ `Jira Proxy Raw Data` - Shows actual response
   - ✗ `Jira Sync Error` - Shows failure reason
   - ℹ `Active Sync ID` - Shows authenticated user
   - ℹ `Sync Strategy` - Shows JQL queries tried

### Example Console Output:
```
Active Sync ID: 5b7f3c0d9e2a1b4c6f8e9d0a1b2c3d
Auth Email: digitalmarketing@vilpower.com
Jira Domain: vilpowerdigitalmarketing.atlassian.net
Project Key: J2
Sync Strategy: Trying JQL [project = "J2" AND ...]
Jira Query URL: https://vilpowerdigitalmarketing.atlassian.net/rest/api/3/search?jql=...
Jira Proxy Raw Data: { issues: [], startAt: 0, maxResults: 50 }
```

---

## Configuration Reference

**Location:** In `Index.html` around line 899

```javascript
const jiraConfig = {
    domain: 'vilpowerdigitalmarketing.atlassian.net',     // Your Jira domain
    token: 'ATATT3xFfGF0...',                             // API token from atlassian.net
    projectKey: 'J2',                                     // Project key to sync
    gsUrl: 'https://script.google.com/macros/s/.../exec'  // Google Script proxy URL
};
```

---

## Complete Setup Checklist

- [ ] API token created at `https://id.atlassian.com/manage/api-tokens`
- [ ] Token has `offline_access` scope
- [ ] Token has `read:jira-work` scope
- [ ] Token has `write:jira-work` scope (for worklog)
- [ ] Project key exists in Jira instance
- [ ] Project has at least one task assigned or created
- [ ] Google Script proxy is deployed and active
- [ ] Token is not expired (created within last year)
- [ ] `jiraConfig.token` updated with correct token value
- [ ] `jiraConfig.domain` matches your Jira URL
- [ ] `jiraConfig.projectKey` matches your project
- [ ] `jiraConfig.gsUrl` is correct and accessible
- [ ] Run "Diagnose Connection" to verify all components

---

## Common Error Messages

### "Google Script URL is missing!"
- The `gsUrl` in config is empty or undefined
- Solution: Provide valid Google Script proxy URL

### "Jira configuration incomplete!"
- One of domain, token, or projectKey is missing
- Solution: Fill in all required fields in jiraConfig

### "Import Finished: Connection successful, but Jira returned ZERO tasks"
- See Root Causes section above
- Run diagnostic to identify the issue
- Most likely: Wrong projectKey or API token permissions

### Error in Console: "Unauthorized"
- API token is invalid or expired
- Solution: Create new token or verify token in config

### Error in Console: "Project does not exist"
- Project key is incorrect
- Solution: Verify correct project key in Jira

---

## Next Steps

1. **Verify Configuration:** Open browser console (F12) and check logs
2. **Run Diagnostics:** Click "Diagnose Connection" button
3. **Check Jira:** Manually verify project exists and has tasks
4. **Update Token:** If expired, create new token at atlassian.net
5. **Test Google Script:** Directly call the proxy URL from browser
6. **Contact Support:** If still failing, provide console output to admin

---

## Support Info

**Jira Instance:** `https://vilpowerdigitalmarketing.atlassian.net`
**Documentation:** `https://developer.atlassian.com/cloud/jira/rest/v3/`
**API Token Manager:** `https://id.atlassian.com/manage/api-tokens`

---

*Last Updated: January 31, 2026*
