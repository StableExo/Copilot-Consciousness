/**
 * SimplePriceOracle - Simple price oracle with hardcoded prices for common tokens
 * 
 * Provides token price conversions for profitability calculations.
 * Uses hardcoded prices with caching. Ready for Chainlink integration.
 */

import { PriceOracle, TokenPrice } from './types';

/**
 * Cache entry for token prices
 */
interface PriceCacheEntry {
  price: bigint;
  decimals: number;
  timestamp: number;
}

/**
 * Simple price oracle implementation with hardcoded prices
 */
export class SimplePriceOracle implements PriceOracle {
  private priceCache: Map<string, PriceCacheEntry>;
  private cacheTTL: number; // Cache time-to-live in milliseconds
  
  // Hardcoded prices in USD with 18 decimals (e.g., 3000 * 10^18 for $3000)
  private readonly DEFAULT_PRICES: Map<string, { price: bigint; decimals: number }>;
  
  /**
   * Create a new SimplePriceOracle
   * @param cacheTTL Cache time-to-live in milliseconds (default: 60000 = 1 minute)
   */
  constructor(cacheTTL: number = 60000) {
    this.cacheTTL = cacheTTL;
    this.priceCache = new Map();
    
    // Initialize default prices (18 decimals for USD prices)
    this.DEFAULT_PRICES = new Map([
      // WETH - $3000
      ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', { 
        price: BigInt('3000000000000000000000'), 
        decimals: 18 
      }],
      // USDC - $1 (6 decimals)
      ['0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', { 
        price: BigInt('1000000000000000000'), 
        decimals: 6 
      }],
      // USDT - $1 (6 decimals)
      ['0xdac17f958d2ee523a2206206994597c13d831ec7', { 
        price: BigInt('1000000000000000000'), 
        decimals: 6 
      }],
      // DAI - $1 (18 decimals)
      ['0x6b175474e89094c44da98b954eedeac495271d0f', { 
        price: BigInt('1000000000000000000'), 
        decimals: 18 
      }],
      // WBTC - $60000 (8 decimals)
      ['0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', { 
        price: BigInt('60000000000000000000000'), 
        decimals: 8 
      }],
      // ETH (native) - $3000
      ['eth', { 
        price: BigInt('3000000000000000000000'), 
        decimals: 18 
      }]
    ]);
  }
  
  /**
   * Get price of token in USD with 18 decimals
   */
  async getTokenPriceUSD(tokenAddress: string): Promise<bigint> {
    const normalizedAddress = tokenAddress.toLowerCase();
    
    // Check cache first
    const cached = this.priceCache.get(normalizedAddress);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
      return cached.price;
    }
    
    // Get from default prices
    const defaultPrice = this.DEFAULT_PRICES.get(normalizedAddress);
    if (defaultPrice) {
      const cacheEntry: PriceCacheEntry = {
        price: defaultPrice.price,
        decimals: defaultPrice.decimals,
        timestamp: Date.now()
      };
      this.priceCache.set(normalizedAddress, cacheEntry);
      return defaultPrice.price;
    }
    
    // If not found, return 0 (could be replaced with Chainlink integration)
    // TODO: Integrate Chainlink price feeds for unknown tokens
    return BigInt(0);
  }
  
  /**
   * Convert amount from one token to another
   * @param fromToken Source token address
   * @param toToken Destination token address
   * @param amount Amount in fromToken (with fromToken decimals)
   * @param fromDecimals Decimals of fromToken
   * @param toDecimals Decimals of toToken
   * @returns Amount in toToken (with toToken decimals)
   */
  async convertTokenAmount(
    fromToken: string,
    toToken: string,
    amount: bigint,
    fromDecimals: number,
    toDecimals: number
  ): Promise<bigint> {
    // Get prices in USD (18 decimals)
    const fromPriceUSD = await this.getTokenPriceUSD(fromToken);
    const toPriceUSD = await this.getTokenPriceUSD(toToken);
    
    if (fromPriceUSD === BigInt(0) || toPriceUSD === BigInt(0)) {
      return BigInt(0);
    }
    
    // Convert amount to USD value (18 decimals)
    // amountUSD = amount * fromPriceUSD / (10^fromDecimals)
    const amountUSD = (amount * fromPriceUSD) / BigInt(10 ** fromDecimals);
    
    // Convert USD value to destination token
    // toAmount = amountUSD * (10^toDecimals) / toPriceUSD
    const toAmount = (amountUSD * BigInt(10 ** toDecimals)) / toPriceUSD;
    
    return toAmount;
  }
  
  /**
   * Get ETH price in USD with 18 decimals
   */
  async getETHPriceUSD(): Promise<bigint> {
    return await this.getTokenPriceUSD('ETH');
  }
  
  /**
   * Update token price manually (for testing or manual updates)
   * @param tokenAddress Token address
   * @param priceUSD Price in USD with 18 decimals
   * @param decimals Token decimals
   */
  updatePrice(tokenAddress: string, priceUSD: bigint, decimals: number): void {
    const normalizedAddress = tokenAddress.toLowerCase();
    const cacheEntry: PriceCacheEntry = {
      price: priceUSD,
      decimals: decimals,
      timestamp: Date.now()
    };
    this.priceCache.set(normalizedAddress, cacheEntry);
    
    // Also update default prices for persistence
    this.DEFAULT_PRICES.set(normalizedAddress, { price: priceUSD, decimals });
  }
  
  /**
   * Clear price cache
   */
  clearCache(): void {
    this.priceCache.clear();
  }
  
  /**
   * Get all cached prices
   */
  getCachedPrices(): TokenPrice[] {
    const prices: TokenPrice[] = [];
    this.priceCache.forEach((entry, address) => {
      prices.push({
        tokenAddress: address,
        symbol: this.getTokenSymbol(address),
        priceUSD: entry.price,
        decimals: entry.decimals,
        timestamp: entry.timestamp
      });
    });
    return prices;
  }
  
  /**
   * Get token symbol from address (simplified, returns address if unknown)
   */
  private getTokenSymbol(address: string): string {
    const symbolMap: { [key: string]: string } = {
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'WETH',
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'USDC',
      '0xdac17f958d2ee523a2206206994597c13d831ec7': 'USDT',
      '0x6b175474e89094c44da98b954eedeac495271d0f': 'DAI',
      '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 'WBTC',
      'eth': 'ETH'
    };
    return symbolMap[address.toLowerCase()] || address;
  }
  
  /**
   * Check if price is cached and fresh
   */
  isCached(tokenAddress: string): boolean {
    const cached = this.priceCache.get(tokenAddress.toLowerCase());
    return cached !== undefined && (Date.now() - cached.timestamp) < this.cacheTTL;
  }
  
  /**
   * Get cache TTL
   */
  getCacheTTL(): number {
    return this.cacheTTL;
  }
  
  /**
   * Set cache TTL
   */
  setCacheTTL(ttl: number): void {
    this.cacheTTL = ttl;
  }
}

/**
 * Create a SimplePriceOracle with custom prices
 * @param customPrices Map of token addresses to prices (USD with 18 decimals)
 * @param decimalsMap Map of token addresses to decimals
 * @param cacheTTL Cache TTL in milliseconds
 */
export function createCustomPriceOracle(
  customPrices: Map<string, bigint>,
  decimalsMap: Map<string, number>,
  cacheTTL: number = 60000
): SimplePriceOracle {
  const oracle = new SimplePriceOracle(cacheTTL);
  
  customPrices.forEach((price, address) => {
    const decimals = decimalsMap.get(address) || 18;
    oracle.updatePrice(address, price, decimals);
  });
  
  return oracle;
}
