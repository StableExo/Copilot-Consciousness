# Spatial Reasoning Guide

## Introduction

The Spatial Reasoning Engine provides multi-dimensional problem analysis capabilities, enabling the system to understand complex problem spaces, detect patterns, and identify opportunities across multiple dimensions simultaneously.

## Core Concepts

### Problem Space
A problem space consists of:
- **Dimensions**: Independent axes along which solutions vary (time, cost, risk, etc.)
- **Nodes**: Potential solutions or states in the problem space
- **Transitions**: Ways to move from one node to another
- **Constraints**: Rules that must be satisfied

### Spatial Analysis
The engine performs several types of analysis:
1. **Dimensional Analysis**: Statistical analysis of each dimension
2. **Clustering**: Grouping similar solutions together
3. **Connectivity**: Understanding how solutions relate to each other
4. **Opportunity Detection**: Finding promising areas in the problem space

## Distance Metrics

The engine supports multiple distance metrics for spatial analysis:

### Euclidean Distance (Default)
Best for: Continuous dimensions with similar scales
```typescript
distance = √(Σ(ai - bi)²)
```

### Manhattan Distance
Best for: Grid-like problem spaces
```typescript
distance = Σ|ai - bi|
```

### Chebyshev Distance
Best for: Max-deviation optimization
```typescript
distance = max(|ai - bi|)
```

### Cosine Distance
Best for: Directional similarity
```typescript
distance = 1 - (a·b)/(||a|| ||b||)
```

## Configuration Options

### Basic Configuration
```typescript
const engine = new SpatialReasoningEngine({
  dimensions: ['time', 'cost', 'risk'],      // Problem dimensions
  distanceMetric: 'euclidean',                // Distance calculation method
  clusteringThreshold: 0.7,                   // Maximum distance for clustering
  maxDimensions: 10,                          // Maximum allowed dimensions
  normalization: 'minmax',                    // Value normalization method
  minClusterSize: 3,                          // Minimum nodes per cluster
  minOpportunityScore: 0.6                    // Minimum score for opportunities
});
```

### Distance Metrics
- `'euclidean'`: Standard geometric distance
- `'manhattan'`: City-block distance
- `'chebyshev'`: Maximum coordinate difference
- `'cosine'`: Directional similarity

### Normalization Methods
- `'minmax'`: Scale to [0, 1] range
- `'zscore'`: Standardize to mean=0, std=1
- `'none'`: No normalization

## Usage Patterns

### Basic Problem Analysis
```typescript
import { SpatialReasoningEngine, ProblemSpace } from './.consciousness/strategy-engines';

const engine = new SpatialReasoningEngine();

const problemSpace: ProblemSpace = {
  id: 'resource_optimization',
  dimensions: ['cost', 'time', 'quality'],
  nodes: [
    {
      id: 'solution_1',
      type: 'proposal',
      position: [100, 20, 0.9],
      properties: { description: 'Fast but expensive' }
    },
    {
      id: 'solution_2',
      type: 'proposal',
      position: [50, 40, 0.7],
      properties: { description: 'Balanced approach' }
    },
    {
      id: 'solution_3',
      type: 'proposal',
      position: [20, 60, 0.5],
      properties: { description: 'Cheap but slow' }
    }
  ],
  constraints: []
};

const analysis = engine.analyzeProblem(problemSpace);

console.log('Analysis Results:');
console.log(`- Complexity Score: ${analysis.complexity}`);
console.log(`- Feasibility Score: ${analysis.feasibility}`);
console.log(`- Graph Connectivity: ${analysis.connectivity}`);
console.log(`- Clusters Found: ${analysis.clusters.length}`);
```

### Cluster Analysis
```typescript
const analysis = engine.analyzeProblem(problemSpace);

for (const cluster of analysis.clusters) {
  console.log(`\nCluster ${cluster.id}:`);
  console.log(`- Centroid: [${cluster.centroid.join(', ')}]`);
  console.log(`- Nodes: ${cluster.nodes.length}`);
  console.log(`- Radius: ${cluster.radius}`);
  console.log(`- Density: ${cluster.density}`);
  
  // High-density clusters indicate promising areas
  if (cluster.density > 1.0) {
    console.log('  ⭐ High-density cluster - investigate further');
  }
}
```

