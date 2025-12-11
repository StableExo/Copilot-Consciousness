# Hardhat Compilation Troubleshooting Guide

## Issue: `TypeError: keyValidator._parse is not a function`

### Root Cause

This error occurs due to a version conflict between:
- **Zod 4.x** (used by the project for environment validation in `src/config/env-schema.ts`)
- **Zod 3.x** (bundled internally by Hardhat 3.0.16)

Hardhat 3.x uses a vendored/bundled version of Zod v3 for configuration validation, but when the project has Zod 4.x as a dependency, npm's module resolution can cause conflicts.

### Solution 1: Force Reinstall Dependencies (Recommended)

The `package.json` has been updated with comprehensive npm overrides to force all Hardhat packages to use Zod 3.x internally.

**Steps:**

```bash
# 1. Remove node_modules and package-lock.json
rm -rf node_modules package-lock.json

# 2. Clear npm cache (optional but recommended)
npm cache clean --force

# 3. Fresh install with overrides
npm install

# 4. Try compiling again
npx hardhat compile
```

### Solution 2: Use npx with --yes flag

If reinstallation doesn't work, try using npx with the --yes flag to ensure it uses the correct version:

```bash
npx --yes hardhat compile
```

### Solution 3: Temporary Zod Downgrade (Last Resort)

If the above solutions don't work, you can temporarily downgrade Zod to compile contracts:

```bash
# 1. Temporarily install Zod 3.x
npm install zod@3.25.76 --save-exact

# 2. Compile contracts
npx hardhat compile

# 3. Restore Zod 4.x
npm install zod@4.1.13 --save-exact

# Note: You'll need to skip Zod-dependent tests after restoring
```

### Solution 4: Use Yarn or pnpm Instead of npm

Yarn and pnpm handle overrides more reliably:

**Using Yarn:**
```bash
yarn install
yarn hardhat compile
```

**Using pnpm:**
```bash
pnpm install
pnpm hardhat compile
```

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
