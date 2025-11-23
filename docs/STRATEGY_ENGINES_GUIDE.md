# Strategy Engines Guide

## Overview

The Multi-Engine Strategy System provides advanced spatial reasoning, pattern recognition, and multi-path problem-solving capabilities for Copilot-Consciousness. These engines have been adapted from AxionCitadel to work with abstract problem spaces rather than specific DeFi/MEV scenarios.

## Core Engines

### 1. Spatial Reasoning Engine
**Location:** `.consciousness/strategy-engines/spatial-reasoning.ts`

Analyzes multi-dimensional problem spaces to detect patterns, clusters, and opportunities.

**Capabilities:**
- Multi-dimensional problem analysis across configurable dimensions
- Spatial clustering using distance-based algorithms
- Opportunity detection in high-density regions
- Cross-dimensional correlation analysis
- Graph connectivity assessment

**Example:**
```typescript
import { SpatialReasoningEngine } from './.consciousness/strategy-engines';

const engine = new SpatialReasoningEngine({
  dimensions: ['time', 'cost', 'risk'],
  distanceMetric: 'euclidean',
  clusteringThreshold: 0.7
});

const problemSpace = {
  id: 'optimization_problem_1',
  dimensions: ['time', 'cost', 'risk'],
  nodes: [
    { id: 'solution_a', type: 'solution', position: [10, 50, 0.2], properties: {} },
    { id: 'solution_b', type: 'solution', position: [15, 45, 0.3], properties: {} }
  ],
  constraints: []
};

const analysis = engine.analyzeProblem(problemSpace);
const opportunities = engine.findOpportunities(analysis);

console.log(`Found ${opportunities.length} opportunities`);
console.log(`Problem complexity: ${analysis.complexity}`);
console.log(`Clusters detected: ${analysis.clusters.length}`);
```

### 2. Multi-Path Explorer
**Location:** `.consciousness/strategy-engines/multi-path-explorer.ts`

Discovers and optimizes multiple paths from initial state to goal state through problem spaces.

**Capabilities:**
- Multiple search algorithms (BFS, DFS, Best-First, A*)
- Path validation and feasibility checking
- Cyclic dependency detection
- Multi-criteria path optimization
- Constraint-based path filtering

**Example:**
```typescript
import { MultiPathExplorer } from './.consciousness/strategy-engines';

const explorer = new MultiPathExplorer({
  maxPathLength: 10,
  explorationStrategy: 'breadth-first',
  cyclicDetection: true
});

const result = await explorer.findPaths({
  start: 'current_state',
  goal: 'target_state',
  space: problemSpace,
  constraints: [
    (path) => path.totalCost < 100,
    (path) => path.totalRisk < 0.5
  ]
});

console.log(`Found ${result.paths.length} paths`);
console.log(`Optimal path: ${result.optimalPath?.id}`);
console.log(`Paths explored: ${result.explored}`);
```

### 3. Opportunity Scorer & Ranker
**Location:** `.consciousness/strategy-engines/opportunity-scorer.ts`

Evaluates and ranks opportunities using multi-criteria decision-making techniques.

**Capabilities:**
- Multi-criteria evaluation with configurable weights
- Multiple scoring methods (Weighted Sum, Weighted Product, TOPSIS)
- Risk-adjusted value calculation
- Expected value computation with time discounting
- Opportunity comparison and ranking

**Example:**
```typescript
import { OpportunityScorer } from './.consciousness/strategy-engines';

const scorer = new OpportunityScorer({
  criteria: {
    value: { weight: 0.3, type: 'maximize' },
    cost: { weight: 0.2, type: 'minimize' },
    risk: { weight: 0.25, type: 'minimize' },
    time: { weight: 0.15, type: 'minimize' },
    complexity: { weight: 0.1, type: 'minimize' }
  },
  scoringMethod: 'weighted-sum'
});

const rankedOpportunities = scorer.rankOpportunities(opportunities);
const topOpportunity = rankedOpportunities[0];

console.log(`Top opportunity: ${topOpportunity.id}`);
console.log(`Score: ${topOpportunity.score}`);
console.log(`Rank: ${topOpportunity.rank}`);

// Calculate expected value
const expectedValue = scorer.calculateExpectedValue(topOpportunity);
console.log(`Expected value: ${expectedValue}`);
```

