import hre from "hardhat";
import { AbiCoder, formatUnits, parseUnits } from "ethers";
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
  console.log("Starting arbitrage script...");

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
  
  // Get token addresses with fallback and validation
  const WETH_ADDRESS = requireAddress(netName, "weth", 
    `WETH address is required for flash loans on ${network.name}`);
  const USDC_ADDRESS = addresses.usdc || ""; // USDC (for Base mainnet WETH/USDC route)
  const DAI_ADDRESS = addresses.dai || ""; // DAI (for testnet compatibility)
  
  // Flash loan configuration
  // TESTNET: Use small amounts to avoid liquidity issues and reduce gas costs
  // MAINNET: Use very small amounts for initial testing, then scale up
  const FLASH_LOAN_ASSET = WETH_ADDRESS; // Use WETH as it's most reliable
  // For Base mainnet initial test: 0.001 WETH (~$2-3)
  // For testnet: 0.1 WETH
  const isBaseMainnet = network.name === "base";
  const LOAN_AMOUNT = isBaseMainnet 
    ? parseUnits("0.001", 18) // MAINNET: Start with 0.001 WETH for safety
    : parseUnits("0.1", 18);   // TESTNET: 0.1 WETH

  // MAINNET: Increase to 1000+ for profitable trades
  
  console.log(`\n=== Network: ${network.name} ===`);
  console.log(`Flash Loan Asset: WETH (${FLASH_LOAN_ASSET})`);
  console.log(`Loan Amount: ${formatUnits(LOAN_AMOUNT, 18)} WETH`);
  if (isBaseMainnet) {
    console.log("⚠️  BASE MAINNET: Using minimal 0.001 WETH for initial safety test");
    console.log("   Increase amount after confirming successful execution\n");
  } else if (network.name === "baseSepolia") {
    console.log("NOTE: Using amounts suitable for testnet.\n");
  }

  // Get DEX router addresses from centralized config
  const uniswapV3Router = requireAddress(netName, "uniswapV3Router",
    `Uniswap V3 router address is required for Base arbitrage on ${network.name}`);
  const sushiRouter = requireAddress(netName, "sushiRouter",
    `SushiSwap router address is required for Base arbitrage on ${network.name}`);

  console.log("DEX Configurations:");
  console.log(`  Uniswap V3 Router: ${uniswapV3Router}`);
  console.log(`  SushiSwap Router: ${sushiRouter}`);

  console.log("\nConnecting to deployed FlashSwapV2 contract...");
  const flashSwapV2Address = process.env.FLASHSWAP_V2_ADDRESS;
  if (!flashSwapV2Address) {
    throw new Error("FLASHSWAP_V2_ADDRESS environment variable is not set");
  }
  const FlashSwapV2Factory = await ethers.getContractFactory("FlashSwapV2");
  const flashSwapV2 = FlashSwapV2Factory.attach(flashSwapV2Address);
  console.log(`Connected to FlashSwapV2 at: ${flashSwapV2Address}`);

  // --- 2. Define Arbitrage Route ---
  // BASE MAINNET ROUTE: WETH → USDC → WETH (most liquid pair on Base)
  // TESTNET ROUTE: WETH → DAI → WETH (if DAI available)
  // 
  // FlashSwapV2 DEX Type Constants:
  // DEX_TYPE_UNISWAP_V3 = 0
  // DEX_TYPE_SUSHISWAP = 1 (also used for Uniswap V2 and other V2-compatible DEXes)
  // DEX_TYPE_DODO = 2 (currently disabled)
  const DEX_TYPE_UNISWAP_V3 = 0;
  const DEX_TYPE_SUSHISWAP = 1;
  
  const [deployer] = await ethers.getSigners();
  
  // Select intermediate token based on network
  let intermediateToken: string;
  let intermediateTokenName: string;
  
  if (isBaseMainnet) {
    // Base mainnet: Use USDC (most liquid with WETH)
    if (!USDC_ADDRESS) {
      console.log("\n❌ Error: USDC address not configured for Base mainnet.");
      console.log("Cannot proceed with WETH → USDC → WETH arbitrage.\n");
      return;
    }
    intermediateToken = USDC_ADDRESS;
    intermediateTokenName = "USDC";
  } else {
    // Testnet: Use DAI if available, otherwise USDC
    if (DAI_ADDRESS) {
      intermediateToken = DAI_ADDRESS;
      intermediateTokenName = "DAI";
    } else if (USDC_ADDRESS) {
      intermediateToken = USDC_ADDRESS;
      intermediateTokenName = "USDC";
    } else {
      console.log("\n⚠️  Warning: Neither DAI nor USDC address configured for this network.");
      console.log("Cannot proceed with arbitrage.\n");
      return;
    }
  }
  
  // Two-hop arbitrage path with proper fee tier for UniV3 on Base
  // Base uses Uniswap V3 for better capital efficiency
  const arbitrageParams = {
    path: [
      {
        pool: uniswapV3Router, // Uniswap V3 router (primary on Base)
        tokenIn: FLASH_LOAN_ASSET, // WETH
        tokenOut: intermediateToken, // USDC (mainnet) or DAI/USDC (testnet)
        fee: 500, // 0.05% fee tier (common for stablecoin pairs with WETH on Base)
        minOut: 0, // Accept any output for intermediate swap (will be improved with price checks)
        dexType: DEX_TYPE_UNISWAP_V3
      },
      {
        pool: sushiRouter, // SushiSwap for the return path (potential arbitrage)
        tokenIn: intermediateToken, // USDC/DAI
        tokenOut: FLASH_LOAN_ASSET, // Back to WETH
        fee: 3000, // 0.3% fee tier (standard for V2 DEXes)
        minOut: LOAN_AMOUNT, // Minimum output to ensure we can repay the loan
        // MAINNET: Set minOut higher to ensure profitability after fees
        dexType: DEX_TYPE_SUSHISWAP
      }
    ],
    initiator: deployer.address
  };

  console.log("\nArbitrage Route:");
  console.log(`  Step 1: WETH → ${intermediateTokenName} via Uniswap V3 (0.05% fee)`);
  console.log(`  Step 2: ${intermediateTokenName} → WETH via SushiSwap (0.3% fee)`);
  console.log("\nConstructed arbitrage parameters:", JSON.stringify(arbitrageParams, null, 2));

  // --- 3. Execute Flash Loan ---
  console.log(`\nRequesting flash loan of ${formatUnits(LOAN_AMOUNT, 18)} WETH...`);

  try {
    // First, try to estimate gas to catch errors before sending transaction
    const encodedParams = AbiCoder.defaultAbiCoder().encode(
      ["tuple(tuple(address pool, address tokenIn, address tokenOut, uint24 fee, uint256 minOut, uint8 dexType)[] path, address initiator)"],
      [arbitrageParams]
    );
    
    console.log("Estimating gas...");
    try {
      // ethers v6: Use contract.method.estimateGas() instead of contract.estimateGas.method()
      const gasEstimate = await flashSwapV2.initiateAaveFlashLoan.estimateGas(
        FLASH_LOAN_ASSET,
        LOAN_AMOUNT,
        encodedParams
      );
      console.log(`Estimated gas: ${gasEstimate.toString()}`);
    } catch (gasError: any) {
      console.error("\n❌ Gas estimation failed!");
      console.error("Error details:", gasError?.message || gasError);
      console.error("\nDecoded error:", decodeAaveError(gasError));
      console.error("\nPossible causes:");
      console.error("  1. The flash loan asset is not active on Aave (Error 27: RESERVE_INACTIVE)");
      console.error("  2. The pools don't have sufficient liquidity on testnet");
      console.error("  3. The token pair doesn't exist on one of the DEXes");
      console.error("\nSuggestions:");
      console.error("  - Verify the asset is available on Aave Base Sepolia");
      console.error("  - Check if the token pairs exist on both DEXes");
      console.error("  - Try using a different token (e.g., WETH is more likely to be available)");
      throw gasError;
    }
    
    const tx = await flashSwapV2.initiateAaveFlashLoan(
      FLASH_LOAN_ASSET,
      LOAN_AMOUNT,
      encodedParams
    );
    console.log("\n✅ Flash loan transaction sent! Hash:", tx.hash);
    console.log("Waiting for confirmation...");
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed!");
    console.log(`Gas used: ${receipt.gasUsed.toString()}`);
    console.log("\nArbitrage execution complete. Check contract for profit.");
    console.log(`View transaction: https://sepolia.basescan.org/tx/${tx.hash}`);
  } catch (error: any) {
    console.error("\n❌ Arbitrage transaction failed!");
    console.error("Error:", error?.message || error);
    console.error("\nDecoded error:", decodeAaveError(error));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
