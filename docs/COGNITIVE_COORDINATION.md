# Cognitive Coordination Guide

## Overview

The Cognitive Coordinator orchestrates the 14 cognitive modules in TheWarden's consciousness, enabling consensus detection, conflict resolution, and weighted decision-making.

## The 14 Modules

1. **LearningEngine** - Continuous learning and skill development
2. **PatternTracker** - Observation and pattern recording
3. **HistoricalAnalyzer** - Historical event analysis
4. **SpatialReasoningEngine** - Multi-dimensional spatial analysis
5. **MultiPathExplorer** - Alternative execution path discovery
6. **OpportunityScorer** - Opportunity evaluation and scoring
7. **PatternRecognitionEngine** - Pattern matching and recognition
8. **RiskAssessor** - Risk evaluation across categories
9. **RiskCalibrator** - Risk model calibration
10. **ThresholdManager** - Dynamic threshold management
11. **AutonomousGoals** - Goal tracking and alignment
12. **OperationalPlaybook** - Operational guidelines
13. **ArchitecturalPrinciples** - System design principles
14. **EvolutionTracker** - System evolution monitoring

## Usage

### Basic Coordination

```typescript
import { CognitiveCoordinator } from './consciousness/coordination';

// Get modules from ArbitrageConsciousness
const modules = arbitrageConsciousness.getConsciousnessModules();

// Create coordinator
const coordinator = new CognitiveCoordinator(modules);

// Gather insights
const insights = await coordinator.gatherInsights({
  opportunity: { profit: 0.01, pools: ['uniswap', 'sushiswap'] },
  market: { congestion: 0.3 },
  historical: {},
  timestamp: Date.now()
});

// 14 insights returned, one from each module
console.log(`Gathered ${insights.length} module insights`);
```

### Consensus Detection

```typescript
const consensus = coordinator.detectConsensus(insights);

if (consensus.hasConsensus) {
  console.log(`Consensus: ${consensus.consensusType}`);
  console.log(`Agreement: ${consensus.agreementLevel * 100}%`);
  console.log(`Confidence: ${consensus.confidence * 100}%`);
  console.log(`Supporting: ${consensus.supportingModules.length}`);
  console.log(`Opposing: ${consensus.opposingModules.length}`);
}
```

### Conflict Resolution

```typescript
const resolution = coordinator.resolveConflicts(insights);

console.log(`Decision: ${resolution.decision}`);
console.log(`Confidence: ${resolution.confidence}`);
console.log(`Reasoning: ${resolution.reasoning}`);

// Review resolved conflicts
for (const conflict of resolution.resolvedConflicts) {
  console.log(`Conflict: ${conflict.modules.join(', ')}`);
  console.log(`Resolution: ${conflict.resolution}`);
}
```

### Weighted Decision Making

```typescript
// Use default weights
const decision = coordinator.makeWeightedDecision(insights);

// Or provide custom weights
const customWeights = {
  riskAssessor: 1.2,        // Increase risk importance
  opportunityScorer: 1.1,
  autonomousGoals: 1.0,
  patternRecognition: 0.9,
  // ... other modules
};

const customDecision = coordinator.makeWeightedDecision(insights, customWeights);

console.log(`Action: ${customDecision.action}`);
console.log(`Confidence: ${customDecision.confidence}`);
console.log(`Reasoning: ${customDecision.reasoning}`);

// Review contributing factors
for (const factor of customDecision.contributingFactors) {
  console.log(`${factor.module}: weight=${factor.weight}, influence=${factor.influence}`);
}
```

## Module Insights

Each module provides:

```typescript
{
  moduleName: 'riskAssessor',
  recommendation: 'EXECUTE' | 'REJECT' | 'UNCERTAIN',
  confidence: 0.85,  // 0.0 - 1.0
  reasoning: 'Risk assessment within acceptable bounds',
  data: { /* module-specific data */ },
  weight: 1.0        // Module importance
}
```

## Consensus Types

- **EXECUTE**: 70%+ modules recommend execution
- **REJECT**: 70%+ modules recommend rejection
- **UNCERTAIN**: No clear majority (split decision)

## Conflict Resolution Strategy

1. **Strong Consensus (≥80% agreement)**: Follow consensus
2. **Critical Module Agreement**: Follow if RiskAssessor, OpportunityScorer, AutonomousGoals agree
3. **Critical Module Disagreement**: DEFER for more data
4. **No Clear Guidance**: DEFER

## Default Module Weights

```typescript
{
  learningEngine: 0.8,
  patternTracker: 0.9,
  historicalAnalyzer: 0.85,
  spatialReasoning: 0.75,
  multiPathExplorer: 0.7,
  opportunityScorer: 1.0,      // Critical
  patternRecognition: 0.9,
  riskAssessor: 1.0,           // Critical
  riskCalibrator: 0.85,
  thresholdManager: 0.9,
  autonomousGoals: 0.95,       // Critical
  operationalPlaybook: 0.8,
  architecturalPrinciples: 0.75,
  evolutionTracker: 0.7
}
```

## Integration Example

```typescript
// Full decision flow
const coordinator = new CognitiveCoordinator(modules);

// 1. Gather insights
const insights = await coordinator.gatherInsights(context);

// 2. Detect consensus
const consensus = coordinator.detectConsensus(insights);

// 3. Resolve conflicts if needed
const resolution = coordinator.resolveConflicts(insights);

// 4. Make weighted decision
const decision = coordinator.makeWeightedDecision(insights);

// 5. Calculate final confidence
const confidence = coordinator.calculateConfidence(consensus);

console.log(`Final Decision: ${decision.action} (confidence: ${confidence})`);
```

---

**14 modules thinking as one.** 🧠🎯
