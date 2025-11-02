/**
 * GasPriceOracle - Real-time gas price tracking system
 * 
 * Fetches gas prices from multiple sources with EIP-1559 support
 * Now supports multi-chain gas price tracking
 */

import axios from 'axios';
import { ethers } from 'ethers';

export interface GasPrice {
  gasPrice: bigint;           // Legacy gas price (for non-EIP-1559)
  maxFeePerGas: bigint;       // EIP-1559: max total fee willing to pay
  maxPriorityFeePerGas: bigint; // EIP-1559: tip to miner
  baseFee: bigint;            // EIP-1559: current base fee
  timestamp: number;
  chainId?: number | string;  // Chain identifier
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

  // Chain-specific gas price multipliers (relative to Ethereum)
  private static readonly CHAIN_GAS_MULTIPLIERS: Record<number | string, number> = {
    1: 1.0,           // Ethereum - baseline
    56: 0.01,         // BSC - much cheaper
    137: 0.05,        // Polygon - cheaper
    43114: 0.1,       // Avalanche - cheaper
    42161: 0.05,      // Arbitrum - much cheaper (L2)
    10: 0.05,         // Optimism - much cheaper (L2)
    8453: 0.05,       // Base - much cheaper (L2)
    'mainnet-beta': 0.00001 // Solana - extremely cheap
  };

  /**
   * Create fallback gas price
   */
  private createFallbackGasPrice(chainId?: number | string): GasPrice {
    let fallbackPrice = this.fallbackGasPrice;
    
    // Adjust for specific chains if provided
    if (chainId) {
      const multiplier = GasPriceOracle.CHAIN_GAS_MULTIPLIERS[chainId] || 1.0;
      fallbackPrice = this.applyMultiplier(this.fallbackGasPrice, multiplier);
    }

    const priorityFee = BigInt(2) * BigInt(10 ** 9);
    const maxFeePerGas = fallbackPrice * BigInt(2) + priorityFee;

    return {
      gasPrice: maxFeePerGas,
      maxFeePerGas,
      maxPriorityFeePerGas: priorityFee,
      baseFee: fallbackPrice,
      timestamp: Date.now(),
      chainId
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

  /**
   * Get gas price for a specific chain
   * 
   * Estimates gas price for different chains based on chain characteristics
   */
  async getChainGasPrice(chainId: number | string): Promise<GasPrice> {
    // Get base gas price from current provider (assuming Ethereum mainnet)
    const basePrice = await this.getCurrentGasPrice('fast');

    // Use shared chain multipliers
    const multiplier = GasPriceOracle.CHAIN_GAS_MULTIPLIERS[chainId] || 1.0;

    return {
      gasPrice: this.applyMultiplier(basePrice.gasPrice, multiplier),
      maxFeePerGas: this.applyMultiplier(basePrice.maxFeePerGas, multiplier),
      maxPriorityFeePerGas: this.applyMultiplier(basePrice.maxPriorityFeePerGas, multiplier),
      baseFee: this.applyMultiplier(basePrice.baseFee, multiplier),
      timestamp: Date.now(),
      chainId
    };
  }

  /**
   * Get gas prices for multiple chains in parallel
   */
  async getMultiChainGasPrices(chainIds: (number | string)[]): Promise<Map<number | string, GasPrice>> {
    const pricesMap = new Map<number | string, GasPrice>();
    
    const pricePromises = chainIds.map(async chainId => {
      try {
        const price = await this.getChainGasPrice(chainId);
        return [chainId, price] as [number | string, GasPrice];
      } catch (error) {
        console.warn(`Failed to get gas price for chain ${chainId}:`, error);
        return [chainId, this.createFallbackGasPrice(chainId)] as [number | string, GasPrice];
      }
    });

    const results = await Promise.all(pricePromises);
    for (const [chainId, price] of results) {
      pricesMap.set(chainId, price);
    }

    return pricesMap;
  }

  /**
   * Estimate total gas cost for cross-chain path
   * 
   * Calculates total gas cost across multiple chains
   */
  async estimateCrossChainGasCost(
    hops: Array<{ chainId: number | string; gasEstimate: number }>
  ): Promise<bigint> {
    const chainIds = [...new Set(hops.map(h => h.chainId))];
    const gasPrices = await this.getMultiChainGasPrices(chainIds);

    let totalCost = BigInt(0);
    for (const hop of hops) {
      const gasPrice = gasPrices.get(hop.chainId);
      if (gasPrice) {
        totalCost += BigInt(hop.gasEstimate) * gasPrice.gasPrice;
      }
    }

    return totalCost;
  }
}
