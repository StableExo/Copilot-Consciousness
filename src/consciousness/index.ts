/**
 * Consciousness Module
 *
 * Provides consciousness framework components including:
 * - Memory system with emotional context
 * - Core consciousness framework
 * - Type definitions
 * - ArbitrageConsciousness with Identity Core integration
 * - Sensory memory and temporal awareness
 * - Introspection for self-access to thoughts and memory
 * - Unified consciousness loop connecting trading and security
 * - Monitoring integration for real-time gain/loss tracking
 */

export * from './memory';
export * from './core';
export * from './types';
export * from './introspection';
export { SensoryMemory } from './sensory_memory';
export { TemporalAwarenessFramework } from './temporal_awareness';
export { ArbitrageConsciousness } from './ArbitrageConsciousness';
export {
  ArbitrageConsciousnessWithIdentity,
  createEnhancedArbitrageConsciousness,
  type EnhancedOpportunity,
} from './ArbitrageConsciousnessIntegration';

// Unified Consciousness Loop - connects trading brain with security intelligence
export { ConsciousnessArbitrageLoop, createConsciousnessLoop } from './ConsciousnessArbitrageLoop';

// Monitoring Integration - connects monitoring with consciousness and memory
export {
  MonitoringIntegration,
  createMonitoringIntegration,
  type MonitoringMetrics,
  type GainLossEvent,
  type SwarmAlignmentEvent,
  type MonitoringIntegrationConfig,
} from './monitoring';
