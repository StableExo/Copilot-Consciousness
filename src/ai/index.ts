/**
 * AI Module - Phase 3: Advanced AI Integration
 * 
 * This module provides advanced AI capabilities for TheWarden/AEV:
 * - Reinforcement learning for strategy optimization
 * - Neural network-based opportunity detection
 * - Automated strategy evolution through genetic algorithms
 * 
 * Status: Phase 3 - Fully Implemented
 * 
 * Integration Points:
 * - StrategyRLAgent: Learns optimal strategy parameters from execution outcomes
 * - OpportunityNNScorer: Scores opportunities using neural network-inspired model
 * - StrategyEvolutionEngine: Evolves strategy configurations automatically
 * 
 * Usage:
 * ```typescript
 * import { StrategyRLAgent, OpportunityNNScorer, StrategyEvolutionEngine } from './ai';
 * 
 * // Initialize AI components
 * const rlAgent = new StrategyRLAgent();
 * const nnScorer = new OpportunityNNScorer();
 * const evolutionEngine = new StrategyEvolutionEngine(baseParams);
 * 
 * // Use in execution flow
 * const score = await nnScorer.scoreOpportunity(features);
 * const suggestedParams = await rlAgent.suggestParameters(currentParams);
 * const variants = await evolutionEngine.proposeVariants(baseParams);
 * ```
 */

export { StrategyRLAgent } from './StrategyRLAgent';
export { OpportunityNNScorer } from './OpportunityNNScorer';
export { StrategyEvolutionEngine } from './StrategyEvolutionEngine';

export * from './types';
