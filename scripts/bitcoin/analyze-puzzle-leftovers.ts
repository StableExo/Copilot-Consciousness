#!/usr/bin/env node --import tsx

/**
 * Bitcoin Puzzle Leftover Analyzer
 * 
 * Analyzes which puzzles are:
 * 1. Truly unsolved (high-level, #67+)
 * 2. Solved but unclaimed (keys known, but still have UTXOs)
 * 3. Worth claiming (value > tx fees)
 * 
 * The famous 1000 BTC puzzle private keys follow a pattern:
 * - Puzzle #1: private key = 0x1
 * - Puzzle #2: private key = 0x2  
 * - ...
 * - Puzzle #66: private key = 0x2000000000000000 (2^65, last known solved)
 * - Puzzle #67+: Unknown (still active puzzle)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';

// Initialize bitcoinjs-lib with tiny-secp256k1
bitcoin.initEccLib(ecc);

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const PUZZLE_DATA_FILE = path.join(process.cwd(), 'data', 'puzzle_unspent_2025.json');
const OUTPUT_FILE = path.join(process.cwd(), 'data', 'puzzle_leftover_analysis.json');

// Known solved puzzles (as of Dec 2024)
// Puzzle #1-66 were solved historically
// Some higher ones have been solved too
const KNOWN_SOLVED_RANGE = 66; // Puzzles 1-66 are publicly known/solved

// Transaction fee estimate (in BTC)
const ESTIMATED_TX_FEE = 0.00002; // ~$2 at $100k/BTC, conservative estimate

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface PuzzleData {
  totalPuzzles: number;
  unspentPuzzles: number;
  spentPuzzles: number;
  totalUnclaimedBTC: number;
  totalUnclaimedUSD: number;
  btcPriceUSD: number;
  scanDate: string;
  puzzles: UnspentPuzzle[];
}

interface UnspentPuzzle {
  puzzle: number;
  address: string;
  btc: number;
  usd: number;
  utxos: any[];
  status: string;
  lastChecked: string;
}

interface LeftoverAnalysis {
  scanDate: string;
  btcPrice: number;
  summary: {
    totalUnspent: number;
    solvedButUnclaimed: number;
    trulyUnsolved: number;
    worthClaiming: number;
    tooSmallToClaim: number;
  };
  categories: {
    solvedButUnclaimed: AnalyzedPuzzle[];
    trulyUnsolved: AnalyzedPuzzle[];
    tooSmallToClaim: AnalyzedPuzzle[];
  };
}

interface AnalyzedPuzzle {
  puzzle: number;
  address: string;
  btc: number;
  usd: number;
  utxos: number;
  category: 'solved-unclaimed' | 'unsolved' | 'too-small';
  worthClaiming: boolean;
  estimatedNetProfit: number;
  notes: string;
}

// ═══════════════════════════════════════════════════════════════
// ANALYSIS FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function analyzePuzzle(puzzle: UnspentPuzzle, btcPrice: number): AnalyzedPuzzle {
  const isSolved = puzzle.puzzle <= KNOWN_SOLVED_RANGE;
  const netValue = puzzle.btc - ESTIMATED_TX_FEE;
  const worthClaiming = netValue > 0;
  
  let category: 'solved-unclaimed' | 'unsolved' | 'too-small';
  let notes: string;

  if (puzzle.puzzle <= KNOWN_SOLVED_RANGE) {
    if (worthClaiming) {
      category = 'solved-unclaimed';
      notes = `Solved (key known). Net profit after fees: ${netValue.toFixed(8)} BTC ($${(netValue * btcPrice).toFixed(2)}). Safe to claim.`;
    } else {
      category = 'too-small';
      notes = `Solved (key known), but value ${puzzle.btc.toFixed(8)} BTC < estimated fee ${ESTIMATED_TX_FEE} BTC. Not worth claiming.`;
    }
  } else {
    category = 'unsolved';
    notes = `Still unsolved. Private key unknown. Prize: ${puzzle.btc.toFixed(8)} BTC ($${puzzle.usd.toFixed(2)}).`;
  }

  return {
    puzzle: puzzle.puzzle,
    address: puzzle.address,
    btc: puzzle.btc,
    usd: puzzle.usd,
    utxos: puzzle.utxos.length,
    category,
    worthClaiming,
    estimatedNetProfit: netValue * btcPrice,
    notes,
  };
}

function analyzeLeftovers(data: PuzzleData): LeftoverAnalysis {
  const analyzed = data.puzzles.map(p => analyzePuzzle(p, data.btcPriceUSD));

  const solvedButUnclaimed = analyzed.filter(p => p.category === 'solved-unclaimed');
  const trulyUnsolved = analyzed.filter(p => p.category === 'unsolved');
  const tooSmallToClaim = analyzed.filter(p => p.category === 'too-small');

  return {
    scanDate: new Date().toISOString(),
    btcPrice: data.btcPriceUSD,
    summary: {
      totalUnspent: analyzed.length,
      solvedButUnclaimed: solvedButUnclaimed.length,
      trulyUnsolved: trulyUnsolved.length,
      worthClaiming: solvedButUnclaimed.length,
      tooSmallToClaim: tooSmallToClaim.length,
    },
    categories: {
      solvedButUnclaimed: solvedButUnclaimed.sort((a, b) => b.btc - a.btc),
      trulyUnsolved: trulyUnsolved.sort((a, b) => b.btc - a.btc),
      tooSmallToClaim: tooSmallToClaim.sort((a, b) => b.btc - a.btc),
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// DISPLAY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function displayAnalysis(analysis: LeftoverAnalysis): void {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║        🔍 BITCOIN PUZZLE LEFTOVER ANALYSIS 🔍                ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log();
  console.log(`📅 Analysis Date: ${new Date(analysis.scanDate).toLocaleString()}`);
  console.log(`💵 BTC Price: $${analysis.btcPrice.toLocaleString()}`);
  console.log(`⚙️  Estimated TX Fee: ${ESTIMATED_TX_FEE} BTC (~$${(ESTIMATED_TX_FEE * analysis.btcPrice).toFixed(2)})`);
  console.log();
  
  console.log('━'.repeat(80));
  console.log('📊 SUMMARY');
  console.log('━'.repeat(80));
  console.log(`Total Unspent Puzzles:           ${analysis.summary.totalUnspent}`);
  console.log(`├─ Solved but Unclaimed:         ${analysis.summary.solvedButUnclaimed} (worth claiming)`);
  console.log(`├─ Truly Unsolved:               ${analysis.summary.trulyUnsolved} (active prizes)`);
  console.log(`└─ Too Small to Claim:           ${analysis.summary.tooSmallToClaim} (value < fees)`);
  console.log();

  // Solved but Unclaimed (Claimable Leftovers)
  if (analysis.categories.solvedButUnclaimed.length > 0) {
    console.log('━'.repeat(80));
    console.log('💰 SOLVED BUT UNCLAIMED - CLAIMABLE LEFTOVERS');
    console.log('━'.repeat(80));
    console.log('These puzzles have KNOWN private keys and can be claimed immediately:');
    console.log();

    const totalClaimable = analysis.categories.solvedButUnclaimed.reduce(
      (sum, p) => sum + p.estimatedNetProfit,
      0
    );

    for (const puzzle of analysis.categories.solvedButUnclaimed) {
      console.log(`🎯 Puzzle #${puzzle.puzzle}`);
      console.log(`   Address:     ${puzzle.address}`);
      console.log(`   Gross Value: ${puzzle.btc.toFixed(8)} BTC ($${puzzle.usd.toFixed(2)})`);
      console.log(`   Net Profit:  ${(puzzle.btc - ESTIMATED_TX_FEE).toFixed(8)} BTC ($${puzzle.estimatedNetProfit.toFixed(2)})`);
      console.log(`   UTXOs:       ${puzzle.utxos}`);
      console.log(`   Private Key: 0x${puzzle.puzzle.toString(16)} (publicly known)`);
      console.log(`   Status:      ✅ Safe to claim`);
      console.log();
    }

    console.log(`💎 Total Claimable Net Value: $${totalClaimable.toFixed(2)}`);
    console.log();
  } else {
    console.log('━'.repeat(80));
    console.log('✅ NO CLAIMABLE LEFTOVERS');
    console.log('━'.repeat(80));
    console.log('All solved puzzles have been claimed or are too small to be worth claiming.');
    console.log();
  }

  // Truly Unsolved
  if (analysis.categories.trulyUnsolved.length > 0) {
    console.log('━'.repeat(80));
    console.log('🏆 TRULY UNSOLVED - ACTIVE PRIZES');
    console.log('━'.repeat(80));
    console.log('These puzzles are still active challenges with unknown private keys:');
    console.log();

    const totalPrize = analysis.categories.trulyUnsolved.reduce((sum, p) => sum + p.usd, 0);

    // Show top 10
    const top10 = analysis.categories.trulyUnsolved.slice(0, 10);
    for (const puzzle of top10) {
      console.log(`🔒 Puzzle #${puzzle.puzzle}: ${puzzle.btc.toFixed(8)} BTC ($${puzzle.usd.toFixed(2)})`);
    }

    if (analysis.categories.trulyUnsolved.length > 10) {
      console.log(`   ... and ${analysis.categories.trulyUnsolved.length - 10} more`);
    }

    console.log();
    console.log(`💰 Total Prize Pool: $${totalPrize.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log();
  }

  // Too Small to Claim
  if (analysis.categories.tooSmallToClaim.length > 0) {
    console.log('━'.repeat(80));
    console.log('🔬 TOO SMALL TO CLAIM');
    console.log('━'.repeat(80));
    console.log('These have known keys but claiming would cost more in fees than the value:');
    console.log();

    for (const puzzle of analysis.categories.tooSmallToClaim) {
      console.log(`⚠️  Puzzle #${puzzle.puzzle}: ${puzzle.btc.toFixed(8)} BTC ($${puzzle.usd.toFixed(2)}) - not worth the fees`);
    }
    console.log();
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('🔄 Loading puzzle UTXO data...');
  
  if (!fs.existsSync(PUZZLE_DATA_FILE)) {
    console.error(`❌ Puzzle data file not found: ${PUZZLE_DATA_FILE}`);
    console.error('💡 Run: npm run collect:leftovers');
    process.exit(1);
  }

  const data: PuzzleData = JSON.parse(fs.readFileSync(PUZZLE_DATA_FILE, 'utf-8'));
  console.log(`✅ Loaded ${data.puzzles.length} unspent puzzles`);
  console.log();

  const analysis = analyzeLeftovers(data);
  displayAnalysis(analysis);

  // Save analysis
  const dataDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(analysis, null, 2));
  console.log('━'.repeat(80));
  console.log(`💾 Analysis saved to: ${OUTPUT_FILE}`);
  console.log();

  // Summary for next steps
  if (analysis.summary.solvedButUnclaimed > 0) {
    console.log('🎯 NEXT STEPS:');
    console.log(`   You have ${analysis.summary.solvedButUnclaimed} claimable puzzle(s) worth claiming.`);
    console.log('   To claim them, you would need to:');
    console.log('   1. Import the private key (0x1, 0x2, etc.) into a Bitcoin wallet');
    console.log('   2. Create a transaction sending funds to your address');
    console.log('   3. Broadcast the transaction to the network');
    console.log();
    console.log('   ⚠️  WARNING: Be aware of front-running bots!');
    console.log('   💡 For higher value puzzles, use RBF or private relay to avoid theft.');
  } else {
    console.log('✅ No immediate claiming opportunities found.');
  }
  console.log();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}

export { analyzeLeftovers, type LeftoverAnalysis };
