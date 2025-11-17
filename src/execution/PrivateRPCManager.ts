/**
 * Private RPC Manager
 * 
 * Manages private transaction submission through various MEV-friendly relays:
 * - Flashbots Protect RPC (https://docs.flashbots.net/flashbots-protect/overview)
 * - MEV-Share (https://docs.flashbots.net/flashbots-mev-share/overview)
 * - Builder-specific endpoints
 * 
 * Key Features:
 * - Multi-relay support with automatic fallback
 * - Bundle construction and submission
 * - Privacy level configuration
 * - Statistics tracking per relay
 * - Health monitoring
 */

import { ethers, providers, Wallet } from 'ethers';
import { logger } from '../utils/logger';
import {
  PrivateRelayType,
  PrivacyLevel,
  PrivateRelayConfig,
  PrivateRPCManagerConfig,
  PrivateTransactionOptions,
  PrivateTransactionResult,
  FlashbotsBundle,
  MEVShareOptions,
  RelayStats,
} from './types/PrivateRPCTypes';

/**
 * Default Flashbots endpoints
 */
const FLASHBOTS_ENDPOINTS = {
  MAINNET: 'https://rpc.flashbots.net',
  GOERLI: 'https://rpc-goerli.flashbots.net',
  SEPOLIA: 'https://rpc-sepolia.flashbots.net',
};

/**
 * Default MEV-Share endpoint
 */
const MEV_SHARE_ENDPOINT = 'https://relay.flashbots.net';

/**
 * PrivateRPCManager - Manages private transaction submission
 */
export class PrivateRPCManager {
  private relays: Map<PrivateRelayType, PrivateRelayConfig>;
  private provider: providers.JsonRpcProvider;
  private signer: Wallet;
  private config: PrivateRPCManagerConfig;
  private stats: Map<PrivateRelayType, RelayStats>;

  constructor(
    provider: providers.JsonRpcProvider,
    signer: Wallet,
    config: Partial<PrivateRPCManagerConfig> = {}
  ) {
    this.provider = provider;
    this.signer = signer;
    
    // Initialize default configuration
    this.config = {
      relays: config.relays || [],
      defaultPrivacyLevel: config.defaultPrivacyLevel || PrivacyLevel.BASIC,
      enableFallback: config.enableFallback ?? true,
      privateSubmissionTimeout: config.privateSubmissionTimeout || 30000,
      verboseLogging: config.verboseLogging ?? false,
    };

    this.relays = new Map();
    this.stats = new Map();

    // Initialize relays from config
    this.config.relays.forEach(relay => {
      if (relay.enabled) {
        this.relays.set(relay.type, relay);
        this.initializeStats(relay.type);
      }
    });

    logger.info(`[PrivateRPCManager] Initialized with ${this.relays.size} relay(s)`);
  }

  /**
   * Add a relay configuration
   */
  addRelay(relay: PrivateRelayConfig): void {
    this.relays.set(relay.type, relay);
    this.initializeStats(relay.type);
    logger.info(`[PrivateRPCManager] Added relay: ${relay.type} (${relay.name || 'unnamed'})`);
  }

  /**
   * Remove a relay
   */
  removeRelay(type: PrivateRelayType): void {
    this.relays.delete(type);
    this.stats.delete(type);
    logger.info(`[PrivateRPCManager] Removed relay: ${type}`);
  }

  /**
   * Initialize statistics for a relay
   */
  private initializeStats(type: PrivateRelayType): void {
    this.stats.set(type, {
      type,
      totalSubmissions: 0,
      successfulInclusions: 0,
      failedSubmissions: 0,
      avgInclusionTime: 0,
      isAvailable: true,
    });
  }

