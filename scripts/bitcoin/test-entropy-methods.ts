/**
 * Proper BIP39 Entropy Generation
 * 
 * Understanding from BIP39 spec:
 * - We need 256 bits of entropy
 * - BIP39 will calculate the checksum
 * - This produces a valid 24-word mnemonic
 * 
 * The puzzle numbers likely encode the ENTROPY, not the word indices!
 */

import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';
import * as crypto from 'crypto';

const bip32 = BIP32Factory(ecc);

const PUZZLE_NUMBERS = [
  512, 128, 256, 64, 32, 16, 8, 4, 2, 1,
  1024, 2048, 4096, 8192, 16384, 32768,
  65536, 131072, 262144, 524288, 1048576,
  2097152, 4194304, 8388608
];

const TARGET_ADDRESS = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';

console.log('🔍 Generating Proper BIP39 from Entropy');
console.log('='.repeat(70));
console.log('');

// Method 1: Use the numbers themselves as entropy bits
console.log('Method 1: Numbers as bit positions');
console.log('-'.repeat(70));

// Create 256-bit buffer (32 bytes)
const entropy1 = Buffer.alloc(32, 0);

// Set bits corresponding to the powers of 2
PUZZLE_NUMBERS.forEach(num => {
  const bitPosition = Math.log2(num);
  if (bitPosition < 256) {
    const byteIndex = Math.floor(bitPosition / 8);
    const bitIndex = bitPosition % 8;
    entropy1[byteIndex] |= (1 << bitIndex);
  }
});

console.log('Entropy (hex):', entropy1.toString('hex'));

const mnemonic1 = bip39.entropyToMnemonic(entropy1);
console.log('Mnemonic:', mnemonic1);
console.log('Valid:', bip39.validateMnemonic(mnemonic1) ? '✅' : '❌');
console.log('Last word:', mnemonic1.split(' ')[23]);
console.log('');

// Test this mnemonic
if (bip39.validateMnemonic(mnemonic1)) {
  testMnemonic(mnemonic1, 'Method 1');
}

// Method 2: Use Log2 values as bytes
console.log('Method 2: Log2 values as byte sequence');
console.log('-'.repeat(70));

const entropy2 = Buffer.alloc(32);
PUZZLE_NUMBERS.forEach((num, i) => {
  const log2Val = Math.log2(num);
  if (i < 32) {
    entropy2[i] = log2Val;
  }
});

console.log('Entropy (hex):', entropy2.toString('hex'));

const mnemonic2 = bip39.entropyToMnemonic(entropy2);
console.log('Mnemonic:', mnemonic2);
console.log('Valid:', bip39.validateMnemonic(mnemonic2) ? '✅' : '❌');
console.log('Last word:', mnemonic2.split(' ')[23]);
console.log('');

if (bip39.validateMnemonic(mnemonic2)) {
  testMnemonic(mnemonic2, 'Method 2');
}

// Method 3: Use the numbers themselves padded
console.log('Method 3: Numbers as bytes (padded)');
console.log('-'.repeat(70));

const entropy3 = Buffer.alloc(32);
PUZZLE_NUMBERS.forEach((num, i) => {
  if (i < 16) {
    // Use 2 bytes per number (16 numbers = 32 bytes)
    entropy3.writeUInt16BE(num % 65536, i * 2);
  }
});

console.log('Entropy (hex):', entropy3.toString('hex'));

const mnemonic3 = bip39.entropyToMnemonic(entropy3);
console.log('Mnemonic:', mnemonic3);
console.log('Valid:', bip39.validateMnemonic(mnemonic3) ? '✅' : '❌');
console.log('Last word:', mnemonic3.split(' ')[23]);
console.log('');

if (bip39.validateMnemonic(mnemonic3)) {
  testMnemonic(mnemonic3, 'Method 3');
}

// Method 4: Hash the numbers
console.log('Method 4: SHA256 of concatenated numbers');
console.log('-'.repeat(70));

const numbersStr = PUZZLE_NUMBERS.join('');
const entropy4 = crypto.createHash('sha256').update(numbersStr).digest();

console.log('Entropy (hex):', entropy4.toString('hex'));

const mnemonic4 = bip39.entropyToMnemonic(entropy4);
console.log('Mnemonic:', mnemonic4);
console.log('Valid:', bip39.validateMnemonic(mnemonic4) ? '✅' : '❌');
console.log('Last word:', mnemonic4.split(' ')[23]);
console.log('');

if (bip39.validateMnemonic(mnemonic4)) {
  testMnemonic(mnemonic4, 'Method 4');
}

// Method 5: Use indices from Log2*Multiply as entropy source
console.log('Method 5: Word indices as entropy bytes');
console.log('-'.repeat(70));

const wordlist = bip39.wordlists.english;
const indices = PUZZLE_NUMBERS.map(num => {
  const log2Val = Math.log2(num);
  return Math.floor(log2Val * 80.18) % 2048;
});

// Convert indices to bytes (11 bits each, pack into 256 bits)
const entropy5 = Buffer.alloc(32);
let bitOffset = 0;

indices.forEach(index => {
  // Write 11 bits for each index
  for (let i = 10; i >= 0; i--) {
    const bit = (index >> i) & 1;
    const byteIndex = Math.floor(bitOffset / 8);
    const bitIndex = 7 - (bitOffset % 8);
    if (byteIndex < 32) {
      if (bit) {
        entropy5[byteIndex] |= (1 << bitIndex);
      }
      bitOffset++;
    }
  }
});

console.log('Entropy (hex):', entropy5.toString('hex'));

const mnemonic5 = bip39.entropyToMnemonic(entropy5);
console.log('Mnemonic:', mnemonic5);
console.log('Valid:', bip39.validateMnemonic(mnemonic5) ? '✅' : '❌');
console.log('Last word:', mnemonic5.split(' ')[23]);
console.log('');

if (bip39.validateMnemonic(mnemonic5)) {
  testMnemonic(mnemonic5, 'Method 5');
}

function testMnemonic(mnemonic: string, methodName: string) {
  console.log(`Testing ${methodName} mnemonic against target...`);
  
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const network = bitcoin.networks.bitcoin;
  const root = bip32.fromSeed(seed, network);
  
  const paths = [
    "m/84'/0'/0'/0/0",
    "m/84'/0'/0'/0/1",
    "m/49'/0'/0'/0/0",
    "m/44'/0'/0'/0/0",
  ];
  
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
        console.log('');
        console.log('='.repeat(70));
        console.log('🎉🎉🎉 PUZZLE SOLVED! 🎉🎉🎉');
        console.log('='.repeat(70));
        console.log('');
        console.log(`✅ Method: ${methodName}`);
        console.log(`✅ Path: ${path}`);
        console.log('💰 Reward: 0.08252025 BTC');
        console.log('');
        console.log('🔒 SOLUTION (terminal only):');
        console.log('   ' + mnemonic);
        console.log('');
        return true;
      }
    }
  }
  
  console.log('  No match with standard paths');
  console.log('');
  return false;
}

console.log('='.repeat(70));
console.log('Summary: Tested 5 entropy generation methods');
console.log('If no match, the transformation interpretation is still off');
console.log('');
