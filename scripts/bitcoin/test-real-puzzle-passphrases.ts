/**
 * BIP39 Passphrase Tester for Real Puzzle
 * 
 * Tests the "track" mnemonic with various passphrases based on puzzle hints:
 * - Pi hints (π = 3.14159...)
 * - "magic 130" reference
 * - "track" word clue
 * - Powers-of-2 pattern
 * 
 * Target: bc1qkf6trv39epu4n0wfzw4mk58zf5hrvwd442aksk
 */

import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';

const bip32 = BIP32Factory(ecc);

const BASE_MNEMONIC = 'focus economy expand destroy craft chimney bulk beef anxiety abandon goddess hotel joke liquid middle north park price refuse salmon silent sponsor symbol track';
const TARGET_ADDRESS = 'bc1qkf6trv39epu4n0wfzw4mk58zf5hrvwd442aksk';

// Passphrase candidates based on puzzle hints
const PASSPHRASES = [
  '',                    // Blank (most common)
  'pi',                  // Pi hint
  '130',                 // Magic 130
  'track',               // Word clue
  'train',               // Alternative
  'pi130',               // Combination
  '314159',              // Pi digits
  '3.14159',             // Pi with decimal
  'magic130',            // Full magic reference
  '130pi',               // Reverse combination
  'powers',              // Powers-of-2 theme
  'power2',              // Power of 2
  'shift',               // Pi shift hint
  'pishift',             // Pi shift combination
  '31415926535',         // More pi digits
  '271828',              // e digits (mathematical)
  'track130',            // Track + magic
  '130track',            // Reverse
  'pitrack',             // Pi + track
  'trackpi',             // Track + pi
];

console.log('🔐 BIP39 Passphrase Tester for Real Puzzle');
console.log('='.repeat(70));
console.log('Target:', TARGET_ADDRESS);
console.log('Base Mnemonic: focus economy... track');
console.log('');
console.log(`Testing ${PASSPHRASES.length} passphrase variations...`);
console.log('');

let tested = 0;
let found = false;

// Standard BIP84 paths to test
const PATHS_TO_TEST = [
  "m/84'/0'/0'/0/0",      // Standard receive
  "m/84'/0'/0'/0/1",      // Second address
  "m/84'/0'/0'/0/2",      // Third address
  "m/84'/0'/0'/1/0",      // Change address
  "m/84'/0'/1'/0/0",      // Second account
  "m/84'/0'/2'/0/0",      // Third account (pi = 3.14...)
  "m/84'/0'/130'/0/0",    // Magic 130 account
];

function testPassphrase(passphrase: string): boolean {
  try {
    const seed = bip39.mnemonicToSeedSync(BASE_MNEMONIC, passphrase);
    const root = bip32.fromSeed(seed);
    
    for (const path of PATHS_TO_TEST) {
      const child = root.derivePath(path);
      const { address } = bitcoin.payments.p2wpkh({
        pubkey: child.publicKey,
        network: bitcoin.networks.bitcoin,
      });
      
      tested++;
      
      if (address === TARGET_ADDRESS) {
        console.log('');
        console.log('🎉🎉🎉 SOLUTION FOUND! 🎉🎉🎉');
        console.log('='.repeat(70));
        console.log('');
        console.log(`✅ Passphrase: "${passphrase}" ${passphrase === '' ? '(BLANK)' : ''}`);
        console.log(`✅ Derivation Path: ${path}`);
        console.log(`✅ Address: ${address}`);
        console.log('💰 Prize: 0.08252025 BTC (~$9,312)');
        console.log('');
        console.log('🔒 COMPLETE SOLUTION:');
        console.log('   Mnemonic: ' + BASE_MNEMONIC);
        console.log('   Passphrase: ' + (passphrase === '' ? '(blank)' : passphrase));
        console.log('   Path: ' + path);
        console.log('');
        console.log('='.repeat(70));
        return true;
      }
    }
  } catch (e) {
    console.error(`Error testing passphrase "${passphrase}":`, e);
  }
  return false;
}

// Test each passphrase
for (let i = 0; i < PASSPHRASES.length && !found; i++) {
  const passphrase = PASSPHRASES[i];
  const display = passphrase === '' ? '(blank)' : passphrase;
  
  process.stdout.write(`[${i + 1}/${PASSPHRASES.length}] Testing passphrase: "${display}"...`);
  
  if (testPassphrase(passphrase)) {
    found = true;
  } else {
    console.log(' ❌');
  }
}

if (!found) {
  console.log('');
  console.log('❌ No match found with tested passphrases.');
  console.log('');
  console.log('💡 Next steps:');
  console.log('   1. Analyze @hunghuatang\'s original Threads post for more hints');
  console.log('   2. Watch the YouTube video for clues');
  console.log('   3. Study the BIP39 word table image for patterns');
  console.log('   4. Try more passphrase combinations based on hints');
  console.log('');
  console.log(`📊 Total tests: ${tested} (${PASSPHRASES.length} passphrases × ${PATHS_TO_TEST.length} paths)`);
}
