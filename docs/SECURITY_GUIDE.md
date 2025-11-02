# Enterprise Security System Guide

## Overview

This comprehensive security system provides enterprise-grade protection for the distributed arbitrage bot with multiple layers of defense including authentication, authorization, rate limiting, intrusion detection, and audit logging.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Security Architecture                           │
└─────────────────────────────────────────────────────────────────────┘

  Internet Traffic
       │
       ▼
  WAF/Firewall
       │
       ▼
  Load Balancer (TLS 1.3)
       │
       ▼
  IP Whitelist Check ─────► Geolocation ─────► VPN Detection
       │
       ▼
  Authentication Layer
       ├─► JWT Token
       ├─► API Key
       └─► OAuth 2.0
       │
       ▼
  Two-Factor Auth (TOTP)
       │
       ▼
  RBAC Authorization
       │
       ▼
  Rate Limiting (Redis)
       │
       ▼
  Intrusion Detection
       ├─► SQL Injection
       ├─► XSS Detection
       ├─► Brute Force
       └─► Unusual Activity
       │
       ▼
  Application Services
       │
       ▼
  Audit Logger (Immutable)
```

## Quick Start

### 1. Installation

```typescript
import { SecurityManager, createDefaultSecurityConfig } from './security';

// Create security manager with default config
const config = createDefaultSecurityConfig();
const security = new SecurityManager(config);
```

### 2. Express Integration

```typescript
import express from 'express';
import helmet from 'helmet';

const app = express();

// Apply security headers
app.use(helmet());

// IP Whitelist (optional - for production)
app.use(security.middleware.checkIPWhitelist);

// Intrusion Detection
app.use(security.middleware.detectIntrusions);

// Protected routes with JWT authentication
app.use('/api', security.middleware.authenticateJWT);
app.use('/api', security.middleware.rateLimit('api'));

// Admin-only routes
app.use('/api/admin', 
  security.middleware.authenticateJWT,
  security.middleware.requirePermission('admin', 'manage')
);

// API key authentication for bots
app.use('/api/bot', 
  security.middleware.authenticateAPIKey,
  security.middleware.rateLimit('trading')
);
```

## Core Components

### 1. Authentication

#### JWT Tokens

```typescript
// Generate token for user
const user = {
  id: 'user123',
  username: 'trader',
  email: 'trader@example.com',
  role: UserRole.OPERATOR,
  twoFactorEnabled: false
};

const token = security.jwtService.generateToken(user);

// Verify token
const payload = security.jwtService.verifyToken(token);
console.log(payload); // { userId, username, role, sessionId, iat, exp }

// Refresh token
const newToken = security.jwtService.refreshToken(token);
```

#### API Keys

```typescript
// Generate API key
const apiKey = security.apiKeyService.generateAPIKey(
  'user123',
  'Trading Bot',
  ['arbitrage:read', 'arbitrage:execute'],
  30 // expires in 30 days
);

console.log('API Key:', apiKey.key); // arb_abc123_xyz789...

// Validate API key
const validKey = security.apiKeyService.validateAPIKey(apiKey.key);
if (validKey) {
  console.log('Valid key for user:', validKey.userId);
}

// Revoke API key
security.apiKeyService.revokeAPIKey(apiKey.id);
```

#### Password Management

```typescript
// Hash password
const hash = await security.passwordService.hashPassword('SecurePass123!');

// Verify password
const isValid = await security.passwordService.verifyPassword(
  'SecurePass123!',
  hash
);

// Validate password strength
const validation = security.passwordService.validatePasswordStrength(
  'weak'
);
console.log(validation.errors); // Array of validation errors

// Generate secure password
const password = security.passwordService.generateSecurePassword(16);
```

### 2. Two-Factor Authentication (2FA)

```typescript
// Setup 2FA for user
const twoFactorSetup = await security.twoFactorService.generateSecret(
  'trader',
  'trader@example.com'
);

