# Jira API Migration Bugfix Design

## Overview

The "Add Strategy Event" dialog's Jira task auto-fetch feature is broken due to Atlassian deprecating and removing the `/rest/api/3/search` endpoint. The fix involves updating the deprecated endpoint URL from `/rest/api/3/search?jql=...` to `/rest/api/3/search/jql?jql=...` in the `fetchJiraTasksForStrategy()` function in `script.js`. Notably, other task syncing functions in the same file already use the correct endpoint format, confirming the fix approach.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when the `fetchJiraTasksForStrategy()` function constructs and sends a Jira API request using the old endpoint path
- **Property (P)**: The desired behavior when searching for Jira tasks - the request succeeds with the new endpoint and returns matching tasks
- **Preservation**: Existing behavior for manual task ID entry, background task syncing, and other application functions that must remain unchanged
- **fetchJiraTasksForStrategy()**: Function in `script.js` (line ~2815-2893) that fetches matching Jira tasks when a user searches in the "Add Strategy Event" modal
- **jql**: JQL (Jira Query Language) parameter that specifies the search criteria for finding tasks
- **JIRA.domain**: The Jira instance domain (e.g., "vilpowerdigitalmarketing.atlassian.net")

## Bug Details

### Bug Condition

The bug manifests when the `fetchJiraTasksForStrategy()` function constructs a Jira API request for searching tasks. The function is using the deprecated API endpoint path that Atlassian removed.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type {userSearch: string, context: "strategy_event_dialog"}
  OUTPUT: boolean
  
  RETURN input.context = "strategy_event_dialog"
         AND fetchJiraTasksForStrategy is called
         AND endpoint_used = "/rest/api/3/search?jql=..."
         AND NOT endpoint_used = "/rest/api/3/search/jql?jql=..."
END FUNCTION
```

### Examples

- **Example 1 (Bug)**: User opens "Add Strategy Event" dialog, types "PROJ-123" in search field, function constructs URL `https://domain/rest/api/3/search?jql=...`, Jira returns 404/410 "API has been removed"
- **Example 2 (Bug)**: User opens "Add Strategy Event" dialog, types "Deploy website" in search field, function constructs URL with old endpoint, request fails, dropdown shows error message
- **Example 3 (Fix Verification)**: User performs same search, function constructs URL `https://domain/rest/api/3/search/jql?jql=...`, Jira returns 200 with matching tasks list
- **Edge Case**: Empty search term or special characters - should be handled by existing sanitization logic, unchanged by endpoint fix

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Users can still manually enter Jira task IDs in the strategy event form without using auto-fetch
- Background task synchronization functions that already use the correct endpoint format continue to work
- All other application features (task viewing, status updates, navigation, etc.) remain unaffected
- Error handling and user feedback mechanisms remain consistent

**Scope:**
All inputs and use cases that do NOT involve the `fetchJiraTasksForStrategy()` function's auto-fetch API call should be completely unaffected by this fix. This includes:
- Manual Jira task ID entry in forms
- Background task syncing operations (which already use the correct endpoint)
- User interactions with non-Jira features
- Other API calls to Jira

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is straightforward:

1. **Endpoint Path Mismatch**: The `fetchJiraTasksForStrategy()` function constructs the endpoint as `/rest/api/3/search?jql=...` which is the deprecated path that Atlassian removed.

2. **Inconsistent Updates**: Other functions in the same file (e.g., `fetchAllJiraIssues()` at line ~3047) were already updated to use the correct `/rest/api/3/search/jql?jql=...` endpoint format, but this function was missed.

3. **Atlassian API Change**: Atlassian's CHANGE-2046 changed the API path structure, moving from query parameter-based search to a path-based search endpoint, requiring the path `/rest/api/3/search/jql` instead of `/rest/api/3/search`.

## Correctness Properties

Property 1: Bug Condition - Deprecated Endpoint Request

_For any_ search request where the user searches for Jira tasks in the "Add Strategy Event" dialog, the fixed `fetchJiraTasksForStrategy()` function SHALL construct the URL using the new `/rest/api/3/search/jql?jql=...` endpoint format (not the deprecated `/rest/api/3/search?jql=...`), allowing Jira to successfully process the request and return matching tasks.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - Non-Auto-Fetch Jira Operations

