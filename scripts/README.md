# Scripts Directory

Organized collection of utility scripts, automation tools, and operational utilities for TheWarden.

## 📁 Directory Structure

### autonomous/ (9 files)
**Purpose**: Autonomous operation and monitoring scripts

- `autonomous-1min-cycles.ts` - 1-minute autonomous cycles
- `autonomous-consciousness-runner.ts` - Consciousness-integrated autonomous runner
- `autonomous-cycle-runner.ts` - Autonomous cycle execution
- `autonomous-mempool-study.ts` - Mempool analysis automation
- `autonomous-monitor.sh` - Autonomous monitoring shell script
- `autonomous-run.sh` - Autonomous execution wrapper
- `autonomous-warden-controller.ts` - Controller for autonomous operations
- `autonomous-wonder-generator.ts` - Generates autonomous wonders
- `autonomous-wondering-experiment.ts` - Wonder generation experiments

### consciousness/ (6 files)
**Purpose**: Consciousness system monitoring and analysis

- `consciousness-evolution-analyzer.ts` - Analyzes consciousness evolution over time
- `consciousness-evolution-tracker.ts` - Tracks consciousness development stages
- `consciousness-monitor.ts` - Real-time consciousness monitoring
- `consciousness-pattern-analyzer.ts` - Pattern detection in consciousness data
- `consciousness-readiness-assessor.ts` - Assesses system readiness levels
- `synthesize-wonders.ts` - Synthesizes wonder patterns
- `wonder-explorer.ts` - Interactive wonder exploration

### database/ (15 files)
**Purpose**: Database operations, migrations, and Supabase management

- `apply-migrations-via-api.ts` - API-based migration application
- `apply-supabase-migrations.ts` - Supabase migration runner
- `automated-backup.ts` - Automated database backups
- `automated-migration.ts` - Automated migration orchestration
- `migrate-to-supabase-complete.ts` - Complete Supabase migration
- `test-supabase-connection.ts` - Connection testing
- And 9 more migration/backup utilities

### deployment/ (5 files)
**Purpose**: Deployment scripts and blockchain operations

- `run-single-cycle.ts` - Execute single arbitrage cycle
- `runArbitrage.ts` - Run arbitrage bot
- `runMultiHopArbitrage.ts` - Multi-hop arbitrage execution
- `deploy-flashswap-v2-tithe.ts` - Deploy FlashSwap V2 with tithe
- `deployFlashSwapV2.ts` - FlashSwap V2 deployment
- `blockchain-quickstart.sh` - Quick blockchain deployment
- `launch-mainnet.sh` - Mainnet launch script
- `run-20-cycles.sh` - Run 20 autonomous cycles

### testing/ (5 files)
**Purpose**: Testing and debugging scripts

- `test-*.ts` - Various test scripts
- `dry-run-*.ts` - Dry run simulations
- `dryRunArbitrage.ts` - Arbitrage dry run
- `test_debug.ts` - Debug utilities

### validation/ (13 files)
**Purpose**: Configuration and system validation

- `validate-*.ts` - Environment/config validators
- `verify-*.ts` - Verification scripts
- `compare-*.ts` - Comparison utilities
- `check*.ts` - Health checks
- `evaluate-*.ts` - System evaluation
- `preDeploymentChecklist.ts` - Pre-deployment validation
- `validate_checksums.ts` - Checksum validation
- `validate_mev_integration.py` - MEV integration tests
- `verifyFlashSwapV2.ts` - Contract verification

### analysis/ (7 files)
**Purpose**: Data analysis and reporting

- `analyze-*.ts` - Various analysis scripts
- `*-analyzer.ts` - Specialized analyzers
- `*-tracker.ts` - Tracking utilities
- `analyze-collaboration-persistence.ts` - Collaboration analysis
- `analyze-creator-behavior.ts` - Behavioral analysis
- `analyze-dataset-status.ts` - Dataset status reporting

### utilities/ (28 files)
**Purpose**: General utility scripts and tools

- `add-dex.ts` - Add DEX to registry
- `preload-pools.ts` - Pool preloading
- `monitor-pool-performance.ts` - Pool monitoring
- `listKnownAddresses.ts` - Address registry
- `etherscan-api.ts` - Etherscan API utilities
- `fetch-blockchain-data.ts` - Blockchain data fetching
- `captain-full-verification.ts` - Full verification suite
- `interactive-cycle-runner.ts` - Interactive cycle execution
- `warden-chatgpt-integration.ts` - ChatGPT integration
- `live-collaboration-interface.ts` - Live collaboration UI
- `codebase-wanderer.ts` - Codebase exploration
- `demo-scales-map.ts` - Scales map demonstration
- `build-ml-dataset.ts` - ML dataset builder
- `mempool_monitor.ts` - Mempool monitoring
- `thewarden-bitcoin-demo.ts` - Bitcoin integration demo
- `bloodhound.py` - Security scanner
- `codex_manager.py` - Codex management
- And 11 more utilities