  /**
   * Submit a transaction privately
   */
  async submitPrivateTransaction(
    transaction: providers.TransactionRequest,
    options: PrivateTransactionOptions = {}
  ): Promise<PrivateTransactionResult> {
    const startTime = Date.now();
    const privacyLevel = options.privacyLevel || this.config.defaultPrivacyLevel;

    logger.info(
      `[PrivateRPCManager] Submitting private transaction with privacy level: ${privacyLevel}`
    );

    // Determine which relays to try based on privacy level
    const relaysToTry = this.selectRelays(privacyLevel, options.preferredRelay);

    if (relaysToTry.length === 0) {
      logger.warn('[PrivateRPCManager] No relays available');
      
      if (options.allowPublicFallback) {
        return this.submitToPublicMempool(transaction);
      }

      return {
        success: false,
        error: 'No private relays available and public fallback disabled',
      };
    }

    let lastError: string | undefined;
    let relaysTried = 0;

    // Try each relay in order of priority
    for (const relay of relaysToTry) {
      relaysTried++;
      
      try {
        const result = await this.submitToRelay(
          relay,
          transaction,
          options,
          startTime
        );

        if (result.success) {
          result.metadata = {
            ...result.metadata,
            relaysTried,
            inclusionTime: Date.now() - startTime,
          };
          return result;
        }

        lastError = result.error;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        logger.warn(
          `[PrivateRPCManager] Failed to submit via ${relay.type}: ${lastError}`
        );
      }

      // Don't try other relays if fast mode is disabled
      if (!options.fastMode) {
        break;
      }
    }

    // All relays failed, try public mempool if allowed
    if (options.allowPublicFallback) {
      logger.info('[PrivateRPCManager] Falling back to public mempool');
      return this.submitToPublicMempool(transaction);
    }

    return {
      success: false,
      error: `All private relays failed. Last error: ${lastError}`,
      metadata: {
        relaysTried,
      },
    };
  }

  /**
   * Select relays to try based on privacy level and preferences
   */
  private selectRelays(
    privacyLevel: PrivacyLevel,
    preferredRelay?: PrivateRelayType
  ): PrivateRelayConfig[] {
    const availableRelays = Array.from(this.relays.values())
      .filter(r => r.enabled)
      .sort((a, b) => b.priority - a.priority);

    // If a specific relay is preferred, try it first
    if (preferredRelay) {
      const preferred = availableRelays.find(r => r.type === preferredRelay);
      if (preferred) {
        return [
          preferred,
          ...availableRelays.filter(r => r.type !== preferredRelay),
        ];
      }
    }

    // Filter based on privacy level
    switch (privacyLevel) {
      case PrivacyLevel.MAXIMUM:
        // Use builder RPCs only
        return availableRelays.filter(r => r.type === PrivateRelayType.BUILDER_RPC);
      
      case PrivacyLevel.ENHANCED:
        // Prefer MEV-Share
        return availableRelays.filter(
          r => r.type === PrivateRelayType.MEV_SHARE || 
               r.type === PrivateRelayType.BUILDER_RPC
        );
      
      case PrivacyLevel.BASIC:
        // Use Flashbots Protect
        return availableRelays.filter(
          r => r.type === PrivateRelayType.FLASHBOTS_PROTECT
        );
      
      case PrivacyLevel.NONE:
      default:
        return [];
    }
  }

  /**
   * Submit transaction to a specific relay
   */
  private async submitToRelay(
    relay: PrivateRelayConfig,
    transaction: providers.TransactionRequest,
    options: PrivateTransactionOptions,
    startTime: number
  ): Promise<PrivateTransactionResult> {
    const stats = this.stats.get(relay.type);
    if (stats) {
      stats.totalSubmissions++;
      stats.lastSubmission = new Date();
    }

    logger.info(`[PrivateRPCManager] Submitting to ${relay.type}`);

    try {
      let result: PrivateTransactionResult;

      switch (relay.type) {
        case PrivateRelayType.FLASHBOTS_PROTECT:
          result = await this.submitToFlashbotsProtect(relay, transaction, options);
          break;
        
        case PrivateRelayType.MEV_SHARE:
          result = await this.submitToMEVShare(relay, transaction, options);
          break;
        
        case PrivateRelayType.BUILDER_RPC:
          result = await this.submitToBuilderRPC(relay, transaction);
          break;
        
        default:
          throw new Error(`Unsupported relay type: ${relay.type}`);
      }

      if (result.success && stats) {
        stats.successfulInclusions++;
        const inclusionTime = Date.now() - startTime;
        stats.avgInclusionTime = 
          (stats.avgInclusionTime * (stats.successfulInclusions - 1) + inclusionTime) / 
          stats.successfulInclusions;
      } else if (stats) {
        stats.failedSubmissions++;
      }

      return result;
    } catch (error) {
      if (stats) {
        stats.failedSubmissions++;
      }
      throw error;
    }
  }

