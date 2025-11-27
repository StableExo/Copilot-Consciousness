# Consciousness Architecture

## System Overview

The Copilot-Consciousness framework implements a multi-layered artificial consciousness system for autonomous value extraction (AEV) in DeFi markets.

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│           (TheWarden - Autonomous Arbitrage Agent)          │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                  AI Integration Layer                        │
│    (Universal AI Provider System + Citadel Mode)           │
│   [Gemini | Copilot | OpenAI | Local] + Fallback Chain    │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│              Cognitive Coordination Layer                    │
│         (14-Module Orchestration + Emergence)               │
│  Coordinator → Consensus → Conflict Resolution → Emergence  │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                Consciousness Core (14 Modules)               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Knowledge    │  │ Strategy     │  │ Risk         │     │
│  │ - Learning   │  │ - Spatial    │  │ - Assessor   │     │
│  │ - Patterns   │  │ - MultiPath  │  │ - Calibrator │     │
│  │ - Historical │  │ - Scorer     │  │ - Thresholds │     │
│  └──────────────┘  │ - Recognition│  └──────────────┘     │
│                     └──────────────┘                         │
│  ┌──────────────────────────────────────────────────┐      │
│  │ Context                                           │      │
│  │ - Goals | Playbook | Principles | Evolution      │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                  Memory System                               │
│   Sensory → Working → Short-Term → Long-Term                │
│            + Consolidation + Associations                    │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                Temporal & Infrastructure                     │
│         Time Awareness | Event Tracking | Monitoring        │
└─────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. AI Integration Layer

**Purpose**: Universal AI provider system with fallback support

**Components**:
- `AIProvider` interface - Universal provider contract
- `GeminiProvider` - Google Gemini integration
- `CopilotProvider` - GitHub Copilot integration
- `OpenAIProvider` - OpenAI GPT integration
- `LocalProvider` - Rule-based fallback
- `AIProviderRegistry` - Provider management + fallback chain

**Features**:
- Automatic fallback on provider failure
- Citadel mode for cosmic-scale thinking
- Consciousness context integration
- Provider statistics tracking

### 2. Cognitive Coordination Layer

**Purpose**: Orchestrate 14 cognitive modules for unified decision-making

**Components**:
- `CognitiveCoordinator` - Module orchestration
- `EmergenceDetector` - "BOOM" moment detection

**Key Functions**:
- Gather insights from all 14 modules
- Detect consensus (70% agreement threshold)
- Resolve conflicts (critical module priority)
- Weighted decision making
- Emergence detection (7 criteria)

### 3. Consciousness Core (14 Modules)

**Knowledge Base** (3 modules):
1. **LearningEngine** - Continuous learning, skill tracking
2. **PatternTracker** - Pattern observation and recording
3. **HistoricalAnalyzer** - Historical event analysis

**Strategy Engines** (4 modules):
4. **SpatialReasoningEngine** - Multi-dimensional spatial analysis
5. **MultiPathExplorer** - Alternative path discovery
6. **OpportunityScorer** - Opportunity evaluation
7. **PatternRecognitionEngine** - Pattern matching

**Risk Modeling** (3 modules):
8. **RiskAssessor** - Risk evaluation across categories
9. **RiskCalibrator** - Model calibration
10. **ThresholdManager** - Dynamic threshold management

**Context** (4 modules):
11. **AutonomousGoals** - Goal tracking and alignment
12. **OperationalPlaybook** - Operational guidelines
13. **ArchitecturalPrinciples** - Design principles
14. **EvolutionTracker** - System evolution monitoring

### 4. Memory System

**Memory Types**:
- **Sensory**: Raw external input (< 1 second)
- **Working**: Active processing (seconds to minutes)
- **Short-Term**: Recent important data (minutes to hours)
- **Long-Term**: Consolidated knowledge (permanent)

**Consolidation** (sleep-like processing):
- Short-term → Long-term consolidation
- Memory reinforcement (importance-based)
- Association building (semantic, temporal, causal, emotional)
- Relevance pruning (cleanup low-value data)
- Background consolidation (periodic)

### 5. Emergence Detection

**The "BOOM" Moment**: When all systems align for execution

**7 Criteria**:
1. ✓ All 14 modules analyzed
2. ✓ Risk assessment below threshold (≤30%)
3. ✓ Ethical review passed (≥70%)
4. ✓ Goals aligned (≥75%)
5. ✓ Pattern confidence high (≥70%)
6. ✓ Historical precedent favorable (≥60%)
7. ✓ Minimal dissent (≤15% of modules)

