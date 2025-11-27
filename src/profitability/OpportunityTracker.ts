/**
 * OpportunityTracker - Comprehensive opportunity logging and analysis
 *
 * Implements Phase 5.1 from PROFITABLE_EXECUTION_PLAN.md:
 * - Track ALL opportunities (profitable or not) for analysis
 * - Log detailed information for post-execution analysis
 * - Enable learning from missed and failed opportunities
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Opportunity log entry interface
 */
export interface OpportunityLog {
  id: string;
  timestamp: number;
  blockNumber?: number;
  chainId: number;

  // Path information
  path: string;
  dexes: string[];
  tokens: string[];
  pools: string[];

  // Profit estimation
  estimatedProfit: bigint;
  estimatedProfitUsd?: number;
  estimatedGasCost: bigint;
  netProfit: bigint;
  profitPercentage: number;

  // Execution details
  executed: boolean;
  executionResult?: 'success' | 'failed' | 'reverted' | 'timeout';
  actualProfit?: bigint;
  actualGasCost?: bigint;
  txHash?: string;

  // Analysis
  reason?: string; // Why not executed or why failed
  competitorTook?: boolean;
  competitorAddress?: string;

  // Risk metrics
  slippageEstimate: number;
  liquidityDepth: bigint;
  mevRiskScore?: number;
}

/**
 * Opportunity statistics
 */
export interface OpportunityStats {
  totalOpportunities: number;
  executedOpportunities: number;
  successfulExecutions: number;
  failedExecutions: number;
  missedOpportunities: number;
  competitorsTookOpportunities: number;

  totalEstimatedProfit: bigint;
  totalActualProfit: bigint;
  totalGasCost: bigint;

  avgProfitPercentage: number;
  avgSlippage: number;
  successRate: number;

  byDex: Map<string, number>;
  byChain: Map<number, number>;
  byReason: Map<string, number>;
}

/**
 * OpportunityTracker class for comprehensive opportunity monitoring
 */
export class OpportunityTracker {
  private logFilePath: string;
  private opportunities: OpportunityLog[] = [];
  private maxInMemory: number;
  private stats: OpportunityStats;
  private enabled: boolean;

