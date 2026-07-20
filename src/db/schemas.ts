/**
 * Database Schema Definitions
 * Defines the structure and constraints for all Firestore collections
 * Used for validation, documentation, and migration purposes
 */

import { Submission, Award, AuditLog, MediaType, AwardType, AwardCategory, EvaluationStatus, SubmissionStatus } from '../types/index';

/**
 * Submission Schema
 * Collection: submissions
 * Purpose: Stores all media submissions for creativity evaluation
 */
export const SUBMISSION_SCHEMA = {
  collection: 'submissions',
  docId: 'SUB-{timestamp}-{random}',
  fields: {
    id: {
      type: 'string',
      description: 'Unique submission identifier',
      required: true,
      indexed: true,
    },
    submissionId: {
      type: 'string',
      description: 'Alias for id, used for consistency',
      required: true,
      indexed: true,
    },
    jiraTaskId: {
      type: 'string',
      description: 'Source Jira task identifier',
      required: true,
      indexed: true,
    },
    jiraTaskKey: {
      type: 'string',
      description: 'Full Jira task key (e.g., PROJ-456)',
      required: false,
    },
    submissionTimestamp: {
      type: 'timestamp',
      description: 'When the media was submitted',
      required: true,
      indexed: true,
    },
    teamMemberId: {
      type: 'string',
      description: 'User ID of the creator (typically email)',
      required: true,
      indexed: true,
    },
    teamMemberName: {
      type: 'string',
      description: 'Display name of the creator',
      required: false,
    },
    departmentId: {
      type: 'string',
      description: 'Department classification',
      required: false,
    },
    mediaType: {
      type: 'enum',
      enum: Object.values(MediaType),
      description: 'Type of media (video or poster)',
      required: true,
      indexed: true,
    },
    mediaFormat: {
      type: 'string',
      description: 'File format (mp4, mov, webm, png, jpg, svg)',
      required: true,
    },
    mediaFileName: {
      type: 'string',
      description: 'Original filename',
      required: true,
    },
    mediaFileSize: {
      type: 'number',
      description: 'File size in bytes',
      required: true,
    },
    mediaStorageUrl: {
      type: 'string',
      description: 'Cloud storage URL for the media file',
      required: true,
    },
    mediaThumbnailUrl: {
      type: 'string',
      description: 'Cloud storage URL for thumbnail preview',
      required: false,
    },
    evaluationStatus: {
      type: 'enum',
      enum: Object.values(EvaluationStatus),
      description: 'Current evaluation state (pending, processing, completed, failed)',
      required: true,
      indexed: true,
    },
    aiModelVersion: {
      type: 'string',
      description: 'AI model version used for evaluation',
      required: false,
    },
    evaluationTimestamp: {
      type: 'timestamp',
      description: 'When evaluation was completed',
      required: false,
    },
    compositionScore: {
      type: 'number',
      min: 0,
      max: 100,
      description: 'Composition score (0-100)',
      required: false,
    },
    colorTheoryScore: {
      type: 'number',
      min: 0,
      max: 100,
      description: 'Color theory score (0-100)',
      required: false,
    },
    balanceScore: {
      type: 'number',
      min: 0,
      max: 100,
      description: 'Balance score (0-100)',
      required: false,
    },
    creativityScore: {
      type: 'number',
      min: 0,
      max: 100,
      description: 'Final weighted average score',
      required: false,
      indexed: true,
    },
    status: {
      type: 'enum',
      enum: Object.values(SubmissionStatus),
      description: 'Submission status (active, archived, deleted_jira)',
      required: true,
      indexed: false,
    },
    version: {
      type: 'number',
      description: 'Version number for re-evaluations',
      required: true,
      default: 1,
    },
    createdAt: {
      type: 'timestamp',
      description: 'Submission creation timestamp',
      required: true,
    },
    updatedAt: {
      type: 'timestamp',
      description: 'Last update timestamp',
      required: true,
    },
    evaluationErrors: {
      type: 'array',
      description: 'Array of error objects if evaluation failed',
      required: false,
    },
    retryCount: {
      type: 'number',
      description: 'Number of retry attempts',
      required: false,
      default: 0,
    },
    nextRetryAt: {
      type: 'timestamp',
      description: 'Timestamp for next retry attempt',
      required: false,
    },
  },
  indexes: [
    { fields: ['submissionTimestamp', 'status'] },
    { fields: ['teamMemberId', 'submissionTimestamp'] },
    { fields: ['evaluationStatus', 'submissionTimestamp'] },
    { fields: ['jiraTaskId', 'submissionTimestamp'] },
    { fields: ['mediaType', 'creativityScore'] },
  ],
};

/**
 * Award Schema
 * Collection: awards
 * Purpose: Stores all awarded recognitions
 */
