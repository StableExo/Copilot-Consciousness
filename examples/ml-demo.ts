/**
 * ML System Demo
 * 
 * Demonstrates the ML-powered prediction system for arbitrage opportunities.
 */

import { MLOrchestrator } from '../src/ml/MLOrchestrator';
import { DataCollector } from '../src/ml/DataCollector';
import { TrainingPipeline } from '../src/ml/training/TrainingPipeline';
import { InferenceServer } from '../src/ml/InferenceServer';
import { ModelMonitor } from '../src/ml/monitoring/ModelMonitor';
import { Backtester } from '../src/ml/backtesting/Backtester';
import { ArbitragePath } from '../src/arbitrage/types';
import { TrainingRecord } from '../src/ml/types';

/**
 * Demo: Basic ML Enhancement
 */
async function demoBasicMLEnhancement() {
  console.log('\n=== Demo: Basic ML Enhancement ===\n');

  // Initialize ML orchestrator
  const orchestrator = new MLOrchestrator();
  await orchestrator.initialize();

  // Create a sample arbitrage path
  const path: ArbitragePath = {
    hops: [
      {
        dexName: 'Uniswap',
        poolAddress: '0x123...',
        tokenIn: '0xToken1',
        tokenOut: '0xToken2',
        amountIn: 1000n * 10n**18n,
        amountOut: 1100n * 10n**18n,
        fee: 0.003,
        gasEstimate: 150000,
        reserve0: 1000000n * 10n**18n,
        reserve1: 1100000n * 10n**18n,
      },
      {
        dexName: 'SushiSwap',
        poolAddress: '0x456...',
        tokenIn: '0xToken2',
        tokenOut: '0xToken1',
        amountIn: 1100n * 10n**18n,
        amountOut: 1050n * 10n**18n,
        fee: 0.0025,
        gasEstimate: 150000,
        reserve0: 1100000n * 10n**18n,
        reserve1: 1000000n * 10n**18n,
      },
    ],
    startToken: '0xToken1',
    endToken: '0xToken1',
    estimatedProfit: 50n * 10n**18n,
    totalGasCost: 300000n * 50n * 10n**9n,
    netProfit: 35n * 10n**18n,
    totalFees: 0.0055,
    slippageImpact: 0.01,
  };

  // Enhance with ML predictions
  const enhanced = await orchestrator.enhanceOpportunity(path);

  console.log('Original Path:');
  console.log('  Net Profit:', Number(path.netProfit) / 1e18, 'tokens');
  console.log('  Hops:', path.hops.length);
  console.log('  Total Fees:', (path.totalFees * 100).toFixed(2), '%');

  console.log('\nML Predictions:');
  console.log('  Success Probability:', (enhanced.mlPredictions!.successProbability * 100).toFixed(1), '%');
  console.log('  Confidence:', (enhanced.mlPredictions!.confidence * 100).toFixed(1), '%');
  console.log('  Recommendation:', enhanced.mlPredictions!.recommendation);
  console.log('  Price Forecasts:', enhanced.mlPredictions!.priceForecasts.length, 'horizons');
  console.log('  Volatility:', (enhanced.mlPredictions!.volatilityForecast.volatility * 100).toFixed(2), '%');

  await orchestrator.shutdown();
}

/**
 * Demo: Data Collection
 */
async function demoDataCollection() {
  console.log('\n=== Demo: Data Collection ===\n');

  const collector = new DataCollector();
  
  // Start collection
  collector.start();
  console.log('Data collector started');

  // Record some price data
  for (let i = 0; i < 5; i++) {
    collector.recordPrice({
      timestamp: Date.now() + i * 5000,
      chain: 1,
      tokenAddress: '0xToken1',
      price: 100 + Math.random() * 5,
      volume: 1000 + Math.random() * 500,
      liquidity: 50000 + Math.random() * 10000,
      gasPrice: 50 + Math.random() * 20,
    });
  }

  // Get statistics
  const stats = collector.getStats();
  console.log('\nCollection Stats:');
  console.log('  Data Points:', stats.dataPointsCollected);
  console.log('  Active Chains:', stats.activeChains.size);
  console.log('  Active Tokens:', stats.activeTokens.size);

  collector.stop();
  console.log('\nData collector stopped');
}

/**
 * Demo: Training Pipeline
 */
