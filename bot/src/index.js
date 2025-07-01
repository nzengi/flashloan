#!/usr/bin/env node

const { ethers } = require("ethers");
const arbitrageService = require("./services/arbitrageService");
const priceService = require("./services/priceService");
const gasService = require("./services/gasService");
const logger = require("./utils/logger");
const config = require("./config/config");

class ArbitrageBot {
  constructor() {
    this.isRunning = false;
    this.startTime = null;
    this.stats = {
      uptime: 0,
      totalExecutions: 0,
      successfulArbitrages: 0,
      totalProfit: 0,
      errors: 0,
      lastHealthCheck: null,
      consecutiveErrors: 0,
    };

    // Graceful shutdown handlers
    this.setupGracefulShutdown();

    // Performance monitoring
    this.setupPerformanceMonitoring();

    // Error tracking
    this.errorCount = 0;
    this.maxConsecutiveErrors = 5;
  }

  async start() {
    try {
      logger.info("🚀 Starting Flash Loan Arbitrage Bot...");
      logger.info("📋 Configuration:", {
        rpcUrl: config.ethereum.rpcUrl,
        contractAddress: config.contracts.arbitrageContract,
        minProfit: ethers.utils.formatEther(config.arbitrage.minProfit),
        maxGasPrice: ethers.utils.formatUnits(
          config.ethereum.maxGasPrice,
          "gwei"
        ),
        flashLoanAmount: ethers.utils.formatEther(
          config.arbitrage.flashLoanAmount
        ),
      });

      // Enhanced health checks
      await this.performHealthChecks();

      // Start services
      await arbitrageService.start();

      this.isRunning = true;
      this.startTime = new Date();

      logger.info("✅ Arbitrage Bot started successfully!");
      logger.info(
        "📊 Monitoring pairs:",
        arbitrageService.tradingPairs.map((p) => p.name)
      );

      // Start monitoring loops
      this.startMonitoringLoops();
    } catch (error) {
      logger.error("Failed to start Arbitrage Bot", error);
      process.exit(1);
    }
  }

  async stop() {
    try {
      logger.info("⏹️ Stopping Arbitrage Bot...");

      this.isRunning = false;

      // Stop arbitrage service
      await arbitrageService.stop();

      // Calculate uptime
      const uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0;

      logger.info("✅ Arbitrage Bot stopped successfully", {
        uptime: this.formatUptime(uptime),
        totalExecutions: this.stats.totalExecutions,
        successfulArbitrages: this.stats.successfulArbitrages,
        totalProfit: this.stats.totalProfit,
      });
    } catch (error) {
      logger.error("Error stopping Arbitrage Bot", error);
    }
  }

  async performHealthChecks() {
    logger.info("🔍 Performing comprehensive health checks...");

    const checks = [
      { name: "Ethereum RPC", check: () => this.checkRpcConnection() },
      {
        name: "Contract Connection",
        check: () => this.checkContractConnection(),
      },
      { name: "Price Service", check: () => priceService.healthCheck() },
      { name: "Gas Service", check: () => gasService.healthCheck() },
      { name: "Network Status", check: () => this.checkNetworkStatus() },
      { name: "Memory Usage", check: () => this.checkMemoryUsage() },
      { name: "Disk Space", check: () => this.checkDiskSpace() },
    ];

    let failedChecks = 0;

    for (const check of checks) {
      try {
        const result = await check.check();
        if (result.status === "healthy") {
          logger.info(`✅ ${check.name}: Healthy`);
        } else {
          failedChecks++;
          logger.warn(`⚠️ ${check.name}: ${result.error || "Unhealthy"}`);
        }
      } catch (error) {
        failedChecks++;
        logger.error(`❌ ${check.name}: Failed`, error);
      }
    }

    if (failedChecks > 2) {
      throw new Error(`Too many health checks failed: ${failedChecks}`);
    }

    this.stats.lastHealthCheck = new Date();
    logger.info("✅ Health checks completed!");
  }

