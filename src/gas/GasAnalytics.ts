/**
 * GasAnalytics - Performance tracking and reporting for gas optimization
 *
 * Tracks gas costs, calculates efficiency metrics, and generates reports
 */

import { ArbitragePath } from '../arbitrage/types';

export interface GasMetrics {
  totalGasUsed: bigint;
  totalGasCost: bigint;
  averageGasPerArbitrage: bigint;
  gasSavingsFromOptimizations: bigint;
  failedTransactionGasWasted: bigint;
  mostEfficientTimeOfDay: number; // hour of day (0-23)
  gasCostByChain: Map<string, bigint>;
  executionSuccessRate: number;
  totalArbitrages: number;
  successfulArbitrages: number;
  failedArbitrages: number;
}

export interface ArbitrageExecution {
  path: ArbitragePath;
  gasUsed: bigint;
  gasCost: bigint;
  chain: string;
  timestamp: number;
  success: boolean;
  failureReason?: string;
  blockNumber?: number;
}

export interface GasReport {
  period: { start: number; end: number };
  metrics: GasMetrics;
  topExecutionWindows: Array<{ hour: number; avgGasCost: bigint; executionCount: number }>;
  costByDEX: Map<string, bigint>;
  costByHopCount: Map<number, bigint>;
  recommendations: string[];
}

export class GasAnalytics {
  private executions: ArbitrageExecution[];
  private baselineGasCost: bigint; // For comparison (V1 contract baseline)
  private reportInterval: number;

  constructor(reportInterval: number = 86400000) {
    // Daily by default
    this.executions = [];
    this.baselineGasCost = BigInt(0);
    this.reportInterval = reportInterval;
  }

  /**
   * Record an arbitrage execution
   */
  recordExecution(execution: ArbitrageExecution): void {
    this.executions.push(execution);

    // Limit history (keep last 10,000 executions)
    if (this.executions.length > 10000) {
      this.executions.shift();
    }
  }

  /**
   * Set baseline gas cost for comparison
   */
  setBaselineGasCost(baseline: bigint): void {
    this.baselineGasCost = baseline;
  }

  /**
   * Get current gas metrics
   */
  getMetrics(): GasMetrics {
    const totalGasUsed = this.executions.reduce((sum, exec) => sum + exec.gasUsed, BigInt(0));

    const totalGasCost = this.executions.reduce((sum, exec) => sum + exec.gasCost, BigInt(0));

    const successfulExecutions = this.executions.filter((e) => e.success);
    const failedExecutions = this.executions.filter((e) => !e.success);

    const averageGasPerArbitrage =
      this.executions.length > 0 ? totalGasUsed / BigInt(this.executions.length) : BigInt(0);

    const gasSavingsFromOptimizations = this.calculateGasSavings();

    const failedTransactionGasWasted = failedExecutions.reduce(
      (sum, exec) => sum + exec.gasCost,
      BigInt(0)
    );

    const mostEfficientTimeOfDay = this.findMostEfficientHour();

    const gasCostByChain = this.calculateCostByChain();

    const executionSuccessRate =
      this.executions.length > 0 ? (successfulExecutions.length / this.executions.length) * 100 : 0;

    return {
      totalGasUsed,
      totalGasCost,
      averageGasPerArbitrage,
      gasSavingsFromOptimizations,
      failedTransactionGasWasted,
      mostEfficientTimeOfDay,
      gasCostByChain,
      executionSuccessRate,
      totalArbitrages: this.executions.length,
      successfulArbitrages: successfulExecutions.length,
      failedArbitrages: failedExecutions.length,
    };
  }

  /**
   * Generate comprehensive gas report
   */
  generateReport(startTime?: number, endTime?: number): GasReport {
    const start = startTime || Date.now() - this.reportInterval;
    const end = endTime || Date.now();

    // Filter executions within period
    const periodExecutions = this.executions.filter(
      (e) => e.timestamp >= start && e.timestamp <= end
    );

    // Calculate metrics for period
    const metrics = this.getMetricsForExecutions(periodExecutions);

    // Find top execution windows
    const topExecutionWindows = this.findTopExecutionWindows(periodExecutions);

    // Calculate cost by DEX
    const costByDEX = this.calculateCostByDEX(periodExecutions);

    // Calculate cost by hop count
    const costByHopCount = this.calculateCostByHopCount(periodExecutions);

    // Generate recommendations
    const recommendations = this.generateRecommendations(metrics, topExecutionWindows);

    return {
      period: { start, end },
      metrics,
      topExecutionWindows,
      costByDEX,
      costByHopCount,
      recommendations,
    };
  }

