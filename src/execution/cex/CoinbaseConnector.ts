/**
 * Coinbase WebSocket Connector
 * 
 * Real-time order book and price streaming from Coinbase Advanced Trade API.
 * Uses WebSocket Feed for level2 (orderbook) and ticker channels.
 * 
 * Documentation: https://docs.cloud.coinbase.com/advanced-trade-api/docs/ws-overview
 */

import WebSocket from 'ws';
import {
  CEXExchange,
  CEXConnectionConfig,
  OrderBook,
  OrderBookEntry,
  PriceTicker,
  CEXMonitorStats,
  OrderBookCallback,
  TickerCallback,
  ErrorCallback,
} from './types.js';

interface CoinbaseSubscribeMessage {
  type: 'subscribe';
  product_ids: string[];
  channels: string[];
}

interface CoinbaseSnapshotMessage {
  type: 'snapshot';
  product_id: string;
  bids: [string, string][]; // [price, size]
  asks: [string, string][];
  time: string;
}

interface CoinbaseL2UpdateMessage {
  type: 'l2update';
  product_id: string;
  changes: [string, string, string][]; // [side, price, size]
  time: string;
}

interface CoinbaseTickerMessage {
  type: 'ticker';
  product_id: string;
  price: string;
  best_bid: string;
  best_ask: string;
  volume_24h: string;
  time: string;
}

/**
 * Coinbase WebSocket connector for real-time order book streaming
 */
export class CoinbaseConnector {
  private config: CEXConnectionConfig;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private startTime: number = 0;
  private stats: CEXMonitorStats;
  private orderBooks: Map<string, OrderBook> = new Map();
  
  // Callbacks
  private onOrderBook?: OrderBookCallback;
  private onTicker?: TickerCallback;
  private onError?: ErrorCallback;

  // Coinbase WebSocket endpoints
  private readonly WS_BASE_URL = 'wss://advanced-trade-ws.coinbase.com';
  private readonly WS_TESTNET_URL = 'wss://advanced-trade-ws-sandbox.coinbase.com';

  constructor(
    config: CEXConnectionConfig,
    callbacks?: {
      onOrderBook?: OrderBookCallback;
      onTicker?: TickerCallback;
      onError?: ErrorCallback;
    }
  ) {
    if (config.exchange !== CEXExchange.COINBASE) {
      throw new Error(`Invalid exchange: ${config.exchange}, expected COINBASE`);
    }

    this.config = {
      reconnect: true,
      reconnectDelay: 5000,
      maxReconnectAttempts: 10,
      testnet: false,
      ...config,
    };

    this.onOrderBook = callbacks?.onOrderBook;
    this.onTicker = callbacks?.onTicker;
    this.onError = callbacks?.onError;

    this.stats = {
      exchange: CEXExchange.COINBASE,
      connected: false,
      uptime: 0,
      totalUpdates: 0,
      updatesPerSecond: 0,
      lastUpdate: 0,
      errors: 0,
      reconnections: 0,
      subscribedSymbols: [...config.symbols],
    };
  }

  /**
   * Connect to Coinbase WebSocket and subscribe to channels
   */
  async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.warn('[CoinbaseConnector] Already connected');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.config.testnet
          ? this.WS_TESTNET_URL
          : this.WS_BASE_URL;

        console.log(`[CoinbaseConnector] Connecting to ${wsUrl}`);
        this.ws = new WebSocket(wsUrl);

        this.ws.on('open', () => {
          console.log('[CoinbaseConnector] WebSocket connected');
          this.stats.connected = true;
          this.startTime = Date.now();
          this.reconnectAttempts = 0;

          // Subscribe to level2 (orderbook) and ticker channels
          // Coinbase uses dash format: BTC-USD, ETH-USDC
          const productIds = this.config.symbols.map(symbol =>
            symbol.replace(/\//g, '-')
          );

          const subscribeMessage: CoinbaseSubscribeMessage = {
            type: 'subscribe',
            product_ids: productIds,
            channels: ['level2', 'ticker'],
          };

          this.ws?.send(JSON.stringify(subscribeMessage));
          console.log('[CoinbaseConnector] Subscribed to channels:', productIds);
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleMessage(message);
          } catch (error) {
            this.handleError(error as Error);
          }
        });

        this.ws.on('error', (error: Error) => {
          console.error('[CoinbaseConnector] WebSocket error:', error.message);
          this.handleError(error);
          reject(error);
        });

        this.ws.on('close', (code: number, reason: Buffer) => {
          console.log(`[CoinbaseConnector] WebSocket closed: ${code} - ${reason.toString()}`);
          this.stats.connected = false;
          this.handleDisconnect();
        });

