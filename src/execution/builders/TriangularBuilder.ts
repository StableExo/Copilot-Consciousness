// TriangularBuilder.ts

// Define a type for a currency pair
type CurrencyPair = {
    from: string;
    to: string;
    price: number;
    fee: number;
};

// TriangularBuilder Class
class TriangularBuilder {
    private pairs: CurrencyPair[];
    
    constructor(pairs: CurrencyPair[]) {
        this.pairs = pairs;
    }
    
    // Method to validate three-leg paths
    validateThreeLegPath(path: string[]): boolean {
        if (path.length !== 3) return false;
        const [pair1, pair2, pair3] = path;
        const validPairs = this.pairs.map(pair => `${pair.from}:${pair.to}`);
        return validPairs.includes(pair1) && validPairs.includes(pair2) && validPairs.includes(pair3);
    }
    
    // Method to extract fees from the currency pairs
    extractFees(path: string[]): number {
        let totalFees = 0;
        for (const pair of path) {
            const foundPair = this.pairs.find(p => `${p.from}:${p.to}` === pair);
            if (foundPair) {
                totalFees += foundPair.fee;
            }
        }
        return totalFees;
    }
}

// Export the TriangularBuilder class
export default TriangularBuilder;
