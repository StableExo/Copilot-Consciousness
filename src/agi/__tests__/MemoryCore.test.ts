/**
 * Tests for MemoryCore
 */

import { MemoryCore } from '../MemoryCore';
import { AGIMemoryEntry, EmotionalContext } from '../types';
import { Priority } from '../../types';

describe('MemoryCore', () => {
  let memoryCore: MemoryCore;

  beforeEach(() => {
    memoryCore = new MemoryCore();
  });

  describe('store', () => {
    it('should store a memory entry', async () => {
      const emotionalContext: EmotionalContext = {
        primaryEmotion: 'curious',
        intensity: 0.7,
        valence: 0.5,
        arousal: 0.6,
        timestamp: new Date(),
      };

      const memory: AGIMemoryEntry = {
        id: 'test-1',
        timestamp: new Date().toISOString(),
        type: 'semantic' as any,
        content: 'Test memory content',
        associations: [],
        emotionalContext,
        source: 'test',
        priority: Priority.MEDIUM,
      };

      await memoryCore.store(memory);

      expect(memoryCore.getSize()).toBe(1);
      expect(memoryCore.getMemory('test-1')).toEqual(memory);
    });

    it('should store multiple memories', async () => {
      const emotionalContext: EmotionalContext = {
        primaryEmotion: 'neutral',
        intensity: 0.5,
        valence: 0.0,
        arousal: 0.3,
        timestamp: new Date(),
      };

      const memory1: AGIMemoryEntry = {
        id: 'test-1',
        timestamp: new Date().toISOString(),
        type: 'episodic' as any,
        content: 'First memory',
        associations: [],
        emotionalContext,
        source: 'test',
        priority: Priority.LOW,
      };

      const memory2: AGIMemoryEntry = {
        id: 'test-2',
        timestamp: new Date().toISOString(),
        type: 'semantic' as any,
        content: 'Second memory',
        associations: ['test-1'],
        emotionalContext,
        source: 'test',
        priority: Priority.HIGH,
      };

      await memoryCore.store(memory1);
      await memoryCore.store(memory2);

      expect(memoryCore.getSize()).toBe(2);
      expect(memoryCore.getAllMemories()).toHaveLength(2);
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      const emotionalContext: EmotionalContext = {
        primaryEmotion: 'neutral',
        intensity: 0.5,
        valence: 0.0,
        arousal: 0.3,
        timestamp: new Date(),
      };

      const memories: AGIMemoryEntry[] = [
        {
          id: 'mem-1',
          timestamp: new Date().toISOString(),
          type: 'semantic' as any,
          content: 'The sky is blue',
          associations: [],
          emotionalContext,
          source: 'test',
          priority: Priority.MEDIUM,
        },
        {
          id: 'mem-2',
          timestamp: new Date().toISOString(),
          type: 'episodic' as any,
          content: 'I saw a blue car yesterday',
          associations: [],
          emotionalContext,
          source: 'test',
          priority: Priority.LOW,
        },
        {
          id: 'mem-3',
          timestamp: new Date().toISOString(),
          type: 'semantic' as any,
          content: 'Red is a primary color',
          associations: [],
          emotionalContext,
          source: 'test',
          priority: Priority.MEDIUM,
        },
      ];

      for (const memory of memories) {
        await memoryCore.store(memory);
      }
    });

    it('should find memories matching the query', async () => {
      const results = await memoryCore.search('blue');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((m) => m.content.includes('blue'))).toBe(true);
    });

    it('should limit results', async () => {
      const results = await memoryCore.search('blue', 1);

      expect(results.length).toBeLessThanOrEqual(1);
    });

    it('should return empty array when no matches found', async () => {
      const results = await memoryCore.search('nonexistent');

      expect(results).toEqual([]);
    });
  });

  describe('getMemory', () => {
    it('should retrieve a memory by id', async () => {
      const emotionalContext: EmotionalContext = {
        primaryEmotion: 'happy',
        intensity: 0.8,
        valence: 0.9,
        arousal: 0.7,
        timestamp: new Date(),
      };

      const memory: AGIMemoryEntry = {
        id: 'test-retrieve',
        timestamp: new Date().toISOString(),
        type: 'episodic' as any,
        content: 'Memory to retrieve',
        associations: [],
        emotionalContext,
        source: 'test',
        priority: Priority.HIGH,
      };

      await memoryCore.store(memory);
      const retrieved = memoryCore.getMemory('test-retrieve');

      expect(retrieved).toEqual(memory);
    });

    it('should return undefined for non-existent memory', () => {
      const retrieved = memoryCore.getMemory('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('deleteMemory', () => {
    it('should delete a memory', async () => {
      const emotionalContext: EmotionalContext = {
        primaryEmotion: 'neutral',
        intensity: 0.5,
        valence: 0.0,
        arousal: 0.3,
        timestamp: new Date(),
      };

      const memory: AGIMemoryEntry = {
        id: 'test-delete',
        timestamp: new Date().toISOString(),
        type: 'short_term' as any,
        content: 'Memory to delete',
        associations: [],
        emotionalContext,
        source: 'test',
        priority: Priority.LOW,
      };

      await memoryCore.store(memory);
      expect(memoryCore.getSize()).toBe(1);

      const deleted = memoryCore.deleteMemory('test-delete');
      expect(deleted).toBe(true);
      expect(memoryCore.getSize()).toBe(0);
    });

    it('should return false when deleting non-existent memory', () => {
      const deleted = memoryCore.deleteMemory('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all memories', async () => {
      const emotionalContext: EmotionalContext = {
        primaryEmotion: 'neutral',
        intensity: 0.5,
        valence: 0.0,
        arousal: 0.3,
        timestamp: new Date(),
      };

      const memory: AGIMemoryEntry = {
        id: 'test-clear',
        timestamp: new Date().toISOString(),
        type: 'working' as any,
        content: 'Memory to clear',
        associations: [],
        emotionalContext,
        source: 'test',
        priority: Priority.MEDIUM,
      };

      await memoryCore.store(memory);
      expect(memoryCore.getSize()).toBe(1);

      memoryCore.clear();
      expect(memoryCore.getSize()).toBe(0);
      expect(memoryCore.getAllMemories()).toEqual([]);
    });
  });
});
