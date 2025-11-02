/**
 * GasPriceOracle - Real-time gas price tracking system
 * 
 * Fetches gas prices from multiple sources with EIP-1559 support
 */

import axios from 'axios';
import { ethers, BigNumber } from 'ethers';

export interface GasPrice {
  gasPrice: bigint;           // Legacy gas price (for non-EIP-1559)
  maxFeePerGas: bigint;       // EIP-1559: max total fee willing to pay
  maxPriorityFeePerGas: bigint; // EIP-1559: tip to miner
  baseFee: bigint;            // EIP-1559: current base fee
  timestamp: number;
}

export type GasPriceTier = 'instant' | 'fast' | 'normal' | 'slow';

interface GasPriceCache {
  prices: GasPrice[];
  lastUpdate: number;
}

export class GasPriceOracle {
  private provider: ethers.providers.JsonRpcProvider;
  private etherscanApiKey?: string;
  private cache: GasPriceCache;
  private refreshInterval: number;
  private refreshTimer?: NodeJS.Timeout;
  private fallbackGasPrice: bigint;

  constructor(
    providerUrl: string,
    etherscanApiKey?: string,
    refreshInterval: number = 12000, // 12 seconds
    fallbackGasPrice: bigint = BigInt(50) * BigInt(10 ** 9) // 50 gwei
  ) {
    this.provider = new ethers.providers.JsonRpcProvider(providerUrl);
    this.etherscanApiKey = etherscanApiKey;
    this.refreshInterval = refreshInterval;
    this.fallbackGasPrice = fallbackGasPrice;
    this.cache = {
      prices: [],
      lastUpdate: 0
    };
  }

  /**
   * Start automatic gas price updates
   */
  startAutoRefresh(): void {
    if (this.refreshTimer) {
      return;
    }

    // Initial fetch
    this.fetchAndCacheGasPrice().catch(console.error);

    // Set up periodic refresh
    this.refreshTimer = setInterval(() => {
      this.fetchAndCacheGasPrice().catch(console.error);
    }, this.refreshInterval);
  }

