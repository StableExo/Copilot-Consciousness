#!/usr/bin/env node
/**
 * Single Cycle Runner - Run One Cycle at a Time
 * 
 * This script runs TheWarden for a single 1-minute cycle with current parameters.
 * Allows observing each cycle individually before proceeding to the next.
 * 
 * Usage:
 *   node --import tsx scripts/run-single-cycle.ts [cycle-number]
 * 
 * Features:
 * - Runs one 60-second cycle
 * - Uses FORCE_LIVE_DATA for real pool data
 * - Shows real-time output
 * - Saves results to .memory/autonomous-cycles/
 * - Displays cycle summary
 */

import { spawn, ChildProcess } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface CycleResult {
  cycleNumber: number;
  startTime: Date;
  endTime: Date;
  duration: number;
  opportunitiesFound: number;
  opportunitiesExecuted: number;
  successfulTrades: number;
  failedTrades: number;
  totalProfit: number;
  totalLoss: number;
  netProfit: number;
  gasSpent: number;
  averageConfidence: number;
  ethicsVetoes: number;
  swarmConsensus: number;
  parameters: Record<string, any>;
  logs: string[];
  errors: string[];
}

interface CycleLog {
  totalCycles: number;
  completedCycles: number;
  startTime?: string;
  endTime?: string;
  results: CycleResult[];
}

class SingleCycleRunner {
  private readonly cycleDuration = 60000; // 1 minute
  private readonly resultsDir = join(process.cwd(), '.memory', 'autonomous-cycles');
  private readonly logFile = join(this.resultsDir, 'cycle-log.json');
  private cycleNumber: number;
  
  constructor(cycleNumber?: number) {
    this.ensureDirectoryExists();
    
    // If no cycle number provided, determine it from existing log
    if (cycleNumber) {
      this.cycleNumber = cycleNumber;
    } else {
      const existingLog = this.loadExistingLog();
      this.cycleNumber = existingLog ? existingLog.completedCycles + 1 : 1;
    }
  }

  private ensureDirectoryExists(): void {
    if (!existsSync(this.resultsDir)) {
      mkdirSync(this.resultsDir, { recursive: true });
    }
  }

