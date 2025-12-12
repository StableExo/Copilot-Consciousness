#!/usr/bin/env node --import tsx

/**
 * Test mixed indexing pattern - positions 16 & 23 use 0-indexing
 * 
 * Discovery: MetaMask validation showed positions 16 & 23 need 0-indexed BIP39 words
 * - Position 16: index 10 (0-indexed) → "acoustic" ✅
 * - Position 23: index 22 (0-indexed) → "action" ✅
 * - All other positions: 1-indexed BIP39
 */

import * as bip39 from 'bip39';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import * as bitcoin from 'bitcoinjs-lib';

const bip32 = BIP32Factory(ecc);

// BIP39 English word list
const BIP39_WORDLIST = bip39.wordlists.english;

// Size 23 Hamiltonian path from video timestamp 7:57
const SEQUENCE_23 = [18, 7, 9, 16, 20, 5, 11, 14, 2, 23, 13, 12, 4, 21, 15, 10, 6, 19, 17, 8, 1, 3, 22];

console.log('🔍 Testing Mixed Indexing Pattern\n');
console.log('Sequence from video (size 23):', SEQUENCE_23.join(', '));
console.log('\n');

// Generate words with mixed indexing
function generateMixedIndexingMnemonic(): string[] {
  const words: string[] = [];
  
  for (let i = 0; i < SEQUENCE_23.length; i++) {
    const num = SEQUENCE_23[i];
    const position = i + 1; // 1-indexed position
    
    let word: string;
    
    // Positions 16 and 23 use 0-indexing, others use 1-indexing
    if (position === 16 || position === 23) {
      // 0-indexed (num directly)
      word = BIP39_WORDLIST[num];
      console.log(`Position ${position}: number ${num} → [0-idx] "${word}"`);
    } else {
      // 1-indexed (num + 1)
      word = BIP39_WORDLIST[num + 1];
      console.log(`Position ${position}: number ${num} → [1-idx] "${word}"`);
    }
    
    words.push(word);
  }
  
  return words;
}

// Generate all words with 0-indexing for comparison
function generateAllZeroIndexed(): string[] {
  return SEQUENCE_23.map((num, i) => {
    const word = BIP39_WORDLIST[num];
    console.log(`Position ${i + 1}: number ${num} → [0-idx] "${word}"`);
    return word;
  });
}

// Calculate valid BIP39 checksums for given 23 words
function calculateValidChecksum(words23: string[]): string[] {
  console.log('\n🔢 Calculating valid 24th word (BIP39 checksum)...\n');
  
  // Convert words to indices
  const indices = words23.map(word => {
    const idx = BIP39_WORDLIST.indexOf(word);
    if (idx === -1) throw new Error(`Word not in BIP39 list: ${word}`);
    return idx;
  });
  
  // Convert to binary string (11 bits each)
  let binaryStr = '';
  for (const idx of indices) {
    binaryStr += idx.toString(2).padStart(11, '0');
  }
  
  // This gives us 253 bits (23 words × 11 bits)
  console.log(`First 23 words = ${binaryStr.length} bits`);
  
  // For 24-word mnemonic: 256 bits total entropy + 8 bits checksum = 264 bits
  // Last word: 3 bits entropy + 8 bits checksum = 11 bits
  
  // Try all possible 3-bit entropy values (0-7)
  const validWords: string[] = [];
  
  for (let entropy3bit = 0; entropy3bit < 8; entropy3bit++) {
    const entropy3bitBinary = entropy3bit.toString(2).padStart(3, '0');
    const fullEntropy = binaryStr + entropy3bitBinary; // 256 bits
    
    // Convert to bytes
    const entropyBytes = Buffer.alloc(32);
    for (let i = 0; i < 32; i++) {
      const byte = parseInt(fullEntropy.substr(i * 8, 8), 2);
      entropyBytes[i] = byte;
    }
    
    // Calculate checksum
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(entropyBytes).digest();
    const checksum = hash[0].toString(2).padStart(8, '0');
    
    // Combine entropy3bit + checksum = 11-bit word index
    const wordIndex = parseInt(entropy3bitBinary + checksum, 2);
    const word = BIP39_WORDLIST[wordIndex];
    
    validWords.push(word);
    console.log(`Entropy ${entropy3bit} (${entropy3bitBinary}) → checksum ${checksum} → word[${wordIndex}] = "${word}"`);
  }
  
  return validWords;
}

