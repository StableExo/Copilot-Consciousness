/**
 * MEXC WebSocket Connector
 * 
 * Real-time order book and price streaming from MEXC exchange.
 * Uses WebSocket API for spot trading.
 * 
 * Documentation: https://mexcdevelop.github.io/apidocs/spot_v3_en/#websocket-market-streams
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

interface MEXCSubscribeMessage {
  method: 'SUBSCRIPTION';
  params: string[];
}

interface MEXCMessage {
  c?: string; // Channel
  d?: any; // Data
  s?: string; // Symbol
  t?: number; // Timestamp
}

/**
 * MEXC WebSocket connector for real-time order book streaming
 */
export class MEXCConnector {
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

  // MEXC WebSocket endpoints
  private readonly WS_BASE_URL = 'wss://wbs.mexc.com/ws';
  private readonly PING_INTERVAL = 15000; // 15 seconds

  constructor(
    config: CEXConnectionConfig,
    callbacks?: {
      onOrderBook?: OrderBookCallback;
      onTicker?: TickerCallback;
      onError?: ErrorCallback;
    }
  ) {
    if (config.exchange !== CEXExchange.MEXC) {
      throw new Error(`Invalid exchange: ${config.exchange}, expected MEXC`);
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
      exchange: CEXExchange.MEXC,
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
   * Connect to MEXC WebSocket and subscribe to channels
   */
  async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.warn('[MEXCConnector] Already connected');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        console.log(`[MEXCConnector] Connecting to ${this.WS_BASE_URL}`);
        this.ws = new WebSocket(this.WS_BASE_URL);

        this.ws.on('open', () => {
          console.log('[MEXCConnector] WebSocket connected');
          this.stats.connected = true;
          this.startTime = Date.now();
          this.reconnectAttempts = 0;

          // Start ping timer
          this.startPingTimer();

          // Subscribe to ticker and depth (order book) for each symbol
          const subscriptionParams: string[] = [];
          
          this.config.symbols.forEach(symbol => {
            const mexcSymbol = this.toMEXCSymbol(symbol);
            
            // Add ticker subscription
            subscriptionParams.push(`spot@public.miniTickers.v3.api@${mexcSymbol}`);
            
            // Add depth subscription (20 levels)
            subscriptionParams.push(`spot@public.limit.depth.v3.api@${mexcSymbol}@20`);
          });

          const subscribeMsg: MEXCSubscribeMessage = {
            method: 'SUBSCRIPTION',
            params: subscriptionParams,
          };

          this.ws?.send(JSON.stringify(subscribeMsg));
          console.log('[MEXCConnector] Subscribed to channels');
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
          console.error('[MEXCConnector] WebSocket error:', error.message);
          this.handleError(error);
          reject(error);
        });

        this.ws.on('close', (code: number, reason: Buffer) => {
          console.log(`[MEXCConnector] WebSocket closed: ${code} - ${reason.toString()}`);
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
        this.ws.ping();
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
  private handleMessage(message: MEXCMessage | any): void {
    try {
      // Handle subscription confirmation
      if (message.msg === 'SUBSCRIPTION' || message.code === 0) {
        console.log('[MEXCConnector] Subscription confirmed');
        return;
      }

      // Handle channel data
      if (message.c && message.d) {
        const channel = message.c;
        const data = message.d;
        
        if (channel.includes('miniTickers')) {
          this.handleTickerUpdate(message.s, data);
        } else if (channel.includes('limit.depth')) {
          this.handleOrderBookUpdate(message.s, data);
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
   * Format: { c: last_price, o: open, h: high, l: low, v: volume, ... }
   */
  private handleTickerUpdate(symbol: string, data: any): void {
    const ticker: PriceTicker = {
      exchange: CEXExchange.MEXC,
      symbol: this.formatSymbol(symbol),
      bid: data.b || '0', // Best bid
      ask: data.a || '0', // Best ask
      last: data.c || '0', // Last price
      volume24h: data.v || '0', // Volume
      timestamp: data.t || Date.now(),
    };

    if (this.onTicker) {
      this.onTicker(ticker);
    }
  }

  /**
   * Process order book updates
   * Format: { asks: [[price, quantity]], bids: [[price, quantity]] }
   */
  private handleOrderBookUpdate(symbol: string, data: any): void {
    const timestamp = Date.now();
    
    const orderBook: OrderBook = {
      exchange: CEXExchange.MEXC,
      symbol: this.formatSymbol(symbol),
      bids: (data.bids || []).map(([price, quantity]: [string, string]) => ({
        price,
        quantity,
        timestamp,
      })),
      asks: (data.asks || []).map(([price, quantity]: [string, string]) => ({
        price,
        quantity,
        timestamp,
      })),
      timestamp,
    };

    // MEXC sends data pre-sorted
    this.orderBooks.set(orderBook.symbol, orderBook);

    if (this.onOrderBook) {
      this.onOrderBook(orderBook);
    }
  }

  /**
   * Convert standard symbol to MEXC format
   * BTC/USDT -> BTCUSDT
   */
  private toMEXCSymbol(symbol: string): string {
    return symbol.replace(/\//g, '');
  }

  /**
   * Format MEXC symbol to standard format
   * BTCUSDT -> BTC/USDT
   */
  private formatSymbol(mexcSymbol: string): string {
    // Common quote currencies
    const quoteCurrencies = ['USDT', 'USDC', 'USD', 'BTC', 'ETH', 'BNB'];
    
    for (const quote of quoteCurrencies) {
      if (mexcSymbol.endsWith(quote)) {
        const base = mexcSymbol.slice(0, -quote.length);
        return `${base}/${quote}`;
      }
    }
    
    // Default fallback
    return mexcSymbol;
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
    console.error('[MEXCConnector] Error:', error.message);
    this.stats.errors++;
    
    if (this.onError) {
      this.onError(CEXExchange.MEXC, error);
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
        `[MEXCConnector] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`
      );

      this.reconnectTimer = setTimeout(() => {
        this.connect().catch(error => {
          console.error('[MEXCConnector] Reconnection failed:', error.message);
        });
      }, delay);
    } else {
      console.log('[MEXCConnector] Max reconnection attempts reached or reconnect disabled');
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
    console.log('[MEXCConnector] Disconnected');
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
