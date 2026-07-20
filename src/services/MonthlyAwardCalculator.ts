/**
 * MonthlyAwardCalculator Service
 * 
 * Responsibilities:
 * - Execute on fixed schedule (Last day of month 23:59:59 UTC)
 * - Query Firebase submissions from past 30 days (not calendar month)
 * - Rank submissions by category (Best_Video, Best_Poster, Best_Video_Poster_Content)
 * - Apply same tiebreaker logic as weekly (earlier submission wins)
 * - Create Award records with monthly period metadata
 * - Update Firebase with results
 * - Log to audit trail
 * - Handle errors with same retry pattern
 * 
 * Based on Requirements 4, 11, and design specifications for award calculation
 */

import * as admin from 'firebase-admin';
import { Logger } from '../utils/logger';
import { Submission, SubmissionStatus } from '../types/submission';
import { EvaluationStatus } from '../types/evaluation';
import { Award, AwardType, AwardCategory, AwardStatus, AwardPeriod, getEnabledCategories } from '../types/award';
import { AuditLog, AuditEventType, AuditEntityType, AuditActorType } from '../types/audit';
import { RankerService } from './RankerService';
import { v4 as uuidv4 } from 'uuid';

/**
 * Result of monthly award calculation
 */
export interface MonthlyAwardCalculationResult {
  type: 'monthly';
  period: {
    year: number;
    month: number;
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
 * MonthlyAwardCalculator: Handles monthly award calculation and creation
 */
export class MonthlyAwardCalculator {
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
    this.logger = new Logger('MonthlyAwardCalculator');
  }

  /**
   * Main entry point: Calculate and create monthly awards
   * 
   * Process:
   * 1. Determine the period (last 30 days from now)
   * 2. Query submissions from that period
   * 3. Filter for evaluated submissions
   * 4. Rank by category and select winners
   * 5. Create award records in Firebase
   * 6. Log to audit trail
   * 
   * @returns Calculation result with winners and any errors
   */
  async calculateAndCreateAwards(): Promise<MonthlyAwardCalculationResult> {
    const calculationTimestamp = Date.now();
    const result: MonthlyAwardCalculationResult = {
      type: 'monthly',
      period: this.getPeriodDates(),
      awarded: 0,
      categories: [],
      winners: new Map(),
      errors: [],
      calculationTimestamp,
    };

    try {
      this.logger.info('Starting monthly award calculation', {
        period: result.period,
        timestamp: calculationTimestamp,
      });

      // Step 1: Query submissions from the period
      const submissions = await this.getSubmissionsForPeriod(
        result.period.start,
        result.period.end
      );

      this.logger.info('Fetched submissions for monthly period', {
        count: submissions.length,
        period: result.period,
      });

      // Step 2: Filter for valid, evaluated submissions
      const validSubmissions = this.filterValidSubmissions(submissions);

      if (validSubmissions.length === 0) {
        this.logger.warn('No valid submissions found for monthly award calculation', {
          period: result.period,
          totalSubmissions: submissions.length,
        });

        // Still log to audit trail
        await this.logToAuditTrail('monthly_calculation', {
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

          this.logger.info('Award created for monthly period', {
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
      await this.logToAuditTrail('monthly_calculation', {
        period: result.period,
        status: result.errors.length === 0 ? 'completed' : 'completed_with_errors',
        submissionCount: validSubmissions.length,
        awardCount: result.awarded,
        errors: result.errors,
        tiebreakersApplied: rankingResult.tiebreakersApplied,
      });

      this.logger.info('Monthly award calculation completed', {
        awarded: result.awarded,
        errors: result.errors.length,
        period: result.period,
      });

      // Step 6: Handle any errors - schedule retry if needed
      if (result.errors.length > 0) {
        result.nextRetryAt = calculationTimestamp + 60 * 60 * 1000; // 1 hour
        this.logger.warn('Monthly calculation completed with errors, scheduled retry', {
          retryAt: new Date(result.nextRetryAt).toISOString(),
          errorCount: result.errors.length,
        });
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('Fatal error in monthly award calculation', {
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
      await this.logToAuditTrail('monthly_calculation_error', {
        error: errorMsg,
        period: result.period,
        retryScheduled: true,
      });

      return result;
    }
  }

  /**
   * Scheduler: Should be called by a cron job or scheduler
   * Runs on the last day of the month at 23:59:59 UTC
   * 
   * Usage with node-schedule:
   * const schedule = require('node-schedule');
   * // Last day of month at 23:59:59 UTC - simplified as "last day at 23:59"
   * schedule.scheduleJob('59 23 28-31 * *', async () => {
   *   const calculator = new MonthlyAwardCalculator();
   *   await calculator.run();
   * });
   */
  async run(): Promise<void> {
    try {
      const result = await this.calculateAndCreateAwards();

      if (result.errors.length > 0) {
        this.logger.error('Monthly award calculation encountered errors', {
          errorCount: result.errors.length,
          errors: result.errors,
        });

        // In production, send admin alert here
        // await notificationService.sendAdminAlert(...)
      }
    } catch (error) {
      this.logger.error('Unhandled error in monthly award scheduler', {
        error: error instanceof Error ? error.message : String(error),
      });

      // In production, send admin alert here
      // await notificationService.sendAdminAlert(...)
    }
  }

  /**
   * Private: Get period dates for the last 30 days
   * 
   * @returns Period with ISO dates and month number
   */
  private getPeriodDates(): MonthlyAwardCalculationResult['period'] {
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth() + 1; // 1-12

    // End date: today at 23:59:59
    const end = new Date(now);
    end.setUTCHours(23, 59, 59, 999);

    // Start date: 30 days ago at 00:00:00
    const start = new Date(now);
    start.setUTCDate(now.getUTCDate() - 30);
    start.setUTCHours(0, 0, 0, 0);

    return {
      year: currentYear,
      month: currentMonth,
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
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
    period: MonthlyAwardCalculationResult['period'],
    totalContestants: number
  ): Promise<Award> {
    try {
      const awardId = `AWARD-${period.year}-M${String(period.month).padStart(2, '0')}-${category.replace(' ', '_')}`;
      const now = Date.now();

      const award: Award = {
        id: awardId,
        awardId,
        type: AwardType.MONTHLY,
        category,
        period: {
          type: 'month',
          year: period.year,
          month: period.month,
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
        sourceSystem: 'monthly_award_calculator',
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

export default MonthlyAwardCalculator;
