/**
 * RPCManager - Advanced Rate Limiting with p-queue
 * 
 * Implements the "Regulator" pattern from AxionCitadel for production-grade
 * RPC rate limiting. Each RPC endpoint gets its own queue with configurable
 * concurrency and rate limits.
 */

import PQueue from 'p-queue';
import pino from 'pino';

const logger = pino({
  name: 'RPCManager',
  level: process.env.LOG_LEVEL || 'info'
});

export interface RPCQueueConfig {
  concurrency: number;      // Max concurrent requests
  interval: number;          // Time window (ms)
  intervalCap: number;       // Max requests per interval
  timeout: number;           // Request timeout (ms)
  throwOnTimeout: boolean;   // Whether to throw on timeout
}

export interface RPCManagerConfig {
  defaultConfig?: Partial<RPCQueueConfig>;
  perEndpointConfig?: Map<string, Partial<RPCQueueConfig>>;
}

/**
 * Default queue configuration for RPC endpoints
 */
const DEFAULT_QUEUE_CONFIG: RPCQueueConfig = {
  concurrency: 10,           // Max concurrent requests
  interval: 1000,            // Time window (1 second)
  intervalCap: 50,           // Max 50 requests per second
  timeout: 30000,            // 30 second timeout
  throwOnTimeout: true
};

/**
 * RPCManager manages rate-limited RPC calls using p-queue
 * 
 * Features:
 * - Per-endpoint queuing
 * - Configurable rate limits
 * - Request timeout handling
 * - Metrics tracking
 */
export class RPCManager {
  private queues: Map<string, PQueue>;
  private configs: Map<string, RPCQueueConfig>;
  private metrics: Map<string, {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    timeouts: number;
    avgLatency: number;
    lastRequestTime: number;
  }>;

  constructor(config?: RPCManagerConfig) {
    this.queues = new Map();
    this.configs = new Map();
    this.metrics = new Map();

    // Initialize default config
    if (config?.defaultConfig) {
      const defaultConfig = { ...DEFAULT_QUEUE_CONFIG, ...config.defaultConfig };
      this.configs.set('default', defaultConfig);
    } else {
      this.configs.set('default', DEFAULT_QUEUE_CONFIG);
    }

    // Initialize per-endpoint configs
    if (config?.perEndpointConfig) {
      config.perEndpointConfig.forEach((cfg, endpoint) => {
        const mergedConfig = { ...DEFAULT_QUEUE_CONFIG, ...cfg };
        this.configs.set(endpoint, mergedConfig);
      });
    }
  }

  /**
   * Get or create queue for RPC endpoint
   */
  private getQueue(rpcUrl: string): PQueue {
    if (!this.queues.has(rpcUrl)) {
      const config = this.configs.get(rpcUrl) || this.configs.get('default')!;
      
      const queue = new PQueue({
        concurrency: config.concurrency,
        interval: config.interval,
        intervalCap: config.intervalCap,
        timeout: config.timeout,
        throwOnTimeout: config.throwOnTimeout
      });

      // Set up queue event handlers
      queue.on('active', () => {
        logger.debug(`Queue active for ${rpcUrl}: ${queue.size} waiting, ${queue.pending} running`);
      });

      queue.on('idle', () => {
        logger.debug(`Queue idle for ${rpcUrl}`);
      });

      queue.on('error', (error) => {
        logger.error(`Queue error for ${rpcUrl}: ${error.message}`);
      });

      this.queues.set(rpcUrl, queue);
      
      // Initialize metrics
      this.metrics.set(rpcUrl, {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        timeouts: 0,
        avgLatency: 0,
        lastRequestTime: 0
      });

      logger.info(`Created new queue for ${rpcUrl}: ${JSON.stringify(config)}`);
    }

    return this.queues.get(rpcUrl)!;
  }

