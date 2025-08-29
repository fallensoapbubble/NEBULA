/**
 * Content Editor
 * Main component that combines dynamic form generation, validation, and auto-save
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DynamicFormGenerator } from './DynamicFormGenerator.js';
import { useContentValidation } from './ContentValidator.js';
import { useAutoSave, AutoSaveStatus } from './AutoSaveManager.js';
import { useRealTimeValidation, ValidationSummary, InlineValidationFeedback } from './RealTimeValidator.js';
import { LivePreview, useLivePreview } from './LivePreview.js';
import { useUnsavedChanges, UnsavedChangesWarning, ChangeHistory, AutoSaveStatus as UnsavedAutoSaveStatus } from './UnsavedChangesTracker.js';
import { GlassCard, GlassCardHeader, GlassCardContent, GlassCardTitle } from '../ui/Card.js';
import { GlassButton } from '../ui/Button.js';
import { STANDARD_PORTFOLIO_SCHEMA } from '../../lib/portfolio-data-standardizer.js';

/**
 * Content Editor Component
 * @param {Object} props
 * @param {string} props.owner - Repository owner
 * @param {string} props.repo - Repository name
 * @param {Object} props.initialData - Initial portfolio data
 * @param {Object} props.repositoryStructure - Repository file structure
 * @param {Function} props.onSave - Save function
 * @param {Function} props.onChange - Change callback function
 * @param {Function} props.onConflictCheck - Conflict check function
 * @param {string} props.initialCommitSha - Initial commit SHA
 * @param {boolean} props.autoSave - Enable auto-save (default: true)
 * @param {Object} props.validationOptions - Validation options
 * @param {Object} props.autoSaveOptions - Auto-save options
 * @param {Object} props.integrationOptions - Integration options
 */
