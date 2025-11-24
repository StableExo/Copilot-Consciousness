# Autonomous Pool Discovery Architecture Plan

## 🎯 Goal
Transform TheWarden from static token/pool configuration to dynamic discovery of top liquidity pools across all chains using external data sources like CoinMarketCap, DeFiLlama, The Graph, etc.

## 📋 Current State Analysis

### What Works
- ✅ Pool preloading system successfully caches pool data
- ✅ Multi-chain scanning infrastructure exists
- ✅ DEX registry with protocol support
- ✅ 100% cache hit rate for preloaded pools

### What's Limited
- ❌ Manual token configuration in `configs/tokens/addresses.json`
- ❌ Fixed token lists per chain (9 on Base, 4 on Ethereum, etc.)
- ❌ No automatic discovery of new high-liquidity tokens
- ❌ Missing tokens = missing arbitrage opportunities
- ❌ Requires code changes to add new tokens

## 🏗️ Proposed Architecture

### Phase 1: Liquidity Data Aggregation Layer

**New Component: `LiquidityDataAggregator`**

```typescript
// src/discovery/LiquidityDataAggregator.ts
interface LiquiditySource {
  name: string;
  fetchTopPools(chainId: number, limit: number): Promise<PoolInfo[]>;
  fetchTopTokens(chainId: number, limit: number): Promise<TokenInfo[]>;
}

class LiquidityDataAggregator {
  private sources: LiquiditySource[];
  
  // Aggregate data from multiple sources
  async getTopTokensByLiquidity(chainId: number, limit: number): Promise<TokenInfo[]>
  async getTopPoolsByVolume(chainId: number, limit: number): Promise<PoolInfo[]>
  
  // Merge and rank results
  private mergeResults(sources: PoolInfo[][]): PoolInfo[]
}
```

**Supported Data Sources:**

1. **DeFiLlama API** (Primary - Free, comprehensive)
   - Endpoint: `https://api.llama.fi/pools`
   - Provides: TVL, volume, APY for all pools across chains
   - No API key required
   - Best for: Pool discovery and ranking

2. **The Graph Protocol** (Backup - Decentralized)
   - Subgraphs for Uniswap V2/V3, SushiSwap, Curve, etc.
   - Provides: Real-time pool data, reserves, volumes
   - More work to integrate but highly reliable

3. **CoinGecko API** (Token metadata)
   - Free tier: 50 calls/minute
   - Provides: Token info, market cap, trading volume
   - Best for: Token discovery and validation

4. **DEX Aggregator APIs** (Optional)
   - 1inch, 0x, Paraswap
   - Provides: Current best rates, available liquidity

### Phase 2: Dynamic Token Discovery

**New Component: `TokenDiscoveryService`**

```typescript
// src/discovery/TokenDiscoveryService.ts
class TokenDiscoveryService {
  private aggregator: LiquidityDataAggregator;
  private cache: TokenCache;
  
  // Discover top tokens by multiple criteria
  async discoverTopTokens(chainId: number, config: DiscoveryConfig): Promise<Token[]> {
    const criteria = {
      minLiquidity: config.minLiquidity || 1_000_000, // $1M minimum
      minVolume24h: config.minVolume24h || 500_000,    // $500k/day minimum
      maxTokens: config.maxTokens || 50,               // Top 50 tokens
      includeStablecoins: true,
      includeNativeToken: true
    };
    
    // Fetch from multiple sources
    const tokens = await this.aggregator.getTopTokensByLiquidity(chainId, criteria.maxTokens);
    
    // Filter and rank
    return this.filterAndRankTokens(tokens, criteria);
  }
  
  // Validate token is tradeable and not malicious
  private async validateToken(token: Token): Promise<boolean>
  
  // Cache results with TTL
  private async cacheTokenList(chainId: number, tokens: Token[]): Promise<void>
}
```

**Configuration:**

```typescript
// src/config/discovery.config.ts
export const discoveryConfig = {
  // How often to refresh token list (default: 1 hour)
  refreshInterval: 3600000,
  
  // Minimum criteria for token inclusion
  minLiquidity: 1_000_000, // $1M TVL
  minVolume24h: 500_000,   // $500k daily volume
  minPoolCount: 3,         // Available on at least 3 DEXes
  
  // Maximum tokens to scan per chain
  maxTokensPerChain: 50,
  
  // Chains to enable auto-discovery
  enabledChains: [1, 8453, 42161, 10, 137],
  
  // Fallback to manual config if discovery fails
  fallbackToManualConfig: true
};
```

