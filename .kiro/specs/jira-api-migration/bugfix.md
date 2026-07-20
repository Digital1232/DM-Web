# Jira API Migration - Deprecated Endpoint Bugfix

## Introduction

The application is using Atlassian's deprecated Jira API endpoint `/rest/api/3/search` which has been removed from the Jira platform. This causes the "Add Strategy Event" dialog to fail when attempting to auto-fetch Jira tasks. The error message "The requested API has been removed. Please migrate to the /rest/api/3/search/jql API" prevents managers from linking strategy events to Jira tasks. This is a critical blocker for the strategy event management feature.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user opens the "Add Strategy Event" modal dialog and searches for Jira tasks using the auto-fetch feature THEN the system sends a request to the deprecated `/rest/api/3/search?jql=...` endpoint and receives an error response "The requested API has been removed"

1.2 WHEN the error response is received from the deprecated endpoint THEN the dropdown displays a red error message "The requested API has been removed" preventing any task selection

### Expected Behavior (Correct)

2.1 WHEN a user opens the "Add Strategy Event" modal dialog and searches for Jira tasks using the auto-fetch feature THEN the system SHALL send a request to the correct `/rest/api/3/search/jql?jql=...` endpoint and receive a successful response with matching tasks

2.2 WHEN the search completes successfully THEN the system SHALL display matching Jira tasks in a dropdown list with key, summary, status, and assignee information

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user manually enters a Jira task ID in the strategy event form THEN the system SHALL CONTINUE TO accept and validate the task ID without requiring the auto-fetch feature

3.2 WHEN the system syncs strategy events with Jira (background task synchronization) THEN the system SHALL CONTINUE TO work correctly if it uses the new endpoint format (no regression for other task syncing logic)

3.3 WHEN a user performs other application functions unrelated to Jira task auto-fetch (e.g., viewing tasks, updating status, navigating views) THEN the system SHALL CONTINUE TO function normally without any changes to behavior
