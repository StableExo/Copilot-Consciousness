/**
 * Cross-Chain Arbitrage System Example
 * 
 * Demonstrates finding and executing arbitrage opportunities across multiple blockchains
 */

import { DEXRegistry } from '../src/dex/core/DEXRegistry';
import { ArbitrageOrchestrator } from '../src/arbitrage/ArbitrageOrchestrator';
import { PathfindingConfig } from '../src/arbitrage/types';
import { 
  ChainProviderManager, 
  BridgeManager, 
  CrossChainScanner,
  MultiChainExecutor,
  CrossChainAnalytics 
} from '../src/chains';
import { DEFAULT_CROSS_CHAIN_CONFIG } from '../src/config/cross-chain.config';
import { GasPriceOracle } from '../src/gas/GasPriceOracle';

async function runCrossChainArbitrage() {
  console.log('🌐 Initializing Cross-Chain Arbitrage System...\n');

  // 1. Initialize Chain Provider Manager
  console.log('1️⃣ Setting up multi-chain provider manager...');
  const providerManager = new ChainProviderManager(
    DEFAULT_CROSS_CHAIN_CONFIG.chains,
    30000, // Health check every 30 seconds
    3      // Max retries
  );
  providerManager.startHealthMonitoring();

  const activeChains = providerManager.getAllActiveChains();
  console.log(`   ✅ Connected to ${activeChains.length} chains:`, activeChains);
  console.log('');

  // 2. Initialize Bridge Manager
  console.log('2️⃣ Setting up bridge manager...');
  const bridgeManager = new BridgeManager(
    DEFAULT_CROSS_CHAIN_CONFIG.bridges,
    'balanced' // Use balanced strategy for bridge selection
  );
  console.log('   ✅ Configured 5 bridge protocols (Wormhole, LayerZero, Stargate, Hop, Synapse)');
  console.log('');

  // 3. Initialize Gas Price Oracle
  console.log('3️⃣ Initializing gas price oracle...');
  const gasOracle = new GasPriceOracle(
    'https://eth.llamarpc.com',
    undefined,
    12000,
    BigInt(50 * 10 ** 9) // 50 gwei fallback
  );
  gasOracle.startAutoRefresh();
  
  // Get gas prices for multiple chains
  const gasPrices = await gasOracle.getMultiChainGasPrices([1, 56, 137, 42161]);
  console.log('   ✅ Gas prices retrieved for chains:', Array.from(gasPrices.keys()));
  console.log('');

  // 4. Initialize Arbitrage Orchestrator with cross-chain support
  console.log('4️⃣ Setting up arbitrage orchestrator...');
  const dexRegistry = new DEXRegistry();
  
  const pathfindingConfig: PathfindingConfig = {
    maxHops: 5,
    minProfitThreshold: BigInt(10 ** 17), // 0.1 ETH minimum profit
    maxSlippage: 2.0,
    gasPrice: BigInt(50 * 10 ** 9)
  };

  const orchestrator = new ArbitrageOrchestrator(
    dexRegistry,
    pathfindingConfig,
    BigInt(50 * 10 ** 9),
    undefined,
    bridgeManager,
    DEFAULT_CROSS_CHAIN_CONFIG.pathfinding
  );
  
  orchestrator.setMode('cross-chain');
  console.log('   ✅ Orchestrator configured in cross-chain mode');
  console.log('');

  // 5. Initialize Cross-Chain Scanner
  console.log('5️⃣ Setting up cross-chain price scanner...');
  const scanner = new CrossChainScanner(
    providerManager,
    DEFAULT_CROSS_CHAIN_CONFIG.scanner,
    [
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
      '0xdAC17F958D2ee523a2206206994597C13D831ec7'  // USDT
    ]
  );
  
  console.log('   ✅ Scanner monitoring 3 tokens across 7+ chains');
  console.log('');

  // 6. Initialize Multi-Chain Executor
  console.log('6️⃣ Setting up multi-chain executor...');
  const adapters = new Map(); // Would be populated with actual adapters
  const executor = new MultiChainExecutor(
    bridgeManager,
    adapters,
    DEFAULT_CROSS_CHAIN_CONFIG.execution
  );
  console.log('   ✅ Executor ready with emergency recovery enabled');
  console.log('');

  // 7. Initialize Analytics
  console.log('7️⃣ Setting up analytics tracker...');
  const analytics = new CrossChainAnalytics(10000);
  console.log('   ✅ Analytics tracking enabled');
  console.log('');

  // 8. Simulate scanning for opportunities
  console.log('8️⃣ Scanning for arbitrage opportunities...\n');
  scanner.startScanning();
  
  // Wait for scan results
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const scanResults = scanner.getLastScanResults();
  if (scanResults) {
    console.log('   📊 Scan Results:');
    console.log(`      • Chains scanned: ${scanResults.chainsScanned}`);
    console.log(`      • Scan time: ${scanResults.scanTime}ms`);
    console.log(`      • Discrepancies found: ${scanResults.discrepancies.length}`);
    
    if (scanResults.discrepancies.length > 0) {
      console.log('\n   💰 Top Price Discrepancies:');
      scanResults.discrepancies.slice(0, 3).forEach((disc, i) => {
        console.log(`      ${i + 1}. ${disc.token}`);
        console.log(`         Chain ${disc.chainA}: $${disc.priceA.toFixed(4)}`);
        console.log(`         Chain ${disc.chainB}: $${disc.priceB.toFixed(4)}`);
        console.log(`         Difference: ${disc.discrepancy.toFixed(2)}%`);
        console.log(`         Profitable: ${disc.isProfitable ? '✅ Yes' : '❌ No'}`);
      });
    }
  }
  console.log('');

  // 9. Example: Find cross-chain paths
  console.log('9️⃣ Finding cross-chain arbitrage paths...\n');
  
  try {
    const paths = await orchestrator.findCrossChainOpportunities(
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
      1, // Start on Ethereum
      BigInt(10 ** 18), // 1 ETH
      5 // Max 5 paths
    );
    
    console.log(`   ✅ Found ${paths.length} profitable cross-chain paths\n`);
    
    if (paths.length > 0) {
      console.log('   🎯 Most Profitable Path:');
      const bestPath = paths[0];
      console.log(`      • Start: Chain ${bestPath.chains[0]}`);
      console.log(`      • End: Chain ${bestPath.chains[bestPath.chains.length - 1]}`);
      console.log(`      • Hops: ${bestPath.hops.length}`);
      console.log(`      • Bridges: ${bestPath.bridgeCount}`);
      console.log(`      • Estimated Profit: ${Number(bestPath.estimatedProfit) / 10**18} ETH`);
      console.log(`      • Net Profit: ${Number(bestPath.netProfit) / 10**18} ETH`);
      console.log(`      • Bridge Fees: ${Number(bestPath.totalBridgeFees) / 10**18} ETH`);
      console.log(`      • Est. Time: ${Math.floor(bestPath.estimatedTimeSeconds / 60)} minutes`);
      
      console.log('\n      🔗 Path Details:');
      bestPath.hops.forEach((hop, i) => {
        if (hop.isBridge) {
          console.log(`      ${i + 1}. BRIDGE via ${hop.bridgeInfo?.bridge}`);
          console.log(`         ${hop.chainId} → ${hop.bridgeInfo?.toChain}`);
          console.log(`         Amount: ${Number(hop.amountIn) / 10**18} → ${Number(hop.amountOut) / 10**18}`);
        } else {
          console.log(`      ${i + 1}. SWAP on ${hop.dexName} (Chain ${hop.chainId})`);
          console.log(`         ${hop.tokenIn.slice(0, 10)}... → ${hop.tokenOut.slice(0, 10)}...`);
          console.log(`         Amount: ${Number(hop.amountIn) / 10**18} → ${Number(hop.amountOut) / 10**18}`);
        }
      });
    }
  } catch (error) {
    console.log('   ⚠️ Cross-chain pathfinding needs pool data to be populated');
    console.log('   (This is expected in the example without real blockchain data)');
  }
  console.log('');

  // 10. Display system statistics
  console.log('🔟 System Statistics:\n');
  
  const chainsSummary = providerManager.getChainsSummary();
  console.log('   📡 Chain Health:');
  chainsSummary.forEach(chain => {
    console.log(`      • ${chain.name} (${chain.chainId}): ${chain.healthy ? '✅ Healthy' : '❌ Unhealthy'} - ${chain.providers} provider(s)`);
  });
  console.log('');

  const bridgeStats = bridgeManager.getBridgeStats();
  console.log('   🌉 Bridge Statistics:');
  console.log(`      • Total bridges: ${bridgeStats.totalBridges}`);
  console.log(`      • Pending: ${bridgeStats.pendingBridges}`);
  console.log(`      • Completed: ${bridgeStats.completedBridges}`);
  console.log(`      • Failed: ${bridgeStats.failedBridges}`);
  console.log('');

  const executorStats = executor.getStats();
  console.log('   ⚡ Executor Status:');
  console.log(`      • Active executions: ${executorStats.activeExecutions}`);
  console.log(`      • Max concurrent: ${executorStats.maxConcurrentPaths}`);
  console.log(`      • Retry attempts: ${executorStats.retryAttempts}`);
  console.log(`      • Recovery enabled: ${executorStats.recoveryEnabled ? '✅ Yes' : '❌ No'}`);
  console.log('');

  const analyticsSummary = analytics.getSummary();
  console.log('   📈 Analytics Summary:');
  console.log(`      • Total trades: ${analyticsSummary.totalTrades}`);
  console.log(`      • Success rate: ${analyticsSummary.successRate.toFixed(2)}%`);
  console.log(`      • Net profit: ${Number(analyticsSummary.netProfit) / 10**18} ETH`);
  console.log('');

  // Cleanup
  console.log('🧹 Cleaning up...');
  scanner.stopScanning();
  gasOracle.stopAutoRefresh();
  await providerManager.cleanup();
  console.log('   ✅ All services stopped\n');

  console.log('✨ Cross-Chain Arbitrage System demonstration complete!\n');
  console.log('Key Features Demonstrated:');
  console.log('  ✅ Multi-chain provider management with health monitoring');
  console.log('  ✅ Bridge protocol integration (5 protocols)');
  console.log('  ✅ Cross-chain price scanning');
  console.log('  ✅ Cross-chain pathfinding with BFS algorithm');
  console.log('  ✅ Multi-chain gas estimation');
  console.log('  ✅ Comprehensive analytics and tracking');
  console.log('  ✅ Error handling and recovery mechanisms');
}

// Run the example
if (require.main === module) {
  runCrossChainArbitrage()
    .then(() => {
      console.log('\n✅ Example completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Example failed:', error);
      process.exit(1);
    });
}

export default runCrossChainArbitrage;
