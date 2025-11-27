# Real-Time Monitoring and Decision-Making System

## Overview

The Real-Time Monitoring system provides event-driven arbitrage detection by listening to WebSocket streams from DEX liquidity pools. This replaces polling-based data fetching with instant reaction to on-chain events.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Real-Time Monitoring System                  │
└─────────────────────────────────────────────────────────────────┘

   WebSocket Streams              Data Pipeline           Arbitrage Trigger
┌──────────────────┐         ┌──────────────────┐      ┌──────────────────┐
│                  │         │                  │      │                  │
│  WebSocket       │ Pool    │   Real-Time      │Filter│  Event-Driven    │
│  Stream          │ Events  │   Data           │Events│  Trigger         │
│  Manager    ─────┼────────>│   Pipeline  ─────┼─────>│                  │
│                  │         │                  │      │  • Profitability │
│  • Connection    │         │  • Aggregation   │      │  • Debouncing    │
│  • Subscriptions │         │  • Filtering     │      │  • Execution     │
│  • Reconnection  │         │  • Backpressure  │      │                  │
│                  │         │  • Metrics       │      │                  │
└──────────────────┘         └──────────────────┘      └────────┬─────────┘
                                                                 │
                                                                 v
                                                      ┌──────────────────┐
                                                      │  Arbitrage       │
                                                      │  Orchestrator    │
                                                      │  • Path Finding  │
                                                      │  • Execution     │
                                                      └──────────────────┘
```

## Components

### 1. WebSocketStreamManager

Manages WebSocket connections to Ethereum providers and listens to DEX pool events.

**Features:**
- Connects to multiple WebSocket providers (Infura, Alchemy)
- Priority-based endpoint failover
- Automatic reconnection with exponential backoff
- Listens to Uniswap V2/V3 and SushiSwap events (Sync, Swap, Mint, Burn)
- EventEmitter pattern for decoupled architecture
- Graceful shutdown and cleanup

**Usage:**
```typescript
import { WebSocketStreamManager } from './src/dex/monitoring/WebSocketStreamManager';

const manager = new WebSocketStreamManager(
  endpoints,  // Array of WebSocket endpoints with priorities
  retryConfig // Retry configuration
);

// Connect
await manager.connect();

// Subscribe to pool
await manager.subscribeToPool('0x...');

// Listen to events
manager.on('poolEvent', (event) => {
  console.log('Pool event:', event);
});

// Cleanup
await manager.shutdown();
```

### 2. RealtimeDataPipeline

Aggregates and filters events from multiple WebSocket streams.

**Features:**
- Event aggregation from multiple streams
- Intelligent filtering based on:
  - Minimum liquidity thresholds
  - Price delta (minimum change to trigger)
  - Price impact limits
- Backpressure handling to prevent system overload
- Sliding window for price trend analysis
- Priority-based event queuing (high/medium/low)
- Comprehensive metrics (throughput, latency, drops)

**Usage:**
```typescript
import { RealtimeDataPipeline } from './src/dex/monitoring/RealtimeDataPipeline';

const pipeline = new RealtimeDataPipeline(
  filterConfig,     // Event filter configuration
  maxQueueSize,     // Maximum queue size for backpressure
  dropStrategy,     // 'oldest' | 'newest' | 'none'
  slidingWindowMs   // Sliding window for trend analysis
);

// Process events
await pipeline.processEvent(poolEvent);

// Listen to filtered events
pipeline.on('filteredEvent', (event) => {
  console.log('Filtered event:', event);
});

// Get metrics
const metrics = pipeline.getMetrics();

// Cleanup
pipeline.destroy();
```

### 3. EventDrivenTrigger

Responds to filtered events and triggers arbitrage when profitable opportunities are detected.

**Features:**
- Real-time profitability calculation
- Debouncing to prevent duplicate calculations
- Automatic invocation of ArbitrageOrchestrator
- Performance metrics tracking
- Configurable profit thresholds

**Usage:**
```typescript
import { EventDrivenTrigger } from './src/arbitrage/EventDrivenTrigger';

const trigger = new EventDrivenTrigger(
  orchestrator,          // ArbitrageOrchestrator instance
  profitabilityConfig,   // Profitability thresholds
  debounceWindowMs,      // Debounce window
  enableDebouncing       // Enable/disable debouncing
);

// Handle filtered events
await trigger.handleEvent(filteredEvent);

// Listen to opportunities
trigger.on('opportunityTriggered', (detection) => {
  console.log('Opportunity:', detection);
});

