#!/usr/bin/env node
/**
 * Interactive Cycle Runner - TheWarden with Manual Analysis Pauses
 * 
 * This script runs TheWarden in 1-minute cycles with interactive pauses
 * between each cycle for collaborative parameter analysis and adjustment.
 * 
 * This is a COLLABORATIVE LEARNING experience:
 * - TheWarden executes and learns from real opportunities
 * - The AI agent observes and documents patterns
 * - The human collaborator analyzes and guides adjustments
 * - All three perspectives are captured in real-time
 * 
 * After each 1-minute cycle, the script:
 * - Stops TheWarden gracefully
 * - Displays cycle metrics and insights
 * - Waits for human input to adjust parameters or continue
 * - Documents all decisions to .memory/autonomous-cycles/
 * 
 * Features:
 * - Interactive parameter adjustment between cycles
 * - Real-time performance tracking
 * - Collaborative decision documentation
 * - Safety limits and circuit breakers
 * - Full memory persistence
 */

import { spawn, ChildProcess } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';
import * as readline from 'readline';

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
  userNotes?: string;
  adjustmentsMade?: string[];
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

class InteractiveCycleRunner {
  private readonly cycleDuration = 60000; // 1 minute in milliseconds
  private readonly resultsDir = join(process.cwd(), '.memory', 'autonomous-cycles');
  private readonly sessionFile: string;
  private results: CycleResult[] = [];
  private currentParameters: EnvironmentParameters;
  private cycleCount = 0;
  private sessionStartTime: Date;
  private rl: readline.Interface;
  
