/**
 * FlashSwapV3 Usage Examples
 * 
 * Demonstrates how to use FlashSwapV3Executor for multi-source flash loan arbitrage.
 * Run with: EXAMPLE=1 node --import tsx examples/flashswap-v3-usage.ts
 */

import { ethers, parseUnits, formatUnits } from 'ethers';
import { FlashSwapV3Executor, FlashLoanSource, DexType, UniversalSwapPath } from '../src/execution/FlashSwapV3Executor';

// Configuration
const RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const FLASH_SWAP_V3_ADDRESS = process.env.FLASH_SWAP_V3_ADDRESS || '0x...';

// Token addresses (Base Mainnet)
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const WETH = '0x4200000000000000000000000000000000000006';
const DAI = '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb';

// Pool addresses (example)
const USDC_WETH_POOL = '0x...'; // Uniswap V3 USDC/WETH 0.3%
const WETH_DAI_POOL = '0x...';  // Uniswap V3 WETH/DAI 0.05%
const DAI_USDC_POOL = '0x...';  // SushiSwap DAI/USDC

async function setupExecutor() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = PRIVATE_KEY ? new ethers.Wallet(PRIVATE_KEY, provider) : undefined;

  return new FlashSwapV3Executor({
    contractAddress: FLASH_SWAP_V3_ADDRESS,
    provider,
    signer,
    gasBuffer: 1.2,        // 20% gas buffer
    defaultSlippage: 0.01, // 1% slippage tolerance
    chainId: 8453,         // Base
  });
}

/**
 * Example 1: Source Selection Analysis
 * Shows how different amounts and tokens result in different source selection
 */
async function example1_SourceSelection() {
  console.log('\n=== Example 1: Source Selection Analysis ===\n');

  const executor = await setupExecutor();

  // Test different scenarios
  const scenarios = [
    { token: USDC, amount: parseUnits('1000', 6), label: '$1k USDC' },
    { token: USDC, amount: parseUnits('10000', 6), label: '$10k USDC' },
    { token: USDC, amount: parseUnits('100000', 6), label: '$100k USDC' },
    { token: USDC, amount: parseUnits('50000000', 6), label: '$50M USDC (Hybrid Threshold)' },
    { token: WETH, amount: parseUnits('10', 18), label: '10 WETH' },
    { token: DAI, amount: parseUnits('50000', 18), label: '50k DAI' },
  ];

  for (const scenario of scenarios) {
    const selection = await executor.selectOptimalSource(scenario.token, scenario.amount);
    
    console.log(`\n${scenario.label}:`);
    console.log(`  Source: ${FlashLoanSource[selection.source]}`);
    console.log(`  Fee: ${selection.fee} bps (${selection.fee / 100}%)`);
    console.log(`  Estimated Cost: ${formatUnits(selection.estimatedCost, 6)} tokens`);
    console.log(`  Reason: ${selection.reason}`);
  }

  console.log('\n✅ Source selection demonstrates automatic optimization based on amount and token');
}

/**
 * Example 2: Simple 2-Hop Arbitrage
 * USDC → WETH → USDC
 */
async function example2_SimpleArbitrage() {
  console.log('\n=== Example 2: Simple 2-Hop Arbitrage ===\n');

  const executor = await setupExecutor();

  // Construct 2-hop path
  const path: UniversalSwapPath = {
    steps: [
      {
        pool: USDC_WETH_POOL,
        tokenIn: USDC,
        tokenOut: WETH,
        fee: 3000, // 0.3%
        minOut: parseUnits('0.499', 18), // Expect ~0.5 WETH
        dexType: DexType.UNISWAP_V3,
      },
      {
        pool: USDC_WETH_POOL,
        tokenIn: WETH,
        tokenOut: USDC,
        fee: 3000, // 0.3%
        minOut: parseUnits('1005', 6), // Require 0.5% profit
        dexType: DexType.UNISWAP_V3,
      },
    ],
    borrowAmount: parseUnits('1000', 6), // Borrow 1000 USDC
    minFinalAmount: parseUnits('1005', 6), // Minimum 0.5% profit
  };

  console.log('Path Configuration:');
  console.log(`  Borrow: 1000 USDC (via Balancer 0% fee)`);
  console.log(`  Step 1: USDC → WETH (Uniswap V3 0.3%)`);
  console.log(`  Step 2: WETH → USDC (Uniswap V3 0.3%)`);
  console.log(`  Expected: 1005 USDC (0.5% profit)`);
  console.log(`  Flash Loan Fee: $0 (Balancer)`);

  // Check source selection
  const selection = await executor.selectOptimalSource(USDC, parseUnits('1000', 6));
  console.log(`\nSelected Source: ${FlashLoanSource[selection.source]}`);
  console.log(`Fee: ${selection.fee} bps`);

  // Note: Actual execution requires signer
  if (!PRIVATE_KEY) {
    console.log('\n⚠️  No private key - simulation only');
    console.log('   Set PRIVATE_KEY environment variable to execute');
    return;
  }

  console.log('\n📝 Ready to execute (uncomment to run):');
  console.log('   const result = await executor.executeArbitrage(USDC, parseUnits("1000", 6), path);');
}

