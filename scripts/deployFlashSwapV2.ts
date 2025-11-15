import { ethers, network } from "hardhat";
import { ADDRESSES, NetworkKey, requireAddress } from "../config/addresses";

/**
 * Deployment script for FlashSwapV2 contract
 * 
 * This script deploys the FlashSwapV2 contract using addresses from the centralized
 * config/addresses.ts configuration file.
 * 
 * Network addresses are automatically selected based on the --network flag.
 */

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying FlashSwapV2 with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  
  // Determine which network we're deploying to
  const networkInfo = await ethers.provider.getNetwork();
  console.log("Deploying to network:", network.name, "chainId:", networkInfo.chainId);
  
  // Get addresses from centralized config
  const netName = network.name as NetworkKey;
  const addresses = ADDRESSES[netName];
  
  if (!addresses) {
    throw new Error(
      `No address configuration found for network: ${network.name}\n` +
      `Please add addresses to config/addresses.ts for this network.`
    );
  }
  
  // Validate required addresses exist
  const uniswapV3Router = requireAddress(netName, "uniswapV3Router");
  const sushiRouter = requireAddress(netName, "sushiRouter");
  const aavePool = requireAddress(netName, "aavePool");
  const aaveAddressesProvider = requireAddress(netName, "aaveAddressesProvider");
  
  console.log("\nDeploying with configuration from config/addresses.ts:");
  console.log("- Uniswap V3 Router:", uniswapV3Router);
  console.log("- SushiSwap Router:", sushiRouter);
  console.log("- Aave Pool:", aavePool);
  console.log("- Aave Addresses Provider:", aaveAddressesProvider);
  
  // Deploy FlashSwapV2
  const FlashSwapV2 = await ethers.getContractFactory("FlashSwapV2");
  const flashSwapV2 = await FlashSwapV2.deploy(
    uniswapV3Router,
    sushiRouter,
    aavePool,
    aaveAddressesProvider
  );
  
  await flashSwapV2.deployed();
  
  console.log("\n✅ FlashSwapV2 deployed successfully!");
  console.log("Contract address:", flashSwapV2.address);
  console.log("Owner address:", deployer.address);
  
  // Wait for a few blocks before verification
  console.log("\nWaiting for 5 block confirmations...");
  await flashSwapV2.deployTransaction.wait(5);
  
  console.log("\n📝 To verify the contract on Basescan, run:");
  console.log(`npx hardhat verify --network ${network.name} ${flashSwapV2.address} ${uniswapV3Router} ${sushiRouter} ${aavePool} ${aaveAddressesProvider}`);
  
  console.log("\n📄 Save these details to your .env file:");
  console.log(`FLASHSWAP_V2_ADDRESS=${flashSwapV2.address}`);
  console.log(`FLASHSWAP_V2_OWNER=${deployer.address}`);
  
  console.log("\n✨ Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
