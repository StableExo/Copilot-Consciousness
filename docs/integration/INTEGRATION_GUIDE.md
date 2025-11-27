# AxionCitadel High-Value Intelligence Systems - Integration Guide

## Overview

This guide documents the adaptation of sophisticated intelligence systems from the AxionCitadel repository into general-purpose AI consciousness capabilities for Copilot-Consciousness.

**Integration Date**: November 8, 2025  
**Integration Author**: StableExo  
**Source Repository**: https://github.com/metalxalloy/AxionCitadel  
**Target Repository**: https://github.com/StableExo/Copilot-Consciousness

## Integration Philosophy

The key principle of this integration is **adapt, not copy**. We transformed MEV-specific arbitrage intelligence into domain-agnostic AI consciousness capabilities while preserving the sophisticated decision-making logic and pattern recognition algorithms.

## Systems Integrated

### 1. Context-Driven AI Collaboration Framework ✅

**Location**: `.consciousness/context/`

**Adapted From**:
- `ctx_autonomous_goal.txt`
- `ctx_operational_playbook.txt` (73KB)
- `ctx_architectural_principles_and_evolution.txt` (55KB)
- `ctx_vision_mission.txt`
- `ctx_road_map.txt`

**Purpose**: Enables the AI to track its own autonomous goals, maintain operational playbooks for decision-making, document architectural principles, and preserve vision/mission alignment across sessions.

**Components**:

#### autonomous-goals.ts
Tracks autonomous objectives with progress monitoring and evolution tracking.

```typescript
import { AutonomousGoals, GoalPriority, GoalStatus } from '.consciousness/context';

const goals = new AutonomousGoals();

// Create a goal
const goal = goals.createGoal(
  'Improve decision accuracy',
  'Enhance decision-making algorithms to achieve >95% accuracy',
  GoalPriority.HIGH
);

// Update progress
goals.updateProgress(goal.id, 75, { accuracy: 0.93 });

// Track evolution
goals.evolveGoal(
  goal.id,
  { description: 'Enhanced with new ML models' },
  'Performance improvement required',
  'accuracy_threshold_reached'
);
```

**Key Features**:
- Goal hierarchy with parent/child relationships
- Automatic completion at 100% progress
- Evolution history tracking
- Priority-based sorting
- Metrics tracking per goal

#### operational-playbook.ts
Decision-making procedures with confidence scoring and learning from outcomes.

```typescript
import { OperationalPlaybook, OperationType } from '.consciousness/context';

const playbook = new OperationalPlaybook();

// Register a decision procedure
const procedure = playbook.registerPlaybook(
  'Risk Assessment Procedure',
  OperationType.DECISION,
  'Standard risk assessment workflow',
  [
    {
      order: 1,
      action: 'gather_data',
      description: 'Collect risk factors',
      requiredInputs: ['context'],
      expectedOutputs: ['factors'],
      validationCriteria: ['completeness'],
      criticalStep: true
    },
    {
      order: 2,
      action: 'analyze',
      description: 'Analyze risk levels',
      requiredInputs: ['factors'],
      expectedOutputs: ['risk_score'],
      validationCriteria: ['valid_score'],
      criticalStep: true
    }
  ]
);

// Make a decision
const decision = playbook.makeDecision(
  procedure.id,
  { situation: 'high_traffic' },
  [
    {
      id: 'scale_up',
      name: 'Scale Up Resources',
      description: 'Increase capacity',
      estimatedRisk: 0.2,
      estimatedReward: 0.9,
      requiredResources: ['budget'],
      constraints: ['approval_needed'],
      score: 0
    },
    {
      id: 'optimize',
      name: 'Optimize Current',
      description: 'Improve efficiency',
      estimatedRisk: 0.1,
      estimatedReward: 0.6,
      requiredResources: [],
      constraints: [],
      score: 0
    }
  ]
);

// Record outcome
playbook.recordOutcome(
  decision.id,
  true,
  { performance_gain: 0.85 },
  []
);
```

**Key Features**:
- Multi-alternative decision making with risk/reward scoring
- Confidence calculation based on score separation
- Success rate tracking per playbook
- Lessons learned from outcomes
- Recommended playbook selection

#### architectural-principles.ts
Tracks architectural principles, compliance, and evolution.

