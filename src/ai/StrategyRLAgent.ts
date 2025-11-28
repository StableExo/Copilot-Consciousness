/**
 * StrategyRLAgent - Reinforcement Learning Agent for Strategy Optimization
 *
 * Phase 3: Advanced AI Integration
 *
 * This agent uses reinforcement learning principles to optimize arbitrage strategy
 * parameters based on execution outcomes. It learns from experience to improve
 * decision-making in the MEV-competitive environment.
 *
 * Core capabilities:
 * - Records execution episodes (state, action, reward, outcome)
 * - Learns optimal strategy parameters through Q-learning inspired approach
 * - Suggests parameter updates based on accumulated experience
 * - Adapts to changing market conditions
 *
 * Integration with TheWarden/AEV:
 * - Connects to ArbitrageConsciousness for execution history
 * - Feeds back into AdvancedOrchestrator for strategy tuning
 * - Uses MEVSensorHub data for state representation
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { ExecutionEpisode, ExecutionState, StrategyParameters, UpdatedParameters } from './types';

interface RLAgentConfig {
  learningRate: number;
  discountFactor: number;
  explorationRate: number;
  explorationDecay: number;
  minExplorationRate: number;
  replayBufferSize: number;
  batchSize: number;
  updateFrequency: number;
}

interface StateActionValue {
  state: string; // Discretized state representation
  action: string; // Parameter configuration hash
  qValue: number;
  visits: number;
  lastUpdated: number;
}

/**
 * Reinforcement Learning Agent for Strategy Optimization
 */
export class StrategyRLAgent extends EventEmitter {
  private config: RLAgentConfig;
  private episodeBuffer: ExecutionEpisode[] = [];
  private qTable: Map<string, Map<string, StateActionValue>> = new Map();
  private parameterBounds: Map<keyof StrategyParameters, [number, number]> = new Map();
  private episodeCount: number = 0;
  private totalReward: number = 0;
  private currentExplorationRate: number;

  constructor(config?: Partial<RLAgentConfig>) {
    super();

    this.config = {
      learningRate: config?.learningRate ?? 0.1,
      discountFactor: config?.discountFactor ?? 0.95,
      explorationRate: config?.explorationRate ?? 0.3,
      explorationDecay: config?.explorationDecay ?? 0.995,
      minExplorationRate: config?.minExplorationRate ?? 0.05,
      replayBufferSize: config?.replayBufferSize ?? 10000,
      batchSize: config?.batchSize ?? 32,
      updateFrequency: config?.updateFrequency ?? 10,
    };

    this.currentExplorationRate = this.config.explorationRate;

    // Initialize parameter bounds for safe exploration
    this.initializeParameterBounds();

    logger.info(`[StrategyRLAgent] Initialized with learning rate: ${this.config.learningRate}`);
  }

  /**
   * Initialize safe bounds for parameter exploration
   */
  private initializeParameterBounds(): void {
    this.parameterBounds.set('minProfitThreshold', [0.001, 1.0]); // ETH
    this.parameterBounds.set('mevRiskSensitivity', [0.1, 0.9]);
    this.parameterBounds.set('maxSlippage', [0.001, 0.05]); // 0.1% to 5%
    this.parameterBounds.set('gasMultiplier', [1.0, 2.0]);
    this.parameterBounds.set('executionTimeout', [5000, 30000]); // ms
  }

  /**
   * Record an execution episode for learning
   *
   * This is the primary integration point - called after each arbitrage execution
   *
   * @param episode Execution episode containing state, action, outcome
   */
  async recordEpisode(episode: ExecutionEpisode): Promise<void> {
    // Add to replay buffer
    this.episodeBuffer.push(episode);
    if (this.episodeBuffer.length > this.config.replayBufferSize) {
      this.episodeBuffer.shift();
    }

    // Update statistics
    this.episodeCount++;
    this.totalReward += episode.reward;

    // Perform learning update
    await this.updateQValues(episode);

    // Decay exploration rate
    this.currentExplorationRate = Math.max(
      this.config.minExplorationRate,
      this.currentExplorationRate * this.config.explorationDecay
    );

    // Emit learning event
    this.emit('episodeRecorded', {
      episodeId: episode.episodeId,
      reward: episode.reward,
      qTableSize: this.qTable.size,
      explorationRate: this.currentExplorationRate,
    });

    // Periodic batch update
    if (this.episodeCount % this.config.updateFrequency === 0) {
      await this.batchUpdate();
    }
  }

