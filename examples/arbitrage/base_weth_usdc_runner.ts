/**
 * Example: Running Base WETH/USDC Arbitrage Strategy
 * 
 * This example demonstrates how to use the BaseArbitrageRunner with
 * consciousness integration for intelligent, learning-based arbitrage.
 */

import { BaseArbitrageRunner } from '../../src/services/BaseArbitrageRunner';
import { ArbitrageConsciousness } from '../../src/consciousness/ArbitrageConsciousness';
import * as fs from 'fs';
import * as path from 'path';
// NOTE: Bun automatically loads .env files

// Load environment variables

async function main() {
  console.log('=== Base WETH/USDC Arbitrage Strategy ===\n');
  
  // Load strategy configuration
  const configPath = path.join(__dirname, '../../configs/strategies/base_weth_usdc.json');
  const configTemplate = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  
  // Replace environment variables in config
  const config = {
    rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    chainId: 8453,
    privateKey: process.env.WALLET_PRIVATE_KEY || '',
    flashSwapAddress: process.env.FLASHSWAP_V2_ADDRESS || '',
    wethAddress: configTemplate.tokens.WETH.address,
    usdcAddress: configTemplate.tokens.USDC.address,
    targetPools: configTemplate.targetPools.filter((p: any) => p.enabled !== false),
    ...configTemplate.strategy,
    ...configTemplate.execution,
    aavePoolAddress: configTemplate.contracts.aaveV3Pool,
    enableMevProtection: configTemplate.mevProtection.enabled,
    mevRiskThreshold: configTemplate.mevProtection.riskThreshold,
  };
  
  // Validate configuration
  if (!config.privateKey || config.privateKey === '') {
    console.error('ERROR: WALLET_PRIVATE_KEY not set in .env file');
    process.exit(1);
  }
  
  if (!config.flashSwapAddress || config.flashSwapAddress === '') {
    console.error('ERROR: FLASHSWAP_V2_ADDRESS not set in .env file');
    console.error('Deploy FlashSwapV2 contract first using: npm run deploy:flashswapv2');
    process.exit(1);
  }
  
  console.log('Configuration loaded:');
  console.log(`  Network: Base (${config.chainId})`);
  console.log(`  Target pools: ${config.targetPools.length}`);
  console.log(`  Min profit threshold: ${config.minProfitThresholdEth} ETH`);
  console.log(`  Cycle interval: ${config.cycleIntervalMs}ms`);
  console.log(`  MEV protection: ${config.enableMevProtection ? 'Enabled' : 'Disabled'}`);
  console.log(`  Flashloans: ${config.enableFlashLoans ? 'Enabled' : 'Disabled'}`);
  console.log(`  Multi-DEX: ${config.enableMultiDex ? 'Enabled' : 'Disabled'}\n`);
  
  // Initialize consciousness integration
  const consciousness = new ArbitrageConsciousness(
    configTemplate.consciousness.learningRate,
    1000 // Max history size
  );
  
  console.log('Consciousness integration initialized\n');
  
  // Initialize arbitrage runner
  const runner = new BaseArbitrageRunner(config);
  
  // Set up event listeners
  runner.on('started', () => {
    console.log('[Event] Runner started');
  });
  
  runner.on('cycleComplete', (data) => {
    console.log(`[Event] Cycle #${data.cycleNumber} completed in ${data.duration}ms`);
  });
  
  runner.on('opportunitySkipped', (data) => {
    console.log(`[Event] Opportunity skipped: ${data.reason}`);
  });
  
  runner.on('executionStarted', (opportunity) => {
    console.log('[Event] Execution started');
    console.log(`  Profit: ${opportunity.profit} ETH`);
    console.log(`  MEV Risk: ${opportunity.mevRisk}`);
  });
  
  runner.on('executionComplete', (result) => {
    console.log('[Event] Execution completed successfully!');
    console.log(`  TX Hash: ${result.txHash}`);
    console.log(`  Profit: ${result.profit} ETH`);
    console.log(`  Gas Used: ${result.gasUsed}`);
  });
  
  runner.on('executionFailed', (data) => {
    console.error('[Event] Execution failed:', data.error.message);
  });
  
  runner.on('memoryRecorded', (memory) => {
    // Record in consciousness
    consciousness.recordExecution(memory as any);
    console.log('[Event] Execution recorded in consciousness memory');
  });
  
  // Set up consciousness event listeners
  consciousness.on('patternDetected', (pattern) => {
    console.log(`\n[Consciousness] Pattern detected:`);
    console.log(`  Type: ${pattern.type}`);
    console.log(`  Description: ${pattern.description}`);
    console.log(`  Confidence: ${(pattern.confidence * 100).toFixed(1)}%\n`);
  });
  
  consciousness.on('learningUpdate', (learning) => {
    console.log(`\n[Consciousness] Learning update:`);
    console.log(`  Parameter: ${learning.parameter}`);
    console.log(`  Current: ${learning.currentValue}`);
    console.log(`  Suggested: ${learning.suggestedValue}`);
    console.log(`  Rationale: ${learning.rationale}`);
    console.log(`  Confidence: ${(learning.confidence * 100).toFixed(1)}%\n`);
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\nShutting down gracefully...');
    await runner.stop();
    
    // Print final statistics
    const stats = consciousness.getStatistics();
    console.log('\n=== Final Statistics ===');
    console.log(`Total executions: ${stats.totalExecutions}`);
    console.log(`Successful: ${stats.successfulExecutions}`);
    console.log(`Success rate: ${(stats.successRate * 100).toFixed(1)}%`);
    console.log(`Total profit: ${stats.totalProfit.toFixed(6)} ETH`);
    console.log(`Average profit: ${stats.averageProfit.toFixed(6)} ETH`);
    console.log(`Patterns detected: ${stats.patternsDetected}`);
    
    const patterns = consciousness.getDetectedPatterns();
    if (patterns.length > 0) {
      console.log('\n=== Detected Patterns ===');
      for (const pattern of patterns) {
        console.log(`- ${pattern.description}`);
      }
    }
    
    process.exit(0);
  });
  
  // Start the runner
  console.log('Starting arbitrage runner...\n');
  await runner.start();
  
  // Keep process alive
  console.log('Bot is running. Press Ctrl+C to stop.\n');
}

// Run the example
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
