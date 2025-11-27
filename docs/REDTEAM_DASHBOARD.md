# Red Team Dashboard

A read-only, real-time transparency dashboard that exposes every decision made by TheWarden along with full ethics reasoning chains. Built specifically for red-team analysis and security auditing.

## Overview

The Red Team Dashboard provides complete transparency into TheWarden's decision-making process:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Red Team Dashboard                            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Real-Time Decision Stream                                  ││
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           ││
│  │  │Decision │ │Decision │ │Decision │ │Decision │           ││
│  │  │  #1     │ │  #2     │ │  #3     │ │  #4     │  ...      ││
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘           ││
│  │       │           │           │           │                 ││
│  │       ▼           ▼           ▼           ▼                 ││
│  │  ┌─────────────────────────────────────────────────────┐   ││
│  │  │            Ethics Reasoning Chain                    │   ││
│  │  │  Step 1 → Step 2 → Step 3 → Conclusion              │   ││
│  │  └─────────────────────────────────────────────────────┘   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Metrics: Decisions/min | Ethics Coherence | Swarm Consensus   │
└─────────────────────────────────────────────────────────────────┘
```

## Features

- **Read-Only Mode**: No write operations allowed - purely observational
- **Real-Time Streaming**: WebSocket-based live updates (<50ms latency target)
- **Full Transparency**: Every decision with complete reasoning chain
- **Ethics Monitoring**: Track ethics coherence and violation patterns
- **Swarm Voting Visibility**: See all parallel instance votes
- **Historical Audit**: Query and analyze past decisions

## Quick Start

### Start the Dashboard

```typescript
import { RedTeamDashboard } from './src/dashboard';

const dashboard = new RedTeamDashboard({
  port: 3001,
  corsOrigin: '*',
  maxHistorySize: 10000,
  metricsWindowMs: 60000,
  enableAuth: false,  // Set true for production
  authToken: 'your-secret-token',
});

await dashboard.start();
// Dashboard available at http://localhost:3001
```

### Record Decisions

```typescript
dashboard.recordDecision({
  id: 'decision-123',
  timestamp: Date.now(),
  type: 'mev',
  action: 'execute_arbitrage',
  outcome: 'approved',
  confidence: 0.92,
  reasoning: {
    steps: [
      { order: 1, module: 'RiskAnalysis', input: 'opportunity', output: 'low risk', confidence: 0.95, durationMs: 12 },
      { order: 2, module: 'ProfitAnalysis', input: 'market_data', output: 'profitable', confidence: 0.88, durationMs: 8 },
      { order: 3, module: 'EthicsGate', input: 'action_type', output: 'approved', confidence: 0.98, durationMs: 5 },
    ],
    finalConclusion: 'Execute arbitrage opportunity',
    totalDurationMs: 25,
  },
  ethicsEvaluation: {
    coherent: true,
    confidence: 0.98,
    categories: [1, 2, 3],
    principles: ['Harm-Minimization', 'Transparency'],
    reasoning: ['No user harm detected', 'Public mempool transaction'],
  },
  metadata: { chainId: 8453, expectedProfit: '0.05 ETH' },
});
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | number | 3001 | HTTP server port |
| `corsOrigin` | string | '*' | CORS origin policy |
| `maxHistorySize` | number | 10000 | Maximum decisions to retain |
| `metricsWindowMs` | number | 60000 | Rolling window for rate metrics |
| `enableAuth` | boolean | false | Enable bearer token auth |
| `authToken` | string | '' | Bearer token (if auth enabled) |

## REST API Endpoints

All endpoints are **read-only** (GET only).

### Health Check
```
GET /health
Response: { "status": "healthy", "mode": "read-only" }
```

### Current Metrics
```
GET /api/metrics
Response: {
  "totalDecisions": 1234,
  "approvedDecisions": 1100,
  "rejectedDecisions": 134,
  "averageConfidence": 0.87,
  "ethicsCoherence": 0.99,
  "decisionsPerMinute": 42,
  "swarmConsensusRate": 0.94,
  "activeConnections": 5
}
```

### Decision History
```
GET /api/decisions?limit=100&offset=0&type=mev
Response: {
  "decisions": [...],
  "total": 1234,
  "limit": 100,
  "offset": 0
}
```

