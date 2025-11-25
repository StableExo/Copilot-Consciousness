import hre from "hardhat";
import { AbiCoder, formatEther, parseEther, parseUnits } from "ethers";
import { DEXRegistry } from "../src/dex/core/DEXRegistry";
import { ArbitrageOrchestrator, PathfindingConfig } from "../src/arbitrage";
import { ADDRESSES, NetworkKey, requireAddress } from "../config/addresses";

/**
 * Decode Aave error codes for better debugging
 * Reference: https://github.com/aave/aave-v3-core/blob/master/contracts/protocol/libraries/helpers/Errors.sol
 */
function decodeAaveError(error: any): string {
  const errorMap: { [key: string]: string } = {
    '27': 'RESERVE_INACTIVE - The asset is not configured as an active reserve in Aave',
    '26': 'INVALID_AMOUNT - Amount must be greater than 0',
    '91': 'FLASHLOAN_DISABLED - Flash loaning for this asset is disabled',
    '13': 'INVALID_FLASHLOAN_EXECUTOR_RETURN - Invalid return value from flash loan executor',
    '49': 'INCONSISTENT_FLASHLOAN_PARAMS - Inconsistent flash loan parameters'
  };
  
  const errorString = error?.message || error?.toString() || '';
  
  // Try to extract error code from revert message
  const matches = errorString.match(/execution reverted: (\d+)/);
  if (matches && matches[1]) {
    const code = matches[1];
    return errorMap[code] || `Unknown Aave error code: ${code}`;
  }
  
  return errorString;
}

