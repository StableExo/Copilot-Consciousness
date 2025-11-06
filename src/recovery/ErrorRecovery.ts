/**
 * ErrorRecovery.ts - Autonomous error handling and recovery
 * 
 * Features:
 * - Transaction failure recovery
 * - Nonce synchronization recovery
 * - Gas price volatility handling
 * - Network condition adaptation
 * - Automated retry logic with exponential backoff
 * - State recovery and consistency checks
 */

import { logger } from '../utils/logger';
import { NonceManager } from '../execution/NonceManager';
import { GasPriceOracle } from '../gas/GasPriceOracle';
import {
  ExecutionContext,
  ExecutionError,
  RecoveryStrategy,
  RecoveryAction,
  RecoveryResult,
  ExecutionState,
  TransactionStatus
} from '../types/ExecutionTypes';

/**
 * Error Recovery Configuration
 */
export interface ErrorRecoveryConfig {
  maxRetryAttempts: number;
  baseBackoffMs: number;
  maxBackoffMs: number;
  backoffMultiplier: number;
  enableNonceResync: boolean;
  enableGasAdjustment: boolean;
  gasPriceMultiplier: number;
  maxGasPriceIncrease: number;
  networkRetryDelay: number;
}

/**
 * Error Recovery System
 */
export class ErrorRecovery {
  private config: ErrorRecoveryConfig;
  private activeRecoveries: Map<string, RecoveryAction> = new Map();
  private recoveryHistory: RecoveryResult[] = [];
  
  // Statistics
  private stats = {
    totalRecoveries: 0,
    successfulRecoveries: 0,
    failedRecoveries: 0,
    nonceResyncs: 0,
    gasAdjustments: 0,
    retries: 0
  };

  constructor(config?: Partial<ErrorRecoveryConfig>) {
    this.config = {
      maxRetryAttempts: config?.maxRetryAttempts || 3,
      baseBackoffMs: config?.baseBackoffMs || 1000,
      maxBackoffMs: config?.maxBackoffMs || 60000,
      backoffMultiplier: config?.backoffMultiplier || 2,
      enableNonceResync: config?.enableNonceResync !== false,
      enableGasAdjustment: config?.enableGasAdjustment !== false,
      gasPriceMultiplier: config?.gasPriceMultiplier || 1.1,
      maxGasPriceIncrease: config?.maxGasPriceIncrease || 2.0,
      networkRetryDelay: config?.networkRetryDelay || 5000
    };
  }

  /**
   * Attempt to recover from an execution error
   */
  async recover(
    context: ExecutionContext,
    error: ExecutionError,
    nonceManager?: NonceManager,
    gasOracle?: GasPriceOracle
  ): Promise<RecoveryResult> {
    this.stats.totalRecoveries++;
    
    logger.info(`[ErrorRecovery] Starting recovery for context ${context.id}, error: ${error.errorType}`);
    
    // Determine recovery strategy
    const strategy = this.determineRecoveryStrategy(error, context);
    
    if (strategy === RecoveryStrategy.CANCEL) {
      logger.warn(`[ErrorRecovery] Error is not recoverable, cancelling execution`);
      return this.createFailedRecovery(strategy, 'Error is not recoverable');
    }
    
    // Create recovery action
    const action = this.createRecoveryAction(strategy, context);
    this.activeRecoveries.set(context.id, action);
    
    try {
      // Execute recovery strategy
      const result = await this.executeRecovery(action, error, nonceManager, gasOracle);
      
      // Store result
      this.recoveryHistory.push(result);
      
      // Update statistics
      if (result.success) {
        this.stats.successfulRecoveries++;
      } else {
        this.stats.failedRecoveries++;
      }
      
      return result;
      
    } finally {
      this.activeRecoveries.delete(context.id);
    }
  }

  /**
   * Determine the appropriate recovery strategy
   */
  private determineRecoveryStrategy(
    error: ExecutionError,
    context: ExecutionContext
  ): RecoveryStrategy {
    const errorType = error.errorType.toUpperCase();
    const errorMessage = error.message.toLowerCase();
    
    // Nonce-related errors
    if (errorType.includes('NONCE') || 
        errorMessage.includes('nonce too low') ||
        errorMessage.includes('nonce has already been used') ||
        errorMessage.includes('invalid nonce')) {
      return RecoveryStrategy.RESYNC_NONCE;
    }
    
    // Gas-related errors
    if (errorType.includes('GAS') ||
        errorMessage.includes('insufficient funds') ||
        errorMessage.includes('gas price too low') ||
        errorMessage.includes('transaction underpriced')) {
      return RecoveryStrategy.ADJUST_GAS;
    }
    
    // Network errors
    if (errorType.includes('NETWORK') ||
        errorType.includes('TIMEOUT') ||
        errorMessage.includes('network') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('connection')) {
      return RecoveryStrategy.WAIT_AND_RETRY;
    }
    
    // Transaction replacement
    if (errorMessage.includes('replacement transaction underpriced') ||
        errorMessage.includes('already known')) {
      return RecoveryStrategy.ADJUST_GAS;
    }
    
    // Generic retryable errors
    if (error.recoverable && context.retryCount < context.maxRetries) {
      return RecoveryStrategy.RETRY;
    }
    
    // Escalate complex issues
    if (context.retryCount >= context.maxRetries) {
      return RecoveryStrategy.ESCALATE;
    }
    
    // Non-recoverable errors
    return RecoveryStrategy.CANCEL;
  }

