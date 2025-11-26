/**
 * Two-Factor Authentication (2FA) Service - TOTP Implementation
 */

import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';

export interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface TwoFactorConfig {
  issuer: string;
  window: number; // Time window for code validation (in steps)
}

export class TwoFactorService {
  private config: TwoFactorConfig;

  constructor(config: TwoFactorConfig) {
    this.config = config;
  }

  /**
   * Generate 2FA secret and QR code for user
   */
  async generateSecret(username: string, email: string): Promise<TwoFactorSetup> {
    const secret = speakeasy.generateSecret({
      name: `${this.config.issuer} (${email})`,
      issuer: this.config.issuer,
      length: 32,
    });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');
    const backupCodes = this.generateBackupCodes();

    return {
      secret: secret.base32,
      qrCodeUrl,
      backupCodes,
    };
  }

  /**
   * Verify TOTP code
   */
  verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: this.config.window,
    });
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code.match(/.{1,4}/g)?.join('-') || code);
    }
    return codes;
  }

  /**
   * Hash backup code for storage
   */
  hashBackupCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  /**
   * Verify backup code
   */
  verifyBackupCode(code: string, hashedCodes: string[]): { valid: boolean; codeIndex: number } {
    const hashedInput = this.hashBackupCode(code);
    const index = hashedCodes.indexOf(hashedInput);

    return {
      valid: index !== -1,
      codeIndex: index,
    };
  }

  /**
   * Generate current TOTP token (for testing/display)
   */
  generateCurrentToken(secret: string): string {
    return speakeasy.totp({
      secret,
      encoding: 'base32',
    });
  }
}
