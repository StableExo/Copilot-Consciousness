import { ethers } from "hardhat";

/**
 * Deployment script for FlashSwapV2 contract on Base network
 * 
 * This script deploys the FlashSwapV2 contract with the following Base network addresses:
 * - Uniswap V3 SwapRouter: 0x2626664c2603336E57B271c5C0b26F421741e481
 * - SushiSwap Router: 0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891
 * - Aave V3 Pool: 0xA238Dd80C259a72e81d7e4664a9801593F98d1c5
 * - Aave V3 AddressesProvider: 0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D
 */

// Base Mainnet Contract Addresses
const BASE_MAINNET = {
  UNISWAP_V3_ROUTER: "0x2626664c2603336E57B271c5C0b26F421741e481",
  SUSHISWAP_ROUTER: "0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891",
  AAVE_POOL: "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
  AAVE_ADDRESSES_PROVIDER: "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D"
};

// Base Testnet (Sepolia) Contract Addresses
const BASE_TESTNET = {
  UNISWAP_V3_ROUTER: "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4",
  SUSHISWAP_ROUTER: "0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891", // Use mainnet address if not available on testnet
  AAVE_POOL: "0x07eA79F68B2B3df564D0A34F8e19D9B1e339814b", // Base Sepolia Aave Pool
  AAVE_ADDRESSES_PROVIDER: "0x9957E7F97f4C5357C2c93Fb0D618a0B87e0C97a1" // Base Sepolia Aave Provider
};

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying FlashSwapV2 with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  
  // Determine which network we're deploying to
  const network = await ethers.provider.getNetwork();
  console.log("Deploying to network:", network.name, "chainId:", network.chainId);
  
  // Select addresses based on network
  let config;
  if (network.chainId === 8453) {
    // Base Mainnet
    console.log("Using Base Mainnet addresses");
    config = BASE_MAINNET;
  } else if (network.chainId === 84532) {
    // Base Sepolia (testnet)
    console.log("Using Base Sepolia (testnet) addresses");
    config = BASE_TESTNET;
  } else if (network.chainId === 31337) {
    // Hardhat local network - use mainnet addresses for forking
    console.log("Using Base Mainnet addresses for local/forked network");
    config = BASE_MAINNET;
  } else {
    throw new Error(`Unsupported network chainId: ${network.chainId}. This script only supports Base Mainnet (8453), Base Sepolia (84532), or Hardhat local (31337)`);
  }
  
  console.log("\nDeploying with configuration:");
  console.log("- Uniswap V3 Router:", config.UNISWAP_V3_ROUTER);
  console.log("- SushiSwap Router:", config.SUSHISWAP_ROUTER);
  console.log("- Aave Pool:", config.AAVE_POOL);
  console.log("- Aave Addresses Provider:", config.AAVE_ADDRESSES_PROVIDER);
  
  // Deploy FlashSwapV2
  const FlashSwapV2 = await ethers.getContractFactory("FlashSwapV2");
  const flashSwapV2 = await FlashSwapV2.deploy(
    config.UNISWAP_V3_ROUTER,
    config.SUSHISWAP_ROUTER,
    config.AAVE_POOL,
    config.AAVE_ADDRESSES_PROVIDER
  );
  
  await flashSwapV2.deployed();
  
  console.log("\n✅ FlashSwapV2 deployed successfully!");
  console.log("Contract address:", flashSwapV2.address);
  console.log("Owner address:", deployer.address);
  
  // Wait for a few blocks before verification
  console.log("\nWaiting for 5 block confirmations...");
  await flashSwapV2.deployTransaction.wait(5);
  
  console.log("\n📝 To verify the contract on Basescan, run:");
  console.log(`npx hardhat verify --network base ${flashSwapV2.address} ${config.UNISWAP_V3_ROUTER} ${config.SUSHISWAP_ROUTER} ${config.AAVE_POOL} ${config.AAVE_ADDRESSES_PROVIDER}`);
  
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
