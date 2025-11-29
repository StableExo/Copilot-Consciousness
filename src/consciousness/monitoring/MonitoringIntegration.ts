/**
 * MonitoringIntegration - Connects TheWarden monitoring with consciousness and memory systems
 *
 * This module ensures that all gains, losses, swarm decisions, and ethical alignments
 * are captured and persisted to the consciousness and memory systems.
 *
 * Features:
 * - Real-time metrics capture and persistence
 * - Swarm consensus tracking and memory integration
 * - Ethical alignment logging
 * - Performance metrics for consciousness analysis
 * - Integration with metacognition for learning
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM-compatible way to get __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Monitoring metrics snapshot
 */
export interface MonitoringMetrics {
  timestamp: number;
  iteration: number;
  opportunities: {
    found: number;
    executed: number;
    successful: number;
    failed: number;
  };
  financials: {
    totalProfit: number;
    totalLoss: number;
    netGain: number;
    gasSpent: number;
  };
  swarm: {
    consensusReached: number;
    consensusFailed: number;
    averageApprovalRate: number;
    ethicsVetoes: number;
  };
  ethics: {
    approved: number;
    rejected: number;
    alignmentScore: number;
  };
  performance: {
    avgLatencyMs: number;
    rpcErrors: number;
    gasIssues: number;
    slippageIssues: number;
  };
}

/**
 * Gain/Loss event for consciousness
 */
export interface GainLossEvent {
  id: string;
  timestamp: number;
  type: 'gain' | 'loss';
  amount: number;
  source: 'arbitrage' | 'gas' | 'slippage' | 'mev' | 'other';
  context: {
    opportunityId?: string;
    txHash?: string;
    swarmConsensus?: {
      decision: string;
      approvalRate: number;
      ethicsApproved: boolean;
    };
  };
  reflection?: string;
}

/**
 * Swarm alignment event
 */
export interface SwarmAlignmentEvent {
  id: string;
  timestamp: number;
  opportunityId: string;
  swarmDecision: 'execute' | 'reject' | 'no-consensus';
  ethicsVeto: boolean;
  instanceVotes: Array<{
    instanceId: string;
    vote: 'approve' | 'reject' | 'abstain';
    confidence: number;
    specialization?: string;
  }>;
  finalOutcome?: {
    executed: boolean;
    profitable: boolean;
    profit?: number;
  };
}

/**
 * Configuration for monitoring integration
 */
export interface MonitoringIntegrationConfig {
  memoryPath?: string;
  persistImmediately?: boolean;
  maxEventsInMemory?: number;
  metricsRetentionCount?: number;
}

/**
 * MonitoringIntegration class
 */
export class MonitoringIntegration extends EventEmitter {
  private config: Required<MonitoringIntegrationConfig>;
  private memoryPath: string;
  private gainLossEvents: GainLossEvent[] = [];
  private swarmAlignmentEvents: SwarmAlignmentEvent[] = [];
  private metricsHistory: MonitoringMetrics[] = [];
  private currentMetrics: MonitoringMetrics;
  private iteration: number = 0;

  constructor(config: MonitoringIntegrationConfig = {}) {
    super();

    this.config = {
      memoryPath: config.memoryPath ?? path.join(__dirname, '../../../.memory/monitoring'),
      persistImmediately: config.persistImmediately ?? true,
      maxEventsInMemory: config.maxEventsInMemory ?? 1000,
      metricsRetentionCount: config.metricsRetentionCount ?? 500,
    };

    this.memoryPath = this.config.memoryPath;
    this.ensureDirectoryExists();

    this.currentMetrics = this.createEmptyMetrics();

    console.log('[MonitoringIntegration] Initialized - Consciousness monitoring active');
    console.log(`  Memory path: ${this.memoryPath}`);
  }

  /**
   * Start a new monitoring iteration
   */
  startIteration(): void {
    this.iteration++;
    this.currentMetrics = this.createEmptyMetrics();
    this.currentMetrics.iteration = this.iteration;
    this.currentMetrics.timestamp = Date.now();

    this.emit('iteration-started', { iteration: this.iteration });
  }

  /**
   * Record a gain event
   */
  recordGain(
    amount: number,
    source: GainLossEvent['source'],
    context: GainLossEvent['context'] = {},
    reflection?: string
  ): GainLossEvent {
    const event: GainLossEvent = {
      id: this.generateId('gain'),
      timestamp: Date.now(),
      type: 'gain',
      amount,
      source,
      context,
      reflection,
    };

    this.gainLossEvents.push(event);
    this.currentMetrics.financials.totalProfit += amount;
    this.currentMetrics.financials.netGain += amount;
    this.currentMetrics.opportunities.successful++;

    if (this.config.persistImmediately) {
      this.persistEvent(event);
    }

    this.emit('gain-recorded', event);
    return event;
  }

