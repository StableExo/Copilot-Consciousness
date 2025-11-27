/**
 * Consciousness Module
 *
 * Provides consciousness framework components including:
 * - Memory system with emotional context
 * - Core consciousness framework
 * - Type definitions
 * - ArbitrageConsciousness with Identity Core integration
 * - Sensory memory and temporal awareness
 */

export * from './memory';
export * from './core';
export * from './types';
export { SensoryMemory } from './sensory_memory';
export { TemporalAwarenessFramework } from './temporal_awareness';
export { ArbitrageConsciousness } from './ArbitrageConsciousness';
export {
  ArbitrageConsciousnessWithIdentity,
  createEnhancedArbitrageConsciousness,
  type EnhancedOpportunity,
} from './ArbitrageConsciousnessIntegration';
