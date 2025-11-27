/**
 * Enterprise Security System Demo
 * Demonstrates all security features
 */

import express from 'express';
import helmet from 'helmet';
import {
  SecurityManager,
  createDefaultSecurityConfig,
  UserRole,
  AuditEventType,
  AuditSeverity
} from '../src/security';

async function runSecurityDemo() {
  console.log('=== Enterprise Security System Demo ===\n');

  // 1. Initialize Security Manager
  console.log('1. Initializing Security Manager...');
  const config = createDefaultSecurityConfig();
  const security = new SecurityManager(config);
  console.log('✓ Security Manager initialized\n');

  // 2. User Registration and Authentication
  console.log('2. User Registration and Authentication');
  const password = 'SecureP@ssw0rd123!';
  
  // Validate password strength
  const validation = security.passwordService.validatePasswordStrength(password);
  console.log('Password validation:', validation.valid ? '✓ Valid' : '✗ Invalid');
  if (!validation.valid) {
    console.log('Errors:', validation.errors);
  }
  
  // Hash password
  const passwordHash = await security.passwordService.hashPassword(password);
  console.log('✓ Password hashed\n');

  // Create user
  const user = {
    id: 'user123',
    username: 'trader',
    email: 'trader@example.com',
    passwordHash,
    role: UserRole.OPERATOR,
    twoFactorEnabled: false,
    trustedSessions: [],
    createdAt: new Date(),
    isActive: true
  };

  // Generate JWT token
  const token = security.jwtService.generateToken(user);
  console.log('✓ JWT token generated');
  console.log('Token (first 50 chars):', token.substring(0, 50) + '...\n');

  // Verify token
  const payload = security.jwtService.verifyToken(token);
  console.log('✓ Token verified');
  console.log('Payload:', {
    userId: payload.userId,
    role: payload.role,
    exp: new Date(payload.exp * 1000).toISOString()
  });
  console.log('');

  // 3. Two-Factor Authentication
  console.log('3. Two-Factor Authentication Setup');
  const twoFactorSetup = await security.twoFactorService.generateSecret(
    user.username,
    user.email
  );
  console.log('✓ 2FA secret generated');
  console.log('Secret:', twoFactorSetup.secret);
  console.log('Backup codes (first 3):', twoFactorSetup.backupCodes.slice(0, 3));
  
  // Generate current token for testing
  const currentToken = security.twoFactorService.generateCurrentToken(
    twoFactorSetup.secret
  );
  console.log('Current TOTP:', currentToken);
  
  // Verify token
  const is2FAValid = security.twoFactorService.verifyToken(
    twoFactorSetup.secret,
    currentToken
  );
  console.log('✓ 2FA verification:', is2FAValid ? 'Success' : 'Failed');
  console.log('');

  // 4. API Key Management
  console.log('4. API Key Management');
  const apiKey = security.apiKeyService.generateAPIKey(
    user.id,
    'Trading Bot API Key',
    ['arbitrage:read', 'arbitrage:execute', 'wallet:read'],
    30 // 30 days
  );
  console.log('✓ API key generated');
  console.log('API Key:', apiKey.key);
  console.log('Scopes:', apiKey.scopes);
  
  // Validate API key
  const validatedKey = security.apiKeyService.validateAPIKey(apiKey.key);
  console.log('✓ API key validated:', validatedKey ? 'Valid' : 'Invalid');
  console.log('');

  // 5. Role-Based Access Control
  console.log('5. Role-Based Access Control (RBAC)');
  const canExecute = security.rbacService.hasPermission(
    UserRole.OPERATOR,
    'arbitrage',
    'execute'
  );
  console.log('✓ OPERATOR can execute arbitrage:', canExecute);
  
  const canManageUsers = security.rbacService.hasPermission(
    UserRole.OPERATOR,
    'users',
    'create'
  );
  console.log('✓ OPERATOR can manage users:', canManageUsers);
  
  const adminCanDoAnything = security.rbacService.hasPermission(
    UserRole.ADMIN,
    'any-resource',
    'any-action'
  );
  console.log('✓ ADMIN has full access:', adminCanDoAnything);
  console.log('');

  // 6. Rate Limiting
  console.log('6. Rate Limiting');
  for (let i = 0; i < 3; i++) {
    const result = await security.rateLimitService.checkLimit('api', user.id);
    console.log(`Request ${i + 1}: ${result.allowed ? 'Allowed' : 'Blocked'}, Remaining: ${result.remaining}`);
  }
  console.log('');

  // 7. IP Whitelisting
  console.log('7. IP Whitelisting & Geolocation');
  
  // Add office network to whitelist
  const whitelistId = security.ipWhitelistService.addToWhitelist({
    cidr: '192.168.1.0/24',
    description: 'Office Network',
    isActive: true
  });
  console.log('✓ Added to whitelist:', whitelistId);
  
  // Check whitelisted IP
  const whitelistedResult = security.ipWhitelistService.checkIP('192.168.1.100');
  console.log('✓ 192.168.1.100 check:', whitelistedResult.allowed ? 'Allowed' : 'Blocked');
  
  // Check non-whitelisted IP with geolocation
  const publicIp = security.ipWhitelistService.checkIP('8.8.8.8');
  console.log('✓ 8.8.8.8 check:', {
    allowed: publicIp.allowed,
    country: publicIp.country,
    city: publicIp.city
  });
  console.log('');

  // 8. Audit Logging
  console.log('8. Audit Logging');
  
  // Log authentication event
  security.auditLogger.log(
    AuditEventType.AUTH_LOGIN,
    AuditSeverity.INFO,
    { method: 'jwt', success: true },
    {
      userId: user.id,
      username: user.username,
      ip: '192.168.1.100',
      userAgent: 'Demo Client'
    }
  );
  console.log('✓ Logged authentication event');
  
  // Log wallet transaction
  security.auditLogger.log(
    AuditEventType.WALLET_TRANSACTION,
    AuditSeverity.INFO,
    {
      type: 'arbitrage',
      amount: '1.5 ETH',
      txHash: '0xabc123...'
    },
    {
      userId: user.id,
      username: user.username,
      ip: '192.168.1.100'
    }
  );
  console.log('✓ Logged wallet transaction');
  
  // Verify log integrity
  const integrity = security.auditLogger.verifyIntegrity();
  console.log('✓ Audit log integrity:', integrity.valid ? 'Valid' : 'Corrupted');
  
  // Get statistics
  const auditStats = security.auditLogger.getStatistics(24);
  console.log('✓ Audit statistics:');
  console.log('  Total events:', auditStats.totalEvents);
  console.log('  Unique users:', auditStats.uniqueUsers);
  console.log('');

  // 9. Intrusion Detection
  console.log('9. Intrusion Detection System');
  
  // Test SQL injection detection
  const sqlThreats = await security.idsService.analyzeRequest({
    ip: '203.0.113.45',
    userId: user.id,
    path: '/api/users',
    query: { id: "1' OR '1'='1" },
    body: {},
    headers: {}
  });
  console.log('✓ SQL injection detected:', sqlThreats.length > 0);
  if (sqlThreats.length > 0) {
    console.log('  Threat:', sqlThreats[0].type, '-', sqlThreats[0].level);
  }
  
  // Test XSS detection
  const xssThreats = await security.idsService.analyzeRequest({
    ip: '203.0.113.45',
    userId: user.id,
    path: '/api/comment',
    query: {},
    body: { text: '<script>alert("XSS")</script>' },
    headers: {}
  });
  console.log('✓ XSS detected:', xssThreats.length > 0);
  if (xssThreats.length > 0) {
    console.log('  Threat:', xssThreats[0].type, '-', xssThreats[0].level);
  }
  
  // Simulate brute force
  for (let i = 0; i < 6; i++) {
    const alert = await security.idsService.detectBruteForce('203.0.113.45', 'attacker');
    if (alert) {
      console.log('✓ Brute force detected after', i + 1, 'attempts');
      console.log('  Auto-blocked:', alert.blocked);
      break;
    }
  }
  console.log('');

  // 10. Secrets Management
  console.log('10. Secrets Management');
  
  // Store secret
  await security.secretsManager.setSecret(
    'api-key-example',
    'secret-value-12345',
    {
      rotationPolicy: {
        enabled: true,
        intervalDays: 90,
        autoRotate: false
      }
    }
  );
  console.log('✓ Secret stored with encryption');
  
  // Retrieve secret
  const retrievedSecret = await security.secretsManager.getSecret('api-key-example');
  console.log('✓ Secret retrieved:', retrievedSecret === 'secret-value-12345');
  
  // List all secrets
  const allSecrets = await security.secretsManager.listSecrets();
  console.log('✓ Total secrets stored:', allSecrets.length);
  console.log('');

  // 11. Express Server Integration
  console.log('11. Express Server Integration Example');
  const app = express();
  
  // Apply security middleware
  app.use(helmet());
  app.use(express.json());
  
  // Public endpoint (no auth)
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
  });
  
  // Protected endpoint (JWT required)
  app.get('/api/profile',
    security.middleware.authenticateJWT,
    security.middleware.rateLimit('api'),
    (req: any, res) => {
      res.json({
        user: req.user,
        message: 'Profile data'
      });
    }
  );
  
  // Admin endpoint (JWT + admin role required)
  app.get('/api/admin/users',
    security.middleware.authenticateJWT,
    security.middleware.requirePermission('users', 'read'),
    security.middleware.rateLimit('api'),
    (req: any, res) => {
      res.json({
        message: 'Admin access granted',
        users: []
      });
    }
  );
  
  // Bot API endpoint (API key required)
  app.post('/api/bot/trade',
    security.middleware.authenticateAPIKey,
    security.middleware.rateLimit('trading'),
    security.middleware.detectIntrusions,
    (req: any, res) => {
      res.json({
        apiKey: req.apiKey,
        message: 'Trade executed'
      });
    }
  );
  
  console.log('✓ Express routes configured with security middleware');
  console.log('');

  // 12. Health Check
  console.log('12. System Health Check');
  const health = await security.healthCheck();
  console.log('✓ Overall health:', health.healthy ? 'Healthy' : 'Unhealthy');
  console.log('Service status:');
  Object.entries(health.services).forEach(([service, status]) => {
    console.log(`  ${service}:`, status ? '✓' : '✗');
  });
  console.log('');

  // 13. Statistics
  console.log('13. Security Statistics');
  const stats = security.getStatistics();
  console.log('✓ Security statistics:');
  console.log('  Audit events:', stats.audit.totalEvents);
  console.log('  Threats detected:', stats.threats.length);
  console.log('');

  console.log('=== Demo Complete ===');
  console.log('The security system is now ready for production use.');
  console.log('');
  console.log('Next steps:');
  console.log('1. Configure environment variables');
  console.log('2. Set up external secret management (Vault/AWS)');
  console.log('3. Configure IP whitelisting for production');
  console.log('4. Enable monitoring and alerting');
  console.log('5. Test incident response procedures');
  
  // Cleanup
  await security.shutdown();
}

// Run demo
if (require.main === module) {
  runSecurityDemo().catch(console.error);
}

export { runSecurityDemo };
