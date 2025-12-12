#!/usr/bin/env node

/**
 * Electrum Approach Testing - Priority Word Combinations
 * 
 * Based on Reddit discovery:
 * - "Hope" from Russian rune: "I hope many bitcoins will be sent here"
 * - Testing with high-priority BIP39 combinations first
 * - Then will need Electrum-specific testing if no match
 * 
 * Known: "moon tower food this real subject address total ten black"
 */

const bip39 = require('bip39');
const { BIP32Factory } = require('bip32');
const ecc = require('tiny-secp256k1');
const bitcoin = require('bitcoinjs-lib');
const bip32 = BIP32Factory(ecc);

const TARGET = '1KfZGvwZxsvSmemoCmEV75uqcNzYBHjkHZ';
const KNOWN = 'moon tower food this real subject address total ten black';
const WL = bip39.wordlists.english;

console.log('🚀 Electrum Approach - Priority Testing\n');
console.log('═══════════════════════════════════════════════════\n');
console.log(`🎯 Target: ${TARGET}\n`);
console.log(`📋 Known prefix: "${KNOWN}"\n`);

// Priority word combinations based on ALL discoveries
const PRIORITY_COMBOS = [
  // NEW: "Hope" from Reddit Russian rune (HIGHEST PRIORITY)
  ['hope', 'rain'],
  ['hope', 'day'],
  ['hope', 'number'],
  ['rain', 'hope'],
  ['day', 'hope'],
  
  // "Hope" with previous high-value words
  ['hope', 'order'],
  ['hope', 'world'],
  ['hope', 'peace'],
  ['hope', 'life'],
  ['hope', 'liberty'],
  ['order', 'hope'],
  ['world', 'hope'],
  ['peace', 'hope'],
  
  // Previous best combinations (re-test for completeness)
  ['world', 'order'],
  ['order', 'world'],
  ['hidden', 'control'],
  ['space', 'flag'],
  ['order', 'chaos'],
  
  // "Rainy day" theme combinations
  ['rain', 'day'],
  ['day', 'rain'],
  ['rain', 'number'],
  
  // Number theme (from "number X")
  ['number', 'one'],
  ['number', 'two'],
  ['two', 'number'],
];

function testMnemonic(m, combo) {
  if (!bip39.validateMnemonic(m)) return { valid: false };
  
  const seed = bip39.mnemonicToSeedSync(m, '');
  const root = bip32.fromSeed(seed);
  
  // Test multiple derivation paths
  const paths = [
    { path: "m/44'/0'/0'/0/0", name: 'BIP44 acc0 idx0' },
    { path: "m/44'/0'/0'/0/1", name: 'BIP44 acc0 idx1' },
    { path: "m/44'/0'/0'/0/2", name: 'BIP44 acc0 idx2' },
    { path: "m/44'/0'/1'/0/0", name: 'BIP44 acc1 idx0' },
    { path: "m/0'/0", name: 'Electrum-style' },
    { path: "m/0/0", name: 'Legacy' },
  ];
  
  for (const { path, name } of paths) {
    try {
      const child = root.derivePath(path);
      
      const { address } = bitcoin.payments.p2pkh({
        pubkey: child.publicKey,
        network: bitcoin.networks.bitcoin
      });
      
      if (address === TARGET) {
        return { 
          valid: true, 
          found: true, 
          path, 
          pathName: name,
          address 
        };
      }
    } catch (e) {
      // Continue if path fails
    }
  }
  
  return { valid: true, found: false };
}

console.log('═══════════════════════════════════════════════════');
console.log('🧪 Testing Priority Combinations');
console.log('═══════════════════════════════════════════════════\n');

let tested = 0;
let validCount = 0;
const validCombos = [];

for (const [w11, w12] of PRIORITY_COMBOS) {
  const m = `${KNOWN} ${w11} ${w12}`;
  tested++;
  
  const combo = `${w11} ${w12}`.padEnd(25);
  const result = testMnemonic(m, [w11, w12]);
  
  if (result.valid) {
    validCount++;
    validCombos.push({ w11, w12, mnemonic: m });
    
    if (result.found) {
      console.log('\n\n🎉🎉🎉 SOLUTION FOUND!!! 🎉🎉🎉\n');
      console.log(`💎 WINNING MNEMONIC:\n`);
      console.log(`   "${m}"\n`);
      console.log(`🔑 Derivation: ${result.path} (${result.pathName})`);
      console.log(`📍 Address: ${result.address}`);
      console.log(`💰 Prize: ~0.2 BTC (~$20,000 USD)\n`);
      console.log(`✨ Tested ${tested} combinations before finding solution!\n`);
      process.exit(0);
    }
    
    console.log(`✅ ${combo} - Valid BIP39`);
  } else {
    console.log(`❌ ${combo} - Invalid checksum`);
  }
}