  async checkRpcConnection() {
    try {
      const provider = new ethers.providers.JsonRpcProvider(
        config.ethereum.rpcUrl
      );

      // Test basic connection
      await provider.getNetwork();

      // Test block number
      const blockNumber = await provider.getBlockNumber();
      if (blockNumber === 0) {
        throw new Error("Invalid block number");
      }

      // Test gas price
      const gasPrice = await provider.getGasPrice();
      if (gasPrice.isZero()) {
        throw new Error("Invalid gas price");
      }

      return { status: "healthy", blockNumber, gasPrice: gasPrice.toString() };
    } catch (error) {
      return { status: "unhealthy", error: error.message };
    }
  }

  async checkContractConnection() {
    try {
      const provider = new ethers.providers.JsonRpcProvider(
        config.ethereum.rpcUrl
      );
      const contract = new ethers.Contract(
        config.contracts.arbitrageContract,
        ["function owner() external view returns (address)"],
        provider
      );

      const owner = await contract.owner();
      if (!owner || owner === ethers.constants.AddressZero) {
        throw new Error("Invalid contract owner");
      }

      return { status: "healthy", owner };
    } catch (error) {
      return { status: "unhealthy", error: error.message };
    }
  }

  async checkNetworkStatus() {
    try {
      const provider = new ethers.providers.JsonRpcProvider(
        config.ethereum.rpcUrl
      );

      const network = await provider.getNetwork();
      const latestBlock = await provider.getBlock("latest");

      // Check if we're on mainnet
      if (network.chainId !== 1) {
        throw new Error(`Wrong network: ${network.name} (expected mainnet)`);
      }

      // Check block timestamp (should be recent)
      const blockAge = Date.now() - latestBlock.timestamp * 1000;
      if (blockAge > 300000) {
        // 5 minutes
        throw new Error(`Block too old: ${Math.floor(blockAge / 1000)}s ago`);
      }

      return {
        status: "healthy",
        network: network.name,
        blockNumber: latestBlock.number,
        blockAge: Math.floor(blockAge / 1000),
      };
    } catch (error) {
      return { status: "unhealthy", error: error.message };
    }
  }

  async checkMemoryUsage() {
    try {
      const usage = process.memoryUsage();
      const maxMemory = 512 * 1024 * 1024; // 512MB

      if (usage.heapUsed > maxMemory) {
        throw new Error(
          `Memory usage too high: ${Math.round(usage.heapUsed / 1024 / 1024)}MB`
        );
      }

      return {
        status: "healthy",
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      };
    } catch (error) {
      return { status: "unhealthy", error: error.message };
    }
  }

  async checkDiskSpace() {
    try {
      const fs = require("fs");
      const path = require("path");

      // Check if logs directory is writable
      const logsDir = path.join(__dirname, "../logs");
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      // Test write permission
      const testFile = path.join(logsDir, "test.txt");
      fs.writeFileSync(testFile, "test");
      fs.unlinkSync(testFile);

      return { status: "healthy" };
    } catch (error) {
      return { status: "unhealthy", error: error.message };
    }
  }

  startMonitoringLoops() {
    // Gas price monitoring
    setInterval(async () => {
      try {
        const gasPrice = await gasService.getCurrentGasPrice();
        const level = gasService.getGasPriceLevel(gasPrice);

        if (level === "extreme" || level === "critical") {
          logger.warn(
            `High gas price detected: ${ethers.utils.formatUnits(
              gasPrice,
              "gwei"
            )} gwei (${level})`
          );
        }
      } catch (error) {
        this.handleMonitoringError("gas monitoring", error);
      }
    }, config.monitoring.gasCheckInterval);

    // Price monitoring - Removed redundant monitoring (handled by arbitrage service)
    // This was causing duplicate API calls and unnecessary overhead

    // Enhanced health monitoring
    setInterval(async () => {
      try {
        const health = await this.checkSystemHealth();
        if (health.status !== "healthy") {
          logger.warn("System health check failed", health);
          this.stats.consecutiveErrors++;

          // If too many consecutive errors, restart the bot
          if (this.stats.consecutiveErrors >= this.maxConsecutiveErrors) {
            logger.error("Too many consecutive errors, restarting bot...");
            await this.restart();
          }
        } else {
          this.stats.consecutiveErrors = 0;
        }
      } catch (error) {
        this.handleMonitoringError("health monitoring", error);
      }
    }, config.monitoring.healthCheckInterval);

    // Performance monitoring
    setInterval(async () => {
      try {
        const stats = this.getStats();
        const arbitrageStats = arbitrageService.getStats();

        logger.info("📊 Bot Statistics", {
          uptime: stats.uptime,
          totalExecutions: arbitrageStats.totalExecutions,
          successfulArbitrages: arbitrageStats.successfulArbitrages,
          totalProfit: ethers.utils.formatEther(arbitrageStats.totalProfit),
          totalGasUsed: ethers.utils.formatEther(arbitrageStats.totalGasUsed),
          errors: this.stats.errors,
          consecutiveErrors: this.stats.consecutiveErrors,
        });
      } catch (error) {
        this.handleMonitoringError("stats monitoring", error);
      }
    }, 60000); // Every minute
  }

