/**
 * Kraken WebSocket Connector
 * 
 * Real-time order book and price streaming from Kraken exchange.
 * Uses WebSocket Public Feeds for book (10 levels) and ticker.
 * 
 * Documentation: https://docs.kraken.com/websockets/
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

interface KrakenSubscribeMessage {
  event: 'subscribe';
  pair: string[];
  subscription: {
    name: string;
    depth?: number;
  };
}

interface KrakenOrderBookSnapshot {
  as: [string, string, string][]; // Asks [price, volume, timestamp]
  bs: [string, string, string][]; // Bids [price, volume, timestamp]
}

interface KrakenOrderBookUpdate {
  a?: [string, string, string][]; // Ask updates
  b?: [string, string, string][]; // Bid updates
  c?: string; // Checksum
}

interface KrakenTickerData {
  a: [string, string, string]; // Ask [price, wholeLot, lot]
  b: [string, string, string]; // Bid [price, wholeLot, lot]
  c: [string, string]; // Last trade [price, lot]
  v: [string, string]; // Volume [today, last 24h]
}

/**
 * Kraken WebSocket connector for real-time order book streaming
 */
export class KrakenConnector {
  private config: CEXConnectionConfig;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private startTime: number = 0;
  private stats: CEXMonitorStats;
  private orderBooks: Map<string, OrderBook> = new Map();
  private symbolMap: Map<string, string> = new Map(); // Kraken pair -> normalized symbol
  
  // Callbacks
  private onOrderBook?: OrderBookCallback;
  private onTicker?: TickerCallback;
  private onError?: ErrorCallback;

  // Kraken WebSocket endpoints
  private readonly WS_BASE_URL = 'wss://ws.kraken.com';
  private readonly WS_TESTNET_URL = 'wss://ws-auth.kraken.com'; // Kraken doesn't have separate testnet

