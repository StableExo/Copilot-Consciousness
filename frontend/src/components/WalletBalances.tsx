/**
 * WalletBalances Component
 * Displays wallet balances for native and ERC20 tokens
 */

import React from 'react';
import { WalletBalance } from '../types';

interface WalletBalancesProps {
  walletBalances?: WalletBalance[];
}

export const WalletBalances: React.FC<WalletBalancesProps> = ({ walletBalances }) => {
  if (!walletBalances || walletBalances.length === 0) {
    return null;
  }

  const formatBalance = (balance: string, decimals: number): string => {
    const value = BigInt(balance);
    const divisor = BigInt(10 ** decimals);
    const integerPart = value / divisor;
    const remainder = value % divisor;
    
    // Format with up to 6 decimal places
    const decimalStr = remainder.toString().padStart(decimals, '0');
    const trimmedDecimal = decimalStr.substring(0, 6).replace(/0+$/, '');
    
    if (trimmedDecimal) {
      return `${integerPart}.${trimmedDecimal}`;
    }
    return integerPart.toString();
  };

  const getChainName = (chainId: number): string => {
    const chainNames: Record<number, string> = {
      1: 'Ethereum',
      8453: 'Base',
      137: 'Polygon',
      42161: 'Arbitrum',
      10: 'Optimism'
    };
    return chainNames[chainId] || `Chain ${chainId}`;
  };

  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-4">Wallet Balances</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {walletBalances.map((wallet, idx) => (
          <div key={idx} className="bg-white p-6 rounded-lg shadow-md">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {getChainName(wallet.chainId)}
              </h3>
              <p className="text-xs text-gray-500 font-mono break-all">
                {wallet.address}
              </p>
            </div>
            
            <div className="space-y-3">
              {/* Native balance (ETH) */}
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                <span className="font-medium text-gray-700">
                  {wallet.chainName === 'base' ? 'ETH' : 'Native'}
                </span>
                <span className="font-bold text-gray-900">
                  {formatBalance(wallet.nativeBalance, 18)}
                </span>
              </div>
              
              {/* Token balances */}
              {wallet.tokens.map((token, tokenIdx) => (
                <div
                  key={tokenIdx}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded"
                >
                  <span className="font-medium text-gray-700">{token.symbol}</span>
                  <span className="font-bold text-gray-900">
                    {formatBalance(token.balance, token.decimals)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
