/**
 * Example: MEV-Aware Profit Calculation
 * 
 * Demonstrates how to calculate profits with MEV risk adjustments
 */

import { mevCalculatorBridge } from '../src/mev/bridges/mev-calculator-bridge';
import Redis from 'ioredis';

interface ArbitrageOpportunity {
  path: string[];
  inputAmount: number;
  expectedOutput: number;
  estimatedGasCost: number;
  estimatedGasPrice: number;
}

async function main() {
  console.log('=== MEV-Aware Profit Calculation Example ===\n');

  // Initialize Redis for caching (optional)
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  const calculator = new mevCalculatorBridge(redis, true, 60);

  // Example 1: Simple Profit Calculation
  console.log('1. Simple Profit Calculation');
  console.log('-----------------------------');

  const simpleOpportunity: ArbitrageOpportunity = {
    path: ['WETH', 'USDC', 'WETH'],
    inputAmount: 10.0,  // 10 ETH
    expectedOutput: 10.5,  // 10.5 ETH
    estimatedGasCost: 0.01,  // 0.01 ETH
    estimatedGasPrice: 50  // 50 gwei
  };

  // Calculate without MEV consideration
  const basicProfit = simpleOpportunity.expectedOutput - 
                      simpleOpportunity.inputAmount - 
                      simpleOpportunity.estimatedGasCost;

  console.log(`Input: ${simpleOpportunity.inputAmount} ETH`);
  console.log(`Expected Output: ${simpleOpportunity.expectedOutput} ETH`);
  console.log(`Gas Cost: ${simpleOpportunity.estimatedGasCost} ETH`);
  console.log(`Basic Profit: ${basicProfit.toFixed(4)} ETH`);

  // Calculate MEV risk
  const mevRisk = await calculator.calculateRisk({
    value: simpleOpportunity.inputAmount,
    gasPrice: simpleOpportunity.estimatedGasPrice,
    txType: 'arbitrage'
  });

  console.log(`\nMEV Analysis:`);
  console.log(`  Risk Score: ${(mevRisk.riskScore * 100).toFixed(2)}%`);
  console.log(`  Estimated Leakage: ${mevRisk.estimatedLeakage.toFixed(6)} ETH`);
  console.log(`  Mempool Congestion: ${(mevRisk.mempoolCongestion * 100).toFixed(2)}%`);
  console.log(`  Searcher Density: ${(mevRisk.searcherDensity * 100).toFixed(2)}%`);

  const mevAdjustedProfit = basicProfit - mevRisk.estimatedLeakage;
  console.log(`\nMEV-Adjusted Profit: ${mevAdjustedProfit.toFixed(4)} ETH`);
  console.log(`MEV Impact: ${((mevRisk.estimatedLeakage / basicProfit) * 100).toFixed(2)}% of profit`);

  // Example 2: Minimum Profit Threshold
  console.log('\n\n2. Minimum Profit Threshold Check');
  console.log('-----------------------------------');

  const minProfitThreshold = 0.01;  // 0.01 ETH minimum
  const minProfitBps = 50;  // 0.5% minimum

  const minProfitAbsolute = minProfitThreshold;
  const minProfitRelative = (simpleOpportunity.inputAmount * minProfitBps) / 10000;
  const effectiveMinProfit = Math.max(minProfitAbsolute, minProfitRelative);

  console.log(`Minimum Profit (Absolute): ${minProfitAbsolute} ETH`);
  console.log(`Minimum Profit (Relative): ${minProfitRelative.toFixed(4)} ETH`);
  console.log(`Effective Minimum: ${effectiveMinProfit.toFixed(4)} ETH`);
  console.log(`\nMEV-Adjusted Profit: ${mevAdjustedProfit.toFixed(4)} ETH`);

  if (mevAdjustedProfit >= effectiveMinProfit) {
    console.log(`✅ Opportunity is PROFITABLE (exceeds threshold)`);
  } else {
    console.log(`❌ Opportunity is NOT PROFITABLE (below threshold)`);
  }

  // Example 3: Flash Loan Calculation
  console.log('\n\n3. Flash Loan Profit Calculation');
  console.log('----------------------------------');

  const flashLoanOpportunity = {
    loanAmount: 100.0,  // 100 ETH flash loan
    flashLoanFee: 0.09,  // 0.09% fee
    revenue: 102.0,  // 102 ETH after swaps
    gasCost: 0.02  // 0.02 ETH gas
  };

  const flashLoanCost = (flashLoanOpportunity.loanAmount * flashLoanOpportunity.flashLoanFee) / 100;
  const grossProfit = flashLoanOpportunity.revenue - flashLoanOpportunity.loanAmount;
  const basicFlashProfit = grossProfit - flashLoanCost - flashLoanOpportunity.gasCost;

  console.log(`Flash Loan: ${flashLoanOpportunity.loanAmount} ETH`);
  console.log(`Flash Loan Fee: ${flashLoanCost.toFixed(4)} ETH (${flashLoanOpportunity.flashLoanFee}%)`);
  console.log(`Revenue: ${flashLoanOpportunity.revenue} ETH`);
  console.log(`Gas Cost: ${flashLoanOpportunity.gasCost} ETH`);
  console.log(`Basic Profit: ${basicFlashProfit.toFixed(4)} ETH`);

  const flashMevRisk = await calculator.calculateRisk({
    value: flashLoanOpportunity.loanAmount,
    gasPrice: 50,
    txType: 'flash_loan'
  });

  console.log(`\nMEV Risk for Flash Loan:`);
  console.log(`  Estimated Leakage: ${flashMevRisk.estimatedLeakage.toFixed(6)} ETH`);

  const flashMevAdjustedProfit = basicFlashProfit - flashMevRisk.estimatedLeakage;
  console.log(`\nMEV-Adjusted Profit: ${flashMevAdjustedProfit.toFixed(4)} ETH`);

  // Example 4: Comparing Multiple Opportunities
  console.log('\n\n4. Comparing Multiple Opportunities');
  console.log('-------------------------------------');

  const opportunities = [
    { name: 'Small Arb', value: 1.0, revenue: 1.05, gas: 0.005, gasPrice: 40 },
    { name: 'Medium Arb', value: 10.0, revenue: 10.8, gas: 0.01, gasPrice: 50 },
    { name: 'Large Arb', value: 100.0, revenue: 105.0, gas: 0.02, gasPrice: 60 }
  ];

  console.log('\nAnalyzing opportunities...\n');

  for (const opp of opportunities) {
    const basic = opp.revenue - opp.value - opp.gas;
    const risk = await calculator.calculateRisk({
      value: opp.value,
      gasPrice: opp.gasPrice,
      txType: 'arbitrage'
    });
    const adjusted = basic - risk.estimatedLeakage;

    console.log(`${opp.name}:`);
    console.log(`  Input: ${opp.value} ETH`);
    console.log(`  Basic Profit: ${basic.toFixed(4)} ETH`);
    console.log(`  MEV Leakage: ${risk.estimatedLeakage.toFixed(6)} ETH`);
    console.log(`  Adjusted Profit: ${adjusted.toFixed(4)} ETH`);
    console.log(`  ROI: ${((adjusted / opp.value) * 100).toFixed(2)}%`);
    console.log();
  }

  // Example 5: Cache Performance
  console.log('\n5. Cache Performance Demonstration');
  console.log('-----------------------------------');

  console.log('Calculating same parameters twice...');

  const cacheTestParams = {
    value: 10.0,
    gasPrice: 50,
    txType: 'arbitrage' as const
  };

  const start1 = Date.now();
  await calculator.calculateRisk(cacheTestParams);
  const time1 = Date.now() - start1;
  console.log(`First call (no cache): ${time1}ms`);

  const start2 = Date.now();
  await calculator.calculateRisk(cacheTestParams);
  const time2 = Date.now() - start2;
  console.log(`Second call (cached): ${time2}ms`);
  console.log(`Speedup: ${(time1 / time2).toFixed(2)}x faster`);

  // Cleanup
  await redis.quit();
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

export { main };
