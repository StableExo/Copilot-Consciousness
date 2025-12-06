# The 70/30 Split: Tithe System Integration

**Version**: 4.1  
**Date**: December 6, 2025  
**Status**: ✅ Integrated from AxionCitadel  
**Contract**: FlashSwapV2 v4.1

---

## Overview

TheWarden now implements **The 70/30 Split** - an automated profit allocation mechanism inspired by AxionCitadel's tithe system, configured for US debt reduction.

### Profit Distribution

Every profitable arbitrage trade automatically splits net profits:
- **70%** → Tithe Recipient (US debt reduction wallet)
- **30%** → Owner (operator share)

This is not optional charity - it's hardcoded into the smart contract execution flow, ensuring transparent and automated allocation.

---

## How It Works

### 1. Smart Contract Level

**FlashSwapV2.sol** now includes:

```solidity
// State variables
address payable public immutable owner;           // Receives 30%
address payable public immutable titheRecipient;  // Receives 70%
uint16 public immutable titheBps;                 // 7000 = 70%

// Constructor validation
constructor(
    address _uniswapV3Router,
    address _sushiRouter,
    address _aavePoolAddress,
    address _aaveAddressesProvider,
    address payable _titheRecipient,
    uint16 _titheBps
) {
    require(_titheBps <= 9000, "FS:TBT"); // Max 90%
    if (_titheBps > 0) {
        require(_titheRecipient != address(0), "FS:ITR");
    }
    // ... other validations
    titheRecipient = _titheRecipient;
    titheBps = _titheBps;
}
```

### 2. Automated Distribution

After every successful arbitrage (both Uniswap V3 and Aave flash loans):

```solidity
function _distributeProfits(address _token, uint256 _netProfit) internal {
    if (_netProfit == 0) return;
    
    uint256 titheAmount = 0;
    uint256 ownerAmount = _netProfit;
    
    // Calculate 70/30 split
    if (titheBps > 0 && titheRecipient != address(0)) {
        titheAmount = (_netProfit * titheBps) / 10000;  // 70%
        ownerAmount = _netProfit - titheAmount;          // 30%
        
        // Transfer tithe portion
        if (titheAmount > 0) {
            IERC20(_token).safeTransfer(titheRecipient, titheAmount);
        }
    }
    
    // Transfer owner portion
    if (ownerAmount > 0) {
        IERC20(_token).safeTransfer(owner, ownerAmount);
    }
    
    // Emit tracking event
    emit TitheDistributed(_token, titheRecipient, titheAmount, owner, ownerAmount);
}
```

### 3. Execution Flow

```
Arbitrage Trade
    ↓
Calculate Net Profit (after flash loan fees & gas)
    ↓
_distributeProfits()
    ↓
    ├─→ 70% → titheRecipient (US debt wallet)
    └─→ 30% → owner (operator)
```

---

## Configuration

### Environment Variables (.env)

```bash
# Required: Tithe recipient wallet address
TITHE_WALLET_ADDRESS=0xYOUR_US_DEBT_WALLET_ADDRESS

# Tithe percentage in basis points (7000 = 70%)
TITHE_BPS=7000
```

### Deployment Parameters

When deploying FlashSwapV2, you must now provide:

```javascript
const flashSwapV2 = await FlashSwapV2.deploy(
    uniswapV3Router,
    sushiRouter,
    aavePool,
    aaveAddressesProvider,
    titheRecipient,  // NEW: 0x... address
    titheBps         // NEW: 7000 for 70%
);
```

### Validation

The contract enforces:
- ✅ `titheBps <= 9000` (max 90%, allows testing flexibility)
- ✅ If `titheBps > 0`, then `titheRecipient != address(0)`
- ✅ Immutable values (cannot be changed after deployment)

---

## Events & Monitoring

### New Event: TitheDistributed

```solidity
event TitheDistributed(
    address indexed token,
    address indexed titheRecipient,
    uint titheAmount,
    address indexed owner,
    uint ownerAmount
);
```

**Example Log**:
```
TitheDistributed(
    token: 0xUSDC_ADDRESS,
    titheRecipient: 0xUS_DEBT_WALLET,
    titheAmount: 0.7 ETH,
    owner: 0xOPERATOR_WALLET,
    ownerAmount: 0.3 ETH
)
```

