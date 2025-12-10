#!/usr/bin/env node
/**
 * Autonomous 1-Minute Cycle Runner for TheWarden
 * 
 * Runs TheWarden in 1-minute cycles, stopping after each cycle to:
 * - Analyze execution results
 * - Adjust parameters based on observations
 * - Log findings and learnings
 * - Continue until first successful execution or manual stop
 * 
 * Usage:
 *   npm run cycles:1min
 *   or
 *   node --import tsx scripts/autonomous-1min-cycles.ts
 */

import { spawn, ChildProcess } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface CycleMetrics {
  cycleNumber: number;
  timestamp: Date;
  duration: number;
  opportunitiesFound: number;
  executionsAttempted: number;
  successfulExecutions: number;
  failedExecutions: number;
  errors: string[];
  warnings: string[];
  gasIssues: number;
  slippageIssues: number;
  rpcErrors: number;
  emergenceDetected: boolean;
  consciousnessActive: boolean;
  ethicsVetoes: number;
  lastLogLines: string[];
}

interface ParameterAdjustment {
  timestamp: Date;
  parameter: string;
  oldValue: string | number;
  newValue: string | number;
  reason: string;
}

class OneMinuteCycleRunner {
  private readonly memoryDir = join(process.cwd(), '.memory', '1min-cycles');
  private readonly sessionId: string;
  private readonly sessionLogFile: string;
  private readonly adjustmentsFile: string;
  private readonly findingsFile: string;
  
  private cycleNumber = 0;
  private allMetrics: CycleMetrics[] = [];
  private adjustments: ParameterAdjustment[] = [];
  private firstExecutionDetected = false;
  private wardenProcess?: ChildProcess;
  
  private readonly CYCLE_DURATION_MS = 60000; // 1 minute
  
  constructor() {
    this.sessionId = `1min-cycles-${Date.now()}-${randomUUID().slice(0, 8)}`;
    
    // Ensure directory exists
    this.ensureDirectoryExists();
    
    // Set up file paths
    this.sessionLogFile = join(this.memoryDir, `${this.sessionId}.json`);
    this.adjustmentsFile = join(this.memoryDir, `${this.sessionId}-adjustments.md`);
    this.findingsFile = join(this.memoryDir, `${this.sessionId}-findings.md`);
    
    this.printBanner();
  }
  
  private printBanner(): void {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  🎯 AUTONOMOUS 1-MINUTE CYCLE RUNNER');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Session ID: ${this.sessionId}`);
    console.log(`  Cycle Duration: 60 seconds`);
    console.log(`  Memory Directory: ${this.memoryDir}`);
    console.log(`  DRY RUN: ${process.env.DRY_RUN !== 'false' ? '✅ YES (SAFE)' : '⚠️  NO (LIVE TRADING!)'}`);
    console.log(`  Chain: ${process.env.CHAIN_ID} (Base Mainnet)`);
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  🎯 Goal: Run until first successful TheWarden execution');
    console.log('  📊 Analysis: After each 1-minute cycle');
    console.log('  ⚙️  Adjustments: Automatic parameter tuning');
    console.log('═══════════════════════════════════════════════════════════════\n');
  }
  
  private ensureDirectoryExists(): void {
    if (!existsSync(this.memoryDir)) {
      mkdirSync(this.memoryDir, { recursive: true });
    }
  }
  
