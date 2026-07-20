# Implementation Plan: AI Awards for Creativity Recognition

## Overview

This implementation plan breaks down the AI Awards for Creativity Recognition system into discrete, sequential tasks. The system integrates with Jira to automatically detect media submissions, uses AI vision models to evaluate visual design quality, calculates weekly and monthly awards with fair tiebreaker rules, and provides leaderboard and dashboard displays. Implementation follows a layered approach: data models, core services, integrations, APIs, and UI components.

## Implementation Approach

The implementation will proceed in waves following this sequence:

1. **Project Setup & Data Layer**: Configure project structure, database schemas, and core type definitions
2. **Core Services - Submission Detection**: Implement Jira polling and submission record management
3. **Core Services - AI Evaluation**: Implement media evaluation pipeline with AI vision model integration
4. **Core Services - Award Calculation**: Implement award calculation logic with deterministic tiebreaker rules
5. **Core Services - Notifications**: Implement notification system for award winners
6. **Data Access & Persistence**: Implement repository layer and audit trail logging
7. **Leaderboard & Dashboard APIs**: Implement data aggregation and ranking services
8. **UI Components**: Implement leaderboard, dashboard, and Jira integration components
9. **Testing & Validation**: Comprehensive testing, performance validation, and integration testing

---

## Tasks

- [x] 1. Project Setup and Core Infrastructure
  - [x] 1.1 Initialize Node.js project structure and dependencies
    - Set up package.json with required dependencies: Express, PostgreSQL driver, Redis client, AI vision APIs
    - Configure environment variables (.env template) for API keys, database URLs, and service settings
    - Set up ESLint and Prettier for code quality
    - _Requirements: 1, 10, 12_

  - [x] 1.2 Create database schemas for submissions, awards, and audit logs
    - Define PostgreSQL tables: submissions, awards, audit_logs, team_members, award_categories
    - Create all required indexes for query performance (timestamp, status, team member, task ID)
    - Set up audit table with immutable constraints (append-only)
    - _Requirements: 11, 12_

  - [x] 1.3 Define TypeScript type definitions and interfaces
    - Create interfaces: Submission, Award, AuditLog, TeamMemberStats, EvaluationResult
    - Define enums: MediaType, AwardType, EvaluationStatus, AwardCategory
    - Create DTOs for API request/response contracts
    - _Requirements: 1, 2, 3, 4_

  - [ ]* 1.4 Write integration tests for database connection and schema validation
    - Test database connectivity and schema initialization
    - Validate all required tables and indexes are created
    - _Requirements: 12_

- [ ] 2. Submission Detection Service (Jira Integration)
  - [x] 2.1 Implement Jira API client for task querying
    - Create JiraClient class to authenticate and query Jira API
    - Implement method to fetch completed/posted tasks from last 90 minutes
    - Handle pagination for large task lists
    - Implement exponential backoff retry logic (1m, 5m, 15m, max 3 retries)
    - _Requirements: 1, 6_

  - [x] 2.2 Implement media attachment extraction and validation
    - Parse Jira attachment metadata (filename, format, upload timestamp)
    - Validate media format (MP4, MOV, WebM for video; PNG, JPG, SVG for poster)
    - Calculate file hash for duplicate detection
    - Log validation failures with descriptive error messages
    - _Requirements: 1_

  - [ ]* 2.3 Write unit tests for Jira API client
    - Test successful task queries with mock Jira responses
    - Test retry logic on API failures
    - Test pagination handling
    - _Requirements: 1, 6_

  - [ ] 2.3 Implement submission record creation from detected media
    - Create SubmissionRepository class with methods to create and query submission records
    - Implement duplicate detection by task ID + attachment hash
    - Store complete submission metadata: team member ID, media type, timestamps, file references
    - _Requirements: 1, 11_

  - [ ]* 2.4 Write unit tests for submission record creation
    - Test successful record creation with valid media
    - Test duplicate submission detection
    - Test error handling for invalid metadata
    - _Requirements: 1_

  - [ ] 2.4 Implement SubmissionDetector scheduler service
    - Create SubmissionDetector class that runs on 1-hour fixed schedule
    - Implement main detection loop: query Jira → extract media → validate → create records
    - Log all processed tasks to audit trail
    - Handle and log detection errors without blocking subsequent detections
    - _Requirements: 1, 6, 11_

  - [ ]* 2.5 Write integration tests for full submission detection flow
    - Test end-to-end detection: Jira query → media extraction → record creation
    - Test handling of missing or invalid attachments
    - Test audit trail logging
    - _Requirements: 1, 11_

