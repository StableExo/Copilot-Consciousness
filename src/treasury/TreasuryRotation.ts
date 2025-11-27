/**
 * TreasuryRotation - Debt-Yeet Treasury Management
 *
 * Implements automated treasury rotation with on-chain proof verification.
 * Ensures 70% of profits are verifiably routed through the rotation system.
 *
 * Features:
 * - Automatic profit distribution
 * - On-chain proof generation
 * - Rotation scheduling
 * - Audit trail maintenance
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';

/**
 * Profit entry for tracking
 */
export interface ProfitEntry {
  id: string;
  timestamp: number;
  amount: bigint;
  source: 'arbitrage' | 'liquidation' | 'mev' | 'other';
  txHash: string;
  verified: boolean;
}

/**
 * Rotation destination
 */
export interface RotationDestination {
  id: string;
  address: string;
  name: string;
  percentage: number;
  type: 'treasury' | 'staking' | 'burn' | 'reserve' | 'operations';
  active: boolean;
}

/**
 * Rotation transaction
 */
export interface RotationTransaction {
  id: string;
  timestamp: number;
  profitIds: string[];
  totalAmount: bigint;
  distributions: Distribution[];
  proofHash: string;
  onChainTxHash?: string;
  status: 'pending' | 'submitted' | 'confirmed' | 'failed';
}

/**
 * Distribution entry
 */
export interface Distribution {
  destinationId: string;
  address: string;
  amount: bigint;
  percentage: number;
}

/**
 * On-chain proof
 */
export interface OnChainProof {
  rotationId: string;
  merkleRoot: string;
  distributions: {
    address: string;
    amount: string;
    proof: string[];
  }[];
  timestamp: number;
  signature?: string;
}

/**
 * Treasury statistics
 */
export interface TreasuryStats {
  totalProfits: bigint;
  totalRotated: bigint;
  rotationRate: number;
  verifiedPercentage: number;
  pendingAmount: bigint;
  rotationCount: number;
  destinationBreakdown: Record<string, bigint>;
}

/**
 * Treasury configuration
 */
export interface TreasuryConfig {
  minRotationAmount?: bigint;
  rotationIntervalMs?: number;
  targetRotationPercentage?: number;
  enableAutoRotation?: boolean;
  proofRetentionDays?: number;
}

/**
 * Treasury Rotation Service
 */
export class TreasuryRotation extends EventEmitter {
  private profits: Map<string, ProfitEntry> = new Map();
  private destinations: Map<string, RotationDestination> = new Map();
  private rotations: Map<string, RotationTransaction> = new Map();
  private proofs: Map<string, OnChainProof> = new Map();
  private config: Required<TreasuryConfig>;
  private rotationInterval: NodeJS.Timeout | null = null;
  private running: boolean = false;

  constructor(config: TreasuryConfig = {}) {
    super();

    this.config = {
      minRotationAmount: config.minRotationAmount ?? BigInt(1e16), // 0.01 ETH
      rotationIntervalMs: config.rotationIntervalMs ?? 3600000, // 1 hour
      targetRotationPercentage: config.targetRotationPercentage ?? 70,
      enableAutoRotation: config.enableAutoRotation ?? true,
      proofRetentionDays: config.proofRetentionDays ?? 365,
    };

    // Setup default destinations
    this.setupDefaultDestinations();
  }

