/**
 * MLOrchestrator - Central orchestrator for ML system
 *
 * Coordinates all ML models, provides unified prediction interface,
 * and manages ensemble predictions with confidence scoring.
 */

import { EventEmitter } from 'events';
import { getMLConfig, MLConfig } from '../config/ml.config';
import { DataCollector } from './DataCollector';
import { FeatureExtractor } from './FeatureExtractor';
import { PatternDetector } from './PatternDetector';
import {
  EnhancedArbitragePath,
  MLPredictions,
  PriceForecast,
  VolatilityForecast,
  Pattern,
} from './types';
// InferenceRequest, InferenceResponse reserved for advanced inference features
import type {
  InferenceRequest as _InferenceRequest,
  InferenceResponse as _InferenceResponse,
} from './types';
import { ArbitragePath } from '../arbitrage/types';

export interface OrchestratorStats {
  predictionsCount: number;
  avgLatencyMs: number;
  cacheHitRate: number;
  modelsLoaded: {
    lstm: boolean;
    scorer: boolean;
    volatility: boolean;
  };
  lastPredictionTime: number;
}

/**
 * MLOrchestrator - Central ML system coordinator
 */
export class MLOrchestrator extends EventEmitter {
  private config: MLConfig;
  private dataCollector: DataCollector;
  private featureExtractor: FeatureExtractor;
  private patternDetector: PatternDetector;
  private predictionCache: Map<string, { predictions: MLPredictions; timestamp: number }> =
    new Map();
  private stats: OrchestratorStats;

  // Model loading flags
  private modelsLoaded: {
    lstm: boolean;
    scorer: boolean;
    volatility: boolean;
  } = {
    lstm: false,
    scorer: false,
    volatility: false,
  };

  constructor(config?: Partial<MLConfig>) {
    super();
    this.config = config ? { ...getMLConfig(), ...config } : getMLConfig();

    // Initialize components
    this.dataCollector = new DataCollector(this.config);
    this.featureExtractor = new FeatureExtractor();
    this.patternDetector = new PatternDetector();

    this.stats = {
      predictionsCount: 0,
      avgLatencyMs: 0,
      cacheHitRate: 0,
      modelsLoaded: { ...this.modelsLoaded },
      lastPredictionTime: 0,
    };
  }

