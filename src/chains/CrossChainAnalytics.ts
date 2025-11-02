/**
 * CrossChainAnalytics - Track and analyze cross-chain arbitrage performance
 * 
 * Monitors profitability, bridge success rates, execution times, and more
 */

import { CrossChainPath } from '../arbitrage/CrossChainPathFinder';
import { ExecutionResult } from './MultiChainExecutor';

export interface TradeRecord {
  id: string;
  path: CrossChainPath;
  result: ExecutionResult;
  timestamp: number;
  profit?: bigint;
  loss?: bigint;
}

export interface ChainPairStats {
  chainA: number | string;
  chainB: number | string;
  totalTrades: number;
  successfulTrades: number;
  totalProfit: bigint;
  averageProfit: bigint;
  averageBridgeTime: number;
}

export interface BridgeStats {
  bridgeName: string;
  totalUses: number;
  successfulBridges: number;
  failedBridges: number;
  successRate: number;
  averageTime: number;
  totalFeesSpent: bigint;
}

export interface AnalyticsSummary {
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  totalProfit: bigint;
  totalLoss: bigint;
  netProfit: bigint;
  successRate: number;
  averageExecutionTime: number;
  averageBridgeTime: number;
  mostProfitableChainPair: ChainPairStats | null;
  bridgeStats: BridgeStats[];
}

export class CrossChainAnalytics {
  private trades: TradeRecord[];
  private chainPairStats: Map<string, ChainPairStats>;
  private bridgeStats: Map<string, BridgeStats>;
  private maxRecords: number;

  constructor(maxRecords: number = 10000) {
    this.trades = [];
    this.chainPairStats = new Map();
    this.bridgeStats = new Map();
    this.maxRecords = maxRecords;
  }

