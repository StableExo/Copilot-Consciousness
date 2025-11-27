/**
 * Example: MEV-Aware Arbitrage with Real-Time Sensors
 * 
 * This example demonstrates how to integrate the MEV Risk Intelligence Suite
 * into the arbitrage pipeline for mainnet-grade MEV awareness.
 */

import { ethers } from 'ethers';
import {
  MEVSensorHub,
  MEVAwareProfitCalculator,
  TransactionType,
} from '../src/mev';
import { FeatureExtractor } from '../src/ml/FeatureExtractor';

/**
 * Initialize MEV-aware arbitrage system
 */
async function setupMEVAwareSystem() {
  // 1. Setup provider (use your RPC endpoint)
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.RPC_URL || 'https://mainnet.infura.io/v3/YOUR_KEY'
  );

  // 2. Initialize MEV sensor hub
  const sensorHub = new MEVSensorHub(provider, 5000); // Update every 5 seconds
  sensorHub.start();

  console.log('✅ MEV Sensor Hub started');

  // 3. Initialize MEV-aware profit calculator
  const profitCalculator = new MEVAwareProfitCalculator();

  // 4. Initialize ML feature extractor
  const featureExtractor = new FeatureExtractor();

  return { provider, sensorHub, profitCalculator, featureExtractor };
}

/**
 * Analyze an arbitrage opportunity with MEV risk assessment
 */
async function analyzeOpportunity(
  system: Awaited<ReturnType<typeof setupMEVAwareSystem>>,
  opportunityData: {
    expectedRevenue: number; // ETH
    gasCost: number; // ETH
    transactionValue: number; // ETH
  }
) {
  const { sensorHub, profitCalculator } = system;

  // Get real-time MEV risk parameters
  const riskParams = sensorHub.getRiskParams();

  console.log('\n📊 Current MEV Risk Environment:');
  console.log(`  Mempool Congestion: ${(riskParams.mempoolCongestion * 100).toFixed(1)}%`);
  console.log(`  Searcher Density: ${(riskParams.searcherDensity * 100).toFixed(1)}%`);
  console.log(`  Last Updated: ${new Date(riskParams.timestamp).toISOString()}`);

  // Calculate MEV-adjusted profit
  const profitMetrics = profitCalculator.calculateProfit(
    opportunityData.expectedRevenue,
    opportunityData.gasCost,
    opportunityData.transactionValue,
    TransactionType.ARBITRAGE,
    riskParams.mempoolCongestion
  );

  console.log('\n💰 Profit Analysis (MEV-Adjusted):');
  console.log(`  Gross Profit: ${profitMetrics.grossProfit.toFixed(6)} ETH`);
  console.log(`  MEV Risk: ${profitMetrics.mevRisk.toFixed(6)} ETH`);
  console.log(`  Adjusted Profit: ${profitMetrics.adjustedProfit.toFixed(6)} ETH`);
  console.log(`  Risk Ratio: ${(profitMetrics.riskRatio * 100).toFixed(2)}%`);
  console.log(`  Net Margin: ${(profitMetrics.netProfitMargin * 100).toFixed(2)}%`);

  // Decision logic
  const shouldExecute = profitMetrics.adjustedProfit > 0.001; // Minimum 0.001 ETH profit
  const riskLevel =
    profitMetrics.riskRatio > 0.5 ? 'HIGH' : profitMetrics.riskRatio > 0.2 ? 'MEDIUM' : 'LOW';

  console.log(`\n🎯 Decision:`);
  console.log(`  Execute: ${shouldExecute ? 'YES ✅' : 'NO ❌'}`);
  console.log(`  Risk Level: ${riskLevel}`);

  return { profitMetrics, shouldExecute, riskLevel };
}

/**
 * Extract ML features with MEV data
 */
async function extractMLFeatures(
  system: Awaited<ReturnType<typeof setupMEVAwareSystem>>,
  priceHistory: any[] // Your price history data
) {
  const { sensorHub, featureExtractor } = system;

  // Extract features including MEV risk parameters
  const features = await featureExtractor.extractFeatures(
    priceHistory,
    Date.now(),
    sensorHub.getRiskParams() // Include MEV risk in features
  );

  console.log('\n🧠 ML Features (including MEV):');
  console.log(`  MEV Risk Score: ${features.mevRiskScore?.toFixed(4) || 'N/A'}`);
  console.log(`  Mempool Congestion: ${features.mempoolCongestion?.toFixed(4) || 'N/A'}`);
  console.log(`  Searcher Density: ${features.searcherDensity?.toFixed(4) || 'N/A'}`);
  console.log(`  Price Momentum (1m): ${features.priceMomentum1m.toFixed(4)}`);
  console.log(`  Volatility: ${features.volatility.toFixed(4)}`);

  return features;
}

/**
 * Main execution example
 */
async function main() {
  console.log('🚀 MEV-Aware Arbitrage System Example\n');

  try {
    // Setup system
    const system = await setupMEVAwareSystem();

    // Wait for initial sensor readings
    console.log('⏳ Waiting for initial sensor readings...');
    await new Promise((resolve) => setTimeout(resolve, 6000));

    // Example opportunity
    const opportunity = {
      expectedRevenue: 0.1, // 0.1 ETH revenue
      gasCost: 0.005, // 0.005 ETH gas
      transactionValue: 1.0, // 1 ETH transaction
    };

    // Analyze opportunity
    const analysis = await analyzeOpportunity(system, opportunity);

    // Example: Extract ML features (with mock price history)
    const mockPriceHistory = [
      {
        timestamp: Date.now() - 60000,
        chain: 1,
        tokenAddress: '0x...',
        price: 2000,
        volume: 1000,
        liquidity: 10000,
        gasPrice: 50,
      },
      {
        timestamp: Date.now(),
        chain: 1,
        tokenAddress: '0x...',
        price: 2010,
        volume: 1200,
        liquidity: 10500,
        gasPrice: 55,
      },
    ];

    const features = await extractMLFeatures(system, mockPriceHistory);

    // Cleanup
    console.log('\n🛑 Shutting down...');
    system.sensorHub.stop();

    console.log('✅ Example completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { setupMEVAwareSystem, analyzeOpportunity, extractMLFeatures };
