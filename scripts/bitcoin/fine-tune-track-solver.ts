/**
 * Fine-Tune Track Solver
 * 
 * The Log2*Multiply transformation achieves 75% checksum closeness with multiplier 80.18
 * This script fine-tunes around that value and tests checksum-correction strategies
 * 
 * Expected checksum: 00111000
 * Actual checksum:   00110100
 * Bit differences: positions 3 and 6 (0-indexed)
 * 
 * Strategy:
 * 1. Fine-tune multiplier with smaller increments
 * 2. Adjust individual words to flip specific checksum bits
 * 3. Try two-step: transform then adjust last word for checksum
 */

import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import * as crypto from 'crypto';

const PUZZLE_NUMBERS = [
  512, 128, 256, 64, 32, 16, 8, 4, 2, 1,
  1024, 2048, 4096, 8192, 16384, 32768,
  65536, 131072, 262144, 524288, 1048576,
  2097152, 4194304, 8388608
];

const TARGET_ADDRESS = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
const LAST_WORD_HINT = 'track';

/**
 * Get detailed checksum analysis
 */
function analyzeChecksum(words: string[]) {
  const wordlist = bip39.wordlists.english;
  const indices = words.map(w => wordlist.indexOf(w));
  
  // Convert to bits
  let bits = '';
  indices.forEach(index => {
    bits += index.toString(2).padStart(11, '0');
  });
  
  const entropyBits = bits.substring(0, 256);
  const checksumBitsFromWords = bits.substring(256);
  
  // Calculate expected checksum
  const entropyBytes = Buffer.from(entropyBits.match(/.{1,8}/g)!.map(b => parseInt(b, 2)));
  const hash = crypto.createHash('sha256').update(entropyBytes).digest();
  const expectedChecksumBits = hash[0].toString(2).padStart(8, '0');
  
  // Find which bits differ
  const differingBits: number[] = [];
  for (let i = 0; i < 8; i++) {
    if (expectedChecksumBits[i] !== checksumBitsFromWords[i]) {
      differingBits.push(i);
    }
  }
  
  return {
    expected: expectedChecksumBits,
    actual: checksumBitsFromWords,
    differingBits,
    matchCount: 8 - differingBits.length
  };
}

/**
 * Generate words from Log2*Multiply transformation
 */
function log2MultiplyTransform(multiplier: number): string[] {
  const wordlist = bip39.wordlists.english;
  return PUZZLE_NUMBERS.map(num => {
    const log2Val = Math.log2(num);
    const index = Math.floor(log2Val * multiplier) % wordlist.length;
    return wordlist[index];
  });
}

/**
 * Fine-tune multiplier with micro adjustments
 */
async function fineTuneMultiplier() {
  console.log('🔬 Fine-Tuning Log2*Multiply Multiplier');
  console.log('========================================\n');
  
  const baseMultiplier = 80.18;
  const wordlist = bip39.wordlists.english;
  
  // Test very fine increments
  const increments = [
    0,
    0.0001, -0.0001,
    0.0002, -0.0002,
    0.0005, -0.0005,
    0.001, -0.001,
    0.002, -0.002,
    0.005, -0.005,
    0.01, -0.01,
    0.02, -0.02,
    0.05, -0.05,
    0.1, -0.1,
    0.2, -0.2,
    0.5, -0.5
  ];
  
  let bestMatch = { multiplier: 0, closeness: 0, words: [] as string[], analysis: null as any };
  
  for (const increment of increments) {
    const multiplier = baseMultiplier + increment;
    const words = log2MultiplyTransform(multiplier);
    const lastWord = words[words.length - 1];
    
    if (lastWord !== LAST_WORD_HINT) {
      continue; // Skip if doesn't produce "track"
    }
    
    const analysis = analyzeChecksum(words);
    
    if (analysis.matchCount > bestMatch.closeness) {
      bestMatch = { multiplier, closeness: analysis.matchCount, words, analysis };
      console.log(`✨ Better match! Multiplier: ${multiplier.toFixed(6)}`);
      console.log(`   Checksum match: ${analysis.matchCount}/8 bits`);
      console.log(`   Expected: ${analysis.expected}`);
      console.log(`   Actual:   ${analysis.actual}`);
      console.log(`   Differing bits: ${analysis.differingBits.join(', ')}\n`);
    }
    
    // Test if valid BIP39
    const mnemonic = words.join(' ');
    if (bip39.validateMnemonic(mnemonic)) {
      console.log('\n🎉 FOUND VALID BIP39 with "track"!\n');
      console.log('Multiplier:', multiplier);
      console.log('Mnemonic:', mnemonic);
      
      const seed = await bip39.mnemonicToSeed(mnemonic);
      const root = bitcoin.bip32.fromSeed(seed);
      const path = "m/84'/0'/0'/0/0";
      const child = root.derivePath(path);
      const { address } = bitcoin.payments.p2wpkh({
        pubkey: child.publicKey,
        network: bitcoin.networks.bitcoin,
      });
      
      console.log('Address:', address);
      console.log('Target: ', TARGET_ADDRESS);
      console.log('Match:', address === TARGET_ADDRESS ? '🎉 SOLVED!' : '❌');
      
      if (address === TARGET_ADDRESS) {
        return { solved: true, multiplier, mnemonic, address };
      }
    }
  }
  
  return { solved: false, bestMatch };
}

