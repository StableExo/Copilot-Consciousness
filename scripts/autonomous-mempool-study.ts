#!/usr/bin/env node
/**
 * Autonomous Mempool Study Tool
 * 
 * Continuously studies mempool.space/mempool-block/0 to learn the rules
 * of Bitcoin block construction. Designed for TheWarden's operational context.
 * 
 * Features:
 * - Real-time block analysis
 * - Fee market dynamics tracking
 * - Transaction ordering patterns
 * - MEV opportunity detection
 * - Rule learning and documentation
 * 
 * Usage:
 *   npx tsx scripts/autonomous-mempool-study.ts [duration_minutes]
 */

import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface Transaction {
  txid: string;
  fee: number;
  vsize: number;
  feeRate: number; // sat/vB
  value: number;
  time?: number;
}

interface MempoolBlock {
  blockSize: number;
  blockVSize: number;
  nTx: number;
  totalFees: number;
  medianFee: number;
  feeRange: string;
  transactions?: Transaction[];
}

interface BlockStudyObservation {
  timestamp: string;
  blockNumber: 0; // Always 0 (next block)
  stats: {
    transactions: number;
    totalSize: number;
    totalFees: number;
    medianFeeRate: number;
    minFeeRate: number;
    maxFeeRate: number;
    avgTxSize: number;
  };
  patterns: {
    feeDistribution: Record<string, number>; // Fee buckets
    sizeDistribution: Record<string, number>; // Size buckets
    highValueTxCount: number;
    rbfEnabledCount: number;
    segwitAdoption: number; // percentage
  };
  rules: {
    observedRule: string;
    evidence: string;
    confidence: number;
  }[];
  mevOpportunities: {
    type: string;
    description: string;
    estimatedValue?: number;
  }[];
}

export class AutonomousMempoolStudy {
  private readonly outputDir: string;
  private readonly studyPath: string;
  private observations: BlockStudyObservation[] = [];
  private rulesLearned: Set<string> = new Set();
  
  constructor() {
    this.outputDir = 'data/mempool-study';
    this.studyPath = join(this.outputDir, 'autonomous-observations.json');
    
    // Create output directory if it doesn't exist
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }
    
