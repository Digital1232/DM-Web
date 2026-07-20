/**
 * Evaluation-related types and interfaces
 * Defines types for AI evaluations, scores, and results
 */

/**
 * Status of submission evaluation
 */
export enum EvaluationStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EVALUATION_FAILED = 'evaluation_failed'
}

/**
 * Visual design evaluation dimensions
 */
export interface EvaluationSubscores {
  composition: number; // 0-100
  colorTheory: number; // 0-100
  balance: number; // 0-100
}

/**
 * Result of AI evaluation
 */
export interface EvaluationResult {
  submissionId: string;
  status: EvaluationStatus;
  subscores: EvaluationSubscores;
  creativityScore: number; // 0-100 (weighted average)
  modelVersion: string; // AI model version identifier
  evaluationTimestamp: number; // Unix milliseconds
  retryCount: number;
  nextRetryAt?: number; // For scheduled retries
  errors?: EvaluationError[];
}

/**
 * Evaluation error information
 */
export interface EvaluationError {
  code: string;
  message: string;
  timestamp: number;
  details?: Record<string, unknown>;
}

/**
 * Creativity score calculation weights
 * Based on requirement 2.4
 */
export const CREATIVITY_SCORE_WEIGHTS = {
  composition: 0.35,
  colorTheory: 0.35,
  balance: 0.30
};

/**
 * AI provider configuration
 */
export interface AIProviderConfig {
  name: string;
  apiKey: string;
  endpoint: string;
  timeout: number; // milliseconds
  rateLimitPerMinute?: number;
}

/**
 * AI model version tracking
 */
export interface AIModelVersion {
  provider: string; // e.g., "google_vision", "azure_computer_vision"
  version: string; // e.g., "v1.0", "20260721"
  releaseDate: string; // ISO 8601
  deprecated: boolean;
}

/**
 * AI evaluation request (internal)
 */
export interface AIEvaluationRequest {
  submissionId: string;
  mediaBuffer: Buffer;
  mediaType: 'video' | 'poster';
  modelVersion: string;
  timeout?: number;
}

/**
 * AI evaluation response (from model)
 */
export interface AIEvaluationResponse {
  compositionScore: number;
  colorTheoryScore: number;
  balanceScore: number;
  confidence?: number; // Optional confidence metric
  modelVersion: string;
  processingTimeMs?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Calculate creativity score from subscores
 * Formula: (Composition × 0.35) + (Color Theory × 0.35) + (Balance × 0.30)
 * Result should be in range [0, 100] with tolerance for rounding
 *
 * @param subscores The evaluation subscores
 * @returns Creativity score in range [0, 100]
 * @throws Error if subscores are out of valid range
 */
export function calculateCreativityScore(subscores: EvaluationSubscores): number {
  const { composition, colorTheory, balance } = subscores;

  // Validate subscores are in valid range
  if (composition < 0 || composition > 100 ||
      colorTheory < 0 || colorTheory > 100 ||
      balance < 0 || balance > 100) {
    throw new Error('All subscores must be in range [0, 100]');
  }

  const score =
    (composition * CREATIVITY_SCORE_WEIGHTS.composition) +
    (colorTheory * CREATIVITY_SCORE_WEIGHTS.colorTheory) +
    (balance * CREATIVITY_SCORE_WEIGHTS.balance);

  // Round to nearest integer
  const roundedScore = Math.round(score);

  // Ensure result is in valid range
  return Math.max(0, Math.min(100, roundedScore));
}

/**
 * Validate if subscores are in valid range
 */
export function validateSubscores(subscores: EvaluationSubscores): boolean {
  const { composition, colorTheory, balance } = subscores;
  return composition >= 0 && composition <= 100 &&
         colorTheory >= 0 && colorTheory <= 100 &&
         balance >= 0 && balance <= 100;
}
