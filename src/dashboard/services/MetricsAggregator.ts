/**
 * MetricsAggregator - Centralized metrics collection and aggregation
 * 
 * Aggregates metrics from GasAnalytics and CrossChainAnalytics modules
 * Calculates derived metrics like Sharpe ratio, ROI, and drawdown
 */

import { GasAnalytics } from '../../gas/GasAnalytics';
import { CrossChainAnalytics, AnalyticsSummary } from '../../chains/CrossChainAnalytics';
import { DashboardMetrics, ChartData, WalletBalance } from '../types';
import { WalletBalanceService } from './WalletBalanceService';

export class MetricsAggregator {
  private gasAnalytics: GasAnalytics;
  private crossChainAnalytics: CrossChainAnalytics;
  private walletBalanceService?: WalletBalanceService;
  private metricsHistory: DashboardMetrics[];
  private startTime: number;
  private maxHistorySize: number;

  constructor(
    gasAnalytics: GasAnalytics,
    crossChainAnalytics: CrossChainAnalytics,
    maxHistorySize: number = 10000,
    walletBalanceService?: WalletBalanceService
  ) {
    this.gasAnalytics = gasAnalytics;
    this.crossChainAnalytics = crossChainAnalytics;
    this.walletBalanceService = walletBalanceService;
    this.metricsHistory = [];
    this.startTime = Date.now();
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Get current aggregated metrics
   */
  async getCurrentMetrics(): Promise<DashboardMetrics> {
    const gasMetrics = this.gasAnalytics.getMetrics();
    const crossChainSummary = this.crossChainAnalytics.getSummary();

    // Combine metrics from both sources
    const totalTrades = gasMetrics.totalArbitrages + crossChainSummary.totalTrades;
    const successfulTrades = gasMetrics.successfulArbitrages + crossChainSummary.successfulTrades;
    const failedTrades = gasMetrics.failedArbitrages + crossChainSummary.failedTrades;

    const successRate = totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0;

    // Calculate financial metrics
    const totalProfit = crossChainSummary.totalProfit.toString();
    const totalLoss = crossChainSummary.totalLoss.toString();
    const netProfit = crossChainSummary.netProfit.toString();

    // Calculate ROI (Return on Investment)
    const roi = this.calculateROI(crossChainSummary);

    // Calculate Sharpe ratio
    const sharpeRatio = this.calculateSharpeRatio();

    // Calculate max drawdown
    const maxDrawdown = this.calculateMaxDrawdown();

    // Get performance metrics
    const averageExecutionTime = crossChainSummary.averageExecutionTime;
    const averageGasCost = gasMetrics.averageGasPerArbitrage.toString();

    // System metrics (placeholder values, should be calculated from actual system stats)
    const uptime = Date.now() - this.startTime;
    const latency = 0; // Will be updated by performance monitor
    const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB
    const errorRate = failedTrades / totalTrades || 0;

    const metrics: DashboardMetrics = {
      totalTrades,
      successfulTrades,
      failedTrades,
      successRate,
      totalProfit,
      totalLoss,
      netProfit,
      roi,
      sharpeRatio,
      maxDrawdown,
      averageExecutionTime,
      averageGasCost,
      uptime,
      latency,
      memoryUsage,
      errorRate
    };

    // Store in history
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }

    return metrics;
  }

  /**
   * Get chart data for visualizations
   */
  getChartData(timeRange?: { start: number; end: number }): ChartData {
    const now = Date.now();
    const start = timeRange?.start || now - 24 * 60 * 60 * 1000; // Default 24 hours
    const end = timeRange?.end || now;

    // Filter metrics within time range
    const filteredMetrics = this.metricsHistory.filter(
      m => m.uptime >= start && m.uptime <= end
    );

    return {
      profitOverTime: filteredMetrics.map(m => ({
        timestamp: this.startTime + m.uptime,
        value: parseFloat(m.netProfit) / 1e18 // Convert from wei to ETH
      })),
      gasOverTime: filteredMetrics.map(m => ({
        timestamp: this.startTime + m.uptime,
        value: parseFloat(m.averageGasCost) / 1e18
      })),
      volumeOverTime: filteredMetrics.map(m => ({
        timestamp: this.startTime + m.uptime,
        value: m.totalTrades
      })),
      successRateOverTime: filteredMetrics.map(m => ({
        timestamp: this.startTime + m.uptime,
        value: m.successRate
      }))
    };
  }

  /**
   * Calculate ROI (Return on Investment)
   */
  private calculateROI(summary: AnalyticsSummary): number {
    // Calculate ROI based on total profit and initial investment
    // Simplified calculation: (netProfit / totalInvested) * 100
    if (summary.totalTrades === 0) {
      return 0;
    }

    // Estimate total invested (sum of all initial trade amounts)
    const trades = this.crossChainAnalytics.getRecentTrades(summary.totalTrades);
    const totalInvested = trades.reduce(
      (sum, t) => sum + (t.path.hops[0]?.amountIn || BigInt(0)),
      BigInt(0)
    );

    if (totalInvested === BigInt(0)) {
      return 0;
    }

    const roi = Number((summary.netProfit * BigInt(10000)) / totalInvested) / 100;
    return roi;
  }

  /**
   * Calculate Sharpe ratio (risk-adjusted return)
   */
  private calculateSharpeRatio(): number {
    if (this.metricsHistory.length < 2) {
      return 0;
    }

    // Calculate returns for each period
    const returns: number[] = [];
    for (let i = 1; i < this.metricsHistory.length; i++) {
      const prevProfit = parseFloat(this.metricsHistory[i - 1].netProfit);
      const currProfit = parseFloat(this.metricsHistory[i].netProfit);
      const periodReturn = prevProfit !== 0 ? (currProfit - prevProfit) / prevProfit : 0;
      returns.push(periodReturn);
    }

    // Calculate average return
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;

    // Calculate standard deviation
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // Sharpe ratio = (avgReturn - riskFreeRate) / stdDev
    // Assuming risk-free rate of 0 for simplicity
    const sharpeRatio = stdDev !== 0 ? avgReturn / stdDev : 0;

    return sharpeRatio;
  }

  /**
   * Calculate maximum drawdown
   */
  private calculateMaxDrawdown(): number {
    if (this.metricsHistory.length < 2) {
      return 0;
    }

    let maxDrawdown = 0;
    let peak = parseFloat(this.metricsHistory[0].netProfit);

    for (const metrics of this.metricsHistory) {
      const currentProfit = parseFloat(metrics.netProfit);
      
      if (currentProfit > peak) {
        peak = currentProfit;
      }

      const drawdown = peak !== 0 ? ((peak - currentProfit) / peak) * 100 : 0;
      
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(limit?: number): DashboardMetrics[] {
    if (limit) {
      return this.metricsHistory.slice(-limit);
    }
    return [...this.metricsHistory];
  }

  /**
   * Clear metrics history
   */
  clearHistory(): void {
    this.metricsHistory = [];
  }

  /**
   * Get gas analytics
   */
  getGasAnalytics(): GasAnalytics {
    return this.gasAnalytics;
  }

  /**
   * Get cross-chain analytics
   */
  getCrossChainAnalytics(): CrossChainAnalytics {
    return this.crossChainAnalytics;
  }
}
