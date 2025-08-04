/**
 * Application constants for the Nebula platform
 */

// GitHub API Configuration
export const GITHUB_API = {
  BASE_URL: 'https://api.github.com',
  SCOPES: ['public_repo', 'repo'],
  RATE_LIMIT: {
    REQUESTS_PER_HOUR: 5000,
    REQUESTS_PER_MINUTE: 100
  }
};

// Application Routes
export const ROUTES = {
  HOME: '/',
  GALLERY: '/gallery',
  EDITOR: '/editor',
  AUTH: {
    SIGNIN: '/auth/signin',
    SIGNOUT: '/auth/signout',
    CALLBACK: '/api/auth/callback/github'
  },
  API: {
    GITHUB: '/api/github',
    REPOSITORIES: '/api/repositories',
    TEMPLATES: '/api/templates'
  }
};

// Template Configuration
export const TEMPLATE = {
  CONFIG_FILE: '.nebula/config.json',
  PREVIEW_IMAGE: '.nebula/preview.png',
  SUPPORTED_TYPES: ['json', 'markdown', 'hybrid'],
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp']
};

// Error Messages
export const ERROR_MESSAGES = {
  GITHUB: {
    UNAUTHORIZED: 'GitHub authentication required',
    FORBIDDEN: 'Insufficient permissions to access this repository',
    NOT_FOUND: 'Repository not found',
    RATE_LIMITED: 'GitHub API rate limit exceeded',
    NETWORK_ERROR: 'Failed to connect to GitHub'
  },
  TEMPLATE: {
    INVALID_CONFIG: 'Invalid template configuration',
    MISSING_FILES: 'Required template files are missing',
    UNSUPPORTED_TYPE: 'Unsupported template type'
  },
  VALIDATION: {
    INVALID_USERNAME: 'Invalid GitHub username',
    INVALID_REPO_NAME: 'Invalid repository name',
    REQUIRED_FIELD: 'This field is required'
  }
};

// UI Configuration
export const UI = {
  SIDEBAR_WIDTH: 280,
  HEADER_HEIGHT: 64,
  BREAKPOINTS: {
    SM: 640,
    MD: 768,
    LG: 1024,
    XL: 1280
  },
  ANIMATION: {
    DURATION: {
      FAST: 150,
      NORMAL: 300,
      SLOW: 500
    },
    EASING: 'cubic-bezier(0.4, 0, 0.2, 1)'
  }
};

// Local Storage Keys
export const STORAGE_KEYS = {
  THEME: 'nebula_theme',
  SIDEBAR_COLLAPSED: 'nebula_sidebar_collapsed',
  RECENT_REPOSITORIES: 'nebula_recent_repos',
  DRAFT_CONTENT: 'nebula_draft_content'
};