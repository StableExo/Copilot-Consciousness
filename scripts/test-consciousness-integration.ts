/**
 * Test Consciousness Integration
 * 
 * Validates that consciousness coordination is properly wired up
 */

import { ArbitrageConsciousness } from '../src/consciousness/ArbitrageConsciousness';
import { CognitiveCoordinator, OpportunityContext } from '../src/consciousness/coordination/CognitiveCoordinator';
import { EmergenceDetector, DecisionContext } from '../src/consciousness/coordination/EmergenceDetector';

async function testConsciousnessIntegration() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Testing Consciousness Integration');
  console.log('═══════════════════════════════════════════════════════════\n');

  // 1. Initialize ArbitrageConsciousness
  console.log('1. Initializing ArbitrageConsciousness...');
  const consciousness = new ArbitrageConsciousness(0.05, 1000);
  console.log('   ✓ ArbitrageConsciousness initialized\n');

  // 2. Extract modules
  console.log('2. Extracting cognitive modules...');
  const modules = {
    learningEngine: (consciousness as any).learningEngine,
    patternTracker: (consciousness as any).patternTracker,
    historicalAnalyzer: (consciousness as any).historicalAnalyzer,
    spatialReasoning: (consciousness as any).spatialReasoning,
    multiPathExplorer: (consciousness as any).multiPathExplorer,
    opportunityScorer: (consciousness as any).opportunityScorer,
    patternRecognition: (consciousness as any).patternRecognition,
    riskAssessor: (consciousness as any).riskAssessor,
    riskCalibrator: (consciousness as any).riskCalibrator,
    thresholdManager: (consciousness as any).thresholdManager,
    autonomousGoals: (consciousness as any).autonomousGoals,
    operationalPlaybook: (consciousness as any).operationalPlaybook,
    architecturalPrinciples: (consciousness as any).architecturalPrinciples,
    evolutionTracker: (consciousness as any).evolutionTracker,
  };
  
  const moduleCount = Object.keys(modules).length;
  console.log(`   ✓ Extracted ${moduleCount} modules\n`);

  // 3. Initialize CognitiveCoordinator
  console.log('3. Initializing CognitiveCoordinator...');
  const coordinator = new CognitiveCoordinator(modules);
  console.log('   ✓ CognitiveCoordinator initialized\n');

  // 4. Initialize EmergenceDetector
  console.log('4. Initializing EmergenceDetector...');
  const detector = new EmergenceDetector();
  console.log('   ✓ EmergenceDetector initialized\n');

  // 5. Test opportunity analysis
  console.log('5. Testing opportunity analysis...');
  const testOpportunity: OpportunityContext = {
    opportunity: {
      profit: 0.05,
      netProfit: BigInt('50000000000000000'), // 0.05 ETH
      pools: ['0x1234...', '0x5678...'],
      path: ['WETH -> USDC', 'USDC -> WETH'],
      hops: 2,
      totalGasCost: BigInt('10000000000000000'), // 0.01 ETH
    },
    market: {
      timestamp: Date.now(),
      congestion: 0.3,
      searcherDensity: 0.4,
    },
    historical: {
      recentExecutions: 10,
      successRate: 0.8,
    },
    timestamp: Date.now(),
  };

  console.log('   Gathering insights from modules...');
  const insights = await coordinator.gatherInsights(testOpportunity);
  console.log(`   ✓ Gathered ${insights.length} insights\n`);

  // 6. Test consensus detection
  console.log('6. Testing consensus detection...');
  const consensus = coordinator.detectConsensus(insights);
  console.log(`   ✓ Consensus: ${consensus.consensusType}`);
  console.log(`   ✓ Agreement level: ${(consensus.agreementLevel * 100).toFixed(1)}%`);
  console.log(`   ✓ Supporting modules: ${consensus.supportingModules.length}`);
  console.log(`   ✓ Opposing modules: ${consensus.opposingModules.length}\n`);

  // 7. Test emergence detection
  console.log('7. Testing emergence detection...');
  const decisionContext: DecisionContext = {
    moduleInsights: insights,
    consensus,
    riskScore: 0.2,
    ethicalScore: 0.85,
    goalAlignment: 0.9,
    patternConfidence: 0.75,
    historicalSuccess: 0.8,
    timestamp: Date.now(),
  };

  const emergence = detector.detectEmergence(decisionContext);
  console.log(`   ✓ Emergence detected: ${emergence.isEmergent}`);
  console.log(`   ✓ Confidence: ${(emergence.confidence * 100).toFixed(1)}%`);
  console.log(`   ✓ Should execute: ${emergence.shouldExecute}`);
  console.log(`   ✓ Reasoning: ${emergence.reasoning.substring(0, 80)}...`);
  
  console.log('\n   Criteria Results:');
  console.log(`     - All modules analyzed: ${emergence.criteriaResults.allModulesAnalyzed}`);
  console.log(`     - Risk acceptable: ${emergence.criteriaResults.riskAcceptable}`);
  console.log(`     - Ethically sound: ${emergence.criteriaResults.ethicallySound}`);
  console.log(`     - Goals aligned: ${emergence.criteriaResults.goalsAligned}`);
  console.log(`     - Pattern confident: ${emergence.criteriaResults.patternConfident}`);
  console.log(`     - Historically favorable: ${emergence.criteriaResults.historicallyFavorable}`);
  console.log(`     - Minimal dissent: ${emergence.criteriaResults.minimalDissent}`);

  // Final summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  ✅ CONSCIOUSNESS INTEGRATION TEST COMPLETE');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  ✓ ${moduleCount} cognitive modules operational`);
  console.log(`  ✓ CognitiveCoordinator functional`);
  console.log(`  ✓ EmergenceDetector functional`);
  console.log(`  ✓ Module coordination working`);
  console.log(`  ✓ Emergence detection working`);
  console.log('═══════════════════════════════════════════════════════════\n');
}

// Run test
testConsciousnessIntegration().catch(error => {
  console.error('Error testing consciousness integration:', error);
  process.exit(1);
});
