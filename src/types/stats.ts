/**
 * Statistics and leaderboard types
 * Defines types for team member stats, leaderboard, and aggregations
 */

import { AwardCategory } from './award';

/**
 * Team member statistics (cached in Redis)
 * Based on design document TeamMemberStats
 */
export interface TeamMemberStats {
  // Identifiers
  id: string;
  userId: string;
  userName: string;

  // Period Information
  periodType: 'week' | 'month' | 'all-time';
  periodYear: number;
  periodMonth?: number;
  periodWeek?: number; // ISO week number

  // Award Counts
  weeklyAwards: number;
  monthlyAwards: number;
  totalAwards: number;

  // Score Statistics
  submissionCount: number;
  averageCreativityScore: number;
  highestCreativityScore: number;
  lowestCreativityScore: number;
  totalScore: number; // Sum of all scores

  // Category Breakdown
  awardsByCategory: Record<string, number>;

  // Submission Type Breakdown
  videoSubmissions: number;
  posterSubmissions: number;

  // Leaderboard Position
  overallRank: number;
  weeklyRank?: number;
  monthlyRank?: number;

  // Cached Data Metadata
  lastUpdated: number;
  expiresAt?: number; // TTL expiration
  cacheVersion: number;
}

/**
 * Leaderboard entry
 */
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  departmentId?: string;
  totalAwards: number;
  weeklyAwards: number;
  monthlyAwards: number;
  highestCreativityScore: number;
  averageCreativityScore: number;
  submissionCount: number;
  awardsByCategory: Record<string, number>;
  lastAwardDate?: number;
}

/**
 * Leaderboard query options
 */
export interface LeaderboardQueryOptions {
  period: 'week' | 'month' | 'all-time';
  sortBy: 'awards' | 'highest-score' | 'submission-count';
  category?: AwardCategory;
  limit?: number;
  offset?: number;
  mediaType?: 'video' | 'poster';
}

/**
 * Leaderboard result
 */
export interface LeaderboardResult {
  rankings: LeaderboardEntry[];
  totalCount: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  generatedAt: number;
  periodLabel: string;
  cacheHit: boolean;
}

/**
 * Detailed statistics for a single team member
 */
export interface TeamMemberDetailedStats {
  userId: string;
  userName: string;
  departmentId?: string;
  rank: number;
  totalAwards: number;
  weeklyAwards: number;
  monthlyAwards: number;
  categoryBreakdown: Record<string, number>;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  submissionCount: number;
  videoCount: number;
  posterCount: number;
  topSubmissions: Array<{
    id: string;
    mediaType: string;
    creativityScore: number;
    submissionTimestamp: number;
  }>;
  recentAwards: Array<{
    awardId: string;
    category: string;
    type: string;
    creativityScore: number;
    timestamp: number;
  }>;
  scoreDistribution: {
    range_0_20: number;
    range_21_40: number;
    range_41_60: number;
    range_61_80: number;
    range_81_100: number;
  };
  generatedAt: number;
}

/**
 * Dashboard summary statistics
 */
export interface DashboardSummary {
  totalSubmissions: number;
  averageCreativityScore: number;
  totalAwards: number;
  uniqueWinners: number;
  topCreators: Array<{
    name: string;
    userId: string;
    awardCount: number;
    highestScore: number;
  }>;
  submissionsByMediaType: {
    videos: number;
    posters: number;
  };
  awardsByCategory: Record<string, number>;
  awardsByType: {
    weekly: number;
    monthly: number;
  };
}

/**
 * Score distribution histogram
 */
export interface ScoreDistribution {
  buckets: Array<{
    range: string; // e.g., "0-10", "11-20"
    count: number;
    percentage: number;
  }>;
  mean: number;
  median: number;
  standardDeviation: number;
  min: number;
  max: number;
}

/**
 * Trend data point
 */
export interface TrendDataPoint {
  date: string; // ISO 8601
  submissions: number;
  averageScore: number;
  awards: number;
  uniqueCreators: number;
}

/**
 * Dashboard metrics data
 */
export interface DashboardMetrics {
  period: 'week' | 'month' | 'quarter' | 'year';
  summary: DashboardSummary;
  scoreDistribution: ScoreDistribution;
  trends: TrendDataPoint[];
  categoryBreakdown: Record<AwardCategory, number>;
  generatedAt: number;
  lastRefresh: number;
}

/**
 * Leaderboard cache key structure
 */
export function buildLeaderboardCacheKey(options: LeaderboardQueryOptions): string {
  const parts = [
    'leaderboard',
    options.period,
    options.sortBy,
    options.category || 'all',
    options.mediaType || 'all'
  ];
  return parts.join(':');
}

/**
 * Team member stats cache key structure
 */
export function buildTeamMemberStatsCacheKey(
  userId: string,
  period: 'week' | 'month' | 'all-time',
  year: number,
  month?: number,
  week?: number
): string {
  const parts = ['stats', period, userId];
  if (month) parts.push(month.toString());
  if (week) parts.push(`W${week}`);
  parts.push(year.toString());
  return parts.join(':');
}

/**
 * Cache TTL configuration (in seconds)
 */
export const CACHE_TTL = {
  LEADERBOARD: 60 * 60, // 1 hour
  TEAM_MEMBER_STATS: 24 * 60 * 60, // 24 hours
  DASHBOARD_METRICS: 2 * 60 * 60, // 2 hours
  SUBMISSION_SCORES: 30 * 24 * 60 * 60 // 30 days
};
