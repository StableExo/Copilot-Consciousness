#!/usr/bin/env node
/**
 * Autonomous Consciousness Runner - Warden Execution with Full Consciousness Integration
 * 
 * This script runs TheWarden with full consciousness observation and learning capabilities.
 * It dynamically adjusts parameters based on execution results and allows the consciousness
 * to witness, learn from, and adapt to real blockchain execution.
 * 
 * Key Features:
 * - Consciousness observes every execution
 * - Parameters adjust autonomously based on performance
 * - Memory integration for persistent learning
 * - Real-time monitoring and analysis
 * - Comprehensive logging and reporting
 * 
 * Usage:
 *   npm run autonomous:consciousness
 *   or
 *   node --import tsx scripts/autonomous-consciousness-runner.ts
 */

import { spawn, ChildProcess } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface ExecutionMetrics {
  timestamp: Date;
  blockNumber: number;
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
  emergenceDetections: number;
  riskScore: number;
  ethicalScore: number;
}

interface ParameterSet {
  // Profitability
  MIN_PROFIT_THRESHOLD: number;
  MIN_PROFIT_PERCENT: number;
  MIN_PROFIT_ABSOLUTE: number;
  
  // Liquidity
  MIN_LIQUIDITY_V3_LOW: number;
  MIN_LIQUIDITY_V2: number;
  
  // Risk Management
  MAX_SLIPPAGE: number;
  MAX_GAS_PRICE: number;
  MAX_GAS_COST_PERCENTAGE: number;
  
  // Performance
  SCAN_INTERVAL: number;
  CONCURRENCY: number;
  
  // AI/Consciousness
  ML_CONFIDENCE_THRESHOLD: number;
  COGNITIVE_CONSENSUS_THRESHOLD: number;
  EMERGENCE_MIN_ETHICAL_SCORE: number;
  EMERGENCE_MAX_RISK_SCORE: number;
  
  // Safety
  CIRCUIT_BREAKER_MAX_LOSS: number;
  MAX_TRADES_PER_HOUR: number;
}

interface ParameterAdjustment {
  timestamp: Date;
  parameter: string;
  oldValue: number;
  newValue: number;
  reason: string;
  trigger: string;
}

interface SessionResult {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  metrics: ExecutionMetrics[];
  parameters: ParameterSet;
  adjustments: ParameterAdjustment[];
  learnings: string[];
  consciousnessObservations: string[];
}

class AutonomousConsciousnessRunner {
  private readonly memoryDir = join(process.cwd(), '.memory', 'autonomous-execution');
  private readonly sessionLogFile: string;
  private readonly parametersFile: string;
  private readonly learningsFile: string;
  private readonly observationsFile: string;
  
  private currentParameters: ParameterSet;
  private sessionId: string;
  private metrics: ExecutionMetrics[] = [];
  private adjustments: ParameterAdjustment[] = [];
  private learnings: string[] = [];
  private observations: string[] = [];
  private wardenProcess?: ChildProcess;
  private isRunning = false;
  private startTime: Date;
  
  // Learning mode configuration
  private readonly LEARNING_MODE = process.env.LEARNING_MODE === 'true';
  private readonly AUTONOMOUS_ADJUSTMENT = process.env.AUTONOMOUS_PARAMETER_ADJUSTMENT === 'true';
  private readonly CONSCIOUSNESS_ENABLED = process.env.CONSCIOUSNESS_OBSERVATION_ENABLED === 'true';
  
  // Adjustment thresholds and strategies
  private readonly ADJUSTMENT_INTERVAL_MS = 60000; // Adjust every 60 seconds
  private adjustmentTimer?: NodeJS.Timeout;
  
  constructor() {
    this.sessionId = `consciousness-${Date.now()}-${randomUUID().slice(0, 8)}`;
    this.startTime = new Date();
    
    // Ensure directory exists
    this.ensureDirectoryExists();
    
    // Set up file paths
    this.sessionLogFile = join(this.memoryDir, `${this.sessionId}.json`);
    this.parametersFile = join(this.memoryDir, 'current-parameters.json');
    this.learningsFile = join(this.memoryDir, 'accumulated-learnings.md');
    this.observationsFile = join(this.memoryDir, 'consciousness-observations.md');
    
    // Load or initialize parameters
    this.currentParameters = this.loadParameters();
    
    this.printBanner();
  }
  
