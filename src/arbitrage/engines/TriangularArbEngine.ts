/**
 * Triangular Arbitrage Engine - 3-Token Cycle Detection
 * 
 * Extracted from AxionCitadel - Operation First Light validated
 * Source: https://github.com/metalxalloy/AxionCitadel
 * 
 * 3-token cycle arbitrage detection (A → B → C → A) with multi-hop path
 * construction, amount propagation, and pair map optimization.
 */

import {
  ArbitrageOpportunity,
  ArbitrageType,
  createArbitrageOpportunity,
  PathStep,
  createPathStep,
} from '../models';
import { PoolState } from './SpatialArbEngine';

/**
 * Triangular arbitrage engine configuration
 */
export interface TriangularArbEngineConfig {
  /** Minimum profit margin in basis points (default 50 = 0.5%) */
  minProfitBps?: number;
  
  /** Maximum number of hops in path (default 3) */
  maxHops?: number;
  
  /** Supported DEX protocols */
  supportedProtocols?: string[];
}

/**
 * Engine statistics
 */
export interface TriangularArbStats {
  cyclesAnalyzed: number;
  opportunitiesFound: number;
  totalProfitPotential: number;
  avgCycleLength: number;
  avgProfitPerOpportunity: number;
  pairsInMap: number;
}

/**
 * Cycle path element (token_in, token_out, pool)
 */
type CycleElement = [string, string, PoolState];

/**
 * Triangular Arbitrage Engine
 * 
 * Features:
 * - Multi-hop path construction with amount propagation
 * - Profit margin calculation in BIPS
 * - Pair map optimization for O(1) lookups
 * - Only creates opportunities if final amount > initial
 */
export class TriangularArbEngine {
  private minProfitBps: number;
  private maxHops: number;
  private supportedProtocols: string[];
  
  // Pair map for O(1) lookups: token_pair -> list of pools
  private pairMap: Map<string, PoolState[]>;
  
  private stats: {
    cyclesAnalyzed: number;
    opportunitiesFound: number;
    totalProfitPotential: number;
    avgCycleLength: number;
  };

  constructor(config: TriangularArbEngineConfig = {}) {
    this.minProfitBps = config.minProfitBps ?? 50;  // 0.5% minimum profit
    this.maxHops = config.maxHops ?? 3;
    this.supportedProtocols = config.supportedProtocols ?? [
      'uniswap_v2',
      'uniswap_v3',
      'sushiswap',
      'camelot',
    ];

    this.pairMap = new Map();

    this.stats = {
      cyclesAnalyzed: 0,
      opportunitiesFound: 0,
      totalProfitPotential: 0,
      avgCycleLength: 0,
    };

    console.log(
      `TriangularArbEngine initialized: minProfit=${this.minProfitBps}bps, ` +
      `maxHops=${this.maxHops}`
    );
  }

  /**
   * Build pair map for efficient pool lookup
   */
  buildPairMap(pools: PoolState[]): void {
    this.pairMap.clear();

    for (const pool of pools) {
      if (!this.supportedProtocols.includes(pool.protocol)) {
        continue;
      }

      // Create bidirectional mappings
      const key1 = `${pool.token0}_${pool.token1}`;
      const key2 = `${pool.token1}_${pool.token0}`;

      if (!this.pairMap.has(key1)) {
        this.pairMap.set(key1, []);
      }
      if (!this.pairMap.has(key2)) {
        this.pairMap.set(key2, []);
      }

      this.pairMap.get(key1)!.push(pool);
      this.pairMap.get(key2)!.push(pool);
    }

    console.log(`Built pair map with ${this.pairMap.size} pairs`);
  }

