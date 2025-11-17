/**
 * Integration Example: Private RPC with Arbitrage
 * 
 * Shows how to integrate PrivateRPCManager with existing arbitrage execution
 * to automatically route high-value transactions through private relays.
 */

import { ethers, Wallet } from 'ethers';
import dotenv from 'dotenv';
import {
  PrivateRPCManager,
  createFlashbotsProtectConfig,
  createMEVShareConfig,
} from '../src/execution/PrivateRPCManager';
import {
  PrivateRelayType,
  PrivacyLevel,
} from '../src/execution/types';
import { TransactionManager } from '../src/execution/TransactionManager';
import { NonceManager } from '../src/execution/NonceManager';

dotenv.config();

/**
 * Enhanced Transaction Router
 * 
 * Routes transactions based on value and MEV risk:
 * - High value/risk → Private relays (Flashbots, MEV-Share)
 * - Medium value/risk → Optional private relays
 * - Low value/risk → Public mempool
 */
class SmartTransactionRouter {
  private provider: ethers.providers.JsonRpcProvider;
  private signer: Wallet;
  private privateRPCManager: PrivateRPCManager;
  private transactionManager: TransactionManager;
  
  // Thresholds for routing decisions (in ETH)
  private readonly HIGH_VALUE_THRESHOLD = 1.0;
  private readonly MEDIUM_VALUE_THRESHOLD = 0.1;

  constructor(
    provider: ethers.providers.JsonRpcProvider,
    signer: Wallet,
    nonceManager: NonceManager
  ) {
    this.provider = provider;
    this.signer = signer;

    // Initialize private RPC manager
    this.privateRPCManager = new PrivateRPCManager(provider, signer, {
      relays: [
        createMEVShareConfig(process.env.MEV_SHARE_AUTH_KEY),
        createFlashbotsProtectConfig(1, process.env.FLASHBOTS_AUTH_KEY),
      ],
      defaultPrivacyLevel: PrivacyLevel.ENHANCED,
      enableFallback: true,
      privateSubmissionTimeout: 30000,
      verboseLogging: false,
    });

    // Initialize standard transaction manager
    this.transactionManager = new TransactionManager(
      provider,
      nonceManager
    );
  }

  /**
   * Execute an arbitrage transaction with smart routing
   */
  async executeArbitrage(
    to: string,
    data: string,
    expectedProfit: ethers.BigNumber,
    gasCost: ethers.BigNumber,
    options: any = {}
  ) {
    const netProfit = expectedProfit.sub(gasCost);
    const netProfitEth = parseFloat(ethers.utils.formatEther(netProfit));

    console.log(`\n=== Arbitrage Transaction ===`);
    console.log(`Expected Profit: ${ethers.utils.formatEther(expectedProfit)} ETH`);
    console.log(`Gas Cost: ${ethers.utils.formatEther(gasCost)} ETH`);
    console.log(`Net Profit: ${netProfitEth} ETH`);

    // Determine routing strategy based on profit
    if (netProfitEth >= this.HIGH_VALUE_THRESHOLD) {
      console.log(`🔒 Routing: PRIVATE (High Value) - Using MEV-Share`);
      return this.executeViaPrivateRelay(to, data, options, PrivacyLevel.ENHANCED);
    } else if (netProfitEth >= this.MEDIUM_VALUE_THRESHOLD) {
      console.log(`🔐 Routing: PRIVATE (Medium Value) - Using Flashbots Protect`);
      return this.executeViaPrivateRelay(to, data, options, PrivacyLevel.BASIC);
    } else {
      console.log(`📡 Routing: PUBLIC (Low Value) - Standard mempool`);
      return this.executeViaPublicMempool(to, data, options);
    }
  }