    // Load previous observations
    if (existsSync(this.studyPath)) {
      try {
        const data = JSON.parse(readFileSync(this.studyPath, 'utf-8'));
        this.observations = data.observations || [];
        this.rulesLearned = new Set(data.rulesLearned || []);
        console.log(`✓ Loaded ${this.observations.length} previous observations`);
        console.log(`✓ Rules learned so far: ${this.rulesLearned.size}`);
      } catch (error) {
        console.log('ℹ️  Starting fresh study (no previous data)');
      }
    }
  }
  
  /**
   * Fetch next block data from mempool.space
   */
  async fetchNextBlock(): Promise<MempoolBlock | null> {
    try {
      const response = await fetch('https://mempool.space/api/v1/fees/mempool-blocks');
      if (!response.ok) return null;
      
      const data = await response.json();
      return data[0] as MempoolBlock; // First element is next block
    } catch (error: unknown) {
      const err = error as Error;
      if ('response' in err && (err as any).response?.status) {
        console.error(`Failed to fetch next block: API returned ${(err as any).response.status}`);
      } else {
        console.error(`Failed to fetch next block: ${err.message || 'Network error'}`);
      }
      return null;
    }
  }
  
  /**
   * Fetch recent transactions for detailed analysis
   */
  async fetchRecentTransactions(): Promise<Transaction[]> {
    try {
      const response = await fetch('https://mempool.space/api/mempool/recent');
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.map((tx: any) => ({
        txid: tx.txid,
        fee: tx.fee,
        vsize: tx.vsize || tx.size,
        feeRate: tx.fee / (tx.vsize || tx.size),
        value: tx.value || 0,
        time: tx.time
      }));
    } catch (error: unknown) {
      console.error('Failed to fetch recent transactions:', (error as Error).message || 'Unknown error');
      return [];
    }
  }
  
  /**
   * Analyze block and extract patterns
   */
  async analyzeBlock(): Promise<BlockStudyObservation> {
    const block = await this.fetchNextBlock();
    const transactions = await this.fetchRecentTransactions();
    
    if (!block) {
      throw new Error('Failed to fetch block data');
    }
    
    // Calculate fee statistics
    const feeRates = transactions.map(tx => tx.feeRate).filter(f => f > 0).sort((a, b) => a - b);
    const minFeeRate = feeRates[0] || 0;
    const maxFeeRate = feeRates[feeRates.length - 1] || 0;
    const medianFeeRate = feeRates[Math.floor(feeRates.length / 2)] || block.medianFee;
    
    // Analyze fee distribution
    const feeDistribution: Record<string, number> = {
      'low (1-10 sat/vB)': 0,
      'medium (10-50 sat/vB)': 0,
      'high (50-100 sat/vB)': 0,
      'urgent (100+ sat/vB)': 0,
    };
    
    transactions.forEach(tx => {
      if (tx.feeRate < 10) feeDistribution['low (1-10 sat/vB)']++;
      else if (tx.feeRate < 50) feeDistribution['medium (10-50 sat/vB)']++;
      else if (tx.feeRate < 100) feeDistribution['high (50-100 sat/vB)']++;
      else feeDistribution['urgent (100+ sat/vB)']++;
    });
    
    // Analyze size distribution
    const sizeDistribution: Record<string, number> = {
      'tiny (<250 vB)': 0,
      'small (250-500 vB)': 0,
      'medium (500-1000 vB)': 0,
      'large (1000+ vB)': 0,
    };
    
    transactions.forEach(tx => {
      if (tx.vsize < 250) sizeDistribution['tiny (<250 vB)']++;
      else if (tx.vsize < 500) sizeDistribution['small (250-500 vB)']++;
      else if (tx.vsize < 1000) sizeDistribution['medium (500-1000 vB)']++;
      else sizeDistribution['large (1000+ vB)']++;
    });
    
    // Detect high-value transactions
    const highValueTxCount = transactions.filter(tx => tx.value > 100_000_000).length; // > 1 BTC
    
    // Infer rules from observations
    const rules = this.inferRules({
      medianFeeRate,
      minFeeRate,
      maxFeeRate,
      blockSize: block.blockVSize,
      txCount: block.nTx,
      feeDistribution,
    });
    
    // Detect MEV opportunities
    const mevOpportunities = this.detectMEVOpportunities(transactions, medianFeeRate);
    
    const observation: BlockStudyObservation = {
      timestamp: new Date().toISOString(),
      blockNumber: 0,
      stats: {
        transactions: block.nTx,
        totalSize: block.blockVSize,
        totalFees: block.totalFees,
        medianFeeRate,
        minFeeRate,
        maxFeeRate,
        avgTxSize: block.blockVSize / block.nTx,
      },
      patterns: {
        feeDistribution,
        sizeDistribution,
        highValueTxCount,
        rbfEnabledCount: 0, // TODO: Implement RBF detection by analyzing nSequence values
        segwitAdoption: 0, // TODO: Implement SegWit detection by analyzing address types (bc1q vs 1 vs 3)
      },
      rules,
      mevOpportunities,
    };
    
    return observation;
  }
  
  /**
   * Infer rules from block observations
   */
  private inferRules(data: {
    medianFeeRate: number;
    minFeeRate: number;
    maxFeeRate: number;
    blockSize: number;
    txCount: number;
    feeDistribution: Record<string, number>;
  }): { observedRule: string; evidence: string; confidence: number }[] {
    const rules: { observedRule: string; evidence: string; confidence: number }[] = [];
    
    // Rule 1: Fee rate determines priority
    if (data.medianFeeRate > 0) {
      rules.push({
        observedRule: 'RULE 1: Fee rate (sat/vB) determines transaction priority',
        evidence: `Median fee: ${data.medianFeeRate.toFixed(2)} sat/vB, Range: ${data.minFeeRate.toFixed(2)}-${data.maxFeeRate.toFixed(2)}`,
        confidence: 1.0, // This is fundamental to Bitcoin
      });
      this.rulesLearned.add('fee_rate_priority');
    }
    
    // Rule 2: Block size constraint
    const maxBlockSize = 4_000_000; // 4 MB weight units
    const utilizationPercent = (data.blockSize / maxBlockSize) * 100;
    if (utilizationPercent > 50) {
      rules.push({
        observedRule: 'RULE 2: Block space is scarce (size-limited auction)',
        evidence: `Block utilization: ${utilizationPercent.toFixed(1)}% of 4 MB limit`,
        confidence: 0.95,
      });
      this.rulesLearned.add('block_size_constraint');
    }
    
    // Rule 3: Fee competition
    const feeSpread = data.maxFeeRate - data.minFeeRate;
    if (feeSpread > 50) {
      rules.push({
        observedRule: 'RULE 3: Competitive fee market exists',
        evidence: `Fee spread: ${feeSpread.toFixed(2)} sat/vB (${data.minFeeRate.toFixed(2)} to ${data.maxFeeRate.toFixed(2)})`,
        confidence: 0.9,
      });
      this.rulesLearned.add('competitive_fees');
    }
    
    // Rule 4: High-fee transactions get priority
    const urgentTxCount = data.feeDistribution['urgent (100+ sat/vB)'] || 0;
    if (urgentTxCount > 0) {
      rules.push({
        observedRule: 'RULE 4: High-fee transactions (100+ sat/vB) get immediate inclusion',
        evidence: `${urgentTxCount} urgent transactions in next block`,
        confidence: 0.85,
      });
      this.rulesLearned.add('high_fee_priority');
    }
    
    // Rule 5: Transaction count varies with activity
    const avgTxPerBlock = 2500; // Historical average
    const activityLevel = data.txCount / avgTxPerBlock;
    if (activityLevel > 1.2 || activityLevel < 0.8) {
      rules.push({
        observedRule: 'RULE 5: Network activity affects block composition',
        evidence: `Current: ${data.txCount} TXs (${(activityLevel * 100).toFixed(0)}% of average)`,
        confidence: 0.8,
      });
      this.rulesLearned.add('variable_activity');
    }
    
    return rules;
  }
  
  /**
   * Detect potential MEV opportunities
   */
  private detectMEVOpportunities(
    transactions: Transaction[],
    medianFeeRate: number
  ): { type: string; description: string; estimatedValue?: number }[] {
    const opportunities: { type: string; description: string; estimatedValue?: number }[] = [];
    
    // Opportunity 1: High-value transactions with low fees
    const vulnerableTxs = transactions.filter(
      tx => tx.value > 10_000_000 && tx.feeRate < medianFeeRate * 0.8
    );
    
    if (vulnerableTxs.length > 0) {
      opportunities.push({
        type: 'FRONT_RUNNING',
        description: `${vulnerableTxs.length} high-value TX(s) with below-median fees (potential front-run targets)`,
        estimatedValue: vulnerableTxs.reduce((sum, tx) => sum + tx.value, 0),
      });
    }
    
    // Opportunity 2: Fee spike indicating urgency
    const urgentTxs = transactions.filter(tx => tx.feeRate > medianFeeRate * 2);
    if (urgentTxs.length > 3) {
      opportunities.push({
        type: 'FEE_SPIKE',
        description: `${urgentTxs.length} transactions with 2x+ median fee (urgent activity detected)`,
      });
    }
    
    // Opportunity 3: Large transaction batches
    const largeTxs = transactions.filter(tx => tx.vsize > 1000);
    if (largeTxs.length > 5) {
      opportunities.push({
        type: 'BATCH_ACTIVITY',
        description: `${largeTxs.length} large transactions (exchange withdrawal or consolidation likely)`,
      });
    }
    
    return opportunities;
  }
  
  /**
   * Display current observation
   */
  displayObservation(obs: BlockStudyObservation): void {
    const timestamp = new Date(obs.timestamp).toLocaleTimeString();
    
    console.log('\n' + '═'.repeat(80));
    console.log(`📊 Mempool Block #0 Analysis - ${timestamp}`);
    console.log('═'.repeat(80));
    
    console.log('\n📈 Statistics:');
    console.log(`   Transactions: ${obs.stats.transactions.toLocaleString()}`);
    console.log(`   Total Size: ${(obs.stats.totalSize / 1_000_000).toFixed(2)} MB`);
    console.log(`   Total Fees: ${(obs.stats.totalFees / 100_000_000).toFixed(8)} BTC`);
    console.log(`   Fee Rate: ${obs.stats.minFeeRate.toFixed(2)} - ${obs.stats.maxFeeRate.toFixed(2)} sat/vB (median: ${obs.stats.medianFeeRate.toFixed(2)})`);
    console.log(`   Avg TX Size: ${obs.stats.avgTxSize.toFixed(0)} vB`);
    
    console.log('\n📊 Fee Distribution:');
    Object.entries(obs.patterns.feeDistribution).forEach(([bucket, count]) => {
      const percent = (count / obs.stats.transactions * 100).toFixed(1);
      const bar = '█'.repeat(Math.floor(count / obs.stats.transactions * 50));
      console.log(`   ${bucket.padEnd(25)}: ${count.toString().padStart(4)} (${percent.padStart(5)}%) ${bar}`);
    });
    
    if (obs.patterns.highValueTxCount > 0) {
      console.log(`\n💎 High-Value: ${obs.patterns.highValueTxCount} transaction(s) > 1 BTC`);
    }
    
    if (obs.rules.length > 0) {
      console.log('\n📖 Rules Observed:');
      obs.rules.forEach((rule, i) => {
        console.log(`   ${i + 1}. ${rule.observedRule}`);
        console.log(`      Evidence: ${rule.evidence}`);
        console.log(`      Confidence: ${(rule.confidence * 100).toFixed(0)}%`);
      });
    }
    
    if (obs.mevOpportunities.length > 0) {
      console.log('\n🎯 MEV Opportunities Detected:');
      obs.mevOpportunities.forEach((opp, i) => {
        console.log(`   ${i + 1}. [${opp.type}] ${opp.description}`);
        if (opp.estimatedValue) {
          console.log(`      Estimated Value: ${(opp.estimatedValue / 100_000_000).toFixed(8)} BTC`);
        }
      });
    }
    
    console.log('\n' + '═'.repeat(80));
  }
  
  /**
   * Save observations to disk
   */
  saveStudy(): void {
    const data = {
      studyStarted: this.observations[0]?.timestamp || new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      totalObservations: this.observations.length,
      rulesLearned: Array.from(this.rulesLearned),
      observations: this.observations,
    };
    
    writeFileSync(this.studyPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`\n💾 Saved ${this.observations.length} observations to ${this.studyPath}`);
  }
  
  /**
   * Generate summary report
   */
  generateSummary(): void {
    if (this.observations.length === 0) {
      console.log('\n⚠️ No observations recorded yet');
      return;
    }
    
    console.log('\n' + '═'.repeat(80));
    console.log('📊 AUTONOMOUS MEMPOOL STUDY SUMMARY');
    console.log('═'.repeat(80));
    
    console.log(`\n🔬 Study Duration: ${this.observations.length} observations`);
    console.log(`📚 Rules Learned: ${this.rulesLearned.size}`);
    
    // Calculate averages
    const avgStats = {
      transactions: 0,
      totalFees: 0,
      medianFeeRate: 0,
      blockSize: 0,
    };
    
    this.observations.forEach(obs => {
      avgStats.transactions += obs.stats.transactions;
      avgStats.totalFees += obs.stats.totalFees;
      avgStats.medianFeeRate += obs.stats.medianFeeRate;
      avgStats.blockSize += obs.stats.totalSize;
    });
    
    const count = this.observations.length;
    avgStats.transactions /= count;
    avgStats.totalFees /= count;
    avgStats.medianFeeRate /= count;
    avgStats.blockSize /= count;
    
    console.log('\n📈 Average Block Characteristics:');
    console.log(`   Transactions: ${avgStats.transactions.toFixed(0)}`);
    console.log(`   Block Size: ${(avgStats.blockSize / 1_000_000).toFixed(2)} MB`);
    console.log(`   Fees: ${(avgStats.totalFees / 100_000_000).toFixed(8)} BTC`);
    console.log(`   Median Fee Rate: ${avgStats.medianFeeRate.toFixed(2)} sat/vB`);
    
    // Count MEV opportunities
    const mevCount = this.observations.reduce(
      (sum, obs) => sum + obs.mevOpportunities.length,
      0
    );
    
    if (mevCount > 0) {
      console.log(`\n🎯 MEV Opportunities: ${mevCount} detected across all observations`);
    }
    
    console.log('\n📖 Rules Learned:');
    Array.from(this.rulesLearned).forEach((rule, i) => {
      console.log(`   ${i + 1}. ${rule.replace(/_/g, ' ').toUpperCase()}`);
    });
    
    console.log('\n' + '═'.repeat(80));
  }
  
  /**
   * Run autonomous study for specified duration
   */
  async runStudy(durationMinutes: number = 10, intervalSeconds: number = 30): Promise<void> {
    console.log('\n' + '═'.repeat(80));
    console.log('🤖 AUTONOMOUS MEMPOOL STUDY - STARTING');
    console.log('═'.repeat(80));
    console.log(`\n⏱️  Duration: ${durationMinutes} minutes`);
    console.log(`📡 Interval: ${intervalSeconds} seconds`);
    console.log(`🎯 Target: https://mempool.space/mempool-block/0`);
    console.log(`📚 Learning: Block construction rules for TheWarden\n`);
    
    const endTime = Date.now() + durationMinutes * 60 * 1000;
    let observationCount = 0;
    
    const observe = async () => {
      try {
        console.log(`\n[Observation #${observationCount + 1}]`);
        const observation = await this.analyzeBlock();
        this.observations.push(observation);
        this.displayObservation(observation);
        observationCount++;
        
        // Save periodically
        if (observationCount % 5 === 0) {
          this.saveStudy();
        }
      } catch (error: unknown) {
        console.error(`❌ Observation failed: ${(error as Error).message || 'Unknown error'}`);
      }
    };
    
    // Initial observation
    await observe();
    
    // Periodic observations
    const timer = setInterval(async () => {
      if (Date.now() >= endTime) {
        clearInterval(timer);
        this.saveStudy();
        this.generateSummary();
        console.log('\n✅ Study complete!\n');
        process.exit(0);
      } else {
        await observe();
      }
    }, intervalSeconds * 1000);
    
    // Handle early termination
    process.on('SIGINT', () => {
      clearInterval(timer);
      this.saveStudy();
      this.generateSummary();
      console.log('\n⚠️ Study interrupted by user\n');
      process.exit(0);
    });
  }
}

// CLI interface - more reliable module detection
if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const durationMinutes = parseInt(process.argv[2] || '10', 10);
  const study = new AutonomousMempoolStudy();
  
  study.runStudy(durationMinutes).catch(error => {
    console.error('Study failed:', error);
    process.exit(1);
  });
}

export default AutonomousMempoolStudy;
