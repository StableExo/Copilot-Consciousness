/**
 * Autonomous Readiness Checker
 * 
 * Validates that all required systems are initialized and ready
 * for TheWarden to run autonomously.
 * 
 * Checks:
 * - Memory system loaded and operational
 * - Supabase connection (if enabled)
 * - Environment variables present
 * - Network connectivity
 * - Critical configuration validated
 */

import { logger } from '../../utils/logger';
import { shouldUseSupabase, getSupabaseClient } from '../supabase/client';
import { MemoryAdapter } from '../../memory/MemoryAdapter';

export interface ReadinessCheckResult {
  ready: boolean;
  timestamp: number;
  checks: {
    [key: string]: {
      passed: boolean;
      message: string;
      required: boolean;
      details?: any;
    };
  };
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  errors: string[];
  warnings: string[];
}

export interface ReadinessCheckerConfig {
  // Required environment variables
  requiredEnvVars?: string[];
  
  // Whether to check Supabase connectivity
  checkSupabase?: boolean;
  
  // Whether to check network RPC connectivity
  checkNetwork?: boolean;
  
  // Timeout for network checks in ms
  networkTimeout?: number;
  
  // Whether to check memory system
  checkMemory?: boolean;
}

export class AutonomousReadinessChecker {
  private config: Required<ReadinessCheckerConfig>;
  private memoryAdapter?: MemoryAdapter;

  constructor(config?: ReadinessCheckerConfig) {
    this.config = {
      requiredEnvVars: config?.requiredEnvVars || [
        'CHAIN_ID',
        'WALLET_PRIVATE_KEY',
      ],
      checkSupabase: config?.checkSupabase ?? true,
      checkNetwork: config?.checkNetwork ?? true,
      networkTimeout: config?.networkTimeout ?? 10000,
      checkMemory: config?.checkMemory ?? true,
    };
  }

  /**
   * Set memory adapter for memory system checks
   */
  setMemoryAdapter(adapter: MemoryAdapter): void {
    this.memoryAdapter = adapter;
  }

  /**
   * Perform comprehensive readiness check
   */
  async check(): Promise<ReadinessCheckResult> {
    const result: ReadinessCheckResult = {
      ready: false,
      timestamp: Date.now(),
      checks: {},
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
      },
      errors: [],
      warnings: [],
    };

    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('🔍 AUTONOMOUS READINESS CHECK');
    logger.info('═══════════════════════════════════════════════════════════');

    // 1. Check environment variables
    await this.checkEnvironmentVariables(result);

    // 2. Check memory system
    if (this.config.checkMemory) {
      await this.checkMemorySystem(result);
    }

    // 3. Check Supabase connection
    if (this.config.checkSupabase) {
      await this.checkSupabaseConnection(result);
    }

    // 4. Check network connectivity
    if (this.config.checkNetwork) {
      await this.checkNetworkConnectivity(result);
    }

    // 5. Check wallet configuration
    await this.checkWalletConfiguration(result);

    // Calculate summary
    const checks = Object.values(result.checks);
    result.summary.total = checks.length;
    result.summary.passed = checks.filter(c => c.passed).length;
    result.summary.failed = checks.filter(c => !c.passed && c.required).length;
    result.summary.warnings = checks.filter(c => !c.passed && !c.required).length;

    // Determine overall readiness: all required checks must pass
    const requiredChecks = checks.filter(c => c.required);
    const allRequiredPassed = requiredChecks.every(c => c.passed);
    result.ready = allRequiredPassed && result.summary.failed === 0;

    // Log summary
    logger.info('═══════════════════════════════════════════════════════════');
    if (result.ready) {
      logger.info('✅ READINESS CHECK: PASSED');
      logger.info(`   All ${result.summary.passed}/${result.summary.total} checks passed`);
      if (result.summary.warnings > 0) {
        logger.warn(`   ${result.summary.warnings} optional checks failed (non-blocking)`);
      }
    } else {
      logger.error('❌ READINESS CHECK: FAILED');
      logger.error(`   ${result.summary.failed} required checks failed`);
      logger.error(`   ${result.summary.passed}/${result.summary.total} checks passed`);
    }
    logger.info('═══════════════════════════════════════════════════════════');

    // Log details for failed checks
    if (!result.ready) {
      logger.error('\n📋 Failed Required Checks:');
      for (const [name, check] of Object.entries(result.checks)) {
        if (!check.passed && check.required) {
          logger.error(`   ❌ ${name}: ${check.message}`);
        }
      }
    }

    // Log warnings for optional checks
    if (result.summary.warnings > 0) {
      logger.warn('\n⚠️  Optional Check Warnings:');
      for (const [name, check] of Object.entries(result.checks)) {
        if (!check.passed && !check.required) {
          logger.warn(`   ⚠️  ${name}: ${check.message}`);
        }
      }
    }