// Display QR code to user
console.log('Scan QR Code:', twoFactorSetup.qrCodeUrl);
console.log('Secret:', twoFactorSetup.secret);
console.log('Backup Codes:', twoFactorSetup.backupCodes);

// Verify TOTP code
const token = '123456'; // From user's authenticator app
const isValid = security.twoFactorService.verifyToken(
  twoFactorSetup.secret,
  token
);

// Verify backup code
const hashedCodes = twoFactorSetup.backupCodes.map(
  code => security.twoFactorService.hashBackupCode(code)
);
const result = security.twoFactorService.verifyBackupCode(
  'ABC123',
  hashedCodes
);
if (result.valid) {
  // Remove used backup code at result.codeIndex
}
```

### 3. Role-Based Access Control (RBAC)

```typescript
// Check permissions
const hasPermission = security.rbacService.hasPermission(
  UserRole.OPERATOR,
  'arbitrage',
  'execute'
); // true

// Add custom permission
security.rbacService.addPermission(
  UserRole.OPERATOR,
  'monitoring',
  ['read', 'export']
);

// Remove permission
security.rbacService.removePermission(
  UserRole.VIEWER,
  'arbitrage',
  ['execute']
);

// Get all permissions for role
const permissions = security.rbacService.getRolePermissions(
  UserRole.ADMIN
);
```

### 4. Rate Limiting

```typescript
// Configure custom rate limit
security.rateLimitService.configureLimit('custom-api', {
  windowMs: 60000, // 1 minute
  maxRequests: 100,
  keyPrefix: 'ratelimit'
});

// Check rate limit
const result = await security.rateLimitService.checkLimit(
  'custom-api',
  'user123'
);

if (!result.allowed) {
  console.log('Rate limit exceeded. Retry after:', result.retryAfter);
}

// Manual blocking
await security.rateLimitService.blockIdentifier(
  'api',
  'suspicious-user',
  3600000 // 1 hour
);

// Check if blocked
const isBlocked = await security.rateLimitService.isBlocked(
  'api',
  'suspicious-user'
);
```

### 5. IP Whitelisting

```typescript
// Add IP to whitelist
const entryId = security.ipWhitelistService.addToWhitelist({
  cidr: '192.168.1.0/24',
  description: 'Office network',
  isActive: true
});

// Add single IP
security.ipWhitelistService.addToWhitelist({
  cidr: '203.0.113.45',
  description: 'VPN server',
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  isActive: true
});

// Check IP
const result = security.ipWhitelistService.checkIP('203.0.113.45');
console.log('Allowed:', result.allowed);
console.log('Country:', result.country);

// Block country
security.ipWhitelistService.blockCountry('CN');
security.ipWhitelistService.blockCountry('RU');

// Remove from whitelist
security.ipWhitelistService.removeFromWhitelist(entryId);
```

### 6. Audit Logging

```typescript
import { AuditEventType, AuditSeverity } from './security';

// Log event
security.auditLogger.log(
  AuditEventType.AUTH_LOGIN,
  AuditSeverity.INFO,
  { method: 'jwt', device: 'mobile' },
  {
    userId: 'user123',
    username: 'trader',
    ip: '203.0.113.45',
    userAgent: 'Mozilla/5.0...'
  }
);

// Query logs
const logs = security.auditLogger.query({
  startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
  userId: 'user123',
  type: AuditEventType.WALLET_TRANSACTION,
  limit: 100
});

// Verify log integrity
const integrity = security.auditLogger.verifyIntegrity();
if (!integrity.valid) {
  console.error('Log chain corrupted at index:', integrity.corruptedIndex);
}

// Get statistics
const stats = security.auditLogger.getStatistics(24); // Last 24 hours
console.log('Total events:', stats.totalEvents);
console.log('Events by type:', stats.eventsByType);
console.log('Unique users:', stats.uniqueUsers);

