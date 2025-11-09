# Protocol Registry Documentation

## Overview

The Protocol Registry system provides centralized configuration management for DEX protocols, tokens, and pools across multiple chains. It enables dynamic pool management and simplifies protocol integration.

## Architecture

```
src/config/registry/
├── protocol-registry.ts      # Main protocol registry
├── token-precision.ts         # Token decimal handling
├── known-addresses.ts         # Chain-specific addresses
├── dynamic-pool-manifest.ts   # Runtime pool management
└── manifests/                 # Pool manifests per chain
    ├── 42161-pools.json
    ├── 1-pools.json
    └── ...
```

## Components

### 1. Protocol Registry

Manages DEX protocol configurations.

#### Basic Usage

```typescript
import { protocolRegistry } from './src/config/registry';

// Get protocol by name
const uniswapV3 = protocolRegistry.get('Uniswap V3');
console.log(uniswapV3);
// {
//   name: 'Uniswap V3',
//   type: 'uniswap-v3',
//   router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
//   factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
//   quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
//   supportedChains: [1, 42161, 137, 8453],
//   features: ['flash-swap', 'concentrated-liquidity', 'multiple-fee-tiers'],
//   version: '3'
// }

// Get all protocols for a chain
const arbitrumProtocols = protocolRegistry.getByChain(42161);
console.log(`Arbitrum supports ${arbitrumProtocols.length} protocols`);

// Check if protocol supports a feature
const supportsFlashSwap = protocolRegistry.supports('Uniswap V3', 'flash-swap');
console.log(`Supports flash swaps: ${supportsFlashSwap}`);
```

#### Registering Custom Protocols

```typescript
import { protocolRegistry, ProtocolConfig } from './src/config/registry';

const customProtocol: ProtocolConfig = {
  name: 'Custom DEX',
  type: 'uniswap-v2',
  router: '0x...',
  factory: '0x...',
  supportedChains: [42161],
  features: ['flash-swap', 'constant-product'],
  version: '2'
};

protocolRegistry.register(customProtocol);
```

#### Advanced Queries

```typescript
// Get all V3 protocols
const v3Protocols = protocolRegistry.getByType('uniswap-v3');

// Get all registered protocols
const allProtocols = protocolRegistry.getAll();

// Check if protocol exists
if (protocolRegistry.has('Curve')) {
  console.log('Curve is registered');
}

// Export configuration
const config = protocolRegistry.exportConfig();
fs.writeFileSync('protocols.json', JSON.stringify(config, null, 2));
```

### 2. Token Precision Manager

Handles decimal conversions for tokens across chains.

#### Basic Usage

```typescript
import { tokenPrecision } from './src/config/registry';

// Get token decimals
const decimals = tokenPrecision.getDecimals(
  '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // USDC on Arbitrum
  42161
);
console.log(`USDC decimals: ${decimals}`); // 6

// Convert human-readable to token units
const units = tokenPrecision.toTokenUnits(
  '100.50',  // 100.50 USDC
  '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
  42161
);
console.log(`Token units: ${units}`); // 100500000n

// Convert token units to human-readable
const readable = tokenPrecision.fromTokenUnits(
  100500000n,
  '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
  42161
);
console.log(`Human readable: ${readable}`); // "100.5"
```

#### Registering Custom Tokens

```typescript
import { tokenPrecision, TokenInfo } from './src/config/registry';

const customToken: TokenInfo = {
  symbol: 'TKN',
  address: '0x...',
  decimals: 18,
  chainId: 42161
};

tokenPrecision.register(customToken);
```

#### Batch Loading

```typescript
const tokens: TokenInfo[] = [
  { symbol: 'TKN1', address: '0x...', decimals: 18, chainId: 42161 },
  { symbol: 'TKN2', address: '0x...', decimals: 6, chainId: 42161 }
];

tokenPrecision.loadFromConfig(tokens);
```

### 3. Known Addresses

Chain-specific address mappings.

#### Basic Usage

