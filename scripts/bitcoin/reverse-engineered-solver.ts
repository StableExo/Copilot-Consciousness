/**
 * Reverse-Engineering Bitcoin Puzzle Solver
 * 
 * Strategy: Work backwards from the "track" constraint
 * - Last word MUST be "track" (index 1844 in wordlist)
 * - Last number is 8388608 (2^23)
 * - Find transformation: 8388608 → 1844
 * - Apply same transformation to all numbers
 */

import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';

const PUZZLE_NUMBERS = [
  512, 128, 256, 64, 32, 16, 8, 4, 2, 1,
  1024, 2048, 4096, 8192, 16384, 32768,
  65536, 131072, 262144, 524288, 1048576,
  2097152, 4194304, 8388608
];

const TARGET_ADDRESS = 'bc1qkf6trv39epu4n0wfzw4mk58zf5hrvwd442aksk';
const LAST_WORD = 'track';
const TRACK_INDEX = 1844; // Index of "track" in BIP39 wordlist
const LAST_NUMBER = 8388608; // 2^23

/**
 * Find transformations that map LAST_NUMBER → TRACK_INDEX
 */
function findPossibleTransformations(): Array<{ name: string, fn: (n: number) => number }> {
  const transformations: Array<{ name: string, fn: (n: number) => number }> = [];
  
  // 1. Simple division
  const divFactor = LAST_NUMBER / TRACK_INDEX;
  transformations.push({
    name: `Division by ${divFactor.toFixed(2)}`,
    fn: (n) => Math.floor(n / divFactor)
  });
  
  // 2. Modulo operations
  for (let mod of [2048, 4096, 8192, 16384]) {
    if ((LAST_NUMBER % mod) === TRACK_INDEX || Math.abs((LAST_NUMBER % mod) - TRACK_INDEX) < 100) {
      transformations.push({
        name: `Modulo ${mod}`,
        fn: (n) => n % mod
      });
    }
  }
  
  // 3. Bit shifts
  for (let shift = 1; shift <= 15; shift++) {
    const shifted = LAST_NUMBER >> shift;
    if (shifted === TRACK_INDEX || Math.abs(shifted - TRACK_INDEX) < 100) {
      transformations.push({
        name: `Right shift ${shift} bits`,
        fn: (n) => n >> shift
      });
    }
  }
  
  // 4. XOR with constant
  const xorKey = LAST_NUMBER ^ TRACK_INDEX;
  transformations.push({
    name: `XOR with ${xorKey}`,
    fn: (n) => n ^ xorKey
  });
  
  // 5. Subtract constant
  const subtractConst = LAST_NUMBER - TRACK_INDEX;
  transformations.push({
    name: `Subtract ${subtractConst}`,
    fn: (n) => Math.max(0, n - subtractConst)
  });
  
  // 6. Log2 then scale
  const log2Last = Math.log2(LAST_NUMBER); // 23
  const scaleToTrack = TRACK_INDEX / log2Last; // 1844 / 23 ≈ 80.17
  transformations.push({
    name: `Log2 then multiply by ${scaleToTrack.toFixed(2)}`,
    fn: (n) => Math.floor(Math.log2(n) * scaleToTrack)
  });
  
  // 7. Magic constant 130 hint
  // Try: (number / 130) % 2048
  transformations.push({
    name: 'Divide by 130, mod 2048',
    fn: (n) => Math.floor(n / 130) % 2048
  });
  
  // 8. Pi digits sum with bit position
  const piDigits = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 8, 9, 7, 9, 3, 2, 3, 8, 4, 6, 2, 6, 4];
  const bitPos23 = 23;
  const piSum23 = piDigits.slice(0, bitPos23).reduce((a, b) => a + b, 0);
  transformations.push({
    name: `Bit position + sum of pi digits`,
    fn: (n) => {
      const bp = Math.log2(n);
      const piSum = piDigits.slice(0, Math.floor(bp)).reduce((a, b) => a + b, 0);
      return (Math.floor(bp) * 100 + piSum) % 2048;
    }
  });
  
  // 9. Bit reversal within 11-bit window (BIP39 uses 11 bits per word)
  transformations.push({
    name: 'Reverse 11 bits',
    fn: (n) => {
      const binary = n.toString(2).padStart(11, '0').slice(-11);
      return parseInt(binary.split('').reverse().join(''), 2);
    }
  });
  
  // 10. Square root scaled
  transformations.push({
    name: 'Square root scaled',
    fn: (n) => Math.floor(Math.sqrt(n)) % 2048
  });
  
  return transformations;
}

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
    const path = "m/84'/0'/0'/0/0";
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

async function solveReverseEngineered() {
  console.log('🔧 Reverse-Engineering Bitcoin Puzzle Solver');
  console.log('================================\n');
  console.log('Constraint: Last word MUST be "track"');
  console.log('Track index:', TRACK_INDEX);
  console.log('Last number:', LAST_NUMBER, '(2^23)');
  console.log('Finding transformations:', LAST_NUMBER, '→', TRACK_INDEX);
  console.log('');

  const wordlist = bip39.wordlists.english;
  const transformations = findPossibleTransformations();
  
  console.log(`Found ${transformations.length} candidate transformations\n`);
  
  let solutionFound = false;

  for (const transform of transformations) {
    console.log(`\n🔍 Testing: ${transform.name}`);
    console.log('─'.repeat(60));
    
    // Apply transformation to all numbers
    const indices = PUZZLE_NUMBERS.map(transform.fn);
    
    // Ensure all indices are within wordlist bounds
    const validIndices = indices.map(i => Math.abs(i) % 2048);
    const words = validIndices.map(i => wordlist[i]);
    
    const lastWord = words[words.length - 1];
    const lastWordMatches = lastWord === LAST_WORD;
    
    console.log('First 5 words:', words.slice(0, 5).join(' '));
    console.log('Last word:', lastWord);
    console.log('Last word matches "track":', lastWordMatches ? '✅ YES' : '❌ NO');
    
    if (!lastWordMatches) {
      console.log('❌ Skipping (last word doesn\'t match)');
      continue;
    }
    
    console.log('🎯 Last word matches! Testing full mnemonic...');
    
    const mnemonic = words.join(' ');
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
        console.log('\nWinning Transformation:', transform.name);
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
    console.log('No solution found with reverse-engineered transformations');
    console.log('\nKey findings:');
    console.log('- Tested', transformations.length, 'transformations');
    console.log('- None produced both "track" AND valid BIP39');
    console.log('\nNext approaches:');
    console.log('1. Combine multiple transformations');
    console.log('2. Analyze video frame-by-frame for exact formula');
    console.log('3. Try two-step transformations (transform A then transform B)');
    console.log('4. Research creator\'s other puzzles for patterns');
    console.log('='.repeat(60));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  solveReverseEngineered().catch(console.error);
}

export { findPossibleTransformations, validateAndDerive, PUZZLE_NUMBERS, TARGET_ADDRESS, TRACK_INDEX };
