/**
 * AdvancedGasEstimator - Advanced gas estimation and pre-execution validation
 * 
 * Ported from PROJECT-HAVOC design for superior operational efficiency
 * Combines path-based heuristic calculations with on-chain estimateGas() validation
 * to prevent wasted gas on reverts and unprofitable transactions
 */

import { ethers } from 'ethers';
import { ArbitragePath, ArbitrageHop } from '../arbitrage/types';
import { GasPriceOracle, GasPrice } from './GasPriceOracle';

/**
 * Per-DEX gas estimate configuration
 */
export interface DEXGasConfig {
  dexName: string;
  baseGas: number;        // Base gas cost for a swap on this DEX
  gasPerHop: number;      // Additional gas per hop/step
  overhead: number;       // Protocol overhead gas
  complexity: number;     // Complexity multiplier (1.0 = normal)
}

/**
 * Gas estimation configuration
 */
export interface GasEstimationConfig {
  // Gas buffer multipliers
  bufferMultiplier: number;           // Default buffer (e.g., 1.1 = 10% buffer)
  maxBufferMultiplier: number;        // Maximum buffer allowed (e.g., 1.5 = 50%)
  
  // Gas price limits
  maxGasPrice: bigint;                // Maximum acceptable gas price
  minGasPrice: bigint;                // Minimum gas price (fallback)
  
  // Profitability thresholds
  minProfitAfterGas: bigint;          // Minimum net profit required
  maxGasCostPercentage: number;       // Max % of profit that can be gas
  
  // Estimation strategy
  useOnChainEstimation: boolean;      // Whether to use estimateGas()
  fallbackToHeuristic: boolean;       // Fall back to heuristic if on-chain fails
  
  // Per-DEX configurations
  dexConfigs: Map<string, DEXGasConfig>;
  
  // Default DEX config for unknown DEXes
  defaultDEXConfig: DEXGasConfig;
}

/**
 * Gas estimation result
 */
export interface GasEstimationResult {
  success: boolean;
  estimatedGas: bigint;
  gasPrice: bigint;
  totalGasCost: bigint;
  netProfit: bigint;
  profitable: boolean;
  reason?: string;
  breakdown?: GasBreakdown;
}

/**
 * Detailed gas cost breakdown
 */
export interface GasBreakdown {
  baseGas: bigint;
  hopGas: bigint;
  overhead: bigint;
  buffer: bigint;
  total: bigint;
}

/**
 * Validation result for pre-execution checks
 */
export interface ValidationResult {
  valid: boolean;
  executable: boolean;
  reason?: string;
  estimatedGas?: bigint;
  gasPrice?: bigint;
  netProfit?: bigint;
  warnings: string[];
}

/**
 * Default DEX gas configurations based on PROJECT-HAVOC analysis
 */
const DEFAULT_DEX_CONFIGS: Record<string, DEXGasConfig> = {
  'Uniswap V2': {
    dexName: 'Uniswap V2',
    baseGas: 100000,
    gasPerHop: 30000,
    overhead: 21000,
    complexity: 1.0
  },
  'Uniswap V3': {
    dexName: 'Uniswap V3',
    baseGas: 120000,
    gasPerHop: 35000,
    overhead: 21000,
    complexity: 1.2
  },
  'SushiSwap': {
    dexName: 'SushiSwap',
    baseGas: 100000,
    gasPerHop: 30000,
    overhead: 21000,
    complexity: 1.0
  },
  'Curve': {
    dexName: 'Curve',
    baseGas: 150000,
    gasPerHop: 40000,
    overhead: 21000,
    complexity: 1.5
  },
  'Balancer': {
    dexName: 'Balancer',
    baseGas: 180000,
    gasPerHop: 45000,
    overhead: 21000,
    complexity: 1.8
  },
  '1inch': {
    dexName: '1inch',
    baseGas: 140000,
    gasPerHop: 38000,
    overhead: 21000,
    complexity: 1.4
  },
  'PancakeSwap': {
    dexName: 'PancakeSwap',
    baseGas: 100000,
    gasPerHop: 30000,
    overhead: 21000,
    complexity: 1.0
  },
  'PancakeSwap V3': {
    dexName: 'PancakeSwap V3',
    baseGas: 120000,
    gasPerHop: 35000,
    overhead: 21000,
    complexity: 1.2
  }
};

export class AdvancedGasEstimator {
  private provider: ethers.providers.JsonRpcProvider;
  private oracle: GasPriceOracle;
  private config: GasEstimationConfig;
  
