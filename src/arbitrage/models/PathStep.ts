/**
 * PathStep Model
 *
 * Represents a single swap step in an arbitrage path.
 * Extracted from AxionCitadel - Operation First Light validated
 */

export interface PathStep {
  /** Step index in the path (0-based) */
  step: number;

  /** Pool contract address */
  poolAddress: string;

  /** Protocol/DEX name (e.g., "uniswap_v3", "sushiswap") */
  protocol: string;

  /** Input token address */
  tokenIn: string;

  /** Output token address */
  tokenOut: string;

  /** Input amount (in token units) */
  amountIn: number;

  /** Expected output amount (in token units) */
  expectedOutput: number;

  /** Pool fee in basis points (e.g., 30 = 0.3%) */
  feeBps: number;

  /** Optional: Reserve of token0 for price impact calculation */
  reserve0?: number;

  /** Optional: Reserve of token1 for price impact calculation */
  reserve1?: number;
}

/**
 * Create a PathStep from minimal parameters
 */
export function createPathStep(params: {
  step: number;
  poolAddress: string;
  protocol: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  expectedOutput: number;
  feeBps: number;
  reserve0?: number;
  reserve1?: number;
}): PathStep {
  return {
    step: params.step,
    poolAddress: params.poolAddress,
    protocol: params.protocol,
    tokenIn: params.tokenIn,
    tokenOut: params.tokenOut,
    amountIn: params.amountIn,
    expectedOutput: params.expectedOutput,
    feeBps: params.feeBps,
    reserve0: params.reserve0,
    reserve1: params.reserve1,
  };
}