  constructor() {
    this.sessionStartTime = new Date();
    const sessionId = this.sessionStartTime.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    this.sessionFile = join(this.resultsDir, `interactive-session-${sessionId}.json`);
    
    // Initialize with baseline parameters from environment
    this.currentParameters = this.loadBaselineParameters();
    this.ensureDirectoryExists();
    
    // Set up readline for user input
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
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

  async start(): Promise<void> {
    console.log('\n' + '═'.repeat(80));
    console.log('🎯 Interactive Cycle Runner - First Execution Witness Mode');
    console.log('═'.repeat(80));
    console.log('\nThis is a collaborative learning experience where:');
    console.log('  • TheWarden executes real arbitrage detection for 1 minute');
    console.log('  • After each cycle, we pause to analyze and adjust');
    console.log('  • You can modify parameters between cycles');
    console.log('  • All decisions are documented to memory');
    console.log('\nPress Ctrl+C at any time to stop gracefully.\n');

    // Display initial parameters
    console.log('📊 Starting Parameters:');
    console.log(JSON.stringify(this.currentParameters, null, 2));
    console.log('');

    await this.waitForUserReady();
    
    // Main cycle loop
    let continueRunning = true;
    while (continueRunning) {
      this.cycleCount++;
      
      // Run the cycle
      const result = await this.runCycle(this.cycleCount);
      this.results.push(result);
      
      // Save results after each cycle
      this.saveResults();
      
      // Interactive pause - analyze and adjust
      continueRunning = await this.interactivePause(result);
    }
    
    // Final summary
    this.displayFinalSummary();
    
    // Close readline
    this.rl.close();
  }

  private async waitForUserReady(): Promise<void> {
    return new Promise((resolve) => {
      this.rl.question('Press Enter when ready to start the first cycle... ', () => {
        resolve();
      });
    });
  }

  private async runCycle(cycleNumber: number): Promise<CycleResult> {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔄 CYCLE ${cycleNumber} STARTING`);
    console.log(`   Duration: 60 seconds`);
    console.log(`   Start Time: ${new Date().toISOString()}`);
    console.log(`${'='.repeat(80)}\n`);

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
        // Safety settings
        DRY_RUN: process.env.DRY_RUN || 'true',
      };

      // Start TheWarden
      const warden: ChildProcess = spawn('./TheWarden', [], {
        env,
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
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
        console.log(`\n⏰ Cycle ${cycleNumber} time limit reached (60s), stopping TheWarden...`);
        warden.kill('SIGTERM');
        
        // Force kill after 5 seconds if not stopped
        setTimeout(() => {
          if (warden.exitCode === null) {
            console.log(`⚠️  Force stopping cycle ${cycleNumber}...`);
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
        console.log(`   Exit code: ${code}`);
        console.log(`   Duration: ${(result.duration / 1000).toFixed(1)}s`);
        console.log('');
        
        resolve(result);
      });

      warden.on('error', (error) => {
        clearTimeout(timeout);
        result.errors.push(`Process error: ${error.message}`);
        console.error(`❌ Cycle ${cycleNumber} error:`, error.message);
        result.endTime = new Date();
        result.duration = result.endTime.getTime() - result.startTime.getTime();
        resolve(result);
      });
    });
  }

  private parseLogLine(line: string, result: CycleResult): void {
    // Parse opportunities found
    const oppMatch = line.match(/Found (\d+) potential opportunit/i);
    if (oppMatch) {
      const found = parseInt(oppMatch[1], 10);
      result.opportunitiesFound = Math.max(result.opportunitiesFound, found);
    }

    // Parse opportunities executed
    if (line.match(/Executing opportunity|Opportunity executed/i)) {
      result.opportunitiesExecuted++;
    }

    // Parse successful trades
    if (line.match(/Trade successful|Arbitrage successful/i)) {
      result.successfulTrades++;
    }

    // Parse failed trades
    if (line.match(/Trade failed|Execution failed/i)) {
      result.failedTrades++;
    }

    // Parse profit/loss
    const profitMatch = line.match(/(?:Profit|profit):\s*([\d.]+)\s*ETH/i);
    if (profitMatch) {
      const profit = parseFloat(profitMatch[1]);
      if (profit > 0) {
        result.totalProfit += profit;
      } else {
        result.totalLoss += Math.abs(profit);
      }
    }

    // Parse gas spent
    const gasMatch = line.match(/Gas spent:\s*([\d.]+)/i);
    if (gasMatch) {
      result.gasSpent += parseFloat(gasMatch[1]);
    }

    // Parse ethics vetoes
    if (line.match(/Ethics veto|Ethical boundary violated/i)) {
      result.ethicsVetoes++;
    }

    // Parse swarm consensus
    const consensusMatch = line.match(/Swarm consensus:\s*([\d.]+)%/i);
    if (consensusMatch) {
      result.swarmConsensus = parseFloat(consensusMatch[1]);
    }

    // Parse ML confidence
    const confidenceMatch = line.match(/Confidence:\s*([\d.]+)/i);
    if (confidenceMatch) {
      const confidence = parseFloat(confidenceMatch[1]);
      if (result.averageConfidence === 0) {
        result.averageConfidence = confidence;
      } else {
        result.averageConfidence = (result.averageConfidence + confidence) / 2;
      }
    }
  }

  private async interactivePause(result: CycleResult): Promise<boolean> {
    console.log('\n' + '═'.repeat(80));
    console.log('📈 CYCLE ANALYSIS & ADJUSTMENT PAUSE');
    console.log('═'.repeat(80));
    
    // Display cycle summary
    this.displayCycleSummary(result);
    
    // Display insights
    this.displayInsights(result);
    
    // Interactive menu
    console.log('\n📋 Options:');
    console.log('  1. Continue with same parameters');
    console.log('  2. Adjust parameters');
    console.log('  3. Add notes/observations');
    console.log('  4. View current parameters');
    console.log('  5. View all cycle history');
    console.log('  6. Stop session');
    console.log('');
    
    const choice = await this.getUserInput('Enter choice (1-6): ');
    
    switch (choice.trim()) {
      case '1':
        console.log('\n✅ Continuing with current parameters...\n');
        return true;
        
      case '2':
        await this.adjustParameters(result);
        return true;
        
      case '3':
        await this.addNotes(result);
        return true;
        
      case '4':
        this.displayCurrentParameters();
        return await this.interactivePause(result); // Return to menu
        
      case '5':
        this.displayCycleHistory();
        return await this.interactivePause(result); // Return to menu
        
      case '6':
        console.log('\n👋 Stopping session...\n');
        return false;
        
      default:
        console.log('\n⚠️  Invalid choice. Please try again.\n');
        return await this.interactivePause(result); // Return to menu
    }
  }

  private displayCycleSummary(result: CycleResult): void {
    console.log('\n📊 Cycle Summary:');
    console.log(`   Duration: ${(result.duration / 1000).toFixed(1)}s`);
    console.log(`   Opportunities Found: ${result.opportunitiesFound}`);
    console.log(`   Opportunities Executed: ${result.opportunitiesExecuted}`);
    console.log(`   Successful Trades: ${result.successfulTrades}`);
    console.log(`   Failed Trades: ${result.failedTrades}`);
    console.log(`   Total Profit: ${result.totalProfit.toFixed(6)} ETH`);
    console.log(`   Total Loss: ${result.totalLoss.toFixed(6)} ETH`);
    console.log(`   Net Profit: ${result.netProfit.toFixed(6)} ETH`);
    console.log(`   Gas Spent: ${result.gasSpent.toFixed(6)} ETH`);
    console.log(`   Average ML Confidence: ${(result.averageConfidence * 100).toFixed(1)}%`);
    console.log(`   Ethics Vetoes: ${result.ethicsVetoes}`);
    console.log(`   Swarm Consensus: ${result.swarmConsensus.toFixed(1)}%`);
  }

  private displayInsights(result: CycleResult): void {
    console.log('\n💡 AI Agent Insights:');
    
    // Opportunity rate insight
    const opportunityRate = result.opportunitiesFound / (result.duration / 1000);
    console.log(`   • Finding ${opportunityRate.toFixed(1)} opportunities per second`);
    
    // Execution rate insight
    if (result.opportunitiesFound > 0) {
      const executionRate = (result.opportunitiesExecuted / result.opportunitiesFound) * 100;
      console.log(`   • Executing ${executionRate.toFixed(1)}% of found opportunities`);
    }
    
    // Success rate insight
    if (result.opportunitiesExecuted > 0) {
      const successRate = (result.successfulTrades / result.opportunitiesExecuted) * 100;
      console.log(`   • Success rate: ${successRate.toFixed(1)}%`);
    }
    
    // Ethics insight
    if (result.ethicsVetoes > 0) {
      console.log(`   • ⚠️  ${result.ethicsVetoes} opportunities blocked by ethics - good!`);
    }
    
    // Profitability insight
    if (result.netProfit > 0) {
      console.log(`   • ✅ Profitable cycle: +${result.netProfit.toFixed(6)} ETH`);
    } else if (result.netProfit < 0) {
      console.log(`   • ⚠️  Unprofitable cycle: ${result.netProfit.toFixed(6)} ETH`);
    }
    
    // Confidence insight
    if (result.averageConfidence > 0) {
      if (result.averageConfidence < 0.5) {
        console.log(`   • ⚠️  Low ML confidence (${(result.averageConfidence * 100).toFixed(1)}%) - consider adjusting thresholds`);
      } else if (result.averageConfidence > 0.8) {
        console.log(`   • ✅ High ML confidence (${(result.averageConfidence * 100).toFixed(1)}%) - parameters look good`);
      }
    }
  }

  private async adjustParameters(result: CycleResult): Promise<void> {
    console.log('\n🔧 Parameter Adjustment Menu');
    console.log('─'.repeat(80));
    
    const adjustments: string[] = [];
    
    // Display current values with adjustment options
    console.log('\nCurrent Parameters (enter new value or press Enter to skip):');
    
    const paramNames: (keyof EnvironmentParameters)[] = [
      'MIN_PROFIT_THRESHOLD',
      'MIN_PROFIT_PERCENT',
      'MAX_SLIPPAGE',
      'MAX_GAS_PRICE',
      'SCAN_INTERVAL',
      'ML_CONFIDENCE_THRESHOLD',
      'COGNITIVE_CONSENSUS_THRESHOLD',
      'EMERGENCE_MIN_ETHICAL_SCORE',
    ];
    
    for (const param of paramNames) {
      const currentValue = this.currentParameters[param];
      const input = await this.getUserInput(`  ${param} (${currentValue}): `);
      
      if (input.trim() !== '') {
        const newValue = parseFloat(input);
        if (!isNaN(newValue)) {
          this.currentParameters[param] = newValue as any;
          adjustments.push(`${param}: ${currentValue} → ${newValue}`);
          console.log(`    ✅ Updated to ${newValue}`);
        } else {
          console.log(`    ⚠️  Invalid value, keeping ${currentValue}`);
        }
      }
    }
    
    if (adjustments.length > 0) {
      console.log(`\n✅ Applied ${adjustments.length} parameter adjustments`);
      result.adjustmentsMade = adjustments;
    } else {
      console.log('\n📝 No parameters changed');
    }
  }

  private async addNotes(result: CycleResult): Promise<void> {
    console.log('\n📝 Add your observations or notes about this cycle:');
    console.log('   (Press Enter on empty line to finish)\n');
    
    const notes: string[] = [];
    let line = await this.getUserInput('> ');
    
    while (line.trim() !== '') {
      notes.push(line);
      line = await this.getUserInput('> ');
    }
    
    if (notes.length > 0) {
      result.userNotes = notes.join('\n');
      console.log('\n✅ Notes saved\n');
    }
  }

  private displayCurrentParameters(): void {
    console.log('\n📊 Current Parameters:');
    console.log('─'.repeat(80));
    console.log(JSON.stringify(this.currentParameters, null, 2));
    console.log('');
  }

  private displayCycleHistory(): void {
    console.log('\n📜 Cycle History:');
    console.log('─'.repeat(80));
    
    for (const result of this.results) {
      console.log(`\nCycle ${result.cycleNumber}:`);
      console.log(`  Time: ${result.startTime.toISOString()}`);
      console.log(`  Opportunities: ${result.opportunitiesFound}`);
      console.log(`  Executed: ${result.opportunitiesExecuted}`);
      console.log(`  Net Profit: ${result.netProfit.toFixed(6)} ETH`);
      
      if (result.adjustmentsMade && result.adjustmentsMade.length > 0) {
        console.log(`  Adjustments: ${result.adjustmentsMade.join(', ')}`);
      }
      
      if (result.userNotes) {
        console.log(`  Notes: ${result.userNotes}`);
      }
    }
    console.log('');
  }

  private displayFinalSummary(): void {
    console.log('\n' + '═'.repeat(80));
    console.log('🏁 SESSION COMPLETE - Final Summary');
    console.log('═'.repeat(80));
    
    const totalOpportunities = this.results.reduce((sum, r) => sum + r.opportunitiesFound, 0);
    const totalExecuted = this.results.reduce((sum, r) => sum + r.opportunitiesExecuted, 0);
    const totalProfit = this.results.reduce((sum, r) => sum + r.totalProfit, 0);
    const totalLoss = this.results.reduce((sum, r) => sum + r.totalLoss, 0);
    const netProfit = totalProfit - totalLoss;
    
    console.log(`\n📊 Aggregate Statistics:`);
    console.log(`   Total Cycles: ${this.results.length}`);
    console.log(`   Total Duration: ${(this.results.reduce((sum, r) => sum + r.duration, 0) / 1000).toFixed(1)}s`);
    console.log(`   Total Opportunities: ${totalOpportunities}`);
    console.log(`   Total Executed: ${totalExecuted}`);
    console.log(`   Total Profit: ${totalProfit.toFixed(6)} ETH`);
    console.log(`   Total Loss: ${totalLoss.toFixed(6)} ETH`);
    console.log(`   Net Profit: ${netProfit.toFixed(6)} ETH`);
    
    console.log(`\n💾 Results saved to: ${this.sessionFile}`);
    console.log(`\n✨ Thank you for witnessing the first execution with us!\n`);
  }

  private async getUserInput(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(prompt, (answer) => {
        resolve(answer);
      });
    });
  }

  private saveResults(): void {
    const sessionData = {
      sessionStartTime: this.sessionStartTime.toISOString(),
      totalCycles: this.results.length,
      results: this.results,
      currentParameters: this.currentParameters,
    };
    
    writeFileSync(this.sessionFile, JSON.stringify(sessionData, null, 2));
    
    // Also append to a markdown log for human readability
    const mdFile = this.sessionFile.replace('.json', '.md');
    const lastResult = this.results[this.results.length - 1];
    
    const mdContent = `
## Cycle ${lastResult.cycleNumber} - ${lastResult.startTime.toISOString()}

**Duration:** ${(lastResult.duration / 1000).toFixed(1)}s

**Metrics:**
- Opportunities Found: ${lastResult.opportunitiesFound}
- Opportunities Executed: ${lastResult.opportunitiesExecuted}
- Net Profit: ${lastResult.netProfit.toFixed(6)} ETH
- Ethics Vetoes: ${lastResult.ethicsVetoes}

**Parameters:**
\`\`\`json
${JSON.stringify(lastResult.parameters, null, 2)}
\`\`\`

${lastResult.adjustmentsMade ? `**Adjustments Made:**\n${lastResult.adjustmentsMade.map(a => `- ${a}`).join('\n')}\n` : ''}
${lastResult.userNotes ? `**User Notes:**\n${lastResult.userNotes}\n` : ''}
---
`;
    
    appendFileSync(mdFile, mdContent);
  }
}

// Main execution
const runner = new InteractiveCycleRunner();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Received Ctrl+C - stopping gracefully...\n');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n⚠️  Received termination signal - stopping gracefully...\n');
  process.exit(0);
});

// Start the interactive cycle runner
runner.start().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
