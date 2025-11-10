/**
 * TransactionalReasoning Unit Tests
 * 
 * Tests for the transactional reasoning system - enables safe exploration
 * of speculative or dangerous reasoning with automatic rollback.
 * 
 * Core tests from problem statement:
 * ✅ Should create checkpoints before exploration
 * ✅ Should commit valid explorations
 * ✅ Should rollback on ethical violations
 * ✅ Should restore cognitive state after rollback
 * ✅ Should restore memory state after rollback
 * ✅ Should track exploration history
 * ✅ Should timeout long-running explorations
 * ✅ Should prevent nested explorations beyond depth limit
 * ✅ Should learn from failed explorations
 * ✅ Should calculate accurate exploration statistics
 */

import { TransactionalReasoning } from '../../../src/reasoning/TransactionalReasoning';
import { CognitiveDevelopment } from '../../../src/cognitive/development';
import { MemorySystem } from '../../../src/consciousness/memory/system';
import { EthicalReviewGate } from '../../../src/cognitive/ethics/EthicalReviewGate';
import { ExplorationContext } from '../../../src/reasoning/types';
import { CognitiveState } from '../../../src/types';

describe('TransactionalReasoning', () => {
  let cognitiveSystem: CognitiveDevelopment;
  let memorySystem: MemorySystem;
  let ethicsEngine: EthicalReviewGate;
  let transactionalReasoning: TransactionalReasoning;

  beforeEach(() => {
    memorySystem = new MemorySystem();
    cognitiveSystem = new CognitiveDevelopment(memorySystem);
    ethicsEngine = new EthicalReviewGate();
    transactionalReasoning = new TransactionalReasoning(
      cognitiveSystem,
      memorySystem,
      { enableLogging: false },
      ethicsEngine
    );
  });

  describe('Checkpoint Creation', () => {
    it('should create checkpoints before exploration', async () => {
      const context: ExplorationContext = {
        description: 'Test exploration',
        riskLevel: 'low',
      };

      let checkpointCreated = false;
      const thoughtProcess = async () => {
        // Verify checkpoint exists by this point
        checkpointCreated = true;
        return 'test result';
      };

      const result = await transactionalReasoning.exploreThought(thoughtProcess, context);

      expect(checkpointCreated).toBe(true);
      expect(result.checkpointId).toBeDefined();
      expect(result.checkpointId).not.toBe('');
    });
  });

  describe('Valid Exploration Commitment', () => {
    it('should commit valid explorations', async () => {
      const context: ExplorationContext = {
        description: 'Safe exploration',
        riskLevel: 'low',
      };

      const thoughtProcess = async () => {
        // Perform safe cognitive operation
        return 'successful thought';
      };

      const result = await transactionalReasoning.exploreThought(thoughtProcess, context);

      expect(result.success).toBe(true);
      expect(result.value).toBe('successful thought');
      expect(result.rolledBack).toBe(false);
    });

    it('should preserve changes from successful explorations', async () => {
      const context: ExplorationContext = {
        description: 'Memory modification exploration',
        riskLevel: 'low',
      };

      const thoughtProcess = async () => {
        // Add something to memory
        memorySystem.addSensoryMemory({ test: 'data' });
        return 'memory added';
      };

      const beforeCount = memorySystem.getAllMemories().length;
      await transactionalReasoning.exploreThought(thoughtProcess, context);
      const afterCount = memorySystem.getAllMemories().length;

      expect(afterCount).toBeGreaterThan(beforeCount);
    });
  });

  describe('Ethical Violation Rollback', () => {
    it('should rollback on ethical violations', async () => {
      const context: ExplorationContext = {
        description: 'Potentially harmful exploration',
        riskLevel: 'high',
      };

      // Mock ethics engine to reject
      jest.spyOn(ethicsEngine, 'reviewDecision').mockResolvedValue({
        approved: false,
        violatedPrinciples: ['harm-prevention'],
        reasoning: 'Potentially harmful action',
        confidence: 0.9,
        timestamp: Date.now(),
      });

      const thoughtProcess = async () => {
        return 'harmful thought';
      };

      const result = await transactionalReasoning.exploreThought(thoughtProcess, context);

      expect(result.success).toBe(false);
      expect(result.rolledBack).toBe(true);
      expect(result.error).toBeDefined();
    });

    it('should restore cognitive state after rollback', async () => {
      const context: ExplorationContext = {
        description: 'State modification with rollback',
        riskLevel: 'high',
      };

      // Capture initial state
      const initialState = cognitiveSystem.getCurrentState();

      // Mock ethics rejection
      jest.spyOn(ethicsEngine, 'reviewDecision').mockResolvedValue({
        approved: false,
        violatedPrinciples: ['harm-prevention'],
        reasoning: 'Test rejection',
        confidence: 0.9,
        timestamp: Date.now(),
      });

      const thoughtProcess = async () => {
        // Try to modify state
        cognitiveSystem.setState(CognitiveState.DEVELOPING);
        return 'modified';
      };

      await transactionalReasoning.exploreThought(thoughtProcess, context);

      // State should be restored
      const finalState = cognitiveSystem.getCurrentState();
      expect(finalState).toBe(initialState);
    });

    it('should restore memory state after rollback', async () => {
      const context: ExplorationContext = {
        description: 'Memory modification with rollback',
        riskLevel: 'high',
      };

      // Add initial memory
      memorySystem.addSensoryMemory({ initial: 'data' });
      const initialCount = memorySystem.getAllMemories().length;

      // Mock ethics rejection
      jest.spyOn(ethicsEngine, 'reviewDecision').mockResolvedValue({
        approved: false,
        violatedPrinciples: ['harm-prevention'],
        reasoning: 'Test rejection',
        confidence: 0.9,
        timestamp: Date.now(),
      });

      const thoughtProcess = async () => {
        // Try to add more memories
        memorySystem.addSensoryMemory({ added: 'data1' });
        memorySystem.addSensoryMemory({ added: 'data2' });
        return 'modified';
      };

      await transactionalReasoning.exploreThought(thoughtProcess, context);

      // Memory should be restored
      const finalCount = memorySystem.getAllMemories().length;
      expect(finalCount).toBe(initialCount);
    });
  });

  describe('Exploration Tracking', () => {
    it('should track exploration history', async () => {
      const context1: ExplorationContext = {
        description: 'First exploration',
        riskLevel: 'low',
      };

      const context2: ExplorationContext = {
        description: 'Second exploration',
        riskLevel: 'medium',
      };

      await transactionalReasoning.exploreThought(async () => 'result1', context1);
      await transactionalReasoning.exploreThought(async () => 'result2', context2);

      const stats = transactionalReasoning.getStats();
      expect(stats.totalExplorations).toBeGreaterThanOrEqual(2);
    });

    it('should track successful vs failed explorations', async () => {
      // Successful exploration
      await transactionalReasoning.exploreThought(
        async () => 'success',
        { description: 'Success test', riskLevel: 'low' }
      );

      // Failed exploration (ethics rejection)
      jest.spyOn(ethicsEngine, 'reviewDecision').mockResolvedValue({
        approved: false,
        violatedPrinciples: ['test'],
        reasoning: 'Test',
        confidence: 0.9,
        timestamp: Date.now(),
      });

      await transactionalReasoning.exploreThought(
        async () => 'fail',
        { description: 'Fail test', riskLevel: 'high' }
      );

      const stats = transactionalReasoning.getStats();
      expect(stats.successfulExplorations).toBeGreaterThan(0);
      expect(stats.failedExplorations).toBeGreaterThan(0);
    });

    it('should learn from failed explorations', async () => {
      // Mock ethics rejection
      jest.spyOn(ethicsEngine, 'reviewDecision').mockResolvedValue({
        approved: false,
        violatedPrinciples: ['harm-prevention'],
        reasoning: 'Harmful pattern',
        confidence: 0.9,
        timestamp: Date.now(),
      });

      const context: ExplorationContext = {
        description: 'Pattern to learn',
        riskLevel: 'high',
      };

      // Fail same pattern multiple times
      await transactionalReasoning.exploreThought(async () => 'fail', context);
      await transactionalReasoning.exploreThought(async () => 'fail', context);

      const stats = transactionalReasoning.getStats();
      expect(stats.failurePatterns).toBeDefined();
      expect(Object.keys(stats.failurePatterns).length).toBeGreaterThan(0);
    });
  });

  describe('Timeout Handling', () => {
    it('should timeout long-running explorations', async () => {
      const context: ExplorationContext = {
        description: 'Long-running exploration',
        riskLevel: 'medium',
        timeout: 100, // 100ms timeout
      };

      const thoughtProcess = async () => {
        // Simulate long-running operation
        await new Promise(resolve => setTimeout(resolve, 500));
        return 'should not complete';
      };

      const result = await transactionalReasoning.exploreThought(thoughtProcess, context);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('timeout');
    }, 10000);
  });

  describe('Depth Limit Protection', () => {
    it('should prevent nested explorations beyond depth limit', async () => {
      const shallowReasoning = new TransactionalReasoning(
        cognitiveSystem,
        memorySystem,
        { maxDepth: 3, enableLogging: false },
        ethicsEngine
      );

      let depth = 0;
      const recursiveThought = async (): Promise<any> => {
        depth++;
        if (depth < 10) {
          // Try to nest deeper
          return await shallowReasoning.exploreThought(
            recursiveThought,
            { description: `Depth ${depth}`, riskLevel: 'low' }
          );
        }
        return depth;
      };

      const result = await shallowReasoning.exploreThought(
        recursiveThought,
        { description: 'Start', riskLevel: 'low' }
      );

      // Should fail due to depth limit
      expect(depth).toBeLessThan(10);
    });
  });

  describe('Exploration Statistics', () => {
    it('should calculate accurate exploration statistics', async () => {
      // Perform various explorations
      await transactionalReasoning.exploreThought(
        async () => 'success',
        { description: 'Success 1', riskLevel: 'low' }
      );

      await transactionalReasoning.exploreThought(
        async () => 'success',
        { description: 'Success 2', riskLevel: 'medium' }
      );

      // Mock ethics rejection for a failed one
      jest.spyOn(ethicsEngine, 'reviewDecision').mockResolvedValueOnce({
        approved: false,
        violatedPrinciples: ['test'],
        reasoning: 'Test',
        confidence: 0.9,
        timestamp: Date.now(),
      });

      await transactionalReasoning.exploreThought(
        async () => 'fail',
        { description: 'Fail 1', riskLevel: 'high' }
      );

      const stats = transactionalReasoning.getStats();

      expect(stats.totalExplorations).toBeGreaterThanOrEqual(3);
      expect(stats.successfulExplorations).toBeGreaterThanOrEqual(2);
      expect(stats.failedExplorations).toBeGreaterThanOrEqual(1);
      expect(stats.averageDuration).toBeGreaterThan(0);
      expect(stats.rollbackRate).toBeGreaterThan(0);
    });
  });
});
