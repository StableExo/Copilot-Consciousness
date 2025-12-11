/**
 * Puzzle Mnemonic Solver - Apply Validated Transformations
 * 
 * This script applies validated transformation methodologies to the Bitcoin puzzle.
 * 
 * 🔒 CRITICAL SECURITY:
 * - Discovered mnemonics are ONLY displayed in terminal output
 * - NEVER saved to files, git commits, or logs
 * - Session output is private between user and this script
 * - Clear your terminal after viewing to maintain security
 * 
 * Usage:
 *   npm run solve:puzzle
 * 
 * The script will:
 * 1. Load puzzle numbers from MNEMONIC_PUZZLE_ACTUAL_DATA.md
 * 2. Apply validated transformation types
 * 3. Test each generated mnemonic against target address
 * 4. Output ONLY to terminal (nothing saved)
 */

import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';

const bip32 = BIP32Factory(ecc);

// Puzzle data from MNEMONIC_PUZZLE_ACTUAL_DATA.md
const PUZZLE_NUMBERS = [
  512, 128, 256, 64, 32, 16, 8, 4, 2, 1,
  1024, 2048, 4096, 8192, 16384, 32768,
  65536, 131072, 262144, 524288, 1048576,
  2097152, 4194304, 8388608
];

const TARGET_ADDRESS = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
const PUZZLE_REWARD = '0.08252025 BTC (~$5,500)';

const DERIVATION_PATHS = [
  "m/84'/0'/0'/0/0",   // BIP84 standard
  "m/84'/0'/0'/0/1",   // Second address
  "m/84'/0'/0'/0/2",   // Third address
  "m/84'/0'/0'/1/0",   // Change address
  "m/49'/0'/0'/0/0",   // BIP49
  "m/44'/0'/0'/0/0",   // BIP44
];

interface Transformation {
  name: string;
  generate: (numbers: number[], param: number) => string;
  parameterRange: [number, number, number]; // [min, max, step]
}

const TRANSFORMATIONS: Transformation[] = [
  {
    name: 'Log2Multiply',
    generate: (numbers, multiplier) => {
      const wordlist = bip39.wordlists.english;
      const words = numbers.map(num => {
        const log2Val = Math.log2(num);
        const index = Math.floor(log2Val * multiplier) % wordlist.length;
        return wordlist[index];
      });
      return words.join(' ');
    },
    parameterRange: [79.5, 81.5, 0.001] // Fine-grained search around 80.18
  },
  {
    name: 'Log2MultiplyRounded',
    generate: (numbers, multiplier) => {
      const wordlist = bip39.wordlists.english;
      const words = numbers.map(num => {
        const log2Val = Math.log2(num);
        const index = Math.round(log2Val * multiplier) % wordlist.length; // Using round instead of floor
        return wordlist[index];
      });
      return words.join(' ');
    },
    parameterRange: [79.5, 81.5, 0.001]
  },
  {
    name: 'Division',
    generate: (numbers, divisor) => {
      const wordlist = bip39.wordlists.english;
      const words = numbers.map(num => {
        const index = Math.floor(num / divisor) % wordlist.length;
        return wordlist[index];
      });
      return words.join(' ');
    },
    parameterRange: [4500, 4600, 0.1] // Finer search
  },
  {
    name: 'XOR',
    generate: (numbers, constant) => {
      const wordlist = bip39.wordlists.english;
      const words = numbers.map(num => {
        const index = (num ^ Math.floor(constant)) % wordlist.length;
        return wordlist[index];
      });
      return words.join(' ');
    },
    parameterRange: [8380000, 8400000, 100] // Focused search
  }
];

function deriveAddress(mnemonic: string, path: string): string | null {
  try {
    if (!bip39.validateMnemonic(mnemonic)) {
      return null;
    }
    
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const network = bitcoin.networks.bitcoin;
    const root = bip32.fromSeed(seed, network);
    const child = root.derivePath(path);
    
    if (!child.publicKey) {
      return null;
    }
    
    const { address } = bitcoin.payments.p2wpkh({
      pubkey: child.publicKey,
      network
    });
    
    return address || null;
  } catch {
    return null;
  }
}

