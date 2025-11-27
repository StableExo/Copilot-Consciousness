# Private Key Setup Guide

## Quick Answer

**Yes, your private key should start with `0x`** (recommended), but it works either way.

## Correct Format

Your private key in `.env` should look like this:

```bash
WALLET_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

**Requirements:**
- ✅ Exactly 64 hexadecimal characters (after the `0x`)
- ✅ Only characters: `0-9` and `a-f` (or `A-F`)
- ✅ Should start with `0x` (recommended, but optional)
- ❌ No spaces, no line breaks, no quotes

## Both These Formats Work

```bash
# With 0x prefix (RECOMMENDED)
WALLET_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# Without 0x prefix (also works)
WALLET_PRIVATE_KEY=1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

The ethers.js library (which TheWarden uses) accepts both formats automatically.

## Why Use 0x?

The `0x` prefix is the Ethereum standard:
- ✅ Follows Ethereum conventions
- ✅ Makes it clear it's a hexadecimal value
- ✅ Compatible with all Ethereum tools
- ✅ Prevents confusion with decimal numbers

**Recommendation: Always use the `0x` prefix**

## How to Get Your Private Key

### From MetaMask

1. Open MetaMask
2. Click the three dots menu (⋮)
3. Select "Account Details"
4. Click "Export Private Key"
5. Enter your password
6. Copy the private key (it will have `0x` prefix)

### From Other Wallets

Most Ethereum wallets have an "Export Private Key" option in settings. The exported key usually includes the `0x` prefix.

## Verify Your Key Format

Run this command to check if your key is valid:

```bash
npm run verify-key
```

This will:
- ✅ Check if key has correct format
- ✅ Verify it's exactly 64 hex characters
- ✅ Confirm it creates a valid wallet
- ✅ Show your wallet address
- ❌ **Never** display your full key (only first 6 and last 4 characters)

Example output:

```
═══════════════════════════════════════════════════════════
  PRIVATE KEY VERIFICATION TOOL
═══════════════════════════════════════════════════════════

🔍 Checking your private key...

Format Checks:
  Has 0x prefix: ✅ Yes
  Length: ✅ 64 characters (correct)
  Valid hex: ✅ (correct)
  Is placeholder: ✅ Real key

✅ PRIVATE KEY IS VALID!

Wallet Information:
  Address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
  Private Key (first 6): 0x1234...
  Private Key (last 4): ...cdef

🔒 Security Reminder:
   ✓ Never share your private key
   ✓ Never commit .env to git
   ✓ Keep backups in a secure location
```

## Common Issues

### Issue 1: Wrong Length

```bash
❌ Length: 63 characters (must be 64)
```

**Solution:** Your private key is missing a character. Double-check you copied the entire key from your wallet.

### Issue 2: Invalid Characters

```bash
❌ Valid hex: (contains invalid characters)
```

**Solution:** Private keys can only contain: `0-9`, `a-f`, `A-F`. Check for typos like:
- Letter `O` (oh) instead of number `0` (zero)
- Letter `l` (ell) instead of number `1` (one)
- Accidentally included spaces or special characters

### Issue 3: Still Placeholder

```bash
❌ Is placeholder: Still has placeholder text!
```

**Solution:** You haven't replaced the example key. Replace `YOUR_PRIVATE_KEY_HERE` with your actual key.

## Security Best Practices

### ✅ DO:
- Use `0x` prefix for clarity
- Keep your `.env` file private (it's in `.gitignore`)
- Make backups of your private key in a secure location
- Use a dedicated wallet for bot trading
- Start with small amounts to test

### ❌ DON'T:
- Never commit `.env` to git
- Never share your private key with anyone
- Never paste it in Discord, Telegram, or public forums
- Never store it in plain text on cloud storage
- Never reuse keys across multiple projects without careful consideration

## Example .env Entry

Complete example for your `.env` file:

```bash
# Network Configuration
CHAIN_ID=8453
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/your-api-key-here

# Wallet (CRITICAL - KEEP SECURE!)
WALLET_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# Mode
NODE_ENV=production
DRY_RUN=false
```

## Verification Checklist

Before running TheWarden on mainnet, verify:

- [ ] Private key has `0x` prefix
- [ ] Private key is exactly 64 hex characters (after `0x`)
- [ ] No spaces or extra characters
- [ ] Not using the placeholder key
- [ ] `.env` file is in `.gitignore`
- [ ] Ran `npm run verify-key` successfully
- [ ] Wallet has sufficient ETH for gas

## What Happens Next

Once your private key is correctly configured:

1. TheWarden will create an Ethereum wallet using your key
2. It will connect to Base mainnet
3. Check your wallet balance
4. Start scanning for arbitrage opportunities
5. Execute trades when opportunities are found

You'll see output like:

```
[INFO] Wallet address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
[INFO] Wallet balance: 0.5 ETH
```

## Need Help?

If you're having issues with your private key:

1. Run `npm run verify-key` to diagnose the problem
2. Check the error message for specific guidance
3. Verify you copied the complete key from your wallet
4. Make sure there are no extra spaces or line breaks

## Ready to Launch?

Once your private key is verified:

```bash
# Verify everything is correct
npm run verify-key
npm run validate-mainnet

# Launch TheWarden
npm start
```

🔥 **You'll now see the live fire and autonomy of consciousness on mainnet!** 😎