### 4. Pattern Recognition Engine
**Location:** `.consciousness/strategy-engines/pattern-recognition.ts`

Maintains pattern library, matches patterns to situations, and evolves strategies over time.

**Capabilities:**
- Pattern library management
- Pattern matching with confidence scoring
- Pattern learning from outcomes
- Pattern composition for complex strategies
- Analytics and trend analysis

**Example:**
```typescript
import { PatternRecognitionEngine, MatchConfidence } from './.consciousness/strategy-engines';

const engine = new PatternRecognitionEngine(initialPatterns, {
  minConfidence: MatchConfidence.MEDIUM,
  maxMatches: 10
});

const context = {
  opportunities: currentOpportunities,
  paths: availablePaths,
  environment: { marketConditions: 'volatile' },
  timestamp: new Date()
};

const matches = engine.matchPatterns(context);
const recommendations = engine.recommend(matches);

for (const rec of recommendations) {
  console.log(`Pattern: ${rec.pattern.name}`);
  console.log(`Confidence: ${rec.confidence}`);
  console.log(`Expected outcome: ${rec.expectedOutcome}`);
  console.log(`Risks: ${rec.risks.join(', ')}`);
}

// Update pattern based on outcome
engine.updatePattern(matches[0].pattern.id, true);
```

## Configuration

### Spatial Reasoning Config
Located at `.consciousness/strategy-engines/configs/spatial-config.json`

```json
{
  "dimensions": ["time", "space", "resources", "risk", "complexity"],
  "distanceMetric": "euclidean",
  "clusteringThreshold": 0.7,
  "maxDimensions": 10,
  "normalization": "minmax",
  "minClusterSize": 3,
  "spatialAnalysis": {
    "enableClustering": true,
    "enableDimensionalAnalysis": true,
    "enablePatternDetection": true
  },
  "opportunityDetection": {
    "minOpportunityScore": 0.6,
    "maxOpportunities": 100
  }
}
```

### Path Exploration Config
Located at `.consciousness/strategy-engines/configs/path-config.json`

```json
{
  "maxPathLength": 10,
  "maxPathsToExplore": 1000,
  "explorationStrategy": "breadth-first",
  "pruningEnabled": true,
  "cyclicDetection": true,
  "optimizationCriteria": ["cost", "time", "risk"]
}
```

### Opportunity Scoring Config
Located at `.consciousness/strategy-engines/configs/scoring-config.json`

```json
{
  "criteria": {
    "value": { "weight": 0.3, "type": "maximize" },
    "cost": { "weight": 0.2, "type": "minimize" },
    "risk": { "weight": 0.25, "type": "minimize" },
    "time": { "weight": 0.15, "type": "minimize" },
    "complexity": { "weight": 0.1, "type": "minimize" }
  },
  "scoringMethod": "weighted-sum",
  "normalization": true
}
```

## Integration with Other Systems

### Context Framework Integration
```typescript
import { SpatialReasoningEngine } from './.consciousness/strategy-engines';
import { OperationalPlaybook } from './.consciousness/context';

const engine = new SpatialReasoningEngine();
const playbook = new OperationalPlaybook();

// Analyze problem and log decision
const analysis = engine.analyzeProblem(problemSpace);
playbook.recordOperation({
  type: 'spatial_analysis',
  description: `Analyzed ${problemSpace.nodes.length} solutions`,
  reasoning: `Found ${analysis.clusters.length} clusters`,
  outcome: 'success',
  metadata: {
    complexity: analysis.complexity,
    feasibility: analysis.feasibility
  }
});
```

