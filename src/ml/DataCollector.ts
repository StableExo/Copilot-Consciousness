/**
 * DataCollector - Comprehensive data collection system for ML
 * 
 * Captures price feeds, order book depth, transaction history, gas prices,
 * liquidity changes, and market indicators for ML model training.
 */

import { EventEmitter } from 'events';
import { getMLConfig, MLConfig } from '../config/ml.config';
import { PriceDataPoint, DataCollectionEvent } from './types';

export interface CollectorStats {
  dataPointsCollected: number;
  lastCollectionTime: number;
  activeChains: Set<number | string>;
  activeTokens: Set<string>;
  storageSize: number;
  errors: number;
}

/**
 * DataCollector - Collects and stores market data for ML training
 */
export class DataCollector extends EventEmitter {
  private config: MLConfig;
  private isRunning: boolean = false;
  private collectionInterval?: NodeJS.Timeout;
  private dataBuffer: PriceDataPoint[] = [];
  private stats: CollectorStats;
  private maxBufferSize: number = 10000;

  constructor(config?: Partial<MLConfig>) {
    super();
    this.config = config ? { ...getMLConfig(), ...config } : getMLConfig();
    this.stats = {
      dataPointsCollected: 0,
      lastCollectionTime: 0,
      activeChains: new Set(),
      activeTokens: new Set(),
      storageSize: 0,
      errors: 0,
    };
  }

  /**
   * Start data collection
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    if (!this.config.dataCollection.enabled) {
      console.log('[DataCollector] Data collection is disabled in config');
      return;
    }

    this.isRunning = true;
    console.log(`[DataCollector] Starting data collection (interval: ${this.config.dataCollection.interval}ms)`);

    // Start periodic collection
    this.collectionInterval = setInterval(
      () => this.collectData(),
      this.config.dataCollection.interval
    );

    this.emit('started');
  }

  /**
   * Stop data collection
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = undefined;
    }

    console.log('[DataCollector] Data collection stopped');
    this.emit('stopped');
  }

  /**
   * Collect current market data
   */
  private async collectData(): Promise<void> {
    try {
      const timestamp = Date.now();
      
      // This is a placeholder - in production, integrate with:
      // - CrossChainScanner for price feeds
      // - DEX adapters for order book data
      // - Gas oracles for gas prices
      // - WebSocket streams for real-time data
      
      // For now, emit event that data collection occurred
      this.emit('collection', { timestamp });
      this.stats.lastCollectionTime = timestamp;
      
    } catch (error) {
      this.stats.errors++;
      this.emit('error', error);
      console.error('[DataCollector] Collection error:', error);
    }
  }

  /**
   * Record a price data point
   */
  recordPrice(dataPoint: PriceDataPoint): void {
    // Add to buffer
    this.dataBuffer.push(dataPoint);
    this.stats.dataPointsCollected++;
    this.stats.activeChains.add(dataPoint.chain);
    this.stats.activeTokens.add(dataPoint.tokenAddress);

    // Emit event for real-time processing
    this.emit('data', {
      type: 'price',
      timestamp: dataPoint.timestamp,
      data: dataPoint,
    } as DataCollectionEvent);

    // Flush buffer if it gets too large
    if (this.dataBuffer.length >= this.maxBufferSize) {
      this.flushBuffer();
    }
  }

  /**
   * Record arbitrage execution
   */
  recordArbitrageExecution(execution: {
    timestamp: number;
    path: any;
    result: 'success' | 'failed' | 'reverted';
    profit?: bigint;
    gasUsed?: bigint;
    chainId: number | string;
  }): void {
    this.emit('data', {
      type: 'arbitrage',
      timestamp: execution.timestamp,
      data: execution,
    } as DataCollectionEvent);

    // Store for training data
    this.emit('training_data', execution);
  }

