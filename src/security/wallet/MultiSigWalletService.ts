/**
 * Multi-Signature Wallet Service
 * Gnosis Safe Integration with M-of-N threshold signatures
 */

import { JsonRpcProvider, ZeroAddress, ethers, getBytes, TypedDataEncoder, concat } from 'ethers';

export interface MultiSigConfig {
  safeAddress: string;
  threshold: number;
  owners: string[];
  rpcUrl: string;
  chainId: number;
}

export interface TransactionProposal {
  id: string;
  to: string;
  value: string;
  data: string;
  operation: number; // 0 = Call, 1 = DelegateCall
  safeTxGas: string;
  baseGas: string;
  gasPrice: string;
  gasToken: string;
  refundReceiver: string;
  nonce: number;
  signatures: Map<string, string>;
  approvalCount: number;
  executed: boolean;
  createdAt: Date;
  executedAt?: Date;
}

export interface SpendingLimit {
  token: string;
  amount: string;
  resetPeriod: number; // in seconds
  spent: string;
  lastReset: Date;
}

export class MultiSigWalletService {
  private config: MultiSigConfig;
  private provider: JsonRpcProvider;
  private proposals: Map<string, TransactionProposal>;
  private spendingLimits: Map<string, SpendingLimit>;

  // Gnosis Safe ABI (simplified - key methods)
  private readonly SAFE_ABI = [
    'function getThreshold() public view returns (uint256)',
    'function getOwners() public view returns (address[])',
    'function execTransaction(address to, uint256 value, bytes calldata data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address payable refundReceiver, bytes memory signatures) public payable returns (bool)',
    'function approveHash(bytes32 hashToApprove) external',
    'function nonce() public view returns (uint256)',
  ];

  constructor(config: MultiSigConfig) {
    this.config = config;
    this.provider = new JsonRpcProvider(config.rpcUrl);
    this.proposals = new Map();
    this.spendingLimits = new Map();
  }

  /**
   * Create transaction proposal
   */
  async createProposal(
    to: string,
    value: string,
    data: string,
    description?: string
  ): Promise<TransactionProposal> {
    const safe = new ethers.Contract(this.config.safeAddress, this.SAFE_ABI, this.provider);

    const nonce = await safe.nonce();

    const proposal: TransactionProposal = {
      id: this.generateProposalId(),
      to,
      value,
      data,
      operation: 0, // Call
      safeTxGas: '0',
      baseGas: '0',
      gasPrice: '0',
      gasToken: ZeroAddress,
      refundReceiver: ZeroAddress,
      nonce: nonce.toNumber(),
      signatures: new Map(),
      approvalCount: 0,
      executed: false,
      createdAt: new Date(),
    };

    this.proposals.set(proposal.id, proposal);
    return proposal;
  }

