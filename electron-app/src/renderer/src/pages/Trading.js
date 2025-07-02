import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FiZap,
  FiTrendingUp,
  FiTrendingDown,
  FiDollarSign,
  FiClock,
  FiActivity,
  FiPlay,
  FiSquare,
  FiRefreshCw,
  FiAlertCircle,
  FiCheckCircle,
  FiXCircle,
} from "react-icons/fi";
import { useBotStore } from "../stores/botStore";
import { useConfigStore } from "../stores/configStore";
import { electronAPI } from "../utils/electronAPI";
import toast from "react-hot-toast";

const Trading = () => {
  const { isRunning, stats } = useBotStore();
  const { config } = useConfigStore();

  const [isExecuting, setIsExecuting] = useState(false);
  const [currentPrices, setCurrentPrices] = useState({
    uniswap: 0,
    sushiswap: 0,
    difference: 0,
    profitable: false,
  });
  const [tradeHistory, setTradeHistory] = useState([]);
  const [gasPrice, setGasPrice] = useState(0);

  useEffect(() => {
    // Fetch initial data
    fetchPrices();
    fetchGasPrice();

    // Set up intervals
    const priceInterval = setInterval(fetchPrices, 5000); // Every 5 seconds
    const gasInterval = setInterval(fetchGasPrice, 10000); // Every 10 seconds

    return () => {
      clearInterval(priceInterval);
      clearInterval(gasInterval);
    };
  }, []);

  const fetchPrices = async () => {
    try {
      // Mock price data - in real app, fetch from APIs
      const uniswapPrice = 2000 + Math.random() * 100;
      const sushiswapPrice = 2000 + Math.random() * 100;
      const difference = Math.abs(uniswapPrice - sushiswapPrice);
      const profitable = difference > 5; // 5 USD difference threshold

      setCurrentPrices({
        uniswap: uniswapPrice,
        sushiswap: sushiswapPrice,
        difference,
        profitable,
      });
    } catch (error) {
      console.error("Failed to fetch prices:", error);
    }
  };

  const fetchGasPrice = async () => {
    try {
      setGasPrice(Math.random() * 50 + 20); // 20-70 gwei
    } catch (error) {
      console.error("Failed to fetch gas price:", error);
    }
  };

  const executeArbitrage = async () => {
    if (!isRunning) {
      toast.error("Bot must be running to execute trades");
      return;
    }

    if (!currentPrices.profitable) {
      toast.error("No profitable arbitrage opportunity detected");
      return;
    }

    try {
      setIsExecuting(true);
      toast.loading("Executing arbitrage...");

      // Mock trade execution
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const trade = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        pair: "WETH/USDC",
        uniswapPrice: currentPrices.uniswap,
        sushiswapPrice: currentPrices.sushiswap,
        profit: Math.random() * 0.01 + 0.001, // 0.001-0.011 ETH
        gasUsed: Math.random() * 200000 + 150000, // 150k-350k gas
        status: "success",
      };

      setTradeHistory([trade, ...tradeHistory.slice(0, 9)]); // Keep last 10 trades
      toast.success(
        `Arbitrage executed! Profit: +${trade.profit.toFixed(6)} ETH`
      );
    } catch (error) {
      toast.error("Failed to execute arbitrage: " + error.message);
    } finally {
      setIsExecuting(false);
    }
  };

  const getProfitabilityColor = () => {
    if (currentPrices.profitable) return "text-green-400";
    return "text-red-400";
  };

  const getProfitabilityIcon = () => {
    if (currentPrices.profitable) return FiTrendingUp;
    return FiTrendingDown;
  };

  const ProfitabilityIcon = getProfitabilityIcon();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Trading</h1>
          <p className="text-slate-400">
            Manual arbitrage execution and monitoring
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isRunning ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="text-sm font-medium text-slate-300">
              {isRunning ? "Bot Running" : "Bot Stopped"}
            </span>
          </div>

          <button
            onClick={fetchPrices}
            className="btn-secondary flex items-center space-x-2"
          >
            <FiRefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Price Monitoring */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Prices */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Current Prices</h3>
            <FiActivity className="w-5 h-5 text-blue-400" />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-slate-300">Uniswap</p>
                <p className="text-lg font-bold text-white">
                  ${currentPrices.uniswap.toFixed(2)}
                </p>
              </div>
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <FiTrendingUp className="w-4 h-4 text-blue-400" />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-slate-300">Sushiswap</p>
                <p className="text-lg font-bold text-white">
                  ${currentPrices.sushiswap.toFixed(2)}
                </p>
              </div>
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <FiTrendingUp className="w-4 h-4 text-green-400" />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-slate-300">Difference</p>
                <p className={`text-lg font-bold ${getProfitabilityColor()}`}>
                  ${currentPrices.difference.toFixed(2)}
                </p>
              </div>
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  currentPrices.profitable ? "bg-green-500/20" : "bg-red-500/20"
                }`}
              >
                <ProfitabilityIcon
                  className={`w-4 h-4 ${
                    currentPrices.profitable ? "text-green-400" : "text-red-400"
                  }`}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Arbitrage Opportunity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              Arbitrage Opportunity
            </h3>
            <FiZap className="w-5 h-5 text-yellow-400" />
          </div>

          <div className="space-y-4">
            <div className="text-center">
              <div
                className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                  currentPrices.profitable ? "bg-green-500/20" : "bg-red-500/20"
                }`}
              >
                <ProfitabilityIcon
                  className={`w-8 h-8 ${
                    currentPrices.profitable ? "text-green-400" : "text-red-400"
                  }`}
                />
              </div>

              <h4 className={`text-lg font-bold ${getProfitabilityColor()}`}>
                {currentPrices.profitable ? "Profitable" : "Not Profitable"}
              </h4>

              <p className="text-sm text-slate-400 mt-1">
                {currentPrices.profitable
                  ? "Arbitrage opportunity detected"
                  : "Insufficient price difference"}
              </p>
            </div>

            <button
              onClick={executeArbitrage}
              disabled={!isRunning || !currentPrices.profitable || isExecuting}
              className="w-full btn-primary flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiPlay className="w-4 h-4" />
              <span>{isExecuting ? "Executing..." : "Execute Arbitrage"}</span>
            </button>
          </div>
        </motion.div>

        {/* Market Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Market Stats</h3>
            <FiDollarSign className="w-5 h-5 text-green-400" />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Gas Price</span>
              <span className="text-sm font-medium text-white">
                {gasPrice.toFixed(1)} Gwei
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Total Trades</span>
              <span className="text-sm font-medium text-white">
                {stats.totalExecutions}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Success Rate</span>
              <span className="text-sm font-medium text-white">
                {stats.totalExecutions > 0
                  ? `${(
                      (stats.successfulArbitrages / stats.totalExecutions) *
                      100
                    ).toFixed(1)}%`
                  : "0%"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Total Profit</span>
              <span className="text-sm font-medium text-green-400">
                {(stats.totalProfit / 1e18).toFixed(6)} ETH
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Trade History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Recent Trades</h3>
          <span className="text-sm text-slate-400">
            {tradeHistory.length} trades
          </span>
        </div>

        {tradeHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Pair</th>
                  <th>Uniswap</th>
                  <th>Sushiswap</th>
                  <th>Profit</th>
                  <th>Gas Used</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tradeHistory.map((trade) => (
                  <tr key={trade.id}>
                    <td className="text-sm text-slate-300">
                      {new Date(trade.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="text-sm text-slate-300">{trade.pair}</td>
                    <td className="text-sm text-slate-300">
                      ${trade.uniswapPrice.toFixed(2)}
                    </td>
                    <td className="text-sm text-slate-300">
                      ${trade.sushiswapPrice.toFixed(2)}
                    </td>
                    <td className="text-sm font-medium text-green-400">
                      +{trade.profit.toFixed(6)} ETH
                    </td>
                    <td className="text-sm text-slate-300">
                      {trade.gasUsed.toLocaleString()}
                    </td>
                    <td>
                      <div className="flex items-center space-x-1">
                        {trade.status === "success" ? (
                          <FiCheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <FiXCircle className="w-4 h-4 text-red-400" />
                        )}
                        <span
                          className={`text-xs font-medium capitalize ${
                            trade.status === "success"
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {trade.status}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <FiZap className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400">No trades yet</p>
            <p className="text-sm text-slate-500">
              Execute your first arbitrage to see history
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Trading;
