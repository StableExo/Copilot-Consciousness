/**
 * CrossChainPathFinder - Find arbitrage opportunities across multiple blockchains
 *
 * Extends PathFinder with cross-chain capabilities including bridge hops
 */

import { PathFinder } from './PathFinder';
import { ArbitragePath, ArbitrageHop, PathfindingConfig, PoolEdge } from './types';
import { BridgeManager } from '../chains/BridgeManager';
import { PathfindingConfig as CrossChainPathConfig } from '../config/cross-chain.config';

export interface CrossChainHop extends ArbitrageHop {
  chainId: number | string;
  isBridge: boolean;
  bridgeInfo?: {
    bridge: string;
    toChain: number | string;
    estimatedTime: number;
  };
}

export interface CrossChainPath extends Omit<ArbitragePath, 'hops'> {
  hops: CrossChainHop[];
  bridgeCount: number;
  totalBridgeFees: bigint;
  estimatedTimeSeconds: number;
  chains: (number | string)[];
}

interface QueueItem {
  chain: number | string;
  token: string;
  amount: bigint;
  hops: CrossChainHop[];
  bridgeCount: number;
  totalBridgeFees: bigint;
  totalTime: number;
  chains: (number | string)[];
}

export class CrossChainPathFinder {
  private pathFindersByChain: Map<number | string, PathFinder>;
  private bridgeManager: BridgeManager;
  private crossChainConfig: CrossChainPathConfig;
  private chainEdges: Map<number | string, PoolEdge[]>;

  constructor(
    bridgeManager: BridgeManager,
    crossChainConfig: CrossChainPathConfig,
    _pathfindingConfig: PathfindingConfig
  ) {
    this.pathFindersByChain = new Map();
    this.bridgeManager = bridgeManager;
    this.crossChainConfig = crossChainConfig;
    this.chainEdges = new Map();

    // Initialize a PathFinder for each chain
    // (would be populated when edges are added)
  }

  /**
   * Add pool edge for a specific chain
   */
  addPoolEdge(chainId: number | string, edge: PoolEdge): void {
    // Store edge for this chain
    if (!this.chainEdges.has(chainId)) {
      this.chainEdges.set(chainId, []);
    }
    this.chainEdges.get(chainId)!.push(edge);

    // Get or create PathFinder for this chain
    if (!this.pathFindersByChain.has(chainId)) {
      const config: PathfindingConfig = {
        maxHops: this.crossChainConfig.maxHops,
        minProfitThreshold: BigInt(0),
        maxSlippage: 5.0,
        gasPrice: BigInt(50 * 10 ** 9),
      };
      this.pathFindersByChain.set(chainId, new PathFinder(config));
    }

    // Add edge to the chain's PathFinder
    this.pathFindersByChain.get(chainId)!.addPoolEdge(edge);
  }

