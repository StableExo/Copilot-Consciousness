/**
 * ArbitrageOpportunity Model
 *
 * Complete arbitrage opportunity data structure with risk scoring and lifecycle management.
 * Extracted from AxionCitadel - Operation First Light validated
 * Source: https://github.com/metalxalloy/AxionCitadel
 */

import { PathStep } from './PathStep';

/**
 * Lifecycle status of arbitrage opportunity
 */
export enum OpportunityStatus {
  IDENTIFIED = 'identified', // Just discovered
  SIMULATED = 'simulated', // Simulation completed
  PENDING = 'pending', // Queued for execution
  EXECUTING = 'executing', // Currently executing
  EXECUTED = 'executed', // Successfully executed
  FAILED = 'failed', // Execution failed
  EXPIRED = 'expired', // Deadline passed
}

/**
 * Type of arbitrage opportunity
 */
export enum ArbitrageType {
  SPATIAL = 'spatial', // Cross-DEX arbitrage (same pair)
  TRIANGULAR = 'triangular', // 3-token cycle
  MULTI_HOP = 'multi_hop', // N-hop arbitrage
  FLASH_LOAN = 'flash_loan', // Flash loan arbitrage
}

/**
 * Complete arbitrage opportunity with risk scoring and lifecycle management
 */
export interface ArbitrageOpportunity {
  // Core identification
  opportunityId: string;
  arbType: ArbitrageType;
  timestamp: Date;
  status: OpportunityStatus;

  // Path information
  path: PathStep[];
  tokenAddresses: string[];
  poolAddresses: string[];
  protocols: string[];

  // Financial metrics
  inputAmount: number;
  expectedOutput: number;
  grossProfit: number;
  profitBps: number; // Profit in basis points

  // Flash loan details
  requiresFlashLoan: boolean;
  flashLoanAmount?: number;
  flashLoanToken?: string;
  flashLoanPool?: string;

  // Gas and fees
  estimatedGas: number;
  gasPriceGwei?: number;
  gasCostUsd?: number;
  flashLoanFee?: number;

  // Net profit
  netProfit?: number;
  netProfitMargin?: number;

  // Risk metrics
  riskScore?: number;
  slippageRisk?: number;

  // Execution tracking
  simulationProfit?: number;
  actualProfit?: number;
  txHash?: string;
  executionTime?: Date;
  errorMessage?: string;

  // Metadata
  metadata?: Record<string, unknown>;
}

/**
 * Valid status transitions for lifecycle management
 */
const VALID_TRANSITIONS: Record<OpportunityStatus, OpportunityStatus[]> = {
  [OpportunityStatus.IDENTIFIED]: [
    OpportunityStatus.SIMULATED,
    OpportunityStatus.EXPIRED,
    OpportunityStatus.FAILED,
  ],
  [OpportunityStatus.SIMULATED]: [
    OpportunityStatus.PENDING,
    OpportunityStatus.EXPIRED,
    OpportunityStatus.FAILED,
  ],
  [OpportunityStatus.PENDING]: [
    OpportunityStatus.EXECUTING,
    OpportunityStatus.EXPIRED,
    OpportunityStatus.FAILED,
  ],
  [OpportunityStatus.EXECUTING]: [OpportunityStatus.EXECUTED, OpportunityStatus.FAILED],
  [OpportunityStatus.EXECUTED]: [], // Terminal state
  [OpportunityStatus.FAILED]: [], // Terminal state
  [OpportunityStatus.EXPIRED]: [], // Terminal state
};

/**
 * Protocol risk scores for risk calculation
 */
const PROTOCOL_RISK_MAP: Record<string, number> = {
  uniswap_v2: 0.1,
  uniswap_v3: 0.15,
  sushiswap: 0.2,
  camelot: 0.25,
  unknown: 0.3,
};

/**
 * Calculate risk score for an opportunity
 *
 * Risk factors:
 * - Protocol risk: Each protocol has a base risk (0.1-0.3)
 * - Path length penalty: Longer paths = higher risk
 * - Slippage risk: Based on pool liquidity
 * - Flash loan risk: Additional risk if flash loan required
 *
 * Returns: Risk score from 0.0 (low risk) to 1.0 (high risk)
 */
