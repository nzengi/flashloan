const { ethers } = require("ethers");
const Web3 = require("web3");

class ArbitrageBot {
  constructor(config) {
    this.config = config;
    this.provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
    this.wallet = new ethers.Wallet(config.privateKey, this.provider);

    // Contract addresses
    this.contractAddress = config.contractAddress;
    this.uniswapRouter = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    this.sushiswapRouter = "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F";

    // Token addresses
    this.tokens = {
      WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      USDC: "0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8C",
      USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    };

    this.isRunning = false;
    this.stats = {
      totalExecutions: 0,
      successfulArbitrages: 0,
      totalProfit: ethers.BigNumber.from(0),
      totalGasUsed: ethers.BigNumber.from(0),
    };
  }

  async start() {
    console.log("🚀 Starting Arbitrage Bot...");
    this.isRunning = true;

    // Start monitoring
    this.monitorArbitrageOpportunities();

    // Start gas price monitoring
    this.monitorGasPrice();

    // Start profit monitoring
    this.monitorProfits();
  }

  async stop() {
    console.log("⏹️ Stopping Arbitrage Bot...");
    this.isRunning = false;
  }

  async monitorArbitrageOpportunities() {
    while (this.isRunning) {
      try {
        await this.checkArbitrageOpportunities();
        await this.sleep(1000); // Check every second
      } catch (error) {
        console.error("Error monitoring arbitrage opportunities:", error);
        await this.sleep(5000); // Wait 5 seconds on error
      }
    }
  }

  async checkArbitrageOpportunities() {
    const pairs = [
      { token1: this.tokens.WETH, token2: this.tokens.DAI },
      { token1: this.tokens.WETH, token2: this.tokens.USDC },
      { token1: this.tokens.WETH, token2: this.tokens.USDT },
      { token1: this.tokens.DAI, token2: this.tokens.USDC },
      { token1: this.tokens.DAI, token2: this.tokens.USDT },
    ];

    for (const pair of pairs) {
      try {
        const opportunity = await this.findArbitrageOpportunity(
          pair.token1,
          pair.token2
        );
        if (opportunity && opportunity.profit > this.config.minProfit) {
          await this.executeArbitrage(opportunity);
        }
      } catch (error) {
        console.error(
          `Error checking pair ${pair.token1}-${pair.token2}:`,
          error
        );
      }
    }
  }

  async findArbitrageOpportunity(token1, token2) {
    // Get prices from both DEXes
    const [uniswapPrice1, sushiswapPrice1] = await Promise.all([
      this.getUniswapPrice(token1, token2),
      this.getSushiswapPrice(token1, token2),
    ]);

    const [uniswapPrice2, sushiswapPrice2] = await Promise.all([
      this.getUniswapPrice(token2, token1),
      this.getSushiswapPrice(token2, token1),
    ]);

    // Calculate arbitrage opportunities
    const opportunity1 = this.calculateArbitrage(
      token1,
      token2,
      uniswapPrice1,
      sushiswapPrice1,
      "UNISWAP_SUSHISWAP"
    );
    const opportunity2 = this.calculateArbitrage(
      token2,
      token1,
      uniswapPrice2,
      sushiswapPrice2,
      "SUSHISWAP_UNISWAP"
    );

    return opportunity1.profit > opportunity2.profit
      ? opportunity1
      : opportunity2;
  }

  calculateArbitrage(token1, token2, price1, price2, direction) {
    const amount = ethers.utils.parseEther("10"); // 10 ETH equivalent
    const flashLoanFee = amount.mul(9).div(10000); // 0.09%

    // Calculate amounts after swaps
    const amountAfterFirstSwap = amount
      .mul(price1)
      .div(ethers.utils.parseEther("1"));
    const amountAfterSecondSwap = amountAfterFirstSwap
      .mul(price2)
      .div(ethers.utils.parseEther("1"));

    const totalCost = amount.add(flashLoanFee);
    const profit = amountAfterSecondSwap.sub(totalCost);

    return {
      token1,
      token2,
      direction,
      amount,
      profit,
      price1,
      price2,
    };
  }

