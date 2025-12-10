#!/usr/bin/env bash
#
# Autonomous BitCrack Range Generation Demo
# Demonstrates complete ML-guided range generation workflow
#

set -e

echo "════════════════════════════════════════════════════════════════════════════"
echo "🤖 Autonomous BitCrack Range Generation Demo"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Verify ML predictions exist
echo -e "${BLUE}[Step 1/5]${NC} Checking ML predictions..."
if [ ! -f "data/ml-predictions/puzzle71_prediction.json" ]; then
  echo -e "${YELLOW}⚠️  ML prediction not found. Running ML pipeline...${NC}"
  python3 scripts/ml_ensemble_prediction.py
fi
echo -e "${GREEN}✓${NC} ML predictions ready"
echo ""

# Step 2: Run Python range generator
echo -e "${BLUE}[Step 2/5]${NC} Running Python range generator..."
echo "─────────────────────────────────────────────────────────────────────────────"
python3 scripts/ml_guided_bitcrack_ranges.py | head -60
echo "..."
echo -e "${GREEN}✓${NC} Python generation complete"
echo ""

# Step 3: Run TypeScript range manager
echo -e "${BLUE}[Step 3/5]${NC} Running TypeScript range manager..."
echo "─────────────────────────────────────────────────────────────────────────────"
npx tsx scripts/bitcrack_range_manager.ts | head -40
echo "..."
echo -e "${GREEN}✓${NC} TypeScript generation complete"
echo ""

# Step 4: Validate JSON outputs
echo -e "${BLUE}[Step 4/5]${NC} Validating JSON outputs..."
if python3 -m json.tool data/ml-predictions/puzzle71_bitcrack_ranges.json > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} JSON is valid"
else
  echo -e "${YELLOW}⚠️  JSON validation failed${NC}"
fi
echo ""

# Step 5: Display generated ranges
echo -e "${BLUE}[Step 5/5]${NC} Summary of generated ranges..."
echo "─────────────────────────────────────────────────────────────────────────────"
cat data/ml-predictions/puzzle71_bitcrack_ranges.json | python3 -c "
import json
import sys

data = json.load(sys.stdin)

print(f\"📊 ML Prediction: {data['ml_prediction']['position']:.2f}%\")
print(f\"🎯 Target: {data['target_address']}\")
print(f\"\\n🔧 Generated Strategies:\")
print(f\"   - Single GPU commands: {len(data['strategies']['single_gpu'])}\")
print(f\"   - Multi-GPU commands: {len(data['strategies']['multi_gpu'])}\")
print(f\"   - High-priority range: {data['ranges']['high_priority']['start']}:{data['ranges']['high_priority']['end']}\")
print(f\"   - Coverage: {data['ranges']['high_priority']['coverage']}% of keyspace\")
print(f\"\\n⚠️  Security Notice:\")
print(f\"   - Private relay recommended: {data['strategies']['private_relay']['recommended']}\")
print(f\"   - Theft risk (public): {data['strategies']['private_relay']['theft_risk'] * 100:.0f}%\")
"
echo ""

# Step 6: Run tests
echo -e "${BLUE}[Extra]${NC} Running automated tests..."
echo "─────────────────────────────────────────────────────────────────────────────"
npm test -- tests/unit/scripts/bitcrack_range_manager.test.ts 2>&1 | tail -10
echo ""

echo "════════════════════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ Autonomous execution complete!${NC}"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""
echo "📁 Output files:"
echo "   - data/ml-predictions/puzzle71_bitcrack_ranges.json"
echo "   - Console output with BitCrack commands"
echo ""
echo "📚 Next steps:"
echo "   1. Review docs/BITCRACK_INTEGRATION_GUIDE.md"
echo "   2. Choose a strategy (single GPU, multi-GPU, or pool)"
echo "   3. Set up private mempool relay (MANDATORY for security)"
echo "   4. Run BitCrack with generated ranges"
echo ""
echo "🔒 Security reminder:"
echo "   NEVER broadcast puzzle solutions via public mempool"
echo "   70% of public solutions are stolen by front-running bots"
echo ""
echo "The journey continues... 🤖🔍✨"
