const pino = require("pino");
const config = require("../../config/config");

// Create logger instance
const pinoLogger = pino({
  level: config.logging.level,
  transport: config.logging.console.pretty
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// File logger for production
let fileLogger = null;
if (config.logging.file.enabled) {
  const fs = require("fs");
  const path = require("path");

  // Ensure logs directory exists
  const logsDir = path.dirname(config.logging.file.path);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  fileLogger = pino({
    level: config.logging.level,
    transport: {
      target: "pino/file",
      options: {
        destination: config.logging.file.path,
      },
    },
  });
}

// Custom logger methods
const customLogger = {
  info: (message, data = {}) => {
    pinoLogger.info({ ...data, message });
    if (fileLogger) fileLogger.info({ ...data, message });
  },

  error: (message, errorObj = null, data = {}) => {
    const logData = {
      ...data,
      message,
      error: errorObj
        ? {
            name: errorObj.name,
            message: errorObj.message,
            stack: errorObj.stack,
            code: errorObj.code,
          }
        : null,
    };
    pinoLogger.error(logData);
    if (fileLogger) fileLogger.error(logData);
  },

  warn: (message, data = {}) => {
    pinoLogger.warn({ ...data, message });
    if (fileLogger) fileLogger.warn({ ...data, message });
  },

  debug: (message, data = {}) => {
    pinoLogger.debug({ ...data, message });
    if (fileLogger) fileLogger.debug({ ...data, message });
  },

  // Specialized logging methods
  arbitrage: (message, data = {}) => {
    customLogger.info(`[ARBITRAGE] ${message}`, {
      ...data,
      category: "arbitrage",
    });
  },

  gas: (message, data = {}) => {
    customLogger.info(`[GAS] ${message}`, { ...data, category: "gas" });
  },

  profit: (message, data = {}) => {
    customLogger.info(`[PROFIT] ${message}`, { ...data, category: "profit" });
  },

  transaction: (message, data = {}) => {
    customLogger.info(`[TX] ${message}`, { ...data, category: "transaction" });
  },

  // Performance logging
  performance: (operation, duration, data = {}) => {
    customLogger.info(`[PERF] ${operation} took ${duration}ms`, {
      ...data,
      category: "performance",
      duration,
      operation,
    });
  },

  // Memory usage logging
  memory: (data = {}) => {
    const memUsage = process.memoryUsage();
    customLogger.info("[MEMORY] Current memory usage", {
      ...data,
      category: "memory",
      rss: Math.round(memUsage.rss / 1024 / 1024) + "MB",
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + "MB",
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + "MB",
      external: Math.round(memUsage.external / 1024 / 1024) + "MB",
    });
  },
};

module.exports = customLogger;
