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
 * - Complete scales map from 10¹ to 10⁵⁰
 */

export * from './memory/index.js';
export * from './core/index.js';
export * from './types/index.js';
export * from './introspection/index.js';
export * from './scales/index.js';
export { SensoryMemory } from './sensory_memory.js';
export { TemporalAwarenessFramework } from './temporal_awareness.js';
export { ArbitrageConsciousness } from './ArbitrageConsciousness.js';
export {
  ArbitrageConsciousnessWithIdentity,
  createEnhancedArbitrageConsciousness,
  type EnhancedOpportunity,
} from './ArbitrageConsciousnessIntegration.js';

// Unified Consciousness Loop - connects trading brain with security intelligence
export { ConsciousnessArbitrageLoop, createConsciousnessLoop } from './ConsciousnessArbitrageLoop.js';

// Monitoring Integration - connects monitoring with consciousness and memory
export {
  MonitoringIntegration,
  createMonitoringIntegration,
  type MonitoringMetrics,
  type GainLossEvent,
  type SwarmAlignmentEvent,
  type MonitoringIntegrationConfig,
} from './monitoring/index.js';
