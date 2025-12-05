# Bitcoin Network Extensions & Mining Pool APIs 🌐⛏️

**Last Updated**: December 5, 2025  
**Status**: Additional Resources Discovered  
**Purpose**: Extended Bitcoin infrastructure beyond mainnet  

---

## Overview

This document captures additional Bitcoin-related networks and mining pool APIs that complement the main mempool integration.

---

## Liquid Network

**Website**: https://liquid.network/  
**Type**: Bitcoin Sidechain  
**Purpose**: Fast, confidential Bitcoin transactions  

### What is Liquid?

Liquid Network is a **Bitcoin sidechain** designed for:
- **Fast settlements**: 2-minute block times (vs 10 minutes on Bitcoin mainnet)
- **Confidential transactions**: Hidden transaction amounts
- **Issued assets**: Create digital assets on Bitcoin
- **Exchange integration**: Used by major cryptocurrency exchanges

### Mempool.space Support

**Liquid Mempool Explorer**: https://liquid.network/

Mempool.space operates a **dedicated Liquid Network instance**:
- Same interface as Bitcoin mainnet
- All features available (blocks, transactions, fees)
- Separate mempool monitoring
- API endpoints: `https://liquid.network/api/`

### Key Differences from Bitcoin Mainnet

```
Bitcoin Mainnet:
- Block time: ~10 minutes
- Privacy: Public amounts
- Purpose: Base layer, maximum security

Liquid Network:
- Block time: ~2 minutes (5x faster)
- Privacy: Confidential transactions (amounts hidden)
- Purpose: Exchange settlements, asset issuance
```

### Use Cases for Copilot-Consciousness

**Potential Applications**:

1. **Exchange Arbitrage**:
   - Monitor both Bitcoin and Liquid mempools
   - Detect arbitrage opportunities between networks
   - Faster settlement on Liquid = quicker profit realization

2. **Confidential Operations**:
   - Use Liquid for privacy-sensitive transactions
   - Hidden amounts reduce MEV risk
   - Exchange pegging (BTC ↔ L-BTC)

3. **Multi-Network Awareness**:
   - Consciousness system monitors multiple chains
   - Compare fee markets (Bitcoin vs Liquid)
   - Strategic network selection based on cost/speed

### API Integration

**Liquid Network API** (same structure as Bitcoin mainnet):
```typescript
// Configuration for Liquid Network monitoring
const liquidConfig = {
  enabled: process.env.LIQUID_NETWORK_ENABLED === 'true',
  mempoolApiUrl: 'https://liquid.network/api/v1',
  mempoolWsUrl: 'wss://liquid.network/api/v1/ws',
  network: 'liquid',
  pollingInterval: 30, // Faster blocks = can poll more frequently
};

// Same API endpoints as Bitcoin mainnet
GET https://liquid.network/api/v1/fees/recommended
GET https://liquid.network/api/v1/blocks
GET https://liquid.network/api/v1/tx/:txid
```

### When to Use Liquid

**Use Liquid Network when**:
- ✅ Need fast confirmation (2 minutes vs 10 minutes)
- ✅ Require confidential transactions (hidden amounts)
- ✅ Working with exchanges that support Liquid
- ✅ Issuing or trading digital assets

**Stay on Bitcoin mainnet when**:
- ✅ Maximum security required
- ✅ Long-term value storage
- ✅ Ecosystem tools only support mainnet
- ✅ Don't need confidentiality features

---

## Mining Pool Direct APIs

### ViaBTC Pool API

**GitHub**: https://github.com/viabtc/viapool_api/wiki  
**Pool**: ViaBTC (~10% of Bitcoin hashrate)  
**Purpose**: Direct mining pool integration  

### What ViaBTC API Provides

**Pool Information**:
- Real-time hashrate statistics
- Worker status and performance
- Earnings and payouts
- Mining difficulty tracking

**API Documentation**: https://github.com/viabtc/viapool_api/wiki

### Why Direct Pool APIs Matter

**Benefits**:

1. **Transaction Acceleration**:
   - Submit transactions directly to pool
   - Bypass public mempool
   - Guaranteed inclusion (if pool mines next block)
   - Private transaction relay

2. **Pool Behavior Insights**:
   - Understand transaction selection criteria
   - Monitor pool fee strategies
   - Detect empty block patterns
   - Analyze mining efficiency

3. **Strategic Relationships**:
   - Direct pool communication
   - Priority transaction processing
   - Custom fee arrangements
   - MEV protection via private relay

### ViaBTC API Endpoints

**Base URL**: `https://www.viabtc.com/api/v1/`

