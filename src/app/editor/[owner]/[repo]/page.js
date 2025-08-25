/**
 * Portfolio Content Editor Page
 * Main page for editing portfolio content with dynamic forms and auto-save
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ContentEditor } from '../../../../../components/editor/ContentEditor.js';
import { useEditorIntegration, useEditorNavigation, useLivePreview } from '../../../../../lib/hooks/use-editor-integration.js';
import { GlassCard, GlassCardHeader, GlassCardContent, GlassCardTitle } from '../../../../../components/ui/Card.js';
import { GlassButton } from '../../../../../components/ui/Button.js';
import { AuthGuard } from '../../../../../components/auth/AuthGuard.js';

/**
 * Portfolio Editor Page Component
 */
function PortfolioEditorPage({ params }) {
  const { owner, repo } = params;
  const { data: session, status } = useSession();
  
  // Integrated editor functionality
  const {
    isInitialized,
    isLoading,
    isSaving,
    error,
    editorData,
    syncStatus,
    conflicts,
    saveHistory,
    saveContent,
    scheduleAutoSave,
    navigate,
    resolveConflicts,
    refresh,
    clearError,
    clearConflicts,
    canSave,
    hasUnsavedChanges,
    portfolioUrl,
    repositoryUrl
  } = useEditorIntegration(owner, repo, {
    enableLivePreview: true,
    enableAutoSync: true,
    conflictResolution: 'prompt',
    autoSaveInterval: 2000
  });

  // Navigation helpers
  const { navigateToPortfolio, navigateToRepository } = useEditorNavigation(owner, repo);

  // Live preview functionality
  const { 
    isPreviewOpen, 
    openPreview, 
    closePreview, 
    refreshPreview 
  } = useLivePreview(owner, repo, editorData?.portfolioData);

  // Local state for editor
  const [localPortfolioData, setLocalPortfolioData] = useState(null);

  // Update local data when editor data changes
  useEffect(() => {
    if (editorData?.portfolioData) {
      setLocalPortfolioData(editorData.portfolioData);
    }
  }, [editorData]);

  /**
   * Handle saving portfolio content with integration
   */
  const handleSave = useCallback(async (data) => {
    const result = await saveContent(data, {
      commitMessage: `Update portfolio content via web editor

Updated sections: ${Object.keys(data).join(', ')}
Timestamp: ${new Date().toISOString()}`,
      validateBeforeSave: true,
      createBackup: true
    });

    if (result.success) {
      setLocalPortfolioData(data);
      
      // Refresh live preview if open
      if (isPreviewOpen) {
        setTimeout(refreshPreview, 1000);
      }
    }

    return result;
  }, [saveContent, isPreviewOpen, refreshPreview]);

  /**
   * Handle content changes with auto-save
   */
  const handleContentChange = useCallback((data) => {
    setLocalPortfolioData(data);
    scheduleAutoSave(data);
  }, [scheduleAutoSave]);

  /**
   * Handle retry after error
   */
  const handleRetry = () => {
    clearError();
    refresh();
  };

  // Show loading state
  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlassCard>
          <GlassCardContent className="text-center py-8">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-text-2">Loading editor...</p>
          </GlassCardContent>
        </GlassCard>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlassCard className="max-w-md">
          <GlassCardHeader>
            <GlassCardTitle className="text-red-500">Error Loading Editor</GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <p className="text-text-2 mb-4">{error}</p>
            <div className="flex gap-3">
              <GlassButton onClick={handleRetry} variant="primary">
                Retry
              </GlassButton>
              <GlassButton onClick={handleBackToRepo} variant="secondary">
                Back to Repository
              </GlassButton>
            </div>
          </GlassCardContent>
        </GlassCard>
      </div>
    );
  }

  // Check if user has permission to edit
  if (session?.user?.login !== owner) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlassCard className="max-w-md">
          <GlassCardHeader>
            <GlassCardTitle className="text-amber-500">Access Restricted</GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <p className="text-text-2 mb-4">
              You can only edit repositories that you own. This repository belongs to {owner}.
            </p>
            <GlassButton onClick={handleBackToRepo} variant="primary">
              View Repository
            </GlassButton>
          </GlassCardContent>
        </GlassCard>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-background-1 to-background-2">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-text-1 mb-2">
                  Portfolio Editor
                </h1>
                <p className="text-text-2">
                  Editing <span className="font-mono text-accent-1">{owner}/{repo}</span>
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <GlassButton
                  onClick={openPreview}
                  variant="secondary"
                  disabled={!isInitialized}
                >
                  {isPreviewOpen ? 'Refresh Preview' : 'Live Preview'}
                </GlassButton>
                
                <GlassButton
                  onClick={navigateToPortfolio}
                  variant="secondary"
                >
                  View Portfolio
                </GlassButton>
                
                <GlassButton
                  onClick={navigateToRepository}
                  variant="outline"
                  size="sm"
                >
                  GitHub
                </GlassButton>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6">
              <GlassCard variant="elevated" className="border-red-500 bg-red-50/10">
                <GlassCardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-red-500">
                      <span className="text-lg">❌</span>
                      <span className="font-medium">Error</span>
                    </div>
                    <GlassButton
                      onClick={clearError}
                      variant="secondary"
                      size="sm"
                    >
                      Dismiss
                    </GlassButton>
                  </div>
                  <p className="text-red-600 text-sm mt-2">{error}</p>
                </GlassCardContent>
              </GlassCard>
            </div>
          )}

          {/* Conflicts Display */}
          {conflicts && (
            <div className="mb-6">
              <GlassCard variant="elevated" className="border-amber-500 bg-amber-50/10">
                <GlassCardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-600">
                      <span className="text-lg">⚠️</span>
                      <span className="font-medium">Conflicts Detected</span>
                    </div>
                    <div className="flex gap-2">
                      <GlassButton
                        onClick={() => resolveConflicts('keep-local')}
                        variant="secondary"
                        size="sm"
                      >
                        Keep Local
                      </GlassButton>
                      <GlassButton
                        onClick={() => resolveConflicts('keep-remote')}
                        variant="secondary"
                        size="sm"
                      >
                        Keep Remote
                      </GlassButton>
                      <GlassButton
                        onClick={clearConflicts}
                        variant="outline"
                        size="sm"
                      >
                        Dismiss
                      </GlassButton>
                    </div>
                  </div>
                  <p className="text-amber-700 text-sm mt-2">
                    {conflicts.length} file(s) have conflicts that need resolution.
                  </p>
                </GlassCardContent>
              </GlassCard>
            </div>
          )}

          {/* Sync Status Display */}
          {syncStatus && !syncStatus.upToDate && (
            <div className="mb-6">
              <GlassCard variant="elevated" className="border-blue-500 bg-blue-50/10">
                <GlassCardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-600">
                      <span className="text-lg">🔄</span>
                      <span className="font-medium">Repository Updates Available</span>
                    </div>
                    <GlassButton
                      onClick={refresh}
                      variant="secondary"
                      size="sm"
                    >
                      Sync
                    </GlassButton>
                  </div>
                  <p className="text-blue-700 text-sm mt-2">
                    {syncStatus.newCommitsCount} new commit(s) available.
                  </p>
                </GlassCardContent>
              </GlassCard>
            </div>
          )}

          {/* Content Editor */}
          {isInitialized && localPortfolioData !== null && (
            <ContentEditor
              owner={owner}
              repo={repo}
              initialData={localPortfolioData}
              repositoryStructure={editorData?.structure}
              onSave={handleSave}
              onChange={handleContentChange}
              initialCommitSha={editorData?.commit?.sha}
              autoSave={true}
              validationOptions={{
                strictMode: false,
                validateOnChange: true
              }}
              autoSaveOptions={{
                saveInterval: 2000,
                enableConflictDetection: true,
                maxRetries: 3
              }}
              integrationOptions={{
                enableLivePreview: true,
                showSaveHistory: true,
                saveHistory: saveHistory
              }}
            />
          )}

          {/* Footer */}
          <div className="mt-12 text-center text-text-3 text-sm">
            <p>
              Changes are saved automatically to your GitHub repository.{' '}
              <a 
                href={`https://github.com/${owner}/${repo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-1 hover:underline"
              >
                View on GitHub
              </a>
            </p>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

export default PortfolioEditorPage;