  /**
   * Update Q-values based on episode outcome
   */
  private async updateQValues(episode: ExecutionEpisode): Promise<void> {
    const stateKey = this.discretizeState(episode.state);
    const actionKey = this.hashAction(episode.action.strategyParams);

    // Initialize state in Q-table if needed
    if (!this.qTable.has(stateKey)) {
      this.qTable.set(stateKey, new Map());
    }

    const stateActions = this.qTable.get(stateKey)!;

    // Get or initialize Q-value
    const currentQ = stateActions.get(actionKey) ?? {
      state: stateKey,
      action: actionKey,
      qValue: 0,
      visits: 0,
      lastUpdated: Date.now(),
    };

    // Q-learning update: Q(s,a) = Q(s,a) + α[r + γ*max(Q(s',a')) - Q(s,a)]
    const reward = episode.reward;
    const maxFutureQ = this.getMaxQValue(stateKey);
    const tdTarget = reward + this.config.discountFactor * maxFutureQ;
    const tdError = tdTarget - currentQ.qValue;

    currentQ.qValue += this.config.learningRate * tdError;
    currentQ.visits++;
    currentQ.lastUpdated = Date.now();

    stateActions.set(actionKey, currentQ);
  }

  /**
   * Get maximum Q-value for a state (for future reward estimation)
   */
  private getMaxQValue(stateKey: string): number {
    const stateActions = this.qTable.get(stateKey);
    if (!stateActions || stateActions.size === 0) {
      return 0;
    }

    let maxQ = -Infinity;
    for (const sa of stateActions.values()) {
      maxQ = Math.max(maxQ, sa.qValue);
    }

    return maxQ;
  }

  /**
   * Perform batch update on replay buffer
   */
  private async batchUpdate(): Promise<void> {
    if (this.episodeBuffer.length < this.config.batchSize) {
      return;
    }

    // Sample random batch
    const batch = this.sampleBatch(this.config.batchSize);

    // Update each episode in batch
    for (const episode of batch) {
      await this.updateQValues(episode);
    }

    this.emit('batchUpdate', {
      batchSize: batch.length,
      qTableSize: this.qTable.size,
      avgReward: this.totalReward / this.episodeCount,
    });
  }

  /**
   * Sample random batch from replay buffer
   */
  private sampleBatch(size: number): ExecutionEpisode[] {
    const batch: ExecutionEpisode[] = [];
    const bufferSize = this.episodeBuffer.length;

    for (let i = 0; i < size; i++) {
      const idx = Math.floor(Math.random() * bufferSize);
      batch.push(this.episodeBuffer[idx]);
    }

    return batch;
  }

  /**
   * Suggest updated strategy parameters based on learned Q-values
   *
   * This is called by AdvancedOrchestrator to get optimized parameters
   *
   * @param currentParams Current strategy parameters
   * @returns Updated parameters with confidence and rationale
   */
  async suggestParameters(currentParams: StrategyParameters): Promise<UpdatedParameters> {
    // Get current state (would be provided by MEVSensorHub in real integration)
    const currentState = this.getCurrentState();
    const stateKey = this.discretizeState(currentState);

    // Get best action for current state
    const bestAction = this.selectBestAction(stateKey, currentParams);

    // Calculate confidence based on Q-value stability and visit count
    const confidence = this.calculateConfidence(stateKey, bestAction);

    // Estimate expected improvement
    const expectedImprovement = this.estimateImprovement(stateKey, bestAction, currentParams);

    // Generate rationale
    const rationale = this.generateRationale(currentParams, bestAction, confidence);

    return {
      params: bestAction,
      confidence,
      expectedImprovement,
      rationale,
    };
  }

  /**
   * Select best action using ε-greedy policy
   */
  private selectBestAction(
    stateKey: string,
    currentParams: StrategyParameters
  ): StrategyParameters {
    const stateActions = this.qTable.get(stateKey);

    // Exploration: random action
    if (Math.random() < this.currentExplorationRate || !stateActions || stateActions.size === 0) {
      return this.exploreParameters(currentParams);
    }

    // Exploitation: best known action
    let _bestActionKey = '';
    let bestQValue = -Infinity;

    for (const [actionKey, sa] of stateActions.entries()) {
      if (sa.qValue > bestQValue) {
        bestQValue = sa.qValue;
        _bestActionKey = actionKey;
      }
    }

    // Reconstruct parameters from action key (in real impl, would store full params)
    // For now, apply small optimizations to current params
    return this.optimizeParameters(currentParams, bestQValue);
  }

