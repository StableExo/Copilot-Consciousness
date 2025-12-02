/**
 * AddressRegistry - Track and classify blockchain addresses
 * 
 * Maintains reputation and classification for all addresses we interact with:
 * - WHITELISTED: Known good (our wallets, verified DEXs)
 * - GRAYLISTED: Unknown but monitored
 * - BLACKLISTED: Known malicious or suspicious
 * 
 * Learns from interactions and adjusts reputation over time.
 */

import { logger } from '../utils/logger';

export enum AddressStatus {
  WHITELISTED = 'WHITELISTED',
  GRAYLISTED = 'GRAYLISTED',
  BLACKLISTED = 'BLACKLISTED',
}

export interface AddressRecord {
  address: string;
  status: AddressStatus;
  reputation: number; // -1.0 to 1.0 (negative = bad, positive = good)
  firstSeen: number;
  lastSeen: number;
  interactionCount: number;
  notes: string;
  tags: string[];
  
  // Behavioral tracking
  totalValueReceived: bigint;
  totalValueSent: bigint;
  averageGasPrice: bigint;
  suspiciousActions: string[];
}

export interface RegistryStatistics {
  totalAddresses: number;
  whitelisted: number;
  graylisted: number;
  blacklisted: number;
  highReputation: number; // reputation > 0.5
  lowReputation: number; // reputation < -0.5
}

/**
 * Address Classification and Reputation System
 */
export class AddressRegistry {
  private addresses: Map<string, AddressRecord> = new Map();
  
  // Predefined known-good addresses (Base network)
  private readonly KNOWN_GOOD_ADDRESSES: Record<string, string> = {
    // Base canonical contracts
    '0x4200000000000000000000000000000000000006': 'WETH (Canonical)',
    '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 'USDC (Official)',
    
    // DEX routers
    '0x2626664c2603336e57b271c5c0b26f421741e481': 'Uniswap V3 Router',
    '0x6bded42c6da8fbf0d2ba55b2fa120c5e0c8d7891': 'SushiSwap Router',
    
    // Aave
    '0xa238dd80c259a72e81d7e4664a9801593f98d1c5': 'Aave V3 Pool',
    '0xe20fcbdbffc4dd138ce8b2e6fbb6cb49777ad64d': 'Aave V3 Addresses Provider',
  };

  constructor() {
    // Initialize with known good addresses
    this.initializeKnownAddresses();
    logger.info('[AddressRegistry] Initialized', 'SECURITY');
  }

  /**
   * Initialize known good addresses
   */
  private initializeKnownAddresses(): void {
    for (const [address, name] of Object.entries(this.KNOWN_GOOD_ADDRESSES)) {
      this.addAddress(address.toLowerCase(), AddressStatus.WHITELISTED, name);
    }
  }

  /**
   * Add or update an address
   */
  addAddress(address: string, status: AddressStatus, notes: string = ''): void {
    const addr = address.toLowerCase();
    const existing = this.addresses.get(addr);

    if (existing) {
      // Update existing
      existing.status = status;
      existing.notes = notes;
      existing.lastSeen = Date.now();
    } else {
      // Create new
      const reputation = this.getInitialReputation(status);
      
      this.addresses.set(addr, {
        address: addr,
        status,
        reputation,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        interactionCount: 0,
        notes,
        tags: [],
        totalValueReceived: BigInt(0),
        totalValueSent: BigInt(0),
        averageGasPrice: BigInt(0),
        suspiciousActions: [],
      });

      logger.debug(`[AddressRegistry] Added ${addr} as ${status}`, 'SECURITY');
    }
  }

  /**
   * Get initial reputation based on status
   */
  private getInitialReputation(status: AddressStatus): number {
    switch (status) {
      case AddressStatus.WHITELISTED:
        return 1.0;
      case AddressStatus.GRAYLISTED:
        return 0.0;
      case AddressStatus.BLACKLISTED:
        return -1.0;
    }
  }

  /**
   * Check if address exists in registry
   */
  hasAddress(address: string): boolean {
    return this.addresses.has(address.toLowerCase());
  }

  /**
   * Get address record
   */
  getAddress(address: string): AddressRecord | undefined {
    return this.addresses.get(address.toLowerCase());
  }

  /**
   * Get address status
   */
  getStatus(address: string): AddressStatus {
    const record = this.addresses.get(address.toLowerCase());
    return record?.status || AddressStatus.GRAYLISTED;
  }

  /**
   * Get address reputation
   */
  getReputation(address: string): number {
    const record = this.addresses.get(address.toLowerCase());
    return record?.reputation || 0.0;
  }

  /**
   * Update address reputation
   */
  updateReputation(address: string, delta: number): void {
    const addr = address.toLowerCase();
    const record = this.addresses.get(addr);
    
    if (!record) {
      // Add as graylisted if not exists
      this.addAddress(addr, AddressStatus.GRAYLISTED, 'Auto-added on reputation update');
      return;
    }

    // Update reputation (clamp between -1 and 1)
    record.reputation = Math.max(-1.0, Math.min(1.0, record.reputation + delta));
    record.lastSeen = Date.now();

    // Auto-update status based on reputation
    if (record.reputation <= -0.7 && record.status !== AddressStatus.BLACKLISTED) {
      record.status = AddressStatus.BLACKLISTED;
      logger.warn(`[AddressRegistry] ${addr} auto-blacklisted (reputation: ${record.reputation.toFixed(2)})`, 'SECURITY');
    } else if (record.reputation >= 0.7 && record.status === AddressStatus.GRAYLISTED) {
      record.status = AddressStatus.WHITELISTED;
      logger.info(`[AddressRegistry] ${addr} promoted to whitelist (reputation: ${record.reputation.toFixed(2)})`, 'SECURITY');
    } else if (record.reputation > -0.3 && record.reputation < 0.3 && record.status !== AddressStatus.GRAYLISTED) {
      record.status = AddressStatus.GRAYLISTED;
      logger.info(`[AddressRegistry] ${addr} moved to graylist (reputation: ${record.reputation.toFixed(2)})`, 'SECURITY');
    }
  }

