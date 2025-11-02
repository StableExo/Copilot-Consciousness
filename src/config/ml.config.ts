/**
 * Machine Learning Configuration
 * 
 * Configuration for ML-powered prediction system including data collection,
 * model settings, inference parameters, and training configuration.
 */

export interface MLConfig {
  dataCollection: DataCollectionConfig;
  models: ModelsConfig;
  inference: InferenceConfig;
  training: TrainingConfig;
  storage: StorageConfig;
}

export interface DataCollectionConfig {
  enabled: boolean;
  interval: number; // milliseconds
  historicalDays: number;
  features: string[];
  batchSize: number;
  retentionDays: number;
}

export interface ModelsConfig {
  lstm: LSTMConfig;
  opportunityScorer: OpportunityScorerConfig;
  volatility: VolatilityConfig;
}

export interface LSTMConfig {
  enabled: boolean;
  sequenceLength: number;
  predictionHorizons: number[]; // seconds
  retrainInterval: number; // milliseconds
  modelPath: string;
  minTrainingSamples: number;
}

export interface OpportunityScorerConfig {
  enabled: boolean;
  confidenceThreshold: number; // 0-1
  retrainInterval: number; // milliseconds
  modelPath: string;
  minTrainingSamples: number;
}

export interface VolatilityConfig {
  enabled: boolean;
  windowMinutes: number;
  modelPath: string;
}

export interface InferenceConfig {
  maxLatencyMs: number;
  batchSize: number;
  useGPU: boolean;
  cacheTTL: number; // milliseconds
  fallbackMode: 'skip' | 'baseline';
}

export interface TrainingConfig {
  validationSplit: number;
  earlyStoppingPatience: number;
  learningRate: number;
  batchSize: number;
  maxEpochs: number;
  testSplit: number;
}

export interface StorageConfig {
  redis: {
    enabled: boolean;
    host: string;
    port: number;
    ttl: number;
  };
  timeseries: {
    enabled: boolean;
    type: 'timescaledb' | 'influxdb' | 'memory';
    connectionString?: string;
  };
  models: {
    basePath: string;
    versioning: boolean;
    maxVersions: number;
  };
}

/**
 * Default ML configuration
 */
export const mlConfig: MLConfig = {
  dataCollection: {
    enabled: true,
    interval: 5000, // 5 seconds
    historicalDays: 30,
    features: ['price', 'volume', 'liquidity', 'gas', 'volatility', 'spread'],
    batchSize: 100,
    retentionDays: 90,
  },
  models: {
    lstm: {
      enabled: true,
      sequenceLength: 60, // 60 data points (5 minutes at 5s intervals)
      predictionHorizons: [5, 10, 15, 30], // seconds
      retrainInterval: 86400000, // 24 hours
      modelPath: './models/lstm',
      minTrainingSamples: 1000,
    },
    opportunityScorer: {
      enabled: true,
      confidenceThreshold: 0.7,
      retrainInterval: 604800000, // 7 days
      modelPath: './models/opportunity_scorer',
      minTrainingSamples: 500,
    },
    volatility: {
      enabled: true,
      windowMinutes: 5,
      modelPath: './models/volatility',
    },
  },
  inference: {
    maxLatencyMs: 100,
    batchSize: 10,
    useGPU: false,
    cacheTTL: 1000, // 1 second
    fallbackMode: 'baseline',
  },
  training: {
    validationSplit: 0.2,
    earlyStoppingPatience: 10,
    learningRate: 0.001,
    batchSize: 32,
    maxEpochs: 100,
    testSplit: 0.1,
  },
  storage: {
    redis: {
      enabled: false, // Disabled by default
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      ttl: 3600, // 1 hour
    },
    timeseries: {
      enabled: true,
      type: 'memory', // Start with in-memory storage
      connectionString: process.env.TIMESERIES_CONNECTION_STRING,
    },
    models: {
      basePath: process.env.ML_MODELS_PATH || './models',
      versioning: true,
      maxVersions: 5,
    },
  },
};

/**
 * Get ML configuration with environment overrides
 */
export function getMLConfig(): MLConfig {
  return {
    ...mlConfig,
    dataCollection: {
      ...mlConfig.dataCollection,
      enabled: process.env.ML_DATA_COLLECTION_ENABLED !== 'false',
      interval: parseInt(process.env.ML_DATA_INTERVAL || String(mlConfig.dataCollection.interval)),
    },
    models: {
      ...mlConfig.models,
      lstm: {
        ...mlConfig.models.lstm,
        enabled: process.env.ML_LSTM_ENABLED !== 'false',
      },
      opportunityScorer: {
        ...mlConfig.models.opportunityScorer,
        enabled: process.env.ML_SCORER_ENABLED !== 'false',
        confidenceThreshold: parseFloat(
          process.env.ML_CONFIDENCE_THRESHOLD || 
          String(mlConfig.models.opportunityScorer.confidenceThreshold)
        ),
      },
      volatility: {
        ...mlConfig.models.volatility,
        enabled: process.env.ML_VOLATILITY_ENABLED !== 'false',
      },
    },
    inference: {
      ...mlConfig.inference,
      useGPU: process.env.ML_USE_GPU === 'true',
    },
  };
}

/**
 * Validate ML configuration
 */
export function validateMLConfig(config: MLConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate data collection
  if (config.dataCollection.interval < 1000) {
    errors.push('Data collection interval must be at least 1000ms');
  }
  if (config.dataCollection.historicalDays < 1) {
    errors.push('Historical days must be at least 1');
  }

  // Validate model configs
  if (config.models.lstm.sequenceLength < 10) {
    errors.push('LSTM sequence length must be at least 10');
  }
  if (config.models.opportunityScorer.confidenceThreshold < 0 || 
      config.models.opportunityScorer.confidenceThreshold > 1) {
    errors.push('Confidence threshold must be between 0 and 1');
  }

  // Validate inference config
  if (config.inference.maxLatencyMs < 10) {
    errors.push('Max inference latency must be at least 10ms');
  }
  if (config.inference.batchSize < 1) {
    errors.push('Inference batch size must be at least 1');
  }

  // Validate training config
  if (config.training.validationSplit < 0 || config.training.validationSplit > 0.5) {
    errors.push('Validation split must be between 0 and 0.5');
  }
  if (config.training.learningRate <= 0 || config.training.learningRate > 0.1) {
    errors.push('Learning rate must be between 0 and 0.1');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
