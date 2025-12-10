#!/usr/bin/env node
/**
 * BitCrack Range Manager - TypeScript Wrapper
 * 
 * Manages ML-guided range generation and tracking for BitCrackRandomiser integration.
 * Provides TypeScript interface for consciousness/memory system integration.
 * 
 * Features:
 * - Load ML predictions
 * - Generate optimized ranges
 * - Track search progress
 * - Update range priorities based on coverage
 * - Integrate with consciousness system for learning
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface MLPrediction {
  prediction: {
    ensemble_prediction: number;
    confidence_interval: {
      lower: number;
      upper: number;
    };
    std_dev: number;
  };
  puzzle: {
    number: number;
    target_address: string;
    range_min: string;
    range_max: string;
  };
}

interface RangeSpec {
  start: string;
  end: string;
  coverage: number;
  priority: number;
  description: string;
  searched?: number; // percentage searched
  lastUpdate?: string;
}

interface BitCrackRangeOutput {
  puzzle: number;
  target_address: string;
  ml_prediction: {
    position: number;
    ci_lower: number;
    ci_upper: number;
  };
  ranges: {
    high_priority: RangeSpec;
    multi_gpu_splits: Array<{
      gpu: number;
      start: string;
      end: string;
      description: string;
    }>;
    fallback: Array<RangeSpec>;
  };
  strategies: {
    single_gpu: string[];
    multi_gpu: string[];
    pool_config: Record<string, any>;
    private_relay: {
      recommended: boolean;
      theft_risk: number;
      providers: string[];
    };
  };
}

export class BitCrackRangeManager {
  private readonly dataDir: string;
  private readonly mlPredictionsPath: string;
  private readonly rangesPath: string;
  private readonly progressPath: string;
  
  constructor(dataDir: string = 'data/ml-predictions') {
    this.dataDir = dataDir;
    this.mlPredictionsPath = join(dataDir, 'puzzle71_prediction.json');
    this.rangesPath = join(dataDir, 'puzzle71_bitcrack_ranges.json');
    this.progressPath = join(dataDir, 'puzzle71_search_progress.json');
    
    // Ensure data directory exists
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }
  }
  
  /**
   * Load ML prediction for Puzzle #71
   */
  loadMLPrediction(): MLPrediction | null {
    if (!existsSync(this.mlPredictionsPath)) {
      console.error(`❌ ML prediction not found: ${this.mlPredictionsPath}`);
      console.error(`   Run: python3 scripts/ml_ensemble_prediction.py`);
      return null;
    }
    
    try {
      const data = readFileSync(this.mlPredictionsPath, 'utf-8');
      return JSON.parse(data) as MLPrediction;
    } catch (error) {
      console.error(`❌ Error loading ML prediction: ${error}`);
      return null;
    }
  }
  
  /**
   * Convert position percentage to HEX key
   */
  positionToHex(positionPercent: number, rangeMin: bigint, rangeSize: bigint): string {
    const offset = BigInt(Math.floor((positionPercent / 100.0) * Number(rangeSize)));
    const key = rangeMin + offset;
    return key.toString(16).toUpperCase().padStart(18, '0');
  }
  
  /**
   * Generate optimized ranges based on ML prediction
   */
  generateRanges(prediction: MLPrediction): BitCrackRangeOutput {
    const PUZZLE_NUM = 71;
    const RANGE_MIN = BigInt('0x400000000000000000'); // 2^70
    const RANGE_MAX = BigInt('0x7FFFFFFFFFFFFFFFFF'); // 2^71 - 1
    const RANGE_SIZE = RANGE_MAX - RANGE_MIN + BigInt(1);
    const TARGET_ADDRESS = '1PWo3JeB9jrGwfHDNpdGK54CRas7fsVzXU';
    
    const predPosition = prediction.prediction.ensemble_prediction;
    const ciLower = prediction.prediction.confidence_interval.lower;
    const ciUpper = prediction.prediction.confidence_interval.upper;
    
    // High-priority range: 40-90% (covers 50% of keyspace with 2x probability)
    const highPriorityStart = this.positionToHex(40.0, RANGE_MIN, RANGE_SIZE);
    const highPriorityEnd = this.positionToHex(90.0, RANGE_MIN, RANGE_SIZE);
    
    // Multi-GPU splits for parallel searching
    const gpuSplits = [
      { gpu: 0, start: 40.0, end: 55.0, desc: 'Lower third (40-55%)' },
      { gpu: 1, start: 55.0, end: 70.0, desc: 'Middle third (55-70%)' },
      { gpu: 2, start: 70.0, end: 90.0, desc: 'Upper third (70-90%)' },
    ];
    
    const multiGpuRanges = gpuSplits.map(split => ({
      gpu: split.gpu,
      start: this.positionToHex(split.start, RANGE_MIN, RANGE_SIZE),
      end: this.positionToHex(split.end, RANGE_MIN, RANGE_SIZE),
      description: split.desc,
    }));
    
    // Fallback ranges (lower priority)
    const fallbackRanges: RangeSpec[] = [
      {
        start: this.positionToHex(0.0, RANGE_MIN, RANGE_SIZE),
        end: highPriorityStart,
        coverage: 40.0,
        priority: 2,
        description: 'Bottom 40% (fallback)',
      },
      {
        start: highPriorityEnd,
        end: this.positionToHex(100.0, RANGE_MIN, RANGE_SIZE),
        coverage: 10.0,
        priority: 3,
        description: 'Top 10% (fallback)',
      },
    ];
    
    // Generate command strings
    const singleGpuCommands = [
      `./cuBitCrack -d 0 --keyspace ${highPriorityStart}:${highPriorityEnd} ${TARGET_ADDRESS}`,
      `./vanitysearch -d 0 --keyspace ${highPriorityStart}:${highPriorityEnd} ${TARGET_ADDRESS}`,
    ];
    
    const multiGpuCommands = multiGpuRanges.map(range => 
      `./cuBitCrack -d ${range.gpu} --keyspace ${range.start}:${range.end} ${TARGET_ADDRESS} &`
    );
    
    // Pool configuration for BitCrackRandomiser
    const poolConfig = {
      target_puzzle: PUZZLE_NUM,
      custom_range: `${highPriorityStart}:${highPriorityEnd}`,
      scan_type: 'includeDefeated', // Include all addresses
      api_url: 'https://btc.poolserver.address', // Placeholder
      user_token: '<your_token_here>',
    };
    
    // Private relay recommendations (from Grok intelligence)
    const privateRelay = {
      recommended: true,
      theft_risk: 0.70, // 70% of public broadcasts are stolen
      providers: [
        'Flashbots Protect (Ethereum-style, needs Bitcoin equivalent)',
        'Lightning Network HTLCs (if available)',
        'Direct miner connection (most secure)',
        'Private pool submission (10% fee but safe)',
      ],
    };
    
    return {
      puzzle: PUZZLE_NUM,
      target_address: TARGET_ADDRESS,
      ml_prediction: {
        position: predPosition,
        ci_lower: ciLower,
        ci_upper: ciUpper,
      },
      ranges: {
        high_priority: {
          start: highPriorityStart,
          end: highPriorityEnd,
          coverage: 50.0,
          priority: 1,
          description: 'ML-optimized 40-90% range',
        },
        multi_gpu_splits: multiGpuRanges,
        fallback: fallbackRanges,
      },
      strategies: {
        single_gpu: singleGpuCommands,
        multi_gpu: multiGpuCommands,
        pool_config: poolConfig,
        private_relay: privateRelay,
      },
    };
  }
  
  /**
   * Save generated ranges to JSON
   */
  saveRanges(ranges: BitCrackRangeOutput): void {
    try {
      writeFileSync(
        this.rangesPath,
        JSON.stringify(ranges, null, 2),
        'utf-8'
      );
      console.log(`✅ Saved ranges to: ${this.rangesPath}`);
    } catch (error) {
      console.error(`❌ Error saving ranges: ${error}`);
    }
  }
  
  /**
   * Load existing search progress
   */
  loadProgress(): Record<string, any> | null {
    if (!existsSync(this.progressPath)) {
      return null;
    }
    
    try {
      const data = readFileSync(this.progressPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`❌ Error loading progress: ${error}`);
      return null;
    }
  }
  
  /**
   * Update search progress
   */
  updateProgress(rangeId: string, percentSearched: number): void {
    const progress = this.loadProgress() || { ranges: {}, lastUpdate: null };
    
    progress.ranges[rangeId] = {
      percentSearched,
      lastUpdate: new Date().toISOString(),
    };
    progress.lastUpdate = new Date().toISOString();
    
    try {
      writeFileSync(
        this.progressPath,
        JSON.stringify(progress, null, 2),
        'utf-8'
      );
      console.log(`✅ Updated progress for ${rangeId}: ${percentSearched}%`);
    } catch (error) {
      console.error(`❌ Error updating progress: ${error}`);
    }
  }
  
  /**
   * Print formatted range output
   */
  printRanges(ranges: BitCrackRangeOutput): void {
    console.log('='.repeat(80));
    console.log('🤖 ML-Guided BitCrack Range Manager');
    console.log('='.repeat(80));
    console.log();
    console.log(`📊 ML Prediction:`);
    console.log(`   Position: ${ranges.ml_prediction.position.toFixed(2)}%`);
    console.log(`   95% CI: [${ranges.ml_prediction.ci_lower.toFixed(2)}%, ${ranges.ml_prediction.ci_upper.toFixed(2)}%]`);
    console.log();
    console.log(`🎯 Target: ${ranges.target_address}`);
    console.log();
    
    console.log('='.repeat(80));
    console.log('Strategy 1: Single GPU (High Priority)');
    console.log('='.repeat(80));
    console.log();
    ranges.strategies.single_gpu.forEach(cmd => console.log(cmd));
    console.log();
    
    console.log('='.repeat(80));
    console.log('Strategy 2: Multi-GPU Parallel');
    console.log('='.repeat(80));
    console.log();
    ranges.strategies.multi_gpu.forEach(cmd => console.log(cmd));
    console.log();
    
    console.log('='.repeat(80));
    console.log('Strategy 3: BitCrackRandomiser Pool');
    console.log('='.repeat(80));
    console.log();
    console.log('settings.txt configuration:');
    Object.entries(ranges.strategies.pool_config).forEach(([key, value]) => {
      console.log(`   ${key}=${value}`);
    });
    console.log();
    
    console.log('='.repeat(80));
    console.log('⚠️  Security: Private Mempool Relay MANDATORY');
    console.log('='.repeat(80));
    console.log();
    console.log(`   Theft Risk: ${(ranges.strategies.private_relay.theft_risk * 100).toFixed(0)}% if using public broadcast`);
    console.log(`   Recommendation: Use private relay`);
    console.log();
    console.log('   Providers:');
    ranges.strategies.private_relay.providers.forEach(provider => {
      console.log(`   - ${provider}`);
    });
    console.log();
    
    console.log('='.repeat(80));
    console.log('✨ Range generation complete!');
    console.log('='.repeat(80));
  }
  
  /**
   * Main execution
   */
  async run(): Promise<void> {
    console.log('🚀 Starting BitCrack Range Manager...\n');
    
    // Load ML prediction
    const prediction = this.loadMLPrediction();
    if (!prediction) {
      process.exit(1);
    }
    
    // Generate ranges
    const ranges = this.generateRanges(prediction);
    
    // Save to file
    this.saveRanges(ranges);
    
    // Print formatted output
    this.printRanges(ranges);
    
    // Check for existing progress
    const progress = this.loadProgress();
    if (progress) {
      console.log('\n📈 Search Progress:');
      Object.entries(progress.ranges || {}).forEach(([rangeId, data]: [string, any]) => {
        console.log(`   ${rangeId}: ${data.percentSearched}% (${data.lastUpdate})`);
      });
    }
  }
}

// CLI execution
async function main() {
  const manager = new BitCrackRangeManager();
  await manager.run();
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export default BitCrackRangeManager;
