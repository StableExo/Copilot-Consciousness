/**
 * EventDrivenTrigger
 *
 * Event-driven arbitrage trigger that responds to real-time pool events.
 * Calculates profitability and triggers arbitrage execution when opportunities are detected.
 */

import { EventEmitter } from 'events';
import { FilteredPoolEvent } from '../dex/monitoring/RealtimeDataPipeline';
import { ArbitrageOrchestrator } from './ArbitrageOrchestrator';
import { ProfitabilityConfig } from '../config/realtime.config';
import { ArbitragePath } from './types';

/**
 * Opportunity detection result
 */
export interface OpportunityDetection {
  poolAddress: string;
  event: FilteredPoolEvent;
  estimatedProfit: bigint;
  profitPercent: number;
  paths: ArbitragePath[];
  timestamp: number;
  triggered: boolean;
}

/**
 * Trigger performance metrics
 */
export interface TriggerMetrics {
  opportunitiesDetected: number;
  opportunitiesTriggered: number;
  successfulExecutions: number;
  failedExecutions: number;
  totalProfitEstimated: bigint;
  averageLatencyMs: number;
  debounceSkips: number;
}

/**
 * Event-Driven Arbitrage Trigger
 *
 * Monitors filtered pool events and triggers arbitrage calculations when profitable opportunities are detected.
 */
export class EventDrivenTrigger extends EventEmitter {
  private orchestrator: ArbitrageOrchestrator;
  private profitabilityConfig: ProfitabilityConfig;
  private debounceWindowMs: number;
  private enableDebouncing: boolean;
  private lastTriggerTime: Map<string, number> = new Map();
  private metrics: TriggerMetrics = {
    opportunitiesDetected: 0,
    opportunitiesTriggered: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    totalProfitEstimated: BigInt(0),
    averageLatencyMs: 0,
    debounceSkips: 0,
  };
  private latencySum: number = 0;
  private isProcessing: boolean = false;
  private processingQueue: FilteredPoolEvent[] = [];

  constructor(
    orchestrator: ArbitrageOrchestrator,
    profitabilityConfig: ProfitabilityConfig,
    debounceWindowMs: number = 100,
    enableDebouncing: boolean = true
  ) {
    super();
    this.orchestrator = orchestrator;
    this.profitabilityConfig = profitabilityConfig;
    this.debounceWindowMs = debounceWindowMs;
    this.enableDebouncing = enableDebouncing;
  }

  /**
   * Handle incoming filtered pool event
   */
  async handleEvent(event: FilteredPoolEvent): Promise<void> {
    const startTime = Date.now();

    // Check debouncing
    if (this.enableDebouncing && this.shouldDebounce(event.poolAddress)) {
      this.metrics.debounceSkips++;
      this.emit('debounced', { poolAddress: event.poolAddress });
      return;
    }

    // Update last trigger time
    this.lastTriggerTime.set(event.poolAddress, Date.now());

    // Queue event for processing
    this.processingQueue.push(event);

    // Process queue if not already processing
    if (!this.isProcessing) {
      await this.processQueue();
    }

    // Update latency metrics
    const latency = Date.now() - startTime;
    this.latencySum += latency;
    this.metrics.averageLatencyMs = this.latencySum / (this.metrics.opportunitiesDetected || 1);
  }

  /**
   * Process the event queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    while (this.processingQueue.length > 0) {
      const event = this.processingQueue.shift()!;
      await this.processEvent(event);
    }

    this.isProcessing = false;
  }

  /**
   * Process a single event
   */
  private async processEvent(event: FilteredPoolEvent): Promise<void> {
    try {
      // Calculate profitability
      const detection = await this.detectOpportunity(event);

      this.metrics.opportunitiesDetected++;

      // Check if opportunity meets threshold
      if (
        detection.estimatedProfit >= this.profitabilityConfig.minProfitAbsolute &&
        detection.profitPercent >= this.profitabilityConfig.minProfitPercent
      ) {
        // Trigger arbitrage
        await this.triggerArbitrage(detection);
      } else {
        // Emit detection but don't trigger
        this.emit('opportunityDetected', detection);
      }
    } catch (error) {
      this.emit('error', { event, error });
    }
  }