  /**
   * Execute via private relay
   */
  private async executeViaPrivateRelay(
    to: string,
    data: string,
    options: any,
    privacyLevel: PrivacyLevel
  ) {
    const transaction = {
      to,
      data,
      gasLimit: options.gasLimit,
      gasPrice: options.gasPrice,
      value: options.value,
    };

    const result = await this.privateRPCManager.submitPrivateTransaction(
      transaction,
      {
        privacyLevel,
        fastMode: privacyLevel === PrivacyLevel.ENHANCED, // Use fast mode for high value
        maxBlockWait: 5,
        allowPublicFallback: true, // Fallback if private fails
        mevShareOptions: privacyLevel === PrivacyLevel.ENHANCED ? {
          hints: {
            calldata: false,
            contractAddress: false,
            functionSelector: true,
            logs: false,
          },
        } : undefined,
      }
    );

    if (result.success) {
      console.log(`✓ Private transaction submitted: ${result.txHash}`);
      console.log(`  Relay: ${result.relayUsed}`);
      console.log(`  Public visibility: ${result.metadata?.publicMempoolVisible ? 'Yes' : 'No'}`);
    } else {
      console.log(`✗ Private transaction failed: ${result.error}`);
    }

    return result;
  }

  /**
   * Execute via public mempool (fallback)
   */
  private async executeViaPublicMempool(
    to: string,
    data: string,
    options: any
  ) {
    const result = await this.transactionManager.executeTransaction(
      to,
      data,
      options
    );

    if (result.success) {
      console.log(`✓ Public transaction submitted: ${result.txHash}`);
    } else {
      console.log(`✗ Public transaction failed: ${result.error}`);
    }

    return result;
  }

  /**
   * Get routing statistics
   */
  getStatistics() {
    const privateStats = this.privateRPCManager.getStats();
    
    console.log('\n=== Transaction Routing Statistics ===\n');
    
    privateStats.forEach((stats, relayType) => {
      const successRate = stats.totalSubmissions > 0
        ? (stats.successfulInclusions / stats.totalSubmissions * 100).toFixed(2)
        : 0;
      
      console.log(`${relayType}:`);
      console.log(`  Submissions: ${stats.totalSubmissions}`);
      console.log(`  Success Rate: ${successRate}%`);
      console.log(`  Avg Inclusion Time: ${stats.avgInclusionTime}ms`);
      console.log(`  Status: ${stats.isAvailable ? '✓ Available' : '✗ Unavailable'}\n`);
    });
  }
}

/**
 * Example usage
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Smart Transaction Routing with Private RPCs              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // Setup
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.ETHEREUM_RPC_URL || 'http://localhost:8545'
  );
  
  const signer = new Wallet(
    process.env.WALLET_PRIVATE_KEY || Wallet.createRandom().privateKey,
    provider
  );

  const nonceManager = await NonceManager.create(signer);
  const router = new SmartTransactionRouter(provider, signer, nonceManager);

  // Example arbitrage transactions with different profit levels
  const examples = [
    {
      name: 'High-value arbitrage (1.5 ETH profit)',
      to: '0x0000000000000000000000000000000000000001',
      data: '0x',
      profit: ethers.utils.parseEther('1.5'),
      gas: ethers.utils.parseEther('0.05'),
    },
    {
      name: 'Medium-value arbitrage (0.3 ETH profit)',
      to: '0x0000000000000000000000000000000000000002',
      data: '0x',
      profit: ethers.utils.parseEther('0.3'),
      gas: ethers.utils.parseEther('0.02'),
    },
    {
      name: 'Low-value arbitrage (0.05 ETH profit)',
      to: '0x0000000000000000000000000000000000000003',
      data: '0x',
      profit: ethers.utils.parseEther('0.05'),
      gas: ethers.utils.parseEther('0.01'),
    },
  ];

  // Execute examples
  for (const example of examples) {
    console.log(`\n${example.name}`);
    console.log('─'.repeat(60));
    
    try {
      await router.executeArbitrage(
        example.to,
        example.data,
        example.profit,
        example.gas,
        {
          gasLimit: 500000,
        }
      );
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Wait a bit between transactions
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Display statistics
  router.getStatistics();

  console.log('\n✓ Examples completed!\n');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { SmartTransactionRouter };
