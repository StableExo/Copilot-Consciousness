/**
 * Backtester - Comprehensive backtesting framework
 *
 * Replays historical market data, simulates trades using ML predictions,
 * and compares ML-enhanced performance vs baseline.
 */

import { EventEmitter } from 'events';
import { BacktestResult, TrainingRecord, EnhancedArbitragePath } from '../types';
import { ArbitragePath } from '../../arbitrage/types';
import { MLOrchestrator } from '../MLOrchestrator';

export interface BacktestConfig {
  startDate: number;
  endDate: number;
  initialCapital: bigint;
  useML: boolean;
  confidenceThreshold: number;
  slippageModel: 'linear' | 'quadratic';
  gasModel: 'average' | 'dynamic';
}

interface SimulatedTrade {
  timestamp: number;
  path: ArbitragePath;
  executed: boolean;
  mlConfidence?: number;
  mlRecommendation?: string;
  profit?: bigint;
  gasUsed?: bigint;
  successful: boolean;
  reason?: string;
}

/**
 * Backtester - Simulate trading with historical data
 */
export class Backtester extends EventEmitter {
  private config: BacktestConfig;
  private mlOrchestrator?: MLOrchestrator;
  private trades: SimulatedTrade[] = [];
  private runningCapital: bigint;

  constructor(config: BacktestConfig, mlOrchestrator?: MLOrchestrator) {
    super();
    this.config = config;
    this.mlOrchestrator = mlOrchestrator;
    this.runningCapital = config.initialCapital;
  }

  /**
   * Run backtest
   */
  async run(historicalData: TrainingRecord[]): Promise<BacktestResult> {
    console.log('[Backtester] Starting backtest...');
    console.log(`  Period: ${new Date(this.config.startDate)} to ${new Date(this.config.endDate)}`);
    console.log(`  ML Enabled: ${this.config.useML}`);
    console.log(`  Data points: ${historicalData.length}`);

    this.trades = [];
    this.runningCapital = this.config.initialCapital;

    // Filter data by date range
    const filteredData = historicalData.filter(
      (record) =>
        record.timestamp >= this.config.startDate && record.timestamp <= this.config.endDate
    );

    console.log(`  Filtered to ${filteredData.length} data points in range`);

    // Sort by timestamp
    filteredData.sort((a, b) => a.timestamp - b.timestamp);

    // Simulate each opportunity
    for (const record of filteredData) {
      await this.simulateTrade(record);
    }

    // Calculate results
    const result = this.calculateResults();

    console.log('[Backtester] Backtest completed');
    console.log(`  Total trades: ${result.totalTrades}`);
    console.log(`  Profitable trades: ${result.profitableTrades}`);
    console.log(`  Win rate: ${(result.winRate * 100).toFixed(2)}%`);
    console.log(`  Net profit: ${result.netProfit}`);

    return result;
  }

  /**
   * Simulate a single trade
   */
  private async simulateTrade(record: TrainingRecord): Promise<void> {
    const trade: SimulatedTrade = {
      timestamp: record.timestamp,
      path: record.path,
      executed: false,
      successful: false,
    };

    try {
      // Enhance with ML if enabled
      if (this.config.useML && this.mlOrchestrator) {
        const enhanced = await this.mlOrchestrator.enhanceOpportunity(record.path);

        if (enhanced.mlPredictions) {
          trade.mlConfidence = enhanced.mlPredictions.confidence;
          trade.mlRecommendation = enhanced.mlPredictions.recommendation;

          // Check if ML recommends execution
          if (enhanced.mlPredictions.confidence < this.config.confidenceThreshold) {
            trade.executed = false;
            trade.reason = 'ML confidence too low';
            this.trades.push(trade);
            return;
          }

          if (enhanced.mlPredictions.recommendation === 'SKIP') {
            trade.executed = false;
            trade.reason = 'ML recommended skip';
            this.trades.push(trade);
            return;
          }
        }
      }

      // Simulate execution
      trade.executed = true;

      // Use actual outcome from record
      if (record.outcome.successful) {
        trade.successful = true;
        trade.profit = record.outcome.actualProfit || record.path.netProfit;
        trade.gasUsed = record.outcome.gasUsed || record.path.totalGasCost;

        // Update capital
        this.runningCapital += trade.profit;
      } else {
        trade.successful = false;
        trade.profit = 0n;
        trade.gasUsed = record.outcome.gasUsed || record.path.totalGasCost;

        // Deduct gas cost
        this.runningCapital -= trade.gasUsed;

        trade.reason = record.outcome.failureReason || 'Trade failed';
      }

      this.trades.push(trade);

      // Emit progress
      if (this.trades.length % 100 === 0) {
        this.emit('progress', {
          tradesProcessed: this.trades.length,
          currentCapital: this.runningCapital,
        });
      }
    } catch (error) {
      console.error('[Backtester] Error simulating trade:', error);
      trade.executed = false;
      trade.reason = 'Simulation error';
      this.trades.push(trade);
    }
  }

