# Ethers v6 Upgrade Execution Plan

## 🎯 Objective
Upgrade the entire Copilot-Consciousness/TheWarden codebase from ethers v5.7.2 to ethers v6.x with zero functionality loss.

## 📊 Scope Analysis

### Current State
- **Ethers Version**: v5.7.2
- **Files Affected**: 73+ TypeScript files
- **API Calls to Migrate**: 355+ v5-specific calls
- **Main Changes Required**:
  - 177+ `ethers.utils.*` calls → named imports
  - 147+ `BigNumber` → native `BigInt`
  - 150+ Provider API updates
  - Contract and Wallet API updates

### Breaking Changes Reference

| v5 API | v6 API | Impact |
|--------|--------|--------|
| `ethers.BigNumber.from()` | Native `BigInt` (`100n`) | HIGH - 147 instances |
| `ethers.utils.formatEther()` | `formatEther()` | HIGH - 177 instances |
| `ethers.utils.parseEther()` | `parseEther()` | HIGH - 177 instances |
| `ethers.providers.JsonRpcProvider` | `JsonRpcProvider` | MEDIUM - 150 instances |
| `ethers.Wallet` | `Wallet` | MEDIUM |
| `ethers.Contract` | `Contract` | MEDIUM |
| `.mul()`, `.div()`, `.add()`, `.sub()` | `*`, `/`, `+`, `-` operators | HIGH |

## 🚀 Migration Strategy

### Phase 1: Preparation (Day 1 - Morning)
1. ✅ Create comprehensive upgrade plan
2. ⬜ Update package.json dependencies
3. ⬜ Run initial build to identify breaking changes
4. ⬜ Create migration helper utilities
5. ⬜ Set up parallel testing branch

### Phase 2: Core Utilities Migration (Day 1 - Afternoon)
**Priority: Critical path components**

1. ⬜ `src/utils/` - Utility functions
   - `logger.ts` (if uses ethers)
   - `chainTokens.ts` (already updated)
   - Helper functions

2. ⬜ `src/types/` - Type definitions
   - Update BigNumber types to bigint
   - Update transaction types

3. ⬜ `src/config/` - Configuration files
   - Update BigInt literals in configs

### Phase 3: Provider and Contract Layer (Day 2)
**Priority: Foundation for all blockchain interactions**

1. ⬜ Provider initialization
   - `src/main.ts` - Provider setup
   - Update all `JsonRpcProvider` instantiations
   - Update `getBalance()`, `getBlock()`, etc.

2. ⬜ Contract interactions
   - Update all `ethers.Contract` instantiations
   - Update contract method calls
   - Update event filtering

3. ⬜ Wallet management
   - Update `ethers.Wallet` usage
   - Update transaction signing

### Phase 4: DEX and Arbitrage Core (Day 3)
**Priority: Core business logic**

1. ⬜ DEX implementations
   - `src/dex/protocols/uniswap/UniswapV2.ts`
   - `src/dex/protocols/uniswap/UniswapV3.ts`
   - `src/dex/protocols/sushiswap/`
   - `src/dex/protocols/curve/`
   - Update all pool queries and swaps

2. ⬜ Arbitrage logic
   - `src/arbitrage/AdvancedOrchestrator.ts`
   - `src/arbitrage/MultiHopDataFetcher.ts`
   - `src/arbitrage/PoolDataStore.ts`
   - Update BigNumber arithmetic
   - Update pool data handling

3. ⬜ Path finding
   - `src/arbitrage/pathfinding/`
   - Update profit calculations
   - Update gas estimations

### Phase 5: Execution Layer (Day 4)
**Priority: Transaction execution and gas management**

1. ⬜ Transaction execution
   - `src/execution/TransactionExecutor.ts`
   - `src/execution/IntegratedArbitrageOrchestrator.ts`
   - Update transaction building
   - Update gas price handling

2. ⬜ Gas estimation
   - `src/gas/GasPriceOracle.ts`
   - `src/gas/AdvancedGasEstimator.ts`
   - `src/gas/GasAnalytics.ts`
   - Update all BigNumber to bigint

3. ⬜ Safety and monitoring
   - `src/safety/`
   - `src/monitoring/`
   - Update health checks

### Phase 6: AI and Intelligence Layer (Day 5)
**Priority: Advanced features**

1. ⬜ Feature extraction
   - `src/ai/featureExtraction.ts`
   - Update number conversions

2. ⬜ ML components
   - `src/ml/`
   - Update input/output handling

3. ⬜ Consciousness modules
   - `src/consciousness/`
   - Update numerical processing

### Phase 7: Testing and Validation (Day 5-6)
**Priority: Ensure nothing breaks**

1. ⬜ Unit tests
   - Update all test files
   - Update mock data
   - Fix BigNumber assertions

2. ⬜ Integration tests
   - Test full arbitrage flow
   - Test DEX interactions
   - Test gas estimation

3. ⬜ Manual testing
   - Test on testnet
   - Verify pool scanning
   - Verify transaction building

## 🛠️ Migration Patterns

### Pattern 1: BigNumber → BigInt

```typescript
// OLD (v5)
import { ethers } from 'ethers';
const amount = ethers.BigNumber.from("1000000000000000000");
const doubled = amount.mul(2);
const halved = amount.div(2);
const sum = amount.add(ethers.BigNumber.from("500"));

// NEW (v6)
const amount = 1000000000000000000n;
const doubled = amount * 2n;
const halved = amount / 2n;
const sum = amount + 500n;
```

