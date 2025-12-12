#!/usr/bin/env node --import tsx

/**
 * BLM Puzzle - Systematic Testing with High-Priority Words
 * 
 * Tests combinations starting with the 6 highest-priority words
 * and systematically adding from remaining candidates.
 */

import * as bip39 from 'bip39';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import * as bitcoin from 'bitcoinjs-lib';

const bip32 = BIP32Factory(ecc);

const TARGET_ADDRESS = '1KfZGvwZxsvSmemoCmEV75uqcNzYBHjkHZ';

// Based on analysis, these are MUST-HAVE words (highest priority)
const MUST_HAVE = ['black', 'real', 'subject', 'moon', 'tower', 'food'];

// High probability words to add
const HIGH_PROB = ['this', 'day', 'number', 'two'];

// Medium probability words
const MEDIUM_PROB = ['liberty', 'space', 'rain', 'time', 'life'];

// Lower probability but still valid
const LOW_PROB = ['chest', 'clock', 'matter', 'neck'];

console.log('🔍 BLM 0.2 BTC Puzzle - Systematic Testing\n');
console.log('═══════════════════════════════════════════════════\n');
console.log(`🎯 Target: ${TARGET_ADDRESS}\n`);

console.log('📋 Testing Strategy:');
console.log(`   Must-have words (6): ${MUST_HAVE.join(', ')}`);
console.log(`   Need 6 more from: ${[...HIGH_PROB, ...MEDIUM_PROB, ...LOW_PROB].length} candidates\n`);

function generateAddress(mnemonic: string, path: string): string | null {
  try {
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const root = bip32.fromSeed(seed);
    const child = root.derivePath(path);
    
    const { address } = bitcoin.payments.p2pkh({
      pubkey: child.publicKey,
      network: bitcoin.networks.bitcoin
    });
    return address || null;
  } catch (e) {
    return null;
  }
}

function testMnemonic(mnemonic: string, testNum: number): boolean {
  if (!bip39.validateMnemonic(mnemonic)) {
    return false;
  }
  
  const paths = [
    "m/44'/0'/0'/0/0",
    "m/44'/0'/0'/0/1",
    "m/44'/0'/0'/0/2",
    "m/0'/0'/0'",
    "m/0/0",
  ];
  
  for (const path of paths) {
    const address = generateAddress(mnemonic, path);
    if (address === TARGET_ADDRESS) {
      console.log(`\n🎉🎉🎉 SOLUTION FOUND! 🎉🎉🎉\n`);
      console.log(`Test #${testNum.toLocaleString()}`);
      console.log(`Mnemonic: ${mnemonic}`);
      console.log(`Path: ${path}`);
      console.log(`Address: ${address}`);
      console.log(`\n💰 Prize: ~0.2 BTC (~$20,000 USD)\n`);
      return true;
    }
  }
  
  return false;
}

function* combinations(arr: string[], k: number): Generator<string[]> {
  if (k === 0) {
    yield [];
    return;
  }
  
  for (let i = 0; i <= arr.length - k; i++) {
    for (const combo of combinations(arr.slice(i + 1), k - 1)) {
      yield [arr[i], ...combo];
    }
  }
}

function* permutations(arr: string[]): Generator<string[]> {
  if (arr.length <= 1) {
    yield arr;
    return;
  }
  
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of permutations(rest)) {
      yield [arr[i], ...perm];
    }
  }
}

let totalTested = 0;
let validMnemonics = 0;

console.log('═══════════════════════════════════════════════════');
console.log('🧪 Phase 1: Must-have + All 4 High-Priority');
console.log('═══════════════════════════════════════════════════\n');

