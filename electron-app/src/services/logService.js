const fs = require('fs');
const path = require('path');
const readline = require('readline');

class LogService {
  constructor() {
    this.logDir = path.join(__dirname, '../../../bot/logs');
    this.maxLogLines = 1000; // Maximum lines to read at once
  }

  async getLogs(options = {}) {
    try {
      const {
        level = 'all',
        limit = 100,
        startTime = null,
        endTime = null,
        search = null
      } = options;

      // Get all log files
      const logFiles = await this.getLogFiles();
      
      if (logFiles.length === 0) {
        return {
          logs: [],
          total: 0,
          files: []
        };
      }

      // Read logs from all files
      let allLogs = [];
      
      for (const file of logFiles) {
        const fileLogs = await this.readLogFile(file, {
          level,
          limit: Math.ceil(limit / logFiles.length),
          startTime,
          endTime,
          search
        });
        
        allLogs = allLogs.concat(fileLogs);
      }

      // Sort by timestamp (newest first)
      allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Apply final limit
      allLogs = allLogs.slice(0, limit);

      return {
        logs: allLogs,
        total: allLogs.length,
        files: logFiles.map(f => path.basename(f))
      };

    } catch (error) {
      console.error('Error reading logs:', error);
      throw error;
    }
  }

  async getLogFiles() {
    try {
      if (!fs.existsSync(this.logDir)) {
        return [];
      }

      const files = fs.readdirSync(this.logDir);
      const logFiles = files
        .filter(file => file.endsWith('.log'))
        .map(file => path.join(this.logDir, file))
        .sort((a, b) => {
          // Sort by modification time (newest first)
          const statA = fs.statSync(a);
          const statB = fs.statSync(b);
          return statB.mtime.getTime() - statA.mtime.getTime();
        });

      return logFiles;
    } catch (error) {
      console.error('Error getting log files:', error);
      return [];
    }
  }

  async readLogFile(filePath, options = {}) {
    try {
      const {
        level = 'all',
        limit = 100,
        startTime = null,
        endTime = null,
        search = null
      } = options;

      const logs = [];
      const fileStream = fs.createReadStream(filePath);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });

      for await (const line of rl) {
        if (logs.length >= limit) break;

        try {
          const logEntry = this.parseLogLine(line);
          
          if (!logEntry) continue;

          // Apply filters
          if (level !== 'all' && logEntry.level !== level) continue;
          
          if (startTime && new Date(logEntry.timestamp) < new Date(startTime)) continue;
          
          if (endTime && new Date(logEntry.timestamp) > new Date(endTime)) continue;
          
          if (search && !logEntry.message.toLowerCase().includes(search.toLowerCase())) continue;

          logs.push(logEntry);
        } catch (error) {
          // Skip invalid log lines
          continue;
        }
      }

      return logs;

    } catch (error) {
      console.error(`Error reading log file ${filePath}:`, error);
      return [];
    }
  }

  parseLogLine(line) {
    try {
      // Winston log format: timestamp level: message
      const match = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\s+(\w+):\s+(.+)$/);
      
      if (!match) {
        // Try alternative format
        const altMatch = line.match(/^\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\] (\w+):\s+(.+)$/);
        
        if (!altMatch) return null;

        const [, timestamp, level, message] = altMatch;
        return {
          timestamp: new Date(timestamp).toISOString(),
          level: level.toLowerCase(),
          message: message.trim(),
          raw: line
        };
      }

      const [, timestamp, level, message] = match;
      return {
        timestamp,
        level: level.toLowerCase(),
        message: message.trim(),
        raw: line
      };

    } catch (error) {
      return null;
    }
  }

  async getLogStats() {
    try {
      const logFiles = await this.getLogFiles();
      
      const stats = {
        totalFiles: logFiles.length,
        totalSize: 0,
        levels: {
          error: 0,
          warn: 0,
          info: 0,
          debug: 0
        },
        recentActivity: {
          lastHour: 0,
          lastDay: 0,
          lastWeek: 0
        }
      };

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      for (const file of logFiles) {
        const fileStats = fs.statSync(file);
        stats.totalSize += fileStats.size;

        // Read file for detailed stats
        const logs = await this.readLogFile(file, { limit: this.maxLogLines });
        
        for (const log of logs) {
          // Count levels
          if (stats.levels[log.level] !== undefined) {
            stats.levels[log.level]++;
          }

          // Count recent activity
          const logTime = new Date(log.timestamp);
          
          if (logTime > oneHourAgo) {
            stats.recentActivity.lastHour++;
          }
          
          if (logTime > oneDayAgo) {
            stats.recentActivity.lastDay++;
          }
          
          if (logTime > oneWeekAgo) {
            stats.recentActivity.lastWeek++;
          }
        }
      }

      return stats;

    } catch (error) {
      console.error('Error getting log stats:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        levels: { error: 0, warn: 0, info: 0, debug: 0 },
        recentActivity: { lastHour: 0, lastDay: 0, lastWeek: 0 }
      };
    }
  }

  async clearLogs() {
    try {
      const logFiles = await this.getLogFiles();
      
      for (const file of logFiles) {
        fs.unlinkSync(file);
      }

      return {
        success: true,
        message: `Cleared ${logFiles.length} log files`
      };

    } catch (error) {
      console.error('Error clearing logs:', error);
      throw error;
    }
  }

  async exportLogs(options = {}) {
    try {
      const {
        format = 'json',
        startTime = null,
        endTime = null,
        level = 'all'
      } = options;

      const logs = await this.getLogs({
        level,
        limit: this.maxLogLines,
        startTime,
        endTime
      });

      if (format === 'json') {
        return JSON.stringify(logs, null, 2);
      } else if (format === 'csv') {
        return this.convertToCSV(logs);
      } else if (format === 'txt') {
        return logs.map(log => log.raw).join('\n');
      } else {
        throw new Error(`Unsupported format: ${format}`);
      }

    } catch (error) {
      console.error('Error exporting logs:', error);
      throw error;
    }
  }

  convertToCSV(logs) {
    const headers = ['timestamp', 'level', 'message'];
    const csvRows = [headers.join(',')];

    for (const log of logs) {
      const row = [
        log.timestamp,
        log.level,
        `"${log.message.replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(','));
    }

    return csvRows.join('\n');
  }

  formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}

// Create singleton instance
const logService = new LogService();

module.exports = {
  getLogs: (options) => logService.getLogs(options),
  getLogStats: () => logService.getLogStats(),
  clearLogs: () => logService.clearLogs(),
  exportLogs: (options) => logService.exportLogs(options),
  getLogFiles: () => logService.getLogFiles()
}; 