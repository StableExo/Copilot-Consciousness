/**
 * Test All 4 Track Transformations for Valid BIP39
 * 
 * Tests all 4 transformations that produce "track" to see if any
 * can be fine-tuned to produce valid BIP39 with "track"
 */

import * as bip39 from 'bip39';

const PUZZLE_NUMBERS = [
  512, 128, 256, 64, 32, 16, 8, 4, 2, 1,
  1024, 2048, 4096, 8192, 16384, 32768,
  65536, 131072, 262144, 524288, 1048576,
  2097152, 4194304, 8388608
];

const wordlist = bip39.wordlists.english;

/**
 * Test Division transformation variations
 */
function testDivision() {
  console.log('\n📊 Testing Division Transformation');
  console.log('===================================\n');
  
  const baseDivisor = 4549.14;
  
  // Test fine variations
  for (let div = baseDivisor - 100; div <= baseDivisor + 100; div += 0.01) {
    const words = PUZZLE_NUMBERS.map(num => {
      const index = Math.floor(num / div) % wordlist.length;
      return wordlist[index];
    });
    
    const lastWord = words[words.length - 1];
    const mnemonic = words.join(' ');
    
    if (lastWord === 'track' && bip39.validateMnemonic(mnemonic)) {
      console.log('🎉 FOUND VALID BIP39 WITH "track"!');
      console.log('Divisor:', div);
      console.log('Mnemonic:', mnemonic);
      return { found: true, divisor: div, mnemonic };
    }
    
    if (Math.abs(div - Math.floor(div)) < 0.01) {
      process.stdout.write(`\r   Testing divisor ${div.toFixed(2)}...`);
    }
  }
  
  console.log('\n❌ No valid BIP39 with "track" found');
  return { found: false };
}

/**
 * Test XOR transformation variations
 */
function testXOR() {
  console.log('\n\n📊 Testing XOR Transformation');
  console.log('==============================\n');
  
  const baseXOR = 8390452;
  
  // Test variations ±10000
  for (let xor = baseXOR - 10000; xor <= baseXOR + 10000; xor++) {
    const words = PUZZLE_NUMBERS.map(num => {
      const index = (num ^ xor) % wordlist.length;
      return wordlist[index];
    });
    
    const lastWord = words[words.length - 1];
    const mnemonic = words.join(' ');
    
    if (lastWord === 'track' && bip39.validateMnemonic(mnemonic)) {
      console.log('🎉 FOUND VALID BIP39 WITH "track"!');
      console.log('XOR value:', xor);
      console.log('Mnemonic:', mnemonic);
      return { found: true, xor, mnemonic };
    }
    
    if (xor % 1000 === 0) {
      process.stdout.write(`\r   Testing XOR ${xor}...`);
    }
  }
  
  console.log('\n❌ No valid BIP39 with "track" found');
  return { found: false };
}

/**
 * Test Subtraction transformation variations
 */
function testSubtraction() {
  console.log('\n\n📊 Testing Subtraction Transformation');
  console.log('=====================================\n');
  
  const baseSubtract = 8386764;
  
  // Test variations ±10000
  for (let sub = baseSubtract - 10000; sub <= baseSubtract + 10000; sub++) {
    const words = PUZZLE_NUMBERS.map(num => {
      const result = num - sub;
      const index = result >= 0 ? result % wordlist.length : wordlist.length + (result % wordlist.length);
      return wordlist[index];
    });
    
    const lastWord = words[words.length - 1];
    const mnemonic = words.join(' ');
    
    if (lastWord === 'track' && bip39.validateMnemonic(mnemonic)) {
      console.log('🎉 FOUND VALID BIP39 WITH "track"!');
      console.log('Subtract value:', sub);
      console.log('Mnemonic:', mnemonic);
      return { found: true, subtract: sub, mnemonic };
    }
    
    if (sub % 1000 === 0) {
      process.stdout.write(`\r   Testing subtract ${sub}...`);
    }
  }
  
  console.log('\n❌ No valid BIP39 with "track" found');
  return { found: false };
}

/**
 * Test Log2*Multiply transformation variations (more granular)
 */