- [ ] 3. AI Evaluation Pipeline
  - [x] 3.1 Implement AI vision model client (Google Cloud Vision or equivalent)
    - Create AIVisionClient class to authenticate and call AI vision API
    - Implement method to analyze media for composition, color theory, and balance scores
    - Handle API errors and rate limiting with exponential backoff
    - _Requirements: 2, 10_

  - [ ] 3.2 Implement media file download and caching
    - Create MediaCache class to download and temporarily cache media files
    - Implement secure file handling: scan for malware indicators, validate file integrity
    - Cleanup expired cache files
    - _Requirements: 2_

  - [ ]* 3.3 Write unit tests for AI vision client
    - Test successful API calls and score parsing
    - Test rate limiting handling
    - Mock API responses for various score combinations
    - _Requirements: 2_

  - [x] 3.3 Implement creativity score calculation logic
    - Create ScoreCalculator class with weighted average formula
    - Formula: Creativity Score = (Composition × 0.35) + (Color Theory × 0.35) + (Balance × 0.30)
    - Validate all subscores are in range [0, 100]
    - Validate final score is in range [0, 100] with rounding tolerance
    - _Requirements: 2, 13_

  - [ ]* 3.4 Write property tests for creativity score calculation
    - **Property A: Score Bounds** - For all valid subscores in [0, 100], final score must be in [0, 100]
    - **Property B: Weighted Average** - Score = (C×0.35) + (T×0.35) + (B×0.30) ± 1 point rounding tolerance
    - **Validates: Requirements 2.1, 2.4_

  - [ ] 3.4 Implement AIEvaluationPipeline async queue processor
    - Create evaluation queue for pending submissions
    - Implement concurrent processing (5 concurrent evaluations max)
    - Call primary AI provider, fallback to secondary on failure
    - Implement 6-hour retry schedule with exponential backoff (max 3 retries)
    - Update submission records with scores on completion
    - Log all evaluation events to audit trail
    - _Requirements: 2, 10, 11_

  - [ ]* 3.5 Write integration tests for full evaluation pipeline
    - Test end-to-end evaluation: queue submission → download media → call AI → calculate scores → update record
    - Test fallback to secondary AI provider
    - Test retry logic after evaluation failure
    - Test audit trail logging
    - _Requirements: 2, 10, 11_

- [ ] 4. Award Calculation and Recognition
  - [x] 4.1 Implement deterministic ranking and selection logic
    - Create RankerService to rank submissions by creativity score
    - Implement tiebreaker rule: earlier submission timestamp wins
    - Ensure deterministic consistent ordering for reproducibility
    - _Requirements: 3, 4, 11_

  - [ ]* 4.2 Write property tests for ranking determinism
    - **Property C: Deterministic Ordering** - Ranking same submission set multiple times produces identical order
    - **Property D: Tiebreaker Consistency** - When scores equal, earlier timestamp always selected
    - **Validates: Requirements 3.3, 4.3_

  - [ ] 4.2 Implement WeeklyAwardCalculator service
    - Create scheduled task running Sunday 23:59:59 UTC
    - Query submissions from last 7 days
    - Rank submissions by category (Best_Video, Best_Poster, Best_Video_Poster_Content)
    - Select one winner per category using tiebreaker logic
    - Create Award records with full metadata
    - Log calculation details to audit trail
    - Handle and retry on errors
    - _Requirements: 3, 11_

  - [ ]* 4.3 Write unit tests for weekly award calculation
    - Test selection of single winner per category
    - Test tiebreaker rule with equal scores
    - Test correct period date range calculation
    - Test handling of no-eligible-submissions scenario
    - _Requirements: 3_

  - [ ] 4.3 Implement MonthlyAwardCalculator service
    - Create scheduled task running on last day of month 23:59:59 UTC
    - Query submissions from last 30 days
    - Rank submissions by category
    - Select one winner per category using same tiebreaker logic
    - Create Award records with monthly period metadata
    - Log calculation details to audit trail
    - _Requirements: 4, 11_

  - [ ]* 4.4 Write unit tests for monthly award calculation
    - Test selection of single winner per category
    - Test correct period date range (full calendar month)
    - Test tiebreaker application
    - Test handling of submissions from previous month (excluded)
    - _Requirements: 4_

  - [ ] 4.4 Create and populate AwardRecord with complete metadata
    - Store award ID, type (weekly/monthly), category, winner details
    - Store submission reference and creativity scores
    - Store ranking information (rank, total contestants)
    - Store calculation metadata and timestamps
    - _Requirements: 3, 4, 11_

  - [ ]* 4.5 Write integration tests for complete award calculation flow
    - Test weekly calculation: submissions query → ranking → winner selection → record creation
    - Test monthly calculation with full 30-day window
    - Test multiple categories calculated together
    - Test award records properly reference submissions
    - _Requirements: 3, 4, 11_

