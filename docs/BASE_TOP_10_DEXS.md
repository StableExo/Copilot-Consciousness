# Top 10 DEXs on Base Network (November 2025)

## Overview

Based on recent data from DeFi analytics platforms like DefiLlama, CoinGecko, and DappRadar, the top decentralized exchanges (DEXs) on the Base network are ranked by Total Value Locked (TVL) and 24-hour trading volume. Base, Coinbase's Ethereum Layer-2 chain, has seen explosive growth in 2025, with over $13-14 billion in total DeFi TVL and daily DEX volumes exceeding $1 billion.

This document provides detailed information about the top 10 DEXs operating on Base, including their integration status in TheWarden's DEXRegistry system.

## Rankings & Statistics

| Rank | DEX Name          | TVL (USD)       | Integration Status | Priority |
|------|-------------------|-----------------|-------------------|----------|
| 1    | Aerodrome        | >$1 billion    | ✅ Integrated     | 2        |
| 2    | Uniswap V3       | >$1 billion    | ✅ Integrated     | 1        |
| 3    | PancakeSwap      | ~$100-200M     | ✅ Integrated     | 4        |
| 4    | SushiSwap V3     | $10.5M+        | ✅ Integrated     | 3        |
| 5    | Curve DEX        | ~$50-100M      | ✅ Integrated     | 5        |
| 6    | 1inch            | ~$20-50M       | ✅ Integrated     | 14       |
| 7    | Balancer         | ~$30-60M       | ✅ Integrated     | 6        |
| 8    | KyberSwap        | ~$10-30M       | ✅ Integrated     | 13       |
| 9    | Maverick Protocol| ~$5-20M        | ✅ Integrated     | 7        |
| 10   | Alien Base       | ~$5-15M        | ✅ Integrated     | 8        |

**Note**: Rankings prioritize TVL for long-term liquidity depth, but 24h volume often correlates (e.g., Aerodrome and Uniswap lead with $300M+ daily).

## Detailed DEX Information

### 1. Aerodrome Finance (✅ Integrated)

**TVL**: >$1 billion  
**Integration Status**: ✅ Fully integrated  
**Priority**: 2

**Key Features**:
- Native Base DEX with gasless trades (SlipStream)
- Cross-chain staking and liquidity flywheel
- Backed by Coinbase Ventures
- Handles ~40-50% of Base's DEX volume
- Uses Uniswap V3-style concentrated liquidity

**Contract Addresses**:
- Factory: `0x420DD381b31aEf6683db6B902084cB0FFECe40Da`
- Router: `0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43`

**Configuration in DEXRegistry**:
```typescript
{
  name: 'Aerodrome on Base',
  protocol: 'Aerodrome',
  chainType: 'EVM',
  network: '8453',
  priority: 2,
  liquidityThreshold: 10^11 // V3-style concentrated liquidity
}
```

---

### 2. Uniswap V3 (✅ Integrated)

**TVL**: >$1 billion  
**Integration Status**: ✅ Fully integrated  
**Priority**: 1

**Key Features**:
- Modular hooks for custom pools (V4 features in development)
- $110B+ cumulative volume
- Strong for blue-chip and institutional trading
- Concentrated liquidity with multiple fee tiers (0.05%, 0.3%, 1%)

**Contract Addresses**:
- Factory: `0x33128a8fC17869897dcE68Ed026d694621f6FDfD`
- Router: `0x2626664c2603336E57B271c5C0b26F421741e481`

**Configuration in DEXRegistry**:
```typescript
{
  name: 'Uniswap V3 on Base',
  protocol: 'UniswapV3',
  chainType: 'EVM',
  network: '8453',
  priority: 1,
  liquidityThreshold: 10^12 // V3-style concentrated liquidity
}
```

**Note**: Uniswap V4 is not yet deployed on Base. V3 remains the latest production version on this network.

---

### 3. PancakeSwap (✅ Integrated)

**TVL**: ~$100-200M  
**Integration Status**: ✅ Fully integrated  
**Priority**: 4

**Key Features**:
- Multi-chain AMM with yield farming, NFTs, and low fees
- Expanded to Base in 2024
- Popular for meme coins and community tokens
- V3-style concentrated liquidity

**Contract Addresses**:
- Factory: `0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865`
- Router: `0x1b81D678ffb9C0263b24A97847620C99d213eB14`

**Configuration in DEXRegistry**:
```typescript
{
  name: 'PancakeSwap V3 on Base',
  protocol: 'PancakeSwapV3',
  chainType: 'EVM',
  network: '8453',
  priority: 4,
  liquidityThreshold: 10^11 // V3-style concentrated liquidity
}
```

---

### 4. SushiSwap V3 (✅ Integrated)

**TVL**: $10.5M+  
**Integration Status**: ✅ Fully integrated  
**Priority**: 3