  /**
   * Detect arbitrage opportunity from pool event
   */
  private async detectOpportunity(event: FilteredPoolEvent): Promise<OpportunityDetection> {
    // Extract tokens from event (simplified - in production, would need to fetch token info)
    const tokens = await this.getTokensFromPool(event.poolAddress);

    // Find arbitrage paths
    const startAmount = this.calculateOptimalStartAmount(event);
    const paths = await this.orchestrator.findOpportunities(tokens, startAmount);

    // Calculate estimated profit
    let estimatedProfit = BigInt(0);
    let profitPercent = 0;

    if (paths.length > 0) {
      // Use best path
      const bestPath = paths[0];
      estimatedProfit = bestPath.netProfit;
      profitPercent = (Number(bestPath.netProfit) / Number(startAmount)) * 100;
    }

    const detection: OpportunityDetection = {
      poolAddress: event.poolAddress,
      event,
      estimatedProfit,
      profitPercent,
      paths,
      timestamp: Date.now(),
      triggered: false,
    };

    return detection;
  }

  /**
   * Trigger arbitrage execution
   */
  private async triggerArbitrage(detection: OpportunityDetection): Promise<void> {
    try {
      this.metrics.opportunitiesTriggered++;
      this.metrics.totalProfitEstimated += detection.estimatedProfit;

      detection.triggered = true;

      // Emit opportunity event
      this.emit('opportunityTriggered', detection);

      // In production, this would execute the arbitrage transaction
      // For now, we just emit the event with the best path
      if (detection.paths.length > 0) {
        this.emit('arbitrageExecute', {
          path: detection.paths[0],
          detection,
        });

        // Simulate execution success/failure
        // In production, this would be based on actual transaction result
        this.metrics.successfulExecutions++;
        this.emit('arbitrageSuccess', detection);
      }
    } catch (error) {
      this.metrics.failedExecutions++;
      this.emit('arbitrageFailure', { detection, error });
    }
  }

  /**
   * Check if event should be debounced
   */
  private shouldDebounce(poolAddress: string): boolean {
    const lastTrigger = this.lastTriggerTime.get(poolAddress);

    if (!lastTrigger) {
      return false;
    }

    const timeSinceLastTrigger = Date.now() - lastTrigger;
    return timeSinceLastTrigger < this.debounceWindowMs;
  }

  /**
   * Get tokens from pool address
   *
   * TODO: This is a simplified implementation that returns common tokens.
   * In production, this should:
   * 1. Query the pool contract to get actual token0 and token1 addresses
   * 2. Cache the result for subsequent calls
   * 3. Handle errors gracefully
   *
   * Example implementation:
   * ```
   * const poolContract = new ethers.Contract(poolAddress, poolABI, provider);
   * const token0 = await poolContract.token0();
   * const token1 = await poolContract.token1();
   * return [token0, token1, commonBaseTokens...];
   * ```
   */
  private async getTokensFromPool(poolAddress: string): Promise<string[]> {
    // Return a default set of common tokens
    // This enables the system to find arbitrage paths involving these tokens
    return [
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
      '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
    ];
  }

  /**
   * Calculate optimal start amount for arbitrage
   */
  private calculateOptimalStartAmount(event: FilteredPoolEvent): bigint {
    // Simplified calculation - in production, this would be more sophisticated
    // based on pool reserves and gas costs

    if (event.reserve0 !== undefined && event.reserve1 !== undefined) {
      // Use 1% of smaller reserve as start amount
      const minReserve = event.reserve0 < event.reserve1 ? event.reserve0 : event.reserve1;
      return minReserve / BigInt(100);
    }

    // Default to 1 ETH
    return BigInt('1000000000000000000');
  }

  /**
   * Get current metrics
   */
  getMetrics(): TriggerMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      opportunitiesDetected: 0,
      opportunitiesTriggered: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      totalProfitEstimated: BigInt(0),
      averageLatencyMs: 0,
      debounceSkips: 0,
    };
    this.latencySum = 0;
  }

  /**
   * Update profitability configuration
   */
  updateConfig(config: Partial<ProfitabilityConfig>): void {
    this.profitabilityConfig = {
      ...this.profitabilityConfig,
      ...config,
    };
  }

  /**
   * Enable/disable debouncing
   */
  setDebouncing(enabled: boolean): void {
    this.enableDebouncing = enabled;
  }

  /**
   * Clear debounce cache
   */
  clearDebounceCache(): void {
    this.lastTriggerTime.clear();
  }

  /**
   * Get processing queue size
   */
  getQueueSize(): number {
    return this.processingQueue.length;
  }
}
