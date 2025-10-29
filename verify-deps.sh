#!/bin/bash
set -e

echo "=== Copilot-Consciousness Dependency Verification ==="
echo "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"

# Core dependency check
echo -e "\n--- Verifying Core Dependencies ---"
yarn install --check-files
core_check=$?

# Flash loan specific dependencies
echo -e "\n--- Validating Flash Loan Dependencies ---"
yarn list ethers hardhat @aave/core
flash_check=$?

if [ $core_check -eq 0 ] && [ $flash_check -eq 0 ]; then
    echo -e "\n✅ Foundation stable. Green light for development."
    exit 0
else
    echo -e "\n❌ Core dependency issues detected. Red light."
    exit 1
fi
