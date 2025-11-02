/**
 * WebSocketStreamManager
 * 
 * Manages WebSocket connections to Ethereum providers and listens to DEX pool events.
 * Implements automatic reconnection, error recovery, and event emission.
 */

import { EventEmitter } from 'events';
import { ethers } from 'ethers';
import { WebSocketEndpoint, RetryConfig } from '../../config/realtime.config';

/**
 * Pool event data structure
 */
export interface PoolEvent {
  eventType: 'Sync' | 'Swap' | 'Mint' | 'Burn';
  poolAddress: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
  reserve0?: bigint;
  reserve1?: bigint;
  amount0In?: bigint;
  amount1In?: bigint;
  amount0Out?: bigint;
  amount1Out?: bigint;
  sender?: string;
  to?: string;
}

/**
 * WebSocket connection status
 */
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

/**
 * WebSocket Stream Manager
 * 
 * Manages WebSocket connections and pool event subscriptions using EventEmitter pattern.
 */
export class WebSocketStreamManager extends EventEmitter {
  private provider: ethers.providers.WebSocketProvider | null = null;
  private endpoints: WebSocketEndpoint[];
  private currentEndpointIndex: number = 0;
  private retryConfig: RetryConfig;
  private connectionStatus: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private reconnectAttempts: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private poolSubscriptions: Map<string, ethers.Contract> = new Map();
  private isShuttingDown: boolean = false;

  // Standard Uniswap V2 pool ABI for events
  private readonly POOL_ABI = [
    'event Sync(uint112 reserve0, uint112 reserve1)',
    'event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)',
    'event Mint(address indexed sender, uint amount0, uint amount1)',
    'event Burn(address indexed sender, uint amount0, uint amount1, address indexed to)',
  ];

  constructor(endpoints: WebSocketEndpoint[], retryConfig: RetryConfig) {
    super();
    this.endpoints = endpoints.sort((a, b) => a.priority - b.priority);
    this.retryConfig = retryConfig;
  }

  /**
   * Connect to WebSocket provider
   */
  async connect(): Promise<void> {
    if (this.isShuttingDown) {
      throw new Error('Cannot connect while shutting down');
    }

    if (this.connectionStatus === ConnectionStatus.CONNECTED) {
      return;
    }

    this.setConnectionStatus(ConnectionStatus.CONNECTING);

    try {
      const endpoint = this.endpoints[this.currentEndpointIndex];
      
      this.provider = new ethers.providers.WebSocketProvider(endpoint.url);

      // Set up provider event listeners
      this.setupProviderListeners();

      // Wait for connection to be established
      await this.provider.ready;

      this.setConnectionStatus(ConnectionStatus.CONNECTED);
      this.reconnectAttempts = 0;

      this.emit('connected', { endpoint: endpoint.url });
    } catch (error) {
      this.setConnectionStatus(ConnectionStatus.ERROR);
      this.emit('error', error);
      
      // Attempt to reconnect
      await this.handleReconnect();
    }
  }

  /**
   * Set up provider event listeners
   */
  private setupProviderListeners(): void {
    if (!this.provider) return;

    this.provider.on('error', (error) => {
      this.emit('error', error);
      this.handleReconnect();
    });

    this.provider.on('close', () => {
      if (!this.isShuttingDown) {
        this.emit('disconnected');
        this.handleReconnect();
      }
    });
  }

  /**
   * Handle reconnection logic with exponential backoff
   */
  private async handleReconnect(): Promise<void> {
    if (this.isShuttingDown || this.connectionStatus === ConnectionStatus.RECONNECTING) {
      return;
    }

    this.setConnectionStatus(ConnectionStatus.RECONNECTING);

    if (this.reconnectAttempts >= this.retryConfig.maxAttempts) {
      // Try next endpoint
      this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.endpoints.length;
      this.reconnectAttempts = 0;
      
      // If we've cycled through all endpoints, emit error
      if (this.currentEndpointIndex === 0) {
        this.setConnectionStatus(ConnectionStatus.ERROR);
        this.emit('allEndpointsFailed');
        return;
      }
    }

    const delay = Math.min(
      this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, this.reconnectAttempts),
      this.retryConfig.maxDelay
    );

    this.emit('reconnecting', { attempt: this.reconnectAttempts + 1, delay });

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectAttempts++;
      
      // Clean up old provider
      if (this.provider) {
        await this.provider.removeAllListeners();
        await this.provider.destroy();
        this.provider = null;
      }

