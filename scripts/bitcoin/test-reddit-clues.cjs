#!/usr/bin/env node

/**
 * Reddit Thread Analysis - New Clues Testing
 * 
 * From Reddit CryptoPuzzlers thread:
 * - "Stop" word mentioned as potentially relevant
 * - Bill Cipher: "Tuesday" decoded
 * - May be Electrum wallet (not BIP39) - "breathe" valid in Electrum!
 * - Russian runes: "Sum of two numbers", "rainy day number X"
 * 
 * Known from repo: "moon tower food this real subject address total ten black"
 */

const bip39 = require('bip39');
const { BIP32Factory } = require('bip32');
const ecc = require('tiny-secp256k1');
const bitcoin = require('bitcoinjs-lib');
const bip32 = BIP32Factory(ecc);

const TARGET = '1KfZGvwZxsvSmemoCmEV75uqcNzYBHjkHZ';
const KNOWN = 'moon tower food this real subject address total ten black';
const WL = bip39.wordlists.english;

console.log('🔍 Reddit Thread - New Clues Testing\n');
console.log('═══════════════════════════════════════════════════\n');

console.log('📋 New Information from Reddit:\n');
console.log('1. "Stop" mentioned as potentially relevant');
console.log('2. Bill Cipher decoded: "Tuesday"');
console.log('3. ⚠️  CRITICAL: May be Electrum wallet (not BIP39)!');
console.log('   - "Breathe" is valid in Electrum but NOT in BIP39');
console.log('4. Russian rune: "Sum of two numbers"');
console.log('5. Russian rune: "rainy day number X"\n');

// Check new words
const NEW_WORDS = ['stop', 'tuesday', 'sum', 'rainy', 'hope', 'send', 'encrypt'];

console.log('Checking new words in BIP39:\n');
NEW_WORDS.forEach(word => {
  const valid = WL.includes(word);
  console.log(`   ${word.padEnd(12)} ${valid ? '✅' : '❌'}`);
});

const VALID_NEW = NEW_WORDS.filter(w => WL.includes(w));
console.log(`\nValid new words: ${VALID_NEW.join(', ')}\n`);

// Priority test combinations with new words
const PRIORITY_COMBOS = [
  // "Stop" variations
  ['stop', 'black'],
  ['black', 'stop'],
  ['stop', 'this'],
  ['this', 'stop'],
  
  // "Tuesday" if valid
  ['tuesday', 'day'],
  
  // "Sum of two numbers" theme
  ['sum', 'two'],
  ['two', 'number'],
  ['number', 'two'],
  
  // Previous high-value combos to re-test
  ['world', 'order'],
  ['order', 'world'],
  ['hidden', 'control'],
];

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
console.log('🧪 Testing Priority Combinations with New Words');
console.log('═══════════════════════════════════════════════════\n');

let tested = 0;
let validCount = 0;

for (const [w11, w12] of PRIORITY_COMBOS) {
  const m = `${KNOWN} ${w11} ${w12}`;
  tested++;
  
  const valid = bip39.validateMnemonic(m);
  const combo = `${w11} ${w12}`.padEnd(25);
  
  if (valid) {
    validCount++;
    console.log(`✅ ${combo} - Valid BIP39`);
    
    const result = testMnemonic(m);
    if (result.found) {
      console.log('\n🎉🎉🎉 SOLUTION FOUND!!! 🎉🎉🎉\n');
      console.log(`💎 Mnemonic: "${m}"\n`);
      console.log(`🔑 Path: ${result.path}`);
      console.log(`📍 Address: ${result.address}`);
      console.log(`💰 Prize: ~0.2 BTC (~$20,000 USD)\n`);
      process.exit(0);
    }
  } else {
    console.log(`❌ ${combo} - Invalid checksum`);
  }
}

console.log(`\n📊 Results: ${validCount} valid out of ${tested} tested\n`);

console.log('═══════════════════════════════════════════════════');
console.log('⚠️  CRITICAL FINDING: Electrum Wallet Possibility');
console.log('═══════════════════════════════════════════════════\n');

console.log('The Reddit thread suggests this might be an Electrum wallet!\n');
console.log('Key differences:');
console.log('- Electrum uses different wordlist than BIP39');
console.log('- "Breathe" is valid in Electrum but NOT in BIP39');
console.log('- Electrum uses different derivation (m/0\'/0)');
console.log('- This could explain why puzzle unsolved for 4+ years!\n');

console.log('💡 RECOMMENDATION:\n');
console.log('1. Test with Electrum wordlist and derivation');
console.log('2. Re-test all combinations with Electrum compatibility');
console.log('3. "Breathe" appeared multiple times in image - now makes sense!');
console.log('4. May need Electrum-specific tools to solve\n');

console.log('⚠️  This changes the entire approach!');
console.log('   We may have been testing the wrong wallet type all along.\n');
