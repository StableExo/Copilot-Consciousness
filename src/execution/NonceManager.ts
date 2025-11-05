/**
 * src/execution/NonceManager.ts
 * 
 * A TypeScript port of the battle-tested NonceManager from PROJECT-HAVOC.
 * This module provides a custom Ethers.js Signer that wraps an existing signer
 * to provide reliable, mutex-protected nonce tracking. It prevents race
 * conditions and automatically handles common nonce-related errors.
 *
 * Key Features from PROJECT-HAVOC:
 * - Extends Signer for seamless integration with ethers.js v5.
 * - Uses 'async-mutex' to ensure atomic nonce retrieval and incrementation.
 * - Auto-resyncs with the blockchain on "nonce too low" errors.
 * - Lazy initialization of the nonce on the first transaction.
 * - Compares against 'pending' nonce to stay in sync with the mempool.
 */

import { ethers, Signer, providers } from 'ethers';
import { Mutex } from 'async-mutex';
import { logger } from '../utils/logger'; // Assuming you have a logger utility

// Define a specific error type for nonce-related issues
export class NonceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonceError';
  }
}

export class NonceManager extends Signer {
  public address: string;
  private currentNonce: number = -1;
  private readonly mutex = new Mutex();

  constructor(public readonly signer: Signer) {
    super();
    if (!signer || !signer.provider || typeof signer.getAddress !== 'function') {
      throw new Error("NonceManager requires a valid Ethers Signer instance with a provider.");
    }
    // Provider is defined on Signer base class
    ethers.utils.defineReadOnly(this, 'provider', signer.provider);
    this.address = ''; // Will be set in an async factory or initializer
  }

  // Connect the async constructor pattern
  static async create(signer: Signer): Promise<NonceManager> {
    const manager = new NonceManager(signer);
    manager.address = await signer.getAddress();
    logger.debug(`[NonceManager] Instance created for address: ${manager.address}`);
    return manager;
  }

  async getAddress(): Promise<string> {
    return this.address;
  }

  connect(provider: providers.Provider): NonceManager {
    const newSigner = this.signer.connect(provider);
    // State (nonce) is not carried over, which is standard for `connect`
    const newManager = new NonceManager(newSigner);
    // copy address
    newManager.address = this.address;
    return newManager;
  }

  async signMessage(message: ethers.utils.Bytes | string): Promise<string> {
    return this.signer.signMessage(message);
  }

  async signTransaction(transaction: ethers.providers.TransactionRequest): Promise<string> {
    if (!this.signer.signTransaction) {
      throw new Error('signTransaction is not supported by the parent signer');
    }
    return this.signer.signTransaction(transaction);
  }

  async sendTransaction(tx: ethers.providers.TransactionRequest): Promise<ethers.providers.TransactionResponse> {
    const functionSig = `[NonceManager Address: ${this.address}]`;
    logger.debug(`${functionSig} sendTransaction called...`);

    if (typeof this.signer.sendTransaction !== 'function') {
      throw new Error("Underlying signer does not support sendTransaction");
    }

    const nonce = await this.getNextNonce();
    const populatedTx = { ...tx, nonce };

    if (populatedTx.chainId === undefined) {
      const network = await this.provider?.getNetwork();
      if (network) {
        populatedTx.chainId = network.chainId;
      } else {
        logger.warn(`${functionSig} Could not determine chainId for transaction.`);
      }
    }
    logger.debug(`${functionSig} Populated transaction with nonce ${nonce} and chainId ${populatedTx.chainId}`);

    try {
      logger.debug(`${functionSig} Delegating sendTransaction to underlying signer...`);
      const txResponse = await this.signer.sendTransaction(populatedTx);
      logger.info(`${functionSig} Underlying signer submitted transaction. Hash: ${txResponse.hash}`);
      return txResponse;
    } catch (error: any) {
      logger.error(`${functionSig} Error sending transaction via underlying signer: ${error.message}`);
      const message = error.message?.toLowerCase() || '';
      const code = error.code;
      if (code === 'NONCE_EXPIRED' || message.includes('nonce too low') || message.includes('invalid nonce')) {
        logger.warn(`${functionSig} Nonce error detected during send, triggering resync...`);
        // Do not await resync; let the error propagate up immediately
        this.resyncNonce().catch(resyncErr => logger.error(`${functionSig} Background resync failed: ${resyncErr.message}`));
      }
      throw error;
    }
  }
  
  /**
   * Initializes the internal nonce count by fetching the 'latest' transaction count.
   */
  async initialize(): Promise<void> {
    const functionSig = `[NonceManager Address: ${this.address}]`;
    logger.info(`${functionSig} Initializing nonce...`);
    try {
      if (!this.provider) throw new Error("Provider not available for nonce initialization.");
      this.currentNonce = await this.provider.getTransactionCount(this.address, 'latest');
      logger.info(`${functionSig} Initial nonce set to: ${this.currentNonce}`);
    } catch (error: any) {
      logger.error(`${functionSig} CRITICAL: Failed to initialize nonce: ${error.message}`);
      throw new NonceError(`Nonce initialization failed: ${error.message}`);
    }
  }

  /**
   * Gets the next available nonce, ensuring atomicity with a mutex.
   */
  async getNextNonce(): Promise<number> {
    const functionSig = `[NonceManager Address: ${this.address}]`;
    const release = await this.mutex.acquire();
    logger.debug(`${functionSig} Mutex acquired for getNextNonce.`);
    try {
      if (this.currentNonce < 0) {
        logger.warn(`${functionSig} Nonce not initialized. Attempting initialization within lock...`);
        await this.initialize();
      }

      let pendingNonce: number;
      try {
        if (!this.provider) throw new Error("Provider not available for fetching pending nonce.");
        pendingNonce = await this.provider.getTransactionCount(this.address, 'pending');
      } catch (fetchError: any) {
        logger.error(`${functionSig} Error fetching pending transaction count: ${fetchError.message}`);
        throw new NonceError(`Failed to fetch pending nonce: ${fetchError.message}`);
      }

      if (pendingNonce > this.currentNonce) {
        logger.info(`${functionSig} Pending nonce (${pendingNonce}) is higher than current internal nonce (${this.currentNonce}). Updating internal nonce.`);
        this.currentNonce = pendingNonce;
      }

      const nonceToUse = this.currentNonce;
      this.currentNonce++;
      logger.info(`${functionSig} Providing nonce: ${nonceToUse}, next internal nonce will be: ${this.currentNonce}`);
      return nonceToUse;
    } finally {
      release();
      logger.debug(`${functionSig} Mutex released for getNextNonce.`);
    }
  }

  /**
   * Resynchronizes the internal nonce count with the blockchain.
   */
  async resyncNonce(): Promise<void> {
    const functionSig = `[NonceManager Address: ${this.address}]`;
    const release = await this.mutex.acquire();
    logger.warn(`${functionSig} Mutex acquired for resyncNonce...`);
    try {
      logger.warn(`${functionSig} Resyncing nonce... Resetting internal count and fetching latest.`);
      this.currentNonce = -1; // Reset internal state
      await this.initialize(); // Re-fetch 'latest' nonce
      logger.info(`${functionSig} Nonce resync completed. New internal nonce: ${this.currentNonce}`);
    } catch (error: any) {
      logger.error(`${functionSig} Failed to resync nonce: ${error.message}`);
      throw new NonceError(`Nonce resynchronization failed: ${error.message}`);
    } finally {
      release();
      logger.debug(`${functionSig} Mutex released for resyncNonce.`);
    }
  }
}
