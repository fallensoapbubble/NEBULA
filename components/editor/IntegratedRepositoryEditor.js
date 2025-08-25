/**
 * Integrated Repository Editor
 * Combines repository refresh, conflict resolution, and unsaved changes management
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRepositoryRefreshWithAutoSave } from './useRepositoryRefresh.js';
import { useUnsavedChanges } from './UnsavedChangesManager.js';
import { ConflictResolutionInterface } from './ConflictResolutionInterface.js';
import { RepositoryUpdateNotification, RepositoryStatusIndicator } from './RepositoryUpdateNotification.js';
import { DynamicFormGenerator } from './DynamicFormGenerator.js';
import { logger } from '../../lib/logger.js';

/**
 * Main Integrated Repository Editor Component
 */
export const IntegratedRepositoryEditor = ({
  owner,
  repo,
  accessToken,
  portfolioData = {},
  repositoryStructure = {},
  onSave,
  onError,
  className = ''
}) => {
  // State
  const [showConflictResolution, setShowConflictResolution] = useState(false);
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [preservationData, setPreservationData] = useState(null);

  // Repository key for tracking
  const repoKey = useMemo(() => `${owner}/${repo}`, [owner, repo]);

  // Repository refresh hook
  const {
    updateStatus,
    isRefreshing,
    lastRefresh,
    allConflicts,
    unsavedChanges: refreshUnsavedChanges,
    error: refreshError,
    checkForUpdates,
    performRefresh,
    forceRefresh,
    resolveAllConflicts,
    updateUnsavedChanges,
    clearError
  } = useRepositoryRefreshWithAutoSave({
    owner,
    repo,
    accessToken,
    enableAutoRefresh: true,
    autoRefreshInterval: 5 * 60 * 1000, // 5 minutes
    onConflictDetected: handleConflictDetected,
    onRefreshComplete: handleRefreshComplete,
    onError: handleRefreshError
  });

  // Unsaved changes hook
  const {
    changesSummary,
    hasChanges: hasUnsavedChanges,
    setUnsavedChange,
    getUnsavedChanges,
    clearUnsavedChanges,
    preserveChanges,
    restoreChanges
  } = useUnsavedChanges(repoKey, {
    storageKey: `editor_changes_${repoKey}`,
    maxStorageSize: 10 * 1024 * 1024 // 10MB
  });

  // Initialize editor
  useEffect(() => {
    const initializeEditor = async () => {
      try {
        // Check for updates on initialization
        await checkForUpdates();
        
        // Check for preserved changes
        const existingPreservations = preserveChanges();
        if (existingPreservations.hasChanges) {
          setPreservationData(existingPreservations);
        }
        
        setIsEditorReady(true);
        
        logger.info('Repository editor initialized', {
          owner,
          repo,
          hasUnsavedChanges,
          hasPreservedChanges: !!preservationData
        });

      } catch (error) {
        logger.error('Failed to initialize repository editor:', error);
        onError?.(error);
      }
    };

    if (owner && repo && accessToken) {
      initializeEditor();
    }
  }, [owner, repo, accessToken]);

  // Handle conflict detection
  function handleConflictDetected(conflicts, localChanges) {
    logger.warn('Repository conflicts detected', {
      conflictCount: conflicts.length,
      localChangesCount: Object.keys(localChanges).length
    });
    
    setShowConflictResolution(true);
    setShowUpdateNotification(false);
  }

  // Handle refresh completion
  function handleRefreshComplete(refreshResult) {
    logger.info('Repository refresh completed', {
      hasChanges: refreshResult.hasChanges,
      preservedChanges: refreshResult.preserveUnsavedChanges
    });

    // Restore preserved changes if any
    if (preservationData && refreshResult.success) {
      const restored = restoreChanges(preservationData.preservationId, {
        mergeWithCurrent: true
      });
      
      if (restored) {
        setPreservationData(null);
      }
    }

    setShowUpdateNotification(false);
  }

  // Handle refresh errors
  function handleRefreshError(error) {
    logger.error('Repository refresh error:', error);
    onError?.(error);
  }

  // Show update notification when updates are available
  useEffect(() => {
    if (updateStatus?.needs_refresh && !showConflictResolution) {
      setShowUpdateNotification(true);
    }
  }, [updateStatus, showConflictResolution]);

  // Handle data changes in the editor
  const handleDataChange = useCallback((newData, changedFields = {}) => {
    // Update unsaved changes for each changed field
    Object.entries(changedFields).forEach(([fieldPath, value]) => {
      setUnsavedChange(fieldPath, value, {
        field_type: typeof value,
        changed_at: new Date().toISOString()
      });
    });

    // Update repository refresh unsaved changes
    updateUnsavedChanges(changedFields);

    logger.debug('Editor data changed', {
      changedFields: Object.keys(changedFields),
      totalUnsavedChanges: Object.keys(refreshUnsavedChanges).length
    });
  }, [setUnsavedChange, updateUnsavedChanges, refreshUnsavedChanges]);

  // Handle save operation
  const handleSave = useCallback(async (data) => {
    try {
      // Preserve changes before save attempt
      const preservation = preserveChanges();
      
      // Attempt to save
      const result = await onSave?.(data);
      
      if (result?.success) {
        // Clear unsaved changes on successful save
        clearUnsavedChanges();
        
        // Clear preservation data
        if (preservation.hasChanges) {
          // The preservation will be cleaned up automatically
        }
        
        logger.info('Repository content saved successfully');
      }
      
      return result;

    } catch (error) {
      logger.error('Failed to save repository content:', error);
      throw error;
    }
  }, [onSave, preserveChanges, clearUnsavedChanges]);

  // Handle conflict resolution
  const handleConflictResolution = useCallback(async (resolutionData) => {
    try {
      setShowConflictResolution(false);
      
      // Preserve current changes before resolution
      const preservation = preserveChanges();
      setPreservationData(preservation);
      
      // Resolve conflicts
      const result = await resolveAllConflicts(resolutionData);
      
      if (result?.success) {
        logger.info('Conflicts resolved successfully');
      }
      
      return result;

    } catch (error) {
      logger.error('Failed to resolve conflicts:', error);
      setShowConflictResolution(true); // Show again on error
      throw error;
    }
  }, [resolveAllConflicts, preserveChanges]);

  // Handle repository refresh
  const handleRepositoryRefresh = useCallback(async (options = {}) => {
    try {
      // Preserve changes before refresh
      const preservation = preserveChanges();
      setPreservationData(preservation);
      
      // Perform refresh
      const result = await performRefresh({
        preserveUnsavedChanges: true,
        ...options
      });
      
      return result;

    } catch (error) {
      logger.error('Failed to refresh repository:', error);
      throw error;
    }
  }, [performRefresh, preserveChanges]);

  // Handle force refresh
  const handleForceRefresh = useCallback(async () => {
    try {
      const result = await forceRefresh();
      
      // Clear all unsaved changes on force refresh
      clearUnsavedChanges();
      setPreservationData(null);
      
      return result;

    } catch (error) {
      logger.error('Failed to force refresh repository:', error);
      throw error;
    }
  }, [forceRefresh, clearUnsavedChanges]);

  if (!isEditorReady) {
    return (
      <div className={`repository-editor-loading ${className}`}>
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Initializing repository editor...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`integrated-repository-editor ${className}`}>
      {/* Repository Status Bar */}
      <RepositoryStatusBar
        owner={owner}
        repo={repo}
        updateStatus={updateStatus}
        isRefreshing={isRefreshing}
        lastRefresh={lastRefresh}
        hasUnsavedChanges={hasUnsavedChanges}
        changesSummary={changesSummary}
        onRefresh={handleRepositoryRefresh}
        onForceRefresh={handleForceRefresh}
        error={refreshError}
        onClearError={clearError}
      />

      {/* Main Editor */}
      <div className="editor-content">
        <DynamicFormGenerator
          portfolioData={portfolioData}
          repositoryStructure={repositoryStructure}
          onDataChange={handleDataChange}
          onSave={handleSave}
          autoSave={true}
          isLoading={isRefreshing}
        />
      </div>

      {/* Conflict Resolution Interface */}
      <ConflictResolutionInterface
        conflicts={allConflicts}
        localChanges={refreshUnsavedChanges}
        remoteChanges={{}} // Would be populated from refresh service
        onResolve={handleConflictResolution}
        onCancel={() => setShowConflictResolution(false)}
        onRefresh={handleRepositoryRefresh}
        isVisible={showConflictResolution}
        repositoryInfo={{ name: `${owner}/${repo}` }}
      />

      {/* Update Notification */}
      <RepositoryUpdateNotification
        updateStatus={updateStatus}
        onRefresh={handleRepositoryRefresh}
        onDismiss={() => setShowUpdateNotification(false)}
        onViewChanges={() => setShowConflictResolution(true)}
        isVisible={showUpdateNotification}
        position="top-right"
        autoHide={false}
      />

      {/* Preservation Notification */}
      {preservationData && (
        <PreservationNotification
          preservationData={preservationData}
          onRestore={() => {
            const restored = restoreChanges(preservationData.preservationId);
            if (restored) {
              setPreservationData(null);
            }
          }}
          onDiscard={() => setPreservationData(null)}
        />
      )}
    </div>
  );
};