  // Statistics for monitoring
  private stats = {
    totalEstimations: 0,
    onChainEstimations: 0,
    heuristicEstimations: 0,
    failedEstimations: 0,
    blockedOpportunities: 0
  };

  constructor(
    provider: ethers.providers.JsonRpcProvider,
    oracle: GasPriceOracle,
    config?: Partial<GasEstimationConfig>
  ) {
    this.provider = provider;
    this.oracle = oracle;
    
    // Initialize DEX configs
    const dexConfigs = new Map<string, DEXGasConfig>();
    for (const [name, cfg] of Object.entries(DEFAULT_DEX_CONFIGS)) {
      dexConfigs.set(name, cfg);
    }
    
    // Merge with provided config
    this.config = {
      bufferMultiplier: config?.bufferMultiplier || 1.1,
      maxBufferMultiplier: config?.maxBufferMultiplier || 1.5,
      maxGasPrice: config?.maxGasPrice || BigInt(500) * BigInt(10 ** 9), // 500 gwei
      minGasPrice: config?.minGasPrice || BigInt(1) * BigInt(10 ** 9),   // 1 gwei
      minProfitAfterGas: config?.minProfitAfterGas || BigInt(10) * BigInt(10 ** 18), // 10 tokens
      maxGasCostPercentage: config?.maxGasCostPercentage || 50,
      useOnChainEstimation: config?.useOnChainEstimation !== false,
      fallbackToHeuristic: config?.fallbackToHeuristic !== false,
      dexConfigs: config?.dexConfigs || dexConfigs,
      defaultDEXConfig: config?.defaultDEXConfig || {
        dexName: 'Unknown',
        baseGas: 150000,
        gasPerHop: 40000,
        overhead: 21000,
        complexity: 1.5
      }
    };
  }

