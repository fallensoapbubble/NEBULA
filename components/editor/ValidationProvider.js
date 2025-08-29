/**
 * Validation Provider
 * Provides real-time validation context for the editor
 * Implements task 8.3: Real-Time Validation + Preview
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useEditor } from './EditorContext.js';
import { useRealTimeValidation } from './RealTimeValidator.js';
import { useLivePreview } from './LivePreview.js';

// Validation Context
const ValidationContext = createContext();

/**
 * Validation Provider Component
 * Manages validation state and provides validation methods
 */
export function ValidationProvider({ children, owner, repo }) {
  const { state: editorState, dispatch: editorDispatch } = useEditor();
  const [portfolioData, setPortfolioData] = useState(null);
  const [validationEnabled, setValidationEnabled] = useState(true);
  const [previewEnabled, setPreviewEnabled] = useState(true);

  // Initialize real-time validation
  const {
    validationState,
    isValidating,
    validationHistory,
    performFullValidation,
    validateFieldWithFeedback,
    getFieldStatus,
    getValidationSummary,
    clearValidation,
    isValid,
    hasErrors,
    hasWarnings,
    completeness
  } = useRealTimeValidation(portfolioData, {
    strictMode: false,
    validateOnChange: true,
    debounceMs: 500,
    showSuggestions: true,
    trackHistory: true
  });

  // Initialize live preview
  const {
    previewData,
    isLoading: previewLoading,
    error: previewError,
    previewMode,
    isPreviewOpen,
    lastUpdate,
    updatePreview,
    openPreview,
    closePreview,
    togglePreviewMode,
    refreshPreview,
    canPreview,
    previewUrl
  } = useLivePreview(owner, repo, portfolioData, {
    updateDelay: 1000,
    autoUpdate: true,
    enableModeToggle: true,
    showPreviewControls: true
  });

  /**
   * Extract portfolio data from editor content
   */
  const extractPortfolioData = useCallback((contentFiles) => {
    try {
      // Look for data.json or similar content files
      const dataFile = contentFiles['data.json'] || contentFiles['portfolio.json'];
      if (dataFile && dataFile.content) {
        const data = typeof dataFile.content === 'string' 
          ? JSON.parse(dataFile.content)
          : dataFile.content;
        return data;
      }

      // If no JSON file, try to construct from markdown files
      const markdownFiles = Object.entries(contentFiles).filter(([path]) => 
        path.endsWith('.md') || path.endsWith('.markdown')
      );

      if (markdownFiles.length > 0) {
        // Basic portfolio structure from markdown
        return {
          personal: {
            name: 'Portfolio Owner',
            title: 'Professional'
          },
          sections: markdownFiles.map(([path, file]) => ({
            title: path.replace(/\.(md|markdown)$/, '').replace(/[-_]/g, ' '),
            content: file.content,
            type: 'markdown'
          }))
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to extract portfolio data:', error);
      return null;
    }
  }, []);

  /**
   * Update portfolio data when editor content changes
   */
  useEffect(() => {
    if (editorState.content.files && Object.keys(editorState.content.files).length > 0) {
      const data = extractPortfolioData(editorState.content.files);
      setPortfolioData(data);
    }
  }, [editorState.content.files, extractPortfolioData]);

  /**
   * Validate specific field
   */
  const validateField = useCallback(async (fieldPath, value) => {
    if (!validationEnabled) return { isValid: true, errors: [], warnings: [], suggestions: [] };
    
    return await validateFieldWithFeedback(fieldPath, value, portfolioData);
  }, [validateFieldWithFeedback, portfolioData, validationEnabled]);

  /**
   * Validate all content
   */
  const validateAll = useCallback(async () => {
    if (!validationEnabled || !portfolioData) return null;
    
    return await performFullValidation(portfolioData);
  }, [performFullValidation, portfolioData, validationEnabled]);

  /**
   * Get validation status for a field
   */
  const getFieldValidationStatus = useCallback((fieldPath) => {
    if (!validationEnabled) return null;
    
    return getFieldStatus(fieldPath);
  }, [getFieldStatus, validationEnabled]);

  /**
   * Get overall validation summary
   */
  const getOverallValidationSummary = useCallback(() => {
    if (!validationEnabled) return null;
    
    return getValidationSummary();
  }, [getValidationSummary, validationEnabled]);

  /**
   * Toggle validation on/off
   */
  const toggleValidation = useCallback(() => {
    setValidationEnabled(prev => !prev);
    if (!validationEnabled) {
      clearValidation();
    }
  }, [validationEnabled, clearValidation]);

  /**
   * Toggle preview on/off
   */
  const togglePreview = useCallback(() => {
    setPreviewEnabled(prev => !prev);
  }, []);

  /**
   * Update preview manually
   */
  const updatePreviewManually = useCallback(() => {
    if (previewEnabled && portfolioData) {
      updatePreview(portfolioData, true);
    }
  }, [updatePreview, portfolioData, previewEnabled]);

  // Context value
  const contextValue = {
    // Validation state
    validationState,
    isValidating,
    validationHistory,
    isValid,
    hasErrors,
    hasWarnings,
    completeness,
    validationEnabled,

    // Validation methods
    validateField,
    validateAll,
    getFieldValidationStatus,
    getOverallValidationSummary,
    clearValidation,
    toggleValidation,

    // Preview state
    previewData,
    previewLoading,
    previewError,
    previewMode,
    isPreviewOpen,
    lastUpdate,
    canPreview,
    previewUrl,
    previewEnabled,

    // Preview methods
    updatePreview: updatePreviewManually,
    openPreview,
    closePreview,
    togglePreviewMode,
    refreshPreview,
    togglePreview,

    // Data
    portfolioData
  };

  return (
    <ValidationContext.Provider value={contextValue}>
      {children}
    </ValidationContext.Provider>
  );
}

/**
 * Hook to use validation context
 */
export function useValidation() {
  const context = useContext(ValidationContext);
  if (!context) {
    throw new Error('useValidation must be used within a ValidationProvider');
  }
  return context;
}

export default ValidationProvider;