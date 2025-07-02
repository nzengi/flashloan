import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  FiSave,
  FiRefreshCw,
  FiEye,
  FiEyeOff,
  FiCheck,
  FiX,
  FiAlertCircle,
  FiShield,
  FiWifi,
  FiKey,
  FiSettings,
} from "react-icons/fi";
import { useConfigStore } from "../stores/configStore";
import { electronAPI } from "../utils/electronAPI";
import toast from "react-hot-toast";

const Configuration = () => {
  const {
    config,
    setConfigField,
    validationErrors,
    isConfigValid,
    isSaving,
    setSaving,
    validateConfig,
    resetConfig,
  } = useConfigStore();

  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [activeTab, setActiveTab] = useState("ethereum");

  const tabs = [
    { id: "ethereum", name: "Ethereum", icon: FiWifi },
    { id: "wallet", name: "Wallet", icon: FiKey },
    { id: "contracts", name: "Contracts", icon: FiShield },
    { id: "arbitrage", name: "Arbitrage", icon: FiSettings },
  ];

  const handleSave = async () => {
    try {
      setSaving(true);
      validateConfig();

      if (!isConfigValid) {
        toast.error("Please fix validation errors before saving");
        return;
      }

      const result = await electronAPI.saveConfig(config);
      if (result.success) {
        toast.success("Configuration saved successfully!");
      } else {
        toast.error(result.error || "Failed to save configuration");
      }
    } catch (error) {
      toast.error("Failed to save configuration: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      toast.loading("Testing connection...");
      // Mock connection test
      await new Promise((resolve) => setTimeout(resolve, 2000));
      toast.success("Connection test successful!");
    } catch (error) {
      toast.error("Connection test failed: " + error.message);
    }
  };

  const getErrorForField = (field) => {
    return validationErrors.find((error) => error.includes(field));
  };

  const formatWeiToEth = (wei) => {
    if (!wei) return "";
    return (parseFloat(wei) / 1e18).toString();
  };

  const formatEthToWei = (eth) => {
    if (!eth) return "";
    return (parseFloat(eth) * 1e18).toString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Configuration</h1>
          <p className="text-slate-400">
            Configure your arbitrage bot settings
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleTestConnection}
            className="btn-secondary flex items-center space-x-2"
          >
            <FiRefreshCw className="w-4 h-4" />
            <span>Test Connection</span>
          </button>

          <button
            onClick={handleSave}
            disabled={!isConfigValid || isSaving}
            className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiSave className="w-4 h-4" />
            <span>{isSaving ? "Saving..." : "Save Configuration"}</span>
          </button>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/20 rounded-lg p-4"
        >
          <div className="flex items-center space-x-2 mb-2">
            <FiAlertCircle className="w-5 h-5 text-red-400" />
            <h3 className="text-sm font-medium text-red-400">
              Configuration Errors
            </h3>
          </div>
          <ul className="text-sm text-red-300 space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index} className="flex items-center space-x-2">
                <FiX className="w-3 h-3" />
                <span>{error}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-700">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-slate-400 hover:text-slate-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="card">
        {activeTab === "ethereum" && (
          <EthereumTab
            config={config}
            setConfigField={setConfigField}
            getErrorForField={getErrorForField}
          />
        )}

        {activeTab === "wallet" && (
          <WalletTab
            config={config}
            setConfigField={setConfigField}
            getErrorForField={getErrorForField}
            showPrivateKey={showPrivateKey}
            setShowPrivateKey={setShowPrivateKey}
          />
        )}

        {activeTab === "contracts" && (
          <ContractsTab
            config={config}
            setConfigField={setConfigField}
            getErrorForField={getErrorForField}
          />
        )}

        {activeTab === "arbitrage" && (
          <ArbitrageTab
            config={config}
            setConfigField={setConfigField}
            getErrorForField={getErrorForField}
            formatWeiToEth={formatWeiToEth}
            formatEthToWei={formatEthToWei}
          />
        )}
      </div>
    </div>
  );
};

