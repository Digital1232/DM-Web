# TypeScript Type Definitions and Interfaces

This directory contains all type definitions, interfaces, and enums for the AI Awards for Creativity Recognition system.

## Overview

The type system is organized into logical modules, each covering a specific domain of the system:

- **media.ts**: Media types, formats, and validation
- **evaluation.ts**: AI evaluation, scores, and scoring logic
- **submission.ts**: Submission records and tracking
- **award.ts**: Awards, categories, and recognition
- **audit.ts**: Audit trails and compliance logging
- **stats.ts**: Statistics, leaderboards, and aggregations
- **dto.ts**: API request/response contracts
- **index.ts**: Central export point for all types

## Key Type Definitions

### Media Types (media.ts)

```typescript
// Supported media formats
export enum VideoFormat { MP4, MOV, WEBM }
export enum PosterFormat { PNG, JPG, SVG }
export enum MediaType { VIDEO, POSTER }

// Media file information
export interface MediaFile {
  fileName: string;
  format: string;
  fileSize: number;
  storageUrl: string;
  // ...
}
```

### Evaluation Types (evaluation.ts)

```typescript
// Evaluation status tracking
export enum EvaluationStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EVALUATION_FAILED = 'evaluation_failed'
}

// Core scoring function
export function calculateCreativityScore(subscores: EvaluationSubscores): number {
  // Formula: (Composition × 0.35) + (Color Theory × 0.35) + (Balance × 0.30)
  // Returns: [0-100] with rounding tolerance
}
```

**Weights (Requirement 2.4):**
- Composition: 0.35
- Color Theory: 0.35
- Balance: 0.30

### Submission Types (submission.ts)

```typescript
export enum SubmissionStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED_JIRA = 'deleted_jira'
}

export interface Submission {
  // Identifiers
  id: string;
  submissionId: string;
  
  // Source Information
  jiraTaskId: string;
  jiraTaskKey: string;
  submissionTimestamp: number;
  
  // Team Member Information
  teamMemberId: string;
  teamMemberName: string;
  departmentId?: string;
  
  // Media Information
  mediaType: MediaType;
  media: MediaFile;
  
  // Evaluation Information
  evaluationStatus: EvaluationStatus;
  aiModelVersion: string;
  evaluationTimestamp?: number;
  
  // Creativity Scores
  compositionScore?: number;
  colorTheoryScore?: number;
  balanceScore?: number;
  creativityScore?: number;
  
  // Metadata
  status: SubmissionStatus;
  version: number;
  createdAt: number;
  updatedAt: number;
  
  // Error Tracking
  evaluationErrors?: MediaValidationError[];
  retryCount: number;
  nextRetryAt?: number;
}
```

### Award Types (award.ts)

```typescript
export enum AwardType {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly'
}

export enum AwardCategory {
  BEST_VIDEO = 'Best_Video',
  BEST_POSTER = 'Best_Poster',
  BEST_VIDEO_POSTER_CONTENT = 'Best_Video_Poster_Content'
}

export enum AwardStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  REVOKED = 'revoked'
}

export interface Award {
  // Identifiers
  id: string;
  awardId: string;
  
  // Award Information
  type: AwardType;
  category: AwardCategory;
  
  // Period Information
  period: AwardPeriod;
  
  // Winner Information
  winnerId: string;
  winnerName: string;
  winnerDepartment?: string;
  
  // Submission Reference
  submissionId: string;
  jiraTaskId: string;
  
  // Award Metrics
  creativityScore: number;
  compositionScore: number;
  colorTheoryScore: number;
  balanceScore: number;
  
  // Ranking
  rankInPeriod: number;
  totalContestants: number;
  
  // Calculation Information
  calculationTimestamp: number;
  tiebreaker: 'no_tie' | 'earlier_submission';
  
  // Metadata
  status: AwardStatus;
  notificationSent: boolean;
  notificationTimestamp?: number;
  createdAt: number;
  updatedAt: number;
}

// Helper functions
export function getCategoriesForMediaType(mediaType: string): AwardCategory[]
export function getEnabledCategories(): AwardCategory[]
```

### Audit Types (audit.ts)

```typescript
export enum AuditEventType {
  SUBMISSION_CREATED = 'submission_created',
  SUBMISSION_EVALUATED = 'submission_evaluated',
  SUBMISSION_RE_EVALUATED = 'submission_re_evaluated',
  SUBMISSION_FAILED = 'submission_failed',
  SUBMISSION_ARCHIVED = 'submission_archived',
  AWARD_CALCULATED = 'award_calculated',
  AWARD_NOTIFIED = 'award_notified',
  AWARD_REVOKED = 'award_revoked',
  // ...
}

export interface AuditLog {
  id: string;
  correlationId: string;
  eventType: AuditEventType;
  entityType: AuditEntityType;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  changeDetails?: Record<string, unknown>;
  actorId: string;
  actorType: AuditActorType;
  timestamp: number;
  sourceSystem: string;
  context?: Record<string, unknown>;
  version: number;
  immutable: boolean;
}
```

