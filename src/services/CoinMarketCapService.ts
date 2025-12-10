/**
 * CoinMarketCap API Service
 * 
 * Provides real-time cryptocurrency market data from CoinMarketCap API
 * Supports price tracking, market cap, volume, and price change data
 */

import axios, { AxiosInstance } from 'axios';
import { EventEmitter } from 'events';

export interface CoinMarketCapConfig {
  apiKey: string;
  tier?: 'free' | 'hobbyist' | 'startup' | 'standard' | 'professional' | 'enterprise';
  baseUrl?: string;
  timeout?: number;
  cacheDuration?: number;
}

export interface CryptoCurrency {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  cmc_rank: number;
  num_market_pairs: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number | null;
  last_updated: string;
  date_added: string;
  tags: string[];
  platform: {
    id: number;
    name: string;
    symbol: string;
    slug: string;
    token_address: string;
  } | null;
}

export interface QuoteData {
  price: number;
  volume_24h: number;
  volume_change_24h: number;
  percent_change_1h: number;
  percent_change_24h: number;
  percent_change_7d: number;
  percent_change_30d: number;
  market_cap: number;
  market_cap_dominance: number;
  fully_diluted_market_cap: number;
  last_updated: string;
}

export interface CryptoCurrencyQuote extends CryptoCurrency {
  quote: {
    [key: string]: QuoteData; // USD, BTC, ETH, etc.
  };
}

export interface PriceConversion {
  id: number;
  symbol: string;
  name: string;
  amount: number;
  last_updated: string;
  quote: {
    [key: string]: {
      price: number;
      last_updated: string;
    };
  };
}

export interface MarketMetrics {
  active_cryptocurrencies: number;
  total_cryptocurrencies: number;
  active_market_pairs: number;
  active_exchanges: number;
  total_exchanges: number;
  eth_dominance: number;
  btc_dominance: number;
  defi_volume_24h: number;
  defi_market_cap: number;
  derivatives_volume_24h: number;
  stablecoin_volume_24h: number;
  stablecoin_market_cap: number;
  total_market_cap: number;
  total_volume_24h: number;
  last_updated: string;
}

export class CoinMarketCapService extends EventEmitter {
  private client: AxiosInstance;
  private config: Required<CoinMarketCapConfig>;
  private cache: Map<string, { data: any; timestamp: number }>;
  private rateLimitRemaining: number = 0;
  private rateLimitReset: number = 0;

