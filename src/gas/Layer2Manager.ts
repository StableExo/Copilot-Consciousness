/**
 * Layer2Manager - Multi-chain execution support for gas optimization
 * 
 * Integrates with Arbitrum, Optimism, and Base for cheaper execution
 */

import { ethers } from 'ethers';
import { ArbitragePath } from '../arbitrage/types';
import { GasPriceOracle } from './GasPriceOracle';

export type SupportedChain = 'mainnet' | 'arbitrum' | 'optimism' | 'base';

export interface ChainConfig {
  name: SupportedChain;
  rpcUrl: string;
  chainId: number;
  gasCostMultiplier: number; // Relative to mainnet (e.g., 0.1 for 10x cheaper)
  bridgeCost: bigint; // Cost to bridge assets to this chain
}

export interface ChainSelection {
  chain: SupportedChain;
  estimatedProfit: bigint;
  gasCost: bigint;
  bridgeCost: bigint;
  netProfit: bigint;
}

export interface DEXAvailability {
  chain: SupportedChain;
  dexName: string;
  available: boolean;
}

export class Layer2Manager {
  private chains: Map<SupportedChain, ChainConfig>;
  private providers: Map<SupportedChain, ethers.providers.JsonRpcProvider>;
  private oracles: Map<SupportedChain, GasPriceOracle>;
  private dexAvailability: Map<string, Set<SupportedChain>>;

  constructor() {
    this.chains = new Map();
    this.providers = new Map();
    this.oracles = new Map();
    this.dexAvailability = new Map();
    
    this.initializeDefaultChains();
    this.initializeDEXAvailability();
  }

  /**
   * Select optimal chain for execution
   */
  async selectOptimalChain(path: ArbitragePath): Promise<ChainSelection> {
    const selections: ChainSelection[] = [];

    for (const [chainName, config] of this.chains) {
      // Check if all DEXs in path are available on this chain
      if (!this.areAllDEXsAvailable(path, chainName)) {
        continue;
      }

      // Calculate costs for this chain
      const gasCost = await this.estimateGasCost(path, chainName);
      const bridgeCost = config.bridgeCost;
      const netProfit = path.estimatedProfit - gasCost - bridgeCost;

      selections.push({
        chain: chainName,
        estimatedProfit: path.estimatedProfit,
        gasCost,
        bridgeCost,
        netProfit
      });
    }

    // Sort by net profit and return best
    selections.sort((a, b) => {
      if (a.netProfit > b.netProfit) return -1;
      if (a.netProfit < b.netProfit) return 1;
      return 0;
    });

    // Return mainnet if no selections or best selection is not profitable
    if (selections.length === 0 || selections[0].netProfit <= BigInt(0)) {
      const mainnetSelection = await this.getMainnetSelection(path);
      return mainnetSelection;
    }

    return selections[0];
  }

  /**
   * Estimate gas cost for a path on a specific chain
   */
  async estimateGasCost(path: ArbitragePath, chain: SupportedChain): Promise<bigint> {
    const config = this.chains.get(chain);
    if (!config) {
      throw new Error(`Chain ${chain} not configured`);
    }

    // Get gas price for this chain
    const oracle = this.oracles.get(chain);
    if (!oracle) {
      // Fallback calculation
      const mainnetGas = path.totalGasCost;
      return (mainnetGas * BigInt(Math.floor(config.gasCostMultiplier * 1000))) / BigInt(1000);
    }

    const gasPrice = await oracle.getCurrentGasPrice('normal');
    const gasUnits = BigInt(path.totalGasCost);
    
    return gasUnits * gasPrice.maxFeePerGas;
  }

  /**
   * Register a chain
   */
  registerChain(config: ChainConfig): void {
    this.chains.set(config.name, config);
    
    // Create provider for this chain
    const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
    this.providers.set(config.name, provider);
    
    // Create oracle for this chain
    const oracle = new GasPriceOracle(config.rpcUrl);
    this.oracles.set(config.name, oracle);
  }

  /**
   * Register DEX availability on a chain
   */
  registerDEXOnChain(dexName: string, chain: SupportedChain): void {
    if (!this.dexAvailability.has(dexName)) {
      this.dexAvailability.set(dexName, new Set());
    }
    this.dexAvailability.get(dexName)!.add(chain);
  }

  /**
   * Check if a DEX is available on a chain
   */
  isDEXAvailableOnChain(dexName: string, chain: SupportedChain): boolean {
    const chains = this.dexAvailability.get(dexName);
    return chains ? chains.has(chain) : false;
  }

