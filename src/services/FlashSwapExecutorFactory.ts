/**
 * FlashSwapExecutorFactory - Unified interface for FlashSwapV2 and FlashSwapV3
 * 
 * Provides a factory pattern for creating flash swap executors with automatic
 * version selection based on configuration and gradual rollout support.
 * 
 * Features:
 * - Feature flag controlled V3 enablement (ENABLE_FLASHSWAP_V3)
 * - Gradual rollout percentage (FLASHSWAP_V3_ROLLOUT_PERCENT)
 * - Automatic fallback to V2 if V3 fails or not available
 * - Unified execution interface for both versions
 * - Per-opportunity versioning decision (based on rollout %)
 * 
 * Usage:
 * ```typescript
 * const factory = new FlashSwapExecutorFactory(config);
 * const executor = factory.createExecutor(opportunity);
 * const result = await executor.execute(opportunity);
 * ```
 */

import { Provider, Signer, parseUnits } from 'ethers';
import { logger } from '../utils/logger';
import { ArbitrageOpportunity } from '../types/definitions';
import { FlashSwapV3Executor, FlashLoanSource, DexType, SwapStep as V3SwapStep } from '../execution/FlashSwapV3Executor';
import { FlashLoanExecutor, SwapStep as V2SwapStep, FlashLoanArbitrageParams } from './FlashLoanExecutor';

/**
 * Unified executor configuration
 */
export interface FlashSwapExecutorConfig {
  // V2 Configuration
  flashSwapV2Address?: string;
  aavePoolAddress?: string;
  
  // V3 Configuration
  flashSwapV3Address?: string;
  
  // Shared
  provider: Provider;
  signer: Signer;
  chainId: number;
  
  // Feature flags
  enableV3?: boolean;
  v3RolloutPercent?: number; // 0-100, percentage of opportunities to use V3
  v3SourceStrategy?: 'auto' | 'balancer' | 'aave' | 'hybrid';
  
  // Gas and slippage
  gasBuffer?: number;
  defaultSlippage?: number;
}

/**
 * Unified execution result
 */
export interface UnifiedExecutionResult {
  success: boolean;
  txHash?: string;
  profit?: string;
  netProfit?: bigint;
  gasUsed?: bigint;
  version: 'V2' | 'V3';
  source?: FlashLoanSource;
  error?: string;
}

/**
 * Executor interface - both V2 and V3 must implement this
 */
interface IFlashSwapExecutor {
  execute(params: any): Promise<any>;
  getVersion(): 'V2' | 'V3';
}

/**
 * V2 Executor Wrapper
 */
class V2ExecutorWrapper implements IFlashSwapExecutor {
  constructor(private executor: FlashLoanExecutor) {}
  
  async execute(params: FlashLoanArbitrageParams): Promise<UnifiedExecutionResult> {
    const result = await this.executor.executeFlashLoan(params);
    return {
      ...result,
      version: 'V2',
      netProfit: result.profit ? BigInt(result.profit) : undefined,
    };
  }
  
  getVersion(): 'V2' {
    return 'V2';
  }
}

/**
 * V3 Executor Wrapper
 */
class V3ExecutorWrapper implements IFlashSwapExecutor {
  constructor(private executor: FlashSwapV3Executor) {}
  
  async execute(opportunity: ArbitrageOpportunity): Promise<UnifiedExecutionResult> {
    // Convert opportunity to V3 swap path
    const path = this.executor.constructSwapPath(opportunity);
    
    // Execute with automatic source selection
    const result = await this.executor.executeArbitrage(
      opportunity.input.token,
      BigInt(opportunity.input.amount),
      path
    );
    
    return {
      success: result.success,
      txHash: result.txHash,
      profit: result.netProfit?.toString(),
      netProfit: result.netProfit,
      gasUsed: result.gasUsed,
      version: 'V3',
      source: result.source,
      error: result.error,
    };
  }
  
  getVersion(): 'V3' {
    return 'V3';
  }
}

/**
 * FlashSwapExecutorFactory - Creates appropriate executor version
 */
export class FlashSwapExecutorFactory {
  private config: FlashSwapExecutorConfig;
  private v2Executor?: FlashLoanExecutor;
  private v3Executor?: FlashSwapV3Executor;
  private rolloutRandom: () => number;
  
  constructor(config: FlashSwapExecutorConfig) {
    this.config = {
      enableV3: false,
      v3RolloutPercent: 10,
      v3SourceStrategy: 'auto',
      gasBuffer: 1.2,
      defaultSlippage: 0.01,
      ...config,
    };
    
    // Initialize executors
    this.initializeExecutors();
    
    // Random function for rollout percentage (can be overridden for testing)
    this.rolloutRandom = () => Math.random() * 100;
  }
  
  /**
   * Initialize V2 and V3 executors based on configuration
   */
  private initializeExecutors(): void {
    // Initialize V2 if address provided
    if (this.config.flashSwapV2Address && this.config.aavePoolAddress) {
      try {
        this.v2Executor = new FlashLoanExecutor({
          flashSwapAddress: this.config.flashSwapV2Address,
          aavePoolAddress: this.config.aavePoolAddress,
          provider: this.config.provider,
          signer: this.config.signer,
        });
        logger.info('[FlashSwapFactory] V2 Executor initialized', {
          address: this.config.flashSwapV2Address,
        });
      } catch (error) {
        logger.error('[FlashSwapFactory] Failed to initialize V2 Executor', { error });
      }
    }
    
    // Initialize V3 if enabled and address provided
    if (this.config.enableV3 && this.config.flashSwapV3Address) {
      try {
        this.v3Executor = new FlashSwapV3Executor({
          contractAddress: this.config.flashSwapV3Address,
          provider: this.config.provider,
          signer: this.config.signer,
          chainId: this.config.chainId,
          gasBuffer: this.config.gasBuffer,
          defaultSlippage: this.config.defaultSlippage,
        });
        logger.info('[FlashSwapFactory] V3 Executor initialized', {
          address: this.config.flashSwapV3Address,
          rolloutPercent: this.config.v3RolloutPercent,
          strategy: this.config.v3SourceStrategy,
        });
      } catch (error) {
        logger.error('[FlashSwapFactory] Failed to initialize V3 Executor', { error });
      }
    }
  }
  