  constructor(config: CoinMarketCapConfig) {
    super();

    this.config = {
      apiKey: config.apiKey,
      tier: config.tier || 'free',
      baseUrl: config.baseUrl || 'https://pro-api.coinmarketcap.com/v1',
      timeout: config.timeout || 10000,
      cacheDuration: config.cacheDuration || 60000, // 1 minute default
    };

    this.cache = new Map();

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'X-CMC_PRO_API_KEY': this.config.apiKey,
        'Accept': 'application/json',
        'Accept-Encoding': 'deflate, gzip',
      },
    });

    // Response interceptor for rate limit tracking
    this.client.interceptors.response.use(
      (response) => {
        // Track rate limits from headers
        this.rateLimitRemaining = parseInt(response.headers['x-ratelimit-remaining'] || '0');
        this.rateLimitReset = parseInt(response.headers['x-ratelimit-reset'] || '0');

        this.emit('rateLimit', {
          remaining: this.rateLimitRemaining,
          reset: new Date(this.rateLimitReset * 1000),
        });

        return response;
      },
      (error) => {
        this.emit('error', error);
        throw error;
      }
    );
  }

  /**
   * Get cached data if available and not expired
   */
  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.config.cacheDuration) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  /**
   * Set cached data
   */
  private setCached(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Get latest listings
   */
  async getLatestListings(params?: {
    start?: number;
    limit?: number;
    convert?: string;
    sort?: 'market_cap' | 'name' | 'symbol' | 'date_added' | 'price' | 'volume_24h' | 'percent_change_24h';
    sort_dir?: 'asc' | 'desc';
  }): Promise<CryptoCurrencyQuote[]> {
    const cacheKey = `listings:${JSON.stringify(params)}`;
    const cached = this.getCached<CryptoCurrencyQuote[]>(cacheKey);
    if (cached) return cached;

    const response = await this.client.get('/cryptocurrency/listings/latest', { params });
    const data = response.data.data as CryptoCurrencyQuote[];
    
    this.setCached(cacheKey, data);
    return data;
  }

  /**
   * Get quotes for specific cryptocurrencies
   */
  async getQuotes(params: {
    symbol?: string;      // e.g., "BTC,ETH"
    id?: string;          // e.g., "1,1027"
    slug?: string;        // e.g., "bitcoin,ethereum"
    convert?: string;     // e.g., "USD,BTC"
  }): Promise<{ [key: string]: CryptoCurrencyQuote }> {
    if (!params.symbol && !params.id && !params.slug) {
      throw new Error('At least one of symbol, id, or slug must be provided');
    }

    const cacheKey = `quotes:${JSON.stringify(params)}`;
    const cached = this.getCached<{ [key: string]: CryptoCurrencyQuote }>(cacheKey);
    if (cached) return cached;

    const response = await this.client.get('/cryptocurrency/quotes/latest', { params });
    const data = response.data.data as { [key: string]: CryptoCurrencyQuote };
    
    this.setCached(cacheKey, data);
    return data;
  }

  /**
   * Get price for a single cryptocurrency
   */
  async getPrice(symbol: string, convert: string = 'USD'): Promise<number> {
    const quotes = await this.getQuotes({ symbol, convert });
    const quote = Object.values(quotes)[0];
    return quote.quote[convert].price;
  }

  /**
   * Get prices for multiple cryptocurrencies
   */
  async getPrices(symbols: string[], convert: string = 'USD'): Promise<{ [symbol: string]: number }> {
    const symbolStr = symbols.join(',');
    const quotes = await this.getQuotes({ symbol: symbolStr, convert });
    
    const prices: { [symbol: string]: number } = {};
    for (const [key, value] of Object.entries(quotes)) {
      prices[value.symbol] = value.quote[convert].price;
    }
    
    return prices;
  }

  /**
   * Convert amount from one currency to another
   */
  async convert(params: {
    amount: number;
    id?: string;
    symbol?: string;
    convert: string;
  }): Promise<PriceConversion> {
    if (!params.id && !params.symbol) {
      throw new Error('Either id or symbol must be provided');
    }

    const cacheKey = `convert:${JSON.stringify(params)}`;
    const cached = this.getCached<PriceConversion>(cacheKey);
    if (cached) return cached;

    const response = await this.client.get('/tools/price-conversion', { params });
    const data = response.data.data as PriceConversion;
    
    this.setCached(cacheKey, data);
    return data;
  }

  /**
   * Get global market metrics
   */
  async getGlobalMetrics(convert: string = 'USD'): Promise<MarketMetrics> {
    const cacheKey = `global:${convert}`;
    const cached = this.getCached<MarketMetrics>(cacheKey);
    if (cached) return cached;

    const response = await this.client.get('/global-metrics/quotes/latest', {
      params: { convert },
    });
    
    const data = response.data.data as MarketMetrics;
    this.setCached(cacheKey, data);
    return data;
  }

  /**
   * Get cryptocurrency metadata
   */
  async getMetadata(params: {
    id?: string;
    symbol?: string;
    slug?: string;
  }): Promise<{ [key: string]: any }> {
    if (!params.id && !params.symbol && !params.slug) {
      throw new Error('At least one of id, symbol, or slug must be provided');
    }

    const response = await this.client.get('/cryptocurrency/info', { params });
    return response.data.data;
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus(): { remaining: number; reset: Date | null } {
    return {
      remaining: this.rateLimitRemaining,
      reset: this.rateLimitReset ? new Date(this.rateLimitReset * 1000) : null,
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}

/**
 * Factory function to create CoinMarketCapService from environment
 */
export function createCoinMarketCapService(): CoinMarketCapService | null {
  const apiKey = process.env.COINMARKETCAP_API_KEY;
  const enabled = process.env.ENABLE_COINMARKETCAP === 'true';

  if (!enabled || !apiKey) {
    return null;
  }

  return new CoinMarketCapService({
    apiKey,
    tier: (process.env.COINMARKETCAP_API_TIER as any) || 'free',
    cacheDuration: 60000, // 1 minute cache
  });
}