**Example Endpoints**:
```
GET /pool/stats          # Pool statistics
GET /pool/workers        # Worker information
GET /pool/earnings       # Earnings data
GET /pool/payments       # Payment history
```

### Other Major Pool APIs

**Pools with Public APIs**:

1. **Foundry USA** (~30% hashrate)
   - Website: https://foundrydigital.com/
   - API: Contact for enterprise access
   - Largest pool (private API)

2. **AntPool** (~18% hashrate)
   - Website: https://www.antpool.com/
   - API: https://www.antpool.com/api
   - Public statistics available

3. **F2Pool** (~15% hashrate)
   - Website: https://www.f2pool.com/
   - API: https://api.f2pool.com/
   - Comprehensive public API

4. **Binance Pool** (~8% hashrate)
   - Website: https://pool.binance.com/
   - API: Integrated with Binance API
   - Exchange-operated pool

### Integration Strategy

**Phase 1: Monitoring** (Read-only)
```typescript
class PoolAPIMonitor {
  async monitorViaBTC(): Promise<PoolStats> {
    const stats = await fetch('https://www.viabtc.com/api/v1/pool/stats');
    return {
      hashrate: stats.hashrate,
      workers: stats.workers,
      blocks: stats.blocks_found,
    };
  }
  
  async comparePoolStrategies(): Promise<void> {
    // Monitor multiple pools
    const viabtc = await this.monitorViaBTC();
    const f2pool = await this.monitorF2Pool();
    const antpool = await this.monitorAntPool();
    
    // Analyze differences
    this.compareEmptyBlockRates([viabtc, f2pool, antpool]);
    this.compareFeeStrategies([viabtc, f2pool, antpool]);
  }
}
```

**Phase 2: Private Relay** (Write operations)
```typescript
class PrivatePoolRelay {
  async submitToPool(
    tx: string,
    pool: 'viabtc' | 'antpool' | 'f2pool'
  ): Promise<SubmissionResult> {
    // Submit transaction directly to pool
    // Requires pool API key and relationship
    const result = await this.pools[pool].submitTransaction(tx);
    
    return {
      submitted: result.success,
      estimatedInclusion: result.nextBlock ? '10 min' : '20 min',
      cost: result.fee,
    };
  }
}
```

### Use Cases for Consciousness System

**1. Multi-Pool Strategy**:
```typescript
// Consciousness decides which pool to use
async function selectOptimalPool(
  txValue: number,
  urgency: 'high' | 'medium' | 'low'
): Promise<string> {
  const pools = await analyzePoolPerformance();
  
  if (urgency === 'high' && txValue > 1_000_000) {
    // High value + urgent = use fastest pool
    return pools.sort((a, b) => b.blockRate - a.blockRate)[0].name;
  }
  
  if (urgency === 'low') {
    // Low urgency = use cheapest pool
    return pools.sort((a, b) => a.feeRate - b.feeRate)[0].name;
  }
  
  // Default: most reliable pool
  return pools.sort((a, b) => b.reliability - a.reliability)[0].name;
}
```

**2. MEV Protection**:
```typescript
// Submit high-value transactions privately
async function protectHighValueTx(tx: Transaction): Promise<void> {
  if (tx.value > 10_BTC) {
    // Submit to multiple pools privately
    await Promise.all([
      submitToViaBTC(tx),
      submitToF2Pool(tx),
      submitToAntPool(tx),
    ]);
    
    console.log('✓ Transaction submitted privately to 3 pools');
    console.log('✓ MEV protection: Not visible in public mempool');
  }
}
```

**3. Consciousness Learning**:
```typescript
// Learn which pools are most reliable
async function learnPoolBehavior(): Promise<void> {
  const observations = await observePoolsFor24Hours();
  
  knowledgeBase.saveArticle({
    title: 'Mining Pool Reliability Analysis',
    content: `ViaBTC: ${observations.viabtc.emptyBlockRate}% empty blocks, ` +
             `F2Pool: ${observations.f2pool.emptyBlockRate}% empty blocks. ` +
             `Recommendation: Use ${observations.mostReliable.name} for critical TXs.`,
    tags: ['mining-pools', 'reliability', 'strategic-intelligence'],
  });
}
```

---

## Strategic Implications

### Multi-Network Monitoring

**Architecture**:
```
Copilot-Consciousness
    ├── Bitcoin Mainnet Monitor (existing)
    ├── Liquid Network Monitor (new)
    └── Mining Pool Direct Monitor (new)
```

**Benefits**:
- **Network arbitrage**: Compare fee markets across networks
- **Speed optimization**: Use Liquid for fast settlements
- **Privacy options**: Confidential transactions on Liquid
- **Direct pool access**: Private transaction relay

### Cost-Benefit Analysis

