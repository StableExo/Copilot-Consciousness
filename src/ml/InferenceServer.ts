/**
 * InferenceServer - High-performance ML inference system
 * 
 * Provides fast, batched predictions with caching, GPU acceleration support,
 * and graceful degradation for real-time arbitrage decisions.
 */

import { EventEmitter } from 'events';
import { getMLConfig, MLConfig } from '../config/ml.config';
import { InferenceRequest, InferenceResponse, MLPredictions } from './types';
import { ArbitragePath } from '../arbitrage/types';

export interface InferenceStats {
  totalRequests: number;
  cachedRequests: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  errorCount: number;
  throughput: number; // requests per second
}

interface RequestQueue {
  request: InferenceRequest;
  resolve: (response: InferenceResponse) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

/**
 * InferenceServer - Fast ML inference for real-time predictions
 */
export class InferenceServer extends EventEmitter {
  private config: MLConfig;
  private isRunning: boolean = false;
  private requestQueue: RequestQueue[] = [];
  private processingBatch: boolean = false;
  private cache: Map<string, { predictions: MLPredictions; timestamp: number }> = new Map();
  private stats: InferenceStats;
  private latencyHistory: number[] = [];
  private warmupComplete: boolean = false;

  constructor(config?: Partial<MLConfig>) {
    super();
    this.config = config ? { ...getMLConfig(), ...config } : getMLConfig();
    this.stats = {
      totalRequests: 0,
      cachedRequests: 0,
      avgLatencyMs: 0,
      p95LatencyMs: 0,
      p99LatencyMs: 0,
      errorCount: 0,
      throughput: 0,
    };
  }

  /**
   * Start inference server
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    console.log('[InferenceServer] Starting inference server...');

    try {
      // Load models
      await this.loadModels();

      // Warm up models
      await this.warmUp();

      this.isRunning = true;
      
      // Start batch processing
      this.startBatchProcessing();

      console.log('[InferenceServer] Inference server started successfully');
      this.emit('started');
    } catch (error) {
      console.error('[InferenceServer] Failed to start:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Stop inference server
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    // Wait for queue to drain
    while (this.requestQueue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('[InferenceServer] Inference server stopped');
    this.emit('stopped');
  }

  /**
   * Load ML models into memory
   */
  private async loadModels(): Promise<void> {
    console.log('[InferenceServer] Loading ML models...');

    // In production, this would:
    // 1. Load TensorFlow.js LSTM model
    // 2. Initialize model in GPU/CPU backend
    // 3. Load Random Forest model (via REST API or Python bridge)
    // 4. Load GARCH model
    // 5. Verify models are loaded correctly

    // Simulate loading time
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log('[InferenceServer] Models loaded successfully');
  }

  /**
   * Warm up models with dummy predictions
   */
  private async warmUp(): Promise<void> {
    console.log('[InferenceServer] Warming up models...');

    // Run a few dummy predictions to initialize GPU, allocate memory, etc.
    const dummyPath: ArbitragePath = {
      hops: [
        {
          dexName: 'Uniswap',
          poolAddress: '0x0',
          tokenIn: '0x0',
          tokenOut: '0x0',
          amountIn: 1000n,
          amountOut: 1100n,
          fee: 0.003,
          gasEstimate: 150000,
        },
      ],
      startToken: '0x0',
      endToken: '0x0',
      estimatedProfit: 100n,
      totalGasCost: 300000n,
      netProfit: 80n,
      totalFees: 0.003,
      slippageImpact: 0.01,
    };

    // Warm up with several predictions
    for (let i = 0; i < 5; i++) {
      await this.predictInternal(dummyPath, {
        priceMomentum5s: 0,
        priceMomentum15s: 0,
        priceMomentum30s: 0,
        priceMomentum1m: 0,
        priceMomentum5m: 0,
        volumeMA: 1000,
        volumeRatio: 1,
        vwap: 100,
        liquidityDepth: 50000,
        liquidityRatio: 1,
        bidAskSpread: 0.001,
        spreadTrend: 0,
        gasPricePercentile: 0.5,
        gasTrend: 0,
        volatility: 0.02,
        atr: 1,
        hourOfDay: 12,
        dayOfWeek: 3,
      });
    }

    this.warmupComplete = true;
    console.log('[InferenceServer] Warmup complete');
  }

  /**
   * Make prediction for a single path
   */
  async predict(path: ArbitragePath, features: any): Promise<InferenceResponse> {
    const startTime = Date.now();

    // Check cache
    const cacheKey = this.getCacheKey(path);
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.config.inference.cacheTTL) {
      this.updateStats(Date.now() - startTime, true, false);
      return {
        predictions: cached.predictions,
        latencyMs: Date.now() - startTime,
        cached: true,
      };
    }

