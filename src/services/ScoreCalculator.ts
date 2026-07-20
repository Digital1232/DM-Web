/**
 * Score Calculator Module
 * 
 * Handles creativity score calculation with validation
 * Formula: Creativity Score = (Composition × 0.35) + (Color_Theory × 0.35) + (Balance × 0.30)
 * 
 * Requirements:
 * - Validates all subscores are in [0, 100]
 * - Validates final score is in [0, 100]
 * - Logs formula execution for verification
 */

import { Logger } from '../utils/logger';
import {
  EvaluationSubscores,
  CREATIVITY_SCORE_WEIGHTS,
} from '../types/evaluation';

/**
 * Result of score calculation with audit trail
 */
export interface CalculationResult {
  compositionScore: number;
  colorTheoryScore: number;
  balanceScore: number;
  creativityScore: number;
  calculation: string; // Human-readable calculation
  timestamp: number;
  validationPassed: boolean;
  errors: string[];
}

/**
 * ScoreCalculator handles all creativity score calculations with validation
 * 
 * Ensures:
 * 1. All subscores are valid (0-100 range)
 * 2. Formula is correctly applied
 * 3. Final score is in valid range
 * 4. All calculations are logged for verification
 */
export class ScoreCalculator {
  private logger: Logger;

  // Weights from design specification (Requirement 2.4)
  private readonly compositionWeight = CREATIVITY_SCORE_WEIGHTS.composition; // 0.35
  private readonly colorTheoryWeight = CREATIVITY_SCORE_WEIGHTS.colorTheory; // 0.35
  private readonly balanceWeight = CREATIVITY_SCORE_WEIGHTS.balance; // 0.30

  constructor() {
    this.logger = new Logger('ScoreCalculator');

    // Verify weights sum to 1.0
    const totalWeight = this.compositionWeight + this.colorTheoryWeight + this.balanceWeight;
    if (Math.abs(totalWeight - 1.0) > 0.001) {
      this.logger.warn(
        `Warning: Weights sum to ${totalWeight} instead of 1.0. Weights: composition=${this.compositionWeight}, colorTheory=${this.colorTheoryWeight}, balance=${this.balanceWeight}`
      );
    } else {
      this.logger.debug(
        `Weights verified: composition=${this.compositionWeight}, colorTheory=${this.colorTheoryWeight}, balance=${this.balanceWeight}, sum=${totalWeight}`
      );
    }
  }

  /**
   * Calculate creativity score from subscores
   * 
   * Requirement 2.4: Creativity Score = (Composition × 0.35) + (Color_Theory × 0.35) + (Balance × 0.30)
   * 
   * @param subscores The three evaluation subscores
   * @returns Calculation result with score and validation details
   */
  calculateCreativityScore(subscores: EvaluationSubscores): CalculationResult {
    const { composition, colorTheory, balance } = subscores;
    const errors: string[] = [];
    const timestamp = Date.now();

    // Validate all subscores are in range [0, 100]
    // Requirement 3.2: Validate all subscores are in [0, 100]
    if (!this.validateSubscore(composition, 'composition')) {
      errors.push(`Invalid composition score: ${composition}. Must be in range [0, 100]`);
    }
    if (!this.validateSubscore(colorTheory, 'colorTheory')) {
      errors.push(`Invalid colorTheory score: ${colorTheory}. Must be in range [0, 100]`);
    }
    if (!this.validateSubscore(balance, 'balance')) {
      errors.push(`Invalid balance score: ${balance}. Must be in range [0, 100]`);
    }

    const validationPassed = errors.length === 0;

    // Calculate weighted average (even if validation failed, for logging)
    // Formula: (Composition × 0.35) + (Color Theory × 0.35) + (Balance × 0.30)
    const rawScore =
      composition * this.compositionWeight +
      colorTheory * this.colorTheoryWeight +
      balance * this.balanceWeight;

    // Round to nearest integer
    let creativityScore = Math.round(rawScore);

    // Clamp to valid range [0, 100]
    // Requirement 3.2: Validate final score is in [0, 100]
    const originalScore = creativityScore;
    creativityScore = Math.max(0, Math.min(100, creativityScore));

    if (originalScore !== creativityScore) {
      errors.push(
        `Final score clamped from ${originalScore} to ${creativityScore} to stay in range [0, 100]`
      );
    }

    // Build human-readable calculation for logging and verification
    const calculation = this.buildCalculationString({
      composition,
      colorTheory,
      balance,
      rawScore,
      creativityScore,
    });

    // Log formula execution for verification (Requirement 3.2)
    if (validationPassed) {
      this.logger.info(
        `Creativity score calculated: ${creativityScore}/100. Calculation: ${calculation}`
      );
    } else {
      this.logger.warn(
        `Creativity score calculation completed with validation errors: ${creativityScore}/100. Errors: ${errors.join('; ')}`
      );
    }

    return {
      compositionScore: composition,
      colorTheoryScore: colorTheory,
      balanceScore: balance,
      creativityScore,
      calculation,
      timestamp,
      validationPassed,
      errors,
    };
  }

