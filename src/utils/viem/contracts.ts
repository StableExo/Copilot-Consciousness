/**
 * Viem Contract Utilities
 *
 * Provides contract interaction utilities using viem.
 * Part of the ethers.js to viem migration (Phase 2).
 *
 * @module utils/viem/contracts
 */

import {
  type PublicClient,
  type WalletClient,
  type Address,
  type Abi,
  getContract as viemGetContract,
} from 'viem';

/**
 * Create a viem contract instance for reading and writing
 */
export function createContract<TAbi extends Abi>(
  address: Address,
  abi: TAbi,
  publicClient: PublicClient,
  walletClient?: WalletClient
) {
  return viemGetContract({
    address,
    abi,
    client: walletClient ? { public: publicClient, wallet: walletClient } : publicClient,
  });
}

/**
 * Read from a contract using a public client
 */
export async function readContract<TAbi extends Abi>(
  publicClient: PublicClient,
  address: Address,
  abi: TAbi,
  functionName: string,
  args?: readonly unknown[]
): Promise<unknown> {
  return publicClient.readContract({
    address,
    abi,
    functionName,
    args,
  } as Parameters<typeof publicClient.readContract>[0]);
}

/**
 * Write to a contract using a wallet client
 */
export async function writeContract<TAbi extends Abi>(
  walletClient: WalletClient,
  publicClient: PublicClient,
  address: Address,
  abi: TAbi,
  functionName: string,
  args?: readonly unknown[],
  value?: bigint
): Promise<`0x${string}`> {
  if (!walletClient.account) {
    throw new Error('Wallet client must have an account to write to contracts');
  }

  const chain = walletClient.chain;
  if (!chain) {
    throw new Error('Wallet client must have a chain configured');
  }

  // Simulate first to check for errors
  await publicClient.simulateContract({
    address,
    abi,
    functionName,
    args,
    account: walletClient.account,
    value,
  } as Parameters<typeof publicClient.simulateContract>[0]);

  // Execute the transaction
  return walletClient.writeContract({
    address,
    abi,
    functionName,
    args,
    value,
    account: walletClient.account,
    chain,
  } as Parameters<typeof walletClient.writeContract>[0]);
}

/**
 * Simulate a contract write to estimate gas and check for reverts
 */
export async function simulateContract<TAbi extends Abi>(
  publicClient: PublicClient,
  address: Address,
  abi: TAbi,
  functionName: string,
  args?: readonly unknown[],
  account?: Address,
  value?: bigint
): Promise<{ request: unknown; result: unknown }> {
  return publicClient.simulateContract({
    address,
    abi,
    functionName,
    args,
    account,
    value,
  } as Parameters<typeof publicClient.simulateContract>[0]);
}

/**
 * Multicall - batch multiple contract reads into a single RPC call
 */
export async function multicall<TAbi extends Abi>(
  publicClient: PublicClient,
  contracts: Array<{
    address: Address;
    abi: TAbi;
    functionName: string;
    args?: readonly unknown[];
  }>
): Promise<Array<{ result?: unknown; error?: Error; status: 'success' | 'failure' }>> {
  const results = await publicClient.multicall({
    contracts: contracts.map((contract) => ({
      address: contract.address,
      abi: contract.abi,
      functionName: contract.functionName,
      args: contract.args,
    })),
  });

  return results.map((result) => ({
    result: result.status === 'success' ? result.result : undefined,
    error: result.status === 'failure' ? (result.error as Error) : undefined,
    status: result.status,
  }));
}

/**
 * Common ERC20 ABI for token interactions
 */
export const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
] as const;

/**
 * Get ERC20 token balance
 */
export async function getTokenBalance(
  publicClient: PublicClient,
  tokenAddress: Address,
  walletAddress: Address
): Promise<bigint> {
  const balance = await publicClient.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [walletAddress],
  });
  return balance as bigint;
}

/**
 * Get ERC20 token info (symbol, decimals, name)
 */
export async function getTokenInfo(
  publicClient: PublicClient,
  tokenAddress: Address
): Promise<{
  symbol: string;
  decimals: number;
  name: string;
}> {
  const results = await publicClient.multicall({
    contracts: [
      {
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'symbol',
      },
      {
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'decimals',
      },
      {
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'name',
      },
    ],
  });

  // Handle multicall results with proper status checking
  const symbolResult = results[0];
  const decimalsResult = results[1];
  const nameResult = results[2];

  return {
    symbol:
      symbolResult.status === 'success' && typeof symbolResult.result === 'string'
        ? symbolResult.result
        : 'UNKNOWN',
    decimals:
      decimalsResult.status === 'success' && typeof decimalsResult.result === 'number'
        ? decimalsResult.result
        : 18,
    name:
      nameResult.status === 'success' && typeof nameResult.result === 'string'
        ? nameResult.result
        : 'Unknown Token',
  };
}
