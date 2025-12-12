/**
 * Systematic Entropy Generator for Hunghuatang Puzzle
 * 
 * Tests multiple approaches systematically:
 * 1. Cube-based encoding (discovered pattern)
 * 2. Various hash-based entropy generation
 * 3. Different seed combinations
 * 4. Grid transformations
 * 
 * Goal: Find valid BIP39 mnemonic with "track" as last word
 */

import bip39 from 'bip39';
import { BIP32Factory } from 'bip32';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import * as crypto from 'crypto';

const PUZZLE_NUMBERS = [
  2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096,
  8192, 16384, 32768, 65536, 131072, 262144, 524288, 1048576,
  2097152, 4194304, 8388608, 16777216
];

const TARGET_ADDRESS = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
const LAST_WORD_HINT = 'track';
const LAST_WORD_INDEX = 1844;

const bip32 = BIP32Factory(ecc);

interface TestResult {
  method: string;
  mnemonic?: string;
  lastWord?: string;
  validBIP39: boolean;
  matchesTrack: boolean;
  matchesAddress: boolean;
  address?: string;
}

// ═══════════════════════════════════════════════════════════
// Approach 1: Cube-Based Word Index Generation
// ═══════════════════════════════════════════════════════════

async function testCubeBasedApproach(): Promise<TestResult[]> {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  Approach 1: Cube-Based Word Index Generation            ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  const results: TestResult[] = [];
  const wordlist = bip39.wordlists.english;
  
  // Strategy 1: Direct cube root for cubes, bit position for others
  const indices1 = PUZZLE_NUMBERS.map((num, idx) => {
    const cubeRoot = Math.round(Math.cbrt(num));
    if (cubeRoot ** 3 === num) {
      return cubeRoot % 2048;
    } else {
      const bitPos = Math.log2(num);
      return Math.floor(bitPos * 85.33) % 2048;
    }
  });
  
  await testIndices('Cube/Bit Mixed', indices1, results);
  
  // Strategy 2: Position-based for cubes, log2 for others
  const indices2 = PUZZLE_NUMBERS.map((num, idx) => {
    const position = idx + 1;
    const cubeRoot = Math.round(Math.cbrt(num));
    if (cubeRoot ** 3 === num && position % 3 === 0) {
      return (cubeRoot * position) % 2048;
    } else {
      return Math.floor(Math.log2(num) * 80.18) % 2048;
    }
  });
  
  await testIndices('Cube*Position Mixed', indices2, results);
  
  // Strategy 3: Use cube roots modulo different bases
  for (const modBase of [2048, 1024, 512]) {
    const indices3 = PUZZLE_NUMBERS.map(num => {
      const cubeRoot = Math.round(Math.cbrt(num));
      return cubeRoot % modBase;
    });
    
    await testIndices(`CubeRoot mod ${modBase}`, indices3, results);
  }
  
  return results;
}

// ═══════════════════════════════════════════════════════════
// Approach 2: Hash-Based Entropy Generation
// ═══════════════════════════════════════════════════════════

async function testHashBasedEntropy(): Promise<TestResult[]> {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  Approach 2: Hash-Based Entropy Generation               ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  const results: TestResult[] = [];
  
  // Hash algorithms to test
  const algorithms = ['sha256', 'sha512', 'sha3-256', 'sha3-512', 'blake2s256', 'blake2b512'];
  
  // Seed generation methods
  const seedMethods = [
    { name: 'Concatenated Numbers', fn: () => PUZZLE_NUMBERS.join('') },
    { name: 'Sum of Numbers', fn: () => PUZZLE_NUMBERS.reduce((a, b) => a + b, 0).toString() },
    { name: 'XOR Chain', fn: () => PUZZLE_NUMBERS.reduce((a, b) => a ^ b, 0).toString() },
    { name: 'Product of Bit Positions', fn: () => PUZZLE_NUMBERS.reduce((a, b) => a * Math.log2(b), 1).toString() },
    { name: 'Hex Concatenation', fn: () => PUZZLE_NUMBERS.map(n => n.toString(16)).join('') },
    { name: 'Binary Concatenation', fn: () => PUZZLE_NUMBERS.map(n => n.toString(2)).join('') }
  ];
  
  for (const algo of algorithms.slice(0, 3)) { // Test first 3 algorithms
    for (const method of seedMethods.slice(0, 3)) { // Test first 3 methods
      try {
        const seed = method.fn();
        const hash = crypto.createHash(algo).update(seed).digest();
        const entropy = hash.slice(0, 32); // 256 bits
        
        const mnemonic = bip39.entropyToMnemonic(entropy.toString('hex'));
        await testMnemonic(`${algo}:${method.name}`, mnemonic, results);
      } catch (error) {
        // Skip if algorithm not available
      }
    }
  }
  
  return results;
}

// ═══════════════════════════════════════════════════════════
// Approach 3: Multi-Round Hashing
// ═══════════════════════════════════════════════════════════