  /**
   * Explore parameter space by applying random mutations
   */
  private exploreParameters(baseParams: StrategyParameters): StrategyParameters {
    const mutated = { ...baseParams };

    // Randomly mutate 1-2 parameters
    const paramsToMutate = Math.random() < 0.5 ? 1 : 2;
    const paramKeys = Object.keys(baseParams) as (keyof StrategyParameters)[];

    for (let i = 0; i < paramsToMutate; i++) {
      const paramKey = paramKeys[Math.floor(Math.random() * paramKeys.length)];

      if (paramKey === 'priorityFeeStrategy') {
        const strategies: ('conservative' | 'moderate' | 'aggressive')[] = [
          'conservative',
          'moderate',
          'aggressive',
        ];
        mutated[paramKey] = strategies[Math.floor(Math.random() * strategies.length)];
      } else {
        const bounds = this.parameterBounds.get(paramKey);
        if (bounds) {
          const [min, max] = bounds;
          const value = baseParams[paramKey] as number;
          const mutationRange = (max - min) * 0.2; // 20% mutation
          const mutation = (Math.random() - 0.5) * mutationRange;
          mutated[paramKey] = Math.max(min, Math.min(max, value + mutation)) as any;
        }
      }
    }

    return mutated;
  }

  /**
   * Optimize parameters based on Q-value
   */
  private optimizeParameters(baseParams: StrategyParameters, qValue: number): StrategyParameters {
    const optimized = { ...baseParams };

    // Use Q-value to guide optimization direction
    if (qValue > 0) {
      // Positive Q-value: tighten parameters for safety
      optimized.mevRiskSensitivity = Math.min(0.8, optimized.mevRiskSensitivity * 1.1);
      optimized.minProfitThreshold = Math.min(0.5, optimized.minProfitThreshold * 1.05);
    } else {
      // Negative Q-value: relax parameters to find opportunities
      optimized.mevRiskSensitivity = Math.max(0.2, optimized.mevRiskSensitivity * 0.9);
      optimized.maxSlippage = Math.min(0.03, optimized.maxSlippage * 1.1);
    }

    return optimized;
  }

  /**
   * Calculate confidence in suggestion
   */
  private calculateConfidence(stateKey: string, params: StrategyParameters): number {
    const stateActions = this.qTable.get(stateKey);
    if (!stateActions || stateActions.size === 0) {
      return 0.1; // Low confidence for unexplored states
    }

    // Base confidence on visit count and Q-value variance
    const actionKey = this.hashAction(params);
    const sa = stateActions.get(actionKey);

    if (!sa) {
      return 0.2;
    }

    // Confidence increases with visits (up to 100 visits)
    const visitConfidence = Math.min(1.0, sa.visits / 100);

    // Confidence increases with positive Q-value
    const valueConfidence = sa.qValue > 0 ? Math.min(1.0, sa.qValue / 10) : 0.3;

    return (visitConfidence + valueConfidence) / 2;
  }

  /**
   * Estimate expected improvement from parameter change
   */
  private estimateImprovement(
    stateKey: string,
    newParams: StrategyParameters,
    oldParams: StrategyParameters
  ): number {
    const stateActions = this.qTable.get(stateKey);
    if (!stateActions) {
      return 0;
    }

    const newActionKey = this.hashAction(newParams);
    const oldActionKey = this.hashAction(oldParams);

    const newQ = stateActions.get(newActionKey)?.qValue ?? 0;
    const oldQ = stateActions.get(oldActionKey)?.qValue ?? 0;

    return newQ - oldQ;
  }

