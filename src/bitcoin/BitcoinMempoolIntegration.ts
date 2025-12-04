/**
 * Bitcoin Mempool Integration for TheWarden
 * 
 * Integrates mempool.space monitoring with TheWarden's MEV detection system.
 * Provides real-time Bitcoin mempool analysis, fee estimation, and MEV opportunity detection.
 * 
 * Key Features:
 * - Real-time mempool monitoring via WebSocket
 * - Fee market analysis and optimization
 * - MEV opportunity detection (front-running, fee spikes, batch activity)
 * - Transaction timing strategies
 * - Integration with consciousness system for learning
 * 
 * API Key: Configure via MEMPOOL_API_KEY environment variable
 * Get your key from: https://mempool.space/docs/api
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

// Define HeadersInit type for fetch API
type HeadersInit = Record<string, string>;

interface MempoolTransaction {
  txid: string;
  fee: number;
  vsize: number;
  feeRate: number;
  value: number;
  time?: number;
}

interface MempoolBlock {
  blockSize: number;
  blockVSize: number;
  nTx: number;
  totalFees: number;
  medianFee: number;
  feeRange: string;
}

interface MempoolStats {
  medianFeeRate: number;
  minFeeRate: number;
  maxFeeRate: number;
  txCount: number;
  blockUtilization: number;
  activityLevel: number; // Compared to historical average
}

interface MEVOpportunity {
  type: 'FRONT_RUNNING' | 'FEE_SPIKE' | 'BATCH_ACTIVITY' | 'HIGH_VALUE';
  description: string;
  estimatedValue?: number;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  timestamp: number;
  txid?: string;
}

export interface BitcoinMempoolConfig {
  apiKey: string;
  enableWebSocket: boolean;
  pollingInterval: number; // seconds
  minFeeRateThreshold: number; // sat/vB
  highValueThreshold: number; // satoshis
  enableMEVDetection: boolean;
  enableConsciousnessIntegration: boolean;
}

/**
 * Bitcoin Mempool Integration
 * 
 * Monitors Bitcoin mempool for MEV opportunities and provides fee optimization.
 */
export class BitcoinMempoolIntegration extends EventEmitter {
  private config: BitcoinMempoolConfig;
  private ws: any | null = null; // WebSocket type from 'ws' package (optional dependency)
  private pollingTimer?: NodeJS.Timeout;
  private isRunning = false;
  private currentStats: MempoolStats | null = null;
  private detectedOpportunities: MEVOpportunity[] = [];
  
  // Historical tracking
  private historicalMedianFees: number[] = [];
  private readonly MAX_HISTORY_SIZE = 100;
  
  // Constants
  private readonly HIGH_FEE_THRESHOLD: number;
  
  constructor(config: BitcoinMempoolConfig) {
    super();
    this.config = config;
    this.HIGH_FEE_THRESHOLD = config.minFeeRateThreshold || 50;
    
    logger.info('Bitcoin Mempool Integration initialized', 'Initialized with WebSocket: ' + config.enableWebSocket + ', Polling: ' + config.pollingInterval + 's');
  }
  