  /**
   * Execute the recovery strategy
   */
  private async executeRecovery(
    action: RecoveryAction,
    error: ExecutionError,
    nonceManager?: NonceManager,
    gasOracle?: GasPriceOracle
  ): Promise<RecoveryResult> {
    logger.info(`[ErrorRecovery] Executing recovery strategy: ${action.strategy}`);
    
    switch (action.strategy) {
      case RecoveryStrategy.RETRY:
        return this.executeRetry(action);
        
      case RecoveryStrategy.RESYNC_NONCE:
        return this.executeNonceResync(action, nonceManager);
        
      case RecoveryStrategy.ADJUST_GAS:
        return this.executeGasAdjustment(action, gasOracle);
        
      case RecoveryStrategy.WAIT_AND_RETRY:
        return this.executeWaitAndRetry(action);
        
      case RecoveryStrategy.ESCALATE:
        return this.executeEscalation(action);
        
      default:
        return this.createFailedRecovery(action.strategy, 'Unknown recovery strategy');
    }
  }

  /**
   * Execute simple retry with backoff
   */
  private async executeRetry(action: RecoveryAction): Promise<RecoveryResult> {
    this.stats.retries++;
    
    // Calculate backoff delay
    const delay = this.calculateBackoff(action.attempts);
    action.nextRetryAt = Date.now() + delay;
    
    logger.info(`[ErrorRecovery] Retrying in ${delay}ms (attempt ${action.attempts + 1}/${action.maxAttempts})`);
    
    // Wait for backoff period
    await this.sleep(delay);
    
    // Update context for retry
    const newContext = { ...action.context };
    newContext.retryCount++;
    newContext.updatedAt = Date.now();
    
    return {
      success: true,
      strategy: action.strategy,
      timestamp: Date.now(),
      executionResumed: true,
      newContext
    };
  }

  /**
   * Execute nonce resynchronization
   */
  private async executeNonceResync(
    action: RecoveryAction,
    nonceManager?: NonceManager
  ): Promise<RecoveryResult> {
    if (!this.config.enableNonceResync) {
      return this.createFailedRecovery(action.strategy, 'Nonce resync is disabled');
    }
    
    if (!nonceManager) {
      return this.createFailedRecovery(action.strategy, 'NonceManager not provided');
    }
    
    this.stats.nonceResyncs++;
    
    try {
      logger.info(`[ErrorRecovery] Resyncing nonce for ${action.context.id}`);
      
      // Resync nonce
      await nonceManager.resyncNonce();
      
      logger.info(`[ErrorRecovery] Nonce resync completed successfully`);
      
      // Update context
      const newContext = { ...action.context };
      newContext.retryCount++;
      newContext.updatedAt = Date.now();
      newContext.nonce = undefined; // Will be reassigned on retry
      
      return {
        success: true,
        strategy: action.strategy,
        timestamp: Date.now(),
        executionResumed: true,
        newContext
      };
      
    } catch (error) {
      logger.error(`[ErrorRecovery] Nonce resync failed: ${error instanceof Error ? error.message : String(error)}`);
      return this.createFailedRecovery(
        action.strategy,
        error instanceof Error ? error.message : 'Nonce resync failed'
      );
    }
  }

