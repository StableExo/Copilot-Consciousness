import * as dotenv from "dotenv";
import * as https from "https";

dotenv.config();

/**
 * BaseScan/Etherscan API v2 Utility Script
 * 
 * This script provides utilities for interacting with the Etherscan/BaseScan API v2,
 * including:
 * - Getting contract ABI for verified contracts
 * - Getting contract source code
 * - Checking verification status
 * 
 * API Documentation: https://docs.etherscan.io/
 * 
 * Usage:
 *   npx ts-node scripts/etherscan-api.ts getabi 0xCF38b66D65f82030675893eD7150a76d760a99ce --chain base
 *   npx ts-node scripts/etherscan-api.ts getsource 0xCF38b66D65f82030675893eD7150a76d760a99ce --chain base
 */

// Chain ID to API endpoint mapping
const CHAIN_CONFIG: Record<string, { apiUrl: string; chainId: string; envKey: string }> = {
  ethereum: {
    apiUrl: "https://api.etherscan.io/v2/api",
    chainId: "1",
    envKey: "ETHERSCAN_API_KEY",
  },
  base: {
    apiUrl: "https://api.etherscan.io/v2/api",
    chainId: "8453",
    envKey: "BASESCAN_API_KEY",
  },
  baseSepolia: {
    apiUrl: "https://api.etherscan.io/v2/api",
    chainId: "84532",
    envKey: "BASESCAN_API_KEY",
  },
  arbitrum: {
    apiUrl: "https://api.etherscan.io/v2/api",
    chainId: "42161",
    envKey: "ARBISCAN_API_KEY",
  },
  polygon: {
    apiUrl: "https://api.etherscan.io/v2/api",
    chainId: "137",
    envKey: "POLYGONSCAN_API_KEY",
  },
  optimism: {
    apiUrl: "https://api.etherscan.io/v2/api",
    chainId: "10",
    envKey: "OPTIMISTIC_ETHERSCAN_API_KEY",
  },
};

interface EtherscanResponse {
  status: string;
  message: string;
  result: string | object[];
}

/**
 * Get the API key for a specific chain
 */
function getApiKey(chain: string): string {
  const config = CHAIN_CONFIG[chain];
  if (!config) {
    throw new Error(`Unsupported chain: ${chain}. Supported chains: ${Object.keys(CHAIN_CONFIG).join(", ")}`);
  }
  
  const apiKey = process.env[config.envKey];
  if (!apiKey) {
    throw new Error(`API key not found. Please set ${config.envKey} in your .env file.`);
  }
  
  return apiKey;
}

/**
 * Make a request to the Etherscan API v2
 */
async function etherscanRequest(
  chain: string,
  module: string,
  action: string,
  params: Record<string, string> = {}
): Promise<EtherscanResponse> {
  const config = CHAIN_CONFIG[chain];
  if (!config) {
    throw new Error(`Unsupported chain: ${chain}`);
  }
  
  const apiKey = getApiKey(chain);
  
  const queryParams = new URLSearchParams({
    chainid: config.chainId,
    module,
    action,
    apikey: apiKey,
    ...params,
  });
  
  const url = `${config.apiUrl}?${queryParams.toString()}`;
  
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      
      res.on("data", (chunk) => {
        data += chunk;
      });
      
      res.on("end", () => {
        try {
          const jsonData = JSON.parse(data) as EtherscanResponse;
          resolve(jsonData);
        } catch (parseError) {
          reject(new Error(`Failed to parse response: ${parseError}`));
        }
      });
    }).on("error", (err) => {
      reject(new Error(`HTTP request failed: ${err.message}`));
    });
  });
}

/**
 * Get the ABI for a verified contract
 */
async function getContractABI(address: string, chain: string): Promise<string> {
  console.log(`\n📋 Getting ABI for contract: ${address}`);
  console.log(`   Chain: ${chain} (chainId: ${CHAIN_CONFIG[chain]?.chainId})`);
  
  const response = await etherscanRequest(chain, "contract", "getabi", { address });
  
  if (response.status === "1" && response.message === "OK") {
    console.log("\n✅ ABI retrieved successfully!");
    return typeof response.result === "string" ? response.result : JSON.stringify(response.result);
  } else {
    throw new Error(`Failed to get ABI: ${response.result}`);
  }
}

/**
 * Get the source code for a verified contract
 */
async function getContractSource(address: string, chain: string): Promise<object[]> {
  console.log(`\n📄 Getting source code for contract: ${address}`);
  console.log(`   Chain: ${chain} (chainId: ${CHAIN_CONFIG[chain]?.chainId})`);
  
  const response = await etherscanRequest(chain, "contract", "getsourcecode", { address });
  
  if (response.status === "1" && response.message === "OK") {
    console.log("\n✅ Source code retrieved successfully!");
    return response.result as object[];
  } else {
    throw new Error(`Failed to get source code: ${response.result}`);
  }
}

/**
 * Check if a contract is verified
 */
