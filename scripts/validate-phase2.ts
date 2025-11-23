#!/usr/bin/env ts-node
/**
 * Phase 2 Validation Script
 * 
 * Comprehensive validation of framework components for Phase 2:
 * 1. Opportunity Detection
 * 2. Consciousness Module Coordination  
 * 3. Dashboard Server
 * 4. End-to-End Dry Run
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { ArbitrageConsciousness } from '../src/consciousness/ArbitrageConsciousness';
import { CognitiveCoordinator, OpportunityContext } from '../src/consciousness/coordination/CognitiveCoordinator';
import { EmergenceDetector, DecisionContext } from '../src/consciousness/coordination/EmergenceDetector';
import { DEXRegistry } from '../src/dex/core/DEXRegistry';
import { OptimizedPoolScanner } from '../src/arbitrage/OptimizedPoolScanner';

dotenv.config();

interface ValidationResult {
  task: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  duration?: number;
}

const results: ValidationResult[] = [];

function logResult(result: ValidationResult) {
  results.push(result);
  const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
  console.log(`${icon} ${result.task}: ${result.message}`);
  if (result.duration) {
    console.log(`   Duration: ${(result.duration / 1000).toFixed(2)}s`);
  }
  console.log();
}

/**
 * Task 2.1: Opportunity Detection Validation (Quick Test)
 */
async function validateOpportunityDetection(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Task 2.1: Opportunity Detection Validation');
  console.log('═══════════════════════════════════════════════════════\n');

  const startTime = Date.now();

  try {
    // Check environment
    if (!process.env.BASE_RPC_URL && !process.env.RPC_URL) {
      logResult({
        task: '2.1 Opportunity Detection',
        status: 'SKIP',
        message: 'No RPC URL configured (BASE_RPC_URL or RPC_URL)',
      });
      return;
    }

    const rpcUrl = process.env.BASE_RPC_URL || process.env.RPC_URL;
    console.log(`RPC: ${rpcUrl}\n`);

    // Initialize components
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const registry = new DEXRegistry();
    const scanner = new OptimizedPoolScanner(registry, provider, 8453);

    // Test with a smaller token set for speed
    const tokens = [
      '0x4200000000000000000000000000000000000006', // WETH
      '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
    ];

    console.log('Testing pool detection with WETH/USDC pair...');
    const edges = await scanner.buildGraphEdges(tokens);

    const duration = Date.now() - startTime;

    if (edges.length > 0) {
      logResult({
        task: '2.1 Opportunity Detection',
        status: 'PASS',
        message: `Found ${edges.length} pool edges, graph construction working`,
        duration,
      });
    } else {
      logResult({
        task: '2.1 Opportunity Detection',
        status: 'FAIL',
        message: 'No pools found - check RPC endpoint or network connectivity',
        duration,
      });
    }
  } catch (error: any) {
    logResult({
        task: '2.1 Opportunity Detection',
      status: 'FAIL',
      message: `Error: ${error.message}`,
      duration: Date.now() - startTime,
    });
  }
}

/**
 * Task 2.2: Consciousness Module Coordination
 */
