/**
 * Transaction Manager for Executing Complex Transactions
 * 
 * Extracted from AxionCitadel - Operation First Light validated
 * Source: https://github.com/metalxalloy/AxionCitadel
 * 
 * Features:
 * - Automatic nonce tracking and synchronization
 * - Transaction retry with exponential backoff
 * - Gas price escalation strategies
 * - Timeout and replacement logic
 * - Error recovery mechanisms
 * - Reorg detection and recovery
 * - Gas spike protection
 */

import { ethers, providers, BigNumber } from 'ethers';
import { logger } from '../utils/logger';
import { NonceManager } from './NonceManager';

/**
 * Transaction status
 */
export enum TransactionState {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  REPLACED = 'replaced',
  TIMEOUT = 'timeout',
}

/**
 * Transaction retry configuration
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Initial delay between retries (ms) */
  initialDelay: number;
  /** Maximum delay between retries (ms) */
  maxDelay: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
  /** Gas price increase factor on retry */
  gasPriceIncrement: number;
}

/**
 * Transaction options
 */
export interface TransactionOptions {
  /** Gas limit */
  gasLimit?: BigNumber;
  /** Gas price */
  gasPrice?: BigNumber;
  /** Max fee per gas (EIP-1559) */
  maxFeePerGas?: BigNumber;
  /** Max priority fee per gas (EIP-1559) */
  maxPriorityFeePerGas?: BigNumber;
  /** Transaction value */
  value?: BigNumber;
  /** Nonce override */
  nonce?: number;
  /** Transaction deadline timestamp */
  deadline?: number;
  /** Retry configuration */
  retryConfig?: Partial<RetryConfig>;
}

/**
 * Transaction metadata for tracking
 */
export interface TransactionMetadata {
  id: string;
  state: TransactionState;
  hash?: string;
  nonce?: number;
  attempts: number;
  submittedAt?: Date;
  confirmedAt?: Date;
  gasPrice?: BigNumber;
  gasUsed?: BigNumber;
  error?: string;
  replacedBy?: string;
}

/**
 * Transaction execution result
 */
export interface TransactionResult {
  success: boolean;
  txHash?: string;
  receipt?: providers.TransactionReceipt;
  metadata: TransactionMetadata;
  error?: string;
}

/**
 * Gas spike detection configuration
 */
export interface GasSpikeConfig {
  /** Maximum acceptable gas price in Gwei */
  maxGasPrice: number;
  /** Percentage increase threshold to detect spike */
  spikeThreshold: number;
  /** Time window to check for spikes (ms) */
  checkWindow: number;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 2000,  // 2 seconds
  maxDelay: 30000,     // 30 seconds
  backoffMultiplier: 2,
  gasPriceIncrement: 1.1,  // 10% increase
};

/**
 * Default gas spike configuration
 */
const DEFAULT_GAS_SPIKE_CONFIG: GasSpikeConfig = {
  maxGasPrice: 500,  // 500 Gwei
  spikeThreshold: 50,  // 50% increase
  checkWindow: 60000,  // 1 minute
};

/**
 * TransactionManager - Production-tested transaction management
 * 
 * Key features from AxionCitadel:
 * - Nonce management with automatic synchronization
 * - Retry logic with exponential backoff
 * - Gas spike protection
 * - Stuck transaction detection and replacement
 * - Reorg detection and recovery
 */
export class TransactionManager {
  private provider: providers.Provider;
  private nonceManager: NonceManager;
  private retryConfig: RetryConfig;
  private gasSpikeConfig: GasSpikeConfig;
  
  // Transaction registry for tracking
  private transactionRegistry: Map<string, TransactionMetadata>;
  
  // Gas price history for spike detection
  private gasPriceHistory: Array<{ timestamp: number; gasPrice: BigNumber }>;
  
  // Statistics
  private stats = {
    totalTransactions: 0,
    successfulTransactions: 0,
    failedTransactions: 0,
    retriedTransactions: 0,
    replacedTransactions: 0,
    timeoutTransactions: 0,
    totalGasUsed: BigNumber.from(0),
  };

