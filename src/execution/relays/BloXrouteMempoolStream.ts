/**
 * bloXroute Mempool Stream Manager
 *
 * Manages WebSocket connections to bloXroute mempool streams and integrates
 * with TheWarden's opportunity detection pipeline.
 *
 * Features:
 * - Real-time mempool transaction monitoring
 * - DEX swap detection and filtering
 * - Integration with OpportunityDetector
 * - Multi-chain support
 * - Automatic reconnection and error handling
 * - Performance metrics and monitoring
 *
 * Usage:
 *   const stream = new BloXrouteMempoolStream({
 *     apiKey: process.env.BLOXROUTE_API_KEY,
 *     network: BloXrouteNetwork.ETHEREUM,
 *     onTransaction: (tx) => detectArbitrage(tx)
 *   });
 *
 *   await stream.start();
 */

import { BloXrouteClient, BloXrouteNetwork, BloXrouteRegion, StreamType } from './BloXrouteClient';
import { logger } from '../../utils/logger';

/**
 * Transaction data from bloXroute stream
 */
export interface BloXrouteTx {
  tx_hash: string;
  from?: string;
  to?: string;
  value?: string;
  gas?: string;
  gas_price?: string;
  input?: string;
  method_id?: string;
  nonce?: string;
  v?: string;
  r?: string;
  s?: string;
  tx_contents?: {
    from?: string;
    to?: string;
    gas?: string;
    gas_price?: string;
    value?: string;
    input?: string;
    nonce?: string;
    v?: string;
    r?: string;
    s?: string;
  };
  local_region?: boolean;
  time?: number;
}

/**
 * DEX protocol configuration for swap detection
 */
export interface DexProtocol {
  name: string;
  addresses: string[];
  methodIds: string[];
  priority: number;
}

/**
 * Transaction filter for mempool streaming
 */
export interface TransactionFilter {
  /** Minimum transaction value in wei */
  minValue?: bigint;
  
  /** Maximum transaction value in wei */
  maxValue?: bigint;
  
  /** Minimum gas price in wei */
  minGasPrice?: bigint;
  
  /** Target contract addresses (DEX routers, pools) */
  targetAddresses?: string[];
  
  /** Method IDs to filter for (DEX swap functions) */
  methodIds?: string[];
  
  /** DEX protocols to monitor */
  protocols?: DexProtocol[];
  
  /** Custom bloXroute filter expression */
  customFilter?: string;
}

/**
 * Configuration for mempool stream manager
 */
export interface MempoolStreamConfig {
  /** bloXroute API key */
  apiKey: string;
  
  /** Target blockchain network */
  network: BloXrouteNetwork;
  
  /** Regional endpoint for latency optimization */
  region?: BloXrouteRegion;
  
  /** Stream type (pendingTxs recommended for accuracy) */
  streamType?: StreamType;
  
  /** Transaction filters */
  filters?: TransactionFilter;
  
  /** Callback for each transaction */
  onTransaction?: (tx: BloXrouteTx) => void | Promise<void>;
  
  /** Callback for DEX swaps */
  onDexSwap?: (tx: BloXrouteTx) => void | Promise<void>;
  
  /** Callback for large transfers */
  onLargeTransfer?: (tx: BloXrouteTx, value: bigint) => void | Promise<void>;
  
  /** Callback for errors */
  onError?: (error: Error) => void;
  
  /** Enable verbose logging */
  verbose?: boolean;
  
  /** Batch transactions before processing */
  batchSize?: number;
  
  /** Batch timeout in milliseconds */
  batchTimeout?: number;
}

/**
 * Performance metrics for stream monitoring
 */
export interface StreamMetrics {
  /** Total transactions received */
  totalTransactions: number;
  
  /** DEX swaps detected */
  dexSwaps: number;
  
  /** Large transfers detected */
  largeTransfers: number;
  
  /** Transactions filtered out */
  filtered: number;
  
  /** Average processing time per transaction (ms) */
  avgProcessingTime: number;
  
  /** Current transactions per second */
  transactionsPerSecond: number;
  
  /** Stream uptime in seconds */
  uptime: number;
  
  /** Last transaction timestamp */
  lastTransactionTime?: number;
  
