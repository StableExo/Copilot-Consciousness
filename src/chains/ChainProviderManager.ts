/**
 * ChainProviderManager - Multi-chain RPC connection management
 *
 * Manages provider connections for all supported chains with health monitoring,
 * automatic failover, and connection pooling
 *
 * Migrated to viem as part of Phase 2.2 module migration
 * Now supports both viem PublicClient and legacy ethers JsonRpcProvider for backward compatibility
 */

import { type PublicClient } from 'viem';
import { Connection, ConnectionConfig } from '@solana/web3.js';
import { ChainConfig } from '../config/cross-chain.config';
import { createViemPublicClient, getChain, CHAIN_MAP } from '../utils/viem';

export interface ProviderHealth {
  chainId: number | string;
  isHealthy: boolean;
  latency: number;
  lastCheck: number;
  blockHeight?: number;
  errorCount: number;
}

export interface ChainProvider {
  chainId: number | string;
  provider: PublicClient | Connection;
  config: ChainConfig;
  health: ProviderHealth;
  type: 'EVM' | 'Solana';
  rpcUrl?: string; // Store RPC URL for reference
}

export class ChainProviderManager {
  private providers: Map<number | string, ChainProvider[]>;
  private healthCheckInterval: number;
  private healthCheckTimer?: NodeJS.Timeout;
  private maxRetries: number;

  constructor(
    chainConfigs: ChainConfig[],
    healthCheckInterval: number = 30000, // 30 seconds
    maxRetries: number = 3
  ) {
    this.providers = new Map();
    this.healthCheckInterval = healthCheckInterval;
    this.maxRetries = maxRetries;
    this.initializeProviders(chainConfigs);
  }

  /**
   * Initialize providers for all configured chains
   */
  private initializeProviders(chainConfigs: ChainConfig[]): void {
    for (const config of chainConfigs) {
      if (!config.enabled) continue;

      const chainProviders: ChainProvider[] = [];

      if (config.type === 'EVM') {
        // Initialize multiple viem clients for failover
        for (const rpcUrl of config.rpcUrls) {
          try {
            const chainId = typeof config.chainId === 'number' ? config.chainId : 1;
            const publicClient = createViemPublicClient(chainId, rpcUrl);

            chainProviders.push({
              chainId: config.chainId,
              provider: publicClient,
              config,
              type: 'EVM',
              rpcUrl,
              health: {
                chainId: config.chainId,
                isHealthy: true,
                latency: 0,
                lastCheck: Date.now(),
                errorCount: 0,
              },
            });
          } catch (error) {
            console.warn(`Failed to initialize EVM provider for ${config.name}: ${error}`);
          }
        }
      } else if (config.type === 'Solana') {
        // Initialize Solana connections
        for (const rpcUrl of config.rpcUrls) {
          try {
            const connectionConfig: ConnectionConfig = {
              commitment: 'confirmed',
              confirmTransactionInitialTimeout: 60000,
            };
            const connection = new Connection(rpcUrl, connectionConfig);

            chainProviders.push({
              chainId: config.chainId,
              provider: connection,
              config,
              type: 'Solana',
              health: {
                chainId: config.chainId,
                isHealthy: true,
                latency: 0,
                lastCheck: Date.now(),
                errorCount: 0,
              },
            });
          } catch (error) {
            console.warn(`Failed to initialize Solana connection for ${config.name}: ${error}`);
          }
        }
      }

      if (chainProviders.length > 0) {
        this.providers.set(config.chainId, chainProviders);
      }
    }
  }

  /**
   * Get a healthy viem public client for a specific chain
   */
  getProvider(chainId: number | string): PublicClient | null {
    const chainProviders = this.providers.get(chainId);
    if (!chainProviders || chainProviders.length === 0) {
      return null;
    }

    // Filter EVM providers only
    const evmProviders = chainProviders.filter((cp) => cp.type === 'EVM');
    if (evmProviders.length === 0) {
      return null;
    }

    // Find first healthy provider
    const healthyProvider = evmProviders.find((cp) => cp.health.isHealthy);
    if (healthyProvider) {
      return healthyProvider.provider as PublicClient;
    }

    // If no healthy provider, return first one and mark for health check
    console.warn(`No healthy provider for chain ${chainId}, using fallback`);
    return evmProviders[0].provider as PublicClient;
  }

  /**
   * Get a viem public client (alias for getProvider for clarity)
   */
  getPublicClient(chainId: number | string): PublicClient | null {
    return this.getProvider(chainId);
  }

  /**
   * Get Solana connection
   */
  getSolanaConnection(): Connection | null {
    const solanaProviders = this.providers.get('mainnet-beta');
    if (!solanaProviders || solanaProviders.length === 0) {
      return null;
    }

    // Find first healthy Solana provider
    const healthyProvider = solanaProviders.find(
      (cp) => cp.health.isHealthy && cp.type === 'Solana'
    );
    if (healthyProvider) {
      return healthyProvider.provider as Connection;
    }

    // Fallback to first provider
    const solanaProvider = solanaProviders.find((cp) => cp.type === 'Solana');
    if (solanaProvider) {
      return solanaProvider.provider as Connection;
    }

    return null;
  }

