/**
 * Data Transfer Objects (DTOs)
 * Defines request and response contracts for API endpoints
 */

import { Award, AwardCategory, AwardType } from './award';
import { Submission } from './submission';
import { EvaluationResult } from './evaluation';
import { LeaderboardEntry } from './stats';

// ============================================================================
// SUBMISSION API DTOs
// ============================================================================

/**
 * Response DTO for submission detail
 */
export interface SubmissionResponseDTO {
  id: string;
  jiraTaskId: string;
  teamMemberId: string;
  teamMemberName: string;
  mediaType: string;
  mediaFileName: string;
  submissionTimestamp: number;
  status: string;
  evaluationStatus: string;
  creativityScore?: number;
  compositionScore?: number;
  colorTheoryScore?: number;
  balanceScore?: number;
  evaluatedAt?: number;
}

/**
 * Paginated response DTO for submissions
 */
export interface PaginatedSubmissionsResponseDTO {
  data: SubmissionResponseDTO[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  timestamp: number;
}

// ============================================================================
// AWARD API DTOs
// ============================================================================

/**
 * Response DTO for award detail
 */
export interface AwardResponseDTO {
  id: string;
  type: AwardType;
  category: AwardCategory;
  winnerId: string;
  winnerName: string;
  submissionId: string;
  jiraTaskId: string;
  creativityScore: number;
  compositionScore: number;
  colorTheoryScore: number;
  balanceScore: number;
  period: {
    type: 'week' | 'month';
    start: string; // ISO 8601
    end: string; // ISO 8601
  };
  rankInPeriod: number;
  totalContestants: number;
  notificationSent: boolean;
  createdAt: number;
}

/**
 * Paginated response DTO for awards
 */
export interface PaginatedAwardsResponseDTO {
  data: AwardResponseDTO[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  timestamp: number;
}

// ============================================================================
// LEADERBOARD API DTOs
// ============================================================================

/**
 * Request DTO for leaderboard query
 */
export interface LeaderboardRequestDTO {
  period?: 'week' | 'month' | 'all-time';
  sortBy?: 'awards' | 'highest-score' | 'submission-count';
  category?: AwardCategory;
  limit?: number;
  offset?: number;
  mediaType?: 'video' | 'poster';
}

/**
 * Response DTO for leaderboard entry
 */
export interface LeaderboardEntryResponseDTO {
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
}

/**
 * Response DTO for leaderboard
 */
export interface LeaderboardResponseDTO {
  rankings: LeaderboardEntryResponseDTO[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  period: string;
  sortedBy: string;
  timestamp: number;
  generatedAt: number;
}

/**
 * Response DTO for detailed team member stats
 */
export interface TeamMemberStatsResponseDTO {
  userId: string;
  userName: string;
  rank: number;
  totalAwards: number;
  weeklyAwards: number;
  monthlyAwards: number;
  categoryBreakdown: Record<string, number>;
  averageScore: number;
  highestScore: number;
  submissionCount: number;
  topSubmissions: Array<{
    id: string;
    mediaType: string;
    creativityScore: number;
    submissionTimestamp: number;
  }>;
  recentAwards: Array<{
    awardId: string;
    category: string;
    creativityScore: number;
    timestamp: number;
  }>;
  timestamp: number;
}

// ============================================================================
// DASHBOARD API DTOs
// ============================================================================

/**
 * Request DTO for dashboard query
 */
export interface DashboardRequestDTO {
  period?: 'week' | 'month' | 'quarter' | 'year';
  category?: AwardCategory;
  teamMember?: string;
  department?: string;
  mediaType?: 'video' | 'poster';
}

/**
 * Response DTO for score distribution
 */
export interface ScoreDistributionResponseDTO {
  buckets: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
  mean: number;
  median: number;
}

/**
 * Response DTO for trend data
 */
export interface TrendDataPointResponseDTO {
  date: string; // ISO 8601
  submissions: number;
  averageScore: number;
  awards: number;
}

/**
 * Response DTO for dashboard
 */
export interface DashboardResponseDTO {
  summary: {
    totalSubmissions: number;
    averageCreativityScore: number;
    totalAwards: number;
    uniqueWinners: number;
  };
  topCreators: Array<{
    name: string;
    awardCount: number;
    highestScore: number;
  }>;
  scoreDistribution: ScoreDistributionResponseDTO;
  trends: TrendDataPointResponseDTO[];
  categoryBreakdown: Record<string, number>;
  generatedAt: number;
  timestamp: number;
}

// ============================================================================
// REPORT API DTOs
// ============================================================================

/**
 * Request DTO for report export
 */
export interface ReportExportRequestDTO {
  format: 'pdf' | 'csv' | 'json';
  period?: 'week' | 'month' | 'quarter' | 'year';
  category?: AwardCategory;
  includeDetails?: boolean;
}

/**
 * Response DTO for report export
 */
export interface ReportExportResponseDTO {
  downloadUrl: string;
  fileName: string;
  format: string;
  fileSize: number;
  generatedAt: number;
  expiresAt: number;
}

/**
 * JSON export data DTO
 */
export interface JSONExportDataDTO {
  exportMetadata: {
    timestamp: string; // ISO 8601
    dataVersion: string;
    recordCount: number;
    completeness: 'VERIFIED' | 'PARTIAL';
  };
  submissions: Array<{
    id: string;
    jiraTaskId: string;
    teamMemberId: string;
    mediaType: string;
    submissionTimestamp: string;
    creativityScore: number;
    compositionScore: number;
    colorTheoryScore: number;
    balanceScore: number;
    evaluationTimestamp: string;
  }>;
  awards: Array<{
    id: string;
    awardType: string;
    awardCategory: string;
    period: {
      type: string;
      start: string;
      end: string;
    };
    winnerId: string;
    submissionId: string;
    creativityScore: number;
  }>;
}

// ============================================================================
// ERROR RESPONSE DTOs
// ============================================================================

/**
 * Standard error response DTO
 */
export interface ErrorResponseDTO {
  status: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: number;
  path?: string;
}

/**
 * Validation error response DTO
 */
export interface ValidationErrorResponseDTO extends ErrorResponseDTO {
  code: 'VALIDATION_ERROR';
  errors: Array<{
    field: string;
    message: string;
    value?: unknown;
  }>;
}

/**
 * Not found error response DTO
 */
export interface NotFoundErrorResponseDTO extends ErrorResponseDTO {
  code: 'NOT_FOUND';
  resource: string;
  resourceId: string;
}

// ============================================================================
// SUCCESS RESPONSE DTOs
// ============================================================================

/**
 * Generic success response DTO
 */
export interface SuccessResponseDTO<T> {
  status: 200 | 201;
  code: string;
  message: string;
  data: T;
  timestamp: number;
}

/**
 * Paginated success response DTO
 */
export interface PaginatedSuccessResponseDTO<T> {
  status: 200;
  code: string;
  message: string;
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  timestamp: number;
}

// ============================================================================
// NOTIFICATION DTOs
// ============================================================================

/**
 * Award notification DTO
 */
export interface AwardNotificationDTO {
  notificationId: string;
  recipientId: string;
  recipientEmail: string;
  awardId: string;
  awardType: string;
  awardCategory: string;
  creativityScore: number;
  subscores: {
    composition: number;
    colorTheory: number;
    balance: number;
  };
  submissionDetails: {
    mediaType: string;
    submissionDate: string;
  };
  period: {
    start: string;
    end: string;
  };
  leaderboardUrl: string;
  sent: boolean;
  sentAt?: number;
}

// ============================================================================
// HEALTH CHECK DTOs
// ============================================================================

/**
 * Health check response DTO
 */
export interface HealthCheckResponseDTO {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  uptime: number; // seconds
  checks: {
    database: 'ok' | 'error';
    cache: 'ok' | 'error';
    ai_provider: 'ok' | 'error' | 'not_configured';
    notifications: 'ok' | 'error' | 'not_configured';
  };
  details?: Record<string, unknown>;
}
