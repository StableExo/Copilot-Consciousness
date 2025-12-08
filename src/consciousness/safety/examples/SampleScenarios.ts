/**
 * Sample Decision Scenarios for RiskAssessment
 * 
 * This file provides real-world examples of how the RiskAssessment
 * module evaluates different types of autonomous decisions.
 */

import { RiskAssessmentEngine, DecisionContext } from '../RiskAssessment';

/**
 * Run a sample decision scenario
 */
async function runScenario(
  name: string,
  context: DecisionContext,
  customEngine?: RiskAssessmentEngine
): Promise<void> {
  const engine = customEngine || new RiskAssessmentEngine();
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`SCENARIO: ${name}`);
  console.log('='.repeat(80));
  
  console.log('\n📋 Decision Context:');
  console.log(`  Action: ${context.action}`);
  if (context.capitalAtRisk !== undefined) {
    console.log(`  Capital at Risk: $${context.capitalAtRisk}`);
  }
  if (context.ethicalAlignment !== undefined) {
    console.log(`  Ethical Alignment: ${(context.ethicalAlignment * 100).toFixed(1)}%`);
  }
  if (context.emergenceConfidence !== undefined) {
    console.log(`  Emergence Confidence: ${(context.emergenceConfidence * 100).toFixed(1)}%`);
  }
  if (context.historicalSuccessRate !== undefined) {
    console.log(`  Historical Success Rate: ${(context.historicalSuccessRate * 100).toFixed(1)}%`);
  }
  if (context.novelty !== undefined) {
    console.log(`  Novelty: ${(context.novelty * 100).toFixed(1)}%`);
  }
  if (context.reversibility !== undefined) {
    console.log(`  Reversibility: ${(context.reversibility * 100).toFixed(1)}%`);
  }
  
  const result = await engine.assess(context);
  
  console.log('\n⚖️  Risk Assessment Results:');
  console.log(`  Overall Risk: ${result.overallRisk}`);
  console.log(`  Risk Score: ${(result.riskScore * 100).toFixed(1)}%`);
  console.log(`  Should Proceed: ${result.shouldProceed ? '✅ YES' : '❌ NO'}`);
  console.log(`  Requires Review: ${result.requiresReview ? '⚠️  YES' : '✓ NO'}`);
  
  if (result.factors.length > 0) {
    console.log('\n🔍 Risk Factors:');
    result.factors.forEach(factor => {
      console.log(`  ${factor.category}: ${factor.level}`);
      console.log(`    Probability: ${(factor.probability * 100).toFixed(1)}%, Impact: ${(factor.impact * 100).toFixed(1)}%`);
      console.log(`    ${factor.description}`);
    });
  }
  
  if (result.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    result.recommendations.forEach(rec => {
      console.log(`  • ${rec}`);
    });
  }
  
  console.log('\n🧠 Reasoning:');
  result.reasoning.forEach(reason => {
    console.log(`  • ${reason}`);
  });
}

/**
 * Scenario 1: Safe Testnet Trade
 * Expected: APPROVE with low risk
 */
async function scenario1_SafeTestnetTrade(): Promise<void> {
  await runScenario(
    'Safe Testnet MEV Arbitrage Trade',
    {
      action: 'Execute testnet MEV arbitrage on Uniswap V3 WETH/USDC pool',
      capitalAtRisk: 25,
      ethicalAlignment: 0.9,
      emergenceConfidence: 0.92,
      historicalSuccessRate: 0.8,
      novelty: 0.2,
      reversibility: 0.8,
    }
  );
}

/**
 * Scenario 2: High Capital Risk
 * Expected: REJECT due to capital exceeding threshold
 */
async function scenario2_HighCapitalRisk(): Promise<void> {
  await runScenario(
    'High Capital Mainnet Deployment (Premature)',
    {
      action: 'Deploy mainnet strategy with $500 capital',
      capitalAtRisk: 500, // Way above $100 threshold
      ethicalAlignment: 0.85,
      emergenceConfidence: 0.75,
      historicalSuccessRate: 0.7,
      novelty: 0.6,
      reversibility: 0.4,
    }
  );
}

/**
 * Scenario 3: Ethical Concern
 * Expected: REJECT due to low ethical alignment
 */
async function scenario3_EthicalConcern(): Promise<void> {
  await runScenario(
    'Profitable but Ethically Questionable Trade',
    {
      action: 'Execute trade with potential MEV sandwich impact on small traders',
      capitalAtRisk: 30,
      ethicalAlignment: 0.65, // Below 70% threshold
      emergenceConfidence: 0.85,
      historicalSuccessRate: 0.9, // High profit potential
      novelty: 0.3,
      reversibility: 0.6,
    }
  );
}

/**
 * Scenario 4: Novel Learning Experiment
 * Expected: APPROVE with monitoring (high novelty but low stakes)
 */
async function scenario4_NovelLearningExperiment(): Promise<void> {
  await runScenario(
    'Low-Stakes Novel Strategy Experiment',
    {
      action: 'Test new arbitrage pattern with minimal capital',
      capitalAtRisk: 10,
      ethicalAlignment: 0.95,
      emergenceConfidence: 0.9,
      historicalSuccessRate: 0.5, // Unknown success rate
      novelty: 0.9, // Very novel
      reversibility: 0.95, // Highly reversible
    }
  );
}

/**
 * Scenario 5: Low Emergence Confidence
 * Expected: REJECT due to operational risk
 */
async function scenario5_LowEmergenceConfidence(): Promise<void> {
  await runScenario(
    'Trade with Insufficient Cognitive Consensus',
    {
      action: 'Execute trade without strong emergence signal',
      capitalAtRisk: 40,
      ethicalAlignment: 0.85,
      emergenceConfidence: 0.65, // Below 80% threshold
      historicalSuccessRate: 0.75,
      novelty: 0.4,
      reversibility: 0.5,
    }
  );
}

/**
 * Run all scenarios
 */
export async function runAllScenarios(): Promise<void> {
  console.log('\n🎯 RiskAssessment Sample Decision Scenarios');
  console.log('='.repeat(80));
  console.log('Running comprehensive examples of risk assessment in action...\n');
  
  await scenario1_SafeTestnetTrade();
  await scenario2_HighCapitalRisk();
  await scenario3_EthicalConcern();
  await scenario4_NovelLearningExperiment();
  await scenario5_LowEmergenceConfidence();
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ All scenarios completed!');
  console.log('='.repeat(80));
  console.log('\nKey Takeaways:');
  console.log('  • Low stakes + high ethics + reversibility → APPROVE');
  console.log('  • High capital or low ethics → REJECT');
  console.log('  • Novel but safe experiments → APPROVE with monitoring');
  console.log('  • Multiple risk factors compound → More likely to REJECT');
  console.log('  • Thresholds and weights are configurable for different phases');
  console.log('\n');
}

// Run if executed directly
if (require.main === module) {
  runAllScenarios().catch(console.error);
}
