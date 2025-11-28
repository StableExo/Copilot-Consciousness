/**
 * MulticallBatcher - Batch multiple RPC calls into a single request
 *
 * Performance optimization for pool detection and data fetching.
 * Reduces RPC latency by combining multiple contract calls into one request.
 *
 * This is especially important for pool scanning where we check 60+ pools,
 * reducing scan time from 60+ seconds to under 10 seconds.
 *
 * Migrated to support both viem and ethers for backward compatibility
 */

import { ethers, Provider, Interface } from 'ethers';
import { type PublicClient, type Address } from 'viem';

export interface MulticallRequest {
  target: string;
  callData: string;
  allowFailure?: boolean;
}

export interface MulticallResult {
  success: boolean;
  returnData: string;
}

/**
 * Multicall3 contract interface (available on most chains including Base)
 * Address: 0xcA11bde05977b3631167028862bE2a173976CA11
 */
const MULTICALL3_ABI = [
  'function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) public payable returns (tuple(bool success, bytes returnData)[] returnData)',
];

/**
 * Multicall3 ABI for viem
 */
const MULTICALL3_VIEM_ABI = [
  {
    inputs: [
      {
        components: [
          { name: 'target', type: 'address' },
          { name: 'allowFailure', type: 'bool' },
          { name: 'callData', type: 'bytes' },
        ],
        name: 'calls',
        type: 'tuple[]',
      },
    ],
    name: 'aggregate3',
    outputs: [
      {
        components: [
          { name: 'success', type: 'bool' },
          { name: 'returnData', type: 'bytes' },
        ],
        name: 'returnData',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

/**
 * Default Multicall3 address (same on most chains)
 */
export const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11';

export class MulticallBatcher {
  private provider: Provider;
  private multicallAddress: string;
  private multicallContract: ethers.Contract;
  private batchSize: number;

  constructor(
    provider: Provider,
    multicallAddress: string = MULTICALL3_ADDRESS,
    batchSize: number = 100
  ) {
    this.provider = provider;
    this.multicallAddress = multicallAddress;
    this.multicallContract = new ethers.Contract(multicallAddress, MULTICALL3_ABI, provider);
    this.batchSize = batchSize;
  }

  /**
   * Execute multiple contract calls in a single RPC request
   *
   * @param calls Array of calls to execute
   * @returns Array of results corresponding to each call
   */
  async executeBatch(calls: MulticallRequest[]): Promise<MulticallResult[]> {
    if (calls.length === 0) {
      return [];
    }

    // If calls exceed batch size, split into multiple batches
    if (calls.length > this.batchSize) {
      const results: MulticallResult[] = [];
      for (let i = 0; i < calls.length; i += this.batchSize) {
        const batch = calls.slice(i, i + this.batchSize);
        const batchResults = await this.executeBatch(batch);
        results.push(...batchResults);
      }
      return results;
    }

    // Format calls for multicall3
    const formattedCalls = calls.map((call) => ({
      target: call.target,
      allowFailure: call.allowFailure ?? true,
      callData: call.callData,
    }));

    try {
      // Execute multicall using staticCall to avoid requiring a signer
      const results = await (this.multicallContract as any).aggregate3.staticCall(formattedCalls);

      return results.map((result: any) => ({
        success: result.success,
        returnData: result.returnData,
      }));
    } catch (error: any) {
      console.error('[MulticallBatcher] Batch execution failed:', error.message);
      console.error('[MulticallBatcher] Error details:', {
        message: error.message,
        code: error.code,
        callCount: calls.length,
        multicallAddress: this.multicallAddress,
      });
      // Return failed results for all calls
      // Caller can check success=false and decide how to handle
      return calls.map(() => ({
        success: false,
        returnData: '0x',
      }));
    }
  }

  /**
   * Check if multicall contract is available on this network
   */
  async isAvailable(): Promise<boolean> {
    try {
      const code = await this.provider.getCode(this.multicallAddress);
      return code !== '0x';
    } catch {
      return false;
    }
  }

  /**
   * Encode a contract function call for multicall
   */
  static encodeCall(contractInterface: Interface, functionName: string, params: any[]): string {
    return contractInterface.encodeFunctionData(functionName, params);
  }

  /**
   * Decode a contract function result from multicall
   */
  static decodeResult(contractInterface: Interface, functionName: string, data: string): any {
    return contractInterface.decodeFunctionResult(functionName, data);
  }
}

/**
 * Viem-based MulticallBatcher for use with viem PublicClient
 */
export class ViemMulticallBatcher {
  private publicClient: PublicClient;
  private multicallAddress: Address;
  private batchSize: number;

  constructor(
    publicClient: PublicClient,
    multicallAddress: Address = MULTICALL3_ADDRESS as Address,
    batchSize: number = 100
  ) {
    this.publicClient = publicClient;
    this.multicallAddress = multicallAddress;
    this.batchSize = batchSize;
  }

  /**
   * Execute multiple contract calls in a single RPC request using viem
   */
  async executeBatch(calls: MulticallRequest[]): Promise<MulticallResult[]> {
    if (calls.length === 0) {
      return [];
    }

    // If calls exceed batch size, split into multiple batches
    if (calls.length > this.batchSize) {
      const results: MulticallResult[] = [];
      for (let i = 0; i < calls.length; i += this.batchSize) {
        const batch = calls.slice(i, i + this.batchSize);
        const batchResults = await this.executeBatch(batch);
        results.push(...batchResults);
      }
      return results;
    }

    // Format calls for viem multicall
    const formattedCalls = calls.map((call) => ({
      target: call.target as Address,
      allowFailure: call.allowFailure ?? true,
      callData: call.callData as `0x${string}`,
    }));

    try {
      // Use viem's simulateContract for read-only multicall
      const result = await this.publicClient.simulateContract({
        address: this.multicallAddress,
        abi: MULTICALL3_VIEM_ABI,
        functionName: 'aggregate3',
        args: [formattedCalls],
      });

      const returnData = result.result as readonly {
        success: boolean;
        returnData: `0x${string}`;
      }[];
      return returnData.map((r) => ({
        success: r.success,
        returnData: r.returnData,
      }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[ViemMulticallBatcher] Batch execution failed:', message);
      return calls.map(() => ({
        success: false,
        returnData: '0x',
      }));
    }
  }

  /**
   * Check if multicall contract is available on this network
   */
  async isAvailable(): Promise<boolean> {
    try {
      const bytecode = await this.publicClient.getCode({ address: this.multicallAddress });
      return bytecode !== undefined && bytecode !== '0x';
    } catch {
      return false;
    }
  }
}

/**
 * Helper function to batch pool existence checks
 *
 * Instead of checking each pool individually with provider.getCode(),
 * batch them all into a single multicall request.
 */
export async function batchCheckPoolsExist(
  provider: Provider,
  poolAddresses: string[]
): Promise<Map<string, boolean>> {
  const batcher = new MulticallBatcher(provider);
  const results = new Map<string, boolean>();

  // Check if multicall is available
  const available = await batcher.isAvailable();
  if (!available) {
    // Fallback to individual checks
    for (const address of poolAddresses) {
      try {
        const code = await provider.getCode(address);
        results.set(address, code !== '0x');
      } catch {
        results.set(address, false);
      }
    }
    return results;
  }

  // Create multicall requests for code checks
  // We use eth_getCode which isn't directly supported by multicall,
  // so we'll use a different approach: call a standard function that all pools have
  const poolInterface = new Interface(['function token0() external view returns (address)']);

  const calls: MulticallRequest[] = poolAddresses.map((address) => ({
    target: address,
    callData: poolInterface.encodeFunctionData('token0', []),
    allowFailure: true,
  }));

  // Execute batch
  const batchResults = await batcher.executeBatch(calls);

  // Map results back to addresses
  for (let i = 0; i < poolAddresses.length; i++) {
    results.set(poolAddresses[i], batchResults[i].success);
  }

  return results;
}

/**
 * Helper function to batch pool data fetches
 *
 * Fetches token0, token1, and reserves/liquidity for multiple pools in one call.
 */
export async function batchFetchPoolData(
  provider: Provider,
  poolAddresses: string[],
  isV3: boolean
): Promise<Map<string, any>> {
  const batcher = new MulticallBatcher(provider);
  const results = new Map<string, any>();

  // Check if multicall is available
  const available = await batcher.isAvailable();
  if (!available) {
    return results; // Return empty, let caller handle fallback
  }

  // Create interface for pool calls
  const v3Interface = new Interface([
    'function token0() external view returns (address)',
    'function token1() external view returns (address)',
    'function liquidity() external view returns (uint128)',
    'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  ]);

  const v2Interface = new Interface([
    'function token0() external view returns (address)',
    'function token1() external view returns (address)',
    'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  ]);

  const poolInterface = isV3 ? v3Interface : v2Interface;

  // Build calls for each pool
  const calls: MulticallRequest[] = [];
  for (const address of poolAddresses) {
    // token0
    calls.push({
      target: address,
      callData: poolInterface.encodeFunctionData('token0', []),
      allowFailure: true,
    });
    // token1
    calls.push({
      target: address,
      callData: poolInterface.encodeFunctionData('token1', []),
      allowFailure: true,
    });
    // reserves/liquidity
    if (isV3) {
      calls.push({
        target: address,
        callData: poolInterface.encodeFunctionData('liquidity', []),
        allowFailure: true,
      });
    } else {
      calls.push({
        target: address,
        callData: poolInterface.encodeFunctionData('getReserves', []),
        allowFailure: true,
      });
    }
  }

  // Execute batch
  const batchResults = await batcher.executeBatch(calls);

  // Parse results (3 calls per pool)
  const callsPerPool = 3;
  for (let i = 0; i < poolAddresses.length; i++) {
    const poolAddress = poolAddresses[i];
    const baseIdx = i * callsPerPool;

    const token0Result = batchResults[baseIdx];
    const token1Result = batchResults[baseIdx + 1];
    const dataResult = batchResults[baseIdx + 2];

    // All calls must succeed
    if (!token0Result.success || !token1Result.success || !dataResult.success) {
      continue;
    }

    try {
      const token0 = poolInterface.decodeFunctionResult('token0', token0Result.returnData)[0];
      const token1 = poolInterface.decodeFunctionResult('token1', token1Result.returnData)[0];

      let reserve0: bigint;
      let reserve1: bigint;

      if (isV3) {
        const liquidity = poolInterface.decodeFunctionResult('liquidity', dataResult.returnData)[0];
        const liquidityBigInt = BigInt(liquidity.toString());
        reserve0 = liquidityBigInt;
        reserve1 = liquidityBigInt;
      } else {
        const reserves = poolInterface.decodeFunctionResult('getReserves', dataResult.returnData);
        reserve0 = BigInt(reserves.reserve0.toString());
        reserve1 = BigInt(reserves.reserve1.toString());
      }

      results.set(poolAddress, {
        token0,
        token1,
        reserve0,
        reserve1,
      });
    } catch (_error) {
      // Failed to decode, skip this pool
      continue;
    }
  }

  return results;
}
