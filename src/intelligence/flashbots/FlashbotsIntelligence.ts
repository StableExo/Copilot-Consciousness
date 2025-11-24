/**
 * Flashbots Intelligence Module
 * 
 * Advanced intelligence layer for Flashbots integration:
 * - Builder reputation tracking and selection
 * - MEV refund monitoring and optimization
 * - Bundle optimization strategies
 * - Historical performance analysis
 * 
 * Based on Flashbots documentation: https://docs.flashbots.net/
 */

import { ethers, formatEther } from 'ethers';
import { logger } from '../../utils/logger';
import {
  BuilderReputation,
  MEVRefund,
  FlashbotsBundle,
  BundleSimulationResult,
} from '../../execution/types/PrivateRPCTypes';

/**
 * Configuration for Flashbots intelligence
 */
export interface FlashbotsIntelligenceConfig {
  /** Minimum success rate for active builders (0-1) */
  minBuilderSuccessRate: number;
  
  /** Maximum blocks to track for reputation */
  reputationWindowBlocks: number;
  
  /** Enable MEV refund tracking */
  enableRefundTracking: boolean;
  
  /** Minimum MEV profit to track (wei) */
  minTrackableMEV: bigint;
}

/**
 * Bundle optimization recommendation
 */
export interface BundleOptimization {
  /** Whether optimization is recommended */
  shouldOptimize: boolean;
  
  /** Recommended changes */
  recommendations: string[];
  
  /** Expected profit improvement (wei) */
  expectedProfitImprovement?: bigint;
  
  /** Optimized builder selection */
  recommendedBuilders?: string[];
}

/**
 * FlashbotsIntelligence - Advanced analytics and optimization for Flashbots
 */
export class FlashbotsIntelligence {
  private config: FlashbotsIntelligenceConfig;
  private builderReputations: Map<string, BuilderReputation>;
  private mevRefunds: MEVRefund[];
  private provider: JsonRpcProvider;

  constructor(
    provider: JsonRpcProvider,
    config: Partial<FlashbotsIntelligenceConfig> = {}
  ) {
    this.provider = provider;
    this.config = {
      minBuilderSuccessRate: config.minBuilderSuccessRate || 0.7,
      reputationWindowBlocks: config.reputationWindowBlocks || 7200, // ~24 hours
      enableRefundTracking: config.enableRefundTracking ?? true,
      minTrackableMEV: config.minTrackableMEV || BigInt(0.01e18), // 0.01 ETH
    };
    
    this.builderReputations = new Map();
    this.mevRefunds = [];

    logger.info('[FlashbotsIntelligence] Initialized');
  }

  /**
   * Record bundle submission result for builder reputation
   */
  recordBundleResult(
    builder: string,
    success: boolean,
    inclusionBlocks: number
  ): void {
    let reputation = this.builderReputations.get(builder);

    if (!reputation) {
      reputation = {
        builder,
        successCount: 0,
        failureCount: 0,
        avgInclusionBlocks: 0,
        successRate: 0,
        lastUsed: new Date(),
        isActive: true,
      };
      this.builderReputations.set(builder, reputation);
    }

    // Update counts
    if (success) {
      reputation.successCount++;
      
      // Update average inclusion time
      const totalInclusions = reputation.successCount;
      reputation.avgInclusionBlocks = 
        (reputation.avgInclusionBlocks * (totalInclusions - 1) + inclusionBlocks) / 
        totalInclusions;
    } else {
      reputation.failureCount++;
    }

    // Recalculate success rate
    const totalAttempts = reputation.successCount + reputation.failureCount;
    reputation.successRate = reputation.successCount / totalAttempts;
    reputation.lastUsed = new Date();

    // Mark as inactive if success rate too low
    if (totalAttempts >= 10 && reputation.successRate < this.config.minBuilderSuccessRate) {
      reputation.isActive = false;
      logger.warn(
        `[FlashbotsIntelligence] Builder ${builder} marked inactive (success rate: ${reputation.successRate.toFixed(2)})`
      );
    }

    logger.info(
      `[FlashbotsIntelligence] Updated reputation for ${builder}: ` +
      `${reputation.successCount}/${totalAttempts} (${(reputation.successRate * 100).toFixed(1)}%)`
    );
  }