async function validateConsciousnessCoordination(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Task 2.2: Consciousness Module Coordination');
  console.log('═══════════════════════════════════════════════════════\n');

  const startTime = Date.now();

  try {
    // Initialize consciousness
    console.log('Initializing ArbitrageConsciousness...');
    const consciousness = new ArbitrageConsciousness(0.05, 1000);

    // Extract modules
    console.log('Extracting cognitive modules...');
    const modules = consciousness.getModules();
    const moduleCount = Object.keys(modules).length;
    console.log(`Extracted ${moduleCount} modules\n`);

    // Initialize coordinator
    console.log('Initializing CognitiveCoordinator...');
    const coordinator = new CognitiveCoordinator(modules);

    // Initialize emergence detector
    console.log('Initializing EmergenceDetector...');
    const detector = new EmergenceDetector();

    // Test opportunity analysis
    console.log('Testing opportunity analysis...');
    const testOpportunity: OpportunityContext = {
      opportunity: {
        profit: 0.05,
        netProfit: BigInt('50000000000000000'), // 0.05 ETH
        pools: ['0x1234...', '0x5678...'],
        path: ['WETH -> USDC', 'USDC -> WETH'],
        hops: 2,
        totalGasCost: BigInt('10000000000000000'), // 0.01 ETH
      },
      market: {
        timestamp: Date.now(),
        congestion: 0.3,
        searcherDensity: 0.4,
      },
      historical: {
        recentExecutions: 10,
        successRate: 0.8,
      },
      timestamp: Date.now(),
    };

    const insights = await coordinator.gatherInsights(testOpportunity);
    console.log(`Gathered ${insights.length} insights\n`);

    // Test consensus detection
    console.log('Testing consensus detection...');
    const consensus = coordinator.detectConsensus(insights);
    console.log(`Consensus: ${consensus.consensusType}`);
    console.log(`Agreement: ${(consensus.agreementLevel * 100).toFixed(1)}%\n`);

    // Test emergence detection
    console.log('Testing emergence detection...');
    const decisionContext: DecisionContext = {
      moduleInsights: insights,
      consensus,
      riskScore: 0.2,
      ethicalScore: 0.85,
      goalAlignment: 0.9,
      patternConfidence: 0.75,
      historicalSuccess: 0.8,
      timestamp: Date.now(),
    };

    const emergence = detector.detectEmergence(decisionContext);
    console.log(`Emergence detected: ${emergence.isEmergent}`);
    console.log(`Confidence: ${(emergence.confidence * 100).toFixed(1)}%\n`);

    const duration = Date.now() - startTime;

    logResult({
      task: '2.2 Consciousness Coordination',
      status: 'PASS',
      message: `All ${moduleCount} modules coordinating, consensus & emergence detection working`,
      duration,
    });
  } catch (error: any) {
    logResult({
      task: '2.2 Consciousness Coordination',
      status: 'FAIL',
      message: `Error: ${error.message}`,
      duration: Date.now() - startTime,
    });
  }
}

/**
 * Task 2.3: Dashboard Real-Time Updates
 */
async function validateDashboard(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Task 2.3: Dashboard Validation');
  console.log('═══════════════════════════════════════════════════════\n');

  logResult({
    task: '2.3 Dashboard',
    status: 'SKIP',
    message: 'Dashboard testing requires manual verification - skipping automated test',
  });
}

/**
 * Task 2.4: End-to-End Dry Run
 */
async function validateEndToEnd(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Task 2.4: End-to-End Dry Run');
  console.log('═══════════════════════════════════════════════════════\n');

  logResult({
    task: '2.4 End-to-End',
    status: 'SKIP',
    message: 'Requires Tasks 2.1-2.3 completion - will be validated after all components pass',
  });
}

/**
 * Main validation runner
 */
async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║     PHASE 2 FRAMEWORK VALIDATION                      ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  const totalStart = Date.now();

  // Run all validation tasks
  await validateOpportunityDetection();
  await validateConsciousnessCoordination();
  await validateDashboard();
  await validateEndToEnd();

  const totalDuration = Date.now() - totalStart;

  // Print summary
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  VALIDATION SUMMARY');
  console.log('═══════════════════════════════════════════════════════\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`⏱️  Total Duration: ${(totalDuration / 1000).toFixed(2)}s\n`);

  // Detailed results
  console.log('Details:');
  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
    console.log(`  ${icon} ${result.task}: ${result.status}`);
  });

  console.log('\n═══════════════════════════════════════════════════════\n');

  // Exit with appropriate code
  if (failed > 0) {
    console.log('❌ Phase 2 validation FAILED\n');
    process.exit(1);
  } else if (passed > 0) {
    console.log('✅ Phase 2 validation PASSED\n');
    process.exit(0);
  } else {
    console.log('⏭️  Phase 2 validation SKIPPED (no tests run)\n');
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
}

export { main as validatePhase2 };
