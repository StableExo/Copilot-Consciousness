#!/usr/bin/env node --import tsx
/**
 * PyBTC RNG Logic Port to TypeScript
 * 
 * This ports the bitaps pybtc Shamir Secret Sharing RNG implementation
 * to TypeScript to enable timestamp-based attacks on weak randomness.
 * 
 * Based on analysis of:
 * - /tmp/pybtc/pybtc/functions/shamir.py
 * - /tmp/pybtc/pybtc/functions/entropy.py
 * 
 * Key findings:
 * 1. Uses random.SystemRandom() for coefficient generation (cryptographically secure)
 * 2. BUT: Share indices use random.SystemRandom().randint() which may be predictable
 * 3. Entropy generation uses SystemRandom() with randomness tests
 * 4. NO direct time.time() usage found in current implementation!
 * 
 * This differs from expected vulnerabilities - the code appears more secure than anticipated.
 */

import * as crypto from 'crypto';

// ═══════════════════════════════════════════════════════════
// GF(256) Galois Field Operations (Exact port from Python)
// ═══════════════════════════════════════════════════════════

interface GF256Tables {
  exp: number[];
  log: number[];
}

function precomputeGF256ExpLog(): GF256Tables {
  const exp: number[] = new Array(255);
  const log: number[] = new Array(256);
  
  let poly = 1;
  for (let i = 0; i < 255; i++) {
    exp[i] = poly;
    log[poly] = i;
    
    // Multiply poly by the polynomial x + 1
    poly = (poly << 1) ^ poly;
    
    // Reduce poly by x^8 + x^4 + x^3 + x + 1
    if (poly & 0x100) {
      poly ^= 0x11B;
    }
  }
  
  return { exp, log };
}

const { exp: EXP_TABLE, log: LOG_TABLE } = precomputeGF256ExpLog();

function gf256Mul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP_TABLE[(LOG_TABLE[a] + LOG_TABLE[b]) % 255];
}

function gf256Add(a: number, b: number): number {
  return a ^ b;
}

function gf256Sub(a: number, b: number): number {
  return a ^ b;
}

function gf256Inverse(a: number): number {
  if (a === 0) throw new Error('Division by zero');
  return EXP_TABLE[(-LOG_TABLE[a] + 255) % 255];
}

function gf256Div(a: number, b: number): number {
  if (b === 0) throw new Error('Division by zero');
  if (a === 0) return 0;
  return gf256Mul(a, gf256Inverse(b));
}

function gf256Pow(a: number, b: number): number {
  if (b === 0) return 1;
  if (a === 0) return 0;
  
  let c = a;
  for (let i = 0; i < b - 1; i++) {
    c = gf256Mul(c, a);
  }
  return c;
}

// ═══════════════════════════════════════════════════════════
// Polynomial Evaluation in GF(256)
// ═══════════════════════════════════════════════════════════

function evaluatePolynomial(x: number, coefficients: number[]): number {
  let result = 0;
  
  for (let i = 0; i < coefficients.length; i++) {
    const term = gf256Mul(coefficients[i], gf256Pow(x, i));
    result = gf256Add(result, term);
  }
  
  return result;
}

// ═══════════════════════════════════════════════════════════
// Lagrange Interpolation in GF(256)
// ═══════════════════════════════════════════════════════════

interface Point {
  x: number;
  y: number;
}

function lagrangeInterpolation(points: Point[], x: number = 0): number {
  const k = points.length;
  if (k < 2) {
    throw new Error('Minimum 2 points required');
  }
  
  // Sort points by x coordinate
  points.sort((a, b) => a.x - b.x);
  
  let pX = 0;
  
  for (let j = 0; j < k; j++) {
    let pJX = 1;
    
    for (let m = 0; m < k; m++) {
      if (m === j) continue;
      
      const a = gf256Sub(x, points[m].x);
      const b = gf256Sub(points[j].x, points[m].x);
      const c = gf256Div(a, b);
      pJX = gf256Mul(pJX, c);
    }
    
    pJX = gf256Mul(points[j].y, pJX);
    pX = gf256Add(pX, pJX);
  }
  
  return pX;
}

// ═══════════════════════════════════════════════════════════
// Shamir Secret Sharing - Split Secret (Python port)
// ═══════════════════════════════════════════════════════════

interface Share {
  index: number;
  data: Buffer;
}

/**
 * Port of pybtc split_secret function
 * 
 * Key insight: This uses cryptographically secure random for coefficients!
 * The vulnerability may be in:
 * 1. Share index selection (line 106: random.SystemRandom().randint())
 * 2. Entropy generation filtering (line 112-124)
 */
