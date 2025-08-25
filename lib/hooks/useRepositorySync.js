/**
 * Repository Synchronization Hook
 * Manages conflict detection and resolution in React components
 */

import { useState, useCallback, useRef } from 'react';
import { logger } from '../logger.js';

export function useRepositorySync(owner, repo) {
  const [conflicts, setConflicts] = useState([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [lastKnownSha, setLastKnownSha] = useState(null);
  const [resolutionStrategy, setResolutionStrategy] = useState(null);
  
  // Store unsaved changes to preserve them during conflicts
  const unsavedChanges = useRef({});

  /**
   * Check for conflicts before saving
   */
  const checkForConflicts = useCallback(async (files = []) => {
    if (!owner || !repo) return { hasConflicts: false };

    setIsChecking(true);
    try {
      const params = new URLSearchParams();
      if (lastKnownSha) {
        params.append('lastKnownSha', lastKnownSha);
      }
      if (files.length > 0) {
        params.append('files', JSON.stringify(files));
      }

      const response = await fetch(
        `/api/repositories/${owner}/${repo}/conflicts?${params}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const hasConflicts = data.conflicts && data.conflicts.length > 0;
      
      if (hasConflicts) {
        setConflicts(data.conflicts);
        setResolutionStrategy(data.resolutionStrategy);
      } else {
        // Update last known SHA if no conflicts
        if (data.remoteChanges?.latestSha) {
          setLastKnownSha(data.remoteChanges.latestSha);
        }
      }

      return {
        hasConflicts,
        remoteChanges: data.remoteChanges,
        conflicts: data.conflicts,
        resolutionStrategy: data.resolutionStrategy,
      };

    } catch (error) {
      logger.error('Error checking for conflicts:', error);
      throw new Error(`Failed to check for conflicts: ${error.message}`);
    } finally {
      setIsChecking(false);
    }
  }, [owner, repo, lastKnownSha]);

  /**
   * Resolve conflicts using selected strategy
   */
  const resolveConflicts = useCallback(async (strategy) => {
    if (!conflicts.length) return { success: true };

    setIsResolving(true);
    try {
      const response = await fetch(
        `/api/repositories/${owner}/${repo}/conflicts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            strategy,
            conflicts,
            userChanges: unsavedChanges.current,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      // Clear conflicts after successful resolution
      if (result.success) {
        setConflicts([]);
        setResolutionStrategy(null);
        
        // Update last known SHA if provided
        if (result.latestSha) {
          setLastKnownSha(result.latestSha);
        }
      }

      return result;

    } catch (error) {
      logger.error('Error resolving conflicts:', error);
      throw new Error(`Failed to resolve conflicts: ${error.message}`);
    } finally {
      setIsResolving(false);
    }
  }, [owner, repo, conflicts]);

  /**
   * Store unsaved changes to preserve them during conflicts
   */
  const preserveUnsavedChanges = useCallback((changes) => {
    unsavedChanges.current = { ...unsavedChanges.current, ...changes };
  }, []);

  /**
   * Clear preserved unsaved changes
   */
  const clearUnsavedChanges = useCallback(() => {
    unsavedChanges.current = {};
  }, []);

  /**
   * Get preserved unsaved changes
   */
  const getUnsavedChanges = useCallback(() => {
    return unsavedChanges.current;
  }, []);

  /**
   * Dismiss conflicts (user chooses to ignore them)
   */
  const dismissConflicts = useCallback(() => {
    setConflicts([]);
    setResolutionStrategy(null);
  }, []);

  /**
   * Refresh repository state
   */
  const refreshRepository = useCallback(async () => {
    try {
      const result = await checkForConflicts();
      return result;
    } catch (error) {
      logger.error('Error refreshing repository:', error);
      throw error;
    }
  }, [checkForConflicts]);

  /**
   * Initialize sync with repository SHA
   */
  const initializeSync = useCallback((sha) => {
    setLastKnownSha(sha);
  }, []);

  return {
    // State
    conflicts,
    isChecking,
    isResolving,
    lastKnownSha,
    resolutionStrategy,
    hasConflicts: conflicts.length > 0,
    
    // Actions
    checkForConflicts,
    resolveConflicts,
    preserveUnsavedChanges,
    clearUnsavedChanges,
    getUnsavedChanges,
    dismissConflicts,
    refreshRepository,
    initializeSync,
  };
}

export default useRepositorySync;