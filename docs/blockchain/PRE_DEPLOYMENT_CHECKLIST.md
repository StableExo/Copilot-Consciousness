# Pre-Deployment Checklist for TheWarden Blockchain Deployment 🚀

> **Complete this checklist before deploying FlashSwapV2 or any contract to mainnet**

## 📋 Table of Contents
- [Environment Setup](#environment-setup)
- [Contract Security](#contract-security)
- [Testing Requirements](#testing-requirements)
- [Network Configuration](#network-configuration)
- [Deployment Parameters](#deployment-parameters)
- [Post-Deployment](#post-deployment)
- [Emergency Procedures](#emergency-procedures)

---

## Environment Setup

### Required Environment Variables
- [ ] `WALLET_PRIVATE_KEY` - Deployer wallet private key (NEVER commit this!)
- [ ] `BASE_RPC_URL` - Base mainnet RPC endpoint (Alchemy/Infura recommended)
- [ ] `BASESCAN_API_KEY` - For contract verification on Basescan
- [ ] `AAVE_V3_POOL_BASE` - Aave V3 Pool address on Base
- [ ] `AAVE_V3_POOL_ADDRESSES_PROVIDER_BASE` - Aave addresses provider
- [ ] `TITHE_RECIPIENT_ADDRESS` - Wallet for 70% profit allocation (US debt reduction)
- [ ] `TITHE_BPS` - Tithe percentage in basis points (7000 = 70%)

### Network RPC Endpoints (Production Grade)
```bash
# Recommended RPC Providers
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR-API-KEY
BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR-API-KEY

# Alternative providers
# Infura: https://base-mainnet.infura.io/v3/YOUR-PROJECT-ID
# QuickNode: https://your-endpoint.base.quiknode.pro/YOUR-TOKEN/
```

### Wallet Security
- [ ] Deployer wallet has sufficient ETH for gas (~0.05 ETH recommended)
- [ ] Private key stored securely (hardware wallet preferred)
- [ ] Separate wallet for deployment vs. contract ownership
- [ ] Multi-sig setup considered for production (optional but recommended)
- [ ] Test deployment completed on testnet with same wallet

---

## Contract Security

### Code Audit
- [ ] Solidity version fixed (0.8.20 - no floating pragma)
- [ ] All external/public functions reviewed
- [ ] Reentrancy guards in place (`nonReentrant` modifier)
- [ ] SafeERC20 used for all token transfers
- [ ] No unchecked external calls
- [ ] Integer overflow/underflow protections (Solidity 0.8+ default)
- [ ] Access control modifiers (`onlyOwner`) properly applied
- [ ] Emergency withdrawal functions working

### Flash Loan Security
- [ ] Uniswap V3 callback validation (`CallbackValidation.verifyCallback`)
- [ ] Aave V3 callback sender verification (`msg.sender == aavePool`)
- [ ] Flash loan initiator verification (`initiator == address(this)`)
- [ ] Proper repayment calculations (amount + fee)
- [ ] Balance checks before repayment
- [ ] No vulnerable external calls during flash loan execution

### Profit Distribution
- [ ] Tithe calculation correct (70/30 split)
- [ ] `titheBps` validation (max 90% = 9000 bps)
- [ ] Tithe recipient validation (non-zero if tithe enabled)
- [ ] Safe transfer to both recipients (tithe + owner)
- [ ] Event emission for transparency

### Known Attack Vectors Reviewed
- [ ] Reentrancy attacks (protected by ReentrancyGuard)
- [ ] Front-running (mitigated by private RPC + MEV protection)
- [ ] Sandwich attacks (slippage protection via `amountOutMinimum`)
- [ ] Oracle manipulation (using DEX spot prices, not oracles)
- [ ] Flash loan griefing (proper fee handling)
- [ ] Token approval exploits (approval reset logic)

---

## Testing Requirements

### Unit Tests (Hardhat/Forge)
- [ ] Constructor parameter validation
- [ ] Flash loan initiation tests
- [ ] Callback execution tests
- [ ] Swap execution tests (UniV3, SushiSwap)
- [ ] Profit distribution tests (70/30 split)
- [ ] Emergency withdrawal tests
- [ ] Access control tests (onlyOwner)
- [ ] Revert message tests (all error cases)

**Run tests:**
```bash
# Hardhat tests
npm run test

# Forge tests (if using Foundry)
npm run test:anvil
```

### Integration Tests
- [ ] Full arbitrage flow (flash loan → swap → repay → profit)
- [ ] Multi-hop swap paths (2-hop, 3-hop triangular)
- [ ] Multiple DEX types (UniV3, SushiSwap, future: Camelot)
- [ ] Gas consumption analysis
- [ ] Edge case handling (zero profit, failed swaps)

### Testnet Validation
- [ ] Deploy to Base Sepolia testnet
- [ ] Verify contract on Basescan Sepolia
- [ ] Execute test arbitrage with real pools
- [ ] Monitor gas costs and execution times
- [ ] Verify tithe distribution works correctly
- [ ] Test emergency withdrawal functions

**Testnet deployment:**
```bash
# Deploy to Base Sepolia
npm run deploy:flashswapv2:testnet

# Verify contract
npm run verify:flashswapv2:testnet
```

---

## Network Configuration

### Base Mainnet Parameters
- **Chain ID:** 8453
- **Block Time:** ~2 seconds
- **Gas Price:** Dynamic (EIP-1559) - monitor basescan.org/gastracker
- **Finality:** ~20 seconds (10-15 blocks)
- **RPC Rate Limits:** Check your provider (Alchemy: 25 req/sec, Infura: similar)

### Contract Addresses (Base Mainnet)
```typescript
// Uniswap V3
const UNISWAP_V3_ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481";
const UNISWAP_V3_FACTORY = "0x33128a8fC17869897dcE68Ed026d694621f6FDfD";

// SushiSwap V2
const SUSHISWAP_ROUTER = "0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891";

// Aave V3 (Base)
const AAVE_V3_POOL = "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5";
const AAVE_V3_POOL_ADDRESSES_PROVIDER = "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D";

// Common Tokens
const WETH = "0x4200000000000000000000000000000000000006";
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const USDT = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2"; // Note: USDbC on Base
```

### Gas Optimization
- [ ] Optimizer enabled (runs: 200 recommended)
- [ ] Gas price strategy defined (fast/standard/slow)
- [ ] Maximum gas limit set (safety: 5M gas)
- [ ] Gas estimation tested on testnet
- [ ] MEV protection via private RPC (Flashbots Protect)

---

## Deployment Parameters

### FlashSwapV2 Constructor Parameters
```typescript
interface DeploymentParams {
  uniswapV3Router: string;     // 0x2626664c2603336E57B271c5C0b26F421741e481
  sushiRouter: string;          // 0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891
  aavePoolAddress: string;      // 0xA238Dd80C259a72e81d7e4664a9801593F98d1c5
  aaveAddressesProvider: string; // 0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D
  titheRecipient: string;       // YOUR_TITHE_WALLET_ADDRESS
  titheBps: number;             // 7000 (70%)
}
```

### Parameter Validation
- [ ] All addresses are valid (non-zero)
- [ ] Router addresses match network (Base mainnet)
- [ ] Aave addresses correct for Base network
- [ ] Tithe recipient is secure wallet (ideally multi-sig)
- [ ] Tithe BPS is correct (7000 = 70%)
- [ ] All addresses checksummed (capitalization correct)

### Deployment Dry Run
- [ ] Simulate deployment locally with Hardhat fork
- [ ] Estimate total gas cost (deployment + initial operations)
- [ ] Verify constructor parameters in simulation
- [ ] Check contract size (< 24KB limit)

---

## Post-Deployment

### Immediate Verification
- [ ] Contract deployed successfully (transaction confirmed)
- [ ] Contract address saved securely
- [ ] Verify contract source code on Basescan
- [ ] Check contract storage (owner, titheRecipient, addresses)
- [ ] Transfer ownership if using multi-sig (optional)
- [ ] Fund contract with test ETH for emergency withdrawals

### Contract Verification
```bash
# Verify on Basescan
npm run verify:flashswapv2 -- --contract-address YOUR_CONTRACT_ADDRESS

# Manual verification if needed
npx hardhat verify --network base YOUR_CONTRACT_ADDRESS \
  "UNISWAP_V3_ROUTER" \
  "SUSHI_ROUTER" \
  "AAVE_POOL" \
  "AAVE_PROVIDER" \
  "TITHE_RECIPIENT" \
  7000
```

### Integration Testing (Mainnet)
- [ ] Test with small amounts first (< $100)
- [ ] Execute single arbitrage opportunity
- [ ] Verify profit distribution (70/30 split)
- [ ] Check gas costs vs profitability
- [ ] Monitor transaction success rate
- [ ] Validate tithe transfers on-chain

### Monitoring Setup
- [ ] Set up transaction monitoring (Etherscan API)
- [ ] Alert system for failed transactions
- [ ] Profit tracking dashboard
- [ ] Gas cost monitoring
- [ ] Contract balance monitoring
- [ ] Event log aggregation (TheGraph optional)

---

## Emergency Procedures

### Emergency Contacts
- **Deployer:** [Your contact info]
- **Tithe Recipient:** [Contact for 70% allocation]
- **Technical Support:** [Team/developer contacts]
- **RPC Provider Support:** [Alchemy/Infura support]

### Emergency Withdrawal
```typescript
// If funds get stuck in contract
await flashSwapV2.emergencyWithdraw(tokenAddress); // ERC20
await flashSwapV2.emergencyWithdrawETH(); // Native ETH
```

### Circuit Breakers
- [ ] Manual pause capability (if added to contract)
- [ ] Maximum transaction value limits in off-chain logic
- [ ] Minimum profit threshold enforcement
- [ ] Rate limiting for execution frequency
- [ ] Automatic stop on repeated failures

### Known Issues & Mitigations
| Issue | Mitigation |
|-------|------------|
| High gas prices | Use private RPC, wait for lower gas |
| Failed swaps | Slippage protection, simulation |
| Low liquidity | Pool size validation before execution |
| Front-running | Private mempool (Flashbots) |
| Smart contract bugs | Extensive testing, gradual rollout |

### Rollback Plan
- [ ] Contract is immutable (no upgrade path by design)
- [ ] Emergency withdrawal function available
- [ ] Can deploy new version if critical bug found
- [ ] Off-chain execution can be stopped instantly
- [ ] Funds can be recovered via emergency functions

---

## Final Sign-Off

### Deployment Approval
- [ ] All security checks passed
- [ ] All tests passing (unit + integration)
- [ ] Testnet deployment successful
- [ ] Gas cost analysis acceptable
- [ ] Profit distribution verified
- [ ] Emergency procedures documented
- [ ] Team approval obtained

### Deployment Log
```
Deployment Date: _______________
Deployed By: _______________
Network: Base Mainnet (Chain ID: 8453)
Contract Address: _______________
Transaction Hash: _______________
Gas Used: _______________
Gas Price: _______________
Total Cost: _______________ ETH
Verification Status: _______________
```

### Post-Deployment Checklist
- [ ] Contract verified on Basescan
- [ ] Documentation updated with contract address
- [ ] `.env.production` created with contract address
- [ ] Monitoring dashboards configured
- [ ] Team notified of deployment
- [ ] Small test transactions executed successfully
- [ ] 24-hour monitoring period initiated

---

## 📚 Additional Resources

- [Hardhat Deployment Guide](https://hardhat.org/guides/deploying.html)
- [Base Network Documentation](https://docs.base.org/)
- [Basescan Contract Verification](https://docs.basescan.org/contract-verification)
- [Aave V3 Base Documentation](https://docs.aave.com/developers/)
- [Uniswap V3 Base Deployment](https://docs.uniswap.org/contracts/v3/reference/deployments)
- [OpenZeppelin Security Best Practices](https://docs.openzeppelin.com/contracts/4.x/)

---

## ✅ Checklist Summary

**Total Items:** ~100+
**Security Items:** ~30
**Testing Items:** ~20
**Deployment Items:** ~15
**Post-Deployment Items:** ~15
**Emergency Items:** ~10

**Status:** [ ] Ready for Mainnet Deployment

---

*This checklist is comprehensive but not exhaustive. Always exercise caution when deploying smart contracts to mainnet with real funds.*