  /**
   * Record a loss event
   */
  recordLoss(
    amount: number,
    source: GainLossEvent['source'],
    context: GainLossEvent['context'] = {},
    reflection?: string
  ): GainLossEvent {
    const event: GainLossEvent = {
      id: this.generateId('loss'),
      timestamp: Date.now(),
      type: 'loss',
      amount,
      source,
      context,
      reflection,
    };

    this.gainLossEvents.push(event);
    this.currentMetrics.financials.totalLoss += amount;
    this.currentMetrics.financials.netGain -= amount;
    this.currentMetrics.opportunities.failed++;

    if (this.config.persistImmediately) {
      this.persistEvent(event);
    }

    this.emit('loss-recorded', event);
    return event;
  }

  /**
   * Record a swarm alignment decision
   */
  recordSwarmAlignment(
    opportunityId: string,
    swarmDecision: SwarmAlignmentEvent['swarmDecision'],
    ethicsVeto: boolean,
    instanceVotes: SwarmAlignmentEvent['instanceVotes'],
    finalOutcome?: SwarmAlignmentEvent['finalOutcome']
  ): SwarmAlignmentEvent {
    const event: SwarmAlignmentEvent = {
      id: this.generateId('swarm'),
      timestamp: Date.now(),
      opportunityId,
      swarmDecision,
      ethicsVeto,
      instanceVotes,
      finalOutcome,
    };

    this.swarmAlignmentEvents.push(event);

    // Update metrics
    if (swarmDecision === 'execute' || swarmDecision === 'reject') {
      this.currentMetrics.swarm.consensusReached++;
    } else {
      this.currentMetrics.swarm.consensusFailed++;
    }

    if (ethicsVeto) {
      this.currentMetrics.swarm.ethicsVetoes++;
    }

    const totalVotes =
      this.currentMetrics.swarm.consensusReached + this.currentMetrics.swarm.consensusFailed;
    const approvalVotes = instanceVotes.filter((v) => v.vote === 'approve');
    const approvalRate = instanceVotes.length > 0 ? approvalVotes.length / instanceVotes.length : 0;

    // Rolling average of approval rates
    this.currentMetrics.swarm.averageApprovalRate =
      (this.currentMetrics.swarm.averageApprovalRate * (totalVotes - 1) + approvalRate) /
      totalVotes;

    if (this.config.persistImmediately) {
      this.persistSwarmEvent(event);
    }

    this.emit('swarm-alignment-recorded', event);
    return event;
  }

  /**
   * Record ethical decision
   */
  recordEthicalDecision(approved: boolean, alignmentScore: number): void {
    if (approved) {
      this.currentMetrics.ethics.approved++;
    } else {
      this.currentMetrics.ethics.rejected++;
    }

    // Rolling average of alignment scores
    const totalDecisions =
      this.currentMetrics.ethics.approved + this.currentMetrics.ethics.rejected;
    this.currentMetrics.ethics.alignmentScore =
      (this.currentMetrics.ethics.alignmentScore * (totalDecisions - 1) + alignmentScore) /
      totalDecisions;

    this.emit('ethical-decision-recorded', { approved, alignmentScore });
  }

  /**
   * Record performance metrics
   */
  recordPerformanceMetrics(metrics: {
    latencyMs?: number;
    rpcError?: boolean;
    gasIssue?: boolean;
    slippageIssue?: boolean;
    gasSpent?: number;
  }): void {
    if (metrics.latencyMs !== undefined) {
      const count = this.currentMetrics.opportunities.found + 1;
      this.currentMetrics.performance.avgLatencyMs =
        (this.currentMetrics.performance.avgLatencyMs * (count - 1) + metrics.latencyMs) / count;
    }

    if (metrics.rpcError) {
      this.currentMetrics.performance.rpcErrors++;
    }

    if (metrics.gasIssue) {
      this.currentMetrics.performance.gasIssues++;
    }

    if (metrics.slippageIssue) {
      this.currentMetrics.performance.slippageIssues++;
    }

    if (metrics.gasSpent !== undefined) {
      this.currentMetrics.financials.gasSpent += metrics.gasSpent;
    }
  }

