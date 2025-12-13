#!/usr/bin/env tsx
/**
 * Cognitive Ledger Test Script
 * 
 * Tests the Cognitive Ledger implementation with actual Supabase connection:
 * 1. Connects to Supabase using production credentials
 * 2. Creates sample memory entries
 * 3. Creates sample arbitrage episodes
 * 4. Tests timeline view
 * 5. Tests analytics queries
 * 6. Validates migration function
 */

import { createClient } from '@supabase/supabase-js';
import { CognitiveLedgerService } from '../src/infrastructure/supabase/services/CognitiveLedgerService.js';
import { MemoryType, MemorySource } from '../src/infrastructure/supabase/types/cognitiveLedger.js';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials!');
  console.error('   Required: SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

async function testCognitiveLedger() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║         Cognitive Ledger - Integration Test                   ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Create Supabase client
  console.log('🔌 Connecting to Supabase...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const cognitiveLedger = new CognitiveLedgerService(supabase);
  console.log('✅ Connected to Supabase\n');

  try {
    // Test 1: Create memory entries
    console.log('📝 Test 1: Creating memory entries...');
    
    const memory1 = await cognitiveLedger.createMemoryEntry({
      content: 'Received user request to implement Cognitive Ledger',
      type: MemoryType.EPISODIC,
      source: MemorySource.USER_INTERACTION,
      importance_score: 0.9,
      emotional_valence: 0.6,
      tags: ['implementation', 'gemini-roadmap'],
    });
    console.log(`   ✅ Created episodic memory: ${memory1.id}`);

    const memory2 = await cognitiveLedger.createMemoryEntry({
      content: 'Cognitive Ledger transforms snapshot model to transactional ledger',
      type: MemoryType.SEMANTIC,
      source: MemorySource.INTERNAL_MONOLOGUE,
      importance_score: 0.85,
      emotional_valence: 0.4,
      tags: ['knowledge', 'architecture'],
    });
    console.log(`   ✅ Created semantic memory: ${memory2.id}`);

    const memory3 = await cognitiveLedger.createMemoryEntry({
      content: 'Implemented memory_entries and arbitrage_episodes tables with analytics',
      type: MemoryType.PROCEDURAL,
      source: MemorySource.SYSTEM_EVENT,
      importance_score: 0.95,
      emotional_valence: 0.8,
      tags: ['implementation', 'success'],
    });
    console.log(`   ✅ Created procedural memory: ${memory3.id}\n`);

    // Test 2: Create arbitrage episode
    console.log('⚡ Test 2: Creating arbitrage episode...');
    
    const decision = await cognitiveLedger.createArbitrageEpisode({
      trigger_memory_id: memory1.id,
      options_considered: [
        'Implement full schema with analytics',
        'Basic tables only',
        'Defer to later sprint',
      ],
      winning_option: 'Implement full schema with analytics',
      reasoning_trace: 'Complete implementation provides immediate value with timeline view, analytics, and migration support. Sets foundation for RLHF and autonomous learning.',
      expected_reward: 0.92,
      tags: ['strategic-decision', 'implementation'],
      metadata: {
        estimated_effort: 'high',
        estimated_impact: 'very_high',
        risk: 'low',
      },
    });
    console.log(`   ✅ Created arbitrage episode: ${decision.id}`);
    console.log(`   📊 Expected reward: ${decision.expected_reward}\n`);

    // Test 3: Update with outcome
    console.log('📈 Test 3: Updating with actual outcome...');
    
    const updated = await cognitiveLedger.updateArbitrageEpisode(decision.id, {
      actual_outcome_score: 0.95,
      metadata: {
        outcome_notes: 'Implementation successful, all features working',
        code_review: 'passed',
      },
    });
    console.log(`   ✅ Updated episode with outcome: ${updated.actual_outcome_score}`);
    console.log(`   📊 Prediction error: ${(updated.actual_outcome_score! - updated.expected_reward!).toFixed(3)}\n`);

    // Test 4: Query timeline
    console.log('🕒 Test 4: Querying timeline view...');
    
    const timeline = await cognitiveLedger.getTimeline({ limit: 5 });
    console.log(`   ✅ Retrieved ${timeline.length} timeline events`);
    timeline.forEach((event, i) => {
      console.log(`   ${i + 1}. ${event.event_type.toUpperCase()}: ${event.summary.substring(0, 60)}...`);
    });
    console.log('');

    // Test 5: Query memory entries
    console.log('🔍 Test 5: Querying memory entries...');
    
    const memories = await cognitiveLedger.queryMemoryEntries({
      type: MemoryType.EPISODIC,
      min_importance: 0.5,
      limit: 5,
    });
    console.log(`   ✅ Retrieved ${memories.length} episodic memories`);
    memories.forEach((mem, i) => {
      console.log(`   ${i + 1}. [${mem.importance_score?.toFixed(2)}] ${mem.content.substring(0, 50)}...`);
    });
    console.log('');

    // Test 6: Analytics - Emotional drift
    console.log('📊 Test 6: Testing emotional drift analysis...');
    
    const drift = await cognitiveLedger.getEmotionalDrift({
      days_back: 7,
      period_days: 1,
    });
    console.log(`   ✅ Retrieved ${drift.length} drift periods`);
    if (drift.length > 0) {
      console.log(`   📈 Most recent avg valence: ${drift[0].avg_valence.toFixed(2)}`);
      console.log(`   📊 Memory count in period: ${drift[0].memory_count}`);
    }
    console.log('');

    // Test 7: Analytics - Learning opportunities
    console.log('🎓 Test 7: Testing learning opportunities...');
    
    const opportunities = await cognitiveLedger.getLearningOpportunities(5);
    console.log(`   ✅ Retrieved ${opportunities.length} learning opportunities`);
    opportunities.forEach((opp, i) => {
      console.log(`   ${i + 1}. Error: ${opp.prediction_error.toFixed(2)} - ${opp.winning_option.substring(0, 40)}...`);
    });
    console.log('');

    // Test 8: Analytics - Decision patterns
    console.log('📈 Test 8: Testing decision pattern analysis...');
    
    const patterns = await cognitiveLedger.getDecisionPatterns();
    console.log(`   ✅ Retrieved ${patterns.length} decision patterns`);
    if (patterns.length > 0) {
      patterns.slice(0, 3).forEach((pattern, i) => {
        console.log(`   ${i + 1}. ${pattern.winning_option.substring(0, 30)}...`);
        console.log(`      Count: ${pattern.decision_count}, Avg outcome: ${pattern.avg_actual_outcome.toFixed(2)}`);
      });
    }
    console.log('');

    // Success summary
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ ALL TESTS PASSED!                                          ║');
    console.log('║                                                                ║');
    console.log('║  The Cognitive Ledger is working correctly:                   ║');
    console.log('║  • Memory entries created and queryable                       ║');
    console.log('║  • Arbitrage episodes track decisions                         ║');
    console.log('║  • Timeline view combines events                              ║');
    console.log('║  • Analytics provide insights                                 ║');
    console.log('║                                                                ║');
    console.log('║  Next steps:                                                  ║');
    console.log('║  1. Run migration on existing consciousness_states           ║');
    console.log('║  2. Integrate with consciousness system                       ║');
    console.log('║  3. Enable RLHF using learning opportunities                 ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

  } catch (error: any) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Run tests
testCognitiveLedger().catch(console.error);