  handleMonitoringError(context, error) {
    this.stats.errors++;

    // Only increment consecutive errors for critical errors
    if (
      error.message.includes("RPC") ||
      error.message.includes("network") ||
      error.message.includes("connection")
    ) {
      this.stats.consecutiveErrors++;
    } else {
      // Reset consecutive errors for non-critical errors
      this.stats.consecutiveErrors = Math.max(
        0,
        this.stats.consecutiveErrors - 1
      );
    }

    logger.error(`Error in ${context}`, error);

    // If too many consecutive errors, consider restarting
    if (this.stats.consecutiveErrors >= this.maxConsecutiveErrors) {
      logger.error("Too many consecutive errors, considering restart...");
    }
  }

  async checkSystemHealth() {
    try {
      // Check if services are still running
      if (!arbitrageService.isRunning) {
        return { status: "unhealthy", error: "Arbitrage service not running" };
      }

      // Check memory usage
      const memoryCheck = await this.checkMemoryUsage();
      if (memoryCheck.status !== "healthy") {
        return memoryCheck;
      }

      // Check RPC connection
      const rpcCheck = await this.checkRpcConnection();
      if (rpcCheck.status !== "healthy") {
        return rpcCheck;
      }

      return { status: "healthy" };
    } catch (error) {
      return { status: "unhealthy", error: error.message };
    }
  }

  async restart() {
    logger.info("🔄 Restarting bot...");

    try {
      await this.stop();
      await this.sleep(5000); // Wait 5 seconds
      await this.start();
    } catch (error) {
      logger.error("Failed to restart bot", error);
      process.exit(1);
    }
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);

      try {
        await this.stop();
        logger.info("Graceful shutdown completed");
        process.exit(0);
      } catch (error) {
        logger.error("Error during shutdown", error);
        process.exit(1);
      }
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("uncaughtException", (error) => {
      logger.error("Uncaught exception", error);
      shutdown("uncaughtException");
    });
    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled rejection", reason);
      shutdown("unhandledRejection");
    });
  }

  setupPerformanceMonitoring() {
    // Monitor memory usage with cleanup
    setInterval(() => {
      const usage = process.memoryUsage();
      if (usage.heapUsed > 400 * 1024 * 1024) {
        // 400MB
        logger.warn("High memory usage detected", {
          heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + "MB",
          heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + "MB",
        });

        // Force garbage collection when memory is high
        if (global.gc) {
          global.gc();
          logger.info("Emergency garbage collection performed");
        }

        // Clear price cache to free memory
        priceService.clearCache();
      }
    }, 30000); // Every 30 seconds

    // Regular garbage collection
    setInterval(() => {
      if (global.gc) {
        global.gc();
        logger.debug("Regular garbage collection performed");
      }
    }, 300000); // Every 5 minutes
  }

  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  getStats() {
    const uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0;

    return {
      uptime: this.formatUptime(uptime),
      totalExecutions: this.stats.totalExecutions,
      successfulArbitrages: this.stats.successfulArbitrages,
      totalProfit: this.stats.totalProfit,
      errors: this.stats.errors,
      consecutiveErrors: this.stats.consecutiveErrors,
      lastHealthCheck: this.stats.lastHealthCheck,
    };
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

async function main() {
  const bot = new ArbitrageBot();

  try {
    await bot.start();
  } catch (error) {
    logger.error("Failed to start bot", error);
    process.exit(1);
  }
}

// Start the bot
if (require.main === module) {
  main().catch((error) => {
    logger.error("Fatal error", error);
    process.exit(1);
  });
}

module.exports = ArbitrageBot;
