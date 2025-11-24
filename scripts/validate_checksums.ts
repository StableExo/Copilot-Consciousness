import hre from "hardhat";

/**
 * Validation script to verify all addresses in deployFlashSwapV2.ts have correct checksums
 */

// Base Testnet (Sepolia) Contract Addresses - copied from deployFlashSwapV2.ts
const BASE_TESTNET = {
  UNISWAP_V3_ROUTER: "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4",
  SUSHISWAP_ROUTER: "0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891",
  AAVE_POOL: "0x07eA79F68B2B3df564D0A34F8e19D9B1e339814b",
  AAVE_ADDRESSES_PROVIDER: "0x9957E7F97f4C5357C2c93Fb0D618a0B87e0C97a1"
};

// Base Mainnet Contract Addresses - copied from deployFlashSwapV2.ts
const BASE_MAINNET = {
  UNISWAP_V3_ROUTER: "0x2626664c2603336E57B271c5C0b26F421741e481",
  SUSHISWAP_ROUTER: "0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891",
  AAVE_POOL: "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
  AAVE_ADDRESSES_PROVIDER: "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D"
};

async function main() {
  const ethers = (hre as any).ethers;
  let allValid = true;

  console.log("Validating BASE_TESTNET addresses:\n");
  for (const [name, addr] of Object.entries(BASE_TESTNET)) {
    try {
      const checksummed = ethers.utils.getAddress(addr);
      if (checksummed === addr) {
        console.log(`✓ ${name}: ${addr}`);
      } else {
        console.log(`✗ ${name}: ${addr}`);
        console.log(`  Expected: ${checksummed}`);
        allValid = false;
      }
    } catch (error: any) {
      console.log(`✗ ${name}: ${addr}`);
      console.log(`  Error: ${error.message}`);
      allValid = false;
    }
  }

  console.log("\nValidating BASE_MAINNET addresses:\n");
  for (const [name, addr] of Object.entries(BASE_MAINNET)) {
    try {
      const checksummed = ethers.utils.getAddress(addr);
      if (checksummed === addr) {
        console.log(`✓ ${name}: ${addr}`);
      } else {
        console.log(`✗ ${name}: ${addr}`);
        console.log(`  Expected: ${checksummed}`);
        allValid = false;
      }
    } catch (error: any) {
      console.log(`✗ ${name}: ${addr}`);
      console.log(`  Error: ${error.message}`);
      allValid = false;
    }
  }

  if (allValid) {
    console.log("\n✅ All addresses have correct checksums!");
  } else {
    console.log("\n❌ Some addresses have incorrect checksums!");
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
