# Viem Migration Guide

This document describes the migration from ethers.js to viem in the AEV TheWarden project.

## Overview

The project is migrating from ethers.js v6 to viem for improved:
- **Type safety** - Viem provides better TypeScript types and inference
- **Performance** - Lighter bundle size and faster execution
- **Tree-shaking** - Better support for modern bundlers
- **Modularity** - More composable API design
- **Chain support** - Built-in support for all major chains

## Current Status

### Phase 2.1: Core Viem Infrastructure ✅
- Added viem ^2.24.0 dependency
- Created viem client utilities in `src/utils/viem/`
- Added chain configuration map for all supported chains
- Created contract utilities with ERC20 ABI
- Added comprehensive test suite

### Phase 2.2: Module Migration (In Progress)
Migration priority:
1. `src/chains/` - Chain provider management
2. `src/execution/` - Transaction execution
3. `src/arbitrage/` - Arbitrage detection and execution
4. `src/services/` - Pool data fetching
5. `src/gas/` - Gas estimation
6. Remaining modules

## Using Viem Utilities

### Client Creation

```typescript
import { createViemPublicClient, createViemWalletClient } from '../utils/viem';

// Create a public client for reading blockchain state
const publicClient = createViemPublicClient(8453); // Base chain

// Create a wallet client for signing transactions
const walletClient = createViemWalletClient(8453, process.env.PRIVATE_KEY);
```

### Contract Interactions

```typescript
import { createContract, ERC20_ABI, getTokenBalance } from '../utils/viem/contracts';

// Create a contract instance
const contract = createContract(tokenAddress, ERC20_ABI, publicClient);

// Read token balance
const balance = await getTokenBalance(publicClient, tokenAddress, walletAddress);
```

### Utility Functions

```typescript
import { 
  formatEther, 
  parseEther, 
  formatUnits, 
  parseUnits,
  getAddress,
  isAddress 
} from '../utils/viem';

// Format wei to ether
const eth = formatEther(1000000000000000000n); // "1"

// Parse ether to wei
const wei = parseEther('1'); // 1000000000000000000n

// Checksum address
const checksummed = getAddress('0x742d35cc6634c0532925a3b844bc9e7595f8e3f1');

// Validate address
const isValid = isAddress('0x742d35cc6634c0532925a3b844bc9e7595f8e3f1');
```

## Ethers.js to Viem Mapping

| ethers.js | viem |
|-----------|------|
| `JsonRpcProvider` | `createPublicClient` + `http` transport |
| `Wallet` | `createWalletClient` + `privateKeyToAccount` |
| `Contract` | `getContract` or direct `readContract`/`writeContract` |
| `provider.getBalance()` | `publicClient.getBalance()` |
| `provider.getBlockNumber()` | `publicClient.getBlockNumber()` |
| `provider.getTransactionReceipt()` | `publicClient.getTransactionReceipt()` |
| `provider.getFeeData()` | `publicClient.estimateFeesPerGas()` |
| `wallet.sendTransaction()` | `walletClient.sendTransaction()` |
| `contract.balanceOf()` | `publicClient.readContract({ functionName: 'balanceOf' })` |
| `ethers.parseEther()` | `parseEther()` from viem |
| `ethers.formatEther()` | `formatEther()` from viem |
| `ethers.getAddress()` | `getAddress()` from viem |
| `ethers.isAddress()` | `isAddress()` from viem |

## Chain Configuration

Supported chains with their IDs:

| Chain | ID | Environment Variable |
|-------|-----|---------------------|
| Ethereum | 1 | `ETHEREUM_RPC_URL` |
| Base | 8453 | `BASE_RPC_URL` |
| Arbitrum | 42161 | `ARBITRUM_RPC_URL` |
| Optimism | 10 | `OPTIMISM_RPC_URL` |
| Polygon | 137 | `POLYGON_RPC_URL` |
| BSC | 56 | `BSC_RPC_URL` |
| Avalanche | 43114 | `AVALANCHE_RPC_URL` |
| Linea | 59144 | `LINEA_RPC_URL` |
| zkSync | 324 | `ZKSYNC_RPC_URL` |
| Scroll | 534352 | `SCROLL_RPC_URL` |
| Manta | 169 | `MANTA_RPC_URL` |
| Mode | 34443 | `MODE_RPC_URL` |

