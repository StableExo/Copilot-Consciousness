/**
 * Negotiator AI Agent - Type Definitions
 * 
 * Implements the "Negotiator" pattern from Gemini's MEV strategy combined with
 * Cooperative Game Theory principles:
 * - Takes bundles from Scout agents (friends/allies) - COALITION FORMATION
 * - Uses AI reasoning to combine non-conflicting bundles - COOPERATIVE STRATEGY
 * - Builds higher-value blocks than competitors - SUPERADDITIVITY
 * - Runs transparently on public mempool - TRANSPARENCY
 * - Distributes value fairly using Shapley values - FAIR ALLOCATION
 */

import { ArbitrageOpportunity } from '../../arbitrage/models/ArbitrageOpportunity';

/**
 * Scout agent that submits bundles to the Negotiator
 */
export interface ScoutAgent {
  agentId: string;
  agentName: string;
  publicKey: string;
  reputationScore: number;
  totalBundlesSubmitted: number;
  successfulBundles: number;
  averageValue: number;
  lastSeen: Date;
  isActive: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Type of bundle operation
 */
export enum BundleType {
  ARBITRAGE = 'arbitrage',
  LIQUIDATION = 'liquidation',
  BACKRUN = 'backrun',
  SANDWICH = 'sandwich',
  FLASH_LOAN = 'flash_loan',
  MEV_BOOST = 'mev_boost',
  CUSTOM = 'custom',
}

/**
 * Bundle submission from a Scout agent
 */
export interface ScoutBundle {
  bundleId: string;
  scoutAgentId: string;
  bundleType: BundleType;
  blindHash: string; // Hash of bundle for privacy
  promisedValue: number; // Expected profit in USD
  transactions: string[]; // Transaction hashes
  timestamp: Date;
  expiresAt: Date;
  gasEstimate: number;
  metadata?: Record<string, unknown>;
}

/**
 * Revealed bundle data (after acceptance)
 */
export interface RevealedBundle extends ScoutBundle {
  arbitrageOpportunity?: ArbitrageOpportunity;
  txData: string[]; // Actual transaction data
  signature: string; // Scout signature
  revealed: boolean;
}

/**
 * Coalition of agents working together (from Cooperative Game Theory)
 */
export interface Coalition {
  coalitionId: string;
  memberAgentIds: string[];
  bundles: RevealedBundle[];
  coalitionValue: number; // Total value if coalition forms
  marginalContributions: Record<string, number>; // Each agent's marginal value
  formationTime: Date;
  isStable: boolean; // Whether coalition is stable (core concept)
  metadata?: Record<string, unknown>;
}

/**
 * Combined bundle proposal from Negotiator
 */
export interface NegotiatedBlock {
  blockId: string;
  coalition: Coalition; // The winning coalition
  combinedBundles: RevealedBundle[];
  totalValue: number; // Total ETH value
  totalGas: number;
  conflicts: string[]; // List of conflict reasons if any
  isValid: boolean;
  createdAt: Date;
  signature?: string;
  shapleyValues?: Record<string, number>; // Fair value distribution
  metadata?: Record<string, unknown>;
}

/**
 * Bundle conflict detection result
 */
export interface BundleConflict {
  bundle1Id: string;
  bundle2Id: string;
  conflictType: ConflictType;
  severity: number; // 0-1, 1 = complete conflict
  reason: string;
}

/**
 * Types of bundle conflicts
 */
export enum ConflictType {
  TOKEN_OVERLAP = 'token_overlap', // Same tokens affected
  POOL_OVERLAP = 'pool_overlap', // Same pools affected
  NONCE_CONFLICT = 'nonce_conflict', // Nonce conflicts
  STATE_DEPENDENCY = 'state_dependency', // Dependent on same state
  GAS_PRICE_WAR = 'gas_price_war', // Competing gas prices
  TIMING_CONFLICT = 'timing_conflict', // Must execute in specific order
  NONE = 'none', // No conflict
}

/**
 * Profit distribution configuration using cooperative game theory
 */
export interface ProfitDistribution {
  totalProfit: number;
  wardenFlatFee: number; // Fixed fee for TheWarden
  searcherShares: SearcherShare[]; // Distribution to searchers
  redistributionAmount: number; // Amount redistributed back
  redistributionPercent: number; // Percent returned to searchers
  allocationMethod: AllocationMethod; // How value is distributed
  shapleyValues?: Record<string, number>; // Fair allocation via Shapley
  nucleolusValues?: Record<string, number>; // Alternative fair allocation
  timestamp: Date;
}

/**
 * Allocation methods from cooperative game theory
 */
export enum AllocationMethod {
  SHAPLEY = 'shapley', // Shapley value - fair based on marginal contribution
  NUCLEOLUS = 'nucleolus', // Nucleolus - minimizes worst-case dissatisfaction
  CORE = 'core', // Core allocation - no subcoalition has incentive to leave
  PROPORTIONAL = 'proportional', // Simple proportional to contribution
  EQUAL = 'equal', // Equal distribution
  ROBIN_HOOD = 'robin_hood', // Custom: flat fee + redistribution
}

/**
 * Individual searcher's share
 */
export interface SearcherShare {
  scoutAgentId: string;
  contributedValue: number;
  marginalContribution: number; // Value added by this agent to coalition
  shapleyValue?: number; // Fair share via Shapley value
  baseShare: number;
  bonusShare: number; // Robin Hood redistribution
  totalShare: number;
  payoutAddress: string;
}

/**
 * Negotiator configuration
 */
export interface NegotiatorConfig {
  // Robin Hood algorithm settings
  wardenFlatFeePercent: number; // e.g., 5% flat fee
  redistributionPercent: number; // e.g., 50% of excess redistributed

