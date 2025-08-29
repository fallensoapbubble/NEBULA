/**
 * Offline Status Component
 * Displays network status and provides offline functionality
 */

'use client';

import React from 'react';

import { useState, useEffect } from 'react';
import { useNetworkStatus } from '../../lib/hooks/useNetworkStatus.js';
import { networkManager } from '../../lib/network-manager.js';
import { useServiceWorker } from '../../lib/service-worker-manager.js';

export function OfflineStatusBanner() {
  const { isOffline, status, isSlow } = useNetworkStatus();
  const [showBanner, setShowBanner] = useState(false);
  const [queuedRequests, setQueuedRequests] = useState(0);

  useEffect(() => {
    // Show banner when offline or slow
    setShowBanner(isOffline || isSlow);
    
    // Update queued requests count
    if (isOffline) {
      setQueuedRequests(networkManager.requestQueue.length);
    } else {
      setQueuedRequests(0);
    }
  }, [isOffline, isSlow]);

  if (!showBanner) return null;

  const handleRetry = () => {
    if (!isOffline) {
      networkManager.processQueuedRequests();
    }
    window.location.reload();
  };

  const handleDismiss = () => {
    setShowBanner(false);
  };

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 ${
      isOffline ? 'bg-red-500/90' : 'bg-yellow-500/90'
    } backdrop-blur-sm text-white`}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Status Icon */}
            <div className="flex-shrink-0">
              {isOffline ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              )}
            </div>

            {/* Status Message */}
            <div>
              <p className="font-medium text-sm">
                {isOffline ? 'You\'re offline' : 'Slow connection detected'}
              </p>
              <p className="text-xs opacity-90">
                {isOffline 
                  ? `${queuedRequests > 0 ? `${queuedRequests} requests queued. ` : ''}Some features may not be available.`
                  : 'Some features may load slowly.'
                }
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {!isOffline && queuedRequests > 0 && (
              <button
                onClick={handleRetry}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-xs font-medium transition-colors"
              >
                Retry ({queuedRequests})
              </button>
            )}
            
            <button
              onClick={handleRetry}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-xs font-medium transition-colors"
            >
              Refresh
            </button>
            
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NetworkStatusIndicator({ showLabel = true, className = '' }) {
  const { status, isOnline, isSlow } = useNetworkStatus();

  const getStatusConfig = () => {
    if (!isOnline) {
      return {
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728" />
          </svg>
        ),
        label: 'Offline'
      };
    }

    if (isSlow) {
      return {
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        ),
        label: 'Slow'
      };
    }

    return {
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      label: 'Online'
    };
  };

  const config = getStatusConfig();

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`p-1 rounded-full ${config.bgColor}`}>
        <div className={config.color}>
          {config.icon}
        </div>
      </div>
      {showLabel && (
        <span className={`text-sm ${config.color}`}>
          {config.label}
        </span>
      )}
    </div>
  );
}

export function OfflineCapabilities() {
  const { isOffline } = useNetworkStatus();
  const { status: swStatus } = useServiceWorker();
  const [cacheStats, setCacheStats] = useState(null);

  useEffect(() => {
    // Get cache statistics
    if (swStatus === 'active') {
      networkManager.getCacheStats().then(stats => {
        setCacheStats(stats);
      }).catch(error => {
        console.error('Failed to get cache stats', error);
      });
    }
  }, [swStatus]);

  if (!isOffline) return null;

  return (
    <div className="glass-card p-4 border-l-4 border-blue-500 bg-blue-500/10">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-1">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <div className="flex-1">
          <h3 className="text-blue-100 font-medium mb-2">
            Offline Mode Active
          </h3>
          
          <div className="text-blue-200 text-sm space-y-2">
            <p>You can still:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>View cached pages and content</li>
              <li>Edit content (changes will sync when online)</li>
              <li>Browse previously loaded templates</li>
              <li>Access offline documentation</li>
            </ul>
            
            {cacheStats && (
              <div className="mt-3 pt-3 border-t border-blue-400/20">
                <p className="text-xs text-blue-300">
                  Cached items: {cacheStats.size} | 
                  Storage: {Math.round(cacheStats.totalSize / 1024)}KB
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function RetryFailedRequests() {
  const { isOnline } = useNetworkStatus();
  const [failedRequests, setFailedRequests] = useState([]);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    // Update failed requests count
    setFailedRequests(networkManager.requestQueue);
  }, [isOnline]);

  if (!isOnline || failedRequests.length === 0) return null;

  const handleRetryAll = async () => {
    setRetrying(true);
    try {
      await networkManager.processQueuedRequests();
      setFailedRequests([]);
    } catch (error) {
      console.error('Failed to retry requests', error);
    } finally {
      setRetrying(false);
    }
  };

  const handleDismiss = () => {
    setFailedRequests([]);
  };

  return (
    <div className="glass-card p-4 border-l-4 border-yellow-500 bg-yellow-500/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <div>
            <p className="text-yellow-100 font-medium">
              Connection Restored
            </p>
            <p className="text-yellow-200 text-sm">
              {failedRequests.length} request{failedRequests.length !== 1 ? 's' : ''} failed while offline
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleRetryAll}
            disabled={retrying}
            className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white text-sm rounded font-medium transition-colors"
          >
            {retrying ? 'Retrying...' : 'Retry All'}
          </button>
          
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-yellow-500/20 rounded transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OfflineStatus() {
  return (
    <>
      <OfflineStatusBanner />
      <div className="space-y-4">
        <OfflineCapabilities />
        <RetryFailedRequests />
      </div>
    </>
  );
}