// Get metrics
const metrics = trigger.getMetrics();
```

### 4. Configuration

Centralized configuration for all real-time monitoring components.

**Configuration Options:**
```typescript
{
  websocketEndpoints: [
    { url: 'wss://...', description: 'Primary', priority: 1 },
    { url: 'wss://...', description: 'Fallback', priority: 2 }
  ],
  poolMonitors: [
    { address: '0x...', dex: 'Uniswap V2', network: '1', tokens: [...], enabled: true }
  ],
  eventFilter: {
    minLiquidity: 100000n,        // Minimum liquidity to trigger
    maxPriceImpact: 0.03,         // 3% max price impact
    minPriceDelta: 0.001          // 0.1% min price change
  },
  profitability: {
    minProfitPercent: 0.5,        // 0.5% min profit
    maxSlippagePercent: 1.0,      // 1% max slippage
    minProfitAbsolute: 100000n    // Absolute minimum profit
  },
  retry: {
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 60000,
    backoffMultiplier: 2
  },
  features: {
    enableUniswapV2: true,
    enableUniswapV3: true,
    enableSushiSwap: true,
    enableBackpressure: true,
    enableDebouncing: true
  },
  backpressure: {
    maxQueueSize: 1000,
    dropStrategy: 'oldest'
  },
  debounce: {
    windowMs: 100
  }
}
```

## Integration with Existing System

### ArbitrageOrchestrator Updates

The `ArbitrageOrchestrator` has been updated to support event-driven mode:

```typescript
// Set mode
orchestrator.setMode('event-driven');

// Handle real-time events
const paths = await orchestrator.handleRealtimeEvent(
  tokens,
  startAmount,
  poolAddress
);
```

### MultiHopDataFetcher Updates

The `MultiHopDataFetcher` supports event-driven cache updates:

```typescript
// Set mode for longer cache TTL
dataFetcher.setMode('event-driven');

// Update cache from events
dataFetcher.updatePoolDataFromEvent(
  poolAddress,
  dexName,
  token0,
  token1,
  reserve0,
  reserve1
);
```

## Complete Example

See `examples/realtimeArbitrageMonitoring.ts` for a complete working example.

```typescript
import { RealtimeArbitrageMonitor } from './examples/realtimeArbitrageMonitoring';

const monitor = new RealtimeArbitrageMonitor();
await monitor.start();

// Monitor runs continuously, detecting arbitrage opportunities in real-time
```

## Event Flow

1. **WebSocket Connection**: Establish connection to Ethereum node
2. **Pool Subscription**: Subscribe to specific liquidity pool contracts
3. **Event Reception**: Receive on-chain events (Sync, Swap, etc.)
4. **Event Processing**: Pipeline filters and prioritizes events
5. **Opportunity Detection**: Trigger calculates profitability
6. **Arbitrage Execution**: Orchestrator executes profitable trades

## Metrics and Monitoring

### Pipeline Metrics
- Events received/filtered/emitted/dropped
- Average latency
- Throughput per second
- Queue size

### Trigger Metrics
- Opportunities detected/triggered
- Successful/failed executions
- Total profit estimated
- Average latency
- Debounce skips

### WebSocket Metrics
- Connection status
- Reconnection attempts
- Subscribed pools
- Event types received

## Best Practices

1. **Resource Management**
   - Always call `shutdown()` or `destroy()` for cleanup
   - Monitor memory usage with large sliding windows
   - Implement proper error handling

2. **Configuration**
   - Start with conservative thresholds
   - Monitor metrics to tune parameters
   - Use feature flags for gradual rollout

3. **Performance**
   - Enable backpressure for high-volume scenarios
   - Use debouncing to reduce duplicate processing
   - Monitor queue sizes and adjust as needed

4. **Reliability**
   - Configure multiple WebSocket endpoints
   - Set appropriate reconnection parameters
   - Implement graceful degradation

5. **Security**
   - Validate all configuration parameters
   - Implement rate limiting if needed
   - Secure WebSocket endpoints (WSS only)

## Testing

Comprehensive tests are provided for all components:

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- src/dex/monitoring/__tests__/WebSocketStreamManager.test.ts
npm test -- src/dex/monitoring/__tests__/RealtimeDataPipeline.test.ts
npm test -- src/arbitrage/__tests__/EventDrivenTrigger.test.ts
```

## Environment Variables

```bash
# WebSocket endpoints
INFURA_WS_URL=wss://mainnet.infura.io/ws/v3/YOUR_PROJECT_ID
ALCHEMY_WS_URL=wss://eth-mainnet.alchemyapi.io/v2/YOUR_API_KEY

# Optional: Custom configuration
MIN_PROFIT_PERCENT=0.5
MAX_SLIPPAGE_PERCENT=1.0
MIN_LIQUIDITY=100000000000000000000000
```

## Troubleshooting

### Connection Issues
- Verify WebSocket endpoint URLs
- Check API key validity
- Ensure network connectivity
- Review firewall rules

### Performance Issues
- Increase backpressure queue size
- Adjust debounce window
- Reduce sliding window size
- Monitor system resources

### No Opportunities Detected
- Lower profitability thresholds
- Adjust event filter criteria
- Verify pool subscriptions
- Check DEX configurations

## Future Enhancements

- [ ] Support for Uniswap V3 tick-based events
- [ ] Multi-chain support (Polygon, Arbitrum, etc.)
- [ ] Advanced MEV protection strategies
- [ ] Machine learning for opportunity prediction
- [ ] Dashboard for real-time monitoring
- [ ] Alert system for high-value opportunities
- [ ] Historical data analysis
- [ ] Gas price optimization

## License

See main repository LICENSE file.

## Support

For issues, questions, or contributions, please refer to the main repository.
