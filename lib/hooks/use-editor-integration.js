/**
 * Editor Integration Hook
 * React hook for integrated editor functionality with repository management and live updates
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

/**
 * Custom hook for editor integration
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {object} options - Hook options
 * @returns {object} Hook state and methods
 */
export function useEditorIntegration(owner, repo, options = {}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // State
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [editorData, setEditorData] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [conflicts, setConflicts] = useState(null);
  const [saveHistory, setSaveHistory] = useState([]);

  // Options with defaults - memoized to prevent unnecessary re-renders
  const config = useMemo(() => ({
    enableLivePreview: true,
    enableAutoSync: true,
    conflictResolution: 'prompt',
    autoSaveInterval: 2000,
    maxRetries: 3,
    ...options
  }), [options]);

  // Refs
  const autoSaveTimeoutRef = useRef(null);
  const retryCountRef = useRef(0);

  /**
   * Initialize editor with integrated services
   */
  const initialize = useCallback(async () => {
    if (!owner || !repo || status !== 'authenticated' || !session?.accessToken) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/editor/integration?owner=${owner}&repo=${repo}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to initialize editor');
      }

      setEditorData(result.data);
      setSyncStatus(result.data.syncStatus);
      setIsInitialized(true);
      retryCountRef.current = 0;

    } catch (error) {
      console.error('Editor initialization failed:', error);
      setError(error.message);
      
      // Retry logic
      if (retryCountRef.current < config.maxRetries) {
        retryCountRef.current++;
        setTimeout(() => initialize(), 1000 * retryCountRef.current);
      }
    } finally {
      setIsLoading(false);
    }
  }, [owner, repo, session, status, config.maxRetries]);

  /**
   * Save content with integrated repository management
   */
  const saveContent = useCallback(async (portfolioData, saveOptions = {}) => {
    if (!isInitialized || isSaving) {
      return { success: false, error: 'Editor not ready for saving' };
    }

    setIsSaving(true);
    setError(null);
    setConflicts(null);

    try {
      const response = await fetch('/api/editor/integration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          owner,
          repo,
          portfolioData,
          options: {
            ...config,
            ...saveOptions
          }
        })
      });

      const result = await response.json();

      if (response.status === 409) {
        // Handle conflicts
        setConflicts(result.conflicts);
        return {
          success: false,
          error: result.error,
          conflicts: result.conflicts,
          requiresResolution: true
        };
      }

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save content');
      }

      // Update local state
      setEditorData(prev => ({
        ...prev,
        portfolioData,
        commit: result.data.commit
      }));

      // Add to save history
      setSaveHistory(prev => [
        {
          timestamp: new Date().toISOString(),
          commitSha: result.data.commit?.sha,
          message: saveOptions.commitMessage || 'Portfolio updated',
          filesChanged: result.data.filesChanged
        },
        ...prev.slice(0, 9) // Keep last 10 saves
      ]);

      return {
        success: true,
        data: result.data,
        feedback: result.feedback
      };

    } catch (error) {
      console.error('Save failed:', error);
      setError(error.message);
      
      return {
        success: false,
        error: error.message
      };
    } finally {
      setIsSaving(false);
    }
  }, [owner, repo, isInitialized, isSaving, config]);

  /**
   * Auto-save functionality
   */
  const scheduleAutoSave = useCallback((portfolioData) => {
    if (!config.enableAutoSync || !portfolioData) {
      return;
    }

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Schedule new auto-save
    autoSaveTimeoutRef.current = setTimeout(() => {
      saveContent(portfolioData, {
        commitMessage: `Auto-save: ${new Date().toISOString()}`,
        validateBeforeSave: false,
        createBackup: false
      });
    }, config.autoSaveInterval);
  }, [config.enableAutoSync, config.autoSaveInterval, saveContent]);

  /**
   * Navigate between editor and portfolio views
   */
  const navigate = useCallback(async (mode, navOptions = {}) => {
    try {
      const response = await fetch('/api/editor/integration', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          owner,
          repo,
          mode,
          options: navOptions
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Navigation failed');
      }

      // Handle navigation based on mode
      if (mode === 'repository') {
        // External navigation to GitHub
        window.open(result.data.url, '_blank');
      } else {
        // Internal navigation
        router.push(result.data.url);
      }

      return {
        success: true,
        url: result.data.url
      };

    } catch (error) {
      console.error('Navigation failed:', error);
      setError(error.message);
      
      return {
        success: false,
        error: error.message
      };
    }
  }, [owner, repo, router]);

  /**
   * Resolve conflicts
   */
  const resolveConflicts = useCallback(async (resolution, manualResolutions = {}) => {
    if (!conflicts) {
      return { success: false, error: 'No conflicts to resolve' };
    }

    try {
      // This would call a conflict resolution API
      // For now, we'll clear conflicts and retry save
      setConflicts(null);
      
      return {
        success: true,
        message: 'Conflicts resolved'
      };

    } catch (error) {
      console.error('Conflict resolution failed:', error);
      setError(error.message);
      
      return {
        success: false,
        error: error.message
      };
    }
  }, [conflicts]);

  /**
   * Refresh editor data
   */
  const refresh = useCallback(async () => {
    await initialize();
  }, [initialize]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Clear conflicts
   */
  const clearConflicts = useCallback(() => {
    setConflicts(null);
  }, []);

  // Initialize on mount and when dependencies change
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Cleanup auto-save timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    isInitialized,
    isLoading,
    isSaving,
    error,
    editorData,
    syncStatus,
    conflicts,
    saveHistory,

    // Methods
    saveContent,
    scheduleAutoSave,
    navigate,
    resolveConflicts,
    refresh,
    clearError,
    clearConflicts,

    // Computed values
    canSave: isInitialized && !isSaving && !error,
    hasUnsavedChanges: false, // This would be computed based on local vs saved state
    portfolioUrl: editorData ? `/${owner}/${repo}` : null,
    repositoryUrl: editorData ? `https://github.com/${owner}/${repo}` : null,

    // Configuration
    config
  };
}