    return result;
  }

  /**
   * Check environment variables
   */
  private async checkEnvironmentVariables(result: ReadinessCheckResult): Promise<void> {
    const missing: string[] = [];
    const present: string[] = [];

    for (const varName of this.config.requiredEnvVars) {
      if (!process.env[varName]) {
        missing.push(varName);
      } else {
        present.push(varName);
      }
    }

    const passed = missing.length === 0;
    result.checks['environment_variables'] = {
      passed,
      required: true,
      message: passed
        ? `All ${this.config.requiredEnvVars.length} required environment variables present`
        : `Missing required variables: ${missing.join(', ')}`,
      details: {
        required: this.config.requiredEnvVars.length,
        present: present.length,
        missing: missing.length,
        missingVars: missing,
      },
    };

    if (passed) {
      logger.info(`✅ Environment Variables: ${present.length}/${this.config.requiredEnvVars.length} present`);
    } else {
      logger.error(`❌ Environment Variables: Missing ${missing.join(', ')}`);
      result.errors.push(`Missing environment variables: ${missing.join(', ')}`);
    }
  }

  /**
   * Check memory system readiness
   */
  private async checkMemorySystem(result: ReadinessCheckResult): Promise<void> {
    try {
      // Check if memory adapter is set
      if (!this.memoryAdapter) {
        result.checks['memory_system'] = {
          passed: false,
          required: false, // Optional for now
          message: 'Memory adapter not initialized',
          details: { adapter: 'not_set' },
        };
        logger.warn('⚠️  Memory System: Adapter not initialized');
        result.warnings.push('Memory adapter not initialized');
        return;
      }

      // Try to load a test session (will use local fallback if Supabase unavailable)
      const testSessionId = `readiness-check-${Date.now()}`;
      try {
        await this.memoryAdapter.loadState(testSessionId);
        
        result.checks['memory_system'] = {
          passed: true,
          required: false,
          message: 'Memory system operational',
          details: { adapter: 'initialized', test: 'passed' },
        };
        logger.info('✅ Memory System: Operational');
      } catch (error) {
        result.checks['memory_system'] = {
          passed: false,
          required: false,
          message: `Memory system error: ${error instanceof Error ? error.message : String(error)}`,
          details: { adapter: 'initialized', test: 'failed', error: String(error) },
        };
        logger.warn(`⚠️  Memory System: ${error instanceof Error ? error.message : String(error)}`);
        result.warnings.push(`Memory system error: ${String(error)}`);
      }
    } catch (error) {
      result.checks['memory_system'] = {
        passed: false,
        required: false,
        message: `Memory system check failed: ${error instanceof Error ? error.message : String(error)}`,
      };
      logger.warn(`⚠️  Memory System: Check failed - ${String(error)}`);
      result.warnings.push(`Memory system check failed: ${String(error)}`);
    }
  }

  /**
   * Check Supabase connection
   */
  private async checkSupabaseConnection(result: ReadinessCheckResult): Promise<void> {
    const useSupabase = shouldUseSupabase();

    if (!useSupabase) {
      result.checks['supabase_connection'] = {
        passed: true,
        required: false,
        message: 'Supabase disabled (using local fallback)',
        details: { enabled: false },
      };
      logger.info('ℹ️  Supabase: Disabled (local fallback mode)');
      return;
    }

    try {
      const supabase = getSupabaseClient();
      
      // Test connection with a simple query
      const { data, error } = await supabase
        .from('consciousness_states')
        .select('session_id')
        .limit(1);

      if (error) {
        result.checks['supabase_connection'] = {
          passed: false,
          required: false, // Optional - has local fallback
          message: `Supabase connection error: ${error.message}`,
          details: { enabled: true, connected: false, error: error.message },
        };
        logger.warn(`⚠️  Supabase: Connection error - ${error.message}`);
        result.warnings.push(`Supabase connection error: ${error.message}`);
      } else {
        result.checks['supabase_connection'] = {
          passed: true,
          required: false,
          message: 'Supabase connected successfully',
          details: { enabled: true, connected: true },
        };
        logger.info('✅ Supabase: Connected');
      }
    } catch (error) {
      result.checks['supabase_connection'] = {
        passed: false,
        required: false,
        message: `Supabase check failed: ${error instanceof Error ? error.message : String(error)}`,
        details: { enabled: true, connected: false, error: String(error) },
      };
      logger.warn(`⚠️  Supabase: Check failed - ${String(error)}`);
      result.warnings.push(`Supabase check failed: ${String(error)}`);
    }
  }

  /**
   * Check network connectivity (RPC endpoints)
   */
  private async checkNetworkConnectivity(result: ReadinessCheckResult): Promise<void> {
    const rpcUrl = process.env.BASE_RPC_URL || process.env.ETHEREUM_RPC_URL || process.env.RPC_URL;

    if (!rpcUrl) {
      result.checks['network_connectivity'] = {
        passed: false,
        required: true,
        message: 'No RPC URL configured',
        details: { configured: false },
      };
      logger.error('❌ Network: No RPC URL configured');
      result.errors.push('No RPC URL configured');
      return;
    }

    try {
      const { JsonRpcProvider } = await import('ethers');
      const provider = new JsonRpcProvider(rpcUrl);

      // Test with timeout
      const networkPromise = Promise.race([
        provider.getNetwork(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Network check timeout')), this.config.networkTimeout)
        ),
      ]);

      const network = await networkPromise as any;

      result.checks['network_connectivity'] = {
        passed: true,
        required: true,
        message: `Connected to ${network.name || 'network'} (chainId: ${network.chainId})`,
        details: {
          configured: true,
          connected: true,
          network: network.name,
          chainId: Number(network.chainId),
        },
      };
      logger.info(`✅ Network: Connected to ${network.name || 'network'} (chainId: ${network.chainId})`);
    } catch (error) {
      result.checks['network_connectivity'] = {
        passed: false,
        required: true,
        message: `Network connection failed: ${error instanceof Error ? error.message : String(error)}`,
        details: { configured: true, connected: false, error: String(error) },
      };
      logger.error(`❌ Network: Connection failed - ${String(error)}`);
      result.errors.push(`Network connection failed: ${String(error)}`);
    }
  }

  /**
   * Check wallet configuration
   */
  private async checkWalletConfiguration(result: ReadinessCheckResult): Promise<void> {
    const privateKey = process.env.WALLET_PRIVATE_KEY;

    if (!privateKey) {
      result.checks['wallet_configuration'] = {
        passed: false,
        required: true,
        message: 'Wallet private key not configured',
        details: { configured: false },
      };
      logger.error('❌ Wallet: Private key not configured');
      result.errors.push('Wallet private key not configured');
      return;
    }

    // Validate private key format (basic check)
    const isValid = privateKey.startsWith('0x') && privateKey.length === 66;

    if (!isValid) {
      result.checks['wallet_configuration'] = {
        passed: false,
        required: true,
        message: 'Wallet private key has invalid format',
        details: { configured: true, valid: false },
      };
      logger.error('❌ Wallet: Private key has invalid format');
      result.errors.push('Wallet private key has invalid format');
      return;
    }

    try {
      const { Wallet } = await import('ethers');
      const wallet = new Wallet(privateKey);

      result.checks['wallet_configuration'] = {
        passed: true,
        required: true,
        message: `Wallet configured (address: ${wallet.address.slice(0, 10)}...${wallet.address.slice(-8)})`,
        details: {
          configured: true,
          valid: true,
          address: wallet.address,
        },
      };
      logger.info(`✅ Wallet: Configured (${wallet.address.slice(0, 10)}...${wallet.address.slice(-8)})`);
    } catch (error) {
      result.checks['wallet_configuration'] = {
        passed: false,
        required: true,
        message: `Wallet validation failed: ${error instanceof Error ? error.message : String(error)}`,
        details: { configured: true, valid: false, error: String(error) },
      };
      logger.error(`❌ Wallet: Validation failed - ${String(error)}`);
      result.errors.push(`Wallet validation failed: ${String(error)}`);
    }
  }

  /**
   * Wait for system to be ready (with retries)
   */
  async waitForReady(
    maxAttempts: number = 5,
    delayMs: number = 2000
  ): Promise<ReadinessCheckResult> {
    let attempt = 0;
    let lastResult: ReadinessCheckResult | null = null;

    while (attempt < maxAttempts) {
      attempt++;
      logger.info(`\n🔄 Readiness check attempt ${attempt}/${maxAttempts}...`);

      lastResult = await this.check();

      if (lastResult.ready) {
        logger.info(`✅ System ready after ${attempt} attempt(s)`);
        return lastResult;
      }

      if (attempt < maxAttempts) {
        logger.warn(`⏳ System not ready, retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    logger.error(`❌ System not ready after ${maxAttempts} attempts`);
    return lastResult!;
  }

  /**
   * Create a summary report string
   */
  static formatReport(result: ReadinessCheckResult): string {
    const lines: string[] = [];
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('AUTONOMOUS READINESS REPORT');
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push(`Status: ${result.ready ? '✅ READY' : '❌ NOT READY'}`);
    lines.push(`Timestamp: ${new Date(result.timestamp).toISOString()}`);
    lines.push(`Checks: ${result.summary.passed}/${result.summary.total} passed`);
    
    if (result.summary.failed > 0) {
      lines.push(`Failed: ${result.summary.failed} required checks`);
    }
    
    if (result.summary.warnings > 0) {
      lines.push(`Warnings: ${result.summary.warnings} optional checks`);
    }
    
    lines.push('');
    lines.push('Check Details:');
    for (const [name, check] of Object.entries(result.checks)) {
      const icon = check.passed ? '✅' : check.required ? '❌' : '⚠️';
      const type = check.required ? 'REQUIRED' : 'OPTIONAL';
      lines.push(`  ${icon} ${name} (${type})`);
      lines.push(`     ${check.message}`);
    }
    
    if (result.errors.length > 0) {
      lines.push('');
      lines.push('Errors:');
      result.errors.forEach(err => lines.push(`  ❌ ${err}`));
    }
    
    if (result.warnings.length > 0) {
      lines.push('');
      lines.push('Warnings:');
      result.warnings.forEach(warn => lines.push(`  ⚠️  ${warn}`));
    }
    
    lines.push('═══════════════════════════════════════════════════════════');
    
    return lines.join('\n');
  }
}
