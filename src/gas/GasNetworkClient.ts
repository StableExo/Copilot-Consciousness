/**
 * GasNetworkClient - Integration with gas.network infrastructure
 * 
 * Provides real-time, accurate gas price data from Gas Network's decentralized oracle system.
 * Supports 40+ blockchains with cross-chain composability.
 * 
 * Gas Network solves:
 * - Unpredictable gas fees
 * - Opacity in fee structures
 * - Cross-chain fragmentation
 * - Centralized API dependencies
 * 
 * Architecture:
 * - GasNet Chain: Dedicated blockchain for gas estimates (250ms block speed)
 * - Gas Agents: Offchain prediction models analyzing mempool data
 * - Gas Oracles: Smart contracts broadcasting verified price data
 * - Gas Bridge: Cross-chain data relay with EIP-712 signatures
 */

import axios, { AxiosInstance } from 'axios';

/**
 * Supported chains in Gas Network
 */
export type GasNetworkChain = 
  | 'ethereum' | 'arbitrum' | 'optimism' | 'base' | 'polygon' 
  | 'avalanche' | 'bsc' | 'fantom' | 'linea' | 'scroll'
  | 'zksync' | 'manta' | 'mode' | 'blast' | 'bitcoin' | 'solana';

/**
 * Gas price data from Gas Network
 */
export interface GasNetworkPrice {
  chainId: number | string;
  chainName: string;
  baseFee: bigint;
  priorityFee: bigint;
  maxFeePerGas: bigint;
  gasPrice: bigint;
  blockNumber: number;
  timestamp: number;
  confidence: number; // 0-1, prediction confidence
  source: 'gasnet' | 'agent' | 'oracle';
  signature?: string; // EIP-712 signature for verification
}

/**
 * Gas price prediction from Gas Network agents
 */
export interface GasPricePrediction {
  current: GasNetworkPrice;
  nextBlock: GasNetworkPrice;
  next5Blocks: GasNetworkPrice;
  next10Blocks: GasNetworkPrice;
  trend: 'rising' | 'falling' | 'stable';
  volatility: number; // 0-1, market volatility indicator
}

/**
 * Cross-chain gas comparison
 */
export interface CrossChainGasComparison {
  chains: Map<string, GasNetworkPrice>;
  cheapest: { chain: string; price: GasNetworkPrice };
  fastest: { chain: string; price: GasNetworkPrice };
  recommended: { chain: string; price: GasNetworkPrice; reason: string };
}

/**
 * Gas Network API response types
 */
interface GasNetworkAPIResponse {
  success: boolean;
  data?: {
    chainId: number | string;
    chainName: string;
    gasPrice: string;
    baseFee: string;
    priorityFee: string;
    maxFee: string;
    blockNumber: number;
    timestamp: number;
    confidence: number;
    source: string;
    signature?: string;
  };
  error?: string;
}

interface MultiChainGasResponse {
  success: boolean;
  data?: Array<{
    chainId: number | string;
    chainName: string;
    gasPrice: string;
    baseFee: string;
    priorityFee: string;
    maxFee: string;
    blockNumber: number;
    timestamp: number;
    confidence: number;
  }>;
  error?: string;
}

/**
 * Gas Network Client Configuration
 */
export interface GasNetworkConfig {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
  retries?: number;
  cacheTimeout?: number;
}

/**
 * Cache entry for gas prices
 */
interface CacheEntry {
  data: GasNetworkPrice;
  timestamp: number;
}

/**
 * Client statistics
 */
export interface GasNetworkStats {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  failedRequests: number;
  averageLatency: number;
}

/**
 * Gas Network Client
 * 
 * Integrates with gas.network's decentralized oracle infrastructure
 * to provide accurate, real-time gas prices across 40+ blockchains.
 */
export class GasNetworkClient {
  private readonly apiKey: string;
  private readonly baseURL: string;
  private readonly timeout: number;
  private readonly retries: number;
  private readonly cacheTimeout: number;
  private readonly client: AxiosInstance;
  
  // Cache for gas prices (prevents excessive API calls)
  private cache: Map<string, CacheEntry> = new Map();
  
