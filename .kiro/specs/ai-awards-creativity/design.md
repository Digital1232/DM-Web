# AI Awards for Creativity Recognition - Technical Design

## Overview

The AI Awards for Creativity Recognition system is an automated visual design evaluation and recognition platform that integrates with Jira and the Marketing Hub. It uses AI vision models to evaluate video and poster submissions across three dimensions (composition, color theory, balance), calculates weekly and monthly awards with tie-breaking rules, displays results on a leaderboard and dashboard, and maintains comprehensive audit trails.

### Key Objectives

- **Automated Detection**: Detect media submissions from Jira tasks without manual intervention
- **Fair Evaluation**: Use AI vision models to objectively score visual design elements
- **Timely Recognition**: Calculate and distribute awards on weekly/monthly schedules with notification support
- **Transparent Leaderboards**: Rank creators by awards and visual design quality
- **Audit & Compliance**: Maintain complete data history for fairness verification and troubleshooting
- **Seamless Integration**: Work within existing Jira workflow and Marketing Hub ecosystem

---

## System Architecture

### High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AI Awards System Architecture                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              External Integrations                          │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │  • Jira API (Task detection, attachment retrieval)         │  │
│  │  • AI Vision Models (Google Cloud Vision, Azure CV, etc.)  │  │
│  │  • Marketing Hub (Submission metadata)                     │  │
│  │  • Notification Service (Email, in-app alerts)             │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                           ↓                                         │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              Core Processing Layer                          │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │  • Submission Detector (hourly Jira polling)               │  │
│  │  • AI Evaluation Pipeline (async processing)               │  │
│  │  • Award Calculator (scheduled weekly/monthly)             │  │
│  │  • Notification Manager (batch and individual)             │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                           ↓                                         │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              Data Access Layer                              │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │  • Submission Repository (CRUD + queries)                  │  │
│  │  • Award Repository (historical + current)                 │  │
│  │  • Audit Logger (immutable event records)                  │  │
│  │  • Cache Layer (Redis for leaderboard/dashboard)           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                           ↓                                         │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              Persistence Layer                              │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │  • Primary Database (PostgreSQL/Firebase)                  │  │
│  │  • Audit Trail Database (immutable log)                    │  │
│  │  • File Storage (cloud storage for media)                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                           ↓                                         │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              UI/Presentation Layer                          │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │  • Leaderboard Views (ranked displays)                      │  │
│  │  • Dashboard (metrics, charts, insights)                   │  │
│  │  • Jira Task Integration (award badges)                    │  │
│  │  • Reports & Exports (PDF, CSV, JSON)                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow Diagram

```
Jira Task
  ↓
[Submission Detector] (Hourly) → Detects completed/posted tasks with media
  ↓
Submission Record Created
  ↓
[Media Validation] → Checks format (MP4, MOV, WebM, PNG, JPG, SVG)
  ↓
[AI Evaluation Pipeline] (Async Queue) → Processes media through AI vision model
  ├─ Composition Score (0-100)
  ├─ Color Theory Score (0-100)
  └─ Balance Score (0-100)
  ↓
Creativity Score Calculated: (Comp × 0.35) + (ColorTheory × 0.35) + (Balance × 0.30)
  ↓
Submission Record Updated with Scores
  ↓
[Weekly Award Calculator] (Every Sunday 23:59:59 UTC) → Ranks last 7 days
  ↓
[Monthly Award Calculator] (Month-end 23:59:59 UTC) → Ranks last 30 days
  ↓
Award Records Created + Notifications Sent
  ↓
[Dashboard & Leaderboard] → Updated with new rankings and metrics
  ↓
[Export/Report Generation] → Generate PDF, CSV, JSON
```

---

## Data Models

### Submission Record

```
{
  id: "SUB-2026-07-001",              // Unique submission ID
  submissionId: "SUB-2026-07-001",    // Alias for consistency
  
  // Source Information
  jiraTaskId: "TASK-123",             // Source Jira task
  jiraTaskKey: "PROJ-456",            // Full Jira task key
  submissionTimestamp: 1720550400000, // When media was submitted
  
  // Team Member Information
  teamMemberId: "user@email.com",     // Creator user ID
  teamMemberName: "John Doe",         // Creator display name
  departmentId: "marketing",          // Department classification
  
  // Media Information
  mediaType: "video",                 // "video" or "poster"
  mediaFormat: "mp4",                 // "mp4", "mov", "webm", "png", "jpg", "svg"
  mediaFileName: "campaign_video.mp4",
  mediaFileSize: 524288000,           // Bytes
  mediaStorageUrl: "gs://bucket/path/to/file",
  mediaThumbnailUrl: "gs://bucket/thumbnails/thumb.jpg",
  
  // Evaluation Information
  evaluationStatus: "completed",      // pending, processing, completed, failed, evaluation_failed
  aiModelVersion: "vision-api-v1.0",  // AI model identifier
  evaluationTimestamp: 1720560400000, // When evaluation completed
  
  // Creativity Scores
  compositionScore: 85,               // 0-100
  colorTheoryScore: 78,               // 0-100
  balanceScore: 82,                   // 0-100
  creativityScore: 81,                // Final: (85×0.35)+(78×0.35)+(82×0.30)
  
  // Metadata
  status: "active",                   // active, archived, deleted_jira
  version: 1,                         // For re-evaluations
  createdAt: 1720550400000,
  updatedAt: 1720560400000,
  
  // Error Tracking
  evaluationErrors: [],               // Array of error objects if failed
  retryCount: 0,                      // Number of retry attempts
  nextRetryAt: null                   // Timestamp for next retry
}
```

### Award Record

