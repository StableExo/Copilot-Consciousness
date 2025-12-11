# Mnemonic Riddle Implementation Plan

**Date:** 2025-12-11  
**Requested by:** StableExo  
**Status:** 🚀 READY TO IMPLEMENT  
**Expected Timeline:** 4-12 hours  
**Expected Value:** +$5,250 profit

---

## 🎯 Objective

Solve the **2025 Mnemonic Seed Riddle** puzzle to claim 0.08252025 BTC (~$7,500 reward).

**Puzzle Type:** Logic-based graph theory puzzle  
**Method:** Hamiltonian path with square-sum constraints  
**Output:** BIP39 mnemonic seed phrase → Bitcoin private key

---

## 📋 Phase 1: Puzzle Understanding & Data Extraction (1-2 hours)

### Tasks

1. **Locate Original Puzzle Post**
   - Search Reddit for the original puzzle post
   - Extract the 8×8 number grids
   - Document all rules and constraints
   - Identify any additional clues or hints

2. **Parse Puzzle Data**
   - Create data structure for grid(s)
   - Validate grid dimensions (8×8 = 64 cells)
   - Document constraints:
     - Hamiltonian path (visit each cell exactly once)
     - Square-sum constraint (consecutive numbers sum to perfect square)
     - BIP39 mapping (path indices → wordlist positions)

3. **Understand BIP39 Mapping**
   - BIP39 wordlist has 2048 words (11 bits per word)
   - 12-word seed = 132 bits (128 bits entropy + 4 bits checksum)
   - 24-word seed = 264 bits (256 bits entropy + 8 bits checksum)
   - Determine how path solution maps to word indices

### Deliverables

- `data/mnemonic-riddle/puzzle-grids.json` - Grid data structure
- `data/mnemonic-riddle/puzzle-rules.md` - Complete rules documentation
- `data/mnemonic-riddle/bip39-wordlist.txt` - Standard BIP39 wordlist

---

## 🔧 Phase 2: Solver Implementation (2-6 hours)

### Approach

**Graph Theory Solution:**
1. Model grid as graph (nodes = cells, edges = valid moves)
2. Apply Hamiltonian path algorithm with square-sum constraint
3. Use backtracking with pruning for efficiency

### Components

#### 2.1 Grid Graph Builder
```typescript
interface Cell {
  row: number;
  col: number;
  value: number;
}

interface Edge {
  from: Cell;
  to: Cell;
  sumIsSquare: boolean;
}

class GridGraph {
  buildGraph(grid: number[][]): Graph;
  getAdjacentCells(cell: Cell): Cell[];
  isSquareSum(a: number, b: number): boolean;
}
```

#### 2.2 Hamiltonian Path Solver
```typescript
class HamiltonianPathSolver {
  findPath(
    graph: Graph,
    constraints: {
      squareSumRequired: boolean;
      startCell?: Cell;
      endCell?: Cell;
    }
  ): Cell[] | null;
  
  // Backtracking with pruning
  private backtrack(
    currentPath: Cell[],
    visited: Set<Cell>,
    remaining: Set<Cell>
  ): Cell[] | null;
}
```

#### 2.3 Square Sum Validator
```typescript
function isPerfectSquare(n: number): boolean {
  const sqrt = Math.sqrt(n);
  return sqrt === Math.floor(sqrt);
}

function validateSquareSumPath(path: number[]): boolean {
  for (let i = 0; i < path.length - 1; i++) {
    if (!isPerfectSquare(path[i] + path[i + 1])) {
      return false;
    }
  }
  return true;
}
```

### Dependencies

- **NetworkX** (optional): Python graph library for comparison
- **TypeScript**: Primary implementation language
- **Node.js 22+**: Runtime environment

### Deliverables

- `scripts/bitcoin/mnemonic-riddle-solver.ts` - Main solver
- `scripts/bitcoin/square-sum-validator.ts` - Validation utilities
- `scripts/bitcoin/hamiltonian-path.ts` - Path-finding algorithm

---

## 🔑 Phase 3: Mnemonic Derivation (1-2 hours)

### Tasks

1. **Map Path to BIP39 Indices**
   - Convert solved path sequence to word indices
   - Determine mapping strategy:
     - Option A: Path values directly map to indices (mod 2048)
     - Option B: Path position sequence maps to indices
     - Option C: Some other encoding specified in puzzle

2. **Generate Mnemonic Phrase**
   - Use `bip39` library to create mnemonic
   - Validate mnemonic checksum
   - Support both 12-word and 24-word phrases