  /**
   * Calculate backtest results
   */
  private calculateResults(): BacktestResult {
    const executedTrades = this.trades.filter((t) => t.executed);
    const profitableTrades = executedTrades.filter((t) => t.successful && (t.profit || 0n) > 0n);

    // Calculate profits and losses
    let totalProfit = 0n;
    let totalLoss = 0n;

    for (const trade of executedTrades) {
      if (trade.successful && trade.profit) {
        if (trade.profit > 0n) {
          totalProfit += trade.profit;
        } else {
          totalLoss += -trade.profit;
        }
      } else if (trade.gasUsed) {
        totalLoss += trade.gasUsed;
      }
    }

    const netProfit = totalProfit - totalLoss;
    const winRate = executedTrades.length > 0 ? profitableTrades.length / executedTrades.length : 0;

    // Calculate Sharpe ratio (simplified)
    const returns = executedTrades.map((t) => {
      const profit = Number(t.profit || 0n);
      const capital = Number(this.config.initialCapital);
      return capital > 0 ? profit / capital : 0;
    });

    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdReturn = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );
    const sharpeRatio = stdReturn > 0 ? avgReturn / stdReturn : 0;

    // Calculate max drawdown
    let maxDrawdown = 0;
    let peak = Number(this.config.initialCapital);
    let currentCapital = Number(this.config.initialCapital);

    for (const trade of executedTrades) {
      if (trade.successful && trade.profit) {
        currentCapital += Number(trade.profit);
      } else if (trade.gasUsed) {
        currentCapital -= Number(trade.gasUsed);
      }

      if (currentCapital > peak) {
        peak = currentCapital;
      }

      const drawdown = (peak - currentCapital) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    // Average profit per trade
    const avgProfitPerTrade =
      profitableTrades.length > 0 ? Number(totalProfit) / profitableTrades.length : 0;

    return {
      startDate: this.config.startDate,
      endDate: this.config.endDate,
      totalTrades: executedTrades.length,
      profitableTrades: profitableTrades.length,
      totalProfit,
      totalLoss,
      netProfit,
      winRate,
      sharpeRatio,
      maxDrawdown,
      averageProfitPerTrade: avgProfitPerTrade,
      mlEnhanced: this.config.useML,
    };
  }

  /**
   * Run comparative backtest (ML vs baseline)
   */
  async runComparative(historicalData: TrainingRecord[]): Promise<{
    mlResult: BacktestResult;
    baselineResult: BacktestResult;
  }> {
    console.log('[Backtester] Running comparative backtest...');

    // Run with ML
    this.config.useML = true;
    const mlResult = await this.run(historicalData);

    // Run without ML (baseline)
    this.config.useML = false;
    const baselineResult = await this.run(historicalData);

    // Calculate improvement
    const improvement =
      baselineResult.netProfit > 0n
        ? Number(
            ((mlResult.netProfit - baselineResult.netProfit) * 100n) / baselineResult.netProfit
          )
        : 0;

    mlResult.baselineComparison = {
      netProfit: baselineResult.netProfit,
      winRate: baselineResult.winRate,
      improvement,
    };

    console.log('[Backtester] Comparative backtest completed');
    console.log(`  ML Net Profit: ${mlResult.netProfit}`);
    console.log(`  Baseline Net Profit: ${baselineResult.netProfit}`);
    console.log(`  Improvement: ${improvement.toFixed(2)}%`);

    return { mlResult, baselineResult };
  }

  /**
   * Get detailed trade history
   */
  getTradeHistory(): SimulatedTrade[] {
    return [...this.trades];
  }

  /**
   * Get trades by filter
   */
  filterTrades(filter: {
    successful?: boolean;
    executed?: boolean;
    minConfidence?: number;
  }): SimulatedTrade[] {
    return this.trades.filter((trade) => {
      if (filter.successful !== undefined && trade.successful !== filter.successful) {
        return false;
      }
      if (filter.executed !== undefined && trade.executed !== filter.executed) {
        return false;
      }
      if (
        filter.minConfidence !== undefined &&
        trade.mlConfidence !== undefined &&
        trade.mlConfidence < filter.minConfidence
      ) {
        return false;
      }
      return true;
    });
  }

  /**
   * Export results to JSON
   */
  exportResults(result: BacktestResult): string {
    return JSON.stringify(
      result,
      (_, value) => (typeof value === 'bigint' ? value.toString() : value),
      2
    );
  }

  /**
   * Generate performance report
   */
  generateReport(result: BacktestResult): string {
    const lines = [
      '=== BACKTEST REPORT ===',
      '',
      `Period: ${new Date(result.startDate).toISOString()} to ${new Date(
        result.endDate
      ).toISOString()}`,
      `ML Enhanced: ${result.mlEnhanced}`,
      '',
      '--- Trading Metrics ---',
      `Total Trades: ${result.totalTrades}`,
      `Profitable Trades: ${result.profitableTrades}`,
      `Win Rate: ${(result.winRate * 100).toFixed(2)}%`,
      '',
      '--- Financial Metrics ---',
      `Total Profit: ${result.totalProfit}`,
      `Total Loss: ${result.totalLoss}`,
      `Net Profit: ${result.netProfit}`,
      `Average Profit per Trade: ${result.averageProfitPerTrade.toFixed(2)}`,
      '',
      '--- Risk Metrics ---',
      `Sharpe Ratio: ${result.sharpeRatio.toFixed(4)}`,
      `Max Drawdown: ${(result.maxDrawdown * 100).toFixed(2)}%`,
    ];

    if (result.baselineComparison) {
      lines.push(
        '',
        '--- Baseline Comparison ---',
        `Baseline Net Profit: ${result.baselineComparison.netProfit}`,
        `Baseline Win Rate: ${(result.baselineComparison.winRate * 100).toFixed(2)}%`,
        `Improvement: ${result.baselineComparison.improvement.toFixed(2)}%`
      );
    }

    lines.push('', '======================');

    return lines.join('\n');
  }
}
