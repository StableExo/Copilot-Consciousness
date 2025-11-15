import { ethers, network } from "hardhat";
import { ADDRESSES, NetworkKey, requireAddress } from "../config/addresses";

/**
 * Dry-Run Simulation for FlashSwapV2 Arbitrage
 * 
 * This script simulates the arbitrage execution without sending a transaction.
 * It performs gas estimation and validates the route configuration.
 * 
 * Usage:
 *   npx hardhat run scripts/dryRunArbitrage.ts --network base
 * 
 * Benefits:
 *   - Validates route before spending gas
 *   - Estimates gas costs
 *   - Identifies potential revert reasons
 *   - Safe to run multiple times
 */

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("  FLASHSWAPV2 ARBITRAGE DRY-RUN SIMULATION");
  console.log("=".repeat(70) + "\n");

  // --- 1. Configuration ---
  const netName = network.name as NetworkKey;
  const addresses = ADDRESSES[netName];
  
  if (!addresses) {
    throw new Error(`No address configuration found for network: ${network.name}`);
  }
  
  const WETH_ADDRESS = requireAddress(netName, "weth");
  const USDC_ADDRESS = addresses.usdc || "";
  const isBaseMainnet = network.name === "base";
  
  if (!USDC_ADDRESS && isBaseMainnet) {
    throw new Error("USDC address required for Base mainnet route");
  }
  
  // Use small amount for simulation
  const FLASH_LOAN_ASSET = WETH_ADDRESS;
  const LOAN_AMOUNT = isBaseMainnet 
    ? ethers.utils.parseUnits("0.001", 18)
    : ethers.utils.parseUnits("0.01", 18);

  console.log(`Network: ${network.name}`);
  console.log(`Flash Loan Asset: WETH (${FLASH_LOAN_ASSET})`);
  console.log(`Simulation Amount: ${ethers.utils.formatUnits(LOAN_AMOUNT, 18)} WETH`);
  console.log();

  // --- 2. Connect to Contract ---
  const flashSwapV2Address = process.env.FLASHSWAP_V2_ADDRESS;
  if (!flashSwapV2Address) {
    console.log("❌ Error: FLASHSWAP_V2_ADDRESS environment variable not set");
    console.log("   Deploy the contract first, then set FLASHSWAP_V2_ADDRESS in .env\n");
    return;
  }

  console.log(`Connecting to FlashSwapV2 at: ${flashSwapV2Address}`);
  
  const FlashSwapV2Factory = await ethers.getContractFactory("FlashSwapV2");
  const flashSwapV2 = FlashSwapV2Factory.attach(flashSwapV2Address);
  
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  
  // Verify owner
  const owner = await flashSwapV2.owner();
  const isOwner = owner.toLowerCase() === deployerAddress.toLowerCase();
  console.log(`Contract Owner: ${owner}`);
  console.log(`Your Address: ${deployerAddress}`);
  console.log(`Are you owner: ${isOwner ? "✅ YES" : "❌ NO"}`);
  
  if (!isOwner) {
    console.log("\n❌ Error: You are not the contract owner");
    console.log("   Only the owner can initiate flash loans\n");
    return;
  }
  console.log();

  // --- 3. Build Arbitrage Route ---
  const DEX_TYPE_UNISWAP_V3 = 0;
  const DEX_TYPE_SUSHISWAP = 1;
  
  const uniswapV3Router = requireAddress(netName, "uniswapV3Router");
  const sushiRouter = requireAddress(netName, "sushiRouter");
  
  const arbitrageParams = {
    path: [
      {
        pool: uniswapV3Router,
        tokenIn: FLASH_LOAN_ASSET,
        tokenOut: USDC_ADDRESS,
        fee: 500, // 0.05% for WETH/USDC on Uniswap V3
        minOut: 0, // Will be replaced with actual minimum in production
        dexType: DEX_TYPE_UNISWAP_V3
      },
      {
        pool: sushiRouter,
        tokenIn: USDC_ADDRESS,
        tokenOut: FLASH_LOAN_ASSET,
        fee: 3000, // 0.3% for V2 DEX
        minOut: LOAN_AMOUNT, // At minimum must repay loan
        dexType: DEX_TYPE_SUSHISWAP
      }
    ],
    initiator: deployerAddress
  };

  console.log("Arbitrage Route Configuration:");
  console.log(`  Step 1: WETH → USDC via Uniswap V3`);
  console.log(`    Router: ${uniswapV3Router}`);
  console.log(`    Fee Tier: 0.05%`);
  console.log(`  Step 2: USDC → WETH via SushiSwap`);
  console.log(`    Router: ${sushiRouter}`);
  console.log(`    Fee Tier: 0.3%`);
  console.log();

  // --- 4. Encode Parameters ---
  const encodedParams = ethers.utils.defaultAbiCoder.encode(
    ["tuple(tuple(address pool, address tokenIn, address tokenOut, uint24 fee, uint256 minOut, uint8 dexType)[] path, address initiator)"],
    [arbitrageParams]
  );

  console.log("Encoded parameters size:", encodedParams.length / 2 - 1, "bytes");
  console.log();

  // --- 5. Gas Estimation ---
  console.log("=".repeat(70));
  console.log("  GAS ESTIMATION");
  console.log("=".repeat(70) + "\n");

  try {
    console.log("Estimating gas for flash loan execution...");
    const gasEstimate = await flashSwapV2.estimateGas.initiateAaveFlashLoan(
      FLASH_LOAN_ASSET,
      LOAN_AMOUNT,
      encodedParams
    );
    
    console.log(`✅ Gas Estimate: ${gasEstimate.toString()}`);
    console.log();

    // Calculate cost estimates at different gas prices
    const gasPrices = [
      { label: "Low (0.01 gwei)", price: ethers.utils.parseUnits("0.01", "gwei") },
      { label: "Medium (0.05 gwei)", price: ethers.utils.parseUnits("0.05", "gwei") },
      { label: "High (0.1 gwei)", price: ethers.utils.parseUnits("0.1", "gwei") }
    ];

    console.log("Estimated Transaction Costs:");
    for (const { label, price } of gasPrices) {
      const cost = gasEstimate.mul(price);
      const costInEth = ethers.utils.formatEther(cost);
      console.log(`  ${label}: ${costInEth} ETH ($${(parseFloat(costInEth) * 2000).toFixed(2)} @ $2000/ETH)`);
    }
    console.log();

    // Get current gas price
    const currentGasPrice = await ethers.provider.getGasPrice();
    const currentCost = gasEstimate.mul(currentGasPrice);
    console.log(`Current Network Gas Price: ${ethers.utils.formatUnits(currentGasPrice, "gwei")} gwei`);
    console.log(`Estimated Cost at Current Price: ${ethers.utils.formatEther(currentCost)} ETH`);
    console.log();

    // --- 6. Route Validation ---
    console.log("=".repeat(70));
    console.log("  ROUTE VALIDATION");
    console.log("=".repeat(70) + "\n");

    // Check if pools exist (basic validation)
    const provider = ethers.provider;
    
    console.log("Validating DEX routers...");
    const uniV3Code = await provider.getCode(uniswapV3Router);
    const sushiCode = await provider.getCode(sushiRouter);
    
    console.log(`  Uniswap V3 Router: ${uniV3Code.length > 2 ? "✅ Deployed" : "❌ Not found"}`);
    console.log(`  SushiSwap Router: ${sushiCode.length > 2 ? "✅ Deployed" : "❌ Not found"}`);
    console.log();

    // Check Aave pool
    const aavePool = await flashSwapV2.aavePool();
    const aavePoolCode = await provider.getCode(aavePool);
    console.log("Validating Aave V3 Pool...");
    console.log(`  Aave Pool Address: ${aavePool}`);
    console.log(`  Status: ${aavePoolCode.length > 2 ? "✅ Deployed" : "❌ Not found"}`);
    console.log();

    // --- 7. Summary ---
    console.log("=".repeat(70));
    console.log("  DRY-RUN SUMMARY");
    console.log("=".repeat(70) + "\n");

    console.log("✅ SIMULATION SUCCESSFUL");
    console.log();
    console.log("Key Findings:");
    console.log(`  • Estimated Gas: ${gasEstimate.toString()}`);
    console.log(`  • Estimated Cost: ${ethers.utils.formatEther(currentCost)} ETH`);
    console.log(`  • Route: WETH → USDC → WETH`);
    console.log(`  • Flash Loan Amount: ${ethers.utils.formatUnits(LOAN_AMOUNT, 18)} WETH`);
    console.log();
    console.log("⚠️  IMPORTANT NOTES:");
    console.log("  • This is a gas estimation only - actual execution may differ");
    console.log("  • Ensure sufficient liquidity exists in the pools");
    console.log("  • Price impact and slippage are not simulated");
    console.log("  • You need enough balance to cover gas costs");
    console.log();
    console.log("Ready to execute:");
    console.log("  npx hardhat run scripts/runArbitrage.ts --network base");
    console.log();

  } catch (error: any) {
    console.log("❌ GAS ESTIMATION FAILED");
    console.log();
    
    // Parse error message
    const errorString = error?.message || error?.toString() || "";
    console.log("Error Details:");
    console.log(errorString);
    console.log();
    
    console.log("Possible Causes:");
    console.log("  1. Insufficient liquidity in one or more pools");
    console.log("  2. Token pair doesn't exist on the DEX");
    console.log("  3. Flash loan asset not active on Aave");
    console.log("  4. Slippage protection causing revert (minOut too high)");
    console.log("  5. Contract not properly configured");
    console.log();
    
    console.log("Troubleshooting Steps:");
    console.log("  1. Verify all addresses in config/addresses.ts are correct");
    console.log("  2. Check that WETH/USDC pools exist on both Uniswap V3 and SushiSwap");
    console.log("  3. Confirm WETH is available for flash loans on Aave Base");
    console.log("  4. Try a smaller flash loan amount");
    console.log("  5. Review contract deployment and initialization");
    console.log();
    
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nDry-run failed. See error details above.");
    process.exit(1);
  });
