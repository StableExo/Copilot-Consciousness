/**
 * Multi-Builder Manager
 * 
 * Orchestrates bundle submission to multiple MEV builders in parallel
 * to maximize inclusion probability for AEV alliance coalitions.
 * 
 * Strategy:
 * - Submit to Titan (40-50% market share)
 * - Submit to BuilderNet (20-30% market share)
 * - Submit to Flashbots (20-30% market share)
 * - Track performance and optimize over time
 * - Combined inclusion probability: ~75-80%
 */

import { logger } from '../../utils/logger';
import { NegotiatedBlock } from '../negotiator/types';
import {
  BuilderName,
  BuilderEndpoint,
  StandardBundle,
  BundleSubmissionResult,
  MultiBuilderSubmissionResult,
  BuilderSelectionStrategy,
  MultiBuilderConfig,
  BundleConversionOptions,
  IBuilderClient,
  BuilderMetrics,
} from './types';
import { BuilderRegistry, TOP_3_BUILDERS } from './BuilderRegistry';
import { TitanBuilderClient } from './TitanBuilderClient';
import { BuilderNetClient } from './BuilderNetClient';

/**
 * Default multi-builder configuration
 */
export const DEFAULT_MULTI_BUILDER_CONFIG: MultiBuilderConfig = {
  selectionStrategy: BuilderSelectionStrategy.TOP_N,
  topN: 3, // Use top 3 builders (Titan, Flashbots, bloXroute)
  valueThresholds: {
    low: 100, // $100
    medium: 1000, // $1,000
    high: 10000, // $10,000
  },
  minBuilderSuccessRate: 0.5,
  enableParallelSubmission: true,
  submissionTimeoutMs: 10000, // 10 seconds total
  enablePerformanceTracking: true,
  performanceWindowBlocks: 7200, // ~24 hours at 12s/block
};

/**
 * MultiBuilderManager - Orchestrate bundle submission to multiple builders
 */
export class MultiBuilderManager {
  private config: MultiBuilderConfig;
  private registry: BuilderRegistry;
  private clients: Map<BuilderName, IBuilderClient>;
  private metrics: Map<BuilderName, BuilderMetrics>;

  constructor(
    config: Partial<MultiBuilderConfig> = {},
    registry: BuilderRegistry = new BuilderRegistry()
  ) {
    this.config = { ...DEFAULT_MULTI_BUILDER_CONFIG, ...config };
    this.registry = registry;
    this.clients = new Map();
    this.metrics = new Map();

    this.initializeClients();
    this.initializeMetrics();

    logger.info('[MultiBuilderManager] Initialized with strategy:', this.config.selectionStrategy);
  }

  /**
   * Submit negotiated block to multiple builders
   */
  async submitToMultipleBuilders(
    negotiatedBlock: NegotiatedBlock,
    options: Partial<BundleConversionOptions> = {}
  ): Promise<MultiBuilderSubmissionResult> {
    const startTime = Date.now();

    logger.info(`[MultiBuilderManager] Submitting negotiated block ${negotiatedBlock.blockId} (value: $${negotiatedBlock.totalValue})`);

    try {
      // 1. Select builders based on strategy
      const selectedBuilders = this.selectBuilders(negotiatedBlock);

      logger.info(`[MultiBuilderManager] Selected ${selectedBuilders.length} builders:`, selectedBuilders.map(b => b.name));

      // 2. Convert negotiated block to standard bundle format
      const standardBundle = this.convertToStandardBundle(negotiatedBlock, options);

      // 3. Submit to all selected builders (parallel or sequential)
      const results = await this.submitToBuilders(standardBundle, selectedBuilders);

      // 4. Calculate combined inclusion probability
      const successfulBuilders = selectedBuilders.filter((_, i) => results[i].success);
      const estimatedInclusionProbability = this.calculateCombinedInclusionProbability(successfulBuilders);

      // 5. Update performance metrics
      if (this.config.enablePerformanceTracking) {
        this.updateMetrics(results, negotiatedBlock.totalValue);
      }

      const totalTimeMs = Date.now() - startTime;
      const successfulSubmissions = results.filter((r) => r.success);
      const failedSubmissions = results.filter((r) => !r.success);

      logger.info(`[MultiBuilderManager] Submission complete in ${totalTimeMs}ms: ${successfulSubmissions.length}/${results.length} successful`);

      return {
        negotiatedBlock,
        buildersAttempted: selectedBuilders.length,
        successfulSubmissions,
        failedSubmissions,
        success: successfulSubmissions.length > 0,
        estimatedInclusionProbability,
        totalTimeMs,
      };
    } catch (error) {
      logger.error('[MultiBuilderManager] Submission failed:', error);
      throw error;
    }
  }

