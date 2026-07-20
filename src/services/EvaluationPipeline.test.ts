/**
 * EvaluationPipeline Unit Tests
 * 
 * Tests for the AI evaluation pipeline workflow
 * Validates: Requirement 2 - Media submission evaluation pipeline
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EvaluationPipeline } from './EvaluationPipeline';
import { AIVisionClient } from './AIVisionClient';
import { ScoreCalculator } from './ScoreCalculator';
import { EvaluationStatus } from '../types/evaluation';

describe('EvaluationPipeline', () => {
  let pipeline: EvaluationPipeline;
  let aiVisionClient: AIVisionClient;
  let scoreCalculator: ScoreCalculator;

  beforeEach(() => {
    aiVisionClient = new AIVisionClient();
    scoreCalculator = new ScoreCalculator();
    pipeline = new EvaluationPipeline(aiVisionClient, scoreCalculator);
  });

  describe('initialization', () => {
    it('should initialize with AI client and calculator', () => {
      expect(pipeline).toBeDefined();
    });

    it('should initialize with mock scores disabled by default', () => {
      const stats = pipeline.getStats();
      expect(stats.mockScoresEnabled).toBe(false);
    });

    it('should initialize with correct AI provider', () => {
      const stats = pipeline.getStats();
      expect(stats.aiProvider).toBe('google-cloud-vision-v1.0');
    });
  });

  describe('mock score mode', () => {
    it('should enable mock score mode', () => {
      pipeline.setMockScoreMode(true, 'Testing');

      const stats = pipeline.getStats();
      expect(stats.mockScoresEnabled).toBe(true);
      expect(stats.mockScoreReason).toBe('Testing');
    });

    it('should disable mock score mode', () => {
      pipeline.setMockScoreMode(true, 'Testing');
      pipeline.setMockScoreMode(false);

      const stats = pipeline.getStats();
      expect(stats.mockScoresEnabled).toBe(false);
    });
  });

  describe('processPendingSubmissions', () => {
    it('should return execution stats', async () => {
      const stats = await pipeline.processPendingSubmissions();

      expect(stats).toBeDefined();
      expect(stats.totalProcessed).toBeDefined();
      expect(stats.successful).toBeDefined();
      expect(stats.failed).toBeDefined();
      expect(stats.results).toBeDefined();
      expect(stats.totalTimeMs).toBeDefined();
      expect(Array.isArray(stats.results)).toBe(true);
    });

    it('should track processing time', async () => {
      const stats = await pipeline.processPendingSubmissions();

      expect(stats.totalTimeMs).toBeGreaterThanOrEqual(0);
      expect(stats.startTime).toBeDefined();
      expect(stats.endTime).toBeDefined();
      expect(stats.endTime).toBeGreaterThanOrEqual(stats.startTime);
    });

    it('should handle empty submission list', async () => {
      const stats = await pipeline.processPendingSubmissions();

      expect(stats.totalProcessed).toBe(0);
      expect(stats.successful).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.results).toHaveLength(0);
    });

    it('should return correct stats structure', async () => {
      const stats = await pipeline.processPendingSubmissions();

      expect(stats.successful).toBeLessThanOrEqual(stats.totalProcessed);
      expect(stats.failed).toBeLessThanOrEqual(stats.totalProcessed);
      expect(stats.successful + stats.failed).toBe(stats.totalProcessed);
    });
  });

  describe('getStats', () => {
    it('should return pipeline statistics', () => {
      const stats = pipeline.getStats();

      expect(stats).toBeDefined();
      expect(stats.mockScoresEnabled).toBeDefined();
      expect(stats.aiProvider).toBeDefined();
      expect(stats.scoreCalculatorMetadata).toBeDefined();
    });

    it('should include score calculator metadata', () => {
      const stats = pipeline.getStats();

      expect(stats.scoreCalculatorMetadata.formula).toBeDefined();
      expect(stats.scoreCalculatorMetadata.compositionWeight).toBe(0.35);
      expect(stats.scoreCalculatorMetadata.colorTheoryWeight).toBe(0.35);
      expect(stats.scoreCalculatorMetadata.balanceWeight).toBe(0.3);
    });

    it('should reflect mock score configuration', () => {
      pipeline.setMockScoreMode(true, 'API rate limit');

      const stats = pipeline.getStats();

      expect(stats.mockScoresEnabled).toBe(true);
      expect(stats.mockScoreReason).toBe('API rate limit');
    });
  });

  describe('error handling', () => {
    it('should handle pipeline execution errors gracefully', async () => {
      // Even if there's an error, pipeline should complete
      const stats = await pipeline.processPendingSubmissions();

      expect(stats).toBeDefined();
      expect(stats.totalTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should track failed submissions', async () => {
      // Enable mock scores for predictable output
      pipeline.setMockScoreMode(true, 'Testing');

      const stats = await pipeline.processPendingSubmissions();

      expect(stats.failed).toBeDefined();
      expect(stats.failed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('performance', () => {
    it('should complete pipeline quickly for zero submissions', async () => {
      const startTime = Date.now();
      await pipeline.processPendingSubmissions();
      const elapsed = Date.now() - startTime;

      // Should complete in reasonable time (< 1 second for zero submissions)
      expect(elapsed).toBeLessThan(1000);
    });
  });

  describe('configuration', () => {
    it('should support mock scoring for testing', () => {
      pipeline.setMockScoreMode(true, 'API unavailable');

      const stats = pipeline.getStats();

      expect(stats.mockScoresEnabled).toBe(true);
    });

    it('should allow switching between mock and real scoring', () => {
      pipeline.setMockScoreMode(true);
      let stats = pipeline.getStats();
      expect(stats.mockScoresEnabled).toBe(true);

      pipeline.setMockScoreMode(false);
      stats = pipeline.getStats();
      expect(stats.mockScoresEnabled).toBe(false);
    });
  });
});
