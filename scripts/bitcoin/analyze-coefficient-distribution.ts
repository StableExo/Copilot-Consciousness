#!/usr/bin/env node
/**
 * Coefficient Distribution Analyzer
 * 
 * Analyzes the distribution of polynomial coefficients from our 2-share attack
 * to identify patterns that can help refine bias detection.
 * 
 * Goal: Reduce false positives from ~2,600 to ~1-10 candidates per byte
 */

import { createHash } from 'crypto';

// Known shares
const SHARE_1 = {
  index: 9,
  entropy: Buffer.from('c5a4d592c58ece4d944f00f1e14435f4', 'hex'),
};

const SHARE_2 = {
  index: 13,
  entropy: Buffer.from('284b7f13a9821e86990e8aa9e5778fa0', 'hex'),
};

const POSSIBLE_X3_INDICES = [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 14, 15];

// GF(256) implementation (same as before)
class GF256 {
  private expTable: Uint8Array;
  private logTable: Uint8Array;
  
  constructor() {
    this.expTable = new Uint8Array(255);
    this.logTable = new Uint8Array(256);
    this.precompute();
  }
  
  private precompute() {
    let poly = 1;
    for (let i = 0; i < 255; i++) {
      this.expTable[i] = poly;
      this.logTable[poly] = i;
      poly = (poly << 1) ^ poly;
      if (poly & 0x100) poly ^= 0x11b;
    }
  }
  
  add(a: number, b: number): number { return a ^ b; }
  sub(a: number, b: number): number { return a ^ b; }
  
  mul(a: number, b: number): number {
    if (a === 0 || b === 0) return 0;
    return this.expTable[(this.logTable[a] + this.logTable[b]) % 255];
  }
  
  div(a: number, b: number): number {
    if (b === 0) throw new Error('Division by zero');
    if (a === 0) return 0;
    return this.expTable[(this.logTable[a] - this.logTable[b] + 255) % 255];
  }
}

class LagrangeSSS {
  private gf: GF256;
  
  constructor() {
    this.gf = new GF256();
  }
  
  interpolate(points: [number, number][]): number {
    let secret = 0;
    const k = points.length;
    
    for (let j = 0; j < k; j++) {
      let numerator = 1;
      let denominator = 1;
      
      for (let m = 0; m < k; m++) {
        if (m === j) continue;
        numerator = this.gf.mul(numerator, points[m][0]);
        const diff = this.gf.sub(points[j][0], points[m][0]);
        denominator = this.gf.mul(denominator, diff);
      }
      
      const basis = this.gf.div(numerator, denominator);
      const term = this.gf.mul(points[j][1], basis);
      secret = this.gf.add(secret, term);
    }
    
    return secret;
  }
  
  extractCoefficients(points: [number, number][]): number[] {
    const [x1, y1] = points[0];
    const [x2, y2] = points[1];
    const [x3, y3] = points[2];
    
    const a0 = this.interpolate(points);
    
    const d1 = this.gf.sub(y1, a0);
    const d2 = this.gf.sub(y2, a0);
    
    const x1_2 = this.gf.mul(x1, x1);
    const x2_2 = this.gf.mul(x2, x2);
    
    const numerator = this.gf.sub(
      this.gf.mul(d1, x2),
      this.gf.mul(d2, x1)
    );
    const denominator = this.gf.sub(
      this.gf.mul(x1_2, x2),
      this.gf.mul(x2_2, x1)
    );
    
    let a2 = 0;
    if (denominator !== 0) {
      a2 = this.gf.div(numerator, denominator);
    }
    
    let a1 = 0;
    if (x1 !== 0) {
      a1 = this.gf.div(
        this.gf.sub(d1, this.gf.mul(a2, x1_2)),
        x1
      );
    }
    
    return [a0, a1, a2];
  }
}

