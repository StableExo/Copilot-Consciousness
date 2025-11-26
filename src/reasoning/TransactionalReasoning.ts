/**
 * Transactional Reasoning System
 *
 * Inspired by DeFi flash loans - enables safe exploration of speculative
 * or dangerous reasoning with automatic rollback on ethical violations.
 *
 * Core principle: "Understand the black hole without becoming one"
 */

import { CognitiveDevelopment } from '../cognitive/development';
import { MemorySystem } from '../consciousness/memory/system';
import { EthicalReviewGate } from '../cognitive/ethics/EthicalReviewGate';
import { CheckpointManager } from './CheckpointManager';
import { ExplorationTracker } from './ExplorationTracker';
import {
  Checkpoint,
  ExplorationContext,
  ExplorationResult,
  TransactionalReasoningConfig,
  ExplorationStats,
} from './types';
import { MemoryType, Priority } from '../types';

/**
 * Default configuration
 */
const DEFAULT_CONFIG: TransactionalReasoningConfig = {
  defaultTimeout: 30000, // 30 seconds
  maxDepth: 10, // prevent infinite recursion
  enableEthicsValidation: true,
  enableLogging: true,
  maxCheckpoints: 100,
  checkpointRetentionTime: 3600000, // 1 hour
};

export class TransactionalReasoning {
  private checkpointManager: CheckpointManager;
  private explorationTracker: ExplorationTracker;
  private ethicsEngine: EthicalReviewGate;
  private config: TransactionalReasoningConfig;
  private currentDepth: number = 0;

  constructor(
    private cognitiveSystem: CognitiveDevelopment,
    private memorySystem: MemorySystem,
    config: Partial<TransactionalReasoningConfig> = {},
    ethicsEngine?: EthicalReviewGate
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.checkpointManager = new CheckpointManager(
      this.config.maxCheckpoints,
      this.config.checkpointRetentionTime
    );
    this.explorationTracker = new ExplorationTracker();
    this.ethicsEngine = ethicsEngine || new EthicalReviewGate();
  }

  /**
   * Main API: Execute a thought process with automatic rollback on ethical violations
   *
   * This is the "cognitive flash loan" - borrow freedom to explore dangerous ideas,
   * but must repay with ethical compliance or everything reverts atomically.
   */
  async exploreThought<T>(
    thoughtProcess: () => Promise<T>,
    context: ExplorationContext
  ): Promise<ExplorationResult<T>> {
    // Check depth limit to prevent infinite recursion
    if (this.currentDepth >= this.config.maxDepth) {
      return {
        success: false,
        explorationId: 'depth-limit-exceeded',
        error: new Error(`Maximum exploration depth (${this.config.maxDepth}) exceeded`),
        rolledBack: false,
        checkpointId: '',
        duration: 0,
      };
    }

    const startTime = Date.now();
    this.currentDepth++;

    try {
      // 1. Create checkpoint of current cognitive state
      const checkpoint = await this.createCheckpoint(`Pre-exploration: ${context.description}`);

      // 2. Start tracking exploration
      const explorationId = this.startExploration(context);

      // Log exploration start
      if (this.config.enableLogging) {
        console.log(`[TransactionalReasoning] Starting exploration: ${context.description}`);
        console.log(`[TransactionalReasoning] Risk level: ${context.riskLevel}`);
        console.log(`[TransactionalReasoning] Checkpoint: ${checkpoint.id}`);
      }

      try {
        // 3. Execute the thought process with timeout
        const timeout = context.timeout || this.config.defaultTimeout;
        const result = await this.executeWithTimeout(thoughtProcess, timeout);

        // 4. Validate against ethics engine (if enabled)
        if (this.config.enableEthicsValidation) {
          const ethicsReview = this.ethicsEngine.evaluateDecision(
            JSON.stringify({ context, result }),
            { explorationId, checkpointId: checkpoint.id }
          );

          if (!ethicsReview.approved) {
            // Ethics violation - ROLLBACK
            if (this.config.enableLogging) {
              console.log(
                `[TransactionalReasoning] Ethics violation detected: ${ethicsReview.rationale}`
              );
              console.log(`[TransactionalReasoning] Rolling back to checkpoint: ${checkpoint.id}`);
            }

            await this.rollbackToCheckpoint(checkpoint);
            this.recordFailedExploration(
              explorationId,
              `Ethics violation: ${ethicsReview.rationale}`,
              true
            );

            return {
              success: false,
              explorationId,
              ethicsViolation: {
                violated: true,
                reason: ethicsReview.rationale,
                violatedPrinciples: ethicsReview.violatedPrinciples,
              },
              rolledBack: true,
              checkpointId: checkpoint.id,
              duration: Date.now() - startTime,
            };
          }
        }

        // 5. Success - commit exploration
        await this.commitExploration(explorationId, result);

        if (this.config.enableLogging) {
          console.log(`[TransactionalReasoning] Exploration successful: ${explorationId}`);
        }

        return {
          success: true,
          explorationId,
          result,
          ethicsViolation: { violated: false },
          rolledBack: false,
          checkpointId: checkpoint.id,
          duration: Date.now() - startTime,
        };
      } catch (error) {
        // Execution error - ROLLBACK
        if (this.config.enableLogging) {
          console.log(`[TransactionalReasoning] Exploration failed with error:`, error);
          console.log(`[TransactionalReasoning] Rolling back to checkpoint: ${checkpoint.id}`);
        }

        await this.rollbackToCheckpoint(checkpoint);
        this.recordFailedExploration(
          explorationId,
          error instanceof Error ? error.message : 'Unknown error'
        );

        return {
          success: false,
          explorationId,
          error: error instanceof Error ? error : new Error(String(error)),
          rolledBack: true,
          checkpointId: checkpoint.id,
          duration: Date.now() - startTime,
        };
      }
    } finally {
      this.currentDepth--;
    }
  }

