# Base Mainnet Deployment Guide - FlashSwapV2

## Overview

This guide provides step-by-step instructions for deploying and testing the FlashSwapV2 arbitrage contract on Base mainnet.

**⚠️ CRITICAL: READ ENTIRELY BEFORE PROCEEDING**

## Pre-Deployment Checklist

### 1. Environment Setup

Ensure the following are configured in your `.env` file:

```bash
# Required
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR-API-KEY
WALLET_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# Recommended (for contract verification)
BASESCAN_API_KEY=YOUR_BASESCAN_API_KEY
```

### 2. Wallet Requirements

Your deployment wallet (`0x119F4857DD9B2e8d1B729E8C3a8AE58fC867E91B`) should have:

- **Minimum for deployment**: 0.01 ETH (covers gas for contract deployment)
- **Recommended for testing**: 
  - 0.01+ ETH (native) for gas
  - 0.003+ WETH for arbitrage tests
  - 10+ USDC for route testing

### 3. Network Configuration Verification

Run the pre-deployment checklist:

```bash
npx hardhat run scripts/preDeploymentChecklist.ts --network base
```

This will verify:
- Network is Base mainnet (Chain ID: 8453)
- Deployer wallet has sufficient balance
- All required addresses are configured
- Contract compiles successfully
- Environment variables are set

## Deployment Steps

### Step 1: Run Pre-Deployment Checklist

```bash
npx hardhat run scripts/preDeploymentChecklist.ts --network base
```

**Expected Output**: "✅ ALL CHECKS PASSED: Ready for deployment"

If any critical checks fail, address them before proceeding.

### Step 2: Deploy FlashSwapV2 Contract

```bash
npx hardhat run scripts/deployFlashSwapV2.ts --network base
```

**What This Does**:
- Deploys FlashSwapV2 with Base mainnet addresses:
  - Uniswap V3 Router: `0x2626664c2603336E57B271c5C0b26F421741e481`
  - SushiSwap Router: `0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891`
  - Aave V3 Pool: `0xA238Dd80C259a72e81d7e4664a9801593F98d1c5`
  - Aave Addresses Provider: `0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D`
- Sets you as the contract owner (all profits go to your wallet)
- Waits for 5 confirmations

**Expected Output**:
```
✅ FlashSwapV2 deployed successfully!
Contract address: 0x...
Owner address: 0x119F4857DD9B2e8d1B729E8C3a8AE58fC867E91B

📄 Save these details to your .env file:
FLASHSWAP_V2_ADDRESS=0x...
```

### Step 3: Update Environment Variables

Add the deployed contract address to your `.env` file:

```bash
FLASHSWAP_V2_ADDRESS=0xYourDeployedContractAddress
```

### Step 4: Verify Contract (Optional but Recommended)

```bash
npx hardhat verify --network base <CONTRACT_ADDRESS> \
  0x2626664c2603336E57B271c5C0b26F421741e481 \
  0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891 \
  0xA238Dd80C259a72e81d7e4664a9801593F98d1c5 \
  0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D
```

This makes the contract source code publicly viewable on Basescan.

## Testing Steps

### Step 5: Dry-Run Simulation

Before executing a real transaction, run a simulation:

```bash
npx hardhat run scripts/dryRunArbitrage.ts --network base
```

**What This Does**:
- Validates your route configuration
- Estimates gas costs
- Checks that pools exist
- Identifies potential issues WITHOUT spending gas

**Expected Output**:
```
✅ SIMULATION SUCCESSFUL

Key Findings:
  • Estimated Gas: ~500,000
  • Estimated Cost: 0.00005 ETH
  • Route: WETH → USDC → WETH
  • Flash Loan Amount: 0.001 WETH
```

### Step 6: Execute First Test Transaction

**⚠️ IMPORTANT**: The first execution uses a minimal amount (0.001 WETH) for safety.

```bash
npx hardhat run scripts/runArbitrage.ts --network base
```

**What This Does**:
- Borrows 0.001 WETH via Aave flash loan
- Swaps WETH → USDC on Uniswap V3 (0.05% fee)
- Swaps USDC → WETH on SushiSwap (0.3% fee)
- Repays flash loan + fee
- Transfers any profit to your wallet

**Expected Outcomes**:

1. **Success**: Transaction confirms, profit/loss logged
2. **Revert**: Transaction fails during gas estimation with error message

**Common Revert Reasons**:
- Insufficient liquidity in pools
- Price impact too high
- Slippage protection triggered
- Aave flash loan fee makes trade unprofitable

## Post-Test Analysis