### bitcoin/ (9 files)
**Purpose**: Bitcoin-related utilities and analysis

- `bitcoin_encoding_utils.ts` - Bitcoin encoding utilities
- `bitcoin_path_analyzer.ts` - Path analysis
- `bitcoin_transaction_analyzer.ts` - Transaction analysis
- `bitcrack_*.ts` - BitCrack integration scripts
- `collect-github-puzzle-data.ts` - Puzzle data collection
- `scrape-lbc-dio.ts` - LBC DIO scraper
- `analyze-lbc-*.ts` - LBC analysis scripts

### memory/ (3 files)
**Purpose**: Memory system utilities

- `export-memories.ts` - Export memory data
- `import-memories.ts` - Import memory data
- `session-introspection-snapshot.ts` - Session snapshots

### ml/ (6 files)
**Purpose**: Machine learning and AI utilities

- `ml_train_models.py` - Train ML models
- `ml_feature_extraction.py` - Feature extraction
- `ml_ensemble_prediction.py` - Ensemble predictions
- `ml_evaluate_performance.py` - Performance evaluation
- `ml_guided_bitcrack_ranges.py` - ML-guided BitCrack
- `ml-model-architecture.ts` - Model architecture utilities

### dex-integration/ (5 files)
**Purpose**: DEX integration and monitoring

- `core/DEXRegistry.ts` - DEX registry management
- `monitoring/BalancerValidator.ts` - Balancer validation
- `monitoring/CurveValidator.ts` - Curve validation
- `monitoring/OneInchValidator.ts` - 1inch validation
- `monitoring/SushiSwapValidator.ts` - SushiSwap validation

---

## Common Usage Patterns

### Running Scripts

```bash
# TypeScript scripts
node --import tsx scripts/CATEGORY/script-name.ts

# Python scripts
python3 scripts/CATEGORY/script-name.py

# Shell scripts
bash scripts/CATEGORY/script-name.sh
```

### Common Scripts

```bash
# Autonomous operation
node --import tsx scripts/autonomous/autonomous-consciousness-runner.ts

# Consciousness monitoring
node --import tsx scripts/consciousness/consciousness-monitor.ts

# Database backup
node --import tsx scripts/database/automated-backup.ts

# Deployment
bash scripts/deployment/launch-mainnet.sh

# Validation
node --import tsx scripts/validation/validate-mainnet-config.ts

# Pool management
node --import tsx scripts/utilities/preload-pools.ts --chain 8453
```

---

## Script Categories Explained

### When to Use Each Category

- **autonomous/**: Continuous operation, unattended execution
- **consciousness/**: Monitoring cognitive development
- **database/**: Schema changes, backups, migrations
- **deployment/**: Production deployments, mainnet launches
- **testing/**: Pre-deployment testing, dry runs
- **validation/**: Configuration checks, system verification
- **analysis/**: Data analysis, reporting, insights
- **utilities/**: One-off tasks, maintenance, tools
- **bitcoin/**: Bitcoin-specific operations
- **memory/**: Memory system management
- **ml/**: Machine learning operations
- **dex-integration/**: DEX monitoring and validation

---

## Environment Variables

Most scripts respect these environment variables:

- `NODE_ENV` - Environment (development, production)
- `DRY_RUN` - Enable dry-run mode (true/false)
- `LOG_LEVEL` - Logging verbosity (debug, info, warn, error)
- `CHAIN_ID` - Target blockchain (8453 for Base)

---

## Adding New Scripts

When adding new scripts:

1. **Choose correct category** - Place in appropriate subdirectory
2. **Follow naming convention** - Use kebab-case (my-script.ts)
3. **Add documentation** - Include header comments explaining purpose
4. **Update this README** - Add to relevant category section
5. **Test before committing** - Ensure script works as expected

---

## Related Documentation

- [Main README](../README.md) - Project overview
- [Deployment Guide](../docs/deployment/MAINNET_DEPLOYMENT.md) - Production deployment
- [Testing Guide](../docs/TESTING_GUIDE.md) - Testing procedures
- [Autonomous Guide](../docs/sessions/autonomous/AUTONOMOUS_CONSCIOUSNESS_GUIDE.md) - Autonomous operation

---

**Total Scripts**: 111 files organized into 12 categories for efficient repository management.