// Export logs for compliance
const exportedLogs = security.auditLogger.exportLogs(
  new Date('2024-01-01'),
  new Date('2024-12-31')
);
```

### 7. Intrusion Detection

```typescript
// Detect brute force
const alert = await security.idsService.detectBruteForce(
  '203.0.113.45',
  'user123'
);
if (alert) {
  console.log('Brute force detected:', alert);
}

// Analyze request for threats
const threats = await security.idsService.analyzeRequest({
  ip: '203.0.113.45',
  userId: 'user123',
  path: '/api/users',
  query: { id: "1' OR '1'='1" }, // SQL injection attempt
  body: { comment: '<script>alert("XSS")</script>' },
  headers: {}
});

if (threats.length > 0) {
  threats.forEach(threat => {
    console.log('Threat:', threat.type, threat.level);
    console.log('Blocked:', threat.blocked);
  });
}

// Get recent alerts
const recentAlerts = security.idsService.getRecentAlerts(50);

// Get alerts for specific IP
const ipAlerts = security.idsService.getAlertsForIP('203.0.113.45');

// Listen for threats
security.idsService.on('threat-detected', (alert) => {
  console.error('SECURITY ALERT:', alert);
  // Send notification, update WAF, etc.
});
```

### 8. Secrets Management

```typescript
// Store secret
await security.secretsManager.setSecret(
  'wallet-private-key',
  '0x1234567890abcdef...',
  {
    rotationPolicy: {
      enabled: true,
      intervalDays: 90,
      autoRotate: false
    }
  }
);

// Retrieve secret
const secret = await security.secretsManager.getSecret('wallet-private-key');

// Rotate secret
await security.secretsManager.rotateSecret(
  'wallet-private-key',
  '0xnewprivatekey...'
);

// List secrets
const secrets = await security.secretsManager.listSecrets();

// Check secrets needing rotation
const needsRotation = await security.secretsManager.getSecretsNeedingRotation();
needsRotation.forEach(key => {
  console.log('Secret needs rotation:', key);
});
```

### 9. Multi-Sig Wallet

```typescript
import { MultiSigWalletService } from './security';
import { ethers } from 'ethers';

// Initialize multi-sig
const multiSig = new MultiSigWalletService({
  safeAddress: '0x...', // Gnosis Safe address
  threshold: 2, // 2-of-3 signatures required
  owners: ['0xOwner1...', '0xOwner2...', '0xOwner3...'],
  rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/...',
  chainId: 1
});

// Create transaction proposal
const proposal = await multiSig.createProposal(
  '0xRecipient...',
  ethers.utils.parseEther('1.0').toString(),
  '0x', // No data
  'Transfer 1 ETH to recipient'
);

// Sign proposal (owner 1)
const wallet1 = new ethers.Wallet('0xPrivateKey1...');
await multiSig.signProposal(proposal.id, wallet1);

// Sign proposal (owner 2)
const wallet2 = new ethers.Wallet('0xPrivateKey2...');
const ready = await multiSig.signProposal(proposal.id, wallet2);

if (ready) {
  // Execute when threshold met
  const tx = await multiSig.executeProposal(proposal.id, wallet1);
  await tx.wait();
  console.log('Transaction executed:', tx.hash);
}

// Set spending limits
multiSig.setSpendingLimit(
  ethers.constants.AddressZero, // ETH
  ethers.utils.parseEther('10').toString(), // 10 ETH per day
  86400 // 24 hours
);

// Get pending proposals
const pending = multiSig.getPendingProposals();
```

## Environment Configuration

```bash
# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Secrets Management
SECRETS_ENCRYPTION_KEY=hex-encoded-32-byte-key
AUDIT_ENCRYPTION_KEY=hex-encoded-32-byte-key

# HashiCorp Vault (optional)
VAULT_URL=https://vault.example.com:8200
VAULT_TOKEN=your-vault-token