```
{
  id: "AWARD-2026-W29-VIDEO",         // Unique award ID
  awardId: "AWARD-2026-W29-VIDEO",    // Alias for consistency
  
  // Award Information
  awardType: "weekly",                // "weekly" or "monthly"
  awardCategory: "Best_Video",        // "Best_Video", "Best_Poster", "Best_Video_Poster_Content"
  
  // Period Information
  periodType: "week",                 // "week" or "month"
  periodYear: 2026,
  periodMonth: 7,
  periodWeek: 29,                     // ISO week number (if weekly)
  periodStart: "2026-07-21",          // Period start date (ISO 8601)
  periodEnd: "2026-07-27",            // Period end date (ISO 8601)
  
  // Winner Information
  winnerId: "user@email.com",         // Award winner user ID
  winnerName: "John Doe",             // Winner display name
  winnerDepartment: "marketing",      // Department classification
  
  // Submission Reference
  submissionId: "SUB-2026-07-001",    // Referenced submission
  jiraTaskId: "TASK-123",             // Source task
  
  // Award Metrics
  creativityScore: 85,                // Final score from submission
  compositionScore: 85,
  colorTheoryScore: 78,
  balanceScore: 82,
  
  // Ranking
  rankInPeriod: 1,                    // 1st place in category for period
  totalContestants: 45,               // How many submissions competed
  
  // Calculation Information
  calculationTimestamp: 1720641600000,// When award was calculated
  tiebreaker: "earlier_submission",   // If applicable: "no_tie" or "earlier_submission"
  
  // Metadata
  status: "active",                   // active, archived, revoked
  notificationSent: true,
  notificationTimestamp: 1720643400000,
  createdAt: 1720641600000,
  updatedAt: 1720641600000
}
```

### Audit Log Entry

```
{
  id: "AUDIT-2026-07-00001",
  
  // Event Information
  eventType: "submission_created",    // submission_created, submission_evaluated, award_calculated, award_notified, submission_re_evaluated, etc.
  entityType: "submission",           // submission, award, calculation
  entityId: "SUB-2026-07-001",       // ID of entity being audited
  
  // Change Data
  before: { creativityScore: null },  // Previous state
  after: { creativityScore: 85 },     // New state
  changeDetails: { reason: "initial_evaluation" },
  
  // User/System Information
  actorId: "system",                  // User ID or "system" for automated
  actorType: "system",                // "user" or "system"
  
  // Timestamp
  timestamp: 1720560400000,           // When event occurred
  
  // Traceability
  correlationId: "CORR-2026-07-001",  // Links related audit events
  sourceSystem: "ai_evaluator",       // Which system made change
  
  // Additional Context
  context: {
    jiraTaskId: "TASK-123",
    aiModelVersion: "vision-api-v1.0"
  }
}
```

### Team Member Stats (Cached in Redis)

```
{
  id: "STATS-WEEK-2026-W29-user@email.com",
  userId: "user@email.com",
  periodType: "week",
  periodWeek: 29,
  periodYear: 2026,
  
  // Award Counts
  weeklyAwards: 1,
  monthlyAwards: 0,
  totalAwards: 1,
  
  // Score Statistics
  submissionCount: 5,
  averageCreativityScore: 78.4,
  highestCreativityScore: 85,
  lowestCreativityScore: 72,
  
  // Category Breakdown
  awardsByCategory: {
    "Best_Video": 1,
    "Best_Poster": 0,
    "Best_Video_Poster_Content": 0
  },
  
  // Leaderboard Position
  overallRank: 1,
  weeklyRank: 1,
  monthlyRank: null,  // Not available until month ends
  
  // Cached Data
  lastUpdated: 1720641600000,
  expiresAt: 1720728000000              // 24-hour TTL
}
```



---

## Components and Interfaces

### 1. Submission Detector Service

**Purpose**: Periodically poll Jira API to detect completed/posted tasks with media attachments

**Interface**:
```javascript
class SubmissionDetector {
  // Configuration
  private jiraBaseUrl: string
  private jiraApiToken: string
  private pollIntervalMs: number = 3600000 // 1 hour
  private retryBackoff: number[] = [60000, 300000, 900000] // 1, 5, 15 minutes
  
  // Main entry point (runs on schedule)
  async detectAndProcessSubmissions(): Promise<{
    processed: number,
    created: number,
    failed: number,
    errors: string[]
  }>
  
  // Helper methods
  private async queryCompletedTasks(): Promise<Task[]>
  private async extractMediaAttachments(task: Task): Promise<Attachment[]>
  private async validateMediaFormat(attachment: Attachment): Promise<boolean>
  private async createSubmissionRecord(task: Task, attachment: Attachment): Promise<string>
  private async handleDetectionError(error: Error, taskId: string): Promise<void>
}
```

**Key Behaviors**:
- Runs hourly on fixed schedule
- Queries Jira for tasks transitioned to "Completed" or "Posted" in last 90 minutes
- Validates attachment format (MP4, MOV, WebM, PNG, JPG, SVG)
- Creates Submission records asynchronously
- Implements exponential backoff retry on Jira API failures (max 3 retries)
- Logs all processed tasks to audit trail
- Skips duplicate submissions (by task ID + attachment hash)

### 2. AI Evaluation Pipeline

**Purpose**: Process media submissions through AI vision models to generate creativity scores

**Interface**:
```javascript
class AIEvaluationPipeline {
  private primaryAiProvider: AIProvider  // Google Vision, Azure Computer Vision, etc.
  private secondaryAiProvider: AIProvider // Fallback provider
  private evaluationQueue: Queue<Submission>
  private maxConcurrentEvaluations: number = 5
  
  // Main entry point
  async evaluateSubmission(submissionId: string): Promise<{
    compositionScore: number,
    colorTheoryScore: number,
    balanceScore: number,
    creativityScore: number,
    modelVersion: string,
    evaluationTimestamp: number
  }>
  
  // Helper methods
  private async downloadMediaFile(storageUrl: string): Promise<Buffer>
  private async callPrimaryAiModel(mediaBuffer: Buffer): Promise<AIResponse>
  private async callSecondaryAiModel(mediaBuffer: Buffer): Promise<AIResponse>
  private calculateCreativityScore(subscores: Subscores): number
  private validateScoreResponse(response: AIResponse): boolean
  private async updateSubmissionWithScores(submissionId: string, scores: Scores): Promise<void>
  private async handleEvaluationError(submissionId: string, error: Error): Promise<void>
}
```