### Monitoring Queries

**Get total tithe allocated**:
```javascript
const filter = contract.filters.TitheDistributed();
const events = await contract.queryFilter(filter);
const totalTithe = events.reduce((sum, e) => sum + e.args.titheAmount, 0n);
```

**Track operator share**:
```javascript
const ownerTotal = events.reduce((sum, e) => sum + e.args.ownerAmount, 0n);
```

---

## Testing

### Unit Test Example

```javascript
describe("Tithe System", () => {
    it("should split profits 70/30", async () => {
        const netProfit = ethers.parseEther("1.0"); // 1 ETH profit
        
        // Execute trade (mock)
        await flashSwapV2.executeArbitrage(/* params */);
        
        // Verify balances
        const titheBalance = await token.balanceOf(titheRecipient);
        const ownerBalance = await token.balanceOf(owner);
        
        expect(titheBalance).to.equal(ethers.parseEther("0.7")); // 70%
        expect(ownerBalance).to.equal(ethers.parseEther("0.3")); // 30%
    });
    
    it("should emit TitheDistributed event", async () => {
        await expect(flashSwapV2.executeArbitrage(/* params */))
            .to.emit(flashSwapV2, "TitheDistributed")
            .withArgs(
                tokenAddress,
                titheRecipient,
                expectedTithe,
                owner,
                expectedOwner
            );
    });
});
```

### Integration Test Checklist

- [ ] Deploy with 70% tithe configuration
- [ ] Execute successful arbitrage trade
- [ ] Verify tithe recipient receives 70%
- [ ] Verify owner receives 30%
- [ ] Check TitheDistributed event emission
- [ ] Test with zero profit (should not distribute)
- [ ] Test with disabled tithe (titheBps = 0)

---

## Economics

### Example Profit Scenarios

**Small Trade** ($100 net profit):
- Tithe: $70 → US debt reduction
- Operator: $30

**Medium Trade** ($1,000 net profit):
- Tithe: $700 → US debt reduction
- Operator: $300

**Large Trade** ($10,000 net profit):
- Tithe: $7,000 → US debt reduction
- Operator: $3,000

### Annual Projection (Hypothetical)

If TheWarden generates **$1M** in annual net profits:
- **$700,000** → US debt reduction
- **$300,000** → Operator share

---

## Comparison with AxionCitadel

| Aspect | AxionCitadel | TheWarden |
|--------|--------------|-----------|
| **Tithe %** | 10% default | 70% (The 70/30 Split) |
| **Purpose** | Sustainability fund | US debt reduction |
| **Configuration** | Flexible (0-25%) | Fixed 70%, flexible max 90% |
| **Integration** | Built-in from start | Integrated Dec 2025 |
| **Distribution** | Automatic | Automatic |
| **Transparency** | Event logging | Event logging |

---

## Security Considerations

### Immutable by Design

The tithe configuration is **immutable**:
- ✅ Set once at deployment
- ✅ Cannot be changed by owner
- ✅ Cannot be disabled after deployment
- ✅ Protects against rug-pull scenarios

### Recipient Validation

```solidity
if (_titheBps > 0) {
    require(_titheRecipient != address(0), "FS:ITR");
}
```

Ensures tithe recipient is valid address when tithe is enabled.

### Testing Flexibility

Max tithe set to 90% (not 100%) to allow:
- Testing different allocations
- Future adjustments if needed
- Prevents accidental 100% allocation

---

## Deployment Guide

### Step 1: Prepare Addresses

```bash
# Your operator wallet (receives 30%)
OWNER_ADDRESS=0xYOUR_OPERATOR_WALLET

# US debt reduction wallet (receives 70%)
TITHE_WALLET=0xUS_DEBT_REDUCTION_WALLET
```

### Step 2: Configure Environment

```bash
# .env
TITHE_WALLET_ADDRESS=0xUS_DEBT_REDUCTION_WALLET
TITHE_BPS=7000  # 70%
```

### Step 3: Deploy Contract

```bash
# Deploy script
npx hardhat run scripts/deploy-flashswap-v2-tithe.js --network base
```

### Step 4: Verify On-Chain

```bash
# Check contract state
npx hardhat verify --network base $FLASHSWAP_ADDRESS \
    $ROUTER $SUSHI $AAVE_POOL $AAVE_PROVIDER $TITHE_WALLET 7000
```