      // Attempt to reconnect
      await this.connect();
    }, delay);
  }

  /**
   * Subscribe to events from a specific pool
   */
  async subscribeToPool(poolAddress: string): Promise<void> {
    if (!this.provider) {
      throw new Error('Provider not connected');
    }

    if (this.poolSubscriptions.has(poolAddress)) {
      return; // Already subscribed
    }

    const poolContract = new ethers.Contract(poolAddress, this.POOL_ABI, this.provider);

    // Listen to Sync events
    poolContract.on('Sync', async (reserve0: ethers.BigNumber, reserve1: ethers.BigNumber, event: ethers.Event) => {
      const poolEvent: PoolEvent = {
        eventType: 'Sync',
        poolAddress,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        timestamp: Date.now(),
        reserve0: BigInt(reserve0.toString()),
        reserve1: BigInt(reserve1.toString()),
      };
      this.emit('poolEvent', poolEvent);
    });

    // Listen to Swap events
    poolContract.on('Swap', async (
      sender: string,
      amount0In: ethers.BigNumber,
      amount1In: ethers.BigNumber,
      amount0Out: ethers.BigNumber,
      amount1Out: ethers.BigNumber,
      to: string,
      event: ethers.Event
    ) => {
      const poolEvent: PoolEvent = {
        eventType: 'Swap',
        poolAddress,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        timestamp: Date.now(),
        sender,
        amount0In: BigInt(amount0In.toString()),
        amount1In: BigInt(amount1In.toString()),
        amount0Out: BigInt(amount0Out.toString()),
        amount1Out: BigInt(amount1Out.toString()),
        to,
      };
      this.emit('poolEvent', poolEvent);
    });

    // Listen to Mint events
    poolContract.on('Mint', async (
      sender: string,
      amount0: ethers.BigNumber,
      amount1: ethers.BigNumber,
      event: ethers.Event
    ) => {
      const poolEvent: PoolEvent = {
        eventType: 'Mint',
        poolAddress,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        timestamp: Date.now(),
        sender,
        amount0In: BigInt(amount0.toString()),
        amount1In: BigInt(amount1.toString()),
      };
      this.emit('poolEvent', poolEvent);
    });

    // Listen to Burn events
    poolContract.on('Burn', async (
      sender: string,
      amount0: ethers.BigNumber,
      amount1: ethers.BigNumber,
      to: string,
      event: ethers.Event
    ) => {
      const poolEvent: PoolEvent = {
        eventType: 'Burn',
        poolAddress,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        timestamp: Date.now(),
        sender,
        amount0Out: BigInt(amount0.toString()),
        amount1Out: BigInt(amount1.toString()),
        to,
      };
      this.emit('poolEvent', poolEvent);
    });

    this.poolSubscriptions.set(poolAddress, poolContract);
    this.emit('subscribed', { poolAddress });
  }

  /**
   * Unsubscribe from a specific pool
   */
  async unsubscribeFromPool(poolAddress: string): Promise<void> {
    const contract = this.poolSubscriptions.get(poolAddress);
    if (contract) {
      await contract.removeAllListeners();
      this.poolSubscriptions.delete(poolAddress);
      this.emit('unsubscribed', { poolAddress });
    }
  }

  /**
   * Unsubscribe from all pools
   */
  async unsubscribeAll(): Promise<void> {
    const addresses = Array.from(this.poolSubscriptions.keys());
    for (const address of addresses) {
      await this.unsubscribeFromPool(address);
    }
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Get list of subscribed pool addresses
   */
  getSubscribedPools(): string[] {
    return Array.from(this.poolSubscriptions.keys());
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionStatus === ConnectionStatus.CONNECTED;
  }

  /**
   * Set connection status and emit event
   */
  private setConnectionStatus(status: ConnectionStatus): void {
    const oldStatus = this.connectionStatus;
    this.connectionStatus = status;
    
    if (oldStatus !== status) {
      this.emit('statusChanged', { from: oldStatus, to: status });
    }
  }

  /**
   * Gracefully shutdown the stream manager
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Unsubscribe from all pools
    await this.unsubscribeAll();

    // Close provider connection
    if (this.provider) {
      await this.provider.removeAllListeners();
      await this.provider.destroy();
      this.provider = null;
    }

    this.setConnectionStatus(ConnectionStatus.DISCONNECTED);
    this.emit('shutdown');
  }
}
