/**
 * ArbitragePatterns - Pattern detection and classification for arbitrage
 * 
 * Supports various arbitrage patterns and provides pattern-specific optimizations
 */

import { ArbitragePath, ArbitrageHop } from './types';

/**
 * Arbitrage pattern types
 */
export type ArbitragePatternType = 
  | 'circular'           // A → B → C → ... → A
  | 'triangular'         // A → B → C → A (exactly 3 hops)
  | 'multi-dex'          // Same path across different DEXs
  | 'flash-loan'         // Path that could benefit from flash loan
  | 'cross-chain'        // Arbitrage across different chains
  | 'stable-swap'        // Between stablecoins
  | 'unknown';

/**
 * Pattern detection result
 */
export interface PatternAnalysis {
  type: ArbitragePatternType;
  confidence: number; // 0-1 scale
  characteristics: string[];
  optimizationHints: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * Pattern-specific metrics
 */
export interface PatternMetrics {
  pattern: ArbitragePatternType;
  count: number;
  avgProfit: bigint;
  successRate: number;
  avgGasCost: bigint;
}

export class ArbitragePatterns {
  private patternMetrics: Map<ArbitragePatternType, PatternMetrics>;
  private flashLoanThreshold: bigint; // Configurable flash loan threshold

  constructor(flashLoanThreshold: bigint = BigInt('10000000000000000000')) { // Default 10 ETH
    this.patternMetrics = new Map();
    this.flashLoanThreshold = flashLoanThreshold;
    this.initializeMetrics();
  }

  /**
   * Set flash loan threshold for pattern detection
   */
  setFlashLoanThreshold(threshold: bigint): void {
    this.flashLoanThreshold = threshold;
  }

  /**
   * Detect and classify arbitrage pattern
   */
  detectPattern(path: ArbitragePath): PatternAnalysis {
    const hopCount = path.hops.length;
    
    // Check for triangular arbitrage (exactly 3 hops)
    if (this.isTriangular(path)) {
      return this.createAnalysis('triangular', 1.0, [
        'Exactly 3 token swaps',
        'Returns to starting token',
        'Classic triangular arbitrage pattern'
      ], [
        'Low gas cost due to few hops',
        'Quick execution time',
        'Lower slippage risk'
      ], 'low');
    }

    // Check for flash loan pattern
    if (this.isFlashLoanCandidate(path)) {
      return this.createAnalysis('flash-loan', 0.8, [
        'High capital requirement',
        'Profitable without upfront capital',
        'Single transaction execution'
      ], [
        'Consider using flash loan to maximize profit',
        'Factor in flash loan fees',
        'Ensure atomic execution'
      ], 'medium');
    }

    // Check for multi-DEX pattern
    if (this.isMultiDex(path)) {
      return this.createAnalysis('multi-dex', 0.9, [
        'Uses multiple DEXs',
        'Price discrepancy across exchanges',
        'Requires cross-DEX execution'
      ], [
        'Monitor DEX-specific slippage',
        'Consider gas costs of multiple DEX interactions',
        'Check for MEV risks'
      ], 'medium');
    }

    // Check for stable swap pattern
    if (this.isStableSwap(path)) {
      return this.createAnalysis('stable-swap', 0.85, [
        'Arbitrage between similar-value assets',
        'Low slippage expected',
        'High volume potential'
      ], [
        'Use stable swap optimized AMMs (Curve)',
        'Lower slippage tolerance acceptable',
        'Watch for de-pegging events'
      ], 'low');
    }

    // Default to circular pattern
    if (this.isCircular(path)) {
      return this.createAnalysis('circular', 0.95, [
        `${hopCount} token swaps`,
        'Returns to starting token',
        'Multi-hop arbitrage'
      ], [
        'Monitor cumulative slippage',
        'Consider breaking into smaller trades',
        'Optimize gas for multi-hop execution'
      ], hopCount > 4 ? 'high' : 'medium');
    }

    return this.createAnalysis('unknown', 0.5, [
      'Pattern not recognized'
    ], [
      'Manual review recommended'
    ], 'high');
  }

  /**
   * Get optimization strategy for pattern
   */
  getOptimizationStrategy(pattern: ArbitragePatternType): string[] {
    const strategies: Record<ArbitragePatternType, string[]> = {
      'triangular': [
        'Use single transaction execution',
        'Minimize gas by batching swaps',
        'Monitor slippage on all three legs'
      ],
      'circular': [
        'Break long paths into segments if possible',
        'Use path caching for recurring patterns',
        'Consider intermediate profit-taking'
      ],
      'multi-dex': [
        'Check for sandwich attack vulnerability',
        'Use private transaction pools',
        'Optimize routing across DEXs'
      ],
      'flash-loan': [
        'Calculate flash loan fees in profitability',
        'Ensure atomic execution',
        'Have fallback strategy if flash loan fails'
      ],
      'cross-chain': [
        'Account for bridge fees and delays',
        'Monitor cross-chain oracle reliability',
        'Consider timing risks'
      ],
      'stable-swap': [
        'Use Curve or similar stable swap AMMs',
        'Take advantage of low slippage',
        'Monitor for de-pegging events'
      ],
      'unknown': [
        'Perform detailed manual analysis',
        'Start with small test trades',
        'Monitor closely for unexpected behavior'
      ]
    };

    return strategies[pattern] || strategies['unknown'];
  }

