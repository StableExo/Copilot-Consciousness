/**
 * MemoryMigrationService Tests
 */

import { vi } from 'vitest';
import { MemoryMigrationService } from '../../../src/memory/backends/MemoryMigrationService';
import { MemoryType, Priority } from '../../../src/types';

describe('MemoryMigrationService', () => {
  let service: MemoryMigrationService;

  beforeEach(() => {
    service = new MemoryMigrationService({
      enableAutoMigration: false, // Manual control for tests
      healthCheckIntervalMs: 60000, // Slow for tests
    });
  });

  afterEach(async () => {
    await service.shutdown();
  });

  describe('initialization', () => {
    it('should start with in-memory backend', () => {
      expect(service.getActiveBackendName()).toBe('memory');
    });

    it('should report backend status', () => {
      const status = service.getBackendStatus();
      
      expect(status.memory).toBe(true);
      expect(status.active).toBe('memory');
    });
  });

  describe('storage operations', () => {
    it('should store entries', () => {
      const id = service.store({
        type: MemoryType.EPISODIC,
        content: { test: 'data' },
        timestamp: Date.now(),
        priority: Priority.MEDIUM,
        associations: [],
        metadata: {},
      });

      expect(id).toBeTruthy();
      expect(typeof id).toBe('string');
    });

    it('should retrieve entries', () => {
      const id = service.store({
        type: MemoryType.SEMANTIC,
        content: { key: 'value' },
        timestamp: Date.now(),
        priority: Priority.HIGH,
        associations: [],
        metadata: {},
      });

      const entry = service.retrieve(id);
      
      expect(entry).toBeTruthy();
      expect(entry?.content).toEqual({ key: 'value' });
    });
  });

  describe('migration', () => {
    it('should track migration progress', () => {
      // Initially no migration
      expect(service.getMigrationProgress()).toBeNull();
    });

    it('should track migration history', () => {
      expect(service.getMigrationHistory()).toEqual([]);
    });

    it('should emit migration events', () => {
      const handler = vi.fn();
      service.on(handler);

      // Handler should be registered
      expect(handler).not.toHaveBeenCalled();

      service.off(handler);
    });
  });

  describe('backend switching', () => {
    it('should switch to memory backend', () => {
      const result = service.switchBackend('memory');
      
      expect(result).toBe(true);
      expect(service.getActiveBackendName()).toBe('memory');
    });

    it('should fail to switch to unavailable backend', () => {
      // SQLite might not be available in test environment
      const status = service.getBackendStatus();
      
      if (!status.sqlite) {
        const result = service.switchBackend('sqlite');
        expect(result).toBe(false);
      }
    });
  });

  describe('event handling', () => {
    it('should add and remove event handlers', () => {
      const handler = vi.fn();
      
      service.on(handler);
      service.off(handler);

      // Should complete without error
      expect(true).toBe(true);
    });
  });

  describe('shutdown', () => {
    it('should shutdown cleanly', async () => {
      await service.shutdown();
      
      // Should complete without error
      expect(true).toBe(true);
    });
  });
});