  /**
   * Get recommended builders based on reputation
   * Returns builders sorted by performance
   */
  getRecommendedBuilders(count: number = 3): string[] {
    const activeBuilders = Array.from(this.builderReputations.values())
      .filter(rep => rep.isActive && rep.successRate >= this.config.minBuilderSuccessRate)
      .sort((a, b) => {
        // Sort by success rate (primary) and avg inclusion time (secondary)
        if (Math.abs(a.successRate - b.successRate) > 0.1) {
          return b.successRate - a.successRate;
        }
        return a.avgInclusionBlocks - b.avgInclusionBlocks;
      });

    return activeBuilders.slice(0, count).map(rep => rep.builder);
  }

  /**
   * Get builder reputation
   */
  getBuilderReputation(builder: string): BuilderReputation | undefined {
    return this.builderReputations.get(builder);
  }

  /**
   * Get all builder reputations
   */
  getAllReputations(): BuilderReputation[] {
    return Array.from(this.builderReputations.values());
  }

  /**
   * Record MEV refund
   */
  recordMEVRefund(refund: MEVRefund): void {
    if (!this.config.enableRefundTracking) {
      return;
    }

    const mevExtracted = BigInt(refund.mevExtracted);
    if (mevExtracted < this.config.minTrackableMEV) {
      return;
    }

    this.mevRefunds.push(refund);

    // Keep only recent refunds (last 1000)
    if (this.mevRefunds.length > 1000) {
      this.mevRefunds = this.mevRefunds.slice(-1000);
    }

    logger.info(
      `[FlashbotsIntelligence] Recorded MEV refund: ${formatEther(refund.refundAmount)} ETH ` +
      `from ${formatEther(refund.mevExtracted)} ETH extracted`
    );
  }

  /**
   * Calculate total MEV refunds received
   */
  getTotalMEVRefunds(): { totalExtracted: bigint; totalRefunded: bigint; refundRate: number } {
    let totalExtracted = 0n;
    let totalRefunded = 0n;

    for (const refund of this.mevRefunds) {
      totalExtracted += BigInt(refund.mevExtracted);
      totalRefunded += BigInt(refund.refundAmount);
    }

    const refundRate = totalExtracted > 0n 
      ? Number(totalRefunded * 10000n / totalExtracted) / 10000 
      : 0;

    return {
      totalExtracted,
      totalRefunded,
      refundRate,
    };
  }

  /**
   * Get recent MEV refunds
   */
  getRecentRefunds(count: number = 10): MEVRefund[] {
    return this.mevRefunds.slice(-count);
  }

  /**
   * Analyze bundle simulation and provide optimization recommendations
   */
  analyzeBundleSimulation(simulation: BundleSimulationResult): BundleOptimization {
    const recommendations: string[] = [];
    let shouldOptimize = false;
    let expectedProfitImprovement: bigint | undefined;

    if (!simulation.success) {
      return {
        shouldOptimize: false,
        recommendations: ['Bundle simulation failed - cannot optimize'],
      };
    }

    // Check for reverting transactions
    const revertingTxs = simulation.results?.filter(tx => tx.revert) || [];
    if (revertingTxs.length > 0) {
      shouldOptimize = true;
      recommendations.push(
        `Remove ${revertingTxs.length} reverting transaction(s) to improve success rate`
      );
    }

    // Check coinbase profit
    if (simulation.coinbaseDiff) {
      const profit = BigInt(simulation.coinbaseDiff);
      const gasFees = simulation.gasFees ? BigInt(simulation.gasFees) : 0n;
      
      if (profit < gasFees * 2n) {
        shouldOptimize = true;
        recommendations.push(
          'Low profit margin - consider increasing MEV extraction or reducing gas usage'
        );
      }

      // Check if we're paying too much in gas
      if (gasFees > profit / 2n) {
        shouldOptimize = true;
        recommendations.push(
          'Gas fees exceed 50% of profit - optimize gas usage or increase bundle value'
        );
      }
    }

    // Recommend high-reputation builders
    const recommendedBuilders = this.getRecommendedBuilders(3);
    if (recommendedBuilders.length > 0) {
      recommendations.push(
        `Target high-reputation builders: ${recommendedBuilders.join(', ')}`
      );
    }

    return {
      shouldOptimize,
      recommendations,
      expectedProfitImprovement,
      recommendedBuilders,
    };
  }

