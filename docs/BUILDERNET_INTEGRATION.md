# BuilderNet Integration

Integration with Flashbots BuilderNet - the decentralized block-building network introduced in December 2024.

## Overview

BuilderNet is Flashbots' solution to centralization risks in Ethereum's block-building ecosystem. It enables multiple operators to collaboratively build blocks using Trusted Execution Environments (TEEs) for privacy and security.

**Key Documentation:** https://buildernet.org/docs/architecture

## Architecture

BuilderNet consists of several key components:

### Builder Nodes
- Run block assembly logic inside TEEs (Intel SGX, AMD SEV, ARM TrustZone)
- Receive encrypted orderflow from users and wallets
- Share orderflow with peer nodes (when permitted)
- Submit candidate blocks to MEV-Boost relays

### BuilderHub
- Central service for peer discovery and secret provisioning
- Verifies TEE attestations before provisioning secrets
- Manages builder identity and configuration
- Checks node IP addresses for security

### TEE Attestation
- Remote attestation verifies code running in secure enclaves
- Proves builder nodes execute approved code
- Prevents malicious operators from accessing sensitive data
- Regular re-attestation required (configurable expiry)

## Features

### 1. TEE Attestation Tracking

Monitor and verify builder node attestations:

```typescript
import { BuilderNetIntelligence, TEEAttestationStatus } from 'aev-thewarden';

const builderNet = new BuilderNetIntelligence(provider, {
  endpoint: 'https://builderhub.flashbots.net',
  enableAttestationVerification: true,
  minAttestationAge: 60, // 1 minute minimum
  maxAttestationAge: 86400, // 24 hour expiry
  minReputationScore: 0.75,
});

// Record attestation
builderNet.recordAttestation({
  nodeId: 'flashbots-builder-1',
  attestationHash: '0x...',
  platform: 'Intel SGX',
  codeMeasurement: '0x...', // Hash of code running in TEE
  timestamp: Date.now(),
  expiresAt: Date.now() + 86400000,
  status: TEEAttestationStatus.VERIFIED,
});

// Verify attestation
const verification = builderNet.verifyAttestation('flashbots-builder-1');
if (verification.verified) {
  console.log('Node attestation verified ✅');
} else {
  console.log('Verification failed:', verification.reason);
}
```

### 2. Builder Node Management

Register and track builder nodes:

```typescript
builderNet.registerBuilderNode({
  operator: 'flashbots-builder-1',
  ipAddress: '10.0.1.100',
  attestationStatus: TEEAttestationStatus.VERIFIED,
  reputationScore: 0.9,
  isActive: true,
  connectedRelays: ['https://relay.flashbots.net'],
  orderflowSources: ['public', 'private-wallets'],
  lastActivity: new Date(),
});
```

### 3. Trust and Reputation

Get trusted builders based on attestation and reputation:

```typescript
const trustedBuilders = builderNet.getTrustedBuilderNodes();
// Returns only nodes with:
// - Verified TEE attestation
// - Reputation above threshold
// - Active status
// - Recent activity
```

Update reputation based on performance:

```typescript
builderNet.updateNodeReputation('flashbots-builder-1', true, 1.0); // Success
builderNet.updateNodeReputation('builder-2', false, 0.8); // Failure
```

### 4. Orderflow Recommendations

Get builder recommendations based on privacy level:

```typescript
// High privacy: only recent TEE attestations
const highPrivacy = builderNet.recommendBuildersForOrderflow('high');

// Medium privacy: any verified TEE
const mediumPrivacy = builderNet.recommendBuildersForOrderflow('medium');

// Low privacy: all active builders
const lowPrivacy = builderNet.recommendBuildersForOrderflow('low');
```

### 5. Orderflow Privacy Control

Check if orderflow can be safely shared between nodes:

```typescript
const canShare = builderNet.canShareOrderflow(
  'builder-1',
  'builder-2'
);
// Returns true only if:
// - Both nodes have verified attestations (if required)
// - Both meet minimum reputation
// - Peer sharing is enabled in config
```

### 6. Statistics and Monitoring

```typescript
const stats = builderNet.getStatistics();
console.log('Total Nodes:', stats.totalNodes);
console.log('Verified Nodes:', stats.verifiedNodes);
console.log('Trusted Nodes:', stats.trustedNodes);
console.log('Average Reputation:', stats.averageReputation);
```

## Configuration

### BuilderHub Config

```typescript
interface BuilderHubConfig {
  endpoint: string;                        // BuilderHub URL
  enableAttestationVerification: boolean;  // Verify TEE attestations
  minAttestationAge: number;              // Minimum age in seconds
  maxAttestationAge: number;              // Expiry age in seconds
  minReputationScore: number;             // Minimum trust threshold (0-1)
}
```

### Orderflow Privacy Config

```typescript
interface OrderflowPrivacyConfig {
  enableEncryption: boolean;        // End-to-end encryption
  requireTEEAttestation: boolean;   // Require verified TEE
  allowPeerSharing: boolean;        // Allow node-to-node sharing
  maxDistributionHops: number;      // Max sharing hops
}
```

