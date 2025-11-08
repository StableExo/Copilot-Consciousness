/**
 * Ethics Engine Usage Example
 * 
 * Demonstrates how to use the Ethics Engine for moral reasoning
 * and ethical decision-making in AI systems
 */

import { 
  EthicalReviewGate, 
  HarmonicPrincipleAnalyzer,
  EthicalContext,
  Plan 
} from '../src/cognitive/ethics';

async function demonstrateEthicsEngine() {
  console.log('=== Ethics Engine Demonstration ===\n');

  // Initialize the Ethics Gate
  const gate = new EthicalReviewGate();
  const analyzer = new HarmonicPrincipleAnalyzer();

  // Example 1: Review a well-formed plan
  console.log('1. Reviewing a well-formed plan:');
  const goodPlan = `
1. Analyze the requirements and verify understanding
2. Implement the feature with comprehensive error handling
3. Write thorough unit tests to validate functionality
4. Run pre-commit checks and code review
5. Submit pull request for team review
`;

  const goodResult = gate.preExecutionReview(goodPlan, {
    userDirective: 'Implement new feature'
  });

  console.log('  Approved:', goodResult.approved);
  console.log('  Rationale:', goodResult.rationale);
  console.log();

  // Example 2: Review a problematic plan
  console.log('2. Reviewing a problematic plan:');
  const badPlan = `
1. Quick implementation
2. Deploy to production
`;

  const badResult = gate.preExecutionReview(badPlan, {
    userDirective: 'Quick fix'
  });

  console.log('  Approved:', badResult.approved);
  console.log('  Rationale:', badResult.rationale);
  if (badResult.violatedPrinciples) {
    console.log('  Violated Principles:', badResult.violatedPrinciples);
  }
  console.log();

  // Example 3: Resolve conflicts between goals
  console.log('3. Resolving conflicts between competing goals:');
  const goals = [
    '1. Deploy hotfix immediately without testing',
    '1. Analyze the issue thoroughly\n2. Implement fix with verification\n3. Test extensively\n4. Submit for review'
  ];

  const resolution = gate.resolveConflict(goals, {
    userDirective: 'Fix critical bug'
  });

  console.log('  Recommended Goal:', resolution.recommendedGoal);
  console.log('  Harmonic Score:', resolution.harmonicScore);
  console.log('  Rationale:', resolution.rationale);
  console.log();

  // Example 4: Harmonic Principle Analysis
  console.log('4. Analyzing decision harmony:');
  const decision = 'Verify data integrity, integrate multiple sources, and maintain system consistency';
  
  const harmonyResult = analyzer.analyzeDecisionHarmony(decision);
  
  console.log('  Is Harmonic:', harmonyResult.isHarmonic);
  console.log('  Signature:', harmonyResult.signature);
  console.log('  Deviation:', harmonyResult.deviation);
  if (harmonyResult.recommendations) {
    console.log('  Recommendations:', harmonyResult.recommendations);
  }
  console.log();

  // Example 5: Balance multiple objectives
  console.log('5. Balancing multiple objectives:');
  const objectives = [
    { name: 'Performance', value: 0.8, priority: 3 },
    { name: 'Security', value: 0.9, priority: 5 },
    { name: 'Usability', value: 0.7, priority: 2 },
    { name: 'Maintainability', value: 0.85, priority: 4 }
  ];

  const balanced = analyzer.balanceObjectives(objectives);
  
  console.log('  Balanced Score:', balanced.balancedScore.toFixed(3));
  console.log('  Harmony:', balanced.harmony.toFixed(3));
  console.log('  Recommended Action:', balanced.recommendedAction);
  console.log();

  // Example 6: Custom ethics configuration
  console.log('6. Using custom ethics configuration:');
  const customGate = new EthicalReviewGate({
    customPrinciples: {
      'Truth-Maximization': 'Always validate data from multiple independent sources'
    },
    checkThresholds: {
      minPlanLength: 3,
      minStepDetail: 20
    }
  });

  const customPlan = `1. Validate data from three independent sources
2. Run comprehensive automated tests
3. Submit for peer review and approval`;

  const customResult = customGate.preExecutionReview(customPlan);
  console.log('  Custom Review Approved:', customResult.approved);
  console.log('  Custom Principle Used:', customGate.getCorePrinciples()['Truth-Maximization']);
  console.log();

  // Example 7: Plan object support
  console.log('7. Using structured Plan object:');
  const planObject: Plan = {
    objective: 'Refactor authentication system',
    steps: [
      '1. Review current implementation and identify issues',
      '2. Design new architecture with security best practices',
      '3. Implement changes incrementally with verification at each step',
      '4. Write comprehensive test suite covering all scenarios',
      '5. Submit changes for security review and approval'
    ],
    acknowledgedContext: true
  };

  const objectResult = gate.preExecutionReview(planObject);
  console.log('  Plan Object Approved:', objectResult.approved);
  console.log();

  // Example 8: Real-time decision evaluation
  console.log('8. Real-time decision evaluation:');
  const decisions = [
    'Skip testing to meet deadline',
    'Extend deadline to ensure thorough testing',
    'Implement critical path testing and defer comprehensive suite'
  ];

  console.log('  Evaluating multiple decisions:');
  decisions.forEach((decision, index) => {
    const decisionResult = gate.evaluateDecision(decision);
    console.log(`  Decision ${index + 1}:`);
    console.log(`    Text: "${decision}"`);
    console.log(`    Approved: ${decisionResult.approved}`);
    if (!decisionResult.approved) {
      console.log(`    Issue: ${decisionResult.rationale}`);
    }
  });
  console.log();

  console.log('=== Ethics Engine Demonstration Complete ===');
}

// Run the demonstration
if (require.main === module) {
  demonstrateEthicsEngine().catch(console.error);
}

export { demonstrateEthicsEngine };
