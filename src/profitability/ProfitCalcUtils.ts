// ProfitCalcUtils.ts

/**
 * Utilities for profit calculations in trading strategies.
 */

// Function to calculate slippage
export function calculateSlippage(expectedPrice: number, actualPrice: number): number {
    return ((actualPrice - expectedPrice) / expectedPrice) * 100; // returns slippage percentage
}

// Function to validate trade parameters
export function validateTradeParameters(amount: number, price: number): boolean {
    if (amount <= 0 || price <= 0) {
        console.error("Invalid amount or price for trade.");
        return false;
    }
    return true;
}

// Function to calculate profit
export function calculateProfit(entryPrice: number, exitPrice: number, amount: number): number {
    return (exitPrice - entryPrice) * amount; // returns profit amount
}

// Function to calculate profit margin
export function calculateProfitMargin(profit: number, entryPrice: number, amount: number): number {
    return (profit / (entryPrice * amount)) * 100; // returns profit margin percentage
}