/**
 * Try adjusting specific words to flip checksum bits
 */
async function tryWordAdjustments() {
  console.log('\n🔧 Trying Word Adjustments for Checksum Correction');
  console.log('==================================================\n');
  
  const baseMultiplier = 80.18;
  const wordlist = bip39.wordlists.english;
  const baseWords = log2MultiplyTransform(baseMultiplier);
  const baseAnalysis = analyzeChecksum(baseWords);
  
  console.log('Base transformation checksum analysis:');
  console.log(`Expected: ${baseAnalysis.expected}`);
  console.log(`Actual:   ${baseAnalysis.actual}`);
  console.log(`Differing bits: ${baseAnalysis.differingBits.join(', ')}\n`);
  
  // Strategy: Try adjusting each word (except last) to see if it improves checksum
  for (let wordIndex = 0; wordIndex < 23; wordIndex++) {
    // Try nearby words (±1, ±2, ±3 positions in wordlist)
    const currentWordIndex = wordlist.indexOf(baseWords[wordIndex]);
    
    for (const offset of [-3, -2, -1, 1, 2, 3]) {
      const newWordIndex = (currentWordIndex + offset + wordlist.length) % wordlist.length;
      const testWords = [...baseWords];
      testWords[wordIndex] = wordlist[newWordIndex];
      
      // Must still end with "track"
      if (testWords[23] !== LAST_WORD_HINT) {
        continue;
      }
      
      const analysis = analyzeChecksum(testWords);
      
      if (analysis.matchCount > baseAnalysis.matchCount) {
        console.log(`✨ Improved by adjusting word ${wordIndex} (${baseWords[wordIndex]} → ${testWords[wordIndex]})`);
        console.log(`   Checksum match: ${analysis.matchCount}/8 bits`);
        console.log(`   Expected: ${analysis.expected}`);
        console.log(`   Actual:   ${analysis.actual}`);
        console.log(`   Differing bits: ${analysis.differingBits.join(', ')}\n`);
        
        // Test if valid
        const mnemonic = testWords.join(' ');
        if (bip39.validateMnemonic(mnemonic)) {
          console.log('\n🎉 FOUND VALID BIP39!\n');
          const seed = await bip39.mnemonicToSeed(mnemonic);
          const root = bitcoin.bip32.fromSeed(seed);
          const path = "m/84'/0'/0'/0/0";
          const child = root.derivePath(path);
          const { address } = bitcoin.payments.p2wpkh({
            pubkey: child.publicKey,
            network: bitcoin.networks.bitcoin,
          });
          
          console.log('Mnemonic:', mnemonic);
          console.log('Address:', address);
          console.log('Match:', address === TARGET_ADDRESS ? '🎉 SOLVED!' : '❌\n');
          
          if (address === TARGET_ADDRESS) {
            return { solved: true, mnemonic, address };
          }
        }
      }
    }
  }
  
  return { solved: false };
}

/**
 * Try systematically finding the correct last word for BIP39 validity
 */
