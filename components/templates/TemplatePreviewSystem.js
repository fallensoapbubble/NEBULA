/**
 * Template Preview System
 * Provides live preview functionality for templates with real GitHub data
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { logger } from '../../lib/logger.js';
import { TemplateRenderer } from './TemplateRenderer.js';
import { LoadingSpinner } from '../ui/Loading.js';
import { GlassCard, GlassCardContent, GlassCardHeader } from '../ui/Card.js';
import { LiveDataIndicator } from './LiveDataIndicator.js';

/**
 * TemplatePreviewSystem - Main component for template preview functionality
 */
export const TemplatePreviewSystem = ({
  templates = [],
  selectedTemplateId = null,
  onTemplateSelect,
  onTemplatePreview,
  className = '',
  showPreviewControls = true,
  previewMode = 'live', // 'live' or 'sample'
  ...props
}) => {
  const [previewData, setPreviewData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPreviewMode, setCurrentPreviewMode] = useState(previewMode);

  const previewLogger = useMemo(() => 
    logger.child({ component: 'TemplatePreviewSystem' }), 
    []
  );

  // Get currently selected template
  const selectedTemplate = useMemo(() => 
    templates.find(t => t.id === selectedTemplateId),
    [templates, selectedTemplateId]
  );

  // Load preview data when template selection changes
  useEffect(() => {
    if (selectedTemplate) {
      loadTemplatePreview(selectedTemplate, currentPreviewMode);
    } else {
      setPreviewData(null);
      setError(null);
    }
  }, [selectedTemplate, currentPreviewMode]);

  // Auto-refresh preview data every 30 seconds for live mode
  useEffect(() => {
    if (selectedTemplate && currentPreviewMode === 'live') {
      const interval = setInterval(() => {
        loadTemplatePreview(selectedTemplate, currentPreviewMode);
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    }
  }, [selectedTemplate, currentPreviewMode, loadTemplatePreview]);

  /**
   * Loads preview data for a template
   */
  const loadTemplatePreview = useCallback(async (template, mode = 'live') => {
    if (!template) return;

    setIsLoading(true);
    setError(null);

    try {
      previewLogger.info('Loading template preview', { 
        templateId: template.id,
        mode 
      });

      const [owner, repo] = template.id.split('/');
      const useSample = mode === 'sample';
      
      const response = await fetch(
        `/api/templates/${owner}/${repo}/preview?sample=${useSample}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
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
      
      // Notify parent component
      if (onTemplatePreview) {
        onTemplatePreview(template, result.data);
      }

      previewLogger.info('Template preview loaded successfully', { 
        templateId: template.id,
        dataFiles: Object.keys(result.data.portfolioData || {}).length
      });

    } catch (err) {
      previewLogger.error('Failed to load template preview', { 
        templateId: template.id,
        error: err.message 
      });
      
      setError(err.message);
      setPreviewData(null);
    } finally {
      setIsLoading(false);
    }
  }, [previewLogger, onTemplatePreview]);

  /**
   * Handles template selection
   */
  const handleTemplateSelect = useCallback((template) => {
    if (onTemplateSelect) {
      onTemplateSelect(template);
    }
  }, [onTemplateSelect]);

  /**
   * Handles preview mode change
   */
  const handlePreviewModeChange = useCallback((mode) => {
    setCurrentPreviewMode(mode);
  }, []);

  /**
   * Refreshes the current preview
   */
  const refreshPreview = useCallback(() => {
    if (selectedTemplate) {
      loadTemplatePreview(selectedTemplate, currentPreviewMode);
    }
  }, [selectedTemplate, currentPreviewMode, loadTemplatePreview]);

  return (
    <div className={`template-preview-system ${className}`} {...props}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Template Selection Panel */}
        <div className="template-selection">
          <GlassCard>
            <GlassCardHeader>
              <h3 className="text-lg font-semibold text-text-1">
                Choose a Template
              </h3>
              <p className="text-sm text-text-2">
                Select a template to see a live preview
              </p>
            </GlassCardHeader>
            <GlassCardContent>
              <TemplateGrid
                templates={templates}
                selectedTemplateId={selectedTemplateId}
                onTemplateSelect={handleTemplateSelect}
                isLoading={isLoading}
              />
            </GlassCardContent>
          </GlassCard>
        </div>

        {/* Preview Panel */}
        <div className="template-preview">
          <GlassCard>
            <GlassCardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-text-1">
                    Live Preview
                  </h3>
                  {selectedTemplate && (
                    <p className="text-sm text-text-2">
                      {selectedTemplate.name}
                    </p>
                  )}
                </div>
                
                {showPreviewControls && selectedTemplate && (
                  <PreviewControls
                    mode={currentPreviewMode}
                    onModeChange={handlePreviewModeChange}
                    onRefresh={refreshPreview}
                    isLoading={isLoading}
                  />
                )}
              </div>
            </GlassCardHeader>
            <GlassCardContent>
              <TemplatePreviewRenderer
                template={selectedTemplate}
                previewData={previewData}
                isLoading={isLoading}
                error={error}
                mode={currentPreviewMode}
              />
            </GlassCardContent>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

/**
 * TemplateGrid - Grid display of available templates
 */
const TemplateGrid = ({ 
  templates, 
  selectedTemplateId, 
  onTemplateSelect, 
  isLoading 
}) => {
  if (templates.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-text-2">No templates available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          isSelected={template.id === selectedTemplateId}
          onSelect={() => onTemplateSelect(template)}
          isLoading={isLoading && template.id === selectedTemplateId}
        />
      ))}
    </div>
  );
};

/**
 * TemplateCard - Individual template card
 */
const TemplateCard = ({ template, isSelected, onSelect, isLoading }) => {
  return (
    <div
      className={`
        template-card p-4 rounded-lg border cursor-pointer transition-all duration-200
        ${isSelected 
          ? 'border-primary-500 bg-primary-500/10 shadow-lg shadow-primary-500/20' 
          : 'border-border hover:border-primary-400 hover:bg-primary-400/5 hover:shadow-md'
        }
        ${isLoading ? 'opacity-50 cursor-wait' : ''}
      `}
      onClick={onSelect}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className={`
            w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200
            ${isSelected 
              ? 'bg-gradient-to-br from-primary-500 to-primary-600 shadow-md' 
              : 'bg-gradient-to-br from-primary-400 to-primary-600'
            }
          `}>
            <span className="text-white font-semibold text-sm">
              {template.name.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h4 className="text-sm font-medium text-text-1 truncate">
              {template.name}
            </h4>
            {isSelected && (
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div>
              </div>
            )}
          </div>
          <p className="text-xs text-text-2 mt-1 line-clamp-2">
            {template.description}
          </p>
          
          {/* Repository info */}
          <div className="flex items-center space-x-2 mt-2 text-xs text-text-3">
            <span>{template.repository?.owner}</span>
            <span>•</span>
            <span>{template.metadata?.stars || 0} ⭐</span>
            <span>•</span>
            <span>{template.metadata?.forks || 0} 🍴</span>
          </div>
          
          {template.tags && template.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {template.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="inline-block px-2 py-1 text-xs bg-surface-2 text-text-2 rounded"
                >
                  {tag}
                </span>
              ))}
              {template.tags.length > 2 && (
                <span className="text-xs text-text-3">
                  +{template.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
        
        {isLoading && (
          <div className="flex-shrink-0">
            <LoadingSpinner size="sm" />
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * PreviewControls - Controls for preview functionality
 */
const PreviewControls = ({ mode, onModeChange, onRefresh, isLoading }) => {
  return (
    <div className="flex items-center space-x-2">
      <select
        value={mode}
        onChange={(e) => onModeChange(e.target.value)}
        className="glass-input text-sm py-1 px-2"
        disabled={isLoading}
      >
        <option value="live">Live Data</option>
        <option value="sample">Sample Data</option>
      </select>
      
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
    </div>
  );
};

/**
 * TemplatePreviewRenderer - Renders the actual template preview
 */
const TemplatePreviewRenderer = ({ 
  template, 
  previewData, 
  isLoading, 
  error, 
  mode 
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-text-2">Loading template preview...</p>
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
          <p className="text-text-2 mb-4">{error}</p>
          <p className="text-xs text-text-3">
            Try switching to sample data or check your GitHub permissions
          </p>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-text-3 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-text-2">Select a template to see preview</p>
        </div>
      </div>
    );
  }

  if (!previewData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-text-2">No preview data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="template-preview-container">
      <div className="mb-4">
        <LiveDataIndicator
          isLoading={isLoading}
          portfolioData={previewData?.portfolioData}
          repository={previewData?.repository}
          lastUpdated={previewData?.preview?.generated_at ? new Date(previewData.preview.generated_at) : null}
          mode={mode}
          onRefresh={refreshPreview}
        />
      </div>
      
      <div className="preview-viewport border border-border rounded-lg overflow-hidden bg-white">
        <div className="preview-header bg-gray-100 px-4 py-2 border-b border-border">
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            </div>
            <span className="text-xs text-gray-600 font-mono ml-2">
              {template.repository?.full_name} - Portfolio Preview
            </span>
          </div>
        </div>
        
        <div className="transform scale-75 origin-top-left w-[133.33%] h-[133.33%]">
          <TemplateRenderer
            template={previewData.template}
            portfolioData={previewData.portfolioData}
            repositoryInfo={previewData.repository}
            isPreview={true}
            className="min-h-screen bg-background"
          />
        </div>
      </div>
    </div>
  );
};

export default TemplatePreviewSystem;