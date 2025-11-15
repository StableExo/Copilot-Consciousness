import { ethers, network } from "hardhat";
import { DEXRegistry } from "../src/dex/core/DEXRegistry";
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
  const DAI_ADDRESS = addresses.dai || ""; // DAI is optional
  
  // Flash loan configuration
  // TESTNET: Use small amounts to avoid liquidity issues and reduce gas costs
  // MAINNET: Increase to profitable amounts (e.g., 1000+ tokens)
  const FLASH_LOAN_ASSET = WETH_ADDRESS; // Use WETH as it's most reliable
  const LOAN_AMOUNT = ethers.utils.parseUnits("0.1", 18); // TESTNET: 0.1 WETH (~$200 at current prices)

  // MAINNET: Increase to 1000+ for profitable trades
  
  console.log(`\n=== Network: ${network.name} ===`);
  console.log(`Flash Loan Asset: WETH (${FLASH_LOAN_ASSET})`);
  console.log(`Loan Amount: ${ethers.utils.formatUnits(LOAN_AMOUNT, 18)} WETH`);
  if (network.name === "baseSepolia") {
    console.log("NOTE: Using small amounts suitable for testnet. Increase for mainnet.\n");
  }

  const registry = new DEXRegistry();
  const uniswapV2 = registry.getDEX("Uniswap V2 on Base");
  const sushiSwap = registry.getDEX("SushiSwap on Base");

  if (!uniswapV2 || !sushiSwap) {
    throw new Error("Required DEX configurations not found in the registry.");
  }

  console.log("DEX Configurations:");
  console.log(`  Uniswap V2 Router: ${uniswapV2.router}`);
  console.log(`  SushiSwap Router: ${sushiSwap.router}`);

  console.log("\nConnecting to deployed FlashSwapV2 contract...");
  const flashSwapV2Address = process.env.FLASHSWAP_V2_ADDRESS;
  if (!flashSwapV2Address) {
    throw new Error("FLASHSWAP_V2_ADDRESS environment variable is not set");
  }
  const FlashSwapV2Factory = await ethers.getContractFactory("FlashSwapV2");
  const flashSwapV2 = FlashSwapV2Factory.attach(flashSwapV2Address);
  console.log(`Connected to FlashSwapV2 at: ${flashSwapV2Address}`);

  // --- 2. Define Arbitrage Route ---
  // TESTNET ROUTE: Borrow WETH, swap WETH for DAI on one DEX, swap DAI back to WETH on another
  // MAINNET: Update token addresses and amounts based on actual market opportunities
  // 
  // FlashSwapV2 DEX Type Constants:
  // DEX_TYPE_UNISWAP_V3 = 0
  // DEX_TYPE_SUSHISWAP = 1 (also used for Uniswap V2 and other V2-compatible DEXes)
  // DEX_TYPE_DODO = 2 (currently disabled)
  const DEX_TYPE_SUSHISWAP = 1;
  
  const [deployer] = await ethers.getSigners();
  
  // Validate that we have DAI address for the swap
  if (!DAI_ADDRESS) {
    console.log("\n⚠️  Warning: DAI address not configured for this network.");
    console.log("Cannot proceed with WETH → DAI → WETH arbitrage.");
    console.log("Please add DAI address to config/addresses.ts or adjust the arbitrage route.\n");
    return;
  }
  
  // TESTNET: Simple two-hop arbitrage path
  // For production, use actual price discovery to find profitable routes
  const arbitrageParams = {
    path: [
      {
        pool: sushiSwap.router, // SushiSwap router address
        tokenIn: FLASH_LOAN_ASSET, // WETH
        tokenOut: DAI_ADDRESS, // DAI
        fee: 3000, // 0.3% fee tier (standard for most pairs)
        minOut: 0, // Accept any output for intermediate swap (TESTNET only!)
        dexType: DEX_TYPE_SUSHISWAP
      },
      {
        pool: uniswapV2.router, // Uniswap V2 router address
        tokenIn: DAI_ADDRESS, // DAI
        tokenOut: FLASH_LOAN_ASSET, // Back to WETH
        fee: 3000, // 0.3% fee tier
        minOut: LOAN_AMOUNT, // Minimum output to ensure we can repay the loan
        // MAINNET: Set minOut higher to ensure profitability after fees
        dexType: DEX_TYPE_SUSHISWAP // Uniswap V2 is V2-compatible, use SUSHISWAP type
      }
    ],
    initiator: deployer.address
  };

  console.log("\nArbitrage Route:");
  console.log(`  Step 1: WETH → DAI via SushiSwap`);
  console.log(`  Step 2: DAI → WETH via Uniswap V2`);
  console.log("\nConstructed arbitrage parameters:", JSON.stringify(arbitrageParams, null, 2));

  // --- 3. Execute Flash Loan ---
  console.log(`\nRequesting flash loan of ${ethers.utils.formatUnits(LOAN_AMOUNT, 18)} WETH...`);

  try {
    // First, try to estimate gas to catch errors before sending transaction
    const encodedParams = ethers.utils.defaultAbiCoder.encode(
      ["tuple(tuple(address pool, address tokenIn, address tokenOut, uint24 fee, uint256 minOut, uint8 dexType)[] path, address initiator)"],
      [arbitrageParams]
    );
    
    console.log("Estimating gas...");
    try {
      const gasEstimate = await flashSwapV2.estimateGas.initiateAaveFlashLoan(
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
