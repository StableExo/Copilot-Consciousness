/**
 * StrategyEvolutionEngine - Automated Strategy Evolution
 *
 * Phase 3: Advanced AI Integration
 *
 * This component implements genetic algorithm-inspired strategy evolution.
 * It creates variants of strategy configurations, tests them, and evolves
 * the best performing ones over time.
 *
 * Core capabilities:
 * - Generate strategy variants through mutation and crossover
 * - Evaluate variants based on execution outcomes
 * - Select best performing variants for next generation
 * - Maintain diversity to avoid local optima
 *
 * Integration with TheWarden/AEV:
 * - Proposes strategy variants to AdvancedOrchestrator
 * - Receives performance feedback from ArbitrageConsciousness
 * - Evolves strategies based on real market outcomes
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import {
  StrategyParameters,
  ConfigVariant,
  StrategyMutation,
  VariantEvaluationResult,
} from './types';

interface EvolutionConfig {
  populationSize: number;
  generationSize: number;
  mutationRate: number;
  crossoverRate: number;
  elitismCount: number;
  diversityWeight: number;
  minGenerations: number;
  convergenceThreshold: number;
}

interface EvolutionState {
  currentGeneration: number;
  population: ConfigVariant[];
  evaluations: Map<string, VariantEvaluationResult>;
  bestVariant: ConfigVariant | null;
  convergenceScore: number;
}

/**
 * Automated Strategy Evolution Engine
 */
export class StrategyEvolutionEngine extends EventEmitter {
  private config: EvolutionConfig;
  private state: EvolutionState;
  private baseConfig: StrategyParameters;
  private parameterBounds: Map<keyof StrategyParameters, [number, number]> = new Map();

  constructor(baseConfig: StrategyParameters, config?: Partial<EvolutionConfig>) {
    super();

    this.baseConfig = baseConfig;

    this.config = {
      populationSize: config?.populationSize ?? 20,
      generationSize: config?.generationSize ?? 5,
      mutationRate: config?.mutationRate ?? 0.3,
      crossoverRate: config?.crossoverRate ?? 0.5,
      elitismCount: config?.elitismCount ?? 2,
      diversityWeight: config?.diversityWeight ?? 0.2,
      minGenerations: config?.minGenerations ?? 10,
      convergenceThreshold: config?.convergenceThreshold ?? 0.95,
    };

    this.state = {
      currentGeneration: 0,
      population: [],
      evaluations: new Map(),
      bestVariant: null,
      convergenceScore: 0,
    };

    this.initializeParameterBounds();
    this.initializePopulation();

    logger.info(
      `[StrategyEvolutionEngine] Initialized with population size: ${this.config.populationSize}`
    );
  }

  /**
   * Initialize safe parameter bounds
   */
  private initializeParameterBounds(): void {
    this.parameterBounds.set('minProfitThreshold', [0.001, 1.0]);
    this.parameterBounds.set('mevRiskSensitivity', [0.1, 0.9]);
    this.parameterBounds.set('maxSlippage', [0.001, 0.05]);
    this.parameterBounds.set('gasMultiplier', [1.0, 2.0]);
    this.parameterBounds.set('executionTimeout', [5000, 30000]);
  }

  /**
   * Initialize first generation population
   */
  private initializePopulation(): void {
    this.state.population = [];

    // Add base configuration as elite member
    this.state.population.push({
      id: this.generateVariantId(),
      params: { ...this.baseConfig },
      mutations: [],
      generation: 0,
    });

    // Generate diverse initial population
    for (let i = 1; i < this.config.populationSize; i++) {
      const variant = this.generateRandomVariant(this.baseConfig, 0);
      this.state.population.push(variant);
    }

    logger.info(
      `[StrategyEvolutionEngine] Initialized population with ${this.state.population.length} variants`
    );
  }

  /**
   * Propose strategy variants for testing
   *
   * Primary integration point - called by AdvancedOrchestrator
   *
   * @param baseConfig Current base configuration
   * @returns Array of variants to test
   */
  async proposeVariants(baseConfig: StrategyParameters): Promise<ConfigVariant[]> {
    // Update base config
    this.baseConfig = baseConfig;

    // If we need to evolve, create next generation
    if (this.shouldEvolve()) {
      await this.evolveGeneration();
    }

    // Return top N variants for testing
    const variantsToTest = this.selectVariantsForTesting();

    this.emit('variantsProposed', {
      generation: this.state.currentGeneration,
      variantCount: variantsToTest.length,
    });

    return variantsToTest;
  }

