/**
 * Phase 3: Consciousness Deepening - Extended Types
 * 
 * Enhanced types for episodic memory, adversarial pattern recognition,
 * and self-reflection capabilities.
 */

// Import base types
export interface ArbitrageExecution {
  timestamp: number;
  cycleNumber: number;
  opportunity: {
    profit: number;
    pools: string[];
    txType: string;
  };
  execution: {
    success: boolean;
    txHash?: string;
    gasUsed?: bigint;
    actualProfit?: number;
    mevRisk: number;
  };
  market: {
    congestion: number;
    searcherDensity: number;
    baseFee?: number;
  };
}

/**
 * Arbitrage Episode - Episodic Memory Representation
 * 
 * Captures complete context of an arbitrage opportunity evaluation and execution
 * for long-term memory and pattern learning.
 */
export interface ArbitrageEpisode {
  // Episode metadata
  episodeId: string;
  timestamp: number;
  cycleNumber: number;
  
  // Market state at decision time
  marketState: {
    timestamp: number;
    baseFee: number;
    gasPrice: number;
    congestion: number;
    searcherDensity: number;
    blockNumber: number;
    volatility: number;
  };
  
  // Opportunity assessment
  opportunity: {
    profit: number;
    netProfit: number;
    pools: string[];
    path: string[];
    txType: string;
    complexity: number;
    liquidityDepth: number;
  };
  
  // MEV context
  mevContext: {
    mevRisk: number;
    frontrunRisk: number;
    sandwichRisk: number;
    competitorCount: number;
    recentMEVLoss: number;
  };
  
  // Decision made
  decision: {
    executed: boolean;
    decisionRationale: string;
    ethicalScore: number;
    riskScore: number;
    confidenceScore: number;
  };
  
  // Execution outcome (if executed)
  outcome?: {
    success: boolean;
    txHash?: string;
    gasUsed?: bigint;
    actualProfit?: number;
    actualMEVLoss?: number;
    slippage?: number;
    executionTime?: number;
  };
  
  // Lessons learned
  lessons?: {
    predictionAccuracy: number;
    surprises: string[];
    improvements: string[];
  };
}

/**
 * Adversarial Pattern
 * 
 * Represents detected patterns in adversarial MEV behavior
 */
export interface AdversarialPattern {
  patternId: string;
  detectedAt: number;
  
  // Pattern characteristics
  type: 'frontrun' | 'sandwich' | 'backrun' | 'liquidation_competition' | 'multi_bot_coordination';
  description: string;
  confidence: number;
  
  // Frequency and timing
  occurrences: number;
  firstSeen: number;
  lastSeen: number;
  timeOfDayDistribution: Map<number, number>; // hour -> count
  
  // Adversary characteristics
  adversaries: {
    addresses: string[];
    avgGasBid: number;
    avgCapital: number;
    successRate: number;
    avgProfitPerTx: number;
  };
  
  // Our experience with this pattern
  ourExperience: {
    encounterCount: number;
    lossesIncurred: number;
    successfulCounterCount: number;
    avgLossPerEncounter: number;
  };
  
  // Counter-strategy
  counterStrategy?: {
    description: string;
    effectiveness: number; // 0-1 scale
    costBenefit: number;
  };
}

/**
 * Strategic Reflection
 * 
 * Self-reflection on strategic decisions and performance
 */
export interface StrategyReflection {
  reflectionId: string;
  timestamp: number;
  
  // Time period analyzed
  periodStart: number;
  periodEnd: number;
  executionCount: number;
  
  // Performance metrics
  performance: {
    totalProfit: number;
    totalLoss: number;
    netProfit: number;
    successRate: number;
    avgProfitPerTx: number;
    avgGasEfficiency: number;
    mevLossRate: number;
  };
  
  // Decision quality analysis
  decisionQuality: {
    falsePositives: number; // Should have executed but didn't
    falseNegatives: number; // Shouldn't have executed but did
    truePositives: number;
    trueNegatives: number;
    accuracy: number;
    precision: number;
    recall: number;
  };
  
  // Strategic insights
  insights: {
    mostProfitableConditions: string[];
    mostDangerousConditions: string[];
    optimalRiskThreshold: number;
    optimalProfitThreshold: number;
    bestTimeWindows: string[];
  };
  
  // Recommendations for improvement
  recommendations: {
    parameterAdjustments: Map<string, number>;
    strategicChanges: string[];
    riskManagementTips: string[];
    confidence: number;
  };
  
  // Meta-learning insights
  learningProgress: {
    improvementTrend: 'improving' | 'stable' | 'declining';
    strengthsIdentified: string[];
    weaknessesIdentified: string[];
    explorationVsExploitation: number; // 0 = pure exploitation, 1 = pure exploration
  };
}

/**
 * Consciousness State Snapshot
 * 
 * Complete snapshot of consciousness state for persistence and analysis
 */
export interface ConsciousnessSnapshot {
  timestamp: number;
  version: string;
  
  // Memory statistics
  memoryStats: {
    episodeCount: number;
    patternCount: number;
    adversarialPatternCount: number;
    reflectionCount: number;
    oldestEpisode: number;
    newestEpisode: number;
  };
  
  // Current state
  currentState: {
    learningRate: number;
    explorationRate: number;
    riskTolerance: number;
    ethicalThreshold: number;
    confidence: number;
  };
  
  // Key insights
  keyInsights: {
    topPatterns: string[];
    topAdversaries: string[];
    bestStrategies: string[];
    worstConditions: string[];
  };
  
  // Performance summary
  performanceSummary: {
    totalExecutions: number;
    successRate: number;
    avgProfit: number;
    totalMEVLoss: number;
    learningVelocity: number; // Rate of improvement
  };
}
