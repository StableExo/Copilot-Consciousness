# Rate Limiting Guide

## Overview

The Rate Limiting system implements the "Regulator" pattern from AxionCitadel, providing production-grade RPC rate limiting using p-queue. This prevents throttling, improves reliability, and ensures efficient use of RPC resources.

## Architecture

### RPCManager

The `RPCManager` class manages per-endpoint queues with configurable rate limits:

```
┌─────────────────────────────────────────┐
│           RPCManager                     │
│                                          │
│  ┌────────────┐  ┌────────────┐        │
│  │  Queue 1   │  │  Queue 2   │        │
│  │  RPC A     │  │  RPC B     │  ...   │
│  └────────────┘  └────────────┘        │
│                                          │
│  Per-endpoint configuration              │
│  - Concurrency limits                    │
│  - Rate limits                           │
│  - Timeout handling                      │
│  - Metrics tracking                      │
└─────────────────────────────────────────┘
```

## Configuration

### Default Configuration

```typescript
const DEFAULT_QUEUE_CONFIG = {
  concurrency: 10,           // Max concurrent requests
  interval: 1000,            // Time window (1 second)
  intervalCap: 50,           // Max 50 requests per second
  timeout: 30000,            // 30 second timeout
  throwOnTimeout: true
};
```

### Per-Endpoint Configuration

```typescript
import { rpcManager } from './src/chains/RPCManager';

// Configure specific endpoint
rpcManager.configureEndpoint('https://arb1.arbitrum.io/rpc', {
  concurrency: 15,
  intervalCap: 100,
  timeout: 20000
});

// Configure conservative limits for free tier
rpcManager.configureEndpoint('https://free-rpc.example.com', {
  concurrency: 3,
  intervalCap: 10,
  timeout: 45000
});

// Configure aggressive limits for paid tier
rpcManager.configureEndpoint('https://premium-rpc.example.com', {
  concurrency: 50,
  intervalCap: 200,
  timeout: 10000
});
```

### Initialization with Config

```typescript
import { RPCManager } from './src/chains/RPCManager';

const manager = new RPCManager({
  defaultConfig: {
    concurrency: 20,
    intervalCap: 75
  },
  perEndpointConfig: new Map([
    ['https://arb1.arbitrum.io/rpc', { concurrency: 30, intervalCap: 150 }],
    ['https://eth.llamarpc.com', { concurrency: 10, intervalCap: 50 }]
  ])
});
```

## Usage

### Basic Usage

```typescript
import { rpcManager } from './src/chains/RPCManager';
import { ethers } from 'ethers';

const provider = new ethers.providers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);

// Execute RPC call with rate limiting
const blockNumber = await rpcManager.executeWithRateLimit(
  process.env.ARBITRUM_RPC_URL!,
  async () => provider.getBlockNumber()
);

console.log(`Current block: ${blockNumber}`);
```

### Batch Requests

```typescript
// Execute multiple requests with rate limiting
const requests = [
  () => provider.getBlockNumber(),
  () => provider.getGasPrice(),
  () => provider.getBalance(address)
];

const results = await Promise.all(
  requests.map(req => 
    rpcManager.executeWithRateLimit(rpcUrl, req)
  )
);

const [blockNumber, gasPrice, balance] = results;
```

### Error Handling

```typescript
try {
  const result = await rpcManager.executeWithRateLimit(
    rpcUrl,
    async () => {
      // Your RPC operation
      return provider.getBlock('latest');
    }
  );
} catch (error) {
  if (error.name === 'TimeoutError') {
    console.error('Request timed out');
    // Handle timeout
  } else {
    console.error('RPC call failed:', error);
    // Handle other errors
  }
}
```

## Metrics

### Getting Metrics

```typescript
// Get metrics for specific endpoint
const metrics = rpcManager.getMetrics(rpcUrl);

console.log('RPC Metrics:');
console.log(`  Total Requests: ${metrics.totalRequests}`);
console.log(`  Successful: ${metrics.successfulRequests}`);
console.log(`  Failed: ${metrics.failedRequests}`);
console.log(`  Timeouts: ${metrics.timeouts}`);
console.log(`  Success Rate: ${(metrics.successfulRequests / metrics.totalRequests * 100).toFixed(2)}%`);
console.log(`  Avg Latency: ${metrics.avgLatency.toFixed(2)}ms`);
console.log(`  Last Request: ${new Date(metrics.lastRequestTime).toISOString()}`);

// Get all metrics
const allMetrics = rpcManager.getAllMetrics();
for (const [url, metrics] of allMetrics) {
  console.log(`\n${url}:`, metrics);
}
```

### Monitoring Metrics