  /**
   * Check if we should evolve to next generation
   */
  private shouldEvolve(): boolean {
    // Evolve if we have enough evaluations for current generation
    const currentGenVariants = this.state.population.filter(
      (v) => v.generation === this.state.currentGeneration
    );

    const evaluatedCount = currentGenVariants.filter((v) =>
      this.state.evaluations.has(v.id)
    ).length;

    return evaluatedCount >= this.config.generationSize;
  }

  /**
   * Evolve to next generation
   */
  private async evolveGeneration(): Promise<void> {
    const startTime = Date.now();

    // Calculate fitness for all variants
    this.calculateFitness();

    // Sort by fitness
    const sorted = [...this.state.population].sort(
      (a, b) => (b.fitnessScore ?? 0) - (a.fitnessScore ?? 0)
    );

    // Update best variant
    if (sorted.length > 0 && (sorted[0].fitnessScore ?? 0) > 0) {
      this.state.bestVariant = sorted[0];
    }

    // Create next generation
    const nextGeneration: ConfigVariant[] = [];
    const nextGenNumber = this.state.currentGeneration + 1;

    // Elitism: Keep top performers
    for (let i = 0; i < this.config.elitismCount && i < sorted.length; i++) {
      nextGeneration.push({
        ...sorted[i],
        generation: nextGenNumber,
      });
    }

    // Fill rest with offspring
    while (nextGeneration.length < this.config.populationSize) {
      // Select parents
      const parent1 = this.tournamentSelection(sorted);
      const parent2 = this.tournamentSelection(sorted);

      // Crossover
      let offspring: ConfigVariant;
      if (Math.random() < this.config.crossoverRate) {
        offspring = this.crossover(parent1, parent2, nextGenNumber);
      } else {
        offspring = {
          ...parent1,
          id: this.generateVariantId(),
          generation: nextGenNumber,
        };
      }

      // Mutation
      if (Math.random() < this.config.mutationRate) {
        offspring = this.mutate(offspring);
      }

      nextGeneration.push(offspring);
    }

    // Update state
    this.state.population = nextGeneration;
    this.state.currentGeneration = nextGenNumber;

    // Calculate convergence
    this.state.convergenceScore = this.calculateConvergence(sorted);

    const duration = Date.now() - startTime;

    this.emit('generationEvolved', {
      generation: nextGenNumber,
      populationSize: nextGeneration.length,
      bestFitness: sorted[0]?.fitnessScore ?? 0,
      convergence: this.state.convergenceScore,
      duration,
    });

    logger.info(`[StrategyEvolutionEngine] Evolved to generation ${nextGenNumber} (${duration}ms)`);
    logger.info(`  Best fitness: ${sorted[0]?.fitnessScore?.toFixed(4) ?? 'N/A'}`);
    logger.info(`  Convergence: ${(this.state.convergenceScore * 100).toFixed(1)}%`);
  }

  /**
   * Calculate fitness scores for all variants
   */
  private calculateFitness(): void {
    for (const variant of this.state.population) {
      const evaluation = this.state.evaluations.get(variant.id);

      if (evaluation) {
        // Fitness = weighted combination of metrics
        const profitScore = Math.max(0, evaluation.avgProfit) * 10;
        const successScore = evaluation.successRate * 5;
        const mevPenalty = evaluation.avgMEVLoss * 10;
        const executionBonus = Math.log(evaluation.executionCount + 1) * 2;

        variant.fitnessScore = profitScore + successScore - mevPenalty + executionBonus;
      } else {
        // Untested variants get neutral fitness
        variant.fitnessScore = 0;
      }
    }
  }

  /**
   * Tournament selection for parent selection
   */
  private tournamentSelection(population: ConfigVariant[]): ConfigVariant {
    const tournamentSize = 3;
    const tournament: ConfigVariant[] = [];

    for (let i = 0; i < tournamentSize; i++) {
      const idx = Math.floor(Math.random() * population.length);
      tournament.push(population[idx]);
    }

    tournament.sort((a, b) => (b.fitnessScore ?? 0) - (a.fitnessScore ?? 0));

    return tournament[0];
  }

