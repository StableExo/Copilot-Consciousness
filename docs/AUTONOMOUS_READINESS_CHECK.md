# Autonomous Readiness Check

## Overview

The Autonomous Readiness Checker validates that all required systems are initialized and ready for TheWarden to run autonomously. It performs comprehensive checks before allowing TheWarden to start, preventing runtime failures due to missing configuration or unavailable services.

## What It Checks

### Required Checks (Must Pass)

1. **Environment Variables**
   - `CHAIN_ID` - Network chain ID
   - `WALLET_PRIVATE_KEY` - Wallet private key for transactions
   - Any additional required variables configured

2. **Network Connectivity**
   - RPC endpoint is reachable
   - Can query network information
   - Chain ID matches configuration
   - Response time within acceptable limits (10s default)

3. **Wallet Configuration**
   - Private key is present
   - Private key format is valid (0x prefix, 66 characters)
   - Wallet can be instantiated

### Optional Checks (Warnings Only)

4. **Memory System**
   - Memory adapter is initialized
   - Can perform basic load operations
   - Local or Supabase storage accessible

5. **Supabase Connection**
   - Supabase is configured (if enabled)
   - Database is accessible
   - Can query tables
   - Falls back to local storage if unavailable

## Usage

### Automatic Check on Startup

When using `npm run start:supabase`, the readiness check runs automatically:

```bash
npm run start:supabase
```

**Flow:**
1. Load `.env` file
2. Load environment from Supabase (if enabled)
3. **Run readiness check with 3 retry attempts**
4. If ready → Start TheWarden
5. If not ready → Exit with detailed error report

### Manual Readiness Check

#### Quick Check (Single Attempt)

```bash
npm run check:readiness
```

Performs a single readiness check and reports the status immediately.

#### Check with Retries

```bash
npm run check:readiness:wait
```

Performs up to 5 readiness checks with 2-second delays between attempts. Useful when services are still initializing.

#### Custom Configuration

```bash
# 10 attempts with 5-second delays
node scripts/check-autonomous-readiness.ts --wait --attempts=10 --delay=5000
```

## Output Examples

### ✅ All Checks Passed

```
═══════════════════════════════════════════════════════════
🔍 AUTONOMOUS READINESS CHECK
═══════════════════════════════════════════════════════════
✅ Environment Variables: 2/2 present
✅ Memory System: Operational
ℹ️  Supabase: Disabled (local fallback mode)
✅ Network: Connected to base (chainId: 8453)
✅ Wallet: Configured (0x1234567890...abcdef12)
═══════════════════════════════════════════════════════════
✅ READINESS CHECK: PASSED
   All 5/5 checks passed
═══════════════════════════════════════════════════════════

✅ System is READY for autonomous operation!
   You can now start TheWarden with:
   npm run start:supabase
   or
   npm run start:autonomous
```

### ❌ Checks Failed

```
═══════════════════════════════════════════════════════════
🔍 AUTONOMOUS READINESS CHECK
═══════════════════════════════════════════════════════════
❌ Environment Variables: Missing WALLET_PRIVATE_KEY
✅ Memory System: Operational
⚠️  Supabase: Connection error - unauthorized
❌ Network: Connection failed - timeout after 10000ms
✅ Wallet: Configured (0x1234567890...abcdef12)
═══════════════════════════════════════════════════════════
❌ READINESS CHECK: FAILED
   2 required checks failed
   3/5 checks passed
═══════════════════════════════════════════════════════════

📋 Failed Required Checks:
   ❌ environment_variables: Missing required variables: WALLET_PRIVATE_KEY
   ❌ network_connectivity: Network connection failed: timeout after 10000ms

⚠️  Optional Check Warnings:
   ⚠️  supabase_connection: Supabase connection error: unauthorized

❌ System is NOT READY for autonomous operation.
   Please address the issues above before starting.
```

## Integration with CI/CD

The readiness check exits with appropriate codes for CI/CD integration:

- **Exit 0**: System is ready
- **Exit 1**: System is not ready

Example GitHub Actions usage:

```yaml
- name: Check Autonomous Readiness
  run: npm run check:readiness
  
- name: Start TheWarden
  if: success()
  run: npm run start:autonomous
```

## Configuration

### Environment Variables

Control readiness check behavior via environment variables:

```bash
# Disable Supabase checks
USE_SUPABASE=false

# Set network check timeout (ms)
NETWORK_CHECK_TIMEOUT=10000

# Enable verbose logging
DEBUG=true
```

### Programmatic Usage

You can use the readiness checker in your own code:

```typescript
import { AutonomousReadinessChecker, MemoryAdapter } from './infrastructure/readiness';

// Create checker
const checker = new AutonomousReadinessChecker({
  requiredEnvVars: ['CHAIN_ID', 'WALLET_PRIVATE_KEY'],
  checkSupabase: true,
  checkNetwork: true,
  checkMemory: true,
  networkTimeout: 10000,
});

// Set memory adapter if checking memory system
const memoryAdapter = new MemoryAdapter();
checker.setMemoryAdapter(memoryAdapter);

// Perform check
const result = await checker.check();

if (result.ready) {
  console.log('✅ System ready!');
  // Start your application
} else {
  console.error('❌ System not ready');
  console.error(AutonomousReadinessChecker.formatReport(result));
  process.exit(1);
}

// Or wait for ready with retries
const result = await checker.waitForReady(5, 2000);
```

