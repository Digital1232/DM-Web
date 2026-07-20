/**
 * Award-related types and interfaces
 * Defines types for awards, categories, and recognition
 */

/**
 * Type of award
 */
export enum AwardType {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly'
}

/**
 * Award categories
 * Based on requirement 5 - three predefined categories
 */
export enum AwardCategory {
  BEST_VIDEO = 'Best_Video',
  BEST_POSTER = 'Best_Poster',
  BEST_VIDEO_POSTER_CONTENT = 'Best_Video_Poster_Content'
}

/**
 * Award status
 */
export enum AwardStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  REVOKED = 'revoked'
}

/**
 * Period information for awards
 */
export interface AwardPeriod {
  type: 'week' | 'month';
  year: number;
  month?: number; // For monthly awards
  week?: number; // ISO week number for weekly awards
  start: string; // ISO 8601 date
  end: string; // ISO 8601 date
}

/**
 * Complete award record
 * Based on design document Award Record
 */
export interface Award {
  // Identifiers
  id: string;
  awardId: string; // Alias for consistency

  // Award Information
  type: AwardType;
  category: AwardCategory;

  // Period Information
  period: AwardPeriod;

  // Winner Information
  winnerId: string;
  winnerName: string;
  winnerDepartment?: string;

  // Submission Reference
  submissionId: string;
  jiraTaskId: string;

  // Award Metrics
  creativityScore: number;
  compositionScore: number;
  colorTheoryScore: number;
  balanceScore: number;

  // Ranking
  rankInPeriod: number; // 1st place in category for period
  totalContestants: number; // How many submissions competed

  // Calculation Information
  calculationTimestamp: number; // When award was calculated
  tiebreaker: 'no_tie' | 'earlier_submission'; // If applicable

  // Metadata
  status: AwardStatus;
  notificationSent: boolean;
  notificationTimestamp?: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Request to create an award
 */
export interface AwardCreateRequest {
  type: AwardType;
  category: AwardCategory;
  period: AwardPeriod;
  winnerId: string;
  winnerName: string;
  winnerDepartment?: string;
  submissionId: string;
  jiraTaskId: string;
  creativityScore: number;
  compositionScore: number;
  colorTheoryScore: number;
  balanceScore: number;
  rankInPeriod: number;
  totalContestants: number;
  tiebreaker?: 'no_tie' | 'earlier_submission';
}

/**
 * Award calculation result
 */
export interface AwardCalculationResult {
  type: AwardType;
  period: AwardPeriod;
  awardsCreated: Award[];
  totalAwarded: number;
  errors: AwardCalculationError[];
  calculationTimestamp: number;
}

/**
 * Error during award calculation
 */
export interface AwardCalculationError {
  category: AwardCategory;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Filter criteria for querying awards
 */
export interface AwardFilterCriteria {
  winnerId?: string;
  category?: AwardCategory;
  type?: AwardType;
  status?: AwardStatus;
  periodType?: 'week' | 'month';
  year?: number;
  month?: number; // For monthly filtering
  week?: number; // For weekly filtering
  createdAfter?: number;
  createdBefore?: number;
}

/**
 * Query result for awards
 */
export interface AwardQueryResult {
  awards: Award[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Award summary for a team member
 */
export interface AwardSummary {
  winnerId: string;
  winnerName: string;
  totalAwards: number;
  weeklyAwards: number;
  monthlyAwards: number;
  categories: Record<string, number>; // Award count per category
  highestScore: number;
  lowestScore: number;
  averageScore: number;
}

/**
 * Award category configuration
 */
export interface AwardCategoryConfig {
  category: AwardCategory;
  name: string;
  description: string;
  acceptedMediaTypes: string[]; // 'video' or 'poster'
  enabled: boolean;
  sortOrder: number;
}

/**
 * Predefined award categories configuration
 */
export const AWARD_CATEGORY_CONFIGS: Record<AwardCategory, AwardCategoryConfig> = {
  [AwardCategory.BEST_VIDEO]: {
    category: AwardCategory.BEST_VIDEO,
    name: 'Best Video',
    description: 'Recognition for outstanding video submissions',
    acceptedMediaTypes: ['video'],
    enabled: true,
    sortOrder: 1
  },
  [AwardCategory.BEST_POSTER]: {
    category: AwardCategory.BEST_POSTER,
    name: 'Best Poster',
    description: 'Recognition for outstanding poster submissions',
    acceptedMediaTypes: ['poster'],
    enabled: true,
    sortOrder: 2
  },
  [AwardCategory.BEST_VIDEO_POSTER_CONTENT]: {
    category: AwardCategory.BEST_VIDEO_POSTER_CONTENT,
    name: 'Best Video/Poster Content',
    description: 'Recognition for outstanding content (video or poster)',
    acceptedMediaTypes: ['video', 'poster'],
    enabled: true,
    sortOrder: 3
  }
};

/**
 * Get categories that accept a specific media type
 */
export function getCategoriesForMediaType(mediaType: string): AwardCategory[] {
  return Object.entries(AWARD_CATEGORY_CONFIGS)
    .filter(([_, config]) => config.acceptedMediaTypes.includes(mediaType))
    .map(([category]) => category as AwardCategory);
}

/**
 * Get enabled award categories
 */
export function getEnabledCategories(): AwardCategory[] {
  return Object.entries(AWARD_CATEGORY_CONFIGS)
    .filter(([_, config]) => config.enabled)
    .map(([category]) => category as AwardCategory);
}
