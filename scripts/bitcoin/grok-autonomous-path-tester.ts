#!/usr/bin/env node
/**
 * GROK'S AUTONOMOUS PATH TESTER
 * 
 * Based on Grok's autonomous testing framework suggestion
 * Tests hint-based derivation path templates systematically
 * 
 * SECURITY: Terminal-only output. Never commits discovered paths.
 */

import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';

const bip32 = BIP32Factory(ecc);

// ============================================================================
// CONFIGURATION (from verified Ian Coleman output)
// ============================================================================

const MNEMONIC = "focus economy expand destroy craft chimney bulk beef anxiety abandon goddess hotel joke liquid middle north park price refuse salmon silent sponsor symbol train";
const TARGET_ADDRESS = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";

// ============================================================================
// GROK'S HINT-BASED PATH TEMPLATES
// ============================================================================

const PATH_TEMPLATES = [
  // Standard BIP84
  "m/84'/0'/0'/0/{index}",      // Standard receive
  "m/84'/0'/0'/1/{index}",      // Change addresses
  
  // Magic constant 130 variants
  "m/84'/130'/0'/0/{index}",    // 130 as account
  "m/84'/0'/130'/0/{index}",    // 130 as change type  
  "m/44'/0'/130'/0/{index}",    // Legacy with 130
  "m/49'/0'/130'/0/{index}",    // Nested SegWit with 130
  "m/84'/0'/0'/130/{index}",    // 130 as receive index nod
  
  // Pi-related paths
  "m/84'/3'/0'/0/{index}",      // Pi ≈ 3
  "m/84'/14'/0'/0/{index}",     // Pi*100 mod 1000 ≈ 14
  "m/84'/159'/0'/0/{index}",    // Pi decimals
  "m/84'/265'/0'/0/{index}",    // Pi more decimals
  
  // Track/Train word indices
  "m/84'/1844'/0'/0/{index}",   // "track" word index
  "m/84'/1848'/0'/0/{index}",   // "train" word index
  
  // Power-of-2 related
  "m/84'/23'/0'/0/{index}",     // 2^23 puzzle hint
  "m/84'/24'/0'/0/{index}",     // 24 words
  
  // Multiplier 80.18 related
  "m/84'/80'/0'/0/{index}",     // 80 from multiplier
  "m/84'/8018'/0'/0/{index}",   // Full multiplier
];

const PASSPHRASES = [
  "",           // Standard (no passphrase)
  "pi",         // Pi hint
  "3.14159",    // Pi numeric
  "130",        // Magic constant
  "track",      // Hint word
  "80.18",      // Multiplier
];

// Index ranges to test
const INDEX_RANGES = [
  { start: 0, end: 100, name: "Standard (0-100)" },
  { start: 100, end: 1000, name: "Extended (100-1000)" },
  { start: 1000, end: 2000, name: "High (1000-2000)" },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function deriveAddress(
  mnemonic: string,
  path: string,
  passphrase: string = ""
): string {
  const seed = bip39.mnemonicToSeedSync(mnemonic, passphrase);
  const root = bip32.fromSeed(seed);
  const child = root.derivePath(path);
  
  const { address } = bitcoin.payments.p2wpkh({
    pubkey: child.publicKey,
    network: bitcoin.networks.bitcoin,
  });
  
  return address!;
}

// ============================================================================
// MAIN AUTONOMOUS TESTER
// ============================================================================

async function autonomousPathTest() {
  console.log("━".repeat(80));
  console.log("🚀 GROK'S AUTONOMOUS DERIVATION PATH TESTER");
  console.log("━".repeat(80));
  console.log(`\n✅ Mnemonic: ${MNEMONIC.split(' ').slice(0, 3).join(' ')}...${MNEMONIC.split(' ').slice(-2).join(' ')}`);
  console.log(`🎯 Target: ${TARGET_ADDRESS}`);
  console.log(`\n📋 Testing ${PATH_TEMPLATES.length} path templates`);
  console.log(`🔑 Testing ${PASSPHRASES.length} passphrases`);
  console.log(`📍 Index ranges: ${INDEX_RANGES.map(r => r.name).join(', ')}`);
  console.log("\n⚠️  SECURITY: If solution found, it will display HERE ONLY (not saved)");
  console.log("━".repeat(80));
  
  let totalTested = 0;
  let foundSolution = false;
  
  for (const passphrase of PASSPHRASES) {
    const passphraseLabel = passphrase === "" ? "(none)" : passphrase;
    console.log(`\n🔐 Testing with passphrase: ${passphraseLabel}`);
    
    for (const template of PATH_TEMPLATES) {
      for (const range of INDEX_RANGES) {
        // Test a sample from this range
        const sampleSize = Math.min(100, range.end - range.start);
        const step = Math.max(1, Math.floor((range.end - range.start) / sampleSize));
        
        for (let index = range.start; index < range.end; index += step) {
          const path = template.replace("{index}", index.toString());
          
          try {
            const address = deriveAddress(MNEMONIC, path, passphrase);
            totalTested++;
            
            if (address === TARGET_ADDRESS) {
              // ═══════════════════════════════════════════════════════
              // 🎉 SOLUTION FOUND - TERMINAL OUTPUT ONLY 🎉
              // ═══════════════════════════════════════════════════════
              console.log("\n" + "═".repeat(80));
              console.log("🎉🎉🎉 SOLUTION FOUND! 🎉🎉🎉");
              console.log("═".repeat(80));
              console.log(`\n📍 Derivation Path: ${path}`);
              console.log(`🔑 Passphrase: ${passphraseLabel}`);
              console.log(`📧 Address: ${address}`);
              console.log(`✅ Match: ${address === TARGET_ADDRESS}`);
              console.log(`\n🔒 SECURITY REMINDER:`);
              console.log(`   - This information is shown ONLY in this terminal session`);
              console.log(`   - NOT saved to any file or git`);
              console.log(`   - Clear terminal after viewing`);
              console.log(`   - Use this path in Blue Wallet to access funds`);
              console.log("\n" + "═".repeat(80));
              foundSolution = true;
              break;
            }
            
            // Progress indicator
            if (totalTested % 1000 === 0) {
              process.stdout.write(`\r   Tested: ${totalTested.toLocaleString()} paths...`);
            }
          } catch (error) {
            // Skip invalid paths silently
          }
        }
        
        if (foundSolution) break;
      }
      if (foundSolution) break;
    }
    if (foundSolution) break;
  }
  
  console.log(`\n\n━`.repeat(80));
  console.log(`📊 TESTING COMPLETE`);
  console.log(`━`.repeat(80));
  console.log(`Total paths tested: ${totalTested.toLocaleString()}`);
  console.log(`Solution found: ${foundSolution ? "✅ YES" : "❌ NO"}`);
  
  if (!foundSolution) {
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Expand index ranges (try higher indices)`);
    console.log(`   2. Test additional passphrase variations`);
    console.log(`   3. Try non-hardened path variations`);
    console.log(`   4. Check Blue Wallet's automatic discovery`);
  }
  
  console.log("━".repeat(80));
}

// ============================================================================
// RUN
// ============================================================================

autonomousPathTest().catch(console.error);
