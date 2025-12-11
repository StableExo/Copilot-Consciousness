/**
 * Bitcoin Mnemonic Puzzle Solver
 * 
 * Puzzle: 24 powers-of-2 numbers mapping to BIP39 wordlist
 * Reward: 0.08252025 BTC at bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
 * Source: https://www.threads.com/@hunghuatang/post/DNwj6PxxHcd
 * 
 * Strategy: Binary manipulation to decode correct word indices
 */

import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';

// The 24 numbers from the puzzle (all powers of 2)
const PUZZLE_NUMBERS = [
  512, 128, 256, 64, 32, 16, 8, 4, 2, 1,
  1024, 2048, 4096, 8192, 16384, 32768,
  65536, 131072, 262144, 524288, 1048576,
  2097152, 4194304, 8388608
];

// Target Bitcoin address to verify
const TARGET_ADDRESS = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';

// Last word hint
const LAST_WORD_HINT = 'track';

/**
 * Load BIP39 English wordlist
 */
function loadWordlist(): string[] {
  return bip39.wordlists.english;
}

/**
 * Strategy 1: Direct mapping (numbers as 1-based indices)
 */
function directMapping(numbers: number[], wordlist: string[]): string[] {
  return numbers.map(num => {
    const index = num - 1; // Convert to 0-based
    if (index >= 0 && index < wordlist.length) {
      return wordlist[index];
    }
    return 'INVALID';
  });
}

/**
 * Strategy 2: Binary bit positions
 * Each number is a power of 2, representing a bit position
 * Use bit positions to select words
 */
function bitPositionMapping(numbers: number[], wordlist: string[]): string[] {
  return numbers.map(num => {
    // Find bit position (log2)
    const bitPos = Math.log2(num);
    if (Number.isInteger(bitPos) && bitPos >= 0 && bitPos < wordlist.length) {
      return wordlist[bitPos];
    }
    return 'INVALID';
  });
}

/**
 * Strategy 3: Modulo shift with pi digits
 * Hint from video: "Shift by pi digits"
 */
function piShiftMapping(numbers: number[], wordlist: string[], piDigits: number[]): string[] {
  return numbers.map((num, idx) => {
    const shift = piDigits[idx % piDigits.length];
    const newIndex = (num + shift - 1) % wordlist.length;
    return wordlist[newIndex];
  });
}

/**
 * Strategy 4: XOR with constant
 */
function xorMapping(numbers: number[], wordlist: string[], xorKey: number): string[] {
  return numbers.map(num => {
    const xored = num ^ xorKey;
    const index = xored % wordlist.length;
    return wordlist[index];
  });
}

/**
 * Strategy 5: Sum adjacent pairs (magic constant 130 hint)
 */
function pairSumMapping(numbers: number[], wordlist: string[]): string[] {
  const words: string[] = [];
  for (let i = 0; i < numbers.length; i += 2) {
    if (i + 1 < numbers.length) {
      const sum = numbers[i] + numbers[i + 1];
      const index = sum % wordlist.length;
      words.push(wordlist[index]);
    }
  }
  return words;
}

/**
 * Strategy 6: Reverse binary representation
 */
function reverseBitMapping(numbers: number[], wordlist: string[]): string[] {
  return numbers.map(num => {
    // Reverse bits
    const binary = num.toString(2);
    const reversed = parseInt(binary.split('').reverse().join(''), 2);
    const index = reversed % wordlist.length;
    return wordlist[index];
  });
}

/**
 * Validate BIP39 mnemonic and derive address
 */
async function validateAndDerive(mnemonic: string): Promise<{
  valid: boolean;
  address?: string;
  matches?: boolean;
}> {
  // Check if valid BIP39
  const valid = bip39.validateMnemonic(mnemonic);
  if (!valid) {
    return { valid: false };
  }

  try {
    // Generate seed
    const seed = await bip39.mnemonicToSeed(mnemonic);
    
    // Derive address (native segwit - bc1q...)
    const root = bitcoin.bip32.fromSeed(seed);
    const path = "m/84'/0'/0'/0/0"; // Native segwit (bech32)
    const child = root.derivePath(path);
    
    const { address } = bitcoin.payments.p2wpkh({
      pubkey: child.publicKey,
      network: bitcoin.networks.bitcoin,
    });

    const matches = address === TARGET_ADDRESS;
    
    return { valid: true, address, matches };
  } catch (error) {
    console.error('Derivation error:', error);
    return { valid: false };
  }
}

/**
 * Main solver - try all strategies
 */
async function solvePuzzle() {
  console.log('🔍 Bitcoin Mnemonic Puzzle Solver');
  console.log('================================\n');
  console.log('Target Address:', TARGET_ADDRESS);
  console.log('Puzzle Numbers:', PUZZLE_NUMBERS.slice(0, 5), '...');
  console.log('Last Word Hint:', LAST_WORD_HINT, '\n');

  const wordlist = loadWordlist();
  const piDigits = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 8, 9, 7, 9, 3, 2, 3, 8, 4, 6, 2, 6, 4];

  const strategies = [
    {
      name: 'Direct Mapping (1-based indices)',
      fn: () => directMapping(PUZZLE_NUMBERS, wordlist)
    },
    {
      name: 'Binary Bit Positions',
      fn: () => bitPositionMapping(PUZZLE_NUMBERS, wordlist)
    },
    {
      name: 'Pi-Shift Mapping',
      fn: () => piShiftMapping(PUZZLE_NUMBERS, wordlist, piDigits)
    },
    {
      name: 'XOR with 42',
      fn: () => xorMapping(PUZZLE_NUMBERS, wordlist, 42)
    },
    {
      name: 'XOR with 256',
      fn: () => xorMapping(PUZZLE_NUMBERS, wordlist, 256)
    },
    {
      name: 'Reverse Bits',
      fn: () => reverseBitMapping(PUZZLE_NUMBERS, wordlist)
    },
  ];

  for (const strategy of strategies) {
    console.log(`\n📝 Testing: ${strategy.name}`);
    console.log('─'.repeat(50));
    
    const words = strategy.fn();
    const mnemonic = words.join(' ');
    
    console.log('First 5 words:', words.slice(0, 5).join(' '));
    console.log('Last word:', words[words.length - 1]);
    console.log('Matches hint?', words[words.length - 1] === LAST_WORD_HINT);

    const result = await validateAndDerive(mnemonic);
    
    if (result.valid) {
      console.log('✅ Valid BIP39 mnemonic!');
      console.log('Derived Address:', result.address);
      
      if (result.matches) {
        console.log('🎉🎉🎉 SOLUTION FOUND! 🎉🎉🎉');
        console.log('Winning Mnemonic:', mnemonic);
        console.log('Match:', result.address, '===', TARGET_ADDRESS);
        return mnemonic;
      } else {
        console.log('❌ Address does not match target');
      }
    } else {
      console.log('❌ Invalid BIP39 checksum');
    }
  }

  console.log('\n❌ No solution found with basic strategies');
  console.log('💡 Next: Try advanced permutations, anagrams, or custom shifts');
  return null;
}

// Export for testing
export {
  PUZZLE_NUMBERS,
  TARGET_ADDRESS,
  directMapping,
  bitPositionMapping,
  piShiftMapping,
  xorMapping,
  validateAndDerive,
  solvePuzzle
};

// Run if executed directly
if (require.main === module) {
  solvePuzzle()
    .then(solution => {
      if (solution) {
        console.log('\n✅ Puzzle solved! Ready to claim reward.');
      } else {
        console.log('\n⏸️  Need more analysis. Check video hints.');
      }
    })
    .catch(error => {
      console.error('Error:', error);
    });
}