  /**
   * Find triangular arbitrage opportunities starting from a token
   */
  findOpportunities(
    pools: PoolState[],
    startToken: string,
    inputAmount: number = 1.0
  ): ArbitrageOpportunity[] {
    // Build pair map if not already built
    if (this.pairMap.size === 0) {
      this.buildPairMap(pools);
    }

    const opportunities: ArbitrageOpportunity[] = [];

    // Find all 3-hop cycles starting from startToken
    const cycles = this.findCycles(startToken, this.maxHops);

    // Evaluate each cycle for profitability
    for (const cycle of cycles) {
      const opp = this.evaluateCycle(cycle, inputAmount);
      
      if (opp && opp.profitBps >= this.minProfitBps) {
        opportunities.push(opp);
        this.stats.totalProfitPotential += opp.grossProfit;
      }

      this.stats.cyclesAnalyzed += 1;
    }

    this.stats.opportunitiesFound += opportunities.length;
    
    if (opportunities.length > 0) {
      const avgLength = opportunities.reduce((sum, o) => sum + o.path.length, 0) / opportunities.length;
      this.stats.avgCycleLength = avgLength;
    }

    console.log(`Found ${opportunities.length} triangular arbitrage opportunities`);
    return opportunities;
  }

  /**
   * Find all cycles starting from a token using DFS
   */
  private findCycles(startToken: string, maxDepth: number): CycleElement[][] {
    const cycles: CycleElement[][] = [];

    const dfs = (
      currentToken: string,
      path: CycleElement[],
      visited: Set<string>
    ): void => {
      if (path.length > maxDepth) {
        return;
      }

      // If we've returned to start token and path length >= 2, found a cycle
      if (path.length >= 2 && currentToken === startToken) {
        cycles.push([...path]);
        return;
      }

      // Don't revisit tokens (except when closing the cycle)
      if (visited.has(currentToken) && currentToken !== startToken) {
        return;
      }

      // Find all pools where current_token is an input
      const connectedTokens = this.getConnectedTokens(currentToken);

      for (const nextToken of connectedTokens) {
        if (nextToken === startToken && path.length < 2) {
          continue;  // Need at least 2 hops before returning to start
        }

        // Get pools for this pair
        const pairKey = `${currentToken}_${nextToken}`;
        const pools = this.pairMap.get(pairKey) ?? [];

        for (const pool of pools) {
          // Determine which token is in/out
          const tokenIn = pool.token0 === currentToken ? pool.token0 : pool.token1;
          const tokenOut = pool.token0 === currentToken ? pool.token1 : pool.token0;

          // Add to path and continue DFS
          const newPath: CycleElement[] = [...path, [tokenIn, tokenOut, pool]];
          const newVisited = new Set(visited);
          newVisited.add(currentToken);

          dfs(nextToken, newPath, newVisited);
        }
      }
    };

    // Start DFS from startToken
    dfs(startToken, [], new Set());

    return cycles;
  }

  /**
   * Get all tokens directly connected to given token
   */
  private getConnectedTokens(token: string): Set<string> {
    const connected = new Set<string>();

    for (const [pairKey] of this.pairMap) {
      const tokens = pairKey.split('_');
      if (tokens[0] === token) {
        connected.add(tokens[1]);
      }
    }

    return connected;
  }