  /**
   * Find cross-chain arbitrage paths using BFS
   */
  async findCrossChainPaths(
    startToken: string,
    startChain: number | string,
    startAmount: bigint,
    maxPaths: number = 10
  ): Promise<CrossChainPath[]> {
    const paths: CrossChainPath[] = [];
    const visited = new Set<string>();

    // BFS queue: [currentChain, currentToken, currentAmount, path, bridgeCount]
    const queue: QueueItem[] = [
      {
        chain: startChain,
        token: startToken,
        amount: startAmount,
        hops: [],
        bridgeCount: 0,
        totalBridgeFees: BigInt(0),
        totalTime: 0,
        chains: [startChain],
      },
    ];

    const startTime = Date.now();
    const maxTime = this.crossChainConfig.maxPathExplorationTime;

    while (queue.length > 0 && Date.now() - startTime < maxTime) {
      const current = queue.shift()!;

      // Check if we've exceeded max hops
      if (current.hops.length >= this.crossChainConfig.maxHops) {
        continue;
      }

      // Check if we've exceeded max bridge hops
      if (current.bridgeCount >= this.crossChainConfig.maxBridgeHops) {
        continue;
      }

      // Create state key for visited tracking
      const stateKey = `${current.chain}-${current.token}-${current.hops.length}`;
      if (visited.has(stateKey)) {
        continue;
      }
      visited.add(stateKey);

      // Check if we've completed a profitable cycle back to start
      if (
        current.hops.length > 0 &&
        current.chain === startChain &&
        current.token === startToken &&
        current.amount > startAmount
      ) {
        const profit = current.amount - startAmount;

        // Apply pruning: don't add if profit doesn't justify bridge fees
        if (current.bridgeCount > 0) {
          const minProfit =
            current.totalBridgeFees * BigInt(this.crossChainConfig.minBridgeFeeRatio);
          if (profit < minProfit) {
            continue; // Not profitable enough
          }
        }

        const path: CrossChainPath = {
          hops: current.hops,
          startToken,
          endToken: current.token,
          estimatedProfit: profit,
          totalGasCost: this.calculateTotalGasCost(current.hops),
          netProfit: profit - this.calculateTotalGasCost(current.hops),
          totalFees: this.calculateTotalFees(current.hops),
          slippageImpact: this.calculateSlippageImpact(current.hops),
          bridgeCount: current.bridgeCount,
          totalBridgeFees: current.totalBridgeFees,
          estimatedTimeSeconds: current.totalTime,
          chains: current.chains,
        };

        paths.push(path);

        if (paths.length >= maxPaths) {
          break;
        }
        continue;
      }

      // Explore swaps on current chain
      await this.exploreSameChainSwaps(current, queue);

      // Explore bridge to other chains (if not at bridge limit)
      if (current.bridgeCount < this.crossChainConfig.maxBridgeHops) {
        await this.exploreBridgeHops(current, queue, startAmount);
      }
    }

    // Sort paths by net profit
    return paths.sort((a, b) => {
      const profitDiff = Number(b.netProfit - a.netProfit);
      if (profitDiff !== 0) return profitDiff;
      // Secondary sort by time (prefer faster)
      return a.estimatedTimeSeconds - b.estimatedTimeSeconds;
    });
  }

  /**
   * Explore swap opportunities on the same chain
   */
  private async exploreSameChainSwaps(current: QueueItem, queue: QueueItem[]): Promise<void> {
    const edges = this.chainEdges.get(current.chain) || [];

    for (const edge of edges) {
      if (edge.tokenIn !== current.token) {
        continue;
      }

      // Calculate output amount (simplified)
      const amountOut = this.calculateSwapOutput(current.amount, edge);

      // Skip if amount too small
      if (amountOut < BigInt(10 ** 15)) {
        // Minimum threshold
        continue;
      }

      const hop: CrossChainHop = {
        dexName: edge.dexName,
        poolAddress: edge.poolAddress,
        tokenIn: edge.tokenIn,
        tokenOut: edge.tokenOut,
        amountIn: current.amount,
        amountOut,
        fee: edge.fee,
        gasEstimate: edge.gasEstimate,
        chainId: current.chain,
        isBridge: false,
        reserve0: edge.reserve0,
        reserve1: edge.reserve1,
      };

      queue.push({
        chain: current.chain,
        token: edge.tokenOut,
        amount: amountOut,
        hops: [...current.hops, hop],
        bridgeCount: current.bridgeCount,
        totalBridgeFees: current.totalBridgeFees,
        totalTime: current.totalTime + 10, // Assume 10 seconds per swap
        chains: current.chains,
      });
    }
  }

