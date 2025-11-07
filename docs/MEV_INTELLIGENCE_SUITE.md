# MEV Risk Intelligence Suite

## Overview

The MEV Risk Intelligence Suite provides mainnet-grade MEV (Maximal Extractable Value) awareness for AGI arbitrage intelligence. This system was integrated from the proven AxionCitadel platform and adapted for the Copilot-Consciousness architecture.

## Components

### 1. MEV Risk Models (`src/mev/models/`)

#### MEVRiskModel
Quantifies MEV leakage risk using game-theoretic parameters:
- **Base Risk**: Minimum MEV exposure (default: 0.001 ETH)
- **Value Sensitivity**: Impact of transaction value on risk
- **Mempool Congestion Factor**: How network congestion affects risk
- **Searcher Density**: Competition level among MEV searchers
- **Frontrun Probability**: Transaction-type-specific exploitation likelihood

```typescript
import { MEVRiskModel, TransactionType } from './mev';

const riskModel = new MEVRiskModel();
const risk = riskModel.calculateRisk(
  1.0,                          // txValue in ETH
  0.05,                         // gasPrice
  TransactionType.ARBITRAGE,    // transaction type
  0.5                           // mempool congestion (0-1)
);
```

#### MEVAwareProfitCalculator
Adjusts profit calculations to account for MEV leakage:

```typescript
import { MEVAwareProfitCalculator, TransactionType } from './mev';

const calculator = new MEVAwareProfitCalculator();
const profit = calculator.calculateProfit(
  1.0,                          // revenue in ETH
  0.05,                         // gas cost
  1.0,                          // transaction value
  TransactionType.ARBITRAGE,
  0.5                           // mempool congestion
);

console.log({
  grossProfit: profit.grossProfit,
  mevRisk: profit.mevRisk,
  adjustedProfit: profit.adjustedProfit,
  riskRatio: profit.riskRatio,
  netProfitMargin: profit.netProfitMargin
});
```

### 2. Real-Time Sensors (`src/mev/sensors/`)

#### MempoolCongestionSensor
Monitors real-time mempool conditions using:
- Pending transaction ratio
- Gas usage deviation across recent blocks
- Base fee velocity (EIP-1559 dynamics)

```typescript
import { MempoolCongestionSensor } from './mev';
import { ethers } from 'ethers';

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const sensor = new MempoolCongestionSensor(provider);

const congestion = await sensor.getCongestionScore(); // 0-1 scale
```

#### SearcherDensitySensor
Quantifies MEV bot activity density through:
- MEV transaction ratio (interactions with known MEV contracts)
- Gas price variance (sandwich attack indicators)
- Bot clustering (unique high-gas addresses)

```typescript
import { SearcherDensitySensor } from './mev';

const sensor = new SearcherDensitySensor(provider);
const density = await sensor.getDensityScore(); // 0-1 scale
```

#### MEVSensorHub
Coordinates periodic sensor updates in a background thread:

```typescript
import { MEVSensorHub } from './mev';

const sensorHub = new MEVSensorHub(provider, 5000); // 5s update interval
sensorHub.start();

// Get latest readings
const params = sensorHub.getRiskParams();
console.log({
  mempoolCongestion: params.mempoolCongestion,
  searcherDensity: params.searcherDensity,
  timestamp: params.timestamp
});

// Clean up
sensorHub.stop();
```

### 3. ML Pipeline Integration

MEV risk features are integrated into the ML feature extraction pipeline:

```typescript
import { FeatureExtractor } from './ml';
import { MEVSensorHub } from './mev';

const extractor = new FeatureExtractor();
const sensorHub = new MEVSensorHub(provider);
sensorHub.start();

// Extract features with MEV data
const features = await extractor.extractFeatures(
  priceHistory,
  Date.now(),
  sensorHub.getRiskParams()  // MEV risk parameters
);

// Features now include:
// - mempoolCongestion
// - searcherDensity
// - mevRiskScore (composite)
```

### 4. Calibration Tool (`src/tools/calibrate-mev-risk.ts`)

Analyzes historical MEV prediction accuracy and suggests parameter adjustments:

