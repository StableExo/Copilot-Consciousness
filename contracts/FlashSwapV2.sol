// SPDX-License-Identifier: MIT
pragma solidity 0.8.20; // Match periphery library version
pragma abicoder v2; // Use ABI v2 for complex structs/arrays

// --- Imports ---
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol"; // For safe ERC20 operations
import "@openzeppelin/contracts/security/ReentrancyGuard.sol"; // For reentrancy protection
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol"; // UniV3 Router interface
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol"; // UniV3 Pool interface
import "@uniswap/v3-core/contracts/interfaces/callback/IUniswapV3FlashCallback.sol"; // UniV3 Flash Callback interface
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol"; // UniV3 Factory interface
import "./libraries/PoolAddress.sol"; // UniV3 Pool address calculation (local fixed version)
import "./libraries/CallbackValidation.sol"; // UniV3 Callback validation (local fixed version)
import "./interfaces/IUniswapV2Router02.sol"; // Uniswap V2 / SushiSwap Router interface
import "./interfaces/IDODOV1V2Pool.sol"; // DODO Pool interface (needed for type casting)

// --- Aave Imports ---
interface IPool { // Aave V3 Pool interface for flash loans
    function flashLoan(
        address receiverAddress,
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata interestRateModes, // CORRECTED: was 'calvala'
        address onBehalfOf,
        bytes calldata params,
        uint16 referralCode
    ) external;
}

interface IFlashLoanReceiver { // Aave V3 Flash Loan Receiver interface
    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external returns (bool);

    function addressesProvider() external view returns (address);
    function pool() external view returns (address);
}


