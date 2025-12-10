#!/usr/bin/env node
/**
 * Blockchain Data Comparison Script
 * 
 * Compares the main Bitcoin puzzle dataset (bitcoin-puzzle-all-20251203.csv)
 * with live blockchain data (data/blockchain-data/puzzle-status-*.csv)
 * to identify discrepancies and ensure data integrity.
 * 
 * Outputs:
 * - Comparison report showing differences
 * - Recommendations for dataset updates
 * - Validation of data consistency
 */

import * as fs from 'fs';
import * as path from 'path';

interface PuzzleDataMain {
  bits: number;
  rangeMin: string;
  rangeMax: string;
  address: string;
  btcValue: number;
  hash160: string;
  publicKey: string;
  privateKey: string;
  solveDate: string;
}

interface PuzzleDataBlockchain {
  puzzleNum: number;
  address: string;
  expectedValue: number;
  actualBalance: number;
  txCount: number;
  status: 'solved' | 'unsolved';
}

interface ComparisonResult {
  totalPuzzlesMain: number;
  totalPuzzlesBlockchain: number;
  solvedPuzzlesMain: number;
  solvedPuzzlesBlockchain: number;
  discrepancies: Discrepancy[];
  newSolvedPuzzles: number[];
  statusChanges: StatusChange[];
  balanceChanges: BalanceChange[];
}

interface Discrepancy {
  puzzleNum: number;
  type: 'missing_in_main' | 'missing_in_blockchain' | 'address_mismatch' | 'status_mismatch' | 'balance_mismatch';
  mainData?: any;
  blockchainData?: any;
  description: string;
}

interface StatusChange {
  puzzleNum: number;
  oldStatus: string;
  newStatus: string;
  address: string;
}

interface BalanceChange {
  puzzleNum: number;
  address: string;
  expectedBalance: number;
  actualBalance: number;
  difference: number;
}

/**
 * Load main dataset CSV
 */
function loadMainDataset(csvPath: string): Map<string, PuzzleDataMain> {
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.trim().split('\n');
  const data = new Map<string, PuzzleDataMain>();
  
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length < 9) continue;
    
    const address = parts[3];
    data.set(address, {
      bits: parseInt(parts[0]),
      rangeMin: parts[1],
      rangeMax: parts[2],
      address,
      btcValue: parseFloat(parts[4]),
      hash160: parts[5],
      publicKey: parts[6],
      privateKey: parts[7],
      solveDate: parts[8],
    });
  }
  
  return data;
}

/**
 * Load blockchain data CSV
 */
function loadBlockchainData(csvPath: string): Map<string, PuzzleDataBlockchain> {
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.trim().split('\n');
  const data = new Map<string, PuzzleDataBlockchain>();
  
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length < 6) continue;
    
    const address = parts[1];
    data.set(address, {
      puzzleNum: parseInt(parts[0]),
      address,
      expectedValue: parseInt(parts[2]),
      actualBalance: parseInt(parts[3]),
      txCount: parseInt(parts[4]),
      status: parts[5] as 'solved' | 'unsolved',
    });
  }
  
  return data;
}

/**
 * Compare datasets and identify discrepancies
 */
