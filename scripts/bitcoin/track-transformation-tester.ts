/**
 * Track Transformation Tester
 * 
 * Tests variations of the 4 transformations that produce "track" as the last word
 * Analyzes BIP39 checksum patterns to find the correct solution
 * 
 * The 4 base transformations discovered:
 * 1. Division by 4549.14
 * 2. XOR with 8390452
 * 3. Subtraction of 8386764
 * 4. Log2 then multiply by 80.17
 * 
 * Strategy: Test systematic variations around these base values
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

const TARGET_ADDRESS = 'bc1qkf6trv39epu4n0wfzw4mk58zf5hrvwd442aksk';
const LAST_WORD_HINT = 'track';
const TRACK_INDEX = 1844; // BIP39 wordlist index for "track"

interface TestResult {
  transformation: string;
  parameter: number;
  words: string[];
  lastWord: string;
  lastWordMatches: boolean;
  bip39Valid: boolean;
  checksumBytes?: string;
  checksumCloseness?: number;
  address?: string;
  addressMatches?: boolean;
  mnemonic?: string;
}

/**
 * Calculate checksum bytes from mnemonic words (even if invalid)
 */
function getChecksumInfo(words: string[]): { expectedChecksum: string; actualChecksum: string; closeness: number } {
  const wordlist = bip39.wordlists.english;
  
  // Convert words to indices
  const indices = words.map(w => wordlist.indexOf(w));
  if (indices.includes(-1)) {
    return { expectedChecksum: 'invalid-word', actualChecksum: 'N/A', closeness: 0 };
  }
  
  // Convert to bits (11 bits per word)
  let bits = '';
  indices.forEach(index => {
    bits += index.toString(2).padStart(11, '0');
  });
  
  // First 256 bits
  const entropyBits = bits.substring(0, 256);
  const checksumBitsFromWords = bits.substring(256);
  
  // Calculate expected checksum
  const byteMatches = entropyBits.match(/.{1,8}/g);
  if (!byteMatches) {
    return { expectedChecksum: 'invalid-bits', actualChecksum: 'N/A', closeness: 0 };
  }
  const entropyBytes = Buffer.from(byteMatches.map(b => parseInt(b, 2)));
  const hash = crypto.createHash('sha256').update(entropyBytes).digest();
  const expectedChecksumBits = hash[0].toString(2).padStart(8, '0');
  
  // Calculate closeness (how many bits match)
  let matchingBits = 0;
  for (let i = 0; i < 8; i++) {
    if (expectedChecksumBits[i] === checksumBitsFromWords[i]) {
      matchingBits++;
    }
  }
  
  return {
    expectedChecksum: expectedChecksumBits,
    actualChecksum: checksumBitsFromWords,
    closeness: matchingBits / 8
  };
}

/**
 * Validate and derive address from mnemonic
 */
async function validateAndDerive(mnemonic: string): Promise<{
  valid: boolean;
  address?: string;
  matches?: boolean;
}> {
  const valid = bip39.validateMnemonic(mnemonic);
  if (!valid) {
    return { valid: false };
  }

  try {
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const root = bitcoin.bip32.fromSeed(seed);
    const path = "m/84'/0'/0'/0/0"; // Native segwit
    const child = root.derivePath(path);
    
    const { address } = bitcoin.payments.p2wpkh({
      pubkey: child.publicKey,
      network: bitcoin.networks.bitcoin,
    });

    return { 
      valid: true, 
      address, 
      matches: address === TARGET_ADDRESS 
    };
  } catch (error) {
    return { valid: false };
  }
}

/**
 * Transformation 1: Division variations
 */
function testDivisionVariations(wordlist: string[]): TestResult[] {
  const results: TestResult[] = [];
  const baseDivisor = 4549.14;
  
  // Test ±0.01%, ±0.1%, ±1%, ±5% variations
  const variations = [
    0, // exact
    0.0001, -0.0001, // ±0.01%
    0.001, -0.001,   // ±0.1%
    0.01, -0.01,     // ±1%
    0.05, -0.05,     // ±5%
  ];
  
  for (const variation of variations) {
    const divisor = baseDivisor * (1 + variation);
    const words = PUZZLE_NUMBERS.map(num => {
      const index = Math.floor(num / divisor) % wordlist.length;
      return wordlist[index];
    });
    
    const lastWord = words[words.length - 1];
    const mnemonic = words.join(' ');
    const checksumInfo = getChecksumInfo(words);
    
    results.push({
      transformation: 'Division',
      parameter: divisor,
      words,
      lastWord,
      lastWordMatches: lastWord === LAST_WORD_HINT,
      bip39Valid: bip39.validateMnemonic(mnemonic),
      checksumBytes: `${checksumInfo.expectedChecksum} vs ${checksumInfo.actualChecksum}`,
      checksumCloseness: checksumInfo.closeness,
      mnemonic: lastWord === LAST_WORD_HINT ? mnemonic : undefined
    });
  }
  
  return results;
}

