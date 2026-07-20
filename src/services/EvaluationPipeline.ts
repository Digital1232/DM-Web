/**
 * AI Evaluation Pipeline Module
 * 
 * Processes pending submissions through the AI evaluation workflow:
 * 1. Query Firebase submissions with status='pending_evaluation'
 * 2. Download media file (image or video thumbnail)
 * 3. Call Google Cloud Vision API
 * 4. Calculate creativity score using ScoreCalculator
 * 5. Update Firebase submission record with scores and status='evaluated'
 * 6. Log evaluation event
 * 
 * Requirements:
 * - Process sequentially (MVP: no concurrency)
 * - Handle failures by logging and moving to next submission
 * - Update Firebase with results
 * - Support mock scores for testing when API limit hit
 */

import axios, { AxiosError } from 'axios';
import { Logger } from '../utils/logger';
import { AIVisionClient } from './AIVisionClient';
import { ScoreCalculator } from './ScoreCalculator';
import { Submission } from '../types/submission';
import { EvaluationStatus, AIEvaluationRequest } from '../types/evaluation';

/**
 * Configuration for mock scoring (when API unavailable)
 */
interface MockScoreConfig {
  enabled: boolean;
  reason?: string;
}

/**
 * Result of a submission evaluation
 */
interface EvaluationPipelineResult {
  submissionId: string;
  success: boolean;
  compositionScore?: number;
  colorTheoryScore?: number;
  balanceScore?: number;
  creativityScore?: number;
  error?: string;
  usedMockScores?: boolean;
  processingTimeMs: number;
  timestamp: number;
}

/**
 * Statistics for pipeline execution
 */
interface PipelineExecutionStats {
  totalProcessed: number;
  successful: number;
  failed: number;
  results: EvaluationPipelineResult[];
  totalTimeMs: number;
  startTime: number;
  endTime: number;
}

/**
 * Mock score generator for testing and fallback scenarios
 */
class MockScoreGenerator {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('MockScoreGenerator');
  }

  /**
   * Generate realistic mock scores for testing
   * Simulates Google Cloud Vision output with reasonable variation
   */
  generateMockScores(): {
    composition: number;
    colorTheory: number;
    balance: number;
  } {
    // Generate scores with normal distribution around 75
    const composition = this.generateScore(75, 15);
    const colorTheory = this.generateScore(73, 16);
    const balance = this.generateScore(74, 14);

    this.logger.debug(
      `Generated mock scores: composition=${composition}, colorTheory=${colorTheory}, balance=${balance}`
    );

    return {
      composition,
      colorTheory,
      balance,
    };
  }

  /**
   * Generate a single score with normal distribution
   * Mean: specified center value, StdDev: specified spread
   */
  private generateScore(mean: number, stdDev: number): number {
    // Box-Muller transform for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

    let score = mean + z0 * stdDev;

    // Clamp to valid range [0, 100]
    score = Math.max(0, Math.min(100, score));

    // Round to integer
    return Math.round(score);
  }
}

/**
 * EvaluationPipeline orchestrates the complete evaluation workflow
 * 
 * Responsibilities:
 * - Query Firebase for pending submissions
 * - Download media files
 * - Call AI Vision API or use mock scores
 * - Calculate creativity scores
 * - Update Firebase records
 * - Log all events and errors
 * 
 * MVP Design: Sequential processing (no concurrency)
 * - Simplifies error handling and state management
 * - Suitable for MVP load (< 100 submissions/day)
 * - Can scale to concurrent processing in future
 */
export class EvaluationPipeline {
  private logger: Logger;
  private aiVisionClient: AIVisionClient;
  private scoreCalculator: ScoreCalculator;
  private mockScoreGenerator: MockScoreGenerator;
  private mockScoreConfig: MockScoreConfig = { enabled: false };

  constructor(
    aiVisionClient: AIVisionClient,
    scoreCalculator: ScoreCalculator,
    mockScoreConfig?: MockScoreConfig
  ) {
    this.logger = new Logger('EvaluationPipeline');
    this.aiVisionClient = aiVisionClient;
    this.scoreCalculator = scoreCalculator;
    this.mockScoreGenerator = new MockScoreGenerator();

    if (mockScoreConfig) {
      this.mockScoreConfig = mockScoreConfig;
    }

    this.logger.info(
      `EvaluationPipeline initialized. Mock scores: ${this.mockScoreConfig.enabled ? 'ENABLED' : 'disabled'}${this.mockScoreConfig.reason ? ` (${this.mockScoreConfig.reason})` : ''}`
    );
  }

  /**
   * Enable or disable mock scoring
   * Useful for testing when API limit is hit or API is unavailable
   */
  setMockScoreMode(enabled: boolean, reason?: string): void {
    this.mockScoreConfig.enabled = enabled;
    this.mockScoreConfig.reason = reason;

    this.logger.info(
      `Mock score mode ${enabled ? 'ENABLED' : 'disabled'}${reason ? `: ${reason}` : ''}`
    );
  }

