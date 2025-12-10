// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IBalancerVault
 * @notice Interface for Balancer V2 Vault flash loan functionality
 * @dev Balancer offers 0% fee flash loans - no protocol fee!
 * 
 * Balancer Vault Address (Same across all chains):
 * - Ethereum: 0xBA12222222228d8Ba445958a75a0704d566BF2C8
 * - Arbitrum: 0xBA12222222228d8Ba445958a75a0704d566BF2C8
 * - Optimism: 0xBA12222222228d8Ba445958a75a0704d566BF2C8
 * - Polygon:  0xBA12222222228d8Ba445958a75a0704d566BF2C8
 * - Base:     0xBA12222222228d8Ba445958a75a0704d566BF2C8
 *
 * Documentation: https://docs.balancer.fi/reference/contracts/flash-loans.html
 */
interface IBalancerVault {
    /**
     * @notice Performs a flash loan
     * @param recipient Contract that will receive the flash loan
     * @param tokens Array of token addresses to borrow
     * @param amounts Array of amounts to borrow (in token's decimals)
     * @param userData Arbitrary data to pass to the recipient
     */
    function flashLoan(
        IFlashLoanRecipient recipient,
        IERC20[] memory tokens,
        uint256[] memory amounts,
        bytes memory userData
    ) external;
}

/**
 * @title IFlashLoanRecipient
 * @notice Interface for contracts that want to receive Balancer flash loans
 */
interface IFlashLoanRecipient {
    /**
     * @notice Called by Balancer Vault to execute flash loan logic
     * @param tokens Array of borrowed token addresses
     * @param amounts Array of borrowed amounts
     * @param feeAmounts Array of fee amounts (typically 0 for Balancer)
     * @param userData Arbitrary data from flashLoan call
     * @dev Must return borrowed amount + fees to vault before function ends
     */
    function receiveFlashLoan(
        IERC20[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external;
}
