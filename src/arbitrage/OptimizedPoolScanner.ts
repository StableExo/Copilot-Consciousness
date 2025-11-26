/**
 * OptimizedPoolScanner - High-performance pool detection with RPC batching
 * 
 * Performance improvements over MultiHopDataFetcher:
 * 1. Multicall batching: Combine multiple RPC calls into single requests
 * 2. Parallel V3 fee tier checking: Check all fee tiers simultaneously
 * 3. Optimized caching: Single object with embedded timestamp
 * 4. Reduced provider.getCode() calls: Batch pool existence checks
 * 5. Smart filtering: Skip invalid token pairs early
 * 
 * Expected performance: 60+ pool scan in under 10 seconds (down from 60+ seconds)
 */

import { Contract, Interface, Provider, ZeroAddress, getCreate2Address, keccak256, solidityPacked } from 'ethers';
import { DEXRegistry } from '../dex/core/DEXRegistry';
import { DEXConfig } from '../dex/types';
import { PoolEdge } from './types';
import { logger } from '../utils/logger';
import { 
  UNISWAP_V3_FEE_TIERS, 
  V3_LIQUIDITY_SCALE_FACTOR, 
  isV3StyleProtocol 
} from './constants';
import { 
  MulticallBatcher, 
  MulticallRequest,
  batchFetchPoolData 
} from '../utils/MulticallBatcher';

/**
 * Cached pool data with embedded timestamp
 */
interface CachedPoolData {
  poolAddress: string;
  token0: string;
  token1: string;
  reserve0: bigint;
  reserve1: bigint;
  timestamp: number;
}

/**
 * Pool discovery result for V3
 */
interface V3PoolDiscovery {
  address: string;
  fee: number;
  exists: boolean;
}

export class OptimizedPoolScanner {
  private registry: DEXRegistry;
  private provider: Provider;
  private poolCache: Map<string, CachedPoolData>;
  private cacheTTL: number = 60000; // 1 minute default TTL
  private currentChainId?: number;
  private multicallBatcher?: MulticallBatcher;

  constructor(
    registry: DEXRegistry,
    provider: Provider,
    chainId?: number
  ) {
    this.registry = registry;
    this.provider = provider;
    this.poolCache = new Map();
    this.currentChainId = chainId;
  }

  /**
   * Set the current chain ID for filtering DEXes
   */
  setChainId(chainId: number): void {
    this.currentChainId = chainId;
  }

  /**
   * Initialize multicall batcher
   */
  private async getMulticallBatcher(): Promise<MulticallBatcher | null> {
    if (!this.multicallBatcher) {
      this.multicallBatcher = new MulticallBatcher(this.provider);
      const available = await this.multicallBatcher.isAvailable();
      if (!available) {
        logger.warn('Multicall3 not available on this network, falling back to individual calls', 'POOLSCAN');
        return null;
      }
    }
    return this.multicallBatcher;
  }

