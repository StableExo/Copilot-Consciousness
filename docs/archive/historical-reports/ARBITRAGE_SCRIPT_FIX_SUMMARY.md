# Arbitrage Script Fix Summary - Error 27 Resolution

## Problem Statement

The arbitrage scripts were failing with `execution reverted: 27` on gas estimation when running against Base Sepolia testnet.

## Root Cause Analysis

### Error Code 27: RESERVE_INACTIVE

After analyzing the Aave V3 error codes, we identified that **error code "27"** corresponds to:

```solidity
string public constant RESERVE_INACTIVE = '27'; // 'Action requires an active reserve'
```

**Location in Aave V3 Code:**
`node_modules/@aave/core-v3/contracts/protocol/libraries/helpers/Errors.sol:36`

**Meaning:** The asset being requested for a flash loan (in our case, DAI) is not configured as an active reserve in the Aave V3 Pool on Base Sepolia testnet.

### Why This Happens on Base Sepolia

Testnets typically have limited token support compared to mainnet:
- **DAI** may not be deployed or activated on Aave Base Sepolia
- **WETH** is almost always available as it's the native wrapped token
- Test pools often have minimal or no liquidity
- Not all token pairs exist on testnet DEXes

## Changes Made

### 1. Updated `scripts/runArbitrage.ts`

**Key Changes:**

1. **Error Decoding Utility** - Added `decodeAaveError()` function to translate Aave error codes into human-readable messages:
   - Error 27: RESERVE_INACTIVE
   - Error 26: INVALID_AMOUNT
   - Error 91: FLASHLOAN_DISABLED
   - Error 13: INVALID_FLASHLOAN_EXECUTOR_RETURN
   - Error 49: INCONSISTENT_FLASHLOAN_PARAMS

2. **Switched from DAI to WETH**:
   ```typescript
   // OLD: Used DAI (not active on testnet)
   const LOAN_AMOUNT = ethers.utils.parseUnits("1000", 18); // 1,000 DAI
   
   // NEW: Uses WETH (more reliable on testnet)
   const FLASH_LOAN_ASSET = WETH_ADDRESS_BASE;
   const LOAN_AMOUNT = ethers.utils.parseUnits("0.1", 18); // 0.1 WETH (~$200)
   ```

3. **Reduced Loan Amount** - Changed from 1000 tokens to 0.1 WETH to be testnet-safe

4. **Enhanced Error Handling**:
   - Gas estimation before transaction to catch errors early
   - Detailed error messages with troubleshooting suggestions
   - Transaction URL logging for Base Sepolia block explorer

5. **Added Comprehensive Comments**:
   - Clear TESTNET vs MAINNET configuration sections
   - Explanations of each parameter
   - Instructions for adapting to production

### 2. Updated `scripts/runMultiHopArbitrage.ts`

**Key Changes:**

1. **Same error decoding utility** as runArbitrage.ts

2. **Adjusted amounts for testnet**:
   ```typescript
   // OLD
   minProfitThreshold: BigInt(ethers.utils.parseEther("10").toString())
   startAmount = BigInt(ethers.utils.parseEther("1000").toString())
   
   // NEW
   minProfitThreshold: BigInt(ethers.utils.parseEther("0.01").toString()) // 0.01 ETH
   startAmount = BigInt(ethers.utils.parseEther("0.1").toString()) // 0.1 WETH
   ```

3. **Enhanced logging**:
   - Clear testnet mode indicators
   - Warnings about expected testnet limitations
   - Graceful handling when no opportunities found

4. **Gas estimation** before transaction submission

5. **Better error messages** explaining common testnet issues

### 3. Contract Analysis

**No changes were made to `contracts/FlashSwapV2.sol`** as requested. The contract is functioning correctly; the issue was in how the scripts were calling it.

## How to Use

### For Base Sepolia Testnet (Current Configuration)

1. Set environment variables:
   ```bash
   export FLASHSWAP_V2_ADDRESS=0x65076d228B01957679Ea2165a41E99340Acf2A69
   export BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
   export WALLET_PRIVATE_KEY=your_private_key_here
   ```

2. Run the scripts:
   ```bash
   # Single-hop arbitrage
   npx hardhat run scripts/runArbitrage.ts --network baseSepolia
   
   # Multi-hop arbitrage
   npx hardhat run scripts/runMultiHopArbitrage.ts --network baseSepolia
   ```

### Expected Behavior on Testnet

The scripts will now:
- ✅ Connect to FlashSwapV2 successfully
- ✅ Attempt gas estimation with WETH (not DAI)
- ✅ Provide clear error messages if pools don't exist
- ✅ Decode Aave errors for easier debugging
- ⚠️  May still fail gracefully if:
  - Pools lack liquidity on testnet
  - Token pairs don't exist
  - No arbitrage opportunities exist

### For Other Networks

#### Base Mainnet

1. Update configuration in the scripts:
   ```typescript
   const FLASH_LOAN_ASSET = DAI_ADDRESS_BASE; // DAI is likely active on mainnet
   const LOAN_AMOUNT = ethers.utils.parseUnits("1000", 18); // Increase to profitable amount
   ```

2. Update `.env`:
   ```bash
   export BASE_RPC_URL=https://mainnet.base.org
   ```

3. Run:
   ```bash
   npx hardhat run scripts/runArbitrage.ts --network base
   ```

#### Other Testnets

1. Check which assets are active on the specific testnet's Aave deployment
2. Update token addresses in the scripts
3. Keep amounts small (0.1-10 units) for safety
4. Update network configuration in `hardhat.config.ts`

## Testing Performed

1. ✅ TypeScript compilation successful (`npm run build`)
2. ✅ Solidity compilation successful (`npx hardhat compile`)
3. ✅ No breaking changes to contract logic
4. ✅ Error decoding utility tested with known error codes
5. ✅ Scripts now provide actionable error messages

## Aave Error Code Reference

Common Aave V3 errors you might encounter:

| Code | Name | Description |
|------|------|-------------|
| 27 | RESERVE_INACTIVE | The asset is not an active reserve in Aave |
| 26 | INVALID_AMOUNT | Amount must be greater than 0 |
| 91 | FLASHLOAN_DISABLED | Flash loans disabled for this asset |
| 13 | INVALID_FLASHLOAN_EXECUTOR_RETURN | Flash loan executor returned invalid value |
| 49 | INCONSISTENT_FLASHLOAN_PARAMS | Flash loan parameters are inconsistent |

**Full Reference:** `node_modules/@aave/core-v3/contracts/protocol/libraries/helpers/Errors.sol`

## Recommendations

### For Production Use

1. **Always verify asset availability** on the target network's Aave deployment
2. **Start with small amounts** on testnet to validate functionality
3. **Use price oracles** to verify arbitrage opportunities exist before executing
4. **Set realistic minOut values** to ensure profitability after fees
5. **Monitor gas prices** and adjust accordingly
6. **Test thoroughly** on testnet before mainnet deployment

### For Further Development

1. Consider adding a pre-flight check to query Aave for active reserves
2. Implement dynamic token selection based on available reserves
3. Add pool liquidity checks before attempting swaps
4. Create a configuration file for network-specific parameters
5. Add integration tests with forked testnet state

## Summary

- **Error 27 = RESERVE_INACTIVE** - DAI was not active on Aave Base Sepolia
- **Solution:** Switched to WETH and reduced amounts for testnet safety
- **Added:** Comprehensive error decoding and helpful diagnostics
- **Result:** Scripts now fail gracefully with clear, actionable error messages

The scripts are now properly configured for Base Sepolia testnet and include clear instructions for adapting to other networks.
