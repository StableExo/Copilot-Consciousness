# Forge Tests

Solidity smart contract tests using Foundry's Forge testing framework.

## Purpose

These tests validate the core smart contract logic for:
- Flash swap execution (FlashSwapV2.sol)
- Arbitrage execution strategies
- MEV protection mechanisms

## Test Files

### FlashSwapV2.t.sol
Tests for the FlashSwapV2 contract:
- Flash loan execution
- Multi-hop swaps
- Profit calculations
- Emergency withdrawal
- Owner controls

### ArbitrageExecution.t.sol
Tests for arbitrage execution logic:
- DEX routing
- Slippage handling
- Gas optimization
- Profit validation

### MEVProtection.t.sol
Tests for MEV protection mechanisms:
- Private transaction routing
- Bundle submission
- Flashbots integration
- MEV refund handling

## Running Tests

### Prerequisites
Install Foundry:
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Run All Tests
```bash
forge test
```

### Run Specific Test
```bash
forge test --match-test testFlashSwap
```

### Run with Verbosity
```bash
forge test -vvv
```

### Fork Testing
Test against live networks:
```bash
# Fork Arbitrum
forge test --fork-url ${ARBITRUM_RPC_URL}

# Fork at specific block
forge test --fork-url ${ARBITRUM_RPC_URL} --fork-block-number 228000000
```

### Gas Reporting
```bash
forge test --gas-report
```

## Test Configuration

Tests use:
- **Solidity Version**: ^0.8.0
- **Network**: Arbitrum fork (default)
- **Block Number**: 228000000 (for consistency)

## Writing New Tests

1. Create new `.t.sol` file in this directory
2. Inherit from `forge-std/Test.sol`
3. Use Foundry's test utilities:
   - `assertTrue()`, `assertEq()`, etc.
   - `vm.prank()` for impersonation
   - `vm.deal()` for funding accounts
   - `vm.expectRevert()` for negative tests

Example:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../contracts/MyContract.sol";

contract MyContractTest is Test {
    MyContract public myContract;

    function setUp() public {
        myContract = new MyContract();
    }

    function testBasicFunctionality() public {
        // Your test here
        assertEq(myContract.getValue(), 42);
    }
}
```

## Integration with TypeScript Tests

These Forge tests complement the TypeScript test suite:
- **Forge tests**: Smart contract logic, Solidity-level validation
- **TypeScript tests** (`tests/`): Integration tests, end-to-end workflows

Both test suites should pass before deployment.

## Related Documentation

- [Foundry Book](https://book.getfoundry.sh/) - Complete Foundry documentation
- [Forge Testing](https://book.getfoundry.sh/forge/tests) - Forge test guide
- [Contracts Documentation](../contracts/README.md) - Smart contract details
- [Deployment Guide](../docs/deployment/MAINNET_DEPLOYMENT.md) - Deployment process

---

**Note**: These tests run in isolation from the main TypeScript test suite. Run both before production deployment.
