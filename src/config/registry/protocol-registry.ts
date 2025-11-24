/**
 * Protocol Registry - Advanced DEX Protocol Management
 * 
 * Centralizes protocol configurations for all supported DEXes across chains.
 * Provides type-safe access to protocol metadata, addresses, and features.
 */

export type ProtocolType = 'uniswap-v3' | 'sushiswap-v3' | 'curve' | 'balancer' | 'uniswap-v2' | 'sushiswap-v2' | 'aerodrome' | 'baseswap' | 'velodrome' | 'pancakeswap-v3' | 'maverick';

export interface ProtocolConfig {
  name: string;
  type: ProtocolType;
  router: string;
  factory: string;
  quoter?: string;
  supportedChains: number[];
  features: string[];
  version?: string;
}

/**
 * ProtocolRegistry manages DEX protocol configurations
 */
export class ProtocolRegistry {
  private protocols: Map<string, ProtocolConfig>;
  private protocolsByChain: Map<number, ProtocolConfig[]>;

  constructor() {
    this.protocols = new Map();
    this.protocolsByChain = new Map();
  }

  /**
   * Register a protocol configuration
   */
  register(protocol: ProtocolConfig): void {
    this.protocols.set(protocol.name.toLowerCase(), protocol);

    // Index by chain
    for (const chainId of protocol.supportedChains) {
      const chainProtocols = this.protocolsByChain.get(chainId) || [];
      chainProtocols.push(protocol);
      this.protocolsByChain.set(chainId, chainProtocols);
    }
  }

  /**
   * Get protocol by name
   */
  get(name: string): ProtocolConfig | undefined {
    return this.protocols.get(name.toLowerCase());
  }

  /**
   * Get all protocols for a specific chain
   */
  getByChain(chainId: number): ProtocolConfig[] {
    return this.protocolsByChain.get(chainId) || [];
  }

  /**
   * Check if a protocol supports a specific feature
   */
  supports(protocolName: string, feature: string): boolean {
    const protocol = this.get(protocolName);
    return protocol ? protocol.features.includes(feature) : false;
  }

  /**
   * Get all registered protocols
   */
  getAll(): ProtocolConfig[] {
    return Array.from(this.protocols.values());
  }

  /**
   * Get protocols by type
   */
  getByType(type: ProtocolType): ProtocolConfig[] {
    return Array.from(this.protocols.values()).filter(p => p.type === type);
  }

  /**
   * Check if protocol exists
   */
  has(name: string): boolean {
    return this.protocols.has(name.toLowerCase());
  }

  /**
   * Unregister a protocol
   */
  unregister(name: string): boolean {
    const protocol = this.protocols.get(name.toLowerCase());
    if (!protocol) {
      return false;
    }

    this.protocols.delete(name.toLowerCase());

    // Remove from chain index
    for (const chainId of protocol.supportedChains) {
      const chainProtocols = this.protocolsByChain.get(chainId) || [];
      const filtered = chainProtocols.filter(p => p.name.toLowerCase() !== name.toLowerCase());
      this.protocolsByChain.set(chainId, filtered);
    }

    return true;
  }

  /**
   * Load protocols from configuration
   */
  loadFromConfig(protocols: ProtocolConfig[]): void {
    for (const protocol of protocols) {
      this.register(protocol);
    }
  }

  /**
   * Export current configuration
   */
  exportConfig(): ProtocolConfig[] {
    return this.getAll();
  }
}

// Create and export singleton instance
export const protocolRegistry = new ProtocolRegistry();

// Register default protocols
protocolRegistry.loadFromConfig([
  {
    name: 'Uniswap V3',
    type: 'uniswap-v3',
    router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
    supportedChains: [1, 42161, 137, 8453], // Ethereum, Arbitrum, Polygon, Base
    features: ['flash-swap', 'concentrated-liquidity', 'multiple-fee-tiers'],
    version: '3'
  },
  {
    name: 'SushiSwap V3',
    type: 'sushiswap-v3',
    router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    factory: '0xbACEB8eC6b9355Dfc0269C18bac9d6E2Bdc29C4F',
    quoter: '0x64e8802FE490fa7cc61d3463958199161Bb608A7',
    supportedChains: [1, 42161, 137],
    features: ['flash-swap', 'concentrated-liquidity', 'multiple-fee-tiers'],
    version: '3'
  },
  {
    name: 'Uniswap V2',
    type: 'uniswap-v2',
    router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    supportedChains: [1, 42161, 137],
    features: ['flash-swap', 'constant-product'],
    version: '2'
  },
  {
    name: 'SushiSwap V2',
    type: 'sushiswap-v2',
    router: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
    factory: '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac',
    supportedChains: [1, 42161, 137],
    features: ['flash-swap', 'constant-product'],
    version: '2'
  },
  {
    name: 'Aerodrome',
    type: 'aerodrome',
    router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43',
    factory: '0x420DD381b31aEf6683db6B902084cB0FFECe40Da',
    supportedChains: [8453], // Base only
    features: ['flash-swap', 'concentrated-liquidity', 'variable-fee'],
    version: '1'
  },
  {
    name: 'BaseSwap',
    type: 'baseswap',
    router: '0x327Df1E6de05895d2ab08513aaDD9313Fe505d86',
    factory: '0xFDa619b6d20975be80A10332cD39b9a4b0FAa8BB',
    supportedChains: [8453], // Base only
    features: ['flash-swap', 'constant-product'],
    version: '2'
  },
  {
    name: 'PancakeSwap V3 Base',
    type: 'pancakeswap-v3',
    router: '0x1b81D678ffb9C0263b24A97847620C99d213eB14',
    factory: '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865',
    quoter: '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997',
    supportedChains: [8453], // Base
    features: ['flash-swap', 'concentrated-liquidity', 'multiple-fee-tiers'],
    version: '3'
  },
  {
    name: 'Velodrome',
    type: 'velodrome',
    router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858',
    factory: '0x31832f2a97Fd20664D76Cc421207669b55CE4BC0',
    supportedChains: [8453], // Base (Velodrome Slipstream on Base)
    features: ['flash-swap', 'concentrated-liquidity', 'variable-fee'],
    version: '2'
  }
]);
