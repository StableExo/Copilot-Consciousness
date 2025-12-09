/**
 * OKX WebSocket Connector
 * 
 * Real-time order book and price streaming from OKX exchange.
 * Uses WebSocket Public Channel for books5 (top 5 levels) and tickers.
 * 
 * Documentation: https://www.okx.com/docs-v5/en/#websocket-api-public-channel
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

interface OKXSubscribeMessage {
  op: 'subscribe';
  args: Array<{
    channel: string;
    instId: string;
  }>;
}

interface OKXOrderBookData {
  asks: [string, string, string, string][]; // [price, size, liquidatedOrders, numOrders]
  bids: [string, string, string, string][];
  ts: string; // Timestamp
  checksum?: number;
}

interface OKXTickerData {
  instId: string;
  last: string;
  bidPx: string;
  askPx: string;
  vol24h: string;
  ts: string;
}

interface OKXMessage {
  event?: string;
  arg?: {
    channel: string;
    instId: string;
  };
  data?: any[];
}

/**
 * OKX WebSocket connector for real-time order book streaming
 */
export class OKXConnector {
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

  // OKX WebSocket endpoints
  private readonly WS_BASE_URL = 'wss://ws.okx.com:8443/ws/v5/public';
  private readonly WS_TESTNET_URL = 'wss://wspap.okx.com:8443/ws/v5/public?brokerId=9999';

  constructor(
    config: CEXConnectionConfig,
    callbacks?: {
      onOrderBook?: OrderBookCallback;
      onTicker?: TickerCallback;
      onError?: ErrorCallback;
    }
  ) {
    if (config.exchange !== CEXExchange.OKX) {
      throw new Error(`Invalid exchange: ${config.exchange}, expected OKX`);
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
      exchange: CEXExchange.OKX,
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
   * Connect to OKX WebSocket and subscribe to channels
   */
  async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.warn('[OKXConnector] Already connected');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.config.testnet
          ? this.WS_TESTNET_URL
          : this.WS_BASE_URL;

        console.log(`[OKXConnector] Connecting to ${wsUrl}`);
        this.ws = new WebSocket(wsUrl);

        this.ws.on('open', () => {
          console.log('[OKXConnector] WebSocket connected');
          this.stats.connected = true;
          this.startTime = Date.now();
          this.reconnectAttempts = 0;

          // Subscribe to books5 (top 5 levels) and tickers
          // OKX uses dash format with -SPOT suffix: BTC-USDT-SPOT
          const subscribeArgs = this.config.symbols.flatMap(symbol => {
            const instId = this.toOKXSymbol(symbol);
            return [
              { channel: 'books5', instId },
              { channel: 'tickers', instId },
            ];
          });

          const subscribeMessage: OKXSubscribeMessage = {
            op: 'subscribe',
            args: subscribeArgs,
          };

          this.ws?.send(JSON.stringify(subscribeMessage));
          console.log('[OKXConnector] Subscribed to channels');
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
          console.error('[OKXConnector] WebSocket error:', error.message);
          this.handleError(error);
          reject(error);
        });

        this.ws.on('close', (code: number, reason: Buffer) => {
          console.log(`[OKXConnector] WebSocket closed: ${code} - ${reason.toString()}`);
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
  private handleMessage(message: OKXMessage): void {
    try {
      // Handle subscription confirmation
      if (message.event === 'subscribe') {
        console.log('[OKXConnector] Subscription confirmed:', message.arg);
        return;
      }

      // Handle data updates
      if (message.data && message.arg) {
        const { channel, instId } = message.arg;
        
        if (channel === 'books5') {
          message.data.forEach(data => this.handleOrderBookUpdate(instId, data));
        } else if (channel === 'tickers') {
          message.data.forEach(data => this.handleTickerUpdate(data));
        }

        this.stats.totalUpdates++;
        this.stats.lastUpdate = Date.now();
        this.updateStats();
      }
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Process order book updates
   */
  private handleOrderBookUpdate(instId: string, data: OKXOrderBookData): void {
    const orderBook: OrderBook = {
      exchange: CEXExchange.OKX,
      symbol: this.formatSymbol(instId),
      bids: data.bids.map(([price, quantity]) => ({
        price,
        quantity,
        timestamp: parseInt(data.ts),
      })),
      asks: data.asks.map(([price, quantity]) => ({
        price,
        quantity,
        timestamp: parseInt(data.ts),
      })),
      timestamp: parseInt(data.ts),
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
   * Process ticker updates
   */
  private handleTickerUpdate(data: OKXTickerData): void {
    const ticker: PriceTicker = {
      exchange: CEXExchange.OKX,
      symbol: this.formatSymbol(data.instId),
      bid: data.bidPx,
      ask: data.askPx,
      last: data.last,
      volume24h: data.vol24h,
      timestamp: parseInt(data.ts),
    };

    // Call callback if provided
    if (this.onTicker) {
      this.onTicker(ticker);
    }
  }

  /**
   * Convert standard symbol to OKX format
   * BTC/USDT -> BTC-USDT-SPOT
   */
  private toOKXSymbol(symbol: string): string {
    const normalized = symbol.replace(/\//g, '-');
    // OKX requires -SPOT suffix for spot trading
    return normalized.endsWith('-SPOT') ? normalized : `${normalized}-SPOT`;
  }

  /**
   * Format OKX symbol to standard format
   * BTC-USDT-SPOT -> BTC/USDT
   */
  private formatSymbol(okxSymbol: string): string {
    return okxSymbol
      .replace(/-SPOT$/, '')
      .replace(/-/g, '/');
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
    console.error('[OKXConnector] Error:', error.message);
    this.stats.errors++;
    
    if (this.onError) {
      this.onError(CEXExchange.OKX, error);
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
        `[OKXConnector] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`
      );

      this.reconnectTimer = setTimeout(() => {
        this.connect().catch(error => {
          console.error('[OKXConnector] Reconnection failed:', error.message);
        });
      }, delay);
    } else {
      console.log('[OKXConnector] Max reconnection attempts reached or reconnect disabled');
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
    console.log('[OKXConnector] Disconnected');
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
