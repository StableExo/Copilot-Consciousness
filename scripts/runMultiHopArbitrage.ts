import { ethers } from "hardhat";
import { DEXRegistry } from "../src/dex/core/DEXRegistry";
import { ArbitrageOrchestrator, PathfindingConfig } from "../src/arbitrage";

async function main() {
  console.log("Starting multi-hop arbitrage script...");

  // --- 1. Configuration ---
  const AAVE_POOL_PROVIDER_ADDRESS_BASE = "0x2449373414902241E54854737Bed6cF10a97b274";
  const DAI_ADDRESS_BASE = "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb";
  const WETH_ADDRESS_BASE = "0x4200000000000000000000000000000000000006";
  const USDC_ADDRESS_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

  const registry = new DEXRegistry();
  const uniswapV2 = registry.getDEX("Uniswap V2 on Base");
  const sushiSwap = registry.getDEX("SushiSwap on Base");

  if (!uniswapV2 || !sushiSwap) {
    throw new Error("Required DEX configurations not found in the registry.");
  }

  console.log("Connecting to deployed FlashSwapV2 contract...");
  const flashSwapV2Address = process.env.FLASHSWAP_V2_ADDRESS;
  if (!flashSwapV2Address) {
    throw new Error("FLASHSWAP_V2_ADDRESS environment variable is not set");
  }
  const FlashSwapV2Factory = await ethers.getContractFactory("FlashSwapV2");
  const flashSwapV2 = FlashSwapV2Factory.attach(flashSwapV2Address);
  console.log(`Connected to FlashSwapV2 at: ${flashSwapV2Address}`);

  // --- 2. Configure Multi-Hop Pathfinding ---
  const pathConfig: PathfindingConfig = {
    maxHops: 4,
    minProfitThreshold: BigInt(ethers.utils.parseEther("10").toString()),
    maxSlippage: 0.05,
    gasPrice: BigInt(ethers.utils.parseUnits("50", "gwei").toString())
  };

  const orchestrator = new ArbitrageOrchestrator(registry, pathConfig, pathConfig.gasPrice);

  // --- 3. Find Multi-Hop Arbitrage Opportunities ---
  const tokens = [DAI_ADDRESS_BASE, WETH_ADDRESS_BASE, USDC_ADDRESS_BASE];
  const startAmount = BigInt(ethers.utils.parseEther("1000").toString());

  console.log("\nSearching for multi-hop arbitrage opportunities...");
  console.log("Note: This requires actual on-chain data. The example shows the workflow.");

  try {
    const paths = await orchestrator.findOpportunities(tokens, startAmount);

    if (paths.length === 0) {
      console.log("No profitable multi-hop arbitrage opportunities found.");
      console.log("This could be due to:");
      console.log("  - Efficient market pricing");
      console.log("  - High gas costs");
      console.log("  - Insufficient liquidity");
      return;
    }

    console.log(`\nFound ${paths.length} potential arbitrage paths`);

    // Get the most profitable path
    const bestPath = paths[0];
    console.log("\nBest Path Details:");
    console.log(`  Hops: ${bestPath.hops.length}`);
    console.log(`  Estimated Profit: ${ethers.utils.formatEther(bestPath.estimatedProfit.toString())} tokens`);
    console.log(`  Net Profit: ${ethers.utils.formatEther(bestPath.netProfit.toString())} tokens`);

    // --- 4. Prepare Multi-Hop Execution Parameters ---
    // FlashSwapV2 uses ArbParams with SwapStep[] path
    const [deployer] = await ethers.getSigners();
    
    const multiHopParams = {
      path: bestPath.hops.map(hop => {
        const dex = registry.getDEX(hop.dexName);
        // Determine DEX type based on DEX name
        let dexType = 1; // Default to SUSHISWAP (V2-compatible)
        if (hop.dexName.includes("Uniswap V3")) {
          dexType = 0; // UNISWAP_V3
        }
        
        // Set minimum amount to 95% of expected output (5% slippage tolerance)
        const minAmount = (hop.amountOut * BigInt(95)) / BigInt(100);
        
        return {
          pool: dex ? dex.router : "",
          tokenIn: hop.tokenIn,
          tokenOut: hop.tokenOut,
          fee: 3000, // 0.3% fee tier (standard)
          minOut: minAmount.toString(),
          dexType: dexType
        };
      }),
      initiator: deployer.address
    };

    console.log("\nMulti-Hop Route:");
    bestPath.hops.forEach((hop, index) => {
      console.log(`  ${index + 1}. ${hop.dexName}: ${hop.tokenIn.substring(0, 6)}... → ${hop.tokenOut.substring(0, 6)}...`);
    });

    // --- 5. Execute Multi-Hop Flash Loan ---
    console.log(`\nRequesting multi-hop flash loan...`);

    // Encode the arbitrage parameters as ArbParams struct
    const encodedParams = ethers.utils.defaultAbiCoder.encode(
      ["tuple(tuple(address pool, address tokenIn, address tokenOut, uint24 fee, uint256 minOut, uint8 dexType)[] path, address initiator)"],
      [multiHopParams]
    );
    
    const tx = await flashSwapV2.initiateAaveFlashLoan(
      bestPath.startToken,
      startAmount.toString(),
      encodedParams
    );
    console.log("Flash loan transaction sent! Hash:", tx.hash);
    const receipt = await tx.wait();
    console.log("Transaction confirmed. Gas used:", receipt.gasUsed.toString());

    console.log("\nMulti-hop arbitrage workflow complete.");
    console.log("Orchestrator Stats:");
    const stats = orchestrator.getStats();
    console.log(`  Token Count: ${stats.tokenCount}`);
    console.log(`  Edge Count: ${stats.edgeCount}`);
    console.log(`  Cached Pools: ${stats.cachedPools}`);

  } catch (error) {
    console.error("Error during multi-hop arbitrage:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