export const ContentEditor = ({
  owner,
  repo,
  initialData = {},
  repositoryStructure = {},
  onSave,
  onChange,
  onConflictCheck,
  initialCommitSha,
  autoSave = true,
  validationOptions = {},
  autoSaveOptions = {},
  integrationOptions = {}
}) => {
  const [portfolioData, setPortfolioData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(integrationOptions.enableLivePreview || false);
  const [showValidationDetails, setShowValidationDetails] = useState(false);

  // Enhanced real-time validation
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
    strictMode: validationOptions.strictMode || false,
    validateOnChange: validationOptions.validateOnChange !== false,
    showSuggestions: true,
    trackHistory: true,
    ...validationOptions
  });

  // Unsaved changes tracking
  const {
    currentData,
    savedData,
    hasUnsavedChanges,
    changeHistory,
    isSaving: isUnsavedChangesSaving,
    lastSaved,
    updateData,
    handleSave: handleUnsavedSave,
    discardChanges,
    getChangeSummary,
    canSave: canSaveUnsaved,
    changeSummary
  } = useUnsavedChanges(initialData, onSave, {
    trackHistory: true,
    enableAutoSave: autoSave,
    autoSaveInterval: autoSaveOptions.saveInterval || 30000,
    warnOnUnload: true
  });

  // Live preview functionality
  const {
    previewData,
    isLoading: isPreviewLoading,
    error: previewError,
    previewMode,
    isPreviewOpen,
    lastUpdate: previewLastUpdate,
    updatePreview,
    openPreview,
    closePreview,
    togglePreviewMode,
    refreshPreview,
    hasPreviewData,
    canPreview
  } = useLivePreview(owner, repo, portfolioData, {
    updateDelay: 1000,
    autoUpdate: true,
    enableModeToggle: true
  });

  // Auto-save configuration
  const autoSaveConfig = useMemo(() => ({
    owner,
    repo,
    saveFunction: async (data) => {
      setIsLoading(true);
      try {
        // Validate data before saving
        const validationResult = await validateAll(data);
        
        if (!validationResult.isValid && validationOptions.strictMode) {
          throw new Error('Validation failed. Please fix errors before saving.');
        }

        // Call the provided save function
        const result = await onSave(data);
        
        if (result.success) {
          setPortfolioData(data);
          return {
            success: true,
            commitSha: result.commitSha,
            message: result.message
          };
        } else {
          throw new Error(result.error || 'Save operation failed');
        }
      } finally {
        setIsLoading(false);
      }
    },
    conflictCheckFunction: onConflictCheck,
    initialCommitSha
  }), [owner, repo, onSave, onConflictCheck, initialCommitSha, validateAll, validationOptions.strictMode]);

  // Auto-save hook
  const {
    scheduleSave,
    forceSave,
    cancelSave,
    resolveConflicts,
    clearError,
    saveStatus,
    lastSaved: autoSaveLastSaved,
    conflicts,
    error,
    isOnline
  } = useAutoSave(autoSaveConfig, {
    saveInterval: 2000,
    enableConflictDetection: true,
    ...autoSaveOptions
  });

  // Update portfolio data when initial data changes
  useEffect(() => {
    setPortfolioData(initialData);
  }, [initialData]);

  // Show conflict dialog when conflicts are detected
  useEffect(() => {
    if (conflicts.length > 0) {
      setShowConflictDialog(true);
    }
  }, [conflicts]);

  // Handle data changes from the form
  const handleDataChange = useCallback(async (fieldPath, value) => {
    // Update local state immediately for responsive UI
    const newData = { ...portfolioData };
    setNestedValue(newData, fieldPath, value);
    setPortfolioData(newData);

    // Update unsaved changes tracker
    updateData(newData, fieldPath);

    // Validate the field with enhanced feedback
    await validateFieldWithFeedback(fieldPath, value, newData);

    // Notify parent component of changes
    if (onChange) {
      onChange(newData);
    }

    // Schedule auto-save if enabled
    if (autoSave) {
      scheduleSave(newData);
    }
  }, [portfolioData, updateData, validateFieldWithFeedback, onChange, autoSave, scheduleSave]);

  // Handle manual save
  const handleManualSave = useCallback(async () => {
    try {
      if (hasUnsavedChanges) {
        const result = await handleUnsavedSave();
        if (result.success) {
          // Update portfolio data to match saved data
          setPortfolioData(currentData);
        }
        return result;
      }
      return { success: true, message: 'No changes to save' };
    } catch (error) {
      console.error('Manual save failed:', error);
      return { success: false, error: error.message };
    }
  }, [hasUnsavedChanges, handleUnsavedSave, currentData]);

  // Handle conflict resolution
  const handleConflictResolution = useCallback((resolution) => {
    setShowConflictDialog(false);
    
    switch (resolution.action) {
      case 'keep_local':
        resolveConflicts({ data: portfolioData });
        break;
      
      case 'keep_remote':
        // Refresh data from remote and resolve
        if (resolution.remoteData) {
          setPortfolioData(resolution.remoteData);
          resolveConflicts({ data: resolution.remoteData });
        }
        break;
      
      case 'manual':
        // User will manually resolve conflicts
        if (resolution.mergedData) {
          setPortfolioData(resolution.mergedData);
          resolveConflicts({ data: resolution.mergedData });
        }
        break;
      
      default:
        // Cancel - just close dialog
        break;
    }
  }, [portfolioData, resolveConflicts]);

  // Handle retry after error
  const handleRetry = useCallback(() => {
    clearError();
    if (portfolioData) {
      scheduleSave(portfolioData, true);
    }
  }, [clearError, portfolioData, scheduleSave]);

  return (
    <div className="content-editor">
      {/* Editor Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-1">Portfolio Editor</h1>
            <p className="text-text-2 mt-1">
              Editing {owner}/{repo}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Validation Summary */}
            <ValidationSummary
              validationSummary={getValidationSummary()}
              onViewDetails={() => setShowValidationDetails(!showValidationDetails)}
              className="mr-2"
            />

            {/* Preview Toggle */}
            {integrationOptions.enableLivePreview && (
              <GlassButton
                onClick={() => setShowPreview(!showPreview)}
                variant={showPreview ? "primary" : "secondary"}
                size="sm"
              >
                {showPreview ? "Hide Preview" : "Show Preview"}
              </GlassButton>
            )}

            {/* Auto-save status */}
            <UnsavedAutoSaveStatus
              isEnabled={autoSave}
              lastSaved={lastSaved || autoSaveLastSaved}
              isSaving={isUnsavedChangesSaving || isLoading}
              hasUnsavedChanges={hasUnsavedChanges}
            />
            
            {/* Manual save button */}
            <GlassButton
              onClick={handleManualSave}
              disabled={!canSaveUnsaved || isLoading}
              loading={isUnsavedChangesSaving || isLoading}
              variant="primary"
            >
              Save Changes
            </GlassButton>
          </div>
        </div>

        {/* Unsaved Changes Warning */}
        <div className="mt-4">
          <UnsavedChangesWarning
            hasUnsavedChanges={hasUnsavedChanges}
            changeSummary={changeSummary}
            onSave={handleManualSave}
            onDiscard={discardChanges}
            isSaving={isUnsavedChangesSaving || isLoading}
          />
        </div>

        {/* Network status indicator */}
        {!isOnline && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 text-amber-800">
              <span>📡</span>
              <span className="text-sm">
                You&apos;re currently offline. Changes will be saved automatically when your connection is restored.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Editor Layout */}
      <div className={`grid gap-6 ${showPreview ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Editor Panel */}
        <div className="editor-panel">
          {/* Validation Details */}
          {showValidationDetails && (
            <div className="mb-6">
              <GlassCard>
                <GlassCardHeader>
                  <div className="flex items-center justify-between">
                    <GlassCardTitle>Validation Details</GlassCardTitle>
                    <GlassButton
                      onClick={() => setShowValidationDetails(false)}
                      variant="secondary"
                      size="sm"
                    >
                      Hide
                    </GlassButton>
                  </div>
                </GlassCardHeader>
                <GlassCardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-green-500">{completeness}%</div>
                        <div className="text-sm text-text-2">Complete</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-500">
                          {Object.keys(validationState.errors).filter(k => validationState.errors[k]).length}
                        </div>
                        <div className="text-sm text-text-2">Errors</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-amber-500">
                          {Object.values(validationState.warnings).reduce((count, warnings) => count + (warnings?.length || 0), 0)}
                        </div>
                        <div className="text-sm text-text-2">Warnings</div>
                      </div>
                    </div>
                    
                    {integrationOptions.showSaveHistory && changeHistory.length > 0 && (
                      <ChangeHistory
                        changeHistory={changeHistory}
                        maxVisible={5}
                      />
                    )}
                  </div>
                </GlassCardContent>
              </GlassCard>
            </div>
          )}

          {/* Dynamic Form Generator with Enhanced Validation */}
          <DynamicFormGenerator
            portfolioData={portfolioData}
            repositoryStructure={repositoryStructure}
            onDataChange={handleDataChange}
            onSave={handleManualSave}
            autoSave={autoSave}
            validationErrors={validationState.errors}
            validationWarnings={validationState.warnings}
            validationSuggestions={validationState.suggestions}
            getFieldStatus={getFieldStatus}
            isLoading={isLoading || isValidating}
            renderFieldValidation={(fieldPath) => (
              <InlineValidationFeedback
                fieldPath={fieldPath}
                validationStatus={getFieldStatus(fieldPath)}
                showSuggestions={true}
              />
            )}
          />
        </div>

        {/* Live Preview Panel */}
        {showPreview && (
          <div className="preview-panel">
            <LivePreview
              owner={owner}
              repo={repo}
              portfolioData={portfolioData}
              embedded={true}
              showControls={true}
            />
          </div>
        )}
      </div>

      {/* Conflict Resolution Dialog */}
      {showConflictDialog && (
        <ConflictResolutionDialog
          conflicts={conflicts}
          localData={portfolioData}
          onResolve={handleConflictResolution}
          onCancel={() => setShowConflictDialog(false)}
        />
      )}
    </div>
  );
};

/**
 * Conflict Resolution Dialog Component
 */
const ConflictResolutionDialog = ({ 
  conflicts, 
  localData, 
  onResolve, 
  onCancel 
}) => {
  const [selectedResolution, setSelectedResolution] = useState('keep_local');
  const [mergedData, setMergedData] = useState(localData);

  const handleResolve = () => {
    onResolve({
      action: selectedResolution,
      localData,
      mergedData: selectedResolution === 'manual' ? mergedData : undefined
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <GlassCard className="max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <GlassCardHeader>
          <GlassCardTitle>Resolve Conflicts</GlassCardTitle>
          <p className="text-text-2 text-sm mt-2">
            Your portfolio has been modified externally. Choose how to resolve the conflicts:
          </p>
        </GlassCardHeader>

        <GlassCardContent>
          <div className="space-y-6">
            {/* Conflict Summary */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-800 mb-2">
                {conflicts.length} conflict(s) detected:
              </h4>
              <ul className="text-sm text-red-700 space-y-1">
                {conflicts.map((conflict, index) => (
                  <li key={index}>
                    • {conflict.path}: {conflict.description}
                  </li>
                ))}
              </ul>
            </div>

            {/* Resolution Options */}
            <div className="space-y-3">
              <h4 className="font-medium text-text-1">Choose resolution strategy:</h4>
              
              <label className="flex items-start gap-3 p-3 border border-border-1 rounded-lg cursor-pointer hover:bg-glass-1">
                <input
                  type="radio"
                  name="resolution"
                  value="keep_local"
                  checked={selectedResolution === 'keep_local'}
                  onChange={(e) => setSelectedResolution(e.target.value)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-text-1">Keep My Changes</div>
                  <div className="text-sm text-text-2">
                    Overwrite remote changes with your local modifications
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border border-border-1 rounded-lg cursor-pointer hover:bg-glass-1">
                <input
                  type="radio"
                  name="resolution"
                  value="keep_remote"
                  checked={selectedResolution === 'keep_remote'}
                  onChange={(e) => setSelectedResolution(e.target.value)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-text-1">Use Remote Changes</div>
                  <div className="text-sm text-text-2">
                    Discard your local changes and use the remote version
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border border-border-1 rounded-lg cursor-pointer hover:bg-glass-1">
                <input
                  type="radio"
                  name="resolution"
                  value="manual"
                  checked={selectedResolution === 'manual'}
                  onChange={(e) => setSelectedResolution(e.target.value)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-text-1">Manual Resolution</div>
                  <div className="text-sm text-text-2">
                    Manually merge the changes (advanced)
                  </div>
                </div>
              </label>
            </div>

            {/* Manual Resolution Interface */}
            {selectedResolution === 'manual' && (
              <div className="border border-border-1 rounded-lg p-4">
                <h5 className="font-medium text-text-1 mb-3">Manual Merge</h5>
                <p className="text-sm text-text-2 mb-3">
                  Review and edit the merged data below:
                </p>
                <textarea
                  value={JSON.stringify(mergedData, null, 2)}
                  onChange={(e) => {
                    try {
                      setMergedData(JSON.parse(e.target.value));
                    } catch {
                      // Invalid JSON, don't update
                    }
                  }}
                  className="w-full h-40 p-3 border border-border-1 rounded font-mono text-sm"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border-1">
              <GlassButton
                variant="secondary"
                onClick={onCancel}
              >
                Cancel
              </GlassButton>
              <GlassButton
                variant="primary"
                onClick={handleResolve}
              >
                Resolve Conflicts
              </GlassButton>
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>
    </div>
  );
};

// Utility function to set nested values
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((current, key) => {
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    return current[key];
  }, obj);
  target[lastKey] = value;
}

export default ContentEditor;