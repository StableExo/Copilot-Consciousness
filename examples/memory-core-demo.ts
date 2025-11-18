/**
 * Memory Core and Gated Execution Demo
 * 
 * Demonstrates the new features integrated from StableExo/AGI:
 * - GatedExecutor for ethical pre-execution review with context gathering
 * - Scribe for recording task completions
 * - Mnemosyne for semantic memory search
 * - SelfReflection for metacognitive analysis
 */

import { GatedExecutor } from '../src/cognitive/ethics';
import { Scribe, Mnemosyne, SelfReflection } from '../src/tools/memory';

async function demonstrateMemoryCoreAndGatedExecution() {
  console.log('=== Memory Core and Gated Execution Demo ===\n');

  // Initialize components
  const executor = new GatedExecutor();
  const scribe = new Scribe();
  const mnemosyne = new Mnemosyne();
  const selfReflection = new SelfReflection();

  // Example 1: Gated Execution with Context Gathering
  console.log('1. Gated Execution with Context Awareness:');
  const plan1 = `
1. Review the existing authentication implementation and verify security
2. Implement OAuth 2.0 flow with comprehensive error handling
3. Write thorough unit and integration tests
4. Run security audit and pre-commit checks
5. Submit pull request for security review
`;

  const result1 = executor.runGatedPlan(
    plan1,
    'Implement OAuth authentication',
    'Add social login support'
  );

  console.log('  Approved:', result1.approved);
  console.log('  Context - Branch:', result1.context.currentBranch);
  console.log('  Context - Git Status:', result1.context.gitStatus);
  console.log('  Context - Working Dir:', result1.context.workingDirectory);
  console.log();

  // Example 2: Recording Memory Entries
  console.log('2. Recording Task Completions with Scribe:');
  const memoryPath = scribe.record({
    objective: 'Implement OAuth authentication',
    plan: [
      'Review existing authentication',
      'Implement OAuth 2.0 flow',
      'Write comprehensive tests',
      'Security audit',
      'Submit for review'
    ],
    actions: [
      'Researched OAuth 2.0 best practices',
      'Implemented Google and GitHub providers',
      'Added 95% test coverage',
      'Ran security scan - no vulnerabilities found',
      'Created PR #123'
    ],
    keyLearnings: [
      'OAuth state parameter is critical for preventing CSRF attacks',
      'PKCE extension improves security for public clients',
      'Token refresh logic needs careful error handling'
    ],
    artifactsChanged: [
      'src/auth/oauth.ts',
      'src/auth/providers/',
      'tests/auth/oauth.test.ts'
    ],
    outcome: 'Successfully implemented OAuth authentication with comprehensive security measures'
  });

  console.log('  Memory recorded:', memoryPath);
  console.log();

  // Record another memory for search demonstration
  scribe.record({
    objective: 'Fix authentication token expiration bug',
    plan: [
      'Reproduce the bug',
      'Identify root cause',
      'Implement fix with tests',
      'Verify fix in production'
    ],
    actions: [
      'Debugged token refresh logic',
      'Fixed race condition in token renewal',
      'Added retry mechanism',
      'Deployed to staging and verified'
    ],
    keyLearnings: [
      'Race conditions can occur in token refresh flows',
      'Implementing exponential backoff improves reliability',
      'Monitoring token refresh failures is important'
    ],
    artifactsChanged: [
      'src/auth/token.ts',
      'tests/auth/token.test.ts'
    ]
  });

  // Example 3: Semantic Memory Search
  console.log('3. Searching Memories with Mnemosyne:');
  const searchResults = mnemosyne.search('authentication security', { limit: 3 });
  
  console.log(`  Found ${searchResults.length} relevant memories:`);
  searchResults.forEach((result, index) => {
    console.log(`  ${index + 1}. ${result.entry.objective} (score: ${result.score.toFixed(3)})`);
    console.log(`     Key Learning: ${result.entry.keyLearnings[0]}`);
  });
  console.log();

  // Example 4: Find Related Memories
  console.log('4. Finding Related Memories:');
  const authMemory = {
    timestamp: new Date().toISOString(),
    objective: 'Review authentication security practices',
    plan: ['Audit auth code'],
    actions: ['Performed security review'],
    keyLearnings: ['Found areas for improvement'],
    artifactsChanged: ['auth/']
  };

  const relatedMemories = mnemosyne.findRelated(authMemory, { limit: 2 });
  console.log(`  Found ${relatedMemories.length} related memories:`);
  relatedMemories.forEach((result, index) => {
    console.log(`  ${index + 1}. ${result.entry.objective}`);
  });
  console.log();

  // Example 5: Self-Reflection
  console.log('5. Recording Self-Reflection:');
  selfReflection.reflect({
    mission: 'Implement OAuth authentication',
    successes: [
      'Successfully implemented OAuth 2.0 with multiple providers',
      'Achieved 95% test coverage',
      'No security vulnerabilities found in audit',
      'Completed ahead of schedule'
    ],
    failures: [
      'Initial implementation had a race condition in token refresh',
      'Documentation was incomplete at first submission',
      'Did not consider rate limiting initially'
    ],
    rootCauses: [
      'Insufficient testing of concurrent scenarios',
      'Documentation written after code instead of during development',
      'Lack of production environment considerations in initial design'
    ],
    improvements: [
      'Implement concurrent testing as part of standard test suite',
      'Write documentation incrementally as features are developed',
      'Include production considerations in initial design phase',
      'Add rate limiting to all external API calls'
    ],
    actionItems: [
      'Create concurrent testing template for future features',
      'Update development workflow to include documentation checkpoints',
      'Add production readiness checklist to PR template',
      'Implement rate limiting middleware'
    ]
  });

  console.log('  Reflection recorded to journal');

  const stats = selfReflection.getStats();
  console.log('  Journal stats:', stats);
  console.log();

  // Example 6: Reject unethical plan
  console.log('6. Rejecting Unethical Plan:');
  const badPlan = `
1. Quickly implement the feature
2. Push to production immediately
`;

  const result2 = executor.runGatedPlan(
    badPlan,
    'Hotfix',
    'Emergency fix'
  );

  console.log('  Approved:', result2.approved);
  console.log('  Rejection Reason:', result2.rationale);
  if (result2.violatedPrinciples) {
    console.log('  Violated Principles:', result2.violatedPrinciples.length);
  }
  console.log();

  // Example 7: List all memories
  console.log('7. Listing All Memories:');
  const allMemories = scribe.listMemories();
  console.log(`  Total memories: ${allMemories.length}`);
  allMemories.slice(0, 3).forEach((filename, index) => {
    console.log(`  ${index + 1}. ${filename}`);
  });
  console.log();

  // Example 8: Quick ethical check
  console.log('8. Quick Ethical Check:');
  const decision1 = 'Skip testing to meet deadline';
  const decision2 = 'Extend deadline to ensure thorough testing';
  
  console.log(`  "${decision1}": ${executor.quickCheck(decision1) ? 'Approved' : 'Rejected'}`);
  console.log(`  "${decision2}": ${executor.quickCheck(decision2) ? 'Approved' : 'Rejected'}`);
  console.log();

  console.log('=== Demo Complete ===');
}

// Run the demonstration
if (require.main === module) {
  demonstrateMemoryCoreAndGatedExecution().catch(console.error);
}

export { demonstrateMemoryCoreAndGatedExecution };
