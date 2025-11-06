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
  flashLoanProvider?: FlashLoanProvider; // Optional: Flash loan provider for this path
  flashLoanConfig?: FlashLoanConfig; // Optional: Flash loan configuration
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
  breakdown?: DetailedProfitBreakdown; // Optional detailed breakdown
  meetsThreshold?: boolean; // Optional threshold check
}

/**
 * Flash loan provider type
 */
export type FlashLoanProvider = 'aave' | 'uniswapv3';

/**
 * Flash loan configuration for different providers
 */
export interface FlashLoanConfig {
  provider: FlashLoanProvider;
  feePercentage: number; // Fee as decimal (e.g., 0.0009 for 0.09%)
  poolFee?: number; // For UniswapV3, the pool fee tier (e.g., 0.003 for 0.3%)
}

/**
 * Token price information from oracle
 */
export interface TokenPrice {
  tokenAddress: string;
  symbol: string;
  priceUSD: bigint; // Price in USD with 18 decimals
  decimals: number;
  timestamp: number;
}

/**
 * Detailed profit breakdown with all cost components
 */
export interface DetailedProfitBreakdown {
  initialAmount: bigint;          // Starting amount
  finalAmount: bigint;            // Final amount after all swaps
  grossProfit: bigint;            // finalAmount - initialAmount
  flashLoanFee: bigint;           // Flash loan fee in borrow token
  swapFees: bigint;               // Total DEX swap fees
  totalFees: bigint;              // flashLoanFee + swapFees
  gasCostWei: bigint;             // Gas cost in wei (smallest ETH unit)
  gasCostInToken: bigint;         // Gas cost in borrow token denomination
  gasCostInETH: bigint;           // Gas cost in wei (same as gasCostWei)
  netProfit: bigint;              // After all costs (grossProfit - totalFees - gasCostInToken)
  netProfitNative: bigint;        // Net profit in native currency (ETH/WETH)
  netProfitUSD: bigint;           // Net profit in USD (18 decimals)
  profitPercentage: number;       // Percentage gain
  roi: number;                    // Return on investment percentage
  meetsThreshold: boolean;        // Whether profit meets threshold
  profitable: boolean;            // Whether netProfit > 0
}

/**
 * Per-token-pair minimum profit thresholds
 * Key format: "TOKEN1/TOKEN2" (alphabetically sorted)
 */
export type ProfitThresholds = {
  [pair: string]: bigint;
};

/**
 * Price oracle interface for token price conversions
 */
export interface PriceOracle {
  /**
   * Get price of token in USD
   */
  getTokenPriceUSD(tokenAddress: string): Promise<bigint>;
  
  /**
   * Convert amount from one token to another
   */
  convertTokenAmount(
    fromToken: string,
    toToken: string,
    amount: bigint,
    fromDecimals: number,
    toDecimals: number
  ): Promise<bigint>;
  
  /**
   * Get ETH price in USD
   */
  getETHPriceUSD(): Promise<bigint>;
  
  /**
   * Update token price (for testing/manual updates)
   */
  updatePrice?(tokenAddress: string, priceUSD: bigint, decimals: number): void;
}
