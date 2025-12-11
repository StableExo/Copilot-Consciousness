/**
 * Creative Strategy Generator
 * 
 * Evolves strategies by analyzing successful patterns, combining approaches,
 * mutating parameters, testing variations, and selecting winners.
 * 
 * This enables creative exploration of strategy space beyond pre-programmed options.
 */

import { randomUUID } from 'crypto';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

export interface Strategy {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, number>;
  performance: number;
  tested: boolean;
  generation: number;
  parentIds?: string[];
}

export interface StrategyVariation {
  baseStrategy: Strategy;
  variationType: 'parameter_mutation' | 'combination' | 'crossover' | 'novel';
  changes: string[];
  expectedImprovement: number;
}

export interface EvolutionResult {
  generation: number;
  strategiesTested: Strategy[];
  bestStrategy: Strategy;
  averagePerformance: number;
  improvementFromPrevious: number;
}

export class StrategyGenerator {
  private strategiesDir: string;
  private evolutionHistory: EvolutionResult[] = [];
  private currentGeneration: number = 0;
  
  constructor(baseDir: string = process.cwd()) {
    this.strategiesDir = join(baseDir, '.memory', 'strategies');
    this.ensureDirectories();
    this.loadEvolutionHistory();
  }
  
  private ensureDirectories(): void {
    if (!existsSync(this.strategiesDir)) {
      const fs = require('fs');
      fs.mkdirSync(this.strategiesDir, { recursive: true });
    }
  }
  
  private loadEvolutionHistory(): void {
    if (existsSync(this.strategiesDir)) {
      const files = readdirSync(this.strategiesDir)
        .filter(f => f.startsWith('evolution-') && f.endsWith('.json'));
      
      for (const file of files) {
        try {
          const data = readFileSync(join(this.strategiesDir, file), 'utf-8');
          const result = JSON.parse(data);
          this.evolutionHistory.push(result);
        } catch (error) {
          // Skip malformed files
        }
      }
      
      if (this.evolutionHistory.length > 0) {
        this.currentGeneration = Math.max(...this.evolutionHistory.map(e => e.generation));
      }
    }
    
    console.log(`🧬 Loaded ${this.evolutionHistory.length} generations of strategy evolution`);
  }
  
  /**
   * Main strategy evolution cycle
   */
  async evolveStrategies(
    initialStrategies?: Strategy[],
    generations: number = 5
  ): Promise<EvolutionResult[]> {
    console.log('🧬 Starting strategy evolution');
    console.log(`   Initial generation: ${this.currentGeneration}`);
    console.log(`   Generations to evolve: ${generations}`);
    console.log('');
    
    const results: EvolutionResult[] = [];
    let currentPopulation = initialStrategies || this.generateInitialPopulation();
    
    for (let gen = 0; gen < generations; gen++) {
      const generationNumber = this.currentGeneration + gen + 1;
      
      console.log(`📊 Generation ${generationNumber}:`);
      
      // Step 1: Analyze successful patterns
      console.log('   🔍 Analyzing successful patterns...');
      const patterns = this.analyzeSuccessfulPatterns(currentPopulation);
      console.log(`      Found ${patterns.length} success patterns`);
      
      // Step 2: Combine approaches
      console.log('   🔀 Combining approaches...');
      const combinations = this.combineApproaches(currentPopulation, patterns);
      console.log(`      Generated ${combinations.length} combinations`);
      
      // Step 3: Mutate parameters
      console.log('   🎲 Mutating parameters...');
      const mutations = this.mutateParameters(currentPopulation);
      console.log(`      Created ${mutations.length} mutations`);
      
      // Step 4: Test variations
      console.log('   🧪 Testing variations...');
      const allVariations = [...combinations, ...mutations];
      const testedStrategies = await this.testVariations(allVariations);
      console.log(`      Tested ${testedStrategies.length} variations`);
      
      // Step 5: Select winners
      console.log('   🏆 Selecting winners...');
      const winners = this.selectWinners([...currentPopulation, ...testedStrategies]);
      const bestStrategy = winners[0];
      
      const avgPerformance = winners.reduce((sum, s) => sum + s.performance, 0) / winners.length;
      const previousBest = results[results.length - 1]?.bestStrategy.performance || 0;
      const improvement = avgPerformance - previousBest;
      
      console.log(`      Best: ${bestStrategy.name} (${(bestStrategy.performance*100).toFixed(1)}%)`);
      console.log(`      Avg: ${(avgPerformance*100).toFixed(1)}%`);
      console.log(`      Improvement: ${improvement >= 0 ? '+' : ''}${(improvement*100).toFixed(1)}%`);
      console.log('');
      
      const result: EvolutionResult = {
        generation: generationNumber,
        strategiesTested: testedStrategies,
        bestStrategy,
        averagePerformance: avgPerformance,
        improvementFromPrevious: improvement
      };
      
      results.push(result);
      this.evolutionHistory.push(result);
      currentPopulation = winners;
      
      // Save generation
      this.saveGeneration(result);
    }
    
    this.currentGeneration += generations;
    
    console.log('✅ Strategy evolution complete!');
    console.log(`   Final generation: ${this.currentGeneration}`);
    console.log(`   Best strategy: ${results[results.length - 1].bestStrategy.name}`);
    console.log('');
    
    return results;
  }
  
