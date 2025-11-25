import hre from "hardhat";
import { ADDRESSES, NetworkKey, requireAddress } from "../src/config/addresses";

/**
 * Contract Verification Script for FlashSwapV2
 * 
 * This script programmatically verifies the FlashSwapV2 contract on block explorers
 * (Etherscan, BaseScan, etc.) using Hardhat's verify plugin.
 * 
 * The verification process submits the contract source code and constructor arguments
 * to the block explorer API, which then compiles and compares against the deployed bytecode.
 * 
 * Usage:
 *   npx hardhat run scripts/verifyFlashSwapV2.ts --network base
 *   
 * Environment Variables Required:
 *   - BASESCAN_API_KEY: Your BaseScan API key (get from https://basescan.org/myapikey)
 * 
 * The contract address can be:
 *   1. Passed as CONTRACT_ADDRESS environment variable
 *   2. Read from FLASHSWAP_V2_ADDRESS in .env
 *   3. Passed interactively (if running in interactive mode)
 */

async function main() {
  const network = hre.network;
  
  console.log("🔍 FlashSwapV2 Contract Verification Script");
  console.log("============================================");
  console.log(`Network: ${network.name}`);
  
  // Get contract address from environment variable or prompt
  const contractAddress = process.env.CONTRACT_ADDRESS || process.env.FLASHSWAP_V2_ADDRESS;
  
  if (!contractAddress) {
    console.error("\n❌ Error: Contract address not provided.");
    console.error("Please set either CONTRACT_ADDRESS or FLASHSWAP_V2_ADDRESS environment variable.");
    console.error("\nExample usage:");
    console.error("  CONTRACT_ADDRESS=0x... npx hardhat run scripts/verifyFlashSwapV2.ts --network base");
    process.exit(1);
  }
  
  console.log(`Contract Address: ${contractAddress}`);
  
  // Validate network is supported
  const supportedNetworks: NetworkKey[] = ["base", "baseSepolia", "arbitrum", "polygon", "mainnet", "goerli"];
  if (!supportedNetworks.includes(network.name as NetworkKey)) {
    console.error(`\n❌ Error: Unsupported network: ${network.name}`);
    console.error(`Supported networks: ${supportedNetworks.join(", ")}`);
    process.exit(1);
  }
  
  // Get network addresses from centralized config
  const netName = network.name as NetworkKey;
  const addresses = ADDRESSES[netName];
  
  if (!addresses) {
    console.error(`\n❌ Error: No address configuration found for network: ${network.name}`);
    console.error("Please add addresses to src/config/addresses.ts for this network.");
    process.exit(1);
  }
  
  // Get constructor arguments from centralized config
  const constructorArgs = [
    requireAddress(netName, "uniswapV3Router"),
    requireAddress(netName, "sushiRouter"),
    requireAddress(netName, "aavePool"),
    requireAddress(netName, "aaveAddressesProvider"),
  ];
  
  console.log("\nConstructor Arguments:");
  console.log(`  1. Uniswap V3 Router: ${constructorArgs[0]}`);
  console.log(`  2. SushiSwap Router:  ${constructorArgs[1]}`);
  console.log(`  3. Aave Pool:         ${constructorArgs[2]}`);
  console.log(`  4. Aave Provider:     ${constructorArgs[3]}`);
  
  // Verify the contract
  console.log("\n📤 Submitting verification request...");
  
  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: constructorArgs,
      contract: "contracts/FlashSwapV2.sol:FlashSwapV2",
    });
    
    console.log("\n✅ Contract verified successfully!");
    console.log(`\nView on block explorer:`);
    
    // Generate block explorer URL based on network
    const explorerUrl = getBlockExplorerUrl(network.name, contractAddress);
    console.log(`  ${explorerUrl}`);
    
  } catch (error: unknown) {
    // Handle already verified contracts gracefully
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("Already Verified") || errorMessage.includes("already verified")) {
      console.log("\n✅ Contract is already verified!");
      const explorerUrl = getBlockExplorerUrl(network.name, contractAddress);
      console.log(`\nView on block explorer:`);
      console.log(`  ${explorerUrl}`);
    } else {
      console.error("\n❌ Verification failed:");
      console.error(errorMessage);
      
      // Provide helpful debugging information
      console.log("\n📋 Troubleshooting tips:");
      console.log("1. Ensure your API key is correct in hardhat.config.ts");
      console.log("2. Wait a few blocks after deployment before verifying");
      console.log("3. Ensure the contract address is correct");
      console.log("4. Check that constructor arguments match exactly");
      console.log("\nManual verification command:");
      console.log(`npx hardhat verify --network ${network.name} ${contractAddress} ${constructorArgs.join(" ")}`);
      
      process.exit(1);
    }
  }
}

/**
 * Block explorer base URLs - shared constant pattern
 */
const BLOCK_EXPLORER_URLS: Record<string, string> = {
  base: "https://basescan.org/address",
  baseSepolia: "https://sepolia.basescan.org/address",
  mainnet: "https://etherscan.io/address",
  goerli: "https://goerli.etherscan.io/address",
  arbitrum: "https://arbiscan.io/address",
  polygon: "https://polygonscan.com/address",
};

/**
 * Get the block explorer URL for a contract based on network
 */
function getBlockExplorerUrl(networkName: string, contractAddress: string): string {
  const baseUrl = BLOCK_EXPLORER_URLS[networkName];
  if (baseUrl) {
    return `${baseUrl}/${contractAddress}#code`;
  }
  return `Contract at ${contractAddress}`;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
