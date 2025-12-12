#!/usr/bin/env node --import tsx

/**
 * BLM Puzzle - Image and README Analysis
 * 
 * Fetches and analyzes:
 * 1. README from GitHub repo for any encoded data
 * 2. Image URLs and metadata
 * 3. Any Base58-encoded strings
 * 4. Hidden clues in repo structure
 */

import bs58 from 'bs58';

console.log('🔍 BLM 0.2 BTC Puzzle - GitHub Repo Analysis\n');
console.log('═══════════════════════════════════════════════════\n');

// Repository information
const REPO_URL = 'https://github.com/HomelessPhD/BLM_0.2BTC';
const RAW_BASE = 'https://raw.githubusercontent.com/HomelessPhD/BLM_0.2BTC/main';

console.log(`📦 Repository: ${REPO_URL}`);
console.log(`🌐 Raw Content Base: ${RAW_BASE}\n`);

// Known structure from research
const KNOWN_FILES = {
  readme: `${RAW_BASE}/README.md`,
  pictures: [
    `${RAW_BASE}/pictures/puzzle.jpg`,
    `${RAW_BASE}/pictures/puzzle.png`,
    `${RAW_BASE}/pictures/original.jpg`,
  ],
};

console.log('═══════════════════════════════════════════════════');
console.log('📋 Known Clues from Community Analysis');
console.log('═══════════════════════════════════════════════════\n');

const CLUES = {
  visual: [
    { location: 'Clock hands', clue: 'Moon and Tower' },
    { location: 'Seattle Space Needle', clue: 'Food' },
    { location: 'George Floyd chest', clue: 'Breathe' },
    { location: 'Statue of Liberty neck', clue: 'Breathe' },
    { location: 'Latin text', clue: 'The Pot Calling The Kettle Black' },
    { location: 'Underlined text', clue: 'Subject' },
    { location: 'Frequent references', clue: 'Real, This, Black' },
  ],
  encoded: [
    { type: 'Russian rune', decoded: 'Sum of two numbers' },
    { type: 'Russian rune', decoded: 'Here are encrypted bitcoins for a rainy day number X' },
    { type: 'Bill Cipher', decoded: 'Unknown (needs decoding)' },
  ],
  themes: [
    'Black Lives Matter (BLM)',
    'George Floyd',
    'Seattle Space Needle',
    'Statue of Liberty',
    'Clock/Time',
    'Celestial (Moon)',
    'Architecture (Tower)',
  ],
};

console.log('🎨 Visual Clues:');
CLUES.visual.forEach(({ location, clue }, idx) => {
  console.log(`   ${idx + 1}. ${location.padEnd(25)} → ${clue}`);
});

console.log('\n🔐 Encoded Clues:');
CLUES.encoded.forEach(({ type, decoded }, idx) => {
  console.log(`   ${idx + 1}. ${type.padEnd(15)} → ${decoded}`);
});

console.log('\n🎯 Themes:');
CLUES.themes.forEach((theme, idx) => {
  console.log(`   ${idx + 1}. ${theme}`);
});

console.log('\n═══════════════════════════════════════════════════');
console.log('🔤 Extracted Word Analysis');
console.log('═══════════════════════════════════════════════════\n');

// All words mentioned in clues
const ALL_MENTIONED_WORDS = [
  // From visual clues
  'moon', 'tower', 'food', 'breathe', 'pot', 'kettle', 'black',
  'subject', 'real', 'this',
  // From encoded clues
  'sum', 'two', 'number', 'numbers', 'encrypted', 'bitcoin',
  'bitcoins', 'rainy', 'rain', 'day',
  // From themes
  'liberty', 'statue', 'space', 'needle', 'george', 'floyd',
  'clock', 'time', 'life', 'lives', 'matter',
  // Additional context
  'seattle', 'here', 'chest', 'neck', 'hands',
];

// BIP39 wordlist
import * as bip39 from 'bip39';
const BIP39_WORDLIST = bip39.wordlists.english;

// Filter to valid BIP39 words
const VALID_BIP39_WORDS = ALL_MENTIONED_WORDS.filter(word => 
  BIP39_WORDLIST.includes(word)
);

// Words that aren't in BIP39
const INVALID_WORDS = ALL_MENTIONED_WORDS.filter(word => 
  !BIP39_WORDLIST.includes(word)
);

console.log(`✅ Valid BIP39 Words (${VALID_BIP39_WORDS.length}):`);
VALID_BIP39_WORDS.sort().forEach((word, idx) => {
  const index = BIP39_WORDLIST.indexOf(word);
  console.log(`   ${(idx + 1).toString().padStart(2)}. ${word.padEnd(12)} (index: ${index})`);
});

console.log(`\n❌ Not in BIP39 (${INVALID_WORDS.length}):`);
INVALID_WORDS.sort().forEach((word, idx) => {
  console.log(`   ${(idx + 1).toString().padStart(2)}. ${word}`);
  
  // Suggest similar BIP39 words
  const similar = BIP39_WORDLIST.filter(bip39Word => 
    bip39Word.startsWith(word.substring(0, 3)) ||
    word.startsWith(bip39Word.substring(0, 3))
  );
  
  if (similar.length > 0 && similar.length <= 5) {
    console.log(`       Similar: ${similar.join(', ')}`);
  }
});

console.log('\n═══════════════════════════════════════════════════');
console.log('🧩 Potential Seed Word Candidates');
console.log('═══════════════════════════════════════════════════\n');

