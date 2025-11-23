/**
 * PositionSizeManager - Position sizing and risk management
 * 
 * Enforces position size limits to prevent over-exposure and manage risk:
 * - Per-trade limits
 * - Total exposure limits
 * - Dynamic sizing based on account balance
 * - Volatility-adjusted sizing
 */

import { logger } from '../utils/logger';

export interface PositionSizeConfig {
  // Absolute limits
  maxPositionSizeWei: bigint;        // Maximum position size in wei
  minPositionSizeWei: bigint;        // Minimum position size in wei
  
  // Percentage-based limits
  maxPositionPercentage: number;      // Max % of total capital per trade (0-100)
  maxTotalExposure: number;           // Max % of capital in active positions (0-100)
  
  // Risk-based sizing
  riskPerTrade: number;               // Risk % per trade (0-100)
  maxLossPerTrade: bigint;            // Maximum loss per trade (wei)
  
  // Dynamic sizing
  enableDynamicSizing: boolean;       // Adjust size based on performance
  performanceWindow: number;          // Window for performance calculation (ms)
  sizeAdjustmentFactor: number;       // How much to adjust (0-1)
}

export interface PositionMetrics {
  totalCapital: bigint;
  availableCapital: bigint;
  totalExposure: bigint;
  activePositions: number;
  exposurePercentage: number;
  averagePositionSize: bigint;
  largestPosition: bigint;
  smallestPosition: bigint;
}

export interface PositionRequest {
  amount: bigint;
  type: 'arbitrage' | 'flash_loan' | 'liquidity';
  estimatedProfit: bigint;
  estimatedLoss: bigint;
  gasEstimate: bigint;
}

export interface PositionApproval {
  approved: boolean;
  approvedAmount: bigint;
  reason?: string;
  adjustedForRisk: boolean;
}

/**
 * Position Size Manager for Risk Control
 */
export class PositionSizeManager {
  private config: PositionSizeConfig;
  private totalCapital: bigint = BigInt(0);
  private activePositions: Map<string, bigint> = new Map();
  
  // Performance tracking
  private recentTrades: Array<{ profit: bigint; timestamp: number }> = [];

  constructor(config?: Partial<PositionSizeConfig>) {
    this.config = {
      maxPositionSizeWei: config?.maxPositionSizeWei ?? BigInt(10e18), // 10 ETH
      minPositionSizeWei: config?.minPositionSizeWei ?? BigInt(1e16), // 0.01 ETH
      maxPositionPercentage: config?.maxPositionPercentage ?? 20,
      maxTotalExposure: config?.maxTotalExposure ?? 50,
      riskPerTrade: config?.riskPerTrade ?? 2,
      maxLossPerTrade: config?.maxLossPerTrade ?? BigInt(1e17), // 0.1 ETH
      enableDynamicSizing: config?.enableDynamicSizing ?? true,
      performanceWindow: config?.performanceWindow ?? 3600000, // 1 hour
      sizeAdjustmentFactor: config?.sizeAdjustmentFactor ?? 0.2
    };
    
    logger.info('[PositionSizeManager] Initialized', 'SAFETY');
  }

  /**
   * Update total capital
   */
  updateCapital(amount: bigint): void {
    this.totalCapital = amount;
    logger.debug(`[PositionSizeManager] Capital updated: ${amount}`, 'SAFETY');
  }

  /**
   * Request approval for a position
   */
  requestPosition(request: PositionRequest): PositionApproval {
    // Check minimum size
    if (request.amount < this.config.minPositionSizeWei) {
      return {
        approved: false,
        approvedAmount: BigInt(0),
        reason: `Position size below minimum: ${request.amount} < ${this.config.minPositionSizeWei}`,
        adjustedForRisk: false
      };
    }
    
    // Check absolute maximum
    if (request.amount > this.config.maxPositionSizeWei) {
      return {
        approved: false,
        approvedAmount: BigInt(0),
        reason: `Position size exceeds maximum: ${request.amount} > ${this.config.maxPositionSizeWei}`,
        adjustedForRisk: false
      };
    }
    
    // Check percentage of capital
    const maxPercentageAmount = (this.totalCapital * BigInt(this.config.maxPositionPercentage)) / BigInt(100);
    if (request.amount > maxPercentageAmount) {
      return {
        approved: false,
        approvedAmount: BigInt(0),
        reason: `Position exceeds ${this.config.maxPositionPercentage}% of capital`,
        adjustedForRisk: false
      };
    }
    
    // Check total exposure
    const currentExposure = this.getTotalExposure();
    const newExposure = currentExposure + request.amount;
    const maxExposure = (this.totalCapital * BigInt(this.config.maxTotalExposure)) / BigInt(100);
    
    if (newExposure > maxExposure) {
      return {
        approved: false,
        approvedAmount: BigInt(0),
        reason: `Would exceed maximum total exposure: ${newExposure} > ${maxExposure}`,
        adjustedForRisk: false
      };
    }
    
    // Check risk limits
    if (request.estimatedLoss > this.config.maxLossPerTrade) {
      return {
        approved: false,
        approvedAmount: BigInt(0),
        reason: `Estimated loss exceeds maximum: ${request.estimatedLoss} > ${this.config.maxLossPerTrade}`,
        adjustedForRisk: false
      };
    }
    
    // Apply dynamic sizing if enabled
    let approvedAmount = request.amount;
    let adjustedForRisk = false;
    
    if (this.config.enableDynamicSizing) {
      const performanceMultiplier = this.calculatePerformanceMultiplier();
      const adjustedAmount = (request.amount * BigInt(Math.floor(performanceMultiplier * 100))) / BigInt(100);
      
      if (adjustedAmount !== request.amount) {
        approvedAmount = adjustedAmount;
        adjustedForRisk = true;
        logger.info(
          `[PositionSizeManager] Position adjusted by performance: ${request.amount} -> ${adjustedAmount}`,
          'SAFETY'
        );
      }
    }
    
    return {
      approved: true,
      approvedAmount,
      reason: adjustedForRisk ? 'Adjusted based on recent performance' : undefined,
      adjustedForRisk
    };
  }

