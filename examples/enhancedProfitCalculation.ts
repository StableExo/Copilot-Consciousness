/**
 * Enhanced Profit Calculation Example
 * 
 * Demonstrates the enhanced profitability calculator with:
 * - Flash loan fee calculations (Aave and UniswapV3)
 * - Detailed profit breakdown
 * - Per-token-pair thresholds
 * - Gas cost conversion
 * - Native currency conversion
 * - Price oracle integration
 */

import { ProfitabilityCalculator } from '../src/arbitrage/ProfitabilityCalculator';
import { SimplePriceOracle } from '../src/arbitrage/SimplePriceOracle';
import { 
  ArbitragePath, 
  ArbitrageHop, 
  FlashLoanConfig,
  ProfitThresholds
} from '../src/arbitrage/types';

// Common token addresses (Ethereum mainnet)
const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

/**
 * Format BigInt to human-readable number with decimals
 */
function formatTokenAmount(amount: bigint, decimals: number): string {
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const remainder = amount % divisor;
  const fractional = remainder.toString().padStart(decimals, '0').slice(0, 6);
  return `${whole}.${fractional}`;
}

/**
 * Format USD amount (18 decimals)
 */
function formatUSD(amount: bigint): string {
  return `$${formatTokenAmount(amount, 18)}`;
}

/**
 * Print detailed breakdown
 */
