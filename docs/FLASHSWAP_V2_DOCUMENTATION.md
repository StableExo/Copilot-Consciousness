# FlashSwapV2 Contract Documentation

## Overview

FlashSwapV2 is an advanced flash loan arbitrage contract adapted from the PROJECT-HAVOC implementation, optimized for the Base network. It supports dual flash loan providers (Uniswap V3 and Aave V3), multi-DEX swaps, and advanced gas optimizations.

## Key Features

- **Dual Flash Loan Providers**: 
  - Uniswap V3 flash loans (two-hop and triangular arbitrage paths)
  - Aave V3 flash loans (multi-step arbitrage paths)

- **Multi-DEX Support**:
  - Uniswap V3
  - SushiSwap (V2 compatible)
  - DODO (framework ready, needs implementation)

- **Security Features**:
  - ReentrancyGuard protection
  - Callback validation for Uniswap V3
  - Owner-only emergency withdrawal
  - SafeERC20 for token operations

- **Simplified Profit Distribution**:
  - All profits go to contract owner

## Network Configuration

### Base Mainnet Addresses

```
Uniswap V3 Factory: 0x33128a8fC17869897dcE68Ed026d694621f6FDfD
Uniswap V3 Router:  0x2626664c2603336E57B271c5C0b26F421741e481
SushiSwap Router:   0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891
Aave V3 Pool:       0xA238Dd80C259a72e81d7e4664a9801593F98d1c5
Aave Provider:      0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D
WETH:               0x4200000000000000000000000000000000000006
```

### Base Sepolia (Testnet) Addresses

```
Uniswap V3 Router:  0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4
Aave V3 Pool:       0x07eA79F68B2B3df564D0A34F8e19D9B1e339814b
Aave Provider:      0x9957E7F97F4c5357c2C93fB0D618A0b87E0C97A1
```

## Deployment

### Prerequisites

1. Configure your `.env` file with:
   - `WALLET_PRIVATE_KEY` - Your deployment wallet private key
   - `BASE_RPC_URL` - Base network RPC endpoint
   - `BASE_SEPOLIA_RPC_URL` - Base Sepolia RPC endpoint (for testnet)

2. Ensure you have sufficient ETH on Base for deployment gas fees

### Deploy to Base Mainnet

```bash
npm run deploy:flashswapv2
```

### Deploy to Base Sepolia (Testnet)

```bash
npm run deploy:flashswapv2:testnet
```

### Manual Deployment

```bash
npx hardhat run scripts/deployFlashSwapV2.ts --network base
```

## Contract Verification

After deployment, verify the contract on Basescan:

```bash
npx hardhat verify --network base <CONTRACT_ADDRESS> \
  0x2626664c2603336E57B271c5C0b26F421741e481 \
  0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891 \
  0xA238Dd80C259a72e81d7e4664a9801593F98d1c5 \
  0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D
```

## Usage

### 1. Initiate Uniswap V3 Flash Loan (Two-Hop Arbitrage)

Execute a two-hop arbitrage using Uniswap V3 flash loan:

```solidity
function initiateUniswapV3FlashLoan(
    CallbackType _callbackType,
    address _poolAddress,
    uint _amount0,
    uint _amount1,
    bytes calldata _params
) external onlyOwner nonReentrant
```

**Parameters:**
- `_callbackType` - Type of arbitrage (TWO_HOP or TRIANGULAR)
- `_poolAddress` - The Uniswap V3 pool address to borrow from
- `_amount0` - Amount of token0 to borrow
- `_amount1` - Amount of token1 to borrow
- `_params` - Encoded parameters for the callback logic (TwoHopParams or TriangularPathParams)

**Example:**
```javascript
const params = ethers.utils.defaultAbiCoder.encode(
  ["tuple(address tokenIntermediate, uint24 feeA, uint24 feeB, uint amountOutMinimum1, uint amountOutMinimum2)"],
  [{
    tokenIntermediate: USDC_ADDRESS,
    feeA: 3000,
    feeB: 3000,
    amountOutMinimum1: ethers.utils.parseUnits("1500", 6),
    amountOutMinimum2: ethers.utils.parseEther("0.99")
  }]
);

const tx = await flashSwapV2.initiateUniswapV3FlashLoan(
  0,  // TWO_HOP
  POOL_ADDRESS,
  ethers.utils.parseEther("1"),  // amount0
  0,  // amount1
  params
);
```

### 2. Initiate Aave V3 Flash Loan (Multi-Step Arbitrage)

Execute a multi-step arbitrage using Aave V3 flash loan:

```solidity
function initiateAaveFlashLoan(
    address _asset,
    uint _amount,
    bytes calldata _params
) external onlyOwner nonReentrant
```

**Parameters:**
- `_asset` - Token to borrow from Aave
- `_amount` - Amount to borrow
- `_params` - Encoded ArbParams containing swap path and initiator

**ArbParams Structure:**
```solidity
struct ArbParams {
    SwapStep[] path;
    address initiator;
}

struct SwapStep {
    address pool;        // DEX pool/router address
    address tokenIn;     // Input token
    address tokenOut;    // Output token
    uint24 fee;         // Pool fee (for Uniswap V3)
    uint256 minOut;     // Minimum output amount
    uint8 dexType;      // 0=UniswapV3, 1=SushiSwap, 2=DODO
}
```

