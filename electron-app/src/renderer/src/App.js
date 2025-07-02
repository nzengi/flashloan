import React, { useState, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

// Components
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Dashboard from "./pages/Dashboard";
import Configuration from "./pages/Configuration";
import Trading from "./pages/Trading";
import Analytics from "./pages/Analytics";
import Logs from "./pages/Logs";
import Settings from "./pages/Settings";

// Hooks
import { useBotStore } from "./stores/botStore";
import { useConfigStore } from "./stores/configStore";

// Utils
import { electronAPI } from "./utils/electronAPI";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  const { setBotStatus, setBotStats } = useBotStore();
  const { setConfig } = useConfigStore();

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Load saved configuration
      const configResult = await electronAPI.getConfig();
      if (configResult.success && configResult.data) {
        setConfig(configResult.data);
      }

      // Get initial bot status
      const statusResult = await electronAPI.getBotStatus();
      if (statusResult.success) {
        setBotStatus(statusResult.data);
      }

      // Set up event listeners
      electronAPI.onConfigImported((config) => {
        setConfig(config);
        toast.success("Configuration imported successfully!");
      });

      electronAPI.onOpenSettings(() => {
        // Navigate to settings page
        window.location.href = "/settings";
      });

      setIsLoading(false);
    } catch (error) {
      console.error("Failed to initialize app:", error);
      toast.error("Failed to initialize application");
      setIsLoading(false);
    }
  };

  // Start polling for bot status updates
  useEffect(() => {
    if (!isLoading) {
      const interval = setInterval(async () => {
        try {
          const result = await electronAPI.getBotStatus();
          if (result.success) {
            setBotStatus(result.data);
            if (result.data.stats) {
              setBotStats(result.data.stats);
            }
          }
        } catch (error) {
          console.error("Failed to update bot status:", error);
        }
      }, 5000); // Update every 5 seconds

      return () => clearInterval(interval);
    }
  }, [isLoading, setBotStatus, setBotStats]);

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Loading FlashLoan Bot
          </h2>
          <p className="text-slate-400">Initializing application...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      <div className="lg:pl-64">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/configuration" element={<Configuration />} />
                <Route path="/trading" element={<Trading />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/logs" element={<Logs />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default App;