  /**
   * Discover all V3 pools for a token pair across all fee tiers
   * Uses multicall to check all fee tiers in a single RPC request
   */
  private async discoverV3Pools(
    factory: string,
    token0: string,
    token1: string
  ): Promise<V3PoolDiscovery[]> {
    const batcher = await this.getMulticallBatcher();
    const discoveries: V3PoolDiscovery[] = [];

    // Sort tokens for consistent ordering
    const [tokenA, tokenB] = token0.toLowerCase() < token1.toLowerCase() 
      ? [token0, token1] 
      : [token1, token0];

    const factoryInterface = new Interface([
      'function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)'
    ]);

    if (!batcher) {
      // Fallback: Check fee tiers sequentially
      logger.warn(
        `Multicall3 not available on chain ${this.currentChainId || 'unknown'}. ` +
        `Falling back to sequential RPC calls (slower performance expected).`,
        'POOLSCAN'
      );
      const factoryContract = new Contract(factory, factoryInterface, this.provider);
      for (const fee of UNISWAP_V3_FEE_TIERS) {
        try {
          const poolAddress = await factoryContract.getPool(tokenA, tokenB, fee);
          if (poolAddress && poolAddress !== ZeroAddress) {
            const code = await this.provider.getCode(poolAddress);
            discoveries.push({
              address: poolAddress,
              fee,
              exists: code !== '0x'
            });
          }
        } catch {
          // Continue to next fee tier
        }
      }
      return discoveries;
    }

    // Optimized: Batch all fee tier checks into one multicall
    const calls: MulticallRequest[] = UNISWAP_V3_FEE_TIERS.map((fee) => ({
      target: factory,
      callData: factoryInterface.encodeFunctionData('getPool', [tokenA, tokenB, fee]),
      allowFailure: true,
    }));

    const results = await batcher.executeBatch(calls);

    // Collect pool addresses that need existence checks
    const poolsToCheck: Array<{ address: string; fee: number }> = [];
    for (let i = 0; i < UNISWAP_V3_FEE_TIERS.length; i++) {
      const result = results[i];
      if (result.success) {
        try {
          const poolAddress = factoryInterface.decodeFunctionResult('getPool', result.returnData)[0];
          if (poolAddress && poolAddress !== ZeroAddress) {
            poolsToCheck.push({ address: poolAddress, fee: UNISWAP_V3_FEE_TIERS[i] });
          }
        } catch {
          // Failed to decode, skip
        }
      }
    }

    // Batch pool existence checks
    if (poolsToCheck.length > 0) {
      const poolInterface = new Interface([
        'function token0() external view returns (address)',
      ]);

      const existenceCalls: MulticallRequest[] = poolsToCheck.map(({ address }) => ({
        target: address,
        callData: poolInterface.encodeFunctionData('token0', []),
        allowFailure: true,
      }));

      const existenceResults = await batcher.executeBatch(existenceCalls);

      for (let i = 0; i < poolsToCheck.length; i++) {
        discoveries.push({
          address: poolsToCheck[i].address,
          fee: poolsToCheck[i].fee,
          exists: existenceResults[i].success,
        });
      }
    }

    return discoveries.filter(d => d.exists);
  }

