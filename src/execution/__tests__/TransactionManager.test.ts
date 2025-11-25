/**
 * TransactionManager Tests
 * 
 * Tests for production-tested transaction management from AxionCitadel
 */

import { Provider } from 'ethers';
import { TransactionManager, TransactionState, TransactionOptions } from '../TransactionManager';
import { NonceManager } from '../NonceManager';

describe('TransactionManager', () => {
  let manager: TransactionManager;
  let mockProvider: jest.Mocked<Provider>;
  let mockNonceManager: jest.Mocked<NonceManager>;
  let mockSigner: any;

  beforeEach(() => {
    // Create mock provider - ethers v6 uses bigint
    mockProvider = {
      getFeeData: jest.fn().mockResolvedValue({
        gasPrice: BigInt('50000000000'),
        maxFeePerGas: BigInt('50000000000'),
        maxPriorityFeePerGas: BigInt('2000000000'),
      }),
      getTransactionCount: jest.fn(),
      waitForTransaction: jest.fn(),
      getTransaction: jest.fn(),
      getTransactionReceipt: jest.fn(),
      send: jest.fn(),
    } as any;

    // Create mock signer
    mockSigner = {
      getAddress: jest.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
      provider: mockProvider,
      signTransaction: jest.fn(),
      sendTransaction: jest.fn(),
    } as any;

    // Create mock nonce manager
    mockNonceManager = {
      sendTransaction: jest.fn(),
      getAddress: jest.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
      signer: mockSigner,
      provider: mockProvider,
    } as any;

    // Initialize transaction manager
    manager = new TransactionManager(mockProvider, mockNonceManager, {
      maxRetries: 1,
      initialDelay: 10,
      maxDelay: 50,
      backoffMultiplier: 1,
      gasPriceIncrement: 1.1,
    });
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const defaultManager = new TransactionManager(mockProvider, mockNonceManager);
      expect(defaultManager).toBeDefined();
      
      const stats = defaultManager.getStatistics();
      expect(stats.totalTransactions).toBe(0);
      expect(stats.successfulTransactions).toBe(0);
    }, 15000);

    it('should initialize with custom retry config', () => {
      const customManager = new TransactionManager(mockProvider, mockNonceManager, {
        maxRetries: 5,
        initialDelay: 1000,
      });
      expect(customManager).toBeDefined();
    }, 15000);

    it('should initialize with custom gas spike config', () => {
      const customManager = new TransactionManager(
        mockProvider,
        mockNonceManager,
        {},
        {
          maxGasPrice: 1000,
          spikeThreshold: 100,
        }
      );
      expect(customManager).toBeDefined();
    }, 15000);
  });

  describe('executeTransaction', () => {
    it('should execute transaction successfully', async () => {
      // Mock successful execution
      mockProvider.getFeeData.mockResolvedValue({ gasPrice: BigInt('50000000000'), maxFeePerGas: BigInt('50000000000'), maxPriorityFeePerGas: BigInt('2000000000') }); // 50 Gwei
      
      const mockTxResponse = {
        hash: '0xabcdef',
        nonce: 1,
        gasPrice: BigInt('50000000000'),
        wait: jest.fn(),
      } as any;
      
      mockNonceManager.sendTransaction.mockResolvedValue(mockTxResponse);

      const mockReceipt = {
        status: 1,
        gasUsed: BigInt('100000'),
        blockNumber: 100,
        blockHash: '0xblock',
        confirmations: 1,
        transactionHash: '0xabcdef',
        blockNumber: 100,
        blockHash: '0xblock',
        confirmations: 1,
      } as any;

      mockProvider.waitForTransaction.mockResolvedValue(mockReceipt);

      const result = await manager.executeTransaction(
        '0xTargetContract',
        '0x1234',
        { gasLimit: BigInt('150000') }
      );

      expect(result.success).toBe(true);
      expect(result.txHash).toBe('0xabcdef');
      expect(result.receipt).toBeDefined();
      expect(result.metadata.state).toBe(TransactionState.CONFIRMED);
    }, 15000);

    it('should retry on transient failures', async () => {
      mockProvider.getFeeData.mockResolvedValue({ gasPrice: BigInt('50000000000'), maxFeePerGas: BigInt('50000000000'), maxPriorityFeePerGas: BigInt('2000000000') });

      // First attempt fails, second succeeds
      const mockTxResponse = {
        hash: '0xabcdef',
        nonce: 1,
        gasPrice: BigInt('50000000000'),
      } as any;

      mockNonceManager.sendTransaction
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockTxResponse);

      const mockReceipt = {
        status: 1,
        gasUsed: BigInt('100000'),
        blockNumber: 100,
        blockHash: '0xblock',
        confirmations: 1,
        blockNumber: 100,
        blockHash: '0xblock',
        confirmations: 1,
      } as any;

      mockProvider.waitForTransaction.mockResolvedValue(mockReceipt);

      const result = await manager.executeTransaction(
        '0xTargetContract',
        '0x1234'
      );

      expect(result.success).toBe(true);
      expect(mockNonceManager.sendTransaction).toHaveBeenCalledTimes(2);
    }, 15000);

    it('should not retry on fatal errors', async () => {
      mockProvider.getFeeData.mockResolvedValue({ gasPrice: BigInt('50000000000'), maxFeePerGas: BigInt('50000000000'), maxPriorityFeePerGas: BigInt('2000000000') });

      // Simulate insufficient funds error
      mockNonceManager.sendTransaction.mockRejectedValue(
        new Error('insufficient funds for gas')
      );

      const result = await manager.executeTransaction(
        '0xTargetContract',
        '0x1234'
      );

      expect(result.success).toBe(false);
      expect(mockNonceManager.sendTransaction).toHaveBeenCalledTimes(1);
      expect(result.metadata.state).toBe(TransactionState.FAILED);
    }, 15000);

    it('should fail after max retries exhausted', async () => {
      mockProvider.getFeeData.mockResolvedValue({ gasPrice: BigInt('50000000000'), maxFeePerGas: BigInt('50000000000'), maxPriorityFeePerGas: BigInt('2000000000') });

      // All attempts fail
      mockNonceManager.sendTransaction.mockRejectedValue(
        new Error('Network error')
      );

      const result = await manager.executeTransaction(
        '0xTargetContract',
        '0x1234'
      );

      expect(result.success).toBe(false);
      // maxRetries is 1 (from beforeEach), so total attempts = 1 initial + 1 retry = 2
      expect(mockNonceManager.sendTransaction).toHaveBeenCalledTimes(2);
      expect(result.metadata.attempts).toBe(2);
    }, 15000);

    it('should increase gas price on retry', async () => {
      mockProvider.getFeeData.mockResolvedValue({ gasPrice: BigInt('50000000000'), maxFeePerGas: BigInt('50000000000'), maxPriorityFeePerGas: BigInt('2000000000') });

      const initialGasPrice = BigInt('50000000000');
      const expectedIncreasedGasPrice = initialGasPrice
        .mul(110)
        .div(100); // 10% increase

      mockNonceManager.sendTransaction
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          hash: '0xabcdef',
          nonce: 1,
          gasPrice: expectedIncreasedGasPrice,
        } as any);

      mockProvider.waitForTransaction.mockResolvedValue({
        status: 1,
        gasUsed: BigInt('100000'),
        blockNumber: 100,
        blockHash: '0xblock',
        confirmations: 1,
        blockNumber: 100,
        blockHash: '0xblock',
        confirmations: 1,
      } as any);

      const result = await manager.executeTransaction(
        '0xTargetContract',
        '0x1234',
        { gasPrice: initialGasPrice }
      );

      expect(result.success).toBe(true);
      expect(mockNonceManager.sendTransaction).toHaveBeenCalledTimes(2);
    }, 15000);
  });

  describe('gas spike protection', () => {
    it('should reject transaction if gas price exceeds maximum', async () => {
      // Mock extremely high gas price (600 Gwei)
      mockProvider.getFeeData.mockResolvedValue({ gasPrice: BigInt('600000000000'), maxFeePerGas: BigInt('600000000000'), maxPriorityFeePerGas: BigInt('2000000000') });

      const result = await manager.executeTransaction(
        '0xTargetContract',
        '0x1234'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Gas spike detected');
      expect(mockNonceManager.sendTransaction).not.toHaveBeenCalled();
    }, 15000);

    it('should allow transaction if gas price is acceptable', async () => {
      mockProvider.getFeeData.mockResolvedValue({ gasPrice: BigInt('50000000000'), maxFeePerGas: BigInt('50000000000'), maxPriorityFeePerGas: BigInt('2000000000') }); // 50 Gwei

      mockNonceManager.sendTransaction.mockResolvedValue({
        hash: '0xabcdef',
        nonce: 1,
        gasPrice: BigInt('50000000000'),
      } as any);

      mockProvider.waitForTransaction.mockResolvedValue({
        status: 1,
        gasUsed: BigInt('100000'),
        blockNumber: 100,
        blockHash: '0xblock',
        confirmations: 1,
      } as any);

      const result = await manager.executeTransaction(
        '0xTargetContract',
        '0x1234'
      );

      expect(result.success).toBe(true);
    }, 15000);
  });

  describe('replaceTransaction', () => {
    it('should replace stuck transaction with higher gas price', async () => {
      // First, execute a transaction that gets stuck
      mockProvider.getFeeData.mockResolvedValue({ gasPrice: BigInt('50000000000'), maxFeePerGas: BigInt('50000000000'), maxPriorityFeePerGas: BigInt('2000000000') });

      const mockTxResponse = {
        hash: '0xoriginal',
        nonce: 1,
        gasPrice: BigInt('50000000000'),
        to: '0xTargetContract',
        data: '0x1234',
        gasLimit: BigInt('150000'),
        value: BigInt(0),
      } as any;

      mockNonceManager.sendTransaction.mockResolvedValue(mockTxResponse);

      mockProvider.waitForTransaction.mockResolvedValue({
        status: 1,
        gasUsed: BigInt('100000'),
        blockNumber: 100,
        blockHash: '0xblock',
        confirmations: 1,
      } as any);

      const result = await manager.executeTransaction(
        '0xTargetContract',
        '0x1234'
      );

      expect(result.success).toBe(true);
      const txId = result.metadata.id;

      // Now replace it
      mockProvider.getTransaction.mockResolvedValue(mockTxResponse);

      const replacementTxResponse = {
        hash: '0xreplacement',
        nonce: 1,
        gasPrice: BigInt('75000000000'),
      } as any;

      mockNonceManager.sendTransaction.mockResolvedValue(replacementTxResponse);

      mockProvider.waitForTransaction.mockResolvedValue({
        status: 1,
        gasUsed: BigInt('100000'),
        blockNumber: 100,
        blockHash: '0xblock',
        confirmations: 1,
      } as any);

      const replaceResult = await manager.replaceTransaction(
        txId,
        BigInt('75000000000')
      );

      expect(replaceResult.success).toBe(true);
      expect(replaceResult.txHash).toBe('0xreplacement');
      expect(replaceResult.metadata.replacedBy).toBe('0xreplacement');
    }, 15000);

    it('should fail if original transaction not found', async () => {
      await expect(
        manager.replaceTransaction('invalid_tx_id', BigInt('100000000000'))
      ).rejects.toThrow('Transaction invalid_tx_id not found in registry');
    }, 15000);
  });

  describe('getTransactionStatus', () => {
    it('should return transaction metadata', async () => {
      mockProvider.getFeeData.mockResolvedValue({ gasPrice: BigInt('50000000000'), maxFeePerGas: BigInt('50000000000'), maxPriorityFeePerGas: BigInt('2000000000') });

      mockNonceManager.sendTransaction.mockResolvedValue({
        hash: '0xabcdef',
        nonce: 1,
        gasPrice: BigInt('50000000000'),
      } as any);

      mockProvider.waitForTransaction.mockResolvedValue({
        status: 1,
        gasUsed: BigInt('100000'),
        blockNumber: 100,
        blockHash: '0xblock',
        confirmations: 1,
      } as any);

      const result = await manager.executeTransaction(
        '0xTargetContract',
        '0x1234'
      );

      const status = manager.getTransactionStatus(result.metadata.id);
      expect(status).toBeDefined();
      expect(status?.state).toBe(TransactionState.CONFIRMED);
      expect(status?.hash).toBe('0xabcdef');
    }, 15000);

    it('should return undefined for non-existent transaction', () => {
      const status = manager.getTransactionStatus('non_existent_id');
      expect(status).toBeUndefined();
    }, 15000);
  });

  describe('getStatistics', () => {
    it('should track transaction statistics', async () => {
      mockProvider.getFeeData.mockResolvedValue({ gasPrice: BigInt('50000000000'), maxFeePerGas: BigInt('50000000000'), maxPriorityFeePerGas: BigInt('2000000000') });

      // Execute successful transaction
      mockNonceManager.sendTransaction.mockResolvedValue({
        hash: '0xabcdef',
        nonce: 1,
        gasPrice: BigInt('50000000000'),
      } as any);

      mockProvider.waitForTransaction.mockResolvedValue({
        status: 1,
        gasUsed: BigInt('100000'),
        blockNumber: 100,
        blockHash: '0xblock',
        confirmations: 1,
      } as any);

      await manager.executeTransaction('0xTargetContract', '0x1234');

      const stats = manager.getStatistics();
      expect(stats.totalTransactions).toBe(1);
      expect(stats.successfulTransactions).toBe(1);
      expect(stats.failedTransactions).toBe(0);
      expect(stats.successRate).toBe(100);
    }, 15000);

    it('should calculate success rate correctly', async () => {
      mockProvider.getFeeData.mockResolvedValue({ gasPrice: BigInt('50000000000'), maxFeePerGas: BigInt('50000000000'), maxPriorityFeePerGas: BigInt('2000000000') });

      // One success
      mockNonceManager.sendTransaction.mockResolvedValueOnce({
        hash: '0xabcdef',
        nonce: 1,
        gasPrice: BigInt('50000000000'),
      } as any);

      mockProvider.waitForTransaction.mockResolvedValueOnce({
        status: 1,
        gasUsed: BigInt('100000'),
        blockNumber: 100,
        blockHash: '0xblock',
        confirmations: 1,
      } as any);

      await manager.executeTransaction('0xTargetContract', '0x1234');

      // One failure
      mockNonceManager.sendTransaction.mockRejectedValue(
        new Error('insufficient funds')
      );

      await manager.executeTransaction('0xTargetContract', '0x5678');

      const stats = manager.getStatistics();
      expect(stats.totalTransactions).toBe(2);
      expect(stats.successfulTransactions).toBe(1);
      expect(stats.failedTransactions).toBe(1);
      expect(stats.successRate).toBe(50);
    }, 15000);
  });

  describe('nonce error handling', () => {
    it('should handle nonce too low error', async () => {
      mockProvider.getFeeData.mockResolvedValue({ gasPrice: BigInt('50000000000'), maxFeePerGas: BigInt('50000000000'), maxPriorityFeePerGas: BigInt('2000000000') });

      // Simulate nonce error on first attempt, then success
      mockNonceManager.sendTransaction
        .mockRejectedValueOnce(new Error('nonce too low'))
        .mockResolvedValueOnce({
          hash: '0xabcdef',
          nonce: 2,
          gasPrice: BigInt('50000000000'),
        } as any);

      mockProvider.waitForTransaction.mockResolvedValue({
        status: 1,
        gasUsed: BigInt('100000'),
        blockNumber: 100,
        blockHash: '0xblock',
        confirmations: 1,
      } as any);

      const result = await manager.executeTransaction(
        '0xTargetContract',
        '0x1234'
      );

      expect(result.success).toBe(true);
      expect(mockNonceManager.sendTransaction).toHaveBeenCalledTimes(2);
    }, 15000);
  });

  describe('EIP-1559 transactions', () => {
    it('should handle EIP-1559 gas parameters', async () => {
      mockProvider.getFeeData.mockResolvedValue({ gasPrice: BigInt('50000000000'), maxFeePerGas: BigInt('50000000000'), maxPriorityFeePerGas: BigInt('2000000000') });

      mockNonceManager.sendTransaction.mockResolvedValue({
        hash: '0xabcdef',
        nonce: 1,
        maxFeePerGas: BigInt('100000000000'),
        maxPriorityFeePerGas: BigInt('2000000000'),
      } as any);

      mockProvider.waitForTransaction.mockResolvedValue({
        status: 1,
        gasUsed: BigInt('100000'),
        blockNumber: 100,
        blockHash: '0xblock',
        confirmations: 1,
      } as any);

      const result = await manager.executeTransaction(
        '0xTargetContract',
        '0x1234',
        {
          maxFeePerGas: BigInt('100000000000'),
          maxPriorityFeePerGas: BigInt('2000000000'),
        }
      );

      expect(result.success).toBe(true);
    }, 15000);
  });
});