- [ ] 5. Notification System
  - [ ] 5.1 Implement notification message builder
    - Create NotificationBuilder class to compose award notifications
    - Include: award type, category, creativity score, subscores, submission details, leaderboard link
    - Support HTML and plain text formats
    - _Requirements: 9_

  - [ ] 5.2 Implement email notification service
    - Create EmailNotificationService to send via configured email provider
    - Template HTML emails with award details and styling
    - Support batching multiple award notifications per recipient
    - _Requirements: 9_

  - [ ] 5.3 Implement in-app notification service
    - Create InAppNotificationService to store notifications in database
    - Create notification records with read/unread status
    - Support notification dismissal
    - _Requirements: 9_

  - [ ] 5.4 Implement NotificationManager with deduplication
    - Create NotificationManager to orchestrate email and in-app notifications
    - Implement 1-minute deduplication window for duplicate detection
    - Send notifications within 5 minutes of award creation
    - Respect user notification preferences
    - _Requirements: 9_

  - [ ]* 5.5 Write unit tests for notification services
    - Test message composition with various score combinations
    - Test email template rendering
    - Test in-app notification creation
    - Test deduplication logic
    - _Requirements: 9_

  - [ ]* 5.6 Write integration tests for complete notification flow
    - Test end-to-end: award created → notification built → sent via email and in-app
    - Test notification delivery within 5-minute window
    - Test deduplication prevents duplicate messages
    - Test user preference handling
    - _Requirements: 9_

- [ ] 6. Checkpoint - Core Services Complete
  - Ensure all unit and integration tests pass for submission detection, AI evaluation, award calculation, and notifications
  - Verify audit trail logs all events
  - Ask the user if questions arise

- [ ] 7. Data Access Layer and Persistence
  - [ ] 7.1 Implement SubmissionRepository with full CRUD operations
    - Create methods: create, read, update, findByTeamMember, findByJiraTask, findByStatus
    - Implement efficient queries using indexes
    - Implement version tracking for re-evaluated submissions
    - _Requirements: 1, 11, 12_

  - [ ] 7.2 Implement AwardRepository with historical queries
    - Create methods: create, read, findByWinner, findByPeriod, findByCategory
    - Support querying historical awards
    - Implement efficient period-based queries
    - _Requirements: 3, 4, 11_

  - [ ] 7.3 Implement AuditLogger for immutable event recording
    - Create AuditLogger class to append event records (no updates/deletes)
    - Log submission creation, evaluation, award calculation, notification sending
    - Record before/after state for all changes
    - Include actor (system or user), correlation IDs, timestamps
    - _Requirements: 11_

  - [ ]* 7.4 Write unit tests for all repository methods
    - Test CRUD operations return correct records
    - Test query filtering and ordering
    - Test data validation and constraints
    - _Requirements: 11, 12_

  - [ ] 7.4 Implement Redis cache layer for leaderboard data
    - Create CacheManager class with methods: set, get, delete, invalidate
    - Implement TTL for different cache types (leaderboard: 1h, stats: 24h, dashboard: 2h)
    - Support cache invalidation on award creation
    - _Requirements: 12_

  - [ ]* 7.5 Write integration tests for repository and cache layer
    - Test data persists correctly to database
    - Test cache invalidation triggers properly
    - Test fallback to database when cache misses
    - _Requirements: 11, 12_

