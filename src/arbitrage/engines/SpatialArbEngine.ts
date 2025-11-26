/**
 * Spatial Arbitrage Engine - Cross-DEX Price Differential Detection
 *
 * Extracted from AxionCitadel - Operation First Light validated
 * Source: https://github.com/metalxalloy/AxionCitadel
 *
 * Cross-DEX arbitrage detection for same token pairs with price differential
 * calculations, minimum profit filtering, and multi-DEX pool grouping.
 */

import {
  ArbitrageOpportunity,
  ArbitrageType,
  OpportunityStatus,
  createArbitrageOpportunity,
  PathStep,
  createPathStep,
} from '../models';

/**
 * State of a liquidity pool
 */
export interface PoolState {
  /** Pool contract address */
  poolAddress: string;

  /** First token address */
  token0: string;

  /** Second token address */
  token1: string;

  /** Reserve of token0 */
  reserve0: number;

  /** Reserve of token1 */
  reserve1: number;

  /** DEX protocol name */
  protocol: string;

  /** Pool fee in basis points (default 0.3%) */
  feeBps?: number;
}

/**
 * Spatial arbitrage engine configuration
 */
export interface SpatialArbEngineConfig {
  /** Minimum profit margin in basis points (default 50 = 0.5%) */
  minProfitBps?: number;

  /** Minimum pool liquidity in USD (default 100 for Base network) */
  minLiquidityUsd?: number;

  /** Supported DEX protocols */
  supportedProtocols?: string[];
}

/**
 * Engine statistics
 */
export interface SpatialArbStats {
  poolsAnalyzed: number;
  opportunitiesFound: number;
  totalProfitPotential: number;
  avgProfitPerOpportunity: number;
}

/**
 * Spatial Arbitrage Engine
 *
 * Features:
 * - Price differential calculations across DEXs
 * - 2-step path construction (buy low DEX A, sell high DEX B)
 * - Minimum profit margin filtering (BIPS)
 * - Multi-DEX pool grouping by token pair
 */
export class SpatialArbEngine {
  private minProfitBps: number;
  private minLiquidityUsd: number;
  private supportedProtocols: string[];

  private stats: {
    poolsAnalyzed: number;
    opportunitiesFound: number;
    totalProfitPotential: number;
  };

  constructor(config: SpatialArbEngineConfig = {}) {
    this.minProfitBps = config.minProfitBps ?? 50; // 0.5% minimum profit
    this.minLiquidityUsd = config.minLiquidityUsd ?? 100; // Lower for Base network
    this.supportedProtocols = config.supportedProtocols ?? [
      'uniswap_v2',
      'uniswap_v3',
      'sushiswap',
      'camelot',
    ];

    this.stats = {
      poolsAnalyzed: 0,
      opportunitiesFound: 0,
      totalProfitPotential: 0,
    };

    console.log(
      `SpatialArbEngine initialized: minProfit=${this.minProfitBps}bps, ` +
        `minLiquidity=$${this.minLiquidityUsd}`
    );
  }

