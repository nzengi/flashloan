import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useBotStore = create(
  persist(
    (set, get) => ({
      // Bot status
      isRunning: false,
      isStarting: false,
      isStopping: false,

      // Bot statistics
      stats: {
        startTime: null,
        totalExecutions: 0,
        successfulArbitrages: 0,
        totalProfit: 0,
        errors: 0,
        lastHealthCheck: null,
        consecutiveErrors: 0,
      },

      // Bot uptime
      uptime: 0,
      formattedUptime: "0s",

      // Service status
      services: {
        priceService: { status: "unknown" },
        gasService: { status: "unknown" },
      },

      // Recent trades
      recentTrades: [],

      // Error log
      errors: [],

      // Actions
      setBotStatus: (status) => {
        set({
          isRunning: status.isRunning,
          stats: status.stats || get().stats,
          uptime: status.uptime || 0,
          formattedUptime: status.formattedUptime || "0s",
          services: status.services || get().services,
        });
      },

      setBotStats: (stats) => {
        set({ stats });
      },

      setServices: (services) => {
        set({ services });
      },

      setStarting: (isStarting) => {
        set({ isStarting });
      },

      setStopping: (isStopping) => {
        set({ isStopping });
      },

      addTrade: (trade) => {
        const { recentTrades } = get();
        const updatedTrades = [trade, ...recentTrades.slice(0, 49)]; // Keep last 50 trades
        set({ recentTrades: updatedTrades });
      },

      addError: (error) => {
        const { errors } = get();
        const newError = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          message: error.message || error,
          stack: error.stack,
          type: error.type || "unknown",
        };
        const updatedErrors = [newError, ...errors.slice(0, 99)]; // Keep last 100 errors
        set({ errors: updatedErrors });
      },

      clearErrors: () => {
        set({ errors: [] });
      },

      clearTrades: () => {
        set({ recentTrades: [] });
      },

      resetStats: () => {
        set({
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
          recentTrades: [],
          errors: [],
        });
      },

      // Computed values
      getProfitRate: () => {
        const { stats } = get();
        if (stats.totalExecutions === 0) return 0;
        return (stats.successfulArbitrages / stats.totalExecutions) * 100;
      },

      getAverageProfit: () => {
        const { stats } = get();
        if (stats.successfulArbitrages === 0) return 0;
        return stats.totalProfit / stats.successfulArbitrages;
      },

      getErrorRate: () => {
        const { stats } = get();
        if (stats.totalExecutions === 0) return 0;
        return (stats.errors / stats.totalExecutions) * 100;
      },

      isHealthy: () => {
        const { services, stats } = get();
        const servicesHealthy = Object.values(services).every(
          (service) => service.status === "healthy"
        );
        const notTooManyErrors = stats.consecutiveErrors < 5;
        return servicesHealthy && notTooManyErrors;
      },
    }),
    {
      name: "bot-store",
      partialize: (state) => ({
        stats: state.stats,
        recentTrades: state.recentTrades.slice(0, 20), // Only persist last 20 trades
        errors: state.errors.slice(0, 20), // Only persist last 20 errors
      }),
    }
  )
);
