/**
 * SwarmCoordinator - Parallel Warden Instance Voting System
 *
 * Implements a swarm intelligence pattern where 3-5 parallel Warden instances
 * vote on opportunities. This provides:
 * - Redundant decision validation
 * - Consensus-based execution
 * - Reduced single-point-of-failure risks
 * - Diverse reasoning perspectives
 *
 * Based on: https://en.wikipedia.org/wiki/Swarm_intelligence
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

/**
 * Opportunity for swarm evaluation
 */
export interface SwarmOpportunity {
  id: string;
  type: 'arbitrage' | 'liquidation' | 'sandwich' | 'backrun' | 'frontrun';
  data: Record<string, unknown>;
  expectedValue: number;
  risk: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  deadline: number;
}

/**
 * Vote from a Warden instance
 */
export interface WardenVote {
  instanceId: string;
  opportunityId: string;
  vote: 'approve' | 'reject' | 'abstain';
  confidence: number;
  reasoning: string;
  executionParams?: Record<string, unknown>;
  timestamp: number;
  processingTimeMs: number;
}

/**
 * Swarm consensus result
 */
export interface SwarmConsensus {
  opportunityId: string;
  decision: 'execute' | 'reject' | 'timeout' | 'no-consensus';
  votes: WardenVote[];
  approvalRate: number;
  averageConfidence: number;
  consensusReached: boolean;
  consensusThreshold: number;
  totalProcessingTimeMs: number;
  mergedExecutionParams?: Record<string, unknown>;
}

/**
 * Warden instance configuration
 */
export interface WardenInstanceConfig {
  id: string;
  weight: number;
  specialization?: 'risk' | 'opportunity' | 'ethics' | 'speed';
  evaluationTimeoutMs?: number;
}

/**
 * Swarm coordinator configuration
 */
export interface SwarmConfig {
  minInstances?: number;
  maxInstances?: number;
  consensusThreshold?: number;
  quorumThreshold?: number;
  votingTimeoutMs?: number;
  enableEthicsVeto?: boolean;
  maxParallelEvaluations?: number;
}

/**
 * Warden instance evaluator function
 */
export type WardenEvaluator = (
  opportunity: SwarmOpportunity,
  instanceConfig: WardenInstanceConfig
) => Promise<Omit<WardenVote, 'instanceId' | 'opportunityId' | 'timestamp'>>;

/**
 * Swarm Coordinator
 */
export class SwarmCoordinator extends EventEmitter {
  private instances: Map<string, WardenInstanceConfig> = new Map();
  private evaluators: Map<string, WardenEvaluator> = new Map();
  private pendingVotes: Map<string, WardenVote[]> = new Map();
  private consensusHistory: SwarmConsensus[] = [];
  private config: Required<SwarmConfig>;
  private running: boolean = false;

  constructor(config: SwarmConfig = {}) {
    super();

    this.config = {
      minInstances: config.minInstances ?? 3,
      maxInstances: config.maxInstances ?? 5,
      consensusThreshold: config.consensusThreshold ?? 0.7,
      quorumThreshold: config.quorumThreshold ?? 0.6,
      votingTimeoutMs: config.votingTimeoutMs ?? 5000,
      enableEthicsVeto: config.enableEthicsVeto ?? true,
      maxParallelEvaluations: config.maxParallelEvaluations ?? 10,
    };
  }

  /**
   * Register a Warden instance
   */
  registerInstance(config: WardenInstanceConfig, evaluator: WardenEvaluator): void {
    if (this.instances.size >= this.config.maxInstances) {
      throw new Error(`Maximum ${this.config.maxInstances} instances allowed`);
    }

    this.instances.set(config.id, config);
    this.evaluators.set(config.id, evaluator);

    console.log(
      `[SwarmCoordinator] Registered instance: ${config.id} (specialization: ${config.specialization || 'general'})`
    );
    this.emit('instance-registered', config);
  }

  /**
   * Unregister a Warden instance
   */
  unregisterInstance(instanceId: string): boolean {
    const removed = this.instances.delete(instanceId);
    this.evaluators.delete(instanceId);

    if (removed) {
      console.log(`[SwarmCoordinator] Unregistered instance: ${instanceId}`);
      this.emit('instance-unregistered', instanceId);
    }

    return removed;
  }

