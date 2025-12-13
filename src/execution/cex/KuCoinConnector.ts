/**
 * KuCoin WebSocket Connector
 * 
 * Real-time order book and price streaming from KuCoin exchange.
 * Requires REST API call to get dynamic WebSocket token and endpoint.
 * 
 * Documentation: https://docs.kucoin.com/#websocket-feed
 */

import WebSocket from 'ws';
import https from 'https';
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

interface KuCoinTokenResponse {
  code: string;
  data: {
    token: string;
    instanceServers: Array<{
      endpoint: string;
      encrypt: boolean;
      protocol: string;
      pingInterval: number;
      pingTimeout: number;
    }>;
  };
}

interface KuCoinSubscribeMessage {
  id: string;
  type: 'subscribe';
  topic: string;
  privateChannel: boolean;
  response: boolean;
}

interface KuCoinMessage {
  type: string;
  topic?: string;
  subject?: string;
  data?: any;
}

/**
 * KuCoin WebSocket connector for real-time order book streaming
 * Note: KuCoin requires a REST API call to get a dynamic WebSocket token
 */
export class KuCoinConnector {
  private config: CEXConnectionConfig;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private startTime: number = 0;
  private stats: CEXMonitorStats;
  private orderBooks: Map<string, OrderBook> = new Map();
  private wsToken: string | null = null;
  private wsEndpoint: string | null = null;
  private pingInterval: number = 18000; // Default 18s
  
  // Callbacks
  private onOrderBook?: OrderBookCallback;
  private onTicker?: TickerCallback;
  private onError?: ErrorCallback;

  // KuCoin REST API endpoint for token
  private readonly TOKEN_URL = 'https://api.kucoin.com/api/v1/bullet-public';

  constructor(
    config: CEXConnectionConfig,
    callbacks?: {
      onOrderBook?: OrderBookCallback;
      onTicker?: TickerCallback;
      onError?: ErrorCallback;
    }
  ) {
    if (config.exchange !== CEXExchange.KUCOIN) {
      throw new Error(`Invalid exchange: ${config.exchange}, expected KUCOIN`);
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
      exchange: CEXExchange.KUCOIN,
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
   * Get WebSocket token and endpoint from REST API
   */
  private async getWebSocketToken(): Promise<void> {
    return new Promise((resolve, reject) => {
      https.post(
        this.TOKEN_URL,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
        (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            try {
              const response: KuCoinTokenResponse = JSON.parse(data);
              
              if (response.code !== '200000') {
                reject(new Error(`KuCoin token request failed: ${response.code}`));
                return;
              }

              this.wsToken = response.data.token;
              const server = response.data.instanceServers[0];
              this.wsEndpoint = `${server.endpoint}?token=${this.wsToken}`;
              this.pingInterval = server.pingInterval;
              
              console.log('[KuCoinConnector] WebSocket token obtained');
              resolve();
            } catch (error) {
              reject(error);
            }
          });
        }
      ).on('error', (error) => {
        reject(error);
      }).end();
    });
  }