### Phase 3: Intelligent Pool Scanner

**Enhanced Component: `IntelligentPoolScanner`**

```typescript
// src/discovery/IntelligentPoolScanner.ts
class IntelligentPoolScanner {
  // Discover pools based on actual liquidity, not just token pairs
  async scanTopPools(chainId: number): Promise<PoolEdge[]> {
    // 1. Get top pools by TVL from DeFiLlama
    const topPools = await this.aggregator.getTopPoolsByVolume(chainId, 200);
    
    // 2. Filter to supported DEX protocols
    const supportedPools = topPools.filter(p => this.isSupportedProtocol(p.protocol));
    
    // 3. Fetch on-chain data for each pool
    const poolEdges = await this.fetchPoolDetails(supportedPools);
    
    // 4. Cache for fast access
    await this.poolDataStore.saveToDisk(chainId, poolEdges);
    
    return poolEdges;
  }
  
  // Only scan pools that have recent activity
  private async filterByActivity(pools: PoolInfo[]): Promise<PoolInfo[]> {
    return pools.filter(p => 
      p.volume24h > 10000 && // $10k minimum daily volume
      p.lastUpdated > Date.now() - 86400000 // Active in last 24h
    );
  }
}
```

### Phase 4: Separation of Concerns

**Clear Separation: Discovery vs Execution**

```
┌─────────────────────────────────────────────────────────┐
│                   DISCOVERY LAYER                        │
│  (Autonomous, frequent updates, external data sources)   │
├─────────────────────────────────────────────────────────┤
│ • LiquidityDataAggregator  (DeFiLlama, CoinGecko, etc.) │
│ • TokenDiscoveryService    (Find top tokens)            │
│ • IntelligentPoolScanner   (Find top pools)             │
│ • DiscoveryCache          (1-hour TTL)                  │
└─────────────────────────────────────────────────────────┘
                            ↓
                   (Provides pool/token data)
                            ↓
┌─────────────────────────────────────────────────────────┐
│                   EXECUTION LAYER                        │
│     (Uses discovered data, focuses on arbitrage)         │
├─────────────────────────────────────────────────────────┤
│ • AdvancedOrchestrator    (Find opportunities)          │
│ • ArbitrageConsciousness  (Evaluate opportunities)      │
│ • IntegratedOrchestrator  (Execute trades)              │
│ • Risk Management         (Safety checks)               │
└─────────────────────────────────────────────────────────┘
```

## 📁 New File Structure

```
src/
├── discovery/
│   ├── LiquidityDataAggregator.ts      # Main aggregator
│   ├── sources/
│   │   ├── DeFiLlamaSource.ts          # DeFiLlama integration
│   │   ├── TheGraphSource.ts           # The Graph integration
│   │   ├── CoinGeckoSource.ts          # CoinGecko integration
│   │   └── LiquiditySource.ts          # Interface
│   ├── TokenDiscoveryService.ts        # Token discovery
│   ├── IntelligentPoolScanner.ts       # Pool scanning
│   ├── DiscoveryCache.ts               # Caching layer
│   └── validators/
│       ├── TokenValidator.ts            # Validate tokens
│       └── PoolValidator.ts             # Validate pools
├── config/
│   └── discovery.config.ts             # Discovery configuration
└── scripts/
    └── discover-pools.ts               # CLI tool for testing
```

## 🔄 Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create `LiquidityDataAggregator` interface
- [ ] Implement `DeFiLlamaSource` (primary source)
- [ ] Add `DiscoveryCache` for caching results
- [ ] Create configuration file
- [ ] Write unit tests for aggregator

### Phase 2: Token Discovery (Week 2)
- [ ] Implement `TokenDiscoveryService`
- [ ] Add token validation logic
- [ ] Create token ranking algorithm
- [ ] Update `getScanTokens()` to use discovered tokens
- [ ] Add fallback to manual config
- [ ] Write integration tests

### Phase 3: Pool Discovery (Week 3)
- [ ] Implement `IntelligentPoolScanner`
- [ ] Integrate with existing `PoolDataStore`
- [ ] Update `MultiHopDataFetcher` to use discovered pools
- [ ] Add pool activity filters
- [ ] Write end-to-end tests

### Phase 4: Integration & Optimization (Week 4)
- [ ] Integrate discovery layer with `AdvancedOrchestrator`
- [ ] Add monitoring and alerting
- [ ] Optimize caching strategies
- [ ] Add failover between data sources
- [ ] Performance testing
- [ ] Documentation

## 🎚️ Configuration Options

