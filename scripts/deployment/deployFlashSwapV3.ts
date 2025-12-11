import hre from "hardhat";
import { ADDRESSES, NetworkKey, requireAddress } from "../../src/config/addresses";

/**
 * Deployment script for FlashSwapV3 contract
 * 
 * This script deploys the FlashSwapV3 contract with multi-source flash loan support:
 * - Balancer V2 (0% fee)
 * - dYdX Solo Margin (0% fee, Ethereum only)
 * - Aave V3 (0.09% fee)
 * - Hybrid execution modes
 * 
 * Network addresses are automatically selected based on the --network flag.
 * 
 * Features:
 * - Automatic verification on block explorers (BaseScan, Etherscan, etc.)
 * - Configurable tithe system (default: 7000 bps = 70% US debt reduction)
 * - Multi-network support (Base, Base Sepolia, Ethereum, etc.)
 * 
 * Environment Variables:
 *   VERIFY_CONTRACT=true     Enable automatic verification after deployment
 *   SKIP_CONFIRMATION=true   Skip waiting for block confirmations (faster, less safe)
 *   TITHE_RECIPIENT=0x...    Override tithe recipient address (defaults to deployer)
 *   TITHE_BPS=7000           Override tithe basis points (default: 7000 = 70%)
 * 
 * Usage:
 *   # Deploy to Base Sepolia testnet
 *   npx hardhat run scripts/deployment/deployFlashSwapV3.ts --network baseSepolia
 * 
 *   # Deploy with verification
 *   VERIFY_CONTRACT=true npx hardhat run scripts/deployment/deployFlashSwapV3.ts --network base
 * 
 *   # Deploy with custom tithe recipient
 *   TITHE_RECIPIENT=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb TITHE_BPS=7000 \
 *     npx hardhat run scripts/deployment/deployFlashSwapV3.ts --network base
 */

// Configuration from environment
const VERIFY_CONTRACT = process.env.VERIFY_CONTRACT === "true";
const SKIP_CONFIRMATION = process.env.SKIP_CONFIRMATION === "true";
const TITHE_BPS = process.env.TITHE_BPS ? parseInt(process.env.TITHE_BPS) : 7000; // 70% default
const MAX_TITHE_BPS = 10000; // 100%