async function printBreakdown(
  calculator: ProfitabilityCalculator,
  path: ArbitragePath,
  borrowToken: string,
  borrowTokenDecimals: number,
  borrowTokenSymbol: string,
  flashLoanConfig: FlashLoanConfig
) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Arbitrage Path Analysis`);
  console.log(`${'='.repeat(80)}\n`);
  
  console.log(`Flash Loan Provider: ${flashLoanConfig.provider.toUpperCase()}`);
  console.log(`Flash Loan Fee: ${flashLoanConfig.feePercentage * 100}%${flashLoanConfig.poolFee ? ` (Pool Fee: ${flashLoanConfig.poolFee * 100}%)` : ''}`);
  console.log(`\nPath: ${path.hops.length} hops`);
  
  path.hops.forEach((hop, index) => {
    console.log(`  ${index + 1}. ${hop.dexName}: ${formatTokenAmount(hop.amountIn, borrowTokenDecimals)} → ${formatTokenAmount(hop.amountOut, borrowTokenDecimals)} (Fee: ${hop.fee * 100}%)`);
  });
  
  const result = await calculator.calculateDetailedProfitability(
    path,
    borrowToken,
    borrowTokenDecimals,
    flashLoanConfig
  );
  
  if (!result.breakdown) {
    console.log('\nNo detailed breakdown available');
    return;
  }
  
  const breakdown = result.breakdown;
  
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`Profit Breakdown`);
  console.log(`${'─'.repeat(80)}`);
  
  console.log(`\nInitial Amount:    ${formatTokenAmount(breakdown.initialAmount, borrowTokenDecimals)} ${borrowTokenSymbol}`);
  console.log(`Final Amount:      ${formatTokenAmount(breakdown.finalAmount, borrowTokenDecimals)} ${borrowTokenSymbol}`);
  console.log(`Gross Profit:      ${formatTokenAmount(breakdown.grossProfit, borrowTokenDecimals)} ${borrowTokenSymbol}`);
  
  console.log(`\nCosts:`);
  console.log(`  Flash Loan Fee:  ${formatTokenAmount(breakdown.flashLoanFee, borrowTokenDecimals)} ${borrowTokenSymbol}`);
  console.log(`  Swap Fees:       ${formatTokenAmount(breakdown.swapFees, borrowTokenDecimals)} ${borrowTokenSymbol} (informational)`);
  console.log(`  Gas Cost (Wei):  ${breakdown.gasCostWei.toString()} wei`);
  console.log(`  Gas Cost (ETH):  ${formatTokenAmount(breakdown.gasCostInETH, 18)} ETH`);
  console.log(`  Gas Cost (${borrowTokenSymbol}):   ${formatTokenAmount(breakdown.gasCostInToken, borrowTokenDecimals)} ${borrowTokenSymbol}`);
  console.log(`  Total Fees:      ${formatTokenAmount(breakdown.totalFees, borrowTokenDecimals)} ${borrowTokenSymbol}`);
  
  console.log(`\nNet Results:`);
  console.log(`  Net Profit:      ${formatTokenAmount(breakdown.netProfit, borrowTokenDecimals)} ${borrowTokenSymbol}`);
  console.log(`  Net Profit (ETH):${formatTokenAmount(breakdown.netProfitNative, 18)} ETH`);
  console.log(`  Net Profit (USD):${formatUSD(breakdown.netProfitUSD)}`);
  console.log(`  ROI:             ${breakdown.roi.toFixed(2)}%`);
  console.log(`  Profit %:        ${breakdown.profitPercentage.toFixed(2)}%`);
  
  console.log(`\nStatus:`);
  console.log(`  Profitable:      ${breakdown.profitable ? '✅ YES' : '❌ NO'}`);
  console.log(`  Meets Threshold: ${breakdown.meetsThreshold ? '✅ YES' : '❌ NO'}`);
  console.log(`  Threshold:       ${formatTokenAmount(calculator.getThresholdForPair(borrowToken, path.endToken), borrowTokenDecimals)} ${borrowTokenSymbol}`);
  
  console.log(`\n${'='.repeat(80)}\n`);
}

/**
 * Main example function
 */
async function main() {
  console.log('Enhanced Profit Calculation Example');
  console.log('====================================\n');
  
  // 1. Setup: Create price oracle and calculator
  console.log('1. Setting up Price Oracle and Calculator...\n');
  
  const priceOracle = new SimplePriceOracle(60000); // 1 minute cache
  const gasPrice = BigInt(50000000000); // 50 gwei
  
  // Custom thresholds (in addition to defaults)
  const customThresholds: ProfitThresholds = {
    'DAI/WETH': BigInt('30000000000000000000'), // 30 WETH
  };
  
  const calculator = new ProfitabilityCalculator(
    gasPrice,
    0.01, // 1% slippage tolerance
    priceOracle,
    customThresholds
  );
  
  console.log('✅ Price Oracle initialized with hardcoded prices');
  console.log('✅ Calculator initialized with custom thresholds\n');
  
  // 2. Example 1: Profitable Aave Flash Loan Trade
  console.log('2. Example 1: Profitable Aave Flash Loan Trade');
  console.log('   WETH → USDC → WETH (with Aave flash loan)\n');
  
  const aaveFlashLoanConfig: FlashLoanConfig = {
    provider: 'aave',
    feePercentage: 0.0009 // 0.09%
  };
  
  const profitableHops: ArbitrageHop[] = [
    {
      dexName: 'Uniswap V3',
      poolAddress: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640',
      tokenIn: WETH,
      tokenOut: USDC,
      amountIn: BigInt('100000000000000000000'), // 100 WETH
      amountOut: BigInt('300000000000'), // 300,000 USDC (assuming $3000/ETH)
      fee: 0.003, // 0.3%
      gasEstimate: 150000,
      reserve0: BigInt('1000000000000000000000'), // 1000 WETH reserve
      reserve1: BigInt('3000000000000') // 3M USDC reserve
    },
    {
      dexName: 'SushiSwap',
      poolAddress: '0x397FF1542f962076d0BFE58eA045FfA2d347ACa0',
      tokenIn: USDC,
      tokenOut: WETH,
      amountIn: BigInt('300000000000'), // 300,000 USDC
      amountOut: BigInt('105000000000000000000'), // 105 WETH (5% profit - more realistic)
      fee: 0.003, // 0.3%
      gasEstimate: 150000,
      reserve0: BigInt('3000000000000'), // 3M USDC reserve
      reserve1: BigInt('1000000000000000000000') // 1000 WETH reserve
    }
  ];
  
  const profitablePath: ArbitragePath = {
    hops: profitableHops,
    startToken: WETH,
    endToken: WETH,
    estimatedProfit: BigInt('5000000000000000000'), // 5 WETH gross profit
    totalGasCost: BigInt(0),
    netProfit: BigInt('5000000000000000000'),
    totalFees: 0.006,
    slippageImpact: 0.002,
    flashLoanProvider: 'aave',
    flashLoanConfig: aaveFlashLoanConfig
  };
  
  await printBreakdown(
    calculator,
    profitablePath,
    WETH,
    18,
    'WETH',
    aaveFlashLoanConfig
  );
  
  // 3. Example 2: Trade Rejected Due to Threshold
  console.log('3. Example 2: Trade Rejected Due to Threshold');
  console.log('   Small profit that does not meet WETH/USDC threshold\n');
  
  const smallProfitHops: ArbitrageHop[] = [
    {
      dexName: 'Uniswap V3',
      poolAddress: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640',
      tokenIn: WETH,
      tokenOut: USDC,
      amountIn: BigInt('10000000000000000000'), // 10 WETH
      amountOut: BigInt('30000000000'), // 30,000 USDC
      fee: 0.003,
      gasEstimate: 150000
    },
    {
      dexName: 'SushiSwap',
      poolAddress: '0x397FF1542f962076d0BFE58eA045FfA2d347ACa0',
      tokenIn: USDC,
      tokenOut: WETH,
      amountIn: BigInt('30000000000'),
      amountOut: BigInt('10100000000000000000'), // 10.1 WETH (0.1 profit)
      fee: 0.003,
      gasEstimate: 150000
    }
  ];
  
  const smallProfitPath: ArbitragePath = {
    hops: smallProfitHops,
    startToken: WETH,
    endToken: WETH,
    estimatedProfit: BigInt('100000000000000000'), // 0.1 WETH
    totalGasCost: BigInt(0),
    netProfit: BigInt('100000000000000000'),
    totalFees: 0.006,
    slippageImpact: 0.002,
    flashLoanProvider: 'aave',
    flashLoanConfig: aaveFlashLoanConfig
  };
  
  await printBreakdown(
    calculator,
    smallProfitPath,
    WETH,
    18,
    'WETH',
    aaveFlashLoanConfig
  );
  
  // 4. Example 3: UniswapV3 Flash Loan Fee Comparison
  console.log('4. Example 3: UniswapV3 Flash Loan Fee Comparison');
  console.log('   Same trade with different flash loan providers\n');
  
  const uniV3FlashLoanConfig: FlashLoanConfig = {
    provider: 'uniswapv3',
    feePercentage: 0,
    poolFee: 0.003 // 0.3% pool fee (higher than Aave)
  };
  
  console.log('   Comparing Aave (0.09%) vs UniswapV3 (0.3% pool fee):\n');
  
  const aaveFee = calculator.calculateFlashLoanFee(
    BigInt('100000000000000000000'),
    aaveFlashLoanConfig
  );
  
  const uniV3Fee = calculator.calculateFlashLoanFee(
    BigInt('100000000000000000000'),
    uniV3FlashLoanConfig
  );
  
  console.log(`   Aave Flash Loan Fee:     ${formatTokenAmount(aaveFee, 18)} WETH`);
  console.log(`   UniswapV3 Flash Loan Fee: ${formatTokenAmount(uniV3Fee, 18)} WETH`);
  console.log(`   Difference:              ${formatTokenAmount(uniV3Fee - aaveFee, 18)} WETH`);
  console.log(`   Savings with Aave:       ${((Number(uniV3Fee - aaveFee) / Number(uniV3Fee)) * 100).toFixed(2)}%\n`);
  
  // 5. Example 4: Dynamic Gas Price Impact
  console.log('5. Example 4: Dynamic Gas Price Impact');
  console.log('   Demonstrating how gas price affects profitability\n');
  
  const gasPrices = [
    { label: 'Low', price: BigInt(20000000000) },    // 20 gwei
    { label: 'Medium', price: BigInt(50000000000) }, // 50 gwei
    { label: 'High', price: BigInt(100000000000) },  // 100 gwei
    { label: 'Very High', price: BigInt(200000000000) } // 200 gwei
  ];
  
  console.log('   Gas Price Impact on Same Trade:\n');
  
  for (const { label, price } of gasPrices) {
    const tempCalc = new ProfitabilityCalculator(price, 0.01, priceOracle);
    
    const result = await tempCalc.calculateDetailedProfitability(
      profitablePath,
      WETH,
      18,
      aaveFlashLoanConfig
    );
    
    if (result.breakdown) {
      console.log(`   ${label.padEnd(12)} (${(Number(price) / 1e9).toFixed(0).padStart(3)} gwei): Net Profit = ${formatTokenAmount(result.breakdown.netProfit, 18).padStart(12)} WETH | Gas Cost = ${formatTokenAmount(result.breakdown.gasCostInToken, 18).padStart(10)} WETH`);
    }
  }
  
  console.log('\n');
  
  // 6. Example 5: USDC Trade with Different Decimals
  console.log('6. Example 5: USDC Trade (6 decimals) with Price Conversions');
  console.log('   Demonstrating conversions for different decimal tokens\n');
  
  const usdcHops: ArbitrageHop[] = [
    {
      dexName: 'Uniswap V3',
      poolAddress: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640',
      tokenIn: USDC,
      tokenOut: WETH,
      amountIn: BigInt('300000000000'), // 300,000 USDC
      amountOut: BigInt('100000000000000000000'), // 100 WETH
      fee: 0.003,
      gasEstimate: 150000
    },
    {
      dexName: 'SushiSwap',
      poolAddress: '0x397FF1542f962076d0BFE58eA045FfA2d347ACa0',
      tokenIn: WETH,
      tokenOut: USDC,
      amountIn: BigInt('100000000000000000000'),
      amountOut: BigInt('310000000000'), // 310,000 USDC (10,000 profit)
      fee: 0.003,
      gasEstimate: 150000
    }
  ];
  
  const usdcPath: ArbitragePath = {
    hops: usdcHops,
    startToken: USDC,
    endToken: USDC,
    estimatedProfit: BigInt('10000000000'), // 10,000 USDC
    totalGasCost: BigInt(0),
    netProfit: BigInt('10000000000'),
    totalFees: 0.006,
    slippageImpact: 0.002,
    flashLoanProvider: 'aave',
    flashLoanConfig: aaveFlashLoanConfig
  };
  
  await printBreakdown(
    calculator,
    usdcPath,
    USDC,
    6,
    'USDC',
    aaveFlashLoanConfig
  );
  
  // Summary
  console.log('Example Summary');
  console.log('===============\n');
  console.log('✅ Demonstrated flash loan fee calculation (Aave vs UniswapV3)');
  console.log('✅ Showed detailed profit breakdown with all cost components');
  console.log('✅ Illustrated per-token-pair threshold checking');
  console.log('✅ Analyzed gas price impact on profitability');
  console.log('✅ Demonstrated multi-decimal token conversions');
  console.log('✅ Converted profits to ETH and USD for easy comparison\n');
  
  console.log('Key Insights:');
  console.log('- Aave flash loans (0.09%) are cheaper than UniswapV3 (pool fee)');
  console.log('- Gas costs can significantly impact small arbitrage opportunities');
  console.log('- Per-token-pair thresholds help filter noise and focus on meaningful trades');
  console.log('- Pure BigInt math ensures zero precision loss in all calculations\n');
}

// Run the example
if (require.main === module) {
  main()
    .then(() => {
      console.log('Example completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error running example:', error);
      process.exit(1);
    });
}

export { main };
