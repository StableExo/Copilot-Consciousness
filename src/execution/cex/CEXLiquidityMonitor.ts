/**
 * CEX Liquidity Monitor
 * 
 * Aggregates real-time liquidity data from multiple centralized exchanges.
 * Enables CEX-DEX arbitrage detection and cross-venue price monitoring.
 * 
 * Supports: Binance, Coinbase, OKX, Bybit, Kraken
 */

import { BinanceConnector } from './BinanceConnector.js';
import {
  CEXExchange,
  CEXMonitorConfig,
  CEXConnectionConfig,
  OrderBook,
  PriceTicker,
  LiquiditySnapshot,
  CEXMonitorStats,
  OrderBookCallback,
  TickerCallback,
} from './types.js';

/**
 * Main CEX liquidity monitoring coordinator
 */
export class CEXLiquidityMonitor {
  private config: Required<CEXMonitorConfig>;
  private connectors: Map<CEXExchange, any> = new Map();
  private orderBooks: Map<string, Map<CEXExchange, OrderBook>> = new Map(); // symbol -> exchange -> orderBook
  private tickers: Map<string, Map<CEXExchange, PriceTicker>> = new Map(); // symbol -> exchange -> ticker
  private running = false;
  private snapshotInterval: NodeJS.Timeout | null = null;

  constructor(config: CEXMonitorConfig) {
    this.config = {
      updateInterval: 1000,
      minSpreadBps: 10, // 0.1% minimum spread
      ...config,
      exchanges: config.exchanges || [],
    };
  }

  /**
   * Start monitoring all configured exchanges
   */
  async start(): Promise<void> {
    if (this.running) {
      console.warn('[CEXLiquidityMonitor] Already running');
      return;
    }

    console.log('[CEXLiquidityMonitor] Starting monitoring...');
    this.running = true;

    // Initialize connectors for each exchange
    for (const exchangeConfig of this.config.exchanges) {
      await this.initializeConnector(exchangeConfig);
    }

    // Start periodic snapshot generation
    if (this.config.updateInterval > 0) {
      this.snapshotInterval = setInterval(() => {
        this.generateLiquiditySnapshots();
      }, this.config.updateInterval);
    }

    console.log(
      `[CEXLiquidityMonitor] Monitoring ${this.connectors.size} exchanges: ${Array.from(this.connectors.keys()).join(', ')}`
    );
  }

  /**
   * Initialize connector for a specific exchange
   */
  private async initializeConnector(config: CEXConnectionConfig): Promise<void> {
    try {
      let connector: any;

      switch (config.exchange) {
        case CEXExchange.BINANCE:
          connector = new BinanceConnector(config, {
            onOrderBook: this.handleOrderBook.bind(this),
            onTicker: this.handleTicker.bind(this),
            onError: this.config.onError,
          });
          break;

        case CEXExchange.COINBASE:
          // TODO: Implement CoinbaseConnector
          console.warn('[CEXLiquidityMonitor] Coinbase connector not yet implemented');
          return;

        case CEXExchange.OKX:
          // TODO: Implement OKXConnector
          console.warn('[CEXLiquidityMonitor] OKX connector not yet implemented');
          return;

        case CEXExchange.BYBIT:
          // TODO: Implement BybitConnector
          console.warn('[CEXLiquidityMonitor] Bybit connector not yet implemented');
          return;

        case CEXExchange.KRAKEN:
          // TODO: Implement KrakenConnector
          console.warn('[CEXLiquidityMonitor] Kraken connector not yet implemented');
          return;

        default:
          throw new Error(`Unsupported exchange: ${config.exchange}`);
      }

      await connector.connect();
      this.connectors.set(config.exchange, connector);
      console.log(`[CEXLiquidityMonitor] Connected to ${config.exchange}`);
    } catch (error) {
      console.error(`[CEXLiquidityMonitor] Failed to connect to ${config.exchange}:`, error);
      if (this.config.onError) {
        this.config.onError(config.exchange, error as Error);
      }
    }
  }

  /**
   * Handle order book updates from exchanges
   */
  private handleOrderBook(orderBook: OrderBook): void {
    // Get or create symbol map
    if (!this.orderBooks.has(orderBook.symbol)) {
      this.orderBooks.set(orderBook.symbol, new Map());
    }

    // Store order book by exchange
    this.orderBooks.get(orderBook.symbol)!.set(orderBook.exchange, orderBook);

    // Forward to user callback if provided
    if (this.config.onOrderBook) {
      this.config.onOrderBook(orderBook);
    }
  }

