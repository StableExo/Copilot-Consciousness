/**
 * RealtimeDataPipeline
 * 
 * Aggregates and filters events from multiple WebSocket streams.
 * Implements backpressure handling and maintains sliding window for trend analysis.
 */

import { EventEmitter } from 'events';
import { PoolEvent } from './WebSocketStreamManager';
import { EventFilterConfig } from '../../config/realtime.config';

/**
 * Filtered pool event with additional metadata
 */
export interface FilteredPoolEvent extends PoolEvent {
  priority: 'high' | 'medium' | 'low';
  priceDelta?: number;
  liquidityChange?: bigint;
}

/**
 * Price data for trend analysis
 */
interface PriceDataPoint {
  timestamp: number;
  reserve0: bigint;
  reserve1: bigint;
  price: number; // reserve1/reserve0
}

/**
 * Pipeline metrics
 */
export interface PipelineMetrics {
  eventsReceived: number;
  eventsFiltered: number;
  eventsEmitted: number;
  eventsDropped: number;
  averageLatencyMs: number;
  throughputPerSecond: number;
  queueSize: number;
  lastEventTimestamp: number;
}

/**
 * Real-Time Data Pipeline
 * 
 * Processes and filters pool events with backpressure handling and trend analysis.
 */
export class RealtimeDataPipeline extends EventEmitter {
  private filterConfig: EventFilterConfig;
  private maxQueueSize: number;
  private dropStrategy: 'oldest' | 'newest' | 'none';
  private eventQueue: FilteredPoolEvent[] = [];
  private priceHistory: Map<string, PriceDataPoint[]> = new Map();
  private slidingWindowMs: number = 60000; // 1 minute default
  private metrics: PipelineMetrics = {
    eventsReceived: 0,
    eventsFiltered: 0,
    eventsEmitted: 0,
    eventsDropped: 0,
    averageLatencyMs: 0,
    throughputPerSecond: 0,
    queueSize: 0,
    lastEventTimestamp: 0,
  };
  private latencySum: number = 0;
  private throughputWindow: number[] = [];
  private throughputWindowMs: number = 1000; // 1 second window
  private isProcessing: boolean = false;
  private metricsInterval: NodeJS.Timeout | null = null;

  constructor(
    filterConfig: EventFilterConfig,
    maxQueueSize: number = 1000,
    dropStrategy: 'oldest' | 'newest' | 'none' = 'oldest',
    slidingWindowMs: number = 60000
  ) {
    super();
    this.filterConfig = filterConfig;
    this.maxQueueSize = maxQueueSize;
    this.dropStrategy = dropStrategy;
    this.slidingWindowMs = slidingWindowMs;

    // Start metrics tracking
    this.startMetricsTracking();
  }

