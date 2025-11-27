// src/utils/PrecisionMath.ts
/**
 * PrecisionMath - Pure BigInt calculations for arbitrage
 * Based on PROJECT-HAVOC's approach - NO floating point errors
 *
 * Key principle: All calculations use scaled integers
 * Scale factor: 10^18 (same as ETH wei)
 */

export class PrecisionMath {
  // Scale factor for precision (18 decimals)
  public static readonly SCALE = BigInt(10 ** 18);
  public static readonly SCALE_SQUARED = BigInt(10 ** 36);

  // Basis points scale (10000 = 100%)
  public static readonly BPS_SCALE = BigInt(10000);

  /**
   * Calculate price ratio: (reserve1 * SCALE) / reserve0
   */
  static calculatePriceRatio(reserve0: bigint, reserve1: bigint): bigint {
    if (reserve0 === BigInt(0)) {
      throw new Error('Division by zero in price ratio');
    }
    return (reserve1 * this.SCALE) / reserve0;
  }

  /**
   * Calculate swap output using constant product formula
   */
  static calculateSwapOutput(
    amountIn: bigint,
    reserve0: bigint,
    reserve1: bigint,
    feeBps: bigint
  ): bigint {
    const feeMultiplier = this.BPS_SCALE - feeBps;
    const amountInWithFee = (amountIn * feeMultiplier) / this.BPS_SCALE;

    const numerator = amountInWithFee * reserve1;
    const denominator = reserve0 + amountInWithFee;

    if (denominator === BigInt(0)) {
      throw new Error('Division by zero in swap calculation');
    }

    return numerator / denominator;
  }

  /**
   * Calculate price impact as basis points
   */
  static calculatePriceImpact(
    amountIn: bigint,
    reserve0: bigint,
    reserve1: bigint,
    feeBps: bigint
  ): bigint {
    const priceBefore = this.calculatePriceRatio(reserve0, reserve1);
    const amountOut = this.calculateSwapOutput(amountIn, reserve0, reserve1, feeBps);
    const priceAfter = (amountOut * this.SCALE) / amountIn;

    const priceDiff =
      priceBefore > priceAfter ? priceBefore - priceAfter : priceAfter - priceBefore;

    return (priceDiff * this.BPS_SCALE) / priceBefore;
  }

  /**
   * Calculate profit percentage in basis points
   */
  static calculateProfitBps(initialAmount: bigint, finalAmount: bigint): bigint {
    if (initialAmount === BigInt(0)) {
      throw new Error('Division by zero in profit calculation');
    }

    if (finalAmount <= initialAmount) {
      return BigInt(0);
    }

    const profit = finalAmount - initialAmount;
    return (profit * this.BPS_SCALE) / initialAmount;
  }

  /**
   * Check if profit meets minimum threshold
   */
  static isProfitable(initialAmount: bigint, finalAmount: bigint, minProfitBps: bigint): boolean {
    const profitBps = this.calculateProfitBps(initialAmount, finalAmount);
    return profitBps >= minProfitBps;
  }

  /**
   * Simulate multi-hop path
   */
  static simulateMultiHop(
    amountIn: bigint,
    hops: Array<{
      reserve0: bigint;
      reserve1: bigint;
      feeBps: bigint;
    }>
  ): bigint {
    let currentAmount = amountIn;

    for (const hop of hops) {
      currentAmount = this.calculateSwapOutput(
        currentAmount,
        hop.reserve0,
        hop.reserve1,
        hop.feeBps
      );
    }

    return currentAmount;
  }

  /**
   * Calculate cumulative price impact
   */
  static calculateCumulativePriceImpact(
    amountIn: bigint,
    hops: Array<{
      reserve0: bigint;
      reserve1: bigint;
      feeBps: bigint;
    }>
  ): bigint {
    let cumulativeImpact = BigInt(0);
    let currentAmount = amountIn;

    for (const hop of hops) {
      const hopImpact = this.calculatePriceImpact(
        currentAmount,
        hop.reserve0,
        hop.reserve1,
        hop.feeBps
      );

      cumulativeImpact += hopImpact;

      currentAmount = this.calculateSwapOutput(
        currentAmount,
        hop.reserve0,
        hop.reserve1,
        hop.feeBps
      );
    }

    return cumulativeImpact;
  }

  /**
   * Format BigInt to human-readable string
   */
  static formatUnits(value: bigint, decimals: number = 18): string {
    const divisor = BigInt(10 ** decimals);
    const integerPart = value / divisor;
    const fractionalPart = value % divisor;

    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    const trimmed = fractionalStr.replace(/0+$/, '');

    if (trimmed === '') {
      return integerPart.toString();
    }

    return `${integerPart}.${trimmed}`;
  }

  /**
   * Parse human-readable string to BigInt
   */
  static parseUnits(value: string, decimals: number = 18): bigint {
    const [integer, fraction = ''] = value.split('.');
    const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
    return BigInt(integer + paddedFraction);
  }

  /**
   * Calculate optimal trade size
   */
  static calculateOptimalSize(
    reserve0: bigint,
    reserve1: bigint,
    feeBps: bigint,
    targetImpactBps: bigint,
    maxIterations: number = 20
  ): bigint {
    let low = BigInt(0);
    let high = reserve0 / BigInt(10);

    for (let i = 0; i < maxIterations; i++) {
      const mid = (low + high) / BigInt(2);
      const impact = this.calculatePriceImpact(mid, reserve0, reserve1, feeBps);

      if (impact === targetImpactBps) {
        return mid;
      } else if (impact < targetImpactBps) {
        low = mid;
      } else {
        high = mid;
      }

      if (high - low < BigInt(1000)) {
        break;
      }
    }

    return (low + high) / BigInt(2);
  }

  /**
   * Compare two profit opportunities
   */
  static compareProfit(
    profit1: { amount: bigint; gas: bigint },
    profit2: { amount: bigint; gas: bigint },
    gasPrice: bigint
  ): number {
    const net1 = profit1.amount - profit1.gas * gasPrice;
    const net2 = profit2.amount - profit2.gas * gasPrice;

    if (net1 > net2) return 1;
    if (net1 < net2) return -1;
    return 0;
  }
}

export const {
  SCALE,
  BPS_SCALE,
  calculatePriceRatio,
  calculateSwapOutput,
  calculatePriceImpact,
  calculateProfitBps,
  isProfitable,
  simulateMultiHop,
  calculateCumulativePriceImpact,
  formatUnits,
  parseUnits,
  calculateOptimalSize,
  compareProfit,
} = PrecisionMath;
