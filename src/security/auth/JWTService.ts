/**
 * JWT Authentication Service
 */

import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import type { StringValue } from 'ms';
import { JWTPayload, User, AuthConfig } from './types';

export class JWTService {
  private config: AuthConfig;

  constructor(config: AuthConfig) {
    this.config = config;
  }

  /**
   * Generate JWT token for user
   */
  generateToken(user: User): string {
    const sessionId = uuidv4();
    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      sessionId,
    };

    return jwt.sign(payload, this.config.jwtSecret, {
      expiresIn: this.config.jwtExpiresIn as StringValue | number,
    });
  }

  /**
   * Verify and decode JWT token
   */
  verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.config.jwtSecret) as JWTPayload;
    } catch (_error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Refresh token
   */
  refreshToken(token: string): string {
    const payload = this.verifyToken(token);
    const newPayload = {
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
      sessionId: uuidv4(),
    };

    return jwt.sign(newPayload, this.config.jwtSecret, {
      expiresIn: this.config.jwtExpiresIn as StringValue | number,
    });
  }

  /**
   * Decode token without verification (for logging/debugging)
   */
  decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch {
      return null;
    }
  }
}