async function testMultiRoundHashing(): Promise<TestResult[]> {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  Approach 3: Multi-Round Hashing                         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  const results: TestResult[] = [];
  
  const baseSeed = PUZZLE_NUMBERS.join(',');
  
  // Test different round counts
  for (const rounds of [1, 2, 5, 10, 100, 1000]) {
    let hash = Buffer.from(baseSeed);
    
    for (let i = 0; i < rounds; i++) {
      hash = crypto.createHash('sha256').update(hash).digest();
    }
    
    try {
      const mnemonic = bip39.entropyToMnemonic(hash.toString('hex'));
      await testMnemonic(`SHA256 ${rounds} rounds`, mnemonic, results);
    } catch (error) {
      // Invalid entropy
    }
  }
  
  return results;
}

// ═══════════════════════════════════════════════════════════
// Helper: Test Word Indices
// ═══════════════════════════════════════════════════════════

async function testIndices(method: string, indices: number[], results: TestResult[]): Promise<void> {
  const wordlist = bip39.wordlists.english;
  
  // Ensure all indices are valid
  const validIndices = indices.map(idx => Math.abs(idx) % 2048);
  
  // Get words
  const words = validIndices.map(idx => wordlist[idx]);
  const mnemonic = words.join(' ');
  
  await testMnemonic(method, mnemonic, results);
}

// ═══════════════════════════════════════════════════════════
// Helper: Test Mnemonic
// ═══════════════════════════════════════════════════════════

async function testMnemonic(method: string, mnemonic: string, results: TestResult[]): Promise<void> {
  const words = mnemonic.split(' ');
  const lastWord = words[words.length - 1];
  
  let validBIP39 = false;
  let matchesAddress = false;
  let address = '';
  
  try {
    validBIP39 = bip39.validateMnemonic(mnemonic);
    
    if (validBIP39) {
      const seed = await bip39.mnemonicToSeed(mnemonic);
      const root = bip32.fromSeed(seed);
      const child = root.derivePath("m/84'/0'/0'/0/0");
      const payment = bitcoin.payments.p2wpkh({
        pubkey: child.publicKey,
        network: bitcoin.networks.bitcoin
      });
      address = payment.address || '';
      matchesAddress = (address === TARGET_ADDRESS);
    }
  } catch (error) {
    // Invalid mnemonic
  }
  
  const matchesTrack = (lastWord === LAST_WORD_HINT);
  
  const result: TestResult = {
    method,
    mnemonic: validBIP39 ? mnemonic : undefined,
    lastWord,
    validBIP39,
    matchesTrack,
    matchesAddress,
    address: validBIP39 ? address : undefined
  };
  
  results.push(result);
  
  // Log interesting results
  if (matchesTrack || matchesAddress) {
    console.log(`🎯 ${method}:`);
    console.log(`   Last word: "${lastWord}" ${matchesTrack ? '✅ TRACK!' : ''}`);
    console.log(`   Valid BIP39: ${validBIP39 ? '✅' : '❌'}`);
    if (validBIP39) {
      console.log(`   Address match: ${matchesAddress ? '🎉 SOLUTION FOUND!' : '❌'}`);
    }
    console.log();
  }
  
  if (matchesAddress) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎉 PUZZLE SOLVED! 🎉');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Method: ${method}`);
    console.log(`Mnemonic: ${mnemonic}`);
    console.log(`Address: ${address}`);
    console.log('═══════════════════════════════════════════════════════════\n');
  }
}

// ═══════════════════════════════════════════════════════════
// Main Execution
// ═══════════════════════════════════════════════════════════

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║      SYSTEMATIC ENTROPY GENERATOR - Hunghuatang Puzzle    ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  console.log(`🎯 Target: ${TARGET_ADDRESS}`);
  console.log(`💡 Hint: Last word must be "${LAST_WORD_HINT}" (index ${LAST_WORD_INDEX})\n`);
  
  const allResults: TestResult[] = [];
  
  // Run all approaches
  const cubeResults = await testCubeBasedApproach();
  allResults.push(...cubeResults);
  
  const hashResults = await testHashBasedEntropy();
  allResults.push(...hashResults);
  
  const multiResults = await testMultiRoundHashing();
  allResults.push(...multiResults);
  
  // Summary
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  SYSTEMATIC TESTING SUMMARY                               ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  const totalTests = allResults.length;
  const validBIP39Count = allResults.filter(r => r.validBIP39).length;
  const trackMatches = allResults.filter(r => r.matchesTrack).length;
  const solutions = allResults.filter(r => r.matchesAddress).length;
  
  console.log(`📊 Total approaches tested: ${totalTests}`);
  console.log(`   Valid BIP39 mnemonics: ${validBIP39Count}`);
  console.log(`   Mnemonics with "track": ${trackMatches}`);
  console.log(`   🎯 Solutions found: ${solutions}\n`);
  
  if (solutions > 0) {
    console.log('🎉 PUZZLE SOLVED!\n');
    const solution = allResults.find(r => r.matchesAddress);
    if (solution) {
      console.log(`Winning method: ${solution.method}`);
      console.log(`Mnemonic: ${solution.mnemonic}\n`);
    }
  } else {
    console.log('⏳ No solution found yet. Continue testing...\n');
    console.log('Next steps:');
    console.log('1. Test more hash algorithms');
    console.log('2. Try grid transformations');
    console.log('3. Analyze Reddit comments for cube-sum table clue');
    console.log('4. Test custom seed combinations\n');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { testCubeBasedApproach, testHashBasedEntropy, testMultiRoundHashing };
