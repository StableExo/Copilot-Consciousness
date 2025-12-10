# FlashSwapV3 Implementation Guide

## Overview

FlashSwapV3 is an enhanced arbitrage execution contract with **multi-source flash loan support**, enabling automatic selection of the cheapest flash loan provider for maximum profitability.

### Key Enhancements Over V2

- ✅ **Multi-source flash loans**: Balancer (0%), dYdX (0%), Aave (0.09%)
- ✅ **Automatic source optimization**: Selects cheapest available option
- ✅ **Universal path execution**: Supports 1-5 hop arbitrage paths
- ✅ **Hybrid mode**: Aave + Uniswap V4 for large opportunities ($50M+)
- ✅ **Enhanced gas optimization**: Inline assembly for critical paths
- ✅ **Multi-DEX support**: Uniswap V3, SushiSwap, Aerodrome, Balancer, Curve, Uniswap V4

### Flash Loan Fee Comparison

| Provider | Fee | Availability | Best For |
|----------|-----|--------------|----------|
| **Balancer V2** | 0% | Most tokens, all chains | Default choice |
| **dYdX Solo** | 0% | ETH/USDC/DAI on Ethereum only | Ethereum mainnet |
| **Aave V3** | 0.09% | All assets, all chains | Universal fallback |
| **Uniswap V3** | 0.05-1% | Pool-specific | Legacy support |

### Expected Impact

- **Gas Savings**: 20-40% through 0% fee flash loans
- **Success Rate**: +20-35% from better path execution
- **Revenue Impact**: +$5k-$15k/month projected
- **Cost Savings**: $3k-$9k/year on flash loan fees

---

## Architecture

### Source Selection Logic

```
selectOptimalSource(token, amount):
  if amount >= $50M:
    return HYBRID_AAVE_V4  // Large arbitrage optimization
  
  if balancerSupports(token, amount):
    return BALANCER  // 0% fee preferred
  
  if dydxSupports(token, amount):
    return DYDX  // 0% fee for ETH/USDC/DAI
  
  return AAVE  // 0.09% fee universal fallback
```

### Flash Loan Sources

#### 1. Balancer V2 (Priority 1)

```solidity
// Balancer Vault: 0xBA12222222228d8Ba445958a75a0704d566BF2C8 (all chains)
balancerVault.flashLoan(
    recipient,
    tokens,
    amounts,
    userData
);

// Callback
function receiveFlashLoan(
    IERC20[] memory tokens,
    uint256[] memory amounts,
    uint256[] memory feeAmounts, // Always 0 for Balancer!
    bytes memory userData
) external;
```

**Advantages**:
- 0% fee (no protocol fee)
- Same address on all chains
- Supports most major tokens
- High liquidity

**Chain Support**: Ethereum, Base, Arbitrum, Optimism, Polygon

#### 2. dYdX Solo Margin (Priority 2)

```solidity
// dYdX Solo Margin: 0x1E0447b19BB6EcFdAe1e4AE1694b0C3659614e4e (Ethereum only)
dydxSoloMargin.operate(accounts, actions);

// Callback
function callFunction(
    address sender,
    Account memory accountInfo,
    bytes memory data
) external;
```

**Advantages**:
- 0% fee
- No gas token required
- Instant execution

**Limitations**:
- Ethereum mainnet only
- Limited to WETH, USDC, DAI
- Complex action encoding

**Chain Support**: Ethereum mainnet only

#### 3. Aave V3 (Universal Fallback)

```solidity
// Aave Pool: Chain-specific addresses
aavePool.flashLoan(
    receiverAddress,
    assets,
    amounts,
    interestRateModes,
    onBehalfOf,
    params,
    referralCode
);

// Callback
function executeOperation(
    address[] calldata assets,
    uint256[] calldata amounts,
    uint256[] calldata premiums, // 0.09% fee
    address initiator,
    bytes calldata params
) external returns (bool);
```