async function main() {
  const ethers = (hre as any).ethers;
  const network = hre.network;
  console.log("Starting multi-hop arbitrage script...");

  // --- 1. Configuration ---
  // Get addresses from centralized config based on current network
  const netName = network.name as NetworkKey;
  const addresses = ADDRESSES[netName];
  
  if (!addresses) {
    throw new Error(
      `No address configuration found for network: ${network.name}\n` +
      `Please add addresses to config/addresses.ts for this network.`
    );
  }
  
  // Get token addresses
  const WETH_ADDRESS = requireAddress(netName, "weth", 
    `WETH address is required for flash loans on ${network.name}`);
  const USDC_ADDRESS = addresses.usdc || ""; // USDC (for Base mainnet)
  const DAI_ADDRESS = addresses.dai || ""; // DAI (for testnet)
  
  console.log(`\n=== Network: ${network.name} ===`);
  console.log("Using WETH as primary asset (most likely to be active on Aave)");
  if (network.name === "base") {
    console.log("⚠️  BASE MAINNET: Using minimal amounts for initial safety test");
  }
  console.log("NOTE: Multi-hop arbitrage requires all pools to exist with sufficient liquidity\n");

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
  // BASE MAINNET: Use very small thresholds for initial testing
  // TESTNET: Use smaller thresholds suitable for testnet liquidity
  const isBaseMainnet = network.name === "base";
  const pathConfig: PathfindingConfig = {
    maxHops: 4,
    minProfitThreshold: isBaseMainnet 
      ? BigInt(parseEther("0.0001").toString()) // MAINNET: 0.0001 ETH for initial test
      : BigInt(parseEther("0.01").toString()),  // TESTNET: 0.01 ETH
    maxSlippage: 0.05,
    gasPrice: BigInt(parseUnits("50", "gwei").toString())
  };

  const orchestrator = new ArbitrageOrchestrator(registry, pathConfig, pathConfig.gasPrice);

  // --- 3. Find Multi-Hop Arbitrage Opportunities ---
  // Build token list from configured addresses
  const tokens = [WETH_ADDRESS];
  if (USDC_ADDRESS) tokens.push(USDC_ADDRESS);
  if (DAI_ADDRESS) tokens.push(DAI_ADDRESS);
  
  const startAmount = isBaseMainnet
    ? BigInt(parseEther("0.001").toString()) // MAINNET: 0.001 WETH for safety
    : BigInt(parseEther("0.1").toString());  // TESTNET: 0.1 WETH

  console.log("\nSearching for multi-hop arbitrage opportunities...");
  console.log(`Available tokens: ${tokens.length} (WETH${USDC_ADDRESS ? ', USDC' : ''}${DAI_ADDRESS ? ', DAI' : ''})`);
  
  if (isBaseMainnet) {
    console.log("⚠️  BASE MAINNET: Using minimal 0.001 WETH for initial safety test");
  } else if (network.name === "baseSepolia") {
    console.log("⚠️  NOTE: This is an illustrative example. On testnet:");
    console.log("  - Liquidity may be insufficient for actual arbitrage");
    console.log("  - Price feeds may not reflect real market conditions");
    console.log("  - Some token pairs may not exist");
  }

  try {
    const paths = await orchestrator.findOpportunities(tokens, startAmount);

    if (paths.length === 0) {
      console.log("\n❌ No profitable multi-hop arbitrage opportunities found.");
      console.log("This is expected on testnet due to:");
      console.log("  - Limited liquidity in test pools");
      console.log("  - Efficient market pricing (even on testnets)");
      console.log("  - High gas costs relative to small test amounts");
      console.log("\nFor mainnet:");
      console.log("  1. Increase start amount to 1000+ tokens");
      console.log("  2. Add more token pairs with confirmed liquidity");
      console.log("  3. Adjust minProfitThreshold to realistic values");
      console.log("  4. Monitor mempool for real-time opportunities");
      return;
    }

    console.log(`\n✅ Found ${paths.length} potential arbitrage paths`);

    // Get the most profitable path
    const bestPath = paths[0];
    console.log("\nBest Path Details:");
    console.log(`  Hops: ${bestPath.hops.length}`);
    console.log(`  Estimated Profit: ${formatEther(bestPath.estimatedProfit.toString())} tokens`);
    console.log(`  Net Profit: ${formatEther(bestPath.netProfit.toString())} tokens`);

    // --- 4. Prepare Multi-Hop Execution Parameters ---
    const [deployer] = await ethers.getSigners();
    
    const DEX_TYPE_SUSHISWAP = 1; // Also used for Uniswap V2 and V2-compatible DEXes
    const DEX_TYPE_UNISWAP_V3 = 0;
    
    const multiHopParams = {
      path: bestPath.hops.map(hop => {
        const dex = registry.getDEX(hop.dexName);
        // Determine DEX type based on DEX name
        let dexType = DEX_TYPE_SUSHISWAP; // Default to V2-compatible
        if (hop.dexName.includes("Uniswap V3")) {
          dexType = DEX_TYPE_UNISWAP_V3;
        }
        
        // Set minimum amount to 95% of expected output (5% slippage tolerance)
        // TESTNET: Accept higher slippage due to low liquidity
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

    try {
      // Encode the arbitrage parameters as ArbParams struct
      const encodedParams = AbiCoder.defaultAbiCoder().encode(
        ["tuple(tuple(address pool, address tokenIn, address tokenOut, uint24 fee, uint256 minOut, uint8 dexType)[] path, address initiator)"],
        [multiHopParams]
      );
      
      console.log("Estimating gas...");
      try {
        // ethers v6: Use contract.method.estimateGas() instead of contract.estimateGas.method()
        const gasEstimate = await flashSwapV2.initiateAaveFlashLoan.estimateGas(
          bestPath.startToken,
          startAmount.toString(),
          encodedParams
        );
        console.log(`Estimated gas: ${gasEstimate.toString()}`);
      } catch (gasError: any) {
        console.error("\n❌ Gas estimation failed!");
        console.error("Error details:", gasError?.message || gasError);
        console.error("\nDecoded error:", decodeAaveError(gasError));
        console.error("\nPossible causes:");
        console.error("  1. The flash loan asset is not active on Aave (Error 27: RESERVE_INACTIVE)");
        console.error("  2. One or more pools don't exist or lack liquidity");
        console.error("  3. Token pair doesn't exist on one of the DEXes");
        throw gasError;
      }
      
      const tx = await flashSwapV2.initiateAaveFlashLoan(
        bestPath.startToken,
        startAmount.toString(),
        encodedParams
      );
      console.log("\n✅ Flash loan transaction sent! Hash:", tx.hash);
      console.log("Waiting for confirmation...");
      const receipt = await tx.wait();
      console.log("✅ Transaction confirmed!");
      console.log(`Gas used: ${receipt.gasUsed.toString()}`);

      console.log("\nMulti-hop arbitrage workflow complete.");
      console.log("Orchestrator Stats:");
      const stats = orchestrator.getStats();
      console.log(`  Token Count: ${stats.tokenCount}`);
      console.log(`  Edge Count: ${stats.edgeCount}`);
      console.log(`  Cached Pools: ${stats.cachedPools}`);
      console.log(`View transaction: https://sepolia.basescan.org/tx/${tx.hash}`);
    } catch (txError: any) {
      console.error("\n❌ Transaction failed!");
      console.error("Error:", txError?.message || txError);
      console.error("\nDecoded error:", decodeAaveError(txError));
    }

  } catch (error: any) {
    console.error("\n❌ Error during multi-hop arbitrage:");
    console.error(error?.message || error);
    console.error("\nDecoded error:", decodeAaveError(error));
    console.error("\nThis is often expected on testnet. See notes above about testnet limitations.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
