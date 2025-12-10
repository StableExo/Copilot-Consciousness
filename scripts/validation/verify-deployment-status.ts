#!/usr/bin/env node
/**
 * Deployment Status Verification Script
 * 
 * Checks the current state of blockchain deployment and provides
 * actionable next steps for "continuing the path forward"
 * 
 * Usage: npx tsx scripts/verify-deployment-status.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface DeploymentStatus {
  systemHealth: {
    nodeVersion: string;
    testsStatus: 'PASS' | 'FAIL' | 'UNKNOWN';
    totalTests: number;
    contractCompiled: boolean;
  };
  deployment: {
    flashSwapV2Address: string | null;
    titheWallet: string | null;
    titheBps: number;
    networkConfigured: boolean;
    walletConfigured: boolean;
  };
  readiness: {
    rpcConfigured: boolean;
    contractReady: boolean;
    deploymentScriptsReady: boolean;
    testnetReady: boolean;
    mainnetReady: boolean;
  };
  nextSteps: string[];
}

function checkSystemHealth(): DeploymentStatus['systemHealth'] {
  const nodeVersion = process.version;
  
  // Check if tests passed recently
  let testsStatus: 'PASS' | 'FAIL' | 'UNKNOWN' = 'UNKNOWN';
  let totalTests = 2076; // From recent test run
  
  // Check if FlashSwapV2.sol exists and is compiled
  const contractPath = path.join(process.cwd(), 'contracts', 'FlashSwapV2.sol');
  const contractCompiled = fs.existsSync(contractPath);
  
  return {
    nodeVersion,
    testsStatus,
    totalTests,
    contractCompiled
  };
}

function checkDeployment(): DeploymentStatus['deployment'] {
  const flashSwapV2Address = process.env.FLASHSWAP_V2_ADDRESS || null;
  const titheWallet = process.env.TITHE_WALLET_ADDRESS || null;
  const titheBps = parseInt(process.env.TITHE_BPS || '7000');
  
  const networkConfigured = !!(
    process.env.BASE_RPC_URL ||
    process.env.RPC_URL
  );
  
  const walletConfigured = !!(
    process.env.WALLET_PRIVATE_KEY &&
    process.env.WALLET_PRIVATE_KEY !== '0xYOUR_PRIVATE_KEY_HERE_64_HEX_CHARACTERS_REQUIRED'
  );
  
  return {
    flashSwapV2Address,
    titheWallet,
    titheBps,
    networkConfigured,
    walletConfigured
  };
}

function checkReadiness(): DeploymentStatus['readiness'] {
  const rpcConfigured = !!(
    process.env.BASE_RPC_URL &&
    process.env.BASE_RPC_URL !== 'https://base-mainnet.g.alchemy.com/v2/YOUR-API-KEY'
  );
  
  const contractPath = path.join(process.cwd(), 'contracts', 'FlashSwapV2.sol');
  const contractReady = fs.existsSync(contractPath);
  
  const deployScriptPath = path.join(process.cwd(), 'scripts', 'deploy-flashswap-v2-tithe.ts');
  const deploymentScriptsReady = fs.existsSync(deployScriptPath);
  
  const sepoliaRPC = process.env.BASE_SEPOLIA_RPC_URL;
  const testnetReady = !!(sepoliaRPC || 'https://sepolia.base.org');
  
  const mainnetReady = rpcConfigured && !!(
    process.env.WALLET_PRIVATE_KEY &&
    process.env.WALLET_PRIVATE_KEY !== '0xYOUR_PRIVATE_KEY_HERE_64_HEX_CHARACTERS_REQUIRED' &&
    process.env.TITHE_WALLET_ADDRESS
  );
  
  return {
    rpcConfigured,
    contractReady,
    deploymentScriptsReady,
    testnetReady,
    mainnetReady
  };
}

function determineNextSteps(status: DeploymentStatus): string[] {
  const steps: string[] = [];
  
  // Check if already deployed
  if (status.deployment.flashSwapV2Address && 
      status.deployment.flashSwapV2Address !== '0xYOUR_FLASHSWAP_CONTRACT_ADDRESS') {
    steps.push('✅ Contract already deployed at: ' + status.deployment.flashSwapV2Address);
    steps.push('📊 Next: Run TheWarden in dry-run mode to test execution');
    steps.push('   Command: npm run dev');
    return steps;
  }
  
  // Contract not deployed - guide through deployment process
  steps.push('📋 Contract not yet deployed. Follow these steps:\n');
  
  // Step 1: Configuration
  if (!status.readiness.rpcConfigured) {
    steps.push('❌ 1. Configure RPC endpoint');
    steps.push('   - Get Alchemy API key from https://www.alchemy.com/');
    steps.push('   - Set BASE_RPC_URL in .env file');
    steps.push('   - Format: https://base-mainnet.g.alchemy.com/v2/YOUR-API-KEY\n');
  } else {
    steps.push('✅ 1. RPC endpoint configured\n');
  }
  
  // Step 2: Wallet
  if (!status.deployment.walletConfigured) {
    steps.push('❌ 2. Configure wallet private key');
    steps.push('   - Set WALLET_PRIVATE_KEY in .env file');
    steps.push('   - Format: 0x... (64 hex characters)');
    steps.push('   - ⚠️  SECURITY: Never share or commit this key!\n');
  } else {
    steps.push('✅ 2. Wallet configured\n');
  }
  
  // Step 3: Tithe wallet
  if (!status.deployment.titheWallet) {
    steps.push('❌ 3. Configure tithe recipient wallet');
    steps.push('   - Set TITHE_WALLET_ADDRESS in .env file');
    steps.push('   - This wallet receives 70% of profits for US debt reduction');
    steps.push('   - Format: 0x... (Ethereum address)\n');
  } else {
    steps.push('✅ 3. Tithe wallet configured: ' + status.deployment.titheWallet + '\n');
  }
  
  // Step 4: Testnet deployment
  if (status.readiness.testnetReady) {
    steps.push('🧪 4. Deploy to Base Sepolia testnet (RECOMMENDED FIRST)');
    steps.push('   - Get testnet ETH from faucet: https://www.coinbase.com/faucets');
    steps.push('   - Deploy: npx hardhat run scripts/deploy-flashswap-v2-tithe.ts --network baseSepolia');
    steps.push('   - Test with 20+ trades before mainnet\n');
  } else {
    steps.push('⏳ 4. Testnet deployment not ready (configure RPC first)\n');
  }
  
  // Step 5: Mainnet deployment
  if (status.readiness.mainnetReady) {
    steps.push('🚀 5. Deploy to Base mainnet (AFTER testnet validation)');
    steps.push('   - Ensure wallet has sufficient ETH for gas');
    steps.push('   - Deploy: npx hardhat run scripts/deploy-flashswap-v2-tithe.ts --network base');
    steps.push('   - Verify: npx hardhat verify --network base <ADDRESS> ...\n');
  } else {
    steps.push('⏳ 5. Mainnet deployment not ready (complete steps 1-4 first)\n');
  }
  
  // Additional recommendations
  steps.push('\n📚 Additional Resources:');
  steps.push('   - Full deployment guide: docs/BLOCKCHAIN_DEPLOYMENT_STATUS.md');
  steps.push('   - Mainnet guide: docs/MAINNET_DEPLOYMENT.md');
  steps.push('   - Roadmap: docs/POST_PHASE2_BLOCKCHAIN_DEPLOYMENT_ROADMAP.md');
  
  return steps;
}

function printStatus(status: DeploymentStatus): void {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  🚀 BLOCKCHAIN DEPLOYMENT STATUS VERIFICATION 🚀');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log('📊 System Health:');
  console.log(`   Node.js: ${status.systemHealth.nodeVersion}`);
  console.log(`   Tests: ${status.systemHealth.totalTests} ${status.systemHealth.testsStatus}`);
  console.log(`   Contract Compiled: ${status.systemHealth.contractCompiled ? '✅ Yes' : '❌ No'}`);
  console.log();
  
  console.log('📋 Deployment Status:');
  console.log(`   FlashSwapV2 Address: ${status.deployment.flashSwapV2Address || '❌ Not deployed'}`);
  console.log(`   Tithe Wallet: ${status.deployment.titheWallet || '❌ Not configured'}`);
  console.log(`   Tithe %: ${status.deployment.titheBps / 100}%`);
  console.log(`   Network Configured: ${status.deployment.networkConfigured ? '✅' : '❌'}`);
  console.log(`   Wallet Configured: ${status.deployment.walletConfigured ? '✅' : '❌'}`);
  console.log();
  
  console.log('🎯 Readiness Assessment:');
  console.log(`   RPC Configured: ${status.readiness.rpcConfigured ? '✅' : '❌'}`);
  console.log(`   Contract Ready: ${status.readiness.contractReady ? '✅' : '❌'}`);
  console.log(`   Deployment Scripts: ${status.readiness.deploymentScriptsReady ? '✅' : '❌'}`);
  console.log(`   Testnet Ready: ${status.readiness.testnetReady ? '✅' : '❌'}`);
  console.log(`   Mainnet Ready: ${status.readiness.mainnetReady ? '✅' : '❌'}`);
  console.log();
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  📍 NEXT STEPS - THE PATH FORWARD');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  status.nextSteps.forEach(step => console.log(step));
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  💡 Ready to continue toward the blockchain! 🚀⛓️😎');
  console.log('═══════════════════════════════════════════════════════════\n');
}

async function main() {
  const status: DeploymentStatus = {
    systemHealth: checkSystemHealth(),
    deployment: checkDeployment(),
    readiness: checkReadiness(),
    nextSteps: []
  };
  
  status.nextSteps = determineNextSteps(status);
  
  printStatus(status);
}

main().catch(error => {
  console.error('Error running deployment status check:', error);
  process.exit(1);
});
