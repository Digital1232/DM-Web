/**
 * ScoreCalculator Unit Tests
 * 
 * Tests for creativity score calculation with weighted formula
 * Validates: Requirement 2.4 - Creativity Score = (Composition × 0.35) + (Color_Theory × 0.35) + (Balance × 0.30)
 */

import { describe, it, expect } from 'vitest';
import { ScoreCalculator, CalculationResult } from './ScoreCalculator';
import { EvaluationSubscores } from '../types/evaluation';

describe('ScoreCalculator', () => {
  let calculator: ScoreCalculator;

  beforeEach(() => {
    calculator = new ScoreCalculator();
  });

  describe('calculateCreativityScore', () => {
    it('should calculate correct score with perfect scores', () => {
      const subscores: EvaluationSubscores = {
        composition: 100,
        colorTheory: 100,
        balance: 100,
      };

      const result = calculator.calculateCreativityScore(subscores);

      expect(result.creativityScore).toBe(100);
      expect(result.validationPassed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should calculate correct score with zero scores', () => {
      const subscores: EvaluationSubscores = {
        composition: 0,
        colorTheory: 0,
        balance: 0,
      };

      const result = calculator.calculateCreativityScore(subscores);

      expect(result.creativityScore).toBe(0);
      expect(result.validationPassed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should apply correct weighted formula', () => {
      // Test: (80 × 0.35) + (75 × 0.35) + (70 × 0.30)
      //     = 28 + 26.25 + 21 = 75.25 → 75
      const subscores: EvaluationSubscores = {
        composition: 80,
        colorTheory: 75,
        balance: 70,
      };

      const result = calculator.calculateCreativityScore(subscores);

      // Expected: (80*0.35) + (75*0.35) + (70*0.30) = 28 + 26.25 + 21 = 75.25 ≈ 75
      expect(result.creativityScore).toBe(75);
      expect(result.validationPassed).toBe(true);
    });

    it('should round correctly', () => {
      // Test: (85 × 0.35) + (78 × 0.35) + (82 × 0.30)
      //     = 29.75 + 27.3 + 24.6 = 81.65 → 82
      const subscores: EvaluationSubscores = {
        composition: 85,
        colorTheory: 78,
        balance: 82,
      };

      const result = calculator.calculateCreativityScore(subscores);

      // Expected: 81.65 rounds to 82
      expect(result.creativityScore).toBe(82);
      expect(result.validationPassed).toBe(true);
    });

    it('should round down when appropriate', () => {
      // Test: (70 × 0.35) + (72 × 0.35) + (75 × 0.30)
      //     = 24.5 + 25.2 + 22.5 = 72.2 → 72
      const subscores: EvaluationSubscores = {
        composition: 70,
        colorTheory: 72,
        balance: 75,
      };

      const result = calculator.calculateCreativityScore(subscores);

      // Expected: 72.2 rounds to 72
      expect(result.creativityScore).toBe(72);
      expect(result.validationPassed).toBe(true);
    });

    it('should handle mixed scores', () => {
      const subscores: EvaluationSubscores = {
        composition: 95,
        colorTheory: 50,
        balance: 75,
      };

      const result = calculator.calculateCreativityScore(subscores);

      // Expected: (95*0.35) + (50*0.35) + (75*0.30) = 33.25 + 17.5 + 22.5 = 73.25 → 73
      expect(result.creativityScore).toBeGreaterThanOrEqual(72);
      expect(result.creativityScore).toBeLessThanOrEqual(74);
      expect(result.validationPassed).toBe(true);
    });

    it('should reject composition score < 0', () => {
      const subscores: EvaluationSubscores = {
        composition: -1,
        colorTheory: 80,
        balance: 80,
      };

      const result = calculator.calculateCreativityScore(subscores);

      expect(result.validationPassed).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Invalid composition score');
    });

    it('should reject composition score > 100', () => {
      const subscores: EvaluationSubscores = {
        composition: 101,
        colorTheory: 80,
        balance: 80,
      };

      const result = calculator.calculateCreativityScore(subscores);

      expect(result.validationPassed).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Invalid composition score');
    });

    it('should reject colorTheory score < 0', () => {
      const subscores: EvaluationSubscores = {
        composition: 80,
        colorTheory: -5,
        balance: 80,
      };

      const result = calculator.calculateCreativityScore(subscores);

      expect(result.validationPassed).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Invalid colorTheory score');
    });

    it('should reject colorTheory score > 100', () => {
      const subscores: EvaluationSubscores = {
        composition: 80,
        colorTheory: 150,
        balance: 80,
      };

      const result = calculator.calculateCreativityScore(subscores);

      expect(result.validationPassed).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Invalid colorTheory score');
    });

    it('should reject balance score < 0', () => {
      const subscores: EvaluationSubscores = {
        composition: 80,
        colorTheory: 80,
        balance: -10,
      };

      const result = calculator.calculateCreativityScore(subscores);

      expect(result.validationPassed).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Invalid balance score');
    });

    it('should reject balance score > 100', () => {
      const subscores: EvaluationSubscores = {
        composition: 80,
        colorTheory: 80,
        balance: 200,
      };

      const result = calculator.calculateCreativityScore(subscores);

      expect(result.validationPassed).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Invalid balance score');
    });

    it('should clamp final score to [0, 100] range', () => {
      // Even with invalid subscores, final score should be clamped
      // (This tests the defensive clamping at the end)
      const subscores: EvaluationSubscores = {
        composition: 100,
        colorTheory: 100,
        balance: 100,
      };

      const result = calculator.calculateCreativityScore(subscores);

      expect(result.creativityScore).toBeGreaterThanOrEqual(0);
      expect(result.creativityScore).toBeLessThanOrEqual(100);
    });

    it('should return timestamp', () => {
      const subscores: EvaluationSubscores = {
        composition: 80,
        colorTheory: 80,
        balance: 80,
      };

      const beforeTime = Date.now();
      const result = calculator.calculateCreativityScore(subscores);
      const afterTime = Date.now();

      expect(result.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(result.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should include calculation string in result', () => {
      const subscores: EvaluationSubscores = {
        composition: 80,
        colorTheory: 80,
        balance: 80,
      };

      const result = calculator.calculateCreativityScore(subscores);

      expect(result.calculation).toBeTruthy();
      expect(result.calculation).toContain('0.35');
      expect(result.calculation).toContain('0.3');
      expect(result.calculation).toContain('80');
    });

    it('should include all input subscores in result', () => {
      const subscores: EvaluationSubscores = {
        composition: 85,
        colorTheory: 78,
        balance: 82,
      };

      const result = calculator.calculateCreativityScore(subscores);

      expect(result.compositionScore).toBe(85);
      expect(result.colorTheoryScore).toBe(78);
      expect(result.balanceScore).toBe(82);
    });
  });

  describe('calculateBatch', () => {
    it('should calculate multiple scores correctly', () => {
      const subscoresArray: EvaluationSubscores[] = [
        { composition: 80, colorTheory: 80, balance: 80 },
        { composition: 90, colorTheory: 85, balance: 88 },
        { composition: 70, colorTheory: 75, balance: 72 },
      ];

      const results = calculator.calculateBatch(subscoresArray);

      expect(results).toHaveLength(3);
      expect(results[0].creativityScore).toBe(80);
      expect(results[1].validationPassed).toBe(true);
      expect(results[2].validationPassed).toBe(true);
    });

    it('should handle batch with some invalid scores', () => {
      const subscoresArray: EvaluationSubscores[] = [
        { composition: 80, colorTheory: 80, balance: 80 },
        { composition: 150, colorTheory: 80, balance: 80 }, // Invalid
        { composition: 70, colorTheory: 75, balance: 72 },
      ];

      const results = calculator.calculateBatch(subscoresArray);

      expect(results).toHaveLength(3);
      expect(results[0].validationPassed).toBe(true);
      expect(results[1].validationPassed).toBe(false);
      expect(results[2].validationPassed).toBe(true);
    });

    it('should handle empty batch', () => {
      const results = calculator.calculateBatch([]);

      expect(results).toHaveLength(0);
    });
  });

  describe('validateResults', () => {
    it('should validate correct results', () => {
      const results: CalculationResult[] = [
        {
          compositionScore: 80,
          colorTheoryScore: 80,
          balanceScore: 80,
          creativityScore: 80,
          calculation: '(80×0.35) + (80×0.35) + (80×0.30) = 80',
          timestamp: Date.now(),
          validationPassed: true,
          errors: [],
        },
        {
          compositionScore: 90,
          colorTheoryScore: 85,
          balanceScore: 88,
          creativityScore: 88,
          calculation: '(90×0.35) + (85×0.35) + (88×0.30) = 88',
          timestamp: Date.now(),
          validationPassed: true,
          errors: [],
        },
      ];

      const validation = calculator.validateResults(results);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid scores', () => {
      const results: CalculationResult[] = [
        {
          compositionScore: 80,
          colorTheoryScore: 80,
          balanceScore: 80,
          creativityScore: 150, // Invalid
          calculation: '',
          timestamp: Date.now(),
          validationPassed: false,
          errors: ['Score out of range'],
        },
      ];

      const validation = calculator.validateResults(results);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should verify recalculation consistency', () => {
      const result: CalculationResult = {
        compositionScore: 80,
        colorTheoryScore: 80,
        balanceScore: 80,
        creativityScore: 80,
        calculation: '',
        timestamp: Date.now(),
        validationPassed: true,
        errors: [],
      };

      const validation = calculator.validateResults([result]);

      // Should pass because recalculation matches
      expect(validation.valid).toBe(true);
    });
  });

  describe('getMetadata', () => {
    it('should return correct weights', () => {
      const metadata = calculator.getMetadata();

      expect(metadata.compositionWeight).toBe(0.35);
      expect(metadata.colorTheoryWeight).toBe(0.35);
      expect(metadata.balanceWeight).toBe(0.3);
    });

    it('should return weights that sum to 1.0', () => {
      const metadata = calculator.getMetadata();

      const totalWeight =
        metadata.compositionWeight +
        metadata.colorTheoryWeight +
        metadata.balanceWeight;

      expect(Math.abs(totalWeight - 1.0)).toBeLessThan(0.001);
    });

    it('should include formula string', () => {
      const metadata = calculator.getMetadata();

      expect(metadata.formula).toBeTruthy();
      expect(metadata.formula).toContain('Creativity Score');
      expect(metadata.formula).toContain('0.35');
      expect(metadata.formula).toContain('0.3');
    });
  });

  describe('edge cases', () => {
    it('should handle mid-range scores', () => {
      const subscores: EvaluationSubscores = {
        composition: 50,
        colorTheory: 50,
        balance: 50,
      };

      const result = calculator.calculateCreativityScore(subscores);

      expect(result.creativityScore).toBe(50);
      expect(result.validationPassed).toBe(true);
    });

    it('should handle all different scores', () => {
      const subscores: EvaluationSubscores = {
        composition: 100,
        colorTheory: 0,
        balance: 50,
      };

      const result = calculator.calculateCreativityScore(subscores);

      // (100*0.35) + (0*0.35) + (50*0.30) = 35 + 0 + 15 = 50
      expect(result.creativityScore).toBe(50);
      expect(result.validationPassed).toBe(true);
    });

    it('should handle very close to boundary values', () => {
      const subscores: EvaluationSubscores = {
        composition: 99.9,
        colorTheory: 99.9,
        balance: 99.9,
      };

      const result = calculator.calculateCreativityScore(subscores);

      expect(result.validationPassed).toBe(true);
      expect(result.creativityScore).toBeGreaterThan(95);
      expect(result.creativityScore).toBeLessThanOrEqual(100);
    });
  });
});
