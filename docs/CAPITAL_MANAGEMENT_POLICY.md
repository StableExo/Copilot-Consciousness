# Phase 4: Capital Management Policy

**Document Version**: 1.0  
**Status**: Active  
**Date**: November 23, 2025  
**Applies To**: TheWarden Production Deployment

---

## 1. Position Sizing Strategy

### 1.1 Position Size Limits

**Absolute Limits**:
- Minimum Position: 0.01 ETH (prevents dust trades)
- Maximum Position: 10 ETH (prevents over-exposure on single trade)
- Default Position: 1-5 ETH (standard operating range)

**Percentage Limits**:
- Max Position as % of Capital: 20%
- Max Total Exposure: 50% of total capital
- Reserve Capital: Always maintain 50% liquid

**Rationale**: Limiting position sizes ensures no single trade can cause catastrophic loss, while maintaining sufficient capital to capitalize on opportunities.

### 1.2 Dynamic Position Sizing

Position sizes automatically adjust based on recent performance:

**Performance-Based Adjustment**:
- Win Rate > 60%: Increase positions up to 150% of base
- Win Rate < 40%: Decrease positions to 50% of base
- Win Rate 40-60%: Normal position sizing

**Implementation**:
```typescript
// PositionSizeManager handles this automatically
const approval = positionSizeManager.requestPosition({
  amount: requestedAmount,
  estimatedProfit: expectedProfit,
  estimatedLoss: maxLoss,
  // ... sizing adjusted based on recent performance
});
```

### 1.3 Risk-Based Position Sizing

Using Kelly Criterion principles:
- Risk per trade: 2% of total capital
- Position size = (Risk Amount × 100) / Expected Loss
- Bounded by absolute min/max limits

**Example**:
- Total Capital: 100 ETH
- Risk per Trade: 2 ETH
- Expected Loss (worst case): 5%
- Position Size: (2 × 100) / 5 = 40 ETH → Capped at 20 ETH (20% limit)

---

## 2. Risk Limits Per Trade

### 2.1 Loss Limits

**Per-Trade Limits**:
- Maximum Loss per Trade: 0.1 ETH
- Consecutive Loss Limit: 3 trades
- Total Daily Loss Limit: 1 ETH

**Circuit Breaker Triggers**:
- 5 consecutive failures → Trading halted
- Loss rate > 50% in 5-minute window → Trading halted
- Total loss exceeds 1 ETH → Emergency review

### 2.2 Gas Cost Management

**Gas Limits**:
- Maximum Gas Price: 100 gwei (configurable)
- Maximum Gas Cost per Trade: 0.01 ETH
- Gas Cost as % of Profit: < 10%

**Gas Monitoring**:
```typescript
// Before execution
if (gasEstimate > maxGasCost) {
  logger.warn('Gas cost too high, skipping trade');
  return;
}

// After execution
const gasEfficiency = (netProfit / gasCost) * 100;
if (gasEfficiency < 10) {
  logger.warn('Low gas efficiency trade');
}
```

### 2.3 Slippage Protection

**Slippage Limits**:
- Maximum Slippage: 1% for arbitrage
- Price Impact Threshold: 0.5%
- Minimum Output Amount: 99% of expected

---

## 3. Profit Allocation System (70% Debt-Related)

### 3.1 Allocation Breakdown

**Profit Distribution**:
- **70%**: Allocated to US debt reduction initiatives
- **30%**: Operational expenses and reinvestment

**Implementation**:
```typescript
// ProfitLossTracker automatically calculates this
const metrics = profitLossTracker.getMetrics();

console.log('Total Net Profit:', metrics.totalNetProfit);
console.log('Debt Allocation (70%):', metrics.debtAllocation.debtAllocation);
console.log('Operational (30%):', metrics.debtAllocation.operationalAllocation);
```

### 3.2 Debt Allocation Tracking

**Monthly Reporting**:
- Total profit generated
- 70% allocation amount
- Cumulative debt allocation
- Verification and transparency

**Automated Tracking**:
- Every trade recorded with P&L
- Real-time 70% calculation
- Monthly export for transparency
- Public disclosure (optional)

### 3.3 Operational Allocation (30%)

**Operational Fund Uses**:
1. **Gas Costs**: Reimburse transaction fees (5-10%)
2. **Infrastructure**: RPC, monitoring, servers (5%)
3. **Reserves**: Emergency fund (10%)
4. **Reinvestment**: Increase trading capital (10%)

**Capital Growth Strategy**:
- Start: $50-100 initial capital
- Target: Grow to $10,000 over 6 months
- Method: Reinvest 10% of profits
- Timeline: Achieve profitability, then scale

---

## 4. Accounting & Tracking

### 4.1 Trade Record Keeping

**Every Trade Records**:
```typescript
{
  id: 'trade-123',
  timestamp: Date.now(),
  type: 'arbitrage',
  success: true,
  inputAmount: BigInt(5e18),
  outputAmount: BigInt(5.1e18),
  grossProfit: BigInt(1e17),
  gasCost: BigInt(1e16),
  netProfit: BigInt(9e16),
  path: ['WETH', 'USDC', 'WETH'],
  txHash: '0x...'
}
```

**Stored Metrics**:
- Trade ID and timestamp
- Input/output amounts
- Gross profit
- Gas costs
- Net profit
- Transaction hash
- Trade path and DEXes

