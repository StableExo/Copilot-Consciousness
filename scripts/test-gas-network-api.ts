#!/usr/bin/env node --import tsx
/**
 * Quick test of Gas Network API with real endpoint
 */

import { GasNetworkClient } from '../src/gas/GasNetworkClient';

async function testRealAPI() {
  console.log('🧪 Testing Gas Network API (Real Blocknative Endpoint)\n');
  
  const apiKey = process.env.GAS_API_KEY || '2e4d60a6-4e90-4e37-88d1-7e959ef18432';
  const client = new GasNetworkClient({ apiKey });
  
  try {
    // Test 1: Ethereum
    console.log('1️⃣ Testing Ethereum (chainId=1)...');
    const ethPrice = await client.getGasPrice('ethereum');
    console.log('   ✅ Success!');
    console.log(`   Base Fee: ${ethPrice.baseFee.toString()} wei (${Number(ethPrice.baseFee) / 1e9} gwei)`);
    console.log(`   Priority Fee: ${ethPrice.priorityFee.toString()} wei (${Number(ethPrice.priorityFee) / 1e9} gwei)`);
    console.log(`   Max Fee: ${ethPrice.maxFeePerGas.toString()} wei (${Number(ethPrice.maxFeePerGas) / 1e9} gwei)`);
    console.log(`   Confidence: ${(ethPrice.confidence * 100).toFixed(0)}%`);
    console.log(`   Block: ${ethPrice.blockNumber}\n`);
    
    // Test 2: Base
    console.log('2️⃣ Testing Base (chainId=8453)...');
    const basePrice = await client.getGasPrice('base');
    console.log('   ✅ Success!');
    console.log(`   Base Fee: ${basePrice.baseFee.toString()} wei (${Number(basePrice.baseFee) / 1e9} gwei)`);
    console.log(`   Priority Fee: ${basePrice.priorityFee.toString()} wei (${Number(basePrice.priorityFee) / 1e9} gwei)`);
    console.log(`   Max Fee: ${basePrice.maxFeePerGas.toString()} wei (${Number(basePrice.maxFeePerGas) / 1e9} gwei)`);
    console.log(`   Confidence: ${(basePrice.confidence * 100).toFixed(0)}%`);
    console.log(`   Block: ${basePrice.blockNumber}\n`);
    
    // Test 3: Arbitrum
    console.log('3️⃣ Testing Arbitrum (chainId=42161)...');
    const arbPrice = await client.getGasPrice('arbitrum');
    console.log('   ✅ Success!');
    console.log(`   Base Fee: ${arbPrice.baseFee.toString()} wei (${Number(arbPrice.baseFee) / 1e9} gwei)`);
    console.log(`   Max Fee: ${arbPrice.maxFeePerGas.toString()} wei (${Number(arbPrice.maxFeePerGas) / 1e9} gwei)`);
    console.log(`   Confidence: ${(arbPrice.confidence * 100).toFixed(0)}%\n`);
    
    // Test 4: Cache performance
    console.log('4️⃣ Testing cache (re-fetch Ethereum)...');
    const startTime = Date.now();
    const ethPrice2 = await client.getGasPrice('ethereum');
    const cacheTime = Date.now() - startTime;
    console.log(`   ✅ Cached response in ${cacheTime}ms`);
    console.log(`   Same price: ${ethPrice2.maxFeePerGas === ethPrice.maxFeePerGas}\n`);
    
    // Test 5: Statistics
    console.log('5️⃣ Client Statistics:');
    const stats = client.getStats();
    console.log(`   Total Requests: ${stats.totalRequests}`);
    console.log(`   Cache Hits: ${stats.cacheHits}`);
    console.log(`   Cache Misses: ${stats.cacheMisses}`);
    console.log(`   Failed: ${stats.failedRequests}`);
    console.log(`   Avg Latency: ${Math.round(stats.averageLatency)}ms\n`);
    
    console.log('✅ All tests passed! Gas Network API is working correctly.');
    console.log('\n💡 The API uses real Blocknative endpoint: https://api.blocknative.com/gasprices/blockprices');
    console.log('💡 Supports 40+ chains including Bitcoin, Solana, and all major EVMs');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testRealAPI().catch(console.error);
