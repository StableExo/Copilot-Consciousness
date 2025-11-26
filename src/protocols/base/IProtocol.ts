/**
 * IProtocol - Protocol Interface
 *
 * Base interface for all protocol implementations.
 * Defines the contract that all DEX protocol adapters must follow.
 */

export interface SwapParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  amountOutMinimum: bigint;
  recipient: string;
  deadline?: number;
  slippageTolerance?: number;
}

export interface QuoteParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  fee?: number;
}

export interface QuoteResult {
  amountOut: bigint;
  path: string[];
  fees: number[];
  gasEstimate?: bigint;
}

export interface PoolInfo {
  address: string;
  token0: string;
  token1: string;
  fee: number;
  liquidity: bigint;
  sqrtPriceX96?: bigint;
}

export interface ProtocolMetadata {
  name: string;
  type: string;
  version: string;
  chainId: number;
  router: string;
  factory: string;
  quoter?: string;
  features: string[];
}

/**
 * Base protocol interface
 */
export interface IProtocol {
  /**
   * Get protocol metadata
   */
  getMetadata(): ProtocolMetadata;

  /**
   * Get quote for a swap
   */
  getQuote(params: QuoteParams): Promise<QuoteResult>;

  /**
   * Execute a swap
   */
  executeSwap(params: SwapParams): Promise<string>;

  /**
   * Get pool information
   */
  getPool(token0: string, token1: string, fee?: number): Promise<PoolInfo>;

  /**
   * Check if protocol supports a feature
   */
  supportsFeature(feature: string): boolean;

  /**
   * Check if protocol is active on the current chain
   */
  isActive(): Promise<boolean>;
}
