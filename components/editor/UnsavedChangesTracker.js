/**
 * Unsaved Changes Tracker
 * Tracks and manages unsaved changes with warnings and auto-save
 * Enhanced for task 8.3: Real-Time Validation + Preview
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GlassCard, GlassCardContent } from '../ui/Card.js';
import { GlassButton } from '../ui/Button.js';
import { useValidation } from './ValidationProvider.js';

/**
 * Unsaved Changes Hook
 * Tracks changes and provides save/discard functionality
 */
export function useUnsavedChanges(initialData, onSave, options = {}) {
  const [currentData, setCurrentData] = useState(initialData);
  const [savedData, setSavedData] = useState(initialData);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [changeHistory, setChangeHistory] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  const config = {
    trackHistory: true,
    maxHistorySize: 50,
    autoSaveInterval: 30000, // 30 seconds
    enableAutoSave: false,
    warnOnUnload: true,
    ...options
  };

  const autoSaveTimeoutRef = useRef(null);
  const changeTimeoutRef = useRef(null);

  /**
   * Deep comparison to detect changes
   */
  const hasChanges = useCallback((current, saved) => {
    return JSON.stringify(current) !== JSON.stringify(saved);
  }, []);

  /**
   * Update current data and track changes
   */
  const updateData = useCallback((newData, fieldPath = null) => {
    setCurrentData(newData);
    
    const hasChangesNow = hasChanges(newData, savedData);
    setHasUnsavedChanges(hasChangesNow);

    // Track change in history
    if (config.trackHistory && hasChangesNow) {
      const changeEntry = {
        timestamp: new Date().toISOString(),
        fieldPath,
        type: fieldPath ? 'field_change' : 'bulk_change',
        hasChanges: hasChangesNow
      };

      setChangeHistory(prev => [
        changeEntry,
        ...prev.slice(0, config.maxHistorySize - 1)
      ]);
    }

    // Schedule auto-save if enabled
    if (config.enableAutoSave && hasChangesNow) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      autoSaveTimeoutRef.current = setTimeout(() => {
        handleSave(true); // Auto-save
      }, config.autoSaveInterval);
    }
  }, [savedData, hasChanges, config.trackHistory, config.maxHistorySize, config.enableAutoSave, config.autoSaveInterval]);

  /**
   * Save changes
   */
  const handleSave = useCallback(async (isAutoSave = false) => {
    if (!hasUnsavedChanges || isSaving) return;

    setIsSaving(true);

    try {
      const result = await onSave(currentData, { isAutoSave });
      
      if (result.success) {
        setSavedData(currentData);
        setHasUnsavedChanges(false);
        setLastSaved(new Date());

        // Clear auto-save timeout
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
          autoSaveTimeoutRef.current = null;
        }

        // Add save entry to history
        if (config.trackHistory) {
          setChangeHistory(prev => [
            {
              timestamp: new Date().toISOString(),
              type: isAutoSave ? 'auto_save' : 'manual_save',
              hasChanges: false
            },
            ...prev.slice(0, config.maxHistorySize - 1)
          ]);
        }

        return { success: true };
      } else {
        throw new Error(result.error || 'Save failed');
      }
    } catch (error) {
      console.error('Save failed:', error);
      return { success: false, error: error.message };
    } finally {
      setIsSaving(false);
    }
  }, [currentData, hasUnsavedChanges, isSaving, onSave, config.trackHistory, config.maxHistorySize]);

  /**
   * Discard changes
   */
  const discardChanges = useCallback(() => {
    setCurrentData(savedData);
    setHasUnsavedChanges(false);
    
    // Clear auto-save timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }

    // Add discard entry to history
    if (config.trackHistory) {
      setChangeHistory(prev => [
        {
          timestamp: new Date().toISOString(),
          type: 'discard_changes',
          hasChanges: false
        },
        ...prev.slice(0, config.maxHistorySize - 1)
      ]);
    }
  }, [savedData, config.trackHistory, config.maxHistorySize]);

  /**
   * Get change summary
   */
  const getChangeSummary = useCallback(() => {
    if (!hasUnsavedChanges) {
      return {
        hasChanges: false,
        changeCount: 0,
        lastChange: null,
        timeSinceLastSave: null
      };
    }

    const lastChange = changeHistory.find(entry => entry.type === 'field_change' || entry.type === 'bulk_change');
    const changeCount = changeHistory.filter(entry => 
      entry.type === 'field_change' || entry.type === 'bulk_change'
    ).length;

    const timeSinceLastSave = lastSaved 
      ? Date.now() - lastSaved.getTime()
      : null;

    return {
      hasChanges: true,
      changeCount,
      lastChange: lastChange ? new Date(lastChange.timestamp) : null,
      timeSinceLastSave
    };
  }, [hasUnsavedChanges, changeHistory, lastSaved]);

  // Update initial data when it changes externally
  useEffect(() => {
    if (!hasUnsavedChanges) {
      setCurrentData(initialData);
      setSavedData(initialData);
    }
  }, [initialData, hasUnsavedChanges]);

  // Warn user before leaving page with unsaved changes
  useEffect(() => {
    if (!config.warnOnUnload) return;

    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, config.warnOnUnload]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      if (changeTimeoutRef.current) {
        clearTimeout(changeTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    currentData,
    savedData,
    hasUnsavedChanges,
    changeHistory,
    isSaving,
    lastSaved,

    // Methods
    updateData,
    handleSave,
    discardChanges,
    getChangeSummary,

    // Computed values
    canSave: hasUnsavedChanges && !isSaving,
    changeSummary: getChangeSummary()
  };
}

/**
 * Enhanced Unsaved Changes Warning Component with Validation
 */
export const UnsavedChangesWarning = ({ 
  hasUnsavedChanges, 
  changeSummary,
  onSave, 
  onDiscard,
  isSaving,
  className = '' 
}) => {
  const validation = useValidation();
  
  if (!hasUnsavedChanges) return null;

  const formatTimeSince = (ms) => {
    if (!ms) return '';
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  };

  // Determine warning level based on validation status
  const getWarningLevel = () => {
    if (validation.hasErrors) return 'error';
    if (validation.hasWarnings) return 'warning';
    return 'info';
  };

  const warningLevel = getWarningLevel();
  const warningColors = {
    error: {
      border: 'border-red-500',
      bg: 'bg-red-50/10',
      icon: '❌',
      iconColor: 'text-red-500',
      titleColor: 'text-red-600',
      textColor: 'text-red-700'
    },
    warning: {
      border: 'border-amber-500',
      bg: 'bg-amber-50/10',
      icon: '⚠️',
      iconColor: 'text-amber-500',
      titleColor: 'text-amber-600',
      textColor: 'text-amber-700'
    },
    info: {
      border: 'border-blue-500',
      bg: 'bg-blue-50/10',
      icon: '💾',
      iconColor: 'text-blue-500',
      titleColor: 'text-blue-600',
      textColor: 'text-blue-700'
    }
  };

  const colors = warningColors[warningLevel];

  return (
    <div className={`unsaved-changes-warning ${className}`}>
      <GlassCard variant="elevated" className={`${colors.border} ${colors.bg}`}>
        <GlassCardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`${colors.iconColor} text-lg`}>{colors.icon}</span>
              <div>
                <div className={`font-medium ${colors.titleColor}`}>
                  Unsaved Changes
                  {validation.hasErrors && ' (Has Errors)'}
                  {validation.hasWarnings && !validation.hasErrors && ' (Has Warnings)'}
                </div>
                <div className={`text-sm ${colors.textColor}`}>
                  {changeSummary.changeCount} change{changeSummary.changeCount !== 1 ? 's' : ''}
                  {changeSummary.lastChange && (
                    <span className="ml-2">
                      • Last change {formatTimeSince(Date.now() - changeSummary.lastChange.getTime())}
                    </span>
                  )}
                  {changeSummary.timeSinceLastSave && (
                    <span className="ml-2">
                      • Last saved {formatTimeSince(changeSummary.timeSinceLastSave)}
                    </span>
                  )}
                  {validation.validationEnabled && (
                    <span className="ml-2">
                      • {validation.completeness}% complete
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Validation Status Indicator */}
              {validation.validationEnabled && (
                <div className="flex items-center gap-1 px-2 py-1 bg-surface-2 rounded text-xs">
                  <span className="text-xs">
                    {validation.isValid ? '✅' : validation.hasErrors ? '❌' : '⚠️'}
                  </span>
                  <span className="text-text-2">
                    {validation.isValid ? 'Valid' : validation.hasErrors ? 'Errors' : 'Warnings'}
                  </span>
                </div>
              )}

              <GlassButton
                onClick={onDiscard}
                variant="secondary"
                size="sm"
                disabled={isSaving}
              >
                Discard
              </GlassButton>
              <GlassButton
                onClick={onSave}
                variant="primary"
                size="sm"
                loading={isSaving}
                disabled={isSaving || (validation.hasErrors && validation.validationEnabled)}
                title={validation.hasErrors ? 'Fix validation errors before saving' : 'Save changes'}
              >
                Save Changes
              </GlassButton>
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>
    </div>
  );
};

/**
 * Change History Component
 */
export const ChangeHistory = ({ 
  changeHistory, 
  maxVisible = 10,
  className = '' 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!changeHistory || changeHistory.length === 0) {
    return null;
  }

  const visibleHistory = isExpanded 
    ? changeHistory 
    : changeHistory.slice(0, maxVisible);

  const getChangeIcon = (type) => {
    switch (type) {
      case 'field_change': return '✏️';
      case 'bulk_change': return '📝';
      case 'manual_save': return '💾';
      case 'auto_save': return '🔄';
      case 'discard_changes': return '🗑️';
      default: return '📋';
    }
  };

  const getChangeDescription = (entry) => {
    switch (entry.type) {
      case 'field_change':
        return `Changed ${entry.fieldPath || 'field'}`;
      case 'bulk_change':
        return 'Multiple changes';
      case 'manual_save':
        return 'Manually saved';
      case 'auto_save':
        return 'Auto-saved';
      case 'discard_changes':
        return 'Discarded changes';
      default:
        return 'Unknown change';
    }
  };

  return (
    <div className={`change-history ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-text-1">Recent Changes</h4>
        {changeHistory.length > maxVisible && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-text-2 hover:text-text-1 underline"
          >
            {isExpanded ? 'Show Less' : `Show All (${changeHistory.length})`}
          </button>
        )}
      </div>

      <div className="space-y-2">
        {visibleHistory.map((entry, index) => (
          <div 
            key={index}
            className="flex items-center gap-3 p-2 bg-surface-1 rounded text-sm"
          >
            <span className="text-base">{getChangeIcon(entry.type)}</span>
            <div className="flex-1">
              <div className="text-text-1">{getChangeDescription(entry)}</div>
              <div className="text-text-3 text-xs">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Auto-Save Status Component
 */
export const AutoSaveStatus = ({ 
  isEnabled, 
  lastSaved, 
  isSaving,
  hasUnsavedChanges,
  nextAutoSave,
  className = '' 
}) => {
  const getStatusText = () => {
    if (isSaving) return 'Saving...';
    if (!isEnabled) return 'Auto-save disabled';
    if (!hasUnsavedChanges && lastSaved) {
      return `Saved ${lastSaved.toLocaleTimeString()}`;
    }
    if (hasUnsavedChanges && nextAutoSave) {
      const timeUntil = Math.max(0, nextAutoSave - Date.now());
      const seconds = Math.ceil(timeUntil / 1000);
      return `Auto-save in ${seconds}s`;
    }
    return 'All changes saved';
  };

  const getStatusIcon = () => {
    if (isSaving) return '🔄';
    if (!isEnabled) return '⏸️';
    if (!hasUnsavedChanges) return '✅';
    return '⏳';
  };

  return (
    <div className={`auto-save-status flex items-center gap-2 text-sm ${className}`}>
      <span className={isSaving ? 'animate-spin' : ''}>{getStatusIcon()}</span>
      <span className="text-text-2">{getStatusText()}</span>
    </div>
  );
};

export default useUnsavedChanges;