  /**
   * Generate initial population if none provided
   */
  private generateInitialPopulation(): Strategy[] {
    const strategies: Strategy[] = [];
    
    // Conservative strategy
    strategies.push({
      id: randomUUID(),
      name: 'Conservative',
      description: 'Low risk, consistent returns',
      parameters: {
        aggressiveness: 0.2,
        riskTolerance: 0.3,
        explorationRate: 0.1
      },
      performance: 0.6 + Math.random() * 0.1,
      tested: true,
      generation: 0
    });
    
    // Aggressive strategy
    strategies.push({
      id: randomUUID(),
      name: 'Aggressive',
      description: 'High risk, high reward',
      parameters: {
        aggressiveness: 0.9,
        riskTolerance: 0.8,
        explorationRate: 0.5
      },
      performance: 0.5 + Math.random() * 0.2,
      tested: true,
      generation: 0
    });
    
    // Balanced strategy
    strategies.push({
      id: randomUUID(),
      name: 'Balanced',
      description: 'Medium risk, medium reward',
      parameters: {
        aggressiveness: 0.5,
        riskTolerance: 0.5,
        explorationRate: 0.3
      },
      performance: 0.65 + Math.random() * 0.1,
      tested: true,
      generation: 0
    });
    
    return strategies;
  }
  
  /**
   * Analyze patterns in successful strategies
   */
  private analyzeSuccessfulPatterns(strategies: Strategy[]): any[] {
    const patterns: any[] = [];
    
    // Find top performers
    const topPerformers = strategies
      .filter(s => s.tested)
      .sort((a, b) => b.performance - a.performance)
      .slice(0, Math.max(3, Math.ceil(strategies.length * 0.3)));
    
    if (topPerformers.length === 0) return patterns;
    
    // Analyze parameter patterns
    const paramNames = Object.keys(topPerformers[0].parameters);
    
    for (const paramName of paramNames) {
      const values = topPerformers.map(s => s.parameters[paramName]);
      const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
      
      patterns.push({
        parameter: paramName,
        averageValue: avg,
        range: [Math.min(...values), Math.max(...values)],
        correlation: 'positive' // Simplified
      });
    }
    
    return patterns;
  }
  
  /**
   * Combine successful approaches
   */
  private combineApproaches(strategies: Strategy[], patterns: any[]): Strategy[] {
    const combinations: Strategy[] = [];
    
    const topStrategies = strategies
      .filter(s => s.tested)
      .sort((a, b) => b.performance - a.performance)
      .slice(0, 3);
    
    if (topStrategies.length < 2) return combinations;
    
    // Crossover top strategies
    for (let i = 0; i < topStrategies.length - 1; i++) {
      for (let j = i + 1; j < topStrategies.length; j++) {
        const parent1 = topStrategies[i];
        const parent2 = topStrategies[j];
        
        const newParameters: Record<string, number> = {};
        for (const key of Object.keys(parent1.parameters)) {
          // Average or pick from either parent
          newParameters[key] = Math.random() > 0.5
            ? parent1.parameters[key]
            : (parent1.parameters[key] + parent2.parameters[key]) / 2;
        }
        
        combinations.push({
          id: randomUUID(),
          name: `${parent1.name}-${parent2.name} Hybrid`,
          description: `Combination of ${parent1.name} and ${parent2.name}`,
          parameters: newParameters,
          performance: 0,
          tested: false,
          generation: this.currentGeneration + 1,
          parentIds: [parent1.id, parent2.id]
        });
      }
    }
    
    return combinations;
  }
  
  /**
   * Mutate parameters of existing strategies
   */
  private mutateParameters(strategies: Strategy[]): Strategy[] {
    const mutations: Strategy[] = [];
    
    const topStrategies = strategies
      .filter(s => s.tested)
      .sort((a, b) => b.performance - a.performance)
      .slice(0, 5);
    
    for (const strategy of topStrategies) {
      // Create mutations with different mutation rates
      const mutationRates = [0.1, 0.2, 0.3];
      
      for (const rate of mutationRates) {
        const mutatedParameters: Record<string, number> = {};
        
        for (const [key, value] of Object.entries(strategy.parameters)) {
          // Mutate parameter by adding random noise
          const mutation = (Math.random() - 0.5) * 2 * rate;
          mutatedParameters[key] = Math.max(0, Math.min(1, value + mutation));
        }
        
        mutations.push({
          id: randomUUID(),
          name: `${strategy.name} Mutation ${rate}`,
          description: `Mutated version of ${strategy.name}`,
          parameters: mutatedParameters,
          performance: 0,
          tested: false,
          generation: this.currentGeneration + 1,
          parentIds: [strategy.id]
        });
      }
    }
    
    return mutations;
  }
  
  /**
   * Test strategy variations
   */
  private async testVariations(variations: Strategy[]): Promise<Strategy[]> {
    const tested: Strategy[] = [];
    
    for (const variation of variations) {
      // Simulate performance testing (in real implementation, would run actual tests)
      const basePerformance = 0.5;
      const parameterQuality = Object.values(variation.parameters)
        .reduce((sum, v) => sum + (0.5 - Math.abs(v - 0.5)), 0) / Object.keys(variation.parameters).length;
      
      variation.performance = Math.max(0, Math.min(1, basePerformance + parameterQuality * 0.3 + Math.random() * 0.1));
      variation.tested = true;
      
      tested.push(variation);
    }
    
    return tested;
  }
  
  /**
   * Select top performing strategies for next generation
   */
  private selectWinners(strategies: Strategy[], count: number = 10): Strategy[] {
    return strategies
      .filter(s => s.tested)
      .sort((a, b) => b.performance - a.performance)
      .slice(0, count);
  }
  
  /**
   * Save generation results
   */
  private saveGeneration(result: EvolutionResult): void {
    const filename = join(this.strategiesDir, `evolution-gen${result.generation}.json`);
    writeFileSync(filename, JSON.stringify(result, null, 2));
  }
}

export default StrategyGenerator;
