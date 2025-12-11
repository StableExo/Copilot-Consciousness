// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @title ISoloMargin
 * @notice Interface for dYdX Solo Margin protocol flash loans
 * @dev dYdX offers 0% fee flash loans on Ethereum mainnet
 * 
 * dYdX Solo Margin Address:
 * - Ethereum: 0x1E0447b19BB6EcFdAe1e4AE1694b0C3659614e4e
 * 
 * Supported Markets:
 * - Market 0: WETH
 * - Market 1: SAI (deprecated)
 * - Market 2: USDC  
 * - Market 3: DAI
 * 
 * Documentation: https://docs.dydx.exchange/
 */
interface ISoloMargin {
    
    // Account struct
    struct Account {
        address owner;
        uint256 number;
    }
    
    // Action types
    enum ActionType {
        Deposit,   // Supply tokens
        Withdraw,  // Borrow tokens  
        Transfer,  // Transfer balance
        Buy,       // Buy using order
        Sell,      // Sell using order
        Trade,     // Trade with another account
        Liquidate, // Liquidate an account
        Vaporize,  // Vaporize an account
        Call       // Call external contract (for flash loans)
    }
    
    // Action arguments
    struct ActionArgs {
        ActionType actionType;
        uint256 accountId;
        AssetAmount amount;
        uint256 primaryMarketId;
        uint256 secondaryMarketId;
        address otherAddress;
        uint256 otherAccountId;
        bytes data;
    }
    
    // Asset amount types
    enum AssetDenomination {
        Wei,   // Absolute amount
        Par    // Relative amount
    }
    
    enum AssetReference {
        Delta, // Change in value
        Target // Absolute value
    }
    
    struct AssetAmount {
        bool sign;
        AssetDenomination denomination;
        AssetReference ref;
        uint256 value;
    }
    
    /**
     * @notice Execute a series of actions
     * @param accounts Array of accounts involved
     * @param actions Array of actions to perform
     * @dev For flash loans:
     *      1. Withdraw (borrow)
     *      2. Call (execute logic)
     *      3. Deposit (repay)
     */
    function operate(
        Account[] memory accounts,
        ActionArgs[] memory actions
    ) external;
    
    /**
     * @notice Get account balance for a market
     * @param account Account to check
     * @param marketId Market ID (0=WETH, 2=USDC, 3=DAI)
     * @return Balance in Wei
     */
    function getAccountWei(
        Account memory account,
        uint256 marketId
    ) external view returns (uint256);
}

/**
 * @title ICallee
 * @notice Interface for contracts called by dYdX during flash loans
 */
interface ICallee {
    /**
     * @notice Called by dYdX during flash loan execution
     * @param sender Account that initiated the operation
     * @param accountInfo Account struct
     * @param data Arbitrary data passed from operate() call
     */
    function callFunction(
        address sender,
        ISoloMargin.Account memory accountInfo,
        bytes memory data
    ) external;
}
