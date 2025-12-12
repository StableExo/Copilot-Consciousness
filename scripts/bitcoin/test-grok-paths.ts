/**
 * Test specific non-standard paths suggested by Grok
 * Including magic constant 130, track index 1844, train index 1848
 */

import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';

const bip32 = BIP32Factory(ecc);

const MNEMONIC = 'focus economy expand destroy craft chimney bulk beef anxiety abandon goddess hotel joke liquid middle north park price refuse salmon silent sponsor symbol train';
const TARGET_ADDRESS = 'bc1qkf6trv39epu4n0wfzw4mk58zf5hrvwd442aksk';

console.log('🔍 Testing Grok\'s Suggested Non-Standard Paths');
console.log('='.repeat(70));
console.log('');

const seed = bip39.mnemonicToSeedSync(MNEMONIC);
const network = bitcoin.networks.bitcoin;
const root = bip32.fromSeed(seed, network);

let found = false;

// Grok's specific suggestions
const specialPaths = [
  // Magic constant 130
  "m/84'/0'/130'/0/0",
  "m/84'/130'/0'/0/0",
  "m/84'/0'/0'/130/0",
  "m/84'/0'/0'/0/130",
  
  // Track index 1844
  "m/84'/0'/0'/0/1844",
  "m/84'/0'/1844'/0/0",
  "m/84'/1844'/0'/0/0",
  "m/84'/0'/0'/1844/0",
  
  // Train index 1848
  "m/84'/0'/0'/0/1848",
  "m/84'/0'/1848'/0/0",
  "m/84'/1848'/0'/0/0",
  "m/84'/0'/0'/1848/0",
  
  // Power of 2: 23 (from 2^23)
  "m/84'/0'/0'/0/23",
  "m/84'/0'/23'/0/0",
  "m/84'/23'/0'/0/0",
  
  // Multiplier components
  "m/84'/0'/0'/0/80",
  "m/84'/0'/0'/0/18",
  "m/84'/0'/0'/0/8018",
  
  // Pi-related (3, 314, 31415)
  "m/84'/0'/0'/0/3",
  "m/84'/0'/0'/0/314",
  "m/84'/0'/0'/0/31415",
  "m/84'/0'/3'/0/0",
  
  // Combinations
  "m/84'/0'/130'/0/1844",
  "m/84'/0'/130'/0/1848",
  "m/84'/130'/0'/0/1844",
  "m/84'/130'/0'/0/1848",
  
  // BIP49/44 variants with magic numbers
  "m/49'/0'/130'/0/0",
  "m/44'/0'/130'/0/0",
  "m/49'/0'/0'/0/1844",
  "m/44'/0'/0'/0/1844",
  "m/49'/0'/0'/0/1848",
  "m/44'/0'/0'/0/1848",
];

console.log('Testing', specialPaths.length, 'Grok-suggested paths...');
console.log('');

for (const path of specialPaths) {
  try {
    const child = root.derivePath(path);
    if (child.publicKey) {
      const { address } = bitcoin.payments.p2wpkh({
        pubkey: child.publicKey,
        network
      });
      
      const match = address === TARGET_ADDRESS;
      console.log(`${match ? '🎉 ' : '   '}${path}: ${address.substring(0, 20)}...`);
      
      if (match) {
        console.log('');
        console.log('='.repeat(70));
        console.log('🎉🎉🎉 SOLUTION FOUND! 🎉🎉🎉');
        console.log('='.repeat(70));
        console.log('');
        console.log(`✅ Custom Derivation Path: ${path}`);
        console.log(`✅ Address: ${address}`);
        console.log('💰 Reward: 0.08252025 BTC (~$5,500)');
        console.log('');
        console.log('🔒 SOLUTION:');
        console.log('   Mnemonic: ' + MNEMONIC);
        console.log('   Path: ' + path);
        console.log('');
        console.log('='.repeat(70));
        found = true;
        break;
      }
    }
  } catch (e) {
    console.log(`   ${path}: Invalid path`);
  }
}

console.log('');
console.log('='.repeat(70));

if (found) {
  console.log('✅ Solution found with custom derivation path!');
} else {
  console.log('❌ No match found in Grok\'s suggested paths');
  console.log('');
  console.log('Next steps:');
  console.log('  - Try even higher indices (10000+)');
  console.log('  - Test with passphrases AND custom paths combined');
  console.log('  - Video analysis for more hints');
}

console.log('='.repeat(70));
process.exit(found ? 0 : 1);
