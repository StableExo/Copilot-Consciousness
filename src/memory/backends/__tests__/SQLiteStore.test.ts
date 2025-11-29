/**
 * SQLiteStore Tests
 *
 * Tests for the SQLite persistent memory backend.
 */

import * as fs from 'fs';
import * as path from 'path';
import { SQLiteStore } from '../SQLiteStore';
import { MemoryType, Priority } from '../../../types';

describe('SQLiteStore', () => {
  let store: SQLiteStore;
  const testDbPath = path.join('/tmp', 'test-memory', 'test-warden.db');

  beforeEach(() => {
    // Clean up test database
    const _testDir = path.dirname(testDbPath);
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    if (fs.existsSync(testDbPath + '-wal')) {
      fs.unlinkSync(testDbPath + '-wal');
    }
    if (fs.existsSync(testDbPath + '-shm')) {
      fs.unlinkSync(testDbPath + '-shm');
    }

    store = new SQLiteStore({ dbPath: testDbPath });
  });

  afterEach(() => {
    if (store) {
      store.close();
    }
  });

  describe('initialization', () => {
    it('should create database file', () => {
      expect(fs.existsSync(testDbPath)).toBe(true);
    });

    it('should create database directory if not exists', () => {
      const customPath = path.join('/tmp', 'test-memory-custom', 'custom.db');
      const customStore = new SQLiteStore({ dbPath: customPath });
      expect(fs.existsSync(path.dirname(customPath))).toBe(true);
      customStore.close();
    });
  });

  describe('store', () => {
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

    it('should store and retrieve content correctly', () => {
      const content = { key: 'value', nested: { deep: true } };
      const id = store.store({
        type: MemoryType.LONG_TERM,
        content,
        timestamp: Date.now(),
        priority: Priority.HIGH,
        associations: [],
        metadata: { source: 'test' },
      });

      const retrieved = store.retrieve(id);
      expect(retrieved?.content).toEqual(content);
    });

    it('should store with emotional context', () => {
      const emotionalContext = {
        primaryEmotion: 'curious',
        intensity: 0.7,
        valence: 0.5,
        arousal: 0.7,
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
        type: MemoryType.WORKING,
        content: 'test',
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
        content: 'test',
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
        content: { topic: 'market analysis' },
        timestamp: 1000,
        priority: Priority.HIGH,
        associations: [],
        metadata: {},
      });

      store.store({
        type: MemoryType.SHORT_TERM,
        content: { topic: 'trading strategy' },
        timestamp: 2000,
        priority: Priority.MEDIUM,
        associations: [],
        metadata: {},
      });

      store.store({
        type: MemoryType.LONG_TERM,
        content: { topic: 'historical data' },
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
      const results = store.search({ content: 'market' });
      expect(results.length).toBe(1);
      expect((results[0].content as Record<string, unknown>).topic).toBe('market analysis');
    });

    it('should limit results', () => {
      const results = store.search({ limit: 1 });
      expect(results.length).toBe(1);
    });

    it('should return results in descending timestamp order', () => {
      const results = store.search({});
      expect(results[0].timestamp).toBeGreaterThan(results[1].timestamp);
    });
  });

  describe('update', () => {
    it('should update memory content', () => {
      const id = store.store({
        type: MemoryType.WORKING,
        content: 'original',
        timestamp: Date.now(),
        priority: Priority.MEDIUM,
        associations: [],
        metadata: {},
      });

      const success = store.update(id, { content: 'updated' });
      expect(success).toBe(true);

      const retrieved = store.retrieve(id);
      expect(retrieved?.content).toBe('updated');
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
        priority: Priority.HIGH,
        associations: ['other-id'],
      });

      const retrieved = store.retrieve(id);
      expect(retrieved?.priority).toBe(Priority.HIGH);
      expect(retrieved?.associations).toContain('other-id');
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
        content: 'semantic data',
        timestamp: Date.now(),
        priority: Priority.MEDIUM,
        associations: [],
        metadata: {},
      });

      const procedural = store.getByType(MemoryType.PROCEDURAL);
      expect(procedural.length).toBe(2);
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

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      store.store({
        type: MemoryType.SHORT_TERM,
        content: 'test',
        timestamp: Date.now(),
        priority: Priority.MEDIUM,
        associations: [],
        metadata: {},
      });

      store.store({
        type: MemoryType.LONG_TERM,
        content: 'test',
        timestamp: Date.now(),
        priority: Priority.MEDIUM,
        associations: [],
        metadata: {},
      });

      const stats = store.getStats();

      expect(stats.totalMemories).toBe(2);
      expect(stats.byType[MemoryType.SHORT_TERM]).toBe(1);
      expect(stats.byType[MemoryType.LONG_TERM]).toBe(1);
      expect(stats.walMode).toBe(true);
      expect(stats.dbSizeBytes).toBeGreaterThan(0);
    });
  });

  describe('vacuum', () => {
    it('should complete without error', () => {
      store.store({
        type: MemoryType.SENSORY,
        content: 'test',
        timestamp: Date.now(),
        priority: Priority.LOW,
        associations: [],
        metadata: {},
      });

      expect(() => store.vacuum()).not.toThrow();
    });
  });
});
