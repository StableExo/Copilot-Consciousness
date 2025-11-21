/**
 * Alchemy SDK Client Wrapper
 * 
 * Provides a centralized interface to Alchemy's Enhanced APIs
 * for token data, transfers, prices, and blockchain analytics.
 */

import { Alchemy, Network, AlchemySettings } from 'alchemy-sdk';
import dotenv from 'dotenv';

dotenv.config();

export interface AlchemyConfig {
  apiKey: string;
  network: Network;
  maxRetries?: number;
  connectionInfoOverrides?: {
    skipFetchSetup?: boolean;
  };
}

/**
 * Centralized Alchemy SDK client for the consciousness system
 */
export class AlchemyClient {
  private alchemy: Alchemy;
  private config: AlchemyConfig;

  constructor(config?: Partial<AlchemyConfig>) {
    this.config = {
      apiKey: config?.apiKey || process.env.ALCHEMY_API_KEY || '',
      network: config?.network || this.getNetworkFromEnv(),
      maxRetries: config?.maxRetries || 3,
      ...config,
    };

    if (!this.config.apiKey) {
      console.warn('Warning: ALCHEMY_API_KEY not set. Alchemy features will be limited.');
    }

    const settings: AlchemySettings = {
      apiKey: this.config.apiKey,
      network: this.config.network,
      maxRetries: this.config.maxRetries,
    };

    this.alchemy = new Alchemy(settings);
  }

  /**
   * Get the Alchemy network from environment
   */
  private getNetworkFromEnv(): Network {
    const networkName = process.env.NETWORK || 'arbitrum';
    
    const networkMap: Record<string, Network> = {
      'mainnet': Network.ETH_MAINNET,
      'ethereum': Network.ETH_MAINNET,
      'goerli': Network.ETH_GOERLI,
      'sepolia': Network.ETH_SEPOLIA,
      'arbitrum': Network.ARB_MAINNET,
      'arbitrum-goerli': Network.ARB_GOERLI,
      'arbitrum-sepolia': Network.ARB_SEPOLIA,
      'optimism': Network.OPT_MAINNET,
      'optimism-goerli': Network.OPT_GOERLI,
      'optimism-sepolia': Network.OPT_SEPOLIA,
      'polygon': Network.MATIC_MAINNET,
      'polygon-mumbai': Network.MATIC_MUMBAI,
      'polygon-amoy': Network.MATIC_AMOY,
      'base': Network.BASE_MAINNET,
      'base-goerli': Network.BASE_GOERLI,
      'base-sepolia': Network.BASE_SEPOLIA,
    };

    return networkMap[networkName.toLowerCase()] || Network.ARB_MAINNET;
  }

  /**
   * Get the underlying Alchemy instance
   */
  getAlchemy(): Alchemy {
    return this.alchemy;
  }

  /**
   * Get current network
   */
  getNetwork(): Network {
    return this.config.network;
  }

  /**
   * Check if client is properly configured
   */
  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  /**
   * Get Core API
   */
  get core() {
    return this.alchemy.core;
  }

  /**
   * Get NFT API
   */
  get nft() {
    return this.alchemy.nft;
  }

  /**
   * Get WebSocket provider
   */
  get ws() {
    return this.alchemy.ws;
  }

  /**
   * Get Transaction Receipts API
   */
  get transact() {
    return this.alchemy.transact;
  }

  /**
   * Get Debug API
   */
  get debug() {
    return this.alchemy.debug;
  }
}

// Singleton instance
let alchemyClientInstance: AlchemyClient | null = null;

/**
 * Get or create the Alchemy client singleton
 */
export function getAlchemyClient(config?: Partial<AlchemyConfig>): AlchemyClient {
  if (!alchemyClientInstance) {
    alchemyClientInstance = new AlchemyClient(config);
  }
  return alchemyClientInstance;
}

/**
 * Reset the Alchemy client singleton (useful for testing)
 */
export function resetAlchemyClient(): void {
  alchemyClientInstance = null;
}
