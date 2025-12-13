/**
 * Negotiator AI Agent
 * 
 * Implements cooperative game theory for MEV bundle coordination:
 * 
 * KEY CONCEPTS FROM COOPERATIVE GAME THEORY:
 * 1. Coalition Formation: Scouts form coalitions by combining bundles
 * 2. Superadditivity: Combined bundles create more value than separate
 * 3. Shapley Value: Fair allocation based on marginal contribution
 * 4. Core Stability: Allocations where no subcoalition wants to leave
 * 5. Transferable Utility: Profits can be redistributed among scouts
 * 
 * WARDEN'S ROLE: The "Diplomat" that negotiates optimal coalitions
 * and ensures fair value distribution (Robin Hood algorithm).
 */

import {
  ScoutAgent,
  ScoutBundle,
  RevealedBundle,
  Coalition,
  NegotiatedBlock,
  BundleConflict,
  ConflictType,
  ProfitDistribution,
  SearcherShare,
  NegotiatorConfig,
  NegotiationResult,
  AllocationMethod,
  CharacteristicFunction,
} from './types';
import { createHash } from 'crypto';

/**
 * Default negotiator configuration
 */
export const DEFAULT_NEGOTIATOR_CONFIG: NegotiatorConfig = {
  // Robin Hood settings: Take small fee, redistribute excess
  wardenFlatFeePercent: 5, // 5% flat fee
  redistributionPercent: 50, // 50% of excess goes back to searchers

  // Use Shapley values for fair allocation
  allocationMethod: AllocationMethod.SHAPLEY,
  enableShapleyCalculation: true,
  enableCoreStability: true,

  // Trust requirements
  minReputationScore: 0.5,
  maxBundlesPerBlock: 10,

  // Conflict rules
  allowTokenOverlap: false,
  allowPoolOverlap: false,
  maxConflictSeverity: 0.3,

  // Timing
  bundleExpirationSeconds: 30,
  blockBuildingTimeMs: 500,

  // Public transparency
  enablePublicBroadcast: true,
  transparencyLevel: 'full',
};

/**
 * Negotiator AI Agent
 */
export class NegotiatorAgent {
  private config: NegotiatorConfig;
  private scouts: Map<string, ScoutAgent>;
  private pendingBundles: Map<string, ScoutBundle>;
  private revealedBundles: Map<string, RevealedBundle>;

  constructor(config: Partial<NegotiatorConfig> = {}) {
    this.config = { ...DEFAULT_NEGOTIATOR_CONFIG, ...config };
    this.scouts = new Map();
    this.pendingBundles = new Map();
    this.revealedBundles = new Map();
  }

  /**
   * Register a new scout agent
   */
  registerScout(scout: ScoutAgent): void {
    this.scouts.set(scout.agentId, scout);
  }

  /**
   * Accept a blind bundle from a scout
   * Returns whether bundle was accepted
   */
  async acceptBundle(bundle: ScoutBundle): Promise<boolean> {
    const scout = this.scouts.get(bundle.scoutAgentId);
    
    if (!scout) {
      return false; // Unknown scout
    }

    if (scout.reputationScore < this.config.minReputationScore) {
      return false; // Insufficient reputation
    }

    if (new Date() > bundle.expiresAt) {
      return false; // Already expired
    }

    // Accept the bundle
    this.pendingBundles.set(bundle.bundleId, bundle);
    return true;
  }

  /**
   * Reveal bundle data after acceptance
   */
  async revealBundle(bundleId: string, txData: string[], signature: string): Promise<void> {
    const bundle = this.pendingBundles.get(bundleId);
    if (!bundle) {
      throw new Error(`Bundle ${bundleId} not found in pending bundles`);
    }

    // Verify blind hash matches
    const actualHash = this.createBlindHash(txData);
    if (actualHash !== bundle.blindHash) {
      throw new Error('Blind hash mismatch - bundle data does not match commitment');
    }

    const revealed: RevealedBundle = {
      ...bundle,
      txData,
      signature,
      revealed: true,
    };

    this.revealedBundles.set(bundleId, revealed);
    this.pendingBundles.delete(bundleId);
  }