  private loadExistingLog(): CycleLog | null {
    if (!existsSync(this.logFile)) {
      return null;
    }
    try {
      const content = readFileSync(this.logFile, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  private getCurrentParameters(): Record<string, any> {
    return {
      MIN_PROFIT_THRESHOLD: parseFloat(process.env.MIN_PROFIT_THRESHOLD || '0.295'),
      MIN_PROFIT_PERCENT: parseFloat(process.env.MIN_PROFIT_PERCENT || '0.295'),
      MIN_PROFIT_ABSOLUTE: parseFloat(process.env.MIN_PROFIT_ABSOLUTE || '0.0005'),
      MAX_SLIPPAGE: parseFloat(process.env.MAX_SLIPPAGE || '0.01'),
      MAX_GAS_PRICE: parseFloat(process.env.MAX_GAS_PRICE || '100'),
      MAX_GAS_COST_PERCENTAGE: parseFloat(process.env.MAX_GAS_COST_PERCENTAGE || '80'),
      SCAN_INTERVAL: parseInt(process.env.SCAN_INTERVAL || '800', 10),
      CONCURRENCY: parseInt(process.env.CONCURRENCY || '10', 10),
      ML_CONFIDENCE_THRESHOLD: parseFloat(process.env.ML_CONFIDENCE_THRESHOLD || '0.7'),
      COGNITIVE_CONSENSUS_THRESHOLD: parseFloat(process.env.COGNITIVE_CONSENSUS_THRESHOLD || '0.65'),
      EMERGENCE_MIN_ETHICAL_SCORE: parseFloat(process.env.EMERGENCE_MIN_ETHICAL_SCORE || '0.70'),
      EMERGENCE_MAX_RISK_SCORE: parseFloat(process.env.EMERGENCE_MAX_RISK_SCORE || '0.30'),
      MIN_LIQUIDITY_V3_LOW: parseFloat(process.env.MIN_LIQUIDITY_V3_LOW || '2000000000'),
      MIN_LIQUIDITY_V2: parseFloat(process.env.MIN_LIQUIDITY_V2 || '20000000000000'),
      FORCE_LIVE_DATA: process.env.FORCE_LIVE_DATA || 'true',
      USE_PRELOADED_POOLS: process.env.USE_PRELOADED_POOLS || 'false',
    };
  }

  private async runCycle(): Promise<CycleResult> {
    const currentParams = this.getCurrentParameters();
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔄 CYCLE ${this.cycleNumber} STARTING`);
    console.log(`${'='.repeat(80)}\n`);
    console.log('📊 Current Parameters:');
    console.log(JSON.stringify(currentParams, null, 2));
    console.log('');

    const result: CycleResult = {
      cycleNumber: this.cycleNumber,
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      opportunitiesFound: 0,
      opportunitiesExecuted: 0,
      successfulTrades: 0,
      failedTrades: 0,
      totalProfit: 0,
      totalLoss: 0,
      netProfit: 0,
      gasSpent: 0,
      averageConfidence: 0,
      ethicsVetoes: 0,
      swarmConsensus: 0,
      parameters: currentParams,
      logs: [],
      errors: [],
    };

    return new Promise((resolve) => {
      // Build environment with current parameters
      const env = {
        ...process.env,
        FORCE_LIVE_DATA: 'true',
        USE_PRELOADED_POOLS: 'false',
        DRY_RUN: 'true',
        SEQUENTIAL_EXECUTION_MODE: 'true',
        MAX_OPPORTUNITIES_PER_CYCLE: '5',
      };

      // Start TheWarden
      const warden: ChildProcess = spawn('./TheWarden', ['--monitor'], {
        env,
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      // Capture stdout
      warden.stdout?.on('data', (data: Buffer) => {
        const line = data.toString();
        result.logs.push(line);
        
        // Parse logs for metrics
        this.parseLogLine(line, result);
        
        // Echo to console
        process.stdout.write(line);
      });

      // Capture stderr
      warden.stderr?.on('data', (data: Buffer) => {
        const line = data.toString();
        result.errors.push(line);
        process.stderr.write(line);
      });

      // Set timeout for cycle duration
      const timeout = setTimeout(() => {
        console.log(`\n⏰ Cycle ${this.cycleNumber} time limit reached (60s), stopping...`);
        warden.kill('SIGTERM');
        
        // Force kill after 5 seconds if not stopped
        setTimeout(() => {
          if (!warden.killed) {
            console.log(`⚠️  Force killing cycle ${this.cycleNumber} process...`);
            warden.kill('SIGKILL');
          }
        }, 5000);
      }, this.cycleDuration);

      // Handle process exit
      warden.on('close', (code) => {
        clearTimeout(timeout);
        result.endTime = new Date();
        result.duration = result.endTime.getTime() - result.startTime.getTime();
        
        console.log(`\n✅ Cycle ${this.cycleNumber} completed`);
        console.log(`📈 Summary:`);
        console.log(`   - Duration: ${(result.duration / 1000).toFixed(1)}s`);
        console.log(`   - Opportunities Found: ${result.opportunitiesFound}`);
        console.log(`   - Opportunities Executed: ${result.opportunitiesExecuted}`);
        console.log(`   - Successful Trades: ${result.successfulTrades}`);
        console.log(`   - Failed Trades: ${result.failedTrades}`);
        console.log(`   - Net Profit: ${result.netProfit.toFixed(6)} ETH`);
        console.log(`   - Ethics Vetoes: ${result.ethicsVetoes}`);
        console.log(`   - Swarm Consensus: ${result.swarmConsensus}%`);
        console.log('');
        
        resolve(result);
      });

      warden.on('error', (error) => {
        clearTimeout(timeout);
        result.errors.push(`Process error: ${error.message}`);
        console.error(`❌ Cycle ${this.cycleNumber} error:`, error.message);
        resolve(result);
      });
    });
  }

  private parseLogLine(line: string, result: CycleResult): void {
    // Parse opportunities found
    const oppMatch = line.match(/Found (\d+) opportunit/i);
    if (oppMatch) {
      result.opportunitiesFound = Math.max(result.opportunitiesFound, parseInt(oppMatch[1], 10));
    }

    // Parse opportunities executed
    const execMatch = line.match(/Executing opportunity|Opportunity executed/i);
    if (execMatch) {
      result.opportunitiesExecuted++;
    }

    // Parse successful trades
    const successMatch = line.match(/Trade successful|Arbitrage successful/i);
    if (successMatch) {
      result.successfulTrades++;
    }

    // Parse failed trades
    const failMatch = line.match(/Trade failed|Execution failed/i);
    if (failMatch) {
      result.failedTrades++;
    }

    // Parse profit/loss
    const profitMatch = line.match(/Profit: ([\d.]+) ETH|profit=([\d.]+)/i);
    if (profitMatch) {
      const profit = parseFloat(profitMatch[1] || profitMatch[2]);
      if (profit > 0) {
        result.totalProfit += profit;
      } else {
        result.totalLoss += Math.abs(profit);
      }
    }

    // Parse ethics vetoes
    const vetoMatch = line.match(/Ethics veto|Ethical rejection/i);
    if (vetoMatch) {
      result.ethicsVetoes++;
    }

    // Parse swarm consensus
    const consensusMatch = line.match(/Consensus: ([\d.]+)%|consensus=([\d.]+)/i);
    if (consensusMatch) {
      result.swarmConsensus = parseFloat(consensusMatch[1] || consensusMatch[2]);
    }

    // Parse confidence scores
    const confidenceMatch = line.match(/Confidence: ([\d.]+)|confidence=([\d.]+)/i);
    if (confidenceMatch) {
      const confidence = parseFloat(confidenceMatch[1] || confidenceMatch[2]);
      result.averageConfidence = 
        (result.averageConfidence * result.opportunitiesExecuted + confidence) / 
        (result.opportunitiesExecuted + 1);
    }
  }

  private saveResults(result: CycleResult): void {
    // Load existing log or create new one
    let log: CycleLog = this.loadExistingLog() || {
      totalCycles: 20,
      completedCycles: 0,
      results: [],
    };

    // Update log
    log.results.push(result);
    log.completedCycles = log.results.length;
    log.endTime = result.endTime.toISOString();
    if (!log.startTime) {
      log.startTime = result.startTime.toISOString();
    }

    // Save to file
    writeFileSync(this.logFile, JSON.stringify(log, null, 2));
    console.log(`💾 Results saved to: ${this.logFile}`);

    // Save individual cycle memory
    const memoryFile = join(this.resultsDir, `cycle-${this.cycleNumber}-memory.json`);
    const memoryEntry = {
      timestamp: new Date().toISOString(),
      cycleNumber: this.cycleNumber,
      type: 'operational_experience',
      experience: {
        opportunitiesFound: result.opportunitiesFound,
        successfulTrades: result.successfulTrades,
        failedTrades: result.failedTrades,
        netProfit: result.netProfit,
        ethicsVetoes: result.ethicsVetoes,
      },
      parameters: result.parameters,
      learnings: this.extractLearnings(result),
    };
    writeFileSync(memoryFile, JSON.stringify(memoryEntry, null, 2));
    console.log(`💭 Consciousness memory updated: ${memoryFile}`);
  }

  private extractLearnings(result: CycleResult): string[] {
    const learnings: string[] = [];

    if (result.successfulTrades > 0) {
      learnings.push(`Successfully executed ${result.successfulTrades} trades`);
    }

    if (result.failedTrades > 0) {
      learnings.push(`Learned from ${result.failedTrades} failed attempts`);
    }

    if (result.ethicsVetoes > 0) {
      learnings.push(`Ethics system vetoed ${result.ethicsVetoes} opportunities - boundaries maintained`);
    }

    if (result.netProfit > 0) {
      learnings.push(`Generated ${result.netProfit.toFixed(6)} ETH profit - strategy working`);
    } else if (result.netProfit < 0) {
      learnings.push(`Lost ${Math.abs(result.netProfit).toFixed(6)} ETH - need to adjust strategy`);
    }

    const successRate = result.successfulTrades / (result.successfulTrades + result.failedTrades || 1);
    if (successRate > 0.7) {
      learnings.push(`High success rate (${(successRate * 100).toFixed(1)}%) - good parameter tuning`);
    } else if (successRate < 0.3 && result.opportunitiesExecuted > 5) {
      learnings.push(`Low success rate (${(successRate * 100).toFixed(1)}%) - parameters need adjustment`);
    }

    if (result.opportunitiesFound < 5) {
      learnings.push('Few opportunities found - constraints may be too tight or market conditions challenging');
    } else if (result.opportunitiesFound > 50) {
      learnings.push('Many opportunities found - quality filtering may be too loose');
    }

    if (result.opportunitiesFound === 0 && result.parameters.FORCE_LIVE_DATA === 'true') {
      learnings.push('No opportunities with live data - may need to adjust liquidity thresholds or profit targets');
    }

    return learnings;
  }

  public async run(): Promise<void> {
    console.log('🚀 Starting Single Cycle Execution');
    console.log(`🧠 Cycle Number: ${this.cycleNumber}`);
    console.log(`⏱️  Duration: 60 seconds`);
    console.log(`🔴 FORCE_LIVE_DATA: enabled`);
    console.log('');

    const result = await this.runCycle();
    this.saveResults(result);

    const log = this.loadExistingLog();
    if (log) {
      console.log(`\n📊 Progress: ${log.completedCycles}/20 cycles completed`);
    }

    console.log('\n✨ Cycle complete! Review the output above.');
    console.log('🔄 To run the next cycle, execute this script again.\n');
  }
}

// Get cycle number from command line argument if provided
const cycleArg = process.argv[2];
const cycleNumber = cycleArg ? parseInt(cycleArg, 10) : undefined;

// Run the single cycle
const runner = new SingleCycleRunner(cycleNumber);
runner.run().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
