/**
 * ChainAdapter - Base interface for chain-specific adapters
 *
 * Defines standard interface for interacting with different blockchains
 */

export interface TokenBalance {
  token: string;
  balance: bigint;
  decimals: number;
}

export interface SwapEstimate {
  amountOut: bigint;
  gasEstimate: number;
  gasCost: bigint;
  priceImpact: number;
  route: string[];
}

export interface SwapParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  minAmountOut: bigint;
  deadline: number;
  recipient: string;
}

export interface TokenPrice {
  token: string;
  priceUSD: number;
  timestamp: number;
  source: string;
}

export abstract class ChainAdapter {
  abstract chainId: number | string;
  abstract chainType: 'EVM' | 'Solana';

  /**
   * Get token balance for an address
   */
  abstract getTokenBalance(tokenAddress: string, walletAddress: string): Promise<TokenBalance>;

  /**
   * Estimate gas cost for a swap
   */
  abstract estimateSwapGas(
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint,
    dexAddress: string
  ): Promise<number>;

  /**
   * Execute a swap on this chain
   */
  abstract executeSwap(params: SwapParams, dexAddress: string): Promise<string>; // Returns transaction hash

  /**
   * Get current token price
   */
  abstract getTokenPrice(tokenAddress: string): Promise<TokenPrice>;

  /**
   * Get multiple token prices in parallel
   */
  async getTokenPrices(tokenAddresses: string[]): Promise<TokenPrice[]> {
    const pricePromises = tokenAddresses.map((addr) => this.getTokenPrice(addr));
    return Promise.all(pricePromises);
  }

  /**
   * Estimate swap output and costs
   */
  abstract estimateSwap(
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint,
    dexAddress: string
  ): Promise<SwapEstimate>;

  /**
   * Get native currency balance
   */
  abstract getNativeBalance(walletAddress: string): Promise<bigint>;

  /**
   * Wait for transaction confirmation
   */
  abstract waitForTransaction(txHash: string, timeout?: number): Promise<boolean>;

  /**
   * Get current gas price
   */
  abstract getGasPrice(): Promise<bigint>;

  /**
   * Check if token exists
   */
  abstract isValidToken(tokenAddress: string): Promise<boolean>;
}

export default ChainAdapter;
