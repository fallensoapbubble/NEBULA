/**
 * Repository Update Notification
 * Displays notifications about repository updates and provides refresh options
 */

import React, { useState, useCallback, useEffect } from 'react';
import { logger } from '../../lib/logger.js';

/**
 * Main Repository Update Notification Component
 */
export const RepositoryUpdateNotification = ({
  updateStatus = null,
  onRefresh,
  onDismiss,
  onViewChanges,
  isVisible = false,
  position = 'top-right',
  autoHide = false,
  autoHideDelay = 10000
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Auto-hide functionality
  useEffect(() => {
    if (autoHide && isVisible && !isDismissed) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, isVisible, isDismissed, autoHideDelay]);

  const handleRefresh = useCallback(async () => {
    try {
      await onRefresh?.();
      setIsDismissed(true);
      logger.info('Repository refreshed from notification');
    } catch (error) {
      logger.error('Failed to refresh repository from notification:', error);
    }
  }, [onRefresh]);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  const handleViewChanges = useCallback(() => {
    setShowDetails(true);
    onViewChanges?.(updateStatus);
  }, [onViewChanges, updateStatus]);

  if (!isVisible || isDismissed || !updateStatus?.needs_refresh) {
    return null;
  }

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-40 max-w-md`}>
      <div className="bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-lg shadow-lg overflow-hidden">
        <UpdateHeader 
          updateStatus={updateStatus}
          onDismiss={handleDismiss}
        />
        
        <div className="p-4">
          <UpdateContent 
            updateStatus={updateStatus}
            showDetails={showDetails}
            onToggleDetails={() => setShowDetails(!showDetails)}
          />
          
          <UpdateActions
            onRefresh={handleRefresh}
            onViewChanges={handleViewChanges}
            onDismiss={handleDismiss}
            updateStatus={updateStatus}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Update Header Component
 */
const UpdateHeader = ({ updateStatus, onDismiss }) => {
  const getHeaderInfo = () => {
    if (updateStatus.remote_info?.ahead_by > 0) {
      return {
        icon: '🔄',
        title: 'Repository Updates Available',
        className: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
      };
    }
    
    return {
      icon: '📡',
      title: 'Repository Status Check',
      className: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700'
    };
  };

  const headerInfo = getHeaderInfo();

  return (
    <div className={`${headerInfo.className} border-b p-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{headerInfo.icon}</span>
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
            {headerInfo.title}
          </h3>
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          title="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
};

/**
 * Update Content Component
 */
const UpdateContent = ({ updateStatus, showDetails, onToggleDetails }) => {
  const remoteInfo = updateStatus.remote_info;
  const cachedState = updateStatus.cached_state;

  return (
    <div className="space-y-3">
      <UpdateSummary 
        remoteInfo={remoteInfo}
        cachedState={cachedState}
      />
      
      {remoteInfo && (
        <div>
          <button
            onClick={onToggleDetails}
            className="text-blue-500 hover:text-blue-700 text-sm flex items-center gap-1"
          >
            {showDetails ? '▼' : '▶'} 
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
          
          {showDetails && (
            <UpdateDetails 
              remoteInfo={remoteInfo}
              cachedState={cachedState}
            />
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Update Summary Component
 */
const UpdateSummary = ({ remoteInfo, cachedState }) => {
  if (!remoteInfo) {
    return (
      <p className="text-gray-600 dark:text-gray-400 text-sm">
        Checking for repository updates...
      </p>
    );
  }

  const aheadBy = remoteInfo.ahead_by || 0;
  
  return (
    <div className="text-sm">
      <p className="text-gray-700 dark:text-gray-300 mb-2">
        {aheadBy > 0 ? (
          <>
            Your repository has <span className="font-semibold text-blue-600 dark:text-blue-400">
              {aheadBy} new commit{aheadBy !== 1 ? 's' : ''}
            </span> available.
          </>
        ) : (
          'Repository status has been updated.'
        )}
      </p>
      
      {remoteInfo.latest_commit && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Latest: {remoteInfo.latest_commit.commit.message.substring(0, 50)}
          {remoteInfo.latest_commit.commit.message.length > 50 ? '...' : ''}
        </div>
      )}
    </div>
  );
};

/**
 * Update Details Component
 */
const UpdateDetails = ({ remoteInfo, cachedState }) => (
  <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded border text-xs space-y-2">
    {remoteInfo.latest_commit && (
      <div>
        <div className="font-medium text-gray-700 dark:text-gray-300">Latest Commit</div>
        <div className="text-gray-600 dark:text-gray-400">
          <div>SHA: {remoteInfo.latest_commit.sha.substring(0, 8)}</div>
          <div>Author: {remoteInfo.latest_commit.commit.author.name}</div>
          <div>Date: {new Date(remoteInfo.latest_commit.commit.author.date).toLocaleString()}</div>
          <div className="mt-1 p-2 bg-white dark:bg-gray-700 rounded">
            {remoteInfo.latest_commit.commit.message}
          </div>
        </div>
      </div>
    )}
    
    {cachedState && (
      <div>
        <div className="font-medium text-gray-700 dark:text-gray-300">Current State</div>
        <div className="text-gray-600 dark:text-gray-400">
          <div>Cached: {new Date(cachedState.cached_at).toLocaleString()}</div>
          {cachedState.latestCommit && (
            <div>Local SHA: {cachedState.latestCommit.sha.substring(0, 8)}</div>
          )}
        </div>
      </div>
    )}
  </div>
);

/**
 * Update Actions Component
 */
const UpdateActions = ({ onRefresh, onViewChanges, onDismiss, updateStatus }) => {
  const hasUpdates = updateStatus.remote_info?.ahead_by > 0;

  return (
    <div className="flex gap-2 mt-4">
      {hasUpdates && (
        <button
          onClick={onRefresh}
          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm py-2 px-3 rounded font-medium"
        >
          🔄 Refresh Repository
        </button>
      )}
      
      <button
        onClick={onViewChanges}
        className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm py-2 px-3 rounded"
      >
        👁️ View Changes
      </button>
      
      <button
        onClick={onDismiss}
        className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 text-sm py-2 px-3 rounded"
      >
        Later
      </button>
    </div>
  );
};

/**
 * Compact Repository Update Badge
 * A smaller notification for less intrusive updates
 */
export const RepositoryUpdateBadge = ({
  updateStatus,
  onClick,
  className = ''
}) => {
  if (!updateStatus?.needs_refresh) {
    return null;
  }

  const aheadBy = updateStatus.remote_info?.ahead_by || 0;

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors ${className}`}
      title={`${aheadBy} update${aheadBy !== 1 ? 's' : ''} available`}
    >
      <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
      {aheadBy > 0 ? `${aheadBy} update${aheadBy !== 1 ? 's' : ''}` : 'Updates'}
    </button>
  );
};

/**
 * Repository Status Indicator
 * Shows current repository sync status
 */
export const RepositoryStatusIndicator = ({
  updateStatus,
  lastRefresh,
  isRefreshing = false,
  onRefresh,
  className = ''
}) => {
  const getStatusInfo = () => {
    if (isRefreshing) {
      return {
        icon: '🔄',
        text: 'Refreshing...',
        className: 'text-blue-500 animate-spin'
      };
    }

    if (updateStatus?.needs_refresh) {
      const aheadBy = updateStatus.remote_info?.ahead_by || 0;
      return {
        icon: '🔄',
        text: aheadBy > 0 ? `${aheadBy} updates` : 'Updates available',
        className: 'text-amber-500'
      };
    }

    return {
      icon: '✅',
      text: lastRefresh ? `Synced ${formatTimeAgo(lastRefresh)}` : 'Up to date',
      className: 'text-green-500'
    };
  };

  const status = getStatusInfo();

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <span className={status.className}>{status.icon}</span>
      <span className="text-gray-600 dark:text-gray-400">{status.text}</span>
      
      {onRefresh && !isRefreshing && (
        <button
          onClick={onRefresh}
          className="text-blue-500 hover:text-blue-700 ml-1"
          title="Refresh repository"
        >
          🔄
        </button>
      )}
    </div>
  );
};

// Utility function to format time ago
function formatTimeAgo(timestamp) {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now - time;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);

  if (diffSecs < 60) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else {
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    }
  }
}

export default RepositoryUpdateNotification;