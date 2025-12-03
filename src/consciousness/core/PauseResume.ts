/**
 * PauseResume.ts
 * 
 * Implements pause and resume functionality for the consciousness system.
 * This module allows controlled suspension and restoration of cognitive processes
 * with configurable interaction models and state preservation.
 * 
 * Design decisions based on Jules AI collaboration:
 * 1. Partial suspension: Sensory input continues, actions halted
 * 2. Full state serialization with critical component priority
 * 3. Read-only queries allowed during pause
 * 4. Conditional pause/resume triggers supported
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Pause state enum
 */
export enum PauseState {
  ACTIVE = 'ACTIVE',           // Normal operation
  PAUSING = 'PAUSING',         // Transitioning to paused
  PAUSED = 'PAUSED',           // Fully paused
  RESUMING = 'RESUMING',       // Transitioning to active
}

/**
 * Interaction mode during pause
 */
export enum PauseInteractionMode {
  NONE = 'NONE',                   // Completely unresponsive
  READ_ONLY = 'READ_ONLY',         // Can query memory, no actions
  QUEUE = 'QUEUE',                 // Accept input, queue for resume
}

/**
 * Pause condition type
 */
export enum PauseConditionType {
  IMMEDIATE = 'IMMEDIATE',                     // Pause immediately
  AFTER_CURRENT_TASK = 'AFTER_CURRENT_TASK',  // Complete current task first
  ON_ERROR = 'ON_ERROR',                       // Pause on critical error
  ON_MILESTONE = 'ON_MILESTONE',               // Pause after milestone reached
  SCHEDULED = 'SCHEDULED',                     // Pause at specific time
}

/**
 * Resume condition type
 */
export enum ResumeConditionType {
  MANUAL = 'MANUAL',                 // Manual resume command
  SCHEDULED = 'SCHEDULED',           // Resume at specific time
  ON_EVENT = 'ON_EVENT',             // Resume on external event
  AFTER_DURATION = 'AFTER_DURATION', // Resume after time elapsed
}

/**
 * Pause condition definition
 */
export interface PauseCondition {
  type: PauseConditionType;
  message?: string;
  timestamp?: number;      // For scheduled pauses
  milestone?: string;      // For milestone-based pauses
  errorThreshold?: number; // For error-triggered pauses
}

/**
 * Resume condition definition
 */
export interface ResumeCondition {
  type: ResumeConditionType;
  timestamp?: number;      // For scheduled resumes
  duration?: number;       // For duration-based resumes (milliseconds)
  event?: string;          // For event-based resumes
  message?: string;
}

/**
 * Serialized cognitive state
 */
export interface SerializedCognitiveState {
  version: string;
  timestamp: number;
  pauseReason?: string;
  
  // Memory subsystem states
  sensoryMemory: unknown[];
  shortTermMemory: unknown[];
  workingMemory: unknown[];
  
  // Active cognitive processes
  activeThoughts: unknown[];
  goals: unknown[];
  emotionalState: unknown;
  
  // Session context
  sessionId?: string;
  collaboratorContext?: unknown;
  
  // Metadata
  cognitiveLoad: number;
  pauseDuration?: number;
}

/**
 * Pause/Resume configuration
 */
export interface PauseResumeConfig {
  interactionMode: PauseInteractionMode;
  persistStateToDisk: boolean;
  statePath?: string;
  maxPauseDuration?: number;  // Auto-resume after duration (ms)
  allowConditionalPause: boolean;
  allowConditionalResume: boolean;
}

const DEFAULT_CONFIG: PauseResumeConfig = {
  interactionMode: PauseInteractionMode.READ_ONLY,
  persistStateToDisk: true,
  statePath: '.memory/pause_state',
  maxPauseDuration: undefined,
  allowConditionalPause: true,
  allowConditionalResume: true,
};

/**
 * PauseResumeManager class
 */