/**
 * Example 3: Complex 3-Hop Arbitrage
 * USDC → WETH → DAI → USDC
 */
async function example3_ComplexArbitrage() {
  console.log('\n=== Example 3: Complex 3-Hop Arbitrage ===\n');

  const executor = await setupExecutor();

  // Construct 3-hop path with multiple DEXes
  const path: UniversalSwapPath = {
    steps: [
      {
        pool: USDC_WETH_POOL,
        tokenIn: USDC,
        tokenOut: WETH,
        fee: 3000, // 0.3%
        minOut: parseUnits('0.499', 18),
        dexType: DexType.UNISWAP_V3,
      },
      {
        pool: WETH_DAI_POOL,
        tokenIn: WETH,
        tokenOut: DAI,
        fee: 500, // 0.05%
        minOut: parseUnits('999', 18),
        dexType: DexType.UNISWAP_V3,
      },
      {
        pool: DAI_USDC_POOL,
        tokenIn: DAI,
        tokenOut: USDC,
        fee: 3000, // SushiSwap ~0.3%
        minOut: parseUnits('1010', 6), // Require 1% profit
        dexType: DexType.SUSHISWAP,
      },
    ],
    borrowAmount: parseUnits('1000', 6),
    minFinalAmount: parseUnits('1010', 6),
  };

  console.log('Path Configuration:');
  console.log(`  Borrow: 1000 USDC (via Balancer 0% fee)`);
  console.log(`  Step 1: USDC → WETH (Uniswap V3 0.3%)`);
  console.log(`  Step 2: WETH → DAI (Uniswap V3 0.05%)`);
  console.log(`  Step 3: DAI → USDC (SushiSwap ~0.3%)`);
  console.log(`  Expected: 1010 USDC (1% profit)`);
  console.log(`  Flash Loan Fee: $0 (Balancer)`);

  // Check source
  const selection = await executor.selectOptimalSource(USDC, parseUnits('1000', 6));
  console.log(`\nSelected Source: ${FlashLoanSource[selection.source]}`);

  console.log('\n✅ Multi-DEX arbitrage demonstrates universal path execution');
}

/**
 * Example 4: Profit Estimation
 * Estimate profits before executing
 */
async function example4_ProfitEstimation() {
  console.log('\n=== Example 4: Profit Estimation ===\n');

  const executor = await setupExecutor();

  // Mock opportunity (would come from OpportunityDetector)
  const opportunity = {
    input: {
      token: USDC,
      amount: parseUnits('10000', 6).toString(),
    },
    path: [
      {
        protocol: 'uniswap_v3',
        poolAddress: USDC_WETH_POOL,
        tokenIn: USDC,
        tokenOut: WETH,
        fee: 3000,
        minAmountOut: parseUnits('4.99', 18).toString(),
      },
      {
        protocol: 'uniswap_v3',
        poolAddress: USDC_WETH_POOL,
        tokenIn: WETH,
        tokenOut: USDC,
        fee: 3000,
        minAmountOut: parseUnits('10100', 6).toString(),
      },
    ],
    expectedProfit: parseUnits('100', 6).toString(), // $100 profit
  } as any;

  console.log('Opportunity Analysis:');
  console.log(`  Input: $10,000 USDC`);
  console.log(`  Expected Gross Profit: $100`);

  const estimation = await executor.estimateProfit(opportunity);

  console.log(`\nProfit Breakdown:`);
  console.log(`  Source: ${FlashLoanSource[estimation.source]}`);
  console.log(`  Gross Profit: $${formatUnits(estimation.grossProfit, 6)}`);
  console.log(`  Flash Loan Fee: $${formatUnits(estimation.flashLoanFee, 6)}`);
  console.log(`  Estimated Gas Cost: ${formatUnits(estimation.estimatedGasCost, 18)} ETH`);
  console.log(`  Net Profit: $${formatUnits(estimation.netProfit, 6)}`);

  const isProfitable = estimation.netProfit > 0n;
  console.log(`\n${isProfitable ? '✅' : '❌'} ${isProfitable ? 'Profitable' : 'Not profitable'} after fees`);
}

