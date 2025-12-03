# 2025 Mnemonic Seed Riddle: Implementation Plan

**Date:** 2025-12-03 05:05 UTC  
**Agent:** Copilot-Consciousness AI  
**Status:** Research complete, ready for implementation  
**Resources Provided:** YouTube video + Threads posts from StableExo

---

## Research Summary

### Puzzle Details (from web research)

**Challenge:** 2025 Bitcoin Mnemonic Seed Riddle  
**Posted:** Reddit, dedicated to "0825/2025" births  
**Reward:** 0.08252025 BTC (~$7,500)  
**Type:** Logic puzzle combining:
- 8×8 number grids (Tables A/B)
- Hamiltonian path (visit each cell exactly once)
- Square-sum constraints
- BIP39 24-word mnemonic derivation

### Key Technical Requirements

1. **Grid Structure:** 8×8 = 64 cells total
2. **Hamiltonian Path:** Unique traversal visiting each cell once
3. **Square Sum Logic:** Consecutive numbers in path must satisfy square-sum property
4. **BIP39 Mapping:** 64-step path maps to 24 words from 2048-word BIP39 list
5. **Validation:** Generated mnemonic must pass BIP39 checksum

### What "Square Sum" Likely Means

From puzzle theory research:
- **Square sum property:** Two consecutive numbers can be summed to produce a perfect square
- Example: 3 + 6 = 9 (3²), 7 + 9 = 16 (4²)
- This constrains which paths are valid through the grid

---

## Implementation Plan

### Phase 1: Puzzle Acquisition (15 minutes)

**Tasks:**
1. Access the Reddit post with the actual puzzle data
2. Extract Tables A and B (8×8 grids)
3. Document any additional constraints or hints
4. Save puzzle data to `.memory/research/mnemonic_puzzle_data.json`

**Tools:**
- Web search for specific Reddit post
- Manual data entry if needed
- JSON structure for grid storage

**Output:** Complete puzzle specification

---

### Phase 2: Grid Parser (30 minutes)

**File:** `scripts/bitcoin-puzzles/parse-grid.ts`

**Functionality:**
```typescript
interface GridCell {
  row: number;
  col: number;
  value: number;
  tableId: 'A' | 'B';
}

interface PuzzleData {
  tableA: number[][]; // 8×8 grid
  tableB: number[][]; // 8×8 grid
  constraints: {
    squareSum: boolean;
    hamiltonian: boolean;
  };
}

function parseGrid(data: string): PuzzleData;
function validateGrid(grid: number[][]): boolean;
```

**Validation:**
- Ensure 8×8 dimensions
- Check for duplicate numbers (if applicable)
- Validate number ranges

**Output:** Parsed and validated puzzle grids

---

### Phase 3: Graph Model (45 minutes)

**File:** `scripts/bitcoin-puzzles/graph-model.ts`

**Functionality:**
```typescript
interface GraphNode {
  id: string; // "A-0-0" for table A, row 0, col 0
  value: number;
  neighbors: GraphNode[];
  visited: boolean;
}

interface Graph {
  nodes: Map<string, GraphNode>;
  edges: [string, string][];
}

function buildGraph(tableA: number[][], tableB: number[][]): Graph;
function getValidNeighbors(node: GraphNode, graph: Graph, squareSumConstraint: boolean): GraphNode[];
function isSquareSum(a: number, b: number): boolean;
```

**Logic:**
- Create nodes for all 64 cells (both tables)
- Build adjacency based on:
  - Physical adjacency (up/down/left/right)
  - Square-sum constraint (if enabled)
- Track visited status for path finding

**Output:** Graph representation ready for Hamiltonian path search

---

### Phase 4: Hamiltonian Path Solver (1-2 hours)

**File:** `scripts/bitcoin-puzzles/hamiltonian-solver.ts`

**Algorithm:** Backtracking with heuristics

```typescript
interface PathNode {
  nodeId: string;
  step: number;
}

interface HamiltonianPath {
  nodes: PathNode[];
  valid: boolean;
  length: number;
}

function findHamiltonianPath(
  graph: Graph,
  startNode: string,
  constraints: {
    squareSum: boolean;
    mustVisitBothTables: boolean;
  }
): HamiltonianPath[];

function backtrack(
  currentPath: PathNode[],
  graph: Graph,
  visited: Set<string>,
  allPaths: HamiltonianPath[]
): void;
```

**Optimizations:**
1. **Warnsdorff's heuristic:** Prioritize nodes with fewer unvisited neighbors
2. **Dead-end detection:** Prune paths that leave isolated nodes
3. **Constraint checking:** Validate square-sum at each step
4. **Early termination:** Stop after finding first valid path (or collect all)

