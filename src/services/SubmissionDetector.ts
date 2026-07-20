/**
 * Submission Detector Service
 * Scheduler that detects media submissions from Jira and creates submission records
 * 
 * Responsibilities:
 * - Run scheduler every 2 hours (MVP schedule)
 * - Query Jira for completed/posted tasks from last 2 hours
 * - Extract and validate media attachments
 * - Create submission records in Firebase
 * - Handle errors gracefully without blocking subsequent detections
 * - Log all operations to audit trail
 */

import { Logger } from '../utils/logger';
import { JiraClient } from '../clients/jira';
import { SubmissionService } from './SubmissionService';
import { SubmissionCreateRequest } from '../types/submission';
import { MediaType } from '../types/media';
import * as schedule from 'node-schedule';

export interface SubmissionDetectionResult {
  processed: number;
  created: number;
  duplicates: number;
  failed: number;
  errors: Array<{
    taskId: string;
    error: string;
  }>;
  startTime: number;
  endTime: number;
  durationMs: number;
}

export class SubmissionDetector {
  private jiraClient: JiraClient;
  private submissionService: SubmissionService;
  private logger: Logger;
  private scheduledJob: schedule.Job | null = null;
  private isRunning = false;
  private mvpScheduleIntervalMinutes = 120; // 2 hours for MVP

  constructor() {
    this.jiraClient = new JiraClient();
    this.submissionService = new SubmissionService();
    this.logger = new Logger('SubmissionDetector');
  }