```typescript
// Periodic metrics logging
setInterval(() => {
  const metrics = rpcManager.getAllMetrics();
  
  for (const [url, m] of metrics) {
    const successRate = (m.successfulRequests / m.totalRequests * 100).toFixed(2);
    console.log(`${url}: ${m.totalRequests} reqs, ${successRate}% success, ${m.avgLatency.toFixed(0)}ms avg`);
  }
}, 60000); // Every minute
```

## Queue Management

### Queue Status

```typescript
// Get queue status
const status = rpcManager.getQueueStatus(rpcUrl);

if (status) {
  console.log(`Queue Status:`);
  console.log(`  Waiting: ${status.size}`);
  console.log(`  Running: ${status.pending}`);
  console.log(`  Paused: ${status.isPaused}`);
}
```

### Pause/Resume

```typescript
// Pause queue during maintenance
rpcManager.pauseQueue(rpcUrl);
console.log('Queue paused');

// Resume queue
setTimeout(() => {
  rpcManager.resumeQueue(rpcUrl);
  console.log('Queue resumed');
}, 60000); // Resume after 1 minute
```

### Clear Queue

```typescript
// Clear all pending requests
rpcManager.clearQueue(rpcUrl);
console.log('Queue cleared');
```

## Integration with Existing Code

### ChainProviderManager Integration

```typescript
import { ChainProviderManager } from './src/chains/ChainProviderManager';
import { rpcManager } from './src/chains/RPCManager';

class RateLimitedChainProviderManager extends ChainProviderManager {
  async getBlockNumber(chainId: number): Promise<number> {
    const provider = this.getProvider(chainId);
    const rpcUrl = provider.connection.url;
    
    return rpcManager.executeWithRateLimit(
      rpcUrl,
      () => provider.getBlockNumber()
    );
  }

  async getGasPrice(chainId: number): Promise<bigint> {
    const provider = this.getProvider(chainId);
    const rpcUrl = provider.connection.url;
    
    return rpcManager.executeWithRateLimit(
      rpcUrl,
      async () => {
        const gasPrice = await provider.getGasPrice();
        return BigInt(gasPrice.toString());
      }
    );
  }
}
```

### DEX Data Fetching

```typescript
import { rpcManager } from './src/chains/RPCManager';

class DEXDataFetcher {
  async fetchPoolData(poolAddress: string, rpcUrl: string): Promise<PoolData> {
    return rpcManager.executeWithRateLimit(
      rpcUrl,
      async () => {
        const pool = new ethers.Contract(poolAddress, POOL_ABI, provider);
        
        // All RPC calls are rate-limited
        const [token0, token1, fee, liquidity] = await Promise.all([
          pool.token0(),
          pool.token1(),
          pool.fee(),
          pool.liquidity()
        ]);
        
        return { token0, token1, fee, liquidity };
      }
    );
  }
}
```

### Arbitrage Scanning

```typescript
async function scanOpportunities(pools: string[], rpcUrl: string) {
  const opportunities = [];
  
  for (const pool of pools) {
    try {
      const data = await rpcManager.executeWithRateLimit(
        rpcUrl,
        () => fetchPoolData(pool)
      );
      
      const opportunity = analyzePool(data);
      if (opportunity) {
        opportunities.push(opportunity);
      }
    } catch (error) {
      console.error(`Failed to scan pool ${pool}:`, error);
    }
  }
  
  return opportunities;
}
```

## Best Practices

### 1. Configure Based on RPC Provider

```typescript
// Free Tier RPC
rpcManager.configureEndpoint(freeRpcUrl, {
  concurrency: 2,
  intervalCap: 5,
  timeout: 60000
});

// Paid Tier RPC
rpcManager.configureEndpoint(paidRpcUrl, {
  concurrency: 20,
  intervalCap: 100,
  timeout: 15000
});

// Premium/Dedicated RPC
rpcManager.configureEndpoint(premiumRpcUrl, {
  concurrency: 50,
  intervalCap: 500,
  timeout: 5000
});
```

### 2. Use Multiple Endpoints

```typescript
const endpoints = [
  'https://arb1.arbitrum.io/rpc',
  'https://arbitrum.llamarpc.com',
  'https://rpc.ankr.com/arbitrum'
];

let currentEndpoint = 0;

async function executeWithFailover<T>(operation: () => Promise<T>): Promise<T> {
  for (let i = 0; i < endpoints.length; i++) {
    try {
      const endpoint = endpoints[(currentEndpoint + i) % endpoints.length];
      return await rpcManager.executeWithRateLimit(endpoint, operation);
    } catch (error) {
      console.warn(`Endpoint ${endpoints[(currentEndpoint + i) % endpoints.length]} failed:`, error);
    }
  }
  throw new Error('All endpoints failed');
}
```

### 3. Implement Circuit Breaker

