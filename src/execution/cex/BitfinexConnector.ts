/**
 * Bitfinex WebSocket Connector
 * 
 * Real-time order book and price streaming from Bitfinex exchange.
 * Uses WebSocket v2 API with array-based data structures.
 * 
 * Documentation: https://docs.bitfinex.com/docs/ws-general
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
import { COMMON_QUOTE_CURRENCIES, formatToStandardSymbol } from './symbolUtils.js';

interface BitfinexSubscribeMessage {
  event: 'subscribe';
  channel: string;
  symbol: string;
}

/**
 * Bitfinex WebSocket connector for real-time order book streaming
 * Note: Bitfinex uses array-based messages which can be tricky to parse
 */
export class BitfinexConnector {
  private config: CEXConnectionConfig;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private startTime: number = 0;
  private stats: CEXMonitorStats;
  private orderBooks: Map<string, OrderBook> = new Map();
  private channelMap: Map<number, { type: string; symbol: string }> = new Map();
  
  // Callbacks
  private onOrderBook?: OrderBookCallback;
  private onTicker?: TickerCallback;
  private onError?: ErrorCallback;

  // Bitfinex WebSocket endpoints
  private readonly WS_BASE_URL = 'wss://api-pub.bitfinex.com/ws/2';

  constructor(
    config: CEXConnectionConfig,
    callbacks?: {
      onOrderBook?: OrderBookCallback;
      onTicker?: TickerCallback;
      onError?: ErrorCallback;
    }
  ) {
    if (config.exchange !== CEXExchange.BITFINEX) {
      throw new Error(`Invalid exchange: ${config.exchange}, expected BITFINEX`);
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
      exchange: CEXExchange.BITFINEX,
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
   * Connect to Bitfinex WebSocket and subscribe to channels
   */
  async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.warn('[BitfinexConnector] Already connected');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        console.log(`[BitfinexConnector] Connecting to ${this.WS_BASE_URL}`);
        this.ws = new WebSocket(this.WS_BASE_URL);

        this.ws.on('open', () => {
          console.log('[BitfinexConnector] WebSocket connected');
          this.stats.connected = true;
          this.startTime = Date.now();
          this.reconnectAttempts = 0;

          // Subscribe to ticker and book channels for each symbol
          this.config.symbols.forEach(symbol => {
            const bfxSymbol = this.toBitfinexSymbol(symbol);
            
            // Subscribe to ticker
            const tickerMsg: BitfinexSubscribeMessage = {
              event: 'subscribe',
              channel: 'ticker',
              symbol: bfxSymbol,
            };
            this.ws?.send(JSON.stringify(tickerMsg));

            // Subscribe to book (25 levels)
            const bookMsg: BitfinexSubscribeMessage = {
              event: 'subscribe',
              channel: 'book',
              symbol: bfxSymbol,
            };
            this.ws?.send(JSON.stringify(bookMsg));
          });

          console.log('[BitfinexConnector] Subscribed to channels');
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
          console.error('[BitfinexConnector] WebSocket error:', error.message);
          this.handleError(error);
          reject(error);
        });

        this.ws.on('close', (code: number, reason: Buffer) => {
          console.log(`[BitfinexConnector] WebSocket closed: ${code} - ${reason.toString()}`);
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
   * Bitfinex uses array-based messages: [CHANNEL_ID, DATA]
   */
  private handleMessage(message: any): void {
    try {
      // Handle event messages (objects)
      if (typeof message === 'object' && !Array.isArray(message)) {
        if (message.event === 'subscribed') {
          console.log(`[BitfinexConnector] Subscribed to ${message.channel} for ${message.symbol}`);
          this.channelMap.set(message.chanId, {
            type: message.channel,
            symbol: message.symbol,
          });
        } else if (message.event === 'info') {
          console.log('[BitfinexConnector] Info:', message);
        } else if (message.event === 'error') {
          console.error('[BitfinexConnector] Error event:', message);
          this.handleError(new Error(`Bitfinex error: ${message.msg}`));
        }
        return;
      }

      // Handle data messages (arrays)
      if (Array.isArray(message)) {
        const [channelId, data] = message;
        
        // Skip heartbeat messages
        if (data === 'hb') return;

        const channelInfo = this.channelMap.get(channelId);
        if (!channelInfo) return;

        if (channelInfo.type === 'ticker') {
          this.handleTickerUpdate(channelInfo.symbol, data);
        } else if (channelInfo.type === 'book') {
          this.handleOrderBookUpdate(channelInfo.symbol, data);
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
   * Ticker format: [BID, BID_SIZE, ASK, ASK_SIZE, DAILY_CHANGE, DAILY_CHANGE_RELATIVE, LAST_PRICE, VOLUME, HIGH, LOW]
   */
  private handleTickerUpdate(bfxSymbol: string, data: any[]): void {
    if (!Array.isArray(data) || data.length < 10) return;

    const [bid, , ask, , , , last, volume] = data;

    const ticker: PriceTicker = {
      exchange: CEXExchange.BITFINEX,
      symbol: this.formatSymbol(bfxSymbol),
      bid: bid.toString(),
      ask: ask.toString(),
      last: last.toString(),
      volume24h: volume.toString(),
      timestamp: Date.now(),
    };

    if (this.onTicker) {
      this.onTicker(ticker);
    }
  }

  /**
   * Process order book updates
   * Book snapshot: [[PRICE, COUNT, AMOUNT], ...]
   * Book update: [PRICE, COUNT, AMOUNT]
   */
  private handleOrderBookUpdate(bfxSymbol: string, data: any): void {
    const symbol = this.formatSymbol(bfxSymbol);
    
    // Snapshot (array of arrays)
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const bids: OrderBookEntry[] = [];
      const asks: OrderBookEntry[] = [];
      const timestamp = Date.now();

      data.forEach(([price, count, amount]: [number, number, number]) => {
        if (count > 0) {
          const entry: OrderBookEntry = {
            price: Math.abs(price).toString(),
            quantity: Math.abs(amount).toString(),
            timestamp,
          };

          if (amount > 0) {
            bids.push(entry);
          } else {
            asks.push(entry);
          }
        }
      });

      // Sort bids descending, asks ascending
      bids.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
      asks.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));

      const orderBook: OrderBook = {
        exchange: CEXExchange.BITFINEX,
        symbol,
        bids,
        asks,
        timestamp,
      };

      this.orderBooks.set(symbol, orderBook);

      if (this.onOrderBook) {
        this.onOrderBook(orderBook);
      }
    }
    // Single update (array with 3 elements)
    else if (Array.isArray(data) && data.length === 3) {
      const [price, count, amount] = data;
      const cachedBook = this.orderBooks.get(symbol);
      
      if (cachedBook) {
        // Update existing order book
        const entry: OrderBookEntry = {
          price: Math.abs(price).toString(),
          quantity: Math.abs(amount).toString(),
          timestamp: Date.now(),
        };

        if (count === 0) {
          // Remove price level
          if (amount > 0) {
            cachedBook.bids = cachedBook.bids.filter(b => b.price !== entry.price);
          } else {
            cachedBook.asks = cachedBook.asks.filter(a => a.price !== entry.price);
          }
        } else {
          // Update or add price level
          if (amount > 0) {
            const index = cachedBook.bids.findIndex(b => b.price === entry.price);
            if (index >= 0) {
              cachedBook.bids[index] = entry;
            } else {
              cachedBook.bids.push(entry);
              cachedBook.bids.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
            }
          } else {
            const index = cachedBook.asks.findIndex(a => a.price === entry.price);
            if (index >= 0) {
              cachedBook.asks[index] = entry;
            } else {
              cachedBook.asks.push(entry);
              cachedBook.asks.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
            }
          }
        }

        cachedBook.timestamp = Date.now();

        if (this.onOrderBook) {
          this.onOrderBook(cachedBook);
        }
      }
    }
  }

  /**
   * Convert standard symbol to Bitfinex format
   * BTC/USD -> tBTCUSD
   */
  private toBitfinexSymbol(symbol: string): string {
    const cleaned = symbol.replace(/\//g, '');
    return `t${cleaned}`;
  }

  /**
   * Format Bitfinex symbol to standard format
   * tBTCUSD -> BTC/USD
   */
  private formatSymbol(bfxSymbol: string): string {
    // Remove 't' prefix
    const cleaned = bfxSymbol.replace(/^t/, '');
    
    // Use shared utility for parsing
    return formatToStandardSymbol(cleaned);
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
    console.error('[BitfinexConnector] Error:', error.message);
    this.stats.errors++;
    
    if (this.onError) {
      this.onError(CEXExchange.BITFINEX, error);
    }
  }

  /**
   * Handle disconnect and attempt reconnection
   */
  private handleDisconnect(): void {
    this.stats.connected = false;
    this.channelMap.clear();

    if (
      this.config.reconnect &&
      this.reconnectAttempts < (this.config.maxReconnectAttempts || 10)
    ) {
      this.reconnectAttempts++;
      this.stats.reconnections++;
      
      const delay = this.config.reconnectDelay || 5000;
      console.log(
        `[BitfinexConnector] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`
      );

      this.reconnectTimer = setTimeout(() => {
        this.connect().catch(error => {
          console.error('[BitfinexConnector] Reconnection failed:', error.message);
        });
      }, delay);
    } else {
      console.log('[BitfinexConnector] Max reconnection attempts reached or reconnect disabled');
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
      // Only close if the connection is open or connecting
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }

    this.stats.connected = false;
    this.channelMap.clear();
    console.log('[BitfinexConnector] Disconnected');
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