  constructor(options?: { logFilePath?: string; maxInMemory?: number; enabled?: boolean }) {
    this.logFilePath =
      options?.logFilePath || path.join(process.cwd(), 'logs', 'opportunities.jsonl');
    this.maxInMemory = options?.maxInMemory || 1000;
    this.enabled = options?.enabled ?? true;

    this.stats = this.initializeStats();

    // Ensure log directory exists
    const logDir = path.dirname(this.logFilePath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * Initialize empty stats object
   */
  private initializeStats(): OpportunityStats {
    return {
      totalOpportunities: 0,
      executedOpportunities: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      missedOpportunities: 0,
      competitorsTookOpportunities: 0,
      totalEstimatedProfit: BigInt(0),
      totalActualProfit: BigInt(0),
      totalGasCost: BigInt(0),
      avgProfitPercentage: 0,
      avgSlippage: 0,
      successRate: 0,
      byDex: new Map(),
      byChain: new Map(),
      byReason: new Map(),
    };
  }

  /**
   * Generate unique opportunity ID
   */
  private generateId(): string {
    return `opp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Log a new opportunity (profitable or not)
   */
  logOpportunity(opp: Omit<OpportunityLog, 'id' | 'timestamp'>): string {
    if (!this.enabled) return '';

    const id = this.generateId();
    const entry: OpportunityLog = {
      id,
      timestamp: Date.now(),
      ...opp,
    };

    // Add to in-memory cache
    this.opportunities.push(entry);
    if (this.opportunities.length > this.maxInMemory) {
      this.opportunities.shift();
    }

    // Update stats
    this.updateStats(entry);

    // Write to file (append mode)
    this.writeToFile(entry);

    return id;
  }

  /**
   * Update an existing opportunity with execution results
   */
  updateOpportunity(id: string, update: Partial<OpportunityLog>): void {
    if (!this.enabled) return;

    const idx = this.opportunities.findIndex((o) => o.id === id);
    if (idx !== -1) {
      const updated = { ...this.opportunities[idx], ...update };
      this.opportunities[idx] = updated;

      // Update stats based on new information
      if (update.executed !== undefined || update.executionResult !== undefined) {
        this.recalculateStats();
      }

      // Log the update
      this.writeToFile({ ...update, id, _update: true } as OpportunityLog & { _update: boolean });
    }
  }

  /**
   * Mark opportunity as taken by competitor
   */
  markCompetitorTook(id: string, competitorAddress?: string): void {
    this.updateOpportunity(id, {
      competitorTook: true,
      competitorAddress,
      reason: 'Opportunity taken by competitor',
    });
    this.stats.competitorsTookOpportunities++;
  }

  /**
   * Update statistics based on a new entry
   */
  private updateStats(entry: OpportunityLog): void {
    this.stats.totalOpportunities++;
    this.stats.totalEstimatedProfit += entry.estimatedProfit;

    if (entry.executed) {
      this.stats.executedOpportunities++;
      if (entry.executionResult === 'success') {
        this.stats.successfulExecutions++;
        if (entry.actualProfit) {
          this.stats.totalActualProfit += entry.actualProfit;
        }
      } else {
        this.stats.failedExecutions++;
      }
      if (entry.actualGasCost) {
        this.stats.totalGasCost += entry.actualGasCost;
      }
    } else {
      this.stats.missedOpportunities++;
    }

    // Update by DEX
    for (const dex of entry.dexes) {
      this.stats.byDex.set(dex, (this.stats.byDex.get(dex) || 0) + 1);
    }

    // Update by chain
    this.stats.byChain.set(entry.chainId, (this.stats.byChain.get(entry.chainId) || 0) + 1);

    // Update by reason
    if (entry.reason) {
      this.stats.byReason.set(entry.reason, (this.stats.byReason.get(entry.reason) || 0) + 1);
    }

    // Recalculate averages
    this.recalculateAverages();
  }

  /**
   * Recalculate all statistics from scratch
   */
  private recalculateStats(): void {
    this.stats = this.initializeStats();
    for (const opp of this.opportunities) {
      this.updateStats(opp);
    }
  }

  /**
   * Calculate statistics directly from a list of opportunities (efficient for filtering)
   */
  private calculateStatsFromOpportunities(opps: OpportunityLog[]): OpportunityStats {
    const stats = this.initializeStats();

    for (const entry of opps) {
      stats.totalOpportunities++;
      stats.totalEstimatedProfit += entry.estimatedProfit;

      if (entry.executed) {
        stats.executedOpportunities++;
        if (entry.executionResult === 'success') {
          stats.successfulExecutions++;
          if (entry.actualProfit) {
            stats.totalActualProfit += entry.actualProfit;
          }
        } else {
          stats.failedExecutions++;
        }
        if (entry.actualGasCost) {
          stats.totalGasCost += entry.actualGasCost;
        }
      } else {
        stats.missedOpportunities++;
      }

      if (entry.competitorTook) {
        stats.competitorsTookOpportunities++;
      }

      // Update by DEX
      for (const dex of entry.dexes) {
        stats.byDex.set(dex, (stats.byDex.get(dex) || 0) + 1);
      }

      // Update by chain
      stats.byChain.set(entry.chainId, (stats.byChain.get(entry.chainId) || 0) + 1);

      // Update by reason
      if (entry.reason) {
        stats.byReason.set(entry.reason, (stats.byReason.get(entry.reason) || 0) + 1);
      }
    }

    // Calculate averages
    if (opps.length > 0) {
      let totalProfit = 0;
      let totalSlippage = 0;
      for (const opp of opps) {
        totalProfit += opp.profitPercentage;
        totalSlippage += opp.slippageEstimate;
      }
      stats.avgProfitPercentage = totalProfit / opps.length;
      stats.avgSlippage = totalSlippage / opps.length;
    }

    if (stats.executedOpportunities > 0) {
      stats.successRate = (stats.successfulExecutions / stats.executedOpportunities) * 100;
    }

    return stats;
  }

  /**
   * Recalculate average values
   */
  private recalculateAverages(): void {
    if (this.stats.totalOpportunities > 0) {
      let totalProfit = 0;
      let totalSlippage = 0;
      for (const opp of this.opportunities) {
        totalProfit += opp.profitPercentage;
        totalSlippage += opp.slippageEstimate;
      }
      this.stats.avgProfitPercentage = totalProfit / this.opportunities.length;
      this.stats.avgSlippage = totalSlippage / this.opportunities.length;
    }

    if (this.stats.executedOpportunities > 0) {
      this.stats.successRate =
        (this.stats.successfulExecutions / this.stats.executedOpportunities) * 100;
    }
  }

  /**
   * Write entry to JSONL file
   */
  private writeToFile(entry: OpportunityLog | (OpportunityLog & { _update: boolean })): void {
    try {
      // Convert BigInt to string for JSON serialization
      const serializable = this.serializeForJson(entry as unknown as Record<string, unknown>);
      const line = JSON.stringify(serializable) + '\n';
      fs.appendFileSync(this.logFilePath, line);
    } catch (error) {
      console.error('Failed to write opportunity log:', error);
    }
  }

  /**
   * Convert BigInt values to strings for JSON serialization
   */
  private serializeForJson(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'bigint') {
        result[key] = value.toString();
      } else if (Array.isArray(value)) {
        result[key] = value.map((v) => (typeof v === 'bigint' ? v.toString() : v));
      } else if (value !== null && typeof value === 'object') {
        result[key] = this.serializeForJson(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * Get current statistics
   */
  getStats(): OpportunityStats {
    return { ...this.stats };
  }

  /**
   * Get recent opportunities
   */
  getRecentOpportunities(limit: number = 100): OpportunityLog[] {
    return this.opportunities.slice(-limit);
  }

  /**
   * Get opportunities by filter
   */
  filterOpportunities(filter: {
    executed?: boolean;
    successful?: boolean;
    chainId?: number;
    dex?: string;
    minProfit?: bigint;
    since?: number;
  }): OpportunityLog[] {
    return this.opportunities.filter((opp) => {
      if (filter.executed !== undefined && opp.executed !== filter.executed) return false;
      if (
        filter.successful !== undefined &&
        (opp.executionResult === 'success') !== filter.successful
      )
        return false;
      if (filter.chainId !== undefined && opp.chainId !== filter.chainId) return false;
      if (filter.dex !== undefined && !opp.dexes.includes(filter.dex)) return false;
      if (filter.minProfit !== undefined && opp.estimatedProfit < filter.minProfit) return false;
      if (filter.since !== undefined && opp.timestamp < filter.since) return false;
      return true;
    });
  }

  /**
   * Get analysis summary for a time period
   */
  getAnalysisSummary(
    startTime?: number,
    endTime?: number
  ): {
    period: { start: number; end: number };
    stats: OpportunityStats;
    topDexes: Array<{ dex: string; count: number }>;
    topReasons: Array<{ reason: string; count: number }>;
    profitTrend: Array<{ timestamp: number; profit: bigint }>;
  } {
    const start = startTime || Date.now() - 24 * 60 * 60 * 1000; // Last 24 hours
    const end = endTime || Date.now();

    const filtered = this.opportunities.filter((o) => o.timestamp >= start && o.timestamp <= end);

    // Calculate stats directly from filtered data (more efficient than creating new tracker)
    const periodStats = this.calculateStatsFromOpportunities(filtered);

    // Top DEXes
    const topDexes = Array.from(periodStats.byDex.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([dex, count]) => ({ dex, count }));

    // Top reasons for missed opportunities
    const topReasons = Array.from(periodStats.byReason.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([reason, count]) => ({ reason, count }));

    // Profit trend (hourly buckets)
    const hourMs = 60 * 60 * 1000;
    const profitTrend: Array<{ timestamp: number; profit: bigint }> = [];
    for (let t = start; t < end; t += hourMs) {
      const hourOpps = filtered.filter((o) => o.timestamp >= t && o.timestamp < t + hourMs);
      const hourProfit = hourOpps.reduce(
        (sum, o) => sum + (o.actualProfit || o.estimatedProfit),
        BigInt(0)
      );
      profitTrend.push({ timestamp: t, profit: hourProfit });
    }

    return {
      period: { start, end },
      stats: periodStats,
      topDexes,
      topReasons,
      profitTrend,
    };
  }

  /**
   * Export all data to JSON file
   */
  exportToJson(filePath: string): void {
    const data = {
      exportedAt: new Date().toISOString(),
      stats: this.serializeForJson(this.stats as unknown as Record<string, unknown>),
      opportunities: this.opportunities.map((o) =>
        this.serializeForJson(o as unknown as Record<string, unknown>)
      ),
    };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  /**
   * Clear in-memory data (file logs preserved)
   */
  clearMemory(): void {
    this.opportunities = [];
    this.stats = this.initializeStats();
  }

  /**
   * Enable/disable tracking
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if tracking is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Export singleton instance
export const opportunityTracker = new OpportunityTracker();

export default OpportunityTracker;