  /**
   * Find spatial arbitrage opportunities across pools
   */
  findOpportunities(pools: PoolState[], inputAmount: number = 1.0): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];

    // Group pools by token pair
    const poolGroups = this.groupPoolsByPair(pools);

    // Analyze each group for price differentials
    for (const [pairKey, pairPools] of Object.entries(poolGroups)) {
      if (pairPools.length < 2) {
        continue; // Need at least 2 pools for spatial arb
      }

      // Find best buy and sell prices
      const arbs = this.findPairArbitrage(pairPools, inputAmount);
      opportunities.push(...arbs);

      this.stats.poolsAnalyzed += pairPools.length;
    }

    this.stats.opportunitiesFound += opportunities.length;

    console.log(`Found ${opportunities.length} spatial arbitrage opportunities`);
    return opportunities;
  }

  /**
   * Group pools by token pair (order-independent)
   */
  private groupPoolsByPair(pools: PoolState[]): Record<string, PoolState[]> {
    const groups: Record<string, PoolState[]> = {};

    for (const pool of pools) {
      // Filter by protocol
      if (!this.supportedProtocols.includes(pool.protocol)) {
        continue;
      }

      // Create order-independent pair key
      const tokens = [pool.token0, pool.token1].sort();
      const pairKey = `${tokens[0]}_${tokens[1]}`;

      if (!groups[pairKey]) {
        groups[pairKey] = [];
      }

      groups[pairKey].push(pool);
    }

    return groups;
  }

  /**
   * Find arbitrage opportunities within a token pair group
   */
  private findPairArbitrage(pools: PoolState[], inputAmount: number): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];

    // Compare all pool pairs
    for (let i = 0; i < pools.length; i++) {
      for (let j = i + 1; j < pools.length; j++) {
        const poolBuy = pools[i];
        const poolSell = pools[j];

        // Try both directions (token0->token1 and token1->token0)
        for (const direction of [0, 1]) {
          const opp = this.calculateSpatialArb(poolBuy, poolSell, inputAmount, direction);

          if (opp && opp.profitBps >= this.minProfitBps) {
            opportunities.push(opp);
          }
        }
      }
    }

    return opportunities;
  }

  /**
   * Calculate spatial arbitrage for specific pool pair and direction
   */
  private calculateSpatialArb(
    poolBuy: PoolState,
    poolSell: PoolState,
    inputAmount: number,
    direction: number // 0: token0->token1, 1: token1->token0
  ): ArbitrageOpportunity | null {
    const feeBpsBuy = poolBuy.feeBps ?? 30;
    const feeBpsSell = poolSell.feeBps ?? 30;

    // Determine tokens based on direction
    let tokenIn: string;
    let tokenOut: string;
    let reserveInBuy: number;
    let reserveOutBuy: number;
    let reserveInSell: number;
    let reserveOutSell: number;

    if (direction === 0) {
      tokenIn = poolBuy.token0;
      tokenOut = poolBuy.token1;
      reserveInBuy = poolBuy.reserve0;
      reserveOutBuy = poolBuy.reserve1;
      reserveInSell = poolSell.reserve1;
      reserveOutSell = poolSell.reserve0;
    } else {
      tokenIn = poolBuy.token1;
      tokenOut = poolBuy.token0;
      reserveInBuy = poolBuy.reserve1;
      reserveOutBuy = poolBuy.reserve0;
      reserveInSell = poolSell.reserve0;
      reserveOutSell = poolSell.reserve1;
    }

    // Calculate buy output using constant product formula (x * y = k)
    const amountInWithFee = (inputAmount * (10000 - feeBpsBuy)) / 10000;
    const numerator = amountInWithFee * reserveOutBuy;
    const denominator = reserveInBuy + amountInWithFee;
    const amountOutBuy = numerator / denominator;

    // Calculate sell output
    const sellInWithFee = (amountOutBuy * (10000 - feeBpsSell)) / 10000;
    const sellNumerator = sellInWithFee * reserveOutSell;
    const sellDenominator = reserveInSell + sellInWithFee;
    const finalAmount = sellNumerator / sellDenominator;

    // Calculate profit
    const grossProfit = finalAmount - inputAmount;
    const profitBps = inputAmount > 0 ? Math.floor((grossProfit / inputAmount) * 10000) : 0;

    // Only return if profitable
    if (profitBps < this.minProfitBps) {
      return null;
    }

    // Build path
    const path: PathStep[] = [
      createPathStep({
        step: 0,
        poolAddress: poolBuy.poolAddress,
        protocol: poolBuy.protocol,
        tokenIn,
        tokenOut,
        amountIn: inputAmount,
        expectedOutput: amountOutBuy,
        feeBps: feeBpsBuy,
      }),
      createPathStep({
        step: 1,
        poolAddress: poolSell.poolAddress,
        protocol: poolSell.protocol,
        tokenIn: tokenOut,
        tokenOut: tokenIn,
        amountIn: amountOutBuy,
        expectedOutput: finalAmount,
        feeBps: feeBpsSell,
      }),
    ];

    // Create opportunity
    const opportunityId = this.generateOpportunityId();

    const opportunity = createArbitrageOpportunity({
      opportunityId,
      arbType: ArbitrageType.SPATIAL,
      path,
      inputAmount,
      requiresFlashLoan: false, // Spatial arb can use own capital
      estimatedGas: 250000, // Estimated for 2-step swap
      metadata: {
        buyPool: poolBuy.poolAddress,
        sellPool: poolSell.poolAddress,
        direction,
        buyPrice: inputAmount > 0 ? amountOutBuy / inputAmount : 0,
        sellPrice: amountOutBuy > 0 ? finalAmount / amountOutBuy : 0,
      },
    });

    // Track profit potential
    this.stats.totalProfitPotential += grossProfit;

    return opportunity;
  }

  /**
   * Calculate price impact of a trade
   */
  calculatePriceImpact(pool: PoolState, amountIn: number, direction: number): number {
    const feeBps = pool.feeBps ?? 30;
    const reserveIn = direction === 0 ? pool.reserve0 : pool.reserve1;
    const reserveOut = direction === 0 ? pool.reserve1 : pool.reserve0;

    // Current price
    const currentPrice = reserveIn > 0 ? reserveOut / reserveIn : 0;

    // Execute trade calculation
    const amountInWithFee = (amountIn * (10000 - feeBps)) / 10000;
    const numerator = amountInWithFee * reserveOut;
    const denominator = reserveIn + amountInWithFee;
    const amountOut = numerator / denominator;

    // New price
    const newPrice = amountIn > 0 ? amountOut / amountIn : 0;

    // Price impact
    if (currentPrice > 0) {
      return Math.abs((newPrice - currentPrice) / currentPrice) * 100;
    }

    return 0;
  }

  /**
   * Filter opportunities by minimum liquidity requirement
   */
  filterByLiquidity(
    opportunities: ArbitrageOpportunity[],
    tokenPrices: Record<string, number>
  ): ArbitrageOpportunity[] {
    const filtered: ArbitrageOpportunity[] = [];

    for (const opp of opportunities) {
      // Check if all pools meet liquidity requirement
      let meetsRequirement = true;

      for (const step of opp.path) {
        // Calculate pool liquidity in USD (simplified)
        const price = tokenPrices[step.tokenIn] ?? 0;
        const liquidityUsd = step.amountIn * price * 2; // Rough estimate

        if (liquidityUsd < this.minLiquidityUsd) {
          meetsRequirement = false;
          break;
        }
      }

      if (meetsRequirement) {
        filtered.push(opp);
      }
    }

    return filtered;
  }

  /**
   * Get engine statistics
   */
  getStatistics(): SpatialArbStats {
    return {
      poolsAnalyzed: this.stats.poolsAnalyzed,
      opportunitiesFound: this.stats.opportunitiesFound,
      totalProfitPotential: this.stats.totalProfitPotential,
      avgProfitPerOpportunity:
        this.stats.opportunitiesFound > 0
          ? this.stats.totalProfitPotential / this.stats.opportunitiesFound
          : 0,
    };
  }

  /**
   * Generate unique opportunity ID
   */
  private generateOpportunityId(): string {
    return `spatial_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