  /**
   * Process all pending submissions
   * Main entry point for the evaluation pipeline
   * 
   * Workflow:
   * 1. Query Firebase for submissions with status='pending_evaluation'
   * 2. For each submission (sequential):
   *    a. Download media file
   *    b. Call AI Vision API
   *    c. Calculate creativity score
   *    d. Update Firebase with scores
   *    e. Log event
   *    f. Handle failures gracefully
   * 3. Return summary statistics
   */
  async processPendingSubmissions(): Promise<PipelineExecutionStats> {
    const startTime = Date.now();
    this.logger.info('Starting evaluation pipeline for pending submissions');

    const stats: PipelineExecutionStats = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      results: [],
      totalTimeMs: 0,
      startTime,
      endTime: 0,
    };

    try {
      // Step 1: Query Firebase for pending submissions
      const pendingSubmissions = await this.queryPendingSubmissions();

      if (pendingSubmissions.length === 0) {
        this.logger.info('No pending submissions to evaluate');
        stats.endTime = Date.now();
        stats.totalTimeMs = stats.endTime - startTime;
        return stats;
      }

      this.logger.info(`Found ${pendingSubmissions.length} pending submissions for evaluation`);

      // Step 2: Process each submission sequentially
      for (const submission of pendingSubmissions) {
        const result = await this.evaluateSubmission(submission);
        stats.results.push(result);
        stats.totalProcessed++;

        if (result.success) {
          stats.successful++;
        } else {
          stats.failed++;
        }

        // Log per-submission result
        if (result.success) {
          this.logger.info(
            `Evaluated submission ${submission.id}: ${result.creativityScore}/100 ` +
            `(composition=${result.compositionScore}, colorTheory=${result.colorTheoryScore}, balance=${result.balanceScore})` +
            `${result.usedMockScores ? ' [MOCK]' : ''}`
          );
        } else {
          this.logger.error(
            `Failed to evaluate submission ${submission.id}: ${result.error}`
          );
        }
      }

      // Summary
      stats.endTime = Date.now();
      stats.totalTimeMs = stats.endTime - startTime;

      this.logger.info(
        `Pipeline execution complete: ${stats.successful}/${stats.totalProcessed} successful, ` +
        `${stats.failed} failed, ${stats.totalTimeMs}ms total`
      );
    } catch (error) {
      this.logger.error(
        `Pipeline execution failed: ${this.getErrorMessage(error)}`
      );

      stats.endTime = Date.now();
      stats.totalTimeMs = stats.endTime - startTime;
    }

