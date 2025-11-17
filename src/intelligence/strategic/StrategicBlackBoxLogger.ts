/**
 * Strategic Black Box Logger
 * 
 * Integrated from AxionCitadel: Advanced outcome tracking for consciousness decisions
 * This logger captures and analyzes the effectiveness of consciousness decisions,
 * tracking predicted vs actual outcomes for continuous learning and improvement.
 * 
 * @source https://github.com/metalxalloy/AxionCitadel
 * @integrated 2025-11-17
 */

import * as fs from 'fs';
import * as path from 'path';

export interface DecisionOutcome {
  // Decision metadata
  timestamp: string;
  decisionId: string;
  decisionType: string;
  strategy: string;
  
  // Resource metrics
  resourcesAllocated: number;
  processingTime: number;
  cognitiveLoad: number;
  
  // Performance metrics
  confidenceLevel: number;
  predictedQuality: number;
  actualQuality: number;
  
  // Context metrics
  contextComplexity: number;
  memoryAccess: number;
  temporalRelevance: number;
  
  // Outcome analysis
  expectedOutcome: any;
  actualOutcome: any;
  deviationScore: number;
  
  // Learning signals
  isNovel: boolean;
  requiresAdaptation: boolean;
  status: 'success' | 'partial' | 'failure';
}

export interface TradeOutcome {
  // Transaction metadata
  txHash: string;
  strategy: string;
  txValueEth: number;
  gasUsed: number;
  blocksToInclusion: number;
  
  // MEV metrics
  congestionScore: number;
  searcherDensity: number;
  predictedMEVRisk: number;
  
  // Performance metrics
  expectedOutputEth: number;
  actualOutputEth: number;
  poolType: string;
  isBackrunnable: boolean;
}

export class StrategicBlackBoxLogger {
  private logDir: string;
  private decisionLogFile: string;
  private tradeLogFile: string;
  
  constructor(logDir: string = 'logs/strategic') {
    this.logDir = logDir;
    this.decisionLogFile = path.join(logDir, 'decision-outcomes.jsonl');
    this.tradeLogFile = path.join(logDir, 'trade-outcomes.jsonl');
    
    // Ensure log directory exists
    this.ensureLogDirectory();
  }
  
  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }
  
  /**
   * Log consciousness decision outcomes for learning and adaptation
   */
  logDecisionOutcome(params: DecisionOutcome): void {
    const deviation = Math.abs(params.predictedQuality - params.actualQuality);
    const deviationPct = params.predictedQuality === 0 
      ? 0 
      : (deviation / params.predictedQuality) * 100;
    
    const logEntry = {
      timestamp: params.timestamp || new Date().toISOString(),
      decision_id: params.decisionId,
      decision_type: params.decisionType,
      strategy: params.strategy,
      
      // Resource metrics
      resources_allocated: params.resourcesAllocated,
      processing_time_ms: params.processingTime,
      cognitive_load: params.cognitiveLoad,
      
      // Performance metrics
      confidence_level: params.confidenceLevel,
      predicted_quality: params.predictedQuality,
      actual_quality: params.actualQuality,
      quality_deviation_pct: deviationPct,
      
      // Context metrics
      context_complexity: params.contextComplexity,
      memory_access_count: params.memoryAccess,
      temporal_relevance: params.temporalRelevance,
      
      // Outcome data
      expected_outcome: params.expectedOutcome,
      actual_outcome: params.actualOutcome,
      deviation_score: params.deviationScore,
      
      // Learning signals
      is_novel: params.isNovel,
      requires_adaptation: params.requiresAdaptation,
      status: params.status,
    };
    
    console.log('[StrategicBlackBoxLogger] Decision:', JSON.stringify(logEntry, null, 2));
    
    try {
      fs.appendFileSync(
        this.decisionLogFile,
        JSON.stringify(logEntry) + '\n',
        'utf8'
      );
    } catch (error) {
      console.error('[StrategicBlackBoxLogger] Error writing decision log:', error);
    }
  }
  
  /**
   * Log trade/arbitrage outcomes (from AxionCitadel)
   * Tracks MEV risk predictions vs actual outcomes
   */
  logTradeOutcome(params: TradeOutcome): void {
    const {
      txHash,
      strategy,
      txValueEth,
      gasUsed,
      blocksToInclusion,
      congestionScore,
      searcherDensity,
      predictedMEVRisk,
      expectedOutputEth,
      actualOutputEth,
      poolType,
      isBackrunnable,
    } = params;
    
    const actualLeakage = expectedOutputEth - actualOutputEth;
    const slippage = expectedOutputEth === 0 
      ? 0 
      : (actualLeakage / expectedOutputEth) * 100;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      tx_hash: txHash,
      strategy,
      tx_value_eth: txValueEth,
      gas_used: gasUsed,
      blocks_to_inclusion: blocksToInclusion,
      congestion_score: congestionScore,
      searcher_density: searcherDensity,
      pool_type: poolType,
      is_backrunnable: isBackrunnable,
      predicted_mev_risk_eth: predictedMEVRisk,
      expected_output_eth: expectedOutputEth,
      actual_output_eth: actualOutputEth,
      actual_mev_leakage_eth: actualLeakage,
      slippage_pct: slippage,
      status: 'success',
    };
    
    console.log('[StrategicBlackBoxLogger] Trade:', JSON.stringify(logEntry, null, 2));
    
    try {
      fs.appendFileSync(
        this.tradeLogFile,
        JSON.stringify(logEntry) + '\n',
        'utf8'
      );
    } catch (error) {
      console.error('[StrategicBlackBoxLogger] Error writing trade log:', error);
    }
  }
  
  /**
   * Analyze recent decision outcomes to identify patterns
   */
  analyzeRecentDecisions(count: number = 100): {
    totalDecisions: number;
    successRate: number;
    averageDeviation: number;
    adaptationTriggers: number;
    novelExperiences: number;
  } {
    try {
      if (!fs.existsSync(this.decisionLogFile)) {
        return {
          totalDecisions: 0,
          successRate: 0,
          averageDeviation: 0,
          adaptationTriggers: 0,
          novelExperiences: 0,
        };
      }
      
      const content = fs.readFileSync(this.decisionLogFile, 'utf8');
      const lines = content.trim().split('\n').slice(-count);
      const decisions = lines.map(line => JSON.parse(line));
      
      const successes = decisions.filter(d => d.status === 'success').length;
      const totalDeviation = decisions.reduce((sum, d) => sum + (d.quality_deviation_pct || 0), 0);
      const adaptations = decisions.filter(d => d.requires_adaptation).length;
      const novel = decisions.filter(d => d.is_novel).length;
      
      return {
        totalDecisions: decisions.length,
        successRate: decisions.length > 0 ? (successes / decisions.length) * 100 : 0,
        averageDeviation: decisions.length > 0 ? totalDeviation / decisions.length : 0,
        adaptationTriggers: adaptations,
        novelExperiences: novel,
      };
    } catch (error) {
      console.error('[StrategicBlackBoxLogger] Error analyzing decisions:', error);
      return {
        totalDecisions: 0,
        successRate: 0,
        averageDeviation: 0,
        adaptationTriggers: 0,
        novelExperiences: 0,
      };
    }
  }
}

export default StrategicBlackBoxLogger;
