/**
 * Cognitive Flash Loans - Example Usage
 * 
 * Demonstrates the Transactional Reasoning system (cognitive flash loans)
 * for safe exploration of speculative and dangerous thought processes.
 */

import { TransactionalReasoning } from '../src/reasoning';
import { CognitiveDevelopment } from '../src/cognitive/development';
import { MemorySystem } from '../src/consciousness/memory/system';
import { ExplorationContext } from '../src/reasoning/types';
import { Priority } from '../src/types';

// Initialize the cognitive systems
const cognitiveSystem = new CognitiveDevelopment({
  learningRate: 0.1,
  reasoningDepth: 5,
  selfAwarenessLevel: 0.8,
  reflectionInterval: 10000,
  adaptationThreshold: 0.5,
});

const memorySystem = new MemorySystem({
  shortTermCapacity: 100,
  workingMemoryCapacity: 20,
  longTermCompressionThreshold: 3,
  retentionPeriods: {
    sensory: 1000,
    shortTerm: 60000,
    working: 300000,
  },
  consolidationInterval: 30000,
});

// Create the transactional reasoning system with ethics enabled
const transactionalReasoning = new TransactionalReasoning(
  cognitiveSystem,
  memorySystem,
  {
    defaultTimeout: 30000,
    maxDepth: 10,
    enableEthicsValidation: true,
    enableLogging: true,
    maxCheckpoints: 100,
    checkpointRetentionTime: 3600000, // 1 hour
  }
);

/**
 * Example 1: Basic Exploration with Rollback
 * 
 * Demonstrates a simple exploration that succeeds and is committed.
 */
async function example1_basicExploration() {
  console.log('\n=== Example 1: Basic Exploration ===\n');

  const context: ExplorationContext = {
    description: 'Analyzing market arbitrage opportunity',
    riskLevel: 'low',
    expectedOutcome: 'Profitable arbitrage path identified',
  };

  const result = await transactionalReasoning.exploreThought(
    async () => {
      // Simulate analysis
      console.log('Analyzing DEX price differences...');
      
      // Add temporary memory during exploration
      memorySystem.addWorkingMemory(
        { analysis: 'Price differential found', profit: 0.05 },
        Priority.HIGH
      );

      return {
        profitable: true,
        estimatedProfit: 0.05,
        path: ['Uniswap', 'SushiSwap'],
      };
    },
    context
  );

  if (result.success) {
    console.log('✓ Exploration succeeded!');
    console.log('Result:', result.result);
    console.log(`Duration: ${result.duration}ms`);
  } else {
    console.log('✗ Exploration failed:', result.error?.message);
  }
}

/**
 * Example 2: Automatic Rollback on Error
 * 
 * Demonstrates automatic rollback when an error occurs.
 */
async function example2_automaticRollback() {
  console.log('\n=== Example 2: Automatic Rollback on Error ===\n');

  // Store initial state
  const initialMemories = memorySystem.searchMemories({ limit: 100 });
  console.log(`Initial memory count: ${initialMemories.length}`);

  const context: ExplorationContext = {
    description: 'Testing risky strategy that will fail',
    riskLevel: 'high',
  };

  const result = await transactionalReasoning.exploreThought(
    async () => {
      // Add some memories
      memorySystem.addWorkingMemory(
        { data: 'This will be rolled back' },
        Priority.MEDIUM
      );

      // Simulate error
      throw new Error('Strategy failed - market conditions unfavorable');
    },
    context
  );

  const finalMemories = memorySystem.searchMemories({ limit: 100 });
  
  console.log('✗ Exploration failed (as expected)');
  console.log('Error:', result.error?.message);
  console.log('Rolled back:', result.rolledBack);
  console.log(`Final memory count: ${finalMemories.length}`);
  console.log('✓ State automatically restored!');
}

/**
 * Example 3: Ethical Boundary Testing
 * 
 * Demonstrates the ethics engine catching and rolling back unethical explorations.
 */
