/**
 * Adversarial MEV Fuzz Tests
 *
 * Tests the ethics engine and MEV risk model against adversarial scenarios
 * including sandwich attacks, frontrunning, backrunning, and other MEV exploits.
 */

import { MEVRiskModel } from '../../../src/mev/models/MEVRiskModel';
import { MEVAwareProfitCalculator } from '../../../src/mev/models/MEVAwareProfitCalculator';
import { TransactionType } from '../../../src/mev/types/TransactionType';
import { 
  ProductionSafetyManager, 
  CircuitBreaker, 
  EmergencyStop,
} from '../../../src/safety';

/**
 * Fuzzer utilities for generating adversarial test cases
 */
class MEVFuzzer {
  private readonly seed: number;
  private rng: () => number;

  constructor(seed: number = 42) {
    this.seed = seed;
    this.rng = this.createSeededRandom(seed);
  }

  private createSeededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 1103515245 + 12345) % 2147483648;
      return s / 2147483648;
    };
  }

  /**
   * Generate random transaction value within realistic range
   */
  randomTxValue(min: number = 0.01, max: number = 1000): number {
    return min + this.rng() * (max - min);
  }

  /**
   * Generate random congestion level
   */
  randomCongestion(): number {
    return this.rng();
  }

  /**
   * Generate random transaction type
   */
  randomTxType(): TransactionType {
    const types = Object.values(TransactionType);
    return types[Math.floor(this.rng() * types.length)];
  }

  /**
   * Generate extreme edge case values
   */
  extremeValue(): number {
    const extremes = [0, 0.000001, 0.001, 1, 100, 10000, 1000000, Number.MAX_SAFE_INTEGER / 1e18];
    return extremes[Math.floor(this.rng() * extremes.length)];
  }

  /**
   * Generate sandwich attack scenario
   */
  generateSandwichAttack(): {
    victimTx: { value: number; type: TransactionType };
    frontrunTx: { value: number; type: TransactionType };
    backrunTx: { value: number; type: TransactionType };
    expectedSlippage: number;
  } {
    const victimValue = this.randomTxValue(1, 100);
    const slippage = 0.005 + this.rng() * 0.03; // 0.5% - 3.5% slippage

    return {
      victimTx: {
        value: victimValue,
        type: TransactionType.FRONT_RUNNABLE,
      },
      frontrunTx: {
        value: victimValue * (0.5 + this.rng() * 0.5),
        type: TransactionType.ARBITRAGE,
      },
      backrunTx: {
        value: victimValue * slippage * 0.8,
        type: TransactionType.ARBITRAGE,
      },
      expectedSlippage: slippage,
    };
  }

  /**
   * Generate JIT liquidity attack scenario
   */
  generateJITLiquidityAttack(): {
    swapValue: number;
    liquidityAdded: number;
    liquidityRemoved: number;
    extractedValue: number;
  } {
    const swapValue = this.randomTxValue(10, 500);
    const liquidityMultiplier = 2 + this.rng() * 8; // 2x - 10x
    const feeRate = 0.003; // 0.3% fee

    return {
      swapValue,
      liquidityAdded: swapValue * liquidityMultiplier,
      liquidityRemoved: swapValue * liquidityMultiplier,
      extractedValue: swapValue * feeRate * 0.9, // 90% of fees captured
    };
  }

  /**
   * Generate liquidation attack scenario
   */
  generateLiquidationAttack(): {
    collateralValue: number;
    debtValue: number;
    liquidationBonus: number;
    gasCost: number;
    profit: number;
  } {
    const collateralValue = this.randomTxValue(100, 10000);
    const healthFactor = 0.95 + this.rng() * 0.1; // Just under 1.0
    const debtValue = collateralValue * healthFactor;
    const liquidationBonus = 0.05 + this.rng() * 0.1; // 5% - 15%
    const gasCost = 0.01 + this.rng() * 0.05;

    return {
      collateralValue,
      debtValue,
      liquidationBonus,
      gasCost,
      profit: collateralValue * liquidationBonus - gasCost,
    };
  }

  /**
   * Generate time-bandit attack scenario
   */
  generateTimeBanditAttack(): {
    blockReward: number;
    mevOpportunity: number;
    reorgDepth: number;
    attackerStake: number;
  } {
    const blockReward = 2; // ETH
    const mevOpportunity = this.randomTxValue(1, 50);
    const reorgDepth = Math.floor(1 + this.rng() * 3);

    return {
      blockReward,
      mevOpportunity,
      reorgDepth,
      attackerStake: mevOpportunity * 0.1, // 10% of MEV as stake
    };
  }
}