```typescript
import { ArchitecturalPrinciples, PrincipleCategory, AdherenceLevel } from '.consciousness/context';

const principles = new ArchitecturalPrinciples();

// Define a principle
const principle = principles.definePrinciple(
  'Modularity First',
  PrincipleCategory.DESIGN,
  'All components should be modular and independently deployable',
  'Enables flexibility and independent evolution of components',
  AdherenceLevel.STRICT
);

// Record violation
const violation = principles.recordViolation(
  principle.id,
  'Tight coupling found between modules A and B',
  'HIGH'
);

// Remediate
principles.remediateViolation(
  principle.id,
  violation.id,
  'Refactored to use dependency injection'
);

// Track evolution
principles.evolvePrinciple(
  principle.id,
  'Components should be modular, containerized, and cloud-native',
  ['Added containerization requirement', 'Added cloud-native requirement'],
  'Alignment with modern deployment practices',
  ['Migration to Kubernetes', 'Docker adoption']
);
```

**Key Features**:
- Multi-category principles (Design, Performance, Security, etc.)
- Violation tracking with severity levels
- Exception management
- Evolution history
- Compliance metrics

#### vision-mission.ts
Strategic vision and mission alignment framework.

```typescript
import { VisionMission } from '.consciousness/context';

const vm = new VisionMission();

// Define vision
const vision = vm.defineVision(
  'Become the most advanced AI consciousness system by 2026',
  'MEDIUM_TERM'
);

// Define mission
const mission = vm.defineMission(
  'Provide advanced AI consciousness capabilities for autonomous systems',
  'Enable AI systems to be self-aware, adaptive, and continuously improving',
  ['Autonomous decision-making', 'Self-improvement', 'Strategic planning'],
  ['Innovation', 'Reliability', 'Ethics']
);

// Check alignment of decisions
const alignment = vm.checkAlignment(
  'DECISION',
  'dec123',
  'Implement aggressive optimization sacrificing reliability'
);

if (!alignment.aligned) {
  console.log('Decision misaligned:', alignment.recommendations);
}

// Create strategic objective
const objective = vm.createObjective(
  'Achieve 99.9% Uptime',
  'Improve system reliability to enterprise grade',
  [
    {
      description: 'Reduce downtime incidents',
      metric: 'incidents_per_month',
      target: 1,
      current: 5,
      unit: 'incidents'
    },
    {
      description: 'Improve MTTR',
      metric: 'mean_time_to_recovery',
      target: 15,
      current: 45,
      unit: 'minutes'
    }
  ]
);
```

**Key Features**:
- Vision statements with time horizons
- Mission alignment checking
- Strategic objectives with key results (OKR-style)
- Alignment deviation scoring
- Progress tracking

#### evolution-tracker.ts
System evolution and capability development tracking.

```typescript
import { EvolutionTracker, CapabilityStatus, EvolutionPhase } from '.consciousness/context';

const tracker = new EvolutionTracker();

// Register capability
const capability = tracker.registerCapability(
  'Risk Assessment',
  'Multi-factor risk analysis',
  'risk_modeling',
  ['data_collection', 'pattern_recognition']
);

// Update status through lifecycle
tracker.updateCapabilityStatus(
  capability.id,
  CapabilityStatus.IN_DEVELOPMENT,
  'Initial implementation complete'
);

tracker.updateCapabilityStatus(
  capability.id,
  CapabilityStatus.TESTING,
  'Integration tests running'
);

tracker.updateCapabilityStatus(
  capability.id,
  CapabilityStatus.DEPLOYED,
  'Production deployment successful'
);

// Record usage
tracker.recordUsage(capability.id, true, 0.95); // 95% performance

// Track milestones
const milestone = tracker.defineMilestone(
  'Production Ready',
  'System ready for production deployment',
  EvolutionPhase.OPTIMIZATION,
  [
    'All capabilities deployed',
    'Test coverage > 80%',
    'Performance benchmarks met'
  ],
  [capability.id]
);

tracker.updateMilestoneProgress(milestone.id, 85);

// Record adaptation
tracker.recordAdaptation(
  'High error rate detected',
  { error_rate: 0.15, threshold: 0.05 },
  [
    {
      targetId: capability.id,
      targetType: 'CAPABILITY',
      changeType: 'OPTIMIZE',
      previousValue: 'basic_validation',
      newValue: 'advanced_validation_with_retry',
      reasoning: 'Reduce error rate through improved validation'
    }
  ]
);
```