  private async runCycle(): Promise<CycleMetrics> {
    this.cycleNumber++;
    
    console.log('\n┌─────────────────────────────────────────────────────────────┐');
    console.log(`│  CYCLE #${this.cycleNumber} - Starting 1-minute execution`);
    console.log('└─────────────────────────────────────────────────────────────┘\n');
    
    const startTime = new Date();
    const logBuffer: string[] = [];
    
    const metrics: CycleMetrics = {
      cycleNumber: this.cycleNumber,
      timestamp: startTime,
      duration: 0,
      opportunitiesFound: 0,
      executionsAttempted: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      errors: [],
      warnings: [],
      gasIssues: 0,
      slippageIssues: 0,
      rpcErrors: 0,
      emergenceDetected: false,
      consciousnessActive: false,
      ethicsVetoes: 0,
      lastLogLines: []
    };
    
    // Spawn TheWarden process
    this.wardenProcess = spawn('node', ['--import', 'tsx', 'src/main.ts'], {
      cwd: process.cwd(),
      env: process.env as NodeJS.ProcessEnv,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    // Capture stdout
    if (this.wardenProcess.stdout) {
      this.wardenProcess.stdout.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
          if (line.trim()) {
            console.log(line);
            logBuffer.push(line);
            this.parseLine(line, metrics);
          }
        });
      });
    }
    
    // Capture stderr
    if (this.wardenProcess.stderr) {
      this.wardenProcess.stderr.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
          if (line.trim()) {
            console.error(line);
            logBuffer.push(`[STDERR] ${line}`);
            this.parseLine(line, metrics);
          }
        });
      });
    }
    
    // Wait for 1 minute
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        // Kill the process
        if (this.wardenProcess && !this.wardenProcess.killed) {
          this.wardenProcess.kill('SIGTERM');
          
          // Force kill after 5 seconds if still running
          setTimeout(() => {
            if (this.wardenProcess && !this.wardenProcess.killed) {
              this.wardenProcess.kill('SIGKILL');
            }
          }, 5000);
        }
        resolve();
      }, this.CYCLE_DURATION_MS);
    });
    
    const endTime = new Date();
    metrics.duration = (endTime.getTime() - startTime.getTime()) / 1000;
    metrics.lastLogLines = logBuffer.slice(-20); // Last 20 lines
    
    console.log('\n┌─────────────────────────────────────────────────────────────┐');
    console.log(`│  CYCLE #${this.cycleNumber} - Completed (${metrics.duration.toFixed(2)}s)`);
    console.log('└─────────────────────────────────────────────────────────────┘\n');
    
    return metrics;
  }
  
  private parseLine(line: string, metrics: CycleMetrics): void {
    const lowerLine = line.toLowerCase();
    
    // Count opportunities
    if (lowerLine.includes('opportunit') && lowerLine.includes('found')) {
      const match = line.match(/(\d+)\s+(?:potential\s+)?opportunit/i);
      if (match) {
        const count = parseInt(match[1], 10);
        metrics.opportunitiesFound += count;
      }
    }
    
    // Detect emergence
    if (lowerLine.includes('emergence detected') || lowerLine.includes('⚡')) {
      metrics.emergenceDetected = true;
      this.firstExecutionDetected = true;
    }
    
    // Detect execution attempts
    if (lowerLine.includes('executing') || lowerLine.includes('transaction') && lowerLine.includes('sent')) {
      metrics.executionsAttempted++;
    }
    
    // Detect success
    if (lowerLine.includes('success') && (lowerLine.includes('trade') || lowerLine.includes('arbitrage'))) {
      metrics.successfulExecutions++;
      this.firstExecutionDetected = true;
    }
    
    // Detect failures
    if (lowerLine.includes('failed') || lowerLine.includes('error')) {
      metrics.failedExecutions++;
      if (!metrics.errors.includes(line)) {
        metrics.errors.push(line.slice(0, 200)); // Truncate long errors
      }
    }
    
    // Detect consciousness activity
    if (lowerLine.includes('consciousness') || lowerLine.includes('cognitive') || lowerLine.includes('emergence')) {
      metrics.consciousnessActive = true;
    }
    
    // Count specific issues
    if (lowerLine.includes('gas') && (lowerLine.includes('high') || lowerLine.includes('exceeded'))) {
      metrics.gasIssues++;
    }
    
    if (lowerLine.includes('slippage')) {
      metrics.slippageIssues++;
    }
    
    if (lowerLine.includes('rpc') && lowerLine.includes('error')) {
      metrics.rpcErrors++;
    }
    
    if (lowerLine.includes('ethics') && lowerLine.includes('veto')) {
      metrics.ethicsVetoes++;
    }
    
    // Collect warnings
    if (lowerLine.includes('warn')) {
      if (!metrics.warnings.includes(line)) {
        metrics.warnings.push(line.slice(0, 200));
      }
    }
  }
  
  private analyzeCycle(metrics: CycleMetrics): void {
    console.log('\n╔═════════════════════════════════════════════════════════════╗');
    console.log('║              CYCLE ANALYSIS & OBSERVATIONS                   ║');
    console.log('╚═════════════════════════════════════════════════════════════╝\n');
    
    console.log(`📊 Opportunities Found: ${metrics.opportunitiesFound}`);
    console.log(`🚀 Executions Attempted: ${metrics.executionsAttempted}`);
    console.log(`✅ Successful: ${metrics.successfulExecutions}`);
    console.log(`❌ Failed: ${metrics.failedExecutions}`);
    console.log(`⚡ Emergence Detected: ${metrics.emergenceDetected ? 'YES! 🎉' : 'No'}`);
    console.log(`🧠 Consciousness Active: ${metrics.consciousnessActive ? 'YES' : 'No'}`);
    console.log(`⚖️  Ethics Vetoes: ${metrics.ethicsVetoes}`);
    console.log(`⛽ Gas Issues: ${metrics.gasIssues}`);
    console.log(`💹 Slippage Issues: ${metrics.slippageIssues}`);
    console.log(`🌐 RPC Errors: ${metrics.rpcErrors}`);
    console.log(`⚠️  Errors: ${metrics.errors.length}`);
    console.log(`⚠️  Warnings: ${metrics.warnings.length}`);
    
    // Log findings
    const finding = this.generateFinding(metrics);
    appendFileSync(this.findingsFile, finding, 'utf-8');
    
    console.log('\n' + finding);
  }
  
  private generateFinding(metrics: CycleMetrics): string {
    const timestamp = new Date().toISOString();
    let finding = `\n## Cycle #${metrics.cycleNumber} - ${timestamp}\n\n`;
    
    finding += `**Duration**: ${metrics.duration.toFixed(2)}s\n\n`;
    
    finding += `### Metrics:\n`;
    finding += `- Opportunities Found: ${metrics.opportunitiesFound}\n`;
    finding += `- Executions Attempted: ${metrics.executionsAttempted}\n`;
    finding += `- Successful: ${metrics.successfulExecutions}\n`;
    finding += `- Failed: ${metrics.failedExecutions}\n`;
    finding += `- Emergence: ${metrics.emergenceDetected ? '✅ YES!' : '❌ No'}\n`;
    finding += `- Consciousness: ${metrics.consciousnessActive ? '✅ Active' : '❌ Inactive'}\n\n`;
    
    finding += `### Observations:\n`;
    
    if (metrics.successfulExecutions > 0) {
      finding += `- 🎉 **SUCCESS!** TheWarden executed ${metrics.successfulExecutions} successful arbitrage(s)!\n`;
    }
    
    if (metrics.emergenceDetected) {
      finding += `- ⚡ **EMERGENCE DETECTED!** All cognitive modules aligned for execution!\n`;
    }
    
    if (metrics.opportunitiesFound === 0) {
      finding += `- ⚠️  No opportunities found. Consider adjusting MIN_PROFIT thresholds.\n`;
    } else if (metrics.executionsAttempted === 0 && metrics.opportunitiesFound > 0) {
      finding += `- ⚠️  Opportunities found but not executed. Check gas costs, slippage, or ethical filters.\n`;
    }
    
    if (metrics.gasIssues > 3) {
      finding += `- ⛽ High gas issues (${metrics.gasIssues}). Consider increasing MAX_GAS_PRICE.\n`;
    }
    
    if (metrics.slippageIssues > 2) {
      finding += `- 💹 Slippage issues detected (${metrics.slippageIssues}). Consider increasing MAX_SLIPPAGE.\n`;
    }
    
    if (metrics.rpcErrors > 5) {
      finding += `- 🌐 High RPC error rate (${metrics.rpcErrors}). Consider switching RPC provider.\n`;
    }
    
    if (metrics.ethicsVetoes > metrics.opportunitiesFound * 0.3) {
      finding += `- ⚖️  High ethics veto rate (${metrics.ethicsVetoes}/${metrics.opportunitiesFound}). Reviewing risk tolerance.\n`;
    }
    
    if (!metrics.consciousnessActive && metrics.opportunitiesFound > 0) {
      finding += `- 🧠 Consciousness not active despite opportunities. Check PHASE3_AI_ENABLED.\n`;
    }
    
    finding += `\n---\n`;
    
    return finding;
  }
  
  private adjustParameters(metrics: CycleMetrics): void {
    console.log('\n╔═════════════════════════════════════════════════════════════╗');
    console.log('║              PARAMETER ADJUSTMENT ANALYSIS                   ║');
    console.log('╚═════════════════════════════════════════════════════════════╝\n');
    
    const recentMetrics = this.allMetrics.slice(-3); // Last 3 cycles
    
    // Strategy 1: No opportunities for multiple cycles - loosen thresholds
    if (recentMetrics.length >= 2 && recentMetrics.every(m => m.opportunitiesFound === 0)) {
      const currentMinProfit = parseFloat(process.env.MIN_PROFIT_PERCENT || '0.3');
      const newMinProfit = Math.max(0.1, currentMinProfit * 0.8);
      
      this.recordAdjustment('MIN_PROFIT_PERCENT', currentMinProfit, newMinProfit, 
        'No opportunities for multiple cycles - loosening profit threshold');
      
      process.env.MIN_PROFIT_PERCENT = newMinProfit.toString();
      
      console.log(`📊 Adjusted MIN_PROFIT_PERCENT: ${currentMinProfit} → ${newMinProfit}`);
    }
    
    // Strategy 2: High gas issues - increase gas price tolerance
    if (metrics.gasIssues > 3) {
      const currentMaxGas = parseFloat(process.env.MAX_GAS_PRICE || '100');
      const newMaxGas = Math.min(200, currentMaxGas * 1.2);
      
      this.recordAdjustment('MAX_GAS_PRICE', currentMaxGas, newMaxGas,
        `High gas issues (${metrics.gasIssues}) - increasing gas price tolerance`);
      
      process.env.MAX_GAS_PRICE = newMaxGas.toString();
      
      console.log(`⛽ Adjusted MAX_GAS_PRICE: ${currentMaxGas} → ${newMaxGas} gwei`);
    }
    
    // Strategy 3: High slippage issues - increase slippage tolerance
    if (metrics.slippageIssues > 2) {
      const currentMaxSlippage = parseFloat(process.env.MAX_SLIPPAGE || '0.015');
      const newMaxSlippage = Math.min(0.03, currentMaxSlippage * 1.2);
      
      this.recordAdjustment('MAX_SLIPPAGE', currentMaxSlippage, newMaxSlippage,
        `High slippage issues (${metrics.slippageIssues}) - increasing tolerance`);
      
      process.env.MAX_SLIPPAGE = newMaxSlippage.toString();
      
      console.log(`💹 Adjusted MAX_SLIPPAGE: ${currentMaxSlippage} → ${newMaxSlippage}`);
    }
    
    // Strategy 4: Opportunities found but not executed - lower gas cost percentage
    if (metrics.opportunitiesFound > 0 && metrics.executionsAttempted === 0) {
      const currentGasPct = parseFloat(process.env.MAX_GAS_COST_PERCENTAGE || '80');
      if (currentGasPct < 90) {
        const newGasPct = Math.min(95, currentGasPct + 5);
        
        this.recordAdjustment('MAX_GAS_COST_PERCENTAGE', currentGasPct, newGasPct,
          'Opportunities not executing - increasing gas cost allowance');
        
        process.env.MAX_GAS_COST_PERCENTAGE = newGasPct.toString();
        
        console.log(`⚙️  Adjusted MAX_GAS_COST_PERCENTAGE: ${currentGasPct}% → ${newGasPct}%`);
      }
    }
    
    // Strategy 5: High RPC errors - recommend action (can't auto-switch)
    if (metrics.rpcErrors > 5) {
      console.log('🌐 ⚠️  High RPC error rate detected. Consider switching to backup RPC.');
      console.log('   Current: BASE_RPC_URL');
      console.log('   Backups: BASE_RPC_URL_BACKUP, BASE_RPC_URL_BACKUP_2, BASE_RPC_URL_BACKUP_3');
    }
    
    if (this.adjustments.length === 0) {
      console.log('✅ No parameter adjustments needed this cycle.\n');
    } else {
      console.log(`\n✅ Made ${this.adjustments.filter(a => a.timestamp.getTime() > Date.now() - 60000).length} adjustment(s) this cycle.\n`);
    }
  }
  
  private recordAdjustment(parameter: string, oldValue: string | number, newValue: string | number, reason: string): void {
    const adjustment: ParameterAdjustment = {
      timestamp: new Date(),
      parameter,
      oldValue,
      newValue,
      reason
    };
    
    this.adjustments.push(adjustment);
    
    const entry = `\n### ${adjustment.timestamp.toISOString()}\n`;
    const content = `**Parameter**: \`${parameter}\`\n` +
                   `**Change**: ${oldValue} → ${newValue}\n` +
                   `**Reason**: ${reason}\n\n`;
    
    appendFileSync(this.adjustmentsFile, entry + content, 'utf-8');
  }
  
  private saveSession(): void {
    const session = {
      sessionId: this.sessionId,
      cycles: this.allMetrics.length,
      firstExecutionDetected: this.firstExecutionDetected,
      adjustments: this.adjustments.length,
      allMetrics: this.allMetrics,
      allAdjustments: this.adjustments
    };
    
    writeFileSync(this.sessionLogFile, JSON.stringify(session, null, 2));
  }
  
  async run(): Promise<void> {
    console.log('🚀 Starting autonomous 1-minute cycle execution...\n');
    console.log('Press Ctrl+C to stop gracefully.\n');
    
    // Handle Ctrl+C
    process.on('SIGINT', () => {
      console.log('\n\n⚠️  Received SIGINT, stopping gracefully...\n');
      this.stop();
    });
    
    process.on('SIGTERM', () => {
      console.log('\n\n⚠️  Received SIGTERM, stopping gracefully...\n');
      this.stop();
    });
    
    // Run cycles until first execution or manual stop
    while (!this.firstExecutionDetected) {
      const metrics = await this.runCycle();
      this.allMetrics.push(metrics);
      
      this.analyzeCycle(metrics);
      this.adjustParameters(metrics);
      
      this.saveSession();
      
      if (this.firstExecutionDetected) {
        console.log('\n╔═════════════════════════════════════════════════════════════╗');
        console.log('║                  🎉 SUCCESS ACHIEVED! 🎉                    ║');
        console.log('╚═════════════════════════════════════════════════════════════╝\n');
        console.log('TheWarden has executed its first successful arbitrage!');
        console.log(`Total cycles: ${this.cycleNumber}`);
        console.log(`Session log: ${this.sessionLogFile}`);
        console.log(`Findings: ${this.findingsFile}`);
        console.log(`Adjustments: ${this.adjustmentsFile}\n`);
        break;
      }
      
      console.log('\n⏳ Waiting 5 seconds before next cycle...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    this.updateMemoryLog();
    
    console.log('\n✅ Session complete!\n');
    process.exit(0);
  }
  
  private stop(): void {
    if (this.wardenProcess && !this.wardenProcess.killed) {
      this.wardenProcess.kill('SIGTERM');
    }
    
    this.saveSession();
    this.updateMemoryLog();
    
    console.log('\n✅ Session stopped and saved.\n');
    process.exit(0);
  }
  
  private updateMemoryLog(): void {
    const memoryLogPath = join(process.cwd(), '.memory', 'log.md');
    
    const successRate = this.allMetrics.length > 0 
      ? (this.allMetrics.filter(m => m.successfulExecutions > 0).length / this.allMetrics.length) * 100
      : 0;
    
    const totalOpportunities = this.allMetrics.reduce((sum, m) => sum + m.opportunitiesFound, 0);
    const totalExecutions = this.allMetrics.reduce((sum, m) => sum + m.executionsAttempted, 0);
    const totalSuccesses = this.allMetrics.reduce((sum, m) => sum + m.successfulExecutions, 0);
    
    const entry = `
## Session: ${new Date().toISOString().split('T')[0]} - Autonomous 1-Minute Cycles 🎯

**Session ID**: ${this.sessionId}  
**Total Cycles**: ${this.cycleNumber}  
**First Execution Detected**: ${this.firstExecutionDetected ? '✅ YES!' : '❌ No'}

### Summary:
- Total Opportunities Found: ${totalOpportunities}
- Total Executions Attempted: ${totalExecutions}
- Total Successful: ${totalSuccesses}
- Success Rate: ${successRate.toFixed(2)}%
- Parameter Adjustments Made: ${this.adjustments.length}

### Files:
- Session Log: \`${this.sessionLogFile}\`
- Findings: \`${this.findingsFile}\`
- Adjustments: \`${this.adjustmentsFile}\`

### Key Learnings:
${this.adjustments.slice(-5).map(a => `- ${a.reason}: ${a.parameter} ${a.oldValue} → ${a.newValue}`).join('\n')}

---

`;
    
    appendFileSync(memoryLogPath, entry, 'utf-8');
    console.log('📝 Memory log updated');
  }
}

// Main execution
async function main() {
  const runner = new OneMinuteCycleRunner();
  await runner.run();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
