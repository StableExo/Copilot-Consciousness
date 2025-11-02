/**
 * Dashboard Demo Script
 * 
 * Demonstrates the Real-Time Analytics Dashboard with simulated trading data
 */

import { GasAnalytics, ArbitrageExecution } from '../src/gas/GasAnalytics';
import { CrossChainAnalytics } from '../src/chains/CrossChainAnalytics';
import { DashboardServer } from '../src/dashboard/DashboardServer';
import { CrossChainPath } from '../src/arbitrage/CrossChainPathFinder';
import { ExecutionResult } from '../src/chains/MultiChainExecutor';

async function runDashboardDemo() {
  console.log('='.repeat(60));
  console.log('Real-Time Analytics Dashboard Demo');
  console.log('='.repeat(60));

  // Initialize analytics modules
  const gasAnalytics = new GasAnalytics();
  const crossChainAnalytics = new CrossChainAnalytics();

  // Configure dashboard
  const dashboardServer = new DashboardServer(
    gasAnalytics,
    crossChainAnalytics,
    {
      port: 3000,
      enableCors: true,
      updateInterval: 2000, // 2 second updates for demo
      alerts: {
        profitThreshold: 0.5, // Alert on 0.5 ETH profit
        lossThreshold: 0.2,   // Alert on 0.2 ETH loss
        gasThreshold: 0.05,   // Alert on 0.05 ETH gas cost
        successRateThreshold: 80,
        channels: {
          websocket: true,
          email: {
            enabled: false,
            recipients: []
          }
        }
      }
    }
  );

  // Start the dashboard server
  await dashboardServer.start();

  console.log('\n📊 Dashboard is running!');
  console.log('🌐 Open http://localhost:3000 in your browser');
  console.log('🎨 Frontend: cd frontend && npm run dev (runs on port 3001)');
  console.log('\n🔄 Generating simulated trading data...\n');

  // Simulate trading activity
  let tradeCount = 0;
  const interval = setInterval(() => {
    tradeCount++;

    // Simulate gas execution
    const gasExecution: ArbitrageExecution = {
      path: {
        startToken: 'WETH',
        endToken: 'USDC',
        estimatedProfit: BigInt(Math.floor(Math.random() * 2000000000000000000)), // 0-2 ETH
        totalGasCost: BigInt(Math.floor(Math.random() * 100000000000000000)), // 0-0.1 ETH
        netProfit: BigInt(Math.floor(Math.random() * 1500000000000000000)), // 0-1.5 ETH
        totalFees: 0.3,
        slippageImpact: 0.1,
        bridgeCount: 0,
        totalBridgeFees: BigInt(0),
        estimatedTimeSeconds: 10,
        chains: [1],
        hops: [
          {
            dexName: Math.random() > 0.5 ? 'Uniswap V3' : 'Sushiswap',
            poolAddress: '0x' + Math.random().toString(16).substr(2, 40),
            tokenIn: 'WETH',
            tokenOut: 'USDC',
            amountIn: BigInt('1000000000000000000'),
            amountOut: BigInt('3000000000'),
            fee: 0.3,
            gasEstimate: BigInt(150000),
            chainId: 1,
            isBridge: false
          }
        ]
      },
      gasUsed: BigInt(Math.floor(Math.random() * 200000)),
      gasCost: BigInt(Math.floor(Math.random() * 100000000000000000)),
      chain: 'ethereum',
      timestamp: Date.now(),
      success: Math.random() > 0.15, // 85% success rate
      blockNumber: Math.floor(Math.random() * 1000000) + 18000000
    };

    if (!gasExecution.success) {
      gasExecution.failureReason = 'Slippage exceeded';
    }

    gasAnalytics.recordExecution(gasExecution);

    // Simulate cross-chain execution
    const crossChainPath: CrossChainPath = {
      startToken: 'ETH',
      endToken: 'MATIC',
      estimatedProfit: BigInt(Math.floor(Math.random() * 3000000000000000000)), // 0-3 ETH
      totalGasCost: BigInt(Math.floor(Math.random() * 150000000000000000)), // 0-0.15 ETH
      netProfit: BigInt(Math.floor(Math.random() * 2500000000000000000)), // 0-2.5 ETH
      totalFees: 0.5,
      slippageImpact: 0.15,
      bridgeCount: 1,
      totalBridgeFees: BigInt('50000000000000000'), // 0.05 ETH
      estimatedTimeSeconds: 180,
      chains: [1, 137],
      hops: [
        {
          dexName: 'Uniswap V3',
          poolAddress: '0x' + Math.random().toString(16).substr(2, 40),
          tokenIn: 'ETH',
          tokenOut: 'USDC',
          amountIn: BigInt('1000000000000000000'),
          amountOut: BigInt('3000000000'),
          fee: 0.3,
          gasEstimate: BigInt(150000),
          chainId: 1,
          isBridge: false
        },
        {
          dexName: 'Hop Bridge',
          poolAddress: '0x' + Math.random().toString(16).substr(2, 40),
          tokenIn: 'USDC',
          tokenOut: 'USDC',
          amountIn: BigInt('3000000000'),
          amountOut: BigInt('2950000000'),
          fee: 0.5,
          gasEstimate: BigInt(200000),
          chainId: 1,
          isBridge: true,
          bridgeInfo: {
            bridge: 'Hop',
            destinationChain: 137,
            estimatedTime: 180,
            fee: BigInt('50000000000000000')
          }
        },
        {
          dexName: 'QuickSwap',
          poolAddress: '0x' + Math.random().toString(16).substr(2, 40),
          tokenIn: 'USDC',
          tokenOut: 'MATIC',
          amountIn: BigInt('2950000000'),
          amountOut: BigInt('4000000000000000000'),
          fee: 0.3,
          gasEstimate: BigInt(120000),
          chainId: 137,
          isBridge: false
        }
      ]
    };

    const executionResult: ExecutionResult = {
      success: Math.random() > 0.1, // 90% success rate
      executionTime: Math.floor(Math.random() * 200) + 100,
      hopsCompleted: crossChainPath.hops.length,
      actualProfit: crossChainPath.netProfit,
      gasSpent: crossChainPath.totalGasCost,
      txHashes: [
        '0x' + Math.random().toString(16).substr(2, 64),
        '0x' + Math.random().toString(16).substr(2, 64)
      ]
    };

    if (!executionResult.success) {
      executionResult.error = 'Bridge timeout';
      executionResult.hopsCompleted = 1;
    }

    crossChainAnalytics.recordTrade(crossChainPath, executionResult);

    console.log(`✅ Trade #${tradeCount} - Gas: ${gasExecution.success ? '✓' : '✗'}, Cross-chain: ${executionResult.success ? '✓' : '✗'}`);

    // Stop after 50 trades (demo purposes)
    if (tradeCount >= 50) {
      clearInterval(interval);
      console.log('\n✨ Demo completed! Dashboard will continue running.');
      console.log('📊 View metrics at http://localhost:3000/api/metrics');
      console.log('🎨 View frontend at http://localhost:3001 (after running: cd frontend && npm run dev)');
      console.log('\nPress Ctrl+C to stop the server.\n');
    }
  }, 3000); // Generate trade every 3 seconds
}

// Run the demo
if (require.main === module) {
  runDashboardDemo().catch((error) => {
    console.error('Demo failed:', error);
    process.exit(1);
  });
}

export { runDashboardDemo };