```typescript
class CircuitBreaker {
  private failures = new Map<string, number>();
  private readonly threshold = 5;
  private readonly resetTime = 60000; // 1 minute

  async execute<T>(rpcUrl: string, operation: () => Promise<T>): Promise<T> {
    const failures = this.failures.get(rpcUrl) || 0;
    
    if (failures >= this.threshold) {
      throw new Error(`Circuit breaker open for ${rpcUrl}`);
    }

    try {
      const result = await rpcManager.executeWithRateLimit(rpcUrl, operation);
      this.failures.set(rpcUrl, 0); // Reset on success
      return result;
    } catch (error) {
      this.failures.set(rpcUrl, failures + 1);
      
      if (failures + 1 >= this.threshold) {
        setTimeout(() => this.failures.set(rpcUrl, 0), this.resetTime);
      }
      
      throw error;
    }
  }
}
```

### 4. Batch Operations Efficiently

```typescript
// Good: Batch related operations
const [block, gasPrice, balance] = await Promise.all([
  rpcManager.executeWithRateLimit(rpcUrl, () => provider.getBlock('latest')),
  rpcManager.executeWithRateLimit(rpcUrl, () => provider.getGasPrice()),
  rpcManager.executeWithRateLimit(rpcUrl, () => provider.getBalance(address))
]);

// Bad: Sequential operations
const block = await rpcManager.executeWithRateLimit(rpcUrl, () => provider.getBlock('latest'));
const gasPrice = await rpcManager.executeWithRateLimit(rpcUrl, () => provider.getGasPrice());
const balance = await rpcManager.executeWithRateLimit(rpcUrl, () => provider.getBalance(address));
```

### 5. Monitor and Adjust

```typescript
// Periodically adjust limits based on metrics
setInterval(() => {
  const metrics = rpcManager.getMetrics(rpcUrl);
  
  // If timeout rate is high, reduce concurrency
  const timeoutRate = metrics.timeouts / metrics.totalRequests;
  if (timeoutRate > 0.1) { // More than 10% timeouts
    console.warn('High timeout rate, reducing concurrency');
    rpcManager.configureEndpoint(rpcUrl, {
      concurrency: 5,
      intervalCap: 25
    });
  }
}, 300000); // Every 5 minutes
```

## Troubleshooting

### High Timeout Rate

**Symptoms:** Many requests timing out

**Solutions:**
1. Increase timeout value
2. Reduce concurrency
3. Use faster RPC endpoint
4. Check network connectivity

### Queue Buildup

**Symptoms:** Large number of pending requests

**Solutions:**
1. Increase `concurrency` if RPC can handle it
2. Increase `intervalCap` for higher throughput
3. Clear queue and retry: `rpcManager.clearQueue(rpcUrl)`
4. Reduce request rate

### Rate Limit Errors

**Symptoms:** RPC provider returning 429 errors

**Solutions:**
1. Reduce `intervalCap` to match provider limits
2. Increase `interval` for longer time windows
3. Use multiple RPC providers
4. Upgrade to higher tier plan

## Performance Impact

### Overhead

The rate limiting adds minimal overhead:
- Queue management: < 1ms per request
- Metrics tracking: < 0.1ms per request
- Total overhead: ~1-2ms per request

### Benefits

- **Prevents throttling:** Avoids 429 errors and IP bans
- **Improves reliability:** Consistent performance under load
- **Better resource usage:** Optimal utilization of RPC quotas
- **Metrics visibility:** Track and optimize RPC usage

## Advanced Configuration

### Dynamic Limits

```typescript
// Adjust limits based on time of day
const isPeakHours = () => {
  const hour = new Date().getHours();
  return hour >= 9 && hour <= 17; // 9 AM - 5 PM
};

const config = isPeakHours()
  ? { concurrency: 5, intervalCap: 25 }   // Conservative during peak
  : { concurrency: 20, intervalCap: 100 }; // Aggressive off-peak

rpcManager.configureEndpoint(rpcUrl, config);
```

### Priority Queues

```typescript
// For critical operations, use separate high-priority endpoint
const criticalRpcUrl = process.env.CRITICAL_RPC_URL!;

rpcManager.configureEndpoint(criticalRpcUrl, {
  concurrency: 50,
  intervalCap: 200,
  timeout: 5000
});

// Use for time-sensitive operations
await rpcManager.executeWithRateLimit(criticalRpcUrl, criticalOperation);
```

## Shutdown

```typescript
// Graceful shutdown
async function shutdown() {
  console.log('Shutting down RPC Manager...');
  await rpcManager.shutdown();
  console.log('RPC Manager shut down successfully');
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```

## Related Documentation

- [MEV Integration Guide](./MEV_INTEGRATION.md)
- [Protocol Registry Documentation](./PROTOCOL_REGISTRY.md)
- [Architecture Guide](./ARCHITECTURE.md)
