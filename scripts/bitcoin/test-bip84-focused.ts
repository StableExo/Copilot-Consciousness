/**
 * Focused BIP84 (m/84) path testing
 * User indicated path is around "m/84"
 * Testing all reasonable m/84 variations
 */

import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';

const bip32 = BIP32Factory(ecc);

const MNEMONIC = 'focus economy expand destroy craft chimney bulk beef anxiety abandon goddess hotel joke liquid middle north park price refuse salmon silent sponsor symbol train';
const TARGET_ADDRESS = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';

console.log('🔍 Focused BIP84 (m/84) Path Testing');
console.log('='.repeat(70));
console.log('Target:', TARGET_ADDRESS);
console.log('');

const seed = bip39.mnemonicToSeedSync(MNEMONIC);
const network = bitcoin.networks.bitcoin;
const root = bip32.fromSeed(seed, network);

let found = false;
let tested = 0;

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
        console.log('');
        console.log('🎉🎉🎉 SOLUTION FOUND! 🎉🎉🎉');
        console.log('='.repeat(70));
        console.log('');
        console.log(`✅ Derivation Path: ${path}`);
        console.log(`✅ Address: ${address}`);
        console.log('💰 Reward: 0.08252025 BTC (~$5,500)');
        console.log('');
        console.log('🔒 COMPLETE SOLUTION:');
        console.log('   Mnemonic: ' + MNEMONIC);
        console.log('   Path: ' + path);
        console.log('');
        console.log('='.repeat(70));
        return true;
      }
    }
  } catch (e) {}
  return false;
}

console.log('Testing standard BIP84 paths with extended range...');
console.log('');

// Standard BIP84: m/84'/0'/0'/0/x
console.log('1. Standard receive addresses (m/84\'/0\'/0\'/0/x)');
for (let i = 0; i < 100000 && !found; i++) {
  if (testPath(`m/84'/0'/0'/0/${i}`)) {
    found = true;
    break;
  }
  if (i % 10000 === 0 && i > 0) {
    console.log(`   Tested ${i} addresses...`);
  }
}

if (!found) {
  console.log('');
  console.log('2. Change addresses (m/84\'/0\'/0\'/1/x)');
  for (let i = 0; i < 10000 && !found; i++) {
    if (testPath(`m/84'/0'/0'/1/${i}`)) {
      found = true;
      break;
    }
    if (i % 1000 === 0 && i > 0) {
      console.log(`   Tested ${i} change addresses...`);
    }
  }
}

if (!found) {
  console.log('');
  console.log('3. Different accounts (m/84\'/0\'/x\'/0/0)');
  for (let account = 0; account < 1000 && !found; account++) {
    if (testPath(`m/84'/0'/${account}'/0/0`)) {
      found = true;
      break;
    }
    if (account % 100 === 0 && account > 0) {
      console.log(`   Tested ${account} accounts...`);
    }
  }
}

if (!found) {
  console.log('');
  console.log('4. First 1000 of each account (m/84\'/0\'/x\'/0/y)');
  for (let account = 0; account < 100 && !found; account++) {
    for (let index = 0; index < 1000 && !found; index++) {
      if (testPath(`m/84'/0'/${account}'/0/${index}`)) {
        found = true;
        break;
      }
    }
    if (account % 10 === 0 && account > 0) {
      console.log(`   Tested account ${account}...`);
    }
  }
}

if (!found) {
  console.log('');
  console.log('5. Different coins (m/84\'/x\'/0\'/0/0) - Bitcoin is coin 0');
  // Bitcoin should be 0, but test nearby just in case
  for (let coin = 0; coin < 10 && !found; coin++) {
    if (testPath(`m/84'/${coin}'/0'/0/0`)) {
      found = true;
      break;
    }
  }
}

console.log('');
console.log('='.repeat(70));
console.log(`Total BIP84 paths tested: ${tested}`);
console.log('');

if (!found) {
  console.log('❌ No match found in tested BIP84 paths');
  console.log('');
  console.log('Blue Wallet is still searching - it may find a path beyond our range');
  console.log('Or the path might be non-standard BIP84 variant');
  console.log('');
  console.log('Recommendation: Let Blue Wallet continue searching');
}

console.log('='.repeat(70));
process.exit(found ? 0 : 1);
