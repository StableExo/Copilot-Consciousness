/**
 * PoolDataStore - Persistent storage for pool data
 * 
 * Manages caching and persistence of pool data to disk to avoid
 * repeated RPC calls for the same pools across restarts.
 */

import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger';
import { PoolEdge } from './types';

export interface PoolDataCache {
  version: string;
  chainId: number;
  timestamp: number;
  pools: PoolEdge[];
}

export interface PoolDataStoreConfig {
  cacheDir?: string;
  cacheDuration?: number; // milliseconds (default: 1 hour)
}

export class PoolDataStore {
  private config: Required<PoolDataStoreConfig>;
  private memoryCache: Map<number, PoolDataCache> = new Map();

  constructor(config: PoolDataStoreConfig = {}) {
    this.config = {
      cacheDir: config.cacheDir || path.join(process.cwd(), '.pool-cache'),
      cacheDuration: config.cacheDuration || 3600000, // 1 hour default
    };
  }

  /**
   * Get cache file path for a specific chain
   */
  private getCacheFilePath(chainId: number): string {
    return path.join(this.config.cacheDir, `pools-${chainId}.json`);
  }

  /**
   * Check if cache is still valid based on timestamp
   */
  private isCacheValid(cache: PoolDataCache): boolean {
    const age = Date.now() - cache.timestamp;
    return age < this.config.cacheDuration;
  }

  /**
   * Load pool data from disk cache
   */
  async loadFromDisk(chainId: number): Promise<PoolEdge[] | null> {
    try {
      // Check memory cache first
      const memCache = this.memoryCache.get(chainId);
      if (memCache && this.isCacheValid(memCache)) {
        logger.debug(`Using in-memory pool cache for chain ${chainId}`, 'POOL_STORE');
        return memCache.pools;
      }

      // Try to load from disk
      const filePath = this.getCacheFilePath(chainId);
      const fileData = await fs.readFile(filePath, 'utf-8');
      const cache: PoolDataCache = JSON.parse(fileData);

      // Validate cache structure
      if (!cache.version || !cache.chainId || !cache.timestamp || !Array.isArray(cache.pools)) {
        logger.warn(`Invalid cache structure for chain ${chainId}`, 'POOL_STORE');
        return null;
      }

      // Check if cache is still valid
      if (!this.isCacheValid(cache)) {
        logger.info(`Pool cache for chain ${chainId} is stale (age: ${Math.floor((Date.now() - cache.timestamp) / 60000)}m)`, 'POOL_STORE');
        return null;
      }

      // Reconstruct BigInt values from serialized data
      const pools = cache.pools.map(pool => ({
        ...pool,
        reserve0: typeof pool.reserve0 === 'string' ? BigInt(pool.reserve0) : pool.reserve0,
        reserve1: typeof pool.reserve1 === 'string' ? BigInt(pool.reserve1) : pool.reserve1,
      }));

      // Store in memory cache
      const reconstructedCache = { ...cache, pools };
      this.memoryCache.set(chainId, reconstructedCache);

      logger.info(`Loaded ${pools.length} pools from cache for chain ${chainId} (age: ${Math.floor((Date.now() - cache.timestamp) / 60000)}m)`, 'POOL_STORE');
      return pools;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        logger.debug(`No pool cache found for chain ${chainId}`, 'POOL_STORE');
      } else {
        logger.warn(`Failed to load pool cache for chain ${chainId}: ${error instanceof Error ? error.message : String(error)}`, 'POOL_STORE');
      }
      return null;
    }
  }

  /**
   * Save pool data to disk cache
   */
  async saveToDisk(chainId: number, pools: PoolEdge[]): Promise<void> {
    try {
      // Ensure cache directory exists
      await fs.mkdir(this.config.cacheDir, { recursive: true });

      // Serialize pool data (convert BigInt to string for JSON)
      const serializedPools = pools.map(pool => ({
        ...pool,
        reserve0: pool.reserve0.toString(),
        reserve1: pool.reserve1.toString(),
      }));

      const cache: PoolDataCache = {
        version: '1.0.0',
        chainId,
        timestamp: Date.now(),
        pools: serializedPools as any, // Type assertion needed due to BigInt serialization
      };

      // Save to memory cache with original BigInt values
      this.memoryCache.set(chainId, {
        version: cache.version,
        chainId,
        timestamp: cache.timestamp,
        pools,
      });

      // Save to disk
      const filePath = this.getCacheFilePath(chainId);
      await fs.writeFile(filePath, JSON.stringify(cache, null, 2), 'utf-8');

      logger.info(`Saved ${pools.length} pools to cache for chain ${chainId}`, 'POOL_STORE');
    } catch (error) {
      logger.error(`Failed to save pool cache for chain ${chainId}: ${error instanceof Error ? error.message : String(error)}`, 'POOL_STORE');
      throw error;
    }
  }

  /**
   * Clear cache for a specific chain
   */
  async clearCache(chainId: number): Promise<void> {
    try {
      // Remove from memory
      this.memoryCache.delete(chainId);

      // Remove from disk
      const filePath = this.getCacheFilePath(chainId);
      await fs.unlink(filePath);

      logger.info(`Cleared pool cache for chain ${chainId}`, 'POOL_STORE');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        logger.warn(`Failed to clear pool cache for chain ${chainId}: ${error instanceof Error ? error.message : String(error)}`, 'POOL_STORE');
      }
    }
  }

  /**
   * Clear all caches
   */
  async clearAllCaches(): Promise<void> {
    try {
      // Clear memory cache
      this.memoryCache.clear();

      // Clear disk cache directory
      const files = await fs.readdir(this.config.cacheDir);
      for (const file of files) {
        if (file.startsWith('pools-') && file.endsWith('.json')) {
          await fs.unlink(path.join(this.config.cacheDir, file));
        }
      }

      logger.info('Cleared all pool caches', 'POOL_STORE');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        logger.warn(`Failed to clear all caches: ${error instanceof Error ? error.message : String(error)}`, 'POOL_STORE');
      }
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    chainId: number;
    poolCount: number;
    ageMinutes: number;
    isValid: boolean;
  }[]> {
    const stats: {
      chainId: number;
      poolCount: number;
      ageMinutes: number;
      isValid: boolean;
    }[] = [];

    try {
      const files = await fs.readdir(this.config.cacheDir);
      
      for (const file of files) {
        if (file.startsWith('pools-') && file.endsWith('.json')) {
          const filePath = path.join(this.config.cacheDir, file);
          const fileData = await fs.readFile(filePath, 'utf-8');
          const cache: PoolDataCache = JSON.parse(fileData);

          const ageMinutes = Math.floor((Date.now() - cache.timestamp) / 60000);
          const isValid = this.isCacheValid(cache);

          stats.push({
            chainId: cache.chainId,
            poolCount: cache.pools.length,
            ageMinutes,
            isValid,
          });
        }
      }
    } catch (error) {
      logger.warn(`Failed to get cache stats: ${error instanceof Error ? error.message : String(error)}`, 'POOL_STORE');
    }

    return stats;
  }
}
