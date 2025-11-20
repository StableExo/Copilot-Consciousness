/**
 * BuilderNet Intelligence Demo
 * 
 * Demonstrates integration with Flashbots BuilderNet:
 * - TEE attestation tracking
 * - Builder node reputation management
 * - Orderflow privacy configuration
 * - Remote attestation verification
 * 
 * New feature introduced December 2024
 */

import { ethers } from 'ethers';
import { BuilderNetIntelligence, TEEAttestationStatus } from '../src/intelligence/flashbots';

async function main() {
  console.log('=== BuilderNet Intelligence Demo ===\n');

  // Initialize provider
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.RPC_URL || 'https://eth.llamarpc.com'
  );

  // Create BuilderNet intelligence with custom configuration
  const builderNet = new BuilderNetIntelligence(
    provider,
    {
      endpoint: 'https://builderhub.flashbots.net',
      enableAttestationVerification: true,
      minAttestationAge: 60, // 1 minute
      maxAttestationAge: 86400, // 24 hours
      minReputationScore: 0.75, // 75% threshold
    },
    {
      enableEncryption: true,
      requireTEEAttestation: true,
      allowPeerSharing: false, // High privacy
      maxDistributionHops: 1,
    }
  );

  console.log('✅ BuilderNet Intelligence initialized\n');

  // === DEMO 1: Register builder nodes ===
  console.log('--- Demo 1: Registering Builder Nodes ---');
  
  builderNet.registerBuilderNode({
    operator: 'flashbots-builder-1',
    ipAddress: '10.0.1.100',
    attestationStatus: TEEAttestationStatus.NONE,
    reputationScore: 0.9,
    isActive: true,
    connectedRelays: ['https://relay.flashbots.net'],
    orderflowSources: ['public', 'private-wallets'],
    lastActivity: new Date(),
  });

  builderNet.registerBuilderNode({
    operator: 'beaverbuild-node-2',
    ipAddress: '10.0.1.101',
    attestationStatus: TEEAttestationStatus.NONE,
    reputationScore: 0.85,
    isActive: true,
    connectedRelays: ['https://relay.flashbots.net', 'https://relay.ultrasound.money'],
    orderflowSources: ['public'],
    lastActivity: new Date(),
  });

  builderNet.registerBuilderNode({
    operator: 'independent-builder-3',
    ipAddress: '10.0.1.102',
    attestationStatus: TEEAttestationStatus.NONE,
    reputationScore: 0.65, // Below threshold
    isActive: true,
    connectedRelays: ['https://custom-relay.example.com'],
    orderflowSources: ['public'],
    lastActivity: new Date(),
  });

  console.log('✅ Registered 3 builder nodes\n');

  // === DEMO 2: TEE Attestation ===
  console.log('--- Demo 2: TEE Attestation Verification ---');

  // Simulate remote attestation for each node
  console.log('\nSimulating remote attestations...');
  
  const attestation1 = builderNet.simulateRemoteAttestation(
    'flashbots-builder-1',
    'Intel SGX'
  );
  console.log('✅ Flashbots Builder 1 attestation:', {
    platform: attestation1.platform,
    status: attestation1.status,
    hash: attestation1.attestationHash.substring(0, 10) + '...',
  });

  const attestation2 = builderNet.simulateRemoteAttestation(
    'beaverbuild-node-2',
    'AMD SEV'
  );
  console.log('✅ Beaverbuild Node 2 attestation:', {
    platform: attestation2.platform,
    status: attestation2.status,
    hash: attestation2.attestationHash.substring(0, 10) + '...',
  });

  // Verify attestations
  console.log('\nVerifying attestations...');
  const verification1 = builderNet.verifyAttestation('flashbots-builder-1');
  console.log('Flashbots Builder 1:', verification1);

  const verification2 = builderNet.verifyAttestation('beaverbuild-node-2');
  console.log('Beaverbuild Node 2:', verification2);

  const verification3 = builderNet.verifyAttestation('independent-builder-3');
  console.log('Independent Builder 3:', verification3);
  console.log();

  // === DEMO 3: Trust and Reputation ===
  console.log('--- Demo 3: Builder Trust and Reputation ---');

  const trustedBuilders = builderNet.getTrustedBuilderNodes();
  console.log(`\nFound ${trustedBuilders.length} trusted builders (verified TEE + good reputation):`);
  
  trustedBuilders.forEach((builder, index) => {
    console.log(`${index + 1}. ${builder.operator}`);
    console.log(`   - Reputation: ${(builder.reputationScore * 100).toFixed(1)}%`);
    console.log(`   - Attestation: ${builder.attestationStatus}`);
    console.log(`   - Relays: ${builder.connectedRelays.length}`);
  });

  // Update reputation based on performance
  console.log('\nSimulating builder performance...');
  builderNet.updateNodeReputation('flashbots-builder-1', true, 1.0); // Success
  builderNet.updateNodeReputation('beaverbuild-node-2', true, 1.0); // Success
  builderNet.updateNodeReputation('flashbots-builder-1', true, 1.2); // Weighted success
  builderNet.updateNodeReputation('beaverbuild-node-2', false, 0.8); // Failure

  console.log('\nUpdated reputations after performance:');
  const updatedTrusted = builderNet.getTrustedBuilderNodes();
  updatedTrusted.forEach(builder => {
    console.log(`- ${builder.operator}: ${(builder.reputationScore * 100).toFixed(1)}%`);
  });
  console.log();

  // === DEMO 4: Orderflow Recommendations ===
  console.log('--- Demo 4: Orderflow Submission Recommendations ---');

  const highPrivacyBuilders = builderNet.recommendBuildersForOrderflow('high');
  console.log(`\nHigh Privacy (recent TEE attestations): ${highPrivacyBuilders.length} builders`);
  highPrivacyBuilders.forEach(b => console.log(`  - ${b.operator}`));

  const mediumPrivacyBuilders = builderNet.recommendBuildersForOrderflow('medium');
  console.log(`\nMedium Privacy (verified TEE): ${mediumPrivacyBuilders.length} builders`);
  mediumPrivacyBuilders.forEach(b => console.log(`  - ${b.operator}`));

  const lowPrivacyBuilders = builderNet.recommendBuildersForOrderflow('low');
  console.log(`\nLow Privacy (all active): ${lowPrivacyBuilders.length} builders`);
  lowPrivacyBuilders.forEach(b => console.log(`  - ${b.operator}`));
  console.log();

  // === DEMO 5: Peer Sharing Safety ===
  console.log('--- Demo 5: Orderflow Peer Sharing Safety ---');

  const canShare1to2 = builderNet.canShareOrderflow(
    'flashbots-builder-1',
    'beaverbuild-node-2'
  );
  console.log(`\nCan share orderflow Flashbots → Beaverbuild: ${canShare1to2}`);

  const canShare1to3 = builderNet.canShareOrderflow(
    'flashbots-builder-1',
    'independent-builder-3'
  );
  console.log(`Can share orderflow Flashbots → Independent: ${canShare1to3}`);
  console.log('(Blocked: reputation below threshold or no attestation)\n');

  // === DEMO 6: Statistics ===
  console.log('--- Demo 6: BuilderNet Statistics ---');

  const stats = builderNet.getStatistics();
  console.log('\nBuildernet Statistics:');
  console.log(`- Total Nodes: ${stats.totalNodes}`);
  console.log(`- Active Nodes: ${stats.activeNodes}`);
  console.log(`- Verified Nodes: ${stats.verifiedNodes}`);
  console.log(`- Trusted Nodes: ${stats.trustedNodes}`);
  console.log('\nAttestations:');
  console.log(`- Total: ${stats.attestations.total}`);
  console.log(`- Verified: ${stats.attestations.verified}`);
  console.log(`- Expired: ${stats.attestations.expired}`);
  console.log(`- Failed: ${stats.attestations.failed}`);
  console.log(`\nAverage Reputation: ${(stats.averageReputation * 100).toFixed(1)}%`);
  console.log();

  // === DEMO 7: Attestation Cleanup ===
  console.log('--- Demo 7: Attestation Cleanup ---');

  // Simulate time passing by creating an expired attestation
  const expiredAttestation = {
    nodeId: 'expired-node',
    attestationHash: '0x1234567890',
    platform: 'Intel SGX',
    codeMeasurement: '0xabcdef',
    timestamp: Date.now() - 90000000, // Very old
    expiresAt: Date.now() - 1000, // Expired
    status: TEEAttestationStatus.EXPIRED,
  };
  builderNet.recordAttestation(expiredAttestation);

  console.log('\nBefore cleanup:', builderNet.getStatistics().attestations.total, 'attestations');
  const removed = builderNet.cleanupExpiredAttestations();
  console.log('After cleanup:', builderNet.getStatistics().attestations.total, 'attestations');
  console.log(`Removed ${removed} expired attestation(s)\n`);

  console.log('=== Demo Complete ===');
  console.log('\nKey Takeaways:');
  console.log('✓ BuilderNet enables decentralized block building');
  console.log('✓ TEE attestation ensures builder code integrity');
  console.log('✓ Reputation tracking optimizes builder selection');
  console.log('✓ Privacy controls protect orderflow distribution');
  console.log('✓ Remote attestation prevents malicious operators');
}

// Run the demo
main().catch(console.error);
