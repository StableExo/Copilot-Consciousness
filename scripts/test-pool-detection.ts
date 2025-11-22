/**
 * Test script to validate pool detection on Base network
 * 
 * This script tests:
 * 1. Connection to Base network
 * 2. Uniswap V3 pool detection with multiple fee tiers
 * 3. Pool liquidity checking
 */

import { ethers } from 'ethers';
import { V3_LIQUIDITY_SCALE_FACTOR } from '../src/arbitrage/constants';

// Base network RPC
const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';

// Uniswap V3 Factory on Base
const UNISWAP_V3_FACTORY = '0x33128a8fC17869897dcE68Ed026d694621f6FDfD';

// Common tokens on Base
const WETH = '0x4200000000000000000000000000000000000006';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const DAI = '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb';

// Fee tiers
const FEE_TIERS = [
  { fee: 100, label: '0.01%' },
  { fee: 500, label: '0.05%' },
  { fee: 3000, label: '0.3%' },
  { fee: 10000, label: '1%' }
];

async function testPoolDetection() {
  console.log('=== Base Network Pool Detection Test ===\n');
  
  try {
    // Initialize provider
    console.log(`Connecting to Base network: ${BASE_RPC_URL}`);
    const provider = new ethers.providers.JsonRpcProvider(BASE_RPC_URL);
    
    // Check connection
    const network = await provider.getNetwork();
    console.log(`✓ Connected to network: ${network.name} (chainId: ${network.chainId})\n`);
    
    if (network.chainId !== 8453) {
      console.log(`⚠ Warning: Expected Base (8453) but got chainId ${network.chainId}`);
    }
    
    // Create factory contract
    const factoryAbi = [
      'function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)'
    ];
    const factory = new ethers.Contract(UNISWAP_V3_FACTORY, factoryAbi, provider);
    
    console.log('Checking Uniswap V3 WETH/USDC pools on Base:\n');
    
    let poolsFound = 0;
    
    // Check each fee tier
    for (const { fee, label } of FEE_TIERS) {
      try {
        const poolAddress = await factory.getPool(WETH, USDC, fee);
        
        if (poolAddress && poolAddress !== ethers.constants.AddressZero) {
          poolsFound++;
          console.log(`✓ Fee ${label} (${fee}): Pool found at ${poolAddress}`);
          
          // Check pool liquidity
          const poolAbi = [
            'function liquidity() external view returns (uint128)',
            'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)'
          ];
          const pool = new ethers.Contract(poolAddress, poolAbi, provider);
          
          try {
            const liquidity = await pool.liquidity();
            const slot0 = await pool.slot0();
            
            console.log(`  Liquidity: ${liquidity.toString()}`);
            console.log(`  SqrtPriceX96: ${slot0.sqrtPriceX96.toString()}`);
            console.log(`  Tick: ${slot0.tick}`);
            
            // Check if liquidity meets threshold
            const liquidityBigInt = BigInt(liquidity.toString());
            
            // V3 liquidity is in L = sqrt(x*y) format, which is significantly smaller than V2 reserves
            // See constants.ts V3_LIQUIDITY_SCALE_FACTOR for detailed mathematical explanation
            const threshold = BigInt('100000000000000000000') / BigInt(V3_LIQUIDITY_SCALE_FACTOR); // 100 tokens / scale factor
            
            if (liquidityBigInt >= threshold) {
              console.log(`  ✓ Pool has sufficient V3 liquidity (≥${threshold.toString()})\n`);
            } else {
              console.log(`  ⚠ Pool has very low liquidity (<${threshold.toString()})\n`);
            }
          } catch (e: any) {
            console.log(`  ✗ Error checking liquidity: ${e.message}\n`);
          }
        } else {
          console.log(`✗ Fee ${label} (${fee}): No pool found\n`);
        }
      } catch (e: any) {
        console.log(`✗ Fee ${label} (${fee}): Error - ${e.message}\n`);
      }
    }
    
    console.log('\n=== Summary ===');
    console.log(`Pools found: ${poolsFound}/${FEE_TIERS.length}`);
    
    if (poolsFound > 0) {
      console.log('\n✓ Pool detection is working correctly!');
      console.log('The system should now be able to detect pools on Base network.');
    } else {
      console.log('\n✗ No pools found. Check:');
      console.log('  1. RPC URL is correct and accessible');
      console.log('  2. Token addresses are correct for Base network');
      console.log('  3. Factory address is correct');
    }
    
  } catch (error: any) {
    console.error(`\n✗ Test failed: ${error.message}`);
    if (error.code === 'NETWORK_ERROR') {
      console.error('  → Cannot connect to Base network. Check BASE_RPC_URL environment variable.');
    }
  }
}

// Run the test
testPoolDetection().catch(console.error);