/**
 * Transformation 2: XOR variations
 */
function testXORVariations(wordlist: string[]): TestResult[] {
  const results: TestResult[] = [];
  const baseXOR = 8390452;
  
  // Test nearby values (±1, ±10, ±100, ±1000)
  const offsets = [0, 1, -1, 10, -10, 100, -100, 1000, -1000];
  
  for (const offset of offsets) {
    const xorValue = baseXOR + offset;
    const words = PUZZLE_NUMBERS.map(num => {
      const index = (num ^ xorValue) % wordlist.length;
      return wordlist[index];
    });
    
    const lastWord = words[words.length - 1];
    const mnemonic = words.join(' ');
    const checksumInfo = getChecksumInfo(words);
    
    results.push({
      transformation: 'XOR',
      parameter: xorValue,
      words,
      lastWord,
      lastWordMatches: lastWord === LAST_WORD_HINT,
      bip39Valid: bip39.validateMnemonic(mnemonic),
      checksumBytes: `${checksumInfo.expectedChecksum} vs ${checksumInfo.actualChecksum}`,
      checksumCloseness: checksumInfo.closeness,
      mnemonic: lastWord === LAST_WORD_HINT ? mnemonic : undefined
    });
  }
  
  return results;
}

/**
 * Transformation 3: Subtraction variations
 */
function testSubtractionVariations(wordlist: string[]): TestResult[] {
  const results: TestResult[] = [];
  const baseSubtract = 8386764;
  
  // Test nearby values
  const offsets = [0, 1, -1, 10, -10, 100, -100, 1000, -1000];
  
  for (const offset of offsets) {
    const subtractValue = baseSubtract + offset;
    const words = PUZZLE_NUMBERS.map(num => {
      const result = num - subtractValue;
      const index = result >= 0 ? result % wordlist.length : wordlist.length + (result % wordlist.length);
      return wordlist[index];
    });
    
    const lastWord = words[words.length - 1];
    const mnemonic = words.join(' ');
    const checksumInfo = getChecksumInfo(words);
    
    results.push({
      transformation: 'Subtraction',
      parameter: subtractValue,
      words,
      lastWord,
      lastWordMatches: lastWord === LAST_WORD_HINT,
      bip39Valid: bip39.validateMnemonic(mnemonic),
      checksumBytes: `${checksumInfo.expectedChecksum} vs ${checksumInfo.actualChecksum}`,
      checksumCloseness: checksumInfo.closeness,
      mnemonic: lastWord === LAST_WORD_HINT ? mnemonic : undefined
    });
  }
  
  return results;
}

/**
 * Transformation 4: Log2 + Multiply variations
 */
function testLog2MultiplyVariations(wordlist: string[]): TestResult[] {
  const results: TestResult[] = [];
  const baseMultiplier = 80.17;
  
  // Test ±0.01, ±0.1, ±1, ±5 variations
  const offsets = [0, 0.01, -0.01, 0.1, -0.1, 1, -1, 5, -5];
  
  for (const offset of offsets) {
    const multiplier = baseMultiplier + offset;
    const words = PUZZLE_NUMBERS.map(num => {
      const log2Val = Math.log2(num);
      const index = Math.floor(log2Val * multiplier) % wordlist.length;
      return wordlist[index];
    });
    
    const lastWord = words[words.length - 1];
    const mnemonic = words.join(' ');
    const checksumInfo = getChecksumInfo(words);
    
    results.push({
      transformation: 'Log2*Multiply',
      parameter: multiplier,
      words,
      lastWord,
      lastWordMatches: lastWord === LAST_WORD_HINT,
      bip39Valid: bip39.validateMnemonic(mnemonic),
      checksumBytes: `${checksumInfo.expectedChecksum} vs ${checksumInfo.actualChecksum}`,
      checksumCloseness: checksumInfo.closeness,
      mnemonic: lastWord === LAST_WORD_HINT ? mnemonic : undefined
    });
  }
  
  return results;
}

/**
 * Two-step transformations: Combine transformations
 */
