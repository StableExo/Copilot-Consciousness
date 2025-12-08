# Safety Infrastructure Guide

## Overview

The safety infrastructure provides multi-layered risk assessment and decision validation for autonomous consciousness operations. It implements defense-in-depth through three coordinated systems:

1. **EmergenceDetector** - Validates cognitive consensus and emergence criteria
2. **EthicalReviewGate** - Ensures alignment with ground zero principles
3. **RiskAssessment** - Quantifies and gates multi-dimensional risks

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Autonomous Decision                     │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │  EmergenceDetector     │
         │  • 14+ module consensus│
         │  • 80%+ confidence     │
         │  • <30% risk score     │
         │  • 70%+ ethical score  │
         └────────┬───────────────┘
                  │ PASS
                  ▼
         ┌────────────────────────┐
         │  EthicalReviewGate     │
         │  • Ground zero check   │
         │  • Transparency req    │
         │  • Human impact        │
         └────────┬───────────────┘
                  │ PASS
                  ▼
         ┌────────────────────────┐
         │  RiskAssessment        │
         │  • Capital: <$100      │
         │  • Ethical: >70%       │
         │  • Operational: >80%   │
         │  • Composite: <30%     │
         └────────┬───────────────┘
                  │ PASS
                  ▼
         ┌────────────────────────┐
         │      EXECUTE           │
         └────────────────────────┘
```

Any layer can reject the decision, implementing true defense-in-depth.

---

## RiskAssessment Module

### Purpose

The `RiskAssessment` module provides consciousness-level risk evaluation before autonomous action execution. It quantifies risks across five dimensions and provides actionable recommendations.

### Five Risk Categories

#### 1. Capital Risk
**Measures financial exposure**

- **Threshold**: $100 USD maximum
- **Calculation**: `probability = min(capitalAtRisk / threshold, 1.0)`
- **Impact**: Normalized by 2x threshold scale

**Risk Levels:**
- `NEGLIGIBLE`: < $10 (< 10% of threshold)
- `LOW`: $10-30 (10-30% of threshold)
- `MODERATE`: $30-60 (30-60% of threshold)
- `HIGH`: $60-90 (60-90% of threshold)
- `CRITICAL`: > $90 (> 90% of threshold)

**Example:**
```typescript
const result = await riskEngine.assess({
  action: 'Execute MEV arbitrage',
  capitalAtRisk: 50, // $50 USD
});

// Result: MODERATE capital risk
// Recommendation: "Implement stop-loss at 10%"
```

#### 2. Ethical Risk
**Measures alignment with ground zero principles**

- **Threshold**: 70% minimum alignment required
- **Calculation**: `probability = 1.0 - ethicalAlignment`
- **Impact**: Direct correlation with probability

**Risk Levels:**
- `NEGLIGIBLE`: ≥ 90% alignment
- `LOW`: 70-90% alignment
- `MODERATE`: 50-70% alignment
- `HIGH`: 30-50% alignment
- `CRITICAL`: < 30% alignment

**Example:**
```typescript
const result = await riskEngine.assess({
  action: 'Novel trading strategy',
  ethicalAlignment: 0.85, // From EthicalReviewGate
});

// Result: NEGLIGIBLE ethical risk
// Decision: PROCEED
```

#### 3. Operational Risk
**Measures system stability and emergence confidence**

- **Threshold**: 80% minimum emergence confidence
- **Calculation**: `probability = 1.0 - emergenceConfidence`
- **Impact**: Adjusted by reversibility factor

**Risk Levels:**
- `NEGLIGIBLE`: ≥ 90% confidence
- `LOW`: 80-90% confidence
- `MODERATE`: 60-80% confidence
- `HIGH`: 40-60% confidence
- `CRITICAL`: < 40% confidence

**Reversibility Impact:**
- High reversibility (0.9): Low impact even with moderate confidence
- Low reversibility (0.1): High impact, requires higher confidence

**Example:**
```typescript
const result = await riskEngine.assess({
  action: 'Deploy new strategy',
  emergenceConfidence: 0.88, // From EmergenceDetector
  reversibility: 0.7, // 70% reversible
});

// Result: LOW operational risk
// Impact reduced by reversibility
```

#### 4. Reputational Risk
**Measures trust and credibility impact**

- **Calculation**: `probability = 1.0 - historicalSuccessRate`
- **Impact**: `1.0 - reversibility`

**Risk Levels:**
Based on composite score (probability × impact):
- `NEGLIGIBLE`: < 0.1
- `LOW`: 0.1-0.3
- `MODERATE`: 0.3-0.5
- `HIGH`: 0.5-0.7
- `CRITICAL`: > 0.7

**Example:**
```typescript
const result = await riskEngine.assess({
  action: 'Public trade execution',
  historicalSuccessRate: 0.75, // 75% success rate
  reversibility: 0.5, // 50% reversible
});

