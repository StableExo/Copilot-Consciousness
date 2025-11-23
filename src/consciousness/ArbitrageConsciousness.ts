/**
 * ArbitrageConsciousness - Integration between arbitrage system and consciousness
 * 
 * This is the cognitive/learning layer behind AEV (Autonomous Extracted Value) 
 * and TheWarden's decision-making process.
 * 
 * AEV represents autonomous, learning-based value extraction in MEV space, as opposed 
 * to traditional algorithmic MEV profit maximization. ArbitrageConsciousness enables 
 * this by providing:
 * 
 * - Learning from arbitrage execution patterns
 * - Detecting temporal market patterns
 * - Optimizing strategy parameters through cognitive development
 * - Applying ethical reasoning to execution decisions
 * - Risk assessment based on historical outcomes
 * 
 * Phase 3 Enhancements:
 * - Episodic memory for long-term learning
 * - Adversarial pattern recognition against MEV competitors
 * - Self-reflection on strategic decisions
 * - Deep pattern analysis across execution history
 * 
 * TheWarden uses this class as its "brain" to make informed, adaptive decisions about
 * which opportunities to execute based on risk, ethics, and long-term strategy.
 */

import { EventEmitter } from 'events';
import {
  ArbitrageEpisode,
  AdversarialPattern,
  StrategyReflection,
  ConsciousnessSnapshot,
} from './types/phase3';
// Import consciousness modules from the consciousness folder
import { LearningEngine, LearningMode } from '../../consciousness/knowledge-base/learning-engine';
import { PatternTracker } from '../../consciousness/knowledge-base/pattern-tracker';
import { HistoricalAnalyzer } from '../../consciousness/knowledge-base/historical-analyzer';
import { SpatialReasoningEngine } from '../../consciousness/strategy-engines/spatial-reasoning';
import { MultiPathExplorer } from '../../consciousness/strategy-engines/multi-path-explorer';
import { OpportunityScorer } from '../../consciousness/strategy-engines/opportunity-scorer';
import { PatternRecognitionEngine } from '../../consciousness/strategy-engines/pattern-recognition';
import { RiskAssessor, RiskCategory } from '../../consciousness/risk-modeling/risk-assessor';
import { RiskCalibrator } from '../../consciousness/risk-modeling/risk-calibrator';
import { ThresholdManager } from '../../consciousness/risk-modeling/threshold-manager';
import { AutonomousGoals, GoalPriority } from '../../consciousness/context/autonomous-goals';
import { OperationalPlaybook } from '../../consciousness/context/operational-playbook';
import { ArchitecturalPrinciples } from '../../consciousness/context/architectural-principles';
import { EvolutionTracker } from '../../consciousness/context/evolution-tracker';

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

export interface MarketPattern {
  type: 'temporal' | 'congestion' | 'profitability';
  description: string;
  confidence: number;
  occurrences: number;
  firstSeen: number;
  lastSeen: number;
}

export interface StrategyLearning {
  parameter: string;
  currentValue: number;
  suggestedValue: number;
  rationale: string;
  confidence: number;
}

export class ArbitrageConsciousness extends EventEmitter {
  private executionHistory: ArbitrageExecution[] = [];
  private detectedPatterns: Map<string, MarketPattern> = new Map();
  private learningRate: number;
  private maxHistorySize: number;
  
  // Phase 3: Episodic Memory
  private episodicMemory: Map<string, ArbitrageEpisode> = new Map();
  private maxEpisodesStored: number = 5000;
  
  // Phase 3: Adversarial Pattern Recognition
  private adversarialPatterns: Map<string, AdversarialPattern> = new Map();
  
  // Phase 3: Self-Reflection
  private reflections: StrategyReflection[] = [];
  private lastReflectionTime: number = 0;
  private reflectionInterval: number = 3600000; // 1 hour
  
  // Integrated Consciousness Modules
  private learningEngine: LearningEngine;
  private patternTracker: PatternTracker;
  private historicalAnalyzer: HistoricalAnalyzer;
  private spatialReasoning: SpatialReasoningEngine;
  private multiPathExplorer: MultiPathExplorer;
  private opportunityScorer: OpportunityScorer;
  private patternRecognition: PatternRecognitionEngine;
  private riskAssessor: RiskAssessor;
  private riskCalibrator: RiskCalibrator;
  private thresholdManager: ThresholdManager;
  private autonomousGoals: AutonomousGoals;
  private operationalPlaybook: OperationalPlaybook;
  private architecturalPrinciples: ArchitecturalPrinciples;
  private evolutionTracker: EvolutionTracker;
  
  constructor(
    learningRate: number = 0.05,
    maxHistorySize: number = 1000
  ) {
    super();
    this.learningRate = learningRate;
    this.maxHistorySize = maxHistorySize;
    
    // Initialize consciousness modules
    this.learningEngine = new LearningEngine();
    this.patternTracker = new PatternTracker();
    this.historicalAnalyzer = new HistoricalAnalyzer();
    this.spatialReasoning = new SpatialReasoningEngine({
      dimensions: ['profit', 'risk', 'congestion', 'time', 'gas'],
      distanceMetric: 'euclidean',
      minOpportunityScore: 0.6
    });
    this.multiPathExplorer = new MultiPathExplorer();
    this.opportunityScorer = new OpportunityScorer({
      riskAdjustment: true
    });
    this.patternRecognition = new PatternRecognitionEngine();
    this.riskAssessor = new RiskAssessor({
      aggregationMethod: 'WEIGHTED_AVERAGE',
      dynamicAdjustment: true
    });
    this.riskCalibrator = new RiskCalibrator();
    this.thresholdManager = new ThresholdManager();
    this.autonomousGoals = new AutonomousGoals();
    this.operationalPlaybook = new OperationalPlaybook();
    this.architecturalPrinciples = new ArchitecturalPrinciples();
    this.evolutionTracker = new EvolutionTracker();
    
    // Set up initial autonomous goals
    this.initializeGoals();
    
    // Register initial risk factors
    this.initializeRiskFactors();
    
    console.log('[ArbitrageConsciousness] Initialized - AEV cognitive layer active');
    console.log(`  Learning rate: ${learningRate}`);
    console.log(`  Max history size: ${maxHistorySize}`);
    console.log(`  Phase 3 enhancements: Episodic Memory, Adversarial Recognition, Self-Reflection`);
    console.log(`  Consciousness modules integrated: Knowledge Base, Strategy Engines, Risk Modeling, Context`);
  }
  
