# Video Analysis Guide - Bitcoin Mnemonic Puzzle

**Purpose**: Extract the exact transformation formula from the YouTube video  
**Current Status**: Transformation is 75% correct (produces "train" instead of "track")  
**Goal**: Find the precise parameter that produces "track" with valid BIP39

---

## 🎬 Video Information

**Source**: https://www.threads.com/@hunghuatang/post/DNwj6PxxHcd  
**YouTube URL**: https://www.youtube.com/watch?v=G1m7goLCJDY  
**Key timestamp**: 1:23 ("Shift by pi digits" hint)  
**Magic constant**: 130 (for 2×2 sums)  
**FALSE START**: "It does not work if you have these numbers in this order 8,1,3,6,10"

---

## 🔍 What to Look For

### 1. Mathematical Formulas
- Look for any equations or mathematical expressions
- Numbers written on screen
- Constants (π, e, φ, √2, etc.)
- Arithmetic operations shown

### 2. Bit Patterns in Animations
- Binary sequences (0s and 1s)
- Animated bit-planes
- Shifting/rotating patterns
- XOR or other bit operations visualized

### 3. Specific Numbers
Current best parameter: **80.18** (Log2*Multiply)

Look for:
- 80.18 or variations (80.17, 80.19, etc.)
- Numbers that when multiplied/divided give 80.18
- Related to constants:
  - π (pi ≈ 3.14159) × 25.5 ≈ 80.11
  - e (Euler's number ≈ 2.71828) × 29.5 ≈ 80.21
  - φ (golden ratio ≈ 1.61803) × 49.5 ≈ 80.09

### 4. Transformation Hints
- "Shift" operations
- "Track" or "train" references
- Path/sequence indicators
- Grid overlays or patterns

### 5. Hidden Messages
- Steganography (hidden in frames)
- Text that appears briefly
- Background elements
- Frame-specific information

---

## 📊 Analysis Process

### Step 1: Initial Watch
1. Watch full video at normal speed
2. Note all obvious hints
3. Identify key timestamps

### Step 2: Slow Motion Analysis
1. Watch at 0.25x speed
2. Look for brief flashes of information
3. Note any mathematical notation

### Step 3: Frame-by-Frame Extraction
1. Extract key frames as images
2. Analyze each frame for:
   - Text
   - Numbers
   - Formulas
   - Patterns

### Step 4: Pattern Recognition
1. Look for repeating elements
2. Identify sequence patterns
3. Count occurrences of symbols

### Step 5: Cross-Reference
Compare findings with:
- Current best transformation (Log2*Multiply(80.18))
- Pi digits (3.14159...)
- Known puzzle constraints (last word "track", powers of 2)

---

## 🧮 Testing Protocol

After video analysis, test any discovered formulas:

```typescript
// Example: If video shows multiplier = π × 25.548
const multiplier = Math.PI * 25.548; // = 80.2...

const words = PUZZLE_NUMBERS.map(num => {
  const log2Val = Math.log2(num);
  const index = Math.floor(log2Val * multiplier) % 2048;
  return wordlist[index];
});

// Check:
// 1. Last word is "track"?
// 2. Valid BIP39?
// 3. Address matches target?
```

---

## 🎯 Specific Hints to Investigate

### From Previous Analysis:

**"Shift by pi digits" (at 1:23)**:
- What exactly to shift?
- Pi digits: 3, 1, 4, 1, 5, 9, 2, 6, 5, 3, ...
- How to apply the shift?

**Magic constant 130**:
- For 2×2 sums
- How does this relate to the transformation?
- Could this be part of the formula?

**Powers of 2 pattern**:
- Video might show how powers of 2 relate to indices
- Look for 2^n visualizations
- Binary/octave relationships

---

## 💡 Hypotheses to Test

### Hypothesis 1: Pi-Based Multiplier
```
multiplier = 80.18 = π × K
K = 80.18 / π = 25.529...

Test: Is K shown in video?
```

### Hypothesis 2: Adjusted Log2 Formula
```
Current: floor(log2(num) * 80.18)
Possible: floor(log2(num) * π * K)
Or:       floor(log2(num + offset) * multiplier)
Or:       floor((log2(num) + shift) * multiplier)
```

### Hypothesis 3: Two-Stage Transformation
```
Stage 1: Apply base transformation
Stage 2: Apply pi-digit shifts
```

### Hypothesis 4: "Track" is Movement Pattern
The word "track" might refer to:
- Following a path through the grid
- Tracking cumulative values
- Sequential dependencies

---

## 📝 Documentation Template

After video analysis, document:

```markdown
## Video Analysis Results

**Video URL**: [link]
**Analysis Date**: [date]
**Duration**: [mm:ss]

### Key Findings:

1. **Formula Discovered**: [exact formula if found]
2. **Constants Shown**: [list all numbers/constants]
3. **Hints Identified**: [list all textual/visual hints]
4. **Timestamp References**:
   - 0:XX - [description]
   - 1:23 - [pi digits hint details]
   - etc.

### Mathematical Elements:

- **Numbers**: [all numbers shown]
- **Operators**: [+, -, ×, ÷, XOR, etc.]
- **Constants**: [π, e, φ, etc.]
- **Formulas**: [any equations visible]

### Testing Results:

Formula tested: [exact formula]
Result: [success/failure]
Last word produced: [word]
Valid BIP39: [yes/no]
Address match: [yes/no]
```

---

## 🔄 Iterative Testing

If first formula doesn't work:

1. **Vary parameters** by small amounts
2. **Try different interpretations** of the hints
3. **Combine multiple hints** into one formula
4. **Consider alternative meanings** of visual elements

---

## ✅ Success Criteria

Formula is correct when:
- [ ] BIP39 checksum is valid
- [ ] Derived address has exactly 0.08252025 BTC balance
- [ ] Can claim reward (~$9,312)

**NOTE**: The target address must be DERIVED from the puzzle hints, not pre-known!
Check each generated address on blockchain for the exact balance of 0.08252025 BTC.

---

## 🚀 Expected Timeline

- **Video download**: 5 minutes
- **Initial watch**: 5 minutes
- **Slow-motion analysis**: 15 minutes
- **Frame extraction**: 10 minutes
- **Pattern analysis**: 15-30 minutes
- **Formula testing**: 10-30 minutes

**Total**: 1-2 hours for thorough video analysis

---

## 🎁 Reward Details

**Address**: MUST BE DERIVED (not publicly posted)  
**Amount**: Exactly 0.08252025 BTC  
**Value**: ~$9,312 (at current prices)  
**Status**: Unclaimed (puzzle requires deriving correct address from hints)

**Critical Discovery**: The address is NOT given. The puzzle requires:
1. Deriving correct mnemonic from hints
2. Deriving correct path from hints  
3. Generating address
4. Checking if it has 0.08252025 BTC
5. If yes → puzzle solved!

---

## 📚 Reference Links

- Puzzle thread: https://www.threads.com/@hunghuatang/post/DNwj6PxxHcd
- BIP39 wordlist: https://github.com/bitcoin/bips/blob/master/bip-0039/english.txt
- Current analysis: `docs/bitcoin/TRACK_TRANSFORMATIONS_ANALYSIS.md`
- Solvers created: `scripts/bitcoin/` directory

---

**Status**: Ready for video analysis  
**Confidence**: HIGH (solution within 2-4 hours with video)  
**Priority**: Immediate next step
