// lib/logger.ts
// Centralized logging utility to replace console statements

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
  context?: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  private log(level: LogLevel, message: string, data?: any, context?: string) {
    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      context,
    };

    // Store in memory for debugging (limited to prevent memory leaks)
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output in development only
    if (this.isDevelopment) {
      const prefix = context ? `[${context}]` : '';
      const logMessage = `${prefix} ${message}`;

      switch (level) {
        case 'debug':
          console.debug(logMessage, data);
          break;
        case 'info':
          console.info(logMessage, data);
          break;
        case 'warn':
          console.warn(logMessage, data);
          break;
        case 'error':
          console.error(logMessage, data);
          break;
      }
    }

    // In production, we could send to a logging service
    // TODO: Implement production logging (e.g., to file, remote service)
  }

  debug(message: string, data?: any, context?: string) {
    this.log('debug', message, data, context);
  }

  info(message: string, data?: any, context?: string) {
    this.log('info', message, data, context);
  }

  warn(message: string, data?: any, context?: string) {
    this.log('warn', message, data, context);
  }

  error(message: string, data?: any, context?: string) {
    this.log('error', message, data, context);
  }

  // Get recent logs for debugging
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
  }
}

// Create singleton instance
export const logger = new Logger();

// Convenience functions for common contexts
export const dbLogger = {
  debug: (message: string, data?: any) => logger.debug(message, data, 'Database'),
  info: (message: string, data?: any) => logger.info(message, data, 'Database'),
  warn: (message: string, data?: any) => logger.warn(message, data, 'Database'),
  error: (message: string, data?: any) => logger.error(message, data, 'Database'),
};

export const uiLogger = {
  debug: (message: string, data?: any) => logger.debug(message, data, 'UI'),
  info: (message: string, data?: any) => logger.info(message, data, 'UI'),
  warn: (message: string, data?: any) => logger.warn(message, data, 'UI'),
  error: (message: string, data?: any) => logger.error(message, data, 'UI'),
};

export const authLogger = {
  debug: (message: string, data?: any) => logger.debug(message, data, 'Auth'),
  info: (message: string, data?: any) => logger.info(message, data, 'Auth'),
  warn: (message: string, data?: any) => logger.warn(message, data, 'Auth'),
  error: (message: string, data?: any) => logger.error(message, data, 'Auth'),
};

export const apiLogger = {
  debug: (message: string, data?: any) => logger.debug(message, data, 'API'),
  info: (message: string, data?: any) => logger.info(message, data, 'API'),
  warn: (message: string, data?: any) => logger.warn(message, data, 'API'),
  error: (message: string, data?: any) => logger.error(message, data, 'API'),
};

// Export types
export type { LogLevel, LogEntry };