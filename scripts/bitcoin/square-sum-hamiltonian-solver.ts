/**
 * Square Sum Hamiltonian Path Solver for Bitcoin Puzzle
 * 
 * Based on Numberphile video transcript analysis:
 * The puzzle uses graph theory - specifically finding Hamiltonian paths
 * through a graph where nodes can be connected if they sum to a perfect square.
 * 
 * False start: 8,1,3,6,10 (confirmed from video)
 * Goal: Find the CORRECT Hamiltonian path that generates the mnemonic
 */

import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';

const bip32 = BIP32Factory(ecc);
const wordlist = bip39.wordlists.english;

const TARGET_ADDRESS = 'bc1qkf6trv39epu4n0wfzw4mk58zf5hrvwd442aksk';

console.log('🧩 Square Sum Hamiltonian Path Bitcoin Puzzle Solver');
console.log('='.repeat(70));
console.log('Based on: Numberphile Square Sum Problem');
console.log('Target: Derive address with 0.08252025 BTC');
console.log('');

// Check if two numbers sum to a perfect square
function isPerfectSquare(n: number): boolean {
  const sqrt = Math.sqrt(n);
  return sqrt === Math.floor(sqrt);
}

// Check if two indices can be adjacent (sum to perfect square)
function canBeAdjacent(a: number, b: number): boolean {
  return isPerfectSquare(a + b);
}

// Build adjacency graph for square sums
function buildSquareSumGraph(maxIndex: number): Map<number, number[]> {
  const graph = new Map<number, number[]>();
  
  for (let i = 1; i <= maxIndex; i++) {
    const neighbors: number[] = [];
    for (let j = 1; j <= maxIndex; j++) {
      if (i !== j && canBeAdjacent(i, j)) {
        neighbors.push(j);
      }
    }
    graph.set(i, neighbors);
  }
  
  return graph;
}

// Find all Hamiltonian paths using backtracking
function findHamiltonianPaths(
  graph: Map<number, number[]>,
  maxNodes: number
): number[][] {
  const paths: number[][] = [];
  const visited = new Set<number>();
  
  function backtrack(path: number[]) {
    if (path.length === maxNodes) {
      paths.push([...path]);
      return;
    }
    
    const lastNode = path[path.length - 1];
    const neighbors = graph.get(lastNode) || [];
    
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        path.push(neighbor);
        backtrack(path);
        path.pop();
        visited.delete(neighbor);
      }
    }
  }
  
  // Try starting from each possible node
  for (let start = 1; start <= maxNodes; start++) {
    visited.clear();
    visited.add(start);
    backtrack([start]);
  }
  
  return paths;
}

// Display graph info
function analyzeGraph(maxIndex: number) {
  console.log(`📊 Analyzing Square Sum Graph for indices 1-${maxIndex}`);
  console.log('');
  
  const graph = buildSquareSumGraph(maxIndex);
  
  console.log('Node connections:');
  for (let i = 1; i <= Math.min(maxIndex, 20); i++) {
    const neighbors = graph.get(i) || [];
    console.log(`  ${i}: ${neighbors.join(', ')} (${neighbors.length} connections)`);
  }
  
  if (maxIndex > 20) {
    console.log(`  ... (showing first 20 of ${maxIndex})`);
  }
  
  console.log('');
  
  return graph;
}

// Test the false start path
function testFalseStart() {
  console.log('🔍 Testing FALSE START path: 8,1,3,6,10');
  console.log('');
  
  const falseStart = [8, 1, 3, 6, 10];
  
  // Verify each pair sums to perfect square
  let valid = true;
  for (let i = 0; i < falseStart.length - 1; i++) {
    const sum = falseStart[i] + falseStart[i + 1];
    const isSquare = isPerfectSquare(sum);
    console.log(`  ${falseStart[i]} + ${falseStart[i + 1]} = ${sum} ${isSquare ? '✓ (square)' : '✗'}`);
    if (!isSquare) valid = false;
  }
  
  console.log('');
  if (valid) {
    console.log('✅ False start pairs are all valid (sum to squares)');
    console.log('❌ BUT: Cannot extend to include all numbers 1-15');
  }
  
  // Try as BIP39 word indices
  console.log('');
  console.log('Testing as BIP39 word indices (1-indexed):');
  const words = falseStart.map(i => wordlist[i - 1]); // Convert to 0-indexed
  console.log(`  Words: ${words.join(' ')}`);
  
  console.log('');
}

// Find paths for specific sizes
function findPathsForSize(size: number, limit: number = 10) {
  console.log(`🔍 Finding Hamiltonian paths for size ${size} (limit: ${limit})`);
  console.log('');
  
  const graph = buildSquareSumGraph(size);
  const paths = findHamiltonianPaths(graph, size);
  
  console.log(`Found ${paths.length} possible Hamiltonian paths`);
  
  if (paths.length > 0) {
    console.log('');
    console.log(`Showing first ${Math.min(limit, paths.length)} paths:`);
    for (let i = 0; i < Math.min(limit, paths.length); i++) {
      console.log(`  Path ${i + 1}: ${paths[i].join(' → ')}`);
    }
  }
  
  console.log('');
  return paths;
}

// Main analysis
console.log('=' .repeat(70));
console.log('PHASE 1: Verify False Start');
console.log('='.repeat(70));
console.log('');
testFalseStart();

console.log('='.repeat(70));
console.log('PHASE 2: Analyze Graph Structure');
console.log('='.repeat(70));
console.log('');
analyzeGraph(15);

console.log('='.repeat(70));
console.log('PHASE 3: Find Valid Hamiltonian Paths');
console.log('='.repeat(70));
console.log('');

// Test for size 15 (the first working size per video)
const paths15 = findPathsForSize(15, 5);

console.log('='.repeat(70));
console.log('PHASE 4: Special Numbers from Video');
console.log('='.repeat(70));
console.log('');
console.log('Numbers with special properties (from transcript):');
console.log('  15: First number where complete solution exists');
console.log('  16-17: Also work');
console.log('  18: Breaks the solution');
console.log('  23: Works again');
console.log('  24: Breaks again');
console.log('  25+: Works for all subsequent numbers');
console.log('');

console.log('='.repeat(70));
console.log('NEXT STEPS');
console.log('='.repeat(70));
console.log('');
console.log('1. Apply pi-digit transformation to select correct path');
console.log('2. Use "magic 130" to determine mnemonic structure');
console.log('3. Generate 24-word mnemonic using selected path');
console.log('4. Test derivation paths (especially m/84\'/130\'/...)');
console.log('5. Check generated addresses for 0.08252025 BTC balance');
console.log('');
console.log('💡 The puzzle combines:');
console.log('   - Graph theory (Hamiltonian paths)');
console.log('   - BIP39 word selection');
console.log('   - Pi-based transformation');
console.log('   - Magic 130 derivation path');
console.log('');
console.log('This is a mathematically elegant crypto puzzle! 🧩');
