/**
 * Tests for NonceManager
 */

import { Wallet, JsonRpcProvider, parseEther } from 'ethers';
import { NonceManager, NonceError } from '../NonceManager';

describe('NonceManager', () => {
  let provider: JsonRpcProvider;
  let wallet: Wallet;
  let _nonceManager: NonceManager;

  beforeEach(async () => {
    // Create a mock provider
    provider = new JsonRpcProvider('http://localhost:8545');

    // Create a wallet with the provider
    wallet = Wallet.createRandom().connect(provider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor and create', () => {
    it('should throw error if signer is invalid', () => {
      expect(() => new NonceManager(null as any)).toThrow(
        'NonceManager requires a valid Ethers Signer instance with a provider.'
      );
    });

    it('should throw error if signer has no provider', () => {
      const walletWithoutProvider = Wallet.createRandom();
      expect(() => new NonceManager(walletWithoutProvider)).toThrow(
        'NonceManager requires a valid Ethers Signer instance with a provider.'
      );
    });

    it('should create NonceManager instance with valid signer', () => {
      const manager = new NonceManager(wallet);
      expect(manager).toBeInstanceOf(NonceManager);
      expect(manager.signer).toBe(wallet);
      expect(manager.provider).toBe(provider);
    });

    it('should initialize address via create factory method', async () => {
      const manager = await NonceManager.create(wallet);
      expect(manager.address).toBe(await wallet.getAddress());
    });
  });

  describe('getAddress', () => {
    it('should return the wallet address', async () => {
      const manager = await NonceManager.create(wallet);
      const address = await manager.getAddress();
      expect(address).toBe(await wallet.getAddress());
    });
  });

  describe('connect', () => {
    it('should create a new NonceManager with new provider', async () => {
      const manager = await NonceManager.create(wallet);
      const newProvider = new JsonRpcProvider('http://localhost:8546');
      const newManager = manager.connect(newProvider);

      expect(newManager).toBeInstanceOf(NonceManager);
      expect(newManager.provider).toBe(newProvider);
      expect(newManager.address).toBe(manager.address);
      expect(newManager).not.toBe(manager);
    });
  });

  describe('signMessage', () => {
    it('should delegate signMessage to underlying signer', async () => {
      const manager = await NonceManager.create(wallet);
      const message = 'Hello, world!';

      const signatureSpy = jest.spyOn(wallet, 'signMessage');
      await manager.signMessage(message);

      expect(signatureSpy).toHaveBeenCalledWith(message);
    });
  });

  describe('signTransaction', () => {
    it('should delegate signTransaction to underlying signer', async () => {
      const manager = await NonceManager.create(wallet);
      const tx = { to: '0x' + '0'.repeat(40), value: parseEther('1.0') };

      const signTxSpy = jest.spyOn(wallet, 'signTransaction');
      await manager.signTransaction(tx);

      expect(signTxSpy).toHaveBeenCalledWith(tx);
    });

    it('should throw error if signTransaction is not supported', async () => {
      const manager = await NonceManager.create(wallet);

      // Temporarily remove signTransaction from the underlying signer
      const originalSignTransaction = wallet.signTransaction;
      (wallet as any).signTransaction = undefined;

      await expect(manager.signTransaction({})).rejects.toThrow(
        'signTransaction is not supported by the parent signer'
      );

      // Restore the method
      wallet.signTransaction = originalSignTransaction;
    });
  });

  describe('initialize', () => {
    it('should initialize nonce from provider', async () => {
      const manager = await NonceManager.create(wallet);
      const mockNonce = 5;

      jest.spyOn(provider, 'getTransactionCount').mockResolvedValue(mockNonce);

      await manager.initialize();
      expect(provider.getTransactionCount).toHaveBeenCalledWith(manager.address, 'latest');
    });

    it('should throw NonceError if initialization fails', async () => {
      const manager = await NonceManager.create(wallet);

      jest.spyOn(provider, 'getTransactionCount').mockRejectedValue(new Error('Network error'));

      await expect(manager.initialize()).rejects.toThrow(NonceError);
      await expect(manager.initialize()).rejects.toThrow('Nonce initialization failed');
    });
  });

  describe('getNextNonce', () => {
    it('should initialize nonce on first call', async () => {
      const manager = await NonceManager.create(wallet);
      const mockLatestNonce = 10;
      const mockPendingNonce = 10;

      jest
        .spyOn(provider, 'getTransactionCount')
        .mockResolvedValueOnce(mockLatestNonce) // for initialize
        .mockResolvedValueOnce(mockPendingNonce); // for getNextNonce

      const nonce = await manager.getNextNonce();

      expect(nonce).toBe(mockLatestNonce);
      expect(provider.getTransactionCount).toHaveBeenCalledWith(manager.address, 'latest');
      expect(provider.getTransactionCount).toHaveBeenCalledWith(manager.address, 'pending');
    });

    it('should increment nonce on subsequent calls', async () => {
      const manager = await NonceManager.create(wallet);
      const mockLatestNonce = 10;

      jest
        .spyOn(provider, 'getTransactionCount')
        .mockResolvedValueOnce(mockLatestNonce) // initialize
        .mockResolvedValueOnce(mockLatestNonce) // first getNextNonce - pending
        .mockResolvedValueOnce(mockLatestNonce + 1); // second getNextNonce - pending

      const nonce1 = await manager.getNextNonce();
      const nonce2 = await manager.getNextNonce();

      expect(nonce1).toBe(10);
      expect(nonce2).toBe(11);
    });

    it('should sync with higher pending nonce', async () => {
      const manager = await NonceManager.create(wallet);
      const mockLatestNonce = 10;
      const mockPendingNonce = 15;

      jest
        .spyOn(provider, 'getTransactionCount')
        .mockResolvedValueOnce(mockLatestNonce) // initialize
        .mockResolvedValueOnce(mockPendingNonce); // pending is higher

      const nonce = await manager.getNextNonce();

      expect(nonce).toBe(mockPendingNonce);
    });

    it('should throw NonceError if fetching pending nonce fails', async () => {
      const manager = await NonceManager.create(wallet);

      jest
        .spyOn(provider, 'getTransactionCount')
        .mockResolvedValueOnce(10) // initialize succeeds
        .mockRejectedValueOnce(new Error('Network error')); // pending fails

      await expect(manager.getNextNonce()).rejects.toThrow(NonceError);
      await expect(manager.getNextNonce()).rejects.toThrow('Failed to fetch pending nonce');
    });

    it('should be thread-safe with concurrent calls', async () => {
      const manager = await NonceManager.create(wallet);
      const mockLatestNonce = 10;

      // Mock to return consistent values
      jest.spyOn(provider, 'getTransactionCount').mockResolvedValue(mockLatestNonce);

      // Make concurrent calls
      const promises = [manager.getNextNonce(), manager.getNextNonce(), manager.getNextNonce()];

      const nonces = await Promise.all(promises);

      // Nonces should be sequential and unique
      expect(nonces).toEqual([10, 11, 12]);
    });
  });

  describe('sendTransaction', () => {
    it('should populate transaction with nonce and send', async () => {
      const manager = await NonceManager.create(wallet);
      const mockLatestNonce = 5;
      const mockTxResponse = {
        hash: '0x123',
        wait: jest.fn(),
      } as any;

      jest.spyOn(provider, 'getTransactionCount').mockResolvedValue(mockLatestNonce);
      jest
        .spyOn(provider, 'getNetwork')
        .mockResolvedValue({ chainId: 1, name: 'homestead' } as any);
      jest.spyOn(wallet, 'sendTransaction').mockResolvedValue(mockTxResponse);

      const tx = { to: '0x' + '0'.repeat(40), value: parseEther('1.0') };
      const response = await manager.sendTransaction(tx);

      expect(response).toBe(mockTxResponse);
      expect(wallet.sendTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          ...tx,
          nonce: mockLatestNonce,
          chainId: 1,
        })
      );
    });

    it('should trigger resync on nonce error with NONCE_EXPIRED code', async () => {
      const manager = await NonceManager.create(wallet);
      const mockLatestNonce = 5;

      jest.spyOn(provider, 'getTransactionCount').mockResolvedValue(mockLatestNonce);
      jest
        .spyOn(provider, 'getNetwork')
        .mockResolvedValue({ chainId: 1, name: 'homestead' } as any);

      const nonceError = new Error('nonce expired');
      (nonceError as any).code = 'NONCE_EXPIRED';
      jest.spyOn(wallet, 'sendTransaction').mockRejectedValue(nonceError);

      const resyncSpy = jest.spyOn(manager, 'resyncNonce').mockResolvedValue();

      const tx = { to: '0x' + '0'.repeat(40), value: parseEther('1.0') };

      await expect(manager.sendTransaction(tx)).rejects.toThrow('nonce expired');

      // Wait for background resync
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(resyncSpy).toHaveBeenCalled();
    });

    it('should trigger resync on "nonce too low" error message', async () => {
      const manager = await NonceManager.create(wallet);
      const mockLatestNonce = 5;

      jest.spyOn(provider, 'getTransactionCount').mockResolvedValue(mockLatestNonce);
      jest
        .spyOn(provider, 'getNetwork')
        .mockResolvedValue({ chainId: 1, name: 'homestead' } as any);

      const nonceError = new Error('nonce too low');
      jest.spyOn(wallet, 'sendTransaction').mockRejectedValue(nonceError);

      const resyncSpy = jest.spyOn(manager, 'resyncNonce').mockResolvedValue();

      const tx = { to: '0x' + '0'.repeat(40), value: parseEther('1.0') };

      await expect(manager.sendTransaction(tx)).rejects.toThrow('nonce too low');

      // Wait for background resync
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(resyncSpy).toHaveBeenCalled();
    });

    it('should not trigger resync on other errors', async () => {
      const manager = await NonceManager.create(wallet);
      const mockLatestNonce = 5;

      jest.spyOn(provider, 'getTransactionCount').mockResolvedValue(mockLatestNonce);
      jest
        .spyOn(provider, 'getNetwork')
        .mockResolvedValue({ chainId: 1, name: 'homestead' } as any);

      const otherError = new Error('insufficient funds');
      jest.spyOn(wallet, 'sendTransaction').mockRejectedValue(otherError);

      const resyncSpy = jest.spyOn(manager, 'resyncNonce');

      const tx = { to: '0x' + '0'.repeat(40), value: parseEther('1.0') };

      await expect(manager.sendTransaction(tx)).rejects.toThrow('insufficient funds');
      expect(resyncSpy).not.toHaveBeenCalled();
    });
  });

  describe('resyncNonce', () => {
    it('should reset and reinitialize nonce', async () => {
      const manager = await NonceManager.create(wallet);
      const initialNonce = 10;
      const newNonce = 20;

      jest
        .spyOn(provider, 'getTransactionCount')
        .mockResolvedValueOnce(initialNonce) // initial
        .mockResolvedValueOnce(initialNonce) // getNextNonce
        .mockResolvedValueOnce(newNonce); // resync

      await manager.getNextNonce(); // Initialize
      await manager.resyncNonce();

      expect(provider.getTransactionCount).toHaveBeenLastCalledWith(manager.address, 'latest');
    });

    it('should throw NonceError if resync fails', async () => {
      const manager = await NonceManager.create(wallet);

      jest
        .spyOn(provider, 'getTransactionCount')
        .mockResolvedValueOnce(10) // initialize
        .mockRejectedValueOnce(new Error('Network error')); // resync fails

      await manager.initialize();
      await expect(manager.resyncNonce()).rejects.toThrow(NonceError);
      await expect(manager.resyncNonce()).rejects.toThrow('Nonce resynchronization failed');
    });
  });

  describe('NonceError', () => {
    it('should create NonceError with correct name and message', () => {
      const error = new NonceError('Test error');
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('NonceError');
      expect(error.message).toBe('Test error');
    });
  });
});
