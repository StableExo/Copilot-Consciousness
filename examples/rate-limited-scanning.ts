/**
 * Example: Rate-Limited RPC Scanning
 * 
 * Demonstrates how to use RPCManager for efficient, rate-limited operations
 */

import { rpcManager } from '../src/chains/RPCManager';
import { ethers } from 'ethers';

async function main() {
  console.log('=== Rate-Limited RPC Scanning Example ===\n');

  const rpcUrl = process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

  // Example 1: Basic Rate-Limited Call
  console.log('1. Basic Rate-Limited Call');
  console.log('---------------------------');

  const blockNumber = await rpcManager.executeWithRateLimit(
    rpcUrl,
    () => provider.getBlockNumber()
  );
  console.log(`Current block: ${blockNumber}`);

  const gasPrice = await rpcManager.executeWithRateLimit(
    rpcUrl,
    () => provider.getGasPrice()
  );
  console.log(`Gas price: ${ethers.utils.formatUnits(gasPrice, 'gwei')} gwei`);

  // Example 2: Batch Operations
  console.log('\n2. Batch Operations');
  console.log('--------------------');

  const poolAddresses = [
    '0xC31E54c7a869B9FcBEcc14363CF510d1c41fa443',  // WETH-USDC
    '0xC6962004f452bE9203591991D15f6b388e09E8D0',  // WETH-USDT
    '0x0e4831319A50228B9e450861297aB92dee15B44F'   // WETH-ARB
  ];

  console.log(`Fetching data for ${poolAddresses.length} pools...`);

  const startTime = Date.now();
  
  const poolDataPromises = poolAddresses.map(address =>
    rpcManager.executeWithRateLimit(
      rpcUrl,
      async () => {
        const code = await provider.getCode(address);
        const balance = await provider.getBalance(address);
        return { address, hasCode: code !== '0x', balance: balance.toString() };
      }
    )
  );

  const poolData = await Promise.all(poolDataPromises);
  const duration = Date.now() - startTime;

  console.log(`\nCompleted in ${duration}ms`);
  poolData.forEach(pool => {
    console.log(`  ${pool.address.slice(0, 10)}... - Code: ${pool.hasCode}`);
  });

  // Example 3: High-Volume Scanning
  console.log('\n3. High-Volume Scanning (100 requests)');
  console.log('---------------------------------------');

  console.log('Executing 100 rate-limited requests...');
  const highVolumeStart = Date.now();

  const requests = Array(100).fill(null).map((_, i) =>
    rpcManager.executeWithRateLimit(
      rpcUrl,
      () => provider.getBlock(blockNumber - i)
    )
  );

  await Promise.all(requests);
  const highVolumeDuration = Date.now() - highVolumeStart;

  console.log(`Completed 100 requests in ${highVolumeDuration}ms`);
  console.log(`Average: ${(highVolumeDuration / 100).toFixed(2)}ms per request`);

  // Example 4: Metrics Tracking
  console.log('\n4. Metrics Tracking');
  console.log('--------------------');

  const metrics = rpcManager.getMetrics(rpcUrl);
  console.log(`Total Requests: ${metrics.totalRequests}`);
  console.log(`Successful: ${metrics.successfulRequests}`);
  console.log(`Failed: ${metrics.failedRequests}`);
  console.log(`Timeouts: ${metrics.timeouts}`);
  console.log(`Success Rate: ${((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2)}%`);
  console.log(`Avg Latency: ${metrics.avgLatency.toFixed(2)}ms`);

  // Example 5: Queue Status
  console.log('\n5. Queue Status');
  console.log('----------------');

  const status = rpcManager.getQueueStatus(rpcUrl);
  if (status) {
    console.log(`Queue Size (waiting): ${status.size}`);
    console.log(`Pending (running): ${status.pending}`);
    console.log(`Paused: ${status.isPaused}`);
  }

  // Example 6: Error Handling
  console.log('\n6. Error Handling');
  console.log('------------------');

  try {
    await rpcManager.executeWithRateLimit(
      rpcUrl,
      async () => {
        throw new Error('Simulated RPC error');
      }
    );
  } catch (error: any) {
    console.log(`✅ Error caught and handled: ${error.message}`);
  }

  // Example 7: Custom Configuration
  console.log('\n7. Custom Configuration');
  console.log('------------------------');

  const customRpcUrl = 'https://custom-rpc.example.com';
  
  console.log('Configuring custom endpoint with aggressive limits...');
  rpcManager.configureEndpoint(customRpcUrl, {
    concurrency: 50,
    intervalCap: 200,
    timeout: 5000
  });
  console.log('✅ Configuration applied');

  // Example 8: Multi-Endpoint Strategy
  console.log('\n8. Multi-Endpoint Strategy');
  console.log('----------------------------');

  const endpoints = [
    'https://arb1.arbitrum.io/rpc',
    'https://arbitrum.llamarpc.com',
    'https://rpc.ankr.com/arbitrum'
  ];

  console.log('Configuring multiple endpoints...');
  endpoints.forEach((endpoint, index) => {
    rpcManager.configureEndpoint(endpoint, {
      concurrency: 10,
      intervalCap: 50,
      timeout: 30000
    });
    console.log(`  ${index + 1}. ${endpoint.slice(0, 40)}...`);
  });

  // Example 9: Failover Implementation
  console.log('\n9. Failover Implementation');
  console.log('---------------------------');

  async function executeWithFailover<T>(
    operation: (provider: ethers.providers.JsonRpcProvider) => Promise<T>
  ): Promise<T> {
    for (const endpoint of endpoints) {
      try {
        const provider = new ethers.providers.JsonRpcProvider(endpoint);
        return await rpcManager.executeWithRateLimit(
          endpoint,
          () => operation(provider)
        );
      } catch (error) {
        console.log(`  ❌ ${endpoint.slice(0, 30)}... failed`);
        continue;
      }
    }
    throw new Error('All endpoints failed');
  }

  try {
    const block = await executeWithFailover(p => p.getBlockNumber());
    console.log(`✅ Successfully retrieved block number: ${block}`);
  } catch (error: any) {
    console.log(`❌ Failover failed: ${error.message}`);
  }

  // Example 10: Performance Comparison
  console.log('\n10. Performance Comparison');
  console.log('---------------------------');

  console.log('Without rate limiting (raw requests)...');
  const rawStart = Date.now();
  
  try {
    const rawPromises = Array(50).fill(null).map(() => 
      provider.getBlockNumber()
    );
    await Promise.all(rawPromises);
    const rawDuration = Date.now() - rawStart;
    console.log(`  Completed in ${rawDuration}ms`);
  } catch (error) {
    console.log('  ❌ Some requests may have been throttled');
  }

  console.log('\nWith rate limiting (RPCManager)...');
  const managedStart = Date.now();
  
  const managedPromises = Array(50).fill(null).map(() =>
    rpcManager.executeWithRateLimit(rpcUrl, () => provider.getBlockNumber())
  );
  await Promise.all(managedPromises);
  const managedDuration = Date.now() - managedStart;
  console.log(`  Completed in ${managedDuration}ms`);
  console.log(`  ✅ All requests successful, no throttling`);

  // Final Metrics
  console.log('\n=== Final Metrics ===');
  const finalMetrics = rpcManager.getMetrics(rpcUrl);
  console.log(`Total Requests: ${finalMetrics.totalRequests}`);
  console.log(`Success Rate: ${((finalMetrics.successfulRequests / finalMetrics.totalRequests) * 100).toFixed(2)}%`);
  console.log(`Avg Latency: ${finalMetrics.avgLatency.toFixed(2)}ms`);

  // Cleanup
  console.log('\n=== Cleanup ===');
  console.log('Shutting down RPCManager...');
  await rpcManager.shutdown();
  console.log('✅ Shutdown complete');
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

export { main };
