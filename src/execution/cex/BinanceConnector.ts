/**
 * Binance WebSocket Connector
 * 
 * Real-time order book and price streaming from Binance exchange.
 * Supports both spot and futures markets with automatic reconnection.
 * 
 * Documentation: https://binance-docs.github.io/apidocs/spot/en/
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

interface BinanceOrderBookUpdate {
  e: string; // Event type
  E: number; // Event time
  s: string; // Symbol
  U: number; // First update ID
  u: number; // Final update ID
  b: [string, string][]; // Bids [price, quantity]
  a: [string, string][]; // Asks [price, quantity]
}

interface BinanceTickerUpdate {
  e: string; // Event type ("24hrTicker")
  E: number; // Event time
  s: string; // Symbol
  c: string; // Last price
  b: string; // Best bid price
  a: string; // Best ask price
  v: string; // Total traded volume
}

/**
 * Binance WebSocket connector for real-time order book streaming
 */
export class BinanceConnector {
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

  // Binance WebSocket endpoints
  private readonly WS_BASE_URL = 'wss://stream.binance.com:9443/ws';
  private readonly WS_TESTNET_URL = 'wss://testnet.binance.vision/ws';

  constructor(
    config: CEXConnectionConfig,
    callbacks?: {
      onOrderBook?: OrderBookCallback;
      onTicker?: TickerCallback;
      onError?: ErrorCallback;
    }
  ) {
    if (config.exchange !== CEXExchange.BINANCE) {
      throw new Error(`Invalid exchange: ${config.exchange}, expected BINANCE`);
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
      exchange: CEXExchange.BINANCE,
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
   * Connect to Binance WebSocket and subscribe to order book streams
   */
  async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.warn('[BinanceConnector] Already connected');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        // Binance uses lowercase symbols without slashes: btcusdt, ethusdc
        const streams = this.config.symbols
          .map(symbol => {
            const normalized = symbol.replace(/\//g, '').toLowerCase();
            // Subscribe to both depth and ticker streams
            return [
              `${normalized}@depth20@100ms`, // Order book depth (20 levels, 100ms updates)
              `${normalized}@ticker`, // 24hr ticker statistics
            ];
          })
          .flat()
          .join('/');

        const wsUrl = this.config.testnet
          ? `${this.WS_TESTNET_URL}/${streams}`
          : `${this.WS_BASE_URL}/${streams}`;

        console.log(`[BinanceConnector] Connecting to ${wsUrl}`);
        this.ws = new WebSocket(wsUrl);

        this.ws.on('open', () => {
          console.log('[BinanceConnector] WebSocket connected');
          this.stats.connected = true;
          this.startTime = Date.now();
          this.reconnectAttempts = 0;
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
          console.error('[BinanceConnector] WebSocket error:', error.message);
          this.handleError(error);
          reject(error);
        });

        this.ws.on('close', (code: number, reason: Buffer) => {
          console.log(`[BinanceConnector] WebSocket closed: ${code} - ${reason.toString()}`);
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
      // Binance sends different event types
      if (message.e === 'depthUpdate') {
        this.handleOrderBookUpdate(message as BinanceOrderBookUpdate);
      } else if (message.e === '24hrTicker') {
        this.handleTickerUpdate(message as BinanceTickerUpdate);
      }

      this.stats.totalUpdates++;
      this.stats.lastUpdate = Date.now();
      this.updateStats();
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Process order book depth updates
   */
  private handleOrderBookUpdate(update: BinanceOrderBookUpdate): void {
    const orderBook: OrderBook = {
      exchange: CEXExchange.BINANCE,
      symbol: this.formatSymbol(update.s),
      bids: update.b.map(([price, quantity]) => ({
        price,
        quantity,
        timestamp: update.E,
      })),
      asks: update.a.map(([price, quantity]) => ({
        price,
        quantity,
        timestamp: update.E,
      })),
      timestamp: update.E,
      lastUpdateId: update.u,
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
   * Process 24hr ticker updates
   */
  private handleTickerUpdate(update: BinanceTickerUpdate): void {
    const ticker: PriceTicker = {
      exchange: CEXExchange.BINANCE,
      symbol: this.formatSymbol(update.s),
      bid: update.b,
      ask: update.a,
      last: update.c,
      volume24h: update.v,
      timestamp: update.E,
    };

    // Call callback if provided
    if (this.onTicker) {
      this.onTicker(ticker);
    }
  }

  /**
   * Format Binance symbol to standard format
   * BTCUSDT -> BTC/USDT
   */
  private formatSymbol(binanceSymbol: string): string {
    // Common quote currencies
    const quotes = ['USDT', 'USDC', 'BUSD', 'BTC', 'ETH', 'BNB'];
    
    for (const quote of quotes) {
      if (binanceSymbol.endsWith(quote)) {
        const base = binanceSymbol.slice(0, -quote.length);
        return `${base}/${quote}`;
      }
    }
    
    return binanceSymbol; // Return as-is if can't parse
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
    console.error('[BinanceConnector] Error:', error.message);
    this.stats.errors++;
    
    if (this.onError) {
      this.onError(CEXExchange.BINANCE, error);
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
        `[BinanceConnector] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`
      );

      this.reconnectTimer = setTimeout(() => {
        this.connect().catch(error => {
          console.error('[BinanceConnector] Reconnection failed:', error.message);
        });
      }, delay);
    } else {
      console.log('[BinanceConnector] Max reconnection attempts reached or reconnect disabled');
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
    console.log('[BinanceConnector] Disconnected');
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