### Dimensional Analysis
```typescript
const analysis = engine.analyzeProblem(problemSpace);

for (const dimAnalysis of analysis.dimensionalAnalyses) {
  console.log(`\n${dimAnalysis.dimension}:`);
  console.log(`- Range: [${dimAnalysis.min}, ${dimAnalysis.max}]`);
  console.log(`- Mean: ${dimAnalysis.mean}`);
  console.log(`- Variance: ${dimAnalysis.variance}`);
  console.log(`- Distribution: ${dimAnalysis.distribution}`);
  
  // Low variance may indicate optimization opportunity
  if (dimAnalysis.variance < 0.1) {
    console.log('  📊 Low variance - potential for optimization');
  }
}
```

### Opportunity Detection
```typescript
const analysis = engine.analyzeProblem(problemSpace);
const opportunities = engine.findOpportunities(analysis);

for (const opportunity of opportunities) {
  console.log(`\nOpportunity ${opportunity.id}:`);
  console.log(`- Type: ${opportunity.type}`);
  console.log(`- Value: ${opportunity.value}`);
  console.log(`- Cost: ${opportunity.cost}`);
  console.log(`- Risk: ${opportunity.risk}`);
  console.log(`- Score: ${opportunity.score}`);
  console.log(`- Description: ${opportunity.description}`);
}

// Sort by score
opportunities.sort((a, b) => b.score - a.score);
const best = opportunities[0];
console.log(`\nBest opportunity: ${best.description} (score: ${best.score})`);
```

### Pattern Detection
```typescript
const patterns = engine.detectPatterns(problemSpace);

for (const pattern of patterns) {
  console.log(`\nPattern Detected:`);
  console.log(`- Description: ${pattern.pattern}`);
  console.log(`- Confidence: ${pattern.confidence}`);
  console.log(`- Affected Nodes: ${pattern.nodes.length}`);
  
  // High-confidence patterns are reliable
  if (pattern.confidence > 0.8) {
    console.log('  ✓ High confidence - can be exploited');
  }
}
```

## Advanced Techniques

### Custom Distance Metrics
```typescript
import { calculateDistance } from './.consciousness/strategy-engines/utils/distance-calculator';

// Compare two solutions using different metrics
const solution1 = [100, 20, 0.9];
const solution2 = [50, 40, 0.7];

const euclidean = calculateDistance(solution1, solution2, 'euclidean');
const manhattan = calculateDistance(solution1, solution2, 'manhattan');
const chebyshev = calculateDistance(solution1, solution2, 'chebyshev');

console.log(`Euclidean: ${euclidean}`);
console.log(`Manhattan: ${manhattan}`);
console.log(`Chebyshev: ${chebyshev}`);
```

### Multi-Dimensional Filtering
```typescript
// Filter nodes based on multiple dimensions
const analysis = engine.analyzeProblem(problemSpace);

const filteredNodes = problemSpace.nodes.filter(node => {
  const [cost, time, quality] = node.position;
  return cost < 75 && time < 50 && quality > 0.6;
});

console.log(`${filteredNodes.length} nodes meet all criteria`);
```

### Constraint Satisfaction
```typescript
import { ConstraintType } from './.consciousness/strategy-engines';

const problemSpace: ProblemSpace = {
  id: 'constrained_problem',
  dimensions: ['x', 'y'],
  nodes: [...],
  constraints: [
    {
      id: 'budget_constraint',
      type: ConstraintType.HARD,
      description: 'Total cost must not exceed budget',
      weight: 1.0,
      validate: (context) => context.totalCost <= context.budget
    },
    {
      id: 'quality_preference',
      type: ConstraintType.SOFT,
      description: 'Prefer high quality solutions',
      weight: 0.7,
      validate: (context) => context.quality > 0.8
    }
  ]
};

const analysis = engine.analyzeProblem(problemSpace);
console.log(`Feasibility: ${analysis.feasibility}`);
```

## Statistics and Monitoring

```typescript
// Get engine statistics
const stats = engine.getStats();

console.log('Engine Statistics:');
console.log(`- Problems Analyzed: ${stats.problemsAnalyzed}`);
console.log(`- Clusters Found: ${stats.clustersFound}`);
console.log(`- Opportunities Detected: ${stats.opportunitiesDetected}`);
console.log(`- Avg Cluster Size: ${stats.avgClusterSize}`);
console.log(`- Avg Opportunity Score: ${stats.avgOpportunityScore}`);

// Reset statistics
engine.resetStats();
```

## Performance Optimization