async function demoTrainingPipeline() {
  console.log('\n=== Demo: Training Pipeline ===\n');

  const pipeline = new TrainingPipeline();

  // Add training data
  const sampleData: TrainingRecord[] = [];
  for (let i = 0; i < 100; i++) {
    sampleData.push({
      timestamp: Date.now() - i * 60000,
      features: {
        priceMomentum5s: Math.random() * 0.1,
        priceMomentum15s: Math.random() * 0.1,
        priceMomentum30s: Math.random() * 0.1,
        priceMomentum1m: Math.random() * 0.1,
        priceMomentum5m: Math.random() * 0.1,
        volumeMA: 1000,
        volumeRatio: 1 + Math.random() * 0.5,
        vwap: 100,
        liquidityDepth: 50000,
        liquidityRatio: 1,
        bidAskSpread: 0.001,
        spreadTrend: 0,
        gasPricePercentile: Math.random(),
        gasTrend: 0,
        volatility: 0.02,
        atr: 1,
        hourOfDay: 12,
        dayOfWeek: 3,
      },
      path: {
        hops: [],
        startToken: '0x1',
        endToken: '0x1',
        estimatedProfit: 100n,
        totalGasCost: 300000n,
        netProfit: 80n,
        totalFees: 0.003,
        slippageImpact: 0.01,
      },
      outcome: {
        executed: true,
        successful: Math.random() > 0.3,
        actualProfit: 80n,
        gasUsed: 300000n,
      },
    });
  }

  pipeline.addTrainingData(sampleData);
  console.log('Added', sampleData.length, 'training records');

  // Get stats
  const stats = pipeline.getStats();
  console.log('\nPipeline Stats:');
  console.log('  Training Data:', stats.trainingDataCount);
  console.log('  Total Jobs:', stats.totalJobs);
  console.log('  Running:', stats.isRunning);

  // Note: Actual training would require Python models to be set up
  console.log('\nNote: Actual model training requires Python environment setup');
}

/**
 * Demo: Inference Server
 */
async function demoInferenceServer() {
  console.log('\n=== Demo: Inference Server ===\n');

  const server = new InferenceServer();
  await server.start();

  console.log('Inference server started');
  console.log('Status:', server.isReady() ? 'Ready' : 'Not Ready');

  // Make some predictions
  const path: ArbitragePath = {
    hops: [],
    startToken: '0x1',
    endToken: '0x1',
    estimatedProfit: 100n,
    totalGasCost: 300000n,
    netProfit: 80n,
    totalFees: 0.003,
    slippageImpact: 0.01,
  };

  const features = {
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
  };

  console.log('\nMaking predictions...');
  for (let i = 0; i < 5; i++) {
    const response = await server.predict(path, features);
    console.log(`  Prediction ${i + 1}: Latency = ${response.latencyMs.toFixed(2)}ms, Cached = ${response.cached}`);
  }

  // Get statistics
  const stats = server.getStats();
  console.log('\nServer Stats:');
  console.log('  Total Requests:', stats.totalRequests);
  console.log('  Cache Hit Rate:', (stats.cacheHitRate * 100).toFixed(1), '%');
  console.log('  Avg Latency:', stats.avgLatencyMs.toFixed(2), 'ms');
  console.log('  Throughput:', stats.throughput.toFixed(1), 'req/s');

  await server.stop();
  console.log('\nInference server stopped');
}

/**
 * Demo: Model Monitoring
 */