  /**
   * Build graph edges for all available token pairs across DEXs
   * Optimized with multicall batching for 5-10x speed improvement
   */
  async buildGraphEdges(tokens: string[]): Promise<PoolEdge[]> {
    const startTime = Date.now();
    const edges: PoolEdge[] = [];
    
    // Get DEXes - filter by current chain if set
    let dexes = this.registry.getAllDEXes();
    if (this.currentChainId !== undefined) {
      const chainIdStr = this.currentChainId.toString();
      dexes = this.registry.getDEXesByNetwork(chainIdStr);
      logger.debug(`Filtering DEXes for chain ${this.currentChainId}: Found ${dexes.length} DEXes`, 'POOLSCAN');
    }
    
    if (dexes.length === 0) {
      logger.warn(`No DEXes found for chain ${this.currentChainId}`, 'POOLSCAN');
      return edges;
    }

    logger.info(`Starting optimized pool scan: ${tokens.length} tokens across ${dexes.length} DEXes`, 'POOLSCAN');
    logger.info(`DEXes to scan: ${dexes.map(d => d.name).join(', ')}`, 'POOLSCAN');

    // Group DEXes by protocol type for optimized processing
    const v3Dexes = dexes.filter(dex => isV3StyleProtocol(dex.protocol));
    const v2Dexes = dexes.filter(dex => !isV3StyleProtocol(dex.protocol));

    logger.info(`V3-style DEXes (${v3Dexes.length}): ${v3Dexes.map(d => d.name).join(', ')}`, 'POOLSCAN');
    logger.info(`V2-style DEXes (${v2Dexes.length}): ${v2Dexes.map(d => d.name).join(', ')}`, 'POOLSCAN');

    let poolsChecked = 0;
    let poolsFound = 0;
    const dexStats = new Map<string, { checked: number; found: number; filtered: number }>();
    const tokenPairStats = new Map<string, { dexes: string[]; poolsFound: number }>();

    // Initialize DEX stats
    for (const dex of dexes) {
      dexStats.set(dex.name, { checked: 0, found: 0, filtered: 0 });
    }

    // Process V3 DEXes (with optimized multi-tier scanning)
    for (const dex of v3Dexes) {
      logger.info(`Scanning V3 DEX: ${dex.name}`, 'POOLSCAN');
      const dexStat = dexStats.get(dex.name)!;
      
      for (let i = 0; i < tokens.length; i++) {
        for (let j = i + 1; j < tokens.length; j++) {
          const token0 = tokens[i];
          const token1 = tokens[j];
          const pairKey = `${token0.slice(0, 6)}.../${token1.slice(0, 6)}...`;

          // Check cache first
          const cacheKey = `${dex.name}-${token0}-${token1}`;
          const cached = this.poolCache.get(cacheKey);
          if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            poolsChecked++;
            dexStat.checked++;
            if (this.meetsLiquidityThreshold(cached.reserve0, dex, true)) {
              poolsFound++;
              dexStat.found++;
              edges.push(this.createEdge(cached, dex, token0, token1));
              edges.push(this.createEdge(cached, dex, token1, token0));
              this.updateTokenPairStats(tokenPairStats, pairKey, dex.name);
            } else {
              dexStat.filtered++;
              logger.debug(
                `${dex.name} ${pairKey}: Filtered (cached, liquidity=${cached.reserve0} < threshold)`,
                'POOLSCAN'
              );
            }
            continue;
          }

          // Discover all fee tier pools for this pair
          const discoveries = await this.discoverV3Pools(dex.factory, token0, token1);
          poolsChecked += UNISWAP_V3_FEE_TIERS.length;
          dexStat.checked += UNISWAP_V3_FEE_TIERS.length;

          if (discoveries.length > 0) {
            logger.debug(
              `${dex.name} ${pairKey}: Found ${discoveries.length} pool(s) across fee tiers`,
              'POOLSCAN'
            );
          }

          // Process discovered pools
          for (const discovery of discoveries) {
            // Try to fetch from batch
            const poolData = await this.fetchPoolDataOptimized(
              discovery.address,
              token0,
              token1,
              true
            );

            if (poolData) {
              // Cache the result
              const poolCacheData: CachedPoolData = {
                ...poolData,
                timestamp: Date.now(),
              };
              this.poolCache.set(cacheKey, poolCacheData);

              const meetsThreshold = this.meetsLiquidityThreshold(poolData.reserve0, dex, true);
              const threshold = dex.liquidityThreshold / BigInt(V3_LIQUIDITY_SCALE_FACTOR);
              
              if (meetsThreshold) {
                poolsFound++;
                dexStat.found++;
                edges.push(this.createEdge(poolData, dex, token0, token1));
                edges.push(this.createEdge(poolData, dex, token1, token0));
                this.updateTokenPairStats(tokenPairStats, pairKey, dex.name);
                
                logger.debug(
                  `✓ ${dex.name} ${pairKey}: ACCEPTED - fee=${discovery.fee/10000}% liquidity=${poolData.reserve0} (threshold=${threshold})`,
                  'POOLSCAN'
                );
              } else {
                dexStat.filtered++;
                logger.debug(
                  `✗ ${dex.name} ${pairKey}: FILTERED - fee=${discovery.fee/10000}% liquidity=${poolData.reserve0} < threshold=${threshold}`,
                  'POOLSCAN'
                );
              }
            }
          }
        }
      }
    }

    // Process V2 DEXes (with V2-specific optimizations)
    for (const dex of v2Dexes) {
      logger.info(`Scanning V2 DEX: ${dex.name}`, 'POOLSCAN');
      const v2Edges = await this.scanV2Dex(dex, tokens, dexStats, tokenPairStats);
      edges.push(...v2Edges);
      poolsChecked += (tokens.length * (tokens.length - 1)) / 2;
      poolsFound += v2Edges.length / 2; // Each pool creates 2 edges
    }

    const duration = Date.now() - startTime;
    
    // Summary logging
    logger.info('=== POOL SCAN SUMMARY ===', 'POOLSCAN');
    logger.info(
      `Total: Checked ${poolsChecked} potential pools, found ${poolsFound} valid pools ` +
      `in ${(duration / 1000).toFixed(2)}s (${((duration / poolsChecked) / 1000).toFixed(3)}s/pool)`,
      'POOLSCAN'
    );
    
    // Per-DEX statistics
    logger.info('=== PER-DEX STATISTICS ===', 'POOLSCAN');
    for (const [dexName, stats] of dexStats.entries()) {
      if (stats.checked > 0) {
        logger.info(
          `${dexName}: Checked=${stats.checked}, Found=${stats.found}, Filtered=${stats.filtered} ` +
          `(${stats.found > 0 ? ((stats.found / stats.checked) * 100).toFixed(1) : '0'}% success rate)`,
          'POOLSCAN'
        );
      }
    }
    
