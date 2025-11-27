/**
 * Flashbots Intelligence Integration Example
 * 
 * Demonstrates advanced Flashbots features:
 * - Bundle simulation before submission
 * - Builder reputation tracking
 * - MEV refund monitoring
 * - Bundle optimization recommendations
 * - Profit-aware bundle submission
 * 
 * Based on Flashbots documentation: https://docs.flashbots.net/
 */

import { ethers } from 'ethers';
import { 
  PrivateRPCManager, 
  createFlashbotsProtectConfig,
  PrivacyLevel,
} from '../src/execution';
import { FlashbotsIntelligence } from '../src/intelligence/flashbots';

async function main() {
  console.log('=== Flashbots Intelligence Integration Demo ===\n');

  // Setup provider and wallet
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.ETHEREUM_RPC_URL || 'http://localhost:8545'
  );
  const wallet = new ethers.Wallet(
    process.env.WALLET_PRIVATE_KEY || ethers.Wallet.createRandom().privateKey,
    provider
  );

  console.log(`Wallet address: ${wallet.address}\n`);

  // Initialize Flashbots Intelligence
  const intelligence = new FlashbotsIntelligence(provider, {
    minBuilderSuccessRate: 0.75,
    reputationWindowBlocks: 7200, // ~24 hours
    enableRefundTracking: true,
    minTrackableMEV: BigInt(0.01e18), // 0.01 ETH
  });

  // Initialize Private RPC Manager with Flashbots
  const manager = new PrivateRPCManager(provider, wallet, {
    relays: [
      createFlashbotsProtectConfig(1), // Mainnet
    ],
    defaultPrivacyLevel: PrivacyLevel.BASIC,
    enableFallback: false,
    privateSubmissionTimeout: 30000,
    verboseLogging: true,
  });

  console.log('✅ Flashbots Intelligence initialized\n');

  // =========================================================================
  // Example 1: Create and Simulate Bundle
  // =========================================================================
  console.log('=== Example 1: Bundle Simulation ===\n');

  // Get current block number
  const currentBlock = await provider.getBlockNumber();
  const targetBlock = currentBlock + 1;

  console.log(`Current block: ${currentBlock}`);
  console.log(`Target block: ${targetBlock}\n`);

  // Create example transactions (replace with real transactions)
  const tx1 = {
    to: '0x0000000000000000000000000000000000000001',
    value: ethers.utils.parseEther('0.01'),
    gasLimit: 21000,
    maxFeePerGas: ethers.utils.parseUnits('50', 'gwei'),
    maxPriorityFeePerGas: ethers.utils.parseUnits('2', 'gwei'),
    nonce: await wallet.getTransactionCount(),
    chainId: 1,
    type: 2,
  };

  const tx2 = {
    to: '0x0000000000000000000000000000000000000002',
    value: ethers.utils.parseEther('0.005'),
    gasLimit: 21000,
    maxFeePerGas: ethers.utils.parseUnits('50', 'gwei'),
    maxPriorityFeePerGas: ethers.utils.parseUnits('2', 'gwei'),
    nonce: (await wallet.getTransactionCount()) + 1,
    chainId: 1,
    type: 2,
  };

  // Create bundle
  const bundle = await manager.createFlashbotsBundle(
    [tx1, tx2],
    targetBlock
  );

  console.log(`Bundle created with ${bundle.signedTransactions.length} transactions`);

  // Simulate the bundle
  console.log('Simulating bundle...');
  const simulation = await manager.simulateBundle(bundle);

  if (simulation.success) {
    console.log('✅ Simulation successful!');
    console.log(`  Total gas used: ${simulation.totalGasUsed}`);
    console.log(`  Coinbase diff: ${simulation.coinbaseDiff || '0'} wei`);
    console.log(`  Gas fees: ${simulation.gasFees || '0'} wei`);
    
    if (simulation.results) {
      console.log(`  Transaction results:`);
      simulation.results.forEach((result, i) => {
        console.log(`    Tx ${i + 1}: ${result.revert ? '❌ REVERTED' : '✅ Success'} - Gas: ${result.gasUsed}`);
        if (result.revertReason) {
          console.log(`      Revert reason: ${result.revertReason}`);
        }
      });
    }
  } else {
    console.log('❌ Simulation failed:', simulation.error);
  }

  console.log('');

  // =========================================================================
  // Example 2: Bundle Optimization Analysis
  // =========================================================================
  console.log('=== Example 2: Bundle Optimization ===\n');

  const optimization = intelligence.analyzeBundleSimulation(simulation);

  console.log(`Should optimize: ${optimization.shouldOptimize ? 'Yes' : 'No'}`);
  console.log('Recommendations:');
  optimization.recommendations.forEach((rec, i) => {
    console.log(`  ${i + 1}. ${rec}`);
  });

  if (optimization.recommendedBuilders && optimization.recommendedBuilders.length > 0) {
    console.log('\nRecommended builders:', optimization.recommendedBuilders.join(', '));
  }

  console.log('');

  // =========================================================================
  // Example 3: Inclusion Probability Estimate
  // =========================================================================
  console.log('=== Example 3: Inclusion Probability ===\n');

  const inclusionProb = intelligence.estimateBundleInclusionProbability(
    bundle,
    simulation
  );

  console.log(`Estimated inclusion probability: ${(inclusionProb * 100).toFixed(1)}%`);
  console.log('');

  // =========================================================================
  // Example 4: Submit Bundle with Validation
  // =========================================================================
  console.log('=== Example 4: Submit Bundle with Validation ===\n');

  // Only submit if profitable (min 0.001 ETH profit)
  const minProfitWei = BigInt(0.001e18);

  console.log('Submitting bundle with validation...');
  console.log(`Minimum profit required: ${ethers.utils.formatEther(minProfitWei)} ETH`);

  // NOTE: This will fail in dry-run mode without real Flashbots endpoint
  try {
    const result = await manager.submitBundleWithValidation(bundle, minProfitWei);

    if (result.success) {
      console.log('✅ Bundle submitted successfully!');
      console.log(`  Bundle hash: ${result.bundleHash}`);
      console.log(`  Relay used: ${result.relayUsed}`);

      // Wait for inclusion
      if (result.bundleHash) {
        console.log('\nWaiting for bundle inclusion (max 25 blocks)...');
        const status = await manager.waitForBundleInclusion(result.bundleHash, 25);

        if (status?.isIncluded) {
          console.log(`✅ Bundle included in block ${status.blockNumber}!`);
          
          // Record builder success
          intelligence.recordBundleResult(
            'flashbots-builder',
            true,
            (status.blockNumber || 0) - currentBlock
          );
        } else {
          console.log('❌ Bundle not included within timeout');
          intelligence.recordBundleResult('flashbots-builder', false, 0);
        }
      }
    } else {
      console.log('❌ Bundle submission failed:', result.error);
    }
  } catch (error) {
    console.log('⚠️  Bundle submission error (expected in dry-run):', error.message);
  }

  console.log('');

  // =========================================================================
  // Example 5: Builder Reputation Tracking
  // =========================================================================
  console.log('=== Example 5: Builder Reputation ===\n');

  // Simulate some builder data
  intelligence.recordBundleResult('builder-a', true, 1);
  intelligence.recordBundleResult('builder-a', true, 2);
  intelligence.recordBundleResult('builder-a', false, 0);
  intelligence.recordBundleResult('builder-b', true, 1);
  intelligence.recordBundleResult('builder-b', true, 1);
  intelligence.recordBundleResult('builder-b', true, 3);
  intelligence.recordBundleResult('builder-c', false, 0);
  intelligence.recordBundleResult('builder-c', false, 0);

  const recommendedBuilders = intelligence.getRecommendedBuilders(3);
  console.log('Top recommended builders:', recommendedBuilders);

  const allReputations = intelligence.getAllReputations();
  console.log('\nAll builder reputations:');
  allReputations.forEach(rep => {
    console.log(`  ${rep.builder}:`);
    console.log(`    Success rate: ${(rep.successRate * 100).toFixed(1)}%`);
    console.log(`    Avg inclusion: ${rep.avgInclusionBlocks.toFixed(1)} blocks`);
    console.log(`    Status: ${rep.isActive ? '✅ Active' : '❌ Inactive'}`);
  });

  console.log('');

  // =========================================================================
  // Example 6: MEV Refund Tracking
  // =========================================================================
  console.log('=== Example 6: MEV Refund Tracking ===\n');

  // Simulate MEV refunds
  intelligence.recordMEVRefund({
    txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    bundleHash: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
    mevExtracted: (0.1e18).toString(),
    refundAmount: (0.09e18).toString(), // 90% refund
    blockNumber: currentBlock,
    timestamp: Math.floor(Date.now() / 1000),
  });

  intelligence.recordMEVRefund({
    txHash: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba098765',
    mevExtracted: (0.05e18).toString(),
    refundAmount: (0.045e18).toString(), // 90% refund
    blockNumber: currentBlock + 1,
    timestamp: Math.floor(Date.now() / 1000) + 12,
  });

  const refundStats = intelligence.getTotalMEVRefunds();
  console.log('MEV Refund Statistics:');
  console.log(`  Total MEV extracted: ${ethers.utils.formatEther(refundStats.totalExtracted)} ETH`);
  console.log(`  Total refunded: ${ethers.utils.formatEther(refundStats.totalRefunded)} ETH`);
  console.log(`  Refund rate: ${(refundStats.refundRate * 100).toFixed(1)}%`);

  const recentRefunds = intelligence.getRecentRefunds(5);
  console.log(`\nRecent refunds (${recentRefunds.length}):`);
  recentRefunds.forEach((refund, i) => {
    console.log(`  ${i + 1}. Block ${refund.blockNumber}: ${ethers.utils.formatEther(refund.refundAmount)} ETH`);
  });

  console.log('');

  // =========================================================================
  // Example 7: Optimal Gas Price Calculation
  // =========================================================================
  console.log('=== Example 7: Optimal Gas Price ===\n');

  try {
    const optimalGasPrice = await intelligence.calculateOptimalGasPrice(1); // immediate inclusion
    console.log(`Optimal gas price for 1-block inclusion: ${ethers.utils.formatUnits(optimalGasPrice, 'gwei')} gwei`);

    const optimalGasPrice5 = await intelligence.calculateOptimalGasPrice(5); // 5-block inclusion
    console.log(`Optimal gas price for 5-block inclusion: ${ethers.utils.formatUnits(optimalGasPrice5, 'gwei')} gwei`);
  } catch (error) {
    console.log('⚠️  Could not calculate optimal gas price:', error.message);
  }

  console.log('');

  // =========================================================================
  // Example 8: Bundle Cancellation
  // =========================================================================
  console.log('=== Example 8: Bundle Cancellation ===\n');

  // Simulate bundle hash
  const mockBundleHash = '0x' + '0'.repeat(64);
  
  console.log('Attempting to cancel bundle...');
  try {
    const cancelled = await manager.cancelBundle(mockBundleHash);
    console.log(cancelled ? '✅ Bundle cancelled' : '❌ Cancellation failed');
  } catch (error) {
    console.log('⚠️  Bundle cancellation error (expected in dry-run):', error.message);
  }

  console.log('');

  // =========================================================================
  // Example 9: Overall Statistics
  // =========================================================================
  console.log('=== Example 9: Statistics Summary ===\n');

  const stats = intelligence.getStatistics();
  console.log('Builder Statistics:');
  console.log(`  Total builders: ${stats.builders.total}`);
  console.log(`  Active builders: ${stats.builders.active}`);
  console.log(`  Avg success rate: ${(stats.builders.avgSuccessRate * 100).toFixed(1)}%`);

  console.log('\nRefund Statistics:');
  console.log(`  Total refunds tracked: ${stats.refunds.total}`);
  console.log(`  Total MEV extracted: ${stats.refunds.totalExtracted} ETH`);
  console.log(`  Total refunded: ${stats.refunds.totalRefunded} ETH`);
  console.log(`  Refund rate: ${(stats.refunds.refundRate * 100).toFixed(1)}%`);

  const managerStats = manager.getStats();
  console.log('\nRelay Statistics:');
  managerStats.forEach((stat, relay) => {
    console.log(`  ${relay}:`);
    console.log(`    Submissions: ${stat.totalSubmissions}`);
    console.log(`    Successes: ${stat.successfulInclusions}`);
    console.log(`    Failures: ${stat.failedSubmissions}`);
    console.log(`    Simulations: ${stat.totalSimulations || 0}`);
    console.log(`    Cancellations: ${stat.totalCancellations || 0}`);
  });

  console.log('\n=== Demo Complete ===');
}

// Run the example
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
