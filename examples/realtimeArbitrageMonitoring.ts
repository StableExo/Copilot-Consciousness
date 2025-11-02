/**
 * Real-Time Arbitrage Monitoring Example
 * 
 * Demonstrates how to use the real-time monitoring system to detect and trigger
 * arbitrage opportunities based on WebSocket events from DEX liquidity pools.
 */

import { DEXRegistry } from '../src/dex/core/DEXRegistry';
import { ArbitrageOrchestrator } from '../src/arbitrage/ArbitrageOrchestrator';
import { WebSocketStreamManager, PoolEvent } from '../src/dex/monitoring/WebSocketStreamManager';
import { RealtimeDataPipeline, FilteredPoolEvent } from '../src/dex/monitoring/RealtimeDataPipeline';
import { EventDrivenTrigger } from '../src/arbitrage/EventDrivenTrigger';
import { PathfindingConfig } from '../src/arbitrage/types';
import { 
  defaultRealtimeConfig, 
  createRealtimeConfig,
  validateRealtimeConfig 
} from '../src/config/realtime.config';

/**
 * Main application class for real-time arbitrage monitoring
 */
class RealtimeArbitrageMonitor {
  private wsManager: WebSocketStreamManager;
  private pipeline: RealtimeDataPipeline;
  private trigger: EventDrivenTrigger;
  private orchestrator: ArbitrageOrchestrator;
  private isRunning: boolean = false;

