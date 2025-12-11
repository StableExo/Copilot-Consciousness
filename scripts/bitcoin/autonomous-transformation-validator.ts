/**
 * Autonomous Transformation Validator
 * 
 * This script implements an autonomous experiment approach to validate
 * transformation methodologies on known 24-word mnemonics before applying
 * them to unknown puzzles.
 * 
 * Purpose:
 * - Test if we can reverse-engineer transformations from known wallets
 * - Validate that our transformation testing approach is sound
 * - Build confidence in the methodology before applying to puzzles
 * 
 * Approach:
 * 1. Take a known 24-word mnemonic + its derived address
 * 2. Convert the mnemonic words back to indices
 * 3. Try to find what transformation would produce these indices
 * 4. Validate by deriving address and confirming it matches
 * 
 * This is the "control experiment" - if we can't reverse-engineer
 * our own known wallet, we know the approach needs refinement.
 */

import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';

const bip32 = BIP32Factory(ecc);

interface TransformationTest {
  name: string;
  description: string;
  transform: (input: number, param: number) => number;
  reverseTransform?: (output: number, param: number) => number;
}

interface ValidationResult {
  transformationType: string;
  parameter: number;
  success: boolean;
  mnemonicMatches: boolean;
  addressMatches: boolean;
  derivedMnemonic?: string;
  derivedAddress?: string;
  confidence: number;
}

/**
 * Common derivation paths to test
 */
const DERIVATION_PATHS = [
  "m/84'/0'/0'/0/0",   // BIP84 standard (native SegWit)
  "m/49'/0'/0'/0/0",   // BIP49 (nested SegWit)
  "m/44'/0'/0'/0/0",   // BIP44 (legacy)
  "m/84'/0'/0'/0/1",   // Second address
  "m/84'/0'/0'/1/0",   // Change address
];

/**
 * Transformation types to test
 */
const TRANSFORMATIONS: TransformationTest[] = [
  {
    name: 'Log2Multiply',
    description: 'log2(n) * multiplier',
    transform: (n: number, multiplier: number) => 
      Math.floor(Math.log2(n) * multiplier) % 2048,
    reverseTransform: (index: number, multiplier: number) => 
      Math.pow(2, index / multiplier)
  },
  {
    name: 'DirectMapping',
    description: 'n % 2048 (modulo)',
    transform: (n: number) => n % 2048
  },
  {
    name: 'Division',
    description: 'n / divisor',
    transform: (n: number, divisor: number) => 
      Math.floor(n / divisor) % 2048,
    reverseTransform: (index: number, divisor: number) => 
      index * divisor
  },
  {
    name: 'XOR',
    description: 'n XOR constant',
    transform: (n: number, constant: number) => (n ^ constant) % 2048
  },
  {
    name: 'BitShift',
    description: 'n >> shift',
    transform: (n: number, shift: number) => (n >> shift) % 2048
  },
  {
    name: 'PiShift',
    description: 'n + pi_digit_at_position',
    transform: (n: number, multiplier: number) => {
      const piDigits = '31415926535897932384626433832795028841971693993751';
      const position = Math.floor(n * multiplier) % piDigits.length;
      return (n + parseInt(piDigits[position])) % 2048;
    }
  }
];

/**
 * Derive address from mnemonic using a specific path
 */
function deriveAddress(
  mnemonic: string, 
  derivationPath: string = "m/84'/0'/0'/0/0"
): string | null {
  try {
    if (!bip39.validateMnemonic(mnemonic)) {
      return null;
    }
    
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const network = bitcoin.networks.bitcoin;
    const root = bip32.fromSeed(seed, network);
    const child = root.derivePath(derivationPath);
    
    if (!child.publicKey) {
      return null;
    }
    
    const { address } = bitcoin.payments.p2wpkh({
      pubkey: child.publicKey,
      network
    });
    
    return address || null;
  } catch (error) {
    return null;
  }
}

/**
 * Convert mnemonic to word indices
 */
function mnemonicToIndices(mnemonic: string): number[] {
  const words = mnemonic.split(' ');
  const wordlist = bip39.wordlists.english;
  
  return words.map(word => {
    const index = wordlist.indexOf(word);
    if (index === -1) {
      throw new Error(`Invalid word: ${word}`);
    }
    return index;
  });
}

/**
 * Convert indices to mnemonic
 */
function indicesToMnemonic(indices: number[]): string {
  const wordlist = bip39.wordlists.english;
  return indices.map(i => wordlist[i]).join(' ');
}

