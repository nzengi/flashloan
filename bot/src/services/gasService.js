const { ethers } = require("ethers");
const axios = require("axios");
const config = require("../config/config");
const logger = require("../utils/logger");

class GasService {
  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(
      config.ethereum.rpcUrl
    );

    // Gas price cache
    this.gasPriceCache = {
      current: null,
      timestamp: 0,
      ttl: 5000, // 5 seconds
    };

    // Gas price history for trend analysis
    this.gasPriceHistory = [];
    this.maxHistorySize = 100;

    // Gas price thresholds
    this.thresholds = {
      low: ethers.utils.parseUnits("10", "gwei"),
      medium: ethers.utils.parseUnits("30", "gwei"),
      high: ethers.utils.parseUnits("50", "gwei"),
      extreme: ethers.utils.parseUnits("100", "gwei"),
    };

    // Start monitoring
    this.startMonitoring();
  }

  async getCurrentGasPrice() {
    try {
      // Check cache first
      if (
        this.gasPriceCache.current &&
        Date.now() - this.gasPriceCache.timestamp < this.gasPriceCache.ttl
      ) {
        return this.gasPriceCache.current;
      }

      // Get gas price from provider
      const gasPrice = await this.provider.getGasPrice();

      // Update cache
      this.gasPriceCache.current = gasPrice;
      this.gasPriceCache.timestamp = Date.now();

      // Add to history
      this.addToHistory(gasPrice);

      logger.gas(
        `Current gas price: ${ethers.utils.formatUnits(gasPrice, "gwei")} gwei`
      );

      return gasPrice;
    } catch (error) {
      logger.error("Error getting current gas price", error);
      throw error;
    }
  }

  async getOptimalGasPrice() {
    try {
      const currentGasPrice = await this.getCurrentGasPrice();

      // Add 10% buffer for faster confirmation
      const optimalGasPrice = currentGasPrice.mul(110).div(100);

      // Ensure it's within configured limits
      const finalGasPrice = optimalGasPrice.gt(config.ethereum.maxGasPrice)
        ? config.ethereum.maxGasPrice
        : optimalGasPrice.lt(config.ethereum.minGasPrice)
        ? config.ethereum.minGasPrice
        : optimalGasPrice;

      logger.gas(
        `Optimal gas price: ${ethers.utils.formatUnits(
          finalGasPrice,
          "gwei"
        )} gwei`
      );

      return finalGasPrice;
    } catch (error) {
      logger.error("Error getting optimal gas price", error);
      throw error;
    }
  }

  async getGasPriceFromEtherscan() {
    try {
      const response = await axios.get("https://api.etherscan.io/api", {
        params: {
          module: "gastracker",
          action: "gasoracle",
          apikey: process.env.ETHERSCAN_API_KEY || "YourApiKeyToken",
        },
        timeout: 5000,
      });

      if (response.data.status === "1") {
        const result = response.data.result;
        return {
          safeLow: ethers.utils.parseUnits(result.SafeLow, "gwei"),
          standard: ethers.utils.parseUnits(result.ProposeGasPrice, "gwei"),
          fast: ethers.utils.parseUnits(result.FastGasPrice, "gwei"),
          fastest: ethers.utils.parseUnits(result.suggestBaseFee, "gwei"),
        };
      } else {
        throw new Error(`Etherscan API error: ${response.data.message}`);
      }
    } catch (error) {
      logger.error("Error getting gas price from Etherscan", error);
      return null;
    }
  }

  async getGasPriceFromEthGasStation() {
    try {
      const response = await axios.get(
        "https://ethgasstation.info/api/ethgasAPI.json",
        {
          timeout: 5000,
        }
      );

      return {
        safeLow: ethers.utils.parseUnits(
          response.data.safeLow.toString(),
          "gwei"
        ),
        standard: ethers.utils.parseUnits(
          response.data.average.toString(),
          "gwei"
        ),
        fast: ethers.utils.parseUnits(response.data.fast.toString(), "gwei"),
        fastest: ethers.utils.parseUnits(
          response.data.fastest.toString(),
          "gwei"
        ),
      };
    } catch (error) {
      logger.error("Error getting gas price from EthGasStation", error);
      return null;
    }
  }

  getGasPriceLevel(gasPrice) {
    if (gasPrice.lt(this.thresholds.low)) return "low";
    if (gasPrice.lt(this.thresholds.medium)) return "medium";
    if (gasPrice.lt(this.thresholds.high)) return "high";
    if (gasPrice.lt(this.thresholds.extreme)) return "extreme";
    return "critical";
  }

  isGasPriceAcceptable(gasPrice) {
    return gasPrice.lte(config.ethereum.maxGasPrice);
  }

  async estimateGasForTransaction(transaction) {
    try {
      const gasEstimate = await this.provider.estimateGas(transaction);
      return gasEstimate.mul(120).div(100); // 20% buffer
    } catch (error) {
      logger.error("Error estimating gas for transaction", error);
      throw error;
    }
  }

  async calculateTransactionCost(gasLimit, gasPrice) {
    const cost = gasLimit.mul(gasPrice);
    return {
      cost,
      costInEth: ethers.utils.formatEther(cost),
      costInUsd: await this.convertEthToUsd(cost),
    };
  }

  async convertEthToUsd(ethAmount) {
    try {
      // You can integrate with CoinGecko or other price APIs here
      const response = await axios.get(
        "https://api.coingecko.com/api/v3/simple/price",
        {
          params: {
            ids: "ethereum",
            vs_currencies: "usd",
          },
          timeout: 5000,
        }
      );

      const ethPrice = response.data.ethereum.usd;
      const ethAmountInEth = parseFloat(ethers.utils.formatEther(ethAmount));
      return (ethAmountInEth * ethPrice).toFixed(2);
    } catch (error) {
      logger.error("Error converting ETH to USD", error);
      return "N/A";
    }
  }

  addToHistory(gasPrice) {
    this.gasPriceHistory.push({
      price: gasPrice,
      timestamp: Date.now(),
    });

    // Keep only recent history
    if (this.gasPriceHistory.length > this.maxHistorySize) {
      this.gasPriceHistory.shift();
    }
  }

  getGasPriceTrend() {
    if (this.gasPriceHistory.length < 2) {
      return { trend: "stable", change: 0 };
    }

    const recent = this.gasPriceHistory.slice(-10);
    const older = this.gasPriceHistory.slice(-20, -10);

    if (older.length === 0) {
      return { trend: "stable", change: 0 };
    }

    const recentAvg = recent
      .reduce((sum, item) => sum.add(item.price), ethers.BigNumber.from(0))
      .div(recent.length);
    const olderAvg = older
      .reduce((sum, item) => sum.add(item.price), ethers.BigNumber.from(0))
      .div(older.length);

    const change = recentAvg.sub(olderAvg);
    const changePercent = change.mul(10000).div(olderAvg).toNumber() / 100;

    let trend = "stable";
    if (changePercent > 5) trend = "increasing";
    else if (changePercent < -5) trend = "decreasing";

    return {
      trend,
      change: changePercent,
      recentAverage: ethers.utils.formatUnits(recentAvg, "gwei"),
      olderAverage: ethers.utils.formatUnits(olderAvg, "gwei"),
    };
  }

  async startMonitoring() {
    setInterval(async () => {
      try {
        const gasPrice = await this.getCurrentGasPrice();
        const level = this.getGasPriceLevel(gasPrice);
        const trend = this.getGasPriceTrend();

        logger.gas(
          `Gas price monitoring: ${ethers.utils.formatUnits(
            gasPrice,
            "gwei"
          )} gwei (${level}) - Trend: ${trend.trend}`,
          {
            level,
            trend: trend.trend,
            change: trend.change,
          }
        );

        // Alert if gas price is too high
        if (level === "extreme" || level === "critical") {
          logger.warn(
            `High gas price detected: ${ethers.utils.formatUnits(
              gasPrice,
              "gwei"
            )} gwei (${level})`
          );
        }
      } catch (error) {
        logger.error("Error in gas price monitoring", error);
      }
    }, config.monitoring.gasCheckInterval);
  }

  async getGasPriceRecommendation() {
    try {
      const currentGasPrice = await this.getCurrentGasPrice();
      const level = this.getGasPriceLevel(currentGasPrice);
      const trend = this.getGasPriceTrend();

      let recommendation = "proceed";
      let reason = "Gas price is acceptable";

      if (level === "extreme" || level === "critical") {
        recommendation = "wait";
        reason = "Gas price is too high";
      } else if (trend.trend === "increasing" && trend.change > 10) {
        recommendation = "wait";
        reason = "Gas price is increasing rapidly";
      } else if (level === "high" && trend.trend === "increasing") {
        recommendation = "caution";
        reason = "Gas price is high and increasing";
      }

      return {
        recommendation,
        reason,
        currentGasPrice: ethers.utils.formatUnits(currentGasPrice, "gwei"),
        level,
        trend: trend.trend,
        change: trend.change,
      };
    } catch (error) {
      logger.error("Error getting gas price recommendation", error);
      return {
        recommendation: "error",
        reason: "Unable to get gas price data",
        error: error.message,
      };
    }
  }

  // Health check
  async healthCheck() {
    try {
      const gasPrice = await this.getCurrentGasPrice();
      const level = this.getGasPriceLevel(gasPrice);

      return {
        status: "healthy",
        gasPrice: ethers.utils.formatUnits(gasPrice, "gwei"),
        level,
        isAcceptable: this.isGasPriceAcceptable(gasPrice),
      };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error.message,
      };
    }
  }
}

module.exports = new GasService();