    // Token pair statistics - showing which pairs have multiple pools
    logger.info('=== TOKEN PAIR STATISTICS ===', 'POOLSCAN');
    const multiPoolPairs = Array.from(tokenPairStats.entries())
      .filter(([_, stats]) => stats.poolsFound > 1)
      .sort((a, b) => b[1].poolsFound - a[1].poolsFound);
    
    if (multiPoolPairs.length > 0) {
      logger.info(`Found ${multiPoolPairs.length} token pairs with 2+ pools (arbitrage opportunities):`, 'POOLSCAN');
      for (const [pair, stats] of multiPoolPairs) {
        logger.info(
          `  ${pair}: ${stats.poolsFound} pools on [${stats.dexes.join(', ')}]`,
          'POOLSCAN'
        );
      }
    } else {
      logger.warn('⚠️  NO TOKEN PAIRS WITH MULTIPLE POOLS FOUND - Arbitrage requires 2+ pools per pair', 'POOLSCAN');
    }
    
    const singlePoolPairs = Array.from(tokenPairStats.entries())
      .filter(([_, stats]) => stats.poolsFound === 1);
    if (singlePoolPairs.length > 0) {
      logger.info(`${singlePoolPairs.length} token pairs with only 1 pool (not suitable for arbitrage)`, 'POOLSCAN');
    }
    
    logger.info('=========================', 'POOLSCAN');

