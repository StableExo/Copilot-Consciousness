#!/usr/bin/env node

/**
 * CRITICAL TEST - Reddit User's 12-Word Combination
 * 
 * From user Straight-Solution-39 (8 days ago):
 * "breathe black tower subject real food time mask only win world rainy"
 * 
 * This is a COMPLETELY DIFFERENT word set than the Python script!
 * Testing immediately as this could be THE solution.
 */

const bip39 = require('bip39');
const { BIP32Factory } = require('bip32');
const ecc = require('tiny-secp256k1');
const bitcoin = require('bitcoinjs-lib');
const bip32 = BIP32Factory(ecc);

const TARGET = '1KfZGvwZxsvSmemoCmEV75uqcNzYBHjkHZ';

console.log('🚨 CRITICAL TEST - Reddit User Combination 🚨\n');
console.log('═══════════════════════════════════════════════════\n');
console.log(`🎯 Target: ${TARGET}\n`);
console.log(`👤 Source: Reddit user Straight-Solution-39 (8d ago)`);
console.log(`📅 Posted: After 2 years of attempting\n`);

// The exact combination from Reddit
const REDDIT_COMBO = 'breathe black tower subject real food time mask only win world rainy';

console.log(`🔑 Testing: "${REDDIT_COMBO}"\n`);
console.log('═══════════════════════════════════════════════════\n');

// First check if valid BIP39
console.log('Step 1: Validating BIP39 checksum...');
const isValid = bip39.validateMnemonic(REDDIT_COMBO);
console.log(`Result: ${isValid ? '✅ VALID' : '❌ INVALID'}\n`);

if (!isValid) {
  console.log('❌ Mnemonic has invalid checksum');
  console.log('This means either:');
  console.log('  1. Word order is wrong');
  console.log('  2. One or more words are incorrect');
  console.log('  3. User made a mistake\n');
  
  // Check each word individually
  console.log('Checking individual words against BIP39 wordlist:\n');
  const words = REDDIT_COMBO.split(' ');
  const WL = bip39.wordlists.english;
  
  words.forEach((word, idx) => {
    const valid = WL.includes(word);
    console.log(`  ${(idx+1).toString().padStart(2)}. ${word.padEnd(10)} ${valid ? '✅' : '❌'}`);
  });
  
  console.log('\n⚠️  NOTE: "breathe" and "rainy" are NOT in BIP39 wordlist!');
  console.log('This confirms puzzle is NOT using standard BIP39.\n');
  
  process.exit(1);
}

// If valid, test against target
console.log('Step 2: Testing derivation paths...\n');

function testPath(path, name) {
  try {
    const seed = bip39.mnemonicToSeedSync(REDDIT_COMBO, '');
    const root = bip32.fromSeed(seed);
    const child = root.derivePath(path);
    
    const { address } = bitcoin.payments.p2pkh({
      pubkey: child.publicKey,
      network: bitcoin.networks.bitcoin
    });
    
    console.log(`${name.padEnd(20)}: ${address}`);
    
    if (address === TARGET) {
      return { found: true, address, path };
    }
  } catch (e) {
    console.log(`${name.padEnd(20)}: ERROR - ${e.message}`);
  }
  return { found: false };
}

const paths = [
  { path: "m/44'/0'/0'/0/0", name: 'BIP44 (0/0)' },
  { path: "m/44'/0'/0'/0/1", name: 'BIP44 (0/1)' },
  { path: "m/44'/0'/0'/0/2", name: 'BIP44 (0/2)' },
  { path: "m/44'/0'/1'/0/0", name: 'BIP44 (1/0)' },
  { path: "m/0'/0", name: 'Electrum' },
  { path: "m/0/0", name: 'Legacy' },
  { path: "m/84'/0'/0'/0/0", name: 'BIP84 SegWit' },
];

let found = false;
for (const { path, name } of paths) {
  const result = testPath(path, name);
  if (result.found) {
    found = true;
    console.log('\n\n🎉🎉🎉 MATCH FOUND!!! 🎉🎉🎉\n');
    console.log(`💎 WINNING MNEMONIC: "${REDDIT_COMBO}"`);
    console.log(`🔑 Path: ${path} (${name})`);
    console.log(`📍 Address: ${result.address}`);
    console.log(`💰 Prize: ~0.2 BTC (~$20,000 USD)\n`);
    break;
  }
}

console.log('\n═══════════════════════════════════════════════════');

if (!found) {
  console.log('📊 Result: No match found\n');
  console.log('Analysis:');
  console.log('  - Mnemonic is either invalid or');
  console.log('  - Different derivation path needed or');
  console.log('  - User tested wrong combination\n');
  
  console.log('💭 Context from Reddit:');
  console.log('  User said: "After 2 years trying... I\'m out"');
  console.log('  This was their final attempt before giving up');
  console.log('  They also mentioned wanting to buy a motorcycle\n');
} else {
  console.log('🎊 PUZZLE SOLVED!\n');
}

console.log('═══════════════════════════════════════════════════\n');