  /**
   * Start the submission detector scheduler
   * Runs every 2 hours (MVP schedule)
   */
  public start(): void {
    try {
      this.logger.info('Starting SubmissionDetector scheduler', {
        intervalMinutes: this.mvpScheduleIntervalMinutes,
      });

      // Schedule job to run every 2 hours
      this.scheduledJob = schedule.scheduleJob(
        `*/${this.mvpScheduleIntervalMinutes} * * * *`,
        async () => {
          if (!this.isRunning) {
            await this.detectAndProcessSubmissions();
          }
        }
      );

      // Run initial detection immediately
      setImmediate(async () => {
        await this.detectAndProcessSubmissions();
      });

      this.logger.info('SubmissionDetector scheduler started successfully');
    } catch (error) {
      this.logger.error('Failed to start SubmissionDetector scheduler', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Stop the scheduler
   */
  public stop(): void {
    if (this.scheduledJob) {
      this.scheduledJob.cancel();
      this.scheduledJob = null;
      this.logger.info('SubmissionDetector scheduler stopped');
    }
  }

  /**
   * Main detection loop: query Jira -> extract media -> validate -> create records
   */
  public async detectAndProcessSubmissions(): Promise<SubmissionDetectionResult> {
    const startTime = Date.now();
    const result: SubmissionDetectionResult = {
      processed: 0,
      created: 0,
      duplicates: 0,
      failed: 0,
      errors: [],
      startTime,
      endTime: 0,
      durationMs: 0,
    };

    if (this.isRunning) {
      this.logger.warn('Detection already running, skipping this cycle');
      return result;
    }

    this.isRunning = true;

    try {
      this.logger.info('Starting submission detection cycle');

      // Step 1: Query Jira for completed/posted tasks from last 2 hours
      let jiraTasks = [];
      try {
        jiraTasks = await this.jiraClient.fetchCompletedTasksLastNMinutes();
        this.logger.info('Fetched tasks from Jira', { count: jiraTasks.length });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.error('Failed to fetch tasks from Jira', { error: errorMsg });
        result.errors.push({
          taskId: 'JIRA_QUERY',
          error: `Failed to query Jira: ${errorMsg}`,
        });
        return result;
      }

      result.processed = jiraTasks.length;

      // Step 2: Process each task
      for (const task of jiraTasks) {
        try {
          // Extract attachments from task
          const attachments = this.jiraClient.extractAttachments(task);

          if (attachments.length === 0) {
            this.logger.debug('Task has no valid attachments', {
              taskKey: task.key,
              taskId: task.id,
            });
            continue;
          }

          // Process each attachment
          for (const attachment of attachments) {
            try {
              const mediaType = this.determineMediaType(attachment.fileName);

              // Check for duplicates
              const duplicateId = await this.submissionService.checkDuplicateSubmission(
                task.key,
                attachment.fileName
              );

              if (duplicateId) {
                result.duplicates++;
                this.logger.debug('Skipping duplicate submission', {
                  taskKey: task.key,
                  fileName: attachment.fileName,
                  existingId: duplicateId,
                });
                continue;
              }

              // Create submission request
              const submissionRequest: SubmissionCreateRequest = {
                jiraTaskId: task.key,
                jiraTaskKey: task.key,
                teamMemberId: task.fields.assignee?.emailAddress || 'unknown',
                teamMemberName: task.fields.assignee?.displayName || 'Unknown',
                departmentId: 'default', // TODO: Extract from Jira if available
                mediaType,
                mediaFileName: attachment.fileName,
                mediaFormat: attachment.fileName.split('.').pop()?.toLowerCase() || 'unknown',
                mediaFileSize: attachment.size,
                mediaStorageUrl: attachment.content,
                uploadTimestamp: new Date(attachment.created).getTime(),
              };

              // Step 3: Create submission record
              const submissionId = await this.submissionService.createSubmission(submissionRequest);

              // Step 4: Update to pending_evaluation status
              await this.submissionService.updateStatusToPendingEvaluation(submissionId);

              result.created++;

              this.logger.info('Submission created successfully', {
                submissionId,
                taskKey: task.key,
                fileName: attachment.fileName,
              });
            } catch (attachmentError) {
              const errorMsg =
                attachmentError instanceof Error ? attachmentError.message : String(attachmentError);
              result.failed++;
              result.errors.push({
                taskId: task.key,
                error: `Failed to process attachment: ${errorMsg}`,
              });

              this.logger.error('Failed to process attachment', {
                taskKey: task.key,
                fileName: attachment.fileName,
                error: errorMsg,
              });
            }
          }
        } catch (taskError) {
          const errorMsg = taskError instanceof Error ? taskError.message : String(taskError);
          result.failed++;
          result.errors.push({
            taskId: task.key,
            error: `Failed to process task: ${errorMsg}`,
          });

          this.logger.error('Failed to process task', {
            taskKey: task.key,
            error: errorMsg,
          });
        }
      }

      result.endTime = Date.now();
      result.durationMs = result.endTime - startTime;

      this.logger.info('Submission detection cycle completed', {
        processed: result.processed,
        created: result.created,
        duplicates: result.duplicates,
        failed: result.failed,
        durationMs: result.durationMs,
      });

      return result;
    } catch (error) {
      result.endTime = Date.now();
      result.durationMs = result.endTime - startTime;

      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('Submission detection cycle failed with unhandled error', {
        error: errorMsg,
        durationMs: result.durationMs,
      });

      result.errors.push({
        taskId: 'DETECTOR_CYCLE',
        error: `Unhandled error in detection cycle: ${errorMsg}`,
      });

      return result;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Determine media type from file name
   * @param fileName - Name of the file
   * @returns MediaType (video or poster)
   */
  private determineMediaType(fileName: string): MediaType {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';

    // Video formats
    if (['mp4', 'mov', 'webm'].includes(extension)) {
      return MediaType.VIDEO;
    }

    // Poster formats
    if (['png', 'jpg', 'jpeg', 'svg'].includes(extension)) {
      return MediaType.POSTER;
    }

    // Default to poster for unknown formats (shouldn't happen due to JiraClient validation)
    return MediaType.POSTER;
  }

  /**
   * Check if scheduler is currently running
   */
  public getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get scheduler status
   */
  public getStatus(): {
    running: boolean;
    scheduled: boolean;
    intervalMinutes: number;
  } {
    return {
      running: this.isRunning,
      scheduled: this.scheduledJob !== null,
      intervalMinutes: this.mvpScheduleIntervalMinutes,
    };
  }
}

export default SubmissionDetector;
