/**
 * Tests for Memory Consolidation System
 */

import {
  MemoryConsolidator,
  Memory,
  ConsolidationCriteria,
} from '../../../src/consciousness/memory/consolidation/MemoryConsolidator';

describe('Memory Consolidation System', () => {
  let consolidator: MemoryConsolidator;

  beforeEach(() => {
    consolidator = new MemoryConsolidator();
  });

  describe('MemoryConsolidator', () => {
    it('should create consolidator', () => {
      expect(consolidator).toBeDefined();
    });

    it('should add memory', () => {
      const memory: Memory = {
        id: 'mem1',
        content: { data: 'test' },
        type: 'working',
        timestamp: Date.now(),
        accessCount: 0,
        lastAccessed: Date.now(),
        importance: 0.7,
        associations: [],
        metadata: {},
      };

      consolidator.addMemory(memory);
      
      const retrieved = consolidator.getMemory('mem1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('mem1');
      expect(retrieved?.accessCount).toBe(1); // Gets incremented on retrieval
    });

    it('should consolidate short-term to long-term memory', () => {
      // Add working memory that qualifies for consolidation
      const memory: Memory = {
        id: 'mem1',
        content: { data: 'important' },
        type: 'working',
        timestamp: Date.now() - 120000, // 2 minutes old
        accessCount: 5,
        lastAccessed: Date.now(),
        importance: 0.8,
        associations: [],
        metadata: {},
      };

      consolidator.addMemory(memory);

      const result = consolidator.consolidate();

      expect(result.consolidated).toBeGreaterThan(0);
      
      const retrieved = consolidator.getMemory('mem1');
      expect(retrieved?.type).toBe('longTerm');
    });

    it('should not consolidate low-importance memories', () => {
      const memory: Memory = {
        id: 'mem1',
        content: { data: 'unimportant' },
        type: 'working',
        timestamp: Date.now() - 120000,
        accessCount: 1,
        importance: 0.3, // Below threshold
        associations: [],
        metadata: {},
      };

      consolidator.addMemory(memory);

      const result = consolidator.consolidate();

      const retrieved = consolidator.getMemory('mem1');
      expect(retrieved?.type).toBe('working'); // Should remain working
    });

    it('should reinforce important memories', () => {
      const memory: Memory = {
        id: 'mem1',
        content: { data: 'important' },
        type: 'longTerm',
        timestamp: Date.now(),
        accessCount: 10,
        lastAccessed: Date.now(),
        importance: 0.7,
        associations: [],
        metadata: {},
      };

      consolidator.addMemory(memory);
      
      const initialImportance = memory.importance;
      consolidator.consolidate();

      const retrieved = consolidator.getMemory('mem1');
      expect(retrieved?.importance).toBeGreaterThanOrEqual(initialImportance);
    });

    it('should build associations between related memories', () => {
      const memory1: Memory = {
        id: 'mem1',
        content: { data: 'event1' },
        type: 'longTerm',
        timestamp: Date.now(),
        accessCount: 5,
        lastAccessed: Date.now(),
        importance: 0.8,
        associations: [],
        metadata: { type: 'arbitrage', success: true },
      };

      const memory2: Memory = {
        id: 'mem2',
        content: { data: 'event2' },
        type: 'longTerm',
        timestamp: Date.now() + 500, // Close in time
        accessCount: 5,
        lastAccessed: Date.now(),
        importance: 0.8,
        associations: [],
        metadata: { type: 'arbitrage', success: true },
      };

      consolidator.addMemory(memory1);
      consolidator.addMemory(memory2);

      const result = consolidator.consolidate();

      expect(result.associationsBuilt).toBeGreaterThan(0);
      
      const retrieved1 = consolidator.getMemory('mem1');
      expect(retrieved1?.associations.length).toBeGreaterThan(0);
    });

    it('should prune low-relevance memories', () => {
      // Add old, low-importance memory
      const memory: Memory = {
        id: 'mem1',
        content: { data: 'old' },
        type: 'working',
        timestamp: Date.now() - 7 * 24 * 3600000, // 7 days old
        accessCount: 0,
        lastAccessed: Date.now() - 7 * 24 * 3600000,
        importance: 0.1,
        associations: [],
        metadata: {},
      };

      consolidator.addMemory(memory);

      const result = consolidator.consolidate();

      expect(result.pruned).toBeGreaterThan(0);
      
      const retrieved = consolidator.getMemory('mem1');
      expect(retrieved).toBeUndefined();
    });

    it('should not prune long-term memories', () => {
      const memory: Memory = {
        id: 'mem1',
        content: { data: 'long-term' },
        type: 'longTerm',
        timestamp: Date.now() - 30 * 24 * 3600000, // 30 days old
        accessCount: 1,
        lastAccessed: Date.now() - 30 * 24 * 3600000,
        importance: 0.2, // Low importance
        associations: [],
        metadata: {},
      };

      consolidator.addMemory(memory);

      const result = consolidator.consolidate();

      const retrieved = consolidator.getMemory('mem1');
      expect(retrieved).toBeDefined(); // Long-term memories are preserved
    });

    it('should provide consolidation statistics', () => {
      // Add various memories
      for (let i = 0; i < 5; i++) {
        const memory: Memory = {
          id: `mem${i}`,
          content: { data: `data${i}` },
          type: 'working',
          timestamp: Date.now() - 120000,
          accessCount: 3,
          lastAccessed: Date.now(),
          importance: 0.6 + i * 0.1,
          associations: [],
          metadata: {},
        };
        consolidator.addMemory(memory);
      }

      const result = consolidator.consolidate();

      expect(result.memoryStats).toBeDefined();
      expect(result.memoryStats.working).toBeGreaterThanOrEqual(0);
      expect(result.memoryStats.longTerm).toBeGreaterThanOrEqual(0);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should respect custom consolidation criteria', () => {
      const memory: Memory = {
        id: 'mem1',
        content: { data: 'test' },
        type: 'working',
        timestamp: Date.now() - 30000, // 30 seconds old
        accessCount: 10,
        lastAccessed: Date.now(),
        importance: 0.9,
        associations: [],
        metadata: {},
      };

      consolidator.addMemory(memory);

      // Custom criteria requiring older age
      const criteria: ConsolidationCriteria = {
        minAge: 60000, // 1 minute
      };

      const result = consolidator.consolidate(criteria);

      // Should not consolidate because it's too young
      const retrieved = consolidator.getMemory('mem1');
      expect(retrieved?.type).toBe('working');
    });

    it('should track consolidation history', () => {
      const memory: Memory = {
        id: 'mem1',
        content: { data: 'test' },
        type: 'working',
        timestamp: Date.now() - 120000,
        accessCount: 5,
        lastAccessed: Date.now(),
        importance: 0.8,
        associations: [],
        metadata: {},
      };

      consolidator.addMemory(memory);

      consolidator.consolidate();
      consolidator.consolidate();

      const history = consolidator.getConsolidationHistory();
      expect(history.length).toBe(2);
    });

    it('should get all memories', () => {
      for (let i = 0; i < 3; i++) {
        const memory: Memory = {
          id: `mem${i}`,
          content: { data: `data${i}` },
          type: 'working',
          timestamp: Date.now(),
          accessCount: 0,
          lastAccessed: Date.now(),
          importance: 0.7,
          associations: [],
          metadata: {},
        };
        consolidator.addMemory(memory);
      }

      const allMemories = consolidator.getAllMemories();
      expect(allMemories.length).toBe(3);
    });

    it('should get memory count', () => {
      consolidator.addMemory({
        id: 'mem1',
        content: {},
        type: 'working',
        timestamp: Date.now(),
        accessCount: 0,
        lastAccessed: Date.now(),
        importance: 0.7,
        associations: [],
        metadata: {},
      });

      expect(consolidator.getMemoryCount()).toBe(1);
    });

    it('should clear all memories', () => {
      consolidator.addMemory({
        id: 'mem1',
        content: {},
        type: 'working',
        timestamp: Date.now(),
        accessCount: 0,
        lastAccessed: Date.now(),
        importance: 0.7,
        associations: [],
        metadata: {},
      });

      consolidator.clearAllMemories();
      expect(consolidator.getMemoryCount()).toBe(0);
    });

    it('should update consolidation parameters', () => {
      consolidator.updateParams({
        importanceThreshold: 0.8,
        minAge: 120000,
      });

      // Verify new parameters take effect
      const memory: Memory = {
        id: 'mem1',
        content: { data: 'test' },
        type: 'working',
        timestamp: Date.now() - 90000, // 1.5 minutes old
        accessCount: 5,
        lastAccessed: Date.now(),
        importance: 0.75, // Below new threshold
        associations: [],
        metadata: {},
      };

      consolidator.addMemory(memory);
      consolidator.consolidate();

      const retrieved = consolidator.getMemory('mem1');
      expect(retrieved?.type).toBe('working'); // Should not consolidate
    });

    it('should handle background consolidation', () => {
      const memory: Memory = {
        id: 'mem1',
        content: { data: 'test' },
        type: 'working',
        timestamp: Date.now() - 120000,
        accessCount: 5,
        lastAccessed: Date.now(),
        importance: 0.8,
        associations: [],
        metadata: {},
      };

      consolidator.addMemory(memory);
      consolidator.backgroundConsolidation();

      const retrieved = consolidator.getMemory('mem1');
      expect(retrieved?.type).toBe('longTerm');
    });

    it('should start and stop background consolidation', () => {
      consolidator.startBackgroundConsolidation();
      
      // Should be able to stop
      consolidator.stopBackgroundConsolidation();
      
      // Starting again should work
      consolidator.startBackgroundConsolidation();
      consolidator.stopBackgroundConsolidation();
    });
  });
});