  async executeArbitrage(opportunity) {
    try {
      console.log(
        `💰 Executing arbitrage: ${opportunity.token1} -> ${opportunity.token2}`
      );
      console.log(
        `📊 Expected profit: ${ethers.utils.formatEther(
          opportunity.profit
        )} ETH`
      );

      // Get current gas price
      const gasPrice = await this.provider.getGasPrice();

      // Check if gas price is acceptable
      if (gasPrice.gt(this.config.maxGasPrice)) {
        console.log(
          `⛽ Gas price too high: ${ethers.utils.formatUnits(
            gasPrice,
            "gwei"
          )} gwei`
        );
        return;
      }

      // Prepare transaction
      const extraData = {
        swapToken: opportunity.token2,
        direction: opportunity.direction === "UNISWAP_SUSHISWAP" ? 0 : 1,
        deadline: Math.floor(Date.now() / 1000) + 300, // 5 minutes
        amountRequired: 0,
        profitReceiver: this.wallet.address,
        minAmountSwapToken: opportunity.amount.mul(95).div(100), // 5% slippage
        minAmountBorrowedToken: opportunity.amount.mul(95).div(100), // 5% slippage
        maxGasPrice: this.config.maxGasPrice,
        minProfit: this.config.minProfit,
      };

      // Estimate gas
      const gasEstimate = await this.estimateGas(
        opportunity.token1,
        opportunity.amount,
        extraData
      );

      // Calculate total cost
      const totalCost = gasEstimate.mul(gasPrice);
      const netProfit = opportunity.profit.sub(totalCost);

      if (netProfit.lt(this.config.minProfit)) {
        console.log(`❌ Insufficient net profit after gas costs`);
        return;
      }

      // Execute transaction
      const tx = await this.executeArbitrageTransaction(
        opportunity.token1,
        opportunity.amount,
        extraData,
        gasPrice
      );

      console.log(`✅ Arbitrage executed! TX: ${tx.hash}`);
      console.log(`💰 Net profit: ${ethers.utils.formatEther(netProfit)} ETH`);

      this.stats.successfulArbitrages++;
      this.stats.totalProfit = this.stats.totalProfit.add(netProfit);
      this.stats.totalGasUsed = this.stats.totalGasUsed.add(totalCost);
    } catch (error) {
      console.error("❌ Error executing arbitrage:", error);
    }
  }

  async getUniswapPrice(token1, token2) {
    // Implementation for getting Uniswap price
    // This would use the Uniswap V2 Router contract
    return ethers.utils.parseEther("1800"); // Example price
  }

  async getSushiswapPrice(token1, token2) {
    // Implementation for getting Sushiswap price
    // This would use the Sushiswap Router contract
    return ethers.utils.parseEther("1801"); // Example price
  }

  async estimateGas(token, amount, extraData) {
    // Estimate gas for arbitrage transaction
    return ethers.BigNumber.from(300000); // Example gas estimate
  }

  async executeArbitrageTransaction(token, amount, extraData, gasPrice) {
    // Execute the arbitrage transaction
    // This would call the smart contract
    const tx = {
      to: this.contractAddress,
      data: this.encodeArbitrageData(token, amount, extraData),
      gasLimit: 500000,
      gasPrice: gasPrice,
    };

    return await this.wallet.sendTransaction(tx);
  }

  encodeArbitrageData(token, amount, extraData) {
    // Encode the arbitrage function call
    const abi = [
      "function arbitrage(address borrowedToken, uint256 amount, tuple(address swapToken, uint8 direction, uint256 deadline, uint256 amountRequired, address profitReceiver, uint256 minAmountSwapToken, uint256 minAmountBorrowedToken, uint256 maxGasPrice, uint256 minProfit) extraData)",
    ];

    const iface = new ethers.utils.Interface(abi);
    return iface.encodeFunctionData("arbitrage", [token, amount, extraData]);
  }

  async monitorGasPrice() {
    setInterval(async () => {
      try {
        const gasPrice = await this.provider.getGasPrice();
        const gasPriceGwei = ethers.utils.formatUnits(gasPrice, "gwei");
        console.log(`⛽ Current gas price: ${gasPriceGwei} gwei`);
      } catch (error) {
        console.error("Error monitoring gas price:", error);
      }
    }, 30000); // Every 30 seconds
  }

  async monitorProfits() {
    setInterval(() => {
      console.log("📊 Bot Statistics:");
      console.log(`   Total executions: ${this.stats.totalExecutions}`);
      console.log(
        `   Successful arbitrages: ${this.stats.successfulArbitrages}`
      );
      console.log(
        `   Total profit: ${ethers.utils.formatEther(
          this.stats.totalProfit
        )} ETH`
      );
      console.log(
        `   Total gas used: ${ethers.utils.formatEther(
          this.stats.totalGasUsed
        )} ETH`
      );
    }, 60000); // Every minute
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Configuration
const config = {
  rpcUrl: "https://eth-mainnet.alchemyapi.io/v2/YOUR_API_KEY",
  privateKey: "YOUR_PRIVATE_KEY",
  contractAddress: "YOUR_CONTRACT_ADDRESS",
  minProfit: ethers.utils.parseEther("0.01"), // 0.01 ETH minimum profit
  maxGasPrice: ethers.utils.parseUnits("50", "gwei"), // 50 gwei max gas price
  checkInterval: 1000, // Check every second
  gasLimit: 500000,
};

// Start the bot
const bot = new ArbitrageBot(config);

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Received SIGINT, shutting down gracefully...");
  await bot.stop();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Received SIGTERM, shutting down gracefully...");
  await bot.stop();
  process.exit(0);
});

// Start the bot
bot.start().catch(console.error);

module.exports = ArbitrageBot;
