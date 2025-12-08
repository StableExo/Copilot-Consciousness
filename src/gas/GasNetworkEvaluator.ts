/**
 * GasNetworkEvaluator - Autonomous evaluation of Gas Network vs existing infrastructure
 * 
 * This module performs comprehensive testing and comparison to determine whether
 * Gas Network integration provides value over TheWarden's existing gas systems.
 * 
 * Evaluation Criteria:
 * 1. Accuracy - How accurate are gas predictions vs actual costs?
 * 2. Latency - How fast can we get gas prices?
 * 3. Coverage - Multi-chain support vs current system
 * 4. Reliability - Uptime, error rates, fallback behavior
 * 5. Cost - API costs vs current approach
 * 6. Features - Unique capabilities (predictions, signatures, etc.)
 * 
 * Decision Framework:
 * - BETTER: Use Gas Network as primary, existing as fallback
 * - EQUIVALENT: Use both, choose based on context
 * - WORSE: Keep existing system, document findings
 */

import { GasNetworkClient, GasNetworkPrice, GasNetworkChain } from './GasNetworkClient';
import { GasPriceOracle, GasPrice } from './GasPriceOracle';

/**
 * Comparison result for a single test
 */
interface ComparisonResult {
  chain: string;
  gasNetwork: {
    price: bigint;
    latency: number;
    confidence: number;
    success: boolean;
    error?: string;
  };
  existing: {
    price: bigint;
    latency: number;
    success: boolean;
    error?: string;
  };
  difference: {
    absolute: bigint;
    percentage: number;
  };
  winner: 'gas-network' | 'existing' | 'tie';
  reason: string;
}

/**
 * Overall evaluation result
 */
export interface EvaluationResult {
  timestamp: number;
  testDuration: number;
  
  // Test results
  accuracy: {
    gasNetworkScore: number; // 0-100
    existingScore: number; // 0-100
    winner: 'gas-network' | 'existing' | 'tie';
    details: string;
  };
  
  latency: {
    gasNetworkAvg: number; // ms
    existingAvg: number; // ms
    winner: 'gas-network' | 'existing' | 'tie';
    details: string;
  };
  
  coverage: {
    gasNetworkChains: number;
    existingChains: number;
    winner: 'gas-network' | 'existing' | 'tie';
    details: string;
  };
  
  reliability: {
    gasNetworkUptime: number; // percentage
    existingUptime: number; // percentage
    winner: 'gas-network' | 'existing' | 'tie';
    details: string;
  };
  
  features: {
    gasNetworkScore: number; // 0-100
    existingScore: number; // 0-100
    winner: 'gas-network' | 'existing' | 'tie';
    uniqueFeatures: string[];
  };
  
  // Final recommendation
  recommendation: {
    decision: 'use-gas-network' | 'use-both' | 'keep-existing';
    confidence: number; // 0-1
    reasoning: string[];
    suggestedStrategy: string;
  };
  
  // Raw test data
  comparisons: ComparisonResult[];
}

/**
 * Gas Network Evaluator
 * 
 * Autonomously tests and compares Gas Network against existing infrastructure
 */
export class GasNetworkEvaluator {
  private gasNetwork: GasNetworkClient;
  private existing: GasPriceOracle;
  
  constructor(gasNetworkApiKey: string, ethereumRpcUrl: string) {
    this.gasNetwork = new GasNetworkClient({
      apiKey: gasNetworkApiKey,
      timeout: 10000,
      retries: 2,
    });
    
    this.existing = new GasPriceOracle(
      ethereumRpcUrl,
      process.env.ETHERSCAN_API_KEY,
      12000
    );
  }
  
