/**
 * Super Exhaustive Path Testing for "train" mnemonic
 * Tests 10,000+ derivation paths including custom variations
 */

import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';

const bip32 = BIP32Factory(ecc);

// The valid BIP39 mnemonic with "train"
const MNEMONIC = 'focus economy expand destroy craft chimney bulk beef anxiety abandon goddess hotel joke liquid middle north park price refuse salmon silent sponsor symbol train';
const TARGET_ADDRESS = 'bc1qkf6trv39epu4n0wfzw4mk58zf5hrvwd442aksk';

console.log('🔍 Super Exhaustive Derivation Path Testing');
console.log('='.repeat(70));
console.log('Mnemonic: ...symbol train');
console.log('Target:', TARGET_ADDRESS);
console.log('');

const seed = bip39.mnemonicToSeedSync(MNEMONIC);
const network = bitcoin.networks.bitcoin;
const root = bip32.fromSeed(seed, network);

let tested = 0;
let found = false;
let foundPath = '';
let foundAddress = '';

// Test function
function testPath(path: string): boolean {
  try {
    const child = root.derivePath(path);
    if (child.publicKey) {
      const { address } = bitcoin.payments.p2wpkh({
        pubkey: child.publicKey,
        network
      });
      
      tested++;
      if (address === TARGET_ADDRESS) {
        found = true;
        foundPath = path;
        foundAddress = address;
        return true;
      }
    }
  } catch (e) {
    // Invalid path
  }
  return false;
}

// Standard paths
console.log('Testing standard paths...');
const standards = [
  "m/84'/0'/0'/0/0", "m/84'/0'/0'/0/1", "m/84'/0'/0'/0/2",
  "m/49'/0'/0'/0/0", "m/44'/0'/0'/0/0"
];
for (const path of standards) {
  if (testPath(path)) break;
}

if (!found) {
  console.log('Testing first 10,000 address indices...');
  for (let i = 0; i < 10000 && !found; i++) {
    if (testPath(`m/84'/0'/0'/0/${i}`)) break;
    if (i % 1000 === 0 && i > 0) {
      console.log(`  Tested ${i} paths...`);
    }
  }
}

if (!found) {
  console.log('Testing account variations (0-100)...');
  for (let account = 0; account < 100 && !found; account++) {
    for (let index = 0; index < 100 && !found; index++) {
      if (testPath(`m/84'/0'/${account}'/0/${index}`)) break;
    }
    if (account % 10 === 0 && account > 0) {
      console.log(`  Tested ${account} accounts...`);
    }
  }
}

if (!found) {
  console.log('Testing change paths (0-1000)...');
  for (let change = 0; change < 1000 && !found; change++) {
    for (let index = 0; index < 10 && !found; index++) {
      if (testPath(`m/84'/0'/0'/${change}/${index}`)) break;
    }
    if (change % 100 === 0 && change > 0) {
      console.log(`  Tested ${change} change indices...`);
    }
  }
}

if (!found) {
  console.log('Testing BIP49/BIP44 variations...');
  for (let i = 0; i < 1000 && !found; i++) {
    if (testPath(`m/49'/0'/0'/0/${i}`)) break;
    if (testPath(`m/44'/0'/0'/0/${i}`)) break;
  }
}

if (!found) {
  console.log('Testing magic numbers as path components...');
  const magicNumbers = [130, 1844, 1848, 23, 80, 18, 8018];
  
  for (const magic of magicNumbers) {
    if (found) break;
    // Try magic as account
    if (testPath(`m/84'/0'/${magic}'/0/0`)) break;
    // Try magic as change
    if (testPath(`m/84'/0'/0'/${magic}/0`)) break;
    // Try magic as index
    if (testPath(`m/84'/0'/0'/0/${magic}`)) break;
    // Combinations
    if (testPath(`m/84'/${magic}'/0'/0/0`)) break;
  }
}

console.log('');
console.log('='.repeat(70));
console.log(`Total paths tested: ${tested}`);
console.log('');

if (found) {
  console.log('🎉🎉🎉 SOLUTION FOUND! 🎉🎉🎉');
  console.log('');
  console.log(`✅ Derivation Path: ${foundPath}`);
  console.log(`✅ Address: ${foundAddress}`);
  console.log('💰 Reward: 0.08252025 BTC (~$5,500)');
  console.log('');
  console.log('🔒 SOLUTION MNEMONIC:');
  console.log('   ' + MNEMONIC);
  console.log('');
  console.log('CUSTOM DERIVATION PATH:', foundPath);
  console.log('');
} else {
  console.log('❌ No match found in', tested, 'paths tested');
  console.log('');
  console.log('Tested:');
  console.log('  - Standard BIP84/49/44 paths');
  console.log('  - 10,000 address indices');
  console.log('  - 10,000 account variations');
  console.log('  - 10,000 change path variations');
  console.log('  - Magic number combinations');
  console.log('');
  console.log('Next: Try with BIP39 passphrases or pi-shift transformation');
}
console.log('='.repeat(70));

process.exit(found ? 0 : 1);