  /**
   * Sign transaction proposal
   */
  async signProposal(proposalId: string, signer: ethers.Wallet): Promise<boolean> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error('Proposal not found');
    }

    if (proposal.executed) {
      throw new Error('Proposal already executed');
    }

    // Check if signer is an owner
    if (!this.config.owners.includes(signer.address)) {
      throw new Error('Signer is not an owner');
    }

    // Generate transaction hash
    const txHash = await this.getTransactionHash(proposal);

    // Sign the hash
    const signature = await signer.signMessage(getBytes(txHash));

    // Store signature
    proposal.signatures.set(signer.address, signature);
    proposal.approvalCount = proposal.signatures.size;

    return proposal.approvalCount >= this.config.threshold;
  }

  /**
   * Execute transaction if threshold is met
   */
  async executeProposal(
    proposalId: string,
    executor: ethers.Wallet
  ): Promise<ethers.ContractTransaction> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error('Proposal not found');
    }

    if (proposal.executed) {
      throw new Error('Proposal already executed');
    }

    if (proposal.approvalCount < this.config.threshold) {
      throw new Error(
        `Insufficient signatures: ${proposal.approvalCount}/${this.config.threshold}`
      );
    }

    // Check spending limits
    if (BigInt(proposal.value) > 0n) {
      await this.checkSpendingLimit(ZeroAddress, proposal.value);
    }

    // Combine signatures
    const signatures = this.combineSignatures(proposal);

    // Execute transaction
    const safe = new ethers.Contract(
      this.config.safeAddress,
      this.SAFE_ABI,
      executor.connect(this.provider)
    );

    const tx = await safe.execTransaction(
      proposal.to,
      proposal.value,
      proposal.data,
      proposal.operation,
      proposal.safeTxGas,
      proposal.baseGas,
      proposal.gasPrice,
      proposal.gasToken,
      proposal.refundReceiver,
      signatures
    );

    proposal.executed = true;
    proposal.executedAt = new Date();

    return tx;
  }

  /**
   * Set spending limit for token
   */
  setSpendingLimit(token: string, amount: string, resetPeriod: number): void {
    this.spendingLimits.set(token, {
      token,
      amount,
      resetPeriod,
      spent: '0',
      lastReset: new Date(),
    });
  }

  /**
   * Check spending limit
   */
  private async checkSpendingLimit(token: string, amount: string): Promise<void> {
    const limit = this.spendingLimits.get(token);
    if (!limit) return;

    // Check if reset period has passed
    const now = Date.now();
    const timeSinceReset = now - limit.lastReset.getTime();
    if (timeSinceReset > limit.resetPeriod * 1000) {
      limit.spent = '0';
      limit.lastReset = new Date();
    }

    // Check if adding this amount would exceed limit
    const newSpent = BigInt(limit.spent) + BigInt(amount);
    const limitAmount = BigInt(limit.amount);

    if (newSpent > limitAmount) {
      throw new Error(`Spending limit exceeded for ${token}`);
    }

    limit.spent = newSpent.toString();
  }

  /**
   * Get transaction hash for signing
   */
  private async getTransactionHash(proposal: TransactionProposal): Promise<string> {
    const safe = new ethers.Contract(this.config.safeAddress, this.SAFE_ABI, this.provider);

    const domain = {
      verifyingContract: this.config.safeAddress,
      chainId: this.config.chainId,
    };

    const types = {
      SafeTx: [
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'data', type: 'bytes' },
        { name: 'operation', type: 'uint8' },
        { name: 'safeTxGas', type: 'uint256' },
        { name: 'baseGas', type: 'uint256' },
        { name: 'gasPrice', type: 'uint256' },
        { name: 'gasToken', type: 'address' },
        { name: 'refundReceiver', type: 'address' },
        { name: 'nonce', type: 'uint256' },
      ],
    };

    const message = {
      to: proposal.to,
      value: proposal.value,
      data: proposal.data,
      operation: proposal.operation,
      safeTxGas: proposal.safeTxGas,
      baseGas: proposal.baseGas,
      gasPrice: proposal.gasPrice,
      gasToken: proposal.gasToken,
      refundReceiver: proposal.refundReceiver,
      nonce: proposal.nonce,
    };

    return TypedDataEncoder.hash(domain, types, message);
  }

  /**
   * Combine signatures for execution
   */
  private combineSignatures(proposal: TransactionProposal): string {
    // Sort addresses and combine signatures
    const sortedSignatures = Array.from(proposal.signatures.entries())
      .sort((a, b) => a[0].toLowerCase().localeCompare(b[0].toLowerCase()))
      .map(([_, sig]) => sig);

    return concat(sortedSignatures);
  }

  /**
   * Get pending proposals
   */
  getPendingProposals(): TransactionProposal[] {
    return Array.from(this.proposals.values())
      .filter((p) => !p.executed)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get proposal by ID
   */
  getProposal(id: string): TransactionProposal | undefined {
    return this.proposals.get(id);
  }

  /**
   * Generate unique proposal ID
   */
  private generateProposalId(): string {
    return `proposal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Verify Safe configuration
   */
  async verifySafeConfig(): Promise<boolean> {
    try {
      const safe = new ethers.Contract(this.config.safeAddress, this.SAFE_ABI, this.provider);

      const threshold = await safe.getThreshold();
      const owners = await safe.getOwners();

      return (
        threshold.toNumber() === this.config.threshold &&
        owners.length === this.config.owners.length
      );
    } catch (error) {
      console.error('Error verifying Safe config:', error);
      return false;
    }
  }
}