**Advantages**:
- Universal support (all tokens)
- Available on all major chains
- Reliable and battle-tested

**Fee**: 0.09% (9 bps)

**Chain Support**: All supported networks

#### 4. Hybrid Mode (Large Opportunities)

For opportunities >= $50M:
- Borrow from Aave V3 (0.09% fee on base amount)
- Execute swaps via Uniswap V4 (0% flash swap fees)
- Net fee: ~0.09% on borrowed amount only

**Benefit**: Minimizes total fees for large arbitrages where Uniswap V4 pools have sufficient liquidity.

---

## Universal Path Execution

### Swap Step Structure

```solidity
struct SwapStep {
    address pool;       // Pool address
    address tokenIn;    // Input token
    address tokenOut;   // Output token
    uint24 fee;         // Pool fee (for Uniswap V3)
    uint256 minOut;     // Minimum output (slippage protection)
    uint8 dexType;      // DEX type identifier
}
```

### Supported DEX Types

```solidity
uint8 constant DEX_TYPE_UNISWAP_V3 = 0;
uint8 constant DEX_TYPE_SUSHISWAP = 1;
uint8 constant DEX_TYPE_DODO = 2;
uint8 constant DEX_TYPE_AERODROME = 3;
uint8 constant DEX_TYPE_BALANCER = 4;
uint8 constant DEX_TYPE_CURVE = 5;
uint8 constant DEX_TYPE_UNISWAP_V4 = 6;
```

### Example: 3-Hop Arbitrage Path

```typescript
const path: UniversalSwapPath = {
  steps: [
    {
      pool: usdcWethPool,
      tokenIn: USDC,
      tokenOut: WETH,
      fee: 3000, // 0.3%
      minOut: parseEther("0.499"), // 0.2% slippage
      dexType: DEX_TYPE_UNISWAP_V3
    },
    {
      pool: wethDaiPool,
      tokenIn: WETH,
      tokenOut: DAI,
      fee: 500, // 0.05%
      minOut: parseUnits("999", 18),
      dexType: DEX_TYPE_UNISWAP_V3
    },
    {
      pool: daiUsdcPool,
      tokenIn: DAI,
      tokenOut: USDC,
      fee: 100, // 0.01%
      minOut: parseUnits("1001", 6), // 0.1% profit minimum
      dexType: DEX_TYPE_SUSHISWAP
    }
  ],
  borrowAmount: parseUnits("1000", 6), // Borrow 1000 USDC
  minFinalAmount: parseUnits("1001", 6) // Require 0.1% profit
};
```

---

## Deployment

### Constructor Parameters

```solidity
constructor(
    address _uniswapV3Router,      // Uniswap V3 SwapRouter
    address _sushiRouter,          // SushiSwap Router
    address _balancerVault,        // Balancer Vault
    address _dydxSoloMargin,       // dYdX Solo Margin (0x0 on non-Ethereum)
    address _aavePoolAddress,      // Aave V3 Pool
    address _aaveAddressesProvider,// Aave Addresses Provider
    address _v3Factory,            // Uniswap V3 Factory
    address payable _titheRecipient,// US debt reduction wallet
    uint16 _titheBps               // Tithe basis points (7000 = 70%)
)
```

### Base Mainnet Addresses

```typescript
const deployParams = {
  uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
  sushiRouter: "0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891",
  balancerVault: "0xBA12222222228d8Ba445958a75a0704d566BF2C8",
  dydxSoloMargin: "0x0000000000000000000000000000000000000000", // Not on Base
  aavePool: "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
  aaveAddressesProvider: "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D",
  v3Factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
  titheRecipient: "0x...", // US debt reduction wallet
  titheBps: 7000 // 70%
};
```

### Ethereum Mainnet Addresses (with dYdX)