    return edges;
  }

  /**
   * Update token pair statistics for enhanced logging
   */
  private updateTokenPairStats(
    tokenPairStats: Map<string, { dexes: string[]; poolsFound: number }>,
    pairKey: string,
    dexName: string
  ): void {
    const existing = tokenPairStats.get(pairKey);
    if (existing) {
      existing.poolsFound++;
      if (!existing.dexes.includes(dexName)) {
        existing.dexes.push(dexName);
      }
    } else {
      tokenPairStats.set(pairKey, { dexes: [dexName], poolsFound: 1 });
    }
  }

  /**
   * Scan V2-style DEX for pools
   */
  private async scanV2Dex(
    dex: DEXConfig, 
    tokens: string[],
    dexStats?: Map<string, { checked: number; found: number; filtered: number }>,
    tokenPairStats?: Map<string, { dexes: string[]; poolsFound: number }>
  ): Promise<PoolEdge[]> {
    const edges: PoolEdge[] = [];
    const dexStat = dexStats?.get(dex.name);

    for (let i = 0; i < tokens.length; i++) {
      for (let j = i + 1; j < tokens.length; j++) {
        const token0 = tokens[i];
        const token1 = tokens[j];
        const pairKey = `${token0.slice(0, 6)}.../${token1.slice(0, 6)}...`;

        // Check cache first
        const cacheKey = `${dex.name}-${token0}-${token1}`;
        const cached = this.poolCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
          if (dexStat) dexStat.checked++;
          const meetsThreshold = this.meetsLiquidityThreshold(cached.reserve0, dex, false);
          
          if (meetsThreshold) {
            if (dexStat) dexStat.found++;
            edges.push(this.createEdge(cached, dex, token0, token1));
            edges.push(this.createEdge(cached, dex, token1, token0));
            if (tokenPairStats) {
              this.updateTokenPairStats(tokenPairStats, pairKey, dex.name);
            }
          } else {
            if (dexStat) dexStat.filtered++;
            logger.debug(
              `${dex.name} ${pairKey}: Filtered (cached, liquidity=${cached.reserve0} < threshold)`,
              'POOLSCAN'
            );
          }
          continue;
        }

        // Calculate pool address
        const poolAddress = await this.getV2PoolAddress(dex, token0, token1);
        if (!poolAddress) {
          if (dexStat) dexStat.checked++;
          continue;
        }

        if (dexStat) dexStat.checked++;

        // Fetch pool data
        const poolData = await this.fetchPoolDataOptimized(poolAddress, token0, token1, false);
        if (poolData) {
          // Cache the result
          const poolCacheData: CachedPoolData = {
            ...poolData,
            timestamp: Date.now(),
          };
          this.poolCache.set(cacheKey, poolCacheData);

          const meetsThreshold = this.meetsLiquidityThreshold(poolData.reserve0, dex, false);
          
          if (meetsThreshold) {
            if (dexStat) dexStat.found++;
            edges.push(this.createEdge(poolData, dex, token0, token1));
            edges.push(this.createEdge(poolData, dex, token1, token0));
            if (tokenPairStats) {
              this.updateTokenPairStats(tokenPairStats, pairKey, dex.name);
            }
            
            logger.debug(
              `✓ ${dex.name} ${pairKey}: ACCEPTED - liquidity=${poolData.reserve0} (threshold=${dex.liquidityThreshold})`,
              'POOLSCAN'
            );
          } else {
            if (dexStat) dexStat.filtered++;
            logger.debug(
              `✗ ${dex.name} ${pairKey}: FILTERED - liquidity=${poolData.reserve0} < threshold=${dex.liquidityThreshold}`,
              'POOLSCAN'
            );
          }
        }
      }
    }

    return edges;
  }

  /**
   * Fetch pool data with optimized multicall
   */
  private async fetchPoolDataOptimized(
    poolAddress: string,
    token0: string,
    token1: string,
    isV3: boolean
  ): Promise<{ poolAddress: string; token0: string; token1: string; reserve0: bigint; reserve1: bigint } | null> {
    try {
      // Use batch fetch helper
      const batchResults = await batchFetchPoolData(this.provider, [poolAddress], isV3);
      const result = batchResults.get(poolAddress);

      if (result) {
        return {
          poolAddress,
          token0: result.token0,
          token1: result.token1,
          reserve0: result.reserve0,
          reserve1: result.reserve1,
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get V2 pool address using CREATE2
   */
  private async getV2PoolAddress(
    dex: DEXConfig,
    token0: string,
    token1: string
  ): Promise<string | null> {
    if (!dex.initCodeHash) return null;

    try {
      const [tokenA, tokenB] = token0.toLowerCase() < token1.toLowerCase() 
        ? [token0, token1] 
        : [token1, token0];

      const salt = keccak256(
        solidityPacked(['address', 'address'], [tokenA, tokenB])
      );
      
      const poolAddress = getCreate2Address(
        dex.factory,
        salt,
        dex.initCodeHash
      );

      // We skip the code check here and let the fetchPoolData handle validation
      return poolAddress;
    } catch {
      return null;
    }
  }

  /**
   * Check if reserves meet liquidity threshold
   */
  private meetsLiquidityThreshold(
    reserve: bigint,
    dex: DEXConfig,
    isV3: boolean
  ): boolean {
    const threshold = isV3
      ? dex.liquidityThreshold / BigInt(V3_LIQUIDITY_SCALE_FACTOR)
      : dex.liquidityThreshold;
    
    return reserve > threshold;
  }

  /**
   * Create pool edge for graph
   */
  private createEdge(
    poolData: { poolAddress: string; reserve0: bigint; reserve1: bigint },
    dex: DEXConfig,
    tokenIn: string,
    tokenOut: string
  ): PoolEdge {
    return {
      poolAddress: poolData.poolAddress,
      dexName: dex.name,
      tokenIn,
      tokenOut,
      reserve0: poolData.reserve0,
      reserve1: poolData.reserve1,
      fee: this.getDEXFee(dex),
      gasEstimate: dex.gasEstimate || 150000,
    };
  }

  /**
   * Get DEX fee
   */
  private getDEXFee(dex: DEXConfig): number {
    const fees: Record<string, number> = {
      'Uniswap V3': 0.003,
      'Uniswap V2': 0.003,
      'SushiSwap': 0.003,
      'Curve': 0.0004,
      'Balancer': 0.001,
      'Uniswap V3 on Base': 0.003,
      'Aerodrome on Base': 0.003,
      'BaseSwap': 0.003,
      'Uniswap V2 on Base': 0.003,
      'SushiSwap on Base': 0.003,
      'PancakeSwap V3 on Base': 0.003,
      'Velodrome on Base': 0.003,
      'Balancer on Base': 0.001,
      'Maverick V2 on Base': 0.003,
      'AlienBase on Base': 0.003,
      'SwapBased on Base': 0.003,
      'RocketSwap on Base': 0.003
    };

    return fees[dex.name] || 0.003;
  }

  /**
   * Clear the pool data cache
   */
  clearCache(): void {
    this.poolCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const entry of this.poolCache.values()) {
      if (now - entry.timestamp < this.cacheTTL) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      totalEntries: this.poolCache.size,
      validEntries,
      expiredEntries,
      cacheTTL: this.cacheTTL,
    };
  }
}
