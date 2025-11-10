/**
 * ExplorationTracker Unit Tests
 * 
 * Tests for tracking exploration attempts and learning from patterns.
 * 
 * Core tests from problem statement:
 * ✅ Should track exploration attempts
 * ✅ Should record successes and failures
 * ✅ Should identify failure patterns
 * ✅ Should calculate exploration statistics
 */

import { ExplorationTracker } from '../../../src/reasoning/ExplorationTracker';
import { ExplorationContext } from '../../../src/reasoning/types';

describe('ExplorationTracker', () => {
  let tracker: ExplorationTracker;

  beforeEach(() => {
    tracker = new ExplorationTracker(100); // Max 100 history entries
  });

  describe('Exploration Tracking', () => {
    it('should track exploration attempts', () => {
      const context: ExplorationContext = {
        description: 'Test exploration',
        riskLevel: 'low',
      };

      const explorationId = tracker.startExploration(context, 'checkpoint-123');

      expect(explorationId).toBeDefined();
      expect(typeof explorationId).toBe('string');
      expect(explorationId.length).toBeGreaterThan(0);

      const attempt = tracker.getExploration(explorationId);
      expect(attempt).toBeDefined();
      expect(attempt?.context.description).toBe('Test exploration');
      expect(attempt?.checkpointId).toBe('checkpoint-123');
    });

    it('should track multiple explorations', () => {
      const id1 = tracker.startExploration(
        { description: 'First', riskLevel: 'low' },
        'cp1'
      );
      const id2 = tracker.startExploration(
        { description: 'Second', riskLevel: 'medium' },
        'cp2'
      );
      const id3 = tracker.startExploration(
        { description: 'Third', riskLevel: 'high' },
        'cp3'
      );

      const allExplorations = tracker.getAllExplorations();
      expect(allExplorations.length).toBeGreaterThanOrEqual(3);

      const ids = allExplorations.map(e => e.id);
      expect(ids).toContain(id1);
      expect(ids).toContain(id2);
      expect(ids).toContain(id3);
    });

    it('should enforce history limit', () => {
      const limitedTracker = new ExplorationTracker(5);

      // Add 10 explorations (exceeds limit of 5)
      for (let i = 1; i <= 10; i++) {
        limitedTracker.startExploration(
          { description: `Exploration ${i}`, riskLevel: 'low' },
          `cp${i}`
        );
      }

      const allExplorations = limitedTracker.getAllExplorations();
      expect(allExplorations.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Success Recording', () => {
    it('should record successful exploration', () => {
      const id = tracker.startExploration(
        { description: 'Success test', riskLevel: 'low' },
        'cp1'
      );

      tracker.recordSuccess(id);

      const attempt = tracker.getExploration(id);
      expect(attempt?.success).toBe(true);
      expect(attempt?.endTime).toBeDefined();
      expect(attempt?.endTime).toBeGreaterThan(attempt?.startTime || 0);
    });

    it('should handle success for non-existent exploration gracefully', () => {
      // Should not throw
      expect(() => {
        tracker.recordSuccess('non-existent-id');
      }).not.toThrow();
    });
  });

  describe('Failure Recording', () => {
    it('should record failed exploration', () => {
      const id = tracker.startExploration(
        { description: 'Failure test', riskLevel: 'high' },
        'cp1'
      );

      tracker.recordFailure(id, 'Ethics violation');

      const attempt = tracker.getExploration(id);
      expect(attempt?.success).toBe(false);
      expect(attempt?.endTime).toBeDefined();
      expect(attempt?.failureReason).toBe('Ethics violation');
    });

    it('should track ethics violations', () => {
      const id = tracker.startExploration(
        { description: 'Ethics test', riskLevel: 'high' },
        'cp1'
      );

      tracker.recordFailure(id, 'Harm principle violated', true);

      const attempt = tracker.getExploration(id);
      expect(attempt?.ethicsViolation).toBe(true);
    });

    it('should handle failure for non-existent exploration gracefully', () => {
      // Should not throw
      expect(() => {
        tracker.recordFailure('non-existent-id', 'Test reason');
      }).not.toThrow();
    });
  });

  describe('Rollback Recording', () => {
    it('should record rollback', () => {
      const id = tracker.startExploration(
        { description: 'Rollback test', riskLevel: 'high' },
        'cp1'
      );

      tracker.recordRollback(id);

      const attempt = tracker.getExploration(id);
      expect(attempt?.rolledBack).toBe(true);
      expect(attempt?.endTime).toBeDefined();
    });

    it('should not overwrite existing endTime when recording rollback', () => {
      const id = tracker.startExploration(
        { description: 'Rollback test', riskLevel: 'high' },
        'cp1'
      );

      tracker.recordFailure(id, 'Test failure');
      const firstEndTime = tracker.getExploration(id)?.endTime;

      tracker.recordRollback(id);
      const secondEndTime = tracker.getExploration(id)?.endTime;

      expect(secondEndTime).toBe(firstEndTime);
    });
  });

  describe('Failure Patterns', () => {
    it('should identify failure patterns', () => {
      const context: ExplorationContext = {
        description: 'Repeated failure pattern',
        riskLevel: 'high',
      };

      // Fail same pattern multiple times
      for (let i = 0; i < 3; i++) {
        const id = tracker.startExploration(context, `cp${i}`);
        tracker.recordFailure(id, 'Same error', true);
      }

      const patterns = tracker.getFailurePatterns();
      expect(patterns.length).toBeGreaterThan(0);

      // Should have pattern for our repeated failure
      const pattern = patterns.find(p =>
        p.context.includes('Repeated failure pattern')
      );
      expect(pattern).toBeDefined();
      expect(pattern?.occurrences).toBeGreaterThanOrEqual(3);
    });

    it('should track different failure reasons', () => {
      const id1 = tracker.startExploration(
        { description: 'Ethics failure', riskLevel: 'high' },
        'cp1'
      );
      tracker.recordFailure(id1, 'Ethics violation', true);

      const id2 = tracker.startExploration(
        { description: 'Timeout failure', riskLevel: 'medium' },
        'cp2'
      );
      tracker.recordFailure(id2, 'Timeout', false);

      const patterns = tracker.getFailurePatterns();
      const reasons = patterns.map(p => p.reason);

      expect(reasons).toContain('Ethics violation');
      expect(reasons).toContain('Timeout');
    });

    it('should clear failure patterns', () => {
      const id = tracker.startExploration(
        { description: 'Test', riskLevel: 'low' },
        'cp1'
      );
      tracker.recordFailure(id, 'Test failure');

      tracker.clear();

      const patterns = tracker.getFailurePatterns();
      expect(patterns.length).toBe(0);
    });
  });

  describe('Exploration Statistics', () => {
    it('should calculate accurate statistics', () => {
      // Create successful explorations
      for (let i = 0; i < 3; i++) {
        const id = tracker.startExploration(
          { description: `Success ${i}`, riskLevel: 'low' },
          `cp${i}`
        );
        tracker.recordSuccess(id);
      }

      // Create failed explorations
      for (let i = 0; i < 2; i++) {
        const id = tracker.startExploration(
          { description: `Failure ${i}`, riskLevel: 'high' },
          `cp_fail${i}`
        );
        tracker.recordFailure(id, 'Test failure', true);
        tracker.recordRollback(id);
      }

      const stats = tracker.getStats();

      expect(stats.totalExplorations).toBeGreaterThanOrEqual(5);
      expect(stats.successfulExplorations).toBeGreaterThanOrEqual(3);
      expect(stats.failedExplorations).toBeGreaterThanOrEqual(2);
      expect(stats.rollbacks).toBeGreaterThanOrEqual(2);
      expect(stats.ethicsViolations).toBeGreaterThanOrEqual(2);
      expect(stats.successRate).toBeGreaterThan(0);
      expect(stats.successRate).toBeLessThanOrEqual(1);
    });

    it('should calculate average duration', () => {
      const id = tracker.startExploration(
        { description: 'Duration test', riskLevel: 'low' },
        'cp1'
      );

      // Simulate some time passing
      return new Promise(resolve => {
        setTimeout(() => {
          tracker.recordSuccess(id);

          const stats = tracker.getStats();
          expect(stats.averageDuration).toBeGreaterThan(0);
          resolve(undefined);
        }, 50);
      });
    });

    it('should handle empty statistics', () => {
      const emptyTracker = new ExplorationTracker();
      const stats = emptyTracker.getStatistics();

      expect(stats.totalExplorations).toBe(0);
      expect(stats.successfulExplorations).toBe(0);
      expect(stats.failedExplorations).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.averageDuration).toBe(0);
    });
  });

  describe('Exploration Retrieval', () => {
    it('should get explorations sorted by timestamp', () => {
      const id1 = tracker.startExploration(
        { description: 'First', riskLevel: 'low' },
        'cp1'
      );
      const id2 = tracker.startExploration(
        { description: 'Second', riskLevel: 'low' },
        'cp2'
      );
      const id3 = tracker.startExploration(
        { description: 'Third', riskLevel: 'low' },
        'cp3'
      );

      const allExplorations = tracker.getAllExplorations();

      // Should be sorted newest first
      expect(allExplorations[0].id).toBe(id3);
      expect(allExplorations[1].id).toBe(id2);
      expect(allExplorations[2].id).toBe(id1);
    });

    it('should return null for non-existent exploration', () => {
      const exploration = tracker.getExploration('non-existent-id');
      expect(exploration).toBeNull();
    });
  });
});
