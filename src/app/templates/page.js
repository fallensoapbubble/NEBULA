/**
 * Template Gallery Page
 * Browse and select portfolio templates
 */

'use client';

import React from 'react';
import Image from 'next/image';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard, GlassCardContent, GlassCardHeader } from '../../../components/ui/Card.js';
import { useAuth } from '../../../lib/auth-hooks.js';
import RepositoryCreationDialog from '../../../components/templates/RepositoryCreationDialog.jsx';
import TemplateMetadata from '../../../components/templates/TemplateMetadata.jsx';
import { useTemplateTracking } from '../../../lib/hooks/useTemplateTracking.js';

export default function TemplatesPage() {
  const { user, isAuthenticated } = useAuth();
  const { trackView, trackPreview, trackFork } = useTemplateTracking();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Load templates on component mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/templates');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to load templates');
      }

      setTemplates(result.data || []);
    } catch (err) {
      console.error('Failed to load templates:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter templates based on search and tags
  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Filter by selected tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(template =>
        selectedTags.some(tag => template.tags.includes(tag))
      );
    }

    return filtered;
  }, [templates, searchQuery, selectedTags]);

  // Get all unique tags
  const availableTags = useMemo(() => {
    const tagSet = new Set();
    templates.forEach(template => {
      template.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [templates]);

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setShowModal(true);
    
    // Track template preview
    trackPreview(template.id, 'modal');
  };

  const handleCreateRepository = (template) => {
    setSelectedTemplate(template);
    setShowCreateDialog(true);
    setShowModal(false);
  };

  const handleCreateSuccess = (repositoryData) => {
    console.log('Repository created successfully:', repositoryData);
    
    // Track template fork
    if (selectedTemplate) {
      trackFork(selectedTemplate.id, repositoryData.repository?.name);
    }
    
    setShowCreateDialog(false);
    setSelectedTemplate(null);
    
    // Redirect to editor or show success message
    if (repositoryData.next_steps?.editor_url) {
      window.location.href = repositoryData.next_steps.editor_url;
    }
  };

  const handleCreateError = (error) => {
    console.error('Repository creation failed:', error);
    // Error is handled within the dialog
  };

  const handleTagToggle = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-4 py-8">
          <TemplateGalleryHeader />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {[...Array(6)].map((_, i) => (
              <TemplateCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-4 py-8">
          <TemplateGalleryHeader />
          <GlassCard className="mt-8">
            <GlassCardContent className="text-center py-12">
              <div className="text-red-400 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Failed to Load Templates</h3>
              <p className="text-gray-400 mb-4">{error}</p>
              <button
                className="glass-button glass-button-primary"
                onClick={loadTemplates}
              >
                Try Again
              </button>
            </GlassCardContent>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <TemplateGalleryHeader />
        
        {/* Search and Filter Controls */}
        <GlassCard className="mt-8">
          <GlassCardContent className="p-6">
            <TemplateFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              availableTags={availableTags}
              selectedTags={selectedTags}
              onTagToggle={handleTagToggle}
              onClearFilters={clearFilters}
              resultCount={filteredTemplates.length}
              totalCount={templates.length}
            />
          </GlassCardContent>
        </GlassCard>

        {/* Template Grid */}
        <div className="mt-8">
          {filteredTemplates.length === 0 ? (
            <GlassCard>
              <GlassCardContent className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.562M15 6.306a7.962 7.962 0 00-6 0m6 0V5a2 2 0 00-2-2H9a2 2 0 00-2 2v1.306m8 0V7a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V9a2 2 0 012-2h8a2 2 0 012 2v1.306z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No Templates Found</h3>
                <p className="text-gray-400 mb-4">
                  {searchQuery || selectedTags.length > 0
                    ? 'Try adjusting your search criteria'
                    : 'No templates are currently available'
                  }
                </p>
                {(searchQuery || selectedTags.length > 0) && (
                  <button
                    className="glass-button glass-button-secondary"
                    onClick={clearFilters}
                  >
                    Clear Filters
                  </button>
                )}
              </GlassCardContent>
            </GlassCard>
          ) : (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <AnimatePresence>
                {filteredTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onSelect={handleTemplateSelect}
                    isAuthenticated={isAuthenticated}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>

        {/* Template Detail Modal */}
        <AnimatePresence>
          {showModal && selectedTemplate && (
            <TemplateDetailModal
              template={selectedTemplate}
              isAuthenticated={isAuthenticated}
              user={user}
              onClose={() => {
                setShowModal(false);
                setSelectedTemplate(null);
              }}
              onCreateRepository={handleCreateRepository}
            />
          )}
        </AnimatePresence>

        {/* Repository Creation Dialog */}
        <RepositoryCreationDialog
          template={selectedTemplate}
          isOpen={showCreateDialog}
          onClose={() => {
            setShowCreateDialog(false);
            setSelectedTemplate(null);
          }}
          onSuccess={handleCreateSuccess}
          onError={handleCreateError}
        />
      </div>
    </div>
  );
}

// Template Gallery Header Component
function TemplateGalleryHeader() {
  return (
    <div className="text-center">
      <motion.h1
        className="text-4xl md:text-5xl font-bold text-white mb-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        Portfolio Templates
      </motion.h1>
      <motion.p
        className="text-xl text-gray-400 max-w-2xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        Choose from our collection of professionally designed portfolio templates.
        Fork to your GitHub account and customize with our web editor.
      </motion.p>
    </div>
  );
}

// Template Filters Component
function TemplateFilters({
  searchQuery,
  onSearchChange,
  availableTags,
  selectedTags,
  onTagToggle,
  onClearFilters,
  resultCount,
  totalCount
}) {
  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="glass-input pl-10 w-full"
        />
      </div>

      {/* Tag Filters */}
      {availableTags.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
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
                    ? 'bg-indigo-500 text-white border-indigo-500'
                    : 'bg-glass-1 text-gray-300 border-gray-600 hover:border-indigo-400'
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
        <span className="text-gray-400">
          Showing {resultCount} of {totalCount} templates
        </span>

        {(searchQuery || selectedTags.length > 0) && (
          <button
            onClick={onClearFilters}
            className="text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

// Template Card Component
function TemplateCard({ template, onSelect, isAuthenticated }) {
  const { trackView } = useTemplateTracking();
  const [hasTrackedView, setHasTrackedView] = useState(false);

  // Track view when card becomes visible
  useEffect(() => {
    if (template && !hasTrackedView) {
      trackView(template.id);
      setHasTrackedView(true);
    }
  }, [template, hasTrackedView, trackView]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -4 }}
      className="glass-card hover:bg-glass-2 cursor-pointer"
      onClick={() => onSelect(template)}
    >
      {/* Template Preview */}
      <div className="aspect-video bg-gray-800 overflow-hidden rounded-t-xl relative">
        <Image
          src={template.preview_url}
          alt={`${template.name} preview`}
          fill
          className="object-cover"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
        <div className="w-full h-full hidden items-center justify-center bg-gray-800">
          <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      </div>

      {/* Template Info */}
      <div className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white mb-1">
            {template.name}
          </h3>
          <p className="text-sm text-gray-300 line-clamp-2">
            {template.description}
          </p>
        </div>

        {/* Template Metadata */}
        <TemplateMetadata template={template} />
      </div>
    </motion.div>
  );
}

// Template Card Skeleton for Loading State
function TemplateCardSkeleton() {
  return (
    <div className="glass-card">
      <div className="aspect-video bg-gray-800 rounded-t-xl shimmer"></div>
      <div className="p-6 space-y-3">
        <div className="flex justify-between items-start">
          <div className="space-y-2 flex-1">
            <div className="h-5 bg-gray-700 rounded shimmer w-3/4"></div>
            <div className="h-4 bg-gray-700 rounded shimmer w-1/2"></div>
          </div>
          <div className="h-4 bg-gray-700 rounded shimmer w-16"></div>
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-700 rounded shimmer"></div>
          <div className="h-4 bg-gray-700 rounded shimmer w-5/6"></div>
        </div>
        <div className="flex gap-2">
          <div className="h-6 bg-gray-700 rounded-full shimmer w-16"></div>
          <div className="h-6 bg-gray-700 rounded-full shimmer w-20"></div>
          <div className="h-6 bg-gray-700 rounded-full shimmer w-14"></div>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex gap-4">
            <div className="h-4 bg-gray-700 rounded shimmer w-8"></div>
            <div className="h-4 bg-gray-700 rounded shimmer w-8"></div>
          </div>
          <div className="h-4 bg-gray-700 rounded shimmer w-12"></div>
        </div>
      </div>
    </div>
  );
}

// Template Detail Modal Component
function TemplateDetailModal({ template, isAuthenticated, user, onClose, onCreateRepository }) {
  const handleCreateRepository = () => {
    if (!isAuthenticated) {
      // Redirect to authentication
      window.location.href = '/api/auth/github';
      return;
    }

    onCreateRepository(template);
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="glass-modal max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {template.name}
              </h2>
              <p className="text-gray-400">
                by {template.metadata.author} • v{template.metadata.version}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {/* Template Preview */}
          <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden relative">
            <Image
              src={template.preview_url}
              alt={`${template.name} preview`}
              fill
              className="object-cover"
            />
          </div>

          {/* Description */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
            <p className="text-gray-300 leading-relaxed">
              {template.description}
            </p>
          </div>

          {/* Detailed Template Metadata */}
          <TemplateMetadata template={template} showDetailed={true} />
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              {isAuthenticated ? (
                `Ready to fork as ${user?.login || 'user'}`
              ) : (
                'Sign in with GitHub to fork this template'
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="glass-button glass-button-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRepository}
                className="glass-button glass-button-primary"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {isAuthenticated ? 'Create Repository' : 'Sign In & Create'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}