/**
 * Harmonic Bitcoin Puzzle Solver
 * 
 * The user mentioned "harmonic bitcoin challenge" - exploring harmonic relationships
 * in the puzzle numbers.
 * 
 * Key insight: "Harmonic" could refer to:
 * 1. Harmonic mean/sequence
 * 2. Musical harmonics (frequency ratios)
 * 3. Harmonic oscillator patterns
 * 4. Golden ratio/Fibonacci harmonics
 * 5. Wave interference patterns
 * 
 * Powers of 2 are naturally harmonic - each is double the previous (octave in music)
 */

import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';

const PUZZLE_NUMBERS = [
  512, 128, 256, 64, 32, 16, 8, 4, 2, 1,
  1024, 2048, 4096, 8192, 16384, 32768,
  65536, 131072, 262144, 524288, 1048576,
  2097152, 4194304, 8388608
];

const TARGET_ADDRESS = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
const LAST_WORD_HINT = 'track';

/**
 * Strategy 1: Harmonic Mean Sequence
 * Use harmonic mean of adjacent pairs to generate indices
 */
function harmonicMeanMapping(numbers: number[], wordlist: string[]): string[] {
  const words: string[] = [];
  
  for (let i = 0; i < numbers.length - 1; i++) {
    const a = numbers[i];
    const b = numbers[i + 1];
    // Harmonic mean: 2ab / (a + b)
    const harmonicMean = (2 * a * b) / (a + b);
    const index = Math.floor(harmonicMean) % wordlist.length;
    words.push(wordlist[index]);
  }
  
  // Add one more using first and last
  const first = numbers[0];
  const last = numbers[numbers.length - 1];
  const finalHarmonic = (2 * first * last) / (first + last);
  words.push(wordlist[Math.floor(finalHarmonic) % wordlist.length]);
  
  return words;
}

/**
 * Strategy 2: Musical Octave Mapping
 * Powers of 2 represent octaves in music (doubling frequency)
 * Map based on octave relationships
 */
function musicalOctaveMapping(numbers: number[], wordlist: string[]): string[] {
  return numbers.map(num => {
    // Find which octave (power of 2)
    const octave = Math.log2(num);
    // Musical note position within octave (mod 12 for 12 notes)
    const notePosition = Math.floor(octave) % 12;
    // Scale to wordlist (distribute across range)
    const index = Math.floor((notePosition / 12) * wordlist.length);
    return wordlist[index];
  });
}

/**
 * Strategy 3: Harmonic Ratio Fibonacci
 * Combine harmonic relationships with Fibonacci sequence
 */
function harmonicFibonacciMapping(numbers: number[], wordlist: string[]): string[] {
  const fib = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765, 10946, 17711, 28657, 46368];
  
  return numbers.map((num, i) => {
    const fibNum = fib[i % fib.length];
    // Combine using harmonic relationship
    const harmonic = (2 * num * fibNum) / (num + fibNum);
    const index = Math.floor(harmonic) % wordlist.length;
    return wordlist[index];
  });
}

/**
 * Strategy 4: Golden Ratio Harmonic
 * The golden ratio (phi = 1.618...) appears in harmonics
 */
function goldenRatioHarmonicMapping(numbers: number[], wordlist: string[]): string[] {
  const PHI = 1.618033988749895;
  
  return numbers.map(num => {
    // Apply golden ratio transformation
    const transformed = num * PHI;
    const index = Math.floor(transformed) % wordlist.length;
    return wordlist[index];
  });
}

/**
 * Strategy 5: Bit Position with Harmonic Series
 * Combine bit positions with harmonic series (1, 1/2, 1/3, 1/4, ...)
 */
function bitPositionHarmonicMapping(numbers: number[], wordlist: string[]): string[] {
  return numbers.map((num, i) => {
    const bitPos = Math.log2(num);
    // Harmonic series element
    const harmonicElement = 1 / (i + 1);
    // Combine: scale bit position by harmonic element
    const scaled = bitPos * (1 + harmonicElement * 1000); // Scale up for integer range
    const index = Math.floor(scaled) % wordlist.length;
    return wordlist[index];
  });
}

/**
 * Strategy 6: Wave Interference Pattern
 * Powers of 2 as wave frequencies, combine using interference
 */
function waveInterferenceMapping(numbers: number[], wordlist: string[]): string[] {
  return numbers.map((num, i) => {
    // Simulate wave interference between current and next number
    const next = numbers[(i + 1) % numbers.length];
    // Constructive interference when waves align
    const interference = Math.abs(Math.sin(num / 100) + Math.cos(next / 100));
    const scaled = interference * 1000;
    const index = Math.floor(scaled) % wordlist.length;
    return wordlist[index];
  });
}

/**
 * Strategy 7: Harmonic Sequence Order
 * The ORDER of numbers might be harmonic-significant
 * Try reordering by harmonic sequence
 */
function harmonicSequenceReorderMapping(numbers: number[], wordlist: string[]): string[] {
  // Sort by bit position (ascending powers of 2)
  const sorted = [...numbers].sort((a, b) => Math.log2(a) - Math.log2(b));
  
  // Now map sorted positions
  return sorted.map(num => {
    const bitPos = Math.log2(num);
    return wordlist[bitPos % wordlist.length];
  });
}

