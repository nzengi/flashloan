const { ethers } = require("ethers");
const config = require("../config/config");
const logger = require("../utils/logger");
const priceService = require("./priceService");
const gasService = require("./gasService");

class ArbitrageService {
  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(
      config.ethereum.rpcUrl
    );
    this.wallet = new ethers.Wallet(config.ethereum.privateKey, this.provider);

    // Load contract ABI and create contract instance
    this.contract = new ethers.Contract(
      config.contracts.arbitrageContract,
      this.getContractABI(),
      this.wallet
    );

    // Initialize router contracts for accurate arbitrage calculations
    this.uniswapRouter = new ethers.Contract(
      config.contracts.uniswapRouter,
      [
        "function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)",
      ],
      this.provider
    );

    this.sushiswapRouter = new ethers.Contract(
      config.contracts.sushiswapRouter,
      [
        "function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)",
      ],
      this.provider
    );

    // Initialize services
    this.gasService = gasService;

    this.isRunning = false;
    this.stats = {
      totalExecutions: 0,
      successfulArbitrages: 0,
      totalProfit: ethers.BigNumber.from(0),
      totalGasUsed: ethers.BigNumber.from(0),
      lastExecution: null,
    };

    // Rate limiting
    this.lastExecutionTime = 0;
    this.minExecutionInterval = 5000; // 5 seconds between executions

    // Single trading pair for maximum efficiency - WETH/USDC (most liquid and stable)
    this.tradingPairs = [
      {
        token1: config.tokens.WETH,
        token2: config.tokens.USDC,
        name: "WETH/USDC",
      },
    ];