  /**
   * Initialize ML system (load models, start data collection)
   */
  async initialize(): Promise<void> {
    console.log('[MLOrchestrator] Initializing ML system...');

    try {
      // Load models (placeholder - in production, load actual models)
      await this.loadModels();

      // Start data collection if enabled
      if (this.config.dataCollection.enabled) {
        this.dataCollector.start();
        console.log('[MLOrchestrator] Data collection started');
      }

      // Subscribe to data events
      this.dataCollector.on('data', (event) => {
        this.emit('data', event);
      });

      console.log('[MLOrchestrator] ML system initialized successfully');
      this.emit('initialized');
    } catch (error) {
      console.error('[MLOrchestrator] Initialization error:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Load ML models into memory
   */
  private async loadModels(): Promise<void> {
    console.log('[MLOrchestrator] Loading ML models...');

    // In production, this would:
    // 1. Load TensorFlow.js LSTM model
    // 2. Load scikit-learn Random Forest via REST API or Python bridge
    // 3. Load GARCH model

    // For now, mark as loaded (models will be created when needed)
    this.modelsLoaded.lstm = this.config.models.lstm.enabled;
    this.modelsLoaded.scorer = this.config.models.opportunityScorer.enabled;
    this.modelsLoaded.volatility = this.config.models.volatility.enabled;

    console.log('[MLOrchestrator] Models loaded:', this.modelsLoaded);
  }

  /**
   * Enhance arbitrage opportunity with ML predictions
   */
  async enhanceOpportunity(path: ArbitragePath): Promise<EnhancedArbitragePath> {
    const startTime = Date.now();

    try {
      // Check cache
      const cacheKey = this.getCacheKey(path);
      const cached = this.predictionCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.config.inference.cacheTTL) {
        this.updateStats(Date.now() - startTime, true);
        return {
          ...path,
          mlPredictions: cached.predictions,
        };
      }

      // Generate predictions
      const predictions = await this.generatePredictions(path);

      // Cache predictions
      this.predictionCache.set(cacheKey, {
        predictions,
        timestamp: Date.now(),
      });

      this.updateStats(Date.now() - startTime, false);

      return {
        ...path,
        mlPredictions: predictions,
      };
    } catch (error) {
      console.error('[MLOrchestrator] Enhancement error:', error);

      // Return path without ML predictions in fallback mode
      if (this.config.inference.fallbackMode === 'skip') {
        return path;
      }

      // Return with baseline predictions
      return {
        ...path,
        mlPredictions: this.getBaselinePredictions(),
      };
    }
  }

  /**
   * Generate ML predictions for a path
   */
  private async generatePredictions(path: ArbitragePath): Promise<MLPredictions> {
    const timestamp = Date.now();

    // Get price forecasts
    const priceForecasts = await this.predictPrices(path);

    // Get success probability
    const successProbability = await this.scoreOpportunity(path);

    // Get volatility forecast
    const volatilityForecast = await this.predictVolatility(path);

    // Find matching patterns
    const matchingPatterns = this.patternDetector.findMatchingPatterns(path, timestamp);

    // Calculate overall confidence
    const confidence = this.calculateConfidence(
      priceForecasts,
      successProbability,
      volatilityForecast,
      matchingPatterns
    );

    // Generate recommendation
    const recommendation = this.generateRecommendation(confidence, successProbability);

    return {
      priceForecasts,
      successProbability,
      volatilityForecast,
      matchingPatterns,
      confidence,
      recommendation,
      timestamp,
    };
  }

  /**
   * Predict future prices
   */
  async predictPrices(_path: ArbitragePath): Promise<PriceForecast[]> {
    if (!this.modelsLoaded.lstm) {
      return this.getDefaultPriceForecasts();
    }

    // In production, this would call the LSTM model
    // For now, return placeholder forecasts
    const horizons = this.config.models.lstm.predictionHorizons;

    return horizons.map((horizon) => ({
      horizon,
      predictedPrice: 1.0, // Placeholder
      confidence: 0.7,
      confidenceInterval: {
        lower: 0.98,
        upper: 1.02,
      },
    }));
  }

  /**
   * Score opportunity success probability
   */
  async scoreOpportunity(path: ArbitragePath): Promise<number> {
    if (!this.modelsLoaded.scorer) {
      return 0.5; // Neutral score
    }

    // Extract path features
    const _pathFeatures = this.featureExtractor.extractPathFeatures(path);

    // In production, this would call the Random Forest model
    // For now, use a simple heuristic
    let score = 0.5;

    // Higher profit -> higher score
    const profitScore = Math.min(Number(path.netProfit) / 1e18 / 10, 0.3);
    score += profitScore;

    // Fewer hops -> higher score
    const hopPenalty = (path.hops.length - 2) * 0.05;
    score -= hopPenalty;

    // Lower slippage -> higher score
    const slippageBonus = (1 - path.slippageImpact) * 0.2;
    score += slippageBonus;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Predict volatility
   */
  async predictVolatility(_path: ArbitragePath): Promise<VolatilityForecast> {
    if (!this.modelsLoaded.volatility) {
      return this.getDefaultVolatilityForecast();
    }

    // In production, this would call the GARCH model
    return {
      volatility: 0.02, // 2% volatility
      horizon: this.config.models.volatility.windowMinutes,
      confidenceBand: {
        lower: 0.015,
        upper: 0.025,
      },
    };
  }

  /**
   * Detect matching patterns
   */
  detectPatterns(path: ArbitragePath): Pattern[] {
    return this.patternDetector.findMatchingPatterns(path, Date.now());
  }

  /**
   * Calculate overall confidence score
   */
  calculateConfidence(
    priceForecasts: PriceForecast[],
    successProbability: number,
    volatilityForecast: VolatilityForecast,
    patterns: Pattern[]
  ): number {
    // Weighted ensemble
    const weights = {
      price: 0.3,
      scorer: 0.4,
      volatility: 0.2,
      patterns: 0.1,
    };

    // Price forecast confidence (average of all horizons)
    const priceConfidence =
      priceForecasts.length > 0
        ? priceForecasts.reduce((sum, f) => sum + f.confidence, 0) / priceForecasts.length
        : 0.5;

    // Success probability
    const scorerConfidence = successProbability;

    // Volatility confidence (inverse - lower volatility = higher confidence)
    const volatilityConfidence = Math.max(0, 1 - volatilityForecast.volatility * 10);

    // Pattern confidence (best matching pattern)
    const patternConfidence =
      patterns.length > 0 ? Math.max(...patterns.map((p) => p.confidence)) : 0.5;

    // Weighted average
    const confidence =
      priceConfidence * weights.price +
      scorerConfidence * weights.scorer +
      volatilityConfidence * weights.volatility +
      patternConfidence * weights.patterns;

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Generate execution recommendation
   */
  private generateRecommendation(
    confidence: number,
    successProbability: number
  ): 'EXECUTE' | 'SKIP' | 'QUEUE' {
    const threshold = this.config.models.opportunityScorer.confidenceThreshold;

    if (confidence >= 0.8 && successProbability >= threshold) {
      return 'EXECUTE';
    } else if (confidence >= 0.6 && successProbability >= threshold * 0.8) {
      return 'QUEUE';
    } else {
      return 'SKIP';
    }
  }

  /**
   * Get cache key for a path
   */
  private getCacheKey(path: ArbitragePath): string {
    const tokenKey = `${path.startToken}-${path.endToken}`;
    const hopsKey = path.hops.map((h) => h.poolAddress).join('-');
    return `${tokenKey}-${hopsKey}`;
  }

  /**
   * Get baseline predictions (fallback)
   */
  private getBaselinePredictions(): MLPredictions {
    return {
      priceForecasts: this.getDefaultPriceForecasts(),
      successProbability: 0.5,
      volatilityForecast: this.getDefaultVolatilityForecast(),
      matchingPatterns: [],
      confidence: 0.5,
      recommendation: 'QUEUE',
      timestamp: Date.now(),
    };
  }

  /**
   * Get default price forecasts
   */
  private getDefaultPriceForecasts(): PriceForecast[] {
    return [
      {
        horizon: 5,
        predictedPrice: 1.0,
        confidence: 0.5,
        confidenceInterval: { lower: 0.95, upper: 1.05 },
      },
    ];
  }

  /**
   * Get default volatility forecast
   */
  private getDefaultVolatilityForecast(): VolatilityForecast {
    return {
      volatility: 0.02,
      horizon: 5,
      confidenceBand: { lower: 0.015, upper: 0.025 },
    };
  }

  /**
   * Update statistics
   */
  private updateStats(latencyMs: number, cached: boolean): void {
    this.stats.predictionsCount++;
    this.stats.lastPredictionTime = Date.now();

    // Update average latency
    const alpha = 0.1; // Exponential moving average factor
    this.stats.avgLatencyMs = this.stats.avgLatencyMs * (1 - alpha) + latencyMs * alpha;

    // Update cache hit rate
    if (cached) {
      const cacheHits = this.stats.cacheHitRate * (this.stats.predictionsCount - 1) + 1;
      this.stats.cacheHitRate = cacheHits / this.stats.predictionsCount;
    } else {
      this.stats.cacheHitRate =
        (this.stats.cacheHitRate * (this.stats.predictionsCount - 1)) / this.stats.predictionsCount;
    }
  }

  /**
   * Get orchestrator statistics
   */
  getStats(): OrchestratorStats {
    return {
      ...this.stats,
      modelsLoaded: { ...this.modelsLoaded },
    };
  }

  /**
   * Get data collector
   */
  getDataCollector(): DataCollector {
    return this.dataCollector;
  }

  /**
   * Get pattern detector
   */
  getPatternDetector(): PatternDetector {
    return this.patternDetector;
  }

  /**
   * Clear prediction cache
   */
  clearCache(): void {
    this.predictionCache.clear();
  }

  /**
   * Shutdown ML system
   */
  async shutdown(): Promise<void> {
    console.log('[MLOrchestrator] Shutting down ML system...');
    this.dataCollector.stop();
    this.clearCache();
    this.emit('shutdown');
  }
}