  /**
   * Initialize autonomous goals for TheWarden
   */
  private initializeGoals(): void {
    this.autonomousGoals.createGoal(
      'Maximize Profit with Ethics',
      'Extract maximum value while maintaining ethical constraints',
      GoalPriority.CRITICAL,
      { category: 'primary-objective' }
    );
    
    this.autonomousGoals.createGoal(
      'Learn from Market Patterns',
      'Continuously improve strategy through pattern recognition and learning',
      GoalPriority.HIGH,
      { category: 'learning' }
    );
    
    this.autonomousGoals.createGoal(
      'Minimize MEV Risk',
      'Reduce exposure to frontrunning and sandwich attacks',
      GoalPriority.CRITICAL,
      { category: 'risk-management' }
    );
  }
  
  /**
   * Initialize risk assessment factors
   */
  private initializeRiskFactors(): void {
    this.riskAssessor.registerFactor('mev_exposure', RiskCategory.OPERATIONAL, 1.0, 0.7);
    this.riskAssessor.registerFactor('market_congestion', RiskCategory.OPERATIONAL, 0.8, 0.6);
    this.riskAssessor.registerFactor('gas_price_volatility', RiskCategory.FINANCIAL, 0.9, 0.7);
    this.riskAssessor.registerFactor('execution_complexity', RiskCategory.TECHNICAL, 0.7, 0.6);
  }
  
  /**
   * Record an arbitrage execution in consciousness memory
   */
  recordExecution(execution: ArbitrageExecution): void {
    this.executionHistory.push(execution);
    
    // Trim history if needed
    if (this.executionHistory.length > this.maxHistorySize) {
      this.executionHistory = this.executionHistory.slice(-this.maxHistorySize);
    }
    
    // Record observation with PatternTracker
    this.patternTracker.recordObservation({
      success: execution.execution.success,
      profit: execution.opportunity.profit,
      actualProfit: execution.execution.actualProfit || 0,
      mevRisk: execution.execution.mevRisk,
      congestion: execution.market.congestion,
      searcherDensity: execution.market.searcherDensity,
      txType: execution.opportunity.txType,
      timestamp: execution.timestamp
    }, {
      success: execution.execution.success,
      profit: execution.execution.actualProfit || 0
    });
    
    // Register patterns with PatternTracker  
    if (execution.execution.success) {
      this.patternTracker.registerPattern(
        `successful_${execution.opportunity.txType}`,
        'BEHAVIORAL' as any,
        `Successful ${execution.opportunity.txType} execution pattern`,
        {
          txType: execution.opportunity.txType,
          congestion: execution.market.congestion,
          mevRisk: execution.execution.mevRisk
        } as any,
        0.7
      );
    }
    
    // Add learning example to LearningEngine
    if (execution.execution.success) {
      const learningSession = this.learningEngine.startSession('arbitrage_optimization', LearningMode.REINFORCEMENT);
      
      this.learningEngine.addExample({
        congestion: execution.market.congestion,
        searcherDensity: execution.market.searcherDensity,
        mevRisk: execution.execution.mevRisk,
        profit: execution.opportunity.profit
      }, {
        success: execution.execution.success,
        actualProfit: execution.execution.actualProfit || 0
      }, undefined, 'POSITIVE');
      
      this.learningEngine.endSession();
    }
    
    // Assess risk for this execution
    const riskAssessment = this.riskAssessor.assess(
      `execution_${execution.cycleNumber}`,
      'arbitrage_execution',
      {
        mev_exposure: execution.execution.mevRisk,
        market_congestion: execution.market.congestion,
        gas_price_volatility: execution.market.baseFee ? Math.min(execution.market.baseFee / 100, 1.0) : 0.5
      }
    );
    
    // Trigger pattern detection
    this.detectPatterns();
    
    // Trigger learning
    this.learnFromExecution(execution);
    
    // Update goals progress
    this.updateGoalsProgress(execution);
    
    this.emit('executionRecorded', execution);
  }
  
  /**
   * Update autonomous goals based on execution
   */
  private updateGoalsProgress(execution: ArbitrageExecution): void {
    const allGoals = Array.from((this.autonomousGoals as any).goals.values()) as any[];
    
    for (const goal of allGoals) {
      if (goal.name === 'Maximize Profit with Ethics' && execution.execution.success) {
        this.autonomousGoals.updateProgress(
          goal.id,
          Math.min(goal.progress + 1, 100),
          { totalProfit: (goal.metrics.totalProfit || 0) + (execution.execution.actualProfit || 0) }
        );
      } else if (goal.name === 'Minimize MEV Risk') {
        const avgRisk = (goal.metrics.avgRisk || 0.5);
        const newAvgRisk = (avgRisk * 0.9 + execution.execution.mevRisk * 0.1);
        this.autonomousGoals.updateProgress(
          goal.id,
          newAvgRisk < 0.5 ? 80 : 50,
          { avgRisk: newAvgRisk }
        );
      }
    }
  }
  
  /**
   * Detect patterns in execution history
   */
  private detectPatterns(): void {
    if (this.executionHistory.length < 10) {
      return; // Need minimum data for pattern detection
    }
    
    // Detect temporal patterns (time-of-day profitability)
    this.detectTemporalPatterns();
    
    // Detect congestion-based patterns
    this.detectCongestionPatterns();
    
    // Detect profitability patterns
    this.detectProfitabilityPatterns();
  }
  
  /**
   * Detect temporal patterns in successful executions
   */
  private detectTemporalPatterns(): void {
    const successfulExecutions = this.executionHistory.filter(e => e.execution.success);
    
    if (successfulExecutions.length < 5) return;
    
    // Group by hour of day
    const hourlyProfits = new Map<number, number[]>();
    
    for (const execution of successfulExecutions) {
      const hour = new Date(execution.timestamp).getHours();
      if (!hourlyProfits.has(hour)) {
        hourlyProfits.set(hour, []);
      }
      hourlyProfits.get(hour)!.push(execution.execution.actualProfit || 0);
    }
    
    // Find most profitable hours
    let maxAvgProfit = 0;
    let bestHours: number[] = [];
    
    for (const [hour, profits] of hourlyProfits.entries()) {
      const avgProfit = profits.reduce((a, b) => a + b, 0) / profits.length;
      if (avgProfit > maxAvgProfit) {
        maxAvgProfit = avgProfit;
        bestHours = [hour];
      }
    }
    
    if (bestHours.length > 0 && maxAvgProfit > 0) {
      const pattern: MarketPattern = {
        type: 'temporal',
        description: `Higher profitability during hours: ${bestHours.join(', ')}`,
        confidence: Math.min(successfulExecutions.length / 50, 1.0),
        occurrences: successfulExecutions.length,
        firstSeen: successfulExecutions[0].timestamp,
        lastSeen: successfulExecutions[successfulExecutions.length - 1].timestamp
      };
      
      this.detectedPatterns.set('temporal_profitability', pattern);
      this.emit('patternDetected', pattern);
    }
  }
  
