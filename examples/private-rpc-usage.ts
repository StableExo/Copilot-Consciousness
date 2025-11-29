/**
 * Private Order-Flow / MEV-Friendly RPC Usage Example
 * 
 * Demonstrates how to use Flashbots Protect, MEV-Share, and other private
 * transaction relays to reduce MEV exposure for arbitrage transactions.
 * 
 * Benefits:
 * - Keeps transactions out of public mempool
 * - Reduces front-running risk
 * - Direct routing to block builders
 * - Protection from copycat bots
 * 
 * Learn more:
 * - https://docs.flashbots.net/flashbots-protect/overview
 * - https://docs.flashbots.net/flashbots-mev-share/overview
 */

import { ethers, Wallet } from 'ethers';
// NOTE: Bun automatically loads .env files
import {
  PrivateRPCManager,
  createFlashbotsProtectConfig,
  createMEVShareConfig,
} from '../src/execution/PrivateRPCManager';
import {
  PrivateRelayType,
  PrivacyLevel,
  PrivateRelayConfig,
} from '../src/execution/types';


/**
 * Example 1: Basic Flashbots Protect Usage
 * 
 * Simplest way to keep transactions private - use Flashbots Protect RPC
 */
async function example1_BasicFlashbotsProtect() {
  console.log('\n=== Example 1: Basic Flashbots Protect ===\n');

  const provider = new ethers.providers.JsonRpcProvider(
    process.env.ETHEREUM_RPC_URL || 'http://localhost:8545'
  );
  
  const signer = new Wallet(
    process.env.WALLET_PRIVATE_KEY || Wallet.createRandom().privateKey,
    provider
  );

  // Create manager with Flashbots Protect relay
  const manager = new PrivateRPCManager(provider, signer, {
    relays: [
      createFlashbotsProtectConfig(1), // Mainnet
    ],
    defaultPrivacyLevel: PrivacyLevel.BASIC,
    enableFallback: true,
    privateSubmissionTimeout: 30000,
    verboseLogging: true,
  });

  // Submit a transaction privately
  const transaction = {
    to: '0x0000000000000000000000000000000000000001',
    value: ethers.utils.parseEther('0.01'),
    gasLimit: 21000,
  };

  const result = await manager.submitPrivateTransaction(transaction, {
    privacyLevel: PrivacyLevel.BASIC,
    allowPublicFallback: false, // Don't fallback to public mempool
  });

  console.log('Transaction submitted:', {
    success: result.success,
    txHash: result.txHash,
    relayUsed: result.relayUsed,
    publicMempoolVisible: result.metadata?.publicMempoolVisible,
  });
}

/**
 * Example 2: MEV-Share with Revenue Sharing
 * 
 * Use MEV-Share to share MEV revenue with searchers while maintaining privacy
 */
async function example2_MEVShare() {
  console.log('\n=== Example 2: MEV-Share ===\n');

  const provider = new ethers.providers.JsonRpcProvider(
    process.env.ETHEREUM_RPC_URL || 'http://localhost:8545'
  );
  
  const signer = new Wallet(
    process.env.WALLET_PRIVATE_KEY || Wallet.createRandom().privateKey,
    provider
  );

  const manager = new PrivateRPCManager(provider, signer, {
    relays: [
      createMEVShareConfig(process.env.MEV_SHARE_AUTH_KEY),
    ],
    defaultPrivacyLevel: PrivacyLevel.ENHANCED,
    enableFallback: true,
    privateSubmissionTimeout: 30000,
    verboseLogging: true,
  });

  const transaction = {
    to: '0x0000000000000000000000000000000000000001',
    value: ethers.utils.parseEther('0.01'),
    gasLimit: 21000,
  };

  // Submit with MEV-Share hints
  const result = await manager.submitPrivateTransaction(transaction, {
    privacyLevel: PrivacyLevel.ENHANCED,
    mevShareOptions: {
      hints: {
        calldata: false,        // Don't share calldata
        contractAddress: false, // Don't share contract address
        functionSelector: true, // Share function selector
        logs: false,           // Don't share logs
      },
      maxBlockNumber: (await provider.getBlockNumber()) + 5,
    },
    allowPublicFallback: false,
  });

  console.log('MEV-Share submission:', {
    success: result.success,
    bundleHash: result.bundleHash,
    relayUsed: result.relayUsed,
  });
}