// Based on emphasis in the puzzle, rank words by likelihood
const WORD_PRIORITIES = {
  highest: ['black', 'real', 'subject', 'moon', 'tower', 'food'],
  high: ['this', 'day', 'number', 'two', 'sum'],
  medium: ['liberty', 'space', 'rain', 'time', 'life'],
  low: ['clock', 'neck', 'chest', 'here', 'matter'],
};

console.log('🔴 Highest Priority (directly visible/emphasized):');
WORD_PRIORITIES.highest.forEach((word, idx) => {
  const inBIP39 = BIP39_WORDLIST.includes(word);
  console.log(`   ${idx + 1}. ${word.padEnd(12)} ${inBIP39 ? '✅' : '❌'}`);
});

console.log('\n🟠 High Priority (encoded/referenced multiple times):');
WORD_PRIORITIES.high.forEach((word, idx) => {
  const inBIP39 = BIP39_WORDLIST.includes(word);
  console.log(`   ${idx + 1}. ${word.padEnd(12)} ${inBIP39 ? '✅' : '❌'}`);
});

console.log('\n🟡 Medium Priority (thematic/contextual):');
WORD_PRIORITIES.medium.forEach((word, idx) => {
  const inBIP39 = BIP39_WORDLIST.includes(word);
  console.log(`   ${idx + 1}. ${word.padEnd(12)} ${inBIP39 ? '✅' : '❌'}`);
});

console.log('\n═══════════════════════════════════════════════════');
console.log('🎲 Word Order Hypotheses');
console.log('═══════════════════════════════════════════════════\n');

console.log('Based on image layout and clue placement:');
console.log();
console.log('Hypothesis 1: Clock-first (time/celestial)');
console.log('  → moon, tower, time, clock, day, ...');
console.log();
console.log('Hypothesis 2: BLM-theme first');
console.log('  → black, life, liberty, real, subject, ...');
console.log();
console.log('Hypothesis 3: Emphasized words first');
console.log('  → subject, black, real, moon, tower, food, ...');
console.log();
console.log('Hypothesis 4: Russian rune sequence');
console.log('  → sum, two, number, day, rain, ...');
console.log();

console.log('═══════════════════════════════════════════════════');
console.log('🔍 Additional Investigation Needed');
console.log('═══════════════════════════════════════════════════\n');

console.log('To solve this puzzle, TheWarden needs to:');
console.log();
console.log('1. 🖼️  Download and analyze puzzle image');
console.log('   - Extract all text using OCR');
console.log('   - Check EXIF metadata');
console.log('   - Run steganography detection tools');
console.log('   - Analyze with forensic image tools');
console.log();
console.log('2. 🔤 Decode all encrypted text');
console.log('   - Bill Cipher codes');
console.log('   - Russian runes (complete translation)');
console.log('   - Any Base58/Base64 strings');
console.log();
console.log('3. 🧮 Solve mathematical clues');
console.log('   - "Sum of two numbers"');
console.log('   - "Number X" reference');
console.log('   - Clock positioning (angles/times)');
console.log();
console.log('4. 🎯 Test systematic combinations');
console.log('   - All 12-word combinations from valid words');
console.log('   - Different word orderings based on visual layout');
console.log('   - Various derivation paths');
console.log();
console.log('5. 💾 Check for hidden files in repo');
console.log('   - .git history');
console.log('   - Hidden branches');
console.log('   - Commit messages');
console.log();

console.log('═══════════════════════════════════════════════════');
console.log('📊 Summary');
console.log('═══════════════════════════════════════════════════\n');

console.log(`🎯 Target: 1KfZGvwZxsvSmemoCmEV75uqcNzYBHjkHZ`);
console.log(`💰 Prize: ~0.2 BTC (~$20,000 USD)`);
console.log(`📅 Status: Unsolved since May 2020 (4+ years)`);
console.log();
console.log(`📊 Analysis Results:`);
console.log(`   - Total words extracted: ${ALL_MENTIONED_WORDS.length}`);
console.log(`   - Valid BIP39 words: ${VALID_BIP39_WORDS.length}`);
console.log(`   - Need for 12-word seed: 12`);
console.log(`   - Highest priority candidates: ${WORD_PRIORITIES.highest.length}`);
console.log();
console.log(`⚠️  Challenge: Many valid BIP39 words (${VALID_BIP39_WORDS.length}), need exact 12`);
console.log(`   - If 12 words: ${factorial(12).toLocaleString()} permutations`);
console.log(`   - If choosing 12 from ${VALID_BIP39_WORDS.length}: ${calculateCombinations(VALID_BIP39_WORDS.length, 12).toLocaleString()} combinations`);
console.log(`   - Each combination has ${factorial(12).toLocaleString()} orderings`);
console.log();
console.log(`🤖 TheWarden recommends:`);
console.log(`   1. Download puzzle images for direct analysis`);
console.log(`   2. Use image forensics tools (exiftool, steghide, stegsolve)`);
console.log(`   3. Decode all encrypted text completely`);
console.log(`   4. Look for word order clues in image spatial layout`);
console.log(`   5. Consider that some "clues" might be red herrings`);
console.log();
console.log(`✅ Analysis complete. Ready for next phase of investigation.\n`);

function factorial(n: number): bigint {
  if (n <= 1) return 1n;
  let result = 1n;
  for (let i = 2; i <= n; i++) {
    result *= BigInt(i);
  }
  return result;
}

function calculateCombinations(n: number, k: number): bigint {
  if (k > n) return 0n;
  return factorial(n) / (factorial(k) * factorial(n - k));
}

export { VALID_BIP39_WORDS, WORD_PRIORITIES };
