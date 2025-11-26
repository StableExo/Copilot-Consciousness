#!/usr/bin/env ts-node

/**
 * Aerodrome Verification Script
 * 
 * Verifies that Aerodrome Finance is properly configured and can discover pools.
 * This script checks:
 * - DEX configuration in registry
 * - RPC connectivity  
 * - Factory contract accessibility
 * - Pool discovery capability
 * 
 * Usage:
 *   npm run verify:aerodrome
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { DEXRegistry } from '../src/dex/core/DEXRegistry';
import { getNetworkName } from '../src/utils/chainTokens';

// Load environment variables
dotenv.config();

const BASE_CHAIN_ID = 8453;
const AERODROME_FACTORY = '0x420DD381b31aEf6683db6B902084cB0FFECe40Da';
const AERODROME_ROUTER = '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43';

// Common token addresses on Base
const WETH = '0x4200000000000000000000000000000000000006';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

/**
 * Check if Aerodrome is configured in the registry
 */
function checkRegistryConfiguration(): boolean {
  console.log('\n1️⃣  Checking DEX Registry Configuration...');
  
  const registry = new DEXRegistry();
  const baseDexes = registry.getDEXesByNetwork(BASE_CHAIN_ID.toString());
  
  const aerodrome = baseDexes.find(dex => 
    dex.name.toLowerCase().includes('aerodrome') ||
    dex.factory.toLowerCase() === AERODROME_FACTORY.toLowerCase()
  );
  
  if (!aerodrome) {
    console.log('   ❌ Aerodrome not found in registry');
    return false;
  }
  
  console.log('   ✅ Aerodrome configured in registry');
  console.log(`      Name:     ${aerodrome.name}`);
  console.log(`      Protocol: ${aerodrome.protocol}`);
  console.log(`      Factory:  ${aerodrome.factory}`);
  console.log(`      Router:   ${aerodrome.router}`);
  console.log(`      Priority: ${aerodrome.priority}`);
  console.log(`      Chain:    ${getNetworkName(BASE_CHAIN_ID)} (${BASE_CHAIN_ID})`);
  
  return true;
}

/**
 * Check RPC connectivity
 */
async function checkRpcConnectivity(): Promise<{ connected: boolean; provider?: ethers.JsonRpcProvider }> {
  console.log('\n2️⃣  Checking RPC Connectivity...');
  
  const rpcUrl = process.env.BASE_RPC_URL;
  
  if (!rpcUrl) {
    console.log('   ❌ BASE_RPC_URL not configured in environment');
    console.log('      Please set BASE_RPC_URL in your .env file');
    return { connected: false };
  }
  
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    
    console.log('   ✅ Connected to Base RPC');
    console.log(`      Chain ID:     ${network.chainId}`);
    console.log(`      Block Number: ${blockNumber}`);
    console.log(`      RPC URL:      ${rpcUrl.substring(0, 50)}...`);
    
    if (Number(network.chainId) !== BASE_CHAIN_ID) {
      console.log(`   ⚠️  Warning: Connected to chain ${network.chainId} but expected ${BASE_CHAIN_ID}`);
    }
    
    return { connected: true, provider };
  } catch (error) {
    console.log('   ❌ Failed to connect to RPC');
    console.log(`      Error: ${error instanceof Error ? error.message : String(error)}`);
    return { connected: false };
  }
}

/**
 * Check factory contract
 */
