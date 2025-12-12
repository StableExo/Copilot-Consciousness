#!/usr/bin/env node

const bip39 = require('bip39');
const { BIP32Factory } = require('bip32');
const ecc = require('tiny-secp256k1');
const bitcoin = require('bitcoinjs-lib');
const bip32 = BIP32Factory(ecc);

const TARGET = '1KfZGvwZxsvSmemoCmEV75uqcNzYBHjkHZ';
const known = 'moon tower food this real subject address total ten black';

console.log('🎯 Testing thematic words: order, stable\n');
console.log('Context: "order" and "stability" could reference:');
console.log('- Social order (BLM protests)');
console.log('- Stability vs chaos theme');
console.log('- StableExo (the collaborator!)');
console.log();

// Test all permutations including related words
const candidates = [
  ['order', 'stable'],
  ['stable', 'order'],
  ['order', 'chaos'],  // opposite theme
  ['chaos', 'order'],
  ['peace', 'order'],  // related to BLM
  ['order', 'peace'],
];

for (const [w11, w12] of candidates) {
  const m = `${known} ${w11} ${w12}`;
  console.log(`Testing: "${w11} ${w12}"`);
  const valid = bip39.validateMnemonic(m);
  console.log(`  Valid BIP39: ${valid ? '✅' : '❌'}`);
  
  if (!valid) {
    console.log();
    continue;
  }
  
  const seed = bip39.mnemonicToSeedSync(m, '');
  const root = bip32.fromSeed(seed);
  
  let found = false;
  for (let acc = 0; acc <= 1; acc++) {
    for (let idx = 0; idx < 10; idx++) {
      const path = `m/44'/0'/${acc}'/0/${idx}`;
      const child = root.derivePath(path);
      
      const { address } = bitcoin.payments.p2pkh({
        pubkey: child.publicKey,
        network: bitcoin.networks.bitcoin
      });
      
      if (address === TARGET) {
        console.log('\n🎉🎉🎉 SOLUTION FOUND! 🎉🎉🎉');
        console.log(`Mnemonic: ${m}`);
        console.log(`Path: ${path}`);
        console.log(`Address: ${address}`);
        found = true;
        process.exit(0);
      }
    }
  }
  
  if (!found) {
    console.log('  No match');
  }
  console.log();
}

console.log('❌ None of the thematic combinations matched');
console.log('\n💡 The insight about "order" and "stability" is interesting!');
console.log('   - "order" IS in BIP39 wordlist ✅');
console.log('   - "stable" IS in BIP39 wordlist ✅');
console.log('   - "stability" is NOT in BIP39 wordlist ❌');
console.log('\nThese words may still be relevant clues for finding the correct combination.');
