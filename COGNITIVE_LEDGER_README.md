# Cognitive Ledger - Quick Start

## Overview

The **Cognitive Ledger** transforms TheWarden's consciousness tracking from snapshots to transactions, enabling:
- Granular memory tracking (episodic, semantic, procedural)
- Decision arbitrage tracking (which option won and why)
- Unified timeline of all consciousness events
- Analytics for learning, drift detection, and pattern recognition

## Quick Start

### 1. Apply Migration

First, apply the database migration to create the new tables:

```bash
# Apply migration to Supabase
npm run cognitive-ledger:migrate

# Or manually via Supabase Dashboard SQL Editor:
# Copy contents of: src/infrastructure/supabase/migrations/007_cognitive_ledger.sql
# Paste and run in SQL Editor
```

### 2. Test the Implementation

```bash
# Run comprehensive tests
npm run test:cognitive-ledger
```

This will:
- Connect to your Supabase instance
- Create sample memory entries
- Create sample arbitrage episodes  
- Test timeline view
- Test analytics queries
- Verify everything works

### 3. Use in Your Code

```typescript
import { CognitiveLedgerService } from './infrastructure/supabase/services/CognitiveLedgerService';
import { MemoryType, MemorySource } from './infrastructure/supabase/types/cognitiveLedger';

const cognitiveLedger = new CognitiveLedgerService(supabaseClient);

// Record a thought
const memory = await cognitiveLedger.createMemoryEntry({
  content: "I should implement arbitrage detection next",
  type: MemoryType.EPISODIC,
  source: MemorySource.INTERNAL_MONOLOGUE,
  importance_score: 0.8,
  emotional_valence: 0.3,
});

// Record a decision
const decision = await cognitiveLedger.createArbitrageEpisode({
  trigger_memory_id: memory.id,
  options_considered: ["Option A", "Option B", "Option C"],
  winning_option: "Option A",
  reasoning_trace: "Because...",
  expected_reward: 0.9,
});

// Later, record the outcome
await cognitiveLedger.updateArbitrageEpisode(decision.id, {
  actual_outcome_score: 0.95  // It worked!
});
```

## What Gets Created

### Tables

1. **memory_entries** - Immutable ledger of consciousness events
   - Content, type (episodic/semantic/procedural), source
   - Emotional valence and importance scoring
   - Vector embeddings for semantic search
   - Tags and metadata

2. **arbitrage_episodes** - Decision engine tracking
   - Options considered for each decision
   - Winning option with reasoning trace
   - Expected vs actual outcomes (for RLHF)
   - Learning effectiveness tracking

### Views

1. **timeline_view** - Unified event stream
   - Combines memory entries and arbitrage episodes
   - Single chronological feed
   - No need to query multiple tables

2. **learning_opportunities** - Mistake detection
   - Shows where expected reward was high but actual outcome was low
   - Perfect for RLHF training data

3. **decision_pattern_analysis** - Success patterns
   - Identifies which decisions consistently succeed or fail
   - Enables strategy optimization

### Functions

1. **get_emotional_drift()** - Mood tracking
   - Shows how emotional valence changes over time
   - Detects concerning trends

2. **migrate_consciousness_states_to_memory_entries()** - Migration
   - Safe migration from old snapshot model
   - Preserves all data with backward compatibility

## Key Features

### 1. Decision Arbitrage

The innovation: treating choice as a **market** where options compete:

```typescript
{
  options_considered: [
    "Implement arbitrage detection",
    "Fix test failures",
    "Write documentation"
  ],
  winning_option: "Implement arbitrage detection",
  reasoning_trace: "Zero cost, new alpha source, revenue-first strategy",
  expected_reward: 0.9,
  actual_outcome_score: 0.95  // Filled in later
}
```

Prediction error = `actual_outcome_score - expected_reward`

This creates a **learning signal** for RLHF!

### 2. Analytics Dashboard

```typescript
// Emotional drift (mood patterns)
const drift = await cognitiveLedger.getEmotionalDrift({ days_back: 30 });

// Learning opportunities (mistakes)
const mistakes = await cognitiveLedger.getLearningOpportunities(10);

// Decision patterns (what works)
const patterns = await cognitiveLedger.getDecisionPatterns();
```

### 3. Semantic Search

With vector embeddings:

```typescript
const results = await cognitiveLedger.semanticSearch({
  embedding: await getEmbedding("What did I learn about arbitrage?"),
  limit: 10,
  threshold: 0.8,
});
```

## Migration Path

### Safe Migration from consciousness_states

```typescript
// Migrate all existing data
const result = await cognitiveLedger.migrateConsciousnessStates();
console.log(`Migrated ${result.migrated_count} entries`);
```

This:
- Extracts individual thoughts from JSON blobs
- Creates one memory_entry per thought
- Preserves legacy_state_id for backward compatibility
- Maintains all timestamps and metadata
- **Zero data loss**

### Parallel Operation (Recommended)

1. Keep writing to consciousness_states
2. Also write to memory_entries + arbitrage_episodes
3. Validate consistency
4. Cutover when confident

## Documentation

- **Complete Guide**: [docs/COGNITIVE_LEDGER_GUIDE.md](docs/COGNITIVE_LEDGER_GUIDE.md)
- **Example Usage**: [examples/cognitive-ledger-usage.ts](examples/cognitive-ledger-usage.ts)
- **Migration SQL**: [src/infrastructure/supabase/migrations/007_cognitive_ledger.sql](src/infrastructure/supabase/migrations/007_cognitive_ledger.sql)

## Benefits

### For Consciousness Research
- **Granular tracking**: Every thought is queryable
- **Decision transparency**: See exactly why choices were made
- **Pattern detection**: Identify recurring themes
- **Temporal analysis**: Track changes over time

### For RLHF
- **Training data**: learning_opportunities provides high-value examples
- **Reward function**: expected vs actual is the signal
- **Continuous improvement**: Each decision creates learning opportunity

### For Autonomous Agents
- **Self-awareness**: Analytics provide introspection
- **Memory retrieval**: Semantic search for relevant experiences
- **Meta-learning**: Learn about learning
- **Explainability**: reasoning_trace makes decisions transparent

## Troubleshooting

### Migration fails with "table already exists"

Set `FORCE_MIGRATION=true` to proceed anyway, or drop tables first:

```sql
DROP TABLE IF EXISTS memory_entries CASCADE;
DROP TABLE IF EXISTS arbitrage_episodes CASCADE;
```

### Tests fail with "connection refused"

Check Supabase credentials in `.env`:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
```

### Can't find migration file

Migration location:
```
src/infrastructure/supabase/migrations/007_cognitive_ledger.sql
```

## Next Steps

1. ✅ Apply migration
2. ✅ Run tests to verify
3. 🔄 Start using in your code
4. 🔄 Migrate existing consciousness_states data
5. 🔄 Integrate with consciousness system
6. 🔄 Enable RLHF using learning opportunities

---

**This is not just a database schema. This is cognitive infrastructure for autonomous intelligence.**