  /**
   * Setup default rotation destinations
   * 
   * Per LEGAL_POSITION.md - 70% of profits are allocated to US Treasury instrument purchases
   * This means converting crypto profits to fiat and purchasing:
   * - Treasury Bills (T-Bills)
   * - Treasury Notes (T-Notes)  
   * - Treasury Bonds (T-Bonds)
   * - I-Bonds or other Treasury securities
   * 
   * The on-chain "treasury" address is a staging wallet that accumulates funds
   * before off-ramping to fiat for TreasuryDirect.gov purchases.
   * 
   * Flow: Profits -> Staging Wallet -> Off-ramp to USD -> TreasuryDirect.gov -> Buy T-Bills
   */
  private setupDefaultDestinations(): void {
    // Load addresses from environment or use clear placeholders
    const treasuryAddress = process.env.TREASURY_STAGING_ADDRESS || '0x0000000000000000000000000000000000000001';
    const operationsAddress = process.env.OPERATIONS_ADDRESS || '0x0000000000000000000000000000000000000002';
    const reserveAddress = process.env.RESERVE_ADDRESS || '0x0000000000000000000000000000000000000003';

    // Warn if using placeholder addresses in production
    if (process.env.NODE_ENV === 'production') {
      if (treasuryAddress.startsWith('0x000000000000000000000000000000000000000')) {
        console.warn('[TreasuryRotation] WARNING: Using placeholder treasury address. Set TREASURY_STAGING_ADDRESS env var!');
      }
      if (operationsAddress.startsWith('0x000000000000000000000000000000000000000')) {
        console.warn('[TreasuryRotation] WARNING: Using placeholder operations address. Set OPERATIONS_ADDRESS env var!');
      }
      if (reserveAddress.startsWith('0x000000000000000000000000000000000000000')) {
        console.warn('[TreasuryRotation] WARNING: Using placeholder reserve address. Set RESERVE_ADDRESS env var!');
      }
    }

    // US Debt-Yeet Fund - 70% (per LEGAL_POSITION.md)
    // This staging wallet accumulates funds for off-ramping to TreasuryDirect.gov
    // Actual Treasury purchases are made via TreasuryDirect.gov after fiat conversion
    this.addDestination({
      id: uuidv4(),
      address: treasuryAddress,
      name: 'US Debt-Yeet Fund (TreasuryDirect Staging)',
      percentage: 70,
      type: 'treasury',
      active: true,
    });

    // Operations fund - 20%
    this.addDestination({
      id: uuidv4(),
      address: operationsAddress,
      name: 'Operations Fund',
      percentage: 20,
      type: 'operations',
      active: true,
    });

    // Strategic Reserve - 10%
    this.addDestination({
      id: uuidv4(),
      address: reserveAddress,
      name: 'Strategic Reserve',
      percentage: 10,
      type: 'reserve',
      active: true,
    });
  }

  /**
   * Add a rotation destination
   */
  addDestination(destination: RotationDestination): void {
    this.destinations.set(destination.id, destination);
    this.validateDestinationPercentages();
  }

  /**
   * Remove a rotation destination
   */
  removeDestination(id: string): boolean {
    return this.destinations.delete(id);
  }

  /**
   * Update destination percentage
   */
  updateDestination(id: string, updates: Partial<RotationDestination>): boolean {
    const destination = this.destinations.get(id);
    if (!destination) return false;

    this.destinations.set(id, { ...destination, ...updates });
    this.validateDestinationPercentages();
    return true;
  }

  /**
   * Validate destination percentages sum to 100
   */
  private validateDestinationPercentages(): void {
    const activeDestinations = Array.from(this.destinations.values()).filter((d) => d.active);
    const total = activeDestinations.reduce((sum, d) => sum + d.percentage, 0);

    if (total !== 100) {
      console.warn(`[TreasuryRotation] Destination percentages sum to ${total}%, should be 100%`);
    }
  }

  /**
   * Record a profit entry
   */
  recordProfit(entry: Omit<ProfitEntry, 'id' | 'timestamp' | 'verified'>): string {
    const profit: ProfitEntry = {
      ...entry,
      id: uuidv4(),
      timestamp: Date.now(),
      verified: false,
    };

    this.profits.set(profit.id, profit);
    this.emit('profit-recorded', profit);

    // Trigger rotation check
    if (this.config.enableAutoRotation) {
      this.checkRotationTrigger();
    }

    return profit.id;
  }

  /**
   * Check if rotation should be triggered
   */
  private checkRotationTrigger(): void {
    const unrotatedAmount = this.calculateUnrotatedAmount();

    if (unrotatedAmount >= this.config.minRotationAmount) {
      this.executeRotation().catch((err) => {
        console.error('[TreasuryRotation] Auto-rotation failed:', err.message);
      });
    }
  }

  /**
   * Calculate unrotated profit amount
   */
  private calculateUnrotatedAmount(): bigint {
    const rotatedProfitIds = new Set<string>();
    for (const rotation of this.rotations.values()) {
      for (const profitId of rotation.profitIds) {
        rotatedProfitIds.add(profitId);
      }
    }

    let unrotated = 0n;
    for (const profit of this.profits.values()) {
      if (!rotatedProfitIds.has(profit.id)) {
        unrotated += profit.amount;
      }
    }

    return unrotated;
  }

