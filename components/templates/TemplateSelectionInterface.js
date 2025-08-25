/**
 * Template Selection Interface
 * Provides a comprehensive interface for browsing and selecting templates with real-time previews
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { logger } from '../../lib/logger.js';
import { TemplatePreviewSystem } from './TemplatePreviewSystem.js';
import { LoadingSpinner } from '../ui/Loading.js';
import { GlassCard, GlassCardContent, GlassCardHeader } from '../ui/Card.js';

/**
 * TemplateSelectionInterface - Main interface for template selection
 */
export const TemplateSelectionInterface = ({
  onTemplateSelect,
  onTemplateFork,
  initialTemplateId = null,
  showForkButton = true,
  className = '',
  ...props
}) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplateId);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [previewData, setPreviewData] = useState(null);

  const interfaceLogger = useMemo(() => 
    logger.child({ component: 'TemplateSelectionInterface' }), 
    []
  );

  // Load templates on component mount
  useEffect(() => {
    loadTemplates();
  }, []);

  /**
   * Loads available templates from the API
   */
  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      interfaceLogger.info('Loading templates');

      const response = await fetch('/api/templates', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to load templates');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Template loading failed');
      }

      setTemplates(result.data || []);
      
      interfaceLogger.info('Templates loaded successfully', { 
        count: result.data?.length || 0 
      });

    } catch (err) {
      interfaceLogger.error('Failed to load templates', { 
        error: err.message 
      });
      
      setError(err.message);
      setTemplates([]);
    } finally {
      setIsLoading(false);
    }
  }, [interfaceLogger]);

  /**
   * Filters templates based on search and tag criteria
   */
  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Filter by selected tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(template =>
        selectedTags.some(tag => template.tags?.includes(tag))
      );
    }

    return filtered;
  }, [templates, searchQuery, selectedTags]);

  /**
   * Gets all unique tags from templates
   */
  const availableTags = useMemo(() => {
    const tagSet = new Set();
    templates.forEach(template => {
      template.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [templates]);

  /**
   * Handles template selection
   */
  const handleTemplateSelect = useCallback((template) => {
    setSelectedTemplateId(template.id);
    
    if (onTemplateSelect) {
      onTemplateSelect(template);
    }

    interfaceLogger.info('Template selected', { 
      templateId: template.id,
      templateName: template.name 
    });
  }, [onTemplateSelect, interfaceLogger]);

  /**
   * Handles template preview data update
   */
  const handleTemplatePreview = useCallback((template, data) => {
    setPreviewData(data);
  }, []);

  /**
   * Handles template forking
   */
  const handleTemplateFork = useCallback(async () => {
    const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
    if (!selectedTemplate) return;

    if (onTemplateFork) {
      await onTemplateFork(selectedTemplate, previewData);
    }
  }, [selectedTemplateId, templates, previewData, onTemplateFork]);

  /**
   * Handles search input change
   */
  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
  }, []);

  /**
   * Handles tag selection toggle
   */
  const handleTagToggle = useCallback((tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  }, []);

  /**
   * Clears all filters
   */
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedTags([]);
  }, []);

  if (isLoading) {
    return (
      <div className={`template-selection-interface ${className}`} {...props}>
        <GlassCard>
          <GlassCardContent className="text-center py-12">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <p className="text-text-2">Loading templates...</p>
          </GlassCardContent>
        </GlassCard>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`template-selection-interface ${className}`} {...props}>
        <GlassCard>
          <GlassCardContent className="text-center py-12">
            <div className="text-red-400 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-text-1 mb-2">Failed to Load Templates</h3>
            <p className="text-text-2 mb-4">{error}</p>
            <button 
              className="glass-button glass-button-primary"
              onClick={loadTemplates}
            >
              Try Again
            </button>
          </GlassCardContent>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className={`template-selection-interface space-y-6 ${className}`} {...props}>
      {/* Search and Filter Controls */}
      <GlassCard>
        <GlassCardHeader>
          <h2 className="text-xl font-semibold text-text-1">
            Choose Your Portfolio Template
          </h2>
          <p className="text-text-2">
            Browse templates and see live previews with real GitHub data
          </p>
        </GlassCardHeader>
        <GlassCardContent>
          <TemplateFilters
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            availableTags={availableTags}
            selectedTags={selectedTags}
            onTagToggle={handleTagToggle}
            onClearFilters={clearFilters}
            resultCount={filteredTemplates.length}
            totalCount={templates.length}
          />
        </GlassCardContent>
      </GlassCard>

      {/* Template Preview System */}
      <TemplatePreviewSystem
        templates={filteredTemplates}
        selectedTemplateId={selectedTemplateId}
        onTemplateSelect={handleTemplateSelect}
        onTemplatePreview={handleTemplatePreview}
        showPreviewControls={true}
        previewMode="live"
      />

      {/* Action Buttons */}
      {selectedTemplateId && showForkButton && (
        <div className="flex justify-center">
          <TemplateActionButtons
            selectedTemplate={templates.find(t => t.id === selectedTemplateId)}
            previewData={previewData}
            onFork={handleTemplateFork}
          />
        </div>
      )}
    </div>
  );
};

