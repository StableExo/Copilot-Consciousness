#!/bin/bash
#
# MEV Integration Setup Script
# 
# Automated setup for MEV integration from AxionCitadel into Copilot-Consciousness.
# This script handles all necessary dependencies, directory structure, and validation.
#

set -e

echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║              MEV Integration - Automated Setup Script                     ║"
echo "║                    From AxionCitadel Integration                          ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Change to repository root
SCRIPT_DIR="$(dirname "$0")"
cd "$SCRIPT_DIR/.."
REPO_ROOT="$(pwd)"

echo "Repository root: $REPO_ROOT"
echo ""

# Step 1: Check Python version
echo "▶ Step 1/6: Checking Python version"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)

echo "Found Python version: $PYTHON_VERSION"

if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 8 ]); then
    echo "❌ Error: Python 3.8 or higher is required"
    exit 1
fi

echo "✅ Python version is compatible"
echo ""

# Step 2: Verify directory structure
echo "▶ Step 2/6: Verifying directory structure"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

REQUIRED_DIRS=(
    "src/mev/profit_calculator"
    "tests/mev"
    "examples/mev"
    "scripts"
    "docs"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "✅ $dir exists"
    else
        echo "❌ $dir not found"
        exit 1
    fi
done

echo ""

# Step 3: Install Python dependencies
echo "▶ Step 3/6: Installing Python dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "requirements.txt" ]; then
    echo "Installing dependencies from requirements.txt..."
    pip3 install -r requirements.txt --quiet
    
    if [ $? -eq 0 ]; then
        echo "✅ Dependencies installed successfully"
    else
        echo "❌ Failed to install dependencies"
        exit 1
    fi
else
    echo "⚠️  Warning: requirements.txt not found"
fi

echo ""

# Step 4: Verify MEV module imports
echo "▶ Step 4/6: Verifying MEV module imports"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

python3 -c "
import sys
sys.path.insert(0, '$REPO_ROOT')

try:
    from src.mev.profit_calculator import TransactionType, MEVRiskModel, ProfitCalculator, MempoolSimulator
    print('✅ All MEV modules import successfully')
    sys.exit(0)
except ImportError as e:
    print(f'❌ Import error: {e}')
    sys.exit(1)
"

if [ $? -ne 0 ]; then
    echo "❌ MEV module import verification failed"
    exit 1
fi

echo ""

# Step 5: Run MEV tests
echo "▶ Step 5/6: Running MEV test suite"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "tests/mev/test_profit_calculator.py" ]; then
    echo "Running test_profit_calculator.py..."
    python3 tests/mev/test_profit_calculator.py
    
    if [ $? -eq 0 ]; then
        echo "✅ All MEV tests passed"
    else
        echo "❌ Some MEV tests failed"
        exit 1
    fi
else
    echo "⚠️  Warning: MEV tests not found"
fi

echo ""

# Step 6: Run validation script (if it exists)
echo "▶ Step 6/6: Final validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "scripts/validate_mev_integration.py" ]; then
    echo "Running validation script..."
    python3 scripts/validate_mev_integration.py
    
    if [ $? -eq 0 ]; then
        echo "✅ Validation passed"
    else
        echo "❌ Validation failed"
        exit 1
    fi
else
    echo "⚠️  Validation script not found, skipping detailed validation"
    echo "✅ Basic setup complete"
fi

echo ""

# Success message
echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                    MEV INTEGRATION SETUP COMPLETE                          ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "✅ MEV integration is ready to use!"
echo ""
echo "Quick start:"
echo "  • Run example:  python3 examples/mev/mev_profit_calculation_example.py"
echo "  • Run tests:    python3 tests/mev/test_profit_calculator.py"
echo "  • Validate:     python3 scripts/validate_mev_integration.py"
echo ""
echo "Documentation:"
echo "  • Setup guide:  docs/MEV_SETUP_GUIDE.md"
echo "  • Integration:  IMPLEMENTATION_SUMMARY_MEV.md"
echo ""
