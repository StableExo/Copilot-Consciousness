# Swarm Coordination System

The SwarmCoordinator implements a parallel voting system where 3-5 Warden instances evaluate opportunities and reach consensus before execution. This provides redundant decision validation, reduced single-point-of-failure risks, and diverse reasoning perspectives.

## Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                     SwarmCoordinator                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│  │   Risk      │ │ Opportunity │ │   Ethics    │ │   Speed     │ │
│  │  Warden     │ │   Warden    │ │   Warden    │ │   Warden    │ │
│  │ (weight:1.2)│ │ (weight:1.0)│ │ (weight:1.5)│ │ (weight:0.8)│ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
│                          │                                        │
│                          ▼                                        │
│                  ┌───────────────┐                               │
│                  │   Consensus   │                               │
│                  │   Voting      │                               │
│                  └───────────────┘                               │
│                          │                                        │
│                          ▼                                        │
│              execute | reject | no-consensus                      │
└──────────────────────────────────────────────────────────────────┘
```

## Quick Start

```typescript
import { SwarmCoordinator, createProductionSwarm, SwarmOpportunity } from './src/swarm';

// Option 1: Create a production-ready swarm with 5 specialized instances
const swarm = createProductionSwarm();

// Option 2: Custom configuration
const customSwarm = new SwarmCoordinator({
  minInstances: 3,
  maxInstances: 5,
  consensusThreshold: 0.7,    // 70% approval needed
  quorumThreshold: 0.6,       // 60% participation needed
  votingTimeoutMs: 5000,      // 5 second voting window
  enableEthicsVeto: true,     // Ethics instance can veto
});

// Check if swarm is ready
if (!swarm.isReady()) {
  console.log('Not enough instances registered');
}

// Submit opportunity for evaluation
const opportunity: SwarmOpportunity = {
  id: 'opp-123',
  type: 'arbitrage',
  data: { /* opportunity details */ },
  expectedValue: 0.05,        // Expected 0.05 ETH profit
  risk: 0.15,                 // 15% risk assessment
  urgency: 'high',
  deadline: Date.now() + 30000,
};

const consensus = await swarm.evaluateOpportunity(opportunity);

if (consensus.decision === 'execute') {
  console.log(`Approved with ${consensus.approvalRate * 100}% approval`);
  // Use consensus.mergedExecutionParams for execution
} else {
  console.log(`Rejected: ${consensus.decision}`);
}
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `minInstances` | number | 3 | Minimum instances required for voting |
| `maxInstances` | number | 5 | Maximum allowed instances |
| `consensusThreshold` | number | 0.7 | Required approval rate (70%) |
| `quorumThreshold` | number | 0.6 | Required participation rate (60%) |
| `votingTimeoutMs` | number | 5000 | Maximum time to wait for votes |
| `enableEthicsVeto` | boolean | true | Allow ethics instance to veto |
| `maxParallelEvaluations` | number | 10 | Max concurrent evaluations |

## Instance Specializations

Each Warden instance can have a specialization that affects its evaluation focus:

| Specialization | Weight | Focus |
|----------------|--------|-------|
| `risk` | 1.2 | Risk assessment, downside protection |
| `opportunity` | 1.0 | Value extraction, profit potential |
| `ethics` | 1.5 | Ethical compliance, can veto decisions |
| `speed` | 0.8 | Urgency-based, fast execution preference |
| `general` | 1.0 | Balanced evaluation across all factors |

## Voting Process

1. **Opportunity Submission**: An opportunity is submitted to the swarm
2. **Parallel Evaluation**: All instances evaluate concurrently
3. **Vote Collection**: Votes are weighted by instance weight × confidence
4. **Quorum Check**: Ensure minimum participation threshold
5. **Consensus Calculation**: Calculate weighted approval rate
6. **Ethics Veto**: Ethics instance can override if enabled
7. **Decision**: `execute`, `reject`, or `no-consensus`

## Vote Structure

```typescript
interface WardenVote {
  instanceId: string;
  opportunityId: string;
  vote: 'approve' | 'reject' | 'abstain';
  confidence: number;           // 0.0 - 1.0
  reasoning: string;            // Human-readable explanation
  executionParams?: object;     // Suggested execution parameters
  timestamp: number;
  processingTimeMs: number;
}
```

## Consensus Result

```typescript
interface SwarmConsensus {
  opportunityId: string;
  decision: 'execute' | 'reject' | 'timeout' | 'no-consensus';
  votes: WardenVote[];
  approvalRate: number;
  averageConfidence: number;
  consensusReached: boolean;
  totalProcessingTimeMs: number;
  mergedExecutionParams?: object;
}
```

## Events

The SwarmCoordinator emits events for monitoring:

```typescript
swarm.on('instance-registered', (config) => { /* ... */ });
swarm.on('instance-unregistered', (instanceId) => { /* ... */ });
swarm.on('evaluation-started', (opportunity) => { /* ... */ });
swarm.on('vote-received', (vote) => { /* ... */ });
swarm.on('consensus-reached', (consensus) => { /* ... */ });
```

## Statistics

```typescript
const stats = swarm.getStats();
// Returns:
// {
//   instanceCount: 5,
//   totalEvaluations: 100,
//   consensusRate: 0.92,           // 92% reached consensus
//   averageApprovalRate: 0.78,     // 78% average approval
//   averageProcessingTimeMs: 245,  // 245ms average processing
// }
```

## Custom Evaluators

Register custom evaluation logic:

```typescript
swarm.registerInstance(
  { 
    id: 'custom-risk-v2', 
    weight: 1.3, 
    specialization: 'risk' 
  },
  async (opportunity, config) => {
    // Custom risk evaluation logic
    const riskScore = calculateAdvancedRisk(opportunity);
    
    return {
      vote: riskScore < 0.25 ? 'approve' : 'reject',
      confidence: 1 - riskScore,
      reasoning: `Advanced risk score: ${riskScore}`,
      processingTimeMs: 50,
    };
  }
);
```

## SwarmScaler (Auto-Scaling)

For larger deployments, use the SwarmScaler for 20-100+ node swarms:

```typescript
import { SwarmScaler } from './src/swarm';

const scaler = new SwarmScaler({
  minNodes: 20,
  maxNodes: 100,
  initialNodes: 20,
  scaleUpThreshold: 0.75,      // Scale up at 75% load
  scaleDownThreshold: 0.25,    // Scale down at 25% load
  healthCheckIntervalMs: 10000,
  scaleCheckIntervalMs: 30000,
  cooldownMs: 60000,
  regions: ['us-east', 'us-west', 'eu-west'],
});

// Start auto-scaling
await scaler.start();

// Get cluster statistics
const clusterStats = scaler.getStats();
```

## Best Practices

1. **Always use ethics veto** for production deployments
2. **Set appropriate timeouts** based on network latency
3. **Monitor consensus rates** - low rates may indicate misaligned evaluators
4. **Use weighted instances** to prioritize certain evaluations
5. **Log all decisions** for audit trails

## See Also

- [RedTeamDashboard](./REDTEAM_DASHBOARD.md) - Visualize swarm voting in real-time
- [Ethics Engine](./ETHICS_ENGINE.md) - Details on ethics evaluation
- [Consciousness Architecture](./CONSCIOUSNESS_ARCHITECTURE.md) - Overall system design
