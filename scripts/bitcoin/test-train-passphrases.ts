/**
 * Test "train" mnemonic with BIP39 passphrases
 * Based on Grok's suggestion: "pi", "130", etc.
 */

import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';

const bip32 = BIP32Factory(ecc);

const MNEMONIC = 'focus economy expand destroy craft chimney bulk beef anxiety abandon goddess hotel joke liquid middle north park price refuse salmon silent sponsor symbol train';
const TARGET_ADDRESS = 'bc1qkf6trv39epu4n0wfzw4mk58zf5hrvwd442aksk';

console.log('🔍 Testing "train" Mnemonic with Passphrases');
console.log('='.repeat(70));
console.log('');

const passphrases = [
  '', // No passphrase (default)
  'pi',
  '130',
  'track',
  '80.18',
  '8018',
  '1844',
  '1848',
  'train',
  '3.14159',
  'π',
  'magic',
  '23',
  'puzzle',
  'bitcoin',
  '2048',
  'focus',
  'symbol',
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
];

let found = false;

for (const passphrase of passphrases) {
  try {
    const seed = bip39.mnemonicToSeedSync(MNEMONIC, passphrase);
    const network = bitcoin.networks.bitcoin;
    const root = bip32.fromSeed(seed, network);
    
    // Test standard paths for this passphrase
    const paths = [
      "m/84'/0'/0'/0/0",
      "m/84'/0'/0'/0/1",
      "m/49'/0'/0'/0/0",
      "m/44'/0'/0'/0/0",
    ];
    
    for (const path of paths) {
      const child = root.derivePath(path);
      if (child.publicKey) {
        const { address } = bitcoin.payments.p2wpkh({
          pubkey: child.publicKey,
          network
        });
        
        if (address === TARGET_ADDRESS) {
          console.log('');
          console.log('🎉🎉🎉 SOLUTION FOUND! 🎉🎉🎉');
          console.log('='.repeat(70));
          console.log('');
          console.log(`✅ Passphrase: "${passphrase}"`);
          console.log(`✅ Derivation Path: ${path}`);
          console.log(`✅ Address: ${address}`);
          console.log('💰 Reward: 0.08252025 BTC');
          console.log('');
          console.log('🔒 SOLUTION:');
          console.log('   Mnemonic: ' + MNEMONIC);
          console.log(`   Passphrase: "${passphrase}"`);
          console.log(`   Path: ${path}`);
          console.log('');
          console.log('='.repeat(70));
          found = true;
          break;
        }
      }
    }
    
    if (found) break;
    
  } catch (e) {
    // Skip invalid passphrases
  }
}

if (!found) {
  console.log('❌ No match found with tested passphrases');
  console.log('');
  console.log('Tested passphrases:', passphrases.length);
  console.log('Including: pi, 130, track, 80.18, and others');
}

console.log('='.repeat(70));
process.exit(found ? 0 : 1);
