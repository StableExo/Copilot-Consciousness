/**
 * Builder Endpoint Registry
 * 
 * Registry of known MEV-Boost builders and their relay endpoints.
 * Based on current market data from mevboost.pics and relayscan.io.
 */

import {
  BuilderName,
  BuilderEndpoint,
  BuilderCapability,
} from './types';

/**
 * Titan Builder endpoint configuration
 */
export const TITAN_BUILDER: BuilderEndpoint = {
  name: BuilderName.TITAN,
  displayName: 'Titan Builder',
  relayUrl: 'https://rpc.titanbuilder.xyz',
  fallbackUrls: [
    'https://relay.titanbuilder.xyz',
  ],
  marketShare: 0.45, // ~45% average market share (late 2025)
  capabilities: [
    BuilderCapability.STANDARD_BUNDLES,
    BuilderCapability.PARALLEL_MERGING,
    BuilderCapability.BUNDLE_SIMULATION,
  ],
  isActive: true,
  priority: 100, // Highest priority (largest market share)
  metadata: {
    description: 'Dominant Ethereum MEV builder with 40-50% market share',
    features: ['Parallel bundle merging', 'Rust-based', 'Own relay'],
    exclusiveOrderFlow: ['Banana Gun'],
  },
};

/**
 * BuilderNet endpoint configuration
 */
export const BUILDERNET_BUILDER: BuilderEndpoint = {
  name: BuilderName.BUILDERNET,
  displayName: 'BuilderNet',
  relayUrl: 'https://relay.buildernet.org',
  fallbackUrls: [
    'https://api.buildernet.org',
  ],
  marketShare: 0.25, // ~25% average market share (rank #2-3)
  capabilities: [
    BuilderCapability.STANDARD_BUNDLES,
    BuilderCapability.BUNDLE_SIMULATION,
  ],
  isActive: true,
  priority: 85,
  metadata: {
    description: 'Intelligence-focused MEV builder with advanced analytics',
    features: ['MEV intelligence layer', 'Builder analytics', 'Optimization algorithms'],
  },
};

/**
 * Flashbots Builder endpoint configuration
 */
export const FLASHBOTS_BUILDER: BuilderEndpoint = {
  name: BuilderName.FLASHBOTS,
  displayName: 'Flashbots Builder',
  relayUrl: 'https://relay.flashbots.net',
  fallbackUrls: [
    'https://relay-sepolia.flashbots.net', // Testnet
  ],
  marketShare: 0.20, // ~20% average market share
  capabilities: [
    BuilderCapability.STANDARD_BUNDLES,
    BuilderCapability.MEV_SHARE,
    BuilderCapability.BUNDLE_SIMULATION,
    BuilderCapability.BUNDLE_CANCELLATION,
  ],
  isActive: true,
  priority: 80,
  metadata: {
    description: 'Original MEV-Boost builder by Flashbots',
    features: ['MEV-Share', 'Bundle simulation', 'Established reputation'],
  },
};

/**
 * bloXroute Builder endpoint configuration
 */
export const BLOXROUTE_BUILDER: BuilderEndpoint = {
  name: BuilderName.BLOXROUTE,
  displayName: 'bloXroute Builder',
  relayUrl: 'https://mev.api.bloxroute.com',
  fallbackUrls: [
    'https://relay.bloxroute.max-profit.blxrbdn.com',
  ],
  marketShare: 0.15, // ~15% average market share
  capabilities: [
    BuilderCapability.STANDARD_BUNDLES,
    BuilderCapability.BUNDLE_SIMULATION,
  ],
  isActive: true,
  priority: 80,
  metadata: {
    description: 'bloXroute MEV builder with BDN network',
    features: ['Blockchain Distribution Network', 'Global infrastructure'],
  },
};

/**
 * Beaver Builder endpoint configuration
 */
