/**
 * Alchemy Prices Service
 *
 * Provides token price data using Alchemy's Enhanced APIs.
 * Useful for arbitrage profit calculations and cross-DEX price comparison.
 */

import { getAlchemyClient } from './AlchemyClient';
import { formatEther, formatUnits } from 'ethers';

export interface TokenPrice {
  token: string;
  priceUsd: number;
  lastUpdated: number;
}

export interface PriceComparison {
  token: string;
  dex1Price: number;
  dex2Price: number;
  spreadPercent: number;
  profitPotential: number;
}

/**
 * Service for fetching and analyzing token prices
 */
export class AlchemyPricesService {
  private client = getAlchemyClient();
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();
  private cacheTTL = 60000; // 1 minute cache

  /**
   * Get current ETH price in USD
   */
  async getEthPriceUsd(): Promise<number> {
    try {
      // Use a reliable price oracle or API
      // For now, we'll need to implement this using on-chain data or external API
      const cacheKey = 'ETH_USD';
      const cached = this.getCachedPrice(cacheKey);
      if (cached !== null) return cached;

      // Implementation would fetch from price oracle
      // Placeholder: would integrate with Alchemy's price endpoints when available
      const price = await this.fetchPriceFromChain('ETH');

      this.setCachedPrice(cacheKey, price);
      return price;
    } catch (error) {
      console.error('Error fetching ETH price:', error);
      throw error;
    }
  }

  /**
   * Get token price in USD
   */
  async getTokenPriceUsd(tokenAddress: string): Promise<number> {
    try {
      const cacheKey = `${tokenAddress}_USD`;
      const cached = this.getCachedPrice(cacheKey);
      if (cached !== null) return cached;

      const price = await this.fetchPriceFromChain(tokenAddress);

      this.setCachedPrice(cacheKey, price);
      return price;
    } catch (error) {
      console.error(`Error fetching price for ${tokenAddress}:`, error);
      throw error;
    }
  }

  /**
   * Get token price in ETH
   */
  async getTokenPriceEth(tokenAddress: string): Promise<number> {
    try {
      const tokenPriceUsd = await this.getTokenPriceUsd(tokenAddress);
      const ethPriceUsd = await this.getEthPriceUsd();

      return tokenPriceUsd / ethPriceUsd;
    } catch (error) {
      console.error(`Error calculating ETH price for ${tokenAddress}:`, error);
      throw error;
    }
  }

  /**
   * Compare prices across different sources
   */
  async comparePrices(
    tokenAddress: string,
    source1Price: number,
    source2Price: number
  ): Promise<PriceComparison> {
    const spread = Math.abs(source1Price - source2Price);
    const spreadPercent = (spread / Math.min(source1Price, source2Price)) * 100;

    return {
      token: tokenAddress,
      dex1Price: source1Price,
      dex2Price: source2Price,
      spreadPercent,
      profitPotential: spreadPercent - 0.3, // Subtract typical gas/fees
    };
  }

  /**
   * Calculate arbitrage opportunity value
   */
  async calculateArbitrageValue(
    tokenAddress: string,
    buyPrice: number,
    sellPrice: number,
    amount: bigint,
    decimals: number
  ): Promise<number> {
    try {
      const amountFloat = parseFloat(formatUnits(amount, decimals));
      const priceUsd = await this.getTokenPriceUsd(tokenAddress);

      const buyValueUsd = buyPrice * amountFloat * priceUsd;
      const sellValueUsd = sellPrice * amountFloat * priceUsd;

      return sellValueUsd - buyValueUsd;
    } catch (error) {
      console.error('Error calculating arbitrage value:', error);
      throw error;
    }
  }

  /**
   * Fetch price from on-chain sources
   * This is a placeholder - would integrate with price oracles
   */
  private async fetchPriceFromChain(tokenAddress: string): Promise<number> {
    try {
      // This would integrate with:
      // 1. Chainlink price feeds
      // 2. Uniswap V3 TWAP
      // 3. Other reliable price oracles

      // For now, throw an error to indicate not implemented
      throw new Error(
        `Price fetching not fully implemented for ${tokenAddress}. Please integrate with price oracle.`
      );
    } catch (error) {
      console.error(`Error fetching on-chain price for ${tokenAddress}:`, error);
      throw error;
    }
  }

  /**
   * Get cached price if available and fresh
   */
  private getCachedPrice(key: string): number | null {
    const cached = this.priceCache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.cacheTTL) {
      this.priceCache.delete(key);
      return null;
    }

    return cached.price;
  }

  /**
   * Set cached price
   */
  private setCachedPrice(key: string, price: number): void {
    this.priceCache.set(key, {
      price,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear price cache
   */
  clearCache(): void {
    this.priceCache.clear();
  }

  /**
   * Get historical prices (if available through Alchemy)
   */
  async getHistoricalPrice(tokenAddress: string, blockNumber: number): Promise<number> {
    try {
      // Would fetch historical price at specific block
      // This requires integration with historical price oracles or indexed data
      throw new Error(
        `Historical price fetching not fully implemented for ${tokenAddress} at block ${blockNumber}. Please integrate with historical price oracle.`
      );
    } catch (error) {
      console.error('Error fetching historical price:', error);
      throw error;
    }
  }
}