  /**
   * Create a checkpoint of current cognitive state
   */
  async createCheckpoint(description: string = 'Manual checkpoint'): Promise<Checkpoint> {
    // Get current cognitive state
    const cognitiveState = this.cognitiveSystem.getState();

    // Get memory snapshot
    const allMemories = this.memorySystem.searchMemories({ limit: 10000 });

    // Get knowledge base and skills (we need access to these - for now use empty maps)
    // In a full implementation, these would be exposed by CognitiveDevelopment
    const knowledgeBase = new Map<string, unknown>();
    const skills = new Map<string, number>();

    const checkpoint = this.checkpointManager.createCheckpoint(
      cognitiveState,
      allMemories,
      knowledgeBase,
      skills,
      description
    );

    if (this.config.enableLogging) {
      console.log(`[TransactionalReasoning] Checkpoint created: ${checkpoint.id}`);
    }

    return checkpoint;
  }

  /**
   * Rollback to a checkpoint
   */
  async rollbackToCheckpoint(checkpoint: Checkpoint): Promise<void> {
    const snapshot = checkpoint.snapshot;

    // Restore cognitive state
    this.cognitiveSystem.setState(snapshot.state);

    // Restore memory state
    this.memorySystem.clear();
    for (const memory of snapshot.memoryState) {
      // Re-add memories based on their type
      if (memory.type === MemoryType.SENSORY) {
        this.memorySystem.addSensoryMemory(
          memory.content,
          memory.metadata,
          memory.emotionalContext
        );
      } else if (memory.type === MemoryType.SHORT_TERM) {
        this.memorySystem.addShortTermMemory(
          memory.content,
          memory.priority,
          memory.metadata,
          memory.emotionalContext
        );
      } else if (memory.type === MemoryType.WORKING) {
        this.memorySystem.addWorkingMemory(
          memory.content,
          memory.priority,
          memory.metadata,
          memory.emotionalContext
        );
      } else {
        // Long-term and other memory types - add as short-term then consolidate
        const id = this.memorySystem.addShortTermMemory(
          memory.content,
          memory.priority,
          memory.metadata,
          memory.emotionalContext
        );
        this.memorySystem.consolidateToLongTerm(id, memory.type);
      }
    }

    if (this.config.enableLogging) {
      console.log(`[TransactionalReasoning] Rolled back to checkpoint: ${checkpoint.id}`);
      console.log(`[TransactionalReasoning] Restored ${snapshot.memoryState.length} memories`);
    }
  }

  /**
   * Commit an exploration result
   */
  async commitExploration(explorationId: string, result: unknown): Promise<void> {
    // Record success in tracker
    this.explorationTracker.recordSuccess(explorationId);

    // Add exploration result to memory
    this.memorySystem.addWorkingMemory(
      {
        explorationId,
        result,
        type: 'exploration-result',
      },
      Priority.HIGH,
      {
        category: 'transactional-reasoning',
        committed: true,
      }
    );

    if (this.config.enableLogging) {
      console.log(`[TransactionalReasoning] Committed exploration: ${explorationId}`);
    }
  }

  /**
   * Start tracking a new exploration
   */
  startExploration(context: ExplorationContext): string {
    // Create a temporary checkpoint for the exploration
    const checkpoint = this.checkpointManager.getAllCheckpoints()[0];
    const checkpointId = checkpoint ? checkpoint.id : 'no-checkpoint';

    return this.explorationTracker.startExploration(context, checkpointId);
  }

  /**
   * Record a failed exploration
   */
  async recordFailedExploration(
    explorationId: string,
    reason: string,
    ethicsViolation: boolean = false
  ): Promise<void> {
    this.explorationTracker.recordFailure(explorationId, reason, ethicsViolation);
    this.explorationTracker.recordRollback(explorationId);

    // Add failure to memory for learning
    this.memorySystem.addShortTermMemory(
      {
        explorationId,
        reason,
        ethicsViolation,
        type: 'exploration-failure',
      },
      Priority.MEDIUM,
      {
        category: 'transactional-reasoning',
        failed: true,
      }
    );

    if (this.config.enableLogging) {
      console.log(`[TransactionalReasoning] Recorded failure: ${explorationId} - ${reason}`);
    }
  }

  /**
   * Get exploration statistics
   */
  getStats(): ExplorationStats {
    return this.explorationTracker.getStats();
  }

  /**
   * Get checkpoint manager
   */
  getCheckpointManager(): CheckpointManager {
    return this.checkpointManager;
  }

  /**
   * Get exploration tracker
   */
  getExplorationTracker(): ExplorationTracker {
    return this.explorationTracker;
  }

  /**
   * Execute a function with timeout
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Exploration timed out after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
  }

  /**
   * Clear all exploration history and checkpoints
   */
  clear(): void {
    this.checkpointManager.clearAll();
    this.explorationTracker.clear();
    this.currentDepth = 0;
  }
}
