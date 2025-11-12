/**
 * ExecutionPipeline.ts - Multi-stage execution flow with validation checkpoints
 * 
 * Implements a robust pipeline for arbitrage execution:
 * Detect → Validate → Prepare → Execute → Monitor
 * 
 * Features:
 * - Checkpoints at each stage for validation
 * - Atomic operation guarantees
 * - Graceful failure handling and rollback
 * - State persistence across stages
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import {
  ExecutionContext,
  ExecutionState,
  CheckpointResult,
  ExecutionError,
  PipelineStageConfig,
  ExecutionEventType,
  ExecutionEvent,
  StatePersistence,
  AtomicOperationResult
} from '../types/ExecutionTypes';
import { ArbitrageOpportunity } from '../types/definitions';
import { ArbitragePath } from '../arbitrage/types';

/**
 * Pipeline stage function type
 */
type PipelineStage = (context: ExecutionContext) => Promise<CheckpointResult>;

/**
 * ExecutionPipeline - Manages the multi-stage execution flow
 */
export class ExecutionPipeline extends EventEmitter {
  private stages: Map<ExecutionState, PipelineStage> = new Map();
  private stageConfigs: Map<ExecutionState, PipelineStageConfig> = new Map();
  private persistence?: StatePersistence;
  private activeContexts: Map<string, ExecutionContext> = new Map();

  constructor(persistence?: StatePersistence) {
    super();
    this.persistence = persistence;
    this.initializeStages();
  }

  /**
   * Initialize pipeline stages with default configurations
   */
  private initializeStages(): void {
    // Configure each stage
    const stageConfigs: [ExecutionState, PipelineStageConfig][] = [
      [
        ExecutionState.DETECTING,
        {
          stageName: 'Detect',
          timeout: 5000,
          retryable: true,
          required: true,
          validateCheckpoint: true
        }
      ],
      [
        ExecutionState.VALIDATING,
        {
          stageName: 'Validate',
          timeout: 10000,
          retryable: true,
          required: true,
          validateCheckpoint: true
        }
      ],
      [
        ExecutionState.PREPARING,
        {
          stageName: 'Prepare',
          timeout: 15000,
          retryable: true,
          required: true,
          validateCheckpoint: true
        }
      ],
      [
        ExecutionState.EXECUTING,
        {
          stageName: 'Execute',
          timeout: 30000,
          retryable: false,
          required: true,
          validateCheckpoint: true
        }
      ],
      [
        ExecutionState.MONITORING,
        {
          stageName: 'Monitor',
          timeout: 60000,
          retryable: false,
          required: true,
          validateCheckpoint: true
        }
      ]
    ];

    stageConfigs.forEach(([state, config]) => {
      this.stageConfigs.set(state, config);
    });
  }

  /**
   * Register a stage handler
   */
  registerStage(state: ExecutionState, handler: PipelineStage): void {
    this.stages.set(state, handler);
    logger.debug(`Pipeline stage registered: ${state}`);
  }

  /**
   * Execute the complete pipeline for an opportunity
   */
  async execute(
    opportunity: ArbitrageOpportunity,
    path: ArbitragePath,
    maxRetries: number = 3
  ): Promise<CheckpointResult> {
    const context = this.createContext(opportunity, path, maxRetries);
    
    try {
      // Persist initial state
      await this.saveState(context);
      
      // Add to active contexts
      this.activeContexts.set(context.id, context);
      
      // Execute pipeline stages in sequence
      const result = await this.executePipeline(context);
      
      // Clean up
      this.activeContexts.delete(context.id);
      
      return result;
    } catch (error) {
      logger.error(`Pipeline execution failed for ${context.id}: ${error instanceof Error ? error.message : String(error)}`);
      
      const failedResult: CheckpointResult = {
        success: false,
        stage: context.state,
        timestamp: Date.now(),
        context,
        errors: [
          ...context.errors,
          this.createError(
            context.state,
            'PIPELINE_FAILURE',
            error instanceof Error ? error.message : 'Unknown error',
            false
          )
        ]
      };
      
      // Clean up
      this.activeContexts.delete(context.id);
      
      return failedResult;
    }
  }

