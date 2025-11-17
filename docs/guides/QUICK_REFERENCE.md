# Quick Reference: Running Fixed Arbitrage Scripts

> **📋 Legal & Intent:** See [LEGAL_POSITION.md](./LEGAL_POSITION.md) for:
> - The personal-use-only nature of this system
> - The 70% profit allocation policy toward US debt-related actions  
> - The non-solicitation and no-outside-capital stance

## 📍 Centralized Address Configuration

**All network addresses are now managed in one place:** `config/addresses.ts`

This file is the **single source of truth** for:
- Core tokens (WETH, USDC, DAI)
- DEX routers (Uniswap V2/V3, SushiSwap)
- Aave V3 pools and providers
- Network-specific example pools

### View Addresses for a Network

```bash
npx hardhat run scripts/listKnownAddresses.ts --network baseSepolia
npx hardhat run scripts/listKnownAddresses.ts --network base
```

### Add Addresses for a New Network

Edit `config/addresses.ts` and add entries to the `ADDRESSES` object:

```typescript
export const ADDRESSES: Record<NetworkKey, KnownAddresses> = {
  yourNetwork: {
    weth: "0x...",
    usdc: "0x...",
    // ... other addresses
  },
  // ...
};
```

All deployment and arbitrage scripts automatically use these addresses based on the `--network` flag.

---

## ✅ Issue Resolved

**Error:** `execution reverted: 27` on gas estimation  
**Cause:** DAI not active on Aave Base Sepolia (Error 27 = RESERVE_INACTIVE)  
**Fix:** Switched to WETH with testnet-safe amounts + error decoding

---

## 🚀 Run Scripts on Base Sepolia

### 1. Set Environment Variables
```bash
export FLASHSWAP_V2_ADDRESS=0x65076d228B01957679Ea2165a41E99340Acf2A69
export BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
export WALLET_PRIVATE_KEY=your_private_key_here
```

### 2. Run Single-Hop Arbitrage
```bash
npx hardhat run scripts/runArbitrage.ts --network baseSepolia
```

### 3. Run Multi-Hop Arbitrage
```bash
npx hardhat run scripts/runMultiHopArbitrage.ts --network baseSepolia
```

---

## 📊 Current Testnet Configuration

| Parameter | Value | Reason |
|-----------|-------|--------|
| Flash Loan Asset | WETH | More reliable on testnet than DAI |
| Loan Amount | 0.1 WETH | Testnet-safe (~$200 value) |
| Min Profit | 0.01 ETH | Realistic for testnet liquidity |
| DEX Pair | SushiSwap ↔ Uniswap V2 | Standard V2 DEXes |

---

## ⚙️ Mainnet Configuration

To switch to Base Mainnet, update in scripts:

```typescript
// Change asset if desired
const FLASH_LOAN_ASSET = DAI_ADDRESS_BASE; // DAI likely active on mainnet

// Increase amount for profitability
const LOAN_AMOUNT = ethers.utils.parseUnits("1000", 18); // 1000+ tokens
```

Update `.env`:
```bash
export BASE_RPC_URL=https://mainnet.base.org
```

Run with mainnet network:
```bash
npx hardhat run scripts/runArbitrage.ts --network base
```

---

## 🔍 Understanding Errors

The scripts now decode Aave errors automatically:

| Code | Meaning | Solution |
|------|---------|----------|
| **27** | **RESERVE_INACTIVE** | **Use different asset (e.g., WETH)** |
| 26 | INVALID_AMOUNT | Increase loan amount > 0 |
| 91 | FLASHLOAN_DISABLED | Asset doesn't support flash loans |
| 13 | INVALID_EXECUTOR_RETURN | Check contract logic |
| 49 | INCONSISTENT_PARAMS | Verify params array lengths match |

---

## ⚠️ Expected Testnet Behavior

**✅ Success:**
- Connects to FlashSwapV2
- Estimates gas with WETH
- Shows clear error messages

**⚠️ Graceful Failures (Expected):**
- "No liquidity in pool" - Normal on testnet
- "Token pair doesn't exist" - Limited testnet pools
- "No arbitrage opportunities" - Expected due to low liquidity

All errors include:
- Decoded message
- Troubleshooting steps
- Clear explanation

---

## 📁 Files Changed

1. `config/addresses.ts` - **NEW**: Centralized address configuration
2. `scripts/listKnownAddresses.ts` - **NEW**: Helper to view addresses
3. `scripts/deployFlashSwapV2.ts` - Updated to use centralized config
4. `scripts/runArbitrage.ts` - Updated to use centralized config + WETH support
5. `scripts/runMultiHopArbitrage.ts` - Updated to use centralized config + WETH support
6. `QUICK_REFERENCE.md` - Added address config documentation

---

## 🎯 Key Points

1. **Error 27 is now explained**: RESERVE_INACTIVE = asset not in Aave
2. **WETH is safe for testnet**: Almost always available
3. **Amounts are testnet-safe**: 0.1 WETH to avoid issues
4. **Errors are decoded**: No more cryptic "27" messages
5. **Mainnet ready**: Just update asset + amounts

---

## 📚 Full Documentation

- **Technical Details:** See `ARBITRAGE_SCRIPT_FIX_SUMMARY.md`
- **PR Summary:** See `PR_SUMMARY.md`
- **Aave Errors:** `node_modules/@aave/core-v3/contracts/protocol/libraries/helpers/Errors.sol`

---

## 🛠️ Troubleshooting

**Still getting Error 27?**
1. Verify asset is active on target network's Aave deployment
2. Check Aave docs for supported assets
3. Try WETH instead (usually safe bet)

**Gas estimation fails?**
1. Check pool liquidity exists on testnet
2. Verify token pair exists on both DEXes
3. Try smaller amounts

**Transaction reverts?**
1. Check decoded error message for specific issue
2. Verify minOut values aren't too high
3. Ensure pools have sufficient liquidity

---

**Ready to test!** Run the scripts and check the output for detailed diagnostics. 🚀