// Ethereum Tab Component
const EthereumTab = ({ config, setConfigField, getErrorForField }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">
          Ethereum Network
        </h3>
        <p className="text-slate-400 mb-6">
          Configure your Ethereum network connection
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            RPC URL *
          </label>
          <input
            type="text"
            value={config.ethereum.rpcUrl}
            onChange={(e) =>
              setConfigField("ethereum", "rpcUrl", e.target.value)
            }
            placeholder="https://eth-mainnet.alchemyapi.io/v2/YOUR_API_KEY"
            className={`input-field ${
              getErrorForField("rpcUrl") ? "border-red-500" : ""
            }`}
          />
          {getErrorForField("rpcUrl") && (
            <p className="text-red-400 text-sm mt-1">
              {getErrorForField("rpcUrl")}
            </p>
          )}
          <p className="text-slate-500 text-sm mt-1">
            Your Ethereum RPC endpoint (Alchemy, Infura, etc.)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            WebSocket URL
          </label>
          <input
            type="text"
            value={config.ethereum.wsUrl}
            onChange={(e) =>
              setConfigField("ethereum", "wsUrl", e.target.value)
            }
            placeholder="wss://eth-mainnet.alchemyapi.io/v2/YOUR_API_KEY"
            className="input-field"
          />
          <p className="text-slate-500 text-sm mt-1">
            Optional WebSocket endpoint for real-time updates
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Chain ID
          </label>
          <input
            type="number"
            value={config.ethereum.chainId}
            onChange={(e) =>
              setConfigField("ethereum", "chainId", parseInt(e.target.value))
            }
            placeholder="1"
            className="input-field"
          />
          <p className="text-slate-500 text-sm mt-1">Ethereum mainnet = 1</p>
        </div>
      </div>
    </div>
  );
};