### Statistics Types (stats.ts)

```typescript
export interface TeamMemberStats {
  userId: string;
  userName: string;
  periodType: 'week' | 'month' | 'all-time';
  
  // Award Counts
  weeklyAwards: number;
  monthlyAwards: number;
  totalAwards: number;
  
  // Score Statistics
  submissionCount: number;
  averageCreativityScore: number;
  highestCreativityScore: number;
  lowestCreativityScore: number;
  
  // Category Breakdown
  awardsByCategory: Record<string, number>;
  
  // Leaderboard Position
  overallRank: number;
  weeklyRank?: number;
  monthlyRank?: number;
  
  // Cache Metadata
  lastUpdated: number;
  expiresAt?: number;
  cacheVersion: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  totalAwards: number;
  weeklyAwards: number;
  monthlyAwards: number;
  highestCreativityScore: number;
  averageCreativityScore: number;
  submissionCount: number;
  awardsByCategory: Record<string, number>;
  lastAwardDate?: number;
}

// Cache management
export const CACHE_TTL = {
  LEADERBOARD: 60 * 60,           // 1 hour
  TEAM_MEMBER_STATS: 24 * 60 * 60, // 24 hours
  DASHBOARD_METRICS: 2 * 60 * 60, // 2 hours
  SUBMISSION_SCORES: 30 * 24 * 60 * 60 // 30 days
};

export function buildLeaderboardCacheKey(options: LeaderboardQueryOptions): string
export function buildTeamMemberStatsCacheKey(...): string
```

### DTOs (Data Transfer Objects) (dto.ts)

DTOs define the API request/response contracts:

#### Submission DTOs
```typescript
export interface SubmissionResponseDTO { /* ... */ }
export interface PaginatedSubmissionsResponseDTO { /* ... */ }
```

#### Award DTOs
```typescript
export interface AwardResponseDTO { /* ... */ }
export interface PaginatedAwardsResponseDTO { /* ... */ }
```

#### Leaderboard DTOs
```typescript
export interface LeaderboardRequestDTO { /* ... */ }
export interface LeaderboardResponseDTO { /* ... */ }
export interface TeamMemberStatsResponseDTO { /* ... */ }
```

#### Dashboard DTOs
```typescript
export interface DashboardRequestDTO { /* ... */ }
export interface DashboardResponseDTO { /* ... */ }
```

#### Report DTOs
```typescript
export interface ReportExportRequestDTO { /* ... */ }
export interface ReportExportResponseDTO { /* ... */ }
export interface JSONExportDataDTO { /* ... */ }
```

#### Error and Success DTOs
```typescript
export interface ErrorResponseDTO { /* ... */ }
export interface ValidationErrorResponseDTO { /* ... */ }
export interface NotFoundErrorResponseDTO { /* ... */ }
export interface SuccessResponseDTO<T> { /* ... */ }
export interface PaginatedSuccessResponseDTO<T> { /* ... */ }
```

## Usage Examples

### Importing Types

```typescript
// Import specific types
import { 
  Submission, 
  SubmissionStatus, 
  MediaType 
} from './types';

// Import all types
import * as Types from './types';
```

### Creating a Submission

```typescript
const submission: Submission = {
  id: 'SUB-2026-07-001',
  submissionId: 'SUB-2026-07-001',
  jiraTaskId: 'TASK-123',
  jiraTaskKey: 'PROJ-456',
  submissionTimestamp: Date.now(),
  teamMemberId: 'user@email.com',
  teamMemberName: 'John Doe',
  departmentId: 'marketing',
  mediaType: MediaType.VIDEO,
  media: {
    fileName: 'campaign_video.mp4',
    format: 'mp4',
    fileSize: 524288000,
    storageUrl: 'gs://bucket/path/to/file',
    uploadTimestamp: Date.now()
  },
  evaluationStatus: EvaluationStatus.PENDING,
  aiModelVersion: 'vision-api-v1.0',
  status: SubmissionStatus.ACTIVE,
  version: 1,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  retryCount: 0
};
```

### Calculating Creativity Score

```typescript
import { calculateCreativityScore } from './types';

const subscores = {
  composition: 85,
  colorTheory: 78,
  balance: 82
};

const creativityScore = calculateCreativityScore(subscores);
// Result: 81 (rounded from 81.15)
// Calculation: (85 × 0.35) + (78 × 0.35) + (82 × 0.30) = 81.15 ≈ 81
```

