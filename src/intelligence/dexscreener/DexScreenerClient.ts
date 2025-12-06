/**
 * DEXScreener API Client
 * 
 * Official API client for DEXScreener v1
 * Rate limits: 60 req/min for profiles/boosts, 300 req/min for pairs
 * 
 * @see https://docs.dexscreener.com/api/reference
 */

import type {
  DexScreenerConfig,
  TokenProfile,
  TokenBoost,
  DexPair,
  SearchResult,
  CommunityTakeover,
  RateLimitInfo,
  ChainId,
} from './types';

export class DexScreenerClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly timeout: number;
  private readonly retryAttempts: number;
  private readonly retryDelay: number;
  private rateLimitInfo: RateLimitInfo | null = null;

  constructor(config: DexScreenerConfig = {}) {
    this.baseUrl = config.baseUrl || 'https://api.dexscreener.com';
    this.apiKey = config.apiKey || process.env.DEXSCREENER_API_KEY;
    this.timeout = config.timeout || 10000;
    this.retryAttempts = config.retryAttempts || 3;
    this.retryDelay = config.retryDelay || 1000;
  }

  /**
   * Get rate limit information from last request
   */
  getRateLimitInfo(): RateLimitInfo | null {
    return this.rateLimitInfo;
  }

  /**
   * Make HTTP request with retry logic
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Accept': 'application/json',
      ...options.headers,
    };

    if (this.apiKey) {
      headers['X-API-KEY'] = this.apiKey;
    }

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Update rate limit info from headers
        this.updateRateLimitInfo(response.headers);

        if (!response.ok) {
          // Handle rate limiting with exponential backoff
          if (response.status === 429) {
            const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
            if (attempt < this.retryAttempts - 1) {
              await this.sleep(retryAfter * 1000);
              continue;
            }
          }
          
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data as T;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.retryAttempts - 1) {
          // Exponential backoff
          await this.sleep(this.retryDelay * Math.pow(2, attempt));
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  /**
   * Update rate limit information from response headers
   */
  private updateRateLimitInfo(headers: Headers): void {
    const limit = headers.get('X-RateLimit-Limit');
    const remaining = headers.get('X-RateLimit-Remaining');
    const reset = headers.get('X-RateLimit-Reset');

    if (limit && remaining && reset) {
      this.rateLimitInfo = {
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        reset: parseInt(reset, 10),
      };
    }
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================
  // Token Profile Endpoints (60 req/min)
  // ============================================

  /**
   * Get latest token profiles
   * @see https://docs.dexscreener.com/api/reference#token-profiles
   */
  async getLatestTokenProfiles(): Promise<TokenProfile[]> {
    const response = await this.request<TokenProfile[]>('/token-profiles/latest/v1');
    return response;
  }

  // ============================================
  // Token Boost Endpoints (60 req/min)
  // ============================================

  /**
   * Get top boosted tokens
   * @see https://docs.dexscreener.com/api/reference#token-boosts
   */
  async getTopBoostedTokens(): Promise<TokenBoost[]> {
    const response = await this.request<TokenBoost[]>('/token-boosts/top/v1');
    return response;
  }

  /**
   * Get latest token boosts
   */
  async getLatestTokenBoosts(): Promise<TokenBoost[]> {
    const response = await this.request<TokenBoost[]>('/token-boosts/latest/v1');
    return response;
  }

  // ============================================
  // DEX Pair Endpoints (300 req/min)
  // ============================================

  /**
   * Get pair by chain and pair address
   * @param chainId - Chain identifier (e.g., 'ethereum', 'bsc', 'base')
   * @param pairAddress - Pair contract address
   */
  async getPairByAddress(chainId: ChainId, pairAddress: string): Promise<DexPair | null> {
    const response = await this.request<SearchResult>(
      `/latest/dex/pairs/${chainId}/${pairAddress}`
    );
    return response.pairs?.[0] || null;
  }

  /**
   * Get pairs by token addresses (up to 30 addresses)
   * @param tokenAddresses - Array of token addresses (comma-separated for API)
   */
  async getPairsByTokens(tokenAddresses: string[]): Promise<DexPair[]> {
    if (tokenAddresses.length === 0) return [];
    if (tokenAddresses.length > 30) {
      throw new Error('Maximum 30 token addresses allowed per request');
    }

    const addresses = tokenAddresses.join(',');
    const response = await this.request<SearchResult>(
      `/latest/dex/tokens/${addresses}`
    );
    return response.pairs || [];
  }

  /**
   * Search for pairs by query
   * @param query - Search query (token name, symbol, or address)
   */
  async searchPairs(query: string): Promise<DexPair[]> {
    const encodedQuery = encodeURIComponent(query);
    const response = await this.request<SearchResult>(
      `/latest/dex/search?q=${encodedQuery}`
    );
    return response.pairs || [];
  }

  // ============================================
  // Community Takeover Endpoints (60 req/min)
  // ============================================

  /**
   * Get latest community takeovers
   */
  async getLatestCommunityTakeovers(): Promise<CommunityTakeover[]> {
    const response = await this.request<CommunityTakeover[]>(
      '/community-takeovers/latest/v1'
    );
    return response;
  }

  // ============================================
  // Order Status Endpoints
  // ============================================

  /**
   * Get order status for a token
   * @param chainId - Chain identifier
   * @param tokenAddress - Token address
   */
  async getOrderStatus(
    chainId: ChainId,
    tokenAddress: string
  ): Promise<Record<string, unknown>> {
    const response = await this.request<Record<string, unknown>>(
      `/orders/v1/${chainId}/${tokenAddress}`
    );
    return response;
  }

  // ============================================
  // Convenience Methods
  // ============================================

  /**
   * Get new pairs created in the last N hours
   * @param chains - Chains to monitor
   * @param maxAgeHours - Maximum age in hours (default: 1)
   */
  async getNewPairs(chains: ChainId[], maxAgeHours: number = 1): Promise<DexPair[]> {
    const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
    const allPairs: DexPair[] = [];

    // Note: This would need a proper "new pairs" endpoint from DEXScreener
    // For now, we'd need to search and filter by pairCreatedAt
    // This is a placeholder for the concept
    
    return allPairs;
  }

  /**
   * Check if a pair looks suspicious (potential scam/rug)
   * @param pair - DEX pair to analyze
   */
  async analyzePairSafety(pair: DexPair): Promise<{
    isSuspicious: boolean;
    warnings: string[];
    score: number; // 0-100, lower is more suspicious
  }> {
    const warnings: string[] = [];
    let score = 100;

    // Check liquidity
    if (!pair.liquidity?.usd || pair.liquidity.usd < 10000) {
      warnings.push('Very low liquidity (< $10k)');
      score -= 30;
    }

    // Check volume/liquidity ratio
    if (pair.liquidity?.usd && pair.volume.h24) {
      const volLiqRatio = pair.volume.h24 / pair.liquidity.usd;
      if (volLiqRatio > 10) {
        warnings.push('Abnormal volume/liquidity ratio (possible wash trading)');
        score -= 20;
      }
    }

    // Check price volatility
    const priceChanges = Object.values(pair.priceChange);
    const avgAbsChange = priceChanges.reduce((sum, change) => sum + Math.abs(change), 0) / priceChanges.length;
    if (avgAbsChange > 50) {
      warnings.push('Extreme price volatility');
      score -= 15;
    }

    // Check transaction balance
    const buyTotal = pair.txns.h24.buys;
    const sellTotal = pair.txns.h24.sells;
    if (sellTotal > buyTotal * 2) {
      warnings.push('Heavy sell pressure (sells > 2x buys)');
      score -= 10;
    }

    // Check if very new
    if (pair.pairCreatedAt) {
      const ageHours = (Date.now() - pair.pairCreatedAt) / (1000 * 60 * 60);
      if (ageHours < 1) {
        warnings.push('Pair created less than 1 hour ago');
        score -= 10;
      }
    }

    // Check social/website presence
    if (!pair.info?.websites?.length && !pair.info?.socials?.length) {
      warnings.push('No website or social media links');
      score -= 15;
    }

    return {
      isSuspicious: score < 50,
      warnings,
      score: Math.max(0, score),
    };
  }

  /**
   * Health check - verify API is accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to get latest boosted tokens (smallest payload)
      await this.getTopBoostedTokens();
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default DexScreenerClient;