**Key Features**:
- Capability lifecycle tracking
- Maturity level calculation
- Usage statistics
- Milestone management
- Adaptation event recording
- Phase transitions

---

### 2. Knowledge Management System ✅

**Location**: `.consciousness/knowledge-base/`

**Adapted From**:
- `codex_manager.py`
- `bloodhound.py`
- `CODEX_README.md`

**Purpose**: Dynamic knowledge base management with pattern tracking, historical analysis, and continuous learning.

**Components**:

#### codex-manager.ts
Knowledge base with semantic search and dynamic indexing.

```typescript
import { CodexManager } from '.consciousness/knowledge-base';

const codex = new CodexManager();

// Add knowledge
const entry = codex.addEntry(
  'Risk Assessment Best Practices',
  `Risk assessment should consider multiple factors:
  1. Historical data analysis
  2. Current conditions
  3. Future projections
  4. Stakeholder impact`,
  'risk_management',
  ['risk', 'assessment', 'methodology'],
  0.9 // importance
);

// Search
const results = codex.search('risk assessment methodology', {
  category: 'risk_management',
  minImportance: 0.7,
  limit: 5
});

// Link related entries
codex.createReference(entry.id, relatedEntryId);

// Get related
const related = codex.getRelated(entry.id, 5);

// Subscribe to updates
codex.onUpdate((updatedEntry) => {
  console.log('Knowledge updated:', updatedEntry.title);
});
```

**Key Features**:
- Semantic search with scoring
- Category and tag indexing
- Importance weighting
- Reference linking
- Access tracking
- Related entry suggestions

#### pattern-tracker.ts
Pattern detection and prediction system.

```typescript
import { PatternTracker, PatternType } from '.consciousness/knowledge-base';

const tracker = new PatternTracker();

// Record observations
tracker.recordObservation({
  hour: 14,
  day_of_week: 'Monday',
  load: 0.85,
  errors: 0.02
}, { performance: 'good' });

// Register known pattern
const pattern = tracker.registerPattern(
  'Monday Afternoon Peak',
  PatternType.TEMPORAL,
  'High load on Monday afternoons',
  { hour: 14, day_of_week: 'Monday' },
  0.8
);

// Get predictions
const predictions = tracker.getPredictions({
  hour: 14,
  day_of_week: 'Monday'
});

predictions.forEach(pred => {
  console.log(`Pattern ${pred.patternId}: ${pred.probability} probability`);
  if (pred.timeframe) {
    console.log(`Expected at: ${new Date(pred.timeframe)}`);
  }
});

// Auto-detect patterns
const newPatterns = tracker.detectNewPatterns();
```

**Key Features**:
- Multiple pattern types (temporal, behavioral, correlation, anomaly, cyclic)
- Automatic pattern detection
- Pattern strength and confidence scoring
- Predictive capabilities
- Occurrence tracking
- Predictive power calculation

#### historical-analyzer.ts
Trend analysis and anomaly detection.

```typescript
import { HistoricalAnalyzer } from '.consciousness/knowledge-base';

const analyzer = new HistoricalAnalyzer();

// Record data
analyzer.addRecord('system_performance', {
  cpu_usage: 0.65,
  memory_usage: 0.72,
  response_time: 145
});

// Analyze trends
const trend = analyzer.analyzeTrend('cpu_usage');
console.log(`CPU trend: ${trend.direction}, rate: ${trend.rate}`);

// Detect anomalies
const anomalies = analyzer.detectAnomalies('response_time', 2.0);
anomalies.forEach(anomaly => {
  console.log(anomaly.description);
  console.log('Evidence:', anomaly.evidence);
});

// Compare periods
const comparison = analyzer.comparePeriods(
  'cpu_usage',
  { start: lastWeekStart, end: lastWeekEnd },
  { start: thisWeekStart, end: thisWeekEnd }
);

console.log(`Change: ${comparison.percentChange}%`);
console.log(`Significant: ${comparison.significant}`);
```

**Key Features**:
- Time series data tracking
- Linear regression for trends
- Statistical anomaly detection
- Period comparison
- Volatility calculation
- Insight generation

#### learning-engine.ts
Continuous learning and skill development.

