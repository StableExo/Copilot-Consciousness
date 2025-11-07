/**
 * BuildResult interface that defines the structure for the result of a build.
 * @interface BuildResult
 * @property {Object} params - The parameters used in the build.
 * @property {string} typeString - The type as a string.
 * @property {string} borrowTokenAddress - The address of the borrow token.
 */
interface BuildResult {
    params: object;
    typeString: string;
    borrowTokenAddress: string;
}

/**
 * SimulationResult interface that defines the structure for the result of a simulation.
 * @interface SimulationResult
 * @property {number} initialAmount - The initial amount before the simulation.
 * @property {number} hop1AmountOutSimulated - The amount out after the first hop in the simulation.
 * @property {number} finalAmountSimulated - The final amount after the simulation.
 */
interface SimulationResult {
    initialAmount: number;
    hop1AmountOutSimulated: number;
    finalAmountSimulated: number;
}

/**
 * SwapStep interface defining the steps for Aave paths.
 * @interface SwapStep
 * @property {string} dexType - The type of DEX used.
 * @property {string} pool - The liquidity pool used for the swap.
 * @property {string} tokenIn - The token that is being swapped in.
 * @property {string} tokenOut - The token that is being swapped out.
 * @property {number} minOut - The minimum amount of output tokens.
 * @property {number} fee - The fee for the swap.
 */
interface SwapStep {
    dexType: string;
    pool: string;
    tokenIn: string;
    tokenOut: string;
    minOut: number;
    fee: number;
}

/**
 * DEX Types
 * @typedef {"Uniswap"|"SushiSwap"|"PancakeSwap"} DexType - The supported DEX types.
 */
type DexType = "Uniswap" | "SushiSwap" | "PancakeSwap";

/**
 * Callback Types
 * @typedef {Function} CallbackType - The callback function types used in transaction builders.
 */
type CallbackType = () => void;

export { BuildResult, SimulationResult, SwapStep, DexType, CallbackType };