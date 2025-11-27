# Base Mainnet Deployment - Quick Reference

**Last Updated**: 2025-11-15  
**Status**: ✅ Ready for Deployment

---

## 🎯 Four-Step Deployment

```bash
# 1. Deploy Contract
npx hardhat run scripts/deployFlashSwapV2.ts --network base

# 2. Set Address in .env
echo "FLASHSWAP_V2_ADDRESS=<deployed_address>" >> .env

# 3. Verify Contract on Basescan (Optional but Recommended)
npx hardhat verify --network base <deployed_address> \
  0x2626664c2603336E57B271c5C0b26F421741e481 \
  0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891 \
  0xA238Dd80C259a72e81d7e4664a9801593F98d1c5 \
  0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D

# 4. Test with 0.001 WETH
npx hardhat run scripts/runArbitrage.ts --network base
```

**📚 Full Guide**: [BASE_MAINNET_DEPLOYMENT.md](./BASE_MAINNET_DEPLOYMENT.md)

---

## ✅ Pre-Flight Checklist

- [ ] Run: `npx hardhat run scripts/preDeploymentChecklist.ts --network base`
- [ ] Wallet has 0.01+ ETH for deployment gas
- [ ] `BASE_RPC_URL` set in `.env`
- [ ] `WALLET_PRIVATE_KEY` set in `.env`
- [ ] `BASESCAN_API_KEY` set in `.env` (for contract verification)
- [ ] Reviewed [PRE_MAINNET_REVIEW.md](./PRE_MAINNET_REVIEW.md)

---

## 📋 What Was Reviewed

### Contract (FlashSwapV2.sol)
- ✅ Aave V3 integration correct
- ✅ Access control (onlyOwner)
- ✅ Reentrancy protection
- ✅ Single-owner profit distribution
- ✅ Base mainnet addresses

### Scripts Updated
- ✅ `runArbitrage.ts` - WETH→USDC→WETH, 0.001 WETH
- ✅ `runMultiHopArbitrage.ts` - Base mainnet safety
- ✅ `deployFlashSwapV2.ts` - Uses config/addresses.ts

### New Safety Scripts
- ✅ `preDeploymentChecklist.ts` - Validate before deploy
- ✅ `dryRunArbitrage.ts` - Simulate without gas

---

## 🔍 Current Configuration

### Base Mainnet Addresses (Verified)
```
WETH:        0x4200000000000000000000000000000000000006
USDC:        0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
UniV3 Router: 0x2626664c2603336E57B271c5C0b26F421741e481
Sushi Router: 0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891
Aave Pool:   0xA238Dd80C259a72e81d7e4664a9801593F98d1c5
Aave Provider: 0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D
```

### Your Wallet (Base)
```
Address: 0x119F4857DD9B2e8d1B729E8C3a8AE58fC867E91B
ETH:     ~0.007 (check with checkBalances.ts)
WETH:    0.003
USDC:    9.369229
```

### Arbitrage Route (Initial Test)
```
1. Borrow:   0.001 WETH via Aave flash loan
2. Swap 1:   WETH → USDC via Uniswap V3 (0.05% fee)
3. Swap 2:   USDC → WETH via SushiSwap (0.3% fee)
4. Repay:    Loan + Aave fee (0.09%)
5. Profit:   Goes to your wallet (owner)
```

---

## 🛡️ Safety Features

### Contract Security
- ✅ ReentrancyGuard on all entry points
- ✅ onlyOwner flash loan initiation
- ✅ Callback validation (prevents spoofing)
- ✅ SafeERC20 for all token operations
- ✅ Emergency withdraw functions

### Deployment Safety
- ✅ Very small test amount (0.001 WETH = ~$2-3)
- ✅ Pre-deployment validation script
- ✅ Dry-run simulation (no gas cost)
- ✅ Clear error messages
- ✅ Transaction hash for debugging

---

## 📊 Expected Costs

### Deployment
- Gas: ~0.005-0.01 ETH ($10-20 @ $2000/ETH)
- Time: 5-10 minutes (5 confirmations)

### First Test Transaction
- Gas: ~0.0001-0.0005 ETH ($0.20-1.00)
- Flash loan fee: ~0.00001 WETH
- **Total risk**: ~$3-5 if unprofitable

