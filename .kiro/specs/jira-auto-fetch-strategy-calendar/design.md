# Design Document: Jira Auto-Fetch Strategy Calendar

## Overview

The Jira Auto-Fetch Strategy Calendar feature automatically fetches and populates event details from the Jira API when a user adds a strategy event to the Strategy Calendar. When a user enters or selects a Jira Task ID in the "Add Strategy Event" dialog, the system retrieves client information, assignee, and task status from Jira and auto-populates the corresponding form fields. This reduces manual data entry and ensures consistency between the Strategy Calendar and Jira task management.

### Key Objectives

1. Reduce manual data entry by automatically fetching Jira task details
2. Maintain data consistency between Strategy Calendar and Jira
3. Provide responsive UI feedback during fetch operations
4. Handle errors gracefully with user-friendly messages
5. Optimize performance through intelligent caching and debouncing
6. Preserve user overrides and maintain full backward compatibility

---

## Architecture

### High-Level Data Flow

```
User Input (Task ID)
     ↓
Input Validation & Debounce
     ↓
Cache Lookup
     ├─→ Cache Hit: Return cached data
     └─→ Cache Miss: Fetch from Jira API
     ↓
Jira API Request
     ├─→ Success (200): Extract & map data
     └─→ Error (4xx/5xx): Display error, preserve state
     ↓
Data Mapping & Transformation
     ├─→ Client Mapping
     ├─→ Status Mapping
     └─→ Assignee Extraction
     ↓
Field Population & Cache Storage
     ↓
UI Feedback (success/loading cleared)
```

### Integration Points

1. **Existing `jiraRequest()` Function**: Used for all API calls to Jira
2. **Strategy Event Modal**: The "Add Strategy Event" dialog in `index.html`
3. **Form Fields**: Client dropdown (`#strategy-client`), Assignee field (`#strategy-owner`), Status dropdown (`#strategy-status`)
4. **Session Storage**: Caching mechanism for fetched task details
5. **Event Listeners**: Input listeners on Jira Task ID field for debounce triggering

### Debounce Mechanism

- Recommended debounce delay: 500-1000ms
- Cancels pending requests when new input arrives
- Immediate fetch on dropdown selection (bypass debounce)
- Implementation: Use `setTimeout` with token-based cancellation

### Caching Strategy

- **Storage**: Session Storage (browser-based, cleared on tab close)
- **TTL**: 30 minutes per session (configurable)
- **Cache Key Format**: `jira_cache_${taskId}`
- **Cache Entry Structure**:
  ```json
  {
    "taskId": "MAY-123",
    "client": "ClientName",
    "assignee": "user@example.com",
    "status": "In Progress",
    "timestamp": 1700000000000,
    "ttl": 1800000
  }
  ```
- **Max Cache Size**: ~50 entries per session
- **Cache Bypass**: Force-refresh button clears cache entry before fetching

---

## Components and Interfaces

### Function: `fetchJiraTaskDetailsForEvent(taskId)`

**Purpose**: Fetches complete task details from Jira API for a given task ID.

**Signature**:
```javascript
async function fetchJiraTaskDetailsForEvent(taskId) {
  // Returns: { fields: { customfield_*, assignee, status, ... } } or throws error
}
```

**Behavior**:
- Validates task ID format (PROJECT-NUMBER)
- Checks cache first (if not forcing refresh)
- Makes GET request via `jiraRequest()` to `/rest/api/3/issues/${taskId}`
- Returns full Jira issue object with all fields
- Throws error on 404, network issues, or auth failures

**Error Handling**:
- 404: Throw `JiraTaskNotFoundError`
- Network timeout: Throw `JiraNetworkError`
- Auth failure: Throw `JiraAuthError`

---

### Function: `debounceJiraTaskFetch(taskId, delayMs = 750)`

**Purpose**: Debounces Jira task fetch requests while user is typing.

**Signature**:
```javascript
function debounceJiraTaskFetch(taskId, delayMs = 750) {
  // Returns: Promise that resolves with fetched data or rejects with error
}
```

**Behavior**:
- Clears previous pending request (if any)
- Validates taskId is non-empty and well-formed
- Waits `delayMs` milliseconds
- On expiry, calls `fetchJiraTaskDetailsForEvent(taskId)`
- Returns promise that resolves/rejects with fetch result

**State Management**:
- Uses module-level variable to track pending timeout ID
- Uses module-level flag to track request cancellation

---

### Function: `mapJiraClientToAppClient(jiraTask, clientMapping)`

