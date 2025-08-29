/**
 * Editor Components Index
 * Exports all editor-related components
 */

// Core Editor Components
export { EditorLayout } from './EditorLayout.js';
export { EditorProvider, useEditor, useEditorState, useEditorDispatch, editorActions } from './EditorContext.js';
export { ContentEditor } from './ContentEditor.js';

// Form and Input Components
export { DynamicFormGenerator } from './DynamicFormGenerator.js';
export { MarkdownEditor } from './MarkdownEditor.js';
export { ArrayEditor } from './ArrayEditor.js';
export { ObjectEditor } from './ObjectEditor.js';
export { ImageUpload, ImageGallery } from './ImageUpload.js';

// Validation Components (Task 8.3)
export { ContentValidator, useContentValidation } from './ContentValidator.js';
export { useRealTimeValidation, InlineValidationFeedback, ValidationSummary } from './RealTimeValidator.js';
export { ValidationProvider, useValidation } from './ValidationProvider.js';

// Preview Components (Task 8.3)
export { LivePreview, useLivePreview } from './LivePreview.js';
export { PreviewPane } from './PreviewPane.js';

// Integration Components (Task 8.3)
export { ValidationPreviewIntegration } from './ValidationPreviewIntegration.js';

// State Management
export { AutoSaveManager, useAutoSave, AutoSaveStatus } from './AutoSaveManager.js';
export { useUnsavedChanges, UnsavedChangesWarning, ChangeHistory } from './UnsavedChangesTracker.js';
export { UnsavedChangesManager } from './UnsavedChangesManager.js';

// Repository Integration
export { ConflictResolutionInterface } from './ConflictResolutionInterface.js';
export { 
  RepositoryUpdateNotification, 
  RepositoryUpdateBadge, 
  RepositoryStatusIndicator 
} from './RepositoryUpdateNotification.js';
export { useRepositoryRefresh, useRepositoryRefreshWithAutoSave } from './useRepositoryRefresh.js';

// Re-export for convenience
export default ContentEditor;