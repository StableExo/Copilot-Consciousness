/**
 * Arbitrage Types
 * 
 * Types and interfaces for multi-hop arbitrage functionality
 */

/**
 * Represents a token in the arbitrage graph
 */
export interface Token {
  address: string;
  symbol: string;
  decimals: number;
}

/**
 * Represents a liquidity pool edge in the arbitrage graph
 */
export interface PoolEdge {
  poolAddress: string;
  dexName: string;
  tokenIn: string;
  tokenOut: string;
  reserve0: bigint;
  reserve1: bigint;
  fee: number; // Fee as a decimal (e.g., 0.003 for 0.3%)
  gasEstimate: number;
}

/**
 * Represents a single hop in an arbitrage path
 */
export interface ArbitrageHop {
  dexName: string;
  poolAddress: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  amountOut: bigint;
  fee: number;
  gasEstimate: number;
  reserve0?: bigint; // Optional: reserve for price impact calculation
  reserve1?: bigint; // Optional: reserve for price impact calculation
}

/**
 * Represents a complete arbitrage path
 */
export interface ArbitragePath {
  hops: ArbitrageHop[];
  startToken: string;
  endToken: string;
  estimatedProfit: bigint;
  totalGasCost: bigint;
  netProfit: bigint;
  totalFees: number;
  slippageImpact: number;
}

/**
 * Configuration for pathfinding
 */
export interface PathfindingConfig {
  maxHops: number;
  minProfitThreshold: bigint;
  maxSlippage: number;
  gasPrice: bigint;
}

/**
 * Result of profitability calculation
 */
export interface ProfitabilityResult {
  profitable: boolean;
  estimatedProfit: bigint;
  totalFees: bigint;
  totalGas: bigint;
  netProfit: bigint;
  roi: number; // Return on investment as percentage
  slippageImpact: number;
}
