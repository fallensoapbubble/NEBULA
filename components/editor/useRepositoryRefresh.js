/**
 * Repository Refresh Hook
 * Provides repository refresh functionality with conflict detection and UI integration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { RepositoryRefreshService } from '../../lib/repository-refresh-service.js';
import { logger } from '../../lib/logger.js';

/**
 * Main repository refresh hook
 */
export function useRepositoryRefresh(config = {}) {
  const {
    owner,
    repo,
    accessToken,
    autoRefreshInterval = 5 * 60 * 1000, // 5 minutes
    enableAutoRefresh = true,
    onConflictDetected,
    onRefreshComplete,
    onError
  } = config;

  // State
  const [refreshService, setRefreshService] = useState(null);
  const [updateStatus, setUpdateStatus] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [unsavedChanges, setUnsavedChanges] = useState({});
  const [error, setError] = useState(null);

  // Refs
  const autoRefreshTimer = useRef(null);
  const configRef = useRef(config);

  // Update config ref
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Initialize refresh service
  useEffect(() => {
    if (accessToken) {
      const service = new RepositoryRefreshService(accessToken);
      setRefreshService(service);

      // Setup refresh callback
      if (owner && repo) {
        const repoKey = `${owner}/${repo}`;
        service.onRefresh(repoKey, handleRefreshEvent);

        return () => {
          service.offRefresh(repoKey, handleRefreshEvent);
        };
      }
    }
  }, [accessToken, owner, repo]);

  // Handle refresh events from service
  const handleRefreshEvent = useCallback((refreshResult) => {
    if (refreshResult.success) {
      setUpdateStatus(null); // Clear update status after successful refresh
      setLastRefresh(new Date());
      setError(null);
      
      configRef.current.onRefreshComplete?.(refreshResult);
      
      logger.info('Repository refresh completed', {
        owner: configRef.current.owner,
        repo: configRef.current.repo,
        hasChanges: refreshResult.hasChanges
      });
    } else {
      setError(refreshResult.error);
      configRef.current.onError?.(refreshResult.error);
    }
    
    setIsRefreshing(false);
  }, []);

  // Auto-refresh functionality
  useEffect(() => {
    if (enableAutoRefresh && refreshService && owner && repo) {
      const startAutoRefresh = () => {
        if (autoRefreshTimer.current) {
          clearInterval(autoRefreshTimer.current);
        }

        autoRefreshTimer.current = setInterval(async () => {
          try {
            await checkForUpdates();
          } catch (error) {
            logger.warn('Auto-refresh check failed:', error);
          }
        }, autoRefreshInterval);
      };

      startAutoRefresh();

      return () => {
        if (autoRefreshTimer.current) {
          clearInterval(autoRefreshTimer.current);
        }
      };
    }
  }, [enableAutoRefresh, refreshService, owner, repo, autoRefreshInterval]);

  // Check for repository updates
  const checkForUpdates = useCallback(async () => {
    if (!refreshService || !owner || !repo) {
      return null;
    }

    try {
      const status = await refreshService.getUpdateStatus(owner, repo);
      setUpdateStatus(status);
      return status;
    } catch (error) {
      logger.error('Failed to check for updates:', error);
      setError(error.message);
      return null;
    }
  }, [refreshService, owner, repo]);

  // Perform repository refresh
  const performRefresh = useCallback(async (options = {}) => {
    if (!refreshService || !owner || !repo || isRefreshing) {
      return null;
    }

    setIsRefreshing(true);
    setError(null);

    try {
      const refreshOptions = {
        preserveUnsavedChanges: true,
        forceRefresh: false,
        notifyCallbacks: true,
        ...options
      };

      // Check for conflicts before refresh if we have unsaved changes
      if (Object.keys(unsavedChanges).length > 0 && !options.forceRefresh) {
        const cachedState = refreshService.getCachedState(owner, repo);
        if (cachedState) {
          const comparison = await refreshService.compareWithRemote(cachedState, owner, repo);
          
          if (comparison.needs_update) {
            // Detect conflicts with unsaved changes
            const detectedConflicts = detectConflicts(
              unsavedChanges,
              comparison.comparison,
              comparison.remoteState
            );

            if (detectedConflicts.length > 0) {
              setConflicts(detectedConflicts);
              configRef.current.onConflictDetected?.(detectedConflicts, unsavedChanges);
              setIsRefreshing(false);
              return { success: false, conflicts: detectedConflicts };
            }
          }
        }
      }

      const result = await refreshService.performFullRefresh(owner, repo, refreshOptions);
      
      // Clear unsaved changes if refresh was successful and not preserving
      if (result.success && !refreshOptions.preserveUnsavedChanges) {
        setUnsavedChanges({});
      }

      return result;

    } catch (error) {
      logger.error('Repository refresh failed:', error);
      setError(error.message);
      setIsRefreshing(false);
      throw error;
    }
  }, [refreshService, owner, repo, isRefreshing, unsavedChanges]);

  // Force refresh (ignoring conflicts)
  const forceRefresh = useCallback(async () => {
    return performRefresh({ 
      forceRefresh: true, 
      preserveUnsavedChanges: false 
    });
  }, [performRefresh]);

  // Resolve conflicts
  const resolveConflicts = useCallback(async (resolutionData) => {
    if (!refreshService || conflicts.length === 0) {
      return null;
    }

    try {
      setIsRefreshing(true);
      
      // Apply conflict resolution
      const resolvedChanges = applyConflictResolution(
        unsavedChanges,
        conflicts,
        resolutionData
      );

      // Update unsaved changes based on resolution
      if (resolutionData.preserveLocalChanges) {
        setUnsavedChanges(resolvedChanges);
      } else {
        setUnsavedChanges({});
      }

      // Clear conflicts
      setConflicts([]);

      // Perform refresh with resolved state
      const refreshOptions = {
        preserveUnsavedChanges: resolutionData.preserveLocalChanges,
        forceRefresh: resolutionData.strategy === 'overwrite'
      };

      const result = await refreshService.performFullRefresh(owner, repo, refreshOptions);
      
      logger.info('Conflicts resolved and repository refreshed', {
        strategy: resolutionData.strategy,
        conflictCount: conflicts.length
      });

      return result;

    } catch (error) {
      logger.error('Failed to resolve conflicts:', error);
      setError(error.message);
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshService, conflicts, unsavedChanges, owner, repo]);

  // Update unsaved changes
  const updateUnsavedChanges = useCallback((changes) => {
    setUnsavedChanges(prev => ({
      ...prev,
      ...changes
    }));
  }, []);

  // Clear unsaved changes
  const clearUnsavedChanges = useCallback((paths = null) => {
    if (paths) {
      setUnsavedChanges(prev => {
        const updated = { ...prev };
        paths.forEach(path => delete updated[path]);
        return updated;
      });
    } else {
      setUnsavedChanges({});
    }
  }, []);

  // Get repository state
  const getRepositoryState = useCallback(() => {
    if (!refreshService || !owner || !repo) {
      return null;
    }
    
    return refreshService.getCachedState(owner, repo);
  }, [refreshService, owner, repo]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    updateStatus,
    isRefreshing,
    lastRefresh,
    conflicts,
    unsavedChanges,
    error,
    
    // Actions
    checkForUpdates,
    performRefresh,
    forceRefresh,
    resolveConflicts,
    updateUnsavedChanges,
    clearUnsavedChanges,
    clearError,
    
    // Getters
    getRepositoryState,
    
    // Service
    refreshService
  };
}

/**
 * Detect conflicts between unsaved changes and remote changes
 */
function detectConflicts(unsavedChanges, comparison, remoteState) {
  const conflicts = [];
  
  // Check for file conflicts
  comparison.files_changed?.forEach(fileChange => {
    if (unsavedChanges[fileChange.path]) {
      conflicts.push({
        id: `file_${fileChange.path}`,
        type: 'file',
        path: fileChange.path,
        description: `File has both local and remote changes`,
        localSha: fileChange.local_sha,
        remoteSha: fileChange.remote_sha
      });
    }
  });

  // Check for new files that conflict with unsaved changes
  comparison.new_files?.forEach(newFile => {
    if (unsavedChanges[newFile.path]) {
      conflicts.push({
        id: `new_file_${newFile.path}`,
        type: 'file',
        path: newFile.path,
        description: `New remote file conflicts with local changes`,
        remoteSha: newFile.sha
      });
    }
  });

  // Check for deleted files that have unsaved changes
  comparison.deleted_files?.forEach(deletedFile => {
    if (unsavedChanges[deletedFile.path]) {
      conflicts.push({
        id: `deleted_file_${deletedFile.path}`,
        type: 'file',
        path: deletedFile.path,
        description: `File was deleted remotely but has local changes`,
        localSha: deletedFile.sha
      });
    }
  });

  return conflicts;
}

/**
 * Apply conflict resolution to unsaved changes
 */
function applyConflictResolution(unsavedChanges, conflicts, resolutionData) {
  const resolvedChanges = { ...unsavedChanges };

  conflicts.forEach(conflict => {
    const resolution = resolutionData.conflicts[conflict.id];
    
    switch (resolution) {
      case 'local':
        // Keep local changes (no action needed)
        break;
        
      case 'remote':
        // Remove local changes for this file
        delete resolvedChanges[conflict.path];
        break;
        
      case 'manual':
        // Manual resolution would need to be handled by the UI
        // For now, keep local changes
        break;
        
      default:
        // Apply strategy-based resolution
        if (resolutionData.strategy === 'refresh') {
          delete resolvedChanges[conflict.path];
        }
        // 'merge' and 'overwrite' keep local changes
        break;
    }
  });

  return resolvedChanges;
}

/**
 * Hook for repository refresh with auto-save integration
 */
export function useRepositoryRefreshWithAutoSave(config = {}) {
  const refreshHook = useRepositoryRefresh(config);
  const [autoSaveConflicts, setAutoSaveConflicts] = useState([]);

  // Handle auto-save conflicts
  const handleAutoSaveConflict = useCallback((conflictData) => {
    setAutoSaveConflicts(conflictData.conflicts);
    
    // Merge with refresh conflicts
    refreshHook.setConflicts?.(prev => [
      ...prev,
      ...conflictData.conflicts.map(c => ({
        ...c,
        source: 'auto_save'
      }))
    ]);
  }, [refreshHook]);

  // Enhanced conflict resolution that handles auto-save conflicts
  const resolveAllConflicts = useCallback(async (resolutionData) => {
    try {
      // Clear auto-save conflicts
      setAutoSaveConflicts([]);
      
      // Resolve refresh conflicts
      return await refreshHook.resolveConflicts(resolutionData);
    } catch (error) {
      logger.error('Failed to resolve all conflicts:', error);
      throw error;
    }
  }, [refreshHook]);

  return {
    ...refreshHook,
    autoSaveConflicts,
    handleAutoSaveConflict,
    resolveAllConflicts,
    allConflicts: [...refreshHook.conflicts, ...autoSaveConflicts]
  };
}

export default useRepositoryRefresh;