### Check Transaction on Basescan

1. Copy the transaction hash from output
2. Visit: `https://basescan.org/tx/<TX_HASH>`
3. Review:
   - Gas used
   - Events emitted
   - Token transfers
   - Any error messages

### Check Your Balances

```bash
npx hardhat run scripts/checkBalances.ts --network base
```

Compare before/after balances to verify:
- Gas costs deducted from ETH
- Any profit added to WETH/USDC
- No unexpected balance changes

## Scaling Up (After Successful Test)

Once you've confirmed a successful test transaction:

### Option 1: Increase Flash Loan Amount

Edit `scripts/runArbitrage.ts`:

```typescript
const LOAN_AMOUNT = isBaseMainnet 
  ? ethers.utils.parseUnits("0.01", 18)  // Increased from 0.001
  : ethers.utils.parseUnits("0.1", 18);
```

### Option 2: Add Price Checks and Profitability Filters

Before scaling up, implement:
- Off-chain price checking to find actual arbitrage opportunities
- Minimum profit thresholds
- Maximum gas cost limits
- Monitoring/alerting for profitable opportunities

## Safety Considerations

### Single-Owner Design

- ✅ Contract is designed for single EOA (your wallet) use only
- ✅ All profits go directly to the owner (you)
- ✅ Only the owner can initiate flash loans
- ✅ No multi-user functionality or pooled funds

### Personal Use Confirmation

This system is designed for:
- ✅ Personal trading and research
- ✅ Your own capital only
- ✅ Educational and experimentation purposes

This system is NOT:
- ❌ A service offered to others
- ❌ A pooled investment vehicle
- ❌ A product for customers

### Risk Warnings

- **Gas Costs**: Each transaction costs gas (even if unprofitable)
- **Flash Loan Fees**: Aave charges a small fee (typically 0.09%)
- **Price Impact**: Large trades can move prices unfavorably
- **MEV Risk**: Your transactions may be front-run by MEV bots
- **Smart Contract Risk**: Bugs or exploits could lead to loss of funds

## Contract Security Review

### Access Control
- ✅ `onlyOwner` modifier protects flash loan initiation
- ✅ Owner receives all profits
- ✅ No external calls to untrusted contracts

### Reentrancy Protection
- ✅ `ReentrancyGuard` on all external entry points
- ✅ Checks-Effects-Interactions pattern followed

### Known Limitations
- ⚠️ DODO integration disabled (as intended)
- ⚠️ No slippage protection on intermediate hops (set `minOut` carefully)
- ⚠️ No emergency pause mechanism (owner can only withdraw stuck funds)

## Troubleshooting

### "UNPREDICTABLE_GAS_LIMIT" Error

**Cause**: Transaction would revert on-chain

**Solutions**:
1. Check pool liquidity on Uniswap V3 and SushiSwap
2. Verify WETH is available on Aave for flash loans
3. Try a smaller flash loan amount
4. Check that WETH/USDC pairs exist on both DEXes

### "Insufficient funds" Error

**Cause**: Not enough ETH for gas

**Solution**: Add more ETH to your wallet

### Transaction Succeeds but Shows Loss

**Expected**: Most arbitrage opportunities are taken by MEV bots or don't exist

**Recommendations**:
- Use off-chain profit calculation before submitting
- Monitor mempool for opportunities
- Consider private transaction relays to avoid MEV

## Monitoring and Maintenance

### Regular Checks

1. **Balance Monitoring**: Run `checkBalances.ts` regularly
2. **Gas Price Monitoring**: Ensure you're not overpaying for gas
3. **Contract Balance**: Contract should have 0 balance between trades

### Emergency Procedures

If funds get stuck in the contract:

```typescript
// Withdraw stuck ERC20 tokens
await flashSwapV2.emergencyWithdraw(TOKEN_ADDRESS);

// Withdraw stuck ETH
await flashSwapV2.emergencyWithdrawETH();
```

## Appendix: Base Mainnet Addresses

All addresses configured in `config/addresses.ts`:

```typescript
base: {
  weth: "0x4200000000000000000000000000000000000006",
  usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
  sushiRouter: "0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891",
  aavePool: "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
  aaveAddressesProvider: "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D"
}
```

## Support and Questions

If you encounter issues:
1. Review this guide thoroughly
2. Check Basescan for transaction details
3. Review contract events and error messages
4. Verify all configuration in `config/addresses.ts`

---

**Last Updated**: 2025-11-15
**Network**: Base Mainnet (Chain ID: 8453)
**Contract Version**: FlashSwapV2 v4.0