    // Validate trading pairs (remove identical token pairs)
    this.tradingPairs = this.tradingPairs.filter((pair) => {
      if (pair.token1.toLowerCase() === pair.token2.toLowerCase()) {
        logger.warn(`Removing identical token pair: ${pair.name}`);
        return false;
      }
      return true;
    });
  }

  async start() {
    logger.info("🚀 Starting Arbitrage Service...");
    this.isRunning = true;

    // Perform initial checks
    await this.performInitialChecks();

    // Start monitoring
    this.monitorArbitrageOpportunities();

    // Start periodic stats logging
    this.logStatsPeriodically();

    logger.info("✅ Arbitrage Service started successfully");
  }

  async stop() {
    logger.info("⏹️ Stopping Arbitrage Service...");
    this.isRunning = false;
  }

  async performInitialChecks() {
    logger.info("🔍 Performing initial checks...");

    // Check wallet balance
    await this.checkWalletBalance();

    // Check token allowances
    await this.checkTokenAllowances();

    // Check contract permissions
    await this.checkContractPermissions();

    logger.info("✅ All initial checks passed!");
  }

  async checkWalletBalance() {
    try {
      const balance = await this.wallet.getBalance();
      const minBalance = config.validation.minWalletBalance; // Config'den al

      if (balance.lt(minBalance)) {
        throw new Error(
          `Insufficient ETH balance: ${ethers.utils.formatEther(
            balance
          )} ETH (minimum: ${ethers.utils.formatEther(minBalance)} ETH)`
        );
      }

      logger.info(
        `✅ Wallet balance: ${ethers.utils.formatEther(balance)} ETH`
      );
    } catch (error) {
      logger.error("❌ Wallet balance check failed", error);
      throw error;
    }
  }

  async checkTokenAllowances() {
    try {
      const tokens = [
        { symbol: "WETH", address: config.tokens.WETH },
        { symbol: "USDC", address: config.tokens.USDC },
      ];

      for (const token of tokens) {
        const tokenContract = new ethers.Contract(
          token.address,
          [
            "function allowance(address owner, address spender) external view returns (uint256)",
            "function approve(address spender, uint256 amount) external returns (bool)",
          ],
          this.wallet
        );

        const allowance = await tokenContract.allowance(
          this.wallet.address,
          config.contracts.arbitrageContract
        );

        if (allowance.isZero()) {
          logger.info(`🔐 Approving ${token.symbol} for contract...`);
          const maxApproval = ethers.constants.MaxUint256;
          const tx = await tokenContract.approve(
            config.contracts.arbitrageContract,
            maxApproval
          );
          await tx.wait();
          logger.info(`✅ ${token.symbol} approved successfully`);
        } else {
          logger.info(`✅ ${token.symbol} already approved`);
        }
      }
    } catch (error) {
      logger.error("❌ Token allowance check failed", error);
      throw error;
    }
  }

  async checkContractPermissions() {
    try {
      // Check if contract is owned by wallet
      const owner = await this.contract.owner();
      if (owner.toLowerCase() !== this.wallet.address.toLowerCase()) {
        throw new Error(
          `Contract owner mismatch: expected ${this.wallet.address}, got ${owner}`
        );
      }

      logger.info("✅ Contract ownership verified");
    } catch (error) {
      logger.error("❌ Contract permission check failed", error);
      throw error;
    }
  }

  async checkAaveLiquidity() {
    try {
      // Check if Aave V3 Pool has sufficient liquidity for flash loan
      const aavePool = new ethers.Contract(
        config.contracts.aaveV3Pool,
        [
          "function getReserveData(address asset) external view returns (tuple(uint256 configuration, uint128 liquidityIndex, uint128 variableBorrowIndex, uint128 currentLiquidityRate, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint8 usageAsCollateral))",
        ],
        this.provider
      );

      const reserveData = await aavePool.getReserveData(config.tokens.WETH);
      const liquidityIndex = reserveData.liquidityIndex;

      // Check if there's sufficient liquidity (simplified check)
      if (liquidityIndex.gt(0)) {
        logger.debug("✅ Aave liquidity available");
        return true;
      } else {
        logger.warn("❌ Insufficient Aave liquidity");
        return false;
      }
    } catch (error) {
      logger.error("Error checking Aave liquidity", error);
      return false; // Assume no liquidity on error
    }
  }

  async monitorArbitrageOpportunities() {
    let lastLiquidityCheck = 0;
    let lastBlockNumber = 0;

    while (this.isRunning) {
      try {
        const currentTime = Date.now();
        const currentBlock = await this.provider.getBlockNumber();

        // 1. Check if new block arrived (block-based execution)
        if (
          config.monitoring.blockBasedExecution &&
          currentBlock === lastBlockNumber
        ) {
          await this.sleep(3000); // Wait 3 seconds for new block (more realistic)
          continue;
        }

        // 2. Check Aave liquidity first (every minute)
        if (
          currentTime - lastLiquidityCheck >
          config.monitoring.liquidityCheckInterval
        ) {
          const hasLiquidity = await this.checkAaveLiquidity();
          if (!hasLiquidity) {
            logger.info(
              "⚠️ Insufficient Aave liquidity, skipping arbitrage checks"
            );
            lastLiquidityCheck = currentTime;
            await this.sleep(config.monitoring.checkInterval);
            continue;
          }
          lastLiquidityCheck = currentTime;
        }

        // 3. Check gas price (if too high, skip)
        const gasPrice = await this.gasService.getCurrentGasPrice();
        if (gasPrice.gt(config.ethereum.maxGasPrice)) {
          logger.debug(
            `Gas price too high: ${ethers.utils.formatUnits(
              gasPrice,
              "gwei"
            )} gwei, skipping`
          );
          await this.sleep(config.monitoring.checkInterval);
          continue;
        }

        // 4. Check wallet balance (if insufficient, skip)
        const balance = await this.wallet.getBalance();
        if (balance.lt(config.validation.minWalletBalance)) {
          logger.warn(
            `Insufficient wallet balance: ${ethers.utils.formatEther(
              balance
            )} ETH, skipping`
          );
          await this.sleep(config.monitoring.checkInterval);
          continue;
        }

        // 5. All checks passed, proceed with arbitrage
        await this.checkAllPairs();
        lastBlockNumber = currentBlock;

        await this.sleep(config.monitoring.checkInterval);
      } catch (error) {
        logger.error("Error in arbitrage monitoring loop", error);
        await this.sleep(5000);
      }
    }
  }

  async checkAllPairs() {
    for (const pair of this.tradingPairs) {
      try {
        // Rate limiting check
        if (!this.canExecute()) {
          logger.debug("Rate limiting: skipping execution");
          continue;
        }

        const opportunity = await this.findArbitrageOpportunity(pair);
        if (opportunity && opportunity.profit.gt(config.arbitrage.minProfit)) {
          // Additional checks before execution
          if (await this.validateOpportunity(opportunity)) {
            await this.executeArbitrage(opportunity);
          }
        }
      } catch (error) {
        logger.error(`Error checking pair ${pair.name}`, error);
      }
    }
  }

  canExecute() {
    const now = Date.now();
    if (now - this.lastExecutionTime < this.minExecutionInterval) {
      return false;
    }
    return true;
  }

  async validateOpportunity(opportunity) {
    try {
      // Check current gas price
      const currentGasPrice = await gasService.getCurrentGasPrice();
      if (currentGasPrice.gt(config.ethereum.maxGasPrice)) {
        logger.warn(
          `Gas price too high: ${ethers.utils.formatUnits(
            currentGasPrice,
            "gwei"
          )} gwei`
        );
        return false;
      }

      // Check slippage
      if (opportunity.roi < -config.arbitrage.maxSlippage) {
        logger.warn(
          `Slippage too high: ${opportunity.roi}% (max: ${config.arbitrage.maxSlippage}%)`
        );
        return false;
      }

      // Check wallet balance again
      const balance = await this.wallet.getBalance();
      const estimatedGasCost = currentGasPrice.mul(config.ethereum.gasLimit);
      if (balance.lt(estimatedGasCost)) {
        logger.warn(
          `Insufficient balance for gas: ${ethers.utils.formatEther(
            balance
          )} ETH`
        );
        return false;
      }

      return true;
    } catch (error) {
      logger.error("Error validating opportunity", error);
      return false;
    }
  }

  async findArbitrageOpportunity(pair) {
    const startTime = Date.now();

    try {
      // Validate pair
      if (!pair.token1 || !pair.token2) {
        logger.warn(`Invalid pair configuration: ${pair.name}`);
        return null;
      }

      if (pair.token1.toLowerCase() === pair.token2.toLowerCase()) {
        logger.warn(`Skipping identical token pair: ${pair.name}`);
        return null;
      }

      // Get prices from both DEXes
      const [uniswapPrice, sushiswapPrice] = await Promise.all([
        priceService.getUniswapPrice(pair.token1, pair.token2),
        priceService.getSushiswapPrice(pair.token1, pair.token2),
      ]);

      logger.debug(
        `Prices for ${pair.name}: Uni=${ethers.utils.formatEther(
          uniswapPrice
        )}, Sushi=${ethers.utils.formatEther(sushiswapPrice)}`
      );

      // Calculate arbitrage opportunities
      const opportunities = await Promise.all([
        this.calculateArbitrage(
          pair,
          uniswapPrice,
          sushiswapPrice,
          "UNI_TO_SUSHI"
        ),
        this.calculateArbitrage(
          pair,
          sushiswapPrice,
          uniswapPrice,
          "SUSHI_TO_UNI"
        ),
      ]);

      // Find the best opportunity
      const bestOpportunity = opportunities.reduce((best, current) =>
        current.profit.gt(best.profit) ? current : best
      );

      logger.performance("findArbitrageOpportunity", Date.now() - startTime, {
        pair: pair.name,
        profit: ethers.utils.formatEther(bestOpportunity.profit),
      });

      return bestOpportunity.profit.gt(0) ? bestOpportunity : null;
    } catch (error) {
      // Don't log every error to avoid spam, only log significant errors
      if (
        error.message.includes("IDENTICAL_ADDRESSES") ||
        error.message.includes("identical tokens")
      ) {
        logger.debug(`Skipping ${pair.name}: ${error.message}`);
      } else {
        logger.error(
          `Error finding arbitrage opportunity for ${pair.name}`,
          error
        );
      }
      return null;
    }
  }

  async calculateArbitrage(pair, price1, price2, direction) {
    const flashLoanAmount = config.arbitrage.flashLoanAmount;
    const flashLoanFee = flashLoanAmount.mul(5).div(10000); // 0.05% for Aave V3

    // Get the actual amounts using getAmountsOut for accurate calculations
    let router1, router2;
    if (direction === "UNI_TO_SUSHI") {
      router1 = this.uniswapRouter;
      router2 = this.sushiswapRouter;
    } else {
      router1 = this.sushiswapRouter;
      router2 = this.uniswapRouter;
    }

    // Calculate first swap: token1 -> token2
    const path1 = [pair.token1, pair.token2];
    const amountsOut1 = await router1.getAmountsOut(flashLoanAmount, path1);
    const amountAfterFirstSwap = amountsOut1[1];

    // Calculate second swap: token2 -> token1
    const path2 = [pair.token2, pair.token1];
    const amountsOut2 = await router2.getAmountsOut(
      amountAfterFirstSwap,
      path2
    );
    const amountAfterSecondSwap = amountsOut2[1];

    const totalCost = flashLoanAmount.add(flashLoanFee);
    const profit = amountAfterSecondSwap.sub(totalCost);

    return {
      pair,
      direction,
      flashLoanAmount,
      profit,
      price1,
      price2,
      totalCost,
      roi: profit.mul(10000).div(flashLoanAmount).toNumber() / 100, // ROI in percentage
    };
  }

  async executeArbitrage(opportunity) {
    const startTime = Date.now();

    try {
      // Update last execution time
      this.lastExecutionTime = Date.now();

      logger.arbitrage(
        `Executing arbitrage: ${opportunity.pair.name} ${opportunity.direction}`,
        {
          profit: ethers.utils.formatEther(opportunity.profit),
          roi: `${opportunity.roi}%`,
          flashLoanAmount: ethers.utils.formatEther(
            opportunity.flashLoanAmount
          ),
        }
      );

      // Get current gas price
      const gasPrice = await gasService.getCurrentGasPrice();

      // Prepare transaction data
      const extraData = {
        swapToken: opportunity.pair.token2,
        minProfit: config.arbitrage.minProfit,
        firstRouter: opportunity.direction === "UNI_TO_SUSHI" ? 0 : 1, // 0 = Uniswap, 1 = Sushiswap
        secondRouter: opportunity.direction === "UNI_TO_SUSHI" ? 1 : 0,
      };

      // Estimate gas
      const gasEstimate = await this.estimateGas(
        opportunity.pair.token1,
        opportunity.flashLoanAmount,
        extraData
      );

      // Check if gas estimate is reasonable
      if (gasEstimate.gt(config.ethereum.gasLimit)) {
        throw new Error(
          `Gas estimate too high: ${gasEstimate.toString()} (limit: ${
            config.ethereum.gasLimit
          })`
        );
      }

      // Calculate total cost including gas
      const gasCost = gasEstimate.mul(gasPrice);
      const aaveFee = opportunity.flashLoanAmount.mul(5).div(10000); // 0.05% Aave V3
      const totalFee = gasCost.add(aaveFee);

      // Check max fee limit
      if (totalFee.gt(config.arbitrage.maxFeeLimit)) {
        logger.warn(
          `❌ Total fee exceeds limit: ${ethers.utils.formatEther(
            totalFee
          )} ETH (max: ${ethers.utils.formatEther(
            config.arbitrage.maxFeeLimit
          )} ETH)`
        );
        return false;
      }

      // Execute flash loan arbitrage
      const tx = await this.contract.arbitrage(
        opportunity.pair.token1,
        opportunity.flashLoanAmount,
        extraData,
        {
          gasLimit: gasEstimate.mul(120).div(100), // 20% buffer
          gasPrice: gasPrice,
        }
      );

      logger.info(`📝 Transaction sent: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait();

      // Update stats
      this.stats.totalExecutions++;
      this.stats.totalGasUsed = this.stats.totalGasUsed.add(
        receipt.gasUsed.mul(gasPrice)
      );
      this.stats.lastExecution = new Date();

      // Check if transaction was successful
      if (receipt.status === 1) {
        this.stats.successfulArbitrages++;
        this.stats.totalProfit = this.stats.totalProfit.add(opportunity.profit);

        logger.success(`✅ Arbitrage executed successfully!`, {
          txHash: tx.hash,
          profit: ethers.utils.formatEther(opportunity.profit),
          gasUsed: receipt.gasUsed.toString(),
          gasPrice: ethers.utils.formatUnits(gasPrice, "gwei"),
        });
      } else {
        throw new Error("Transaction failed");
      }

      logger.performance("executeArbitrage", Date.now() - startTime, {
        pair: opportunity.pair.name,
        profit: ethers.utils.formatEther(opportunity.profit),
        gasUsed: receipt.gasUsed.toString(),
      });
    } catch (error) {
      this.stats.errors++;
      logger.error("❌ Arbitrage execution failed", error);

      // If it's a gas-related error, try to recover
      if (
        error.message.includes("gas") ||
        error.message.includes("insufficient")
      ) {
        await this.handleGasError(error);
      }

      throw error;
    }
  }

  async handleGasError(error) {
    logger.warn("Handling gas-related error...");

    // Wait a bit before retrying
    await this.sleep(10000);

    // Try to get a new gas price
    try {
      const newGasPrice = await gasService.getCurrentGasPrice();
      logger.info(
        `New gas price: ${ethers.utils.formatUnits(newGasPrice, "gwei")} gwei`
      );
    } catch (gasError) {
      logger.error("Failed to get new gas price", gasError);
    }
  }

  async estimateGas(token, amount, extraData) {
    try {
      // Validate parameters
      if (!token || !amount || !extraData) {
        logger.warn("Invalid parameters for gas estimation");
        return ethers.BigNumber.from("3000000"); // Fallback gas limit
      }

      const gasEstimate = await this.contract.estimateGas.arbitrage(
        token,
        amount,
        extraData
      );

      // Check if gas estimate is reasonable
      if (gasEstimate.gt(config.validation.maxGasEstimate)) {
        logger.warn(
          `Gas estimate too high: ${gasEstimate.toString()} (max: ${
            config.validation.maxGasEstimate
          })`
        );
        return ethers.BigNumber.from(config.validation.maxGasEstimate);
      }

      return gasEstimate.mul(120).div(100); // 20% buffer
    } catch (error) {
      logger.error("Error estimating gas", error);
      return ethers.BigNumber.from("3000000"); // Fallback gas limit
    }
  }

  getContractABI() {
    // Simplified ABI for the arbitrage contract
    return [
      "function arbitrage(address borrowedToken, uint256 amount, tuple(address swapToken, uint256 minProfit, uint8 firstRouter, uint8 secondRouter) extraData) external",
      "function owner() external view returns (address)",
      "function aavePool() external view returns (address)",
      "function uniswapRouter() external view returns (address)",
      "function sushiswapRouter() external view returns (address)",
    ];
  }

  async logStatsPeriodically() {
    setInterval(() => {
      logger.info("📊 Arbitrage Bot Stats", {
        totalExecutions: this.stats.totalExecutions,
        successfulArbitrages: this.stats.successfulArbitrages,
        totalProfit: ethers.utils.formatEther(this.stats.totalProfit),
        totalGasUsed: this.stats.totalGasUsed.toString(),
        lastExecution: this.stats.lastExecution,
        successRate:
          this.stats.totalExecutions > 0
            ? (
                (this.stats.successfulArbitrages / this.stats.totalExecutions) *
                100
              ).toFixed(2) + "%"
            : "0%",
      });
    }, 60000); // Log every minute
  }

  getStats() {
    return {
      ...this.stats,
      totalProfitFormatted: ethers.utils.formatEther(this.stats.totalProfit),
      successRate:
        this.stats.totalExecutions > 0
          ? (
              (this.stats.successfulArbitrages / this.stats.totalExecutions) *
              100
            ).toFixed(2) + "%"
          : "0%",
    };
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = new ArbitrageService();
