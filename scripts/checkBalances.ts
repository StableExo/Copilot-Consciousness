import { ethers } from 'hardhat';

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