  constructor() {
    // Initialize configuration
    const config = createRealtimeConfig({
      // Customize configuration as needed
      profitability: {
        minProfitPercent: 1.0, // 1% minimum profit
        maxSlippagePercent: 2.0, // 2% maximum slippage
        minProfitAbsolute: BigInt('500000000000000000'), // 0.5 ETH
      },
      eventFilter: {
        minLiquidity: BigInt('50000000000000000000000'), // 50,000 tokens
        maxPriceImpact: 0.05, // 5%
        minPriceDelta: 0.005, // 0.5%
      },
    });

    // Validate configuration
    if (!validateRealtimeConfig(config)) {
      throw new Error('Invalid configuration');
    }

    // Initialize WebSocket Stream Manager
    this.wsManager = new WebSocketStreamManager(
      config.websocketEndpoints,
      config.retry
    );

    // Initialize Real-Time Data Pipeline
    this.pipeline = new RealtimeDataPipeline(
      config.eventFilter,
      config.backpressure.maxQueueSize,
      config.backpressure.dropStrategy,
      60000 // 1 minute sliding window
    );

    // Initialize Arbitrage Orchestrator
    const registry = new DEXRegistry();
    const pathfindingConfig: PathfindingConfig = {
      maxHops: 3,
      minProfitThreshold: config.profitability.minProfitAbsolute,
      maxSlippage: config.profitability.maxSlippagePercent / 100,
      gasPrice: BigInt(50000000000), // 50 gwei
    };

    this.orchestrator = new ArbitrageOrchestrator(
      registry,
      pathfindingConfig,
      pathfindingConfig.gasPrice
    );

    // Set orchestrator to event-driven mode
    this.orchestrator.setMode('event-driven');

    // Initialize Event-Driven Trigger
    this.trigger = new EventDrivenTrigger(
      this.orchestrator,
      config.profitability,
      config.debounce.windowMs,
      config.features.enableDebouncing
    );

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for the monitoring pipeline
   */
  private setupEventListeners(): void {
    // WebSocket Manager Events
    this.wsManager.on('connected', ({ endpoint }) => {
      console.log(`✓ Connected to WebSocket: ${endpoint}`);
    });

    this.wsManager.on('disconnected', () => {
      console.warn('⚠ WebSocket disconnected');
    });

    this.wsManager.on('reconnecting', ({ attempt, delay }) => {
      console.log(`↻ Reconnecting (attempt ${attempt}), waiting ${delay}ms...`);
    });

    this.wsManager.on('error', (error) => {
      console.error('✗ WebSocket error:', error);
    });

    this.wsManager.on('poolEvent', (event: PoolEvent) => {
      // Forward pool events to the pipeline
      this.pipeline.processEvent(event);
    });

    // Pipeline Events
    this.pipeline.on('filteredEvent', (event: FilteredPoolEvent) => {
      console.log(`→ Filtered event [${event.priority}]: ${event.poolAddress.substring(0, 10)}...`);
      
      // Forward to trigger
      this.trigger.handleEvent(event);
    });

    this.pipeline.on('backpressure', ({ queueSize, maxSize }) => {
      console.warn(`⚠ Backpressure: Queue ${queueSize}/${maxSize}`);
    });

    this.pipeline.on('metrics', (metrics) => {
      if (metrics.eventsReceived % 100 === 0) {
        console.log(`📊 Pipeline Metrics:`, {
          received: metrics.eventsReceived,
          filtered: metrics.eventsFiltered,
          emitted: metrics.eventsEmitted,
          throughput: metrics.throughputPerSecond.toFixed(2) + '/s',
          latency: metrics.averageLatencyMs.toFixed(2) + 'ms',
        });
      }
    });

    // Trigger Events
    this.trigger.on('opportunityDetected', (detection) => {
      console.log(`💡 Opportunity detected:`, {
        pool: detection.poolAddress.substring(0, 10) + '...',
        profit: detection.profitPercent.toFixed(2) + '%',
        paths: detection.paths.length,
      });
    });

    this.trigger.on('opportunityTriggered', (detection) => {
      console.log(`🚀 Opportunity triggered!`, {
        pool: detection.poolAddress.substring(0, 10) + '...',
        estimatedProfit: detection.estimatedProfit.toString(),
        profitPercent: detection.profitPercent.toFixed(2) + '%',
      });
    });

    this.trigger.on('arbitrageSuccess', (detection) => {
      console.log(`✅ Arbitrage executed successfully!`);
    });

    this.trigger.on('arbitrageFailure', ({ detection, error }) => {
      console.error(`✗ Arbitrage failed:`, error);
    });

    this.trigger.on('debounced', ({ poolAddress }) => {
      // Debounced events (can be logged at debug level)
    });
  }

  /**
   * Start monitoring
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Monitor is already running');
      return;
    }

    console.log('🚀 Starting Real-Time Arbitrage Monitor...');

    try {
      // Connect to WebSocket
      await this.wsManager.connect();

      // Subscribe to pools
      // To configure pools for monitoring:
      // 1. Identify high-liquidity DEX pools on Ethereum mainnet
      // 2. Add their contract addresses to the array below
      // 
      // Example real addresses (Ethereum mainnet):
      // - Uniswap V2 WETH/USDC: 0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc
      // - Uniswap V2 WETH/USDT: 0x0d4a11d5EEaaC28EC3F61d100daF4d40471f1852
      // - SushiSwap WETH/USDC: 0x397FF1542f962076d0BFE58eA045FfA2d347ACa0
      //
      // Note: Ensure you have valid WebSocket endpoint URLs configured
      // in your environment variables before running.
      const poolsToMonitor: string[] = [
        // Add pool addresses here for production use
      ];

      for (const pool of poolsToMonitor) {
        await this.wsManager.subscribeToPool(pool);
        console.log(`✓ Subscribed to pool: ${pool.substring(0, 10)}...`);
      }

      this.isRunning = true;
      console.log('✅ Monitor started successfully!');
      console.log('📡 Listening for arbitrage opportunities...\n');

      // Log metrics periodically
      setInterval(() => {
        const triggerMetrics = this.trigger.getMetrics();
        console.log('\n📈 Trigger Metrics:', {
          detected: triggerMetrics.opportunitiesDetected,
          triggered: triggerMetrics.opportunitiesTriggered,
          successful: triggerMetrics.successfulExecutions,
          failed: triggerMetrics.failedExecutions,
          avgLatency: triggerMetrics.averageLatencyMs.toFixed(2) + 'ms',
        });
      }, 60000); // Every minute
    } catch (error) {
      console.error('✗ Failed to start monitor:', error);
      throw error;
    }
  }

  /**
   * Stop monitoring
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('\n🛑 Stopping Real-Time Arbitrage Monitor...');

    // Cleanup
    await this.wsManager.shutdown();
    this.pipeline.destroy();

    this.isRunning = false;
    console.log('✅ Monitor stopped');
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      running: this.isRunning,
      connected: this.wsManager.isConnected(),
      subscribedPools: this.wsManager.getSubscribedPools().length,
      queueSize: this.pipeline.getQueueSize(),
      mode: this.orchestrator.getMode(),
      triggerMetrics: this.trigger.getMetrics(),
      pipelineMetrics: this.pipeline.getMetrics(),
    };
  }
}

/**
 * Example usage
 */
async function main() {
  // Create monitor instance
  const monitor = new RealtimeArbitrageMonitor();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\nReceived SIGINT, shutting down gracefully...');
    await monitor.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n\nReceived SIGTERM, shutting down gracefully...');
    await monitor.stop();
    process.exit(0);
  });

  try {
    // Start monitoring
    await monitor.start();

    // Keep the process running
    // In production, this would run indefinitely
    // For demo, we'll run for 5 minutes then stop
    setTimeout(async () => {
      console.log('\n\nDemo period ended, stopping monitor...');
      await monitor.stop();
      
      // Display final status
      console.log('\n📊 Final Status:', monitor.getStatus());
      
      process.exit(0);
    }, 300000); // 5 minutes

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { RealtimeArbitrageMonitor };