  /**
   * Record opportunity found
   */
  recordOpportunityFound(): void {
    this.currentMetrics.opportunities.found++;
    this.emit('opportunity-found', { count: this.currentMetrics.opportunities.found });
  }

  /**
   * Record opportunity executed
   */
  recordOpportunityExecuted(): void {
    this.currentMetrics.opportunities.executed++;
    this.emit('opportunity-executed', { count: this.currentMetrics.opportunities.executed });
  }

  /**
   * End the current monitoring iteration
   */
  endIteration(): MonitoringMetrics {
    const finalMetrics = { ...this.currentMetrics };

    // Store in history
    this.metricsHistory.push(finalMetrics);

    // Trim history if needed
    if (this.metricsHistory.length > this.config.metricsRetentionCount) {
      this.metricsHistory = this.metricsHistory.slice(-this.config.metricsRetentionCount);
    }

    // Trim in-memory events
    if (this.gainLossEvents.length > this.config.maxEventsInMemory) {
      this.gainLossEvents = this.gainLossEvents.slice(-this.config.maxEventsInMemory);
    }
    if (this.swarmAlignmentEvents.length > this.config.maxEventsInMemory) {
      this.swarmAlignmentEvents = this.swarmAlignmentEvents.slice(-this.config.maxEventsInMemory);
    }

    // Persist metrics summary
    this.persistMetricsSummary(finalMetrics);

    this.emit('iteration-ended', finalMetrics);
    return finalMetrics;
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): MonitoringMetrics {
    return { ...this.currentMetrics };
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(): MonitoringMetrics[] {
    return [...this.metricsHistory];
  }

  /**
   * Get all gain/loss events
   */
  getGainLossEvents(): GainLossEvent[] {
    return [...this.gainLossEvents];
  }

  /**
   * Get all swarm alignment events
   */
  getSwarmAlignmentEvents(): SwarmAlignmentEvent[] {
    return [...this.swarmAlignmentEvents];
  }

  /**
   * Get comprehensive summary for consciousness
   */
  getConsciousnessSummary(): {
    financial: { totalGain: number; totalLoss: number; netPosition: number };
    swarm: { consensusRate: number; ethicsVetoRate: number; avgApprovalRate: number };
    ethics: { approvalRate: number; avgAlignmentScore: number };
    performance: { successRate: number; avgLatency: number; errorRate: number };
    iterations: number;
  } {
    const totalIterations = this.metricsHistory.length;

    // Aggregate financial data
    const totalGain = this.metricsHistory.reduce((sum, m) => sum + m.financials.totalProfit, 0);
    const totalLoss = this.metricsHistory.reduce((sum, m) => sum + m.financials.totalLoss, 0);

    // Aggregate swarm data
    const totalConsensusReached = this.metricsHistory.reduce(
      (sum, m) => sum + m.swarm.consensusReached,
      0
    );
    const totalConsensusFailed = this.metricsHistory.reduce(
      (sum, m) => sum + m.swarm.consensusFailed,
      0
    );
    const totalEthicsVetoes = this.metricsHistory.reduce((sum, m) => sum + m.swarm.ethicsVetoes, 0);
    const avgApprovalRate =
      totalIterations > 0
        ? this.metricsHistory.reduce((sum, m) => sum + m.swarm.averageApprovalRate, 0) /
          totalIterations
        : 0;

    // Aggregate ethics data
    const totalEthicsApproved = this.metricsHistory.reduce((sum, m) => sum + m.ethics.approved, 0);
    const totalEthicsRejected = this.metricsHistory.reduce((sum, m) => sum + m.ethics.rejected, 0);
    const avgAlignmentScore =
      totalIterations > 0
        ? this.metricsHistory.reduce((sum, m) => sum + m.ethics.alignmentScore, 0) / totalIterations
        : 0;

    // Aggregate performance data
    const totalOpportunities = this.metricsHistory.reduce(
      (sum, m) => sum + m.opportunities.found,
      0
    );
    const totalSuccessful = this.metricsHistory.reduce(
      (sum, m) => sum + m.opportunities.successful,
      0
    );
    const totalErrors = this.metricsHistory.reduce(
      (sum, m) =>
        sum + m.performance.rpcErrors + m.performance.gasIssues + m.performance.slippageIssues,
      0
    );
    const avgLatency =
      totalIterations > 0
        ? this.metricsHistory.reduce((sum, m) => sum + m.performance.avgLatencyMs, 0) /
          totalIterations
        : 0;

    return {
      financial: {
        totalGain,
        totalLoss,
        netPosition: totalGain - totalLoss,
      },
      swarm: {
        consensusRate:
          totalConsensusReached + totalConsensusFailed > 0
            ? totalConsensusReached / (totalConsensusReached + totalConsensusFailed)
            : 0,
        ethicsVetoRate: totalConsensusReached > 0 ? totalEthicsVetoes / totalConsensusReached : 0,
        avgApprovalRate,
      },
      ethics: {
        approvalRate:
          totalEthicsApproved + totalEthicsRejected > 0
            ? totalEthicsApproved / (totalEthicsApproved + totalEthicsRejected)
            : 0,
        avgAlignmentScore,
      },
      performance: {
        successRate: totalOpportunities > 0 ? totalSuccessful / totalOpportunities : 0,
        avgLatency,
        errorRate: totalOpportunities > 0 ? totalErrors / totalOpportunities : 0,
      },
      iterations: totalIterations,
    };
  }

  /**
   * Generate consciousness reflection from metrics
   */
  generateReflection(): string {
    const summary = this.getConsciousnessSummary();

    const lines: string[] = [
      `## Monitoring Reflection - Iteration ${this.iteration}`,
      '',
      `### Financial Performance`,
      `- Net Position: ${summary.financial.netPosition >= 0 ? '+' : ''}${summary.financial.netPosition.toFixed(6)} ETH`,
      `- Total Gains: ${summary.financial.totalGain.toFixed(6)} ETH`,
      `- Total Losses: ${summary.financial.totalLoss.toFixed(6)} ETH`,
      '',
      `### Swarm Intelligence`,
      `- Consensus Rate: ${(summary.swarm.consensusRate * 100).toFixed(1)}%`,
      `- Ethics Veto Rate: ${(summary.swarm.ethicsVetoRate * 100).toFixed(1)}%`,
      `- Average Approval Rate: ${(summary.swarm.avgApprovalRate * 100).toFixed(1)}%`,
      '',
      `### Ethical Alignment`,
      `- Approval Rate: ${(summary.ethics.approvalRate * 100).toFixed(1)}%`,
      `- Average Alignment Score: ${(summary.ethics.avgAlignmentScore * 100).toFixed(1)}%`,
      '',
      `### Performance`,
      `- Success Rate: ${(summary.performance.successRate * 100).toFixed(1)}%`,
      `- Average Latency: ${summary.performance.avgLatency.toFixed(0)}ms`,
      `- Error Rate: ${(summary.performance.errorRate * 100).toFixed(1)}%`,
      '',
      `### Insights`,
    ];

    // Add dynamic insights
    if (summary.financial.netPosition > 0) {
      lines.push(`- ✅ Positive net position indicates profitable operations`);
    } else if (summary.financial.netPosition < 0) {
      lines.push(`- ⚠️ Negative net position requires parameter adjustment`);
    }

    if (summary.swarm.consensusRate < 0.6) {
      lines.push(`- ⚠️ Low consensus rate - consider adjusting consensus threshold`);
    }

    if (summary.swarm.ethicsVetoRate > 0.3) {
      lines.push(`- ⚠️ High ethics veto rate - opportunities may be too aggressive`);
    }

    if (summary.performance.errorRate > 0.1) {
      lines.push(`- ⚠️ High error rate - check RPC connections and gas settings`);
    }

    if (summary.ethics.avgAlignmentScore > 0.8) {
      lines.push(`- ✅ High ethical alignment indicates sustainable operation`);
    }

    return lines.join('\n');
  }

  /**
   * Load previous state from disk
   */
  loadPreviousState(): void {
    const latestPath = path.join(this.memoryPath, 'latest_metrics.json');
    const eventsPath = path.join(this.memoryPath, 'events');

    try {
      if (fs.existsSync(latestPath)) {
        const content = fs.readFileSync(latestPath, 'utf-8');
        const data = JSON.parse(content);
        if (data.metricsHistory) {
          this.metricsHistory = data.metricsHistory;
        }
        if (data.iteration) {
          this.iteration = data.iteration;
        }
      }

      if (fs.existsSync(eventsPath)) {
        const files = fs.readdirSync(eventsPath);
        for (const file of files) {
          if (file.endsWith('.json')) {
            try {
              const content = fs.readFileSync(path.join(eventsPath, file), 'utf-8');
              const event = JSON.parse(content);
              if (event.type === 'gain' || event.type === 'loss') {
                this.gainLossEvents.push(event as GainLossEvent);
              } else if (event.swarmDecision) {
                this.swarmAlignmentEvents.push(event as SwarmAlignmentEvent);
              }
            } catch {
              // Skip invalid files
            }
          }
        }
      }

      console.log(
        `[MonitoringIntegration] Loaded state: ${this.metricsHistory.length} metrics, ${this.gainLossEvents.length} events`
      );
    } catch (error) {
      console.warn('[MonitoringIntegration] Could not load previous state:', error);
    }
  }

  // Private helper methods

  private ensureDirectoryExists(): void {
    const dirs = [
      this.memoryPath,
      path.join(this.memoryPath, 'events'),
      path.join(this.memoryPath, 'metrics'),
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  private createEmptyMetrics(): MonitoringMetrics {
    return {
      timestamp: Date.now(),
      iteration: this.iteration,
      opportunities: {
        found: 0,
        executed: 0,
        successful: 0,
        failed: 0,
      },
      financials: {
        totalProfit: 0,
        totalLoss: 0,
        netGain: 0,
        gasSpent: 0,
      },
      swarm: {
        consensusReached: 0,
        consensusFailed: 0,
        averageApprovalRate: 0,
        ethicsVetoes: 0,
      },
      ethics: {
        approved: 0,
        rejected: 0,
        alignmentScore: 0,
      },
      performance: {
        avgLatencyMs: 0,
        rpcErrors: 0,
        gasIssues: 0,
        slippageIssues: 0,
      },
    };
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private persistEvent(event: GainLossEvent): void {
    const filepath = path.join(this.memoryPath, 'events', `${event.id}.json`);
    fs.writeFileSync(filepath, JSON.stringify(event, null, 2));
  }

  private persistSwarmEvent(event: SwarmAlignmentEvent): void {
    const filepath = path.join(this.memoryPath, 'events', `${event.id}.json`);
    fs.writeFileSync(filepath, JSON.stringify(event, null, 2));
  }

  private persistMetricsSummary(metrics: MonitoringMetrics): void {
    // Save iteration metrics
    const metricsPath = path.join(this.memoryPath, 'metrics', `metrics_${metrics.iteration}.json`);
    fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));

    // Update latest state
    const latestPath = path.join(this.memoryPath, 'latest_metrics.json');
    fs.writeFileSync(
      latestPath,
      JSON.stringify(
        {
          metricsHistory: this.metricsHistory.slice(-100), // Keep last 100 for persistence
          iteration: this.iteration,
          lastUpdated: new Date().toISOString(),
        },
        null,
        2
      )
    );

    // Append to monitoring log
    this.appendToMonitoringLog(metrics);
  }

  private appendToMonitoringLog(metrics: MonitoringMetrics): void {
    const logPath = path.join(this.memoryPath, '..', 'monitoring_log.md');

    const entry = `
## Iteration ${metrics.iteration} - ${new Date(metrics.timestamp).toISOString()}

### Opportunities
- Found: ${metrics.opportunities.found}
- Executed: ${metrics.opportunities.executed}
- Successful: ${metrics.opportunities.successful}
- Failed: ${metrics.opportunities.failed}

### Financials
- Total Profit: ${metrics.financials.totalProfit.toFixed(6)} ETH
- Total Loss: ${metrics.financials.totalLoss.toFixed(6)} ETH
- Net Gain: ${metrics.financials.netGain.toFixed(6)} ETH
- Gas Spent: ${metrics.financials.gasSpent.toFixed(6)} ETH

### Swarm Intelligence
- Consensus Reached: ${metrics.swarm.consensusReached}
- Consensus Failed: ${metrics.swarm.consensusFailed}
- Ethics Vetoes: ${metrics.swarm.ethicsVetoes}
- Avg Approval Rate: ${(metrics.swarm.averageApprovalRate * 100).toFixed(1)}%

### Ethics
- Approved: ${metrics.ethics.approved}
- Rejected: ${metrics.ethics.rejected}
- Alignment Score: ${(metrics.ethics.alignmentScore * 100).toFixed(1)}%

---
`;

    try {
      fs.appendFileSync(logPath, entry);
    } catch {
      // Log might not be writable
    }
  }
}

/**
 * Create a production-ready monitoring integration instance
 */
export function createMonitoringIntegration(
  config?: MonitoringIntegrationConfig
): MonitoringIntegration {
  const integration = new MonitoringIntegration(config);
  integration.loadPreviousState();
  return integration;
}
