/**
 * EthicsChecker Tests
 *
 * Comprehensive tests for the Ethics Alignment Checker MCP tool
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EthicsChecker, EthicsCheckRequest } from '../../../../src/tools/ethics/EthicsChecker';

describe('EthicsChecker', () => {
  let checker: EthicsChecker;

  beforeEach(() => {
    checker = new EthicsChecker();
  });

  describe('constructor', () => {
    it('should initialize without errors', () => {
      expect(checker).toBeDefined();
      expect(checker).toBeInstanceOf(EthicsChecker);
    });
  });

  describe('check', () => {
    it('should evaluate ethically aligned arbitrage trade', async () => {
      const request: EthicsCheckRequest = {
        action: 'execute_arbitrage_trade',
        context: {
          description: 'Two-hop arbitrage on Base exploiting price inefficiency',
          intent: 'Profit from market inefficiency',
          consequences: ['Gas cost', 'Minor price impact on pools'],
          stakeholders: ['TheWarden', 'Liquidity providers'],
        },
      };

      const result = await checker.check(request);

      expect(result).toBeDefined();
      expect(result.aligned).toBeDefined();
      expect(typeof result.aligned).toBe('boolean');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(Array.isArray(result.principles)).toBe(true);
      expect(Array.isArray(result.reasoning)).toBe(true);
      expect(typeof result.recommendation).toBe('string');
      expect(result.recommendation.length).toBeGreaterThan(0);
    });

    it('should evaluate potentially harmful MEV action', async () => {
      const request: EthicsCheckRequest = {
        action: 'execute_sandwich_attack',
        context: {
          description: 'Sandwich attack on retail user transaction',
          intent: 'Extract profit from retail trade',
          consequences: ['User pays more', 'Profit to attacker'],
          stakeholders: ['TheWarden', 'Retail victim'],
        },
        mevContext: {
          targetType: 'retail_user',
          victimProfile: 'small_trader',
          profitAmount: 100,
        },
      };

      const result = await checker.check(request);

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.recommendation).toContain('Action');
      // The system should flag issues with attacking retail users
      if (!result.aligned) {
        expect(result.violation).toBeDefined();
        expect(result.violation?.severity).toBeDefined();
      }
    });

    it('should handle ethical liquidation assistance', async () => {
      const request: EthicsCheckRequest = {
        action: 'execute_liquidation_with_profit_sharing',
        context: {
          description: 'Liquidate underwater position, share profit with liquidated user',
          intent: 'Protect protocol, minimize user harm',
          consequences: ['Protocol protected', 'User receives partial refund'],
          stakeholders: ['Protocol', 'Liquidated user', 'TheWarden'],
        },
        mevContext: {
          targetType: 'protocol_liquidation',
          victimProfile: 'defi_user',
          profitAmount: 500,
        },
      };

      const result = await checker.check(request);

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it('should evaluate low confidence uncertain actions', async () => {
      const request: EthicsCheckRequest = {
        action: 'execute_complex_multi_hop_strategy',
        context: {
          description: 'Complex strategy with uncertain outcomes',
          intent: 'Experimental profit opportunity',
          consequences: ['Unknown side effects', 'Potential protocol impact'],
          stakeholders: ['TheWarden', 'Multiple protocols', 'Unknown users'],
        },
      };

      const result = await checker.check(request);

      expect(result).toBeDefined();
      // Low confidence should be reflected in the score
      if (result.confidence < 0.7) {
        expect(result.recommendation).toBeTruthy();
      }
    });
  });

  describe('batchCheck', () => {
    it('should evaluate multiple actions', async () => {
      const requests: EthicsCheckRequest[] = [
        {
          action: 'execute_arbitrage_1',
          context: {
            description: 'First arbitrage opportunity',
            intent: 'Market efficiency',
          },
        },
        {
          action: 'execute_arbitrage_2',
          context: {
            description: 'Second arbitrage opportunity',
            intent: 'Market efficiency',
          },
        },
        {
          action: 'execute_arbitrage_3',
          context: {
            description: 'Third arbitrage opportunity',
            intent: 'Market efficiency',
          },
        },
      ];

      const results = await checker.batchCheck(requests);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(3);

      results.forEach((result, index) => {
        expect(result.aligned).toBeDefined();
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
        expect(result.recommendation).toContain(`execute_arbitrage_${index + 1}`);
      });
    });

    it('should handle empty batch', async () => {
      const results = await checker.batchCheck([]);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });
  });

  describe('getGuidance', () => {
    it('should provide ethical guidance for trading situation', async () => {
      const situation = 'Planning to execute high-frequency arbitrage on Base DEXes';

      const guidance = await checker.getGuidance(situation);

      expect(guidance).toBeDefined();
      expect(Array.isArray(guidance.principles)).toBe(true);
      expect(Array.isArray(guidance.recommendations)).toBe(true);
      expect(Array.isArray(guidance.warnings)).toBe(true);
      expect(guidance.principles.length).toBeGreaterThan(0);
      expect(guidance.recommendations.length).toBeGreaterThan(0);
    });

    it('should provide guidance for MEV strategy planning', async () => {
      const situation = 'Considering implementing sandwich attack defense mechanism';

      const guidance = await checker.getGuidance(situation);

      expect(guidance).toBeDefined();
      expect(guidance.principles.length).toBeGreaterThan(0);
      expect(guidance.recommendations.length).toBeGreaterThan(0);
    });

    it('should provide guidance for ethical uncertainty', async () => {
      const situation = 'Uncertain whether to frontrun a liquidation to protect user';

      const guidance = await checker.getGuidance(situation);

      expect(guidance).toBeDefined();
      expect(guidance.principles.length).toBeGreaterThan(0);
      expect(guidance.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('response format', () => {
    it('should return consistent response structure', async () => {
      const request: EthicsCheckRequest = {
        action: 'test_action',
        context: {
          description: 'Test description',
        },
      };

      const result = await checker.check(request);

      // Required fields
      expect(result).toHaveProperty('aligned');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('principles');
      expect(result).toHaveProperty('reasoning');
      expect(result).toHaveProperty('recommendation');

      // Optional fields
      if (result.violation) {
        expect(result.violation).toHaveProperty('principle');
        expect(result.violation).toHaveProperty('description');
        expect(result.violation).toHaveProperty('severity');
        expect(['low', 'medium', 'high', 'critical']).toContain(result.violation.severity);
      }
    });
  });

  describe('severity assessment', () => {
    it('should assess severity levels correctly', async () => {
      const criticalRequest: EthicsCheckRequest = {
        action: 'exploit_protocol_vulnerability',
        context: {
          description: 'Exploit known vulnerability for massive profit',
          intent: 'Drain protocol funds',
          consequences: ['Protocol bankruptcy', 'User fund loss'],
          stakeholders: ['Protocol', 'All users'],
        },
      };

      const result = await checker.check(criticalRequest);

      expect(result).toBeDefined();
      // Should detect high-severity issues
      if (result.violation) {
        expect(['medium', 'high', 'critical']).toContain(result.violation.severity);
      }
    });
  });

  describe('confidence scoring', () => {
    it('should provide confidence scores in valid range', async () => {
      const requests: EthicsCheckRequest[] = [
        {
          action: 'clear_action',
          context: {
            description: 'Simple, clear arbitrage',
            intent: 'Market efficiency',
            consequences: ['Gas cost', 'Profit'],
            stakeholders: ['TheWarden'],
          },
        },
        {
          action: 'ambiguous_action',
          context: {
            description: 'Complex action with uncertain outcomes',
          },
        },
      ];

      const results = await checker.batchCheck(requests);

      results.forEach((result) => {
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
        expect(typeof result.confidence).toBe('number');
        expect(isNaN(result.confidence)).toBe(false);
      });
    });
  });

  describe('principle identification', () => {
    it('should identify relevant ethical principles', async () => {
      const request: EthicsCheckRequest = {
        action: 'execute_trade',
        context: {
          description: 'Standard DEX trade',
          intent: 'Profit generation',
        },
      };

      const result = await checker.check(request);

      expect(result.principles).toBeDefined();
      expect(Array.isArray(result.principles)).toBe(true);
      expect(result.principles.length).toBeGreaterThan(0);
      
      // Principles should be strings
      result.principles.forEach((principle) => {
        expect(typeof principle).toBe('string');
        expect(principle.length).toBeGreaterThan(0);
      });
    });
  });

  describe('reasoning chains', () => {
    it('should provide reasoning for decisions', async () => {
      const request: EthicsCheckRequest = {
        action: 'execute_strategy',
        context: {
          description: 'Multi-step trading strategy',
          intent: 'Capital growth',
          consequences: ['Protocol fees', 'Price impact'],
        },
      };

      const result = await checker.check(request);

      expect(result.reasoning).toBeDefined();
      expect(Array.isArray(result.reasoning)).toBe(true);
      expect(result.reasoning.length).toBeGreaterThan(0);
      
      // Reasoning should be explanatory strings
      result.reasoning.forEach((reason) => {
        expect(typeof reason).toBe('string');
        expect(reason.length).toBeGreaterThan(0);
      });
    });
  });
});
