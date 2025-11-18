/**
 * Unit tests for FlashbotsIntelligence
 */

import { ethers } from 'ethers';
import { FlashbotsIntelligence } from '../../../src/intelligence/flashbots/FlashbotsIntelligence';
import { BundleSimulationResult } from '../../../src/execution/types/PrivateRPCTypes';

describe('FlashbotsIntelligence', () => {
  let provider: ethers.providers.JsonRpcProvider;
  let intelligence: FlashbotsIntelligence;

  beforeEach(() => {
    provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
    intelligence = new FlashbotsIntelligence(provider, {
      minBuilderSuccessRate: 0.7,
      reputationWindowBlocks: 7200,
      enableRefundTracking: true,
      minTrackableMEV: BigInt(0.01e18),
    });
  });

  afterEach(() => {
    intelligence.reset();
  });

  describe('Builder Reputation Tracking', () => {
    it('should record builder success', () => {
      intelligence.recordBundleResult('builder-a', true, 1);
      
      const reputation = intelligence.getBuilderReputation('builder-a');
      expect(reputation).toBeDefined();
      expect(reputation?.successCount).toBe(1);
      expect(reputation?.failureCount).toBe(0);
      expect(reputation?.successRate).toBe(1.0);
      expect(reputation?.avgInclusionBlocks).toBe(1);
      expect(reputation?.isActive).toBe(true);
    });

    it('should record builder failure', () => {
      intelligence.recordBundleResult('builder-b', false, 0);
      
      const reputation = intelligence.getBuilderReputation('builder-b');
      expect(reputation).toBeDefined();
      expect(reputation?.successCount).toBe(0);
      expect(reputation?.failureCount).toBe(1);
      expect(reputation?.successRate).toBe(0);
      expect(reputation?.isActive).toBe(true);
    });

    it('should calculate success rate correctly', () => {
      intelligence.recordBundleResult('builder-c', true, 1);
      intelligence.recordBundleResult('builder-c', true, 2);
      intelligence.recordBundleResult('builder-c', false, 0);
      
      const reputation = intelligence.getBuilderReputation('builder-c');
      expect(reputation?.successRate).toBeCloseTo(2/3, 2);
    });

    it('should calculate average inclusion time', () => {
      intelligence.recordBundleResult('builder-d', true, 1);
      intelligence.recordBundleResult('builder-d', true, 3);
      intelligence.recordBundleResult('builder-d', true, 2);
      
      const reputation = intelligence.getBuilderReputation('builder-d');
      expect(reputation?.avgInclusionBlocks).toBeCloseTo(2, 2);
    });

    it('should mark builder inactive with low success rate', () => {
      // Need at least 10 attempts
      for (let i = 0; i < 10; i++) {
        intelligence.recordBundleResult('builder-e', false, 0);
      }
      
      const reputation = intelligence.getBuilderReputation('builder-e');
      expect(reputation?.isActive).toBe(false);
    });

    it('should keep builder active with good success rate', () => {
      for (let i = 0; i < 8; i++) {
        intelligence.recordBundleResult('builder-f', true, 1);
      }
      for (let i = 0; i < 2; i++) {
        intelligence.recordBundleResult('builder-f', false, 0);
      }
      
      const reputation = intelligence.getBuilderReputation('builder-f');
      expect(reputation?.isActive).toBe(true);
      expect(reputation?.successRate).toBe(0.8);
    });
  });

  describe('Recommended Builders', () => {
    beforeEach(() => {
      // Setup test data
      intelligence.recordBundleResult('builder-a', true, 1);
      intelligence.recordBundleResult('builder-a', true, 1);
      intelligence.recordBundleResult('builder-a', true, 2);
      
      intelligence.recordBundleResult('builder-b', true, 2);
      intelligence.recordBundleResult('builder-b', false, 0);
      
      intelligence.recordBundleResult('builder-c', true, 3);
      intelligence.recordBundleResult('builder-c', true, 4);
      intelligence.recordBundleResult('builder-c', true, 5);
      intelligence.recordBundleResult('builder-c', true, 3);
    });

    it('should return recommended builders sorted by performance', () => {
      const recommended = intelligence.getRecommendedBuilders(3);
      expect(recommended).toContain('builder-a');
      expect(recommended).toContain('builder-c');
    });

    it('should limit number of recommendations', () => {
      const recommended = intelligence.getRecommendedBuilders(1);
      expect(recommended.length).toBe(1);
    });

    it('should exclude inactive builders', () => {
      // Mark builder-a as inactive
      for (let i = 0; i < 10; i++) {
        intelligence.recordBundleResult('builder-a', false, 0);
      }
      
      const recommended = intelligence.getRecommendedBuilders(3);
      expect(recommended).not.toContain('builder-a');
    });
  });

  describe('MEV Refund Tracking', () => {
    it('should record MEV refund', () => {
      intelligence.recordMEVRefund({
        txHash: '0x1234',
        mevExtracted: (0.1e18).toString(),
        refundAmount: (0.09e18).toString(),
        blockNumber: 100,
        timestamp: Date.now(),
      });

      const refunds = intelligence.getRecentRefunds(1);
      expect(refunds.length).toBe(1);
      expect(refunds[0].txHash).toBe('0x1234');
    });

    it('should calculate total refunds correctly', () => {
      intelligence.recordMEVRefund({
        txHash: '0x1',
        mevExtracted: (0.1e18).toString(),
        refundAmount: (0.09e18).toString(),
        blockNumber: 100,
        timestamp: Date.now(),
      });

      intelligence.recordMEVRefund({
        txHash: '0x2',
        mevExtracted: (0.05e18).toString(),
        refundAmount: (0.045e18).toString(),
        blockNumber: 101,
        timestamp: Date.now(),
      });

      const stats = intelligence.getTotalMEVRefunds();
      expect(stats.totalExtracted).toBe(BigInt(0.15e18));
      expect(stats.totalRefunded).toBe(BigInt(0.135e18));
      expect(stats.refundRate).toBeCloseTo(0.9, 2);
    });

    it('should not track refunds below minimum threshold', () => {
      intelligence.recordMEVRefund({
        txHash: '0x3',
        mevExtracted: (0.001e18).toString(), // Below threshold
        refundAmount: (0.0009e18).toString(),
        blockNumber: 100,
        timestamp: Date.now(),
      });

      const refunds = intelligence.getRecentRefunds(10);
      expect(refunds.length).toBe(0);
    });

    it('should limit stored refunds to 1000', () => {
      for (let i = 0; i < 1100; i++) {
        intelligence.recordMEVRefund({
          txHash: `0x${i}`,
          mevExtracted: (0.1e18).toString(),
          refundAmount: (0.09e18).toString(),
          blockNumber: 100 + i,
          timestamp: Date.now() + i,
        });
      }

      const allRefunds = intelligence.getRecentRefunds(2000);
      expect(allRefunds.length).toBe(1000);
    });
  });

  describe('Bundle Simulation Analysis', () => {
    it('should detect successful simulation', () => {
      const simulation: BundleSimulationResult = {
        success: true,
        coinbaseDiff: (0.1e18).toString(),
        gasFees: (0.01e18).toString(),
        totalGasUsed: 200000,
        results: [
          { gasUsed: 100000, revert: false },
          { gasUsed: 100000, revert: false },
        ],
      };

      const analysis = intelligence.analyzeBundleSimulation(simulation);
      expect(analysis.shouldOptimize).toBe(false);
    });

    it('should recommend optimization for reverting transactions', () => {
      const simulation: BundleSimulationResult = {
        success: true,
        results: [
          { gasUsed: 100000, revert: false },
          { gasUsed: 100000, revert: true, revertReason: 'Insufficient balance' },
        ],
      };

      const analysis = intelligence.analyzeBundleSimulation(simulation);
      expect(analysis.shouldOptimize).toBe(true);
      expect(analysis.recommendations.some(r => r.includes('reverting'))).toBe(true);
    });

    it('should recommend optimization for low profit margin', () => {
      const simulation: BundleSimulationResult = {
        success: true,
        coinbaseDiff: (0.01e18).toString(),
        gasFees: (0.009e18).toString(), // Gas fees are 90% of profit
        totalGasUsed: 200000,
      };

      const analysis = intelligence.analyzeBundleSimulation(simulation);
      expect(analysis.shouldOptimize).toBe(true);
      expect(analysis.recommendations.some(r => r.includes('profit margin'))).toBe(true);
    });

    it('should detect high gas fees', () => {
      const simulation: BundleSimulationResult = {
        success: true,
        coinbaseDiff: (0.1e18).toString(),
        gasFees: (0.06e18).toString(), // 60% of profit
        totalGasUsed: 500000,
      };

      const analysis = intelligence.analyzeBundleSimulation(simulation);
      expect(analysis.shouldOptimize).toBe(true);
      expect(analysis.recommendations.some(r => r.includes('Gas fees'))).toBe(true);
    });
  });

  describe('Bundle Inclusion Probability', () => {
    it('should estimate higher probability for successful simulation', () => {
      const bundle = {
        signedTransactions: ['0x1', '0x2'],
        targetBlockNumber: 100,
      };

      const simulation: BundleSimulationResult = {
        success: true,
        coinbaseDiff: (0.1e18).toString(),
        totalGasUsed: 200000,
      };

      const probability = intelligence.estimateBundleInclusionProbability(bundle, simulation);
      expect(probability).toBeGreaterThan(0.5);
    });

    it('should estimate lower probability for reverting transactions', () => {
      const bundle = {
        signedTransactions: ['0x1'],
        targetBlockNumber: 100,
      };

      const simulation: BundleSimulationResult = {
        success: true,
        results: [{ revert: true }],
      };

      const probability = intelligence.estimateBundleInclusionProbability(bundle, simulation);
      expect(probability).toBeLessThan(0.5);
    });

    it('should estimate higher probability for profitable bundles', () => {
      const bundle = {
        signedTransactions: ['0x1'],
        targetBlockNumber: 100,
      };

      const simulation: BundleSimulationResult = {
        success: true,
        coinbaseDiff: (0.2e18).toString(), // High profit
      };

      const probability = intelligence.estimateBundleInclusionProbability(bundle, simulation);
      expect(probability).toBeGreaterThan(0.7);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      // Setup test data
      intelligence.recordBundleResult('builder-a', true, 1);
      intelligence.recordBundleResult('builder-a', true, 2);
      intelligence.recordBundleResult('builder-b', false, 0);
      
      intelligence.recordMEVRefund({
        txHash: '0x1',
        mevExtracted: (0.1e18).toString(),
        refundAmount: (0.09e18).toString(),
        blockNumber: 100,
        timestamp: Date.now(),
      });
    });

    it('should generate correct statistics', () => {
      const stats = intelligence.getStatistics();
      
      expect(stats.builders.total).toBe(2);
      expect(stats.builders.active).toBe(2);
      expect(stats.refunds.total).toBe(1);
    });

    it('should calculate average success rate', () => {
      const stats = intelligence.getStatistics();
      expect(stats.builders.avgSuccessRate).toBeGreaterThan(0);
    });
  });

  describe('Reset', () => {
    it('should clear all data on reset', () => {
      intelligence.recordBundleResult('builder-a', true, 1);
      intelligence.recordMEVRefund({
        txHash: '0x1',
        mevExtracted: (0.1e18).toString(),
        refundAmount: (0.09e18).toString(),
        blockNumber: 100,
        timestamp: Date.now(),
      });

      intelligence.reset();

      const stats = intelligence.getStatistics();
      expect(stats.builders.total).toBe(0);
      expect(stats.refunds.total).toBe(0);
    });
  });

  describe('Optimal Hints Configuration', () => {
    it('should recommend all hints for low privacy priority', () => {
      const hints = intelligence.recommendOptimalHints(0.2);
      expect(hints.calldata).toBe(true);
      expect(hints.contractAddress).toBe(true);
      expect(hints.functionSelector).toBe(true);
      expect(hints.logs).toBe(true);
      expect(hints.hash).toBe(true);
      expect(hints.default_logs).toBe(true);
    });

    it('should recommend balanced hints for medium privacy priority', () => {
      const hints = intelligence.recommendOptimalHints(0.5);
      expect(hints.calldata).toBeUndefined();
      expect(hints.contractAddress).toBe(true);
      expect(hints.functionSelector).toBe(true);
      expect(hints.logs).toBe(true);
      expect(hints.hash).toBe(true);
      expect(hints.default_logs).toBe(true);
    });

    it('should recommend only hash for high privacy priority', () => {
      const hints = intelligence.recommendOptimalHints(0.9);
      expect(hints.calldata).toBeUndefined();
      expect(hints.contractAddress).toBeUndefined();
      expect(hints.functionSelector).toBeUndefined();
      expect(hints.logs).toBeUndefined();
      expect(hints.hash).toBe(true);
      expect(hints.default_logs).toBeUndefined();
    });

    it('should handle edge cases', () => {
      const hintsMin = intelligence.recommendOptimalHints(-0.5);
      expect(hintsMin.calldata).toBe(true);

      const hintsMax = intelligence.recommendOptimalHints(1.5);
      expect(hintsMax.hash).toBe(true);
      expect(hintsMax.calldata).toBeUndefined();
    });
  });

  describe('Fast Mode Recommendations', () => {
    beforeEach(() => {
      // Mock provider methods
      jest.spyOn(provider, 'getGasPrice').mockResolvedValue(ethers.BigNumber.from('50000000000')); // 50 gwei
      jest.spyOn(provider, 'getBlock').mockResolvedValue({
        baseFeePerGas: ethers.BigNumber.from('40000000000'), // 40 gwei base fee
      } as any);
    });

    it('should recommend fast mode for high urgency', async () => {
      const recommendation = await intelligence.recommendFastMode(0.8);
      expect(recommendation.useFastMode).toBe(true);
      expect(recommendation.reasoning).toContain('High urgency');
      expect(recommendation.estimatedInclusionBlocks).toBe(1);
    });

    it('should recommend normal mode for low urgency and low congestion', async () => {
      // Mock low priority fee
      jest.spyOn(provider, 'getGasPrice').mockResolvedValue(ethers.BigNumber.from('45000000000')); // 45 gwei
      jest.spyOn(provider, 'getBlock').mockResolvedValue({
        baseFeePerGas: ethers.BigNumber.from('40000000000'), // 40 gwei base fee, only 12.5% priority
      } as any);

      const recommendation = await intelligence.recommendFastMode(0.1);
      expect(recommendation.useFastMode).toBe(false);
      expect(recommendation.reasoning).toContain('Low urgency');
      expect(recommendation.estimatedInclusionBlocks).toBe(2);
    });

    it('should recommend fast mode for high network congestion', async () => {
      // Mock high priority fee
      jest.spyOn(provider, 'getGasPrice').mockResolvedValue(ethers.BigNumber.from('100000000000')); // 100 gwei
      jest.spyOn(provider, 'getBlock').mockResolvedValue({
        baseFeePerGas: ethers.BigNumber.from('40000000000'), // 40 gwei base fee, 150% priority
      } as any);

      const recommendation = await intelligence.recommendFastMode(0.3);
      expect(recommendation.useFastMode).toBe(true);
      expect(recommendation.reasoning).toContain('congestion');
    });

    it('should handle medium urgency correctly', async () => {
      const recommendation = await intelligence.recommendFastMode(0.5);
      expect(recommendation.useFastMode).toBe(true);
      expect(recommendation.reasoning).toContain('Moderate');
    });
  });

  describe('MEV-Share Configuration Analysis', () => {
    it('should recommend hints when none configured', () => {
      const analysis = intelligence.analyzeMEVShareConfig();
      expect(analysis.shouldOptimize).toBe(true);
      expect(analysis.recommendations.some(r => r.includes('No hints'))).toBe(true);
      expect(analysis.suggestedHints).toBeDefined();
    });

    it('should detect low refund rate and recommend more hints', () => {
      // Record some low refund transactions
      for (let i = 0; i < 10; i++) {
        intelligence.recordMEVRefund({
          txHash: `0x${i}`,
          mevExtracted: (0.1e18).toString(),
          refundAmount: (0.02e18).toString(), // Only 20% refund
          blockNumber: 100 + i,
          timestamp: Date.now(),
        });
      }

      const currentHints = { hash: true };
      const analysis = intelligence.analyzeMEVShareConfig(currentHints);
      
      expect(analysis.shouldOptimize).toBe(true);
      expect(analysis.recommendations.some(r => r.includes('Low MEV refund rate'))).toBe(true);
      expect(analysis.suggestedHints?.default_logs).toBe(true);
    });

    it('should detect maximum privacy mode', () => {
      const currentHints = { hash: true };
      const analysis = intelligence.analyzeMEVShareConfig(currentHints);
      
      expect(analysis.recommendations.some(r => r.includes('Maximum privacy'))).toBe(true);
    });

    it('should detect maximum refund mode', () => {
      const currentHints = {
        calldata: true,
        logs: true,
        contractAddress: true,
        functionSelector: true,
      };
      const analysis = intelligence.analyzeMEVShareConfig(currentHints);
      
      expect(analysis.recommendations.some(r => r.includes('Maximum refund'))).toBe(true);
    });

    it('should suggest adding default_logs for better refunds', () => {
      // Record low refunds
      for (let i = 0; i < 10; i++) {
        intelligence.recordMEVRefund({
          txHash: `0x${i}`,
          mevExtracted: (0.1e18).toString(),
          refundAmount: (0.02e18).toString(),
          blockNumber: 100 + i,
          timestamp: Date.now(),
        });
      }

      const currentHints = { hash: true, logs: true };
      const analysis = intelligence.analyzeMEVShareConfig(currentHints);
      
      if (analysis.suggestedHints) {
        expect(analysis.suggestedHints.default_logs).toBe(true);
      }
    });
  });
});
