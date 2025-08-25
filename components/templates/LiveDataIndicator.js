/**
 * Live Data Indicator Component
 * Shows real-time status of GitHub data fetching for template previews
 */

import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from '../ui/Loading.js';

/**
 * LiveDataIndicator - Shows the status of live data fetching
 */
export const LiveDataIndicator = ({ 
  isLoading, 
  portfolioData, 
  repository, 
  lastUpdated,
  mode = 'live',
  onRefresh 
}) => {
  const [showDetails, setShowDetails] = useState(false);

  // Get data file information
  const dataFiles = portfolioData ? Object.keys(portfolioData) : [];
  const hasData = dataFiles.length > 0;

  return (
    <div className="live-data-indicator">
      <div className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
        <div className="flex items-center space-x-3">
          {/* Status indicator */}
          <div className="flex items-center space-x-2">
            {isLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <div className={`w-2 h-2 rounded-full ${
                mode === 'live' && hasData 
                  ? 'bg-green-500 animate-pulse' 
                  : mode === 'sample' 
                    ? 'bg-blue-500' 
                    : 'bg-gray-400'
              }`} />
            )}
            
            <span className="text-sm font-medium text-text-1">
              {isLoading 
                ? 'Fetching data...' 
                : mode === 'live' 
                  ? 'Live GitHub Data' 
                  : 'Sample Data'
              }
            </span>
          </div>

          {/* Data summary */}
          {!isLoading && hasData && (
            <div className="text-xs text-text-3">
              {dataFiles.length} file{dataFiles.length !== 1 ? 's' : ''} loaded
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Last updated */}
          {lastUpdated && (
            <span className="text-xs text-text-3">
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}

          {/* Details toggle */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
          >
            {showDetails ? 'Hide' : 'Details'}
          </button>

          {/* Refresh button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="text-xs text-primary-400 hover:text-primary-300 transition-colors disabled:opacity-50"
            >
              <svg 
                className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Detailed information */}
      {showDetails && (
        <div className="mt-2 p-3 bg-surface-1 rounded-lg border border-border">
          <div className="space-y-2">
            {/* Repository info */}
            {repository && (
              <div className="text-xs">
                <span className="text-text-3">Repository:</span>
                <span className="text-text-2 font-mono ml-2">{repository.full_name}</span>
                {repository.private && (
                  <span className="ml-2 px-1 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">
                    Private
                  </span>
                )}
              </div>
            )}

            {/* Data files */}
            {hasData && (
              <div className="text-xs">
                <span className="text-text-3">Data files:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {dataFiles.map((file) => (
                    <span
                      key={file}
                      className="px-2 py-1 bg-primary-100 text-primary-800 rounded text-xs font-mono"
                    >
                      {file}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Data source explanation */}
            <div className="text-xs text-text-3">
              {mode === 'live' 
                ? 'Data is fetched directly from the GitHub repository in real-time.'
                : 'Using sample data to demonstrate template layout and features.'
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveDataIndicator;