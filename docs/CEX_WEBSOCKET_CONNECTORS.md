# CEX WebSocket Connectors - Complete Guide

## Overview

TheWarden now supports **9 centralized exchanges** with free public WebSocket streams for market data. This document provides a comprehensive guide to using all supported exchanges.

## Supported Exchanges

| Exchange | WebSocket URL | Special Features | Documentation |
|----------|---------------|------------------|---------------|
| **Binance** | `wss://stream.binance.com:9443/ws` | Gold standard, extremely fast | [Docs](https://binance-docs.github.io/apidocs/spot/en/) |
| **Kraken** | `wss://ws.kraken.com` | Developer-friendly, stable feed | [Docs](https://docs.kraken.com/websockets/) |
| **Coinbase** | `wss://ws-feed.exchange.coinbase.com` | Institutional-grade data | [Docs](https://docs.cloud.coinbase.com/exchange/docs) |
| **OKX** | `wss://ws.okx.com:8443/ws/v5/public` | Unified V5 API, clean | [Docs](https://www.okx.com/docs-v5/en/#websocket-api) |
| **Bybit** | `wss://stream.bybit.com/v5/public/spot` | V5 unified API | [Docs](https://bybit-exchange.github.io/docs/v5/intro) |
| **Bitfinex** | `wss://api-pub.bitfinex.com/ws/2` | Array-based data structures | [Docs](https://docs.bitfinex.com/docs/ws-general) |
| **KuCoin** | Dynamic (requires token) | Requires REST handshake | [Docs](https://docs.kucoin.com/#websocket-feed) |
| **Gate.io** | `wss://api.gateio.ws/ws/v4/` | WebSocket v4 API | [Docs](https://www.gate.io/docs/developers/apiv4/ws/en/) |
| **MEXC** | `wss://wbs.mexc.com/ws` | High volume Asian exchange | [Docs](https://mexcdevelop.github.io/apidocs/spot_v3_en/) |

## Quick Start

### Basic Usage

```typescript
import { CEXLiquidityMonitor, CEXExchange } from './src/execution/cex/index.js';

const monitor = new CEXLiquidityMonitor({
  exchanges: [
    {
      exchange: CEXExchange.BINANCE,
      symbols: ['BTC/USDT', 'ETH/USDT'],
    },
    {
      exchange: CEXExchange.BITFINEX,
      symbols: ['BTC/USD', 'ETH/USD'],
    },
  ],
  onTicker: (ticker) => {
    console.log(`${ticker.exchange} ${ticker.symbol}: $${ticker.last}`);
  },
});

await monitor.start();
```

### Individual Connector Usage

Each exchange can be used independently:

```typescript
import { BitfinexConnector, CEXExchange } from './src/execution/cex/index.js';

const connector = new BitfinexConnector(
  {
    exchange: CEXExchange.BITFINEX,
    symbols: ['BTC/USD'],
  },
  {
    onTicker: (ticker) => console.log('Ticker:', ticker),
    onOrderBook: (book) => console.log('Order Book:', book),
    onError: (exchange, error) => console.error('Error:', error),
  }
);

await connector.connect();
```

## Exchange-Specific Details

### Bitfinex

**Special Features:**
- Uses array-based message format (not JSON objects)
- Requires careful parsing of nested arrays
- Very raw data structures

**Symbol Format:**
- Standard: `BTC/USD`
- Bitfinex: `tBTCUSD` (prefixed with 't')

**Example:**
```typescript
import { BitfinexConnector, CEXExchange } from './src/execution/cex/index.js';

const bitfinex = new BitfinexConnector({
  exchange: CEXExchange.BITFINEX,
  symbols: ['BTC/USD', 'ETH/USD'],
});

await bitfinex.connect();
```

**Data Format:**
- Ticker: `[BID, BID_SIZE, ASK, ASK_SIZE, DAILY_CHANGE, ..., LAST_PRICE, VOLUME, ...]`
- Order Book Snapshot: `[[PRICE, COUNT, AMOUNT], ...]`
- Order Book Update: `[PRICE, COUNT, AMOUNT]`

### KuCoin

**Special Features:**
- **Requires REST API handshake** before WebSocket connection
- Dynamic WebSocket endpoint (changes per connection)
- Token-based authentication (even for public data)

**Symbol Format:**
- Standard: `BTC/USDT`
- KuCoin: `BTC-USDT`

**Connection Process:**
```
1. POST https://api.kucoin.com/api/v1/bullet-public
2. Extract token and WebSocket endpoint from response
3. Connect to WebSocket with token as query parameter
4. Subscribe to channels
```

**Example:**
```typescript
import { KuCoinConnector, CEXExchange } from './src/execution/cex/index.js';

// KuCoin handles token handshake automatically
const kucoin = new KuCoinConnector({
  exchange: CEXExchange.KUCOIN,
  symbols: ['BTC/USDT', 'ETH/USDT'],
});

await kucoin.connect(); // Performs handshake internally
```

**Channels:**
- Ticker: `/market/ticker:{symbol}`
- Order Book: `/spotMarket/level2Depth5:{symbol}`

### Gate.io

**Special Features:**
- Clean WebSocket v4 API
- Time-based message format
- Multiple update intervals available

**Symbol Format:**
- Standard: `BTC/USDT`
- Gate.io: `BTC_USDT`

**Example:**
```typescript
import { GateConnector, CEXExchange } from './src/execution/cex/index.js';

const gate = new GateConnector({
  exchange: CEXExchange.GATE,
  symbols: ['BTC/USDT', 'ETH/USDT'],
});

await gate.connect();
```

**Channels:**
- Ticker: `spot.tickers`
- Order Book: `spot.order_book` (with depth and update frequency)

### MEXC

**Special Features:**
- High trading volume in Asian markets
- Subscription-based channel model
- Mini ticker format available

**Symbol Format:**
- Standard: `BTC/USDT`
- MEXC: `BTCUSDT`

**Example:**
```typescript
import { MEXCConnector, CEXExchange } from './src/execution/cex/index.js';

const mexc = new MEXCConnector({
  exchange: CEXExchange.MEXC,
  symbols: ['BTC/USDT', 'ETH/USDT'],
});

await mexc.connect();
```

**Channels:**
- Ticker: `spot@public.miniTickers.v3.api@{SYMBOL}`
- Order Book: `spot@public.limit.depth.v3.api@{SYMBOL}@20`

## Common Patterns

### Cross-Exchange Price Monitoring

```typescript
const monitor = new CEXLiquidityMonitor({
  exchanges: [
    { exchange: CEXExchange.BINANCE, symbols: ['BTC/USDT'] },
    { exchange: CEXExchange.BITFINEX, symbols: ['BTC/USD'] },
    { exchange: CEXExchange.KUCOIN, symbols: ['BTC/USDT'] },
    { exchange: CEXExchange.GATE, symbols: ['BTC/USDT'] },
    { exchange: CEXExchange.MEXC, symbols: ['BTC/USDT'] },
  ],
  onTicker: (ticker) => {
    // Compare prices across exchanges
  },
});
```

### Arbitrage Detection

```typescript
const priceMap = new Map();

const monitor = new CEXLiquidityMonitor({
  exchanges: [...],
  onTicker: (ticker) => {
    const prices = priceMap.get(ticker.symbol) || new Map();
    prices.set(ticker.exchange, parseFloat(ticker.last));
    priceMap.set(ticker.symbol, prices);
    
    // Find min/max prices
    const priceArray = Array.from(prices.entries());
    const min = priceArray.reduce((a, b) => a[1] < b[1] ? a : b);
    const max = priceArray.reduce((a, b) => a[1] > b[1] ? a : b);
    
    const spread = ((max[1] - min[1]) / min[1]) * 100;
    if (spread > 0.1) {
      console.log(`Arbitrage: Buy on ${min[0]} at $${min[1]}, sell on ${max[0]} at $${max[1]}`);
    }
  },
});
```

### Order Book Depth Analysis

```typescript
const monitor = new CEXLiquidityMonitor({
  exchanges: [...],
  onOrderBook: (orderBook) => {
    const bidDepth = orderBook.bids
      .slice(0, 10)
      .reduce((sum, bid) => sum + parseFloat(bid.quantity) * parseFloat(bid.price), 0);
    
    const askDepth = orderBook.asks
      .slice(0, 10)
      .reduce((sum, ask) => sum + parseFloat(ask.quantity) * parseFloat(ask.price), 0);
    
    console.log(`${orderBook.exchange} ${orderBook.symbol}:`);
    console.log(`  Bid depth (top 10): $${bidDepth.toFixed(2)}`);
    console.log(`  Ask depth (top 10): $${askDepth.toFixed(2)}`);
  },
});
```

## Configuration Options

### CEXConnectionConfig

```typescript
interface CEXConnectionConfig {
  exchange: CEXExchange;
  symbols: string[];           // Trading pairs to monitor
  apiKey?: string;             // Optional API key (for private endpoints)
  apiSecret?: string;          // Optional API secret
  testnet?: boolean;           // Use testnet endpoints
  reconnect?: boolean;         // Auto-reconnect (default: true)
  reconnectDelay?: number;     // Delay between reconnects (default: 5000ms)
  maxReconnectAttempts?: number; // Max reconnection attempts (default: 10)
}
```

### CEXMonitorConfig

```typescript
interface CEXMonitorConfig {
  exchanges: CEXConnectionConfig[];
  updateInterval?: number;      // Snapshot update interval (default: 1000ms)
  minSpreadBps?: number;        // Minimum spread to report (default: 10 bps)
  onOrderBook?: OrderBookCallback;
  onTicker?: TickerCallback;
  onArbitrage?: ArbitrageCallback;
  onError?: ErrorCallback;
}
```

## Symbol Formats

Different exchanges use different symbol formats. TheWarden normalizes them internally:

| Exchange | Format | Example | Normalized |
|----------|--------|---------|------------|
| Binance | `BASEUSDT` | `BTCUSDT` | `BTC/USDT` |
| Kraken | `BASE/USD` | `XBT/USD` | `BTC/USD` |
| Coinbase | `BASE-USD` | `BTC-USD` | `BTC/USD` |
| OKX | `BASE-USDT-SPOT` | `BTC-USDT-SPOT` | `BTC/USDT` |
| Bybit | `BASEUSDT` | `BTCUSDT` | `BTC/USDT` |
| Bitfinex | `tBASEUSD` | `tBTCUSD` | `BTC/USD` |
| KuCoin | `BASE-USDT` | `BTC-USDT` | `BTC/USDT` |
| Gate.io | `BASE_USDT` | `BTC_USDT` | `BTC/USDT` |
| MEXC | `BASEUSDT` | `BTCUSDT` | `BTC/USDT` |

## Error Handling

All connectors provide error callbacks:

```typescript
const connector = new BitfinexConnector(
  { ... },
  {
    onError: (exchange, error) => {
      console.error(`[${exchange}] Error:`, error.message);
      
      // Handle specific errors
      if (error.message.includes('rate limit')) {
        // Handle rate limiting
      } else if (error.message.includes('authentication')) {
        // Handle auth errors
      }
    },
  }
);
```

## Performance Considerations

### Updates Per Second

Based on testing, expected update rates:

1. **Binance**: ~100-200 updates/sec (fastest)
2. **OKX**: ~50-100 updates/sec
3. **Bybit**: ~50-100 updates/sec
4. **MEXC**: ~30-60 updates/sec
5. **Gate.io**: ~30-60 updates/sec
6. **KuCoin**: ~20-40 updates/sec
7. **Bitfinex**: ~20-40 updates/sec
8. **Kraken**: ~10-20 updates/sec
9. **Coinbase**: ~10-20 updates/sec

### Resource Usage

- Each connector uses 1 WebSocket connection
- Memory: ~1-2MB per connector
- CPU: Minimal (~0.1% per connector)
- Network: ~10-50 KB/s per connector

### Recommendations

- For arbitrage: Use Binance + OKX + MEXC (highest volume)
- For US compliance: Use Coinbase + Kraken
- For global coverage: Use all 9 exchanges
- For testing: Start with 2-3 exchanges

## Troubleshooting

### Common Issues

**1. KuCoin Connection Fails**
- Ensure you have internet access for REST API call
- Check if KuCoin API is accessible in your region
- Verify token handshake is completing

**2. Bitfinex Data Parsing Errors**
- Ensure you're handling array-based messages correctly
- Check for proper channel mapping

**3. Reconnection Issues**
- Increase `reconnectDelay` for unstable connections
- Check `maxReconnectAttempts` configuration
- Monitor error callbacks for root cause

**4. Symbol Not Found**
- Verify symbol format for each exchange
- Check if trading pair is available on that exchange
- Use normalized format (`BTC/USDT`) when possible

## Examples

See the `/examples` directory for comprehensive examples:

- `cex-extended-monitoring.ts` - Monitor all 9 exchanges
- `cex-multi-exchange-monitoring.ts` - Original 5 exchanges
- `cex-dex-arbitrage-detection.ts` - CEX-DEX arbitrage
- `integrated-cex-dex-arbitrage.ts` - Full orchestrator integration

## API Reference

### CEXLiquidityMonitor

```typescript
class CEXLiquidityMonitor {
  constructor(config: CEXMonitorConfig);
  
  async start(): Promise<void>;
  async stop(): Promise<void>;
  
  getStats(): CEXMonitorStats[];
  getLiquiditySnapshot(symbol: string): LiquiditySnapshot | undefined;
  getAllSnapshots(): LiquiditySnapshot[];
}
```

### Individual Connectors

All connectors (Binance, Bitfinex, KuCoin, etc.) share the same interface:

```typescript
class Connector {
  constructor(config: CEXConnectionConfig, callbacks?: {...});
  
  async connect(): Promise<void>;
  disconnect(): void;
  
  getOrderBook(symbol: string): OrderBook | undefined;
  getAllOrderBooks(): OrderBook[];
  getStats(): CEXMonitorStats;
  isConnected(): boolean;
}
```

## Integration with TheWarden

### Enable in Configuration

Add to your `.env` file:

```bash
ENABLE_CEX_MONITOR=true
CEX_EXCHANGES=binance,bitfinex,kucoin,gate,mexc
CEX_SYMBOLS=BTC/USDT,ETH/USDC,ETH/USDT
```

### Use in Main Application

```typescript
import { CEXLiquidityMonitor } from './execution/cex/CEXLiquidityMonitor.js';

const cexMonitor = new CEXLiquidityMonitor({
  exchanges: process.env.CEX_EXCHANGES.split(',').map(ex => ({
    exchange: ex as CEXExchange,
    symbols: process.env.CEX_SYMBOLS.split(','),
  })),
});

await cexMonitor.start();
```

## Contributing

To add a new exchange connector:

1. Create `{Exchange}Connector.ts` in `/src/execution/cex/`
2. Implement the connector interface
3. Add to `CEXExchange` enum in `types.ts`
4. Export from `index.ts`
5. Add case in `CEXLiquidityMonitor.initializeConnector()`
6. Add tests
7. Update documentation

## License

MIT License - See LICENSE file for details
