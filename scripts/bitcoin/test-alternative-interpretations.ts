/**
 * Test Alternative Interpretations for Positions 16 and 23
 * 
 * MetaMask validation shows words 16 and 23 are incorrect
 * Need to test different indexing/transformation schemes
 */

import * as bip39 from 'bip39';

const wordlist = bip39.wordlists.english;

console.log('🔍 Testing Alternative Interpretations for Positions 16 & 23');
console.log('='.repeat(70));
console.log('');

const SEQUENCE = [18, 7, 9, 16, 20, 5, 11, 14, 2, 23, 13, 12, 4, 21, 15, 10, 6, 19, 17, 8, 1, 3, 22];

console.log('Original sequence:');
console.log(SEQUENCE.join(', '));
console.log('');
console.log('Problem indices:');
console.log('  Position 16: index 10');
console.log('  Position 23: index 22');
console.log('');

// Current interpretation (1-indexed)
console.log('='.repeat(70));
console.log('CURRENT (1-indexed): INCORRECT at positions 16 & 23');
console.log('='.repeat(70));
console.log('');

const current = SEQUENCE.map(i => wordlist[i - 1]);
current.push('track');

console.log('Position 16: index 10 → "' + wordlist[10 - 1] + '" ❌');
console.log('Position 23: index 22 → "' + wordlist[22 - 1] + '" ❌');
console.log('');

// Test 1: 0-indexed for ALL
console.log('='.repeat(70));
console.log('TEST 1: 0-indexed for ALL positions');
console.log('='.repeat(70));
console.log('');

const test1 = SEQUENCE.map(i => wordlist[i]);
test1.push('track');

console.log('Position 16: index 10 (0-idx) → "' + wordlist[10] + '"');
console.log('Position 23: index 22 (0-idx) → "' + wordlist[22] + '"');
console.log('');
console.log('Full mnemonic:');
console.log(test1.join(' '));
console.log('');
console.log('Valid BIP39:', bip39.validateMnemonic(test1.join(' ')));
console.log('');

// Test 2: Magic 130 offset for positions 16 & 23
console.log('='.repeat(70));
console.log('TEST 2: Magic 130 offset for positions 16 & 23');
console.log('='.repeat(70));
console.log('');

const test2 = SEQUENCE.map((idx, pos) => {
  if (pos === 15) { // position 16 (0-indexed array)
    const newIdx = (idx + 130) % 2048;
    console.log(`Position 16: index ${idx} + 130 = ${newIdx} → "${wordlist[newIdx]}"`);
    return wordlist[newIdx];
  } else if (pos === 22) { // position 23 (0-indexed array)
    const newIdx = (idx + 130) % 2048;
    console.log(`Position 23: index ${idx} + 130 = ${newIdx} → "${wordlist[newIdx]}"`);
    return wordlist[newIdx];
  } else {
    return wordlist[idx - 1]; // 1-indexed for others
  }
});
test2.push('track');

console.log('');
console.log('Full mnemonic:');
console.log(test2.join(' '));
console.log('');
console.log('Valid BIP39:', bip39.validateMnemonic(test2.join(' ')));
console.log('');

// Test 3: Pi-digit transformation
console.log('='.repeat(70));
console.log('TEST 3: Pi-digit shifts for positions 16 & 23');
console.log('='.repeat(70));
console.log('');

const PI_DIGITS = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 8, 9, 7, 9, 3, 2, 3, 8, 4, 6, 2, 6, 4];

const test3 = SEQUENCE.map((idx, pos) => {
  if (pos === 15) { // position 16
    const piDigit = PI_DIGITS[pos];
    const newIdx = idx + piDigit;
    console.log(`Position 16: index ${idx} + pi[16]=${piDigit} = ${newIdx} → "${wordlist[newIdx - 1]}"`);
    return wordlist[newIdx - 1];
  } else if (pos === 22) { // position 23
    const piDigit = PI_DIGITS[pos];
    const newIdx = idx + piDigit;
    console.log(`Position 23: index ${idx} + pi[23]=${piDigit} = ${newIdx} → "${wordlist[newIdx - 1]}"`);
    return wordlist[newIdx - 1];
  } else {
    return wordlist[idx - 1]; // 1-indexed for others
  }
});
test3.push('track');

console.log('');
console.log('Full mnemonic:');
console.log(test3.join(' '));
console.log('');
console.log('Valid BIP39:', bip39.validateMnemonic(test3.join(' ')));
console.log('');

// Test 4: Off-by-one in different direction
console.log('='.repeat(70));
console.log('TEST 4: Different offsets for positions 16 & 23');
console.log('='.repeat(70));
console.log('');

const offsets = [-1, 0, 1, 2];

for (const offset of offsets) {
  console.log(`Offset: ${offset >= 0 ? '+' : ''}${offset}`);
  
  const idx16 = SEQUENCE[15]; // position 16
  const idx23 = SEQUENCE[22]; // position 23
  
  const word16 = wordlist[(idx16 + offset - 1 + 2048) % 2048];
  const word23 = wordlist[(idx23 + offset - 1 + 2048) % 2048];
  
  console.log(`  Position 16: index ${idx16}${offset >= 0 ? '+' : ''}${offset} → "${word16}"`);
  console.log(`  Position 23: index ${idx23}${offset >= 0 ? '+' : ''}${offset} → "${word23}"`);
}

console.log('');

// Summary
console.log('='.repeat(70));
console.log('SUMMARY');
console.log('='.repeat(70));
console.log('');
console.log('We need user feedback to determine which interpretation is correct:');
console.log('');
console.log('1. What words does MetaMask suggest for positions 16 & 23?');
console.log('2. Are the other 22 words marked as correct?');
console.log('3. Can you re-verify the numbers from video at timestamp 7:57?');
console.log('');
console.log('Once we know the CORRECT words, we can reverse-engineer the pattern!');
console.log('');
console.log('='.repeat(70));