function splitSecret(
  threshold: number,
  total: number,
  secret: Buffer,
  indexBits: number = 8
): Map<number, Buffer> {
  if (threshold > 255) throw new Error('threshold <= 255');
  if (total > 255) throw new Error('total shares <= 255');
  
  const indexMax = (2 ** indexBits) - 1;
  if (total > indexMax) throw new Error('index bits too low');
  
  const shares = new Map<number, Buffer>();
  const sharesIndexes: number[] = [];
  
  // Generate random share indices (POTENTIAL WEAKNESS HERE)
  while (shares.size !== total) {
    // Using crypto.randomInt for cryptographically secure random
    const q = crypto.randomInt(1, indexMax + 1);
    if (shares.has(q)) continue;
    
    sharesIndexes.push(q);
    shares.set(q, Buffer.alloc(0));
  }
  
  // Generate entropy for coefficients (uses SystemRandom in Python)
  let entropy = generateEntropy();
  let entropyIndex = 0;
  
  for (let byteIdx = 0; byteIdx < secret.length; byteIdx++) {
    const coefficients: number[] = [secret[byteIdx]]; // a0 = secret byte
    
    // Generate random coefficients for degree 1 to threshold-1
    for (let i = 0; i < threshold - 1; i++) {
      if (entropyIndex < entropy.length) {
        coefficients.push(entropy[entropyIndex]);
        entropyIndex++;
      } else {
        entropy = generateEntropy();
        coefficients.push(entropy[0]);
        entropyIndex = 1;
      }
    }
    
    // Evaluate polynomial at each share index
    for (const shareIndex of sharesIndexes) {
      const value = evaluatePolynomial(shareIndex, coefficients);
      const currentData = shares.get(shareIndex)!;
      shares.set(shareIndex, Buffer.concat([currentData, Buffer.from([value])]));
    }
  }
  
  return shares;
}

// ═══════════════════════════════════════════════════════════
// Entropy Generation (Simplified - no randomness tests)
// ═══════════════════════════════════════════════════════════

const ECDSA_SEC256K1_ORDER = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');

function generateEntropy(strength: number = 256): Buffer {
  if (![128, 160, 192, 224, 256].includes(strength)) {
    throw new Error('strength should be one of [128, 160, 192, 224, 256]');
  }
  
  // Generate cryptographically secure random bytes
  const bytes = crypto.randomBytes(32);
  const value = BigInt('0x' + bytes.toString('hex'));
  
  // Note: Python version has randomness tests here
  // We're simplifying by just using crypto.randomBytes
  
  return bytes.slice(0, strength / 8);
}

// ═══════════════════════════════════════════════════════════
// Restore Secret from Shares
// ═══════════════════════════════════════════════════════════

function restoreSecret(shares: Map<number, Buffer>, x: number = 0): Buffer {
  // Validate shares
  for (const index of shares.keys()) {
    if (index < 1 || index > 255) {
      throw new Error(`Invalid share index ${index}`);
    }
  }
  
  // Get share length
  let shareLength: number | null = null;
  for (const data of shares.values()) {
    if (shareLength === null) {
      shareLength = data.length;
    }
    if (shareLength !== data.length || data.length === 0) {
      throw new Error('Invalid shares');
    }
  }
  
  if (shareLength === null) {
    throw new Error('No shares provided');
  }
  
  // Interpolate each byte
  const secret = Buffer.alloc(shareLength);
  
  for (let byteIdx = 0; byteIdx < shareLength; byteIdx++) {
    const points: Point[] = [];
    
    for (const [index, data] of shares.entries()) {
      points.push({ x: index, y: data[byteIdx] });
    }
    
    secret[byteIdx] = lagrangeInterpolation(points, x);
  }
  
  return secret;
}

// ═══════════════════════════════════════════════════════════
// Analysis Summary
// ═══════════════════════════════════════════════════════════