  /**
   * Record a completed trade
   */
  recordTrade(path: CrossChainPath, result: ExecutionResult): void {
    const tradeId = `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const record: TradeRecord = {
      id: tradeId,
      path,
      result,
      timestamp: Date.now()
    };

    if (result.success && result.actualProfit) {
      if (result.actualProfit > 0) {
        record.profit = result.actualProfit;
      } else {
        record.loss = -result.actualProfit;
      }
    } else {
      // Estimate loss from gas spent
      if (result.gasSpent) {
        record.loss = result.gasSpent;
      }
    }

    this.trades.push(record);

    // Maintain max records limit
    if (this.trades.length > this.maxRecords) {
      this.trades = this.trades.slice(-this.maxRecords);
    }

    // Update statistics
    this.updateChainPairStats(path, result);
    this.updateBridgeStats(path, result);
  }

  /**
   * Update chain pair statistics
   */
  private updateChainPairStats(path: CrossChainPath, result: ExecutionResult): void {
    // Get unique chain pairs from path
    const chains = path.chains;
    
    for (let i = 0; i < chains.length - 1; i++) {
      const chainA = chains[i];
      const chainB = chains[i + 1];
      const pairKey = this.getChainPairKey(chainA, chainB);

      let stats = this.chainPairStats.get(pairKey);
      
      if (!stats) {
        stats = {
          chainA,
          chainB,
          totalTrades: 0,
          successfulTrades: 0,
          totalProfit: BigInt(0),
          averageProfit: BigInt(0),
          averageBridgeTime: 0
        };
        this.chainPairStats.set(pairKey, stats);
      }

      stats.totalTrades++;
      
      if (result.success) {
        stats.successfulTrades++;
        if (result.actualProfit) {
          stats.totalProfit += result.actualProfit;
          stats.averageProfit = stats.totalProfit / BigInt(stats.successfulTrades);
        }
      }

      // Update average bridge time
      const bridgeHops = path.hops.filter(h => h.isBridge && h.bridgeInfo);
      if (bridgeHops.length > 0) {
        const totalBridgeTime = bridgeHops.reduce((sum, h) => 
          sum + (h.bridgeInfo?.estimatedTime || 0), 0
        );
        stats.averageBridgeTime = totalBridgeTime / bridgeHops.length;
      }
    }
  }

  /**
   * Update bridge statistics
   */
  private updateBridgeStats(path: CrossChainPath, result: ExecutionResult): void {
    const bridgeHops = path.hops.filter(h => h.isBridge && h.bridgeInfo);

    for (const hop of bridgeHops) {
      if (!hop.bridgeInfo) continue;

      const bridgeName = hop.bridgeInfo.bridge;
      let stats = this.bridgeStats.get(bridgeName);

      if (!stats) {
        stats = {
          bridgeName,
          totalUses: 0,
          successfulBridges: 0,
          failedBridges: 0,
          successRate: 0,
          averageTime: 0,
          totalFeesSpent: BigInt(0)
        };
        this.bridgeStats.set(bridgeName, stats);
      }

      stats.totalUses++;
      
      if (result.success) {
        stats.successfulBridges++;
      } else {
        stats.failedBridges++;
      }

      stats.successRate = (stats.successfulBridges / stats.totalUses) * 100;
      stats.averageTime = hop.bridgeInfo.estimatedTime;
      
      // Add bridge fee
      const bridgeFee = hop.amountIn - hop.amountOut;
      stats.totalFeesSpent += bridgeFee;
    }
  }

  /**
   * Get analytics summary
   */
  getSummary(): AnalyticsSummary {
    const successfulTrades = this.trades.filter(t => t.result.success).length;
    const failedTrades = this.trades.length - successfulTrades;

    const totalProfit = this.trades.reduce((sum, t) => 
      sum + (t.profit || BigInt(0)), BigInt(0)
    );

    const totalLoss = this.trades.reduce((sum, t) => 
      sum + (t.loss || BigInt(0)), BigInt(0)
    );

    const totalExecutionTime = this.trades.reduce((sum, t) => 
      sum + t.result.executionTime, 0
    );

    const bridgeHops = this.trades.flatMap(t => 
      t.path.hops.filter(h => h.isBridge && h.bridgeInfo)
    );

    const totalBridgeTime = bridgeHops.reduce((sum, h) => 
      sum + (h.bridgeInfo?.estimatedTime || 0), 0
    );

    // Find most profitable chain pair
    let mostProfitableChainPair: ChainPairStats | null = null;
    let maxProfit = BigInt(0);

    for (const stats of this.chainPairStats.values()) {
      if (stats.totalProfit > maxProfit) {
        maxProfit = stats.totalProfit;
        mostProfitableChainPair = stats;
      }
    }

    return {
      totalTrades: this.trades.length,
      successfulTrades,
      failedTrades,
      totalProfit,
      totalLoss,
      netProfit: totalProfit - totalLoss,
      successRate: this.trades.length > 0 ? (successfulTrades / this.trades.length) * 100 : 0,
      averageExecutionTime: this.trades.length > 0 ? totalExecutionTime / this.trades.length : 0,
      averageBridgeTime: bridgeHops.length > 0 ? totalBridgeTime / bridgeHops.length : 0,
      mostProfitableChainPair,
      bridgeStats: Array.from(this.bridgeStats.values())
    };
  }

  /**
   * Get chain pair statistics
   */
  getChainPairStats(chainA: number | string, chainB: number | string): ChainPairStats | null {
    const key = this.getChainPairKey(chainA, chainB);
    return this.chainPairStats.get(key) || null;
  }

  /**
   * Get all chain pair statistics
   */
  getAllChainPairStats(): ChainPairStats[] {
    return Array.from(this.chainPairStats.values())
      .sort((a, b) => Number(b.totalProfit - a.totalProfit));
  }

  /**
   * Get bridge statistics
   */
  getBridgeStats(bridgeName: string): BridgeStats | null {
    return this.bridgeStats.get(bridgeName) || null;
  }

  /**
   * Get all bridge statistics
   */
  getAllBridgeStats(): BridgeStats[] {
    return Array.from(this.bridgeStats.values())
      .sort((a, b) => b.successRate - a.successRate);
  }

  /**
   * Get recent trades
   */
  getRecentTrades(count: number = 10): TradeRecord[] {
    return this.trades.slice(-count).reverse();
  }

  /**
   * Get profitable trades
   */
  getProfitableTrades(): TradeRecord[] {
    return this.trades.filter(t => t.profit && t.profit > 0);
  }

  /**
   * Get failed trades
   */
  getFailedTrades(): TradeRecord[] {
    return this.trades.filter(t => !t.result.success);
  }

  /**
   * Get trades for specific chain pair
   */
  getTradesForChainPair(chainA: number | string, chainB: number | string): TradeRecord[] {
    return this.trades.filter(t => {
      const chains = t.path.chains;
      return chains.includes(chainA) && chains.includes(chainB);
    });
  }

  /**
   * Get trades using specific bridge
   */
  getTradesForBridge(bridgeName: string): TradeRecord[] {
    return this.trades.filter(t => 
      t.path.hops.some(h => h.isBridge && h.bridgeInfo?.bridge === bridgeName)
    );
  }

  /**
   * Calculate ROI for time period
   */
  calculateROI(startTime: number, endTime: number): number {
    const tradesInPeriod = this.trades.filter(t => 
      t.timestamp >= startTime && t.timestamp <= endTime
    );

    if (tradesInPeriod.length === 0) {
      return 0;
    }

    const totalInvested = tradesInPeriod.reduce((sum, t) => 
      sum + t.path.hops[0].amountIn, BigInt(0)
    );

    const totalReturned = tradesInPeriod.reduce((sum, t) => 
      sum + (t.profit || BigInt(0)), BigInt(0)
    );

    if (totalInvested === BigInt(0)) {
      return 0;
    }

    return Number((totalReturned * BigInt(10000)) / totalInvested) / 100;
  }

  /**
   * Export analytics data as JSON
   */
  exportData(): string {
    const summary = this.getSummary();
    return JSON.stringify({
      trades: this.trades.map(t => ({
        id: t.id,
        timestamp: t.timestamp,
        profit: t.profit?.toString(),
        loss: t.loss?.toString(),
        result: {
          success: t.result.success,
          executionTime: t.result.executionTime,
          hopsCompleted: t.result.hopsCompleted,
          error: t.result.error,
          actualProfit: t.result.actualProfit?.toString(),
          gasSpent: t.result.gasSpent?.toString(),
          txHashes: t.result.txHashes
        },
        path: {
          startToken: t.path.startToken,
          endToken: t.path.endToken,
          estimatedProfit: t.path.estimatedProfit.toString(),
          totalGasCost: t.path.totalGasCost.toString(),
          netProfit: t.path.netProfit.toString(),
          totalFees: t.path.totalFees,
          slippageImpact: t.path.slippageImpact,
          bridgeCount: t.path.bridgeCount,
          totalBridgeFees: t.path.totalBridgeFees.toString(),
          estimatedTimeSeconds: t.path.estimatedTimeSeconds,
          chains: t.path.chains,
          hops: t.path.hops.map(h => ({
            dexName: h.dexName,
            poolAddress: h.poolAddress,
            tokenIn: h.tokenIn,
            tokenOut: h.tokenOut,
            amountIn: h.amountIn.toString(),
            amountOut: h.amountOut.toString(),
            fee: h.fee,
            gasEstimate: h.gasEstimate,
            chainId: h.chainId,
            isBridge: h.isBridge,
            bridgeInfo: h.bridgeInfo
          }))
        }
      })),
      summary: {
        totalTrades: summary.totalTrades,
        successfulTrades: summary.successfulTrades,
        failedTrades: summary.failedTrades,
        totalProfit: summary.totalProfit.toString(),
        totalLoss: summary.totalLoss.toString(),
        netProfit: summary.netProfit.toString(),
        successRate: summary.successRate,
        averageExecutionTime: summary.averageExecutionTime,
        averageBridgeTime: summary.averageBridgeTime,
        mostProfitableChainPair: summary.mostProfitableChainPair ? {
          chainA: summary.mostProfitableChainPair.chainA,
          chainB: summary.mostProfitableChainPair.chainB,
          totalTrades: summary.mostProfitableChainPair.totalTrades,
          successfulTrades: summary.mostProfitableChainPair.successfulTrades,
          totalProfit: summary.mostProfitableChainPair.totalProfit.toString(),
          averageProfit: summary.mostProfitableChainPair.averageProfit.toString(),
          averageBridgeTime: summary.mostProfitableChainPair.averageBridgeTime
        } : null,
        bridgeStats: summary.bridgeStats.map(bs => ({
          bridgeName: bs.bridgeName,
          totalUses: bs.totalUses,
          successfulBridges: bs.successfulBridges,
          failedBridges: bs.failedBridges,
          successRate: bs.successRate,
          averageTime: bs.averageTime,
          totalFeesSpent: bs.totalFeesSpent.toString()
        }))
      }
    }, null, 2);
  }

  /**
   * Clear all analytics data
   */
  clear(): void {
    this.trades = [];
    this.chainPairStats.clear();
    this.bridgeStats.clear();
  }

  /**
   * Get chain pair key for consistent mapping
   */
  private getChainPairKey(chainA: number | string, chainB: number | string): string {
    // Sort to ensure consistent key regardless of order
    const sorted = [chainA.toString(), chainB.toString()].sort();
    return `${sorted[0]}-${sorted[1]}`;
  }
}

export default CrossChainAnalytics;
