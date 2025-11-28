/**
 * SearcherDensitySensor - Quantify MEV bot activity density
 * Ported from AxionCitadel's mev_risk_arb/sensors/searcher_density.py
 *
 * Calculates a 0-1 density score based on:
 * 1. MEV transaction ratio
 * 2. Sandwich attack indicators (gas price variance)
 * 3. Bot clustering (unique high-gas addresses)
 */

import { Provider, getAddress, TransactionResponse } from 'ethers';
// ethers namespace reserved for utilities
import type { ethers as _ethers } from 'ethers';
import { SensorReading } from '../types/TransactionType';

export interface DensityWeights {
  mevRatio: number;
  sandwich: number;
  clustering: number;
}

const DEFAULT_WEIGHTS: DensityWeights = {
  mevRatio: 0.5,
  sandwich: 0.3,
  clustering: 0.2,
};

// MEV-sensitive contracts (should be configurable)
const DEFAULT_MEV_CONTRACTS = {
  UNISWAP_V3_ROUTER: '0x68b3465833fb72A70ecfFf80892690ab4c15dEc1',
  SUSHI_ROUTER: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  // Add more as needed
};

export class SearcherDensitySensor {
  private provider: Provider;
  private weights: DensityWeights;
  private lookbackBlocks: number;
  private mevContracts: Set<string>;

  constructor(
    provider: Provider,
    lookbackBlocks: number = 20,
    weights?: Partial<DensityWeights>,
    mevContracts?: string[]
  ) {
    this.provider = provider;
    this.lookbackBlocks = lookbackBlocks;
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };

    // Initialize MEV contract addresses (checksummed)
    const contracts = mevContracts || Object.values(DEFAULT_MEV_CONTRACTS);
    this.mevContracts = new Set();

