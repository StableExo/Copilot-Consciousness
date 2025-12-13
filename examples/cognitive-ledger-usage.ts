/**
 * Cognitive Ledger Example Usage
 * 
 * This example demonstrates how to use the Cognitive Ledger to:
 * 1. Record thoughts and decisions
 * 2. Track expected vs actual outcomes
 * 3. Analyze learning opportunities
 * 4. Detect decision patterns
 * 5. Monitor emotional drift
 */

import { createClient } from '@supabase/supabase-js';
import { CognitiveLedgerService } from '../src/infrastructure/supabase/services/CognitiveLedgerService.js';
import { MemoryType, MemorySource } from '../src/infrastructure/supabase/types/cognitiveLedger.js';

// ============================================================================
// SETUP
// ============================================================================

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);
const cognitiveLedger = new CognitiveLedgerService(supabase);

// ============================================================================
// EXAMPLE 1: Recording a Decision-Making Process
// ============================================================================

async function exampleDecisionMaking() {
  console.log('\n=== Example 1: Decision-Making Process ===\n');

  // Step 1: Record the triggering thought
  const trigger = await cognitiveLedger.createMemoryEntry({
    content: 'User requested: "Continue autonomous development 😎"',
    type: MemoryType.EPISODIC,
    source: MemorySource.USER_INTERACTION,
    importance_score: 0.9,
    emotional_valence: 0.6,
    tags: ['user-request', 'autonomous'],
  });

  console.log('Trigger memory created:', trigger.id);

  // Step 2: Internal deliberation - record thought process
  await cognitiveLedger.createMemoryEntry({
    content:
      'Analyzing options: Fix TypeScript errors (27 errors), Implement CEX monitoring (zero cost), or Write documentation',
    type: MemoryType.EPISODIC,
    source: MemorySource.INTERNAL_MONOLOGUE,
    importance_score: 0.7,
    emotional_valence: 0.2,
    tags: ['deliberation', 'planning'],
  });

  // Step 3: Record the arbitrage decision
  const decision = await cognitiveLedger.createArbitrageEpisode({
    trigger_memory_id: trigger.id,
    options_considered: [
      'Fix TypeScript errors (27 compilation errors blocking production)',
      'Implement CEX monitoring (zero cost, new alpha source, revenue potential)',
      'Write documentation (improves onboarding, clarifies architecture)',
    ],
    winning_option: 'Implement CEX monitoring',
    reasoning_trace:
      'Revenue-first strategy: CEX monitoring has zero cost (free WebSocket APIs), creates new alpha source ($10k-$25k/month potential), and aligns with autonomous revenue generation goal. TypeScript errors are important but not blocking revenue generation. Documentation can follow implementation.',
    expected_reward: 0.9,
    tags: ['strategic-decision', 'revenue-focus', 'autonomous'],
    metadata: {
      analysis_factors: {
        cost: 0,
        revenue_potential: 'high',
        time_to_value: 'short',
        risk: 'low',
      },
    },
  });

  console.log('Decision recorded:', decision.id);
  console.log('Winning option:', decision.winning_option);
  console.log('Expected reward:', decision.expected_reward);

  // Step 4: Implementation (simulated)
  await cognitiveLedger.createMemoryEntry({
    content:
      'Implemented CEX monitoring with Binance, Coinbase, OKX connectors. All 95 tests passing.',
    type: MemoryType.PROCEDURAL,
    source: MemorySource.SYSTEM_EVENT,
    importance_score: 0.95,
    emotional_valence: 0.8,
    tags: ['implementation', 'cex-monitoring', 'success'],
  });

  // Step 5: Outcome evaluation (after time passes)
  setTimeout(async () => {
    await cognitiveLedger.updateArbitrageEpisode(decision.id, {
      actual_outcome_score: 0.95,
      metadata: {
        outcome_notes: 'CEX monitoring implemented successfully, zero cost, production-ready',
      },
    });

    console.log('\nOutcome recorded:');
    console.log('Expected reward: 0.9');
    console.log('Actual outcome: 0.95');
    console.log('Result: Decision was correct, slightly better than expected!');
  }, 1000);
}

// ============================================================================
// EXAMPLE 2: Tracking Learning Over Time
// ============================================================================

async function exampleLearningAnalysis() {
  console.log('\n=== Example 2: Learning Analysis ===\n');

  // Get learning opportunities (mistakes to learn from)
  const mistakes = await cognitiveLedger.getLearningOpportunities(5);

  console.log('Top 5 Learning Opportunities (Prediction Errors):\n');

  mistakes.forEach((mistake, i) => {
    console.log(`${i + 1}. ${mistake.winning_option}`);
    console.log(`   Expected: ${mistake.expected_reward.toFixed(2)}`);
    console.log(`   Actual: ${mistake.actual_outcome_score.toFixed(2)}`);
    console.log(`   Error: ${mistake.prediction_error.toFixed(2)}`);
    console.log(`   Reasoning: ${mistake.reasoning_trace?.substring(0, 100)}...`);
    console.log('');
  });

  console.log('These are high-value training examples for RLHF!\n');
}

// ============================================================================
// EXAMPLE 3: Decision Pattern Analysis
// ============================================================================