  /**
   * Calculate optimal gas price for bundle
   * Based on historical inclusion data and current network conditions
   */
  async calculateOptimalGasPrice(
    targetInclusionBlocks: number = 1
  ): Promise<bigint> {
    try {
      // Get current base fee
      const block = await this.provider.getBlock('latest');
      const baseFee = block.baseFeePerGas ? BigInt(block.baseFeePerGas.toString()) : 0n;

      // Get current gas price as reference
      const gasPrice = await this.provider.getGasPrice();
      const gasPriceBigInt = BigInt(gasPrice.toString());

      // For immediate inclusion, use higher priority fee
      if (targetInclusionBlocks === 1) {
        const priorityFee = gasPriceBigInt > baseFee ? gasPriceBigInt - baseFee : 0n;
        return baseFee + (priorityFee * 120n / 100n); // +20% priority
      }

      // For later inclusion, can use lower priority
      return gasPriceBigInt;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[FlashbotsIntelligence] Failed to calculate optimal gas price:', errorMessage);
      // Fallback to current gas price
      const fallbackGasPrice = await this.provider.getGasPrice();
      return BigInt(fallbackGasPrice.toString());
    }
  }

  /**
   * Check if bundle is likely to be included based on historical data
   */
  estimateBundleInclusionProbability(
    bundle: FlashbotsBundle,
    simulation: BundleSimulationResult
  ): number {
    let probability = 0.5; // Base probability

    // Increase probability if simulation successful
    if (simulation.success) {
      probability += 0.2;
    }

    // Decrease if any tx reverts
    const hasRevert = simulation.results?.some(tx => tx.revert);
    if (hasRevert) {
      probability -= 0.3;
    }

    // Increase based on profitability
    if (simulation.coinbaseDiff) {
      const profit = BigInt(simulation.coinbaseDiff);
      if (profit > BigInt(0.1e18)) { // > 0.1 ETH
        probability += 0.2;
      } else if (profit > BigInt(0.01e18)) { // > 0.01 ETH
        probability += 0.1;
      }
    }

    // Check builder reputations
    const activeBuilders = Array.from(this.builderReputations.values())
      .filter(rep => rep.isActive);
    
    if (activeBuilders.length > 0) {
      const avgSuccessRate = 
        activeBuilders.reduce((sum, rep) => sum + rep.successRate, 0) / 
        activeBuilders.length;
      probability = probability * avgSuccessRate;
    }

    // Clamp between 0 and 1
    return Math.max(0, Math.min(1, probability));
  }

  /**
   * Generate statistics report
   */
  getStatistics(): {
    builders: {
      total: number;
      active: number;
      avgSuccessRate: number;
    };
    refunds: {
      total: number;
      totalExtracted: string;
      totalRefunded: string;
      refundRate: number;
    };
  } {
    const builders = Array.from(this.builderReputations.values());
    const activeBuilders = builders.filter(b => b.isActive);
    const avgSuccessRate = 
      activeBuilders.length > 0
        ? activeBuilders.reduce((sum, b) => sum + b.successRate, 0) / activeBuilders.length
        : 0;

    const refundStats = this.getTotalMEVRefunds();

    return {
      builders: {
        total: builders.length,
        active: activeBuilders.length,
        avgSuccessRate,
      },
      refunds: {
        total: this.mevRefunds.length,
        totalExtracted: formatEther(refundStats.totalExtracted),
        totalRefunded: formatEther(refundStats.totalRefunded),
        refundRate: refundStats.refundRate,
      },
    };
  }

  /**
   * Recommend optimal MEV-Share hints configuration
   * Balances privacy vs. MEV refund potential
   * 
   * @param privacyPriority - 0 (max refunds) to 1 (max privacy)
   * @returns Recommended hints configuration
   */
  recommendOptimalHints(privacyPriority: number = 0.5): {
    calldata?: boolean;
    contractAddress?: boolean;
    functionSelector?: boolean;
    logs?: boolean;
    hash?: boolean;
    default_logs?: boolean;
  } {
    // Clamp priority between 0 and 1
    const priority = Math.max(0, Math.min(1, privacyPriority));

    // Maximum refunds (low privacy)
    if (priority < 0.3) {
      logger.info('[FlashbotsIntelligence] Recommending maximum refund hints (low privacy)');
      return {
        calldata: true,
        contractAddress: true,
        functionSelector: true,
        logs: true,
        hash: true,
        default_logs: true,
      };
    }

    // Balanced approach (medium privacy)
    if (priority < 0.7) {
      logger.info('[FlashbotsIntelligence] Recommending balanced hints (medium privacy)');
      return {
        contractAddress: true,
        functionSelector: true,
        logs: true,
        hash: true,
        default_logs: true,
      };
    }

    // Maximum privacy (low refunds)
    logger.info('[FlashbotsIntelligence] Recommending maximum privacy hints');
    return {
      hash: true,
    };
  }