**Purpose**: Extracts and maps Jira task client information to Strategy Calendar client options.

**Signature**:
```javascript
function mapJiraClientToAppClient(jiraTask, clientMapping) {
  // Returns: { clientValue: "string", source: "custom_field|label|project" } or null
}
```

**Mapping Priority**:
1. Check for custom field (configured key, e.g., `customfield_10001`)
2. Extract labels/tags that match known client identifiers
3. Use Jira project key/name if mapping exists

**Behavior**:
- Case-insensitive matching
- Handles punctuation/spacing variations
- Returns source of client information for debugging
- Returns `null` if no client found

**Example**:
```javascript
// Input: Jira task with custom field "Client: Acme Corp"
// Output: { clientValue: "Acme Corp", source: "custom_field" }

// Input: Jira task with label "client-acme"
// Output: { clientValue: "Acme Corp", source: "label" }

// Input: Jira task from project "ACME"
// Output: { clientValue: "Acme Corp", source: "project" } (if mapping exists)
```

---

### Function: `mapJiraStatusToAppStatus(jiraStatus, statusMapping)`

**Purpose**: Converts Jira status values to Strategy Calendar status values.

**Signature**:
```javascript
function mapJiraStatusToAppStatus(jiraStatus, statusMapping) {
  // Returns: string (mapped status) or throws JiraStatusMappingError
}
```

**Mapping Approach**:
- Uses configuration object with Jira status → App status mappings
- Example: `{ "To Do": "To Do", "In Progress": "In Progress", "Done": "To Do" }` (status→appStatus)
- Case-insensitive key lookup

**Error Handling**:
- If status not found in mapping, throws `JiraStatusMappingError`
- Error message includes unmapped Jira status for debugging

**Fallback Strategy**:
- Attempt fuzzy matching on status name (e.g., "in progress" matches "In Progress")
- If no match found, leave status field unchanged and display error

---

### Function: `displayAutoFetchFeedback(state, message = "")`

**Purpose**: Updates UI to reflect auto-fetch operation state (loading, success, error).

**Signature**:
```javascript
function displayAutoFetchFeedback(state, message = "") {
  // state: "loading" | "success" | "error" | "clear"
  // message: user-friendly message text
}
```

**Behavior by State**:

| State | UI Changes | Duration |
|-------|-----------|----------|
| `loading` | Show spinner near task ID field, disable Client/Assignee/Status fields | Until `success`, `error`, or `clear` |
| `success` | Show brief success toast/message, clear after 2 seconds | 2 seconds |
| `error` | Show error message/toast in red, keep visible until user action | Until user edits task ID or clicks dismiss |
| `clear` | Remove all loading, success, error indicators | Immediate |

**Visual Elements**:
- Loading spinner: Inline icon or small animation near task ID input
- Success message: Brief toast (e.g., "Task details fetched successfully")
- Error message: Red alert box with clear error text

---

### Function: `clearAutoFetchedFields()`

**Purpose**: Clears Client, Assignee, and Status fields when Task ID is cleared.

**Signature**:
```javascript
function clearAutoFetchedFields() {
  // No parameters, void return
}
```

**Behavior**:
- Sets `#strategy-client` to empty string
- Sets `#strategy-owner` to empty string
- Sets `#strategy-status` to "To Do" (default)
- Clears any error messages

---

### Function: `handleTaskIdChange(event)`

**Purpose**: Handles user input in the Jira Task ID field.

**Signature**:
```javascript
function handleTaskIdChange(event) {
  // Called on input/change event of Jira Task ID field
}
```

**Behavior**:
1. Get current task ID value from input
2. If empty: call `clearAutoFetchedFields()`, clear errors, exit
3. If not empty:
   - Call `displayAutoFetchFeedback("loading")`
   - Call `debounceJiraTaskFetch(taskId, 750)`
   - On success: populate fields, call `displayAutoFetchFeedback("success")`
   - On error: call `displayAutoFetchFeedback("error", errorMessage)`, preserve existing fields

---

### Cache Management Functions

**Function: `getCachedTask(taskId)`**
- Checks session storage for cached entry
- Validates TTL (returns null if expired)
- Returns cached task data or null

**Function: `setCachedTask(taskId, taskData, ttlMs = 1800000)`**
- Stores task data in session storage with timestamp
- Enforces max cache size (removes oldest if full)
- Returns true on success, false on storage error

**Function: `clearCacheEntry(taskId)`**
- Removes specific task from cache
- Used before force-refresh