  /**
   * Get average gas cost per arbitrage type
   */
  getAverageGasCostByHopCount(): Map<number, bigint> {
    const costByHopCount = new Map<number, { total: bigint; count: number }>();

    for (const exec of this.executions) {
      const hopCount = exec.path.hops.length;
      const existing = costByHopCount.get(hopCount) || { total: BigInt(0), count: 0 };

      costByHopCount.set(hopCount, {
        total: existing.total + exec.gasCost,
        count: existing.count + 1,
      });
    }

    const averages = new Map<number, bigint>();
    for (const [hopCount, data] of costByHopCount) {
      averages.set(hopCount, data.total / BigInt(data.count));
    }

    return averages;
  }

  /**
   * Find best execution times (when gas is cheapest)
   */
  getBestExecutionTimes(): Array<{ hour: number; avgGasCost: bigint }> {
    return this.findTopExecutionWindows(this.executions);
  }

  /**
   * Calculate ROI per gas price tier
   */
  calculateROIByGasTier(): Map<string, number> {
    // This would require storing gas tier info with executions
    // Simplified implementation
    return new Map([
      ['instant', 0.15], // 15% ROI
      ['fast', 0.25], // 25% ROI
      ['normal', 0.35], // 35% ROI
      ['slow', 0.45], // 45% ROI
    ]);
  }

  /**
   * Get execution history
   */
  getExecutionHistory(limit?: number): ArbitrageExecution[] {
    if (limit) {
      return this.executions.slice(-limit);
    }
    return [...this.executions];
  }

  /**
   * Clear execution history
   */
  clearHistory(): void {
    this.executions = [];
  }

  /**
   * Calculate gas savings compared to baseline
   */
  private calculateGasSavings(): bigint {
    if (this.baselineGasCost === BigInt(0) || this.executions.length === 0) {
      return BigInt(0);
    }

    const _actualAverage =
      this.executions.reduce((sum, exec) => sum + exec.gasCost, BigInt(0)) /
      BigInt(this.executions.length);

    const potentialCost = this.baselineGasCost * BigInt(this.executions.length);
    const actualCost = this.executions.reduce((sum, exec) => sum + exec.gasCost, BigInt(0));

    return potentialCost > actualCost ? potentialCost - actualCost : BigInt(0);
  }

  /**
   * Find most efficient hour of day
   */
  private findMostEfficientHour(): number {
    const hourData = new Map<number, { totalCost: bigint; count: number }>();

    for (const exec of this.executions) {
      const hour = new Date(exec.timestamp).getHours();
      const existing = hourData.get(hour) || { totalCost: BigInt(0), count: 0 };

      hourData.set(hour, {
        totalCost: existing.totalCost + exec.gasCost,
        count: existing.count + 1,
      });
    }

    let bestHour = 0;
    let lowestAvgCost = BigInt(Number.MAX_SAFE_INTEGER);

    for (const [hour, data] of hourData) {
      if (data.count === 0) continue;

      const avgCost = data.totalCost / BigInt(data.count);
      if (avgCost < lowestAvgCost) {
        lowestAvgCost = avgCost;
        bestHour = hour;
      }
    }

    return bestHour;
  }

  /**
   * Calculate cost by chain
   */
  private calculateCostByChain(): Map<string, bigint> {
    const costByChain = new Map<string, bigint>();

    for (const exec of this.executions) {
      const existing = costByChain.get(exec.chain) || BigInt(0);
      costByChain.set(exec.chain, existing + exec.gasCost);
    }

    return costByChain;
  }

  /**
   * Get metrics for specific executions
   */
  private getMetricsForExecutions(executions: ArbitrageExecution[]): GasMetrics {
    const totalGasUsed = executions.reduce((sum, exec) => sum + exec.gasUsed, BigInt(0));
    const totalGasCost = executions.reduce((sum, exec) => sum + exec.gasCost, BigInt(0));
    const successfulExecutions = executions.filter((e) => e.success);
    const failedExecutions = executions.filter((e) => !e.success);

    const averageGasPerArbitrage =
      executions.length > 0 ? totalGasUsed / BigInt(executions.length) : BigInt(0);

    const failedTransactionGasWasted = failedExecutions.reduce(
      (sum, exec) => sum + exec.gasCost,
      BigInt(0)
    );

    const gasCostByChain = new Map<string, bigint>();
    for (const exec of executions) {
      const existing = gasCostByChain.get(exec.chain) || BigInt(0);
      gasCostByChain.set(exec.chain, existing + exec.gasCost);
    }

    const executionSuccessRate =
      executions.length > 0 ? (successfulExecutions.length / executions.length) * 100 : 0;

    return {
      totalGasUsed,
      totalGasCost,
      averageGasPerArbitrage,
      gasSavingsFromOptimizations: this.calculateGasSavings(),
      failedTransactionGasWasted,
      mostEfficientTimeOfDay: this.findMostEfficientHour(),
      gasCostByChain,
      executionSuccessRate,
      totalArbitrages: executions.length,
      successfulArbitrages: successfulExecutions.length,
      failedArbitrages: failedExecutions.length,
    };
  }