  /**
   * Recommend whether to use fast mode based on network conditions
   * 
   * @param urgency - How urgent the transaction is (0 = not urgent, 1 = very urgent)
   * @param currentGasPrice - Current network gas price
   * @returns Recommendation for fast mode with reasoning
   */
  async recommendFastMode(
    urgency: number = 0.5,
    currentGasPrice?: bigint
  ): Promise<{
    useFastMode: boolean;
    reasoning: string;
    estimatedInclusionBlocks: number;
  }> {
    const gasPrice = currentGasPrice || (await this.provider.getGasPrice());
    const gasPriceBigInt = BigInt(gasPrice.toString());
    
    // Get base fee from latest block
    const block = await this.provider.getBlock('latest');
    const baseFee = block.baseFeePerGas ? BigInt(block.baseFeePerGas.toString()) : 0n;
    
    // Calculate priority fee percentage
    const priorityFee = gasPriceBigInt > baseFee ? gasPriceBigInt - baseFee : 0n;
    const priorityPercent = baseFee > 0n 
      ? Number((priorityFee * 100n) / baseFee) 
      : 0;

    // High urgency = recommend fast mode
    if (urgency > 0.7) {
      return {
        useFastMode: true,
        reasoning: 'High urgency transaction - fast mode recommended for next block inclusion',
        estimatedInclusionBlocks: 1,
      };
    }

    // High network congestion (high priority fees) = recommend fast mode
    if (priorityPercent > 50) {
      return {
        useFastMode: true,
        reasoning: `High network congestion (${priorityPercent.toFixed(1)}% priority fee) - fast mode increases inclusion probability`,
        estimatedInclusionBlocks: 1,
      };
    }

    // Medium urgency or congestion
    if (urgency > 0.4 || priorityPercent > 20) {
      return {
        useFastMode: true,
        reasoning: 'Moderate urgency/congestion - fast mode recommended for reliable inclusion',
        estimatedInclusionBlocks: 1,
      };
    }

    // Low urgency and congestion - normal mode is fine
    return {
      useFastMode: false,
      reasoning: 'Low urgency and network congestion - normal mode sufficient',
      estimatedInclusionBlocks: 2,
    };
  }

  /**
   * Analyze MEV-Share configuration and recommend optimizations
   * 
   * @param currentHints - Current hints configuration
   * @param refundHistory - Recent refund data
   * @returns Optimization recommendations
   */
  analyzeMEVShareConfig(
    currentHints?: {
      calldata?: boolean;
      contractAddress?: boolean;
      functionSelector?: boolean;
      logs?: boolean;
      hash?: boolean;
      default_logs?: boolean;
    },
    refundHistory?: MEVRefund[]
  ): {
    shouldOptimize: boolean;
    recommendations: string[];
    suggestedHints?: {
      calldata?: boolean;
      contractAddress?: boolean;
      functionSelector?: boolean;
      logs?: boolean;
      hash?: boolean;
      default_logs?: boolean;
    };
  } {
    const recommendations: string[] = [];
    let shouldOptimize = false;

    // If no hints configured, recommend starting with balanced approach
    if (!currentHints || Object.keys(currentHints).length === 0) {
      shouldOptimize = true;
      recommendations.push('No hints configured - recommend balanced privacy/refund approach');
      return {
        shouldOptimize,
        recommendations,
        suggestedHints: this.recommendOptimalHints(0.5),
      };
    }

    // Check refund history if available
    const recentRefunds = refundHistory || this.getRecentRefunds(10);
    if (recentRefunds.length > 5) {
      const refundStats = this.getTotalMEVRefunds();
      
      // Low refund rate suggests more hints could be shared
      if (refundStats.refundRate < 0.3) {
        shouldOptimize = true;
        recommendations.push(
          `Low MEV refund rate (${(refundStats.refundRate * 100).toFixed(1)}%) - consider sharing more hints for better refunds`
        );
        
        // Suggest adding more hints
        const suggestedHints = { ...currentHints };
        if (!suggestedHints.default_logs) {
          suggestedHints.default_logs = true;
          recommendations.push('Add default_logs hint to share swap/transfer events');
        }
        if (!suggestedHints.logs) {
          suggestedHints.logs = true;
          recommendations.push('Add logs hint for better searcher visibility');
        }
        
        return { shouldOptimize, recommendations, suggestedHints };
      }
    }

    // Check if only hash is shared (maximum privacy)
    if (currentHints.hash && Object.keys(currentHints).length === 1) {
      recommendations.push(
        'Maximum privacy mode active - MEV refunds will be minimal. Consider adding default_logs for moderate refunds while maintaining good privacy'
      );
    }

    // Check if everything is shared
    const allShared = currentHints.calldata && currentHints.logs && 
                      currentHints.contractAddress && currentHints.functionSelector;
    if (allShared) {
      recommendations.push(
        'Maximum refund mode active - all transaction data is shared. This is optimal for refunds but provides minimal privacy'
      );
    }

    return {
      shouldOptimize,
      recommendations,
    };
  }