  /**
   * Stop automatic gas price updates
   */
  stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }

  /**
   * Get current gas price for a specific tier
   */
  async getCurrentGasPrice(tier: GasPriceTier = 'fast'): Promise<GasPrice> {
    // Use cached data if recent (within last 30 seconds)
    const now = Date.now();
    if (this.cache.prices.length > 0 && (now - this.cache.lastUpdate) < 30000) {
      return this.selectTierFromCache(tier);
    }

    // Fetch fresh data
    await this.fetchAndCacheGasPrice();
    return this.selectTierFromCache(tier);
  }

  /**
   * Get EIP-1559 fees
   */
  async getEIP1559Fees(): Promise<{ baseFee: bigint; priorityFee: bigint }> {
    try {
      // Get current base fee from latest block
      const block = await this.provider.getBlock('latest');
      const baseFee = block?.baseFeePerGas ? BigInt(block.baseFeePerGas.toString()) : BigInt(0);

      // Get recommended priority fee
      const feeData = await this.provider.getFeeData();
      const priorityFee = feeData.maxPriorityFeePerGas ? BigInt(feeData.maxPriorityFeePerGas.toString()) : BigInt(2) * BigInt(10 ** 9); // 2 gwei default

      return {
        baseFee,
        priorityFee
      };
    } catch (error) {
      console.error('Error fetching EIP-1559 fees:', error);
      // Return fallback values
      return {
        baseFee: BigInt(30) * BigInt(10 ** 9), // 30 gwei
        priorityFee: BigInt(2) * BigInt(10 ** 9) // 2 gwei
      };
    }
  }

  /**
   * Predict gas price for future blocks using simple moving average
   */
  predictGasPrice(blocksAhead: number): bigint {
    if (this.cache.prices.length < 3) {
      return this.fallbackGasPrice;
    }

    // Calculate simple moving average of recent prices
    const recentPrices = this.cache.prices.slice(-10);
    const sum = recentPrices.reduce((acc, price) => acc + price.baseFee, BigInt(0));
    const avg = sum / BigInt(recentPrices.length);

    // Simple trend analysis
    const older = recentPrices.slice(0, Math.floor(recentPrices.length / 2));
    const newer = recentPrices.slice(Math.floor(recentPrices.length / 2));
    
    const olderAvg = older.reduce((acc, p) => acc + p.baseFee, BigInt(0)) / BigInt(older.length);
    const newerAvg = newer.reduce((acc, p) => acc + p.baseFee, BigInt(0)) / BigInt(newer.length);

    // If gas is trending up, add a buffer
    if (newerAvg > olderAvg) {
      const trend = newerAvg - olderAvg;
      return avg + (trend * BigInt(blocksAhead) / BigInt(5));
    }

    return avg;
  }

  /**
   * Check if current gas price is acceptable
   */
  async isGasPriceAcceptable(threshold: bigint): Promise<boolean> {
    const currentPrice = await this.getCurrentGasPrice('normal');
    return currentPrice.maxFeePerGas <= threshold;
  }

  /**
   * Get historical gas prices from cache
   */
  getHistoricalPrices(): GasPrice[] {
    return [...this.cache.prices];
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache = {
      prices: [],
      lastUpdate: 0
    };
  }

  /**
   * Fetch gas price from multiple sources and cache
   */
  private async fetchAndCacheGasPrice(): Promise<void> {
    const sources = [
      this.fetchFromNode.bind(this),
      this.fetchFromEtherscan.bind(this)
    ];

    let gasPrice: GasPrice | null = null;

    // Try sources in order
    for (const source of sources) {
      try {
        gasPrice = await source();
        if (gasPrice) {
          break;
        }
      } catch (error) {
        // Continue to next source
        continue;
      }
    }

    // Use fallback if all sources failed
    if (!gasPrice) {
      gasPrice = this.createFallbackGasPrice();
    }

    // Add to cache (keep last 100 entries)
    this.cache.prices.push(gasPrice);
    if (this.cache.prices.length > 100) {
      this.cache.prices.shift();
    }
    this.cache.lastUpdate = Date.now();
  }

  /**
   * Fetch gas price from Ethereum node
   */
  private async fetchFromNode(): Promise<GasPrice> {
    const feeData = await this.provider.getFeeData();
    const block = await this.provider.getBlock('latest');

    const baseFee = block?.baseFeePerGas ? BigInt(block.baseFeePerGas.toString()) : BigInt(0);
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ? BigInt(feeData.maxPriorityFeePerGas.toString()) : BigInt(2) * BigInt(10 ** 9);
    const maxFeePerGas = feeData.maxFeePerGas ? BigInt(feeData.maxFeePerGas.toString()) : (baseFee * BigInt(2) + maxPriorityFeePerGas);
    const gasPrice = feeData.gasPrice ? BigInt(feeData.gasPrice.toString()) : maxFeePerGas;

    return {
      gasPrice,
      maxFeePerGas,
      maxPriorityFeePerGas,
      baseFee,
      timestamp: Date.now()
    };
  }

  /**
   * Fetch gas price from Etherscan API
   */
  private async fetchFromEtherscan(): Promise<GasPrice | null> {
    if (!this.etherscanApiKey) {
      return null;
    }

    try {
      const response = await axios.get('https://api.etherscan.io/api', {
        params: {
          module: 'gastracker',
          action: 'gasoracle',
          apikey: this.etherscanApiKey
        },
        timeout: 5000
      });

      if (response.data.status === '1' && response.data.result) {
        const result = response.data.result;
        
        // Etherscan returns prices in gwei
        const baseFee = BigInt(Math.floor(parseFloat(result.suggestBaseFee) * 1e9));
        const priorityFee = BigInt(Math.floor(parseFloat(result.FastGasPrice) * 1e9)) - baseFee;
        const maxFeePerGas = baseFee * BigInt(2) + priorityFee;
        const gasPrice = maxFeePerGas;

        return {
          gasPrice,
          maxFeePerGas,
          maxPriorityFeePerGas: priorityFee > BigInt(0) ? priorityFee : BigInt(2) * BigInt(10 ** 9),
          baseFee,
          timestamp: Date.now()
        };
      }
    } catch (error) {
      // Fail silently, will try next source
    }

    return null;
  }

  /**
   * Create fallback gas price
   */
  private createFallbackGasPrice(): GasPrice {
    const baseFee = this.fallbackGasPrice;
    const priorityFee = BigInt(2) * BigInt(10 ** 9);
    const maxFeePerGas = baseFee * BigInt(2) + priorityFee;

    return {
      gasPrice: maxFeePerGas,
      maxFeePerGas,
      maxPriorityFeePerGas: priorityFee,
      baseFee,
      timestamp: Date.now()
    };
  }

  /**
   * Select gas price from cache based on tier
   */
  private selectTierFromCache(tier: GasPriceTier): GasPrice {
    if (this.cache.prices.length === 0) {
      return this.createFallbackGasPrice();
    }

    const latest = this.cache.prices[this.cache.prices.length - 1];

    // Calculate multipliers for different tiers
    const multipliers: Record<GasPriceTier, number> = {
      instant: 1.3,  // 90th percentile - 30% above base
      fast: 1.15,    // 75th percentile - 15% above base
      normal: 1.0,   // 50th percentile - at base
      slow: 0.85     // 25th percentile - 15% below base
    };

    const multiplier = multipliers[tier];
    
    return {
      gasPrice: this.applyMultiplier(latest.gasPrice, multiplier),
      maxFeePerGas: this.applyMultiplier(latest.maxFeePerGas, multiplier),
      maxPriorityFeePerGas: this.applyMultiplier(latest.maxPriorityFeePerGas, multiplier),
      baseFee: latest.baseFee,
      timestamp: latest.timestamp
    };
  }

  /**
   * Apply multiplier to bigint value
   */
  private applyMultiplier(value: bigint, multiplier: number): bigint {
    return (value * BigInt(Math.floor(multiplier * 1000))) / BigInt(1000);
  }
}