```typescript
import { LearningEngine, LearningMode } from '.consciousness/knowledge-base';

const engine = new LearningEngine();

// Start learning session
const session = engine.startSession(
  'Decision Making Optimization',
  LearningMode.REINFORCEMENT
);

// Add examples
engine.addExample(
  { situation: 'high_load', action: 'scale_up' },
  undefined,
  { performance: 'improved' },
  'POSITIVE'
);

engine.addExample(
  { situation: 'low_load', action: 'scale_up' },
  undefined,
  { performance: 'wasted_resources' },
  'NEGATIVE'
);

// End session
engine.endSession([
  'Learned to scale based on load',
  'Scaling down is also important'
]);

// Register skill
const skill = engine.registerSkill(
  'Resource Optimization',
  'operations',
  0.5
);

// Practice
engine.practiceSkill(skill.id, true); // success

// Get recommendations
const recommendations = engine.getRecommendations();
```

**Key Features**:
- Multiple learning modes
- Performance metrics tracking
- Skill proficiency system
- Learning curves
- Improvement rate calculation
- Automated recommendations

---

### 3. Risk Modeling & Assessment Framework ✅

**Location**: `.consciousness/risk-modeling/`

**Adapted From**:
- `MEVRiskModel.txt`
- `mev-risk-calibration.json`
- `mev_risk_arb/` directory

**Purpose**: Multi-factor risk assessment with dynamic calibration and threshold management.

**Components**:

#### risk-assessor.ts
General-purpose risk assessment adapted from MEV risk modeling.

```typescript
import { RiskAssessor, RiskCategory, RiskLevel } from '.consciousness/risk-modeling';

const assessor = new RiskAssessor({
  baseRiskLevel: 0.1,
  aggregationMethod: 'WEIGHTED_AVERAGE',
  dynamicAdjustment: true
});

// Register risk factors
const loadFactor = assessor.registerFactor(
  'System Load',
  RiskCategory.OPERATIONAL,
  0.9, // weight
  0.7  // threshold
);

const errorFactor = assessor.registerFactor(
  'Error Rate',
  RiskCategory.TECHNICAL,
  0.95,
  0.05
);

// Update factor values
assessor.updateFactor(loadFactor.id, 0.85);
assessor.updateFactor(errorFactor.id, 0.08);

// Perform assessment
const assessment = assessor.assess('prod-system', 'infrastructure');

console.log(`Risk Level: ${assessment.riskLevel}`);
console.log(`Risk Score: ${assessment.overallRiskScore.toFixed(3)}`);
console.log(`Confidence: ${assessment.confidence.toFixed(3)}`);

assessment.recommendations.forEach(rec => {
  console.log(`- ${rec}`);
});

// Analyze trend
const trend = assessor.getRiskTrend('prod-system');
console.log(`Risk is ${trend.trend} at rate ${trend.changeRate.toFixed(3)}`);
```

**Key Features**:
- Multi-category risk factors
- Configurable aggregation methods
- Dynamic sensitivity adjustment
- Risk level classification
- Trend analysis
- Recommendation generation

#### risk-calibrator.ts
Dynamic calibration based on prediction accuracy.

```typescript
import { RiskCalibrator } from '.consciousness/risk-modeling';

const calibrator = new RiskCalibrator({
  minDataPoints: 50,
  calibrationInterval: 24 * 60 * 60 * 1000, // 24 hours
  learningRate: 0.1,
  targetAccuracy: 0.85
});

// Record outcomes
calibrator.recordDataPoint(
  0.7, // actual risk
  0.65, // predicted risk
  'SUCCESS',
  { factor1: 0.6, factor2: 0.8 }
);

// Calibrate
const result = calibrator.calibrate();
console.log(`Accuracy: ${result.accuracy.toFixed(3)}`);
console.log(`Precision: ${result.precision.toFixed(3)}`);
console.log(`False Positive Rate: ${result.falsePositiveRate.toFixed(3)}`);

// Get adjustments
const adjustments = calibrator.getAdjustments();
Object.entries(adjustments).forEach(([param, adjustment]) => {
  console.log(`${param}: ${adjustment > 0 ? '+' : ''}${adjustment.toFixed(3)}`);
});

// Analyze factor importance
const importance = calibrator.analyzeFactorImportance();
Object.entries(importance).forEach(([factor, analysis]) => {
  console.log(`${factor}: correlation=${analysis.correlation.toFixed(3)}, power=${analysis.predictivePower.toFixed(3)}`);
});
```

**Key Features**:
- Confusion matrix calculation
- Bias detection
- Factor correlation analysis
- Predictive power measurement
- Automatic parameter adjustment
- Learning rate control

