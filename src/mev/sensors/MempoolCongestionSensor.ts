/**
 * MempoolCongestionSensor - Real-time mempool congestion score
 * Ported from AxionCitadel's mev_risk_arb/sensors/mempool_congestion.py
 * 
 * Calculates a 0-1 congestion score based on:
 * 1. Pending transactions ratio
 * 2. Gas usage deviation
 * 3. Base fee velocity (EIP-1559 dynamics)
 */

import { ethers } ,Provider } from 'ethers';
import { SensorReading } from '../types/TransactionType';

export interface CongestionWeights {
  pendingRatio: number;
  gasDeviation: number;
  feeVelocity: number;
}

const DEFAULT_WEIGHTS: CongestionWeights = {
  pendingRatio: 0.4,
  gasDeviation: 0.3,
  feeVelocity: 0.3,
};

export class MempoolCongestionSensor {
  private provider: Provider;
  private weights: CongestionWeights;
  private windowSize: number;

  constructor(
    provider: Provider,
    windowSize: number = 5,
    weights?: Partial<CongestionWeights>
  ) {
    this.provider = provider;
    this.windowSize = windowSize;
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
  }

  /**
   * Get real-time mempool congestion score (0-1 scale)
   */
  async getCongestionScore(): Promise<number> {
    try {
      // 1. Pending transactions ratio
      const pendingRatio = await this.calculatePendingRatio();

      // 2. Gas usage deviation
      const gasDeviation = await this.calculateGasDeviation();

      // 3. Base fee velocity (EIP-1559 dynamics)
      const feeVelocity = await this.calculateFeeVelocity();

      // Weighted composition
      const congestionScore =
        this.weights.pendingRatio * pendingRatio +
        this.weights.gasDeviation * Math.min(gasDeviation, 1.0) +
        this.weights.feeVelocity * Math.min(Math.abs(feeVelocity), 1.0);

      return congestionScore;
    } catch (error) {
      console.error('Error in getCongestionScore:', error);
      // Fallback to neutral score
      return 0.5;
    }
  }

  /**
   * Get sensor reading with metadata
   */
  async getReading(): Promise<SensorReading> {
    const value = await this.getCongestionScore();
    return {
      value,
      timestamp: Date.now(),
      source: 'MempoolCongestionSensor',
    };
  }

  /**
   * Calculate pending transaction ratio
   */
  private async calculatePendingRatio(): Promise<number> {
    try {
      // Get pending block with full transactions
      const pendingBlock = await this.provider.getBlock('pending');
      const pendingCount = pendingBlock?.transactions?.length || 0;

      // Get latest block to estimate capacity
      const latestBlock = await this.provider.getBlock('latest');
      const txPerBlock = latestBlock?.transactions?.length || 1;

      // Cap at 10 blocks equivalent
      const pendingRatio = Math.min(pendingCount / Math.max(txPerBlock * 10, 1), 1.0);

      return pendingRatio;
    } catch (error) {
      console.warn('Error calculating pending ratio:', error);
      return 0;
    }
  }

  /**
   * Calculate gas usage deviation across recent blocks
   */
  private async calculateGasDeviation(): Promise<number> {
    try {
      const currentBlockNumber = await this.provider.getBlockNumber();
      const blocks: ethers.providers.Block[] = [];

      // Fetch recent blocks
      for (let i = 0; i < this.windowSize; i++) {
        if (currentBlockNumber - i >= 0) {
          const block = await this.provider.getBlock(currentBlockNumber - i);
          if (block) {
            blocks.push(block);
          }
        }
      }

      if (blocks.length === 0) {
        return 0;
      }

      // Calculate gas usage ratios
      const gasRatios = blocks
        .filter((b) => b.gasLimit > 0n)
        .map((b) => Number(b.gasUsed) / Number(b.gasLimit));

      if (gasRatios.length < 2) {
        return 0;
      }

      // Calculate standard deviation
      const mean = gasRatios.reduce((a, b) => a + b, 0) / gasRatios.length;
      const squaredDiffs = gasRatios.map((r) => Math.pow(r - mean, 2));
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / gasRatios.length;
      const stdev = Math.sqrt(variance);

      // Amplify variance sensitivity
      return stdev * 2;
    } catch (error) {
      console.warn('Error calculating gas deviation:', error);
      return 0;
    }
  }

  /**
   * Calculate base fee velocity (rate of change)
   */
  private async calculateFeeVelocity(): Promise<number> {
    try {
      const currentBlockNumber = await this.provider.getBlockNumber();
      const blocks: ethers.providers.Block[] = [];

      // Fetch recent blocks
      for (let i = 0; i < this.windowSize; i++) {
        if (currentBlockNumber - i >= 0) {
          const block = await this.provider.getBlock(currentBlockNumber - i);
          if (block) {
            blocks.push(block);
          }
        }
      }

      // Extract base fees (EIP-1559)
      const baseFees = blocks
        .filter((b) => b.baseFeePerGas !== undefined && b.baseFeePerGas !== null)
        .map((b) => b.baseFeePerGas!.toNumber());

      if (baseFees.length < 2) {
        return 0;
      }

      // Calculate percentage change
      const lastFee = baseFees[baseFees.length - 1];
      const firstFee = baseFees[0];

      if (lastFee === 0) {
        return firstFee === 0 ? 0 : 1.0;
      }

      const feeVelocity = (firstFee - lastFee) / lastFee;
      return feeVelocity;
    } catch (error) {
      console.warn('Error calculating fee velocity:', error);
      return 0;
    }
  }
}
