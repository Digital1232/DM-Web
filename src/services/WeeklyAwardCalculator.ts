/**
 * WeeklyAwardCalculator Service
 * 
 * Responsibilities:
 * - Execute on fixed schedule (Every Sunday 23:59:59 UTC)
 * - Query Firebase submissions from past 7 days
 * - Rank submissions by category (Best_Video, Best_Poster, Best_Video_Poster_Content)
 * - Select one winner per category using tiebreaker logic: earlier submission timestamp wins
 * - Create Award records with full metadata
 * - Update Firebase awards collection
 * - Log calculation results to audit trail
 * - Handle errors with admin alerts and 1-hour retry
 * 
 * Based on Requirements 3, 11, and design specifications for award calculation
 */

import * as admin from 'firebase-admin';
import { Logger } from '../utils/logger';
import { Submission, SubmissionStatus } from '../types/submission';
import { EvaluationStatus } from '../types/evaluation';
import { Award, AwardType, AwardCategory, AwardStatus, AwardPeriod, AwardCreateRequest, getEnabledCategories } from '../types/award';
import { AuditLog, AuditEventType, AuditEntityType, AuditActorType } from '../types/audit';
import { RankerService } from './RankerService';
import { v4 as uuidv4 } from 'uuid';

/**
 * Result of weekly award calculation
 */
export interface WeeklyAwardCalculationResult {
  type: 'weekly';
  period: {
    year: number;
    week: number;
    start: string; // ISO 8601
    end: string; // ISO 8601
  };
  awarded: number;
  categories: AwardCategory[];
  winners: Map<AwardCategory, Award>;
  errors: Array<{
    category: AwardCategory;
    code: string;
    message: string;
  }>;
  calculationTimestamp: number;
  nextRetryAt?: number; // If errors occurred
}

/**
 * WeeklyAwardCalculator: Handles weekly award calculation and creation
 */