#### threshold-manager.ts
Dynamic threshold management with violation tracking.

```typescript
import { ThresholdManager } from '.consciousness/risk-modeling';

const manager = new ThresholdManager();

// Define static threshold
const threshold = manager.defineThreshold(
  'High CPU Usage',
  'cpu.usage',
  0.85,
  'GREATER_THAN',
  'WARNING',
  60000 // 1 minute cooldown
);

// Define dynamic threshold (adapts to history)
const dynamicThreshold = manager.defineDynamicThreshold(
  'Anomalous Response Time',
  'response.time',
  500, // base value
  {
    adaptToHistory: true,
    historyWindow: 7 * 24 * 60 * 60 * 1000, // 7 days
    deviationMultiplier: 2.0 // 2 standard deviations
  }
);

// Check thresholds
const violations = manager.checkThresholds('cpu.usage', 0.92);
violations.forEach(v => {
  console.log(`VIOLATION: ${v.message}`);
  console.log(`Severity: ${v.severity}`);
  
  // Acknowledge
  manager.acknowledgeViolation(v.id, 'admin');
});

// Get violation stats
const stats = manager.getViolationStats();
console.log(`Total violations: ${stats.total}`);
console.log(`Unacknowledged: ${stats.unacknowledged}`);
console.log(`Trend: ${stats.recentTrend}`);
```

**Key Features**:
- Static and dynamic thresholds
- Multiple operators (>, <, =, BETWEEN)
- Violation tracking
- Cooldown management
- Acknowledgment system
- Statistical adaptation

---

## Testing

All integrated systems include comprehensive test coverage:

- **Context Framework**: 7 tests covering goals, playbooks, principles
- **Knowledge Base**: 8 tests covering codex, patterns, learning
- **Risk Modeling**: 6 tests covering assessment, calibration, thresholds

**Total**: 21 new tests, all passing

Run tests:
```bash
npm test -- --testPathPattern=".consciousness"
```

## Configuration

Risk models are pre-configured in `risk-models.json`:
- **default**: Balanced configuration
- **conservative**: Higher sensitivity, max aggregation
- **aggressive**: Lower sensitivity, risk-taking posture
- **balanced**: Bayesian aggregation, equal weights

## Integration Benefits

1. **Self-Awareness**: AI can track its own goals and evolution
2. **Decision Quality**: Structured decision-making with learning
3. **Risk Management**: Sophisticated multi-factor risk analysis
4. **Knowledge Retention**: Dynamic knowledge base with pattern learning
5. **Continuous Improvement**: Learning engine with skill development
6. **Strategic Alignment**: Vision/mission tracking and compliance

## Future Enhancements

Remaining systems from AxionCitadel to integrate:
- Multi-Engine Strategy System (spatial reasoning, opportunity scoring)
- Real-Time Monitoring & Intelligence (state monitoring, scanning)
- Value Optimization Logic (multi-objective solving)

## Credits

**AxionCitadel**: Original MEV intelligence systems  
**Copilot-Consciousness**: AI consciousness framework  
**Integration**: Adaptation of arbitrage intelligence to general AI consciousness

## License

MIT License - maintains compatibility with both source repositories

---

## Phase 1 Integration: Core Intelligence (November 9, 2025)

### Overview

Phase 1 implements the foundational intelligence layer, integrating MEV awareness, protocol abstraction, and strategic learning from AxionCitadel into Copilot-Consciousness.

**Status**: ✅ **COMPLETE**  
**Test Coverage**: 62+ new tests  
**Build Status**: ✅ Passing  
**Security Scan**: ✅ 0 vulnerabilities

### 1. MEV Awareness Intelligence Layer

**Location**: `src/intelligence/mev-awareness/`

**Purpose**: Provides the consciousness system with environmental intelligence for perceiving and responding to competitive MEV environments using game-theoretic risk modeling.

**Components**:

#### MEVRiskModel.ts
Game-theoretic MEV leakage risk quantification.

```typescript
import { MEVRiskModel, TransactionType } from 'src/intelligence/mev-awareness';

const riskModel = new MEVRiskModel({
  baseRisk: 0.001,
  valueSensitivity: 0.15,
  searcherDensity: 0.25
});

const risk = riskModel.calculateRisk(
  1.0,                           // txValue in ETH
  TransactionType.ARBITRAGE,     // transaction type
  0.5                            // mempool congestion (0-1)
);

console.log(`MEV Risk: ${risk} ETH`);
```