---

## ⚠️ Important Warnings

1. **Most trades will be unprofitable**
   - MEV bots take most opportunities
   - Flash loan fees reduce margins
   - Gas costs can exceed profits

2. **This is for testing/learning**
   - Start with tiny amounts
   - Scale up gradually
   - Monitor results closely

3. **Not financial advice**
   - Personal use only
   - Your own capital
   - Understand the risks

---

## 🔧 Useful Commands

```bash
# Check wallet balances
npx hardhat run scripts/checkBalances.ts --network base

# List configured addresses
npx hardhat run scripts/listKnownAddresses.ts --network base

# Pre-deployment check
npx hardhat run scripts/preDeploymentChecklist.ts --network base

# Dry-run (safe simulation)
npx hardhat run scripts/dryRunArbitrage.ts --network base

# Deploy contract
npx hardhat run scripts/deployFlashSwapV2.ts --network base

# Verify contract on Basescan (requires BASESCAN_API_KEY in .env)
npx hardhat verify --network base <CONTRACT_ADDRESS> \
  0x2626664c2603336E57B271c5C0b26F421741e481 \
  0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891 \
  0xA238Dd80C259a72e81d7e4664a9801593F98d1c5 \
  0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D

# Execute arbitrage
npx hardhat run scripts/runArbitrage.ts --network base

# View transaction on Basescan
# https://basescan.org/tx/<TX_HASH>

# View contract on Basescan
# https://basescan.org/address/<CONTRACT_ADDRESS>
```

---

## 📖 Documentation

| Document | Purpose |
|----------|---------|
| [PRE_MAINNET_REVIEW.md](./PRE_MAINNET_REVIEW.md) | Comprehensive review findings |
| [BASE_MAINNET_DEPLOYMENT.md](./BASE_MAINNET_DEPLOYMENT.md) | Detailed deployment guide |
| [SECURITY_REVIEW_FLASHSWAPV2.md](./SECURITY_REVIEW_FLASHSWAPV2.md) | Security analysis |
| [QUICKSTART.md](./QUICKSTART.md) | Quick start guide |
| [LEGAL_POSITION.md](./LEGAL_POSITION.md) | Legal stance |

---

## ✅ What's Been Done

### Contract Review
- [x] Aave V3 integration validated
- [x] Access control verified
- [x] Reentrancy protection confirmed
- [x] Token handling reviewed
- [x] Callback validation checked
- [x] Profit distribution verified

### Script Updates
- [x] Route updated to WETH→USDC→WETH
- [x] Amount reduced to 0.001 WETH
- [x] Fee tiers optimized (0.05% UniV3, 0.3% Sushi)
- [x] Error handling improved
- [x] Logging enhanced

### Safety Tools Created
- [x] Pre-deployment checklist
- [x] Dry-run simulation
- [x] Deployment guide
- [x] Security review
- [x] This quick reference

---

## 🚀 Next Steps (In Order)

1. **Review this document** ← You are here
2. **Run pre-deployment checklist**
3. **Deploy FlashSwapV2 contract**
4. **Update .env with contract address**
5. **Run dry-run simulation**
6. **Execute first test (0.001 WETH)**
7. **Analyze results**
8. **Scale up gradually if successful**

---

## 🆘 If Something Goes Wrong

### Gas Estimation Fails
- Check pool liquidity on DEXes
- Verify WETH available on Aave
- Try smaller amount

### Transaction Reverts
- Check error message on Basescan
- Run dry-run simulation again
- Verify addresses in config

### Need Help
1. Review error messages
2. Check Basescan transaction details
3. Consult deployment guide
4. Review contract events

---

## 📞 Support Resources

- Basescan: https://basescan.org
- Base Docs: https://docs.base.org
- Aave Docs: https://docs.aave.com
- Uniswap Docs: https://docs.uniswap.org

---

**Status**: ✅ All systems ready for Base mainnet deployment

**Last Verified**: 2025-11-15

**Confidence Level**: HIGH - All checks passed, safety features in place

---

*Remember: Start small (0.001 WETH), test thoroughly, scale gradually. Good luck! 🚀*
