#!/usr/bin/env node
/**
 * Blockchain.com API Data Fetcher
 * 
 * Uses the Blockchain.com Data API to fetch real-time puzzle data:
 * - Genesis transaction details (160 outputs)
 * - Individual puzzle address status
 * - Batch puzzle verification
 * - Unspent output tracking
 * 
 * Data Point #10: Direct blockchain access for validation and monitoring
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';

const exec = promisify(execCallback);

interface BlockchainTransaction {
  hash: string;
  ver: number;
  vin_sz: number;
  vout_sz: number;
  size: number;
  block_height?: number;
  tx_index: string;
  inputs: any[];
  out: BlockchainOutput[];
}

interface BlockchainOutput {
  value: number; // satoshis
  hash: string;
  script: string;
  n?: number;
  spent?: boolean;
  tx_index?: number;
}

interface BlockchainAddress {
  hash160: string;
  address: string;
  n_tx: number;
  total_received: number; // satoshis
  total_sent: number;
  final_balance: number;
  txs?: any[];
}

interface PuzzleStatus {
  puzzleNum: number;
  address: string;
  expectedValue: number; // satoshis
  actualBalance: number;
  transactionCount: number;
  status: 'unsolved' | 'solved' | 'reclaimed';
  solvedDate?: string;
}

const GENESIS_TX = '08389f34c98c606322740c0be6a7125d9860bb8d5cb182c02f98461e5fa6cd15';
const API_BASE = 'https://blockchain.info';
const RATE_LIMIT_MS = 300; // Be respectful - 300ms between requests

/**
 * Fetch raw transaction data
 */
async function fetchTransaction(txHash: string): Promise<BlockchainTransaction | null> {
  try {
    const url = `${API_BASE}/rawtx/${txHash}`;
    console.log(`  📡 Fetching: ${url}`);
    
    const { stdout } = await exec(`curl -s "${url}"`);
    const data = JSON.parse(stdout);
    
    return data;
  } catch (error) {
    console.error(`Error fetching transaction ${txHash}:`, error);
    return null;
  }
}

/**
 * Fetch address information
 */
async function fetchAddress(address: string, limit: number = 50): Promise<BlockchainAddress | null> {
  try {
    const url = `${API_BASE}/rawaddr/${address}?limit=${limit}`;
    const { stdout } = await exec(`curl -s "${url}"`);
    const data = JSON.parse(stdout);
    
    return data;
  } catch (error) {
    console.error(`Error fetching address ${address}:`, error);
    return null;
  }
}

/**
 * Fetch multiple addresses at once (batch)
 */
async function fetchMultiAddress(addresses: string[], limit: number = 50): Promise<any> {
  try {
    const addressList = addresses.join('|');
    const url = `${API_BASE}/multiaddr?active=${addressList}&n=${limit}`;
    const { stdout } = await exec(`curl -s "${url}"`);
    const data = JSON.parse(stdout);
    
    return data;
  } catch (error) {
    console.error(`Error fetching multiple addresses:`, error);
    return null;
  }
}

/**
 * Check address balance (lightweight)
 */
async function fetchBalance(addresses: string[]): Promise<any> {
  try {
    const addressList = addresses.join('|');
    const url = `${API_BASE}/balance?active=${addressList}`;
    const { stdout } = await exec(`curl -s "${url}"`);
    const data = JSON.parse(stdout);
    
    return data;
  } catch (error) {
    console.error(`Error fetching balance:`, error);
    return null;
  }
}

/**
 * Analyze genesis transaction to extract all puzzle addresses
 */
async function analyzeGenesisTransaction(): Promise<PuzzleStatus[]> {
  console.log('🔍 Analyzing Genesis Transaction');
  console.log('-'.repeat(80));
  console.log(`Transaction: ${GENESIS_TX}`);
  console.log();
  
  const tx = await fetchTransaction(GENESIS_TX);
  if (!tx) {
    console.error('❌ Failed to fetch genesis transaction');
    return [];
  }
  
  console.log(`✅ Transaction fetched successfully`);
  console.log(`   Inputs: ${tx.vin_sz}`);
  console.log(`   Outputs: ${tx.vout_sz}`);
  console.log(`   Block Height: ${tx.block_height || 'Unknown'}`);
  console.log();
  
  // Extract puzzle addresses from outputs
  const puzzles: PuzzleStatus[] = [];
  
  for (let i = 0; i < tx.out.length; i++) {
    const output = tx.out[i];
    const puzzleNum = i + 1;
    
    // Derive address from script (simplified - assumes P2PKH)
    // In production, would use proper Bitcoin address derivation
    const address = output.addr || `Output_${i}`;
    
    puzzles.push({
      puzzleNum,
      address,
      expectedValue: output.value,
      actualBalance: 0, // Will be filled by separate balance check
      transactionCount: 0,
      status: 'unsolved',
    });
  }
  
  console.log(`📊 Extracted ${puzzles.length} puzzle addresses`);
  console.log();
  
  return puzzles;
}