  /**
   * Explore bridge hops to other chains
   */
  private async exploreBridgeHops(
    current: QueueItem,
    queue: QueueItem[],
    _startAmount: bigint
  ): Promise<void> {
    // Don't bridge if amount is too small
    const minBridgeAmount = BigInt(10 ** 18); // 1 token minimum
    if (current.amount < minBridgeAmount) {
      return;
    }

    // Get available chains to bridge to
    const availableChains = Array.from(this.chainEdges.keys()).filter(
      (chain) => chain !== current.chain
    );

    for (const toChain of availableChains) {
      try {
        // Select bridge for this route
        const bridgeRoute = await this.bridgeManager.selectBridge(
          current.chain,
          toChain,
          current.token,
          current.amount
        );

        if (!bridgeRoute) {
          continue; // No bridge available
        }

        // Check if bridge fee is acceptable
        const feeRatio = Number(bridgeRoute.estimatedFee) / Number(current.amount);
        if (feeRatio > 0.1) {
          // Don't bridge if fee > 10%
          continue;
        }

        const amountAfterBridge = current.amount - bridgeRoute.estimatedFee;

        // Pruning: don't bridge if amount < minBridgeFeeRatio * fee
        if (
          amountAfterBridge <
          bridgeRoute.estimatedFee * BigInt(this.crossChainConfig.minBridgeFeeRatio)
        ) {
          continue;
        }

        const bridgeHop: CrossChainHop = {
          dexName: bridgeRoute.bridge,
          poolAddress: 'bridge',
          tokenIn: current.token,
          tokenOut: current.token, // Same token on different chain
          amountIn: current.amount,
          amountOut: amountAfterBridge,
          fee: Number(bridgeRoute.estimatedFee) / Number(current.amount),
          gasEstimate: 0,
          chainId: current.chain,
          isBridge: true,
          bridgeInfo: {
            bridge: bridgeRoute.bridge,
            toChain: toChain,
            estimatedTime: bridgeRoute.estimatedTime,
          },
        };

        queue.push({
          chain: toChain,
          token: current.token,
          amount: amountAfterBridge,
          hops: [...current.hops, bridgeHop],
          bridgeCount: current.bridgeCount + 1,
          totalBridgeFees: current.totalBridgeFees + bridgeRoute.estimatedFee,
          totalTime: current.totalTime + bridgeRoute.estimatedTime,
          chains: [...current.chains, toChain],
        });
      } catch (_error) {
        // Skip this bridge if there's an error
        continue;
      }
    }
  }

  /**
   * Calculate swap output using constant product formula
   */
  private calculateSwapOutput(amountIn: bigint, edge: PoolEdge): bigint {
    // Simplified constant product formula: x * y = k
    // amountOut = (amountIn * reserve1) / (reserve0 + amountIn)
    // With fee deduction

    const amountInWithFee = (amountIn * BigInt(Math.floor((1 - edge.fee) * 10000))) / BigInt(10000);
    const numerator = amountInWithFee * edge.reserve1;
    const denominator = edge.reserve0 + amountInWithFee;

    if (denominator === BigInt(0)) {
      return BigInt(0);
    }

    return numerator / denominator;
  }

  /**
   * Calculate total gas cost across all hops
   */
  private calculateTotalGasCost(hops: CrossChainHop[]): bigint {
    let totalGas = BigInt(0);
    for (const hop of hops) {
      if (!hop.isBridge) {
        // Assume 50 gwei gas price for simplicity
        totalGas += BigInt(hop.gasEstimate) * BigInt(50 * 10 ** 9);
      }
    }
    return totalGas;
  }

  /**
   * Calculate total fees (swap fees + bridge fees)
   */
  private calculateTotalFees(hops: CrossChainHop[]): number {
    let totalFees = 0;
    for (const hop of hops) {
      totalFees += hop.fee;
    }
    return totalFees;
  }

  /**
   * Calculate cumulative slippage impact
   */
  private calculateSlippageImpact(hops: CrossChainHop[]): number {
    let cumulativeSlippage = 1.0;
    for (const _hop of hops) {
      // Assume 0.5% slippage per hop (simplified)
      cumulativeSlippage *= 1 - 0.005;
    }
    return (1 - cumulativeSlippage) * 100; // Return as percentage
  }

  /**
   * Clear all path finders
   */
  clear(): void {
    for (const pathFinder of this.pathFindersByChain.values()) {
      pathFinder.clear();
    }
    this.chainEdges.clear();
  }

  /**
   * Get edges for a specific chain
   */
  getChainEdges(chainId: number | string): PoolEdge[] {
    return this.chainEdges.get(chainId) || [];
  }
}

export default CrossChainPathFinder;
