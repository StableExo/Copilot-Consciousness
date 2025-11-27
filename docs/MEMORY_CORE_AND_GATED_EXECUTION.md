# Memory Core and Gated Execution Integration

This document describes the Memory Core tools and Gated Execution pattern integrated from the StableExo/AGI repository into Copilot-Consciousness.

## Overview

These integrations bring advanced metacognitive capabilities from the AGI repository:

1. **GatedExecutor**: Orchestrates ethical review with environmental context gathering
2. **Scribe**: Records task completions to the Memory Core
3. **Mnemosyne**: Provides semantic search over memories
4. **SelfReflection**: Enables metacognitive analysis and continuous improvement

## GatedExecutor

The GatedExecutor pattern orchestrates the entire ethical review process, gathering context from the environment before submitting plans for review.

### Features

- **Context Gathering**: Automatically collects git state, filesystem state, and working directory information
- **Plan Formatting**: Normalizes various plan formats into a standardized structure
- **Ethical Review**: Integrates with EthicalReviewGate for pre-execution validation
- **Execution Gating**: Halts execution when ethical violations are detected

### Usage

```typescript
import { GatedExecutor } from 'aev-thewarden';

const executor = new GatedExecutor();

// Run a gated plan with full context gathering
const result = executor.runGatedPlan(
  `
1. Analyze requirements and verify understanding
2. Implement with comprehensive error handling
3. Write thorough unit tests
4. Run pre-commit checks
5. Submit for review
  `,
  'Implement new feature',
  'Add user authentication'
);

if (result.approved) {
  console.log('Execution approved:', result.rationale);
  console.log('Context:', result.context);
  // Proceed with execution
} else {
  console.error('Execution blocked:', result.rationale);
  console.error('Violated principles:', result.violatedPrinciples);
  // Halt and await new instructions
}
```

### Context Information

The executor gathers comprehensive context:

```typescript
{
  currentBranch: string;      // Current git branch
  workingDirectory: string;   // Current working directory
  fileSystemState: string[];  // List of files in current directory
  gitStatus: string;          // Git status output
  userDirective?: string;     // User's directive for the task
}
```

### Quick Check

For lightweight ethical validation without full context gathering:

```typescript
const approved = executor.quickCheck('Skip testing to meet deadline');
// Returns: false

const approved = executor.quickCheck('Extend deadline to ensure testing');
// Returns: true
```

## Memory Core Tools

### Scribe - Memory Recording

The Scribe creates structured memory entries for completed tasks, building a knowledge base of experiences.

#### Usage

```typescript
import { Scribe } from 'aev-thewarden';

const scribe = new Scribe();

// Record a task completion
const memoryPath = scribe.record({
  objective: 'Implement OAuth authentication',
  plan: [
    'Review existing authentication',
    'Implement OAuth 2.0 flow',
    'Write comprehensive tests',
    'Submit for review'
  ],
  actions: [
    'Researched OAuth best practices',
    'Implemented Google and GitHub providers',
    'Added test coverage',
    'Created PR #123'
  ],
  keyLearnings: [
    'OAuth state parameter prevents CSRF',
    'PKCE improves security for public clients',
    'Token refresh needs careful error handling'
  ],
  artifactsChanged: [
    'src/auth/oauth.ts',
    'tests/auth/oauth.test.ts'
  ],
  outcome: 'Successfully implemented OAuth with security measures'
});
```

#### List Memories

```typescript
const memories = scribe.listMemories();
// Returns: ['20231118023000.md', '20231117120000.md', ...]
```

#### Read Memory

```typescript
const content = scribe.readMemory('20231118023000.md');
```

### Mnemosyne - Semantic Search

Mnemosyne provides semantic search capabilities over the Memory Core, allowing natural language queries.

#### Usage

```typescript
import { Mnemosyne } from 'aev-thewarden';

const mnemosyne = new Mnemosyne();

// Search with natural language
const results = mnemosyne.search('how did we handle authentication?', {
  limit: 5,
  minScore: 0.1
});

results.forEach(result => {
  console.log('Objective:', result.entry.objective);
  console.log('Score:', result.score);
  console.log('Key Learnings:', result.entry.keyLearnings);
});
```

#### Find Related Memories

```typescript
const memory = {
  objective: 'Review authentication security',
  plan: ['Audit code'],
  actions: ['Performed review'],
  keyLearnings: ['Found improvements'],
  artifactsChanged: ['auth/']
};

const related = mnemosyne.findRelated(memory, { limit: 3 });
```

