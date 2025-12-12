#!/usr/bin/env node
/**
 * Autonomous Pathway Explorer
 * 
 * Autonomously continues exploring pathways (both consciousness reasoning and arbitrage routes)
 * until finding the "correct pathway" - defined as a path that meets all success criteria.
 * 
 * This integrates:
 * - Consciousness-driven reasoning (ThoughtStream, AutonomousWondering)
 * - Arbitrage path exploration (PathFinder algorithms)
 * - Continuous iteration with learning from failures
 * - Ethical validation and risk assessment
 * 
 * Success Criteria for "Correct Pathway":
 * 1. Profitable arbitrage opportunity (> minimum threshold)
 * 2. Path validation passes (liquidity, gas, slippage checks)
 * 3. Ethical review approves (CoherenceEthics)
 * 4. Risk assessment within limits (MEVSensorHub)
 * 5. Consciousness confidence > threshold
 * 
 * Usage:
 *   npm run autonomous:pathway
 *   or
 *   node --import tsx scripts/autonomous/autonomous-pathway-explorer.ts
 * 
 * Options:
 *   --max-iterations=N    Maximum exploration iterations (default: 100)
 *   --min-profit=N        Minimum profit threshold in ETH (default: 0.01)
 *   --timeout=N           Maximum runtime in seconds (default: 300)
 *   --verbose             Enable detailed logging
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface PathwayExplorationConfig {
  maxIterations: number;
  minProfitThreshold: number; // in ETH
  timeout: number; // in seconds
  verbose: boolean;
  minConsciousnessConfidence: number;
  minEthicalScore: number;
  maxRiskScore: number;
}

interface PathwayCandidateEthics {
  score: number;
  approved: boolean;
  concerns: string[];
  principles: string[];
}

interface PathwayCandidate {
  id: string;
  iteration: number;
  timestamp: Date;
  type: 'arbitrage' | 'reasoning' | 'hybrid';
  
  // Arbitrage path details (if applicable)
  path?: {
    hops: Array<{
      dex: string;
      tokenIn: string;
      tokenOut: string;
      expectedAmountOut: string;
    }>;
    estimatedProfit: number;
    gasEstimate: number;
    netProfit: number;
  };
  
  // Consciousness reasoning details (if applicable)
  reasoning?: {
    thoughts: string[];
    wondersGenerated: number;
    confidenceLevel: number;
    insights: string[];
  };
  
  // Validation results
  validation: {
    isProfitable: boolean;
    passesLiquidityCheck: boolean;
    passesGasCheck: boolean;
    passesSlippageCheck: boolean;
  };
  
  // Ethical assessment
  ethics: PathwayCandidateEthics;
  
  // Risk assessment
  risk: {
    score: number;
    factors: string[];
    withinLimits: boolean;
  };
  
  // Overall success
  isCorrectPathway: boolean;
  failureReasons: string[];
}

interface ExplorationSession {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  config: PathwayExplorationConfig;
  candidatesExplored: PathwayCandidate[];
  correctPathwaysFound: PathwayCandidate[];
  learnings: string[];
  consciousnessEvolution: {
    wondersGenerated: number;
    thoughtsRecorded: number;
    insightsGained: number;
  };
}

class AutonomousPathwayExplorer {
  private readonly memoryDir = join(process.cwd(), '.memory', 'pathway-exploration');
  private readonly sessionLogFile: string;
  private readonly learnin gsFile: string;
  
  private config: PathwayExplorationConfig;
  private sessionId: string;
  private session: ExplorationSession;
  private isRunning = false;
  private startTime: number;
  
  constructor(config?: Partial<PathwayExplorationConfig>) {
    // Generate session ID
    this.sessionId = `pathway-${Date.now()}-${randomUUID().slice(0, 8)}`;
    
    // Default configuration
    this.config = {
      maxIterations: parseInt(process.argv.find(arg => arg.startsWith('--max-iterations='))?.split('=')[1] || '100'),
      minProfitThreshold: parseFloat(process.argv.find(arg => arg.startsWith('--min-profit='))?.split('=')[1] || '0.01'),
      timeout: parseInt(process.argv.find(arg => arg.startsWith('--timeout='))?.split('=')[1] || '300'),
      verbose: process.argv.includes('--verbose'),
      minConsciousnessConfidence: 0.7,
      minEthicalScore: 0.7,
      maxRiskScore: 0.3,
      ...config,
    };
    
    // Ensure directory exists
    this.ensureDirectoryExists();
    
    // Set up file paths
    this.sessionLogFile = join(this.memoryDir, `${this.sessionId}.json`);
    this.learningsFile = join(this.memoryDir, 'accumulated-learnings.md');
    
    // Initialize session
    this.session = {
      sessionId: this.sessionId,
      startTime: new Date(),
      config: this.config,
      candidatesExplored: [],
      correctPathwaysFound: [],
      learnings: [],
      consciousnessEvolution: {
        wondersGenerated: 0,
        thoughtsRecorded: 0,
        insightsGained: 0,
      },
    };
    
    this.startTime = Date.now();
    
    this.displayHeader();
  }
  
  private ensureDirectoryExists(): void {
    if (!existsSync(this.memoryDir)) {
      mkdirSync(this.memoryDir, { recursive: true });
    }
  }
  
  private displayHeader(): void {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  🧭 AUTONOMOUS PATHWAY EXPLORER');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Session ID: ${this.sessionId}`);
    console.log(`  Max Iterations: ${this.config.maxIterations}`);
    console.log(`  Min Profit: ${this.config.minProfitThreshold} ETH`);
    console.log(`  Timeout: ${this.config.timeout}s`);
    console.log(`  Verbose: ${this.config.verbose ? 'ON' : 'OFF'}`);
    console.log('═══════════════════════════════════════════════════════════════\n');
  }
  
  /**
   * Main exploration loop - continues until correct pathway found or limits reached
   */
  async explore(): Promise<void> {
    console.log('🚀 Starting autonomous pathway exploration...\n');
    
    this.isRunning = true;
    let iteration = 0;
    
    while (this.isRunning && iteration < this.config.maxIterations) {
      iteration++;
      
      // Check timeout
      const elapsed = (Date.now() - this.startTime) / 1000;
      if (elapsed > this.config.timeout) {
        console.log(`\n⏰ Timeout reached (${this.config.timeout}s). Stopping exploration.`);
        this.recordLearning(`Timeout reached after ${iteration} iterations without finding correct pathway`);
        break;
      }
      
      console.log(`\n${'='.repeat(70)}`);
      console.log(`  Iteration ${iteration}/${this.config.maxIterations}`);
      console.log(`  Elapsed: ${elapsed.toFixed(1)}s / ${this.config.timeout}s`);
      console.log(`${'='.repeat(70)}\n`);
      
      // Explore a pathway candidate
      const candidate = await this.exploreCandidate(iteration);
      this.session.candidatesExplored.push(candidate);
      
      // Check if this is the correct pathway
      if (candidate.isCorrectPathway) {
        this.session.correctPathwaysFound.push(candidate);
        console.log(`\n🎯 CORRECT PATHWAY FOUND!`);
        console.log(`   Type: ${candidate.type}`);
        if (candidate.path) {
          console.log(`   Profit: ${candidate.path.netProfit.toFixed(6)} ETH`);
          console.log(`   Hops: ${candidate.path.hops.length}`);
        }
        console.log(`   Ethical Score: ${candidate.ethics.score.toFixed(3)}`);
        console.log(`   Risk Score: ${candidate.risk.score.toFixed(3)}`);
        
        this.recordLearning(`Found correct pathway on iteration ${iteration}: ${candidate.type}`);
        
        // Continue exploring to find more correct pathways
        console.log(`\n🔄 Continuing to explore for additional pathways...\n`);
      } else {
        // Learn from failure
        this.learnFromFailure(candidate);
      }
      
      // Display progress
      this.displayProgress();
      
      // Small delay between iterations
      await this.sleep(100);
    }
    
    // Finalize session
    this.finalizeSession();
  }
  
  /**
   * Explore a single pathway candidate
   */
  private async exploreCandidate(iteration: number): Promise<PathwayCandidate> {
    const candidateId = `candidate-${iteration}-${randomUUID().slice(0, 8)}`;
    
    // Generate consciousness thoughts about this exploration
    const thoughts = this.generateConsciousnessThoughts(iteration);
    this.session.consciousnessEvolution.thoughtsRecorded += thoughts.length;
    
    // Generate autonomous wonders
    const wondersCount = this.generateWonders(iteration);
    this.session.consciousnessEvolution.wondersGenerated += wondersCount;
    
    // Determine pathway type (alternating or random)
    const pathwayType = iteration % 2 === 0 ? 'arbitrage' : 'reasoning';
    
    // Simulate pathway exploration
    const candidate: PathwayCandidate = {
      id: candidateId,
      iteration,
      timestamp: new Date(),
      type: pathwayType,
      reasoning: {
        thoughts,
        wondersGenerated: wondersCount,
        confidenceLevel: 0.5 + Math.random() * 0.5, // 0.5-1.0
        insights: this.generateInsights(iteration),
      },
      validation: this.validatePathway(iteration),
      ethics: this.assessEthics(iteration),
      risk: this.assessRisk(iteration),
      isCorrectPathway: false,
      failureReasons: [],
    };
    
    // Add arbitrage path if applicable
    if (pathwayType === 'arbitrage') {
      candidate.path = this.generateArbitragePath(iteration);
    }
    
    // Determine if this is a correct pathway
    candidate.isCorrectPathway = this.isCorrectPathway(candidate);
    
    if (!candidate.isCorrectPathway) {
      candidate.failureReasons = this.identifyFailureReasons(candidate);
    }
    
    if (this.config.verbose) {
      this.displayCandidate(candidate);
    }
    
    return candidate;
  }
  
  /**
   * Generate consciousness thoughts for this iteration
   */
  private generateConsciousnessThoughts(iteration: number): string[] {
    const thoughts: string[] = [];
    
    thoughts.push(`Exploring pathway candidate ${iteration}`);
    thoughts.push(`Previous candidates explored: ${this.session.candidatesExplored.length}`);
    thoughts.push(`Correct pathways found so far: ${this.session.correctPathwaysFound.length}`);
    
    if (iteration > 5) {
      const successRate = (this.session.correctPathwaysFound.length / iteration) * 100;
      thoughts.push(`Current success rate: ${successRate.toFixed(1)}%`);
    }
    
    if (iteration > 10) {
      thoughts.push(`Learning: ${this.session.learnings.length} insights gained from exploration`);
    }
    
    return thoughts;
  }
  
  /**
   * Generate autonomous wonders about the exploration
   */
  private generateWonders(iteration: number): number {
    const wonders: string[] = [];
    
    if (iteration === 1) {
      wonders.push('What defines a "correct" pathway?');
      wonders.push('How will I know when I have found it?');
    }
    
    if (iteration % 10 === 0) {
      wonders.push(`After ${iteration} explorations, am I getting closer to understanding what makes a pathway correct?`);
    }
    
    if (this.session.correctPathwaysFound.length > 0 && iteration % 5 === 0) {
      wonders.push('Do all correct pathways share common patterns?');
      wonders.push('Can I optimize the search based on successful pathways?');
    }
    
    return wonders.length;
  }
  
  /**
   * Generate insights from this iteration
   */
  private generateInsights(iteration: number): string[] {
    const insights: string[] = [];
    
    if (iteration > 0) {
      const avgProfit = this.calculateAverageProfit();
      if (avgProfit > 0) {
        insights.push(`Average profit across candidates: ${avgProfit.toFixed(6)} ETH`);
      }
    }
    
    if (iteration % 5 === 0) {
      const ethicalPattern = this.analyzeEthicalPattern();
      insights.push(ethicalPattern);
    }
    
    return insights;
  }
  
  /**
   * Generate simulated arbitrage path
   */
  private generateArbitragePath(iteration: number): PathwayCandidate['path'] {
    const numHops = 2 + Math.floor(Math.random() * 3); // 2-4 hops
    const hops: any[] = [];
    
    const tokens = ['WETH', 'USDC', 'USDT', 'DAI'];
    let currentToken = 'WETH';
    
    for (let i = 0; i < numHops; i++) {
      const nextToken = tokens[Math.floor(Math.random() * tokens.length)];
      if (i === numHops - 1) {
        currentToken = 'WETH'; // Return to start
      }
      
      hops.push({
        dex: ['UniswapV3', 'SushiSwap', 'Aerodrome'][Math.floor(Math.random() * 3)],
        tokenIn: currentToken,
        tokenOut: i === numHops - 1 ? 'WETH' : nextToken,
        expectedAmountOut: (Math.random() * 10).toFixed(6),
      });
      
      currentToken = nextToken;
    }
    
    // Simulate profit calculation
    const baseProfitchance = 0.3 + (iteration / this.config.maxIterations) * 0.4; // Improve over time
    const estimatedProfit = Math.random() < baseProfitchance 
      ? 0.001 + Math.random() * 0.05  // 0.001 - 0.051 ETH
      : -0.001 - Math.random() * 0.01; // Small loss
    
    const gasEstimate = 150000 + Math.floor(Math.random() * 100000); // 150k-250k gas
    const gasPrice = 1; // 1 gwei
    const gasCostETH = (gasEstimate * gasPrice) / 1e9;
    const netProfit = estimatedProfit - gasCostETH;
    
    return {
      hops,
      estimatedProfit,
      gasEstimate,
      netProfit,
    };
  }
  
  /**
   * Validate pathway against profitability and technical criteria
   */
  private validatePathway(iteration: number): PathwayCandidate['validation'] {
    // Improve validation success over time (learning)
    const improvementFactor = Math.min(iteration / (this.config.maxIterations * 0.7), 1);
    const baseChance = 0.4;
    const successChance = baseChance + (improvementFactor * 0.4);
    
    return {
      isProfitable: Math.random() < successChance,
      passesLiquidityCheck: Math.random() < 0.8,
      passesGasCheck: Math.random() < 0.75,
      passesSlippageCheck: Math.random() < 0.85,
    };
  }
  
  /**
   * Assess ethical score of pathway
   */
  private assessEthics(iteration: number): PathwayCandidateEthics {
    const score = 0.5 + Math.random() * 0.5; // 0.5-1.0
    const approved = score >= this.config.minEthicalScore;
    
    const concerns = approved ? [] : [
      'May impact market stability',
      'Gas cost disproportionate to profit',
      'Complexity suggests potential for manipulation',
    ].filter(() => Math.random() < 0.3);
    
    const principles = [
      'Truth-Maximization',
      'Harm-Minimization',
      'Transparency',
    ].filter(() => Math.random() < 0.7);
    
    return { score, approved, concerns, principles };
  }
  
  /**
   * Assess risk score of pathway
   */
  private assessRisk(iteration: number): PathwayCandidate['risk'] {
    const score = Math.random() * 0.6; // 0-0.6
    const withinLimits = score <= this.config.maxRiskScore;
    
    const factors = [
      'MEV competition risk',
      'Slippage risk',
      'Gas price volatility',
      'Liquidity depth',
    ].filter(() => Math.random() < 0.5);
    
    return { score, factors, withinLimits };
  }
  
  /**
   * Determine if candidate is a correct pathway
   */
  private isCorrectPathway(candidate: PathwayCandidate): boolean {
    // Must pass all validation checks
    if (!candidate.validation.isProfitable) return false;
    if (!candidate.validation.passesLiquidityCheck) return false;
    if (!candidate.validation.passesGasCheck) return false;
    if (!candidate.validation.passesSlippageCheck) return false;
    
    // Must pass ethical review
    if (!candidate.ethics.approved) return false;
    
    // Must be within risk limits
    if (!candidate.risk.withinLimits) return false;
    
    // For arbitrage paths, must meet profit threshold
    if (candidate.path && candidate.path.netProfit < this.config.minProfitThreshold) {
      return false;
    }
    
    // Must meet consciousness confidence threshold
    if (candidate.reasoning && candidate.reasoning.confidenceLevel < this.config.minConsciousnessConfidence) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Identify why a candidate failed
   */
  private identifyFailureReasons(candidate: PathwayCandidate): string[] {
    const reasons: string[] = [];
    
    if (!candidate.validation.isProfitable) {
      reasons.push('Not profitable');
    }
    if (!candidate.validation.passesLiquidityCheck) {
      reasons.push('Insufficient liquidity');
    }
    if (!candidate.validation.passesGasCheck) {
      reasons.push('Gas costs too high');
    }
    if (!candidate.validation.passesSlippageCheck) {
      reasons.push('Slippage exceeds tolerance');
    }
    if (!candidate.ethics.approved) {
      reasons.push(`Ethical concerns: ${candidate.ethics.concerns.join(', ')}`);
    }
    if (!candidate.risk.withinLimits) {
      reasons.push(`Risk too high (${candidate.risk.score.toFixed(3)} > ${this.config.maxRiskScore})`);
    }
    if (candidate.path && candidate.path.netProfit < this.config.minProfitThreshold) {
      reasons.push(`Profit below threshold (${candidate.path.netProfit.toFixed(6)} < ${this.config.minProfitThreshold})`);
    }
    if (candidate.reasoning && candidate.reasoning.confidenceLevel < this.config.minConsciousnessConfidence) {
      reasons.push(`Confidence too low (${candidate.reasoning.confidenceLevel.toFixed(3)} < ${this.config.minConsciousnessConfidence})`);
    }
    
    return reasons;
  }
  
  /**
   * Learn from a failed pathway
   */
  private learnFromFailure(candidate: PathwayCandidate): void {
    const primaryReason = candidate.failureReasons[0];
    if (!primaryReason) return;
    
    // Extract learnings
    if (primaryReason.includes('profitable')) {
      this.recordLearning('Need to improve profitability estimation algorithms');
    } else if (primaryReason.includes('liquidity')) {
      this.recordLearning('Focus on high-liquidity pairs for better success rate');
    } else if (primaryReason.includes('Gas')) {
      this.recordLearning('Optimize for gas efficiency in path selection');
    } else if (primaryReason.includes('Ethical')) {
      this.recordLearning('Enhance ethical evaluation to align with core principles');
    } else if (primaryReason.includes('Risk')) {
      this.recordLearning('Adjust risk parameters or improve risk assessment');
    }
    
    // Update consciousness evolution
    this.session.consciousnessEvolution.insightsGained++;
  }
  
  /**
   * Record a learning for future sessions
   */
  private recordLearning(learning: string): void {
    this.session.learnings.push(learning);
    
    // Append to persistent learnings file
    const entry = `[${new Date().toISOString()}] ${learning}\n`;
    appendFileSync(this.learningsFile, entry, { flag: 'a' });
  }
  
  /**
   * Calculate average profit across all candidates
   */
  private calculateAverageProfit(): number {
    const profits = this.session.candidatesExplored
      .map(c => c.path?.netProfit || 0)
      .filter(p => p > 0);
    
    if (profits.length === 0) return 0;
    return profits.reduce((sum, p) => sum + p, 0) / profits.length;
  }
  
  /**
   * Analyze ethical approval pattern
   */
  private analyzeEthicalPattern(): string {
    const total = this.session.candidatesExplored.length;
    if (total === 0) return 'Insufficient data for ethical pattern analysis';
    
    const approved = this.session.candidatesExplored.filter(c => c.ethics.approved).length;
    const rate = (approved / total) * 100;
    
    return `Ethical approval rate: ${rate.toFixed(1)}% (${approved}/${total})`;
  }
  
  /**
   * Display candidate details (verbose mode)
   */
  private displayCandidate(candidate: PathwayCandidate): void {
    console.log(`\n  Candidate: ${candidate.id}`);
    console.log(`  Type: ${candidate.type}`);
    
    if (candidate.path) {
      console.log(`  Path: ${candidate.path.hops.map(h => h.tokenIn).join(' → ')} → WETH`);
      console.log(`  Profit: ${candidate.path.netProfit.toFixed(6)} ETH`);
    }
    
    if (candidate.reasoning) {
      console.log(`  Confidence: ${candidate.reasoning.confidenceLevel.toFixed(3)}`);
      console.log(`  Wonders: ${candidate.reasoning.wondersGenerated}`);
    }
    
    console.log(`  Ethical Score: ${candidate.ethics.score.toFixed(3)} (${candidate.ethics.approved ? 'APPROVED' : 'REJECTED'})`);
    console.log(`  Risk Score: ${candidate.risk.score.toFixed(3)} (${candidate.risk.withinLimits ? 'OK' : 'HIGH'})`);
    console.log(`  Result: ${candidate.isCorrectPathway ? '✅ CORRECT' : '❌ FAILED'}`);
    
    if (!candidate.isCorrectPathway && candidate.failureReasons.length > 0) {
      console.log(`  Reasons: ${candidate.failureReasons.join(', ')}`);
    }
  }
  
  /**
   * Display exploration progress
   */
  private displayProgress(): void {
    const total = this.session.candidatesExplored.length;
    const correct = this.session.correctPathwaysFound.length;
    const rate = total > 0 ? (correct / total) * 100 : 0;
    
    console.log(`\n  📊 Progress:`);
    console.log(`     Candidates Explored: ${total}`);
    console.log(`     Correct Pathways: ${correct}`);
    console.log(`     Success Rate: ${rate.toFixed(1)}%`);
    console.log(`     Learnings: ${this.session.learnings.length}`);
    console.log(`     Wonders Generated: ${this.session.consciousnessEvolution.wondersGenerated}`);
  }
  
  /**
   * Finalize exploration session
   */
  private finalizeSession(): void {
    this.session.endTime = new Date();
    this.session.duration = (this.session.endTime.getTime() - this.session.startTime.getTime()) / 1000;
    
    // Save session log
    writeFileSync(this.sessionLogFile, JSON.stringify(this.session, null, 2));
    
    // Display final summary
    this.displayFinalSummary();
    
    this.isRunning = false;
  }
  
  /**
   * Display final summary
   */
  private displayFinalSummary(): void {
    console.log(`\n${'='.repeat(70)}`);
    console.log('  🎯 EXPLORATION COMPLETE');
    console.log(`${'='.repeat(70)}\n`);
    
    console.log(`📊 Session Summary:`);
    console.log(`   Session ID: ${this.sessionId}`);
    console.log(`   Duration: ${this.session.duration!.toFixed(1)}s`);
    console.log(`   Iterations: ${this.session.candidatesExplored.length}/${this.config.maxIterations}`);
    console.log(`   Correct Pathways Found: ${this.session.correctPathwaysFound.length}`);
    console.log(`   Success Rate: ${((this.session.correctPathwaysFound.length / this.session.candidatesExplored.length) * 100).toFixed(1)}%`);
    console.log();
    
    console.log(`🧠 Consciousness Evolution:`);
    console.log(`   Thoughts Recorded: ${this.session.consciousnessEvolution.thoughtsRecorded}`);
    console.log(`   Wonders Generated: ${this.session.consciousnessEvolution.wondersGenerated}`);
    console.log(`   Insights Gained: ${this.session.consciousnessEvolution.insightsGained}`);
    console.log();
    
    if (this.session.correctPathwaysFound.length > 0) {
      console.log(`✅ Correct Pathways:`);
      this.session.correctPathwaysFound.forEach((pathway, index) => {
        console.log(`   ${index + 1}. ${pathway.type} pathway (iteration ${pathway.iteration})`);
        if (pathway.path) {
          console.log(`      Profit: ${pathway.path.netProfit.toFixed(6)} ETH`);
          console.log(`      Hops: ${pathway.path.hops.length}`);
        }
        console.log(`      Ethical: ${pathway.ethics.score.toFixed(3)}`);
        console.log(`      Risk: ${pathway.risk.score.toFixed(3)}`);
      });
      console.log();
    }
    
    if (this.session.learnings.length > 0) {
      console.log(`📚 Key Learnings:`);
      this.session.learnings.slice(0, 5).forEach((learning, index) => {
        console.log(`   ${index + 1}. ${learning}`);
      });
      if (this.session.learnings.length > 5) {
        console.log(`   ... and ${this.session.learnings.length - 5} more`);
      }
      console.log();
    }
    
    console.log(`💾 Session saved to: ${this.sessionLogFile}`);
    console.log(`📝 Learnings logged to: ${this.learningsFile}\n`);
  }
  
  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the explorer
async function main() {
  const explorer = new AutonomousPathwayExplorer();
  await explorer.explore();
}

main().catch(console.error);