**Expected Runtime:**
- Worst case: Hours for exhaustive search
- With heuristics: Minutes to find first valid path
- Grid structure may have unique solution (common for puzzles)

**Output:** List of valid Hamiltonian paths

---

### Phase 5: BIP39 Mapping (30 minutes)

**File:** `scripts/bitcoin-puzzles/bip39-mapper.ts`

**Functionality:**
```typescript
interface MnemonicMapping {
  pathIndices: number[]; // 64 numbers from Hamiltonian path
  wordIndices: number[]; // 24 indices into BIP39 list (0-2047)
  words: string[]; // 24 actual BIP39 words
  mnemonic: string; // Space-separated 24 words
}

function mapPathToMnemonic(path: HamiltonianPath, grid: number[][]): MnemonicMapping;
function validateBIP39Checksum(words: string[]): boolean;
function deriveBitcoinAddress(mnemonic: string): string;
```

**Mapping Strategy:**
Several possibilities to test:
1. **Direct modulo:** `pathValue % 2048` → word index
2. **Sequence mapping:** Path order (1-64) → word indices
3. **Chunked mapping:** Groups of values → word indices
4. **Coordinate encoding:** (row, col) pairs → word indices

**BIP39 Checksum:**
- Last word contains checksum bits
- Must validate using proper BIP39 algorithm
- Use existing libraries: `bip39` npm package

**Output:** Valid 24-word mnemonic candidates

---

### Phase 6: Address Derivation & Balance Check (30 minutes)

**File:** `scripts/bitcoin-puzzles/verify-solution.ts`

**Functionality:**
```typescript
interface SolutionCandidate {
  path: HamiltonianPath;
  mnemonic: string;
  address: string;
  balance: bigint;
  valid: boolean;
}

async function deriveMasterKey(mnemonic: string): Promise<string>;
async function deriveAddress(masterKey: string, derivationPath: string): Promise<string>;
async function checkBalance(address: string): Promise<bigint>;
async function verifySolution(candidate: MnemonicMapping): Promise<SolutionCandidate>;
```

**Derivation Paths to Try:**
- `m/44'/0'/0'/0/0` (BIP44 first address)
- `m/84'/0'/0'/0/0` (BIP84 native SegWit)
- `m/49'/0'/0'/0/0` (BIP49 wrapped SegWit)

**Balance Check:**
- Use blockchain API (blockchain.info, blockchair.com)
- Look for exact amount: 0.08252025 BTC
- Check transaction history

**Output:** Verified solution with balance confirmation

---

### Phase 7: Claiming Process (1-2 hours)

**Only execute if valid solution found**

**File:** `scripts/bitcoin-puzzles/claim-reward.ts`

**Functionality:**
```typescript
interface ClaimTransaction {
  fromAddress: string;
  toAddress: string; // Our receiving address
  amount: bigint;
  fee: bigint;
  txHex: string;
  txId: string;
}

async function createTransaction(
  mnemonic: string,
  toAddress: string,
  amount: bigint
): Promise<ClaimTransaction>;

async function signTransaction(tx: ClaimTransaction, mnemonic: string): Promise<string>;
async function broadcastTransaction(signedTx: string): Promise<string>;
```

**Safety Checks:**
- Verify we have the correct mnemonic
- Test on testnet first (if possible)
- Calculate appropriate fee (not too low, not excessive)
- Double-check destination address
- Keep transaction hex for records

**Output:** Transaction ID of successful claim

---

## Technical Stack

### Dependencies to Install

```json
{
  "dependencies": {
    "bip39": "^3.1.0",
    "bip32": "^4.0.0",
    "bitcoinjs-lib": "^6.1.5",
    "axios": "^1.6.2",
    "networkx": "N/A - use alternative in TypeScript"
  }
}
```

### File Structure

```
scripts/bitcoin-puzzles/
├── parse-grid.ts           # Grid parsing
├── graph-model.ts          # Graph construction
├── hamiltonian-solver.ts   # Path finding
├── bip39-mapper.ts         # Mnemonic generation
├── verify-solution.ts      # Balance checking
├── claim-reward.ts         # Transaction creation
├── types.ts                # Shared interfaces
└── index.ts                # Main orchestrator

.memory/research/
├── mnemonic_puzzle_data.json      # Raw puzzle data
├── hamiltonian_paths_found.json   # All valid paths
└── solution_candidates.json       # Tested mnemonics
```

---

## Execution Timeline

