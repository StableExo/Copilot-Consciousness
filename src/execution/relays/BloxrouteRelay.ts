/**
 * bloXroute Max Profit Relay
 *
 * Integration with bloXroute's private transaction relay and mempool streaming service.
 * Provides MEV protection and time advantage through:
 * - Private transaction submission (keeps txs out of public mempool)
 * - Bundle support for atomic execution
 * - Multi-chain support (Ethereum, Base, Arbitrum, Optimism, Polygon)
 * - Real-time mempool streaming (100-800ms advantage)
 *
 * @see https://docs.bloxroute.com/
 * @see docs/BLOXROUTE_INTEGRATION_GUIDE.md
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../../utils/logger';
import {
  PrivateRelayConfig,
  PrivateTransactionResult,
  PrivateRelayType,
} from '../types/PrivateRPCTypes';

/**
 * bloXroute-specific configuration
 */
export interface BloxrouteConfig extends PrivateRelayConfig {
  /** bloXroute authorization header (base64 encoded account credentials) */
  authHeader: string;
  /** Account ID for tracking */
  accountId: string;
  /** API base URL */
  apiUrl: string;
  /** Cloud API URL (alternative endpoint) */
  cloudApiUrl?: string;
  /** Supported blockchain networks */
  supportedChains: string[];
}

/**
 * Chain ID to bloXroute network name mapping
 */
const CHAIN_ID_TO_NETWORK: Record<number, string> = {
  1: 'ethereum',
  8453: 'base',
  42161: 'arbitrum',
  10: 'optimism',
  137: 'polygon',
  56: 'bsc',
};

/**
 * bloXroute Max Profit Relay Implementation
 *
 * Handles private transaction submission and bundle creation for bloXroute's
 * MEV-protected relay network.
 */
export class BloxrouteRelay {
  public readonly name = 'bloXroute Max Profit';
  public readonly type = PrivateRelayType.BLOXROUTE;
  private config: BloxrouteConfig;
  private client: AxiosInstance;
  private stats: {
    totalSubmissions: number;
    successfulSubmissions: number;
    failedSubmissions: number;
    lastSubmissionTime?: Date;
    avgResponseTime: number;
  };