export const BEAVER_BUILDER: BuilderEndpoint = {
  name: BuilderName.BEAVER,
  displayName: 'Beaver Builder',
  relayUrl: 'https://relay.beaverbuild.org',
  fallbackUrls: [],
  marketShare: 0.05, // ~5% market share
  capabilities: [
    BuilderCapability.STANDARD_BUNDLES,
  ],
  isActive: true,
  priority: 70,
  metadata: {
    description: 'Independent MEV builder',
  },
};

/**
 * Rsync Builder endpoint configuration
 */
export const RSYNC_BUILDER: BuilderEndpoint = {
  name: BuilderName.RSYNC,
  displayName: 'Rsync Builder',
  relayUrl: 'https://relay.rsyncbuilder.xyz',
  fallbackUrls: [],
  marketShare: 0.05, // ~5% market share
  capabilities: [
    BuilderCapability.STANDARD_BUNDLES,
  ],
  isActive: true,
  priority: 65,
  metadata: {
    description: 'Independent MEV builder',
  },
};

/**
 * All registered builder endpoints
 */
export const ALL_BUILDERS: BuilderEndpoint[] = [
  TITAN_BUILDER,
  BUILDERNET_BUILDER,
  FLASHBOTS_BUILDER,
  BLOXROUTE_BUILDER,
  BEAVER_BUILDER,
  RSYNC_BUILDER,
];

/**
 * Top 3 builders by market share (cover ~90% of blocks)
 */
export const TOP_3_BUILDERS: BuilderEndpoint[] = [
  TITAN_BUILDER,      // 45% (rank #1)
  BUILDERNET_BUILDER, // 25% (rank #2)
  FLASHBOTS_BUILDER,  // 20% (rank #3)
];

/**
 * Builder registry with lookup by name
 */
export class BuilderRegistry {
  private builders: Map<BuilderName, BuilderEndpoint>;

  constructor(builders: BuilderEndpoint[] = ALL_BUILDERS) {
    this.builders = new Map(builders.map((b) => [b.name, b]));
  }

  /**
   * Get builder by name
   */
  getBuilder(name: BuilderName): BuilderEndpoint | undefined {
    return this.builders.get(name);
  }

  /**
   * Get all active builders
   */
  getActiveBuilders(): BuilderEndpoint[] {
    return Array.from(this.builders.values()).filter((b) => b.isActive);
  }

  /**
   * Get top N builders by market share
   */
  getTopBuilders(n: number): BuilderEndpoint[] {
    return Array.from(this.builders.values())
      .filter((b) => b.isActive)
      .sort((a, b) => b.marketShare - a.marketShare)
      .slice(0, n);
  }

  /**
   * Get builders sorted by priority
   */
  getBuildersByPriority(): BuilderEndpoint[] {
    return Array.from(this.builders.values())
      .filter((b) => b.isActive)
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get total market share of given builders
   */
  getTotalMarketShare(builders: BuilderEndpoint[]): number {
    return builders.reduce((sum, b) => sum + b.marketShare, 0);
  }

  /**
   * Register or update a builder
   */
  registerBuilder(builder: BuilderEndpoint): void {
    this.builders.set(builder.name, builder);
  }

  /**
   * Deactivate a builder
   */
  deactivateBuilder(name: BuilderName): void {
    const builder = this.builders.get(name);
    if (builder) {
      builder.isActive = false;
    }
  }

  /**
   * Reactivate a builder
   */
  reactivateBuilder(name: BuilderName): void {
    const builder = this.builders.get(name);
    if (builder) {
      builder.isActive = true;
    }
  }

  /**
   * Get all builder names
   */
  getAllBuilderNames(): BuilderName[] {
    return Array.from(this.builders.keys());
  }

  /**
   * Check if builder exists
   */
  hasBuilder(name: BuilderName): boolean {
    return this.builders.has(name);
  }

  /**
   * Get builder count
   */
  getBuilderCount(): number {
    return this.builders.size;
  }

  /**
   * Get active builder count
   */
  getActiveBuilderCount(): number {
    return this.getActiveBuilders().length;
  }
}

/**
 * Default builder registry instance
 */
export const defaultBuilderRegistry = new BuilderRegistry();