  /**
   * Record an interaction with address
   */
  recordInteraction(
    address: string,
    value: bigint,
    gasPrice: bigint,
    direction: 'incoming' | 'outgoing'
  ): void {
    const addr = address.toLowerCase();
    let record = this.addresses.get(addr);

    if (!record) {
      this.addAddress(addr, AddressStatus.GRAYLISTED, 'First interaction');
      record = this.addresses.get(addr)!;
    }

    record.interactionCount++;
    record.lastSeen = Date.now();

    if (direction === 'incoming') {
      record.totalValueReceived += value;
    } else {
      record.totalValueSent += value;
    }

    // Update average gas price
    const count = BigInt(record.interactionCount);
    record.averageGasPrice = (record.averageGasPrice * (count - BigInt(1)) + gasPrice) / count;
  }

  /**
   * Flag suspicious action
   */
  flagSuspicious(address: string, action: string): void {
    const addr = address.toLowerCase();
    let record = this.addresses.get(addr);

    if (!record) {
      this.addAddress(addr, AddressStatus.GRAYLISTED, 'Suspicious action detected');
      record = this.addresses.get(addr)!;
    }

    record.suspiciousActions.push(`${new Date().toISOString()}: ${action}`);
    
    // Decrease reputation for suspicious actions
    this.updateReputation(addr, -0.2);
    
    logger.warn(`[AddressRegistry] Suspicious action from ${addr}: ${action}`, 'SECURITY');
  }

  /**
   * Add tag to address
   */
  addTag(address: string, tag: string): void {
    const addr = address.toLowerCase();
    const record = this.addresses.get(addr);
    
    if (record && !record.tags.includes(tag)) {
      record.tags.push(tag);
    }
  }

  /**
   * Get all addresses with specific status
   */
  getAddressesByStatus(status: AddressStatus): AddressRecord[] {
    return Array.from(this.addresses.values()).filter(record => record.status === status);
  }

  /**
   * Get addresses with low reputation
   */
  getSuspiciousAddresses(threshold: number = -0.3): AddressRecord[] {
    return Array.from(this.addresses.values()).filter(record => record.reputation < threshold);
  }

  /**
   * Get recently seen addresses
   */
  getRecentAddresses(since: number = Date.now() - 86400000): AddressRecord[] {
    return Array.from(this.addresses.values())
      .filter(record => record.lastSeen >= since)
      .sort((a, b) => b.lastSeen - a.lastSeen);
  }

  /**
   * Check if address is similar to ours (poisoning attack)
   */
  isSimilarAddress(address: string, ourAddress: string, threshold: number = 6): boolean {
    const addr1 = address.toLowerCase();
    const addr2 = ourAddress.toLowerCase();

    // Check first N characters
    const prefixMatch = addr1.substring(0, threshold) === addr2.substring(0, threshold);
    
    // Check last N characters
    const suffixMatch = addr1.substring(42 - threshold) === addr2.substring(42 - threshold);

    return prefixMatch || suffixMatch;
  }

  /**
   * Get registry statistics
   */
  getStatistics(): RegistryStatistics {
    const addresses = Array.from(this.addresses.values());
    
    return {
      totalAddresses: addresses.length,
      whitelisted: addresses.filter(a => a.status === AddressStatus.WHITELISTED).length,
      graylisted: addresses.filter(a => a.status === AddressStatus.GRAYLISTED).length,
      blacklisted: addresses.filter(a => a.status === AddressStatus.BLACKLISTED).length,
      highReputation: addresses.filter(a => a.reputation > 0.5).length,
      lowReputation: addresses.filter(a => a.reputation < -0.5).length,
    };
  }

  /**
   * Export registry to JSON
   */
  export(): string {
    const data = Array.from(this.addresses.entries()).map(([address, record]) => ({
      address,
      ...record,
      totalValueReceived: record.totalValueReceived.toString(),
      totalValueSent: record.totalValueSent.toString(),
      averageGasPrice: record.averageGasPrice.toString(),
    }));

    return JSON.stringify(data, null, 2);
  }

  /**
   * Import registry from JSON
   */
  import(json: string): void {
    try {
      const data = JSON.parse(json);
      
      for (const item of data) {
        this.addresses.set(item.address, {
          ...item,
          totalValueReceived: BigInt(item.totalValueReceived),
          totalValueSent: BigInt(item.totalValueSent),
          averageGasPrice: BigInt(item.averageGasPrice),
        });
      }

      logger.info(`[AddressRegistry] Imported ${data.length} addresses`, 'SECURITY');
    } catch (error) {
      logger.error(`[AddressRegistry] Import failed: ${error instanceof Error ? error.message : String(error)}`, 'SECURITY');
    }
  }

  /**
   * Clear all non-whitelisted addresses
   */
  clearGraylisted(): void {
    const toRemove: string[] = [];
    
    for (const [address, record] of this.addresses.entries()) {
      if (record.status === AddressStatus.GRAYLISTED) {
        toRemove.push(address);
      }
    }

    toRemove.forEach(addr => this.addresses.delete(addr));
    
    logger.info(`[AddressRegistry] Cleared ${toRemove.length} graylisted addresses`, 'SECURITY');
  }

  /**
   * Get total addresses count
   */
  size(): number {
    return this.addresses.size;
  }
}