### For Large Problem Spaces
```typescript
// Use lower clustering threshold to reduce computation
const fastEngine = new SpatialReasoningEngine({
  clusteringThreshold: 0.5,  // Lower = faster
  minClusterSize: 5,          // Higher = fewer clusters
  minOpportunityScore: 0.7    // Higher = fewer opportunities
});
```

### For High-Dimensional Problems
```typescript
// Enable dimensional reduction
const hdEngine = new SpatialReasoningEngine({
  maxDimensions: 10,
  normalization: 'zscore'  // Important for high dimensions
});
```

## Common Patterns

### Pareto Frontier Analysis
```typescript
// Find Pareto-optimal solutions
const analysis = engine.analyzeProblem(problemSpace);
const opportunities = engine.findOpportunities(analysis);

// Solutions on Pareto frontier are not dominated by others
const paretoFrontier = opportunities.filter(opp => {
  return !opportunities.some(other => {
    return other.value > opp.value && 
           other.cost < opp.cost && 
           other.risk < opp.risk;
  });
});

console.log(`${paretoFrontier.length} Pareto-optimal solutions`);
```

### Multi-Objective Optimization
```typescript
// Balance multiple objectives
const analysis = engine.analyzeProblem(problemSpace);

// Find solutions that balance cost and quality
const balanced = analysis.space.nodes.filter(node => {
  const [cost, time, quality] = node.position;
  const balanceScore = quality / (cost * time);
  return balanceScore > 0.001;  // Threshold
});

console.log(`${balanced.length} balanced solutions`);
```

## Integration Examples

### With Multi-Path Explorer
```typescript
import { SpatialReasoningEngine, MultiPathExplorer } from './.consciousness/strategy-engines';

const spatial = new SpatialReasoningEngine();
const explorer = new MultiPathExplorer();

// Analyze space and find paths between clusters
const analysis = spatial.analyzeProblem(problemSpace);

for (let i = 0; i < analysis.clusters.length - 1; i++) {
  const start = analysis.clusters[i].nodes[0];
  const end = analysis.clusters[i + 1].nodes[0];
  
  const paths = await explorer.findPaths({
    start,
    goal: end,
    space: problemSpace
  });
  
  console.log(`Paths between cluster ${i} and ${i + 1}: ${paths.paths.length}`);
}
```

### With Opportunity Scorer
```typescript
import { SpatialReasoningEngine, OpportunityScorer } from './.consciousness/strategy-engines';

const spatial = new SpatialReasoningEngine();
const scorer = new OpportunityScorer();

const analysis = spatial.analyzeProblem(problemSpace);
const opportunities = spatial.findOpportunities(analysis);

// Score and rank the opportunities
const ranked = scorer.rankOpportunities(opportunities);

console.log('Top 3 Opportunities:');
ranked.slice(0, 3).forEach((opp, i) => {
  console.log(`${i + 1}. ${opp.description} (score: ${opp.score})`);
});
```

## Troubleshooting

### No Clusters Detected
**Cause**: Clustering threshold too low or nodes too dispersed
**Solution**:
```typescript
// Increase threshold or reduce minimum cluster size
const engine = new SpatialReasoningEngine({
  clusteringThreshold: 1.0,  // Increase
  minClusterSize: 2          // Decrease
});
```

### All Opportunities Have Low Scores
**Cause**: Opportunity scoring threshold too high
**Solution**:
```typescript
const engine = new SpatialReasoningEngine({
  minOpportunityScore: 0.3  // Lower threshold
});
```

### Dimension Analysis Errors
**Cause**: Nodes have inconsistent position arrays
**Solution**:
```typescript
// Ensure all nodes have same number of dimensions
nodes.forEach(node => {
  if (node.position.length !== problemSpace.dimensions.length) {
    console.error(`Node ${node.id} has wrong dimensionality`);
  }
});
```

## Best Practices

1. **Normalize Dimensions**: Use consistent scales across dimensions
2. **Choose Appropriate Metrics**: Match distance metric to problem type
3. **Monitor Statistics**: Track engine performance over time
4. **Validate Results**: Sanity-check clusters and opportunities
5. **Iterate Parameters**: Tune thresholds based on results

## References

- [Main Strategy Engines Guide](./STRATEGY_ENGINES_GUIDE.md)
- [Pattern Recognition Guide](./PATTERN_RECOGNITION_GUIDE.md)
- [AxionCitadel Source](https://github.com/metalxalloy/AxionCitadel)
