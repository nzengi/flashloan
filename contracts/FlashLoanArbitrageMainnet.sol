// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
    Mainnet instances:
    - Uniswap V2 Router:                    0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D
    - Sushiswap V1 Router:                  0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F
    - DAI:                                  0x6B175474E89094C44Da98b954EedeAC495271d0F
    - ETH:                                  0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
    - Aave V3 Pool:                         0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2
    - Aave V3 PoolAddressesProvider:        0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e
*/

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';

interface IPool {
    function flashLoan(
        address receiverAddress,
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata interestRateModes,
        address onBehalfOf,
        bytes calldata params,
        uint16 referralCode
    ) external;
}

interface IFlashLoanReceiver {
    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external returns (bool);
}

contract ArbitragerV3 is IFlashLoanReceiver {
    
    IPool public immutable aavePool;
    IUniswapV2Router02 public immutable uniswapRouter;
    IUniswapV2Router02 public immutable sushiswapRouter;
    
    address public immutable owner;
    uint256 private constant MAX_INT = 2**256 - 1;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    enum Exchange {
        UNI,
        SUSHI
    }

    struct ExtraData {
        address swapToken;
        uint256 minProfit;
        Exchange firstRouter;
        Exchange secondRouter;
    }

    constructor(
        IPool _aavePool,
        IUniswapV2Router02 _uniswapRouter,
        IUniswapV2Router02 _sushiswapRouter
    ) {
        aavePool = _aavePool;
        uniswapRouter = _uniswapRouter;
        sushiswapRouter = _sushiswapRouter;
        owner = msg.sender;
    }

    /**
     * @dev This function is called after your contract has received the flash loaned amount
     * @param assets The addresses of the flash-borrowed assets
     * @param amounts The amounts of the flash-borrowed assets
     * @param premiums The fee of each flash-borrowed asset
     * @param initiator The address of the flashloan initiator
     * @param params The byte-encoded params passed when initiating the flashloan
     * @return True if the execution of the operation succeeds, false otherwise
     */
    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        require(msg.sender == address(aavePool), "INVALID_CALLER");
        require(initiator == address(this), "INVALID_INITIATOR");
        require(assets.length == 1, "INVALID_ASSETS_LENGTH");
        
        address borrowedToken = assets[0];
        uint256 amount = amounts[0];
        uint256 premium = premiums[0];
        
        ExtraData memory extraData = abi.decode(params, (ExtraData));
        
        // Execute arbitrage
        uint256 amountReceivedBorrowedToken = _arbitrage(borrowedToken, amount, extraData);
        
        uint256 repay = amount + premium; // 0.05% fee for Aave V3
        uint256 profit = amountReceivedBorrowedToken > repay ? amountReceivedBorrowedToken - repay : 0;
        
        require(profit >= extraData.minProfit, "INSUFFICIENT_PROFIT");
        
        // Approve the Pool contract allowance to pull the owed amount
        IERC20(borrowedToken).approve(address(aavePool), repay);
        
        return true;
    }

    function arbitrage(
        address borrowedToken,
        uint256 amount,
        ExtraData calldata extraData
    ) external onlyOwner {
        // Pre-flight checks
        _checkAmountOut(borrowedToken, amount, extraData);
        _validateArbitrageParams(extraData);
        
        address[] memory assets = new address[](1);
        assets[0] = borrowedToken;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;
        
        // 0 = no debt, pay everything back
        uint256[] memory modes = new uint256[](1);
        modes[0] = 0;
        
        bytes memory _data = abi.encode(extraData);
        
        aavePool.flashLoan(
            address(this),
            assets,
            amounts,
            modes,
            address(this),
            _data,
            0 // referralCode
        );
    }
    
    function _arbitrage(
        address borrowedToken,
        uint256 amount,
        ExtraData memory extraData
    ) private returns (uint256) {
        IUniswapV2Router02 router1 = _getRouter(extraData.firstRouter);
        IUniswapV2Router02 router2 = _getRouter(extraData.secondRouter);
        
        IERC20(borrowedToken).approve(address(router1), amount);
        
        address[] memory path1 = new address[](2);
        path1[0] = borrowedToken;
        path1[1] = extraData.swapToken;
        
        uint256[] memory amountOut1 = router1.swapExactTokensForTokens(
            amount,
            0, // Accept any amount of tokens out
            path1,
            address(this),
            block.timestamp + 120
        );
        
        uint256 amountOutSwapToken = amountOut1[amountOut1.length - 1];
        
        IERC20(extraData.swapToken).approve(address(router2), amountOutSwapToken);
        
        address[] memory path2 = new address[](2);
        path2[0] = extraData.swapToken;
        path2[1] = borrowedToken;
        
        uint256[] memory amountOut2 = router2.swapExactTokensForTokens(
            amountOutSwapToken,
            0, // Accept any amount of tokens out
            path2,
            address(this),
            block.timestamp + 120
        );
        
        return amountOut2[amountOut2.length - 1];
    }

    function _checkAmountOut(
        address borrowedToken,
        uint256 amount,
        ExtraData calldata extraData
    ) private view {
        IUniswapV2Router02 router1 = _getRouter(extraData.firstRouter);
        IUniswapV2Router02 router2 = _getRouter(extraData.secondRouter);

        uint256 amountOutSwapToken = _getAmountOut(router1, borrowedToken, extraData.swapToken, amount);
        uint256 amountOutBorrowedToken = _getAmountOut(router2, extraData.swapToken, borrowedToken, amountOutSwapToken);
        
        uint256 repay = amount + (amount * 5) / 10000; // 0.05% fee for Aave V3
        require(amountOutBorrowedToken > repay + extraData.minProfit, 'ARBITRAGER_INSUFFICIENT_PROFIT');
    }

    function _getAmountOut(
        IUniswapV2Router02 router,
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) private view returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        uint256[] memory amountOutMins = router.getAmountsOut(amountIn, path);
        return amountOutMins[path.length - 1];
    }

    function _getRouter(Exchange router) private view returns (IUniswapV2Router02) {
        return router == Exchange.UNI ? uniswapRouter : sushiswapRouter;
    }
    
    function _validateArbitrageParams(ExtraData calldata extraData) private pure {
        require(extraData.firstRouter != extraData.secondRouter, "SAME_ROUTER");
        require(extraData.swapToken != address(0), "INVALID_SWAP_TOKEN");
        require(extraData.minProfit > 0, "INVALID_MIN_PROFIT");
        }

    function withdrawToken(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner, amount);
    }
    
    function withdrawETH() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    receive() external payable {}
}