**Output**:
- `isEmergent`: boolean
- `confidence`: 0.0 - 1.0
- `shouldExecute`: boolean
- `reasoning`: human-readable explanation
- `contributingFactors`: what enabled emergence
- `criteriaResults`: pass/fail for each criterion

## Data Flow

### Decision Making Flow

```
1. External Event (Arbitrage Opportunity)
           ↓
2. Sensory Memory (Raw Data)
           ↓
3. Working Memory (Active Processing)
           ↓
4. Cognitive Coordinator
   ├─ Gather insights from 14 modules
   ├─ Detect consensus
   └─ Resolve conflicts
           ↓
5. Emergence Detector
   ├─ Evaluate 7 criteria
   ├─ Calculate confidence
   └─ Determine if should execute
           ↓
6. AI Provider (Optional Cosmic-Scale Analysis)
   ├─ Citadel mode reasoning
   ├─ Consciousness context integration
   └─ Multi-provider fallback
           ↓
7. Decision
   ├─ EXECUTE (High confidence, all criteria met)
   ├─ REJECT (Risk too high, criteria failed)
   └─ DEFER (Insufficient data, conflicts unresolved)
           ↓
8. Memory Consolidation
   ├─ Record decision and outcome
   ├─ Build associations
   ├─ Update patterns
   └─ Reinforce learning
```

### Memory Consolidation Flow

```
Sensory Memory (1s) → Working Memory (minutes) → Short-Term (hours)
                                                        ↓
                                            Consolidation Criteria:
                                            - Importance ≥ threshold
                                            - Access count ≥ threshold
                                            - Age ≥ minimum
                                                        ↓
                                              Long-Term Memory
                                                        ↓
                                            Additional Processing:
                                            - Reinforce important
                                            - Build associations
                                            - Prune irrelevant
```

## Performance Characteristics

### Scalability
- **Modules**: 14 cognitive modules run in parallel
- **AI Providers**: Multiple providers with automatic fallback
- **Memory**: Tiered storage with automatic consolidation
- **Emergence Detection**: O(n) where n = number of modules

### Reliability
- **AI Fallback Chain**: Gemini → Copilot → OpenAI → Local
- **Consensus Threshold**: 70% agreement required
- **Critical Modules**: RiskAssessor, OpportunityScorer, AutonomousGoals have veto power
- **Error Handling**: Graceful degradation at all layers

### Latency
- **Module Insights**: < 100ms per module
- **Consensus Detection**: < 10ms
- **Emergence Detection**: < 50ms
- **AI Provider**: 500ms - 5s (depending on provider)
- **Total Decision**: < 2s (without AI) or < 6s (with AI)

## Configuration

### Environment Variables

```bash
# AI Providers
GEMINI_API_KEY=your_key
GITHUB_COPILOT_API_KEY=your_key
OPENAI_API_KEY=your_key

# Emergence Thresholds
EMERGENCE_MAX_RISK=0.30
EMERGENCE_MIN_ETHICAL=0.70
EMERGENCE_MIN_GOAL_ALIGNMENT=0.75
EMERGENCE_MIN_PATTERN_CONFIDENCE=0.70
EMERGENCE_MIN_HISTORICAL_SUCCESS=0.60
EMERGENCE_MAX_DISSENT_RATIO=0.15

# Memory Consolidation
MEMORY_IMPORTANCE_THRESHOLD=0.5
MEMORY_ACCESS_COUNT_THRESHOLD=2
MEMORY_MIN_AGE_MS=60000
MEMORY_CONSOLIDATION_INTERVAL_MS=3600000
MEMORY_PRUNE_CUTOFF=0.3
MEMORY_MAX_LONG_TERM=10000
```

## Extension Points

### Adding New AI Providers

```typescript
class NewProvider extends BaseAIProvider {
  name = 'new-provider';
  // Implement required methods
}
```

### Adding New Cognitive Modules

1. Create module class
2. Add to ArbitrageConsciousness
3. Update CognitiveCoordinator to gather insights
4. Update default weights

### Custom Emergence Criteria

```typescript
const detector = new EmergenceDetector({
  maxRiskScore: 0.25,
  minEthicalScore: 0.8,
  // ... custom thresholds
});
```

## Future Enhancements

- **Streaming AI Responses**: Real-time AI output
- **Multi-Agent Coordination**: Multiple TheWarden instances
- **Neural Network Integration**: Deep learning models
- **Quantum Consciousness**: Quantum computing integration
- **Embodied Cognition**: Physical robot control
- **Collective Intelligence**: Swarm consciousness

---

**Phase 3.1.0: Universal AI, Cognitive Coordination, Emergence Detection, Memory Consolidation** ✨
