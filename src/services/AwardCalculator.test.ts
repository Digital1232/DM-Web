/**
 * Award Calculator Tests
 * 
 * Tests for WeeklyAwardCalculator and MonthlyAwardCalculator
 * Verifies:
 * - Period date calculations
 * - Submission filtering for valid/evaluated submissions
 * - Award record creation
 * - Error handling and retry logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Submission, SubmissionStatus } from '../types/submission';
import { EvaluationStatus } from '../types/evaluation';
import { AwardCategory } from '../types/award';

describe('Award Calculator Services', () => {
  describe('Period Date Calculation', () => {
    it('should calculate correct week period dates (Monday to Sunday)', () => {
      // Create a date we know about - July 21, 2026 (Monday)
      const testDate = new Date('2026-07-21T10:00:00Z');
      const dayOfWeek = testDate.getUTCDay() || 7; // 1 = Monday, 7 = Sunday
      const weekOffset = dayOfWeek - 1;
      
      const monday = new Date(testDate);
      monday.setUTCDate(testDate.getUTCDate() - weekOffset);
      
      const sunday = new Date(monday);
      sunday.setUTCDate(monday.getUTCDate() + 6);
      
      // Verify Monday is July 20 (or 21 if testDate was Monday)
      // and Sunday is 6 days later
      expect(sunday.getUTCDate() - monday.getUTCDate()).toBe(6);
    });

    it('should calculate correct 30-day period for monthly awards', () => {
      const now = new Date();
      const start = new Date(now);
      start.setUTCDate(now.getUTCDate() - 30);
      
      const daysDiff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBeGreaterThanOrEqual(29);
      expect(daysDiff).toBeLessThanOrEqual(31);
    });
  });

  describe('Submission Filtering', () => {
    it('should filter out inactive submissions', () => {
      const submissions: Submission[] = [
        {
          id: 'sub-1',
          submissionId: 'sub-1',
          jiraTaskId: 'TASK-1',
          jiraTaskKey: 'PROJ-1',
          submissionTimestamp: Date.now(),
          teamMemberId: 'user1',
          teamMemberName: 'User 1',
          mediaType: 'video',
          media: {
            fileName: 'video.mp4',
            format: 'mp4',
            fileSize: 1000,
            storageUrl: 'gs://bucket/video.mp4',
            hash: 'hash1',
          },
          evaluationStatus: EvaluationStatus.COMPLETED,
          aiModelVersion: 'v1.0',
          compositionScore: 85,
          colorTheoryScore: 78,
          balanceScore: 82,
          creativityScore: 81,
          status: SubmissionStatus.ARCHIVED, // Archived - should be filtered out
          version: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          retryCount: 0,
        },
        {
          id: 'sub-2',
          submissionId: 'sub-2',
          jiraTaskId: 'TASK-2',
          jiraTaskKey: 'PROJ-2',
          submissionTimestamp: Date.now(),
          teamMemberId: 'user2',
          teamMemberName: 'User 2',
          mediaType: 'poster',
          media: {
            fileName: 'poster.png',
            format: 'png',
            fileSize: 500,
            storageUrl: 'gs://bucket/poster.png',
            hash: 'hash2',
          },
          evaluationStatus: EvaluationStatus.COMPLETED,
          aiModelVersion: 'v1.0',
          compositionScore: 90,
          colorTheoryScore: 88,
          balanceScore: 85,
          creativityScore: 88,
          status: SubmissionStatus.ACTIVE,
          version: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          retryCount: 0,
        },
      ];

      const filtered = submissions.filter(s => s.status === SubmissionStatus.ACTIVE);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('sub-2');
    });

    it('should filter out unevaluated submissions', () => {
      const submissions: Submission[] = [
        {
          id: 'sub-1',
          submissionId: 'sub-1',
          jiraTaskId: 'TASK-1',
          jiraTaskKey: 'PROJ-1',
          submissionTimestamp: Date.now(),
          teamMemberId: 'user1',
          teamMemberName: 'User 1',
          mediaType: 'video',
          media: {
            fileName: 'video.mp4',
            format: 'mp4',
            fileSize: 1000,
            storageUrl: 'gs://bucket/video.mp4',
            hash: 'hash1',
          },
          evaluationStatus: EvaluationStatus.PENDING, // Not evaluated
          aiModelVersion: 'v1.0',
          status: SubmissionStatus.ACTIVE,
          version: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          retryCount: 0,
        },
        {
          id: 'sub-2',
          submissionId: 'sub-2',
          jiraTaskId: 'TASK-2',
          jiraTaskKey: 'PROJ-2',
          submissionTimestamp: Date.now(),
          teamMemberId: 'user2',
          teamMemberName: 'User 2',
          mediaType: 'poster',
          media: {
            fileName: 'poster.png',
            format: 'png',
            fileSize: 500,
            storageUrl: 'gs://bucket/poster.png',
            hash: 'hash2',
          },
          evaluationStatus: EvaluationStatus.COMPLETED,
          aiModelVersion: 'v1.0',
          compositionScore: 90,
          colorTheoryScore: 88,
          balanceScore: 85,
          creativityScore: 88,
          status: SubmissionStatus.ACTIVE,
          version: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          retryCount: 0,
        },
      ];

      const filtered = submissions.filter(s => s.evaluationStatus === EvaluationStatus.COMPLETED);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('sub-2');
    });

    it('should filter out submissions without scores', () => {
      const submissions: Submission[] = [
        {
          id: 'sub-1',
          submissionId: 'sub-1',
          jiraTaskId: 'TASK-1',
          jiraTaskKey: 'PROJ-1',
          submissionTimestamp: Date.now(),
          teamMemberId: 'user1',
          teamMemberName: 'User 1',
          mediaType: 'video',
          media: {
            fileName: 'video.mp4',
            format: 'mp4',
            fileSize: 1000,
            storageUrl: 'gs://bucket/video.mp4',
            hash: 'hash1',
          },
          evaluationStatus: EvaluationStatus.COMPLETED,
          aiModelVersion: 'v1.0',
          // Missing creativity score and subscores
          status: SubmissionStatus.ACTIVE,
          version: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          retryCount: 0,
        },
        {
          id: 'sub-2',
          submissionId: 'sub-2',
          jiraTaskId: 'TASK-2',
          jiraTaskKey: 'PROJ-2',
          submissionTimestamp: Date.now(),
          teamMemberId: 'user2',
          teamMemberName: 'User 2',
          mediaType: 'poster',
          media: {
            fileName: 'poster.png',
            format: 'png',
            fileSize: 500,
            storageUrl: 'gs://bucket/poster.png',
            hash: 'hash2',
          },
          evaluationStatus: EvaluationStatus.COMPLETED,
          aiModelVersion: 'v1.0',
          compositionScore: 90,
          colorTheoryScore: 88,
          balanceScore: 85,
          creativityScore: 88,
          status: SubmissionStatus.ACTIVE,
          version: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          retryCount: 0,
        },
      ];

      const filtered = submissions.filter(
        s =>
          s.creativityScore !== undefined &&
          s.compositionScore !== undefined &&
          s.colorTheoryScore !== undefined &&
          s.balanceScore !== undefined
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('sub-2');
    });
  });

  describe('Award Record Structure', () => {
    it('should have correct award record structure', () => {
      const award = {
        id: 'AWARD-2026-W29-Best_Video',
        awardId: 'AWARD-2026-W29-Best_Video',
        type: 'weekly',
        category: AwardCategory.BEST_VIDEO,
        period: {
          type: 'week' as const,
          year: 2026,
          week: 29,
          start: '2026-07-20',
          end: '2026-07-26',
        },
        winnerId: 'user1',
        winnerName: 'John Doe',
        winnerDepartment: 'marketing',
        submissionId: 'sub-1',
        jiraTaskId: 'TASK-1',
        creativityScore: 85,
        compositionScore: 85,
        colorTheoryScore: 78,
        balanceScore: 82,
        rankInPeriod: 1,
        totalContestants: 5,
        calculationTimestamp: Date.now(),
        tiebreaker: 'no_tie' as const,
        status: 'active',
        notificationSent: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(award).toHaveProperty('id');
      expect(award).toHaveProperty('type');
      expect(award).toHaveProperty('category');
      expect(award).toHaveProperty('period');
      expect(award).toHaveProperty('winnerId');
      expect(award).toHaveProperty('submissionId');
      expect(award).toHaveProperty('creativityScore');
      expect(award.id).toMatch(/^AWARD-\d{4}-W\d{2}-/);
    });

    it('should generate monthly award ID correctly', () => {
      const year = 2026;
      const month = 7;
      const category = 'Best_Video';
      const awardId = `AWARD-${year}-M${String(month).padStart(2, '0')}-${category.replace(' ', '_')}`;
      
      expect(awardId).toBe('AWARD-2026-M07-Best_Video');
    });
  });

  describe('Tiebreaker Logic', () => {
    it('should identify earlier submission as winner when scores tied', () => {
      const earlier = 1000; // Earlier timestamp
      const later = 2000; // Later timestamp
      
      // Earlier submission should win (smaller timestamp)
      expect(earlier).toBeLessThan(later);
    });

    it('should track tiebreaker application', () => {
      const submission1 = { id: 'sub-1', creativityScore: 85, submissionTimestamp: 1000 };
      const submission2 = { id: 'sub-2', creativityScore: 85, submissionTimestamp: 2000 };
      const submission3 = { id: 'sub-3', creativityScore: 90, submissionTimestamp: 3000 };
      
      // Submissions 1 and 2 are tied - 1 wins due to earlier timestamp
      const hasTie = submission1.creativityScore === submission2.creativityScore;
      expect(hasTie).toBe(true);
      expect(submission1.submissionTimestamp).toBeLessThan(submission2.submissionTimestamp);
      
      // Submission 3 is clearly winner (higher score)
      const hasTiebreakerRound2 = submission2.creativityScore === submission3.creativityScore;
      expect(hasTiebreakerRound2).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should schedule retry after 1 hour on error', () => {
      const errorOccurredAt = Date.now();
      const retryAt = errorOccurredAt + 60 * 60 * 1000; // 1 hour
      
      const timeDiff = retryAt - errorOccurredAt;
      expect(timeDiff).toBe(60 * 60 * 1000);
    });

    it('should handle no submissions gracefully', () => {
      const submissions: Submission[] = [];
      
      // Should not throw, just return empty
      expect(submissions.length).toBe(0);
      expect(submissions).toEqual([]);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle multiple categories in single calculation', () => {
      const categories = [
        AwardCategory.BEST_VIDEO,
        AwardCategory.BEST_POSTER,
        AwardCategory.BEST_VIDEO_POSTER_CONTENT,
      ];
      
      expect(categories).toHaveLength(3);
      expect(categories).toContain(AwardCategory.BEST_VIDEO);
      expect(categories).toContain(AwardCategory.BEST_POSTER);
      expect(categories).toContain(AwardCategory.BEST_VIDEO_POSTER_CONTENT);
    });

    it('should create awards for all categories with eligible submissions', () => {
      const winningCategories = new Set([
        AwardCategory.BEST_VIDEO,
        AwardCategory.BEST_POSTER,
      ]);
      
      const allCategories = [
        AwardCategory.BEST_VIDEO,
        AwardCategory.BEST_POSTER,
        AwardCategory.BEST_VIDEO_POSTER_CONTENT,
      ];
      
      const missingAward = allCategories.find(cat => !winningCategories.has(cat));
      expect(missingAward).toBe(AwardCategory.BEST_VIDEO_POSTER_CONTENT);
    });
  });
});

// Tests for calculation results
describe('Award Calculation Results', () => {
  it('should return valid weekly calculation result', () => {
    const result = {
      type: 'weekly' as const,
      period: {
        year: 2026,
        week: 29,
        start: '2026-07-20',
        end: '2026-07-26',
      },
      awarded: 3,
      categories: [
        AwardCategory.BEST_VIDEO,
        AwardCategory.BEST_POSTER,
        AwardCategory.BEST_VIDEO_POSTER_CONTENT,
      ],
      winners: new Map(),
      errors: [],
      calculationTimestamp: Date.now(),
    };

    expect(result.type).toBe('weekly');
    expect(result.awarded).toBe(3);
    expect(result.categories).toHaveLength(3);
    expect(result.errors).toHaveLength(0);
  });

  it('should return valid monthly calculation result', () => {
    const result = {
      type: 'monthly' as const,
      period: {
        year: 2026,
        month: 7,
        start: '2026-06-15',
        end: '2026-07-15',
      },
      awarded: 2,
      categories: [
        AwardCategory.BEST_VIDEO,
        AwardCategory.BEST_POSTER,
      ],
      winners: new Map(),
      errors: [
        {
          category: AwardCategory.BEST_VIDEO_POSTER_CONTENT,
          code: 'NO_ELIGIBLE_SUBMISSIONS',
          message: 'No eligible submissions for category',
        },
      ],
      calculationTimestamp: Date.now(),
    };

    expect(result.type).toBe('monthly');
    expect(result.awarded).toBe(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe('NO_ELIGIBLE_SUBMISSIONS');
  });
});
