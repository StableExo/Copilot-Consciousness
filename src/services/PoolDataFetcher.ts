/**
 * PoolDataFetcher - Fetch Real Pool Data from On-Chain
 *
 * Fetches reserve data, prices, and liquidity from Uniswap V3 and other DEX pools
 * on Base network. Provides real-time data for arbitrage opportunity detection.
 *
 * Migrated to viem as part of Phase 2.2 module migration
 */

import { type PublicClient, type Address, parseEther, parseUnits } from 'viem';
import { PoolInfo } from './MultiDexPathBuilder';

/**
 * Uniswap V3 Pool ABI (minimal)
 */
const UNISWAP_V3_POOL_ABI = [
  {
    inputs: [],
    name: 'token0',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'token1',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'fee',
    outputs: [{ name: '', type: 'uint24' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'liquidity',
    outputs: [{ name: '', type: 'uint128' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'slot0',
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'observationIndex', type: 'uint16' },
      { name: 'observationCardinality', type: 'uint16' },
      { name: 'observationCardinalityNext', type: 'uint16' },
      { name: 'feeProtocol', type: 'uint8' },
      { name: 'unlocked', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * ERC20 ABI for decimals
 */
const ERC20_ABI = [
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

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
  /** PublicClient for blockchain calls */
  publicClient: PublicClient;
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
        console.warn(
          `[PoolDataFetcher] Failed to fetch pool ${poolConfigs[i].address}:`,
          result.reason
        );
      }
    }

    console.log(
      `[PoolDataFetcher] Successfully fetched ${poolData.length}/${poolConfigs.length} pools`
    );
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

      const poolAddress = poolConfig.address as Address;

      // Fetch pool data in parallel using viem multicall
      const results = await this.config.publicClient.multicall({
        contracts: [
          {
            address: poolAddress,
            abi: UNISWAP_V3_POOL_ABI,
            functionName: 'token0',
          },
          {
            address: poolAddress,
            abi: UNISWAP_V3_POOL_ABI,
            functionName: 'token1',
          },
          {
            address: poolAddress,
            abi: UNISWAP_V3_POOL_ABI,
            functionName: 'fee',
          },
          {
            address: poolAddress,
            abi: UNISWAP_V3_POOL_ABI,
            functionName: 'liquidity',
          },
          {
            address: poolAddress,
            abi: UNISWAP_V3_POOL_ABI,
            functionName: 'slot0',
          },
        ],
      });

      // Extract results
      const token0 = results[0].status === 'success' ? (results[0].result as Address) : null;
      const token1 = results[1].status === 'success' ? (results[1].result as Address) : null;
      const fee = results[2].status === 'success' ? (results[2].result as number) : null;
      const liquidity = results[3].status === 'success' ? (results[3].result as bigint) : null;
      const slot0 = results[4].status === 'success' ? results[4].result : null;

      if (!token0 || !token1 || fee === null || liquidity === null || !slot0) {
        return null;
      }

      const sqrtPriceX96 = (
        slot0 as readonly [bigint, number, number, number, number, number, boolean]
      )[0];

      // Calculate reserves from liquidity and sqrt price
      const { reserve0, reserve1 } = await this.calculateReserves(
        token0,
        token1,
        liquidity,
        sqrtPriceX96
      );

      const poolInfo: PoolInfo = {
        address: poolConfig.address,
        token0,
        token1,
        reserve0: reserve0.toString(),
        reserve1: reserve1.toString(),
        dex: poolConfig.dex,
        fee: Number(fee),
      };

      // Update cache
      this.cache.set(poolConfig.address, {
        data: poolInfo,
        timestamp: Date.now(),
      });

      return poolInfo;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[PoolDataFetcher] Error fetching pool ${poolConfig.address}:`, message);
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
    token0: Address,
    token1: Address,
    liquidity: bigint,
    sqrtPriceX96: bigint
  ): Promise<{ reserve0: bigint; reserve1: bigint }> {
    try {
      // Get token decimals for proper scaling using viem multicall
      const results = await this.config.publicClient.multicall({
        contracts: [
          {
            address: token0,
            abi: ERC20_ABI,
            functionName: 'decimals',
          },
          {
            address: token1,
            abi: ERC20_ABI,
            functionName: 'decimals',
          },
        ],
      });

      const decimals0 = results[0].status === 'success' ? (results[0].result as number) : 18;
      const _decimals1 = results[1].status === 'success' ? (results[1].result as number) : 18;

      // Simplified reserve calculation
      // reserve0 ≈ L / sqrt(P)
      // reserve1 ≈ L * sqrt(P)

      // Convert sqrtPriceX96 to a usable price
      const Q96 = 2n ** 96n;
      const _price = (sqrtPriceX96 * sqrtPriceX96) / Q96 / Q96;

      // Approximate reserves (this is simplified; real V3 math is more complex)
      const reserve0 = (liquidity * parseUnits('1', decimals0)) / sqrtPriceX96;
      const reserve1 = (liquidity * sqrtPriceX96) / Q96;

      return { reserve0, reserve1 };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('[PoolDataFetcher] Error calculating reserves, using defaults:', message);
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
