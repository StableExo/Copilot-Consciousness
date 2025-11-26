/**
 * GasFilterService - Pre-execution profitability filtering
 *
 * Filters arbitrage opportunities based on current gas prices
 */

import { ArbitragePath } from '../arbitrage/types';
import { GasPriceOracle } from './GasPriceOracle';

export interface FilterConfig {
  maxGasCostPercentage: number; // Max % of profit that can be gas costs
  minProfitThreshold: bigint; // Minimum net profit required
  queueThreshold: number; // Queue if gas is above this % but below max
}

export interface MissedOpportunity {
  path: ArbitragePath;
  timestamp: number;
  reason: string;
  gasCost: bigint;
  gasCostPercentage: number;
}

export interface QueuedOpportunity {
  path: ArbitragePath;
  maxGasPrice: bigint;
  queuedAt: number;
}

export class GasFilterService {
  private oracle: GasPriceOracle;
  private config: FilterConfig;
  private missedOpportunities: MissedOpportunity[];
  private queue: QueuedOpportunity[];

  constructor(oracle: GasPriceOracle, config: FilterConfig) {
    this.oracle = oracle;
    this.config = config;
    this.missedOpportunities = [];
    this.queue = [];
  }

  /**
   * Check if arbitrage path is executable at current gas prices
   */
  async isExecutable(path: ArbitragePath, currentGasPrice?: bigint): Promise<boolean> {
    // Get current gas price if not provided
    if (!currentGasPrice) {
      const gasData = await this.oracle.getCurrentGasPrice('normal');
      currentGasPrice = gasData.maxFeePerGas;
    }

    // Calculate gas cost
    const gasCost = BigInt(path.totalGasCost) * currentGasPrice;
    const netProfit = path.estimatedProfit - gasCost;

    // Check minimum profit threshold
    if (netProfit < this.config.minProfitThreshold) {
      this.recordMissedOpportunity(path, gasCost, 'Below minimum profit threshold');
      return false;
    }

    // Calculate gas cost as percentage of gross profit
    const gasCostPercentage =
      path.estimatedProfit > BigInt(0)
        ? Number((gasCost * BigInt(10000)) / path.estimatedProfit) / 100
        : 100;

    // If gas cost exceeds max percentage, check if it should be queued
    if (gasCostPercentage > this.config.maxGasCostPercentage) {
      this.recordMissedOpportunity(path, gasCost, 'Gas cost too high');
      return false;
    }

    // If gas cost is in the queue threshold range, queue it
    if (gasCostPercentage > this.config.queueThreshold) {
      this.queueForLaterExecution(path, currentGasPrice);
      return false;
    }

    return true;
  }

  /**
   * Queue opportunity for execution when gas is cheaper
   */
  queueForLaterExecution(path: ArbitragePath, maxGasPrice: bigint): void {
    // Check if already queued
    const existing = this.queue.find((q) => this.pathsAreEqual(q.path, path));

    if (existing) {
      // Update max gas price
      existing.maxGasPrice = maxGasPrice;
      return;
    }

    // Add to queue
    this.queue.push({
      path,
      maxGasPrice,
      queuedAt: Date.now(),
    });

    // Limit queue size (keep only most recent 100)
    if (this.queue.length > 100) {
      this.queue.shift();
    }
  }

  /**
   * Get missed opportunities
   */
  getMissedOpportunities(): MissedOpportunity[] {
    return [...this.missedOpportunities];
  }

  /**
   * Get queued opportunities that are now executable
   */
  async getExecutableQueuedOpportunities(): Promise<ArbitragePath[]> {
    const currentGasPrice = await this.oracle.getCurrentGasPrice('normal');
    const executable: ArbitragePath[] = [];

    this.queue = this.queue.filter((queued) => {
      if (currentGasPrice.maxFeePerGas <= queued.maxGasPrice) {
        executable.push(queued.path);
        return false; // Remove from queue
      }
      return true; // Keep in queue
    });

    return executable;
  }

