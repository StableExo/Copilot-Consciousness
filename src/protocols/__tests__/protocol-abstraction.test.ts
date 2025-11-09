/**
 * Tests for Protocol Abstraction Layer
 * Validates protocol registry, base classes, and implementations
 */

import { ethers, BigNumber } from 'ethers';
import {
  IProtocol,
  BaseProtocol,
  ProtocolRegistry,
  protocolRegistry,
  UniswapV3Protocol,
  SushiSwapV3Protocol,
  AaveV3Protocol,
  CamelotProtocol,
  SwapParams,
  QuoteParams,
} from '../index';

describe('Protocol Abstraction Layer', () => {
  let provider: ethers.providers.Provider;

  beforeEach(() => {
    provider = new ethers.providers.JsonRpcProvider();
  });

  describe('Protocol Registry', () => {
    it('should export ProtocolRegistry class', () => {
      expect(ProtocolRegistry).toBeDefined();
    });

    it('should have singleton registry instance', () => {
      expect(protocolRegistry).toBeDefined();
      expect(protocolRegistry).toBeInstanceOf(ProtocolRegistry);
    });

    it('should have pre-registered protocols', () => {
      const protocols = protocolRegistry.getAll();
      expect(protocols.length).toBeGreaterThan(0);
    });

    it('should get protocol by name', () => {
      const uniswap = protocolRegistry.get('Uniswap V3');
      expect(uniswap).toBeDefined();
      expect(uniswap?.name).toBe('Uniswap V3');
      expect(uniswap?.type).toBe('uniswap-v3');
    });

    it('should get protocols by chain', () => {
      const arbitrumProtocols = protocolRegistry.getByChain(42161);
      expect(arbitrumProtocols.length).toBeGreaterThan(0);
    });

    it('should check protocol features', () => {
      const hasFlashSwap = protocolRegistry.supports('Uniswap V3', 'flash-swap');
      expect(hasFlashSwap).toBe(true);

      const hasInvalidFeature = protocolRegistry.supports('Uniswap V3', 'invalid-feature');
      expect(hasInvalidFeature).toBe(false);
    });

    it('should register new protocol', () => {
      const testRegistry = new ProtocolRegistry();
      testRegistry.register({
        name: 'Test Protocol',
        type: 'uniswap-v2',
        router: '0x0000000000000000000000000000000000000001',
        factory: '0x0000000000000000000000000000000000000002',
        supportedChains: [1],
        features: ['test-feature'],
      });

      expect(testRegistry.has('Test Protocol')).toBe(true);
      expect(testRegistry.get('Test Protocol')?.name).toBe('Test Protocol');
    });

    it('should get protocols by type', () => {
      const uniswapV3Protocols = protocolRegistry.getByType('uniswap-v3');
      expect(uniswapV3Protocols.length).toBeGreaterThan(0);
      expect(uniswapV3Protocols.every((p) => p.type === 'uniswap-v3')).toBe(true);
    });
  });

  describe('Protocol Implementations', () => {
    describe('UniswapV3Protocol', () => {
      let protocol: UniswapV3Protocol;

      beforeEach(() => {
        protocol = new UniswapV3Protocol(provider, 1);
      });

      it('should create instance', () => {
        expect(protocol).toBeDefined();
        expect(protocol).toBeInstanceOf(UniswapV3Protocol);
      });

      it('should have correct metadata', () => {
        const metadata = protocol.getMetadata();
        expect(metadata.name).toBe('Uniswap V3');
        expect(metadata.type).toBe('uniswap-v3');
        expect(metadata.version).toBe('3');
        expect(metadata.chainId).toBe(1);
      });

      it('should support flash-swap feature', () => {
        expect(protocol.supportsFeature('flash-swap')).toBe(true);
      });

      it('should support concentrated-liquidity feature', () => {
        expect(protocol.supportsFeature('concentrated-liquidity')).toBe(true);
      });

      it('should not support unsupported feature', () => {
        expect(protocol.supportsFeature('unsupported-feature')).toBe(false);
      });

      it('should get quote', async () => {
        const params: QuoteParams = {
          tokenIn: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
          tokenOut: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
          amountIn: BigNumber.from('1000000000000000000'),
          fee: 3000,
        };

        const quote = await protocol.getQuote(params);
        expect(quote).toBeDefined();
        expect(quote.path).toContain(params.tokenIn);
        expect(quote.path).toContain(params.tokenOut);
      });

      it('should get pool info', async () => {
        const pool = await protocol.getPool(
          '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
          '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
          3000
        );

        expect(pool).toBeDefined();
        expect(pool.fee).toBe(3000);
      });
    });

    describe('SushiSwapV3Protocol', () => {
      let protocol: SushiSwapV3Protocol;

      beforeEach(() => {
        protocol = new SushiSwapV3Protocol(provider, 1);
      });

      it('should create instance', () => {
        expect(protocol).toBeDefined();
        expect(protocol).toBeInstanceOf(SushiSwapV3Protocol);
      });

      it('should have correct metadata', () => {
        const metadata = protocol.getMetadata();
        expect(metadata.name).toBe('SushiSwap V3');
        expect(metadata.type).toBe('sushiswap-v3');
      });
    });

    describe('AaveV3Protocol', () => {
      let protocol: AaveV3Protocol;

      beforeEach(() => {
        protocol = new AaveV3Protocol(provider, 1);
      });

      it('should create instance', () => {
        expect(protocol).toBeDefined();
        expect(protocol).toBeInstanceOf(AaveV3Protocol);
      });

      it('should have correct metadata', () => {
        const metadata = protocol.getMetadata();
        expect(metadata.name).toBe('Aave V3');
        expect(metadata.type).toBe('lending');
      });

      it('should support flash-loan feature', () => {
        expect(protocol.supportsFeature('flash-loan')).toBe(true);
      });

      it('should calculate flash loan fee', async () => {
        const params: QuoteParams = {
          tokenIn: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
          tokenOut: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
          amountIn: BigNumber.from('1000000000000000000'), // 1 ETH
        };

        const quote = await protocol.getQuote(params);
        expect(quote).toBeDefined();
        expect(quote.fees[0]).toBe(9); // 0.09% = 9 basis points
      });

      it('should get flash loan premium', () => {
        expect(protocol.getFlashLoanPremium()).toBe(9);
      });

      it('should reject swap execution', async () => {
        const params: SwapParams = {
          tokenIn: ethers.constants.AddressZero,
          tokenOut: ethers.constants.AddressZero,
          amountIn: BigNumber.from(0),
          amountOutMinimum: BigNumber.from(0),
          recipient: ethers.constants.AddressZero,
        };

        await expect(protocol.executeSwap(params)).rejects.toThrow(
          'Aave does not support swaps'
        );
      });
    });

    describe('CamelotProtocol', () => {
      let protocol: CamelotProtocol;

      beforeEach(() => {
        protocol = new CamelotProtocol(provider, 42161);
      });

      it('should create instance', () => {
        expect(protocol).toBeDefined();
        expect(protocol).toBeInstanceOf(CamelotProtocol);
      });

      it('should have correct metadata for Arbitrum', () => {
        const metadata = protocol.getMetadata();
        expect(metadata.name).toBe('Camelot');
        expect(metadata.chainId).toBe(42161);
      });

      it('should support dynamic-fees feature', () => {
        expect(protocol.supportsFeature('dynamic-fees')).toBe(true);
      });
    });
  });

  describe('Protocol Interface Compliance', () => {
    const protocols: IProtocol[] = [
      new UniswapV3Protocol(provider, 1),
      new SushiSwapV3Protocol(provider, 1),
      new AaveV3Protocol(provider, 1),
      new CamelotProtocol(provider, 42161),
    ];

    protocols.forEach((protocol) => {
      const metadata = protocol.getMetadata();

      describe(`${metadata.name}`, () => {
        it('should implement getMetadata', () => {
          expect(metadata).toBeDefined();
          expect(metadata.name).toBeDefined();
          expect(metadata.type).toBeDefined();
        });

        it('should implement supportsFeature', () => {
          const result = protocol.supportsFeature('flash-swap');
          expect(typeof result).toBe('boolean');
        });

        it('should implement isActive', async () => {
          const result = await protocol.isActive();
          expect(typeof result).toBe('boolean');
        });

        it('should implement getQuote', async () => {
          const params: QuoteParams = {
            tokenIn: ethers.constants.AddressZero,
            tokenOut: ethers.constants.AddressZero,
            amountIn: BigNumber.from(1000),
          };

          const quote = await protocol.getQuote(params);
          expect(quote).toBeDefined();
          expect(quote.path).toBeDefined();
          expect(quote.fees).toBeDefined();
        });

        it('should implement getPool', async () => {
          const pool = await protocol.getPool(
            ethers.constants.AddressZero,
            ethers.constants.AddressZero
          );
          expect(pool).toBeDefined();
          expect(pool.token0).toBeDefined();
          expect(pool.token1).toBeDefined();
        });
      });
    });
  });

  describe('Integration - Protocol Selection', () => {
    it('should select optimal protocol for a chain', () => {
      const arbitrumProtocols = protocolRegistry.getByChain(42161);
      expect(arbitrumProtocols.length).toBeGreaterThan(0);

      // Find protocols with flash-swap support
      const flashSwapProtocols = arbitrumProtocols.filter((p) =>
        p.features.includes('flash-swap')
      );
      expect(flashSwapProtocols.length).toBeGreaterThan(0);
    });

    it('should access protocol implementations through registry', () => {
      const uniswapConfig = protocolRegistry.get('Uniswap V3');
      expect(uniswapConfig).toBeDefined();

      if (uniswapConfig) {
        const protocol = new UniswapV3Protocol(provider, uniswapConfig.supportedChains[0]);
        expect(protocol.getMetadata().name).toBe(uniswapConfig.name);
      }
    });
  });
});
