/**
 * Shared constants for transaction parameter builders
 */

/**
 * Maximum value for uint24 fee encoding (2^24 - 1)
 */
export const UINT24_MAX = 16777215;

/**
 * Normalize fee to integer basis points for V3 encoding.
 * Handles both decimal format (0.003 = 0.3%) and integer format (3000 = 0.3%)
 * @param fee - Fee value in either decimal or basis points format
 * @returns Integer basis points suitable for uint24 encoding
 */
export function normalizeFee(fee: number): number {
  if (fee < 1) {
    // Fee is a decimal like 0.003, convert to basis points (multiply by 1M for V3)
    return Math.round(fee * 1_000_000);
  }
  // Fee is already in basis points like 3000
  return Math.round(fee);
}

/**
 * BuildResult interface that defines the structure for the result of a build.
 * @interface BuildResult
 * @property {object} params - The encoded parameters for the transaction.
 * @property {string} typeString - The ABI type string for encoding.
 * @property {string} borrowTokenAddress - The address of the token being borrowed.
 */
export interface BuildResult {
  params: object;
  typeString: string;
  borrowTokenAddress: string;
}

/**
 * SimulationResult interface that defines the structure for the result of a simulation.
 * @interface SimulationResult
 * @property {bigint} initialAmount - The initial borrow amount (1n for gas estimation).
 * @property {bigint} hop1AmountOutSimulated - The amount out after the first hop in the simulation.
 * @property {bigint} finalAmountSimulated - The final amount after all hops in the simulation.
 */
export interface SimulationResult {
  initialAmount: bigint;
  hop1AmountOutSimulated: bigint;
  finalAmountSimulated: bigint;
}

/**
 * SwapStep interface defining the steps for multi-hop arbitrage paths.
 * @interface SwapStep
 * @property {number} dexType - The DEX type enum (0=UniV3, 1=Sushi, 2=DODO).
 * @property {string} pool - The liquidity pool address used for the swap.
 * @property {string} tokenIn - The address of the token being swapped in.
 * @property {string} tokenOut - The address of the token being swapped out.
 * @property {bigint} minOut - The minimum amount of output tokens (slippage protection).
 * @property {number} fee - The pool fee tier (e.g., 3000 for 0.3%, 500 for 0.05%).
 */
export interface SwapStep {
  dexType: number;
  pool: string;
  tokenIn: string;
  tokenOut: string;
  minOut: bigint;
  fee: number;
}

/**
 * DEX Type Enum
 * Maps DEX names to numeric identifiers for contract encoding.
 */
export enum DexType {
  UniswapV3 = 0,
  SushiSwap = 1,
  DODO = 2,
}

/**
 * Arbitrage Opportunity interface
 */
export interface ArbitrageOpportunity {
  type: 'spatial' | 'triangular' | 'multi-hop';
  path: ArbitragePath[];
  borrowToken: string;
  expectedProfit: bigint;
}

/**
 * Arbitrage Path step
 */
export interface ArbitragePath {
  dexName: string;
  poolAddress: string;
  tokenIn: string;
  tokenOut: string;
  fee: number;
  token0?: string;
  token1?: string;
}

/**
 * Configuration interface
 */
export interface Config {
  SLIPPAGE_TOLERANCE_BPS: number;
  [key: string]: unknown;
}