  /**
   * Decide which version to use for this opportunity
   * 
   * Decision logic:
   * 1. If V3 not enabled, use V2
   * 2. If V3 not available, use V2
   * 3. Roll dice based on rollout percentage
   * 4. If dice says V3 but V3 fails, fallback to V2
   */
  private shouldUseV3(): boolean {
    if (!this.config.enableV3) {
      return false;
    }
    
    if (!this.v3Executor) {
      logger.warn('[FlashSwapFactory] V3 requested but not available, using V2');
      return false;
    }
    
    const rolloutPercent = this.config.v3RolloutPercent || 0;
    const roll = this.rolloutRandom();
    
    const useV3 = roll < rolloutPercent;
    
    if (useV3) {
      logger.debug('[FlashSwapFactory] Selected V3 for this opportunity', {
        roll: roll.toFixed(2),
        threshold: rolloutPercent,
      });
    }
    
    return useV3;
  }
  
  /**
   * Create executor for the given opportunity
   * 
   * Returns V3 or V2 based on rollout configuration
   */
  public createExecutor(opportunity?: ArbitrageOpportunity): IFlashSwapExecutor {
    const useV3 = this.shouldUseV3();
    
    if (useV3 && this.v3Executor) {
      return new V3ExecutorWrapper(this.v3Executor);
    }
    
    if (!this.v2Executor) {
      throw new Error('No flash swap executor available (neither V2 nor V3)');
    }
    
    return new V2ExecutorWrapper(this.v2Executor);
  }
  
  /**
   * Execute opportunity with automatic version selection
   * 
   * Includes automatic fallback to V2 if V3 fails
   */
  public async execute(opportunity: ArbitrageOpportunity): Promise<UnifiedExecutionResult> {
    const executor = this.createExecutor(opportunity);
    const version = executor.getVersion();
    
    logger.info(`[FlashSwapFactory] Executing with ${version}`, {
      opportunityId: opportunity.id,
      expectedProfit: opportunity.profitAmount,
    });
    
    try {
      const result = await executor.execute(
        version === 'V3' ? opportunity : this.convertToV2Params(opportunity)
      );
      
      logger.info(`[FlashSwapFactory] ${version} execution completed`, {
        success: result.success,
        txHash: result.txHash,
        profit: result.profit,
      });
      
      return result;
    } catch (error) {
      logger.error(`[FlashSwapFactory] ${version} execution failed`, {
        error,
        opportunityId: opportunity.id,
      });
      
      // If V3 failed and V2 is available, try V2 as fallback
      if (version === 'V3' && this.v2Executor) {
        logger.info('[FlashSwapFactory] Falling back to V2 after V3 failure');
        
        try {
          const v2Executor = new V2ExecutorWrapper(this.v2Executor);
          return await v2Executor.execute(this.convertToV2Params(opportunity));
        } catch (v2Error) {
          logger.error('[FlashSwapFactory] V2 fallback also failed', { v2Error });
          throw v2Error;
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Convert ArbitrageOpportunity to V2 params format
   */
  private convertToV2Params(opportunity: ArbitrageOpportunity): FlashLoanArbitrageParams {
    // Convert opportunity path to V2 swap steps
    const swapPath: V2SwapStep[] = opportunity.path.swaps.map((swap) => ({
      pool: swap.pool,
      tokenIn: swap.tokenIn,
      tokenOut: swap.tokenOut,
      fee: swap.fee || 3000, // Default to 0.3%
      minOut: swap.minOut || '0',
      dexType: this.convertDexType(swap.dex),
    }));
    
    return {
      borrowToken: opportunity.input.token,
      borrowAmount: opportunity.input.amount,
      swapPath,
      expectedProfit: opportunity.profitAmount,
    };
  }
  
  /**
   * Convert DEX string to numeric type for V2
   */
  private convertDexType(dex: string): number {
    const dexMap: Record<string, number> = {
      'uniswapv3': 0,
      'sushiswap': 1,
      'dodo': 2,
    };
    return dexMap[dex.toLowerCase()] || 0;
  }
  
  /**
   * Get current executor statistics
   */
  public getStats(): {
    v2Available: boolean;
    v3Available: boolean;
    v3Enabled: boolean;
    v3RolloutPercent: number;
    currentVersion: 'V2' | 'V3' | 'BOTH';
  } {
    return {
      v2Available: !!this.v2Executor,
      v3Available: !!this.v3Executor,
      v3Enabled: !!this.config.enableV3,
      v3RolloutPercent: this.config.v3RolloutPercent || 0,
      currentVersion: this.v2Executor && this.v3Executor ? 'BOTH' : 
                      this.v3Executor ? 'V3' : 'V2',
    };
  }
  
  /**
   * Override rollout random function (for testing)
   */
  public setRolloutRandom(fn: () => number): void {
    this.rolloutRandom = fn;
  }
}
