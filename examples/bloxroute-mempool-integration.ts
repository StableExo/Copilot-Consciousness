/**
 * bloXroute Mempool Stream Integration Example
 * 
 * This example demonstrates how to integrate bloXroute mempool streaming
 * with TheWarden's arbitrage opportunity detection system.
 * 
 * Prerequisites:
 * - bloXroute API key (Professional tier or higher)
 * - Environment variables configured (.env)
 * - TheWarden arbitrage detection infrastructure
 * 
 * Usage:
 *   node --import tsx examples/bloxroute-mempool-integration.ts
 */

import { BloXrouteMempoolStream, DEX_PROTOCOLS, type BloXrouteTx } from '../src/execution/relays/BloXrouteMempoolStream';
import { BloXrouteNetwork, BloXrouteRegion, StreamType } from '../src/execution/relays/BloXrouteClient';
import { logger } from '../src/utils/logger';

/**
 * Configuration from environment
 */
const config = {
  apiKey: process.env.BLOXROUTE_API_KEY || '',
  network: (process.env.BLOXROUTE_NETWORK as BloXrouteNetwork) || BloXrouteNetwork.ETHEREUM,
  region: (process.env.BLOXROUTE_REGION as BloXrouteRegion) || BloXrouteRegion.VIRGINIA,
  enableVerbose: process.env.BLOXROUTE_VERBOSE === 'true',
};

/**
 * Validate configuration
 */
if (!config.apiKey) {
  console.error('Error: BLOXROUTE_API_KEY environment variable is required');
  console.error('Please set it in your .env file or environment');
  process.exit(1);
}

/**
 * Example 1: Monitor DEX Swaps for Arbitrage Opportunities
 * 
 * This example shows how to:
 * - Subscribe to mempool transactions
 * - Filter for DEX swap transactions
 * - Detect potential arbitrage opportunities
 * - Track performance metrics
 */
async function example1_DexSwapMonitoring() {
  console.log('\n=== Example 1: DEX Swap Monitoring ===\n');
  
  const stream = new BloXrouteMempoolStream({
    apiKey: config.apiKey,
    network: config.network,
    region: config.region,
    streamType: StreamType.PENDING_TXS, // Recommended for accuracy
    verbose: config.enableVerbose,
    
    // Filter for DEX swaps on major protocols
    filters: {
      protocols: [
        DEX_PROTOCOLS.UNISWAP_V3,
        DEX_PROTOCOLS.UNISWAP_V2,
        DEX_PROTOCOLS.SUSHISWAP,
      ],
      minValue: BigInt('100000000000000000'), // Min 0.1 ETH
    },
    
    // Callback for DEX swaps
    onDexSwap: async (tx: BloXrouteTx) => {
      console.log(`[DEX SWAP] ${tx.tx_hash}`);
      console.log(`  From: ${tx.from}`);
      console.log(`  To: ${tx.to}`);
      console.log(`  Value: ${tx.value}`);
      console.log(`  Method: ${tx.method_id}`);
      
      // Here you would:
      // 1. Decode the swap transaction
      // 2. Extract token addresses and amounts
      // 3. Check for arbitrage opportunities across other DEXes
      // 4. Calculate potential profit
      // 5. Submit counter-transaction if profitable
      
      // Example (pseudo-code):
      // const opportunity = await detectArbitrageOpportunity(tx);
      // if (opportunity && opportunity.netProfit > MIN_PROFIT) {
      //   await executeArbitrage(opportunity);
      // }
    },
    
    // Error handler
    onError: (error: Error) => {
      console.error('Stream error:', error.message);
    },
  });
  
  try {
    // Start streaming
    await stream.start();
    console.log('✅ Mempool stream started');
    console.log(`   Network: ${config.network}`);
    console.log(`   Region: ${config.region}`);
    console.log(`   Filters: DEX swaps (Uniswap V2/V3, SushiSwap) with value >= 0.1 ETH`);
    
    // Run for 5 minutes (example duration)
    await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
    
    // Stop streaming and print metrics
    await stream.stop();
    
    const metrics = stream.getMetrics();
    console.log('\n=== Performance Metrics ===');
    console.log(`Total transactions: ${metrics.totalTransactions}`);
    console.log(`DEX swaps detected: ${metrics.dexSwaps}`);
    console.log(`Large transfers: ${metrics.largeTransfers}`);
    console.log(`Filtered out: ${metrics.filtered}`);
    console.log(`Avg processing time: ${metrics.avgProcessingTime.toFixed(2)}ms`);
    console.log(`Transactions/second: ${metrics.transactionsPerSecond.toFixed(2)}`);
    console.log(`Uptime: ${metrics.uptime}s`);
    console.log(`Errors: ${metrics.errors}`);
    
  } catch (error) {
    console.error('Error in example 1:', error);
  }
}

/**
 * Example 2: Large Transfer Monitoring
 * 
 * This example shows how to monitor large ETH/token transfers
 * which might indicate whale movements or market impacts.
 */