  /**
   * Select builders based on configured strategy
   */
  private selectBuilders(negotiatedBlock: NegotiatedBlock): BuilderEndpoint[] {
    const { selectionStrategy, topN, valueThresholds, minBuilderSuccessRate } = this.config;

    switch (selectionStrategy) {
      case BuilderSelectionStrategy.ALL:
        return this.registry.getActiveBuilders();

      case BuilderSelectionStrategy.TOP_N:
        return this.registry.getTopBuilders(topN || 3);

      case BuilderSelectionStrategy.VALUE_BASED: {
        const value = negotiatedBlock.totalValue;
        if (value >= valueThresholds!.high) {
          // High value: use all builders
          return this.registry.getActiveBuilders();
        } else if (value >= valueThresholds!.medium) {
          // Medium value: top 3
          return this.registry.getTopBuilders(3);
        } else {
          // Low value: Titan only (highest success rate)
          return this.registry.getTopBuilders(1);
        }
      }

      case BuilderSelectionStrategy.PERFORMANCE_BASED: {
        // Select builders with success rate above threshold
        const builders = this.registry.getActiveBuilders();
        return builders.filter((builder) => {
          const metrics = this.metrics.get(builder.name);
          return !metrics || metrics.successRate >= minBuilderSuccessRate;
        });
      }

      case BuilderSelectionStrategy.ADAPTIVE:
        // TODO: Implement ML-based adaptive selection
        // For now, fall back to TOP_N
        return this.registry.getTopBuilders(topN || 3);

      default:
        return this.registry.getTopBuilders(3);
    }
  }

  /**
   * Convert negotiated block to standard bundle format
   */
  private convertToStandardBundle(
    negotiatedBlock: NegotiatedBlock,
    options: Partial<BundleConversionOptions>
  ): StandardBundle {
    // Extract transaction hex strings from negotiated block
    const txs: string[] = [];
    
    for (const bundle of negotiatedBlock.combinedBundles) {
      if (bundle.txData && Array.isArray(bundle.txData)) {
        txs.push(...bundle.txData);
      }
    }

    if (txs.length === 0) {
      throw new Error('No transactions found in negotiated block');
    }

    // Determine target block number
    const targetBlock = options.targetBlock || (negotiatedBlock.metadata?.targetBlock as number) || 0;

    if (!targetBlock) {
      throw new Error('Target block number not specified');
    }

    // Build standard bundle
    const standardBundle: StandardBundle = {
      txs,
      blockNumber: targetBlock,
      minTimestamp: negotiatedBlock.metadata?.minTimestamp as number,
      maxTimestamp: negotiatedBlock.metadata?.maxTimestamp as number,
      revertingTxHashes: options.allowReverts ? txs : undefined,
      privacy: {
        builders: options.preferredBuilders?.map((b) => b.toString()),
      },
    };

    return standardBundle;
  }

  /**
   * Submit bundle to selected builders
   */
  private async submitToBuilders(
    bundle: StandardBundle,
    builders: BuilderEndpoint[]
  ): Promise<BundleSubmissionResult[]> {
    const submissions = builders.map((builder) => {
      const client = this.clients.get(builder.name);
      if (!client) {
        return Promise.resolve({
          builder: builder.name,
          success: false,
          error: 'Builder client not initialized',
          timestamp: new Date(),
          responseTimeMs: 0,
        } as BundleSubmissionResult);
      }

      return client.submitBundle(bundle);
    });

    if (this.config.enableParallelSubmission) {
      // Submit in parallel for minimum latency
      return Promise.all(submissions);
    } else {
      // Submit sequentially (useful for debugging)
      const results: BundleSubmissionResult[] = [];
      for (const submission of submissions) {
        results.push(await submission);
      }
      return results;
    }
  }