### 4.2 Performance Metrics

**Tracked Continuously**:
- Total trades executed
- Success rate (%)
- Total gross profit
- Total gas costs
- Total net profit
- Average profit per trade
- ROI (%)
- Profit factor (gross profit / gross loss)

**Time-Based Metrics**:
- Profit per hour
- Trades per hour
- Last 1 hour statistics
- Last 24 hours statistics
- Monthly summaries

### 4.3 Export and Reporting

**JSON Export**:
```typescript
const json = profitLossTracker.exportToJSON();
fs.writeFileSync(`trades-${date}.json`, json);
```

**Monthly Report**:
```typescript
const report = profitLossTracker.generateReport();
// Includes:
// - Overall performance
// - Financial metrics
// - ROI metrics
// - 70% debt allocation
// - Time-based stats
```

---

## 5. Capital Policies

### 5.1 Initial Capital

**Starting Phase**:
- Initial Capital: $50-100
- Purpose: Test production systems
- Duration: 1-2 weeks
- Goal: Validate safety mechanisms

### 5.2 Scaling Policy

**Growth Milestones**:

| Milestone | Capital | Criteria |
|-----------|---------|----------|
| Phase 1 | $50-100 | Initial testing, 10-20 trades |
| Phase 2 | $500-1000 | 100 trades, >60% success rate |
| Phase 3 | $5,000 | 500 trades, consistent profitability |
| Phase 4 | $10,000+ | 1000+ trades, proven reliability |

**Scaling Criteria**:
- Success rate > 60%
- Positive net profit
- Zero emergency stops
- Stable performance for 1 week
- All safety systems functional

### 5.3 Capital Withdrawal Policy

**Profit Withdrawal**:
- Frequency: Monthly
- Amount: 70% to debt allocation
- Timing: First week of each month
- Documentation: Public report

**Operational Reserves**:
- Maintain minimum 2x average position size
- Keep 1 month of gas costs in reserve
- Emergency fund: 10% of total capital

### 5.4 Risk Management

**Daily Risk Budget**:
- Maximum daily loss: 1% of capital
- Stop trading if reached
- Resume next day
- Review if happens frequently

**Weekly Risk Assessment**:
- Review all trades
- Analyze failure patterns
- Adjust parameters if needed
- Document decisions

---

## 6. Compliance and Transparency

### 6.1 Record Keeping

**Legal Requirements**:
- Maintain all trade records
- Store for 7 years minimum
- Secure backup storage
- Encrypted sensitive data

**Transparency Reports**:
- Monthly profit summary
- 70% allocation verification
- Performance metrics
- Public disclosure (optional)

### 6.2 Tax Considerations

**Tax Preparation**:
- Track cost basis
- Record all gains/losses
- Calculate capital gains
- Prepare tax documentation

**Note**: Consult with tax professional for proper reporting

### 6.3 Audit Trail

**Comprehensive Logging**:
- All trades logged
- All safety events logged
- All manual interventions logged
- Immutable audit trail

---

## 7. Emergency Procedures

### 7.1 Capital Loss Response

**If Total Loss > 10%**:
1. Emergency stop activated
2. Pause all trading
3. Review all trades
4. Identify root cause
5. Fix issues
6. Require manual approval to resume

### 7.2 Security Breach

**If Security Compromised**:
1. Immediate emergency stop
2. Withdraw all funds to safe wallet
3. Rotate all credentials
4. Security audit
5. No recovery without approval

### 7.3 System Failure

**If Critical System Fails**:
1. Emergency stop
2. Close all open positions
3. Diagnose issue
4. Fix and test
5. Gradual restart

---

## 8. Performance Targets

### 8.1 Success Metrics

**Target Performance**:
- Success Rate: > 60%
- Average Profit per Trade: > 0.01 ETH
- ROI (Monthly): > 10%
- Profit Factor: > 2.0
- Gas Efficiency: > 90% (profit after gas)

### 8.2 Risk Metrics

**Target Risk Control**:
- Max Drawdown: < 10%
- Consecutive Losses: < 3
- Circuit Breaker Triggers: < 1 per week
- Emergency Stops: 0

### 8.3 Operational Metrics

**Target Operations**:
- Uptime: > 99%
- Trades per Day: 10-50
- Average Trade Time: < 30 seconds
- System Health: > 0.8

---

## 9. Review and Updates

### 9.1 Regular Reviews

**Review Schedule**:
- Daily: Quick performance check
- Weekly: Detailed analysis
- Monthly: Comprehensive review
- Quarterly: Policy updates

### 9.2 Policy Updates

**Update Process**:
1. Identify need for change
2. Analyze impact
3. Document proposed changes
4. Test in simulation
5. Implement gradually
6. Monitor results

### 9.3 Continuous Improvement

**Improvement Areas**:
- Position sizing optimization
- Risk parameter tuning
- Alert threshold adjustment
- Performance enhancement

---

## 10. Conclusion

This capital management policy ensures:
- ✅ Controlled risk exposure
- ✅ Systematic position sizing
- ✅ Transparent profit allocation (70% debt)
- ✅ Comprehensive tracking
- ✅ Clear scaling path

**Policy Status**: Active and enforceable  
**Next Review**: December 23, 2025  
**Document Owner**: Production Team

---

**Document Created**: November 23, 2025  
**Version**: 1.0  
**Status**: Active