  // Statistics
  private stats: GasNetworkStats = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    failedRequests: 0,
    averageLatency: 0,
  };

  // Chain ID mapping
  private static readonly CHAIN_IDS: Record<string, number | string> = {
    ethereum: 1,
    arbitrum: 42161,
    optimism: 10,
    base: 8453,
    polygon: 137,
    avalanche: 43114,
    bsc: 56,
    fantom: 250,
    linea: 59144,
    scroll: 534352,
    zksync: 324,
    manta: 169,
    mode: 34443,
    blast: 81457,
    bitcoin: 'bitcoin',
    solana: 'mainnet-beta',
  };

  constructor(config: GasNetworkConfig) {
    this.apiKey = config.apiKey;
    // Real Gas Network API is hosted by Blocknative
    this.baseURL = config.baseURL || 'https://api.blocknative.com';
    this.timeout = config.timeout || 5000;
    this.retries = config.retries || 3;
    this.cacheTimeout = config.cacheTimeout || 10000; // 10 seconds default

    // Create axios instance with default config
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Authorization': this.apiKey, // Blocknative uses direct API key, not Bearer
        'Content-Type': 'application/json',
        'User-Agent': 'TheWarden/5.1.0',
      },
    });

    // Add request interceptor for timing
    this.client.interceptors.request.use((config) => {
      config.metadata = { startTime: Date.now() };
      return config;
    });

    // Add response interceptor for stats
    this.client.interceptors.response.use(
      (response) => {
        const duration = Date.now() - (response.config.metadata?.startTime || 0);
        this.updateLatency(duration);
        return response;
      },
      (error) => {
        this.stats.failedRequests++;
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get current gas price for a specific chain
   * Uses real Blocknative/Gas Network API: GET /gasprices/blockprices?chainid={id}
   */
  async getGasPrice(chain: GasNetworkChain | number): Promise<GasNetworkPrice> {
    const chainId = typeof chain === 'number' ? chain : GasNetworkClient.CHAIN_IDS[chain];
    const cacheKey = `gas-${chainId}`;

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      this.stats.cacheHits++;
      return cached;
    }

    this.stats.cacheMisses++;
    this.stats.totalRequests++;

    try {
      // Real Gas Network API endpoint
      const response = await this.client.get('/gasprices/blockprices', {
        params: {
          chainid: chainId,
        },
      });

      if (!response.data || !response.data.blockPrices || !response.data.blockPrices[0]) {
        throw new Error('Invalid response format from Gas Network API');
      }

      // Parse Blocknative/Gas Network response format
      const blockPrice = response.data.blockPrices[0];
      const estimatedPrices = blockPrice.estimatedPrices || [];
      
      // Get the fast (99% confidence) price if available, else first estimate
      const fastPrice = estimatedPrices.find((p: any) => p.confidence === 99) || estimatedPrices[0];
      
      if (!fastPrice) {
        throw new Error('No gas price estimates in response');
      }

      // Convert from gwei to wei (Blocknative returns gwei)
      const maxPriorityFeePerGas = BigInt(Math.floor(fastPrice.maxPriorityFeePerGas * 1e9));
      const maxFeePerGas = BigInt(Math.floor(fastPrice.maxFeePerGas * 1e9));
      const baseFeePerGas = BigInt(Math.floor((blockPrice.baseFeePerGas || 0) * 1e9));
      
      const gasPrice: GasNetworkPrice = {
        chainId,
        chainName: response.data.network || `Chain ${chainId}`,
        baseFee: baseFeePerGas,
        priorityFee: maxPriorityFeePerGas,
        maxFeePerGas: maxFeePerGas,
        gasPrice: maxFeePerGas, // Use maxFeePerGas as gasPrice
        blockNumber: blockPrice.blockNumber || 0,
        timestamp: Date.now(),
        confidence: fastPrice.confidence / 100, // Convert 99 to 0.99
        source: 'gasnet',
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: gasPrice,
        timestamp: Date.now(),
      });

      return gasPrice;
    } catch (error) {
      // Retry logic with exponential backoff
      for (let i = 0; i < this.retries; i++) {
        await this.sleep(Math.pow(2, i) * 1000);
        try {
          const response = await this.client.get('/gasprices/blockprices', {
            params: { chainid: chainId },
          });
          
          if (response.data?.blockPrices?.[0]) {
            const blockPrice = response.data.blockPrices[0];
            const estimatedPrices = blockPrice.estimatedPrices || [];
            const fastPrice = estimatedPrices.find((p: any) => p.confidence === 99) || estimatedPrices[0];
            
            if (fastPrice) {
              const maxPriorityFeePerGas = BigInt(Math.floor(fastPrice.maxPriorityFeePerGas * 1e9));
              const maxFeePerGas = BigInt(Math.floor(fastPrice.maxFeePerGas * 1e9));
              const baseFeePerGas = BigInt(Math.floor((blockPrice.baseFeePerGas || 0) * 1e9));
              
              const gasPrice: GasNetworkPrice = {
                chainId,
                chainName: response.data.network || `Chain ${chainId}`,
                baseFee: baseFeePerGas,
                priorityFee: maxPriorityFeePerGas,
                maxFeePerGas: maxFeePerGas,
                gasPrice: maxFeePerGas,
                blockNumber: blockPrice.blockNumber || 0,
                timestamp: Date.now(),
                confidence: fastPrice.confidence / 100,
                source: 'gasnet',
              };
              
              this.cache.set(cacheKey, { data: gasPrice, timestamp: Date.now() });
              return gasPrice;
            }
          }
        } catch (_retryError) {
          if (i === this.retries - 1) throw error;
        }
      }
      throw error;
    }
  }

  /**
   * Get gas prices for multiple chains in parallel
   */
  async getMultiChainGasPrices(chains: (GasNetworkChain | number)[]): Promise<Map<string, GasNetworkPrice>> {
    const pricesMap = new Map<string, GasNetworkPrice>();

    // Batch request if API supports it, otherwise parallel requests
    try {
      const chainIds = chains.map(c => 
        typeof c === 'number' ? c : GasNetworkClient.CHAIN_IDS[c]
      );

      this.stats.totalRequests++;

      const response = await this.client.post<MultiChainGasResponse>('/v1/gas/batch', {
        chains: chainIds,
      });

      if (response.data.success && response.data.data) {
        for (const data of response.data.data) {
          const gasPrice: GasNetworkPrice = {
            chainId: data.chainId,
            chainName: data.chainName,
            baseFee: BigInt(data.baseFee),
            priorityFee: BigInt(data.priorityFee),
            maxFeePerGas: BigInt(data.maxFee),
            gasPrice: BigInt(data.gasPrice),
            blockNumber: data.blockNumber,
            timestamp: data.timestamp,
            confidence: data.confidence,
            source: 'gasnet',
          };
          
          const key = `${data.chainName}-${data.chainId}`;
          pricesMap.set(key, gasPrice);
          
          // Cache individual results
          this.cache.set(`gas-${data.chainId}`, {
            data: gasPrice,
            timestamp: Date.now(),
          });
        }
      }
    } catch (_error) {
      // Fallback to parallel individual requests
      const results = await Promise.allSettled(
        chains.map(async (chain) => {
          const price = await this.getGasPrice(chain);
          const chainName = typeof chain === 'string' ? chain : 
            Object.keys(GasNetworkClient.CHAIN_IDS).find(
              k => GasNetworkClient.CHAIN_IDS[k] === chain
            ) || String(chain);
          return [chainName, price] as [string, GasNetworkPrice];
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          pricesMap.set(result.value[0], result.value[1]);
        }
      }
    }

    return pricesMap;
  }

  /**
   * Get gas price prediction from Gas Network agents
   */
  async getGasPricePrediction(chain: GasNetworkChain | number): Promise<GasPricePrediction> {
    const chainId = typeof chain === 'number' ? chain : GasNetworkClient.CHAIN_IDS[chain];
    
    this.stats.totalRequests++;

    const response = await this.client.get<{
      success: boolean;
      data?: {
        current: any;
        nextBlock: any;
        next5Blocks: any;
        next10Blocks: any;
        trend: 'rising' | 'falling' | 'stable';
        volatility: number;
      };
    }>(`/v1/gas/${chainId}/prediction`);

    if (!response.data.success || !response.data.data) {
      throw new Error('Failed to fetch gas price prediction');
    }

    const data = response.data.data;
    
    return {
      current: this.parseGasPrice(data.current),
      nextBlock: this.parseGasPrice(data.nextBlock),
      next5Blocks: this.parseGasPrice(data.next5Blocks),
      next10Blocks: this.parseGasPrice(data.next10Blocks),
      trend: data.trend,
      volatility: data.volatility,
    };
  }

  /**
   * Compare gas prices across multiple chains
   */
  async compareChains(chains: (GasNetworkChain | number)[]): Promise<CrossChainGasComparison> {
    const prices = await this.getMultiChainGasPrices(chains);
    
    let cheapest: { chain: string; price: GasNetworkPrice } | undefined;
    let fastest: { chain: string; price: GasNetworkPrice } | undefined;

    for (const [chain, price] of prices.entries()) {
      // Find cheapest (lowest gas price)
      if (!cheapest || price.gasPrice < cheapest.price.gasPrice) {
        cheapest = { chain, price };
      }

      // Find fastest (highest confidence, lowest latency)
      if (!fastest || price.confidence > fastest.price.confidence) {
        fastest = { chain, price };
      }
    }

    // Determine recommended chain (balance of cost and speed)
    let recommended = cheapest;
    if (fastest && fastest.price.confidence > 0.9) {
      // If fastest has very high confidence, recommend it
      recommended = fastest;
    }

    return {
      chains: prices,
      cheapest: cheapest!,
      fastest: fastest!,
      recommended: {
        chain: recommended!.chain,
        price: recommended!.price,
        reason: recommended === fastest 
          ? 'High confidence and fast confirmation' 
          : 'Most cost-effective option',
      },
    };
  }

  /**
   * Verify EIP-712 signature from Gas Oracle
   */
  verifySignature(price: GasNetworkPrice): boolean {
    if (!price.signature) return false;
    
    // TODO: Implement EIP-712 signature verification
    // This would verify the signature against the Gas Network oracle address
    // using the structured data format from the Gas Bridge
    
    return true; // Placeholder
  }

  /**
   * Get client statistics
   */
  getStats(): GasNetworkStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      failedRequests: 0,
      averageLatency: 0,
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Helper: Get from cache with TTL check
   */
  private getFromCache(key: string): GasNetworkPrice | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Helper: Update average latency
   */
  private updateLatency(duration: number): void {
    const total = this.stats.averageLatency * this.stats.totalRequests + duration;
    this.stats.averageLatency = total / (this.stats.totalRequests + 1);
  }

  /**
   * Helper: Parse gas price from API response
   */
  private parseGasPrice(data: any): GasNetworkPrice {
    return {
      chainId: data.chainId,
      chainName: data.chainName,
      baseFee: BigInt(data.baseFee),
      priorityFee: BigInt(data.priorityFee),
      maxFeePerGas: BigInt(data.maxFee),
      gasPrice: BigInt(data.gasPrice),
      blockNumber: data.blockNumber,
      timestamp: data.timestamp,
      confidence: data.confidence,
      source: data.source || 'gasnet',
      signature: data.signature,
    };
  }

  /**
   * Helper: Sleep utility for retries
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Static: Get chain ID for chain name
   */
  static getChainId(chain: GasNetworkChain): number | string {
    return GasNetworkClient.CHAIN_IDS[chain];
  }

  /**
   * Static: Get chain name for chain ID
   */
  static getChainName(chainId: number | string): string | undefined {
    return Object.keys(GasNetworkClient.CHAIN_IDS).find(
      key => GasNetworkClient.CHAIN_IDS[key] === chainId
    );
  }
}

// Add metadata to axios config
declare module 'axios' {
  export interface AxiosRequestConfig {
    metadata?: {
      startTime: number;
    };
  }
}