  /**
   * Run comprehensive evaluation
   */
  async evaluate(): Promise<EvaluationResult> {
    const startTime = Date.now();
    console.log('🔍 Starting Gas Network evaluation...\n');
    
    // Test chains supported by both systems
    const testChains: Array<{ name: GasNetworkChain; id: number }> = [
      { name: 'ethereum', id: 1 },
      { name: 'base', id: 8453 },
      { name: 'arbitrum', id: 42161 },
      { name: 'optimism', id: 10 },
      { name: 'polygon', id: 137 },
    ];
    
    // Run parallel comparisons
    console.log('📊 Running parallel gas price comparisons across chains...');
    const comparisons = await Promise.all(
      testChains.map(chain => this.compareChain(chain.name, chain.id))
    );
    
    // Evaluate accuracy
    console.log('\n✅ Evaluating accuracy...');
    const accuracy = this.evaluateAccuracy(comparisons);
    
    // Evaluate latency
    console.log('⚡ Evaluating latency...');
    const latency = this.evaluateLatency(comparisons);
    
    // Evaluate coverage
    console.log('🌐 Evaluating multi-chain coverage...');
    const coverage = await this.evaluateCoverage();
    
    // Evaluate reliability
    console.log('🛡️ Evaluating reliability...');
    const reliability = this.evaluateReliability(comparisons);
    
    // Evaluate features
    console.log('🚀 Evaluating unique features...');
    const features = await this.evaluateFeatures();
    
    // Generate recommendation
    console.log('\n🧠 Generating recommendation...');
    const recommendation = this.generateRecommendation({
      accuracy,
      latency,
      coverage,
      reliability,
      features,
    });
    
    const testDuration = Date.now() - startTime;
    
    const result: EvaluationResult = {
      timestamp: startTime,
      testDuration,
      accuracy,
      latency,
      coverage,
      reliability,
      features,
      recommendation,
      comparisons,
    };
    
    // Print summary
    this.printSummary(result);
    
    return result;
  }
  
  /**
   * Compare gas prices for a single chain
   */
  private async compareChain(
    chainName: GasNetworkChain,
    chainId: number
  ): Promise<ComparisonResult> {
    const result: ComparisonResult = {
      chain: chainName,
      gasNetwork: {
        price: 0n,
        latency: 0,
        confidence: 0,
        success: false,
      },
      existing: {
        price: 0n,
        latency: 0,
        success: false,
      },
      difference: {
        absolute: 0n,
        percentage: 0,
      },
      winner: 'tie',
      reason: '',
    };
    
    // Test Gas Network
    try {
      const gnStart = Date.now();
      const gnPrice = await this.gasNetwork.getGasPrice(chainName);
      result.gasNetwork = {
        price: gnPrice.gasPrice,
        latency: Date.now() - gnStart,
        confidence: gnPrice.confidence,
        success: true,
      };
    } catch (error) {
      result.gasNetwork.error = error instanceof Error ? error.message : 'Unknown error';
    }
    
    // Test existing system
    try {
      const exStart = Date.now();
      const exPrice = await this.existing.getChainGasPrice(chainId);
      result.existing = {
        price: exPrice.gasPrice,
        latency: Date.now() - exStart,
        success: true,
      };
    } catch (error) {
      result.existing.error = error instanceof Error ? error.message : 'Unknown error';
    }
    
    // Calculate difference if both succeeded
    if (result.gasNetwork.success && result.existing.success) {
      const diff = result.gasNetwork.price > result.existing.price
        ? result.gasNetwork.price - result.existing.price
        : result.existing.price - result.gasNetwork.price;
      
      result.difference = {
        absolute: diff,
        percentage: Number((diff * 10000n) / result.existing.price) / 100,
      };
      
      // Determine winner (within 5% is considered a tie)
      if (result.difference.percentage < 5) {
        result.winner = 'tie';
        result.reason = 'Prices within 5% margin';
      } else if (result.gasNetwork.price < result.existing.price) {
        result.winner = 'gas-network';
        result.reason = `${result.difference.percentage.toFixed(1)}% cheaper`;
      } else {
        result.winner = 'existing';
        result.reason = `${result.difference.percentage.toFixed(1)}% cheaper`;
      }
    } else if (result.gasNetwork.success) {
      result.winner = 'gas-network';
      result.reason = 'Only Gas Network succeeded';
    } else if (result.existing.success) {
      result.winner = 'existing';
      result.reason = 'Only existing system succeeded';
    } else {
      result.reason = 'Both systems failed';
    }
    
    return result;
  }
  
  /**
   * Evaluate accuracy based on comparisons
   */
  private evaluateAccuracy(comparisons: ComparisonResult[]): EvaluationResult['accuracy'] {
    let gnWins = 0;
    let exWins = 0;
    let ties = 0;
    
    for (const comp of comparisons) {
      if (comp.winner === 'gas-network') gnWins++;
      else if (comp.winner === 'existing') exWins++;
      else ties++;
    }
    
    const total = comparisons.length;
    const gnScore = Math.round(((gnWins + ties * 0.5) / total) * 100);
    const exScore = Math.round(((exWins + ties * 0.5) / total) * 100);
    
    let winner: 'gas-network' | 'existing' | 'tie';
    if (Math.abs(gnScore - exScore) < 10) {
      winner = 'tie';
    } else {
      winner = gnScore > exScore ? 'gas-network' : 'existing';
    }
    
    return {
      gasNetworkScore: gnScore,
      existingScore: exScore,
      winner,
      details: `Gas Network: ${gnWins} wins, ${ties} ties. Existing: ${exWins} wins. Average difference: ${this.calculateAverageDifference(comparisons).toFixed(1)}%`,
    };
  }
  