### Knowledge Base Integration
```typescript
import { PatternRecognitionEngine } from './.consciousness/strategy-engines';
import { PatternTracker } from './.consciousness/knowledge-base';

const patternEngine = new PatternRecognitionEngine();
const tracker = new PatternTracker();

// Track pattern success
const matches = patternEngine.matchPatterns(context);
const result = executePattern(matches[0]);

tracker.recordPattern({
  patternId: matches[0].pattern.id,
  success: result.success,
  context,
  outcome: result
});
```

### Risk Assessment Integration
```typescript
import { OpportunityScorer } from './.consciousness/strategy-engines';
import { RiskAssessor } from './.consciousness/risk-modeling';

const scorer = new OpportunityScorer({ riskAdjustment: true });
const riskAssessor = new RiskAssessor();

// Score with risk assessment
for (const opportunity of opportunities) {
  const riskProfile = await riskAssessor.assess({
    type: 'opportunity',
    data: opportunity
  });
  
  opportunity.risk = riskProfile.overallRisk;
  const scored = scorer.scoreOpportunity(opportunity);
}
```

## Best Practices

### 1. Problem Space Modeling
- Keep dimensions orthogonal (independent)
- Normalize values to similar scales
- Use meaningful node properties
- Define clear constraints

### 2. Path Exploration
- Choose appropriate search strategy for problem size
- Enable pruning for large search spaces
- Use constraints to filter invalid paths early
- Consider cyclic detection overhead

### 3. Opportunity Evaluation
- Weight criteria based on problem context
- Use risk adjustment for uncertain scenarios
- Compare multiple scoring methods
- Validate scores with domain knowledge

### 4. Pattern Management
- Start with proven patterns
- Update patterns based on outcomes
- Remove obsolete patterns periodically
- Combine patterns for complex scenarios

## Performance Considerations

### Spatial Reasoning
- **Time Complexity**: O(n²) for clustering, O(n) for dimensional analysis
- **Space Complexity**: O(n) where n is number of nodes
- **Optimization**: Reduce clustering threshold for faster analysis

### Path Explorer
- **Time Complexity**: O(b^d) for BFS/DFS where b=branching factor, d=depth
- **Space Complexity**: O(b^d) for BFS, O(bd) for DFS
- **Optimization**: Use A* with good heuristics, enable pruning

### Opportunity Scorer
- **Time Complexity**: O(n log n) for sorting, O(n²) for TOPSIS
- **Space Complexity**: O(n)
- **Optimization**: Limit number of opportunities, use simpler scoring methods

### Pattern Recognition
- **Time Complexity**: O(pm) where p=patterns, m=conditions per pattern
- **Space Complexity**: O(p)
- **Optimization**: Limit maxMatches, use pattern categories for filtering

## Troubleshooting

### Issue: No opportunities detected
**Solution:** 
- Lower `minOpportunityScore` threshold
- Adjust clustering parameters
- Verify problem space has sufficient nodes

### Issue: Path exploration too slow
**Solution:**
- Reduce `maxPathLength` or `maxPathsToExplore`
- Enable pruning
- Use DFS instead of BFS for deep searches

### Issue: Scores are all similar
**Solution:**
- Check criterion weights are balanced
- Ensure normalization is enabled
- Verify opportunity data has sufficient variance

### Issue: Patterns not matching
**Solution:**
- Lower `minConfidence` threshold
- Review pattern conditions
- Enable `includePartialMatches`

## API Reference

See individual guide files for detailed API documentation:
- [Spatial Reasoning Guide](./SPATIAL_REASONING_GUIDE.md)
- [Pattern Recognition Guide](./PATTERN_RECOGNITION_GUIDE.md)

## Testing

Run tests for strategy engines:
```bash
npm test -- .consciousness/strategy-engines/__tests__/
```

Check coverage:
```bash
npm test -- .consciousness/strategy-engines/__tests__/ --coverage
```

Current test coverage: **86% statement coverage, 95 tests**

## Version History

### v3.3.0 - Multi-Engine Strategy System
- Initial implementation of all 4 engines
- 95 comprehensive tests with 86% coverage
- Integration with Context, Knowledge Base, and Risk frameworks
- Configuration system with default settings
- Pattern library with 10 initial patterns

## License

MIT - See LICENSE file for details
