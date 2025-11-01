// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import { IFlashLoanReceiver } from "@aave/core-v3/contracts/flashloan/interfaces/IFlashLoanReceiver.sol";
import { IPool } from "@aave/core-v3/contracts/interfaces/IPool.sol";
import { IPoolAddressesProvider } from "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IUniswapV2Router
 * @dev Simplified interface for a Uniswap V2-compatible router.
 */
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);

    function WETH() external pure returns (address);
}

/**
 * @title ArbitrageExecutor
 * @author Copilot
 * @notice This contract is designed to execute arbitrage opportunities using flash loans from Aave V3.
 * It borrows assets, performs a series of trades on various DEXs, and repays the loan within a single transaction.
 */
contract ArbitrageExecutor is IFlashLoanReceiver {
    IPoolAddressesProvider public immutable ADDRESSES_PROVIDER;
    IPool public immutable POOL;
    address public owner;

    struct ArbitrageParams {
        address router1;
        address router2;
        address[] path1; // e.g., [DAI, WETH]
        address[] path2; // e.g., [WETH, DAI]
    }

    error InvalidInitiator(address actual, address expected);
    error NotOwner(address caller);

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert NotOwner(msg.sender);
        }
        _;
    }

    /**
     * @param provider The address of the Aave V3 PoolAddressesProvider contract.
     */
    constructor(address provider) {
        ADDRESSES_PROVIDER = IPoolAddressesProvider(provider);
        POOL = IPool(ADDRESSES_PROVIDER.getPool());
        owner = msg.sender;
    }

    /**
     * @notice This function is called by the Aave V3 Pool after the flash loan is initiated.
     */
    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        if (msg.sender != address(POOL)) {
            revert InvalidInitiator(msg.sender, address(POOL));
        }

        // Decode the arbitrage parameters
        ArbitrageParams memory tradeParams = abi.decode(params, (ArbitrageParams));

        // --- CORE ARBITRAGE LOGIC ---
        address borrowedAsset = assets[0];
        uint256 borrowedAmount = amounts[0];

        // 1. Approve the first DEX to spend the borrowed asset
        IERC20(borrowedAsset).approve(tradeParams.router1, borrowedAmount);

        // 2. Execute the first trade (e.g., DAI -> WETH on SushiSwap)
        IUniswapV2Router(tradeParams.router1).swapExactTokensForTokens(
            borrowedAmount,
            0, // We accept any amount out for this example
            tradeParams.path1,
            address(this),
            block.timestamp + 60
        );

        // 3. Get the balance of the intermediate asset
        address intermediateAsset = tradeParams.path1[tradeParams.path1.length - 1];
        uint256 intermediateAmount = IERC20(intermediateAsset).balanceOf(address(this));

        // 4. Approve the second DEX to spend the intermediate asset
        IERC20(intermediateAsset).approve(tradeParams.router2, intermediateAmount);

        // 5. Execute the second trade (e.g., WETH -> DAI on Uniswap)
        IUniswapV2Router(tradeParams.router2).swapExactTokensForTokens(
            intermediateAmount,
            0, // We accept any amount out
            tradeParams.path2,
            address(this),
            block.timestamp + 60
        );

        // --- PROFIT VERIFICATION & REPAYMENT ---
        uint256 finalAmount = IERC20(borrowedAsset).balanceOf(address(this));
        uint256 amountOwed = borrowedAmount + premiums[0];

        // This is a simplified check. A real implementation would require more robust profit calculation.
        require(finalAmount >= amountOwed, "Arbitrage failed: Not enough funds to repay loan.");

        // Repay the loan + premium
        IERC20(borrowedAsset).approve(address(POOL), amountOwed);

        return true;
    }

    /**
     * @notice Initiates a flash loan with a specific arbitrage route.
     * @param asset The address of the asset to borrow.
     * @param amount The amount of the asset to borrow.
     * @param params The encoded parameters for the arbitrage trade.
     */
    function requestFlashLoan(address asset, uint256 amount, ArbitrageParams calldata params) external onlyOwner {
        address[] memory assets = new address[](1);
        assets[0] = asset;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;

        uint256[] memory modes = new uint256[](1);
        modes[0] = 0; // No interest rate for flash loans

        bytes memory encodedParams = abi.encode(params);

        POOL.flashLoan(
            address(this),
            assets,
            amounts,
            modes,
            address(this), // Initiator is this contract
            encodedParams,
            0
        );
    }

    /**
     * @notice Withdraws profits from the contract to the owner.
     * @param token The address of the token to withdraw.
     */
    function withdraw(address token) external onlyOwner {
        IERC20(token).transfer(owner, IERC20(token).balanceOf(address(this)));
    }

    receive() external payable {}
}