**Score Calculation**:
```
Creativity Score = (Composition × 0.35) + (Color Theory × 0.35) + (Balance × 0.30)
Range: 0-100 (weighted average of three subscores)
```

**Fallback Strategy**:
- Primary AI provider (e.g., Google Cloud Vision) with 99% availability SLA
- Secondary AI provider (e.g., Azure Computer Vision) on primary failure
- Log fallback event for operational monitoring
- Transparent versioning (record which AI model version produced scores)

### 3. Award Calculator Service

**Purpose**: Calculate weekly and monthly awards based on submission scores and tiebreaker rules

**Interface**:
```javascript
class AwardCalculator {
  async calculateWeeklyAwards(): Promise<{
    awarded: number,
    categories: AwardCategory[],
    timestamp: number,
    errors: string[]
  }>
  
  async calculateMonthlyAwards(): Promise<{
    awarded: number,
    categories: AwardCategory[],
    timestamp: number,
    errors: string[]
  }>
  
  // Helper methods
  private async getSubmissionsForPeriod(periodType: 'week' | 'month'): Promise<Submission[]>
  private async rankSubmissionsByCategory(submissions: Submission[]): Promise<Map<string, Submission[]>>
  private selectWinner(rankedSubmissions: Submission[], category: string): Submission
  private applyTiebreaker(tied: Submission[]): Submission  // Earlier submission wins
  private async createAwardRecord(winner: Submission, category: string, period: Period): Promise<string>
  private async notifyWinner(award: Award): Promise<void>
  private async cacheLeaderboardData(period: Period): Promise<void>
}
```

**Tiebreaker Logic**:
```
When Creativity Scores are equal:
  IF submission_a.submissionTimestamp < submission_b.submissionTimestamp:
    THEN submission_a wins (earlier submission wins)
```

**Key Behaviors**:
- Runs on fixed schedule: Every Sunday 23:59:59 UTC (weekly), Month-end 23:59:59 UTC (monthly)
- Filters submissions by category (Best_Video, Best_Poster, Best_Video_Poster_Content)
- Selects exactly one winner per category per period
- Applies deterministic tiebreaker rule
- Creates immutable Award records
- Sends notifications within 5 minutes
- Logs to audit trail with calculation details
- Updates cached leaderboard data

### 4. Notification Manager

**Purpose**: Send award and system notifications through multiple channels

**Interface**:
```javascript
class NotificationManager {
  async sendAwardNotification(award: Award, recipientId: string): Promise<{
    emailSent: boolean,
    inAppSent: boolean,
    timestamp: number,
    messageId: string
  }>
  
  async sendBatchNotification(awards: Award[]): Promise<{
    sent: number,
    failed: number,
    deduped: number
  }>
  
  // Helper methods
  private async buildNotificationMessage(award: Award): Promise<string>
  private async getRecipientPreferences(userId: string): Promise<NotificationPreferences>
  private async sendEmailNotification(userId: string, message: string): Promise<boolean>
  private async sendInAppNotification(userId: string, message: string): Promise<boolean>
  private async deduplicateNotifications(userId: string, awardIds: string[]): Promise<Award[]>
  private async logNotificationEvent(userId: string, award: Award, status: string): Promise<void>
}
```

**Deduplication**: 1-minute window for duplicate detection (user receives single message if winning multiple categories simultaneously)

### 5. Leaderboard Service

**Purpose**: Generate ranked leaderboard data with multiple sorting/filtering options

**Interface**:
```javascript
class LeaderboardService {
  async getLeaderboard(options: {
    period: 'week' | 'month' | 'all-time',
    sortBy: 'awards' | 'highest-score' | 'submission-count',
    category?: string,
    limit?: number,
    offset?: number
  }): Promise<{
    rankings: LeaderboardEntry[],
    totalCount: number,
    generatedAt: number,
    periodLabel: string
  }>
  
  async getDetailedStats(userId: string, period: 'week' | 'month'): Promise<{
    rank: number,
    totalAwards: number,
    weeklyAwards: number,
    monthlyAwards: number,
    averageScore: number,
    topSubmissions: Submission[],
    categoryBreakdown: Record<string, number>
  }>
  
  // Helper methods
  private async buildRankingsFromCache(options: any): Promise<LeaderboardEntry[]>
  private async sortByAwardCount(entries: LeaderboardEntry[]): Promise<LeaderboardEntry[]>
  private applyTiebreaker(entries: LeaderboardEntry[]): LeaderboardEntry[]
  private async cacheLeaderboardForPeriod(period: string, data: LeaderboardEntry[]): Promise<void>
}
```

**Default Sort**: Award count (descending) → Highest single score (descending) → Earliest award date

### 6. Dashboard Service

**Purpose**: Generate dashboard metrics, charts, and insights

