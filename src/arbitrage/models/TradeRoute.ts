/**
 * TradeRoute Model
 * 
 * Aggregates multiple path steps into a complete trade route.
 * Extracted from AxionCitadel - Operation First Light validated
 */

import { PathStep } from './PathStep';

export interface TradeRoute {
  /** Unique route identifier */
  routeId: string;

  /** Array of path steps making up this route */
  path: PathStep[];

  /** Start token address */
  startToken: string;

  /** End token address */
  endToken: string;

  /** Input amount (in start token units) */
  inputAmount: number;

  /** Expected final output (in end token units) */
  expectedOutput: number;

  /** Gross profit (expectedOutput - inputAmount, for cyclic routes) */
  grossProfit: number;

  /** Profit in basis points */
  profitBps: number;

  /** Total gas estimate for all swaps */
  estimatedGas: number;

  /** Whether this route requires a flash loan */
  requiresFlashLoan: boolean;

  /** Flash loan amount if required */
  flashLoanAmount?: number;

  /** Flash loan token address if required */
  flashLoanToken?: string;

  /** Route metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Create a TradeRoute from path steps
 */
export function createTradeRoute(params: {
  routeId: string;
  path: PathStep[];
  inputAmount: number;
  requiresFlashLoan?: boolean;
  flashLoanAmount?: number;
  flashLoanToken?: string;
  metadata?: Record<string, unknown>;
}): TradeRoute {
  if (params.path.length === 0) {
    throw new Error('TradeRoute must have at least one path step');
  }

  const firstStep = params.path[0];
  const lastStep = params.path[params.path.length - 1];

  const startToken = firstStep.tokenIn;
  const endToken = lastStep.tokenOut;
  const expectedOutput = lastStep.expectedOutput;

  // Calculate gross profit (for cyclic routes where start === end)
  const grossProfit = startToken === endToken ? expectedOutput - params.inputAmount : 0;

  // Calculate profit in basis points
  const profitBps = params.inputAmount > 0 
    ? Math.floor((grossProfit / params.inputAmount) * 10000)
    : 0;

  // Calculate total gas estimate
  const estimatedGas = params.path.reduce((sum, step) => {
    // Estimate 150k gas per swap step
    return sum + 150000;
  }, 0);

  return {
    routeId: params.routeId,
    path: params.path,
    startToken,
    endToken,
    inputAmount: params.inputAmount,
    expectedOutput,
    grossProfit,
    profitBps,
    estimatedGas,
    requiresFlashLoan: params.requiresFlashLoan ?? false,
    flashLoanAmount: params.flashLoanAmount,
    flashLoanToken: params.flashLoanToken,
    metadata: params.metadata,
  };
}

/**
 * Get all unique token addresses in route
 */
export function getRouteTokens(route: TradeRoute): string[] {
  const tokens = new Set<string>();
  
  for (const step of route.path) {
    tokens.add(step.tokenIn);
    tokens.add(step.tokenOut);
  }

  return Array.from(tokens);
}

/**
 * Get all pool addresses in route
 */
export function getRoutePools(route: TradeRoute): string[] {
  return route.path.map(step => step.poolAddress);
}

/**
 * Get all protocols used in route
 */
export function getRouteProtocols(route: TradeRoute): string[] {
  const protocols = new Set<string>();
  
  for (const step of route.path) {
    protocols.add(step.protocol);
  }

  return Array.from(protocols);
}

/**
 * Check if route is cyclic (starts and ends with same token)
 */
export function isCyclicRoute(route: TradeRoute): boolean {
  return route.startToken === route.endToken;
}