/**
 * Try to find input numbers that produce the target indices
 * This is the reverse-engineering step
 */
function findSourceNumbers(
  targetIndices: number[],
  transformation: TransformationTest,
  parameterRange: [number, number, number] = [1, 100, 0.1]
): { numbers: number[], parameter: number } | null {
  
  const [minParam, maxParam, step] = parameterRange;
  
  // For transformations with reverse functions, try to work backwards
  if (transformation.reverseTransform) {
    for (let param = minParam; param <= maxParam; param += step) {
      const candidateNumbers = targetIndices.map(index => 
        transformation.reverseTransform!(index, param)
      );
      
      // Validate by transforming forward
      const resultIndices = candidateNumbers.map(n => 
        transformation.transform(n, param)
      );
      
      if (JSON.stringify(resultIndices) === JSON.stringify(targetIndices)) {
        return { numbers: candidateNumbers, parameter: param };
      }
    }
  }
  
  // For transformations without reverse, we'd need more sophisticated search
  // This is placeholder - in practice, might use optimization algorithms
  
  return null;
}

/**
 * Test if a transformation can explain the known mnemonic
 */
function testTransformation(
  knownMnemonic: string,
  knownAddress: string,
  transformation: TransformationTest,
  parameterRange?: [number, number, number]
): ValidationResult | null {
  
  console.log(`\nTesting transformation: ${transformation.name}`);
  console.log(`Description: ${transformation.description}`);
  
  try {
    // Get target indices from known mnemonic
    const targetIndices = mnemonicToIndices(knownMnemonic);
    
    console.log(`Target indices: ${targetIndices.slice(0, 5).join(', ')}...`);
    
    // Try to find source numbers
    const result = findSourceNumbers(targetIndices, transformation, parameterRange);
    
    if (!result) {
      console.log('❌ Could not find source numbers');
      return null;
    }
    
    console.log(`✅ Found potential source numbers (param: ${result.parameter})`);
    console.log(`Numbers: ${result.numbers.slice(0, 5).join(', ')}...`);
    
    // Validate: transform forward and check if mnemonic is valid
    const derivedIndices = result.numbers.map(n => 
      transformation.transform(n, result.parameter)
    );
    const derivedMnemonic = indicesToMnemonic(derivedIndices);
    
    const mnemonicMatches = derivedMnemonic === knownMnemonic;
    const isValidBIP39 = bip39.validateMnemonic(derivedMnemonic);
    
    console.log(`Mnemonic matches: ${mnemonicMatches ? '✅' : '❌'}`);
    console.log(`Valid BIP39: ${isValidBIP39 ? '✅' : '❌'}`);
    
    if (!isValidBIP39) {
      return {
        transformationType: transformation.name,
        parameter: result.parameter,
        success: false,
        mnemonicMatches,
        addressMatches: false,
        confidence: 0
      };
    }
    
    // Test all derivation paths
    let addressMatches = false;
    let matchedPath = '';
    
    for (const path of DERIVATION_PATHS) {
      const derivedAddress = deriveAddress(derivedMnemonic, path);
      if (derivedAddress === knownAddress) {
        addressMatches = true;
        matchedPath = path;
        console.log(`✅ Address matches at path: ${path}`);
        break;
      }
    }
    
    if (!addressMatches) {
      console.log('❌ Address does not match any standard path');
    }
    
    const confidence = (mnemonicMatches ? 0.5 : 0) + (addressMatches ? 0.5 : 0);
    
    return {
      transformationType: transformation.name,
      parameter: result.parameter,
      success: addressMatches && mnemonicMatches,
      mnemonicMatches,
      addressMatches,
      derivedMnemonic,
      derivedAddress: matchedPath,
      confidence
    };
    
  } catch (error) {
    console.log(`❌ Error: ${error}`);
    return null;
  }
}

/**
 * Main autonomous validation function
 */