**Interface**:
```javascript
class DashboardService {
  async getDashboardData(filters: {
    period: 'week' | 'month' | 'quarter' | 'year',
    category?: string,
    teamMember?: string,
    department?: string,
    mediaType?: 'video' | 'poster'
  }): Promise<{
    summary: DashboardSummary,
    topCreators: Array<{name: string, awardCount: number}>,
    scoreDistribution: Array<{range: string, count: number}>,
    trendData: Array<{date: string, submissions: number, avgScore: number}>,
    categoryBreakdown: Record<string, number>,
    generatedAt: number
  }>
  
  async generateReport(format: 'pdf' | 'csv' | 'json'): Promise<Buffer>
  
  // Helper methods
  private async calculateSummaryStats(filteredSubmissions: Submission[]): Promise<DashboardSummary>
  private async generateScoreHistogram(submissions: Submission[]): Promise<HistogramBucket[]>
  private async generateTrendChart(submissions: Submission[]): Promise<TrendPoint[]>
  private async buildPdfReport(data: DashboardData): Promise<Buffer>
  private async buildCsvReport(data: DashboardData): Promise<Buffer>
}
```



---

## Error Handling and Fallback Strategy

### AI Model Fallback Cascade

```
┌─────────────────────────────┐
│  Submission Received        │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│ Try Primary AI Provider     │  (Google Cloud Vision)
│ (Timeout: 120s)             │
└──────────────┬──────────────┘
               │
          ┌────┴────┐
          │ Success? │
          └────┬─────┘
          Yes  │  No
              ↓
    ┌──────────────────────┐
    │ Try Secondary Provider│  (Azure Computer Vision)
    │ (Timeout: 120s)      │
    └──────────────┬───────┘
                   │
              ┌────┴────┐
              │ Success? │
              └────┬─────┘
              Yes  │  No
                  ↓
          ┌──────────────────┐
          │ Mark as Failed   │
          │ Schedule Retry   │
          │ (6 hours later)  │
          │ Max 3 Retries    │
          └──────────────────┘
```

### Error Handling Patterns

**API Failures**:
- Jira API: Exponential backoff (1, 5, 15 minutes), skip after 3 retries, log to audit
- AI Model: Retry on secondary, schedule for 6-hour retry, mark submission as "evaluation_failed"
- Database: Return error, trigger alerts to administrators

**Validation Failures**:
- Invalid media format: Skip with error log, no retry
- Corrupted AI response: Trigger secondary provider, retry after 6 hours
- Missing required fields: Log validation error, mark as "evaluation_failed"

**Fallback Mechanisms**:
- AI provider unavailable: Automatic switch to secondary provider (transparent to user)
- Primary database unavailable: Switch to read-only replica (if configured)
- Notification service unavailable: Queue for retry, send alerts to admins
- Cache unavailable: Regenerate on-demand (performance degradation, no functional impact)

### Retry Logic

```javascript
const retryPolicy = {
  ai_evaluation_failure: {
    maxRetries: 3,
    backoffIntervals: [6*60*60*1000, 12*60*60*1000, 24*60*60*1000],  // 6h, 12h, 24h
    stopCondition: "max_retries_exceeded or evaluation_succeeded"
  },
  jira_api_failure: {
    maxRetries: 3,
    backoffIntervals: [60*1000, 5*60*1000, 15*60*1000],  // 1m, 5m, 15m
    stopCondition: "max_retries_exceeded or api_success"
  },
  notification_failure: {
    maxRetries: 5,
    backoffIntervals: [30*1000, 1*60*1000, 5*60*1000, 15*60*1000, 60*60*1000],  // Exponential
    stopCondition: "max_retries_exceeded or notification_sent"
  }
}
```

---

## Performance Considerations

### Caching Strategy

**Redis Cache Layers**:

1. **Leaderboard Cache** (TTL: 1 hour)
   - Key: `leaderboard:week:2026-W29:all-time`
   - Contains: Top 100 ranked entries with stats
   - Invalidated: Weekly at calculation completion

2. **Team Member Stats Cache** (TTL: 24 hours)
   - Key: `stats:week:2026-W29:user@email.com`
   - Contains: Award counts, scores, ranks
   - Invalidated: On new award calculated for member

3. **Dashboard Metrics Cache** (TTL: 2 hours)
   - Key: `dashboard:metrics:2026-07:all`
   - Contains: Summary stats, category breakdown, top creators
   - Invalidated: After each award calculation or hourly

4. **Submission Scores Cache** (TTL: 30 days)
   - Key: `submission:scores:SUB-2026-07-001`
   - Contains: Full submission with scores
   - Permanent (not invalidated except on re-evaluation)

### Query Optimization

**Database Indexes**:
```sql
-- Submission queries
CREATE INDEX idx_submissions_timestamp ON submissions(submissionTimestamp DESC);
CREATE INDEX idx_submissions_status_type ON submissions(status, evaluationStatus);
CREATE INDEX idx_submissions_team_member ON submissions(teamMemberId);
CREATE INDEX idx_submissions_jira_task ON submissions(jiraTaskId);

-- Award queries
CREATE INDEX idx_awards_period ON awards(periodType, periodYear, periodMonth);
CREATE INDEX idx_awards_winner ON awards(winnerId, awardType);
CREATE INDEX idx_awards_category ON awards(awardCategory);

-- Audit trail queries
CREATE INDEX idx_audit_entity ON audit_logs(entityType, entityId);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
```

### Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| Submission Detection (1000 tasks) | < 5 minutes | Hourly batch |
| AI Evaluation (per file) | < 2 minutes | Async queue, 5 concurrent |
| Weekly Award Calculation (500 submissions) | < 2 minutes | Fixed schedule |
| Monthly Award Calculation (2000 submissions) | < 3 minutes | Fixed schedule |
| Leaderboard API (100 concurrent) | < 3 seconds | Cached response |
| Dashboard Metrics Refresh | < 2 seconds | Cached, filtered |
| Report Export (2000 records) | < 10 seconds | Streaming generation |

### Scalability

**Current Design Supports**:
- Up to 5,000 submissions per month
- Up to 200 team members
- Up to 50 concurrent dashboard users
- Unlimited audit trail retention (with archival)