  /**
   * Crossover two parent variants
   */
  private crossover(
    parent1: ConfigVariant,
    parent2: ConfigVariant,
    generation: number
  ): ConfigVariant {
    const offspring: ConfigVariant = {
      id: this.generateVariantId(),
      params: { ...parent1.params },
      mutations: [],
      generation,
    };

    // Uniform crossover
    const keys = Object.keys(parent1.params) as (keyof StrategyParameters)[];

    for (const key of keys) {
      if (Math.random() < 0.5) {
        (offspring.params as any)[key] = parent2.params[key];

        offspring.mutations.push({
          parameter: key,
          previousValue: parent1.params[key],
          newValue: parent2.params[key],
          mutationType: 'optimize',
        });
      }
    }

    return offspring;
  }

  /**
   * Mutate a variant
   */
  private mutate(variant: ConfigVariant): ConfigVariant {
    const mutated = { ...variant };
    mutated.id = this.generateVariantId();
    mutated.mutations = [...variant.mutations];

    const keys = Object.keys(variant.params) as (keyof StrategyParameters)[];
    const keyToMutate = keys[Math.floor(Math.random() * keys.length)];

    const previousValue = variant.params[keyToMutate];

    if (keyToMutate === 'priorityFeeStrategy') {
      const strategies: ('conservative' | 'moderate' | 'aggressive')[] = [
        'conservative',
        'moderate',
        'aggressive',
      ];
      mutated.params[keyToMutate] = strategies[Math.floor(Math.random() * strategies.length)];
    } else {
      const bounds = this.parameterBounds.get(keyToMutate);
      if (bounds) {
        const [min, max] = bounds;
        const currentValue = variant.params[keyToMutate] as number;
        const range = max - min;

        // Gaussian mutation
        const mutation = this.gaussianRandom() * range * 0.1;
        const newValue = Math.max(min, Math.min(max, currentValue + mutation));

        mutated.params[keyToMutate] = newValue as any;
      }
    }

    mutated.mutations.push({
      parameter: keyToMutate,
      previousValue,
      newValue: mutated.params[keyToMutate],
      mutationType: 'randomize',
    });

    return mutated;
  }

  /**
   * Generate random variant from base config
   */
  private generateRandomVariant(baseConfig: StrategyParameters, generation: number): ConfigVariant {
    const variant: ConfigVariant = {
      id: this.generateVariantId(),
      params: { ...baseConfig },
      mutations: [],
      generation,
    };

    // Mutate 2-3 parameters
    const mutationCount = Math.floor(Math.random() * 2) + 2;
    const keys = Object.keys(baseConfig) as (keyof StrategyParameters)[];

    for (let i = 0; i < mutationCount; i++) {
      const key = keys[Math.floor(Math.random() * keys.length)];
      const previousValue = variant.params[key];

      if (key === 'priorityFeeStrategy') {
        const strategies: ('conservative' | 'moderate' | 'aggressive')[] = [
          'conservative',
          'moderate',
          'aggressive',
        ];
        variant.params[key] = strategies[Math.floor(Math.random() * strategies.length)];
      } else {
        const bounds = this.parameterBounds.get(key);
        if (bounds) {
          const [min, max] = bounds;
          variant.params[key] = (min + Math.random() * (max - min)) as any;
        }
      }

      variant.mutations.push({
        parameter: key,
        previousValue,
        newValue: variant.params[key],
        mutationType: 'randomize',
      });
    }

    return variant;
  }

  /**
   * Calculate population convergence
   */
  private calculateConvergence(sortedPopulation: ConfigVariant[]): number {
    if (sortedPopulation.length < 2) return 0;

    const topFitness = sortedPopulation[0].fitnessScore ?? 0;
    const avgFitness =
      sortedPopulation.reduce((sum, v) => sum + (v.fitnessScore ?? 0), 0) / sortedPopulation.length;

    if (topFitness === 0) return 0;

    return avgFitness / topFitness;
  }

  /**
   * Select variants for testing
   */
  private selectVariantsForTesting(): ConfigVariant[] {
    // Select top variants that haven't been evaluated yet or need more data
    const candidates = this.state.population.filter((v) => {
      const evaluation = this.state.evaluations.get(v.id);
      return !evaluation || evaluation.executionCount < 10;
    });

    // Sort by diversity score
    candidates.sort((a, b) => {
      const aEval = this.state.evaluations.get(a.id);
      const bEval = this.state.evaluations.get(b.id);

      const aScore = (aEval?.executionCount ?? 0) * -1 + (a.fitnessScore ?? 0);
      const bScore = (bEval?.executionCount ?? 0) * -1 + (b.fitnessScore ?? 0);

      return bScore - aScore;
    });

    return candidates.slice(0, this.config.generationSize);
  }

