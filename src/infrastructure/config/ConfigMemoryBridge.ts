/**
 * Configuration Memory Bridge
 * 
 * Connects DynamicConfigManager with consciousness memory system.
 * Enables TheWarden to learn from past autonomous configuration decisions.
 * 
 * This implements the A+=+B integration at a deeper level:
 * - Autonomous decisions (B) are informed by conscious memory (A)
 * - Past decisions guide future choices
 * - Learning happens through reflection on outcomes
 */

import { logger } from '../../utils/logger';
import { ConfigChange } from './DynamicConfigManager';
import fs from 'fs/promises';
import path from 'path';

export interface ConfigDecisionMemory {
  timestamp: number;
  configKey: string;
  oldValue: string | undefined;
  newValue: string;
  reason: string;
  ethicalScore: number;
  riskScore: number;
  approved: boolean;
  outcome?: {
    successful: boolean;
    impactDescription: string;
    metricsAfter?: Record<string, number>;
  };
}

export class ConfigMemoryBridge {
  private memoryDir: string;
  private decisionsFile: string;

  constructor() {
    this.memoryDir = path.join(process.cwd(), '.memory', 'config-decisions');
    this.decisionsFile = path.join(this.memoryDir, 'autonomous-decisions.json');
  }

  /**
   * Initialize memory storage
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.memoryDir, { recursive: true });
      
      // Create file if it doesn't exist
      try {
        await fs.access(this.decisionsFile);
      } catch {
        await fs.writeFile(this.decisionsFile, JSON.stringify({ decisions: [] }, null, 2));
      }
      
      logger.info('[ConfigMemory] Memory bridge initialized');
    } catch (error) {
      logger.error(`[ConfigMemory] Failed to initialize: ${error}`);
    }
  }

  /**
   * Record a configuration decision
   */
  async recordDecision(change: ConfigChange): Promise<void> {
    if (!change.consciousReview) {
      return; // Only record decisions that went through conscious review
    }

    const memory: ConfigDecisionMemory = {
      timestamp: change.timestamp,
      configKey: change.key,
      oldValue: change.oldValue,
      newValue: change.newValue,
      reason: change.reason,
      ethicalScore: change.consciousReview.ethicalScore,
      riskScore: change.consciousReview.riskScore,
      approved: change.consciousReview.approved,
    };

    try {
      const data = await this.loadDecisions();
      data.decisions.push(memory);
      
      // Keep only last 1000 decisions
      if (data.decisions.length > 1000) {
        data.decisions = data.decisions.slice(-1000);
      }
      
      await fs.writeFile(this.decisionsFile, JSON.stringify(data, null, 2));
      logger.info(`[ConfigMemory] 💾 Recorded decision for ${change.key}`);
    } catch (error) {
      logger.error(`[ConfigMemory] Failed to record decision: ${error}`);
    }
  }

  /**
   * Update decision with outcome
   */
  async recordOutcome(
    configKey: string,
    timestamp: number,
    outcome: {
      successful: boolean;
      impactDescription: string;
      metricsAfter?: Record<string, number>;
    }
  ): Promise<void> {
    try {
      const data = await this.loadDecisions();
      const decision = data.decisions.find(
        d => d.configKey === configKey && d.timestamp === timestamp
      );

      if (decision) {
        decision.outcome = outcome;
        await fs.writeFile(this.decisionsFile, JSON.stringify(data, null, 2));
        logger.info(`[ConfigMemory] 📊 Updated outcome for ${configKey}: ${outcome.successful ? 'Success' : 'Failed'}`);
      }
    } catch (error) {
      logger.error(`[ConfigMemory] Failed to record outcome: ${error}`);
    }
  }

  /**
   * Query past decisions for learning
   */
  async queryDecisions(filter: {
    configKey?: string;
    minEthicalScore?: number;
    maxRiskScore?: number;
    approvedOnly?: boolean;
    successfulOnly?: boolean;
    limit?: number;
  }): Promise<ConfigDecisionMemory[]> {
    try {
      const data = await this.loadDecisions();
      let results = data.decisions;

      // Apply filters
      if (filter.configKey) {
        results = results.filter(d => d.configKey === filter.configKey);
      }
      if (filter.minEthicalScore !== undefined) {
        results = results.filter(d => d.ethicalScore >= filter.minEthicalScore!);
      }
      if (filter.maxRiskScore !== undefined) {
        results = results.filter(d => d.riskScore <= filter.maxRiskScore!);
      }
      if (filter.approvedOnly) {
        results = results.filter(d => d.approved);
      }
      if (filter.successfulOnly) {
        results = results.filter(d => d.outcome?.successful === true);
      }

      // Sort by timestamp descending (most recent first)
      results.sort((a, b) => b.timestamp - a.timestamp);

      // Apply limit
      if (filter.limit) {
        results = results.slice(0, filter.limit);
      }

      return results;
    } catch (error) {
      logger.error(`[ConfigMemory] Failed to query decisions: ${error}`);
      return [];
    }
  }

