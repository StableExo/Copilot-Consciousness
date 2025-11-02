/**
 * EnhancedSlippageCalculator - Accurate slippage modeling for multi-hop arbitrage
 * 
 * Uses reserve-based price impact calculations and constant product formula
 * for accurate output predictions across different AMM types
 */

import { ArbitrageHop, PoolEdge } from './types';

/**
 * AMM curve types
 */
export type AMMCurveType = 'constant-product' | 'concentrated-liquidity' | 'stable-swap';

/**
 * Price impact result
 */
export interface PriceImpact {
  percentage: number; // Price impact as percentage
  amountOut: bigint; // Actual output amount
  effectivePrice: number; // Effective exchange rate
  slippageCost: bigint; // Amount lost to slippage
}

/**
 * Slippage calculation result for entire path
 */
export interface SlippageResult {
  hopImpacts: PriceImpact[];
  cumulativeSlippage: number; // Total slippage percentage
  totalSlippageCost: bigint; // Total amount lost to slippage
  finalAmount: bigint; // Expected final amount
  priceImpactWarning: boolean; // True if any hop exceeds safe threshold
}

/**
 * Configuration for slippage calculations
 */
export interface SlippageConfig {
  defaultCurveType: AMMCurveType;
  warningThreshold: number; // Price impact % that triggers warning
  maxSafeImpact: number; // Maximum safe price impact %
}

export class EnhancedSlippageCalculator {
  private config: SlippageConfig;
  private curveTypes: Map<string, AMMCurveType>; // poolAddress -> curve type

  constructor(config: Partial<SlippageConfig> = {}) {
    this.config = {
      defaultCurveType: config.defaultCurveType || 'constant-product',
      warningThreshold: config.warningThreshold || 1.0, // 1% warning
      maxSafeImpact: config.maxSafeImpact || 3.0 // 3% max safe
    };
    this.curveTypes = new Map();
  }

  /**
   * Calculate accurate price impact for a single hop
   */
  calculatePriceImpact(
    amountIn: bigint,
    reserveIn: bigint,
    reserveOut: bigint,
    fee: number,
    poolAddress?: string
  ): PriceImpact {
    const curveType = poolAddress 
      ? this.curveTypes.get(poolAddress) || this.config.defaultCurveType
      : this.config.defaultCurveType;

    switch (curveType) {
      case 'concentrated-liquidity':
        return this.calculateConcentratedLiquidityImpact(amountIn, reserveIn, reserveOut, fee);
      case 'stable-swap':
        return this.calculateStableSwapImpact(amountIn, reserveIn, reserveOut, fee);
      case 'constant-product':
      default:
        return this.calculateConstantProductImpact(amountIn, reserveIn, reserveOut, fee);
    }
  }

  /**
   * Calculate slippage for entire arbitrage path
   */
  calculatePathSlippage(hops: ArbitrageHop[]): SlippageResult {
    const hopImpacts: PriceImpact[] = [];
    let currentAmount = hops[0].amountIn;
    let totalSlippageCost = BigInt(0);
    let cumulativeSlippage = 0;
    let priceImpactWarning = false;

    for (const hop of hops) {
      const impact = this.calculatePriceImpact(
        currentAmount,
        hop.reserve0 || BigInt(0),
        hop.reserve1 || BigInt(0),
        hop.fee,
        hop.poolAddress
      );

      hopImpacts.push(impact);
      
      // Check for warning threshold
      if (impact.percentage > this.config.warningThreshold) {
        priceImpactWarning = true;
      }

      // Accumulate slippage
      totalSlippageCost += impact.slippageCost;
      
      // Compound slippage across hops
      cumulativeSlippage = cumulativeSlippage + impact.percentage + 
        (cumulativeSlippage * impact.percentage / 100);

      // Update amount for next hop
      currentAmount = impact.amountOut;
    }

    return {
      hopImpacts,
      cumulativeSlippage,
      totalSlippageCost,
      finalAmount: currentAmount,
      priceImpactWarning
    };
  }

  /**
   * Calculate optimal trade size to minimize slippage
   */
  calculateOptimalTradeSize(
    reserveIn: bigint,
    reserveOut: bigint,
    fee: number,
    maxImpact: number = 1.0
  ): bigint {
    // For constant product: optimal size is roughly reserve * maxImpact
    const targetImpact = Math.min(maxImpact / 100, 0.05); // Cap at 5%
    return BigInt(Math.floor(Number(reserveIn) * targetImpact));
  }

  /**
   * Check if trade size is safe for given pool
   */
  isTradeSizeSafe(
    amountIn: bigint,
    reserveIn: bigint,
    maxImpact: number = this.config.maxSafeImpact
  ): boolean {
    if (reserveIn === BigInt(0)) {
      return false;
    }

    const impact = (Number(amountIn) / Number(reserveIn)) * 100;
    return impact <= maxImpact;
  }

  /**
   * Register AMM curve type for a specific pool
   */
  registerPoolCurveType(poolAddress: string, curveType: AMMCurveType): void {
    this.curveTypes.set(poolAddress, curveType);
  }

