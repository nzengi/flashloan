import React from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiHome,
  FiSettings,
  FiBarChart2,
  FiFileText,
  FiPlay,
  FiSquare,
  FiZap,
  FiTrendingUp,
  FiActivity,
  FiShield,
  FiDollarSign,
} from "react-icons/fi";
import { useBotStore } from "../stores/botStore";
import { useConfigStore } from "../stores/configStore";
import { electronAPI } from "../utils/electronAPI";
import toast from "react-hot-toast";

const Sidebar = ({ open, setOpen }) => {
  const location = useLocation();

  const navigation = [
    {
      name: "Dashboard",
      href: "/",
      icon: FiHome,
      description: "Bot overview and status",
    },
    {
      name: "Configuration",
      href: "/configuration",
      icon: FiSettings,
      description: "Bot settings and setup",
    },
    {
      name: "Trading",
      href: "/trading",
      icon: FiZap,
      description: "Manual trading interface",
    },
    {
      name: "Analytics",
      href: "/analytics",
      icon: FiBarChart2,
      description: "Performance analysis",
    },
    {
      name: "Logs",
      href: "/logs",
      icon: FiFileText,
      description: "System logs and monitoring",
    },
  ];

  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.div
        initial={{ x: -256 }}
        animate={{ x: open ? 0 : -256 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-700 lg:translate-x-0 lg:static lg:inset-0`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <FiZap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">FlashLoan Bot</h1>
              <p className="text-xs text-slate-400">v1.0.0</p>
            </div>
          </div>

          {/* Close button for mobile */}
          <button
            onClick={() => setOpen(false)}
            className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setOpen(false)}
                className={`group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  active
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon
                  className={`mr-3 w-5 h-5 ${
                    active
                      ? "text-white"
                      : "text-slate-400 group-hover:text-white"
                  }`}
                />
                <span>{item.name}</span>

                {/* Active indicator */}
                {active && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute right-2 w-2 h-2 bg-white rounded-full"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="p-4 border-t border-slate-700">
          {/* Bot status indicator */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-300">
              Bot Status
            </span>
            <BotStatusIndicator />
          </div>

          {/* Quick actions */}
          <div className="space-y-2">
            <QuickActionButton
              icon={FiPlay}
              label="Start Bot"
              action="start"
              variant="success"
            />
            <QuickActionButton
              icon={FiSquare}
              label="Stop Bot"
              action="stop"
              variant="danger"
            />
          </div>

          {/* System info */}
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>System</span>
              <span className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Healthy
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

// Bot status indicator component
const BotStatusIndicator = () => {
  const { isRunning } = useBotStore();

  return (
    <div className="flex items-center space-x-2">
      <div
        className={`w-2 h-2 rounded-full ${
          isRunning ? "bg-green-500 animate-pulse" : "bg-red-500"
        }`}
      />
      <span
        className={`text-xs font-medium ${
          isRunning ? "text-green-400" : "text-red-400"
        }`}
      >
        {isRunning ? "Running" : "Stopped"}
      </span>
    </div>
  );
};

// Quick action button component
const QuickActionButton = ({ icon: Icon, label, action, variant }) => {
  const { isRunning, setStarting, setStopping } = useBotStore();
  const { config } = useConfigStore();
  const { electronAPI } = require("../utils/electronAPI");

  const handleAction = async () => {
    try {
      if (action === "start" && !isRunning) {
        setStarting(true);
        const result = await electronAPI.startBot(config);
        if (result.success) {
          toast.success("Bot started successfully!");
        } else {
          toast.error(result.error || "Failed to start bot");
        }
        setStarting(false);
      } else if (action === "stop" && isRunning) {
        setStopping(true);
        const result = await electronAPI.stopBot();
        if (result.success) {
          toast.success("Bot stopped successfully!");
        } else {
          toast.error(result.error || "Failed to stop bot");
        }
        setStopping(false);
      }
    } catch (error) {
      toast.error("Action failed: " + error.message);
      setStarting(false);
      setStopping(false);
    }
  };

  const isDisabled =
    (action === "start" && isRunning) ||
    (action === "stop" && !isRunning) ||
    !config.ethereum.rpcUrl;

  const variantClasses = {
    success: "bg-green-600 hover:bg-green-700 text-white",
    danger: "bg-red-600 hover:bg-red-700 text-white",
    secondary: "bg-slate-600 hover:bg-slate-700 text-white",
  };

  return (
    <button
      onClick={handleAction}
      disabled={isDisabled}
      className={`w-full flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
        variantClasses[variant]
      } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <Icon className="w-4 h-4 mr-2" />
      {label}
    </button>
  );
};

export default Sidebar;
