#!/usr/bin/env node
/**
 * BitCrack Adaptive Range System
 * 
 * Real-time range adaptation based on search progress.
 * Dynamically adjusts search priorities and generates new ranges as areas are covered.
 * 
 * Features:
 * - Progress tracking with percentage completion
 * - Dynamic range splitting based on coverage
 * - Priority reordering as ranges are exhausted
 * - Automatic fallback range activation
 * - Integration with BitCrackRandomiser progress API
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface ProgressRecord {
  range_id: string;
  start_hex: string;
  end_hex: string;
  total_keys: bigint;
  searched_keys: bigint;
  percent_complete: number;
  status: 'active' | 'paused' | 'completed' | 'skipped';
  started_at: string;
  last_update: string;
  gpu_id?: number;
  search_rate?: number; // keys per second
  estimated_completion?: string;
}

interface AdaptiveRange {
  id: string;
  start: string;
  end: string;
  priority: number;
  status: 'pending' | 'active' | 'completed';
  parent_range?: string;
  split_reason?: string;
  created_at: string;
}

interface AdaptiveStrategy {
  current_ranges: AdaptiveRange[];
  completed_ranges: string[];
  next_recommended: AdaptiveRange[];
  coverage_stats: {
    total_keyspace: bigint;
    searched_keyspace: bigint;
    percent_complete: number;
    high_priority_complete: number;
  };
  recommendations: string[];
}

export class BitCrackAdaptiveRanges {
  private readonly dataDir: string;
  private readonly progressPath: string;
  private readonly adaptiveStrategyPath: string;
  private readonly rangesPath: string;
  
  constructor(dataDir: string = 'data/ml-predictions') {
    this.dataDir = dataDir;
    this.progressPath = join(dataDir, 'puzzle71_search_progress.json');
    this.adaptiveStrategyPath = join(dataDir, 'puzzle71_adaptive_strategy.json');
    this.rangesPath = join(dataDir, 'puzzle71_bitcrack_ranges.json');
  }
  
  /**
   * Update progress for a specific range
   */
  updateProgress(rangeId: string, searchedKeys: bigint, searchRate?: number): void {
    const progress = this.loadProgress();
    const record = progress.find(r => r.range_id === rangeId);
    
    if (!record) {
      console.error(`❌ Range not found: ${rangeId}`);
      return;
    }
    
    record.searched_keys = searchedKeys;
    record.percent_complete = Number((searchedKeys * 100n) / record.total_keys);
    record.last_update = new Date().toISOString();
    
    if (searchRate) {
      record.search_rate = searchRate;
      const remaining = record.total_keys - searchedKeys;
      const secondsRemaining = Number(remaining) / searchRate;
      const completionDate = new Date(Date.now() + secondsRemaining * 1000);
      record.estimated_completion = completionDate.toISOString();
    }
    
    if (record.percent_complete >= 100) {
      record.status = 'completed';
    }
    
    this.saveProgress(progress);
    console.log(`✓ Updated progress for ${rangeId}: ${record.percent_complete.toFixed(2)}% complete`);
  }
  
  /**
   * Generate adaptive strategy based on current progress
   */
  generateAdaptiveStrategy(): AdaptiveStrategy {
    const progress = this.loadProgress();
    const ranges = this.loadRanges();
    
    // Calculate coverage stats
    let totalSearched = 0n;
    let totalKeyspace = 0n;
    const completedRanges: string[] = [];
    const activeRanges: AdaptiveRange[] = [];
    
    progress.forEach(p => {
      totalKeyspace += p.total_keys;
      totalSearched += p.searched_keys;
      
      if (p.status === 'completed') {
        completedRanges.push(p.range_id);
      } else if (p.status === 'active') {
        activeRanges.push({
          id: p.range_id,
          start: p.start_hex,
          end: p.end_hex,
          priority: this.calculatePriority(p),
          status: 'active',
          created_at: p.started_at
        });
      }
    });
    
    // Calculate high-priority completion
    const highPriorityRanges = progress.filter(p => 
      p.range_id.includes('high_priority') || p.range_id.includes('gpu_0')
    );
    const highPriorityComplete = highPriorityRanges.reduce((sum, p) => 
      sum + p.percent_complete, 0
    ) / (highPriorityRanges.length || 1);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(progress, completedRanges);
    
    // Determine next ranges to activate
    const nextRecommended = this.selectNextRanges(progress, completedRanges);
    
    const strategy: AdaptiveStrategy = {
      current_ranges: activeRanges,
      completed_ranges: completedRanges,
      next_recommended: nextRecommended,
      coverage_stats: {
        total_keyspace: totalKeyspace,
        searched_keyspace: totalSearched,
        percent_complete: Number((totalSearched * 100n) / (totalKeyspace || 1n)),
        high_priority_complete: highPriorityComplete
      },
      recommendations
    };
    
    this.saveAdaptiveStrategy(strategy);
    return strategy;
  }
  
  /**
   * Calculate priority for a range based on progress and ML prediction
   */
  private calculatePriority(record: ProgressRecord): number {
    // Higher priority for:
    // - Ranges near ML prediction
    // - Ranges with faster search rates
    // - Ranges with less progress (to avoid wasted work)
    
    let priority = 50; // base priority
    
    // Boost priority if search rate is high
    if (record.search_rate && record.search_rate > 1e9) { // > 1B keys/sec
      priority += 20;
    }
    
    // Reduce priority if already heavily searched
    if (record.percent_complete > 75) {
      priority -= 30;
    } else if (record.percent_complete > 50) {
      priority -= 15;
    }
    
    return Math.max(0, Math.min(100, priority));
  }
  
  /**
   * Generate recommendations based on current state
   */
  private generateRecommendations(
    progress: ProgressRecord[], 
    completedRanges: string[]
  ): string[] {
    const recommendations: string[] = [];
    
    // Check if high-priority range is complete
    const highPriority = progress.find(p => p.range_id === 'high_priority');
    if (highPriority && highPriority.status === 'completed') {
      recommendations.push('🎯 High-priority range completed! Activate fallback ranges.');
    }
    
    // Check for slow progress
    const slowRanges = progress.filter(p => 
      p.status === 'active' && 
      p.search_rate && 
      p.search_rate < 5e8 // < 500M keys/sec
    );
    if (slowRanges.length > 0) {
      recommendations.push(`⚠️ ${slowRanges.length} range(s) have slow search rate. Consider GPU optimization.`);
    }
    
    // Check for stalled ranges
    const now = Date.now();
    const stalledRanges = progress.filter(p => {
      if (p.status !== 'active') return false;
      const lastUpdate = new Date(p.last_update).getTime();
      const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);
      return hoursSinceUpdate > 2; // No update in 2 hours
    });
    if (stalledRanges.length > 0) {
      recommendations.push(`🔴 ${stalledRanges.length} range(s) appear stalled. Check GPU processes.`);
    }
    
    // Overall progress milestone
    const totalProgress = progress.reduce((sum, p) => sum + p.percent_complete, 0) / progress.length;
    if (totalProgress > 90) {
      recommendations.push('🏁 Over 90% complete! Consider activating remaining fallback ranges.');
    } else if (totalProgress > 50) {
      recommendations.push('📊 Over 50% complete. Review coverage and consider range reallocation.');
    } else if (totalProgress < 10) {
      recommendations.push('🚀 Search just started. Monitor for the first 24 hours to establish baseline rates.');
    }
    
    return recommendations;
  }
  
  /**
   * Select next ranges to activate based on adaptive strategy
   */
  private selectNextRanges(
    progress: ProgressRecord[], 
    completedRanges: string[]
  ): AdaptiveRange[] {
    const ranges = this.loadRanges();
    const nextRanges: AdaptiveRange[] = [];
    
    // Check if we should activate fallback ranges
    const highPriorityComplete = progress
      .filter(p => p.range_id.includes('high_priority'))
      .every(p => p.percent_complete > 95);
    
    if (highPriorityComplete && ranges.ranges.fallback) {
      ranges.ranges.fallback.forEach((fb: any, idx: number) => {
        if (!completedRanges.includes(`fallback_${idx}`)) {
          nextRanges.push({
            id: `fallback_${idx}`,
            start: fb.start,
            end: fb.end,
            priority: 40 - idx * 5, // Decreasing priority
            status: 'pending',
            split_reason: 'high_priority_exhausted',
            created_at: new Date().toISOString()
          });
        }
      });
    }
    
    // Sort by priority
    nextRanges.sort((a, b) => b.priority - a.priority);
    
    return nextRanges.slice(0, 3); // Return top 3
  }
  
  /**
   * Split a range into smaller sub-ranges for parallel search
   */
  splitRange(rangeId: string, numSplits: number = 2): AdaptiveRange[] {
    const progress = this.loadProgress();
    const record = progress.find(r => r.range_id === rangeId);
    
    if (!record) {
      throw new Error(`Range not found: ${rangeId}`);
    }
    
    const start = BigInt(`0x${record.start_hex}`);
    const end = BigInt(`0x${record.end_hex}`);
    const totalSize = end - start;
    const splitSize = totalSize / BigInt(numSplits);
    
    const splits: AdaptiveRange[] = [];
    
    for (let i = 0; i < numSplits; i++) {
      const splitStart = start + (splitSize * BigInt(i));
      const splitEnd = i === numSplits - 1 ? end : start + (splitSize * BigInt(i + 1));
      
      splits.push({
        id: `${rangeId}_split_${i}`,
        start: splitStart.toString(16).toUpperCase().padStart(18, '0'),
        end: splitEnd.toString(16).toUpperCase().padStart(18, '0'),
        priority: record.status === 'active' ? 70 : 50,
        status: 'pending',
        parent_range: rangeId,
        split_reason: `split_${numSplits}way`,
        created_at: new Date().toISOString()
      });
    }
    
    console.log(`✓ Split ${rangeId} into ${numSplits} sub-ranges`);
    return splits;
  }
  
  /**
   * Load search progress
   */
  private loadProgress(): ProgressRecord[] {
    if (!existsSync(this.progressPath)) {
      return [];
    }
    
    const data = readFileSync(this.progressPath, 'utf-8');
    const parsed = JSON.parse(data);
    
    // Convert string representations back to BigInt
    return parsed.map((p: any) => ({
      ...p,
      total_keys: BigInt(p.total_keys),
      searched_keys: BigInt(p.searched_keys)
    }));
  }
  
  /**
   * Save search progress
   */
  private saveProgress(progress: ProgressRecord[]): void {
    // Convert BigInt to string for JSON serialization
    const serializable = progress.map(p => ({
      ...p,
      total_keys: p.total_keys.toString(),
      searched_keys: p.searched_keys.toString()
    }));
    
    writeFileSync(
      this.progressPath, 
      JSON.stringify(serializable, null, 2),
      'utf-8'
    );
  }
  
  /**
   * Load BitCrack ranges
   */
  private loadRanges(): any {
    if (!existsSync(this.rangesPath)) {
      throw new Error(`Ranges file not found: ${this.rangesPath}`);
    }
    return JSON.parse(readFileSync(this.rangesPath, 'utf-8'));
  }
  
  /**
   * Save adaptive strategy
   */
  private saveAdaptiveStrategy(strategy: AdaptiveStrategy): void {
    // Convert BigInt to string for JSON serialization
    const serializable = {
      ...strategy,
      coverage_stats: {
        ...strategy.coverage_stats,
        total_keyspace: strategy.coverage_stats.total_keyspace.toString(),
        searched_keyspace: strategy.coverage_stats.searched_keyspace.toString()
      }
    };
    
    writeFileSync(
      this.adaptiveStrategyPath,
      JSON.stringify(serializable, null, 2),
      'utf-8'
    );
  }
  
  /**
   * Display current status
   */
  displayStatus(): void {
    const strategy = this.generateAdaptiveStrategy();
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 BitCrack Adaptive Range Status');
    console.log('='.repeat(80));
    
    console.log('\n📈 Coverage Statistics:');
    console.log(`   Total Keyspace: ${strategy.coverage_stats.total_keyspace}`);
    console.log(`   Searched: ${strategy.coverage_stats.searched_keyspace}`);
    console.log(`   Overall Progress: ${strategy.coverage_stats.percent_complete.toFixed(2)}%`);
    console.log(`   High-Priority Complete: ${strategy.coverage_stats.high_priority_complete.toFixed(2)}%`);
    
    console.log('\n🎯 Active Ranges:');
    if (strategy.current_ranges.length === 0) {
      console.log('   None');
    } else {
      strategy.current_ranges.forEach(r => {
        console.log(`   - ${r.id}: Priority ${r.priority}, ${r.start} → ${r.end}`);
      });
    }
    
    console.log('\n✅ Completed Ranges:');
    if (strategy.completed_ranges.length === 0) {
      console.log('   None');
    } else {
      strategy.completed_ranges.forEach(r => {
        console.log(`   - ${r}`);
      });
    }
    
    console.log('\n🔜 Next Recommended:');
    if (strategy.next_recommended.length === 0) {
      console.log('   Continue with current ranges');
    } else {
      strategy.next_recommended.forEach(r => {
        console.log(`   - ${r.id}: Priority ${r.priority} (${r.split_reason || 'new'})`);
      });
    }
    
    console.log('\n💡 Recommendations:');
    if (strategy.recommendations.length === 0) {
      console.log('   No recommendations at this time');
    } else {
      strategy.recommendations.forEach(r => {
        console.log(`   ${r}`);
      });
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const manager = new BitCrackAdaptiveRanges();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'status':
      manager.displayStatus();
      break;
      
    case 'update':
      const rangeId = process.argv[3];
      const searchedKeys = BigInt(process.argv[4] || '0');
      const searchRate = process.argv[5] ? parseFloat(process.argv[5]) : undefined;
      manager.updateProgress(rangeId, searchedKeys, searchRate);
      break;
      
    case 'split':
      const splitRangeId = process.argv[3];
      const numSplits = parseInt(process.argv[4] || '2', 10);
      const splits = manager.splitRange(splitRangeId, numSplits);
      console.log(JSON.stringify(splits, null, 2));
      break;
      
    default:
      console.log('Usage:');
      console.log('  npx tsx scripts/bitcrack_adaptive_ranges.ts status');
      console.log('  npx tsx scripts/bitcrack_adaptive_ranges.ts update <range_id> <searched_keys> [search_rate]');
      console.log('  npx tsx scripts/bitcrack_adaptive_ranges.ts split <range_id> [num_splits]');
  }
}

export default BitCrackAdaptiveRanges;