// Phase 1: MUST_HAVE (6) + all HIGH_PROB (4) = 10 words
// Need 2 more from MEDIUM_PROB
if (MUST_HAVE.length + HIGH_PROB.length <= 12) {
  const base10 = [...MUST_HAVE, ...HIGH_PROB];
  const needed = 12 - base10.length;
  
  console.log(`Base set (10 words): ${base10.join(', ')}`);
  console.log(`Choosing ${needed} more from ${MEDIUM_PROB.length} medium-priority words\n`);
  
  let comboNum = 0;
  for (const additional of combinations(MEDIUM_PROB, needed)) {
    comboNum++;
    const words12 = [...base10, ...additional];
    
    console.log(`\nCombination ${comboNum}: [${additional.join(', ')}]`);
    console.log(`Testing permutations...`);
    
    let permNum = 0;
    for (const perm of permutations(words12)) {
      const mnemonic = perm.join(' ');
      totalTested++;
      
      if (bip39.validateMnemonic(mnemonic)) {
        validMnemonics++;
        if (testMnemonic(mnemonic, totalTested)) {
          process.exit(0);
        }
      }
      
      permNum++;
      if (permNum % 10000 === 0) {
        console.log(`   Tested ${permNum.toLocaleString()} permutations...`);
      }
      
      // Limit to avoid infinite loop
      if (permNum >= 100000) {
        console.log(`   ⚠️  Tested 100k permutations for this combination`);
        break;
      }
    }
    
    console.log(`   Total: ${permNum.toLocaleString()} permutations, ${validMnemonics} valid`);
  }
}

console.log('\n═══════════════════════════════════════════════════');
console.log('🧪 Phase 2: Must-have + 3 High + 3 Medium');
console.log('═══════════════════════════════════════════════════\n');

// Phase 2: Try different combinations of high and medium priority
const phase2Combos = [
  { high: 3, medium: 3 },
  { high: 2, medium: 4 },
  { high: 4, medium: 2 },
];

for (const { high, medium } of phase2Combos) {
  console.log(`\nTrying: 6 must-have + ${high} high-priority + ${medium} medium-priority`);
  
  let comboCount = 0;
  for (const highWords of combinations(HIGH_PROB, high)) {
    for (const medWords of combinations(MEDIUM_PROB, medium)) {
      comboCount++;
      const words12 = [...MUST_HAVE, ...highWords, ...medWords];
      
      if (comboCount % 10 === 0) {
        console.log(`   Testing combination ${comboCount}...`);
      }
      
      // Test a sample of permutations (not all)
      let permNum = 0;
      for (const perm of permutations(words12)) {
        const mnemonic = perm.join(' ');
        totalTested++;
        
        if (bip39.validateMnemonic(mnemonic)) {
          validMnemonics++;
          if (testMnemonic(mnemonic, totalTested)) {
            process.exit(0);
          }
        }
        
        permNum++;
        if (permNum >= 1000) break; // Test first 1000 permutations per combo
      }
    }
  }
  
  console.log(`   Tested ${comboCount} combinations`);
}

console.log('\n═══════════════════════════════════════════════════');
console.log('📊 Testing Summary');
console.log('═══════════════════════════════════════════════════\n');

console.log(`Total mnemonics tested: ${totalTested.toLocaleString()}`);
console.log(`Valid BIP39 mnemonics: ${validMnemonics.toLocaleString()}`);
console.log(`Target address: ${TARGET_ADDRESS}`);
console.log();
console.log(`❌ No match found with current testing strategy.`);
console.log();
console.log(`🤔 This suggests either:`);
console.log(`   1. Missing a critical word from the clues`);
console.log(`   2. Word order follows a specific pattern not yet discovered`);
console.log(`   3. Some "obvious" clue words are red herrings`);
console.log(`   4. Additional decoding/analysis needed (Bill Cipher, etc.)`);
console.log(`   5. The puzzle uses a non-standard derivation path`);
console.log();
console.log(`🔍 Recommended next steps:`);
console.log(`   - Decode Bill Cipher text from image`);
console.log(`   - Translate all Russian runes completely`);
console.log(`   - Analyze image with steganography tools`);
console.log(`   - Check git repo history for hidden clues`);
console.log(`   - Consider word positions match image spatial layout`);
console.log();

export { MUST_HAVE, HIGH_PROB, MEDIUM_PROB };
