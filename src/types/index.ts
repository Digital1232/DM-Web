/**
 * Type definitions and interfaces for AI Awards for Creativity Recognition system
 * 
 * This module exports all types, interfaces, enums, and utility functions
 * used throughout the system for type safety and consistency.
 */

// ============================================================================
// MEDIA TYPES
// ============================================================================

export {
  VideoFormat,
  PosterFormat,
  MediaType,
  VALID_MEDIA_FORMATS,
  MediaFile,
  MediaValidationError,
  MEDIA_CONSTRAINTS
} from './media';

// ============================================================================
// EVALUATION TYPES
// ============================================================================

export {
  EvaluationStatus,
  EvaluationSubscores,
  EvaluationResult,
  EvaluationError,
  CREATIVITY_SCORE_WEIGHTS,
  AIProviderConfig,
  AIModelVersion,
  AIEvaluationRequest,
  AIEvaluationResponse,
  calculateCreativityScore,
  validateSubscores
} from './evaluation';

// ============================================================================
// SUBMISSION TYPES
// ============================================================================

export {
  SubmissionStatus,
  Submission,
  SubmissionCreateRequest,
  SubmissionEvaluationRequest,
  SubmissionEvaluationResponse,
  SubmissionFilterCriteria,
  SubmissionQueryResult,
  TeamMemberSubmissionStats
} from './submission';

// ============================================================================
// AWARD TYPES
// ============================================================================

export {
  AwardType,
  AwardCategory,
  AwardStatus,
  AwardPeriod,
  Award,
  AwardCreateRequest,
  AwardCalculationResult,
  AwardCalculationError,
  AwardFilterCriteria,
  AwardQueryResult,
  AwardSummary,
  AwardCategoryConfig,
  AWARD_CATEGORY_CONFIGS,
  getCategoriesForMediaType,
  getEnabledCategories
} from './award';

// ============================================================================
// AUDIT TYPES
// ============================================================================

export {
  AuditEventType,
  AuditEntityType,
  AuditActorType,
  AuditLog,
  AuditLogCreateRequest,
  AuditLogFilterCriteria,
  AuditLogQueryResult,
  AuditTrailReport,
  AuditSummary,
  AuditComplianceReport
} from './audit';

// ============================================================================
// STATISTICS AND LEADERBOARD TYPES
// ============================================================================

export {
  TeamMemberStats,
  LeaderboardEntry,
  LeaderboardQueryOptions,
  LeaderboardResult,
  TeamMemberDetailedStats,
  DashboardSummary,
  ScoreDistribution,
  TrendDataPoint,
  DashboardMetrics,
  buildLeaderboardCacheKey,
  buildTeamMemberStatsCacheKey,
  CACHE_TTL
} from './stats';

// ============================================================================
// DATA TRANSFER OBJECTS
// ============================================================================

export {
  // Submission DTOs
  SubmissionResponseDTO,
  PaginatedSubmissionsResponseDTO,
  
  // Award DTOs
  AwardResponseDTO,
  PaginatedAwardsResponseDTO,
  
  // Leaderboard DTOs
  LeaderboardRequestDTO,
  LeaderboardEntryResponseDTO,
  LeaderboardResponseDTO,
  TeamMemberStatsResponseDTO,
  
  // Dashboard DTOs
  DashboardRequestDTO,
  ScoreDistributionResponseDTO,
  TrendDataPointResponseDTO,
  DashboardResponseDTO,
  
  // Report DTOs
  ReportExportRequestDTO,
  ReportExportResponseDTO,
  JSONExportDataDTO,
  
  // Error DTOs
  ErrorResponseDTO,
  ValidationErrorResponseDTO,
  NotFoundErrorResponseDTO,
  
  // Success DTOs
  SuccessResponseDTO,
  PaginatedSuccessResponseDTO,
  
  // Notification DTOs
  AwardNotificationDTO,
  
  // Health Check DTOs
  HealthCheckResponseDTO
} from './dto';