  /**
   * Register an active position
   */
  registerPosition(id: string, amount: bigint): void {
    this.activePositions.set(id, amount);
    logger.debug(`[PositionSizeManager] Position registered: ${id} = ${amount}`, 'SAFETY');
  }

  /**
   * Close a position
   */
  closePosition(id: string, profit: bigint): void {
    const amount = this.activePositions.get(id);
    if (amount) {
      this.activePositions.delete(id);
      
      // Record trade for performance tracking
      this.recentTrades.push({
        profit,
        timestamp: Date.now()
      });
      this.cleanupOldTrades();
      
      logger.debug(`[PositionSizeManager] Position closed: ${id}, profit: ${profit}`, 'SAFETY');
    }
  }

  /**
   * Get total exposure across all positions
   */
  getTotalExposure(): bigint {
    let total = BigInt(0);
    for (const amount of this.activePositions.values()) {
      total += amount;
    }
    return total;
  }

  /**
   * Get current position metrics
   */
  getMetrics(): PositionMetrics {
    const totalExposure = this.getTotalExposure();
    const positions = Array.from(this.activePositions.values());
    
    let largest = BigInt(0);
    let smallest = BigInt(Number.MAX_SAFE_INTEGER);
    
    for (const pos of positions) {
      if (pos > largest) largest = pos;
      if (pos < smallest) smallest = pos;
    }
    
    const average = positions.length > 0 ? 
      totalExposure / BigInt(positions.length) : BigInt(0);
    
    return {
      totalCapital: this.totalCapital,
      availableCapital: this.totalCapital - totalExposure,
      totalExposure,
      activePositions: positions.length,
      exposurePercentage: this.totalCapital > BigInt(0) ? 
        Number((totalExposure * BigInt(100)) / this.totalCapital) : 0,
      averagePositionSize: average,
      largestPosition: positions.length > 0 ? largest : BigInt(0),
      smallestPosition: positions.length > 0 ? smallest : BigInt(0)
    };
  }

  /**
   * Calculate performance multiplier for dynamic sizing
   */
  private calculatePerformanceMultiplier(): number {
    this.cleanupOldTrades();
    
    if (this.recentTrades.length === 0) {
      return 1.0; // No data, use normal sizing
    }
    
    // Calculate win rate and average profit
    const profitable = this.recentTrades.filter(t => t.profit > BigInt(0)).length;
    const winRate = profitable / this.recentTrades.length;
    
    // Calculate total profit
    const totalProfit = this.recentTrades.reduce(
      (sum, t) => sum + t.profit,
      BigInt(0)
    );
    
    // If losing, reduce position size
    if (totalProfit < BigInt(0)) {
      const reduction = 1.0 - (this.config.sizeAdjustmentFactor * (1.0 - winRate));
      return Math.max(0.5, reduction); // At least 50% of normal size
    }
    
    // If winning, increase position size
    if (winRate > 0.6) {
      const increase = 1.0 + (this.config.sizeAdjustmentFactor * (winRate - 0.5));
      return Math.min(1.5, increase); // At most 150% of normal size
    }
    
    return 1.0;
  }

  /**
   * Clean up old trades outside performance window
   */
  private cleanupOldTrades(): void {
    const cutoff = Date.now() - this.config.performanceWindow;
    this.recentTrades = this.recentTrades.filter(t => t.timestamp > cutoff);
  }

  /**
   * Get recommended position size based on risk
   */
  getRecommendedSize(estimatedLoss: bigint): bigint {
    // Kelly criterion-inspired sizing
    const riskAmount = (this.totalCapital * BigInt(this.config.riskPerTrade)) / BigInt(100);
    
    // Don't risk more than estimated loss allows
    const maxSize = estimatedLoss > BigInt(0) ? 
      (riskAmount * BigInt(100)) / estimatedLoss : BigInt(0);
    
    // Apply limits
    if (maxSize > this.config.maxPositionSizeWei) {
      return this.config.maxPositionSizeWei;
    }
    if (maxSize < this.config.minPositionSizeWei) {
      return this.config.minPositionSizeWei;
    }
    
    return maxSize;
  }

  /**
   * Check if can open new position
   */
  canOpenPosition(): boolean {
    const metrics = this.getMetrics();
    return metrics.exposurePercentage < this.config.maxTotalExposure;
  }

  /**
   * Reset all positions (emergency)
   */
  resetPositions(): void {
    logger.warn('[PositionSizeManager] Resetting all positions', 'SAFETY');
    this.activePositions.clear();
    this.recentTrades = [];
  }
}
