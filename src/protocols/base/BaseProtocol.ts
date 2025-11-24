/**
 * BaseProtocol - Abstract base class for protocol implementations
 * 
 * Provides common functionality and utilities for protocol adapters.
 */

import { ethers, BigNumber, Contract } ,Provider } from 'ethers';
import {
  IProtocol,
  ProtocolMetadata,
  SwapParams,
  QuoteParams,
  QuoteResult,
  PoolInfo,
} from './IProtocol';

export abstract class BaseProtocol implements IProtocol {
  protected provider: Provider;
  protected signer?: ethers.Signer;
  protected metadata: ProtocolMetadata;
  protected routerContract?: Contract;
  protected factoryContract?: Contract;
  protected quoterContract?: Contract;

  constructor(
    provider: Provider,
    metadata: ProtocolMetadata,
    signer?: ethers.Signer
  ) {
    this.provider = provider;
    this.metadata = metadata;
    this.signer = signer;
  }

  /**
   * Get protocol metadata
   */
  getMetadata(): ProtocolMetadata {
    return { ...this.metadata };
  }

  /**
   * Check if protocol supports a feature
   */
  supportsFeature(feature: string): boolean {
    return this.metadata.features.includes(feature);
  }

  /**
   * Check if protocol is active on the current chain
   */
  async isActive(): Promise<boolean> {
    try {
      const network = await this.provider.getNetwork();
      return network.chainId === this.metadata.chainId;
    } catch (error) {
      console.error('Error checking protocol active status:', error);
      return false;
    }
  }

  /**
   * Calculate deadline timestamp
   */
  protected calculateDeadline(seconds: number = 300): number {
    return Math.floor(Date.now() / 1000) + seconds;
  }

  /**
   * Calculate minimum amount out with slippage
   */
  protected calculateMinAmountOut(
    amountOut: BigNumber,
    slippageTolerance: number = 0.5
  ): BigNumber {
    const slippageBps = Math.floor(slippageTolerance * 100); // Convert to basis points
    return amountOut.mul(10000 - slippageBps).div(10000);
  }

  /**
   * Validate swap parameters
   */
  protected validateSwapParams(params: SwapParams): void {
    if (!isAddress(params.tokenIn)) {
      throw new Error(`Invalid tokenIn address: ${params.tokenIn}`);
    }
    if (!isAddress(params.tokenOut)) {
      throw new Error(`Invalid tokenOut address: ${params.tokenOut}`);
    }
    if (!isAddress(params.recipient)) {
      throw new Error(`Invalid recipient address: ${params.recipient}`);
    }
    if (params.amountIn <= 0n) {
      throw new Error('Amount in must be greater than 0');
    }
    if (params.amountOutMinimum < 0n) {
      throw new Error('Amount out minimum cannot be negative');
    }
  }

  /**
   * Abstract methods to be implemented by concrete protocols
   */
  abstract getQuote(params: QuoteParams): Promise<QuoteResult>;
  abstract executeSwap(params: SwapParams): Promise<string>;
  abstract getPool(token0: string, token1: string, fee?: number): Promise<PoolInfo>;
}