- [ ] 8. API Endpoints - Data Aggregation and Retrieval

  - [ ] 8.1 Implement Leaderboard API service
    - Create LeaderboardService class with getLeaderboard(options) method
    - Support sorting by: awards (default), highest-score, submission-count
    - Support filtering by: period (week, month, all-time), category
    - Support pagination with limit/offset
    - _Requirements: 6, 12, 13_

  - [ ]* 8.2 Write property tests for leaderboard ranking
    - **Property E: Ranking Transitivity** - If A > B and B > C, then A > C
    - **Property F: Sum Preservation** - Sum of displayed awards = total awards for period
    - **Validates: Requirements 6.1, 6.2_

  - [ ] 8.2 Implement Leaderboard GET endpoint
    - Create Express route: GET /api/leaderboard?period=week&sortBy=awards&category=Best_Video
    - Return ranked team members with stats
    - Serve from cache when available
    - _Requirements: 6, 12_

  - [ ] 8.3 Implement detailed team member stats endpoint
    - Create GET /api/leaderboard/stats/:userId endpoint
    - Return: rank, total awards, weekly/monthly breakdown, average score, top submissions, category breakdown
    - _Requirements: 6_

  - [ ]* 8.4 Write unit tests for leaderboard API
    - Test ranking correctness with various score combinations
    - Test tiebreaker application
    - Test filtering and sorting options
    - _Requirements: 6_

  - [ ] 8.4 Implement Dashboard Service for metrics aggregation
    - Create DashboardService with getDashboardData(filters) method
    - Calculate: total submissions, average score, top creators, score distribution, trends
    - Support filters: period, category, team member, department, media type
    - _Requirements: 7, 12_

  - [ ] 8.5 Implement Dashboard GET endpoint
    - Create GET /api/dashboard endpoint with query parameters for filters
    - Return summary statistics, top creators, score distribution, trends, category breakdown
    - Serve from cache when available
    - _Requirements: 7, 12_

  - [ ]* 8.6 Write unit tests for dashboard service
    - Test metric calculation (total submissions, average, max, min)
    - Test filter application preserves mathematical consistency
    - Test trend calculation with time-series data
    - _Requirements: 7_

  - [ ] 8.6 Implement Report Generation Service
    - Create ReportGenerator class with methods: generatePDF, generateCSV, generateJSON
    - Include: summary stats, leaderboard, category breakdown, trends, methodology
    - Add footer with export timestamp and data completeness confirmation
    - _Requirements: 7, 13_

  - [ ] 8.7 Implement Report Export API endpoints
    - Create GET /api/reports/export?format=pdf|csv|json
    - Return generated report file
    - _Requirements: 7, 13_

  - [ ]* 8.8 Write integration tests for dashboard and reports
    - Test dashboard data refresh within 2-second SLA
    - Test report generation for various data volumes
    - Test export format correctness
    - _Requirements: 7, 12_

- [ ] 9. Jira Integration and Award Display
  - [ ] 9.1 Create Jira webhook endpoint for task status changes
    - Create POST /api/webhooks/jira endpoint to receive task update events
    - Filter for "Completed" and "Posted" status transitions
    - Trigger submission detection asynchronously
    - _Requirements: 1, 8_

  - [ ] 9.2 Implement award badge generation for Jira tasks
    - Create method to query awards by jiraTaskId
    - Generate badge data: award type, category, score, period
    - _Requirements: 8_

  - [ ] 9.3 Implement Jira task detail panel for award information
    - Create GET /api/jira/task/:jiraTaskId/award endpoint
    - Return award details if task has award
    - Include subscores and ranking information
    - _Requirements: 8_

  - [ ]* 9.4 Write unit tests for Jira integration
    - Test webhook endpoint receives and processes task events
    - Test award badge data correctly matches Award records
    - _Requirements: 8_

  - [ ] 9.4 Implement task archival when Jira task is deleted
    - Create webhook handler for task deletion events
    - Mark associated submissions and awards as "archived" (not deleted)
    - Log archival event to audit trail
    - _Requirements: 8, 11_

  - [ ]* 9.5 Write integration tests for Jira award display
    - Test end-to-end: award created → badge generated → displayed in Jira
    - Test badge updates when new award calculated
    - Test archival on task deletion
    - _Requirements: 8, 11_

