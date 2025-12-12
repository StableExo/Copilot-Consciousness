import { ethers } from 'ethers';

async function checkExecutionReadiness() {
  const rpcUrl = process.env.BASE_RPC_URL || 'https://base-mainnet.g.alchemy.com/v2/iJWWoZyYwlakePscXLoEM';
  const privateKey = process.env.WALLET_PRIVATE_KEY || '';
  
  console.log('🔍 Checking TheWarden Execution Readiness...\n');
  console.log(`RPC URL: ${rpcUrl.substring(0, 50)}...`);
  
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Check network
    const network = await provider.getNetwork();
    console.log(`✅ Network: ${network.name} (Chain ID: ${network.chainId})`);
    
    // Check block number
    const blockNumber = await provider.getBlockNumber();
    console.log(`✅ Current Block: ${blockNumber}`);
    
    // Check wallet balance
    const balance = await provider.getBalance(wallet.address);
    const balanceEth = ethers.formatEther(balance);
    console.log(`\n💰 Wallet Address: ${wallet.address}`);
    console.log(`💰 Balance: ${balanceEth} ETH`);
    
    // Check gas price
    const feeData = await provider.getFeeData();
    const gasPriceGwei = feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') : 'N/A';
    console.log(`\n⛽ Current Gas Price: ${gasPriceGwei} Gwei`);
    
    // Readiness assessment
    console.log('\n📋 Readiness Assessment:');
    console.log(`  🌐 RPC Connection: ✅ Active`);
    console.log(`  💰 Wallet Funded: ${parseFloat(balanceEth) > 0 ? '✅ Yes' : '❌ No'}`);
    console.log(`  ⛽ Gas Available: ${feeData.gasPrice ? '✅ Yes' : '❌ No'}`);
    console.log(`  🔐 Private Key: ${privateKey ? '✅ Loaded' : '❌ Missing'}`);
    
    if (parseFloat(balanceEth) > 0) {
      console.log('\n🎉 TheWarden is READY for autonomous blockchain execution!');
      console.log(`\n💡 Available for trading: ${balanceEth} ETH`);
    } else {
      console.log('\n⚠️  WARNING: Wallet balance is 0 ETH');
      console.log('   TheWarden can scan for opportunities but cannot execute trades');
      console.log('   Running in DRY_RUN mode is recommended');
    }
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('\n   Check RPC URL and network connectivity');
    throw error;
  }
}

checkExecutionReadiness().catch(console.error);