function compareDatasets(
  mainData: Map<string, PuzzleDataMain>,
  blockchainData: Map<string, PuzzleDataBlockchain>
): ComparisonResult {
  const discrepancies: Discrepancy[] = [];
  const statusChanges: StatusChange[] = [];
  const balanceChanges: BalanceChange[] = [];
  const newSolvedPuzzles: number[] = [];
  
  let solvedInMain = 0;
  let solvedInBlockchain = 0;
  
  // Check main dataset against blockchain data
  for (const [address, mainEntry] of mainData) {
    const isSolvedInMain = mainEntry.privateKey !== '' && 
                          !mainEntry.privateKey.includes('?') &&
                          mainEntry.privateKey !== '0'.repeat(64);
    
    if (isSolvedInMain) {
      solvedInMain++;
    }
    
    const blockchainEntry = blockchainData.get(address);
    
    if (!blockchainEntry) {
      discrepancies.push({
        puzzleNum: mainEntry.bits,
        type: 'missing_in_blockchain',
        mainData: mainEntry,
        description: `Puzzle #${mainEntry.bits} (${address}) exists in main dataset but not in blockchain data`,
      });
      continue;
    }
    
    // Check status consistency
    const isSolvedInBlockchain = blockchainEntry.status === 'solved';
    if (isSolvedInBlockchain) {
      solvedInBlockchain++;
    }
    
    if (isSolvedInMain !== isSolvedInBlockchain) {
      statusChanges.push({
        puzzleNum: blockchainEntry.puzzleNum,
        oldStatus: isSolvedInMain ? 'solved' : 'unsolved',
        newStatus: isSolvedInBlockchain ? 'solved' : 'unsolved',
        address,
      });
      
      if (!isSolvedInMain && isSolvedInBlockchain) {
        newSolvedPuzzles.push(blockchainEntry.puzzleNum);
      }
      
      discrepancies.push({
        puzzleNum: blockchainEntry.puzzleNum,
        type: 'status_mismatch',
        mainData: { status: isSolvedInMain ? 'solved' : 'unsolved', privateKey: mainEntry.privateKey },
        blockchainData: { status: blockchainEntry.status },
        description: `Status mismatch for puzzle #${blockchainEntry.puzzleNum}: Main says ${isSolvedInMain ? 'solved' : 'unsolved'}, blockchain says ${blockchainEntry.status}`,
      });
    }
    
    // Check balance consistency for unsolved puzzles
    if (!isSolvedInBlockchain && blockchainEntry.actualBalance === 0) {
      balanceChanges.push({
        puzzleNum: blockchainEntry.puzzleNum,
        address,
        expectedBalance: blockchainEntry.expectedValue,
        actualBalance: blockchainEntry.actualBalance,
        difference: blockchainEntry.expectedValue - blockchainEntry.actualBalance,
      });
      
      discrepancies.push({
        puzzleNum: blockchainEntry.puzzleNum,
        type: 'balance_mismatch',
        mainData: { btcValue: mainEntry.btcValue },
        blockchainData: { expectedValue: blockchainEntry.expectedValue, actualBalance: blockchainEntry.actualBalance },
        description: `Balance discrepancy for puzzle #${blockchainEntry.puzzleNum}: Expected ${blockchainEntry.expectedValue} satoshis, found ${blockchainEntry.actualBalance}`,
      });
    }
  }
  
  // Check for puzzles in blockchain data but not in main dataset
  for (const [address, blockchainEntry] of blockchainData) {
    if (!mainData.has(address)) {
      discrepancies.push({
        puzzleNum: blockchainEntry.puzzleNum,
        type: 'missing_in_main',
        blockchainData: blockchainEntry,
        description: `Puzzle #${blockchainEntry.puzzleNum} (${address}) exists in blockchain data but not in main dataset`,
      });
    }
  }
  
  return {
    totalPuzzlesMain: mainData.size,
    totalPuzzlesBlockchain: blockchainData.size,
    solvedPuzzlesMain: solvedInMain,
    solvedPuzzlesBlockchain: solvedInBlockchain,
    discrepancies,
    newSolvedPuzzles,
    statusChanges,
    balanceChanges,
  };
}

/**
 * Generate comparison report
 */
