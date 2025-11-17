/**
 * Types for Phase 3: Advanced AI Integration
 * 
 * Core type definitions for reinforcement learning, neural network scoring,
 * and automated strategy evolution.
 */

/**
 * Execution episode for reinforcement learning
 * Captures state, action, reward, and outcome for learning
 */
export interface ExecutionEpisode {
  // Episode metadata
  timestamp: number;
  episodeId: string;
  
  // State representation
  state: ExecutionState;
  
  // Action taken
  action: ExecutionAction;
  
  // Outcome and reward
  outcome: ExecutionOutcome;
  reward: number;
  
  // MEV context
  mevContext: MEVContext;
}

/**
 * State of the execution environment
 */
export interface ExecutionState {
  // Market conditions
  baseFee: number;
  gasPrice: number;
  congestion: number;
  searcherDensity: number;
  
  // Opportunity characteristics
  expectedProfit: number;
  pathComplexity: number;
  liquidityDepth: number;
  
  // Historical context
  recentSuccessRate: number;
  avgProfitPerTx: number;
  recentMEVLoss: number;
}

/**
 * Action taken in execution
 */
export interface ExecutionAction {
  // Decision
  executed: boolean;
  
  // Strategy parameters used
  strategyParams: StrategyParameters;
  
  // Execution timing
  blockDelay: number;
  priorityFee: number;
}

/**
 * Outcome of execution
 */
export interface ExecutionOutcome {
  success: boolean;
  actualProfit: number;
  gasUsed: number;
  mevLoss: number;
  slippage: number;
  executionTime: number;
}

/**
 * MEV context for episode
 */
export interface MEVContext {
  competitorCount: number;
  frontrunRisk: number;
  backrunRisk: number;
  sandwichRisk: number;
  blockPosition: number;
}

/**
 * Strategy parameters that can be optimized
 */
export interface StrategyParameters {
  minProfitThreshold: number;
  mevRiskSensitivity: number;
  maxSlippage: number;
  gasMultiplier: number;
  executionTimeout: number;
  priorityFeeStrategy: 'conservative' | 'moderate' | 'aggressive';
}

/**
 * Updated parameters suggested by RL agent
 */
export interface UpdatedParameters {
  params: StrategyParameters;
  confidence: number;
  expectedImprovement: number;
  rationale: string;
}

/**
 * Features for neural network opportunity scoring
 */
export interface OpportunityFeatures {
  // Profitability indicators
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  roi: number;
  
  // Liquidity metrics
  totalLiquidity: number;
  liquidityRatio: number;
  poolDepth: number;
  
  // MEV risk factors
  mevRisk: number;
  competitionLevel: number;
  blockCongestion: number;
  
  // Path characteristics
  hopCount: number;
  pathComplexity: number;
  gasEstimate: number;
  
  // Market conditions
  volatility: number;
  priceImpact: number;
  timeOfDay: number;
  
  // Historical performance
  similarPathSuccessRate: number;
  avgHistoricalProfit: number;
}

/**
 * Strategy configuration variant for evolution
 */
export interface ConfigVariant {
  id: string;
  params: StrategyParameters;
  mutations: StrategyMutation[];
  generation: number;
  fitnessScore?: number;
}

/**
 * Mutation applied to strategy
 */
export interface StrategyMutation {
  parameter: keyof StrategyParameters;
  previousValue: number | string;
  newValue: number | string;
  mutationType: 'increment' | 'decrement' | 'randomize' | 'optimize';
}

/**
 * Variant evaluation results
 */
export interface VariantEvaluationResult {
  variantId: string;
  executionCount: number;
  successRate: number;
  avgProfit: number;
  avgMEVLoss: number;
  fitnessScore: number;
  performanceMetrics: {
    totalProfit: number;
    totalGasCost: number;
    totalMEVLoss: number;
    sharpeRatio: number;
  };
}
