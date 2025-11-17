/**
 * Cross-Chain Intelligence Module - Phase 3
 * 
 * This module provides cross-chain intelligence capabilities for TheWarden/AEV:
 * - Multi-chain MEV awareness and monitoring
 * - Cross-chain arbitrage pattern detection
 * - Unified risk modeling across chains
 * - Bridge risk assessment and optimization
 * 
 * Status: Phase 3 - Fully Implemented
 * 
 * Integration Points:
 * - CrossChainIntelligence: Main orchestrator for cross-chain operations
 * - Integrates with existing ChainProviderManager and MEVSensorHub
 * - Extends arbitrage detection to cross-chain opportunities
 * - Provides unified risk assessment across multiple chains
 * 
 * Usage:
 * ```typescript
 * import { CrossChainIntelligence } from './crosschain';
 * 
 * // Initialize cross-chain intelligence
 * const crossChain = new CrossChainIntelligence({
 *   enabledChains: [1, 8453, 42161, 10], // ETH, Base, Arbitrum, Optimism
 *   minPriceDivergence: 0.005,
 * });
 * 
 * // Start monitoring
 * crossChain.start();
 * 
 * // Get cross-chain opportunities
 * const patterns = await crossChain.analyzeCrossChainPatterns();
 * 
 * // Get unified risk view
 * const riskView = await crossChain.getUnifiedRiskModel();
 * ```
 */

export { CrossChainIntelligence } from './CrossChainIntelligence';

export * from './types';
