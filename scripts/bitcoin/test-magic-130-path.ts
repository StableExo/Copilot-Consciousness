/**
 * CRITICAL TEST: Magic Constant 130 Path
 * 
 * Based on Grok's urgent suggestion:
 * "The magic constant 130 hint screams custom hardened account level"
 * 
 * Testing m/84'/130'/0'/0/x extensively
 */

import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';

const bip32 = BIP32Factory(ecc);

const MNEMONIC = 'focus economy expand destroy craft chimney bulk beef anxiety abandon goddess hotel joke liquid middle north park price refuse salmon silent sponsor symbol train';
const TARGET_ADDRESS = 'bc1qkf6trv39epu4n0wfzw4mk58zf5hrvwd442aksk';

console.log('🔥 CRITICAL TEST: Magic Constant 130 Derivation Path');
console.log('='.repeat(70));
console.log('Based on Grok\'s insight: "130 hint = custom hardened account"');
console.log('');
console.log('Target:', TARGET_ADDRESS);
console.log('');

const seed = bip39.mnemonicToSeedSync(MNEMONIC);
const network = bitcoin.networks.bitcoin;
const root = bip32.fromSeed(seed, network);

let found = false;

// Test the magic 130 path extensively
console.log('Testing m/84\'/130\'/0\'/0/x (first 10,000 addresses)...');
console.log('');

for (let i = 0; i < 10000; i++) {
  try {
    const path = `m/84'/130'/0'/0/${i}`;
    const child = root.derivePath(path);
    
    if (child.publicKey) {
      const { address } = bitcoin.payments.p2wpkh({
        pubkey: child.publicKey,
        network
      });
      
      // Show first 10 addresses regardless
      if (i < 10) {
        console.log(`${i}. ${path}: ${address}`);
      }
      
      if (address === TARGET_ADDRESS) {
        console.log('');
        console.log('='.repeat(70));
        console.log('🎉🎉🎉 PUZZLE SOLVED!!! 🎉🎉🎉');
        console.log('='.repeat(70));
        console.log('');
        console.log(`✅ WINNING PATH: ${path}`);
        console.log(`✅ Address: ${address}`);
        console.log('💰 Reward: 0.08252025 BTC (~$5,500)');
        console.log('');
        console.log('🔒 COMPLETE SOLUTION:');
        console.log('   Mnemonic: ' + MNEMONIC);
        console.log('   Derivation Path: ' + path);
        console.log('');
        console.log('🚨 FOR BLUE WALLET:');
        console.log('   Settings → Advanced → Custom Derivation Path');
        console.log('   Enter: ' + path);
        console.log('   Or base path: m/84\'/130\'/0\'');
        console.log('');
        console.log('='.repeat(70));
        console.log('GROK WAS RIGHT! The "magic constant 130" was the key!');
        console.log('='.repeat(70));
        found = true;
        break;
      }
    }
  } catch (e) {
    // Skip
  }
  
  if (i % 1000 === 0 && i > 0) {
    console.log(`   Tested ${i} addresses...`);
  }
}

if (!found) {
  console.log('');
  console.log('Testing change addresses m/84\'/130\'/0\'/1/x...');
  for (let i = 0; i < 100; i++) {
    try {
      const path = `m/84'/130'/0'/1/${i}`;
      const child = root.derivePath(path);
      
      if (child.publicKey) {
        const { address } = bitcoin.payments.p2wpkh({
          pubkey: child.publicKey,
          network
        });
        
        if (address === TARGET_ADDRESS) {
          console.log('');
          console.log('🎉 FOUND IN CHANGE ADDRESSES!');
          console.log('Path:', path);
          console.log('Address:', address);
          found = true;
          break;
        }
      }
    } catch (e) {}
  }
}

if (!found) {
  console.log('');
  console.log('Testing other 130 variations...');
  
  const variations = [
    "m/84'/130'/1'/0/0",
    "m/84'/130'/2'/0/0",
    "m/49'/130'/0'/0/0",  // BIP49 with 130
    "m/44'/130'/0'/0/0",  // BIP44 with 130
  ];
  
  for (const path of variations) {
    try {
      const child = root.derivePath(path);
      if (child.publicKey) {
        const { address } = bitcoin.payments.p2wpkh({
          pubkey: child.publicKey,
          network
        });
        
        console.log(`${path}: ${address}`);
        
        if (address === TARGET_ADDRESS) {
          console.log('🎉 FOUND! Path:', path);
          found = true;
          break;
        }
      }
    } catch (e) {}
  }
}

console.log('');
console.log('='.repeat(70));

if (found) {
  console.log('✅ SOLUTION CONFIRMED WITH MAGIC CONSTANT 130!');
} else {
  console.log('❌ Not found in m/84\'/130\' paths tested');
  console.log('');
  console.log('For Blue Wallet user:');
  console.log('  1. Open wallet settings');
  console.log('  2. Advanced → Custom Derivation Path');
  console.log('  3. Try: m/84\'/130\'/0\'/0/0');
  console.log('  4. Generate addresses and check for target');
}

console.log('='.repeat(70));
process.exit(found ? 0 : 1);