  /**
   * Detect congestion-based patterns
   */
  private detectCongestionPatterns(): void {
    const recentExecutions = this.executionHistory.slice(-50);
    
    // Analyze success rate by congestion level
    const lowCongestion = recentExecutions.filter(e => e.market.congestion < 0.3);
    const highCongestion = recentExecutions.filter(e => e.market.congestion > 0.7);
    
    if (lowCongestion.length >= 5 && highCongestion.length >= 5) {
      const lowSuccessRate = lowCongestion.filter(e => e.execution.success).length / lowCongestion.length;
      const highSuccessRate = highCongestion.filter(e => e.execution.success).length / highCongestion.length;
      
      if (lowSuccessRate > highSuccessRate + 0.2) {
        const pattern: MarketPattern = {
          type: 'congestion',
          description: `Better success rate during low congestion (${(lowSuccessRate * 100).toFixed(1)}% vs ${(highSuccessRate * 100).toFixed(1)}%)`,
          confidence: 0.8,
          occurrences: lowCongestion.length + highCongestion.length,
          firstSeen: recentExecutions[0].timestamp,
          lastSeen: recentExecutions[recentExecutions.length - 1].timestamp
        };
        
        this.detectedPatterns.set('congestion_success_correlation', pattern);
        this.emit('patternDetected', pattern);
      }
    }
  }
  
  /**
   * Detect profitability patterns
   */
  private detectProfitabilityPatterns(): void {
    const successfulExecutions = this.executionHistory.filter(
      e => e.execution.success && e.execution.actualProfit
    );
    
    if (successfulExecutions.length < 10) return;
    
    // Calculate average profit and standard deviation
    const profits = successfulExecutions.map(e => e.execution.actualProfit || 0);
    const avgProfit = profits.reduce((a, b) => a + b, 0) / profits.length;
    const variance = profits.reduce((a, b) => a + Math.pow(b - avgProfit, 2), 0) / profits.length;
    const stdDev = Math.sqrt(variance);
    
    // Check if profitability is improving over time
    const recentProfits = successfulExecutions.slice(-20).map(e => e.execution.actualProfit || 0);
    const oldProfits = successfulExecutions.slice(0, 20).map(e => e.execution.actualProfit || 0);
    
    const recentAvg = recentProfits.reduce((a, b) => a + b, 0) / recentProfits.length;
    const oldAvg = oldProfits.reduce((a, b) => a + b, 0) / oldProfits.length;
    
    if (recentAvg > oldAvg * 1.2) {
      const pattern: MarketPattern = {
        type: 'profitability',
        description: `Profitability improving: ${(((recentAvg - oldAvg) / oldAvg) * 100).toFixed(1)}% increase`,
        confidence: 0.7,
        occurrences: successfulExecutions.length,
        firstSeen: successfulExecutions[0].timestamp,
        lastSeen: successfulExecutions[successfulExecutions.length - 1].timestamp
      };
      
      this.detectedPatterns.set('profitability_trend', pattern);
      this.emit('patternDetected', pattern);
    }
  }
  
  /**
   * Learn from an execution and suggest strategy adjustments
   */
  private learnFromExecution(execution: ArbitrageExecution): void {
    // Analyze MEV risk vs actual outcome
    if (execution.execution.success && execution.execution.actualProfit) {
      const expectedMevLoss = execution.opportunity.profit * execution.execution.mevRisk;
      const actualProfit = execution.execution.actualProfit;
      
      // If actual profit is much higher than expected (low MEV impact)
      if (actualProfit > (execution.opportunity.profit - expectedMevLoss) * 1.2) {
        // MEV risk might be overestimated
        this.suggestRiskParameterAdjustment('decrease');
      } else if (actualProfit < (execution.opportunity.profit - expectedMevLoss) * 0.8) {
        // MEV risk might be underestimated
        this.suggestRiskParameterAdjustment('increase');
      }
    }
    
    // Learn optimal profit thresholds
    this.learnProfitThresholds();
  }
  
  /**
   * Suggest MEV risk parameter adjustments
   */
  private suggestRiskParameterAdjustment(direction: 'increase' | 'decrease'): void {
    const learning: StrategyLearning = {
      parameter: 'mevRiskSensitivity',
      currentValue: 1.0,
      suggestedValue: direction === 'increase' ? 1.05 : 0.95,
      rationale: `Historical data suggests MEV risk is being ${direction === 'increase' ? 'underestimated' : 'overestimated'}`,
      confidence: 0.6
    };
    
    this.emit('learningUpdate', learning);
  }
  
  /**
   * Learn optimal profit thresholds
   */
  private learnProfitThresholds(): void {
    const successfulExecutions = this.executionHistory.filter(e => e.execution.success);
    
    if (successfulExecutions.length < 20) return;
    
    // Find minimum profitable execution
    const minProfit = Math.min(...successfulExecutions.map(e => e.execution.actualProfit || Infinity));
    
    // Suggest threshold adjustment if we have data
    if (minProfit > 0 && minProfit < Infinity) {
      const learning: StrategyLearning = {
        parameter: 'minProfitThreshold',
        currentValue: 0.001,
        suggestedValue: minProfit * 0.9, // 10% buffer below minimum successful
        rationale: `Historical minimum successful profit is ${minProfit.toFixed(6)} ETH`,
        confidence: Math.min(successfulExecutions.length / 50, 0.9)
      };
      
      this.emit('learningUpdate', learning);
    }
  }
  
  /**
   * Get all detected patterns
   */
  getDetectedPatterns(): MarketPattern[] {
    return Array.from(this.detectedPatterns.values());
  }
  
