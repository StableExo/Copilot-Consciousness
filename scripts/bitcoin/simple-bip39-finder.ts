/**
 * Simple BIP39 Valid Finder
 * 
 * Based on the 75% checksum match from Log2*Multiply with 80.18,
 * we systematically find all valid BIP39 mnemonics and test them
 */

import * as bip39 from 'bip39';

const PUZZLE_NUMBERS = [
  512, 128, 256, 64, 32, 16, 8, 4, 2, 1,
  1024, 2048, 4096, 8192, 16384, 32768,
  65536, 131072, 262144, 524288, 1048576,
  2097152, 4194304, 8388608
];

const TARGET_ADDRESS = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';

/**
 * Generate base words from Log2*Multiply transformation
 */
function getBaseWords(): string[] {
  const multiplier = 80.18;
  const wordlist = bip39.wordlists.english;
  return PUZZLE_NUMBERS.map(num => {
    const log2Val = Math.log2(num);
    const index = Math.floor(log2Val * multiplier) % wordlist.length;
    return wordlist[index];
  });
}

/**
 * Find all valid BIP39 mnemonics by testing all last words
 */
async function findValidMnemonics() {
  console.log('🔍 Finding Valid BIP39 Mnemonics from Base Transformation');
  console.log('=========================================================\n');
  
  const baseWords = getBaseWords();
  const wordlist = bip39.wordlists.english;
  
  console.log('Base transformation (first 23 words):');
  console.log(baseWords.slice(0, 23).join(' '));
  console.log('\nTesting all 2048 possible last words...\n');
  
  const validMnemonics: { lastWord: string; mnemonic: string; index: number }[] = [];
  
  for (let i = 0; i < wordlist.length; i++) {
    const lastWord = wordlist[i];
    const testWords = [...baseWords.slice(0, 23), lastWord];
    const mnemonic = testWords.join(' ');
    
    if (bip39.validateMnemonic(mnemonic)) {
      validMnemonics.push({ lastWord, mnemonic, index: i });
      console.log(`✅ Valid #${validMnemonics.length}: "${lastWord}" (index ${i})`);
    }
    
    if ((i + 1) % 256 === 0) {
      console.log(`   Progress: ${i + 1}/2048...`);
    }
  }
  
  console.log(`\n📊 Summary: Found ${validMnemonics.length} valid BIP39 mnemonics\n`);
  
  if (validMnemonics.length > 0) {
    console.log('All valid last words:');
    validMnemonics.forEach(v => {
      console.log(`   - "${v.lastWord}" (index ${v.index})`);
    });
    
    // Check if "track" is among them
    const trackMnemonic = validMnemonics.find(v => v.lastWord === 'track');
    if (trackMnemonic) {
      console.log('\n🎯 "track" IS among the valid mnemonics!');
      console.log('Full mnemonic:');
      console.log(trackMnemonic.mnemonic);
      console.log('\n💡 Next: Derive address and check against target');
    } else {
      console.log('\n⚠️  "track" is NOT among the valid mnemonics');
      console.log('Closest valid word to "track" (alphabetically):');
      const sorted = validMnemonics.map(v => v.lastWord).sort();
      const trackIndex = sorted.findIndex(w => w > 'track');
      if (trackIndex > 0) {
        console.log(`   Before: "${sorted[trackIndex - 1]}"`);
      }
      console.log(`   After:  "${sorted[trackIndex]}"`);
    }
  } else {
    console.log('❌ No valid BIP39 mnemonics found with this base transformation');
  }
  
  return validMnemonics;
}

/**
 * Test variations of multiplier to find one that produces valid BIP39 with "track"
 */
async function findMultiplierForTrack() {
  console.log('\n🔬 Finding Multiplier That Produces Valid BIP39 with "track"');
  console.log('==============================================================\n');
  
  const wordlist = bip39.wordlists.english;
  const trackIndex = wordlist.indexOf('track');
  
  // We need log2(8388608) * multiplier to land on an index that makes valid BIP39
  // log2(8388608) = 23
  // So: 23 * multiplier ≈ targetIndex (mod 2048)
  
  // From the last word, we can derive which indices would be valid
  // Then work backwards to find required multiplier
  
  console.log('Testing multipliers in range 79.0 to 81.0...\n');
  
  for (let mult = 79.0; mult <= 81.0; mult += 0.001) {
    const words = PUZZLE_NUMBERS.map(num => {
      const log2Val = Math.log2(num);
      const index = Math.floor(log2Val * mult) % wordlist.length;
      return wordlist[index];
    });
    
    const lastWord = words[words.length - 1];
    const mnemonic = words.join(' ');
    
    if (lastWord === 'track' && bip39.validateMnemonic(mnemonic)) {
      console.log('\n🎉 FOUND IT!');
      console.log('Multiplier:', mult);
      console.log('Mnemonic:', mnemonic);
      console.log('\n💡 Next: Derive address and check if it matches target');
      return { found: true, multiplier: mult, mnemonic };
    }
    
    if (Math.abs(mult - Math.floor(mult)) < 0.0001) {
      console.log(`   Tested up to ${mult.toFixed(1)}...`);
    }
  }
  
  console.log('\n❌ No multiplier found in range 79.0-81.0 that produces valid BIP39 with "track"');
  return { found: false };
}

/**
 * Main function
 */
async function main() {
  console.log('🎯 BIP39 Valid Mnemonic Finder');
  console.log('==============================\n');
  
  // First, find all valid mnemonics with base transformation
  const validMnemonics = await findValidMnemonics();
  
  // Then, search for multiplier that gives us "track"
  const result = await findMultiplierForTrack();
  
  if (!result.found) {
    console.log('\n💡 Strategy pivot needed:');
    console.log('1. Try different base transformations (Division, XOR, Subtraction)');
    console.log('2. Test two-step: transform first 23, find valid last word');
    console.log('3. Analyze YouTube video for exact formula');
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { getBaseWords, findValidMnemonics, findMultiplierForTrack };