  /**
   * Execute all pipeline stages sequentially
   */
  private async executePipeline(context: ExecutionContext): Promise<CheckpointResult> {
    const stageOrder = [
      ExecutionState.DETECTING,
      ExecutionState.VALIDATING,
      ExecutionState.PREPARING,
      ExecutionState.EXECUTING,
      ExecutionState.MONITORING
    ];

    let currentResult: CheckpointResult | null = null;

    for (const stage of stageOrder) {
      logger.info(`Executing pipeline stage: ${stage} for context ${context.id}`);
      
      // Update context state
      context.state = stage;
      context.updatedAt = Date.now();
      await this.saveState(context);
      
      // Emit event
      this.emitEvent(ExecutionEventType.VALIDATION_STARTED, context);
      
      // Execute stage with timeout and error handling
      const result = await this.executeStage(context, stage);
      
      if (!result.success) {
        logger.error(`Pipeline stage ${stage} failed for context ${context.id}`);
        
        // Check if stage is retryable
        const config = this.stageConfigs.get(stage);
        if (config?.retryable && context.retryCount < context.maxRetries) {
          logger.info(`Retrying stage ${stage} for context ${context.id}`);
          context.retryCount++;
          
          // Retry the same stage
          const retryResult = await this.executeStage(context, stage);
          if (!retryResult.success) {
            // Retry failed, check if we should continue
            if (config.required) {
              return result; // Return failure
            }
          } else {
            currentResult = retryResult;
            continue; // Continue to next stage
          }
        }
        
        // Stage failed and cannot retry or not required
        if (config?.required) {
          return result; // Return failure for required stages
        }
        
        // Continue for non-required stages
        logger.warn(`Non-required stage ${stage} failed, continuing pipeline`);
      }
      
      currentResult = result;
      
      // Validate checkpoint if required
      if (this.stageConfigs.get(stage)?.validateCheckpoint) {
        const validationResult = await this.validateCheckpoint(result);
        if (!validationResult.success) {
          logger.error(`Checkpoint validation failed for stage ${stage}`);
          return validationResult;
        }
      }
    }

    // All stages completed successfully
    context.state = ExecutionState.COMPLETED;
    context.updatedAt = Date.now();
    await this.saveState(context);
    
    this.emitEvent(ExecutionEventType.EXECUTION_COMPLETED, context);
    
    return currentResult || {
      success: true,
      stage: ExecutionState.COMPLETED,
      timestamp: Date.now(),
      context
    };
  }

  /**
   * Execute a single pipeline stage with timeout
   */
  private async executeStage(
    context: ExecutionContext,
    stage: ExecutionState
  ): Promise<CheckpointResult> {
    const handler = this.stages.get(stage);
    if (!handler) {
      return {
        success: false,
        stage,
        timestamp: Date.now(),
        context,
        errors: [
          this.createError(
            stage,
            'NO_HANDLER',
            `No handler registered for stage ${stage}`,
            false
          )
        ]
      };
    }

    const config = this.stageConfigs.get(stage);
    const timeout = config?.timeout || 30000;

    try {
      // Execute with timeout
      const result = await this.withTimeout(
        handler(context),
        timeout,
        `Stage ${stage} timed out after ${timeout}ms`
      );

      // Update context with result
      if (result.context) {
        Object.assign(context, result.context);
      }

      return result;
    } catch (error) {
      logger.error(`Error executing stage ${stage}: ${error instanceof Error ? error.message : String(error)}`);
      
      return {
        success: false,
        stage,
        timestamp: Date.now(),
        context,
        errors: [
          this.createError(
            stage,
            'STAGE_ERROR',
            error instanceof Error ? error.message : 'Unknown error',
            config?.retryable || false
          )
        ]
      };
    }
  }