**Function: `clearAllCache()`**
- Empties all Jira cache entries
- Called on session end or logout

---

## Data Models

### Jira Task Detail Structure

```javascript
{
  "key": "MAY-123",
  "fields": {
    "assignee": {
      "emailAddress": "user@example.com",
      "displayName": "User Name",
      "accountId": "jira-user-id"
    },
    "status": {
      "name": "In Progress",
      "id": "3"
    },
    "customfield_10001": "Acme Corp",  // Client custom field (example)
    "labels": ["client-acme", "urgent"],
    "project": {
      "key": "MAY",
      "name": "May Campaign"
    }
  }
}
```

### Client Mapping Configuration

```javascript
{
  "customFieldKey": "customfield_10001",  // Jira custom field for client
  "projectMappings": {
    "MAY": "Acme Corp",
    "JUN": "Beta Industries",
    "JULY": "Gamma LLC"
  },
  "labelMappings": {
    "client-acme": "Acme Corp",
    "client-beta": "Beta Industries",
    "client-gamma": "Gamma LLC"
  }
}
```

### Status Mapping Configuration

```javascript
{
  "jiraToApp": {
    "To Do": "To Do",
    "In Progress": "In Progress",
    "In Review": "In Progress",
    "Done": "Done",
    "Closed": "Done"
  }
}
```

### Cached Task Entry

