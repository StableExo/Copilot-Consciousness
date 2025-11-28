/**
 * Tests for Viem Contract Utilities
 */

import { ERC20_ABI } from '../contracts';

describe('Viem Contract Utilities', () => {
  describe('ERC20_ABI', () => {
    it('should contain balanceOf function', () => {
      const balanceOf = ERC20_ABI.find((item) => item.name === 'balanceOf');
      expect(balanceOf).toBeDefined();
      expect(balanceOf?.type).toBe('function');
      expect(balanceOf?.inputs).toHaveLength(1);
    });

    it('should contain decimals function', () => {
      const decimals = ERC20_ABI.find((item) => item.name === 'decimals');
      expect(decimals).toBeDefined();
      expect(decimals?.type).toBe('function');
    });

    it('should contain symbol function', () => {
      const symbol = ERC20_ABI.find((item) => item.name === 'symbol');
      expect(symbol).toBeDefined();
      expect(symbol?.type).toBe('function');
    });

    it('should contain approve function', () => {
      const approve = ERC20_ABI.find((item) => item.name === 'approve');
      expect(approve).toBeDefined();
      expect(approve?.type).toBe('function');
      expect(approve?.inputs).toHaveLength(2);
    });

    it('should contain transfer function', () => {
      const transfer = ERC20_ABI.find((item) => item.name === 'transfer');
      expect(transfer).toBeDefined();
      expect(transfer?.type).toBe('function');
      expect(transfer?.inputs).toHaveLength(2);
    });

    it('should contain transferFrom function', () => {
      const transferFrom = ERC20_ABI.find((item) => item.name === 'transferFrom');
      expect(transferFrom).toBeDefined();
      expect(transferFrom?.type).toBe('function');
      expect(transferFrom?.inputs).toHaveLength(3);
    });

    it('should contain allowance function', () => {
      const allowance = ERC20_ABI.find((item) => item.name === 'allowance');
      expect(allowance).toBeDefined();
      expect(allowance?.type).toBe('function');
      expect(allowance?.inputs).toHaveLength(2);
    });

    it('should contain totalSupply function', () => {
      const totalSupply = ERC20_ABI.find((item) => item.name === 'totalSupply');
      expect(totalSupply).toBeDefined();
      expect(totalSupply?.type).toBe('function');
    });
  });
});