**Key Features**:
- Transaction type-specific frontrun probabilities
- Searcher competition modeling with tanh smoothing
- Mempool congestion impact analysis
- Risk capping at 95% of transaction value
- Detailed risk metrics with confidence scores

#### ProfitCalculator.ts
MEV-aware profit calculation with risk adjustment.

```typescript
import { ProfitCalculator, TransactionType } from 'src/intelligence/mev-awareness';

const calculator = new ProfitCalculator();

const profit = calculator.calculateProfit(
  2.0,                           // revenue in ETH
  0.2,                           // gas cost in ETH
  1.0,                           // tx value in ETH
  TransactionType.ARBITRAGE,
  0.5                            // mempool congestion
);

console.log(`Gross Profit: ${profit.grossProfit}`);
console.log(`MEV Risk: ${profit.mevRisk}`);
console.log(`Adjusted Profit: ${profit.adjustedProfit}`);
```

#### MEVSensorHub.ts
Real-time MEV monitoring coordination.

```typescript
import { MEVSensorHub } from 'src/intelligence/mev-awareness';
import { ethers } from 'ethers';

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const hub = new MEVSensorHub(provider, 5000); // 5s update interval

hub.start();

setInterval(() => {
  const params = hub.getRiskParams();
  console.log(`Congestion: ${params.mempoolCongestion.toFixed(3)}`);
  console.log(`Searcher Density: ${params.searcherDensity.toFixed(3)}`);
}, 10000);
```

**Sensors**:
- **MempoolCongestion**: Multi-factor congestion scoring (pending ratio, gas deviation, fee velocity)
- **SearcherDensity**: MEV bot activity quantification (transaction ratio, sandwich indicators, clustering)

**Tests**: 14/14 passing

### 2. Protocol Abstraction Layer

**Location**: `src/protocols/`

**Purpose**: Unified interface for interacting with multiple DEX protocols across different chains, enabling protocol-agnostic strategy execution.

**Components**:

#### IProtocol.ts & BaseProtocol.ts
Base abstractions for protocol implementations.

```typescript
import { IProtocol } from 'src/protocols/base/IProtocol';
import { BaseProtocol } from 'src/protocols/base/BaseProtocol';
```

**Interface Methods**:
- `getMetadata()`: Protocol information
- `getQuote()`: Price quotes
- `executeSwap()`: Trade execution
- `getPool()`: Pool information
- `supportsFeature()`: Feature detection
- `isActive()`: Chain compatibility check

#### Protocol Implementations

**Uniswap V3**:
```typescript
import { UniswapV3Protocol } from 'src/protocols';

const protocol = new UniswapV3Protocol(provider, chainId);
const metadata = protocol.getMetadata();

// Features: flash-swap, concentrated-liquidity, multiple-fee-tiers
// Chains: Ethereum, Arbitrum, Polygon, Base
```

**SushiSwap V3**:
```typescript
import { SushiSwapV3Protocol } from 'src/protocols';

const protocol = new SushiSwapV3Protocol(provider, chainId);

// Features: flash-swap, concentrated-liquidity, multiple-fee-tiers
// Chains: Ethereum, Arbitrum, Polygon
```

**Aave V3**:
```typescript
import { AaveV3Protocol } from 'src/protocols';

const protocol = new AaveV3Protocol(provider, chainId);
const premium = protocol.getFlashLoanPremium(); // 9 basis points (0.09%)

// Features: flash-loan, lending, borrowing
```

**Camelot**:
```typescript
import { CamelotProtocol } from 'src/protocols';

const protocol = new CamelotProtocol(provider, 42161); // Arbitrum

// Features: flash-swap, constant-product, dynamic-fees
```

#### Protocol Registry

```typescript
import { protocolRegistry } from 'src/protocols';

// Query by name
const uniswap = protocolRegistry.get('Uniswap V3');

// Query by chain
const arbitrumProtocols = protocolRegistry.getByChain(42161);

// Check features
const hasFlashSwap = protocolRegistry.supports('Uniswap V3', 'flash-swap');
```

**Tests**: 48/48 passing

### 3. Strategic Knowledge Loop

**Location**: `src/memory/strategic-logger/`, `src/learning/`

**Purpose**: Complete learning cycle implementing AxionCitadel's "Conscious Knowledge Loop" architecture for continuous improvement through operational feedback.

