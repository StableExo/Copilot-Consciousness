/**
 * CoinMarketCap API Type Definitions
 * Covers both CEX and DEX endpoints with unified API access
 */

// ============================================================================
// API Configuration
// ============================================================================

export enum CMCApiTier {
  FREE = 'free',
  HOBBYIST = 'hobbyist',
  STARTUP = 'startup',
  STANDARD = 'standard',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

export interface CMCApiConfig {
  apiKey: string;
  tier?: CMCApiTier;
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

// ============================================================================
// Rate Limits by Tier
// ============================================================================

export interface RateLimitInfo {
  creditsPerMonth: number;
  requestsPerMinute: number;
  requestsPerDay: number;
  historicalMonths: number | 'all';
}

export const RATE_LIMITS: Record<CMCApiTier, RateLimitInfo> = {
  [CMCApiTier.FREE]: {
    creditsPerMonth: 10000,
    requestsPerMinute: 30,
    requestsPerDay: 333,
    historicalMonths: 0,
  },
  [CMCApiTier.HOBBYIST]: {
    creditsPerMonth: 110000,
    requestsPerMinute: 30,
    requestsPerDay: 3666,
    historicalMonths: 12,
  },
  [CMCApiTier.STARTUP]: {
    creditsPerMonth: 300000,
    requestsPerMinute: 30,
    requestsPerDay: 10000,
    historicalMonths: 24,
  },
  [CMCApiTier.STANDARD]: {
    creditsPerMonth: 1200000,
    requestsPerMinute: 60,
    requestsPerDay: 40000,
    historicalMonths: 60,
  },
  [CMCApiTier.PROFESSIONAL]: {
    creditsPerMonth: 3000000,
    requestsPerMinute: 90,
    requestsPerDay: 100000,
    historicalMonths: 'all',
  },
  [CMCApiTier.ENTERPRISE]: {
    creditsPerMonth: 30000000,
    requestsPerMinute: 120,
    requestsPerDay: 1000000,
    historicalMonths: 'all',
  },
};

// ============================================================================
// CEX (Centralized Exchange) Types
// ============================================================================

export interface CEXExchange {
  id: number;
  name: string;
  slug: string;
  is_active: number;
  status: string;
  first_historical_data?: string;
  last_historical_data?: string;
}

export interface CEXMarketPair {
  market_id: number;
  market_pair: string;
  category: string;
  fee_type: string;
  market_pair_base: {
    currency_id: number;
    currency_symbol: string;
    currency_type: string;
    exchange_symbol: string;
  };
  market_pair_quote: {
    currency_id: number;
    currency_symbol: string;
    currency_type: string;
    exchange_symbol: string;
  };
  quote: {
    [currency: string]: {
      price: number;
      volume_24h: number;
      last_updated: string;
    };
  };
}

export interface CEXExchangeQuote {
  id: number;
  name: string;
  slug: string;
  num_market_pairs: number;
  quote: {
    [currency: string]: {
      volume_24h: number;
      volume_24h_adjusted: number;
      volume_7d: number;
      volume_30d: number;
      percent_change_volume_24h: number;
      percent_change_volume_7d: number;
      percent_change_volume_30d: number;
      effective_liquidity_24h: number;
      last_updated: string;
    };
  };
}

export interface CEXOrderbookEntry {
  price: string;
  quantity: string;
}

export interface CEXOrderbook {
  bids: CEXOrderbookEntry[];
  asks: CEXOrderbookEntry[];
  timestamp: number;
}

// ============================================================================
// DEX (Decentralized Exchange) Types
// ============================================================================

export interface DEXNetwork {
  id: number;
  name: string;
  slug: string;
  chain_id?: string;
  is_active: number;
}

export interface DEXListing {
  id: number;
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  date_launched?: string;
  notice?: string;
  tags?: string[];
  platform?: {
    id: number;
    name: string;
    slug: string;
    token_address?: string;
  };
  self_reported_circulating_supply?: number;
  self_reported_market_cap?: number;
}

export interface DEXPair {
  pair_id: number;
  dex_id: number;
  dex_name: string;
  dex_slug: string;
  base_currency_id: number;
  base_currency_name: string;
  base_currency_symbol: string;
  quote_currency_id: number;
  quote_currency_name: string;
  quote_currency_symbol: string;
  category: string;
  fee_type?: string;
  pool_address?: string;
  pool_created?: string;
}

export interface DEXPairQuote {
  pair_id: number;
  dex_id: number;
  dex_name: string;
  base_currency_symbol: string;
  quote_currency_symbol: string;
  quote: {
    [currency: string]: {
      price: number;
      volume_24h: number;
      liquidity: number;
      last_updated: string;
    };
  };
}

export interface DEXTrade {
  trade_id: string;
  pair_id: number;
  dex_id: number;
  dex_name: string;
  base_currency_symbol: string;
  quote_currency_symbol: string;
  price: number;
  base_amount: number;
  quote_amount: number;
  trade_timestamp: number;
  block_number?: number;
  transaction_hash?: string;
  is_buy: boolean;
}

export interface DEXOHLCVBar {
  time_open: string;
  time_close: string;
  time_high: string;
  time_low: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quote_volume: number;
  trades?: number;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CMCApiResponse<T> {
  status: {
    timestamp: string;
    error_code: number;
    error_message: string | null;
    elapsed: number;
    credit_count: number;
    notice: string | null;
  };
  data: T;
}

export interface CMCPaginatedResponse<T> extends CMCApiResponse<T> {
  status: CMCApiResponse<T>['status'] & {
    total_count?: number;
  };
}

// ============================================================================
// Request Parameters
// ============================================================================

export interface CEXExchangeListParams {
  start?: number;
  limit?: number;
  sort?: 'name' | 'volume_24h' | 'exchange_score';
  sort_dir?: 'asc' | 'desc';
  market_type?: 'all' | 'fees' | 'no_fees';
  aux?: string;
}

export interface CEXMarketPairsParams {
  id?: number;
  slug?: string;
  start?: number;
  limit?: number;
  category?: string;
  fee_type?: string;
  convert?: string;
  aux?: string;
}

export interface CEXQuotesParams {
  id?: number[];
  slug?: string[];
  convert?: string;
  aux?: string;
}

export interface DEXListingsParams {
  start?: number;
  limit?: number;
  sort?: 'name' | 'market_cap' | 'volume_24h';
  sort_dir?: 'asc' | 'desc';
  network_id?: number;
  aux?: string;
}

export interface DEXPairsLatestParams {
  pairs?: string[]; // Format: "dex-slug:base-quote" e.g. "uniswap-v3:eth-usdt"
  convert?: string;
  aux?: string;
}

export interface DEXPairsOHLCVParams {
  pair?: string; // Format: "dex-slug:base-quote"
  time_start?: number;
  time_end?: number;
  interval?: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '7d' | '1M';
  count?: number;
  convert?: string;
}

export interface DEXTradesParams {
  pair?: string; // Format: "dex-slug:base-quote"
  start?: number;
  limit?: number;
  sort?: 'timestamp' | 'price' | 'volume';
  sort_dir?: 'asc' | 'desc';
}

// ============================================================================
// Statistics and Monitoring
// ============================================================================

export interface CMCUsageStats {
  totalRequests: number;
  totalCreditsUsed: number;
  creditsRemaining: number;
  requestsThisMinute: number;
  requestsToday: number;
  lastRequestTime: number;
  errors: number;
  lastError?: string;
  lastErrorTime?: number;
}

// ============================================================================
// Callback Types
// ============================================================================

export type OnCEXDataCallback = (data: CEXExchangeQuote | CEXMarketPair) => void;
export type OnDEXDataCallback = (data: DEXPairQuote | DEXTrade) => void;
export type OnErrorCallback = (error: Error) => void;
