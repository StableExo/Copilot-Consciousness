/**
 * ConsciousnessCore.ts
 *
 * Core consciousness framework integrating memory system and emotional states
 * with pause/resume capabilities for controlled cognitive suspension
 */

import { MemorySystem } from '../memory';
import { EmotionalContext } from '../types/memory';
import { MemoryConfig, MemoryType } from '../../types';
import {
  PauseResumeManager,
  PauseResumeConfig,
  PauseCondition,
  ResumeCondition,
  PauseState,
  SerializedCognitiveState,
} from './PauseResume';

/**
 * Core consciousness framework
 */
export class ConsciousnessCore {
  private memorySystem: MemorySystem;
  private emotionalState: EmotionalStateModel;
  private pauseResumeManager: PauseResumeManager;

  constructor(memoryConfig: MemoryConfig, pauseResumeConfig?: Partial<PauseResumeConfig>) {
    this.memorySystem = new MemorySystem(memoryConfig);
    this.emotionalState = new EmotionalStateModel();
    this.pauseResumeManager = new PauseResumeManager(pauseResumeConfig);

    // Set up pause/resume event handlers
    this.setupPauseResumeHandlers();
  }

  /**
   * Integration with memory system
   */
  integrateMemory(data: unknown, emotionalContext?: EmotionalContext): string {
    return this.memorySystem.addShortTermMemory(data, undefined, {}, emotionalContext);
  }

  /**
   * Model emotional states
   */
  modelEmotionalState(context: EmotionalContext): void {
    this.emotionalState.update(context);
  }

  /**
   * Get current emotional state
   */
  getEmotionalState(): EmotionalContext | null {
    return this.emotionalState.getCurrent();
  }

  /**
   * Event-driven architecture
   */
  onEvent(event: unknown, callback: (event: unknown) => void): void {
    // Event handling logic
    try {
      callback(event);
    } catch (_error) {
      // Handle callback errors
    }
  }

  /**
   * Get the memory system
   */
  getMemorySystem(): MemorySystem {
    return this.memorySystem;
  }

  /**
   * Pause the consciousness system
   */
  async pause(condition?: PauseCondition): Promise<boolean> {
    if (!this.pauseResumeManager.canWrite()) {
      return false;
    }

    const success = await this.pauseResumeManager.pause(condition);

    if (success && this.pauseResumeManager.isPaused()) {
      // Capture current cognitive state
      const state = this.captureCurrentState();
      this.pauseResumeManager.serializeState(state);
    }

    return success;
  }

  /**
   * Resume the consciousness system
   */
  async resume(condition?: ResumeCondition): Promise<boolean> {
    const success = await this.pauseResumeManager.resume(condition);

    if (success && this.pauseResumeManager.isActive()) {
      // Restore cognitive state if available
      const savedState = await this.pauseResumeManager.loadStateFromDisk();
      if (savedState) {
        this.restoreState(savedState);
      }
    }

    return success;
  }

  /**
   * Check if the system is paused
   */
  isPaused(): boolean {
    return this.pauseResumeManager.isPaused();
  }

  /**
   * Check if the system is active
   */
  isActive(): boolean {
    return this.pauseResumeManager.isActive();
  }

  /**
   * Get pause/resume status
   */
  getPauseStatus() {
    return this.pauseResumeManager.getStatus();
  }

  /**
   * Get the pause/resume manager for advanced control
   */
  getPauseResumeManager(): PauseResumeManager {
    return this.pauseResumeManager;
  }

  /**
   * Capture current cognitive state for pause
   */
  private captureCurrentState(): Partial<SerializedCognitiveState> {
    // Capture memory state from different memory types
    const sensoryMemory = this.memorySystem.searchMemories({ type: MemoryType.SENSORY });
    const shortTermMemory = this.memorySystem.searchMemories({ type: MemoryType.SHORT_TERM });
    const workingMemory = this.memorySystem.searchMemories({ type: MemoryType.WORKING });

    return {
      sensoryMemory: sensoryMemory.map((m) => m.content),
      shortTermMemory: shortTermMemory.map((m) => m.content),
      workingMemory: workingMemory.map((m) => m.content),
      emotionalState: this.emotionalState.getCurrent(),
      cognitiveLoad: this.calculateCognitiveLoad(workingMemory.length),
    };
  }

  /**
   * Restore cognitive state after resume
   */
  private restoreState(state: SerializedCognitiveState): void {
    // Restore emotional state
    if (state.emotionalState) {
      this.emotionalState.update(state.emotionalState as EmotionalContext);
    }

    // Memory restoration happens through the memory system
    // Short-term and sensory memories may be stale, so we don't restore those
    // Working memory should be restored for critical ongoing tasks
    if (state.workingMemory) {
      state.workingMemory.forEach((content) => {
        this.memorySystem.addWorkingMemory(content);
      });
    }
  }

  /**
   * Calculate cognitive load based on working memory usage
   */
  private calculateCognitiveLoad(workingMemoryCount: number): number {
    // Simple heuristic: 0-1 scale based on working memory capacity
    const capacity = 50; // Default from MemoryConfig
    return Math.min(workingMemoryCount / capacity, 1.0);
  }

  /**
   * Set up event handlers for pause/resume lifecycle
   */
  private setupPauseResumeHandlers(): void {
    this.pauseResumeManager.on('pause:started', ({ reason, timestamp }) => {
      // Log pause event
      this.onEvent({ type: 'pause:started', reason, timestamp }, () => {
        // Handle pause start
      });
    });

    this.pauseResumeManager.on('pause:completed', ({ reason, timestamp }) => {
      this.onEvent({ type: 'pause:completed', reason, timestamp }, () => {
        // Handle pause completion
      });
    });

    this.pauseResumeManager.on('resume:started', ({ reason, pauseDuration }) => {
      this.onEvent({ type: 'resume:started', reason, pauseDuration }, () => {
        // Handle resume start
      });
    });

    this.pauseResumeManager.on('resume:completed', ({ reason, pauseDuration }) => {
      this.onEvent({ type: 'resume:completed', reason, pauseDuration }, () => {
        // Handle resume completion
      });
    });
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.pauseResumeManager.cleanup();
  }
}

/**
 * Emotional state modeling
 */
class EmotionalStateModel {
  private state: EmotionalContext | null = null;

  update(context: EmotionalContext): void {
    this.state = context;
  }

  getCurrent(): EmotionalContext | null {
    return this.state;
  }
}
