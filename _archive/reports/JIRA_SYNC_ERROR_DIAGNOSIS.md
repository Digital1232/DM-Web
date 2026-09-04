# Jira Sync Failed - Diagnosis & Solutions

## Error Message
```
Address unavailable: https://vilpowerdigitalmarketing.atlassian.net/rest/api/3/search/jql?jql=project%20in%20('MAY'%2C'JUN'%2C'JULY')%20ORDER%20BY%20updated%20DESC&maxResults=100&fields=...&nextPageToken=Ck11cGRhdGVkJnVwZGF0ZWQmT1JERVJfREVTQyNMb25nJk1UYzRNelU0TnpnM09UWTROdz09JVN0cmluZyZTbFZNV1E9PSVJbnQmTnpFMBBkGLmwsYD2MyI1cHJvamVjdCBpbiAoJ01BWScsJ0pVTicsJ0pVTFknKSBPUkRFUiBCWSB1cGRhdGVkIE...
```

## Root Cause Analysis

The error **"Address unavailable"** indicates the request cannot reach the Jira server. This is typically due to:

### 1. **Network/Connectivity Issues**
- **Symptom**: Cannot reach `vilpowerdigitalmarketing.atlassian.net`
- **Causes**:
  - Network connectivity problem
  - DNS resolution failing
  - ISP/firewall blocking the domain
  - Jira instance temporarily down
- **Check**: Try accessing Jira directly in your browser: https://vilpowerdigitalmarketing.atlassian.net

### 2. **Invalid/Expired API Token**
- **Symptom**: 401 Unauthorized or connection refused
- **Location**: Environment variables in your deployment
- **Solution**: Regenerate Jira API token and update environment variables

### 3. **nextPageToken URL Encoding Issue**
- **Symptom**: The token appears **truncated/corrupted** in the error URL
- **Issue**: The `nextPageToken` parameter contains special characters that may not be properly encoded
- **Location**: `fetchAllJiraIssues()` function around line 16460

```javascript
// CURRENT (may have encoding issues)
if (nextPageToken) {
    url += `&nextPageToken=${encodeURIComponent(nextPageToken)}`;
}

// The token is being truncated in the error message
```

### 4. **Missing JIRA API Configuration**
- **File**: Environment variables (.env, deployment settings)
- **Required**:
  - `JIRA_DOMAIN` = `vilpowerdigitalmarketing.atlassian.net`
  - `JIRA_AUTH_EMAIL` = Your Jira email
  - `JIRA_TOKEN` = Your Jira API token (NOT password)

---

## Immediate Actions to Fix

### Step 1: Verify Jira Connectivity
```
1. Go to https://vilpowerdigitalmarketing.atlassian.net
2. Check if you can login with your Jira account
3. If unable, contact Jira admin or wait for service restoration
```

### Step 2: Regenerate Jira API Token
```
1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Delete the old token
3. Create a new API token
4. Copy the entire token (it won't show again)
5. Update your environment variables/secrets
```

### Step 3: Update Environment Variables
**For local development** (.env file):
```
JIRA_DOMAIN=vilpowerdigitalmarketing.atlassian.net
JIRA_AUTH_EMAIL=your-email@company.com
JIRA_TOKEN=your_full_api_token_here
```

**For deployment** (Vercel/Google Cloud):
1. Go to your deployment settings
2. Update the environment variables with the new token
3. Redeploy

### Step 4: Fix nextPageToken Encoding (if needed)
The `fetchAllJiraIssues()` function needs to handle pagination properly:

