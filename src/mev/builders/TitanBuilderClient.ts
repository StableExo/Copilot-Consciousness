/**
 * Titan Builder Client
 * 
 * Client for submitting bundles to Titan Builder via MEV-Boost relay.
 * Titan uses standard MEV-Boost protocol, so this is a thin wrapper
 * around the standard bundle submission API.
 */

import { JsonRpcProvider, Wallet, keccak256, concat, toBeHex } from 'ethers';
import { logger } from '../../utils/logger';
import {
  BuilderName,
  StandardBundle,
  BundleSubmissionResult,
  SimulationResult,
  BundleStats,
  IBuilderClient,
} from './types';
import { TITAN_BUILDER } from './BuilderRegistry';

/**
 * Titan Builder client configuration
 */
export interface TitanBuilderClientConfig {
  /** Titan relay URL */
  relayUrl?: string;
  
  /** Request timeout (ms) */
  timeout?: number;
  
  /** Enable request logging */
  enableLogging?: boolean;
  
  /** Retry attempts */
  maxRetries?: number;
}

/**
 * TitanBuilderClient - Submit bundles to Titan Builder
 */
export class TitanBuilderClient implements IBuilderClient {
  readonly builderName = BuilderName.TITAN;
  private relayUrl: string;
  private timeout: number;
  private enableLogging: boolean;
  private maxRetries: number;
  private provider?: JsonRpcProvider;

  constructor(config: TitanBuilderClientConfig = {}) {
    this.relayUrl = config.relayUrl || TITAN_BUILDER.relayUrl;
    this.timeout = config.timeout || 5000; // 5 second timeout
    this.enableLogging = config.enableLogging ?? true;
    this.maxRetries = config.maxRetries || 3;

    if (this.enableLogging) {
      logger.info(`[TitanBuilderClient] Initialized with relay: ${this.relayUrl}`);
    }
  }

  /**
   * Submit bundle to Titan Builder
   */
  async submitBundle(bundle: StandardBundle): Promise<BundleSubmissionResult> {
    const startTime = Date.now();

    try {
      if (this.enableLogging) {
        logger.info(`[TitanBuilderClient] Submitting bundle to Titan (block ${bundle.blockNumber})`);
      }

      // Prepare bundle parameters
      const params = this.prepareBundleParams(bundle);

      // Submit to Titan relay
      const bundleHash = await this.sendBundleRequest(params);

      const responseTimeMs = Date.now() - startTime;

      if (this.enableLogging) {
        logger.info(`[TitanBuilderClient] Bundle submitted successfully (${responseTimeMs}ms): ${bundleHash}`);
      }

      return {
        builder: BuilderName.TITAN,
        success: true,
        bundleHash,
        timestamp: new Date(),
        responseTimeMs,
      };
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (this.enableLogging) {
        logger.error(`[TitanBuilderClient] Bundle submission failed (${responseTimeMs}ms): ${errorMessage}`);
      }

      return {
        builder: BuilderName.TITAN,
        success: false,
        error: errorMessage,
        timestamp: new Date(),
        responseTimeMs,
      };
    }
  }

  /**
   * Simulate bundle execution (not supported by Titan relay yet)
   */
  async simulateBundle(bundle: StandardBundle): Promise<SimulationResult> {
    // Titan doesn't publicly expose simulation endpoint
    // Return unsupported result
    return {
      success: false,
      error: 'Simulation not supported by Titan relay',
    };
  }

  /**
   * Get bundle statistics (limited support)
   */
  async getBundleStats(bundleHash: string): Promise<BundleStats> {
    // Titan doesn't publicly expose bundle stats endpoint
    // Return minimal stats
    return {
      bundleHash,
      isIncluded: false, // Unknown without on-chain monitoring
    };
  }

  /**
   * Health check - verify Titan relay is reachable
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Simple HTTP check to relay endpoint
      const response = await fetch(this.relayUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_blockNumber',
          params: [],
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      return response.ok;
    } catch (error) {
      if (this.enableLogging) {
        logger.warn(`[TitanBuilderClient] Health check failed: ${error}`);
      }
      return false;
    }
  }

  /**
   * Prepare bundle parameters for submission
   */
  private prepareBundleParams(bundle: StandardBundle): BundleSubmissionParams {
    return {
      version: 'v0.1',
      inclusion: {
        block: bundle.blockNumber,
        maxBlock: bundle.blockNumber + 1, // Submit for this block only
      },
      body: {
        tx: bundle.txs,
        canRevert: bundle.revertingTxHashes
          ? bundle.txs.map((tx) => bundle.revertingTxHashes?.includes(tx) || false)
          : bundle.txs.map(() => false),
      },
      privacy: bundle.privacy,
    };
  }

  /**
   * Send bundle request to Titan relay
   */
  private async sendBundleRequest(params: BundleSubmissionParams): Promise<string> {
    const payload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_sendBundle',
      params: [params],
    };

    let lastError: Error | null = null;
    
    // Retry logic
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(this.relayUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(this.timeout),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error.message || JSON.stringify(data.error));
        }

        if (!data.result) {
          throw new Error('No bundle hash in response');
        }

        return data.result.bundleHash || data.result;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.maxRetries - 1) {
          // Wait before retry (exponential backoff)
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise((resolve) => setTimeout(resolve, delay));
          
          if (this.enableLogging) {
            logger.warn(`[TitanBuilderClient] Retry ${attempt + 1}/${this.maxRetries} after ${delay}ms`);
          }
        }
      }
    }

    throw lastError || new Error('Bundle submission failed');
  }

  /**
   * Update relay URL
   */
  setRelayUrl(url: string): void {
    this.relayUrl = url;
    if (this.enableLogging) {
      logger.info(`[TitanBuilderClient] Relay URL updated: ${url}`);
    }
  }

  /**
   * Get current relay URL
   */
  getRelayUrl(): string {
    return this.relayUrl;
  }
}

/**
 * Bundle submission parameters (internal type)
 */
interface BundleSubmissionParams {
  version: string;
  inclusion: {
    block: number;
    maxBlock?: number;
  };
  body: {
    tx: string[];
    canRevert: boolean[];
  };
  privacy?: {
    hints?: string[];
    builders?: string[];
  };
}
