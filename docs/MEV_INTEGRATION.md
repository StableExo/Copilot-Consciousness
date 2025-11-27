# MEV Integration Guide

## Overview

This guide explains how to use the MEV (Maximal Extractable Value) protection and monitoring features integrated from AxionCitadel into Copilot-Consciousness.

## Architecture

The MEV integration consists of three main components:

### 1. MEV Sensors (Real-time Monitoring)

**Python Sensors:**
- `mempool_congestion_sensor.py` - Monitors mempool congestion in real-time
- `searcher_density_sensor.py` - Detects MEV bot activity
- `mev_sensor_hub.py` - Orchestrates sensor updates

**TypeScript Sensors:**
- `MempoolCongestionSensor.ts` - TypeScript implementation of congestion monitoring
- `SearcherDensitySensor.ts` - TypeScript implementation of bot detection
- `MEVSensorHub.ts` - TypeScript sensor orchestrator

### 2. MEV Risk Calculator (Game-theoretic Analysis)

**Python Calculator:**
- `transaction_type.py` - Transaction type enumeration
- `mev_risk_model.py` - Game-theoretic risk quantification
- `profit_calculator.py` - MEV-aware profit calculations
- `mempool_simulator.py` - Stress testing under various conditions

**TypeScript Bridge:**
- `mev-calculator-bridge.ts` - Bridges TypeScript to Python calculator with Redis caching

### 3. Rate Limiting (RPC Protection)

**RPC Manager:**
- `RPCManager.ts` - Advanced p-queue based rate limiting for RPC endpoints

## Usage

### Using MEV Sensors

#### Python Example

```python
from src.mev.sensors.mempool_congestion_sensor import MempoolCongestionSensor
from src.mev.sensors.searcher_density_sensor import SearcherDensitySensor

# Initialize sensors
rpc_url = "https://arb1.arbitrum.io/rpc"
routers = [
    '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',  # Uniswap V3 Router 2
    '0xE592427A0AEce92De3Edee1F18E0157C05861564',  # Uniswap V3 Router
]

congestion_sensor = MempoolCongestionSensor(rpc_url)
searcher_sensor = SearcherDensitySensor(rpc_url, routers)

# Get real-time metrics
congestion_score = congestion_sensor.get_congestion_score()
searcher_density = searcher_sensor.get_searcher_density()

print(f"Mempool Congestion: {congestion_score:.2%}")
print(f"Searcher Density: {searcher_density:.2%}")

# Get detailed metrics
metrics = congestion_sensor.get_metrics()
print(f"Pending Ratio: {metrics['pending_ratio']:.2%}")
print(f"Gas Deviation: {metrics['gas_deviation']:.2%}")
print(f"Fee Velocity: {metrics['fee_velocity']:.2%}")
```

#### TypeScript Example

```typescript
import { MempoolCongestionSensor } from './src/mev/sensors/MempoolCongestionSensor';
import { SearcherDensitySensor } from './src/mev/sensors/SearcherDensitySensor';

const rpcUrl = process.env.ARBITRUM_RPC_URL!;
const routers = [
  '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  '0xE592427A0AEce92De3Edee1F18E0157C05861564',
];

const congestionSensor = new MempoolCongestionSensor(rpcUrl);
const searcherSensor = new SearcherDensitySensor(rpcUrl, routers);

// Get scores
const congestionScore = await congestionSensor.getCongestionScore();
const searcherDensity = await searcherSensor.getSearcherDensity();

console.log(`Congestion: ${(congestionScore * 100).toFixed(2)}%`);
console.log(`Searcher Density: ${(searcherDensity * 100).toFixed(2)}%`);
```

### Using MEV Risk Calculator

```typescript
import { mevCalculatorBridge } from './src/mev/bridges/mev-calculator-bridge';
import Redis from 'ioredis';

// Initialize with Redis for caching
const redis = new Redis(process.env.REDIS_URL);
const bridge = new MEVCalculatorBridge(redis, true, 60);

// Calculate MEV risk for an arbitrage transaction
const risk = await bridge.calculateRisk({
  value: 10.0,        // 10 ETH transaction value
  gasPrice: 50,       // 50 gwei gas price
  txType: 'arbitrage'
});

console.log(`Risk Score: ${(risk.riskScore * 100).toFixed(2)}%`);
console.log(`Estimated Leakage: ${risk.estimatedLeakage} ETH`);
console.log(`Mempool Congestion: ${(risk.mempoolCongestion * 100).toFixed(2)}%`);
console.log(`Searcher Density: ${(risk.searcherDensity * 100).toFixed(2)}%`);

// Adjust profit calculation based on MEV risk
const revenue = 10.5; // ETH
const gasCost = 0.01; // ETH
const mevAdjustedProfit = revenue - gasCost - risk.estimatedLeakage;

console.log(`MEV-Adjusted Profit: ${mevAdjustedProfit} ETH`);
```

### Using RPC Rate Limiting

