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
 * TheWarden uses this class as its "brain" to make informed, adaptive decisions about
 * which opportunities to execute based on risk, ethics, and long-term strategy.
 */

import { EventEmitter } from 'events';

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
  
  constructor(
    learningRate: number = 0.05,
    maxHistorySize: number = 1000
  ) {
    super();
    this.learningRate = learningRate;
    this.maxHistorySize = maxHistorySize;
    
    console.log('[ArbitrageConsciousness] Initialized - AEV cognitive layer active');
    console.log(`  Learning rate: ${learningRate}`);
    console.log(`  Max history size: ${maxHistorySize}`);
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
    
    // Trigger pattern detection
    this.detectPatterns();
    
    // Trigger learning
    this.learnFromExecution(execution);
    
    this.emit('executionRecorded', execution);
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
}