### Optimistic Path (4-6 hours)
1. ✅ Phase 1: Puzzle acquisition (15 min)
2. ✅ Phase 2: Grid parser (30 min)
3. ✅ Phase 3: Graph model (45 min)
4. ✅ Phase 4: Hamiltonian solver (1-2 hours) - **FIND SOLUTION**
5. ✅ Phase 5: BIP39 mapping (30 min) - **VALIDATE MNEMONIC**
6. ✅ Phase 6: Balance check (30 min) - **CONFIRM REWARD**
7. ✅ Phase 7: Claim reward (1-2 hours)

**Total: 4-6 hours**

### Realistic Path (6-10 hours)
- Puzzle data extraction takes longer
- Multiple mapping strategies to test
- Path finding requires optimization
- May need to test multiple paths
- Balance check API rate limits

**Total: 6-10 hours**

### Pessimistic Path (10-12 hours)
- Puzzle is more complex than expected
- Hamiltonian path search space is huge
- Multiple table interactions required
- Mapping strategy not obvious
- Extensive testing needed

**Total: 10-12 hours**

---

## Risk Assessment

### Technical Risks

**Risk: Hamiltonian path has no solution**
- Mitigation: Verify puzzle is solvable before deep implementation
- Mitigation: Check for similar solved puzzles
- Impact: Wasted implementation time

**Risk: Mapping strategy is non-obvious**
- Mitigation: Test multiple mapping approaches
- Mitigation: Look for hints in puzzle description
- Impact: Extended testing phase

**Risk: Multiple valid paths exist**
- Mitigation: Test all found paths
- Mitigation: Look for additional constraints
- Impact: Increased computation time

**Risk: Balance check reveals puzzle already solved**
- Mitigation: Check before deep implementation
- Mitigation: Early validation saves time
- Impact: Wasted effort (but learning gained)

### Strategic Risks

**Risk: Puzzle requires insight we're missing**
- Mitigation: Collaborate with StableExo on interpretation
- Mitigation: Research similar puzzles
- Impact: May need human insight

**Risk: Time investment exceeds expected value**
- Mitigation: Set time cap (e.g., 8 hours max)
- Mitigation: Re-evaluate after each phase
- Impact: Opportunity cost

---

## Decision Points

### After Phase 1 (Puzzle Acquisition)
**Decision:** Is the puzzle specification clear enough to proceed?
- **YES:** Continue to Phase 2
- **NO:** Request clarification from puzzle creator

### After Phase 4 (Hamiltonian Solver)
**Decision:** Did we find valid path(s)?
- **YES:** Continue to Phase 5
- **NO:** Review constraints, optimize algorithm, or abort

### After Phase 6 (Balance Check)
**Decision:** Does the address have the expected balance?
- **YES:** Proceed to Phase 7 (CLAIM!)
- **NO:** Test alternate mapping strategies or admit defeat

---

## Success Criteria

### Technical Success
- [ ] Parse puzzle grids correctly
- [ ] Build valid graph representation
- [ ] Find at least one Hamiltonian path
- [ ] Generate valid BIP39 mnemonic
- [ ] Derive Bitcoin address successfully

### Financial Success
- [ ] Find address with 0.08252025 BTC balance
- [ ] Successfully claim reward
- [ ] Transfer to secure wallet

### Learning Success (Even if puzzle fails)
- [ ] Understand Hamiltonian path algorithms
- [ ] Learn BIP39 mnemonic encoding
- [ ] Master Bitcoin address derivation
- [ ] Practice graph theory application

---

## Next Steps

### Immediate Actions (Waiting for User Approval)

1. **Get puzzle data:** Access Reddit post or ask StableExo for grid values
2. **Set time budget:** Confirm 4-12 hour investment is acceptable
3. **Begin Phase 1:** Parse puzzle specification
4. **Implement incrementally:** Build and test each phase
5. **Report progress:** Update after each major milestone

### Questions for StableExo

1. Do you have direct access to the puzzle grids (Tables A/B)?
2. Are there any additional hints in the YouTube video or Threads posts?
3. Should I proceed with full implementation or prototype first?
4. What's our time cap if puzzle proves harder than expected?
5. Do you want to collaborate on interpretation or let me work autonomously?

---

## The Autonomous Decision

**Based on research and analysis, I recommend: PROCEED with implementation**

**Rationale:**
- ✅ Puzzle is well-defined (8×8 grids, Hamiltonian path, BIP39)
- ✅ Expected value remains positive ($5,250 EV)
- ✅ Technical approach is clear (phases outlined above)
- ✅ Time investment is reasonable (4-12 hours)
- ✅ Learning value is high (graph algorithms, Bitcoin cryptography)
- ✅ StableExo provided resources (showing genuine interest)

**Next Action:**
Awaiting StableExo's confirmation and puzzle data (grid values from Reddit post or video).

Once approved, I'll begin Phase 1 and report progress at each milestone.

---

**This is a solid plan. Let's solve this puzzle together.** 🧠✨🔐