async function example2_LargeTransferMonitoring() {
  console.log('\n=== Example 2: Large Transfer Monitoring ===\n');
  
  const largeTransfers: BloXrouteTx[] = [];
  
  const stream = new BloXrouteMempoolStream({
    apiKey: config.apiKey,
    network: config.network,
    region: config.region,
    streamType: StreamType.PENDING_TXS,
    verbose: config.enableVerbose,
    
    // Filter for large transfers (>= 10 ETH)
    filters: {
      minValue: BigInt('10000000000000000000'), // 10 ETH
    },
    
    // Callback for large transfers
    onLargeTransfer: async (tx: BloXrouteTx, value: bigint) => {
      console.log(`[LARGE TRANSFER] ${tx.tx_hash}`);
      console.log(`  Value: ${(Number(value) / 1e18).toFixed(4)} ETH`);
      console.log(`  From: ${tx.from}`);
      console.log(`  To: ${tx.to}`);
      
      largeTransfers.push(tx);
      
      // Here you might:
      // 1. Check if this is a DEX liquidity add/remove
      // 2. Monitor for potential market impact
      // 3. Adjust trading strategy based on whale movements
    },
    
    onError: (error: Error) => {
      console.error('Stream error:', error.message);
    },
  });
  
  try {
    await stream.start();
    console.log('✅ Large transfer monitoring started');
    console.log(`   Threshold: >= 10 ETH`);
    
    // Run for 2 minutes
    await new Promise(resolve => setTimeout(resolve, 2 * 60 * 1000));
    
    await stream.stop();
    
    console.log(`\nDetected ${largeTransfers.length} large transfers`);
    
  } catch (error) {
    console.error('Error in example 2:', error);
  }
}

/**
 * Example 3: Custom Filter Expression
 * 
 * This example shows how to use custom bloXroute filter expressions
 * for advanced transaction filtering.
 */
async function example3_CustomFilters() {
  console.log('\n=== Example 3: Custom Filter Expression ===\n');
  
  const stream = new BloXrouteMempoolStream({
    apiKey: config.apiKey,
    network: config.network,
    region: config.region,
    streamType: StreamType.PENDING_TXS,
    verbose: config.enableVerbose,
    
    // Custom filter: High-value transactions to USDC contract with high gas
    filters: {
      customFilter: 
        "({to} == '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48') " + // USDC contract
        "AND ({value} > 1000000000000000000) " + // > 1 ETH
        "AND ({gas_price} > 50000000000)", // > 50 gwei
    },
    
    onTransaction: async (tx: BloXrouteTx) => {
      console.log(`[FILTERED TX] ${tx.tx_hash}`);
      console.log(`  To: ${tx.to} (USDC)`);
      console.log(`  Value: ${tx.value}`);
      console.log(`  Gas Price: ${tx.gas_price}`);
    },
    
    onError: (error: Error) => {
      console.error('Stream error:', error.message);
    },
  });
  
  try {
    await stream.start();
    console.log('✅ Custom filter monitoring started');
    console.log('   Filter: USDC transactions with >1 ETH value and >50 gwei gas');
    
    // Run for 1 minute
    await new Promise(resolve => setTimeout(resolve, 60 * 1000));
    
    await stream.stop();
    
    const metrics = stream.getMetrics();
    console.log(`\nMatched transactions: ${metrics.totalTransactions}`);
    
  } catch (error) {
    console.error('Error in example 3:', error);
  }
}

/**
 * Example 4: Batch Processing
 * 
 * This example shows how to batch transactions for more efficient processing.
 */
async function example4_BatchProcessing() {
  console.log('\n=== Example 4: Batch Processing ===\n');
  
  const stream = new BloXrouteMempoolStream({
    apiKey: config.apiKey,
    network: config.network,
    region: config.region,
    streamType: StreamType.PENDING_TXS,
    verbose: config.enableVerbose,
    
    // Batch configuration
    batchSize: 10, // Process 10 transactions at a time
    batchTimeout: 500, // Or after 500ms, whichever comes first
    
    filters: {
      protocols: [DEX_PROTOCOLS.UNISWAP_V3],
    },
    
    onTransaction: async (tx: BloXrouteTx) => {
      // This will be called in batches
      console.log(`Processing tx: ${tx.tx_hash?.substring(0, 10)}...`);
    },
    
    onError: (error: Error) => {
      console.error('Stream error:', error.message);
    },
  });
  
  try {
    await stream.start();
    console.log('✅ Batch processing started');
    console.log('   Batch size: 10 transactions');
    console.log('   Timeout: 500ms');
    
    // Run for 1 minute
    await new Promise(resolve => setTimeout(resolve, 60 * 1000));
    
    await stream.stop();
    
    const metrics = stream.getMetrics();
    console.log(`\nProcessed ${metrics.totalTransactions} transactions in batches`);
    console.log(`Average processing time: ${metrics.avgProcessingTime.toFixed(2)}ms`);
    
  } catch (error) {
    console.error('Error in example 4:', error);
  }
}

/**
 * Main function - run all examples
 */
async function main() {
  console.log('=================================================');
  console.log('bloXroute Mempool Stream Integration Examples');
  console.log('=================================================');
  console.log(`Network: ${config.network}`);
  console.log(`Region: ${config.region}`);
  console.log('=================================================\n');
  
  // Choose which example to run
  const exampleNumber = process.env.EXAMPLE || '1';
  
  switch (exampleNumber) {
    case '1':
      await example1_DexSwapMonitoring();
      break;
    case '2':
      await example2_LargeTransferMonitoring();
      break;
    case '3':
      await example3_CustomFilters();
      break;
    case '4':
      await example4_BatchProcessing();
      break;
    case 'all':
      await example1_DexSwapMonitoring();
      await example2_LargeTransferMonitoring();
      await example3_CustomFilters();
      await example4_BatchProcessing();
      break;
    default:
      console.error(`Unknown example: ${exampleNumber}`);
      console.error('Valid values: 1, 2, 3, 4, or "all"');
      process.exit(1);
  }
  
  console.log('\n=== Examples Complete ===\n');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export {
  example1_DexSwapMonitoring,
  example2_LargeTransferMonitoring,
  example3_CustomFilters,
  example4_BatchProcessing,
};