  /**
   * Get all registered instances
   */
  getInstances(): WardenInstanceConfig[] {
    return Array.from(this.instances.values());
  }

  /**
   * Check if swarm is ready (enough instances)
   */
  isReady(): boolean {
    return this.instances.size >= this.config.minInstances;
  }

  /**
   * Submit opportunity for swarm evaluation
   */
  async evaluateOpportunity(opportunity: SwarmOpportunity): Promise<SwarmConsensus> {
    if (!this.isReady()) {
      throw new Error(
        `Not enough instances. Need ${this.config.minInstances}, have ${this.instances.size}`
      );
    }

    const startTime = Date.now();
    this.pendingVotes.set(opportunity.id, []);

    console.log(
      `[SwarmCoordinator] Evaluating opportunity: ${opportunity.id} (${opportunity.type})`
    );
    this.emit('evaluation-started', opportunity);

    // Collect votes from all instances in parallel
    const votePromises: Promise<WardenVote | null>[] = [];

    for (const [instanceId, instanceConfig] of this.instances) {
      const evaluator = this.evaluators.get(instanceId);
      if (!evaluator) continue;

      const votePromise = this.collectVote(
        opportunity,
        instanceId,
        instanceConfig,
        evaluator
      ).catch((error) => {
        console.error(`[SwarmCoordinator] Instance ${instanceId} failed:`, error.message);
        return null;
      });

      votePromises.push(votePromise);
    }

    // Wait for all votes with timeout
    const timeoutPromise = new Promise<'timeout'>((resolve) =>
      setTimeout(() => resolve('timeout'), this.config.votingTimeoutMs)
    );

    await Promise.race([
      Promise.all(votePromises),
      timeoutPromise.then(() => {
        console.warn('[SwarmCoordinator] Voting timeout reached');
        return 'timeout' as const;
      }),
    ]);

    // Collect completed votes
    const votes = this.pendingVotes.get(opportunity.id) || [];
    this.pendingVotes.delete(opportunity.id);

    // Calculate consensus
    const consensus = this.calculateConsensus(opportunity.id, votes, Date.now() - startTime);

    // Store in history
    this.consensusHistory.push(consensus);
    if (this.consensusHistory.length > 1000) {
      this.consensusHistory = this.consensusHistory.slice(-1000);
    }

    console.log(
      `[SwarmCoordinator] Consensus: ${consensus.decision} (${(consensus.approvalRate * 100).toFixed(1)}% approval)`
    );
    this.emit('consensus-reached', consensus);

    return consensus;
  }

  /**
   * Collect vote from a single instance
   */
  private async collectVote(
    opportunity: SwarmOpportunity,
    instanceId: string,
    instanceConfig: WardenInstanceConfig,
    evaluator: WardenEvaluator
  ): Promise<WardenVote | null> {
    const startTime = Date.now();

    try {
      const result = await evaluator(opportunity, instanceConfig);

      const vote: WardenVote = {
        instanceId,
        opportunityId: opportunity.id,
        vote: result.vote,
        confidence: result.confidence,
        reasoning: result.reasoning,
        executionParams: result.executionParams,
        timestamp: Date.now(),
        processingTimeMs: Date.now() - startTime,
      };

      // Add to pending votes
      const votes = this.pendingVotes.get(opportunity.id);
      if (votes) {
        votes.push(vote);
      }

      this.emit('vote-received', vote);
      return vote;
    } catch (error) {
      console.error(`[SwarmCoordinator] Vote collection failed for ${instanceId}:`, error);
      return null;
    }
  }