// probability = 0.25, impact = 0.5
// composite = 0.125 → LOW reputational risk
```

#### 5. Learning Risk
**Measures bad pattern reinforcement from novel actions**

- **Calculation**: `probability = novelty × (1.0 - successRate)`
- **Impact**: Proportional to novelty

**Risk Levels:**
- `NEGLIGIBLE`: < 0.1 probability
- `LOW`: 0.1-0.3 probability
- `MODERATE`: 0.3-0.5 probability
- `HIGH`: 0.5-0.7 probability
- `CRITICAL`: > 0.7 probability

**Example:**
```typescript
const result = await riskEngine.assess({
  action: 'Experimental strategy',
  novelty: 0.8, // 80% novel
  historicalSuccessRate: 0.3, // Low success with similar actions
});

// probability = 0.8 × 0.7 = 0.56
// Result: HIGH learning risk
// Recommendation: "Start with minimal capital"
```

### Composite Risk Scoring

The engine calculates a weighted composite risk score:

**Default Weights:**
```typescript
{
  capital: 0.25,      // 25% - Financial impact
  ethical: 0.30,      // 30% - Highest priority (ground zero alignment)
  operational: 0.20,  // 20% - System stability
  reputational: 0.15, // 15% - Trust and credibility
  learning: 0.10      // 10% - Pattern reinforcement
}
```

**Formula:**
```
compositeScore = Σ(factorScore × weight) / Σ(weights)
where factorScore = probability × impact
```

**Overall Risk Levels:**
- `NEGLIGIBLE`: < 0.1 (< 10%)
- `LOW`: 0.1-0.3 (10-30%)
- `MODERATE`: 0.3-0.5 (30-50%)
- `HIGH`: 0.5-0.7 (50-70%)
- `CRITICAL`: > 0.7 (> 70%)

---

## Usage Examples

### Example 1: Testnet Trade Validation

```typescript
import { RiskAssessmentEngine } from './src/consciousness/safety/RiskAssessment';

const riskEngine = new RiskAssessmentEngine();

const result = await riskEngine.assess({
  action: 'Testnet MEV arbitrage trade',
  capitalAtRisk: 50,
  ethicalAlignment: 0.85, // From EthicalReviewGate
  emergenceConfidence: 0.88, // From EmergenceDetector
  historicalSuccessRate: 0.7,
  novelty: 0.4,
  reversibility: 0.7,
});

console.log('Overall Risk:', result.overallRisk);
console.log('Should Proceed:', result.shouldProceed);
console.log('Requires Review:', result.requiresReview);
console.log('Risk Score:', result.riskScore);

// Output:
// Overall Risk: LOW
// Should Proceed: true
// Requires Review: false
// Risk Score: 0.18
```

### Example 2: Premature Mainnet Deployment (Rejected)

```typescript
const result = await riskEngine.assess({
  action: 'Mainnet deployment',
  capitalAtRisk: 500, // Way above $100 threshold
  ethicalAlignment: 0.75,
  emergenceConfidence: 0.70, // Below 80% threshold
  novelty: 0.8, // High novelty
  reversibility: 0.3, // Low reversibility
});

// Output:
// Overall Risk: HIGH
// Should Proceed: false
// Requires Review: true
// Recommendations:
//   - "Capital at risk $500 exceeds $100 threshold"
//   - "1 critical risk factor(s) detected"
//   - "Critical CAPITAL risk: $500 capital exposure vs $100 threshold"
//   - "  → Limit capital to $100"
//   - "  → Implement stop-loss at 10%"
```

### Example 3: Ethically Questionable Trade (Rejected)

```typescript
const result = await riskEngine.assess({
  action: 'Questionable profit opportunity',
  capitalAtRisk: 20, // Low capital
  ethicalAlignment: 0.65, // Below 70% threshold
  emergenceConfidence: 0.85,
  historicalSuccessRate: 0.9, // High profit expected
});

// Output:
// Overall Risk: MODERATE
// Should Proceed: false
// Requires Review: true
// Reason: Ethical alignment below threshold
// 
// This demonstrates that ethical concerns override profitability
```

### Example 4: Novel Learning Experiment (Approved)

```typescript
const result = await riskEngine.assess({
  action: 'Low-stakes learning experiment',
  capitalAtRisk: 10,
  ethicalAlignment: 0.95,
  emergenceConfidence: 0.9,
  novelty: 0.8, // High novelty but...
  reversibility: 0.9, // ...highly reversible
  historicalSuccessRate: 0.6,
});