  /** Errors encountered */
  errors: number;
  
  /** Last error message */
  lastError?: string;
}

/**
 * Well-known DEX protocols and their swap method IDs
 */
export const DEX_PROTOCOLS: Record<string, DexProtocol> = {
  UNISWAP_V2: {
    name: 'Uniswap V2',
    addresses: [
      '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap V2 Router
    ],
    methodIds: [
      '0x38ed1739', // swapExactTokensForTokens
      '0x8803dbee', // swapTokensForExactTokens
      '0x7ff36ab5', // swapExactETHForTokens
      '0xfb3bdb41', // swapETHForExactTokens
    ],
    priority: 1,
  },
  UNISWAP_V3: {
    name: 'Uniswap V3',
    addresses: [
      '0xE592427A0AEce92De3Edee1F18E0157C05861564', // Uniswap V3 SwapRouter
      '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', // Uniswap V3 SwapRouter02
    ],
    methodIds: [
      '0x414bf389', // exactInputSingle
      '0xc04b8d59', // exactInput
      '0xdb3e2198', // exactOutputSingle
      '0x09b81346', // exactOutput
    ],
    priority: 1,
  },
  SUSHISWAP: {
    name: 'SushiSwap',
    addresses: [
      '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F', // SushiSwap Router
    ],
    methodIds: [
      '0x38ed1739', // swapExactTokensForTokens
      '0x8803dbee', // swapTokensForExactTokens
    ],
    priority: 2,
  },
  CURVE: {
    name: 'Curve',
    addresses: [
      '0x8e764bE4288B842791989DB5b8ec067279829809', // Curve Tricrypto Pool
    ],
    methodIds: [
      '0x3df02124', // exchange
      '0x5b41b908', // exchange_underlying
    ],
    priority: 2,
  },
};

/**
 * BloXroute Mempool Stream Manager
 * 
 * Manages real-time mempool streaming and transaction processing
 */
export class BloXrouteMempoolStream {
  private client: BloXrouteClient;
  private config: Required<Omit<MempoolStreamConfig, 'filters' | 'onTransaction' | 'onDexSwap' | 'onLargeTransfer' | 'onError'>> & {
    filters: TransactionFilter;
    onTransaction?: (tx: BloXrouteTx) => void | Promise<void>;
    onDexSwap?: (tx: BloXrouteTx) => void | Promise<void>;
    onLargeTransfer?: (tx: BloXrouteTx, value: bigint) => void | Promise<void>;
    onError?: (error: Error) => void;
  };
  
  private subscriptionId?: string;
  private isActive: boolean = false;
  private startTime?: number;
  
  private metrics: StreamMetrics = {
    totalTransactions: 0,
    dexSwaps: 0,
    largeTransfers: 0,
    filtered: 0,
    avgProcessingTime: 0,
    transactionsPerSecond: 0,
    uptime: 0,
    errors: 0,
  };
  
  private processingTimes: number[] = [];
  private transactionBatch: BloXrouteTx[] = [];
  private batchTimer?: NodeJS.Timeout;
  
  constructor(config: MempoolStreamConfig) {
    // Set defaults
    this.config = {
      apiKey: config.apiKey,
      network: config.network,
      region: config.region ?? BloXrouteRegion.VIRGINIA,
      streamType: config.streamType ?? StreamType.PENDING_TXS,
      verbose: config.verbose ?? false,
      batchSize: config.batchSize ?? 1, // Default to immediate processing
      batchTimeout: config.batchTimeout ?? 100,
      filters: config.filters ?? {},
      onTransaction: config.onTransaction,
      onDexSwap: config.onDexSwap,
      onLargeTransfer: config.onLargeTransfer,
      onError: config.onError,
    };
    
    // Create bloXroute client
    this.client = new BloXrouteClient({
      apiKey: this.config.apiKey,
      network: this.config.network,
      region: this.config.region,
      verbose: this.config.verbose,
    });
  }
  