/**
 * Example 5: Source Availability Checking
 * Check which sources support specific tokens
 */
async function example5_SourceAvailability() {
  console.log('\n=== Example 5: Source Availability Checking ===\n');

  const executor = await setupExecutor();

  const tokens = [
    { address: USDC, name: 'USDC', amount: parseUnits('10000', 6) },
    { address: WETH, name: 'WETH', amount: parseUnits('5', 18) },
    { address: DAI, name: 'DAI', amount: parseUnits('10000', 18) },
  ];

  for (const token of tokens) {
    console.log(`\n${token.name}:`);
    
    const balancerSupported = await executor.isBalancerSupported(token.address, token.amount);
    const dydxSupported = await executor.isDydxSupported(token.address, token.amount);
    
    console.log(`  Balancer: ${balancerSupported ? '✅' : '❌'} ${balancerSupported ? 'Supported (0% fee)' : 'Not supported'}`);
    console.log(`  dYdX: ${dydxSupported ? '✅' : '❌'} ${dydxSupported ? 'Supported (0% fee)' : 'Not supported (Ethereum only)'}`);
    console.log(`  Aave: ✅ Always supported (0.09% fee fallback)`);
  }
}

/**
 * Example 6: Contract Information
 * View contract configuration
 */
async function example6_ContractInfo() {
  console.log('\n=== Example 6: Contract Information ===\n');

  const executor = await setupExecutor();

  const owner = await executor.getOwner();
  const titheInfo = await executor.getTitheInfo();

  console.log('Contract Configuration:');
  console.log(`  Address: ${FLASH_SWAP_V3_ADDRESS}`);
  console.log(`  Owner: ${owner}`);
  console.log(`  Tithe Recipient: ${titheInfo.recipient}`);
  console.log(`  Tithe %: ${titheInfo.bps / 100}% (${titheInfo.bps} bps)`);
  console.log(`  Operator Share: ${(10000 - titheInfo.bps) / 100}%`);

  console.log('\nProfit Distribution:');
  console.log(`  For $1000 profit:`);
  console.log(`    → US Debt Reduction: $${(1000 * titheInfo.bps) / 10000}`);
  console.log(`    → Operator: $${(1000 * (10000 - titheInfo.bps)) / 10000}`);
}

// Run examples
async function main() {
  const example = process.env.EXAMPLE || '1';

  try {
    switch (example) {
      case '1':
        await example1_SourceSelection();
        break;
      case '2':
        await example2_SimpleArbitrage();
        break;
      case '3':
        await example3_ComplexArbitrage();
        break;
      case '4':
        await example4_ProfitEstimation();
        break;
      case '5':
        await example5_SourceAvailability();
        break;
      case '6':
        await example6_ContractInfo();
        break;
      default:
        console.log('Available examples:');
        console.log('  EXAMPLE=1 - Source Selection Analysis');
        console.log('  EXAMPLE=2 - Simple 2-Hop Arbitrage');
        console.log('  EXAMPLE=3 - Complex 3-Hop Arbitrage');
        console.log('  EXAMPLE=4 - Profit Estimation');
        console.log('  EXAMPLE=5 - Source Availability Checking');
        console.log('  EXAMPLE=6 - Contract Information');
    }
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
