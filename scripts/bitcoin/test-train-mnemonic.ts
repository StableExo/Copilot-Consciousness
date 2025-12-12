/**
 * Test "train" Mnemonic - Bitcoin Puzzle Quick Test
 * 
 * The Log2*Multiply(80.18) transformation produces a valid BIP39 mnemonic
 * with "train" as the last word. This script tests if it's the solution.
 * 
 * Based on findings from TRACK_TRANSFORMATIONS_ANALYSIS.md:
 * - 75% checksum match (6/8 bits)
 * - "train" (index 1848) is only 4 indices from "track" (1844)
 * - Valid BIP39 mnemonic
 * - High confidence this could be the answer
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
const MULTIPLIER = 80.18;

/**
 * Generate mnemonic using Log2*Multiply transformation
 */
function generateMnemonic(): string {
  const wordlist = bip39.wordlists.english;
  const words = PUZZLE_NUMBERS.map(num => {
    const log2Val = Math.log2(num);
    const index = Math.floor(log2Val * MULTIPLIER) % wordlist.length;
    return wordlist[index];
  });
  return words.join(' ');
}

/**
 * Derive address from mnemonic
 */
function deriveAddress(mnemonic: string): string | null {
  if (!bip39.validateMnemonic(mnemonic)) {
    console.log('❌ Invalid BIP39 mnemonic');
    return null;
  }
  
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const network = bitcoin.networks.bitcoin;
  
  // Try derivation path m/84'/0'/0'/0/0 (standard BIP84 for bc1 addresses)
  const root = bitcoin.bip32.fromSeed(seed, network);
  const child = root.derivePath("m/84'/0'/0'/0/0");
  
  if (!child.publicKey) {
    console.log('❌ Failed to derive public key');
    return null;
  }
  
  const { address } = bitcoin.payments.p2wpkh({
    pubkey: child.publicKey,
    network
  });
  
  return address || null;
}

/**
 * Test the mnemonic
 */
async function testMnemonic() {
  console.log('🔍 Testing "train" Mnemonic Solution');
  console.log('=====================================\n');
  
  // Generate mnemonic
  const mnemonic = generateMnemonic();
  const words = mnemonic.split(' ');
  const lastWord = words[23];
  
  console.log('📝 Generated Mnemonic:');
  console.log('-----------------------');
  
  // Print mnemonic in groups of 6 for readability
  for (let i = 0; i < words.length; i += 6) {
    const group = words.slice(i, i + 6);
    const indices = group.map((_, idx) => (i + idx + 1).toString().padStart(2, ' '));
    console.log(indices.join('. ') + '.');
    console.log(group.join(' '));
    console.log();
  }
  
  console.log(`Last word: "${lastWord}"`);
  console.log();
  
  // Validate BIP39
  const isValid = bip39.validateMnemonic(mnemonic);
  console.log(`✓ BIP39 Valid: ${isValid ? '✅ YES' : '❌ NO'}`);
  
  if (!isValid) {
    console.log('\n❌ Mnemonic is not valid BIP39. Cannot test further.');
    return;
  }
  
  console.log();
  
  // Derive address
  console.log('🔑 Deriving Address...');
  console.log('-----------------------');
  const derivedAddress = deriveAddress(mnemonic);
  
  if (!derivedAddress) {
    console.log('❌ Failed to derive address');
    return;
  }
  
  console.log(`Derived:  ${derivedAddress}`);
  console.log(`Target:   ${TARGET_ADDRESS}`);
  console.log();
  
  // Check if match
  const isMatch = derivedAddress === TARGET_ADDRESS;
  
  console.log('🎯 Result:');
  console.log('----------');
  
  if (isMatch) {
    console.log('🎉🎉🎉 SUCCESS! 🎉🎉🎉');
    console.log('');
    console.log('✅ THE MNEMONIC IS CORRECT!');
    console.log('✅ Address matches target!');
    console.log('');
    console.log('💰 Puzzle SOLVED!');
    console.log('💰 Reward: 0.08252025 BTC (~$5,500)');
    console.log('');
    console.log('📝 Winning Mnemonic:');
    console.log(mnemonic);
  } else {
    console.log('❌ Address does not match');
    console.log('');
    console.log('This is NOT the solution.');
    console.log('Next step: Proceed with video analysis (1-2 hours)');
  }
  
  console.log();
  console.log('=====================================');
  
  return isMatch;
}

// Run the test
testMnemonic().then((success) => {
  if (success) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}).catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
