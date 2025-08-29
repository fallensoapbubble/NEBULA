/**
 * Live Preview Component
 * Real-time preview of portfolio changes with dark/light mode support
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { TemplateRenderer } from '../templates/TemplateRenderer.js';
import { GlassCard, GlassCardHeader, GlassCardContent } from '../ui/Card.js';
import { GlassButton } from '../ui/Button.js';
import { LoadingSpinner } from '../ui/Loading.js';

/**
 * Live Preview Hook
 * Manages live preview state and updates
 */
export function useLivePreview(owner, repo, portfolioData, options = {}) {
  const [previewData, setPreviewData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewMode, setPreviewMode] = useState('light'); // 'light' or 'dark'
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  const updateTimeoutRef = useRef(null);
  const previewWindowRef = useRef(null);

  const config = {
    updateDelay: 1000, // Delay before updating preview
    autoUpdate: true,
    enableModeToggle: true,
    showPreviewControls: true,
    ...options
  };

  /**
   * Generate preview data from portfolio data
   */
  const generatePreviewData = useCallback(async (data = portfolioData) => {
    if (!data || !owner || !repo) return null;

    try {
      // Simulate template structure for preview
      const templateData = {
        template: {
          id: `${owner}/${repo}`,
          name: data.personal?.name || 'Portfolio',
          type: 'portfolio',
          mode: previewMode
        },
        portfolioData: data,
        repository: {
          owner,
          name: repo,
          full_name: `${owner}/${repo}`
        },
        preview: {
          generated_at: new Date().toISOString(),
          mode: previewMode,
          data_source: 'live'
        }
      };

      return templateData;
    } catch (error) {
      console.error('Failed to generate preview data:', error);
      throw error;
    }
  }, [owner, repo, portfolioData, previewMode]);

  /**
   * Update preview with current data
   */
  const updatePreview = useCallback(async (data = portfolioData, immediate = false) => {
    if (!config.autoUpdate && !immediate) return;

    // Clear existing timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    const performUpdate = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const newPreviewData = await generatePreviewData(data);
        setPreviewData(newPreviewData);
        setLastUpdate(new Date());

        // Notify preview window if open
        if (previewWindowRef.current && !previewWindowRef.current.closed) {
          previewWindowRef.current.postMessage({
            type: 'PREVIEW_UPDATE',
            data: newPreviewData
          }, window.location.origin);
        }

      } catch (err) {
        console.error('Preview update failed:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (immediate) {
      await performUpdate();
    } else {
      updateTimeoutRef.current = setTimeout(performUpdate, config.updateDelay);
    }
  }, [portfolioData, generatePreviewData, config.autoUpdate, config.updateDelay]);

  /**
   * Open preview in new window
   */
  const openPreview = useCallback(() => {
    const previewUrl = `/${owner}/${repo}?preview=true&mode=${previewMode}`;
    previewWindowRef.current = window.open(
      previewUrl, 
      'portfolio-preview',
      'width=1200,height=800,scrollbars=yes,resizable=yes'
    );
    
    setIsPreviewOpen(true);

    // Listen for window close
    const checkClosed = setInterval(() => {
      if (previewWindowRef.current?.closed) {
        setIsPreviewOpen(false);
        clearInterval(checkClosed);
      }
    }, 1000);
  }, [owner, repo, previewMode]);

  /**
   * Close preview window
   */
  const closePreview = useCallback(() => {
    if (previewWindowRef.current && !previewWindowRef.current.closed) {
      previewWindowRef.current.close();
    }
    setIsPreviewOpen(false);
  }, []);

  /**
   * Toggle preview mode (light/dark)
   */
  const togglePreviewMode = useCallback(() => {
    const newMode = previewMode === 'light' ? 'dark' : 'light';
    setPreviewMode(newMode);
    
    // Update preview with new mode
    updatePreview(portfolioData, true);
  }, [previewMode, updatePreview, portfolioData]);

  /**
   * Refresh preview manually
   */
  const refreshPreview = useCallback(() => {
    updatePreview(portfolioData, true);
  }, [updatePreview, portfolioData]);

  // Auto-update preview when portfolio data changes
  useEffect(() => {
    if (portfolioData) {
      updatePreview(portfolioData);
    }
  }, [portfolioData, updatePreview]);

  // Initial preview generation
  useEffect(() => {
    if (owner && repo && portfolioData) {
      updatePreview(portfolioData, true);
    }
  }, [owner, repo]); // Only run when owner/repo changes

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      if (previewWindowRef.current && !previewWindowRef.current.closed) {
        previewWindowRef.current.close();
      }
    };
  }, []);

  return {
    // State
    previewData,
    isLoading,
    error,
    previewMode,
    isPreviewOpen,
    lastUpdate,

    // Methods
    updatePreview,
    openPreview,
    closePreview,
    togglePreviewMode,
    refreshPreview,

    // Computed values
    hasPreviewData: Boolean(previewData),
    canPreview: Boolean(owner && repo && portfolioData),
    previewUrl: `/${owner}/${repo}?preview=true&mode=${previewMode}`
  };
}

/**
 * Live Preview Component
 */
