// SPDX-License-Identifier: MIT
/**
 * @title Deploy FlashSwapV2 with The 70/30 Split
 * @notice Deployment script for FlashSwapV2 v4.1 with integrated tithe system
 * @dev This script deploys the contract with the 70% tithe for US debt reduction
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-flashswap-v2-tithe.ts --network base
 * 
 * Environment Variables Required:
 *   - TITHE_WALLET_ADDRESS: Recipient of 70% tithe (US debt reduction wallet)
 *   - TITHE_BPS: Basis points for tithe (7000 = 70%)
 *   - WALLET_PRIVATE_KEY: Deployer wallet private key
 */

import hre from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
    console.log("🚀 Deploying FlashSwapV2 v4.1 with The 70/30 Split...\n");

    const ethers = (hre as any).ethers;

    // --- Configuration ---
    const UNISWAP_V3_ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481"; // Base mainnet
    const SUSHISWAP_ROUTER = "0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891";  // Base mainnet  
    const AAVE_POOL = "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5";           // Base mainnet
    const AAVE_ADDRESSES_PROVIDER = "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D"; // Base mainnet

    // Tithe configuration from environment
    const TITHE_RECIPIENT = process.env.TITHE_WALLET_ADDRESS;
    const TITHE_BPS = parseInt(process.env.TITHE_BPS || "7000"); // Default 70%

    // --- Validation ---
    if (!TITHE_RECIPIENT) {
        throw new Error("❌ TITHE_WALLET_ADDRESS not set in .env");
    }

    if (!ethers.isAddress(TITHE_RECIPIENT)) {
        throw new Error(`❌ Invalid TITHE_WALLET_ADDRESS: ${TITHE_RECIPIENT}`);
    }

    if (TITHE_BPS > 9000) {
        throw new Error(`❌ TITHE_BPS too high: ${TITHE_BPS} (max 9000 = 90%)`);
    }

    // --- Display Configuration ---
    console.log("📋 Deployment Configuration:");
    console.log("─────────────────────────────────────────");
    console.log(`Network:           ${(await ethers.provider.getNetwork()).name}`);
    console.log(`Chain ID:          ${(await ethers.provider.getNetwork()).chainId}`);
    console.log(`UniV3 Router:      ${UNISWAP_V3_ROUTER}`);
    console.log(`SushiSwap Router:  ${SUSHISWAP_ROUTER}`);
    console.log(`Aave Pool:         ${AAVE_POOL}`);
    console.log(`Aave Provider:     ${AAVE_ADDRESSES_PROVIDER}`);
    console.log(`\n🇺🇸 The 70/30 Split Configuration:`);
    console.log(`Tithe Recipient:   ${TITHE_RECIPIENT}`);
    console.log(`Tithe Percentage:  ${TITHE_BPS / 100}% (${TITHE_BPS} BPS)`);
    console.log(`Owner Share:       ${(10000 - TITHE_BPS) / 100}%`);
    console.log("─────────────────────────────────────────\n");

    // --- Deploy ---
    const [deployer] = await ethers.getSigners();
    console.log(`💼 Deployer:       ${deployer.address}`);
    console.log(`💰 Balance:        ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);

    console.log("⏳ Deploying FlashSwapV2 contract...");

    const FlashSwapV2 = await ethers.getContractFactory("FlashSwapV2");
    const flashSwapV2 = await FlashSwapV2.deploy(
        UNISWAP_V3_ROUTER,
        SUSHISWAP_ROUTER,
        AAVE_POOL,
        AAVE_ADDRESSES_PROVIDER,
        TITHE_RECIPIENT,
        TITHE_BPS
    );

    await flashSwapV2.waitForDeployment();
    const contractAddress = await flashSwapV2.getAddress();

    console.log("✅ FlashSwapV2 deployed successfully!\n");
    console.log("📍 Deployment Details:");
    console.log("─────────────────────────────────────────");
    console.log(`Contract Address:  ${contractAddress}`);
    console.log(`Owner (30%):       ${deployer.address}`);
    console.log(`Tithe (70%):       ${TITHE_RECIPIENT}`);
    console.log(`Transaction:       ${flashSwapV2.deploymentTransaction()?.hash}`);
    console.log("─────────────────────────────────────────\n");

    // --- Verification Command ---
    console.log("🔍 To verify on Basescan:");
    console.log(`npx hardhat verify --network base ${contractAddress} \\`);
    console.log(`  "${UNISWAP_V3_ROUTER}" \\`);
    console.log(`  "${SUSHISWAP_ROUTER}" \\`);
    console.log(`  "${AAVE_POOL}" \\`);
    console.log(`  "${AAVE_ADDRESSES_PROVIDER}" \\`);
    console.log(`  "${TITHE_RECIPIENT}" \\`);
    console.log(`  ${TITHE_BPS}\n`);

    // --- Environment Update ---
    console.log("📝 Update your .env file:");
    console.log(`FLASHSWAP_V2_ADDRESS=${contractAddress}\n`);

    // --- Summary ---
    console.log("✨ Deployment Complete!");
    console.log("\n🎯 Next Steps:");
    console.log("  1. Verify contract on Basescan (see command above)");
    console.log("  2. Update FLASHSWAP_V2_ADDRESS in .env");
    console.log("  3. Fund contract if needed for gas");
    console.log("  4. Run test arbitrage to verify tithe distribution");
    console.log("  5. Monitor TitheDistributed events\n");

    // --- Gas Report ---
    const deployReceipt = await flashSwapV2.deploymentTransaction()?.wait();
    if (deployReceipt) {
        console.log("⛽ Gas Usage:");
        console.log(`  Gas Used:        ${deployReceipt.gasUsed.toString()}`);
        console.log(`  Gas Price:       ${ethers.formatUnits(deployReceipt.gasPrice || 0n, "gwei")} gwei`);
        console.log(`  Total Cost:      ${ethers.formatEther(deployReceipt.gasUsed * (deployReceipt.gasPrice || 0n))} ETH\n`);
    }

    return {
        contract: flashSwapV2,
        address: contractAddress,
        owner: deployer.address,
        titheRecipient: TITHE_RECIPIENT,
        titheBps: TITHE_BPS
    };
}

// Execute deployment
main()
    .then((result) => {
        console.log("🎉 Deployment script completed successfully!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });

export default main;