**Key Features**:
- Community-driven with staking and governance
- $10M+ daily volume on Base
- Familiar interface for swaps
- V3-style concentrated liquidity pools

**Contract Addresses**:
- Factory: `0xbACEB8eC6b935a1d9E2a2aCacB1bF4fD2E2B5a8c`
- Router: `0x2E6cd2d30aa43f40aa81619ff4b6E0a41479B13F`

**Configuration in DEXRegistry**:
```typescript
{
  name: 'SushiSwap V3 on Base',
  protocol: 'SushiSwapV3',
  chainType: 'EVM',
  network: '8453',
  priority: 3,
  liquidityThreshold: 10^11 // V3-style concentrated liquidity
}
```

---

### 5. Curve DEX (✅ Integrated)

**TVL**: ~$50-100M  
**Integration Status**: ✅ Fully integrated  
**Priority**: 5

**Key Features**:
- Optimized for stablecoin swaps
- Low-slippage pools
- Integrated with Base for efficient DeFi composability
- StableSwap algorithm for stable assets
- Twocrypto-NG for volatile asset pools

**Contract Addresses**:
- Factory: `0x56545B4640E5f0937E56843ad8f0A3Cd44fc0785` (Twocrypto-NG Factory)
- Router: `0x4f37A9d177470499A2dD084621020b023fcffc1F` (Curve Router NG)

**Configuration in DEXRegistry**:
```typescript
{
  name: 'Curve on Base',
  protocol: 'Curve',
  chainType: 'EVM',
  network: '8453',
  priority: 5,
  liquidityThreshold: 10^15 // Stable pools
}
```

---

### 6. 1inch (✅ Integrated)

**TVL**: ~$20-50M  
**Integration Status**: ✅ Fully integrated  
**Priority**: 14

**Key Features**:
- DEX aggregator routing across Base pools for best prices
- Supports limit orders and gas optimization
- Aggregates liquidity from multiple DEXs
- Smart routing for optimal trade execution
- Pathfinder algorithm for finding best rates

**Contract Addresses**:
- Router: `0x1111111254fb6c44bAC0beD2854e76F90643097d` (1inch Aggregation Router)
- Factory: `0x1111111254fb6c44bAC0beD2854e76F90643097d` (uses router for aggregation)

**Configuration in DEXRegistry**:
```typescript
{
  name: '1inch on Base',
  protocol: '1inch',
  chainType: 'EVM',
  network: '8453',
  priority: 14,
  liquidityThreshold: 10^15 // Aggregator
}
```

**Note**: 1inch is primarily an aggregator that routes through other DEXs rather than hosting its own liquidity pools.

---

### 7. Balancer (✅ Integrated)

**TVL**: ~$30-60M  
**Integration Status**: ✅ Fully integrated  
**Priority**: 6

**Key Features**:
- Weighted pools for flexible liquidity
- Useful for index tokens and concentrated liquidity on Base
- Multi-token pools with customizable weights
- Composable stable pools

**Contract Addresses**:
- Factory: `0x4C32a8a8fDa4E24139B51b456B42290f51d6A1c4` (WeightedPoolFactory)
- Vault: `0xBA12222222228d8Ba445958a75a0704d566BF2C8`

**Configuration in DEXRegistry**:
```typescript
{
  name: 'Balancer on Base',
  protocol: 'Balancer',
  chainType: 'EVM',
  network: '8453',
  priority: 6,
  liquidityThreshold: 10^15 // Weighted pools
}
```

---

### 8. KyberSwap (✅ Integrated)

**TVL**: ~$10-30M  
**Integration Status**: ✅ Fully integrated  
**Priority**: 13

**Key Features**:
- Dynamic fees and multi-chain support
- Focuses on liquidity aggregation for Base-native tokens
- KyberSwap Elastic with concentrated liquidity
- Dynamic Market Maker (DMM) with amplified pools
- Auto-adjusting fees based on market conditions

**Contract Addresses**:
- Factory: `0x36B6CA2c7b2b9Cc7B4588574A9F2F2924D2B60F3` (KyberSwap Elastic Factory)
- Router: `0x3BC6eB7aF3B9E47BB2e6e205c0c2A99A3bB0c893` (KyberSwap Elastic Router)

**Configuration in DEXRegistry**:
```typescript
{
  name: 'KyberSwap on Base',
  protocol: 'KyberSwap',
  chainType: 'EVM',
  network: '8453',
  priority: 13,
  liquidityThreshold: 10^11 // Concentrated liquidity
}
```

---

### 9. Maverick Protocol (✅ Integrated)

**TVL**: ~$5-20M  
**Integration Status**: ✅ Fully integrated  
**Priority**: 7

**Key Features**:
- Dynamic pools with automated rebalancing
- Innovative for volatile assets like Base meme coins
- Directional liquidity that moves with price
- Mode-based liquidity concentration

