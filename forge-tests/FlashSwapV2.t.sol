// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;
pragma abicoder v2;

import "forge-std/Test.sol";
import "../contracts/FlashSwapV2.sol";
import "../contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";

/**
 * FlashSwapV2 Foundry Tests
 * 
 * Tests FlashSwapV2 contract functionality using Foundry's fork testing
 */
contract FlashSwapV2Test is Test {
    FlashSwapV2 public flashSwap;
    
    address constant OWNER = address(0x1234567890123456789012345678901234567890);
    address constant WETH = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1; // Arbitrum WETH
    address constant USDC = 0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8; // Arbitrum USDC
    address constant UNISWAP_V3_FACTORY = 0x1F98431c8aD98523631AE4a59f267346ea31F984;
    address constant SWAP_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    
    function setUp() public {
        // Fork Arbitrum at a specific block
        vm.createSelectFork(vm.envString("ARBITRUM_RPC_URL"), 228000000);
        
        // Deploy FlashSwapV2 as owner
        vm.prank(OWNER);
        flashSwap = new FlashSwapV2(UNISWAP_V3_FACTORY, SWAP_ROUTER);
    }
    
    function testDeployment() public {
        assertEq(flashSwap.owner(), OWNER, "Owner should be set correctly");
        assertEq(address(flashSwap.factory()), UNISWAP_V3_FACTORY, "Factory should be set correctly");
        assertEq(address(flashSwap.swapRouter()), SWAP_ROUTER, "Router should be set correctly");
    }
    
    function testOwnerCanWithdraw() public {
        // Give contract some WETH
        deal(WETH, address(flashSwap), 1 ether);
        
        uint256 balanceBefore = IERC20(WETH).balanceOf(OWNER);
        
        vm.prank(OWNER);
        flashSwap.withdraw(WETH, 1 ether);
        
        uint256 balanceAfter = IERC20(WETH).balanceOf(OWNER);
        assertEq(balanceAfter - balanceBefore, 1 ether, "Owner should receive withdrawn tokens");
    }
    
    function testNonOwnerCannotWithdraw() public {
        // Give contract some WETH
        deal(WETH, address(flashSwap), 1 ether);
        
        address nonOwner = address(0xdead);
        
        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(nonOwner);
        flashSwap.withdraw(WETH, 1 ether);
    }
    
    function testGetPoolAddress() public {
        address pool = flashSwap.getPoolAddress(WETH, USDC, 3000);
        assertTrue(pool != address(0), "Pool address should not be zero");
        
        // Verify the pool exists by checking code size
        uint256 size;
        assembly {
            size := extcodesize(pool)
        }
        assertTrue(size > 0, "Pool should have code");
    }
    
    function testContractReceivesETH() public {
        uint256 amount = 1 ether;
        
        (bool success, ) = address(flashSwap).call{value: amount}("");
        assertTrue(success, "Contract should receive ETH");
        assertEq(address(flashSwap).balance, amount, "Contract balance should increase");
    }
    
    function testOwnerCanWithdrawETH() public {
        // Send ETH to contract
        uint256 amount = 1 ether;
        (bool sent, ) = address(flashSwap).call{value: amount}("");
        require(sent, "Failed to send ETH");
        
        uint256 balanceBefore = OWNER.balance;
        
        vm.prank(OWNER);
        flashSwap.withdrawETH(amount);
        
        uint256 balanceAfter = OWNER.balance;
        assertEq(balanceAfter - balanceBefore, amount, "Owner should receive withdrawn ETH");
    }
    
    function testExecuteFlashSwapStructure() public {
        // This test verifies the function signature exists
        // Actual arbitrage would require specific market conditions
        
        FlashSwapV2.SwapStep[] memory path = new FlashSwapV2.SwapStep[](2);
        
        // Set up a dummy path (won't execute profitably, just tests structure)
        path[0] = FlashSwapV2.SwapStep({
            pool: address(0x1),
            tokenIn: WETH,
            tokenOut: USDC,
            amountIn: 1 ether,
            minAmountOut: 1000e6,
            protocol: FlashSwapV2.SwapProtocol.UNISWAPV3
        });
        
        path[1] = FlashSwapV2.SwapStep({
            pool: address(0x2),
            tokenIn: USDC,
            tokenOut: WETH,
            amountIn: 1000e6,
            minAmountOut: 1 ether,
            protocol: FlashSwapV2.SwapProtocol.UNISWAPV3
        });
        
        // This will revert due to invalid pools, but verifies function exists
        vm.expectRevert();
        flashSwap.executeFlashSwap(
            WETH,
            USDC,
            3000,
            1 ether,
            path
        );
    }
}
