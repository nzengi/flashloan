// Electron API wrapper for secure communication with main process
export const electronAPI = {
  // Configuration management
  getConfig: async () => {
    if (window.electronAPI) {
      return await window.electronAPI.getConfig();
    }
    throw new Error("Electron API not available");
  },

  saveConfig: async (config) => {
    if (window.electronAPI) {
      return await window.electronAPI.saveConfig(config);
    }
    throw new Error("Electron API not available");
  },

  // Bot control
  startBot: async (config) => {
    if (window.electronAPI) {
      return await window.electronAPI.startBot(config);
    }
    throw new Error("Electron API not available");
  },

  stopBot: async () => {
    if (window.electronAPI) {
      return await window.electronAPI.stopBot();
    }
    throw new Error("Electron API not available");
  },

  getBotStatus: async () => {
    if (window.electronAPI) {
      return await window.electronAPI.getBotStatus();
    }
    throw new Error("Electron API not available");
  },

  // Logs
  getLogs: async (options) => {
    if (window.electronAPI) {
      return await window.electronAPI.getLogs(options);
    }
    throw new Error("Electron API not available");
  },

  // Events
  onConfigImported: (callback) => {
    if (window.electronAPI) {
      window.electronAPI.onConfigImported(callback);
    }
  },

  onOpenSettings: (callback) => {
    if (window.electronAPI) {
      window.electronAPI.onOpenSettings(callback);
    }
  },

  // Remove listeners
  removeAllListeners: (channel) => {
    if (window.electronAPI) {
      window.electronAPI.removeAllListeners(channel);
    }
  },
};

// Fallback for development (when not running in Electron)
if (!window.electronAPI) {
  console.warn("Running in development mode - Electron API not available");

  // Mock API for development
  window.electronAPI = {
    getConfig: async () => ({ success: true, data: getMockConfig() }),
    saveConfig: async () => ({ success: true }),
    startBot: async () => ({ success: true, message: "Bot started (mock)" }),
    stopBot: async () => ({ success: true, message: "Bot stopped (mock)" }),
    getBotStatus: async () => ({ success: true, data: getMockBotStatus() }),
    getLogs: async () => ({
      success: true,
      data: { logs: [], total: 0, files: [] },
    }),
    onConfigImported: () => {},
    onOpenSettings: () => {},
    removeAllListeners: () => {},
  };
}

function getMockConfig() {
  return {
    ethereum: {
      rpcUrl: "https://eth-mainnet.alchemyapi.io/v2/YOUR_API_KEY",
      wsUrl: "wss://eth-mainnet.alchemyapi.io/v2/YOUR_API_KEY",
      chainId: 1,
    },
    wallet: {
      privateKey: "your_private_key_here",
      address: "your_wallet_address_here",
    },
    contracts: {
      arbitrageContract: "your_deployed_contract_address",
      uniswapRouter: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
      sushiswapRouter: "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",
      aaveLendingPool: "0x24a42fD28C976A61Df5D00D0599C34c4f90748c8",
    },
    tokens: {
      WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      USDC: "0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8C",
    },
    arbitrage: {
      minProfit: "5000000000000000", // 0.005 ETH
      flashLoanAmount: "2000000000000000000", // 2 ETH
      maxFeeLimit: "8000000000000000", // 0.008 ETH
      tradingPairs: [
        {
          name: "WETH/USDC",
          token0: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
          token1: "0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8C",
          decimals0: 18,
          decimals1: 6,
        },
      ],
    },
  };
}

function getMockBotStatus() {
  return {
    isRunning: false,
    stats: {
      startTime: null,
      totalExecutions: 0,
      successfulArbitrages: 0,
      totalProfit: 0,
      errors: 0,
      lastHealthCheck: null,
      consecutiveErrors: 0,
    },
    uptime: 0,
    formattedUptime: "0s",
    services: {
      priceService: { status: "healthy" },
      gasService: { status: "healthy" },
    },
  };
}
