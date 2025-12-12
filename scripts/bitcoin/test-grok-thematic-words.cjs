#!/usr/bin/env node

/**
 * Thematic Word Testing - Based on Grok's Image Analysis
 * 
 * Known: "moon tower food this real subject address total ten black"
 * 
 * New thematic clusters from Grok analysis:
 * - Dystopian: world, brave, control, liberty, freedom
 * - BLM/Floyd: breathe, peace, justice, police, life, matter
 * - 2020 Events: virus, mask, camera, time, question
 * - Location: seattle (not BIP39), space, needle
 * - Conspiracy: eye, hidden, one
 * - Political: flag, vote
 */

const bip39 = require('bip39');
const { BIP32Factory } = require('bip32');
const ecc = require('tiny-secp256k1');
const bitcoin = require('bitcoinjs-lib');
const bip32 = BIP32Factory(ecc);

const TARGET = '1KfZGvwZxsvSmemoCmEV75uqcNzYBHjkHZ';
const KNOWN = 'moon tower food this real subject address total ten black';
const WL = bip39.wordlists.english;

console.log('🔍 Thematic Word Testing - Grok Analysis Edition\n');
console.log('═══════════════════════════════════════════════════\n');

// Extract BIP39 words from Grok's analysis
const GROK_WORDS = [
  'breathe', 'black', 'matter', 'hidden', 'camera', 'flag', 'liberty',
  'world', 'virus', 'question', 'police', 'eye', 'time', 'one',
  'brave', 'control', 'freedom', 'peace', 'justice', 'life',
  'space', 'mask', 'vote', 'needle'
];

console.log('📋 Checking which words are in BIP39:\n');
const VALID_GROK_WORDS = GROK_WORDS.filter(w => {
  const valid = WL.includes(w);
  console.log(`   ${w.padEnd(12)} ${valid ? '✅' : '❌'}`);
  return valid;
});

console.log(`\n✅ Valid BIP39 words from Grok analysis: ${VALID_GROK_WORDS.length}`);
console.log(`   ${VALID_GROK_WORDS.join(', ')}\n`);

// High-priority thematic combinations based on image analysis
const THEMATIC_COMBOS = [
  // "BRAVE NEW WORLD" theme
  ['brave', 'world'],
  ['world', 'brave'],
  ['brave', 'one'],
  ['one', 'brave'],
  
  // "I CAN'T BREATHE" - but breathe not in BIP39, use related
  ['peace', 'justice'],
  ['justice', 'peace'],
  
  // Liberty/Freedom theme
  ['liberty', 'freedom'],
  ['freedom', 'liberty'],
  
  // Control/Hidden theme
  ['control', 'hidden'],
  ['hidden', 'control'],
  
  // Life/Matter theme  
  ['life', 'matter'],
  ['matter', 'life'],
  
  // Time/One (clock in image)
  ['time', 'one'],
  ['one', 'time'],
  
  // Eye/Hidden (Illuminati symbol)
  ['eye', 'hidden'],
  ['hidden', 'eye'],
  
  // Space/Flag
  ['space', 'flag'],
  ['flag', 'space'],
  
  // World/Order (New World Order conspiracy)
  ['world', 'order'],
  ['order', 'world'],
  
  // Police/Justice
  ['police', 'justice'],
  ['justice', 'police'],
  
  // Question/One
  ['question', 'one'],
  ['one', 'question'],
  
  // Virus/World (pandemic)
  ['virus', 'world'],
  ['world', 'virus'],
];

function testMnemonic(m, combo) {
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
        console.log('\n\n🎉🎉🎉 SOLUTION FOUND!!! 🎉🎉🎉\n');
        console.log(`💎 WINNING MNEMONIC:\n   "${m}"\n`);
        console.log(`🔑 Path: ${path}`);
        console.log(`📍 Address: ${address}`);
        console.log(`💰 Prize: ~0.2 BTC (~$20,000 USD)\n`);
        return true;
      }
    }
  }
  
  return false;
}

console.log('═══════════════════════════════════════════════════');
console.log('🧪 Testing Thematic Combinations');
console.log('═══════════════════════════════════════════════════\n');

let tested = 0;
let validCount = 0;

for (const [w11, w12] of THEMATIC_COMBOS) {
  const m = `${KNOWN} ${w11} ${w12}`;
  tested++;
  
  const valid = bip39.validateMnemonic(m);
  const status = valid ? '✅ Valid' : '❌ Invalid';
  
  console.log(`${tested}. "${w11} ${w12}".padEnd(30) - ${status}`);
  
  if (valid) {
    validCount++;
    if (testMnemonic(m, tested)) {
      console.log(`\n✅ SOLVED after ${tested} combinations!`);
      process.exit(0);
    }
  }
}

console.log(`\n═══════════════════════════════════════════════════`);
console.log(`📊 Results:`);
console.log(`   Combinations tested: ${tested}`);
console.log(`   Valid mnemonics: ${validCount}`);
console.log(`   Match found: ❌ No\n`);

// Now test with community-identified words
console.log('═══════════════════════════════════════════════════');
console.log('🧪 Phase 2: Previously Identified High-Priority Words');
console.log('═══════════════════════════════════════════════════\n');

const COMMUNITY_WORDS = ['order', 'stable', 'chaos', 'balance', 'calm', 'still', 'wild', 'exile', 'exit'];
const VALID_COMMUNITY = COMMUNITY_WORDS.filter(w => WL.includes(w));

console.log(`Testing with: ${VALID_COMMUNITY.join(', ')}\n`);

let phase2Tested = 0;
let phase2Valid = 0;

for (const w11 of VALID_COMMUNITY) {
  for (const w12 of VALID_COMMUNITY) {
    const m = `${KNOWN} ${w11} ${w12}`;
    phase2Tested++;
    
    if (bip39.validateMnemonic(m)) {
      phase2Valid++;
      console.log(`Testing: "${w11} ${w12}" - Valid ✅`);
      
      if (testMnemonic(m, phase2Tested)) {
        console.log(`\n✅ SOLVED!`);
        process.exit(0);
      }
    }
    
    if (phase2Tested % 10 === 0) {
      process.stdout.write('.');
    }
  }
}

console.log(`\n\n📊 Phase 2 Results:`);
console.log(`   Combinations tested: ${phase2Tested}`);
console.log(`   Valid mnemonics: ${phase2Valid}`);
console.log(`   Match found: ❌ No\n`);

console.log('═══════════════════════════════════════════════════');
console.log('💡 Recommendations');
console.log('═══════════════════════════════════════════════════\n');

console.log('Tested all high-priority thematic combinations:');
console.log('- Dystopian theme (brave, world, control)');
console.log('- BLM theme (peace, justice, life, matter)');
console.log('- Conspiracy theme (eye, hidden, one)');
console.log('- Stability theme (order, stable, balance)');
console.log();
console.log('None matched. Next steps:');
console.log('1. Analyze "BRAVE NEW WORLD" text alterations in detail');
console.log('2. Check if derivation path m/44\' has significance');
console.log('3. Look for word repetitions or patterns in image');
console.log('4. Consider that some words might be visual puns');
console.log('5. Full brute force may be necessary');
console.log();