  /**
   * Execute gas price adjustment
   */
  private async executeGasAdjustment(
    action: RecoveryAction,
    gasOracle?: GasPriceOracle
  ): Promise<RecoveryResult> {
    if (!this.config.enableGasAdjustment) {
      return this.createFailedRecovery(action.strategy, 'Gas adjustment is disabled');
    }
    
    this.stats.gasAdjustments++;
    
    try {
      logger.info(`[ErrorRecovery] Adjusting gas price for ${action.context.id}`);
      
      let newGasPrice: bigint;
      
      if (gasOracle) {
        // Get current gas price from oracle
        const gasPrice = await gasOracle.getCurrentGasPrice('fast');
        newGasPrice = gasPrice.maxFeePerGas;
      } else {
        // Increase gas price by multiplier
        const currentGasPrice = action.context.gasPrice || BigInt(50 * 10 ** 9); // 50 gwei default
        newGasPrice = BigInt(Math.floor(Number(currentGasPrice) * this.config.gasPriceMultiplier));
      }
      
      // Check if increase is within limits
      const originalGasPrice = action.context.gasPrice || BigInt(0);
      const increaseRatio = Number(newGasPrice) / Number(originalGasPrice || 1);
      
      if (increaseRatio > this.config.maxGasPriceIncrease) {
        logger.warn(`[ErrorRecovery] Gas price increase (${increaseRatio}x) exceeds maximum (${this.config.maxGasPriceIncrease}x)`);
        return this.createFailedRecovery(action.strategy, 'Gas price increase exceeds maximum');
      }
      
      logger.info(`[ErrorRecovery] Adjusted gas price from ${originalGasPrice} to ${newGasPrice}`);
      
      // Update context
      const newContext = { ...action.context };
      newContext.retryCount++;
      newContext.updatedAt = Date.now();
      newContext.gasPrice = newGasPrice;
      
      // Recalculate gas cost and profit
      if (newContext.estimatedGas) {
        newContext.totalGasCost = newContext.estimatedGas * newGasPrice;
        if (newContext.estimatedProfit) {
          newContext.netProfit = newContext.estimatedProfit - newContext.totalGasCost;
        }
      }
      
      return {
        success: true,
        strategy: action.strategy,
        timestamp: Date.now(),
        executionResumed: true,
        newContext
      };
      
    } catch (error) {
      logger.error(`[ErrorRecovery] Gas adjustment failed: ${error instanceof Error ? error.message : String(error)}`);
      return this.createFailedRecovery(
        action.strategy,
        error instanceof Error ? error.message : 'Gas adjustment failed'
      );
    }
  }

  /**
   * Execute wait and retry for network issues
   */
  private async executeWaitAndRetry(action: RecoveryAction): Promise<RecoveryResult> {
    const delay = this.config.networkRetryDelay;
    action.nextRetryAt = Date.now() + delay;
    
    logger.info(`[ErrorRecovery] Waiting ${delay}ms for network recovery before retry`);
    
    await this.sleep(delay);
    
    // Update context
    const newContext = { ...action.context };
    newContext.retryCount++;
    newContext.updatedAt = Date.now();
    
    return {
      success: true,
      strategy: action.strategy,
      timestamp: Date.now(),
      executionResumed: true,
      newContext
    };
  }

  /**
   * Execute escalation for complex issues
   */
  private async executeEscalation(action: RecoveryAction): Promise<RecoveryResult> {
    logger.warn(`[ErrorRecovery] Escalating issue for ${action.context.id} - max retries exceeded`);
    
    // In a production system, this would:
    // 1. Log to monitoring/alerting system
    // 2. Notify operators
    // 3. Store context for manual review
    // 4. Potentially trigger emergency shutdown
    
    return {
      success: false,
      strategy: action.strategy,
      timestamp: Date.now(),
      executionResumed: false,
      error: {
        timestamp: Date.now(),
        stage: action.context.state,
        errorType: 'ESCALATED',
        message: 'Issue escalated - requires manual intervention',
        recoverable: false
      }
    };
  }

  /**
   * Create a recovery action
   */
  private createRecoveryAction(
    strategy: RecoveryStrategy,
    context: ExecutionContext
  ): RecoveryAction {
    return {
      id: `recovery_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      strategy,
      context,
      timestamp: Date.now(),
      attempts: 0,
      maxAttempts: this.config.maxRetryAttempts,
      backoffMs: this.config.baseBackoffMs
    };
  }

  /**
   * Create a failed recovery result
   */
  private createFailedRecovery(
    strategy: RecoveryStrategy,
    message: string
  ): RecoveryResult {
    return {
      success: false,
      strategy,
      timestamp: Date.now(),
      executionResumed: false,
      error: {
        timestamp: Date.now(),
        stage: ExecutionState.FAILED,
        errorType: 'RECOVERY_FAILED',
        message,
        recoverable: false
      }
    };
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(attempts: number): number {
    const delay = this.config.baseBackoffMs * Math.pow(this.config.backoffMultiplier, attempts);
    return Math.min(delay, this.config.maxBackoffMs);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get active recovery actions
   */
  getActiveRecoveries(): RecoveryAction[] {
    return Array.from(this.activeRecoveries.values());
  }

  /**
   * Get recovery by context ID
   */
  getRecovery(contextId: string): RecoveryAction | undefined {
    return this.activeRecoveries.get(contextId);
  }

  /**
   * Get recovery history
   */
  getRecoveryHistory(limit?: number): RecoveryResult[] {
    if (limit) {
      return this.recoveryHistory.slice(-limit);
    }
    return [...this.recoveryHistory];
  }

  /**
   * Get recovery statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalRecoveries: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0,
      nonceResyncs: 0,
      gasAdjustments: 0,
      retries: 0
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ErrorRecoveryConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('[ErrorRecovery] Configuration updated');
  }
}