  /**
   * Start monitoring the Bitcoin mempool
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Bitcoin Mempool Integration already running');
      return;
    }
    
    this.isRunning = true;
    logger.info('Starting Bitcoin Mempool Integration...');
    
    try {
      // Initial snapshot
      await this.fetchMempoolSnapshot();
      
      // Start WebSocket if enabled
      if (this.config.enableWebSocket) {
        await this.startWebSocket();
      }
      
      // Start polling for fallback/redundancy
      this.startPolling();
      
      this.emit('started');
      logger.info('Bitcoin Mempool Integration started successfully');
    } catch (error) {
      logger.error('Failed to start Bitcoin Mempool Integration:', error instanceof Error ? error.message : String(error));
      this.isRunning = false;
      throw error;
    }
  }
  
  /**
   * Stop monitoring
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }
    
    logger.info('Stopping Bitcoin Mempool Integration...');
    this.isRunning = false;
    
    // Stop WebSocket
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    // Stop polling
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = undefined;
    }
    
    this.emit('stopped');
    logger.info('Bitcoin Mempool Integration stopped');
  }
  
  /**
   * Fetch current mempool snapshot
   */
  private async fetchMempoolSnapshot(): Promise<void> {
    try {
      const response = await fetch('https://mempool.space/api/v1/fees/mempool-blocks', {
        headers: this.getHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      
      const data = await response.json() as unknown;
      const nextBlock = (data as any[])[0] as MempoolBlock;
      
      if (nextBlock) {
        await this.processBlockData(nextBlock);
      }
    } catch (error) {
      logger.error('Failed to fetch mempool snapshot:', error instanceof Error ? error.message : String(error));
    }
  }
  
  /**
   * Process block data and extract insights
   */
  private async processBlockData(block: MempoolBlock): Promise<void> {
    const stats: MempoolStats = {
      medianFeeRate: block.medianFee,
      minFeeRate: 1, // Would need more data to calculate
      maxFeeRate: block.medianFee * 3, // Estimate
      txCount: block.nTx,
      blockUtilization: (block.blockVSize / 4_000_000) * 100,
      activityLevel: block.nTx / 2500, // Compared to 2500 historical average
    };
    
    this.currentStats = stats;
    
    // Track historical median fees
    this.historicalMedianFees.push(stats.medianFeeRate);
    if (this.historicalMedianFees.length > this.MAX_HISTORY_SIZE) {
      this.historicalMedianFees.shift();
    }
    
    // Emit stats update
    this.emit('stats:update', stats);
    
    // Detect MEV opportunities if enabled
    if (this.config.enableMEVDetection) {
      await this.detectMEVOpportunities(stats);
    }
    
    // Log periodic summary
    logger.debug('Mempool stats updated', 'Median Fee: ' + stats.medianFeeRate.toFixed(2) + ' sat/vB, Tx: ' + stats.txCount);
  }
  
  /**
   * Detect MEV opportunities based on current mempool state
   */
  private async detectMEVOpportunities(stats: MempoolStats): Promise<void> {
    const opportunities: MEVOpportunity[] = [];
    
    // Opportunity 1: Fee spike (urgent activity)
    if (stats.medianFeeRate > this.config.minFeeRateThreshold * 2) {
      opportunities.push({
        type: 'FEE_SPIKE',
        description: `High fee rate detected: ${stats.medianFeeRate.toFixed(2)} sat/vB (2x+ threshold)`,
        risk: 'HIGH',
        timestamp: Date.now(),
      });
    }
    
    // Opportunity 2: High activity level
    if (stats.activityLevel > 1.5) {
      opportunities.push({
        type: 'BATCH_ACTIVITY',
        description: `High network activity: ${(stats.activityLevel * 100).toFixed(0)}% of average`,
        risk: 'MEDIUM',
        timestamp: Date.now(),
      });
    }
    
    // Opportunity 3: Block congestion
    if (stats.blockUtilization > 80) {
      opportunities.push({
        type: 'FEE_SPIKE',
        description: `Block congestion: ${stats.blockUtilization.toFixed(1)}% utilization`,
        risk: 'HIGH',
        timestamp: Date.now(),
      });
    }
    
    // Emit new opportunities
    for (const opp of opportunities) {
      // Check if already detected recently (avoid duplicates)
      const isDuplicate = this.detectedOpportunities.some(
        existing =>
          existing.type === opp.type &&
          Date.now() - existing.timestamp < 60000 // Within last minute
      );
      
      if (!isDuplicate) {
        this.detectedOpportunities.push(opp);
        this.emit('mev:opportunity', opp);
        
        logger.info('MEV opportunity detected', 'Type: ' + opp.type + ', Risk: ' + opp.risk);
      }
    }
    
    // Clean up old opportunities (older than 5 minutes)
    this.detectedOpportunities = this.detectedOpportunities.filter(
      opp => Date.now() - opp.timestamp < 300000
    );
  }
  
  /**
   * Start WebSocket connection for real-time updates
   */
  private async startWebSocket(): Promise<void> {
    try {
      // Dynamic import of ws module
      const { default: WebSocket } = await import('ws');
      
      this.ws = new WebSocket('wss://mempool.space/api/v1/ws');
      
      this.ws.on('open', () => {
        logger.info('WebSocket connected to mempool.space');
        
        // Subscribe to mempool-blocks updates
        this.ws.send(JSON.stringify({ 'track-mempool-block': 0 }));
      });
      
      this.ws.on('message', (data: Buffer | ArrayBuffer | Buffer[]) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleWebSocketMessage(message);
        } catch (error) {
          logger.error('Failed to parse WebSocket message:', error instanceof Error ? error.message : String(error));
        }
      });
      
      this.ws.on('error', (error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : 'Unknown WebSocket error';
        logger.error('WebSocket error:', errorMessage);
      });
      
      this.ws.on('close', () => {
        logger.warn('WebSocket connection closed');
        
        // Attempt reconnection if still running
        if (this.isRunning) {
          setTimeout(() => {
            if (this.isRunning && this.config.enableWebSocket) {
              logger.info('Attempting WebSocket reconnection...');
              this.startWebSocket();
            }
          }, 5000);
        }
      });
    } catch (error) {
      logger.error('Failed to start WebSocket:', error instanceof Error ? error.message : String(error));
      logger.info('Falling back to polling only');
    }
  }
  