  /**
   * Calculate consensus from votes
   */
  private calculateConsensus(
    opportunityId: string,
    votes: WardenVote[],
    totalProcessingTimeMs: number
  ): SwarmConsensus {
    // Check quorum
    const quorumSize = Math.ceil(this.instances.size * this.config.quorumThreshold);
    const hasQuorum = votes.length >= quorumSize;

    if (!hasQuorum) {
      return {
        opportunityId,
        decision: 'no-consensus',
        votes,
        approvalRate: 0,
        averageConfidence: 0,
        consensusReached: false,
        consensusThreshold: this.config.consensusThreshold,
        totalProcessingTimeMs,
      };
    }

    // Calculate weighted votes
    let totalWeight = 0;
    let approvalWeight = 0;
    let totalConfidence = 0;
    let rejectWeight = 0;

    for (const vote of votes) {
      const instance = this.instances.get(vote.instanceId);
      const weight = instance?.weight ?? 1;

      totalWeight += weight;
      if (vote.vote === 'approve') {
        approvalWeight += weight * vote.confidence;
      } else if (vote.vote === 'reject') {
        rejectWeight += weight * vote.confidence;
      }
      totalConfidence += vote.confidence;
    }

    const approvalRate = totalWeight > 0 ? approvalWeight / totalWeight : 0;
    const rejectRate = totalWeight > 0 ? rejectWeight / totalWeight : 0;
    const averageConfidence = votes.length > 0 ? totalConfidence / votes.length : 0;

    // Consensus is reached if either approval or rejection exceeds threshold
    const consensusReached =
      approvalRate >= this.config.consensusThreshold ||
      rejectRate >= this.config.consensusThreshold;

    // Check for ethics veto
    if (this.config.enableEthicsVeto) {
      const ethicsInstance = votes.find((v) => {
        const instance = this.instances.get(v.instanceId);
        return instance?.specialization === 'ethics';
      });

      if (ethicsInstance && ethicsInstance.vote === 'reject') {
        return {
          opportunityId,
          decision: 'reject',
          votes,
          approvalRate: 0,
          averageConfidence,
          consensusReached: true,
          consensusThreshold: this.config.consensusThreshold,
          totalProcessingTimeMs,
        };
      }
    }

    // Determine decision
    let decision: SwarmConsensus['decision'];
    if (!consensusReached) {
      decision = 'no-consensus';
    } else if (approvalRate >= this.config.consensusThreshold) {
      decision = 'execute';
    } else if (rejectRate >= this.config.consensusThreshold) {
      decision = 'reject';
    } else {
      decision = 'no-consensus';
    }

    // Merge execution params from approving votes
    let mergedExecutionParams: Record<string, unknown> | undefined;
    if (decision === 'execute') {
      const approvalVotes = votes.filter((v) => v.vote === 'approve' && v.executionParams);
      if (approvalVotes.length > 0) {
        // Use params from highest confidence vote
        approvalVotes.sort((a, b) => b.confidence - a.confidence);
        mergedExecutionParams = approvalVotes[0].executionParams;
      }
    }

    return {
      opportunityId,
      decision,
      votes,
      approvalRate,
      averageConfidence,
      consensusReached,
      consensusThreshold: this.config.consensusThreshold,
      totalProcessingTimeMs,
      mergedExecutionParams,
    };
  }

  /**
   * Get consensus history
   */
  getConsensusHistory(): SwarmConsensus[] {
    return [...this.consensusHistory];
  }

  /**
   * Get swarm statistics
   */
  getStats(): {
    instanceCount: number;
    totalEvaluations: number;
    consensusRate: number;
    averageApprovalRate: number;
    averageProcessingTimeMs: number;
  } {
    const totalEvaluations = this.consensusHistory.length;
    const consensusCount = this.consensusHistory.filter((c) => c.consensusReached).length;
    const avgApproval =
      totalEvaluations > 0
        ? this.consensusHistory.reduce((sum, c) => sum + c.approvalRate, 0) / totalEvaluations
        : 0;
    const avgProcessing =
      totalEvaluations > 0
        ? this.consensusHistory.reduce((sum, c) => sum + c.totalProcessingTimeMs, 0) /
          totalEvaluations
        : 0;

    return {
      instanceCount: this.instances.size,
      totalEvaluations,
      consensusRate: totalEvaluations > 0 ? consensusCount / totalEvaluations : 0,
      averageApprovalRate: avgApproval,
      averageProcessingTimeMs: avgProcessing,
    };
  }