export const AWARD_SCHEMA = {
  collection: 'awards',
  docId: 'AWARD-{periodType}-{period}-{category}',
  fields: {
    id: {
      type: 'string',
      description: 'Unique award identifier',
      required: true,
      indexed: true,
    },
    awardId: {
      type: 'string',
      description: 'Alias for id, used for consistency',
      required: true,
      indexed: true,
    },
    awardType: {
      type: 'enum',
      enum: Object.values(AwardType),
      description: 'Award type (weekly or monthly)',
      required: true,
      indexed: true,
    },
    awardCategory: {
      type: 'enum',
      enum: Object.values(AwardCategory),
      description: 'Award category',
      required: true,
      indexed: true,
    },
    periodType: {
      type: 'string',
      enum: ['week', 'month'],
      description: 'Period type',
      required: true,
    },
    periodYear: {
      type: 'number',
      description: 'Period year (ISO year)',
      required: true,
    },
    periodMonth: {
      type: 'number',
      description: 'Period month (1-12)',
      required: false,
    },
    periodWeek: {
      type: 'number',
      description: 'Period week (ISO week number)',
      required: false,
    },
    periodStart: {
      type: 'string',
      description: 'Period start date (ISO 8601)',
      required: true,
      indexed: true,
    },
    periodEnd: {
      type: 'string',
      description: 'Period end date (ISO 8601)',
      required: true,
    },
    winnerId: {
      type: 'string',
      description: 'Award winner user ID',
      required: true,
      indexed: true,
    },
    winnerName: {
      type: 'string',
      description: 'Winner display name',
      required: false,
    },
    winnerDepartment: {
      type: 'string',
      description: 'Winner department',
      required: false,
    },
    submissionId: {
      type: 'string',
      description: 'Referenced submission ID',
      required: true,
      indexed: true,
    },
    jiraTaskId: {
      type: 'string',
      description: 'Source Jira task ID',
      required: true,
    },
    creativityScore: {
      type: 'number',
      min: 0,
      max: 100,
      description: 'Final creativity score',
      required: true,
    },
    compositionScore: {
      type: 'number',
      min: 0,
      max: 100,
      description: 'Composition subsccore',
      required: false,
    },
    colorTheoryScore: {
      type: 'number',
      min: 0,
      max: 100,
      description: 'Color theory subscore',
      required: false,
    },
    balanceScore: {
      type: 'number',
      min: 0,
      max: 100,
      description: 'Balance subscore',
      required: false,
    },
    rankInPeriod: {
      type: 'number',
      description: 'Rank in category for period (1st, 2nd, etc)',
      required: true,
    },
    totalContestants: {
      type: 'number',
      description: 'Total number of eligible submissions',
      required: false,
    },
    calculationTimestamp: {
      type: 'timestamp',
      description: 'When award was calculated',
      required: true,
    },
    tiebreaker: {
      type: 'string',
      enum: ['no_tie', 'earlier_submission'],
      description: 'Tiebreaker rule applied (if any)',
      required: false,
    },
    status: {
      type: 'string',
      enum: ['active', 'archived', 'revoked'],
      description: 'Award status',
      required: true,
    },
    notificationSent: {
      type: 'boolean',
      description: 'Whether notification was sent to winner',
      required: true,
      default: false,
    },
    notificationTimestamp: {
      type: 'timestamp',
      description: 'When notification was sent',
      required: false,
    },
    createdAt: {
      type: 'timestamp',
      description: 'Award creation timestamp',
      required: true,
    },
    updatedAt: {
      type: 'timestamp',
      description: 'Last update timestamp',
      required: true,
    },
  },
  indexes: [
    { fields: ['periodStart', 'awardCategory'] },
    { fields: ['winnerId', 'createdAt'] },
    { fields: ['awardCategory', 'awardType', 'createdAt'] },
  ],
};

/**
 * Audit Log Schema
 * Collection: audit_logs
 * Purpose: Immutable append-only log of all system events
 */
export const AUDIT_LOG_SCHEMA = {
  collection: 'audit_logs',
  docId: 'AUDIT-{timestamp}-{random}',
  fields: {
    id: {
      type: 'string',
      description: 'Unique audit log ID',
      required: true,
      indexed: true,
    },
    eventType: {
      type: 'string',
      description: 'Type of event (submission_created, submission_evaluated, award_calculated, etc)',
      required: true,
      indexed: true,
    },
    entityType: {
      type: 'string',
      enum: ['submission', 'award', 'calculation', 'notification'],
      description: 'Type of entity being audited',
      required: true,
      indexed: true,
    },
    entityId: {
      type: 'string',
      description: 'ID of the entity being audited',
      required: true,
      indexed: true,
    },
    before: {
      type: 'object',
      description: 'Previous state (for updates)',
      required: false,
    },
    after: {
      type: 'object',
      description: 'New state',
      required: true,
    },
    changeDetails: {
      type: 'object',
      description: 'Additional details about the change',
      required: false,
    },
    actorId: {
      type: 'string',
      description: 'User ID or "system" for automated events',
      required: true,
    },
    actorType: {
      type: 'string',
      enum: ['user', 'system'],
      description: 'Actor type',
      required: true,
    },
    timestamp: {
      type: 'timestamp',
      description: 'When event occurred',
      required: true,
      indexed: true,
    },
    correlationId: {
      type: 'string',
      description: 'Correlation ID linking related audit events',
      required: false,
    },
    sourceSystem: {
      type: 'string',
      description: 'Which system made the change',
      required: true,
    },
    context: {
      type: 'object',
      description: 'Additional context information',
      required: false,
    },
  },
  indexes: [
    { fields: ['timestamp', 'eventType'] },
    { fields: ['entityType', 'entityId', 'timestamp'] },
  ],
  constraints: [
    'IMMUTABLE: No updates or deletes allowed after creation',
    'APPEND_ONLY: New entries created but never modified',
  ],
};

