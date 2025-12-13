#!/usr/bin/env node
/**
 * Contract Deployment Verification Script
 * 
 * Verifies that the FlashSwapV2 contract is deployed on Base Network
 * 
 * Usage: node scripts/utilities/verify-contract-deployment.mjs
 */

import { ethers } from 'ethers';

const RPC_URL = 'https://base-mainnet.g.alchemy.com/v2/iJWWoZyYwlakePscXLoEM';
const CONTRACT_ADDRESS = '0xCF38b66D65f82030675893eD7150a76d760a99ce';

async function verifyContract() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  
  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔍 CONTRACT DEPLOYMENT VERIFICATION');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Contract Address: ${CONTRACT_ADDRESS}`);
    console.log(`Network: Base Mainnet (Chain ID: 8453)`);
    console.log('');
    
    // Get contract bytecode
    const code = await provider.getCode(CONTRACT_ADDRESS);
    
    if (code === '0x' || code === '0x0') {
      console.log('❌ CONTRACT NOT DEPLOYED');
      console.log('');
      console.log('The contract address has no code at this address.');
      console.log('You need to deploy the FlashSwapV2 contract before starting.');
      console.log('');
      console.log('📋 To deploy the contract:');
      console.log('');
      console.log('1. Ensure you have gas in your wallet:');
      console.log('   Wallet: (check .env for WALLET_PRIVATE_KEY)');
      console.log('   Network: Base Mainnet');
      console.log('   Required: ~0.005 ETH for deployment');
      console.log('');
      console.log('2. Deploy with verification:');
      console.log('   npm run deploy:flashswapv2:verified');
      console.log('');
      console.log('   Or deploy without verification:');
      console.log('   npm run deploy:flashswapv2');
      console.log('');
      console.log('3. Update .env with deployed address:');
      console.log('   FLASHSWAP_V2_ADDRESS=<deployed_address>');
      console.log('   EXECUTOR_ADDRESS=<deployed_address>');
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      process.exit(1);
    } else {
      console.log('✅ CONTRACT IS DEPLOYED');
      console.log('');
      console.log(`📊 Contract Information:`);
      console.log(`   Code size: ${(code.length - 2) / 2} bytes`);
      console.log(`   Code hash: ${ethers.keccak256(code).slice(0, 10)}...${ethers.keccak256(code).slice(-8)}`);
      console.log('');
      console.log(`🔗 Block Explorer:`);
      console.log(`   https://basescan.org/address/${CONTRACT_ADDRESS}`);
      console.log('');
      
      // Try to get contract creation info
      try {
        const blockNumber = await provider.getBlockNumber();
        console.log(`📈 Network Status:`);
        console.log(`   Current Block: ${blockNumber}`);
        console.log(`   Network: Base Mainnet`);
        console.log('');
      } catch (err) {
        // Ignore if we can't get block number
      }
      
      console.log('✅ CONTRACT READY FOR EXECUTION!');
      console.log('');
      console.log('🚀 Next Steps:');
      console.log('   1. Fund your wallet with gas (0.01+ ETH recommended)');
      console.log('   2. Start autonomous execution:');
      console.log('      npm run start:supabase');
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      process.exit(0);
    }
  } catch (error) {
    console.error('');
    console.error('❌ Error verifying contract:');
    console.error(`   ${error.message}`);
    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('   - Check your internet connection');
    console.error('   - Verify RPC endpoint is accessible');
    console.error('   - Try again in a few moments');
    console.error('');
    console.error('═══════════════════════════════════════════════════════════');
    process.exit(1);
  }
}

verifyContract();