/**
 * Example 3: Multi-Relay Setup with Fallback
 * 
 * Configure multiple relays with priority ordering and automatic fallback
 */
async function example3_MultiRelayFallback() {
  console.log('\n=== Example 3: Multi-Relay with Fallback ===\n');

  const provider = new ethers.providers.JsonRpcProvider(
    process.env.ETHEREUM_RPC_URL || 'http://localhost:8545'
  );
  
  const signer = new Wallet(
    process.env.WALLET_PRIVATE_KEY || Wallet.createRandom().privateKey,
    provider
  );

  // Configure multiple relays with different priorities
  const relays: PrivateRelayConfig[] = [
    // Highest priority: MEV-Share
    createMEVShareConfig(process.env.MEV_SHARE_AUTH_KEY),
    
    // Medium priority: Flashbots Protect
    createFlashbotsProtectConfig(1, process.env.FLASHBOTS_AUTH_KEY),
    
    // Low priority: Custom builder RPC
    {
      type: PrivateRelayType.BUILDER_RPC,
      endpoint: process.env.BUILDER_RPC_URL_1 || 'https://builder.example.com',
      authKey: process.env.BUILDER_RPC_AUTH_KEY_1,
      enabled: !!process.env.BUILDER_RPC_URL_1,
      priority: 70,
      name: 'Custom Builder',
    },
  ];

  const manager = new PrivateRPCManager(provider, signer, {
    relays,
    defaultPrivacyLevel: PrivacyLevel.ENHANCED,
    enableFallback: true,
    privateSubmissionTimeout: 30000,
    verboseLogging: true,
  });

  const transaction = {
    to: '0x0000000000000000000000000000000000000001',
    value: ethers.utils.parseEther('0.01'),
    gasLimit: 21000,
  };

  // Submit with fast mode (tries multiple relays simultaneously)
  const result = await manager.submitPrivateTransaction(transaction, {
    fastMode: true, // Try multiple relays in parallel
    maxBlockWait: 5, // Wait up to 5 blocks
    allowPublicFallback: true, // Fallback to public if all private relays fail
  });

  console.log('Multi-relay submission:', {
    success: result.success,
    txHash: result.txHash,
    relayUsed: result.relayUsed,
    relaysTried: result.metadata?.relaysTried,
    inclusionTime: result.metadata?.inclusionTime,
  });

  // Check health of all relays
  const healthStatus = await manager.checkAllRelaysHealth();
  console.log('\nRelay Health Status:');
  healthStatus.forEach((isHealthy, relayType) => {
    console.log(`  ${relayType}: ${isHealthy ? '✓ Healthy' : '✗ Unhealthy'}`);
  });
}

/**
 * Example 4: Flashbots Bundle for Atomic Execution
 * 
 * Create and submit a bundle of transactions that execute atomically
 */
async function example4_FlashbotsBundle() {
  console.log('\n=== Example 4: Flashbots Bundle ===\n');

  const provider = new ethers.providers.JsonRpcProvider(
    process.env.ETHEREUM_RPC_URL || 'http://localhost:8545'
  );
  
  const signer = new Wallet(
    process.env.WALLET_PRIVATE_KEY || Wallet.createRandom().privateKey,
    provider
  );

  const manager = new PrivateRPCManager(provider, signer, {
    relays: [
      createFlashbotsProtectConfig(1, process.env.FLASHBOTS_AUTH_KEY),
    ],
    defaultPrivacyLevel: PrivacyLevel.BASIC,
    enableFallback: false,
    privateSubmissionTimeout: 30000,
    verboseLogging: true,
  });

  // Create multiple transactions for atomic execution
  const transactions = [
    {
      to: '0x0000000000000000000000000000000000000001',
      value: ethers.utils.parseEther('0.01'),
      gasLimit: 21000,
    },
    {
      to: '0x0000000000000000000000000000000000000002',
      value: ethers.utils.parseEther('0.02'),
      gasLimit: 21000,
    },
  ];

  const currentBlock = await provider.getBlockNumber();
  const targetBlock = currentBlock + 1;

  // Create bundle
  const bundle = await manager.createFlashbotsBundle(transactions, targetBlock);

  console.log('Bundle created:', {
    targetBlock,
    transactionCount: bundle.signedTransactions.length,
  });

  // Submit bundle
  const result = await manager.submitFlashbotsBundle(bundle);

  console.log('Bundle submitted:', {
    success: result.success,
    bundleHash: result.bundleHash,
    relayUsed: result.relayUsed,
  });
}