/**
 * Repository Status Bar Component
 */
const RepositoryStatusBar = ({
  owner,
  repo,
  updateStatus,
  isRefreshing,
  lastRefresh,
  hasUnsavedChanges,
  changesSummary,
  onRefresh,
  onForceRefresh,
  error,
  onClearError
}) => (
  <div className="repository-status-bar bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="repository-info">
          <span className="font-medium text-gray-800 dark:text-gray-200">
            {owner}/{repo}
          </span>
        </div>
        
        <RepositoryStatusIndicator
          updateStatus={updateStatus}
          lastRefresh={lastRefresh}
          isRefreshing={isRefreshing}
          onRefresh={onRefresh}
        />
        
        {hasUnsavedChanges && changesSummary && (
          <div className="unsaved-changes-indicator flex items-center gap-2 text-sm">
            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
            <span className="text-amber-600 dark:text-amber-400">
              {changesSummary.fileCount} unsaved change{changesSummary.fileCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        {error && (
          <div className="error-indicator flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <span>⚠️</span>
            <span>{error}</span>
            <button
              onClick={onClearError}
              className="text-red-500 hover:text-red-700 ml-1"
            >
              ×
            </button>
          </div>
        )}
        
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded text-sm"
          title="Refresh repository"
        >
          {isRefreshing ? '🔄' : '↻'} Refresh
        </button>
        
        <button
          onClick={onForceRefresh}
          disabled={isRefreshing}
          className="px-3 py-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white rounded text-sm"
          title="Force refresh (discards unsaved changes)"
        >
          Force Refresh
        </button>
      </div>
    </div>
  </div>
);

/**
 * Preservation Notification Component
 */
const PreservationNotification = ({
  preservationData,
  onRestore,
  onDiscard
}) => (
  <div className="fixed bottom-4 left-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 shadow-lg max-w-md">
    <div className="flex items-start gap-3">
      <span className="text-blue-500 text-lg">💾</span>
      <div className="flex-1">
        <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">
          Changes Preserved
        </h4>
        <p className="text-sm text-blue-600 dark:text-blue-300 mb-3">
          {preservationData.fileCount} file{preservationData.fileCount !== 1 ? 's' : ''} with 
          unsaved changes were preserved during the repository refresh.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onRestore}
            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
          >
            Restore Changes
          </button>
          <button
            onClick={onDiscard}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-sm"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default IntegratedRepositoryEditor;