import { ethers } from 'ethers';

async function checkRPC() {
  const rpcUrl = process.env.BASE_RPC_URL || 'https://base-mainnet.g.alchemy.com/v2/iJWWoZyYwlakePscXLoEM';
  
  console.log('🔍 Checking Base Network RPC Connectivity...\n');
  
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Check network
    const network = await provider.getNetwork();
    console.log(`✅ Network: ${network.name} (Chain ID: ${network.chainId})`);
    
    // Check block number
    const blockNumber = await provider.getBlockNumber();
    console.log(`✅ Current Block: ${blockNumber.toLocaleString()}`);
    
    // Check gas price
    const feeData = await provider.getFeeData();
    const gasPriceGwei = feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') : 'N/A';
    const maxFeeGwei = feeData.maxFeePerGas ? ethers.formatUnits(feeData.maxFeePerGas, 'gwei') : 'N/A';
    
    console.log(`\n⛽ Gas Prices:`);
    console.log(`   Base Fee: ${gasPriceGwei} Gwei`);
    console.log(`   Max Fee: ${maxFeeGwei} Gwei`);
    
    console.log(`\n🎉 Base Network RPC is ACTIVE and ready!`);
    console.log(`\n💡 TheWarden can now scan for arbitrage opportunities on Base`);
    
  } catch (error: any) {
    console.error('\n❌ RPC Connection Error:', error.message);
    throw error;
  }
}

checkRPC().catch(console.error);