  /**
   * Select best variant from evaluated population
   *
   * Called by AdvancedOrchestrator to get the best strategy
   *
   * @param evaluationResults Results from testing variants
   * @returns Best performing variant
   */
  async selectBestVariant(evaluationResults: VariantEvaluationResult[]): Promise<ConfigVariant> {
    // Update evaluations
    for (const result of evaluationResults) {
      this.state.evaluations.set(result.variantId, result);
    }

    // Recalculate fitness
    this.calculateFitness();

    // Find best variant
    const sorted = [...this.state.population].sort(
      (a, b) => (b.fitnessScore ?? 0) - (a.fitnessScore ?? 0)
    );

    const best = sorted[0] ?? this.state.population[0];
    this.state.bestVariant = best;

    this.emit('bestVariantSelected', {
      variantId: best.id,
      fitnessScore: best.fitnessScore,
      generation: best.generation,
    });

    return best;
  }

  /**
   * Record execution outcome for a variant
   */
  recordExecution(variantId: string, profit: number, success: boolean, mevLoss: number): void {
    const evaluation = this.state.evaluations.get(variantId) ?? {
      variantId,
      executionCount: 0,
      successRate: 0,
      avgProfit: 0,
      avgMEVLoss: 0,
      fitnessScore: 0,
      performanceMetrics: {
        totalProfit: 0,
        totalGasCost: 0,
        totalMEVLoss: 0,
        sharpeRatio: 0,
      },
    };

    // Update metrics
    const prevCount = evaluation.executionCount;
    const newCount = prevCount + 1;

    evaluation.successRate = (evaluation.successRate * prevCount + (success ? 1 : 0)) / newCount;
    evaluation.avgProfit = (evaluation.avgProfit * prevCount + profit) / newCount;
    evaluation.avgMEVLoss = (evaluation.avgMEVLoss * prevCount + mevLoss) / newCount;
    evaluation.executionCount = newCount;

    evaluation.performanceMetrics.totalProfit += profit;
    evaluation.performanceMetrics.totalMEVLoss += mevLoss;

    this.state.evaluations.set(variantId, evaluation);
  }

  /**
   * Generate unique variant ID
   */
  private generateVariantId(): string {
    return `variant_${this.state.currentGeneration}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }

  /**
   * Generate random number from standard normal distribution
   */
  private gaussianRandom(): number {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  /**
   * Get evolution statistics
   */
  getStatistics() {
    const evaluatedCount = Array.from(this.state.evaluations.values()).length;
    const avgFitness =
      this.state.population.reduce((sum, v) => sum + (v.fitnessScore ?? 0), 0) /
      this.state.population.length;

    return {
      generation: this.state.currentGeneration,
      populationSize: this.state.population.length,
      evaluatedVariants: evaluatedCount,
      bestFitness: this.state.bestVariant?.fitnessScore ?? 0,
      avgFitness,
      convergence: this.state.convergenceScore,
    };
  }

  /**
   * Export evolution state for persistence
   */
  exportState(): any {
    return {
      state: {
        currentGeneration: this.state.currentGeneration,
        population: this.state.population,
        evaluations: Array.from(this.state.evaluations.entries()),
        bestVariant: this.state.bestVariant,
        convergenceScore: this.state.convergenceScore,
      },
      config: this.config,
      baseConfig: this.baseConfig,
    };
  }

  /**
   * Import evolution state from persistence
   */
  importState(data: any): void {
    if (data.state) {
      this.state.currentGeneration = data.state.currentGeneration ?? 0;
      this.state.population = data.state.population ?? [];
      this.state.evaluations = new Map(data.state.evaluations ?? []);
      this.state.bestVariant = data.state.bestVariant ?? null;
      this.state.convergenceScore = data.state.convergenceScore ?? 0;
    }

    if (data.baseConfig) {
      this.baseConfig = data.baseConfig;
    }

    logger.info(
      `[StrategyEvolutionEngine] Imported state at generation ${this.state.currentGeneration}`
    );
  }
}
