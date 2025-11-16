/**
 * MultiDexPathBuilder - Build Multi-DEX Arbitrage Paths
 * 
 * Builds optimal arbitrage paths across multiple DEXs (Uniswap V3, Aerodrome, SushiSwap)
 * for both spatial (cross-DEX) and triangular (multi-hop) arbitrage strategies.
 * 
 * Integrates with:
 * - SpatialArbEngine for cross-DEX price differentials
 * - TriangularArbEngine for multi-hop cycles
 * - FlashLoanExecutor for execution
 */

import { ethers } from 'ethers';
import { SpatialArbEngine, PoolState } from '../arbitrage/engines/SpatialArbEngine';
import { TriangularArbEngine } from '../arbitrage/engines/TriangularArbEngine';
import { ArbitrageOpportunity, ArbitrageType } from '../arbitrage/models/ArbitrageOpportunity';
import { SwapStep } from './FlashLoanExecutor';

/**
 * Pool information for path building
 */
export interface PoolInfo {
  /** Pool address */
  address: string;
  /** Token 0 address */
  token0: string;
  /** Token 1 address */
  token1: string;
  /** Reserve of token 0 */
  reserve0: string;
  /** Reserve of token 1 */
  reserve1: string;
  /** DEX protocol */
  dex: string;
  /** Fee tier */
  fee: number;
}

/**
 * Built arbitrage path with swap steps
 */
export interface ArbitragePath {
  /** Type of arbitrage */
  type: 'spatial' | 'triangular';
  /** Token to borrow */
  borrowToken: string;
  /** Amount to borrow */
  borrowAmount: string;
  /** Swap steps to execute */
  swapSteps: SwapStep[];
  /** Expected gross profit (before fees) */
  grossProfit: number;
  /** Expected net profit (after all fees) */
  netProfit: number;
  /** MEV risk score */
  mevRisk: number;
  /** Gas estimate */
  gasEstimate: bigint;
}

/**
 * MultiDexPathBuilder configuration
 */
export interface MultiDexPathBuilderConfig {
  /** Provider for fetching pool data */
  provider: ethers.providers.Provider;
  /** Minimum profit threshold in ETH */
  minProfitThresholdEth: number;
  /** Maximum slippage in basis points */
  maxSlippageBps: number;
  /** Supported DEXs */
  supportedDexs: string[];
}

/**
 * DEX type mappings for FlashSwapV2
 */
const DEX_TYPE_MAP: Record<string, number> = {
  uniswap_v3: 0,
  sushiswap: 1,
  dodo: 2,
  aerodrome: 0, // Aerodrome uses Uniswap V3-style interface
};

/**
 * MultiDexPathBuilder
 * 
 * Builds multi-DEX arbitrage paths using spatial and triangular engines.
 * Converts opportunities into executable swap steps for FlashLoanExecutor.
 */
export class MultiDexPathBuilder {
  private config: MultiDexPathBuilderConfig;
  private spatialEngine: SpatialArbEngine;
  private triangularEngine: TriangularArbEngine;

  constructor(config: MultiDexPathBuilderConfig) {
    this.config = config;

    // Initialize arbitrage engines
    this.spatialEngine = new SpatialArbEngine({
      minProfitBps: config.minProfitThresholdEth * 10000, // Convert ETH to BIPS
      minLiquidityUsd: 10000,
      supportedProtocols: config.supportedDexs,
    });

    this.triangularEngine = new TriangularArbEngine({
      minProfitBps: config.minProfitThresholdEth * 10000,
      maxHops: 4,
      supportedProtocols: config.supportedDexs,
    });
  }

  /**
   * Find arbitrage opportunities from pool data
   * 
   * @param pools Available pool states
   * @returns Array of arbitrage opportunities
   */
  async findOpportunities(pools: PoolInfo[]): Promise<ArbitrageOpportunity[]> {
    console.log(`[MultiDexPathBuilder] Analyzing ${pools.length} pools for opportunities...`);

    // Convert PoolInfo to PoolState for engines
    const poolStates: PoolState[] = pools.map((pool) => ({
      poolAddress: pool.address,
      token0: pool.token0,
      token1: pool.token1,
      reserve0: parseFloat(pool.reserve0),
      reserve1: parseFloat(pool.reserve1),
      protocol: pool.dex,
      feeBps: pool.fee / 100, // Convert fee tier to basis points
    }));

    // Find spatial arbitrage opportunities (cross-DEX)
    const spatialOpportunities = this.spatialEngine.findOpportunities(poolStates);
    console.log(`[MultiDexPathBuilder] Found ${spatialOpportunities.length} spatial opportunities`);

    // Find triangular arbitrage opportunities (multi-hop)
    // Use WETH as start token for triangular arb (common base token on Base)
    const WETH_ADDRESS = '0x4200000000000000000000000000000000000006'; // Base WETH
    const triangularOpportunities = this.triangularEngine.findOpportunities(poolStates, WETH_ADDRESS, 1.0);
    console.log(`[MultiDexPathBuilder] Found ${triangularOpportunities.length} triangular opportunities`);

    // Combine and return all opportunities
    return [...spatialOpportunities, ...triangularOpportunities];
  }