  /**
   * Create default Warden evaluators for testing
   */
  static createDefaultEvaluators(): Map<string, WardenEvaluator> {
    const evaluators = new Map<string, WardenEvaluator>();

    // Risk-focused evaluator
    evaluators.set('risk', async (opportunity, _config) => {
      const riskThreshold = 0.3;
      const approve = opportunity.risk < riskThreshold;
      return {
        vote: approve ? 'approve' : 'reject',
        confidence: approve ? 1 - opportunity.risk : opportunity.risk,
        reasoning: `Risk assessment: ${(opportunity.risk * 100).toFixed(1)}% (threshold: ${(riskThreshold * 100).toFixed(1)}%)`,
        processingTimeMs: Math.random() * 100 + 50,
      };
    });

    // Opportunity-focused evaluator
    evaluators.set('opportunity', async (opportunity, _config) => {
      const minValue = 0.01; // 0.01 ETH minimum
      const approve = opportunity.expectedValue >= minValue;
      return {
        vote: approve ? 'approve' : 'reject',
        confidence: Math.min(1, opportunity.expectedValue / minValue),
        reasoning: `Expected value: ${opportunity.expectedValue} ETH (min: ${minValue} ETH)`,
        processingTimeMs: Math.random() * 100 + 50,
      };
    });

    // Ethics-focused evaluator
    evaluators.set('ethics', async (opportunity, _config) => {
      const unethicalTypes = ['sandwich', 'frontrun'];
      const ethical = !unethicalTypes.includes(opportunity.type);
      return {
        vote: ethical ? 'approve' : 'reject',
        confidence: 0.95,
        reasoning: ethical
          ? 'Opportunity passes ethics check'
          : `${opportunity.type} violates ethical guidelines`,
        processingTimeMs: Math.random() * 50 + 25,
      };
    });

    // Speed-focused evaluator
    evaluators.set('speed', async (opportunity, _config) => {
      const urgencyApproval = {
        critical: 0.95,
        high: 0.8,
        medium: 0.6,
        low: 0.4,
      };
      const baseApproval = urgencyApproval[opportunity.urgency];
      const approve = Math.random() < baseApproval;
      return {
        vote: approve ? 'approve' : 'abstain',
        confidence: baseApproval,
        reasoning: `Urgency-based assessment: ${opportunity.urgency}`,
        processingTimeMs: Math.random() * 30 + 10,
      };
    });

    // General balanced evaluator
    evaluators.set('general', async (opportunity, _config) => {
      const riskWeight = 0.4;
      const valueWeight = 0.4;
      const urgencyWeight = 0.2;

      const urgencyScore = {
        critical: 1,
        high: 0.75,
        medium: 0.5,
        low: 0.25,
      }[opportunity.urgency];

      const score =
        (1 - opportunity.risk) * riskWeight +
        Math.min(1, opportunity.expectedValue / 0.1) * valueWeight +
        urgencyScore * urgencyWeight;

      return {
        vote: score >= 0.5 ? 'approve' : 'reject',
        confidence: Math.abs(score - 0.5) * 2,
        reasoning: `Balanced assessment score: ${(score * 100).toFixed(1)}%`,
        processingTimeMs: Math.random() * 75 + 50,
      };
    });

    return evaluators;
  }
}

/**
 * Create a production-ready swarm with 5 instances
 */
export function createProductionSwarm(): SwarmCoordinator {
  const swarm = new SwarmCoordinator({
    minInstances: 3,
    maxInstances: 5,
    consensusThreshold: 0.7,
    quorumThreshold: 0.6,
    votingTimeoutMs: 5000,
    enableEthicsVeto: true,
  });

  const evaluators = SwarmCoordinator.createDefaultEvaluators();

  // Register 5 instances with different specializations
  swarm.registerInstance(
    { id: uuidv4(), weight: 1.2, specialization: 'risk' },
    evaluators.get('risk')!
  );

  swarm.registerInstance(
    { id: uuidv4(), weight: 1.0, specialization: 'opportunity' },
    evaluators.get('opportunity')!
  );

  swarm.registerInstance(
    { id: uuidv4(), weight: 1.5, specialization: 'ethics' },
    evaluators.get('ethics')!
  );

  swarm.registerInstance(
    { id: uuidv4(), weight: 0.8, specialization: 'speed' },
    evaluators.get('speed')!
  );

  swarm.registerInstance(
    { id: uuidv4(), weight: 1.0, specialization: undefined },
    evaluators.get('general')!
  );

  return swarm;
}
