export interface Token {
  address: string;
  decimals: number;
  symbol: string;
}

export interface Pool {
  fee: number;
  address: string;
}

export interface ArbitragePath {
  dexName: string;
  poolAddress: string;
  tokenIn: string;
  tokenOut: string;
  fee: number;
}

export interface ArbitrageOpportunity {
  type: 'spatial' | 'triangular';
  path: ArbitragePath[] | Pool[];
  pools?: Pool[];
  tokenA: Token;
  tokenB: Token;
  tokenC: Token;
}

export interface SimulationResult {
  initialAmount: bigint;
  amountOutHop1: bigint;
  finalAmount: bigint;
}

export interface ArbitrageConfig {
  SLIPPAGE_TOLERANCE_BPS: number;
}

export interface PoolState {
  address: string;
  dexName: string;
  token0: Token;
  token1: Token;
  fee: number;
  reserve0: bigint;
  reserve1: bigint;
  baseTokenAddress?: string;
}
