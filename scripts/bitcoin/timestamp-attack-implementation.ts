#!/usr/bin/env node --import tsx
/**
 * Timestamp-Based Attack on Weak PyBTC Shamir Implementation
 * 
 * CRITICAL VULNERABILITY FOUND in commit 449bd5b (before July 10, 2021 fix):
 * 
 * OLD CODE (VULNERABLE):
 *   a = random.SystemRandom().randint(0, 255)
 *   i = int((time.time() % 0.0001) * 1000000) + 1
 *   q.append((a * i) % 255)
 * 
 * The coefficient generation uses:
 *   - time.time() modulo 0.0001 
 *   - Multiplied by 1,000,000
 *   - Plus 1
 *   - Result: i ranges from 1 to 100
 * 
 * This means:
 *   - coefficient = (random_byte * timestamp_factor) % 255
 *   - timestamp_factor is predictable based on generation time
 *   - Search space: Only 100 possible values per coefficient!
 * 
 * Attack strategy:
 *   - Transaction timestamp: October 13, 2022 (1665622114)
 *   - Likely generation: Within 1 week before
 *   - For each second in window:
 *     - Calculate i = int((timestamp % 0.0001) * 1000000) + 1
 *     - Try all 256 values of 'a' (random byte)
 *     - Calculate coefficients
 *     - Check if they produce our known shares
 */

import * as crypto from 'crypto';
import bip39 from 'bip39';
import { BIP32Factory } from 'bip32';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';

// Import GF(256) operations from our port
import {
  gf256Mul,
  gf256Add,
  gf256Pow,
  lagrangeInterpolation
} from './pybtc-rng-port.js';

// ═══════════════════════════════════════════════════════════
// Known Challenge Data
// ═══════════════════════════════════════════════════════════

const SHARE_1 = {
  index: 9,
  entropy: Buffer.from('c5a4d592c58ece4d944f00f1e14435f4', 'hex')
};

const SHARE_2 = {
  index: 13,
  entropy: Buffer.from('284b7f13a9821e86990e8aa9e5778fa0', 'hex')
};

const TARGET_ADDRESS = 'bc1qyjwa0tf0en4x09magpuwmt2smpsrlaxwn85lh6';
const TX_TIMESTAMP = 1665622114; // October 13, 2022 01:35:14 UTC
const SEARCH_WINDOW_DAYS = 7;

// ═══════════════════════════════════════════════════════════
// Vulnerable Coefficient Generation (OLD PyBTC)
// ═══════════════════════════════════════════════════════════

/**
 * Replicate the VULNERABLE coefficient generation from old pybtc
 * 
 * Original Python:
 *   i = int((time.time() % 0.0001) * 1000000) + 1
 *   coefficient = (random_byte * i) % 255
 */
function generateVulnerableCoefficient(randomByte: number, timestamp: number): number {
  // time.time() % 0.0001 gives fractional part with 4 decimal places
  // Multiply by 1,000,000 and add 1
  const timeFactor = Math.floor((timestamp % 0.0001) * 1000000) + 1;
  
  // Coefficient is (random * timeFactor) % 255
  return (randomByte * timeFactor) % 255;
}

/**
 * Given a timestamp, calculate what the time factor would be
 */
function calculateTimeFactor(timestamp: number): number {
  return Math.floor((timestamp % 0.0001) * 1000000) + 1;
}

// ═══════════════════════════════════════════════════════════
// Polynomial Evaluation (from old code)
// ═══════════════════════════════════════════════════════════

function evaluatePolynomialAtIndex(x: number, coefficients: number[]): number {
  let result = 0;
  
  for (let i = 0; i < coefficients.length; i++) {
    const term = gf256Mul(coefficients[i], gf256Pow(x, i));
    result = gf256Add(result, term);
  }
  
  return result;
}

// ═══════════════════════════════════════════════════════════
// BIP39/BIP84 Address Derivation
// ═══════════════════════════════════════════════════════════

