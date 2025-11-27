# DEX Scanning Fix - November 22, 2025

## Problem Statement

TheWarden was running but **not actually scanning through any DEXes** because:

1. **Wrong Token Addresses**: Using hardcoded Ethereum mainnet token addresses while connected to Base network (Chain ID 8453)
2. **No Network Filtering**: Scanning ALL DEXes (Ethereum, Base, Solana) regardless of configured network
3. **Insufficient Logging**: No visibility into what pools were being checked

### Before Fix

```typescript
// main.ts scanCycle() - BEFORE
const tokens = [
  '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH (Ethereum)
  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC (Ethereum)  
  '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT (Ethereum)
];
```

**Result**: When running on Base (Chain ID 8453), the bot would try to fetch pools for Ethereum tokens from Base DEXes, which would fail because those token addresses don't exist on Base.

## Solution

### 1. Created Chain Token Configuration (`src/utils/chainTokens.ts`)

A new utility module that maps chain IDs to their respective token addresses:

```typescript
export function getTokensByChainId(chainId: number): ChainTokens {
  switch (chainId) {
    case 8453: // Base mainnet
    case 84532: // Base testnet
      return tokenAddresses.base; // Base tokens
    
    case 1: // Ethereum mainnet
      return tokenAddresses.ethereum; // Ethereum tokens
    
    // ... other chains
  }
}

export function getScanTokens(chainId: number): string[] {
  const tokens = getTokensByChainId(chainId);
  const addresses: string[] = [];
  
  // Returns array of most liquid token addresses
  if (tokens.WETH) addresses.push(tokens.WETH.address);
  if (tokens.USDC) addresses.push(tokens.USDC.address);
  // ... etc
  
  return addresses;
}
```

### 2. Updated Scan Cycle to Use Correct Tokens

```typescript
// main.ts scanCycle() - AFTER
const tokens = getScanTokens(this.config.chainId);
// For Base: Returns Base token addresses (0x4200..., 0x8335...)
// For Ethereum: Returns Ethereum token addresses (0xC02a..., 0xA0b8...)
```

### 3. Added Network Filtering in MultiHopDataFetcher

```typescript
// MultiHopDataFetcher.ts buildGraphEdges() - AFTER
let dexes = this.registry.getAllDEXes();
if (this.currentChainId !== undefined) {
  const chainIdStr = this.currentChainId.toString();
  dexes = this.registry.getDEXesByNetwork(chainIdStr);
  // For Base: Only returns "Uniswap V2 on Base" and "SushiSwap on Base"
}
```

### 4. Added Detailed Logging

```typescript
// Every 10 cycles, log:
logger.info(`Scanning cycle ${this.stats.cyclesCompleted}`);
logger.info(`  Network: Base (Chain ID: 8453)`);
logger.info(`  Tokens: 4 (WETH, USDC, USDbC, DAI)`);
logger.info(`  DEXes: 2 (Uniswap V2 on Base, SushiSwap on Base)`);

// During pool scanning:
logger.debug(`Building graph edges for 4 tokens across 2 DEXes`);
logger.debug(`Found pool: Uniswap V2 on Base 0x4200.../0x8335... (reserves: ...)`);
logger.info(`Pool scan complete: Checked 24 potential pools, found 3 valid pools with sufficient liquidity`);
```

## Token Addresses by Network

### Base (Chain ID 8453)
```
WETH:  0x4200000000000000000000000000000000000006
USDC:  0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
USDbC: 0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA
DAI:   0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb
```

### Ethereum (Chain ID 1)
```
WETH: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
USDC: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
USDT: 0xdAC17F958D2ee523a2206206994597C13D831ec7
DAI:  0x6B175474E89094C44Da98b954EedeAC495271d0F
```

## DEXes by Network

### Base DEXes (Network: "8453")
- **Uniswap V2 on Base**: Router `0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24`
- **SushiSwap on Base**: Router `0x804b526e5bf4349819fe2db65012ec5796536bd9`

### Ethereum DEXes (Network: "1")
- Uniswap V3
- Curve
- SushiSwap
- Balancer
- 1inch
- PancakeSwap V3

## Expected Output After Fix

When running on Base (Chain ID 8453), you should now see:

```log
[2025-11-22 05:45:00] [INFO] Scanning cycle 1
[2025-11-22 05:45:00] [INFO]   Network: Base (Chain ID: 8453)
[2025-11-22 05:45:00] [INFO]   Tokens: 4 (WETH, USDC, USDbC, DAI)
[2025-11-22 05:45:00] [INFO]   DEXes: 2 (Uniswap V2 on Base, SushiSwap on Base)
[2025-11-22 05:45:00] [DEBUG] [DATAFETCH] Filtering DEXes for chain 8453: Found 2 DEXes
[2025-11-22 05:45:00] [DEBUG] [DATAFETCH] Building graph edges for 4 tokens across 2 DEXes
[2025-11-22 05:45:01] [DEBUG] [DATAFETCH] Found pool: Uniswap V2 on Base 0x4200.../0x8335...
[2025-11-22 05:45:02] [INFO] [DATAFETCH] Pool scan complete: Checked 24 potential pools, found 3 valid pools
[2025-11-22 05:45:02] [DEBUG] [Cycle 1] Found 1 paths
```

## Testing

To verify the fix works:

1. **Set LOG_LEVEL=debug** in `.env` to see detailed logs
2. **Run the bot**: `npm run dev`
3. **Look for**:
   - "Filtering DEXes for chain 8453: Found 2 DEXes"
   - "Building graph edges for 4 tokens across 2 DEXes"
   - "Pool scan complete: Checked X potential pools, found Y valid pools"

## Files Changed

- `src/utils/chainTokens.ts` - NEW: Token configuration utility
- `src/main.ts` - Use chain-specific tokens, add logging
- `src/arbitrage/MultiHopDataFetcher.ts` - Filter DEXes by chain, add logging
- `src/arbitrage/AdvancedOrchestrator.ts` - Add setChainId() method

## Impact

✅ **TheWarden now actually scans DEX pools on the configured network**
✅ **Uses correct token addresses for Base network**
✅ **Only checks relevant DEXes (Base DEXes, not Ethereum DEXes)**
✅ **Provides visibility into scanning activity via detailed logs**

This fix is **critical** for the bot to function. Without it, TheWarden was essentially idle, not finding any opportunities because it was looking for Ethereum tokens on Base network.
