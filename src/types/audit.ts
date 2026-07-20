/**
 * Audit trail types and interfaces
 * Defines types for immutable event logging and audit trails
 */

/**
 * Type of event in audit log
 */
export enum AuditEventType {
  SUBMISSION_CREATED = 'submission_created',
  SUBMISSION_EVALUATED = 'submission_evaluated',
  SUBMISSION_RE_EVALUATED = 'submission_re_evaluated',
  SUBMISSION_FAILED = 'submission_failed',
  SUBMISSION_ARCHIVED = 'submission_archived',
  AWARD_CALCULATED = 'award_calculated',
  AWARD_NOTIFIED = 'award_notified',
  AWARD_REVOKED = 'award_revoked',
  CALCULATION_ERROR = 'calculation_error',
  DATA_EXPORTED = 'data_exported',
  DATA_IMPORTED = 'data_imported'
}

/**
 * Type of entity being audited
 */
export enum AuditEntityType {
  SUBMISSION = 'submission',
  AWARD = 'award',
  CALCULATION = 'calculation',
  EXPORT = 'export',
  IMPORT = 'import'
}

/**
 * Type of actor making change
 */
export enum AuditActorType {
  SYSTEM = 'system',
  USER = 'user',
  ADMIN = 'admin'
}

/**
 * Complete audit log entry
 * Immutable append-only record
 */
export interface AuditLog {
  // Identifiers
  id: string;
  correlationId: string; // Links related audit events

  // Event Information
  eventType: AuditEventType;
  entityType: AuditEntityType;
  entityId: string; // ID of entity being audited

  // Change Data
  before?: Record<string, unknown>; // Previous state
  after?: Record<string, unknown>; // New state
  changeDetails?: Record<string, unknown>; // Additional change context

  // Actor Information
  actorId: string; // User ID or "system"
  actorType: AuditActorType;

  // Timestamp
  timestamp: number; // Unix milliseconds

  // Source Information
  sourceSystem: string; // Which system made change (e.g., "ai_evaluator", "award_calculator")
  ipAddress?: string; // For user-initiated changes
  userAgent?: string; // For user-initiated changes

  // Additional Context
  context?: Record<string, unknown>;

  // Metadata
  version: number; // Schema version
  immutable: boolean; // Flag indicating this record is immutable (always true)
}

/**
 * Request to create an audit log entry
 */
export interface AuditLogCreateRequest {
  eventType: AuditEventType;
  entityType: AuditEntityType;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  changeDetails?: Record<string, unknown>;
  actorId: string;
  actorType: AuditActorType;
  sourceSystem: string;
  ipAddress?: string;
  userAgent?: string;
  context?: Record<string, unknown>;
  correlationId?: string;
}

/**
 * Filter criteria for querying audit logs
 */
export interface AuditLogFilterCriteria {
  eventType?: AuditEventType;
  entityType?: AuditEntityType;
  entityId?: string;
  actorId?: string;
  actorType?: AuditActorType;
  sourceSystem?: string;
  correlationId?: string;
  timestampAfter?: number;
  timestampBefore?: number;
}

/**
 * Query result for audit logs
 */
export interface AuditLogQueryResult {
  logs: AuditLog[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Audit trail report for a specific entity
 */
export interface AuditTrailReport {
  entityType: AuditEntityType;
  entityId: string;
  timeline: AuditLog[];
  firstEvent: AuditLog;
  lastEvent: AuditLog;
  totalEvents: number;
  generatedAt: number;
}

/**
 * Audit summary statistics
 */
export interface AuditSummary {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByActor: Record<string, number>;
  timeRange: {
    earliest: number;
    latest: number;
  };
  generatedAt: number;
}

/**
 * Audit compliance report
 */
export interface AuditComplianceReport {
  period: {
    start: string; // ISO 8601
    end: string; // ISO 8601
  };
  summary: AuditSummary;
  dataIntegrity: {
    totalRecords: number;
    corruptedRecords: number;
    orphanedRecords: number; // Records with missing entity references
    status: 'verified' | 'warnings' | 'errors';
  };
  referentialIntegrity: {
    submissionsWithoutTeamMembers: number;
    awardsWithoutSubmissions: number;
    status: 'verified' | 'warnings' | 'errors';
  };
  generatedAt: number;
  reportedBy: string; // Admin user ID
}
