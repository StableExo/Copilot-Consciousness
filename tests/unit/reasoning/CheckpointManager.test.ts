/**
 * CheckpointManager Unit Tests
 * 
 * Tests for checkpoint management in transactional reasoning.
 * 
 * Core tests from problem statement:
 * ✅ Should create checkpoints with snapshots
 * ✅ Should retrieve checkpoints by ID
 * ✅ Should enforce max checkpoint limit
 * ✅ Should cleanup expired checkpoints
 * ✅ Should deep clone cognitive state
 */

import { CheckpointManager } from '../../../src/reasoning/CheckpointManager';
import { CognitiveState } from '../../../src/types';
import { MemoryEntry } from '../../../src/consciousness/memory/types';

describe('CheckpointManager', () => {
  let manager: CheckpointManager;

  beforeEach(() => {
    manager = new CheckpointManager(10, 3600000); // 10 max, 1 hour retention
  });

  describe('Checkpoint Creation', () => {
    it('should create checkpoints with snapshots', () => {
      const cognitiveState = CognitiveState.ACTIVE;
      const memoryEntries: MemoryEntry[] = [
        {
          id: 'mem1',
          type: 'sensory' as any,
          content: { data: 'test' },
          timestamp: Date.now(),
          strength: 0.8,
          associations: [],
        },
      ];
      const knowledgeBase = new Map([['key1', 'value1']]);
      const skills = new Map([['skill1', 0.7]]);

      const checkpoint = manager.createCheckpoint(
        cognitiveState,
        memoryEntries,
        knowledgeBase,
        skills,
        'Test checkpoint'
      );

      expect(checkpoint.id).toBeDefined();
      expect(checkpoint.timestamp).toBeGreaterThan(0);
      expect(checkpoint.description).toBe('Test checkpoint');
      expect(checkpoint.snapshot).toBeDefined();
      expect(checkpoint.snapshot.state).toBe(CognitiveState.ACTIVE);
      expect(checkpoint.snapshot.memoryState).toHaveLength(1);
    });

    it('should deep clone memory state', () => {
      const originalMemory: MemoryEntry[] = [
        {
          id: 'mem1',
          type: 'sensory' as any,
          content: { nested: { data: 'original' } },
          timestamp: Date.now(),
          strength: 0.8,
          associations: [],
        },
      ];

      const checkpoint = manager.createCheckpoint(
        CognitiveState.ACTIVE,
        originalMemory,
        new Map(),
        new Map(),
        'Clone test'
      );

      // Modify original
      (originalMemory[0].content as any).nested.data = 'modified';

      // Checkpoint should still have original value
      const checkpointMemory = checkpoint.snapshot.memoryState[0];
      expect((checkpointMemory.content as any).nested.data).toBe('original');
    });

    it('should handle empty collections', () => {
      const checkpoint = manager.createCheckpoint(
        CognitiveState.DORMANT,
        [],
        new Map(),
        new Map(),
        'Empty checkpoint'
      );

      expect(checkpoint.snapshot.memoryState).toHaveLength(0);
      expect(checkpoint.snapshot.knowledgeBase.size).toBe(0);
      expect(checkpoint.snapshot.skills.size).toBe(0);
    });
  });

  describe('Checkpoint Retrieval', () => {
    it('should retrieve checkpoints by ID', () => {
      const checkpoint = manager.createCheckpoint(
        CognitiveState.ACTIVE,
        [],
        new Map(),
        new Map(),
        'Retrieval test'
      );

      const retrieved = manager.getCheckpoint(checkpoint.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(checkpoint.id);
      expect(retrieved?.description).toBe('Retrieval test');
    });

    it('should return null for non-existent checkpoint', () => {
      const retrieved = manager.getCheckpoint('non-existent-id');
      expect(retrieved).toBeNull();
    });

    it('should get snapshot from checkpoint', () => {
      const checkpoint = manager.createCheckpoint(
        CognitiveState.DEVELOPING,
        [],
        new Map([['key', 'value']]),
        new Map(),
        'Snapshot test'
      );

      const snapshot = manager.getSnapshot(checkpoint.id);

      expect(snapshot).toBeDefined();
      expect(snapshot?.state).toBe(CognitiveState.DEVELOPING);
      expect(snapshot?.knowledgeBase.get('key')).toBe('value');
    });

    it('should get all checkpoints sorted by timestamp', () => {
      // Create multiple checkpoints with slight delays
      const checkpoint1 = manager.createCheckpoint(
        CognitiveState.ACTIVE,
        [],
        new Map(),
        new Map(),
        'First'
      );

      const checkpoint2 = manager.createCheckpoint(
        CognitiveState.ACTIVE,
        [],
        new Map(),
        new Map(),
        'Second'
      );

      const checkpoint3 = manager.createCheckpoint(
        CognitiveState.ACTIVE,
        [],
        new Map(),
        new Map(),
        'Third'
      );

      const allCheckpoints = manager.getAllCheckpoints();

      expect(allCheckpoints).toHaveLength(3);
      // Should be sorted newest first
      expect(allCheckpoints[0].description).toBe('Third');
      expect(allCheckpoints[1].description).toBe('Second');
      expect(allCheckpoints[2].description).toBe('First');
    });
  });

  describe('Checkpoint Limits', () => {
    it('should enforce max checkpoint limit', () => {
      const smallManager = new CheckpointManager(3, 3600000);

      // Create 5 checkpoints (exceeds limit of 3)
      for (let i = 1; i <= 5; i++) {
        smallManager.createCheckpoint(
          CognitiveState.ACTIVE,
          [],
          new Map(),
          new Map(),
          `Checkpoint ${i}`
        );
      }

      // Should only keep the newest 3
      expect(smallManager.getCheckpointCount()).toBe(3);
    });

    it('should remove oldest checkpoint when limit exceeded', () => {
      const smallManager = new CheckpointManager(2, 3600000);

      const first = smallManager.createCheckpoint(
        CognitiveState.ACTIVE,
        [],
        new Map(),
        new Map(),
        'First'
      );

      const second = smallManager.createCheckpoint(
        CognitiveState.ACTIVE,
        [],
        new Map(),
        new Map(),
        'Second'
      );

      const third = smallManager.createCheckpoint(
        CognitiveState.ACTIVE,
        [],
        new Map(),
        new Map(),
        'Third'
      );

      // First should be removed
      expect(smallManager.getCheckpoint(first.id)).toBeNull();
      expect(smallManager.getCheckpoint(second.id)).toBeDefined();
      expect(smallManager.getCheckpoint(third.id)).toBeDefined();
    });
  });

  describe('Checkpoint Cleanup', () => {
    it('should cleanup expired checkpoints', () => {
      const shortRetention = new CheckpointManager(10, 100); // 100ms retention

      const checkpoint = shortRetention.createCheckpoint(
        CognitiveState.ACTIVE,
        [],
        new Map(),
        new Map(),
        'Expiring checkpoint'
      );

      // Wait for expiration
      return new Promise(resolve => {
        setTimeout(() => {
          // Force cleanup by creating a new checkpoint
          shortRetention.createCheckpoint(
            CognitiveState.ACTIVE,
            [],
            new Map(),
            new Map(),
            'Trigger cleanup'
          );

          // Original checkpoint should be cleaned up
          const retrieved = shortRetention.getCheckpoint(checkpoint.id);
          expect(retrieved).toBeNull();
          resolve(undefined);
        }, 150);
      });
    });

    it('should delete specific checkpoint', () => {
      const checkpoint = manager.createCheckpoint(
        CognitiveState.ACTIVE,
        [],
        new Map(),
        new Map(),
        'Delete test'
      );

      const deleted = manager.deleteCheckpoint(checkpoint.id);
      expect(deleted).toBe(true);

      const retrieved = manager.getCheckpoint(checkpoint.id);
      expect(retrieved).toBeNull();
    });

    it('should clear all checkpoints', () => {
      manager.createCheckpoint(CognitiveState.ACTIVE, [], new Map(), new Map(), '1');
      manager.createCheckpoint(CognitiveState.ACTIVE, [], new Map(), new Map(), '2');
      manager.createCheckpoint(CognitiveState.ACTIVE, [], new Map(), new Map(), '3');

      manager.clearAll();

      expect(manager.getCheckpointCount()).toBe(0);
      expect(manager.getAllCheckpoints()).toHaveLength(0);
    });
  });

  describe('Deep Cloning', () => {
    it('should deep clone cognitive state properties', () => {
      const knowledgeBase = new Map([
        ['skill', { level: 5, experience: 100 }],
      ]);

      const checkpoint = manager.createCheckpoint(
        CognitiveState.ACTIVE,
        [],
        knowledgeBase,
        new Map(),
        'Clone test'
      );

      // Modify original
      const original = knowledgeBase.get('skill') as any;
      original.level = 10;

      // Checkpoint should have original value
      const cloned = checkpoint.snapshot.knowledgeBase.get('skill') as any;
      expect(cloned.level).toBe(5);
    });

    it('should deep clone skills map', () => {
      const skills = new Map([
        ['coding', 0.8],
        ['reasoning', 0.9],
      ]);

      const checkpoint = manager.createCheckpoint(
        CognitiveState.ACTIVE,
        [],
        new Map(),
        skills,
        'Skills clone test'
      );

      // Modify original
      skills.set('coding', 0.5);
      skills.delete('reasoning');

      // Checkpoint should preserve original
      expect(checkpoint.snapshot.skills.get('coding')).toBe(0.8);
      expect(checkpoint.snapshot.skills.get('reasoning')).toBe(0.9);
    });
  });
});
