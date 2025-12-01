/**
 * src/execution/ParamBuilder.ts
 *
 * A TypeScript port of the transaction parameter builders from PROJECT-HAVOC.
 * This module is responsible for constructing the precise parameter objects required
 * by the FlashSwap smart contract functions based on a given arbitrage opportunity.
 */
// ethers namespace reserved for BigNumber utilities
import type { ethers as _ethers } from 'ethers';
import {
  ArbitrageOpportunity,
  ArbitragePath,
  SimulationResult,
  ArbitrageConfig,
  Pool,
} from '../types/definitions';
import { calculateMinAmountOut } from '../profitability/ProfitDetailCalculator';
// logger reserved for debug output
import { logger as _logger } from '../utils/logger';

const DEX_TYPE_UNISWAP_V3 = 0;
const DEX_TYPE_SUSHISWAP = 1;
const DEX_TYPE_DODO = 2;
const DEX_TYPE_PANCAKESWAP_V3 = 3;
const DEX_TYPE_AERODROME = 4;
const DEX_TYPE_UNISWAP_V2 = 5;

function mapDexType(dexString: string): number {
  const lowerDex = dexString?.toLowerCase() || '';

  // Uniswap V3 variants (including forks on different chains)
  if (lowerDex.includes('uniswap') && lowerDex.includes('v3')) {
    return DEX_TYPE_UNISWAP_V3;
  }
  // Uniswap V2 variants
  if (lowerDex.includes('uniswap') && (lowerDex.includes('v2') || !lowerDex.includes('v3'))) {
    return DEX_TYPE_UNISWAP_V2;
  }
  // PancakeSwap V3 (uses same interface as Uniswap V3)
  if (lowerDex.includes('pancakeswap') && lowerDex.includes('v3')) {
    return DEX_TYPE_PANCAKESWAP_V3;
  }
  // SushiSwap variants
  if (lowerDex.includes('sushiswap') || lowerDex.includes('sushi')) {
    return DEX_TYPE_SUSHISWAP;
  }
  // Aerodrome/Velodrome (Solidly forks on Base/Optimism)
  if (lowerDex.includes('aerodrome') || lowerDex.includes('velodrome')) {
    return DEX_TYPE_AERODROME;
  }
  // DODO
  if (lowerDex.includes('dodo')) {
    return DEX_TYPE_DODO;
  }
  // AlienBase, BaseSwap, etc. - treat as Uniswap V2 compatible
  if (
    lowerDex.includes('alienbase') ||
    lowerDex.includes('baseswap') ||
    lowerDex.includes('swapbased') ||
    lowerDex.includes('rocketswap')
  ) {
    return DEX_TYPE_UNISWAP_V2;
  }

  // Default: treat as Uniswap V3 compatible (most common on Base)
  return DEX_TYPE_UNISWAP_V3;
}

export function buildTwoHopParams(
  opportunity: ArbitrageOpportunity,
  simulationResult: SimulationResult,
  config: ArbitrageConfig,
  titheRecipient: string
) {
  if (opportunity.type !== 'spatial' || !opportunity.path || opportunity.path.length !== 2) {
    throw new Error('Invalid spatial opportunity for V3->V3 param build.');
  }

  const leg1 = opportunity.path[0] as ArbitragePath;
  const leg2 = opportunity.path[1] as ArbitragePath;
  const tokenBorrowed = opportunity.tokenA;
  const tokenIntermediate = opportunity.tokenB;

  const feeA = Number(leg1.fee);
  const feeB = Number(leg2.fee);
  const borrowAmount = simulationResult.initialAmount;

  const minAmountOut1 = calculateMinAmountOut(
    simulationResult.amountOutHop1,
    config.SLIPPAGE_TOLERANCE_BPS
  );
  const minAmountOut2 = calculateMinAmountOut(
    simulationResult.finalAmount,
    config.SLIPPAGE_TOLERANCE_BPS
  );

  const params = {
    tokenIntermediate: tokenIntermediate.address,
    feeA: feeA,
    feeB: feeB,
    amountOutMinimum1: minAmountOut1,
    amountOutMinimum2: minAmountOut2,
    titheRecipient: titheRecipient,
  };

  const typeString =
    'tuple(address tokenIntermediate, uint24 feeA, uint24 feeB, uint256 amountOutMinimum1, uint256 amountOutMinimum2, address titheRecipient)';

  return {
    params,
    borrowTokenAddress: tokenBorrowed.address,
    borrowAmount,
    typeString,
    contractFunctionName: 'initiateUniswapV3FlashLoan',
  };
}

