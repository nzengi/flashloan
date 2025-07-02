import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useConfigStore = create(
  persist(
    (set, get) => ({
      // Configuration data
      config: {
        ethereum: {
          rpcUrl: "",
          wsUrl: "",
          chainId: 1,
        },
        wallet: {
          privateKey: "",
          address: "",
        },
        contracts: {
          arbitrageContract: "",
          uniswapRouter: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
          sushiswapRouter: "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",
          aaveLendingPool: "0x24a42fD28C976A61Df5D00D0599C34c4f90748c8",
        },
        tokens: {
          WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
          USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        },
        arbitrage: {
          minProfit: "5000000000000000", // 0.005 ETH
          flashLoanAmount: "2000000000000000000", // 2 ETH
          maxFeeLimit: "8000000000000000", // 0.008 ETH
          tradingPairs: [
            {
              name: "WETH/USDC",
              token0: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
              token1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
              decimals0: 18,
              decimals1: 6,
            },
          ],
        },
      },

      // UI state
      isConfigValid: false,
      validationErrors: [],
      isSaving: false,

      // Actions
      setConfig: (config) => {
        set({ config });
        get().validateConfig();
      },

      updateConfig: (path, value) => {
        const { config } = get();
        const keys = path.split(".");
        const newConfig = { ...config };

        let current = newConfig;
        for (let i = 0; i < keys.length - 1; i++) {
          current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;

        set({ config: newConfig });
        get().validateConfig();
      },

      setConfigField: (section, field, value) => {
        const { config } = get();
        set({
          config: {
            ...config,
            [section]: {
              ...config[section],
              [field]: value,
            },
          },
        });
        get().validateConfig();
      },

      validateConfig: () => {
        const { config } = get();
        const errors = [];

        // Required fields validation
        if (!config.ethereum.rpcUrl) {
          errors.push("Ethereum RPC URL is required");
        }

        if (!config.wallet.privateKey) {
          errors.push("Wallet private key is required");
        }

        if (!config.wallet.address) {
          errors.push("Wallet address is required");
        }

        if (!config.contracts.arbitrageContract) {
          errors.push("Arbitrage contract address is required");
        }

        // Ethereum address validation
        const addressRegex = /^0x[a-fA-F0-9]{40}$/;
        if (
          config.wallet.address &&
          !addressRegex.test(config.wallet.address)
        ) {
          errors.push("Invalid wallet address format");
        }

        if (
          config.contracts.arbitrageContract &&
          !addressRegex.test(config.contracts.arbitrageContract)
        ) {
          errors.push("Invalid contract address format");
        }

        // Private key validation
        const privateKeyRegex = /^0x[a-fA-F0-9]{64}$/;
        if (
          config.wallet.privateKey &&
          !privateKeyRegex.test(config.wallet.privateKey)
        ) {
          errors.push("Invalid private key format");
        }

        // Numeric validation
        if (
          config.arbitrage.minProfit &&
          isNaN(parseFloat(config.arbitrage.minProfit))
        ) {
          errors.push("Minimum profit must be a valid number");
        }

        if (
          config.arbitrage.flashLoanAmount &&
          isNaN(parseFloat(config.arbitrage.flashLoanAmount))
        ) {
          errors.push("Flash loan amount must be a valid number");
        }

        if (
          config.arbitrage.maxFeeLimit &&
          isNaN(parseFloat(config.arbitrage.maxFeeLimit))
        ) {
          errors.push("Maximum fee limit must be a valid number");
        }

        // Business logic validation
        if (config.arbitrage.minProfit && config.arbitrage.maxFeeLimit) {
          const minProfit = parseFloat(config.arbitrage.minProfit);
          const maxFee = parseFloat(config.arbitrage.maxFeeLimit);

          if (minProfit <= maxFee) {
            errors.push(
              "Minimum profit should be greater than maximum fee limit"
            );
          }
        }

        set({
          validationErrors: errors,
          isConfigValid: errors.length === 0,
        });
      },

      setSaving: (isSaving) => {
        set({ isSaving });
      },

      resetConfig: () => {
        set({
          config: {
            ethereum: {
              rpcUrl: "",
              wsUrl: "",
              chainId: 1,
            },
            wallet: {
              privateKey: "",
              address: "",
            },
            contracts: {
              arbitrageContract: "",
              uniswapRouter: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
              sushiswapRouter: "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",
              aaveLendingPool: "0x24a42fD28C976A61Df5D00D0599C34c4f90748c8",
            },
            tokens: {
              WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
              USDC: "0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8C",
            },
            arbitrage: {
              minProfit: "5000000000000000",
              flashLoanAmount: "2000000000000000000",
              maxFeeLimit: "8000000000000000",
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
          },
          validationErrors: [],
          isConfigValid: false,
        });
      },

      // Computed values
      getConfigSection: (section) => {
        const { config } = get();
        return config[section] || {};
      },

      hasRequiredFields: () => {
        const { config } = get();
        return !!(
          config.ethereum.rpcUrl &&
          config.wallet.privateKey &&
          config.wallet.address &&
          config.contracts.arbitrageContract
        );
      },

      getFormattedValues: () => {
        const { config } = get();
        return {
          minProfitEth: config.arbitrage.minProfit
            ? (parseFloat(config.arbitrage.minProfit) / 1e18).toFixed(6)
            : "0",
          flashLoanAmountEth: config.arbitrage.flashLoanAmount
            ? (parseFloat(config.arbitrage.flashLoanAmount) / 1e18).toFixed(2)
            : "0",
          maxFeeLimitEth: config.arbitrage.maxFeeLimit
            ? (parseFloat(config.arbitrage.maxFeeLimit) / 1e18).toFixed(6)
            : "0",
        };
      },
    }),
    {
      name: "config-store",
      partialize: (state) => ({
        config: state.config,
      }),
    }
  )
);
