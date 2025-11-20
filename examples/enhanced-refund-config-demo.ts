/**
 * Enhanced MEV Refund Configuration Demo
 * 
 * Demonstrates the 2024-2025 updates to Flashbots MEV-Share:
 * - Custom refund percentage configuration (default 90% to user, 10% to validator)
 * - Advanced privacy hints optimization
 * - Complete MEV-Share configuration recommendations
 * - Refund strategy selection
 * 
 * Based on latest Flashbots documentation
 */

import { ethers } from 'ethers';
import { FlashbotsIntelligence } from '../src/intelligence/flashbots';

async function main() {
  console.log('=== Enhanced MEV Refund Configuration Demo ===\n');

  // Initialize provider
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.RPC_URL || 'https://eth.llamarpc.com'
  );

  // Create Flashbots intelligence
  const flashbots = new FlashbotsIntelligence(provider, {
    enableRefundTracking: true,
    minTrackableMEV: BigInt(0.01e18), // Track refunds > 0.01 ETH
  });

  console.log('✅ Flashbots Intelligence initialized with refund tracking\n');

  // === DEMO 1: Custom Refund Percentage Strategies ===
  console.log('--- Demo 1: Refund Percentage Strategies ---\n');

  const strategies: Array<'maximize_profit' | 'balanced' | 'fair_share'> = [
    'maximize_profit',
    'balanced',
    'fair_share',
  ];

  console.log('Refund Distribution Strategies:\n');

  for (const strategy of strategies) {
    const refundConfig = flashbots.calculateRefundPercentage(strategy);
    console.log(`${strategy.toUpperCase().replace('_', ' ')}:`);
    console.log(`  - User Receives: ${refundConfig.percent}%`);
    console.log(`  - Validator Receives: ${100 - refundConfig.percent}%`);
    console.log(`  - Reasoning: ${refundConfig.reasoning}`);
    console.log();
  }

  // === DEMO 2: Simulate MEV Refunds ===
  console.log('--- Demo 2: Tracking MEV Refunds ---\n');

  console.log('Simulating historical MEV refunds...\n');

  // Simulate some MEV refunds with different rates
  const refunds = [
    { extracted: '0.15', refunded: '0.135', block: 18000001 }, // 90%
    { extracted: '0.08', refunded: '0.072', block: 18000002 }, // 90%
    { extracted: '0.22', refunded: '0.198', block: 18000003 }, // 90%
    { extracted: '0.05', refunded: '0.040', block: 18000004 }, // 80%
    { extracted: '0.12', refunded: '0.108', block: 18000005 }, // 90%
  ];

  refunds.forEach((refund, i) => {
    flashbots.recordMEVRefund({
      txHash: `0x${i.toString().padStart(64, '0')}`,
      bundleHash: `0xbundle${i.toString().padStart(58, '0')}`,
      mevExtracted: ethers.utils.parseEther(refund.extracted).toString(),
      refundAmount: ethers.utils.parseEther(refund.refunded).toString(),
      blockNumber: refund.block,
      timestamp: Date.now() - (5 - i) * 60000, // Last 5 minutes
    });

    const refundRate = (parseFloat(refund.refunded) / parseFloat(refund.extracted) * 100);
    console.log(`Block ${refund.block}: ${refund.extracted} ETH extracted, ${refund.refunded} ETH refunded (${refundRate.toFixed(0)}%)`);
  });

  // Get refund statistics
  const refundStats = flashbots.getTotalMEVRefunds();
  console.log('\nRefund Statistics:');
  console.log(`- Total MEV Extracted: ${ethers.utils.formatEther(refundStats.totalExtracted)} ETH`);
  console.log(`- Total Refunded: ${ethers.utils.formatEther(refundStats.totalRefunded)} ETH`);
  console.log(`- Average Refund Rate: ${(refundStats.refundRate * 100).toFixed(1)}%`);
  console.log();

  // === DEMO 3: Privacy vs Refund Trade-offs ===
  console.log('--- Demo 3: Privacy vs. Refund Trade-offs ---\n');

  const privacyLevels = [
    { priority: 0.1, label: 'Maximum Refund (10% privacy)' },
    { priority: 0.3, label: 'High Refund (30% privacy)' },
    { priority: 0.5, label: 'Balanced (50% privacy)' },
    { priority: 0.7, label: 'Privacy Focused (70% privacy)' },
    { priority: 0.9, label: 'Maximum Privacy (90% privacy)' },
  ];

  console.log('Privacy Priority Impact on Hints:\n');

  privacyLevels.forEach(({ priority, label }) => {
    const hints = flashbots.recommendOptimalHints(priority);
    const sharedHints = Object.entries(hints)
      .filter(([_, value]) => value)
      .map(([key]) => key);
    
    console.log(`${label}:`);
    console.log(`  - Shared Hints: ${sharedHints.length > 0 ? sharedHints.join(', ') : 'hash only'}`);
    console.log();
  });

  // === DEMO 4: Complete MEV-Share Configuration ===
  console.log('--- Demo 4: Complete MEV-Share Configuration Recommendations ---\n');

  const scenarios = [
    {
      name: 'High-Value Arbitrage',
      privacy: 0.3,
      strategy: 'maximize_profit' as const,
      description: 'Large MEV opportunity - prioritize profit over privacy',
    },
    {
      name: 'Standard DeFi Trade',
      privacy: 0.5,
      strategy: 'balanced' as const,
      description: 'Normal transaction - balance privacy and refunds',
    },
    {
      name: 'Competitive Strategy',
      privacy: 0.8,
      strategy: 'fair_share' as const,
      description: 'Proprietary strategy - prioritize privacy',
    },
  ];

  scenarios.forEach(scenario => {
    console.log(`Scenario: ${scenario.name}`);
    console.log(`Description: ${scenario.description}\n`);

    const config = flashbots.getRecommendedMEVShareConfig(
      scenario.privacy,
      scenario.strategy
    );

    console.log('Recommended Configuration:');
    console.log(`- Refund to User: ${config.refundConfig.percent}%`);
    console.log(`- Fast Mode: ${config.fastMode ? 'Enabled' : 'Disabled'}`);
    console.log(`- TEE Sharing: ${config.shareTEE ? 'Enabled' : 'Disabled'}`);
    
    const sharedHints = Object.entries(config.hints)
      .filter(([_, value]) => value)
      .map(([key]) => key);
    console.log(`- Shared Hints: ${sharedHints.join(', ')}`);
    
    console.log('\nReasoning:');
    config.reasoning.forEach(reason => console.log(`  • ${reason}`));
    console.log('\n---\n');
  });

  // === DEMO 5: MEV-Share Configuration Analysis ===
  console.log('--- Demo 5: MEV-Share Configuration Analysis ---\n');

  const currentConfigs = [
    {
      name: 'Current Config A (Low Privacy)',
      hints: { calldata: true, contractAddress: true, functionSelector: true, logs: true, hash: true },
    },
    {
      name: 'Current Config B (Medium Privacy)',
      hints: { logs: true, hash: true, default_logs: true },
    },
    {
      name: 'Current Config C (High Privacy)',
      hints: { hash: true },
    },
  ];

  currentConfigs.forEach(({ name, hints }) => {
    console.log(`${name}:`);
    const analysis = flashbots.analyzeMEVShareConfig(hints);
    
    if (analysis.shouldOptimize) {
      console.log('  ⚠️  Optimization Recommended:');
      analysis.recommendations.forEach(rec => console.log(`    • ${rec}`));
      
      if (analysis.suggestedHints) {
        const suggested = Object.entries(analysis.suggestedHints)
          .filter(([_, v]) => v)
          .map(([k]) => k);
        console.log(`  Suggested: ${suggested.join(', ')}`);
      }
    } else {
      console.log('  ✅ Configuration optimal');
    }
    console.log();
  });

  // === DEMO 6: Real-World Usage Example ===
  console.log('--- Demo 6: Real-World Integration Example ---\n');

  console.log('Example: Submitting arbitrage transaction with custom refund config\n');

  // Choose strategy based on opportunity
  const arbValue = ethers.utils.parseEther('0.5'); // 0.5 ETH profit potential
  const isLargeOpportunity = arbValue.gt(ethers.utils.parseEther('0.3'));

  const strategy = isLargeOpportunity ? 'maximize_profit' : 'balanced';
  const privacyPriority = isLargeOpportunity ? 0.2 : 0.5; // Less privacy for large ops

  console.log(`Arbitrage Opportunity: ${ethers.utils.formatEther(arbValue)} ETH`);
  console.log(`Strategy: ${strategy}`);
  console.log(`Privacy Priority: ${(privacyPriority * 100).toFixed(0)}%\n`);

  const finalConfig = flashbots.getRecommendedMEVShareConfig(privacyPriority, strategy);

  console.log('Generated MEV-Share Configuration:');
  console.log(JSON.stringify({
    hints: finalConfig.hints,
    refundConfig: finalConfig.refundConfig,
    fastMode: finalConfig.fastMode,
    shareTEE: finalConfig.shareTEE,
  }, null, 2));

  console.log('\nConfiguration Summary:');
  console.log(`✓ User will receive ${finalConfig.refundConfig.percent}% of MEV`);
  console.log(`✓ Validator will receive ${100 - finalConfig.refundConfig.percent}% of MEV`);
  console.log(`✓ Gas fee refunds: 100% to user (standard)`);
  
  if (finalConfig.fastMode) {
    console.log('✓ Fast mode: Transaction shared with all builders immediately');
  }
  
  if (finalConfig.shareTEE) {
    console.log('✓ TEE sharing: Enhanced privacy with delayed disclosure');
  }

  console.log();

  // === DEMO 7: Refund Optimization Over Time ===
  console.log('--- Demo 7: Adaptive Refund Strategy ---\n');

  console.log('Monitoring refund performance and adapting strategy...\n');

  // Simulate changing market conditions
  const timeSteps = [
    { label: 'Initial', rate: 0.85 },
    { label: 'After 1 hour', rate: 0.75 },
    { label: 'After 2 hours', rate: 0.65 },
    { label: 'After 3 hours', rate: 0.88 },
  ];

  timeSteps.forEach(step => {
    // Mock the refund rate
    const mockStats = {
      totalExtracted: BigInt(1e18),
      totalRefunded: BigInt(step.rate * 1e18),
      refundRate: step.rate,
      refundCount: 10,
    };

    console.log(`${step.label} (Refund Rate: ${(step.rate * 100).toFixed(0)}%):`);
    
    // Calculate for balanced strategy
    const balancedConfig = flashbots.calculateRefundPercentage('balanced');
    console.log(`  Balanced Strategy: Request ${balancedConfig.percent}% refund`);
    console.log(`  Reason: ${balancedConfig.reasoning}`);
    console.log();
  });

  console.log('=== Demo Complete ===');
  console.log('\nKey Takeaways:');
  console.log('✓ Default 90% MEV refund to user, 10% to validator');
  console.log('✓ 100% of gas fee refunds go to user');
  console.log('✓ Custom refund percentages available via configuration');
  console.log('✓ Privacy hints control MEV searcher information');
  console.log('✓ Fast mode multiplexes to all builders for better inclusion');
  console.log('✓ TEE sharing balances privacy with MEV capture');
  console.log('✓ Strategy should adapt to opportunity size and market conditions');
}

// Run the demo
main().catch(console.error);
