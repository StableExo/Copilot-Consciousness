/**
 * CoinMarketCap API Client
 * Unified client for both CEX and DEX data with a single API key
 * 
 * This client provides access to:
 * - CEX: Centralized exchange data (Binance, Coinbase, Kraken, etc.)
 * - DEX: Decentralized exchange data (Uniswap, PancakeSwap, SushiSwap, etc.)
 * 
 * All endpoints are accessible with one API key, making CMC a comprehensive
 * data source for both centralized and decentralized market data.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  CMCApiConfig,
  CMCApiTier,
  CMCApiResponse,
  CMCPaginatedResponse,
  CMCUsageStats,
  RATE_LIMITS,
  // CEX Types
  CEXExchange,
  CEXMarketPair,
  CEXExchangeQuote,
  CEXExchangeListParams,
  CEXMarketPairsParams,
  CEXQuotesParams,
  // DEX Types
  DEXNetwork,
  DEXListing,
  DEXPair,
  DEXPairQuote,
  DEXTrade,
  DEXOHLCVBar,
  DEXListingsParams,
  DEXPairsLatestParams,
  DEXPairsOHLCVParams,
  DEXTradesParams,
} from './types';

export class CoinMarketCapClient {
  private config: Required<CMCApiConfig>;
  private client: AxiosInstance;
  private stats: CMCUsageStats;
  private requestTimes: number[] = []; // Sliding window for rate limiting
  private dailyRequestTimes: number[] = []; // Daily request tracking

  constructor(config: CMCApiConfig) {
    if (!config.apiKey) {
      throw new Error('CoinMarketCap API key is required');
    }

    this.config = {
      apiKey: config.apiKey,
      tier: config.tier || CMCApiTier.FREE,
      baseUrl: config.baseUrl || 'https://pro-api.coinmarketcap.com',
      timeout: config.timeout || 10000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'X-CMC_PRO_API_KEY': this.config.apiKey,
        Accept: 'application/json',
        'Accept-Encoding': 'deflate, gzip',
      },
    });

    this.stats = {
      totalRequests: 0,
      totalCreditsUsed: 0,
      creditsRemaining: RATE_LIMITS[this.config.tier].creditsPerMonth,
      requestsThisMinute: 0,
      requestsToday: 0,
      lastRequestTime: 0,
      errors: 0,
    };
  }

  // ==========================================================================
  // Rate Limiting and Request Management
  // ==========================================================================

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const rateLimits = RATE_LIMITS[this.config.tier];

    // Clean up old request timestamps (older than 1 minute)
    this.requestTimes = this.requestTimes.filter((time) => now - time < 60000);

    // Clean up old daily request timestamps (older than 24 hours)
    this.dailyRequestTimes = this.dailyRequestTimes.filter(
      (time) => now - time < 86400000
    );

    // Check per-minute rate limit
    if (this.requestTimes.length >= rateLimits.requestsPerMinute) {
      const oldestRequest = this.requestTimes[0];
      const waitTime = 60000 - (now - oldestRequest);
      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    // Check daily rate limit
    if (this.dailyRequestTimes.length >= rateLimits.requestsPerDay) {
      throw new Error(
        `Daily rate limit reached (${rateLimits.requestsPerDay} requests/day)`
      );
    }

    // Record this request
    this.requestTimes.push(now);
    this.dailyRequestTimes.push(now);
    this.stats.requestsThisMinute = this.requestTimes.length;
    this.stats.requestsToday = this.dailyRequestTimes.length;
  }

  private async makeRequest<T>(
    endpoint: string,
    params?: Record<string, unknown>
  ): Promise<CMCApiResponse<T>> {
    await this.enforceRateLimit();

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        const response = await this.client.get<CMCApiResponse<T>>(endpoint, {
          params,
        });

        // Update statistics
        this.stats.totalRequests++;
        this.stats.totalCreditsUsed += response.data.status.credit_count;
        this.stats.creditsRemaining =
          RATE_LIMITS[this.config.tier].creditsPerMonth -
          this.stats.totalCreditsUsed;
        this.stats.lastRequestTime = Date.now();

        return response.data;
      } catch (error) {
        lastError = error as Error;
        this.stats.errors++;
        this.stats.lastError = lastError.message;
        this.stats.lastErrorTime = Date.now();

        // Don't retry on client errors (4xx)
        if (axios.isAxiosError(error) && error.response?.status) {
          const status = error.response.status;
          if (status >= 400 && status < 500) {
            throw error;
          }
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.config.retryAttempts - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.config.retryDelay * Math.pow(2, attempt))
          );
        }
      }
    }

    throw lastError;
  }

  // ==========================================================================
  // CEX (Centralized Exchange) Endpoints
  // ==========================================================================

  /**
   * Get list of all active centralized exchanges
   * Endpoint: GET /v1/exchange/map
   */
  async getCEXExchangeList(
    params?: CEXExchangeListParams
  ): Promise<CMCApiResponse<CEXExchange[]>> {
    return this.makeRequest<CEXExchange[]>('/v1/exchange/map', params);
  }

  /**
   * Get market pairs for a specific centralized exchange
   * Endpoint: GET /v1/exchange/market-pairs/latest
   */
  async getCEXMarketPairs(
    params: CEXMarketPairsParams
  ): Promise<CMCPaginatedResponse<{ market_pairs: CEXMarketPair[] }>> {
    return this.makeRequest<{ market_pairs: CEXMarketPair[] }>(
      '/v1/exchange/market-pairs/latest',
      params
    );
  }

  /**
   * Get quotes for specific centralized exchanges
   * Endpoint: GET /v1/exchange/quotes/latest
   */
  async getCEXExchangeQuotes(
    params: CEXQuotesParams
  ): Promise<CMCApiResponse<Record<string, CEXExchangeQuote>>> {
    return this.makeRequest<Record<string, CEXExchangeQuote>>(
      '/v1/exchange/quotes/latest',
      params
    );
  }

  /**
   * Get global aggregate market metrics
   * Endpoint: GET /v1/global-metrics/quotes/latest
   */
  async getGlobalMetrics(
    params?: { convert?: string }
  ): Promise<
    CMCApiResponse<{
      active_cryptocurrencies: number;
      active_exchanges: number;
      active_market_pairs: number;
      total_cryptocurrencies: number;
      total_exchanges: number;
      btc_dominance: number;
      eth_dominance: number;
      quote: Record<
        string,
        {
          total_market_cap: number;
          total_volume_24h: number;
          altcoin_market_cap: number;
          altcoin_volume_24h: number;
          last_updated: string;
        }
      >;
    }>
  > {
    return this.makeRequest('/v1/global-metrics/quotes/latest', params);
  }

  // ==========================================================================
  // DEX (Decentralized Exchange) Endpoints
  // ==========================================================================

  /**
   * Get list of all supported blockchain networks for DEX data
   * Endpoint: GET /v4/dex/networks/list
   */
  async getDEXNetworksList(): Promise<CMCApiResponse<DEXNetwork[]>> {
    return this.makeRequest<DEXNetwork[]>('/v4/dex/networks/list');
  }

  /**
   * Get comprehensive DEX listings with metadata
   * Endpoint: GET /v4/dex/listings/info
   */
  async getDEXListingsInfo(
    params?: DEXListingsParams
  ): Promise<CMCPaginatedResponse<DEXListing[]>> {
    return this.makeRequest<DEXListing[]>('/v4/dex/listings/info', params);
  }

  /**
   * Get aggregated quotes from multiple DEXs
   * Endpoint: GET /v4/dex/listings/quotes
   */
  async getDEXListingsQuotes(
    params?: DEXListingsParams
  ): Promise<CMCPaginatedResponse<DEXPairQuote[]>> {
    return this.makeRequest<DEXPairQuote[]>('/v4/dex/listings/quotes', params);
  }

  /**
   * Get real-time quotes for specific DEX pairs
   * Endpoint: GET /v4/dex/pairs/latest
   */
  async getDEXPairsLatest(
    params: DEXPairsLatestParams
  ): Promise<CMCApiResponse<Record<string, DEXPairQuote>>> {
    return this.makeRequest<Record<string, DEXPairQuote>>(
      '/v4/dex/pairs/latest',
      params
    );
  }

  /**
   * Get latest quotes for specific DEX pairs (alternative endpoint)
   * Endpoint: GET /v4/dex/pairs/quotes/latest
   */
  async getDEXPairsQuotesLatest(
    params: DEXPairsLatestParams
  ): Promise<CMCApiResponse<Record<string, DEXPairQuote>>> {
    return this.makeRequest<Record<string, DEXPairQuote>>(
      '/v4/dex/pairs/quotes/latest',
      params
    );
  }

  /**
   * Get latest OHLCV data for DEX pairs
   * Endpoint: GET /v4/dex/pairs/ohlcv/latest
   */
  async getDEXPairsOhlcvLatest(
    params: DEXPairsLatestParams
  ): Promise<CMCApiResponse<Record<string, DEXOHLCVBar>>> {
    return this.makeRequest<Record<string, DEXOHLCVBar>>(
      '/v4/dex/pairs/ohlcv/latest',
      params
    );
  }

  /**
   * Get historical OHLCV data for a DEX pair
   * Endpoint: GET /v4/dex/pairs/ohlcv/historical
   */
  async getDEXPairsOhlcvHistorical(
    params: DEXPairsOHLCVParams
  ): Promise<CMCApiResponse<{ quotes: DEXOHLCVBar[] }>> {
    return this.makeRequest<{ quotes: DEXOHLCVBar[] }>(
      '/v4/dex/pairs/ohlcv/historical',
      params
    );
  }

  /**
   * Get most recent trades for a DEX pair
   * Endpoint: GET /v4/dex/pairs/trade/latest
   */
  async getDEXTradesLatest(
    params: DEXTradesParams
  ): Promise<CMCPaginatedResponse<DEXTrade[]>> {
    return this.makeRequest<DEXTrade[]>('/v4/dex/pairs/trade/latest', params);
  }

  // ==========================================================================
  // Statistics and Monitoring
  // ==========================================================================

  /**
   * Get current API usage statistics
   */
  getStats(): CMCUsageStats {
    return { ...this.stats };
  }

  /**
   * Get rate limits for current tier
   */
  getRateLimits() {
    return RATE_LIMITS[this.config.tier];
  }

  /**
   * Check if approaching rate limits
   * @returns true if within 80% of any rate limit
   */
  isApproachingRateLimit(): boolean {
    const limits = RATE_LIMITS[this.config.tier];
    const minuteUsage = this.stats.requestsThisMinute / limits.requestsPerMinute;
    const dailyUsage = this.stats.requestsToday / limits.requestsPerDay;
    const creditUsage = this.stats.totalCreditsUsed / limits.creditsPerMonth;

    return minuteUsage >= 0.8 || dailyUsage >= 0.8 || creditUsage >= 0.8;
  }

  /**
   * Reset daily statistics (for testing or manual reset)
   */
  resetDailyStats(): void {
    this.dailyRequestTimes = [];
    this.stats.requestsToday = 0;
  }
}

export * from './types';