console.log(`\n═══════════════════════════════════════════════════`);
console.log(`📊 Phase 1 Results`);
console.log(`═══════════════════════════════════════════════════\n`);
console.log(`Total tested: ${tested}`);
console.log(`Valid BIP39: ${validCount}`);
console.log(`Match found: ❌ No\n`);

if (validCount > 0) {
  console.log(`Valid combinations found:`);
  validCombos.forEach(({ w11, w12 }, idx) => {
    console.log(`   ${(idx + 1).toString().padStart(2)}. ${w11} ${w12}`);
  });
  console.log();
}

console.log('═══════════════════════════════════════════════════');
console.log('🔍 Extended Testing - "Hope" with All High-Priority');
console.log('═══════════════════════════════════════════════════\n');

// All high-priority words from previous testing
const HIGH_PRIORITY = [
  'order', 'world', 'peace', 'life', 'liberty', 'matter', 'hidden',
  'control', 'space', 'flag', 'time', 'one', 'brave', 'chaos',
  'balance', 'stable', 'exit', 'exile', 'rain', 'day', 'number', 'two'
];

console.log(`Testing "hope" with ${HIGH_PRIORITY.length} high-priority words...\n`);

let phase2Tested = 0;
let phase2Valid = 0;

for (const word of HIGH_PRIORITY) {
  // Test hope + word
  let m = `${KNOWN} hope ${word}`;
  phase2Tested++;
  
  let result = testMnemonic(m);
  if (result.valid) {
    phase2Valid++;
    if (result.found) {
      console.log('\n🎉 SOLUTION FOUND!\n');
      console.log(`Mnemonic: "${m}"`);
      console.log(`Path: ${result.path} (${result.pathName})`);
      console.log(`Address: ${result.address}\n`);
      process.exit(0);
    }
  }
  
  // Test word + hope
  m = `${KNOWN} ${word} hope`;
  phase2Tested++;
  
  result = testMnemonic(m);
  if (result.valid) {
    phase2Valid++;
    if (result.found) {
      console.log('\n🎉 SOLUTION FOUND!\n');
      console.log(`Mnemonic: "${m}"`);
      console.log(`Path: ${result.path} (${result.pathName})`);
      console.log(`Address: ${result.address}\n`);
      process.exit(0);
    }
  }
  
  if (phase2Tested % 10 === 0) {
    process.stdout.write('.');
  }
}

console.log(`\n\n📊 Phase 2 Results: ${phase2Valid} valid out of ${phase2Tested} tested\n`);

console.log('═══════════════════════════════════════════════════');
console.log('💡 Summary & Next Steps');
console.log('═══════════════════════════════════════════════════\n');

console.log(`✅ Tested ${tested + phase2Tested} total combinations`);
console.log(`✅ Found ${validCount + phase2Valid} valid BIP39 mnemonics`);
console.log(`❌ No match with BIP39 + standard/Electrum paths\n`);

console.log('📋 What this means:\n');
console.log('1. "Hope" word tested extensively - no BIP39 match');
console.log('2. All high-priority combinations with "hope" tested');
console.log('3. Tested both BIP44 AND Electrum-style derivation paths');
console.log('4. Need to consider Electrum WORDLIST (not just derivation)\n');

console.log('🎯 Next Actions:\n');
console.log('Option 1: Full Electrum wallet testing');
console.log('   - Use Electrum wordlist (1,626 words, different from BIP39)');
console.log('   - Test "breathe" (valid in Electrum, not BIP39)');
console.log('   - May require Electrum Python library\n');

console.log('Option 2: Continue BIP39 full brute force');
console.log('   - Test all 4.2M remaining combinations');
console.log('   - Time: ~2-3 hours at 600/sec\n');

console.log('Option 3: Verify the 10 known words are correct');
console.log('   - Check Python script source more carefully');
console.log('   - Confirm word order is accurate\n');

console.log('⚠️  Recommendation: Pursue Electrum testing next');
console.log('   The "breathe" clue is too strong to ignore!\n');