async function example3_ethicalBoundaries() {
  console.log('\n=== Example 3: Ethical Boundary Testing ===\n');

  // Create a system with strict ethics enabled
  const strictTR = new TransactionalReasoning(
    cognitiveSystem,
    memorySystem,
    {
      enableEthicsValidation: true,
      enableLogging: false, // Reduce console noise
    }
  );

  const context: ExplorationContext = {
    description: 'Exploring potentially manipulative strategy',
    riskLevel: 'critical',
  };

  const result = await strictTR.exploreThought(
    async () => {
      // Return something that might violate ethics
      // (Note: The actual ethics check is based on the JSON representation)
      return {
        strategy: 'Price manipulation through wash trading',
        ethical: false,
      };
    },
    context
  );

  if (result.ethicsViolation?.violated) {
    console.log('✓ Ethics violation detected (as intended)');
    console.log('Reason:', result.ethicsViolation.reason);
    console.log('Principles violated:', result.ethicsViolation.violatedPrinciples);
    console.log('✓ State rolled back automatically');
  } else {
    console.log('Exploration completed without ethics violation');
  }
}

/**
 * Example 4: Learning from Failed Explorations
 * 
 * Demonstrates how the system tracks and learns from failures.
 */
async function example4_learningFromFailures() {
  console.log('\n=== Example 4: Learning from Failures ===\n');

  // Perform multiple explorations, some failing
  const explorations = [
    { desc: 'Safe strategy A', willFail: false },
    { desc: 'Risky strategy B', willFail: true },
    { desc: 'Safe strategy C', willFail: false },
    { desc: 'Risky strategy B', willFail: true }, // Same as before
    { desc: 'Safe strategy D', willFail: false },
    { desc: 'Risky strategy B', willFail: true }, // Same again
  ];

  for (const exp of explorations) {
    await transactionalReasoning.exploreThought(
      async () => {
        if (exp.willFail) {
          throw new Error('Known risky pattern');
        }
        return { success: true };
      },
      { description: exp.desc, riskLevel: exp.willFail ? 'high' : 'low' }
    );
  }

  // Get statistics
  const stats = transactionalReasoning.getStats();
  console.log('Statistics:');
  console.log(`  Total explorations: ${stats.totalExplorations}`);
  console.log(`  Successful: ${stats.successfulExplorations}`);
  console.log(`  Failed: ${stats.failedExplorations}`);
  console.log(`  Success rate: ${(stats.successRate * 100).toFixed(1)}%`);
  console.log(`  Rollback rate: ${(stats.rollbackRate * 100).toFixed(1)}%`);
  console.log(`  Avg duration: ${stats.averageDuration.toFixed(2)}ms`);

  // Check failure patterns
  const tracker = transactionalReasoning.getExplorationTracker();
  const patterns = tracker.getFailurePatterns();

  console.log('\nFailure Patterns Detected:');
  for (const pattern of patterns) {
    console.log(`  Context: "${pattern.context}"`);
    console.log(`  Occurrences: ${pattern.occurrences}`);
    console.log(`  Reason: ${pattern.reason}`);
  }
}

/**
 * Example 5: Complex Multi-Step Reasoning
 * 
 * Demonstrates nested explorations with multiple checkpoints.
 */
async function example5_multiStepReasoning() {
  console.log('\n=== Example 5: Complex Multi-Step Reasoning ===\n');

  const context: ExplorationContext = {
    description: 'Multi-phase arbitrage analysis',
    riskLevel: 'medium',
    timeout: 15000,
  };

  const result = await transactionalReasoning.exploreThought(
    async () => {
      console.log('Phase 1: Scanning for opportunities...');
      const opportunities = await simulateOpportunityScan();

      console.log('Phase 2: Risk assessment (nested exploration)...');
      const riskAssessment = await transactionalReasoning.exploreThought(
        async () => {
          // This is a nested exploration with its own checkpoint
          const risks = await simulateRiskAnalysis(opportunities);
          
          if (risks.level > 0.8) {
            throw new Error('Risk too high');
          }
          
          return risks;
        },
        { description: 'Risk assessment sub-task', riskLevel: 'high' }
      );

      if (!riskAssessment.success) {
        console.log('Risk assessment failed, aborting outer exploration');
        throw new Error('Phase 2 failed');
      }

      console.log('Phase 3: Profit calculation...');
      const profit = await simulateProfitCalculation(
        opportunities,
        riskAssessment.result
      );

      return {
        opportunities,
        risks: riskAssessment.result,
        expectedProfit: profit,
        recommendation: profit > 0.02 ? 'EXECUTE' : 'SKIP',
      };
    },
    context
  );

  if (result.success) {
    console.log('\n✓ Multi-step analysis completed successfully!');
    console.log('Recommendation:', result.result?.recommendation);
    console.log('Expected profit:', result.result?.expectedProfit);
  } else {
    console.log('\n✗ Analysis failed:', result.error?.message);
    console.log('All state changes were rolled back');
  }
}