function testLog2Multiply() {
  console.log('\n\n📊 Testing Log2*Multiply Transformation');
  console.log('========================================\n');
  
  const baseMultiplier = 80.18;
  
  // Test very fine variations
  for (let mult = baseMultiplier - 5; mult <= baseMultiplier + 5; mult += 0.0001) {
    const words = PUZZLE_NUMBERS.map(num => {
      const log2Val = Math.log2(num);
      const index = Math.floor(log2Val * mult) % wordlist.length;
      return wordlist[index];
    });
    
    const lastWord = words[words.length - 1];
    const mnemonic = words.join(' ');
    
    if (lastWord === 'track' && bip39.validateMnemonic(mnemonic)) {
      console.log('🎉 FOUND VALID BIP39 WITH "track"!');
      console.log('Multiplier:', mult);
      console.log('Mnemonic:', mnemonic);
      return { found: true, multiplier: mult, mnemonic };
    }
    
    if (Math.abs(mult - Math.floor(mult)) < 0.0001) {
      process.stdout.write(`\r   Testing multiplier ${mult.toFixed(4)}...`);
    }
  }
  
  console.log('\n❌ No valid BIP39 with "track" found');
  return { found: false };
}

/**
 * Two-step approach: Find transformations where adjusting one word gives valid BIP39 with "track"
 */
function testTwoStepAdjustment() {
  console.log('\n\n📊 Testing Two-Step Adjustments');
  console.log('=================================\n');
  console.log('Strategy: Find transformation close to "track", adjust one word for checksum\n');
  
  const transformations = [
    { name: 'Division', fn: (div: number) => PUZZLE_NUMBERS.map(num => {
      const index = Math.floor(num / div) % wordlist.length;
      return wordlist[index];
    }), base: 4549.14 },
    { name: 'XOR', fn: (xor: number) => PUZZLE_NUMBERS.map(num => {
      const index = (num ^ xor) % wordlist.length;
      return wordlist[index];
    }), base: 8390452 },
    { name: 'Subtraction', fn: (sub: number) => PUZZLE_NUMBERS.map(num => {
      const result = num - sub;
      const index = result >= 0 ? result % wordlist.length : wordlist.length + (result % wordlist.length);
      return wordlist[index];
    }), base: 8386764 },
  ];
  
  for (const transform of transformations) {
    console.log(`\nTesting ${transform.name}...`);
    const baseWords = transform.fn(transform.base);
    
    // Try adjusting each word (except last which must be "track")
    for (let wordIdx = 0; wordIdx < 23; wordIdx++) {
      const currentWordIdx = wordlist.indexOf(baseWords[wordIdx]);
      
      // Try ±1, ±2, ±3, ±5, ±10 positions
      for (const offset of [-10, -5, -3, -2, -1, 1, 2, 3, 5, 10]) {
        const newWordIdx = (currentWordIdx + offset + wordlist.length) % wordlist.length;
        const testWords = [...baseWords];
        testWords[wordIdx] = wordlist[newWordIdx];
        
        // Ensure last word is still "track"
        testWords[23] = 'track';
        
        const mnemonic = testWords.join(' ');
        
        if (bip39.validateMnemonic(mnemonic)) {
          console.log(`\n🎉 FOUND VALID BIP39 WITH "track"!`);
          console.log(`Transformation: ${transform.name}`);
          console.log(`Adjusted word ${wordIdx}: ${baseWords[wordIdx]} → ${testWords[wordIdx]}`);
          console.log('Mnemonic:', mnemonic);
          return { found: true, transformation: transform.name, mnemonic };
        }
      }
    }
    console.log(`   ${transform.name}: No valid combination found`);
  }
  
  console.log('\n❌ No two-step adjustment found');
  return { found: false };
}

/**
 * Main function
 */
async function main() {
  console.log('🎯 Comprehensive Track Transformation Tester');
  console.log('============================================');
  console.log('Testing all 4 transformations that produce "track"');
  console.log('Goal: Find one that produces valid BIP39 with "track" as last word\n');
  
  // Test each transformation
  let result;
  
  result = testDivision();
  if (result.found) return;
  
  result = testXOR();
  if (result.found) return;
  
  result = testSubtraction();
  if (result.found) return;
  
  result = testLog2Multiply();
  if (result.found) return;
  
  result = testTwoStepAdjustment();
  if (result.found) return;
  
  console.log('\n\n' + '='.repeat(60));
  console.log('Conclusion');
  console.log('='.repeat(60));
  console.log('None of the 4 "track" transformations produce valid BIP39');
  console.log('\n💡 This suggests:');
  console.log('1. The puzzle may require a different transformation entirely');
  console.log('2. The last word "track" might be a clue, not the actual last word');
  console.log('3. The transformation might be more complex (multi-step)');
  console.log('4. The video may contain the exact formula needed');
  console.log('\n🎬 Next step: Analyze the YouTube video frame-by-frame');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { testDivision, testXOR, testSubtraction, testLog2Multiply, testTwoStepAdjustment };