async function runAutonomousValidation(
  knownMnemonic: string,
  knownAddress: string
): Promise<void> {
  
  console.log('🤖 Autonomous Transformation Validator');
  console.log('='.repeat(70));
  console.log('');
  console.log('Purpose: Validate transformation methodology on known wallet');
  console.log('');
  console.log('Known Mnemonic (first 3 words):');
  const words = knownMnemonic.split(' ');
  console.log(`  ${words.slice(0, 3).join(' ')}... (${words.length} words)`);
  console.log('');
  console.log(`Known Address: ${knownAddress}`);
  console.log('');
  console.log('='.repeat(70));
  
  // Validate the known mnemonic first
  if (!bip39.validateMnemonic(knownMnemonic)) {
    console.error('❌ The provided mnemonic is not valid BIP39!');
    return;
  }
  
  console.log('✅ Known mnemonic is valid BIP39');
  console.log('');
  
  // Verify we can derive the known address
  let verifiedPath = '';
  for (const path of DERIVATION_PATHS) {
    const addr = deriveAddress(knownMnemonic, path);
    if (addr === knownAddress) {
      verifiedPath = path;
      console.log(`✅ Verified: Known address derives from path ${path}`);
      break;
    }
  }
  
  if (!verifiedPath) {
    console.error('❌ Could not derive known address from known mnemonic!');
    console.log('   This suggests the address may use a non-standard derivation path.');
    return;
  }
  
  console.log('');
  console.log('🔬 Testing Transformations...');
  console.log('='.repeat(70));
  
  const results: ValidationResult[] = [];
  
  // Test each transformation type
  for (const transformation of TRANSFORMATIONS) {
    const result = testTransformation(
      knownMnemonic,
      knownAddress,
      transformation,
      [1, 100, 0.01] // parameter range
    );
    
    if (result) {
      results.push(result);
    }
  }
  
  console.log('');
  console.log('📊 Summary of Results');
  console.log('='.repeat(70));
  console.log('');
  
  if (results.length === 0) {
    console.log('❌ No transformations could explain the known wallet');
    console.log('');
    console.log('This suggests:');
    console.log('  1. The mnemonic was generated directly (not from a transformation)');
    console.log('  2. The transformation is more complex than tested');
    console.log('  3. Additional data/context is needed');
  } else {
    console.log(`Found ${results.length} potential transformation(s):\n`);
    
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.transformationType}`);
      console.log(`   Parameter: ${result.parameter}`);
      console.log(`   Mnemonic match: ${result.mnemonicMatches ? '✅' : '❌'}`);
      console.log(`   Address match: ${result.addressMatches ? '✅' : '❌'}`);
      console.log(`   Confidence: ${(result.confidence * 100).toFixed(0)}%`);
      console.log('');
    });
    
    const successfulResults = results.filter(r => r.success);
    
    if (successfulResults.length > 0) {
      console.log('🎉 SUCCESS! Found valid transformation(s)!');
      console.log('');
      console.log('This proves the methodology works for known wallets.');
      console.log('The same approach can now be applied to unknown puzzles.');
    } else {
      console.log('⚠️  Partial matches found, but no complete solutions.');
      console.log('');
      console.log('This suggests the transformation might be:');
      console.log('  - More complex (multiple steps)');
      console.log('  - Using different parameters');
      console.log('  - Requiring additional context');
    }
  }
  
  console.log('');
  console.log('='.repeat(70));
  console.log('✅ Autonomous validation complete');
  console.log('');
}

/**
 * Example usage with a test mnemonic
 */
async function main() {
  // For testing purposes, we'll generate a known wallet
  // In practice, you would use your actual known 24-word mnemonic
  
  console.log('🔧 Generating test wallet for demonstration...\n');
  
  // Generate a random 24-word mnemonic
  const testMnemonic = bip39.generateMnemonic(256); // 24 words
  const testAddress = deriveAddress(testMnemonic, "m/84'/0'/0'/0/0");
  
  if (!testAddress) {
    console.error('Failed to generate test address');
    return;
  }
  
  console.log('Generated test wallet:');
  console.log(`Mnemonic: ${testMnemonic.split(' ').slice(0, 3).join(' ')}...`);
  console.log(`Address: ${testAddress}`);
  console.log('');
  console.log('Note: In production, replace this with your actual known mnemonic');
  console.log('');
  console.log('='.repeat(70));
  console.log('');
  
  // Run the autonomous validation
  await runAutonomousValidation(testMnemonic, testAddress);
  
  console.log('');
  console.log('💡 Next Steps:');
  console.log('');
  console.log('1. Replace test mnemonic with your known 24-word wallet');
  console.log('2. Run validation to confirm methodology works');
  console.log('3. Apply same transformation testing to unknown puzzles');
  console.log('4. Document any successful transformations found');
  console.log('');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export {
  runAutonomousValidation,
  testTransformation,
  deriveAddress,
  mnemonicToIndices,
  indicesToMnemonic,
  TRANSFORMATIONS,
  DERIVATION_PATHS
};