// --- Contract Definition ---
// --- VERSION v4.0 (FlashSwapV2) --- Adapted for Base Network. Simplified profit distribution - all profits go to owner.
// 
// NOTE: Compilation may show warnings from @openzeppelin/contracts v3.4.2-solc-0.7 ReentrancyGuard 
// about constructor visibility. This is expected and safe - it's a deprecation warning in the 
// OpenZeppelin library itself (not our code). The warning will be resolved when upgrading to 
// OpenZeppelin v4+ in the future (requires Solidity 0.8+).
//
contract FlashSwapV2 is IUniswapV3FlashCallback, IFlashLoanReceiver, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- State Variables ---
    ISwapRouter public immutable swapRouter; // Uniswap V3 Swap Router
    IUniswapV2Router02 public immutable sushiRouter; // SushiSwap Router (V2 compatible)
    address payable public immutable owner; // The contract deployer/owner (receives all profits)
    address public immutable v3Factory = 0x33128a8fC17869897dcE68Ed026d694621f6FDfD; // Uniswap V3 Factory Address (Base Mainnet)
    IPool public immutable aavePool; // Aave V3 Pool contract instance
    address public immutable aaveAddressesProvider; // Aave Addresses Provider address
    uint constant DEADLINE_OFFSET = 60; // Swap deadline in seconds from block.timestamp (e.g., 60 seconds)


    // --- DEX Type Constants ---
    uint8 constant DEX_TYPE_UNISWAP_V3 = 0;
    uint8 constant DEX_TYPE_SUSHISWAP = 1;
    uint8 constant DEX_TYPE_DODO = 2; // Kept for code structure


    // --- Structs ---
    enum CallbackType { TWO_HOP, TRIANGULAR } // Types of UniV3-specific flash loan paths
    struct FlashCallbackData { CallbackType callbackType; uint amount0Borrowed; uint amount1Borrowed; address caller; address poolBorrowedFrom; address token0; address token1; uint24 fee; bytes params; }
    struct TwoHopParams { address tokenIntermediate; uint24 feeA; uint24 feeB; uint amountOutMinimum1; uint amountOutMinimum2; }
    struct TriangularPathParams { address tokenA; address tokenB; address tokenC; uint24 fee1; uint24 fee2; uint24 fee3; uint amountOutMinimumFinal; }
    // SwapStep definition for generic Aave flash loan paths
    struct SwapStep { address pool; address tokenIn; address tokenOut; uint24 fee; uint256 minOut; uint8 dexType; }
    struct ArbParams { SwapStep[] path; address initiator; } // Parameters passed to Aave's executeOperation


    // --- Events ---
    event FlashSwapInitiated(address indexed caller, address indexed pool, CallbackType tradeType, uint amount0, uint amount1);
    event AaveFlashLoanInitiated(address indexed caller, address indexed asset, uint amount);
    event AaveArbitrageExecution(address indexed tokenBorrowed, uint amountBorrowed, uint feePaid);
    event ArbitrageExecution(CallbackType indexed tradeType, address indexed tokenBorrowed, uint amountBorrowed, uint feePaid);
    event SwapExecuted(uint swapNumber, uint8 dexType, address indexed tokenIn, address indexed tokenOut, uint amountIn, uint amountOut);
    event RepaymentSuccess(address indexed token, uint amountRepaid);
    event ProfitTransferred(address indexed token, address indexed recipient, uint amount);
    event EmergencyWithdrawal(address indexed token, address indexed recipient, uint amount);
    event TradeProfit(bytes32 indexed pathHash, address indexed tokenBorrowed, uint256 grossProfit, uint256 feePaid, uint256 netProfit);


    // --- Modifiers ---
    modifier onlyOwner() { require(msg.sender == owner, "FS:NA"); _; }


    // --- Constructor ---
    constructor(
        address _uniswapV3Router,
        address _sushiRouter,
        address _aavePoolAddress,
        address _aaveAddressesProvider
    ) {
        require(_uniswapV3Router != address(0), "FS:IUR");
        require(_sushiRouter != address(0), "FS:ISR");
        require(_aavePoolAddress != address(0), "FS:IAP");
        require(_aaveAddressesProvider != address(0), "FS:IAAP");

        swapRouter = ISwapRouter(_uniswapV3Router);
        sushiRouter = IUniswapV2Router02(_sushiRouter);
        aavePool = IPool(_aavePoolAddress);
        aaveAddressesProvider = _aaveAddressesProvider;
        owner = payable(msg.sender); // owner is the deployer, receives the main profit share
    }

    // --- Aave IFlashLoanReceiver Interface Implementations ---
    function addressesProvider() external view override returns (address) {
        return aaveAddressesProvider;
    }

    function pool() external view override returns (address) {
        return address(aavePool);
    }

    // --- Uniswap V3 Flash Callback ---
    // Called by Uniswap V3 pool after successful flash loan
    // msg.sender is the Uniswap V3 pool contract
    function uniswapV3FlashCallback( uint256 fee0, uint256 fee1, bytes calldata data ) external override nonReentrant {
        FlashCallbackData memory decodedData = abi.decode(data, (FlashCallbackData));

        PoolAddress.PoolKey memory poolKey = PoolAddress.PoolKey({ token0: decodedData.token0, token1: decodedData.token1, fee: decodedData.fee });
        require(msg.sender == decodedData.poolBorrowedFrom, "FS:CBW");
        CallbackValidation.verifyCallback(v3Factory, poolKey);

        address tokenBorrowed;
        uint amountBorrowed;
        uint totalAmountToRepay;
        uint feePaid;

        if (decodedData.amount1Borrowed > 0) {
            require(decodedData.amount0Borrowed == 0, "FS:BTB");
            tokenBorrowed = decodedData.token1;
            amountBorrowed = decodedData.amount1Borrowed;
            feePaid = fee1;
            totalAmountToRepay = amountBorrowed + feePaid;
        } else { // decodedData.amount0Borrowed > 0
            require(decodedData.amount1Borrowed == 0 && decodedData.amount0Borrowed > 0, "FS:BNA");
            tokenBorrowed = decodedData.token0;
            amountBorrowed = decodedData.amount0Borrowed;
            feePaid = fee0;
            totalAmountToRepay = amountBorrowed + feePaid;
        }

        emit ArbitrageExecution(decodedData.callbackType, tokenBorrowed, amountBorrowed, feePaid);

        // --- Execute Swaps ---
        uint finalAmountReceived;
        if (decodedData.callbackType == CallbackType.TRIANGULAR) {
            finalAmountReceived = _executeTriangularSwaps(tokenBorrowed, amountBorrowed, decodedData.params);
        } else if (decodedData.callbackType == CallbackType.TWO_HOP) {
            finalAmountReceived = _executeTwoHopSwaps(tokenBorrowed, amountBorrowed, decodedData.params);
        } else {
            revert("FS:UCT");
        }

        // --- Repay Loan and Handle Profit ---
        uint currentBalanceBorrowedToken = IERC20(tokenBorrowed).balanceOf(address(this));

        // Profit calculation happens BEFORE repayment/distribution
        // Ensure contract balance is sufficient to repay
        require(currentBalanceBorrowedToken >= totalAmountToRepay, "FS:IFR");

        uint grossProfit = currentBalanceBorrowedToken > amountBorrowed ? currentBalanceBorrowedToken - amountBorrowed : 0;
        uint netProfit = currentBalanceBorrowedToken > totalAmountToRepay ? currentBalanceBorrowedToken - totalAmountToRepay : 0; // Net profit is AFTER repayment amount+fee

        // Repay the flash loan *first*
        IERC20(tokenBorrowed).safeTransfer(msg.sender, totalAmountToRepay);
        emit RepaymentSuccess(tokenBorrowed, totalAmountToRepay);

        bytes32 pathHash = keccak256(decodedData.params); // Use params from the callback data for hash
        emit TradeProfit(pathHash, tokenBorrowed, grossProfit, feePaid, netProfit);

        // Transfer all net profit to owner
        if (netProfit > 0) {
            IERC20(tokenBorrowed).safeTransfer(owner, netProfit);
            emit ProfitTransferred(tokenBorrowed, owner, netProfit);
        }
    }

    // --- AAVE V3 Flash Loan Callback ---
    // Called by Aave Pool after successful flash loan
    // msg.sender is the Aave Pool contract
    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external override nonReentrant returns (bool) {
        require(msg.sender == address(aavePool), "FS:CBA");
        require(initiator == address(this), "FS:IFI"); // Initiator must be this contract
        require(assets.length == 1, "FS:MA"); // Assuming only one asset is borrowed at a time for arbitrage
        require(assets.length == amounts.length && amounts.length == premiums.length, "FS:ALA");

        // Decode params to get the path and the dynamic Tithe recipient
        ArbParams memory decodedParams = abi.decode(params, (ArbParams));

        address tokenBorrowed = assets[0];
        uint amountBorrowed = amounts[0];
        uint feePaid = premiums[0]; // Premium is the fee charged by Aave

        emit AaveArbitrageExecution(tokenBorrowed, amountBorrowed, feePaid);

        // --- Execute Swaps ---
        // This function executes the sequence of swaps defined in decodedParams.path
        uint finalAmountReceived = _executeSwapPath(decodedParams.path);
        require(finalAmountReceived > 0, "FS:AZA");

        // --- Repay Loan and Handle Profit ---
        uint totalAmountToRepay = amountBorrowed + feePaid;
        uint currentBalanceBorrowedTokenAfterSwaps = IERC20(tokenBorrowed).balanceOf(address(this));

        // Ensure contract balance is sufficient to repay the flash loan + Aave fee
        require(currentBalanceBorrowedTokenAfterSwaps >= totalAmountToRepay, "FS:IFR");

        uint grossProfit = currentBalanceBorrowedTokenAfterSwaps > amountBorrowed ? currentBalanceBorrowedTokenAfterSwaps - amountBorrowed : 0;
        uint netProfit = currentBalanceBorrowedTokenAfterSwaps > totalAmountToRepay ? currentBalanceBorrowedTokenAfterSwaps - totalAmountToRepay : 0; // Net profit is AFTER repayment amount+fee

        // Repay the flash loan *first*
        _approveSpenderIfNeeded(tokenBorrowed, address(aavePool), totalAmountToRepay); // Approve Aave Pool to pull funds
        // Aave's flashLoan function automatically handles pulling the repayment amount from this contract
        // No need for an explicit safeTransfer out to Aave here, the require(return == true) in Aave's loan handles it.
        // However, emitting RepaymentSuccess here is fine for logging.
        emit RepaymentSuccess(tokenBorrowed, totalAmountToRepay);

        bytes32 pathHash = keccak256(params); // Hash of the parameters sent to executeOperation
        emit TradeProfit(pathHash, tokenBorrowed, grossProfit, feePaid, netProfit);

        // Transfer all net profit to owner
        if (netProfit > 0) {
            IERC20(tokenBorrowed).safeTransfer(owner, netProfit);
            emit ProfitTransferred(tokenBorrowed, owner, netProfit);
        }

        return true; // Signal successful execution to Aave
    }

    // --- Internal functions for UniV3 Flash Loan Flow ---
    // Executes a 2-hop swap sequence: BorrowedToken -> IntermediateToken -> BorrowedToken
    function _executeTwoHopSwaps( address _tokenBorrowed, uint _amountBorrowed, bytes memory _params ) internal returns (uint finalAmount) {
        TwoHopParams memory arbParams = abi.decode(_params, (TwoHopParams));

        // Swap 1: Borrowed Token -> Intermediate Token
        _approveSpenderIfNeeded(_tokenBorrowed, address(swapRouter), _amountBorrowed);
        uint amountIntermediateReceived = _executeSingleV3Swap(
            1,
            _tokenBorrowed,
            arbParams.tokenIntermediate,
            arbParams.feeA,
            _amountBorrowed,
            arbParams.amountOutMinimum1
        );
        require(amountIntermediateReceived > 0, "FS:S1Z");

        // Swap 2: Intermediate Token -> Borrowed Token
        _approveSpenderIfNeeded(arbParams.tokenIntermediate, address(swapRouter), amountIntermediateReceived);
        finalAmount = _executeSingleV3Swap(
            2,
            arbParams.tokenIntermediate,
            _tokenBorrowed,
            arbParams.feeB,
            amountIntermediateReceived,
            arbParams.amountOutMinimum2
        );
         require(finalAmount > 0, "FS:S2Z");
         // Note: Profit calculation and repayment are handled in uniswapV3FlashCallback
    }

    // Executes a 3-hop swap sequence: TokenA -> TokenB -> TokenC -> TokenA
    function _executeTriangularSwaps( address _tokenA, uint _amountA, bytes memory _params ) internal returns (uint finalAmount) {
        TriangularPathParams memory pathParams = abi.decode(_params, (TriangularPathParams));
        require(pathParams.tokenA == _tokenA, "FS:TPA");

        // Swap 1: Token A -> Token B
        _approveSpenderIfNeeded(_tokenA, address(swapRouter), _amountA);
        uint amountB = _executeSingleV3Swap(
            1,
            _tokenA,
            pathParams.tokenB,
            pathParams.fee1,
            _amountA,
            0 // No minOut usually for intermediate hops
        );
        require(amountB > 0, "FS:TS1Z");

        // Swap 2: Token B -> Token C
        _approveSpenderIfNeeded(pathParams.tokenB, address(swapRouter), amountB);
        uint amountC = _executeSingleV3Swap(
            2,
            pathParams.tokenB,
            pathParams.tokenC,
            pathParams.fee2,
            amountB,
            0 // No minOut usually for intermediate hops
        );
        require(amountC > 0, "FS:TS2Z");

        // Swap 3: Token C -> Token A
        _approveSpenderIfNeeded(pathParams.tokenC, address(swapRouter), amountC);
        finalAmount = _executeSingleV3Swap(
            3,
            pathParams.tokenC,
            _tokenA,
            pathParams.fee3,
            amountC,
            pathParams.amountOutMinimumFinal // minOut applied to the final hop
        );
         require(finalAmount > 0, "FS:TS3Z");
         // Note: Profit calculation and repayment are handled in uniswapV3FlashCallback
    }

    // Executes a single swap using Uniswap V3's exactInputSingle function
    function _executeSingleV3Swap( uint _swapNumber, address _tokenIn, address _tokenOut, uint24 _fee, uint _amountIn, uint _amountOutMinimum ) internal returns (uint amountOut) {
        ISwapRouter.ExactInputSingleParams memory swapParams = ISwapRouter.ExactInputSingleParams({
            tokenIn: _tokenIn,
            tokenOut: _tokenOut,
            fee: _fee,
            recipient: address(this),
            deadline: block.timestamp + DEADLINE_OFFSET,
            amountIn: _amountIn,
            amountOutMinimum: _amountOutMinimum,
            sqrtPriceLimitX96: 0
        });

        try swapRouter.exactInputSingle(swapParams) returns (uint _amountOut) {
            amountOut = _amountOut;
            emit SwapExecuted(_swapNumber, DEX_TYPE_UNISWAP_V3, _tokenIn, _tokenOut, _amountIn, amountOut);
        } catch Error(string memory reason) {
            revert(string(abi.encodePacked("FS:S", _numToString(_swapNumber) ,"F:", reason)));
        } catch {
            revert(string(abi.encodePacked("FS:S", _numToString(_swapNumber), "FL")));
        }
    }

    // --- _executeSwapPath (General path executor for Aave flash loans) ---
    // Executes a sequence of swaps defined by the _path array across supported DEXs.
    function _executeSwapPath(SwapStep[] memory _path) internal returns (uint finalAmount) {
        uint amountIn = IERC20(_path[0].tokenIn).balanceOf(address(this));
        require(amountIn > 0, "FS:PSA0");

        for (uint i = 0; i < _path.length; i++) {
            SwapStep memory step = _path[i];
            uint amountOut = 0;

            address spender = address(0);
            if (step.dexType == DEX_TYPE_UNISWAP_V3) {
                spender = address(swapRouter);
            } else if (step.dexType == DEX_TYPE_SUSHISWAP) {
                 spender = address(sushiRouter);
            }
            // Add condition for Camelot if it uses a router vs direct pool interaction
            // else if (step.dexType == DEX_TYPE_CAMELOT) { ... }
             else if (step.dexType == DEX_TYPE_DODO) {
                 spender = step.pool; // DODO uses the pool address as spender for sellBase/buyBase
             }
             else {
                 revert("FS:IDT_APPROVE"); // Invalid DEX type for approval
             }

            // Approve the spender for the current amountIn before the swap
            _approveSpenderIfNeeded(step.tokenIn, spender, amountIn);


            if (step.dexType == DEX_TYPE_UNISWAP_V3) {
                amountOut = _executeSingleV3Swap(
                    i+1, // Swap number (1-based index)
                    step.tokenIn,
                    step.tokenOut,
                    step.fee,
                    amountIn, // Use the current amountIn balance
                    step.minOut // minOut applies only to the last step, handled in builder
                );
            } else if (step.dexType == DEX_TYPE_SUSHISWAP) {
                address[] memory path = new address[](2);
                path[0] = step.tokenIn;
                path[1] = step.tokenOut;

                // Sushi V2 style swap (swapExactTokensForTokens)
                try sushiRouter.swapExactTokensForTokens(
                    amountIn, // Use the current amountIn balance
                    step.minOut, // minOut applies only to the last step, handled in builder
                    path,
                    address(this), // Send output to this contract
                    block.timestamp + DEADLINE_OFFSET
                ) returns (uint[] memory amounts) {
                    amountOut = amounts[amounts.length - 1]; // Output is the last element of the returned amounts array
                    emit SwapExecuted(i+1, DEX_TYPE_SUSHISWAP, step.tokenIn, step.tokenOut, amountIn, amountOut);
                } catch Error(string memory reason) {
                    revert(string(abi.encodePacked("FS:S", _numToString(i+1), "SF:", reason)));
                } catch {
                    revert(string(abi.encodePacked("FS:S", _numToString(i+1), "SFL")));
                }
            } else if (step.dexType == DEX_TYPE_DODO) {
                // --- DODO Swaps (Need to re-implement based on DODO interface/logic) ---
                // The IDODOV1V2Pool interface needs to match the specific DODO pool type.
                // You'll likely need to call sellBase() or buyBase() depending on the trade direction for this step.
                // Example implementation (requires correct IDODOV1V2Pool interface):
                // IDODOV1V2Pool dodoPool = IDODOV1V2Pool(step.pool); // Commented out - unused while DODO is disabled
                // You might need pool-specific logic or functions like baseToken()/quoteToken() if available in your interface
                // or pass base/quote tokens in the SwapStep struct if the interface is generic.
                // For now, keeping the revert as in the original code until DODO execution is fully tackled in Phase 2.
                revert("FS:DODO_TEMP_DISABLED"); // Still disabled as per original code/roadmap

                /*
                // Example re-implementation pseudocode (requires IDODOV1V2Pool to have baseToken/quoteToken/sellBase/buyBase):
                address baseToken = dodoPool.baseToken(); // Check interface
                address quoteToken = dodoPool.quoteToken(); // Check interface

                if (step.tokenIn == baseToken && step.tokenOut == quoteToken) {
                    // Selling Base token
                    try dodoPool.sellBase(amountIn, step.minOut, address(this), block.timestamp + DEADLINE_OFFSET) returns (uint256 receivedAmount) {
                        amountOut = receivedAmount;
                        emit SwapExecuted(i+1, DEX_TYPE_DODO, step.tokenIn, step.tokenOut, amountIn, amountOut);
                    } catch Error(string memory reason) { revert(string(abi.encodePacked("FS:D", _numToString(i+1), "SF:", reason))); } catch { revert(string(abi.encodePacked("FS:D", _numToString(i+1), "SFL"))); }
                } else if (step.tokenIn == quoteToken && step.tokenOut == baseToken) {
                    // Buying Base token (selling Quote)
                    try dodoPool.buyBase(amountIn, step.minOut, address(this), block.timestamp + DEADLINE_OFFSET) returns (uint256 receivedAmount) {
                        amountOut = receivedAmount;
                        emit SwapExecuted(i+1, DEX_TYPE_DODO, step.tokenIn, step.tokenOut, amountIn, amountOut);
                    } catch Error(string memory reason) { revert(string(abi.encodePacked("FS:D", _numToString(i+1), "BF:", reason))); } catch { revert(string(abi.encodePacked("FS:D", _numToString(i+1), "BFL"))); }
                } else {
                    revert("FS:DODO_INVALID_PAIR"); // Should be caught off-chain by fetcher/finder logic
                }
                */
            } else {
                revert("FS:IDT_EXEC"); // Invalid DEX type for execution
            }

            // Update amountIn for the next step
            amountIn = amountOut;
            // Ensure we received a positive amount from the swap
            require(amountIn > 0, string(abi.encodePacked("FS:PS", _numToString(i+1), "Z")));
        }

        finalAmount = amountIn; // The final amount received after the last swap
    }

    // --- Helper Functions ---
    // Approves spender for maximum amount if current allowance is less than max uint256.
    // Prevents issues with allowances needing to be reset after spending.
    // Using type(uint256).max is standard practice for DEX routers/pools.
    function _approveSpenderIfNeeded(address _token, address _spender, uint _amount) internal {
         if (_amount == 0) { return; } // No need to approve if amount is zero
        // Check current allowance. If it's less than uint256.max, approve max.
        if (IERC20(_token).allowance(address(this), _spender) < type(uint256).max) {
            IERC20(_token).safeApprove(_spender, type(uint256).max);
        }
    }

     // Helper function to convert uint to string (for revert messages)
    function _numToString(uint _num) internal pure returns (string memory) {
        if (_num == 0) return "0";
        uint j = _num;
        uint len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint k = len;
        while (_num != 0) {
            k = k-1;
            uint8 temp = (48 + uint8(_num % 10)); // Convert digit to ASCII character
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _num /= 10;
        }
        return string(bstr);
    }


    // --- External Functions ---
    // Initiates a Uniswap V3 flash loan by calling the pool's flash function.
    // This contract acts as the receiver.
    function initiateUniswapV3FlashLoan(
        CallbackType callbackType,
        address poolAddress, // The V3 pool address
        uint amount0, // Amount of token0 to borrow
        uint amount1, // Amount of token1 to borrow
        bytes calldata params // Encoded parameters for the callback logic (e.g., TwoHopParams or TriangularPathParams)
    ) external onlyOwner {
        IUniswapV3Pool uniswapPool = IUniswapV3Pool(poolAddress);
        address token0 = uniswapPool.token0();
        address token1 = uniswapPool.token1();
        uint24 fee = uniswapPool.fee();

        // Encode data to be passed to uniswapV3FlashCallback
        bytes memory data = abi.encode(
            FlashCallbackData({
                callbackType: callbackType,
                amount0Borrowed: amount0,
                amount1Borrowed: amount1,
                caller: msg.sender, // Should be 'owner' based on onlyOwner modifier
                poolBorrowedFrom: poolAddress,
                token0: token0,
                token1: token1,
                fee: fee,
                params: params
            })
        );

        emit FlashSwapInitiated(msg.sender, poolAddress, callbackType, amount0, amount1);

        // Initiate the flash loan from the V3 pool
        uniswapPool.flash(address(this), amount0, amount1, data);
    }

    // Initiates an Aave V3 flash loan by calling the Aave pool's flashLoan function.
    // This contract acts as the receiver.
    function initiateAaveFlashLoan(
        address asset, // The asset to borrow
        uint amount, // The amount to borrow
        bytes calldata params // Encoded ArbParams struct containing swap path and initiator
    ) external onlyOwner {
        address[] memory assets = new address[](1);
        assets[0] = asset;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;

        uint256[] memory modes = new uint256[](1); // 0 = NoDebt, 1 = Stable, 2 = Variable
        modes[0] = 0; // Arbitrage usually uses NoDebt flash loans

        // The 'params' argument for Aave's flashLoan contains custom data
        // that Aave will pass back to our executeOperation function.
        // This is where we put our encoded ArbParams struct.
        bytes memory paramsForAave = params; // Pass the params received from the off-chain caller directly

        // Decode params only for logging the recipient in the event here
        ArbParams memory decodedParamsForEvent = abi.decode(paramsForAave, (ArbParams));
        emit AaveFlashLoanInitiated(decodedParamsForEvent.initiator, asset, amount);

        // Initiate the flash loan from the Aave Pool
        aavePool.flashLoan(
            address(this), // receiverAddress: This contract
            assets,
            amounts,
            modes,
            address(this), // onBehalfOf: This contract (msg.sender for Aave)
            paramsForAave, // params: Our custom data (encoded ArbParams)
            0 // referralCode
        );
    }

    // --- Emergency Functions ---
    // Allows owner to withdraw stranded ERC20 tokens
    function emergencyWithdraw(address token) external onlyOwner {
        uint balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "FS:NW");
        IERC20(token).safeTransfer(owner, balance);
        emit EmergencyWithdrawal(token, owner, balance);
    }

    // Allows owner to withdraw stranded Ether
    function emergencyWithdrawETH() external onlyOwner nonReentrant {
        uint balance = address(this).balance;
        require(balance > 0, "FS:NWE");
        emit EmergencyWithdrawal(address(0), owner, balance);
        (bool sent, ) = owner.call{value: balance}("");
        require(sent, "FS:ETF");
    }

    // --- Fallback ---
    receive() external payable {} // Allows receiving Ether
}