  /**
   * Predict optimal execution time for a path
   */
  async getOptimalExecutionTime(path: ArbitragePath): Promise<number> {
    // Use historical gas data to predict when gas will be cheap enough
    const historical = this.oracle.getHistoricalPrices();

    if (historical.length < 10) {
      // Not enough data, return current time
      return Date.now();
    }

    // Calculate required gas price for profitability
    const requiredGasPrice = this.calculateRequiredGasPrice(path);

    // Find average time of day when gas is below required price
    const cheapHours = new Set<number>();

    for (const price of historical) {
      if (price.maxFeePerGas <= requiredGasPrice) {
        const hour = new Date(price.timestamp).getHours();
        cheapHours.add(hour);
      }
    }

    if (cheapHours.size === 0) {
      // Gas never cheap enough, return current time
      return Date.now();
    }

    // Find next occurrence of a cheap hour
    const now = new Date();
    const currentHour = now.getHours();
    const cheapHoursArray = Array.from(cheapHours).sort((a, b) => a - b);

    // Find next cheap hour
    let nextCheapHour = cheapHoursArray.find((h) => h > currentHour);
    if (!nextCheapHour) {
      // Wrap around to tomorrow
      nextCheapHour = cheapHoursArray[0];
    }

    // Calculate time until next cheap hour
    const hoursUntil =
      nextCheapHour > currentHour ? nextCheapHour - currentHour : 24 - currentHour + nextCheapHour;

    return Date.now() + hoursUntil * 60 * 60 * 1000;
  }

  /**
   * Get queued opportunities count
   */
  getQueuedCount(): number {
    return this.queue.length;
  }

  /**
   * Get missed opportunities count
   */
  getMissedCount(): number {
    return this.missedOpportunities.length;
  }

  /**
   * Clear queued opportunities
   */
  clearQueue(): void {
    this.queue = [];
  }

  /**
   * Clear missed opportunities history
   */
  clearMissedOpportunities(): void {
    this.missedOpportunities = [];
  }

  /**
   * Update filter configuration
   */
  updateConfig(config: Partial<FilterConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): FilterConfig {
    return { ...this.config };
  }

  /**
   * Record missed opportunity
   */
  private recordMissedOpportunity(path: ArbitragePath, gasCost: bigint, reason: string): void {
    const gasCostPercentage =
      path.estimatedProfit > BigInt(0)
        ? Number((gasCost * BigInt(10000)) / path.estimatedProfit) / 100
        : 100;

    this.missedOpportunities.push({
      path,
      timestamp: Date.now(),
      reason,
      gasCost,
      gasCostPercentage,
    });

    // Limit history size (keep only last 500)
    if (this.missedOpportunities.length > 500) {
      this.missedOpportunities.shift();
    }
  }

  /**
   * Calculate required gas price for profitability
   */
  private calculateRequiredGasPrice(path: ArbitragePath): bigint {
    // Calculate max gas price where profit would meet minimum threshold
    const maxGasCost = (path.estimatedProfit * BigInt(this.config.queueThreshold)) / BigInt(100);
    const gasUnits = BigInt(path.totalGasCost);

    if (gasUnits === BigInt(0)) {
      return BigInt(0);
    }

    return maxGasCost / gasUnits;
  }

  /**
   * Compare two paths for equality
   */
  private pathsAreEqual(path1: ArbitragePath, path2: ArbitragePath): boolean {
    if (path1.hops.length !== path2.hops.length) {
      return false;
    }

    for (let i = 0; i < path1.hops.length; i++) {
      const hop1 = path1.hops[i];
      const hop2 = path2.hops[i];

      if (
        hop1.poolAddress !== hop2.poolAddress ||
        hop1.tokenIn !== hop2.tokenIn ||
        hop1.tokenOut !== hop2.tokenOut
      ) {
        return false;
      }
    }

    return true;
  }
}