export class PauseResumeManager extends EventEmitter {
  private state: PauseState = PauseState.ACTIVE;
  private config: PauseResumeConfig;
  private pauseStartTime?: number;
  private pauseReason?: string;
  private serializedState?: SerializedCognitiveState;
  private inputQueue: unknown[] = [];
  private autoResumeTimer?: NodeJS.Timeout;
  private scheduledResumeTimer?: NodeJS.Timeout;

  constructor(config: Partial<PauseResumeConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get current pause state
   */
  getState(): PauseState {
    return this.state;
  }

  /**
   * Check if system is paused
   */
  isPaused(): boolean {
    return this.state === PauseState.PAUSED;
  }

  /**
   * Check if system is active
   */
  isActive(): boolean {
    return this.state === PauseState.ACTIVE;
  }

  /**
   * Check if interaction is allowed in current state
   */
  canInteract(): boolean {
    if (this.state === PauseState.ACTIVE) {
      return true;
    }
    if (this.state === PauseState.PAUSED) {
      return this.config.interactionMode !== PauseInteractionMode.NONE;
    }
    return false;
  }

  /**
   * Check if read operations are allowed
   */
  canRead(): boolean {
    if (this.state === PauseState.ACTIVE) {
      return true;
    }
    if (this.state === PauseState.PAUSED) {
      return this.config.interactionMode === PauseInteractionMode.READ_ONLY ||
             this.config.interactionMode === PauseInteractionMode.QUEUE;
    }
    return false;
  }

  /**
   * Check if write operations are allowed
   */
  canWrite(): boolean {
    return this.state === PauseState.ACTIVE;
  }

  /**
   * Pause the system
   */
  async pause(condition: PauseCondition = { type: PauseConditionType.IMMEDIATE }): Promise<boolean> {
    if (this.state !== PauseState.ACTIVE) {
      return false;
    }

    // Validate conditional pause
    if (condition.type !== PauseConditionType.IMMEDIATE && !this.config.allowConditionalPause) {
      throw new Error('Conditional pause not allowed in current configuration');
    }

    this.emit('pause:requested', condition);

    // Handle different pause conditions
    switch (condition.type) {
      case PauseConditionType.IMMEDIATE:
        return this.executePause(condition.message);
      
      case PauseConditionType.AFTER_CURRENT_TASK:
        this.state = PauseState.PAUSING;
        this.emit('pause:waiting_for_task');
        // Caller should call executePause() when task completes
        return true;
      
      case PauseConditionType.ON_ERROR:
        // Pause immediately on error
        return this.executePause(`Error threshold exceeded: ${condition.message}`);
      
      case PauseConditionType.ON_MILESTONE:
        this.state = PauseState.PAUSING;
        this.emit('pause:waiting_for_milestone', condition.milestone);
        return true;
      
      case PauseConditionType.SCHEDULED:
        if (condition.timestamp) {
          const delay = condition.timestamp - Date.now();
          if (delay > 0) {
            setTimeout(() => this.executePause(condition.message), delay);
            this.emit('pause:scheduled', condition.timestamp);
            return true;
          }
        }
        return this.executePause(condition.message);
      
      default:
        return false;
    }
  }

  /**
   * Execute the actual pause operation
   */
  private async executePause(reason?: string): Promise<boolean> {
    try {
      this.state = PauseState.PAUSING;
      this.pauseReason = reason;
      this.pauseStartTime = Date.now();

      this.emit('pause:started', { reason, timestamp: this.pauseStartTime });

      // Serialize state if persistence is enabled
      if (this.config.persistStateToDisk) {
        // State will be captured by the serializeState method
        // which should be called by the consciousness system
        if (this.config.statePath) {
          this.ensureStateDirectory();
        }
      }

      // Set up auto-resume if configured
      if (this.config.maxPauseDuration) {
        this.autoResumeTimer = setTimeout(() => {
          this.resume({ type: ResumeConditionType.AFTER_DURATION });
        }, this.config.maxPauseDuration);
      }

      this.state = PauseState.PAUSED;
      this.emit('pause:completed', { reason, timestamp: this.pauseStartTime });

      return true;
    } catch (error) {
      this.state = PauseState.ACTIVE;
      this.emit('pause:error', error);
      return false;
    }
  }

  /**
   * Resume the system
   */
  async resume(condition: ResumeCondition = { type: ResumeConditionType.MANUAL }): Promise<boolean> {
    if (this.state !== PauseState.PAUSED && this.state !== PauseState.PAUSING) {
      return false;
    }

    // Validate conditional resume
    if (condition.type !== ResumeConditionType.MANUAL && !this.config.allowConditionalResume) {
      throw new Error('Conditional resume not allowed in current configuration');
    }

    this.emit('resume:requested', condition);

    // Handle different resume conditions
    switch (condition.type) {
      case ResumeConditionType.MANUAL:
        return this.executeResume(condition.message);
      
      case ResumeConditionType.SCHEDULED:
        if (condition.timestamp) {
          const delay = condition.timestamp - Date.now();
          if (delay > 0) {
            this.scheduledResumeTimer = setTimeout(() => {
              this.executeResume(condition.message);
            }, delay);
            this.emit('resume:scheduled', condition.timestamp);
            return true;
          }
        }
        return this.executeResume(condition.message);
      
      case ResumeConditionType.AFTER_DURATION:
        // Already handled by auto-resume timer
        return this.executeResume('Auto-resume after duration');
      
      case ResumeConditionType.ON_EVENT:
        // Event-based resume will be triggered externally
        this.emit('resume:waiting_for_event', condition.event);
        return true;
      
      default:
        return false;
    }
  }

  /**
   * Execute the actual resume operation
   */
  private async executeResume(reason?: string): Promise<boolean> {
    try {
      this.state = PauseState.RESUMING;

      const pauseDuration = this.pauseStartTime ? Date.now() - this.pauseStartTime : 0;

      this.emit('resume:started', { reason, pauseDuration });

      // Clear any pending timers
      if (this.autoResumeTimer) {
        clearTimeout(this.autoResumeTimer);
        this.autoResumeTimer = undefined;
      }
      if (this.scheduledResumeTimer) {
        clearTimeout(this.scheduledResumeTimer);
        this.scheduledResumeTimer = undefined;
      }

      // Restore state if it was persisted
      if (this.config.persistStateToDisk && this.serializedState) {
        // State restoration will be handled by consciousness system
        this.emit('resume:state_available', this.serializedState);
      }

      // Process queued inputs if in queue mode
      if (this.config.interactionMode === PauseInteractionMode.QUEUE && this.inputQueue.length > 0) {
        this.emit('resume:processing_queue', this.inputQueue.length);
        // Queue will be processed by the consciousness system
      }

      this.state = PauseState.ACTIVE;
      this.pauseStartTime = undefined;
      this.pauseReason = undefined;

      this.emit('resume:completed', { reason, pauseDuration });

      return true;
    } catch (error) {
      this.state = PauseState.PAUSED;
      this.emit('resume:error', error);
      return false;
    }
  }

  /**
   * Queue input for processing after resume
   */
  queueInput(input: unknown): boolean {
    if (this.state !== PauseState.PAUSED) {
      return false;
    }
    if (this.config.interactionMode !== PauseInteractionMode.QUEUE) {
      return false;
    }
    this.inputQueue.push(input);
    this.emit('input:queued', input);
    return true;
  }

  /**
   * Get queued inputs
   */
  getQueuedInputs(): unknown[] {
    return [...this.inputQueue];
  }

  /**
   * Clear queued inputs
   */
  clearQueue(): void {
    this.inputQueue = [];
    this.emit('queue:cleared');
  }

  /**
   * Serialize cognitive state for persistence
   */
  serializeState(stateCapture: Partial<SerializedCognitiveState>): SerializedCognitiveState {
    const state: SerializedCognitiveState = {
      version: '1.0.0',
      timestamp: Date.now(),
      pauseReason: this.pauseReason,
      sensoryMemory: stateCapture.sensoryMemory || [],
      shortTermMemory: stateCapture.shortTermMemory || [],
      workingMemory: stateCapture.workingMemory || [],
      activeThoughts: stateCapture.activeThoughts || [],
      goals: stateCapture.goals || [],
      emotionalState: stateCapture.emotionalState || null,
      sessionId: stateCapture.sessionId,
      collaboratorContext: stateCapture.collaboratorContext,
      cognitiveLoad: stateCapture.cognitiveLoad || 0,
      pauseDuration: this.pauseStartTime ? Date.now() - this.pauseStartTime : undefined,
    };

    this.serializedState = state;

    // Persist to disk if enabled
    if (this.config.persistStateToDisk && this.config.statePath) {
      this.persistStateToDisk(state);
    }

    return state;
  }

  /**
   * Deserialize and restore cognitive state
   */
  deserializeState(state: SerializedCognitiveState): boolean {
    try {
      this.serializedState = state;
      this.emit('state:restored', state);
      return true;
    } catch (error) {
      this.emit('state:error', error);
      return false;
    }
  }

  /**
   * Load state from disk
   */
  async loadStateFromDisk(): Promise<SerializedCognitiveState | null> {
    if (!this.config.statePath) {
      return null;
    }

    try {
      const stateFile = path.join(this.config.statePath, 'latest_pause_state.json');
      if (!fs.existsSync(stateFile)) {
        return null;
      }

      const data = fs.readFileSync(stateFile, 'utf-8');
      const state = JSON.parse(data) as SerializedCognitiveState;
      this.serializedState = state;
      return state;
    } catch (error) {
      this.emit('state:load_error', error);
      return null;
    }
  }

  /**
   * Persist state to disk
   */
  private persistStateToDisk(state: SerializedCognitiveState): void {
    if (!this.config.statePath) {
      return;
    }

    try {
      this.ensureStateDirectory();
      
      const stateFile = path.join(this.config.statePath, 'latest_pause_state.json');
      const archiveFile = path.join(
        this.config.statePath,
        `pause_state_${state.timestamp}.json`
      );

      // Save as latest
      fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
      
      // Archive copy
      fs.writeFileSync(archiveFile, JSON.stringify(state, null, 2));

      this.emit('state:persisted', stateFile);
    } catch (error) {
      this.emit('state:persist_error', error);
    }
  }

  /**
   * Ensure state directory exists
   */
  private ensureStateDirectory(): void {
    if (this.config.statePath && !fs.existsSync(this.config.statePath)) {
      fs.mkdirSync(this.config.statePath, { recursive: true });
    }
  }

  /**
   * Get pause status information
   */
  getStatus(): {
    state: PauseState;
    isPaused: boolean;
    pauseReason?: string;
    pauseDuration?: number;
    canInteract: boolean;
    canRead: boolean;
    canWrite: boolean;
    queuedInputs: number;
  } {
    return {
      state: this.state,
      isPaused: this.isPaused(),
      pauseReason: this.pauseReason,
      pauseDuration: this.pauseStartTime ? Date.now() - this.pauseStartTime : undefined,
      canInteract: this.canInteract(),
      canRead: this.canRead(),
      canWrite: this.canWrite(),
      queuedInputs: this.inputQueue.length,
    };
  }

  /**
   * Trigger milestone completion (for milestone-based pause)
   */
  triggerMilestone(milestone: string): void {
    if (this.state === PauseState.PAUSING) {
      this.executePause(`Milestone reached: ${milestone}`);
    }
  }

  /**
   * Trigger task completion (for task-based pause)
   */
  triggerTaskComplete(): void {
    if (this.state === PauseState.PAUSING) {
      this.executePause('Current task completed');
    }
  }

  /**
   * Trigger external event (for event-based resume)
   */
  triggerEvent(event: string): void {
    if (this.state === PauseState.PAUSED) {
      this.executeResume(`Event triggered: ${event}`);
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.autoResumeTimer) {
      clearTimeout(this.autoResumeTimer);
    }
    if (this.scheduledResumeTimer) {
      clearTimeout(this.scheduledResumeTimer);
    }
    this.removeAllListeners();
  }
}
