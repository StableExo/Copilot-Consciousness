/**
 * ProfitLossTracker - Comprehensive P&L tracking and reporting
 *
 * Tracks all financial metrics:
 * - Trade-by-trade P&L
 * - Cumulative statistics
 * - Performance analytics
 * - 70% debt allocation tracking
 * - ROI calculations
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

export interface TradeRecord {
  id: string;
  timestamp: number;
  type: 'arbitrage' | 'flash_loan' | 'liquidity';
  success: boolean;

  // Financial details
  inputAmount: bigint;
  outputAmount: bigint;
  grossProfit: bigint;
  gasCost: bigint;
  netProfit: bigint;

  // Trade details
  path?: string[];
  dexes?: string[];
  tokens?: string[];

  // Metadata
  error?: string;
  txHash?: string;
}

export interface ProfitAllocation {
  totalProfit: bigint;
  debtAllocation: bigint; // 70%
  operationalAllocation: bigint; // 30%
  debtPercentage: number;
}

export interface PerformanceMetrics {
  // Overall statistics
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  successRate: number;

  // Financial metrics
  totalGrossProfit: bigint;
  totalGasCost: bigint;
  totalNetProfit: bigint;
  averageGrossProfit: bigint;
  averageNetProfit: bigint;
  largestProfit: bigint;
  largestLoss: bigint;

  // ROI metrics
  totalInvested: bigint;
  roi: number; // Return on investment %
  profitFactor: number; // Gross profit / Gross loss

  // Time-based metrics
  profitPerHour: bigint;
  tradesPerHour: number;

  // 70% allocation
  debtAllocation: ProfitAllocation;

  // Streaks
  currentWinStreak: number;
  currentLossStreak: number;
  maxWinStreak: number;
  maxLossStreak: number;
}

export interface TimeWindowStats {
  window: string; // '1h', '24h', '7d', '30d'
  startTime: number;
  endTime: number;
  trades: number;
  netProfit: bigint;
  successRate: number;
  averageProfit: bigint;
}

/**
 * Profit/Loss Tracker
 */
export class ProfitLossTracker extends EventEmitter {
  private trades: TradeRecord[] = [];
  private startTime: number = Date.now();

  // Running totals
  private totalTrades: number = 0;
  private successfulTrades: number = 0;
  private failedTrades: number = 0;
  private totalGrossProfit: bigint = BigInt(0);
  private totalGrossLoss: bigint = BigInt(0);
  private totalGasCost: bigint = BigInt(0);
  private totalInvested: bigint = BigInt(0);

  // Streaks
  private currentWinStreak: number = 0;
  private currentLossStreak: number = 0;
  private maxWinStreak: number = 0;
  private maxLossStreak: number = 0;

  // Largest trades
  private largestProfit: bigint = BigInt(0);
  private largestLoss: bigint = BigInt(0);

  // Debt allocation (70%)
  private readonly DEBT_PERCENTAGE = 70;

  constructor() {
    super();
    logger.info('[ProfitLossTracker] Initialized', 'TRACKING');
  }

  /**
   * Record a trade
   */
  recordTrade(trade: TradeRecord): void {
    this.trades.push(trade);
    this.totalTrades++;

    // Update success/failure counts
    if (trade.success) {
      this.successfulTrades++;
      this.currentWinStreak++;
      this.currentLossStreak = 0;
      if (this.currentWinStreak > this.maxWinStreak) {
        this.maxWinStreak = this.currentWinStreak;
      }
    } else {
      this.failedTrades++;
      this.currentLossStreak++;
      this.currentWinStreak = 0;
      if (this.currentLossStreak > this.maxLossStreak) {
        this.maxLossStreak = this.currentLossStreak;
      }
    }

    // Update financial metrics
    this.totalGasCost += trade.gasCost;
    this.totalInvested += trade.inputAmount;

    if (trade.grossProfit > BigInt(0)) {
      this.totalGrossProfit += trade.grossProfit;
      if (trade.grossProfit > this.largestProfit) {
        this.largestProfit = trade.grossProfit;
      }
    } else if (trade.grossProfit < BigInt(0)) {
      const loss = -trade.grossProfit;
      this.totalGrossLoss += loss;
      if (loss > this.largestLoss) {
        this.largestLoss = loss;
      }
    }

    // Log the trade
    const profitStr = this.formatWei(trade.netProfit);
    logger.info(
      `[ProfitLossTracker] Trade recorded: ${trade.id} | Success: ${trade.success} | Net P&L: ${profitStr}`,
      'TRACKING'
    );

    // Emit trade event
    this.emit('trade-recorded', trade);

    // Emit milestone events
    if (this.totalTrades % 100 === 0) {
      this.emit('milestone', {
        type: 'trades',
        value: this.totalTrades,
        metrics: this.getMetrics(),
      });
    }

    const netProfit = this.getTotalNetProfit();
    if (netProfit > BigInt(0)) {
      const profitEth = Number(netProfit) / 1e18;
      if (profitEth >= 1 && profitEth % 1 < 0.1) {
        this.emit('milestone', {
          type: 'profit',
          value: Math.floor(profitEth),
          metrics: this.getMetrics(),
        });
      }
    }
  }