  /**
   * Process incoming pool event
   */
  async processEvent(event: PoolEvent): Promise<void> {
    this.metrics.eventsReceived++;
    this.metrics.lastEventTimestamp = Date.now();

    // Calculate latency
    const latency = Date.now() - event.timestamp;
    this.latencySum += latency;
    this.metrics.averageLatencyMs = this.latencySum / this.metrics.eventsReceived;

    // Update price history
    this.updatePriceHistory(event);

    // Filter event
    const filteredEvent = await this.filterEvent(event);

    if (!filteredEvent) {
      this.metrics.eventsFiltered++;
      return;
    }

    // Handle backpressure
    if (this.eventQueue.length >= this.maxQueueSize) {
      await this.handleBackpressure(filteredEvent);
    } else {
      this.eventQueue.push(filteredEvent);
      this.metrics.queueSize = this.eventQueue.length;
    }

    // Track throughput
    this.throughputWindow.push(Date.now());

    // Process queue if not already processing
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Filter event based on configuration criteria
   */
  private async filterEvent(event: PoolEvent): Promise<FilteredPoolEvent | null> {
    // Check liquidity threshold for Sync events
    if (event.eventType === 'Sync' && event.reserve0 !== undefined && event.reserve1 !== undefined) {
      // Use sum of both reserves as total liquidity
      // For more precise calculations, geometric mean (sqrt(reserve0 * reserve1)) could be used
      const totalLiquidity = event.reserve0 + event.reserve1;
      
      if (totalLiquidity < this.filterConfig.minLiquidity) {
        return null; // Below minimum liquidity
      }
    }

    // Calculate price delta
    const priceDelta = this.calculatePriceDelta(event);
    
    // Filter by price delta
    if (priceDelta !== null && Math.abs(priceDelta) < this.filterConfig.minPriceDelta) {
      return null; // Price change too small
    }

    // Determine priority
    const priority = this.determinePriority(event, priceDelta);

    // Create filtered event
    const filteredEvent: FilteredPoolEvent = {
      ...event,
      priority,
      priceDelta: priceDelta !== null ? priceDelta : undefined,
    };

    return filteredEvent;
  }

  /**
   * Calculate price delta compared to recent history
   */
  private calculatePriceDelta(event: PoolEvent): number | null {
    if (event.reserve0 === undefined || event.reserve1 === undefined) {
      return null;
    }

    const history = this.priceHistory.get(event.poolAddress);
    if (!history || history.length === 0) {
      return null;
    }

    // Calculate current price
    const currentPrice = Number(event.reserve1) / Number(event.reserve0);

    // Get recent average price
    const recentPrices = history.slice(-10); // Last 10 data points
    const avgPrice = recentPrices.reduce((sum, dp) => sum + dp.price, 0) / recentPrices.length;

    // Calculate delta
    const delta = (currentPrice - avgPrice) / avgPrice;

    return delta;
  }

  /**
   * Determine event priority
   */
  private determinePriority(event: PoolEvent, priceDelta: number | null): 'high' | 'medium' | 'low' {
    // High priority for large price movements
    if (priceDelta !== null && Math.abs(priceDelta) > 0.02) {
      return 'high';
    }

    // High priority for large swaps
    if (event.eventType === 'Swap') {
      const amount0 = event.amount0Out || BigInt(0);
      const amount1 = event.amount1Out || BigInt(0);
      const maxAmount = amount0 > amount1 ? amount0 : amount1;
      
      if (maxAmount > this.filterConfig.minLiquidity / BigInt(10)) {
        return 'high';
      }
    }

    // Medium priority for sync events with price changes
    if (event.eventType === 'Sync' && priceDelta !== null) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Update price history for trend analysis
   */
  private updatePriceHistory(event: PoolEvent): void {
    if (event.reserve0 === undefined || event.reserve1 === undefined) {
      return;
    }

    let history = this.priceHistory.get(event.poolAddress);
    if (!history) {
      history = [];
      this.priceHistory.set(event.poolAddress, history);
    }

    const dataPoint: PriceDataPoint = {
      timestamp: event.timestamp,
      reserve0: event.reserve0,
      reserve1: event.reserve1,
      price: Number(event.reserve1) / Number(event.reserve0),
    };

    history.push(dataPoint);

    // Remove old data points outside sliding window
    const cutoffTime = Date.now() - this.slidingWindowMs;
    const validDataPoints = history.filter(dp => dp.timestamp >= cutoffTime);
    this.priceHistory.set(event.poolAddress, validDataPoints);
  }

  /**
   * Handle backpressure when queue is full
   */
  private async handleBackpressure(newEvent: FilteredPoolEvent): Promise<void> {
    this.metrics.eventsDropped++;

    switch (this.dropStrategy) {
      case 'oldest': {
        // Remove oldest low-priority event
        const oldestLowPriorityIndex = this.eventQueue.findIndex(
          e => e.priority === 'low'
        );
        if (oldestLowPriorityIndex !== -1) {
          this.eventQueue.splice(oldestLowPriorityIndex, 1);
          this.eventQueue.push(newEvent);
        } else {
          // If no low-priority events, drop the new event
          this.emit('eventDropped', newEvent);
        }
        break;
      }
      case 'newest':
        // Don't add the new event
        this.emit('eventDropped', newEvent);
        break;

      case 'none':
        // Still add to queue (will exceed max size)
        this.eventQueue.push(newEvent);
        break;
    }

    this.metrics.queueSize = this.eventQueue.length;
    this.emit('backpressure', { queueSize: this.eventQueue.length, maxSize: this.maxQueueSize });
  }

  /**
   * Process event queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.eventQueue.length > 0) {
      // Process high-priority events first
      const highPriorityIndex = this.eventQueue.findIndex(e => e.priority === 'high');
      const eventIndex = highPriorityIndex !== -1 ? highPriorityIndex : 0;
      
      const event = this.eventQueue.splice(eventIndex, 1)[0];
      this.metrics.queueSize = this.eventQueue.length;

      // Emit filtered event
      this.emit('filteredEvent', event);
      this.metrics.eventsEmitted++;

      // Small delay to prevent overwhelming consumers
      await new Promise(resolve => setTimeout(resolve, 1));
    }

    this.isProcessing = false;
  }

  /**
   * Get price trend for a specific pool
   */
  getPriceTrend(poolAddress: string, windowMs?: number): PriceDataPoint[] {
    const history = this.priceHistory.get(poolAddress);
    if (!history) {
      return [];
    }

    if (windowMs) {
      const cutoffTime = Date.now() - windowMs;
      return history.filter(dp => dp.timestamp >= cutoffTime);
    }

    return [...history];
  }

  /**
   * Get current metrics
   */
  getMetrics(): PipelineMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      eventsReceived: 0,
      eventsFiltered: 0,
      eventsEmitted: 0,
      eventsDropped: 0,
      averageLatencyMs: 0,
      throughputPerSecond: 0,
      queueSize: this.eventQueue.length,
      lastEventTimestamp: 0,
    };
    this.latencySum = 0;
    this.throughputWindow = [];
  }

  /**
   * Start metrics tracking
   */
  private startMetricsTracking(): void {
    this.metricsInterval = setInterval(() => {
      // Calculate throughput
      const now = Date.now();
      const cutoff = now - this.throughputWindowMs;
      this.throughputWindow = this.throughputWindow.filter(ts => ts >= cutoff);
      this.metrics.throughputPerSecond = this.throughputWindow.length / (this.throughputWindowMs / 1000);

      // Emit metrics
      this.emit('metrics', this.metrics);
    }, 1000); // Update every second
  }

  /**
   * Clear price history
   */
  clearPriceHistory(): void {
    this.priceHistory.clear();
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.eventQueue.length;
  }

  /**
   * Stop metrics tracking and cleanup
   */
  destroy(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
    this.removeAllListeners();
  }
}
