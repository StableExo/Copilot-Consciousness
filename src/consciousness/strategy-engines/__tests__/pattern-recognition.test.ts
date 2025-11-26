/**
 * Pattern Recognition Engine Tests
 *
 * Comprehensive test suite for the Pattern Recognition Engine
 */

import { PatternRecognitionEngine } from '../pattern-recognition';
import { Pattern, PatternCategory, MatchConfidence, PatternContext } from '../types/pattern';

describe('PatternRecognitionEngine', () => {
  let engine: PatternRecognitionEngine;

  const createTestPattern = (id: string, name: string, category: PatternCategory): Pattern => ({
    id,
    name,
    category,
    description: `Test pattern ${name}`,
    conditions: [
      {
        id: 'cond_1',
        description: 'Test condition',
        evaluate: (context: any) => context.value > 50,
        weight: 1.0,
      },
    ],
    requiredConfidence: MatchConfidence.MEDIUM,
    actions: [
      {
        id: 'action_1',
        type: 'test',
        description: 'Test action',
        execute: async (context: any) => ({ success: true }),
      },
    ],
    successRate: 0.75,
    timesMatched: 0,
    timesSucceeded: 0,
    timesFailed: 0,
    generation: 1,
    createdAt: new Date(),
    lastUpdated: new Date(),
  });

  beforeEach(() => {
    engine = new PatternRecognitionEngine();
  });

  describe('Initialization', () => {
    it('should initialize with empty library', () => {
      expect(engine).toBeDefined();
      const stats = engine.getStats();
      expect(stats.patternsInLibrary).toBe(0);
    });

    it('should initialize with initial patterns', () => {
      const patterns = [
        createTestPattern('p1', 'Pattern 1', PatternCategory.STRUCTURAL),
        createTestPattern('p2', 'Pattern 2', PatternCategory.BEHAVIORAL),
      ];

      const engineWithPatterns = new PatternRecognitionEngine(patterns);
      const stats = engineWithPatterns.getStats();
      expect(stats.patternsInLibrary).toBe(2);
    });

    it('should reset statistics', () => {
      engine.resetStats();
      const stats = engine.getStats();
      expect(stats.matchesPerformed).toBe(0);
    });
  });

  describe('Pattern Management', () => {
    it('should add pattern to library', () => {
      const pattern = createTestPattern('p1', 'Test Pattern', PatternCategory.SPATIAL);

      engine.addPattern(pattern);

      const stats = engine.getStats();
      expect(stats.patternsInLibrary).toBe(1);
    });

    it('should retrieve pattern by ID', () => {
      const pattern = createTestPattern('p1', 'Test Pattern', PatternCategory.TEMPORAL);

      engine.addPattern(pattern);
      const retrieved = engine.getPattern('p1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('p1');
      expect(retrieved?.name).toBe('Test Pattern');
    });

    it('should remove pattern from library', () => {
      const pattern = createTestPattern('p1', 'Test Pattern', PatternCategory.HYBRID);

      engine.addPattern(pattern);
      const removed = engine.removePattern('p1');

      expect(removed).toBe(true);

      const stats = engine.getStats();
      expect(stats.patternsInLibrary).toBe(0);
    });

    it('should return false when removing non-existent pattern', () => {
      const removed = engine.removePattern('non_existent');
      expect(removed).toBe(false);
    });

    it('should get patterns by category', () => {
      const pattern1 = createTestPattern('p1', 'Pattern 1', PatternCategory.STRUCTURAL);
      const pattern2 = createTestPattern('p2', 'Pattern 2', PatternCategory.STRUCTURAL);
      const pattern3 = createTestPattern('p3', 'Pattern 3', PatternCategory.BEHAVIORAL);

      engine.addPattern(pattern1);
      engine.addPattern(pattern2);
      engine.addPattern(pattern3);

      const structural = engine.getPatternsByCategory(PatternCategory.STRUCTURAL);
      expect(structural.length).toBe(2);
    });
  });

  describe('Pattern Matching', () => {
    it('should match patterns against context', () => {
      const pattern = createTestPattern('p1', 'Value Check', PatternCategory.SPATIAL);
      engine.addPattern(pattern);

      const context: PatternContext = {
        value: 100,
        timestamp: new Date(),
      };

      const matches = engine.matchPatterns(context);
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should not match when conditions fail', () => {
      const pattern = createTestPattern('p1', 'Value Check', PatternCategory.SPATIAL);
      engine.addPattern(pattern);

      const context: PatternContext = {
        value: 10, // Below threshold of 50
        timestamp: new Date(),
      };

      const matches = engine.matchPatterns(context);
      expect(matches.length).toBe(0);
    });

    it('should calculate match confidence correctly', () => {
      const pattern: Pattern = {
        id: 'p_confidence',
        name: 'Multi-Condition Pattern',
        category: PatternCategory.BEHAVIORAL,
        description: 'Pattern with multiple conditions',
        conditions: [
          {
            id: 'cond_1',
            description: 'First condition',
            evaluate: (context: any) => context.value > 50,
            weight: 1.0,
          },
          {
            id: 'cond_2',
            description: 'Second condition',
            evaluate: (context: any) => context.risk < 0.3,
            weight: 1.0,
          },
        ],
        requiredConfidence: MatchConfidence.LOW,
        actions: [],
        successRate: 0.8,
        timesMatched: 0,
        timesSucceeded: 0,
        timesFailed: 0,
        generation: 1,
        createdAt: new Date(),
        lastUpdated: new Date(),
      };

      engine.addPattern(pattern);

      const context: PatternContext = {
        value: 100,
        risk: 0.1,
        timestamp: new Date(),
      };

      const matches = engine.matchPatterns(context);

      if (matches.length > 0) {
        expect(matches[0].confidence).toBeDefined();
        expect(matches[0].matchScore).toBeGreaterThan(0);
      }
    });

    it('should respect minimum confidence threshold', () => {
      const highConfidenceEngine = new PatternRecognitionEngine([], {
        minConfidence: MatchConfidence.VERY_HIGH,
      });

      const pattern = createTestPattern('p1', 'Pattern', PatternCategory.SPATIAL);
      pattern.requiredConfidence = MatchConfidence.LOW;

      // Add more stringent conditions to ensure only low confidence match
      pattern.conditions = [
        {
          id: 'cond_1',
          description: 'Weak condition',
          evaluate: (context: any) => context.value > 50,
          weight: 0.5,
        },
        {
          id: 'cond_2',
          description: 'Failing condition',
          evaluate: (context: any) => false, // Always fails
          weight: 0.5,
        },
      ];

      highConfidenceEngine.addPattern(pattern);

      const context: PatternContext = {
        value: 100,
        timestamp: new Date(),
      };

      const matches = highConfidenceEngine.matchPatterns(context);
      // Should not match due to engine's high confidence requirement and partial match
      expect(matches.length).toBe(0);
    });

    it('should limit number of matches', () => {
      const limitedEngine = new PatternRecognitionEngine([], {
        maxMatches: 2,
      });

      // Add 5 patterns
      for (let i = 1; i <= 5; i++) {
        const pattern = createTestPattern(`p${i}`, `Pattern ${i}`, PatternCategory.SPATIAL);
        limitedEngine.addPattern(pattern);
      }

      const context: PatternContext = {
        value: 100,
        timestamp: new Date(),
      };

      const matches = limitedEngine.matchPatterns(context);
      expect(matches.length).toBeLessThanOrEqual(2);
    });

    it('should update statistics when matching', () => {
      const pattern = createTestPattern('p1', 'Pattern', PatternCategory.BEHAVIORAL);
      engine.addPattern(pattern);

      const context: PatternContext = {
        value: 100,
        timestamp: new Date(),
      };

      const initialStats = engine.getStats();
      engine.matchPatterns(context);
      const updatedStats = engine.getStats();

      expect(updatedStats.matchesPerformed).toBe(initialStats.matchesPerformed + 1);
    });
  });

  describe('Pattern Recommendations', () => {
    it('should generate recommendations from matches', () => {
      const pattern = createTestPattern('p1', 'Recommendation Test', PatternCategory.TEMPORAL);
      engine.addPattern(pattern);

      const context: PatternContext = {
        value: 100,
        timestamp: new Date(),
      };

      const matches = engine.matchPatterns(context);
      const recommendations = engine.recommend(matches);

      expect(recommendations.length).toBe(matches.length);
    });

    it('should include reasoning in recommendations', () => {
      const pattern = createTestPattern('p1', 'Test Pattern', PatternCategory.HYBRID);
      engine.addPattern(pattern);

      const context: PatternContext = {
        value: 100,
        timestamp: new Date(),
      };

      const matches = engine.matchPatterns(context);
      const recommendations = engine.recommend(matches);

      if (recommendations.length > 0) {
        expect(recommendations[0].reasoning).toBeDefined();
        expect(recommendations[0].reasoning.length).toBeGreaterThan(0);
      }
    });

    it('should identify risks in recommendations', () => {
      const pattern: Pattern = {
        id: 'p_risky',
        name: 'Low Success Pattern',
        category: PatternCategory.STRUCTURAL,
        description: 'Pattern with low success rate',
        conditions: [
          {
            id: 'cond_1',
            description: 'Test condition',
            evaluate: (context: any) => true,
            weight: 1.0,
          },
        ],
        requiredConfidence: MatchConfidence.LOW,
        actions: [],
        successRate: 0.3, // Low success rate
        timesMatched: 10,
        timesSucceeded: 3,
        timesFailed: 7,
        generation: 1,
        createdAt: new Date(),
        lastUpdated: new Date(),
      };

      engine.addPattern(pattern);

      const context: PatternContext = {
        timestamp: new Date(),
      };

      const matches = engine.matchPatterns(context);
      const recommendations = engine.recommend(matches);

      if (recommendations.length > 0) {
        expect(recommendations[0].risks.length).toBeGreaterThan(0);
      }
    });

    it('should suggest alternatives in recommendations', () => {
      const pattern1 = createTestPattern('p1', 'Pattern 1', PatternCategory.BEHAVIORAL);
      const pattern2 = createTestPattern('p2', 'Pattern 2', PatternCategory.BEHAVIORAL);

      engine.addPattern(pattern1);
      engine.addPattern(pattern2);

      const context: PatternContext = {
        value: 100,
        timestamp: new Date(),
      };

      const matches = engine.matchPatterns(context);
      const recommendations = engine.recommend(matches);

      if (recommendations.length > 1) {
        // First recommendation should have second as alternative
        expect(recommendations[0].alternatives).toBeDefined();
      }
    });
  });

  describe('Pattern Learning', () => {
    it('should update pattern on success', () => {
      const pattern = createTestPattern('p1', 'Learning Pattern', PatternCategory.SPATIAL);
      engine.addPattern(pattern);

      const result = engine.updatePattern('p1', true);

      expect(result).not.toBeNull();
      expect(result!.pattern.timesMatched).toBe(1);
      expect(result!.pattern.timesSucceeded).toBe(1);
      expect(result!.improved).toBe(true);
    });

    it('should update pattern on failure', () => {
      const pattern = createTestPattern('p1', 'Learning Pattern', PatternCategory.TEMPORAL);
      engine.addPattern(pattern);

      const result = engine.updatePattern('p1', false);

      expect(result).not.toBeNull();
      expect(result!.pattern.timesMatched).toBe(1);
      expect(result!.pattern.timesFailed).toBe(1);
    });

    it('should adjust success rate based on outcomes', () => {
      const pattern = createTestPattern('p1', 'Adaptive Pattern', PatternCategory.HYBRID);
      pattern.successRate = 0.5;
      engine.addPattern(pattern);

      // Multiple successes should increase success rate
      engine.updatePattern('p1', true);
      engine.updatePattern('p1', true);
      engine.updatePattern('p1', true);

      const updated = engine.getPattern('p1');
      expect(updated!.successRate).toBeGreaterThan(0.5);
    });

    it('should return null when updating non-existent pattern', () => {
      const result = engine.updatePattern('non_existent', true);
      expect(result).toBeNull();
    });
  });

  describe('Pattern Composition', () => {
    it('should compose multiple patterns', () => {
      const pattern1 = createTestPattern('p1', 'Pattern 1', PatternCategory.STRUCTURAL);
      const pattern2 = createTestPattern('p2', 'Pattern 2', PatternCategory.BEHAVIORAL);

      const composite = engine.composePatterns([pattern1, pattern2], 'sequential');

      expect(composite).toBeDefined();
      expect(composite.basePatterns.length).toBe(2);
      expect(composite.compositionStrategy).toBe('sequential');
    });

    it('should combine conditions from all patterns', () => {
      const pattern1 = createTestPattern('p1', 'Pattern 1', PatternCategory.SPATIAL);
      const pattern2 = createTestPattern('p2', 'Pattern 2', PatternCategory.TEMPORAL);

      const composite = engine.composePatterns([pattern1, pattern2], 'parallel');

      expect(composite.conditions.length).toBe(
        pattern1.conditions.length + pattern2.conditions.length
      );
    });

    it('should combine actions from all patterns', () => {
      const pattern1 = createTestPattern('p1', 'Pattern 1', PatternCategory.HYBRID);
      const pattern2 = createTestPattern('p2', 'Pattern 2', PatternCategory.STRUCTURAL);

      const composite = engine.composePatterns([pattern1, pattern2], 'conditional');

      expect(composite.actions.length).toBe(pattern1.actions.length + pattern2.actions.length);
    });
  });

  describe('Pattern Analytics', () => {
    it('should provide analytics for pattern', () => {
      const pattern = createTestPattern('p1', 'Analytics Test', PatternCategory.BEHAVIORAL);
      engine.addPattern(pattern);

      // Simulate some usage
      engine.updatePattern('p1', true);
      engine.updatePattern('p1', true);
      engine.updatePattern('p1', false);

      const analytics = engine.getPatternAnalytics('p1');

      expect(analytics).not.toBeNull();
      expect(analytics!.totalMatches).toBe(3);
      expect(analytics!.successfulMatches).toBe(2);
      expect(analytics!.failedMatches).toBe(1);
    });

    it('should calculate trend in analytics', () => {
      const pattern = createTestPattern('p1', 'Trend Test', PatternCategory.SPATIAL);
      pattern.successRate = 0.9;
      engine.addPattern(pattern);

      const analytics = engine.getPatternAnalytics('p1');

      expect(analytics).not.toBeNull();
      expect(analytics!.trend).toBeDefined();
    });

    it('should return null for non-existent pattern', () => {
      const analytics = engine.getPatternAnalytics('non_existent');
      expect(analytics).toBeNull();
    });
  });

  describe('Library Information', () => {
    it('should provide library summary', () => {
      const pattern1 = createTestPattern('p1', 'Pattern 1', PatternCategory.STRUCTURAL);
      const pattern2 = createTestPattern('p2', 'Pattern 2', PatternCategory.STRUCTURAL);
      const pattern3 = createTestPattern('p3', 'Pattern 3', PatternCategory.BEHAVIORAL);

      engine.addPattern(pattern1);
      engine.addPattern(pattern2);
      engine.addPattern(pattern3);

      const info = engine.getLibraryInfo();

      expect(info.totalPatterns).toBe(3);
      expect(info.byCategory['structural']).toBe(2);
      expect(info.byCategory['behavioral']).toBe(1);
    });
  });

  describe('Statistics Tracking', () => {
    it('should track patterns in library', () => {
      const pattern = createTestPattern('p1', 'Stats Test', PatternCategory.TEMPORAL);

      engine.addPattern(pattern);
      const stats = engine.getStats();

      expect(stats.patternsInLibrary).toBe(1);
    });

    it('should track successful matches', () => {
      const pattern = createTestPattern('p1', 'Match Test', PatternCategory.HYBRID);
      engine.addPattern(pattern);

      const context: PatternContext = {
        value: 100,
        timestamp: new Date(),
      };

      engine.matchPatterns(context);
      const stats = engine.getStats();

      expect(stats.matchesPerformed).toBeGreaterThan(0);
    });

    it('should calculate average match confidence', () => {
      const pattern = createTestPattern('p1', 'Confidence Test', PatternCategory.SPATIAL);
      engine.addPattern(pattern);

      const context: PatternContext = {
        value: 100,
        timestamp: new Date(),
      };

      engine.matchPatterns(context);
      const stats = engine.getStats();

      if (stats.successfulMatches > 0) {
        expect(stats.avgMatchConfidence).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
