#!/usr/bin/env node --import tsx

/**
 * BLM 0.2 BTC Puzzle - FINAL SOLVER
 * 
 * CRITICAL DISCOVERY: The repo's Python script reveals the first 10 words!
 * 
 * Known mnemonic (first 10 words):
 * "moon tower food this real subject address total ten black"
 * 
 * Task: Find the last 2 words by brute force testing
 * Search space: 2048 × 2048 = 4,194,304 combinations
 * Estimated time: ~5-10 minutes
 */

import * as bip39 from 'bip39';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import * as bitcoin from 'bitcoinjs-lib';

const bip32 = BIP32Factory(ecc);

const TARGET_ADDRESS = '1KfZGvwZxsvSmemoCmEV75uqcNzYBHjkHZ';
const KNOWN_WORDS = 'moon tower food this real subject address total ten black';

console.log('🎯 BLM 0.2 BTC Puzzle - FINAL SOLVER\n');
console.log('═══════════════════════════════════════════════════\n');
console.log(`🔓 BREAKTHROUGH: First 10 words discovered in repo!`);
console.log(`\n   "${KNOWN_WORDS}"\n`);
console.log(`🎲 Brute forcing last 2 words...`);
console.log(`   Search space: 2,048 × 2,048 = 4,194,304 combinations\n`);

const BIP39_WORDLIST = bip39.wordlists.english;

function generateAddress(mnemonic: string, path: string, compressed: boolean = true): string | null {
  try {
    const seed = bip39.mnemonicToSeedSync(mnemonic, '');
    const root = bip32.fromSeed(seed);
    const child = root.derivePath(path);
    
    if (compressed) {
      const { address } = bitcoin.payments.p2pkh({
        pubkey: child.publicKey,
        network: bitcoin.networks.bitcoin
      });
      return address || null;
    } else {
      // Uncompressed
      const keyPair = bitcoin.ECPair.fromPrivateKey(child.privateKey!, { 
        compressed: false,
        network: bitcoin.networks.bitcoin 
      });
      const { address } = bitcoin.payments.p2pkh({
        pubkey: keyPair.publicKey,
        network: bitcoin.networks.bitcoin
      });
      return address || null;
    }
  } catch (e) {
    return null;
  }
}

