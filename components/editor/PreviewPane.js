/**
 * Preview Pane Component
 * Enhanced preview with validation integration and mode switching
 * Implements task 8.3: Real-Time Validation + Preview
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useValidation } from './ValidationProvider.js';
import { GlassCard, GlassCardHeader, GlassCardContent } from '../ui/Card.js';
import { GlassButton } from '../ui/Button.js';
import { LoadingSpinner } from '../ui/Loading.js';
import { ValidationSummary } from './RealTimeValidator.js';

/**
 * Preview Pane Component
 */
export const PreviewPane = ({ className = '', showValidation = true }) => {
  const {
    previewData,
    previewLoading,
    previewError,
    previewMode,
    isPreviewOpen,
    lastUpdate,
    canPreview,
    previewUrl,
    previewEnabled,
    openPreview,
    closePreview,
    togglePreviewMode,
    refreshPreview,
    togglePreview,
    // Validation data
    getOverallValidationSummary,
    validationEnabled,
    isValid,
    hasErrors,
    hasWarnings,
    completeness
  } = useValidation();

  const [viewMode, setViewMode] = useState('preview'); // 'preview' | 'validation' | 'split'
  const validationSummary = getOverallValidationSummary();

  /**
   * Handle view mode change
   */
  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
  }, []);

  if (!previewEnabled && !validationEnabled) {
    return (
      <div className={`preview-pane ${className}`}>
        <GlassCard>
          <GlassCardContent className="text-center py-8">
            <div className="text-text-3 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2" />
              </svg>
            </div>
            <p className="text-text-2">Preview and validation disabled</p>
            <div className="flex gap-2 justify-center mt-4">
              <GlassButton onClick={togglePreview} size="sm">
                Enable Preview
              </GlassButton>
            </div>
          </GlassCardContent>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className={`preview-pane ${className}`}>
      <GlassCard>
        <GlassCardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-text-1">
                {viewMode === 'preview' && 'Live Preview'}
                {viewMode === 'validation' && 'Validation Results'}
                {viewMode === 'split' && 'Preview & Validation'}
              </h3>
              
              {lastUpdate && (
                <span className="text-sm text-text-2">
                  Updated {lastUpdate.toLocaleTimeString()}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-surface-2 rounded-lg p-1">
                <button
                  onClick={() => handleViewModeChange('preview')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    viewMode === 'preview' 
                      ? 'bg-accent-primary text-white' 
                      : 'text-text-2 hover:text-text-1'
                  }`}
                  disabled={!previewEnabled}
                >
                  Preview
                </button>
                <button
                  onClick={() => handleViewModeChange('validation')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    viewMode === 'validation' 
                      ? 'bg-accent-primary text-white' 
                      : 'text-text-2 hover:text-text-1'
                  }`}
                  disabled={!validationEnabled}
                >
                  Validation
                </button>
                <button
                  onClick={() => handleViewModeChange('split')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    viewMode === 'split' 
                      ? 'bg-accent-primary text-white' 
                      : 'text-text-2 hover:text-text-1'
                  }`}
                  disabled={!previewEnabled || !validationEnabled}
                >
                  Split
                </button>
              </div>

              {/* Preview Controls */}
              {previewEnabled && (viewMode === 'preview' || viewMode === 'split') && (
                <PreviewControls
                  previewMode={previewMode}
                  onToggleMode={togglePreviewMode}
                  onRefresh={refreshPreview}
                  onOpenExternal={openPreview}
                  onCloseExternal={isPreviewOpen ? closePreview : null}
                  isLoading={previewLoading}
                  isPreviewOpen={isPreviewOpen}
                />
              )}
            </div>
          </div>
        </GlassCardHeader>

        <GlassCardContent>
          {viewMode === 'preview' && (
            <PreviewContent
              previewData={previewData}
              previewLoading={previewLoading}
              previewError={previewError}
              previewMode={previewMode}
              canPreview={canPreview}
              previewEnabled={previewEnabled}
            />
          )}

          {viewMode === 'validation' && (
            <ValidationContent
              validationSummary={validationSummary}
              validationEnabled={validationEnabled}
              isValid={isValid}
              hasErrors={hasErrors}
              hasWarnings={hasWarnings}
              completeness={completeness}
            />
          )}

          {viewMode === 'split' && (
            <SplitContent
              previewData={previewData}
              previewLoading={previewLoading}
              previewError={previewError}
              previewMode={previewMode}
              canPreview={canPreview}
              previewEnabled={previewEnabled}
              validationSummary={validationSummary}
              validationEnabled={validationEnabled}
              isValid={isValid}
              hasErrors={hasErrors}
              hasWarnings={hasWarnings}
              completeness={completeness}
            />
          )}
        </GlassCardContent>
      </GlassCard>
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
        className="glass-button glass-button-secondary px-3 py-1 text-sm flex items-center gap-1"
        title={`Switch to ${previewMode === 'light' ? 'dark' : 'light'} mode`}
      >
        {previewMode === 'light' ? '🌙' : '☀️'}
        <span className="capitalize">{previewMode}</span>
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
 * Preview Content Component
 */
const PreviewContent = ({ 
  previewData, 
  previewLoading, 
  previewError, 
  previewMode, 
  canPreview, 
  previewEnabled 
}) => {
  if (!previewEnabled) {
    return (
      <div className="text-center py-8">
        <div className="text-text-3 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
          </svg>
        </div>
        <p className="text-text-2">Preview disabled</p>
      </div>
    );
  }

  if (previewLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-text-2">Generating preview...</p>
        </div>
      </div>
    );
  }

  if (previewError) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-red-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h4 className="text-lg font-semibold text-text-1 mb-2">Preview Error</h4>
          <p className="text-text-2">{previewError}</p>
        </div>
      </div>
    );
  }

  if (!canPreview || !previewData) {
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
          <p className="text-text-3 text-sm mt-1">Add some content to see a preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className="preview-viewport">
      <div className="border border-border rounded-lg overflow-hidden">
        {/* Browser-like header */}
        <div className="bg-surface-2 px-4 py-2 border-b border-border">
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            </div>
            <span className="text-xs text-text-3 font-mono ml-2">
              Portfolio Preview ({previewMode} mode)
            </span>
          </div>
        </div>
        
        {/* Preview content */}
        <div className={`preview-content ${previewMode === 'dark' ? 'dark' : ''}`}>
          <div className="transform scale-75 origin-top-left w-[133.33%] h-[400px] overflow-hidden bg-white dark:bg-gray-900">
            <div className="p-8 min-h-full">
              <PreviewRenderer previewData={previewData} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Validation Content Component
 */
const ValidationContent = ({ 
  validationSummary, 
  validationEnabled, 
  isValid, 
  hasErrors, 
  hasWarnings, 
  completeness 
}) => {
  if (!validationEnabled) {
    return (
      <div className="text-center py-8">
        <div className="text-text-3 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-text-2">Validation disabled</p>
      </div>
    );
  }

  return (
    <div className="validation-content space-y-4">
      {validationSummary && (
        <ValidationSummary 
          validationSummary={validationSummary}
          className="mb-4"
        />
      )}

      {/* Validation Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Completeness */}
        <div className="bg-surface-1 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-text-2">Completeness</span>
            <span className="text-lg font-bold text-text-1">{completeness}%</span>
          </div>
          <div className="w-full bg-surface-2 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-red-500 via-amber-500 to-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completeness}%` }}
            />
          </div>
        </div>

        {/* Status */}
        <div className="bg-surface-1 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">
              {isValid ? '✅' : hasErrors ? '❌' : hasWarnings ? '⚠️' : '🔄'}
            </span>
            <span className="text-sm font-medium text-text-2">Status</span>
          </div>
          <div className={`text-sm font-medium ${
            isValid ? 'text-green-500' : hasErrors ? 'text-red-500' : 'text-amber-500'
          }`}>
            {isValid ? 'Valid' : hasErrors ? 'Has Errors' : hasWarnings ? 'Has Warnings' : 'Checking...'}
          </div>
        </div>

        {/* Issues */}
        <div className="bg-surface-1 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🔍</span>
            <span className="text-sm font-medium text-text-2">Issues</span>
          </div>
          <div className="text-sm">
            {validationSummary && (
              <div className="space-y-1">
                {validationSummary.errorCount > 0 && (
                  <div className="text-red-500">
                    {validationSummary.errorCount} error{validationSummary.errorCount !== 1 ? 's' : ''}
                  </div>
                )}
                {validationSummary.warningCount > 0 && (
                  <div className="text-amber-500">
                    {validationSummary.warningCount} warning{validationSummary.warningCount !== 1 ? 's' : ''}
                  </div>
                )}
                {validationSummary.errorCount === 0 && validationSummary.warningCount === 0 && (
                  <div className="text-green-500">No issues found</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Split Content Component
 */
const SplitContent = ({ 
  previewData, 
  previewLoading, 
  previewError, 
  previewMode, 
  canPreview, 
  previewEnabled,
  validationSummary, 
  validationEnabled, 
  isValid, 
  hasErrors, 
  hasWarnings, 
  completeness 
}) => {
  return (
    <div className="split-content grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Preview Section */}
      <div className="preview-section">
        <h4 className="text-sm font-medium text-text-2 mb-3">Preview</h4>
        <div className="h-[400px]">
          <PreviewContent
            previewData={previewData}
            previewLoading={previewLoading}
            previewError={previewError}
            previewMode={previewMode}
            canPreview={canPreview}
            previewEnabled={previewEnabled}
          />
        </div>
      </div>

      {/* Validation Section */}
      <div className="validation-section">
        <h4 className="text-sm font-medium text-text-2 mb-3">Validation</h4>
        <div className="h-[400px] overflow-y-auto">
          <ValidationContent
            validationSummary={validationSummary}
            validationEnabled={validationEnabled}
            isValid={isValid}
            hasErrors={hasErrors}
            hasWarnings={hasWarnings}
            completeness={completeness}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Simple Preview Renderer
 */
const PreviewRenderer = ({ previewData }) => {
  if (!previewData || !previewData.portfolioData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No content to preview</p>
      </div>
    );
  }

  const { portfolioData } = previewData;

  return (
    <div className="space-y-6">
      {/* Header */}
      {portfolioData.personal && (
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {portfolioData.personal.name || 'Portfolio Owner'}
          </h1>
          {portfolioData.personal.title && (
            <p className="text-lg text-gray-600 dark:text-gray-300">
              {portfolioData.personal.title}
            </p>
          )}
        </div>
      )}

      {/* Sections */}
      {portfolioData.sections && portfolioData.sections.map((section, index) => (
        <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {section.title}
          </h2>
          <div className="text-gray-700 dark:text-gray-300">
            {section.type === 'markdown' ? (
              <div dangerouslySetInnerHTML={{ __html: section.content }} />
            ) : (
              <p>{section.content}</p>
            )}
          </div>
        </div>
      ))}

      {/* Projects */}
      {portfolioData.projects && portfolioData.projects.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {portfolioData.projects.map((project, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  {project.title || `Project ${index + 1}`}
                </h3>
                {project.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {project.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PreviewPane;