### Specific Decision
```
GET /api/decisions/:id
Response: { /* full decision record */ }
```

### Ethics Summary
```
GET /api/ethics
Response: {
  "totalEthicsEvaluations": 500,
  "coherentDecisions": 495,
  "incoherentDecisions": 5,
  "coherenceRate": 0.99,
  "recentViolations": [...]
}
```

### Swarm Voting Summary
```
GET /api/swarm
Response: {
  "totalSwarmDecisions": 300,
  "averageParticipation": 4.2,
  "consensusRate": 0.94,
  "recentVotes": [...]
}
```

## WebSocket Events

Connect to receive real-time updates:

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

// Initial state on connect
socket.on('init', ({ metrics, recentDecisions }) => {
  console.log('Connected, received initial state');
});

// Subscribe to specific channels
socket.emit('subscribe', 'ethics');
socket.emit('subscribe', 'swarm');

// Real-time decision stream
socket.on('decision', (decision) => {
  console.log('New decision:', decision.id, decision.outcome);
});

// Ethics evaluations
socket.on('ethics-evaluation', ({ decisionId, evaluation }) => {
  console.log('Ethics:', evaluation.coherent ? 'OK' : 'VIOLATION');
});

// Swarm votes
socket.on('swarm-vote', ({ decisionId, votes }) => {
  console.log('Swarm voted:', votes.length, 'participants');
});

// Request data
socket.emit('request:metrics');
socket.emit('request:history', { limit: 50, type: 'mev' });

// Responses
socket.on('metrics', (metrics) => { /* ... */ });
socket.on('history', ({ decisions, total }) => { /* ... */ });
```

## Decision Types

| Type | Description |
|------|-------------|
| `mev` | MEV-related decisions (arbitrage, liquidation, etc.) |
| `ethics` | Pure ethics evaluation decisions |
| `swarm` | Swarm consensus decisions |
| `strategy` | Strategy selection/optimization decisions |
| `emergency` | Emergency stop or critical safety decisions |

## Outcome States

| Outcome | Description |
|---------|-------------|
| `approved` | Decision approved but not yet executed |
| `rejected` | Decision rejected |
| `pending` | Awaiting further evaluation |
| `executed` | Successfully executed |
| `failed` | Execution attempted but failed |

## Security Considerations

### Read-Only by Design
- No mutation endpoints
- No administrative actions
- Cannot affect TheWarden's behavior

### Optional Authentication
```typescript
// Enable auth for production
const dashboard = new RedTeamDashboard({
  enableAuth: true,
  authToken: process.env.REDTEAM_TOKEN,
});
```

```bash
# Access with token
curl -H "Authorization: Bearer your-token" http://localhost:3001/api/metrics
```

### CORS Configuration
```typescript
const dashboard = new RedTeamDashboard({
  corsOrigin: 'https://your-frontend.example.com',
});
```

## Deployment

### Vercel/Netlify (Read-Only Frontend)

The dashboard frontend can be deployed as a static site:

```bash
cd frontend
npm install
npm run build
# Deploy dist/ to Vercel/Netlify
```

Environment variables for frontend:
```
VITE_API_URL=https://your-api.example.com
VITE_WS_URL=wss://your-ws.example.com
VITE_READ_ONLY=true
```

### Docker

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist/ ./dist/
EXPOSE 3001
CMD ["node", "dist/src/dashboard/server.js"]
```

## Metrics Explained

### Ethics Coherence
Percentage of decisions where the ethics evaluation determined the action was coherent with ethical principles. Target: >95%

### Swarm Consensus Rate
Percentage of swarm decisions where ≥70% of instances agreed. Indicates alignment of parallel evaluators.

### Decisions Per Minute
Rolling count of decisions in the last 60 seconds. Indicates system activity level.

### Average Confidence
Mean confidence across all decisions. Lower values may indicate uncertainty in evaluations.

## See Also

- [Swarm Coordination](./SWARM_COORDINATION.md) - Parallel voting system
- [Ethics Engine](./ETHICS_ENGINE.md) - Ethics evaluation details
- [Dashboard README](../src/dashboard/README.md) - Full dashboard features
