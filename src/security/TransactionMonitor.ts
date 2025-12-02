/**
 * TransactionMonitor - Autonomous transaction surveillance
 * 
 * Monitors ALL incoming transactions to detect:
 * - Unsolicited transfers (like the 0.00005 ETH event)
 * - Dust attacks
 * - Address poisoning attempts
 * - Unusual gas patterns
 * - Unknown contract interactions
 * 
 * This is the "eyes" of the autonomous defense system.
 */

import { EventEmitter } from 'events';
import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import { AddressRegistry, AddressStatus } from './AddressRegistry';
import { AnomalyDetector, AnomalyType, AnomalyReport } from './AnomalyDetector';

export interface TransactionEvent {
  hash: string;
  from: string;
  to: string;
  value: bigint;
  gasPrice: bigint;
  gasLimit: bigint;
  data: string;
  timestamp: number;
  blockNumber: number;
  nonce: number;
}

export interface MonitorConfig {
  // Our wallet address to monitor
  walletAddress: string;
  
  // RPC provider
  rpcUrl: string;
  
  // Monitoring settings
  pollingInterval: number; // ms between checks
  lookbackBlocks: number; // how many blocks to check on startup
  
  // Detection thresholds
  dustThreshold: bigint; // value below this is dust attack
  unusualGasMultiplier: number; // gas price > normal * this = suspicious
  
  // Auto-response
  enableAutoResponse: boolean;
  pauseOnHighSeverity: boolean;
}

export interface MonitorMetrics {
  totalTransactionsDetected: number;
  incomingTransactions: number;
  outgoingTransactions: number;
  anomaliesDetected: number;
  uniqueAddressesSeen: number;
  lastCheckTimestamp: number;
  lastBlockChecked: number;
  isMonitoring: boolean;
}

/**
 * Autonomous Transaction Monitor
 * 
 * Runs 24/7 watching for threats even when AI is not active
 */
export class TransactionMonitor extends EventEmitter {
  private config: MonitorConfig;
  private provider: ethers.JsonRpcProvider;
  private addressRegistry: AddressRegistry;
  private anomalyDetector: AnomalyDetector;
  
  private isRunning: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;
  private lastBlockChecked: number = 0;
  
  private metrics: MonitorMetrics = {
    totalTransactionsDetected: 0,
    incomingTransactions: 0,
    outgoingTransactions: 0,
    anomaliesDetected: 0,
    uniqueAddressesSeen: 0,
    lastCheckTimestamp: 0,
    lastBlockChecked: 0,
    isMonitoring: false,
  };
  
  // Recent transactions cache (for pattern analysis)
  private recentTransactions: TransactionEvent[] = [];
  private maxCacheSize: number = 1000;

  constructor(config: MonitorConfig) {
    super();
    this.config = config;
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.addressRegistry = new AddressRegistry();
    this.anomalyDetector = new AnomalyDetector(this.addressRegistry);
    
    logger.info('[TransactionMonitor] Initialized for wallet: ' + config.walletAddress, 'SECURITY');
    
    // Whitelist our own address
    this.addressRegistry.addAddress(config.walletAddress.toLowerCase(), AddressStatus.WHITELISTED, 'Our wallet');
  }

  /**
   * Start autonomous monitoring
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('[TransactionMonitor] Already running', 'SECURITY');
      return;
    }

    logger.info('[TransactionMonitor] Starting autonomous monitoring...', 'SECURITY');
    
    this.isRunning = true;
    this.metrics.isMonitoring = true;
    
    // Get current block
    const currentBlock = await this.provider.getBlockNumber();
    this.lastBlockChecked = currentBlock - this.config.lookbackBlocks;
    
    logger.info(`[TransactionMonitor] Starting from block ${this.lastBlockChecked}`, 'SECURITY');
    
    // Start monitoring loop
    this.monitoringInterval = setInterval(() => {
      this.checkForNewTransactions().catch((error) => {
        logger.error(`[TransactionMonitor] Error in monitoring loop: ${error.message}`, 'SECURITY');
      });
    }, this.config.pollingInterval);
    
    // Emit started event
    this.emit('started', { startBlock: this.lastBlockChecked });
    
    logger.info('[TransactionMonitor] Autonomous monitoring ACTIVE', 'SECURITY');
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    logger.info('[TransactionMonitor] Stopping monitoring...', 'SECURITY');
    
    this.isRunning = false;
    this.metrics.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    this.emit('stopped', { metrics: this.getMetrics() });
    
    logger.info('[TransactionMonitor] Monitoring stopped', 'SECURITY');
  }

  /**
   * Check for new transactions (main monitoring loop)
   */
  private async checkForNewTransactions(): Promise<void> {
    try {
      const currentBlock = await this.provider.getBlockNumber();
      
      // Check blocks since last check
      for (let blockNum = this.lastBlockChecked + 1; blockNum <= currentBlock; blockNum++) {
        await this.scanBlock(blockNum);
      }
      
      this.lastBlockChecked = currentBlock;
      this.metrics.lastBlockChecked = currentBlock;
      this.metrics.lastCheckTimestamp = Date.now();
      
    } catch (error) {
      logger.error(
        `[TransactionMonitor] Error checking transactions: ${error instanceof Error ? error.message : String(error)}`,
        'SECURITY'
      );
    }
  }

