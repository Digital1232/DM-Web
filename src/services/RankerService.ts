/**
 * RankerService: Deterministic ranking and selection logic for submissions
 * 
 * Responsibilities:
 * - Rank submissions by creativity score
 * - Apply tiebreaker rule: earlier submission timestamp wins
 * - Ensure deterministic consistent ordering for reproducibility
 * 
 * Based on Requirements 3, 4, 11 and design specifications for award calculation
 */

import { Submission, SubmissionStatus } from '../types/submission';
import { EvaluationStatus } from '../types/evaluation';
import { AwardCategory, getCategoriesForMediaType } from '../types/award';

/**
 * Result of ranking submissions
 */
export interface RankingResult {
  rankedSubmissions: Submission[];
  winners: Map<AwardCategory, Submission>; // Best submission per category
  tiebreakersApplied: Array<{
    category: AwardCategory;
    tieBreakerCount: number;
    affectedSubmissionIds: string[];
  }>;
  totalSubmissionsRanked: number;
  calculationTimestamp: number;
}

/**
 * Submission with ranking metadata
 */
export interface RankedSubmission extends Submission {
  rankMetadata: {
    globalRank: number;
    categoryRank: string; // e.g., "Best_Video:1"
    tieWasBroken: boolean;
    tieBreakerReason: string;
  };
}

/**
 * RankerService: Handles deterministic ranking of submissions by creativity score
 * with tiebreaker logic for fair award selection
 */
export class RankerService {
  /**
   * Private constructor - use static factory methods
   */
  private constructor() {}

  /**
   * Rank submissions by creativity score for a given category
   * 
   * Applies:
   * - Primary sort: Creativity Score (descending, highest first)
   * - Tiebreaker: Earlier submission timestamp wins (ascending, earliest first)
   * 
   * This ensures deterministic, reproducible ordering.
   * 
   * @param submissions - Array of submissions to rank
   * @param category - Award category to filter and rank by
   * @returns Ranked array of submissions for the category
   * 
   * @example
   * const winners = RankerService.rankByCategory(submissions, AwardCategory.BEST_VIDEO);
   * const topVideo = winners[0]; // Highest scored video, with tiebreaker applied if needed
   */
  static rankByCategory(
    submissions: Submission[],
    category: AwardCategory
  ): Submission[] {
    // Filter submissions valid for this category
    const validSubmissions = this.filterValidSubmissionsForCategory(submissions, category);

    if (validSubmissions.length === 0) {
      return [];
    }

    // Sort by creativity score (descending), then by submission timestamp (ascending) for tiebreaker
    const ranked = [...validSubmissions].sort((a, b) => {
      const scoreA = a.creativityScore ?? 0;
      const scoreB = b.creativityScore ?? 0;

      // Primary sort: Higher creativity score comes first (descending)
      if (scoreA !== scoreB) {
        return scoreB - scoreA; // Higher score first
      }

      // Tiebreaker: Earlier submission timestamp wins (ascending)
      const timeA = a.submissionTimestamp ?? 0;
      const timeB = b.submissionTimestamp ?? 0;
      return timeA - timeB; // Earlier timestamp first
    });

    return ranked;
  }

  /**
   * Select the single winner for a category
   * 
   * Returns the highest-ranked submission (best score with tiebreaker applied)
   * 
   * @param submissions - Array of submissions to select winner from
   * @param category - Award category
   * @returns The winning submission, or null if no valid submissions
   */
  static selectWinner(
    submissions: Submission[],
    category: AwardCategory
  ): Submission | null {
    const ranked = this.rankByCategory(submissions, category);
    return ranked.length > 0 ? ranked[0] : null;
  }

  /**
   * Rank submissions and identify winners for all categories
   * 
   * Executes complete ranking workflow:
   * 1. Filter for valid, evaluated submissions
   * 2. Rank by category
   * 3. Select winner for each category
   * 4. Track tiebreaker applications
   * 
   * @param submissions - All submissions in the period
   * @param targetCategories - Categories to rank for
   * @returns Complete ranking result with winners
   */
  static rankAndSelectWinners(
    submissions: Submission[],
    targetCategories: AwardCategory[]
  ): RankingResult {
    const winners = new Map<AwardCategory, Submission>();
    const tiebreakersApplied: Array<{
      category: AwardCategory;
      tieBreakerCount: number;
      affectedSubmissionIds: string[];
    }> = [];

    const rankedByCategory = new Map<AwardCategory, Submission[]>();

    for (const category of targetCategories) {
      const categorySubmissions = this.rankByCategory(submissions, category);
      rankedByCategory.set(category, categorySubmissions);

      // Select winner for this category
      if (categorySubmissions.length > 0) {
        const winner = categorySubmissions[0];
        winners.set(category, winner);

        // Track if tiebreaker was applied
        const tiebreakerInfo = this.analyzeTiebreakerUsage(categorySubmissions);
        if (tiebreakerInfo.tieBreakerCount > 0) {
          tiebreakersApplied.push({
            category,
            tieBreakerCount: tiebreakerInfo.tieBreakerCount,
            affectedSubmissionIds: tiebreakerInfo.affectedSubmissionIds
          });
        }
      }
    }

    // Flatten all ranked submissions for the result
    const allRankedSubmissions = Array.from(rankedByCategory.values()).flat();

    return {
      rankedSubmissions: allRankedSubmissions,
      winners,
      tiebreakersApplied,
      totalSubmissionsRanked: allRankedSubmissions.length,
      calculationTimestamp: Date.now()
    };
  }

