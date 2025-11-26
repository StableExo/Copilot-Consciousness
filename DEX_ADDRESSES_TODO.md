# DEX Addresses Requiring Verification

This document tracks DEX factory addresses that need to be verified or updated with correct addresses from official sources.

## Priority 1 - Needs Immediate Verification

### Dopex V2 (Stryke)
**Status**: Placeholder addresses used - NEEDS VERIFICATION

**Chains**: Base (8453), Arbitrum (42161)

**Current Placeholder Address**: `0x6Ae4a8AB1D1a8c3C3D1F2e9c8e9e4c3c3d1f2e9c`

**Notes**:
- Dopex V2 (now branded as Stryke) uses CLAMM (Concentrated Liquidity Automated Market Maker)
- Similar architecture to Uniswap V3
- Factory addresses not publicly documented yet

**Action Items**:
1. Check official Dopex/Stryke documentation: https://dopex.io/ and https://learn.stryke.xyz/
2. Join Dopex Discord/Telegram for contract address announcements: https://discord.gg/dopex
3. Check Arbiscan for verified Dopex V2 contracts on Arbitrum
4. Check Basescan for verified Dopex V2 contracts on Base
5. Consult DeFi analytics (DeFiLlama, Coingecko) for tracked contracts

**How to Update**:
1. Update `src/dex/core/DEXRegistry.ts` lines for Dopex V2 entries
2. Update `src/config/pools/dex_pools.json` for both Base and Arbitrum
3. Update `configs/pools/dex_pools.json` (duplicate)
4. Rebuild with `npm run build`
5. Test with `npm run preload:pools`

## Verification Checklist

For each DEX address, verify:
- [ ] Factory address is correct and verified on chain explorer
- [ ] Router address is correct and verified on chain explorer
- [ ] Contract is not a proxy (or proxy address is documented)
- [ ] initCodeHash is correct for the factory (for CREATE2 pool address calculation)
- [ ] DEX is actively used and has sufficient liquidity

## Address Verification Tools

- **Basescan**: https://basescan.org/
- **Arbiscan**: https://arbiscan.io/
- **Optimistic Etherscan**: https://optimistic.etherscan.io/
- **Lineascan**: https://lineascan.build/
- **zkSync Era Explorer**: https://explorer.zksync.io/
- **Scrollscan**: https://scrollscan.com/
- **Manta Pacific Explorer**: https://pacific-explorer.manta.network/
- **Mode Explorer**: https://explorer.mode.network/

## Recently Added DEXes (Verified)

### Tier 1 - Base Network
- ✅ **Aerodrome Finance**: Factory `0x420DD381b31aEf6683db6B902084cB0FFECe40Da` (Already in system)
- ✅ **SushiSwap V3**: Factory `0xbACEB8eC6b935a1d9E2a2aCacB1bF4fD2E2B5a8c` (From problem statement)

### Tier 1 - Other Chains
- ✅ **Velodrome V2 (Optimism)**: Factory `0xF1046053aa67B7aB5D7c916F32d2c56705a4D7A1` (From problem statement)
- ⚠️ **Lynex (Linea)**: Factory `0xBc7695Fd00E3b32D08124b7a4287493aEE99f9ee` (Needs verification)

### Tier 2 - Cross-Chain
All Tier 2 addresses should be verified on their respective chain explorers before production use.

## Testing After Address Updates

```bash
# Build the project
npm run build

# Test pool preloading for specific chain
npm run preload:pools -- --chain <chainId>

# Example: Test Base network
npm run preload:pools -- --chain 8453

# Test all configured chains
npm run preload:pools -- --chain all
```

## Notes

- Placeholder addresses use a recognizable pattern: `0x6Ae4a8AB1D1a8c3C3D1F2e9c8e9e4c3c3d1f2e9c`
- Always verify addresses on official block explorers before using in production
- Some V3-style DEXes (Velodrome, Ambient, Maverick) use `factory.getPool()` instead of CREATE2, so `initCodeHash` may be `undefined`
- Test thoroughly with small amounts before running in production
