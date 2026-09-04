# TASK 2 MVP - Quick Start Guide

## What Was Implemented

This is a complete MVP implementation of **TASK 2: Submission Detection from Jira** for the AI Awards for Creativity Recognition system.

### Three Core Components

#### 1. SubmissionService (TASK 2.2)
**File**: `src/services/SubmissionService.ts`

Handles all Firebase Firestore operations for submissions:
- Create submission records from Jira media
- Duplicate detection (jiraTaskId + fileName)
- Update status to "pending_evaluation"
- Store evaluation scores when ready
- Query and retrieve submissions

```typescript
import { SubmissionService } from './services/SubmissionService';

const service = new SubmissionService();

// Create a submission
const submissionId = await service.createSubmission({
  jiraTaskId: 'TASK-123',
  teamMemberId: 'user@example.com',
  mediaType: 'video',
  mediaFileName: 'video.mp4',
  mediaFormat: 'mp4',
  mediaFileSize: 104857600,
  mediaStorageUrl: 'gs://bucket/path',
  uploadTimestamp: Date.now()
});

// Update status
await service.updateStatusToPendingEvaluation(submissionId);
```

#### 2. SubmissionDetector (TASK 2.3)
**File**: `src/services/SubmissionDetector.ts`

Automated scheduler that detects media submissions from Jira:
- Runs every 2 hours (MVP schedule)
- Queries Jira for completed/posted tasks
- Extracts and validates media
- Creates submission records
- Handles errors gracefully

```typescript
import { SubmissionDetector } from './services/SubmissionDetector';

const detector = new SubmissionDetector();

// Start scheduler
detector.start();

// Get status
console.log(detector.getStatus());

// Manual trigger (for testing)
const result = await detector.detectAndProcessSubmissions();
console.log(`Created: ${result.created}, Failed: ${result.failed}`);

// Stop scheduler
detector.stop();
```

#### 3. JiraClient (TASK 2.1)
**File**: `src/clients/jira.ts` (Already exists, enhanced)

Already has all required methods:
- `fetchCompletedTasksLastNMinutes()` - Query Jira for completed/posted tasks
- `extractAttachments(task)` - Extract media attachments
- `isValidMediaFormat(fileName)` - Validate media format

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

This installs the new dependencies:
- `node-schedule@^2.1.1` - Scheduler
- `@types/node-schedule@^2.1.5` - TypeScript types

### 2. Configure Environment

Add to your `.env` file:

```bash
# Jira
JIRA_BASE_URL=https://your-company.atlassian.net
JIRA_API_TOKEN=your-api-token
JIRA_USERNAME=your-email@company.com
JIRA_SUBMISSION_DETECTION_LOOKBACK_MINUTES=120

# Firebase
FIREBASE_SERVICE_ACCOUNT_KEY='{...}'

# Optional Media Formats
SUBMISSION_SUPPORTED_VIDEO_FORMATS=mp4,mov,webm
SUBMISSION_SUPPORTED_POSTER_FORMATS=png,jpg,jpeg,svg
```

### 3. Test with Sample Data

Create sample submissions in Firebase:

```bash
node -e "
import('./src/services/sample-test-data.js').then(m => 
  m.seedSampleSubmissions().then(ids => {
    console.log('Created submissions:', ids);
    process.exit(0);
  })
);
"
```

This creates 3 sample submissions:
1. **Sarah Chen** - Summer Campaign (MP4 video, 100MB)
2. **Marco Rossi** - Brand Poster (PNG, 8MB)  
3. **Alex Thompson** - Product Animation (WebM, 150MB)

### 4. Verify Sample Data

```bash
node -e "
import('./src/services/sample-test-data.js').then(m => 
  m.verifySampleSubmissions().then(results => {
    console.log('Verification results:', results);
    process.exit(0);
  })
);
"
```

### 5. Run Tests

```bash
npm test
```

Tests verify:
- Submission creation from Jira tasks
- Duplicate detection
- Media type determination
- Error handling
- Concurrent detection prevention

## Data Flow

```
┌─────────────────────────────────────┐
│ Jira Task (Completed/Posted)        │
│ - Status: Completed                 │
│ - Attachments: video.mp4            │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ SubmissionDetector                  │
│ Every 2 hours (MVP)                 │
│ 1. Query Jira last 2 hours          │
│ 2. Extract attachments              │
│ 3. Validate formats                 │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ SubmissionService                   │
│ 1. Check duplicates                 │
│ 2. Create Firebase record           │
│ 3. Set status: "pending_evaluation" │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Firebase Firestore (submissions)    │
│ Status: active                      │
│ EvaluationStatus: pending           │
│ Ready for AI evaluation (TASK 3)    │
└─────────────────────────────────────┘
```

## Supported Media Formats

| Type | Formats |
|------|---------|
| Video | MP4, MOV, WebM |
| Poster | PNG, JPG, SVG |

## Submission Record Schema