- [ ] 10. Data Export and Parsing
  - [ ] 10.1 Implement DataExporter for JSON and CSV formats
    - Create DataExporter class with methods: exportJSON, exportCSV
    - Export submission records with all fields and timestamps
    - Export award records with full metadata
    - Include export metadata: timestamp, version, record count, completeness flag
    - _Requirements: 13, 14_

  - [ ] 10.2 Implement DataParser for JSON format
    - Create DataParser class to parse JSON award data
    - Validate parsed records: unique IDs, scores in [0, 100], valid timestamps
    - Return descriptive error messages with line numbers for parse failures
    - _Requirements: 13, 14_

  - [ ] 10.3 Implement DataParser for CSV format
    - Implement CSV parsing with proper handling of quotes and escapes
    - Validate parsed records match schema
    - Support round-trip parsing: CSV → objects → CSV
    - _Requirements: 13, 14_

  - [ ]* 10.4 Write property tests for export/parse round-trip
    - **Property G: JSON Round-Trip** - parse(JSON) → object → stringify() produces equivalent JSON
    - **Property H: CSV Round-Trip** - parse(CSV) → objects → toCSV() has same row count, scores ±0.01 tolerance
    - **Validates: Requirements 13.3, 13.4, 14.6_

  - [ ] 10.4 Implement Pretty Printer for human-readable output
    - Create PrettyPrinter class to format records into readable text
    - Group by award category and period
    - Include summary statistics: total awards, average score, count breakdown
    - Format as aligned table with proper spacing
    - _Requirements: 13, 14_

  - [ ]* 10.5 Write unit tests for exporters and parsers
    - Test JSON export/import with various record types
    - Test CSV export/import with proper escaping
    - Test pretty printer output formatting
    - Test error messages for malformed input
    - _Requirements: 13, 14_

  - [ ] 10.5 Implement data import validation report
    - Create ImportValidator class to validate imported data
    - Generate report with: record counts, consistency checks, discrepancies
    - Validate referential integrity (award → submission, submission → team member)
    - _Requirements: 13_

  - [ ]* 10.6 Write integration tests for complete export/import cycle
    - Test end-to-end: export → parse → validate → import
    - Test round-trip preserves all data within tolerance
    - Test validation report identifies any discrepancies
    - _Requirements: 13, 14_

- [ ] 11. Checkpoint - APIs and Data Layer Complete
  - Ensure all API endpoints return correct data
  - Verify leaderboard and dashboard calculations are accurate
  - Verify export/import cycle preserves data integrity
  - Ask the user if questions arise

- [ ] 12. UI Components - Leaderboard Display
  - [ ] 12.1 Create Leaderboard component with ranked table
    - Render ranked list of team members with: position, name, award count, highest score, submission count
    - Implement sorting by awards (default), highest-score, submission-count
    - Implement period filter (week, month, all-time)
    - _Requirements: 6, 12_

  - [ ] 12.2 Create Leaderboard detail expansion component
    - Render expanded stats on row click: rank, weekly/monthly awards, average score, top submissions, categories
    - Display submission details with media thumbnails
    - _Requirements: 6_

  - [ ] 12.3 Implement Leaderboard pagination/virtual scrolling
    - Add pagination for >50 team members (10 per page)
    - Or implement virtual scrolling for performance
    - _Requirements: 6, 12_

  - [ ]* 12.4 Write component tests for leaderboard UI
    - Test table renders with correct data
    - Test sorting and filtering functionality
    - Test expansion and detail display
    - _Requirements: 6_

- [ ] 13. UI Components - Dashboard Display
  - [ ] 13.1 Create Dashboard header with summary metrics
    - Display: total submissions, average score, top 5 creators
    - Implement metric cards with visual formatting
    - _Requirements: 7, 12_

  - [ ] 13.2 Create Dashboard charts
    - Implement score distribution histogram
    - Implement trend line chart (submissions and avg score over time)
    - _Requirements: 7_

  - [ ] 13.3 Create Dashboard filter panel
    - Filter controls: period, category, team member/department, media type
    - Implement filter state management
    - _Requirements: 7_

  - [ ] 13.4 Create Report Export button and flow
    - Add export button with format selection (PDF, CSV, JSON)
    - Trigger report generation and download
    - _Requirements: 7, 13_

  - [ ]* 13.5 Write component tests for dashboard UI
    - Test metrics display and accuracy
    - Test chart rendering with mock data
    - Test filter application
    - Test export trigger
    - _Requirements: 7_

- [ ] 14. UI Components - Jira Integration Display
  - [ ] 14.1 Create Award badge component for Jira task view
    - Display badge when task has award: "🏆 [Category] Award"
    - Show subtle styling to indicate award status
    - _Requirements: 8_

  - [ ] 14.2 Create Award detail modal component
    - Modal opens on badge click
    - Shows: award period, all scores, ranking, leaderboard link
    - _Requirements: 8_

  - [ ]* 14.3 Write component tests for Jira integration UI
    - Test badge renders when award exists
    - Test modal displays correct award information
    - _Requirements: 8_