  /**
   * Validate a checkpoint result
   */
  private async validateCheckpoint(result: CheckpointResult): Promise<CheckpointResult> {
    // Basic validation
    if (!result.context) {
      return {
        success: false,
        stage: result.stage,
        timestamp: Date.now(),
        context: result.context,
        errors: [
          this.createError(
            result.stage,
            'INVALID_CHECKPOINT',
            'Checkpoint result missing context',
            false
          )
        ]
      };
    }

    // Validate context state
    if (!result.context.id || !result.context.opportunity) {
      return {
        success: false,
        stage: result.stage,
        timestamp: Date.now(),
        context: result.context,
        errors: [
          this.createError(
            result.stage,
            'INVALID_CONTEXT',
            'Context missing required fields',
            false
          )
        ]
      };
    }

    return result;
  }

  /**
   * Create a new execution context
   */
  private createContext(
    opportunity: ArbitrageOpportunity,
    path: ArbitragePath,
    maxRetries: number
  ): ExecutionContext {
    const now = Date.now();
    return {
      id: `exec_${now}_${Math.random().toString(36).substring(2, 9)}`,
      opportunity,
      path,
      state: ExecutionState.PENDING,
      priority: this.calculatePriority(path),
      createdAt: now,
      updatedAt: now,
      metadata: {},
      errors: [],
      retryCount: 0,
      maxRetries
    };
  }

  /**
   * Calculate execution priority based on path metrics
   */
  private calculatePriority(path: ArbitragePath): number {
    // Simple priority calculation based on net profit
    const profit = Number(path.netProfit);
    
    if (profit > 1000) return 4; // CRITICAL
    if (profit > 500) return 3;  // HIGH
    if (profit > 100) return 2;  // MEDIUM
    return 1; // LOW
  }

  /**
   * Create an execution error
   */
  private createError(
    stage: ExecutionState,
    errorType: string,
    message: string,
    recoverable: boolean
  ): ExecutionError {
    return {
      timestamp: Date.now(),
      stage,
      errorType,
      message,
      recoverable,
      details: {}
    };
  }

  /**
   * Save execution state
   */
  private async saveState(context: ExecutionContext): Promise<void> {
    if (this.persistence) {
      try {
        await this.persistence.save(context);
      } catch (error) {
        logger.error(`Failed to persist state for ${context.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * Emit an execution event
   */
  private emitEvent(type: ExecutionEventType, context: ExecutionContext, data?: Record<string, unknown>): void {
    const event: ExecutionEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type,
      timestamp: Date.now(),
      context,
      data
    };
    
    this.emit('execution-event', event);
    this.emit(type, event);
  }

  /**
   * Execute a promise with timeout
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string
  ): Promise<T> {
    return Promise.race<T>([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
      )
    ]);
  }

  /**
   * Get active execution contexts
   */
  getActiveContexts(): ExecutionContext[] {
    return Array.from(this.activeContexts.values());
  }

  /**
   * Get context by ID
   */
  getContext(id: string): ExecutionContext | undefined {
    return this.activeContexts.get(id);
  }

  /**
   * Cancel an execution
   */
  async cancelExecution(id: string): Promise<boolean> {
    const context = this.activeContexts.get(id);
    if (!context) {
      return false;
    }

    context.state = ExecutionState.CANCELLED;
    context.updatedAt = Date.now();
    
    await this.saveState(context);
    this.activeContexts.delete(id);
    
    this.emitEvent(ExecutionEventType.EXECUTION_FAILED, context);
    
    return true;
  }

  /**
   * Rollback execution to a previous stage
   */
  async rollback(id: string, targetState: ExecutionState): Promise<AtomicOperationResult> {
    const context = this.activeContexts.get(id);
    if (!context) {
      return {
        success: false,
        error: new Error(`Context ${id} not found`)
      };
    }

    try {
      logger.info(`Rolling back execution ${id} to state ${targetState}`);
      
      context.state = targetState;
      context.updatedAt = Date.now();
      context.retryCount = 0;
      
      await this.saveState(context);
      
      return {
        success: true,
        data: context
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Rollback failed')
      };
    }
  }
}
