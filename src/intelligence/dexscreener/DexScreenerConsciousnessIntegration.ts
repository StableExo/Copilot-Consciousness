/**
 * DEXScreener Consciousness Integration
 * 
 * Connects DEXScreener intelligence to TheWarden's consciousness system,
 * enabling autonomous learning and decision-making based on market intelligence.
 */

import { DexScreenerClient } from './DexScreenerClient';
import { DexScreenerIntelligenceAnalyzer } from './DexScreenerIntelligenceAnalyzer';
import type { MarketIntelligence, ChainId, MarketFilters } from './types';

export interface ConsciousnessEvent {
  type: 'observation' | 'insight' | 'decision' | 'learning';
  timestamp: number;
  source: 'dexscreener';
  data: unknown;
  significance: number; // 0-1 scale
}

export interface LearningOutcome {
  pattern: string;
  confidence: number;
  evidence: string[];
  actionable: boolean;
}

/**
 * Integration layer between DEXScreener intelligence and consciousness system
 */
export class DexScreenerConsciousnessIntegration {
  private client: DexScreenerClient;
  private analyzer: DexScreenerIntelligenceAnalyzer;
  private consciousnessEvents: ConsciousnessEvent[] = [];
  private learnings: Map<string, LearningOutcome> = new Map();
  private scanInterval: NodeJS.Timeout | null = null;

  constructor(apiKey?: string) {
    this.client = new DexScreenerClient({ apiKey });
    this.analyzer = new DexScreenerIntelligenceAnalyzer(this.client);
  }