## Troubleshooting

### Missing Environment Variables

**Error:** `Missing required variables: WALLET_PRIVATE_KEY`

**Solution:**
1. Check `.env` file has `WALLET_PRIVATE_KEY=0x...`
2. Verify `.env` is in project root
3. Try `USE_SUPABASE=true` to load from Supabase

### Network Connection Failed

**Error:** `Network connection failed: timeout after 10000ms`

**Solution:**
1. Check internet connection
2. Verify RPC URL is correct (BASE_RPC_URL, ETHEREUM_RPC_URL, or RPC_URL)
3. Test RPC endpoint manually: `curl $BASE_RPC_URL`
4. Increase timeout: Set `NETWORK_CHECK_TIMEOUT=30000` for slower networks

### Wallet Invalid Format

**Error:** `Wallet private key has invalid format`

**Solution:**
1. Private key must start with `0x`
2. Private key must be exactly 66 characters (including 0x)
3. Check for extra spaces or newlines
4. Regenerate wallet if corrupted

### Supabase Connection Error

**Error:** `Supabase connection error: unauthorized`

**Solution:**
1. Check Supabase credentials in `.env`:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY` or `SUPABASE_SERVICE_KEY`
2. Verify Supabase project is active
3. Check network can reach Supabase URL
4. Option: Disable Supabase with `USE_SUPABASE=false` (uses local fallback)

### Memory System Error

**Error:** `Memory system check failed: cannot access .memory directory`

**Solution:**
1. Create `.memory` directory: `mkdir -p .memory`
2. Check filesystem permissions
3. Verify disk space available
4. Memory checks are optional - system will still start

## Architecture

### Check Flow

```
AutonomousReadinessChecker.check()
  ├─> checkEnvironmentVariables()
  │   └─> Verify required env vars present
  │
  ├─> checkMemorySystem()
  │   ├─> Check MemoryAdapter initialized
  │   └─> Test basic load operation
  │
  ├─> checkSupabaseConnection()
  │   ├─> Check USE_SUPABASE flag
  │   ├─> Test database query
  │   └─> Report connection status
  │
  ├─> checkNetworkConnectivity()
  │   ├─> Create JsonRpcProvider
  │   ├─> Get network info (with timeout)
  │   └─> Validate chain ID
  │
  └─> checkWalletConfiguration()
      ├─> Verify WALLET_PRIVATE_KEY present
      ├─> Validate format (0x + 64 hex chars)
      └─> Instantiate wallet to validate
```

### Result Structure

```typescript
interface ReadinessCheckResult {
  ready: boolean;                    // Overall readiness status
  timestamp: number;                 // Check timestamp
  checks: {
    [name: string]: {
      passed: boolean;               // Individual check status
      message: string;               // Human-readable message
      required: boolean;             // Is this check required?
      details?: any;                 // Additional context
    };
  };
  summary: {
    total: number;                   // Total checks performed
    passed: number;                  // Checks that passed
    failed: number;                  // Required checks that failed
    warnings: number;                // Optional checks that failed
  };
  errors: string[];                  // Critical errors
  warnings: string[];                // Non-blocking warnings
}
```

## Extending the Checker

### Adding Custom Checks

You can extend the readiness checker for custom requirements:

```typescript
class CustomReadinessChecker extends AutonomousReadinessChecker {
  async check(): Promise<ReadinessCheckResult> {
    const result = await super.check();
    
    // Add custom check
    result.checks['custom_service'] = {
      passed: await this.checkCustomService(),
      required: true,
      message: 'Custom service operational',
    };
    
    return result;
  }
  
  private async checkCustomService(): Promise<boolean> {
    // Your custom check logic
    return true;
  }
}
```

### Configuration Options

```typescript
interface ReadinessCheckerConfig {
  requiredEnvVars?: string[];        // Env vars to check
  checkSupabase?: boolean;           // Check Supabase connection
  checkNetwork?: boolean;            // Check RPC connectivity
  networkTimeout?: number;           // Network check timeout (ms)
  checkMemory?: boolean;             // Check memory system
}
```

## Best Practices

1. **Always run readiness check before production deployment**
   - Use `npm run check:readiness` in CI/CD pipelines
   - Prevents runtime failures from configuration issues

2. **Use retry logic for transient failures**
   - `npm run check:readiness:wait` retries automatically
   - Useful when services are initializing

3. **Monitor optional checks**
   - Supabase and memory checks are warnings
   - System can run without them (local fallback)
   - But investigate persistent warnings

4. **Set appropriate timeouts**
   - Default 10s network timeout may be too short for slow connections
   - Increase via `NETWORK_CHECK_TIMEOUT` env var

5. **Integrate with monitoring**
   - Run periodic readiness checks
   - Alert if checks start failing
   - Indicates degraded service health

## See Also

- [Supabase Setup Guide](./SUPABASE_SETUP_GUIDE.md)
- [Memory System Documentation](./MEMORY_SYSTEM.md)
- [Bootstrap Process](./BOOTSTRAP_PROCESS.md)
- [Environment Variables](../env.example)
