/**
 * bloXroute Client
 *
 * Integration with bloXroute Max Profit relay and mempool streaming service
 * Documentation: https://docs.bloxroute.com/
 *
 * Features:
 * - Private transaction relay (avoid public mempool)
 * - Real-time mempool streaming (newTxs, pendingTxs)
 * - MEV bundle submission
 * - Multi-chain support (Ethereum, Base, Arbitrum, Optimism, Polygon)
 * - Regional endpoint selection for latency optimization
 *
 * Usage:
 *   const client = new BloXrouteClient({
 *     apiKey: process.env.BLOXROUTE_API_KEY,
 *     network: 'ethereum',
 *     region: 'virginia'
 *   });
 *
 *   // Send private transaction
 *   const result = await client.sendPrivateTransaction(signedTx);
 *
 *   // Stream mempool transactions
 *   client.subscribe('pendingTxs', filters, (tx) => {
 *     console.log('New transaction:', tx);
 *   });
 */

import WebSocket from 'ws';
import { logger } from '../../utils/logger';

/**
 * Supported bloXroute networks
 */
export enum BloXrouteNetwork {
  ETHEREUM = 'eth',
  BASE = 'base',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  POLYGON = 'polygon',
  BSC = 'bsc',
}

/**
 * Regional endpoints for latency optimization
 */
export enum BloXrouteRegion {
  VIRGINIA = 'virginia',    // US East
  SINGAPORE = 'singapore',  // Asia
  FRANKFURT = 'frankfurt',  // Europe
  LONDON = 'london',        // UK
}

/**
 * Stream types for mempool monitoring
 */
export enum StreamType {
  NEW_TXS = 'newTxs',           // Fastest, may include unvalidated txs
  PENDING_TXS = 'pendingTxs',   // Validated mempool txs (recommended)
  ON_BLOCK = 'onBlock',         // New blocks
}

/**
 * Privacy level for transaction submission
 */
export enum BloXroutePrivacyLevel {
  /** Standard private relay */
  STANDARD = 'standard',
  /** Enhanced privacy with no hints */
  ENHANCED = 'enhanced',
}

/**
 * Configuration for bloXroute client
 */
export interface BloXrouteConfig {
  /** API key from bloXroute subscription */
  apiKey: string;

  /** Target blockchain network */
  network: BloXrouteNetwork;

  /** Regional endpoint for latency optimization */
  region?: BloXrouteRegion;

  /** Enable verbose logging */
  verbose?: boolean;

  /** Connection timeout in milliseconds */
  timeout?: number;

  /** Automatic reconnection on disconnect */
  autoReconnect?: boolean;

  /** Max reconnection attempts */
  maxReconnectAttempts?: number;
}

/**
 * Transaction filter for stream subscriptions
 */
export interface TxStreamFilter {
  /** SQL-like filter expression */
  filters?: string;

  /** Fields to include in response */
  include?: string[];
}

/**
 * Private transaction submission options
 */
export interface PrivateTxOptions {
  /** Privacy level */
  privacyLevel?: BloXroutePrivacyLevel;

  /** Target builders (default: all) */
  builders?: string[] | 'all';

  /** Block number to target */
  blockNumber?: number;
}

/**
 * Transaction data from stream
 */
export interface BloXrouteTx {
  tx_hash: string;
  tx_contents?: {
    from: string;
    to: string;
    value: string;
    gas: string;
    gas_price?: string;
    max_fee_per_gas?: string;
    max_priority_fee_per_gas?: string;
    input?: string;
    nonce?: string;
    v?: string;
    r?: string;
    s?: string;
  };
  from?: string;
  to?: string;
  value?: string;
  gas_price?: string;
  input?: string;
  local_region?: boolean;
}

/**
 * Result from private transaction submission
 */
export interface PrivateTxResult {
  tx_hash: string;
  success: boolean;
  message?: string;
}

/**
 * Statistics tracking
 */
interface ClientStats {
  txSubmitted: number;
  txSuccess: number;
  txFailed: number;
  streamMessages: number;
  reconnections: number;
  errors: number;
  lastError?: string;
  lastErrorTime?: number;
}

