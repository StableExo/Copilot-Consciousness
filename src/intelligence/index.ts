/**
 * Intelligence Layer - Consolidated AI/ML/AGI Components
 * 
 * This module consolidates all AI/ML capabilities for TheWarden/AEV
 * by re-exporting from the specialized modules:
 * 
 * Modules:
 * - mev-awareness: MEV risk modeling, real-time monitoring, profit calculation
 * - flashbots: Advanced Flashbots integration, bundle optimization, builder reputation
 * - ai: Neural network scoring, RL agents, strategy evolution (Phase 3)
 * - agi: AGI-aligned memory and neural bridge protocol
 * - ml: ML orchestration, data collection, pattern detection
 * - learning: Adaptive strategies, knowledge loop
 * 
 * Usage:
 * ```typescript
 * // Import directly from intelligence module
 * import { StrategyRLAgent, OpportunityNNScorer, MLOrchestrator } from './intelligence';
 * 
 * // Or import from specific submodules
 * import { StrategyRLAgent } from './ai';
 * import { MLOrchestrator } from './ml';
 * ```
 */

// Core MEV and Flashbots intelligence
export * from './mev-awareness';
export * from './flashbots';

// Re-export from AI module (Phase 3: Neural networks, RL agents, strategy evolution)
export * from '../ai';

// Re-export from AGI module (Memory core, neural bridge protocol)
export * from '../agi';

// Re-export from ML module (Data collection, feature extraction, pattern detection)
export * from '../ml';

// Re-export from Learning module (Knowledge loop, adaptive strategies)
export * from '../learning';