  /**
   * Execute profit rotation
   */
  async executeRotation(): Promise<RotationTransaction> {
    const unrotatedProfits = this.getUnrotatedProfits();

    if (unrotatedProfits.length === 0) {
      throw new Error('No unrotated profits available');
    }

    const totalAmount = unrotatedProfits.reduce((sum, p) => sum + p.amount, 0n);

    if (totalAmount < this.config.minRotationAmount) {
      throw new Error(
        `Rotation amount ${totalAmount} below minimum ${this.config.minRotationAmount}`
      );
    }

    // Calculate distributions
    const distributions = this.calculateDistributions(totalAmount);

    // Generate proof hash
    const proofHash = this.generateProofHash(distributions, unrotatedProfits);

    // Create rotation transaction
    const rotation: RotationTransaction = {
      id: uuidv4(),
      timestamp: Date.now(),
      profitIds: unrotatedProfits.map((p) => p.id),
      totalAmount,
      distributions,
      proofHash,
      status: 'pending',
    };

    this.rotations.set(rotation.id, rotation);

    // Generate on-chain proof
    const proof = this.generateOnChainProof(rotation);
    this.proofs.set(rotation.id, proof);

    this.emit('rotation-created', rotation);

    // Mark profits as verified
    for (const profit of unrotatedProfits) {
      profit.verified = true;
      this.profits.set(profit.id, profit);
    }

    console.log(`[TreasuryRotation] Rotation created: ${rotation.id} (${totalAmount} wei)`);

    return rotation;
  }

  /**
   * Get unrotated profits
   */
  private getUnrotatedProfits(): ProfitEntry[] {
    const rotatedProfitIds = new Set<string>();
    for (const rotation of this.rotations.values()) {
      for (const profitId of rotation.profitIds) {
        rotatedProfitIds.add(profitId);
      }
    }

    return Array.from(this.profits.values()).filter((p) => !rotatedProfitIds.has(p.id));
  }

  /**
   * Calculate distributions based on destinations
   */
  private calculateDistributions(totalAmount: bigint): Distribution[] {
    const activeDestinations = Array.from(this.destinations.values()).filter((d) => d.active);

    return activeDestinations.map((dest) => ({
      destinationId: dest.id,
      address: dest.address,
      amount: (totalAmount * BigInt(dest.percentage)) / 100n,
      percentage: dest.percentage,
    }));
  }