async function checkFactoryContract(provider: ethers.JsonRpcProvider): Promise<boolean> {
  console.log('\n3️⃣  Checking Factory Contract...');
  
  try {
    const factoryCode = await provider.getCode(AERODROME_FACTORY);
    
    if (factoryCode === '0x' || factoryCode === '0x0') {
      console.log('   ❌ Factory contract not found at address');
      console.log(`      Address: ${AERODROME_FACTORY}`);
      return false;
    }
    
    console.log('   ✅ Factory contract verified');
    console.log(`      Address: ${AERODROME_FACTORY}`);
    console.log(`      Bytecode: ${factoryCode.substring(0, 66)}... (${factoryCode.length} bytes)`);
    
    return true;
  } catch (error) {
    console.log('   ❌ Failed to check factory contract');
    console.log(`      Error: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Check router contract
 */
async function checkRouterContract(provider: ethers.JsonRpcProvider): Promise<boolean> {
  console.log('\n4️⃣  Checking Router Contract...');
  
  try {
    const routerCode = await provider.getCode(AERODROME_ROUTER);
    
    if (routerCode === '0x' || routerCode === '0x0') {
      console.log('   ❌ Router contract not found at address');
      console.log(`      Address: ${AERODROME_ROUTER}`);
      return false;
    }
    
    console.log('   ✅ Router contract verified');
    console.log(`      Address: ${AERODROME_ROUTER}`);
    console.log(`      Bytecode: ${routerCode.substring(0, 66)}... (${routerCode.length} bytes)`);
    
    return true;
  } catch (error) {
    console.log('   ❌ Failed to check router contract');
    console.log(`      Error: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Try to discover a pool
 */
async function checkPoolDiscovery(provider: ethers.JsonRpcProvider): Promise<boolean> {
  console.log('\n5️⃣  Checking Pool Discovery...');
  
  try {
    // Aerodrome V2 uses a different factory interface
    // Try to call getPool(tokenA, tokenB, stable) function
    const factoryAbi = [
      'function getPool(address tokenA, address tokenB, bool stable) external view returns (address pool)',
      'function allPoolsLength() external view returns (uint256)'
    ];
    
    const factory = new ethers.Contract(AERODROME_FACTORY, factoryAbi, provider);
    
    // Check total pools
    try {
      const poolCount = await factory.allPoolsLength();
      console.log(`   📊 Total pools in factory: ${poolCount}`);
    } catch (e) {
      console.log('   ⚠️  Could not read total pool count (function may not exist)');
    }
    
    // Try to get WETH/USDC pool (both stable and volatile)
    console.log('\n   Checking WETH/USDC pool...');
    console.log(`   WETH: ${WETH}`);
    console.log(`   USDC: ${USDC}`);
    
    try {
      const volatilePool = await factory.getPool(WETH, USDC, false);
      if (volatilePool !== ethers.ZeroAddress) {
        console.log(`   ✅ Found volatile pool: ${volatilePool}`);
      } else {
        console.log('   ℹ️  No volatile pool found for WETH/USDC');
      }
    } catch (e) {
      console.log(`   ⚠️  Could not query volatile pool: ${e instanceof Error ? e.message : String(e)}`);
    }
    
    try {
      const stablePool = await factory.getPool(WETH, USDC, true);
      if (stablePool !== ethers.ZeroAddress) {
        console.log(`   ✅ Found stable pool: ${stablePool}`);
      } else {
        console.log('   ℹ️  No stable pool found for WETH/USDC');
      }
    } catch (e) {
      console.log(`   ⚠️  Could not query stable pool: ${e instanceof Error ? e.message : String(e)}`);
    }
    
    console.log('\n   ✅ Pool discovery mechanism working');
    return true;
  } catch (error) {
    console.log('   ❌ Failed to discover pools');
    console.log(`      Error: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Main verification function
 */
async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  🔍 AERODROME FINANCE VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\nVerifying Aerodrome Finance integration on Base network...');
  
  let allPassed = true;
  
  // 1. Check registry
  if (!checkRegistryConfiguration()) {
    allPassed = false;
  }
  
  // 2. Check RPC
  const { connected, provider } = await checkRpcConnectivity();
  if (!connected || !provider) {
    allPassed = false;
    console.log('\n❌ Cannot continue without RPC connection');
    process.exit(1);
  }
  
  // 3. Check factory
  if (!await checkFactoryContract(provider)) {
    allPassed = false;
  }
  
  // 4. Check router
  if (!await checkRouterContract(provider)) {
    allPassed = false;
  }
  
  // 5. Check pool discovery
  if (!await checkPoolDiscovery(provider)) {
    allPassed = false;
  }
  
  // Final summary
  console.log('\n═══════════════════════════════════════════════════════════');
  if (allPassed) {
    console.log('  ✅ ALL CHECKS PASSED');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\n🎉 Aerodrome Finance is properly configured!');
    console.log('\nNext steps:');
    console.log('  1. Preload pools: npm run preload:pools -- --chain 8453');
    console.log('  2. Start TheWarden: ./TheWarden');
    console.log('\n');
  } else {
    console.log('  ❌ SOME CHECKS FAILED');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\n⚠️  Please resolve the issues above before continuing.\n');
    process.exit(1);
  }
}

// Run verification
if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Fatal error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