**Horizontal Scaling**:
- Submission Detector: Run multiple instances with distributed locking
- AI Evaluation: Queue-based processing with worker pool (5 concurrent per instance)
- Award Calculator: Single-instance trigger with database-level consistency
- API Servers: Stateless, scale behind load balancer
- Cache: Redis cluster for distributed cache layer

---

## Integration Points

### Jira Integration

**Submission Detection**:
```
Jira Task Status Change → Webhooks trigger OR Polling detects → Submission Detector
                         → Reads task details + attachments
                         → Creates Submission Record
```

**Award Display in Jira**:
```
Jira Task View → Query Awards by jiraTaskId
              → Display award badge (category, score, period)
              → Click badge → Show award details modal
```

**Task Filtering**:
```
Jira Task Filter: "has_award" = true
                → Query Award Records
                → Filter tasks by referenced submissionIds
                → Return in Jira UI
```

### Marketing Hub Integration

**Submission Context**:
- Leverage existing Marketing Hub metadata for media
- Link submissions to Marketing Hub campaigns
- Display submissions alongside Marketing Hub data

**Export Integration**:
- Share award data with Marketing Hub dashboards
- Include awards in Marketing Hub reports

### Notification Service Integration

**Channels**:
- Email: Standard HTML templates with award details
- In-App: Real-time notification badge + notification center
- Slack (optional): Post to team channels when awards calculated

**Message Template**:
```
Subject: 🏆 You Won a [CATEGORY] Award This [PERIOD]!
Body:
  Congratulations! Your [VIDEO/POSTER] "[TITLE]" received the Best [CATEGORY] award!
  
  Award Details:
  • Category: [CATEGORY]
  • Period: [PERIOD_START] to [PERIOD_END]
  • Score: [CREATIVITY_SCORE]/100
    - Composition: [COMP_SCORE]
    - Color Theory: [COLOR_SCORE]
    - Balance: [BALANCE_SCORE]
  • View Leaderboard: [LINK]
```

---

## Data Export and Parser

### Export Formats

**JSON Export Format**:
```javascript
{
  "exportMetadata": {
    "timestamp": "2026-07-28T14:30:00Z",
    "dataVersion": "1.0",
    "recordCount": 150,
    "completeness": "VERIFIED"
  },
  "submissions": [
    {
      "id": "SUB-2026-07-001",
      "jiraTaskId": "TASK-123",
      "teamMemberId": "user@email.com",
      "mediaType": "video",
      "submissionTimestamp": "2026-07-21T10:30:00Z",
      "creativityScore": 85,
      "compositionScore": 85,
      "colorTheoryScore": 78,
      "balanceScore": 82,
      "evaluationTimestamp": "2026-07-21T11:00:00Z"
    }
  ],
  "awards": [
    {
      "id": "AWARD-2026-W29-VIDEO",
      "awardType": "weekly",
      "awardCategory": "Best_Video",
      "period": {
        "type": "week",
        "start": "2026-07-21",
        "end": "2026-07-27"
      },
      "winnerId": "user@email.com",
      "submissionId": "SUB-2026-07-001",
      "creativityScore": 85
    }
  ]
}
```

**CSV Export Format**:
```
id,jiraTaskId,teamMemberId,mediaType,submissionTimestamp,creativityScore,compositionScore,colorTheoryScore,balanceScore,evaluationTimestamp,awardCategory,awardType
SUB-2026-07-001,TASK-123,user@email.com,video,2026-07-21T10:30:00Z,85,85,78,82,2026-07-21T11:00:00Z,Best_Video,weekly
```

### Parser Implementation

```javascript
class DataParser {
  parseJSON(jsonString: string): {
    submissions: Submission[],
    awards: Award[],
    errors: string[]
  }
  
  parseCSV(csvString: string): {
    submissions: Submission[],
    awards: Award[],
    errors: string[]
  }
  
  // Validation
  validateJSON(data: any): {valid: boolean, errors: string[]}
  validateCSV(data: string[][]): {valid: boolean, errors: string[]}
  
  // Pretty printing
  prettyPrintSubmission(submission: Submission): string
  prettyPrintAward(award: Award): string
  generateSummaryReport(submissions: Submission[], awards: Award[]): string
}
```

### Round-Trip Properties

**JSON Round-Trip**:
```
JSON String → parse() → Submission Object → stringify() → JSON String (preserves structure and values)
```

**CSV Round-Trip**:
```
CSV String → parseCSV() → Submission[] → toCSV() → CSV String (row count preserved, numeric values ±0.01)
```

---

## Security and Audit

### Data Integrity Measures

**Referential Integrity**:
- Award records always reference valid Submission records
- Submission records always reference valid team members
- Audit logs immutable (append-only, no updates or deletes)

**Consistency Checks**:
```
Award Validation Rules:
  ✓ winnerId must exist in team members table
  ✓ submissionId must exist in submissions table
  ✓ submissionId.teamMemberId must equal winnerId
  ✓ submissionId.evaluationStatus must be "completed"
  ✓ Award period must not overlap with other awards in same category
```

### Audit Logging

**All Events Logged**:
- Submission created, evaluated, re-evaluated
- Award calculated, notified, revoked
- Data exported, imported, reconciled
- Configuration changes (admin actions)
- Access to sensitive data

**Audit Record Immutability**:
- Written once, never updated
- Encrypted at rest
- Retention: Minimum 2 years
- Query-optimized for compliance reports

### Access Control

**Role-Based Access**:
```
Team Member:
  ✓ View own submissions and awards
  ✓ View leaderboard
  ✓ View public dashboard
  ✗ See evaluation details
  ✗ Export data
  ✗ Configure system

Manager:
  ✓ View all team submissions and awards
  ✓ View detailed dashboard with filters
  ✓ Export filtered reports
  ✓ View audit logs for own team
  ✗ Change scores
  ✗ Configure system

Administrator:
  ✓ Full system access
  ✓ View all audit logs
  ✓ Configure AI providers and categories
  ✓ Re-evaluate submissions
  ✓ Adjust award settings
```