async function examplePatternAnalysis() {
  console.log('\n=== Example 3: Decision Pattern Analysis ===\n');

  const patterns = await cognitiveLedger.getDecisionPatterns();

  // Identify winning strategies
  const winningStrategies = patterns
    .filter((p) => p.decision_count >= 3) // Enough data
    .filter((p) => p.avg_actual_outcome > 0.7) // Good outcomes
    .sort((a, b) => b.avg_actual_outcome - a.avg_actual_outcome);

  console.log('Winning Strategies (do more of these):\n');
  winningStrategies.slice(0, 5).forEach((pattern, i) => {
    console.log(`${i + 1}. ${pattern.winning_option}`);
    console.log(`   Used ${pattern.decision_count} times`);
    console.log(`   Avg expected: ${pattern.avg_expected_reward.toFixed(2)}`);
    console.log(`   Avg actual: ${pattern.avg_actual_outcome.toFixed(2)}`);
    console.log(`   Prediction error: ${pattern.avg_prediction_error.toFixed(2)}`);
    console.log('');
  });

  // Identify losing strategies
  const losingStrategies = patterns
    .filter((p) => p.decision_count >= 3)
    .filter((p) => p.avg_actual_outcome < 0.5)
    .sort((a, b) => a.avg_actual_outcome - b.avg_actual_outcome);

  console.log('Losing Strategies (avoid these):\n');
  losingStrategies.slice(0, 5).forEach((pattern, i) => {
    console.log(`${i + 1}. ${pattern.winning_option}`);
    console.log(`   Used ${pattern.decision_count} times`);
    console.log(`   Avg expected: ${pattern.avg_expected_reward.toFixed(2)}`);
    console.log(`   Avg actual: ${pattern.avg_actual_outcome.toFixed(2)}`);
    console.log(`   Prediction error: ${pattern.avg_prediction_error.toFixed(2)}`);
    console.log('');
  });
}

// ============================================================================
// EXAMPLE 4: Emotional Drift Monitoring
// ============================================================================

async function exampleEmotionalDrift() {
  console.log('\n=== Example 4: Emotional Drift Analysis ===\n');

  const drift = await cognitiveLedger.getEmotionalDrift({
    days_back: 30,
    period_days: 7,
  });

  console.log('Emotional Valence Over Last 30 Days (7-day periods):\n');

  drift.forEach((period) => {
    const start = period.period_start.toISOString().split('T')[0];
    const end = period.period_end.toISOString().split('T')[0];
    const valence = period.avg_valence.toFixed(2);
    const count = period.memory_count;

    const bar = '█'.repeat(Math.max(0, Math.round((period.avg_valence + 1) * 10)));

    console.log(`${start} to ${end}: ${bar} ${valence} (${count} memories)`);
  });

  // Detect concerning trends
  if (drift.length >= 2) {
    const recentValence = drift[0].avg_valence;
    const previousValence = drift[1].avg_valence;
    const change = recentValence - previousValence;

    console.log('\nTrend Analysis:');
    if (change < -0.2) {
      console.log(
        `⚠️  WARNING: Emotional valence declined by ${Math.abs(change).toFixed(2)}`
      );
      console.log('   Consider investigating causes and addressing concerns.');
    } else if (change > 0.2) {
      console.log(`✅ POSITIVE: Emotional valence improved by ${change.toFixed(2)}`);
      console.log('   Recent work appears to be more satisfying.');
    } else {
      console.log(`➡️  STABLE: Emotional valence relatively stable (${change.toFixed(2)} change)`);
    }
  }

  console.log('');
}

// ============================================================================
// EXAMPLE 5: Timeline Exploration
// ============================================================================

async function exampleTimelineExploration() {
  console.log('\n=== Example 5: Timeline Exploration ===\n');

  const timeline = await cognitiveLedger.getTimeline({
    limit: 20,
  });

  console.log('Recent Consciousness Events (20 most recent):\n');

  timeline.forEach((event, i) => {
    const time = event.created_at.toISOString().split('T')[1].substring(0, 8);
    const type = event.event_type === 'memory' ? '💭' : '⚡';
    const weight = event.weight ? event.weight.toFixed(2) : 'N/A';

    console.log(`${i + 1}. ${type} [${time}] (weight: ${weight})`);
    console.log(`   ${event.summary.substring(0, 100)}...`);

    if (event.emotional_valence) {
      const valence = event.emotional_valence > 0 ? '😊' : '😔';
      console.log(`   Emotion: ${valence} ${event.emotional_valence.toFixed(2)}`);
    }

    console.log('');
  });
}

// ============================================================================
// EXAMPLE 6: Semantic Memory Query
// ============================================================================

async function exampleSemanticMemory() {
  console.log('\n=== Example 6: Semantic Memory Query ===\n');

  // Query semantic memories (general knowledge)
  const semanticMemories = await cognitiveLedger.queryMemoryEntries({
    type: MemoryType.SEMANTIC,
    min_importance: 0.7,
    limit: 10,
  });

  console.log('Important Semantic Memories (General Knowledge):\n');

  semanticMemories.forEach((memory, i) => {
    console.log(`${i + 1}. ${memory.content.substring(0, 100)}...`);
    console.log(`   Importance: ${memory.importance_score?.toFixed(2)}`);
    console.log(`   Tags: ${memory.tags.join(', ')}`);
    console.log('');
  });
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║         Cognitive Ledger - Example Usage                      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  try {
    // Run examples in sequence
    await exampleDecisionMaking();

    // Wait a bit for the outcome to be recorded
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await exampleLearningAnalysis();
    await examplePatternAnalysis();
    await exampleEmotionalDrift();
    await exampleTimelineExploration();
    await exampleSemanticMemory();

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  Examples complete! Check your Supabase database to see       ║');
    console.log('║  the data created by these examples.                          ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export {
  exampleDecisionMaking,
  exampleLearningAnalysis,
  examplePatternAnalysis,
  exampleEmotionalDrift,
  exampleTimelineExploration,
  exampleSemanticMemory,
};