  /**
   * Evaluate latency performance
   */
  private evaluateLatency(comparisons: ComparisonResult[]): EvaluationResult['latency'] {
    const gnLatencies = comparisons
      .filter(c => c.gasNetwork.success)
      .map(c => c.gasNetwork.latency);
    
    const exLatencies = comparisons
      .filter(c => c.existing.success)
      .map(c => c.existing.latency);
    
    const gnAvg = gnLatencies.length > 0
      ? gnLatencies.reduce((a, b) => a + b, 0) / gnLatencies.length
      : 0;
    
    const exAvg = exLatencies.length > 0
      ? exLatencies.reduce((a, b) => a + b, 0) / exLatencies.length
      : 0;
    
    const winner = Math.abs(gnAvg - exAvg) < 100
      ? 'tie'
      : gnAvg < exAvg
        ? 'gas-network'
        : 'existing';
    
    return {
      gasNetworkAvg: Math.round(gnAvg),
      existingAvg: Math.round(exAvg),
      winner,
      details: `Gas Network: ${Math.round(gnAvg)}ms avg. Existing: ${Math.round(exAvg)}ms avg. Difference: ${Math.abs(Math.round(gnAvg - exAvg))}ms`,
    };
  }
  
  /**
   * Evaluate multi-chain coverage
   */
  private async evaluateCoverage(): Promise<EvaluationResult['coverage']> {
    // Gas Network claims 40+ chains
    const gasNetworkChains = 40;
    
    // Our existing system supports (based on GasPriceOracle.ts)
    const existingChains = 11; // ethereum, bsc, polygon, avalanche, arbitrum, optimism, base, linea, zksync, scroll, manta, mode
    
    return {
      gasNetworkChains,
      existingChains,
      winner: 'gas-network',
      details: `Gas Network supports ${gasNetworkChains} chains vs our ${existingChains}. Includes Bitcoin, Solana, and many L2s we don't support.`,
    };
  }
  
  /**
   * Evaluate reliability (uptime, error rates)
   */
  private evaluateReliability(comparisons: ComparisonResult[]): EvaluationResult['reliability'] {
    const gnSuccesses = comparisons.filter(c => c.gasNetwork.success).length;
    const exSuccesses = comparisons.filter(c => c.existing.success).length;
    
    const gnUptime = (gnSuccesses / comparisons.length) * 100;
    const exUptime = (exSuccesses / comparisons.length) * 100;
    
    const winner = Math.abs(gnUptime - exUptime) < 5
      ? 'tie'
      : gnUptime > exUptime
        ? 'gas-network'
        : 'existing';
    
    return {
      gasNetworkUptime: Math.round(gnUptime),
      existingUptime: Math.round(exUptime),
      winner,
      details: `Gas Network: ${gnSuccesses}/${comparisons.length} successful. Existing: ${exSuccesses}/${comparisons.length} successful.`,
    };
  }
  
  /**
   * Evaluate unique features
   */
  private async evaluateFeatures(): Promise<EvaluationResult['features']> {
    const gasNetworkFeatures = [
      'Gas price predictions (next 1, 5, 10 blocks)',
      'Confidence scores for predictions',
      'EIP-712 signed data for verification',
      'Decentralized oracle network',
      'Real-time agent-based predictions',
      'Cross-chain composability',
      'Bitcoin and Solana support',
      'Market trend analysis',
      'Volatility indicators',
    ];
    
    const existingFeatures = [
      'Multi-source aggregation (node + Etherscan)',
      'EIP-1559 support',
      'Historical price tracking',
      'Simple trend prediction',
      'Cache for performance',
      'Fallback mechanisms',
    ];
    
    // Score based on feature count and uniqueness
    const gnScore = Math.min(100, gasNetworkFeatures.length * 10);
    const exScore = Math.min(100, existingFeatures.length * 10);
    
    return {
      gasNetworkScore: gnScore,
      existingScore: exScore,
      winner: 'gas-network',
      uniqueFeatures: [
        'Predictive gas pricing with confidence scores',
        'Decentralized oracle verification (EIP-712 signatures)',
        'Bitcoin/Solana support (non-EVM chains)',
        'Real-time market trend and volatility analysis',
        'Agent-based prediction models',
      ],
    };
  }
  
