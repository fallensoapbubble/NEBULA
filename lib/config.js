/**
 * Application configuration for the Nebula platform
 */

/**
 * Get environment variable with optional default value
 * @param {string} key - Environment variable key
 * @param {string} defaultValue - Default value if not found
 * @returns {string} - Environment variable value
 */
function getEnvVar(key, defaultValue = '') {
  return process.env[key] || defaultValue;
}

/**
 * Application configuration object
 */
export const config = {
  // Environment
  env: getEnvVar('NODE_ENV', 'development'),
  isDevelopment: getEnvVar('NODE_ENV') === 'development',
  isProduction: getEnvVar('NODE_ENV') === 'production',

  // Server configuration
  port: parseInt(getEnvVar('PORT', '3000'), 10),
  host: getEnvVar('HOST', 'localhost'),

  // GitHub OAuth configuration
  github: {
    clientId: getEnvVar('GITHUB_CLIENT_ID'),
    clientSecret: getEnvVar('GITHUB_CLIENT_SECRET'),
    apiUrl: getEnvVar('GITHUB_API_URL', 'https://api.github.com'),
    scopes: getEnvVar('GITHUB_OAUTH_SCOPES', 'public_repo,repo').split(',').map(s => s.trim())
  },

  // NextAuth configuration
  nextAuth: {
    url: getEnvVar('NEXTAUTH_URL', 'https://nebulaus.netlify.app'),
    secret: getEnvVar('NEXTAUTH_SECRET'),
  },

  // Application URLs
  urls: {
    base: getEnvVar('NEXTAUTH_URL', 'https://nebulaus.netlify.app'),
    api: getEnvVar('NEXTAUTH_URL', 'https://nebulaus.netlify.app') + '/api'
  },

  // Logging configuration
  logging: {
    level: getEnvVar('LOG_LEVEL', 'info')
  },

  // Rate limiting
  rateLimiting: {
    github: {
      requestsPerHour: 5000,
      requestsPerMinute: 100
    }
  },

  // File upload limits
  upload: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp']
  }
};

/**
 * Validate required configuration
 */
export function validateConfig() {
  const requiredVars = [
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
    'NEXTAUTH_SECRET'
  ];

  const missing = requiredVars.filter(key => !getEnvVar(key));
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env.local file and ensure all required variables are set.'
    );
  }
}

/**
 * Get configuration for specific environment
 * @param {string} env - Environment name
 * @returns {Object} - Environment-specific configuration
 */
export function getConfigForEnv(env = config.env) {
  const baseConfig = { ...config };

  switch (env) {
    case 'development':
      return {
        ...baseConfig,
        logging: { level: 'debug' }
      };
    
    case 'production':
      return {
        ...baseConfig,
        logging: { level: 'info' }
      };
    
    default:
      return baseConfig;
  }
}