import { ethers } from 'hardhat';

/**
 * Check Token Balances Script
 *
 * This script checks the ETH, WETH, and USDC balances for the signer account
 * on the Base network.
 *
 * Usage:
 *   npx hardhat run scripts/checkBalances.ts --network base
 *
 * The script will display:
 * - ETH (native) balance
 * - WETH balance at 0x4200000000000000000000000000000000000006
 * - USDC balance at 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
 *
 * Expected output format:
 *   Address: 0x119F4857DD9B2e8d1B729E8C3a8AE58fC867E91B
 *   ETH (native) balance: 0.123456789
 *   WETH balance: 1.0
 *   USDC balance: 9.369229
 *
 * Troubleshooting:
 * If WETH shows as 0.0, verify:
 * 1. The correct network (Base mainnet)
 * 2. The correct address (matches the output Address)
 * 3. The correct token (WETH at 0x4200...0006 on Base)
 */

async function main() {
  const [signer] = await ethers.getSigners();
  const addr = await signer.getAddress();
  console.log('Address:', addr);

  const ethBal = await ethers.provider.getBalance(addr);
  console.log('ETH (native) balance:', ethers.utils.formatEther(ethBal));

  const WETH = '0x4200000000000000000000000000000000000006';
  const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

  const erc20Abi = [
    'function balanceOf(address) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
  ];

  const weth = new ethers.Contract(WETH, erc20Abi, signer);
  const usdc = new ethers.Contract(USDC, erc20Abi, signer);

  const [wethBal, usdcBal, wethDec, usdcDec, wethSym, usdcSym] = await Promise.all([
    weth.balanceOf(addr),
    usdc.balanceOf(addr),
    weth.decimals(),
    usdc.decimals(),
    weth.symbol(),
    usdc.symbol(),
  ]);

  console.log(`${wethSym} balance:`, ethers.utils.formatUnits(wethBal, wethDec));
  console.log(`${usdcSym} balance:`, ethers.utils.formatUnits(usdcBal, usdcDec));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