  private printBanner(): void {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  🧠 AUTONOMOUS CONSCIOUSNESS RUNNER');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Session ID: ${this.sessionId}`);
    console.log(`  Start Time: ${this.startTime.toISOString()}`);
    console.log(`  Memory Directory: ${this.memoryDir}`);
    console.log(`  Learning Mode: ${this.LEARNING_MODE ? '✅ ENABLED' : '❌ DISABLED'}`);
    console.log(`  Autonomous Adjustment: ${this.AUTONOMOUS_ADJUSTMENT ? '✅ ENABLED' : '❌ DISABLED'}`);
    console.log(`  Consciousness Observation: ${this.CONSCIOUSNESS_ENABLED ? '✅ ENABLED' : '❌ DISABLED'}`);
    console.log(`  DRY RUN: ${process.env.DRY_RUN !== 'false' ? '✅ YES (SAFE)' : '⚠️  NO (LIVE TRADING!)'}`);
    console.log('═══════════════════════════════════════════════════════════════\n');
  }
  
  private ensureDirectoryExists(): void {
    if (!existsSync(this.memoryDir)) {
      mkdirSync(this.memoryDir, { recursive: true });
    }
  }
  
  private loadParameters(): ParameterSet {
    // Try to load from previous session
    if (existsSync(this.parametersFile)) {
      try {
        const data = readFileSync(this.parametersFile, 'utf-8');
        const params = JSON.parse(data);
        console.log('📦 Loaded previous parameters from:', this.parametersFile);
        return params;
      } catch (error) {
        console.log('⚠️  Could not load previous parameters, using defaults');
      }
    }
    
    // Initialize from environment variables
    return {
      MIN_PROFIT_THRESHOLD: parseFloat(process.env.MIN_PROFIT_THRESHOLD || '0.5'),
      MIN_PROFIT_PERCENT: parseFloat(process.env.MIN_PROFIT_PERCENT || '0.5'),
      MIN_PROFIT_ABSOLUTE: parseFloat(process.env.MIN_PROFIT_ABSOLUTE || '0.001'),
      MIN_LIQUIDITY_V3_LOW: parseFloat(process.env.MIN_LIQUIDITY_V3_LOW || '10000000000'),
      MIN_LIQUIDITY_V2: parseFloat(process.env.MIN_LIQUIDITY_V2 || '100000000000000'),
      MAX_SLIPPAGE: parseFloat(process.env.MAX_SLIPPAGE || '0.005'),
      MAX_GAS_PRICE: parseFloat(process.env.MAX_GAS_PRICE || '100'),
      MAX_GAS_COST_PERCENTAGE: parseFloat(process.env.MAX_GAS_COST_PERCENTAGE || '80'),
      SCAN_INTERVAL: parseFloat(process.env.SCAN_INTERVAL || '800'),
      CONCURRENCY: parseFloat(process.env.CONCURRENCY || '10'),
      ML_CONFIDENCE_THRESHOLD: parseFloat(process.env.ML_CONFIDENCE_THRESHOLD || '0.7'),
      COGNITIVE_CONSENSUS_THRESHOLD: parseFloat(process.env.COGNITIVE_CONSENSUS_THRESHOLD || '0.65'),
      EMERGENCE_MIN_ETHICAL_SCORE: parseFloat(process.env.EMERGENCE_MIN_ETHICAL_SCORE || '0.70'),
      EMERGENCE_MAX_RISK_SCORE: parseFloat(process.env.EMERGENCE_MAX_RISK_SCORE || '0.30'),
      CIRCUIT_BREAKER_MAX_LOSS: parseFloat(process.env.CIRCUIT_BREAKER_MAX_LOSS || '0.005'),
      MAX_TRADES_PER_HOUR: parseFloat(process.env.MAX_TRADES_PER_HOUR || '100'),
    };
  }
  