  /**
   * Generate human-readable rationale for parameter suggestion
   */
  private generateRationale(
    currentParams: StrategyParameters,
    suggestedParams: StrategyParameters,
    confidence: number
  ): string {
    const changes: string[] = [];

    // Detect significant changes
    if (Math.abs(suggestedParams.minProfitThreshold - currentParams.minProfitThreshold) > 0.01) {
      const direction =
        suggestedParams.minProfitThreshold > currentParams.minProfitThreshold
          ? 'increase'
          : 'decrease';
      changes.push(
        `${direction} profit threshold to ${suggestedParams.minProfitThreshold.toFixed(4)} ETH`
      );
    }

    if (Math.abs(suggestedParams.mevRiskSensitivity - currentParams.mevRiskSensitivity) > 0.05) {
      const direction =
        suggestedParams.mevRiskSensitivity > currentParams.mevRiskSensitivity
          ? 'increase'
          : 'decrease';
      changes.push(
        `${direction} MEV risk sensitivity to ${suggestedParams.mevRiskSensitivity.toFixed(2)}`
      );
    }

    if (suggestedParams.priorityFeeStrategy !== currentParams.priorityFeeStrategy) {
      changes.push(`switch to ${suggestedParams.priorityFeeStrategy} priority fee strategy`);
    }

    if (changes.length === 0) {
      return `Maintain current parameters (confidence: ${(confidence * 100).toFixed(0)}%)`;
    }

    return `Suggest: ${changes.join(', ')} based on ${this.episodeCount} episodes (confidence: ${(
      confidence * 100
    ).toFixed(0)}%)`;
  }

  /**
   * Discretize continuous state into bins for Q-table
   */
  private discretizeState(state: ExecutionState): string {
    const bins = {
      baseFee: Math.floor(state.baseFee / 10), // 10 Gwei bins
      congestion: Math.floor(state.congestion * 10), // 10% bins
      profitLevel: Math.floor(state.expectedProfit / 0.1), // 0.1 ETH bins
      successRate: Math.floor(state.recentSuccessRate * 10), // 10% bins
    };

    return JSON.stringify(bins);
  }

  /**
   * Hash action (strategy parameters) for Q-table lookup
   */
  private hashAction(params: StrategyParameters): string {
    return JSON.stringify({
      profit: Math.floor(params.minProfitThreshold * 1000),
      mevRisk: Math.floor(params.mevRiskSensitivity * 100),
      slippage: Math.floor(params.maxSlippage * 10000),
      gas: Math.floor(params.gasMultiplier * 100),
      strategy: params.priorityFeeStrategy,
    });
  }

  /**
   * Get current state from environment
   * In production, this would query MEVSensorHub and SystemHealthMonitor
   */
  private getCurrentState(): ExecutionState {
    // Placeholder - in real implementation, get from MEVSensorHub
    return {
      baseFee: 20,
      gasPrice: 25,
      congestion: 0.5,
      searcherDensity: 0.3,
      expectedProfit: 0.1,
      pathComplexity: 3,
      liquidityDepth: 100000,
      recentSuccessRate: 0.6,
      avgProfitPerTx: 0.05,
      recentMEVLoss: 0.01,
    };
  }

  /**
   * Get learning statistics
   */
  getStatistics() {
    return {
      episodeCount: this.episodeCount,
      totalReward: this.totalReward,
      avgReward: this.episodeCount > 0 ? this.totalReward / this.episodeCount : 0,
      qTableSize: this.qTable.size,
      explorationRate: this.currentExplorationRate,
      bufferSize: this.episodeBuffer.length,
    };
  }

  /**
   * Export learned policy for persistence
   */
  exportPolicy(): any {
    const policy: any = {};

    for (const [stateKey, actions] of this.qTable.entries()) {
      policy[stateKey] = {};
      for (const [actionKey, sa] of actions.entries()) {
        policy[stateKey][actionKey] = {
          qValue: sa.qValue,
          visits: sa.visits,
        };
      }
    }

    return {
      policy,
      statistics: this.getStatistics(),
      config: this.config,
    };
  }

  /**
   * Import learned policy from persistence
   */
  importPolicy(data: any): void {
    if (!data.policy) return;

    this.qTable.clear();

    for (const [stateKey, actions] of Object.entries(data.policy)) {
      const stateActions = new Map<string, StateActionValue>();

      for (const [actionKey, value] of Object.entries(actions as any)) {
        const typedValue = value as { qValue: number; visits: number };
        stateActions.set(actionKey, {
          state: stateKey,
          action: actionKey,
          qValue: typedValue.qValue,
          visits: typedValue.visits,
          lastUpdated: Date.now(),
        });
      }

      this.qTable.set(stateKey, stateActions);
    }

    logger.info(`[StrategyRLAgent] Imported policy with ${this.qTable.size} states`);
  }
}
