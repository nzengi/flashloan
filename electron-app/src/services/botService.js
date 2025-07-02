const { ethers } = require("ethers");
const path = require("path");
const fs = require("fs");

// Import existing bot services
const arbitrageService = require("../../../bot/src/services/arbitrageService");
const priceService = require("../../../bot/src/services/priceService");
const gasService = require("../../../bot/src/services/gasService");
const logger = require("../../../bot/src/utils/logger");

let botInstance = null;
let isRunning = false;
let botStats = {
  startTime: null,
  totalExecutions: 0,
  successfulArbitrages: 0,
  totalProfit: 0,
  errors: 0,
  lastHealthCheck: null,
  consecutiveErrors: 0,
};

class BotService {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.contract = null;
  }

  async startArbitrageBot(config) {
    try {
      logger.info("🚀 Starting Flash Loan Arbitrage Bot from Electron app...");

      // Validate configuration
      this.validateConfig(config);

      // Initialize provider and wallet
      await this.initializeProvider(config);
      await this.initializeWallet(config);
      await this.initializeContract(config);

      // Update bot configuration
      await this.updateBotConfig(config);

      // Start the arbitrage service
      await arbitrageService.start();

      isRunning = true;
      botStats.startTime = new Date();
      botStats.totalExecutions = 0;
      botStats.successfulArbitrages = 0;
      botStats.totalProfit = 0;
      botStats.errors = 0;

      logger.info("✅ Arbitrage Bot started successfully from Electron app!");

      return {
        success: true,
        message: "Bot started successfully",
        stats: botStats,
      };
    } catch (error) {
      logger.error("Failed to start Arbitrage Bot from Electron app", error);
      throw error;
    }
  }

  async stopArbitrageBot() {
    try {
      logger.info("⏹️ Stopping Arbitrage Bot from Electron app...");

      if (isRunning) {
        await arbitrageService.stop();
        isRunning = false;

        // Calculate uptime
        const uptime = botStats.startTime
          ? Date.now() - botStats.startTime.getTime()
          : 0;

        logger.info("✅ Arbitrage Bot stopped successfully", {
          uptime: this.formatUptime(uptime),
          totalExecutions: botStats.totalExecutions,
          successfulArbitrages: botStats.successfulArbitrages,
          totalProfit: botStats.totalProfit,
        });

        return {
          success: true,
          message: "Bot stopped successfully",
          stats: botStats,
        };
      } else {
        return {
          success: true,
          message: "Bot was not running",
        };
      }
    } catch (error) {
      logger.error("Error stopping Arbitrage Bot from Electron app", error);
      throw error;
    }
  }

  async getBotStatus() {
    try {
      const status = {
        isRunning,
        stats: botStats,
        uptime: botStats.startTime
          ? Date.now() - botStats.startTime.getTime()
          : 0,
        formattedUptime: botStats.startTime
          ? this.formatUptime(Date.now() - botStats.startTime.getTime())
          : "0s",
      };

      if (isRunning) {
        // Get additional status from services
        try {
          const priceStatus = await priceService.healthCheck();
          const gasStatus = await gasService.healthCheck();

          status.services = {
            priceService: priceStatus,
            gasService: gasStatus,
          };
        } catch (error) {
          status.services = {
            priceService: { status: "error", error: error.message },
            gasService: { status: "error", error: error.message },
          };
        }
      }

      return status;
    } catch (error) {
      logger.error("Error getting bot status", error);
      throw error;
    }
  }

  validateConfig(config) {
    const required = [
      "ethereum.rpcUrl",
      "wallet.privateKey",
      "wallet.address",
      "contracts.arbitrageContract",
      "arbitrage.minProfit",
      "arbitrage.flashLoanAmount",
      "arbitrage.maxFeeLimit",
    ];

    for (const field of required) {
      const value = field.split(".").reduce((obj, key) => obj?.[key], config);
      if (!value) {
        throw new Error(`Missing required configuration: ${field}`);
      }
    }

    // Validate Ethereum address format
    if (!ethers.utils.isAddress(config.wallet.address)) {
      throw new Error("Invalid wallet address format");
    }

    if (!ethers.utils.isAddress(config.contracts.arbitrageContract)) {
      throw new Error("Invalid contract address format");
    }

    // Validate private key format
    try {
      const wallet = new ethers.Wallet(config.wallet.privateKey);
      if (
        wallet.address.toLowerCase() !== config.wallet.address.toLowerCase()
      ) {
        throw new Error("Private key does not match wallet address");
      }
    } catch (error) {
      throw new Error("Invalid private key format");
    }
  }

  async initializeProvider(config) {
    try {
      this.provider = new ethers.providers.JsonRpcProvider(
        config.ethereum.rpcUrl
      );

      // Test connection
      const network = await this.provider.getNetwork();
      if (network.chainId !== 1) {
        throw new Error(`Wrong network: ${network.name} (expected mainnet)`);
      }

      logger.info("✅ Provider initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize provider", error);
      throw error;
    }
  }

  async initializeWallet(config) {
    try {
      this.wallet = new ethers.Wallet(config.wallet.privateKey, this.provider);

      // Verify wallet address
      if (
        this.wallet.address.toLowerCase() !==
        config.wallet.address.toLowerCase()
      ) {
        throw new Error("Private key does not match wallet address");
      }

      // Check wallet balance
      const balance = await this.wallet.getBalance();
      const minBalance = ethers.utils.parseEther("0.1"); // Minimum 0.1 ETH

      if (balance.lt(minBalance)) {
        throw new Error(
          `Insufficient wallet balance: ${ethers.utils.formatEther(
            balance
          )} ETH (minimum: 0.1 ETH)`
        );
      }

      logger.info(
        `✅ Wallet initialized successfully. Balance: ${ethers.utils.formatEther(
          balance
        )} ETH`
      );
    } catch (error) {
      logger.error("Failed to initialize wallet", error);
      throw error;
    }
  }

  async initializeContract(config) {
    try {
      // Load contract ABI
      const contractPath = path.join(
        __dirname,
        "../../../contracts/artifacts/contracts/FlashLoanArbitrageMainnet.sol/FlashLoanArbitrageMainnet.json"
      );

      if (!fs.existsSync(contractPath)) {
        throw new Error(
          "Contract ABI not found. Please compile contracts first."
        );
      }

      const contractArtifact = JSON.parse(
        fs.readFileSync(contractPath, "utf8")
      );

      this.contract = new ethers.Contract(
        config.contracts.arbitrageContract,
        contractArtifact.abi,
        this.wallet
      );

      // Verify contract ownership
      const owner = await this.contract.owner();
      if (owner.toLowerCase() !== this.wallet.address.toLowerCase()) {
        throw new Error("Wallet is not the contract owner");
      }

      logger.info("✅ Contract initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize contract", error);
      throw error;
    }
  }

  async updateBotConfig(config) {
    try {
      // Update the bot's configuration with the new settings
      const botConfig = require("../../../bot/src/config/config");

      // Update configuration values
      Object.assign(botConfig.ethereum, config.ethereum);
      Object.assign(botConfig.wallet, config.wallet);
      Object.assign(botConfig.contracts, config.contracts);
      Object.assign(botConfig.arbitrage, config.arbitrage);
      Object.assign(botConfig.tokens, config.tokens);

      logger.info("✅ Bot configuration updated successfully");
    } catch (error) {
      logger.error("Failed to update bot configuration", error);
      throw error;
    }
  }

  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  // Update stats when arbitrage events occur
  updateStats(event, data) {
    switch (event) {
      case "execution":
        botStats.totalExecutions++;
        break;
      case "success":
        botStats.successfulArbitrages++;
        botStats.totalProfit += data.profit || 0;
        botStats.consecutiveErrors = 0;
        break;
      case "error":
        botStats.errors++;
        botStats.consecutiveErrors++;
        break;
      case "health_check":
        botStats.lastHealthCheck = new Date();
        break;
    }
  }
}

// Create singleton instance
const botService = new BotService();

// Export functions
module.exports = {
  startArbitrageBot: (config) => botService.startArbitrageBot(config),
  stopArbitrageBot: () => botService.stopArbitrageBot(),
  getBotStatus: () => botService.getBotStatus(),
  updateStats: (event, data) => botService.updateStats(event, data),
};