  /**
   * Negotiate optimal bundle combination
   * This is the core AI reasoning function
   */
  async negotiate(): Promise<NegotiationResult> {
    const startTime = Date.now();
    const bundles = Array.from(this.revealedBundles.values());

    if (bundles.length === 0) {
      return {
        success: false,
        rejectedBundles: [],
        rejectionReasons: {},
        coalitionsConsidered: 0,
        executionTime: Date.now() - startTime,
      };
    }

    // Step 1: Detect conflicts between all bundle pairs
    const conflicts = this.detectAllConflicts(bundles);

    // Step 2: Find all valid coalitions (sets of non-conflicting bundles)
    const validCoalitions = this.findValidCoalitions(bundles, conflicts);

    // Step 3: Calculate characteristic function v(S) for each coalition
    const characteristicFunction = this.createCharacteristicFunction(bundles);

    // Step 4: Find optimal coalition (highest total value)
    const optimalCoalition = this.findOptimalCoalition(
      validCoalitions,
      characteristicFunction
    );

    if (!optimalCoalition) {
      return {
        success: false,
        rejectedBundles: bundles.map((b) => b.bundleId),
        rejectionReasons: {},
        coalitionsConsidered: validCoalitions.length,
        executionTime: Date.now() - startTime,
      };
    }

    // Step 5: Calculate fair allocation using cooperative game theory
    const profitDistribution = await this.calculateProfitDistribution(
      optimalCoalition,
      characteristicFunction
    );

    // Step 6: Create negotiated block
    const negotiatedBlock = this.createNegotiatedBlock(
      optimalCoalition,
      profitDistribution
    );

    // Step 7: Identify rejected bundles
    const acceptedBundleIds = new Set(optimalCoalition.bundles.map((b) => b.bundleId));
    const rejectedBundles = bundles
      .filter((b) => !acceptedBundleIds.has(b.bundleId))
      .map((b) => b.bundleId);

    return {
      success: true,
      negotiatedBlock,
      profitDistribution,
      rejectedBundles,
      rejectionReasons: {},
      coalitionsConsidered: validCoalitions.length,
      optimalCoalition,
      executionTime: Date.now() - startTime,
    };
  }

