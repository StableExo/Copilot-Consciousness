/**
 * ArbitrageOpportunity Model Tests
 */

import {
  ArbitrageOpportunity,
  ArbitrageType,
  OpportunityStatus,
  createArbitrageOpportunity,
  calculateRiskScore,
  updateOpportunityStatus,
  calculateProfitMargin,
} from '../ArbitrageOpportunity';
import { createPathStep } from '../PathStep';

describe('ArbitrageOpportunity', () => {
  describe('createArbitrageOpportunity', () => {
    it('should create a spatial arbitrage opportunity', () => {
      const path = [
        createPathStep({
          step: 0,
          poolAddress: '0xPool1',
          protocol: 'uniswap_v3',
          tokenIn: '0xTokenA',
          tokenOut: '0xTokenB',
          amountIn: 100,
          expectedOutput: 105,
          feeBps: 30,
        }),
        createPathStep({
          step: 1,
          poolAddress: '0xPool2',
          protocol: 'sushiswap',
          tokenIn: '0xTokenB',
          tokenOut: '0xTokenA',
          amountIn: 105,
          expectedOutput: 110,
          feeBps: 30,
        }),
      ];

      const opp = createArbitrageOpportunity({
        opportunityId: 'test-1',
        arbType: ArbitrageType.SPATIAL,
        path,
        inputAmount: 100,
      });

      expect(opp.opportunityId).toBe('test-1');
      expect(opp.arbType).toBe(ArbitrageType.SPATIAL);
      expect(opp.status).toBe(OpportunityStatus.IDENTIFIED);
      expect(opp.path.length).toBe(2);
      expect(opp.tokenAddresses).toContain('0xTokenA');
      expect(opp.tokenAddresses).toContain('0xTokenB');
      expect(opp.poolAddresses).toEqual(['0xPool1', '0xPool2']);
      expect(opp.protocols).toEqual(['uniswap_v3', 'sushiswap']);
      expect(opp.inputAmount).toBe(100);
      expect(opp.expectedOutput).toBe(110);
      expect(opp.grossProfit).toBe(10);
      expect(opp.profitBps).toBe(1000); // 10%
    });

    it('should create a triangular arbitrage opportunity', () => {
      const path = [
        createPathStep({
          step: 0,
          poolAddress: '0xPool1',
          protocol: 'uniswap_v3',
          tokenIn: '0xWETH',
          tokenOut: '0xUSDC',
          amountIn: 1,
          expectedOutput: 2000,
          feeBps: 30,
        }),
        createPathStep({
          step: 1,
          poolAddress: '0xPool2',
          protocol: 'uniswap_v3',
          tokenIn: '0xUSDC',
          tokenOut: '0xDAI',
          amountIn: 2000,
          expectedOutput: 2050,
          feeBps: 30,
        }),
        createPathStep({
          step: 2,
          poolAddress: '0xPool3',
          protocol: 'uniswap_v3',
          tokenIn: '0xDAI',
          tokenOut: '0xWETH',
          amountIn: 2050,
          expectedOutput: 1.05,
          feeBps: 30,
        }),
      ];

      const opp = createArbitrageOpportunity({
        opportunityId: 'test-2',
        arbType: ArbitrageType.TRIANGULAR,
        path,
        inputAmount: 1,
        requiresFlashLoan: true,
        flashLoanAmount: 1,
        flashLoanToken: '0xWETH',
      });

      expect(opp.arbType).toBe(ArbitrageType.TRIANGULAR);
      expect(opp.path.length).toBe(3);
      expect(opp.requiresFlashLoan).toBe(true);
      expect(opp.flashLoanAmount).toBe(1);
      expect(opp.grossProfit).toBeCloseTo(0.05, 2);
      expect(opp.profitBps).toBe(500); // 5%
    });

    it('should calculate risk score on creation', () => {
      const path = [
        createPathStep({
          step: 0,
          poolAddress: '0xPool1',
          protocol: 'uniswap_v3',
          tokenIn: '0xTokenA',
          tokenOut: '0xTokenB',
          amountIn: 100,
          expectedOutput: 105,
          feeBps: 30,
        }),
      ];

      const opp = createArbitrageOpportunity({
        opportunityId: 'test-3',
        arbType: ArbitrageType.SPATIAL,
        path,
        inputAmount: 100,
      });

      expect(opp.riskScore).toBeDefined();
      expect(opp.riskScore).toBeGreaterThan(0);
      expect(opp.riskScore).toBeLessThanOrEqual(1);
    });

    it('should throw error if path is empty', () => {
      expect(() => {
        createArbitrageOpportunity({
          opportunityId: 'test-4',
          arbType: ArbitrageType.SPATIAL,
          path: [],
          inputAmount: 100,
        });
      }).toThrow('Opportunity must have at least one path step');
    });
  });

  describe('calculateRiskScore', () => {
    it('should calculate higher risk for longer paths', () => {
      const shortPath = [
        createPathStep({
          step: 0,
          poolAddress: '0xPool1',
          protocol: 'uniswap_v3',
          tokenIn: '0xTokenA',
          tokenOut: '0xTokenB',
          amountIn: 100,
          expectedOutput: 105,
          feeBps: 30,
        }),
      ];

      const longPath = [...shortPath, ...shortPath, ...shortPath];

      const shortOpp = createArbitrageOpportunity({
        opportunityId: 'short',
        arbType: ArbitrageType.SPATIAL,
        path: shortPath,
        inputAmount: 100,
      });

      const longOpp = createArbitrageOpportunity({
        opportunityId: 'long',
        arbType: ArbitrageType.SPATIAL,
        path: longPath,
        inputAmount: 100,
      });

      expect(calculateRiskScore(longOpp)).toBeGreaterThan(calculateRiskScore(shortOpp));
    });

    it('should calculate higher risk for flash loans', () => {
      const path = [
        createPathStep({
          step: 0,
          poolAddress: '0xPool1',
          protocol: 'uniswap_v3',
          tokenIn: '0xTokenA',
          tokenOut: '0xTokenB',
          amountIn: 100,
          expectedOutput: 105,
          feeBps: 30,
        }),
      ];

      const noFlashLoan = createArbitrageOpportunity({
        opportunityId: 'no-flash',
        arbType: ArbitrageType.SPATIAL,
        path,
        inputAmount: 100,
        requiresFlashLoan: false,
      });

      const withFlashLoan = createArbitrageOpportunity({
        opportunityId: 'with-flash',
        arbType: ArbitrageType.SPATIAL,
        path,
        inputAmount: 100,
        requiresFlashLoan: true,
      });

      expect(calculateRiskScore(withFlashLoan)).toBeGreaterThan(calculateRiskScore(noFlashLoan));
    });

    it('should calculate higher risk for unknown protocols', () => {
      const knownProtocol = createArbitrageOpportunity({
        opportunityId: 'known',
        arbType: ArbitrageType.SPATIAL,
        path: [
          createPathStep({
            step: 0,
            poolAddress: '0xPool1',
            protocol: 'uniswap_v2',
            tokenIn: '0xTokenA',
            tokenOut: '0xTokenB',
            amountIn: 100,
            expectedOutput: 105,
            feeBps: 30,
          }),
        ],
        inputAmount: 100,
      });

      const unknownProtocol = createArbitrageOpportunity({
        opportunityId: 'unknown',
        arbType: ArbitrageType.SPATIAL,
        path: [
          createPathStep({
            step: 0,
            poolAddress: '0xPool1',
            protocol: 'unknown_dex',
            tokenIn: '0xTokenA',
            tokenOut: '0xTokenB',
            amountIn: 100,
            expectedOutput: 105,
            feeBps: 30,
          }),
        ],
        inputAmount: 100,
      });

      expect(calculateRiskScore(unknownProtocol)).toBeGreaterThan(
        calculateRiskScore(knownProtocol)
      );
    });
  });

  describe('updateOpportunityStatus', () => {
    it('should allow valid status transitions', () => {
      const opp = createArbitrageOpportunity({
        opportunityId: 'test',
        arbType: ArbitrageType.SPATIAL,
        path: [
          createPathStep({
            step: 0,
            poolAddress: '0xPool1',
            protocol: 'uniswap_v3',
            tokenIn: '0xTokenA',
            tokenOut: '0xTokenB',
            amountIn: 100,
            expectedOutput: 105,
            feeBps: 30,
          }),
        ],
        inputAmount: 100,
      });

      expect(opp.status).toBe(OpportunityStatus.IDENTIFIED);

      const result1 = updateOpportunityStatus(opp, OpportunityStatus.SIMULATED);
      expect(result1).toBe(true);
      expect(opp.status).toBe(OpportunityStatus.SIMULATED);

      const result2 = updateOpportunityStatus(opp, OpportunityStatus.PENDING);
      expect(result2).toBe(true);
      expect(opp.status).toBe(OpportunityStatus.PENDING);

      const result3 = updateOpportunityStatus(opp, OpportunityStatus.EXECUTING);
      expect(result3).toBe(true);
      expect(opp.status).toBe(OpportunityStatus.EXECUTING);

      const result4 = updateOpportunityStatus(opp, OpportunityStatus.EXECUTED);
      expect(result4).toBe(true);
      expect(opp.status).toBe(OpportunityStatus.EXECUTED);
    });

    it('should reject invalid status transitions', () => {
      const opp = createArbitrageOpportunity({
        opportunityId: 'test',
        arbType: ArbitrageType.SPATIAL,
        path: [
          createPathStep({
            step: 0,
            poolAddress: '0xPool1',
            protocol: 'uniswap_v3',
            tokenIn: '0xTokenA',
            tokenOut: '0xTokenB',
            amountIn: 100,
            expectedOutput: 105,
            feeBps: 30,
          }),
        ],
        inputAmount: 100,
      });

      // Can't go from IDENTIFIED to EXECUTED
      const result = updateOpportunityStatus(opp, OpportunityStatus.EXECUTED);
      expect(result).toBe(false);
      expect(opp.status).toBe(OpportunityStatus.IDENTIFIED);
    });

    it('should set error message on failure', () => {
      const opp = createArbitrageOpportunity({
        opportunityId: 'test',
        arbType: ArbitrageType.SPATIAL,
        path: [
          createPathStep({
            step: 0,
            poolAddress: '0xPool1',
            protocol: 'uniswap_v3',
            tokenIn: '0xTokenA',
            tokenOut: '0xTokenB',
            amountIn: 100,
            expectedOutput: 105,
            feeBps: 30,
          }),
        ],
        inputAmount: 100,
      });

      updateOpportunityStatus(opp, OpportunityStatus.FAILED, 'Test error');
      expect(opp.status).toBe(OpportunityStatus.FAILED);
      expect(opp.errorMessage).toBe('Test error');
    });
  });

  describe('calculateProfitMargin', () => {
    it('should calculate profit margin correctly', () => {
      const path = [
        createPathStep({
          step: 0,
          poolAddress: '0xPool1',
          protocol: 'uniswap_v3',
          tokenIn: '0xTokenA',
          tokenOut: '0xTokenA',
          amountIn: 100,
          expectedOutput: 110,
          feeBps: 30,
        }),
      ];

      const opp = createArbitrageOpportunity({
        opportunityId: 'test',
        arbType: ArbitrageType.SPATIAL,
        path,
        inputAmount: 100,
      });

      const margin = calculateProfitMargin(opp);
      expect(margin).toBe(10); // 10% profit margin
    });

    it('should use netProfit if available', () => {
      const opp = createArbitrageOpportunity({
        opportunityId: 'test',
        arbType: ArbitrageType.SPATIAL,
        path: [
          createPathStep({
            step: 0,
            poolAddress: '0xPool1',
            protocol: 'uniswap_v3',
            tokenIn: '0xTokenA',
            tokenOut: '0xTokenB',
            amountIn: 100,
            expectedOutput: 110,
            feeBps: 30,
          }),
        ],
        inputAmount: 100,
      });

      opp.netProfit = 8; // After gas costs
      const margin = calculateProfitMargin(opp);
      expect(margin).toBe(8); // 8% net profit margin
    });

    it('should return 0 for zero input amount', () => {
      const opp = createArbitrageOpportunity({
        opportunityId: 'test',
        arbType: ArbitrageType.SPATIAL,
        path: [
          createPathStep({
            step: 0,
            poolAddress: '0xPool1',
            protocol: 'uniswap_v3',
            tokenIn: '0xTokenA',
            tokenOut: '0xTokenB',
            amountIn: 0,
            expectedOutput: 0,
            feeBps: 30,
          }),
        ],
        inputAmount: 0,
      });

      const margin = calculateProfitMargin(opp);
      expect(margin).toBe(0);
    });
  });
});