    return stats;
  }

  /**
   * Evaluate a single submission through the complete pipeline
   * 
   * Returns result object indicating success/failure
   * Handles all errors gracefully - never throws
   */
  private async evaluateSubmission(submission: Submission): Promise<EvaluationPipelineResult> {
    const startTime = Date.now();
    const result: EvaluationPipelineResult = {
      submissionId: submission.id,
      success: false,
      processingTimeMs: 0,
      timestamp: Date.now(),
    };

    try {
      this.logger.debug(`Starting evaluation of submission ${submission.id}`);

      // Step 1: Download media file
      const mediaBuffer = await this.downloadMediaFile(submission);

      if (!mediaBuffer) {
        throw new Error('Failed to download media file');
      }

      // Step 2: Call AI Vision API or use mock scores
      let compositionScore: number;
      let colorTheoryScore: number;
      let balanceScore: number;

      if (this.mockScoreConfig.enabled) {
        this.logger.info(
          `Using mock scores for submission ${submission.id} (reason: ${this.mockScoreConfig.reason})`
        );

        const mockScores = this.mockScoreGenerator.generateMockScores();
        compositionScore = mockScores.composition;
        colorTheoryScore = mockScores.colorTheory;
        balanceScore = mockScores.balance;
        result.usedMockScores = true;
      } else {
        this.logger.debug(`Calling Google Cloud Vision API for submission ${submission.id}`);

        const aiRequest: AIEvaluationRequest = {
          submissionId: submission.id,
          mediaBuffer,
          mediaType: submission.mediaType as any,
          modelVersion: 'google-cloud-vision-v1.0',
        };

        const aiResponse = await this.aiVisionClient.evaluateMedia(aiRequest);

        compositionScore = aiResponse.compositionScore;
        colorTheoryScore = aiResponse.colorTheoryScore;
        balanceScore = aiResponse.balanceScore;
      }

      // Step 3: Calculate creativity score using ScoreCalculator
      const calculationResult = this.scoreCalculator.calculateCreativityScore({
        composition: compositionScore,
        colorTheory: colorTheoryScore,
        balance: balanceScore,
      });

      if (!calculationResult.validationPassed) {
        throw new Error(
          `Score calculation failed validation: ${calculationResult.errors.join('; ')}`
        );
      }

      // Step 4: Update Firebase submission record with scores and status
      await this.updateSubmissionInFirebase(submission.id, {
        compositionScore,
        colorTheoryScore,
        balanceScore,
        creativityScore: calculationResult.creativityScore,
        evaluationStatus: EvaluationStatus.COMPLETED,
      });

      // Step 5: Log evaluation event
      this.logger.info(
        `Submission ${submission.id} evaluation complete: ` +
        `${calculationResult.creativityScore}/100`
      );

      // Return success
      result.success = true;
      result.compositionScore = compositionScore;
      result.colorTheoryScore = colorTheoryScore;
      result.balanceScore = balanceScore;
      result.creativityScore = calculationResult.creativityScore;
    } catch (error) {
      // Handle failures gracefully - log and continue
      result.error = this.getErrorMessage(error);
      this.logger.error(
        `Failed to evaluate submission ${submission.id}: ${result.error}`
      );

      // Update Firebase to mark as failed
      try {
        await this.updateSubmissionInFirebase(submission.id, {
          evaluationStatus: EvaluationStatus.EVALUATION_FAILED,
          evaluationErrors: [
            {
              code: 'EVALUATION_ERROR',
              message: result.error,
            },
          ],
        });
      } catch (updateError) {
        this.logger.error(
          `Failed to update submission ${submission.id} with error status: ${this.getErrorMessage(updateError)}`
        );
      }
    }

    result.processingTimeMs = Date.now() - startTime;
    return result;
  }

  /**
   * Query Firebase for submissions pending evaluation
   * Returns array of Submission records with status='pending_evaluation'
   */
  private async queryPendingSubmissions(): Promise<Submission[]> {
    this.logger.debug('Querying Firebase for pending submissions');

    // TODO: Implement Firebase query
    // For MVP, return mock data for testing
    // Production: Query Firebase collections with where clause:
    // submissions.where('evaluationStatus', '==', 'pending')

    // Mock implementation returns empty array for now
    // Will be replaced with actual Firebase query in integration
    return [];
  }

  /**
   * Download media file from Firebase Storage
   * Returns Buffer with media content
   */
  private async downloadMediaFile(submission: Submission): Promise<Buffer | null> {
    try {
      this.logger.debug(`Downloading media file for submission ${submission.id}`);

      const storageUrl = submission.media.storageUrl;

      if (!storageUrl) {
        throw new Error('No storage URL in submission');
      }

      // Download file
      const response = await axios.get(storageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });

      const buffer = Buffer.from(response.data);

      this.logger.debug(
        `Downloaded ${buffer.length} bytes for submission ${submission.id}`
      );

      return buffer;
    } catch (error) {
      this.logger.error(
        `Failed to download media file for submission ${submission.id}: ${this.getErrorMessage(error)}`
      );

      return null;
    }
  }

  /**
   * Update submission record in Firebase with evaluation results
   */
  private async updateSubmissionInFirebase(
    submissionId: string,
    updates: {
      compositionScore?: number;
      colorTheoryScore?: number;
      balanceScore?: number;
      creativityScore?: number;
      evaluationStatus: EvaluationStatus;
      evaluationErrors?: Array<{ code: string; message: string }>;
    }
  ): Promise<void> {
    this.logger.debug(`Updating Firebase submission ${submissionId} with evaluation results`);

    // TODO: Implement Firebase update
    // Production: Update Firebase document:
    // db.collection('submissions').doc(submissionId).update({
    //   evaluationStatus: updates.evaluationStatus,
    //   compositionScore: updates.compositionScore,
    //   colorTheoryScore: updates.colorTheoryScore,
    //   balanceScore: updates.balanceScore,
    //   creativityScore: updates.creativityScore,
    //   evaluationTimestamp: Date.now(),
    //   evaluationErrors: updates.evaluationErrors || [],
    // })

    this.logger.debug(`Firebase update queued for submission ${submissionId}`);
  }

  /**
   * Extract error message from various error types
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (error instanceof AxiosError && error.response?.data) {
      const data = error.response.data as Record<string, unknown>;
      return String(data.message || data.error || error.message);
    }

    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as Record<string, unknown>).message);
    }

    return String(error);
  }

  /**
   * Get pipeline statistics for monitoring
   */
  getStats(): {
    mockScoresEnabled: boolean;
    mockScoreReason?: string;
    aiProvider: string;
    scoreCalculatorMetadata: any;
  } {
    return {
      mockScoresEnabled: this.mockScoreConfig.enabled,
      mockScoreReason: this.mockScoreConfig.reason,
      aiProvider: 'google-cloud-vision-v1.0',
      scoreCalculatorMetadata: this.scoreCalculator.getMetadata(),
    };
  }
}

export default EvaluationPipeline;
