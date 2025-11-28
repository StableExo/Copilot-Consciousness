/**
 * Aave V3 Protocol Implementation
 *
 * Implements the IProtocol interface for Aave V3 flash loans
 */

import { ethers, Provider } from 'ethers';
import { BaseProtocol } from '../../base/BaseProtocol';
import {
  SwapParams,
  QuoteParams,
  QuoteResult,
  PoolInfo,
  ProtocolMetadata,
} from '../../base/IProtocol';

export class AaveV3Protocol extends BaseProtocol {
  constructor(provider: Provider, chainId: number, signer?: ethers.Signer) {
    const metadata: ProtocolMetadata = {
      name: 'Aave V3',
      type: 'lending',
      version: '3',
      chainId,
      router: '', // Aave doesn't use a router
      factory: '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb', // Pool Address Provider
      features: ['flash-loan', 'lending', 'borrowing'],
    };

    super(provider, metadata, signer);
  }

  async getQuote(params: QuoteParams): Promise<QuoteResult> {
    // For Aave, quote is just the flash loan fee calculation
    const flashLoanFee = (params.amountIn * 9n) / 10000n; // 0.09% fee

    return {
      amountOut: params.amountIn - flashLoanFee,
      path: [params.tokenIn],
      fees: [9], // 9 basis points
      gasEstimate: 200000n,
    };
  }

  async executeSwap(_params: SwapParams): Promise<string> {
    throw new Error('Aave does not support swaps - use flash loan functionality');
  }

  async getPool(token0: string, token1: string, _fee?: number): Promise<PoolInfo> {
    // Aave doesn't have traditional pools
    return {
      address: this.metadata.factory,
      token0,
      token1,
      fee: 9, // Flash loan fee in basis points
      liquidity: 0n,
    };
  }

  /**
   * Get flash loan premium (fee)
   */
  getFlashLoanPremium(): number {
    return 9; // 0.09% = 9 basis points
  }
}