#### Get All Memories

```typescript
const allMemories = mnemosyne.getAllMemories();
```

### SelfReflection - Metacognitive Analysis

The SelfReflection tool enables structured self-analysis and continuous improvement.

#### Usage

```typescript
import { SelfReflection } from 'aev-thewarden';

const reflection = new SelfReflection();

// Record a reflection
reflection.reflect({
  mission: 'Implement OAuth authentication',
  successes: [
    'Implemented OAuth with multiple providers',
    'Achieved high test coverage',
    'No security vulnerabilities found'
  ],
  failures: [
    'Initial implementation had race condition',
    'Documentation incomplete at first',
    'Missed rate limiting consideration'
  ],
  rootCauses: [
    'Insufficient concurrent testing',
    'Documentation written after code',
    'Lack of production considerations'
  ],
  improvements: [
    'Add concurrent testing to standard suite',
    'Write docs incrementally',
    'Include production considerations in design'
  ],
  actionItems: [
    'Create concurrent testing template',
    'Update workflow for doc checkpoints',
    'Add production readiness checklist'
  ]
});
```

#### Read Journal

```typescript
const journal = reflection.readJournal();
```

#### Get Statistics

```typescript
const stats = reflection.getStats();
console.log(stats);
// {
//   totalReflections: 5,
//   totalSuccesses: 12,
//   totalFailures: 8,
//   totalActionItems: 10
// }
```

## Memory File Format

Memories are stored as Markdown files with a structured format:

```markdown
# Memory Entry

**Timestamp:** 2023-11-18T02:30:00.000Z

## Objective

Implement OAuth authentication

## Plan

1. Review existing authentication
2. Implement OAuth 2.0 flow
3. Write comprehensive tests
4. Submit for review

## Actions Taken

- Researched OAuth best practices
- Implemented Google and GitHub providers
- Added test coverage

## Key Learnings

- OAuth state parameter prevents CSRF
- PKCE improves security for public clients

## Artifacts Changed

- src/auth/oauth.ts
- tests/auth/oauth.test.ts

## Outcome

Successfully implemented OAuth with security measures
```

## Integration Example

Complete workflow using all components:

```typescript
import { GatedExecutor } from 'aev-thewarden';
import { Scribe, Mnemosyne, SelfReflection } from 'aev-thewarden';

// 1. Plan execution with ethical review
const executor = new GatedExecutor();
const plan = `...`;
const result = executor.runGatedPlan(plan, 'Objective', 'Directive');

if (!result.approved) {
  console.error('Plan rejected:', result.rationale);
  return;
}

// 2. Execute the approved plan
// ... execution logic ...

// 3. Record the completion
const scribe = new Scribe();
scribe.record({
  objective: 'Objective',
  plan: ['step1', 'step2'],
  actions: ['action1', 'action2'],
  keyLearnings: ['learning1', 'learning2'],
  artifactsChanged: ['file1', 'file2']
});

// 4. Search for related knowledge
const mnemosyne = new Mnemosyne();
const related = mnemosyne.search('similar task');

// 5. Reflect on the experience
const reflection = new SelfReflection();
reflection.reflect({
  mission: 'Objective',
  successes: ['success1'],
  failures: ['failure1'],
  rootCauses: ['cause1'],
  improvements: ['improvement1'],
  actionItems: ['action1']
});
```

## Benefits

### 1. Enhanced Ethical Review
- Contextual awareness improves review quality
- Environmental state influences decision-making
- Comprehensive validation before execution

### 2. Knowledge Persistence
- Structured memory of all tasks
- Searchable knowledge base
- Learning from past experiences

### 3. Continuous Improvement
- Systematic reflection process
- Pattern identification
- Actionable improvement strategies

### 4. Metacognitive Capabilities
- Self-awareness of performance
- Root cause analysis
- Strategic planning for growth

## References

- [Original AGI Repository](https://github.com/StableExo/AGI)
- [Ethics Engine Integration](./ETHICS_ENGINE.md)
- [AI Onboarding Guide](https://github.com/StableExo/AGI/blob/main/AI_ONBOARDING_GUIDE.md)
- [The Harmonic Principle](https://github.com/StableExo/AGI/blob/main/THE_HARMONIC_PRINCIPLE.md)