  /**
   * Connect to KuCoin WebSocket and subscribe to channels
   */
  async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.warn('[KuCoinConnector] Already connected');
      return;
    }

    try {
      // Get WebSocket token and endpoint
      await this.getWebSocketToken();

      if (!this.wsEndpoint) {
        throw new Error('Failed to get WebSocket endpoint');
      }

      return new Promise((resolve, reject) => {
        try {
          console.log(`[KuCoinConnector] Connecting to ${this.wsEndpoint}`);
          this.ws = new WebSocket(this.wsEndpoint!);

          this.ws.on('open', () => {
            console.log('[KuCoinConnector] WebSocket connected');
            this.stats.connected = true;
            this.startTime = Date.now();
            this.reconnectAttempts = 0;

            // Start ping timer
            this.startPingTimer();

            // Subscribe to market ticker and level2 (order book) for each symbol
            this.config.symbols.forEach(symbol => {
              const kcSymbol = this.toKuCoinSymbol(symbol);
              
              // Subscribe to ticker
              const tickerMsg: KuCoinSubscribeMessage = {
                id: Date.now().toString(),
                type: 'subscribe',
                topic: `/market/ticker:${kcSymbol}`,
                privateChannel: false,
                response: true,
              };
              this.ws?.send(JSON.stringify(tickerMsg));

              // Subscribe to level2 order book (5 depth)
              const bookMsg: KuCoinSubscribeMessage = {
                id: (Date.now() + 1).toString(),
                type: 'subscribe',
                topic: `/spotMarket/level2Depth5:${kcSymbol}`,
                privateChannel: false,
                response: true,
              };
              this.ws?.send(JSON.stringify(bookMsg));
            });

            console.log('[KuCoinConnector] Subscribed to channels');
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
            console.error('[KuCoinConnector] WebSocket error:', error.message);
            this.handleError(error);
            reject(error);
          });

          this.ws.on('close', (code: number, reason: Buffer) => {
            console.log(`[KuCoinConnector] WebSocket closed: ${code} - ${reason.toString()}`);
            this.stats.connected = false;
            this.stopPingTimer();
            this.handleDisconnect();
          });
        } catch (error) {
          this.handleError(error as Error);
          reject(error);
        }
      });
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Start ping timer to keep connection alive
   */
  private startPingTimer(): void {
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const pingMsg = {
          id: Date.now().toString(),
          type: 'ping',
        };
        this.ws.send(JSON.stringify(pingMsg));
      }
    }, this.pingInterval);
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
  private handleMessage(message: KuCoinMessage): void {
    try {
      // Handle welcome message
      if (message.type === 'welcome') {
        console.log('[KuCoinConnector] Welcome message received');
        return;
      }

      // Handle pong
      if (message.type === 'pong') {
        return;
      }

      // Handle ack
      if (message.type === 'ack') {
        console.log('[KuCoinConnector] Subscription acknowledged');
        return;
      }

      // Handle data messages
      if (message.type === 'message' && message.topic && message.data) {
        if (message.topic.includes('/market/ticker:')) {
          this.handleTickerUpdate(message.subject || '', message.data);
        } else if (message.topic.includes('/spotMarket/level2Depth5:')) {
          this.handleOrderBookUpdate(message.subject || '', message.data);
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
  private handleTickerUpdate(symbol: string, data: any): void {
    const ticker: PriceTicker = {
      exchange: CEXExchange.KUCOIN,
      symbol: this.formatSymbol(symbol),
      bid: data.bestBid || data.buy || '0',
      ask: data.bestAsk || data.sell || '0',
      last: data.price || '0',
      volume24h: data.vol || '0',
      timestamp: data.time || Date.now(),
    };

    if (this.onTicker) {
      this.onTicker(ticker);
    }
  }

  /**
   * Process order book updates
   * Format: { asks: [[price, size]], bids: [[price, size]], timestamp }
   */
  private handleOrderBookUpdate(symbol: string, data: any): void {
    const orderBook: OrderBook = {
      exchange: CEXExchange.KUCOIN,
      symbol: this.formatSymbol(symbol),
      bids: (data.bids || []).map(([price, quantity]: [string, string]) => ({
        price,
        quantity,
        timestamp: data.timestamp || Date.now(),
      })),
      asks: (data.asks || []).map(([price, quantity]: [string, string]) => ({
        price,
        quantity,
        timestamp: data.timestamp || Date.now(),
      })),
      timestamp: data.timestamp || Date.now(),
    };

    // KuCoin sends data pre-sorted
    this.orderBooks.set(orderBook.symbol, orderBook);

    if (this.onOrderBook) {
      this.onOrderBook(orderBook);
    }
  }

  /**
   * Convert standard symbol to KuCoin format
   * BTC/USDT -> BTC-USDT
   */
  private toKuCoinSymbol(symbol: string): string {
    return symbol.replace(/\//g, '-');
  }

  /**
   * Format KuCoin symbol to standard format
   * BTC-USDT -> BTC/USDT
   */
  private formatSymbol(kcSymbol: string): string {
    return kcSymbol.replace(/-/g, '/');
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
    console.error('[KuCoinConnector] Error:', error.message);
    this.stats.errors++;
    
    if (this.onError) {
      this.onError(CEXExchange.KUCOIN, error);
    }
  }

  /**
   * Handle disconnect and attempt reconnection
   */
  private handleDisconnect(): void {
    this.stats.connected = false;
    this.wsToken = null;
    this.wsEndpoint = null;

    if (
      this.config.reconnect &&
      this.reconnectAttempts < (this.config.maxReconnectAttempts || 10)
    ) {
      this.reconnectAttempts++;
      this.stats.reconnections++;
      
      const delay = this.config.reconnectDelay || 5000;
      console.log(
        `[KuCoinConnector] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`
      );

      this.reconnectTimer = setTimeout(() => {
        this.connect().catch(error => {
          console.error('[KuCoinConnector] Reconnection failed:', error.message);
        });
      }, delay);
    } else {
      console.log('[KuCoinConnector] Max reconnection attempts reached or reconnect disabled');
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
    this.wsToken = null;
    this.wsEndpoint = null;
    console.log('[KuCoinConnector] Disconnected');
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