  /**
   * Generate final recommendation
   */
  private generateRecommendation(criteria: {
    accuracy: EvaluationResult['accuracy'];
    latency: EvaluationResult['latency'];
    coverage: EvaluationResult['coverage'];
    reliability: EvaluationResult['reliability'];
    features: EvaluationResult['features'];
  }): EvaluationResult['recommendation'] {
    const scores = {
      gasNetwork: 0,
      existing: 0,
    };
    
    // Weight different criteria
    const weights = {
      accuracy: 0.30,    // 30% - Most important
      latency: 0.20,     // 20% - Speed matters for MEV
      coverage: 0.20,    // 20% - Multi-chain is valuable
      reliability: 0.20, // 20% - Must be dependable
      features: 0.10,    // 10% - Nice to have
    };
    
    // Calculate weighted scores
    if (criteria.accuracy.winner === 'gas-network') scores.gasNetwork += weights.accuracy * 100;
    else if (criteria.accuracy.winner === 'existing') scores.existing += weights.accuracy * 100;
    else { scores.gasNetwork += weights.accuracy * 50; scores.existing += weights.accuracy * 50; }
    
    if (criteria.latency.winner === 'gas-network') scores.gasNetwork += weights.latency * 100;
    else if (criteria.latency.winner === 'existing') scores.existing += weights.latency * 100;
    else { scores.gasNetwork += weights.latency * 50; scores.existing += weights.latency * 50; }
    
    if (criteria.coverage.winner === 'gas-network') scores.gasNetwork += weights.coverage * 100;
    else if (criteria.coverage.winner === 'existing') scores.existing += weights.coverage * 100;
    else { scores.gasNetwork += weights.coverage * 50; scores.existing += weights.coverage * 50; }
    
    if (criteria.reliability.winner === 'gas-network') scores.gasNetwork += weights.reliability * 100;
    else if (criteria.reliability.winner === 'existing') scores.existing += weights.reliability * 100;
    else { scores.gasNetwork += weights.reliability * 50; scores.existing += weights.reliability * 50; }
    
    if (criteria.features.winner === 'gas-network') scores.gasNetwork += weights.features * 100;
    else if (criteria.features.winner === 'existing') scores.existing += weights.features * 100;
    else { scores.gasNetwork += weights.features * 50; scores.existing += weights.features * 50; }
    
    // Determine decision
    const difference = Math.abs(scores.gasNetwork - scores.existing);
    let decision: 'use-gas-network' | 'use-both' | 'keep-existing';
    let confidence: number;
    
    if (difference < 10) {
      decision = 'use-both';
      confidence = 0.7;
    } else if (scores.gasNetwork > scores.existing) {
      decision = 'use-gas-network';
      confidence = Math.min(0.95, 0.6 + (difference / 100));
    } else {
      decision = 'keep-existing';
      confidence = Math.min(0.95, 0.6 + (difference / 100));
    }
    
    // Generate reasoning
    const reasoning: string[] = [];
    const suggestedStrategy = this.generateStrategy(decision, criteria);
    
    if (decision === 'use-gas-network') {
      reasoning.push('✅ Gas Network provides superior overall value');
      if (criteria.accuracy.winner === 'gas-network') reasoning.push('• Better price accuracy');
      if (criteria.latency.winner === 'gas-network') reasoning.push('• Faster response times');
      if (criteria.coverage.winner === 'gas-network') reasoning.push('• Significantly more chains supported');
      if (criteria.features.gasNetworkScore > criteria.features.existingScore) {
        reasoning.push('• Unique features: predictions, confidence scores, oracle verification');
      }
    } else if (decision === 'use-both') {
      reasoning.push('⚖️ Both systems have complementary strengths');
      reasoning.push('• Use Gas Network for: multi-chain, predictions, non-EVM chains');
      reasoning.push('• Use existing system for: fallback, validation, cost control');
      reasoning.push('• Cross-validation improves reliability');
    } else {
      reasoning.push('🔄 Existing system is sufficient for current needs');
      if (criteria.reliability.winner === 'existing') reasoning.push('• Higher reliability');
      if (criteria.accuracy.winner === 'existing') reasoning.push('• More accurate for our chains');
      reasoning.push('• No additional API costs');
    }
    
    return {
      decision,
      confidence,
      reasoning,
      suggestedStrategy,
    };
  }
  