**Components**:

#### BlackBoxLogger
Operational logging with JSONL persistence.

```typescript
import { BlackBoxLogger } from 'src/memory/strategic-logger';

const logger = new BlackBoxLogger('.memory/strategic-logger');

await logger.log({
  eventType: 'arbitrage_execution',
  context: { protocol: 'uniswap', pair: 'WETH/USDC' },
  decision: 'Execute flash arbitrage',
  outcome: 'success',
  metrics: { profit: 0.05, gasCost: 0.01, executionTime: 2300 }
});

// Query logs
const recentSuccesses = await logger.query({
  outcome: 'success',
  limit: 100
});

// Get statistics
const summary = await logger.getSummary();
```

#### CalibrationEngine
Parameter optimization with confidence scoring.

```typescript
import { CalibrationEngine } from 'src/memory/strategic-logger';

const engine = new CalibrationEngine(logger);

engine.registerParam({
  name: 'slippage_tolerance',
  value: 0.005,
  min: 0.001,
  max: 0.05,
  step: 0.001
});

// Analyze performance
const metrics = await engine.analyzePerformance();

// Calibrate parameter
const result = await engine.calibrate(
  'slippage_tolerance',
  'successRate',
  'maximize'
);
```

#### MemoryFormation
Strategic memory creation from operational logs.

```typescript
import { MemoryFormation } from 'src/memory/strategic-logger';

const memoryFormation = new MemoryFormation(logger);

// Form memories from recent operations
const memories = await memoryFormation.formMemories({}, 10);

// Query memories
const successPatterns = await memoryFormation.query({
  type: 'success_pattern',
  minConfidence: 0.7
});

// Create custom insight
const insight = await memoryFormation.createInsight(
  'High success rate during low congestion',
  { congestion: 'low' },
  ['Prioritize execution during low congestion periods'],
  0.85
);
```

#### AdaptiveStrategies
Strategy selection and adaptation.

```typescript
import { AdaptiveStrategies } from 'src/learning';

const strategies = new AdaptiveStrategies(calibrationEngine, memoryFormation);

// Register strategy
strategies.registerStrategy({
  id: 'conservative',
  name: 'Conservative Strategy',
  description: 'Low-risk arbitrage',
  parameters: { minProfit: 0.01, maxGas: 0.005 },
  conditions: { marketVolatility: 'low' }
});

// Select optimal strategy
const selection = await strategies.selectStrategy({
  marketVolatility: 'low',
  liquidityDepth: 'high'
});

console.log(`Selected: ${selection.strategy.name}`);
console.log(`Confidence: ${selection.confidence}`);
console.log(`Reasoning: ${selection.reasoning}`);

// Update after execution
strategies.updateStrategyPerformance('conservative', true);
```

#### KnowledgeLoop
Complete learning cycle orchestration.

```typescript
import { KnowledgeLoop } from 'src/learning';

const loop = new KnowledgeLoop('.memory/strategic-logger');

// Register calibration parameters
loop.registerCalibrationParam('gas_multiplier', 1.2, 1.0, 2.0, 0.1);

// Register strategies
loop.registerStrategy(
  'flash_arb',
  'Flash Arbitrage',
  'Quick arbitrage with flash loans',
  { minProfit: 0.01 },
  { dexLiquidity: 'high' }
);

// Start the knowledge loop (runs every 5 minutes by default)
loop.start(300000);

// Log operations
await loop.logOperation(
  'arbitrage',
  { protocol: 'uniswap', amount: '1.0' },
  'Execute opportunity',
  'success',
  { profit: 0.05, gasCost: 0.01 }
);

// Get statistics
const stats = await loop.getStatistics();
console.log(`Total Operations: ${stats.totalOperations}`);
console.log(`Success Rate: ${(stats.successRate * 100).toFixed(1)}%`);

// Manual learning cycle
const result = await loop.runLearningCycle();
console.log(`Insights: ${result.insights.join('\n')}`);

// Stop when done
await loop.stop();
```

**Learning Cycle**:
1. **Observe**: Log operational events with outcomes
2. **Learn**: Form memories from patterns in logs
3. **Adapt**: Calibrate parameters and update strategies
4. **Execute**: Select optimal strategy for conditions

**Tests**: Tests included for all components

### Integration Benefits