  /**
   * Verify ranking consistency and determinism
   * 
   * Tests that ranking the same submission set multiple times produces identical ordering
   * 
   * @param submissions - Submissions to test
   * @param category - Category to rank for
   * @param iterations - Number of ranking iterations to compare
   * @returns Object indicating if ranking is deterministic
   */
  static verifyDeterminism(
    submissions: Submission[],
    category: AwardCategory,
    iterations: number = 3
  ): {
    isDeterministic: boolean;
    rankings: Submission[][];
    consistency: number; // Percentage of consistent rankings across iterations
  } {
    const rankings: Submission[][] = [];

    for (let i = 0; i < iterations; i++) {
      rankings.push(this.rankByCategory(submissions, category));
    }

    // Compare all rankings with first ranking
    let consistentCount = 1; // First ranking is always consistent with itself
    const firstRanking = rankings[0];

    for (let i = 1; i < rankings.length; i++) {
      if (this.rankingsAreEqual(firstRanking, rankings[i])) {
        consistentCount++;
      }
    }

    const consistency = (consistentCount / iterations) * 100;

    return {
      isDeterministic: consistentCount === iterations,
      rankings,
      consistency
    };
  }

  /**
   * Get all submissions tied for the highest score in a category
   * 
   * Useful for auditing and understanding tiebreaker situations
   * 
   * @param submissions - Submissions to analyze
   * @param category - Award category
   * @returns Submissions with the highest score (before tiebreaker applied)
   */
  static getTiedForHighestScore(
    submissions: Submission[],
    category: AwardCategory
  ): Submission[] {
    const validSubmissions = this.filterValidSubmissionsForCategory(submissions, category);

    if (validSubmissions.length === 0) {
      return [];
    }

    // Find the highest score
    const highestScore = Math.max(...validSubmissions.map(s => s.creativityScore ?? 0));

    // Return all submissions with that score
    return validSubmissions.filter(s => (s.creativityScore ?? 0) === highestScore);
  }

  /**
   * Generate ranking report for auditing
   * 
   * Useful for verifying ranking correctness and understanding award decisions
   * 
   * @param submissions - Submissions that were ranked
   * @param category - Category that was ranked
   * @returns Human-readable ranking report
   */
  static generateRankingReport(
    submissions: Submission[],
    category: AwardCategory
  ): string {
    const ranked = this.rankByCategory(submissions, category);

    if (ranked.length === 0) {
      return `No valid submissions found for category: ${category}`;
    }

    let report = `\n${'='.repeat(80)}\n`;
    report += `RANKING REPORT: ${category}\n`;
    report += `Generated: ${new Date().toISOString()}\n`;
    report += `Total Submissions: ${ranked.length}\n`;
    report += `${'='.repeat(80)}\n\n`;

    report += `RANKINGS:\n`;
    report += `${'Rank'.padEnd(6)}| ${'Score'.padEnd(8)}| ${'Timestamp'.padEnd(20)}| ${'Team Member'.padEnd(20)}| ${'Task ID'.padEnd(12)}\n`;
    report += `${'-'.repeat(80)}\n`;

    ranked.forEach((sub, index) => {
      const rank = (index + 1).toString();
      const score = (sub.creativityScore ?? 0).toFixed(1);
      const timestamp = new Date(sub.submissionTimestamp).toISOString().substring(0, 19);
      const memberName = sub.teamMemberName.substring(0, 19);
      const taskId = sub.jiraTaskId.substring(0, 11);

      report += `${rank.padEnd(6)}| ${score.padEnd(8)}| ${timestamp.padEnd(20)}| ${memberName.padEnd(20)}| ${taskId.padEnd(12)}\n`;
    });

    report += `\n${'='.repeat(80)}\n`;
    report += `WINNER: ${ranked[0].teamMemberName} (Score: ${ranked[0].creativityScore})\n`;
    report += `${'='.repeat(80)}\n`;

    return report;
  }

  /**
   * Private: Filter valid submissions for a category
   */
  private static filterValidSubmissionsForCategory(
    submissions: Submission[],
    category: AwardCategory
  ): Submission[] {
    return submissions.filter(sub => {
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

      // Media type must match category
      const acceptedCategories = this.categoriesForMediaType(sub.mediaType);
      if (!acceptedCategories.includes(category)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Private: Get valid categories for a media type
   */
  private static categoriesForMediaType(mediaType: string): AwardCategory[] {
    return getCategoriesForMediaType(mediaType);
  }

  /**
   * Private: Analyze tiebreaker usage in ranked submissions
   */
  private static analyzeTiebreakerUsage(rankedSubmissions: Submission[]): {
    tieBreakerCount: number;
    affectedSubmissionIds: string[];
  } {
    if (rankedSubmissions.length === 0) {
      return { tieBreakerCount: 0, affectedSubmissionIds: [] };
    }

    let tieBreakerCount = 0;
    const affectedIds: string[] = [];

    // Look for groups with identical scores where tiebreaker determined ranking
    for (let i = 0; i < rankedSubmissions.length - 1; i++) {
      const current = rankedSubmissions[i];
      const next = rankedSubmissions[i + 1];

      // If scores are equal, tiebreaker was used
      if (
        (current.creativityScore ?? 0) === (next.creativityScore ?? 0)
      ) {
        tieBreakerCount++;
        if (!affectedIds.includes(current.id)) {
          affectedIds.push(current.id);
        }
        if (!affectedIds.includes(next.id)) {
          affectedIds.push(next.id);
        }
      }
    }

    return { tieBreakerCount, affectedSubmissionIds: affectedIds };
  }

  /**
   * Private: Compare two ranking arrays for equality
   */
  private static rankingsAreEqual(ranking1: Submission[], ranking2: Submission[]): boolean {
    if (ranking1.length !== ranking2.length) {
      return false;
    }

    for (let i = 0; i < ranking1.length; i++) {
      if (ranking1[i].id !== ranking2[i].id) {
        return false;
      }
    }

    return true;
  }
}