  /**
   * Handle ticker updates from exchanges
   */
  private handleTicker(ticker: PriceTicker): void {
    // Get or create symbol map
    if (!this.tickers.has(ticker.symbol)) {
      this.tickers.set(ticker.symbol, new Map());
    }

    // Store ticker by exchange
    this.tickers.get(ticker.symbol)!.set(ticker.exchange, ticker);

    // Forward to user callback if provided
    if (this.config.onTicker) {
      this.config.onTicker(ticker);
    }
  }

  /**
   * Generate liquidity snapshots across all venues for all symbols
   */
  private generateLiquiditySnapshots(): void {
    const symbols = Array.from(this.orderBooks.keys());

    for (const symbol of symbols) {
      const snapshot = this.generateSnapshotForSymbol(symbol);
      if (snapshot) {
        // Could call a callback here if needed
        // For now, snapshots are accessible via getSnapshot()
      }
    }
  }

  /**
   * Generate liquidity snapshot for a specific symbol
   */
  private generateSnapshotForSymbol(symbol: string): LiquiditySnapshot | null {
    const exchangeData = this.orderBooks.get(symbol);
    if (!exchangeData || exchangeData.size === 0) {
      return null;
    }

    const venues: LiquiditySnapshot['venues'] = {};

    for (const [exchange, orderBook] of exchangeData.entries()) {
      if (orderBook.bids.length === 0 || orderBook.asks.length === 0) {
        continue;
      }

      const bid = orderBook.bids[0].price;
      const ask = orderBook.asks[0].price;
      const bidNum = parseFloat(bid);
      const askNum = parseFloat(ask);
      const spread = askNum - bidNum;
      const spreadBps = (spread / bidNum) * 10000; // Basis points

      // Only include if spread meets minimum threshold
      if (spreadBps < this.config.minSpreadBps) {
        continue;
      }

      venues[exchange] = {
        bid,
        ask,
        spread: spread.toFixed(8),
        spreadBps,
        bidVolume: orderBook.bids[0].quantity,
        askVolume: orderBook.asks[0].quantity,
        timestamp: orderBook.timestamp,
      };
    }

    return {
      symbol,
      venues,
      timestamp: Date.now(),
    };
  }

  /**
   * Get current liquidity snapshot for a symbol across all exchanges
   */
  getSnapshot(symbol: string): LiquiditySnapshot | null {
    return this.generateSnapshotForSymbol(symbol);
  }

  /**
   * Get snapshots for all symbols
   */
  getAllSnapshots(): LiquiditySnapshot[] {
    const symbols = Array.from(this.orderBooks.keys());
    return symbols
      .map(symbol => this.generateSnapshotForSymbol(symbol))
      .filter((snapshot): snapshot is LiquiditySnapshot => snapshot !== null);
  }

  /**
   * Get order book from specific exchange for symbol
   */
  getOrderBook(exchange: CEXExchange, symbol: string): OrderBook | undefined {
    return this.orderBooks.get(symbol)?.get(exchange);
  }

  /**
   * Get ticker from specific exchange for symbol
   */
  getTicker(exchange: CEXExchange, symbol: string): PriceTicker | undefined {
    return this.tickers.get(symbol)?.get(exchange);
  }

  /**
   * Get statistics for all exchanges
   */
  getStats(): CEXMonitorStats[] {
    const stats: CEXMonitorStats[] = [];

    for (const [exchange, connector] of this.connectors.entries()) {
      if (connector && typeof connector.getStats === 'function') {
        stats.push(connector.getStats());
      }
    }

    return stats;
  }

  /**
   * Check if monitor is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Stop monitoring all exchanges
   */
  stop(): void {
    if (!this.running) {
      console.warn('[CEXLiquidityMonitor] Not running');
      return;
    }

    console.log('[CEXLiquidityMonitor] Stopping monitoring...');

    // Stop snapshot interval
    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
      this.snapshotInterval = null;
    }

    // Disconnect all connectors
    for (const [exchange, connector] of this.connectors.entries()) {
      try {
        if (connector && typeof connector.disconnect === 'function') {
          connector.disconnect();
        }
      } catch (error) {
        console.error(`[CEXLiquidityMonitor] Error disconnecting ${exchange}:`, error);
      }
    }

    this.connectors.clear();
    this.orderBooks.clear();
    this.tickers.clear();
    this.running = false;

    console.log('[CEXLiquidityMonitor] Stopped');
  }
}