  /**
   * Handle incoming WebSocket messages
   */
  private handleWebSocketMessage(message: any): void {
    if (message['mempool-blocks']) {
      const blocks = message['mempool-blocks'];
      if (blocks.length > 0) {
        const nextBlock = blocks[0];
        this.processBlockData(nextBlock);
      }
    }
    
    if (message.mempoolInfo) {
      const info = message.mempoolInfo;
      this.emit('mempool:info', {
        size: info.size,
        bytes: info.vsize,
        usage: info.usage,
        totalFee: info.total_fee,
      });
    }
    
    if (message.block) {
      const block = message.block;
      this.emit('block:mined', {
        height: block.height,
        txCount: block.tx_count,
        size: block.size,
      });
      
      logger.info(`New block mined: #${block.height} (${block.tx_count} TXs)`);
    }
  }
  
  /**
   * Start polling for mempool updates
   */
  private startPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
    }
    
    this.pollingTimer = setInterval(
      () => {
        if (this.isRunning) {
          this.fetchMempoolSnapshot();
        }
      },
      this.config.pollingInterval * 1000
    );
  }
  
  /**
   * Get API headers with authentication
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
    
    return headers;
  }
  
  /**
   * Get current mempool statistics
   */
  public getCurrentStats(): MempoolStats | null {
    return this.currentStats;
  }
  
  /**
   * Get optimal fee rate for target confirmation time
   */
  public getOptimalFeeRate(urgency: 'immediate' | 'fast' | 'normal' | 'slow'): number {
    if (!this.currentStats) {
      // Fallback defaults
      const defaults = {
        immediate: 50,
        fast: 30,
        normal: 10,
        slow: 5,
      };
      return defaults[urgency];
    }
    
    const multipliers = {
      immediate: 2.0,  // 2x median = next block
      fast: 1.5,       // 1.5x median = within 3 blocks
      normal: 1.0,     // 1x median = within 6 blocks
      slow: 0.5,       // 0.5x median = whenever
    };
    
    return this.currentStats.medianFeeRate * multipliers[urgency];
  }
  
  /**
   * Should TheWarden pause operations due to high fees?
   */
  public shouldPauseOperations(): boolean {
    if (!this.currentStats) {
      return false;
    }
    
    // Pause if median fee > configured threshold (default 50 sat/vB)
    if (this.currentStats.medianFeeRate > this.HIGH_FEE_THRESHOLD) {
      return true;
    }
    
    // Pause if block utilization > 90% (high competition)
    if (this.currentStats.blockUtilization > 90) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Get recommendation for current market conditions
   */
  public getMarketRecommendation(): {
    action: 'OPERATE' | 'PAUSE' | 'DEFENSIVE';
    reason: string;
    feeRate: number;
  } {
    if (!this.currentStats) {
      return {
        action: 'OPERATE',
        reason: 'No mempool data available, using defaults',
        feeRate: 10,
      };
    }
    
    const stats = this.currentStats;
    
    // High fees - pause operations (using configured threshold)
    if (stats.medianFeeRate > this.HIGH_FEE_THRESHOLD) {
      return {
        action: 'PAUSE',
        reason: `Fees too high (${stats.medianFeeRate.toFixed(2)} sat/vB, threshold: ${this.HIGH_FEE_THRESHOLD})`,
        feeRate: stats.medianFeeRate,
      };
    }
    
    // High MEV activity - defensive mode
    const recentMEVCount = this.detectedOpportunities.filter(
      opp => Date.now() - opp.timestamp < 60000
    ).length;
    
    if (recentMEVCount > 3) {
      return {
        action: 'DEFENSIVE',
        reason: `High MEV activity detected (${recentMEVCount} opportunities)`,
        feeRate: stats.medianFeeRate * 1.5,
      };
    }
    
    // Normal operation
    return {
      action: 'OPERATE',
      reason: 'Normal market conditions',
      feeRate: stats.medianFeeRate,
    };
  }
  
  /**
   * Get recent MEV opportunities
   */
  public getRecentMEVOpportunities(maxAge: number = 300000): MEVOpportunity[] {
    return this.detectedOpportunities.filter(
      opp => Date.now() - opp.timestamp < maxAge
    );
  }
  
  /**
   * Get integration status
   */
  public getStatus(): {
    isRunning: boolean;
    hasWebSocket: boolean;
    hasStats: boolean;
    mevOpportunities: number;
  } {
    return {
      isRunning: this.isRunning,
      hasWebSocket: this.ws !== null && this.ws.readyState === 1,
      hasStats: this.currentStats !== null,
      mevOpportunities: this.detectedOpportunities.length,
    };
  }
}

export default BitcoinMempoolIntegration;