# Multi-Sig Wallet (optional)
SAFE_ADDRESS=0x...
SAFE_THRESHOLD=2
SAFE_OWNERS=0xOwner1,0xOwner2,0xOwner3
```

## Kubernetes Deployment

### Apply Security Configurations

```bash
# Create namespace
kubectl create namespace arbitrage-bot

# Apply network policies
kubectl apply -f k8s/security/network-policy.yaml

# Apply pod security policies
kubectl apply -f k8s/security/pod-security-policy.yaml

# Apply RBAC configurations
kubectl apply -f k8s/security/rbac.yaml
```

### Secrets Management

```bash
# Create wallet secret (DO NOT commit to git)
kubectl create secret generic wallet-secret \
  --from-literal=WALLET_PRIVATE_KEY="0xYOUR_KEY" \
  -n arbitrage-bot

# Create RPC secrets
kubectl create secret generic rpc-secrets \
  --from-literal=ETHEREUM_RPC_URL="https://..." \
  --from-literal=POLYGON_RPC_URL="https://..." \
  -n arbitrage-bot

# Create security secrets
kubectl create secret generic security-secrets \
  --from-literal=JWT_SECRET="$(openssl rand -base64 32)" \
  --from-literal=SECRETS_ENCRYPTION_KEY="$(openssl rand -hex 32)" \
  --from-literal=AUDIT_ENCRYPTION_KEY="$(openssl rand -hex 32)" \
  -n arbitrage-bot
```

## Security Best Practices

### 1. Production Checklist

- [ ] Change all default passwords and secrets
- [ ] Use external secret management (Vault, AWS Secrets Manager)
- [ ] Enable 2FA for all admin accounts
- [ ] Configure IP whitelisting for production access
- [ ] Set up monitoring and alerting for security events
- [ ] Review and test incident response procedures
- [ ] Enable audit log shipping to SIEM
- [ ] Configure automated backups for audit logs
- [ ] Test disaster recovery procedures
- [ ] Perform security audit and penetration testing

### 2. Key Rotation

```typescript
// Rotate JWT secret (invalidates all existing tokens)
// Do this gradually with dual-key validation period

// Rotate API keys periodically
const oldKeys = security.apiKeyService.getUserAPIKeys('user123');
oldKeys.forEach(key => {
  if (isOlderThan90Days(key.createdAt)) {
    security.apiKeyService.revokeAPIKey(key.id);
    // Notify user to generate new key
  }
});

// Rotate secrets on schedule
const needsRotation = await security.secretsManager.getSecretsNeedingRotation();
for (const key of needsRotation) {
  // Rotate according to your procedures
  await rotateSecret(key);
}
```

### 3. Monitoring

```typescript
// Regular health checks
const health = await security.healthCheck();
if (!health.healthy) {
  console.error('Security system unhealthy:', health.services);
  // Alert ops team
}

// Monitor statistics
setInterval(() => {
  const stats = security.getStatistics();
  console.log('Security stats:', stats);
  
  // Check for unusual patterns
  if (stats.threats.filter(t => t.level === 'CRITICAL').length > 10) {
    // Alert security team
  }
}, 60000); // Every minute
```

## Compliance

### GDPR

- Audit logs include user identification for compliance
- User data can be exported via `auditLogger.exportLogs()`
- Implement right-to-be-forgotten by deleting user audit entries
- Ensure proper data retention policies

### SOC 2

- Immutable audit logs with cryptographic verification
- Role-based access control with least privilege
- Encryption at rest and in transit
- Regular access reviews via audit logs
- Incident response procedures

### PCI DSS

- Strong cryptography (AES-256, bcrypt)
- Multi-factor authentication
- Access control and monitoring
- Regular security testing
- Secure key management

## Support

For issues or questions:
- Security issues: security@example.com
- General support: support@example.com
- Documentation: https://docs.example.com/security
