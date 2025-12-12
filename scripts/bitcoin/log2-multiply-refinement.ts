#!/usr/bin/env node
/**
 * Log2*Multiply Refinement Strategy
 * 
 * Based on previous finding: Log2*Multiply(80.18) produces "train" which is:
 * - 75% checksum match with target "track" (6/8 bits)
 * - Only 4 indices away (1848 vs 1844)
 * - Statistical significance: ~0.00002% by random chance
 * 
 * This script refines the search around 80.18 with higher precision
 * and also tests variations including:
 * - Custom derivation paths
 * - Offset adjustments
 * - Two-stage transformations
 */

import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';

const PUZZLE_NUMBERS = [
  512, 128, 256, 64, 32, 16, 8, 4, 2, 1,
  1024, 2048, 4096, 8192, 16384, 32768,
  65536, 131072, 262144, 524288, 1048576,
  2097152, 4194304, 8388608
];

const TARGET_ADDRESS = 'bc1qkf6trv39epu4n0wfzw4mk58zf5hrvwd442aksk';
const TARGET_LAST_WORD = 'track'; // Index 1844
const NEAR_MISS_WORD = 'train';   // Index 1848 from 80.18

/**
 * Apply Log2*Multiply transformation
 */
function log2MultiplyTransform(multiplier: number): string[] {
  const wordlist = bip39.wordlists.english;
  
  return PUZZLE_NUMBERS.map(num => {
    const exponent = Math.log2(num);
    const index = Math.floor(exponent * multiplier) % 2048;
    return wordlist[index];
  });
}

/**
 * Apply Log2*Multiply with offset adjustment
 */
function log2MultiplyWithOffset(multiplier: number, offset: number): string[] {
  const wordlist = bip39.wordlists.english;
  
  return PUZZLE_NUMBERS.map(num => {
    const exponent = Math.log2(num);
    const index = (Math.floor(exponent * multiplier) + offset) % 2048;
    return wordlist[index < 0 ? index + 2048 : index];
  });
}

/**
 * Test custom derivation paths
 */
async function testCustomPaths(mnemonic: string): Promise<{path: string, address: string}[]> {
  const results: {path: string, address: string}[] = [];
  
  // Standard paths to try
  const paths = [
    "m/84'/0'/0'/0/0",    // Native SegWit (standard)
    "m/84'/0'/0'/0/1",    // Next address
    "m/84'/0'/1'/0/0",    // Account 1
    "m/84'/0'/2'/0/0",    // Account 2
    "m/49'/0'/0'/0/0",    // Nested SegWit
    "m/44'/0'/0'/0/0",    // Legacy
    "m/0/0",              // Simple path
    "m/0'/0'",            // Hardened simple
  ];
  
  try {
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const root = bitcoin.bip32.fromSeed(seed);
    
    for (const path of paths) {
      try {
        const child = root.derivePath(path);
        const { address } = bitcoin.payments.p2wpkh({
          pubkey: child.publicKey,
          network: bitcoin.networks.bitcoin,
        });
        
        if (address) {
          results.push({ path, address });
          
          if (address === TARGET_ADDRESS) {
            console.log(`\n🎉 FOUND! Path: ${path} → ${address}`);
          }
        }
      } catch (e) {
        // Skip invalid paths
      }
    }
  } catch (error) {
    // Invalid mnemonic
  }
  
  return results;
}

/**
 * Fine-grained search around 80.18
 */
async function refineAroundBestMatch() {
  console.log('🔬 Refining search around multiplier 80.18');
  console.log('═'.repeat(70));
  
  const bestResults: Array<{
    multiplier: number;
    lastWord: string;
    lastIndex: number;
    distanceFromTrack: number;
    validBIP39: boolean;
    addresses?: {path: string, address: string}[];
  }> = [];
  
  // Fine-grained search: 80.0 to 80.4 with 0.0001 steps
  for (let mult = 80.0; mult <= 80.4; mult += 0.0001) {
    const words = log2MultiplyTransform(mult);
    const mnemonic = words.join(' ');
    const lastWord = words[23];
    const lastIndex = bip39.wordlists.english.indexOf(lastWord);
    const distance = Math.abs(lastIndex - 1844); // Distance from "track"
    
    const isValid = bip39.validateMnemonic(mnemonic);
    
    // Track results close to "track"
    if (distance <= 10 && isValid) {
      const addresses = await testCustomPaths(mnemonic);
      
      bestResults.push({
        multiplier: mult,
        lastWord,
        lastIndex,
        distanceFromTrack: distance,
        validBIP39: isValid,
        addresses
      });
      
      console.log(`\n✨ Close match at ${mult.toFixed(4)}`);
      console.log(`   Last word: "${lastWord}" (index ${lastIndex})`);
      console.log(`   Distance from "track": ${distance}`);
      console.log(`   Tested ${addresses.length} derivation paths`);
      
      // Check if any address matches
      const match = addresses.find(a => a.address === TARGET_ADDRESS);
      if (match) {
        console.log(`\n🎉🎉🎉 SOLUTION FOUND! 🎉🎉🎉`);
        console.log(`Multiplier: ${mult}`);
        console.log(`Mnemonic: ${mnemonic}`);
        console.log(`Path: ${match.path}`);
        console.log(`Address: ${match.address}`);
        return { multiplier: mult, mnemonic, path: match.path };
      }
    }
  }
  
  console.log(`\n📊 Found ${bestResults.length} close matches (≤10 indices from "track")`);
  return null;
}

