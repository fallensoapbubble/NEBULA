/**
 * useTemplatePreview Hook
 * Custom hook for managing template preview functionality
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '../../lib/logger.js';

/**
 * Custom hook for template preview management
 * @param {Object} options - Hook options
 * @param {string} options.templateId - Template ID to preview
 * @param {string} options.mode - Preview mode ('live' or 'sample')
 * @param {boolean} options.autoLoad - Whether to auto-load preview on mount
 * @returns {Object} Preview state and methods
 */
export const useTemplatePreview = ({
  templateId = null,
  mode = 'live',
  autoLoad = true
} = {}) => {
  const [previewData, setPreviewData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const abortControllerRef = useRef(null);
  const previewLogger = logger.child({ hook: 'useTemplatePreview' });

  /**
   * Loads preview data for a template
   */
  const loadPreview = useCallback(async (targetTemplateId = templateId, targetMode = mode) => {
    if (!targetTemplateId) {
      setPreviewData(null);
      setError(null);
      return;
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      previewLogger.info('Loading template preview', { 
        templateId: targetTemplateId,
        mode: targetMode 
      });

      const [owner, repo] = targetTemplateId.split('/');
      if (!owner || !repo) {
        throw new Error('Invalid template ID format');
      }

      const useSample = targetMode === 'sample';
      
      const response = await fetch(
        `/api/templates/${owner}/${repo}/preview?sample=${useSample}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: abortControllerRef.current.signal
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to load preview');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Preview generation failed');
      }

      setPreviewData(result.data);
      setLastUpdated(new Date());
      
      previewLogger.info('Template preview loaded successfully', { 
        templateId: targetTemplateId,
        dataFiles: Object.keys(result.data.portfolioData || {}).length
      });

    } catch (err) {
      if (err.name === 'AbortError') {
        previewLogger.debug('Preview request aborted', { templateId: targetTemplateId });
        return;
      }

      previewLogger.error('Failed to load template preview', { 
        templateId: targetTemplateId,
        error: err.message 
      });
      
      setError(err.message);
      setPreviewData(null);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [templateId, mode, previewLogger]);

  /**
   * Refreshes the current preview
   */
  const refreshPreview = useCallback(() => {
    if (templateId) {
      loadPreview(templateId, mode);
    }
  }, [templateId, mode, loadPreview]);

  /**
   * Clears preview data and error state
   */
  const clearPreview = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setPreviewData(null);
    setError(null);
    setIsLoading(false);
    setLastUpdated(null);
  }, []);

  /**
   * Changes preview mode and reloads
   */
  const changeMode = useCallback((newMode) => {
    if (templateId && newMode !== mode) {
      loadPreview(templateId, newMode);
    }
  }, [templateId, mode, loadPreview]);

  // Auto-load preview when templateId or mode changes
  useEffect(() => {
    if (autoLoad && templateId) {
      loadPreview(templateId, mode);
    }
    
    // Cleanup on unmount or templateId change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [templateId, mode, autoLoad, loadPreview]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // State
    previewData,
    isLoading,
    error,
    lastUpdated,
    
    // Methods
    loadPreview,
    refreshPreview,
    clearPreview,
    changeMode,
    
    // Computed values
    hasData: Boolean(previewData),
    hasError: Boolean(error),
    isEmpty: !previewData && !isLoading && !error,
    
    // Template info (if available)
    template: previewData?.template || null,
    portfolioData: previewData?.portfolioData || null,
    repository: previewData?.repository || null
  };
};

/**
 * Hook for managing multiple template previews
 * @param {string[]} templateIds - Array of template IDs
 * @param {Object} options - Hook options
 * @returns {Object} Multiple preview states and methods
 */
export const useMultipleTemplatePreviews = (templateIds = [], options = {}) => {
  const [previews, setPreviews] = useState({});
  const [loadingStates, setLoadingStates] = useState({});
  const [errors, setErrors] = useState({});

  const previewLogger = logger.child({ hook: 'useMultipleTemplatePreviews' });

  /**
   * Loads preview for a specific template
   */
  const loadPreview = useCallback(async (templateId, mode = 'live') => {
    if (!templateId) return;

    setLoadingStates(prev => ({ ...prev, [templateId]: true }));
    setErrors(prev => ({ ...prev, [templateId]: null }));

    try {
      const [owner, repo] = templateId.split('/');
      if (!owner || !repo) {
        throw new Error('Invalid template ID format');
      }

      const useSample = mode === 'sample';
      
      const response = await fetch(
        `/api/templates/${owner}/${repo}/preview?sample=${useSample}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to load preview');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Preview generation failed');
      }

      setPreviews(prev => ({ ...prev, [templateId]: result.data }));
      
      previewLogger.info('Template preview loaded', { templateId });

    } catch (err) {
      previewLogger.error('Failed to load template preview', { 
        templateId,
        error: err.message 
      });
      
      setErrors(prev => ({ ...prev, [templateId]: err.message }));
    } finally {
      setLoadingStates(prev => ({ ...prev, [templateId]: false }));
    }
  }, [previewLogger]);

  /**
   * Loads all template previews
   */
  const loadAllPreviews = useCallback(async (mode = 'live') => {
    const promises = templateIds.map(id => loadPreview(id, mode));
    await Promise.allSettled(promises);
  }, [templateIds, loadPreview]);

  /**
   * Gets preview data for a specific template
   */
  const getPreview = useCallback((templateId) => {
    return {
      data: previews[templateId] || null,
      isLoading: loadingStates[templateId] || false,
      error: errors[templateId] || null,
      hasData: Boolean(previews[templateId]),
      hasError: Boolean(errors[templateId])
    };
  }, [previews, loadingStates, errors]);

  /**
   * Clears all preview data
   */
  const clearAllPreviews = useCallback(() => {
    setPreviews({});
    setLoadingStates({});
    setErrors({});
  }, []);

  // Load previews when templateIds change
  useEffect(() => {
    if (templateIds.length > 0 && options.autoLoad !== false) {
      loadAllPreviews(options.mode || 'live');
    }
  }, [templateIds, loadAllPreviews, options.autoLoad, options.mode]);

  return {
    // State
    previews,
    loadingStates,
    errors,
    
    // Methods
    loadPreview,
    loadAllPreviews,
    getPreview,
    clearAllPreviews,
    
    // Computed values
    isAnyLoading: Object.values(loadingStates).some(Boolean),
    hasAnyError: Object.values(errors).some(Boolean),
    loadedCount: Object.keys(previews).length,
    totalCount: templateIds.length
  };
};

export default useTemplatePreview;