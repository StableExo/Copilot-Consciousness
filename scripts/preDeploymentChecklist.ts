import hre from "hardhat";
import { ADDRESSES, NetworkKey, requireAddress } from "../config/addresses";

/**
 * Pre-Deployment Checklist for Base Mainnet
 * 
 * This script performs comprehensive checks before deploying FlashSwapV2 to Base mainnet.
 * Run this to verify everything is configured correctly.
 * 
 * Usage:
 *   npx hardhat run scripts/preDeploymentChecklist.ts --network base
 */

interface CheckResult {
  passed: boolean;
  message: string;
  critical: boolean;
}

async function main() {
  const ethers = (hre as any).ethers;
  const network = hre.network;
  console.log("\n" + "=".repeat(70));
  console.log("  FLASHSWAPV2 PRE-DEPLOYMENT CHECKLIST - BASE MAINNET");
  console.log("=".repeat(70) + "\n");

  const results: CheckResult[] = [];
  const [deployer] = await ethers.getSigners();
  const netName = network.name as NetworkKey;

  // Check 1: Verify we're on Base mainnet
  console.log("📋 Check 1: Network Verification");
  const networkInfo = await ethers.provider.getNetwork();
  const isBaseMainnet = network.name === "base" && networkInfo.chainId === 8453;
  results.push({
    passed: isBaseMainnet,
    message: `Network: ${network.name} (Chain ID: ${networkInfo.chainId})`,
    critical: true
  });
  console.log(`   ${isBaseMainnet ? "✅" : "❌"} ${results[results.length - 1].message}`);
  if (!isBaseMainnet) {
    console.log("   ⚠️  WARNING: This checklist is designed for Base mainnet (chain ID 8453)");
  }
  console.log();

  // Check 2: Deployer wallet setup
  console.log("📋 Check 2: Deployer Wallet");
  const deployerAddress = await deployer.getAddress();
  const deployerBalance = await ethers.provider.getBalance(deployerAddress);
  const minRequiredBalance = parseEther("0.01"); // At least 0.01 ETH for deployment
  
  results.push({
    passed: deployerBalance >= minRequiredBalance,
    message: `Deployer: ${deployerAddress}`,
    critical: true
  });
  results.push({
    passed: deployerBalance >= minRequiredBalance,
    message: `Balance: ${formatEther(deployerBalance)} ETH (min: 0.01 ETH)`,
    critical: true
  });
  
  console.log(`   ${results[results.length - 2].passed ? "✅" : "❌"} ${results[results.length - 2].message}`);
  console.log(`   ${results[results.length - 1].passed ? "✅" : "❌"} ${results[results.length - 1].message}`);
  console.log();

  // Check 3: Address configuration
  console.log("📋 Check 3: Address Configuration");
  const addresses = ADDRESSES[netName];
  
  if (!addresses) {
    results.push({
      passed: false,
      message: "Address configuration not found for network",
      critical: true
    });
    console.log(`   ❌ ${results[results.length - 1].message}`);
  } else {
    // Check required addresses
    const requiredAddresses = [
      { key: "weth", name: "WETH" },
      { key: "usdc", name: "USDC" },
      { key: "uniswapV3Router", name: "Uniswap V3 Router" },
      { key: "sushiRouter", name: "SushiSwap Router" },
      { key: "aavePool", name: "Aave V3 Pool" },
      { key: "aaveAddressesProvider", name: "Aave Addresses Provider" }
    ];

    for (const { key, name } of requiredAddresses) {
      const addr = addresses[key as keyof typeof addresses];
      const isConfigured = Boolean(addr && typeof addr === "string" && addr.length > 0);
      results.push({
        passed: isConfigured,
        message: `${name}: ${isConfigured ? addr : "NOT CONFIGURED"}`,
        critical: true
      });
      console.log(`   ${isConfigured ? "✅" : "❌"} ${results[results.length - 1].message}`);
    }
  }
  console.log();

  // Check 4: Token balances for testing
  console.log("📋 Check 4: Token Balances (for arbitrage testing)");
  try {
    const WETH = requireAddress(netName, "weth");
    const USDC = requireAddress(netName, "usdc");
    
    const erc20Abi = [
      "function balanceOf(address) view returns (uint256)",
      "function decimals() view returns (uint8)",
      "function symbol() view returns (string)"
    ];
    
    const weth = new ethers.Contract(WETH, erc20Abi, deployer);
    const usdc = new ethers.Contract(USDC, erc20Abi, deployer);
    
    const [wethBal, usdcBal, wethDec, usdcDec] = await Promise.all([
      weth.balanceOf(deployerAddress),
      usdc.balanceOf(deployerAddress),
      weth.decimals(),
      usdc.decimals()
    ]);
    
    const wethFormatted = formatUnits(wethBal, wethDec);
    const usdcFormatted = formatUnits(usdcBal, usdcDec);
    
    // Recommendations: Have at least 0.003 WETH and 10 USDC for testing
    const hasMinWETH = wethBal >= parseUnits("0.003", 18);
    const hasMinUSDC = usdcBal >= parseUnits("10", 6);
    
    results.push({
      passed: hasMinWETH,
      message: `WETH Balance: ${wethFormatted} (recommended: >= 0.003)`,
      critical: false
    });
    results.push({
      passed: hasMinUSDC,
      message: `USDC Balance: ${usdcFormatted} (recommended: >= 10)`,
      critical: false
    });
    
    console.log(`   ${hasMinWETH ? "✅" : "⚠️ "} ${results[results.length - 2].message}`);
    console.log(`   ${hasMinUSDC ? "✅" : "⚠️ "} ${results[results.length - 1].message}`);
    
    if (!hasMinWETH || !hasMinUSDC) {
      console.log("   ℹ️  Recommendation: Have some WETH/USDC for initial arbitrage tests");
    }
  } catch (error: any) {
    console.log(`   ❌ Error checking token balances: ${error.message}`);
  }
  console.log();

  // Check 5: Environment variables
  console.log("📋 Check 5: Environment Variables");
  const envVars = [
    { key: "BASE_RPC_URL", critical: true },
    { key: "WALLET_PRIVATE_KEY", critical: true },
    { key: "BASESCAN_API_KEY", critical: false }
  ];
  
  for (const { key, critical } of envVars) {
    const isSet = Boolean(process.env[key] && process.env[key]!.length > 0);
    results.push({
      passed: isSet,
      message: `${key}: ${isSet ? "SET" : "NOT SET"}`,
      critical: critical
    });
    console.log(`   ${isSet ? "✅" : (critical ? "❌" : "⚠️ ")} ${results[results.length - 1].message}`);
  }
  console.log();

  // Check 6: Contract compilation
  console.log("📋 Check 6: Contract Compilation");
  try {
    const FlashSwapV2Factory = await ethers.getContractFactory("FlashSwapV2");
    results.push({
      passed: true,
      message: "FlashSwapV2 contract compiled successfully",
      critical: true
    });
    console.log(`   ✅ ${results[results.length - 1].message}`);
  } catch (error: any) {
    results.push({
      passed: false,
      message: `Compilation error: ${error.message}`,
      critical: true
    });
    console.log(`   ❌ ${results[results.length - 1].message}`);
  }
  console.log();

  // Check 7: Verify addresses match expected Base mainnet addresses
  console.log("📋 Check 7: Base Mainnet Address Verification");
  const expectedAddresses = {
    weth: "0x4200000000000000000000000000000000000006",
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    sushiRouter: "0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891",
    aavePool: "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
    aaveAddressesProvider: "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D"
  };
  
  if (addresses && network.name === "base") {
    for (const [key, expectedAddr] of Object.entries(expectedAddresses)) {
      const actualAddr = addresses[key as keyof typeof addresses];
      const matches = actualAddr === expectedAddr;
      results.push({
        passed: matches,
        message: `${key}: ${matches ? "MATCHES" : `MISMATCH (expected ${expectedAddr})`}`,
        critical: true
      });
      console.log(`   ${matches ? "✅" : "❌"} ${results[results.length - 1].message}`);
    }
  } else {
    console.log("   ⚠️  Skipped (not on Base mainnet)");
  }
  console.log();

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("  SUMMARY");
  console.log("=".repeat(70) + "\n");

  const criticalChecks = results.filter(r => r.critical);
  const nonCriticalChecks = results.filter(r => !r.critical);
  
  const criticalPassed = criticalChecks.filter(r => r.passed).length;
  const criticalFailed = criticalChecks.length - criticalPassed;
  const nonCriticalPassed = nonCriticalChecks.filter(r => r.passed).length;
  const nonCriticalFailed = nonCriticalChecks.length - nonCriticalPassed;

  console.log(`Critical Checks: ${criticalPassed}/${criticalChecks.length} passed`);
  console.log(`Non-Critical Checks: ${nonCriticalPassed}/${nonCriticalChecks.length} passed`);
  console.log();

  if (criticalFailed > 0) {
    console.log("❌ DEPLOYMENT BLOCKED: Critical checks failed");
    console.log("   Please fix the issues above before deploying\n");
    process.exit(1);
  } else if (nonCriticalFailed > 0) {
    console.log("⚠️  WARNING: Some non-critical checks failed");
    console.log("   Deployment is possible but recommended to address warnings\n");
  } else {
    console.log("✅ ALL CHECKS PASSED: Ready for deployment");
    console.log("\nNext steps:");
    console.log("  1. Deploy FlashSwapV2: npx hardhat run scripts/deployFlashSwapV2.ts --network base");
    console.log("  2. Set FLASHSWAP_V2_ADDRESS in .env");
    console.log("  3. Run initial test: npx hardhat run scripts/runArbitrage.ts --network base\n");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