// Test mnemonic validity
function testMnemonic(words: string[], label: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${label}`);
  console.log('='.repeat(60));
  
  const mnemonic = words.join(' ');
  const isValid = bip39.validateMnemonic(mnemonic);
  
  console.log(`\nMnemonic (${words.length} words):`);
  console.log(mnemonic);
  console.log(`\nValid: ${isValid ? '✅ YES' : '❌ NO'}`);
  
  if (isValid) {
    console.log('\n✅ SUCCESS! This mnemonic passes BIP39 validation!\n');
    
    // Derive some addresses
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const root = bip32.fromSeed(seed);
    
    console.log('📍 Derived Addresses (BIP84 - Native SegWit):');
    
    // Standard BIP84: m/84'/0'/0'/0/0
    const standard = root.derivePath("m/84'/0'/0'/0/0");
    const { address: addr1 } = bitcoin.payments.p2wpkh({
      pubkey: standard.publicKey,
      network: bitcoin.networks.bitcoin
    });
    console.log(`  m/84'/0'/0'/0/0: ${addr1}`);
    
    // Magic 130: m/84'/130'/0'/0/0
    const magic130 = root.derivePath("m/84'/130'/0'/0/0");
    const { address: addr2 } = bitcoin.payments.p2wpkh({
      pubkey: magic130.publicKey,
      network: bitcoin.networks.bitcoin
    });
    console.log(`  m/84'/130'/0'/0/0: ${addr2}`);
    
    // More variations
    const var1 = root.derivePath("m/84'/0'/130'/0/0");
    const { address: addr3 } = bitcoin.payments.p2wpkh({
      pubkey: var1.publicKey,
      network: bitcoin.networks.bitcoin
    });
    console.log(`  m/84'/0'/130'/0/0: ${addr3}`);
    
    console.log('\n🔍 Check these addresses on blockchain for 0.08252025 BTC!\n');
  }
  
  return isValid;
}

console.log('\n' + '='.repeat(60));
console.log('OPTION 1: Mixed Indexing (16 & 23 use 0-idx, others use 1-idx)');
console.log('='.repeat(60) + '\n');

const mixedWords = generateMixedIndexingMnemonic();

// Add "track" as 24th word
const mixedWith Track = [...mixedWords, 'track'];
testMnemonic(mixedWithTrack, 'Mixed Indexing + "track"');

// Calculate valid 24th words
const validWords = calculateValidChecksum(mixedWords);
console.log(`\n📋 Valid 24th words (based on BIP39 checksum): ${validWords.join(', ')}`);

// Test each valid checksum word
for (const validWord of validWords) {
  const testWords = [...mixedWords, validWord];
  testMnemonic(testWords, `Mixed Indexing + "${validWord}"`);
}

console.log('\n' + '='.repeat(60));
console.log('OPTION 2: All 0-Indexed');
console.log('='.repeat(60) + '\n');

const allZeroWords = generateAllZeroIndexed();
const allZeroWithTrack = [...allZeroWords, 'track'];
testMnemonic(allZeroWithTrack, 'All 0-Indexed + "track"');

// Calculate valid 24th words for all-zero-indexed
const validWordsZero = calculateValidChecksum(allZeroWords);
for (const validWord of validWordsZero) {
  const testWords = [...allZeroWords, validWord];
  testMnemonic(testWords, `All 0-Indexed + "${validWord}"`);
}

console.log('\n✨ Testing complete!\n');
