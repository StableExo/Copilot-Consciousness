/**
 * PathPruner - Intelligent path pruning for arbitrage optimization
 * 
 * Implements heuristics to filter out unprofitable paths early
 * and prioritize high-quality opportunities
 */

import { PoolEdge, ArbitragePath } from './types';

/**
 * Pool quality metrics
 */
export interface PoolQuality {
  poolAddress: string;
  liquidityScore: number; // 0-1 scale
  volumeScore: number; // 0-1 scale
  stabilityScore: number; // 0-1 scale
  overallScore: number; // 0-1 scale
}

/**
 * Pruning configuration
 */
export interface PruningConfig {
  aggressiveness: 'low' | 'medium' | 'high';
  minPoolLiquidity: bigint;
  maxPriceImpactPerHop: number; // Percentage (e.g., 2.0 = 2%)
  maxCumulativeSlippage: number; // Percentage (e.g., 5.0 = 5%)
  minPoolQualityScore: number; // 0-1 scale
}

/**
 * Path pruning statistics
 */
export interface PruningStats {
  totalEvaluated: number;
  prunedByLiquidity: number;
  prunedByPriceImpact: number;
  prunedByFees: number;
  prunedByQuality: number;
  totalPruned: number;
}

export class PathPruner {
  private config: PruningConfig;
  private poolQualityCache: Map<string, PoolQuality>;
  private historicalFailures: Map<string, number>; // pathHash -> failure count
  private stats: PruningStats;

  constructor(config: Partial<PruningConfig> = {}) {
    this.config = {
      aggressiveness: config.aggressiveness || 'medium',
      minPoolLiquidity: config.minPoolLiquidity || BigInt(100000),
      maxPriceImpactPerHop: config.maxPriceImpactPerHop || 2.0,
      maxCumulativeSlippage: config.maxCumulativeSlippage || 5.0,
      minPoolQualityScore: config.minPoolQualityScore || 0.3
    };
    this.poolQualityCache = new Map();
    this.historicalFailures = new Map();
    this.stats = this.resetStats();
  }

  /**
   * Check if a pool edge should be pruned
   */
  shouldPruneEdge(edge: PoolEdge, amountIn: bigint): boolean {
    this.stats.totalEvaluated++;

    // Liquidity filtering
    if (this.shouldPruneByLiquidity(edge)) {
      this.stats.prunedByLiquidity++;
      this.stats.totalPruned++;
      return true;
    }

    // Price impact check
    if (this.shouldPruneByPriceImpact(edge, amountIn)) {
      this.stats.prunedByPriceImpact++;
      this.stats.totalPruned++;
      return true;
    }

    // Pool quality check
    if (this.shouldPruneByQuality(edge)) {
      this.stats.prunedByQuality++;
      this.stats.totalPruned++;
      return true;
    }

    return false;
  }

  /**
   * Check if a partial path should be abandoned early
   */
  shouldPrunePath(
    hops: PoolEdge[],
    currentAmount: bigint,
    startAmount: bigint
  ): boolean {
    if (hops.length === 0) {
      return false;
    }

    // Early termination: accumulated fees exceed reasonable expectations
    const accumulatedFees = hops.reduce((sum, hop) => sum + hop.fee, 0);
    const feeThreshold = this.getFeeThreshold();
    
    if (accumulatedFees > feeThreshold) {
      this.stats.prunedByFees++;
      this.stats.totalPruned++;
      return true;
    }

    // Check if amount has dropped below profitability threshold
    const lossRatio = Number(startAmount - currentAmount) / Number(startAmount);
    if (lossRatio > 0.1) { // More than 10% loss so far
      this.stats.prunedByFees++;
      this.stats.totalPruned++;
      return true;
    }

    // Check cumulative slippage
    const cumulativeSlippage = this.estimateCumulativeSlippage(hops, startAmount);
    if (cumulativeSlippage > this.config.maxCumulativeSlippage / 100) {
      this.stats.totalPruned++;
      return true;
    }

    return false;
  }

  /**
   * Check if a complete path should be filtered out
   */
  shouldFilterPath(path: ArbitragePath): boolean {
    // Check historical performance
    const pathHash = this.hashPath(path);
    const failures = this.historicalFailures.get(pathHash) || 0;
    
    // If path has failed 3+ times, filter it out
    if (failures >= 3) {
      return true;
    }

    return false;
  }

