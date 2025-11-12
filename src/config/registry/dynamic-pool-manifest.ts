/**
 * Dynamic Pool Manager - Runtime Pool Configuration
 * 
 * Manages pool configurations that can be updated at runtime without
 * restarting the application. Supports loading, updating, and pruning pools.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import pino from 'pino';

const logger = pino({
  name: 'DynamicPoolManager',
  level: process.env.LOG_LEVEL || 'info'
});

export interface Pool {
  address: string;
  token0: string;
  token1: string;
  fee: number;
  protocol: string;
  chainId: number;
  tvl?: string;
  volume24h?: string;
  lastUpdated: number;
  enabled?: boolean;
}

export interface PoolManifest {
  version: string;
  chainId: number;
  lastUpdated: number;
  pools: Pool[];
}

/**
 * DynamicPoolManager handles runtime pool configuration
 */
export class DynamicPoolManager {
  private manifests: Map<number, PoolManifest>;
  private manifestDir: string;
  private autoSave: boolean;

  constructor(manifestDir?: string, autoSave: boolean = true) {
    this.manifests = new Map();
    this.manifestDir = manifestDir || path.join(__dirname, 'manifests');
    this.autoSave = autoSave;
  }

  /**
   * Load manifest for a specific chain
   */
  async loadManifest(chainId: number): Promise<PoolManifest> {
    const filePath = path.join(this.manifestDir, `${chainId}-pools.json`);
    
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const manifest: PoolManifest = JSON.parse(data);
      
      this.manifests.set(chainId, manifest);
      logger.info(`Loaded ${manifest.pools.length} pools for chain ${chainId}`);
      
      return manifest;
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
        // Create empty manifest if file doesn't exist
        const manifest: PoolManifest = {
          version: '1.0.0',
          chainId,
          lastUpdated: Date.now(),
          pools: []
        };
        
        this.manifests.set(chainId, manifest);
        logger.info(`Created empty manifest for chain ${chainId}`);
        
        return manifest;
      }
      throw error;
    }
  }

  /**
   * Get manifest for a chain (load if not cached)
   */
  async getManifest(chainId: number): Promise<PoolManifest> {
    if (!this.manifests.has(chainId)) {
      return this.loadManifest(chainId);
    }
    return this.manifests.get(chainId)!;
  }

  /**
   * Get all pools for a chain
   */
  async getPools(chainId: number): Promise<Pool[]> {
    const manifest = await this.getManifest(chainId);
    return manifest.pools.filter(p => p.enabled !== false);
  }

  /**
   * Get a specific pool
   */
  async getPool(chainId: number, poolAddress: string): Promise<Pool | undefined> {
    const manifest = await this.getManifest(chainId);
    return manifest.pools.find(p => p.address.toLowerCase() === poolAddress.toLowerCase());
  }

  /**
   * Add a new pool
   */
  async addPool(pool: Pool): Promise<void> {
    const manifest = await this.getManifest(pool.chainId);
    
    // Check if pool already exists
    const existingIndex = manifest.pools.findIndex(
      p => p.address.toLowerCase() === pool.address.toLowerCase()
    );
    
    if (existingIndex >= 0) {
      // Update existing pool
      manifest.pools[existingIndex] = { ...manifest.pools[existingIndex], ...pool };
      logger.info(`Updated pool ${pool.address} on chain ${pool.chainId}`);
    } else {
      // Add new pool
      manifest.pools.push(pool);
      logger.info(`Added pool ${pool.address} on chain ${pool.chainId}`);
    }
    
    manifest.lastUpdated = Date.now();
    
    if (this.autoSave) {
      await this.saveManifest(pool.chainId);
    }
  }

  /**
   * Update pool data
   */
  async updatePool(chainId: number, poolAddress: string, data: Partial<Pool>): Promise<void> {
    const manifest = await this.getManifest(chainId);
    
    const poolIndex = manifest.pools.findIndex(
      p => p.address.toLowerCase() === poolAddress.toLowerCase()
    );
    
    if (poolIndex < 0) {
      throw new Error(`Pool ${poolAddress} not found on chain ${chainId}`);
    }
    
    manifest.pools[poolIndex] = { ...manifest.pools[poolIndex], ...data, lastUpdated: Date.now() };
    manifest.lastUpdated = Date.now();
    
    logger.debug(`Updated pool ${poolAddress} on chain ${chainId}`);
    
    if (this.autoSave) {
      await this.saveManifest(chainId);
    }
  }

  /**
   * Remove a pool
   */
  async removePool(chainId: number, poolAddress: string): Promise<boolean> {
    const manifest = await this.getManifest(chainId);
    
    const initialLength = manifest.pools.length;
    manifest.pools = manifest.pools.filter(
      p => p.address.toLowerCase() !== poolAddress.toLowerCase()
    );
    
    if (manifest.pools.length < initialLength) {
      manifest.lastUpdated = Date.now();
      logger.info(`Removed pool ${poolAddress} from chain ${chainId}`);
      
      if (this.autoSave) {
        await this.saveManifest(chainId);
      }
      
      return true;
    }
    
    return false;
  }

  /**
   * Prune inactive pools (not updated in specified time)
   */
  async pruneInactivePools(chainId?: number, maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    const now = Date.now();
    let prunedCount = 0;
    
    const chainIds = chainId !== undefined ? [chainId] : Array.from(this.manifests.keys());
    
    for (const cId of chainIds) {
      const manifest = await this.getManifest(cId);
      const initialLength = manifest.pools.length;
      
      manifest.pools = manifest.pools.filter(pool => {
        const age = now - pool.lastUpdated;
        return age <= maxAge;
      });
      
      const pruned = initialLength - manifest.pools.length;
      if (pruned > 0) {
        prunedCount += pruned;
        manifest.lastUpdated = now;
        logger.info(`Pruned ${pruned} inactive pools from chain ${cId}`);
        
        if (this.autoSave) {
          await this.saveManifest(cId);
        }
      }
    }
    
    return prunedCount;
  }

  /**
   * Save manifest to disk
   */
  async saveManifest(chainId: number): Promise<void> {
    const manifest = this.manifests.get(chainId);
    if (!manifest) {
      throw new Error(`No manifest found for chain ${chainId}`);
    }
    
    const filePath = path.join(this.manifestDir, `${chainId}-pools.json`);
    
    // Ensure directory exists
    await fs.mkdir(this.manifestDir, { recursive: true });
    
    await fs.writeFile(filePath, JSON.stringify(manifest, null, 2), 'utf-8');
    logger.debug(`Saved manifest for chain ${chainId} to ${filePath}`);
  }

  /**
   * Save all manifests
   */
  async saveAll(): Promise<void> {
    const promises = Array.from(this.manifests.keys()).map(chainId => this.saveManifest(chainId));
    await Promise.all(promises);
    logger.info(`Saved ${promises.length} manifests`);
  }

  /**
   * Get pools by protocol
   */
  async getPoolsByProtocol(chainId: number, protocol: string): Promise<Pool[]> {
    const pools = await this.getPools(chainId);
    return pools.filter(p => p.protocol.toLowerCase() === protocol.toLowerCase());
  }

  /**
   * Get pools by token pair
   */
  async getPoolsByTokenPair(chainId: number, token0: string, token1: string): Promise<Pool[]> {
    const pools = await this.getPools(chainId);
    const t0 = token0.toLowerCase();
    const t1 = token1.toLowerCase();
    
    return pools.filter(p => {
      const p0 = p.token0.toLowerCase();
      const p1 = p.token1.toLowerCase();
      return (p0 === t0 && p1 === t1) || (p0 === t1 && p1 === t0);
    });
  }
}

// Export singleton instance
export const dynamicPoolManager = new DynamicPoolManager();
