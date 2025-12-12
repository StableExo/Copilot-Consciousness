#!/usr/bin/env node

/**
 * Extended Brute Force - Expand to More Words
 * 
 * Testing expanded set including medium-priority words
 * identified from image and thematic analysis
 */

const bip39 = require('bip39');
const { BIP32Factory } = require('bip32');
const ecc = require('tiny-secp256k1');
const bitcoin = require('bitcoinjs-lib');
const bip32 = BIP32Factory(ecc);

const TARGET = '1KfZGvwZxsvSmemoCmEV75uqcNzYBHjkHZ';
const KNOWN = 'moon tower food this real subject address total ten black';
const WL = bip39.wordlists.english;

console.log('🔍 Extended Brute Force - Medium Priority Words\n');
console.log('═══════════════════════════════════════════════════\n');

// Expand word set with medium-priority words
const ALL_CANDIDATE_WORDS = [
  // High priority (already tested)
  'matter', 'hidden', 'camera', 'flag', 'liberty', 'world', 'virus',
  'question', 'police', 'eye', 'time', 'one', 'brave', 'control',
  'peace', 'life', 'space', 'mask', 'vote', 'order', 'stable',
  'chaos', 'balance', 'calm', 'still', 'wild', 'exile', 'exit',
  'rain', 'day', 'number', 'two', 'welcome', 'end', 'people',
  
  // Medium priority - additional words from image themes
  'street', 'sign', 'hand', 'head', 'body', 'voice', 'truth',
  'change', 'power', 'state', 'law', 'right', 'war', 'fear',
  'hope', 'future', 'past', 'present', 'death', 'birth',
  'system', 'money', 'gold', 'silver', 'coin', 'trade',
  'lock', 'key', 'open', 'close', 'win', 'lose',
  'good', 'evil', 'light', 'dark', 'sun', 'star',
  'land', 'water', 'fire', 'earth', 'air', 'sky'
];

const VALID_WORDS = [...new Set(ALL_CANDIDATE_WORDS)].filter(w => WL.includes(w));

console.log(`📋 Expanded word set: ${VALID_WORDS.length} valid BIP39 words`);
console.log(`🎲 Total combinations: ${(VALID_WORDS.length * VALID_WORDS.length).toLocaleString()}\n`);

function testMnemonic(m) {
  if (!bip39.validateMnemonic(m)) return false;
  
  const seed = bip39.mnemonicToSeedSync(m, '');
  const root = bip32.fromSeed(seed);
  
  for (let acc = 0; acc <= 1; acc++) {
    for (let idx = 0; idx < 10; idx++) {
      const path = `m/44'/0'/${acc}'/0/${idx}`;
      const child = root.derivePath(path);
      
      const { address } = bitcoin.payments.p2pkh({
        pubkey: child.publicKey,
        network: bitcoin.networks.bitcoin
      });
      
      if (address === TARGET) {
        return { found: true, path, address };
      }
    }
  }
  
  return { found: false };
}

console.log('Starting extended search...\n');

const startTime = Date.now();
let tested = 0;
let validCount = 0;

for (let i = 0; i < VALID_WORDS.length; i++) {
  const w11 = VALID_WORDS[i];
  
  for (let j = 0; j < VALID_WORDS.length; j++) {
    const w12 = VALID_WORDS[j];
    const m = `${KNOWN} ${w11} ${w12}`;
    tested++;
    
    if (bip39.validateMnemonic(m)) {
      validCount++;
      
      const result = testMnemonic(m);
      if (result.found) {
        console.log('\n\n🎉🎉🎉 SOLUTION FOUND!!! 🎉🎉🎉\n');
        console.log(`💎 WINNING MNEMONIC:\n   "${m}"\n`);
        console.log(`🔑 Path: ${result.path}`);
        console.log(`📍 Address: ${result.address}`);
        console.log(`💰 Prize: ~0.2 BTC (~$20,000 USD)\n`);
        console.log(`⏱️  Time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
        console.log(`📊 Tested: ${tested.toLocaleString()} combinations\n`);
        process.exit(0);
      }
    }
    
    if (tested % 500 === 0) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = Math.round(tested / elapsed);
      const pct = ((tested / (VALID_WORDS.length * VALID_WORDS.length)) * 100).toFixed(2);
      const eta = Math.round(((VALID_WORDS.length * VALID_WORDS.length) - tested) / rate);
      process.stdout.write(`\r   ${tested.toLocaleString()}/${(VALID_WORDS.length * VALID_WORDS.length).toLocaleString()} (${pct}%) - ${validCount} valid - ${rate}/s - ETA: ${eta}s  `);
    }
  }
}

console.log('\n\n═══════════════════════════════════════════════════');
console.log('📊 Search Complete');
console.log('═══════════════════════════════════════════════════\n');

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`⏱️  Time: ${elapsed}s`);
console.log(`📈 Tested: ${tested.toLocaleString()}`);
console.log(`✅ Valid: ${validCount}`);
console.log(`❌ Match: No\n`);

console.log('All medium-priority combinations tested.');
console.log('If no match, proceed to full 2048×2048 brute force.\n');
