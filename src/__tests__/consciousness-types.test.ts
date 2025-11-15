/**
 * Tests for ConsciousnessSystem typed return values
 * Guards against accidental type/shape drift
 */

import { ConsciousnessSystem } from '../consciousness';
import { defaultConfig } from '../config';
import { Priority } from '../types';
import type {
  ProcessInputResult,
  ThinkingResult,
  CosmicProblemResult,
  ReflectionResult,
  MaintenanceResult,
  StatusResult,
} from '../types';

describe('ConsciousnessSystem Typed Methods', () => {
  let consciousness: ConsciousnessSystem;

  beforeEach(() => {
    consciousness = new ConsciousnessSystem(defaultConfig);
    consciousness.start();
  });

  afterEach(() => {
    consciousness.stop();
  });

  describe('processInput', () => {
    it('should return ProcessInputResult with expected structure', async () => {
      const result: ProcessInputResult = await consciousness.processInput({
        type: 'test',
        content: 'test data',
      });

      expect(result).toBeDefined();
      expect(result.processed).toBe(true);
      expect(typeof result.eventId).toBe('string');
      expect(typeof result.sensoryMemoryId).toBe('string');
      expect(typeof result.workingMemoryId).toBe('string');
      expect(result.learningResult).toBeDefined();
      expect(typeof result.learningResult.success).toBe('boolean');
      expect(Array.isArray(result.learningResult.knowledgeGained)).toBe(true);
      expect(Array.isArray(result.learningResult.skillsImproved)).toBe(true);
      expect(typeof result.learningResult.duration).toBe('number');
      expect(result.learningResult.metrics).toBeDefined();
    });
  });

  describe('think', () => {
    it('should return ThinkingResult with expected structure', async () => {
      const result: ThinkingResult = await consciousness.think('test problem');

      expect(result).toBeDefined();
      expect(typeof result.eventId).toBe('string');
      expect(typeof result.memoryId).toBe('string');
      expect(result.reasoning).toBeDefined();
      expect(typeof result.reasoning.id).toBe('string');
      expect(typeof result.reasoning.goal).toBe('string');
      expect(Array.isArray(result.reasoning.steps)).toBe(true);
      expect(typeof result.reasoning.confidence).toBe('number');
    });

    it('should include geminiResponse when useGemini is true', async () => {
      const result: ThinkingResult = await consciousness.think('test problem', true);

      expect(result).toBeDefined();
      // geminiResponse may be undefined if API is not configured
      if (result.geminiResponse) {
        expect(typeof result.geminiResponse.text).toBe('string');
      }
    });
  });

  describe('solveCosmicProblem', () => {
    it('should return CosmicProblemResult with expected structure', async () => {
      const result: CosmicProblemResult = await consciousness.solveCosmicProblem(
        'test cosmic problem'
      );

      expect(result).toBeDefined();
      expect(typeof result.eventId).toBe('string');
      expect(typeof result.memoryId).toBe('string');
      expect(result.solution).toBeDefined();
      expect(typeof result.solution.text).toBe('string');
    });
  });

  describe('reflect', () => {
    it('should return ReflectionResult with expected structure', () => {
      const result: ReflectionResult = consciousness.reflect();

      expect(result).toBeDefined();
      expect(typeof result.timestamp).toBe('number');
      expect(result.selfAwareness).toBeDefined();
      expect(typeof result.selfAwareness.overallAwareness).toBe('number');
      expect(typeof result.selfAwareness.stateRecognition).toBe('number');
      expect(typeof result.selfAwareness.emotionalUnderstanding).toBe('number');
      expect(typeof result.selfAwareness.goalClarity).toBe('number');
      expect(typeof result.selfAwareness.capabilityAssessment).toBe('number');
      expect(result.memoryStats).toBeDefined();
      expect(typeof result.memoryStats.total).toBe('number');
      expect(result.memoryStats.byType).toBeDefined();
      expect(result.temporalStats).toBeDefined();
      expect(typeof result.temporalStats.totalEvents).toBe('number');
      expect(result.learningStats).toBeDefined();
      expect(typeof result.learningStats.totalLearningCycles).toBe('number');
      expect(Array.isArray(result.patterns)).toBe(true);
      expect(typeof result.state).toBe('string');
    });
  });

  describe('maintain', () => {
    it('should return MaintenanceResult with expected structure', () => {
      const result: MaintenanceResult = consciousness.maintain();

      expect(result).toBeDefined();
      expect(result.consolidation).toBeDefined();
      expect(Array.isArray(result.consolidation.consolidated)).toBe(true);
      expect(Array.isArray(result.consolidation.archived)).toBe(true);
      expect(Array.isArray(result.consolidation.forgotten)).toBe(true);
      expect(Array.isArray(result.patterns)).toBe(true);
      expect(typeof result.timestamp).toBe('number');
    });
  });

  describe('getStatus', () => {
    it('should return StatusResult with expected structure', () => {
      const result: StatusResult = consciousness.getStatus();

      expect(result).toBeDefined();
      expect(result.isRunning).toBe(true);
      expect(typeof result.timestamp).toBe('number');
      expect(typeof result.cognitiveState).toBe('string');
      expect(result.memory).toBeDefined();
      expect(typeof result.memory.total).toBe('number');
      expect(result.memory.byType).toBeDefined();
      expect(result.temporal).toBeDefined();
      expect(typeof result.temporal.totalEvents).toBe('number');
      expect(result.learning).toBeDefined();
      expect(typeof result.learning.totalLearningCycles).toBe('number');
      expect(typeof result.geminiConfigured).toBe('boolean');
      expect(result.citadelMode).toBeDefined();
      expect(typeof result.citadelMode.enabled).toBe('boolean');
    });
  });

  describe('Type consistency', () => {
    it('should maintain consistent types across multiple calls', async () => {
      // First calls
      const input1: ProcessInputResult = await consciousness.processInput({ test: 1 });
      const think1: ThinkingResult = await consciousness.think('problem 1');
      const reflect1: ReflectionResult = consciousness.reflect();
      const status1: StatusResult = consciousness.getStatus();

      // Second calls
      const input2: ProcessInputResult = await consciousness.processInput({ test: 2 });
      const think2: ThinkingResult = await consciousness.think('problem 2');
      const reflect2: ReflectionResult = consciousness.reflect();
      const status2: StatusResult = consciousness.getStatus();

      // Verify all results have the expected structure
      expect(input1).toBeDefined();
      expect(input2).toBeDefined();
      expect(think1).toBeDefined();
      expect(think2).toBeDefined();
      expect(reflect1).toBeDefined();
      expect(reflect2).toBeDefined();
      expect(status1).toBeDefined();
      expect(status2).toBeDefined();
    });
  });
});