  /**
   * Detect conflicts between all bundle pairs
   */
  private detectAllConflicts(bundles: RevealedBundle[]): BundleConflict[] {
    const conflicts: BundleConflict[] = [];

    for (let i = 0; i < bundles.length; i++) {
      for (let j = i + 1; j < bundles.length; j++) {
        const conflict = this.detectConflict(bundles[i], bundles[j]);
        if (conflict.conflictType !== ConflictType.NONE) {
          conflicts.push(conflict);
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect conflict between two bundles
   */
  private detectConflict(
    bundle1: RevealedBundle,
    bundle2: RevealedBundle
  ): BundleConflict {
    // Check for transaction hash overlap (same txs)
    const tx1Set = new Set(bundle1.transactions);
    const tx2Set = new Set(bundle2.transactions);
    const hasOverlap = Array.from(tx1Set).some((tx) => tx2Set.has(tx));

    if (hasOverlap) {
      return {
        bundle1Id: bundle1.bundleId,
        bundle2Id: bundle2.bundleId,
        conflictType: ConflictType.STATE_DEPENDENCY,
        severity: 1.0,
        reason: 'Bundles share transaction hashes',
      };
    }

    // Check if arbitrage opportunities exist and overlap
    if (bundle1.arbitrageOpportunity && bundle2.arbitrageOpportunity) {
      const arb1 = bundle1.arbitrageOpportunity;
      const arb2 = bundle2.arbitrageOpportunity;

      // Token overlap
      const tokens1 = new Set(arb1.tokenAddresses);
      const tokens2 = new Set(arb2.tokenAddresses);
      const tokenOverlap = Array.from(tokens1).filter((t) => tokens2.has(t));

      if (tokenOverlap.length > 0 && !this.config.allowTokenOverlap) {
        return {
          bundle1Id: bundle1.bundleId,
          bundle2Id: bundle2.bundleId,
          conflictType: ConflictType.TOKEN_OVERLAP,
          severity: tokenOverlap.length / Math.min(tokens1.size, tokens2.size),
          reason: `Tokens overlap: ${tokenOverlap.join(', ')}`,
        };
      }

      // Pool overlap
      const pools1 = new Set(arb1.poolAddresses);
      const pools2 = new Set(arb2.poolAddresses);
      const poolOverlap = Array.from(pools1).filter((p) => pools2.has(p));

      if (poolOverlap.length > 0 && !this.config.allowPoolOverlap) {
        return {
          bundle1Id: bundle1.bundleId,
          bundle2Id: bundle2.bundleId,
          conflictType: ConflictType.POOL_OVERLAP,
          severity: poolOverlap.length / Math.min(pools1.size, pools2.size),
          reason: `Pools overlap: ${poolOverlap.join(', ')}`,
        };
      }
    }

    return {
      bundle1Id: bundle1.bundleId,
      bundle2Id: bundle2.bundleId,
      conflictType: ConflictType.NONE,
      severity: 0,
      reason: 'No conflicts detected',
    };
  }

  /**
   * Find all valid coalitions (sets of non-conflicting bundles)
   * This implements the coalition formation problem
   */
  private findValidCoalitions(
    bundles: RevealedBundle[],
    conflicts: BundleConflict[]
  ): Coalition[] {
    const validCoalitions: Coalition[] = [];

    // Build conflict map for quick lookup
    const conflictMap = new Map<string, Set<string>>();
    for (const conflict of conflicts) {
      if (conflict.severity > this.config.maxConflictSeverity) {
        if (!conflictMap.has(conflict.bundle1Id)) {
          conflictMap.set(conflict.bundle1Id, new Set());
        }
        if (!conflictMap.has(conflict.bundle2Id)) {
          conflictMap.set(conflict.bundle2Id, new Set());
        }
        conflictMap.get(conflict.bundle1Id)!.add(conflict.bundle2Id);
        conflictMap.get(conflict.bundle2Id)!.add(conflict.bundle1Id);
      }
    }

    // Generate all possible subsets (power set)
    // For n bundles, there are 2^n possible coalitions
    const n = bundles.length;
    const maxCoalitions = Math.pow(2, n);

    for (let i = 1; i < maxCoalitions; i++) {
      const coalitionBundles: RevealedBundle[] = [];
      const coalitionAgents = new Set<string>();

      // Build coalition from binary representation
      for (let j = 0; j < n; j++) {
        if (i & (1 << j)) {
          coalitionBundles.push(bundles[j]);
          coalitionAgents.add(bundles[j].scoutAgentId);
        }
      }

      // Check if coalition is valid (no conflicts)
      let isValid = true;
      for (let a = 0; a < coalitionBundles.length && isValid; a++) {
        for (let b = a + 1; b < coalitionBundles.length && isValid; b++) {
          const bundle1Id = coalitionBundles[a].bundleId;
          const bundle2Id = coalitionBundles[b].bundleId;
          if (
            conflictMap.has(bundle1Id) &&
            conflictMap.get(bundle1Id)!.has(bundle2Id)
          ) {
            isValid = false;
          }
        }
      }

      if (isValid && coalitionBundles.length <= this.config.maxBundlesPerBlock) {
        const coalitionValue = coalitionBundles.reduce(
          (sum, b) => sum + b.promisedValue,
          0
        );

        validCoalitions.push({
          coalitionId: `coalition-${i}`,
          memberAgentIds: Array.from(coalitionAgents),
          bundles: coalitionBundles,
          coalitionValue,
          marginalContributions: {},
          formationTime: new Date(),
          isStable: true, // Will verify later
        });
      }
    }

    return validCoalitions;
  }

  /**
   * Create characteristic function v(S)
   * Returns the value a coalition S can achieve
   */
  private createCharacteristicFunction(
    bundles: RevealedBundle[]
  ): CharacteristicFunction {
    const bundleMap = new Map(bundles.map((b) => [b.scoutAgentId, b]));

    return (coalition: string[]): number => {
      let totalValue = 0;
      for (const agentId of coalition) {
        const bundle = bundleMap.get(agentId);
        if (bundle) {
          totalValue += bundle.promisedValue;
        }
      }
      return totalValue;
    };
  }

  /**
   * Find optimal coalition (highest total value)
   */
  private findOptimalCoalition(
    coalitions: Coalition[],
    characteristicFunction: CharacteristicFunction
  ): Coalition | null {
    if (coalitions.length === 0) {
      return null;
    }

    let bestCoalition = coalitions[0];
    let bestValue = characteristicFunction(bestCoalition.memberAgentIds);

    for (const coalition of coalitions) {
      const value = characteristicFunction(coalition.memberAgentIds);
      if (value > bestValue) {
        bestValue = value;
        bestCoalition = coalition;
      }
    }

    return bestCoalition;
  }

  /**
   * Calculate profit distribution using cooperative game theory
   * Implements Shapley value for fair allocation
   */
  private async calculateProfitDistribution(
    coalition: Coalition,
    characteristicFunction: CharacteristicFunction
  ): Promise<ProfitDistribution> {
    const totalProfit = coalition.coalitionValue;
    
    // Step 1: Warden takes flat fee
    const wardenFlatFee = totalProfit * (this.config.wardenFlatFeePercent / 100);
    const remainingProfit = totalProfit - wardenFlatFee;

    // Step 2: Calculate fair shares using Shapley values
    const shapleyValues = this.calculateShapleyValues(
      coalition.memberAgentIds,
      characteristicFunction
    );

    // Step 3: Calculate base shares (proportional to Shapley value)
    const totalShapley = Object.values(shapleyValues).reduce((a, b) => a + b, 0);
    const searcherShares: SearcherShare[] = [];

    for (const agentId of coalition.memberAgentIds) {
      const shapleyValue = shapleyValues[agentId] || 0;
      const bundle = coalition.bundles.find((b) => b.scoutAgentId === agentId);
      
      if (bundle) {
        const baseShare = (shapleyValue / totalShapley) * remainingProfit;
        
        searcherShares.push({
          scoutAgentId: agentId,
          contributedValue: bundle.promisedValue,
          marginalContribution: shapleyValue,
          shapleyValue,
          baseShare,
          bonusShare: 0, // Will calculate redistribution next
          totalShare: baseShare,
          payoutAddress: '', // Would come from scout registration
        });
      }
    }

    // Step 4: Robin Hood redistribution
    // Take a portion of the excess and redistribute to smaller contributors
    const redistributionAmount = remainingProfit * (this.config.redistributionPercent / 100);
    const avgShare = remainingProfit / searcherShares.length;

    for (const share of searcherShares) {
      if (share.baseShare < avgShare) {
        // Smaller contributors get bonus
        const bonusShare = (avgShare - share.baseShare) * 0.5; // 50% of gap
        share.bonusShare = bonusShare;
        share.totalShare = share.baseShare + bonusShare;
      }
    }

    return {
      totalProfit,
      wardenFlatFee,
      searcherShares,
      redistributionAmount,
      redistributionPercent: this.config.redistributionPercent,
      allocationMethod: this.config.allocationMethod,
      shapleyValues,
      timestamp: new Date(),
    };
  }

  /**
   * Calculate Shapley values for fair profit allocation
   * 
   * The Shapley value represents each agent's average marginal contribution
   * across all possible orderings of the coalition.
   * 
   * Formula: φᵢ(v) = Σ [|S|!(n-|S|-1)! / n!] * [v(S ∪ {i}) - v(S)]
   */
  private calculateShapleyValues(
    agents: string[],
    characteristicFunction: CharacteristicFunction
  ): Record<string, number> {
    const n = agents.length;
    const shapleyValues: Record<string, number> = {};

    // Initialize Shapley values
    for (const agent of agents) {
      shapleyValues[agent] = 0;
    }

    // Generate all permutations (orderings) of agents
    const permutations = this.generatePermutations(agents);

    for (const permutation of permutations) {
      let coalition: string[] = [];

      for (const agent of permutation) {
        // Calculate marginal contribution
        const valueWithAgent = characteristicFunction([...coalition, agent]);
        const valueWithoutAgent = characteristicFunction(coalition);
        const marginalContribution = valueWithAgent - valueWithoutAgent;

        shapleyValues[agent] += marginalContribution;
        coalition.push(agent);
      }
    }

    // Average over all permutations
    const permutationCount = permutations.length;
    for (const agent of agents) {
      shapleyValues[agent] /= permutationCount;
    }

    return shapleyValues;
  }

  /**
   * Generate all permutations of an array
   */
  private generatePermutations<T>(arr: T[]): T[][] {
    if (arr.length === 0) return [[]];
    if (arr.length === 1) return [arr];

    const result: T[][] = [];

    for (let i = 0; i < arr.length; i++) {
      const current = arr[i];
      const remaining = [...arr.slice(0, i), ...arr.slice(i + 1)];
      const remainingPermutations = this.generatePermutations(remaining);

      for (const perm of remainingPermutations) {
        result.push([current, ...perm]);
      }
    }

    return result;
  }

  /**
   * Create negotiated block from coalition and profit distribution
   */
  private createNegotiatedBlock(
    coalition: Coalition,
    profitDistribution: ProfitDistribution
  ): NegotiatedBlock {
    const shapleyValues: Record<string, number> = {};
    for (const share of profitDistribution.searcherShares) {
      if (share.shapleyValue !== undefined) {
        shapleyValues[share.scoutAgentId] = share.shapleyValue;
      }
    }

    return {
      blockId: `block-${Date.now()}`,
      coalition,
      combinedBundles: coalition.bundles,
      totalValue: coalition.coalitionValue,
      totalGas: coalition.bundles.reduce((sum, b) => sum + b.gasEstimate, 0),
      conflicts: [],
      isValid: true,
      createdAt: new Date(),
      shapleyValues,
    };
  }

  /**
   * Create blind hash for bundle privacy
   */
  private createBlindHash(txData: string[]): string {
    const hash = createHash('sha256');
    for (const tx of txData) {
      hash.update(tx);
    }
    return hash.digest('hex');
  }

  /**
   * Clear expired bundles
   */
  clearExpiredBundles(): void {
    const now = new Date();
    const expiredIds: string[] = [];

    for (const [id, bundle] of this.pendingBundles) {
      if (now > bundle.expiresAt) {
        expiredIds.push(id);
      }
    }

    for (const id of expiredIds) {
      this.pendingBundles.delete(id);
    }
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      scoutsRegistered: this.scouts.size,
      pendingBundles: this.pendingBundles.size,
      revealedBundles: this.revealedBundles.size,
      config: this.config,
    };
  }
}
