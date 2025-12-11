/**
 * Test All Valid BIP39 Mnemonics - Bitcoin Puzzle
 * 
 * The Log2*Multiply(80.18) transformation produces 8 valid BIP39 mnemonics.
 * This script tests each one to see if it matches the target address.
 * 
 * Valid last words:
 * 1. banana (145)
 * 2. cloud (351)
 * 3. error (614)
 * 4. lend (1023)
 * 5. nephew (1186)
 * 6. ride (1483)
 * 7. state (1702)
 * 8. train (1848) ← Closest to "track" (1844)
 */

import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';

const bip32 = BIP32Factory(ecc);

const BASE_WORDS = [
  'focus', 'economy', 'expand', 'destroy', 'craft', 'chimney',
  'bulk', 'beef', 'anxiety', 'abandon', 'goddess', 'hotel',
  'joke', 'liquid', 'middle', 'north', 'park', 'price',
  'refuse', 'salmon', 'silent', 'sponsor', 'symbol'
];

const VALID_LAST_WORDS = [
  { word: 'banana', index: 145 },
  { word: 'cloud', index: 351 },
  { word: 'error', index: 614 },
  { word: 'lend', index: 1023 },
  { word: 'nephew', index: 1186 },
  { word: 'ride', index: 1483 },
  { word: 'state', index: 1702 },
  { word: 'train', index: 1848 }
];

const TARGET_ADDRESS = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';

/**
 * Derive multiple addresses using different derivation paths
 */
function deriveAddresses(mnemonic: string): Record<string, string> {
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const network = bitcoin.networks.bitcoin;
  const root = bip32.fromSeed(seed, network);
  
  const addresses: Record<string, string> = {};
  
  // Common derivation paths for bc1 (native SegWit) addresses
  const paths = [
    "m/84'/0'/0'/0/0",   // BIP84 standard (most common)
    "m/84'/0'/0'/0/1",   // Second address
    "m/84'/0'/0'/0/2",   // Third address
    "m/84'/0'/0'/1/0",   // Change address
    "m/49'/0'/0'/0/0",   // BIP49 (nested SegWit, but can generate bc1)
    "m/44'/0'/0'/0/0"    // BIP44 (legacy, but worth trying)
  ];
  
  for (const path of paths) {
    try {
      const child = root.derivePath(path);
      if (child.publicKey) {
        const { address } = bitcoin.payments.p2wpkh({
          pubkey: child.publicKey,
          network
        });
        if (address) {
          addresses[path] = address;
        }
      }
    } catch (error) {
      // Skip if derivation fails
    }
  }
  
  return addresses;
}

/**
 * Test a single mnemonic
 */
function testMnemonic(lastWord: string, index: number): boolean {
  const mnemonic = [...BASE_WORDS, lastWord].join(' ');
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Testing mnemonic with last word: "${lastWord}" (index ${index})`);
  console.log('='.repeat(70));
  
  // Validate
  const isValid = bip39.validateMnemonic(mnemonic);
  if (!isValid) {
    console.log('❌ Invalid BIP39 mnemonic (should not happen!)');
    return false;
  }
  
  console.log('✅ Valid BIP39 mnemonic');
  
  // Derive addresses
  const addresses = deriveAddresses(mnemonic);
  
  console.log('\nDerived addresses:');
  let foundMatch = false;
  
  for (const [path, address] of Object.entries(addresses)) {
    const isMatch = address === TARGET_ADDRESS;
    const symbol = isMatch ? '🎉' : '  ';
    console.log(`${symbol} ${path}: ${address}`);
    if (isMatch) {
      foundMatch = true;
    }
  }
  
  if (foundMatch) {
    console.log('\n🎉🎉🎉 SUCCESS! PUZZLE SOLVED! 🎉🎉🎉');
    console.log('');
    console.log('✅ This mnemonic derives to the target address!');
    console.log('💰 Reward: 0.08252025 BTC (~$5,500)');
    console.log('');
    console.log('📝 Winning Mnemonic:');
    console.log(mnemonic);
    console.log('');
    console.log(`🔑 Last word: "${lastWord}" (index ${index})`);
    return true;
  }
  
  return false;
}

/**
 * Test all valid mnemonics
 */
async function testAllMnemonics() {
  console.log('🔍 Testing All Valid BIP39 Mnemonics');
  console.log('=====================================');
  console.log('');
  console.log('Base words (first 23):');
  console.log(BASE_WORDS.join(' '));
  console.log('');
  console.log(`Target address: ${TARGET_ADDRESS}`);
  console.log(`Testing ${VALID_LAST_WORDS.length} valid mnemonics...`);
  
  let winnerFound = false;
  let winningLastWord = '';
  
  for (const { word, index } of VALID_LAST_WORDS) {
    const isWinner = testMnemonic(word, index);
    if (isWinner) {
      winnerFound = true;
      winningLastWord = word;
      break; // Stop on first match
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('FINAL RESULT');
  console.log('='.repeat(70));
  
  if (winnerFound) {
    console.log('');
    console.log('🏆 PUZZLE SOLVED!');
    console.log(`🏆 Winning last word: "${winningLastWord}"`);
    console.log('🏆 The transformation Log2*Multiply(80.18) was correct!');
    console.log('');
  } else {
    console.log('');
    console.log('❌ None of the 8 valid mnemonics match the target address');
    console.log('');
    console.log('📋 Next steps:');
    console.log('   1. Video analysis (1-2 hours) - look for exact formula');
    console.log('   2. Try other transformation types');
    console.log('   3. Check if target address might use non-standard derivation');
    console.log('');
  }
}

// Run the test
testAllMnemonics().then(() => {
  console.log('\nTest complete.');
}).catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
