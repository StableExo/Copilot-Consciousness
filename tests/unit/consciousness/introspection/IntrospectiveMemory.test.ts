/**
 * Tests for IntrospectiveMemory
 */

import { IntrospectiveMemory } from '../../../../src/consciousness/introspection';
import { MemorySystem } from '../../../../src/consciousness/memory';
import { MemoryType, Priority } from '../../../../src/types';

describe('IntrospectiveMemory', () => {
  let memorySystem: MemorySystem;
  let introspectiveMemory: IntrospectiveMemory;

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
    introspectiveMemory = new IntrospectiveMemory(memorySystem);
  });

  describe('basic recall', () => {
    it('should create introspective memory', () => {
      expect(introspectiveMemory).toBeDefined();
    });

    it('should recall memories by query', () => {
      // Add some memories to the system
      memorySystem.addShortTermMemory({ topic: 'test', data: 'hello world' }, Priority.MEDIUM);
      memorySystem.addShortTermMemory({ topic: 'other', data: 'different' }, Priority.MEDIUM);

      const results = introspectiveMemory.recall({ query: 'test' });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].memory).toBeDefined();
      expect(results[0].relevanceScore).toBeGreaterThan(0);
      expect(results[0].recallConfidence).toBeGreaterThan(0);
    });

    it('should recall by memory type', () => {
      memorySystem.addSensoryMemory({ data: 'sensory' });
      memorySystem.addShortTermMemory({ data: 'short' }, Priority.MEDIUM);
      memorySystem.addWorkingMemory({ data: 'working' }, Priority.HIGH);

      const shortTermResults = introspectiveMemory.recall({ type: MemoryType.SHORT_TERM });
      expect(shortTermResults.every((r) => r.memory.type === MemoryType.SHORT_TERM)).toBe(true);
    });

    it('should recall by priority', () => {
      memorySystem.addShortTermMemory({ data: 'low' }, Priority.LOW);
      memorySystem.addShortTermMemory({ data: 'high' }, Priority.HIGH);
      memorySystem.addShortTermMemory({ data: 'critical' }, Priority.CRITICAL);

      const results = introspectiveMemory.recall({ priority: Priority.HIGH });
      expect(results.every((r) => r.memory.priority >= Priority.HIGH)).toBe(true);
    });

    it('should recall by ID', () => {
      const memoryId = memorySystem.addShortTermMemory({ data: 'specific' }, Priority.MEDIUM);

      const result = introspectiveMemory.recallById(memoryId);
      expect(result).toBeDefined();
      expect(result?.memory.id).toBe(memoryId);
    });

    it('should return null for non-existent ID', () => {
      const result = introspectiveMemory.recallById('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('associated memories', () => {
    it('should recall associated memories', () => {
      const mem1 = memorySystem.addShortTermMemory({ data: 'memory 1' }, Priority.MEDIUM);
      const mem2 = memorySystem.addShortTermMemory({ data: 'memory 2' }, Priority.MEDIUM);
      
      memorySystem.associateMemories(mem1, mem2);

      const associated = introspectiveMemory.recallAssociated(mem1);
      expect(associated.length).toBeGreaterThan(0);
      expect(associated[0].memory.id).toBe(mem2);
    });

    it('should return empty for memory without associations', () => {
      const mem = memorySystem.addShortTermMemory({ data: 'lonely' }, Priority.MEDIUM);
      const associated = introspectiveMemory.recallAssociated(mem);
      expect(associated.length).toBe(0);
    });
  });

  describe('introspection', () => {
    beforeEach(() => {
      // Add various memories
      memorySystem.addShortTermMemory({ topic: 'learning', content: 'TypeScript basics' }, Priority.MEDIUM);
      memorySystem.addShortTermMemory({ topic: 'learning', content: 'React patterns' }, Priority.HIGH);
      memorySystem.addWorkingMemory({ topic: 'task', content: 'Build feature' }, Priority.HIGH);
    });

    it('should perform introspection', () => {
      const result = introspectiveMemory.introspect({
        type: 'memory',
        subject: 'learning',
        depth: 'deep',
      });

      expect(result).toBeDefined();
      expect(result.query).toBeDefined();
      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.insights.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should detect patterns in memories', () => {
      // Add more memories to trigger pattern detection
      for (let i = 0; i < 5; i++) {
        memorySystem.addShortTermMemory({ topic: 'pattern', index: i }, Priority.MEDIUM);
      }

      const result = introspectiveMemory.introspect({
        type: 'pattern',
        depth: 'deep',
      });

      expect(result.findings.some((f) => f.type === 'pattern')).toBe(true);
    });
  });

  describe('reflection on learning', () => {
    it('should reflect on what has been learned', () => {
      memorySystem.addShortTermMemory({ learning: 'concept 1' }, Priority.MEDIUM);
      memorySystem.addShortTermMemory({ learning: 'concept 2' }, Priority.HIGH);

      const reflection = introspectiveMemory.reflectOnLearning();

      expect(reflection.totalMemories).toBeGreaterThan(0);
      expect(reflection.recentLearning).toBeDefined();
      expect(reflection.patterns).toBeDefined();
    });
  });

  describe('knowledge queries', () => {
    it('should answer what do I know about a topic', () => {
      memorySystem.addShortTermMemory({ topic: 'JavaScript', detail: 'async/await' }, Priority.MEDIUM);
      memorySystem.addShortTermMemory({ topic: 'JavaScript', detail: 'promises' }, Priority.MEDIUM);

      const knowledge = introspectiveMemory.whatDoIKnow('JavaScript');

      expect(knowledge.memories.length).toBeGreaterThan(0);
      expect(knowledge.summary).toContain('JavaScript');
      expect(knowledge.confidence).toBeGreaterThan(0);
    });

    it('should identify knowledge gaps', () => {
      const knowledge = introspectiveMemory.whatDoIKnow('unknown-topic-xyz');

      expect(knowledge.memories.length).toBe(0);
      expect(knowledge.gaps.length).toBeGreaterThan(0);
      expect(knowledge.confidence).toBe(0);
    });
  });

  describe('thinking history', () => {
    it('should track what has been thought about', () => {
      // Trigger some recalls
      memorySystem.addShortTermMemory({ data: 'test1' }, Priority.MEDIUM);
      memorySystem.addShortTermMemory({ data: 'test2' }, Priority.MEDIUM);
      
      introspectiveMemory.recall({ query: 'test' });

      const thinking = introspectiveMemory.whatHaveIBeenThinkingAbout();

      expect(thinking.recentRecalls).toBeDefined();
      expect(thinking.introspectionSummary).toBeDefined();
    });
  });

  describe('history tracking', () => {
    it('should track recall history', () => {
      memorySystem.addShortTermMemory({ data: 'recall test' }, Priority.MEDIUM);
      
      introspectiveMemory.recall({ query: 'recall' });
      introspectiveMemory.recall({ query: 'test' });

      const history = introspectiveMemory.getRecallHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it('should track introspection history', () => {
      memorySystem.addShortTermMemory({ data: 'intro test' }, Priority.MEDIUM);
      
      introspectiveMemory.introspect({ type: 'memory', subject: 'test' });

      const history = introspectiveMemory.getIntrospectionHistory();
      expect(history.length).toBe(1);
    });

    it('should limit history results', () => {
      memorySystem.addShortTermMemory({ data: 'test' }, Priority.MEDIUM);
      
      for (let i = 0; i < 10; i++) {
        introspectiveMemory.recall({ query: 'test' });
      }

      const limited = introspectiveMemory.getRecallHistory(5);
      expect(limited.length).toBe(5);
    });
  });
});
