/**
 * ProfitabilityCalculator - Enhanced profitability calculations for multi-hop arbitrage
 * 
 * Accounts for cumulative fees, slippage, and gas costs across all hops
 */

import { ArbitragePath, ArbitrageHop, ProfitabilityResult } from './types';

export class ProfitabilityCalculator {
  private gasPrice: bigint;
  private slippageTolerance: number;

  constructor(gasPrice: bigint, slippageTolerance: number = 0.01) {
    this.gasPrice = gasPrice;
    this.slippageTolerance = slippageTolerance;
  }

  /**
   * Calculate detailed profitability for an arbitrage path
   */
  calculateProfitability(path: ArbitragePath): ProfitabilityResult {
    const totalFees = this.calculateTotalFees(path.hops);
    const totalGas = this.calculateTotalGas(path.hops);
    const slippageImpact = this.calculateSlippageImpact(path.hops);
    
    // Adjust profit for slippage
    const adjustedProfit = this.adjustForSlippage(path.estimatedProfit, slippageImpact);
    
    const netProfit = adjustedProfit > totalGas ? adjustedProfit - totalGas : BigInt(0);
    const startAmount = path.hops[0].amountIn;
    
    // Calculate ROI as percentage
    const roi = startAmount > BigInt(0) 
      ? Number(netProfit * BigInt(10000) / startAmount) / 100 
      : 0;

    return {
      profitable: netProfit > BigInt(0),
      estimatedProfit: adjustedProfit,
      totalFees,
      totalGas,
      netProfit,
      roi,
      slippageImpact
    };
  }

  /**
   * Calculate total fees across all hops
   */
  private calculateTotalFees(hops: ArbitrageHop[]): bigint {
    let totalFees = BigInt(0);
    
    for (const hop of hops) {
      const feeAmount = (hop.amountIn * BigInt(Math.floor(hop.fee * 10000))) / BigInt(10000);
      totalFees += feeAmount;
    }
    
    return totalFees;
  }

  /**
   * Calculate total gas cost
   */
  private calculateTotalGas(hops: ArbitrageHop[]): bigint {
    const totalGasUnits = hops.reduce((sum, hop) => sum + BigInt(hop.gasEstimate), BigInt(0));
    return totalGasUnits * this.gasPrice;
  }

  /**
   * Calculate cumulative slippage impact across hops
   */
  private calculateSlippageImpact(hops: ArbitrageHop[]): number {
    // Slippage compounds across hops
    let cumulativeSlippage = 0;
    
    for (const hop of hops) {
      // Estimate slippage based on trade size relative to liquidity
      // This is a simplified model
      const slippagePerHop = 0.001; // 0.1% base slippage per hop
      cumulativeSlippage = cumulativeSlippage + slippagePerHop + (cumulativeSlippage * slippagePerHop);
    }
    
    return cumulativeSlippage;
  }

  /**
   * Adjust profit estimate for slippage
   */
  private adjustForSlippage(profit: bigint, slippageImpact: number): bigint {
    const slippageMultiplier = BigInt(Math.floor((1 - slippageImpact) * 10000));
    return (profit * slippageMultiplier) / BigInt(10000);
  }

  /**
   * Calculate price impact for a specific hop
   */
  calculatePriceImpact(amountIn: bigint, reserve0: bigint, reserve1: bigint): number {
    if (reserve0 === BigInt(0)) {
      return 1.0; // 100% impact if no liquidity
    }
    
    const impact = Number(amountIn * BigInt(10000) / reserve0) / 10000;
    return Math.min(impact, 1.0);
  }

  /**
   * Check if path meets minimum profitability criteria
   */
  isProfitable(path: ArbitragePath, minProfitThreshold: bigint): boolean {
    const result = this.calculateProfitability(path);
    return result.profitable && result.netProfit >= minProfitThreshold;
  }

  /**
   * Compare two paths and return the more profitable one
   */
  comparePathProfitability(path1: ArbitragePath, path2: ArbitragePath): ArbitragePath {
    const profit1 = this.calculateProfitability(path1);
    const profit2 = this.calculateProfitability(path2);
    
    return profit1.netProfit > profit2.netProfit ? path1 : path2;
  }

  /**
   * Update gas price for calculations
   */
  updateGasPrice(newGasPrice: bigint): void {
    this.gasPrice = newGasPrice;
  }

  /**
   * Get current gas price
   */
  getGasPrice(): bigint {
    return this.gasPrice;
  }
}
