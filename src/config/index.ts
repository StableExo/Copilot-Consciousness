import { SystemConfig } from '../types';

// Export addresses configuration
export * from './addresses';

// Export Zod-based environment schema validation
export * from './env-schema';

// Export cross-chain configuration
export * from './cross-chain.config';
export { default as DEFAULT_CROSS_CHAIN_CONFIG } from './cross-chain.config';

// Export gas configuration
export * from './gas.config';

// Export realtime configuration
export * from './realtime.config';

// Export advanced arbitrage configuration
export * from './advanced-arbitrage.config';

// Export ML configuration
export * from './ml.config';

/**
 * Default system configuration
 */
export const defaultConfig: SystemConfig = {
  memory: {
    shortTermCapacity: 100,
    workingMemoryCapacity: 7, // Miller's law: 7±2
    longTermCompressionThreshold: 3, // Access count threshold
    retentionPeriods: {
      sensory: 1000, // 1 second
      shortTerm: 300000, // 5 minutes
      working: 600000, // 10 minutes
    },
    consolidationInterval: 60000, // 1 minute
  },
  temporal: {
    clockResolution: 100, // 100ms
    eventBufferSize: 1000,
    timePerceptionWindow: 3600000, // 1 hour
    enablePredictiveModeling: true,
  },
  cognitive: {
    learningRate: 0.1,
    reasoningDepth: 5,
    selfAwarenessLevel: 0.7,
    reflectionInterval: 300000, // 5 minutes
    adaptationThreshold: 0.5,
  },
  gemini: {
    model: 'gemini-pro',
    maxTokens: 2048,
    temperature: 0.7,
    enableCitadelMode: false,
  },
};

/**
 * Create a custom configuration by merging with defaults
 */
export function createConfig(overrides: Partial<SystemConfig> = {}): SystemConfig {
  return {
    memory: { ...defaultConfig.memory, ...overrides.memory },
    temporal: { ...defaultConfig.temporal, ...overrides.temporal },
    cognitive: { ...defaultConfig.cognitive, ...overrides.cognitive },
    gemini: { ...defaultConfig.gemini, ...overrides.gemini },
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: SystemConfig): boolean {
  // Memory validation
  if (config.memory.shortTermCapacity < 1) return false;
  if (config.memory.workingMemoryCapacity < 1) return false;
  if (config.memory.longTermCompressionThreshold < 1) return false;

  // Temporal validation
  if (config.temporal.clockResolution < 10) return false;
  if (config.temporal.eventBufferSize < 1) return false;
  if (config.temporal.timePerceptionWindow < 1000) return false;

  // Cognitive validation
  if (config.cognitive.learningRate < 0 || config.cognitive.learningRate > 1) return false;
  if (config.cognitive.reasoningDepth < 1) return false;
  if (config.cognitive.selfAwarenessLevel < 0 || config.cognitive.selfAwarenessLevel > 1)
    return false;
  if (config.cognitive.adaptationThreshold < 0 || config.cognitive.adaptationThreshold > 1)
    return false;

  // Gemini validation
  if (config.gemini.maxTokens < 1) return false;
  if (config.gemini.temperature < 0 || config.gemini.temperature > 2) return false;

  return true;
}
