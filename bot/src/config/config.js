const { ethers } = require("ethers");
require("dotenv").config({ path: "../.env" });

const config = {
  // Ethereum Network Configuration
  ethereum: {
    rpcUrl:
      process.env.MAINNET_RPC_URL ||
      "https://eth-mainnet.alchemyapi.io/v2/YOUR_API_KEY",
    chainId: 1,
    privateKey: process.env.PRIVATE_KEY,
    gasLimit: 3000000,
    maxGasPrice: process.env.MAX_GAS_PRICE
      ? ethers.utils.parseUnits(process.env.MAX_GAS_PRICE, "gwei")
      : ethers.utils.parseUnits("50", "gwei"),
    minGasPrice: process.env.MIN_GAS_PRICE
      ? ethers.utils.parseUnits(process.env.MIN_GAS_PRICE, "gwei")
      : ethers.utils.parseUnits("5", "gwei"),
    maxFeePerGas: process.env.MAX_FEE_PER_GAS
      ? ethers.utils.parseUnits(process.env.MAX_FEE_PER_GAS, "gwei")
      : ethers.utils.parseUnits("100", "gwei"),
    maxPriorityFeePerGas: process.env.MAX_PRIORITY_FEE_PER_GAS
      ? ethers.utils.parseUnits(process.env.MAX_PRIORITY_FEE_PER_GAS, "gwei")
      : ethers.utils.parseUnits("2", "gwei"),
  },

  // Contract Addresses
  contracts: {
    arbitrageContract: process.env.ARBITRAGE_CONTRACT_ADDRESS,
    aaveV3Pool: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2",
    uniswapRouter:
      process.env.UNISWAP_ROUTER ||
      "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    sushiswapRouter:
      process.env.SUSHISWAP_ROUTER ||
      "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",
  },

  // Token Addresses
  tokens: {
    WETH:
      process.env.WETH_ADDRESS || "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    DAI:
      process.env.DAI_ADDRESS || "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    USDC:
      process.env.USDC_ADDRESS || "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    USDT:
      process.env.USDT_ADDRESS || "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    WBTC: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    LINK: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
    UNI: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
  },

  // Arbitrage Configuration - Optimized for WETH/USDC single pair
  arbitrage: {
    minProfit: process.env.MIN_PROFIT
      ? ethers.utils.parseEther(process.env.MIN_PROFIT)
      : ethers.utils.parseEther("0.003"), // 0.003 ETH (lower threshold for single pair)
    maxSlippage: process.env.MAX_SLIPPAGE
      ? parseFloat(process.env.MAX_SLIPPAGE)
      : 0.3, // 0.3% (tighter for stable pair)
    flashLoanAmount: process.env.FLASH_LOAN_AMOUNT
      ? ethers.utils.parseEther(process.env.FLASH_LOAN_AMOUNT)
      : ethers.utils.parseEther("5"), // 5 ETH (higher amount for better profit)
    maxExecutionTime: 300000, // 5 minutes
    retryAttempts: process.env.RETRY_ATTEMPTS
      ? parseInt(process.env.RETRY_ATTEMPTS)
      : 3,
    retryDelay: process.env.RETRY_DELAY
      ? parseInt(process.env.RETRY_DELAY)
      : 1000, // 1 second
    maxFeeLimit: process.env.MAX_FEE_LIMIT
      ? ethers.utils.parseEther(process.env.MAX_FEE_LIMIT)
      : ethers.utils.parseEther("0.012"), // 0.012 ETH max fee (higher for 5 ETH loan)
  },

  // Monitoring Configuration - Optimized for single pair (WETH/USDC)
  monitoring: {
    checkInterval: process.env.CHECK_INTERVAL
      ? parseInt(process.env.CHECK_INTERVAL)
      : 8000, // 8 seconds (optimized for API efficiency)
    gasCheckInterval: process.env.GAS_CHECK_INTERVAL
      ? parseInt(process.env.GAS_CHECK_INTERVAL)
      : 60000, // 1 minute (reduced frequency)
    priceCheckInterval: process.env.PRICE_CHECK_INTERVAL
      ? parseInt(process.env.PRICE_CHECK_INTERVAL)
      : 8000, // 8 seconds (optimized)
    healthCheckInterval: process.env.HEALTH_CHECK_INTERVAL
      ? parseInt(process.env.HEALTH_CHECK_INTERVAL)
      : 300000, // 5 minutes
    maxConcurrentExecutions: 1,
    maxConsecutiveErrors: process.env.MAX_CONSECUTIVE_ERRORS
      ? parseInt(process.env.MAX_CONSECUTIVE_ERRORS)
      : 5,
    restartDelay: process.env.RESTART_DELAY
      ? parseInt(process.env.RESTART_DELAY)
      : 5000, // 5 seconds
    // Optimized for single pair with API efficiency
    blockBasedExecution: true, // Execute on new blocks
    liquidityCheckInterval: 60000, // Check Aave liquidity every minute (reduced)
    priceCacheTTL: 8000, // Cache prices for 8 seconds (increased cache)
    maxApiRequestsPerMinute: 80, // Reduced rate limit for efficiency
  },

  // Database Configuration
  database: {
    redis: {
      host: process.env.REDIS_HOST || "localhost",
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      db: process.env.REDIS_DB || 0,
    },
    postgres: {
      host: process.env.PG_HOST || "localhost",
      port: process.env.PG_PORT || 5432,
      database: process.env.PG_DATABASE || "arbitrage_bot",
      username: process.env.PG_USERNAME || "postgres",
      password: process.env.PG_PASSWORD,
    },
  },

  // API Configuration
  api: {
    port: process.env.API_PORT || 3000,
    cors: {
      origin: process.env.CORS_ORIGIN || "*",
      credentials: true,
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    },
  },

  // Notification Configuration
  notifications: {
    telegram: {
      enabled: process.env.TELEGRAM_ENABLED === "true",
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      chatId: process.env.TELEGRAM_CHAT_ID,
    },
    discord: {
      enabled: process.env.DISCORD_ENABLED === "true",
      webhookUrl: process.env.DISCORD_WEBHOOK_URL,
    },
    email: {
      enabled: process.env.EMAIL_ENABLED === "true",
      smtp: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      },
      to: process.env.EMAIL_TO,
    },
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || "info",
    file: {
      enabled: process.env.LOG_FILE_ENABLED === "true",
      path: "./logs/arbitrage-bot.log",
      maxSize: "10m",
      maxFiles: "5",
    },
    console: {
      enabled: process.env.LOG_CONSOLE_ENABLED !== "false",
      pretty: process.env.NODE_ENV !== "production",
    },
  },

  // Security Configuration
  security: {
    apiKey: process.env.API_KEY,
    jwtSecret: process.env.JWT_SECRET,
    encryptionKey: process.env.ENCRYPTION_KEY,
    maxRequestSize: process.env.MAX_REQUEST_SIZE || "1mb",
    rateLimitWindow: process.env.RATE_LIMIT_WINDOW
      ? parseInt(process.env.RATE_LIMIT_WINDOW)
      : 900000, // 15 minutes
    rateLimitMax: process.env.RATE_LIMIT_MAX
      ? parseInt(process.env.RATE_LIMIT_MAX)
      : 100,
  },

  // Performance Configuration
  performance: {
    maxMemoryUsage: process.env.MAX_MEMORY_USAGE || "512MB",
    gcInterval: process.env.GC_INTERVAL || 300000, // 5 minutes
    connectionTimeout: process.env.CONNECTION_TIMEOUT || 30000, // 30 seconds
    maxConcurrentRequests: process.env.MAX_CONCURRENT_REQUESTS
      ? parseInt(process.env.MAX_CONCURRENT_REQUESTS)
      : 10,
    requestTimeout: process.env.REQUEST_TIMEOUT
      ? parseInt(process.env.REQUEST_TIMEOUT)
      : 10000, // 10 seconds
  },

  // Validation Configuration
  validation: {
    minWalletBalance: process.env.MIN_WALLET_BALANCE
      ? ethers.utils.parseEther(process.env.MIN_WALLET_BALANCE)
      : ethers.utils.parseEther("0.02"), // 0.02 ETH minimum (düşürüldü)
    maxGasEstimate: process.env.MAX_GAS_ESTIMATE
      ? parseInt(process.env.MAX_GAS_ESTIMATE)
      : 3000000,
    minBlockConfirmations: process.env.MIN_BLOCK_CONFIRMATIONS
      ? parseInt(process.env.MIN_BLOCK_CONFIRMATIONS)
      : 1,
    maxBlockAge: process.env.MAX_BLOCK_AGE
      ? parseInt(process.env.MAX_BLOCK_AGE)
      : 300, // 5 minutes
  },
};

