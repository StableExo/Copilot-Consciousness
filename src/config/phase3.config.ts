/**
 * Phase 3 Configuration - Advanced AI & AEV Evolution
 *
 * Configuration for Phase 3 components including:
 * - AI learning agents (RL, NN, Evolution)
 * - Cross-chain intelligence
 * - Enhanced security
 * - Consciousness deepening
 *
 * See docs/PHASE3_ROADMAP.md for detailed component documentation
 */

export interface Phase3Config {
  ai: {
    rlAgent: {
      learningRate: number;
      discountFactor: number;
      explorationRate: number;
      minExplorationRate: number;
      explorationDecay: number;
      replayBufferSize: number;
      batchSize: number;
      enabled: boolean;
    };
    nnScorer: {
      hiddenLayerSize: number;
      learningRate: number;
      momentum: number;
      minConfidenceScore: number;
      batchSize: number;
      enabled: boolean;
    };
    evolution: {
      populationSize: number;
      generationSize: number;
      mutationRate: number;
      crossoverRate: number;
      elitismCount: number;
      minGenerations: number;
      convergenceThreshold: number;
      enabled: boolean;
    };
  };

  crossChain: {
    enabledChains: number[];
    updateInterval: number; // milliseconds
    minPriceDivergence: number; // e.g., 0.005 = 0.5%
    maxBridgingTime: number; // seconds
    minCrossChainProfit: number; // ETH
    enabled: boolean;
  };

  security: {
    bloodhound: {
      enableMLScoring: boolean;
      minConfidence: number;
      scanDepth: 'shallow' | 'deep';
      redactionPattern: 'full' | 'partial' | 'smart';
      enabled: boolean;
    };
    threatResponse: {
      autoRespond: boolean;
      responseDelay: number; // milliseconds
      requireOperatorApproval: boolean;
      enabled: boolean;
    };
    patternLearner: {
      minOccurrencesForPattern: number;
      patternTimeWindow: number; // milliseconds (24h default)
      enableAutomaticLearning: boolean;
      enabled: boolean;
    };
  };

  consciousness: {
    learningRate: number;
    maxHistorySize: number;
    maxEpisodesStored: number;
    reflectionInterval: number; // milliseconds (1h default)
    enableEpisodicMemory: boolean;
    enableAdversarialRecognition: boolean;
    enableSelfReflection: boolean;
  };
}

/**
 * Default Phase 3 Configuration
 *
 * Balanced settings for production use. Can be overridden via environment
 * variables or configuration updates.
 */
export const defaultPhase3Config: Phase3Config = {
  ai: {
    rlAgent: {
      learningRate: 0.1,
      discountFactor: 0.95,
      explorationRate: 0.3,
      minExplorationRate: 0.05,
      explorationDecay: 0.995,
      replayBufferSize: 10000,
      batchSize: 32,
      enabled: true,
    },
    nnScorer: {
      hiddenLayerSize: 16,
      learningRate: 0.01,
      momentum: 0.9,
      minConfidenceScore: 0.7,
      batchSize: 32,
      enabled: true,
    },
    evolution: {
      populationSize: 20,
      generationSize: 5,
      mutationRate: 0.3,
      crossoverRate: 0.5,
      elitismCount: 2,
      minGenerations: 10,
      convergenceThreshold: 0.95,
      enabled: true,
    },
  },

  crossChain: {
    enabledChains: [1, 8453, 42161, 10], // Ethereum, Base, Arbitrum, Optimism
    updateInterval: 15000, // 15 seconds
    minPriceDivergence: 0.005, // 0.5%
    maxBridgingTime: 600, // 10 minutes
    minCrossChainProfit: 0.01, // 0.01 ETH minimum
    enabled: false, // Disabled by default, enable when ready
  },

  security: {
    bloodhound: {
      enableMLScoring: true,
      minConfidence: 0.7,
      scanDepth: 'deep',
      redactionPattern: 'smart',
      enabled: true,
    },
    threatResponse: {
      autoRespond: true,
      responseDelay: 1000, // 1 second validation delay
      requireOperatorApproval: false,
      enabled: true,
    },
    patternLearner: {
      minOccurrencesForPattern: 3,
      patternTimeWindow: 86400000, // 24 hours
      enableAutomaticLearning: true,
      enabled: true,
    },
  },

  consciousness: {
    learningRate: 0.05,
    maxHistorySize: 1000,
    maxEpisodesStored: 5000,
    reflectionInterval: 3600000, // 1 hour
    enableEpisodicMemory: true,
    enableAdversarialRecognition: true,
    enableSelfReflection: true,
  },
};

/**
 * Load Phase 3 configuration from environment variables
 *
 * Allows overriding default configuration via env vars:
 * - PHASE3_AI_ENABLED=true/false
 * - PHASE3_CROSSCHAIN_ENABLED=true/false
 * - PHASE3_SECURITY_ENABLED=true/false
 * etc.
 */