async function findCorrectLastWord() {
  console.log('\n🔍 Finding Correct Last Word for BIP39 Validity');
  console.log('=================================================\n');
  
  const baseMultiplier = 80.18;
  const wordlist = bip39.wordlists.english;
  const baseWords = log2MultiplyTransform(baseMultiplier);
  
  // The first 23 words determine the entropy
  // The last word's first 3 bits complete the entropy, last 8 bits are checksum
  // We need to find which last word makes it valid
  
  console.log('Testing all possible last words that start with "t"...\n');
  
  const wordsStartingWithT = wordlist.filter(w => w.startsWith('t'));
  console.log(`Found ${wordsStartingWithT.length} words starting with "t"\n`);
  
  for (const lastWord of wordsStartingWithT) {
    const testWords = [...baseWords.slice(0, 23), lastWord];
    const mnemonic = testWords.join(' ');
    
    if (bip39.validateMnemonic(mnemonic)) {
      console.log(`✅ Valid BIP39 with last word: "${lastWord}"`);
      
      const seed = await bip39.mnemonicToSeed(mnemonic);
      const root = bitcoin.bip32.fromSeed(seed);
      const path = "m/84'/0'/0'/0/0";
      const child = root.derivePath(path);
      const { address } = bitcoin.payments.p2wpkh({
        pubkey: child.publicKey,
        network: bitcoin.networks.bitcoin,
      });
      
      console.log('   Address:', address);
      console.log('   Match:', address === TARGET_ADDRESS ? '🎉 SOLVED!' : '❌');
      
      if (address === TARGET_ADDRESS) {
        console.log('\n' + '='.repeat(60));
        console.log('🎉🎉🎉 PUZZLE SOLVED! 🎉🎉🎉');
        console.log('='.repeat(60));
        console.log('\nMnemonic:', mnemonic);
        console.log('Address:', address);
        console.log('\n💰 Reward: 0.08252025 BTC (~$5,500)');
        return { solved: true, mnemonic, address };
      }
      console.log('');
    }
  }
  
  // If no match with "t" words, try ALL words
  console.log('No match with "t" words. Testing ALL 2048 possible last words...\n');
  
  for (let i = 0; i < wordlist.length; i++) {
    const lastWord = wordlist[i];
    const testWords = [...baseWords.slice(0, 23), lastWord];
    const mnemonic = testWords.join(' ');
    
    if (bip39.validateMnemonic(mnemonic)) {
      console.log(`✅ Valid BIP39 with last word: "${lastWord}" (index ${i})`);
      
      const seed = await bip39.mnemonicToSeed(mnemonic);
      const root = bitcoin.bip32.fromSeed(seed);
      const path = "m/84'/0'/0'/0/0";
      const child = root.derivePath(path);
      const { address } = bitcoin.payments.p2wpkh({
        pubkey: child.publicKey,
        network: bitcoin.networks.bitcoin,
      });
      
      console.log('   Address:', address);
      console.log('   Match:', address === TARGET_ADDRESS ? '🎉 SOLVED!' : '❌');
      
      if (address === TARGET_ADDRESS) {
        console.log('\n' + '='.repeat(60));
        console.log('🎉🎉🎉 PUZZLE SOLVED! 🎉🎉🎉');
        console.log('='.repeat(60));
        console.log('\nMnemonic:', mnemonic);
        console.log('Address:', address);
        console.log('\n💰 Reward: 0.08252025 BTC (~$5,500)');
        return { solved: true, mnemonic, address };
      }
    }
    
    // Progress indicator every 100 words
    if ((i + 1) % 100 === 0) {
      console.log(`   Tested ${i + 1}/2048 words...`);
    }
  }
  
  return { solved: false };
}

/**
 * Main function
 */
async function main() {
  console.log('🎯 Bitcoin Puzzle Fine-Tune Solver');
  console.log('===================================\n');
  console.log('Focus: Log2*Multiply transformation (75% checksum match)');
  console.log('Target: bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh\n');
  
  // Step 1: Fine-tune multiplier
  const finetuneResult = await fineTuneMultiplier();
  if (finetuneResult.solved) {
    console.log('\n✅ Solution found during fine-tuning!');
    return;
  }
  
  // Step 2: Try word adjustments
  const adjustResult = await tryWordAdjustments();
  if (adjustResult.solved) {
    console.log('\n✅ Solution found through word adjustment!');
    return;
  }
  
  // Step 3: Find correct last word
  const lastWordResult = await findCorrectLastWord();
  if (lastWordResult.solved) {
    console.log('\n✅ Solution found by finding correct last word!');
    return;
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('No solution found yet');
  console.log('Next steps:');
  console.log('1. Analyze YouTube video for exact formula');
  console.log('2. Try different base transformations');
  console.log('3. Consider multi-word adjustments');
  console.log('='.repeat(60));
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { fineTuneMultiplier, tryWordAdjustments, findCorrectLastWord };