---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Before defining correctness properties, I need to assess whether property-based testing (PBT) is appropriate for this feature.

### PBT Applicability Assessment

This feature is a hybrid:
- **PBT IS Applicable**: Core logic (score calculation, ranking, tiebreaking, data validation, parsing/serialization)
- **PBT NOT Applicable**: External integrations (Jira API, AI vision models), infrastructure operations (scheduled jobs, caching), deterministic third-party behavior

The design includes property-based testing for the deterministic business logic components while using integration/example tests for external dependencies and operations.

### Acceptance Criteria Prework Analysis

Let me analyze each requirement for property-based testing suitability:

**Requirement 1 (Submission Detection)**:
- 1.1: Universal property - Referential integrity preservation (PBT suitable)
- 1.2: Property - Metadata extraction consistency (PBT suitable)
- 1.3: Example - Task creation (specific scenario)
- 1.4: Example - Invalid format rejection (specific cases)
- 1.5: Integration - Scheduled polling behavior (Infrastructure/timing, not PBT)
- 1.6: Integration - API error retry logic (External service, not PBT)

**Requirement 2 (AI Evaluation)**:
- 2.1-2.3: Properties - Score calculation consistency (PBT suitable - subscores sum correctly)
- 2.4: Property - Score formula verification (PBT suitable - weighted average calculation)
- 2.5: Example - Corruption handling (specific scenario)
- 2.6: Example - Re-evaluation (specific state transition)
- 2.7: Example - Score persistence (specific operation)

**Requirement 3 & 4 (Weekly/Monthly Awards)**:
- 3.2, 4.2: Properties - Ranking and winner selection (PBT suitable - selection determinism)
- 3.3, 4.3: Property - Tiebreaker consistency (PBT suitable - ordering rule)
- 3.4, 4.4: Example - Award record creation (specific outcome)
- 3.5, 4.5: Integration - Notification delivery (External service)
- 3.6, 4.6: Integration - Error handling with retry (Infrastructure)

**Requirement 5 (Award Categories)**:
- 5.2: Property - Submission filtering by type (PBT suitable - category filtering)
- 5.3: Property - Media type classification (PBT suitable - consistency)

**Requirement 6 (Leaderboard)**:
- 6.2: Property - Ranking transitivity (PBT suitable - ordering consistency)
- 6.3: Property - Leaderboard statistics consistency (PBT suitable - arithmetic)

**Requirement 7 (Dashboard)**:
- 7.1-7.2: Property - Metric calculation consistency (PBT suitable - math verification)
- 7.4: Property - Filter preservation of metrics (PBT suitable - data consistency)

**Requirement 8 (Jira Integration)**:
- 8.1: Integration - Automatic detection (External system polling)
- 8.4: Property - Referential integrity (PBT suitable - data relationship)

**Requirement 9 (Notifications)**:
- 9.1: Integration - Notification delivery timing (External service)
- 9.2: Example - Notification content (specific message format)
- 9.4: Property - Idempotent notification deduplication (PBT suitable - exactly-once guarantee)

**Requirement 10 (AI Model Integration)**:
- 10.3: Property - Fallback transitions without data loss (PBT suitable - state transitions)
- 10.4: Property - Score determinism (PBT suitable - reproducibility)

**Requirement 11 (Data Persistence)**:
- 11.1-11.3: Property - Audit trail immutability (PBT suitable - versioning consistency)
- 11.2: Property - Referential integrity audit (PBT suitable - relationship validation)

**Requirement 12 (Performance)**:
- These are performance/scalability targets, not testable as properties in unit tests

**Requirement 13 (Data Export)**:
- 13.3-13.4: Property - Round-trip preservation (PBT suitable - parse/serialize identity)
- 13.5: Example - Import validation report (specific operation)

**Requirement 14 (Parser/Serializer)**:
- 14.1-14.2: Property - Parsing correctness (PBT suitable - parse → object equivalence)
- 14.3: Property - Data validation rules (PBT suitable - constraint enforcement)
- 14.4: Property - Pretty-print roundtrip (PBT suitable - print → parse identity)
- 14.6: Property - Format stability roundtrip (PBT suitable - idempotence)

### Correctness Properties

#### Property 1: Creativity Score Calculation Formula

**Definition**: *For any valid set of subscores (Composition C, Color Theory T, Balance B where 0 ≤ C,T,B ≤ 100), the calculated Creativity Score SHALL equal (C × 0.35) + (T × 0.35) + (B × 0.30) with a tolerance of ±1 point for rounding.*

**Validates**: Requirements 2.4

**Implementation Pattern**: Generate random subscores, calculate result, verify formula arithmetically.

#### Property 2: Winner Selection Determinism (Tiebreaker)

**Definition**: *For any set of ranked submissions with equal Creativity Scores in an award category, repeated calls to selectWinner() with the same input data SHALL consistently select the same winner (earliest submission timestamp).*

**Validates**: Requirements 3.3, 4.3

**Implementation Pattern**: Generate tied submissions with same scores but different timestamps, verify earliest timestamp always selected.

#### Property 3: Award Uniqueness Per Category Per Period

**Definition**: *For any award period and award category, the Award_Calculator SHALL create exactly one Award_Record when eligible submissions exist, and multiple consecutive calculation runs SHALL not create duplicate awards.*

**Validates**: Requirements 3.1, 4.1

**Implementation Pattern**: Run calculator multiple times on same submission set, verify exactly one award created per category.

#### Property 4: Leaderboard Rank Transitivity