  /**
   * Start mempool streaming
   */
  async start(): Promise<void> {
    if (this.isActive) {
      throw new Error('Mempool stream is already active');
    }
    
    try {
      // Connect to bloXroute
      await this.client.connect();
      
      // Build filter expression
      const filterExpression = this.buildFilterExpression();
      
      // Subscribe to stream
      this.subscriptionId = await this.client.subscribe(
        this.config.streamType,
        { filters: filterExpression },
        (tx) => this.handleTransaction(tx)
      );
      
      this.isActive = true;
      this.startTime = Date.now();
      
      logger.info('bloXroute mempool stream started', {
        network: this.config.network,
        streamType: this.config.streamType,
        subscriptionId: this.subscriptionId,
      });
    } catch (error) {
      logger.error('Failed to start mempool stream', { error });
      this.handleError(error as Error);
      throw error;
    }
  }
  
  /**
   * Stop mempool streaming
   */
  async stop(): Promise<void> {
    if (!this.isActive) {
      return;
    }
    
    try {
      // Unsubscribe from stream
      if (this.subscriptionId) {
        await this.client.unsubscribe(this.subscriptionId);
      }
      
      // Disconnect client
      this.client.disconnect();
      
      // Clear batch timer
      if (this.batchTimer) {
        clearTimeout(this.batchTimer);
      }
      
      // Process any remaining batched transactions
      if (this.transactionBatch.length > 0) {
        await this.processBatch();
      }
      
      this.isActive = false;
      
      logger.info('bloXroute mempool stream stopped', {
        metrics: this.getMetrics(),
      });
    } catch (error) {
      logger.error('Error stopping mempool stream', { error });
      this.handleError(error as Error);
    }
  }
  
  /**
   * Check if stream is active
   */
  isRunning(): boolean {
    return this.isActive && this.client.isConnected();
  }
  
  /**
   * Get current performance metrics
   */
  getMetrics(): StreamMetrics {
    if (this.startTime) {
      this.metrics.uptime = Math.floor((Date.now() - this.startTime) / 1000);
      
      if (this.metrics.uptime > 0) {
        this.metrics.transactionsPerSecond = this.metrics.totalTransactions / this.metrics.uptime;
      }
    }
    
    return { ...this.metrics };
  }
  
  /**
   * Build bloXroute filter expression from config
   */
  private buildFilterExpression(): string {
    const filters = this.config.filters;
    const expressions: string[] = [];
    
    // Custom filter takes precedence
    if (filters.customFilter) {
      return filters.customFilter;
    }
    
    // Value range filters
    if (filters.minValue !== undefined) {
      expressions.push(`({value} >= ${filters.minValue.toString()})`);
    }
    if (filters.maxValue !== undefined) {
      expressions.push(`({value} <= ${filters.maxValue.toString()})`);
    }
    
    // Gas price filter
    if (filters.minGasPrice !== undefined) {
      expressions.push(`({gas_price} >= ${filters.minGasPrice.toString()})`);
    }
    
    // Target addresses
    if (filters.targetAddresses && filters.targetAddresses.length > 0) {
      const addressList = filters.targetAddresses.map(a => `'${a.toLowerCase()}'`).join(', ');
      expressions.push(`({to} IN [${addressList}])`);
    }
    
    // Method IDs
    if (filters.methodIds && filters.methodIds.length > 0) {
      const methodList = filters.methodIds.map(m => `'${m.toLowerCase()}'`).join(', ');
      expressions.push(`({method_id} IN [${methodList}])`);
    }
    
    // DEX protocols
    if (filters.protocols && filters.protocols.length > 0) {
      const allAddresses = filters.protocols.flatMap(p => p.addresses);
      const allMethodIds = filters.protocols.flatMap(p => p.methodIds);
      
      if (allAddresses.length > 0) {
        const addressList = allAddresses.map(a => `'${a.toLowerCase()}'`).join(', ');
        expressions.push(`({to} IN [${addressList}])`);
      }
      
      if (allMethodIds.length > 0) {
        const methodList = allMethodIds.map(m => `'${m.toLowerCase()}'`).join(', ');
        expressions.push(`({method_id} IN [${methodList}])`);
      }
    }
    
    // Combine with AND
    return expressions.length > 0 ? expressions.join(' AND ') : '';
  }
  
  /**
   * Handle incoming transaction
   */
  private async handleTransaction(tx: BloXrouteTx): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.metrics.totalTransactions++;
      this.metrics.lastTransactionTime = Date.now();
      
