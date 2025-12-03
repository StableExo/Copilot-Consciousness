/**
 * PauseResume.test.ts
 * 
 * Comprehensive tests for the pause/resume functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  PauseResumeManager,
  PauseState,
  PauseInteractionMode,
  PauseConditionType,
  ResumeConditionType,
  PauseCondition,
  ResumeCondition,
  SerializedCognitiveState,
} from '../../../../src/consciousness/core/PauseResume';
import * as fs from 'fs';
import * as path from 'path';

describe('PauseResumeManager', () => {
  let manager: PauseResumeManager;
  const testStatePath = '/tmp/test-pause-state';

  beforeEach(() => {
    // Clean up test state directory
    if (fs.existsSync(testStatePath)) {
      fs.rmSync(testStatePath, { recursive: true });
    }

    manager = new PauseResumeManager({
      statePath: testStatePath,
      persistStateToDisk: false, // Disable for most tests
    });
  });

  afterEach(() => {
    manager.cleanup();
    if (fs.existsSync(testStatePath)) {
      fs.rmSync(testStatePath, { recursive: true });
    }
  });

  describe('Basic State Management', () => {
    it('should start in ACTIVE state', () => {
      expect(manager.getState()).toBe(PauseState.ACTIVE);
      expect(manager.isActive()).toBe(true);
      expect(manager.isPaused()).toBe(false);
    });

    it('should transition to PAUSED on immediate pause', async () => {
      const result = await manager.pause({ type: PauseConditionType.IMMEDIATE });
      
      expect(result).toBe(true);
      expect(manager.isPaused()).toBe(true);
      expect(manager.getState()).toBe(PauseState.PAUSED);
    });

    it('should transition back to ACTIVE on resume', async () => {
      await manager.pause({ type: PauseConditionType.IMMEDIATE });
      expect(manager.isPaused()).toBe(true);

      const result = await manager.resume({ type: ResumeConditionType.MANUAL });
      
      expect(result).toBe(true);
      expect(manager.isActive()).toBe(true);
      expect(manager.getState()).toBe(PauseState.ACTIVE);
    });

    it('should not pause when already paused', async () => {
      await manager.pause({ type: PauseConditionType.IMMEDIATE });
      const result = await manager.pause({ type: PauseConditionType.IMMEDIATE });
      
      expect(result).toBe(false);
    });

    it('should not resume when already active', async () => {
      const result = await manager.resume({ type: ResumeConditionType.MANUAL });
      
      expect(result).toBe(false);
    });
  });

  describe('Interaction Modes', () => {
    it('should allow read in READ_ONLY mode when paused', async () => {
      const readOnlyManager = new PauseResumeManager({
        interactionMode: PauseInteractionMode.READ_ONLY,
      });

      await readOnlyManager.pause({ type: PauseConditionType.IMMEDIATE });
      
      expect(readOnlyManager.canRead()).toBe(true);
      expect(readOnlyManager.canWrite()).toBe(false);
      expect(readOnlyManager.canInteract()).toBe(true);

      readOnlyManager.cleanup();
    });

    it('should not allow any interaction in NONE mode when paused', async () => {
      const noneManager = new PauseResumeManager({
        interactionMode: PauseInteractionMode.NONE,
      });

      await noneManager.pause({ type: PauseConditionType.IMMEDIATE });
      
      expect(noneManager.canRead()).toBe(false);
      expect(noneManager.canWrite()).toBe(false);
      expect(noneManager.canInteract()).toBe(false);

      noneManager.cleanup();
    });

    it('should allow queuing in QUEUE mode when paused', async () => {
      const queueManager = new PauseResumeManager({
        interactionMode: PauseInteractionMode.QUEUE,
      });

      await queueManager.pause({ type: PauseConditionType.IMMEDIATE });
      
      expect(queueManager.canRead()).toBe(true);
      expect(queueManager.canWrite()).toBe(false);
      
      const queued = queueManager.queueInput({ test: 'data' });
      expect(queued).toBe(true);
      expect(queueManager.getQueuedInputs()).toHaveLength(1);

      queueManager.cleanup();
    });

    it('should not queue when not paused', () => {
      const result = manager.queueInput({ test: 'data' });
      
      expect(result).toBe(false);
      expect(manager.getQueuedInputs()).toHaveLength(0);
    });
  });

  describe('Conditional Pause', () => {
    it('should support AFTER_CURRENT_TASK pause condition', async () => {
      const result = await manager.pause({
        type: PauseConditionType.AFTER_CURRENT_TASK,
        message: 'Wait for task completion',
      });

      expect(result).toBe(true);
      expect(manager.getState()).toBe(PauseState.PAUSING);
      
      // Trigger task completion
      manager.triggerTaskComplete();
      
      // Should now be fully paused
      expect(manager.getState()).toBe(PauseState.PAUSED);
    });

    it('should support ON_MILESTONE pause condition', async () => {
      const result = await manager.pause({
        type: PauseConditionType.ON_MILESTONE,
        milestone: 'test-milestone',
      });

      expect(result).toBe(true);
      expect(manager.getState()).toBe(PauseState.PAUSING);
      
      // Trigger milestone
      manager.triggerMilestone('test-milestone');
      
      expect(manager.getState()).toBe(PauseState.PAUSED);
    });

    it('should support ON_ERROR immediate pause', async () => {
      const result = await manager.pause({
        type: PauseConditionType.ON_ERROR,
        message: 'Critical error detected',
      });

      expect(result).toBe(true);
      expect(manager.getState()).toBe(PauseState.PAUSED);
    });

    it('should support SCHEDULED pause', async () => {
      vi.useFakeTimers();

      const futureTime = Date.now() + 1000;
      const pausePromise = manager.pause({
        type: PauseConditionType.SCHEDULED,
        timestamp: futureTime,
      });

      expect(manager.getState()).toBe(PauseState.ACTIVE);

      // Fast-forward time
      vi.advanceTimersByTime(1000);
      await pausePromise;

      expect(manager.getState()).toBe(PauseState.PAUSED);

      vi.useRealTimers();
    });

    it('should reject conditional pause when not allowed', async () => {
      const strictManager = new PauseResumeManager({
        allowConditionalPause: false,
      });

      await expect(
        strictManager.pause({
          type: PauseConditionType.AFTER_CURRENT_TASK,
        })
      ).rejects.toThrow('Conditional pause not allowed');

      strictManager.cleanup();
    });
  });

  describe('Conditional Resume', () => {
    beforeEach(async () => {
      await manager.pause({ type: PauseConditionType.IMMEDIATE });
    });

    it('should support MANUAL resume', async () => {
      const result = await manager.resume({ type: ResumeConditionType.MANUAL });
      
      expect(result).toBe(true);
      expect(manager.isActive()).toBe(true);
    });

    it('should support SCHEDULED resume', async () => {
      vi.useFakeTimers();

      const futureTime = Date.now() + 1000;
      const resumePromise = manager.resume({
        type: ResumeConditionType.SCHEDULED,
        timestamp: futureTime,
      });

      expect(manager.isPaused()).toBe(true);

      // Fast-forward time
      vi.advanceTimersByTime(1000);
      await resumePromise;

      expect(manager.isActive()).toBe(true);

      vi.useRealTimers();
    });

    it('should support ON_EVENT resume', async () => {
      const result = await manager.resume({
        type: ResumeConditionType.ON_EVENT,
        event: 'test-event',
      });

      expect(result).toBe(true);
      expect(manager.isPaused()).toBe(true);

      // Trigger the event
      manager.triggerEvent('test-event');

      expect(manager.isActive()).toBe(true);
    });

    it('should support AFTER_DURATION with auto-resume', async () => {
      vi.useFakeTimers();

      const autoResumeManager = new PauseResumeManager({
        maxPauseDuration: 1000,
      });

      await autoResumeManager.pause({ type: PauseConditionType.IMMEDIATE });
      expect(autoResumeManager.isPaused()).toBe(true);

      // Fast-forward time
      vi.advanceTimersByTime(1000);

      expect(autoResumeManager.isActive()).toBe(true);

      autoResumeManager.cleanup();
      vi.useRealTimers();
    });

    it('should reject conditional resume when not allowed', async () => {
      const strictManager = new PauseResumeManager({
        allowConditionalResume: false,
      });

      await strictManager.pause({ type: PauseConditionType.IMMEDIATE });

      await expect(
        strictManager.resume({
          type: ResumeConditionType.SCHEDULED,
          timestamp: Date.now() + 1000,
        })
      ).rejects.toThrow('Conditional resume not allowed');

      strictManager.cleanup();
    });
  });

  describe('State Serialization', () => {
    it('should serialize cognitive state', () => {
      const stateCapture: Partial<SerializedCognitiveState> = {
        sensoryMemory: [{ type: 'visual', data: 'test' }],
        shortTermMemory: [{ content: 'recent thought' }],
        workingMemory: [{ task: 'active task' }],
        activeThoughts: [{ thought: 'thinking about X' }],
        goals: [{ goal: 'complete task Y' }],
        emotionalState: { valence: 0.5, arousal: 0.3 },
        cognitiveLoad: 0.6,
        sessionId: 'test-session',
      };

      const serialized = manager.serializeState(stateCapture);

      expect(serialized).toMatchObject({
        version: '1.0.0',
        sensoryMemory: stateCapture.sensoryMemory,
        shortTermMemory: stateCapture.shortTermMemory,
        workingMemory: stateCapture.workingMemory,
        activeThoughts: stateCapture.activeThoughts,
        goals: stateCapture.goals,
        emotionalState: stateCapture.emotionalState,
        cognitiveLoad: 0.6,
        sessionId: 'test-session',
      });
      expect(serialized.timestamp).toBeGreaterThan(0);
    });

    it('should deserialize cognitive state', () => {
      const state: SerializedCognitiveState = {
        version: '1.0.0',
        timestamp: Date.now(),
        sensoryMemory: [],
        shortTermMemory: [],
        workingMemory: [],
        activeThoughts: [],
        goals: [],
        emotionalState: null,
        cognitiveLoad: 0.5,
      };

      const result = manager.deserializeState(state);

      expect(result).toBe(true);
    });

    it('should persist state to disk when enabled', async () => {
      const persistManager = new PauseResumeManager({
        statePath: testStatePath,
        persistStateToDisk: true,
      });

      await persistManager.pause({ type: PauseConditionType.IMMEDIATE });

      const stateCapture: Partial<SerializedCognitiveState> = {
        workingMemory: [{ task: 'test task' }],
        cognitiveLoad: 0.7,
      };

      persistManager.serializeState(stateCapture);

      // Check that files were created
      expect(fs.existsSync(testStatePath)).toBe(true);
      const files = fs.readdirSync(testStatePath);
      expect(files).toContain('latest_pause_state.json');
      expect(files.some(f => f.startsWith('pause_state_'))).toBe(true);

      persistManager.cleanup();
    });

    it('should load state from disk', async () => {
      const persistManager = new PauseResumeManager({
        statePath: testStatePath,
        persistStateToDisk: true,
      });

      // Create and persist state
      await persistManager.pause({ type: PauseConditionType.IMMEDIATE });
      const stateCapture: Partial<SerializedCognitiveState> = {
        workingMemory: [{ task: 'test task' }],
        cognitiveLoad: 0.7,
      };
      persistManager.serializeState(stateCapture);

      // Create new manager and load state
      const newManager = new PauseResumeManager({
        statePath: testStatePath,
        persistStateToDisk: true,
      });

      const loadedState = await newManager.loadStateFromDisk();

      expect(loadedState).not.toBeNull();
      expect(loadedState?.workingMemory).toEqual([{ task: 'test task' }]);
      expect(loadedState?.cognitiveLoad).toBe(0.7);

      persistManager.cleanup();
      newManager.cleanup();
    });
  });

  describe('Events', () => {
    it('should emit pause:started event', async () => {
      const listener = vi.fn();
      manager.on('pause:started', listener);

      await manager.pause({
        type: PauseConditionType.IMMEDIATE,
        message: 'Test pause',
      });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: 'Test pause',
          timestamp: expect.any(Number),
        })
      );
    });

    it('should emit pause:completed event', async () => {
      const listener = vi.fn();
      manager.on('pause:completed', listener);

      await manager.pause({ type: PauseConditionType.IMMEDIATE });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(Number),
        })
      );
    });

    it('should emit resume:started event', async () => {
      const listener = vi.fn();
      manager.on('resume:started', listener);

      await manager.pause({ type: PauseConditionType.IMMEDIATE });
      await manager.resume({ type: ResumeConditionType.MANUAL });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          pauseDuration: expect.any(Number),
        })
      );
    });

    it('should emit resume:completed event', async () => {
      const listener = vi.fn();
      manager.on('resume:completed', listener);

      await manager.pause({ type: PauseConditionType.IMMEDIATE });
      await manager.resume({ type: ResumeConditionType.MANUAL });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          pauseDuration: expect.any(Number),
        })
      );
    });

    it('should emit input:queued event', async () => {
      const queueManager = new PauseResumeManager({
        interactionMode: PauseInteractionMode.QUEUE,
      });

      const listener = vi.fn();
      queueManager.on('input:queued', listener);

      await queueManager.pause({ type: PauseConditionType.IMMEDIATE });
      queueManager.queueInput({ test: 'data' });

      expect(listener).toHaveBeenCalledWith({ test: 'data' });

      queueManager.cleanup();
    });
  });

  describe('Status and Info', () => {
    it('should provide comprehensive status when active', () => {
      const status = manager.getStatus();

      expect(status).toMatchObject({
        state: PauseState.ACTIVE,
        isPaused: false,
        canInteract: true,
        canRead: true,
        canWrite: true,
        queuedInputs: 0,
      });
    });

    it('should provide comprehensive status when paused', async () => {
      await manager.pause({
        type: PauseConditionType.IMMEDIATE,
        message: 'Test reason',
      });

      const status = manager.getStatus();

      expect(status).toMatchObject({
        state: PauseState.PAUSED,
        isPaused: true,
        pauseReason: 'Test reason',
        canInteract: true,  // READ_ONLY mode by default
        canRead: true,
        canWrite: false,
        queuedInputs: 0,
      });
      expect(status.pauseDuration).toBeGreaterThanOrEqual(0);
    });

    it('should track pause duration', async () => {
      vi.useFakeTimers();

      await manager.pause({ type: PauseConditionType.IMMEDIATE });

      vi.advanceTimersByTime(5000);

      const status = manager.getStatus();
      expect(status.pauseDuration).toBeGreaterThanOrEqual(5000);

      vi.useRealTimers();
    });
  });

  describe('Queue Management', () => {
    let queueManager: PauseResumeManager;

    beforeEach(async () => {
      queueManager = new PauseResumeManager({
        interactionMode: PauseInteractionMode.QUEUE,
      });
      await queueManager.pause({ type: PauseConditionType.IMMEDIATE });
    });

    afterEach(() => {
      queueManager.cleanup();
    });

    it('should queue multiple inputs', () => {
      queueManager.queueInput({ id: 1 });
      queueManager.queueInput({ id: 2 });
      queueManager.queueInput({ id: 3 });

      const queued = queueManager.getQueuedInputs();
      expect(queued).toHaveLength(3);
      expect(queued).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    });

    it('should clear queue', () => {
      queueManager.queueInput({ id: 1 });
      queueManager.queueInput({ id: 2 });

      queueManager.clearQueue();

      expect(queueManager.getQueuedInputs()).toHaveLength(0);
    });

    it('should emit queue:cleared event', () => {
      const listener = vi.fn();
      queueManager.on('queue:cleared', listener);

      queueManager.queueInput({ id: 1 });
      queueManager.clearQueue();

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should clear timers on cleanup', async () => {
      vi.useFakeTimers();

      const autoResumeManager = new PauseResumeManager({
        maxPauseDuration: 5000,
      });

      await autoResumeManager.pause({ type: PauseConditionType.IMMEDIATE });
      autoResumeManager.cleanup();

      // Advance time - should not auto-resume after cleanup
      vi.advanceTimersByTime(5000);
      expect(autoResumeManager.isPaused()).toBe(true);

      vi.useRealTimers();
    });

    it('should remove all event listeners on cleanup', () => {
      const listener = vi.fn();
      manager.on('pause:started', listener);

      manager.cleanup();

      // This should not emit to the listener
      manager.pause({ type: PauseConditionType.IMMEDIATE });
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