        this.ws.on('ping', () => {
          this.ws?.pong();
        });
      } catch (error) {
        this.handleError(error as Error);
        reject(error);
      }
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: any): void {
    try {
      // Coinbase sends different message types
      if (message.type === 'snapshot') {
        this.handleSnapshot(message as CoinbaseSnapshotMessage);
      } else if (message.type === 'l2update') {
        this.handleL2Update(message as CoinbaseL2UpdateMessage);
      } else if (message.type === 'ticker') {
        this.handleTickerUpdate(message as CoinbaseTickerMessage);
      } else if (message.type === 'subscriptions') {
        console.log('[CoinbaseConnector] Subscription confirmed:', message);
      }

      this.stats.totalUpdates++;
      this.stats.lastUpdate = Date.now();
      this.updateStats();
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Process initial orderbook snapshot
   */
  private handleSnapshot(snapshot: CoinbaseSnapshotMessage): void {
    const orderBook: OrderBook = {
      exchange: CEXExchange.COINBASE,
      symbol: this.formatSymbol(snapshot.product_id),
      bids: snapshot.bids.map(([price, quantity]) => ({
        price,
        quantity,
        timestamp: Date.parse(snapshot.time),
      })),
      asks: snapshot.asks.map(([price, quantity]) => ({
        price,
        quantity,
        timestamp: Date.parse(snapshot.time),
      })),
      timestamp: Date.parse(snapshot.time),
    };

    // Sort bids descending (highest price first)
    orderBook.bids.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    
    // Sort asks ascending (lowest price first)
    orderBook.asks.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));

    // Cache order book
    this.orderBooks.set(orderBook.symbol, orderBook);

    // Call callback if provided
    if (this.onOrderBook) {
      this.onOrderBook(orderBook);
    }
  }

  /**
   * Process orderbook updates (incremental changes)
   */
  private handleL2Update(update: CoinbaseL2UpdateMessage): void {
    const symbol = this.formatSymbol(update.product_id);
    const orderBook = this.orderBooks.get(symbol);

    if (!orderBook) {
      // If we don't have snapshot yet, skip update
      return;
    }

    // Apply incremental changes
    const timestamp = Date.parse(update.time);
    update.changes.forEach(([side, price, size]) => {
      const entries = side === 'buy' ? orderBook.bids : orderBook.asks;
      const sizeNum = parseFloat(size);

      if (sizeNum === 0) {
        // Remove price level
        const index = entries.findIndex(e => e.price === price);
        if (index !== -1) {
          entries.splice(index, 1);
        }
      } else {
        // Update or add price level
        const index = entries.findIndex(e => e.price === price);
        if (index !== -1) {
          entries[index].quantity = size;
          entries[index].timestamp = timestamp;
        } else {
          entries.push({ price, quantity: size, timestamp });
        }
      }
    });

    // Re-sort after updates
    orderBook.bids.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    orderBook.asks.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    orderBook.timestamp = timestamp;

    // Call callback if provided
    if (this.onOrderBook) {
      this.onOrderBook(orderBook);
    }
  }

  /**
   * Process ticker updates
   */
  private handleTickerUpdate(update: CoinbaseTickerMessage): void {
    const ticker: PriceTicker = {
      exchange: CEXExchange.COINBASE,
      symbol: this.formatSymbol(update.product_id),
      bid: update.best_bid,
      ask: update.best_ask,
      last: update.price,
      volume24h: update.volume_24h,
      timestamp: Date.parse(update.time),
    };

    // Call callback if provided
    if (this.onTicker) {
      this.onTicker(ticker);
    }
  }

  /**
   * Format Coinbase symbol to standard format
   * BTC-USD -> BTC/USD, ETH-USDC -> ETH/USDC
   */
  private formatSymbol(coinbaseSymbol: string): string {
    return coinbaseSymbol.replace(/-/g, '/');
  }

  /**
   * Update statistics
   */
  private updateStats(): void {
    if (this.startTime > 0) {
      const uptime = (Date.now() - this.startTime) / 1000;
      this.stats.uptime = uptime;
      this.stats.updatesPerSecond = this.stats.totalUpdates / uptime;
    }
  }

  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    console.error('[CoinbaseConnector] Error:', error.message);
    this.stats.errors++;
    
    if (this.onError) {
      this.onError(CEXExchange.COINBASE, error);
    }
  }

  /**
   * Handle disconnect and attempt reconnection
   */
  private handleDisconnect(): void {
    this.stats.connected = false;

    if (
      this.config.reconnect &&
      this.reconnectAttempts < (this.config.maxReconnectAttempts || 10)
    ) {
      this.reconnectAttempts++;
      this.stats.reconnections++;
      
      const delay = this.config.reconnectDelay || 5000;
      console.log(
        `[CoinbaseConnector] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`
      );

      this.reconnectTimer = setTimeout(() => {
        this.connect().catch(error => {
          console.error('[CoinbaseConnector] Reconnection failed:', error.message);
        });
      }, delay);
    } else {
      console.log('[CoinbaseConnector] Max reconnection attempts reached or reconnect disabled');
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }

    this.stats.connected = false;
    console.log('[CoinbaseConnector] Disconnected');
  }

  /**
   * Get current order book for a symbol
   */
  getOrderBook(symbol: string): OrderBook | undefined {
    return this.orderBooks.get(symbol);
  }

  /**
   * Get all cached order books
   */
  getAllOrderBooks(): OrderBook[] {
    return Array.from(this.orderBooks.values());
  }

  /**
   * Get connection statistics
   */
  getStats(): CEXMonitorStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