    // Only add valid checksummed addresses
    for (const addr of contracts) {
      try {
        this.mevContracts.add(getAddress(addr));
      } catch (_error) {
        console.warn(`Invalid MEV contract address ignored: ${addr}`);
      }
    }
  }

  /**
   * Get real-time searcher density score (0-1 scale)
   */
  async getDensityScore(): Promise<number> {
    try {
      const currentBlockNumber = await this.provider.getBlockNumber();

      // 1. MEV transaction ratio
      const mevRatio = await this.calculateMEVRatio(currentBlockNumber);

      // 2. Sandwich attack score proxy (gas price variance)
      const sandwichScore = await this.calculateSandwichScore(currentBlockNumber);

      // 3. Bot clustering
      const clustering = await this.calculateClustering(currentBlockNumber);

      // Weighted composition
      const densityScore =
        this.weights.mevRatio * mevRatio +
        this.weights.sandwich * sandwichScore +
        this.weights.clustering * clustering;

      return densityScore;
    } catch (error) {
      console.error('Error in getDensityScore:', error);
      // Fallback to neutral score
      return 0.5;
    }
  }

  /**
   * Get sensor reading with metadata
   */
  async getReading(): Promise<SensorReading> {
    const value = await this.getDensityScore();
    return {
      value,
      timestamp: Date.now(),
      source: 'SearcherDensitySensor',
    };
  }

  /**
   * Calculate MEV transaction ratio
   */
  private async calculateMEVRatio(currentBlockNumber: number): Promise<number> {
    try {
      let mevTxCount = 0;
      let totalTxCount = 0;

      for (let i = 0; i < this.lookbackBlocks; i++) {
        const blockNumber = currentBlockNumber - i;
        if (blockNumber < 0) break;

        const block = await this.provider.getBlock(blockNumber, true);
        if (!block) continue;

        totalTxCount += block.transactions.length;

        for (const txOrHash of block.transactions) {
          // In ethers v6, transactions can be TransactionResponse or string (hash)
          const tx =
            typeof txOrHash === 'string'
              ? await this.provider.getTransaction(txOrHash)
              : (txOrHash as TransactionResponse);
          if (!tx) continue;

          if (tx.to) {
            try {
              const checksummedTo = getAddress(tx.to);
              if (this.mevContracts.has(checksummedTo)) {
                mevTxCount++;
              }
            } catch {
              // Skip malformed addresses
              continue;
            }
          }
        }
      }

      return mevTxCount / Math.max(totalTxCount, 1);
    } catch (error) {
      console.warn('Error calculating MEV ratio:', error);
      return 0;
    }
  }

  /**
   * Calculate sandwich attack score (gas price variance as proxy)
   */
  private async calculateSandwichScore(currentBlockNumber: number): Promise<number> {
    try {
      const gasPrices: number[] = [];

      // Look at last 3 blocks for gas price variance
      const blocksToAnalyze = Math.min(this.lookbackBlocks, 3);
      for (let i = 0; i < blocksToAnalyze; i++) {
        const blockNumber = currentBlockNumber - i;
        if (blockNumber < 0) break;

        const block = await this.provider.getBlock(blockNumber, true);
        if (!block) continue;

        for (const txOrHash of block.transactions) {
          // In ethers v6, transactions can be TransactionResponse or string (hash)
          const tx =
            typeof txOrHash === 'string'
              ? await this.provider.getTransaction(txOrHash)
              : (txOrHash as TransactionResponse);
          if (!tx) continue;

          if (tx.gasPrice) {
            gasPrices.push(Number(tx.gasPrice));
          }
        }
      }

      if (gasPrices.length < 10) {
        return 0;
      }

      // Calculate coefficient of variation (stdev/mean)
      const mean = gasPrices.reduce((a, b) => a + b, 0) / gasPrices.length;
      if (mean === 0) {
        return 0;
      }

      const squaredDiffs = gasPrices.map((p) => Math.pow(p - mean, 2));
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / gasPrices.length;
      const stdev = Math.sqrt(variance);

      const coefficientOfVariation = stdev / mean;
      return Math.min(coefficientOfVariation, 1.0);
    } catch (error) {
      console.warn('Error calculating sandwich score:', error);
      return 0;
    }
  }

  /**
   * Calculate bot clustering (unique high-gas addresses)
   */
  private async calculateClustering(currentBlockNumber: number): Promise<number> {
    try {
      // First, get average gas price from latest block
      const latestBlock = await this.provider.getBlock('latest', true);
      if (!latestBlock || latestBlock.transactions.length === 0) {
        return 0;
      }

      const avgGasPrice =
        latestBlock.transactions
          .map((txOrHash) =>
            typeof txOrHash === 'string' ? null : (txOrHash as TransactionResponse)
          )
          .filter((tx): tx is TransactionResponse => tx !== null && tx.gasPrice !== null)
          .reduce((sum, tx) => sum + Number(tx.gasPrice), 0) /
        Math.max(
          latestBlock.transactions.filter(
            (txOrHash) => typeof txOrHash !== 'string' && (txOrHash as TransactionResponse).gasPrice
          ).length,
          1
        );

      const highGasThreshold = avgGasPrice * 5; // 5x average
      const botAddresses = new Set<string>();

      // Analyze last 3 blocks for high-gas transactions
      const blocksToAnalyze = Math.min(this.lookbackBlocks, 3);
      for (let i = 0; i < blocksToAnalyze; i++) {
        const blockNumber = currentBlockNumber - i;
        if (blockNumber < 0) break;

        const block = await this.provider.getBlock(blockNumber, true);
        if (!block) continue;

        for (const txOrHash of block.transactions) {
          // In ethers v6, transactions can be TransactionResponse or string (hash)
          const tx =
            typeof txOrHash === 'string'
              ? await this.provider.getTransaction(txOrHash)
              : (txOrHash as TransactionResponse);
          if (!tx) continue;

          if (tx.from && tx.gasPrice && Number(tx.gasPrice) > highGasThreshold) {
            try {
              const checksummedFrom = getAddress(tx.from);
              botAddresses.add(checksummedFrom);
            } catch {
              // Skip malformed addresses
              continue;
            }
          }
        }
      }

      // Normalize based on expected max number of bot addresses (50 is arbitrary)
      const clustering = Math.min(botAddresses.size / 50.0, 1.0);
      return clustering;
    } catch (error) {
      console.warn('Error calculating clustering:', error);
      return 0;
    }
  }

  /**
   * Add MEV contract address to monitor
   */
  addMEVContract(address: string): void {
    this.mevContracts.add(getAddress(address));
  }

  /**
   * Remove MEV contract address from monitoring
   */
  removeMEVContract(address: string): void {
    this.mevContracts.delete(getAddress(address));
  }
}