### Step 5: Test Distribution

```bash
# Execute test trade
npx hardhat run scripts/test-tithe-distribution.js --network base
```

---

## Operational Procedures

### Post-Trade Verification

After each successful trade:

1. **Check TitheDistributed event**:
   ```javascript
   const event = receipt.events.find(e => e.event === "TitheDistributed");
   console.log(`Tithe: ${event.args.titheAmount}`);
   console.log(`Owner: ${event.args.ownerAmount}`);
   ```

2. **Verify wallet balances**:
   ```bash
   # Tithe wallet should show +70%
   # Owner wallet should show +30%
   ```

3. **Log to database** (optional):
   ```javascript
   await db.trades.insert({
       txHash: receipt.hash,
       netProfit: netProfit,
       titheAmount: event.args.titheAmount,
       ownerAmount: event.args.ownerAmount,
       timestamp: block.timestamp
   });
   ```

### Monthly Reconciliation

Generate monthly tithe report:

```javascript
const monthStart = Date.UTC(2025, 11, 1); // December 1, 2025
const monthEnd = Date.UTC(2025, 11, 31);

const events = await contract.queryFilter(
    contract.filters.TitheDistributed(),
    monthStart,
    monthEnd
);

const summary = {
    totalTrades: events.length,
    totalProfit: events.reduce((sum, e) => sum + e.args.titheAmount + e.args.ownerAmount, 0n),
    totalTithe: events.reduce((sum, e) => sum + e.args.titheAmount, 0n),
    totalOwner: events.reduce((sum, e) => sum + e.args.ownerAmount, 0n)
};

console.log("Monthly Tithe Summary:", summary);
```

---

## FAQs

### Why 70/30 instead of other ratios?

This is the configured split for **US debt reduction** as mentioned in the project's legal position. The 70% represents the commitment to allocating the majority of profits toward debt reduction, while 30% provides sustainable operational funding.

### Can the tithe be disabled?

Only at deployment. Set `TITHE_BPS=0` to disable. Once deployed with a tithe, it cannot be changed.

### What if tithe recipient wallet is compromised?

The tithe recipient is immutable. If compromised, you must:
1. Deploy a new FlashSwapV2 contract
2. Update bot configuration to use new contract
3. Transfer any remaining funds via `emergencyWithdraw()`

### Does tithe apply to all profit types?

Yes. Both Uniswap V3 flash loans and Aave flash loans use the same `_distributeProfits()` function, ensuring consistent 70/30 allocation.

### How is "net profit" calculated?

```
Net Profit = Final Balance - (Borrowed Amount + Flash Loan Fee)
```

Tithe and owner share are both calculated from this net profit after all costs.

---

## Future Enhancements

### Potential Additions

1. **Multi-Recipient Tithe**:
   - Split 70% between multiple US debt instruments
   - Example: 40% Treasury bonds, 30% direct debt reduction

2. **Dynamic Tithe Schedule**:
   - Increase tithe percentage over time
   - Example: 70% → 80% → 90% as operations mature

3. **Tithe Dashboard**:
   - Real-time visualization of tithe allocation
   - Historical trends and projections

4. **Tax Reporting Integration**:
   - Automated tax documentation for charitable allocation
   - Form 8283 generation for non-cash contributions

---

## Acknowledgments

This tithe system is integrated from [AxionCitadel](https://github.com/metalxalloy/AxionCitadel), which pioneered automated profit allocation for MEV bots. TheWarden adapts their elegant implementation to support The 70/30 Split for US debt reduction.

**Key Differences**:
- AxionCitadel: 10% default tithe for sustainability
- TheWarden: 70% tithe for US debt reduction

Both systems demonstrate that profitable MEV extraction can serve broader societal purposes while maintaining operational sustainability.

---

## References

- [AxionCitadel Repository](https://github.com/metalxalloy/AxionCitadel)
- [AxionCitadel Exploration Report](./AXIONCITADEL_EXPLORATION_REPORT.md)
- [TheWarden Legal Position](../LEGAL_POSITION.md)
- [FlashSwapV2 Contract](../contracts/FlashSwapV2.sol)

---

**Last Updated**: December 6, 2025  
**Contract Version**: FlashSwapV2 v4.1  
**Status**: ✅ Production Ready