      // Apply client-side filters
      if (!this.passesFilters(tx)) {
        this.metrics.filtered++;
        return;
      }
      
      // Batch transactions if configured
      if (this.config.batchSize > 1) {
        this.transactionBatch.push(tx);
        
        if (this.transactionBatch.length >= this.config.batchSize) {
          await this.processBatch();
        } else if (!this.batchTimer) {
          this.batchTimer = setTimeout(() => this.processBatch(), this.config.batchTimeout);
        }
      } else {
        // Process immediately
        await this.processTransaction(tx);
      }
      
      // Update processing time metrics
      const processingTime = Date.now() - startTime;
      this.processingTimes.push(processingTime);
      if (this.processingTimes.length > 100) {
        this.processingTimes.shift();
      }
      this.metrics.avgProcessingTime = 
        this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
      
    } catch (error) {
      logger.error('Error handling transaction', { tx_hash: tx.tx_hash, error });
      this.handleError(error as Error);
    }
  }
  
  /**
   * Process a batch of transactions
   */
  private async processBatch(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }
    
    const batch = [...this.transactionBatch];
    this.transactionBatch = [];
    
    for (const tx of batch) {
      await this.processTransaction(tx);
    }
  }
  
  /**
   * Process a single transaction
   */
  private async processTransaction(tx: BloXrouteTx): Promise<void> {
    // Check if this is a DEX swap
    const isDexSwap = this.isDexSwap(tx);
    if (isDexSwap) {
      this.metrics.dexSwaps++;
      if (this.config.onDexSwap) {
        await this.config.onDexSwap(tx);
      }
    }
    
    // Check if this is a large transfer
    const value = this.getTransactionValue(tx);
    if (value && value > BigInt(1e18)) { // > 1 ETH
      this.metrics.largeTransfers++;
      if (this.config.onLargeTransfer) {
        await this.config.onLargeTransfer(tx, value);
      }
    }
    
    // Call general transaction handler
    if (this.config.onTransaction) {
      await this.config.onTransaction(tx);
    }
  }
  
  /**
   * Check if transaction passes configured filters
   */
  private passesFilters(tx: BloXrouteTx): boolean {
    const filters = this.config.filters;
    
    // Value filters
    const value = this.getTransactionValue(tx);
    if (value !== null) {
      if (filters.minValue !== undefined && value < filters.minValue) {
        return false;
      }
      if (filters.maxValue !== undefined && value > filters.maxValue) {
        return false;
      }
    }
    
    // Gas price filter
    const gasPrice = this.getGasPrice(tx);
    if (gasPrice !== null && filters.minGasPrice !== undefined) {
      if (gasPrice < filters.minGasPrice) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Check if transaction is a DEX swap
   */
  private isDexSwap(tx: BloXrouteTx): boolean {
    const methodId = tx.method_id?.toLowerCase();
    if (!methodId) {
      return false;
    }
    
    // Check against known DEX method IDs
    for (const protocol of Object.values(DEX_PROTOCOLS)) {
      if (protocol.methodIds.some(id => id.toLowerCase() === methodId)) {
        return true;
      }
    }
    
    // Check against configured protocols
    if (this.config.filters.protocols) {
      for (const protocol of this.config.filters.protocols) {
        if (protocol.methodIds.some(id => id.toLowerCase() === methodId)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Extract transaction value as bigint
   */
  private getTransactionValue(tx: BloXrouteTx): bigint | null {
    const valueStr = tx.value || tx.tx_contents?.value;
    if (!valueStr) {
      return null;
    }
    
    try {
      return BigInt(valueStr);
    } catch {
      return null;
    }
  }
  
  /**
   * Extract gas price as bigint
   */
  private getGasPrice(tx: BloXrouteTx): bigint | null {
    const gasPriceStr = tx.gas_price || tx.tx_contents?.gas_price;
    if (!gasPriceStr) {
      return null;
    }
    
    try {
      return BigInt(gasPriceStr);
    } catch {
      return null;
    }
  }
  
  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    this.metrics.errors++;
    this.metrics.lastError = error.message;
    
    if (this.config.onError) {
      this.config.onError(error);
    }
  }
}