function generateReport(result: ComparisonResult): string {
  const lines: string[] = [];
  
  lines.push('╔═══════════════════════════════════════════════════════════════════════════════╗');
  lines.push('║           BLOCKCHAIN DATA COMPARISON REPORT                                   ║');
  lines.push('╚═══════════════════════════════════════════════════════════════════════════════╝');
  lines.push('');
  
  lines.push('📊 DATASET OVERVIEW');
  lines.push('─'.repeat(80));
  lines.push(`   Main Dataset:       ${result.totalPuzzlesMain} puzzles`);
  lines.push(`   Blockchain Data:    ${result.totalPuzzlesBlockchain} puzzles`);
  lines.push(`   Solved (Main):      ${result.solvedPuzzlesMain} puzzles`);
  lines.push(`   Solved (Blockchain): ${result.solvedPuzzlesBlockchain} puzzles`);
  lines.push('');
  
  if (result.discrepancies.length === 0) {
    lines.push('✅ NO DISCREPANCIES FOUND');
    lines.push('   All data is consistent between main dataset and blockchain data.');
    lines.push('');
  } else {
    lines.push(`⚠️  DISCREPANCIES FOUND: ${result.discrepancies.length}`);
    lines.push('─'.repeat(80));
    lines.push('');
    
    // Group by type
    const byType = new Map<string, Discrepancy[]>();
    for (const disc of result.discrepancies) {
      const arr = byType.get(disc.type) || [];
      arr.push(disc);
      byType.set(disc.type, arr);
    }
    
    for (const [type, discs] of byType) {
      lines.push(`   ${type.toUpperCase().replace(/_/g, ' ')}: ${discs.length}`);
      for (const disc of discs.slice(0, 5)) {
        lines.push(`     - ${disc.description}`);
      }
      if (discs.length > 5) {
        lines.push(`     ... and ${discs.length - 5} more`);
      }
      lines.push('');
    }
  }
  
  if (result.newSolvedPuzzles.length > 0) {
    lines.push('🎉 NEW SOLVED PUZZLES');
    lines.push('─'.repeat(80));
    lines.push(`   ${result.newSolvedPuzzles.length} puzzle(s) solved since last update:`);
    for (const num of result.newSolvedPuzzles.sort((a, b) => a - b)) {
      lines.push(`     - Puzzle #${num}`);
    }
    lines.push('');
  }
  
  if (result.statusChanges.length > 0) {
    lines.push('🔄 STATUS CHANGES');
    lines.push('─'.repeat(80));
    for (const change of result.statusChanges) {
      lines.push(`   Puzzle #${change.puzzleNum}: ${change.oldStatus} → ${change.newStatus}`);
    }
    lines.push('');
  }
  
  if (result.balanceChanges.length > 0) {
    lines.push('💰 BALANCE CHANGES');
    lines.push('─'.repeat(80));
    for (const change of result.balanceChanges.slice(0, 10)) {
      lines.push(`   Puzzle #${change.puzzleNum}: Expected ${change.expectedBalance}, Found ${change.actualBalance} (Δ ${change.difference})`);
    }
    if (result.balanceChanges.length > 10) {
      lines.push(`   ... and ${result.balanceChanges.length - 10} more balance changes`);
    }
    lines.push('');
  }
  
  lines.push('📋 RECOMMENDATIONS');
  lines.push('─'.repeat(80));
  
  if (result.discrepancies.length === 0) {
    lines.push('   ✅ No action needed - datasets are synchronized');
  } else {
    if (result.newSolvedPuzzles.length > 0) {
      lines.push('   1. Update main dataset with newly solved puzzles');
      lines.push('      - Fetch private keys from blockchain');
      lines.push('      - Update solve dates');
      lines.push('      - Re-run ML dataset builder');
    }
    
    if (result.statusChanges.length > 0) {
      lines.push('   2. Investigate status mismatches');
      lines.push('      - Verify blockchain data is current');
      lines.push('      - Check if puzzles were recently solved');
    }
    
    if (result.balanceChanges.length > 0) {
      lines.push('   3. Review balance discrepancies');
      lines.push('      - Puzzles may have been claimed');
      lines.push('      - Update expected values if puzzle rules changed');
    }
    
    lines.push('   4. Re-run comparison after updates to verify fixes');
  }
  
  lines.push('');
  lines.push('═'.repeat(80));
  
  return lines.join('\n');
}

/**
 * Save detailed comparison to JSON
 */
function saveComparisonJSON(result: ComparisonResult, outputPath: string): void {
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 Bitcoin Puzzle Dataset Comparison');
  console.log('═'.repeat(80));
  console.log();
  
  const mainCsv = process.argv[2] || 'bitcoin-puzzle-all-20251203.csv';
  const blockchainCsv = process.argv[3] || 'data/blockchain-data/puzzle-status-1764749114144.csv';
  const outputJson = process.argv[4] || 'data/blockchain-data/comparison-result.json';
  
  // Verify files exist
  if (!fs.existsSync(mainCsv)) {
    console.error(`❌ Main dataset not found: ${mainCsv}`);
    process.exit(1);
  }
  
  if (!fs.existsSync(blockchainCsv)) {
    console.error(`❌ Blockchain data not found: ${blockchainCsv}`);
    process.exit(1);
  }
  
  console.log('📥 Loading datasets...');
  console.log(`   Main: ${mainCsv}`);
  console.log(`   Blockchain: ${blockchainCsv}`);
  console.log();
  
  // Load data
  const mainData = loadMainDataset(mainCsv);
  const blockchainData = loadBlockchainData(blockchainCsv);
  
  console.log('✅ Data loaded successfully');
  console.log(`   Main dataset: ${mainData.size} entries`);
  console.log(`   Blockchain data: ${blockchainData.size} entries`);
  console.log();
  
  // Compare
  console.log('🔬 Comparing datasets...');
  const result = compareDatasets(mainData, blockchainData);
  console.log('✅ Comparison complete');
  console.log();
  
  // Generate report
  const report = generateReport(result);
  console.log(report);
  
  // Save JSON
  console.log(`💾 Saving detailed comparison to: ${outputJson}`);
  saveComparisonJSON(result, outputJson);
  console.log('✅ Saved');
  console.log();
  
  // Exit code based on discrepancies
  if (result.discrepancies.length > 0) {
    console.log('⚠️  Discrepancies found - review recommendations above');
    process.exit(1);
  } else {
    console.log('✨ All checks passed!');
    process.exit(0);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { 
  loadMainDataset, 
  loadBlockchainData, 
  compareDatasets, 
  generateReport 
};
