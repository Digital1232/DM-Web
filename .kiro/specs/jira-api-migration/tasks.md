# Jira API Migration Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Deprecated Endpoint Error Detection
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface the API error that demonstrates the deprecated endpoint is being used
  - **Scoped PBT Approach**: For this bug, scope the property to concrete failing cases: search queries that trigger the API call (e.g., "PROJ-123", "Deploy website")
  - Test that `fetchJiraTasksForStrategy()` with sample search term successfully connects to Jira and receives a response (not an "API removed" error)
  - Test that the dropdown shows task results instead of an error message
  - Details from Bug Condition specification: the function constructs endpoint as `/rest/api/3/search?jql=...` (deprecated) instead of `/rest/api/3/search/jql?jql=...` (correct)
  - Expected behavior from design: successful Jira response with matching tasks displayed
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS with "API has been removed" error or HTTP 404/410 (this proves the bug exists)
  - Document counterexamples found (e.g., "API error: The requested API has been removed") to understand root cause
  - Mark task complete when test is written, run on unfixed code, and failure is documented
  - _Requirements: 1.1, 1.2_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Auto-Fetch Operations
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: Manual Jira task ID entry field accepts IDs without auto-fetch feature
  - Observe: Background task sync operations (that already use correct endpoint) continue to work
  - Observe: Other application features function normally
  - Write property-based test: for all operations that are NOT the `fetchJiraTasksForStrategy()` auto-fetch call, behavior remains unchanged
  - Specifically test: manual task ID entry, background sync, and non-Jira features
  - Details from Preservation Requirements: all existing behavior must be preserved for manual entry and background sync
  - Verify tests PASS on UNFIXED code (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run on unfixed code, and passing
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 3. Fix deprecated Jira API endpoint in fetchJiraTasksForStrategy()

  - [x] 3.1 Update endpoint URL to use correct API path
    - Open `script.js` and locate `fetchJiraTasksForStrategy()` function (line ~2815-2893)
    - Find the line: `const url = \`https://${JIRA.domain}/rest/api/3/search?jql=...\`;`
    - Change `/rest/api/3/search` to `/rest/api/3/search/jql` (add `/jql` to the path)
    - Final URL should be: `const url = \`https://${JIRA.domain}/rest/api/3/search/jql?jql=...\`;`
    - This matches the correct endpoint format already used in `fetchAllJiraIssues()` function
    - _Bug_Condition: isBugCondition(input) where endpoint_used contains deprecated path_
    - _Expected_Behavior: Request should use new endpoint format: /rest/api/3/search/jql?jql=..._
    - _Preservation: All other code paths and functions remain unchanged_
    - _Requirements: 2.1, 2.2_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Deprecated Endpoint Fixed
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior (correct API response with tasks)
    - When this test passes, it confirms the fix is working correctly
    - Run the bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms the endpoint is now correct and Jira responds successfully)
    - Verify that dropdown displays matching tasks instead of error message
    - Verify API response includes task keys, summaries, status, and assignee information
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Auto-Fetch Operations Still Work
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run the preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions introduced)
    - Verify manual task ID entry still works
    - Verify background task sync continues to function
    - Verify other application features remain unaffected
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 4. Checkpoint - Ensure all tests pass
  - Confirm all exploration tests pass (bug is fixed)
  - Confirm all preservation tests pass (no regressions)
  - Test with real Jira projects mentioned in scope (MAY, JUN, JULY) if available
  - Document any findings or issues; ask user if questions arise