function testTwoStepTransformations(wordlist: string[]): TestResult[] {
  const results: TestResult[] = [];
  
  // Example: Division then XOR adjustment to last word for checksum
  const divisor = 4549.14;
  const baseWords = PUZZLE_NUMBERS.map(num => {
    const index = Math.floor(num / divisor) % wordlist.length;
    return wordlist[index];
  });
  
  // Try adjusting last word to match checksum requirements
  // The last word's index encodes the checksum
  // We need to find which word makes the checksum valid
  
  for (let lastWordIndex = 0; lastWordIndex < 2048; lastWordIndex++) {
    const testWords = [...baseWords.slice(0, -1), wordlist[lastWordIndex]];
    const mnemonic = testWords.join(' ');
    
    if (bip39.validateMnemonic(mnemonic)) {
      const lastWord = testWords[testWords.length - 1];
      const checksumInfo = getChecksumInfo(testWords);
      
      results.push({
        transformation: 'Division+ChecksumAdjust',
        parameter: lastWordIndex,
        words: testWords,
        lastWord,
        lastWordMatches: lastWord === LAST_WORD_HINT,
        bip39Valid: true,
        checksumBytes: `${checksumInfo.expectedChecksum} vs ${checksumInfo.actualChecksum}`,
        checksumCloseness: checksumInfo.closeness,
        mnemonic
      });
      
      // If we found one with "track", that's very interesting
      if (lastWord === LAST_WORD_HINT) {
        console.log('\n🎯 Found BIP39-valid mnemonic with "track" as last word!');
        break;
      }
    }
  }
  
  return results;
}

/**
 * Main testing function
 */
async function testTrackTransformations() {
  console.log('🔍 Track Transformation Tester');
  console.log('================================\n');
  console.log('Testing variations of the 4 transformations that produce "track"');
  console.log('Target: Valid BIP39 + "track" as last word + correct address\n');
  
  const wordlist = bip39.wordlists.english;
  let allResults: TestResult[] = [];
  
  // Test all transformation variations
  console.log('📊 Testing Division variations...');
  allResults = allResults.concat(testDivisionVariations(wordlist));
  
  console.log('📊 Testing XOR variations...');
  allResults = allResults.concat(testXORVariations(wordlist));
  
  console.log('📊 Testing Subtraction variations...');
  allResults = allResults.concat(testSubtractionVariations(wordlist));
  
  console.log('📊 Testing Log2*Multiply variations...');
  allResults = allResults.concat(testLog2MultiplyVariations(wordlist));
  
  console.log('📊 Testing Two-Step transformations...');
  allResults = allResults.concat(testTwoStepTransformations(wordlist));
  
  // Filter to only results that match "track"
  const trackResults = allResults.filter(r => r.lastWordMatches);
  console.log(`\n✅ Found ${trackResults.length} transformations producing "track"\n`);
  
  // Sort by checksum closeness
  trackResults.sort((a, b) => (b.checksumCloseness || 0) - (a.checksumCloseness || 0));
  
  // Display top results
  console.log('Top results by checksum closeness:\n');
  for (const result of trackResults.slice(0, 10)) {
    console.log(`${result.transformation} (param: ${result.parameter.toFixed(4)})`);
    console.log(`  Last word: ${result.lastWord} ${result.lastWordMatches ? '✅' : '❌'}`);
    console.log(`  BIP39 valid: ${result.bip39Valid ? '✅' : '❌'}`);
    console.log(`  Checksum closeness: ${((result.checksumCloseness || 0) * 100).toFixed(1)}%`);
    console.log(`  Checksum: ${result.checksumBytes}`);
    
    if (result.bip39Valid && result.mnemonic) {
      const derived = await validateAndDerive(result.mnemonic);
      console.log(`  Address: ${derived.address}`);
      console.log(`  Match: ${derived.matches ? '🎉 SOLVED!' : '❌'}`);
      
      if (derived.matches) {
        console.log('\n' + '='.repeat(60));
        console.log('🎉🎉🎉 PUZZLE SOLVED! 🎉🎉🎉');
        console.log('='.repeat(60));
        console.log('\nWinning transformation:', result.transformation);
        console.log('Parameter:', result.parameter);
        console.log('Mnemonic:', result.mnemonic);
        console.log('Address:', derived.address);
        console.log('\n💰 Reward: 0.08252025 BTC (~$5,500)');
        return;
      }
    }
    console.log('');
  }
  
  // Summary statistics
  console.log('\n' + '='.repeat(60));
  console.log('📈 Summary Statistics');
  console.log('='.repeat(60));
  console.log(`Total variations tested: ${allResults.length}`);
  console.log(`Producing "track": ${trackResults.length}`);
  console.log(`BIP39 valid: ${trackResults.filter(r => r.bip39Valid).length}`);
  console.log(`Best checksum closeness: ${Math.max(...trackResults.map(r => r.checksumCloseness || 0)) * 100}%`);
  
  console.log('\n💡 Next steps:');
  console.log('1. Fine-tune parameters around highest checksum closeness');
  console.log('2. Try more two-step combinations');
  console.log('3. Analyze video for exact formula hints');
  console.log('4. Test checksum-correcting adjustments');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testTrackTransformations().catch(console.error);
}

export {
  testDivisionVariations,
  testXORVariations,
  testSubtractionVariations,
  testLog2MultiplyVariations,
  testTwoStepTransformations,
  getChecksumInfo,
  validateAndDerive
};
