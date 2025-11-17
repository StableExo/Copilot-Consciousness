/**
 * Types for Phase 3: Cross-Chain Intelligence
 * 
 * Core type definitions for multi-chain MEV awareness, cross-chain arbitrage,
 * and unified risk modeling.
 */

/**
 * MEV conditions for a specific chain
 */
export interface ChainMevConditions {
  chainId: number;
  chainName: string;
  timestamp: number;
  
  // Congestion metrics
  congestion: number; // 0-1 scale
  baseFee: number; // in native token (gwei)
  priorityFee: number;
  blockUtilization: number; // 0-1 scale
  
  // MEV activity
  searcherDensity: number; // 0-1 scale
  recentMEVVolume: number; // in USD
  competitionLevel: number; // 0-1 scale
  frontrunRisk: number; // 0-1 scale
  
  // Liquidity
  totalLiquidity: number; // in USD
  topDexLiquidity: Record<string, number>;
  
  // Performance
  blockTime: number; // in seconds
  confirmationTime: number; // in seconds
  
  // Health
  rpcHealth: number; // 0-1 scale
  indexerHealth: number; // 0-1 scale
}

/**
 * Cross-chain arbitrage pattern
 */
export interface CrossChainArbitragePattern {
  patternId: string;
  timestamp: number;
  
  // Pattern details
  type: 'price_divergence' | 'liquidity_imbalance' | 'bridge_arbitrage';
  confidence: number;
  
  // Chains involved
  sourceChain: number;
  targetChain: number;
  intermediateChains?: number[];
  
  // Opportunity details
  tokenPair: {
    tokenA: string;
    tokenB: string;
    symbolA: string;
    symbolB: string;
  };
  
  priceDivergence: {
    sourcePrice: number;
    targetPrice: number;
    divergencePercent: number;
  };
  
  // Profitability
  estimatedProfit: number; // in USD
  estimatedProfitPercent: number;
  
  // Execution requirements
  requiredCapital: number; // in USD
  bridgingCost: number;
  estimatedGasCost: number;
  timeWindow: number; // seconds
  
  // Risks
  bridgeRisk: number; // 0-1 scale
  slippageRisk: number;
  timingRisk: number;
  mevRisk: number;
  
  // Execution path
  executionSteps: ArbitrageStep[];
}

/**
 * Step in cross-chain arbitrage execution
 */
export interface ArbitrageStep {
  stepNumber: number;
  chainId: number;
  action: 'swap' | 'bridge' | 'approve' | 'wrap' | 'unwrap';
  protocol: string;
  
  inputToken: string;
  outputToken: string;
  inputAmount: number;
  expectedOutput: number;
  
  estimatedGas: number;
  estimatedTime: number; // seconds
}

/**
 * Unified risk view across chains
 */
export interface UnifiedRiskView {
  timestamp: number;
  
  // Overall risk metrics
  overallRiskScore: number; // 0-1 scale
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  
  // Per-chain risks
  chainRisks: Map<number, ChainRiskMetrics>;
  
  // Cross-chain risks
  bridgeRisks: Map<string, BridgeRiskMetrics>;
  
  // Portfolio exposure
  totalExposure: number; // in USD
  perChainExposure: Map<number, number>;
  concentrationRisk: number; // 0-1 scale
  
  // Market risks
  volatilityRisk: number;
  liquidityRisk: number;
  correlationRisk: number;
  
  // Operational risks
  technicalRisk: number;
  slippageRisk: number;
  mevRisk: number;
  
  // Recommendations
  recommendations: RiskRecommendation[];
}

/**
 * Risk metrics for a specific chain
 */
export interface ChainRiskMetrics {
  chainId: number;
  chainName: string;
  
  // MEV risks
  mevCompetition: number;
  frontrunProbability: number;
  sandwichRisk: number;
  
  // Technical risks
  congestionRisk: number;
  rpcReliability: number;
  reorgRisk: number;
  
  // Economic risks
  gasPriceVolatility: number;
  liquidityDepth: number;
  slippageRisk: number;
  
  // Overall
  riskScore: number;
}

/**
 * Bridge risk metrics
 */
export interface BridgeRiskMetrics {
  bridgeName: string;
  sourceChain: number;
  targetChain: number;
  
  // Security
  securityScore: number;
  auditStatus: string;
  tvl: number;
  
  // Performance
  avgBridgingTime: number;
  failureRate: number;
  slippageRate: number;
  
  // Cost
  avgFee: number;
  feeVolatility: number;
  
  // Overall
  riskScore: number;
}

/**
 * Risk-based recommendation
 */
export interface RiskRecommendation {
  severity: 'info' | 'warning' | 'critical';
  category: 'mev' | 'technical' | 'economic' | 'bridge';
  message: string;
  affectedChains: number[];
  suggestedAction: string;
}

/**
 * Cross-chain opportunity evaluation
 */
export interface CrossChainOpportunityEvaluation {
  opportunityId: string;
  pattern: CrossChainArbitragePattern;
  riskAssessment: UnifiedRiskView;
  
  // Scores
  profitabilityScore: number;
  riskScore: number;
  executabilityScore: number;
  overallScore: number;
  
  // Decision
  recommendation: 'execute' | 'skip' | 'monitor';
  confidence: number;
  reasoning: string;
}

/**
 * Chain state snapshot
 */
export interface ChainStateSnapshot {
  chainId: number;
  blockNumber: number;
  timestamp: number;
  
  mevConditions: ChainMevConditions;
  topPools: Array<{
    address: string;
    dex: string;
    tokenA: string;
    tokenB: string;
    liquidity: number;
    volume24h: number;
  }>;
  
  recentActivity: {
    txCount: number;
    mevTxCount: number;
    avgGasPrice: number;
    topArbitragers: string[];
  };
}
