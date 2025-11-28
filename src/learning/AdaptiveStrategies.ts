/**
 * AdaptiveStrategies - Strategy Adaptation System
 *
 * Integrated from AxionCitadel's game-theoretic learning approach.
 * Adapts trading strategies based on environmental conditions and past performance.
 *
 * This module implements adaptive strategy selection and parameter tuning
 * based on the "game-theoretic warfare" learning philosophy.
 */

import { CalibrationEngine } from '../memory/strategic-logger/CalibrationEngine';
import { MemoryFormation, StrategicMemory } from '../memory/strategic-logger/MemoryFormation';

export interface Strategy {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, number>;
  conditions: Record<string, any>;
  successRate: number;
  lastUsed: number;
  timesUsed: number;
}

export interface StrategySelection {
  strategy: Strategy;
  confidence: number;
  reasoning: string;
}

export class AdaptiveStrategies {
  private strategies: Map<string, Strategy>;
  private calibrationEngine: CalibrationEngine;
  private memoryFormation: MemoryFormation;

  constructor(calibrationEngine: CalibrationEngine, memoryFormation: MemoryFormation) {
    this.strategies = new Map();
    this.calibrationEngine = calibrationEngine;
    this.memoryFormation = memoryFormation;
  }

  /**
   * Register a new strategy
   */
  registerStrategy(strategy: Omit<Strategy, 'successRate' | 'lastUsed' | 'timesUsed'>): void {
    const fullStrategy: Strategy = {
      ...strategy,
      successRate: 0.5, // Initial neutral success rate
      lastUsed: 0,
      timesUsed: 0,
    };

    this.strategies.set(strategy.id, fullStrategy);
  }

  /**
   * Select optimal strategy based on current conditions
   */
  async selectStrategy(currentConditions: Record<string, any>): Promise<StrategySelection | null> {
    if (this.strategies.size === 0) {
      return null;
    }

    // Query memories for relevant patterns
    const memories = await this.memoryFormation.query({
      minConfidence: 0.6,
      limit: 50,
    });

    // Score each strategy
    const scoredStrategies: Array<{
      strategy: Strategy;
      score: number;
      reasoning: string;
    }> = [];

    for (const [_id, strategy] of this.strategies) {
      const score = this.scoreStrategy(strategy, currentConditions, memories);
      const reasoning = this.generateReasoning(strategy, currentConditions, score);

      scoredStrategies.push({
        strategy,
        score,
        reasoning,
      });
    }

    // Sort by score descending
    scoredStrategies.sort((a, b) => b.score - a.score);

    const best = scoredStrategies[0];
    if (!best) {
      return null;
    }

    return {
      strategy: best.strategy,
      confidence: best.score,
      reasoning: best.reasoning,
    };
  }

  /**
   * Score a strategy based on conditions and memories
   */
  private scoreStrategy(
    strategy: Strategy,
    currentConditions: Record<string, any>,
    memories: StrategicMemory[]
  ): number {
    let score = strategy.successRate;

    // Boost score if conditions match strategy requirements
    let conditionMatchCount = 0;
    const totalConditions = Object.keys(strategy.conditions).length;

    for (const [key, value] of Object.entries(strategy.conditions)) {
      if (currentConditions[key] === value) {
        conditionMatchCount++;
      }
    }

    if (totalConditions > 0) {
      const conditionMatchRatio = conditionMatchCount / totalConditions;
      score *= 0.5 + conditionMatchRatio * 0.5; // Weight condition matching at 50%
    }

    // Boost score based on relevant success patterns in memories
    const relevantSuccesses = memories.filter(
      (m) => m.type === 'success_pattern' && this.isMemoryRelevant(m, strategy.conditions)
    );

    if (relevantSuccesses.length > 0) {
      const memoryBoost = Math.min(relevantSuccesses.length * 0.05, 0.2);
      score += memoryBoost;
    }

    // Penalize for relevant failure patterns
    const relevantFailures = memories.filter(
      (m) => m.type === 'failure_pattern' && this.isMemoryRelevant(m, strategy.conditions)
    );

    if (relevantFailures.length > 0) {
      const memoryPenalty = Math.min(relevantFailures.length * 0.05, 0.2);
      score -= memoryPenalty;
    }

    // Slight penalty for recently used strategies (encourage exploration)
    const timeSinceLastUse = Date.now() - strategy.lastUsed;
    const hoursSinceUse = timeSinceLastUse / (1000 * 60 * 60);
    if (hoursSinceUse < 1) {
      score *= 0.95;
    }

    return Math.max(0, Math.min(1, score)); // Clamp to [0, 1]
  }

  /**
   * Check if a memory is relevant to given conditions
   */
  private isMemoryRelevant(memory: StrategicMemory, conditions: Record<string, any>): boolean {
    let matchCount = 0;
    const memoryKeys = Object.keys(memory.context);

    if (memoryKeys.length === 0) return false;

    for (const key of memoryKeys) {
      if (conditions[key] === memory.context[key]) {
        matchCount++;
      }
    }

    return matchCount / memoryKeys.length >= 0.5; // 50% match threshold
  }

  /**
   * Generate reasoning for strategy selection
   */
  private generateReasoning(
    strategy: Strategy,
    currentConditions: Record<string, any>,
    score: number
  ): string {
    const parts: string[] = [];

    parts.push(`Strategy: ${strategy.name}`);
    parts.push(`Confidence: ${(score * 100).toFixed(1)}%`);
    parts.push(`Historical success rate: ${(strategy.successRate * 100).toFixed(1)}%`);

    if (strategy.timesUsed > 0) {
      parts.push(`Used ${strategy.timesUsed} times previously`);
    }

    return parts.join('. ');
  }

  /**
   * Update strategy performance after execution
   */
  updateStrategyPerformance(strategyId: string, success: boolean): void {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy ${strategyId} not found`);
    }

    // Update success rate using exponential moving average
    const alpha = 0.2; // Learning rate
    const outcome = success ? 1 : 0;
    strategy.successRate = alpha * outcome + (1 - alpha) * strategy.successRate;

    // Update usage stats
    strategy.lastUsed = Date.now();
    strategy.timesUsed++;

    this.strategies.set(strategyId, strategy);
  }

  /**
   * Get all registered strategies
   */
  getAllStrategies(): Strategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Get strategy by ID
   */
  getStrategy(id: string): Strategy | undefined {
    return this.strategies.get(id);
  }

  /**
   * Remove a strategy
   */
  removeStrategy(id: string): boolean {
    return this.strategies.delete(id);
  }

  /**
   * Get top performing strategies
   */
  getTopStrategies(limit: number = 5): Strategy[] {
    const strategies = this.getAllStrategies();
    return strategies.sort((a, b) => b.successRate - a.successRate).slice(0, limit);
  }
}
