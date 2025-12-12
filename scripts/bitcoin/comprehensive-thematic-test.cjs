#!/usr/bin/env node

/**
 * Comprehensive Brute Force - All Valid Grok + Community Words
 * 
 * Testing all combinations of high-probability words identified from:
 * 1. Grok's image analysis
 * 2. Community research
 * 3. Thematic connections
 */

const bip39 = require('bip39');
const { BIP32Factory } = require('bip32');
const ecc = require('tiny-secp256k1');
const bitcoin = require('bitcoinjs-lib');
const bip32 = BIP32Factory(ecc);

const TARGET = '1KfZGvwZxsvSmemoCmEV75uqcNzYBHjkHZ';
const KNOWN = 'moon tower food this real subject address total ten black';
const WL = bip39.wordlists.english;

console.log('🚀 Comprehensive Thematic Brute Force\n');
console.log('═══════════════════════════════════════════════════\n');

// Combined high-priority word list
const PRIORITY_WORDS = [
  // From Grok analysis (valid BIP39)
  'matter', 'hidden', 'camera', 'flag', 'liberty', 'world', 'virus',
  'question', 'police', 'eye', 'time', 'one', 'brave', 'control',
  'peace', 'life', 'space', 'mask', 'vote',
  
  // From community/thematic analysis
  'order', 'stable', 'chaos', 'balance', 'calm', 'still', 'wild',
  'exile', 'exit', 'rain', 'day', 'number', 'two',
  
  // Additional thematic
  'new', 'welcome', 'end', 'stop', 'black', 'people'
];

// Remove duplicates and ensure all are in BIP39
const UNIQUE_WORDS = [...new Set(PRIORITY_WORDS)].filter(w => WL.includes(w));

console.log(`📋 Testing ${UNIQUE_WORDS.length} high-priority words:\n`);
console.log(`   ${UNIQUE_WORDS.join(', ')}\n`);
console.log(`🎲 Total combinations to test: ${UNIQUE_WORDS.length * UNIQUE_WORDS.length}\n`);

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

console.log('═══════════════════════════════════════════════════');
console.log('🔍 Starting Comprehensive Search...');
console.log('═══════════════════════════════════════════════════\n');

const startTime = Date.now();
let tested = 0;
let validCount = 0;
const validMnemonics = [];

for (let i = 0; i < UNIQUE_WORDS.length; i++) {
  const w11 = UNIQUE_WORDS[i];
  
  for (let j = 0; j < UNIQUE_WORDS.length; j++) {
    const w12 = UNIQUE_WORDS[j];
    const m = `${KNOWN} ${w11} ${w12}`;
    tested++;
    
    if (bip39.validateMnemonic(m)) {
      validCount++;
      validMnemonics.push({ w11, w12, mnemonic: m });
      
      const result = testMnemonic(m);
      if (result.found) {
        console.log('\n\n🎉🎉🎉 SOLUTION FOUND!!! 🎉🎉🎉\n');
        console.log(`After testing ${tested.toLocaleString()} combinations\n`);
        console.log(`💎 WINNING MNEMONIC:`);
        console.log(`   "${m}"\n`);
        console.log(`🔑 Path: ${result.path}`);
        console.log(`📍 Address: ${result.address}`);
        console.log(`💰 Prize: ~0.2 BTC (~$20,000 USD)\n`);
        console.log(`⏱️  Time: ${((Date.now() - startTime) / 1000).toFixed(1)}s\n`);
        process.exit(0);
      }
    }
    
    if (tested % 100 === 0) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = Math.round(tested / elapsed);
      const pct = ((tested / (UNIQUE_WORDS.length * UNIQUE_WORDS.length)) * 100).toFixed(2);
      process.stdout.write(`\r   Progress: ${tested}/${UNIQUE_WORDS.length * UNIQUE_WORDS.length} (${pct}%) - ${validCount} valid - ${rate}/s`);
    }
  }
}

console.log('\n\n═══════════════════════════════════════════════════');
console.log('📊 Final Results');
console.log('═══════════════════════════════════════════════════\n');

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`⏱️  Time elapsed: ${elapsed}s`);
console.log(`📈 Combinations tested: ${tested.toLocaleString()}`);
console.log(`✅ Valid BIP39 mnemonics: ${validCount}`);
console.log(`❌ Match found: No\n`);

if (validCount > 0) {
  console.log('📝 All valid mnemonics tested:\n');
  validMnemonics.slice(0, 20).forEach(({ w11, w12 }, idx) => {
    console.log(`   ${(idx + 1).toString().padStart(2)}. ${w11} ${w12}`);
  });
  
  if (validMnemonics.length > 20) {
    console.log(`   ... and ${validMnemonics.length - 20} more\n`);
  }
}

console.log('═══════════════════════════════════════════════════');
console.log('💡 Next Steps');
console.log('═══════════════════════════════════════════════════\n');

console.log('Tested all high-priority thematic combinations.');
console.log('To continue:');
console.log('1. Expand to medium-priority words from image');
console.log('2. Test ALL 2048×2048 combinations (full brute force)');
console.log('3. Analyze image text alterations more carefully');
console.log('4. Consider non-standard derivation paths');
console.log();
