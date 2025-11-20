/**
 * Rollup-Boost Intelligence Demo
 * 
 * Demonstrates integration with Flashbots Rollup-Boost for L2 chains:
 * - Flashblocks configuration and monitoring
 * - OP Stack integration
 * - Sub-second confirmation tracking
 * - L2 performance optimization
 * 
 * New feature introduced 2024-2025
 */

import { ethers } from 'ethers';
import {
  RollupBoostIntelligence,
  L2Network,
  RollupExtension,
} from '../src/intelligence/flashbots';

async function main() {
  console.log('=== Rollup-Boost Intelligence Demo ===\n');

  // Initialize provider (use Base or Optimism in production)
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.L2_RPC_URL || 'https://mainnet.base.org'
  );

  // === DEMO 1: Initialize with Flashblocks ===
  console.log('--- Demo 1: Rollup-Boost Initialization ---');

  const rollupBoost = new RollupBoostIntelligence(
    provider,
    L2Network.OP_STACK,
    {
      enabled: true,
      targetConfirmationMs: 250, // 250ms target
      maxBufferBlocks: 10,
      enablePriorityOrdering: true,
    },
    {
      executionEngineUrl: 'http://localhost:8551', // op-geth
      proposerNodeUrl: 'http://localhost:9545', // op-node
      jwtSecret: 'your-jwt-secret-here-min-32-chars',
      builderRpcUrl: 'http://localhost:8545',
      enableTracing: true,
      enableMetrics: true,
    }
  );

  console.log('✅ Rollup-Boost Intelligence initialized for OP Stack');
  console.log('✅ Flashblocks enabled with 250ms target confirmation\n');

  // Check network support
  const isSupported = RollupBoostIntelligence.isSupported(L2Network.OP_STACK);
  console.log(`OP Stack support: ${isSupported ? '✅' : '❌'}\n`);

  // === DEMO 2: Enable Rollup Extensions ===
  console.log('--- Demo 2: Rollup Extensions ---');

  rollupBoost.enableExtension(RollupExtension.PERFORMANCE);
  console.log('✅ Enabled PERFORMANCE extension');

  rollupBoost.enableExtension(RollupExtension.DECENTRALIZATION);
  console.log('✅ Enabled DECENTRALIZATION extension');

  rollupBoost.enableExtension(RollupExtension.PROGRAMMABILITY);
  console.log('✅ Enabled PROGRAMMABILITY extension\n');

  // === DEMO 3: Simulate Flashblock Production ===
  console.log('--- Demo 3: Flashblock Production Simulation ---');

  console.log('\nSimulating flashblock production...');
  
  for (let i = 1; i <= 10; i++) {
    const txCount = Math.floor(Math.random() * 50) + 10; // 10-60 txs
    const builder = i % 2 === 0 ? 'flashbots-l2-builder' : 'beaverbuild-l2';
    
    const flashblock = rollupBoost.simulateFlashblock(
      1000000 + i,
      txCount,
      builder
    );
    
    const meetsTarget = rollupBoost.meetsConfirmationTarget(flashblock.confirmationTimeMs);
    const emoji = meetsTarget ? '✅' : '⚠️';
    
    console.log(
      `${emoji} Block ${flashblock.blockNumber}: ${flashblock.confirmationTimeMs.toFixed(0)}ms ` +
      `(${txCount} txs, ${flashblock.builder})`
    );
  }
  console.log();

  // === DEMO 4: Performance Metrics ===
  console.log('--- Demo 4: Performance Metrics ---');

  const metrics = rollupBoost.getPerformanceMetrics();
  
  console.log('\nFlashblock Performance:');
  console.log(`- Average Confirmation: ${metrics.avgConfirmationTimeMs.toFixed(0)}ms`);
  console.log(`- Min Confirmation: ${metrics.minConfirmationTimeMs.toFixed(0)}ms`);
  console.log(`- Max Confirmation: ${metrics.maxConfirmationTimeMs.toFixed(0)}ms`);
  console.log(`- Total Blocks: ${metrics.totalBlocks}`);
  console.log(`- Total Transactions: ${metrics.totalTransactions}`);
  console.log(`- Avg Tx/Block: ${metrics.avgTxPerBlock.toFixed(1)}`);
  console.log(`- L1 Finalization Rate: ${(metrics.l1FinalizationRate * 100).toFixed(1)}%`);
  console.log(`- Uptime: ${(metrics.uptimePercentage * 100).toFixed(1)}%\n`);

  // === DEMO 5: Configuration Recommendations ===
  console.log('--- Demo 5: Dynamic Configuration Recommendations ---');

  const recommendation = rollupBoost.recommendFlashblockConfig();
  console.log('\nRecommended Configuration:');
  console.log(`- Target Confirmation: ${recommendation.targetConfirmationMs}ms`);
  console.log(`- Reasoning: ${recommendation.reasoning}\n`);

  // === DEMO 6: Inclusion Time Estimation ===
  console.log('--- Demo 6: Transaction Inclusion Estimation ---');

  // Standard transaction
  const standardGas = BigInt(0.001e9); // 0.001 gwei
  const standardEstimate = rollupBoost.estimateInclusionTime(standardGas);
  console.log('\nStandard Transaction (0.001 gwei):');
  console.log(`- Estimated Inclusion: ${standardEstimate.estimatedMs.toFixed(0)}ms`);
  console.log(`- Confidence: ${(standardEstimate.confidence * 100).toFixed(0)}%`);

  // Priority transaction
  const priorityGas = BigInt(0.01e9); // 0.01 gwei
  const priorityFee = BigInt(0.005e9); // 0.005 gwei priority
  const priorityEstimate = rollupBoost.estimateInclusionTime(priorityGas, priorityFee);
  console.log('\nPriority Transaction (0.01 gwei + 0.005 priority):');
  console.log(`- Estimated Inclusion: ${priorityEstimate.estimatedMs.toFixed(0)}ms`);
  console.log(`- Confidence: ${(priorityEstimate.confidence * 100).toFixed(0)}%`);
  console.log();

  // === DEMO 7: Optimal Gas Price Calculation ===
  console.log('--- Demo 7: Optimal Gas Price for Target Time ---');

  const targets = [200, 250, 300, 500];
  console.log('\nOptimal Gas Prices:');
  
  for (const targetMs of targets) {
    const optimalGas = rollupBoost.calculateOptimalGasPrice(targetMs);
    const gweiPrice = Number(optimalGas) / 1e9;
    console.log(`- ${targetMs}ms target: ${gweiPrice.toFixed(4)} gwei`);
  }
  console.log();

  // === DEMO 8: OP-rbuilder Configuration ===
  console.log('--- Demo 8: OP-rbuilder Configuration ---');

  const opBuilderConfig = rollupBoost.generateOPRBuilderConfig(
    8453, // Base chain ID
    'http://localhost:5052', // Consensus client
    'http://localhost:9545', // op-node
    'your-jwt-secret-32-chars-minimum'
  );

  console.log('\nGenerated OP-rbuilder Configuration:');
  console.log(`- Chain ID: ${opBuilderConfig.chainId}`);
  console.log(`- L1 Consensus: ${opBuilderConfig.l1ConsensusUrl}`);
  console.log(`- Sequencer: ${opBuilderConfig.sequencerUrl}`);
  console.log(`- Flashblocks: ${opBuilderConfig.enableFlashblocks ? 'Enabled' : 'Disabled'}`);
  console.log(`- Flashtestations: ${opBuilderConfig.enableFlashtestations ? 'Enabled' : 'Disabled'}`);
  console.log();

  // === DEMO 9: Sidecar Validation ===
  console.log('--- Demo 9: Builder Sidecar Configuration Validation ---');

  const validation = rollupBoost.validateSidecarConfig();
  
  console.log('\nSidecar Configuration Validation:');
  console.log(`- Valid: ${validation.valid ? '✅' : '❌'}`);
  
  if (validation.errors.length > 0) {
    console.log('\nErrors:');
    validation.errors.forEach(err => console.log(`  ❌ ${err}`));
  }
  
  if (validation.warnings.length > 0) {
    console.log('\nWarnings:');
    validation.warnings.forEach(warn => console.log(`  ⚠️  ${warn}`));
  }
  console.log();

  // === DEMO 10: Complete Statistics ===
  console.log('--- Demo 10: Complete Statistics ---');

  const stats = rollupBoost.getStatistics();
  
  console.log('\nRollup-Boost Statistics:');
  console.log(`- Network: ${stats.network}`);
  console.log(`- Flashblocks Enabled: ${stats.flashblocksEnabled ? 'Yes' : 'No'}`);
  console.log(`- Active Extensions: ${stats.activeExtensions.join(', ')}`);
  console.log('\nPerformance:');
  console.log(`- Avg Confirmation: ${stats.performanceMetrics.avgConfirmationTimeMs.toFixed(0)}ms`);
  console.log(`- Total Blocks: ${stats.performanceMetrics.totalBlocks}`);
  console.log(`- Total Transactions: ${stats.performanceMetrics.totalTransactions}`);
  
  if (stats.recentBlocks.length > 0) {
    console.log(`\nMost Recent Block:`);
    const recent = stats.recentBlocks[stats.recentBlocks.length - 1];
    console.log(`- Number: ${recent.blockNumber}`);
    console.log(`- Confirmation: ${recent.confirmationTimeMs.toFixed(0)}ms`);
    console.log(`- Transactions: ${recent.txCount}`);
    console.log(`- Builder: ${recent.builder}`);
  }
  console.log();

  // === DEMO 11: Practical Example ===
  console.log('--- Demo 11: Practical Integration Example ---');

  console.log('\nScenario: Time-sensitive DeFi arbitrage on Base L2');
  console.log('Target: Sub-200ms confirmation for competitive advantage\n');

  const targetTime = 200;
  const optimalGasForArb = rollupBoost.calculateOptimalGasPrice(targetTime);
  const arbEstimate = rollupBoost.estimateInclusionTime(optimalGasForArb);
  
  console.log('Arbitrage Transaction Setup:');
  console.log(`- Target Time: ${targetTime}ms`);
  console.log(`- Recommended Gas: ${(Number(optimalGasForArb) / 1e9).toFixed(4)} gwei`);
  console.log(`- Expected Inclusion: ${arbEstimate.estimatedMs.toFixed(0)}ms`);
  console.log(`- Confidence: ${(arbEstimate.confidence * 100).toFixed(0)}%`);
  
  if (arbEstimate.estimatedMs <= targetTime) {
    console.log('✅ Expected to meet time requirements!');
  } else {
    console.log('⚠️  May miss timing window - consider higher gas price');
  }
  console.log();

  console.log('=== Demo Complete ===');
  console.log('\nKey Takeaways:');
  console.log('✓ Flashblocks enable sub-second confirmations (200-250ms)');
  console.log('✓ OP Stack integration via Rollup-Boost sidecar');
  console.log('✓ Dynamic gas pricing for target confirmation times');
  console.log('✓ Rollup extensions provide modular upgrades');
  console.log('✓ Performance metrics guide optimization decisions');
  console.log('✓ Critical for time-sensitive L2 applications (DeFi, gaming)');
}

// Run the demo
main().catch(console.error);
