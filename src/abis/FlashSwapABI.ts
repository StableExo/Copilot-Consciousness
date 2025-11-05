// This is a placeholder ABI. Replace with your actual contract ABI.
export const FLASHSWAP_ABI = [
  "function initiateUniswapV3FlashLoan(tuple(address tokenIntermediate, uint24 feeA, uint24 feeB, uint256 amountOutMinimum1, uint256 amountOutMinimum2, address titheRecipient) params)",
  "function initiateTriangularFlashSwap(tuple(address tokenA, address tokenB, address tokenC, uint24 fee1, uint24 fee2, uint24 fee3, uint256 amountOutMinimumFinal, address titheRecipient) params)",
  "function initiateAaveFlashLoan(tuple(tuple(address pool, address tokenIn, address tokenOut, uint24 fee, uint256 minOut, uint8 dexType)[] path, address initiator, address titheRecipient) params)"
];
