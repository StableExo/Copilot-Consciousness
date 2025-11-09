# Testing Guide

## Overview

This guide covers testing strategies for Copilot-Consciousness, including unit tests (Jest), integration tests, and Foundry tests for smart contracts.

## Test Structure

```
Copilot-Consciousness/
├── src/
│   └── **/__tests__/          # Jest unit tests
├── tests/
│   └── integration/            # Integration tests
├── forge-tests/                # Foundry smart contract tests
│   ├── FlashSwapV2.t.sol
│   ├── MEVProtection.t.sol
│   └── ArbitrageExecution.t.sol
└── jest.config.js
```

## Jest Unit Tests

### Running Tests

```bash
# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Run specific test file
npm test -- src/mev/__tests__/MEVSensorHub.test.ts

# Run with coverage
npm test -- --coverage
```

### Writing Unit Tests

#### Example: Testing MEV Sensor

```typescript
// src/mev/sensors/__tests__/MempoolCongestionSensor.test.ts
import { MempoolCongestionSensor } from '../MempoolCongestionSensor';

describe('MempoolCongestionSensor', () => {
  let sensor: MempoolCongestionSensor;
  const mockRpcUrl = 'http://localhost:8545';

  beforeEach(() => {
    sensor = new MempoolCongestionSensor(mockRpcUrl);
  });

  afterEach(() => {
    // Cleanup
  });

  it('should initialize with correct parameters', () => {
    expect(sensor).toBeDefined();
    expect(sensor.windowSize).toBe(5);
  });

  it('should calculate congestion score', async () => {
    const score = await sensor.getCongestionScore();
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('should handle RPC errors gracefully', async () => {
    const badSensor = new MempoolCongestionSensor('http://invalid-url');
    await expect(badSensor.getCongestionScore()).rejects.toThrow();
  });
});
```

#### Example: Testing RPCManager

```typescript
// src/chains/__tests__/RPCManager.test.ts
import { RPCManager } from '../RPCManager';

describe('RPCManager', () => {
  let manager: RPCManager;
  const testRpcUrl = 'http://localhost:8545';

  beforeEach(() => {
    manager = new RPCManager();
  });

  afterEach(async () => {
    await manager.shutdown();
  });

  it('should execute operation with rate limiting', async () => {
    const result = await manager.executeWithRateLimit(
      testRpcUrl,
      async () => 'test-result'
    );
    
    expect(result).toBe('test-result');
  });

  it('should track metrics', async () => {
    await manager.executeWithRateLimit(testRpcUrl, async () => 'test');
    
    const metrics = manager.getMetrics(testRpcUrl);
    expect(metrics.totalRequests).toBe(1);
    expect(metrics.successfulRequests).toBe(1);
  });

  it('should handle timeouts', async () => {
    manager.configureEndpoint(testRpcUrl, {
      timeout: 10,
      throwOnTimeout: true
    });

    await expect(
      manager.executeWithRateLimit(testRpcUrl, async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'result';
      })
    ).rejects.toThrow();
  });
});
```

#### Example: Testing Protocol Registry

```typescript
// src/config/registry/__tests__/protocol-registry.test.ts
import { ProtocolRegistry } from '../protocol-registry';

describe('ProtocolRegistry', () => {
  let registry: ProtocolRegistry;

  beforeEach(() => {
    registry = new ProtocolRegistry();
  });

  it('should register protocol', () => {
    registry.register({
      name: 'Test DEX',
      type: 'uniswap-v2',
      router: '0x123',
      factory: '0x456',
      supportedChains: [1],
      features: ['flash-swap'],
      version: '2'
    });

    expect(registry.has('Test DEX')).toBe(true);
  });

  it('should get protocol by name', () => {
    registry.register({
      name: 'Test DEX',
      type: 'uniswap-v2',
      router: '0x123',
      factory: '0x456',
      supportedChains: [1],
      features: ['flash-swap']
    });

    const protocol = registry.get('Test DEX');
    expect(protocol).toBeDefined();
    expect(protocol?.router).toBe('0x123');
  });

  it('should get protocols by chain', () => {
    registry.register({
      name: 'DEX 1',
      type: 'uniswap-v2',
      router: '0x1',
      factory: '0x2',
      supportedChains: [1, 42161],
      features: []
    });

    const protocols = registry.getByChain(42161);
    expect(protocols.length).toBeGreaterThan(0);
  });
});
```

