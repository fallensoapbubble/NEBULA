/**
 * Main exports for the lib directory
 */

// Configuration
export { config, validateConfig, getConfigForEnv } from './config.js';

// Constants
export * from './constants.js';

// Utilities
export * from './utils.js';

// Error handling
export * from './errors.js';

// Logging
export { logger, createLogger, githubLogger, authLogger, templateLogger, editorLogger } from './logger.js';

// Placeholder exports for future modules
export * from './github.js';
export * from './auth.js';