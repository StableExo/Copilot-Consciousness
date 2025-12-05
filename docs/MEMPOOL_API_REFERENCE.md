# Mempool.space API Reference - Complete Guide 📡

**Last Updated**: December 5, 2025  
**API Version**: v1  
**Documentation**: https://mempool.space/docs/api  

---

## Table of Contents

1. [REST vs WebSocket: When to Use Each](#rest-vs-websocket-when-to-use-each)
2. [REST API Reference](#rest-api-reference)
3. [WebSocket API Reference](#websocket-api-reference)
4. [Integration Examples](#integration-examples)
5. [Rate Limits & Best Practices](#rate-limits--best-practices)
6. [Error Handling](#error-handling)

---

## REST vs WebSocket: When to Use Each

### REST API (Pull Model)

**How It Works**:
```
You → HTTP Request → Mempool.space → HTTP Response → You
(Repeat every X seconds for updates)
```

**Characteristics**:
- **Request-Response**: You ask, server answers
- **Stateless**: Each request is independent
- **Polling**: You must repeatedly request to get updates
- **Simple**: Easy to implement (just HTTP calls)

**When to Use**:
- ✅ Historical data queries (blocks from last week)
- ✅ One-time lookups (check a specific transaction)
- ✅ Periodic updates (fee estimates every 30 seconds)
- ✅ Batch processing (analyze last 100 blocks)
- ✅ Low-frequency monitoring (check once per minute)

**Rate Limits**:
- Free tier: **10 requests/minute**
- Paid tier: **100 requests/minute**
- Enterprise: Custom rates

**Example Use Cases**:
```typescript
// Good: Periodic fee estimation
setInterval(async () => {
  const fees = await fetch('https://mempool.space/api/v1/fees/recommended');
  console.log('Current fees:', fees);
}, 30000); // Every 30 seconds = 2 req/min ✓

// Bad: Watching for new blocks
setInterval(async () => {
  const tip = await fetch('https://mempool.space/api/blocks/tip/height');
  // This wastes rate limit - use WebSocket instead!
}, 1000); // Every second = 60 req/min ✗ (rate limited)
```

### WebSocket API (Push Model)

**How It Works**:
```
You → Connect → Mempool.space
           ↓
    [Connection Open]
           ↓
Mempool.space → Pushes Updates → You (automatically when data changes)
```

**Characteristics**:
- **Persistent Connection**: Single connection stays open
- **Event-Driven**: Server pushes updates when they happen
- **Real-Time**: Instant notifications (no polling delay)
- **Efficient**: No repeated requests needed

**When to Use**:
- ✅ Real-time block confirmations
- ✅ Live mempool monitoring
- ✅ Transaction confirmation tracking
- ✅ Address balance watching
- ✅ High-frequency updates (sub-second)

**No Rate Limits** (within reason - don't abuse)

**Example Use Cases**:
```typescript
// Good: Watch for new blocks
const ws = new WebSocket('wss://mempool.space/api/v1/ws');
ws.on('message', (data) => {
  const event = JSON.parse(data);
  if (event.block) {
    console.log('New block:', event.block);
  }
});

// Good: Track transaction confirmations
ws.send(JSON.stringify({
  action: 'want',
  data: ['blocks', 'mempool-blocks']
}));
```

### Decision Matrix

| Scenario | Use REST | Use WebSocket | Reason |
|----------|----------|---------------|--------|
| Check current fees | ✓ | | One-time lookup |
| Monitor for new blocks | | ✓ | Real-time events |
| Get block details | ✓ | | Specific data query |
| Watch address balance | | ✓ | Need instant updates |
| Analyze historical data | ✓ | | Batch query |
| Track pending TX | | ✓ | Confirmation monitoring |
| Fee estimation (30s) | ✓ | | Periodic polling OK |
| Live mempool view | | ✓ | Real-time stream |

**Rule of Thumb**:
- **REST**: "I want to know X right now"
- **WebSocket**: "Tell me when X changes"

---

## REST API Reference

**Base URL**: `https://mempool.space/api/v1/`

### 1. General Endpoints

#### Get Difficulty Adjustment

```http
GET /api/v1/difficulty-adjustment
```

**Response**:
```json
{
  "progressPercent": 41.19,
  "difficultyChange": 1.75,
  "estimatedRetargetDate": 1733882000000,
  "remainingBlocks": 1234,
  "remainingTime": 518400000,
  "previousRetarget": 1.95
}
```

**Use Case**: Track next difficulty adjustment (impacts fee urgency)

#### Get Network Statistics

```http
GET /api/v1/statistics
```

**Response**:
```json
{
  "mempool_size": 4200000,
  "mempool_bytes": 120000000,
  "total_fee": 0.65000000,
  "mempool_max_size": 300000000,
  "tx_count": 5234,
  "tx_per_second": 4.2
}
```

**Use Case**: Overall network health monitoring

### 2. Block Endpoints

#### Get Recent Blocks

```http
GET /api/v1/blocks
GET /api/v1/blocks/:start_height
```

**Response**:
```json
[
  {
    "id": "00000000000000000001a2b3c4d5e6f7...",
    "height": 820000,
    "version": 536870912,
    "timestamp": 1733356800,
    "tx_count": 3245,
    "size": 1234567,
    "weight": 3987654,
    "merkle_root": "abc123...",
    "previousblockhash": "000000000000000000...",
    "mediantime": 1733356200,
    "nonce": 1234567890,
    "bits": 386469294,
    "difficulty": 72789921347594.89,
    "extras": {
      "medianFee": 3.2,
      "feeRange": [1.01, 4.04, 7.5, 12.8, 15.06],
      "reward": 312500000,
      "totalFees": 6000000,
      "avgFee": 1848,
      "avgFeeRate": 3.5,
      "pool": {
        "id": 1,
        "name": "Foundry USA",
        "slug": "foundryusa"
      }
    }
  }
]
```

**Use Case**: Analyze recent block patterns

#### Get Block by Hash

```http
GET /api/v1/block/:hash
```

**Use Case**: Get specific block details

#### Get Block Transactions

```http
GET /api/v1/block/:hash/txs
GET /api/v1/block/:hash/txs/:start_index
```

**Response**: Array of transaction objects

**Use Case**: Analyze transactions in a specific block

#### Get Current Block Height

```http
GET /api/blocks/tip/height
```

**Response**:
```json
820000
```

**Use Case**: Quick check for new blocks (but WebSocket is better)

### 3. Transaction Endpoints

#### Get Transaction Details

```http
GET /api/v1/tx/:txid
```

**Response**:
```json
{
  "txid": "abc123...",
  "version": 2,
  "locktime": 0,
  "vin": [
    {
      "txid": "def456...",
      "vout": 0,
      "prevout": {
        "scriptpubkey": "001420...",
        "scriptpubkey_asm": "OP_0 OP_PUSHBYTES_20 20...",
        "scriptpubkey_type": "v0_p2wpkh",
        "scriptpubkey_address": "bc1q...",
        "value": 100000000
      },
      "scriptsig": "",
      "scriptsig_asm": "",
      "witness": ["304402..."],
      "is_coinbase": false,
      "sequence": 4294967295
    }
  ],
  "vout": [
    {
      "scriptpubkey": "0014...",
      "scriptpubkey_asm": "OP_0 OP_PUSHBYTES_20 ...",
      "scriptpubkey_type": "v0_p2wpkh",
      "scriptpubkey_address": "bc1q...",
      "value": 98000000
    }
  ],
  "size": 225,
  "weight": 573,
  "fee": 2000000,
  "status": {
    "confirmed": true,
    "block_height": 820000,
    "block_hash": "00000000000...",
    "block_time": 1733356800
  }
}
```

**Use Case**: Check transaction status and details

#### Get Transaction Status

```http
GET /api/v1/tx/:txid/status
```

**Response**:
```json
{
  "confirmed": true,
  "block_height": 820000,
  "block_hash": "00000000000...",
  "block_time": 1733356800
}
```

**Use Case**: Quick confirmation check

#### Get Transaction Hex

```http
GET /api/v1/tx/:txid/hex
```

**Response**: Raw transaction hex string

**Use Case**: Broadcast or analyze raw transaction

#### Get Transaction Merkle Proof

```http
GET /api/v1/tx/:txid/merkle-proof
```

**Use Case**: SPV verification

#### Get Transaction Output Status

```http
GET /api/v1/tx/:txid/outspend/:vout
```

**Response**:
```json
{
  "spent": true,
  "txid": "ghi789...",
  "vin": 0,
  "status": {
    "confirmed": true,
    "block_height": 820001,
    "block_hash": "00000000000...",
    "block_time": 1733357400
  }
}
```

**Use Case**: UTXO tracking

### 4. Address Endpoints

#### Get Address Info

```http
GET /api/v1/address/:address
```

**Response**:
```json
{
  "address": "bc1q...",
  "chain_stats": {
    "funded_txo_count": 5,
    "funded_txo_sum": 500000000,
    "spent_txo_count": 3,
    "spent_txo_sum": 300000000,
    "tx_count": 8
  },
  "mempool_stats": {
    "funded_txo_count": 0,
    "funded_txo_sum": 0,
    "spent_txo_count": 0,
    "spent_txo_sum": 0,
    "tx_count": 0
  }
}
```

**Use Case**: Check address balance and history

#### Get Address Transactions

```http
GET /api/v1/address/:address/txs
GET /api/v1/address/:address/txs/chain/:last_seen_txid
```

**Response**: Array of transaction objects

**Use Case**: Transaction history for address

#### Get Address UTXOs

```http
GET /api/v1/address/:address/utxo
```

**Response**:
```json
[
  {
    "txid": "abc123...",
    "vout": 0,
    "status": {
      "confirmed": true,
      "block_height": 820000,
      "block_hash": "00000000000...",
      "block_time": 1733356800
    },
    "value": 200000000
  }
]
```

**Use Case**: Available outputs for spending

### 5. Fee Estimation Endpoints

#### Get Recommended Fees

```http
GET /api/v1/fees/recommended
```

**Response**:
```json
{
  "fastestFee": 10,
  "halfHourFee": 8,
  "hourFee": 6,
  "economyFee": 4,
  "minimumFee": 1
}
```

**All values in sat/vB**

**Use Case**: Primary fee estimation endpoint

#### Get Fee Estimates

```http
GET /api/v1/fees/mempool-blocks
```

**Response**:
```json
[
  {
    "blockSize": 1000000,
    "blockVSize": 1000000,
    "nTx": 2500,
    "totalFees": 12500000,
    "medianFee": 5.2,
    "feeRange": [1.0, 3.5, 5.2, 8.0, 15.0]
  }
]
```

**Use Case**: Detailed fee distribution analysis

### 6. Mempool Endpoints

#### Get Mempool Info

```http
GET /api/mempool
```

**Response**:
```json
{
  "count": 5234,
  "vsize": 12000000,
  "total_fee": 65000000,
  "fee_histogram": [
    [1.0, 500000],
    [2.0, 800000],
    [3.0, 1200000],
    // ... [fee_rate, vsize]
  ]
}
```

**Use Case**: Overall mempool state

#### Get Mempool Transaction IDs

```http
GET /api/mempool/txids
```

**Response**: Array of txids

**Use Case**: Get all pending transactions

#### Get Recent Mempool Transactions

```http
GET /api/mempool/recent
```

**Response**: Array of transaction objects

**Use Case**: See latest broadcasts

### 7. Mining Endpoints

#### Get Mining Pools

```http
GET /api/v1/mining/pools/:timespan
```

**Timespans**: `24h`, `3d`, `1w`, `1m`, `3m`, `6m`, `1y`, `2y`, `3y`, `all`

**Response**:
```json
{
  "pools": [
    {
      "poolId": 1,
      "name": "Foundry USA",
      "link": "https://foundrydigital.com",
      "blockCount": 432,
      "rank": 1,
      "emptyBlocks": 3,
      "slug": "foundryusa"
    }
  ],
  "blockCount": 1440,
  "lastEstimatedHashrate": 450000000000000000000
}
```

**Use Case**: Mining pool dominance tracking

#### Get Pool Details

```http
GET /api/v1/mining/pool/:slug
GET /api/v1/mining/pool/:slug/:timespan
```

**Response**: Detailed pool statistics

**Use Case**: Individual pool analysis

#### Get Pool Blocks

```http
GET /api/v1/mining/pool/:slug/blocks
GET /api/v1/mining/pool/:slug/blocks/:height
```

**Response**: Blocks mined by specific pool

**Use Case**: Pool block production history

#### Get Hashrate

```http
GET /api/v1/mining/hashrate/:timespan
```

**Response**:
```json
{
  "hashrates": [
    {
      "timestamp": 1733356800,
      "avgHashrate": 450000000000000000000
    }
  ],
  "currentHashrate": 450000000000000000000,
  "currentDifficulty": 72789921347594.89
}
```

**Use Case**: Network hashrate trends

### 8. Lightning Network Endpoints

#### Get Lightning Statistics

```http
GET /api/v1/lightning/statistics/latest
```

**Response**:
```json
{
  "latest": {
    "id": 12345,
    "added": "2025-12-05T00:00:00.000Z",
    "channel_count": 50000,
    "node_count": 15000,
    "total_capacity": 500000000000,
    "tor_nodes": 5000,
    "clearnet_nodes": 10000,
    "unannounced_nodes": 3000,
    "avg_capacity": 10000000,
    "avg_fee_rate": 100,
    "avg_base_fee_mtokens": 1000,
    "med_capacity": 8000000,
    "med_fee_rate": 50,
    "med_base_fee_mtokens": 500
  }
}
```

**Use Case**: Lightning Network health monitoring

#### Get Lightning Node

```http
GET /api/v1/lightning/nodes/:public_key
GET /api/v1/lightning/nodes/:public_key/statistics
```

**Response**: Node details, channels, capacity

**Use Case**: Node analysis

#### Get Top Lightning Nodes

```http
GET /api/v1/lightning/nodes/rankings/liquidity
GET /api/v1/lightning/nodes/rankings/connectivity
GET /api/v1/lightning/nodes/rankings/age
```

**Response**: Top 100 nodes by metric

**Use Case**: Identify routing hubs

#### Search Lightning Nodes

```http
GET /api/v1/lightning/search?searchText=:query
```

**Use Case**: Find nodes by alias

### 9. Acceleration Service Endpoints

#### Estimate Acceleration Cost

```http
GET /api/v1/services/accelerator/estimate/:txid
```

**Response**:
```json
{
  "txid": "abc123...",
  "eligible": true,
  "estimatedCost": 10000,
  "estimatedTime": "1-3 blocks",
  "pools": ["Foundry USA", "AntPool", "F2Pool"]
}
```

**Use Case**: Check if transaction can be accelerated

**Note**: Actual acceleration requires payment via web interface

---

## WebSocket API Reference

**WebSocket URL**: `wss://mempool.space/api/v1/ws`

### Connection Example

```typescript
const ws = new WebSocket('wss://mempool.space/api/v1/ws');

ws.on('open', () => {
  console.log('Connected to mempool.space WebSocket');
  
  // Subscribe to events
  ws.send(JSON.stringify({
    action: 'want',
    data: ['blocks', 'mempool-blocks', 'stats']
  }));
});

ws.on('message', (data) => {
  const event = JSON.parse(data.toString());
  console.log('Received event:', event);
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', () => {
  console.log('WebSocket connection closed');
});
```

### Available Topics

#### Subscribe to Topics

```json
{
  "action": "want",
  "data": ["blocks", "mempool-blocks", "stats", "live-2h-chart"]
}
```

**Topics**:
- `blocks`: New block confirmations
- `mempool-blocks`: Mempool block template updates (next block being mined)
- `stats`: Network statistics updates
- `live-2h-chart`: Fee/TX rate chart data

#### Track Specific Items

**Track Address**:
```json
{
  "track-address": "bc1q..."
}
```

**Response when address activity**:
```json
{
  "address-transactions": [
    {
      "txid": "abc123...",
      "address": "bc1q...",
      // ... transaction details
    }
  ]
}
```

**Track Transaction**:
```json
{
  "track-tx": "txid-here"
}
```

**Response when confirmed**:
```json
{
  "txConfirmed": {
    "txid": "abc123...",
    "block": {
      "height": 820000,
      "hash": "00000000000..."
    }
  }
}
```

**Track Mempool Block**:
```json
{
  "track-mempool-block": 0
}
```

### Event Types

#### New Block Event

```json
{
  "block": {
    "id": "00000000000000000001a2b3...",
    "height": 820000,
    "version": 536870912,
    "timestamp": 1733356800,
    "tx_count": 3245,
    "size": 1234567,
    "weight": 3987654,
    "merkle_root": "abc123...",
    "previousblockhash": "000000000000000000...",
    "mediantime": 1733356200,
    "nonce": 1234567890,
    "bits": 386469294,
    "difficulty": 72789921347594.89,
    "extras": {
      "medianFee": 3.2,
      "feeRange": [1.01, 4.04, 7.5, 12.8, 15.06],
      "reward": 312500000,
      "totalFees": 6000000,
      "avgFee": 1848,
      "avgFeeRate": 3.5,
      "pool": {
        "id": 1,
        "name": "Foundry USA",
        "slug": "foundryusa"
      }
    }
  }
}
```

#### Mempool Block Update

```json
{
  "mempool-blocks": [
    {
      "blockSize": 1000000,
      "blockVSize": 1000000,
      "nTx": 2500,
      "totalFees": 12500000,
      "medianFee": 5.2,
      "feeRange": [1.0, 3.5, 5.2, 8.0, 15.0]
    }
  ]
}
```

#### Statistics Update

```json
{
  "mempoolInfo": {
    "loaded": true,
    "size": 5234,
    "bytes": 12000000,
    "usage": 120000000,
    "maxmempool": 300000000,
    "mempoolminfee": 0.00001,
    "minrelaytxfee": 0.00001
  },
  "vBytesPerSecond": 4200,
  "transactions": [
    // Recent transactions
  ]
}
```

### Unsubscribe from Topics

```json
{
  "action": "want",
  "data": []
}
```

Sends empty array to unsubscribe from all topics.

---

## Integration Examples

### Example 1: Hybrid REST + WebSocket Monitor

```typescript
import WebSocket from 'ws';

class MempoolMonitor {
  private ws: WebSocket;
  private restBaseUrl = 'https://mempool.space/api/v1';
  
  constructor() {
    this.ws = new WebSocket('wss://mempool.space/api/v1/ws');
    this.setupWebSocket();
    this.startPeriodicPolling();
  }
  
  // WebSocket for real-time events
  private setupWebSocket(): void {
    this.ws.on('open', () => {
      console.log('✓ WebSocket connected');
      
      // Subscribe to real-time events
      this.ws.send(JSON.stringify({
        action: 'want',
        data: ['blocks', 'stats']
      }));
    });
    
    this.ws.on('message', (data) => {
      const event = JSON.parse(data.toString());
      
      if (event.block) {
        this.handleNewBlock(event.block);
      }
      
      if (event.mempoolInfo) {
        this.handleStatsUpdate(event.mempoolInfo);
      }
    });
    
    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.reconnect();
    });
  }
  
  // REST for periodic data
  private startPeriodicPolling(): void {
    // Check fees every 30 seconds (safe for rate limits)
    setInterval(async () => {
      const fees = await this.getFeeEstimates();
      this.handleFeeUpdate(fees);
    }, 30000);
    
    // Check difficulty adjustment daily
    setInterval(async () => {
      const adjustment = await this.getDifficultyAdjustment();
      this.handleAdjustmentUpdate(adjustment);
    }, 86400000);
  }
  
  private async getFeeEstimates(): Promise<any> {
    const response = await fetch(`${this.restBaseUrl}/fees/recommended`);
    return response.json();
  }
  
  private async getDifficultyAdjustment(): Promise<any> {
    const response = await fetch(`${this.restBaseUrl}/difficulty-adjustment`);
    return response.json();
  }
  
  private handleNewBlock(block: any): void {
    console.log(`New block #${block.height} mined by ${block.extras?.pool?.name}`);
    console.log(`Median fee: ${block.extras?.medianFee} sat/vB`);
  }
  
  private handleStatsUpdate(stats: any): void {
    console.log(`Mempool: ${stats.size} transactions, ${stats.bytes} bytes`);
  }
  
  private handleFeeUpdate(fees: any): void {
    console.log(`Current fees: ${fees.halfHourFee} sat/vB (30 min)`);
  }
  
  private handleAdjustmentUpdate(adjustment: any): void {
    console.log(`Next difficulty adjustment: ${adjustment.difficultyChange}% in ${adjustment.remainingBlocks} blocks`);
  }
  
  private reconnect(): void {
    setTimeout(() => {
      console.log('Reconnecting WebSocket...');
      this.ws = new WebSocket('wss://mempool.space/api/v1/ws');
      this.setupWebSocket();
    }, 5000);
  }
}

// Usage
const monitor = new MempoolMonitor();
```

### Example 2: Transaction Confirmation Tracker

```typescript
class TransactionTracker {
  private ws: WebSocket;
  private trackedTxs = new Map<string, (confirmed: boolean) => void>();
  
  constructor() {
    this.ws = new WebSocket('wss://mempool.space/api/v1/ws');
    
    this.ws.on('open', () => {
      console.log('Transaction tracker ready');
    });
    
    this.ws.on('message', (data) => {
      const event = JSON.parse(data.toString());
      
      if (event.txConfirmed) {
        const txid = event.txConfirmed.txid;
        const callback = this.trackedTxs.get(txid);
        
        if (callback) {
          callback(true);
          this.trackedTxs.delete(txid);
          console.log(`✓ Transaction confirmed: ${txid.slice(0, 8)}...`);
        }
      }
    });
  }
  
  // Track a transaction until confirmed
  trackTransaction(txid: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.trackedTxs.set(txid, resolve);
      
      // Subscribe to this transaction
      this.ws.send(JSON.stringify({
        'track-tx': txid
      }));
      
      console.log(`Tracking transaction: ${txid.slice(0, 8)}...`);
    });
  }
  
  // Usage example
  async waitForConfirmation(txid: string): Promise<void> {
    console.log('Waiting for confirmation...');
    const confirmed = await this.trackTransaction(txid);
    console.log('Transaction confirmed!');
  }
}

// Usage
const tracker = new TransactionTracker();
await tracker.waitForConfirmation('your-txid-here');
```

### Example 3: Address Balance Monitor

```typescript
class AddressMonitor {
  private ws: WebSocket;
  private monitoredAddresses = new Map<string, (tx: any) => void>();
  
  constructor() {
    this.ws = new WebSocket('wss://mempool.space/api/v1/ws');
    
    this.ws.on('message', (data) => {
      const event = JSON.parse(data.toString());
      
      if (event['address-transactions']) {
        for (const tx of event['address-transactions']) {
          const callback = this.monitoredAddresses.get(tx.address);
          if (callback) {
            callback(tx);
          }
        }
      }
    });
  }
  
  monitorAddress(address: string, onTransaction: (tx: any) => void): void {
    this.monitoredAddresses.set(address, onTransaction);
    
    this.ws.send(JSON.stringify({
      'track-address': address
    }));
    
    console.log(`Monitoring address: ${address}`);
  }
  
  stopMonitoring(address: string): void {
    this.monitoredAddresses.delete(address);
    console.log(`Stopped monitoring: ${address}`);
  }
}

// Usage
const monitor = new AddressMonitor();

monitor.monitorAddress('bc1q...', (tx) => {
  console.log('New transaction for address:', tx.txid);
  console.log('Value:', tx.value, 'satoshis');
});
```

---

## Rate Limits & Best Practices

### Rate Limits

**REST API**:
```
Free tier:  10 requests/minute
Paid tier:  100 requests/minute
Enterprise: Custom (contact mempool.space)
```

**WebSocket**:
- No explicit rate limits
- Don't abuse (respect fair use)
- Automatic reconnection recommended

### Best Practices

#### 1. Use WebSocket for Real-Time Data

```typescript
// ✓ Good: WebSocket for blocks
ws.send(JSON.stringify({ action: 'want', data: ['blocks'] }));

// ✗ Bad: Polling for blocks
setInterval(() => fetch('/api/blocks/tip/height'), 1000); // Wastes rate limit
```

#### 2. Batch REST Requests

```typescript
// ✓ Good: Single request for multiple blocks
const blocks = await fetch('/api/v1/blocks'); // Returns ~10 blocks

// ✗ Bad: Individual requests per block
for (let i = 0; i < 10; i++) {
  await fetch(`/api/v1/block/${hashes[i]}`); // 10 requests
}
```

#### 3. Cache Responses

```typescript
const cache = new Map<string, { data: any; expires: number }>();

async function cachedFetch(url: string, cacheDuration = 30000): Promise<any> {
  const cached = cache.get(url);
  
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  
  const response = await fetch(url);
  const data = await response.json();
  
  cache.set(url, {
    data,
    expires: Date.now() + cacheDuration
  });
  
  return data;
}

// Use cached fetch for fee estimates (30s cache)
const fees = await cachedFetch('/api/v1/fees/recommended', 30000);
```

#### 4. Implement Exponential Backoff

```typescript
async function fetchWithRetry(
  url: string, 
  maxRetries = 3,
  baseDelay = 1000
): Promise<any> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      
      if (response.status === 429) { // Rate limited
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Rate limited, waiting ${delay}ms...`);
        await sleep(delay);
        continue;
      }
      
      return await response.json();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      
      const delay = baseDelay * Math.pow(2, attempt);
      await sleep(delay);
    }
  }
  
  throw new Error('Max retries exceeded');
}
```

#### 5. Monitor Your Rate Limit Usage

```typescript
class RateLimitTracker {
  private requests: number[] = [];
  private windowMs = 60000; // 1 minute
  private limit = 10; // Free tier
  
  canMakeRequest(): boolean {
    const now = Date.now();
    
    // Remove old requests outside window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    return this.requests.length < this.limit;
  }
  
  recordRequest(): void {
    this.requests.push(Date.now());
  }
  
  getRemainingRequests(): number {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    return Math.max(0, this.limit - this.requests.length);
  }
}

// Usage
const tracker = new RateLimitTracker();

if (tracker.canMakeRequest()) {
  await fetch('/api/v1/fees/recommended');
  tracker.recordRequest();
} else {
  console.log('Rate limit reached, waiting...');
  await sleep(60000);
}
```

---

## Error Handling

### Common HTTP Status Codes

- **200 OK**: Success
- **400 Bad Request**: Invalid parameters
- **404 Not Found**: Resource doesn't exist
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server issue
- **503 Service Unavailable**: Maintenance or overload

### Error Response Format

```json
{
  "error": "Rate limit exceeded",
  "details": "You have exceeded 10 requests per minute",
  "retryAfter": 45
}
```

### Robust Error Handling Example

```typescript
class MempoolAPIClient {
  private baseUrl = 'https://mempool.space/api/v1';
  
  async get<T>(endpoint: string): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`);
      
      if (!response.ok) {
        await this.handleError(response);
      }
      
      return await response.json();
    } catch (error) {
      if (error instanceof NetworkError) {
        // Network issues - retry
        await sleep(5000);
        return this.get(endpoint);
      }
      
      throw error;
    }
  }
  
  private async handleError(response: Response): Promise<never> {
    const status = response.status;
    
    switch (status) {
      case 400:
        throw new Error('Invalid request parameters');
        
      case 404:
        throw new Error('Resource not found');
        
      case 429:
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
        console.log(`Rate limited, waiting ${retryAfter}s...`);
        await sleep(retryAfter * 1000);
        throw new Error('Rate limit exceeded - retry');
        
      case 500:
      case 503:
        console.log('Server error, retrying in 10s...');
        await sleep(10000);
        throw new Error('Server error - retry');
        
      default:
        throw new Error(`HTTP ${status}: ${response.statusText}`);
    }
  }
}
```

---

## Summary: Quick Reference

### When to Use REST

- Historical data
- One-time lookups
- Periodic checks (>30s)
- Batch processing
- Rate limit: 10 req/min

### When to Use WebSocket

- New block notifications
- Transaction confirmations
- Live mempool monitoring
- Address activity tracking
- No rate limits (fair use)

### Key Endpoints (Most Useful)

```
GET /api/v1/fees/recommended          → Fee estimates
GET /api/v1/difficulty-adjustment     → Next adjustment
GET /api/v1/blocks                    → Recent blocks
GET /api/v1/tx/:txid                  → Transaction details
GET /api/v1/address/:address          → Address info
GET /api/v1/mining/pools/:timespan    → Mining pools
GET /api/v1/lightning/statistics      → Lightning stats

WebSocket: wss://mempool.space/api/v1/ws
Subscribe to: ['blocks', 'stats', 'mempool-blocks']
```

---

**Document Status**: Complete API Reference  
**Last Updated**: December 5, 2025  
**Official Docs**: https://mempool.space/docs/api  
**Next Review**: When API version changes  

📡✨