export function calculateRiskScore(opportunity: ArbitrageOpportunity): number {
  // Calculate average protocol risk
  const protocolRisks = opportunity.protocols.map(
    (p) => PROTOCOL_RISK_MAP[p.toLowerCase()] ?? PROTOCOL_RISK_MAP.unknown
  );
  const avgProtocolRisk =
    protocolRisks.length > 0
      ? protocolRisks.reduce((sum, r) => sum + r, 0) / protocolRisks.length
      : PROTOCOL_RISK_MAP.unknown;

  // Path length penalty (each hop adds 0.05 risk)
  const pathLength = opportunity.path.length;
  const pathPenalty = Math.min(pathLength * 0.05, 0.3);

  // Flash loan risk (adds 0.1 if required)
  const flashLoanRisk = opportunity.requiresFlashLoan ? 0.1 : 0.0;

  // Slippage risk (from stored value or default)
  const slippageRisk = opportunity.slippageRisk ?? 0.1;

  // Combine risks (weighted average)
  const totalRisk =
    avgProtocolRisk * 0.3 + pathPenalty * 0.2 + flashLoanRisk * 0.2 + slippageRisk * 0.3;

  // Normalize to 0-1 range
  return Math.min(totalRisk, 1.0);
}

/**
 * Update opportunity status with lifecycle validation
 */
export function updateOpportunityStatus(
  opportunity: ArbitrageOpportunity,
  newStatus: OpportunityStatus,
  error?: string
): boolean {
  const validTransitions = VALID_TRANSITIONS[opportunity.status] ?? [];

  if (validTransitions.includes(newStatus)) {
    opportunity.status = newStatus;
    if (newStatus === OpportunityStatus.FAILED && error) {
      opportunity.errorMessage = error;
    }
    return true;
  }

  console.warn(`Invalid status transition: ${opportunity.status} -> ${newStatus}`);
  return false;
}

/**
 * Generate parameters for profit simulation
 */
export function generateSimulationParams(
  opportunity: ArbitrageOpportunity
): Record<string, unknown> {
  return {
    opportunityId: opportunity.opportunityId,
    arbType: opportunity.arbType,
    path: opportunity.path,
    inputAmount: opportunity.inputAmount,
    tokenAddresses: opportunity.tokenAddresses,
    poolAddresses: opportunity.poolAddresses,
    protocols: opportunity.protocols,
    flashLoanAmount: opportunity.requiresFlashLoan ? opportunity.flashLoanAmount : 0,
    flashLoanToken: opportunity.flashLoanToken,
    estimatedGas: opportunity.estimatedGas,
    gasPriceGwei: opportunity.gasPriceGwei,
  };
}

/**
 * Update opportunity with simulation results
 */
export function updateSimulationResults(
  opportunity: ArbitrageOpportunity,
  simulationData: {
    netProfit?: number;
    gasUsed?: number;
  }
): void {
  opportunity.simulationProfit = simulationData.netProfit ?? 0;

  if (simulationData.gasUsed !== undefined) {
    opportunity.estimatedGas = simulationData.gasUsed;
  }

  // Update status
  if (opportunity.simulationProfit > 0) {
    updateOpportunityStatus(opportunity, OpportunityStatus.SIMULATED);
  } else {
    updateOpportunityStatus(opportunity, OpportunityStatus.FAILED, 'Simulation showed no profit');
  }
}

/**
 * Update opportunity with execution results
 */
export function updateExecutionResults(
  opportunity: ArbitrageOpportunity,
  txHash: string,
  actualProfit: number,
  gasUsed: number,
  success: boolean = true
): void {
  opportunity.txHash = txHash;
  opportunity.actualProfit = actualProfit;
  opportunity.estimatedGas = gasUsed;
  opportunity.executionTime = new Date();

  if (success) {
    updateOpportunityStatus(opportunity, OpportunityStatus.EXECUTED);
  } else {
    updateOpportunityStatus(opportunity, OpportunityStatus.FAILED, 'Execution reverted');
  }
}

/**
 * Calculate profit margin as percentage
 */
