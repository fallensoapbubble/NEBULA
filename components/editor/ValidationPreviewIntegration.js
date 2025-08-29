/**
 * Validation Preview Integration
 * Integrates real-time validation with live preview
 * Implements task 8.3: Real-Time Validation + Preview
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useValidation } from './ValidationProvider.js';
import { useEditor } from './EditorContext.js';
import { InlineValidationFeedback } from './RealTimeValidator.js';
import { UnsavedChangesWarning } from './UnsavedChangesTracker.js';
import { PreviewPane } from './PreviewPane.js';
import { GlassCard, GlassCardHeader, GlassCardContent } from '../ui/Card.js';
import { GlassButton } from '../ui/Button.js';

/**
 * Main Validation Preview Integration Component
 */
export const ValidationPreviewIntegration = ({ className = '' }) => {
  const { state: editorState } = useEditor();
  const validation = useValidation();
  const [activePanel, setActivePanel] = useState('editor'); // 'editor' | 'preview' | 'validation'
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  // Check for unsaved changes
  const hasUnsavedChanges = Object.keys(editorState.content.unsavedChanges).length > 0;

  // Show unsaved changes warning when there are changes
  useEffect(() => {
    setShowUnsavedWarning(hasUnsavedChanges);
  }, [hasUnsavedChanges]);

  /**
   * Handle panel switching
   */
  const handlePanelSwitch = useCallback((panel) => {
    setActivePanel(panel);
  }, []);

  /**
   * Handle save action
   */
  const handleSave = useCallback(async () => {
    // This would integrate with the actual save functionality
    console.log('Saving changes...');
    // For now, just simulate save
    return { success: true };
  }, []);

  /**
   * Handle discard action
   */
  const handleDiscard = useCallback(() => {
    // This would integrate with the actual discard functionality
    console.log('Discarding changes...');
  }, []);

  return (
    <div className={`validation-preview-integration ${className}`}>
      {/* Unsaved Changes Warning */}
      {showUnsavedWarning && (
        <div className="mb-4">
          <UnsavedChangesWarning
            hasUnsavedChanges={hasUnsavedChanges}
            changeSummary={{
              changeCount: Object.keys(editorState.content.unsavedChanges).length,
              lastChange: new Date(),
              timeSinceLastSave: null
            }}
            onSave={handleSave}
            onDiscard={handleDiscard}
            isSaving={editorState.ui.saving}
          />
        </div>
      )}

      {/* Panel Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center bg-surface-2 rounded-lg p-1">
          <button
            onClick={() => handlePanelSwitch('editor')}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              activePanel === 'editor' 
                ? 'bg-accent-primary text-white' 
                : 'text-text-2 hover:text-text-1'
            }`}
          >
            Editor
          </button>
          <button
            onClick={() => handlePanelSwitch('preview')}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              activePanel === 'preview' 
                ? 'bg-accent-primary text-white' 
                : 'text-text-2 hover:text-text-1'
            }`}
          >
            Preview
          </button>
          <button
            onClick={() => handlePanelSwitch('validation')}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              activePanel === 'validation' 
                ? 'bg-accent-primary text-white' 
                : 'text-text-2 hover:text-text-1'
            }`}
          >
            Validation
          </button>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-4">
          {/* Validation Status */}
          {validation.validationEnabled && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-2">Validation:</span>
              <div className="flex items-center gap-1">
                <span className="text-sm">
                  {validation.isValid ? '✅' : validation.hasErrors ? '❌' : '⚠️'}
                </span>
                <span className={`text-sm ${
                  validation.isValid ? 'text-green-500' : 
                  validation.hasErrors ? 'text-red-500' : 'text-amber-500'
                }`}>
                  {validation.isValid ? 'Valid' : 
                   validation.hasErrors ? 'Has Errors' : 'Has Warnings'}
                </span>
              </div>
            </div>
          )}

          {/* Preview Status */}
          {validation.previewEnabled && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-2">Preview:</span>
              <div className="flex items-center gap-1">
                <span className="text-sm">
                  {validation.previewLoading ? '🔄' : 
                   validation.previewError ? '❌' : 
                   validation.canPreview ? '✅' : '⏸️'}
                </span>
                <span className={`text-sm ${
                  validation.previewLoading ? 'text-blue-500' :
                  validation.previewError ? 'text-red-500' :
                  validation.canPreview ? 'text-green-500' : 'text-gray-500'
                }`}>
                  {validation.previewLoading ? 'Loading' :
                   validation.previewError ? 'Error' :
                   validation.canPreview ? 'Ready' : 'Disabled'}
                </span>
              </div>
            </div>
          )}

          {/* Completeness */}
          {validation.validationEnabled && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-2">Complete:</span>
              <span className="text-sm font-medium text-text-1">
                {validation.completeness}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Panel Content */}
      <div className="panel-content">
        {activePanel === 'editor' && (
          <EditorPanel />
        )}

        {activePanel === 'preview' && (
          <PreviewPane showValidation={true} />
        )}

        {activePanel === 'validation' && (
          <ValidationPanel />
        )}
      </div>
    </div>
  );
};

