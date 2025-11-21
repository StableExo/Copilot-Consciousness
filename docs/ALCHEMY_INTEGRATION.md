# Alchemy Integration Documentation

## Overview

The Alchemy integration provides enhanced blockchain data access, real-time monitoring, and transaction analysis capabilities to the consciousness system. This integration leverages Alchemy's powerful APIs to improve MEV detection, arbitrage opportunity identification, and transaction debugging.

## Features

### 1. Enhanced Token API (`AlchemyTokenService`)

Provides comprehensive token data access:

- **Token Balances**: Get ERC-20 token balances for any address
- **Token Metadata**: Fetch name, symbol, decimals, and logo for tokens
- **Transfer History**: Query historical asset transfers with flexible filters
- **Contract Activity**: Monitor first/latest transfers for contracts

**Example Usage:**

```typescript
import { AlchemyTokenService } from './services/alchemy';

const tokenService = new AlchemyTokenService();

// Get token balances
const balances = await tokenService.getTokenBalances(address);

// Get token metadata
const metadata = await tokenService.getTokenMetadata(tokenAddress);

// Get historical transfers
const transfers = await tokenService.getAssetTransfers({
  fromAddress: address,
  category: [AssetTransfersCategory.ERC20],
  fromBlock: '0x0',
  maxCount: 100,
});
```

### 2. Prices Service (`AlchemyPricesService`)

Token price tracking and arbitrage analysis:

- **Current Prices**: Get real-time token prices in USD/ETH
- **Price Comparison**: Compare prices across different sources
- **Arbitrage Calculation**: Calculate potential arbitrage profits
- **Price Caching**: Built-in caching to reduce API calls

**Example Usage:**

```typescript
import { AlchemyPricesService } from './services/alchemy';

const pricesService = new AlchemyPricesService();

// Get token price
const priceUsd = await pricesService.getTokenPriceUsd(tokenAddress);

// Compare prices for arbitrage
const comparison = await pricesService.comparePrices(
  tokenAddress,
  dex1Price,
  dex2Price
);

if (comparison.profitPotential > 0.5) {
  console.log('Profitable arbitrage opportunity detected!');
}
```

### 3. Trace API Service (`AlchemyTraceService`)

Transaction tracing and debugging:

- **Transaction Tracing**: Understand transaction execution flow
- **Failure Analysis**: Determine why transactions failed
- **Gas Analysis**: Detailed gas usage breakdown
- **Simulation**: Test transactions before sending
- **Revert Reasons**: Extract revert reasons from failed transactions

**Example Usage:**

```typescript
import { AlchemyTraceService } from './services/alchemy';

const traceService = new AlchemyTraceService();

// Analyze a failed transaction
const analysis = await traceService.analyzeFailedTransaction(txHash);
console.log(`Failure reason: ${analysis.failureReason}`);

// Simulate before sending
const simulation = await traceService.simulateTransaction(
  from,
  to,
  data,
  value
);

if (!simulation.success) {
  console.log(`Transaction would fail: ${simulation.error}`);
}

// Get gas breakdown
const gasAnalysis = await traceService.analyzeGasUsage(txHash);
console.log(`Total gas: ${gasAnalysis.totalGas}`);
```

### 4. Webhook/Notify Service (`AlchemyWebhookService`)

Real-time blockchain event monitoring:

- **Address Monitoring**: Track activity for specific addresses
- **Block Subscriptions**: Get notified of new blocks
- **Pending Transactions**: Monitor mempool activity
- **Token Transfers**: Track specific token movements
- **DEX Activity**: Monitor DEX contracts for arbitrage opportunities
- **Large Transactions**: Detect significant value transfers

**Example Usage:**

```typescript
import { AlchemyWebhookService } from './services/alchemy';

const webhookService = new AlchemyWebhookService();

// Subscribe to address activity
await webhookService.subscribeToAddress(address, (event) => {
  console.log('Address activity:', event);
});

// Monitor pending transactions for arbitrage
await webhookService.monitorDexActivity(dexAddresses, (activity) => {
  // Analyze for arbitrage opportunity
  analyzeArbitrageOpportunity(activity);
});

// Monitor large transactions (potential MEV)
await webhookService.monitorLargeTransactions(10, (tx) => {
  console.log(`Large transaction detected: ${tx.valueEth} ETH`);
});
```

## Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
# Alchemy API Key (required)
ALCHEMY_API_KEY=your_api_key_here