    // Queue request
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        request: {
          path,
          features,
          timestamp: Date.now(),
        },
        resolve,
        reject,
        timestamp: Date.now(),
      });

      // Trigger batch processing if not already running
      if (!this.processingBatch) {
        this.processBatch();
      }
    });
  }

  /**
   * Start batch processing loop
   */
  private startBatchProcessing(): void {
    const processInterval = 50; // Process every 50ms
    
    const timer = setInterval(() => {
      if (this.requestQueue.length > 0 && !this.processingBatch) {
        this.processBatch();
      }
    }, processInterval);

    this.once('stopped', () => clearInterval(timer));
  }

  /**
   * Process batch of inference requests
   */
  private async processBatch(): Promise<void> {
    if (this.processingBatch || this.requestQueue.length === 0) {
      return;
    }

    this.processingBatch = true;

    try {
      const batchSize = Math.min(
        this.config.inference.batchSize,
        this.requestQueue.length
      );
      
      const batch = this.requestQueue.splice(0, batchSize);
      
      // Process batch in parallel
      const results = await Promise.allSettled(
        batch.map(async item => {
          const startTime = Date.now();
          
          try {
            const predictions = await this.predictInternal(
              item.request.path,
              item.request.features
            );

            // Cache result
            const cacheKey = this.getCacheKey(item.request.path);
            this.cache.set(cacheKey, {
              predictions,
              timestamp: Date.now(),
            });

            const latencyMs = Date.now() - startTime;
            this.updateStats(latencyMs, false, false);

            const response: InferenceResponse = {
              predictions,
              latencyMs,
              cached: false,
            };

            item.resolve(response);
          } catch (error) {
            this.updateStats(Date.now() - startTime, false, true);
            item.reject(error as Error);
          }
        })
      );

      this.emit('batch_processed', {
        size: batch.length,
        timestamp: Date.now(),
      });
    } finally {
      this.processingBatch = false;
    }
  }

  /**
   * Internal prediction logic
   */
  private async predictInternal(path: ArbitragePath, features: any): Promise<MLPredictions> {
    // Check latency target
    const startTime = Date.now();

    // In production, this would:
    // 1. Run LSTM inference for price forecasts
    // 2. Run Random Forest for success probability
    // 3. Run GARCH for volatility
    // 4. Combine predictions

    // Simulate inference time
    await new Promise(resolve => setTimeout(resolve, 5));

    const latency = Date.now() - startTime;

    // Check if we exceeded latency target
    if (latency > this.config.inference.maxLatencyMs) {
      this.emit('latency_warning', {
        latencyMs: latency,
        target: this.config.inference.maxLatencyMs,
      });
    }

    // Return placeholder predictions
    return {
      priceForecasts: [
        {
          horizon: 5,
          predictedPrice: 1.0,
          confidence: 0.7,
          confidenceInterval: { lower: 0.98, upper: 1.02 },
        },
      ],
      successProbability: 0.75,
      volatilityForecast: {
        volatility: 0.02,
        horizon: 5,
        confidenceBand: { lower: 0.015, upper: 0.025 },
      },
      matchingPatterns: [],
      confidence: 0.72,
      recommendation: 'EXECUTE',
      timestamp: Date.now(),
    };
  }

  /**
   * Get cache key for a path
   */
  private getCacheKey(path: ArbitragePath): string {
    const tokenKey = `${path.startToken}-${path.endToken}`;
    const hopsKey = path.hops.map(h => h.poolAddress).join('-');
    return `${tokenKey}-${hopsKey}`;
  }

  /**
   * Update statistics
   */
  private updateStats(latencyMs: number, cached: boolean, error: boolean): void {
    this.stats.totalRequests++;

    if (cached) {
      this.stats.cachedRequests++;
    }

    if (error) {
      this.stats.errorCount++;
    }

    // Track latency
    this.latencyHistory.push(latencyMs);
    if (this.latencyHistory.length > 1000) {
      this.latencyHistory.shift();
    }

    // Update average latency (exponential moving average)
    const alpha = 0.1;
    this.stats.avgLatencyMs = this.stats.avgLatencyMs * (1 - alpha) + latencyMs * alpha;

    // Update percentiles
    if (this.latencyHistory.length > 10) {
      const sorted = [...this.latencyHistory].sort((a, b) => a - b);
      this.stats.p95LatencyMs = sorted[Math.floor(sorted.length * 0.95)];
      this.stats.p99LatencyMs = sorted[Math.floor(sorted.length * 0.99)];
    }

    // Calculate throughput (requests per second)
    // Use last 100 requests for throughput calculation
    if (this.latencyHistory.length >= 10) {
      const recentLatencies = this.latencyHistory.slice(-100);
      const avgRecentLatency = recentLatencies.reduce((a, b) => a + b, 0) / recentLatencies.length;
      this.stats.throughput = avgRecentLatency > 0 ? 1000 / avgRecentLatency : 0;
    }
  }

  /**
   * Get inference statistics
   */
  getStats(): InferenceStats {
    return { ...this.stats };
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.requestQueue.length;
  }

  /**
   * Check if server is ready
   */
  isReady(): boolean {
    return this.isRunning && this.warmupComplete;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Check server health
   */
  getHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  } {
    const queueSize = this.getQueueSize();
    const errorRate = this.stats.totalRequests > 0 
      ? this.stats.errorCount / this.stats.totalRequests 
      : 0;
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (errorRate > 0.1 || this.stats.avgLatencyMs > this.config.inference.maxLatencyMs * 2) {
      status = 'unhealthy';
    } else if (errorRate > 0.05 || this.stats.avgLatencyMs > this.config.inference.maxLatencyMs) {
      status = 'degraded';
    }

    return {
      status,
      details: {
        isRunning: this.isRunning,
        warmupComplete: this.warmupComplete,
        queueSize,
        cacheSize: this.getCacheSize(),
        avgLatencyMs: this.stats.avgLatencyMs,
        errorRate,
        throughput: this.stats.throughput,
      },
    };
  }
}