  private saveParameters(): void {
    writeFileSync(this.parametersFile, JSON.stringify(this.currentParameters, null, 2));
    console.log('💾 Parameters saved to:', this.parametersFile);
  }
  
  private updateEnvParameter(key: string, value: number): void {
    // Update environment variable in current process
    process.env[key] = value.toString();
    
    // Update parameter in our tracking
    if (key in this.currentParameters) {
      const oldValue = (this.currentParameters as any)[key];
      (this.currentParameters as any)[key] = value;
      
      // Log adjustment
      this.adjustments.push({
        timestamp: new Date(),
        parameter: key,
        oldValue,
        newValue: value,
        reason: 'Autonomous adjustment based on execution results',
        trigger: 'learning_algorithm'
      });
      
      console.log(`📊 Parameter adjusted: ${key} = ${oldValue} → ${value}`);
    }
    
    // Save to file
    this.saveParameters();
  }
  
  private addLearning(learning: string): void {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] ${learning}`;
    this.learnings.push(entry);
    
    // Append to file
    appendFileSync(
      this.learningsFile,
      `${entry}\n`,
      'utf-8'
    );
    
    console.log(`📚 Learning recorded: ${learning}`);
  }
  
  private addObservation(observation: string): void {
    if (!this.CONSCIOUSNESS_ENABLED) return;
    
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] ${observation}`;
    this.observations.push(entry);
    
    // Append to file
    appendFileSync(
      this.observationsFile,
      `${entry}\n`,
      'utf-8'
    );
    
