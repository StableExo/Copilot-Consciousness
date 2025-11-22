# Fixing Zero Balance Issue - Base Network Setup

## Problem
The bot was showing zero balance even though the wallet has USDC, WETH, and ETH on Base network. This was because:

1. The configuration defaulted to Ethereum mainnet instead of Base network
2. The RPC URL selection logic prioritized ETHEREUM_RPC_URL over BASE_RPC_URL
3. The wallet has funds on Base (chainId 8453) but not on Ethereum (chainId 1)

## Solution
The following changes were made to fix this issue:

### 1. Fixed RPC URL Selection Logic
The bot now intelligently selects the RPC URL based on the configured CHAIN_ID:
- Base (8453) → Uses BASE_RPC_URL
- Ethereum (1) → Uses ETHEREUM_RPC_URL
- Polygon (137) → Uses POLYGON_RPC_URL
- Arbitrum (42161) → Uses ARBITRUM_RPC_URL
- Optimism (10) → Uses OPTIMISM_RPC_URL

### 2. Changed Default Network
- OLD: Default chainId = 1 (Ethereum mainnet)
- NEW: Default chainId = 8453 (Base network)

### 3. Added Chain ID Validation
The bot now validates that the connected network matches the configured CHAIN_ID and throws an error if there's a mismatch.

### 4. Added Token Balance Display
- Bot logs USDC and WETH balances at startup
- Dashboard UI shows wallet balances for native token and ERC20 tokens
- Frontend displays balance information in a dedicated WalletBalances component

### 5. Integrated Dashboard Server
- Dashboard server now starts automatically when running `npm run dev`
- Dashboard runs on port 3000 by default
- Frontend can connect and display real-time data including wallet balances

## How to Set Up Base Network

### Step 1: Create .env File
Create a `.env` file in the project root with the following content:

```env
# Chain Configuration - Base Network
CHAIN_ID=8453

# RPC URL - Get from https://www.alchemy.com/ or https://infura.io/
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# Or use public RPC (not recommended for production)
# BASE_RPC_URL=https://mainnet.base.org

# Wallet Configuration
# IMPORTANT: Use a test wallet with small amounts for testing
WALLET_PRIVATE_KEY=your_private_key_here

# Bot Configuration
DRY_RUN=true
MIN_PROFIT_THRESHOLD=0.01
MIN_PROFIT_PERCENT=0.5
SCAN_INTERVAL=1000

# Dashboard Configuration
DASHBOARD_PORT=3000

# Node Environment
NODE_ENV=development
```

### Step 2: Get an RPC URL
You need an RPC URL for Base network. Options:

1. **Alchemy** (Recommended):
   - Go to https://www.alchemy.com/
   - Create a free account
   - Create a new app for "Base" network
   - Copy the HTTPS URL
   - Replace YOUR_API_KEY in the .env file

2. **Public RPC** (For testing only):
   - Use `https://mainnet.base.org`
   - Note: Public RPCs have rate limits and are not reliable for production

### Step 3: Add Your Wallet Private Key
⚠️ **SECURITY WARNING**: Never commit your private key to git!

1. Export your wallet's private key from MetaMask or your wallet app
2. Add it to the .env file
3. Make sure your wallet has some ETH on Base network for gas fees

### Step 4: Run the Bot

```bash
# Install dependencies (if not already done)
npm install

# Build the project
npm run build

# Run the bot (starts both bot and dashboard)
npm run dev
```

The bot will:
1. Connect to Base network (chainId 8453)
2. Display your ETH, USDC, and WETH balances
3. Start the dashboard server on port 3000
4. Allow the frontend (port 3001) to connect and display balances

### Step 5: View Dashboard

1. Open another terminal
2. Navigate to the frontend directory:
   ```bash
   cd frontend
   npm run dev
   ```
3. Open http://localhost:3001 in your browser
4. You should see your wallet balances displayed

## Verifying It Works

When you run `npm run dev`, you should see logs like:

```
[INFO] Loading configuration for environment: development
[INFO] Configuration loaded successfully
[INFO] - Chain ID: 8453
[INFO] - RPC URL: https://base-mainnet.g.alchemy...
[INFO] Connected to network: base (chainId: 8453)
[INFO] Wallet address: 0x...
[INFO] Wallet balance: X.XXXX ETH
[INFO] USDC balance: XXX.XXXXXX
[INFO] WETH balance: X.XXXX
```

If you see "Connected to network: homestead (chainId: 1)", it means you're still connecting to Ethereum mainnet instead of Base. Check your .env file.

## Troubleshooting

### Issue: "Chain ID mismatch! Configured: 8453, Connected: 1"
**Solution**: Your RPC URL is pointing to Ethereum mainnet instead of Base. Check your BASE_RPC_URL in the .env file.

### Issue: "RPC URL is required for chain ID 8453"
**Solution**: Set the BASE_RPC_URL in your .env file.

### Issue: Wallet balance shows 0.0 ETH
**Possible causes**:
1. You're connected to the wrong network (check the "Connected to network" log)
2. Your wallet actually has no balance on the connected network
3. The RPC URL is incorrect or not responding

### Issue: Frontend shows "Disconnected"
**Solution**: Make sure the dashboard server is running (it starts automatically with `npm run dev`). The frontend expects the backend on port 3000.

### Issue: No token balances displayed
**Solution**: The WalletBalanceService needs to be properly configured with your wallet address and provider. This happens automatically when the dashboard server starts.

## Token Addresses on Base

The bot checks balances for these tokens on Base network:
- **USDC**: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
- **WETH**: 0x4200000000000000000000000000000000000006

If you want to add more tokens, edit the `checkTokenBalances()` method in `src/main.ts`.

## Security Reminders

1. ✅ The .env file is in .gitignore - never commit it
2. ✅ Use DRY_RUN=true for testing
3. ✅ Test with small amounts first
4. ✅ Use a dedicated test wallet, not your main wallet
5. ✅ Keep your private key secure and never share it

## Next Steps

Once the bot is running correctly on Base network:
1. Monitor the dashboard to see real-time balance updates
2. Check the arbitrage opportunities being detected
3. When ready, set DRY_RUN=false to enable actual trading (only do this after thorough testing!)

## Additional Resources

- [Base Network Documentation](https://docs.base.org/)
- [Alchemy Documentation](https://docs.alchemy.com/)
- [MetaMask - Add Base Network](https://chainlist.org/chain/8453)