## Migration Checklist

### Core Infrastructure
- [x] Add viem dependency
- [x] Create client utilities
- [x] Create contract utilities
- [x] Add chain configuration
- [x] Add ERC20 ABI
- [x] Add utility function exports
- [x] Create test suite
- [x] Create migration documentation

### Module Migration
- [x] `src/chains/ChainProviderManager.ts`
- [x] `src/chains/adapters/EVMAdapter.ts`
- [x] `src/chains/CrossChainScanner.ts`
- [~] `src/execution/TransactionManager.ts` (requires ethers.js, documented for coexistence)
- [~] `src/execution/TransactionExecutor.ts` (requires ethers.js, documented for coexistence)
- [~] `src/execution/FlashSwapExecutor.ts` (requires ethers.js, documented for coexistence)
- [~] `src/execution/NonceManager.ts` (requires ethers.js AbstractSigner, documented for coexistence)
- [ ] `src/arbitrage/OptimizedPoolScanner.ts`
- [ ] `src/arbitrage/MultiHopDataFetcher.ts`
- [x] `src/services/PoolDataFetcher.ts`
- [x] `src/services/BaseArbitrageRunner.ts` (updated for viem compatibility)
- [x] `src/gas/GasPriceOracle.ts`
- [x] `src/utils/MulticallBatcher.ts` (added ViemMulticallBatcher class)
- [ ] Other modules

## Rollback Procedure

If you need to rollback to ethers.js only:

### Step 1: Remove viem from dependencies

```bash
npm uninstall viem
```

### Step 2: Remove viem utilities

```bash
rm -rf src/utils/viem
```

### Step 3: Revert any migrated modules

Restore the original ethers.js imports in any modified files.

### Step 4: Update utils/index.ts

Remove the viem export:

```diff
export * from './uuid';
export * from './math';
export * from './caching';
export * from './network';
export * from './validation';
-export * as viem from './viem';
```

### Step 5: Rebuild

```bash
npm run build:clean
npm test
```

## Coexistence with ethers.js

During the migration period, both libraries will coexist. The migration is designed to be incremental:

1. New code should prefer viem
2. Existing code will be migrated module by module
3. ethers.js will remain for backward compatibility until full migration
4. Both libraries work with the same ABI format

### Modules Requiring ethers.js

Some modules are deeply integrated with ethers.js's Signer abstraction and will continue to use ethers.js:

- `src/execution/NonceManager.ts` - Extends ethers.js AbstractSigner for nonce management
- `src/execution/TransactionManager.ts` - Uses ethers Provider for transaction handling
- `src/execution/TransactionExecutor.ts` - Uses ethers for transaction building and encoding
- `src/execution/FlashSwapExecutor.ts` - Uses ethers for flash swap execution

These modules can coexist with viem-based code. For new functionality, consider using viem's WalletClient directly.

## Benefits

### Type Safety
Viem provides better TypeScript inference, especially for contract interactions:

```typescript
// Viem automatically infers types from ABI
const balance = await publicClient.readContract({
  address: tokenAddress,
  abi: ERC20_ABI,
  functionName: 'balanceOf',
  args: [walletAddress],
}); // balance is inferred as bigint
```

### Bundle Size
Viem is more tree-shakeable, resulting in smaller bundles when only using specific features.

### Performance
Viem uses modern JavaScript features and optimized data structures for better performance.

## Questions?

If you encounter issues with the viem migration, check:

1. Node.js version >= 22 (see `.nvmrc`)
2. RPC URLs are correctly configured in `.env`
3. Private key is properly formatted with `0x` prefix
4. Chain ID is supported in `CHAIN_MAP`

For more information, see the [viem documentation](https://viem.sh/).
