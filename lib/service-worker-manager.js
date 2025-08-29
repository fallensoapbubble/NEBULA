/**
 * Service Worker Manager
 * Handles service worker registration, updates, and communication
 */

'use client';

import React, { useState, useEffect } from 'react';
import { createLogger } from './logger.js';

const logger = createLogger('ServiceWorkerManager');

export class ServiceWorkerManager {
  constructor() {
    this.registration = null;
    this.isSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator;
    this.updateAvailable = false;
    this.listeners = new Set();
  }

  /**
   * Register service worker
   */
  async register() {
    if (!this.isSupported) {
      logger.warn('Service Worker not supported in this browser');
      return null;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      logger.info('Service Worker registered successfully');

      // Listen for updates
      this.registration.addEventListener('updatefound', () => {
        this.handleUpdateFound();
      });

      // Listen for controller changes
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        logger.info('Service Worker controller changed');
        this.notifyListeners('controllerchange');
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleMessage(event);
      });

      return this.registration;
    } catch (error) {
      logger.error('Service Worker registration failed', error);
      throw error;
    }
  }

  /**
   * Handle service worker update found
   */
  handleUpdateFound() {
    const newWorker = this.registration.installing;
    
    if (!newWorker) return;

    logger.info('New Service Worker found, installing...');

    newWorker.addEventListener('statechange', () => {
      switch (newWorker.state) {
        case 'installed':
          if (navigator.serviceWorker.controller) {
            // New update available
            this.updateAvailable = true;
            logger.info('New Service Worker installed, update available');
            this.notifyListeners('updateavailable', { registration: this.registration });
          } else {
            // First install
            logger.info('Service Worker installed for the first time');
            this.notifyListeners('installed');
          }
          break;
          
        case 'activated':
          logger.info('Service Worker activated');
          this.notifyListeners('activated');
          break;
          
        case 'redundant':
          logger.warn('Service Worker became redundant');
          break;
      }
    });
  }

  /**
   * Handle messages from service worker
   */
  handleMessage(event) {
    const { type, data } = event.data;
    
    logger.debug('Message from Service Worker', { type, data });
    
    switch (type) {
      case 'REQUEST_RETRY_SUCCESS':
        this.notifyListeners('retrySuccess', { url: data.url });
        break;
        
      case 'CACHE_UPDATED':
        this.notifyListeners('cacheUpdated', data);
        break;
        
      default:
        this.notifyListeners('message', { type, data });
    }
  }

  /**
   * Skip waiting and activate new service worker
   */
  async skipWaiting() {
    if (!this.registration || !this.registration.waiting) {
      return;
    }

    // Send skip waiting message
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    
    // Wait for controller change
    return new Promise((resolve) => {
      const handleControllerChange = () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        resolve();
      };
      
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    });
  }

  /**
   * Cache specific URLs
   */
  async cacheUrls(urls) {
    if (!this.registration || !this.registration.active) {
      throw new Error('Service Worker not active');
    }

    return this.sendMessage({
      type: 'CACHE_URLS',
      data: { urls }
    });
  }

  /**
   * Clear cache
   */
  async clearCache(cacheName = null) {
    if (!this.registration || !this.registration.active) {
      throw new Error('Service Worker not active');
    }

    return this.sendMessage({
      type: 'CLEAR_CACHE',
      data: { cacheName }
    });
  }

  /**
   * Get cache status
   */
  async getCacheStatus() {
    if (!this.registration || !this.registration.active) {
      throw new Error('Service Worker not active');
    }

    return this.sendMessage({
      type: 'GET_CACHE_STATUS'
    });
  }

  /**
   * Send message to service worker
   */
  async sendMessage(message) {
    if (!this.registration || !this.registration.active) {
      throw new Error('Service Worker not active');
    }

    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data);
        }
      };

      this.registration.active.postMessage(message, [messageChannel.port2]);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        reject(new Error('Service Worker message timeout'));
      }, 10000);
    });
  }

  /**
   * Add event listener
   */
  addEventListener(type, listener) {
    this.listeners.add({ type, listener });
    return () => this.listeners.delete({ type, listener });
  }

  /**
   * Notify listeners
   */
  notifyListeners(type, data = null) {
    this.listeners.forEach(({ type: listenerType, listener }) => {
      if (listenerType === type) {
        try {
          listener(data);
        } catch (error) {
          logger.error('Error in service worker listener', error);
        }
      }
    });
  }

  /**
   * Unregister service worker
   */
  async unregister() {
    if (!this.registration) {
      return false;
    }

    try {
      const result = await this.registration.unregister();
      logger.info('Service Worker unregistered');
      return result;
    } catch (error) {
      logger.error('Failed to unregister Service Worker', error);
      throw error;
    }
  }

  /**
   * Check if update is available
   */
  isUpdateAvailable() {
    return this.updateAvailable;
  }

  /**
   * Get registration status
   */
  getStatus() {
    if (!this.isSupported) {
      return 'unsupported';
    }

    if (!this.registration) {
      return 'unregistered';
    }

    if (this.registration.installing) {
      return 'installing';
    }

    if (this.registration.waiting) {
      return 'waiting';
    }

    if (this.registration.active) {
      return 'active';
    }

    return 'unknown';
  }
}

// Global service worker manager instance
export const serviceWorkerManager = new ServiceWorkerManager();

/**
 * React hook for service worker management
 */
export function useServiceWorker() {
  const [status, setStatus] = useState(serviceWorkerManager.getStatus());
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Register service worker
    serviceWorkerManager.register().catch(error => {
      console.error('Failed to register service worker', error);
    });

    // Listen for updates
    const unsubscribeUpdate = serviceWorkerManager.addEventListener('updateavailable', () => {
      setUpdateAvailable(true);
    });

    const unsubscribeInstalled = serviceWorkerManager.addEventListener('installed', () => {
      setStatus(serviceWorkerManager.getStatus());
    });

    const unsubscribeActivated = serviceWorkerManager.addEventListener('activated', () => {
      setStatus(serviceWorkerManager.getStatus());
    });

    return () => {
      unsubscribeUpdate();
      unsubscribeInstalled();
      unsubscribeActivated();
    };
  }, []);

  const skipWaiting = React.useCallback(async () => {
    try {
      await serviceWorkerManager.skipWaiting();
      setUpdateAvailable(false);
      window.location.reload();
    } catch (error) {
      console.error('Failed to skip waiting', error);
    }
  }, []);

  const clearCache = React.useCallback(async (cacheName) => {
    try {
      await serviceWorkerManager.clearCache(cacheName);
    } catch (error) {
      console.error('Failed to clear cache', error);
    }
  }, []);

  return {
    status,
    updateAvailable,
    skipWaiting,
    clearCache,
    isSupported: serviceWorkerManager.isSupported
  };
}

/**
 * Service Worker Update Banner Component
 */
export function ServiceWorkerUpdateBanner({ className = '' }) {
  const { updateAvailable, skipWaiting } = useServiceWorker();

  if (!updateAvailable) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 bg-blue-500/90 backdrop-blur-sm text-white text-center py-3 z-50 ${className}`}>
      <div className="flex items-center justify-center space-x-4">
        <span className="text-sm font-medium">
          A new version is available!
        </span>
        <button
          onClick={skipWaiting}
          className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-sm font-medium transition-colors"
        >
          Update Now
        </button>
      </div>
    </div>
  );
}

// Auto-register service worker in browser environment
if (typeof window !== 'undefined') {
  // Register on page load
  window.addEventListener('load', () => {
    serviceWorkerManager.register().catch(error => {
      logger.error('Failed to register service worker on load', error);
    });
  });
}