```typescript
import { 
  getChainAddresses, 
  getWETHAddress, 
  getMulticallAddress,
  isChainSupported,
  getSupportedChainIds
} from './src/config/registry';

// Get all addresses for a chain
const arbitrumAddresses = getChainAddresses(42161);
console.log(arbitrumAddresses);
// {
//   chainId: 42161,
//   name: 'Arbitrum One',
//   nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
//   weth: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
//   multicall: '0x842eC2c7D803033Edf55E478F461FC547Bc54EB2'
// }

// Get WETH address
const weth = getWETHAddress(42161);
console.log(`WETH on Arbitrum: ${weth}`);

// Get Multicall address
const multicall = getMulticallAddress(42161);
console.log(`Multicall on Arbitrum: ${multicall}`);

// Check if chain is supported
if (isChainSupported(42161)) {
  console.log('Arbitrum is supported');
}

// Get all supported chains
const chainIds = getSupportedChainIds();
console.log(`Supported chains: ${chainIds.join(', ')}`);
```

### 4. Dynamic Pool Manager

Runtime pool configuration management.

#### Initialization

```typescript
import { dynamicPoolManager } from './src/config/registry';

// Or create custom instance
import { DynamicPoolManager } from './src/config/registry';

const poolManager = new DynamicPoolManager(
  './custom/manifest/dir',
  true  // auto-save
);
```

#### Loading Pools

```typescript
// Load pools for a chain
const manifest = await dynamicPoolManager.loadManifest(42161);
console.log(`Loaded ${manifest.pools.length} pools`);

// Get all active pools
const pools = await dynamicPoolManager.getPools(42161);

// Get specific pool
const pool = await dynamicPoolManager.getPool(
  42161,
  '0xC31E54c7a869B9FcBEcc14363CF510d1c41fa443' // WETH-USDC pool
);
```

#### Adding/Updating Pools

```typescript
import { Pool } from './src/config/registry';

const newPool: Pool = {
  address: '0xC31E54c7a869B9FcBEcc14363CF510d1c41fa443',
  token0: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH
  token1: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // USDC
  fee: 500,  // 0.05%
  protocol: 'Uniswap V3',
  chainId: 42161,
  tvl: '10000000',
  volume24h: '5000000',
  lastUpdated: Date.now(),
  enabled: true
};

await dynamicPoolManager.addPool(newPool);

// Update pool data
await dynamicPoolManager.updatePool(42161, pool.address, {
  tvl: '12000000',
  volume24h: '6000000'
});
```

#### Querying Pools

```typescript
// Get pools by protocol
const uniswapPools = await dynamicPoolManager.getPoolsByProtocol(
  42161,
  'Uniswap V3'
);

// Get pools by token pair
const wethUsdcPools = await dynamicPoolManager.getPoolsByTokenPair(
  42161,
  '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH
  '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'  // USDC
);
```

#### Maintenance

```typescript
// Remove a pool
await dynamicPoolManager.removePool(42161, poolAddress);

// Prune inactive pools (not updated in 7 days)
const pruned = await dynamicPoolManager.pruneInactivePools(
  42161,
  7 * 24 * 60 * 60 * 1000
);
console.log(`Pruned ${pruned} inactive pools`);

// Prune all chains
const totalPruned = await dynamicPoolManager.pruneInactivePools();

// Save manifests manually
await dynamicPoolManager.saveManifest(42161);
await dynamicPoolManager.saveAll();
```

## Integration Examples

### Arbitrage Engine Integration

```typescript
import { protocolRegistry, dynamicPoolManager } from './src/config/registry';

async function scanArbitrageOpportunities(chainId: number) {
  // Get all protocols for chain
  const protocols = protocolRegistry.getByChain(chainId);
  
  // Get all active pools
  const pools = await dynamicPoolManager.getPools(chainId);
  
  for (const pool of pools) {
    const protocol = protocolRegistry.get(pool.protocol);
    
    if (protocol && protocol.supports('flash-swap')) {
      // Analyze pool for arbitrage
      const opportunity = await analyzePool(pool, protocol);
      if (opportunity) {
        console.log(`Found opportunity in ${pool.address}`);
      }
    }
  }
}
```

### DEX Adapter Factory

```typescript
import { protocolRegistry } from './src/config/registry';

function createDEXAdapter(protocolName: string, chainId: number) {
  const protocol = protocolRegistry.get(protocolName);
  
  if (!protocol) {
    throw new Error(`Protocol ${protocolName} not found`);
  }
  
  if (!protocol.supportedChains.includes(chainId)) {
    throw new Error(`Protocol ${protocolName} not supported on chain ${chainId}`);
  }
  
  switch (protocol.type) {
    case 'uniswap-v3':
    case 'sushiswap-v3':
      return new UniswapV3Adapter(protocol.router, protocol.factory, protocol.quoter);
    
    case 'uniswap-v2':
    case 'sushiswap-v2':
      return new UniswapV2Adapter(protocol.router, protocol.factory);
    
    default:
      throw new Error(`Unsupported protocol type: ${protocol.type}`);
  }
}
```

