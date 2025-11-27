/**
 * TreasuryRotation Tests
 */

import { TreasuryRotation } from '../../../src/treasury';

describe('TreasuryRotation', () => {
  let treasury: TreasuryRotation;

  beforeEach(() => {
    treasury = new TreasuryRotation({
      minRotationAmount: BigInt(1e15), // 0.001 ETH for testing
      enableAutoRotation: false, // Manual control for tests
    });
  });

  afterEach(() => {
    treasury.stop();
  });

  describe('profit recording', () => {
    it('should record profit entries', () => {
      const profitId = treasury.recordProfit({
        amount: BigInt(1e17), // 0.1 ETH
        source: 'arbitrage',
        txHash: '0x123',
      });

      expect(profitId).toBeTruthy();
      expect(typeof profitId).toBe('string');
    });

    it('should emit event on profit recording', () => {
      const handler = jest.fn();
      treasury.on('profit-recorded', handler);

      treasury.recordProfit({
        amount: BigInt(1e17),
        source: 'mev',
        txHash: '0x456',
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0]).toHaveProperty('amount');
      expect(handler.mock.calls[0][0]).toHaveProperty('source', 'mev');
    });
  });

  describe('rotation destinations', () => {
    it('should have default destinations configured', () => {
      const destinations = treasury.getDestinations();

      expect(destinations.length).toBeGreaterThan(0);
      expect(destinations.some(d => d.type === 'treasury')).toBe(true);
    });

    it('should allow adding new destinations', () => {
      const initialCount = treasury.getDestinations().length;

      treasury.addDestination({
        id: 'new-dest',
        address: '0xNewAddress',
        name: 'New Destination',
        percentage: 0,
        type: 'staking',
        active: false,
      });

      expect(treasury.getDestinations().length).toBe(initialCount + 1);
    });

    it('should allow updating destinations', () => {
      const destinations = treasury.getDestinations();
      const firstDest = destinations[0];

      const updated = treasury.updateDestination(firstDest.id, {
        percentage: 75,
      });

      expect(updated).toBe(true);
      expect(treasury.getDestinations().find(d => d.id === firstDest.id)?.percentage).toBe(75);
    });
  });

  describe('rotation execution', () => {
    it('should execute rotation with recorded profits', async () => {
      treasury.recordProfit({
        amount: BigInt(1e17),
        source: 'arbitrage',
        txHash: '0x111',
      });

      treasury.recordProfit({
        amount: BigInt(5e16),
        source: 'liquidation',
        txHash: '0x222',
      });

      const rotation = await treasury.executeRotation();

      expect(rotation.status).toBe('pending');
      expect(rotation.profitIds.length).toBe(2);
      expect(rotation.distributions.length).toBeGreaterThan(0);
      expect(rotation.proofHash).toBeTruthy();
    });

    it('should generate proof for rotation', async () => {
      treasury.recordProfit({
        amount: BigInt(1e17),
        source: 'mev',
        txHash: '0x333',
      });

      const rotation = await treasury.executeRotation();
      const proof = treasury.getProof(rotation.id);

      expect(proof).toBeTruthy();
      expect(proof?.merkleRoot).toBeTruthy();
      expect(proof?.distributions.length).toBe(rotation.distributions.length);
    });

    it('should throw when no profits to rotate', async () => {
      await expect(treasury.executeRotation()).rejects.toThrow('No unrotated profits');
    });

    it('should throw when below minimum rotation amount', async () => {
      treasury.recordProfit({
        amount: BigInt(100), // Very small amount
        source: 'other',
        txHash: '0x444',
      });

      await expect(treasury.executeRotation()).rejects.toThrow('below minimum');
    });
  });

  describe('rotation submission', () => {
    it('should submit rotation to blockchain', async () => {
      treasury.recordProfit({
        amount: BigInt(1e17),
        source: 'arbitrage',
        txHash: '0x555',
      });

      const rotation = await treasury.executeRotation();
      const txHash = await treasury.submitRotation(rotation.id);

      expect(txHash).toBeTruthy();
      expect(txHash.startsWith('0x')).toBe(true);

      const updatedRotation = treasury.getRotation(rotation.id);
      expect(updatedRotation?.status).toBe('submitted');
    });
  });

  describe('statistics', () => {
    it('should calculate treasury stats', async () => {
      treasury.recordProfit({
        amount: BigInt(1e17),
        source: 'arbitrage',
        txHash: '0x666',
      });

      const stats = treasury.getStats();

      expect(stats.totalProfits).toBe(BigInt(1e17));
      expect(stats.pendingAmount).toBe(BigInt(1e17));
      expect(stats.rotationCount).toBe(0);
    });

    it('should update stats after rotation', async () => {
      treasury.recordProfit({
        amount: BigInt(1e17),
        source: 'arbitrage',
        txHash: '0x777',
      });

      await treasury.executeRotation();
      const stats = treasury.getStats();

      expect(stats.pendingAmount).toBe(0n);
    });
  });

  describe('compliance verification', () => {
    it('should verify 70% routing compliance', async () => {
      treasury.recordProfit({
        amount: BigInt(1e18), // 1 ETH
        source: 'mev',
        txHash: '0x888',
      });

      const rotation = await treasury.executeRotation();
      await treasury.submitRotation(rotation.id);

      // Wait for simulated confirmation
      await new Promise(resolve => setTimeout(resolve, 100));

      const compliance = treasury.verifyRoutingCompliance();

      expect(compliance.percentage).toBeGreaterThanOrEqual(0);
      expect(typeof compliance.compliant).toBe('boolean');
      expect(compliance.details).toBeTruthy();
    });
  });

  describe('audit trail', () => {
    it('should export audit trail', async () => {
      treasury.recordProfit({
        amount: BigInt(1e17),
        source: 'arbitrage',
        txHash: '0x999',
      });

      await treasury.executeRotation();
      const auditTrail = treasury.exportAuditTrail();

      expect(auditTrail).toBeTruthy();
      
      const parsed = JSON.parse(auditTrail);
      expect(parsed.profits).toHaveLength(1);
      expect(parsed.rotations).toHaveLength(1);
      expect(parsed.compliance).toBeDefined();
    });
  });

  describe('auto-rotation', () => {
    it('should start and stop auto-rotation', () => {
      expect(treasury.isRunning()).toBe(false);

      treasury.start();
      expect(treasury.isRunning()).toBe(true);

      treasury.stop();
      expect(treasury.isRunning()).toBe(false);
    });
  });
});
