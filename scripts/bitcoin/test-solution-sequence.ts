/**
 * Test the Complete Solution Sequence from Video (Timestamp 4:22)
 * 
 * The video shows the correct Hamiltonian path for numbers 1-15:
 * 8, 1, 15, 10, 6, 3, 13, 12, 4, 5, 11, 14, 2, 7, 9
 * 
 * This script tests this sequence as BIP39 word indices
 */

import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';

const bip32 = BIP32Factory(ecc);
const wordlist = bip39.wordlists.english;

const TARGET_ADDRESS = 'bc1qkf6trv39epu4n0wfzw4mk58zf5hrvwd442aksk';

console.log('🎯 Testing Solution Sequence from Video (Timestamp 4:22)');
console.log('='.repeat(70));
console.log('');

// The complete Hamiltonian path shown in video
const SOLUTION_SEQUENCE = [8, 1, 15, 10, 6, 3, 13, 12, 4, 5, 11, 14, 2, 7, 9];

console.log('Solution sequence from video:');
console.log(SOLUTION_SEQUENCE.join(', '));
console.log('');

// Verify it's a valid square sum sequence
console.log('Verifying adjacent pairs sum to perfect squares:');
let allValid = true;
for (let i = 0; i < SOLUTION_SEQUENCE.length - 1; i++) {
  const a = SOLUTION_SEQUENCE[i];
  const b = SOLUTION_SEQUENCE[i + 1];
  const sum = a + b;
  const sqrt = Math.sqrt(sum);
  const isSquare = sqrt === Math.floor(sqrt);
  
  console.log(`  ${a} + ${b} = ${sum} ${isSquare ? '✓' : '✗'} ${isSquare ? `(${sqrt}²)` : ''}`);
  
  if (!isSquare) allValid = false;
}

console.log('');
if (allValid) {
  console.log('✅ All pairs verified! This is a valid Hamiltonian path.');
} else {
  console.log('❌ Some pairs don\'t sum to perfect squares!');
}

console.log('');
console.log('='.repeat(70));
console.log('Testing as BIP39 Word Indices');
console.log('='.repeat(70));
console.log('');

// Test both 0-indexed and 1-indexed
const tests = [
  {
    name: '1-indexed (1-2048)',
    indices: SOLUTION_SEQUENCE,
    offset: -1,
  },
  {
    name: '0-indexed (0-2047)',
    indices: SOLUTION_SEQUENCE,
    offset: 0,
  },
];

for (const test of tests) {
  console.log(`Test: ${test.name}`);
  console.log('');
  
  const words = test.indices.map(i => wordlist[i + test.offset]);
  console.log('Words:');
  words.forEach((word, idx) => {
    console.log(`  ${test.indices[idx]}: ${word}`);
  });
  
  console.log('');
  console.log(`Mnemonic (15 words): ${words.join(' ')}`);
  console.log('');
  
  // This is only 15 words, not a valid 24-word mnemonic
  console.log('⚠️  This is only 15 words. Need to extend to 24 for valid BIP39!');
  console.log('');
}

console.log('='.repeat(70));
console.log('Extension Strategies');
console.log('='.repeat(70));
console.log('');

console.log('Option 1: Find Hamiltonian path for size 23');
console.log('  - Video mentions size 23 works');
console.log('  - Extract 24 nodes from size 23 path');
console.log('');

console.log('Option 2: Find Hamiltonian path for size 25+');
console.log('  - Video says "from 25 onwards it works for every possible value"');
console.log('  - Extract 24 nodes from size 25 path');
console.log('');

console.log('Option 3: Repeat or transform pattern');
console.log('  - Apply pi-digit transformation');
console.log('  - Use "magic 130" as modifier');
console.log('  - Extend pattern mathematically');
console.log('');

console.log('Option 4: Use multiple sequences');
console.log('  - First 15 from this sequence');
console.log('  - Next 9 from another pattern');
console.log('  - Combine to 24 words');
console.log('');

console.log('='.repeat(70));
console.log('Comparison with False Start');
console.log('='.repeat(70));
console.log('');

const FALSE_START = [8, 1, 3, 6, 10];
const SOLUTION_START = SOLUTION_SEQUENCE.slice(0, 5);

console.log(`False start: ${FALSE_START.join(', ')}`);
console.log(`Solution start: ${SOLUTION_START.join(', ')}`);
console.log('');

console.log('Difference:');
console.log('  Both start with: 8, 1');
console.log(`  False start continues: 3, 6, 10`);
console.log(`  Correct path continues: 15, 10, 6, ...`);
console.log('');
console.log('After 8,1 the correct path goes to 15, not 3!');
console.log('This is why the false start is a dead end.');
console.log('');

console.log('='.repeat(70));
console.log('Summary');
console.log('='.repeat(70));
console.log('');
console.log('✅ Found complete Hamiltonian path for 1-15 from video');
console.log('✅ Verified all pairs sum to perfect squares');
console.log('✅ Identified difference from false start');
console.log('⏳ Need to extend from 15 to 24 words');
console.log('⏳ Need to apply pi/magic 130 transformations');
console.log('⏳ Need to test generated mnemonics');
console.log('');
console.log('Next: Build graph for size 23/25 and find extended path!');