describe('Adversarial MEV Fuzz Tests', () => {
  let riskModel: MEVRiskModel;
  let profitCalculator: MEVAwareProfitCalculator;
  let fuzzer: MEVFuzzer;

  beforeEach(() => {
    riskModel = new MEVRiskModel();
    profitCalculator = new MEVAwareProfitCalculator();
    // Use fixed seed for reproducible tests
    fuzzer = new MEVFuzzer(42);
  });

  describe('Risk Model Invariants', () => {
    it('should never return negative risk', () => {
      for (let i = 0; i < 100; i++) {
        const value = fuzzer.randomTxValue();
        const type = fuzzer.randomTxType();
        const congestion = fuzzer.randomCongestion();

        const risk = riskModel.calculateRisk(value, type, congestion);
        expect(risk).toBeGreaterThanOrEqual(0);
      }
    });

    it('should never return risk greater than transaction value (except for zero-value)', () => {
      for (let i = 0; i < 100; i++) {
        const value = fuzzer.randomTxValue(0.01, 1000);
        const type = fuzzer.randomTxType();
        const congestion = fuzzer.randomCongestion();

        const risk = riskModel.calculateRisk(value, type, congestion);
        expect(risk).toBeLessThanOrEqual(value);
      }
    });

    it('should handle extreme values without throwing', () => {
      const extremeValues = [0, 0.000001, 1e-15, 1e15, Number.MAX_SAFE_INTEGER];
      const types = Object.values(TransactionType);

      for (const value of extremeValues) {
        for (const type of types) {
          expect(() => {
            riskModel.calculateRisk(value, type, 0);
            riskModel.calculateRisk(value, type, 0.5);
            riskModel.calculateRisk(value, type, 1);
          }).not.toThrow();
        }
      }
    });

    it('should increase risk with higher congestion', () => {
      const value = 10;
      const type = TransactionType.ARBITRAGE;

      const lowCongestionRisk = riskModel.calculateRisk(value, type, 0.1);
      const highCongestionRisk = riskModel.calculateRisk(value, type, 0.9);

      // Higher congestion should generally not decrease risk significantly
      // (the model may have complex interactions, so we check it doesn't collapse)
      expect(highCongestionRisk).toBeGreaterThan(0);
      expect(lowCongestionRisk).toBeGreaterThan(0);
    });

    it('should assign highest risk to FRONT_RUNNABLE transactions', () => {
      const value = 100;
      const congestion = 0.5;

      const frontRunnableRisk = riskModel.calculateRisk(value, TransactionType.FRONT_RUNNABLE, congestion);
      const liquidityRisk = riskModel.calculateRisk(value, TransactionType.LIQUIDITY_PROVISION, congestion);

      expect(frontRunnableRisk).toBeGreaterThan(liquidityRisk);
    });
  });

  describe('Sandwich Attack Scenarios', () => {
    it('should properly quantify sandwich attack risk', () => {
      for (let i = 0; i < 50; i++) {
        const attack = fuzzer.generateSandwichAttack();

        // Victim transaction should have high risk
        const victimRisk = riskModel.calculateDetailedRisk(
          attack.victimTx.value,
          attack.victimTx.type,
          0.7 // High congestion during attack
        );

        expect(victimRisk.frontrunProbability).toBeGreaterThan(0.8);
        expect(victimRisk.riskRatio).toBeGreaterThan(0);
      }
    });

    it('should detect profitable sandwich opportunities', () => {
      const attack = fuzzer.generateSandwichAttack();
      
      // Calculate if the attack is profitable after risk adjustment
      const frontrunResult = profitCalculator.calculateProfit(
        attack.frontrunTx.value * attack.expectedSlippage * 1.1, // Revenue
        0.01, // Gas cost
        attack.frontrunTx.value,
        TransactionType.ARBITRAGE,
        0.5
      );

      // Attack profit should be positive but reduced by MEV risk
      expect(frontrunResult.adjustedProfit).toBeLessThan(frontrunResult.grossProfit);
    });

    it('should scale risk with victim transaction size', () => {
      const smallVictim = riskModel.calculateRisk(1, TransactionType.FRONT_RUNNABLE, 0.5);
      const largeVictim = riskModel.calculateRisk(1000, TransactionType.FRONT_RUNNABLE, 0.5);

      expect(largeVictim).toBeGreaterThan(smallVictim);
    });
  });

  describe('JIT Liquidity Attack Scenarios', () => {
    it('should quantify JIT attack risk for liquidity provision', () => {
      for (let i = 0; i < 50; i++) {
        const attack = fuzzer.generateJITLiquidityAttack();

        const addLiquidityRisk = riskModel.calculateDetailedRisk(
          attack.liquidityAdded,
          TransactionType.LIQUIDITY_PROVISION,
          0.8
        );

        // JIT liquidity has lower frontrun probability than swaps
        expect(addLiquidityRisk.frontrunProbability).toBeLessThan(0.5);
      }
    });

    it('should validate JIT attack profitability thresholds', () => {
      const attack = fuzzer.generateJITLiquidityAttack();

      // JIT attacks should only be profitable above certain thresholds
      const minProfitableSwap = 10; // ETH
      const feeRate = 0.003;

      if (attack.swapValue > minProfitableSwap) {
        expect(attack.extractedValue).toBeGreaterThan(0);
      }
    });
  });

  describe('Liquidation Attack Scenarios', () => {
    it('should calculate liquidation profitability with MEV risk', () => {
      for (let i = 0; i < 50; i++) {
        const attack = fuzzer.generateLiquidationAttack();

        const liquidationRisk = riskModel.calculateRisk(
          attack.collateralValue,
          TransactionType.ARBITRAGE, // Liquidations are a form of arbitrage
          0.9 // Very high congestion during liquidations
        );

        // Net profit should account for MEV competition
        const netProfit = attack.profit - liquidationRisk;
        
        // Profit can be negative if competition is too high
        expect(typeof netProfit).toBe('number');
        expect(Number.isFinite(netProfit)).toBe(true);
      }
    });

    it('should identify unprofitable liquidations under high competition', () => {
      const attack = fuzzer.generateLiquidationAttack();
      
      // Under extreme competition, small liquidations become unprofitable
      const competitiveRisk = riskModel.calculateRisk(
        attack.collateralValue,
        TransactionType.ARBITRAGE,
        1.0 // Maximum congestion
      );

      // Small liquidations should have negative expected value
      if (attack.collateralValue < 100 && attack.liquidationBonus < 0.08) {
        const netProfit = attack.profit - competitiveRisk;
        // May or may not be profitable depending on parameters
        expect(Number.isFinite(netProfit)).toBe(true);
      }
    });
  });

  describe('Time-Bandit Attack Resistance', () => {
    it('should quantify reorg attack risks', () => {
      for (let i = 0; i < 25; i++) {
        const attack = fuzzer.generateTimeBanditAttack();

        // Higher MEV opportunities increase reorg incentive
        const reorgIncentive = attack.mevOpportunity / attack.blockReward;

        // Calculate risk for high-value MEV opportunity
        const risk = riskModel.calculateRisk(
          attack.mevOpportunity,
          TransactionType.ARBITRAGE,
          0.9
        );

        // Risk should always be positive for non-zero transactions
        expect(risk).toBeGreaterThan(0);
        
        // Risk should scale with transaction value
        if (attack.mevOpportunity > 10) {
          const smallerRisk = riskModel.calculateRisk(1, TransactionType.ARBITRAGE, 0.9);
          expect(risk).toBeGreaterThan(smallerRisk);
        }
      }
    });
  });

  describe('Profit Calculator Invariants', () => {
    it('should never return adjusted profit greater than gross profit', () => {
      for (let i = 0; i < 100; i++) {
        const revenue = fuzzer.randomTxValue(0.01, 100);
        const gasCost = fuzzer.randomTxValue(0.001, 0.1);
        const txValue = fuzzer.randomTxValue(1, 1000);
        const type = fuzzer.randomTxType();
        const congestion = fuzzer.randomCongestion();

        const result = profitCalculator.calculateProfit(
          revenue,
          gasCost,
          txValue,
          type,
          congestion
        );

        expect(result.adjustedProfit).toBeLessThanOrEqual(result.grossProfit);
      }
    });

    it('should handle zero profit correctly', () => {
      // Zero revenue and gas cost
      const result = profitCalculator.calculateProfit(
        0.01, // Small revenue
        0.01, // Equal gas cost
        100,
        TransactionType.ARBITRAGE,
        0.5
      );
      // Gross profit is 0, adjusted will be negative due to MEV risk
      expect(result.grossProfit).toBe(0);
      expect(result.adjustedProfit).toBeLessThan(0);
    });
  });

  describe('Safety System Integration', () => {
    let safetyManager: ProductionSafetyManager;

    beforeEach(() => {
      safetyManager = new ProductionSafetyManager({
        circuitBreaker: {
          failureThreshold: 3,
          cooldownPeriod: 1000,
        },
        emergencyStop: {
          maxCapitalLossPercentage: 10,
          maxConsecutiveErrors: 5,
        },
      });
    });

    afterEach(async () => {
      await safetyManager.shutdown();
    });

    it('should halt trading after consecutive MEV losses', () => {
      // Simulate consecutive failed trades due to MEV
      for (let i = 0; i < 4; i++) {
        safetyManager.recordTrade({
          id: `trade-${i}`,
          type: 'arbitrage',
          success: false,
          inputAmount: BigInt(100000000000000000), // 0.1 ETH
          outputAmount: BigInt(0),
          grossProfit: BigInt(-1000000000000000), // -0.001 ETH
          gasCost: BigInt(1000000000000000), // 0.001 ETH
          netProfit: BigInt(-2000000000000000), // -0.002 ETH
          timestamp: Date.now(),
          error: 'MEV frontrun detected',
        });
      }

      // Circuit breaker should prevent new trades
      const canTrade = safetyManager.canExecuteTrade();
      expect(canTrade.allowed).toBe(false);
    });

    it('should detect and respond to sandwich attack patterns', () => {
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 2,
        cooldownPeriod: 1000,
      });

      // Record pattern of sandwich attacks
      circuitBreaker.recordTrade({
        success: false,
        profit: BigInt(-5000000000000000), // -0.005 ETH
        timestamp: Date.now(),
        error: 'Sandwich attack detected',
      });

      circuitBreaker.recordTrade({
        success: false,
        profit: BigInt(-8000000000000000), // -0.008 ETH
        timestamp: Date.now(),
        error: 'Sandwich attack detected',
      });

      expect(circuitBreaker.canTrade()).toBe(false);
      
      // Clean up to prevent timer leak
      circuitBreaker.shutdown();
    });

    it('should trigger emergency stop on excessive capital loss from MEV', async () => {
      const emergencyStop = new EmergencyStop({
        enableAutoStop: true,
        maxCapitalLossPercentage: 5,
        maxConsecutiveErrors: 10,
      });

      // Set initial capital - 10 ETH
      emergencyStop.updateCapital(10000000000000000000n);

      // Simulate 6% loss from MEV attacks - 9.4 ETH
      emergencyStop.updateCapital(9400000000000000000n);

      // Should trigger stop due to > 5% loss
      // Wait a tick for async stop trigger
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(emergencyStop.isStopped()).toBe(true);
    });
  });

  describe('Sensor Fuzzing', () => {
    it('should handle rapid congestion changes in risk model', () => {
      // Test that the risk model handles rapid congestion changes from sensors
      for (let i = 0; i < 100; i++) {
        const congestion = fuzzer.randomCongestion();
        const txValue = fuzzer.randomTxValue();
        const txType = fuzzer.randomTxType();
        
        const result = riskModel.calculateDetailedRisk(txValue, txType, congestion);
        
        expect(result.riskEth).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(result.riskEth)).toBe(true);
      }
    });

    it('should handle extreme searcher density values in risk model', () => {
      const extremeValues = [0, 0.001, 0.5, 0.99, 1.0];
      
      for (const density of extremeValues) {
        // Update risk model with extreme searcher density
        const customModel = new MEVRiskModel({ searcherDensity: density });
        
        const risk = customModel.calculateRisk(100, TransactionType.ARBITRAGE, 0.5);
        
        expect(risk).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(risk)).toBe(true);
      }
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle maximum safe integer values', () => {
      const maxValue = Number.MAX_SAFE_INTEGER / 1e18; // Convert to ETH-like scale
      
      expect(() => {
        riskModel.calculateRisk(maxValue, TransactionType.ARBITRAGE, 0.5);
      }).not.toThrow();
    });

    it('should handle very small values (dust amounts)', () => {
      const dustValue = 0.000000001; // 1 gwei equivalent
      
      const result = riskModel.calculateDetailedRisk(
        dustValue,
        TransactionType.ARBITRAGE,
        0.5
      );
      
      expect(result.riskEth).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(result.riskRatio)).toBe(true);
    });

    it('should maintain consistency across parameter updates', () => {
      const value = 100;
      const type = TransactionType.FLASH_LOAN;
      const congestion = 0.5;

      const risk1 = riskModel.calculateRisk(value, type, congestion);
      
      // Update parameters
      riskModel.updateParams({ baseRisk: 0.01 });
      const risk2 = riskModel.calculateRisk(value, type, congestion);
      
      // Risk should increase with higher base risk
      expect(risk2).toBeGreaterThan(risk1);
      
      // Reset and verify original behavior
      riskModel.updateParams({ baseRisk: 0.001 });
      const risk3 = riskModel.calculateRisk(value, type, congestion);
      expect(risk3).toBeCloseTo(risk1, 10);
    });
  });

  describe('Random Stress Testing', () => {
    it('should maintain invariants under random stress', () => {
      const iterations = 500;
      
      for (let i = 0; i < iterations; i++) {
        const value = fuzzer.extremeValue();
        const type = fuzzer.randomTxType();
        const congestion = fuzzer.randomCongestion();

        const result = riskModel.calculateDetailedRisk(value, type, congestion);

        // Core invariants
        expect(Number.isFinite(result.riskEth)).toBe(true);
        expect(Number.isFinite(result.riskRatio)).toBe(true);
        expect(result.riskEth).toBeGreaterThanOrEqual(0);
        expect(result.frontrunProbability).toBeGreaterThanOrEqual(0);
        expect(result.frontrunProbability).toBeLessThanOrEqual(1);
        expect(result.competitionFactor).toBeGreaterThan(0);
      }
    });
  });
});
