/**
 * Logging utility for the Nebula platform
 */

/**
 * Log levels
 */
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

/**
 * Logger class with different log levels and formatting
 */
class Logger {
  constructor(context = 'App') {
    this.context = context;
    this.level = this.getLogLevel();
  }

  /**
   * Get current log level from environment
   * @returns {number} - Log level
   */
  getLogLevel() {
    const envLevel = process.env.LOG_LEVEL?.toLowerCase();
    switch (envLevel) {
      case 'error': return LOG_LEVELS.ERROR;
      case 'warn': return LOG_LEVELS.WARN;
      case 'info': return LOG_LEVELS.INFO;
      case 'debug': return LOG_LEVELS.DEBUG;
      default: return process.env.NODE_ENV === 'development' 
        ? LOG_LEVELS.DEBUG 
        : LOG_LEVELS.INFO;
    }
  }

  /**
   * Format log message with timestamp and context
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   * @returns {Object} - Formatted log object
   */
  formatMessage(level, message, meta = {}) {
    return {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      context: this.context,
      message,
      ...meta
    };
  }

  /**
   * Log error message
   * @param {string} message - Error message
   * @param {Object} meta - Additional metadata
   */
  error(message, meta = {}) {
    if (this.level >= LOG_LEVELS.ERROR) {
      const logData = this.formatMessage('error', message, meta);
      console.error(JSON.stringify(logData, null, 2));
    }
  }

  /**
   * Log warning message
   * @param {string} message - Warning message
   * @param {Object} meta - Additional metadata
   */
  warn(message, meta = {}) {
    if (this.level >= LOG_LEVELS.WARN) {
      const logData = this.formatMessage('warn', message, meta);
      console.warn(JSON.stringify(logData, null, 2));
    }
  }

  /**
   * Log info message
   * @param {string} message - Info message
   * @param {Object} meta - Additional metadata
   */
  info(message, meta = {}) {
    if (this.level >= LOG_LEVELS.INFO) {
      const logData = this.formatMessage('info', message, meta);
      console.info(JSON.stringify(logData, null, 2));
    }
  }

  /**
   * Log debug message
   * @param {string} message - Debug message
   * @param {Object} meta - Additional metadata
   */
  debug(message, meta = {}) {
    if (this.level >= LOG_LEVELS.DEBUG) {
      const logData = this.formatMessage('debug', message, meta);
      console.debug(JSON.stringify(logData, null, 2));
    }
  }

  /**
   * Log GitHub API request
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {number} status - Response status
   * @param {number} duration - Request duration in ms
   */
  logGitHubRequest(method, url, status, duration) {
    this.info('GitHub API Request', {
      method,
      url,
      status,
      duration: `${duration}ms`,
      type: 'github_api'
    });
  }

  /**
   * Log user action
   * @param {string} action - Action performed
   * @param {string} userId - User identifier
   * @param {Object} details - Action details
   */
  logUserAction(action, userId, details = {}) {
    this.info('User Action', {
      action,
      userId,
      details,
      type: 'user_action'
    });
  }

  /**
   * Log performance metric
   * @param {string} operation - Operation name
   * @param {number} duration - Duration in ms
   * @param {Object} meta - Additional metadata
   */
  logPerformance(operation, duration, meta = {}) {
    this.info('Performance Metric', {
      operation,
      duration: `${duration}ms`,
      ...meta,
      type: 'performance'
    });
  }

  /**
   * Create a child logger with additional context
   * @param {Object} childContext - Additional context for child logger
   * @returns {Logger} - Child logger instance
   */
  child(childContext = {}) {
    const childLogger = new Logger(this.context);
    childLogger.childContext = { ...this.childContext, ...childContext };
    
    // Override formatMessage to include child context
    const originalFormatMessage = childLogger.formatMessage.bind(childLogger);
    childLogger.formatMessage = function(level, message, meta = {}) {
      return originalFormatMessage(level, message, { ...this.childContext, ...meta });
    };
    
    return childLogger;
  }
}

/**
 * Create logger instances for different contexts
 */
export const createLogger = (context) => new Logger(context);

/**
 * Default logger instance
 */
export const logger = new Logger('Nebula');

/**
 * Specialized loggers for different parts of the application
 */
export const githubLogger = new Logger('GitHub');
export const authLogger = new Logger('Auth');
export const templateLogger = new Logger('Template');
export const editorLogger = new Logger('Editor');