**Definition**: *For any leaderboard, if Member_A ranks above Member_B and Member_B ranks above Member_C, then Member_A SHALL rank above Member_C (transitivity property).*

**Validates**: Requirements 6.2

**Implementation Pattern**: Generate random member rankings, verify transitive ordering holds across all triples.

#### Property 5: Statistics Arithmetic Consistency

**Definition**: *For any leaderboard entry, the sum of weekly_awards and monthly_awards SHALL equal total_awards; for dashboard metrics, sum of category awards SHALL equal total awards.*

**Validates**: Requirements 6.3, 7.1

**Implementation Pattern**: Generate random award distributions, verify summation properties.

#### Property 6: Submission Type Filtering Correctness

**Definition**: *For any award category and submission set, filtering submissions by media type SHALL return only submissions matching that category's media type requirements (video-eligible categories contain only video submissions, poster-eligible contain posters, combined includes both).*

**Validates**: Requirements 5.2

**Implementation Pattern**: Generate mixed submission types, apply category filter, verify only matching types returned.

#### Property 7: Referential Integrity Preservation

**Definition**: *For any Award_Record, the referenced submissionId SHALL exist in Submission_Records with matching teamMemberId; for any Submission_Record created from Jira, the jiraTaskId SHALL reference a valid Jira task, and deletion of the source task SHALL mark the submission as archived (never hard-deleted).*

**Validates**: Requirements 1.1, 8.4, 11.2

**Implementation Pattern**: Create submissions from task data, verify all references are resolvable; attempt to delete source, verify soft-delete behavior.

#### Property 8: Notification Deduplication Idempotency

**Definition**: *For any set of awards won by a single team member in the same calculation cycle, sending notifications multiple times within the 1-minute deduplication window SHALL result in exactly one notification received by the recipient, not duplicated.*

**Validates**: Requirement 9.4

**Implementation Pattern**: Generate multiple identical award notifications, send multiple times, verify only one message delivered to user.

#### Property 9: Data Export Round-Trip Preservation

**Definition**: *For any valid award/submission records exported to JSON format, parsing the JSON back to objects, then re-formatting to JSON SHALL preserve all data: IDs, scores, dates, and metadata remain equivalent to the source (identical IDs, scores within ±0.01 tolerance, dates match exactly).*

**Validates**: Requirement 13.3, 14.4

**Implementation Pattern**: Export random records to JSON, parse, re-export, compare original to final version.

#### Property 10: Parser Error Robustness

**Definition**: *For any malformed JSON input (missing required fields, invalid score ranges, corrupt timestamps, duplicated IDs), the Parser SHALL return a structured error object with line number and field name, never throw an uncaught exception.*

**Validates**: Requirement 14.2

**Implementation Pattern**: Generate systematically malformed JSON inputs, verify all return descriptive errors without exceptions.

#### Property 11: CSV Row Count Preservation

**Definition**: *For any set of N submission records exported to CSV format and then re-parsed, the number of rows parsed SHALL equal N (no row loss or duplication during round-trip).*

**Validates**: Requirement 13.4

**Implementation Pattern**: Export various record counts, parse back, verify row count matches exactly.

#### Property 12: Score Determinism with Fixed Model

**Definition**: *For any submission media file, calling AIEvaluationPipeline.evaluateSubmission() twice on the same file with the same AI model version within the same day SHALL produce identical or near-identical Creativity Scores (within ±2 points tolerance accounting for model variance).*

**Validates**: Requirement 10.4

**Implementation Pattern**: Evaluate same media file twice, verify score reproducibility within tolerance.

#### Property 13: Audit Trail Temporal Consistency

**Definition**: *For any submission, if it is created at timestamp T1 and re-evaluated at timestamp T2, both AuditLog entries SHALL exist with T1 < T2; historical records SHALL always be accessible and distinguishable from current records.*

**Validates**: Requirement 11.1

**Implementation Pattern**: Create submission, re-evaluate, query audit trail, verify temporal ordering and versioning.

#### Property 14: Fallback Transition Without Data Loss

**Definition**: *For any submission evaluation failure on primary AI provider, fallback to secondary provider SHALL occur without losing submission data, score fields, or audit trail; all intermediate attempts SHALL be logged.*

**Validates**: Requirement 10.3

**Implementation Pattern**: Inject primary provider failure, verify fallback succeeds and audit trail shows both attempts.

---

## Testing Strategy

### Dual Testing Approach

**Property-Based Tests** (14 properties listed above):
- Minimum 100 iterations per property
- Use fast-check (JavaScript) or Hypothesis (Python) generators
- Tag format: `Feature: ai-awards-creativity, Property {N}: [Description]`
- Running time: ~30 seconds per property test (parallel execution: ~2-3 minutes total)

**Example-Based Unit Tests**:
- Specific scenarios (invalid formats, missing fields, edge cases)
- Error conditions and fallback mechanisms
- State transitions and side effects
- Count: ~40-50 unit tests

**Integration Tests**:
- Jira API polling with mock API server
- AI provider fallback with service unavailable simulation
- End-to-end award calculation workflow
- Notification delivery with mock service
- Database consistency under concurrent operations
- Count: ~20-30 integration tests

**Performance Tests**:
- Submission detection: 1,000 tasks in < 5 minutes
- Award calculation: 500 submissions in < 2 minutes
- Leaderboard query: 100 concurrent users in < 3 seconds
- Dashboard export: 2,000 records in < 10 seconds

### Test Coverage