  /**
   * Record gas price
   */
  recordGasPrice(chainId: number | string, gasPrice: bigint, timestamp?: number): void {
    const ts = timestamp || Date.now();
    
    this.emit('data', {
      type: 'gas',
      timestamp: ts,
      data: { chainId, gasPrice, timestamp: ts },
    } as DataCollectionEvent);
  }

  /**
   * Flush data buffer to storage
   */
  private async flushBuffer(): Promise<void> {
    if (this.dataBuffer.length === 0) {
      return;
    }

    try {
      // In production, this would write to TimescaleDB/InfluxDB
      // For now, emit event
      this.emit('flush', {
        dataPoints: this.dataBuffer.length,
        timestamp: Date.now(),
      });

      this.stats.storageSize += this.dataBuffer.length;
      this.dataBuffer = [];
      
    } catch (error) {
      this.stats.errors++;
      console.error('[DataCollector] Flush error:', error);
    }
  }

  /**
   * Get historical data for a token
   */
  async getHistoricalData(
    chainId: number | string,
    tokenAddress: string,
    startTime: number,
    endTime: number
  ): Promise<PriceDataPoint[]> {
    // In production, query from TimescaleDB
    // For now, return filtered buffer data
    return this.dataBuffer.filter(
      point =>
        point.chain === chainId &&
        point.tokenAddress === tokenAddress &&
        point.timestamp >= startTime &&
        point.timestamp <= endTime
    );
  }

  /**
   * Backfill historical data
   */
  async backfillHistoricalData(
    chainId: number | string,
    tokenAddress: string,
    daysBack: number
  ): Promise<number> {
    console.log(`[DataCollector] Backfilling ${daysBack} days of data for ${tokenAddress} on chain ${chainId}`);
    
    // This would fetch historical data from external sources
    // like The Graph, Dune Analytics, or archive nodes
    
    const endTime = Date.now();
    const startTime = endTime - (daysBack * 24 * 60 * 60 * 1000);
    
    // Placeholder - in production, fetch and store real data
    this.emit('backfill', {
      chainId,
      tokenAddress,
      startTime,
      endTime,
      daysBack,
    });

    return 0; // Return number of data points backfilled
  }

  /**
   * Get collector statistics
   */
  getStats(): CollectorStats {
    return {
      ...this.stats,
      activeChains: new Set(this.stats.activeChains),
      activeTokens: new Set(this.stats.activeTokens),
    };
  }

  /**
   * Clear collected data
   */
  clear(): void {
    this.dataBuffer = [];
    this.stats = {
      dataPointsCollected: 0,
      lastCollectionTime: 0,
      activeChains: new Set(),
      activeTokens: new Set(),
      storageSize: 0,
      errors: 0,
    };
    this.emit('cleared');
  }

  /**
   * Export data to external storage
   */
  async exportData(format: 'csv' | 'json' | 'parquet' = 'json'): Promise<string> {
    // In production, export to S3, TimescaleDB, or other storage
    console.log(`[DataCollector] Exporting data in ${format} format`);
    
    if (format === 'json') {
      return JSON.stringify(this.dataBuffer, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value
      );
    }

    return '';
  }

  /**
   * Get data for a specific time window
   */
  async getTimeWindow(
    startTime: number,
    endTime: number,
    chainId?: number | string,
    tokenAddress?: string
  ): Promise<PriceDataPoint[]> {
    let data = this.dataBuffer.filter(
      point => point.timestamp >= startTime && point.timestamp <= endTime
    );

    if (chainId !== undefined) {
      data = data.filter(point => point.chain === chainId);
    }

    if (tokenAddress) {
      data = data.filter(point => point.tokenAddress === tokenAddress);
    }

    return data;
  }

  /**
   * Subscribe to real-time data stream
   */
  subscribeToStream(callback: (event: DataCollectionEvent) => void): () => void {
    this.on('data', callback);
    return () => this.off('data', callback);
  }

  /**
   * Check if collector is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MLConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart if running with new config
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }
}