  /**
   * Get warnings for a path
   */
  getPathWarnings(result: SlippageResult): string[] {
    const warnings: string[] = [];

    if (result.priceImpactWarning) {
      warnings.push(`High price impact detected in one or more hops`);
    }

    if (result.cumulativeSlippage > this.config.maxSafeImpact) {
      warnings.push(`Cumulative slippage (${result.cumulativeSlippage.toFixed(2)}%) exceeds safe threshold`);
    }

    result.hopImpacts.forEach((impact, index) => {
      if (impact.percentage > this.config.maxSafeImpact) {
        warnings.push(`Hop ${index + 1}: Excessive price impact (${impact.percentage.toFixed(2)}%)`);
      }
    });

    return warnings;
  }

  // Private calculation methods for different AMM types

  /**
   * Constant Product (x * y = k) - Uniswap V2, SushiSwap
   */
  private calculateConstantProductImpact(
    amountIn: bigint,
    reserveIn: bigint,
    reserveOut: bigint,
    fee: number
  ): PriceImpact {
    if (reserveIn === BigInt(0) || reserveOut === BigInt(0)) {
      return {
        percentage: 100,
        amountOut: BigInt(0),
        effectivePrice: 0,
        slippageCost: amountIn
      };
    }

    // Calculate price impact percentage
    const percentage = (Number(amountIn) / Number(reserveIn)) * 100;

    // Apply fee
    const feeMultiplier = BigInt(Math.floor((1 - fee) * 10000));
    const amountInWithFee = (amountIn * feeMultiplier) / BigInt(10000);

    // Calculate actual output: amountOut = (amountIn * reserveOut) / (reserveIn + amountIn)
    const numerator = amountInWithFee * reserveOut;
    const denominator = reserveIn + amountInWithFee;
    const amountOut = numerator / denominator;

    // Calculate expected output without slippage (at current rate)
    const spotRate = Number(reserveOut) / Number(reserveIn);
    const expectedOut = BigInt(Math.floor(Number(amountInWithFee) * spotRate));
    
    // Slippage cost is the difference
    const slippageCost = expectedOut > amountOut ? expectedOut - amountOut : BigInt(0);

    // Effective price
    const effectivePrice = amountOut > BigInt(0) 
      ? Number(amountOut) / Number(amountInWithFee)
      : 0;

    return {
      percentage,
      amountOut,
      effectivePrice,
      slippageCost
    };
  }

  /**
   * Concentrated Liquidity (Uniswap V3)
   * Simplified model - in production would need tick data
   */
  private calculateConcentratedLiquidityImpact(
    amountIn: bigint,
    reserveIn: bigint,
    reserveOut: bigint,
    fee: number
  ): PriceImpact {
    // For concentrated liquidity, impact depends on position ranges
    // This is a simplified approximation using constant product
    // Real implementation would require tick math and liquidity distribution
    
    const baseImpact = this.calculateConstantProductImpact(
      amountIn,
      reserveIn,
      reserveOut,
      fee
    );

    // Concentrated liquidity typically has less slippage in range
    // but more slippage out of range - using base calculation for now
    return baseImpact;
  }

  /**
   * Stable Swap (Curve) - Lower slippage for similar assets
   */
  private calculateStableSwapImpact(
    amountIn: bigint,
    reserveIn: bigint,
    reserveOut: bigint,
    fee: number
  ): PriceImpact {
    if (reserveIn === BigInt(0) || reserveOut === BigInt(0)) {
      return {
        percentage: 100,
        amountOut: BigInt(0),
        effectivePrice: 0,
        slippageCost: amountIn
      };
    }

    // Stable swap has much lower slippage for balanced pools
    // Using simplified model: impact is reduced by amplification factor
    const amplification = 100; // Typical A parameter for stablecoins
    
    const baseImpact = (Number(amountIn) / Number(reserveIn)) * 100;
    const reducedImpact = baseImpact / Math.sqrt(amplification);

    // Apply fee
    const feeMultiplier = BigInt(Math.floor((1 - fee) * 10000));
    const amountInWithFee = (amountIn * feeMultiplier) / BigInt(10000);

    // For stable swap, output is closer to 1:1 ratio
    const ratio = Number(reserveOut) / Number(reserveIn);
    const stableAdjustment = 0.95; // Slight adjustment for curve
    const amountOut = BigInt(Math.floor(Number(amountInWithFee) * ratio * stableAdjustment));

    const spotRate = Number(reserveOut) / Number(reserveIn);
    const expectedOut = BigInt(Math.floor(Number(amountInWithFee) * spotRate));
    const slippageCost = expectedOut > amountOut ? expectedOut - amountOut : BigInt(0);

    const effectivePrice = amountOut > BigInt(0)
      ? Number(amountOut) / Number(amountInWithFee)
      : 0;

    return {
      percentage: reducedImpact,
      amountOut,
      effectivePrice,
      slippageCost
    };
  }
}