  constructor(config: BloxrouteConfig) {
    this.config = config;
    this.stats = {
      totalSubmissions: 0,
      successfulSubmissions: 0,
      failedSubmissions: 0,
      avgResponseTime: 0,
    };

    // Create axios client with bloXroute configuration
    this.client = axios.create({
      baseURL: config.apiUrl,
      headers: {
        Authorization: config.authHeader,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });

    logger.info(
      `[BloxrouteRelay] Initialized for account ${config.accountId} with chains: ${config.supportedChains.join(', ')}`
    );
  }

  /**
   * Submit a single transaction to bloXroute
   */
  async submitTransaction(
    signedTx: string,
    chainId: number
  ): Promise<PrivateTransactionResult> {
    const startTime = Date.now();
    this.stats.totalSubmissions++;
    this.stats.lastSubmissionTime = new Date();

    try {
      const networkName = this.getNetworkName(chainId);

      if (!this.config.supportedChains.includes(networkName)) {
        this.stats.failedSubmissions++;
        return {
          success: false,
          error: `Chain ${networkName} (${chainId}) not supported by bloXroute account`,
        };
      }

      logger.info(
        `[BloxrouteRelay] Submitting transaction to ${networkName} (chain ${chainId})`
      );

      // Submit via bloXroute /blxr_tx endpoint
      const response = await this.client.post('/blxr_tx', {
        transaction: signedTx,
        blockchain_network: networkName,
      });

      const responseTime = Date.now() - startTime;
      this.updateAvgResponseTime(responseTime);

      if (response.data && response.data.tx_hash) {
        this.stats.successfulSubmissions++;
        logger.info(
          `[BloxrouteRelay] Transaction submitted successfully: ${response.data.tx_hash} (${responseTime}ms)`
        );

        return {
          success: true,
          txHash: response.data.tx_hash,
          relayUsed: PrivateRelayType.BLOXROUTE,
          metadata: {
            publicMempoolVisible: false,
            responseTime,
            networkUsed: networkName,
          },
        };
      }

      this.stats.failedSubmissions++;
      return {
        success: false,
        error: response.data.error || 'Unknown error from bloXroute',
      };
    } catch (error: any) {
      this.stats.failedSubmissions++;
      const errorMessage = error.response?.data?.error || error.message;
      logger.error(`[BloxrouteRelay] Transaction submission failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Submit a bundle of transactions to bloXroute
   */
  async submitBundle(
    signedTxs: string[],
    targetBlock: number,
    chainId: number
  ): Promise<PrivateTransactionResult> {
    const startTime = Date.now();
    this.stats.totalSubmissions++;
    this.stats.lastSubmissionTime = new Date();

    try {
      const networkName = this.getNetworkName(chainId);

      if (!this.config.supportedChains.includes(networkName)) {
        this.stats.failedSubmissions++;
        return {
          success: false,
          error: `Chain ${networkName} (${chainId}) not supported by bloXroute account`,
        };
      }

      logger.info(
        `[BloxrouteRelay] Submitting bundle (${signedTxs.length} txs) to ${networkName} for block ${targetBlock}`
      );

      // Submit via bloXroute /blxr_bundle endpoint
      const response = await this.client.post('/blxr_bundle', {
        transactions: signedTxs,
        target_block: targetBlock,
        blockchain_network: networkName,
      });

      const responseTime = Date.now() - startTime;
      this.updateAvgResponseTime(responseTime);

      if (response.data && response.data.bundle_hash) {
        this.stats.successfulSubmissions++;
        logger.info(
          `[BloxrouteRelay] Bundle submitted successfully: ${response.data.bundle_hash} (${responseTime}ms)`
        );

        return {
          success: true,
          bundleHash: response.data.bundle_hash,
          relayUsed: PrivateRelayType.BLOXROUTE,
          metadata: {
            publicMempoolVisible: false,
            responseTime,
            networkUsed: networkName,
            bundleSize: signedTxs.length,
            targetBlock,
          },
        };
      }

      this.stats.failedSubmissions++;
      return {
        success: false,
        error: response.data.error || 'Unknown error from bloXroute',
      };
    } catch (error: any) {
      this.stats.failedSubmissions++;
      const errorMessage = error.response?.data?.error || error.message;
      logger.error(`[BloxrouteRelay] Bundle submission failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get transaction status from bloXroute
   */
  async getTransactionStatus(txHash: string): Promise<any> {
    try {
      const response = await this.client.get(`/tx/${txHash}`);
      return response.data;
    } catch (error: any) {
      logger.warn(`[BloxrouteRelay] Failed to get transaction status: ${error.message}`);
      return null;
    }
  }

  /**
   * Check if relay is available and properly configured
   */
  isAvailable(): boolean {
    return Boolean(
      this.config.authHeader &&
        this.config.apiUrl &&
        this.config.supportedChains.length > 0
    );
  }

  /**
   * Get relay statistics
   */
  getStats() {
    return {
      ...this.stats,
      successRate:
        this.stats.totalSubmissions > 0
          ? (this.stats.successfulSubmissions / this.stats.totalSubmissions) * 100
          : 0,
    };
  }

  /**
   * Convert chain ID to bloXroute network name
   */
  private getNetworkName(chainId: number): string {
    return CHAIN_ID_TO_NETWORK[chainId] || 'unknown';
  }

  /**
   * Update average response time
   */
  private updateAvgResponseTime(newTime: number): void {
    const total = this.stats.totalSubmissions;
    this.stats.avgResponseTime =
      (this.stats.avgResponseTime * (total - 1) + newTime) / total;
  }
}

/**
 * Create bloXroute configuration from environment variables
 */
export function createBloxrouteConfig(chainId: number): BloxrouteConfig {
  const authHeader = process.env.BLOXROUTE_AUTH_HEADER || '';
  const accountId = process.env.BLOXROUTE_ACCOUNT_ID || '';
  const apiUrl = process.env.BLOXROUTE_API_URL || 'https://api.bloxroute.com';
  const cloudApiUrl = process.env.BLOXROUTE_CLOUD_API_URL || 'https://cloudapi.bloxroute.com';
  const supportedChains = (process.env.BLOXROUTE_CHAINS || 'ethereum,base,arbitrum')
    .split(',')
    .map((c) => c.trim());

  return {
    type: PrivateRelayType.BLOXROUTE,
    name: 'bloXroute Max Profit',
    endpoint: apiUrl,
    authHeader,
    accountId,
    apiUrl,
    cloudApiUrl,
    chainId,
    enabled: process.env.ENABLE_BLOXROUTE === 'true',
    priority: 90, // High priority (Flashbots is 100)
    supportBundles: true,
    fastMode: false,
    supportedChains,
  };
}
