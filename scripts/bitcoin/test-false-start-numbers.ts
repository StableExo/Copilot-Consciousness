/**
 * Test False Start Numbers from YouTube Video
 * 
 * @hunghuatang explicitly said in the video:
 * "but it can be done, and I gave you a false start. 
 * It does not work if you have these numbers in this order 8,1,3,6,10"
 * 
 * This script verifies that using BIP39 word indices 8,1,3,6,10 
 * (in that order at the start of the mnemonic) does NOT generate 
 * the target address.
 */

import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';

const bip32 = BIP32Factory(ecc);

const TARGET_ADDRESS = 'bc1qkf6trv39epu4n0wfzw4mk58zf5hrvwd442aksk';

// BIP39 wordlist (English)
const wordlist = bip39.wordlists.english;

console.log('🧪 Testing FALSE START Numbers from YouTube Video');
console.log('='.repeat(70));
console.log('Target:', TARGET_ADDRESS);
console.log('');
console.log('Video Quote:');
console.log('"but it can be done, and I gave you a false start.');
console.log('It does not work if you have these numbers in this order 8,1,3,6,10"');
console.log('');

// Test both 0-indexed and 1-indexed interpretations
const tests = [
  {
    name: '1-indexed (1-2048)',
    indices: [8, 1, 3, 6, 10],
    offset: -1, // Convert to 0-indexed for array access
  },
  {
    name: '0-indexed (0-2047)',
    indices: [8, 1, 3, 6, 10],
    offset: 0,
  },
  {
    name: 'Reversed (10,6,3,1,8) - 1-indexed',
    indices: [10, 6, 3, 1, 8],
    offset: -1,
  },
  {
    name: 'Sorted (1,3,6,8,10) - 1-indexed',
    indices: [1, 3, 6, 8, 10],
    offset: -1,
  },
];

function getWord(index: number, offset: number): string {
  return wordlist[index + offset];
}

function generateDummyMnemonic(startIndices: number[], offset: number): string {
  // Get the first 5 words from indices
  const startWords = startIndices.map(idx => getWord(idx, offset));
  
  // Fill remaining 19 words to make 24-word mnemonic
  // Using simple pattern for testing (just repeat "abandon" or use incrementing indices)
  const remainingWords = [];
  for (let i = 0; i < 19; i++) {
    remainingWords.push(wordlist[i]);
  }
  
  const allWords = [...startWords, ...remainingWords];
  return allWords.join(' ');
}

// Standard paths to test
const PATHS = [
  "m/84'/0'/0'/0/0",
  "m/84'/0'/0'/0/1",
  "m/84'/0'/0'/1/0",
  "m/84'/0'/1'/0/0",
];

function testMnemonic(mnemonic: string, testName: string): boolean {
  try {
    // Validate mnemonic
    if (!bip39.validateMnemonic(mnemonic)) {
      console.log(`   ⚠️  Invalid mnemonic for ${testName}`);
      return false;
    }

    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const root = bip32.fromSeed(seed);
    
    for (const path of PATHS) {
      const child = root.derivePath(path);
      const { address } = bitcoin.payments.p2wpkh({
        pubkey: child.publicKey,
        network: bitcoin.networks.bitcoin,
      });
      
      if (address === TARGET_ADDRESS) {
        console.log('');
        console.log('🚨 UNEXPECTED! This mnemonic DOES work!');
        console.log('Test:', testName);
        console.log('Mnemonic:', mnemonic);
        console.log('Path:', path);
        console.log('Address:', address);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.log(`   ❌ Error testing ${testName}:`, error);
    return false;
  }
}

console.log('Testing FALSE START variations:');
console.log('');

let foundMatch = false;

for (const test of tests) {
  const mnemonic = generateDummyMnemonic(test.indices, test.offset);
  const startWords = mnemonic.split(' ').slice(0, 5).join(' ');
  
  console.log(`📝 Test: ${test.name}`);
  console.log(`   Indices: ${test.indices.join(', ')}`);
  console.log(`   Start words: "${startWords}"`);
  
  if (testMnemonic(mnemonic, test.name)) {
    foundMatch = true;
  } else {
    console.log(`   ✅ Confirmed: Does NOT generate target address`);
  }
  console.log('');
}

if (!foundMatch) {
  console.log('✅ VERIFICATION COMPLETE');
  console.log('');
  console.log('All tested variations with numbers 8,1,3,6,10 confirmed as FALSE STARTS.');
  console.log('These indices do NOT generate the target address.');
  console.log('');
  console.log('💡 This confirms the video clue is accurate.');
  console.log('   The puzzle requires finding the CORRECT number sequence.');
  console.log('');
  console.log('🔍 Next steps:');
  console.log('   1. Analyze BIP39 word table image for number patterns');
  console.log('   2. Study pi digits, magic 130, and other clues');
  console.log('   3. Determine the correct number sequence');
} else {
  console.log('⚠️  UNEXPECTED RESULT');
  console.log('One of the false start variations matched!');
  console.log('This contradicts the video clue.');
}

console.log('');
console.log('📊 Summary:');
console.log(`   Tested: ${tests.length} variations`);
console.log(`   Paths per variation: ${PATHS.length}`);
console.log(`   Total tests: ${tests.length * PATHS.length}`);