```javascript
{
  "taskId": "MAY-123",
  "jiraData": { /* full Jira issue object */ },
  "mappedClient": "Acme Corp",
  "mappedAssignee": "user@example.com",
  "mappedStatus": "In Progress",
  "timestamp": 1700000000000,
  "ttl": 1800000
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Valid Task ID Format Acceptance

*For any* string in the format "PROJECT-NUMBER" (alphabetic project key followed by dash and digits), the Jira Task ID input field SHALL accept and retain the value without modification.

**Validates: Requirements 1.2, 1.3**

### Property 2: Task ID Validation Trigger

*For any* non-empty, valid Jira Task ID entered into the field, the system SHALL initiate a fetch request (either immediately via dropdown selection or after debounce delay via typing).

**Validates: Requirements 1.5, 2.3**

### Property 3: Debounce Cancellation on Continued Input

*For any* sequence of typing events within the debounce window (< 750ms apart), only the final event SHALL trigger a fetch request; all preceding pending requests SHALL be cancelled.

**Validates: Requirements 2.1, 2.2**

### Property 4: Immediate Fetch on Dropdown Selection

*For any* dropdown selection action (as opposed to typing), the system SHALL initiate a fetch request immediately without waiting for debounce delay.

**Validates: Requirements 2.4**

### Property 5: Empty Task ID Clears Fields

*For any* state where Client, Assignee, or Status fields contain auto-fetched values, clearing the Task ID field SHALL result in those fields being reset to their default/empty values.

**Validates: Requirements 1.5, 10.3**

### Property 6: Client Mapping Priority Adherence

*For any* Jira task containing client information from multiple sources (custom field, labels, project), the system SHALL extract and use the highest-priority source available (custom field > labels > project).

**Validates: Requirements 11.1, 11.2**

### Property 7: Case-Insensitive Client Mapping

*For any* Jira task with client information (e.g., "acme corp", "ACME CORP", "Acme Corp", "acme-corp"), the system SHALL successfully map to the corresponding client option regardless of case or spacing variations.

**Validates: Requirements 11.3**

### Property 8: Status Mapping Consistency

*For any* valid Jira status value with a configured mapping, the system SHALL consistently map it to the same application status value across all fetch operations.

**Validates: Requirements 5.1, 5.2**

### Property 9: New Fetch Overrides Manual Changes

*For any* fields (Client, Assignee, Status) that have been manually edited, fetching a new Jira Task ID SHALL replace those fields with newly fetched values, overriding manual edits.

**Validates: Requirements 3.4, 4.4, 5.4, 8.3**

### Property 10: Manual Edits Persist on Same Task ID

*For any* auto-populated field that is manually edited, if the Task ID remains unchanged (no new fetch), the manual edit SHALL persist and not revert to the fetched value.

**Validates: Requirements 8.2**

### Property 11: Error State Preserves Existing Fields

*For any* fetch operation that ends in error (404, network error, auth error), all previously populated fields (Client, Assignee, Status) SHALL remain unchanged; no fields SHALL be cleared or modified.

**Validates: Requirements 7.4, 10.5**

### Property 12: Cache Hit Bypasses API Call

*For any* task ID that was successfully fetched within the current session and within the cache TTL (30 minutes), requesting the same task ID again SHALL return cached data without making a new API call to Jira.

**Validates: Requirements 9.2**

### Property 13: Cache Invalidation on Session Change

*For any* cache entries created in one browser session, opening a new browser session or tab SHALL not retrieve those cached entries; the system SHALL fetch fresh data from Jira API.

**Validates: Requirements 9.5**

### Property 14: Disabled Fields During Loading

*For any* auto-fetch operation in progress (loading state), the Client, Assignee, and Status fields SHALL be disabled (read-only) to prevent user interaction until the operation completes.

**Validates: Requirements 6.2**

### Property 15: Field Editability After Fetch

*For any* field that has been auto-populated by fetch, the user SHALL be able to manually edit, clear, or modify that field without restriction.

**Validates: Requirements 8.1**

### Property 16: Empty Task ID Prevents API Calls

*For any* user action or state where the Task ID field is empty or contains only whitespace, no auto-fetch request SHALL be made to the Jira API.

**Validates: Requirements 10.3**

### Property 17: Unmapped Client Leaves Field Empty

*For any* Jira task where no client information is found or mappable, the Client field SHALL remain empty (no text, no placeholder).

**Validates: Requirements 3.5, 11.4**

### Property 18: Unassigned Task Handling

*For any* Jira task where the assignee field is null or empty, the Assignee field in the form SHALL remain empty without error.

**Validates: Requirements 4.3**

### Property 19: Backward Compatibility - Manual Entry

*For any* scenario where the user does not use the Jira Task ID field, the event creation flow SHALL proceed normally with manual entry of all fields, and the feature SHALL not interfere with standard operations.

**Validates: Requirements 10.1, 10.2**

### Property 20: Error Message Clearing on New Input

*For any* error message displayed from a previous fetch attempt, entering a new Task ID OR clicking a new input action SHALL clear the error message immediately.

**Validates: Requirements 7.5**

---

## Error Handling

### Error Scenarios and Recovery

| Error Type | HTTP Status | User Message | Recovery |
|-----------|------------|--------------|----------|
| Task Not Found | 404 | "Jira task 'MAY-999' not found. Please check the task ID." | Preserve existing fields; allow retry with corrected ID |
| Network Timeout | (timeout) | "Unable to fetch Jira task details. Check your connection and try again." | Preserve existing fields; allow retry |
| Authentication Failed | 401/403 | "Unable to authenticate with Jira. Please check your credentials." | Preserve existing fields; suggest re-login |
| Server Error | 500+ | "Jira server error. Please try again later." | Preserve existing fields; allow retry |
| Invalid Task ID Format | (client-side) | "Please enter a valid Jira task ID (e.g., MAY-123)." | No API call; field remains editable |
| Unmapped Status | (logic error) | "Jira status 'Custom Status' is not recognized. Please select a status manually." | Display error; leave Status field unchanged |
| Unmapped Client | (logic warning) | (Optional: no error shown) | Leave Client field empty; continue silently |

### Timeout Configuration

- **Request Timeout**: 5 seconds per API call
- **Debounce Delay**: 750ms (configurable 500-1000ms)
- **Cache TTL**: 1800 seconds (30 minutes per session)
- **Display Timeout Message**: After 5 seconds of no response

### Error Recovery Actions

1. **User can retry**: "Refresh" button or clear & re-enter Task ID
2. **Graceful degradation**: System falls back to manual entry
3. **State preservation**: No fields cleared on error
4. **Error clearing**: New input clears old error messages

---

## Testing Strategy

### Dual Testing Approach

Property-based testing is appropriate for this feature because:
- The fetch logic is a pure function with clear input/output behavior
- There are universal properties that should hold for all valid task IDs
- Input variations (different task formats, client types, statuses) reveal edge cases
- The cost of 100+ iterations is low (in-memory operations, mocked API)

**Unit Tests** (example-based):
- Test specific scenarios like 404 errors, timeout handling, UI transitions
- Test edge cases: unassigned tasks, unmapped statuses, empty responses
- Test integration points: field population, cache storage

**Property-Based Tests** (universal properties):
- Test mappings with randomized client/status values
- Test debounce behavior with random typing sequences
- Test cache behavior with random task ID patterns
- Test field override behavior with random input orders

### Testing Coverage Matrix

| Component | Test Type | Coverage |
|-----------|-----------|----------|
| Task ID input validation | Property | All valid format variations |
| Debounce mechanism | Property | All typing sequences |
| Client mapping logic | Property | All client source combinations |
| Status mapping logic | Property | All Jira status values |
| Cache hit/miss | Property | All task ID patterns within/outside TTL |
| Error handling | Example | Each error type (404, timeout, auth) |
| UI state transitions | Example | Loading → success, loading → error, error → clear |
| Field override behavior | Property | All field change patterns |
| Backward compatibility | Example | Manual-only workflows |

### Configuration for Property Tests

- **Min Iterations**: 100 per property
- **Seed**: Use deterministic seeds for reproducibility
- **Timeout Per Iteration**: 1 second (with mocked API)
- **Shrinking**: Enable to find minimal counterexamples

### Mock Strategy

- **Jira API**: Mock with fast in-memory responses
- **Session Storage**: Mock with simple Map object
- **setTimeout (debounce)**: Advance time with fake timers
- **UI Elements**: Mock DOM elements with Jest DOM

---

## Performance Considerations

### Optimization Strategies

1. **Debouncing**: Prevent excessive API calls during rapid typing
   - Recommended delay: 750ms
   - Immediate fetch on dropdown selection

2. **Caching**: Store recently fetched tasks in session storage
   - TTL: 30 minutes per session
   - Max size: ~50 entries (~50-100KB per session)

3. **API Efficiency**:
   - Request only essential fields (using `fields` parameter if supported)
   - Minimize payload size
   - Consider batch fetching if multiple tasks needed

4. **UI Responsiveness**:
   - Loading indicator appears immediately
   - Fields disabled during load to prevent double-submission
   - Toast messages auto-clear after 2-3 seconds

### Performance Metrics

- **Average fetch time**: < 2 seconds (network dependent)
- **Debounce overhead**: < 50ms
- **Cache lookup**: < 1ms
- **UI update**: < 50ms
- **Memory footprint**: < 500KB per session

---

## UI/UX Patterns

### Input Field States

```
[Default] Jira Task ID input (placeholder: "e.g., MAY-123")
              ↓
