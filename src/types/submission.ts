/**
 * Submission-related types and interfaces
 * Defines types for media submissions from Jira
 */

import { MediaType, MediaFile, MediaValidationError } from './media';
import { EvaluationStatus, EvaluationSubscores } from './evaluation';

/**
 * Status of a submission record
 */
export enum SubmissionStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED_JIRA = 'deleted_jira'
}

/**
 * Complete submission record
 * Based on design document Submission Record
 */
export interface Submission {
  // Identifiers
  id: string;
  submissionId: string; // Alias for consistency

  // Source Information
  jiraTaskId: string;
  jiraTaskKey: string;
  submissionTimestamp: number; // Unix milliseconds

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
  compositionScore?: number; // 0-100
  colorTheoryScore?: number; // 0-100
  balanceScore?: number; // 0-100
  creativityScore?: number; // Final: (C×0.35)+(CT×0.35)+(B×0.30)

  // Metadata
  status: SubmissionStatus;
  version: number; // For re-evaluations
  createdAt: number;
  updatedAt: number;

  // Error Tracking
  evaluationErrors?: MediaValidationError[];
  retryCount: number;
  nextRetryAt?: number;
}

/**
 * Submission creation request (from Jira detection)
 */
export interface SubmissionCreateRequest {
  jiraTaskId: string;
  jiraTaskKey: string;
  teamMemberId: string;
  teamMemberName: string;
  departmentId?: string;
  mediaType: MediaType;
  mediaFileName: string;
  mediaFormat: string;
  mediaFileSize: number;
  mediaStorageUrl: string;
  mediaThumbnailUrl?: string;
  uploadTimestamp: number;
  mediaHash?: string; // For duplicate detection
}

/**
 * Request to evaluate a submission
 */
export interface SubmissionEvaluationRequest {
  submissionId: string;
  mediaStorageUrl: string;
  mediaType: MediaType;
  mediaFormat: string;
  modelVersion: string;
}

/**
 * Response from evaluation
 */
export interface SubmissionEvaluationResponse {
  submissionId: string;
  status: EvaluationStatus;
  creativityScore?: number;
  subscores?: EvaluationSubscores;
  modelVersion: string;
  evaluationTimestamp: number;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Filter criteria for querying submissions
 */
export interface SubmissionFilterCriteria {
  teamMemberId?: string;
  mediaType?: MediaType;
  status?: SubmissionStatus;
  evaluationStatus?: EvaluationStatus;
  jiraTaskId?: string;
  createdAfter?: number;
  createdBefore?: number;
  minScore?: number;
  maxScore?: number;
}

/**
 * Query result for submissions
 */
export interface SubmissionQueryResult {
  submissions: Submission[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Statistics for a team member's submissions
 */
export interface TeamMemberSubmissionStats {
  teamMemberId: string;
  totalSubmissions: number;
  videoSubmissions: number;
  posterSubmissions: number;
  averageCreativityScore: number;
  highestCreativityScore: number;
  lowestCreativityScore: number;
  successfulEvaluations: number;
  failedEvaluations: number;
}
