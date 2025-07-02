import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiMenu,
  FiBell,
  FiSettings,
  FiUser,
  FiLogOut,
  FiRefreshCw,
  FiWifi,
  FiWifiOff,
  FiClock,
  FiDollarSign,
} from "react-icons/fi";
import { useBotStore } from "../stores/botStore";
import { useConfigStore } from "../stores/configStore";

const Header = ({ onMenuClick }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const { isRunning, stats, formattedUptime } = useBotStore();
  const { config } = useConfigStore();

  const notifications = [
    {
      id: 1,
      type: "success",
      title: "Bot Started",
      message: "Arbitrage bot is now running",
      time: "2 minutes ago",
    },
    {
      id: 2,
      type: "info",
      title: "New Trade",
      message: "Profitable arbitrage executed: +0.002 ETH",
      time: "5 minutes ago",
    },
    {
      id: 3,
      type: "warning",
      title: "High Gas Price",
      message: "Current gas price is above threshold",
      time: "10 minutes ago",
    },
  ];

  const getNetworkStatus = () => {
    if (!config.ethereum.rpcUrl)
      return { status: "disconnected", icon: FiWifiOff, color: "text-red-400" };
    return { status: "connected", icon: FiWifi, color: "text-green-400" };
  };

  const networkStatus = getNetworkStatus();
  const NetworkIcon = networkStatus.icon;

  return (
    <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left section */}
        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <FiMenu className="w-5 h-5" />
          </button>

          {/* Bot status */}
          <div className="flex items-center space-x-3">
            <div
              className={`w-3 h-3 rounded-full ${
                isRunning ? "bg-green-500 animate-pulse" : "bg-red-500"
              }`}
            />
            <span className="text-sm font-medium text-slate-300">
              {isRunning ? "Bot Running" : "Bot Stopped"}
            </span>
          </div>

          {/* Uptime */}
          {isRunning && (
            <div className="hidden md:flex items-center space-x-2 text-sm text-slate-400">
              <FiClock className="w-4 h-4" />
              <span>{formattedUptime}</span>
            </div>
          )}
        </div>

        {/* Center section - Stats */}
        <div className="hidden lg:flex items-center space-x-6">
          <StatItem
            label="Total Profit"
            value={`${(stats.totalProfit / 1e18).toFixed(6)} ETH`}
            icon={FiDollarSign}
            color="text-green-400"
          />
          <StatItem
            label="Success Rate"
            value={`${
              stats.totalExecutions > 0
                ? (
                    (stats.successfulArbitrages / stats.totalExecutions) *
                    100
                  ).toFixed(1)
                : 0
            }%`}
            icon={FiRefreshCw}
            color="text-blue-400"
          />
          <StatItem
            label="Total Trades"
            value={stats.totalExecutions}
            icon={FiRefreshCw}
            color="text-slate-400"
          />
        </div>

        {/* Right section */}
        <div className="flex items-center space-x-4">
          {/* Network status */}
          <div className="hidden sm:flex items-center space-x-2 text-sm text-slate-400">
            <NetworkIcon className={`w-4 h-4 ${networkStatus.color}`} />
            <span className="capitalize">{networkStatus.status}</span>
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              <FiBell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50"
                >
                  <div className="p-4 border-b border-slate-700">
                    <h3 className="text-sm font-medium text-white">
                      Notifications
                    </h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                      />
                    ))}
                  </div>
                  <div className="p-3 border-t border-slate-700">
                    <button className="w-full text-sm text-blue-400 hover:text-blue-300 transition-colors">
                      View all notifications
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
                <FiUser className="w-4 h-4" />
              </div>
              <span className="hidden sm:block text-sm font-medium">User</span>
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50"
                >
                  <div className="py-2">
                    <button className="w-full flex items-center px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors">
                      <FiSettings className="w-4 h-4 mr-3" />
                      Settings
                    </button>
                    <button className="w-full flex items-center px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors">
                      <FiUser className="w-4 h-4 mr-3" />
                      Profile
                    </button>
                    <hr className="my-2 border-slate-700" />
                    <button className="w-full flex items-center px-4 py-2 text-sm text-red-400 hover:bg-slate-700 transition-colors">
                      <FiLogOut className="w-4 h-4 mr-3" />
                      Logout
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(showNotifications || showUserMenu) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowNotifications(false);
            setShowUserMenu(false);
          }}
        />
      )}
    </header>
  );
};

// Stat item component
const StatItem = ({ label, value, icon: Icon, color }) => {
  return (
    <div className="flex items-center space-x-2">
      <Icon className={`w-4 h-4 ${color}`} />
      <div className="text-sm">
        <span className="text-slate-400">{label}: </span>
        <span className={`font-medium ${color}`}>{value}</span>
      </div>
    </div>
  );
};

// Notification item component
const NotificationItem = ({ notification }) => {
  const getTypeStyles = (type) => {
    switch (type) {
      case "success":
        return "border-l-green-500 bg-green-500/10";
      case "warning":
        return "border-l-yellow-500 bg-yellow-500/10";
      case "error":
        return "border-l-red-500 bg-red-500/10";
      default:
        return "border-l-blue-500 bg-blue-500/10";
    }
  };

  return (
    <div
      className={`p-4 border-l-4 ${getTypeStyles(
        notification.type
      )} hover:bg-slate-700 transition-colors`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="text-sm font-medium text-white">
            {notification.title}
          </h4>
          <p className="text-sm text-slate-400 mt-1">{notification.message}</p>
        </div>
        <span className="text-xs text-slate-500 ml-2">{notification.time}</span>
      </div>
    </div>
  );
};

export default Header;
