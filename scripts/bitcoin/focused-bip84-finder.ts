#!/usr/bin/env node
/**
 * Focused BIP84 Path Finder (Bech32 Native SegWit)
 * 
 * Since we know the address is Bech32 (bc1q...), we can focus exclusively on BIP84 paths.
 * This dramatically speeds up exploration by skipping BIP44 and BIP49.
 * 
 * Target: bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh (Bech32 P2WPKH)
 * Mnemonic: focus economy expand destroy craft chimney bulk beef anxiety abandon goddess hotel 
 *           joke liquid middle north park price refuse salmon silent sponsor symbol train
 * 
 * BIP84 Format: m/84'/0'/account'/change/index
 * 
 * Strategy:
 * - Test BIP84 paths ONLY (3x faster than testing all BIP standards)
 * - Extended index ranges (0-10000 per account)
 * - Multiple passphrases
 * - Various account numbers
 * - Continue until found
 */

import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';

const bip32 = BIP32Factory(ecc);

const MNEMONIC = 'focus economy expand destroy craft chimney bulk beef anxiety abandon goddess hotel joke liquid middle north park price refuse salmon silent sponsor symbol train';
const TARGET_ADDRESS = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';

console.log('═'.repeat(80));
console.log('  🎯 FOCUSED BIP84 PATH FINDER (Bech32 Native SegWit)');
console.log('═'.repeat(80));
console.log(`  Target: ${TARGET_ADDRESS}`);
console.log(`  Type: Bech32 (P2WPKH) - BIP84 Standard`);
console.log('═'.repeat(80));
console.log();

const network = bitcoin.networks.bitcoin;
let totalTested = 0;
const startTime = Date.now();

// Passphrases to test
const passphrases = [
  '',           // No passphrase (most common)
  '130',        // Puzzle number
  'train',      // Last word
  'focus',      // First word  
  'pi',         
  '3.14159',
  '80',
  '80.18',
  'track',
  '23',         // Word count
  'symbol',     // Second-to-last word
];

// Account numbers to test (expanded range)
const accounts = [
  0, 1, 2, 3, 4, 5,      // Standard accounts
  130,                    // Puzzle number
  23,                     // Word count
  80, 18,                 // Hints
  721,                    // First word BIP39 index
  1848,                   // Last word BIP39 index
  100, 200, 300,          // Round numbers
  1844,                   // Near last word index
];

// Max index to test per account (extended for thorough search)
const MAX_INDEX = 10000;

for (const passphrase of passphrases) {
  const pp = passphrase === '' ? '(none)' : `"${passphrase}"`;
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`Testing passphrase: ${pp}`);
  console.log(`${'─'.repeat(80)}\n`);
  
  const seed = bip39.mnemonicToSeedSync(MNEMONIC, passphrase);
  const root = bip32.fromSeed(seed, network);
  
  for (const account of accounts) {
    console.log(`  Account ${account}:`);
    
    // Test both external (0) and internal/change (1) chains
    for (let change = 0; change <= 1; change++) {
      const chainType = change === 0 ? 'external' : 'change';
      
      for (let index = 0; index < MAX_INDEX; index++) {
        const path = `m/84'/0'/${account}'/${change}/${index}`;
        
        try {
          const child = root.derivePath(path);
          const payment = bitcoin.payments.p2wpkh({
            pubkey: child.publicKey,
            network
          });
          
          const address = payment.address;
          totalTested++;
          
          // Progress indicator every 1000 paths
          if (totalTested % 1000 === 0) {
            const elapsed = (Date.now() - startTime) / 1000;
            const rate = Math.floor(totalTested / elapsed);
            process.stdout.write(`\r    Progress: ${totalTested.toLocaleString()} paths | ${rate}/sec | ${path}`);
          }
          
          // Check for match
          if (address === TARGET_ADDRESS) {
            console.log('\n');
            console.log('═'.repeat(80));
            console.log('  🎉🎉🎉 PATHWAY FOUND!!! 🎉🎉🎉');
            console.log('═'.repeat(80));
            console.log();
            console.log(`  ✅ Mnemonic: ${MNEMONIC}`);
            console.log(`  ✅ Passphrase: ${pp}`);
            console.log(`  ✅ Derivation Path: ${path}`);
            console.log(`  ✅ Account: ${account}`);
            console.log(`  ✅ Chain: ${chainType}`);
            console.log(`  ✅ Index: ${index}`);
            console.log(`  ✅ Address: ${address}`);
            console.log();
            console.log(`  📊 Total Paths Tested: ${totalTested.toLocaleString()}`);
            console.log(`  ⏱️  Time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
            console.log();
            console.log('═'.repeat(80));
            process.exit(0);
          }
          
        } catch (error) {
          // Skip invalid paths
        }
      }
      
      console.log(); // New line after progress
    }
    
    console.log(`    ✓ Tested account ${account} (${MAX_INDEX * 2} addresses)\n`);
  }
}

console.log('\n');
console.log('═'.repeat(80));
console.log('  ❌ PATHWAY NOT FOUND');
console.log('═'.repeat(80));
console.log(`  Total Paths Tested: ${totalTested.toLocaleString()}`);
console.log(`  Time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
console.log();
console.log('  💡 Next Steps:');
console.log('     - Extend index range beyond 10,000');
console.log('     - Try additional passphrases');
console.log('     - Test more account numbers');
console.log('═'.repeat(80));
