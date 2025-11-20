/**
 * Bundle Cache API Demo
 * 
 * Demonstrates the Flashbots Bundle Cache API for iterative bundle building.
 * Perfect for whitehat recoveries and complex multi-transaction operations.
 * 
 * Documentation: https://docs.flashbots.net/flashbots-protect/additional-documentation/bundle-cache
 */

import { ethers } from 'ethers';
import { PrivateRPCManager } from '../src/execution/PrivateRPCManager';
import { PrivacyLevel } from '../src/execution/types/PrivateRPCTypes';

/**
 * Example 1: Basic Bundle Cache Usage
 * 
 * Create a bundle cache, add transactions one by one, then submit for execution
 */
async function basicBundleCacheExample() {
  console.log('\n=== Example 1: Basic Bundle Cache Usage ===\n');

  // Initialize provider and signer
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
  const signer = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY!, provider);

  // Create PrivateRPCManager
  const privateRPC = new PrivateRPCManager(provider, signer, {
    defaultPrivacyLevel: PrivacyLevel.ENHANCED,
  });

  // Step 1: Create a new bundle cache
  const bundleCache = privateRPC.createBundleCache({
    chainId: 1, // Ethereum mainnet
    fakeFunds: false, // Set to true for testing without real funds
  });

  console.log(`Bundle ID: ${bundleCache.bundleId}`);
  console.log(`RPC URL: ${bundleCache.rpcUrl}`);

  // Step 2: Create and sign transactions
  const tx1 = await signer.populateTransaction({
    to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    value: ethers.utils.parseEther('0.1'),
    gasLimit: 21000,
  });
  const signedTx1 = await signer.signTransaction(tx1);

  const tx2 = await signer.populateTransaction({
    to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    value: ethers.utils.parseEther('0.2'),
    gasLimit: 21000,
  });
  const signedTx2 = await signer.signTransaction(tx2);

  // Step 3: Add transactions to bundle cache
  const addResult1 = await privateRPC.addTransactionToBundleCache(
    bundleCache.bundleId,
    signedTx1
  );
  console.log(`\nAdded transaction 1: ${addResult1.txHash}`);
  console.log(`Transaction count: ${addResult1.txCount}`);

  const addResult2 = await privateRPC.addTransactionToBundleCache(
    bundleCache.bundleId,
    signedTx2
  );
  console.log(`\nAdded transaction 2: ${addResult2.txHash}`);
  console.log(`Transaction count: ${addResult2.txCount}`);

  // Step 4: Retrieve bundle transactions
  const bundleInfo = await privateRPC.getBundleCacheTransactions(bundleCache.bundleId);
  console.log(`\nBundle contains ${bundleInfo.txCount} transactions`);
  console.log('Transaction hashes:', bundleInfo.rawTxs.map(tx => ethers.utils.keccak256(tx)));

  // Step 5: Send the bundle for execution
  const currentBlock = await provider.getBlockNumber();
  const targetBlock = currentBlock + 2;

  console.log(`\nSending bundle to block ${targetBlock}...`);
  const result = await privateRPC.sendCachedBundle(bundleCache.bundleId, targetBlock);

  if (result.success) {
    console.log('✅ Bundle submitted successfully!');
    console.log(`Transaction hash: ${result.txHash}`);
  } else {
    console.log('❌ Bundle submission failed');
  }
}

/**
 * Example 2: Whitehat Recovery Use Case
 * 
 * Use bundle cache to safely recover funds from a compromised wallet
 */
async function whitehатRecoveryExample() {
  console.log('\n=== Example 2: Whitehat Recovery Scenario ===\n');

  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
  const signer = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY!, provider);

  const privateRPC = new PrivateRPCManager(provider, signer, {
    defaultPrivacyLevel: PrivacyLevel.MAXIMUM,
  });

  // Create bundle with fake funds mode for safe transaction creation
  const bundleCache = privateRPC.createBundleCache({
    chainId: 1,
    fakeFunds: true, // Enable fake funds to prepare transactions
  });

  console.log(`Recovery Bundle ID: ${bundleCache.bundleId}`);
  console.log('Fake funds mode: Enabled (balance queries return 100 ETH)');

  // Scenario: Compromised wallet needs to recover ERC20 tokens
  // Transaction 1: Fund compromised wallet with gas (from safe wallet)
  // Transaction 2: Transfer ERC20 tokens out (from compromised wallet)
  // Transaction 3: Transfer remaining ETH out (from compromised wallet)

  console.log('\n📦 Building atomic recovery bundle:');
  console.log('1. Fund compromised wallet with gas');
  console.log('2. Transfer ERC20 tokens to safe wallet');
  console.log('3. Transfer remaining ETH to safe wallet');

  // Note: In real scenario, you would:
  // 1. Connect MetaMask to bundleCache.rpcUrl
  // 2. Sign transactions from compromised wallet
  // 3. Sign gas funding transaction from safe wallet
  // 4. All transactions stay private until bundle execution

  console.log('\n✅ Bundle cache ensures:');
  console.log('   - Compromised private key never leaves secure environment');
  console.log('   - All transactions atomic (all succeed or all fail)');
  console.log('   - No mempool exposure (no frontrunning risk)');
  console.log('   - Can be assembled iteratively over time');
}

