/**
 * Submission Service
 * Handles submission record creation and storage in Firebase
 * 
 * Responsibilities:
 * - Create submission records from detected media
 * - Prevent duplicates by checking jiraTaskId + fileName
 * - Store submissions in Firebase Firestore
 * - Update submission statuses during evaluation pipeline
 */

import * as admin from 'firebase-admin';
import { Logger } from '../utils/logger';
import { Submission, SubmissionCreateRequest, SubmissionStatus } from '../types/submission';
import { EvaluationStatus } from '../types/evaluation';
import * as crypto from 'crypto';

export class SubmissionService {
  private db: admin.firestore.Firestore;
  private logger: Logger;
  private submissionsCollection = 'submissions';

  constructor() {
    // Initialize Firebase Admin if not already initialized
    if (!admin.apps.length) {
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
        : undefined;

      if (serviceAccountKey) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccountKey),
        });
      } else {
        // Fallback to default credentials (for local development or deployed environments)
        admin.initializeApp();
      }
    }

    this.db = admin.firestore();
    this.logger = new Logger('SubmissionService');
  }

  /**
   * Calculate hash of media file for duplicate detection
   * @param fileName - Name of the media file
   * @param jiraTaskId - Source Jira task ID
   * @returns Hash string
   */
  private calculateMediaHash(fileName: string, jiraTaskId: string): string {
    const combined = `${jiraTaskId}#${fileName}`;
    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  /**
   * Check if submission already exists (duplicate detection)
   * @param jiraTaskId - Jira task ID
   * @param fileName - Media file name
   * @returns Existing submission ID if found, null otherwise
   */
  async checkDuplicateSubmission(jiraTaskId: string, fileName: string): Promise<string | null> {
    try {
      const mediaHash = this.calculateMediaHash(fileName, jiraTaskId);

      // Query for existing submission with same task ID and file name hash
      const query = this.db
        .collection(this.submissionsCollection)
        .where('jiraTaskId', '==', jiraTaskId)
        .where('media.fileName', '==', fileName)
        .limit(1);

      const snapshot = await query.get();

      if (!snapshot.empty) {
        const existingId = snapshot.docs[0].id;
        this.logger.debug('Found duplicate submission', {
          jiraTaskId,
          fileName,
          existingId,
        });
        return existingId;
      }

      return null;
    } catch (error) {
      this.logger.error('Error checking for duplicate submission', {
        jiraTaskId,
        fileName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Create a new submission record
   * @param request - Submission creation request
   * @returns Created submission ID
   */
  async createSubmission(request: SubmissionCreateRequest): Promise<string> {
    try {
      // Check for duplicates first
      const duplicateId = await this.checkDuplicateSubmission(request.jiraTaskId, request.mediaFileName);
      if (duplicateId) {
        this.logger.info('Submission already exists, skipping duplicate', {
          jiraTaskId: request.jiraTaskId,
          fileName: request.mediaFileName,
          existingId: duplicateId,
        });
        return duplicateId;
      }

      const now = Date.now();
      const mediaHash = this.calculateMediaHash(request.mediaFileName, request.jiraTaskId);

      const submission: Submission = {
        id: '',
        submissionId: '',
        jiraTaskId: request.jiraTaskId,
        jiraTaskKey: '',
        submissionTimestamp: request.uploadTimestamp,
        teamMemberId: request.teamMemberId,
        teamMemberName: request.teamMemberName,
        departmentId: request.departmentId,
        mediaType: request.mediaType,
        media: {
          fileName: request.mediaFileName,
          format: request.mediaFormat,
          fileSize: request.mediaFileSize,
          storageUrl: request.mediaStorageUrl,
          thumbnailUrl: request.mediaThumbnailUrl,
          hash: mediaHash,
        },
        evaluationStatus: EvaluationStatus.PENDING,
        aiModelVersion: '',
        status: SubmissionStatus.ACTIVE,
        version: 1,
        createdAt: now,
        updatedAt: now,
        retryCount: 0,
      };

      // Create document in Firestore
      const docRef = await this.db.collection(this.submissionsCollection).add(submission);
      const submissionId = docRef.id;

      // Update ID fields with the generated document ID
      await docRef.update({
        id: submissionId,
        submissionId: submissionId,
      });

      this.logger.info('Submission created successfully', {
        submissionId,
        jiraTaskId: request.jiraTaskId,
        teamMemberId: request.teamMemberId,
        mediaType: request.mediaType,
      });

      return submissionId;
    } catch (error) {
      this.logger.error('Failed to create submission', {
        jiraTaskId: request.jiraTaskId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get submission by ID
   * @param submissionId - Submission document ID
   * @returns Submission record or null if not found
   */
  async getSubmission(submissionId: string): Promise<Submission | null> {
    try {
      const doc = await this.db.collection(this.submissionsCollection).doc(submissionId).get();

      if (!doc.exists) {
        this.logger.debug('Submission not found', { submissionId });
        return null;
      }

      return doc.data() as Submission;
    } catch (error) {
      this.logger.error('Error fetching submission', {
        submissionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update submission status to pending_evaluation after successful detection
   * @param submissionId - Submission document ID
   * @returns Updated submission
   */
  async updateStatusToPendingEvaluation(submissionId: string): Promise<Submission> {
    try {
      const now = Date.now();

      await this.db
        .collection(this.submissionsCollection)
        .doc(submissionId)
        .update({
          evaluationStatus: EvaluationStatus.PENDING,
          updatedAt: now,
        });

      const updated = await this.getSubmission(submissionId);
      if (!updated) {
        throw new Error(`Submission ${submissionId} not found after update`);
      }

      this.logger.debug('Submission status updated to pending evaluation', { submissionId });
      return updated;
    } catch (error) {
      this.logger.error('Failed to update submission status', {
        submissionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update submission with evaluation results
   * @param submissionId - Submission document ID
   * @param scores - Evaluation scores
   * @param modelVersion - AI model version used
   * @returns Updated submission
   */
  async updateSubmissionWithScores(
    submissionId: string,
    scores: {
      compositionScore: number;
      colorTheoryScore: number;
      balanceScore: number;
      creativityScore: number;
    },
    modelVersion: string
  ): Promise<Submission> {
    try {
      const now = Date.now();

      await this.db
        .collection(this.submissionsCollection)
        .doc(submissionId)
        .update({
          compositionScore: scores.compositionScore,
          colorTheoryScore: scores.colorTheoryScore,
          balanceScore: scores.balanceScore,
          creativityScore: scores.creativityScore,
          evaluationStatus: EvaluationStatus.COMPLETED,
          aiModelVersion: modelVersion,
          evaluationTimestamp: now,
          updatedAt: now,
          retryCount: 0,
        });

      const updated = await this.getSubmission(submissionId);
      if (!updated) {
        throw new Error(`Submission ${submissionId} not found after update`);
      }

      this.logger.info('Submission updated with evaluation scores', {
        submissionId,
        creativityScore: scores.creativityScore,
        modelVersion,
      });

      return updated;
    } catch (error) {
      this.logger.error('Failed to update submission with scores', {
        submissionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Mark submission as evaluation failed
   * @param submissionId - Submission document ID
   * @param error - Error details
   * @returns Updated submission
   */
  async markEvaluationFailed(
    submissionId: string,
    error: { code: string; message: string }
  ): Promise<Submission> {
    try {
      const now = Date.now();
      const nextRetryAt = now + 6 * 60 * 60 * 1000; // 6 hours from now

      const submission = await this.getSubmission(submissionId);
      if (!submission) {
        throw new Error(`Submission ${submissionId} not found`);
      }

      const retryCount = (submission.retryCount || 0) + 1;

      await this.db
        .collection(this.submissionsCollection)
        .doc(submissionId)
        .update({
          evaluationStatus: EvaluationStatus.FAILED,
          evaluationErrors: [
            ...(submission.evaluationErrors || []),
            { ...error, timestamp: now },
          ],
          retryCount,
          nextRetryAt,
          updatedAt: now,
        });

      const updated = await this.getSubmission(submissionId);
      if (!updated) {
        throw new Error(`Submission ${submissionId} not found after update`);
      }

      this.logger.warn('Submission marked as evaluation failed', {
        submissionId,
        retryCount,
        nextRetryAt: new Date(nextRetryAt).toISOString(),
        error: error.message,
      });

      return updated;
    } catch (error) {
      this.logger.error('Failed to mark submission as failed', {
        submissionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get all submissions by Jira task ID
   * @param jiraTaskId - Jira task ID
   * @returns Array of submissions
   */
  async getSubmissionsByJiraTaskId(jiraTaskId: string): Promise<Submission[]> {
    try {
      const query = this.db
        .collection(this.submissionsCollection)
        .where('jiraTaskId', '==', jiraTaskId)
        .where('status', '==', SubmissionStatus.ACTIVE);

      const snapshot = await query.get();
      const submissions = snapshot.docs.map((doc) => doc.data() as Submission);

      this.logger.debug('Fetched submissions by Jira task ID', {
        jiraTaskId,
        count: submissions.length,
      });

      return submissions;
    } catch (error) {
      this.logger.error('Error fetching submissions by Jira task ID', {
        jiraTaskId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get pending submissions (ready for evaluation)
   * @param limit - Maximum number to return
   * @returns Array of pending submissions
   */
  async getPendingSubmissions(limit: number = 100): Promise<Submission[]> {
    try {
      const query = this.db
        .collection(this.submissionsCollection)
        .where('evaluationStatus', '==', EvaluationStatus.PENDING)
        .where('status', '==', SubmissionStatus.ACTIVE)
        .limit(limit);

      const snapshot = await query.get();
      const submissions = snapshot.docs.map((doc) => doc.data() as Submission);

      this.logger.debug('Fetched pending submissions', { count: submissions.length });

      return submissions;
    } catch (error) {
      this.logger.error('Error fetching pending submissions', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

export default SubmissionService;