// Enhanced Validation
const requiredEnvVars = [
  "MAINNET_RPC_URL",
  "PRIVATE_KEY",
  "ARBITRAGE_CONTRACT_ADDRESS",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Validate Ethereum addresses
const validateAddress = (address, name) => {
  if (!ethers.utils.isAddress(address)) {
    throw new Error(`Invalid ${name} address: ${address}`);
  }
};

// Validate contract addresses
validateAddress(config.contracts.arbitrageContract, "arbitrage contract");
validateAddress(config.contracts.uniswapRouter, "Uniswap router");
validateAddress(config.contracts.sushiswapRouter, "Sushiswap router");

// Validate token addresses
Object.entries(config.tokens).forEach(([symbol, address]) => {
  validateAddress(address, symbol);
});

// Validate private key
if (!config.ethereum.privateKey.startsWith("0x")) {
  config.ethereum.privateKey = "0x" + config.ethereum.privateKey;
}

try {
  new ethers.Wallet(config.ethereum.privateKey);
} catch (error) {
  throw new Error(`Invalid private key: ${error.message}`);
}

// Validate numeric values
const validatePositiveNumber = (value, name) => {
  if (value <= 0) {
    throw new Error(`${name} must be positive`);
  }
};

validatePositiveNumber(config.arbitrage.minProfit, "minProfit");
validatePositiveNumber(config.arbitrage.flashLoanAmount, "flashLoanAmount");
validatePositiveNumber(config.arbitrage.maxSlippage, "maxSlippage");
validatePositiveNumber(config.monitoring.checkInterval, "checkInterval");

// Validate gas prices
if (config.ethereum.maxGasPrice.lte(config.ethereum.minGasPrice)) {
  throw new Error("maxGasPrice must be greater than minGasPrice");
}

// Validate fee limits
if (config.arbitrage.maxFeeLimit.lte(0)) {
  throw new Error("maxFeeLimit must be positive");
}

// Log configuration summary
console.log("🔧 Configuration loaded successfully");
console.log(`📡 RPC URL: ${config.ethereum.rpcUrl.substring(0, 30)}...`);
console.log(
  `💰 Min Profit: ${ethers.utils.formatEther(config.arbitrage.minProfit)} ETH`
);
console.log(
  `⚡ Max Gas Price: ${ethers.utils.formatUnits(
    config.ethereum.maxGasPrice,
    "gwei"
  )} gwei`
);
console.log(
  `🔒 Max Fee Limit: ${ethers.utils.formatEther(
    config.arbitrage.maxFeeLimit
  )} ETH`
);

module.exports = config;
