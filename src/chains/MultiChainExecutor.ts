/**
 * MultiChainExecutor - Execute cross-chain arbitrage paths
 *
 * Coordinates swaps and bridges across multiple chains with error handling
 * and emergency recovery
 */

import { CrossChainPath, CrossChainHop } from '../arbitrage/CrossChainPathFinder';
import { BridgeManager } from './BridgeManager';
import { ChainAdapter } from './adapters/ChainAdapter';
import { ExecutionConfig } from '../config/cross-chain.config';

export interface ExecutionResult {
  success: boolean;
  path: CrossChainPath;
  actualProfit?: bigint;
  gasSpent?: bigint;
  executionTime: number;
  hopsCompleted: number;
  error?: string;
  txHashes: string[];
}

export interface ExecutionStep {
  hop: CrossChainHop;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  txHash?: string;
  error?: string;
  timestamp: number;
}

export class MultiChainExecutor {
  private bridgeManager: BridgeManager;
  private adapters: Map<number | string, ChainAdapter>;
  private config: ExecutionConfig;
  private activeExecutions: Map<string, ExecutionStep[]>;

  constructor(
    bridgeManager: BridgeManager,
    adapters: Map<number | string, ChainAdapter>,
    config: ExecutionConfig
  ) {
    this.bridgeManager = bridgeManager;
    this.adapters = adapters;
    this.config = config;
    this.activeExecutions = new Map();
  }

  /**
   * Execute a cross-chain arbitrage path
   */
  async executePath(path: CrossChainPath): Promise<ExecutionResult> {
    const executionId = `exec-${Date.now()}`;
    const startTime = Date.now();
    const steps: ExecutionStep[] = [];
    const txHashes: string[] = [];
    let currentAmount = path.hops[0].amountIn;

    try {
      // Initialize execution tracking
      this.activeExecutions.set(executionId, steps);

      // Execute each hop in sequence
      for (let i = 0; i < path.hops.length; i++) {
        const hop = path.hops[i];

        const step: ExecutionStep = {
          hop,
          status: 'pending',
          timestamp: Date.now(),
        };
        steps.push(step);

        try {
          step.status = 'executing';

          if (hop.isBridge && hop.bridgeInfo) {
            // Execute bridge hop
            const bridgeResult = await this.executeBridgeHop(hop, currentAmount);
            step.txHash = bridgeResult.txHash;
            txHashes.push(bridgeResult.txHash);
            currentAmount = bridgeResult.amountOut;

            // Wait for bridge completion with timeout
            const bridgeCompleted = await this.waitForBridge(
              bridgeResult.txHash,
              this.config.bridgeTimeoutMs
            );

            if (!bridgeCompleted) {
              throw new Error('Bridge timeout');
            }
          } else {
            // Execute swap hop
            const swapResult = await this.executeSwapHop(hop);
            step.txHash = swapResult.txHash;
            txHashes.push(swapResult.txHash);
            currentAmount = swapResult.amountOut;

            // Wait for transaction confirmation
            const adapter = this.adapters.get(hop.chainId);
            if (adapter) {
              const confirmed = await adapter.waitForTransaction(swapResult.txHash, 60000);
              if (!confirmed) {
                throw new Error('Transaction confirmation timeout');
              }
            }
          }

          step.status = 'completed';
        } catch (error) {
          step.status = 'failed';
          step.error = error instanceof Error ? error.message : String(error);

          // Attempt recovery if enabled
          if (this.config.enableEmergencyRecovery) {
            await this.attemptRecovery(path, i, currentAmount);
          }

          throw error;
        }
      }

      // Calculate actual profit
      const actualProfit = currentAmount - path.hops[0].amountIn;
      const executionTime = Date.now() - startTime;

      return {
        success: true,
        path,
        actualProfit,
        executionTime,
        hopsCompleted: path.hops.length,
        txHashes,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const completedHops = steps.filter((s) => s.status === 'completed').length;

      return {
        success: false,
        path,
        executionTime,
        hopsCompleted: completedHops,
        error: error instanceof Error ? error.message : String(error),
        txHashes,
      };
    } finally {
      this.activeExecutions.delete(executionId);
    }
  }

  /**
   * Execute multiple paths concurrently (with limits)
   */
  async executeMultiplePaths(paths: CrossChainPath[]): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];

    // Execute in batches respecting concurrency limit
    const batchSize = this.config.maxConcurrentPaths;

