import { SwapStep, DEXType } from '../types';

export class AavePathBuilder {
    private path: string[];
    private swaps: SwapStep[];

    constructor() {
        this.path = [];
        this.swaps = [];
    }

    public addToken(token: string): this {
        this.path.push(token);
        return this;
    }

    public setSwaps(swapSteps: SwapStep[]): this {
        this.swaps = swapSteps;
        return this;
    }

    public build(): { path: string[]; swaps: SwapStep[] } {
        return { path: this.path, swaps: this.swaps };
    }

    private mapDEXType(dex: string): DEXType {
        const dexMapping: Record<string, DEXType> = {
            'Uniswap': DEXType.Uniswap,
            'SushiSwap': DEXType.SushiSwap,
            'PancakeSwap': DEXType.PancakeSwap,
            // Add more DEX mappings as needed
        };
        return dexMapping[dex] || DEXType.Unknown;
    }

    public flexiblePathSupport(tokens: string[]): this {
        this.path = [...new Set(tokens)]; // removes duplicates
        return this;
    }
}