  /**
   * Validate a single subscore is in valid range
   */
  private validateSubscore(score: number, name: string): boolean {
    if (typeof score !== 'number' || isNaN(score)) {
      this.logger.debug(`${name} is not a valid number: ${score}`);
      return false;
    }

    if (score < 0 || score > 100) {
      this.logger.debug(`${name} is out of range [0, 100]: ${score}`);
      return false;
    }

    return true;
  }

  /**
   * Build human-readable calculation string for logging
   * Example: "(80×0.35) + (75×0.35) + (70×0.30) = 28.0 + 26.25 + 21.0 = 75.25 → 75"
   */
  private buildCalculationString(params: {
    composition: number;
    colorTheory: number;
    balance: number;
    rawScore: number;
    creativityScore: number;
  }): string {
    const { composition, colorTheory, balance, rawScore, creativityScore } = params;

    const compositionCalc = composition * this.compositionWeight;
    const colorTheoryCalc = colorTheory * this.colorTheoryWeight;
    const balanceCalc = balance * this.balanceWeight;

    return (
      `(${composition}×${this.compositionWeight}) + ` +
      `(${colorTheory}×${this.colorTheoryWeight}) + ` +
      `(${balance}×${this.balanceWeight}) = ` +
      `${compositionCalc.toFixed(2)} + ${colorTheoryCalc.toFixed(2)} + ${balanceCalc.toFixed(2)} = ` +
      `${rawScore.toFixed(2)} → ${creativityScore}`
    );
  }

  /**
   * Batch calculate scores for multiple submissions
   * Useful for re-evaluation or bulk processing
   */
  calculateBatch(subscoredArray: EvaluationSubscores[]): CalculationResult[] {
    this.logger.info(`Batch calculating ${subscoredArray.length} creativity scores`);

    const results = subscoredArray.map((subscores) =>
      this.calculateCreativityScore(subscores)
    );

    const successCount = results.filter((r) => r.validationPassed).length;
    const failureCount = results.length - successCount;

    this.logger.info(
      `Batch calculation complete: ${successCount} successful, ${failureCount} with errors`
    );

    return results;
  }

  /**
   * Validate all calculations in a result set
   * Used for audit and verification purposes
   */
  validateResults(results: CalculationResult[]): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];

      // Check validation passed
      if (!result.validationPassed) {
        errors.push(
          `Result ${i}: Validation failed - ${result.errors.join('; ')}`
        );
        continue;
      }

      // Verify score is in range
      if (result.creativityScore < 0 || result.creativityScore > 100) {
        errors.push(
          `Result ${i}: Final score ${result.creativityScore} out of range [0, 100]`
        );
      }

      // Verify subscores are in range
      if (result.compositionScore < 0 || result.compositionScore > 100) {
        errors.push(
          `Result ${i}: Composition score ${result.compositionScore} out of range [0, 100]`
        );
      }
      if (result.colorTheoryScore < 0 || result.colorTheoryScore > 100) {
        errors.push(
          `Result ${i}: Color Theory score ${result.colorTheoryScore} out of range [0, 100]`
        );
      }
      if (result.balanceScore < 0 || result.balanceScore > 100) {
        errors.push(`Result ${i}: Balance score ${result.balanceScore} out of range [0, 100]`);
      }

      // Re-calculate to verify consistency
      const recalculated = this.calculateCreativityScore({
        composition: result.compositionScore,
        colorTheory: result.colorTheoryScore,
        balance: result.balanceScore,
      });

      if (recalculated.creativityScore !== result.creativityScore) {
        errors.push(
          `Result ${i}: Recalculation mismatch - original=${result.creativityScore}, recalculated=${recalculated.creativityScore}`
        );
      }
    }

    const valid = errors.length === 0;
    return {
      valid,
      errors,
    };
  }

  /**
   * Get score calculator metadata (for debugging and audit)
   */
  getMetadata(): {
    compositionWeight: number;
    colorTheoryWeight: number;
    balanceWeight: number;
    totalWeight: number;
    formula: string;
  } {
    const totalWeight = this.compositionWeight + this.colorTheoryWeight + this.balanceWeight;

    return {
      compositionWeight: this.compositionWeight,
      colorTheoryWeight: this.colorTheoryWeight,
      balanceWeight: this.balanceWeight,
      totalWeight,
      formula:
        `Creativity Score = (Composition × ${this.compositionWeight}) + ` +
        `(ColorTheory × ${this.colorTheoryWeight}) + ` +
        `(Balance × ${this.balanceWeight})`,
    };
  }
}

export default ScoreCalculator;