  /**
   * Build executable path from an arbitrage opportunity
   * 
   * @param opportunity Detected arbitrage opportunity
   * @param pools Pool information map
   * @returns Executable arbitrage path
   */
  buildPath(opportunity: ArbitrageOpportunity, pools: Map<string, PoolInfo>): ArbitragePath | null {
    try {
      console.log(`[MultiDexPathBuilder] Building path for ${opportunity.arbType} opportunity...`);

      // Extract path steps from opportunity
      const swapSteps: SwapStep[] = [];
      let borrowToken: string = '';
      let borrowAmount: string = '0';

      // Process each step in the opportunity path
      for (let i = 0; i < opportunity.path.length; i++) {
        const step = opportunity.path[i];
        const poolInfo = pools.get(step.poolAddress);

        if (!poolInfo) {
          console.warn(`[MultiDexPathBuilder] Pool not found: ${step.poolAddress}`);
          return null;
        }

        // First step determines borrow token and amount
        if (i === 0) {
          borrowToken = step.tokenIn;
          borrowAmount = step.amountIn.toString();
        }

        // Build swap step
        swapSteps.push({
          pool: step.poolAddress,
          tokenIn: step.tokenIn,
          tokenOut: step.tokenOut,
          fee: poolInfo.fee,
          minOut: this.calculateMinOut(BigInt(step.expectedOutput), this.config.maxSlippageBps),
          dexType: DEX_TYPE_MAP[poolInfo.dex] ?? 0,
        });
      }

      // Validate path ends with same token as start (for flashloan repayment)
      const lastStep = opportunity.path[opportunity.path.length - 1];
      if (lastStep.tokenOut !== borrowToken) {
        console.warn('[MultiDexPathBuilder] Path does not return to borrow token');
        return null;
      }

      // Calculate expected profit
      const grossProfit = opportunity.grossProfit;
      const netProfit = opportunity.netProfit || 0;

      // Estimate gas based on number of swaps
      const gasEstimate = this.estimateGas(swapSteps.length);

      return {
        type: opportunity.arbType === ArbitrageType.SPATIAL ? 'spatial' : 'triangular',
        borrowToken,
        borrowAmount,
        swapSteps,
        grossProfit,
        netProfit,
        mevRisk: opportunity.riskScore || 0,
        gasEstimate,
      };
    } catch (error: any) {
      console.error('[MultiDexPathBuilder] Error building path:', error.message);
      return null;
    }
  }

  /**
   * Calculate minimum output amount with slippage protection
   * 
   * @param expectedAmount Expected output amount
   * @param slippageBps Slippage in basis points
   * @returns Minimum acceptable output amount
   */
  private calculateMinOut(expectedAmount: bigint, slippageBps: number): string {
    const slippageFactor = BigInt(10000 - slippageBps);
    const minOut = (expectedAmount * slippageFactor) / BigInt(10000);
    return minOut.toString();
  }

  /**
   * Estimate gas for execution based on path complexity
   * 
   * @param numSwaps Number of swap steps
   * @returns Estimated gas
   */
  private estimateGas(numSwaps: number): bigint {
    // Base gas for flashloan + callback
    const baseGas = 200000;
    // Gas per swap step (varies by DEX)
    const gasPerSwap = 120000;
    // Safety margin
    const safetyMargin = 1.2;

    const estimatedGas = Math.floor((baseGas + numSwaps * gasPerSwap) * safetyMargin);
    return BigInt(estimatedGas);
  }

  /**
   * Get spatial arbitrage engine stats
   */
  getSpatialStats() {
    // Return basic stats since getStats() may not be available
    return {
      engineType: 'spatial',
      minProfitBps: this.spatialEngine['minProfitBps'],
    };
  }

  /**
   * Get triangular arbitrage engine stats
   */
  getTriangularStats() {
    // Return basic stats since getStats() may not be available
    return {
      engineType: 'triangular',
      minProfitBps: this.triangularEngine['minProfitBps'],
    };
  }
}