/**
 * Team Members Schema
 * Collection: team_members
 * Purpose: Stores team member information
 */
export const TEAM_MEMBER_SCHEMA = {
  collection: 'team_members',
  docId: 'User ID (email or UID)',
  fields: {
    id: {
      type: 'string',
      description: 'Team member user ID',
      required: true,
      indexed: true,
    },
    email: {
      type: 'string',
      description: 'Email address',
      required: true,
      indexed: true,
    },
    displayName: {
      type: 'string',
      description: 'Display name',
      required: true,
    },
    department: {
      type: 'string',
      description: 'Department assignment',
      required: false,
    },
    isActive: {
      type: 'boolean',
      description: 'Whether team member is active',
      required: true,
      default: true,
    },
    joinedAt: {
      type: 'timestamp',
      description: 'When joined the team',
      required: true,
    },
    updatedAt: {
      type: 'timestamp',
      description: 'Last update timestamp',
      required: true,
    },
  },
  indexes: [{ fields: ['email'] }, { fields: ['department'] }],
};

/**
 * Award Categories Schema
 * Collection: award_categories
 * Purpose: Stores predefined award categories
 */
export const AWARD_CATEGORY_SCHEMA = {
  collection: 'award_categories',
  docId: 'Category ID',
  fields: {
    id: {
      type: 'string',
      description: 'Category identifier',
      required: true,
      indexed: true,
    },
    name: {
      type: 'enum',
      enum: Object.values(AwardCategory),
      description: 'Category name',
      required: true,
    },
    displayName: {
      type: 'string',
      description: 'Human-readable category name',
      required: true,
    },
    description: {
      type: 'string',
      description: 'Category description',
      required: false,
    },
    mediaTypes: {
      type: 'array',
      description: 'Supported media types (video, poster, or both)',
      required: true,
    },
    enabled: {
      type: 'boolean',
      description: 'Whether category is enabled',
      required: true,
      default: true,
    },
    createdAt: {
      type: 'timestamp',
      description: 'Creation timestamp',
      required: true,
    },
  },
};

/**
 * Notifications Schema
 * Collection: notifications/{userId}/{notificationId}
 * Purpose: Stores in-app notifications for users
 */
export const NOTIFICATION_SCHEMA = {
  collection: 'notifications/{userId}',
  docId: 'NOTIF-{timestamp}-{random}',
  fields: {
    id: {
      type: 'string',
      description: 'Notification ID',
      required: true,
    },
    type: {
      type: 'string',
      enum: ['award', 'submission_evaluated', 'report_ready', 'system'],
      description: 'Notification type',
      required: true,
    },
    title: {
      type: 'string',
      description: 'Notification title',
      required: true,
    },
    message: {
      type: 'string',
      description: 'Notification message',
      required: true,
    },
    awardId: {
      type: 'string',
      description: 'Reference to award (if award-related)',
      required: false,
    },
    submissionId: {
      type: 'string',
      description: 'Reference to submission (if submission-related)',
      required: false,
    },
    metadata: {
      type: 'object',
      description: 'Additional notification metadata',
      required: false,
    },
    read: {
      type: 'boolean',
      description: 'Whether notification has been read',
      required: true,
      default: false,
    },
    readAt: {
      type: 'timestamp',
      description: 'When notification was read',
      required: false,
    },
    createdAt: {
      type: 'timestamp',
      description: 'Creation timestamp',
      required: true,
    },
    expiresAt: {
      type: 'timestamp',
      description: 'Expiration timestamp (auto-delete)',
      required: false,
    },
  },
};

/**
 * Initialize all schemas
 * This documentation serves as the authoritative source for data structure
 */
export const ALL_SCHEMAS = [
  SUBMISSION_SCHEMA,
  AWARD_SCHEMA,
  AUDIT_LOG_SCHEMA,
  TEAM_MEMBER_SCHEMA,
  AWARD_CATEGORY_SCHEMA,
  NOTIFICATION_SCHEMA,
];

export default ALL_SCHEMAS;