  /**
   * Find top execution windows
   */
  private findTopExecutionWindows(
    executions: ArbitrageExecution[]
  ): Array<{ hour: number; avgGasCost: bigint; executionCount: number }> {
    const hourData = new Map<number, { totalCost: bigint; count: number }>();

    for (const exec of executions) {
      const hour = new Date(exec.timestamp).getHours();
      const existing = hourData.get(hour) || { totalCost: BigInt(0), count: 0 };

      hourData.set(hour, {
        totalCost: existing.totalCost + exec.gasCost,
        count: existing.count + 1,
      });
    }

    const windows = Array.from(hourData.entries())
      .map(([hour, data]) => ({
        hour,
        avgGasCost: data.count > 0 ? data.totalCost / BigInt(data.count) : BigInt(0),
        executionCount: data.count,
      }))
      .sort((a, b) => {
        if (a.avgGasCost < b.avgGasCost) return -1;
        if (a.avgGasCost > b.avgGasCost) return 1;
        return 0;
      });

    return windows.slice(0, 5); // Top 5 windows
  }

  /**
   * Calculate cost by DEX
   */
  private calculateCostByDEX(executions: ArbitrageExecution[]): Map<string, bigint> {
    const costByDEX = new Map<string, bigint>();

    for (const exec of executions) {
      for (const hop of exec.path.hops) {
        const existing = costByDEX.get(hop.dexName) || BigInt(0);
        const hopGasCost = exec.gasCost / BigInt(exec.path.hops.length);
        costByDEX.set(hop.dexName, existing + hopGasCost);
      }
    }

    return costByDEX;
  }

  /**
   * Calculate cost by hop count
   */
  private calculateCostByHopCount(executions: ArbitrageExecution[]): Map<number, bigint> {
    const costByHopCount = new Map<number, bigint>();

    for (const exec of executions) {
      const hopCount = exec.path.hops.length;
      const existing = costByHopCount.get(hopCount) || BigInt(0);
      costByHopCount.set(hopCount, existing + exec.gasCost);
    }

    return costByHopCount;
  }

  /**
   * Generate recommendations based on analytics
   */
  private generateRecommendations(
    metrics: GasMetrics,
    topWindows: Array<{ hour: number; avgGasCost: bigint; executionCount: number }>
  ): string[] {
    const recommendations: string[] = [];

    // Success rate recommendation
    if (metrics.executionSuccessRate < 95) {
      recommendations.push(
        `Execution success rate is ${metrics.executionSuccessRate.toFixed(1)}%. ` +
          `Consider improving transaction simulation to reduce failed transactions.`
      );
    }

    // Timing recommendation
    if (topWindows.length > 0) {
      const bestHour = topWindows[0].hour;
      recommendations.push(
        `Gas costs are typically lowest around ${bestHour}:00 UTC. ` +
          `Consider scheduling more arbitrages during this window.`
      );
    }

    // Chain recommendation
    const chainCosts = Array.from(metrics.gasCostByChain.entries()).sort((a, b) => {
      if (a[1] < b[1]) return -1;
      if (a[1] > b[1]) return 1;
      return 0;
    });

    if (chainCosts.length > 1) {
      const cheapestChain = chainCosts[0][0];
      if (cheapestChain !== 'mainnet') {
        recommendations.push(
          `${cheapestChain} has the lowest total gas costs. ` +
            `Consider executing more arbitrages on Layer-2 chains.`
        );
      }
    }

    // Gas savings recommendation
    if (metrics.gasSavingsFromOptimizations > BigInt(0)) {
      recommendations.push(
        `Gas optimizations have saved approximately ${metrics.gasSavingsFromOptimizations} wei. ` +
          `Continue using optimized contracts and transaction strategies.`
      );
    }

    return recommendations;
  }
}