  /**
   * Evaluate a cycle for profitability with amount propagation
   */
  private evaluateCycle(
    cycle: CycleElement[],
    inputAmount: number
  ): ArbitrageOpportunity | null {
    if (cycle.length === 0) {
      return null;
    }

    // Propagate amounts through the cycle
    let currentAmount = inputAmount;
    const path: PathStep[] = [];

    for (let stepIdx = 0; stepIdx < cycle.length; stepIdx++) {
      const [tokenIn, tokenOut, pool] = cycle[stepIdx];
      const feeBps = pool.feeBps ?? 30;

      // Calculate output amount using constant product formula
      const reserveIn = pool.token0 === tokenIn ? pool.reserve0 : pool.reserve1;
      const reserveOut = pool.token0 === tokenIn ? pool.reserve1 : pool.reserve0;

      // Apply fee
      const amountInWithFee = currentAmount * (10000 - feeBps) / 10000;

      // Calculate output using x * y = k
      const numerator = amountInWithFee * reserveOut;
      const denominator = reserveIn + amountInWithFee;
      const amountOut = numerator / denominator;

      // Build path step
      path.push(
        createPathStep({
          step: stepIdx,
          poolAddress: pool.poolAddress,
          protocol: pool.protocol,
          tokenIn,
          tokenOut,
          amountIn: currentAmount,
          expectedOutput: amountOut,
          feeBps,
        })
      );

      // Propagate amount to next step
      currentAmount = amountOut;
    }

    // Calculate profit (final amount must be in same token as initial)
    const finalAmount = currentAmount;
    const grossProfit = finalAmount - inputAmount;

    // Only create opportunity if final > initial
    if (finalAmount <= inputAmount) {
      return null;
    }

    // Calculate profit in basis points
    const profitBps = Math.floor((grossProfit / inputAmount) * 10000);

    if (profitBps < this.minProfitBps) {
      return null;
    }

    // Extract unique tokens
    const tokenSet = new Set<string>();
    for (const step of path) {
      tokenSet.add(step.tokenIn);
    }
    const tokenAddresses = Array.from(tokenSet);

    // Create opportunity
    const opportunityId = this.generateOpportunityId();

    const opportunity = createArbitrageOpportunity({
      opportunityId,
      arbType: ArbitrageType.TRIANGULAR,
      path,
      inputAmount,
      requiresFlashLoan: true,  // Triangular arb typically needs flash loan
      flashLoanAmount: inputAmount,
      flashLoanToken: tokenAddresses[0],
      estimatedGas: 150000 * path.length,  // Estimate per swap
      metadata: {
        cycleLength: path.length,
        tokensInCycle: tokenAddresses,
        priceRatio: inputAmount > 0 ? finalAmount / inputAmount : 0,
      },
    });

    return opportunity;
  }

  /**
   * Find triangular arbitrage opportunities for all possible start tokens
   */
  findAllTriangularOpportunities(
    pools: PoolState[],
    inputAmount: number = 1.0
  ): ArbitrageOpportunity[] {
    // Build pair map
    this.buildPairMap(pools);

    // Get all unique tokens
    const allTokens = new Set<string>();
    for (const pool of pools) {
      allTokens.add(pool.token0);
      allTokens.add(pool.token1);
    }

    // Find opportunities for each start token
    const allOpportunities: ArbitrageOpportunity[] = [];

    for (const startToken of allTokens) {
      const opps = this.findOpportunities(pools, startToken, inputAmount);
      allOpportunities.push(...opps);
    }

    // Remove duplicate opportunities (same path, different start token)
    const uniqueOpportunities = this.deduplicateOpportunities(allOpportunities);

    console.log(
      `Found ${uniqueOpportunities.length} unique triangular opportunities ` +
      `from ${allTokens.size} tokens`
    );

    return uniqueOpportunities;
  }

  /**
   * Remove duplicate opportunities (same pools, different order)
   */
  private deduplicateOpportunities(
    opportunities: ArbitrageOpportunity[]
  ): ArbitrageOpportunity[] {
    const seenSignatures = new Set<string>();
    const unique: ArbitrageOpportunity[] = [];

    for (const opp of opportunities) {
      // Create signature from sorted pool addresses
      const signature = opp.poolAddresses.slice().sort().join('_');

      if (!seenSignatures.has(signature)) {
        seenSignatures.add(signature);
        unique.push(opp);
      }
    }

    return unique;
  }

  /**
   * Get engine statistics
   */
  getStatistics(): TriangularArbStats {
    return {
      cyclesAnalyzed: this.stats.cyclesAnalyzed,
      opportunitiesFound: this.stats.opportunitiesFound,
      totalProfitPotential: this.stats.totalProfitPotential,
      avgCycleLength: this.stats.avgCycleLength,
      avgProfitPerOpportunity:
        this.stats.opportunitiesFound > 0
          ? this.stats.totalProfitPotential / this.stats.opportunitiesFound
          : 0,
      pairsInMap: this.pairMap.size,
    };
  }

  /**
   * Generate unique opportunity ID
   */
  private generateOpportunityId(): string {
    return `triangular_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