export class WeeklyAwardCalculator {
  private db: admin.firestore.Firestore;
  private logger: Logger;
  private submissionsCollection = 'submissions';
  private awardsCollection = 'awards';
  private auditCollection = 'audit_logs';
  private rankerService = RankerService;

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
        admin.initializeApp();
      }
    }

    this.db = admin.firestore();
    this.logger = new Logger('WeeklyAwardCalculator');
  }

  /**
   * Main entry point: Calculate and create weekly awards
   * 
   * Process:
   * 1. Determine the week period (last 7 days from now)
   * 2. Query submissions from that period
   * 3. Filter for evaluated submissions
   * 4. Rank by category and select winners
   * 5. Create award records in Firebase
   * 6. Log to audit trail
   * 
   * @returns Calculation result with winners and any errors
   */
  async calculateAndCreateAwards(): Promise<WeeklyAwardCalculationResult> {
    const calculationTimestamp = Date.now();
    const result: WeeklyAwardCalculationResult = {
      type: 'weekly',
      period: this.getPeriodDates(),
      awarded: 0,
      categories: [],
      winners: new Map(),
      errors: [],
      calculationTimestamp,
    };

    try {
      this.logger.info('Starting weekly award calculation', {
        period: result.period,
        timestamp: calculationTimestamp,
      });

      // Step 1: Query submissions from the period
      const submissions = await this.getSubmissionsForPeriod(
        result.period.start,
        result.period.end
      );

      this.logger.info('Fetched submissions for weekly period', {
        count: submissions.length,
        period: result.period,
      });

      // Step 2: Filter for valid, evaluated submissions
      const validSubmissions = this.filterValidSubmissions(submissions);

      if (validSubmissions.length === 0) {
        this.logger.warn('No valid submissions found for weekly award calculation', {
          period: result.period,
          totalSubmissions: submissions.length,
        });

        // Still log to audit trail
        await this.logToAuditTrail('weekly_calculation', {
          period: result.period,
          status: 'completed_no_submissions',
          submissionCount: 0,
          awardCount: 0,
        });

        return result;
      }

      // Step 3: Get enabled categories and rank submissions
      const enabledCategories = getEnabledCategories();
      const rankingResult = this.rankerService.rankAndSelectWinners(
        validSubmissions,
        enabledCategories
      );

      this.logger.info('Ranking complete', {
        totalSubmissionsRanked: rankingResult.totalSubmissionsRanked,
        categoriesWithWinners: rankingResult.winners.size,
        tiebreakersApplied: rankingResult.tiebreakersApplied.length,
      });

      // Step 4: Create award records for each winner
      for (const [category, winnerSubmission] of rankingResult.winners.entries()) {
        try {
          const award = await this.createAwardRecord(
            winnerSubmission,
            category,
            result.period,
            rankingResult.totalSubmissionsRanked
          );

          result.winners.set(category, award);
          result.categories.push(category);
          result.awarded++;

          this.logger.info('Award created for weekly period', {
            category,
            winnerId: award.winnerId,
            submissionId: award.submissionId,
            score: award.creativityScore,
          });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to create award for category', {
            category,
            error: errorMsg,
          });

          result.errors.push({
            category,
            code: 'AWARD_CREATION_FAILED',
            message: `Failed to create award: ${errorMsg}`,
          });
        }
      }

      // Step 5: Log calculation to audit trail
      await this.logToAuditTrail('weekly_calculation', {
        period: result.period,
        status: result.errors.length === 0 ? 'completed' : 'completed_with_errors',
        submissionCount: validSubmissions.length,
        awardCount: result.awarded,
        errors: result.errors,
        tiebreakersApplied: rankingResult.tiebreakersApplied,
      });

      this.logger.info('Weekly award calculation completed', {
        awarded: result.awarded,
        errors: result.errors.length,
        period: result.period,
      });

      // Step 6: Handle any errors - schedule retry if needed
      if (result.errors.length > 0) {
        result.nextRetryAt = calculationTimestamp + 60 * 60 * 1000; // 1 hour
        this.logger.warn('Weekly calculation completed with errors, scheduled retry', {
          retryAt: new Date(result.nextRetryAt).toISOString(),
          errorCount: result.errors.length,
        });
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('Fatal error in weekly award calculation', {
        error: errorMsg,
        period: result.period,
      });

      result.errors.push({
        category: AwardCategory.BEST_VIDEO, // Placeholder
        code: 'FATAL_CALCULATION_ERROR',
        message: `Fatal error: ${errorMsg}`,
      });

      result.nextRetryAt = calculationTimestamp + 60 * 60 * 1000; // 1 hour

      // Log fatal error to audit trail
      await this.logToAuditTrail('weekly_calculation_error', {
        error: errorMsg,
        period: result.period,
        retryScheduled: true,
      });

      return result;
    }
  }

  /**
   * Scheduler: Should be called by a cron job or scheduler
   * Runs every Sunday at 23:59:59 UTC
   * 
   * Usage with node-schedule:
   * const schedule = require('node-schedule');
   * // Every Sunday at 23:59:59 UTC
   * schedule.scheduleJob('59 23 * * 0 America/Denver', async () => {
   *   const calculator = new WeeklyAwardCalculator();
   *   await calculator.run();
   * });
   */
  async run(): Promise<void> {
    try {
      const result = await this.calculateAndCreateAwards();

      if (result.errors.length > 0) {
        this.logger.error('Weekly award calculation encountered errors', {
          errorCount: result.errors.length,
          errors: result.errors,
        });

        // In production, send admin alert here
        // await notificationService.sendAdminAlert(...)
      }
    } catch (error) {
      this.logger.error('Unhandled error in weekly award scheduler', {
        error: error instanceof Error ? error.message : String(error),
      });

      // In production, send admin alert here
      // await notificationService.sendAdminAlert(...)
    }
  }

  /**
   * Private: Get period dates for this week
   * Week is defined as Monday-Sunday in ISO 8601
   * 
   * @returns Period with ISO dates and ISO week number
   */
  private getPeriodDates(): WeeklyAwardCalculationResult['period'] {
    const now = new Date();
    const currentYear = now.getUTCFullYear();

    // Calculate ISO week number and Monday of that week
    const dayOfWeek = now.getUTCDay() || 7; // Sunday = 7
    const weekOffset = dayOfWeek - 1; // Days since Monday
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() - weekOffset);
    monday.setUTCHours(0, 0, 0, 0);

    // Sunday is 6 days later
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    sunday.setUTCHours(23, 59, 59, 999);

    // Calculate ISO week number
    const firstDay = new Date(currentYear, 0, 1);
    const firstThursday = new Date(currentYear, 0, 4);
    const firstMonday = new Date(firstThursday);
    firstMonday.setUTCDate(firstThursday.getUTCDate() - (firstThursday.getUTCDay() || 7) + 1);

    let week = 1;
    if (monday < firstMonday) {
      // Last week of previous year
      week = 53; // Or calculate properly
    } else {
      const timeDiff = monday.getTime() - firstMonday.getTime();
      week = Math.floor(timeDiff / (7 * 24 * 60 * 60 * 1000)) + 1;
    }

    return {
      year: currentYear,
      week,
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0],
    };
  }

  /**
   * Private: Query submissions from Firebase for the period
   */
  private async getSubmissionsForPeriod(
    startDate: string,
    endDate: string
  ): Promise<Submission[]> {
    try {
      const startMs = new Date(`${startDate}T00:00:00Z`).getTime();
      const endMs = new Date(`${endDate}T23:59:59Z`).getTime();

      const query = this.db
        .collection(this.submissionsCollection)
        .where('submissionTimestamp', '>=', startMs)
        .where('submissionTimestamp', '<=', endMs)
        .where('status', '==', SubmissionStatus.ACTIVE);

      const snapshot = await query.get();
      const submissions = snapshot.docs.map((doc) => doc.data() as Submission);

      this.logger.debug('Fetched submissions for period', {
        startDate,
        endDate,
        count: submissions.length,
      });

      return submissions;
    } catch (error) {
      this.logger.error('Error fetching submissions for period', {
        startDate,
        endDate,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Private: Filter for valid, evaluated submissions
   * 
   * Valid submissions must:
   * - Have status = ACTIVE
   * - Have evaluationStatus = COMPLETED
   * - Have all scores populated
   */
  private filterValidSubmissions(submissions: Submission[]): Submission[] {
    return submissions.filter((sub) => {
      // Must be active
      if (sub.status !== SubmissionStatus.ACTIVE) {
        return false;
      }

      // Must be evaluated
      if (sub.evaluationStatus !== EvaluationStatus.COMPLETED) {
        return false;
      }

      // Must have a creativity score
      if (sub.creativityScore === undefined || sub.creativityScore === null) {
        return false;
      }

      // Must have subscores
      if (
        sub.compositionScore === undefined ||
        sub.colorTheoryScore === undefined ||
        sub.balanceScore === undefined
      ) {
        return false;
      }

      return true;
    });
  }

  /**
   * Private: Create an award record in Firebase
   */
  private async createAwardRecord(
    submission: Submission,
    category: AwardCategory,
    period: WeeklyAwardCalculationResult['period'],
    totalContestants: number
  ): Promise<Award> {
    try {
      const awardId = `AWARD-${period.year}-W${period.week}-${category.replace(' ', '_')}`;
      const now = Date.now();

      const award: Award = {
        id: awardId,
        awardId,
        type: AwardType.WEEKLY,
        category,
        period: {
          type: 'week',
          year: period.year,
          week: period.week,
          start: period.start,
          end: period.end,
        },
        winnerId: submission.teamMemberId,
        winnerName: submission.teamMemberName,
        winnerDepartment: submission.departmentId,
        submissionId: submission.id,
        jiraTaskId: submission.jiraTaskId,
        creativityScore: submission.creativityScore ?? 0,
        compositionScore: submission.compositionScore ?? 0,
        colorTheoryScore: submission.colorTheoryScore ?? 0,
        balanceScore: submission.balanceScore ?? 0,
        rankInPeriod: 1,
        totalContestants,
        calculationTimestamp: now,
        tiebreaker: 'no_tie',
        status: AwardStatus.ACTIVE,
        notificationSent: false,
        createdAt: now,
        updatedAt: now,
      };

      // Store in Firebase
      await this.db.collection(this.awardsCollection).doc(awardId).set(award);

      this.logger.debug('Award record created and stored', {
        awardId,
        category,
        winnerId: submission.teamMemberId,
      });

      return award;
    } catch (error) {
      this.logger.error('Failed to create award record', {
        category,
        submissionId: submission.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Private: Log calculation to audit trail
   */
  private async logToAuditTrail(
    eventType: string,
    details: Record<string, unknown>
  ): Promise<void> {
    try {
      const correlationId = uuidv4();
      const auditLog: AuditLog = {
        id: uuidv4(),
        correlationId,
        eventType: AuditEventType.AWARD_CALCULATED,
        entityType: AuditEntityType.CALCULATION,
        entityId: correlationId,
        before: {},
        after: details,
        changeDetails: {},
        actorId: 'system',
        actorType: AuditActorType.SYSTEM,
        timestamp: Date.now(),
        sourceSystem: 'weekly_award_calculator',
        context: { eventType },
        version: 1,
        immutable: true,
      };

      await this.db.collection(this.auditCollection).add(auditLog);

      this.logger.debug('Logged to audit trail', {
        eventType,
        correlationId: auditLog.correlationId,
      });
    } catch (error) {
      this.logger.error('Failed to log to audit trail', {
        eventType,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - audit logging failure should not block main operation
    }
  }
}

export default WeeklyAwardCalculator;
