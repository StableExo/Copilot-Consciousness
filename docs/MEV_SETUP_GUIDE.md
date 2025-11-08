# MEV Integration Setup Guide

## Overview

This guide provides comprehensive instructions for setting up and using the MEV (Maximal Extractable Value) integration from **AxionCitadel** into **Copilot-Consciousness**. The integration brings production-tested game-theoretic MEV risk modeling and profit calculation capabilities.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Component Overview](#component-overview)
3. [Manual Setup](#manual-setup)
4. [Examples](#examples)
5. [Troubleshooting](#troubleshooting)
6. [Advanced Configuration](#advanced-configuration)
7. [Support](#support)

---

## Quick Start

### Automated Setup (Recommended)

Run the automated setup script to install dependencies and validate the integration:

```bash
bash scripts/setup_mev_integration.sh
```

This script will:
- ✅ Check Python version (3.8+ required)
- ✅ Verify directory structure
- ✅ Install Python dependencies
- ✅ Validate module imports
- ✅ Run test suite
- ✅ Perform integration validation

### Quick Validation

To verify your setup is working correctly:

```bash
python3 scripts/validate_mev_integration.py
```

### Run Your First Example

Test the MEV profit calculator with a basic example:

```bash
python3 examples/mev/mev_profit_calculation_example.py
```

---

## Component Overview

### MEV Profit Calculator Module

The core MEV integration consists of four main components:

#### 1. TransactionType Enum

Defines MEV-relevant transaction categories:

```python
from src.mev.profit_calculator import TransactionType

# Available types:
TransactionType.ARBITRAGE           # Cross-DEX arbitrage
TransactionType.LIQUIDITY_PROVISION # LP operations
TransactionType.FLASH_LOAN          # Flash loan transactions
TransactionType.FRONT_RUNNABLE      # Frontrun-vulnerable trades
```

#### 2. MEVRiskModel

Game-theoretic risk modeling based on:
- Base risk parameters
- Transaction value sensitivity
- Mempool congestion levels
- Searcher competition density
- Transaction-type-specific frontrun probabilities

```python
from src.mev.profit_calculator import MEVRiskModel

model = MEVRiskModel()
risk = model.calculate_risk(
    tx_value=1.0,
    gas_price=0.05,
    tx_type=TransactionType.ARBITRAGE,
    mempool_congestion=0.5
)
```

#### 3. ProfitCalculator

MEV-aware profit calculations that account for frontrunning risks:

```python
from src.mev.profit_calculator import ProfitCalculator

calculator = ProfitCalculator()
result = calculator.calculate_profit(
    revenue=1.5,
    gas_cost=0.05,
    tx_value=1.0,
    tx_type=TransactionType.ARBITRAGE,
    mempool_congestion=0.5
)

# Returns:
# {
#     'gross_profit': float,      # Revenue - Gas Cost
#     'mev_risk': float,          # Calculated MEV risk
#     'adjusted_profit': float,   # Gross Profit - MEV Risk
#     'risk_ratio': float,        # Risk as % of revenue
#     'net_profit_margin': float  # Adjusted profit as % of revenue
# }
```

#### 4. MempoolSimulator

Stress-testing across various market conditions:

```python
from src.mev.profit_calculator import MempoolSimulator

simulator = MempoolSimulator()
results = simulator.run_simulation(calculator)

# Returns 60 scenarios:
# - 3 congestion levels (low, medium, high)
# - 5 transaction values
# - 4 transaction types
```

---

## Manual Setup

If you prefer to set up manually or need to customize the installation:

### Step 1: Prerequisites

**Python Requirements:**
- Python 3.8 or higher
- pip (Python package manager)

Verify your Python version:

```bash
python3 --version
```

### Step 2: Install Dependencies

Install required Python packages:

```bash
pip3 install -r requirements.txt
```

**Key dependencies:**
- `numpy>=1.24.0` - Required for risk calculations
- `pandas>=2.0.0` - Optional, for data analysis
- `web3>=6.0.0` - Optional, for blockchain integration

### Step 3: Verify Installation

Check that modules can be imported:

```bash
python3 -c "from src.mev.profit_calculator import TransactionType, MEVRiskModel, ProfitCalculator, MempoolSimulator; print('✅ All modules imported successfully')"
```

### Step 4: Run Tests

Execute the comprehensive test suite:

```bash
python3 tests/mev/test_profit_calculator.py
```

Expected output: `OK` with 24+ tests passing.

---

## Examples

### Basic Profit Calculation

Calculate MEV-adjusted profit for a simple arbitrage:

```python
from src.mev.profit_calculator import ProfitCalculator, TransactionType

# Initialize calculator
calculator = ProfitCalculator()

# Calculate profit
result = calculator.calculate_profit(
    revenue=1.5,        # 1.5 ETH expected revenue
    gas_cost=0.05,      # 0.05 ETH gas cost
    tx_value=1.0,       # 1.0 ETH transaction value
    tx_type=TransactionType.ARBITRAGE,
    mempool_congestion=0.5  # Medium congestion
)

print(f"Gross Profit: {result['gross_profit']:.6f} ETH")
print(f"MEV Risk: {result['mev_risk']:.6f} ETH")
print(f"Adjusted Profit: {result['adjusted_profit']:.6f} ETH")
print(f"Risk Ratio: {result['risk_ratio']:.2%}")
```

### Transaction Type Comparison

Compare MEV risk across different transaction types:

```python
from src.mev.profit_calculator import ProfitCalculator, TransactionType

calculator = ProfitCalculator()

# Standard parameters
revenue = 2.0
gas_cost = 0.1
tx_value = 1.5
congestion = 0.5

# Compare all transaction types
for tx_type in TransactionType:
    result = calculator.calculate_profit(
        revenue=revenue,
        gas_cost=gas_cost,
        tx_value=tx_value,
        tx_type=tx_type,
        mempool_congestion=congestion
    )
    
    print(f"{tx_type.name:25} | MEV Risk: {result['mev_risk']:8.6f} ETH")
```

### Mempool Simulation

Run comprehensive stress testing:

```python
from src.mev.profit_calculator import ProfitCalculator, MempoolSimulator

calculator = ProfitCalculator()
simulator = MempoolSimulator()

# Run simulation (60 scenarios)
results = simulator.run_simulation(calculator)

# Analyze results
best = max(results, key=lambda x: x['adjusted_profit'])
worst = min(results, key=lambda x: x['adjusted_profit'])

print(f"Best scenario: {best['tx_type']} @ {best['congestion']} congestion")
print(f"Worst scenario: {worst['tx_type']} @ {worst['congestion']} congestion")
```

### Risk-Based Decision Making

Implement risk tolerance thresholds:

```python
from src.mev.profit_calculator import ProfitCalculator, TransactionType

calculator = ProfitCalculator()

# Set risk tolerance (10% of revenue)
max_acceptable_risk_ratio = 0.10

# Evaluate opportunity
opportunity = {
    "revenue": 2.0,
    "gas": 0.1,
    "value": 1.5,
    "congestion": 0.6
}

result = calculator.calculate_profit(
    revenue=opportunity["revenue"],
    gas_cost=opportunity["gas"],
    tx_value=opportunity["value"],
    tx_type=TransactionType.ARBITRAGE,
    mempool_congestion=opportunity["congestion"]
)

# Make decision
if result['risk_ratio'] <= max_acceptable_risk_ratio:
    print(f"✓ EXECUTE - Risk {result['risk_ratio']:.1%} is acceptable")
else:
    print(f"✗ SKIP - Risk {result['risk_ratio']:.1%} exceeds threshold")
```

### Complete Example Script

Run the full example with all scenarios:

```bash
python3 examples/mev/mev_profit_calculation_example.py
```

This demonstrates:
- Basic MEV-aware profit calculation
- Transaction type comparison
- Mempool simulation
- Risk-based decision making

---

## Troubleshooting

### Common Issues

#### Import Error: "No module named 'numpy'"

**Solution:** Install dependencies

```bash
pip3 install -r requirements.txt
```

#### Import Error: "No module named 'src'"

**Solution:** Run scripts from repository root

```bash
cd /path/to/Copilot-Consciousness
python3 examples/mev/mev_profit_calculation_example.py
```

Or add the repository to your Python path:

```python
import sys
from pathlib import Path

# Add repository root to path
repo_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(repo_root))

# Now imports will work
from src.mev.profit_calculator import ProfitCalculator
```

#### Tests Fail: "ModuleNotFoundError"

**Solution:** Ensure you're in the repository root and dependencies are installed

```bash
cd /path/to/Copilot-Consciousness
pip3 install -r requirements.txt
python3 tests/mev/test_profit_calculator.py
```

#### Validation Warnings

The validation script may show warnings for optional components:

```
⚠️  Optional dependency missing: scikit-learn
```

**Solution:** These are optional and don't affect core functionality. Install if needed:

```bash
pip3 install scikit-learn
```

### Getting Help

If you encounter issues:

1. **Check validation output:**
   ```bash
   python3 scripts/validate_mev_integration.py
   ```

2. **Review test output:**
   ```bash
   python3 tests/mev/test_profit_calculator.py -v
   ```

3. **Verify Python version:**
   ```bash
   python3 --version  # Should be 3.8+
   ```

4. **Check file structure:**
   ```bash
   ls -la src/mev/profit_calculator/
   ```

---

## Advanced Configuration

### Custom Risk Parameters

Modify MEV risk model parameters:

```python
from src.mev.profit_calculator import MEVRiskModel, TransactionType

# Create custom risk model
model = MEVRiskModel()

# Modify parameters
model.params['base_risk'] = 0.002  # Increase base risk
model.params['value_sensitivity'] = 0.20  # Higher sensitivity
model.params['searcher_density'] = 0.30  # More competitive environment

# Adjust frontrun probabilities
model.params['frontrun_probability'][TransactionType.ARBITRAGE] = 0.75

# Use in calculator
from src.mev.profit_calculator import ProfitCalculator

calculator = ProfitCalculator()
calculator.risk_model = model  # Replace with custom model
```

### Custom Simulation Parameters

Create custom mempool simulation scenarios:

```python
from src.mev.profit_calculator import MempoolSimulator, ProfitCalculator

simulator = MempoolSimulator()

# Customize congestion levels
simulator.congestion_levels = [0.1, 0.3, 0.5, 0.7, 0.9]

# Customize transaction values
simulator.tx_values = [0.5, 1.0, 2.0, 5.0, 10.0, 50.0]

# Run with custom parameters
calculator = ProfitCalculator()
results = simulator.run_simulation(calculator)
```

### Integration with Arbitrage Engines

Integrate MEV risk into arbitrage decision-making:

```python
from src.mev.profit_calculator import ProfitCalculator, TransactionType

def evaluate_arbitrage_opportunity(opportunity, mempool_state):
    """
    Evaluate an arbitrage opportunity with MEV risk consideration
    
    Args:
        opportunity: Dict with revenue, gas_cost, value
        mempool_state: Dict with congestion level
    
    Returns:
        Dict with evaluation results
    """
    calculator = ProfitCalculator()
    
    result = calculator.calculate_profit(
        revenue=opportunity['revenue'],
        gas_cost=opportunity['gas_cost'],
        tx_value=opportunity['value'],
        tx_type=TransactionType.ARBITRAGE,
        mempool_congestion=mempool_state['congestion']
    )
    
    # Add decision logic
    result['execute'] = result['risk_ratio'] < 0.15  # 15% threshold
    
    return result
```

---

## Support

### Resources

- **Integration Documentation:** [INTEGRATION_FROM_AXIONCITADEL.md](INTEGRATION_FROM_AXIONCITADEL.md)
- **Implementation Summary:** [IMPLEMENTATION_SUMMARY_MEV.md](../IMPLEMENTATION_SUMMARY_MEV.md)
- **Test Suite:** `tests/mev/test_profit_calculator.py`
- **Examples:** `examples/mev/`

### Source Attribution

This MEV integration is based on components from **AxionCitadel**:
- Repository: https://github.com/metalxalloy/AxionCitadel
- Author: metalxalloy
- License: MIT (please verify)
- Integration Date: 2025-11-07

### Testing & Validation

**Test Suite Coverage:**
- ✅ 24+ comprehensive tests
- ✅ All transaction types
- ✅ Edge cases and error conditions
- ✅ Integration scenarios
- ✅ Realistic arbitrage scenarios

**Validation Tools:**
- Setup script: `scripts/setup_mev_integration.sh`
- Validation script: `scripts/validate_mev_integration.py`
- Test suite: `tests/mev/test_profit_calculator.py`

### Next Steps

After completing setup:

1. **Explore Examples:**
   ```bash
   python3 examples/mev/mev_profit_calculation_example.py
   ```

2. **Review Test Suite:**
   ```bash
   python3 tests/mev/test_profit_calculator.py -v
   ```

3. **Integrate with Your Code:**
   - Import modules: `from src.mev.profit_calculator import ...`
   - Calculate MEV-adjusted profits
   - Make risk-aware trading decisions

4. **Monitor and Optimize:**
   - Track MEV risk in production
   - Adjust risk parameters based on results
   - Optimize transaction strategies

---

## License

This integration maintains the original MIT license from AxionCitadel. Please verify licensing terms before production use.

## Changelog

**2025-11-08:**
- ✅ Created automated setup script
- ✅ Created validation script
- ✅ Created comprehensive setup guide
- ✅ Verified all components working

**2025-11-07:**
- ✅ Initial integration from AxionCitadel
- ✅ Test suite (24 tests)
- ✅ Example scripts
- ✅ Documentation

---

*For additional support or questions, please refer to the main project documentation or open an issue in the repository.*