### Token Amount Conversion

```typescript
import { tokenPrecision } from './src/config/registry';

async function swapTokens(
  tokenIn: string,
  tokenOut: string,
  amountIn: string,
  chainId: number
) {
  // Convert human-readable to token units
  const amountInUnits = tokenPrecision.toTokenUnits(amountIn, tokenIn, chainId);
  
  // Execute swap
  const amountOutUnits = await executeSwap(tokenIn, tokenOut, amountInUnits);
  
  // Convert back to human-readable
  const amountOut = tokenPrecision.fromTokenUnits(amountOutUnits, tokenOut, chainId);
  
  console.log(`Swapped ${amountIn} to ${amountOut}`);
  return amountOut;
}
```

## Configuration Files

### Protocol Configuration

```json
{
  "protocols": [
    {
      "name": "Uniswap V3",
      "type": "uniswap-v3",
      "router": "0xE592427A0AEce92De3Edee1F18E0157C05861564",
      "factory": "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      "quoter": "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6",
      "supportedChains": [1, 42161, 137, 8453],
      "features": ["flash-swap", "concentrated-liquidity", "multiple-fee-tiers"],
      "version": "3"
    }
  ]
}
```

### Pool Manifest

```json
{
  "version": "1.0.0",
  "chainId": 42161,
  "lastUpdated": 1699564800000,
  "pools": [
    {
      "address": "0xC31E54c7a869B9FcBEcc14363CF510d1c41fa443",
      "token0": "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
      "token1": "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
      "fee": 500,
      "protocol": "Uniswap V3",
      "chainId": 42161,
      "tvl": "10000000",
      "volume24h": "5000000",
      "lastUpdated": 1699564800000,
      "enabled": true
    }
  ]
}
```

## Best Practices

### 1. Initialize on Startup

```typescript
async function initializeRegistries() {
  // Load protocols from config
  const protocolsConfig = await loadConfig('protocols.json');
  protocolRegistry.loadFromConfig(protocolsConfig);
  
  // Load tokens from config
  const tokensConfig = await loadConfig('tokens.json');
  tokenPrecision.loadFromConfig(tokensConfig);
  
  // Load pool manifests for active chains
  const activeChains = [1, 42161, 137, 8453];
  await Promise.all(
    activeChains.map(chainId => dynamicPoolManager.loadManifest(chainId))
  );
  
  console.log('Registries initialized');
}
```

### 2. Periodic Pool Updates

```typescript
// Update pool data every 5 minutes
setInterval(async () => {
  const chainIds = [42161]; // Arbitrum
  
  for (const chainId of chainIds) {
    const pools = await dynamicPoolManager.getPools(chainId);
    
    for (const pool of pools) {
      try {
        const updatedData = await fetchPoolData(pool.address);
        await dynamicPoolManager.updatePool(chainId, pool.address, updatedData);
      } catch (error) {
        console.error(`Failed to update pool ${pool.address}:`, error);
      }
    }
  }
}, 5 * 60 * 1000);
```

### 3. Prune Inactive Pools Daily

```typescript
// Prune inactive pools once per day
setInterval(async () => {
  const pruned = await dynamicPoolManager.pruneInactivePools(
    undefined,  // All chains
    7 * 24 * 60 * 60 * 1000  // 7 days
  );
  console.log(`Pruned ${pruned} inactive pools`);
}, 24 * 60 * 60 * 1000);
```

### 4. Graceful Shutdown

```typescript
async function shutdown() {
  console.log('Saving pool manifests...');
  await dynamicPoolManager.saveAll();
  console.log('Manifests saved');
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```

## Migration from Old Config System

```typescript
// Old system
const config = require('./configs/pools/dex_pools.json');

// New system
import { dynamicPoolManager } from './src/config/registry';

const pools = await dynamicPoolManager.getPools(42161);
```

## Performance Considerations

- **Caching:** Registries are in-memory for fast access
- **Lazy Loading:** Pool manifests loaded on-demand
- **Auto-Save:** Automatic persistence on updates (configurable)
- **Batch Operations:** Use Promise.all for multiple chains

## Related Documentation

- [MEV Integration Guide](./MEV_INTEGRATION.md)
- [Rate Limiting Guide](./RATE_LIMITING.md)
- [Testing Guide](./TESTING_GUIDE.md)