async function main() {
  // Connect to network to get NetworkConnection with networkName (Hardhat v3 API)
  const networkConnection = await hre.network.connect();
  const networkName = networkConnection.networkName;
  const ethers = (hre as any).ethers;
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying FlashSwapV3 with account:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");
  
  // Determine which network we're deploying to
  const networkInfo = await ethers.provider.getNetwork();
  console.log("Deploying to network:", networkName, "chainId:", networkInfo.chainId);
  
  // Get addresses from centralized config
  const netName = networkName as NetworkKey;
  const addresses = ADDRESSES[netName];
  
  if (!addresses) {
    throw new Error(
      `No address configuration found for network: ${networkName}\n` +
      `Please add addresses to src/config/addresses.ts for this network.`
    );
  }
  
  // Validate required addresses exist
  const uniswapV3Router = requireAddress(netName, "uniswapV3Router");
  const sushiRouter = requireAddress(netName, "sushiRouter");
  const balancerVault = requireAddress(netName, "balancerVault");
  const aavePool = requireAddress(netName, "aavePool");
  const aaveAddressesProvider = requireAddress(netName, "aaveAddressesProvider");
  const uniswapV3Factory = requireAddress(netName, "uniswapV3Factory");
  
  // dYdX is only available on Ethereum mainnet, use zero address otherwise
  const dydxSoloMargin = addresses.dydxSoloMargin || "0x0000000000000000000000000000000000000000";
  
  // Tithe recipient: use env var if provided, otherwise deployer
  const titheRecipient = process.env.TITHE_RECIPIENT || deployer.address;
  
  // Validate tithe configuration
  if (TITHE_BPS < 0 || TITHE_BPS > MAX_TITHE_BPS) {
    throw new Error(`Invalid TITHE_BPS: ${TITHE_BPS}. Must be between 0 and ${MAX_TITHE_BPS}`);
  }
  
  if (TITHE_BPS > 0 && titheRecipient === "0x0000000000000000000000000000000000000000") {
    throw new Error("TITHE_RECIPIENT cannot be zero address when TITHE_BPS > 0");
  }
  
  console.log("\n📋 Deployment Configuration:");
  console.log("━".repeat(60));
  console.log("Addresses from config/addresses.ts:");
  console.log("  - Uniswap V3 Router:", uniswapV3Router);
  console.log("  - SushiSwap Router:", sushiRouter);
  console.log("  - Balancer Vault:", balancerVault);
  console.log("  - dYdX Solo Margin:", dydxSoloMargin, dydxSoloMargin === "0x0000000000000000000000000000000000000000" ? "(Not available on this network)" : "");
  console.log("  - Aave Pool:", aavePool);
  console.log("  - Aave Addresses Provider:", aaveAddressesProvider);
  console.log("  - Uniswap V3 Factory:", uniswapV3Factory);
  console.log("\nTithe Configuration:");
  console.log("  - Tithe Recipient:", titheRecipient);
  console.log("  - Tithe BPS:", TITHE_BPS, `(${TITHE_BPS / 100}%)`);
  console.log("  - Operator Share:", MAX_TITHE_BPS - TITHE_BPS, `bps (${(MAX_TITHE_BPS - TITHE_BPS) / 100}%)`);
  console.log("━".repeat(60));
  
  // Deploy FlashSwapV3
  console.log("\n🚀 Starting deployment...");
  const FlashSwapV3 = await ethers.getContractFactory("FlashSwapV3");
  const flashSwapV3 = await FlashSwapV3.deploy(
    uniswapV3Router,
    sushiRouter,
    balancerVault,
    dydxSoloMargin,
    aavePool,
    aaveAddressesProvider,
    uniswapV3Factory,
    titheRecipient,
    TITHE_BPS
  );
  
  // ethers v6: Use waitForDeployment() instead of deployed()
  await flashSwapV3.waitForDeployment();
  
  // ethers v6: Use getAddress() to get contract address
  const contractAddress = await flashSwapV3.getAddress();
  
  console.log("\n✅ FlashSwapV3 deployed successfully!");
  console.log("━".repeat(60));
  console.log("Contract address:", contractAddress);
  console.log("Owner address:", deployer.address);
  console.log("Tithe recipient:", titheRecipient);
  console.log("Tithe split:", `${TITHE_BPS / 100}% debt reduction / ${(MAX_TITHE_BPS - TITHE_BPS) / 100}% operator`);
  console.log("━".repeat(60));
  
  // Wait for a few blocks before verification
  if (!SKIP_CONFIRMATION) {
    console.log("\n⏳ Waiting for 5 block confirmations...");
    const deployTx = flashSwapV3.deploymentTransaction();
    if (deployTx) {
      await deployTx.wait(5);
      console.log("✅ 5 confirmations received");
    } else {
      console.log("⚠️  Deployment transaction not available, skipping confirmation wait");
    }
  } else {
    console.log("\n⚡ Skipping block confirmations (SKIP_CONFIRMATION=true)");
  }
  
  // Automatic contract verification
  if (VERIFY_CONTRACT) {
    console.log("\n🔍 Starting automatic contract verification...");
    try {
      const verifyModule = await import("@nomicfoundation/hardhat-verify/verify");
      await verifyModule.verifyContract({
        address: contractAddress,
        constructorArgs: [
          uniswapV3Router,
          sushiRouter,
          balancerVault,
          dydxSoloMargin,
          aavePool,
          aaveAddressesProvider,
          uniswapV3Factory,
          titheRecipient,
          TITHE_BPS
        ],
        contract: "contracts/FlashSwapV3.sol:FlashSwapV3",
      }, hre);
      console.log("✅ Contract verified successfully!");
    } catch (verifyError: unknown) {
      const errorMessage = verifyError instanceof Error ? verifyError.message : String(verifyError);
      if (errorMessage.includes("Already Verified") || errorMessage.includes("already verified")) {
        console.log("✅ Contract is already verified!");
      } else {
        console.error("⚠️  Verification failed:", errorMessage);
        console.log("\n📝 You can manually verify later using:");
        console.log(`npx hardhat verify --network ${networkName} ${contractAddress} \\`);
        console.log(`  ${uniswapV3Router} \\`);
        console.log(`  ${sushiRouter} \\`);
        console.log(`  ${balancerVault} \\`);
        console.log(`  ${dydxSoloMargin} \\`);
        console.log(`  ${aavePool} \\`);
        console.log(`  ${aaveAddressesProvider} \\`);
        console.log(`  ${uniswapV3Factory} \\`);
        console.log(`  ${titheRecipient} \\`);
        console.log(`  ${TITHE_BPS}`);
      }
    }
  } else {
    console.log("\n📝 To verify the contract later, run:");
    console.log(`VERIFY_CONTRACT=true npx hardhat run scripts/deployment/deployFlashSwapV3.ts --network ${networkName}`);
    console.log("\nOr manually verify with:");
    console.log(`npx hardhat verify --network ${networkName} ${contractAddress} \\`);
    console.log(`  ${uniswapV3Router} ${sushiRouter} ${balancerVault} ${dydxSoloMargin} \\`);
    console.log(`  ${aavePool} ${aaveAddressesProvider} ${uniswapV3Factory} \\`);
    console.log(`  ${titheRecipient} ${TITHE_BPS}`);
  }
  
  console.log("\n💾 Save these details to your .env file:");
  console.log("━".repeat(60));
  console.log(`FLASHSWAP_V3_ADDRESS=${contractAddress}`);
  console.log(`FLASHSWAP_V3_OWNER=${deployer.address}`);
  console.log(`FLASHSWAP_V3_TITHE_RECIPIENT=${titheRecipient}`);
  console.log(`FLASHSWAP_V3_TITHE_BPS=${TITHE_BPS}`);
  console.log("━".repeat(60));
  
  console.log("\n✨ Deployment complete!");
  console.log("\n📖 Next steps:");
  console.log("  1. Add FLASHSWAP_V3_ADDRESS to your .env file");
  console.log("  2. Configure ENABLE_FLASHSWAP_V3=true in .env to use V3");
  console.log("  3. Test the deployment with: npm run test:integration");
  console.log("  4. Update OpportunityExecutor to use FlashSwapV3Executor");
  console.log("\n📚 See docs/FLASHSWAPV3_INTEGRATION_GUIDE.md for integration instructions");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