### Mocking

#### Mocking Web3 Provider

```typescript
jest.mock('ethers', () => ({
  providers: {
    JsonRpcProvider: jest.fn().mockImplementation(() => ({
      getBlockNumber: jest.fn().mockResolvedValue(12345678),
      getGasPrice: jest.fn().mockResolvedValue(BigInt('50000000000')),
      getBlock: jest.fn().mockResolvedValue({
        number: 12345678,
        timestamp: Date.now(),
        transactions: []
      })
    }))
  }
}));
```

#### Mocking Redis

```typescript
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1)
  }));
});
```

## Integration Tests

### Structure

```typescript
// tests/integration/mev-sensor-integration.test.ts
import { MempoolCongestionSensor } from '../../src/mev/sensors/MempoolCongestionSensor';
import { SearcherDensitySensor } from '../../src/mev/sensors/SearcherDensitySensor';
import { MEVSensorHub } from '../../src/mev/sensors/MEVSensorHub';

describe('MEV Sensor Integration', () => {
  const rpcUrl = process.env.ARBITRUM_RPC_URL || 'http://localhost:8545';
  
  it('should integrate congestion and searcher sensors', async () => {
    const hub = new MEVSensorHub(rpcUrl, ['0x...']);
    
    await hub.start();
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for updates
    
    const metrics = hub.getMetrics();
    expect(metrics.congestionScore).toBeGreaterThanOrEqual(0);
    expect(metrics.searcherDensity).toBeGreaterThanOrEqual(0);
    
    await hub.stop();
  });
});
```

## Foundry Tests

### Installation

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install dependencies
forge install
```

### Running Foundry Tests

```bash
# Run all tests
npm run test:anvil

# Run with gas report
npm run test:anvil:gas

# Run specific test
forge test --match-test testDeployment -vvv

# Run with fork (requires RPC URL)
export ARBITRUM_RPC_URL="https://arb1.arbitrum.io/rpc"
npm run test:anvil
```

### Writing Foundry Tests

#### Basic Test Structure

```solidity
// forge-tests/Example.t.sol
// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;

import "forge-std/Test.sol";
import "../contracts/FlashSwapV2.sol";

contract ExampleTest is Test {
    FlashSwapV2 public flashSwap;
    
    address constant OWNER = address(0x1);
    
    function setUp() public {
        // Fork network
        vm.createSelectFork(vm.envString("ARBITRUM_RPC_URL"), 228000000);
        
        // Deploy contracts
        vm.prank(OWNER);
        flashSwap = new FlashSwapV2(FACTORY, ROUTER);
    }
    
    function testExample() public {
        // Test implementation
        assertEq(flashSwap.owner(), OWNER);
    }
}
```

#### Testing with Deals (Fake Balances)

```solidity
function testWithBalance() public {
    address token = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1; // WETH
    address user = address(0x123);
    
    // Give user 10 ETH worth of WETH
    deal(token, user, 10 ether);
    
    assertEq(IERC20(token).balanceOf(user), 10 ether);
}
```

#### Testing Reverts

```solidity
function testRevert() public {
    vm.expectRevert("Ownable: caller is not the owner");
    
    address nonOwner = address(0xdead);
    vm.prank(nonOwner);
    flashSwap.withdraw(WETH, 1 ether);
}
```

#### Time Manipulation

```solidity
function testDeadline() public {
    uint256 deadline = block.timestamp + 60;
    
    // Fast forward past deadline
    vm.warp(block.timestamp + 61);
    
    assertTrue(block.timestamp > deadline);
}
```

#### Gas Optimization Testing

```solidity
function testGasOptimization() public {
    uint256 gasBefore = gasleft();
    
    // Operation to test
    flashSwap.someOperation();
    
    uint256 gasUsed = gasBefore - gasleft();
    
    // Assert gas is under threshold
    assertLt(gasUsed, 100000);
}
```

### Test Coverage

#### View Coverage

```bash
# Generate coverage report
forge coverage