export const LivePreview = ({ 
  owner, 
  repo, 
  portfolioData, 
  className = '',
  showControls = true,
  embedded = false 
}) => {
  const {
    previewData,
    isLoading,
    error,
    previewMode,
    isPreviewOpen,
    lastUpdate,
    openPreview,
    closePreview,
    togglePreviewMode,
    refreshPreview,
    canPreview
  } = useLivePreview(owner, repo, portfolioData);

  if (!canPreview) {
    return (
      <div className={`live-preview ${className}`}>
        <GlassCard>
          <GlassCardContent className="text-center py-8">
            <div className="text-text-3 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <p className="text-text-2">Preview not available</p>
            <p className="text-text-3 text-sm mt-1">Add some content to see a preview</p>
          </GlassCardContent>
        </GlassCard>
      </div>
    );
  }

  if (embedded) {
    return (
      <div className={`live-preview embedded ${className}`}>
        <GlassCard>
          {showControls && (
            <GlassCardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-text-1">Live Preview</h3>
                  {lastUpdate && (
                    <p className="text-sm text-text-2">
                      Updated {lastUpdate.toLocaleTimeString()}
                    </p>
                  )}
                </div>
                <PreviewControls
                  previewMode={previewMode}
                  onToggleMode={togglePreviewMode}
                  onRefresh={refreshPreview}
                  onOpenExternal={openPreview}
                  isLoading={isLoading}
                />
              </div>
            </GlassCardHeader>
          )}
          <GlassCardContent>
            <EmbeddedPreviewRenderer
              previewData={previewData}
              isLoading={isLoading}
              error={error}
              previewMode={previewMode}
            />
          </GlassCardContent>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className={`live-preview ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-text-1">Live Preview</h3>
          {lastUpdate && (
            <p className="text-sm text-text-2">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>
        
        {showControls && (
          <PreviewControls
            previewMode={previewMode}
            onToggleMode={togglePreviewMode}
            onRefresh={refreshPreview}
            onOpenExternal={openPreview}
            onCloseExternal={isPreviewOpen ? closePreview : null}
            isLoading={isLoading}
            isPreviewOpen={isPreviewOpen}
          />
        )}
      </div>

      <PreviewStatus
        isLoading={isLoading}
        error={error}
        isPreviewOpen={isPreviewOpen}
        lastUpdate={lastUpdate}
      />
    </div>
  );
};

/**
 * Preview Controls Component
 */
const PreviewControls = ({ 
  previewMode, 
  onToggleMode, 
  onRefresh, 
  onOpenExternal,
  onCloseExternal,
  isLoading,
  isPreviewOpen 
}) => {
  return (
    <div className="flex items-center gap-2">
      {/* Mode Toggle */}
      <button
        onClick={onToggleMode}
        disabled={isLoading}
        className="glass-button glass-button-secondary px-3 py-1 text-sm"
        title={`Switch to ${previewMode === 'light' ? 'dark' : 'light'} mode`}
      >
        {previewMode === 'light' ? '🌙' : '☀️'}
        <span className="ml-1 capitalize">{previewMode}</span>
      </button>

      {/* Refresh Button */}
      <button
        onClick={onRefresh}
        disabled={isLoading}
        className="glass-button glass-button-secondary p-2"
        title="Refresh Preview"
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

      {/* External Preview Button */}
      {isPreviewOpen ? (
        <GlassButton
          onClick={onCloseExternal}
          variant="secondary"
          size="sm"
        >
          Close Preview
        </GlassButton>
      ) : (
        <GlassButton
          onClick={onOpenExternal}
          variant="primary"
          size="sm"
        >
          Open Preview
        </GlassButton>
      )}
    </div>
  );
};

/**
 * Preview Status Component
 */
const PreviewStatus = ({ isLoading, error, isPreviewOpen, lastUpdate }) => {
  if (error) {
    return (
      <div className="preview-status bg-red-50/10 border border-red-500/20 rounded-lg p-3 mb-4">
        <div className="flex items-center gap-2 text-red-500">
          <span>❌</span>
          <span className="font-medium">Preview Error</span>
        </div>
        <p className="text-red-400 text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="preview-status bg-blue-50/10 border border-blue-500/20 rounded-lg p-3 mb-4">
        <div className="flex items-center gap-2 text-blue-500">
          <LoadingSpinner size="sm" />
          <span className="font-medium">Updating Preview...</span>
        </div>
      </div>
    );
  }

  if (isPreviewOpen) {
    return (
      <div className="preview-status bg-green-50/10 border border-green-500/20 rounded-lg p-3 mb-4">
        <div className="flex items-center gap-2 text-green-500">
          <span>👁️</span>
          <span className="font-medium">Preview Window Open</span>
        </div>
        <p className="text-green-400 text-sm mt-1">
          Changes will be reflected automatically in the preview window
        </p>
      </div>
    );
  }

  return null;
};

/**
 * Embedded Preview Renderer
 */
const EmbeddedPreviewRenderer = ({ previewData, isLoading, error, previewMode }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-text-2">Generating preview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-red-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h4 className="text-lg font-semibold text-text-1 mb-2">Preview Error</h4>
          <p className="text-text-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!previewData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-text-3 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <p className="text-text-2">No preview available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="embedded-preview-container">
      <div className="preview-viewport border border-border rounded-lg overflow-hidden">
        {/* Browser-like header */}
        <div className="preview-header bg-surface-2 px-4 py-2 border-b border-border">
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            </div>
            <span className="text-xs text-text-3 font-mono ml-2">
              {previewData.repository?.full_name} - Portfolio Preview ({previewMode})
            </span>
          </div>
        </div>
        
        {/* Preview content */}
        <div className={`preview-content ${previewMode === 'dark' ? 'dark' : ''}`}>
          <div className="transform scale-75 origin-top-left w-[133.33%] h-[400px] overflow-hidden">
            <TemplateRenderer
              template={previewData.template}
              portfolioData={previewData.portfolioData}
              repositoryInfo={previewData.repository}
              isPreview={true}
              className="min-h-full bg-background"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LivePreview;