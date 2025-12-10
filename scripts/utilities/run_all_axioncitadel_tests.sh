#!/bin/bash
#
# AxionCitadel Integration Test Runner
# 
# Runs all three test tools in sequence:
# 1. Dependency checker
# 2. Smoke test
# 3. Comprehensive test suite
#

set -e

echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║           AxionCitadel Integration Test Suite - Complete Run              ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Change to repository root
cd "$(dirname "$0")/.."

echo "▶ Step 1/3: Dependency Analysis"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
python3 scripts/check_axioncitadel_deps.py
echo ""

echo "▶ Step 2/3: Smoke Test (Quick Health Check)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
python3 scripts/smoke_test_axioncitadel.py
echo ""

echo "▶ Step 3/3: Comprehensive Test Suite"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
python3 tests/test_axioncitadel_integration.py
echo ""

echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                          ALL TESTS COMPLETED                               ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "✅ AxionCitadel integration is fully validated and production-ready!"
echo ""
echo "Next steps:"
echo "  • To enable MEV components: pip install -r requirements.txt"
echo "  • View detailed report: cat AXIONCITADEL_TEST_REPORT.md"
echo ""