| Component | Unit Tests | Property Tests | Integration Tests |
|-----------|-----------|-----------------|------------------|
| Score Calculation | 5 | 1 (Property 1) | - |
| Winner Selection | 8 | 2 (Properties 2, 3) | - |
| Leaderboard | 10 | 2 (Properties 4, 5) | 3 |
| Filter & Categories | 6 | 1 (Property 6) | 2 |
| Data Integrity | 12 | 2 (Properties 7, 13) | 5 |
| Notifications | 8 | 1 (Property 8) | 3 |
| Export/Import | 15 | 4 (Properties 9, 10, 11, 14) | 4 |
| AI Fallback | 10 | 1 (Property 14) | 4 |
| **Total** | **74** | **14** | **21** |

### CI/CD Integration

```yaml
# Run property tests in CI pipeline
test:property-based:
  script:
    - npm run test:properties -- --iterations=100 --timeout=30s
  artifacts:
    - coverage/properties.xml
  duration: ~3 minutes

# Run full test suite
test:all:
  script:
    - npm run test:unit
    - npm run test:properties -- --iterations=100
    - npm run test:integration
  coverage_threshold: 85%
  duration: ~10-15 minutes
```



---

## Technology Recommendations

### Primary Technology Stack

**Backend**:
- **Runtime**: Node.js 18+ (aligns with existing VilPower stack)
- **Language**: TypeScript for type safety
- **Framework**: Express.js (existing)
- **Job Scheduler**: node-cron or Bull (for queue-based tasks)
- **AI Vision API**: Google Cloud Vision API (free tier: 1,000 calls/month)
- **Database**: PostgreSQL (existing) with Audit triggers, or Firebase Firestore
- **Cache**: Redis (for leaderboard, dashboard, stats caching)
- **Message Queue**: Bull or AWS SQS for evaluation queue

**Testing**:
- **Unit Tests**: Jest with fast-check for property-based testing
- **Integration**: Supertest for API testing
- **Property Testing**: fast-check (JavaScript property-based testing library)
- **Coverage**: nyc (minimum 85% coverage)

**Deployment**:
- **CI/CD**: GitHub Actions (existing) or similar
- **Containerization**: Docker for consistent environment
- **Hosting**: Vercel (for frontend), Cloud Run or similar for backend

### AI Vision Model Selection

**Primary**: Google Cloud Vision API
- Free tier: 1,000 requests/month
- Supported formats: JPEG, PNG, GIF, WebP (images), video files via Video Intelligence API
- Evaluation categories: Color properties, composition analysis, content analysis
- Pricing: ~$1.50 per 1,000 requests above free tier

**Secondary/Fallback**: Azure Computer Vision API
- Free tier: 20 requests per minute, 5,000 per month
- Supported formats: JPEG, PNG, BMP, GIF, WebP
- Evaluation: Image analysis, object detection
- Pricing: Similar to Google, enterprise discounts available

**Alternative (Open Source)**: CLIP (OpenAI) or open-source vision models
- Local hosting required, more infrastructure cost
- Better for privacy-sensitive scenarios

---

## Implementation Phases

### Phase 1: Core Infrastructure (Weeks 1-2)
- Data models and database schema
- Submission Detector service
- Basic API endpoints for submissions
- Firebase/database setup
- Audit logging foundation

### Phase 2: AI Integration (Weeks 3-4)
- AI Evaluation Pipeline implementation
- Primary and fallback provider setup
- Score calculation and storage
- Error handling and retry logic

### Phase 3: Award Calculation (Weeks 5-6)
- Award Calculator implementation
- Weekly and monthly scheduling
- Tiebreaker logic
- Notification integration

### Phase 4: UI and Dashboards (Weeks 7-8)
- Leaderboard views
- Dashboard implementation
- Jira task integration and badges
- Report export functionality

### Phase 5: Testing and Optimization (Weeks 9-10)
- Comprehensive test suite (unit, property, integration)
- Performance testing and optimization
- Security audit and compliance
- Documentation and training

---

## Known Limitations and Future Enhancements

### Current Limitations
- Single-instance Award Calculator (no distributed calculation)
- No ML model training/fine-tuning (uses pre-trained Google Vision)
- Fixed AI weights (35/35/30) not user-configurable
- Leaderboard limited to 100 top performers for performance

### Future Enhancements
- Custom AI model fine-tuning on company's creative style
- Configurable award weights and scoring formulas
- Predictive insights (who's on track to win)
- Team/department competitions
- Historical trend analysis with ML predictions
- Mobile app for award notifications
- Integration with Slack, Teams, Discord for notifications
- Social recognition badges and profiles

---

## Success Metrics

**Adoption**:
- 80%+ of team members have at least one submission within 90 days
- Leaderboard viewed by 50%+ of team members weekly
- Average engagement time on dashboard: 3+ minutes per visit

**Quality**:
- All property tests pass with 100+ iterations
- Test coverage: ≥ 85% for core logic
- Zero audit trail integrity issues detected
- AI model consistency: ±2 point variance on re-evaluation

**Performance**:
- Submission detection: < 5 minutes for 1,000 tasks
- Award calculation: < 2 minutes for 500 submissions
- Leaderboard load: < 3 seconds for 100 concurrent users
- Data export: < 10 seconds for 2,000 records

**Business**:
- Increase in team morale/engagement survey scores
- Measurable improvement in creative output quality
- Reduced attrition in creative departments
- Positive ROI from increased productivity

---

## Conclusion

The AI Awards for Creativity Recognition system is a comprehensive, well-integrated feature that leverages AI vision models to fairly and objectively recognize creative excellence within the team. The design emphasizes:

1. **Fairness**: AI-based evaluation with transparent scoring and deterministic tiebreaking
2. **Transparency**: Complete audit trails and historical records for verification
3. **Reliability**: Fallback mechanisms, retry logic, and error handling
4. **Integration**: Seamless connection with Jira workflow and existing systems
5. **Scalability**: Caching, indexing, and performance optimization for growth
6. **Correctness**: Property-based testing and mathematical verification of core logic

The system is ready to move to the implementation phase following stakeholder approval of this design.