/**
 * Verify puzzle statuses by checking balances
 */
async function verifyPuzzleStatuses(puzzles: PuzzleStatus[]): Promise<PuzzleStatus[]> {
  console.log('🔎 Verifying Puzzle Statuses');
  console.log('-'.repeat(80));
  console.log(`Total puzzles to check: ${puzzles.length}`);
  console.log('(This may take several minutes due to rate limiting)');
  console.log();
  
  // Process in batches of 10 to avoid overwhelming the API
  const batchSize = 10;
  const batches = [];
  
  for (let i = 0; i < puzzles.length; i += batchSize) {
    batches.push(puzzles.slice(i, i + batchSize));
  }
  
  let checkedCount = 0;
  const results: PuzzleStatus[] = [];
  
  for (const batch of batches) {
    const addresses = batch.map(p => p.address);
    
    try {
      const balances = await fetchBalance(addresses);
      
      for (const puzzle of batch) {
        const balanceData = balances[puzzle.address];
        
        if (balanceData) {
          puzzle.actualBalance = balanceData.final_balance;
          puzzle.transactionCount = balanceData.n_tx;
          
          // Determine status
          if (puzzle.actualBalance === 0 && puzzle.transactionCount > 0) {
            puzzle.status = 'solved';
          } else if (puzzle.actualBalance === puzzle.expectedValue && puzzle.transactionCount === 1) {
            puzzle.status = 'unsolved';
          } else if (puzzle.actualBalance === 0 && puzzle.transactionCount === 0) {
            puzzle.status = 'reclaimed';
          }
        }
        
        results.push(puzzle);
        checkedCount++;
      }
      
      if (checkedCount % 50 === 0) {
        console.log(`  Progress: ${checkedCount}/${puzzles.length} puzzles checked`);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS));
      
    } catch (error) {
      console.error(`  ⚠️  Error checking batch:`, error);
      results.push(...batch); // Add unchecked puzzles
    }
  }
  
  console.log();
  console.log(`✅ Completed: ${checkedCount}/${puzzles.length} puzzles verified`);
  console.log();
  
  return results;
}

/**
 * Generate statistics report
 */
function generateReport(puzzles: PuzzleStatus[]): void {
  console.log('📊 PUZZLE STATUS REPORT');
  console.log('='.repeat(80));
  console.log();
  
  const unsolved = puzzles.filter(p => p.status === 'unsolved');
  const solved = puzzles.filter(p => p.status === 'solved');
  const reclaimed = puzzles.filter(p => p.status === 'reclaimed');
  
  console.log('📈 Summary:');
  console.log(`   Total Puzzles: ${puzzles.length}`);
  console.log(`   Unsolved: ${unsolved.length} (${(unsolved.length / puzzles.length * 100).toFixed(1)}%)`);
  console.log(`   Solved: ${solved.length} (${(solved.length / puzzles.length * 100).toFixed(1)}%)`);
  console.log(`   Reclaimed: ${reclaimed.length} (${(reclaimed.length / puzzles.length * 100).toFixed(1)}%)`);
  console.log();
  
  // Value analysis
  const totalValue = puzzles.reduce((sum, p) => sum + p.expectedValue, 0);
  const unsolvedValue = unsolved.reduce((sum, p) => sum + p.expectedValue, 0);
  const solvedValue = solved.reduce((sum, p) => sum + p.expectedValue, 0);
  
  console.log('💰 Value (in BTC):');
  console.log(`   Total: ${(totalValue / 100000000).toFixed(8)} BTC`);
  console.log(`   Unsolved: ${(unsolvedValue / 100000000).toFixed(8)} BTC`);
  console.log(`   Solved: ${(solvedValue / 100000000).toFixed(8)} BTC`);
  console.log();
  
  // Difficulty distribution
  console.log('🎯 Status by Difficulty Range:');
  
  const ranges = [
    { name: 'Easy (1-30)', min: 1, max: 30 },
    { name: 'Medium (31-54)', min: 31, max: 54 },
    { name: 'Hard (55-70)', min: 55, max: 70 },
    { name: 'Extreme (71-82)', min: 71, max: 82 },
    { name: 'Impossible (83-160)', min: 83, max: 160 },
  ];
  
  for (const range of ranges) {
    const inRange = puzzles.filter(p => p.puzzleNum >= range.min && p.puzzleNum <= range.max);
    const unsolvedInRange = inRange.filter(p => p.status === 'unsolved');
    const solvedInRange = inRange.filter(p => p.status === 'solved');
    
    console.log(`   ${range.name.padEnd(20)}: ${solvedInRange.length}/${inRange.length} solved (${unsolvedInRange.length} unsolved)`);
  }
  console.log();
  
  // Highlight key puzzles
  console.log('🔑 Key Puzzles of Interest:');
  const keyPuzzles = [66, 67, 68, 69, 70, 71, 72, 73, 74, 75];
  
  for (const num of keyPuzzles) {
    const puzzle = puzzles.find(p => p.puzzleNum === num);
    if (puzzle) {
      const statusEmoji = puzzle.status === 'unsolved' ? '❓' : puzzle.status === 'solved' ? '✅' : '🔄';
      const btcValue = (puzzle.expectedValue / 100000000).toFixed(8);
      console.log(`   ${statusEmoji} Puzzle #${num.toString().padStart(3)}: ${puzzle.status.padEnd(10)} (${btcValue} BTC)`);
    }
  }
  console.log();
}

