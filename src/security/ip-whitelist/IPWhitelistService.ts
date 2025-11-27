/**
 * IP Whitelisting Service
 *
 * Provides IP-based access control with optional geolocation features.
 * Geolocation is disabled by default for better compatibility.
 * To enable geolocation, set enableGeolocation=true in the constructor.
 */

import { Address4, Address6 } from 'ip-address';

export interface IPWhitelistEntry {
  id: string;
  cidr: string;
  description: string;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

export interface IPCheckResult {
  allowed: boolean;
  reason?: string;
  country?: string;
  city?: string;
  isVPN?: boolean;
}

export interface IPWhitelistConfig {
  vpnDetectionEnabled?: boolean;
  enableGeolocation?: boolean;
  allowByDefault?: boolean;
  /** Optional logger function for warnings. Defaults to console.warn if not provided. */
  logger?: (message: string) => void;
}

// Cache for geoip-lite module to avoid repeated require attempts
let geoipModule: { lookup: (ip: string) => { country: string; city: string } | null } | null = null;
let geoipLoadAttempted = false;

export class IPWhitelistService {
  private whitelist: Map<string, IPWhitelistEntry>;
  private blockedCountries: Set<string>;
  private vpnDetectionEnabled: boolean;
  private enableGeolocation: boolean;
  private allowByDefault: boolean;
  private logger: (message: string) => void;

  constructor(config: IPWhitelistConfig | boolean = false) {
    // Support legacy boolean parameter for backward compatibility
    if (typeof config === 'boolean') {
      config = { vpnDetectionEnabled: config };
    }

    this.whitelist = new Map();
    this.blockedCountries = new Set();
    this.vpnDetectionEnabled = config.vpnDetectionEnabled ?? false;
    this.enableGeolocation = config.enableGeolocation ?? false;
    this.allowByDefault = config.allowByDefault ?? true;
    this.logger = config.logger ?? console.warn.bind(console);
  }

  /**
   * Add IP or CIDR range to whitelist
   */
  addToWhitelist(entry: Omit<IPWhitelistEntry, 'id' | 'createdAt'>): string {
    const id = `wl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const whitelistEntry: IPWhitelistEntry = {
      ...entry,
      id,
      createdAt: new Date(),
    };

    this.whitelist.set(id, whitelistEntry);
    return id;
  }

  /**
   * Remove from whitelist
   */
  removeFromWhitelist(id: string): boolean {
    return this.whitelist.delete(id);
  }

  /**
   * Check if IP is whitelisted
   */
  isWhitelisted(ip: string): boolean {
    for (const entry of this.whitelist.values()) {
      if (!entry.isActive) continue;

      // Check expiration
      if (entry.expiresAt && entry.expiresAt < new Date()) {
        continue;
      }

      if (this.ipMatchesCIDR(ip, entry.cidr)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if IP is allowed (whitelist + optional geolocation + VPN check)
   */
  checkIP(ip: string): IPCheckResult {
    // Check whitelist first
    if (this.isWhitelisted(ip)) {
      return { allowed: true };
    }

    // VPN detection (simplified - would integrate with service like IPHub)
    const isVPN = this.vpnDetectionEnabled ? this.detectVPN(ip) : false;
    if (isVPN) {
      return {
        allowed: false,
        reason: 'VPN/Proxy detected',
        isVPN: true,
      };
    }

    // Geolocation-based checks (only if enabled)
    if (this.enableGeolocation && this.blockedCountries.size > 0) {
      // Try to load geoip-lite module (cached after first attempt)
      if (!geoipLoadAttempted) {
        geoipLoadAttempted = true;
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          geoipModule = require('geoip-lite');
        } catch {
          this.logger(
            'Geolocation enabled but geoip-lite not installed. Install with: npm install geoip-lite'
          );
        }
      }

      if (geoipModule) {
        const geo = geoipModule.lookup(ip);

        if (!geo) {
          return {
            allowed: false,
            reason: 'Unable to determine IP location',
          };
        }

        // Check blocked countries
        if (this.blockedCountries.has(geo.country)) {
          return {
            allowed: false,
            reason: `Access from ${geo.country} is blocked`,
            country: geo.country,
          };
        }

        return {
          allowed: true,
          country: geo.country,
          city: geo.city,
        };
      }
    }

    // Default behavior when not whitelisted and geolocation disabled/unavailable
    return {
      allowed: this.allowByDefault,
      reason: this.allowByDefault ? undefined : 'IP not in whitelist',
    };
  }

  /**
   * Block country by code
   */
  blockCountry(countryCode: string): void {
    this.blockedCountries.add(countryCode.toUpperCase());
  }

  /**
   * Unblock country
   */
  unblockCountry(countryCode: string): void {
    this.blockedCountries.delete(countryCode.toUpperCase());
  }

  /**
   * Get all whitelist entries
   */
  getWhitelist(): IPWhitelistEntry[] {
    return Array.from(this.whitelist.values());
  }

  /**
   * Check if IP matches CIDR range
   */
  private ipMatchesCIDR(ip: string, cidr: string): boolean {
    try {
      // Handle individual IPs
      if (!cidr.includes('/')) {
        return ip === cidr;
      }

      // IPv4
      if (ip.includes('.')) {
        const addr = new Address4(ip);
        const range = new Address4(cidr);
        return addr.isInSubnet(range);
      }

      // IPv6
      if (ip.includes(':')) {
        const addr = new Address6(ip);
        const range = new Address6(cidr);
        return addr.isInSubnet(range);
      }

      return false;
    } catch (error) {
      console.error('Error matching IP to CIDR:', error);
      return false;
    }
  }

  /**
   * Simple VPN detection (placeholder - would use commercial service)
   */
  private detectVPN(ip: string): boolean {
    // This is a simplified placeholder
    // In production, integrate with services like:
    // - IPHub (https://iphub.info/)
    // - ProxyCheck.io
    // - IPQualityScore

    // Check common VPN/datacenter IP ranges (simplified)
    const knownVPNRanges = ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'];

    return knownVPNRanges.some((range) => this.ipMatchesCIDR(ip, range));
  }
}