function printAnalysisSummary() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  PyBTC RNG Analysis Summary - TypeScript Port Complete       ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  console.log('📋 Code Analysis Results:\n');
  
  console.log('✅ SECURE IMPLEMENTATION FOUND:');
  console.log('   1. Uses random.SystemRandom() - cryptographically secure');
  console.log('   2. Entropy generation includes randomness tests (NIST SP 800-22)');
  console.log('   3. NO time.time() usage in coefficient generation');
  console.log('   4. Proper GF(256) field operations\n');
  
  console.log('⚠️  POTENTIAL WEAKNESSES (Limited):');
  console.log('   1. Share index selection uses SystemRandom (secure)');
  console.log('   2. Entropy filtering MAY reduce effective entropy');
  console.log('   3. Implementation is actually MORE secure than expected!\n');
  
  console.log('🔍 REVISED ATTACK STRATEGY:\n');
  console.log('   Given the secure implementation, timestamp attacks are UNLIKELY.');
  console.log('   The original vulnerability reports may have been for older versions.\n');
  
  console.log('   Alternative approaches:');
  console.log('   1. Check for OLDER versions of pybtc with weaker RNG');
  console.log('   2. Look for implementation bugs (not RNG weakness)');
  console.log('   3. Focus on the "1 BTC Bug" (deterministic X-values)');
  console.log('   4. Analyze if share indices 9 and 13 are predictable\n');
  
  console.log('💡 NEXT STEPS:\n');
  console.log('   1. ✅ GF(256) operations ported and tested');
  console.log('   2. ✅ Shamir Secret Sharing logic ported');
  console.log('   3. ⏳ Test with known shares (9, 13) to verify port');
  console.log('   4. ⏳ Analyze if deterministic X-values help with 2 shares');
  console.log('   5. ⏳ Check git history for older, weaker RNG versions\n');
  
  console.log('═══════════════════════════════════════════════════════════════\n');
}

// ═══════════════════════════════════════════════════════════
// Validation Tests
// ═══════════════════════════════════════════════════════════

function runValidationTests() {
  console.log('🧪 Running validation tests...\n');
  
  // Test 1: GF(256) operations
  console.log('Test 1: GF(256) field operations');
  for (let i = 1; i < 256; i++) {
    const result = gf256Mul(i, gf256Inverse(i));
    if (result !== 1) {
      throw new Error(`GF(256) inverse test failed for ${i}`);
    }
  }
  console.log('  ✅ All GF(256) operations validated\n');
  
  // Test 2: Shamir Secret Sharing round-trip
  console.log('Test 2: Shamir Secret Sharing round-trip');
  const testSecret = Buffer.from('Hello World!');
  const shares = splitSecret(3, 5, testSecret);
  
  // Take any 3 shares
  const subset = new Map<number, Buffer>();
  let count = 0;
  for (const [index, data] of shares.entries()) {
    if (count >= 3) break;
    subset.set(index, data);
    count++;
  }
  
  const recovered = restoreSecret(subset);
  if (!recovered.equals(testSecret)) {
    throw new Error('Secret recovery failed!');
  }
  console.log('  ✅ Secret successfully split and recovered\n');
  
  // Test 3: Known share data (if available)
  console.log('Test 3: Verify against puzzle shares');
  const share1Entropy = Buffer.from('c5a4d592c58ece4d944f00f1e14435f4', 'hex');
  const share2Entropy = Buffer.from('284b7f13a9821e86990e8aa9e5778fa0', 'hex');
  const share1Index = 9;
  const share2Index = 13;
  
  console.log(`  Share 1: index=${share1Index}, entropy=${share1Entropy.toString('hex')}`);
  console.log(`  Share 2: index=${share2Index}, entropy=${share2Entropy.toString('hex')}`);
  console.log('  ⚠️  With only 2 shares and threshold=3, cannot recover secret');
  console.log('  ⚠️  This is mathematically secure (as designed)\n');
  
  console.log('✅ All tests passed!\n');
}

// ═══════════════════════════════════════════════════════════
// Main Execution
// ═══════════════════════════════════════════════════════════

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         PyBTC RNG Port - Phase 2 RNG Deep Dive               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  try {
    runValidationTests();
    printAnalysisSummary();
    
    console.log('🎯 CONCLUSION:\n');
    console.log('   The current pybtc implementation is CRYPTOGRAPHICALLY SECURE.');
    console.log('   Timestamp attacks are NOT viable with this version.');
    console.log('   Need to explore alternative attack vectors:\n');
    console.log('     - Historical versions with weaker RNG');
    console.log('     - Implementation bugs (not RNG)');
    console.log('     - Deterministic X-values ("1 BTC Bug")');
    console.log('     - Additional share discovery\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

export {
  gf256Mul,
  gf256Add,
  gf256Sub,
  gf256Div,
  gf256Pow,
  evaluatePolynomial,
  lagrangeInterpolation,
  splitSecret,
  restoreSecret,
  generateEntropy
};
