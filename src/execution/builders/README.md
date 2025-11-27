# Transaction Parameter Builders

This directory contains specialized transaction parameter builders for arbitrage execution. These builders encode parameters for different types of flash loan and multi-hop arbitrage strategies, optimized for gas estimation and real execution.

## Overview

The builders are based on HAVOC's battle-tested implementations and provide a critical gas optimization feature: they detect minimal gas estimation simulations (1 wei transactions) and apply appropriate slippage settings to save $15k-57k/month in wasted gas.

## Builders

### AavePathBuilder
**File:** `AavePathBuilder.ts` (8.2 KB)

Builds Aave flash loan parameters for multi-hop arbitrage paths.

**Features:**
- Supports UniswapV3, SushiSwap, and DODO routing
- Detects minimal estimateGas simulations (initialAmount === 1n)
- Uses 0% slippage for gas estimation, configured slippage for real execution
- Encodes multi-hop swap paths as SwapStep[] array
- Handles tithe recipient for profit sharing
- Returns BuildResult with borrowTokenAddress

**Usage:**
```typescript
import { AavePathBuilder } from './builders';

const result = AavePathBuilder.buildParams(
  opportunity,
  simulationResult,
  config,
  titheRecipient
);
```

### TwoHopV3Builder
**File:** `TwoHopV3Builder.ts` (8.9 KB)

Builds UniswapV3 two-hop spatial arbitrage parameters (V3 → V3).

**Features:**
- Handles proper fee tier encoding (uint24)
- Validates borrow token matches pool token0 or token1
- Calculates amount0/amount1 based on token position
- Encodes callback parameters for V3 flash loan

**Usage:**
```typescript
import { TwoHopV3Builder } from './builders';

const result = TwoHopV3Builder.buildParams(
  opportunity,
  simulationResult,
  config,
  titheRecipient
);
```

### TriangularBuilder
**File:** `TriangularBuilder.ts` (8.5 KB)

Builds parameters for three-token cyclic arbitrage (A → B → C → A).

**Features:**
- Three-hop UniswapV3 paths
- Validates cyclic path (final output matches initial input)
- Callback type encoding for flash loan
- Ensures final amount exceeds initial amount

**Usage:**
```typescript
import { TriangularBuilder } from './builders';

const result = TriangularBuilder.buildParams(
  opportunity,
  simulationResult,
  config,
  titheRecipient
);
```

### SushiV3Builder
**File:** `SushiV3Builder.ts` (6.9 KB)

Builds SushiSwap V3 specific parameters for arbitrage execution.

**Features:**
- Handles Sushi V3 fee structures
- Compatible with UniswapV3 fee encoding (uint24)
- DexType enum encoding for contract calls

**Usage:**
```typescript
import { SushiV3Builder } from './builders';

const result = SushiV3Builder.buildParams(
  opportunity,
  simulationResult,
  config,
  titheRecipient
);
```

### V3SushiBuilder
**File:** `V3SushiBuilder.ts` (8.0 KB)

Builds parameters for cross-protocol routing (UniswapV3 → SushiSwap).

**Features:**
- Mixed DEX path handling
- Validates correct DEX order
- Encodes both UniV3 and Sushi parameters

**Usage:**
```typescript
import { V3SushiBuilder } from './builders';

const result = V3SushiBuilder.buildParams(
  opportunity,
  simulationResult,
  config,
  titheRecipient
);
```

## Common Interfaces

### BuildResult
```typescript
interface BuildResult {
  params: object;              // Encoded parameters
  typeString: string;          // ABI type string for encoding
  borrowTokenAddress: string;  // Token being borrowed
}
```

### SimulationResult
```typescript
interface SimulationResult {
  initialAmount: bigint;              // Borrow amount (1n for gas estimation)
  hop1AmountOutSimulated: bigint;     // First hop output
  finalAmountSimulated: bigint;       // Final output
}
```

### Config
```typescript
interface Config {
  SLIPPAGE_TOLERANCE_BPS: number;  // e.g., 50 = 0.5%
}
```

## Gas Estimation Optimization

All builders implement the critical gas estimation detection logic:

```typescript
const isMinimalGasEstimateSim = (
  simulationResult.initialAmount === 1n && 
  simulationResult.hop1AmountOutSimulated === 1n
);

if (isMinimalGasEstimateSim) {
  // Use 0% slippage for estimateGas checks
  minAmountOut = simulationResult.hop1AmountOutSimulated;
} else {
  // Use configured slippage for real execution
  minAmountOut = calculateMinAmountOut(
    simulationResult.hop1AmountOutSimulated,
    config.SLIPPAGE_TOLERANCE_BPS
  );
}
```

This pattern saves significant gas by encoding minimal (1 wei) transactions to test validity before executing real trades.

## DEX Type Mapping

```typescript
enum DexType {
  UniswapV3 = 0,
  SushiSwap = 1,
  DODO = 2
}
```

## Error Handling

All builders implement comprehensive validation:
- ✅ Valid Ethereum addresses (0x followed by 40 hex chars)
- ✅ Valid fee values (0 to 16777215 for uint24)
- ✅ BigInt types for all amounts
- ✅ Slippage tolerance in valid range (0-10000 bps)
- ✅ minOut > 0 for real execution
- ✅ Path structure validation (hop counts, cyclic paths)

## Testing

Run the test suite:
```bash
npm test -- src/execution/builders/__tests__/builders.test.ts
```

All builders have comprehensive test coverage including:
- Valid parameter building
- Gas estimation detection
- DEX type mapping
- Error validation
- Edge cases

## TypeScript Requirements

- Strict type checking enabled
- All amounts use BigInt
- TSDoc comments on all public methods
- No explicit `any` types (uses `unknown` where needed)

## References

Based on HAVOC's implementations:
- `aavePathBuilder.js` (9.6 KB)
- `twoHopV3Builder.js` (7.5 KB)
- `triangularBuilder.js` (4.4 KB)
- `sushiV3Builder.js` (4.0 KB)
- `v3SushiBuilder.js` (3.9 KB)