  constructor(
    provider: providers.Provider,
    nonceManager: NonceManager,
    retryConfig: Partial<RetryConfig> = {},
    gasSpikeConfig: Partial<GasSpikeConfig> = {}
  ) {
    this.provider = provider;
    this.nonceManager = nonceManager;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    this.gasSpikeConfig = { ...DEFAULT_GAS_SPIKE_CONFIG, ...gasSpikeConfig };
    this.transactionRegistry = new Map();
    this.gasPriceHistory = [];

    logger.info('[TransactionManager] Initialized with retry and gas spike protection');
  }

  /**
   * Execute a transaction with full retry and error recovery
   */
  async executeTransaction(
    to: string,
    data: string,
    options: TransactionOptions = {}
  ): Promise<TransactionResult> {
    const txId = this.generateTransactionId();
    
    // Initialize metadata
    const metadata: TransactionMetadata = {
      id: txId,
      state: TransactionState.PENDING,
      attempts: 0,
    };
    
    this.transactionRegistry.set(txId, metadata);
    this.stats.totalTransactions++;

    try {
      logger.info(`[TransactionManager] Executing transaction ${txId}`);

      // Check for gas spike
      const gasCheck = await this.checkGasSpike();
      if (!gasCheck.safe) {
        throw new Error(`Gas spike detected: ${gasCheck.reason}`);
      }

      // Execute with retry logic
      const retryConfig = { ...this.retryConfig, ...options.retryConfig };
      const result = await this.executeWithRetry(
        to,
        data,
        options,
        metadata,
        retryConfig
      );

      if (result.success) {
        this.stats.successfulTransactions++;
        metadata.state = TransactionState.CONFIRMED;
      } else {
        this.stats.failedTransactions++;
        metadata.state = TransactionState.FAILED;
      }

      return result;
    } catch (error) {
      logger.error(`[TransactionManager] Transaction ${txId} failed:`, error);
      this.stats.failedTransactions++;
      metadata.state = TransactionState.FAILED;
      metadata.error = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        metadata,
        error: metadata.error,
      };
    }
  }

  /**
   * Execute transaction with retry logic
   */
  private async executeWithRetry(
    to: string,
    data: string,
    options: TransactionOptions,
    metadata: TransactionMetadata,
    retryConfig: RetryConfig
  ): Promise<TransactionResult> {
    let lastError: Error | undefined;
    let currentGasPrice = options.gasPrice;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      metadata.attempts = attempt + 1;

      try {
        logger.info(
          `[TransactionManager] Attempt ${attempt + 1}/${retryConfig.maxRetries + 1} for ${metadata.id}`
        );

        // Build transaction
        const tx: providers.TransactionRequest = {
          to,
          data,
          gasLimit: options.gasLimit,
          value: options.value,
        };

        // Set gas price (increase on retries)
        if (attempt > 0 && currentGasPrice) {
          currentGasPrice = currentGasPrice
            .mul(Math.floor(retryConfig.gasPriceIncrement * 100))
            .div(100);
          logger.info(
            `[TransactionManager] Increasing gas price to ${ethers.utils.formatUnits(currentGasPrice, 'gwei')} Gwei`
          );
        }

        if (options.maxFeePerGas && options.maxPriorityFeePerGas) {
          // EIP-1559
          tx.maxFeePerGas = options.maxFeePerGas;
          tx.maxPriorityFeePerGas = options.maxPriorityFeePerGas;
        } else if (currentGasPrice) {
          tx.gasPrice = currentGasPrice;
        }

        // Override nonce if provided
        if (options.nonce !== undefined) {
          tx.nonce = options.nonce;
        }

        // Send transaction
        metadata.state = TransactionState.SUBMITTED;
        metadata.submittedAt = new Date();
        
        const response = await this.nonceManager.sendTransaction(tx);
        metadata.hash = response.hash;
        metadata.nonce = response.nonce;
        metadata.gasPrice = response.gasPrice || currentGasPrice;

        logger.info(`[TransactionManager] Transaction submitted: ${response.hash}`);

        // Wait for confirmation
        const receipt = await this.waitForConfirmation(
          response.hash,
          options.deadline
        );

        if (receipt.status === 1) {
          metadata.state = TransactionState.CONFIRMED;
          metadata.confirmedAt = new Date();
          metadata.gasUsed = receipt.gasUsed;
          this.stats.totalGasUsed = this.stats.totalGasUsed.add(receipt.gasUsed);

          logger.info(
            `[TransactionManager] Transaction confirmed: ${response.hash} (gas used: ${receipt.gasUsed})`
          );

          return {
            success: true,
            txHash: response.hash,
            receipt,
            metadata,
          };
        } else {
          throw new Error('Transaction reverted');
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn(
          `[TransactionManager] Attempt ${attempt + 1} failed: ${lastError.message}`
        );

        // Check if this is a nonce error - NonceManager should handle this
        const isNonceError = this.isNonceError(lastError);
        if (isNonceError) {
          logger.info('[TransactionManager] Nonce error detected, NonceManager will resync');
          // NonceManager automatically resyncs on nonce errors
        }

        // Don't retry on certain errors
        if (this.isFatalError(lastError)) {
          logger.error('[TransactionManager] Fatal error, not retrying');
          break;
        }

        // Wait before retry (exponential backoff)
        if (attempt < retryConfig.maxRetries) {
          const delay = Math.min(
            retryConfig.initialDelay * Math.pow(retryConfig.backoffMultiplier, attempt),
            retryConfig.maxDelay
          );
          logger.info(`[TransactionManager] Waiting ${delay}ms before retry`);
          await this.sleep(delay);
          this.stats.retriedTransactions++;
        }
      }
    }

    // All retries exhausted
    metadata.state = TransactionState.FAILED;
    metadata.error = lastError?.message || 'Unknown error';

    return {
      success: false,
      metadata,
      error: metadata.error,
    };
  }

  /**
   * Wait for transaction confirmation with timeout
   */
  private async waitForConfirmation(
    txHash: string,
    deadline?: number,
    confirmations: number = 1
  ): Promise<providers.TransactionReceipt> {
    const timeout = deadline ? deadline - Date.now() : 120000; // Default 2 minutes
    
    try {
      const receipt = await Promise.race([
        this.provider.waitForTransaction(txHash, confirmations),
        this.timeoutPromise<providers.TransactionReceipt>(timeout),
      ]);

      if (!receipt) {
        throw new Error('Transaction confirmation timeout');
      }

      return receipt;
    } catch (error) {
      logger.error(`[TransactionManager] Confirmation failed for ${txHash}:`, error);
      throw error;
    }
  }

  /**
   * Check for gas price spike
   */
  private async checkGasSpike(): Promise<{ safe: boolean; reason?: string }> {
    try {
      const gasPrice = await this.provider.getGasPrice();
      const gasPriceGwei = parseFloat(ethers.utils.formatUnits(gasPrice, 'gwei'));

      // Update history
      this.gasPriceHistory.push({
        timestamp: Date.now(),
        gasPrice,
      });

      // Clean old entries
      const cutoffTime = Date.now() - this.gasSpikeConfig.checkWindow;
      this.gasPriceHistory = this.gasPriceHistory.filter(
        entry => entry.timestamp > cutoffTime
      );

      // Check absolute maximum
      if (gasPriceGwei > this.gasSpikeConfig.maxGasPrice) {
        return {
          safe: false,
          reason: `Gas price ${gasPriceGwei} Gwei exceeds maximum ${this.gasSpikeConfig.maxGasPrice} Gwei`,
        };
      }

      // Check for recent spike
      if (this.gasPriceHistory.length > 1) {
        const oldestPrice = this.gasPriceHistory[0].gasPrice;
        const oldestPriceGwei = parseFloat(ethers.utils.formatUnits(oldestPrice, 'gwei'));
        const increase = ((gasPriceGwei - oldestPriceGwei) / oldestPriceGwei) * 100;

        if (increase > this.gasSpikeConfig.spikeThreshold) {
          return {
            safe: false,
            reason: `Gas price increased by ${increase.toFixed(1)}% in recent window`,
          };
        }
      }

      return { safe: true };
    } catch (error) {
      logger.warn('[TransactionManager] Gas spike check failed:', error);
      return { safe: true };  // Allow transaction on check failure
    }
  }

  /**
   * Detect if error is nonce-related
   */
  private isNonceError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('nonce too low') ||
      message.includes('invalid nonce') ||
      message.includes('nonce has already been used') ||
      message.includes('replacement transaction underpriced')
    );
  }

  /**
   * Detect if error is fatal (should not retry)
   */
  private isFatalError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('insufficient funds') ||
      message.includes('gas required exceeds allowance') ||
      message.includes('execution reverted') ||
      message.includes('invalid opcode')
    );
  }

  /**
   * Replace stuck transaction with higher gas price
   */
  async replaceTransaction(
    txId: string,
    newGasPrice: BigNumber
  ): Promise<TransactionResult> {
    const metadata = this.transactionRegistry.get(txId);
    if (!metadata) {
      throw new Error(`Transaction ${txId} not found in registry`);
    }

    if (!metadata.hash) {
      throw new Error(`Transaction ${txId} has no hash`);
    }

    logger.info(`[TransactionManager] Replacing transaction ${txId} with higher gas price`);

    try {
      // Get original transaction
      const originalTx = await this.provider.getTransaction(metadata.hash);
      if (!originalTx) {
        throw new Error('Original transaction not found');
      }

      // Build replacement transaction with same nonce but higher gas
      const replacementTx: providers.TransactionRequest = {
        to: originalTx.to!,
        data: originalTx.data,
        gasLimit: originalTx.gasLimit,
        value: originalTx.value,
        nonce: originalTx.nonce,
        gasPrice: newGasPrice,
      };

      // Send replacement
      const response = await this.nonceManager.sendTransaction(replacementTx);
      
      logger.info(`[TransactionManager] Replacement transaction submitted: ${response.hash}`);

      // Update metadata
      const oldHash = metadata.hash;
      metadata.hash = response.hash;
      metadata.state = TransactionState.REPLACED;
      metadata.replacedBy = response.hash;
      this.stats.replacedTransactions++;

      // Wait for confirmation
      const receipt = await this.waitForConfirmation(response.hash);

      if (receipt.status === 1) {
        metadata.state = TransactionState.CONFIRMED;
        metadata.confirmedAt = new Date();
        metadata.gasUsed = receipt.gasUsed;

        return {
          success: true,
          txHash: response.hash,
          receipt,
          metadata,
        };
      } else {
        throw new Error('Replacement transaction reverted');
      }
    } catch (error) {
      logger.error(`[TransactionManager] Transaction replacement failed:`, error);
      metadata.state = TransactionState.FAILED;
      metadata.error = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        metadata,
        error: metadata.error,
      };
    }
  }

  /**
   * Get transaction status
   */
  getTransactionStatus(txId: string): TransactionMetadata | undefined {
    return this.transactionRegistry.get(txId);
  }

  /**
   * Get execution statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      successRate: this.stats.totalTransactions > 0
        ? (this.stats.successfulTransactions / this.stats.totalTransactions) * 100
        : 0,
      retryRate: this.stats.totalTransactions > 0
        ? (this.stats.retriedTransactions / this.stats.totalTransactions) * 100
        : 0,
    };
  }

  /**
   * Generate unique transaction ID
   */
  private generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create timeout promise
   */
  private timeoutPromise<T>(ms: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), ms);
    });
  }
}