**Example:**
```javascript
const swapPath = [
  {
    pool: UNISWAP_V3_ROUTER,
    tokenIn: WETH_ADDRESS,
    tokenOut: USDC_ADDRESS,
    fee: 3000,
    minOut: ethers.utils.parseUnits("1500", 6),
    dexType: 0  // Uniswap V3
  },
  {
    pool: SUSHISWAP_ROUTER,
    tokenIn: USDC_ADDRESS,
    tokenOut: WETH_ADDRESS,
    fee: 0,  // Not used for SushiSwap
    minOut: ethers.utils.parseEther("1.01"),
    dexType: 1  // SushiSwap
  }
];

const arbParams = {
  path: swapPath,
  initiator: ownerAddress
};

const encodedParams = ethers.utils.defaultAbiCoder.encode(
  ["tuple(tuple(address pool, address tokenIn, address tokenOut, uint24 fee, uint256 minOut, uint8 dexType)[] path, address initiator)"],
  [arbParams]
);

const tx = await flashSwapV2.initiateAaveFlashLoan(
  WETH_ADDRESS,
  ethers.utils.parseEther("10"),
  encodedParams
);
```

### 3. Emergency Withdrawal

Owner can withdraw stuck tokens in case of emergency:

```solidity
function emergencyWithdraw(address token, address recipient) external onlyOwner
```

**Example:**
```javascript
await flashSwapV2.emergencyWithdraw(WETH_ADDRESS, ownerAddress);
```

## Events

The contract emits several events for monitoring:

```solidity
event FlashSwapInitiated(address indexed caller, address indexed pool, CallbackType tradeType, uint amount0, uint amount1);
event AaveFlashLoanInitiated(address indexed caller, address indexed asset, uint amount);
event SwapExecuted(uint swapNumber, uint8 dexType, address indexed tokenIn, address indexed tokenOut, uint amountIn, uint amountOut);
event ArbitrageExecution(CallbackType indexed tradeType, address indexed tokenBorrowed, uint amountBorrowed, uint feePaid);
event TradeProfit(bytes32 indexed pathHash, address indexed tokenBorrowed, uint256 grossProfit, uint256 feePaid, uint256 netProfit);
event ProfitTransferred(address indexed token, address indexed recipient, uint amount);
event EmergencyWithdrawal(address indexed token, address indexed recipient, uint amount);
```

## Gas Optimization Tips

1. **Use appropriate pool fees**: Lower fee pools (0.05%, 0.3%) are generally cheaper
2. **Minimize swap steps**: Each swap costs gas
3. **Set realistic minimum outputs**: Too tight slippage can cause reverts
4. **Monitor gas prices**: Execute during low gas periods on Base

## Security Considerations

1. **Owner-Only Functions**: Only the contract deployer can initiate flash loans
2. **ReentrancyGuard**: Protects against reentrancy attacks
3. **Callback Validation**: Ensures callbacks come from legitimate Uniswap V3 pools
4. **Minimum Output Checks**: Protects against sandwich attacks and excessive slippage
5. **Emergency Withdrawal**: Allows recovery of stuck funds

## Testing on Testnet

Before using on mainnet, test on Base Sepolia:

1. Get Base Sepolia ETH from [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
2. Deploy contract to testnet: `npm run deploy:flashswapv2:testnet`
3. Test with small amounts first
4. Monitor transactions on [Base Sepolia Scan](https://sepolia.basescan.org/)

## Integration with Bot

Example integration in TypeScript:

```typescript
import { ethers } from "ethers";
import FlashSwapV2ABI from "./artifacts/contracts/FlashSwapV2.sol/FlashSwapV2.json";

const provider = new ethers.providers.JsonRpcProvider(process.env.BASE_RPC_URL);
const wallet = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY!, provider);
const flashSwapV2 = new ethers.Contract(
  process.env.FLASHSWAP_V2_ADDRESS!,
  FlashSwapV2ABI.abi,
  wallet
);

// Execute arbitrage
async function executeArbitrage(opportunity: ArbitrageOpportunity) {
  const arbParams = {
    path: opportunity.swapPath,
    initiator: wallet.address
  };
  
  const encodedParams = ethers.utils.defaultAbiCoder.encode(
    ["tuple(tuple(address pool, address tokenIn, address tokenOut, uint24 fee, uint256 minOut, uint8 dexType)[] path, address initiator)"],
    [arbParams]
  );
  
  const tx = await flashSwapV2.initiateAaveFlashLoan(
    opportunity.tokenBorrow,
    opportunity.amountBorrow,
    encodedParams,
    {
      gasLimit: 500000,
      gasPrice: ethers.utils.parseUnits('0.001', 'gwei')
    }
  );
  
  const receipt = await tx.wait();
  console.log("Arbitrage executed:", receipt.transactionHash);
}
```

## Troubleshooting

### Common Issues

1. **"FS:IUR" / "FS:ISR" / "FS:IAP" errors**: Invalid router/pool addresses
2. **"FS:CBW" error**: Callback not from expected Uniswap V3 pool
3. **"FS:NA" error**: Not authorized (not owner)
4. **Transaction reverts**: Check slippage settings, ensure sufficient liquidity

### Debug Steps

1. Check contract balance for borrowed token
2. Verify pool addresses and fees
3. Simulate transaction locally first
4. Review event logs for SwapExecuted events
5. Check Basescan for detailed error messages

## Resources

- [Uniswap V3 Docs](https://docs.uniswap.org/contracts/v3/overview)
- [Aave V3 Docs](https://docs.aave.com/developers/getting-started/readme)
- [Base Network Docs](https://docs.base.org/)
- [PROJECT-HAVOC Repository](https://github.com/metallicax4xyou/PROJECT-HAVOC)
- [Base Mainnet Explorer](https://basescan.org/)
- [Base Sepolia Explorer](https://sepolia.basescan.org/)

## Support

For issues or questions:
- Open an issue in the repository
- Review the [SECURITY.md](../SECURITY.md) for security concerns
- Check existing documentation in [docs/](../docs/)