  /**
   * Score pool quality (higher is better)
   */
  scorePoolQuality(edge: PoolEdge): PoolQuality {
    // Check cache first
    if (this.poolQualityCache.has(edge.poolAddress)) {
      return this.poolQualityCache.get(edge.poolAddress)!;
    }

    // Liquidity score (normalized, assuming max liquidity of 10M)
    const MAX_LIQUIDITY_REFERENCE = 10000000; // 10M reference for normalization
    const liquidityScore = Math.min(
      Number(edge.reserve0 + edge.reserve1) / MAX_LIQUIDITY_REFERENCE,
      1.0
    );

    // Fee score (lower fees = higher score)
    const volumeScore = 1 - Math.min(edge.fee * 100, 1.0);

    // Stability score based on reserve ratio
    const ratio = Number(edge.reserve1) / Number(edge.reserve0);
    const stabilityScore = ratio > 0.5 && ratio < 2.0 ? 1.0 : 0.5;

    // Overall score (weighted average)
    const overallScore = 
      liquidityScore * 0.5 + 
      volumeScore * 0.3 + 
      stabilityScore * 0.2;

    const quality: PoolQuality = {
      poolAddress: edge.poolAddress,
      liquidityScore,
      volumeScore,
      stabilityScore,
      overallScore
    };

    // Cache the result
    this.poolQualityCache.set(edge.poolAddress, quality);

    return quality;
  }

  /**
   * Record path failure for historical tracking
   */
  recordPathFailure(path: ArbitragePath): void {
    const pathHash = this.hashPath(path);
    const currentFailures = this.historicalFailures.get(pathHash) || 0;
    this.historicalFailures.set(pathHash, currentFailures + 1);
  }

  /**
   * Record path success (reduces failure count)
   */
  recordPathSuccess(path: ArbitragePath): void {
    const pathHash = this.hashPath(path);
    const currentFailures = this.historicalFailures.get(pathHash) || 0;
    if (currentFailures > 0) {
      this.historicalFailures.set(pathHash, currentFailures - 1);
    }
  }

  /**
   * Get pruning statistics
   */
  getStats(): PruningStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): PruningStats {
    this.stats = {
      totalEvaluated: 0,
      prunedByLiquidity: 0,
      prunedByPriceImpact: 0,
      prunedByFees: 0,
      prunedByQuality: 0,
      totalPruned: 0
    };
    return this.stats;
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.poolQualityCache.clear();
    this.historicalFailures.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PruningConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Private helper methods

  private shouldPruneByLiquidity(edge: PoolEdge): boolean {
    const totalLiquidity = edge.reserve0 + edge.reserve1;
    return totalLiquidity < this.config.minPoolLiquidity;
  }

  private shouldPruneByPriceImpact(edge: PoolEdge, amountIn: bigint): boolean {
    if (edge.reserve0 === BigInt(0)) {
      return true;
    }

    const priceImpact = (Number(amountIn) / Number(edge.reserve0)) * 100;
    return priceImpact > this.config.maxPriceImpactPerHop;
  }

  private shouldPruneByQuality(edge: PoolEdge): boolean {
    // Only apply quality filtering for medium and high aggressiveness
    if (this.config.aggressiveness === 'low') {
      return false;
    }

    const quality = this.scorePoolQuality(edge);
    return quality.overallScore < this.config.minPoolQualityScore;
  }

  private getFeeThreshold(): number {
    switch (this.config.aggressiveness) {
      case 'high':
        return 0.01; // 1% total fees
      case 'medium':
        return 0.02; // 2% total fees
      case 'low':
      default:
        return 0.05; // 5% total fees
    }
  }

  private estimateCumulativeSlippage(hops: PoolEdge[], startAmount: bigint): number {
    let cumulativeSlippage = 0;
    let currentAmount = startAmount;

    for (const hop of hops) {
      if (hop.reserve0 > BigInt(0)) {
        const impact = Number(currentAmount) / Number(hop.reserve0);
        cumulativeSlippage = cumulativeSlippage + impact + (cumulativeSlippage * impact);
        
        // Update amount for next hop (simplified)
        currentAmount = (currentAmount * BigInt(Math.floor((1 - hop.fee) * 10000))) / BigInt(10000);
      }
    }

    return cumulativeSlippage;
  }

  private hashPath(path: ArbitragePath): string {
    // Create a simple hash from the sequence of pools
    return path.hops
      .map(hop => hop.poolAddress)
      .join('-');
  }
}