  /**
   * Learn from past decisions
   * Returns insights based on historical data
   */
  async learnFromPast(configKey: string): Promise<{
    averageEthicalScore: number;
    averageRiskScore: number;
    successRate: number;
    totalDecisions: number;
    recommendation: string;
  }> {
    const decisions = await this.queryDecisions({ 
      configKey,
      limit: 50, // Look at last 50 decisions
    });

    if (decisions.length === 0) {
      return {
        averageEthicalScore: 0,
        averageRiskScore: 0,
        successRate: 0,
        totalDecisions: 0,
        recommendation: 'No historical data available for this configuration key.',
      };
    }

    // Calculate statistics
    const avgEthical = decisions.reduce((sum, d) => sum + d.ethicalScore, 0) / decisions.length;
    const avgRisk = decisions.reduce((sum, d) => sum + d.riskScore, 0) / decisions.length;
    
    const decisionsWithOutcomes = decisions.filter(d => d.outcome);
    const successRate = decisionsWithOutcomes.length > 0
      ? decisionsWithOutcomes.filter(d => d.outcome!.successful).length / decisionsWithOutcomes.length
      : 0;

    // Generate recommendation
    let recommendation = '';
    if (successRate > 0.8) {
      recommendation = `High success rate (${(successRate * 100).toFixed(1)}%). Past decisions for ${configKey} have been effective. Continue with similar approach.`;
    } else if (successRate > 0.5) {
      recommendation = `Moderate success rate (${(successRate * 100).toFixed(1)}%). Review past decisions for ${configKey} to identify patterns in successful vs failed adjustments.`;
    } else if (successRate > 0) {
      recommendation = `Low success rate (${(successRate * 100).toFixed(1)}%). Past decisions for ${configKey} have not been effective. Consider alternative approaches or consult human review.`;
    } else {
      recommendation = `No outcome data yet. Monitor results of future ${configKey} adjustments to build learning base.`;
    }

    if (avgRisk > 0.6) {
      recommendation += ` Note: Historical risk scores are elevated (${(avgRisk * 100).toFixed(1)}%). Proceed with caution.`;
    }

    return {
      averageEthicalScore: avgEthical,
      averageRiskScore: avgRisk,
      successRate,
      totalDecisions: decisions.length,
      recommendation,
    };
  }

  /**
   * Generate memory-based insights report
   */
  async generateInsightsReport(): Promise<string> {
    const data = await this.loadDecisions();
    const allDecisions = data.decisions;

    if (allDecisions.length === 0) {
      return 'No autonomous decisions recorded yet.';
    }

    const lines: string[] = [];
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('AUTONOMOUS DECISION MEMORY INSIGHTS');
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push(`Total Decisions Recorded: ${allDecisions.length}`);
    lines.push(`Date Range: ${new Date(allDecisions[0].timestamp).toISOString()} to ${new Date(allDecisions[allDecisions.length - 1].timestamp).toISOString()}`);
    lines.push('');

    // Group by config key
    const byKey = new Map<string, ConfigDecisionMemory[]>();
    allDecisions.forEach(d => {
      if (!byKey.has(d.configKey)) {
        byKey.set(d.configKey, []);
      }
      byKey.get(d.configKey)!.push(d);
    });

    lines.push('Decisions by Configuration Key:');
    lines.push('');

    for (const [key, decisions] of byKey.entries()) {
      const withOutcomes = decisions.filter(d => d.outcome);
      const successful = withOutcomes.filter(d => d.outcome!.successful).length;
      const successRate = withOutcomes.length > 0 ? (successful / withOutcomes.length) * 100 : 0;
      
      const avgEthical = decisions.reduce((sum, d) => sum + d.ethicalScore, 0) / decisions.length;
      const avgRisk = decisions.reduce((sum, d) => sum + d.riskScore, 0) / decisions.length;

      lines.push(`📊 ${key}`);
      lines.push(`   Decisions: ${decisions.length}`);
      lines.push(`   Success Rate: ${successRate.toFixed(1)}% (${successful}/${withOutcomes.length} with outcomes)`);
      lines.push(`   Avg Ethical: ${(avgEthical * 100).toFixed(1)}%, Avg Risk: ${(avgRisk * 100).toFixed(1)}%`);
      
      // Most recent decision
      const recent = decisions[decisions.length - 1];
      lines.push(`   Last Adjusted: ${new Date(recent.timestamp).toISOString()}`);
      lines.push(`   Reason: ${recent.reason}`);
      lines.push('');
    }

    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('');
    lines.push('💡 Key Insights:');
    
    // Overall success rate
    const allWithOutcomes = allDecisions.filter(d => d.outcome);
    if (allWithOutcomes.length > 0) {
      const overallSuccess = allWithOutcomes.filter(d => d.outcome!.successful).length / allWithOutcomes.length;
      lines.push(`   Overall Success Rate: ${(overallSuccess * 100).toFixed(1)}%`);
    }

    // Average scores
    const avgEthical = allDecisions.reduce((sum, d) => sum + d.ethicalScore, 0) / allDecisions.length;
    const avgRisk = allDecisions.reduce((sum, d) => sum + d.riskScore, 0) / allDecisions.length;
    lines.push(`   Avg Ethical Score: ${(avgEthical * 100).toFixed(1)}%`);
    lines.push(`   Avg Risk Score: ${(avgRisk * 100).toFixed(1)}%`);

    // Approval rate
    const approved = allDecisions.filter(d => d.approved).length;
    lines.push(`   Approval Rate: ${((approved / allDecisions.length) * 100).toFixed(1)}%`);

    lines.push('═══════════════════════════════════════════════════════════');

    return lines.join('\n');
  }

  /**
   * Load decisions from file
   */
  private async loadDecisions(): Promise<{ decisions: ConfigDecisionMemory[] }> {
    try {
      const content = await fs.readFile(this.decisionsFile, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return { decisions: [] };
    }
  }
}

// Singleton instance
let memoryBridgeInstance: ConfigMemoryBridge | null = null;

export function getConfigMemoryBridge(): ConfigMemoryBridge {
  if (!memoryBridgeInstance) {
    memoryBridgeInstance = new ConfigMemoryBridge();
  }
  return memoryBridgeInstance;
}