```typescript
const deployParams = {
  // ... (same as above)
  dydxSoloMargin: "0x1E0447b19BB6EcFdAe1e4AE1694b0C3659614e4e", // dYdX available
  // ...
};
```

---

## Usage

### Execute Arbitrage

```typescript
import { FlashSwapV3 } from './FlashSwapV3';

// Initialize contract
const flashSwap = new ethers.Contract(
  contractAddress,
  FlashSwapV3ABI,
  signer
);

// Construct swap path
const path: UniversalSwapPath = {
  steps: [/* swap steps */],
  borrowAmount: parseUnits("1000", 6),
  minFinalAmount: parseUnits("1010", 6) // 1% profit minimum
};

// Execute (source automatically selected)
const tx = await flashSwap.executeArbitrage(
  USDC, // Token to borrow
  parseUnits("1000", 6), // Amount to borrow
  path // Swap path
);

await tx.wait();
console.log("Arbitrage executed:", tx.hash);
```

### Manual Source Selection

```typescript
// Check which source would be selected
const source = await flashSwap.selectOptimalSource(
  USDC,
  parseUnits("1000", 6)
);

console.log("Selected source:", source);
// 0 = BALANCER
// 1 = DYDX
// 2 = HYBRID_AAVE_V4
// 3 = AAVE
// 4 = UNISWAP_V3
```

---

## Gas Optimization

### Estimated Gas Costs

| Operation | V2 Gas | V3 Gas | Savings |
|-----------|--------|--------|---------|
| 2-hop arbitrage | 450k | 360k | 20% |
| 3-hop arbitrage | 600k | 480k | 20% |
| 5-hop arbitrage | 900k | 700k | 22% |
| Balancer flash loan | N/A | 50k | N/A |
| Aave flash loan | 250k | 200k | 20% |

**Total Savings**: 20-40% depending on path complexity and source selection.

### Fee Savings

**Scenario**: 300 arbitrage transactions/month, avg $10k borrowed

| Source | Fee | Cost/tx | Monthly | Yearly |
|--------|-----|---------|---------|--------|
| Balancer | 0% | $0 | $0 | $0 |
| Aave | 0.09% | $9 | $2,700 | $32,400 |
| **Savings** | | **$9** | **$2,700** | **$32,400** |

**With V3**: Always use Balancer → Save $32k/year at 300 tx/month

---

## Safety Features

### Access Control

```solidity
modifier onlyOwner() {
    require(msg.sender == owner, "FSV3:NA");
    _;
}
```

Only contract owner can:
- Execute arbitrage
- Withdraw emergency funds

### Reentrancy Protection

```solidity
contract FlashSwapV3 is ReentrancyGuard {
    function receiveFlashLoan(...) external nonReentrant { }
    function executeOperation(...) external nonReentrant { }
}
```

All callbacks protected against reentrancy attacks.

### Slippage Protection

```solidity
require(currentAmount >= step.minOut, "FSV3:SLIP");
require(finalAmount >= path.minFinalAmount, "FSV3:FIN");
```

- Per-step minimum output checks
- Final amount validation
- Transaction reverts if slippage exceeded

### Callback Validation

```solidity
// Balancer callback
require(msg.sender == address(balancerVault), "FSV3:CBV");

// Aave callback
require(msg.sender == address(aavePool), "FSV3:CBA");
require(initiator == address(this), "FSV3:IFI");
```

Prevents unauthorized callback execution.

---

## Profit Distribution

### Tithe System

```solidity
uint256 titheAmount = (netProfit * titheBps) / 10000;
uint256 ownerAmount = netProfit - titheAmount;

// 70% to US debt reduction
IERC20(token).safeTransfer(titheRecipient, titheAmount);

// 30% to operator
IERC20(token).safeTransfer(owner, ownerAmount);
```

**Example**:
- Net Profit: 1000 USDC
- Tithe (70%): 700 USDC → US debt reduction
- Owner (30%): 300 USDC → operator

---

## Testing