export function loadPhase3Config(): Phase3Config {
  const config = { ...defaultPhase3Config };

  // AI configuration overrides
  if (process.env.PHASE3_AI_ENABLED !== undefined) {
    const enabled = process.env.PHASE3_AI_ENABLED === 'true';
    config.ai.rlAgent.enabled = enabled;
    config.ai.nnScorer.enabled = enabled;
    config.ai.evolution.enabled = enabled;
  }

  if (process.env.PHASE3_RL_LEARNING_RATE) {
    config.ai.rlAgent.learningRate = parseFloat(process.env.PHASE3_RL_LEARNING_RATE);
  }

  if (process.env.PHASE3_NN_CONFIDENCE) {
    config.ai.nnScorer.minConfidenceScore = parseFloat(process.env.PHASE3_NN_CONFIDENCE);
  }

  // Cross-chain configuration overrides
  if (process.env.PHASE3_CROSSCHAIN_ENABLED !== undefined) {
    config.crossChain.enabled = process.env.PHASE3_CROSSCHAIN_ENABLED === 'true';
  }

  if (process.env.PHASE3_CROSSCHAIN_CHAINS) {
    config.crossChain.enabledChains = process.env.PHASE3_CROSSCHAIN_CHAINS.split(',').map((id) =>
      parseInt(id.trim())
    );
  }

  // Security configuration overrides
  if (process.env.PHASE3_SECURITY_ENABLED !== undefined) {
    const enabled = process.env.PHASE3_SECURITY_ENABLED === 'true';
    config.security.bloodhound.enabled = enabled;
    config.security.threatResponse.enabled = enabled;
    config.security.patternLearner.enabled = enabled;
  }

  if (process.env.PHASE3_SECURITY_AUTO_RESPOND !== undefined) {
    config.security.threatResponse.autoRespond =
      process.env.PHASE3_SECURITY_AUTO_RESPOND === 'true';
  }

  // Consciousness configuration overrides
  if (process.env.PHASE3_EPISODIC_MEMORY !== undefined) {
    config.consciousness.enableEpisodicMemory = process.env.PHASE3_EPISODIC_MEMORY === 'true';
  }

  if (process.env.PHASE3_REFLECTION_INTERVAL) {
    config.consciousness.reflectionInterval = parseInt(process.env.PHASE3_REFLECTION_INTERVAL);
  }

  return config;
}

/**
 * Validate Phase 3 configuration
 *
 * Ensures configuration values are within acceptable ranges
 */
export function validatePhase3Config(config: Phase3Config): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate AI configuration
  if (config.ai.rlAgent.learningRate <= 0 || config.ai.rlAgent.learningRate > 1) {
    errors.push('RL learning rate must be between 0 and 1');
  }

  if (config.ai.rlAgent.discountFactor <= 0 || config.ai.rlAgent.discountFactor > 1) {
    errors.push('RL discount factor must be between 0 and 1');
  }

  if (config.ai.nnScorer.minConfidenceScore < 0 || config.ai.nnScorer.minConfidenceScore > 1) {
    errors.push('NN confidence score must be between 0 and 1');
  }

  // Validate cross-chain configuration
  if (config.crossChain.minPriceDivergence <= 0) {
    errors.push('Minimum price divergence must be positive');
  }

  if (config.crossChain.enabledChains.length === 0) {
    errors.push('At least one chain must be enabled for cross-chain intelligence');
  }

  // Validate security configuration
  if (
    config.security.bloodhound.minConfidence < 0 ||
    config.security.bloodhound.minConfidence > 1
  ) {
    errors.push('Bloodhound confidence must be between 0 and 1');
  }

  if (config.security.patternLearner.minOccurrencesForPattern < 1) {
    errors.push('Minimum pattern occurrences must be at least 1');
  }

  // Validate consciousness configuration
  if (config.consciousness.learningRate <= 0 || config.consciousness.learningRate > 1) {
    errors.push('Consciousness learning rate must be between 0 and 1');
  }

  if (config.consciousness.maxEpisodesStored < 100) {
    errors.push('Maximum episodes stored should be at least 100 for meaningful learning');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get configuration summary for logging
 */
export function getPhase3ConfigSummary(config: Phase3Config): string {
  const lines = [
    '=== Phase 3 Configuration ===',
    '',
    'AI Components:',
    `  RL Agent: ${config.ai.rlAgent.enabled ? 'ENABLED' : 'DISABLED'}`,
    `  NN Scorer: ${config.ai.nnScorer.enabled ? 'ENABLED' : 'DISABLED'}`,
    `  Evolution: ${config.ai.evolution.enabled ? 'ENABLED' : 'DISABLED'}`,
    '',
    'Cross-Chain Intelligence:',
    `  Status: ${config.crossChain.enabled ? 'ENABLED' : 'DISABLED'}`,
    `  Chains: ${config.crossChain.enabledChains.join(', ')}`,
    '',
    'Security:',
    `  Bloodhound: ${config.security.bloodhound.enabled ? 'ENABLED' : 'DISABLED'}`,
    `  Threat Response: ${config.security.threatResponse.enabled ? 'ENABLED' : 'DISABLED'}`,
    `  Pattern Learner: ${config.security.patternLearner.enabled ? 'ENABLED' : 'DISABLED'}`,
    '',
    'Consciousness:',
    `  Episodic Memory: ${config.consciousness.enableEpisodicMemory ? 'ENABLED' : 'DISABLED'}`,
    `  Adversarial Recognition: ${
      config.consciousness.enableAdversarialRecognition ? 'ENABLED' : 'DISABLED'
    }`,
    `  Self-Reflection: ${config.consciousness.enableSelfReflection ? 'ENABLED' : 'DISABLED'}`,
    '',
    '============================',
  ];

  return lines.join('\n');
}