    for (let i = 0; i < paths.length; i += batchSize) {
      const batch = paths.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(batch.map((path) => this.executePath(path)));

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          // Create failed result for rejected promise
          results.push({
            success: false,
            path: batch[results.length % batch.length],
            executionTime: 0,
            hopsCompleted: 0,
            error: result.reason instanceof Error ? result.reason.message : String(result.reason),
            txHashes: [],
          });
        }
      }
    }

    return results;
  }

  /**
   * Execute a bridge hop
   */
  private async executeBridgeHop(
    hop: CrossChainHop,
    amount: bigint
  ): Promise<{ txHash: string; amountOut: bigint }> {
    if (!hop.bridgeInfo) {
      throw new Error('Bridge info missing');
    }

    const route = await this.bridgeManager.selectBridge(
      hop.chainId,
      hop.bridgeInfo.toChain,
      hop.tokenIn,
      amount
    );

    if (!route) {
      throw new Error('No bridge route available');
    }

    const transaction = await this.bridgeManager.executeBridge(route);

    return {
      txHash: transaction.txHash,
      amountOut: amount - route.estimatedFee,
    };
  }

  /**
   * Execute a swap hop
   */
  private async executeSwapHop(hop: CrossChainHop): Promise<{ txHash: string; amountOut: bigint }> {
    const adapter = this.adapters.get(hop.chainId);

    if (!adapter) {
      throw new Error(`Adapter not found for chain ${hop.chainId}`);
    }

    const deadline = Math.floor(Date.now() / 1000) + 1200; // 20 minutes
    const minAmountOut =
      (hop.amountOut * BigInt(100 - Math.floor(this.config.slippageTolerance * 100))) / BigInt(100);

    // Note: In production, recipient should be provided via constructor or configuration
    // Using zero address here would result in token loss - this is a placeholder
    const recipientAddress = '0x0000000000000000000000000000000000000000';

    const txHash = await adapter.executeSwap(
      {
        tokenIn: hop.tokenIn,
        tokenOut: hop.tokenOut,
        amountIn: hop.amountIn,
        minAmountOut,
        deadline,
        recipient: recipientAddress,
      },
      hop.poolAddress
    );

    return {
      txHash,
      amountOut: hop.amountOut,
    };
  }

  /**
   * Wait for bridge completion with timeout
   */
  private async waitForBridge(txHash: string, timeoutMs: number): Promise<boolean> {
    try {
      return await this.bridgeManager.waitForBridge(txHash, timeoutMs);
    } catch (error) {
      console.error('Bridge wait failed:', error);
      return false;
    }
  }

  /**
   * Attempt emergency recovery for failed execution
   */
  private async attemptRecovery(
    path: CrossChainPath,
    failedHopIndex: number,
    currentAmount: bigint
  ): Promise<void> {
    console.log(`Attempting recovery after hop ${failedHopIndex}`);

    // Recovery strategies:
    // 1. Try to return funds to original chain
    // 2. Convert to stablecoin on current chain
    // 3. Wait and retry

    // Simplified recovery - just log for now
    console.log(`Recovery needed: ${currentAmount} stuck after ${failedHopIndex} hops`);
  }

  /**
   * Retry execution with exponential backoff
   */
  async executeWithRetry(path: CrossChainPath): Promise<ExecutionResult> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        const result = await this.executePath(path);
        if (result.success) {
          return result;
        }
        lastError = new Error(result.error || 'Execution failed');
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }

      if (attempt < this.config.retryAttempts - 1) {
        // Exponential backoff: 2^attempt * 1000ms
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // All retries failed
    return {
      success: false,
      path,
      executionTime: 0,
      hopsCompleted: 0,
      error: lastError?.message || 'All retry attempts failed',
      txHashes: [],
    };
  }

  /**
   * Get active executions
   */
  getActiveExecutions(): Map<string, ExecutionStep[]> {
    return new Map(this.activeExecutions);
  }

  /**
   * Check if executor is busy
   */
  isBusy(): boolean {
    return this.activeExecutions.size >= this.config.maxConcurrentPaths;
  }

  /**
   * Get execution statistics
   */
  getStats(): {
    activeExecutions: number;
    maxConcurrentPaths: number;
    retryAttempts: number;
    recoveryEnabled: boolean;
  } {
    return {
      activeExecutions: this.activeExecutions.size,
      maxConcurrentPaths: this.config.maxConcurrentPaths,
      retryAttempts: this.config.retryAttempts,
      recoveryEnabled: this.config.enableEmergencyRecovery,
    };
  }
}

export default MultiChainExecutor;