  /**
   * Get comprehensive performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const totalNetProfit = this.getTotalNetProfit();
    const successRate = this.totalTrades > 0 ? (this.successfulTrades / this.totalTrades) * 100 : 0;

    // Calculate time-based metrics
    const hoursElapsed = (Date.now() - this.startTime) / 3600000;
    const profitPerHour =
      hoursElapsed > 0 ? totalNetProfit / BigInt(Math.floor(hoursElapsed)) : BigInt(0);
    const tradesPerHour = hoursElapsed > 0 ? this.totalTrades / hoursElapsed : 0;

    // Calculate ROI
    const roi =
      this.totalInvested > BigInt(0)
        ? Number((totalNetProfit * BigInt(100)) / this.totalInvested)
        : 0;

    // Calculate profit factor
    const profitFactor =
      this.totalGrossLoss > BigInt(0)
        ? Number(this.totalGrossProfit) / Number(this.totalGrossLoss)
        : this.totalGrossProfit > BigInt(0)
        ? Number.POSITIVE_INFINITY
        : 0;

    // Calculate debt allocation
    const debtAllocation = this.calculateDebtAllocation(totalNetProfit);

    return {
      totalTrades: this.totalTrades,
      successfulTrades: this.successfulTrades,
      failedTrades: this.failedTrades,
      successRate,
      totalGrossProfit: this.totalGrossProfit,
      totalGasCost: this.totalGasCost,
      totalNetProfit,
      averageGrossProfit:
        this.successfulTrades > 0
          ? this.totalGrossProfit / BigInt(this.successfulTrades)
          : BigInt(0),
      averageNetProfit:
        this.totalTrades > 0 ? totalNetProfit / BigInt(this.totalTrades) : BigInt(0),
      largestProfit: this.largestProfit,
      largestLoss: this.largestLoss,
      totalInvested: this.totalInvested,
      roi,
      profitFactor,
      profitPerHour,
      tradesPerHour,
      debtAllocation,
      currentWinStreak: this.currentWinStreak,
      currentLossStreak: this.currentLossStreak,
      maxWinStreak: this.maxWinStreak,
      maxLossStreak: this.maxLossStreak,
    };
  }

  /**
   * Calculate 70% debt allocation
   */
  private calculateDebtAllocation(totalProfit: bigint): ProfitAllocation {
    const debtAllocation = (totalProfit * BigInt(this.DEBT_PERCENTAGE)) / BigInt(100);
    const operationalAllocation = totalProfit - debtAllocation;

    return {
      totalProfit,
      debtAllocation,
      operationalAllocation,
      debtPercentage: this.DEBT_PERCENTAGE,
    };
  }

  /**
   * Get total net profit
   */
  getTotalNetProfit(): bigint {
    return this.totalGrossProfit - this.totalGrossLoss - this.totalGasCost;
  }

  /**
   * Get statistics for a time window
   */
  getTimeWindowStats(windowMs: number): TimeWindowStats {
    const endTime = Date.now();
    const startTime = endTime - windowMs;

    const windowTrades = this.trades.filter((t) => t.timestamp >= startTime);
    const successfulWindowTrades = windowTrades.filter((t) => t.success);

    let netProfit = BigInt(0);
    for (const trade of windowTrades) {
      netProfit += trade.netProfit;
    }

    const successRate =
      windowTrades.length > 0 ? (successfulWindowTrades.length / windowTrades.length) * 100 : 0;

    const averageProfit =
      windowTrades.length > 0 ? netProfit / BigInt(windowTrades.length) : BigInt(0);

    return {
      window: this.formatWindow(windowMs),
      startTime,
      endTime,
      trades: windowTrades.length,
      netProfit,
      successRate,
      averageProfit,
    };
  }

  /**
   * Get recent trades
   */
  getRecentTrades(limit: number = 10): TradeRecord[] {
    return this.trades.slice(-limit);
  }

