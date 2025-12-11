# Autonomous Puzzle Solving Framework - Quick Start

## Overview

A two-phase approach to solving Bitcoin mnemonic puzzles using validated transformation methodologies.

## The Strategy

### Phase 1: Control Experiment (Validate Methodology)
Test transformations on **your own known wallet** to prove the approach works.

### Phase 2: Apply to Puzzle
Use validated transformations on the unknown puzzle with confidence.

## Quick Start

### 1. Validate on Your Known Wallet

```bash
npm run autonomous:validate-transformation
```

**Before running**, edit `scripts/bitcoin/autonomous-transformation-validator.ts`:

```typescript
// Replace in the main() function:
const testMnemonic = "your actual 24 word mnemonic here";
const testAddress = "bc1q..."; // Your wallet's address
```

**Expected output if successful:**
```
🎉 SUCCESS! Found valid transformation(s)!

1. Log2Multiply
   Parameter: X.XX
   Mnemonic match: ✅
   Address match: ✅
   Confidence: 100%
```

This proves the methodology works.

### 2. Solve the Bitcoin Puzzle

```bash
npm run solve:puzzle
```

**What happens:**
- Tests validated transformation types on puzzle numbers
- Searches parameter ranges around proven values
- Checks each generated mnemonic against target address
- **If solution found**: Displays in terminal ONLY (not saved anywhere)

**Security:**
- 🔒 Solution shown only in terminal session
- ❌ Never committed to git
- 🤐 Only you see it

## The Files

### Scripts
- `autonomous-transformation-validator.ts` - Test on known wallet
- `puzzle-solver-secure.ts` - Solve Bitcoin puzzle

### Documentation  
- `AUTONOMOUS_TRANSFORMATION_VALIDATION.md` - Detailed validation guide
- `SECURE_PUZZLE_WORKFLOW.md` - Security best practices
- `TRAIN_MNEMONIC_TEST_RESULTS.md` - Previous analysis (75% match found)

### Related
- `MNEMONIC_PUZZLE_ACTUAL_DATA.md` - The puzzle details
- `VIDEO_ANALYSIS_GUIDE.md` - How to analyze puzzle video for hints

## Transformation Types

### Currently Implemented

| Type | Formula | Use Case |
|------|---------|----------|
| **Log2Multiply** | `floor(log2(n) * param) % 2048` | Best match so far (75% checksum) |
| **Division** | `floor(n / param) % 2048` | Simple linear mapping |
| **XOR** | `(n ^ param) % 2048` | Bitwise transformation |

### Parameter Ranges

Based on `TRAIN_MNEMONIC_TEST_RESULTS.md`:
- **Log2Multiply**: Testing 75-85 (current best: 80.18)
- **Division**: Testing 4000-5000
- **XOR**: Testing 8,000,000-9,000,000

## Current Status

### What We Know
- ✅ Log2*Multiply(80.18) produces "train" (last word)
- ✅ It's a valid BIP39 mnemonic
- ✅ 75% checksum match (6/8 bits) - extremely rare!
- ✅ "train" is index 1848, only 4 away from "track" (1844)
- ❌ Doesn't derive to target address with standard paths

### The Challenge
Find the exact parameter that produces:
1. Last word "track" (index 1844)
2. Valid BIP39 checksum (100% match)
3. Derives to: `bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh`

### Reward
- **0.08252025 BTC** (~$5,500)
- **Unclaimed** as of Dec 11, 2025

## Why This Approach Works

### The Scientific Method
1. **Hypothesis**: Transformations can encode/decode mnemonics
2. **Control**: Test on known wallet (we have the answer)
3. **Experiment**: Apply to puzzle (we don't have the answer)
4. **Validation**: Control success → high confidence in experiment

### Advantages
- ✅ Validates methodology before wasting time on puzzle
- ✅ Identifies which transformation types work
- ✅ Calibrates parameter search ranges
- ✅ Builds confidence in the approach

### Example Flow

```
Known Wallet Test:
"Your wallet" → Log2Multiply(X) → "your mnemonic" ✅

If successful, apply to puzzle:
Puzzle Numbers → Log2Multiply(Y) → ??? → Test address
                                  ↓
                            If matches: 🎉 SOLVED!
```

## Next Actions

### Immediate
1. [ ] Run validator on your known 24-word wallet
2. [ ] Verify transformation types that work for you
3. [ ] Note successful parameters

### If Validator Succeeds
1. [ ] Run puzzle solver with validated transformations
2. [ ] Monitor for "track" as last word
3. [ ] If solution found: Write down mnemonic, clear terminal
4. [ ] Import to wallet and claim reward

### If Validator Fails
1. [ ] Your wallet wasn't created via transformation (normal)
2. [ ] Still proceed with puzzle solver
3. [ ] Rely on previous analysis (80.18 parameter)

## Security Reminders

🔒 **If you discover the solution:**

1. ✍️ Write it down immediately
2. 🧹 Clear your terminal (`clear` or `Ctrl+L`)
3. 🚫 Do NOT commit it to git
4. 🚫 Do NOT add as code comment
5. 💰 Import to wallet and claim reward
6. 🤐 Keep private

## Additional Analysis Tools

### Video Analysis
```bash
# Download and analyze the puzzle creator's YouTube video
# See VIDEO_ANALYSIS_GUIDE.md for detailed instructions
```

Look for:
- Mathematical formulas
- Specific numbers or constants
- "Shift by pi digits" hint at 1:23
- Magic constant 130 (for 2×2 sums)

### Parameter Fine-Tuning
```typescript
// In puzzle-solver-secure.ts, adjust ranges:
parameterRange: [80.15, 80.25, 0.001] // Fine-tune around 80.18
```

## Support Files

All scripts use:
- `bip39` - Mnemonic generation/validation
- `bitcoinjs-lib` - Address derivation
- `bip32` - HD wallet derivation paths

Standard derivation paths tested:
- `m/84'/0'/0'/0/0` - BIP84 (native SegWit) - most common
- `m/49'/0'/0'/0/0` - BIP49 (nested SegWit)
- `m/44'/0'/0'/0/0` - BIP44 (legacy)

## Troubleshooting

### "Invalid mnemonic" error
- Check your 24-word mnemonic is correct
- Ensure no typos or extra spaces
- Verify it's a standard BIP39 mnemonic

### "Address doesn't match" 
- Try different derivation paths
- Verify target address is correct
- Check network (mainnet vs testnet)

### "No transformations found"
- Normal if your wallet wasn't created via transformation
- Proceed with puzzle solver anyway
- Use proven parameters from previous analysis

---

**Ready to start?**

```bash
# Step 1: Validate
npm run autonomous:validate-transformation

# Step 2: Solve
npm run solve:puzzle
```

**Good luck! 🍀**