function testMnemonicAgainstPuzzle(mnemonic: string, transformName: string, param: number): boolean {
  // Validate BIP39
  if (!bip39.validateMnemonic(mnemonic)) {
    return false;
  }
  
  const words = mnemonic.split(' ');
  const lastWord = words[23];
  
  // Test all derivation paths
  for (const path of DERIVATION_PATHS) {
    const address = deriveAddress(mnemonic, path);
    if (address === TARGET_ADDRESS) {
      // 🎉 PUZZLE SOLVED - Output ONLY to terminal
      console.log('\n' + '='.repeat(80));
      console.log('🎉🎉🎉 PUZZLE SOLVED! 🎉🎉🎉');
      console.log('='.repeat(80));
      console.log('');
      console.log(`✅ Transformation: ${transformName}`);
      console.log(`✅ Parameter: ${param}`);
      console.log(`✅ Derivation Path: ${path}`);
      console.log(`✅ Address Match: ${TARGET_ADDRESS}`);
      console.log(`💰 Reward: ${PUZZLE_REWARD}`);
      console.log('');
      console.log('🔒 CRITICAL - PRIVATE INFORMATION:');
      console.log('   The mnemonic below is shown ONLY in this terminal.');
      console.log('   It is NOT saved anywhere. Write it down now.');
      console.log('   Clear your terminal after viewing.');
      console.log('');
      console.log('📝 SOLUTION MNEMONIC (24 words):');
      console.log('   ' + mnemonic);
      console.log('');
      console.log(`   Last word: "${lastWord}"`);
      console.log('');
      console.log('='.repeat(80));
      console.log('✅ Session complete. Clear terminal now for security.');
      console.log('='.repeat(80));
      console.log('');
      return true;
    }
  }
  
  return false;
}

async function solvePuzzle(): Promise<void> {
  console.log('🔍 Bitcoin Puzzle Solver');
  console.log('='.repeat(80));
  console.log('');
  console.log('🔒 Security: All output is terminal-only. Nothing is saved.');
  console.log('');
  console.log(`Target Address: ${TARGET_ADDRESS}`);
  console.log(`Reward: ${PUZZLE_REWARD}`);
  console.log(`Testing ${TRANSFORMATIONS.length} transformation types...`);
  console.log('');
  console.log('='.repeat(80));
  
  let totalTested = 0;
  let validBIP39Count = 0;
  
  for (const transformation of TRANSFORMATIONS) {
    console.log('');
    console.log(`Testing: ${transformation.name}`);
    console.log(`Parameter range: ${transformation.parameterRange[0]} to ${transformation.parameterRange[1]}`);
    
    const [min, max, step] = transformation.parameterRange;
    let testedInTransformation = 0;
    
    for (let param = min; param <= max; param += step) {
      const mnemonic = transformation.generate(PUZZLE_NUMBERS, param);
      totalTested++;
      testedInTransformation++;
      
      // Check if valid BIP39
      if (!bip39.validateMnemonic(mnemonic)) {
        continue;
      }
      
      validBIP39Count++;
      const words = mnemonic.split(' ');
      const lastWord = words[23];
      
      // Progress indicator for valid BIP39 mnemonics
      if (validBIP39Count % 10 === 0) {
        console.log(`  ✓ Found ${validBIP39Count} valid BIP39 mnemonics so far...`);
      }
      
      // Check if "track" (the hint from the puzzle)
      if (lastWord === 'track') {
        console.log('');
        console.log(`  🎯 Found mnemonic with "track" as last word!`);
        console.log(`     Transformation: ${transformation.name}`);
        console.log(`     Parameter: ${param}`);
        console.log(`     Testing address derivation...`);
      }
      
      // Test against puzzle
      const solved = testMnemonicAgainstPuzzle(mnemonic, transformation.name, param);
      
      if (solved) {
        // Puzzle solved! Function above already printed everything.
        // Exit immediately to prevent further testing.
        return;
      }
    }
    
    console.log(`  Tested ${testedInTransformation} parameters in ${transformation.name}`);
  }
  
  console.log('');
  console.log('='.repeat(80));
  console.log('Summary');
  console.log('='.repeat(80));
  console.log(`Total mnemonics tested: ${totalTested}`);
  console.log(`Valid BIP39 mnemonics found: ${validBIP39Count}`);
  console.log('❌ No solution found in tested parameter ranges');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Expand parameter ranges');
  console.log('  2. Add more transformation types');
  console.log('  3. Analyze video for exact formula hints');
  console.log('');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('');
  console.log('⚠️  SECURITY REMINDER:');
  console.log('    If a solution is found, it will be shown ONLY in terminal.');
  console.log('    Write it down immediately and clear your terminal after.');
  console.log('');
  
  solvePuzzle().catch(console.error);
}

export { solvePuzzle, testMnemonicAgainstPuzzle, deriveAddress };
