/**
 * Bybit WebSocket Connector
 * 
 * Real-time order book and price streaming from Bybit exchange.
 * Uses WebSocket Public Channel for orderbook and tickers.
 * 
 * Documentation: https://bybit-exchange.github.io/docs/v5/websocket/public/orderbook
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

interface BybitSubscribeMessage {
  op: 'subscribe';
  args: string[];
}

interface BybitOrderBookData {
  s: string; // Symbol
  b: [string, string][]; // Bids [price, size]
  a: [string, string][]; // Asks [price, size]
  u: number; // Update ID
  seq: number; // Cross sequence
  cts: number; // Creation timestamp
}

interface BybitTickerData {
  symbol: string;
  lastPrice: string;
  bid1Price: string;
  ask1Price: string;
  volume24h: string;
  ts: number;
}

interface BybitMessage {
  topic?: string;
  type?: string;
  data?: any;
  ts?: number;
}

/**
 * Bybit WebSocket connector for real-time order book streaming
 */
export class BybitConnector {
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

  // Bybit WebSocket endpoints
  private readonly WS_BASE_URL = 'wss://stream.bybit.com/v5/public/spot';
  private readonly WS_TESTNET_URL = 'wss://stream-testnet.bybit.com/v5/public/spot';

  constructor(
    config: CEXConnectionConfig,
    callbacks?: {
      onOrderBook?: OrderBookCallback;
      onTicker?: TickerCallback;
      onError?: ErrorCallback;
    }
  ) {
    if (config.exchange !== CEXExchange.BYBIT) {
      throw new Error(`Invalid exchange: ${config.exchange}, expected BYBIT`);
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
      exchange: CEXExchange.BYBIT,
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
   * Connect to Bybit WebSocket and subscribe to channels
   */
  async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.warn('[BybitConnector] Already connected');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.config.testnet
          ? this.WS_TESTNET_URL
          : this.WS_BASE_URL;

        console.log(`[BybitConnector] Connecting to ${wsUrl}`);
        this.ws = new WebSocket(wsUrl);

        this.ws.on('open', () => {
          console.log('[BybitConnector] WebSocket connected');
          this.stats.connected = true;
          this.startTime = Date.now();
          this.reconnectAttempts = 0;

          // Subscribe to orderbook (50 levels) and tickers
          // Bybit uses no separator: BTCUSDT, ETHUSDC
          const subscribeArgs = this.config.symbols.flatMap(symbol => {
            const bybitSymbol = this.toBybitSymbol(symbol);
            return [
              `orderbook.50.${bybitSymbol}`,
              `tickers.${bybitSymbol}`,
            ];
          });

          const subscribeMessage: BybitSubscribeMessage = {
            op: 'subscribe',
            args: subscribeArgs,
          };

          this.ws?.send(JSON.stringify(subscribeMessage));
          console.log('[BybitConnector] Subscribed to channels');
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
          console.error('[BybitConnector] WebSocket error:', error.message);
          this.handleError(error);
          reject(error);
        });

        this.ws.on('close', (code: number, reason: Buffer) => {
          console.log(`[BybitConnector] WebSocket closed: ${code} - ${reason.toString()}`);
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
  private handleMessage(message: BybitMessage): void {
    try {
      // Handle subscription confirmation
      if (message.type === 'COMMAND_RESP') {
        console.log('[BybitConnector] Subscription confirmed');
        return;
      }

      // Handle data updates
      if (message.topic && message.data) {
        if (message.topic.startsWith('orderbook.')) {
          this.handleOrderBookUpdate(message.data);
        } else if (message.topic.startsWith('tickers.')) {
          this.handleTickerUpdate(message.data);
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
  private handleOrderBookUpdate(data: BybitOrderBookData): void {
    const orderBook: OrderBook = {
      exchange: CEXExchange.BYBIT,
      symbol: this.formatSymbol(data.s),
      bids: data.b.map(([price, quantity]) => ({
        price,
        quantity,
        timestamp: data.cts,
      })),
      asks: data.a.map(([price, quantity]) => ({
        price,
        quantity,
        timestamp: data.cts,
      })),
      timestamp: data.cts,
      lastUpdateId: data.u,
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
  private handleTickerUpdate(data: BybitTickerData): void {
    const ticker: PriceTicker = {
      exchange: CEXExchange.BYBIT,
      symbol: this.formatSymbol(data.symbol),
      bid: data.bid1Price,
      ask: data.ask1Price,
      last: data.lastPrice,
      volume24h: data.volume24h,
      timestamp: data.ts,
    };

    // Call callback if provided
    if (this.onTicker) {
      this.onTicker(ticker);
    }
  }

  /**
   * Convert standard symbol to Bybit format
   * BTC/USDT -> BTCUSDT
   */
  private toBybitSymbol(symbol: string): string {
    return symbol.replace(/\//g, '');
  }

  /**
   * Format Bybit symbol to standard format
   * BTCUSDT -> BTC/USDT
   */
  private formatSymbol(bybitSymbol: string): string {
    // Common quote currencies
    const quotes = ['USDT', 'USDC', 'BTC', 'ETH'];
    
    for (const quote of quotes) {
      if (bybitSymbol.endsWith(quote)) {
        const base = bybitSymbol.slice(0, -quote.length);
        return `${base}/${quote}`;
      }
    }
    
    return bybitSymbol; // Return as-is if can't parse
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
    console.error('[BybitConnector] Error:', error.message);
    this.stats.errors++;
    
    if (this.onError) {
      this.onError(CEXExchange.BYBIT, error);
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
        `[BybitConnector] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`
      );

      this.reconnectTimer = setTimeout(() => {
        this.connect().catch(error => {
          console.error('[BybitConnector] Reconnection failed:', error.message);
        });
      }, delay);
    } else {
      console.log('[BybitConnector] Max reconnection attempts reached or reconnect disabled');
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
    console.log('[BybitConnector] Disconnected');
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