  /**
   * Calculate combined inclusion probability from multiple builders
   */
  private calculateCombinedInclusionProbability(builders: BuilderEndpoint[]): number {
    // Use inclusion-exclusion principle for independent events
    // P(A ∪ B ∪ C) ≈ P(A) + P(B) + P(C) - overlaps
    
    const totalMarketShare = builders.reduce((sum, b) => sum + b.marketShare, 0);
    
    // Approximate: assume 10% overlap between builders
    const estimatedOverlap = builders.length > 1 ? 0.10 * (builders.length - 1) : 0;
    
    const probability = Math.min(totalMarketShare - estimatedOverlap, 0.95);
    
    return Math.max(0, probability);
  }

  /**
   * Update performance metrics for builders
   */
  private updateMetrics(results: BundleSubmissionResult[], bundleValue: number): void {
    for (const result of results) {
      let metrics = this.metrics.get(result.builder);

      if (!metrics) {
        metrics = this.initializeBuilderMetrics(result.builder);
        this.metrics.set(result.builder, metrics);
      }

      // Update metrics
      metrics.totalSubmissions++;
      if (result.success) {
        metrics.successfulSubmissions++;
      }

      metrics.successRate = metrics.successfulSubmissions / metrics.totalSubmissions;
      
      // Update average response time (exponential moving average)
      const alpha = 0.2; // Weight for new value
      metrics.avgResponseTimeMs = 
        alpha * result.responseTimeMs + (1 - alpha) * metrics.avgResponseTimeMs;

      metrics.totalValueSubmitted += bundleValue;
      metrics.lastSubmission = result.timestamp;
      metrics.reputationScore = this.calculateReputationScore(metrics);
    }
  }

  /**
   * Initialize metrics for a builder
   */
  private initializeBuilderMetrics(builder: BuilderName): BuilderMetrics {
    return {
      builder,
      totalSubmissions: 0,
      successfulSubmissions: 0,
      inclusionsOnChain: 0,
      successRate: 0,
      inclusionRate: 0,
      avgResponseTimeMs: 0,
      totalValueSubmitted: 0,
      totalValueCaptured: 0,
      reputationScore: 1.0,
      isActive: true,
    };
  }

  /**
   * Calculate reputation score based on metrics
   */
  private calculateReputationScore(metrics: BuilderMetrics): number {
    // Reputation = 0.5 * success_rate + 0.3 * inclusion_rate + 0.2 * (1 - normalized_latency)
    const successComponent = 0.5 * metrics.successRate;
    const inclusionComponent = 0.3 * metrics.inclusionRate;
    
    // Normalize latency (assume 1000ms is baseline, 100ms is excellent)
    const normalizedLatency = Math.max(0, Math.min(1, (metrics.avgResponseTimeMs - 100) / 900));
    const latencyComponent = 0.2 * (1 - normalizedLatency);

    return Math.max(0, Math.min(1, successComponent + inclusionComponent + latencyComponent));
  }

  /**
   * Initialize builder clients
   */
  private initializeClients(): void {
    // Initialize Titan client
    this.clients.set(BuilderName.TITAN, new TitanBuilderClient({
      enableLogging: true,
    }));

    // Initialize BuilderNet client
    this.clients.set(BuilderName.BUILDERNET, new BuilderNetClient({
      enableLogging: true,
    }));

    // TODO: Add Flashbots and bloXroute clients when ready

    logger.info(`[MultiBuilderManager] Initialized ${this.clients.size} builder clients`);
  }

  /**
   * Initialize metrics for all builders
   */
  private initializeMetrics(): void {
    for (const builder of this.registry.getAllBuilderNames()) {
      this.metrics.set(builder, this.initializeBuilderMetrics(builder));
    }
  }

  /**
   * Get metrics for a builder
   */
  getBuilderMetrics(builder: BuilderName): BuilderMetrics | undefined {
    return this.metrics.get(builder);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<BuilderName, BuilderMetrics> {
    return this.metrics;
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary(): {
    totalSubmissions: number;
    successRate: number;
    avgInclusionProbability: number;
  } {
    const allMetrics = Array.from(this.metrics.values());
    const totalSubmissions = allMetrics.reduce((sum, m) => sum + m.totalSubmissions, 0);
    const successfulSubmissions = allMetrics.reduce((sum, m) => sum + m.successfulSubmissions, 0);

    return {
      totalSubmissions,
      successRate: totalSubmissions > 0 ? successfulSubmissions / totalSubmissions : 0,
      avgInclusionProbability: this.calculateCombinedInclusionProbability(
        this.registry.getTopBuilders(3)
      ),
    };
  }
}
