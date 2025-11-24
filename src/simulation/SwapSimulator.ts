/**
 * src/simulation/SwapSimulator.ts
 *
 * A TypeScript port of the v1.10 SwapSimulator from PROJECT-HAVOC.
 */
import { ethers, Contract, providers } from 'ethers';
import { logger } from '../utils/logger';
import { IQUOTERV2_ABI, DODOV1V2_POOL_ABI } from '../abis/SwapSimulatorABIs';
import { Token, PoolState } from '../types/definitions';

export interface SwapSimulationResult {
    success: boolean;
    amountOut: bigint | null;
    error: string | null;
}

export interface SwapSimulatorConfig {
    QUOTER_ADDRESS: string;
}

export class SwapSimulator {
    private provider: providers.Provider;
    private config: SwapSimulatorConfig;
    private quoterContract: Contract | null;
    private dodoPoolContractCache: { [address: string]: Contract | null } = {};

    constructor(provider: providers.Provider, config: SwapSimulatorConfig) {
        logger.debug('[SwapSimulator v1.10] Initializing...');
        this.provider = provider;
        this.config = config;

        if (!config.QUOTER_ADDRESS || !isAddress(config.QUOTER_ADDRESS)) {
            throw new Error('Valid QUOTER_ADDRESS missing from config.');
        }

        this.quoterContract = new Contract(config.QUOTER_ADDRESS, IQUOTERV2_ABI, this.provider);
        logger.info(`[SwapSimulator v1.10] Initialized with Quoter V2 at ${config.QUOTER_ADDRESS}`);
    }

    private _getDodoPoolContract(poolAddress: string): Contract | null {
        const lowerCaseAddress = poolAddress.toLowerCase();
        if (!this.dodoPoolContractCache[lowerCaseAddress]) {
            try {
                this.dodoPoolContractCache[lowerCaseAddress] = new Contract(poolAddress, DODOV1V2_POOL_ABI, this.provider);
            } catch (error: unknown) {
                this.dodoPoolContractCache[lowerCaseAddress] = null;
            }
        }
        return this.dodoPoolContractCache[lowerCaseAddress];
    }

    public async simulateSwap(poolState: PoolState, tokenIn: Token, amountIn: bigint): Promise<SwapSimulationResult> {
        if (!poolState || !tokenIn || !amountIn || amountIn <= 0n) {
            return { success: false, amountOut: null, error: 'Invalid poolState, tokenIn, or amountIn' };
        }
        
        try {
            switch (poolState.dexName?.toLowerCase()) {
                case 'uniswapv3':
                    return await this.simulateV3Swap(poolState, tokenIn, amountIn);
                case 'sushiswap':
                    return await this.simulateV2Swap(poolState, tokenIn, amountIn);
                case 'dodo': {
                    const dodoPoolContract = this._getDodoPoolContract(poolState.address);
                    if (!dodoPoolContract) {
                        return { success: false, amountOut: null, error: 'DODO pool contract not initialized' };
                    }
                    return await this.simulateDodoSwap(poolState, tokenIn, amountIn, dodoPoolContract);
                }
                default:
                    return { success: false, amountOut: null, error: `Unsupported dex: ${poolState.dexName}` };
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            return { success: false, amountOut: null, error: `Unexpected error during simulation dispatch: ${message}` };
        }
    }

    private async simulateV3Swap(poolState: PoolState, tokenIn: Token, amountIn: bigint): Promise<SwapSimulationResult> {
        if (!this.quoterContract) return { success: false, amountOut: null, error: 'Quoter contract not initialized' };

        const { fee, token0, token1 } = poolState;
        const tokenOut = tokenIn.address.toLowerCase() === token0.address.toLowerCase() ? token1 : token0;

        const params = {
            tokenIn: tokenIn.address,
            tokenOut: tokenOut.address,
            fee: Number(fee),
            amountIn: amountIn,
            sqrtPriceLimitX96: 0n
        };

        try {
            const quoteResult = await this.quoterContract.callStatic.quoteExactInputSingle(params);
            const amountOut = BigInt(quoteResult[0].toString());
            return { success: true, amountOut: amountOut, error: null };
        } catch (error: unknown) {
            const reason = (error as { reason?: string }).reason || (error instanceof Error ? error.message : String(error));
            return { success: false, amountOut: null, error: `Quoter fail: ${reason}` };
        }
    }

    private async simulateV2Swap(poolState: PoolState, tokenIn: Token, amountIn: bigint): Promise<SwapSimulationResult> {
        const { reserve0, reserve1, token0, token1 } = poolState;
        if (reserve0 <= 0n || reserve1 <= 0n) return { success: false, amountOut: null, error: 'Zero reserves' };
        const [reserveIn, reserveOut] = tokenIn.address.toLowerCase() === token0.address.toLowerCase() ? [reserve0, reserve1] : [reserve1, reserve0];
        const amountInWithFee = amountIn * 997n;
        const numerator = reserveOut * amountInWithFee;
        const denominator = (reserveIn * 1000n) + amountInWithFee;
        if (denominator === 0n) return { success: false, amountOut: null, error: 'Div by zero' };
        return { success: true, amountOut: numerator / denominator, error: null };
    }

    private async simulateDodoSwap(poolState: PoolState, tokenIn: Token, amountIn: bigint, poolContract: Contract): Promise<SwapSimulationResult> {
        const { baseTokenAddress } = poolState;
        if (!baseTokenAddress) return { success: false, amountOut: null, error: 'Missing baseTokenAddress' };
        const isSellingBase = tokenIn.address.toLowerCase() === baseTokenAddress.toLowerCase();
        try {
            const queryResult = isSellingBase
                ? await poolContract.callStatic.querySellBase(ZeroAddress, amountIn)
                : await poolContract.callStatic.querySellQuote(ZeroAddress, amountIn);
            return { success: true, amountOut: BigInt(queryResult[0].toString()), error: null };
        } catch (error: unknown) {
            const reason = (error as { reason?: string }).reason || (error instanceof Error ? error.message : String(error));
            if (reason.includes("BALANCE_NOT_ENOUGH")) return { success: false, amountOut: null, error: reason };
            return { success: false, amountOut: null, error: `DODO fail: ${reason}` };
        }
    }
}