/**
 * Example 5: Statistics and Monitoring
 * 
 * Track relay performance and success rates
 */
async function example5_StatsMonitoring() {
  console.log('\n=== Example 5: Statistics and Monitoring ===\n');

  const provider = new ethers.providers.JsonRpcProvider(
    process.env.ETHEREUM_RPC_URL || 'http://localhost:8545'
  );
  
  const signer = new Wallet(
    process.env.WALLET_PRIVATE_KEY || Wallet.createRandom().privateKey,
    provider
  );

  const manager = new PrivateRPCManager(provider, signer, {
    relays: [
      createFlashbotsProtectConfig(1),
      createMEVShareConfig(),
    ],
    defaultPrivacyLevel: PrivacyLevel.BASIC,
    enableFallback: true,
    privateSubmissionTimeout: 30000,
    verboseLogging: true,
  });

  // Get statistics for all relays
  const allStats = manager.getStats();
  
  console.log('Relay Statistics:');
  allStats.forEach((stats, relayType) => {
    console.log(`\n${relayType}:`);
    console.log(`  Total Submissions: ${stats.totalSubmissions}`);
    console.log(`  Successful: ${stats.successfulInclusions}`);
    console.log(`  Failed: ${stats.failedSubmissions}`);
    console.log(`  Success Rate: ${
      stats.totalSubmissions > 0 
        ? ((stats.successfulInclusions / stats.totalSubmissions) * 100).toFixed(2) 
        : 0
    }%`);
    console.log(`  Avg Inclusion Time: ${stats.avgInclusionTime}ms`);
    console.log(`  Available: ${stats.isAvailable ? 'Yes' : 'No'}`);
  });

  // Get stats for specific relay
  const flashbotsStats = manager.getRelayStats(PrivateRelayType.FLASHBOTS_PROTECT);
  if (flashbotsStats) {
    console.log('\nFlashbots Protect Details:', flashbotsStats);
  }
}

/**
 * Example 6: Privacy Levels Comparison
 * 
 * Demonstrate different privacy levels
 */
async function example6_PrivacyLevels() {
  console.log('\n=== Example 6: Privacy Levels ===\n');

  const privacyLevels = [
    { level: PrivacyLevel.NONE, description: 'Public mempool (no privacy)' },
    { level: PrivacyLevel.BASIC, description: 'Flashbots Protect (basic privacy)' },
    { level: PrivacyLevel.ENHANCED, description: 'MEV-Share (enhanced privacy with hints)' },
    { level: PrivacyLevel.MAXIMUM, description: 'Builder direct (maximum privacy)' },
  ];

  console.log('Available Privacy Levels:\n');
  privacyLevels.forEach(({ level, description }) => {
    console.log(`${level.toUpperCase()}:`);
    console.log(`  ${description}\n`);
  });
}

/**
 * Main execution
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Private Order-Flow / MEV-Friendly RPC Examples           ║');
  console.log('║  Protecting arbitrage transactions from MEV               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    // Run examples (comment out ones you don't want to run)
    
    // await example1_BasicFlashbotsProtect();
    // await example2_MEVShare();
    // await example3_MultiRelayFallback();
    // await example4_FlashbotsBundle();
    await example5_StatsMonitoring();
    await example6_PrivacyLevels();

    console.log('\n✓ Examples completed successfully!\n');
  } catch (error) {
    console.error('\n✗ Error running examples:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  example1_BasicFlashbotsProtect,
  example2_MEVShare,
  example3_MultiRelayFallback,
  example4_FlashbotsBundle,
  example5_StatsMonitoring,
  example6_PrivacyLevels,
};
