/**
 * Cube-Sum Table Analyzer
 * 
 * Researching possible "cube-sum math tables" referenced in the puzzle
 * 
 * Key Discovery: Every 3rd position in our powers of 2 is a perfect cube!
 * Positions 3, 6, 9, 12, 15, 18, 21, 24 = [8, 64, 512, 4096, 32768, 262144, 2097152, 16777216]
 * These are 2³, 4³, 8³, 16³, 32³, 64³, 128³, 256³
 */

const PUZZLE_NUMBERS = [
  2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096,
  8192, 16384, 32768, 65536, 131072, 262144, 524288, 1048576,
  2097152, 4194304, 8388608, 16777216
];

// Standard taxicab numbers (smallest numbers with n cube-sum representations)
const TAXICAB_NUMBERS = [
  { n: 1729, representations: [[1, 12], [9, 10]] },
  { n: 4104, representations: [[2, 16], [9, 15]] },
  { n: 5832, representations: [[3, 18], [9, 15]] },
  { n: 9729, representations: [[1, 21], [10, 18]] },
  { n: 13832, representations: [[2, 24], [18, 20]] },
  { n: 15312, representations: [[2, 24], [18, 20]] },
  { n: 20683, representations: [[10, 27], [19, 24]] },
  { n: 32832, representations: [[4, 32], [18, 30]] },
  { n: 39312, representations: [[2, 34], [15, 33]] },
  { n: 40033, representations: [[9, 34], [16, 33]] }
];

function analyzePatterns() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('CUBE-SUM TABLE ANALYSIS');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log('🎲 Discovery 1: Perfect Cubes in Puzzle Numbers\n');
  console.log('Every 3rd position is a perfect cube:');
  
  const cubePositions: number[] = [];
  PUZZLE_NUMBERS.forEach((num, idx) => {
    const position = idx + 1;
    const cubeRoot = Math.round(Math.cbrt(num));
    if (cubeRoot ** 3 === num) {
      console.log(`  Position ${position}: ${num} = ${cubeRoot}³`);
      cubePositions.push(position);
    }
  });
  
  console.log(`\n  Cube positions: [${cubePositions.join(', ')}]`);
  console.log(`  Pattern: All divisible by 3!`);
  console.log(`  Formula: Position = 3k for k = 1,2,3,...,8\n`);
  
  console.log('🔢 Discovery 2: Bit Position Pattern\n');
  console.log('Cube positions correspond to specific bit positions:');
  cubePositions.forEach(pos => {
    const bitPos = pos;
    console.log(`  Position ${pos} → Bit ${bitPos} → 2^${bitPos} = ${2 ** bitPos}`);
  });
  
  console.log('\n🧮 Discovery 3: Sum of Two Cubes Analysis\n');
  console.log('Testing if puzzle numbers are sums of two cubes:\n');
  
  PUZZLE_NUMBERS.slice(0, 12).forEach((num, idx) => {
    const results = findCubeSumPairs(num);
    if (results.length > 0) {
      console.log(`  ${num} = ${results.map(r => `${r[0]}³ + ${r[1]}³`).join(' = ')}`);
    }
  });
  
  console.log('\n💡 Hypothesis 1: Cube Modulo Operation\n');
  console.log('What if we use cube roots modulo 2048?');
  
  PUZZLE_NUMBERS.slice(0, 12).forEach((num, idx) => {
    const cbrt = Math.cbrt(num);
    const modResult = Math.floor(cbrt) % 2048;
    console.log(`  ∛${num.toString().padStart(8)} = ${cbrt.toFixed(3).padStart(8)} → mod 2048 = ${modResult.toString().padStart(4)}`);
  });
  
  console.log('\n💡 Hypothesis 2: Taxicab Table Lookup\n');
  console.log('What if powers index into taxicab number table?');
  
  // Map powers to taxicab indices
  PUZZLE_NUMBERS.slice(0, 10).forEach((num, idx) => {
    const taxicabIdx = (num - 2) / 2; // Simple mapping
    if (taxicabIdx < TAXICAB_NUMBERS.length) {
      const taxicab = TAXICAB_NUMBERS[Math.floor(taxicabIdx)];
      console.log(`  ${num} → Taxicab[${Math.floor(taxicabIdx)}] = ${taxicab?.n || 'N/A'}`);
    }
  });
  
  console.log('\n💡 Hypothesis 3: Cube-Sum Digit Extraction\n');
  console.log('Extract word indices from cube-sum components:');
  
  TAXICAB_NUMBERS.slice(0, 8).forEach(tc => {
    const [a, b] = tc.representations[0];
    const wordIndex = ((a * 100) + b) % 2048;
    console.log(`  ${tc.n} = ${a}³+${b}³ → (${a}*100+${b}) % 2048 = ${wordIndex}`);
  });
  
  console.log('\n🎯 Most Promising Approach:\n');
  console.log('Based on the pattern of cubes at every 3rd position,');
  console.log('the puzzle might use:');
  console.log('  1. Cube roots for cube positions (3,6,9,12,15,18,21,24)');
  console.log('  2. Different operation for non-cube positions');
  console.log('  3. Combine results to form word indices\n');
}

function findCubeSumPairs(target: number): [number, number][] {
  const results: [number, number][] = [];
  const maxCube = Math.cbrt(target);
  
  for (let a = 1; a <= maxCube; a++) {
    for (let b = a; b <= maxCube; b++) {
      if (a ** 3 + b ** 3 === target) {
        results.push([a, b]);
      }
    }
  }
  
  return results;
}

function generateWordIndices() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('TESTING CUBE-BASED WORD INDEX GENERATION');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log('Strategy: Use cube roots modulo 2048 for cubes, bit position for non-cubes\n');
  
  const wordIndices: number[] = [];
  
  PUZZLE_NUMBERS.forEach((num, idx) => {
    const position = idx + 1;
    const cubeRoot = Math.round(Math.cbrt(num));
    
    let wordIndex: number;
    
    if (cubeRoot ** 3 === num) {
      // It's a perfect cube - use cube root
      wordIndex = cubeRoot % 2048;
      console.log(`  ${position.toString().padStart(2)}. ${num.toString().padStart(8)} (${cubeRoot}³) → cube root ${cubeRoot} → ${wordIndex}`);
    } else {
      // Not a perfect cube - use bit position
      const bitPos = Math.log2(num);
      wordIndex = Math.floor(bitPos * 85.33) % 2048; // 85.33 ≈ 2048/24
      console.log(`  ${position.toString().padStart(2)}. ${num.toString().padStart(8)} (2^${bitPos}) → bit ${bitPos} → ${wordIndex}`);
    }
    
    wordIndices.push(wordIndex);
  });
  
  console.log(`\n📊 Generated Indices: [${wordIndices.slice(0, 8).join(', ')}, ...]`);
  console.log(`   (showing first 8 of 24)\n`);
  
  return wordIndices;
}

// Run analysis
console.log('\n');
analyzePatterns();
console.log('\n');
generateWordIndices();

console.log('\n═══════════════════════════════════════════════════════════');
console.log('NEXT STEPS');
console.log('═══════════════════════════════════════════════════════════\n');
console.log('1. Test generated indices with BIP39 wordlist');
console.log('2. Check if resulting mnemonic has "track" as last word');
console.log('3. If valid BIP39, test address derivation');
console.log('4. Try variations on cube/non-cube mapping strategy\n');
console.log('CRITICAL: Still need to identify exact "cube-sum table"');
console.log('          mentioned by puzzle author!\n');

export { analyzePatterns, findCubeSumPairs, generateWordIndices };