  /**
   * Record pattern execution result
   */
  recordPatternResult(
    pattern: ArbitragePatternType,
    profit: bigint,
    gasCost: bigint,
    successful: boolean
  ): void {
    let metrics = this.patternMetrics.get(pattern);
    
    if (!metrics) {
      metrics = {
        pattern,
        count: 0,
        avgProfit: BigInt(0),
        successRate: 0,
        avgGasCost: BigInt(0)
      };
      this.patternMetrics.set(pattern, metrics);
    }

    const prevCount = metrics.count;
    metrics.count++;

    // Update rolling averages
    if (successful) {
      metrics.avgProfit = (metrics.avgProfit * BigInt(prevCount) + profit) / BigInt(metrics.count);
      metrics.avgGasCost = (metrics.avgGasCost * BigInt(prevCount) + gasCost) / BigInt(metrics.count);
    }

    metrics.successRate = ((metrics.successRate * prevCount) + (successful ? 1 : 0)) / metrics.count;
  }

  /**
   * Get metrics for a specific pattern
   */
  getPatternMetrics(pattern: ArbitragePatternType): PatternMetrics | null {
    return this.patternMetrics.get(pattern) || null;
  }

  /**
   * Get all pattern metrics
   */
  getAllMetrics(): PatternMetrics[] {
    return Array.from(this.patternMetrics.values());
  }

  /**
   * Get most profitable pattern type
   */
  getMostProfitablePattern(): ArbitragePatternType | null {
    let maxProfit = BigInt(0);
    let bestPattern: ArbitragePatternType | null = null;

    for (const [pattern, metrics] of this.patternMetrics.entries()) {
      if (metrics.avgProfit > maxProfit && metrics.count > 5) {
        maxProfit = metrics.avgProfit;
        bestPattern = pattern;
      }
    }

    return bestPattern;
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.patternMetrics.clear();
    this.initializeMetrics();
  }

  // Private pattern detection methods

  private isTriangular(path: ArbitragePath): boolean {
    return path.hops.length === 3 && 
           path.startToken === path.endToken;
  }

  private isCircular(path: ArbitragePath): boolean {
    return path.startToken === path.endToken;
  }

  private isMultiDex(path: ArbitragePath): boolean {
    const dexes = new Set(path.hops.map(hop => hop.dexName));
    return dexes.size > 1;
  }

  private isFlashLoanCandidate(path: ArbitragePath): boolean {
    // Flash loan is beneficial if:
    // 1. Required capital is significant (> threshold)
    // 2. Profit margin is good enough to cover flash loan fees
    const startAmount = path.hops[0].amountIn;
    
    if (startAmount < this.flashLoanThreshold) {
      return false;
    }

    // Flash loan fee is typically 0.09% (9 basis points)
    const flashLoanFee = (startAmount * BigInt(9)) / BigInt(10000);
    
    return path.netProfit > flashLoanFee * BigInt(2); // 2x to make it worthwhile
  }

  private isStableSwap(path: ArbitragePath): boolean {
    // Check if all hops involve stablecoin-like tokens
    // This is a simplified check - in production, would check against
    // a list of known stablecoins
    const stablePatterns = ['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'FRAX'];
    
    // Check if token symbols contain stable patterns (would need token metadata)
    // For now, check if fees are very low (typical for stable swaps)
    const avgFee = path.totalFees / path.hops.length;
    return avgFee < 0.001; // Less than 0.1% avg fee suggests stable swap
  }

  private createAnalysis(
    type: ArbitragePatternType,
    confidence: number,
    characteristics: string[],
    hints: string[],
    risk: 'low' | 'medium' | 'high'
  ): PatternAnalysis {
    return {
      type,
      confidence,
      characteristics,
      optimizationHints: hints,
      riskLevel: risk
    };
  }

  private initializeMetrics(): void {
    const patternTypes: ArbitragePatternType[] = [
      'circular',
      'triangular',
      'multi-dex',
      'flash-loan',
      'cross-chain',
      'stable-swap',
      'unknown'
    ];

    for (const pattern of patternTypes) {
      this.patternMetrics.set(pattern, {
        pattern,
        count: 0,
        avgProfit: BigInt(0),
        successRate: 0,
        avgGasCost: BigInt(0)
      });
    }
  }
}