export function buildTriangularParams(
  opportunity: ArbitrageOpportunity,
  simulationResult: SimulationResult,
  config: ArbitrageConfig,
  titheRecipient: string
) {
  if (opportunity.type !== 'triangular' || !opportunity.pools || opportunity.pools.length !== 3) {
    throw new Error('Invalid triangular opportunity structure.');
  }

  const [poolAB, poolBC, poolCA] = opportunity.pools as Pool[];
  const { tokenA, tokenB, tokenC } = opportunity;

  const borrowAmount = simulationResult.initialAmount;
  const minAmountOutFinal = calculateMinAmountOut(
    simulationResult.finalAmount,
    config.SLIPPAGE_TOLERANCE_BPS
  );

  const params = {
    tokenA: tokenA.address,
    tokenB: tokenB.address,
    tokenC: tokenC.address,
    fee1: Number(poolAB.fee),
    fee2: Number(poolBC.fee),
    fee3: Number(poolCA.fee),
    amountOutMinimumFinal: minAmountOutFinal,
    titheRecipient: titheRecipient,
  };

  const typeString =
    'tuple(address tokenA, address tokenB, address tokenC, uint24 fee1, uint24 fee2, uint24 fee3, uint256 amountOutMinimumFinal, address titheRecipient)';

  return {
    params,
    borrowTokenAddress: tokenA.address,
    borrowAmount,
    typeString,
    contractFunctionName: 'initiateTriangularFlashSwap',
  };
}

export function buildAavePathParams(
  opportunity: ArbitrageOpportunity,
  simulationResult: SimulationResult,
  config: ArbitrageConfig,
  initiatorAddress: string,
  titheRecipient: string
) {
  if (!opportunity.path || opportunity.path.length === 0) {
    throw new Error('Invalid or empty path in opportunity object.');
  }

  const borrowTokenAddress = opportunity.tokenA.address;
  const borrowAmount = simulationResult.initialAmount;
  const minAmountOutFinal = calculateMinAmountOut(
    simulationResult.finalAmount,
    config.SLIPPAGE_TOLERANCE_BPS
  );

  const swapStepArray = (opportunity.path as ArbitragePath[]).map((step, i) => {
    const stepMinOut =
      i === (opportunity.path as ArbitragePath[]).length - 1 ? minAmountOutFinal : 0n;
    const dexType = mapDexType(step.dexName);
    const fee = step.dexName.toLowerCase() === 'uniswapv3' ? Number(step.fee) : 0;

    return {
      pool: step.poolAddress,
      tokenIn: step.tokenIn,
      tokenOut: step.tokenOut,
      fee: fee,
      minOut: stepMinOut,
      dexType: dexType,
    };
  });

  const params = {
    path: swapStepArray,
    initiator: initiatorAddress,
    titheRecipient: titheRecipient,
  };

  const swapStepTypeString =
    'tuple(address pool, address tokenIn, address tokenOut, uint24 fee, uint256 minOut, uint8 dexType)';
  const typeString = `tuple(${swapStepTypeString}[] path, address initiator, address titheRecipient)`;

  return {
    params,
    borrowTokenAddress,
    borrowAmount,
    typeString,
    contractFunctionName: 'initiateAaveFlashLoan',
  };
}