```typescript
import { rpcManager } from './src/chains/RPCManager';
import { ethers } from 'ethers';

// Configure rate limits for specific endpoint
rpcManager.configureEndpoint(process.env.ARBITRUM_RPC_URL!, {
  concurrency: 10,    // Max 10 concurrent requests
  interval: 1000,     // Per second
  intervalCap: 50,    // Max 50 requests per second
  timeout: 30000,     // 30 second timeout
  throwOnTimeout: true
});

// Use rate-limited RPC calls
const provider = new ethers.providers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);

const blockNumber = await rpcManager.executeWithRateLimit(
  process.env.ARBITRUM_RPC_URL!,
  () => provider.getBlockNumber()
);

console.log(`Current block: ${blockNumber}`);

// Get metrics
const metrics = rpcManager.getMetrics(process.env.ARBITRUM_RPC_URL!);
console.log(`Total Requests: ${metrics.totalRequests}`);
console.log(`Success Rate: ${(metrics.successfulRequests / metrics.totalRequests * 100).toFixed(2)}%`);
console.log(`Avg Latency: ${metrics.avgLatency.toFixed(2)}ms`);
```

## Integration with Arbitrage

### MEV-Aware Arbitrage Flow

```typescript
import { mevCalculatorBridge } from './src/mev/bridges/mev-calculator-bridge';
import { rpcManager } from './src/chains/RPCManager';

async function executeMEVAwareArbitrage(opportunity: ArbitrageOpportunity) {
  // 1. Calculate MEV risk
  const mevRisk = await mevCalculatorBridge.calculateRisk({
    value: opportunity.inputAmount,
    gasPrice: await getGasPrice(),
    txType: 'arbitrage'
  });

  // 2. Adjust profit calculation
  const grossProfit = opportunity.expectedProfit;
  const gasCost = opportunity.estimatedGasCost;
  const netProfit = grossProfit - gasCost - mevRisk.estimatedLeakage;

  // 3. Check if still profitable
  const minProfit = 0.01; // 0.01 ETH minimum
  if (netProfit < minProfit) {
    console.log('Opportunity not profitable after MEV adjustment');
    return;
  }

  // 4. Execute with rate limiting
  const result = await rpcManager.executeWithRateLimit(
    process.env.ARBITRUM_RPC_URL!,
    () => executeArbitrage(opportunity)
  );

  console.log(`Arbitrage executed with MEV-adjusted profit: ${netProfit} ETH`);
  return result;
}
```

## Configuration

### Environment Variables

```bash
# RPC URLs
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
ETHEREUM_RPC_URL=https://eth.llamarpc.com
POLYGON_RPC_URL=https://polygon-rpc.com
BASE_RPC_URL=https://mainnet.base.org

# Python Path (for MEV Calculator Bridge)
PYTHON_PATH=python3
MEV_CALCULATOR_SCRIPT=/path/to/profit_calculator.py

# Redis (for caching)
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=info
```

### Sensor Configuration

```typescript
// Custom sensor weights
const congestionSensor = new MempoolCongestionSensor(
  rpcUrl,
  5,  // window size (blocks)
  [0.4, 0.3, 0.3]  // weights: [pending_ratio, gas_deviation, fee_velocity]
);

const searcherSensor = new SearcherDensitySensor(
  rpcUrl,
  routers,
  10,  // window size (blocks)
  [0.4, 0.4, 0.2]  // weights: [mev_ratio, sandwich_score, clustering]
);
```

## Best Practices

1. **Monitor MEV metrics continuously** - Update sensors every 10-30 seconds
2. **Cache calculator results** - Use Redis to cache MEV risk calculations
3. **Apply rate limiting** - Always use RPCManager for production RPC calls
4. **Adjust for congestion** - Increase slippage tolerance during high congestion
5. **Set minimum profits** - Account for MEV risk in profitability thresholds
6. **Use multiple RPC endpoints** - Configure fallback endpoints with separate rate limits

## Troubleshooting

### High MEV Risk Scores

If you're seeing consistently high MEV risk scores:
- Check mempool congestion - high congestion = higher risk
- Verify searcher density - many bots = higher competition
- Consider using private mempools (Flashbots, Eden Network)
- Increase minimum profit thresholds

### Rate Limiting Issues

If you're hitting rate limits:
- Reduce `intervalCap` to match your RPC provider's limits
- Increase `interval` for longer time windows
- Use multiple RPC providers with separate quotas
- Cache more aggressively to reduce RPC calls

### Python Bridge Errors

If the MEV calculator bridge fails:
- Verify Python is installed: `python3 --version`
- Check script path: `MEV_CALCULATOR_SCRIPT` environment variable
- Ensure dependencies installed: `pip install -r requirements.txt`
- Check Redis connection if caching is enabled

## Performance

### Sensor Update Frequency

- **High-frequency trading**: Update every 10 seconds
- **Normal arbitrage**: Update every 30 seconds
- **Long-term monitoring**: Update every 60 seconds

### Caching Strategy

- MEV risk calculations: 60 second TTL
- Sensor data: 10-30 second TTL
- Pool data: 5 minute TTL

## Security Considerations

1. **Never expose RPC endpoints** - Use environment variables
2. **Validate all inputs** - Especially transaction values and gas prices
3. **Monitor for anomalies** - Set up alerts for unusual MEV activity
4. **Use secure RPC providers** - Avoid public, rate-limited endpoints
5. **Implement circuit breakers** - Pause trading during extreme conditions

## Additional Resources

- [MEV Intelligence Suite Documentation](./MEV_INTELLIGENCE_SUITE.md)
- [MEV Setup Guide](./MEV_SETUP_GUIDE.md)
- [Rate Limiting Guide](./RATE_LIMITING.md)
- [Protocol Registry Documentation](./PROTOCOL_REGISTRY.md)