_For any_ operation that is NOT the `fetchJiraTasksForStrategy()` auto-fetch feature (including manual task ID entry, background task syncing, and other application functions), the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing functionality.

**Validates: Requirements 3.1, 3.2, 3.3**

## Fix Implementation

### Changes Required

**File**: `script.js`

**Function**: `fetchJiraTasksForStrategy()` (line ~2815-2893)

**Specific Changes**:

1. **Update Endpoint URL**: Change the URL construction from:
   ```javascript
   const url = `https://${JIRA.domain}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=20&fields=key,summary,status,assignee`;
   ```
   to:
   ```javascript
   const url = `https://${JIRA.domain}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=20&fields=key,summary,status,assignee`;
   ```
   The change: `/rest/api/3/search` → `/rest/api/3/search/jql` (add `/jql` to the path)

2. **No other changes needed**: The query parameter handling, field selection, error handling, and UI feedback remain unchanged as the endpoint parameter structure is compatible with the old format.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface the API error that demonstrates the bug on unfixed code, then verify the fix works correctly with the new endpoint and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface the API error that demonstrates the bug BEFORE implementing the fix. Confirm the root cause analysis.

**Test Plan**: Write tests that call `fetchJiraTasksForStrategy()` with sample search terms and assert that a request is sent to Jira. Run these tests on the UNFIXED code to observe the API error and confirm the deprecated endpoint is being used.

**Test Cases**:
1. **Search by Task Key**: Call `fetchJiraTasksForStrategy()` with search term "PROJ-123" (will fail on unfixed code with "API has been removed" error)
2. **Search by Summary**: Call `fetchJiraTasksForStrategy()` with search term "Deploy website" (will fail on unfixed code with API error)
3. **Search with Special Characters**: Call `fetchJiraTasksForStrategy()` with search term containing special chars (will fail on unfixed code with API error)
4. **Empty Result Set**: Call `fetchJiraTasksForStrategy()` with search term that matches no tasks (will fail with API error on unfixed code)

**Expected Counterexamples**:
- HTTP response indicates "API has been removed" or returns 404/410 error code
- Jira API returns error message: "The requested API has been removed. Please migrate to /rest/api/3/search/jql API"
- Dropdown displays red error instead of task results

### Fix Checking

**Goal**: Verify that for all search requests in the "Add Strategy Event" context, the fixed function produces the expected behavior (successful Jira API response with task results).

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := fetchJiraTasksForStrategy_fixed(input)
  ASSERT result.success = true
  ASSERT result.tasks is not empty or result.message = "No matching tasks"
  ASSERT result.error does not contain "API has been removed"
END FOR
```

### Preservation Checking

**Goal**: Verify that for operations NOT involving `fetchJiraTasksForStrategy()`, the fixed code produces the same result as the original function.

**Pseudocode:**
```
FOR ALL operation WHERE NOT isBugCondition(operation) DO
  ASSERT originalCode(operation) = fixedCode(operation)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking to ensure edge cases are covered.

**Test Plan**: Verify that:
1. Manual Jira task ID entry still works (no changes to that code path)
2. Background task syncing continues to work (already uses correct endpoint)
3. Other application features function normally

**Test Cases**:
1. **Manual Task ID Entry**: Verify users can still manually enter task IDs (e.g., "PROJ-123") in the form field
2. **Background Task Sync**: Verify existing background sync operations continue to function (already use correct endpoint)
3. **Other Features**: Smoke tests for other application features to ensure no unintended side effects

### Unit Tests

- Test that `fetchJiraTasksForStrategy()` constructs the correct endpoint URL with `/rest/api/3/search/jql` path
- Test JQL query construction for various search terms (keys, summaries, special characters)
- Test error handling when Jira API returns errors
- Test dropdown rendering with search results

### Property-Based Tests

- Generate random search terms and verify requests are made to the correct endpoint
- Verify URL encoding is correct for all characters and special cases
- Verify response handling works for various result set sizes (0, 1, many tasks)

### Integration Tests

- Test full user workflow: open "Add Strategy Event" dialog, search for tasks, select a task from dropdown
- Test that selected task ID is properly stored in the form
- Test end-to-end flow with actual Jira projects (MAY, JUN, JULY mentioned in scope)
