/**
 * Tests for PriorityFeePredictorMLP
 * 
 * Tier S Feature #2: 1-3 block lookahead priority fee prediction
 */

import { PriorityFeePredictorMLP } from '../../../src/ml/PriorityFeePredictorMLP';

describe('PriorityFeePredictorMLP', () => {
  let predictor: PriorityFeePredictorMLP;

  beforeEach(() => {
    predictor = new PriorityFeePredictorMLP();
  });

  describe('initialization', () => {
    it('should create predictor with default config', () => {
      expect(predictor).toBeDefined();
      const stats = predictor.getStats();
      expect(stats.historySize).toBe(0);
      expect(stats.trainingExamples).toBe(0);
    });

    it('should accept custom config', () => {
      const customPredictor = new PriorityFeePredictorMLP({
        inputWindowSize: 20,
        trainingInterval: 100,
      });
      expect(customPredictor).toBeDefined();
    });
  });

  describe('data collection', () => {
    it('should add observations', () => {
      predictor.addObservation(100, BigInt(1000000000), Date.now());
      
      const stats = predictor.getStats();
      expect(stats.historySize).toBe(1);
    });

    it('should maintain history window', () => {
      // Add many observations
      for (let i = 0; i < 150; i++) {
        predictor.addObservation(
          1000 + i,
          BigInt(1000000000 + i * 100000),
          Date.now() + i * 12000
        );
      }

      const stats = predictor.getStats();
      expect(stats.historySize).toBeLessThanOrEqual(115); // inputWindowSize + 100
    });

    it('should prepare training examples', () => {
      // Add enough data for training examples (15 input + 3 target = 18 min)
      for (let i = 0; i < 25; i++) {
        predictor.addObservation(
          1000 + i,
          BigInt(1000000000 + i * 100000),
          Date.now() + i * 12000
        );
      }

      const stats = predictor.getStats();
      expect(stats.trainingExamples).toBeGreaterThan(0);
    });
  });

  describe('prediction', () => {
    it('should return null with insufficient data', () => {
      // Add only a few observations
      for (let i = 0; i < 10; i++) {
        predictor.addObservation(1000 + i, BigInt(1000000000), Date.now());
      }

      const prediction = predictor.predict();
      expect(prediction).toBeNull();
    });

    it('should make predictions with sufficient data', () => {
      // Add enough observations
      for (let i = 0; i < 25; i++) {
        predictor.addObservation(
          1000 + i,
          BigInt(1000000000 + i * 100000),
          Date.now() + i * 12000
        );
      }

      const prediction = predictor.predict();
      expect(prediction).not.toBeNull();
      expect(prediction!.nextBlock).toBeGreaterThanOrEqual(0n);
      expect(prediction!.nextNextBlock).toBeGreaterThanOrEqual(0n);
      expect(prediction!.thirdBlock).toBeGreaterThanOrEqual(0n);
      expect(prediction!.confidence).toBeGreaterThan(0);
      expect(prediction!.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('optimal bidding', () => {
    it('should return null without sufficient data', () => {
      const bid = predictor.getOptimalBid();
      expect(bid).toBeNull();
    });

    it('should provide optimal bid with buffer', () => {
      // Add data
      for (let i = 0; i < 25; i++) {
        predictor.addObservation(
          1000 + i,
          BigInt(2000000000),
          Date.now() + i * 12000
        );
      }

      const bid = predictor.getOptimalBid(5n);
      expect(bid).not.toBeNull();
      expect(bid!).toBeGreaterThan(0n);
    });
  });

  describe('statistics', () => {
    it('should provide comprehensive stats', () => {
      predictor.addObservation(1000, BigInt(1000000000), Date.now());

      const stats = predictor.getStats();
      expect(stats).toHaveProperty('historySize');
      expect(stats).toHaveProperty('trainingExamples');
      expect(stats).toHaveProperty('canPredict');
    });
  });

  describe('data management', () => {
    it('should clear all data', () => {
      // Add data
      for (let i = 0; i < 25; i++) {
        predictor.addObservation(
          1000 + i,
          BigInt(1000000000),
          Date.now() + i * 12000
        );
      }

      predictor.clear();

      const stats = predictor.getStats();
      expect(stats.historySize).toBe(0);
      expect(stats.trainingExamples).toBe(0);
      expect(predictor.predict()).toBeNull();
    });
  });
});