### Environment Variables

```bash
# Discovery settings
DISCOVERY_ENABLED=true
DISCOVERY_REFRESH_INTERVAL=3600000  # 1 hour
DISCOVERY_MIN_LIQUIDITY=1000000     # $1M minimum
DISCOVERY_MIN_VOLUME=500000         # $500k minimum
DISCOVERY_MAX_TOKENS_PER_CHAIN=50

# Data source API keys (optional)
DEFILLAMA_API_KEY=optional          # DeFiLlama doesn't require key
COINGECKO_API_KEY=optional          # Free tier available
THEGRAPH_API_KEY=optional           # Decentralized, optional

# Fallback behavior
DISCOVERY_FALLBACK_TO_MANUAL=true
DISCOVERY_CACHE_DIR=.discovery-cache
```

## 📊 Expected Benefits

### Immediate Benefits
1. **More Opportunities**: Discover 3-5x more arbitrage paths by including all high-liquidity tokens
2. **Auto-Adaptation**: System automatically adapts to market changes
3. **Reduced Maintenance**: No manual token list updates needed
4. **Better Coverage**: Find opportunities across all major tokens, not just 4-9 hardcoded ones

### Long-term Benefits
1. **Market Intelligence**: Learn which tokens/pools are most profitable
2. **Competitive Edge**: Discover new tokens before competitors
3. **Risk Reduction**: Avoid low-liquidity tokens that could be scams
4. **Scalability**: Easy to add new chains with automatic discovery

## 🔒 Safety Considerations

### Token Validation
- Check token contract for standard ERC-20 compliance
- Verify token has sufficient liquidity (>$1M)
- Check for honeypot/rugpull indicators
- Validate token age (>30 days old)
- Cross-reference with trusted sources

### Pool Validation
- Verify pool address matches factory calculation
- Check pool has recent activity (<24h)
- Validate reserves are reasonable
- Ensure pool is from known DEX protocols

### Rate Limiting
- Respect API rate limits (50 calls/min for CoinGecko)
- Implement exponential backoff
- Use caching aggressively
- Batch requests when possible

## 📈 Metrics to Track

```typescript
interface DiscoveryMetrics {
  tokensDiscovered: number;
  poolsDiscovered: number;
  cacheHitRate: number;
  apiCallCount: number;
  discoveryErrors: number;
  opportunitiesFromDiscoveredPools: number;
  profitFromDiscoveredPools: bigint;
}
```

## 🧪 Testing Strategy

### Unit Tests
- Test each liquidity source independently
- Mock API responses
- Test ranking algorithms
- Test validation logic

### Integration Tests
- Test full discovery pipeline
- Test cache behavior
- Test fallback mechanisms
- Test with real APIs (limited)

### End-to-End Tests
- Run full discovery → scan → arbitrage flow
- Verify discovered tokens work with existing orchestrator
- Test on testnet chains

## 🚀 Migration Plan

### Backward Compatibility
1. Keep existing manual token configuration as fallback
2. Add feature flag: `DISCOVERY_ENABLED=true/false`
3. Gradual rollout: Enable on one chain at a time
4. Monitor metrics closely

### Rollout Strategy
1. **Week 1**: Deploy discovery on testnet (Base Sepolia)
2. **Week 2**: Enable on single mainnet chain (Base) with feature flag
3. **Week 3**: Expand to Ethereum mainnet
4. **Week 4**: Full rollout to all chains

## 📝 Documentation Needs

- [ ] Architecture overview document
- [ ] API integration guide for each source
- [ ] Configuration reference
- [ ] Troubleshooting guide
- [ ] Performance tuning guide
- [ ] Security best practices

## 🎯 Success Criteria

- ✅ Discovers 40+ tokens per chain (vs current 4-9)
- ✅ Finds 500+ pools per chain (vs current unknown)
- ✅ Discovery completes in <2 minutes
- ✅ Cache hit rate >95%
- ✅ API costs <$10/month
- ✅ Zero false positives (scam tokens)
- ✅ Increases arbitrage opportunities by 3x

---

## 🏁 Quick Start Implementation

To get started immediately with minimal changes:

```bash
# Install new dependencies
npm install axios node-cache

# Create discovery directory
mkdir -p src/discovery/sources

# Start with DeFiLlama (easiest, no API key needed)
# Implement DeFiLlamaSource first

# Update preload script to use discovery
npm run discover:pools
npm run preload:pools
```

This plan provides a clear path from the current static configuration to a fully autonomous, market-aware pool discovery system.
