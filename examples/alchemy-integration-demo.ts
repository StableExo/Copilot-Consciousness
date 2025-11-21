/**
 * Alchemy Integration Example
 * 
 * Demonstrates how to use Alchemy services for enhanced blockchain monitoring,
 * token tracking, and transaction analysis in the consciousness system.
 */

import { createAlchemyServices } from '../src/services/alchemy';
import { AssetTransfersCategory } from 'alchemy-sdk';

async function main() {
  console.log('=== Alchemy Integration Demo ===\n');

  // Initialize all Alchemy services
  const alchemy = createAlchemyServices();

  // Example 1: Get token balances
  console.log('1. Fetching token balances...');
  try {
    const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'; // Example Uniswap V3 Router
    const balances = await alchemy.tokens.getTokenBalances(address);
    console.log(`Found ${balances.length} token balances`);
    balances.slice(0, 3).forEach(balance => {
      console.log(`  - ${balance.contractAddress}: ${balance.tokenBalance}`);
    });
  } catch (error) {
    console.error('Error fetching balances:', error);
  }

  // Example 2: Get token metadata
  console.log('\n2. Fetching token metadata...');
  try {
    const usdcAddress = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'; // USDC on Arbitrum
    const metadata = await alchemy.tokens.getTokenMetadata(usdcAddress);
    console.log('USDC Metadata:');
    console.log(`  Name: ${metadata.name}`);
    console.log(`  Symbol: ${metadata.symbol}`);
    console.log(`  Decimals: ${metadata.decimals}`);
  } catch (error) {
    console.error('Error fetching metadata:', error);
  }

  // Example 3: Get recent transfers
  console.log('\n3. Fetching recent asset transfers...');
  try {
    const transfers = await alchemy.tokens.getAssetTransfers({
      fromBlock: '0x0',
      category: [AssetTransfersCategory.ERC20],
      maxCount: 5,
      order: 'desc',
    });
    console.log(`Found ${transfers.transfers.length} recent transfers`);
    transfers.transfers.forEach(transfer => {
      console.log(`  - From: ${transfer.from} To: ${transfer.to}`);
      console.log(`    Asset: ${transfer.asset} Value: ${transfer.value}`);
    });
  } catch (error) {
    console.error('Error fetching transfers:', error);
  }

  // Example 4: Analyze a transaction
  console.log('\n4. Analyzing transaction...');
  try {
    // Example transaction hash (replace with actual tx hash)
    const txHash = '0x...'; // Placeholder
    if (txHash !== '0x...') {
      const analysis = await alchemy.trace.analyzeFailedTransaction(txHash);
      console.log('Transaction Analysis:');
      console.log(`  Success: ${analysis.success}`);
      console.log(`  Gas Used: ${analysis.gasUsed}`);
      if (analysis.failureReason) {
        console.log(`  Failure Reason: ${analysis.failureReason}`);
      }
    } else {
      console.log('  Skipped: No transaction hash provided');
    }
  } catch (error) {
    console.error('Error analyzing transaction:', error);
  }

  // Example 5: Subscribe to new blocks
  console.log('\n5. Subscribing to new blocks...');
  try {
    let blockCount = 0;
    await alchemy.webhooks.subscribeToBlocks((blockNumber) => {
      console.log(`  New block: ${blockNumber}`);
      blockCount++;
      if (blockCount >= 3) {
        console.log('  Unsubscribing after 3 blocks...');
        alchemy.webhooks.unsubscribeAll();
      }
    });
    
    // Wait for a few blocks
    await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
  } catch (error) {
    console.error('Error with block subscription:', error);
  }

  // Example 6: Monitor pending transactions for arbitrage
  console.log('\n6. Monitoring pending transactions (5 seconds)...');
  try {
    let pendingCount = 0;
    const dexAddresses = [
      '0x1F98431c8aD98523631AE4a59f267346ea31F984', // Uniswap V3 Factory
    ];

    await alchemy.webhooks.monitorDexActivity(dexAddresses, (activity) => {
      pendingCount++;
      console.log(`  Detected DEX activity: ${activity.transaction.hash}`);
    });

    // Monitor for 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log(`  Total pending transactions detected: ${pendingCount}`);
    
    await alchemy.webhooks.unsubscribeAll();
  } catch (error) {
    console.error('Error monitoring transactions:', error);
  }

  // Example 7: Price comparison (if implemented)
  console.log('\n7. Price comparison demo...');
  try {
    const tokenAddress = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'; // USDC
    const dex1Price = 1.0; // Example price from DEX 1
    const dex2Price = 1.002; // Example price from DEX 2
    
    const comparison = await alchemy.prices.comparePrices(
      tokenAddress,
      dex1Price,
      dex2Price
    );
    
    console.log('Price Comparison:');
    console.log(`  DEX 1 Price: $${comparison.dex1Price}`);
    console.log(`  DEX 2 Price: $${comparison.dex2Price}`);
    console.log(`  Spread: ${comparison.spreadPercent.toFixed(4)}%`);
    console.log(`  Profit Potential: ${comparison.profitPotential.toFixed(4)}%`);
  } catch (error) {
    console.error('Error comparing prices:', error);
  }

  console.log('\n=== Demo Complete ===');
}

// Run the demo
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export default main;