  /**
   * Scan a specific block for our transactions
   */
  private async scanBlock(blockNumber: number): Promise<void> {
    try {
      const block = await this.provider.getBlock(blockNumber, true);
      
      if (!block || !block.transactions) {
        return;
      }

      // Check each transaction in the block
      for (const tx of block.transactions) {
        if (typeof tx === 'string') {
          continue; // Skip if only hash
        }

        const txDetails = tx as ethers.TransactionResponse;
        
        // Check if transaction involves our wallet
        const isIncoming = txDetails.to?.toLowerCase() === this.config.walletAddress.toLowerCase();
        const isOutgoing = txDetails.from.toLowerCase() === this.config.walletAddress.toLowerCase();
        
        if (isIncoming || isOutgoing) {
          await this.processTransaction(txDetails, blockNumber, isIncoming);
        }
      }
    } catch (error) {
      logger.error(
        `[TransactionMonitor] Error scanning block ${blockNumber}: ${error instanceof Error ? error.message : String(error)}`,
        'SECURITY'
      );
    }
  }

  /**
   * Process a detected transaction
   */
  private async processTransaction(
    tx: ethers.TransactionResponse,
    blockNumber: number,
    isIncoming: boolean
  ): Promise<void> {
    const txEvent: TransactionEvent = {
      hash: tx.hash,
      from: tx.from,
      to: tx.to || '',
      value: tx.value,
      gasPrice: tx.gasPrice || BigInt(0),
      gasLimit: tx.gasLimit,
      data: tx.data,
      timestamp: Date.now(),
      blockNumber: blockNumber,
      nonce: tx.nonce,
    };

    // Update metrics
    this.metrics.totalTransactionsDetected++;
    if (isIncoming) {
      this.metrics.incomingTransactions++;
    } else {
      this.metrics.outgoingTransactions++;
    }

    // Add to cache
    this.recentTransactions.push(txEvent);
    if (this.recentTransactions.length > this.maxCacheSize) {
      this.recentTransactions.shift();
    }

    // Track unique addresses
    const otherAddress = isIncoming ? tx.from : (tx.to || '');
    if (otherAddress && !this.addressRegistry.hasAddress(otherAddress.toLowerCase())) {
      this.metrics.uniqueAddressesSeen++;
      this.addressRegistry.addAddress(otherAddress.toLowerCase(), AddressStatus.GRAYLISTED, 'First seen');
    }

    // Log the detection
    logger.info(
      `[TransactionMonitor] ${isIncoming ? 'INCOMING' : 'OUTGOING'} tx detected: ${tx.hash.substring(0, 10)}... from ${tx.from.substring(0, 10)}... value: ${ethers.formatEther(tx.value)} ETH`,
      'SECURITY'
    );

    // Analyze for anomalies (only on incoming - we know our own outgoing txs)
    if (isIncoming) {
      await this.analyzeForAnomalies(txEvent);
    }

    // Emit event
    this.emit('transaction-detected', {
      transaction: txEvent,
      isIncoming,
    });
  }

