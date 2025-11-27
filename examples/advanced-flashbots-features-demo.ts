/**
 * Advanced Flashbots Features Demo
 * 
 * Demonstrates new Flashbots features implemented from docs.flashbots.net:
 * - eth_sendPrivateTransaction (single tx privacy)
 * - eth_cancelPrivateTransaction (cancel private tx)
 * - Transaction Status API integration
 * - replacementUuid for bundle management
 * - Privacy hint recommendations
 * 
 * Based on: https://docs.flashbots.net/
 */

import { ethers } from 'ethers';
import { PrivateRPCManager, createFlashbotsProtectConfig } from '../src/execution';

async function demonstrateAdvancedFlashbotsFeatures() {
  console.log('=== Advanced Flashbots Features Demo ===\n');

  // Setup
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.RPC_URL || 'https://rpc.ankr.com/eth'
  );
  const wallet = new ethers.Wallet(
    process.env.WALLET_PRIVATE_KEY || ethers.Wallet.createRandom().privateKey,
    provider
  );

  const manager = new PrivateRPCManager(provider, wallet, {
    relays: [createFlashbotsProtectConfig(1)], // Mainnet
    defaultPrivacyLevel: 'basic' as any,
    enableFallback: false,
  });

  // ============================================================
  // Feature 1: eth_sendPrivateTransaction
  // ============================================================
  console.log('1️⃣  eth_sendPrivateTransaction - Simple Private Transaction');
  console.log('─────────────────────────────────────────────────────────\n');

  const simpleTransaction = {
    to: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    value: ethers.utils.parseEther('0.001'),
    gasLimit: 21000,
    maxFeePerGas: ethers.utils.parseUnits('50', 'gwei'),
    maxPriorityFeePerGas: ethers.utils.parseUnits('2', 'gwei'),
  };

  console.log('Submitting single private transaction...');
  console.log('Transaction details:');
  console.log(`  To: ${simpleTransaction.to}`);
  console.log(`  Value: ${ethers.utils.formatEther(simpleTransaction.value)} ETH`);
  console.log('');

  const privateResult = await manager.sendPrivateTransaction(simpleTransaction, {
    maxBlockNumber: (await provider.getBlockNumber()) + 5,
    fast: true, // Enable fast mode for quicker inclusion
  });

  if (privateResult.success) {
    console.log('✅ Private transaction submitted successfully!');
    console.log(`   Transaction Hash: ${privateResult.txHash}`);
    console.log(`   Relay Used: ${privateResult.relayUsed}`);
    console.log(`   Public Mempool: ${privateResult.metadata?.publicMempoolVisible ? 'Yes' : 'No'}`);
  } else {
    console.log('❌ Private transaction failed:', privateResult.error);
  }
  console.log('\n');

  // ============================================================
  // Feature 2: Privacy Hint Recommendations
  // ============================================================
  console.log('2️⃣  Privacy Hint Recommendations');
  console.log('─────────────────────────────────────────────────────────\n');

  const scenarios = [
    { type: 'swap', priority: 'high' },
    { type: 'swap', priority: 'medium' },
    { type: 'swap', priority: 'low' },
    { type: 'arbitrage', priority: 'high' },
    { type: 'liquidation', priority: 'medium' },
  ] as const;

  scenarios.forEach(({ type, priority }) => {
    const recommendation = manager.getPrivacyHintRecommendations(type, priority);
    console.log(`📊 ${type.toUpperCase()} (${priority} privacy):`);
    console.log(`   Hints: ${recommendation.hints.join(', ')}`);
    console.log(`   Expected Refund: ${recommendation.expectedRefundPercent}%`);
    console.log(`   Privacy Score: ${recommendation.privacyScore}/100`);
    console.log(`   Reasoning: ${recommendation.reasoning}`);
    console.log('');
  });

  // ============================================================
  // Feature 3: Bundle with replacementUuid
  // ============================================================
  console.log('3️⃣  Bundle with replacementUuid');
  console.log('─────────────────────────────────────────────────────────\n');

  const targetBlock = (await provider.getBlockNumber()) + 3;
  const replacementUuid = ethers.utils.id('my-unique-bundle-id');

  console.log('Creating bundle with replacement UUID...');
  console.log(`  UUID: ${replacementUuid}`);
  console.log(`  Target Block: ${targetBlock}`);
  console.log('');

  // Create bundle transactions
  const tx1 = {
    to: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    value: ethers.utils.parseEther('0.001'),
    gasLimit: 21000,
    maxFeePerGas: ethers.utils.parseUnits('50', 'gwei'),
    maxPriorityFeePerGas: ethers.utils.parseUnits('2', 'gwei'),
    nonce: await wallet.getTransactionCount(),
  };

  const tx2 = {
    to: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    value: ethers.utils.parseEther('0.001'),
    gasLimit: 21000,
    maxFeePerGas: ethers.utils.parseUnits('50', 'gwei'),
    maxPriorityFeePerGas: ethers.utils.parseUnits('2', 'gwei'),
    nonce: (await wallet.getTransactionCount()) + 1,
  };

  const bundle = await manager.createFlashbotsBundle([tx1, tx2], targetBlock);
  
  console.log('Bundle created:');
  console.log(`  Transactions: ${bundle.signedTransactions.length}`);
  console.log(`  Target Block: ${bundle.targetBlockNumber}`);
  console.log('');

  const bundleResult = await manager.submitFlashbotsBundleWithReplacement(
    bundle,
    replacementUuid
  );

  if (bundleResult.success) {
    console.log('✅ Bundle submitted with replacement UUID!');
    console.log(`   Bundle Hash: ${bundleResult.bundleHash}`);
    console.log(`   UUID: ${replacementUuid}`);
    console.log('   ℹ️  You can now replace or cancel this bundle using the UUID');
  } else {
    console.log('❌ Bundle submission failed:', bundleResult.error);
  }
  console.log('\n');

  // ============================================================
  // Feature 4: Transaction Status API
  // ============================================================
  console.log('4️⃣  Transaction Status API');
  console.log('─────────────────────────────────────────────────────────\n');

  if (privateResult.success && privateResult.txHash) {
    console.log('Checking transaction status...');
    console.log(`  Transaction: ${privateResult.txHash}`);
    console.log('');

    const status = await manager.getTransactionStatus(privateResult.txHash);
    
    console.log('Status API Response:');
    console.log(`  Status URL: ${status.statusUrl}`);
    console.log('  ℹ️  Visit this URL to check transaction status');
    console.log('  ℹ️  Status can be: PENDING, INCLUDED, FAILED, CANCELLED, UNKNOWN');
    console.log('');
  }

  // ============================================================
  // Feature 5: Cancel Private Transaction
  // ============================================================
  console.log('5️⃣  Cancel Private Transaction');
  console.log('─────────────────────────────────────────────────────────\n');

  if (privateResult.success && privateResult.txHash) {
    console.log('Attempting to cancel private transaction...');
    console.log(`  Transaction: ${privateResult.txHash}`);
    console.log('');

    // Note: This will only work if the transaction hasn't been included yet
    const cancelled = await manager.cancelPrivateTransaction(privateResult.txHash);
    
    if (cancelled) {
      console.log('✅ Private transaction cancelled successfully!');
      console.log('   ℹ️  Transaction will not be included in any block');
    } else {
      console.log('❌ Cancellation failed');
      console.log('   ℹ️  Transaction may have already been included');
    }
  } else {
    console.log('⏭️  Skipping cancellation (no transaction to cancel)');
  }
  console.log('\n');

  // ============================================================
  // Feature 6: Bundle Cancellation via eth_cancelBundle
  // ============================================================
  console.log('6️⃣  Cancel Bundle');
  console.log('─────────────────────────────────────────────────────────\n');

  if (bundleResult.success && bundleResult.bundleHash) {
    console.log('Attempting to cancel bundle...');
    console.log(`  Bundle Hash: ${bundleResult.bundleHash}`);
    console.log('');

    const bundleCancelled = await manager.cancelBundle(bundleResult.bundleHash);
    
    if (bundleCancelled) {
      console.log('✅ Bundle cancelled successfully!');
      console.log('   ℹ️  Bundle will not be included in any block');
    } else {
      console.log('❌ Bundle cancellation failed');
      console.log('   ℹ️  Bundle may have already been included');
    }
  } else {
    console.log('⏭️  Skipping bundle cancellation (no bundle to cancel)');
  }
  console.log('\n');

  // ============================================================
  // Summary
  // ============================================================
  console.log('=== Summary of New Features ===\n');
  console.log('✅ eth_sendPrivateTransaction - Simple single tx privacy');
  console.log('✅ eth_cancelPrivateTransaction - Cancel pending private txs');
  console.log('✅ Transaction Status API - Check tx status on protect.flashbots.net');
  console.log('✅ replacementUuid - Replace or cancel submitted bundles');
  console.log('✅ Privacy Hint Recommendations - Optimize privacy vs refund tradeoff');
  console.log('✅ Bundle Cancellation - Cancel bundles before inclusion');
  console.log('\n');

  console.log('📚 Documentation:');
  console.log('   - Flashbots Protect: https://docs.flashbots.net/flashbots-protect/quick-start');
  console.log('   - Private Transactions: https://docs.flashbots.net/flashbots-protect/additional-documentation/eth-sendPrivateTransaction');
  console.log('   - Status API: https://docs.flashbots.net/flashbots-protect/additional-documentation/status-api');
  console.log('   - Bundle Management: https://docs.flashbots.net/flashbots-auction/advanced/rpc-endpoint');
  console.log('\n');
}

// Run the demo
if (require.main === module) {
  demonstrateAdvancedFlashbotsFeatures()
    .then(() => {
      console.log('✨ Demo completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Demo failed:', error);
      process.exit(1);
    });
}

export { demonstrateAdvancedFlashbotsFeatures };