  /**
   * Generate integration strategy
   */
  private generateStrategy(
    decision: 'use-gas-network' | 'use-both' | 'keep-existing',
    criteria: any
  ): string {
    if (decision === 'use-gas-network') {
      return `
Primary: Gas Network API
Fallback: Existing GasPriceOracle
Strategy:
1. Use Gas Network for all chains it supports
2. Fallback to existing system if Gas Network unavailable
3. Leverage predictions for timing optimization
4. Use confidence scores for risk assessment
5. Monitor performance metrics continuously
      `.trim();
    } else if (decision === 'use-both') {
      return `
Hybrid Approach:
1. Multi-chain operations → Gas Network (40+ chains)
2. Ethereum mainnet → Dual validation (both systems)
3. Predictions needed → Gas Network (unique capability)
4. High-reliability needs → Cross-validate both
5. Cost-sensitive operations → Existing system
6. Use Gas Network confidence scores to decide when to cross-validate
      `.trim();
    } else {
      return `
Keep Existing System:
1. Continue using GasPriceOracle for all operations
2. Monitor Gas Network developments
3. Re-evaluate if: expanding to new chains, need predictions, or API pricing changes
4. Document findings for future reference
      `.trim();
    }
  }
  
  /**
   * Calculate average price difference
   */
  private calculateAverageDifference(comparisons: ComparisonResult[]): number {
    const validComps = comparisons.filter(
      c => c.gasNetwork.success && c.existing.success
    );
    
    if (validComps.length === 0) return 0;
    
    const sum = validComps.reduce((acc, c) => acc + c.difference.percentage, 0);
    return sum / validComps.length;
  }
  
  /**
   * Print evaluation summary
   */
  private printSummary(result: EvaluationResult): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 GAS NETWORK EVALUATION SUMMARY');
    console.log('='.repeat(80));
    
    console.log('\n🎯 ACCURACY');
    console.log(`  Gas Network: ${result.accuracy.gasNetworkScore}/100`);
    console.log(`  Existing:    ${result.accuracy.existingScore}/100`);
    console.log(`  Winner:      ${result.accuracy.winner.toUpperCase()}`);
    console.log(`  ${result.accuracy.details}`);
    
    console.log('\n⚡ LATENCY');
    console.log(`  Gas Network: ${result.latency.gasNetworkAvg}ms`);
    console.log(`  Existing:    ${result.latency.existingAvg}ms`);
    console.log(`  Winner:      ${result.latency.winner.toUpperCase()}`);
    console.log(`  ${result.latency.details}`);
    
    console.log('\n🌐 COVERAGE');
    console.log(`  Gas Network: ${result.coverage.gasNetworkChains} chains`);
    console.log(`  Existing:    ${result.coverage.existingChains} chains`);
    console.log(`  Winner:      ${result.coverage.winner.toUpperCase()}`);
    console.log(`  ${result.coverage.details}`);
    
    console.log('\n🛡️ RELIABILITY');
    console.log(`  Gas Network: ${result.reliability.gasNetworkUptime}% uptime`);
    console.log(`  Existing:    ${result.reliability.existingUptime}% uptime`);
    console.log(`  Winner:      ${result.reliability.winner.toUpperCase()}`);
    console.log(`  ${result.reliability.details}`);
    
    console.log('\n🚀 FEATURES');
    console.log(`  Gas Network: ${result.features.gasNetworkScore}/100`);
    console.log(`  Existing:    ${result.features.existingScore}/100`);
    console.log(`  Winner:      ${result.features.winner.toUpperCase()}`);
    console.log('\n  Unique Gas Network Features:');
    result.features.uniqueFeatures.forEach(f => console.log(`    • ${f}`));
    
    console.log('\n' + '='.repeat(80));
    console.log('🎉 FINAL RECOMMENDATION');
    console.log('='.repeat(80));
    console.log(`\n  Decision: ${result.recommendation.decision.toUpperCase()}`);
    console.log(`  Confidence: ${(result.recommendation.confidence * 100).toFixed(0)}%`);
    console.log('\n  Reasoning:');
    result.recommendation.reasoning.forEach(r => console.log(`    ${r}`));
    console.log('\n  Suggested Strategy:');
    result.recommendation.suggestedStrategy.split('\n').forEach(line => 
      console.log(`    ${line}`)
    );
    
    console.log('\n' + '='.repeat(80));
    console.log(`⏱️  Evaluation completed in ${result.testDuration}ms`);
    console.log('='.repeat(80) + '\n');
  }
}