/**
 * Hook for editor navigation
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {object} Navigation methods
 */
export function useEditorNavigation(owner, repo) {
  const router = useRouter();

  const navigateToEditor = useCallback(() => {
    router.push(`/editor/${owner}/${repo}`);
  }, [owner, repo, router]);

  const navigateToPortfolio = useCallback(() => {
    router.push(`/${owner}/${repo}`);
  }, [owner, repo, router]);

  const navigateToRepository = useCallback(() => {
    window.open(`https://github.com/${owner}/${repo}`, '_blank');
  }, [owner, repo]);

  return {
    navigateToEditor,
    navigateToPortfolio,
    navigateToRepository,
    
    // URL generators
    editorUrl: `/editor/${owner}/${repo}`,
    portfolioUrl: `/${owner}/${repo}`,
    repositoryUrl: `https://github.com/${owner}/${repo}`
  };
}

/**
 * Hook for live preview functionality
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {object} portfolioData - Current portfolio data
 * @returns {object} Live preview state and methods
 */
export function useLivePreview(owner, repo, portfolioData) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const openPreview = useCallback(() => {
    const url = `/${owner}/${repo}`;
    setPreviewUrl(url);
    setIsPreviewOpen(true);
    window.open(url, '_blank');
  }, [owner, repo]);

  const closePreview = useCallback(() => {
    setIsPreviewOpen(false);
  }, []);

  const refreshPreview = useCallback(() => {
    if (isPreviewOpen && previewUrl) {
      // This would trigger a refresh of the preview window
      // In practice, this might use postMessage or WebSocket
      console.log('Refreshing preview:', previewUrl);
    }
  }, [isPreviewOpen, previewUrl]);

  // Auto-refresh preview when portfolio data changes
  useEffect(() => {
    if (portfolioData && isPreviewOpen) {
      const timeoutId = setTimeout(refreshPreview, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [portfolioData, isPreviewOpen, refreshPreview]);

  return {
    previewUrl,
    isPreviewOpen,
    openPreview,
    closePreview,
    refreshPreview
  };
}