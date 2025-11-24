# Pool Preloading System

## Overview

The Pool Preloading System dramatically reduces TheWarden's startup time by pre-fetching and caching pool data from the blockchain. Instead of scanning pools on every startup (which takes 2+ minutes), TheWarden can now start almost instantly by loading pre-cached pool data.

## Quick Start

### Automatic Preloading (Recommended)

The `npm run start:mainnet` command now automatically handles pool preloading:

```bash
npm run start:mainnet
```

This will:
1. Check if valid pool cache exists
2. Skip preload if cache is fresh (< 1 hour old by default)
3. Preload pools if cache is stale or missing
4. Start TheWarden with preloaded data

### Manual Preloading

You can manually preload pools at any time:

```bash
# Preload pools (skip if valid cache exists)
npm run preload:pools

# Force reload even if cache is valid
npm run preload:pools:force
```

## Configuration

### Cache Duration

Set how long pool cache remains valid (in seconds):

```bash
# In .env file
POOL_CACHE_DURATION=3600  # 1 hour (default)
```

### Multi-Chain Support

The preloader automatically handles all chains configured in `SCAN_CHAINS`:

```bash
# In .env file
SCAN_CHAINS=8453,1,42161,10  # Base, Ethereum, Arbitrum, Optimism
```

## How It Works

### 1. Pool Data Fetching

The preload script:
- Fetches all token pairs for configured chains
- Queries each DEX for pool addresses and liquidity
- Filters pools by minimum liquidity thresholds
- Stores results to `.pool-cache/pools-{chainId}.json`

### 2. Cache Storage

Pool data is stored in JSON format with:
- Pool addresses and reserves
- Token pairs and DEX information
- Timestamp for cache validation
- BigInt values serialized as strings

### 3. Fast Loading

When TheWarden starts:
- Checks for valid cached pool data
- Loads directly from disk (milliseconds vs minutes)
- Falls back to network fetching if cache is stale

## Performance Benefits

| Scenario | Without Preload | With Preload | Improvement |
|----------|----------------|--------------|-------------|
| Cold Start | ~2-3 minutes | ~5 seconds | **24-36x faster** |
| Warm Start | ~2-3 minutes | ~1 second | **120-180x faster** |
| RPC Calls | 60+ per start | 0 per start | **100% reduction** |

## Cache Management

### View Cache Status

```bash
# Check what's in the cache
ls -lh .pool-cache/

# View cache contents
cat .pool-cache/pools-8453.json | jq '.timestamp, .pools | length'
```

### Clear Cache

```bash
# Remove all cached pool data
rm -rf .pool-cache/

# Next start will fetch fresh pool data
npm run start:mainnet
```

### Cache Validation

Cache is considered stale when:
- Age exceeds `POOL_CACHE_DURATION` (default: 1 hour)
- Chain ID doesn't match current configuration
- Cache file is corrupted or missing required fields

## Architecture

### Components

1. **PoolDataStore** (`src/arbitrage/PoolDataStore.ts`)
   - Manages disk-based cache persistence
   - Handles BigInt serialization/deserialization
   - Validates cache freshness

2. **MultiHopDataFetcher** (`src/arbitrage/MultiHopDataFetcher.ts`)
   - Enhanced to check preloaded data first
   - Falls back to network fetching if needed
   - Maintains compatibility with existing code

3. **Preload Script** (`scripts/preload-pools.ts`)
   - Standalone script for pool fetching
   - Progress reporting and error handling
   - Multi-chain support

### Data Flow

```
┌─────────────────┐
│  npm run        │
│  start:mainnet  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      Cache     ┌─────────────────┐
│ launch-mainnet  │─────Invalid────▶│  preload-pools  │
│     .sh         │                 │                 │
└────────┬────────┘                 └────────┬────────┘
         │                                   │
         │Cache Valid                        │Fetch from
         │                                   │Blockchain
         ▼                                   ▼
┌─────────────────┐                 ┌─────────────────┐
│   TheWarden     │◀────Loads───────│  PoolDataStore  │
│   main.ts       │                 │                 │
└─────────────────┘                 └─────────────────┘
```

## Troubleshooting

### Preload Fails

If preload fails, TheWarden will continue but fetch pools from network:

```
⚠️  Pool preload had issues but continuing...
   TheWarden will fetch pools from network (slower)
```

**Solution**: Check RPC URLs are configured correctly in `.env`

### Stale Cache Warning

If cache is older than configured duration:

```
Pool cache for chain 8453 is stale (age: 75m)
```

**Solution**: Run `npm run preload:pools:force` to refresh

### No Pools Found

If preload finds 0 pools:

```
✓ Found 0 valid pools in 30s
```

**Solution**: 
- Check `SCAN_CHAINS` configuration
- Verify DEX configurations in codebase
- Ensure RPC URL is accessible

## Best Practices

### Production Environment

1. **Preload on deployment**: Always run preload during deployment
2. **Schedule refreshes**: Use cron to refresh cache periodically
3. **Monitor cache age**: Alert if cache becomes stale during operation
4. **Multi-chain setup**: Preload all chains before starting

```bash
# Example deployment script
npm run build
npm run preload:pools:force
npm run start:mainnet
```

### Development Environment

1. **Keep cache short**: Use shorter `POOL_CACHE_DURATION` (e.g., 300s)
2. **Clear on changes**: Clear cache after DEX config changes
3. **Manual control**: Use `preload:pools:force` when needed

```bash
# Development workflow
export POOL_CACHE_DURATION=300  # 5 minutes
npm run preload:pools:force
npm run dev:watch
```

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `POOL_CACHE_DURATION` | `3600` | Cache validity in seconds |
| `SCAN_CHAINS` | `CHAIN_ID` | Comma-separated chain IDs to scan |
| `CHAIN_ID` | `8453` | Primary chain ID (Base) |
| `BASE_RPC_URL` | - | RPC URL for Base network |
| `ETHEREUM_RPC_URL` | - | RPC URL for Ethereum |
| `ARBITRUM_RPC_URL` | - | RPC URL for Arbitrum |
| `OPTIMISM_RPC_URL` | - | RPC URL for Optimism |

## Future Enhancements

- [ ] Redis-based cache for distributed deployments
- [ ] Incremental updates (only fetch changed pools)
- [ ] Pool event monitoring for real-time updates
- [ ] Cache warming in background
- [ ] Multi-region cache replication
- [ ] Pool health metrics and alerting

## Support

For issues or questions about pool preloading:
1. Check logs in `logs/` directory
2. Verify `.env` configuration
3. Try `npm run preload:pools:force`
4. Open an issue if problem persists