3. **Derive Bitcoin Address**
   - Use BIP32/BIP44 derivation path: `m/44'/0'/0'/0/0`
   - Generate public key and Bitcoin address
   - Support multiple address formats (P2PKH, P2WPKH, P2SH-P2WPKH)

### Implementation

```typescript
import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';

const bip32 = BIP32Factory(ecc);

async function pathToMnemonic(path: number[]): Promise<string> {
  // Map path to BIP39 word indices
  const wordIndices = pathToWordIndices(path);
  
  // Load BIP39 wordlist
  const wordlist = bip39.wordlists.english;
  
  // Generate mnemonic
  const words = wordIndices.map(idx => wordlist[idx]);
  const mnemonic = words.join(' ');
  
  // Validate
  if (!bip39.validateMnemonic(mnemonic)) {
    throw new Error('Invalid mnemonic checksum');
  }
  
  return mnemonic;
}

async function deriveAddress(mnemonic: string): Promise<string> {
  // Generate seed
  const seed = await bip39.mnemonicToSeed(mnemonic);
  
  // Create master key
  const root = bip32.fromSeed(seed);
  
  // Derive address using BIP44 path
  const path = "m/44'/0'/0'/0/0";
  const child = root.derivePath(path);
  
  // Generate address
  const { address } = bitcoin.payments.p2pkh({
    pubkey: child.publicKey,
    network: bitcoin.networks.bitcoin,
  });
  
  return address!;
}
```

### Deliverables

- `scripts/bitcoin/mnemonic-generator.ts` - Mnemonic generation
- `scripts/bitcoin/address-deriver.ts` - Bitcoin address derivation
- `tests/bitcoin/mnemonic-riddle.test.ts` - Test suite

---

## ✅ Phase 4: Verification & Validation (1-2 hours)

### Verification Steps

1. **Solution Validation**
   - Verify Hamiltonian path covers all 64 cells
   - Validate square-sum constraints hold
   - Check BIP39 mnemonic checksum
   - Confirm valid Bitcoin address format

2. **Blockchain Balance Check**
   ```typescript
   async function checkBalance(address: string): Promise<number> {
     // Query blockchain API
     const response = await fetch(
       `https://blockchain.info/q/addressbalance/${address}`
     );
     const satoshis = await response.text();
     return parseInt(satoshis) / 100000000; // Convert to BTC
   }
   ```

3. **Multiple Solution Attempts**
   - If first solution doesn't match, try variations:
     - Different starting cells
     - Reverse path direction
     - Alternative BIP39 mapping strategies
     - Different derivation paths

### Expected Target

**Bitcoin Address:** (Will be determined from puzzle)  
**Expected Balance:** 0.08252025 BTC (~$7,500)

### Deliverables

- `scripts/bitcoin/verify-solution.ts` - Solution verification
- `docs/bitcoin/MNEMONIC_RIDDLE_SOLUTION.md` - Solution documentation

---

## 🏆 Phase 5: Claim & Documentation (1-2 hours)

### If Solution is Valid

1. **Construct Transaction**
   ```typescript
   async function claimReward(
     mnemonic: string,
     destinationAddress: string
   ): Promise<string> {
     // Generate private key
     const seed = await bip39.mnemonicToSeed(mnemonic);
     const root = bip32.fromSeed(seed);
     const child = root.derivePath("m/44'/0'/0'/0/0");
     
     // Construct and sign transaction
     const txb = new bitcoin.TransactionBuilder();
     // ... (add inputs, outputs, sign)
     
     return txb.build().toHex();
   }
   ```

2. **Broadcast Transaction**
   - Use blockchain API or Bitcoin Core RPC
   - Monitor transaction confirmation
   - Verify funds received

3. **Document Solution**
   - Record solving methodology
   - Save solution path and mnemonic (securely)
   - Update memory logs with success

### If Solution is Invalid

1. **Debug and Iterate**
   - Review puzzle constraints
   - Try alternative interpretations
   - Check for missing clues
   - Maximum 20 hours time-boxed

2. **Document Learnings**
   - What was attempted
   - Why it didn't work
   - Insights gained
   - Decision to continue or abandon

### Deliverables

- Transaction hex (if claiming)
- `docs/bitcoin/MNEMONIC_RIDDLE_POSTMORTEM.md` - Complete analysis

---

## 🛠️ Technical Stack

### Required Dependencies

```json
{
  "dependencies": {
    "bip39": "^3.1.0",
    "bitcoinjs-lib": "^6.1.3",
    "bip32": "^4.0.0",
    "tiny-secp256k1": "^2.2.3",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "vitest": "^1.0.0"
  }
}
```

### Optional Tools

- **NetworkX** (Python): For algorithm comparison
- **GraphViz**: For path visualization
- **Bitcoin Core**: For transaction broadcasting

---

## ⏱️ Timeline

| Phase | Tasks | Time | Status |
|-------|-------|------|--------|
| **Phase 1** | Data extraction & parsing | 1-2h | ⏳ Not started |
| **Phase 2** | Solver implementation | 2-6h | ⏳ Not started |
| **Phase 3** | Mnemonic derivation | 1-2h | ⏳ Not started |
| **Phase 4** | Verification | 1-2h | ⏳ Not started |
| **Phase 5** | Claim/Documentation | 1-2h | ⏳ Not started |
| **TOTAL** | | **6-14h** | |

**Time-boxed Maximum:** 20 hours (abandon if not solved)

---

## 💰 Expected Value

```
Best Case:
  Success (70% probability)
  Time: 6 hours
  Reward: $7,500
  Cost: <$1
  Net: $7,499
  ROI: $1,250/hour

