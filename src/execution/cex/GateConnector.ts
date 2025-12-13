/**
 * Gate.io WebSocket Connector
 * 
 * Real-time order book and price streaming from Gate.io exchange.
 * Uses WebSocket v4 API for spot trading.
 * 
 * Documentation: https://www.gate.io/docs/developers/apiv4/ws/en/
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

interface GateSubscribeMessage {
  time: number;
  channel: string;
  event: 'subscribe';
  payload: string[];
}

interface GateMessage {
  time: number;
  time_ms?: number;
  channel: string;
  event: string;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

/**
 * Gate.io WebSocket connector for real-time order book streaming
 */
export class GateConnector {
  private config: CEXConnectionConfig;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private startTime: number = 0;
  private stats: CEXMonitorStats;
  private orderBooks: Map<string, OrderBook> = new Map();
  
  // Callbacks
  private onOrderBook?: OrderBookCallback;
  private onTicker?: TickerCallback;
  private onError?: ErrorCallback;

  // Gate.io WebSocket endpoints
  private readonly WS_BASE_URL = 'wss://api.gateio.ws/ws/v4/';
  private readonly PING_INTERVAL = 15000; // 15 seconds

  constructor(
    config: CEXConnectionConfig,
    callbacks?: {
      onOrderBook?: OrderBookCallback;
      onTicker?: TickerCallback;
      onError?: ErrorCallback;
    }
  ) {
    if (config.exchange !== CEXExchange.GATE) {
      throw new Error(`Invalid exchange: ${config.exchange}, expected GATE`);
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
      exchange: CEXExchange.GATE,
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
   * Connect to Gate.io WebSocket and subscribe to channels
   */
  async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.warn('[GateConnector] Already connected');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        console.log(`[GateConnector] Connecting to ${this.WS_BASE_URL}`);
        this.ws = new WebSocket(this.WS_BASE_URL);

        this.ws.on('open', () => {
          console.log('[GateConnector] WebSocket connected');
          this.stats.connected = true;
          this.startTime = Date.now();
          this.reconnectAttempts = 0;

          // Start ping timer
          this.startPingTimer();

          // Subscribe to tickers and order book for each symbol
          this.config.symbols.forEach(symbol => {
            const gateSymbol = this.toGateSymbol(symbol);
            
            // Subscribe to ticker
            const tickerMsg: GateSubscribeMessage = {
              time: Math.floor(Date.now() / 1000),
              channel: 'spot.tickers',
              event: 'subscribe',
              payload: [gateSymbol],
            };
            this.ws?.send(JSON.stringify(tickerMsg));

            // Subscribe to order book with configurable depth and frequency
            const depth = this.config.orderBookDepth?.toString() || '20';
            const frequency = this.config.updateFrequency || '1000ms';
            const bookMsg: GateSubscribeMessage = {
              time: Math.floor(Date.now() / 1000),
              channel: 'spot.order_book',
              event: 'subscribe',
              payload: [gateSymbol, depth, frequency],
            };
            this.ws?.send(JSON.stringify(bookMsg));
          });

          console.log('[GateConnector] Subscribed to channels');
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
          console.error('[GateConnector] WebSocket error:', error.message);
          this.handleError(error);
          reject(error);
        });

        this.ws.on('close', (code: number, reason: Buffer) => {
          console.log(`[GateConnector] WebSocket closed: ${code} - ${reason.toString()}`);
          this.stats.connected = false;
          this.stopPingTimer();
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
   * Start ping timer to keep connection alive
   */
  private startPingTimer(): void {
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const pingMsg = {
          time: Math.floor(Date.now() / 1000),
          channel: 'spot.ping',
        };
        this.ws.send(JSON.stringify(pingMsg));
      }
    }, this.PING_INTERVAL);
  }

  /**
   * Stop ping timer
   */
  private stopPingTimer(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: GateMessage): void {
    try {
      // Handle subscription response
      if (message.event === 'subscribe') {
        if (message.error) {
          console.error('[GateConnector] Subscription error:', message.error);
          this.handleError(new Error(`Gate.io subscription error: ${message.error.message}`));
        } else {
          console.log(`[GateConnector] Subscribed to ${message.channel}`);
        }
        return;
      }

      // Handle pong
      if (message.channel === 'spot.pong') {
        return;
      }

      // Handle update events
      if (message.event === 'update' && message.result) {
        if (message.channel === 'spot.tickers') {
          this.handleTickerUpdate(message.result);
        } else if (message.channel === 'spot.order_book') {
          this.handleOrderBookUpdate(message.result);
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
   * Process ticker updates
   */
  private handleTickerUpdate(data: any): void {
    const ticker: PriceTicker = {
      exchange: CEXExchange.GATE,
      symbol: this.formatSymbol(data.currency_pair),
      bid: data.highest_bid || '0',
      ask: data.lowest_ask || '0',
      last: data.last || '0',
      volume24h: data.base_volume || '0',
      timestamp: data.time_ms || Date.now(),
    };

    if (this.onTicker) {
      this.onTicker(ticker);
    }
  }

  /**
   * Process order book updates
   * Format: { t: timestamp_ms, s: symbol, U: update_id, bids: [[price, amount]], asks: [[price, amount]] }
   */
  private handleOrderBookUpdate(data: any): void {
    const orderBook: OrderBook = {
      exchange: CEXExchange.GATE,
      symbol: this.formatSymbol(data.s),
      bids: (data.bids || []).map(([price, quantity]: [string, string]) => ({
        price,
        quantity,
        timestamp: data.t || Date.now(),
      })),
      asks: (data.asks || []).map(([price, quantity]: [string, string]) => ({
        price,
        quantity,
        timestamp: data.t || Date.now(),
      })),
      timestamp: data.t || Date.now(),
      lastUpdateId: data.U,
    };

    // Gate.io sends data pre-sorted
    this.orderBooks.set(orderBook.symbol, orderBook);

    if (this.onOrderBook) {
      this.onOrderBook(orderBook);
    }
  }

  /**
   * Convert standard symbol to Gate.io format
   * BTC/USDT -> BTC_USDT
   */
  private toGateSymbol(symbol: string): string {
    return symbol.replace(/\//g, '_');
  }

  /**
   * Format Gate.io symbol to standard format
   * BTC_USDT -> BTC/USDT
   */
  private formatSymbol(gateSymbol: string): string {
    return gateSymbol.replace(/_/g, '/');
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
    console.error('[GateConnector] Error:', error.message);
    this.stats.errors++;
    
    if (this.onError) {
      this.onError(CEXExchange.GATE, error);
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
        `[GateConnector] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`
      );

      this.reconnectTimer = setTimeout(() => {
        this.connect().catch(error => {
          console.error('[GateConnector] Reconnection failed:', error.message);
        });
      }, delay);
    } else {
      console.log('[GateConnector] Max reconnection attempts reached or reconnect disabled');
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    this.stopPingTimer();

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
    console.log('[GateConnector] Disconnected');
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