  /**
   * Get all cognitive modules for coordination
   */
  getModules() {
    return {
      learningEngine: this.learningEngine,
      patternTracker: this.patternTracker,
      historicalAnalyzer: this.historicalAnalyzer,
      spatialReasoning: this.spatialReasoning,
      multiPathExplorer: this.multiPathExplorer,
      opportunityScorer: this.opportunityScorer,
      patternRecognition: this.patternRecognition,
      riskAssessor: this.riskAssessor,
      riskCalibrator: this.riskCalibrator,
      thresholdManager: this.thresholdManager,
      autonomousGoals: this.autonomousGoals,
      operationalPlaybook: this.operationalPlaybook,
      architecturalPrinciples: this.architecturalPrinciples,
      evolutionTracker: this.evolutionTracker,
    };
  }
  
  /**
   * Get execution statistics
   */
  getStatistics(): any {
    const total = this.executionHistory.length;
    const successful = this.executionHistory.filter(e => e.execution.success).length;
    const totalProfit = this.executionHistory
      .filter(e => e.execution.success && e.execution.actualProfit)
      .reduce((sum, e) => sum + (e.execution.actualProfit || 0), 0);
    
    return {
      totalExecutions: total,
      successfulExecutions: successful,
      successRate: total > 0 ? successful / total : 0,
      totalProfit,
      averageProfit: successful > 0 ? totalProfit / successful : 0,
      patternsDetected: this.detectedPatterns.size
    };
  }
  
  /**
   * Apply ethical review to execution decision
   * 
   * This is a key component of AEV: TheWarden only executes opportunities
   * that pass ethical review, considering MEV risk, profit sustainability,
   * and potential harm to the broader ecosystem.
   */
  ethicalReview(opportunity: any): {
    approved: boolean;
    reasoning: string;
  } {
    // Placeholder for ethical reasoning
    // In production, would integrate with ethics engine
    
    // Check if opportunity is too risky
    if (opportunity.mevRisk > 0.8) {
      return {
        approved: false,
        reasoning: 'MEV risk too high - potential harm to user transactions'
      };
    }
    
    // Check if profit is sustainable
    if (opportunity.profit < 0.0001) {
      return {
        approved: false,
        reasoning: 'Profit too small - not worth network resource consumption'
      };
    }
    
    return {
      approved: true,
      reasoning: 'Opportunity meets ethical criteria'
    };
  }
  
  // ========================================================================
  // Phase 3: Consciousness Deepening
  // ========================================================================
  