### Pattern 2: ethers.utils → Named Imports

```typescript
// OLD (v5)
import { ethers } from 'ethers';
const formatted = ethers.utils.formatEther(balance);
const parsed = ethers.utils.parseEther("1.0");
const address = ethers.utils.getAddress(addr);

// NEW (v6)
import { formatEther, parseEther, getAddress } from 'ethers';
const formatted = formatEther(balance);
const parsed = parseEther("1.0");
const address = getAddress(addr);
```

### Pattern 3: Provider Updates

```typescript
// OLD (v5)
import { ethers } from 'ethers';
const provider = new ethers.providers.JsonRpcProvider(url);

// NEW (v6)
import { JsonRpcProvider } from 'ethers';
const provider = new JsonRpcProvider(url);
```

### Pattern 4: Contract Updates

```typescript
// OLD (v5)
import { ethers } from 'ethers';
const contract = new ethers.Contract(address, abi, signer);
const result = await contract.someMethod();

// NEW (v6)
import { Contract } from 'ethers';
const contract = new Contract(address, abi, signer);
const result = await contract.someMethod();
// Note: Return types may be bigint instead of BigNumber
```

## 🔧 Migration Helper Utilities

Create `src/utils/ethersV6Migration.ts`:

```typescript
/**
 * Helper utilities for ethers v6 migration
 * These provide backward-compatible wrappers during transition
 */

import { formatEther as formatEtherV6, parseEther as parseEtherV6 } from 'ethers';

/**
 * Format bigint to ether string (v6 compatible)
 */
export function formatEther(value: bigint | string): string {
  return formatEtherV6(value);
}

/**
 * Parse ether string to bigint (v6 compatible)
 */
export function parseEther(value: string): bigint {
  return parseEtherV6(value);
}

/**
 * Safe division that handles bigint rounding
 */
export function safeDivide(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) {
    throw new Error('Division by zero');
  }
  return numerator / denominator;
}

/**
 * Calculate percentage as bigint
 */
export function calculatePercentage(value: bigint, percentage: number): bigint {
  return (value * BigInt(Math.floor(percentage * 10000))) / 10000n;
}
```

## 📋 Dependency Updates

### package.json Changes

```json
{
  "dependencies": {
    "ethers": "^6.13.0",  // Updated from 5.7.2
    // ... other dependencies
  },
  "devDependencies": {
    "@nomicfoundation/hardhat-ethers": "^3.0.0",  // New (replaces @nomiclabs/hardhat-ethers)
    // Remove: "@nomiclabs/hardhat-ethers": "2.2.3",
    // ... other dev dependencies
  }
}
```

### Hardhat Config Update

```typescript
// hardhat.config.ts
import '@nomicfoundation/hardhat-ethers';  // Updated import

// Rest of config remains similar
```

## ✅ Testing Checklist

After each phase:

- [ ] Run `npm run build` - no compilation errors
- [ ] Run `npm test` - all tests pass
- [ ] Run `npm run lint` - no new linting errors
- [ ] Manual test: Pool preloading works
- [ ] Manual test: Pool scanning works
- [ ] Manual test: Path finding works
- [ ] Manual test: Gas estimation works

## 🚨 Rollback Plan

If critical issues arise:

1. Keep v5 branch as backup
2. Document all issues encountered
3. Create issue tickets for each blocker
4. Rollback commit: `git revert <migration-commit>`
5. Reinstall v5: `npm install ethers@5.7.2`

## 📈 Success Metrics

- ✅ All 73 files successfully migrated
- ✅ All 355+ API calls updated
- ✅ Zero build errors
- ✅ All tests passing
- ✅ Manual testing confirms functionality
- ✅ Performance maintained or improved
- ✅ Gas estimations accurate

## 🔗 Resources

- [Ethers v6 Migration Guide](https://docs.ethers.org/v6/migrating/)
- [Ethers v6 Documentation](https://docs.ethers.org/v6/)
- [Breaking Changes Summary](https://docs.ethers.org/v6/migrating/#migrating-v5-to-v6)

---

## 🎬 Execution Commands

```bash
# 1. Create backup branch
git checkout -b backup/ethers-v5
git push origin backup/ethers-v5

# 2. Switch to upgrade branch
git checkout -b feature/ethers-v6-upgrade

# 3. Update dependencies
npm install ethers@^6.13.0
npm install --save-dev @nomicfoundation/hardhat-ethers@^3.0.0
npm uninstall @nomiclabs/hardhat-ethers

# 4. Build and identify issues
npm run build 2>&1 | tee build-errors.log

# 5. Run tests to identify failures
npm test 2>&1 | tee test-errors.log

# 6. Fix issues incrementally, commit after each phase
git add .
git commit -m "Phase X: <description>"

# 7. Final validation
npm run build
npm test
npm run lint
```

## 📝 Notes

- This is a LARGE migration (355+ changes)
- Estimated time: 5-6 days of focused work
- Break into small, testable commits
- Test after each phase
- Use TypeScript compiler to catch most issues
- BigInt arithmetic is the most error-prone change
- Keep v5 branch as safety net

---

**Current Status**: Planning Complete ✅
**Next Step**: Execute Phase 1 - Preparation