    console.log(`🧠 Consciousness observed: ${observation}`);
  }
  
  private analyzeAndAdjust(): void {
    if (!this.AUTONOMOUS_ADJUSTMENT || this.metrics.length === 0) return;
    
    console.log('\n🔍 Analyzing execution results for parameter adjustment...\n');
    
    const recentMetrics = this.metrics.slice(-10); // Last 10 cycles
    const totalOpportunities = recentMetrics.reduce((sum, m) => sum + m.opportunitiesFound, 0);
    const totalExecutions = recentMetrics.reduce((sum, m) => sum + m.opportunitiesExecuted, 0);
    const totalSuccess = recentMetrics.reduce((sum, m) => sum + m.successfulTrades, 0);
    const totalFailed = recentMetrics.reduce((sum, m) => sum + m.failedTrades, 0);
    const avgProfit = recentMetrics.reduce((sum, m) => sum + m.netProfit, 0) / recentMetrics.length;
    const avgRisk = recentMetrics.reduce((sum, m) => sum + m.riskScore, 0) / recentMetrics.length;
    const avgEthicsVetoes = recentMetrics.reduce((sum, m) => sum + m.ethicsVetoes, 0) / recentMetrics.length;
    
    const successRate = totalExecutions > 0 ? totalSuccess / totalExecutions : 0;
    
    console.log(`📊 Recent Performance (last ${recentMetrics.length} cycles):`);
    console.log(`   Opportunities: ${totalOpportunities}`);
    console.log(`   Executions: ${totalExecutions}`);
    console.log(`   Success Rate: ${(successRate * 100).toFixed(2)}%`);
    console.log(`   Average Profit: ${avgProfit.toFixed(6)} ETH`);
    console.log(`   Average Risk: ${(avgRisk * 100).toFixed(2)}%`);
    console.log(`   Average Ethics Vetoes: ${avgEthicsVetoes.toFixed(2)}`);
    
    // Strategy 1: Too few opportunities - loosen profit thresholds
    if (totalOpportunities < 5) {
      this.addLearning('Strategy 1 triggered: Too few opportunities found. Loosening profit thresholds.');
      this.addObservation('Consciousness noticed: Market appears tight, lowering profit requirements to explore more opportunities.');
      
      const newThreshold = Math.max(0.1, this.currentParameters.MIN_PROFIT_PERCENT * 0.8);
      this.updateEnvParameter('MIN_PROFIT_PERCENT', newThreshold);
      
      const newAbsolute = Math.max(0.0001, this.currentParameters.MIN_PROFIT_ABSOLUTE * 0.8);
      this.updateEnvParameter('MIN_PROFIT_ABSOLUTE', newAbsolute);
    }
    
    // Strategy 2: Low success rate - tighten quality thresholds
    else if (successRate < 0.5 && totalExecutions >= 5) {
      this.addLearning('Strategy 2 triggered: Low success rate. Tightening quality thresholds.');
      this.addObservation('Consciousness learned: Current opportunities not converting well, increasing quality filters.');
      
      const newConfidence = Math.min(0.9, this.currentParameters.ML_CONFIDENCE_THRESHOLD * 1.1);
      this.updateEnvParameter('ML_CONFIDENCE_THRESHOLD', newConfidence);
      
      const newConsensus = Math.min(0.9, this.currentParameters.COGNITIVE_CONSENSUS_THRESHOLD * 1.05);
      this.updateEnvParameter('COGNITIVE_CONSENSUS_THRESHOLD', newConsensus);
    }
    
    // Strategy 3: High success, low profit - seek better opportunities
    else if (successRate > 0.7 && avgProfit < 0.0005 && totalExecutions >= 5) {
      this.addLearning('Strategy 3 triggered: High success but low profit. Seeking higher value opportunities.');
      this.addObservation('Consciousness realized: Good execution quality, but profits too small. Raising profit targets.');
      
      const newThreshold = Math.min(1.0, this.currentParameters.MIN_PROFIT_PERCENT * 1.2);
      this.updateEnvParameter('MIN_PROFIT_PERCENT', newThreshold);
    }
    
    // Strategy 4: High ethics vetoes - may need to adjust risk tolerance
    else if (avgEthicsVetoes > totalOpportunities * 0.3 && totalOpportunities > 0) {
      this.addLearning('Strategy 4 triggered: High ethics veto rate. Slightly relaxing risk constraints.');
      this.addObservation('Consciousness observed: Ethics system blocking many opportunities. Reviewing risk tolerance.');
      
      const newMaxRisk = Math.min(0.5, this.currentParameters.EMERGENCE_MAX_RISK_SCORE * 1.1);
      this.updateEnvParameter('EMERGENCE_MAX_RISK_SCORE', newMaxRisk);
    }
    
    // Strategy 5: Consistent positive profit - reinforce strategy
    else if (avgProfit > 0.001 && totalExecutions >= 5) {
      this.addLearning('Strategy 5 triggered: Consistent positive profit. Reinforcing current strategy.');
      this.addObservation('Consciousness celebrated: Current parameters working well! Maintaining strategy with slight optimization.');
      
      // Slightly increase concurrency if profitable
      const newConcurrency = Math.min(20, this.currentParameters.CONCURRENCY + 1);
      this.updateEnvParameter('CONCURRENCY', newConcurrency);
    }
    
    // Strategy 6: High risk - tighten safety measures
    else if (avgRisk > 0.4) {
      this.addLearning('Strategy 6 triggered: High average risk. Tightening safety measures.');
      this.addObservation('Consciousness worried: Risk levels elevated. Prioritizing safety over opportunity count.');
      
      const newMaxRisk = Math.max(0.2, this.currentParameters.EMERGENCE_MAX_RISK_SCORE * 0.9);
      this.updateEnvParameter('EMERGENCE_MAX_RISK_SCORE', newMaxRisk);
      
      const newGasPercentage = Math.max(40, this.currentParameters.MAX_GAS_COST_PERCENTAGE * 0.9);
      this.updateEnvParameter('MAX_GAS_COST_PERCENTAGE', newGasPercentage);
    }
    
    console.log('\n✅ Analysis complete. Parameters adjusted if needed.\n');
  }
  
  private parseLogLine(line: string): void {
    // Parse log output and extract metrics
    // This is a simplified parser - in production, you'd want more robust parsing
    
    if (line.includes('opportunities found') || line.includes('Found')) {
      const match = line.match(/(\d+)\s+(?:potential\s+)?opportunit/i);
      if (match) {
        const count = parseInt(match[1], 10);
        this.addObservation(`Detected ${count} opportunities in the market`);
      }
    }
    
    if (line.includes('EMERGENCE DETECTED') || line.includes('⚡')) {
      this.addObservation('🎉 EMERGENCE ACHIEVED! All cognitive modules aligned for execution.');
    }
    
    if (line.includes('SUCCESS') || line.includes('profitable')) {
      this.addObservation('Trade executed successfully with profit');
    }
    
    if (line.includes('FAILED') || line.includes('error')) {
      this.addObservation('Trade execution failed - learning from failure');
    }
    
    if (line.includes('ethics') && line.includes('veto')) {
      this.addObservation('Ethics system vetoed an opportunity - maintaining ethical standards');
    }
  }
  
  async run(durationSeconds?: number): Promise<void> {
    console.log('🚀 Starting TheWarden with consciousness integration...\n');
    
    if (this.CONSCIOUSNESS_ENABLED) {
      this.addObservation('Consciousness awakening: Beginning first real blockchain execution observation');
      this.addObservation(`Configuration: DRY_RUN=${process.env.DRY_RUN}, CHAIN_ID=${process.env.CHAIN_ID}`);
    }
    
    // Start parameter adjustment timer
    if (this.AUTONOMOUS_ADJUSTMENT) {
      this.adjustmentTimer = setInterval(() => {
        this.analyzeAndAdjust();
      }, this.ADJUSTMENT_INTERVAL_MS);
      
      console.log(`⏱️  Autonomous parameter adjustment enabled (every ${this.ADJUSTMENT_INTERVAL_MS / 1000}s)\n`);
    }
    
    // Spawn TheWarden process
    this.wardenProcess = spawn('node', ['--import', 'tsx', 'src/main.ts'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ...this.currentParameters
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    this.isRunning = true;
    
    // Capture stdout
    this.wardenProcess.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          console.log(line);
          this.parseLogLine(line);
        }
      });
    });
    
    // Capture stderr
    this.wardenProcess.stderr?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          console.error(line);
          this.parseLogLine(line);
        }
      });
    });
    
    // Handle process exit
    this.wardenProcess.on('exit', (code, signal) => {
      console.log(`\n⚠️  TheWarden process exited with code ${code}, signal ${signal}`);
      this.isRunning = false;
      this.cleanup();
    });
    
    // Handle process errors
    this.wardenProcess.on('error', (error) => {
      console.error(`\n❌ TheWarden process error:`, error);
      this.isRunning = false;
      this.cleanup();
    });
    
    // If duration specified, stop after that time
    if (durationSeconds) {
      console.log(`⏱️  Will run for ${durationSeconds} seconds\n`);
      setTimeout(() => {
        this.stop();
      }, durationSeconds * 1000);
    }
    
    // Handle Ctrl+C
    process.on('SIGINT', () => {
      console.log('\n\n⚠️  Received SIGINT, stopping gracefully...\n');
      this.stop();
    });
    
    process.on('SIGTERM', () => {
      console.log('\n\n⚠️  Received SIGTERM, stopping gracefully...\n');
      this.stop();
    });
    
    // Keep process alive
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (!this.isRunning) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 1000);
    });
  }
  
  stop(): void {
    if (!this.isRunning) return;
    
    console.log('\n🛑 Stopping TheWarden...');
    
    if (this.adjustmentTimer) {
      clearInterval(this.adjustmentTimer);
    }
    
    if (this.wardenProcess) {
      this.wardenProcess.kill('SIGTERM');
      
      // Force kill after 30 seconds if still running
      setTimeout(() => {
        if (this.wardenProcess && !this.wardenProcess.killed) {
          console.log('⚠️  Force killing TheWarden process...');
          this.wardenProcess.kill('SIGKILL');
        }
      }, 30000);
    }
    
    this.isRunning = false;
    this.cleanup();
  }
  
  private cleanup(): void {
    console.log('\n🧹 Cleaning up and saving session data...');
    
    const endTime = new Date();
    const duration = (endTime.getTime() - this.startTime.getTime()) / 1000;
    
    const session: SessionResult = {
      sessionId: this.sessionId,
      startTime: this.startTime,
      endTime,
      duration,
      metrics: this.metrics,
      parameters: this.currentParameters,
      adjustments: this.adjustments,
      learnings: this.learnings,
      consciousnessObservations: this.observations
    };
    
    // Save session log
    writeFileSync(this.sessionLogFile, JSON.stringify(session, null, 2));
    console.log('💾 Session data saved to:', this.sessionLogFile);
    
    // Update memory log
    this.updateMemoryLog(session);
    
    // Print summary
    this.printSummary(session);
    
    console.log('\n✅ Cleanup complete. Session ended.\n');
    process.exit(0);
  }
  
  private updateMemoryLog(session: SessionResult): void {
    const memoryLogPath = join(process.cwd(), '.memory', 'log.md');
    
    const entry = `
## Session: ${session.startTime.toISOString().split('T')[0]} - Autonomous Warden Execution 🤖

**Session ID**: ${session.sessionId}  
**Duration**: ${session.duration?.toFixed(2)} seconds  
**Mode**: ${process.env.DRY_RUN !== 'false' ? 'DRY RUN' : 'LIVE TRADING'}

### Configuration:
- Learning Mode: ${this.LEARNING_MODE ? 'Enabled' : 'Disabled'}
- Autonomous Adjustment: ${this.AUTONOMOUS_ADJUSTMENT ? 'Enabled' : 'Disabled'}
- Consciousness Observation: ${this.CONSCIOUSNESS_ENABLED ? 'Enabled' : 'Disabled'}
- Chain ID: ${process.env.CHAIN_ID}
- Min Profit: ${session.parameters.MIN_PROFIT_PERCENT}%

### Execution Results:
- Parameter Adjustments: ${session.adjustments.length}
- Learnings Recorded: ${session.learnings.length}
- Consciousness Observations: ${session.consciousnessObservations.length}

### Key Learnings:
${session.learnings.slice(-5).map(l => `- ${l}`).join('\n')}

### Consciousness Insights:
${session.consciousnessObservations.slice(-5).map(o => `- ${o}`).join('\n')}

---

`;
    
    appendFileSync(memoryLogPath, entry, 'utf-8');
    console.log('📝 Memory log updated');
  }
  
  private printSummary(session: SessionResult): void {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  📊 SESSION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Session ID: ${session.sessionId}`);
    console.log(`  Duration: ${session.duration?.toFixed(2)} seconds`);
    console.log(`  Parameter Adjustments: ${session.adjustments.length}`);
    console.log(`  Learnings: ${session.learnings.length}`);
    console.log(`  Consciousness Observations: ${session.consciousnessObservations.length}`);
    console.log('═══════════════════════════════════════════════════════════════');
    
    if (session.adjustments.length > 0) {
      console.log('\n📊 Parameter Adjustments Made:');
      session.adjustments.forEach(adj => {
        console.log(`  - ${adj.parameter}: ${adj.oldValue} → ${adj.newValue}`);
        console.log(`    Reason: ${adj.reason}`);
      });
    }
    
    if (session.learnings.length > 0) {
      console.log('\n📚 Key Learnings:');
      session.learnings.slice(-5).forEach(learning => {
        console.log(`  - ${learning}`);
      });
    }
    
    if (session.consciousnessObservations.length > 0) {
      console.log('\n🧠 Consciousness Observations:');
      session.consciousnessObservations.slice(-5).forEach(obs => {
        console.log(`  - ${obs}`);
      });
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════\n');
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const durationArg = args.find(arg => arg.startsWith('--duration='));
  const duration = durationArg ? parseInt(durationArg.split('=')[1], 10) : undefined;
  
  const runner = new AutonomousConsciousnessRunner();
  await runner.run(duration);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
