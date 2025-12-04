#!/usr/bin/env node
/**
 * TheWarden Bitcoin Integration Demo
 * 
 * Demonstrates TheWarden's Bitcoin mempool monitoring and MEV detection.
 * This script shows the transition from Base Network to Bitcoin Network.
 * 
 * Usage:
 *   MEMPOOL_API_KEY=5d063afd314264c4b46da85342fe2555 npx tsx scripts/thewarden-bitcoin-demo.ts [duration_minutes]
 * 
 * Example:
 *   MEMPOOL_API_KEY=5d063afd314264c4b46da85342fe2555 npx tsx scripts/thewarden-bitcoin-demo.ts 5
 */

import { BitcoinMempoolIntegration, BitcoinMempoolConfig } from '../src/bitcoin/BitcoinMempoolIntegration.js';
import { loadBitcoinNetworkConfig, validateBitcoinNetworkConfig, getBitcoinNetworkName } from '../src/config/bitcoin.config.js';

async function runDemo(durationMinutes: number = 5): Promise<void> {
  console.log('');
  console.log('═'.repeat(80));
  console.log('🛡️  TheWarden - Bitcoin Integration Demo');
  console.log('═'.repeat(80));
  console.log('');
  
  // Load configuration
  const networkConfig = loadBitcoinNetworkConfig();
  
  // Validate configuration
  const validation = validateBitcoinNetworkConfig(networkConfig);
  
  if (!validation.valid) {
    console.error('❌ Configuration validation failed:');
    validation.errors.forEach(error => console.error(`   - ${error}`));
    process.exit(1);
  }
  
  if (validation.warnings.length > 0) {
    console.warn('⚠️  Configuration warnings:');
    validation.warnings.forEach(warning => console.warn(`   - ${warning}`));
    console.log('');
  }
  
  // Display configuration
  console.log('📋 Configuration:');
  console.log(`   Network: ${getBitcoinNetworkName(networkConfig.network)}`);
  console.log(`   API Key: ${networkConfig.mempoolApiKey ? '***configured***' : 'not configured'}`);
  console.log(`   WebSocket: ${networkConfig.enableWebSocket ? 'enabled' : 'disabled'}`);
  console.log(`   Polling: every ${networkConfig.pollingInterval}s`);
  console.log(`   Fee Range: ${networkConfig.minFeeRateThreshold}-${networkConfig.maxFeeRateThreshold} sat/vB`);
  console.log(`   MEV Detection: ${networkConfig.enableMEVDetection ? 'enabled' : 'disabled'}`);
  console.log(`   Duration: ${durationMinutes} minutes`);
  console.log('');
  
  // Create integration instance
  const mempoolConfig: BitcoinMempoolConfig = {
    apiKey: networkConfig.mempoolApiKey,
    enableWebSocket: networkConfig.enableWebSocket,
    pollingInterval: networkConfig.pollingInterval,
    minFeeRateThreshold: networkConfig.minFeeRateThreshold,
    highValueThreshold: networkConfig.highValueThreshold,
    enableMEVDetection: networkConfig.enableMEVDetection,
    enableConsciousnessIntegration: networkConfig.enableConsciousnessIntegration,
  };
  
  const integration = new BitcoinMempoolIntegration(mempoolConfig);
  
  // Set up event listeners
  integration.on('started', () => {
    console.log('✅ Bitcoin Mempool Integration started\n');
  });
  
  integration.on('stats:update', (stats: any) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] 📊 Mempool Update:`);
    console.log(`   Median Fee: ${stats.medianFeeRate.toFixed(2)} sat/vB`);
    console.log(`   Transactions: ${stats.txCount.toLocaleString()}`);
    console.log(`   Utilization: ${stats.blockUtilization.toFixed(1)}%`);
    console.log(`   Activity: ${(stats.activityLevel * 100).toFixed(0)}% of average`);
    
    // Get recommendation
    const recommendation = integration.getMarketRecommendation();
    console.log(`   Recommendation: ${recommendation.action} (${recommendation.reason})`);
    console.log('');
  });
  
  integration.on('mev:opportunity', (opportunity: any) => {
    console.log(`🎯 MEV Opportunity Detected:`);
    console.log(`   Type: ${opportunity.type}`);
    console.log(`   Risk: ${opportunity.risk}`);
    console.log(`   Description: ${opportunity.description}`);
    if (opportunity.estimatedValue) {
      console.log(`   Value: ${(opportunity.estimatedValue / 100_000_000).toFixed(8)} BTC`);
    }
    console.log('');
  });
  
  integration.on('block:mined', (block: any) => {
    console.log(`⛏️  New Block Mined: #${block.height} (${block.txCount} TXs)\n`);
  });
  
  integration.on('mempool:info', (info: any) => {
    console.log(`📡 Mempool Info: ${info.size} TXs, ${(info.bytes / 1_000_000).toFixed(2)} MB\n`);
  });
  
  // Start integration
  try {
    await integration.start();
    
    console.log('🔍 Monitoring Bitcoin mempool...');
    console.log(`⏱️  Will run for ${durationMinutes} minutes`);
    console.log('   Press Ctrl+C to stop early\n');
    
    // Run for specified duration
    const endTime = Date.now() + durationMinutes * 60 * 1000;
    
    const checkInterval = setInterval(() => {
      if (Date.now() >= endTime) {
        clearInterval(checkInterval);
        
        // Display summary
        const status = integration.getStatus();
        const stats = integration.getCurrentStats();
        const opportunities = integration.getRecentMEVOpportunities();
        
        console.log('');
        console.log('═'.repeat(80));
        console.log('📊 Session Summary');
        console.log('═'.repeat(80));
        console.log('');
        console.log('Status:');
        console.log(`   Running: ${status.isRunning}`);
        console.log(`   WebSocket: ${status.hasWebSocket ? 'connected' : 'disconnected'}`);
        console.log(`   Has Data: ${status.hasStats}`);
        console.log('');
        
        if (stats) {
          console.log('Final Mempool Stats:');
          console.log(`   Median Fee: ${stats.medianFeeRate.toFixed(2)} sat/vB`);
          console.log(`   Transactions: ${stats.txCount.toLocaleString()}`);
          console.log(`   Utilization: ${stats.blockUtilization.toFixed(1)}%`);
          console.log(`   Activity Level: ${(stats.activityLevel * 100).toFixed(0)}%`);
          console.log('');
          
          // Fee recommendations
          console.log('Fee Recommendations:');
          console.log(`   Immediate (next block): ${integration.getOptimalFeeRate('immediate').toFixed(2)} sat/vB`);
          console.log(`   Fast (3 blocks): ${integration.getOptimalFeeRate('fast').toFixed(2)} sat/vB`);
          console.log(`   Normal (6 blocks): ${integration.getOptimalFeeRate('normal').toFixed(2)} sat/vB`);
          console.log(`   Slow (whenever): ${integration.getOptimalFeeRate('slow').toFixed(2)} sat/vB`);
          console.log('');
        }
        
        console.log('MEV Opportunities:');
        console.log(`   Total Detected: ${status.mevOpportunities}`);
        console.log(`   Recent (last 5 min): ${opportunities.length}`);
        
        if (opportunities.length > 0) {
          console.log('   Types:');
          const types = opportunities.reduce((acc, opp) => {
            acc[opp.type] = (acc[opp.type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          Object.entries(types).forEach(([type, count]) => {
            console.log(`      - ${type}: ${count}`);
          });
        }
        
        console.log('');
        console.log('✅ Demo complete!');
        console.log('');
        console.log('Next Steps:');
        console.log('   1. Integrate with TheWarden main loop');
        console.log('   2. Connect to Bitcoin RPC for transaction submission');
        console.log('   3. Implement MEV strategies (defensive, ethical)');
        console.log('   4. Enable consciousness learning from mempool patterns');
        console.log('');
        
        // Stop integration
        integration.stop().then(() => {
          process.exit(0);
        });
      }
    }, 1000);
    
    // Handle Ctrl+C
    process.on('SIGINT', () => {
      console.log('\n⚠️  Interrupted by user\n');
      clearInterval(checkInterval);
      integration.stop().then(() => {
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('❌ Failed to start integration:', error);
    process.exit(1);
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const durationMinutes = parseInt(process.argv[2] || '5', 10);
  runDemo(durationMinutes).catch(error => {
    console.error('Demo failed:', error);
    process.exit(1);
  });
}

export default runDemo;
