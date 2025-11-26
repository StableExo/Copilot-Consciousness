# Environment Variable Comparison Tool

## Overview

This tool compares your `.env` file with `.env.example` to ensure:
- All required variables are present
- No placeholder values remain
- Critical security settings are properly configured
- Your configuration is production-ready

## Usage

### Quick Check
```bash
npm run compare-env
```

### Alternative
```bash
ts-node scripts/compare-env-files.ts
```

## What It Checks

### 1. Missing Variables
Identifies variables that exist in `.env.example` but are missing from your `.env`

### 2. Extra Variables  
Lists variables in your `.env` that aren't in `.env.example` (may be custom additions or outdated)

### 3. Placeholder Values
Detects values that still contain placeholders like:
- `YOUR-API-KEY`
- `your-password`
- `ask_operator`
- etc.

### 4. Critical Security Issues
Checks important security settings:
- **NODE_ENV**: Should be "production" for live trading
- **DRY_RUN**: Should be "false" for real transactions
- **CORS_ORIGIN**: Should not be "*" in production
- **JWT_SECRET**: Should be at least 128 characters
- **WALLET_PRIVATE_KEY**: Must be a real private key
- **GRAFANA_PASSWORD**: Should not be default password

## Example Output

```
════════════════════════════════════════════════════════════════════════════════
  .ENV FILE COMPARISON TOOL
════════════════════════════════════════════════════════════════════════════════

📄 Parsing .env.example...
   Found 245 variables in .env.example
📄 Parsing your .env...
   Found 238 variables in your .env

════════════════════════════════════════════════════════════════════════════════
  COMPARISON RESULTS
════════════════════════════════════════════════════════════════════════════════

❌ MISSING VARIABLES (7)
   These variables exist in .env.example but not in your .env:

   • ALERT_ON_CIRCUIT_BREAKER
   • ALERT_ON_EMERGENCY_STOP
   • CIRCUIT_BREAKER_COOLDOWN_PERIOD
   • EMERGENCY_STOP_MIN_BALANCE
   • MAX_DAILY_LOSS
   • MAX_TRADES_PER_HOUR
   • MIN_POSITION_SIZE

🔑 PLACEHOLDER VALUES (5)
   These variables still have placeholder values:

   • GEMINI_API_KEY = your_gemini_api_key_here
   • GITHUB_COPILOT_API_KEY = your_github_copilot_api_key_here
   • OPENAI_API_KEY = your_openai_api_key_here
   • WALLET_PRIVATE_KEY = ask_operator
   • MULTI_SIG_ADDRESS = 0x...

🚨 CRITICAL SECURITY ISSUES (3)

   ⚠️  NODE_ENV
      Set to "development" - should be "production" for live trading

   ⚠️  DRY_RUN
      Set to "true" - no real transactions will execute. Set to "false" for live trading.

   ⚠️  WALLET_PRIVATE_KEY
      Still set to placeholder. Must be a real private key for live trading.

════════════════════════════════════════════════════════════════════════════════
  RECOMMENDATIONS
════════════════════════════════════════════════════════════════════════════════

   ⚠️  Missing 7 variables. Add them to your .env file.
   🔑 5 placeholder values detected. Replace with actual values.
   🚨 3 critical security issues found. Address before production deployment.
   ✅ Run "npm run validate-env" to validate your configuration.
   📖 Review ENV_PRODUCTION_READINESS_REVIEW.md for detailed security guidance.

════════════════════════════════════════════════════════════════════════════════
  SUMMARY
════════════════════════════════════════════════════════════════════════════════

   ⚠️  Found 15 issues that need attention:
      • 7 missing variables
      • 5 placeholder values
      • 3 critical security issues

   📝 Review the details above and update your .env file accordingly.

════════════════════════════════════════════════════════════════════════════════
```

## Exit Codes

- **0**: No issues found, configuration looks good
- **1**: Issues detected that need attention

## Next Steps

After running this tool:

1. **Fix Missing Variables**: Add any missing variables to your `.env`
2. **Replace Placeholders**: Update placeholder values with real credentials
3. **Address Security Issues**: Fix critical security settings
4. **Validate**: Run `npm run validate-env` to ensure configuration is valid
5. **Review**: Read `ENV_PRODUCTION_READINESS_REVIEW.md` for production deployment guidance

## Related Scripts

- `npm run validate-env` - Validates your .env configuration
- `npm run validate-mainnet` - Validates mainnet-specific settings
- `npm run verify-key` - Verifies your private key format

## Security Notes

⚠️ **IMPORTANT**: Never commit your actual `.env` file to version control!

The `.env` file is in `.gitignore` for security. Only `.env.example` should be committed.

## Getting Help

If you need help configuring specific variables, see:
- `.env.example` - Contains detailed comments for each variable
- `docs/ENVIRONMENT_REFERENCE.md` - Complete environment variable reference
- `ENV_PRODUCTION_READINESS_REVIEW.md` - Production deployment checklist
