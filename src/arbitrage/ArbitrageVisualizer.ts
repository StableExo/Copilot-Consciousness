/**
 * ArbitrageVisualizer - Dashboard visualization for multi-hop arbitrage
 *
 * Provides text-based visualization of arbitrage opportunities and metrics
 */

import { ArbitragePath, ProfitabilityResult } from './types';

export class ArbitrageVisualizer {
  /**
   * Format an arbitrage path as a readable string
   */
  formatPath(path: ArbitragePath): string {
    const lines: string[] = [];

    lines.push('\n=== Arbitrage Path ===');
    lines.push(`Start Token: ${path.startToken}`);
    lines.push(`End Token: ${path.endToken}`);
    lines.push(`Number of Hops: ${path.hops.length}`);
    lines.push('');

    lines.push('Route:');
    path.hops.forEach((hop, index) => {
      lines.push(`  ${index + 1}. ${hop.dexName}`);
      lines.push(
        `     ${this.formatTokenAddress(hop.tokenIn)} → ${this.formatTokenAddress(hop.tokenOut)}`
      );
      lines.push(`     Amount In: ${this.formatAmount(hop.amountIn)}`);
      lines.push(`     Amount Out: ${this.formatAmount(hop.amountOut)}`);
      lines.push(`     Fee: ${(hop.fee * 100).toFixed(2)}%`);
      lines.push(`     Gas Estimate: ${hop.gasEstimate.toLocaleString()}`);
      lines.push('');
    });

    lines.push('Profitability:');
    lines.push(`  Estimated Profit: ${this.formatAmount(path.estimatedProfit)}`);
    lines.push(`  Total Gas Cost: ${this.formatAmount(path.totalGasCost)}`);
    lines.push(`  Net Profit: ${this.formatAmount(path.netProfit)}`);
    lines.push(`  Total Fees: ${(path.totalFees * 100).toFixed(2)}%`);
    lines.push(`  Slippage Impact: ${(path.slippageImpact * 100).toFixed(2)}%`);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Format multiple paths as a table
   */
  formatPathTable(paths: ArbitragePath[]): string {
    if (paths.length === 0) {
      return 'No arbitrage opportunities found.\n';
    }

    const lines: string[] = [];

    lines.push('\n=== Arbitrage Opportunities ===\n');
    lines.push('┌─────┬──────────┬───────────────────┬───────────────────┬─────────┐');
    lines.push('│ No. │ Hops     │ Estimated Profit  │ Net Profit        │ ROI     │');
    lines.push('├─────┼──────────┼───────────────────┼───────────────────┼─────────┤');

    paths.slice(0, 10).forEach((path, index) => {
      const startAmount = path.hops[0].amountIn;
      const roi =
        startAmount > BigInt(0) ? Number((path.netProfit * BigInt(10000)) / startAmount) / 100 : 0;

      lines.push(
        `│ ${this.padRight((index + 1).toString(), 3)} │ ` +
          `${this.padRight(path.hops.length.toString(), 8)} │ ` +
          `${this.padLeft(this.formatAmount(path.estimatedProfit), 17)} │ ` +
          `${this.padLeft(this.formatAmount(path.netProfit), 17)} │ ` +
          `${this.padLeft(roi.toFixed(2) + '%', 7)} │`
      );
    });

    lines.push('└─────┴──────────┴───────────────────┴───────────────────┴─────────┘');
    lines.push(`\nTotal opportunities: ${paths.length}`);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Format profitability result
   */
  formatProfitability(result: ProfitabilityResult): string {
    const lines: string[] = [];

    lines.push('\n=== Profitability Analysis ===');
    lines.push(`Status: ${result.profitable ? '✓ PROFITABLE' : '✗ NOT PROFITABLE'}`);
    lines.push(`Estimated Profit: ${this.formatAmount(result.estimatedProfit)}`);
    lines.push(`Total Fees: ${this.formatAmount(result.totalFees)}`);
    lines.push(`Total Gas: ${this.formatAmount(result.totalGas)}`);
    lines.push(`Net Profit: ${this.formatAmount(result.netProfit)}`);
    lines.push(`ROI: ${result.roi.toFixed(2)}%`);
    lines.push(`Slippage Impact: ${(result.slippageImpact * 100).toFixed(2)}%`);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Create a visual route map
   */
  formatRouteMap(path: ArbitragePath): string {
    const lines: string[] = [];

    lines.push('\n=== Route Map ===\n');

    if (path.hops.length === 0) {
      return 'No hops in path\n';
    }

    // Start
    lines.push(`  ${this.formatTokenAddress(path.hops[0].tokenIn)}`);

    // Each hop
    path.hops.forEach((hop, index) => {
      lines.push(`  │`);
      lines.push(`  │ [${hop.dexName}]`);
      lines.push(`  ↓`);
      lines.push(`  ${this.formatTokenAddress(hop.tokenOut)}`);

      if (index < path.hops.length - 1) {
        lines.push('');
      }
    });

    lines.push('');

    return lines.join('\n');
  }

  /**
   * Generate summary statistics
   */
  formatSummaryStats(paths: ArbitragePath[]): string {
    if (paths.length === 0) {
      return 'No paths to analyze.\n';
    }

    const lines: string[] = [];

    const totalProfit = paths.reduce((sum, path) => sum + path.netProfit, BigInt(0));
    const avgProfit = totalProfit / BigInt(paths.length);
    const maxProfit = paths.reduce(
      (max, path) => (path.netProfit > max ? path.netProfit : max),
      BigInt(0)
    );
    const minProfit = paths.reduce(
      (min, path) => (path.netProfit < min ? path.netProfit : min),
      paths[0].netProfit
    );

    const avgHops = paths.reduce((sum, path) => sum + path.hops.length, 0) / paths.length;

    lines.push('\n=== Summary Statistics ===');
    lines.push(`Total Opportunities: ${paths.length}`);
    lines.push(`Total Potential Profit: ${this.formatAmount(totalProfit)}`);
    lines.push(`Average Profit: ${this.formatAmount(avgProfit)}`);
    lines.push(`Maximum Profit: ${this.formatAmount(maxProfit)}`);
    lines.push(`Minimum Profit: ${this.formatAmount(minProfit)}`);
    lines.push(`Average Hops: ${avgHops.toFixed(2)}`);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Format token address for display
   */
  private formatTokenAddress(address: string): string {
    if (address.length <= 10) {
      return address;
    }
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }

  /**
   * Format BigInt amount for display
   */
  private formatAmount(amount: bigint): string {
    // Assuming 18 decimals for simplicity
    const wholePart = amount / BigInt('1000000000000000000');
    const fractionalPart = amount % BigInt('1000000000000000000');
    const fractionalStr = fractionalPart.toString().padStart(18, '0').substring(0, 4);

    return `${wholePart}.${fractionalStr}`;
  }

  /**
   * Pad string to the right
   */
  private padRight(str: string, length: number): string {
    return str.padEnd(length, ' ');
  }

  /**
   * Pad string to the left
   */
  private padLeft(str: string, length: number): string {
    return str.padStart(length, ' ');
  }
}
