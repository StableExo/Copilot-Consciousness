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

import { Provider, Signer, TransactionRequest, TransactionResponse, getAddress } from 'ethers';
import { Mutex } from 'async-mutex';
import { logger } from '../utils/logger'; // Assuming you have a logger utility

// Error patterns for nonce-related issues
const NONCE_ERROR_PATTERNS = {
  CODE: 'NONCE_EXPIRED',
  MESSAGES: ['nonce too low', 'invalid nonce', 'replacement transaction underpriced'],
} as const;

// Define a specific error type for nonce-related issues
export class NonceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonceError';
  }
}

export class NonceManager extends Signer {
  private _address?: string;
  private currentNonce: number = -1;
  private readonly mutex = new Mutex();
  provider: Provider | null;

  constructor(public readonly signer: Signer) {
    super();
    if (!signer || !signer.provider || typeof signer.getAddress !== 'function') {
      throw new Error("NonceManager requires a valid Ethers Signer instance with a provider.");
    }
    // Set provider from signer
    this.provider = signer.provider;
  }

  // Connect the async constructor pattern
  static async create(signer: Signer): Promise<NonceManager> {
    const manager = new NonceManager(signer);
    manager._address = await signer.getAddress();
    logger.debug(`[NonceManager] Instance created for address: ${manager._address}`);
    return manager;
  }

  async getAddress(): Promise<string> {
    if (!this._address) {
      this._address = await this.signer.getAddress();
    }
    return this._address;
  }

  get address(): string {
    if (!this._address) {
      throw new Error('Address not initialized. Use NonceManager.create() or call getAddress() first.');
    }
    return this._address;
  }

  connect(provider: Provider): NonceManager {
    const newSigner = this.signer.connect(provider);
    // State (nonce) is not carried over, which is standard for `connect`
    const newManager = new NonceManager(newSigner);
    // copy address if already initialized
    if (this._address) {
      newManager._address = this._address;
    }
    return newManager;
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    return this.signer.signMessage(message);
  }

  async signTransaction(transaction: TransactionRequest): Promise<string> {
    if (!this.signer.signTransaction) {
      throw new Error('signTransaction is not supported by the parent signer');
    }
    return this.signer.signTransaction(transaction);
  }

  async signTypedData(
    domain: any,
    types: Record<string, Array<any>>,
    value: Record<string, any>
  ): Promise<string> {
    return this.signer.signTypedData(domain, types, value);
  }

  async getNonce(blockTag?: any): Promise<number> {
    return await this.getNextNonce();
  }

  async populateCall(tx: TransactionRequest): Promise<TransactionRequest> {
    if (!this.signer.populateCall) {
      throw new Error('populateCall is not supported by the parent signer');
    }
    return this.signer.populateCall(tx);
  }

  async populateTransaction(tx: TransactionRequest): Promise<TransactionRequest> {
    if (!this.signer.populateTransaction) {
      throw new Error('populateTransaction is not supported by the parent signer');
    }
    const nonce = await this.getNextNonce();
    return this.signer.populateTransaction({ ...tx, nonce });
  }

  async estimateGas(tx: TransactionRequest): Promise<bigint> {
    return this.signer.estimateGas(tx);
  }

  async call(tx: TransactionRequest): Promise<string> {
    return this.signer.call(tx);
  }

  async resolveName(name: string): Promise<string | null> {
    return this.signer.resolveName(name);
  }

  // Required for ethers v6 Signer compatibility
  async populateAuthorization(tx: any): Promise<any> {
    // Delegate to underlying signer if available, otherwise return as-is
    if (typeof (this.signer as any).populateAuthorization === 'function') {
      return (this.signer as any).populateAuthorization(tx);
    }
    return tx;
  }

  // Required for ethers v6 Signer compatibility  
  async authorize(tx: any): Promise<any> {
    // Delegate to underlying signer if available, otherwise no-op
    if (typeof (this.signer as any).authorize === 'function') {
      return (this.signer as any).authorize(tx);
    }
    return tx;
  }

  async sendTransaction(tx: TransactionRequest): Promise<TransactionResponse> {
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`${functionSig} Error sending transaction via underlying signer: ${message}`);
      
      // Check if this is a nonce-related error
      if (this.isNonceError(error)) {
        logger.warn(`${functionSig} Nonce error detected during send, triggering resync...`);
        // Do not await resync; let the error propagate up immediately
        this.resyncNonce().catch(resyncErr => logger.error(`${functionSig} Background resync failed: ${resyncErr.message}`));
      }
      throw error;
    }
  }

  /**
   * Checks if an error is nonce-related
   */
  private isNonceError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }
    const err = error as Record<string, unknown>;
    const message = (err.message as string)?.toLowerCase() || '';
    const code = err.code;
    
    // Check error code
    if (code === NONCE_ERROR_PATTERNS.CODE) {
      return true;
    }
    
    // Check error message patterns
    return NONCE_ERROR_PATTERNS.MESSAGES.some(pattern => message.includes(pattern));
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`${functionSig} CRITICAL: Failed to initialize nonce: ${message}`);
      throw new NonceError(`Nonce initialization failed: ${message}`);
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
      } catch (fetchError: unknown) {
        const message = fetchError instanceof Error ? fetchError.message : String(fetchError);
        logger.error(`${functionSig} Error fetching pending transaction count: ${message}`);
        throw new NonceError(`Failed to fetch pending nonce: ${message}`);
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`${functionSig} Failed to resync nonce: ${message}`);
      throw new NonceError(`Nonce resynchronization failed: ${message}`);
    } finally {
      release();
      logger.debug(`${functionSig} Mutex released for resyncNonce.`);
    }
  }
}
