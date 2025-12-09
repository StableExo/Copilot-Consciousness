/**
 * CEX Liquidity Monitoring - Type Definitions
 * 
 * Provides TypeScript types for centralized exchange liquidity monitoring,
 * enabling CEX-DEX arbitrage detection and cross-venue price tracking.
 */

/**
 * Supported centralized exchanges
 */
export enum CEXExchange {
  BINANCE = 'binance',
  COINBASE = 'coinbase',
  OKX = 'okx',
  BYBIT = 'bybit',
  KRAKEN = 'kraken',
}

/**
 * Order book entry (bid or ask)
 */
export interface OrderBookEntry {
  price: string; // Price level as string (to preserve precision)
  quantity: string; // Quantity at this price level
  timestamp?: number; // Last update timestamp
}

/**
 * Aggregated order book snapshot
 */
export interface OrderBook {
  exchange: CEXExchange;
  symbol: string; // Trading pair (e.g., "BTC/USDT", "ETH/USDC")
  bids: OrderBookEntry[]; // Buy orders (descending by price)
  asks: OrderBookEntry[]; // Sell orders (ascending by price)
  timestamp: number; // Snapshot timestamp
  lastUpdateId?: number; // Exchange-specific update ID
}

/**
 * Price ticker information
 */
export interface PriceTicker {
  exchange: CEXExchange;
  symbol: string;
  bid: string; // Best bid price
  ask: string; // Best ask price
  last: string; // Last trade price
  volume24h: string; // 24-hour volume
  timestamp: number;
}

/**
 * CEX WebSocket connection configuration
 */
export interface CEXConnectionConfig {
  exchange: CEXExchange;
  symbols: string[]; // Trading pairs to monitor
  apiKey?: string; // Optional API key for authenticated endpoints
  apiSecret?: string; // Optional API secret
  testnet?: boolean; // Use testnet endpoints
  reconnect?: boolean; // Auto-reconnect on disconnect
  reconnectDelay?: number; // Delay between reconnection attempts (ms)
  maxReconnectAttempts?: number; // Max reconnection attempts
}

/**
 * Liquidity snapshot across multiple venues
 */
export interface LiquiditySnapshot {
  symbol: string; // Normalized symbol (e.g., "ETH/USDC")
  venues: {
    [exchange: string]: {
      bid: string;
      ask: string;
      spread: string; // Ask - Bid
      spreadBps: number; // Spread in basis points
      bidVolume: string; // Total volume at best bid
      askVolume: string; // Total volume at best ask
      timestamp: number;
    };
  };
  timestamp: number;
}

/**
 * CEX-DEX arbitrage opportunity
 */
export interface CEXDEXArbitrage {
  id: string; // Unique opportunity ID
  token: string; // Token symbol (e.g., "ETH", "WBTC")
  cexExchange: CEXExchange;
  cexPrice: string; // CEX price
  dexName: string; // DEX name (e.g., "Uniswap V3")
  dexPrice: string; // DEX price
  direction: 'buy_cex_sell_dex' | 'buy_dex_sell_cex';
  priceDiff: string; // Absolute price difference
  priceDiffPercent: number; // Price difference percentage
  estimatedProfit: string; // Estimated profit in USD
  estimatedGasCost: string; // Estimated gas cost
  netProfit: string; // Net profit after fees and gas
  cexFee: string; // CEX trading fee
  dexFee: string; // DEX swap fee
  confidence: number; // Confidence score (0-1)
  timestamp: number;
  expiry?: number; // Opportunity expiry timestamp
}

/**
 * CEX liquidity monitor statistics
 */
export interface CEXMonitorStats {
  exchange: CEXExchange;
  connected: boolean;
  uptime: number; // Uptime in seconds
  totalUpdates: number; // Total order book updates received
  updatesPerSecond: number; // Average updates per second
  lastUpdate: number; // Last update timestamp
  errors: number; // Total errors
  reconnections: number; // Total reconnections
  subscribedSymbols: string[]; // Currently subscribed symbols
}

/**
 * Callback function types
 */
export type OrderBookCallback = (orderBook: OrderBook) => void | Promise<void>;
export type TickerCallback = (ticker: PriceTicker) => void | Promise<void>;
export type ArbitrageCallback = (opportunity: CEXDEXArbitrage) => void | Promise<void>;
export type ErrorCallback = (exchange: CEXExchange, error: Error) => void | Promise<void>;

/**
 * CEX monitor configuration
 */
export interface CEXMonitorConfig {
  exchanges: CEXConnectionConfig[]; // Exchanges to monitor
  updateInterval?: number; // Snapshot update interval (ms)
  minSpreadBps?: number; // Minimum spread to report (basis points)
  onOrderBook?: OrderBookCallback; // Order book update callback
  onTicker?: TickerCallback; // Ticker update callback
  onArbitrage?: ArbitrageCallback; // Arbitrage opportunity callback
  onError?: ErrorCallback; // Error callback
}

/**
 * Symbol mapping between CEX and DEX
 * CEXs use different formats: "BTCUSDT", "BTC-USDT", "BTC/USDT"
 * DEXs use contract addresses
 */
export interface SymbolMapping {
  cexSymbol: string; // CEX symbol format
  dexToken: string; // DEX token address
  decimals: number; // Token decimals
  normalizedSymbol: string; // Standard format (e.g., "BTC/USDT")
}