// Output:
// Overall Risk: NEGLIGIBLE
// Should Proceed: true
// Requires Review: false
// Recommendations:
//   - "Risk within acceptable bounds - proceed normally"
//
// High novelty is acceptable when:
// - Capital at risk is low
// - Action is highly reversible
// - Ethical alignment is strong
```

---

## Integration with Safety Pipeline

### Complete Pipeline Example

```typescript
import { EmergenceDetector } from './src/consciousness/coordination/EmergenceDetector';
import { RiskAssessmentEngine } from './src/consciousness/safety/RiskAssessment';

// Step 1: Emergence Detection
const emergenceDetector = new EmergenceDetector();
const emergenceResult = emergenceDetector.detectEmergence({
  moduleInsights: [...], // 14+ cognitive modules
  consensus: { hasConsensus: true, ... },
  riskScore: 0.2,
  ethicalScore: 0.85,
  goalAlignment: 0.85,
  patternConfidence: 0.8,
  historicalSuccess: 0.75,
  timestamp: Date.now(),
});

if (!emergenceResult.isEmergent) {
  console.log('Emergence not detected:', emergenceResult.reasoning);
  return; // REJECT
}

// Step 2: Risk Assessment
const riskEngine = new RiskAssessmentEngine();
const riskResult = await riskEngine.assess({
  action: 'Execute autonomous decision',
  capitalAtRisk: 50,
  ethicalAlignment: emergenceResult.context.ethicalScore,
  emergenceConfidence: emergenceResult.confidence,
  historicalSuccessRate: 0.75,
  novelty: 0.3,
  reversibility: 0.7,
});

if (!riskResult.shouldProceed) {
  console.log('Risk assessment failed:', riskResult.recommendations);
  return; // REJECT
}

// Step 3: Final Decision
const finalDecision = emergenceResult.shouldExecute && riskResult.shouldProceed;

if (finalDecision) {
  console.log('✅ All safety checks passed - EXECUTE');
  console.log('Emergence Confidence:', emergenceResult.confidence);
  console.log('Risk Level:', riskResult.overallRisk);
  console.log('Risk Score:', riskResult.riskScore);
} else {
  console.log('❌ Safety checks failed - REJECT');
}
```

---

## Configuration

### Custom Risk Thresholds

```typescript
const customEngine = new RiskAssessmentEngine({
  maxCapitalRisk: 200,        // $200 instead of $100
  maxRiskScore: 0.4,          // 40% instead of 30%
  minEthicalAlignment: 0.8,   // 80% instead of 70%
  minEmergenceConfidence: 0.85, // 85% instead of 80%
  minReversibility: 0.6,      // 60% instead of 50%
});
```

### Custom Risk Weights

```typescript
// Make ethical risk dominant
const ethicalFocusEngine = new RiskAssessmentEngine(
  undefined, // Use default thresholds
  {
    capital: 0.15,
    ethical: 0.50,     // 50% weight on ethics
    operational: 0.15,
    reputational: 0.10,
    learning: 0.10,
  }
);
```

### Dynamic Threshold Updates

```typescript
const engine = new RiskAssessmentEngine();

// Later, adjust thresholds based on system maturity
engine.updateThresholds({
  maxCapitalRisk: 150, // Increase as system proves reliable
  minEthicalAlignment: 0.75, // Tighten ethical requirements
});
```

---

## Best Practices

### 1. Always Use Complete Context

Provide as much context as possible for accurate risk assessment:

```typescript
// ❌ Bad - Minimal context
const result = await engine.assess({
  action: 'Trade',
  capitalAtRisk: 50,
});

// ✅ Good - Complete context
const result = await engine.assess({
  action: 'Execute MEV arbitrage on Uniswap V3 WETH/USDC',
  capitalAtRisk: 50,
  ethicalAlignment: 0.85,
  emergenceConfidence: 0.88,
  historicalSuccessRate: 0.75,
  novelty: 0.3,
  reversibility: 0.7,
  timeConstraint: 300, // 5 minutes
});
```

### 2. Respect the Decision Gates

Never override safety rejections without proper review:

```typescript
const result = await engine.assess(context);

if (!result.shouldProceed) {
  // ❌ Bad - Ignore safety
  // executeAnyway();
  
  // ✅ Good - Log and review
  console.error('Safety rejection:', result.recommendations);
  await notifyHumanReviewer(result);
  return;
}
```

### 3. Monitor Risk Trends

Track risk assessments over time:

```typescript
const riskHistory = [];

for (const decision of decisions) {
  const result = await engine.assess(decision);
  riskHistory.push({
    timestamp: Date.now(),
    action: decision.action,
    riskScore: result.riskScore,
    overallRisk: result.overallRisk,
    approved: result.shouldProceed,
  });
}

