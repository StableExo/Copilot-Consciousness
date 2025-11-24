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

import { JsonRpcProvider, Wallet, ethers } from 'ethers';
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
  BundleSimulationResult,
  BundleStatus,
  BuilderReputation,
  MEVRefund,
  BundleCacheOptions,
  BundleCacheInfo,
  BundleCacheAddResult,
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
   * Update statistics for a relay
   */
  private updateStats(type: PrivateRelayType, success: boolean): void {
    const stats = this.stats.get(type);
    if (stats) {
      stats.totalSubmissions++;
      stats.lastSubmission = new Date();
      
      if (success) {
        stats.successfulInclusions++;
      } else {
        stats.failedSubmissions++;
      }
    }
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
      const flashbotsProvider = new JsonRpcProvider(relay.endpoint);
      
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
      const mevShareProvider = new JsonRpcProvider(relay.endpoint);
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
      const builderProvider = new JsonRpcProvider(relay.endpoint);
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
      const flashbotsProvider = new JsonRpcProvider(flashbotsRelay.endpoint);
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
      const provider = new JsonRpcProvider(relay.endpoint);
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

  /**
   * Simulate a Flashbots bundle before submission (eth_callBundle)
   * This validates the bundle and estimates profit without submitting
   */
  async simulateBundle(
    bundle: FlashbotsBundle,
    stateBlockNumber?: number
  ): Promise<BundleSimulationResult> {
    const flashbotsRelay = 
      this.relays.get(PrivateRelayType.FLASHBOTS_PROTECT) ||
      this.relays.get(PrivateRelayType.MEV_SHARE);

    if (!flashbotsRelay) {
      return {
        success: false,
        error: 'No Flashbots relay configured for simulation',
      };
    }

    // Update stats
    const stats = this.stats.get(flashbotsRelay.type);
    if (stats) {
      stats.totalSimulations = (stats.totalSimulations || 0) + 1;
    }

    try {
      const provider = new JsonRpcProvider(flashbotsRelay.endpoint);
      
      const payload = {
        txs: bundle.signedTransactions,
        blockNumber: stateBlockNumber 
          ? `0x${stateBlockNumber.toString(16)}`
          : `0x${bundle.targetBlockNumber.toString(16)}`,
        stateBlockNumber: stateBlockNumber 
          ? `0x${stateBlockNumber.toString(16)}`
          : 'latest',
        timestamp: bundle.minTimestamp || Math.floor(Date.now() / 1000),
      };

      const result = await provider.send('eth_callBundle', [payload]);

      // Update successful simulation count
      if (stats) {
        stats.successfulSimulations = (stats.successfulSimulations || 0) + 1;
      }

      logger.info('[PrivateRPCManager] Bundle simulation successful');

      return {
        success: true,
        bundleHash: result.bundleHash,
        bundleGasPrice: result.bundleGasPrice,
        coinbaseDiff: result.coinbaseDiff,
        ethSentToCoinbase: result.ethSentToCoinbase,
        gasFees: result.gasFees,
        stateBlockNumber: result.stateBlockNumber,
        totalGasUsed: result.totalGasUsed,
        results: result.results?.map((tx: any) => ({
          txHash: tx.txHash,
          gasUsed: tx.gasUsed,
          gasPrice: tx.gasPrice,
          revert: tx.revert,
          revertReason: tx.revertReason,
          value: tx.value,
        })),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[PrivateRPCManager] Bundle simulation failed: ${message}`);
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Cancel a submitted bundle (eth_cancelBundle)
   * Only works if bundle hasn't been included yet
   */
  async cancelBundle(bundleHash: string): Promise<boolean> {
    const flashbotsRelay = 
      this.relays.get(PrivateRelayType.FLASHBOTS_PROTECT) ||
      this.relays.get(PrivateRelayType.MEV_SHARE);

    if (!flashbotsRelay) {
      logger.error('[PrivateRPCManager] No Flashbots relay configured for cancellation');
      return false;
    }

    try {
      const provider = new JsonRpcProvider(flashbotsRelay.endpoint);
      await provider.send('eth_cancelBundle', [{ bundleHash }]);

      // Update stats
      const stats = this.stats.get(flashbotsRelay.type);
      if (stats) {
        stats.totalCancellations = (stats.totalCancellations || 0) + 1;
      }

      logger.info(`[PrivateRPCManager] Bundle cancelled: ${bundleHash}`);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[PrivateRPCManager] Bundle cancellation failed: ${message}`);
      return false;
    }
  }

  /**
   * Get the status of a submitted bundle
   * Checks if bundle was included and in which block
   */
  async getBundleStatus(bundleHash: string): Promise<BundleStatus | null> {
    const flashbotsRelay = 
      this.relays.get(PrivateRelayType.FLASHBOTS_PROTECT) ||
      this.relays.get(PrivateRelayType.MEV_SHARE);

    if (!flashbotsRelay) {
      logger.error('[PrivateRPCManager] No Flashbots relay configured');
      return null;
    }

    try {
      const provider = new JsonRpcProvider(flashbotsRelay.endpoint);
      const result = await provider.send('eth_getBundleStats', [bundleHash]);

      if (!result) {
        return null;
      }

      return {
        isIncluded: result.isIncluded || false,
        blockNumber: result.blockNumber,
        timestamp: result.timestamp,
        txHashes: result.txHashes,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`[PrivateRPCManager] Failed to get bundle status: ${message}`);
      return null;
    }
  }

  /**
   * Submit bundle with simulation validation
   * Simulates first, then submits if profitable
   */
  async submitBundleWithValidation(
    bundle: FlashbotsBundle,
    minProfitWei: bigint = 0n
  ): Promise<PrivateTransactionResult> {
    // First simulate the bundle
    logger.info('[PrivateRPCManager] Simulating bundle before submission...');
    const simulation = await this.simulateBundle(bundle);

    if (!simulation.success) {
      return {
        success: false,
        error: `Bundle simulation failed: ${simulation.error}`,
      };
    }

    // Check if any transaction reverted
    const hasRevert = simulation.results?.some(tx => tx.revert);
    if (hasRevert) {
      const revertReasons = simulation.results
        ?.filter(tx => tx.revert)
        .map(tx => tx.revertReason)
        .join(', ');
      return {
        success: false,
        error: `Bundle would revert: ${revertReasons}`,
      };
    }

    // Check profitability
    if (simulation.coinbaseDiff) {
      const profit = BigInt(simulation.coinbaseDiff);
      if (profit < minProfitWei) {
        return {
          success: false,
          error: `Insufficient profit: ${profit} wei < ${minProfitWei} wei`,
        };
      }
      logger.info(`[PrivateRPCManager] Bundle profitable: ${profit} wei`);
    }

    // Simulation passed, submit the bundle
    logger.info('[PrivateRPCManager] Simulation passed, submitting bundle...');
    return this.submitFlashbotsBundle(bundle);
  }

  /**
   * Wait for bundle inclusion with timeout
   * Polls bundle status until included or timeout
   */
  async waitForBundleInclusion(
    bundleHash: string,
    maxBlocks: number = 25,
    pollIntervalMs: number = 3000
  ): Promise<BundleStatus | null> {
    const startBlock = await this.provider.getBlockNumber();
    const endBlock = startBlock + maxBlocks;

    logger.info(
      `[PrivateRPCManager] Waiting for bundle ${bundleHash} (max ${maxBlocks} blocks)`
    );

    while (await this.provider.getBlockNumber() < endBlock) {
      const status = await this.getBundleStatus(bundleHash);
      
      if (status?.isIncluded) {
        logger.info(
          `[PrivateRPCManager] Bundle included in block ${status.blockNumber}`
        );
        return status;
      }

      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    logger.warn(`[PrivateRPCManager] Bundle not included after ${maxBlocks} blocks`);
    return null;
  }

  /**
   * Send a single private transaction using eth_sendPrivateTransaction
   * This is simpler than bundles for single transaction privacy
   * 
   * @see https://docs.flashbots.net/flashbots-protect/additional-documentation/eth-sendPrivateTransaction
   */
  async sendPrivateTransaction(
    transaction: providers.TransactionRequest,
    options?: {
      maxBlockNumber?: number;
      fast?: boolean;
      preferences?: {
        privacy?: {
          hints?: string[];
          builders?: string[];
        };
      };
    }
  ): Promise<PrivateTransactionResult> {
    try {
      const relay = this.relays.get(PrivateRelayType.FLASHBOTS_PROTECT);
      if (!relay) {
        throw new Error('Flashbots Protect relay not configured');
      }

      // Sign the transaction
      const signedTx = await this.signer.signTransaction(transaction);

      // Build RPC parameters
      const params: any = {
        tx: signedTx,
      };

      if (options?.maxBlockNumber) {
        params.maxBlockNumber = `0x${options.maxBlockNumber.toString(16)}`;
      }

      if (options?.fast || options?.preferences) {
        params.preferences = {};
        
        if (options.fast) {
          params.preferences.fast = true;
        }
        
        if (options.preferences?.privacy) {
          params.preferences.privacy = options.preferences.privacy;
        }
      }

      // Submit to Flashbots Protect RPC
      const flashbotsProvider = new JsonRpcProvider(relay.endpoint);
      const result = await flashbotsProvider.send('eth_sendPrivateTransaction', [params]);

      logger.info(`[PrivateRPCManager] Private transaction submitted: ${result}`);

      this.updateStats(relay.type, true);

      return {
        success: true,
        txHash: result,
        relayUsed: PrivateRelayType.FLASHBOTS_PROTECT,
        metadata: {
          publicMempoolVisible: false,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[PrivateRPCManager] Private transaction failed: ${message}`);
      
      const relay = this.relays.get(PrivateRelayType.FLASHBOTS_PROTECT);
      if (relay) {
        this.updateStats(relay.type, false);
      }

      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Cancel a private transaction using eth_cancelPrivateTransaction
   * Only works for transactions submitted via eth_sendPrivateTransaction
   * 
   * @see https://docs.flashbots.net/flashbots-protect/additional-documentation/eth-sendPrivateTransaction
   */
  async cancelPrivateTransaction(txHash: string): Promise<boolean> {
    try {
      const relay = this.relays.get(PrivateRelayType.FLASHBOTS_PROTECT);
      if (!relay) {
        throw new Error('Flashbots Protect relay not configured');
      }

      const flashbotsProvider = new JsonRpcProvider(relay.endpoint);
      const result = await flashbotsProvider.send('eth_cancelPrivateTransaction', [
        { txHash },
      ]);

      logger.info(`[PrivateRPCManager] Private transaction cancelled: ${txHash}`);

      const stats = this.stats.get(relay.type);
      if (stats) {
        stats.totalCancellations = (stats.totalCancellations || 0) + 1;
      }

      return result === true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[PrivateRPCManager] Cancel private transaction failed: ${message}`);
      return false;
    }
  }

  /**
   * Get transaction status from Flashbots Protect Status API
   * 
   * @see https://docs.flashbots.net/flashbots-protect/additional-documentation/status-api
   */
  async getTransactionStatus(txHash: string): Promise<any> {
    try {
      const statusUrl = `https://protect.flashbots.net/tx/${txHash}`;
      
      // Use fetch or axios if available, otherwise return null
      // This is a placeholder for the actual HTTP request
      logger.info(`[PrivateRPCManager] Check transaction status at: ${statusUrl}`);
      
      // In a real implementation, you would do:
      // const response = await fetch(statusUrl);
      // return await response.json();
      
      return {
        message: 'Status API integration requires HTTP client',
        statusUrl,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[PrivateRPCManager] Get transaction status failed: ${message}`);
      return null;
    }
  }

  /**
   * Create bundle with replacement UUID for cancellation/replacement
   * 
   * @see https://docs.flashbots.net/flashbots-auction/advanced/rpc-endpoint
   */
  async submitFlashbotsBundleWithReplacement(
    bundle: FlashbotsBundle,
    replacementUuid: string
  ): Promise<PrivateTransactionResult> {
    try {
      const relay = this.relays.get(PrivateRelayType.FLASHBOTS_PROTECT);
      if (!relay) {
        throw new Error('Flashbots Protect relay not configured');
      }

      const payload = {
        txs: bundle.signedTransactions,
        blockNumber: `0x${bundle.targetBlockNumber.toString(16)}`,
        minTimestamp: bundle.minTimestamp,
        maxTimestamp: bundle.maxTimestamp,
        revertingTxHashes: bundle.revertingTxHashes || [],
        replacementUuid, // UUID for replacement/cancellation
      };

      const flashbotsProvider = new JsonRpcProvider(relay.endpoint);
      const data = await flashbotsProvider.send('eth_sendBundle', [payload]);

      logger.info(
        `[PrivateRPCManager] Bundle submitted with replacement UUID: ${replacementUuid}`
      );

      this.updateStats(relay.type, true);

      return {
        success: true,
        bundleHash: data?.bundleHash,
        relayUsed: PrivateRelayType.FLASHBOTS_PROTECT,
        metadata: {
          publicMempoolVisible: false,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[PrivateRPCManager] Bundle submission with UUID failed: ${message}`);
      
      const relay = this.relays.get(PrivateRelayType.FLASHBOTS_PROTECT);
      if (relay) {
        this.updateStats(relay.type, false);
      }

      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Get privacy hint recommendations based on transaction type
   * Helps optimize privacy vs MEV refund tradeoff
   */
  getPrivacyHintRecommendations(
    transactionType: 'swap' | 'arbitrage' | 'liquidation' | 'general',
    privacyPriority: 'high' | 'medium' | 'low'
  ): any {
    const recommendations: Record<string, any> = {
      swap: {
        high: {
          hints: ['hash'],
          expectedRefundPercent: 50,
          privacyScore: 90,
          reasoning: 'Maximum privacy - only share hash. Lower refunds but protected from MEV.',
        },
        medium: {
          hints: ['hash', 'contract_address', 'default_logs'],
          expectedRefundPercent: 75,
          privacyScore: 60,
          reasoning: 'Balanced - share swap events. Good refunds with reasonable privacy.',
        },
        low: {
          hints: ['hash', 'contract_address', 'function_selector', 'default_logs', 'calldata'],
          expectedRefundPercent: 90,
          privacyScore: 30,
          reasoning: 'Maximum refunds - share most data. Best for refund maximization.',
        },
      },
      arbitrage: {
        high: {
          hints: ['hash'],
          expectedRefundPercent: 40,
          privacyScore: 95,
          reasoning: 'Protect strategy - only hash. Essential for competitive arbitrage.',
        },
        medium: {
          hints: ['hash', 'contract_address'],
          expectedRefundPercent: 60,
          privacyScore: 70,
          reasoning: 'Moderate privacy - share contract. Balanced for most arbitrage.',
        },
        low: {
          hints: ['hash', 'contract_address', 'logs'],
          expectedRefundPercent: 80,
          privacyScore: 40,
          reasoning: 'Higher refunds - share logs. Use when refund priority is high.',
        },
      },
      liquidation: {
        high: {
          hints: ['hash'],
          expectedRefundPercent: 45,
          privacyScore: 90,
          reasoning: 'Maximum privacy - protect liquidation target.',
        },
        medium: {
          hints: ['hash', 'contract_address'],
          expectedRefundPercent: 70,
          privacyScore: 65,
          reasoning: 'Standard liquidation privacy with good refunds.',
        },
        low: {
          hints: ['hash', 'contract_address', 'function_selector', 'logs'],
          expectedRefundPercent: 85,
          privacyScore: 35,
          reasoning: 'High refunds - share liquidation details.',
        },
      },
      general: {
        high: {
          hints: ['hash'],
          expectedRefundPercent: 50,
          privacyScore: 85,
          reasoning: 'Maximum privacy - only share hash.',
        },
        medium: {
          hints: ['hash', 'contract_address'],
          expectedRefundPercent: 70,
          privacyScore: 60,
          reasoning: 'Balanced privacy and refunds.',
        },
        low: {
          hints: ['hash', 'contract_address', 'logs', 'default_logs'],
          expectedRefundPercent: 85,
          privacyScore: 35,
          reasoning: 'Maximum refunds - share most data.',
        },
      },
    };

    return recommendations[transactionType]?.[privacyPriority] || recommendations.general.medium;
  }

  /**
   * Bundle Cache API Methods
   * https://docs.flashbots.net/flashbots-protect/additional-documentation/bundle-cache
   */

  /**
   * Create a new bundle cache with a unique ID
   * @param options - Bundle cache options
   * @returns Bundle ID and RPC endpoint URL
   */
  createBundleCache(options: import('./types/PrivateRPCTypes').BundleCacheOptions = {}): {
    bundleId: string;
    rpcUrl: string;
    chainId: number;
  } {
    const bundleId = options.bundleId || this.generateUUID();
    const chainId = options.chainId || 1;
    const endpoint = FLASHBOTS_ENDPOINTS.MAINNET;
    const rpcUrl = `${endpoint}?bundle=${bundleId}`;

    logger.info(`[BundleCache] Created bundle cache with ID: ${bundleId}`);
    logger.info(`[BundleCache] RPC URL: ${rpcUrl}`);
    
    if (options.fakeFunds) {
      logger.info(`[BundleCache] Fake funds mode enabled - balance queries will return 100 ETH`);
    }

    return {
      bundleId,
      rpcUrl,
      chainId,
    };
  }

  /**
   * Add a signed transaction to the bundle cache
   * @param bundleId - The bundle ID
   * @param signedTx - The signed transaction hex string
   * @returns Result with success status
   */
  async addTransactionToBundleCache(
    bundleId: string,
    signedTx: string
  ): Promise<import('./types/PrivateRPCTypes').BundleCacheAddResult> {
    const endpoint = FLASHBOTS_ENDPOINTS.MAINNET;
    const rpcUrl = `${endpoint}?bundle=${bundleId}`;

    try {
      // Create a provider connected to the bundle cache RPC
      const bundleProvider = new JsonRpcProvider(rpcUrl);
      
      // Send the signed transaction to the bundle cache
      const tx = await bundleProvider.sendTransaction(signedTx);
      
      logger.info(`[BundleCache] Added transaction ${tx.hash} to bundle ${bundleId}`);

      // Get current bundle info to count transactions
      const bundleInfo = await this.getBundleCacheTransactions(bundleId);

      return {
        bundleId,
        txHash: tx.hash,
        txCount: bundleInfo.rawTxs.length,
        success: true,
      };
    } catch (error: any) {
      logger.error(`[BundleCache] Failed to add transaction to bundle ${bundleId}:`, error?.message || error);
      throw error;
    }
  }

  /**
   * Get all transactions in a bundle cache
   * @param bundleId - The bundle ID
   * @returns Bundle cache information with all transactions
   */
  async getBundleCacheTransactions(
    bundleId: string
  ): Promise<import('./types/PrivateRPCTypes').BundleCacheInfo> {
    const endpoint = FLASHBOTS_ENDPOINTS.MAINNET;
    const url = `${endpoint}/bundle?id=${bundleId}`;

    try {
      // Use native fetch or polyfill
      const fetchImpl = (global as any).fetch;
      if (!fetchImpl) {
        throw new Error('fetch is not available. Please ensure you are running in an environment with fetch support or use a polyfill.');
      }
      const response = await fetchImpl(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      logger.info(`[BundleCache] Retrieved bundle ${bundleId} with ${data.rawTxs?.length || 0} transactions`);

      return {
        bundleId: data.bundleId || bundleId,
        rawTxs: data.rawTxs || [],
        txCount: data.rawTxs?.length || 0,
        createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
      };
    } catch (error: any) {
      logger.error(`[BundleCache] Failed to retrieve bundle ${bundleId}:`, error?.message || error);
      throw error;
    }
  }

  /**
   * Send a cached bundle for execution
   * @param bundleId - The bundle ID
   * @param targetBlock - Target block number for inclusion
   * @returns Bundle submission result
   */
  async sendCachedBundle(
    bundleId: string,
    targetBlock: number
  ): Promise<PrivateTransactionResult> {
    try {
      // Get all transactions from the bundle cache
      const bundleInfo = await this.getBundleCacheTransactions(bundleId);
      
      if (bundleInfo.rawTxs.length === 0) {
        throw new Error(`Bundle ${bundleId} is empty`);
      }

      logger.info(
        `[BundleCache] Sending cached bundle ${bundleId} with ${bundleInfo.rawTxs.length} transactions to block ${targetBlock}`
      );

      // Submit the bundle using the standard bundle submission method
      const bundle: FlashbotsBundle = {
        signedTransactions: bundleInfo.rawTxs,
        targetBlockNumber: targetBlock,
        minTimestamp: 0,
        maxTimestamp: 0,
      };

      const result = await this.submitFlashbotsBundle(bundle);

      this.updateStats(PrivateRelayType.FLASHBOTS_PROTECT, result.success);

      return result;
    } catch (error: any) {
      logger.error(`[BundleCache] Failed to send cached bundle ${bundleId}:`, error?.message || error);
      this.updateStats(PrivateRelayType.FLASHBOTS_PROTECT, false);
      throw error;
    }
  }

  /**
   * Generate a UUID v4 for bundle IDs
   * @returns UUID v4 string
   */
  private generateUUID(): string {
    // Simple UUID v4 generator
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

/**
 * Create default Flashbots Protect configuration
 */
export function createFlashbotsProtectConfig(
  chainId: number,
  authKey?: string,
  fastMode: boolean = false
): PrivateRelayConfig {
  let endpoint: string;
  
  switch (chainId) {
    case 1: // Mainnet
      endpoint = fastMode ? 'https://rpc.flashbots.net/fast' : FLASHBOTS_ENDPOINTS.MAINNET;
      break;
    case 5: // Goerli
      endpoint = fastMode ? 'https://rpc-goerli.flashbots.net/fast' : FLASHBOTS_ENDPOINTS.GOERLI;
      break;
    case 11155111: // Sepolia
      endpoint = fastMode ? 'https://rpc-sepolia.flashbots.net/fast' : FLASHBOTS_ENDPOINTS.SEPOLIA;
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
    name: fastMode ? 'Flashbots Protect (Fast Mode)' : 'Flashbots Protect',
    fastMode,
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

/**
 * Create MEV-Boost relay configuration
 * @param relayUrl - The MEV-Boost relay URL (e.g., https://boost-relay.flashbots.net)
 * @param beaconNodes - Beacon node URLs for block validation
 * @param builders - Connected builder names
 */
export function createMEVBoostRelayConfig(
  relayUrl: string,
  beaconNodes: string[] = [],
  builders: string[] = []
): PrivateRelayConfig {
  return {
    type: PrivateRelayType.BUILDER_RPC,
    endpoint: relayUrl,
    enabled: true,
    priority: 80,
    name: 'MEV-Boost Relay',
    beaconNodes,
    connectedBuilders: builders,
  };
}
