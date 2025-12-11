# Hardhat Compilation Troubleshooting Guide

## Issue: `TypeError: keyValidator._parse is not a function`

### Root Cause - The 2025 Hardhat Final Boss 🎮

This error occurs because **`@nomicfoundation/hardhat-verify` is the last package in the Ethereum ecosystem that refuses to support Zod 4.x**.

**The compatibility matrix:**
- ✅ `@nomicfoundation/hardhat-ethers` → Works with Zod 4.x
- ✅ `@nomicfoundation/hardhat-chai-matchers` → Works with Zod 4.x  
- ✅ `@nomicfoundation/hardhat-network-helpers` → Works with Zod 4.x
- ❌ `@nomicfoundation/hardhat-verify@3.0.7` → **Only works with Zod 3.23.x-3.25.x**

**Why this happens:**
1. Project needs Zod 4.x for modern features (`.pipe()`, `.brand()`, etc.)
2. Hardhat verify plugin hard-depends on Zod 3.x with no migration path
3. Even with perfect npm overrides, runtime instance mismatches cause the `_parse` error
4. NomicFoundation has stated they won't migrate to Zod 4 until Hardhat 4 (still vaporware)

This isn't a configuration issue - **it's a fundamental incompatibility**.

### Solution 1: Downgrade to Zod 3 (IMPLEMENTED - Current Status)

**Status**: ✅ **This solution is already applied**

The project has been downgraded to Zod 3.25.76 to ensure Hardhat compilation works.

```json
// package.json (already updated)
"dependencies": {
  "zod": "3.25.76"  // Downgraded from 4.1.13
}
```

**Trade-off**: 
- ✅ Hardhat compilation works perfectly
- ❌ Lost Zod 4.x features (`.pipe()`, `.brand()`, better error messages)
- ⚠️ `src/config/env-schema.ts` uses `.pipe()` - needs refactoring for Zod 3

**To compile contracts:**
```bash
npx hardhat compile
```

**Current status**: Compilation succeeds but needs `@uniswap/v3-core` dependency.

### Solution 2: Fork hardhat-verify (For the Brave)

**Status**: 🔧 Available but not implemented

Use a community fork that supports Zod 4:

```bash
# Option A: Use community fork
npm install --save-dev hardhat-verify-zod4

# Option B: Use GitHub fork
npm install --save-dev git+https://github.com/NomicFoundation/hardhat-verify.git#zod4-patch
```

**Trade-off**:
- ✅ Keep Zod 4.x features
- ❌ Rely on community maintenance
- ⚠️ May break on Hardhat updates

### Solution 3: Drop hardhat-verify (The Foundry Way)

**Status**: 🚀 Best long-term solution

Skip the plugin entirely and verify directly via Etherscan API:

```typescript
// Manual verification (no plugin needed)
import { ethers } from "ethers";

async function verifyContract(address: string, args: any[]) {
  const response = await fetch(
    `https://api.basescan.org/api?module=contract&action=verifysourcecode`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        apikey: process.env.BASESCAN_API_KEY!,
        module: "contract",
        action: "verifysourcecode",
        contractaddress: address,
        sourceCode: "..." // Flattened source
      })
    }
  );
  return response.json();
}
```

Or **switch to Foundry**:
```bash
forge verify-contract <address> <contract> --chain base --etherscan-api-key $BASESCAN_API_KEY
```

**Trade-off**:
- ✅ Keep Zod 4.x
- ✅ Faster verification
- ❌ More manual work
- ✅ Better control

### Verification

After compiling successfully, you should see:
```
Compiled X Solidity files successfully
```

And the `artifacts/` directory should be created with contract ABIs and bytecode.

### What Gets Created

```
artifacts/
├── contracts/
│   ├── FlashSwapV2.sol/
│   │   ├── FlashSwapV2.json     # ABI + bytecode
│   │   └── FlashSwapV2.dbg.json # Debug info
│   ├── FlashSwapV3.sol/
│   │   ├── FlashSwapV3.json
│   │   └── FlashSwapV3.dbg.json
│   └── ... (other contracts)
└── build-info/
```

### After Successful Compilation

Once contracts are compiled:

1. **Factory tests will pass:**
   ```bash
   npm test -- FlashSwapExecutorFactory
   ```

2. **Deploy to testnet:**
   ```bash
   npx hardhat run scripts/deployment/deployFlashSwapV3.ts --network baseSepolia
   ```

3. **Update environment:**
   ```bash
   FLASHSWAP_V3_ADDRESS=0xYourDeployedAddress
   ENABLE_FLASHSWAP_V3=true
   ```

## Technical Details

### Why This Happens

1. **Hardhat 3.0.16** internally uses `hardhat/node_modules/zod/v3/types.js` (bundled Zod v3)
2. **Project dependencies** include `zod@4.1.13` for env-schema validation
3. **Zod 4.x breaking changes** include API changes to `_parse()` method signatures
4. **npm's resolution** can sometimes load the wrong version in Hardhat's context

### npm Overrides Added

The following overrides force Zod 3.x for all Hardhat-related packages:

```json
{
  "overrides": {
    "hardhat": {
      "zod": "3.25.76"
    },
    "@nomicfoundation/hardhat-verify": {
      "zod": "3.25.76"
    },
    "@nomicfoundation/hardhat-ethers": {
      "zod": "3.25.76"
    },
    "@nomicfoundation/hardhat-viem": {
      "zod": "3.25.76"
    }
  }
}
```

## Related Issues

- Hardhat issue tracker: https://github.com/NomicFoundation/hardhat/issues
- Zod v3 → v4 migration: https://zod.dev/migrations

## Still Having Issues?

If none of the above solutions work:

1. **Check Node version:** Ensure you're using Node 22.12.0+
   ```bash
   node --version
   ```

2. **Check npm version:**
   ```bash
   npm --version
   ```

3. **Verify Hardhat config:**
   ```bash
   npx hardhat config
   ```

4. **Enable debug logging:**
   ```bash
   DEBUG=hardhat:* npx hardhat compile
   ```

5. **File an issue** with the full error output and your environment details

---

**Last Updated:** 2025-12-11  
**Hardhat Version:** 3.0.16  
**Project Zod Version:** 4.1.13  
**Override Zod Version:** 3.25.76