[Typing] → Debounce in progress
              ↓
[Loading] [spinner] Fetching task details... | Client: [DISABLED] | Assignee: [DISABLED] | Status: [DISABLED]
              ↓
[Success] "Task details fetched successfully" (toast, auto-clears)
         Client: [Acme Corp] | Assignee: [user@example.com] | Status: [In Progress]
              ↓
[Error] ⚠️ "Jira task 'MAY-999' not found." | Client: [previous value] | Assignee: [previous value] | Status: [previous value]
```

### Visual Indicators

| State | Indicator | Color | Position |
|-------|-----------|-------|----------|
| Loading | Spinner/dots animation | Blue (indigo-500) | Right of input field |
| Success | Checkmark icon | Green (emerald-500) | Optional toast notification |
| Error | Alert icon | Red (rose-500) | Error message box below input |
| Disabled | Muted text, gray background | Gray | Affected fields (Client, Assignee, Status) |

### User Interactions

1. **Typing in Task ID**:
   - No immediate feedback
   - After 750ms of no typing: loading indicator appears
   - Fields become disabled

2. **Dropdown Selection**:
   - Loading indicator appears immediately (no debounce)
   - Fields disabled during fetch
   - ~1-2 seconds typical delay

3. **Error State**:
   - Error message appears below input
   - User can edit input to retry or dismiss error
   - Previous field values remain

4. **Refresh Action** (optional):
   - "Refresh" button next to Task ID field
   - Clears cache, fetches fresh data
   - Same loading/success/error flow

---

## Integration Checklist

- [ ] Add Jira Task ID input field to "Add Strategy Event" modal HTML
- [ ] Implement `fetchJiraTaskDetailsForEvent(taskId)` function
- [ ] Implement `debounceJiraTaskFetch(taskId, delayMs)` function
- [ ] Implement `mapJiraClientToAppClient(jiraTask, config)` function
- [ ] Implement `mapJiraStatusToAppStatus(jiraStatus, config)` function
- [ ] Implement `displayAutoFetchFeedback(state, message)` function
- [ ] Implement `handleTaskIdChange(event)` input listener
- [ ] Implement cache functions (get/set/clear)
- [ ] Add event listener to Task ID input field
- [ ] Add loading/error state UI elements
- [ ] Test with existing Jira projects (MAY, JUN, JULY, etc.)
- [ ] Verify backward compatibility (manual-only workflows still work)
- [ ] Test error scenarios (404, timeout, auth failures)
- [ ] Validate performance (debounce, cache, UI responsiveness)