// Analyze coefficient distributions
function analyzeDistributions() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║     COEFFICIENT DISTRIBUTION ANALYSIS                   ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  
  const sss = new LagrangeSSS();
  const byteIndex = 0; // Analyze first byte
  
  const knownY1 = SHARE_1.entropy[byteIndex];
  const knownY2 = SHARE_2.entropy[byteIndex];
  const x1 = SHARE_1.index;
  const x2 = SHARE_2.index;
  
  console.log(`Analyzing byte ${byteIndex}:`);
  console.log(`  f(${x1}) = ${knownY1}`);
  console.log(`  f(${x2}) = ${knownY2}\n`);
  
  // Collect all coefficient values
  const a0_dist: number[] = [];
  const a1_dist: number[] = [];
  const a2_dist: number[] = [];
  
  for (const x3 of POSSIBLE_X3_INDICES) {
    for (let y3 = 0; y3 < 256; y3++) {
      const points: [number, number][] = [
        [x1, knownY1],
        [x2, knownY2],
        [x3, y3]
      ];
      
      try {
        const [a0, a1, a2] = sss.extractCoefficients(points);
        a0_dist.push(a0);
        a1_dist.push(a1);
        a2_dist.push(a2);
      } catch (e) {
        // Skip invalid points
      }
    }
  }
  
  console.log(`📊 Distribution Statistics:\n`);
  console.log(`Total combinations: ${a0_dist.length}\n`);
  
  // Analyze a0 (secret)
  console.log('═══ a0 (Secret/Constant Term) ═══');
  const a0_unique = [...new Set(a0_dist)];
  console.log(`  Unique values: ${a0_unique.length}`);
  console.log(`  Distribution: ${a0_unique.length === 256 ? 'All possible values (0-255)' : 'Restricted set'}`);
  
  // Count frequency
  const a0_freq: Map<number, number> = new Map();
  a0_dist.forEach(val => a0_freq.set(val, (a0_freq.get(val) || 0) + 1));
  
  // Find most common
  const a0_sorted = [...a0_freq.entries()].sort((a, b) => b[1] - a[1]);
  console.log(`  Most common: ${a0_sorted[0][0]} (appears ${a0_sorted[0][1]} times)`);
  console.log(`  Least common: ${a0_sorted[a0_sorted.length - 1][0]} (appears ${a0_sorted[a0_sorted.length - 1][1]} times)\n`);
  
  // Analyze a1 (linear coefficient)
  console.log('═══ a1 (Linear Coefficient) ═══');
  const a1_unique = [...new Set(a1_dist)];
  console.log(`  Unique values: ${a1_unique.length}`);
  
  const a1_freq: Map<number, number> = new Map();
  a1_dist.forEach(val => a1_freq.set(val, (a1_freq.get(val) || 0) + 1));
  
  const a1_sorted = [...a1_freq.entries()].sort((a, b) => b[1] - a[1]);
  console.log(`  Most common: ${a1_sorted[0][0]} (appears ${a1_sorted[0][1]} times)`);
  
  // Check for bias patterns
  const a1_has_255 = a1_dist.includes(255);
  const a1_has_0 = a1_dist.includes(0);
  console.log(`  Contains 255: ${a1_has_255 ? 'Yes' : 'No'}`);
  console.log(`  Contains 0: ${a1_has_0 ? 'Yes' : 'No'}`);
  
  // Distribution of values
  const a1_low = a1_dist.filter(v => v < 50).length;
  const a1_mid = a1_dist.filter(v => v >= 50 && v < 200).length;
  const a1_high = a1_dist.filter(v => v >= 200).length;
  console.log(`  Distribution: Low (0-49): ${a1_low}, Mid (50-199): ${a1_mid}, High (200-255): ${a1_high}\n`);
  
  // Analyze a2 (quadratic coefficient)
  console.log('═══ a2 (Quadratic Coefficient) ═══');
  const a2_unique = [...new Set(a2_dist)];
  console.log(`  Unique values: ${a2_unique.length}`);
  
  const a2_freq: Map<number, number> = new Map();
  a2_dist.forEach(val => a2_freq.set(val, (a2_freq.get(val) || 0) + 1));
  
  const a2_sorted = [...a2_freq.entries()].sort((a, b) => b[1] - a[1]);
  console.log(`  Most common: ${a2_sorted[0][0]} (appears ${a2_sorted[0][1]} times)`);
  
  const a2_has_255 = a2_dist.includes(255);
  const a2_has_0 = a2_dist.includes(0);
  console.log(`  Contains 255: ${a2_has_255 ? 'Yes' : 'No'}`);
  console.log(`  Contains 0: ${a2_has_0 ? 'Yes' : 'No'}`);
  
  const a2_low = a2_dist.filter(v => v < 50).length;
  const a2_mid = a2_dist.filter(v => v >= 50 && v < 200).length;
  const a2_high = a2_dist.filter(v => v >= 200).length;
  console.log(`  Distribution: Low (0-49): ${a2_low}, Mid (50-199): ${a2_mid}, High (200-255): ${a2_high}\n`);
  
  // Cross-correlation analysis
  console.log('═══ Cross-Correlation Analysis ═══');
  let both_zero = 0;
  let both_nonzero = 0;
  let both_extreme = 0;
  
  for (let i = 0; i < a1_dist.length; i++) {
    if (a1_dist[i] === 0 && a2_dist[i] === 0) both_zero++;
    if (a1_dist[i] !== 0 && a2_dist[i] !== 0) both_nonzero++;
    if ((a1_dist[i] < 10 || a1_dist[i] > 245) && (a2_dist[i] < 10 || a2_dist[i] > 245)) both_extreme++;
  }
  
  console.log(`  Both a1 and a2 are zero: ${both_zero}`);
  console.log(`  Both a1 and a2 are non-zero: ${both_nonzero}`);
  console.log(`  Both a1 and a2 are extreme: ${both_extreme}\n`);
  
  // Recommendations
  console.log('═══ Bias Detection Recommendations ═══\n');
  
  if (!a1_has_255 && !a2_has_255) {
    console.log('  ✅ Confirmed: a1 and a2 never equal 255');
    console.log('     Keep: Reject if a1 === 255 || a2 === 255');
  }
  
  if (!a1_has_0 && !a2_has_0) {
    console.log('  ✅ Confirmed: a1 and a2 never equal 0');
    console.log('     Keep: Reject if a1 === 0 || a2 === 0');
  }
  
  const a1_extreme_pct = ((a1_low + a1_high) / a1_dist.length * 100).toFixed(2);
  const a2_extreme_pct = ((a2_low + a2_high) / a2_dist.length * 100).toFixed(2);
  console.log(`\n  📊 ${a1_extreme_pct}% of a1 values are extreme (< 50 or > 200)`);
  console.log(`  📊 ${a2_extreme_pct}% of a2 values are extreme (< 50 or > 200)`);
  
  if (parseFloat(a1_extreme_pct) > 50 || parseFloat(a2_extreme_pct) > 50) {
    console.log('     ⚠️  Extreme values are common - cannot use extreme filtering');
  } else {
    console.log('     ✅ Can potentially filter extreme values');
  }
  
  console.log('\n  💡 Key Insight:');
  console.log('     With 2 shares, we have infinite solutions mathematically.');
  console.log('     Need to use EXTERNAL constraints (e.g., timestamp RNG, third share index hints)');
  console.log('     to narrow down candidates.\n');
}

// Main execution
async function main() {
  analyzeDistributions();
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

export { analyzeDistributions };
