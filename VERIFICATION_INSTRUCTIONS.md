# Contract Verification Instructions for Base Mainnet

## Overview

This document provides the exact commands needed to verify your deployed FlashSwapV2 contract on Basescan.

## Prerequisites

1. Ensure `BASESCAN_API_KEY` is set in your `.env` file:
   ```bash
   BASESCAN_API_KEY=YOUR_BASESCAN_API_KEY_HERE
   ```
   
   Get a free API key from: https://basescan.org/myapikey

2. Ensure you have the contract address (either from deployment or the existing deployment)

## Verification Command

### For the Deployed Contract at 0xA96D8f48f5222334dEdf43736097ed7aD653ca88

```bash
npx hardhat verify --network base \
  0xA96D8f48f5222334dEdf43736097ed7aD653ca88 \
  0x2626664c2603336E57B271c5C0b26F421741e481 \
  0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891 \
  0xA238Dd80C259a72e81d7e4664a9801593F98d1c5 \
  0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D
```

### For Any Other Deployed Contract

```bash
npx hardhat verify --network base \
  <YOUR_CONTRACT_ADDRESS> \
  0x2626664c2603336E57B271c5C0b26F421741e481 \
  0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891 \
  0xA238Dd80C259a72e81d7e4664a9801593F98d1c5 \
  0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D
```

## Constructor Arguments Explanation

The FlashSwapV2 contract constructor takes 4 arguments in this order:

1. **Uniswap V3 Router**: `0x2626664c2603336E57B271c5C0b26F421741e481`
2. **SushiSwap Router**: `0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891`
3. **Aave V3 Pool**: `0xA238Dd80C259a72e81d7e4664a9801593F98d1c5`
4. **Aave Addresses Provider**: `0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D`

## Expected Output

If successful, you should see:

```
Successfully submitted source code for contract
contracts/FlashSwapV2.sol:FlashSwapV2 at 0xA96D8f48f5222334dEdf43736097ed7aD653ca88
for verification on the block explorer. Waiting for verification result...

Successfully verified contract FlashSwapV2 on Basescan.
https://basescan.org/address/0xA96D8f48f5222334dEdf43736097ed7aD653ca88#code
```

## Troubleshooting

### Error: "Trying to verify a contract in a network with chain id 8453"

**Solution**: This issue has been fixed. Make sure you have the latest version of `hardhat.config.ts` with Base custom chain configuration.

### Error: "Invalid API Key"

**Solution**: Check that `BASESCAN_API_KEY` is correctly set in your `.env` file.

### Error: "Already verified"

**Solution**: The contract is already verified! You can view it at:
https://basescan.org/address/0xA96D8f48f5222334dEdf43736097ed7aD653ca88#code

### Error: "Failed to send contract verification request"

**Solution**: 
1. Ensure your contract is fully deployed and confirmed on Base
2. Wait a few minutes after deployment before attempting verification
3. Check that you're connected to Base mainnet (not testnet)

## Running the Arbitrage Script

After verification (or even before), you can run the arbitrage script:

```bash
export FLASHSWAP_V2_ADDRESS=0xA96D8f48f5222334dEdf43736097ed7aD653ca88
npx hardhat run scripts/runArbitrage.ts --network base
```

This will:
- Use 0.001 WETH for the initial test (very small amount for safety)
- Execute WETH → USDC → WETH route
- Use Uniswap V3 and SushiSwap on Base
- Log clear information about the transaction
- Handle any errors gracefully

## What's Been Fixed

1. ✅ **Hardhat Verification**: Added Base (chainId 8453) as a custom chain with Basescan API configuration
2. ✅ **JavaScript Error**: Fixed undefined `uniswapV3` reference in `scripts/runArbitrage.ts`
3. ✅ **Documentation**: Updated all deployment guides with verification instructions

## Related Documentation

- [BASE_MAINNET_DEPLOYMENT.md](./BASE_MAINNET_DEPLOYMENT.md) - Complete deployment guide
- [DEPLOYMENT_QUICK_REFERENCE.md](./DEPLOYMENT_QUICK_REFERENCE.md) - Quick reference
- [PRE_MAINNET_REVIEW.md](./PRE_MAINNET_REVIEW.md) - Security review

---

**Last Updated**: 2025-11-16  
**Status**: ✅ Ready for verification