async function demoModelMonitoring() {
  console.log('\n=== Demo: Model Monitoring ===\n');

  const monitor = new ModelMonitor();
  monitor.start();

  console.log('Model monitor started');

  // Simulate predictions and outcomes
  for (let i = 0; i < 10; i++) {
    const prediction = {
      priceForecasts: [],
      successProbability: Math.random(),
      volatilityForecast: {
        volatility: 0.02,
        horizon: 5,
        confidenceBand: { lower: 0.015, upper: 0.025 },
      },
      matchingPatterns: [],
      confidence: Math.random(),
      recommendation: 'EXECUTE' as const,
      timestamp: Date.now(),
    };

    const path: ArbitragePath = {
      hops: [],
      startToken: '0x1',
      endToken: '0x1',
      estimatedProfit: 100n,
      totalGasCost: 300000n,
      netProfit: 80n,
      totalFees: 0.003,
      slippageImpact: 0.01,
    };

    monitor.recordPrediction(prediction, path, 10 + Math.random() * 20);

    // Record outcome
    setTimeout(() => {
      monitor.recordOutcome(
        prediction.timestamp,
        Math.random() > 0.3,
        80n
      );
    }, 100);
  }

  // Wait for outcomes
  await new Promise(resolve => setTimeout(resolve, 200));

  // Get statistics
  const stats = monitor.getStats();
  console.log('\nMonitor Stats:');
  console.log('  Total Predictions:', stats.totalPredictions);
  console.log('  Avg Latency:', stats.avgLatency.toFixed(2), 'ms');
  console.log('  Error Rate:', (stats.errorRate * 100).toFixed(1), '%');

  // Check health
  const health = monitor.getHealthStatus();
  console.log('\nHealth Status:', health.healthy ? '✓ Healthy' : '✗ Unhealthy');
  if (health.issues.length > 0) {
    console.log('Issues:', health.issues);
  }

  monitor.stop();
  console.log('\nModel monitor stopped');
}

/**
 * Demo: Backtesting
 */
async function demoBacktesting() {
  console.log('\n=== Demo: Backtesting ===\n');

  // Generate sample historical data
  const historicalData: TrainingRecord[] = [];
  for (let i = 0; i < 50; i++) {
    historicalData.push({
      timestamp: Date.now() - (50 - i) * 3600000, // Hourly data
      features: {
        priceMomentum5s: Math.random() * 0.1,
        priceMomentum15s: Math.random() * 0.1,
        priceMomentum30s: Math.random() * 0.1,
        priceMomentum1m: Math.random() * 0.1,
        priceMomentum5m: Math.random() * 0.1,
        volumeMA: 1000,
        volumeRatio: 1 + Math.random() * 0.5,
        vwap: 100,
        liquidityDepth: 50000,
        liquidityRatio: 1,
        bidAskSpread: 0.001,
        spreadTrend: 0,
        gasPricePercentile: Math.random(),
        gasTrend: 0,
        volatility: 0.02,
        atr: 1,
        hourOfDay: i % 24,
        dayOfWeek: Math.floor(i / 24) % 7,
      },
      path: {
        hops: [],
        startToken: '0x1',
        endToken: '0x1',
        estimatedProfit: 100n * 10n**18n,
        totalGasCost: 300000n * 50n * 10n**9n,
        netProfit: 85n * 10n**18n,
        totalFees: 0.003,
        slippageImpact: 0.01,
      },
      outcome: {
        executed: true,
        successful: Math.random() > 0.4,
        actualProfit: Math.random() > 0.4 ? 85n * 10n**18n : 0n,
        gasUsed: 300000n,
      },
    });
  }

  const backtester = new Backtester({
    startDate: Date.now() - 50 * 3600000,
    endDate: Date.now(),
    initialCapital: 10000n * 10n**18n,
    useML: false,
    confidenceThreshold: 0.7,
    slippageModel: 'linear',
    gasModel: 'average',
  });

  console.log('Running backtest on', historicalData.length, 'historical records...');
  
  const result = await backtester.run(historicalData);

  console.log('\n=== Backtest Results ===');
  console.log('Total Trades:', result.totalTrades);
  console.log('Profitable Trades:', result.profitableTrades);
  console.log('Win Rate:', (result.winRate * 100).toFixed(2), '%');
  console.log('Net Profit:', Number(result.netProfit) / 1e18, 'tokens');
  console.log('Sharpe Ratio:', result.sharpeRatio.toFixed(4));
  console.log('Max Drawdown:', (result.maxDrawdown * 100).toFixed(2), '%');

  console.log('\nNote: Run with ML enabled for comparative analysis');
}

/**
 * Main demo runner
 */
async function main() {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║  ML System Demo for Arbitrage Bot    ║');
  console.log('╚═══════════════════════════════════════╝');

  try {
    await demoBasicMLEnhancement();
    await demoDataCollection();
    await demoTrainingPipeline();
    await demoInferenceServer();
    await demoModelMonitoring();
    await demoBacktesting();

    console.log('\n✓ All demos completed successfully!\n');
  } catch (error) {
    console.error('\n✗ Demo error:', error);
  }
}

// Run demos if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main };
