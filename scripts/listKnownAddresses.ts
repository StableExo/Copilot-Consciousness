import { network } from "hardhat";
import { ADDRESSES, NetworkKey } from "../src/config/addresses";

/**
 * List Known Addresses Script
 * 
 * This script prints all known addresses for the current network in a readable JSON format.
 * 
 * Usage:
 *   npx hardhat run scripts/listKnownAddresses.ts --network base
 *   npx hardhat run scripts/listKnownAddresses.ts --network baseSepolia
 * 
 * The script reads the network name from Hardhat's runtime configuration and
 * displays the corresponding address configuration from config/addresses.ts
 */

async function main() {
  const netName = network.name as NetworkKey;

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Network: ${network.name}`);
  console.log(`${"=".repeat(60)}\n`);

  // Check if we have address configuration for this network
  if (!ADDRESSES[netName]) {
    console.log(`❌ No known address configuration for network: ${network.name}`);
    console.log(`\nSupported networks:`);
    Object.keys(ADDRESSES).forEach(net => {
      console.log(`  - ${net}`);
    });
    console.log(`\nTo add addresses for this network, edit config/addresses.ts\n`);
    return;
  }

  const addresses = ADDRESSES[netName];

  // Check if network has any addresses configured
  const hasAddresses = Object.keys(addresses).some(key => {
    const value = addresses[key as keyof typeof addresses];
    return value !== undefined && value !== null && 
           (typeof value === 'string' ? value.length > 0 : true);
  });

  if (!hasAddresses) {
    console.log(`⚠️  Network configuration exists but no addresses are defined yet.`);
    console.log(`Edit config/addresses.ts to add addresses for ${network.name}\n`);
    return;
  }

  // Display addresses in a readable format
  console.log("Known Addresses:\n");
  console.log(JSON.stringify(addresses, null, 2));
  console.log(`\n${"=".repeat(60)}\n`);

  // Display summary
  const summary = {
    tokens: [] as string[],
    routers: [] as string[],
    protocols: [] as string[],
  };

  if (addresses.weth) summary.tokens.push("WETH");
  if (addresses.usdc) summary.tokens.push("USDC");
  if (addresses.dai) summary.tokens.push("DAI");

  if (addresses.uniswapV2Router) summary.routers.push("Uniswap V2");
  if (addresses.uniswapV3Router) summary.routers.push("Uniswap V3");
  if (addresses.sushiRouter) summary.routers.push("SushiSwap");

  if (addresses.aavePool) summary.protocols.push("Aave V3");

  console.log("Summary:");
  console.log(`  Tokens configured: ${summary.tokens.length > 0 ? summary.tokens.join(", ") : "None"}`);
  console.log(`  Routers configured: ${summary.routers.length > 0 ? summary.routers.join(", ") : "None"}`);
  console.log(`  Protocols configured: ${summary.protocols.length > 0 ? summary.protocols.join(", ") : "None"}`);
  
  if (addresses.examplePools && addresses.examplePools.length > 0) {
    console.log(`  Example pools: ${addresses.examplePools.length}`);
  }

  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
