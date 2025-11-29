/**
 * RedisStore Tests
 *
 * Tests for the Redis memory backend.
 * Tests run in-memory mode without requiring actual Redis connection.
 */

import { RedisStore } from '../RedisStore';
import { MemoryType, Priority } from '../../../types';

describe('RedisStore', () => {
  let store: RedisStore;

  beforeEach(() => {
    // Initialize with lazy connect - won't actually connect to Redis
    store = new RedisStore({
      host: 'localhost',
      port: 6379,
      keyPrefix: 'test:warden:memory:',
    });
  });

  afterEach(async () => {
    if (store) {
      store.clear();
    }
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const defaultStore = new RedisStore();
      expect(defaultStore).toBeDefined();
    });

    it('should initialize with custom config', () => {
      const customStore = new RedisStore({
        host: 'custom-host',
        port: 6380,
        db: 1,
        keyPrefix: 'custom:',
      });
      expect(customStore).toBeDefined();
    });
  });

  describe('store (in-memory mode)', () => {
    it('should store a memory entry and return UUID', () => {
      const id = store.store({
        type: MemoryType.SHORT_TERM,
        content: { test: 'data' },
        timestamp: Date.now(),
        priority: Priority.MEDIUM,
        associations: [],
        metadata: {},
      });

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('should store in memory map for immediate access', () => {
      const id = store.store({
        type: MemoryType.WORKING,
        content: 'immediate access test',
        timestamp: Date.now(),
        priority: Priority.HIGH,
        associations: [],
        metadata: {},
      });

      const retrieved = store.retrieve(id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.content).toBe('immediate access test');
    });

    it('should store with emotional context', () => {
      const emotionalContext = {
        primaryEmotion: 'curious',
        intensity: 0.7,
        valence: 0.8,
        arousal: 0.5,
        timestamp: new Date(),
      };
      const id = store.store({
        type: MemoryType.EPISODIC,
        content: 'emotional memory',
        timestamp: Date.now(),
        priority: Priority.HIGH,
        associations: [],
        emotionalContext,
        metadata: {},
      });

      const retrieved = store.retrieve(id);
      expect(retrieved?.emotionalContext).toEqual(emotionalContext);
    });
  });

  describe('retrieve', () => {
    it('should return null for non-existent ID', () => {
      const result = store.retrieve('non-existent-id');
      expect(result).toBeNull();
    });

    it('should increment access count on retrieval', () => {
      const id = store.store({
        type: MemoryType.LONG_TERM,
        content: 'access count test',
        timestamp: Date.now(),
        priority: Priority.MEDIUM,
        associations: [],
        metadata: {},
      });

      const first = store.retrieve(id);
      expect(first?.accessCount).toBe(1);

      const second = store.retrieve(id);
      expect(second?.accessCount).toBe(2);
    });

    it('should update last accessed timestamp', () => {
      const id = store.store({
        type: MemoryType.SENSORY,
        content: 'timestamp test',
        timestamp: Date.now(),
        priority: Priority.LOW,
        associations: [],
        metadata: {},
      });

      const before = Date.now();
      const retrieved = store.retrieve(id);
      const after = Date.now();

      expect(retrieved?.lastAccessed).toBeGreaterThanOrEqual(before);
      expect(retrieved?.lastAccessed).toBeLessThanOrEqual(after);
    });
  });

  describe('search', () => {
    beforeEach(() => {
      // Seed test data
      store.store({
        type: MemoryType.SHORT_TERM,
        content: { topic: 'MEV opportunity' },
        timestamp: 1000,
        priority: Priority.HIGH,
        associations: [],
        metadata: {},
      });

      store.store({
        type: MemoryType.SHORT_TERM,
        content: { topic: 'gas optimization' },
        timestamp: 2000,
        priority: Priority.MEDIUM,
        associations: [],
        metadata: {},
      });

      store.store({
        type: MemoryType.LONG_TERM,
        content: { topic: 'protocol analysis' },
        timestamp: 3000,
        priority: Priority.LOW,
        associations: [],
        metadata: {},
      });
    });

    it('should search by type', () => {
      const results = store.search({ type: MemoryType.SHORT_TERM });
      expect(results.length).toBe(2);
    });

    it('should search by priority', () => {
      const results = store.search({ priority: Priority.HIGH });
      expect(results.length).toBe(1);
    });

    it('should search by time range', () => {
      const results = store.search({
        timeRange: { start: 1500, end: 2500 },
      });
      expect(results.length).toBe(1);
    });

    it('should search by content', () => {
      const results = store.search({ content: 'MEV' });
      expect(results.length).toBe(1);
      expect((results[0].content as Record<string, unknown>).topic).toBe('MEV opportunity');
    });

    it('should limit results', () => {
      const results = store.search({ limit: 1 });
      expect(results.length).toBe(1);
    });

    it('should return results in descending timestamp order', () => {
      const results = store.search({});
      expect(results[0].timestamp).toBeGreaterThan(results[1].timestamp);
    });

    it('should combine multiple filters', () => {
      // Note: priority filter uses >= comparison, so this returns both SHORT_TERM entries
      // since both have priority >= MEDIUM (HIGH=4 and MEDIUM=3 are both >= MEDIUM=3)
      const results = store.search({
        type: MemoryType.SHORT_TERM,
        priority: Priority.HIGH, // Use HIGH to get only the MEV opportunity
      });
      expect(results.length).toBe(1);
      expect((results[0].content as Record<string, unknown>).topic).toBe('MEV opportunity');
    });
  });

  describe('update', () => {
    it('should update memory content', () => {
      const id = store.store({
        type: MemoryType.WORKING,
        content: 'original content',
        timestamp: Date.now(),
        priority: Priority.MEDIUM,
        associations: [],
        metadata: {},
      });

      const success = store.update(id, { content: 'updated content' });
      expect(success).toBe(true);

      const retrieved = store.retrieve(id);
      expect(retrieved?.content).toBe('updated content');
    });

    it('should update multiple fields', () => {
      const id = store.store({
        type: MemoryType.WORKING,
        content: 'original',
        timestamp: Date.now(),
        priority: Priority.LOW,
        associations: [],
        metadata: {},
      });

      store.update(id, {
        priority: Priority.CRITICAL,
        associations: ['related-memory-id'],
      });

      const retrieved = store.retrieve(id);
      expect(retrieved?.priority).toBe(Priority.CRITICAL);
      expect(retrieved?.associations).toContain('related-memory-id');
    });

    it('should return false for non-existent ID', () => {
      const result = store.update('non-existent', { content: 'test' });
      expect(result).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete a memory entry', () => {
      const id = store.store({
        type: MemoryType.SENSORY,
        content: 'to be deleted',
        timestamp: Date.now(),
        priority: Priority.LOW,
        associations: [],
        metadata: {},
      });

      expect(store.retrieve(id)).not.toBeNull();

      const success = store.delete(id);
      expect(success).toBe(true);

      expect(store.retrieve(id)).toBeNull();
    });

    it('should return false for non-existent ID', () => {
      const result = store.delete('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('getByType', () => {
    it('should return all memories of a specific type', () => {
      store.store({
        type: MemoryType.PROCEDURAL,
        content: 'procedure 1',
        timestamp: Date.now(),
        priority: Priority.MEDIUM,
        associations: [],
        metadata: {},
      });

      store.store({
        type: MemoryType.PROCEDURAL,
        content: 'procedure 2',
        timestamp: Date.now(),
        priority: Priority.MEDIUM,
        associations: [],
        metadata: {},
      });

      store.store({
        type: MemoryType.SEMANTIC,
        content: 'semantic knowledge',
        timestamp: Date.now(),
        priority: Priority.MEDIUM,
        associations: [],
        metadata: {},
      });

      const procedural = store.getByType(MemoryType.PROCEDURAL);
      expect(procedural.length).toBe(2);
    });

    it('should return empty array for type with no memories', () => {
      const result = store.getByType(MemoryType.EPISODIC);
      expect(result).toEqual([]);
    });
  });

  describe('getSize', () => {
    it('should return correct count', () => {
      expect(store.getSize()).toBe(0);

      store.store({
        type: MemoryType.SENSORY,
        content: 'test',
        timestamp: Date.now(),
        priority: Priority.LOW,
        associations: [],
        metadata: {},
      });

      expect(store.getSize()).toBe(1);

      store.store({
        type: MemoryType.SENSORY,
        content: 'test 2',
        timestamp: Date.now(),
        priority: Priority.LOW,
        associations: [],
        metadata: {},
      });

      expect(store.getSize()).toBe(2);
    });
  });

  describe('clear', () => {
    it('should remove all memories', () => {
      store.store({
        type: MemoryType.SHORT_TERM,
        content: 'test 1',
        timestamp: Date.now(),
        priority: Priority.MEDIUM,
        associations: [],
        metadata: {},
      });

      store.store({
        type: MemoryType.SHORT_TERM,
        content: 'test 2',
        timestamp: Date.now(),
        priority: Priority.MEDIUM,
        associations: [],
        metadata: {},
      });

      expect(store.getSize()).toBe(2);

      store.clear();

      expect(store.getSize()).toBe(0);
    });
  });

  describe('isConnected', () => {
    it('should return false when not connected', () => {
      expect(store.isConnected()).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return statistics in disconnected mode', async () => {
      store.store({
        type: MemoryType.SHORT_TERM,
        content: 'test',
        timestamp: Date.now(),
        priority: Priority.MEDIUM,
        associations: [],
        metadata: {},
      });

      const stats = await store.getStats();

      expect(stats.connected).toBe(false);
      expect(stats.localMemories).toBe(1);
      expect(stats.redisMemories).toBe(0);
    });
  });

  describe('conversation history', () => {
    it('should maintain memory state across multiple operations', () => {
      // Store multiple memories
      const ids = [
        store.store({
          type: MemoryType.EPISODIC,
          content: 'event 1',
          timestamp: 1000,
          priority: Priority.HIGH,
          associations: [],
          metadata: {},
        }),
        store.store({
          type: MemoryType.EPISODIC,
          content: 'event 2',
          timestamp: 2000,
          priority: Priority.HIGH,
          associations: [],
          metadata: {},
        }),
        store.store({
          type: MemoryType.EPISODIC,
          content: 'event 3',
          timestamp: 3000,
          priority: Priority.HIGH,
          associations: [],
          metadata: {},
        }),
      ];

      // Associate memories
      store.update(ids[0], { associations: [ids[1]] });
      store.update(ids[1], { associations: [ids[0], ids[2]] });

      // Verify associations
      const mem0 = store.retrieve(ids[0]);
      const mem1 = store.retrieve(ids[1]);

      expect(mem0?.associations).toContain(ids[1]);
      expect(mem1?.associations).toContain(ids[0]);
      expect(mem1?.associations).toContain(ids[2]);

      // Delete one and verify others unaffected
      store.delete(ids[2]);
      expect(store.getSize()).toBe(2);
      expect(store.retrieve(ids[0])).not.toBeNull();
      expect(store.retrieve(ids[1])).not.toBeNull();
    });
  });
});
