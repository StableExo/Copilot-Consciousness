import { ethers } from "hardhat";
import { DEXRegistry } from "../src/dex/core/DEXRegistry";

async function main() {
  console.log("Starting arbitrage script...");

  // --- 1. Configuration ---
  const AAVE_POOL_PROVIDER_ADDRESS_BASE = "0x2449373414902241E54854737Bed6cF10a97b274"; // Verified Aave V3 address on Base
  const DAI_ADDRESS_BASE = "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb";
  const WETH_ADDRESS_BASE = "0x4200000000000000000000000000000000000006";
  const LOAN_AMOUNT = ethers.utils.parseUnits("1000", 18); // Borrow 1,000 DAI

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

  // --- 2. Define Arbitrage Route ---
  // We will attempt to find a price inefficiency between SushiSwap and Uniswap.
  // Route: Borrow DAI, swap DAI for WETH on SushiSwap, swap WETH back for DAI on Uniswap V2.
  // FlashSwapV2 uses ArbParams with SwapStep[] path
  // DEX_TYPE_SUSHISWAP = 1, DEX_TYPE_UNISWAP_V3 = 0
  const DEX_TYPE_SUSHISWAP = 1;
  
  const [deployer] = await ethers.getSigners();
  
  const arbitrageParams = {
    path: [
      {
        pool: sushiSwap.router, // SushiSwap router address
        tokenIn: DAI_ADDRESS_BASE,
        tokenOut: WETH_ADDRESS_BASE,
        fee: 3000, // 0.3% fee tier (standard for most pairs)
        minOut: 0, // Accept any output for intermediate swap
        dexType: DEX_TYPE_SUSHISWAP
      },
      {
        pool: uniswapV2.router, // Uniswap V2 router address
        tokenIn: WETH_ADDRESS_BASE,
        tokenOut: DAI_ADDRESS_BASE,
        fee: 3000, // 0.3% fee tier
        minOut: LOAN_AMOUNT, // Minimum output to ensure profitability (at least break-even)
        dexType: DEX_TYPE_SUSHISWAP // Uniswap V2 is also V2-compatible, use SUSHISWAP type
      }
    ],
    initiator: deployer.address
  };

  console.log("Constructed arbitrage parameters:", arbitrageParams);

  // --- 3. Execute Flash Loan ---
  console.log(`Requesting flash loan of ${ethers.utils.formatUnits(LOAN_AMOUNT, 18)} DAI...`);

  // Note: This requires the deploying account to have funds to pay for gas.
  // In a real-world scenario, you would need to set up a proper Hardhat configuration for the Base network.
  try {
    // Encode the arbitrage parameters as ArbParams struct
    const encodedParams = ethers.utils.defaultAbiCoder.encode(
      ["tuple(tuple(address pool, address tokenIn, address tokenOut, uint24 fee, uint256 minOut, uint8 dexType)[] path, address initiator)"],
      [arbitrageParams]
    );
    
    const tx = await flashSwapV2.initiateAaveFlashLoan(
      DAI_ADDRESS_BASE,
      LOAN_AMOUNT,
      encodedParams
    );
    console.log("Flash loan transaction sent! Hash:", tx.hash);
    const receipt = await tx.wait();
    console.log("Transaction confirmed. Gas used:", receipt.gasUsed.toString());
    console.log("Arbitrage execution complete. Check contract for profit.");
  } catch (error) {
    console.error("Arbitrage transaction failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
