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

  console.log("Deploying ArbitrageExecutor contract...");
  const ArbitrageExecutorFactory = await ethers.getContractFactory("ArbitrageExecutor");
  const arbitrageExecutor = await ArbitrageExecutorFactory.deploy(AAVE_POOL_PROVIDER_ADDRESS_BASE);
  await arbitrageExecutor.deployed();
  console.log(`ArbitrageExecutor deployed to: ${arbitrageExecutor.address}`);

  // --- 2. Define Arbitrage Route ---
  // We will attempt to find a price inefficiency between SushiSwap and Uniswap.
  // Route: Borrow DAI, swap DAI for WETH on SushiSwap, swap WETH back for DAI on Uniswap V2.
  const arbitrageParams = {
    router1: sushiSwap.router,
    router2: uniswapV2.router,
    path1: [DAI_ADDRESS_BASE, WETH_ADDRESS_BASE],
    path2: [WETH_ADDRESS_BASE, DAI_ADDRESS_BASE],
  };

  console.log("Constructed arbitrage parameters:", arbitrageParams);

  // --- 3. Execute Flash Loan ---
  console.log(`Requesting flash loan of ${ethers.utils.formatUnits(LOAN_AMOUNT, 18)} DAI...`);

  // Note: This requires the deploying account to have funds to pay for gas.
  // In a real-world scenario, you would need to set up a proper Hardhat configuration for the Base network.
  try {
    const tx = await arbitrageExecutor.requestFlashLoan(
      DAI_ADDRESS_BASE,
      LOAN_AMOUNT,
      arbitrageParams
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