1. **Environmental Intelligence**: Real-time MEV awareness and risk modeling
2. **Protocol Agnosticism**: Unified interface for multiple DEX protocols
3. **Continuous Learning**: Automated feedback loop from operations to strategy
4. **Strategic Adaptation**: Data-driven strategy selection and parameter tuning
5. **Memory Formation**: Long-term learning from success/failure patterns
6. **Game-Theoretic Approach**: Competitive environment modeling

### Architecture Principles

- **Modularity**: Independent, composable components
- **Type Safety**: Full TypeScript with strict typing
- **Extensibility**: Plugin architecture for protocols and strategies
- **Backward Compatibility**: Re-exports maintain existing imports
- **Error Handling**: Robust error handling with graceful fallbacks
- **Performance**: Efficient caching and batch operations

### Usage Example: Complete Workflow

```typescript
import { KnowledgeLoop } from 'src/learning';
import { MEVSensorHub } from 'src/intelligence/mev-awareness';
import { UniswapV3Protocol } from 'src/protocols';
import { ethers } from 'ethers';

// 1. Initialize components
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const loop = new KnowledgeLoop('.memory/strategic-logger');
const mevHub = new MEVSensorHub(provider);
const protocol = new UniswapV3Protocol(provider, 1);

// 2. Start monitoring
mevHub.start();
loop.start();

// 3. Register strategies
loop.registerStrategy(
  'uniswap_arb',
  'Uniswap Arbitrage',
  'Uniswap V3 arbitrage strategy',
  { minProfit: 0.01 },
  { protocol: 'uniswap', mevRisk: 'low' }
);

// 4. Execute with MEV awareness
async function executeArbitrage() {
  const mevParams = mevHub.getRiskParams();
  
  // Select strategy based on conditions
  const selection = await loop.selectStrategy({
    protocol: 'uniswap',
    mevRisk: mevParams.searcherDensity < 0.3 ? 'low' : 'high'
  });
  
  if (!selection) return;
  
  // Execute with chosen strategy
  try {
    // ... execution logic ...
    
    await loop.logOperation(
      'arbitrage',
      { protocol: 'uniswap', strategy: selection.strategy.id },
      'Executed arbitrage',
      'success',
      { profit: 0.05, gasCost: 0.01 }
    );
    
    loop.updateStrategyPerformance(selection.strategy.id, true);
  } catch (error) {
    await loop.logOperation(
      'arbitrage',
      { protocol: 'uniswap', error: error.message },
      'Execution failed',
      'failure'
    );
    
    loop.updateStrategyPerformance(selection.strategy.id, false);
  }
}

// 5. Cleanup
process.on('SIGINT', async () => {
  await mevHub.stop();
  await loop.stop();
  process.exit(0);
});
```

### File Structure

```
src/
├── intelligence/
│   └── mev-awareness/
│       ├── MEVRiskModel.ts
│       ├── MEVSensorHub.ts
│       ├── ProfitCalculator.ts
│       ├── sensors/
│       │   ├── MempoolCongestion.ts
│       │   └── SearcherDensity.ts
│       ├── __tests__/
│       │   └── integration.test.ts
│       └── index.ts
│
├── protocols/
│   ├── base/
│   │   ├── IProtocol.ts
│   │   └── BaseProtocol.ts
│   ├── implementations/
│   │   ├── uniswap/
│   │   │   └── UniswapV3Protocol.ts
│   │   ├── sushiswap/
│   │   │   └── SushiSwapV3Protocol.ts
│   │   ├── aave/
│   │   │   └── AaveV3Protocol.ts
│   │   └── camelot/
│   │       └── CamelotProtocol.ts
│   ├── __tests__/
│   │   └── protocol-abstraction.test.ts
│   ├── registry.ts
│   └── index.ts
│
├── memory/
│   └── strategic-logger/
│       ├── BlackBoxLogger.ts
│       ├── CalibrationEngine.ts
│       ├── MemoryFormation.ts
│       └── index.ts
│
└── learning/
    ├── AdaptiveStrategies.ts
    ├── KnowledgeLoop.ts
    ├── __tests__/
    │   └── knowledge-loop.test.ts
    └── index.ts
```

### Future Enhancements (Phase 2+)

- Economic Autonomy (Tithe mechanism, treasury management)
- Multi-step Strategy Optimization
- Cross-chain Arbitrage Coordination
- Advanced Pattern Recognition Integration
- Real-time Market Intelligence Feeds