/**
 * Main execution
 */
async function main() {
  console.log('🌐 Blockchain.com API Data Fetcher');
  console.log('='.repeat(80));
  console.log();
  console.log('Data Point #10: Direct Blockchain Access');
  console.log();
  
  const args = process.argv.slice(2);
  const outputDir = args[0] || 'data/blockchain-data';
  const verifyAll = args[1] === '--verify-all';
  
  console.log('⚙️  Configuration:');
  console.log(`   Output Directory: ${outputDir}`);
  console.log(`   Verify All Puzzles: ${verifyAll ? 'Yes' : 'No (quick mode)'}`);
  console.log(`   Rate Limit: ${RATE_LIMIT_MS}ms between requests`);
  console.log();
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Step 1: Analyze genesis transaction
  const puzzles = await analyzeGenesisTransaction();
  
  if (puzzles.length === 0) {
    console.error('❌ Failed to extract puzzle data');
    return;
  }
  
  // Step 2: Verify statuses (if requested)
  let verifiedPuzzles = puzzles;
  
  if (verifyAll) {
    verifiedPuzzles = await verifyPuzzleStatuses(puzzles);
  } else {
    console.log('ℹ️  Skipping full verification (use --verify-all to enable)');
    console.log();
  }
  
  // Step 3: Generate report
  generateReport(verifiedPuzzles);
  
  // Step 4: Save data
  const timestamp = Date.now();
  const jsonPath = path.join(outputDir, `puzzle-status-${timestamp}.json`);
  const csvPath = path.join(outputDir, `puzzle-status-${timestamp}.csv`);
  
  fs.writeFileSync(jsonPath, JSON.stringify(verifiedPuzzles, null, 2));
  console.log(`💾 Saved JSON: ${jsonPath}`);
  
  // CSV export
  const csvHeader = 'puzzle_num,address,expected_value,actual_balance,tx_count,status\n';
  const csvRows = verifiedPuzzles.map(p => 
    `${p.puzzleNum},${p.address},${p.expectedValue},${p.actualBalance},${p.transactionCount},${p.status}`
  ).join('\n');
  fs.writeFileSync(csvPath, csvHeader + csvRows);
  console.log(`💾 Saved CSV: ${csvPath}`);
  console.log();
  
  console.log('✨ SUCCESS!');
  console.log();
  console.log('Next steps:');
  console.log('  1. Compare with existing CSV data for validation');
  console.log('  2. Use for real-time puzzle monitoring');
  console.log('  3. Integrate with ML pipeline for fresh data');
  console.log('  4. Track creator reclamation patterns');
  console.log();
  console.log('='.repeat(80));
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export {
  fetchTransaction,
  fetchAddress,
  fetchMultiAddress,
  fetchBalance,
  analyzeGenesisTransaction,
  verifyPuzzleStatuses,
};