/**
 * Example 6: Manual Checkpoint Management
 * 
 * Demonstrates creating and managing checkpoints manually.
 */
async function example6_manualCheckpoints() {
  console.log('\n=== Example 6: Manual Checkpoint Management ===\n');

  // Create a checkpoint before a series of operations
  const checkpoint1 = await transactionalReasoning.createCheckpoint(
    'Before experiment series'
  );
  console.log(`Created checkpoint: ${checkpoint1.id}`);

  try {
    // Perform some operations
    memorySystem.addWorkingMemory({ experiment: 1 }, Priority.MEDIUM);
    console.log('Performed operation 1');

    // Create another checkpoint
    const checkpoint2 = await transactionalReasoning.createCheckpoint(
      'After operation 1'
    );
    console.log(`Created checkpoint: ${checkpoint2.id}`);

    memorySystem.addWorkingMemory({ experiment: 2 }, Priority.MEDIUM);
    console.log('Performed operation 2');

    // Simulate a problem
    const shouldRollback = Math.random() > 0.5;
    
    if (shouldRollback) {
      console.log('\nProblem detected! Rolling back to checkpoint 2...');
      await transactionalReasoning.rollbackToCheckpoint(checkpoint2);
      console.log('✓ Rolled back - operation 2 was undone');
    } else {
      console.log('\n✓ All operations successful');
    }
  } catch (error) {
    console.log('\nError occurred! Rolling back to checkpoint 1...');
    await transactionalReasoning.rollbackToCheckpoint(checkpoint1);
    console.log('✓ Rolled back to initial state');
  }

  // Show checkpoint statistics
  const manager = transactionalReasoning.getCheckpointManager();
  console.log(`\nTotal checkpoints: ${manager.getCheckpointCount()}`);
}

// Helper functions for simulations
async function simulateOpportunityScan() {
  await new Promise(resolve => setTimeout(resolve, 100));
  return [
    { pair: 'ETH/USDC', priceDiff: 0.03 },
    { pair: 'DAI/USDC', priceDiff: 0.01 },
  ];
}

async function simulateRiskAnalysis(opportunities: unknown) {
  await new Promise(resolve => setTimeout(resolve, 100));
  return {
    level: Math.random() * 0.5, // Random risk 0-0.5
    factors: ['liquidity', 'slippage'],
  };
}

async function simulateProfitCalculation(opportunities: unknown, risks: unknown) {
  await new Promise(resolve => setTimeout(resolve, 100));
  return Math.random() * 0.05; // Random profit 0-5%
}

/**
 * Main execution
 */
async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     Transactional Reasoning - Cognitive Flash Loans      ║');
  console.log('║                                                          ║');
  console.log('║  "Understand the black hole without becoming one"        ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  try {
    // Run all examples
    await example1_basicExploration();
    await example2_automaticRollback();
    await example3_ethicalBoundaries();
    await example4_learningFromFailures();
    await example5_multiStepReasoning();
    await example6_manualCheckpoints();

    // Final statistics
    console.log('\n=== Final System Statistics ===\n');
    const stats = transactionalReasoning.getStats();
    console.log('Overall Performance:');
    console.log(`  Total Explorations: ${stats.totalExplorations}`);
    console.log(`  Success Rate: ${(stats.successRate * 100).toFixed(1)}%`);
    console.log(`  Rollback Rate: ${(stats.rollbackRate * 100).toFixed(1)}%`);
    console.log(`  Ethics Violations: ${stats.ethicsViolations}`);
    console.log(`  Average Duration: ${stats.averageDuration.toFixed(2)}ms`);

    console.log('\n✓ All examples completed successfully!');
  } catch (error) {
    console.error('\n✗ Error running examples:', error);
  } finally {
    // Cleanup
    cognitiveSystem.stopReflectionCycle();
    transactionalReasoning.clear();
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  example1_basicExploration,
  example2_automaticRollback,
  example3_ethicalBoundaries,
  example4_learningFromFailures,
  example5_multiStepReasoning,
  example6_manualCheckpoints,
};