```javascript
// IMPROVED VERSION
async function fetchAllJiraIssues(jql, fields = 'summary,status,priority,labels,assignee,duedate,issuetype,parent,components') {
    const issues = [];
    const maxResults = 100;
    let startAt = 0;  // Use startAt instead of nextPageToken for pagination
    let isLast = false;

    while (!isLast) {
        let url = `https://${JIRA.domain}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&startAt=${startAt}&fields=${fields}`;
        
        console.log(`📡 Fetching Jira issues: startAt=${startAt}`);
        
        try {
            const res = await jiraRequest(url);
            
            if (!res.success || res.data?.errorMessages || res.data?.message) {
                throw new Error(jiraErrorMessage(res));
            }

            const pageIssues = res.data?.issues || [];
            issues.push(...pageIssues);
            
            // Check if there are more results
            const total = res.data?.total || 0;
            isLast = (startAt + pageIssues.length) >= total;
            
            startAt += maxResults;
            
        } catch (err) {
            console.error(`✗ Jira fetch failed: ${err.message}`);
            throw err;
        }
    }

    return issues;
}
```

---

## Quick Troubleshooting Checklist

- [ ] Can you access Jira directly in browser? https://vilpowerdigitalmarketing.atlassian.net
- [ ] Is your Jira API token valid and not expired?
- [ ] Are environment variables properly set?
- [ ] Is the proxy URL correct? (`/api/jira` or Google Apps Script URL)
- [ ] Check browser console for detailed error messages
- [ ] Try clicking "Diagnostics" button to test Jira connection

---

## Testing Jira Connection

### Using the Diagnostics Button
1. Click **Settings → Diagnostics** in the sidebar
2. This will test:
   - ✓ Jira Authentication
   - ✓ Project access (MAY, JUN, JULY)
   - ✓ API connectivity

### Using Browser Console
```javascript
// Test in browser console
await jiraRequest('https://vilpowerdigitalmarketing.atlassian.net/rest/api/3/myself')
    .then(r => console.log('✓ Auth OK', r))
    .catch(e => console.error('✗ Auth Failed', e));
```

---

## Configuration Files

### Production (Vercel)
- Environment variables in Vercel dashboard
- Check: Settings → Environment Variables

### Local Development
- `.env.local` file
- Must include:
  ```
  JIRA_DOMAIN=vilpowerdigitalmarketing.atlassian.net
  JIRA_AUTH_EMAIL=your-email@vilpower.com
  JIRA_TOKEN=ATATT3xFfGF...
  ```

### Google Apps Script (Alternative Proxy)
- URL: `https://script.google.com/macros/s/AKfycbwk85wuNOnEYt675Rf-6IMwPJFxmLHW2ONQYigtni6AxU-gIdiNY497wxJHDtmd_XD-/exec`
- Script Properties must have:
  - `JIRA_AUTH_EMAIL`
  - `JIRA_TOKEN`

---

## Common Fixes

| Error | Cause | Solution |
|-------|-------|----------|
| Address unavailable | Network/DNS | Check internet, verify Jira is running |
| 401 Unauthorized | Invalid token | Regenerate API token |
| 403 Forbidden | Insufficient permissions | Check Jira user permissions |
| 404 Not Found | Wrong project key | Verify project keys: MAY, JUN, JULY |
| Pagination error | nextPageToken issue | Use `startAt` instead for pagination |

---

## Prevention & Best Practices

1. **Monitor API Token Expiry**
   - Jira tokens don't expire automatically
   - But best practice: rotate every 90 days

2. **Use startAt Instead of nextPageToken**
   - More reliable for pagination
   - Simpler encoding

3. **Add Retry Logic**
   - Network errors are temporary
   - Retry after 1-2 seconds

4. **Log Full Responses**
   - Keep detailed logs of Jira API responses
   - Helps with debugging

5. **Rate Limiting**
   - Jira has rate limits
   - Add exponential backoff for retries

---

## Status

**Needs Investigation**: 
- Verify network connectivity to Jira
- Check API token validity
- Review deployment environment variables
- Check Jira instance status

**Action Required**: 
- Click Diagnostics button to test connection
- Or manually verify credentials

---

**Last Updated**: July 14, 2026
**Affected**: Jira sync for projects MAY, JUN, JULY
**Priority**: High (blocks task synchronization)