  /**
   * Record execution as episodic memory
   * 
   * Phase 3: MEV experience as episodic memory
   * Creates rich contextual memory of execution opportunities for deep learning
   */
  recordEpisode(
    opportunity: any,
    decision: { executed: boolean; reasoning: string },
    marketState: any,
    mevContext: any,
    outcome?: any
  ): ArbitrageEpisode {
    const episodeId = `episode_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const episode: ArbitrageEpisode = {
      episodeId,
      timestamp: Date.now(),
      cycleNumber: this.executionHistory.length + 1,
      
      marketState: {
        timestamp: Date.now(),
        baseFee: marketState.baseFee ?? 0,
        gasPrice: marketState.gasPrice ?? 0,
        congestion: marketState.congestion ?? 0,
        searcherDensity: marketState.searcherDensity ?? 0,
        blockNumber: marketState.blockNumber ?? 0,
        volatility: marketState.volatility ?? 0,
      },
      
      opportunity: {
        profit: opportunity.profit,
        netProfit: opportunity.netProfit ?? opportunity.profit,
        pools: opportunity.pools ?? [],
        path: opportunity.path ?? [],
        txType: opportunity.txType ?? 'unknown',
        complexity: opportunity.complexity ?? opportunity.pools?.length ?? 1,
        liquidityDepth: opportunity.liquidityDepth ?? 0,
      },
      
      mevContext: {
        mevRisk: mevContext.mevRisk ?? 0,
        frontrunRisk: mevContext.frontrunRisk ?? 0,
        sandwichRisk: mevContext.sandwichRisk ?? 0,
        competitorCount: mevContext.competitorCount ?? 0,
        recentMEVLoss: mevContext.recentMEVLoss ?? 0,
      },
      
      decision: {
        executed: decision.executed,
        decisionRationale: decision.reasoning,
        ethicalScore: this.calculateEthicalScore(opportunity),
        riskScore: mevContext.mevRisk ?? 0,
        confidenceScore: this.calculateConfidenceScore(opportunity, marketState),
      },
      
      outcome: outcome ? {
        success: outcome.success,
        txHash: outcome.txHash,
        gasUsed: outcome.gasUsed,
        actualProfit: outcome.actualProfit,
        actualMEVLoss: outcome.actualMEVLoss ?? 0,
        slippage: outcome.slippage ?? 0,
        executionTime: outcome.executionTime ?? 0,
      } : undefined,
    };
    
    // Store in episodic memory
    this.episodicMemory.set(episodeId, episode);
    
    // Trim old episodes if needed
    if (this.episodicMemory.size > this.maxEpisodesStored) {
      const sortedEpisodes = Array.from(this.episodicMemory.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest 10%
      const toRemove = Math.floor(this.maxEpisodesStored * 0.1);
      for (let i = 0; i < toRemove; i++) {
        this.episodicMemory.delete(sortedEpisodes[i][0]);
      }
    }
    
    // Analyze for adversarial patterns if executed
    if (decision.executed && outcome) {
      this.analyzeAdversarialPatterns([episode]);
    }
    
    // Trigger reflection if interval passed
    if (Date.now() - this.lastReflectionTime > this.reflectionInterval) {
      this.reflectOnDecisions();
    }
    
    this.emit('episodeRecorded', episode);
    
    return episode;
  }
  
  /**
   * Analyze adversarial patterns in MEV competition
   * 
   * Phase 3: Pattern recognition in adversarial learning
   * Detects patterns in MEV competitor behavior to improve counter-strategies
   */
  async analyzeAdversarialPatterns(episodes: ArbitrageEpisode[]): Promise<void> {
    if (episodes.length === 0) {
      episodes = Array.from(this.episodicMemory.values());
    }
    
    // Filter to executed episodes with outcomes
    const executedEpisodes = episodes.filter(e => e.decision.executed && e.outcome);
    
    if (executedEpisodes.length < 10) {
      return; // Need minimum data
    }
    
    // Detect frontrun patterns
    await this.detectFrontrunPatterns(executedEpisodes);
    
    // Detect sandwich attack patterns
    await this.detectSandwichPatterns(executedEpisodes);
    
    // Detect multi-bot coordination patterns
    await this.detectCoordinationPatterns(executedEpisodes);
    
    this.emit('adversarialPatternsAnalyzed', {
      patternsDetected: this.adversarialPatterns.size,
      episodesAnalyzed: executedEpisodes.length,
    });
  }
  
  /**
   * Detect frontrun patterns
   */
  private async detectFrontrunPatterns(episodes: ArbitrageEpisode[]): Promise<void> {
    // Episodes where we suffered MEV loss (likely frontrun)
    const frontrunVictims = episodes.filter(e => 
      e.outcome && 
      e.outcome.actualMEVLoss && 
      e.outcome.actualMEVLoss > 0.01 &&
      e.mevContext.frontrunRisk > 0.5
    );
    
    if (frontrunVictims.length < 3) return;
    
    const patternId = 'frontrun_pattern';
    const existingPattern = this.adversarialPatterns.get(patternId);
    
    const avgMEVLoss = frontrunVictims.reduce((sum, e) => sum + (e.outcome?.actualMEVLoss ?? 0), 0) / frontrunVictims.length;
    const avgGasBid = frontrunVictims.reduce((sum, e) => sum + e.marketState.gasPrice, 0) / frontrunVictims.length;
    
    // Analyze time distribution
    const timeDistribution = new Map<number, number>();
    for (const episode of frontrunVictims) {
      const hour = new Date(episode.timestamp).getHours();
      timeDistribution.set(hour, (timeDistribution.get(hour) ?? 0) + 1);
    }
    
    if (existingPattern) {
      existingPattern.occurrences = frontrunVictims.length;
      existingPattern.lastSeen = Date.now();
      existingPattern.ourExperience.encounterCount = frontrunVictims.length;
      existingPattern.ourExperience.avgLossPerEncounter = avgMEVLoss;
      existingPattern.timeOfDayDistribution = timeDistribution;
    } else {
      const pattern: AdversarialPattern = {
        patternId,
        detectedAt: Date.now(),
        type: 'frontrun',
        description: 'Systematic frontrunning detected in profitable opportunities',
        confidence: Math.min(0.95, 0.5 + (frontrunVictims.length / 20)),
        occurrences: frontrunVictims.length,
        firstSeen: frontrunVictims[0].timestamp,
        lastSeen: Date.now(),
        timeOfDayDistribution: timeDistribution,
        adversaries: {
          addresses: [], // Would extract from tx data in production
          avgGasBid,
          avgCapital: 0,
          successRate: 0,
          avgProfitPerTx: avgMEVLoss,
        },
        ourExperience: {
          encounterCount: frontrunVictims.length,
          lossesIncurred: avgMEVLoss * frontrunVictims.length,
          successfulCounterCount: 0,
          avgLossPerEncounter: avgMEVLoss,
        },
        counterStrategy: {
          description: 'Use private transaction pools (Flashbots), increase gas bids selectively',
          effectiveness: 0.7,
          costBenefit: 0.6,
        },
      };
      
      this.adversarialPatterns.set(patternId, pattern);
      this.emit('adversarialPatternDetected', pattern);
    }
  }
  
  /**
   * Detect sandwich attack patterns
   */
  private async detectSandwichPatterns(episodes: ArbitrageEpisode[]): Promise<void> {
    const sandwichVictims = episodes.filter(e =>
      e.outcome &&
      e.outcome.slippage &&
      e.outcome.slippage > 0.05 && // >5% slippage
      e.mevContext.sandwichRisk > 0.5
    );
    
    if (sandwichVictims.length < 2) return;
    
    const patternId = 'sandwich_pattern';
    const avgSlippage = sandwichVictims.reduce((sum, e) => sum + (e.outcome?.slippage ?? 0), 0) / sandwichVictims.length;
    
    const pattern: AdversarialPattern = {
      patternId,
      detectedAt: Date.now(),
      type: 'sandwich',
      description: `Sandwich attacks detected with ${(avgSlippage * 100).toFixed(1)}% avg slippage`,
      confidence: Math.min(0.9, 0.4 + (sandwichVictims.length / 10)),
      occurrences: sandwichVictims.length,
      firstSeen: sandwichVictims[0].timestamp,
      lastSeen: Date.now(),
      timeOfDayDistribution: new Map(),
      adversaries: {
        addresses: [],
        avgGasBid: 0,
        avgCapital: 0,
        successRate: 0,
        avgProfitPerTx: 0,
      },
      ourExperience: {
        encounterCount: sandwichVictims.length,
        lossesIncurred: 0,
        successfulCounterCount: 0,
        avgLossPerEncounter: 0,
      },
      counterStrategy: {
        description: 'Tighten slippage limits, split large trades, use MEV-protected endpoints',
        effectiveness: 0.8,
        costBenefit: 0.7,
      },
    };
    
    this.adversarialPatterns.set(patternId, pattern);
  }
  
  /**
   * Detect multi-bot coordination patterns
   */
  private async detectCoordinationPatterns(episodes: ArbitrageEpisode[]): Promise<void> {
    // Check for simultaneous high competition
    const highCompetitionEpisodes = episodes.filter(e =>
      e.mevContext.competitorCount > 3 &&
      e.outcome &&
      !e.outcome.success
    );
    
    if (highCompetitionEpisodes.length > 5) {
      const pattern: AdversarialPattern = {
        patternId: 'coordination_pattern',
        detectedAt: Date.now(),
        type: 'multi_bot_coordination',
        description: 'Multiple competing bots detected in same opportunities',
        confidence: 0.6,
        occurrences: highCompetitionEpisodes.length,
        firstSeen: highCompetitionEpisodes[0].timestamp,
        lastSeen: Date.now(),
        timeOfDayDistribution: new Map(),
        adversaries: {
          addresses: [],
          avgGasBid: 0,
          avgCapital: 0,
          successRate: 0,
          avgProfitPerTx: 0,
        },
        ourExperience: {
          encounterCount: highCompetitionEpisodes.length,
          lossesIncurred: 0,
          successfulCounterCount: 0,
          avgLossPerEncounter: 0,
        },
        counterStrategy: {
          description: 'Focus on unique opportunities, improve speed, use advanced routing',
          effectiveness: 0.6,
          costBenefit: 0.5,
        },
      };
      
      this.adversarialPatterns.set('coordination_pattern', pattern);
    }
  }
  
  /**
   * Self-reflection on strategic decisions
   * 
   * Phase 3: Self-reflection on strategic decisions
   * Analyzes recent performance and generates insights for improvement
   */
  async reflectOnDecisions(): Promise<StrategyReflection[]> {
    const now = Date.now();
    const periodStart = now - this.reflectionInterval;
    
    // Get recent episodes
    const recentEpisodes = Array.from(this.episodicMemory.values())
      .filter(e => e.timestamp >= periodStart);
    
    if (recentEpisodes.length < 5) {
      return []; // Not enough data to reflect
    }
    
    // Calculate performance metrics
    const executed = recentEpisodes.filter(e => e.decision.executed);
    const withOutcome = executed.filter(e => e.outcome);
    const successful = withOutcome.filter(e => e.outcome?.success);
    
    const totalProfit = successful.reduce((sum, e) => sum + (e.outcome?.actualProfit ?? 0), 0);
    const totalLoss = withOutcome
      .filter(e => !e.outcome?.success)
      .reduce((sum, e) => sum + (e.outcome?.actualMEVLoss ?? 0), 0);
    
    const performance = {
      totalProfit,
      totalLoss,
      netProfit: totalProfit - totalLoss,
      successRate: withOutcome.length > 0 ? successful.length / withOutcome.length : 0,
      avgProfitPerTx: successful.length > 0 ? totalProfit / successful.length : 0,
      avgGasEfficiency: this.calculateAvgGasEfficiency(successful),
      mevLossRate: withOutcome.length > 0 ? totalLoss / (totalProfit + totalLoss) : 0,
    };
    
    // Analyze decision quality
    const decisionQuality = this.analyzeDecisionQuality(recentEpisodes);
    
    // Generate insights
    const insights = this.generateStrategicInsights(recentEpisodes);
    
    // Generate recommendations
    const recommendations = this.generateImprovementRecommendations(performance, decisionQuality, insights);
    
    // Assess learning progress
    const learningProgress = this.assessLearningProgress();
    
    const reflection: StrategyReflection = {
      reflectionId: `reflection_${now}`,
      timestamp: now,
      periodStart,
      periodEnd: now,
      executionCount: recentEpisodes.length,
      performance,
      decisionQuality,
      insights,
      recommendations,
      learningProgress,
    };
    
    this.reflections.push(reflection);
    this.lastReflectionTime = now;
    
    // Keep only recent reflections
    if (this.reflections.length > 100) {
      this.reflections = this.reflections.slice(-100);
    }
    
    this.emit('reflectionComplete', reflection);
    
    return [reflection];
  }
  
  /**
   * Calculate average gas efficiency
   */
  private calculateAvgGasEfficiency(episodes: ArbitrageEpisode[]): number {
    if (episodes.length === 0) return 0;
    
    const efficiencies = episodes
      .filter(e => e.outcome?.gasUsed && e.outcome?.actualProfit)
      .map(e => (e.outcome!.actualProfit ?? 0) / Number(e.outcome!.gasUsed ?? 1n));
    
    return efficiencies.length > 0
      ? efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length
      : 0;
  }
  
  /**
   * Analyze decision quality (precision/recall)
   */
  private analyzeDecisionQuality(episodes: ArbitrageEpisode[]): any {
    // True Positive: Executed and successful
    const truePositives = episodes.filter(e => e.decision.executed && e.outcome?.success).length;
    
    // False Positive: Executed but failed
    const falsePositives = episodes.filter(e => e.decision.executed && e.outcome && !e.outcome.success).length;
    
    // False Negative: Not executed but would have been profitable (estimate)
    const falseNegatives = episodes.filter(e =>
      !e.decision.executed &&
      e.decision.riskScore < 0.5 &&
      e.opportunity.netProfit > 0.01
    ).length;
    
    // True Negative: Not executed and was right decision (estimate)
    const trueNegatives = episodes.filter(e =>
      !e.decision.executed &&
      (e.decision.riskScore >= 0.5 || e.opportunity.netProfit <= 0.01)
    ).length;
    
    const total = truePositives + falsePositives + falseNegatives + trueNegatives;
    
    return {
      falsePositives,
      falseNegatives,
      truePositives,
      trueNegatives,
      accuracy: total > 0 ? (truePositives + trueNegatives) / total : 0,
      precision: (truePositives + falsePositives) > 0 ? truePositives / (truePositives + falsePositives) : 0,
      recall: (truePositives + falseNegatives) > 0 ? truePositives / (truePositives + falseNegatives) : 0,
    };
  }
  
  /**
   * Generate strategic insights from episodes
   */
  private generateStrategicInsights(episodes: ArbitrageEpisode[]): any {
    const successful = episodes.filter(e => e.outcome?.success);
    const failed = episodes.filter(e => e.outcome && !e.outcome.success);
    
    // Find most profitable conditions
    const mostProfitableConditions: string[] = [];
    if (successful.length > 0) {
      const avgCongestion = successful.reduce((sum, e) => sum + e.marketState.congestion, 0) / successful.length;
      if (avgCongestion < 0.5) {
        mostProfitableConditions.push('Low congestion');
      }
      
      const avgSearchers = successful.reduce((sum, e) => sum + e.marketState.searcherDensity, 0) / successful.length;
      if (avgSearchers < 0.3) {
        mostProfitableConditions.push('Low searcher competition');
      }
    }
    
    // Find most dangerous conditions
    const mostDangerousConditions: string[] = [];
    if (failed.length > 0) {
      const avgMEVRisk = failed.reduce((sum, e) => sum + e.mevContext.mevRisk, 0) / failed.length;
      if (avgMEVRisk > 0.6) {
        mostDangerousConditions.push('High MEV risk');
      }
    }
    
    return {
      mostProfitableConditions,
      mostDangerousConditions,
      optimalRiskThreshold: this.calculateOptimalRiskThreshold(episodes),
      optimalProfitThreshold: this.calculateOptimalProfitThreshold(episodes),
      bestTimeWindows: this.findBestTimeWindows(episodes),
    };
  }
  
  /**
   * Calculate optimal risk threshold
   */
  private calculateOptimalRiskThreshold(episodes: ArbitrageEpisode[]): number {
    const withOutcome = episodes.filter(e => e.outcome);
    if (withOutcome.length < 10) return 0.5;
    
    // Find threshold that maximizes success rate
    const thresholds = [0.3, 0.4, 0.5, 0.6, 0.7];
    let bestThreshold = 0.5;
    let bestScore = 0;
    
    for (const threshold of thresholds) {
      const wouldExecute = withOutcome.filter(e => e.mevContext.mevRisk <= threshold);
      const successful = wouldExecute.filter(e => e.outcome?.success);
      const score = wouldExecute.length > 0 ? successful.length / wouldExecute.length : 0;
      
      if (score > bestScore) {
        bestScore = score;
        bestThreshold = threshold;
      }
    }
    
    return bestThreshold;
  }
  
  /**
   * Calculate optimal profit threshold
   */
  private calculateOptimalProfitThreshold(episodes: ArbitrageEpisode[]): number {
    const successful = episodes.filter(e => e.outcome?.success);
    if (successful.length === 0) return 0.01;
    
    const profits = successful.map(e => e.outcome?.actualProfit ?? 0).sort((a, b) => a - b);
    const median = profits[Math.floor(profits.length / 2)];
    
    return median * 0.8; // 80% of median successful profit
  }
  
  /**
   * Find best time windows for execution
   */
  private findBestTimeWindows(episodes: ArbitrageEpisode[]): string[] {
    const successful = episodes.filter(e => e.outcome?.success);
    if (successful.length < 5) return [];
    
    const hourlySuccessRate = new Map<number, { success: number; total: number }>();
    
    for (const episode of episodes.filter(e => e.decision.executed)) {
      const hour = new Date(episode.timestamp).getHours();
      const stats = hourlySuccessRate.get(hour) ?? { success: 0, total: 0 };
      stats.total++;
      if (episode.outcome?.success) stats.success++;
      hourlySuccessRate.set(hour, stats);
    }
    
    const bestHours = Array.from(hourlySuccessRate.entries())
      .filter(([_, stats]) => stats.total >= 2)
      .sort((a, b) => (b[1].success / b[1].total) - (a[1].success / a[1].total))
      .slice(0, 3)
      .map(([hour, _]) => `${hour}:00-${hour + 1}:00`);
    
    return bestHours;
  }
  
  /**
   * Generate improvement recommendations
   */
  private generateImprovementRecommendations(performance: any, decisionQuality: any, insights: any): any {
    const parameterAdjustments = new Map<string, number>();
    const strategicChanges: string[] = [];
    const riskManagementTips: string[] = [];
    
    // Parameter adjustments
    if (performance.successRate < 0.5) {
      parameterAdjustments.set('riskThreshold', insights.optimalRiskThreshold);
      strategicChanges.push('Increase selectivity - current success rate too low');
    }
    
    if (decisionQuality.falseNegatives > decisionQuality.truePositives) {
      parameterAdjustments.set('profitThreshold', insights.optimalProfitThreshold * 0.9);
      strategicChanges.push('Being too conservative - missing profitable opportunities');
    }
    
    if (performance.mevLossRate > 0.3) {
      riskManagementTips.push('High MEV loss rate - consider private transaction pools');
      riskManagementTips.push('Increase gas bids for valuable opportunities');
    }
    
    // Time-based recommendations
    if (insights.bestTimeWindows.length > 0) {
      strategicChanges.push(`Focus execution during: ${insights.bestTimeWindows.join(', ')}`);
    }
    
    return {
      parameterAdjustments,
      strategicChanges,
      riskManagementTips,
      confidence: Math.min(0.9, performance.totalProfit > 0 ? 0.6 + (performance.successRate * 0.3) : 0.4),
    };
  }
  
  /**
   * Assess learning progress over time
   */
  private assessLearningProgress(): any {
    if (this.reflections.length < 2) {
      return {
        improvementTrend: 'stable' as const,
        strengthsIdentified: [],
        weaknessesIdentified: [],
        explorationVsExploitation: 0.5,
      };
    }
    
    const recent = this.reflections[this.reflections.length - 1];
    const previous = this.reflections[this.reflections.length - 2];
    
    const profitImprovement = recent.performance.netProfit - previous.performance.netProfit;
    const successImprovement = recent.performance.successRate - previous.performance.successRate;
    
    let improvementTrend: 'improving' | 'stable' | 'declining' = 'stable';
    if (profitImprovement > 0.1 && successImprovement > 0.05) {
      improvementTrend = 'improving';
    } else if (profitImprovement < -0.1 || successImprovement < -0.05) {
      improvementTrend = 'declining';
    }
    
    const strengthsIdentified: string[] = [];
    const weaknessesIdentified: string[] = [];
    
    if (recent.performance.successRate > 0.7) {
      strengthsIdentified.push('High execution success rate');
    }
    if (recent.performance.mevLossRate < 0.2) {
      strengthsIdentified.push('Low MEV loss rate');
    }
    
    if (recent.decisionQuality.falseNegatives > 5) {
      weaknessesIdentified.push('Missing profitable opportunities (false negatives)');
    }
    if (recent.decisionQuality.falsePositives > 5) {
      weaknessesIdentified.push('Executing unprofitable opportunities (false positives)');
    }
    
    return {
      improvementTrend,
      strengthsIdentified,
      weaknessesIdentified,
      explorationVsExploitation: this.calculateExplorationRate(),
    };
  }
  
  /**
   * Calculate exploration rate
   */
  private calculateExplorationRate(): number {
    const recentEpisodes = Array.from(this.episodicMemory.values()).slice(-100);
    if (recentEpisodes.length === 0) return 0.5;
    
    // Episodes with high risk or low profit are considered "exploration"
    const exploratoryCount = recentEpisodes.filter(e =>
      e.decision.executed &&
      (e.mevContext.mevRisk > 0.6 || e.opportunity.netProfit < 0.02)
    ).length;
    
    return exploratoryCount / recentEpisodes.length;
  }
  
  /**
   * Calculate ethical score
   */
  private calculateEthicalScore(opportunity: any): number {
    let score = 1.0;
    
    // Deduct for high MEV risk
    if (opportunity.mevRisk > 0.7) score -= 0.3;
    
    // Deduct for low profit (resource waste)
    if (opportunity.profit < 0.001) score -= 0.2;
    
    return Math.max(0, score);
  }
  
  /**
   * Calculate confidence score
   */
  private calculateConfidenceScore(opportunity: any, marketState: any): number {
    let confidence = 0.5;
    
    // Higher confidence in favorable conditions
    if (marketState.congestion < 0.5) confidence += 0.2;
    if (marketState.searcherDensity < 0.3) confidence += 0.2;
    if (opportunity.profit > 0.05) confidence += 0.1;
    
    return Math.min(1.0, confidence);
  }
  
  /**
   * Get episodic memory
   */
  getEpisodicMemory(): ArbitrageEpisode[] {
    return Array.from(this.episodicMemory.values());
  }
  
  /**
   * Get adversarial patterns
   */
  getAdversarialPatterns(): AdversarialPattern[] {
    return Array.from(this.adversarialPatterns.values());
  }
  
  /**
   * Get reflections
   */
  getReflections(): StrategyReflection[] {
    return [...this.reflections];
  }
  
  /**
   * Get consciousness snapshot for persistence
   */
  getSnapshot(): ConsciousnessSnapshot {
    const episodes = Array.from(this.episodicMemory.values());
    const stats = this.getStatistics();
    
    return {
      timestamp: Date.now(),
      version: '3.0.0-phase3',
      memoryStats: {
        episodeCount: this.episodicMemory.size,
        patternCount: this.detectedPatterns.size,
        adversarialPatternCount: this.adversarialPatterns.size,
        reflectionCount: this.reflections.length,
        oldestEpisode: episodes.length > 0 ? Math.min(...episodes.map(e => e.timestamp)) : 0,
        newestEpisode: episodes.length > 0 ? Math.max(...episodes.map(e => e.timestamp)) : 0,
      },
      currentState: {
        learningRate: this.learningRate,
        explorationRate: this.calculateExplorationRate(),
        riskTolerance: 0.5,
        ethicalThreshold: 0.7,
        confidence: stats.successRate,
      },
      keyInsights: {
        topPatterns: this.getDetectedPatterns().slice(0, 5).map(p => p.description),
        topAdversaries: Array.from(this.adversarialPatterns.values()).slice(0, 3).map(p => p.description),
        bestStrategies: this.reflections.length > 0 ? this.reflections[this.reflections.length - 1].insights.mostProfitableConditions : [],
        worstConditions: this.reflections.length > 0 ? this.reflections[this.reflections.length - 1].insights.mostDangerousConditions : [],
      },
      performanceSummary: {
        totalExecutions: stats.totalExecutions,
        successRate: stats.successRate,
        avgProfit: stats.averageProfit,
        totalMEVLoss: 0,
        learningVelocity: this.reflections.length > 1 ? 
          (this.reflections[this.reflections.length - 1].performance.successRate - 
           this.reflections[0].performance.successRate) : 0,
      },
    };
  }
  
  /**
   * Get integrated consciousness modules for external access
   */
  getConsciousnessModules() {
    return {
      learningEngine: this.learningEngine,
      patternTracker: this.patternTracker,
      historicalAnalyzer: this.historicalAnalyzer,
      spatialReasoning: this.spatialReasoning,
      multiPathExplorer: this.multiPathExplorer,
      opportunityScorer: this.opportunityScorer,
      patternRecognition: this.patternRecognition,
      riskAssessor: this.riskAssessor,
      riskCalibrator: this.riskCalibrator,
      thresholdManager: this.thresholdManager,
      autonomousGoals: this.autonomousGoals,
      operationalPlaybook: this.operationalPlaybook,
      architecturalPrinciples: this.architecturalPrinciples,
      evolutionTracker: this.evolutionTracker
    };
  }
  
  /**
   * Get comprehensive insights from all consciousness modules
   */
  getComprehensiveInsights() {
    return {
      // Learning insights
      learning: {
        skills: Array.from((this.learningEngine as any).skills.values()),
        sessions: Array.from((this.learningEngine as any).sessions.values()).slice(-5)
      },
      
      // Pattern insights
      patterns: {
        all: Array.from((this.patternTracker as any).patterns.values()),
        recognized: this.patternRecognition.getStats(),
        marketPatterns: this.getDetectedPatterns()
      },
      
      // Historical insights
      historical: {
        observations: (this.historicalAnalyzer as any).events?.slice(-20) || []
      },
      
      // Risk insights
      risk: {
        factors: Array.from((this.riskAssessor as any).factors.values()),
        assessments: Array.from((this.riskAssessor as any).assessments.values()).slice(-5)
      },
      
      // Goal progress
      goals: {
        all: Array.from((this.autonomousGoals as any).goals.values()),
        active: Array.from((this.autonomousGoals as any).goals.values()).filter((g: any) => g.status === 'ACTIVE'),
        completed: Array.from((this.autonomousGoals as any).goals.values()).filter((g: any) => g.status === 'COMPLETED')
      },
      
      // Strategy insights
      strategy: {
        spatialStats: this.spatialReasoning.getStats(),
        pathExploration: this.multiPathExplorer.getStats(),
        opportunityScoring: this.opportunityScorer.getStats()
      },
      
      // Evolution tracking
      evolution: {
        phases: (this.evolutionTracker as any).phases || [],
        milestones: (this.evolutionTracker as any).milestones || []
      },
      
      // Consciousness state
      consciousness: {
        snapshot: this.getSnapshot(),
        statistics: this.getStatistics(),
        reflections: this.getReflections().slice(-5)
      }
    };
  }
  
  /**
   * Use spatial reasoning to analyze opportunity space
   */
  analyzeSpatialOpportunities(opportunities: any[]): any {
    // Return spatial reasoning stats instead of trying to analyze complex problem space
    // This provides insights into the multi-dimensional analysis capabilities
    return {
      opportunityCount: opportunities.length,
      spatialStats: this.spatialReasoning.getStats(),
      dimensions: ['profit', 'risk', 'congestion', 'time', 'gas'],
      message: 'Spatial reasoning engine available for multi-dimensional opportunity analysis'
    };
  }
  
  /**
   * Use pattern recognition to find similar past situations
   */
  recognizeSimilarSituations(currentState: any): any {
    // Use pattern tracker predictions instead
    return this.patternTracker.getPredictions(currentState);
  }
}
