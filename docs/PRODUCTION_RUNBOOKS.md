# Production Runbooks - Phase 4

**Document Version**: 1.0  
**Status**: Active  
**Date**: November 23, 2025

---

## Table of Contents

1. [System Startup](#1-system-startup)
2. [Circuit Breaker Opened](#2-circuit-breaker-opened)
3. [Emergency Stop Triggered](#3-emergency-stop-triggered)
4. [High Capital Loss](#4-high-capital-loss)
5. [Network Failure](#5-network-failure)
6. [Position Limit Exceeded](#6-position-limit-exceeded)
7. [System Health Degraded](#7-system-health-degraded)
8. [Manual Intervention](#8-manual-intervention)
9. [Daily Operations](#9-daily-operations)
10. [Monthly Procedures](#10-monthly-procedures)

---

## 1. System Startup

### Checklist

**Pre-Startup**:
- [ ] Verify .env configuration is correct
- [ ] Check RPC endpoints are accessible
- [ ] Verify wallet has sufficient balance
- [ ] Check gas prices are reasonable
- [ ] Confirm monitoring systems are ready

**Startup Sequence**:
```bash
# 1. Navigate to project directory
cd /path/to/Copilot-Consciousness

# 2. Pull latest changes (if needed)
git pull origin main

# 3. Install/update dependencies
npm install

# 4. Build the project
npm run build

# 5. Run health checks
npm run health-check

# 6. Start in dry-run mode first
DRY_RUN=true npm start

# 7. Monitor for 10-15 minutes

# 8. If stable, start production mode
npm start
```

**Post-Startup Verification**:
- [ ] System health: HEALTHY
- [ ] Circuit breaker: CLOSED
- [ ] Emergency stop: Not triggered
- [ ] Position manager: Initialized
- [ ] P&L tracker: Recording
- [ ] Alerts: Operational

**What to Monitor**:
- Console logs for errors
- Health check endpoint: `/health`
- Metrics endpoint: `/metrics`
- First few trades execute successfully

**Rollback Plan**:
If issues occur within first 15 minutes:
1. Trigger emergency stop
2. Review logs
3. Fix issues
4. Restart from step 1

---

## 2. Circuit Breaker Opened

### Symptoms

**Alert Received**:
```
[CRITICAL] Circuit Breaker Opened
Reason: Consecutive failures: 5
```

**System State**:
- Trading halted
- Circuit state: OPEN
- Cooldown period active

### Response Steps

**Immediate (0-5 minutes)**:

1. **Acknowledge Alert**:
   ```typescript
   alertSystem.acknowledgeAlert(alertId, 'operator-name');
   ```

2. **Check Circuit Breaker Status**:
   ```typescript
   const metrics = circuitBreaker.getMetrics();
   console.log('State:', circuitBreaker.getState());
   console.log('Consecutive Failures:', metrics.consecutiveFailures);
   console.log('Failure Rate:', metrics.failureRate);
   ```

3. **Review Recent Trades**:
   ```typescript
   const recentTrades = profitLossTracker.getRecentTrades(10);
   recentTrades.forEach(trade => {
     console.log(`${trade.id}: Success=${trade.success}, Error=${trade.error}`);
   });
   ```

**Investigation (5-30 minutes)**:

4. **Identify Root Cause**:
   - Network issues? Check RPC health
   - Gas price spike? Check current gas prices
   - Pool liquidity? Check DEX reserves
   - Smart contract issue? Check transaction logs
   - Logic bug? Review error messages

5. **Document Findings**:
   ```bash
   echo "$(date): Circuit opened due to [ROOT CAUSE]" >> logs/incidents.log
   ```

**Resolution**:

6. **Fix Issues** (if applicable):
   - Update gas price limits
   - Blacklist problematic pools
   - Adjust profit thresholds
   - Fix code bugs

7. **Wait for Recovery**:
   - Circuit will auto-enter HALF_OPEN after cooldown
   - Monitor recovery test
   - If successful, circuit closes
   - If failed, re-opens

8. **Manual Override** (if needed):
   ```typescript
   // Only if confident issue is resolved
   circuitBreaker.forceClose('Issue resolved: [description]');
   ```

**Prevention**:
- Review and adjust failure thresholds
- Improve error handling
- Add more validation checks
- Monitor gas prices proactively

---

## 3. Emergency Stop Triggered

### Symptoms

**Alert Received**:
```
[CRITICAL] Emergency Stop Triggered
Reason: Capital loss exceeds 20%
```

**System State**:
- All trading halted
- Emergency stop: ACTIVE
- Shutdown callbacks executed

### Response Steps

**Immediate (0-2 minutes)**:

1. **Verify Stop**:
   ```typescript
   const state = emergencyStop.getState();
   console.log('Stopped:', state.isStopped);
   console.log('Reason:', state.stopReason);
   console.log('Message:', state.stopMessage);
   console.log('Time:', new Date(state.stoppedAt));
   ```

2. **Assess Situation**:
   - Check wallet balance
   - Review recent trades
   - Check for security issues
   - Verify system health

**Investigation (2-60 minutes)**:

3. **Generate P&L Report**:
   ```typescript
   const report = profitLossTracker.generateReport();
   console.log(report);
   
   // Export for analysis
   const json = profitLossTracker.exportToJSON();
   fs.writeFileSync(`emergency-stop-${Date.now()}.json`, json);
   ```

4. **Root Cause Analysis**:
   - What triggered the stop?
   - Why did losses occur?
   - Were safety systems working correctly?
   - Was this preventable?

5. **Security Check**:
   - Private key secure?
   - Unauthorized access?
   - Smart contract exploit?
   - RPC compromise?

**Resolution**:

6. **Fix Issues**:
   - Patch security vulnerabilities
   - Update safety parameters
   - Fix identified bugs
   - Improve monitoring

7. **Recovery Decision**:
   - Can safely recover?
   - Approve recovery manually
   - Reset monitoring state

8. **Execute Recovery**:
   ```typescript
   // Only after thorough review and fixes
   await emergencyStop.recover('operator-name');
   
   // Reset metrics if appropriate
   emergencyStop.resetMonitoring();
   circuitBreaker.resetMetrics();
   ```

**Post-Recovery**:
- Monitor closely for 1 hour
- Gradual restart with small positions
- Document incident and resolution
- Update runbooks if needed

---

## 4. High Capital Loss

### Symptoms

**Alert Received**:
```
[ERROR] Capital Loss Alert
Current loss: 15% ($150 of $1000)
```

**Before Emergency Stop Threshold**

### Response Steps

**Immediate**:

1. **Assess Current State**:
   ```typescript
   const metrics = profitLossTracker.getMetrics();
   console.log('Total Net Profit:', metrics.totalNetProfit);
   console.log('Largest Loss:', metrics.largestLoss);
   console.log('Current Loss Streak:', metrics.currentLossStreak);
   ```

2. **Review Recent Losing Trades**:
   ```typescript
   const losingTrades = profitLossTracker.getLosingTrades();
   losingTrades.slice(-10).forEach(trade => {
     console.log(`${trade.id}: Loss=${trade.netProfit}, Error=${trade.error}`);
   });
   ```

3. **Identify Pattern**:
   - Same DEX failing?
   - Same token pair?
   - Gas estimation issues?
   - Market conditions changed?

**Mitigation**:

4. **Adjust Strategy**:
   - Reduce position sizes temporarily
   - Increase profit thresholds
   - Blacklist problematic pairs
   - Wait for better conditions

5. **Manual Position Reduction**:
   ```typescript
   // Temporarily reduce max position
   positionSizeManager.config.maxPositionPercentage = 10; // from 20%
   ```

6. **Continue Monitoring**:
   - Watch next 5-10 trades closely
   - Be ready to trigger manual stop if losses continue

**Prevention**:
- Set tighter stop-loss limits
- More conservative position sizing
- Better opportunity validation
- Market condition monitoring

---

## 5. Network Failure

### Symptoms

- RPC endpoint not responding
- Transactions failing to submit
- Unable to fetch pool data
- Connection timeouts

### Response Steps

**Immediate**:

1. **Trigger Emergency Stop**:
   ```typescript
   await emergencyStop.networkFailure('RPC endpoint unresponsive');
   ```

2. **Switch to Backup RPC**:
   ```bash
   # Update .env
   PRIMARY_RPC_URL=https://backup-rpc-url.com/YOUR-KEY
   
   # Or programmatically
   provider.connection.url = backupRpcUrl;
   ```

3. **Verify New Connection**:
   ```typescript
   const blockNumber = await provider.getBlockNumber();
   console.log('Connected to block:', blockNumber);
   ```

**Recovery**:

4. **Test Connectivity**:
   - Fetch current block
   - Get gas prices
   - Query pool reserves
   - Test transaction simulation

5. **Resume Trading**:
   ```typescript
   await emergencyStop.recover('operator-name');
   ```

**Prevention**:
- Configure multiple backup RPCs
- Implement automatic failover
- Monitor RPC health proactively
- Use premium RPC services

---

## 6. Position Limit Exceeded

### Symptoms

**Alert Received**:
```
[WARNING] Position Limit Exceeded
Current exposure: 55% (limit: 50%)
```

### Response Steps

**Immediate**:

1. **Check Open Positions**:
   ```typescript
   const metrics = positionSizeManager.getMetrics();
   console.log('Total Exposure:', metrics.totalExposure);
   console.log('Active Positions:', metrics.activePositions);
   console.log('Exposure %:', metrics.exposurePercentage);
   ```

2. **Review Active Trades**:
   - Are positions closing normally?
   - Any stuck transactions?
   - Long-running arbitrage?

**Resolution**:

3. **Wait for Natural Closure**:
   - Most positions close quickly
   - Monitor for completion

4. **Force Close If Needed**:
   - Cancel pending transactions
   - Close positions at market
   - Accept small losses if necessary

5. **Adjust Limits** (if appropriate):
   ```typescript
   // Temporarily lower limits
   positionSizeManager.config.maxTotalExposure = 40; // from 50%
   ```

---

## 7. System Health Degraded

### Symptoms

- Health score < 0.7
- Component failures
- Performance degradation
- Memory leaks

### Response Steps

**Immediate**:

1. **Check Health Report**:
   ```typescript
   const report = systemHealthMonitor.getHealthStatus();
   console.log('Overall Status:', report.overallStatus);
   report.components.forEach(c => {
     console.log(`${c.componentName}: ${c.status}`);
   });
   ```

2. **Identify Unhealthy Components**:
   - Provider connection issues?
   - Database problems?
   - Memory usage high?
   - CPU overload?

**Investigation**:

3. **System Diagnostics**:
   ```bash
   # Check memory
   free -h
   
   # Check CPU
   top
   
   # Check disk space
   df -h
   
   # Check processes
   ps aux | grep node
   ```

4. **Component-Specific Checks**:
   - Test RPC connectivity
   - Check database connection
   - Verify gas oracle
   - Test each orchestrator

**Resolution**:

5. **Restart Components**:
   - Restart individual components if possible
   - Full restart if needed
   - Clear caches
   - Reset connections

6. **Resource Cleanup**:
   - Clear old logs
   - Clean up memory
   - Close unused connections
   - Restart services

---

## 8. Manual Intervention

### When to Intervene

**Required**:
- Emergency stop triggered
- Security breach suspected
- Major capital loss
- System completely failed
- Critical bug discovered

**Optional**:
- Circuit breaker opened repeatedly
- Poor performance for extended period
- Configuration changes needed
- Testing new features

### Intervention Procedures

**Emergency Stop**:
```bash
# SSH to server
ssh user@production-server

# Navigate to project
cd /path/to/project

# Open Node REPL or use admin CLI
node -e "
  const { emergencyStop } = require('./dist/safety');
  emergencyStop.manualStop('Reason for stop', 'your-name');
"
```

**Parameter Adjustment**:
```bash
# Edit configuration
nano .env

# Or update in code and restart
# ... make changes ...
npm run build
pm2 restart thewarden
```

**Manual Trade Execution** (testing):
```typescript
// Only in development/testing
const result = await executeManualTrade({
  inputToken: 'WETH',
  outputToken: 'USDC',
  amount: BigInt(1e18),
  minOutput: BigInt(2000e6)
});
```

---

## 9. Daily Operations

### Daily Checklist

**Morning (5 minutes)**:
- [ ] Check overnight performance
- [ ] Review any alerts
- [ ] Verify system health
- [ ] Check wallet balance
- [ ] Review gas prices

**Command**:
```bash
npm run daily-report
```

**Midday (2 minutes)**:
- [ ] Quick performance check
- [ ] Verify trading is active
- [ ] Check for any warnings

**Evening (10 minutes)**:
- [ ] Generate daily P&L report
- [ ] Review all trades
- [ ] Check safety metrics
- [ ] Document any issues
- [ ] Plan next day

**Daily Report**:
```typescript
// Generate comprehensive daily report
const report = profitLossTracker.generateReport();
const status = safety.getStatusReport();

console.log(report);
console.log('\nSafety Status:', JSON.stringify(status, null, 2));

// Save to file
fs.writeFileSync(
  `reports/daily-${new Date().toISOString().split('T')[0]}.txt`,
  report
);
```

---

## 10. Monthly Procedures

### Monthly Checklist

**First Week of Month**:

1. **Generate Monthly Report**:
   ```typescript
   const stats30d = profitLossTracker.getTimeWindowStats(30 * 86400000);
   const metrics = profitLossTracker.getMetrics();
   
   // Export full data
   const json = profitLossTracker.exportToJSON();
   fs.writeFileSync(`monthly-${month}-${year}.json`, json);
   ```

2. **Calculate 70% Allocation**:
   ```typescript
   const allocation = metrics.debtAllocation;
   console.log('Total Profit:', allocation.totalProfit);
   console.log('Debt Allocation (70%):', allocation.debtAllocation);
   console.log('Operational (30%):', allocation.operationalAllocation);
   ```

3. **Process Withdrawals**:
   - Withdraw 70% allocation
   - Document transfer
   - Update capital management records

4. **Performance Review**:
   - Success rate vs target
   - ROI vs target
   - Risk metrics review
   - Operational costs

5. **Strategy Assessment**:
   - What worked well?
   - What needs improvement?
   - Parameter adjustments needed?
   - New opportunities?

6. **System Maintenance**:
   - Update dependencies
   - Security patches
   - Backup data
   - Clean old logs

7. **Documentation**:
   - Update runbooks if needed
   - Document any incidents
   - Record learnings
   - Plan next month

---

## Emergency Contacts

**System Issues**:
- Primary: [Your contact]
- Backup: [Backup contact]

**Security Issues**:
- Security Team: [Contact]
- Wallet Provider: [Contact]

**Infrastructure**:
- RPC Provider Support: [Contact]
- Hosting Support: [Contact]

---

## Appendix: Quick Reference

### Key Commands

```bash
# System status
npm run status

# Health check
curl localhost:3001/health

# Metrics
curl localhost:3001/metrics

# Emergency stop
npm run emergency-stop

# Generate report
npm run report

# Export trades
npm run export-trades
```

### Key Files

- Configuration: `.env`
- Logs: `./logs/`
- Reports: `./reports/`
- Trade Data: `./data/trades/`
- Incident Log: `./logs/incidents.log`

---

**Document Created**: November 23, 2025  
**Version**: 1.0  
**Status**: Active
