#!/usr/bin/env node
/**
 * Bitcoin Puzzle Transaction Analyzer
 * 
 * Analyzes interesting Bitcoin transactions related to puzzle solving.
 * Tracks spending patterns, address clustering, and potential solver behavior.
 * 
 * Example: Transaction 12f34b58b04dfb0233ce889f674781c0e0c7ba95482cca469125af41a78d13b3
 * This appears to be a puzzle-related transaction with multiple outputs.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface TransactionInput {
  prev_out: {
    addr: string;
    value: number;
  };
  script: string;
  sequence: number;
}

interface TransactionOutput {
  addr: string;
  value: number;
  n: number;
  spent: boolean;
  script: string;
  spending_outpoints?: Array<{ tx_index: number; n: number }>;
}

interface Transaction {
  hash: string;
  block_height?: number;
  time: number;
  inputs: TransactionInput[];
  out: TransactionOutput[];
  size: number;
  weight: number;
  fee: number;
  relayed_by: string;
}

interface PuzzlePattern {
  pattern_type: string;
  description: string;
  evidence: string[];
  confidence: number; // 0-100
}

export class BitcoinPuzzleTransactionAnalyzer {
  private readonly dataDir: string;
  private readonly analysisPath: string;
  
  constructor(dataDir: string = 'data/ml-predictions') {
    this.dataDir = dataDir;
    this.analysisPath = join(dataDir, 'transaction_analysis.json');
  }
  
  /**
   * Fetch transaction data from blockchain API
   */
  async fetchTransaction(txHash: string): Promise<Transaction | null> {
    console.log(`🔍 Fetching transaction: ${txHash}`);
    
    try {
      // Use blockchain.info API
      const url = `https://blockchain.info/rawtx/${txHash}?format=json`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`❌ API error: ${response.status}`);
        return null;
      }
      
      const data = await response.json();
      console.log(`✓ Transaction fetched (${data.out.length} outputs)`);
      
      return data as Transaction;
    } catch (error: any) {
      console.error(`❌ Fetch failed: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Analyze transaction for puzzle-related patterns
   */
  analyzeTransaction(tx: Transaction): {
    summary: any;
    patterns: PuzzlePattern[];
    recommendations: string[];
  } {
    console.log('\n' + '='.repeat(80));
    console.log('📊 Transaction Analysis');
    console.log('='.repeat(80));
    
    // Basic statistics
    const totalInput = tx.inputs.reduce((sum, inp) => sum + (inp.prev_out?.value || 0), 0);
    const totalOutput = tx.out.reduce((sum, out) => sum + out.value, 0);
    const numOutputs = tx.out.length;
    const spentOutputs = tx.out.filter(o => o.spent).length;
    const unspentOutputs = numOutputs - spentOutputs;
    
    const summary = {
      hash: tx.hash,
      block_height: tx.block_height,
      timestamp: new Date(tx.time * 1000).toISOString(),
      inputs: tx.inputs.length,
      outputs: numOutputs,
      total_input_btc: totalInput / 1e8,
      total_output_btc: totalOutput / 1e8,
      fee_btc: tx.fee / 1e8,
      spent_outputs: spentOutputs,
      unspent_outputs: unspentOutputs,
      size_bytes: tx.size,
      weight: tx.weight
    };
    
    console.log('\n📋 Summary:');
    console.log(`   Hash: ${summary.hash}`);
    console.log(`   Block: ${summary.block_height || 'Unconfirmed'}`);
    console.log(`   Time: ${summary.timestamp}`);
    console.log(`   Outputs: ${summary.outputs} (${spentOutputs} spent, ${unspentOutputs} unspent)`);
    console.log(`   Total Output: ${summary.total_output_btc.toFixed(8)} BTC`);
    console.log(`   Fee: ${summary.fee_btc.toFixed(8)} BTC`);
    
    // Detect patterns
    const patterns: PuzzlePattern[] = [];
    
    // Pattern 1: Many outputs (puzzle distribution)
    if (numOutputs > 50) {
      patterns.push({
        pattern_type: 'mass_distribution',
        description: 'Transaction has many outputs, typical of puzzle creator distribution',
        evidence: [
          `${numOutputs} outputs (typical puzzle tx has 80-160)`,
          'Could be initial puzzle funding or reorganization'
        ],
        confidence: 75
      });
    }
    
    // Pattern 2: Sequential value pattern
    const values = tx.out.map(o => o.value).sort((a, b) => a - b);
    const isSequential = this.checkSequentialPattern(values);
    if (isSequential) {
      patterns.push({
        pattern_type: 'sequential_values',
        description: 'Output values follow a sequential pattern',
        evidence: [
          'Values increase in regular increments',
          'Matches puzzle #1-#160 distribution pattern'
        ],
        confidence: 85
      });
    }
    
    // Pattern 3: Specific puzzle addresses
    const knownPuzzleAddresses = this.loadKnownPuzzleAddresses();
    const matchedAddresses = tx.out.filter(o => 
      knownPuzzleAddresses.includes(o.addr)
    );
    
    if (matchedAddresses.length > 0) {
      patterns.push({
        pattern_type: 'known_puzzle_addresses',
        description: 'Transaction involves known puzzle addresses',
        evidence: matchedAddresses.map(m => 
          `Output #${m.n}: ${m.addr} (${(m.value / 1e8).toFixed(8)} BTC)`
        ),
        confidence: 95
      });
    }
    
    // Pattern 4: Spending behavior (potential solver)
    const recentSpends = tx.out.filter(o => 
      o.spent && o.spending_outpoints && o.spending_outpoints.length > 0
    );
    
    if (recentSpends.length > 0) {
      patterns.push({
        pattern_type: 'spending_activity',
        description: 'Some outputs have been spent (potential puzzle solvers)',
        evidence: recentSpends.map(s => 
          `Output #${s.n}: ${s.addr} spent (${(s.value / 1e8).toFixed(8)} BTC)`
        ),
        confidence: 80
      });
    }
    
    // Pattern 5: Creator signature (heuristic)
    if (numOutputs === 85 || numOutputs === 160 || numOutputs === 256) {
      patterns.push({
        pattern_type: 'creator_signature',
        description: 'Output count matches known puzzle set sizes',
        evidence: [
          `${numOutputs} outputs matches puzzle set size`,
          'Likely created by original puzzle creator'
        ],
        confidence: 90
      });
    }
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (patterns.some(p => p.pattern_type === 'known_puzzle_addresses')) {
      recommendations.push('✓ This transaction involves known puzzle addresses');
      recommendations.push('→ Cross-reference with puzzle dataset for validation');
    }
    
    if (patterns.some(p => p.pattern_type === 'spending_activity')) {
      recommendations.push('⚠️ Some outputs have been spent');
      recommendations.push('→ Investigate spending transactions for solver patterns');
      recommendations.push('→ Check if private keys were found or funds were stolen');
    }
    
    if (unspentOutputs > 0) {
      recommendations.push(`💰 ${unspentOutputs} outputs remain unspent`);
      recommendations.push('→ These puzzles may still be unsolved');
    }
    
    if (patterns.some(p => p.pattern_type === 'mass_distribution')) {
      recommendations.push('📊 Mass distribution pattern detected');
      recommendations.push('→ Possible puzzle creation or reorganization event');
      recommendations.push('→ Update ML training data if new puzzles were added');
    }
    
    console.log('\n🔍 Detected Patterns:');
    if (patterns.length === 0) {
      console.log('   No specific patterns detected');
    } else {
      patterns.forEach((p, idx) => {
        console.log(`   ${idx + 1}. ${p.pattern_type} (${p.confidence}% confidence)`);
        console.log(`      ${p.description}`);
        p.evidence.forEach(e => console.log(`      - ${e}`));
      });
    }
    
    console.log('\n💡 Recommendations:');
    recommendations.forEach(r => console.log(`   ${r}`));
    
    console.log('\n' + '='.repeat(80) + '\n');
    
    return { summary, patterns, recommendations };
  }
  
  /**
   * Check if values follow sequential pattern
   */
  private checkSequentialPattern(values: number[]): boolean {
    if (values.length < 3) return false;
    
    // Check if increments are consistent
    const increments: number[] = [];
    for (let i = 1; i < values.length; i++) {
      increments.push(values[i] - values[i - 1]);
    }
    
    // Allow some variance (±10%)
    const avgIncrement = increments.reduce((a, b) => a + b, 0) / increments.length;
    const variance = increments.every(inc => 
      Math.abs(inc - avgIncrement) / avgIncrement < 0.1
    );
    
    return variance && avgIncrement > 0;
  }
  
  /**
   * Load known puzzle addresses from CSV
   */
  private loadKnownPuzzleAddresses(): string[] {
    const csvPath = join('data', 'bitcoin-puzzle-all-20251203.csv');
    
    if (!existsSync(csvPath)) {
      return [];
    }
    
    try {
      const content = readFileSync(csvPath, 'utf-8');
      const lines = content.split('\n').slice(1); // Skip header
      const addresses: string[] = [];
      
      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.split(',');
        if (parts.length >= 3) {
          addresses.push(parts[2]); // Address column
        }
      }
      
      return addresses;
    } catch (error) {
      console.warn('⚠️ Could not load puzzle addresses from CSV');
      return [];
    }
  }
  
  /**
   * Analyze specific transaction hash
   */
  async analyzeTransactionHash(txHash: string): Promise<void> {
    const tx = await this.fetchTransaction(txHash);
    
    if (!tx) {
      console.error('❌ Could not fetch transaction');
      return;
    }
    
    const analysis = this.analyzeTransaction(tx);
    
    // Save analysis
    const analysisData = {
      transaction: txHash,
      analyzed_at: new Date().toISOString(),
      summary: analysis.summary,
      patterns: analysis.patterns,
      recommendations: analysis.recommendations
    };
    
    writeFileSync(
      this.analysisPath,
      JSON.stringify(analysisData, null, 2),
      'utf-8'
    );
    
    console.log(`✓ Analysis saved: ${this.analysisPath}`);
  }
  
  /**
   * Track spending patterns across multiple transactions
   */
  async trackSpendingPattern(txHashes: string[]): Promise<void> {
    console.log(`\n📊 Tracking spending patterns across ${txHashes.length} transactions...`);
    
    const allSpends: Array<{
      tx: string;
      output: number;
      addr: string;
      value: number;
      spent_at?: number;
    }> = [];
    
    for (const txHash of txHashes) {
      const tx = await this.fetchTransaction(txHash);
      if (!tx) continue;
      
      tx.out.forEach(out => {
        if (out.spent && out.spending_outpoints) {
          allSpends.push({
            tx: txHash,
            output: out.n,
            addr: out.addr,
            value: out.value,
            spent_at: tx.time
          });
        }
      });
    }
    
    console.log(`\n✓ Found ${allSpends.length} spent outputs`);
    
    // Cluster by time
    const timeWindows = this.clusterByTime(allSpends, 7 * 24 * 60 * 60); // 7 days
    
    console.log(`\n📅 Spending Timeline (${timeWindows.length} distinct periods):`);
    timeWindows.forEach((window, idx) => {
      const date = new Date(window.start_time * 1000).toLocaleDateString();
      console.log(`   Period ${idx + 1} (${date}): ${window.spends.length} spends`);
    });
  }
  
  /**
   * Cluster spends by time windows
   */
  private clusterByTime(
    spends: Array<{ spent_at?: number }>,
    windowSeconds: number
  ): Array<{ start_time: number; spends: Array<any> }> {
    const sorted = spends
      .filter(s => s.spent_at)
      .sort((a, b) => (a.spent_at || 0) - (b.spent_at || 0));
    
    const windows: Array<{ start_time: number; spends: Array<any> }> = [];
    let currentWindow: Array<any> = [];
    let windowStart = 0;
    
    for (const spend of sorted) {
      if (!spend.spent_at) continue;
      
      if (currentWindow.length === 0) {
        windowStart = spend.spent_at;
        currentWindow.push(spend);
      } else if (spend.spent_at - windowStart <= windowSeconds) {
        currentWindow.push(spend);
      } else {
        windows.push({ start_time: windowStart, spends: currentWindow });
        windowStart = spend.spent_at;
        currentWindow = [spend];
      }
    }
    
    if (currentWindow.length > 0) {
      windows.push({ start_time: windowStart, spends: currentWindow });
    }
    
    return windows;
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const analyzer = new BitcoinPuzzleTransactionAnalyzer();
  
  const command = process.argv[2];
  
  (async () => {
    switch (command) {
      case 'analyze':
        const txHash = process.argv[3];
        if (!txHash) {
          console.log('Usage: npx tsx scripts/bitcoin_transaction_analyzer.ts analyze <tx_hash>');
          console.log('');
          console.log('Example:');
          console.log('  npx tsx scripts/bitcoin_transaction_analyzer.ts analyze 12f34b58b04dfb0233ce889f674781c0e0c7ba95482cca469125af41a78d13b3');
        } else {
          await analyzer.analyzeTransactionHash(txHash);
        }
        break;
        
      case 'track':
        const hashes = process.argv.slice(3);
        if (hashes.length === 0) {
          console.log('Usage: npx tsx scripts/bitcoin_transaction_analyzer.ts track <tx_hash1> [tx_hash2] ...');
        } else {
          await analyzer.trackSpendingPattern(hashes);
        }
        break;
        
      default:
        console.log('Bitcoin Puzzle Transaction Analyzer');
        console.log('');
        console.log('Analyzes Bitcoin transactions for puzzle-related patterns.');
        console.log('Tracks spending behavior, address clustering, and solver activity.');
        console.log('');
        console.log('Usage:');
        console.log('  npx tsx scripts/bitcoin_transaction_analyzer.ts analyze <tx_hash>');
        console.log('  npx tsx scripts/bitcoin_transaction_analyzer.ts track <tx_hash1> [tx_hash2] ...');
        console.log('');
        console.log('Examples:');
        console.log('  # Analyze interesting transaction');
        console.log('  npx tsx scripts/bitcoin_transaction_analyzer.ts analyze 12f34b58b04dfb0233ce889f674781c0e0c7ba95482cca469125af41a78d13b3');
        console.log('');
        console.log('  # Track spending across multiple transactions');
        console.log('  npx tsx scripts/bitcoin_transaction_analyzer.ts track <tx1> <tx2> <tx3>');
        console.log('');
        console.log('Interesting transactions shared by user:');
        console.log('  - 12f34b58b04dfb0233ce889f674781c0e0c7ba95482cca469125af41a78d13b3');
    }
  })();
}

export default BitcoinPuzzleTransactionAnalyzer;