function testMnemonic(mnemonic: string, combo: number): boolean {
  if (!bip39.validateMnemonic(mnemonic)) {
    return false;
  }
  
  // Test paths from the Python script
  const paths = [
    { path: "m/44'/0'/0'/0/0", name: "BIP44 account 0, index 0" },
    { path: "m/44'/0'/0'/0/1", name: "BIP44 account 0, index 1" },
    { path: "m/44'/0'/0'/0/2", name: "BIP44 account 0, index 2" },
    { path: "m/44'/0'/0'/0/3", name: "BIP44 account 0, index 3" },
    { path: "m/44'/0'/0'/0/4", name: "BIP44 account 0, index 4" },
    { path: "m/44'/0'/0'/0/5", name: "BIP44 account 0, index 5" },
    { path: "m/44'/0'/0'/0/6", name: "BIP44 account 0, index 6" },
    { path: "m/44'/0'/0'/0/7", name: "BIP44 account 0, index 7" },
    { path: "m/44'/0'/0'/0/8", name: "BIP44 account 0, index 8" },
    { path: "m/44'/0'/0'/0/9", name: "BIP44 account 0, index 9" },
    { path: "m/44'/0'/1'/0/0", name: "BIP44 account 1, index 0" },
    { path: "m/44'/0'/1'/0/1", name: "BIP44 account 1, index 1" },
    { path: "m/44'/0'/1'/0/2", name: "BIP44 account 1, index 2" },
    { path: "m/44'/0'/1'/0/3", name: "BIP44 account 1, index 3" },
    { path: "m/44'/0'/1'/0/4", name: "BIP44 account 1, index 4" },
    { path: "m/44'/0'/1'/0/5", name: "BIP44 account 1, index 5" },
    { path: "m/44'/0'/1'/0/6", name: "BIP44 account 1, index 6" },
    { path: "m/44'/0'/1'/0/7", name: "BIP44 account 1, index 7" },
    { path: "m/44'/0'/1'/0/8", name: "BIP44 account 1, index 8" },
    { path: "m/44'/0'/1'/0/9", name: "BIP44 account 1, index 9" },
  ];
  
  for (const { path, name } of paths) {
    // Test compressed
    const addrCompressed = generateAddress(mnemonic, path, true);
    if (addrCompressed === TARGET_ADDRESS) {
      console.log(`\n\n🎉🎉🎉 SOLUTION FOUND!!! 🎉🎉🎉\n`);
      console.log(`Combination #${combo.toLocaleString()}`);
      console.log(`\n💎 WINNING MNEMONIC:`);
      console.log(`   "${mnemonic}"`);
      console.log(`\n🔑 Derivation Path: ${path} (${name})`);
      console.log(`📍 Address: ${addrCompressed}`);
      console.log(`🔧 Compression: Compressed public key`);
      console.log(`\n💰 Prize: ~0.2 BTC (~$20,000 USD)\n`);
      console.log(`🎊 CONGRATULATIONS! The puzzle is SOLVED!\n`);
      return true;
    }
    
    // Test uncompressed
    const addrUncompressed = generateAddress(mnemonic, path, false);
    if (addrUncompressed === TARGET_ADDRESS) {
      console.log(`\n\n🎉🎉🎉 SOLUTION FOUND!!! 🎉🎉🎉\n`);
      console.log(`Combination #${combo.toLocaleString()}`);
      console.log(`\n💎 WINNING MNEMONIC:`);
      console.log(`   "${mnemonic}"`);
      console.log(`\n🔑 Derivation Path: ${path} (${name})`);
      console.log(`📍 Address: ${addrUncompressed}`);
      console.log(`🔧 Compression: Uncompressed public key`);
      console.log(`\n💰 Prize: ~0.2 BTC (~$20,000 USD)\n`);
      console.log(`🎊 CONGRATULATIONS! The puzzle is SOLVED!\n`);
      return true;
    }
  }
  
  return false;
}

console.log('⏱️  Starting brute force...\n');
const startTime = Date.now();

let tested = 0;
let validMnemonics = 0;

for (let i = 0; i < BIP39_WORDLIST.length; i++) {
  const word11 = BIP39_WORDLIST[i];
  
  for (let j = 0; j < BIP39_WORDLIST.length; j++) {
    const word12 = BIP39_WORDLIST[j];
    const mnemonic = `${KNOWN_WORDS} ${word11} ${word12}`;
    
    tested++;
    
    if (bip39.validateMnemonic(mnemonic)) {
      validMnemonics++;
      if (testMnemonic(mnemonic, tested)) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`⏱️  Time elapsed: ${elapsed} seconds`);
        console.log(`📊 Combinations tested: ${tested.toLocaleString()}`);
        console.log(`✅ Valid mnemonics: ${validMnemonics.toLocaleString()}\n`);
        process.exit(0);
      }
    }
    
    if (tested % 100000 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = Math.round(tested / (Date.now() - startTime) * 1000);
      const remaining = (4194304 - tested) / rate;
      console.log(`   Progress: ${tested.toLocaleString()} / 4,194,304 (${((tested/4194304)*100).toFixed(2)}%)`);
      console.log(`   Rate: ${rate.toLocaleString()} tests/sec`);
      console.log(`   Elapsed: ${elapsed}s, ETA: ${Math.round(remaining)}s`);
      console.log(`   Valid mnemonics so far: ${validMnemonics.toLocaleString()}\n`);
    }
  }
}

console.log('\n❌ Brute force complete - No match found.');
console.log(`   Total tested: ${tested.toLocaleString()}`);
console.log(`   Valid mnemonics: ${validMnemonics.toLocaleString()}\n`);

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`⏱️  Total time: ${elapsed} seconds\n`);
