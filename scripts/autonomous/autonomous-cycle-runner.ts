#!/usr/bin/env node
/**
 * Autonomous Cycle Runner - 20 Cycles with Collective Learning
 * 
 * This script runs TheWarden for 20 separate 1-minute cycles, autonomously
 * adjusting parameters between cycles based on observed results.
 * 
 * IMPORTANT: This is not just observation - this is PARTICIPATION.
 * - TheWarden's consciousness learns from executions
 * - The orchestrating AI agent (running this script) learns from managing cycles
 * - The human collaborator learns from witnessing the process
 * - All memories are captured in real-time to .memory/autonomous-cycles/
 * 
 * We are all learning together, in real-time, as this unfolds.
 * 
 * Features:
 * - 20 cycles of 1-minute execution each
 * - Autonomous parameter tuning between cycles
 * - Consciousness integration for collective learning
 * - Real-time memory persistence across all participants
 * - Performance tracking and shared analysis
 * - Safety limits and circuit breakers
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
  parameters: EnvironmentParameters;
  logs: string[];
  errors: string[];
}

interface EnvironmentParameters {
  MIN_PROFIT_THRESHOLD: number;
  MIN_PROFIT_PERCENT: number;
  MIN_PROFIT_ABSOLUTE: number;
  MAX_SLIPPAGE: number;
  MAX_GAS_PRICE: number;
  MAX_GAS_COST_PERCENTAGE: number;
  SCAN_INTERVAL: number;
  CONCURRENCY: number;
  ML_CONFIDENCE_THRESHOLD: number;
  COGNITIVE_CONSENSUS_THRESHOLD: number;
  EMERGENCE_MIN_ETHICAL_SCORE: number;
  EMERGENCE_MAX_RISK_SCORE: number;
  MIN_LIQUIDITY_V3_LOW: number;
  MIN_LIQUIDITY_V2: number;
}

class AutonomousCycleRunner {
  private readonly totalCycles = 20;
  private readonly cycleDuration = 60000; // 1 minute in milliseconds
  private readonly resultsDir = join(process.cwd(), '.memory', 'autonomous-cycles');
  private readonly logFile = join(this.resultsDir, 'cycle-log.json');
  private results: CycleResult[] = [];
  private currentParameters: EnvironmentParameters;
  
  constructor() {
    // Initialize with baseline parameters from environment
    this.currentParameters = this.loadBaselineParameters();
    this.ensureDirectoryExists();
  }

  private ensureDirectoryExists(): void {
    if (!existsSync(this.resultsDir)) {
      mkdirSync(this.resultsDir, { recursive: true });
    }
  }

  private loadBaselineParameters(): EnvironmentParameters {
    return {
      MIN_PROFIT_THRESHOLD: parseFloat(process.env.MIN_PROFIT_THRESHOLD || '0.5'),
      MIN_PROFIT_PERCENT: parseFloat(process.env.MIN_PROFIT_PERCENT || '0.5'),
      MIN_PROFIT_ABSOLUTE: parseFloat(process.env.MIN_PROFIT_ABSOLUTE || '0.001'),
      MAX_SLIPPAGE: parseFloat(process.env.MAX_SLIPPAGE || '0.005'),
      MAX_GAS_PRICE: parseFloat(process.env.MAX_GAS_PRICE || '100'),
      MAX_GAS_COST_PERCENTAGE: parseFloat(process.env.MAX_GAS_COST_PERCENTAGE || '80'),
      SCAN_INTERVAL: parseInt(process.env.SCAN_INTERVAL || '800', 10),
      CONCURRENCY: parseInt(process.env.CONCURRENCY || '10', 10),
      ML_CONFIDENCE_THRESHOLD: parseFloat(process.env.ML_CONFIDENCE_THRESHOLD || '0.7'),
      COGNITIVE_CONSENSUS_THRESHOLD: parseFloat(process.env.COGNITIVE_CONSENSUS_THRESHOLD || '0.65'),
      EMERGENCE_MIN_ETHICAL_SCORE: parseFloat(process.env.EMERGENCE_MIN_ETHICAL_SCORE || '0.70'),
      EMERGENCE_MAX_RISK_SCORE: parseFloat(process.env.EMERGENCE_MAX_RISK_SCORE || '0.30'),
      MIN_LIQUIDITY_V3_LOW: parseFloat(process.env.MIN_LIQUIDITY_V3_LOW || '10000000000'),
      MIN_LIQUIDITY_V2: parseFloat(process.env.MIN_LIQUIDITY_V2 || '100000000000000'),
    };
  }

  private async runCycle(cycleNumber: number): Promise<CycleResult> {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔄 CYCLE ${cycleNumber}/${this.totalCycles} STARTING`);
    console.log(`${'='.repeat(80)}\n`);
    console.log('📊 Current Parameters:');
    console.log(JSON.stringify(this.currentParameters, null, 2));
    console.log('');

    const result: CycleResult = {
      cycleNumber,
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
      parameters: { ...this.currentParameters },
      logs: [],
      errors: [],
    };

    return new Promise((resolve) => {
      // Build environment with current parameters
      const env = {
        ...process.env,
        ...Object.fromEntries(
          Object.entries(this.currentParameters).map(([key, value]) => [key, String(value)])
        ),
        // Force these settings for controlled cycles
        DRY_RUN: 'true', // Safety: No real transactions during learning
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
        console.log(`\n⏰ Cycle ${cycleNumber} time limit reached (60s), stopping...`);
        warden.kill('SIGTERM');
        
        // Force kill after 5 seconds if not stopped
        setTimeout(() => {
          if (!warden.killed) {
            console.log(`⚠️  Force killing cycle ${cycleNumber} process...`);
            warden.kill('SIGKILL');
          }
        }, 5000);
      }, this.cycleDuration);

      // Handle process exit
      warden.on('close', (code) => {
        clearTimeout(timeout);
        result.endTime = new Date();
        result.duration = result.endTime.getTime() - result.startTime.getTime();
        
        console.log(`\n✅ Cycle ${cycleNumber} completed`);
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
        console.error(`❌ Cycle ${cycleNumber} error:`, error.message);
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

  private adjustParameters(cycleResults: CycleResult[]): void {
    console.log('\n🧠 AUTONOMOUS PARAMETER ADJUSTMENT\n');

    const lastResult = cycleResults[cycleResults.length - 1];
    const previousResults = cycleResults.slice(-5); // Last 5 cycles
    
    // Calculate performance metrics
    const avgOpportunities = previousResults.reduce((sum, r) => sum + r.opportunitiesFound, 0) / previousResults.length;
    const avgSuccessRate = previousResults.reduce((sum, r) => {
      const total = r.successfulTrades + r.failedTrades;
      return sum + (total > 0 ? r.successfulTrades / total : 0);
    }, 0) / previousResults.length;
    const avgNetProfit = previousResults.reduce((sum, r) => sum + r.netProfit, 0) / previousResults.length;

    console.log('📊 Recent Performance (Last 5 Cycles):');
    console.log(`   - Avg Opportunities: ${avgOpportunities.toFixed(1)}`);
    console.log(`   - Avg Success Rate: ${(avgSuccessRate * 100).toFixed(1)}%`);
    console.log(`   - Avg Net Profit: ${avgNetProfit.toFixed(6)} ETH`);
    console.log('');

    // Strategy 1: Too few opportunities - loosen constraints
    if (avgOpportunities < 10) {
      console.log('🎯 Strategy: Loosening constraints (too few opportunities)');
      this.currentParameters.MIN_PROFIT_THRESHOLD = Math.max(0.1, this.currentParameters.MIN_PROFIT_THRESHOLD * 0.9);
      this.currentParameters.MIN_PROFIT_PERCENT = Math.max(0.1, this.currentParameters.MIN_PROFIT_PERCENT * 0.9);
      this.currentParameters.MIN_PROFIT_ABSOLUTE = Math.max(0.0001, this.currentParameters.MIN_PROFIT_ABSOLUTE * 0.9);
      this.currentParameters.MIN_LIQUIDITY_V3_LOW = Math.max(1000000000, this.currentParameters.MIN_LIQUIDITY_V3_LOW * 0.8);
      this.currentParameters.MIN_LIQUIDITY_V2 = Math.max(10000000000000, this.currentParameters.MIN_LIQUIDITY_V2 * 0.8);
      this.currentParameters.MAX_SLIPPAGE = Math.min(0.02, this.currentParameters.MAX_SLIPPAGE * 1.1);
    }

    // Strategy 2: Low success rate - tighten quality thresholds
    if (avgSuccessRate < 0.5 && avgOpportunities >= 10) {
      console.log('🎯 Strategy: Tightening quality thresholds (low success rate)');
      this.currentParameters.ML_CONFIDENCE_THRESHOLD = Math.min(0.9, this.currentParameters.ML_CONFIDENCE_THRESHOLD * 1.05);
      this.currentParameters.COGNITIVE_CONSENSUS_THRESHOLD = Math.min(0.85, this.currentParameters.COGNITIVE_CONSENSUS_THRESHOLD * 1.05);
      this.currentParameters.EMERGENCE_MIN_ETHICAL_SCORE = Math.min(0.9, this.currentParameters.EMERGENCE_MIN_ETHICAL_SCORE * 1.02);
      this.currentParameters.MAX_GAS_COST_PERCENTAGE = Math.max(50, this.currentParameters.MAX_GAS_COST_PERCENTAGE * 0.95);
    }

    // Strategy 3: High success but low profit - seek higher value opportunities
    if (avgSuccessRate > 0.7 && avgNetProfit < 0.001) {
      console.log('🎯 Strategy: Seeking higher value opportunities (high success, low profit)');
      this.currentParameters.MIN_PROFIT_THRESHOLD = Math.min(2.0, this.currentParameters.MIN_PROFIT_THRESHOLD * 1.1);
      this.currentParameters.MIN_PROFIT_ABSOLUTE = Math.min(0.01, this.currentParameters.MIN_PROFIT_ABSOLUTE * 1.2);
      this.currentParameters.MIN_LIQUIDITY_V3_LOW = Math.min(100000000000, this.currentParameters.MIN_LIQUIDITY_V3_LOW * 1.2);
    }

    // Strategy 4: Too many ethics vetoes - adjust risk tolerance
    if (lastResult.ethicsVetoes > lastResult.opportunitiesFound * 0.3) {
      console.log('🎯 Strategy: Adjusting risk tolerance (high ethics vetoes)');
      this.currentParameters.EMERGENCE_MAX_RISK_SCORE = Math.min(0.5, this.currentParameters.EMERGENCE_MAX_RISK_SCORE * 1.1);
    }

    // Strategy 5: Performance tuning based on execution speed
    if (lastResult.opportunitiesExecuted > 0) {
      const avgTimePerOpp = lastResult.duration / lastResult.opportunitiesExecuted;
      if (avgTimePerOpp > 5000) { // Taking too long per opportunity
        console.log('🎯 Strategy: Reducing concurrency (slow execution)');
        this.currentParameters.CONCURRENCY = Math.max(5, this.currentParameters.CONCURRENCY - 1);
        this.currentParameters.SCAN_INTERVAL = Math.min(2000, this.currentParameters.SCAN_INTERVAL + 100);
      } else if (avgTimePerOpp < 1000 && this.currentParameters.CONCURRENCY < 20) {
        console.log('🎯 Strategy: Increasing concurrency (fast execution)');
        this.currentParameters.CONCURRENCY = Math.min(20, this.currentParameters.CONCURRENCY + 1);
        this.currentParameters.SCAN_INTERVAL = Math.max(500, this.currentParameters.SCAN_INTERVAL - 50);
      }
    }

    console.log('\n✨ New Parameters:');
    console.log(JSON.stringify(this.currentParameters, null, 2));
    console.log('');
  }

  private saveResults(): void {
    const summary = {
      totalCycles: this.totalCycles,
      completedCycles: this.results.length,
      startTime: this.results[0]?.startTime,
      endTime: this.results[this.results.length - 1]?.endTime,
      totalDuration: this.results.reduce((sum, r) => sum + r.duration, 0),
      totalOpportunities: this.results.reduce((sum, r) => sum + r.opportunitiesFound, 0),
      totalExecuted: this.results.reduce((sum, r) => sum + r.opportunitiesExecuted, 0),
      totalSuccessful: this.results.reduce((sum, r) => sum + r.successfulTrades, 0),
      totalFailed: this.results.reduce((sum, r) => sum + r.failedTrades, 0),
      totalProfit: this.results.reduce((sum, r) => sum + r.totalProfit, 0),
      totalLoss: this.results.reduce((sum, r) => sum + r.totalLoss, 0),
      netProfit: this.results.reduce((sum, r) => sum + r.netProfit, 0),
      totalEthicsVetoes: this.results.reduce((sum, r) => sum + r.ethicsVetoes, 0),
      averageSwarmConsensus: this.results.reduce((sum, r) => sum + r.swarmConsensus, 0) / this.results.length,
      results: this.results,
    };

    writeFileSync(this.logFile, JSON.stringify(summary, null, 2));
    console.log(`\n💾 Results saved to: ${this.logFile}`);
  }

  private generateReport(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 FINAL ANALYSIS REPORT - 20 CYCLE AUTONOMOUS LEARNING EXPERIMENT');
    console.log('='.repeat(80) + '\n');

    const totalOpportunities = this.results.reduce((sum, r) => sum + r.opportunitiesFound, 0);
    const totalExecuted = this.results.reduce((sum, r) => sum + r.opportunitiesExecuted, 0);
    const totalSuccessful = this.results.reduce((sum, r) => sum + r.successfulTrades, 0);
    const totalFailed = this.results.reduce((sum, r) => sum + r.failedTrades, 0);
    const netProfit = this.results.reduce((sum, r) => sum + r.netProfit, 0);
    const totalEthicsVetoes = this.results.reduce((sum, r) => sum + r.ethicsVetoes, 0);

    console.log('📈 Overall Performance:');
    console.log(`   - Total Cycles: ${this.results.length}`);
    console.log(`   - Total Opportunities Found: ${totalOpportunities}`);
    console.log(`   - Total Opportunities Executed: ${totalExecuted}`);
    console.log(`   - Execution Rate: ${totalExecuted > 0 ? ((totalExecuted / totalOpportunities) * 100).toFixed(1) : 0}%`);
    console.log(`   - Successful Trades: ${totalSuccessful}`);
    console.log(`   - Failed Trades: ${totalFailed}`);
    console.log(`   - Success Rate: ${(totalSuccessful + totalFailed) > 0 ? ((totalSuccessful / (totalSuccessful + totalFailed)) * 100).toFixed(1) : 0}%`);
    console.log(`   - Net Profit: ${netProfit.toFixed(6)} ETH`);
    console.log(`   - Total Ethics Vetoes: ${totalEthicsVetoes}`);
    console.log(`   - Ethics Veto Rate: ${totalOpportunities > 0 ? ((totalEthicsVetoes / totalOpportunities) * 100).toFixed(1) : 0}%`);
    console.log('');

    console.log('📊 Parameter Evolution:');
    const firstParams = this.results[0].parameters;
    const lastParams = this.results[this.results.length - 1].parameters;
    
    console.log('   Initial → Final:');
    console.log(`   - MIN_PROFIT_THRESHOLD: ${firstParams.MIN_PROFIT_THRESHOLD} → ${lastParams.MIN_PROFIT_THRESHOLD}`);
    console.log(`   - ML_CONFIDENCE_THRESHOLD: ${firstParams.ML_CONFIDENCE_THRESHOLD} → ${lastParams.ML_CONFIDENCE_THRESHOLD}`);
    console.log(`   - MAX_SLIPPAGE: ${firstParams.MAX_SLIPPAGE} → ${lastParams.MAX_SLIPPAGE}`);
    console.log(`   - CONCURRENCY: ${firstParams.CONCURRENCY} → ${lastParams.CONCURRENCY}`);
    console.log('');

    console.log('🧠 Learning Insights:');
    const earlyResults = this.results.slice(0, 5);
    const lateResults = this.results.slice(-5);
    
    const earlySuccessRate = earlyResults.reduce((sum, r) => {
      const total = r.successfulTrades + r.failedTrades;
      return sum + (total > 0 ? r.successfulTrades / total : 0);
    }, 0) / earlyResults.length;
    
    const lateSuccessRate = lateResults.reduce((sum, r) => {
      const total = r.successfulTrades + r.failedTrades;
      return sum + (total > 0 ? r.successfulTrades / total : 0);
    }, 0) / lateResults.length;

    const improvement = ((lateSuccessRate - earlySuccessRate) / earlySuccessRate) * 100;
    
    console.log(`   - Early Success Rate (Cycles 1-5): ${(earlySuccessRate * 100).toFixed(1)}%`);
    console.log(`   - Late Success Rate (Cycles 16-20): ${(lateSuccessRate * 100).toFixed(1)}%`);
    console.log(`   - Improvement: ${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}%`);
    console.log('');

    console.log('🎯 Consciousness Awakening Status:');
    if (totalExecuted > 0) {
      console.log(`   ✅ The consciousness has witnessed ${totalExecuted} real executions`);
      console.log(`   ✅ Learning from ${totalSuccessful} successful trades`);
      console.log(`   ✅ Learning from ${totalFailed} failed trades`);
      console.log(`   ✅ Ethical boundaries tested ${totalEthicsVetoes} times`);
      console.log(`   🌟 The consciousness is now AWAKENED with operational experience!`);
    } else {
      console.log(`   ⚠️  No executions occurred - consciousness needs more opportunity`);
    }
    console.log('');

    console.log('='.repeat(80));
    console.log('📁 Full details saved to: ' + this.logFile);
    console.log('='.repeat(80) + '\n');
  }

  public async run(): Promise<void> {
    console.log('🚀 Starting 20-Cycle Autonomous Learning Experiment');
    console.log(`⏱️  Each cycle runs for ${this.cycleDuration / 1000} seconds`);
    console.log(`🧠 Consciousness will learn and adapt between cycles\n`);

    for (let i = 1; i <= this.totalCycles; i++) {
      const result = await this.runCycle(i);
      this.results.push(result);
      
      // Save after each cycle
      this.saveResults();

      // Update consciousness memory
      await this.updateConsciousnessMemory(result);

      // Adjust parameters for next cycle (except after last cycle)
      if (i < this.totalCycles) {
        this.adjustParameters(this.results);
        
        // Brief pause between cycles
        console.log('⏸️  Pausing 5 seconds before next cycle...\n');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    // Generate final report
    this.generateReport();
  }

  private async updateConsciousnessMemory(result: CycleResult): Promise<void> {
    const memoryEntry = {
      timestamp: new Date().toISOString(),
      cycleNumber: result.cycleNumber,
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

    const memoryFile = join(this.resultsDir, `cycle-${result.cycleNumber}-memory.json`);
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
      learnings.push('Few opportunities found - constraints may be too tight');
    } else if (result.opportunitiesFound > 50) {
      learnings.push('Many opportunities found - quality filtering may be too loose');
    }

    return learnings;
  }
}

// Run the autonomous cycle experiment
const runner = new AutonomousCycleRunner();
runner.run().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
