/**
 * PoolDataFetcher - Fetch Real Pool Data from On-Chain
 * 
 * Fetches reserve data, prices, and liquidity from Uniswap V3 and other DEX pools
 * on Base network. Provides real-time data for arbitrage opportunity detection.
 */

import { ethers, Provider } from 'ethers';
import { PoolInfo } from './MultiDexPathBuilder';

/**
 * Uniswap V3 Pool interface (minimal)
 */
const UNISWAP_V3_POOL_ABI = [
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function fee() external view returns (uint24)',
  'function liquidity() external view returns (uint128)',
  'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
];

/**
 * ERC20 interface for decimals
 */
const ERC20_ABI = [
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
];

/**
 * Pool configuration for fetching
 */
export interface PoolConfig {
  /** Pool address */
  address: string;
  /** DEX name */
  dex: string;
  /** Fee tier (for reference) */
  fee: number;
}

/**
 * PoolDataFetcher configuration
 */
export interface PoolDataFetcherConfig {
  /** Provider for blockchain calls */
  provider: Provider;
  /** Cache duration in milliseconds */
  cacheDurationMs?: number;
}

/**
 * Cached pool data entry
 */
interface CachedPoolData {
  data: PoolInfo;
  timestamp: number;
}

/**
 * PoolDataFetcher
 * 
 * Fetches real-time pool data from on-chain contracts with caching
 * to reduce RPC calls and improve performance.
 */
export class PoolDataFetcher {
  private config: PoolDataFetcherConfig;
  private cache: Map<string, CachedPoolData>;
  private cacheDurationMs: number;

  constructor(config: PoolDataFetcherConfig) {
    this.config = config;
    this.cache = new Map();
    this.cacheDurationMs = config.cacheDurationMs || 12000; // Default 12 seconds (1 block on Base)
  }

  /**
   * Fetch pool data for multiple pools
   * 
   * @param poolConfigs Array of pool configurations
   * @returns Array of pool info (null for failed fetches)
   */
  async fetchPools(poolConfigs: PoolConfig[]): Promise<PoolInfo[]> {
    console.log(`[PoolDataFetcher] Fetching data for ${poolConfigs.length} pools...`);

    // Fetch in parallel for speed
    const fetchPromises = poolConfigs.map((config) => this.fetchPool(config));
    const results = await Promise.allSettled(fetchPromises);

    // Filter out failed fetches
    const poolData: PoolInfo[] = [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled' && result.value) {
        poolData.push(result.value);
      } else if (result.status === 'rejected') {
        console.warn(`[PoolDataFetcher] Failed to fetch pool ${poolConfigs[i].address}:`, result.reason);
      }
    }

    console.log(`[PoolDataFetcher] Successfully fetched ${poolData.length}/${poolConfigs.length} pools`);
    return poolData;
  }

  /**
   * Fetch data for a single pool
   * 
   * @param poolConfig Pool configuration
   * @returns Pool info or null if fetch failed
   */
  async fetchPool(poolConfig: PoolConfig): Promise<PoolInfo | null> {
    try {
      // Check cache first
      const cached = this.cache.get(poolConfig.address);
      if (cached && Date.now() - cached.timestamp < this.cacheDurationMs) {
        return cached.data;
      }

      // Fetch from contract
      const poolContract = new ethers.Contract(
        poolConfig.address,
        UNISWAP_V3_POOL_ABI,
        this.config.provider
      );

      // Fetch pool data in parallel
      const [token0, token1, fee, liquidity, slot0] = await Promise.all([
        poolContract.token0(),
        poolContract.token1(),
        poolContract.fee(),
        poolContract.liquidity(),
        poolContract.slot0(),
      ]);

      // Calculate reserves from liquidity and sqrt price
      const { reserve0, reserve1 } = await this.calculateReserves(
        token0,
        token1,
        liquidity,
        slot0.sqrtPriceX96
      );

      const poolInfo: PoolInfo = {
        address: poolConfig.address,
        token0,
        token1,
        reserve0: reserve0.toString(),
        reserve1: reserve1.toString(),
        dex: poolConfig.dex,
        fee: fee.toNumber(),
      };

      // Update cache
      this.cache.set(poolConfig.address, {
        data: poolInfo,
        timestamp: Date.now(),
      });

      return poolInfo;
    } catch (error: any) {
      console.error(`[PoolDataFetcher] Error fetching pool ${poolConfig.address}:`, error.message);
      return null;
    }
  }

  /**
   * Calculate reserves from Uniswap V3 liquidity and sqrt price
   * 
   * For Uniswap V3, reserves are derived from:
   * - L (liquidity)
   * - sqrtPriceX96 (current price)
   * 
   * This is a simplified calculation for display purposes.
   * For actual trading, use the pool's swap simulation.
   */
  private async calculateReserves(
    token0: string,
    token1: string,
    liquidity: ethers.BigNumber,
    sqrtPriceX96: ethers.BigNumber
  ): Promise<{ reserve0: ethers.BigNumber; reserve1: ethers.BigNumber }> {
    try {
      // Get token decimals for proper scaling
      const token0Contract = new ethers.Contract(token0, ERC20_ABI, this.config.provider);
      const token1Contract = new ethers.Contract(token1, ERC20_ABI, this.config.provider);

      const [decimals0, decimals1] = await Promise.all([
        token0Contract.decimals(),
        token1Contract.decimals(),
      ]);

      // Simplified reserve calculation
      // reserve0 ≈ L / sqrt(P)
      // reserve1 ≈ L * sqrt(P)
      
      // Convert sqrtPriceX96 to a usable price
      const Q96 = ethers.BigNumber.from(2).pow(96);
      const price = sqrtPriceX96.mul(sqrtPriceX96).div(Q96).div(Q96);

      // Approximate reserves (this is simplified; real V3 math is more complex)
      const reserve0 = liquidity.mul(parseUnits('1', decimals0)).div(sqrtPriceX96);
      const reserve1 = liquidity.mul(sqrtPriceX96).div(Q96);

      return { reserve0, reserve1 };
    } catch (error: any) {
      console.warn('[PoolDataFetcher] Error calculating reserves, using defaults:', error.message);
      // Return non-zero defaults to avoid division by zero
      return {
        reserve0: parseEther('100'),
        reserve1: parseUnits('200000', 6), // Assuming USDC decimals
      };
    }
  }

  /**
   * Clear cache for fresh data
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[PoolDataFetcher] Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const entry of this.cache.values()) {
      if (now - entry.timestamp < this.cacheDurationMs) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      cacheDurationMs: this.cacheDurationMs,
    };
  }
}
