/**
 * Example: MEV Sensor Usage
 * 
 * Demonstrates how to use MEV sensors for real-time monitoring
 */

import { MempoolCongestionSensor } from '../src/mev/sensors/MempoolCongestionSensor';
import { SearcherDensitySensor } from '../src/mev/sensors/SearcherDensitySensor';
import { MEVSensorHub } from '../src/mev/sensors/MEVSensorHub';

async function main() {
  const rpcUrl = process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';
  
  // Known DEX routers on Arbitrum
  const routers = [
    '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',  // Uniswap V3 Router 2
    '0xE592427A0AEce92De3Edee1F18E0157C05861564',  // Uniswap V3 Router
    '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'   // SushiSwap Router
  ];

  console.log('=== MEV Sensor Usage Example ===\n');

  // Example 1: Individual Sensors
  console.log('1. Using Individual Sensors');
  console.log('----------------------------');
  
  const congestionSensor = new MempoolCongestionSensor(rpcUrl);
  const searcherSensor = new SearcherDensitySensor(rpcUrl, routers);

  const congestionScore = await congestionSensor.getCongestionScore();
  const searcherDensity = await searcherSensor.getSearcherDensity();

  console.log(`Mempool Congestion: ${(congestionScore * 100).toFixed(2)}%`);
  console.log(`Searcher Density: ${(searcherDensity * 100).toFixed(2)}%`);
  
  // Get detailed metrics
  const congestionMetrics = await congestionSensor.getMetrics();
  console.log('\nCongestion Details:');
  console.log(`  Pending Ratio: ${(congestionMetrics.pendingRatio * 100).toFixed(2)}%`);
  console.log(`  Gas Deviation: ${(congestionMetrics.gasDeviation * 100).toFixed(2)}%`);
  console.log(`  Fee Velocity: ${(congestionMetrics.feeVelocity * 100).toFixed(2)}%`);

  // Example 2: MEV Sensor Hub
  console.log('\n2. Using MEV Sensor Hub');
  console.log('------------------------');
  
  const hub = new MEVSensorHub(rpcUrl, routers);
  
  // Start periodic updates (every 30 seconds)
  await hub.start(30000);
  
  // Monitor for changes
  hub.on('update', (metrics) => {
    console.log(`\n[${new Date().toISOString()}] MEV Metrics Updated:`);
    console.log(`  Congestion: ${(metrics.congestionScore * 100).toFixed(2)}%`);
    console.log(`  Searcher Density: ${(metrics.searcherDensity * 100).toFixed(2)}%`);
    console.log(`  Combined Risk: ${(metrics.combinedRisk * 100).toFixed(2)}%`);
  });

  // Example 3: Risk-Based Decision Making
  console.log('\n3. Risk-Based Decision Making');
  console.log('------------------------------');

  setTimeout(async () => {
    const metrics = hub.getMetrics();
    
    // Decision logic based on MEV risk
    if (metrics.combinedRisk > 0.7) {
      console.log('⚠️  HIGH MEV RISK - Consider:');
      console.log('   - Using private mempool (Flashbots)');
      console.log('   - Increasing slippage tolerance');
      console.log('   - Delaying transaction');
    } else if (metrics.combinedRisk > 0.4) {
      console.log('⚡ MODERATE MEV RISK - Consider:');
      console.log('   - Standard slippage protection');
      console.log('   - Monitor transaction closely');
    } else {
      console.log('✅ LOW MEV RISK - Safe to proceed');
      console.log('   - Normal execution conditions');
    }
  }, 5000);

  // Example 4: Continuous Monitoring
  console.log('\n4. Continuous Monitoring');
  console.log('-------------------------');
  console.log('Monitoring MEV conditions (press Ctrl+C to stop)...\n');

  // Keep the process running for continuous monitoring
  // In production, this would be part of your main arbitrage loop
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

export { main };