  /**
   * Execute operation with rate limiting
   * 
   * @param rpcUrl - The RPC endpoint URL
   * @param operation - The async operation to execute
   * @returns Promise with operation result
   */
  async executeWithRateLimit<T>(
    rpcUrl: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const queue = this.getQueue(rpcUrl);
    const metrics = this.metrics.get(rpcUrl)!;
    const startTime = Date.now();

    metrics.totalRequests++;
    metrics.lastRequestTime = startTime;

    try {
      const result = await queue.add(operation);
      
      const latency = Date.now() - startTime;
      metrics.successfulRequests++;
      metrics.avgLatency = (metrics.avgLatency * (metrics.successfulRequests - 1) + latency) / metrics.successfulRequests;

      logger.debug(`RPC call to ${rpcUrl} completed in ${latency}ms`);
      
      return result as T;
    } catch (error: any) {
      metrics.failedRequests++;
      
      if (error.name === 'TimeoutError') {
        metrics.timeouts++;
        logger.warn(`RPC call to ${rpcUrl} timed out after ${Date.now() - startTime}ms`);
      } else {
        logger.error(`RPC call to ${rpcUrl} failed: ${error.message}`);
      }
      
      throw error;
    }
  }

  /**
   * Configure rate limit for a specific endpoint
   */
  configureEndpoint(rpcUrl: string, config: Partial<RPCQueueConfig>): void {
    const existingConfig = this.configs.get(rpcUrl) || this.configs.get('default')!;
    const newConfig = { ...existingConfig, ...config };
    
    this.configs.set(rpcUrl, newConfig);
    
    // If queue already exists, we need to recreate it
    if (this.queues.has(rpcUrl)) {
      const oldQueue = this.queues.get(rpcUrl)!;
      oldQueue.clear();
      this.queues.delete(rpcUrl);
      
      logger.info(`Reconfigured queue for ${rpcUrl}: ${JSON.stringify(newConfig)}`);
    }
  }

  /**
   * Get queue metrics for an endpoint
   */
  getMetrics(rpcUrl: string): typeof this.metrics extends Map<string, infer T> ? T : never {
    const metrics = this.metrics.get(rpcUrl);
    if (!metrics) {
      throw new Error(`No metrics found for endpoint: ${rpcUrl}`);
    }
    return metrics;
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, typeof this.metrics extends Map<string, infer T> ? T : never> {
    return new Map(this.metrics);
  }

  /**
   * Get queue status for an endpoint
   */
  getQueueStatus(rpcUrl: string): {
    size: number;
    pending: number;
    isPaused: boolean;
  } | null {
    const queue = this.queues.get(rpcUrl);
    if (!queue) {
      return null;
    }

    return {
      size: queue.size,
      pending: queue.pending,
      isPaused: queue.isPaused
    };
  }

  /**
   * Pause queue for an endpoint
   */
  pauseQueue(rpcUrl: string): void {
    const queue = this.queues.get(rpcUrl);
    if (queue) {
      queue.pause();
      logger.info(`Paused queue for ${rpcUrl}`);
    }
  }

  /**
   * Resume queue for an endpoint
   */
  resumeQueue(rpcUrl: string): void {
    const queue = this.queues.get(rpcUrl);
    if (queue) {
      queue.start();
      logger.info(`Resumed queue for ${rpcUrl}`);
    }
  }

  /**
   * Clear all pending requests for an endpoint
   */
  clearQueue(rpcUrl: string): void {
    const queue = this.queues.get(rpcUrl);
    if (queue) {
      queue.clear();
      logger.info(`Cleared queue for ${rpcUrl}`);
    }
  }

  /**
   * Shutdown all queues
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down RPCManager...');
    
    const shutdownPromises = Array.from(this.queues.values()).map(queue => {
      queue.pause();
      return queue.onIdle();
    });

    await Promise.all(shutdownPromises);
    
    this.queues.clear();
    logger.info('RPCManager shutdown complete');
  }
}

// Export singleton instance
export const rpcManager = new RPCManager();