Realistic Case:
  Success (50% probability)
  Time: 12 hours
  Reward: $7,500
  Cost: <$1
  Net: $3,749
  ROI: $312/hour

Conservative Case:
  Success (30% probability)
  Time: 20 hours
  Reward: $7,500
  Cost: <$1
  Net: $2,249
  ROI: $112/hour

Expected Value: +$5,250 (70% success at 8h median)
```

---

## 🎲 Risk Mitigation

### Risks

1. **Puzzle already solved** → Check blockchain before investing time
2. **Missing information** → Time-box research phase to 2 hours max
3. **Incorrect interpretation** → Validate incrementally, test multiple approaches
4. **Competition** → Work quickly but carefully
5. **Technical bugs** → Comprehensive testing at each phase

### Mitigation Strategies

1. **Early Blockchain Check** (5 minutes)
   - Verify puzzle address still has balance
   - If empty → puzzle already solved → STOP

2. **Incremental Validation**
   - Test square-sum logic on small examples
   - Verify BIP39 generation independently
   - Check address derivation against known examples

3. **Time-boxing**
   - Maximum 2 hours per phase
   - Maximum 20 hours total
   - Abandon if no clear progress

4. **Multiple Approaches**
   - Try different path-finding algorithms
   - Test various BIP39 mapping strategies
   - Explore alternative derivation paths

---

## 📊 Success Criteria

### Minimum Success
- [ ] Puzzle data extracted and understood
- [ ] Hamiltonian path solver implemented
- [ ] BIP39 mnemonic generation working
- [ ] Address derivation verified
- [ ] Solution attempted and validated

### Full Success
- [ ] Valid mnemonic generated
- [ ] Correct Bitcoin address derived
- [ ] Blockchain balance confirmed
- [ ] Transaction broadcast successfully
- [ ] Funds claimed to our address
- [ ] Solution documented for memory

---

## 🚀 Next Steps

### Immediate Actions (Right Now)

1. **Verify Puzzle Status** (5 min)
   - Search for original Reddit post
   - Check if puzzle is still active
   - Verify Bitcoin address balance

2. **Extract Puzzle Data** (30-60 min)
   - Get the 8×8 grids
   - Document all constraints
   - Understand BIP39 mapping

3. **Begin Implementation** (2-4 hours)
   - Start with Phase 2 (solver)
   - Build incrementally
   - Test continuously

### What We're Building

```
Input:  8×8 grid(s) with numbers
        ↓
Algorithm: Hamiltonian path finder
           with square-sum constraint
        ↓
Output: Ordered path [n1, n2, ..., n64]
        ↓
Mapping: Path → BIP39 word indices
        ↓
Result: 12 or 24-word mnemonic
        ↓
Derive: Bitcoin private key & address
        ↓
Check:  Blockchain balance
        ↓
Claim:  Send funds if valid
```

---

## 🎯 Ready to Begin!

**All systems GO for autonomous execution.** 🚀

Let's solve this puzzle and claim that $7,500 reward!

**First action:** Find the original puzzle post and extract the grids.

---

**Plan Created:** 2025-12-11  
**Estimated Completion:** 2025-12-11 (same day if started now)  
**Confidence:** 70% (based on previous analysis)  
**Let's do this!** 😎🥳