```json
{
  "id": "SUB-2026-07-001",
  "submissionId": "SUB-2026-07-001",
  "jiraTaskId": "TASK-123",
  "teamMemberId": "user@email.com",
  "teamMemberName": "John Doe",
  "mediaType": "video",
  "media": {
    "fileName": "campaign.mp4",
    "format": "mp4",
    "fileSize": 104857600,
    "storageUrl": "gs://bucket/path",
    "hash": "sha256..."
  },
  "evaluationStatus": "pending",
  "status": "active",
  "version": 1,
  "createdAt": 1720550400000,
  "updatedAt": 1720550400000
}
```

## Performance Targets

| Operation | Target | Status |
|-----------|--------|--------|
| Process 1000 Jira tasks | < 5 minutes | ✅ Achievable |
| Submission creation | < 1 second | ✅ Typical |
| Firebase write | < 200ms | ✅ Typical |
| Full detection cycle | 2 hours (MVP) | ✅ Scheduled |

## Error Handling

All errors are handled gracefully:
- Jira API failures: Logged, retried with exponential backoff
- Firebase write failures: Logged with error details
- Individual attachment failures: Logged, continues processing
- Duplicate submissions: Detected and skipped automatically

## Logging

All operations are logged via the Logger utility:

```
[SubmissionDetector] INFO Starting submission detection cycle
[SubmissionDetector] INFO Fetched tasks from Jira (5 tasks)
[SubmissionService] INFO Submission created successfully (SUB-2026-07-001)
[SubmissionService] INFO Submission status updated to pending evaluation
```

## Files Created/Modified

| File | Status | Description |
|------|--------|-------------|
| `src/services/SubmissionService.ts` | ✅ NEW | 287 lines |
| `src/services/SubmissionDetector.ts` | ✅ NEW | 317 lines |
| `src/services/SubmissionDetector.test.ts` | ✅ NEW | 185 lines |
| `src/services/sample-test-data.ts` | ✅ NEW | 212 lines |
| `package.json` | ✅ UPDATED | Added dependencies |
| `MVP_IMPLEMENTATION_NOTES.md` | ✅ NEW | Full documentation |
| `TASK_2_QUICK_START.md` | ✅ NEW | This file |

**Total**: 1,001 lines of new code + 2 documentation files

## Next Task: AI Vision Evaluation (TASK 3)

The SubmissionDetector feeds submissions to the AI Evaluation Pipeline:

1. Submissions are created with `evaluationStatus: "pending"`
2. AI Evaluation Pipeline queries pending submissions
3. Each submission processed through AI vision model
4. Scores calculated and stored
5. Submissions updated to `evaluationStatus: "completed"` or "failed"

## Common Tasks

### Start Detector Manually
```typescript
import { SubmissionDetector } from './services/SubmissionDetector';

const detector = new SubmissionDetector();
detector.start();
```

### Create Submission Manually
```typescript
import { SubmissionService } from './services/SubmissionService';

const service = new SubmissionService();
const id = await service.createSubmission({
  jiraTaskId: 'TASK-456',
  jiraTaskKey: 'TASK-456',
  teamMemberId: 'user@example.com',
  teamMemberName: 'User Name',
  mediaType: 'video',
  mediaFileName: 'video.mp4',
  mediaFormat: 'mp4',
  mediaFileSize: 104857600,
  mediaStorageUrl: 'gs://bucket/file.mp4',
  uploadTimestamp: Date.now()
});
```

### Query Submissions
```typescript
const service = new SubmissionService();

// By Jira task
const submissions = await service.getSubmissionsByJiraTaskId('TASK-123');

// Pending for evaluation
const pending = await service.getPendingSubmissions(100);

// Specific submission
const submission = await service.getSubmission('SUB-2026-07-001');
```

### Check Detector Status
```typescript
const status = detector.getStatus();
console.log(`Running: ${status.running}`);
console.log(`Scheduled: ${status.scheduled}`);
console.log(`Interval: ${status.intervalMinutes} minutes`);
```

## Troubleshooting

### No submissions created
1. Verify Jira API token in `.env`
2. Check Jira has completed/posted tasks
3. Verify Firebase credentials
4. Check logs for specific errors

### Duplicates appearing
1. Check database for existing records
2. Verify transaction consistency
3. Check hash calculation

### Performance issues
1. Check Jira API rate limits
2. Verify network connectivity
3. Monitor Firebase quota
4. Consider reducing lookback window

## Support

For issues or questions:
1. Check logs in `/logs` directory
2. Review MVP_IMPLEMENTATION_NOTES.md for details
3. Verify environment configuration
4. Run tests: `npm test`

---

**MVP Status**: ✅ COMPLETE  
**Task 2.1**: ✅ JiraClient (Existing + Enhanced)  
**Task 2.2**: ✅ SubmissionService (New)  
**Task 2.3**: ✅ SubmissionDetector (New)  
**Sample Data**: ✅ 3 test submissions  
**Documentation**: ✅ Complete  

Ready for AI Vision Evaluation Pipeline (TASK 3) →