export function calculateProfitMargin(opportunity: ArbitrageOpportunity): number {
  const profit = opportunity.netProfit ?? opportunity.grossProfit;

  if (opportunity.inputAmount > 0) {
    return (profit / opportunity.inputAmount) * 100;
  }

  return 0;
}

/**
 * Create an ArbitrageOpportunity from path steps
 */
export function createArbitrageOpportunity(params: {
  opportunityId: string;
  arbType: ArbitrageType;
  path: PathStep[];
  inputAmount: number;
  requiresFlashLoan?: boolean;
  flashLoanAmount?: number;
  flashLoanToken?: string;
  flashLoanPool?: string;
  estimatedGas?: number;
  metadata?: Record<string, unknown>;
}): ArbitrageOpportunity {
  if (params.path.length === 0) {
    throw new Error('Opportunity must have at least one path step');
  }

  const firstStep = params.path[0];
  const lastStep = params.path[params.path.length - 1];

  // Extract unique tokens, pools, and protocols
  const tokenSet = new Set<string>();
  const poolAddresses: string[] = [];
  const protocols: string[] = [];

  for (const step of params.path) {
    tokenSet.add(step.tokenIn);
    tokenSet.add(step.tokenOut);
    poolAddresses.push(step.poolAddress);
    protocols.push(step.protocol);
  }

  const tokenAddresses = Array.from(tokenSet);
  const expectedOutput = lastStep.expectedOutput;

  // Calculate gross profit (for cyclic routes)
  const isCyclic = firstStep.tokenIn === lastStep.tokenOut;
  const grossProfit = isCyclic ? expectedOutput - params.inputAmount : 0;

  // Calculate profit in basis points
  const profitBps =
    params.inputAmount > 0 ? Math.floor((grossProfit / params.inputAmount) * 10000) : 0;

  // Estimate gas if not provided
  const estimatedGas = params.estimatedGas ?? params.path.length * 150000;

  const opportunity: ArbitrageOpportunity = {
    opportunityId: params.opportunityId,
    arbType: params.arbType,
    timestamp: new Date(),
    status: OpportunityStatus.IDENTIFIED,
    path: params.path,
    tokenAddresses,
    poolAddresses,
    protocols,
    inputAmount: params.inputAmount,
    expectedOutput,
    grossProfit,
    profitBps,
    requiresFlashLoan: params.requiresFlashLoan ?? false,
    flashLoanAmount: params.flashLoanAmount,
    flashLoanToken: params.flashLoanToken,
    flashLoanPool: params.flashLoanPool,
    estimatedGas,
    metadata: params.metadata,
  };

  // Calculate risk score
  opportunity.riskScore = calculateRiskScore(opportunity);

  return opportunity;
}

/**
 * Convert opportunity to JSON-serializable object
 */
export function opportunityToJSON(opportunity: ArbitrageOpportunity): Record<string, unknown> {
  return {
    opportunityId: opportunity.opportunityId,
    arbType: opportunity.arbType,
    status: opportunity.status,
    timestamp: opportunity.timestamp.toISOString(),
    path: opportunity.path,
    tokenAddresses: opportunity.tokenAddresses,
    poolAddresses: opportunity.poolAddresses,
    protocols: opportunity.protocols,
    inputAmount: opportunity.inputAmount,
    expectedOutput: opportunity.expectedOutput,
    grossProfit: opportunity.grossProfit,
    profitBps: opportunity.profitBps,
    netProfit: opportunity.netProfit,
    netProfitMargin: opportunity.netProfitMargin,
    requiresFlashLoan: opportunity.requiresFlashLoan,
    flashLoanAmount: opportunity.flashLoanAmount,
    estimatedGas: opportunity.estimatedGas,
    gasPriceGwei: opportunity.gasPriceGwei,
    gasCostUsd: opportunity.gasCostUsd,
    riskScore: opportunity.riskScore,
    simulationProfit: opportunity.simulationProfit,
    actualProfit: opportunity.actualProfit,
    txHash: opportunity.txHash,
    executionTime: opportunity.executionTime?.toISOString(),
    errorMessage: opportunity.errorMessage,
    metadata: opportunity.metadata,
  };
}