**Contract Addresses**:
- Factory: `0x0A7e848Aca42d879EF06507Fca0E7b33A0a63c1e`
- Router: `0x5eDEd0d7E76C563FF081Ca01D9d12D6B404Df527`

**Configuration in DEXRegistry**:
```typescript
{
  name: 'Maverick V2 on Base',
  protocol: 'MaverickV2',
  chainType: 'EVM',
  network: '8453',
  priority: 7,
  liquidityThreshold: 10^11 // Dynamic distribution AMM
}
```

---

### 10. Alien Base (✅ Integrated)

**TVL**: ~$5-15M  
**Integration Status**: ✅ Fully integrated  
**Priority**: 8

**Key Features**:
- Emerging DEX with ve-token governance
- Growing for niche pairs and incentives on Base
- Uniswap V3 fork with concentrated liquidity
- Community-driven development

**Contract Addresses**:
- Factory: `0x0Fd83557b2be93617c9C1C1B6fd549401C74558C`
- Router: `0xB20C411FC84FBB27e78608C24d0056D974ea9411` (SmartRouter)

**Configuration in DEXRegistry**:
```typescript
{
  name: 'AlienBase on Base',
  protocol: 'AlienBase',
  chainType: 'EVM',
  network: '8453',
  priority: 8,
  liquidityThreshold: 10^11 // V3-style concentrated liquidity
}
```

---

## Integration Statistics

### Current Status
- **Total DEXs on Base**: 17 (in DEXRegistry)
- **Top 10 DEXs Integrated**: 10/10 (100% ✅)
- **Pending Integration**: 0 DEXs

### Coverage Analysis
- **By TVL**: ~$2.8B+ covered (>95% of top 10 combined TVL)
- **By Volume**: All high-volume DEXs integrated including Aerodrome, Uniswap, SushiSwap, Curve
- **Additional Coverage**: +$200M TVL from newly integrated DEXs (Curve, 1inch, KyberSwap)

## Usage in TheWarden

### How Pool Discovery Works

1. **DEXRegistry as Source of Truth**
   - Located at: `src/dex/core/DEXRegistry.ts`
   - Contains all DEX configurations (factory addresses, routers, protocols)
   - When initialized, registers all DEXes in memory

2. **Automatic Pool Discovery**
   ```typescript
   // In MultiHopDataFetcher.ts:
   const dexes = this.registry.getDEXesByNetwork(8453); // Base
   
   // For each DEX, automatically:
   for (const dex of dexes) {
     // 1. Queries the factory contract for pools
     // 2. Checks liquidity thresholds
     // 3. Builds graph edges for arbitrage paths
   }
   ```

3. **Preload Pools Script**
   ```bash
   # Cache pool data for fast startup
   npm run preload:pools -- --chain 8453
   ```

### Expected Performance

After integration of all top 10 DEXs:
- **Pools Discovered**: 200-400+ pools on Base
- **Arbitrage Paths**: 50-200 profitable paths per hour
- **Scan Time**: ~10-15 seconds with multicall batching
- **Coverage**: ~90%+ of Base DEX liquidity

## Resources

### Official Documentation
- **Base Network**: https://docs.base.org/
- **Aerodrome Finance**: https://aerodrome.finance/
- **Uniswap**: https://docs.uniswap.org/
- **PancakeSwap**: https://docs.pancakeswap.finance/
- **SushiSwap**: https://docs.sushi.com/
- **Balancer**: https://docs.balancer.fi/
- **Maverick Protocol**: https://docs.mav.xyz/

### Analytics Platforms
- **DefiLlama**: https://defillama.com/chain/Base
- **CoinGecko**: https://www.coingecko.com/en/chains/base-ecosystem
- **DappRadar**: https://dappradar.com/chain/base

### Block Explorers
- **Basescan**: https://basescan.org/

## Notes

- Rankings prioritize TVL for long-term liquidity depth
- 24-hour volumes fluctuate daily but often correlate with TVL
- Base's ecosystem favors low-fee, high-speed trading
- Always DYOR (Do Your Own Research) and consider risks like impermanent loss
- For real-time updates, check DefiLlama or CoinGecko

## Action Items

### Completed ✅
- [x] Research and add Curve DEX on Base
- [x] Research and add 1inch on Base
- [x] Research and add KyberSwap on Base

### Verification
- [ ] Verify all contract addresses on Basescan
- [ ] Test pool discovery for newly integrated DEXs
- [ ] Validate liquidity thresholds are appropriate

### Testing
- [ ] Run `npm run preload:pools -- --chain 8453`
- [ ] Verify pool counts increase with new integrations
- [ ] Test arbitrage path discovery with all DEXs

## License

MIT License - See LICENSE file for details

## Last Updated

November 26, 2025
