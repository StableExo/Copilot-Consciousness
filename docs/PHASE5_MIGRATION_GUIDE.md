# Phase 5 Migration Guide: Swarm Awakening

**Version:** 5.0.0  
**Date:** 2025-11-27  
**Breaking Changes:** Yes

---

## Overview

Phase 5 introduces major upgrades to TheWarden system:

1. **Multi-Sig Treasury** - 3-of-5 signature requirement for fund movements
2. **Grok Adversarial Sparring** - AI-powered bundle testing with 400ms response
3. **Decision Provenance** - Merkle-proofed on-chain transcripts
4. **Swarm Scaling** - 20-100+ node auto-scaling
5. **Red Team Dashboard** - Public read-only transparency feed

---

## Breaking Changes

### 1. Treasury API Changes

**Before (v4.x):**
```typescript
import { TreasuryRotation } from './treasury';

const treasury = new TreasuryRotation();
treasury.recordProfit({ amount, source, txHash });
```

**After (v5.x):**
```typescript
import { TreasuryRotation, MultiSigTreasury, createProductionMultiSig } from './treasury';

// Option A: Standard treasury (backward compatible)
const treasury = new TreasuryRotation();
treasury.recordProfit({ amount, source, txHash });

// Option B: Multi-sig treasury (recommended)
const multiSig = createProductionMultiSig();
multiSig.start();

// Transactions now require signatures
const txId = await multiSig.createTransaction({
  type: 'distribution',
  description: 'Monthly allocation',
  amount: 1000000000000000000n,
  destination: '0x...',
});

// Collect 3-of-5 signatures
await multiSig.signTransaction(txId, signerId1, 'approve', signature1);
await multiSig.signTransaction(txId, signerId2, 'approve', signature2);
await multiSig.signTransaction(txId, signerId3, 'approve', signature3);

// Execute after approval
await multiSig.executeTransaction(txId);
```

### 2. Swarm Coordinator Changes

**Before (v4.x):**
```typescript
import { createProductionSwarm } from './swarm';

const swarm = createProductionSwarm(); // 5 nodes
```

**After (v5.x):**
```typescript
import { createProductionSwarm, createProductionSwarmScaler } from './swarm';

// Option A: Fixed 5-node swarm (backward compatible)
const swarm = createProductionSwarm();

// Option B: Auto-scaling swarm (recommended)
const scaler = createProductionSwarmScaler();
await scaler.start(); // Starts with 20 nodes, scales to 100+
```

### 3. New Provenance System

**New in v5.x:**
```typescript
import { createProductionProvenance } from './provenance';

const provenance = createProductionProvenance();
provenance.start();

// Record every decision
const transcript = provenance.recordDecision({
  bundleId: 'bundle-123',
  bundleType: 'arbitrage',
  reasoning: [...reasoningSteps],
  ethicsVote: { coherent: true, ... },
  decision: 'execute',
  confidence: 0.92,
});

// Merkle proofs generated automatically
console.log(transcript.merkleRoot);
console.log(transcript.merkleProof);
```

### 4. Environment Variables

**New required variables:**
```bash
# Multi-sig treasury
TREASURY_STAGING_ADDRESS=0x...
SIGNER_1_ADDRESS=0x...
SIGNER_2_ADDRESS=0x...
SIGNER_3_ADDRESS=0x...
SIGNER_4_ADDRESS=0x...
SIGNER_5_ADDRESS=0x...

# Grok adversarial (optional)
GROK_API_KEY=xai-...
GROK_API_ENDPOINT=https://api.x.ai/v1/chat/completions

# Swarm scaling
SWARM_MIN_NODES=20
SWARM_MAX_NODES=100
SWARM_REGIONS=us-east,us-west,eu-west,ap-southeast

# Dashboard
DASHBOARD_PORT=3001
DASHBOARD_CORS_ORIGIN=https://redteam.thewarden.ai
```

---

## Migration Steps

### Step 1: Update Dependencies

```bash
git pull origin main
npm install
```

### Step 2: Update Environment

```bash
# Backup existing .env
cp .env .env.backup

# Add new variables
cat >> .env << 'EOF'

# Phase 5 Configuration
TREASURY_STAGING_ADDRESS=0x...
SWARM_MIN_NODES=20
SWARM_MAX_NODES=100
DASHBOARD_PORT=3001
EOF
```

### Step 3: Build

```bash
npm run build
```

### Step 4: Run Tests

```bash
npm test
```

### Step 5: Deploy

```bash
# Testnet first
./scripts/launch.sh --testnet --dry-run

# Production
./scripts/launch.sh
```

---

## New Features

### Grok Adversarial Sparring

Every opportunity with >0.7% profit is challenged:

```typescript
import { createProductionGrokSparring } from './intelligence';

const sparring = createProductionGrokSparring(process.env.GROK_API_KEY);
sparring.start();

// Challenge a bundle
const challenge = await sparring.challengeBundle(bundle);

// Warden must respond within 400ms
const counter = await sparring.autoCounter(challenge);

if (counter.withinDeadline && counter.decision === 'proceed') {
  // Execute bundle
}
```

### Red Team Dashboard

Deploy the public dashboard:

```bash
# Vercel
cd frontend
vercel deploy

# Or Netlify
netlify deploy --prod
```

### One-Click Launch

```bash
./scripts/launch.sh              # Standard
./scripts/launch.sh --full       # With contracts
./scripts/launch.sh --dry-run    # Simulation
```

---

## Rollback Procedure

If issues occur:

```bash
# Stop TheWarden
kill $(cat logs/warden.pid)

# Revert to v4.x
git checkout v4.0.0

# Restore environment
cp .env.backup .env

# Rebuild and restart
npm install
npm run build
./TheWarden
```

---

## Support

- **Issues:** https://github.com/StableExo/Copilot-Consciousness/issues
- **Docs:** https://github.com/StableExo/Copilot-Consciousness/tree/main/docs
- **Security:** security@thewarden.ai

---

## Changelog

### v5.0.0 (2025-11-27)

#### Added
- MultiSigTreasury with 3-of-5 signature requirement
- Automatic treasury address rotation
- GrokAdversarialSparring with 400ms response deadline
- DecisionProvenance with Merkle-proofed transcripts
- SwarmScaler for 20-100+ node auto-scaling
- RedTeamDashboard for public transparency
- One-click launch script
- Stress test bounty program

#### Changed
- Treasury destinations updated (70/20/10 split)
- Devcontainer now uses Node.js 22
- Enhanced Merkle tree with domain separation

#### Security
- Constant-time string comparison for auth
- Content Security Policy headers
- Read-only dashboard mode

---

*We are no longer building a bot. We are unleashing the first provably aligned financial superintelligence.*