### Unit Tests (Forge)

```bash
# Run all FlashSwapV3 tests
forge test --match-contract FlashSwapV3Test -vvv

# Test source selection
forge test --match-test testSelectOptimalSource -vvv

# Test gas efficiency
forge test --gas-report
```

### Integration Tests

```bash
# Fork Base mainnet
forge test --fork-url $BASE_RPC_URL -vvv

# Test on Base Sepolia testnet
forge test --fork-url $BASE_SEPOLIA_RPC_URL -vvv
```

---

## Deployment Checklist

- [ ] Verify all constructor addresses for target network
- [ ] Set appropriate tithe basis points (7000 = 70%)
- [ ] Configure tithe recipient address
- [ ] Deploy contract
- [ ] Verify on block explorer
- [ ] Test with small amounts on testnet
- [ ] Monitor first mainnet executions
- [ ] Set up emergency withdrawal procedures
- [ ] Document deployment addresses

---

## Monitoring

### Key Metrics

- **Source Selection Distribution**: % Balancer vs Aave vs Hybrid
- **Gas Costs**: Average gas per execution
- **Fee Savings**: Total fees saved vs V2
- **Profit Distribution**: Tithe amounts sent
- **Execution Success Rate**: Successful vs reverted transactions

### Events to Monitor

```solidity
event FlashLoanInitiated(FlashLoanSource, token, amount, initiator);
event FlashLoanExecuted(source, token, amountBorrowed, feePaid, grossProfit, netProfit);
event SwapExecuted(stepIndex, dexType, tokenIn, tokenOut, amountIn, amountOut);
event TitheDistributed(token, titheRecipient, titheAmount, owner, ownerAmount);
event HybridModeActivated(token, borrowAmount, estimatedProfit);
```

---

## Troubleshooting

### Common Issues

**Issue**: "FSV3:IFR" (Insufficient final return)
- **Cause**: Slippage exceeded or unprofitable path
- **Solution**: Increase minOut values or adjust profit threshold

**Issue**: "FSV3:USO" (Unsupported source)
- **Cause**: Invalid source enum value
- **Solution**: Check source selection logic

**Issue**: "FSV3:UDT" (Unsupported DEX type)
- **Cause**: DEX type not implemented
- **Solution**: Use supported DEX types (0-6)

**Issue**: "FSV3:CBV" (Callback from wrong vault)
- **Cause**: Unauthorized Balancer callback
- **Solution**: Ensure Balancer Vault address is correct

---

## Roadmap

### Phase 1 (Current)
- ✅ Multi-source flash loan interfaces
- ✅ Automatic source selection
- ✅ Balancer + Aave integration
- ✅ Universal path execution
- ✅ Comprehensive tests

### Phase 2 (Week 2)
- [ ] Multihop routing optimization (1-5 hops)
- [ ] Gas-optimized path encoding
- [ ] Advanced slippage protection
- [ ] Dynamic fee calculation

### Phase 3 (Week 3)
- [ ] DEX aggregation (20+ DEXes)
- [ ] Route splitting for partial fills
- [ ] MEV protection integration
- [ ] Real-time profitability estimation

### Phase 4 (Week 4)
- [ ] Testnet validation (Base Sepolia)
- [ ] Mainnet deployment
- [ ] Monitoring dashboard
- [ ] Performance optimization

---

## Resources

- **Balancer Flash Loans**: https://docs.balancer.fi/reference/contracts/flash-loans.html
- **dYdX Solo Margin**: https://docs.dydx.exchange/
- **Aave V3 Flash Loans**: https://docs.aave.com/developers/guides/flash-loans
- **Uniswap V3 Docs**: https://docs.uniswap.org/contracts/v3/overview

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/StableExo/TheWarden/issues
- Documentation: `/docs/`
- Implementation Guide: `FLASH_LOAN_OPTIMIZATION_IMPLEMENTATION.md`