  /**
   * Estimate gas for an arbitrage path using heuristic calculation
   */
  async estimateGasHeuristic(path: ArbitragePath): Promise<GasEstimationResult> {
    this.stats.totalEstimations++;
    this.stats.heuristicEstimations++;

    try {
      // Calculate gas breakdown
      const breakdown = this.calculateGasBreakdown(path);
      
      // Get current gas price with clamping
      const gasPrice = await this.getClampedGasPrice();
      
      // Calculate total gas cost
      const totalGasCost = breakdown.total * gasPrice;
      
      // Calculate net profit
      const netProfit = path.estimatedProfit - totalGasCost;
      
      // Check profitability
      const profitable = this.isProfitable(path.estimatedProfit, totalGasCost);
      
      return {
        success: true,
        estimatedGas: breakdown.total,
        gasPrice,
        totalGasCost,
        netProfit,
        profitable,
        breakdown
      };
    } catch (error) {
      this.stats.failedEstimations++;
      return this.createFailedEstimation(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Estimate gas using on-chain estimateGas() call
   */
  async estimateGasOnChain(
    path: ArbitragePath,
    from: string,
    executorAddress: string
  ): Promise<GasEstimationResult> {
    this.stats.totalEstimations++;
    this.stats.onChainEstimations++;

    if (!this.config.useOnChainEstimation) {
      return this.estimateGasHeuristic(path);
    }

    try {
      // Build transaction data for estimation
      const txData = this.buildTransactionData(path);
      
      // Estimate gas using provider
      const estimatedGas = await this.provider.estimateGas({
        from,
        to: executorAddress,
        data: txData,
        value: 0
      });
      
      // Apply buffer to estimated gas
      const bufferedGas = this.applyGasBuffer(BigInt(estimatedGas.toString()));
      
      // Get clamped gas price
      const gasPrice = await this.getClampedGasPrice();
      
      // Calculate costs
      const totalGasCost = bufferedGas * gasPrice;
      const netProfit = path.estimatedProfit - totalGasCost;
      const profitable = this.isProfitable(path.estimatedProfit, totalGasCost);
      
      return {
        success: true,
        estimatedGas: bufferedGas,
        gasPrice,
        totalGasCost,
        netProfit,
        profitable
      };
    } catch (error) {
      // On-chain estimation failed, fall back to heuristic if configured
      if (this.config.fallbackToHeuristic) {
        console.warn('On-chain gas estimation failed, falling back to heuristic:', error);
        return this.estimateGasHeuristic(path);
      }
      
      this.stats.failedEstimations++;
      return this.createFailedEstimation(
        `On-chain estimation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Comprehensive pre-execution validation
   */
  async validateExecution(
    path: ArbitragePath,
    from?: string,
    executorAddress?: string
  ): Promise<ValidationResult> {
    const warnings: string[] = [];
    
    try {
      // Step 1: Estimate gas
      let estimation: GasEstimationResult;
      
      if (from && executorAddress && this.config.useOnChainEstimation) {
        estimation = await this.estimateGasOnChain(path, from, executorAddress);
        
        // If on-chain fails and we have fallback, estimation will use heuristic
        if (!estimation.success) {
          return {
            valid: false,
            executable: false,
            reason: estimation.reason || 'Gas estimation failed',
            warnings
          };
        }
      } else {
        estimation = await this.estimateGasHeuristic(path);
      }
      
      // Step 2: Check if estimation was successful
      if (!estimation.success) {
        return {
          valid: false,
          executable: false,
          reason: estimation.reason,
          warnings
        };
      }
      
      // Step 3: Validate profitability
      if (!estimation.profitable) {
        this.stats.blockedOpportunities++;
        return {
          valid: true,
          executable: false,
          reason: `Not profitable after gas costs. Net profit: ${estimation.netProfit}, Gas cost: ${estimation.totalGasCost}`,
          estimatedGas: estimation.estimatedGas,
          gasPrice: estimation.gasPrice,
          netProfit: estimation.netProfit,
          warnings
        };
      }
      
      // Step 4: Check gas price limits
      if (estimation.gasPrice > this.config.maxGasPrice) {
        warnings.push(`Gas price (${estimation.gasPrice}) exceeds maximum (${this.config.maxGasPrice})`);
        this.stats.blockedOpportunities++;
        return {
          valid: true,
          executable: false,
          reason: 'Gas price too high',
          estimatedGas: estimation.estimatedGas,
          gasPrice: estimation.gasPrice,
          netProfit: estimation.netProfit,
          warnings
        };
      }
      
      // Step 5: Check minimum profit threshold
      if (estimation.netProfit < this.config.minProfitAfterGas) {
        warnings.push(`Net profit (${estimation.netProfit}) below minimum threshold (${this.config.minProfitAfterGas})`);
        this.stats.blockedOpportunities++;
        return {
          valid: true,
          executable: false,
          reason: 'Net profit below minimum threshold',
          estimatedGas: estimation.estimatedGas,
          gasPrice: estimation.gasPrice,
          netProfit: estimation.netProfit,
          warnings
        };
      }
      
      // Step 6: Check gas cost percentage
      const gasCostPercentage = Number((estimation.totalGasCost * BigInt(10000)) / path.estimatedProfit) / 100;
      if (gasCostPercentage > this.config.maxGasCostPercentage) {
        warnings.push(`Gas cost (${gasCostPercentage.toFixed(2)}%) exceeds maximum percentage (${this.config.maxGasCostPercentage}%)`);
        this.stats.blockedOpportunities++;
        return {
          valid: true,
          executable: false,
          reason: `Gas cost too high as percentage of profit (${gasCostPercentage.toFixed(2)}%)`,
          estimatedGas: estimation.estimatedGas,
          gasPrice: estimation.gasPrice,
          netProfit: estimation.netProfit,
          warnings
        };
      }
      
      // All checks passed
      return {
        valid: true,
        executable: true,
        estimatedGas: estimation.estimatedGas,
        gasPrice: estimation.gasPrice,
        netProfit: estimation.netProfit,
        warnings
      };
      
    } catch (error) {
      return {
        valid: false,
        executable: false,
        reason: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        warnings
      };
    }
  }

  /**
   * Calculate detailed gas breakdown using heuristics
   */
  private calculateGasBreakdown(path: ArbitragePath): GasBreakdown {
    let baseGas = BigInt(0);
    let hopGas = BigInt(0);
    let overhead = BigInt(0);
    
    // Calculate gas for each hop
    for (const hop of path.hops) {
      const dexConfig = this.getDEXConfig(hop.dexName);
      
      baseGas += BigInt(dexConfig.baseGas);
      hopGas += BigInt(dexConfig.gasPerHop);
      overhead += BigInt(dexConfig.overhead);
    }
    
    // Account for multi-hop complexity
    if (path.hops.length > 1) {
      // Add complexity multiplier for multi-hop trades
      const avgComplexity = path.hops.reduce((sum, hop) => {
        const cfg = this.getDEXConfig(hop.dexName);
        return sum + cfg.complexity;
      }, 0) / path.hops.length;
      
      const complexityMultiplier = BigInt(Math.floor(avgComplexity * 1000)) / BigInt(1000);
      hopGas = (hopGas * complexityMultiplier) / BigInt(1000);
    }
    
    const subtotal = baseGas + hopGas + overhead;
    
    // Apply buffer
    const buffer = this.applyGasBuffer(subtotal) - subtotal;
    const total = subtotal + buffer;
    
    return {
      baseGas,
      hopGas,
      overhead,
      buffer,
      total
    };
  }

  /**
   * Get DEX-specific gas configuration
   */
  private getDEXConfig(dexName: string): DEXGasConfig {
    // Try exact match
    if (this.config.dexConfigs.has(dexName)) {
      return this.config.dexConfigs.get(dexName)!;
    }
    
    // Try partial match (e.g., "Uniswap V3" matches "Uniswap")
    for (const [name, config] of this.config.dexConfigs.entries()) {
      if (dexName.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(dexName.toLowerCase())) {
        return config;
      }
    }
    
    // Return default config
    return this.config.defaultDEXConfig;
  }

  /**
   * Apply gas buffer with bounds checking
   */
  private applyGasBuffer(gasEstimate: bigint): bigint {
    const multiplier = Math.min(this.config.bufferMultiplier, this.config.maxBufferMultiplier);
    const multiplierBigInt = BigInt(Math.floor(multiplier * 1000));
    return (gasEstimate * multiplierBigInt) / BigInt(1000);
  }

  /**
   * Get gas price with clamping to configured limits
   */
  private async getClampedGasPrice(): Promise<bigint> {
    try {
      const gasPrice = await this.oracle.getCurrentGasPrice('fast');
      const price = gasPrice.maxFeePerGas;
      
      // Clamp to configured limits
      if (price > this.config.maxGasPrice) {
        return this.config.maxGasPrice;
      }
      if (price < this.config.minGasPrice) {
        return this.config.minGasPrice;
      }
      
      return price;
    } catch (error) {
      console.error('Failed to get gas price, using fallback:', error);
      return this.config.minGasPrice;
    }
  }

  /**
   * Check if transaction is profitable after gas costs
   */
  private isProfitable(estimatedProfit: bigint, gasCost: bigint): boolean {
    const netProfit = estimatedProfit - gasCost;
    
    // Must have positive net profit
    if (netProfit <= BigInt(0)) {
      return false;
    }
    
    // Must meet minimum threshold
    if (netProfit < this.config.minProfitAfterGas) {
      return false;
    }
    
    // Must not exceed max gas cost percentage
    const gasCostPercentage = Number((gasCost * BigInt(10000)) / estimatedProfit) / 100;
    if (gasCostPercentage > this.config.maxGasCostPercentage) {
      return false;
    }
    
    return true;
  }

  /**
   * Build transaction data for on-chain estimation
   * Note: This is a simplified version - actual implementation would encode real swap data
   */
  private buildTransactionData(path: ArbitragePath): string {
    // In a real implementation, this would encode the actual swap calls
    // For now, return a placeholder that indicates multi-hop swap
    const iface = new ethers.utils.Interface([
      'function executeArbitrage(address[] tokens, address[] pools, uint256 amountIn)'
    ]);
    
    const tokens = path.hops.map(h => h.tokenIn);
    tokens.push(path.hops[path.hops.length - 1].tokenOut);
    
    const pools = path.hops.map(h => h.poolAddress);
    const amountIn = path.hops[0].amountIn;
    
    return iface.encodeFunctionData('executeArbitrage', [tokens, pools, amountIn]);
  }

  /**
   * Create a failed estimation result
   */
  private createFailedEstimation(reason: string): GasEstimationResult {
    return {
      success: false,
      estimatedGas: BigInt(0),
      gasPrice: BigInt(0),
      totalGasCost: BigInt(0),
      netProfit: BigInt(0),
      profitable: false,
      reason
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<GasEstimationConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };
  }

  /**
   * Register or update DEX gas configuration
   */
  registerDEXConfig(config: DEXGasConfig): void {
    this.config.dexConfigs.set(config.dexName, config);
  }

  /**
   * Get current statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalEstimations: 0,
      onChainEstimations: 0,
      heuristicEstimations: 0,
      failedEstimations: 0,
      blockedOpportunities: 0
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): GasEstimationConfig {
    return { ...this.config };
  }
}
