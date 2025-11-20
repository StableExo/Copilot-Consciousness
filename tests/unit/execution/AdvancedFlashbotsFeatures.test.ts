/**
 * Tests for Advanced Flashbots Features
 */

import { ethers } from 'ethers';
import { PrivateRPCManager, createFlashbotsProtectConfig } from '../../../src/execution';
import { PrivateRelayType } from '../../../src/execution/types/PrivateRPCTypes';

describe('Advanced Flashbots Features', () => {
  let provider: ethers.providers.JsonRpcProvider;
  let wallet: ethers.Wallet;
  let manager: PrivateRPCManager;

  beforeEach(() => {
    provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
    wallet = ethers.Wallet.createRandom().connect(provider);
    
    manager = new PrivateRPCManager(provider, wallet, {
      relays: [createFlashbotsProtectConfig(1)],
      defaultPrivacyLevel: 'basic' as any,
      enableFallback: false,
    });
  });

  describe('Privacy Hint Recommendations', () => {
    it('should return recommendations for swap with high privacy', () => {
      const rec = manager.getPrivacyHintRecommendations('swap', 'high');

      expect(rec).toBeDefined();
      expect(rec.hints).toEqual(['hash']);
      expect(rec.expectedRefundPercent).toBe(50);
      expect(rec.privacyScore).toBe(90);
      expect(rec.reasoning).toContain('Maximum privacy');
    });

    it('should return recommendations for swap with medium privacy', () => {
      const rec = manager.getPrivacyHintRecommendations('swap', 'medium');

      expect(rec).toBeDefined();
      expect(rec.hints).toContain('hash');
      expect(rec.expectedRefundPercent).toBe(75);
      expect(rec.privacyScore).toBe(60);
    });

    it('should return recommendations for arbitrage with high privacy', () => {
      const rec = manager.getPrivacyHintRecommendations('arbitrage', 'high');

      expect(rec).toBeDefined();
      expect(rec.hints).toEqual(['hash']);
      expect(rec.expectedRefundPercent).toBe(40);
      expect(rec.privacyScore).toBe(95);
    });

    it('should show tradeoff between privacy and refunds', () => {
      const highPrivacy = manager.getPrivacyHintRecommendations('swap', 'high');
      const lowPrivacy = manager.getPrivacyHintRecommendations('swap', 'low');

      expect(highPrivacy.privacyScore).toBeGreaterThan(lowPrivacy.privacyScore);
      expect(highPrivacy.expectedRefundPercent).toBeLessThan(lowPrivacy.expectedRefundPercent);
    });
  });
});
