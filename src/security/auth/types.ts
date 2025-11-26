/**
 * Security Authentication Types
 */

export enum UserRole {
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
  VIEWER = 'VIEWER',
  BOT = 'BOT',
}

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  apiKey?: string;
  twoFactorSecret?: string;
  twoFactorEnabled: boolean;
  recoveryCodes?: string[];
  trustedSessions: string[];
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
}

export interface JWTPayload {
  userId: string;
  username: string;
  role: UserRole;
  sessionId: string;
  iat: number;
  exp: number;
}

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string | number;
  apiKeyPrefix: string;
  bcryptRounds: number;
  sessionTimeout: number;
}

export interface Permission {
  resource: string;
  actions: string[];
}

export interface RolePermissions {
  [UserRole.ADMIN]: Permission[];
  [UserRole.OPERATOR]: Permission[];
  [UserRole.VIEWER]: Permission[];
  [UserRole.BOT]: Permission[];
}

export const DEFAULT_PERMISSIONS: RolePermissions = {
  [UserRole.ADMIN]: [{ resource: '*', actions: ['*'] }],
  [UserRole.OPERATOR]: [
    { resource: 'arbitrage', actions: ['read', 'execute', 'cancel'] },
    { resource: 'wallet', actions: ['read', 'sign'] },
    { resource: 'configuration', actions: ['read', 'update'] },
    { resource: 'monitoring', actions: ['read'] },
  ],
  [UserRole.VIEWER]: [
    { resource: 'arbitrage', actions: ['read'] },
    { resource: 'wallet', actions: ['read'] },
    { resource: 'configuration', actions: ['read'] },
    { resource: 'monitoring', actions: ['read'] },
  ],
  [UserRole.BOT]: [
    { resource: 'arbitrage', actions: ['read', 'execute'] },
    { resource: 'market-data', actions: ['read'] },
  ],
};