/**
 * Example 3: Complex DeFi Strategy
 * 
 * Build a complex multi-step DeFi operation iteratively
 */
async function complexDeFiStrategyExample() {
  console.log('\n=== Example 3: Complex DeFi Strategy ===\n');

  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
  const signer = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY!, provider);

  const privateRPC = new PrivateRPCManager(provider, signer);

  // Create bundle for complex strategy
  const bundleCache = privateRPC.createBundleCache({
    bundleId: 'my-strategy-2024-01-15', // Custom ID for tracking
    chainId: 1,
  });

  console.log(`Strategy Bundle ID: ${bundleCache.bundleId}`);

  console.log('\n📊 Multi-step DeFi strategy:');
  console.log('1. Flash loan USDC from Aave');
  console.log('2. Swap USDC → ETH on Uniswap');
  console.log('3. Supply ETH to Compound');
  console.log('4. Borrow USDC from Compound');
  console.log('5. Repay Aave flash loan');
  console.log('6. Keep profit');

  console.log('\n💡 Benefits of Bundle Cache:');
  console.log('   - Build strategy incrementally');
  console.log('   - Test each transaction before submission');
  console.log('   - Atomic execution (all or nothing)');
  console.log('   - MEV protection via Flashbots');
  console.log('   - Can cancel if conditions change');
}

/**
 * Example 4: Bundle Cache with MetaMask Integration
 * 
 * Shows how to integrate with wallet providers
 */
async function metaMaskIntegrationExample() {
  console.log('\n=== Example 4: MetaMask Integration ===\n');

  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
  const signer = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY!, provider);

  const privateRPC = new PrivateRPCManager(provider, signer);

  const bundleCache = privateRPC.createBundleCache();

  console.log('🦊 MetaMask Integration Steps:\n');
  console.log('1. Create bundle cache and get RPC URL');
  console.log(`   RPC URL: ${bundleCache.rpcUrl}`);
  console.log(`   Chain ID: ${bundleCache.chainId}`);
  
  console.log('\n2. Add custom RPC to MetaMask:');
  console.log('   - Network Name: Flashbots Bundle Cache');
  console.log(`   - RPC URL: ${bundleCache.rpcUrl}`);
  console.log('   - Chain ID: 1');
  
  console.log('\n3. Sign transactions via MetaMask');
  console.log('   - Transactions are cached, not broadcast');
  console.log('   - Can sign multiple transactions');
  
  console.log('\n4. Retrieve and submit bundle');
  console.log('   - Use getBundleCacheTransactions() to get all transactions');
  console.log('   - Use sendCachedBundle() to submit atomically');
  
  console.log('\n✅ Your private keys never leave MetaMask!');
}

/**
 * Main execution
 */
async function main() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║       Flashbots Bundle Cache API - Demo Suite        ║');
  console.log('╚═══════════════════════════════════════════════════════╝');

  try {
    // Run examples (comment out if no RPC configured)
    // await basicBundleCacheExample();
    
    // Educational examples (no RPC needed)
    await whitehатRecoveryExample();
    await complexDeFiStrategyExample();
    await metaMaskIntegrationExample();

    console.log('\n✅ Demo completed successfully!');
    console.log('\n📚 Learn more:');
    console.log('   - https://docs.flashbots.net/flashbots-protect/additional-documentation/bundle-cache');
    console.log('   - See docs/BUNDLE_CACHE_API.md for complete guide');
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  basicBundleCacheExample,
  whitehатRecoveryExample,
  complexDeFiStrategyExample,
  metaMaskIntegrationExample,
};