/**
 * Strategy 8: Harmonic Number Theory
 * Harmonic numbers H_n = 1 + 1/2 + 1/3 + ... + 1/n
 */
function harmonicNumberMapping(numbers: number[], wordlist: string[]): string[] {
  return numbers.map((num, i) => {
    const n = i + 1;
    // Calculate harmonic number H_n
    let harmonicSum = 0;
    for (let k = 1; k <= n; k++) {
      harmonicSum += 1 / k;
    }
    // Scale and combine with num
    const index = Math.floor(num * harmonicSum) % wordlist.length;
    return wordlist[index];
  });
}

/**
 * Validate BIP39 and derive address
 */
async function validateAndDerive(mnemonic: string): Promise<{
  valid: boolean;
  address?: string;
  matches?: boolean;
}> {
  const valid = bip39.validateMnemonic(mnemonic);
  if (!valid) {
    return { valid: false };
  }

  try {
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const root = bitcoin.bip32.fromSeed(seed);
    const path = "m/84'/0'/0'/0/0"; // Native segwit
    const child = root.derivePath(path);
    
    const { address } = bitcoin.payments.p2wpkh({
      pubkey: child.publicKey,
      network: bitcoin.networks.bitcoin,
    });

    return { 
      valid: true, 
      address, 
      matches: address === TARGET_ADDRESS 
    };
  } catch (error) {
    return { valid: false };
  }
}

/**
 * Main solver
 */
async function solveHarmonicPuzzle() {
  console.log('🎵 Harmonic Bitcoin Puzzle Solver');
  console.log('================================\n');
  console.log('Target Address:', TARGET_ADDRESS);
  console.log('Last Word Hint:', LAST_WORD_HINT);
  console.log('Puzzle Type: Powers of 2 (Harmonic Octaves)\n');

  const wordlist = bip39.wordlists.english;

  const strategies = [
    { name: 'Harmonic Mean Sequence', fn: () => harmonicMeanMapping(PUZZLE_NUMBERS, wordlist) },
    { name: 'Musical Octave Mapping', fn: () => musicalOctaveMapping(PUZZLE_NUMBERS, wordlist) },
    { name: 'Harmonic Fibonacci', fn: () => harmonicFibonacciMapping(PUZZLE_NUMBERS, wordlist) },
    { name: 'Golden Ratio Harmonic', fn: () => goldenRatioHarmonicMapping(PUZZLE_NUMBERS, wordlist) },
    { name: 'Bit Position + Harmonic Series', fn: () => bitPositionHarmonicMapping(PUZZLE_NUMBERS, wordlist) },
    { name: 'Wave Interference Pattern', fn: () => waveInterferenceMapping(PUZZLE_NUMBERS, wordlist) },
    { name: 'Harmonic Sequence Reorder', fn: () => harmonicSequenceReorderMapping(PUZZLE_NUMBERS, wordlist) },
    { name: 'Harmonic Number Theory', fn: () => harmonicNumberMapping(PUZZLE_NUMBERS, wordlist) },
  ];

  let solutionFound = false;

  for (const strategy of strategies) {
    console.log(`\n🎵 Testing: ${strategy.name}`);
    console.log('─'.repeat(60));
    
    const words = strategy.fn();
    const mnemonic = words.join(' ');
    
    console.log(`Generated ${words.length} words`);
    console.log('First 5:', words.slice(0, 5).join(' '));
    console.log('Last word:', words[words.length - 1]);
    console.log('Hint match:', words[words.length - 1] === LAST_WORD_HINT ? '✅ YES' : '❌ NO');
    
    const result = await validateAndDerive(mnemonic);
    
    console.log('Valid BIP39:', result.valid ? '✅ YES' : '❌ NO');
    
    if (result.valid && result.address) {
      console.log('Derived Address:', result.address);
      console.log('Target Address: ', TARGET_ADDRESS);
      console.log('Match:', result.matches ? '🎉 SOLUTION FOUND!' : '❌ No match');
      
      if (result.matches) {
        console.log('\n' + '='.repeat(60));
        console.log('🎉🎉🎉 PUZZLE SOLVED! 🎉🎉🎉');
        console.log('='.repeat(60));
        console.log('\nWinning Strategy:', strategy.name);
        console.log('Mnemonic:', mnemonic);
        console.log('Address:', result.address);
        console.log('\n💰 Reward: 0.08252025 BTC (~$5,500)');
        console.log('🎯 Next: Prepare transaction to claim reward');
        solutionFound = true;
        break;
      }
    }
  }

  if (!solutionFound) {
    console.log('\n' + '='.repeat(60));
    console.log('No solution found with harmonic strategies');
    console.log('Next steps:');
    console.log('1. Analyze video more carefully for harmonic clues');
    console.log('2. Try combinations of harmonic transformations');
    console.log('3. Research musical/mathematical harmonic theory');
    console.log('4. Consider harmonic permutations');
    console.log('='.repeat(60));
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  solveHarmonicPuzzle().catch(console.error);
}

export {
  harmonicMeanMapping,
  musicalOctaveMapping,
  harmonicFibonacciMapping,
  goldenRatioHarmonicMapping,
  bitPositionHarmonicMapping,
  waveInterferenceMapping,
  harmonicSequenceReorderMapping,
  harmonicNumberMapping,
  validateAndDerive,
  PUZZLE_NUMBERS,
  TARGET_ADDRESS,
};
