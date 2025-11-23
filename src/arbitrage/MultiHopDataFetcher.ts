/**
 * MultiHopDataFetcher - Fetches multi-hop price and liquidity data
 * 
 * Extends DEX registry functionality to support multi-token paths
 */

import { ethers } from 'ethers';
import { DEXRegistry } from '../dex/core/DEXRegistry';
import { DEXConfig } from '../dex/types';
import { PoolEdge, Token } from './types';
import { logger } from '../utils/logger';
import { 
  UNISWAP_V3_FEE_TIERS, 
  V3_LIQUIDITY_SCALE_FACTOR, 
  isV3StyleProtocol 
} from './constants';

/**
 * Interface for pool data
 */
interface PoolData {
  poolAddress: string;
  token0: string;
  token1: string;
  reserve0: bigint;
  reserve1: bigint;
}

export class MultiHopDataFetcher {
  private registry: DEXRegistry;
  private providers: Map<string, ethers.providers.Provider>;
  private poolCache: Map<string, PoolData>;
  private mode: 'polling' | 'event-driven' = 'polling';
  private cacheTTL: number = 60000; // 1 minute default TTL
  private cacheTimestamps: Map<string, number> = new Map();
  private currentChainId?: number; // Track current chain for filtering

  constructor(registry: DEXRegistry, chainId?: number) {
    this.registry = registry;
    this.providers = new Map();
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
   * Get or create provider for a specific network
   */
  private getProvider(network: string): ethers.providers.Provider {
    if (!this.providers.has(network)) {
      // In production, these should come from configuration
      const rpcUrls: Record<string, string> = {
        '1': 'https://eth.llamarpc.com',
        '8453': 'https://mainnet.base.org'
      };
      
      const rpcUrl = rpcUrls[network] || 'https://eth.llamarpc.com';
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      this.providers.set(network, provider);
    }
    
    return this.providers.get(network)!;
  }

  /**
   * Fetch pool data for a token pair on a specific DEX
   */
  async fetchPoolData(
    dex: DEXConfig,
    token0: string,
    token1: string
  ): Promise<PoolData | null> {
    try {
      const provider = this.getProvider(dex.network);
      
      // Generate pool address (simplified - actual implementation depends on DEX)
      const poolAddress = await this.getPoolAddress(dex, token0, token1, provider);
      
      if (!poolAddress) {
        return null;
      }

      // Check cache with TTL validation
      const cacheKey = `${dex.name}-${poolAddress}`;
      if (this.poolCache.has(cacheKey) && this.isCacheValid(cacheKey)) {
        return this.poolCache.get(cacheKey)!;
      }

      // Fetch reserves - method varies by protocol
      const reserves = await this.getReserves(poolAddress, provider, dex.protocol);
      
      if (!reserves) {
        return null;
      }

      const poolData: PoolData = {
        poolAddress,
        token0,
        token1,
        reserve0: reserves.reserve0,
        reserve1: reserves.reserve1
      };

      // Cache the result with timestamp
      this.poolCache.set(cacheKey, poolData);
      this.cacheTimestamps.set(cacheKey, Date.now());

      return poolData;
    } catch (error) {
      console.error(`Error fetching pool data: ${error}`);
      return null;
    }
  }

  /**
   * Build graph edges for all available token pairs across DEXs
   */
  async buildGraphEdges(tokens: string[]): Promise<PoolEdge[]> {
    const edges: PoolEdge[] = [];
    
    // Get DEXes - filter by current chain if set
    let dexes = this.registry.getAllDEXes();
    if (this.currentChainId !== undefined) {
      const chainIdStr = this.currentChainId.toString();
      dexes = this.registry.getDEXesByNetwork(chainIdStr);
      logger.debug(`Filtering DEXes for chain ${this.currentChainId}: Found ${dexes.length} DEXes`, 'DATAFETCH');
    }
    
    if (dexes.length === 0) {
      logger.warn(`No DEXes found for chain ${this.currentChainId}`, 'DATAFETCH');
      return edges;
    }

    logger.debug(`Building graph edges for ${tokens.length} tokens across ${dexes.length} DEXes`, 'DATAFETCH');
    let poolsChecked = 0;
    let poolsFound = 0;

    // Generate all token pairs
    for (let i = 0; i < tokens.length; i++) {
      for (let j = 0; j < tokens.length; j++) {
        if (i === j) continue;

        const token0 = tokens[i];
        const token1 = tokens[j];

        // Check each DEX for this pair
        for (const dex of dexes) {
          poolsChecked++;
          const poolData = await this.fetchPoolData(dex, token0, token1);
          
          if (poolData) {
            // For V3 pools, liquidity is in L = sqrt(x*y) format, significantly smaller than V2 reserves
            // See V3_LIQUIDITY_SCALE_FACTOR constant definition for mathematical explanation
            const threshold = isV3StyleProtocol(dex.protocol)
              ? dex.liquidityThreshold / BigInt(V3_LIQUIDITY_SCALE_FACTOR)
              : dex.liquidityThreshold;
            
            if (poolData.reserve0 > threshold) {
              poolsFound++;
              // Create edge in both directions
              edges.push({
                poolAddress: poolData.poolAddress,
                dexName: dex.name,
                tokenIn: token0,
                tokenOut: token1,
                reserve0: poolData.reserve0,
                reserve1: poolData.reserve1,
                fee: this.getDEXFee(dex),
                gasEstimate: dex.gasEstimate || 150000
              });
              
              // Only perform string operations if debug is enabled
              if (logger.isDebugEnabled()) {
                logger.debug(`Found pool: ${dex.name} ${token0.slice(0,6)}.../${token1.slice(0,6)}... (reserves: ${poolData.reserve0}/${poolData.reserve1})`, 'DATAFETCH');
              }
            }
          }
        }
      }
    }

    logger.info(`Pool scan complete: Checked ${poolsChecked} potential pools, found ${poolsFound} valid pools with sufficient liquidity`, 'DATAFETCH');
    return edges;
  }

  /**
   * Get pool address for a token pair
   */
  private async getPoolAddress(
    dex: DEXConfig,
    token0: string,
    token1: string,
    provider: ethers.providers.Provider
  ): Promise<string | null> {
    try {
      // Sort tokens
      const [tokenA, tokenB] = token0.toLowerCase() < token1.toLowerCase() 
        ? [token0, token1] 
        : [token1, token0];

      // Uniswap V3 style - check multiple fee tiers using factory.getPool()
      if (isV3StyleProtocol(dex.protocol)) {
        const factoryInterface = new ethers.utils.Interface([
          'function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)'
        ]);
        
        const factory = new ethers.Contract(dex.factory, factoryInterface, provider);
        
        for (const fee of UNISWAP_V3_FEE_TIERS) {
          try {
            const poolAddress = await factory.getPool(tokenA, tokenB, fee);
            
            if (poolAddress && poolAddress !== ethers.constants.AddressZero) {
              // Verify pool has liquidity
              const code = await provider.getCode(poolAddress);
              if (code !== '0x') {
                logger.debug(`Found V3 pool at ${poolAddress} with fee tier ${fee}`, 'DATAFETCH');
                return poolAddress;
              }
            }
          } catch (error) {
            // Continue to next fee tier if this one fails
            continue;
          }
        }
        
        return null;
      }

      // Uniswap V2 style pool address calculation
      if (dex.initCodeHash) {
        const salt = ethers.utils.keccak256(
          ethers.utils.solidityPack(['address', 'address'], [tokenA, tokenB])
        );
        
        const poolAddress = ethers.utils.getCreate2Address(
          dex.factory,
          salt,
          dex.initCodeHash
        );

        // Verify pool exists
        const code = await provider.getCode(poolAddress);
        if (code !== '0x') {
          return poolAddress;
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get reserves from pool contract
   */
  private async getReserves(
    poolAddress: string,
    provider: ethers.providers.Provider,
    protocol: string
  ): Promise<{ reserve0: bigint; reserve1: bigint } | null> {
    try {
      // Uniswap V3 style pools use slot0 and liquidity instead of reserves
      if (isV3StyleProtocol(protocol)) {
        const poolInterface = new ethers.utils.Interface([
          'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
          'function liquidity() external view returns (uint128)',
          'function token0() external view returns (address)',
          'function token1() external view returns (address)'
        ]);

        const contract = new ethers.Contract(poolAddress, poolInterface, provider);
        
        // Get liquidity and price
        const liquidity = await contract.liquidity();
        const slot0 = await contract.slot0();
        
        // For V3, we use liquidity (L) as a proxy for pool size
        // Note: This is a simplified approximation. In V3, L = sqrt(x * y) where x and y are token amounts
        // For accurate reserve calculation, we would need to:
        // 1. Use sqrtPriceX96 to determine the price ratio
        // 2. Calculate actual token amounts based on the current tick and liquidity
        // However, for pool filtering purposes, using L directly is sufficient as it correlates with pool size
        const liquidityBigInt = BigInt(liquidity.toString());
        
        // If there's no liquidity, return null
        if (liquidityBigInt === BigInt(0)) {
          return null;
        }
        
        // Use liquidity value for both reserves as a proxy
        // This allows threshold comparisons while acknowledging the limitation
        // TODO: Implement proper V3 reserve calculation using sqrtPriceX96 and tick data
        return {
          reserve0: liquidityBigInt,
          reserve1: liquidityBigInt
        };
      }

      // Standard Uniswap V2 getReserves function
      const poolInterface = new ethers.utils.Interface([
        'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)'
      ]);

      const contract = new ethers.Contract(poolAddress, poolInterface, provider);
      const reserves = await contract.getReserves();

      return {
        reserve0: BigInt(reserves.reserve0.toString()),
        reserve1: BigInt(reserves.reserve1.toString())
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get DEX fee (simplified)
   */
  private getDEXFee(dex: DEXConfig): number {
    // Standard fees for different DEXs
    const fees: Record<string, number> = {
      'Uniswap V3': 0.003,
      'Uniswap V2': 0.003,
      'SushiSwap': 0.003,
      'Curve': 0.0004,
      'Balancer': 0.001,
      '1inch': 0.003,
      'PancakeSwap V3': 0.0025,
      // Base-specific DEXes
      'Uniswap V3 on Base': 0.003,
      'Aerodrome on Base': 0.003,
      'BaseSwap': 0.003,
      'Uniswap V2 on Base': 0.003,
      'SushiSwap on Base': 0.003
    };

    return fees[dex.name] || 0.003;
  }

  /**
   * Clear the pool data cache
   */
  clearCache(): void {
    this.poolCache.clear();
    this.cacheTimestamps.clear();
  }

  /**
   * Get cached pool count
   */
  getCachedPoolCount(): number {
    return this.poolCache.size;
  }

  /**
   * Set data fetcher mode
   */
  setMode(mode: 'polling' | 'event-driven'): void {
    this.mode = mode;
    
    // In event-driven mode, use longer cache TTL since data is updated via events
    if (mode === 'event-driven') {
      this.cacheTTL = 300000; // 5 minutes
    } else {
      this.cacheTTL = 60000; // 1 minute
    }
  }

  /**
   * Get current mode
   */
  getMode(): 'polling' | 'event-driven' {
    return this.mode;
  }

  /**
   * Update pool data from real-time event
   * 
   * Used in event-driven mode to update cache with fresh data from WebSocket events
   */
  updatePoolDataFromEvent(
    poolAddress: string,
    dexName: string,
    token0: string,
    token1: string,
    reserve0: bigint,
    reserve1: bigint
  ): void {
    const cacheKey = `${dexName}-${poolAddress}`;
    
    const poolData: PoolData = {
      poolAddress,
      token0,
      token1,
      reserve0,
      reserve1
    };

    this.poolCache.set(cacheKey, poolData);
    this.cacheTimestamps.set(cacheKey, Date.now());
  }

  /**
   * Check if cached data is still valid
   * 
   * Note: This method performs a Map lookup on every cache validation.
   * For better performance in high-frequency scenarios, consider storing
   * the timestamp alongside the cached data in a single object.
   */
  private isCacheValid(cacheKey: string): boolean {
    const timestamp = this.cacheTimestamps.get(cacheKey);
    if (!timestamp) {
      return false;
    }

    return Date.now() - timestamp < this.cacheTTL;
  }
}
