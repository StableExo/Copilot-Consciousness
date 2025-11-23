#!/usr/bin/env ts-node
/**
 * Pool Performance Monitor
 * 
 * Diagnostic script to measure and analyze pool detection performance.
 * Compares standard vs optimized scanning approaches.
 * 
 * Usage:
 *   ts-node scripts/monitor-pool-performance.ts
 *   
 * Environment variables:
 *   BASE_RPC_URL - RPC endpoint for Base network
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { DEXRegistry } from '../src/dex/core/DEXRegistry';
import { MultiHopDataFetcher } from '../src/arbitrage/MultiHopDataFetcher';
import { OptimizedPoolScanner } from '../src/arbitrage/OptimizedPoolScanner';

dotenv.config();

// Base network tokens
const BASE_TOKENS = {
  WETH: '0x4200000000000000000000000000000000000006',
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
  DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
};

interface PerformanceMetrics {
  totalTime: number;
  poolsChecked: number;
  poolsFound: number;
  avgTimePerPool: number;
  cacheHits?: number;
  rpcCalls?: number;
}

async function measureStandardScanner(
  registry: DEXRegistry,
  tokens: string[]
): Promise<PerformanceMetrics> {
  console.log('\n📊 Testing Standard MultiHopDataFetcher...');
  
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.BASE_RPC_URL || 'https://mainnet.base.org'
  );

  const fetcher = new MultiHopDataFetcher(registry, 8453);
  
  const startTime = Date.now();
  const edges = await fetcher.buildGraphEdges(tokens);
  const endTime = Date.now();
  
  const totalTime = endTime - startTime;
  const poolsFound = edges.length / 2; // Each pool creates 2 edges
  const poolsChecked = tokens.length * (tokens.length - 1) * registry.getAllDEXes().length;
  
  return {
    totalTime,
    poolsChecked,
    poolsFound,
    avgTimePerPool: totalTime / poolsChecked,
    cacheHits: fetcher.getCachedPoolCount(),
  };
}

async function measureOptimizedScanner(
  registry: DEXRegistry,
  tokens: string[]
): Promise<PerformanceMetrics> {
  console.log('\n⚡ Testing Optimized Pool Scanner...');
  
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.BASE_RPC_URL || 'https://mainnet.base.org'
  );

  const scanner = new OptimizedPoolScanner(registry, provider, 8453);
  
  const startTime = Date.now();
  const edges = await scanner.buildGraphEdges(tokens);
  const endTime = Date.now();
  
  const totalTime = endTime - startTime;
  const poolsFound = edges.length / 2;
  const poolsChecked = tokens.length * (tokens.length - 1) * registry.getAllDEXes().length;
  
  const cacheStats = scanner.getCacheStats();
  
  return {
    totalTime,
    poolsChecked,
    poolsFound,
    avgTimePerPool: totalTime / poolsChecked,
    cacheHits: cacheStats.validEntries,
  };
}

function printMetrics(label: string, metrics: PerformanceMetrics): void {
  console.log(`\n${label} Results:`);
  console.log(`  Total Time: ${(metrics.totalTime / 1000).toFixed(2)}s`);
  console.log(`  Pools Checked: ${metrics.poolsChecked}`);
  console.log(`  Pools Found: ${metrics.poolsFound}`);
  console.log(`  Avg Time/Pool: ${(metrics.avgTimePerPool / 1000).toFixed(3)}s`);
  if (metrics.cacheHits !== undefined) {
    console.log(`  Cache Hits: ${metrics.cacheHits}`);
  }
  if (metrics.rpcCalls !== undefined) {
    console.log(`  RPC Calls: ${metrics.rpcCalls}`);
  }
}

function compareMetrics(standard: PerformanceMetrics, optimized: PerformanceMetrics): void {
  console.log('\n📈 Performance Comparison:');
  
  const speedup = standard.totalTime / optimized.totalTime;
  const percentImprovement = ((standard.totalTime - optimized.totalTime) / standard.totalTime * 100);
  
  console.log(`  Speed Improvement: ${speedup.toFixed(2)}x faster`);
  console.log(`  Time Saved: ${percentImprovement.toFixed(1)}%`);
  console.log(`  Absolute Time Saved: ${((standard.totalTime - optimized.totalTime) / 1000).toFixed(2)}s`);
  
  if (standard.poolsFound !== optimized.poolsFound) {
    console.log(`  ⚠️  Warning: Different number of pools found!`);
    console.log(`     Standard: ${standard.poolsFound}, Optimized: ${optimized.poolsFound}`);
  } else {
    console.log(`  ✅ Pool detection consistency: Both found ${standard.poolsFound} pools`);
  }
}

async function main() {
  console.log('🔍 Pool Performance Monitor');
  console.log('============================\n');
  
  // Check environment
  if (!process.env.BASE_RPC_URL) {
    console.error('❌ BASE_RPC_URL not set in environment');
    process.exit(1);
  }
  
  console.log(`RPC: ${process.env.BASE_RPC_URL}`);
  console.log(`Testing with ${Object.keys(BASE_TOKENS).length} tokens`);
  
  // Initialize registry with Base DEXes
  const registry = new DEXRegistry();
  
  // Get token addresses
  const tokens = Object.values(BASE_TOKENS);
  
  try {
    // Test standard scanner
    const standardMetrics = await measureStandardScanner(registry, tokens);
    printMetrics('Standard Scanner', standardMetrics);
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test optimized scanner
    const optimizedMetrics = await measureOptimizedScanner(registry, tokens);
    printMetrics('Optimized Scanner', optimizedMetrics);
    
    // Compare results
    compareMetrics(standardMetrics, optimizedMetrics);
    
    // Test cache performance on second run
    console.log('\n🔄 Testing Cache Performance (Second Run)...');
    const startTime = Date.now();
    
    const provider = new ethers.providers.JsonRpcProvider(
      process.env.BASE_RPC_URL || 'https://mainnet.base.org'
    );
    const scanner = new OptimizedPoolScanner(registry, provider, 8453);
    
    // First run (populate cache)
    await scanner.buildGraphEdges(tokens);
    
    // Second run (should use cache)
    const cachedStartTime = Date.now();
    await scanner.buildGraphEdges(tokens);
    const cachedEndTime = Date.now();
    
    const cacheTime = cachedEndTime - cachedStartTime;
    console.log(`  Cached scan time: ${(cacheTime / 1000).toFixed(2)}s`);
    console.log(`  Cache speedup: ${(optimizedMetrics.totalTime / cacheTime).toFixed(2)}x`);
    
    // Summary
    console.log('\n✅ Performance Analysis Complete');
    console.log('\nRecommendation:');
    if (standardMetrics.totalTime > 30000) {
      console.log('  ⚠️  Standard scanner is SLOW (>30s)');
      console.log('  ✅ Use OptimizedPoolScanner for production');
    } else if (optimizedMetrics.totalTime < 10000) {
      console.log('  ✅ Optimized scanner achieves <10s scan time');
      console.log('  ✅ Ready for production use');
    } else {
      console.log('  ℹ️  Further optimization may be needed');
    }
    
  } catch (error: any) {
    console.error('\n❌ Error during performance test:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main as monitorPoolPerformance };
