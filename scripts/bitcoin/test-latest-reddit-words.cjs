#!/usr/bin/env node

/**
 * Test Latest Reddit Community Words - December 2025
 * 
 * Community-identified words: proof, time, only, win, face
 * Focus on "proof" (strong Bitcoin/PoW theme)
 * 
 * Known prefix: "moon tower food this real subject address total ten black"
 */

const bip39 = require('bip39');
const { BIP32Factory } = require('bip32');
const ecc = require('tiny-secp256k1');
const bitcoin = require('bitcoinjs-lib');
const bip32 = BIP32Factory(ecc);

const TARGET = '1KfZGvwZxsvSmemoCmEV75uqcNzYBHjkHZ';
const KNOWN = 'moon tower food this real subject address total ten black';
const WL = bip39.wordlists.english;

console.log('🔬 Testing Latest Reddit Community Words\n');
console.log('═══════════════════════════════════════════════════\n');
console.log(`🎯 Target: ${TARGET}\n`);
console.log(`📋 Known: "${KNOWN}"\n`);
console.log(`🆕 New words from community: proof, time, only, win, face\n`);

// Verify new words are in BIP39
const newWords = ['proof', 'time', 'only', 'win', 'face'];
console.log('Verifying new words in BIP39 wordlist:');
newWords.forEach(w => {
  const valid = WL.includes(w);
  console.log(`  ${valid ? '✅' : '❌'} ${w}`);
});
console.log();

function testMnemonic(m, combo) {
  if (!bip39.validateMnemonic(m)) return { valid: false };
  
  const seed = bip39.mnemonicToSeedSync(m, '');
  const root = bip32.fromSeed(seed);
  
  const paths = [
    { path: "m/44'/0'/0'/0/0", name: 'BIP44' },
    { path: "m/0'/0", name: 'Electrum' },
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
        return { valid: true, found: true, path, pathName: name, address };
      }
    } catch (e) {}
  }
  
  return { valid: true, found: false };
}

console.log('═══════════════════════════════════════════════════');
console.log('🥇 PHASE 1: "Proof" Combinations (Highest Priority)');
console.log('═══════════════════════════════════════════════════\n');

const proofCombos = [
  ['proof', 'time'],
  ['time', 'proof'],
  ['proof', 'only'],
  ['only', 'proof'],
  ['proof', 'win'],
  ['win', 'proof'],
  ['proof', 'face'],
  ['face', 'proof'],
  ['proof', 'hope'],
  ['hope', 'proof'],
  ['proof', 'order'],
  ['order', 'proof'],
  ['proof', 'world'],
  ['world', 'proof'],
  ['proof', 'life'],
  ['life', 'proof'],
  ['proof', 'peace'],
  ['peace', 'proof'],
  ['proof', 'work'],  // Proof of Work!
  ['work', 'proof'],
];

let tested = 0;
let validCount = 0;

console.log('Testing "proof" with high-value words...\n');

for (const [w11, w12] of proofCombos) {
  const m = `${KNOWN} ${w11} ${w12}`;
  tested++;
  
  const combo = `${w11.padEnd(10)} ${w12}`.padEnd(25);
  const result = testMnemonic(m);
  
  if (result.valid) {
    validCount++;
    
    if (result.found) {
      console.log('\n\n🎉🎉🎉 SOLUTION FOUND!!! 🎉🎉🎉\n');
      console.log(`💎 WINNING MNEMONIC:\n`);
      console.log(`   "${m}"\n`);
      console.log(`🔑 Path: ${result.path} (${result.pathName})`);
      console.log(`📍 Address: ${result.address}`);
      console.log(`💰 Prize: ~0.2 BTC\n`);
      process.exit(0);
    }
    
    console.log(`✅ ${combo} - Valid`);
  } else {
    console.log(`❌ ${combo} - Invalid`);
  }
}

console.log(`\n📊 Phase 1: ${validCount} valid out of ${tested}\n`);

console.log('═══════════════════════════════════════════════════');
console.log('🥈 PHASE 2: Other New Words');
console.log('═══════════════════════════════════════════════════\n');

const otherCombos = [
  ['only', 'win'],
  ['win', 'only'],
  ['only', 'face'],
  ['face', 'only'],
  ['win', 'face'],
  ['face', 'win'],
  ['time', 'only'],
  ['only', 'time'],
  ['time', 'win'],
  ['win', 'time'],
  ['time', 'face'],
  ['face', 'time'],
];

let phase2Tested = 0;
let phase2Valid = 0;

for (const [w11, w12] of otherCombos) {
  const m = `${KNOWN} ${w11} ${w12}`;
  phase2Tested++;
  
  const combo = `${w11.padEnd(10)} ${w12}`.padEnd(25);
  const result = testMnemonic(m);
  
  if (result.valid) {
    phase2Valid++;
    
    if (result.found) {
      console.log('\n🎉 SOLUTION FOUND!\n');
      console.log(`"${m}"`);
      process.exit(0);
    }
    
    console.log(`✅ ${combo} - Valid`);
  } else {
    console.log(`❌ ${combo} - Invalid`);
  }
}

console.log(`\n📊 Phase 2: ${phase2Valid} valid out of ${phase2Tested}\n`);

console.log('═══════════════════════════════════════════════════');
console.log('🥉 PHASE 3: "Work" Combinations (Proof of Work)');
console.log('═══════════════════════════════════════════════════\n');

const workCombos = [
  ['work', 'proof'],  // Already tested above
  ['work', 'time'],
  ['time', 'work'],
  ['work', 'only'],
  ['only', 'work'],
  ['work', 'hope'],
  ['hope', 'work'],
];

let phase3Tested = 0;
let phase3Valid = 0;

for (const [w11, w12] of workCombos) {
  const m = `${KNOWN} ${w11} ${w12}`;
  phase3Tested++;
  
  const combo = `${w11.padEnd(10)} ${w12}`.padEnd(25);
  const result = testMnemonic(m);
  
  if (result.valid) {
    phase3Valid++;
    
    if (result.found) {
      console.log('\n🎉 SOLUTION FOUND!\n');
      console.log(`"${m}"`);
      process.exit(0);
    }
    
    console.log(`✅ ${combo} - Valid`);
  } else {
    console.log(`❌ ${combo} - Invalid`);
  }
}

console.log(`\n📊 Phase 3: ${phase3Valid} valid out of ${phase3Tested}\n`);

console.log('═══════════════════════════════════════════════════');
console.log('📊 Final Results');
console.log('═══════════════════════════════════════════════════\n');

const totalTested = tested + phase2Tested + phase3Tested;
const totalValid = validCount + phase2Valid + phase3Valid;

console.log(`Total tested: ${totalTested}`);
console.log(`Valid BIP39: ${totalValid}`);
console.log(`Match found: ❌ No\n`);

console.log('💡 Key Insights:\n');
console.log('1. "Proof" tested extensively with high-value words');
console.log('2. "Proof of Work" theme explored');
console.log('3. All community-identified new words tested');
console.log('4. No match found - may need to verify known 10 words\n');

console.log('🔍 Next Steps:\n');
console.log('Option 1: Verify Python script accuracy');
console.log('   - Check HomelessPhD repo for original source');
console.log('   - Confirm "this address total ten" are correct\n');

console.log('Option 2: Test word order permutations');
console.log('   - Known words may be scrambled');
console.log('   - BIP39 checksum validates correct order\n');

console.log('Option 3: Continue with full brute force');
console.log('   - Test remaining 4.2M combinations');
console.log('   - Guaranteed solution if solvable\n');
