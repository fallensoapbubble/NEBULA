/**
 * Offline Page
 * Displayed when users are offline and requested page is not cached
 */

'use client';

import React from 'react';

import { useEffect, useState } from 'react';
import { useNetworkStatus } from '../../../lib/network-manager.js';

export default function OfflinePage() {
  const { isOnline, status } = useNetworkStatus();
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Redirect to home when back online
    if (isOnline && retryCount > 0) {
      window.location.href = '/';
    }
  }, [isOnline, retryCount]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="glass-card max-w-md w-full p-8 text-center">
        {/* Offline Icon */}
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
            <svg 
              className="w-10 h-10 text-red-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728" 
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white mb-4">
          You&apos;re Offline
        </h1>

        {/* Description */}
        <p className="text-gray-300 mb-6">
          This page isn&apos;t available offline. Please check your internet connection and try again.
        </p>

        {/* Network Status */}
        <div className="mb-6 p-3 bg-gray-800/50 rounded-lg">
          <div className="flex items-center justify-center text-sm">
            <div className={`w-2 h-2 rounded-full mr-2 ${
              isOnline ? 'bg-green-400' : 'bg-red-400'
            }`} />
            <span className="text-gray-300">
              Status: {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleRetry}
            className="w-full glass-button px-4 py-2 text-white font-medium rounded-lg hover:bg-white/10 transition-colors"
          >
            Try Again
          </button>
          
          <button
            onClick={handleGoHome}
            className="w-full px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Go to Home
          </button>
        </div>

        {/* Tips */}
        <div className="mt-8 text-left">
          <h3 className="text-sm font-medium text-gray-300 mb-2">
            Troubleshooting Tips:
          </h3>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• Check your internet connection</li>
            <li>• Try switching to a different network</li>
            <li>• Refresh the page when connection is restored</li>
            <li>• Some content may be available from cache</li>
          </ul>
        </div>

        {/* Retry Counter */}
        {retryCount > 0 && (
          <div className="mt-4 text-xs text-gray-500">
            Retry attempts: {retryCount}
          </div>
        )}
      </div>
    </div>
  );
}