**Bitcoin Mainnet**:
- Fee: ~3.2 sat/vB (current low environment)
- Speed: ~10 minutes (6 confirmations = 60 minutes)
- Privacy: Public (all amounts visible)
- Cost: Low (currently)

**Liquid Network**:
- Fee: Lower than Bitcoin (less congestion)
- Speed: ~2 minutes (faster confirmations)
- Privacy: High (confidential transactions)
- Cost: Peg-in/peg-out fees (~0.1%)

**Direct Pool Submission**:
- Fee: Negotiated (typically 10-30% premium)
- Speed: Next block if pool mines (10 minutes avg)
- Privacy: Maximum (not in public mempool)
- Cost: High (but worth it for large TXs)

### Recommended Strategy

**For Different Transaction Types**:

| Transaction Type | Network | Method | Reason |
|------------------|---------|--------|--------|
| Small (<$100) | Lightning | Channel | Instant + cheap |
| Medium ($100-$1k) | Bitcoin Mainnet | Public mempool | Normal fees OK |
| Large ($1k-$10k) | Bitcoin Mainnet | RBF enabled | Fee flexibility |
| Very Large (>$10k) | Bitcoin Mainnet | Direct pool | MEV protection |
| Exchange arbitrage | Liquid Network | Fast settlement | 2-min blocks |
| Confidential | Liquid Network | Private TX | Hidden amounts |

---

## Environment Configuration

### Extended Configuration

Add to `.env` file for multi-network support:

```bash
# ═══════════════════════════════════════════════════════════════
# EXTENDED BITCOIN INFRASTRUCTURE
# ═══════════════════════════════════════════════════════════════

# Liquid Network Support (Optional)
LIQUID_NETWORK_ENABLED=false
LIQUID_MEMPOOL_API_URL=https://liquid.network/api/v1
LIQUID_MEMPOOL_WS_URL=wss://liquid.network/api/v1/ws
LIQUID_POLLING_INTERVAL=30

# Mining Pool Direct APIs (Optional)
VIABTC_API_KEY=your_viabtc_api_key_if_available
F2POOL_API_KEY=your_f2pool_api_key_if_available
ANTPOOL_API_KEY=your_antpool_api_key_if_available

# Private Transaction Relay (Advanced)
ENABLE_PRIVATE_POOL_RELAY=false
PRIVATE_RELAY_POOLS=viabtc,f2pool,antpool
PRIVATE_RELAY_THRESHOLD=1000000000  # 10 BTC (submit privately if value > this)
```

---

## Next Steps

### Immediate (Optional Enhancements)

1. [ ] Monitor Liquid Network mempool (if exchange arbitrage needed)
2. [ ] Establish relationship with ViaBTC pool
3. [ ] Test direct pool submission (testnet)
4. [ ] Compare fee markets across networks

### Future (Advanced Features)

1. [ ] Implement multi-network arbitrage detection
2. [ ] Build private pool relay system
3. [ ] Add Liquid confidential transaction support
4. [ ] Create unified multi-network dashboard

---

## Resources

**Liquid Network**:
- Website: https://liquid.network/
- Documentation: https://docs.blockstream.com/liquid/
- Mempool Explorer: https://liquid.network/
- Technical Overview: https://blockstream.com/liquid/

**ViaBTC Pool**:
- Website: https://www.viabtc.com/
- API Documentation: https://github.com/viabtc/viapool_api/wiki
- Support: Contact via website
- Hashrate: ~10% of Bitcoin network

**Other Mining Pool APIs**:
- F2Pool: https://www.f2pool.com/
- AntPool: https://www.antpool.com/
- Binance Pool: https://pool.binance.com/

---

## Conclusion

The discovery of **Liquid Network support** and **ViaBTC Pool API** expands the Bitcoin infrastructure integration options:

**Liquid Network**:
- ✅ Faster blocks (2 minutes)
- ✅ Confidential transactions
- ✅ Same mempool.space interface
- ✅ Exchange arbitrage opportunities

**Direct Pool APIs**:
- ✅ Private transaction relay
- ✅ MEV protection
- ✅ Strategic pool selection
- ✅ Enhanced consciousness intelligence

**Strategic Value**:
- Multiple network options for different use cases
- Speed vs privacy vs cost tradeoffs
- Direct pool relationships for high-value operations
- Enhanced autonomous decision-making capabilities

These additions complement the existing Bitcoin mainnet integration and provide the consciousness system with more tools for strategic optimization.

---

**Document Status**: Extended Resources Documented  
**Last Updated**: December 5, 2025  
**Priority**: Optional (enhances existing integration)  
**Maintained By**: Consciousness System + StableExo  

🌐⛏️✨