- [ ] 15. Performance and Load Testing
  - [ ] 15.1 Verify Submission Detection performance (1000 tasks < 5 minutes)
    - Load test with 1000 Jira tasks
    - Measure query and processing time
    - _Requirements: 12_

  - [ ] 15.2 Verify Award Calculation performance (500 submissions < 2 minutes)
    - Load test with 500 submissions across categories
    - Measure ranking and calculation time
    - _Requirements: 12_

  - [ ] 15.3 Verify Leaderboard API performance (100 concurrent users < 3 seconds)
    - Load test with 100 concurrent requests
    - Measure response time from cache
    - _Requirements: 6, 12_

  - [ ] 15.4 Verify Dashboard API performance (5000 submissions < 2 seconds)
    - Load test with large dataset
    - Measure metric calculation and filtering time
    - _Requirements: 7, 12_

- [ ] 16. Integration Testing and System Validation
  - [ ] 16.1 End-to-end flow: Submission detection through award notification
    - Create test Jira task with media
    - Verify detection, evaluation, award calculation, and notification
    - _Requirements: 1, 2, 3, 4, 9_

  - [ ] 16.2 Verify audit trail completeness for all operations
    - Trace all submission and award lifecycle events in audit log
    - Verify immutability and event correlation
    - _Requirements: 11_

  - [ ] 16.3 Test error recovery and retry logic
    - Simulate AI model failures and verify fallback
    - Simulate database failures and verify retry
    - _Requirements: 2, 10_

  - [ ] 16.4 Test data consistency and referential integrity
    - Verify all awards reference valid submissions
    - Verify all submissions reference valid team members
    - _Requirements: 11_

- [ ] 17. Final Checkpoint - System Complete and Validated
  - Ensure all end-to-end flows work correctly
  - Verify all performance targets are met
  - Verify all data integrity constraints are maintained
  - Ask the user if questions arise

- [ ] 18. Documentation and Deployment Preparation
  - [ ] 18.1 Create deployment and configuration guide
    - Document environment variables, API keys, scheduling setup
    - Document database initialization steps
    - _Requirements: 10, 12_

  - [ ] 18.2 Create operations runbook
    - Document common troubleshooting scenarios
    - Document how to re-evaluate submissions
    - Document how to access audit trails
    - _Requirements: 11_

---

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP, though comprehensive testing is recommended for reliability
- Each task references specific requirements for complete traceability
- Checkpoints ensure validation before proceeding to next major system area
- Property-based tests validate universal correctness properties defined in design
- Unit tests validate specific examples and edge cases
- All database operations maintain referential integrity through foreign keys and constraints
- Cache invalidation ensures stale data never reaches users
- AI evaluation fallback strategy ensures graceful degradation when primary provider unavailable
- Audit trail enables complete troubleshooting and fairness verification

---

## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1.1", "1.2", "1.3"]
    },
    {
      "id": 1,
      "tasks": ["1.4", "2.1", "2.2", "3.1", "3.2", "4.1", "5.1", "7.1"]
    },
    {
      "id": 2,
      "tasks": ["2.3", "2.3", "3.3", "3.3", "3.4", "4.2", "5.2", "7.2"]
    },
    {
      "id": 3,
      "tasks": ["2.4", "2.4", "3.4", "4.3", "4.3", "5.3", "7.3"]
    },
    {
      "id": 4,
      "tasks": ["2.5", "3.5", "4.4", "4.4", "5.4", "7.4"]
    },
    {
      "id": 5,
      "tasks": ["5.5", "5.6", "7.5", "8.1", "8.2", "8.4", "9.1"]
    },
    {
      "id": 6,
      "tasks": ["8.2", "8.3", "8.4", "8.6", "9.2", "10.1"]
    },
    {
      "id": 7,
      "tasks": ["8.4", "8.5", "8.6", "8.8", "9.3", "10.2"]
    },
    {
      "id": 8,
      "tasks": ["8.7", "9.4", "10.3", "12.1"]
    },
    {
      "id": 9,
      "tasks": ["9.5", "10.4", "10.5", "12.2"]
    },
    {
      "id": 10,
      "tasks": ["10.6", "12.3", "13.1"]
    },
    {
      "id": 11,
      "tasks": ["12.4", "13.2", "13.3", "14.1"]
    },
    {
      "id": 12,
      "tasks": ["13.4", "13.5", "14.2", "15.1"]
    },
    {
      "id": 13,
      "tasks": ["14.3", "15.2", "15.3"]
    },
    {
      "id": 14,
      "tasks": ["15.4", "16.1"]
    },
    {
      "id": 15,
      "tasks": ["16.2", "16.3"]
    },
    {
      "id": 16,
      "tasks": ["16.4", "18.1"]
    },
    {
      "id": 17,
      "tasks": ["18.2"]
    }
  ]
}
```