  /**
   * Check if a specific chain is healthy
   */
  isChainHealthy(chainId: number | string): boolean {
    const chainProviders = this.providers.get(chainId);
    if (!chainProviders || chainProviders.length === 0) {
      return false;
    }

    // Chain is healthy if at least one provider is healthy
    return chainProviders.some((cp) => cp.health.isHealthy);
  }

  /**
   * Get all active (enabled and healthy) chains
   */
  getAllActiveChains(): (number | string)[] {
    const activeChains: (number | string)[] = [];

    for (const [chainId, providers] of this.providers.entries()) {
      if (providers.some((cp) => cp.health.isHealthy)) {
        activeChains.push(chainId);
      }
    }

    return activeChains;
  }

  /**
   * Get health status for a specific chain
   */
  getChainHealth(chainId: number | string): ProviderHealth[] {
    const chainProviders = this.providers.get(chainId);
    if (!chainProviders) {
      return [];
    }

    return chainProviders.map((cp) => cp.health);
  }

  /**
   * Perform health check on a single provider
   */
  private async checkProviderHealth(chainProvider: ChainProvider): Promise<void> {
    const startTime = Date.now();

    try {
      if (chainProvider.type === 'EVM') {
        const publicClient = chainProvider.provider as PublicClient;
        const blockNumber = await Promise.race([
          publicClient.getBlockNumber(),
          new Promise<bigint>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)),
        ]);

        chainProvider.health.isHealthy = true;
        chainProvider.health.latency = Date.now() - startTime;
        chainProvider.health.blockHeight = Number(blockNumber);
        chainProvider.health.errorCount = 0;
      } else if (chainProvider.type === 'Solana') {
        const connection = chainProvider.provider as Connection;
        const slot = await Promise.race([
          connection.getSlot(),
          new Promise<number>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)),
        ]);

        chainProvider.health.isHealthy = true;
        chainProvider.health.latency = Date.now() - startTime;
        chainProvider.health.blockHeight = slot;
        chainProvider.health.errorCount = 0;
      }
    } catch (error) {
      chainProvider.health.errorCount++;

      // Mark as unhealthy after maxRetries consecutive failures
      if (chainProvider.health.errorCount >= this.maxRetries) {
        chainProvider.health.isHealthy = false;
      }

      chainProvider.health.latency = Date.now() - startTime;
      console.warn(`Health check failed for chain ${chainProvider.chainId}:`, error);
    }

    chainProvider.health.lastCheck = Date.now();
  }

  /**
   * Run health checks on all providers
   */
  async runHealthChecks(): Promise<void> {
    const healthCheckPromises: Promise<void>[] = [];

    for (const chainProviders of this.providers.values()) {
      for (const chainProvider of chainProviders) {
        healthCheckPromises.push(this.checkProviderHealth(chainProvider));
      }
    }

    await Promise.allSettled(healthCheckPromises);
  }

  /**
   * Start automatic health monitoring
   */
  startHealthMonitoring(): void {
    if (this.healthCheckTimer) {
      return; // Already running
    }

    // Run initial health check
    this.runHealthChecks().catch((err) => console.error('Initial health check failed:', err));

    // Schedule periodic health checks
    this.healthCheckTimer = setInterval(() => {
      this.runHealthChecks().catch((err) => console.error('Periodic health check failed:', err));
    }, this.healthCheckInterval);
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }

  /**
   * Get all providers for a chain (including unhealthy ones)
   */
  getAllProviders(chainId: number | string): ChainProvider[] {
    return this.providers.get(chainId) || [];
  }

  /**
   * Get chain configuration
   */
  getChainConfig(chainId: number | string): ChainConfig | null {
    const chainProviders = this.providers.get(chainId);
    if (!chainProviders || chainProviders.length === 0) {
      return null;
    }
    return chainProviders[0].config;
  }

  /**
   * Get summary of all chains
   */
  getChainsSummary(): {
    chainId: number | string;
    name: string;
    healthy: boolean;
    providers: number;
  }[] {
    const summary: {
      chainId: number | string;
      name: string;
      healthy: boolean;
      providers: number;
    }[] = [];

    for (const [chainId, providers] of this.providers.entries()) {
      const healthyCount = providers.filter((cp) => cp.health.isHealthy).length;
      summary.push({
        chainId,
        name: providers[0].config.name,
        healthy: healthyCount > 0,
        providers: providers.length,
      });
    }

    return summary;
  }

  /**
   * Cleanup and close all connections
   */
  async cleanup(): Promise<void> {
    this.stopHealthMonitoring();

    // Close all connections
    for (const chainProviders of this.providers.values()) {
      for (const _chainProvider of chainProviders) {
        // Cleanup logic if needed
      }
    }

    this.providers.clear();
  }
}

export default ChainProviderManager;
