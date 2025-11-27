/**
 * Test script to verify multi-DEX pool discovery
 * Tests Phase 3 (more DEX sources) and Phase 5 (enhanced logging)
 */

import { JsonRpcProvider } from 'ethers';
import { DEXRegistry } from '../src/dex/core/DEXRegistry';
import { OptimizedPoolScanner } from '../src/arbitrage/OptimizedPoolScanner';

// Base network RPC - use environment variable or Coinbase's official endpoint as fallback
const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://base.llamarpc.com';

// Common tokens on Base
const WETH = '0x4200000000000000000000000000000000000006';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

async function testMultiDexScan() {
  console.log('=== Multi-DEX Pool Discovery Test ===\n');
  
  try {
    // Initialize provider
    console.log(`Connecting to Base network: ${BASE_RPC_URL}`);
    const provider = new JsonRpcProvider(BASE_RPC_URL);
    
    // Check connection
    const network = await provider.getNetwork();
    console.log(`✓ Connected to network: ${network.name} (chainId: ${network.chainId})\n`);
    
    if (Number(network.chainId) !== 8453) {
      console.log(`⚠ Warning: Expected Base (8453) but got chainId ${network.chainId}\n`);
    }
    
    // Initialize DEX registry
    const registry = new DEXRegistry();
    const dexes = registry.getDEXesByNetwork('8453');
    console.log(`Found ${dexes.length} DEXes configured for Base network:`);
    dexes.forEach((dex) => {
      console.log(`  - ${dex.name} (${dex.protocol}, priority: ${dex.priority})`);
    });
    console.log();
    
    // Initialize pool scanner
    const scanner = new OptimizedPoolScanner(registry, provider, 8453);
    
    // Test with common token pair (WETH/USDC is most liquid on Base)
    const tokens = [WETH, USDC];
    console.log('Testing token pair:');
    console.log(`  WETH: ${WETH}`);
    console.log(`  USDC: ${USDC}`);
    console.log();
    
    console.log('Starting multi-DEX pool scan...\n');
    console.log('='.repeat(80));
    const edges = await scanner.buildGraphEdges(tokens);
    console.log('='.repeat(80));
    
    console.log(`\n=== FINAL RESULTS ===`);
    console.log(`Total edges found: ${edges.length}`);
    console.log(`Total unique pools: ${edges.length / 2} (each pool creates 2 directional edges)\n`);
    
    if (edges.length === 0) {
      console.log('⚠️  NO POOLS FOUND - This may indicate:');
      console.log('   1. Network connectivity issues');
      console.log('   2. Liquidity thresholds too high');
      console.log('   3. Factory addresses incorrect');
      console.log('   4. Pool data fetching errors');
    } else {
      // Group by DEX
      const dexMap = new Map<string, number>();
      for (const edge of edges) {
        dexMap.set(edge.dexName, (dexMap.get(edge.dexName) || 0) + 1);
      }
      
      console.log('Pools found per DEX:');
      for (const [dexName, count] of Array.from(dexMap.entries()).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${dexName}: ${count / 2} pool(s)`);
      }
      
      const uniqueDexes = dexMap.size;
      console.log(`\nUnique DEXes with pools: ${uniqueDexes}`);
      
      if (uniqueDexes >= 2) {
        console.log(`\n✅ SUCCESS: Found pools on ${uniqueDexes} different DEXes!`);
        console.log('   Arbitrage is possible between these DEXes.');
      } else {
        console.log(`\n⚠️  WARNING: Only found pools on ${uniqueDexes} DEX.`);
        console.log('   Arbitrage requires pools on 2+ DEXes for the same token pair.');
      }
    }
    
    console.log('\n=== TEST COMPLETE ===');
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

testMultiDexScan();