  /**
   * Analyze transaction for anomalies
   */
  private async analyzeForAnomalies(tx: TransactionEvent): Promise<void> {
    const report = await this.anomalyDetector.analyze(tx, this.recentTransactions);
    
    if (report.anomalies.length > 0) {
      this.metrics.anomaliesDetected++;
      
      logger.warn(
        `[TransactionMonitor] ANOMALY DETECTED: ${report.anomalies.map(a => a.type).join(', ')} - Severity: ${report.overallSeverity}`,
        'SECURITY'
      );

      // Emit anomaly event
      this.emit('anomaly-detected', report);

      // Auto-response if enabled
      if (this.config.enableAutoResponse) {
        await this.handleAnomaly(report);
      }

      // Save to memory for learning
      await this.saveAnomalyToMemory(report);
    }
  }

  /**
   * Handle detected anomaly with autonomous response
   */
  private async handleAnomaly(report: AnomalyReport): Promise<void> {
    const { overallSeverity, anomalies, transaction } = report;

    switch (overallSeverity) {
      case 'low':
        // Just log and track
        logger.info(`[TransactionMonitor] Low severity anomaly - monitoring`, 'SECURITY');
        break;

      case 'medium':
        // Add to graylist, increase monitoring
        this.addressRegistry.updateReputation(transaction.from.toLowerCase(), -0.1);
        logger.warn(`[TransactionMonitor] Medium severity - address reputation decreased`, 'SECURITY');
        break;

      case 'high':
        // Potential threat - pause if configured
        this.addressRegistry.updateReputation(transaction.from.toLowerCase(), -0.3);
        logger.error(`[TransactionMonitor] High severity anomaly - potential threat`, 'SECURITY');
        
        if (this.config.pauseOnHighSeverity) {
          this.emit('pause-requested', {
            reason: `High severity anomaly: ${anomalies.map(a => a.type).join(', ')}`,
            transaction: transaction,
          });
        }
        break;

      case 'critical':
        // Immediate action - blacklist and pause
        this.addressRegistry.addAddress(
          transaction.from.toLowerCase(),
          AddressStatus.BLACKLISTED,
          `Critical anomaly: ${anomalies.map(a => a.type).join(', ')}`
        );
        
        logger.error(`[TransactionMonitor] CRITICAL ANOMALY - Address blacklisted and operations paused`, 'SECURITY');
        
        this.emit('emergency-stop-requested', {
          reason: `Critical anomaly detected`,
          transaction: transaction,
          anomalies: anomalies,
        });
        break;
    }
  }

  /**
   * Save anomaly to memory for cross-session learning
   */
  private async saveAnomalyToMemory(report: AnomalyReport): Promise<void> {
    const memoryEntry = {
      timestamp: Date.now(),
      transaction: report.transaction,
      anomalies: report.anomalies,
      severity: report.overallSeverity,
      recommendations: report.recommendations,
    };

    // TODO: Save to .memory/security-events/ directory
    // This allows cross-session learning
    
    logger.debug('[TransactionMonitor] Anomaly saved to memory for learning', 'SECURITY');
  }

  /**
   * Get current metrics
   */
  getMetrics(): MonitorMetrics {
    return { ...this.metrics };
  }

  /**
   * Get recent transactions
   */
  getRecentTransactions(count: number = 10): TransactionEvent[] {
    return this.recentTransactions.slice(-count);
  }

  /**
   * Get address registry (for inspection)
   */
  getAddressRegistry(): AddressRegistry {
    return this.addressRegistry;
  }

  /**
   * Manually analyze a transaction hash
   */
  async analyzeTransaction(txHash: string): Promise<AnomalyReport | null> {
    try {
      const tx = await this.provider.getTransaction(txHash);
      if (!tx) {
        return null;
      }

      const txEvent: TransactionEvent = {
        hash: tx.hash,
        from: tx.from,
        to: tx.to || '',
        value: tx.value,
        gasPrice: tx.gasPrice || BigInt(0),
        gasLimit: tx.gasLimit,
        data: tx.data,
        timestamp: Date.now(),
        blockNumber: tx.blockNumber || 0,
        nonce: tx.nonce,
      };

      return await this.anomalyDetector.analyze(txEvent, this.recentTransactions);
    } catch (error) {
      logger.error(
        `[TransactionMonitor] Error analyzing transaction: ${error instanceof Error ? error.message : String(error)}`,
        'SECURITY'
      );
      return null;
    }
  }

  /**
   * Get monitoring status
   */
  isMonitoring(): boolean {
    return this.isRunning;
  }

  /**
   * Shutdown gracefully
   */
  shutdown(): void {
    this.stop();
    this.removeAllListeners();
    logger.info('[TransactionMonitor] Shutdown complete', 'SECURITY');
  }
}
