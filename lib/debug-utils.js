/**
 * Debug Utilities
 * Helps track down common JavaScript errors in development
 */

'use client';

import { createLogger } from './logger.js';

const logger = createLogger('DebugUtils');

/**
 * Initialize error tracking for development
 */
export function initializeErrorTracking() {
  if (typeof window === 'undefined' || process.env.NODE_ENV !== 'development') {
    return;
  }

  // Track unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled Promise Rejection', {
      reason: event.reason,
      promise: event.promise
    });
    
    // Don't prevent default to allow browser to show the error
    // event.preventDefault();
  });

  // Track general JavaScript errors
  window.addEventListener('error', (event) => {
    // Filter out common browser extension errors
    if (isExtensionError(event)) {
      logger.debug('Browser extension error (filtered)', {
        message: event.message,
        filename: event.filename
      });
      return;
    }

    logger.error('JavaScript Error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
  });

  // Track resource loading errors
  window.addEventListener('error', (event) => {
    if (event.target !== window) {
      logger.error('Resource Loading Error', {
        tagName: event.target.tagName,
        src: event.target.src || event.target.href,
        message: 'Failed to load resource'
      });
    }
  }, true);

  // Monitor for media element errors (play/pause issues)
  document.addEventListener('play', (event) => {
    if (event.target.tagName === 'VIDEO' || event.target.tagName === 'AUDIO') {
      logger.debug('Media play event', {
        tagName: event.target.tagName,
        src: event.target.src
      });
    }
  }, true);

  document.addEventListener('pause', (event) => {
    if (event.target.tagName === 'VIDEO' || event.target.tagName === 'AUDIO') {
      logger.debug('Media pause event', {
        tagName: event.target.tagName,
        src: event.target.src
      });
    }
  }, true);

  logger.info('Error tracking initialized for development');
}

/**
 * Check if error is likely from a browser extension
 */
function isExtensionError(event) {
  const message = event.message || '';
  const filename = event.filename || '';
  
  // Common patterns for extension errors
  const extensionPatterns = [
    /chrome-extension:/,
    /moz-extension:/,
    /safari-extension:/,
    /content.*script/i,
    /Could not establish connection/i,
    /Receiving end does not exist/i,
    /Extension context invalidated/i,
    /content-all\.js/,
    /content_script/i
  ];

  return extensionPatterns.some(pattern => 
    pattern.test(message) || pattern.test(filename)
  );
}

/**
 * Safe DOM query with error handling
 */
export function safeQuerySelector(selector, context = document) {
  try {
    if (!context || typeof context.querySelector !== 'function') {
      logger.warn('Invalid context for querySelector', { selector, context });
      return null;
    }
    return context.querySelector(selector);
  } catch (error) {
    logger.error('Error in querySelector', { selector, error: error.message });
    return null;
  }
}

/**
 * Safe DOM query all with error handling
 */
export function safeQuerySelectorAll(selector, context = document) {
  try {
    if (!context || typeof context.querySelectorAll !== 'function') {
      logger.warn('Invalid context for querySelectorAll', { selector, context });
      return [];
    }
    return Array.from(context.querySelectorAll(selector));
  } catch (error) {
    logger.error('Error in querySelectorAll', { selector, error: error.message });
    return [];
  }
}

/**
 * Safe event listener addition
 */
export function safeAddEventListener(element, event, handler, options = {}) {
  try {
    if (!element || typeof element.addEventListener !== 'function') {
      logger.warn('Invalid element for addEventListener', { element, event });
      return () => {};
    }

    element.addEventListener(event, handler, options);
    
    // Return cleanup function
    return () => {
      try {
        element.removeEventListener(event, handler, options);
      } catch (error) {
        logger.error('Error removing event listener', { event, error: error.message });
      }
    };
  } catch (error) {
    logger.error('Error adding event listener', { event, error: error.message });
    return () => {};
  }
}

/**
 * Check if we're in a browser environment
 */
export function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Check if service workers are supported
 */
export function isServiceWorkerSupported() {
  return isBrowser() && 'serviceWorker' in navigator;
}

/**
 * Get browser information for debugging
 */
export function getBrowserInfo() {
  if (!isBrowser()) {
    return { userAgent: 'Server-side', browser: 'unknown' };
  }

  const userAgent = navigator.userAgent;
  let browser = 'unknown';

  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';

  return {
    userAgent,
    browser,
    language: navigator.language,
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine
  };
}

/**
 * Log environment information
 */
export function logEnvironmentInfo() {
  if (!isBrowser()) return;

  const browserInfo = getBrowserInfo();
  const serviceWorkerSupported = isServiceWorkerSupported();
  
  logger.info('Environment Information', {
    ...browserInfo,
    serviceWorkerSupported,
    nodeEnv: process.env.NODE_ENV,
    nextEnv: process.env.NEXT_PUBLIC_VERCEL_ENV || 'development'
  });
}