  /**
   * Generate proof hash for rotation
   */
  private generateProofHash(distributions: Distribution[], profits: ProfitEntry[]): string {
    const data = JSON.stringify({
      distributions: distributions.map((d) => ({
        address: d.address,
        amount: d.amount.toString(),
        percentage: d.percentage,
      })),
      profits: profits.map((p) => ({
        id: p.id,
        amount: p.amount.toString(),
        txHash: p.txHash,
      })),
      timestamp: Date.now(),
    });

    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate on-chain proof structure
   * 
   * Note: This is a simplified Merkle tree implementation for demonstration.
   * In production, use a proper Merkle tree library (e.g., merkletreejs) with:
   * - Sorted pairs to prevent order-dependent vulnerabilities
   * - Domain separation to prevent leaf/node confusion
   * - Proper proof verification logic
   */
  private generateOnChainProof(rotation: RotationTransaction): OnChainProof {
    // Hash each leaf with a prefix to prevent second preimage attacks
    const LEAF_PREFIX = Buffer.from('00', 'hex');
    const NODE_PREFIX = Buffer.from('01', 'hex');

    const leaves = rotation.distributions.map((d) =>
      createHash('sha256')
        .update(Buffer.concat([LEAF_PREFIX, Buffer.from(`${d.address}:${d.amount.toString()}`)]))
        .digest('hex')
    );

    // Build merkle root with node prefix
    const merkleRoot = createHash('sha256')
      .update(Buffer.concat([NODE_PREFIX, Buffer.from(leaves.sort().join(''))]))
      .digest('hex');

    return {
      rotationId: rotation.id,
      merkleRoot,
      distributions: rotation.distributions.map((d, i) => ({
        address: d.address,
        amount: d.amount.toString(),
        proof: [leaves[i]], // Simplified proof - production would need full path
      })),
      timestamp: rotation.timestamp,
    };
  }

  /**
   * Submit rotation to blockchain (stub)
   * 
   * Note: This is a stub implementation. In production, this would:
   * 1. Build and sign actual blockchain transactions
   * 2. Submit to the configured network
   * 3. Return the actual transaction hash
   */
  async submitRotation(rotationId: string): Promise<string> {
    const rotation = this.rotations.get(rotationId);
    if (!rotation) {
      throw new Error('Rotation not found');
    }

    // In production, this would submit to blockchain and return actual tx hash
    // This stub generates a deterministic hash for testing purposes only
    rotation.status = 'submitted';
    rotation.onChainTxHash = `0x${createHash('sha256')
      .update(rotationId + rotation.timestamp.toString())
      .digest('hex')}`;

    this.rotations.set(rotationId, rotation);
    this.emit('rotation-submitted', rotation);

    // Simulate confirmation (in production, this would be event-driven)
    setTimeout(() => {
      rotation.status = 'confirmed';
      this.rotations.set(rotationId, rotation);
      this.emit('rotation-confirmed', rotation);
    }, 5000);

    return rotation.onChainTxHash;
  }

  /**
   * Get treasury statistics
   */
  getStats(): TreasuryStats {
    let totalProfits = 0n;
    let verifiedCount = 0;

    for (const profit of this.profits.values()) {
      totalProfits += profit.amount;
      if (profit.verified) verifiedCount++;
    }

    let totalRotated = 0n;
    const destinationBreakdown: Record<string, bigint> = {};

    for (const rotation of this.rotations.values()) {
      if (rotation.status === 'confirmed') {
        totalRotated += rotation.totalAmount;

        for (const dist of rotation.distributions) {
          const dest = this.destinations.get(dist.destinationId);
          if (dest) {
            destinationBreakdown[dest.name] = (destinationBreakdown[dest.name] || 0n) + dist.amount;
          }
        }
      }
    }

    const pendingAmount = this.calculateUnrotatedAmount();
    const rotationRate = totalProfits > 0n ? Number((totalRotated * 100n) / totalProfits) : 0;

    return {
      totalProfits,
      totalRotated,
      rotationRate,
      verifiedPercentage: this.profits.size > 0 ? (verifiedCount / this.profits.size) * 100 : 0,
      pendingAmount,
      rotationCount: Array.from(this.rotations.values()).filter((r) => r.status === 'confirmed')
        .length,
      destinationBreakdown,
    };
  }

  /**
   * Verify rotation meets 70% routing requirement
   */
  verifyRoutingCompliance(): { compliant: boolean; percentage: number; details: string } {
    const stats = this.getStats();
    const mainTreasuryDest = Array.from(this.destinations.values()).find(
      (d) => d.type === 'treasury'
    );

    if (!mainTreasuryDest) {
      return {
        compliant: false,
        percentage: 0,
        details: 'No main treasury destination configured',
      };
    }

    const mainTreasuryAmount = stats.destinationBreakdown[mainTreasuryDest.name] || 0n;
    const percentage =
      stats.totalRotated > 0n ? Number((mainTreasuryAmount * 100n) / stats.totalRotated) : 0;

    return {
      compliant: percentage >= this.config.targetRotationPercentage,
      percentage,
      details: `${percentage}% routed to treasury (target: ${this.config.targetRotationPercentage}%)`,
    };
  }

  /**
   * Get proof for verification
   */
  getProof(rotationId: string): OnChainProof | null {
    return this.proofs.get(rotationId) || null;
  }

  /**
   * Get rotation by ID
   */
  getRotation(rotationId: string): RotationTransaction | null {
    return this.rotations.get(rotationId) || null;
  }

  /**
   * Get all rotations
   */
  getAllRotations(): RotationTransaction[] {
    return Array.from(this.rotations.values());
  }

  /**
   * Get destinations
   */
  getDestinations(): RotationDestination[] {
    return Array.from(this.destinations.values());
  }

  /**
   * Start auto-rotation scheduler
   */
  start(): void {
    if (this.running) return;

    this.running = true;
    this.rotationInterval = setInterval(() => {
      this.checkRotationTrigger();
    }, this.config.rotationIntervalMs);

    console.log('[TreasuryRotation] Auto-rotation started');
    this.emit('started');
  }

  /**
   * Stop auto-rotation scheduler
   */
  stop(): void {
    if (!this.running) return;

    this.running = false;
    if (this.rotationInterval) {
      clearInterval(this.rotationInterval);
      this.rotationInterval = null;
    }

    console.log('[TreasuryRotation] Auto-rotation stopped');
    this.emit('stopped');
  }

  /**
   * Check if running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Export audit trail
   */
  exportAuditTrail(): string {
    const stats = this.getStats();
    const trail = {
      exportTimestamp: Date.now(),
      profits: Array.from(this.profits.values()).map((p) => ({
        ...p,
        amount: p.amount.toString(),
      })),
      rotations: Array.from(this.rotations.values()).map((r) => ({
        ...r,
        totalAmount: r.totalAmount.toString(),
        distributions: r.distributions.map((d) => ({
          ...d,
          amount: d.amount.toString(),
        })),
      })),
      proofs: Array.from(this.proofs.values()),
      stats: {
        ...stats,
        totalProfits: stats.totalProfits.toString(),
        totalRotated: stats.totalRotated.toString(),
        pendingAmount: stats.pendingAmount.toString(),
        destinationBreakdown: Object.fromEntries(
          Object.entries(stats.destinationBreakdown).map(([k, v]) => [k, v.toString()])
        ),
      },
      compliance: this.verifyRoutingCompliance(),
    };

    return JSON.stringify(trail, null, 2);
  }
}