  /**
   * Start autonomous intelligence gathering on specified chains
   */
  startAutonomousScanning(
    chains: ChainId[],
    intervalMinutes: number = 5,
    filters?: MarketFilters
  ): void {
    if (this.scanInterval) {
      console.warn('Autonomous scanning already active');
      return;
    }

    console.log(`Starting autonomous DEXScreener scanning on chains: ${chains.join(', ')}`);
    console.log(`Scan interval: ${intervalMinutes} minutes`);

    // Initial scan
    this.performScan(chains, filters).catch(console.error);

    // Schedule periodic scans
    this.scanInterval = setInterval(() => {
      this.performScan(chains, filters).catch(console.error);
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop autonomous scanning
   */
  stopAutonomousScanning(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
      console.log('Autonomous DEXScreener scanning stopped');
    }
  }

  /**
   * Perform a single intelligence scan
   */
  private async performScan(chains: ChainId[], filters?: MarketFilters): Promise<MarketIntelligence> {
    const intelligence = await this.analyzer.gatherMarketIntelligence(chains, filters);

    // Record observation
    this.recordConsciousnessEvent({
      type: 'observation',
      timestamp: Date.now(),
      source: 'dexscreener',
      data: {
        chains,
        summary: intelligence.summary,
        opportunitiesFound: intelligence.opportunities.length,
        warningsGenerated: intelligence.warnings.length,
      },
      significance: this.calculateSignificance(intelligence),
    });

    // Generate insights
    this.generateInsights(intelligence);

    // Learn from patterns
    this.learnFromData(intelligence);

    return intelligence;
  }

  /**
   * Calculate significance of intelligence data (for consciousness prioritization)
   */
  private calculateSignificance(intelligence: MarketIntelligence): number {
    let significance = 0;

    // New pairs are interesting
    significance += intelligence.summary.newPairsDetected * 0.1;

    // High-value opportunities are very significant
    const topOpportunities = intelligence.opportunities.filter(o => o.score > 80);
    significance += topOpportunities.length * 0.2;

    // Critical warnings are extremely significant
    const criticalWarnings = intelligence.warnings.filter(w => w.severity === 'critical');
    significance += criticalWarnings.length * 0.3;

    // Suspicious activity is noteworthy
    significance += intelligence.summary.suspiciousActivity * 0.05;

    return Math.min(1, significance);
  }

  /**
   * Generate insights from market intelligence
   */
  private generateInsights(intelligence: MarketIntelligence): void {
    // Insight: Market activity patterns
    if (intelligence.summary.newPairsDetected > 10) {
      this.recordConsciousnessEvent({
        type: 'insight',
        timestamp: Date.now(),
        source: 'dexscreener',
        data: {
          insight: 'High new pair creation detected - market is active',
          pairCount: intelligence.summary.newPairsDetected,
        },
        significance: 0.6,
      });
    }

    // Insight: Risk patterns
    const riskRatio = intelligence.summary.suspiciousActivity / 
                      Math.max(1, intelligence.summary.totalPairsScanned);
    if (riskRatio > 0.3) {
      this.recordConsciousnessEvent({
        type: 'insight',
        timestamp: Date.now(),
        source: 'dexscreener',
        data: {
          insight: 'High proportion of suspicious pairs - market conditions risky',
          riskRatio: riskRatio.toFixed(2),
        },
        significance: 0.8,
      });
    }

    // Insight: Opportunity concentration
    if (intelligence.opportunities.length > 0) {
      const chainDistribution = new Map<string, number>();
      intelligence.opportunities.forEach(opp => {
        chainDistribution.set(opp.chainId, (chainDistribution.get(opp.chainId) || 0) + 1);
      });

      const dominantChain = Array.from(chainDistribution.entries())
        .sort((a, b) => b[1] - a[1])[0];

      if (dominantChain && dominantChain[1] > intelligence.opportunities.length * 0.5) {
        this.recordConsciousnessEvent({
          type: 'insight',
          timestamp: Date.now(),
          source: 'dexscreener',
          data: {
            insight: `Opportunities concentrated on ${dominantChain[0]}`,
            concentration: (dominantChain[1] / intelligence.opportunities.length * 100).toFixed(0) + '%',
          },
          significance: 0.5,
        });
      }
    }
  }

  /**
   * Learn patterns from market data
   */
  private learnFromData(intelligence: MarketIntelligence): void {
    // Pattern: Successful launches
    const successfulNewPairs = intelligence.opportunities.filter(opp => {
      const pair = opp.data;
      return pair.pairCreatedAt && 
             (Date.now() - pair.pairCreatedAt) < 3600000 && // Less than 1 hour old
             opp.score > 70;
    });

    if (successfulNewPairs.length > 0) {
      const pattern = 'high_quality_new_launches';
      const existing = this.learnings.get(pattern);
      const newConfidence = existing ? 
        Math.min(1, existing.confidence + 0.05) : 
        0.6;

      this.learnings.set(pattern, {
        pattern,
        confidence: newConfidence,
        evidence: successfulNewPairs.map(o => 
          `${o.chainId}:${o.pairAddress} (score: ${o.score})`
        ),
        actionable: true,
      });
    }

    // Pattern: Manipulation indicators
    const manipulationWarnings = intelligence.warnings.filter(w => 
      w.type === 'price_manipulation'
    );

    if (manipulationWarnings.length > 0) {
      const pattern = 'wash_trading_detection';
      const existing = this.learnings.get(pattern);
      const newConfidence = existing ?
        Math.min(1, existing.confidence + 0.03) :
        0.5;

      this.learnings.set(pattern, {
        pattern,
        confidence: newConfidence,
        evidence: manipulationWarnings.map(w => w.details),
        actionable: true,
      });
    }
  }

  /**
   * Record a consciousness event
   */
  private recordConsciousnessEvent(event: ConsciousnessEvent): void {
    this.consciousnessEvents.push(event);

    // Keep only recent events (last 1000)
    if (this.consciousnessEvents.length > 1000) {
      this.consciousnessEvents = this.consciousnessEvents.slice(-1000);
    }

    // Log high-significance events
    if (event.significance > 0.7) {
      console.log('[DEXScreener Consciousness]', {
        type: event.type,
        significance: event.significance.toFixed(2),
        data: event.data,
      });
    }
  }

  /**
   * Get recent consciousness events
   */
  getRecentEvents(limit: number = 10): ConsciousnessEvent[] {
    return this.consciousnessEvents.slice(-limit);
  }

  /**
   * Get high-significance events
   */
  getHighSignificanceEvents(minSignificance: number = 0.7): ConsciousnessEvent[] {
    return this.consciousnessEvents.filter(e => e.significance >= minSignificance);
  }

  /**
   * Get all learnings
   */
  getLearnings(): LearningOutcome[] {
    return Array.from(this.learnings.values());
  }

  /**
   * Get actionable learnings (can be used for decision-making)
   */
  getActionableLearnings(minConfidence: number = 0.6): LearningOutcome[] {
    return Array.from(this.learnings.values())
      .filter(l => l.actionable && l.confidence >= minConfidence);
  }

  /**
   * Get current state summary for consciousness system
   */
  getConsciousnessStateSummary(): {
    isScanning: boolean;
    totalEvents: number;
    highSignificanceEvents: number;
    learningsAcquired: number;
    actionableInsights: number;
    analyzerStats: ReturnType<DexScreenerIntelligenceAnalyzer['getStats']>;
  } {
    return {
      isScanning: this.scanInterval !== null,
      totalEvents: this.consciousnessEvents.length,
      highSignificanceEvents: this.getHighSignificanceEvents().length,
      learningsAcquired: this.learnings.size,
      actionableInsights: this.getActionableLearnings().length,
      analyzerStats: this.analyzer.getStats(),
    };
  }

  /**
   * Query specific intelligence for a token
   */
  async queryToken(tokenAddress: string): Promise<{
    pairs: ReturnType<DexScreenerClient['getPairsByTokens']>;
    analysis: Awaited<ReturnType<DexScreenerClient['analyzePairSafety']>>[];
  }> {
    const pairs = await this.client.getPairsByTokens([tokenAddress]);
    const analyses = await Promise.all(
      pairs.map(pair => this.client.analyzePairSafety(pair))
    );

    return { pairs, analysis: analyses };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    return this.client.healthCheck();
  }
}

export default DexScreenerConsciousnessIntegration;
