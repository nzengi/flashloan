import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FiPlay,
  FiSquare,
  FiTrendingUp,
  FiTrendingDown,
  FiDollarSign,
  FiClock,
  FiActivity,
  FiAlertCircle,
  FiCheckCircle,
  FiXCircle,
  FiRefreshCw,
  FiZap,
  FiShield,
  FiWifi,
} from "react-icons/fi";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { useBotStore } from "../stores/botStore";
import { useConfigStore } from "../stores/configStore";
import { electronAPI } from "../utils/electronAPI";
import toast from "react-hot-toast";

const Dashboard = () => {
  const {
    isRunning,
    stats,
    formattedUptime,
    services,
    isStarting,
    isStopping,
    setStarting,
    setStopping,
    isHealthy,
  } = useBotStore();

  const { config, isConfigValid } = useConfigStore();
  const [recentTrades, setRecentTrades] = useState([]);
  const [gasPrice, setGasPrice] = useState(0);
  const [ethPrice, setEthPrice] = useState(0);

  // Mock data for charts
  const profitData = [
    { time: "00:00", profit: 0 },
    { time: "02:00", profit: 0.001 },
    { time: "04:00", profit: 0.002 },
    { time: "06:00", profit: 0.003 },
    { time: "08:00", profit: 0.005 },
    { time: "10:00", profit: 0.008 },
    { time: "12:00", profit: 0.012 },
    { time: "14:00", profit: 0.015 },
    { time: "16:00", profit: 0.018 },
    { time: "18:00", profit: 0.02 },
    { time: "20:00", profit: 0.022 },
    { time: "22:00", profit: 0.025 },
  ];

  const tradeData = [
    { time: "00:00", trades: 0 },
    { time: "02:00", trades: 2 },
    { time: "04:00", trades: 5 },
    { time: "06:00", trades: 8 },
    { time: "08:00", trades: 12 },
    { time: "10:00", trades: 15 },
    { time: "12:00", trades: 18 },
    { time: "14:00", trades: 22 },
    { time: "16:00", trades: 25 },
    { time: "18:00", trades: 28 },
    { time: "20:00", trades: 30 },
    { time: "22:00", trades: 32 },
  ];

  useEffect(() => {
    // Fetch initial data
    fetchGasPrice();
    fetchEthPrice();

    // Set up intervals
    const gasInterval = setInterval(fetchGasPrice, 30000); // Every 30 seconds
    const priceInterval = setInterval(fetchEthPrice, 60000); // Every minute

    return () => {
      clearInterval(gasInterval);
      clearInterval(priceInterval);
    };
  }, []);

  const fetchGasPrice = async () => {
    try {
      // Mock gas price - in real app, fetch from API
      setGasPrice(Math.random() * 50 + 20); // 20-70 gwei
    } catch (error) {
      console.error("Failed to fetch gas price:", error);
    }
  };

  const fetchEthPrice = async () => {
    try {
      // Mock ETH price - in real app, fetch from API
      setEthPrice(Math.random() * 1000 + 2000); // $2000-3000
    } catch (error) {
      console.error("Failed to fetch ETH price:", error);
    }
  };

  const handleStartBot = async () => {
    if (!isConfigValid) {
      toast.error("Please configure the bot first");
      return;
    }

    try {
      setStarting(true);
      const result = await electronAPI.startBot(config);
      if (result.success) {
        toast.success("Bot started successfully!");
      } else {
        toast.error(result.error || "Failed to start bot");
      }
    } catch (error) {
      toast.error("Failed to start bot: " + error.message);
    } finally {
      setStarting(false);
    }
  };

  const handleStopBot = async () => {
    try {
      setStopping(true);
      const result = await electronAPI.stopBot();
      if (result.success) {
        toast.success("Bot stopped successfully!");
      } else {
        toast.error(result.error || "Failed to stop bot");
      }
    } catch (error) {
      toast.error("Failed to stop bot: " + error.message);
    } finally {
      setStopping(false);
    }
  };

  const getStatusColor = () => {
    if (!isRunning) return "text-red-400";
    if (isHealthy()) return "text-green-400";
    return "text-yellow-400";
  };

  const getStatusText = () => {
    if (!isRunning) return "Stopped";
    if (isHealthy()) return "Healthy";
    return "Warning";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400">
            Monitor your arbitrage bot performance
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
            <span className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={handleStartBot}
              disabled={isRunning || isStarting || !isConfigValid}
              className="btn-success flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiPlay className="w-4 h-4" />
              <span>{isStarting ? "Starting..." : "Start Bot"}</span>
            </button>

            <button
              onClick={handleStopBot}
              disabled={!isRunning || isStopping}
              className="btn-danger flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiSquare className="w-4 h-4" />
              <span>{isStopping ? "Stopping..." : "Stop Bot"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Profit"
          value={`${(stats.totalProfit / 1e18).toFixed(6)} ETH`}
          change={`$${((stats.totalProfit / 1e18) * ethPrice).toFixed(2)}`}
          icon={FiDollarSign}
          color="green"
          trend="up"
        />

        <StatCard
          title="Success Rate"
          value={`${
            stats.totalExecutions > 0
              ? (
                  (stats.successfulArbitrages / stats.totalExecutions) *
                  100
                ).toFixed(1)
              : 0
          }%`}
          change={`${stats.successfulArbitrages}/${stats.totalExecutions} trades`}
          icon={FiTrendingUp}
          color="blue"
          trend="up"
        />

        <StatCard
          title="Uptime"
          value={formattedUptime}
          change={isRunning ? "Running" : "Stopped"}
          icon={FiClock}
          color="purple"
          trend={isRunning ? "up" : "down"}
        />

        <StatCard
          title="Gas Price"
          value={`${gasPrice.toFixed(1)} Gwei`}
          change={gasPrice > 50 ? "High" : "Normal"}
          icon={FiActivity}
          color={gasPrice > 50 ? "red" : "green"}
          trend={gasPrice > 50 ? "down" : "up"}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profit Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              Profit Over Time
            </h3>
            <FiTrendingUp className="w-5 h-5 text-green-400" />
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={profitData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                }}
              />
              <Area
                type="monotone"
                dataKey="profit"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Trade Volume Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Trade Volume</h3>
            <FiRefreshCw className="w-5 h-5 text-blue-400" />
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={tradeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="trades"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Service Status & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <h3 className="text-lg font-semibold text-white mb-4">
            Service Status
          </h3>

          <div className="space-y-4">
            <ServiceStatusItem
              name="Price Service"
              status={services.priceService?.status || "unknown"}
              description="Market data connectivity"
              icon={FiTrendingUp}
            />

            <ServiceStatusItem
              name="Gas Service"
              status={services.gasService?.status || "unknown"}
              description="Gas price monitoring"
              icon={FiActivity}
            />

            <ServiceStatusItem
              name="Network"
              status={config.ethereum.rpcUrl ? "healthy" : "error"}
              description="Ethereum network connection"
              icon={FiWifi}
            />

            <ServiceStatusItem
              name="Contract"
              status={config.contracts.arbitrageContract ? "healthy" : "error"}
              description="Smart contract access"
              icon={FiShield}
            />
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <h3 className="text-lg font-semibold text-white mb-4">
            Recent Activity
          </h3>

          <div className="space-y-3">
            {recentTrades.length > 0 ? (
              recentTrades.map((trade, index) => (
                <ActivityItem key={index} trade={trade} />
              ))
            ) : (
              <div className="text-center py-8">
                <FiZap className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <p className="text-slate-400">No recent activity</p>
                <p className="text-sm text-slate-500">
                  Start the bot to see trading activity
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, change, icon: Icon, color, trend }) => {
  const colorClasses = {
    green: "text-green-400",
    blue: "text-blue-400",
    purple: "text-purple-400",
    red: "text-red-400",
    yellow: "text-yellow-400",
  };

  const bgClasses = {
    green: "bg-green-500/10",
    blue: "bg-blue-500/10",
    purple: "bg-purple-500/10",
    red: "bg-red-500/10",
    yellow: "bg-yellow-500/10",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          <p className="text-sm text-slate-500 mt-1">{change}</p>
        </div>

        <div
          className={`w-12 h-12 rounded-lg ${bgClasses[color]} flex items-center justify-center`}
        >
          <Icon className={`w-6 h-6 ${colorClasses[color]}`} />
        </div>
      </div>
    </motion.div>
  );
};

// Service Status Item Component
const ServiceStatusItem = ({ name, status, description, icon: Icon }) => {
  const getStatusIcon = (status) => {
    switch (status) {
      case "healthy":
        return <FiCheckCircle className="w-4 h-4 text-green-400" />;
      case "error":
        return <FiXCircle className="w-4 h-4 text-red-400" />;
      case "warning":
        return <FiAlertCircle className="w-4 h-4 text-yellow-400" />;
      default:
        return <FiAlertCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "healthy":
        return "text-green-400";
      case "error":
        return "text-red-400";
      case "warning":
        return "text-yellow-400";
      default:
        return "text-slate-400";
    }
  };

  return (
    <div className="flex items-center space-x-3 p-3 bg-slate-700/50 rounded-lg">
      <Icon className="w-5 h-5 text-slate-400" />

      <div className="flex-1">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-white">{name}</span>
          {getStatusIcon(status)}
        </div>
        <p className="text-xs text-slate-400">{description}</p>
      </div>

      <span
        className={`text-xs font-medium capitalize ${getStatusColor(status)}`}
      >
        {status}
      </span>
    </div>
  );
};

// Activity Item Component
const ActivityItem = ({ trade }) => {
  return (
    <div className="flex items-center space-x-3 p-3 bg-slate-700/50 rounded-lg">
      <div className="w-2 h-2 bg-green-500 rounded-full" />

      <div className="flex-1">
        <p className="text-sm font-medium text-white">
          Arbitrage executed: +{trade.profit} ETH
        </p>
        <p className="text-xs text-slate-400">
          {trade.pair} • {trade.time}
        </p>
      </div>

      <span className="text-xs text-green-400 font-medium">
        +${trade.profitUsd}
      </span>
    </div>
  );
};

export default Dashboard;