/**
 * Test offset variations around 80.18
 */
async function testOffsetVariations() {
  console.log('\n🔧 Testing offset variations around multiplier 80.18');
  console.log('═'.repeat(70));
  
  const baseMultiplier = 80.18;
  
  // Test offsets from -20 to +20
  for (let offset = -20; offset <= 20; offset++) {
    const words = log2MultiplyWithOffset(baseMultiplier, offset);
    const mnemonic = words.join(' ');
    const lastWord = words[23];
    
    if (lastWord === TARGET_LAST_WORD) {
      console.log(`\n✅ Last word match with offset ${offset}!`);
      
      const isValid = bip39.validateMnemonic(mnemonic);
      if (isValid) {
        console.log(`   Valid BIP39!`);
        const addresses = await testCustomPaths(mnemonic);
        
        const match = addresses.find(a => a.address === TARGET_ADDRESS);
        if (match) {
          console.log(`\n🎉 SOLUTION: mult=${baseMultiplier}, offset=${offset}, path=${match.path}`);
          return { multiplier: baseMultiplier, offset, mnemonic, path: match.path };
        }
      }
    }
  }
  
  return null;
}

/**
 * Two-stage transformation: Log2*Multiply then XOR
 */
async function twoStageTransformations() {
  console.log('\n🔀 Testing two-stage transformations');
  console.log('═'.repeat(70));
  
  const wordlist = bip39.wordlists.english;
  const multiplier = 80.18;
  
  // Get indices from Log2*Multiply
  const indices = PUZZLE_NUMBERS.map(num => {
    const exponent = Math.log2(num);
    return Math.floor(exponent * multiplier) % 2048;
  });
  
  // Try XORing indices with various constants
  const xorKeys = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 31, 42, 100];
  
  for (const key of xorKeys) {
    const transformedIndices = indices.map(idx => (idx ^ key) % 2048);
    const words = transformedIndices.map(idx => wordlist[idx]);
    const mnemonic = words.join(' ');
    
    if (words[23] === TARGET_LAST_WORD) {
      console.log(`\n✅ Last word match with XOR key ${key}!`);
      
      const isValid = bip39.validateMnemonic(mnemonic);
      if (isValid) {
        console.log(`   Valid BIP39!`);
        const addresses = await testCustomPaths(mnemonic);
        
        const match = addresses.find(a => a.address === TARGET_ADDRESS);
        if (match) {
          console.log(`\n🎉 SOLUTION: mult=${multiplier}, XOR=${key}, path=${match.path}`);
          return { multiplier, xorKey: key, mnemonic, path: match.path };
        }
      }
    }
  }
  
  return null;
}

/**
 * Main execution
 */
async function main() {
  console.log('🧪 Log2*Multiply Refinement Search');
  console.log('Target: bc1qkf6trv39epu4n0wfzw4mk58zf5hrvwd442aksk');
  console.log('Last word hint: "track" (index 1844)');
  console.log('Known near-miss: "train" (index 1848) at multiplier 80.18\n');
  
  // Strategy 1: Fine-grained refinement
  let solution = await refineAroundBestMatch();
  if (solution) return solution;
  
  // Strategy 2: Offset variations
  solution = await testOffsetVariations();
  if (solution) return solution;
  
  // Strategy 3: Two-stage transformations
  solution = await twoStageTransformations();
  if (solution) return solution;
  
  console.log('\n⏸️  No solution found in refined search');
  console.log('💡 Next: Consider completely different transformation families');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(solution => {
      if (solution) {
        console.log('\n✅ Puzzle solved!');
        process.exit(0);
      } else {
        console.log('\n⏸️  Continue searching...');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n❌ Error:', error);
      process.exit(1);
    });
}

export { log2MultiplyTransform, log2MultiplyWithOffset, testCustomPaths };