  // Cooperative game theory settings
  allocationMethod: AllocationMethod;
  enableShapleyCalculation: boolean;
  enableCoreStability: boolean; // Check if allocation is in the "core"

  // Trust settings
  minReputationScore: number; // Minimum to accept bundles
  maxBundlesPerBlock: number; // Maximum bundles to combine
  
  // Conflict detection
  allowTokenOverlap: boolean;
  allowPoolOverlap: boolean;
  maxConflictSeverity: number; // 0-1, reject if above

  // Timing
  bundleExpirationSeconds: number;
  blockBuildingTimeMs: number;

  // Public mempool
  enablePublicBroadcast: boolean;
  transparencyLevel: 'full' | 'partial' | 'minimal';
}

/**
 * Characteristic function v(S) from cooperative game theory
 * Returns the value that a coalition S can achieve
 */
export type CharacteristicFunction = (coalition: string[]) => number;

/**
 * Negotiation result
 */
export interface NegotiationResult {
  success: boolean;
  negotiatedBlock?: NegotiatedBlock;
  profitDistribution?: ProfitDistribution;
  rejectedBundles: string[]; // Bundle IDs that were rejected
  rejectionReasons: Record<string, string>;
  coalitionsConsidered: number; // Number of coalitions evaluated
  optimalCoalition?: Coalition; // The winning coalition
  competitorComparison?: {
    competitorName: string;
    competitorValue: number;
    wardenValue: number;
    advantage: number; // Percentage advantage
  };
  executionTime: number; // Milliseconds to negotiate
  metadata?: Record<string, unknown>;
}

/**
 * Trust score calculation inputs
 */
export interface TrustScoreInputs {
  historicalSuccess: number; // 0-1
  bundleValueAccuracy: number; // 0-1 (promised vs actual)
  timeActive: number; // Days active
  totalVolume: number; // USD
  penaltyPoints: number; // Accumulated penalties
}

/**
 * TEE Attestation (placeholder for future implementation)
 */
export interface TEEAttestation {
  attestationType: 'SGX' | 'SEV' | 'NITRO' | 'MOCK';
  attestationData: string;
  timestamp: Date;
  verified: boolean;
  publicKey: string;
}

/**
 * Communication protocol message types
 */
export enum MessageType {
  HANDSHAKE = 'handshake',
  OFFER = 'offer',
  ACCEPTANCE = 'acceptance',
  REVEAL = 'reveal',
  REJECTION = 'rejection',
  BLOCK_PROPOSAL = 'block_proposal',
  PAYOUT = 'payout',
}

/**
 * P2P message structure
 */
export interface P2PMessage {
  messageId: string;
  messageType: MessageType;
  from: string; // Agent ID
  to: string; // Agent ID or 'broadcast'
  timestamp: Date;
  signature: string;
  payload: unknown;
}
