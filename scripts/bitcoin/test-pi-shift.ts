/**
 * Pi-Shift Transformation Test
 * 
 * Based on Grok's suggestion: Apply pi-digit shift to indices
 * "Shift by pi digits" hint at timestamp 1:23 in video
 * 
 * Pi digits: 3,1,4,1,5,9,2,6,5,3,5,8,9,7,9,3,2,3,8,4,6...
 */

import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';

const bip32 = BIP32Factory(ecc);

const PUZZLE_NUMBERS = [
  512, 128, 256, 64, 32, 16, 8, 4, 2, 1,
  1024, 2048, 4096, 8192, 16384, 32768,
  65536, 131072, 262144, 524288, 1048576,
  2097152, 4194304, 8388608
];

const TARGET_ADDRESS = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
const MULTIPLIER = 80.18;

// Pi digits (first 30)
const PI_DIGITS = [3,1,4,1,5,9,2,6,5,3,5,8,9,7,9,3,2,3,8,4,6,4,3,3,8,3,2,7,9,5];

console.log('🔍 Testing Pi-Shift Transformation');
console.log('='.repeat(70));
console.log('');
console.log('Hint: "Shift by pi digits" at timestamp 1:23');
console.log('Pi digits:', PI_DIGITS.slice(0, 24).join(','));
console.log('');

const wordlist = bip39.wordlists.english;

// Base indices from Log2*Multiply
const baseIndices = PUZZLE_NUMBERS.map(num => {
  const log2Val = Math.log2(num);
  return Math.floor(log2Val * MULTIPLIER) % 2048;
});

console.log('Base transformation (Log2*Multiply):');
console.log('Last word:', wordlist[baseIndices[23]], '(index', baseIndices[23] + ')');
console.log('');

// Apply pi-shift
console.log('Applying pi-digit shifts...');
console.log('');

const piShiftedIndices = baseIndices.map((index, i) => {
  const shift = PI_DIGITS[i % PI_DIGITS.length];
  return (index + shift) % 2048;
});

const piShiftedWords = piShiftedIndices.map(i => wordlist[i]);
const piShiftedMnemonic = piShiftedWords.join(' ');

console.log('Pi-shifted mnemonic:');
console.log(piShiftedMnemonic);
console.log('');
console.log('Last word:', piShiftedWords[23], '(index', piShiftedIndices[23] + ')');
console.log('');

const isValid = bip39.validateMnemonic(piShiftedMnemonic);
console.log('BIP39 Valid:', isValid ? '✅ YES' : '❌ NO');
console.log('');

if (!isValid) {
  console.log('⚠️  Not valid BIP39, trying anyway...');
  console.log('');
}

// Test derivation
try {
  const seed = bip39.mnemonicToSeedSync(piShiftedMnemonic);
  const network = bitcoin.networks.bitcoin;
  const root = bip32.fromSeed(seed, network);
  
  console.log('🔑 Testing derivation paths...');
  console.log('');
  
  const paths = [
    "m/84'/0'/0'/0/0",
    "m/84'/0'/0'/0/1",
    "m/84'/0'/0'/0/2",
    "m/49'/0'/0'/0/0",
    "m/44'/0'/0'/0/0",
  ];
  
  let found = false;
  
  for (const path of paths) {
    const child = root.derivePath(path);
    if (child.publicKey) {
      const { address } = bitcoin.payments.p2wpkh({
        pubkey: child.publicKey,
        network
      });
      
      const match = address === TARGET_ADDRESS;
      console.log(`${match ? '🎉' : '  '} ${path}: ${address}`);
      
      if (match) {
        found = true;
        console.log('');
        console.log('='.repeat(70));
        console.log('🎉🎉🎉 PUZZLE SOLVED! 🎉🎉🎉');
        console.log('='.repeat(70));
        console.log('');
        console.log('✅ Transformation: Log2*Multiply + Pi-Shift');
        console.log(`✅ Path: ${path}`);
        console.log('💰 Reward: 0.08252025 BTC');
        console.log('');
        console.log('🔒 SOLUTION (terminal only):');
        console.log('   ' + piShiftedMnemonic);
        console.log('');
        break;
      }
    }
  }
  
  if (!found) {
    console.log('');
    console.log('❌ No match with standard paths');
    console.log('');
    console.log('Testing more variations...');
    
    // Try negative shift
    const piNegShiftedIndices = baseIndices.map((index, i) => {
      const shift = PI_DIGITS[i % PI_DIGITS.length];
      return (index - shift + 2048) % 2048;
    });
    
    const piNegWords = piNegShiftedIndices.map(i => wordlist[i]);
    const piNegMnemonic = piNegWords.join(' ');
    
    console.log('');
    console.log('Trying negative shift (subtract pi digits):');
    console.log('Last word:', piNegWords[23]);
    console.log('Valid:', bip39.validateMnemonic(piNegMnemonic) ? '✅' : '❌');
    
    if (bip39.validateMnemonic(piNegMnemonic)) {
      const negSeed = bip39.mnemonicToSeedSync(piNegMnemonic);
      const negRoot = bip32.fromSeed(negSeed, network);
      
      for (const path of paths) {
        const child = negRoot.derivePath(path);
        if (child.publicKey) {
          const { address } = bitcoin.payments.p2wpkh({
            pubkey: child.publicKey,
            network
          });
          
          const match = address === TARGET_ADDRESS;
          console.log(`${match ? '🎉' : '  '} ${path}: ${address}`);
          
          if (match) {
            console.log('');
            console.log('🎉 SOLVED with negative shift!');
            console.log('Mnemonic:', piNegMnemonic);
            found = true;
            break;
          }
        }
      }
    }
  }
  
  if (!found) {
    console.log('');
    console.log('Next: Try different pi-shift interpretations');
    console.log('  - Multiply by pi digits');
    console.log('  - Use pi decimals not digits');
    console.log('  - Apply to multiplier not indices');
  }
  
} catch (e) {
  console.log('❌ Error:', e.message);
}

console.log('');
console.log('='.repeat(70));