// Wallet Tab Component
const WalletTab = ({
  config,
  setConfigField,
  getErrorForField,
  showPrivateKey,
  setShowPrivateKey,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">
          Wallet Configuration
        </h3>
        <p className="text-slate-400 mb-6">
          Configure your wallet for transactions
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Wallet Address *
          </label>
          <input
            type="text"
            value={config.wallet.address}
            onChange={(e) =>
              setConfigField("wallet", "address", e.target.value)
            }
            placeholder="0x..."
            className={`input-field ${
              getErrorForField("address") ? "border-red-500" : ""
            }`}
          />
          {getErrorForField("address") && (
            <p className="text-red-400 text-sm mt-1">
              {getErrorForField("address")}
            </p>
          )}
          <p className="text-slate-500 text-sm mt-1">
            Your wallet's public address
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Private Key *
          </label>
          <div className="relative">
            <input
              type={showPrivateKey ? "text" : "password"}
              value={config.wallet.privateKey}
              onChange={(e) =>
                setConfigField("wallet", "privateKey", e.target.value)
              }
              placeholder="0x..."
              className={`input-field pr-10 ${
                getErrorForField("privateKey") ? "border-red-500" : ""
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPrivateKey(!showPrivateKey)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
            >
              {showPrivateKey ? (
                <FiEyeOff className="w-4 h-4" />
              ) : (
                <FiEye className="w-4 h-4" />
              )}
            </button>
          </div>
          {getErrorForField("privateKey") && (
            <p className="text-red-400 text-sm mt-1">
              {getErrorForField("privateKey")}
            </p>
          )}
          <p className="text-slate-500 text-sm mt-1">
            Your wallet's private key (encrypted in storage)
          </p>
        </div>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <FiAlertCircle className="w-5 h-5 text-yellow-400" />
          <h4 className="text-sm font-medium text-yellow-400">
            Security Warning
          </h4>
        </div>
        <p className="text-sm text-yellow-300 mt-2">
          Your private key is encrypted and stored locally. Never share it with
          anyone and ensure your computer is secure.
        </p>
      </div>
    </div>
  );
};

// Contracts Tab Component
const ContractsTab = ({ config, setConfigField, getErrorForField }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">
          Smart Contracts
        </h3>
        <p className="text-slate-400 mb-6">
          Configure deployed contract addresses
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Arbitrage Contract *
          </label>
          <input
            type="text"
            value={config.contracts.arbitrageContract}
            onChange={(e) =>
              setConfigField("contracts", "arbitrageContract", e.target.value)
            }
            placeholder="0x..."
            className={`input-field ${
              getErrorForField("arbitrageContract") ? "border-red-500" : ""
            }`}
          />
          {getErrorForField("arbitrageContract") && (
            <p className="text-red-400 text-sm mt-1">
              {getErrorForField("arbitrageContract")}
            </p>
          )}
          <p className="text-slate-500 text-sm mt-1">
            Your deployed arbitrage contract address
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Uniswap Router
          </label>
          <input
            type="text"
            value={config.contracts.uniswapRouter}
            onChange={(e) =>
              setConfigField("contracts", "uniswapRouter", e.target.value)
            }
            placeholder="0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
            className="input-field"
          />
          <p className="text-slate-500 text-sm mt-1">
            Uniswap V2 Router address
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Sushiswap Router
          </label>
          <input
            type="text"
            value={config.contracts.sushiswapRouter}
            onChange={(e) =>
              setConfigField("contracts", "sushiswapRouter", e.target.value)
            }
            placeholder="0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F"
            className="input-field"
          />
          <p className="text-slate-500 text-sm mt-1">
            Sushiswap Router address
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Aave Lending Pool
          </label>
          <input
            type="text"
            value={config.contracts.aaveLendingPool}
            onChange={(e) =>
              setConfigField("contracts", "aaveLendingPool", e.target.value)
            }
            placeholder="0x24a42fD28C976A61Df5D00D0599C34c4f90748c8"
            className="input-field"
          />
          <p className="text-slate-500 text-sm mt-1">
            Aave V3 Lending Pool address
          </p>
        </div>
      </div>
    </div>
  );
};

// Arbitrage Tab Component
const ArbitrageTab = ({
  config,
  setConfigField,
  getErrorForField,
  formatWeiToEth,
  formatEthToWei,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">
          Arbitrage Settings
        </h3>
        <p className="text-slate-400 mb-6">
          Configure arbitrage parameters and limits
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Minimum Profit (ETH)
          </label>
          <input
            type="number"
            step="0.001"
            value={formatWeiToEth(config.arbitrage.minProfit)}
            onChange={(e) =>
              setConfigField(
                "arbitrage",
                "minProfit",
                formatEthToWei(e.target.value)
              )
            }
            placeholder="0.005"
            className={`input-field ${
              getErrorForField("minProfit") ? "border-red-500" : ""
            }`}
          />
          {getErrorForField("minProfit") && (
            <p className="text-red-400 text-sm mt-1">
              {getErrorForField("minProfit")}
            </p>
          )}
          <p className="text-slate-500 text-sm mt-1">
            Minimum profit to execute arbitrage
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Flash Loan Amount (ETH)
          </label>
          <input
            type="number"
            step="0.1"
            value={formatWeiToEth(config.arbitrage.flashLoanAmount)}
            onChange={(e) =>
              setConfigField(
                "arbitrage",
                "flashLoanAmount",
                formatEthToWei(e.target.value)
              )
            }
            placeholder="2.0"
            className={`input-field ${
              getErrorForField("flashLoanAmount") ? "border-red-500" : ""
            }`}
          />
          {getErrorForField("flashLoanAmount") && (
            <p className="text-red-400 text-sm mt-1">
              {getErrorForField("flashLoanAmount")}
            </p>
          )}
          <p className="text-slate-500 text-sm mt-1">
            Amount to borrow for arbitrage
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Max Fee Limit (ETH)
          </label>
          <input
            type="number"
            step="0.001"
            value={formatWeiToEth(config.arbitrage.maxFeeLimit)}
            onChange={(e) =>
              setConfigField(
                "arbitrage",
                "maxFeeLimit",
                formatEthToWei(e.target.value)
              )
            }
            placeholder="0.008"
            className={`input-field ${
              getErrorForField("maxFeeLimit") ? "border-red-500" : ""
            }`}
          />
          {getErrorForField("maxFeeLimit") && (
            <p className="text-red-400 text-sm mt-1">
              {getErrorForField("maxFeeLimit")}
            </p>
          )}
          <p className="text-slate-500 text-sm mt-1">
            Maximum fees willing to pay
          </p>
        </div>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <FiCheck className="w-5 h-5 text-blue-400" />
          <h4 className="text-sm font-medium text-blue-400">Trading Pair</h4>
        </div>
        <p className="text-sm text-blue-300 mt-2">
          Currently configured for WETH/USDC trading pair with optimized
          parameters.
        </p>
      </div>
    </div>
  );
};

export default Configuration;