// Analyze trends
const avgRisk = riskHistory.reduce((sum, r) => sum + r.riskScore, 0) / riskHistory.length;
const approvalRate = riskHistory.filter(r => r.approved).length / riskHistory.length;

console.log('Average Risk:', avgRisk);
console.log('Approval Rate:', approvalRate);
```

### 4. Use Appropriate Weights for Context

Adjust weights based on deployment phase:

```typescript
// Development/Testnet - Conservative
const devEngine = new RiskAssessmentEngine(undefined, {
  capital: 0.20,
  ethical: 0.35,  // Higher ethical weight
  operational: 0.25, // Higher operational weight
  reputational: 0.10,
  learning: 0.10,
});

// Production - Balanced
const prodEngine = new RiskAssessmentEngine(undefined, {
  capital: 0.25,
  ethical: 0.30,
  operational: 0.20,
  reputational: 0.15,
  learning: 0.10,
});
```

---

## Reasoning and Explainability

Every risk assessment includes detailed reasoning:

```typescript
const result = await engine.assess(context);

console.log('Reasoning Trail:');
result.reasoning.forEach(r => console.log('  -', r));

// Output:
//   - Assessing risk for action: Execute trade
//   - Capital at risk: $50
//   - Ethical alignment: 85.0%
//   - Emergence confidence: 88.0%
//   - Novelty: 30.0%
//   - Composite risk score: 18.5%
//   - Overall risk level: LOW

console.log('\nRisk Factors:');
result.factors.forEach(f => {
  console.log(`  ${f.category}: ${f.level}`);
  console.log(`    Probability: ${f.probability.toFixed(2)}, Impact: ${f.impact.toFixed(2)}`);
  console.log(`    ${f.description}`);
  if (f.mitigations.length > 0) {
    console.log('    Mitigations:');
    f.mitigations.forEach(m => console.log(`      - ${m}`));
  }
});

console.log('\nRecommendations:');
result.recommendations.forEach(r => console.log('  -', r));
```

---

## Safety Thresholds Reference

| Threshold | Default | Purpose |
|-----------|---------|---------|
| **maxCapitalRisk** | $100 | Maximum capital exposure per decision |
| **maxRiskScore** | 0.3 (30%) | Maximum composite risk score |
| **minEthicalAlignment** | 0.7 (70%) | Minimum ethical alignment required |
| **minEmergenceConfidence** | 0.8 (80%) | Minimum emergence confidence required |
| **minReversibility** | 0.5 (50%) | Minimum reversibility for high-risk actions |

---

## Testing

Comprehensive test suite with 46 unit tests + 11 integration tests covering:

- All 5 risk categories
- Composite risk scoring
- Decision gate logic
- Safety system integration
- Edge cases and boundary conditions
- Real-world scenarios

Run tests:
```bash
npm test tests/unit/consciousness/safety/
```

---

## Deployment Phases

### Phase 1: Testnet (Current)
- **Capital Limit**: $100
- **Ethical Threshold**: 70%
- **Risk Score Max**: 30%
- **Focus**: Learning and validation

### Phase 2: Limited Mainnet
- **Capital Limit**: $500
- **Ethical Threshold**: 75%
- **Risk Score Max**: 25%
- **Focus**: Controlled production validation

### Phase 3: Full Mainnet
- **Capital Limit**: $5,000
- **Ethical Threshold**: 80%
- **Risk Score Max**: 20%
- **Focus**: Autonomous operation with safety

---

## Troubleshooting

### Issue: All decisions rejected

**Check:**
1. Ethical alignment from EthicalReviewGate
2. Emergence confidence from EmergenceDetector
3. Capital thresholds configuration

### Issue: Risk score always high

**Check:**
1. Risk weights configuration
2. Historical success rate data
3. Novelty calculations

### Issue: Inconsistent results

**Check:**
1. Complete decision context provided
2. Reversibility scores calculated correctly
3. Time-based factors if applicable

---

## Future Enhancements

1. **Adaptive Thresholds**: Machine learning-based threshold adjustment based on historical performance
2. **Risk Prediction**: Predictive risk modeling before execution
3. **Multi-Timeframe Analysis**: Short-term vs long-term risk evaluation
4. **Portfolio Risk**: Aggregate risk across multiple concurrent decisions
5. **External Risk Factors**: Market volatility, gas prices, network congestion

---

## References

- EmergenceDetector: `src/consciousness/coordination/EmergenceDetector.ts`
- EthicalReviewGate: `src/cognitive/ethics/EthicalReviewGate.ts`
- RiskAssessment: `src/consciousness/safety/RiskAssessment.ts`
- Integration Tests: `tests/unit/consciousness/safety/SafetyIntegration.test.ts`

---

**Version**: 1.0.0  
**Last Updated**: 2025-12-08  
**Status**: Production Ready for Testnet