/**
 * Editor Panel Component
 */
const EditorPanel = () => {
  const { state: editorState } = useEditor();
  const validation = useValidation();

  return (
    <div className="editor-panel">
      <GlassCard>
        <GlassCardHeader>
          <h3 className="text-lg font-semibold text-text-1">Content Editor</h3>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="space-y-4">
            {/* Current File Info */}
            {editorState.content.currentFile && (
              <div className="bg-surface-1 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-text-1">
                      {editorState.content.currentFile}
                    </h4>
                    <p className="text-sm text-text-2">
                      Currently editing
                    </p>
                  </div>
                  
                  {/* File Validation Status */}
                  {validation.validationEnabled && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {validation.isValid ? '✅' : validation.hasErrors ? '❌' : '⚠️'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Validation Feedback for Current File */}
            {validation.validationEnabled && editorState.content.currentFile && (
              <ValidationFeedbackPanel filePath={editorState.content.currentFile} />
            )}

            {/* Editor placeholder - this would be replaced with actual editor components */}
            <div className="bg-surface-1 rounded-lg p-4 min-h-[300px] border-2 border-dashed border-border">
              <p className="text-text-2 text-center">
                Editor content would appear here
              </p>
              <p className="text-text-3 text-center text-sm mt-2">
                This integrates with existing editor components
              </p>
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>
    </div>
  );
};

/**
 * Validation Panel Component
 */
const ValidationPanel = () => {
  const validation = useValidation();

  if (!validation.validationEnabled) {
    return (
      <div className="validation-panel">
        <GlassCard>
          <GlassCardContent className="text-center py-8">
            <div className="text-text-3 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-text-2 mb-4">Validation is disabled</p>
            <GlassButton onClick={validation.toggleValidation}>
              Enable Validation
            </GlassButton>
          </GlassCardContent>
        </GlassCard>
      </div>
    );
  }

  const validationSummary = validation.getOverallValidationSummary();

  return (
    <div className="validation-panel">
      <GlassCard>
        <GlassCardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text-1">Validation Results</h3>
            <GlassButton
              onClick={validation.validateAll}
              size="sm"
              variant="secondary"
              loading={validation.isValidating}
            >
              Re-validate
            </GlassButton>
          </div>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="space-y-6">
            {/* Overall Status */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-surface-1 rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">
                  {validation.isValid ? '✅' : validation.hasErrors ? '❌' : '⚠️'}
                </div>
                <div className="text-sm font-medium text-text-1">
                  {validation.isValid ? 'Valid' : validation.hasErrors ? 'Has Errors' : 'Has Warnings'}
                </div>
              </div>

              <div className="bg-surface-1 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-text-1 mb-2">
                  {validation.completeness}%
                </div>
                <div className="text-sm text-text-2">Complete</div>
              </div>

              <div className="bg-surface-1 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-500 mb-2">
                  {validationSummary?.errorCount || 0}
                </div>
                <div className="text-sm text-text-2">Errors</div>
              </div>

              <div className="bg-surface-1 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-amber-500 mb-2">
                  {validationSummary?.warningCount || 0}
                </div>
                <div className="text-sm text-text-2">Warnings</div>
              </div>
            </div>

            {/* Validation History */}
            {validation.validationHistory && validation.validationHistory.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-text-1 mb-3">Recent Validations</h4>
                <div className="space-y-2">
                  {validation.validationHistory.slice(0, 5).map((entry, index) => (
                    <div key={index} className="flex items-center justify-between bg-surface-1 rounded p-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm">
                          {entry.isValid ? '✅' : entry.errorCount > 0 ? '❌' : '⚠️'}
                        </span>
                        <div>
                          <div className="text-sm text-text-1">
                            {entry.isValid ? 'Validation passed' : 
                             `${entry.errorCount} errors, ${entry.warningCount} warnings`}
                          </div>
                          <div className="text-xs text-text-3">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-text-2">
                        {entry.completeness}% complete
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </GlassCardContent>
      </GlassCard>
    </div>
  );
};

/**
 * Validation Feedback Panel for specific file
 */
const ValidationFeedbackPanel = ({ filePath }) => {
  const validation = useValidation();
  const fieldStatus = validation.getFieldValidationStatus(filePath);

  if (!fieldStatus) {
    return (
      <div className="bg-surface-1 rounded-lg p-3">
        <p className="text-sm text-text-2">No validation feedback available</p>
      </div>
    );
  }

  return (
    <div className="validation-feedback-panel">
      <InlineValidationFeedback
        fieldPath={filePath}
        validationStatus={fieldStatus}
        showSuggestions={true}
        className="bg-surface-1 rounded-lg p-3"
      />
    </div>
  );
};

export default ValidationPreviewIntegration;