# Generate detailed HTML report
forge coverage --report lcov
genhtml lcov.info --output-directory coverage
open coverage/index.html
```

## Testing Best Practices

### 1. Arrange-Act-Assert Pattern

```typescript
it('should calculate profit correctly', async () => {
  // Arrange
  const revenue = 10;
  const gasCost = 0.5;
  const mevRisk = 0.1;
  
  // Act
  const profit = revenue - gasCost - mevRisk;
  
  // Assert
  expect(profit).toBe(9.4);
});
```

### 2. Test Edge Cases

```typescript
describe('Token Precision', () => {
  it('should handle zero amounts', () => {
    const result = tokenPrecision.toTokenUnits('0', tokenAddress, chainId);
    expect(result).toBe(0n);
  });

  it('should handle very large amounts', () => {
    const result = tokenPrecision.toTokenUnits('1000000000', tokenAddress, chainId);
    expect(result).toBeDefined();
  });

  it('should handle decimal precision', () => {
    const result = tokenPrecision.toTokenUnits('0.000001', usdcAddress, chainId);
    expect(result).toBe(1n); // 1 smallest unit
  });
});
```

### 3. Isolation

```typescript
describe('RPCManager', () => {
  let manager: RPCManager;
  
  beforeEach(() => {
    manager = new RPCManager(); // Fresh instance
  });
  
  afterEach(async () => {
    await manager.shutdown(); // Cleanup
  });
  
  // Tests...
});
```

### 4. Async Testing

```typescript
it('should handle async operations', async () => {
  const promise = asyncOperation();
  await expect(promise).resolves.toBe(expectedValue);
});

it('should handle async errors', async () => {
  const promise = failingAsyncOperation();
  await expect(promise).rejects.toThrow('Error message');
});
```

### 5. Timeout Configuration

```typescript
it('should complete within timeout', async () => {
  // Set custom timeout
  jest.setTimeout(30000); // 30 seconds
  
  await longRunningOperation();
}, 30000);
```

## Continuous Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  jest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - uses: codecov/codecov-action@v3

  foundry:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: foundry-rs/foundry-toolchain@v1
      - run: forge test
        env:
          ARBITRUM_RPC_URL: ${{ secrets.ARBITRUM_RPC_URL }}
```

## Debugging Tests

### Jest Debug

```bash
# Run with debugging
node --inspect-brk node_modules/.bin/jest --runInBand

# VS Code launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Foundry Debug

```bash
# Run with verbose output
forge test -vvvv

# Run with trace
forge test --debug testName
```

## Performance Testing

### Load Testing

```typescript
describe('Performance', () => {
  it('should handle high request rate', async () => {
    const operations = Array(1000).fill(null).map(() =>
      rpcManager.executeWithRateLimit(rpcUrl, async () => 'test')
    );
    
    const startTime = Date.now();
    await Promise.all(operations);
    const duration = Date.now() - startTime;
    
    console.log(`Completed 1000 requests in ${duration}ms`);
    expect(duration).toBeLessThan(10000); // Under 10 seconds
  });
});
```

## Related Documentation

- [MEV Integration Guide](./MEV_INTEGRATION.md)
- [Rate Limiting Guide](./RATE_LIMITING.md)
- [Protocol Registry Documentation](./PROTOCOL_REGISTRY.md)
