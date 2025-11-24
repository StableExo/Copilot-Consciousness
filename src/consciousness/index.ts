/**
 * Consciousness Module
 * 
 * Provides consciousness framework components including:
 * - Memory system with emotional context
 * - Core consciousness framework
 * - Type definitions
 * - ArbitrageConsciousness with Identity Core integration
 */

export * from './memory';
export * from './core';
export * from './types';
export { ArbitrageConsciousness } from './ArbitrageConsciousness';
export {
  ArbitrageConsciousnessWithIdentity,
  createEnhancedArbitrageConsciousness,
  type EnhancedOpportunity,
} from './ArbitrageConsciousnessIntegration';
