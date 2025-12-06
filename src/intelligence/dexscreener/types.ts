/**
 * DEXScreener API Integration Types
 * 
 * Type definitions for the DEXScreener API v1
 * API Documentation: https://docs.dexscreener.com/api/reference
 */

/**
 * Chain identifiers supported by DEXScreener
 */
export type ChainId = 
  | 'ethereum' | 'bsc' | 'polygon' | 'avalanche' | 'arbitrum' | 'optimism'
  | 'base' | 'solana' | 'fantom' | 'cronos' | 'pulsechain' | 'sui' | 'aptos'
  | string; // Supports 80+ chains

/**
 * Token profile from DEXScreener
 */
export interface TokenProfile {
  chainId: string;
  tokenAddress: string;
  icon?: string;
  header?: string;
  description?: string;
  links?: Array<{
    type: string;
    label: string;
    url: string;
  }>;
}

/**
 * Token boost information
 */
export interface TokenBoost {
  chainId: string;
  tokenAddress: string;
  amount: number;
  totalAmount: number;
  icon?: string;
  description?: string;
  links?: Array<{
    type: string;
    label: string;
    url: string;
  }>;
}

/**
 * DEX pair information
 */
export interface DexPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd?: string;
  txns: {
    m5: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h24: { buys: number; sells: number };
  };
  volume: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  priceChange: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  liquidity?: {
    usd?: number;
    base: number;
    quote: number;
  };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
  info?: {
    imageUrl?: string;
    websites?: Array<{ url: string }>;
    socials?: Array<{ type: string; url: string }>;
  };
  boosts?: {
    active: number;
  };
}

/**
 * Search result from DEXScreener
 */
export interface SearchResult {
  pairs?: DexPair[];
}

/**
 * Community takeover information
 */
export interface CommunityTakeover {
  chainId: string;
  tokenAddress: string;
  claimed: boolean;
  claimedAt?: number;
  icon?: string;
  description?: string;
  links?: Array<{
    type: string;
    label: string;
    url: string;
  }>;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Client configuration
 */
export interface DexScreenerConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * Market intelligence filters
 */
export interface MarketFilters {
  minLiquidity?: number;
  minVolume24h?: number;
  minPriceChangePercent?: number;
  maxPriceChangePercent?: number;
  minTxnCount?: number;
  chains?: ChainId[];
  excludeScams?: boolean;
}

/**
 * Token discovery criteria
 */
export interface TokenDiscoveryParams {
  chains?: ChainId[];
  minLiquidity?: number;
  maxAgeHours?: number;
  minVolume?: number;
  sortBy?: 'liquidity' | 'volume' | 'age' | 'priceChange';
}

/**
 * Trending token data
 */
export interface TrendingToken {
  pair: DexPair;
  score: number;
  reasons: string[];
}

/**
 * Intelligence summary for consciousness integration
 */
export interface MarketIntelligence {
  timestamp: number;
  source: 'dexscreener';
  chains: ChainId[];
  summary: {
    totalPairsScanned: number;
    newPairsDetected: number;
    highVolumePairs: number;
    suspiciousActivity: number;
  };
  opportunities: Array<{
    pairAddress: string;
    chainId: string;
    score: number;
    reason: string;
    data: DexPair;
  }>;
  warnings: Array<{
    type: 'low_liquidity' | 'price_manipulation' | 'high_volatility' | 'rug_risk';
    pairAddress: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    details: string;
  }>;
}
