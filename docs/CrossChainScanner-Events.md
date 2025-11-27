# CrossChainScanner Event API

The `CrossChainScanner` now extends `EventEmitter` and emits events throughout its lifecycle for monitoring and integration purposes.

## Event Types

### `started`
Emitted when the scanner begins continuous scanning.

**Payload:**
```typescript
{
  chainsMonitored: number;    // Number of chains being monitored
  tokensWatched: number;      // Number of tokens in watch list
  scanInterval: number;       // Scan interval in milliseconds
}
```

**Example:**
```typescript
scanner.on('started', (data) => {
  console.log(`Scanner started monitoring ${data.chainsMonitored} chains`);
});
```

---

### `stopped`
Emitted when the scanner stops continuous scanning.

**Payload:**
```typescript
{
  timestamp: number;  // Unix timestamp when stopped
}
```

---

### `providerMismatch`
⚠️ **Critical Event** - Emitted when a provider's network chainId doesn't match the expected chainId.

**Payload:**
```typescript
{
  expectedChainId: number;  // Expected chain ID
  actualChainId: number;    // Actual chain ID from provider
  timestamp: number;        // Unix timestamp
}
```

**Example:**
```typescript
scanner.on('providerMismatch', (data) => {
  console.error(`Provider mismatch: expected ${data.expectedChainId} but got ${data.actualChainId}`);
  // Take corrective action - reconfigure provider, alert admin, etc.
});
```

---

### `adapterInitialized`
Emitted when a chain adapter is successfully initialized.

**Payload:**
```typescript
{
  chainId: number | string;  // Chain identifier
  type: 'EVM' | 'Solana';    // Adapter type
}
```

---

### `adapterInitializationFailed`
Emitted when a chain adapter fails to initialize.

**Payload:**
```typescript
{
  chainId: number | string;  // Chain identifier
  error: string;             // Error message
}
```

---

### `scanComplete`
Emitted after each scan completes successfully.

**Payload:**
```typescript
{
  chainsScanned: number;      // Number of chains scanned
  tokensScanned: number;      // Number of tokens scanned
  discrepanciesFound: number; // Number of price discrepancies found
  scanTime: number;           // Scan duration in milliseconds
}
```

**Example:**
```typescript
scanner.on('scanComplete', (data) => {
  console.log(`Scan completed in ${data.scanTime}ms, found ${data.discrepanciesFound} discrepancies`);
});
```

---

### `scanError`
Emitted when a scan encounters an error.

**Payload:**
```typescript
{
  error: string;      // Error message
  timestamp: number;  // Unix timestamp
}
```

---

### `chainFetchError`
Emitted when fetching prices from a specific chain fails.

**Payload:**
```typescript
{
  chainId: number | string;  // Chain that failed
  error: string;             // Error message
}
```

---

### `discrepanciesFound`
Emitted when price discrepancies are detected during a scan.

**Payload:**
```typescript
{
  count: number;                  // Number of discrepancies found
  topDiscrepancies: PriceDiscrepancy[];  // Top 5 discrepancies
  timestamp: number;              // Unix timestamp
}
```

**Example:**
```typescript
scanner.on('discrepanciesFound', (data) => {
  console.log(`Found ${data.count} price discrepancies`);
  data.topDiscrepancies.forEach(disc => {
    console.log(`${disc.token}: ${disc.discrepancy.toFixed(2)}% difference`);
  });
});
```

---

### `error`
Emitted for critical errors (e.g., no adapters available).

**Payload:**
```typescript
Error  // Standard Error object
```

---

## Usage Example

```typescript
import { CrossChainScanner } from './chains';
import { ChainProviderManager } from './chains';
import { DEFAULT_CROSS_CHAIN_CONFIG } from './config/cross-chain.config';

const providerManager = new ChainProviderManager(
  DEFAULT_CROSS_CHAIN_CONFIG.chains,
  30000,
  3
);

const scanner = new CrossChainScanner(
  providerManager,
  DEFAULT_CROSS_CHAIN_CONFIG.scanner,
  ['0xTokenAddress1', '0xTokenAddress2']
);

// Monitor critical events
scanner.on('providerMismatch', (data) => {
  // Alert system administrators
  alertAdmin(`Provider mismatch on chain ${data.expectedChainId}`);
});

scanner.on('discrepanciesFound', (data) => {
  // Trigger arbitrage strategies
  data.topDiscrepancies.forEach(disc => {
    if (disc.isProfitable) {
      executeArbitrage(disc);
    }
  });
});

scanner.on('scanError', (data) => {
  // Log error for monitoring
  logger.error('Scan failed', data);
});

// Start scanning (async)
await scanner.startScanning();
```

---

## Best Practices

1. **Always listen for `providerMismatch`** - This indicates a configuration error that can lead to incorrect behavior.

2. **Monitor `scanError` and `chainFetchError`** - These help identify connectivity or RPC issues.

3. **Use `scanComplete` for metrics** - Track scan performance and health over time.

4. **Act on `discrepanciesFound`** - This is the primary event for arbitrage opportunities.

5. **Handle `error` events** - Critical errors should stop the system or trigger alerts.

---

## Breaking Changes from Previous Version

- `startScanning()` is now `async` and returns `Promise<void>`
- Scanner now extends `EventEmitter` - existing event listeners still work but benefit from new events
- Constructor now validates configuration and may throw errors for invalid config

---

## Migration Guide

### Before:
```typescript
scanner.startScanning();
```

### After:
```typescript
await scanner.startScanning();
```

Add event listeners for better monitoring:
```typescript
scanner.on('providerMismatch', handleMismatch);
scanner.on('discrepanciesFound', handleOpportunities);
await scanner.startScanning();
```