### Querying Leaderboard

```typescript
import { LeaderboardQueryOptions } from './types';

const options: LeaderboardQueryOptions = {
  period: 'week',
  sortBy: 'awards',
  category: AwardCategory.BEST_VIDEO,
  limit: 10,
  offset: 0
};
```

### Creating Audit Log Entry

```typescript
import { AuditLogCreateRequest, AuditEventType, AuditEntityType, AuditActorType } from './types';

const auditEntry: AuditLogCreateRequest = {
  eventType: AuditEventType.SUBMISSION_EVALUATED,
  entityType: AuditEntityType.SUBMISSION,
  entityId: 'SUB-2026-07-001',
  before: { evaluationStatus: 'pending' },
  after: { evaluationStatus: 'completed', creativityScore: 81 },
  actorId: 'system',
  actorType: AuditActorType.SYSTEM,
  sourceSystem: 'ai_evaluator',
  correlationId: 'CORR-2026-07-001'
};
```

## Constraints and Validation

### Media Constraints

```typescript
export const MEDIA_CONSTRAINTS = {
  VIDEO: {
    maxSizeBytes: 500 * 1024 * 1024, // 500MB
    maxDurationSeconds: 3600 // 1 hour
  },
  POSTER: {
    maxSizeBytes: 50 * 1024 * 1024 // 50MB
  }
};
```

### Creativity Score Constraints

- Valid range: [0, 100]
- All subscores must be in range [0, 100]
- Formula: (Composition × 0.35) + (Color Theory × 0.35) + (Balance × 0.30)
- Rounding tolerance: ±1 point

### Award Categories

Three predefined categories (cannot be deleted):
1. **BEST_VIDEO**: Video submissions only
2. **BEST_POSTER**: Poster submissions only
3. **BEST_VIDEO_POSTER_CONTENT**: Both video and poster submissions

### Evaluation Status Values

- `pending`: Awaiting evaluation
- `processing`: Currently being evaluated
- `completed`: Evaluation finished with scores
- `failed`: Evaluation failed, awaiting retry
- `evaluation_failed`: Permanent failure

## Requirements Mapping

The types implement all requirements from the specification:

- **Requirement 1**: Submission detection, `Submission`, `SubmissionStatus`
- **Requirement 2**: AI evaluation, `EvaluationResult`, `calculateCreativityScore`
- **Requirement 3**: Weekly awards, `Award`, `AwardType.WEEKLY`
- **Requirement 4**: Monthly awards, `Award`, `AwardType.MONTHLY`
- **Requirement 5**: Award categories, `AwardCategory`, `AWARD_CATEGORY_CONFIGS`
- **Requirement 6**: Leaderboard, `LeaderboardEntry`, `TeamMemberStats`
- **Requirement 7**: Dashboard, `DashboardMetrics`, `DashboardSummary`
- **Requirement 8**: Jira integration, `Submission.jiraTaskId`, `Award.jiraTaskId`
- **Requirement 9**: Notifications, `AwardNotificationDTO`
- **Requirement 10**: AI model integration, `AIProviderConfig`, `AIModelVersion`
- **Requirement 11**: Audit trail, `AuditLog`, `AuditEventType`
- **Requirement 12**: Performance, cache types, TTL configuration
- **Requirement 13**: Data export, `JSONExportDataDTO`, export DTOs
- **Requirement 14**: Parser requirements, parser types in service layer

## Next Steps

1. **Implement Services**: Create service classes that use these types
2. **Create Repositories**: Implement data access layer with these types
3. **Build APIs**: Create Express routes using request/response DTOs
4. **Add Tests**: Write unit and property-based tests using these types
5. **Database Schema**: Map types to database tables and indexes

## File Organization

```
src/
├── types/
│   ├── media.ts           # Media types and formats
│   ├── evaluation.ts      # Evaluation and scoring
│   ├── submission.ts      # Submission records
│   ├── award.ts           # Awards and categories
│   ├── audit.ts           # Audit logging
│   ├── stats.ts           # Statistics and leaderboards
│   ├── dto.ts             # API data transfer objects
│   ├── index.ts           # Central export point
│   └── README.md          # This file
├── services/              # Implementation layer (to be created)
├── repositories/          # Data access layer (to be created)
├── controllers/           # API endpoints (to be created)
└── ...
```

## References

- Requirements: `.kiro/specs/ai-awards-creativity/requirements.md`
- Design: `.kiro/specs/ai-awards-creativity/design.md`
- Tasks: `.kiro/specs/ai-awards-creativity/tasks.md`
