// Configuration file for Arbitrage Bot
// Copy this to config.js and fill in your values

module.exports = {
  // Ethereum Network Configuration
  ethereum: {
    rpcUrl: "https://eth-mainnet.alchemyapi.io/v2/YOUR_API_KEY",
    wsUrl: "wss://eth-mainnet.alchemyapi.io/v2/YOUR_API_KEY",
    chainId: 1,
  },

  // Wallet Configuration
  wallet: {
    privateKey: "your_private_key_here",
    address: "your_wallet_address_here",
  },

  // Contract Addresses
  contracts: {
    arbitrageContract: "your_deployed_contract_address",
    uniswapRouter: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    sushiswapRouter: "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",
    aaveLendingPool: "0x24a42fD28C976A61Df5D00D0599C34c4f90748c8",
  },

  // Token Addresses
  tokens: {
    WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    USDC: "0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8C",
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  },

  // Trading Parameters
  trading: {
    minProfitEth: "0.01", // Minimum profit in ETH
    maxGasPriceGwei: 50, // Maximum gas price in gwei
    gasLimit: 500000,
    checkIntervalMs: 1000, // Check every second
    deadlineMinutes: 5,
    slippageTolerance: 0.05, // 5% slippage tolerance
    maxTradeSizeEth: 10, // Maximum trade size in ETH
  },

  // MEV Protection
  mev: {
    useFlashbots: false,
    flashbotsRelay: "https://relay.flashbots.net",
    maxPriorityFeeGwei: 2,
    bundleTimeout: 30000, // 30 seconds
  },

  // Risk Management
  risk: {
    maxDailyTrades: 100,
    maxDailyVolumeEth: 10,
    emergencyStopLossEth: 0.5,
    maxConcurrentTrades: 3,
  },

  // Monitoring
  monitoring: {
    enableLogging: true,
    logLevel: "info",
    telegramBotToken: "your_telegram_bot_token",
    telegramChatId: "your_chat_id",
    enableAlerts: true,
  },

  // Database (Optional)
  database: {
    enabled: false,
    host: "localhost",
    port: 5432,
    name: "arbitrage_bot",
    user: "postgres",
    password: "your_password",
  },

  // Redis (Optional)
  redis: {
    enabled: false,
    url: "redis://localhost:6379",
  },

  // API Keys (Optional)
  apis: {
    etherscan: "your_etherscan_api_key",
    coingecko: "your_coingecko_api_key",
  },
};