  constructor(
    config: CEXConnectionConfig,
    callbacks?: {
      onOrderBook?: OrderBookCallback;
      onTicker?: TickerCallback;
      onError?: ErrorCallback;
    }
  ) {
    if (config.exchange !== CEXExchange.KRAKEN) {
      throw new Error(`Invalid exchange: ${config.exchange}, expected KRAKEN`);
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
      exchange: CEXExchange.KRAKEN,
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
   * Connect to Kraken WebSocket and subscribe to channels
   */
  async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.warn('[KrakenConnector] Already connected');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.config.testnet
          ? this.WS_TESTNET_URL
          : this.WS_BASE_URL;

        console.log(`[KrakenConnector] Connecting to ${wsUrl}`);
        this.ws = new WebSocket(wsUrl);

        this.ws.on('open', () => {
          console.log('[KrakenConnector] WebSocket connected');
          this.stats.connected = true;
          this.startTime = Date.now();
          this.reconnectAttempts = 0;

          // Subscribe to book (10 levels) and ticker
          // Kraken uses special pair names: XBT/USD, ETH/USD (XBT instead of BTC)
          const pairs = this.config.symbols.map(symbol => this.toKrakenPair(symbol));

          // Subscribe to orderbook
          const bookSubscribe: KrakenSubscribeMessage = {
            event: 'subscribe',
            pair: pairs,
            subscription: {
              name: 'book',
              depth: 10,
            },
          };
          this.ws?.send(JSON.stringify(bookSubscribe));

          // Subscribe to ticker
          const tickerSubscribe: KrakenSubscribeMessage = {
            event: 'subscribe',
            pair: pairs,
            subscription: {
              name: 'ticker',
            },
          };
          this.ws?.send(JSON.stringify(tickerSubscribe));

          console.log('[KrakenConnector] Subscribed to channels');
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
          console.error('[KrakenConnector] WebSocket error:', error.message);
          this.handleError(error);
          reject(error);
        });

        this.ws.on('close', (code: number, reason: Buffer) => {
          console.log(`[KrakenConnector] WebSocket closed: ${code} - ${reason.toString()}`);
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
      // Handle subscription confirmation
      if (message.event === 'subscriptionStatus') {
        if (message.status === 'subscribed') {
          console.log('[KrakenConnector] Subscription confirmed:', message.channelName);
          // Store pair mapping
          if (message.pair) {
            this.symbolMap.set(message.pair, this.formatSymbol(message.pair));
          }
        } else if (message.status === 'error') {
          console.error('[KrakenConnector] Subscription error:', message.errorMessage);
        }
        return;
      }

      // Handle heartbeat
      if (message.event === 'heartbeat') {
        return;
      }

      // Handle data updates (array format)
      if (Array.isArray(message) && message.length >= 3) {
        const channelData = message[1];
        const channelName = message[2];
        const pair = message[3];

        if (channelName.startsWith('book-')) {
          this.handleOrderBookMessage(pair, channelData);
        } else if (channelName === 'ticker') {
          this.handleTickerUpdate(pair, channelData);
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
   * Process order book messages (snapshot or update)
   */
  private handleOrderBookMessage(pair: string, data: any): void {
    const symbol = this.symbolMap.get(pair) || this.formatSymbol(pair);
    
    // Check if this is a snapshot (has 'as' and 'bs' keys)
    if (data.as && data.bs) {
      this.handleOrderBookSnapshot(symbol, data);
    } else {
      this.handleOrderBookUpdate(symbol, data);
    }
  }

  /**
   * Process order book snapshot
   */
  private handleOrderBookSnapshot(symbol: string, data: KrakenOrderBookSnapshot): void {
    const timestamp = Date.now();
    const orderBook: OrderBook = {
      exchange: CEXExchange.KRAKEN,
      symbol,
      bids: data.bs.map(([price, volume]) => ({
        price,
        quantity: volume,
        timestamp,
      })),
      asks: data.as.map(([price, volume]) => ({
        price,
        quantity: volume,
        timestamp,
      })),
      timestamp,
    };

    // Sort bids descending (highest price first)
    orderBook.bids.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    
    // Sort asks ascending (lowest price first)
    orderBook.asks.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));

    // Cache order book
    this.orderBooks.set(symbol, orderBook);

    // Call callback if provided
    if (this.onOrderBook) {
      this.onOrderBook(orderBook);
    }
  }

  /**
   * Process order book updates
   */
  private handleOrderBookUpdate(symbol: string, data: KrakenOrderBookUpdate): void {
    const orderBook = this.orderBooks.get(symbol);
    if (!orderBook) {
      // If we don't have snapshot yet, skip update
      return;
    }

    const timestamp = Date.now();

    // Apply ask updates
    if (data.a) {
      data.a.forEach(([price, volume]) => {
        const volumeNum = parseFloat(volume);
        if (volumeNum === 0) {
          // Remove price level
          const index = orderBook.asks.findIndex(e => e.price === price);
          if (index !== -1) {
            orderBook.asks.splice(index, 1);
          }
        } else {
          // Update or add price level
          const index = orderBook.asks.findIndex(e => e.price === price);
          if (index !== -1) {
            orderBook.asks[index].quantity = volume;
            orderBook.asks[index].timestamp = timestamp;
          } else {
            orderBook.asks.push({ price, quantity: volume, timestamp });
          }
        }
      });
      orderBook.asks.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    }

    // Apply bid updates
    if (data.b) {
      data.b.forEach(([price, volume]) => {
        const volumeNum = parseFloat(volume);
        if (volumeNum === 0) {
          // Remove price level
          const index = orderBook.bids.findIndex(e => e.price === price);
          if (index !== -1) {
            orderBook.bids.splice(index, 1);
          }
        } else {
          // Update or add price level
          const index = orderBook.bids.findIndex(e => e.price === price);
          if (index !== -1) {
            orderBook.bids[index].quantity = volume;
            orderBook.bids[index].timestamp = timestamp;
          } else {
            orderBook.bids.push({ price, quantity: volume, timestamp });
          }
        }
      });
      orderBook.bids.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    }

    orderBook.timestamp = timestamp;

    // Call callback if provided
    if (this.onOrderBook) {
      this.onOrderBook(orderBook);
    }
  }

  /**
   * Process ticker updates
   */
  private handleTickerUpdate(pair: string, data: KrakenTickerData): void {
    const symbol = this.symbolMap.get(pair) || this.formatSymbol(pair);
    const ticker: PriceTicker = {
      exchange: CEXExchange.KRAKEN,
      symbol,
      bid: data.b[0],
      ask: data.a[0],
      last: data.c[0],
      volume24h: data.v[1],
      timestamp: Date.now(),
    };

    // Call callback if provided
    if (this.onTicker) {
      this.onTicker(ticker);
    }
  }

  /**
   * Convert standard symbol to Kraken pair format
   * BTC/USDT -> XBT/USDT (Kraken uses XBT instead of BTC)
   * ETH/USD -> ETH/USD
   */
  private toKrakenPair(symbol: string): string {
    // Kraken uses XBT instead of BTC
    let pair = symbol.replace('BTC/', 'XBT/');
    // Remove the slash for Kraken format
    return pair.replace(/\//g, '/');
  }

  /**
   * Format Kraken pair to standard format
   * XBT/USD -> BTC/USD
   */
  private formatSymbol(krakenPair: string): string {
    // Convert XBT back to BTC
    return krakenPair.replace('XBT', 'BTC');
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
    console.error('[KrakenConnector] Error:', error.message);
    this.stats.errors++;
    
    if (this.onError) {
      this.onError(CEXExchange.KRAKEN, error);
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
        `[KrakenConnector] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`
      );

      this.reconnectTimer = setTimeout(() => {
        this.connect().catch(error => {
          console.error('[KrakenConnector] Reconnection failed:', error.message);
        });
      }, delay);
    } else {
      console.log('[KrakenConnector] Max reconnection attempts reached or reconnect disabled');
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
    console.log('[KrakenConnector] Disconnected');
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
