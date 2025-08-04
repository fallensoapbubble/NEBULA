/**
 * General utility functions for the Nebula platform
 */

/**
 * Validates if a string is a valid GitHub username
 * @param {string} username - The username to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export function isValidGitHubUsername(username) {
  if (!username || typeof username !== 'string') return false;
  
  // GitHub username rules: 1-39 characters, alphanumeric and hyphens, cannot start/end with hyphen
  const githubUsernameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
  return githubUsernameRegex.test(username);
}

/**
 * Validates if a string is a valid GitHub repository name
 * @param {string} repoName - The repository name to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export function isValidGitHubRepoName(repoName) {
  if (!repoName || typeof repoName !== 'string') return false;
  
  // GitHub repo name rules: 1-100 characters, alphanumeric, hyphens, underscores, periods
  const githubRepoRegex = /^[a-zA-Z0-9._-]{1,100}$/;
  return githubRepoRegex.test(repoName);
}

/**
 * Formats a date to a human-readable string
 * @param {Date|string} date - The date to format
 * @returns {string} - Formatted date string
 */
export function formatDate(date) {
  if (!date) return '';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';
  
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Debounces a function call
 * @param {Function} func - The function to debounce
 * @param {number} wait - The number of milliseconds to delay
 * @returns {Function} - The debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Generates a random string for use as tokens or IDs
 * @param {number} length - The length of the string to generate
 * @returns {string} - Random string
 */
export function generateRandomString(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Safely parses JSON with error handling
 * @param {string} jsonString - The JSON string to parse
 * @param {any} defaultValue - Default value to return on error
 * @returns {any} - Parsed JSON or default value
 */
export function safeJsonParse(jsonString, defaultValue = null) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('Failed to parse JSON:', error.message);
    return defaultValue;
  }
}

/**
 * Truncates text to a specified length with ellipsis
 * @param {string} text - The text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} - Truncated text
 */
export function truncateText(text, maxLength = 100) {
  if (!text || typeof text !== 'string') return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}