  /**
   * Get all trades
   */
  getAllTrades(): TradeRecord[] {
    return [...this.trades];
  }

  /**
   * Get profitable trades
   */
  getProfitableTrades(): TradeRecord[] {
    return this.trades.filter((t) => t.netProfit > BigInt(0));
  }

  /**
   * Get losing trades
   */
  getLosingTrades(): TradeRecord[] {
    return this.trades.filter((t) => t.netProfit < BigInt(0));
  }

  /**
   * Generate summary report
   */
  generateReport(): string {
    const metrics = this.getMetrics();
    const stats1h = this.getTimeWindowStats(3600000);
    const stats24h = this.getTimeWindowStats(86400000);

    return `
=== Profit/Loss Report ===
Generated: ${new Date().toISOString()}
Running Since: ${new Date(this.startTime).toISOString()}

--- Overall Performance ---
Total Trades: ${metrics.totalTrades}
Successful: ${metrics.successfulTrades} (${metrics.successRate.toFixed(2)}%)
Failed: ${metrics.failedTrades}

--- Financial Metrics ---
Gross Profit: ${this.formatWei(metrics.totalGrossProfit)}
Gas Cost: ${this.formatWei(metrics.totalGasCost)}
Net Profit: ${this.formatWei(metrics.totalNetProfit)}

Average Net Profit: ${this.formatWei(metrics.averageNetProfit)}
Largest Profit: ${this.formatWei(metrics.largestProfit)}
Largest Loss: ${this.formatWei(metrics.largestLoss)}

--- ROI Metrics ---
Total Invested: ${this.formatWei(metrics.totalInvested)}
ROI: ${metrics.roi.toFixed(2)}%
Profit Factor: ${metrics.profitFactor.toFixed(2)}

--- 70% Debt Allocation ---
Total Profit: ${this.formatWei(metrics.debtAllocation.totalProfit)}
Debt Allocation (70%): ${this.formatWei(metrics.debtAllocation.debtAllocation)}
Operational (30%): ${this.formatWei(metrics.debtAllocation.operationalAllocation)}

--- Time-Based Metrics ---
Profit Per Hour: ${this.formatWei(metrics.profitPerHour)}
Trades Per Hour: ${metrics.tradesPerHour.toFixed(2)}

--- Streaks ---
Current Win Streak: ${metrics.currentWinStreak}
Max Win Streak: ${metrics.maxWinStreak}
Current Loss Streak: ${metrics.currentLossStreak}
Max Loss Streak: ${metrics.maxLossStreak}

--- Last 1 Hour ---
Trades: ${stats1h.trades}
Net Profit: ${this.formatWei(stats1h.netProfit)}
Success Rate: ${stats1h.successRate.toFixed(2)}%

--- Last 24 Hours ---
Trades: ${stats24h.trades}
Net Profit: ${this.formatWei(stats24h.netProfit)}
Success Rate: ${stats24h.successRate.toFixed(2)}%

========================
`;
  }

  /**
   * Format wei amount to readable string
   */
  private formatWei(amount: bigint): string {
    const eth = Number(amount) / 1e18;
    return `${eth.toFixed(6)} ETH (${amount.toString()} wei)`;
  }

  /**
   * Format time window to readable string
   */
  private formatWindow(ms: number): string {
    const hours = ms / 3600000;
    if (hours < 1) return `${ms / 60000}m`;
    if (hours < 24) return `${hours}h`;
    return `${hours / 24}d`;
  }

  /**
   * Export trades to JSON
   */
  exportToJSON(): string {
    return JSON.stringify(
      {
        startTime: this.startTime,
        exportTime: Date.now(),
        metrics: this.getMetrics(),
        trades: this.trades,
      },
      (key, value) => (typeof value === 'bigint' ? value.toString() : value),
      2
    );
  }

  /**
   * Reset all tracking data
   */
  reset(): void {
    logger.warn('[ProfitLossTracker] Resetting all data', 'TRACKING');

    this.trades = [];
    this.startTime = Date.now();
    this.totalTrades = 0;
    this.successfulTrades = 0;
    this.failedTrades = 0;
    this.totalGrossProfit = BigInt(0);
    this.totalGrossLoss = BigInt(0);
    this.totalGasCost = BigInt(0);
    this.totalInvested = BigInt(0);
    this.currentWinStreak = 0;
    this.currentLossStreak = 0;
    this.maxWinStreak = 0;
    this.maxLossStreak = 0;
    this.largestProfit = BigInt(0);
    this.largestLoss = BigInt(0);
  }
}