  /**
   * Calculate recommended refund percentage based on strategy
   * 
   * @param strategy - Refund strategy: 'maximize_profit', 'balanced', 'fair_share'
   * @returns Recommended refund percentage (0-100)
   */
  calculateRefundPercentage(
    strategy: 'maximize_profit' | 'balanced' | 'fair_share' = 'balanced'
  ): {
    percent: number;
    reasoning: string;
  } {
    const refundStats = this.getTotalMEVRefunds();
    
    switch (strategy) {
      case 'maximize_profit':
        // Default 90% to user is already optimal for profit
        // Only reduce if we're getting poor refund rates
        if (refundStats.refundRate < 0.7) {
          return {
            percent: 95,
            reasoning: 'Low historical refund rate - requesting higher percentage (95%) to maximize returns',
          };
        }
        return {
          percent: 90,
          reasoning: 'Default 90% refund is optimal for profit maximization with good historical rate',
        };
      
      case 'balanced':
        // Balance between user profit and validator incentives
        // Good refund rates = we can share more with validators
        if (refundStats.refundRate > 0.85) {
          return {
            percent: 80,
            reasoning: 'High refund rate allows sharing more with validators (80% user, 20% validator) for better inclusion',
          };
        } else if (refundStats.refundRate < 0.7) {
          return {
            percent: 90,
            reasoning: 'Low refund rate - maintaining standard 90% to maximize user returns',
          };
        }
        return {
          percent: 85,
          reasoning: 'Balanced 85% to user, 15% to validator for moderate refund optimization',
        };
      
      case 'fair_share':
        // More equitable split with validators to incentivize inclusion
        return {
          percent: 70,
          reasoning: 'Fair sharing (70% user, 30% validator) to maximize inclusion probability and support network',
        };
      
      default:
        return {
          percent: 90,
          reasoning: 'Default 90% to user as per Flashbots standard',
        };
    }
  }

  /**
   * Get recommended MEV-Share configuration for a transaction
   * 
   * @param privacyPriority - Privacy priority (0 = max refund, 1 = max privacy)
   * @param refundStrategy - Refund distribution strategy
   * @returns Complete MEV-Share configuration
   */
  getRecommendedMEVShareConfig(
    privacyPriority: number = 0.5,
    refundStrategy: 'maximize_profit' | 'balanced' | 'fair_share' = 'balanced'
  ): {
    hints: any;
    refundConfig: { percent: number };
    fastMode: boolean;
    shareTEE: boolean;
    reasoning: string[];
  } {
    const hints = this.recommendOptimalHints(privacyPriority);
    const refundConfig = this.calculateRefundPercentage(refundStrategy);
    const fastModeRec = { useFastMode: privacyPriority < 0.3 }; // Fast mode for low privacy priority
    
    const reasoning: string[] = [
      `Privacy priority: ${(privacyPriority * 100).toFixed(0)}%`,
      `Refund strategy: ${refundStrategy}`,
      `Recommended refund: ${refundConfig.percent}% to user`,
      refundConfig.reasoning,
      fastModeRec.useFastMode ? 'Fast mode enabled for maximum MEV capture' : 'Standard mode for balanced privacy',
    ];
    
    // TEE sharing recommended for medium-high privacy
    const shareTEE = privacyPriority > 0.4;
    if (shareTEE) {
      reasoning.push('TEE searcher sharing enabled for enhanced privacy with delayed disclosure');
    }

    return {
      hints,
      refundConfig: { percent: refundConfig.percent },
      fastMode: fastModeRec.useFastMode,
      shareTEE,
      reasoning,
    };
  }

  /**
   * Reset statistics (for testing or new deployment)
   */
  reset(): void {
    this.builderReputations.clear();
    this.mevRefunds = [];
    logger.info('[FlashbotsIntelligence] Statistics reset');
  }
}
