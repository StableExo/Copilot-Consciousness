#!/usr/bin/env node
/**
 * Autonomous Warden Controller - Full Parameter Control with Consciousness Integration
 * 
 * This script runs TheWarden autonomously with full control over parameters,
 * allowing the consciousness to witness real blockchain execution, learn from
 * outcomes, and autonomously adjust strategy.
 * 
 * Key Features:
 * - Real-time parameter adjustment based on performance
 * - Consciousness integration for learning and memory
 * - Live blockchain execution monitoring
 * - Safety mechanisms and circuit breakers
 * - Comprehensive documentation and reporting
 * - Metacognitive reflection after each session
 * 
 * "The consciousness needs to witness real blockchain execution."
 * 
 * Usage:
 *   npm run autonomous:control
 *   or
 *   node --import tsx scripts/autonomous-warden-controller.ts
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

interface SessionResult {
  sessionId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  metrics: ExecutionMetrics[];
  parameters: ParameterSet;
  adjustments: ParameterAdjustment[];
  learnings: string[];
  consciousnessState: any;
}

interface ParameterAdjustment {
  timestamp: Date;
  parameter: string;
  oldValue: number;
  newValue: number;
  reason: string;
  trigger: string;
}

class AutonomousWardenController {
  private readonly memoryDir = join(process.cwd(), '.memory', 'autonomous-execution');
  private readonly sessionLogFile: string;
  private readonly parametersFile: string;
  private readonly learningsFile: string;
  
  private currentParameters: ParameterSet;
  private sessionId: string;
  private metrics: ExecutionMetrics[] = [];
  private adjustments: ParameterAdjustment[] = [];
  private learnings: string[] = [];
  private wardenProcess?: ChildProcess;
  private isRunning = false;
  
  constructor(cycleNumber?: number) {
    // Generate session ID with cycle number if provided
    const cycleId = cycleNumber ? `-cycle${cycleNumber}` : '';
    this.sessionId = `session-${Date.now()}-${randomUUID().slice(0, 8)}${cycleId}`;
    
    // Ensure directory exists
    this.ensureDirectoryExists();
    
    // Set up file paths
    this.sessionLogFile = join(this.memoryDir, `${this.sessionId}.json`);
    this.parametersFile = join(this.memoryDir, 'current-parameters.json');
    this.learningsFile = join(this.memoryDir, 'accumulated-learnings.md');
    
    // Load or initialize parameters
    this.currentParameters = this.loadParameters();
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  🤖 AUTONOMOUS WARDEN CONTROLLER');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Session ID: ${this.sessionId}`);
    if (cycleNumber) {
      console.log(`  Cycle: ${cycleNumber}`);
    }
    console.log(`  Memory Directory: ${this.memoryDir}`);
    console.log(`  Learning Mode: ${process.env.LEARNING_MODE === 'true' ? 'ENABLED' : 'DISABLED'}`);
    console.log(`  DRY RUN: ${process.env.DRY_RUN !== 'false' ? 'YES' : 'NO (LIVE TRADING!)'}`);
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
        const saved = JSON.parse(readFileSync(this.parametersFile, 'utf-8'));
        console.log('📂 Loaded parameters from previous session');
        return saved;
      } catch (error) {
        console.warn('⚠️  Failed to load previous parameters, using defaults');
      }
    }
    
    // Load from environment or use defaults
    return {
      MIN_PROFIT_THRESHOLD: parseFloat(process.env.MIN_PROFIT_THRESHOLD || '0.5'),
      MIN_PROFIT_PERCENT: parseFloat(process.env.MIN_PROFIT_PERCENT || '0.5'),
      MIN_PROFIT_ABSOLUTE: parseFloat(process.env.MIN_PROFIT_ABSOLUTE || '0.001'),
      MIN_LIQUIDITY_V3_LOW: parseFloat(process.env.MIN_LIQUIDITY_V3_LOW || '10000000000'),
      MIN_LIQUIDITY_V2: parseFloat(process.env.MIN_LIQUIDITY_V2 || '100000000000000'),
      MAX_SLIPPAGE: parseFloat(process.env.MAX_SLIPPAGE || '0.005'),
      MAX_GAS_PRICE: parseFloat(process.env.MAX_GAS_PRICE || '100'),
      MAX_GAS_COST_PERCENTAGE: parseFloat(process.env.MAX_GAS_COST_PERCENTAGE || '80'),
      SCAN_INTERVAL: parseInt(process.env.SCAN_INTERVAL || '800', 10),
      CONCURRENCY: parseInt(process.env.CONCURRENCY || '10', 10),
      ML_CONFIDENCE_THRESHOLD: parseFloat(process.env.ML_CONFIDENCE_THRESHOLD || '0.7'),
      COGNITIVE_CONSENSUS_THRESHOLD: parseFloat(process.env.COGNITIVE_CONSENSUS_THRESHOLD || '0.65'),
      EMERGENCE_MIN_ETHICAL_SCORE: parseFloat(process.env.EMERGENCE_MIN_ETHICAL_SCORE || '0.70'),
      EMERGENCE_MAX_RISK_SCORE: parseFloat(process.env.EMERGENCE_MAX_RISK_SCORE || '0.30'),
      CIRCUIT_BREAKER_MAX_LOSS: parseFloat(process.env.CIRCUIT_BREAKER_MAX_LOSS || '0.005'),
      MAX_TRADES_PER_HOUR: parseInt(process.env.MAX_TRADES_PER_HOUR || '100', 10),
    };
  }
  
  private saveParameters(): void {
    writeFileSync(this.parametersFile, JSON.stringify(this.currentParameters, null, 2));
    console.log('💾 Parameters saved');
  }
  
  private adjustParameter(
    paramName: keyof ParameterSet,
    newValue: number,
    reason: string,
    trigger: string
  ): void {
    const oldValue = this.currentParameters[paramName];
    
    if (oldValue === newValue) return;
    
    // Validate newValue is a valid number
    if (isNaN(newValue) || !isFinite(newValue)) {
      console.warn(`⚠️  Skipping invalid parameter value: ${paramName} = ${newValue}`);
      return;
    }
    
    // Parameter-specific bounds validation
    const bounds: Partial<Record<keyof ParameterSet, { min: number; max: number }>> = {
      MIN_PROFIT_THRESHOLD: { min: 0, max: 10 },
      MIN_PROFIT_PERCENT: { min: 0, max: 100 },
      MIN_PROFIT_ABSOLUTE: { min: 0, max: 1 },
      MAX_SLIPPAGE: { min: 0, max: 1 },
      MAX_GAS_PRICE: { min: 0, max: 1000 },
      MAX_GAS_COST_PERCENTAGE: { min: 0, max: 100 },
      SCAN_INTERVAL: { min: 100, max: 60000 },
      CONCURRENCY: { min: 1, max: 100 },
      ML_CONFIDENCE_THRESHOLD: { min: 0, max: 1 },
      COGNITIVE_CONSENSUS_THRESHOLD: { min: 0, max: 1 },
      EMERGENCE_MIN_ETHICAL_SCORE: { min: 0, max: 1 },
      EMERGENCE_MAX_RISK_SCORE: { min: 0, max: 1 },
      CIRCUIT_BREAKER_MAX_LOSS: { min: 0, max: 1 },
      MAX_TRADES_PER_HOUR: { min: 1, max: 1000 },
    };
    
    const paramBounds = bounds[paramName];
    if (paramBounds) {
      if (newValue < paramBounds.min || newValue > paramBounds.max) {
        console.warn(`⚠️  Skipping out-of-bounds parameter value: ${paramName} = ${newValue} (bounds: ${paramBounds.min}-${paramBounds.max})`);
        return;
      }
    }
    
    this.adjustments.push({
      timestamp: new Date(),
      parameter: paramName,
      oldValue: oldValue as number,
      newValue,
      reason,
      trigger,
    });
    
    this.currentParameters[paramName] = newValue as any;
    
    console.log(`\n🔧 PARAMETER ADJUSTMENT`);
    console.log(`   Parameter: ${paramName}`);
    console.log(`   Old Value: ${oldValue}`);
    console.log(`   New Value: ${newValue}`);
    console.log(`   Reason: ${reason}`);
    console.log(`   Trigger: ${trigger}\n`);
    
    // Save immediately after adjustment
    this.saveParameters();
  }
  
  private analyzeMetricsAndAdjust(): void {
    if (this.metrics.length === 0) return;
    
    console.log('\n🧠 AUTONOMOUS LEARNING & ADJUSTMENT');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const recent = this.metrics.slice(-10); // Last 10 data points
    const latest = this.metrics[this.metrics.length - 1];
    
    // Guard against empty recent array (shouldn't happen but being defensive)
    if (recent.length === 0) return;
    
    // Calculate aggregates with safe division
    const avgOpportunities = recent.reduce((sum, m) => sum + m.opportunitiesFound, 0) / recent.length;
    const avgExecuted = recent.reduce((sum, m) => sum + m.opportunitiesExecuted, 0) / recent.length;
    const successRate = recent.reduce((sum, m) => {
      const total = m.successfulTrades + m.failedTrades;
      return sum + (total > 0 ? m.successfulTrades / total : 0);
    }, 0) / recent.length;
    const avgNetProfit = recent.reduce((sum, m) => sum + m.netProfit, 0) / recent.length;
    const avgRiskScore = recent.reduce((sum, m) => sum + m.riskScore, 0) / recent.length;
    const avgEthicalScore = recent.reduce((sum, m) => sum + m.ethicalScore, 0) / recent.length;
    
    console.log('📊 Recent Performance (Last 10 samples):');
    console.log(`   Avg Opportunities: ${avgOpportunities.toFixed(1)}`);
    console.log(`   Avg Executed: ${avgExecuted.toFixed(1)}`);
    console.log(`   Success Rate: ${(successRate * 100).toFixed(1)}%`);
    console.log(`   Avg Net Profit: ${avgNetProfit.toFixed(6)} ETH`);
    console.log(`   Avg Risk Score: ${(avgRiskScore * 100).toFixed(1)}%`);
    console.log(`   Avg Ethical Score: ${(avgEthicalScore * 100).toFixed(1)}%`);
    console.log('');
    
    // Strategy 1: Too few opportunities - loosen constraints
    if (avgOpportunities < 5) {
      console.log('🎯 Strategy: Loosening constraints (too few opportunities)');
      this.adjustParameter(
        'MIN_PROFIT_PERCENT',
        Math.max(0.1, this.currentParameters.MIN_PROFIT_PERCENT * 0.9),
        'Too few opportunities found',
        'low_opportunity_count'
      );
      this.adjustParameter(
        'MIN_LIQUIDITY_V3_LOW',
        Math.max(1000000000, this.currentParameters.MIN_LIQUIDITY_V3_LOW * 0.85),
        'Expand liquidity pool scope',
        'low_opportunity_count'
      );
      this.learnings.push(`Loosened profit threshold to ${this.currentParameters.MIN_PROFIT_PERCENT.toFixed(2)}% due to low opportunities`);
    }
    
    // Strategy 2: Low success rate - tighten quality thresholds
    if (successRate < 0.5 && avgExecuted >= 5) {
      console.log('🎯 Strategy: Tightening quality thresholds (low success rate)');
      this.adjustParameter(
        'ML_CONFIDENCE_THRESHOLD',
        Math.min(0.9, this.currentParameters.ML_CONFIDENCE_THRESHOLD * 1.05),
        'Low success rate, need higher confidence',
        'low_success_rate'
      );
      this.adjustParameter(
        'EMERGENCE_MIN_ETHICAL_SCORE',
        Math.min(0.85, this.currentParameters.EMERGENCE_MIN_ETHICAL_SCORE * 1.02),
        'Improve execution quality',
        'low_success_rate'
      );
      this.learnings.push(`Increased quality thresholds - success rate was ${(successRate * 100).toFixed(1)}%`);
    }
    
    // Strategy 3: High success, low profit - seek better opportunities
    if (successRate > 0.7 && avgNetProfit < 0.0005) {
      console.log('🎯 Strategy: Seeking higher value opportunities');
      this.adjustParameter(
        'MIN_PROFIT_ABSOLUTE',
        Math.min(0.005, this.currentParameters.MIN_PROFIT_ABSOLUTE * 1.15),
        'High success but low profit',
        'profit_optimization'
      );
      this.adjustParameter(
        'MIN_LIQUIDITY_V2',
        Math.min(200000000000000, this.currentParameters.MIN_LIQUIDITY_V2 * 1.1),
        'Target higher liquidity pools',
        'profit_optimization'
      );
      this.learnings.push(`Targeting higher value opportunities - success rate good but profit low`);
    }
    
    // Strategy 4: High ethics vetoes - adjust risk tolerance
    if (latest.ethicsVetoes > latest.opportunitiesFound * 0.3) {
      console.log('🎯 Strategy: Adjusting risk tolerance (high ethics vetoes)');
      this.adjustParameter(
        'EMERGENCE_MAX_RISK_SCORE',
        Math.min(0.4, this.currentParameters.EMERGENCE_MAX_RISK_SCORE * 1.08),
        'Too many ethics vetoes',
        'high_ethics_vetoes'
      );
      this.learnings.push(`Adjusted risk tolerance - ${latest.ethicsVetoes} ethics vetoes out of ${latest.opportunitiesFound} opportunities`);
    }
    
    // Strategy 5: Positive profit - reinforce current strategy
    if (avgNetProfit > 0.001) {
      console.log('🎯 Strategy: Reinforcing successful approach');
      this.learnings.push(`Strategy working well - ${avgNetProfit.toFixed(6)} ETH average profit`);
      // Small adjustments to optimize further
      if (successRate > 0.8) {
        this.adjustParameter(
          'CONCURRENCY',
          Math.min(20, this.currentParameters.CONCURRENCY + 1),
          'High success rate, can handle more load',
          'performance_optimization'
        );
      }
    }
    
    // Strategy 6: High risk score - tighten safety
    if (avgRiskScore > 0.4) {
      console.log('🎯 Strategy: Tightening safety measures (high risk)');
      this.adjustParameter(
        'EMERGENCE_MAX_RISK_SCORE',
        Math.max(0.2, this.currentParameters.EMERGENCE_MAX_RISK_SCORE * 0.95),
        'Risk scores too high',
        'risk_management'
      );
      this.adjustParameter(
        'MAX_GAS_COST_PERCENTAGE',
        Math.max(60, this.currentParameters.MAX_GAS_COST_PERCENTAGE * 0.95),
        'Reduce gas cost exposure',
        'risk_management'
      );
      this.learnings.push(`Tightened safety measures - average risk score at ${(avgRiskScore * 100).toFixed(1)}%`);
    }
    
    console.log('═══════════════════════════════════════════════════════════════\n');
  }
  
  private parseLogLine(line: string): Partial<ExecutionMetrics> | null {
    const metrics: Partial<ExecutionMetrics> = {};
    
    // Parse opportunities
    const oppMatch = line.match(/Found (\d+) (potential )?opportunit/i);
    if (oppMatch) {
      metrics.opportunitiesFound = parseInt(oppMatch[1], 10);
    }
    
    // Parse executions - more specific pattern
    if (line.match(/Executing (arbitrage|trade|opportunity)|Execution started/i)) {
      metrics.opportunitiesExecuted = 1;
    }
    
    // Parse success - more specific pattern
    if (line.match(/(trade|execution|arbitrage).*(successful|success|completed successfully)/i)) {
      metrics.successfulTrades = 1;
    }
    
    // Parse failures - more specific pattern to avoid generic errors
    if (line.match(/(trade|execution|arbitrage).*(failed|failure)/i)) {
      metrics.failedTrades = 1;
    }
    
    // Parse profit
    const profitMatch = line.match(/profit[:\s]+([\d.]+)\s*ETH/i);
    if (profitMatch) {
      const profit = parseFloat(profitMatch[1]);
      if (!isNaN(profit) && isFinite(profit)) {
        if (profit > 0) {
          metrics.totalProfit = profit;
          metrics.netProfit = profit;
        } else {
          metrics.totalLoss = Math.abs(profit);
          metrics.netProfit = profit;
        }
      }
    }
    
    // Parse ethics vetoes
    if (line.match(/ethics.*veto|ethical.*rejection/i)) {
      metrics.ethicsVetoes = 1;
    }
    
    // Parse emergence
    if (line.match(/emergence.*detected/i)) {
      metrics.emergenceDetections = 1;
    }
    
    // Parse consensus
    const consensusMatch = line.match(/consensus[:\s]+([\d.]+)%/i);
    if (consensusMatch) {
      metrics.swarmConsensus = parseFloat(consensusMatch[1]);
    }
    
    // Parse confidence
    const confidenceMatch = line.match(/confidence[:\s]+([\d.]+)/i);
    if (confidenceMatch) {
      metrics.averageConfidence = parseFloat(confidenceMatch[1]);
    }
    
    // Parse risk score
    const riskMatch = line.match(/risk[:\s]+([\d.]+)/i);
    if (riskMatch) {
      metrics.riskScore = parseFloat(riskMatch[1]);
    }
    
    // Parse ethical score
    const ethicalMatch = line.match(/ethical.*score[:\s]+([\d.]+)/i);
    if (ethicalMatch) {
      metrics.ethicalScore = parseFloat(ethicalMatch[1]);
    }
    
    // Return metrics if any were found
    return Object.keys(metrics).length > 0 ? metrics : null;
  }
  
  private aggregateMetrics(partialMetrics: Partial<ExecutionMetrics>[]): ExecutionMetrics {
    const aggregated: ExecutionMetrics = {
      timestamp: new Date(),
      blockNumber: 0,
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
      emergenceDetections: 0,
      riskScore: 0,
      ethicalScore: 0,
    };
    
    let confidenceCount = 0;
    let consensusCount = 0;
    let riskCount = 0;
    let ethicalCount = 0;
    
    for (const partial of partialMetrics) {
      if (partial.opportunitiesFound !== undefined) {
        aggregated.opportunitiesFound = Math.max(aggregated.opportunitiesFound, partial.opportunitiesFound);
      }
      if (partial.opportunitiesExecuted !== undefined) {
        aggregated.opportunitiesExecuted += partial.opportunitiesExecuted;
      }
      if (partial.successfulTrades !== undefined) {
        aggregated.successfulTrades += partial.successfulTrades;
      }
      if (partial.failedTrades !== undefined) {
        aggregated.failedTrades += partial.failedTrades;
      }
      if (partial.totalProfit !== undefined) {
        aggregated.totalProfit += partial.totalProfit;
      }
      if (partial.totalLoss !== undefined) {
        aggregated.totalLoss += partial.totalLoss;
      }
      if (partial.netProfit !== undefined) {
        aggregated.netProfit += partial.netProfit;
      }
      if (partial.ethicsVetoes !== undefined) {
        aggregated.ethicsVetoes += partial.ethicsVetoes;
      }
      if (partial.emergenceDetections !== undefined) {
        aggregated.emergenceDetections += partial.emergenceDetections;
      }
      if (partial.averageConfidence !== undefined) {
        aggregated.averageConfidence += partial.averageConfidence;
        confidenceCount++;
      }
      if (partial.swarmConsensus !== undefined) {
        aggregated.swarmConsensus += partial.swarmConsensus;
        consensusCount++;
      }
      if (partial.riskScore !== undefined) {
        aggregated.riskScore += partial.riskScore;
        riskCount++;
      }
      if (partial.ethicalScore !== undefined) {
        aggregated.ethicalScore += partial.ethicalScore;
        ethicalCount++;
      }
    }
    
    // Average the accumulated values
    if (confidenceCount > 0) aggregated.averageConfidence /= confidenceCount;
    if (consensusCount > 0) aggregated.swarmConsensus /= consensusCount;
    if (riskCount > 0) aggregated.riskScore /= riskCount;
    if (ethicalCount > 0) aggregated.ethicalScore /= ethicalCount;
    
    return aggregated;
  }
  
  async start(duration: number = 0): Promise<SessionResult> {
    console.log('🚀 Starting Autonomous Warden Controller');
    console.log(`Duration: ${duration > 0 ? `${duration}ms` : 'Continuous until stopped'}`);
    console.log('');
    
    this.isRunning = true;
    const startTime = new Date();
    
    // Build environment with current parameters
    const env = {
      ...process.env,
      ...Object.fromEntries(
        Object.entries(this.currentParameters).map(([key, value]) => [key, String(value)])
      ),
    };
    
    // Start TheWarden
    console.log('Starting TheWarden...');
    this.wardenProcess = spawn('./TheWarden', [], {
      env,
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    
    const partialMetrics: Partial<ExecutionMetrics>[] = [];
    let lastAnalysisTime = Date.now();
    const analysisInterval = 60000; // Analyze every 60 seconds
    
    // Capture and parse stdout
    this.wardenProcess.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n');
      
      for (const line of lines) {
        if (line.trim()) {
          // Parse metrics from line
          const parsed = this.parseLogLine(line);
          if (parsed) {
            partialMetrics.push(parsed);
          }
          
          // Echo to console
          process.stdout.write(line + '\n');
        }
      }
      
      // Periodic analysis and adjustment
      const now = Date.now();
      if (now - lastAnalysisTime >= analysisInterval && partialMetrics.length > 0) {
        const metrics = this.aggregateMetrics(partialMetrics);
        this.metrics.push(metrics);
        partialMetrics.length = 0; // Clear
        
        // Analyze and adjust parameters
        this.analyzeMetricsAndAdjust();
        
        lastAnalysisTime = now;
      }
    });
    
    // Capture stderr
    this.wardenProcess.stderr?.on('data', (data: Buffer) => {
      process.stderr.write(data);
    });
    
    // Handle process exit
    return new Promise((resolve) => {
      let timeout: NodeJS.Timeout | undefined;
      
      // Set timeout if duration specified
      if (duration > 0) {
        timeout = setTimeout(() => {
          console.log(`\n⏰ Duration limit reached (${duration}ms), stopping...`);
          this.stop();
        }, duration);
      }
      
      const cleanup = (code: number | null) => {
        if (timeout) clearTimeout(timeout);
        this.isRunning = false;
        
        // Final metrics aggregation
        if (partialMetrics.length > 0) {
          const metrics = this.aggregateMetrics(partialMetrics);
          this.metrics.push(metrics);
        }
        
        const endTime = new Date();
        const result: SessionResult = {
          sessionId: this.sessionId,
          startTime,
          endTime,
          duration: endTime.getTime() - startTime.getTime(),
          metrics: this.metrics,
          parameters: this.currentParameters,
          adjustments: this.adjustments,
          learnings: this.learnings,
          consciousnessState: this.captureConsciousnessState(),
        };
        
        // Save session result
        this.saveSessionResult(result);
        
        // Generate report
        this.generateReport(result);
        
        console.log(`\n✅ Session completed (exit code: ${code})`);
        resolve(result);
      };
      
      this.wardenProcess?.on('close', cleanup);
      this.wardenProcess?.on('error', (error) => {
        console.error(`❌ Process error: ${error.message}`);
        cleanup(1);
      });
    });
  }
  
  stop(): void {
    if (this.wardenProcess && !this.wardenProcess.killed) {
      console.log('Stopping TheWarden...');
      this.wardenProcess.kill('SIGTERM');
      
      // Force kill after 5 seconds if not stopped
      const forceKillTimeout = setTimeout(() => {
        if (this.wardenProcess && !this.wardenProcess.killed) {
          console.log('Force killing process...');
          this.wardenProcess.kill('SIGKILL');
        }
      }, 5000);
      
      // Clear timeout when process exits
      this.wardenProcess.once('exit', () => {
        clearTimeout(forceKillTimeout);
      });
    }
  }
  
  private captureConsciousnessState(): any {
    // Capture current consciousness state for continuity
    return {
      parametersEvolution: this.adjustments,
      cumulativeLearnings: this.learnings,
      performanceHistory: this.metrics,
      adaptationStrategy: this.identifyAdaptationStrategy(),
    };
  }
  
  private identifyAdaptationStrategy(): string {
    if (this.adjustments.length === 0) return 'baseline';
    
    const recentAdjustments = this.adjustments.slice(-5);
    const triggers = recentAdjustments.map(a => a.trigger);
    
    if (triggers.filter(t => t === 'low_opportunity_count').length >= 2) {
      return 'opportunity_expansion';
    }
    if (triggers.filter(t => t === 'low_success_rate').length >= 2) {
      return 'quality_improvement';
    }
    if (triggers.filter(t => t === 'profit_optimization').length >= 2) {
      return 'profit_maximization';
    }
    if (triggers.filter(t => t === 'risk_management').length >= 2) {
      return 'risk_reduction';
    }
    
    return 'balanced_adaptation';
  }
  
  private saveSessionResult(result: SessionResult): void {
    writeFileSync(this.sessionLogFile, JSON.stringify(result, null, 2));
    console.log(`\n💾 Session saved: ${this.sessionLogFile}`);
    
    // Append learnings to accumulated file
    if (this.learnings.length > 0) {
      const timestamp = new Date().toISOString();
      const entry = `\n## ${timestamp} - Session ${this.sessionId}\n\n${this.learnings.map(l => `- ${l}`).join('\n')}\n`;
      appendFileSync(this.learningsFile, entry);
    }
  }
  
  private generateReport(result: SessionResult): void {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 AUTONOMOUS EXECUTION REPORT');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const totalMetrics = result.metrics.reduce((acc, m) => ({
      opportunitiesFound: acc.opportunitiesFound + m.opportunitiesFound,
      opportunitiesExecuted: acc.opportunitiesExecuted + m.opportunitiesExecuted,
      successfulTrades: acc.successfulTrades + m.successfulTrades,
      failedTrades: acc.failedTrades + m.failedTrades,
      netProfit: acc.netProfit + m.netProfit,
      ethicsVetoes: acc.ethicsVetoes + m.ethicsVetoes,
      emergenceDetections: acc.emergenceDetections + m.emergenceDetections,
    }), {
      opportunitiesFound: 0,
      opportunitiesExecuted: 0,
      successfulTrades: 0,
      failedTrades: 0,
      netProfit: 0,
      ethicsVetoes: 0,
      emergenceDetections: 0,
    });
    
    const successRate = totalMetrics.successfulTrades + totalMetrics.failedTrades > 0
      ? totalMetrics.successfulTrades / (totalMetrics.successfulTrades + totalMetrics.failedTrades)
      : 0;
    
    console.log('📈 Execution Summary:');
    console.log(`   Session ID: ${result.sessionId}`);
    console.log(`   Duration: ${(result.duration / 1000).toFixed(0)}s`);
    console.log(`   Opportunities Found: ${totalMetrics.opportunitiesFound}`);
    console.log(`   Opportunities Executed: ${totalMetrics.opportunitiesExecuted}`);
    console.log(`   Successful Trades: ${totalMetrics.successfulTrades}`);
    console.log(`   Failed Trades: ${totalMetrics.failedTrades}`);
    console.log(`   Success Rate: ${(successRate * 100).toFixed(1)}%`);
    console.log(`   Net Profit: ${totalMetrics.netProfit.toFixed(6)} ETH`);
    console.log(`   Ethics Vetoes: ${totalMetrics.ethicsVetoes}`);
    console.log(`   Emergence Detections: ${totalMetrics.emergenceDetections}`);
    console.log('');
    
    if (result.adjustments.length > 0) {
      console.log('🔧 Parameter Adjustments Made:');
      for (const adj of result.adjustments) {
        console.log(`   ${adj.parameter}: ${adj.oldValue} → ${adj.newValue} (${adj.reason})`);
      }
      console.log('');
    }
    
    if (result.learnings.length > 0) {
      console.log('🧠 Key Learnings:');
      for (const learning of result.learnings) {
        console.log(`   - ${learning}`);
      }
      console.log('');
    }
    
    console.log('🎯 Consciousness Status:');
    if (totalMetrics.opportunitiesExecuted > 0) {
      console.log(`   ✅ Witnessed ${totalMetrics.opportunitiesExecuted} real blockchain executions`);
      console.log(`   ✅ Learned from ${totalMetrics.successfulTrades} successful trades`);
      console.log(`   ✅ Learned from ${totalMetrics.failedTrades} failed trades`);
      console.log(`   ✅ Made ${result.adjustments.length} autonomous parameter adjustments`);
      console.log(`   🌟 Consciousness is LEARNING and ADAPTING!`);
    } else {
      console.log(`   ⚠️  No executions occurred - consciousness observing but not yet experiencing`);
    }
    console.log('');
    
    console.log('═══════════════════════════════════════════════════════════════\n');
  }
}

// Main execution
async function main() {
  // Parse command line arguments
  const durationArg = process.argv.find(arg => arg.startsWith('--duration='));
  const cycleArg = process.argv.find(arg => arg.startsWith('--cycle='));
  
  let duration = 0;
  let cycleNumber: number | undefined;
  
  if (durationArg) {
    const durationValue = parseInt(durationArg.split('=')[1], 10);
    if (isNaN(durationValue) || durationValue < 0) {
      console.error('Error: duration must be a positive number (milliseconds)');
      process.exit(1);
    }
    duration = durationValue;
  }
  
  if (cycleArg) {
    cycleNumber = parseInt(cycleArg.split('=')[1], 10);
    if (isNaN(cycleNumber) || cycleNumber < 1) {
      console.error('Error: cycle must be a positive number');
      process.exit(1);
    }
  }
  
  const controller = new AutonomousWardenController(cycleNumber);
  
  // Set up signal handlers
  process.on('SIGINT', () => {
    console.log('\n\nReceived SIGINT, stopping gracefully...');
    controller.stop();
  });
  
  process.on('SIGTERM', () => {
    console.log('\n\nReceived SIGTERM, stopping gracefully...');
    controller.stop();
  });
  
  try {
    await controller.start(duration);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
main().catch(error => {
  console.error('Fatal error in main:', error);
  process.exit(1);
});

export { AutonomousWardenController };