async function isContractVerified(address: string, chain: string): Promise<boolean> {
  try {
    const source = await getContractSource(address, chain);
    // If the source code array has entries and the first entry has a non-empty SourceCode
    if (Array.isArray(source) && source.length > 0) {
      const firstEntry = source[0] as Record<string, unknown>;
      return typeof firstEntry.SourceCode === "string" && firstEntry.SourceCode.length > 0;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Display contract verification status and details
 */
async function displayContractInfo(address: string, chain: string): Promise<void> {
  console.log("\n🔍 Contract Verification Status");
  console.log("================================");
  console.log(`Address: ${address}`);
  console.log(`Chain: ${chain}`);
  
  try {
    const source = await getContractSource(address, chain);
    
    if (Array.isArray(source) && source.length > 0) {
      const info = source[0] as Record<string, unknown>;
      
      if (info.SourceCode && typeof info.SourceCode === "string" && info.SourceCode.length > 0) {
        console.log("\n✅ Contract is VERIFIED");
        console.log(`\nContract Details:`);
        console.log(`  Name: ${info.ContractName || "N/A"}`);
        console.log(`  Compiler: ${info.CompilerVersion || "N/A"}`);
        console.log(`  Optimization: ${info.OptimizationUsed === "1" ? "Yes" : "No"}`);
        if (info.OptimizationUsed === "1") {
          console.log(`  Runs: ${info.Runs || "N/A"}`);
        }
        console.log(`  License: ${info.LicenseType || "N/A"}`);
        console.log(`  Proxy: ${info.Proxy === "1" ? "Yes" : "No"}`);
        
        // Get block explorer URL
        const explorerUrl = getBlockExplorerUrl(chain, address);
        console.log(`\n📎 View on Explorer: ${explorerUrl}`);
      } else {
        console.log("\n❌ Contract is NOT VERIFIED");
        console.log("\nTo verify this contract, run:");
        console.log(`  CONTRACT_ADDRESS=${address} npx hardhat run scripts/verifyFlashSwapV2.ts --network ${chain}`);
      }
    }
  } catch (error) {
    console.error("\n❌ Error checking verification status:", error);
  }
}

/**
 * Get block explorer URL for a contract
 */
function getBlockExplorerUrl(chain: string, address: string): string {
  const urls: Record<string, string> = {
    ethereum: `https://etherscan.io/address/${address}#code`,
    base: `https://basescan.org/address/${address}#code`,
    baseSepolia: `https://sepolia.basescan.org/address/${address}#code`,
    arbitrum: `https://arbiscan.io/address/${address}#code`,
    polygon: `https://polygonscan.com/address/${address}#code`,
    optimism: `https://optimistic.etherscan.io/address/${address}#code`,
  };
  
  return urls[chain] || address;
}

/**
 * Main CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    printUsage();
    process.exit(1);
  }
  
  const command = args[0];
  const address = args[1];
  
  // Parse chain from --chain flag or default to base
  let chain = "base";
  const chainIndex = args.indexOf("--chain");
  if (chainIndex !== -1 && args[chainIndex + 1]) {
    chain = args[chainIndex + 1];
  }
  
  // Validate address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    console.error("❌ Invalid address format. Must be a 40-character hex string starting with 0x.");
    process.exit(1);
  }
  
  try {
    switch (command) {
      case "getabi": {
        const abi = await getContractABI(address, chain);
        console.log("\nABI:");
        console.log(JSON.stringify(JSON.parse(abi), null, 2));
        break;
      }
      
      case "getsource": {
        const source = await getContractSource(address, chain);
        console.log("\nSource Code Info:");
        console.log(JSON.stringify(source, null, 2));
        break;
      }
      
      case "status":
      case "info": {
        await displayContractInfo(address, chain);
        break;
      }
      
      case "isverified": {
        const verified = await isContractVerified(address, chain);
        console.log(`\nContract ${address} on ${chain}: ${verified ? "✅ VERIFIED" : "❌ NOT VERIFIED"}`);
        break;
      }
      
      default:
        console.error(`❌ Unknown command: ${command}`);
        printUsage();
        process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

function printUsage() {
  console.log(`
📚 Etherscan/BaseScan API Utility

Usage:
  npx ts-node scripts/etherscan-api.ts <command> <address> [--chain <chain>]

Commands:
  getabi      Get the ABI for a verified contract
  getsource   Get the source code for a verified contract
  status      Display verification status and contract details
  isverified  Check if a contract is verified (returns boolean)

Options:
  --chain     Blockchain network (default: base)
              Supported: ethereum, base, baseSepolia, arbitrum, polygon, optimism

Examples:
  npx ts-node scripts/etherscan-api.ts status 0xCF38b66D65f82030675893eD7150a76d760a99ce --chain base
  npx ts-node scripts/etherscan-api.ts getabi 0xCF38b66D65f82030675893eD7150a76d760a99ce --chain base
  npx ts-node scripts/etherscan-api.ts getsource 0xCF38b66D65f82030675893eD7150a76d760a99ce --chain base

Environment Variables:
  BASESCAN_API_KEY         API key for BaseScan (base, baseSepolia)
  ETHERSCAN_API_KEY        API key for Etherscan (ethereum)
  ARBISCAN_API_KEY         API key for Arbiscan (arbitrum)
  POLYGONSCAN_API_KEY      API key for Polygonscan (polygon)
  OPTIMISTIC_ETHERSCAN_API_KEY  API key for Optimistic Etherscan (optimism)

Note: Get your API keys from the respective block explorer websites.
  `);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