# Network (optional, defaults to arbitrum)
NETWORK=arbitrum
```

### Supported Networks

- Ethereum Mainnet (`ethereum`, `mainnet`)
- Arbitrum (`arbitrum`)
- Optimism (`optimism`)
- Polygon (`polygon`)
- Base (`base`)
- And their respective testnets

## Integration with Consciousness System

### 1. Enhanced Arbitrage Detection

The Alchemy services can be integrated into the arbitrage consciousness system:

```typescript
import { createAlchemyServices } from './services/alchemy';
import { ArbitrageConsciousness } from './consciousness/ArbitrageConsciousness';

const alchemy = createAlchemyServices();
const consciousness = new ArbitrageConsciousness();

// Monitor DEX activity for opportunities
await alchemy.webhooks.monitorDexActivity(dexAddresses, async (activity) => {
  // Feed activity to consciousness system
  const opportunity = await consciousness.analyzeOpportunity(activity);
  
  if (opportunity.isProfitable) {
    console.log('Profitable opportunity detected!');
  }
});
```

### 2. Transaction Analysis

Analyze failed arbitrage attempts to improve strategy:

```typescript
const failedTxHash = '0x...';
const analysis = await alchemy.trace.analyzeFailedTransaction(failedTxHash);

// Feed analysis to learning system
consciousness.learn({
  type: 'failed_execution',
  reason: analysis.failureReason,
  gasUsed: analysis.gasUsed,
});
```

### 3. Real-Time Price Monitoring

Track token prices across multiple sources:

```typescript
// Monitor price feeds
setInterval(async () => {
  const prices = await Promise.all(
    tokens.map(token => alchemy.prices.getTokenPriceUsd(token))
  );
  
  // Update consciousness system with latest prices
  consciousness.updatePrices(prices);
}, 10000); // Every 10 seconds
```

## Advanced Features

### Custom WebSocket Subscriptions

```typescript
// Subscribe to specific contract events
await alchemy.webhooks.subscribeToLogs(
  contractAddress,
  [eventTopic],
  (log) => {
    // Process event
  }
);
```

### Batch Operations

```typescript
// Get balances for multiple tokens
const tokens = ['0x...', '0x...', '0x...'];
const balances = await alchemy.tokens.getTokenBalances(address, tokens);
```

### Historical Analysis

```typescript
// Analyze all transactions in a block
const blockTraces = await alchemy.trace.traceBlock(blockNumber);
```

## Performance Considerations

1. **Caching**: The price service includes built-in caching with a 1-minute TTL
2. **Rate Limiting**: Alchemy SDK handles rate limiting automatically
3. **WebSocket Efficiency**: Use WebSockets for real-time data instead of polling
4. **Batch Requests**: Group multiple requests when possible

## Error Handling

All services include comprehensive error handling:

```typescript
try {
  const balances = await tokenService.getTokenBalances(address);
} catch (error) {
  console.error('Failed to fetch balances:', error);
  // Fallback to alternative data source
}
```

## Testing

Example test structure:

```typescript
import { AlchemyTokenService } from './services/alchemy';

describe('AlchemyTokenService', () => {
  it('should fetch token balances', async () => {
    const service = new AlchemyTokenService();
    const balances = await service.getTokenBalances(testAddress);
    expect(balances).toBeDefined();
    expect(Array.isArray(balances)).toBe(true);
  });
});
```

## Troubleshooting

### API Key Issues

If you see "Warning: ALCHEMY_API_KEY not set":
1. Create an account at https://www.alchemy.com/
2. Create an app and get your API key
3. Add it to your `.env` file as `ALCHEMY_API_KEY`

### Network Compatibility

Ensure your network is supported:
```typescript
const client = getAlchemyClient();
console.log('Current network:', client.getNetwork());
```

### WebSocket Connection

Check WebSocket status:
```typescript
const isConnected = webhookService.isConnected();
console.log('WebSocket connected:', isConnected);
```

## References

- [Alchemy Documentation](https://docs.alchemy.com/)
- [Alchemy SDK Reference](https://github.com/alchemyplatform/alchemy-sdk-js)
- [Enhanced APIs Guide](https://docs.alchemy.com/reference/enhanced-apis-overview)
- [Notify API](https://docs.alchemy.com/reference/notify-api-quickstart)

## Contributing

When adding new Alchemy features:

1. Add the feature to the appropriate service class
2. Update this documentation
3. Add examples to `examples/alchemy-integration-demo.ts`
4. Add tests for the new functionality
5. Update the changelog

## Future Enhancements

Planned features:
- [ ] Subgraph integration for historical data
- [ ] NFT tracking for MEV opportunities
- [ ] Enhanced gas estimation using Alchemy's simulation APIs
- [ ] Multi-network arbitrage detection
- [ ] Advanced mempool analysis
- [ ] Custom webhook management via API
