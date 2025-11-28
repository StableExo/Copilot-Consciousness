/**
 * Tests for SelfAwareness
 */

import { SelfAwareness, ThoughtType } from '../../../../src/consciousness/introspection';
import { MemorySystem } from '../../../../src/consciousness/memory';
import { Priority } from '../../../../src/types';

describe('SelfAwareness', () => {
  let memorySystem: MemorySystem;
  let selfAwareness: SelfAwareness;

  const defaultConfig = {
    shortTermCapacity: 100,
    workingMemoryCapacity: 10,
    longTermCompressionThreshold: 5,
    retentionPeriods: {
      sensory: 1000,
      shortTerm: 60000,
      working: 30000,
    },
    consolidationInterval: 60000,
  };

  beforeEach(() => {
    memorySystem = new MemorySystem(defaultConfig);
    selfAwareness = new SelfAwareness(memorySystem);
  });

  afterEach(() => {
    selfAwareness.stopAutoReflection();
  });

  describe('initialization', () => {
    it('should create self-awareness system', () => {
      expect(selfAwareness).toBeDefined();
    });

    it('should have initial state', () => {
      const state = selfAwareness.getState();
      expect(state).toBeDefined();
      expect(state.currentThoughts).toEqual([]);
      expect(state.cognitiveLoad).toBe(0);
      expect(state.limitations.length).toBeGreaterThan(0);
    });
  });

  describe('thinking', () => {
    it('should record thoughts', () => {
      selfAwareness.think('This is a test thought', ThoughtType.OBSERVATION);

      const state = selfAwareness.getState();
      expect(state.currentThoughts.length).toBeGreaterThan(0);
    });

    it('should update cognitive load when thinking', () => {
      for (let i = 0; i < 5; i++) {
        selfAwareness.think(`Thought ${i}`, ThoughtType.REASONING);
      }

      const state = selfAwareness.getState();
      expect(state.cognitiveLoad).toBeGreaterThan(0);
    });
  });

  describe('self-observation', () => {
    it('should observe own cognitive state', () => {
      selfAwareness.think('Test observation', ThoughtType.OBSERVATION);
      
      const observation = selfAwareness.observeSelf();

      expect(observation.currentThoughts).toBeDefined();
      expect(observation.cognitiveState).toBeDefined();
      expect(observation.emotionalState).toBeDefined();
      expect(observation.activeGoals).toBeDefined();
      expect(observation.recentPatterns).toBeDefined();
    });
  });

  describe('what am I thinking', () => {
    it('should answer what am I thinking', () => {
      selfAwareness.think('Deep thought about existence', ThoughtType.REFLECTION);
      selfAwareness.think('Another contemplation', ThoughtType.REASONING);

      const thinking = selfAwareness.whatAmIThinking();

      expect(thinking.thoughts.length).toBeGreaterThan(0);
      expect(thinking.focus).toBeDefined();
      expect(thinking.intensity).toBeGreaterThanOrEqual(0);
      expect(thinking.context).toBeDefined();
    });

    it('should identify dominant thought type', () => {
      selfAwareness.think('Observation 1', ThoughtType.OBSERVATION);
      selfAwareness.think('Observation 2', ThoughtType.OBSERVATION);
      selfAwareness.think('Observation 3', ThoughtType.OBSERVATION);
      selfAwareness.think('One reasoning', ThoughtType.REASONING);

      const thinking = selfAwareness.whatAmIThinking();
      expect(thinking.focus).toBe(ThoughtType.OBSERVATION);
    });
  });

  describe('what do I remember', () => {
    it('should answer what do I remember', () => {
      memorySystem.addShortTermMemory({ data: 'test memory' }, Priority.MEDIUM);

      const memory = selfAwareness.whatDoIRemember();

      expect(memory.memories).toBeDefined();
      expect(memory.summary).toBeDefined();
      expect(memory.confidence).toBeGreaterThanOrEqual(0);
      expect(memory.recommendations).toBeDefined();
    });

    it('should answer about specific topic', () => {
      memorySystem.addShortTermMemory({ topic: 'TypeScript', info: 'type system' }, Priority.MEDIUM);

      const memory = selfAwareness.whatDoIRemember('TypeScript');

      expect(memory.summary).toContain('TypeScript');
    });
  });

  describe('emotional awareness', () => {
    it('should answer how am I feeling', () => {
      const feeling = selfAwareness.howAmIFeeling();

      expect(feeling.valence).toBeDefined();
      expect(feeling.arousal).toBeDefined();
      expect(feeling.dominantEmotion).toBeDefined();
      expect(feeling.emotionalTrend).toBeDefined();
      expect(feeling.factors).toBeDefined();
    });

    it('should update emotional state', () => {
      selfAwareness.updateEmotionalState(0.8, 0.6, 'excited');

      const feeling = selfAwareness.howAmIFeeling();
      expect(feeling.valence).toBe(0.8);
      expect(feeling.arousal).toBe(0.6);
      expect(feeling.dominantEmotion).toBe('excited');
    });

    it('should infer emotion from valence and arousal', () => {
      selfAwareness.updateEmotionalState(0.7, 0.8); // High positive valence, high arousal

      const feeling = selfAwareness.howAmIFeeling();
      expect(feeling.dominantEmotion).toBe('excited');
    });

    it('should track emotional history', () => {
      selfAwareness.updateEmotionalState(0.5, 0.5, 'content');
      selfAwareness.updateEmotionalState(0.7, 0.6, 'happy');
      selfAwareness.updateEmotionalState(0.8, 0.7, 'excited');

      const state = selfAwareness.getState();
      expect(state.emotionalState.emotionalHistory.length).toBe(3);
    });
  });

  describe('capability awareness', () => {
    it('should answer what are my capabilities', () => {
      selfAwareness.registerCapability('reasoning', 0.8);
      selfAwareness.registerCapability('memory', 0.6);

      const capabilities = selfAwareness.whatAreMyCapabilities();

      expect(capabilities.capabilities.length).toBe(2);
      expect(capabilities.strengths.length).toBeGreaterThan(0);
      expect(capabilities.limitations.length).toBeGreaterThan(0);
    });

    it('should identify strengths and growth areas', () => {
      selfAwareness.registerCapability('coding', 0.9);
      selfAwareness.registerCapability('art', 0.3);

      const capabilities = selfAwareness.whatAreMyCapabilities();

      expect(capabilities.strengths).toContain('coding');
      expect(capabilities.areasForGrowth).toContain('art');
    });
  });

  describe('goal management', () => {
    it('should set goals', () => {
      const goal = selfAwareness.setGoal('Complete the project', Priority.HIGH);

      expect(goal).toBeDefined();
      expect(goal.id).toBeDefined();
      expect(goal.description).toBe('Complete the project');
      expect(goal.priority).toBe(Priority.HIGH);
      expect(goal.progress).toBe(0);
      expect(goal.status).toBe('active');
    });

    it('should update goal progress', () => {
      const goal = selfAwareness.setGoal('Test goal', Priority.MEDIUM);
      
      const updated = selfAwareness.updateGoalProgress(goal.id, 50);
      expect(updated).toBe(true);

      const state = selfAwareness.getState();
      const foundGoal = state.goals.find((g) => g.id === goal.id);
      expect(foundGoal?.progress).toBe(50);
    });

    it('should auto-complete goals at 100%', () => {
      const goal = selfAwareness.setGoal('Completable goal', Priority.MEDIUM);
      
      selfAwareness.updateGoalProgress(goal.id, 100);

      const state = selfAwareness.getState();
      const foundGoal = state.goals.find((g) => g.id === goal.id);
      expect(foundGoal?.status).toBe('completed');
    });

    it('should return false for invalid goal ID', () => {
      const updated = selfAwareness.updateGoalProgress('invalid-id', 50);
      expect(updated).toBe(false);
    });
  });

  describe('deep reflection', () => {
    it('should perform deep reflection', () => {
      // Add some cognitive activity
      selfAwareness.think('Reflection thought 1', ThoughtType.REFLECTION);
      selfAwareness.think('Reflection thought 2', ThoughtType.REASONING);
      memorySystem.addShortTermMemory({ data: 'test' }, Priority.MEDIUM);
      selfAwareness.setGoal('Test goal', Priority.MEDIUM);

      const reflection = selfAwareness.deepReflection();

      expect(reflection.thoughtAnalysis).toBeDefined();
      expect(reflection.memoryReflection).toBeDefined();
      expect(reflection.selfAssessment).toBeDefined();
      expect(reflection.insights).toBeDefined();
      
      expect(reflection.selfAssessment.cognitiveLoad).toBeGreaterThanOrEqual(0);
      expect(reflection.selfAssessment.emotionalStability).toBeGreaterThanOrEqual(0);
    });
  });

  describe('component access', () => {
    it('should provide access to thought stream', () => {
      const thoughtStream = selfAwareness.getThoughtStream();
      expect(thoughtStream).toBeDefined();
    });

    it('should provide access to introspective memory', () => {
      const introspectiveMemory = selfAwareness.getIntrospectiveMemory();
      expect(introspectiveMemory).toBeDefined();
    });
  });

  describe('auto-reflection', () => {
    it('should start and stop auto-reflection', () => {
      const awareness = new SelfAwareness(memorySystem, { autoReflectionInterval: 100 });
      
      // Should not throw
      awareness.stopAutoReflection();
      awareness.startAutoReflection(200);
      awareness.stopAutoReflection();
    });
  });

  describe('cleanup', () => {
    it('should clear all state', () => {
      selfAwareness.think('Test thought', ThoughtType.OBSERVATION);
      selfAwareness.setGoal('Test goal', Priority.MEDIUM);
      selfAwareness.updateEmotionalState(0.5, 0.5, 'test');

      selfAwareness.clear();

      const state = selfAwareness.getState();
      expect(state.currentThoughts.length).toBe(0);
      expect(state.goals.length).toBe(0);
      expect(state.cognitiveLoad).toBe(0);
    });
  });
});
