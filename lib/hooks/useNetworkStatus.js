/**
 * Network Status React Hooks
 * React hooks for network status management
 */

'use client';

import React from 'react';
import { networkManager, NETWORK_STATUS } from '../network-manager.js';

/**
 * React hook for network status
 */
export function useNetworkStatus() {
  const [status, setStatus] = React.useState(networkManager.getNetworkStatus());
  const [isOnline, setIsOnline] = React.useState(networkManager.isOnline());

  React.useEffect(() => {
    const unsubscribe = networkManager.addStatusListener((newStatus) => {
      setStatus(newStatus);
      setIsOnline(networkManager.isOnline());
    });

    return unsubscribe;
  }, []);

  return {
    status,
    isOnline,
    isOffline: !isOnline,
    isSlow: status === NETWORK_STATUS.SLOW
  };
}

/**
 * React hook for enhanced fetch with network management
 */
export function useEnhancedFetch() {
  const networkStatus = useNetworkStatus();

  const fetchWithRetry = React.useCallback(async (url, options = {}) => {
    return networkManager.fetch(url, options);
  }, []);

  return {
    fetch: fetchWithRetry,
    networkStatus
  };
}