```bash
# Run calibration
ts-node src/tools/calibrate-mev-risk.ts logs/strategy-decisions.csv
```

Expected CSV format:
```csv
predicted_mev_risk_eth,actual_mev_leakage_eth,congestion_score,pool_type
0.0042,0.0038,0.65,uniswap_v3
0.0051,0.0059,0.82,sushiswap
```

Output:
```json
{
  "calibrated_at": "2024-11-07T06:00:00.000Z",
  "total_samples": 1000,
  "avg_bias": -0.000123,
  "mae": 0.000456,
  "rmse": 0.000678,
  "suggested_base_risk": 0.04,
  "suggested_alpha": 0.65
}
```

## Transaction Types

The system recognizes four transaction types with different MEV risk profiles:

| Type | Frontrun Probability | Use Case |
|------|---------------------|----------|
| `ARBITRAGE` | 0.7 | DEX arbitrage opportunities |
| `LIQUIDITY_PROVISION` | 0.2 | LP additions/removals |
| `FLASH_LOAN` | 0.8 | Flash loan transactions |
| `FRONT_RUNNABLE` | 0.9 | High-risk MEV-sensitive txs |

## Architecture Integration

### Data Flow

```
┌─────────────────┐
│  Blockchain     │
│  (RPC Provider) │
└────────┬────────┘
         │
         ├──> MempoolCongestionSensor ──┐
         │                               │
         └──> SearcherDensitySensor ────┤
                                         │
                                         ▼
                                  ┌─────────────┐
                                  │ MEVSensorHub│
                                  └──────┬──────┘
                                         │
                                         ▼
                                  ┌─────────────────┐
                                  │ FeatureExtractor│
                                  └────────┬────────┘
                                           │
                                           ▼
                                  ┌─────────────────┐
                                  │  ML Pipeline    │
                                  │  (LSTM/Scorer)  │
                                  └────────┬────────┘
                                           │
                                           ▼
                                  ┌─────────────────┐
                                  │ Arbitrage Logic │
                                  └─────────────────┘
```

### Integration Points

1. **Feature Extraction**: MEV risk parameters feed into `FeatureExtractor.extractFeatures()`
2. **Profit Calculation**: Use `MEVAwareProfitCalculator` for adjusted profit metrics
3. **Risk Assessment**: Query `MEVSensorHub.getRiskParams()` for real-time risk data

## Configuration

### Sensor Configuration

```typescript
// Custom sensor weights
const congestionSensor = new MempoolCongestionSensor(provider, 5, {
  pendingRatio: 0.4,
  gasDeviation: 0.3,
  feeVelocity: 0.3
});

const densitySensor = new SearcherDensitySensor(provider, 20, {
  mevRatio: 0.5,
  sandwich: 0.3,
  clustering: 0.2
});
```

### Risk Model Tuning

```typescript
const riskModel = new MEVRiskModel({
  baseRisk: 0.002,
  valueSensitivity: 0.15,
  mempoolCongestionFactor: 0.3,
  searcherDensity: 0.25,
  frontrunProbability: {
    [TransactionType.ARBITRAGE]: 0.75,  // Custom probability
    // ... other types
  }
});
```

## Performance Considerations

- **Sensor Update Interval**: Default 5s, adjust based on network conditions
- **RPC Calls**: Sensors make multiple RPC calls per update (optimize provider)
- **Memory**: MEVSensorHub runs in background thread with minimal overhead
- **Latency**: Feature extraction adds ~10-50ms with MEV data included

## Future Enhancements

- [ ] Cross-chain MEV sensor deployment
- [ ] Advanced sandwich attack detection algorithms
- [ ] Integration with Flashbots Protect
- [ ] MEV-aware gas price optimization
- [ ] Historical MEV pattern analysis
- [ ] Machine learning-based risk prediction

## References

- [AxionCitadel Repository](https://github.com/metalxalloy/AxionCitadel)
- [Flashbots Documentation](https://docs.flashbots.net/)
- [MEV Research](https://github.com/flashbots/mev-research)

## License

MIT License - Integrated from AxionCitadel with attribution