  /**
   * Submit to Flashbots Protect RPC
   */
  private async submitToFlashbotsProtect(
    relay: PrivateRelayConfig,
    transaction: providers.TransactionRequest,
    options: PrivateTransactionOptions
  ): Promise<PrivateTransactionResult> {
    try {
      // Create a provider connected to Flashbots RPC
      const flashbotsProvider = new ethers.providers.JsonRpcProvider(relay.endpoint);
      
      // Sign the transaction
      const signedTx = await this.signer.signTransaction(transaction);
      
      // Submit directly to Flashbots Protect RPC
      // Flashbots Protect automatically creates a bundle
      const response = await flashbotsProvider.sendTransaction(signedTx);

      logger.info(
        `[PrivateRPCManager] Transaction submitted to Flashbots Protect: ${response.hash}`
      );

      // Wait for confirmation if requested
      if (options.maxBlockWait && options.maxBlockWait > 0) {
        const receipt = await response.wait(1);
        return {
          success: true,
          txHash: response.hash,
          relayUsed: PrivateRelayType.FLASHBOTS_PROTECT,
          blockNumber: receipt.blockNumber,
          metadata: {
            publicMempoolVisible: false,
          },
        };
      }

      return {
        success: true,
        txHash: response.hash,
        relayUsed: PrivateRelayType.FLASHBOTS_PROTECT,
        metadata: {
          publicMempoolVisible: false,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[PrivateRPCManager] Flashbots Protect submission failed: ${message}`);
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Submit to MEV-Share
   */
  private async submitToMEVShare(
    relay: PrivateRelayConfig,
    transaction: providers.TransactionRequest,
    options: PrivateTransactionOptions
  ): Promise<PrivateTransactionResult> {
    try {
      const signedTx = await this.signer.signTransaction(transaction);
      
      // Prepare MEV-Share bundle
      const currentBlock = await this.provider.getBlockNumber();
      const targetBlock = currentBlock + 1;

      const mevSharePayload = {
        jsonrpc: '2.0',
        id: 1,
        method: 'mev_sendBundle',
        params: [
          {
            version: 'v0.1',
            inclusion: {
              block: targetBlock,
              maxBlock: options.maxBlockWait 
                ? targetBlock + options.maxBlockWait 
                : targetBlock + 5,
            },
            body: [
              {
                tx: signedTx,
                canRevert: false,
              },
            ],
            privacy: {
              hints: options.mevShareOptions?.hints || {},
              builders: options.mevShareOptions?.builders || [],
            },
          },
        ],
      };

      // Submit to MEV-Share endpoint using ethers provider
      const mevShareProvider = new ethers.providers.JsonRpcProvider(relay.endpoint);
      const data = await mevShareProvider.send('mev_sendBundle', mevSharePayload.params);

      logger.info(`[PrivateRPCManager] Transaction submitted to MEV-Share`);

      return {
        success: true,
        bundleHash: data?.bundleHash,
        relayUsed: PrivateRelayType.MEV_SHARE,
        metadata: {
          publicMempoolVisible: false,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[PrivateRPCManager] MEV-Share submission failed: ${message}`);
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Submit to builder-specific RPC
   */
  private async submitToBuilderRPC(
    relay: PrivateRelayConfig,
    transaction: providers.TransactionRequest
  ): Promise<PrivateTransactionResult> {
    try {
      const builderProvider = new ethers.providers.JsonRpcProvider(relay.endpoint);
      const signedTx = await this.signer.signTransaction(transaction);
      const response = await builderProvider.sendTransaction(signedTx);

      logger.info(
        `[PrivateRPCManager] Transaction submitted to builder RPC: ${response.hash}`
      );

      return {
        success: true,
        txHash: response.hash,
        relayUsed: PrivateRelayType.BUILDER_RPC,
        metadata: {
          publicMempoolVisible: false,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[PrivateRPCManager] Builder RPC submission failed: ${message}`);
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Fallback to public mempool
   */
  private async submitToPublicMempool(
    transaction: providers.TransactionRequest
  ): Promise<PrivateTransactionResult> {
    try {
      const signedTx = await this.signer.signTransaction(transaction);
      const response = await this.provider.sendTransaction(signedTx);

      logger.warn(
        `[PrivateRPCManager] Transaction submitted to public mempool: ${response.hash}`
      );

      return {
        success: true,
        txHash: response.hash,
        relayUsed: PrivateRelayType.PUBLIC_RPC,
        metadata: {
          publicMempoolVisible: true,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[PrivateRPCManager] Public mempool submission failed: ${message}`);
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Create a Flashbots bundle with multiple transactions
   */
  async createFlashbotsBundle(
    transactions: providers.TransactionRequest[],
    targetBlockNumber: number
  ): Promise<FlashbotsBundle> {
    const signedTransactions: string[] = [];

    for (const tx of transactions) {
      const signedTx = await this.signer.signTransaction(tx);
      signedTransactions.push(signedTx);
    }

    return {
      signedTransactions,
      targetBlockNumber,
    };
  }

  /**
   * Submit a Flashbots bundle
   */
  async submitFlashbotsBundle(
    bundle: FlashbotsBundle,
    relay?: PrivateRelayConfig
  ): Promise<PrivateTransactionResult> {
    const flashbotsRelay = relay || 
      this.relays.get(PrivateRelayType.FLASHBOTS_PROTECT) ||
      this.relays.get(PrivateRelayType.MEV_SHARE);

    if (!flashbotsRelay) {
      return {
        success: false,
        error: 'No Flashbots relay configured',
      };
    }

    try {
      const payload = {
        txs: bundle.signedTransactions,
        blockNumber: `0x${bundle.targetBlockNumber.toString(16)}`,
        minTimestamp: bundle.minTimestamp,
        maxTimestamp: bundle.maxTimestamp,
        revertingTxHashes: bundle.revertingTxHashes || [],
      };

      // Submit bundle using ethers provider
      const flashbotsProvider = new ethers.providers.JsonRpcProvider(flashbotsRelay.endpoint);
      const data = await flashbotsProvider.send('eth_sendBundle', [payload]);

      logger.info('[PrivateRPCManager] Flashbots bundle submitted successfully');

      return {
        success: true,
        bundleHash: data?.bundleHash,
        relayUsed: flashbotsRelay.type,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[PrivateRPCManager] Bundle submission failed: ${message}`);
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Get statistics for all relays
   */
  getStats(): Map<PrivateRelayType, RelayStats> {
    return new Map(this.stats);
  }

  /**
   * Get statistics for a specific relay
   */
  getRelayStats(type: PrivateRelayType): RelayStats | undefined {
    return this.stats.get(type);
  }

  /**
   * Check if a relay is available
   */
  async checkRelayHealth(type: PrivateRelayType): Promise<boolean> {
    const relay = this.relays.get(type);
    if (!relay) {
      return false;
    }

    try {
      const provider = new ethers.providers.JsonRpcProvider(relay.endpoint);
      await provider.getBlockNumber();
      
      const stats = this.stats.get(type);
      if (stats) {
        stats.isAvailable = true;
      }
      
      return true;
    } catch (error) {
      const stats = this.stats.get(type);
      if (stats) {
        stats.isAvailable = false;
      }
      
      logger.warn(`[PrivateRPCManager] Relay ${type} health check failed`);
      return false;
    }
  }

  /**
   * Check health of all relays
   */
  async checkAllRelaysHealth(): Promise<Map<PrivateRelayType, boolean>> {
    const results = new Map<PrivateRelayType, boolean>();
    
    const checks = Array.from(this.relays.keys()).map(async type => {
      const isHealthy = await this.checkRelayHealth(type);
      results.set(type, isHealthy);
    });

    await Promise.all(checks);
    return results;
  }
}

/**
 * Create default Flashbots Protect configuration
 */
export function createFlashbotsProtectConfig(
  chainId: number,
  authKey?: string
): PrivateRelayConfig {
  let endpoint: string;
  
  switch (chainId) {
    case 1: // Mainnet
      endpoint = FLASHBOTS_ENDPOINTS.MAINNET;
      break;
    case 5: // Goerli
      endpoint = FLASHBOTS_ENDPOINTS.GOERLI;
      break;
    case 11155111: // Sepolia
      endpoint = FLASHBOTS_ENDPOINTS.SEPOLIA;
      break;
    default:
      throw new Error(`Flashbots not supported on chain ID ${chainId}`);
  }

  return {
    type: PrivateRelayType.FLASHBOTS_PROTECT,
    endpoint,
    authKey,
    enabled: true,
    priority: 100,
    name: 'Flashbots Protect',
  };
}

/**
 * Create default MEV-Share configuration
 */
export function createMEVShareConfig(authKey?: string): PrivateRelayConfig {
  return {
    type: PrivateRelayType.MEV_SHARE,
    endpoint: MEV_SHARE_ENDPOINT,
    authKey,
    enabled: true,
    priority: 90,
    name: 'MEV-Share',
  };
}