async function entropyToAddress(entropy: Buffer): Promise<string> {
  const bip32 = BIP32Factory(ecc);
  
  try {
    // Convert entropy to mnemonic
    const mnemonic = bip39.entropyToMnemonic(entropy.toString('hex'));
    
    // Generate seed
    const seed = await bip39.mnemonicToSeed(mnemonic);
    
    // Derive key at BIP84 path
    const root = bip32.fromSeed(seed);
    const child = root.derivePath("m/84'/0'/0'/0/0");
    
    // Generate address
    const { address } = bitcoin.payments.p2wpkh({
      pubkey: child.publicKey,
      network: bitcoin.networks.bitcoin
    });
    
    return address || '';
  } catch (error) {
    return '';
  }
}

// ═══════════════════════════════════════════════════════════
// Timestamp Attack Implementation
// ═══════════════════════════════════════════════════════════

interface AttackResult {
  found: boolean;
  timestamp?: number;
  timeFactor?: number;
  randomBytes?: number[];
  coefficients?: number[][];
  secret?: Buffer;
  mnemonic?: string;
  address?: string;
}

/**
 * For a given timestamp and set of random bytes, reconstruct the secret
 */
async function attackWithTimestamp(
  timestamp: number,
  randomBytesPerCoeff: number[][]
): Promise<AttackResult | null> {
  const timeFactor = calculateTimeFactor(timestamp);
  
  // For each byte of the secret (16 bytes for 128-bit entropy)
  const secretBytes: number[] = [];
  
  for (let byteIdx = 0; byteIdx < 16; byteIdx++) {
    // Build polynomial coefficients for this byte
    // q = [secret_byte, coeff1, coeff2] for threshold=3
    
    const share1Value = SHARE_1.entropy[byteIdx];
    const share2Value = SHARE_2.entropy[byteIdx];
    
    // Try all possible random bytes for the 2 coefficients
    for (const [randByte1, randByte2] of randomBytesPerCoeff) {
      const coeff1 = generateVulnerableCoefficient(randByte1, timestamp);
      const coeff2 = generateVulnerableCoefficient(randByte2, timestamp);
      
      // Try all possible secret bytes (0-255)
      for (let secretByte = 0; secretByte < 256; secretByte++) {
        const coefficients = [secretByte, coeff1, coeff2];
        
        // Check if this produces our known shares
        const computedShare1 = evaluatePolynomialAtIndex(SHARE_1.index, coefficients);
        const computedShare2 = evaluatePolynomialAtIndex(SHARE_2.index, coefficients);
        
        if (computedShare1 === share1Value && computedShare2 === share2Value) {
          secretBytes.push(secretByte);
          break;
        }
      }
      
      if (secretBytes.length === byteIdx + 1) {
        break; // Found a match for this byte
      }
    }
    
    if (secretBytes.length !== byteIdx + 1) {
      return null; // Couldn't find match for this byte
    }
  }
  
  // If we got here, we found all 16 bytes!
  const secret = Buffer.from(secretBytes);
  const mnemonic = bip39.entropyToMnemonic(secret.toString('hex'));
  const address = await entropyToAddress(secret);
  
  return {
    found: true,
    timestamp,
    timeFactor,
    randomBytes: randomBytesPerCoeff.flat(),
    secret,
    mnemonic,
    address
  };
}

/**
 * Main parallel timestamp attack
 */
