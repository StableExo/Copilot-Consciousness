/**
 * PathCache - LRU cache for profitable arbitrage paths
 * 
 * Stores frequently profitable path templates and provides
 * incremental updates when pool reserves change
 */

import { ArbitragePath } from './types';

/**
 * Cached path entry
 */
interface CachedPath {
  path: ArbitragePath;
  template: string; // Token sequence hash
  lastProfitable: number; // Timestamp
  profitabilityScore: number; // Historical success rate
  hitCount: number;
  lastAccessed: number; // For LRU eviction
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  enabled: boolean;
  maxEntries: number;
  ttl: number; // Time to live in seconds
  minProfitabilityScore: number; // Minimum score to keep in cache
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  evictions: number;
  invalidations: number;
}

/**
 * Path template for pattern matching
 */
interface PathTemplate {
  tokens: string[]; // Sequence of token addresses
  poolCount: number;
  hash: string;
}

export class PathCache {
  private config: CacheConfig;
  private cache: Map<string, CachedPath>;
  private templateIndex: Map<string, Set<string>>; // template hash -> path hashes
  private stats: CacheStats;
  private poolToPaths: Map<string, Set<string>>; // pool address -> path hashes

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      enabled: config.enabled !== false,
      maxEntries: config.maxEntries || 1000,
      ttl: config.ttl || 300, // 5 minutes default
      minProfitabilityScore: config.minProfitabilityScore || 0.3
    };
    this.cache = new Map();
    this.templateIndex = new Map();
    this.poolToPaths = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      size: 0,
      evictions: 0,
      invalidations: 0
    };
  }

  /**
   * Add or update a path in the cache
   */
  set(path: ArbitragePath, profitable: boolean): void {
    if (!this.config.enabled) {
      return;
    }

    const pathHash = this.hashPath(path);
    const template = this.extractTemplate(path);
    const now = Date.now();

    // Check if path exists
    const existing = this.cache.get(pathHash);

    if (existing) {
      // Update existing entry
      existing.path = path;
      existing.lastAccessed = now;
      existing.hitCount++;
      
      if (profitable) {
        existing.lastProfitable = now;
        existing.profitabilityScore = Math.min(
          existing.profitabilityScore + 0.1,
          1.0
        );
      } else {
        existing.profitabilityScore = Math.max(
          existing.profitabilityScore - 0.05,
          0
        );
      }
    } else {
      // Add new entry
      const entry: CachedPath = {
        path,
        template: template.hash,
        lastProfitable: profitable ? now : 0,
        profitabilityScore: profitable ? 0.5 : 0.3,
        hitCount: 1,
        lastAccessed: now
      };

      // Check if we need to evict
      if (this.cache.size >= this.config.maxEntries) {
        this.evictLRU();
      }

      this.cache.set(pathHash, entry);
      
      // Update template index
      if (!this.templateIndex.has(template.hash)) {
        this.templateIndex.set(template.hash, new Set());
      }
      this.templateIndex.get(template.hash)!.add(pathHash);

      // Update pool index
      for (const hop of path.hops) {
        if (!this.poolToPaths.has(hop.poolAddress)) {
          this.poolToPaths.set(hop.poolAddress, new Set());
        }
        this.poolToPaths.get(hop.poolAddress)!.add(pathHash);
      }
    }

    this.updateStats();
  }

  /**
   * Get a path from cache
   */
  get(pathHash: string): ArbitragePath | null {
    if (!this.config.enabled) {
      this.stats.misses++;
      return null;
    }

    const entry = this.cache.get(pathHash);
    
    if (!entry) {
      this.stats.misses++;
      this.updateStats();
      return null;
    }

    // Check if expired
    const now = Date.now();
    const age = (now - entry.lastProfitable) / 1000;
    
    if (age > this.config.ttl) {
      this.cache.delete(pathHash);
      this.stats.invalidations++;
      this.stats.misses++;
      this.updateStats();
      return null;
    }

    // Check profitability score
    if (entry.profitabilityScore < this.config.minProfitabilityScore) {
      this.stats.misses++;
      this.updateStats();
      return null;
    }

    // Update access time
    entry.lastAccessed = now;
    entry.hitCount++;

    this.stats.hits++;
    this.updateStats();
    
    return entry.path;
  }

  /**
   * Find paths by template (token sequence)
   */
  findByTemplate(tokens: string[]): ArbitragePath[] {
    if (!this.config.enabled) {
      return [];
    }

    const templateHash = this.hashTokenSequence(tokens);
    const pathHashes = this.templateIndex.get(templateHash);
    
    if (!pathHashes) {
      return [];
    }

    const paths: ArbitragePath[] = [];
    for (const pathHash of pathHashes) {
      const path = this.get(pathHash);
      if (path) {
        paths.push(path);
      }
    }

    return paths;
  }

  /**
   * Get paths affected by pool update
   */
  getPathsByPool(poolAddress: string): ArbitragePath[] {
    if (!this.config.enabled) {
      return [];
    }

    const pathHashes = this.poolToPaths.get(poolAddress);
    
    if (!pathHashes) {
      return [];
    }

    const paths: ArbitragePath[] = [];
    for (const pathHash of pathHashes) {
      const entry = this.cache.get(pathHash);
      if (entry) {
        paths.push(entry.path);
      }
    }

    return paths;
  }

  /**
   * Invalidate paths involving a specific pool
   */
  invalidatePool(poolAddress: string): number {
    if (!this.config.enabled) {
      return 0;
    }

    const pathHashes = this.poolToPaths.get(poolAddress);
    
    if (!pathHashes) {
      return 0;
    }

    let invalidated = 0;
    for (const pathHash of pathHashes) {
      if (this.cache.delete(pathHash)) {
        invalidated++;
        this.stats.invalidations++;
      }
    }

    this.poolToPaths.delete(poolAddress);
    this.updateStats();
    
    return invalidated;
  }

  /**
   * Warm cache with historical profitable paths
   */
  warmCache(paths: ArbitragePath[]): void {
    for (const path of paths) {
      this.set(path, true);
    }
  }

  /**
   * Get most profitable cached paths
   */
  getTopPaths(limit: number = 10): ArbitragePath[] {
    const entries = Array.from(this.cache.values())
      .sort((a, b) => {
        // Sort by profitability score and net profit
        const scoreA = a.profitabilityScore * Number(a.path.netProfit);
        const scoreB = b.profitabilityScore * Number(b.path.netProfit);
        return scoreB - scoreA;
      })
      .slice(0, limit);

    return entries.map(e => e.path);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.templateIndex.clear();
    this.poolToPaths.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      size: 0,
      evictions: 0,
      invalidations: 0
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
    
    // If cache was disabled, clear it
    if (!this.config.enabled) {
      this.clear();
    }
  }

  // Private helper methods

  /**
   * Hash a path for cache key
   */
  private hashPath(path: ArbitragePath): string {
    return path.hops
      .map(hop => `${hop.poolAddress}:${hop.tokenIn}:${hop.tokenOut}`)
      .join('|');
  }

  /**
   * Extract template from path (token sequence)
   */
  private extractTemplate(path: ArbitragePath): PathTemplate {
    const tokens = path.hops.map(hop => hop.tokenIn);
    tokens.push(path.hops[path.hops.length - 1].tokenOut);
    
    return {
      tokens,
      poolCount: path.hops.length,
      hash: this.hashTokenSequence(tokens)
    };
  }

  /**
   * Hash token sequence for template matching
   */
  private hashTokenSequence(tokens: string[]): string {
    return tokens.join('->');
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestEntry: { hash: string; time: number } | null = null;
    
    for (const [hash, entry] of this.cache.entries()) {
      if (!oldestEntry || entry.lastAccessed < oldestEntry.time) {
        oldestEntry = { hash, time: entry.lastAccessed };
      }
    }

    if (oldestEntry) {
      const entry = this.cache.get(oldestEntry.hash);
      
      // Remove from template index
      if (entry) {
        const templatePaths = this.templateIndex.get(entry.template);
        if (templatePaths) {
          templatePaths.delete(oldestEntry.hash);
          if (templatePaths.size === 0) {
            this.templateIndex.delete(entry.template);
          }
        }

        // Remove from pool index
        for (const hop of entry.path.hops) {
          const poolPaths = this.poolToPaths.get(hop.poolAddress);
          if (poolPaths) {
            poolPaths.delete(oldestEntry.hash);
            if (poolPaths.size === 0) {
              this.poolToPaths.delete(hop.poolAddress);
            }
          }
        }
      }

      this.cache.delete(oldestEntry.hash);
      this.stats.evictions++;
    }
  }

  /**
   * Update cache statistics
   */
  private updateStats(): void {
    this.stats.size = this.cache.size;
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }
}