  /**
   * Get all chains where a DEX is available
   */
  getChainsForDEX(dexName: string): SupportedChain[] {
    const chains = this.dexAvailability.get(dexName);
    return chains ? Array.from(chains) : [];
  }

  /**
   * Calculate bridge cost for moving assets to a chain
   */
  calculateBridgeCost(
    chain: SupportedChain,
    amount: bigint
  ): bigint {
    const config = this.chains.get(chain);
    if (!config || chain === 'mainnet') {
      return BigInt(0);
    }

    // Bridge cost is typically fixed + percentage
    // This is a simplified model
    return config.bridgeCost;
  }

  /**
   * Get provider for a chain
   */
  getProvider(chain: SupportedChain): ethers.providers.JsonRpcProvider | undefined {
    return this.providers.get(chain);
  }

  /**
   * Get oracle for a chain
   */
  getOracle(chain: SupportedChain): GasPriceOracle | undefined {
    return this.oracles.get(chain);
  }

  /**
   * Get all configured chains
   */
  getChains(): ChainConfig[] {
    return Array.from(this.chains.values());
  }

  /**
   * Check if all DEXs in path are available on chain
   */
  private areAllDEXsAvailable(path: ArbitragePath, chain: SupportedChain): boolean {
    for (const hop of path.hops) {
      if (!this.isDEXAvailableOnChain(hop.dexName, chain)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get mainnet selection as fallback
   */
  private async getMainnetSelection(path: ArbitragePath): Promise<ChainSelection> {
    // totalGasCost is gas units, need to get current gas price
    const oracle = this.oracles.get('mainnet');
    let gasCost = BigInt(path.totalGasCost);
    
    if (oracle) {
      const gasPrice = await oracle.getCurrentGasPrice('normal');
      gasCost = BigInt(path.totalGasCost) * gasPrice.maxFeePerGas;
    }
    
    const netProfit = path.estimatedProfit - gasCost;

    return {
      chain: 'mainnet',
      estimatedProfit: path.estimatedProfit,
      gasCost,
      bridgeCost: BigInt(0),
      netProfit
    };
  }

  /**
   * Initialize default chain configurations
   */
  private initializeDefaultChains(): void {
    // Mainnet
    this.chains.set('mainnet', {
      name: 'mainnet',
      rpcUrl: process.env.MAINNET_RPC_URL || 'https://eth.llamarpc.com',
      chainId: 1,
      gasCostMultiplier: 1.0,
      bridgeCost: BigInt(0)
    });

    // Arbitrum One (10x cheaper)
    this.chains.set('arbitrum', {
      name: 'arbitrum',
      rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
      chainId: 42161,
      gasCostMultiplier: 0.1,
      bridgeCost: BigInt(50) * BigInt(10 ** 18) // 50 tokens estimated bridge cost
    });

    // Optimism (10x cheaper)
    this.chains.set('optimism', {
      name: 'optimism',
      rpcUrl: process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
      chainId: 10,
      gasCostMultiplier: 0.1,
      bridgeCost: BigInt(50) * BigInt(10 ** 18)
    });

    // Base (10x cheaper)
    this.chains.set('base', {
      name: 'base',
      rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
      chainId: 8453,
      gasCostMultiplier: 0.1,
      bridgeCost: BigInt(50) * BigInt(10 ** 18)
    });
  }

  /**
   * Initialize DEX availability on different chains
   */
  private initializeDEXAvailability(): void {
    // Uniswap available on all chains
    this.registerDEXOnChain('uniswap', 'mainnet');
    this.registerDEXOnChain('uniswap', 'arbitrum');
    this.registerDEXOnChain('uniswap', 'optimism');
    this.registerDEXOnChain('uniswap', 'base');

    // SushiSwap available on multiple chains
    this.registerDEXOnChain('sushiswap', 'mainnet');
    this.registerDEXOnChain('sushiswap', 'arbitrum');
    this.registerDEXOnChain('sushiswap', 'optimism');

    // Curve available on mainnet and some L2s
    this.registerDEXOnChain('curve', 'mainnet');
    this.registerDEXOnChain('curve', 'arbitrum');
    this.registerDEXOnChain('curve', 'optimism');

    // Balancer
    this.registerDEXOnChain('balancer', 'mainnet');
    this.registerDEXOnChain('balancer', 'arbitrum');
    this.registerDEXOnChain('balancer', 'optimism');

    // Add more DEXs as needed
  }
}