/**
 * TemplateFilters - Search and filter controls
 */
const TemplateFilters = ({
  searchQuery,
  onSearchChange,
  availableTags,
  selectedTags,
  onTagToggle,
  onClearFilters,
  resultCount,
  totalCount
}) => {
  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-text-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search templates..."
          value={searchQuery}
          onChange={onSearchChange}
          className="glass-input pl-10 w-full"
        />
      </div>

      {/* Tag Filters */}
      {availableTags.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-text-2 mb-2">
            Filter by tags:
          </label>
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => (
              <button
                key={tag}
                onClick={() => onTagToggle(tag)}
                className={`
                  px-3 py-1 text-sm rounded-full border transition-colors
                  ${selectedTags.includes(tag)
                    ? 'bg-primary-500 text-white border-primary-500'
                    : 'bg-surface-2 text-text-2 border-border hover:border-primary-400'
                  }
                `}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results Summary and Clear Filters */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-2">
          Showing {resultCount} of {totalCount} templates
        </span>
        
        {(searchQuery || selectedTags.length > 0) && (
          <button
            onClick={onClearFilters}
            className="text-primary-400 hover:text-primary-300 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * TemplateActionButtons - Action buttons for selected template
 */
const TemplateActionButtons = ({ selectedTemplate, previewData, onFork }) => {
  const [isForking, setIsForking] = useState(false);

  const handleFork = async () => {
    setIsForking(true);
    try {
      await onFork();
    } finally {
      setIsForking(false);
    }
  };

  if (!selectedTemplate) return null;

  return (
    <GlassCard className="w-full max-w-md">
      <GlassCardContent className="text-center">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-text-1 mb-2">
            {selectedTemplate.name}
          </h3>
          <p className="text-sm text-text-2 mb-3">
            Ready to use this template for your portfolio?
          </p>
          
          {/* Template info */}
          <div className="grid grid-cols-2 gap-4 text-xs text-text-3 mb-3">
            <div>
              <span className="font-medium">Author:</span> {selectedTemplate.metadata?.author}
            </div>
            <div>
              <span className="font-medium">Updated:</span> {
                selectedTemplate.metadata?.updated_at 
                  ? new Date(selectedTemplate.metadata.updated_at).toLocaleDateString()
                  : 'Unknown'
              }
            </div>
            <div>
              <span className="font-medium">Stars:</span> {selectedTemplate.metadata?.stars || 0}
            </div>
            <div>
              <span className="font-medium">Forks:</span> {selectedTemplate.metadata?.forks || 0}
            </div>
          </div>
          
          {/* Validation status */}
          {selectedTemplate.validation && (
            <div className="mb-3">
              <div className={`flex items-center space-x-2 text-xs ${
                selectedTemplate.validation.isValid ? 'text-green-600' : 'text-yellow-600'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  selectedTemplate.validation.isValid ? 'bg-green-500' : 'bg-yellow-500'
                }`}></div>
                <span>
                  {selectedTemplate.validation.isValid ? 'Template validated' : 'Template has warnings'}
                </span>
              </div>
              
              {selectedTemplate.validation.warnings?.length > 0 && (
                <div className="mt-1 text-xs text-yellow-600">
                  {selectedTemplate.validation.warnings[0]}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <button
            onClick={handleFork}
            disabled={isForking}
            className="glass-button glass-button-primary w-full"
          >
            {isForking ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Forking Template...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Fork Template
              </>
            )}
          </button>

          <div className="text-xs text-text-3">
            This will create a copy of the template in your GitHub account
          </div>
        </div>
      </GlassCardContent>
    </GlassCard>
  );
};

export default TemplateSelectionInterface;