async function executeTimestampAttack(): Promise<AttackResult> {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║    Timestamp-Based Attack on Weak PyBTC Implementation       ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  console.log('📋 Attack Parameters:\n');
  console.log(`   Target address: ${TARGET_ADDRESS}`);
  console.log(`   Transaction time: ${new Date(TX_TIMESTAMP * 1000).toISOString()}`);
  console.log(`   Search window: ${SEARCH_WINDOW_DAYS} days before transaction`);
  console.log(`   Timestamp range: ${SEARCH_WINDOW_DAYS * 24 * 3600} seconds\n`);
  
  console.log('🔍 Vulnerability Explanation:\n');
  console.log('   OLD PyBTC code used:');
  console.log('     i = int((time.time() % 0.0001) * 1000000) + 1');
  console.log('     coefficient = (random_byte * i) % 255\n');
  console.log('   This means:');
  console.log('     - Time factor (i) ranges from 1 to 100');
  console.log('     - For each timestamp, only 100 possible values');
  console.log('     - Combined with random byte (256 values)');
  console.log('     - Total: 25,600 possibilities per coefficient\n');
  
  const searchWindowSeconds = SEARCH_WINDOW_DAYS * 24 * 3600;
  const startTimestamp = TX_TIMESTAMP - searchWindowSeconds;
  
  console.log(`⏰ Starting attack...`);
  console.log(`   Testing ${searchWindowSeconds.toLocaleString()} timestamps\n`);
  
  // Generate all possible random byte pairs for 2 coefficients
  const randomBytePairs: [number, number][] = [];
  for (let a = 0; a < 256; a++) {
    for (let b = 0; b < 256; b++) {
      randomBytePairs.push([a, b]);
    }
  }
  
  console.log(`   Random byte combinations: ${randomBytePairs.length.toLocaleString()}\n`);
  
  // Attack each timestamp
  let tested = 0;
  const startTime = Date.now();
  
  for (let ts = startTimestamp; ts <= TX_TIMESTAMP; ts++) {
    if (tested % 10000 === 0 && tested > 0) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = tested / elapsed;
      const remaining = (TX_TIMESTAMP - ts) / rate;
      console.log(`   Progress: ${tested.toLocaleString()} timestamps tested (${rate.toFixed(0)} ts/sec, ${remaining.toFixed(0)}s remaining)`);
    }
    
    const result = await attackWithTimestamp(ts, randomBytePairs);
    tested++;
    
    if (result && result.address === TARGET_ADDRESS) {
      console.log('\n🎉 SUCCESS! Match found!\n');
      return result;
    }
  }
  
  console.log('\n❌ Attack failed - no match found in timestamp window\n');
  return { found: false };
}

// ═══════════════════════════════════════════════════════════
// Main Execution
// ═══════════════════════════════════════════════════════════

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('\n🚀 Phase 2 - RNG Deep Dive: Timestamp Attack Execution\n');
  
  console.log('⚠️  IMPORTANT DISCOVERY:\n');
  console.log('   Vulnerable PyBTC version found in commit 449bd5b (pre-July 2021)');
  console.log('   Uses weak coefficient generation with time.time()\n');
  console.log('   Fixed in commit 77be7d4 (v2.3.10, July 10, 2021)\n');
  
  console.log('❓ KEY QUESTION:\n');
  console.log('   Was the challenge created with OLD (vulnerable) or NEW (secure) version?\n');
  console.log('   Transaction date: October 2022');
  console.log('   Security fix: July 2021\n');
  console.log('   If using NEWER version → This attack will NOT work');
  console.log('   If using OLDER version → This attack has HIGH success chance\n');
  
  console.log('📊 Attack Complexity:\n');
  console.log('   Timestamps to test: ~604,800 (1 week)');
  console.log('   Random byte pairs per timestamp: 65,536');
  console.log('   Secret bytes: 16');
  console.log('   Total combinations: Manageable with optimization\n');
  
  console.log('⏰ Estimated execution time: Hours (for full search)\n');
  
  console.log('🔧 RECOMMENDATION:\n');
  console.log('   1. Test a small subset first (1 day window)');
  console.log('   2. If match found → Execute full attack');
  console.log('   3. If no match → Puzzle likely uses secure version\n');
  
  const shouldRun = process.argv.includes('--execute');
  
  if (!shouldRun) {
    console.log('ℹ️  To execute the attack, run with --execute flag:\n');
    console.log('   node --import tsx scripts/bitcoin/timestamp-attack-implementation.ts --execute\n');
    console.log('   WARNING: This will take HOURS to complete!\n');
  } else {
    executeTimestampAttack()
      .then(result => {
        if (result.found) {
          console.log('═══════════════════════════════════════════════════════════════');
          console.log('SUCCESS! Secret recovered!');
          console.log('═══════════════════════════════════════════════════════════════\n');
          console.log(`Timestamp: ${new Date(result.timestamp! * 1000).toISOString()}`);
          console.log(`Time Factor: ${result.timeFactor}`);
          console.log(`Secret: ${result.secret!.toString('hex')}`);
          console.log(`Mnemonic: ${result.mnemonic}`);
          console.log(`Address: ${result.address}\n`);
        } else {
          console.log('Attack completed - no match found.');
          console.log('Puzzle likely uses secure PyBTC version (post-July 2021).\n');
        }
      })
      .catch(error => {
        console.error('Error during attack:', error);
        process.exit(1);
      });
  }
}

export {
  generateVulnerableCoefficient,
  calculateTimeFactor,
  executeTimestampAttack
};
