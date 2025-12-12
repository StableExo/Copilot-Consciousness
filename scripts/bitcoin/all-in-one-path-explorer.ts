/**
 * ALL-IN-ONE BIP39 Path Explorer
 * 
 * This script replicates Ian Coleman's BIP39 tool functionality
 * Tests the "train" mnemonic with every possible derivation path variation
 * 
 * SECURITY: Terminal output only, no file writes
 */

import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';

const bip32 = BIP32Factory(ecc);

const MNEMONIC = 'focus economy expand destroy craft chimney bulk beef anxiety abandon goddess hotel joke liquid middle north park price refuse salmon silent sponsor symbol train';
const TARGET_ADDRESS = 'bc1qkf6trv39epu4n0wfzw4mk58zf5hrvwd442aksk';

console.log('🔍 ALL-IN-ONE BIP39 PATH EXPLORER');
console.log('   (Autonomous exploration like Ian Coleman tool)');
console.log('='.repeat(70));
console.log('');
console.log('Mnemonic: ...symbol train');
console.log('Target:', TARGET_ADDRESS);
console.log('');

// Test with and without passphrase
const passphrases = ['', '130', 'pi', 'track', '80.18', '3.14159'];
const network = bitcoin.networks.bitcoin;

let totalTested = 0;
let found = false;

for (const passphrase of passphrases) {
  if (found) break;
  
  const passphraseLabel = passphrase === '' ? '(none)' : `"${passphrase}"`;
  console.log(`Testing with passphrase: ${passphraseLabel}`);
  console.log('-'.repeat(70));
  
  const seed = bip39.mnemonicToSeedSync(MNEMONIC, passphrase);
  const root = bip32.fromSeed(seed, network);
  
  // Test different BIP standards and custom paths
  const pathConfigs = [
    // Standard BIP84 (Native SegWit - bc1)
    { purpose: 84, name: 'BIP84 (Native SegWit)', accounts: [0, 130, 23, 1844, 1848, 80] },
    // Standard BIP49 (SegWit - 3...)
    { purpose: 49, name: 'BIP49 (SegWit)', accounts: [0, 130] },
    // Standard BIP44 (Legacy - 1...)
    { purpose: 44, name: 'BIP44 (Legacy)', accounts: [0, 130] },
  ];
  
  for (const config of pathConfigs) {
    if (found) break;
    
    console.log(`  ${config.name}:`);
    
    for (const account of config.accounts) {
      if (found) break;
      
      // Test receive and change addresses
      for (let change = 0; change <= 1; change++) {
        if (found) break;
        
        // Test first 100 addresses for each change type
        for (let index = 0; index < 100; index++) {
          const path = `m/${config.purpose}'/0'/${account}'/${change}/${index}`;
          
          try {
            const child = root.derivePath(path);
            if (child.publicKey) {
              // Get address based on purpose
              let address;
              if (config.purpose === 84) {
                // Native SegWit (bc1)
                const payment = bitcoin.payments.p2wpkh({
                  pubkey: child.publicKey,
                  network
                });
                address = payment.address;
              } else if (config.purpose === 49) {
                // SegWit (3...)
                const payment = bitcoin.payments.p2sh({
                  redeem: bitcoin.payments.p2wpkh({
                    pubkey: child.publicKey,
                    network
                  }),
                  network
                });
                address = payment.address;
              } else {
                // Legacy (1...)
                const payment = bitcoin.payments.p2pkh({
                  pubkey: child.publicKey,
                  network
                });
                address = payment.address;
              }
              
              totalTested++;
              
              // Show first few addresses for each account
              if (index < 3 && change === 0) {
                console.log(`    m/${config.purpose}'/0'/${account}'/0/${index}: ${address?.substring(0, 25)}...`);
              }
              
              if (address === TARGET_ADDRESS) {
                console.log('');
                console.log('='.repeat(70));
                console.log('🎉🎉🎉 PUZZLE SOLVED!!! 🎉🎉🎉');
                console.log('='.repeat(70));
                console.log('');
                console.log(`✅ WINNING COMBINATION:`);
                console.log(`   Mnemonic: ${MNEMONIC}`);
                console.log(`   Passphrase: ${passphraseLabel}`);
                console.log(`   Derivation Path: ${path}`);
                console.log(`   Address: ${address}`);
                console.log('');
                console.log('💰 Reward: 0.08252025 BTC (~$5,500)');
                console.log('');
                console.log('='.repeat(70));
                found = true;
                break;
              }
            }
          } catch (e) {
            // Skip invalid paths
          }
        }
      }
      
      if (account === 0 || account === 130) {
        const accountLabel = account === 0 ? 'standard' : `custom (${account})`;
        console.log(`    → Tested ${accountLabel} account (200 addresses)`);
      }
    }
  }
  
  console.log('');
}

console.log('='.repeat(70));
console.log(`Total paths tested: ${totalTested}`);
console.log('');

if (!found) {
  console.log('❌ Target address not found');
  console.log('');
  console.log('📊 Testing Summary:');
  console.log(`   Passphrases tested: ${passphrases.length}`);
  console.log('   BIP standards: BIP84, BIP49, BIP44');
  console.log('   Accounts tested: 0, 130, 23, 1844, 1848, 80');
  console.log('   Addresses per account: 200 (100 receive + 100 change)');
  console.log('');
  console.log('💡 Recommendations:');
  console.log('   1. Test higher address indices (beyond 100)');
  console.log('   2. Try other passphrases');
  console.log('   3. Test non-standard coin types');
  console.log('   4. Consider the puzzle may require additional transformation');
  console.log('');
  console.log('🔒 The mnemonic is CORRECT (user confirmed in Blue Wallet)');
  console.log('   The derivation path is the final missing piece.');
}

console.log('='.repeat(70));
process.exit(found ? 0 : 1);
