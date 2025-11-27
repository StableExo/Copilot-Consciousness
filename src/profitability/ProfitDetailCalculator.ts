// Placeholder function required by ParamBuilder
export function calculateMinAmountOut(amount: bigint, slippageBps: number): bigint {
  if (amount <= 0n) return 0n;
  const slippageFactor = BigInt(10000 - slippageBps);
  return (amount * slippageFactor) / 10000n;
}