/**
 * BloXroute Client - Cloud API implementation
 */
export class BloXrouteClient {
  private config: Required<BloXrouteConfig>;
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, (data: BloXrouteTx) => void> = new Map();
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private stats: ClientStats;
  private messageId = 1;

  constructor(config: BloXrouteConfig) {
    this.config = {
      apiKey: config.apiKey,
      network: config.network,
      region: config.region || BloXrouteRegion.VIRGINIA,
      verbose: config.verbose ?? false,
      timeout: config.timeout || 30000,
      autoReconnect: config.autoReconnect ?? true,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
    };

    this.stats = {
      txSubmitted: 0,
      txSuccess: 0,
      txFailed: 0,
      streamMessages: 0,
      reconnections: 0,
      errors: 0,
    };

    if (!this.config.apiKey) {
      throw new Error('bloXroute API key is required');
    }

    logger.info(`[BloXrouteClient] Initialized for ${this.config.network} (${this.config.region})`);
  }

  /**
   * Build WebSocket endpoint URL
   */
  private getEndpointUrl(): string {
    const { region, network } = this.config;
    return `wss://${region}.${network}.blxrbdn.com/ws`;
  }

  /**
   * Connect to bloXroute WebSocket
   */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      logger.debug('[BloXrouteClient] Already connected');
      return;
    }

    return new Promise((resolve, reject) => {
      const url = this.getEndpointUrl();
      logger.info(`[BloXrouteClient] Connecting to ${url}`);

      this.ws = new WebSocket(url, {
        headers: {
          Authorization: this.config.apiKey,
        },
      });

      const timeout = setTimeout(() => {
        this.ws?.terminate();
        reject(new Error('Connection timeout'));
      }, this.config.timeout);

      this.ws.on('open', () => {
        clearTimeout(timeout);
        this.reconnectAttempts = 0;
        logger.info('[BloXrouteClient] Connected successfully');
        resolve();
      });

      this.ws.on('message', (data) => {
        this.handleMessage(data);
      });

      this.ws.on('error', (error) => {
        clearTimeout(timeout);
        this.stats.errors++;
        this.stats.lastError = error.message;
        this.stats.lastErrorTime = Date.now();
        logger.error(`[BloXrouteClient] WebSocket error: ${error.message}`);
        reject(error);
      });

      this.ws.on('close', () => {
        clearTimeout(timeout);
        logger.warn('[BloXrouteClient] Connection closed');
        this.handleDisconnect();
      });
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());

      if (this.config.verbose) {
        logger.debug('[BloXrouteClient] Received message:', message);
      }

      // Handle subscription messages
      if (message.params && message.params.result) {
        this.stats.streamMessages++;
        const txData = message.params.result as BloXrouteTx;

        // Notify subscribers
        for (const [subscriptionId, callback] of this.subscriptions) {
          try {
            callback(txData);
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error(`[BloXrouteClient] Error in subscription ${subscriptionId}: ${errorMsg}`);
          }
        }
      }

      // Handle RPC responses
      if (message.id && message.result !== undefined) {
        // RPC response handling can be added here if needed
        logger.debug(`[BloXrouteClient] RPC response for id ${message.id}`);
      }

      // Handle errors
      if (message.error) {
        logger.error('[BloXrouteClient] API error:', message.error);
        this.stats.errors++;
        this.stats.lastError = JSON.stringify(message.error);
        this.stats.lastErrorTime = Date.now();
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`[BloXrouteClient] Failed to parse message: ${errorMsg}`);
      this.stats.errors++;
    }
  }

  /**
   * Handle disconnection and attempt reconnection
   */
  private handleDisconnect(): void {
    this.ws = null;

    if (!this.config.autoReconnect) {
      return;
    }

    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      logger.error('[BloXrouteClient] Max reconnection attempts reached');
      return;
    }

    // Exponential backoff: 2^attempts * 1000ms, max 30s
    const delay = Math.min(Math.pow(2, this.reconnectAttempts) * 1000, 30000);
    this.reconnectAttempts++;
    this.stats.reconnections++;

    logger.info(`[BloXrouteClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
        // Resubscribe to all streams
        await this.resubscribe();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`[BloXrouteClient] Reconnection failed: ${errorMsg}`);
      }
    }, delay);
  }

  /**
   * Resubscribe to all active streams after reconnection
   */
  private async resubscribe(): Promise<void> {
    // Implementation would store subscription details and replay them
    // For now, subscribers need to call subscribe() again after reconnection
    logger.info('[BloXrouteClient] Resubscription capability - subscribers should re-subscribe');
  }

  /**
   * Subscribe to transaction stream
   *
   * @param streamType - Type of stream (newTxs, pendingTxs, onBlock)
   * @param filter - Optional filter for transactions
   * @param callback - Function to call for each transaction
   * @returns Subscription ID for unsubscribing
   */
  async subscribe(
    streamType: StreamType,
    filter: TxStreamFilter | null,
    callback: (tx: BloXrouteTx) => void
  ): Promise<string> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    const subscriptionId = `${streamType}-${this.messageId}`;
    this.subscriptions.set(subscriptionId, callback);

    const subscribeMsg = {
      jsonrpc: '2.0',
      id: this.messageId++,
      method: 'subscribe',
      params: [streamType, filter || {}],
    };

    this.ws!.send(JSON.stringify(subscribeMsg));

    logger.info(`[BloXrouteClient] Subscribed to ${streamType} (id: ${subscriptionId})`);

    return subscriptionId;
  }

  /**
   * Unsubscribe from stream
   */
  async unsubscribe(subscriptionId: string): Promise<void> {
    this.subscriptions.delete(subscriptionId);
    logger.info(`[BloXrouteClient] Unsubscribed from ${subscriptionId}`);
  }

  /**
   * Send private transaction via bloXroute relay
   *
   * @param signedTx - Signed raw transaction (0x-prefixed hex)
   * @param options - Transaction submission options
   * @returns Result with transaction hash
   */
  async sendPrivateTransaction(
    signedTx: string,
    options: PrivateTxOptions = {}
  ): Promise<PrivateTxResult> {
    this.stats.txSubmitted++;

    try {
      // bloXroute uses standard eth_sendRawTransaction for Cloud API
      // Private relay is handled by the endpoint itself
      const response = await this.sendRpcRequest('eth_sendRawTransaction', [signedTx]);

      if (response.error) {
        this.stats.txFailed++;
        logger.error('[BloXrouteClient] Transaction failed:', response.error);
        return {
          tx_hash: '',
          success: false,
          message: response.error.message || 'Transaction submission failed',
        };
      }

      this.stats.txSuccess++;
      const txHash = response.result;

      logger.info(`[BloXrouteClient] Transaction sent: ${txHash}`);

      return {
        tx_hash: txHash,
        success: true,
      };
    } catch (error) {
      this.stats.txFailed++;
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`[BloXrouteClient] Exception sending transaction: ${errorMsg}`);
      return {
        tx_hash: '',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send RPC request via WebSocket
   */
  private async sendRpcRequest(method: string, params: unknown[]): Promise<any> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      const messageId = this.messageId++;
      const request = {
        jsonrpc: '2.0',
        id: messageId,
        method,
        params,
      };

      // Set up response handler
      const timeout = setTimeout(() => {
        reject(new Error('RPC request timeout'));
      }, this.config.timeout);

      const messageHandler = (data: WebSocket.Data) => {
        try {
          const response = JSON.parse(data.toString());
          if (response.id === messageId) {
            clearTimeout(timeout);
            this.ws?.removeListener('message', messageHandler);
            resolve(response);
          }
        } catch (error) {
          // Ignore parse errors, wait for correct message
        }
      };

      this.ws!.on('message', messageHandler);
      this.ws!.send(JSON.stringify(request));
    });
  }

  /**
   * Disconnect from bloXroute
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.terminate();
      this.ws = null;
    }

    this.subscriptions.clear();
    logger.info('[BloXrouteClient] Disconnected');
  }

  /**
   * Get client statistics
   */
  getStats(): ClientStats {
    return { ...this.stats };
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
