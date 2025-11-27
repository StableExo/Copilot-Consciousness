/**
 * Protocol Abstraction Layer
 *
 * Integrated from AxionCitadel's protocol management system.
 * Provides unified interface for interacting with multiple DEX protocols.
 *
 * Supported Protocols:
 * - Uniswap V3 (Ethereum, Arbitrum, Polygon, Base)
 * - SushiSwap V3 (Ethereum, Arbitrum, Polygon)
 * - Aave V3 (Flash loans)
 * - Camelot (Arbitrum)
 */

// Base abstractions
export * from './base/IProtocol';
export * from './base/BaseProtocol';

// Registry
export * from './registry';

// Protocol implementations
export { UniswapV3Protocol } from './implementations/uniswap/UniswapV3Protocol';
export { SushiSwapV3Protocol } from './implementations/sushiswap/SushiSwapV3Protocol';
export { AaveV3Protocol } from './implementations/aave/AaveV3Protocol';
export { CamelotProtocol } from './implementations/camelot/CamelotProtocol';