## Security Best Practices

### 1. Always Verify Attestations

```typescript
const builderNet = new BuilderNetIntelligence(provider, {
  enableAttestationVerification: true, // Always enabled in production
});
```

### 2. Regular Attestation Cleanup

```typescript
// Remove expired attestations
setInterval(() => {
  const removed = builderNet.cleanupExpiredAttestations();
  console.log(`Cleaned up ${removed} expired attestations`);
}, 3600000); // Every hour
```

### 3. Reputation-Based Selection

```typescript
// Only use builders above reputation threshold
const trustedBuilders = builderNet.getTrustedBuilderNodes();
const bestBuilder = trustedBuilders[0]; // Highest reputation
```

### 4. Privacy Configuration

```typescript
// For sensitive orderflow
const privacyConfig = {
  enableEncryption: true,
  requireTEEAttestation: true,
  allowPeerSharing: false, // No sharing for sensitive data
  maxDistributionHops: 0,
};
```

## Integration with Existing Systems

### With FlashbotsIntelligence

```typescript
import { FlashbotsIntelligence, BuilderNetIntelligence } from 'aev-thewarden';

const flashbots = new FlashbotsIntelligence(provider);
const builderNet = new BuilderNetIntelligence(provider);

// Get trusted builders from BuilderNet
const trustedBuilders = builderNet.getTrustedBuilderNodes();

// Use with Flashbots bundle submission
const recommendedBuilders = flashbots.getRecommendedBuilders(3);

// Cross-reference for highest trust
const ultraTrusted = recommendedBuilders.filter(fb =>
  trustedBuilders.some(bn => bn.operator === fb.builder)
);
```

### With ArbitrageConsciousness

```typescript
import { ArbitrageConsciousness } from 'aev-thewarden';

const consciousness = new ArbitrageConsciousness();
const builderNet = new BuilderNetIntelligence(provider);

// Evaluate opportunity
const decision = await consciousness.evaluateOpportunity(opportunity);

if (decision.shouldExecute) {
  // Select trusted builders for execution
  const trustedBuilders = builderNet.getTrustedBuilderNodes();
  
  // Submit to builders with verified TEE attestation
  await submitToBuilders(transaction, trustedBuilders);
}
```

## Platform Support

### Supported TEE Platforms

- **Intel SGX** - Software Guard Extensions
- **AMD SEV** - Secure Encrypted Virtualization  
- **ARM TrustZone** - ARM's trusted execution environment

### Attestation Verification

Each platform has specific attestation formats:

```typescript
// Simulate attestation for testing
const attestation = builderNet.simulateRemoteAttestation(
  'test-node',
  'Intel SGX' // or 'AMD SEV', 'ARM TrustZone'
);
```

## Governance and Decentralization

BuilderNet is designed for progressive decentralization:

1. **Phase 1 (Current):** Centralized BuilderHub with select operators
2. **Phase 2:** Permissioned operator onboarding
3. **Phase 3:** Permissionless node deployment

The TEE attestation framework ensures security at all phases.

## Advanced Features

### Custom Attestation Verification

```typescript
// Implement custom verification logic
class CustomBuilderNet extends BuilderNetIntelligence {
  verifyAttestation(nodeId: string) {
    const base = super.verifyAttestation(nodeId);
    
    // Add custom checks
    const attestation = this.attestations.get(nodeId);
    if (attestation && attestation.metadata?.customField) {
      // Custom validation logic
    }
    
    return base;
  }
}
```

### Multiparty Collaboration

```typescript
// Track orderflow distribution
const sourceNode = 'builder-1';
const targetNodes = ['builder-2', 'builder-3'];

targetNodes.forEach(target => {
  if (builderNet.canShareOrderflow(sourceNode, target)) {
    console.log(`✅ Can share with ${target}`);
  }
});
```

## Troubleshooting

### Attestation Verification Fails

1. Check attestation age: `maxAttestationAge` may be too strict
2. Verify time sync: Clock skew can cause failures
3. Confirm platform support: TEE platform must match

### Low Trusted Node Count

1. Lower `minReputationScore` temporarily
2. Extend `maxAttestationAge` for initial bootstrap
3. Check `enableAttestationVerification` setting

### Orderflow Sharing Blocked

1. Verify both nodes have valid attestations
2. Check `allowPeerSharing` is enabled
3. Confirm reputation scores meet threshold

## Resources

- [BuilderNet Architecture](https://buildernet.org/docs/architecture)
- [Flashbots Infrastructure](https://buildernet.org/docs/flashbots-infra)
- [TEE Security Discussion](https://collective.flashbots.net/c/tee/28)
- [Introducing BuilderNet](https://buildernet.org/blog/introducing-buildernet)

## See Also

- [Flashbots Intelligence](./FLASHBOTS_INTELLIGENCE.md)
- [Private RPC Documentation](./PRIVATE_RPC.md)
- [MEV Intelligence Suite](./MEV_INTELLIGENCE_SUITE.md)
