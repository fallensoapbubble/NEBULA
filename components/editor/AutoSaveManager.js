/**
 * Auto-Save Manager
 * Handles automatic saving of content changes with conflict detection
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Auto-Save Manager class
 */
export class AutoSaveManager {
  constructor(options = {}) {
    this.options = {
      saveInterval: options.saveInterval || 2000, // 2 seconds
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      conflictCheckInterval: options.conflictCheckInterval || 30000, // 30 seconds
      enableConflictDetection: options.enableConflictDetection !== false,
      ...options
    };

    this.saveTimer = null;
    this.conflictTimer = null;
    this.retryCount = 0;
    this.lastSavedData = null;
    this.lastKnownCommitSha = null;
    this.isOnline = navigator.onLine;
    
    // Event listeners
    this.listeners = {
      save: [],
      conflict: [],
      error: [],
      statusChange: []
    };

    // Setup online/offline detection
    this.setupNetworkListeners();
  }

  /**
   * Initialize auto-save for a repository
   * @param {Object} config - Configuration object
   * @param {string} config.owner - Repository owner
   * @param {string} config.repo - Repository name
   * @param {Function} config.saveFunction - Function to save data
   * @param {Function} config.conflictCheckFunction - Function to check for conflicts
   * @param {string} config.initialCommitSha - Initial commit SHA
   */
  initialize(config) {
    this.config = config;
    this.lastKnownCommitSha = config.initialCommitSha;
    
    if (this.options.enableConflictDetection) {
      this.startConflictDetection();
    }
  }

  /**
   * Schedule a save operation
   * @param {Object} data - Data to save
   * @param {boolean} immediate - Whether to save immediately
   */
  scheduleSave(data, immediate = false) {
    // Clear existing timer
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    // Check if data has actually changed
    if (this.lastSavedData && JSON.stringify(data) === JSON.stringify(this.lastSavedData)) {
      return;
    }

    const saveDelay = immediate ? 0 : this.options.saveInterval;

    this.saveTimer = setTimeout(async () => {
      await this.performSave(data);
    }, saveDelay);

    this.emit('statusChange', { status: 'pending', data });
  }

  /**
   * Perform the actual save operation
   * @private
   */
  async performSave(data) {
    if (!this.isOnline) {
      this.emit('error', { 
        type: 'offline', 
        message: 'Cannot save while offline. Changes will be saved when connection is restored.' 
      });
      return;
    }

    if (!this.config?.saveFunction) {
      this.emit('error', { 
        type: 'config', 
        message: 'Save function not configured' 
      });
      return;
    }

    this.emit('statusChange', { status: 'saving', data });

    try {
      // Check for conflicts before saving
      if (this.options.enableConflictDetection) {
        const conflictResult = await this.checkForConflicts(data);
        if (conflictResult.hasConflicts) {
          this.emit('conflict', {
            conflicts: conflictResult.conflicts,
            data,
            remoteCommits: conflictResult.remoteCommits
          });
          return;
        }
      }

      // Perform the save
      const saveResult = await this.config.saveFunction(data);
      
      if (saveResult.success) {
        this.lastSavedData = data;
        this.retryCount = 0;
        
        // Update commit SHA if provided
        if (saveResult.commitSha) {
          this.lastKnownCommitSha = saveResult.commitSha;
        }

        this.emit('save', { 
          success: true, 
          data, 
          result: saveResult,
          timestamp: new Date().toISOString()
        });
        
        this.emit('statusChange', { status: 'saved', data, timestamp: new Date() });
      } else {
        throw new Error(saveResult.error || 'Save operation failed');
      }

    } catch (error) {
      console.error('Auto-save failed:', error);
      
      // Retry logic
      if (this.retryCount < this.options.maxRetries) {
        this.retryCount++;
        
        setTimeout(() => {
          this.performSave(data);
        }, this.options.retryDelay * this.retryCount);

        this.emit('statusChange', { 
          status: 'retrying', 
          data, 
          attempt: this.retryCount,
          maxRetries: this.options.maxRetries
        });
      } else {
        this.emit('error', {
          type: 'save_failed',
          message: error.message,
          data,
          retryCount: this.retryCount
        });
        
        this.emit('statusChange', { status: 'error', data, error: error.message });
        this.retryCount = 0;
      }
    }
  }

  /**
   * Check for conflicts with remote repository
   * @private
   */
  async checkForConflicts(localData) {
    if (!this.config?.conflictCheckFunction || !this.lastKnownCommitSha) {
      return { hasConflicts: false, conflicts: [] };
    }

    try {
      const result = await this.config.conflictCheckFunction(
        this.config.owner,
        this.config.repo,
        this.extractChangedFiles(localData),
        this.lastKnownCommitSha
      );

      return result;
    } catch (error) {
      console.error('Conflict check failed:', error);
      // Don't block save on conflict check failure
      return { hasConflicts: false, conflicts: [] };
    }
  }

  /**
   * Extract changed files from data (to be implemented based on data structure)
   * @private
   */
  extractChangedFiles(data) {
    // This would need to be implemented based on how the data maps to files
    // For now, return a generic change
    return [{
      path: 'data.json',
      content: JSON.stringify(data, null, 2),
      sha: null // Will be determined by the conflict check function
    }];
  }

  /**
   * Start periodic conflict detection
   * @private
   */
  startConflictDetection() {
    if (this.conflictTimer) {
      clearInterval(this.conflictTimer);
    }

    this.conflictTimer = setInterval(async () => {
      if (this.lastSavedData && this.isOnline) {
        const conflictResult = await this.checkForConflicts(this.lastSavedData);
        if (conflictResult.hasConflicts) {
          this.emit('conflict', {
            conflicts: conflictResult.conflicts,
            data: this.lastSavedData,
            remoteCommits: conflictResult.remoteCommits,
            type: 'background_check'
          });
        }
      }
    }, this.options.conflictCheckInterval);
  }

  /**
   * Stop conflict detection
   */
  stopConflictDetection() {
    if (this.conflictTimer) {
      clearInterval(this.conflictTimer);
      this.conflictTimer = null;
    }
  }

  /**
   * Force save immediately
   * @param {Object} data - Data to save
   */
  async forceSave(data) {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    await this.performSave(data);
  }

  /**
   * Cancel pending save
   */
  cancelSave() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.emit('statusChange', { status: 'cancelled' });
  }

  /**
   * Setup network status listeners
   * @private
   */
  setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.emit('statusChange', { status: 'online' });
      
      // Resume auto-save if there's pending data
      if (this.lastSavedData) {
        this.scheduleSave(this.lastSavedData, true);
      }
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.emit('statusChange', { status: 'offline' });
      
      // Cancel pending saves
      if (this.saveTimer) {
        clearTimeout(this.saveTimer);
      }
    });
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  /**
   * Emit event
   * @private
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isOnline: this.isOnline,
      hasPendingSave: !!this.saveTimer,
      lastSavedData: this.lastSavedData,
      lastKnownCommitSha: this.lastKnownCommitSha,
      retryCount: this.retryCount,
      conflictDetectionEnabled: this.options.enableConflictDetection
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    
    if (this.conflictTimer) {
      clearInterval(this.conflictTimer);
    }

    // Remove network listeners
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);

    // Clear listeners
    this.listeners = {
      save: [],
      conflict: [],
      error: [],
      statusChange: []
    };
  }
}

/**
 * React hook for auto-save functionality
 */
export function useAutoSave(config, options = {}) {
  const [autoSaveManager] = useState(() => new AutoSaveManager(options));
  const [saveStatus, setSaveStatus] = useState('idle');
  const [lastSaved, setLastSaved] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [error, setError] = useState(null);
  const configRef = useRef(config);

  // Update config ref when config changes
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Initialize auto-save manager
  useEffect(() => {
    if (config) {
      autoSaveManager.initialize(config);
    }

    // Setup event listeners
    const handleSave = (data) => {
      setLastSaved(data.timestamp);
      setError(null);
    };

    const handleConflict = (data) => {
      setConflicts(data.conflicts);
      setSaveStatus('conflict');
    };

    const handleError = (data) => {
      setError(data);
      setSaveStatus('error');
    };

    const handleStatusChange = (data) => {
      setSaveStatus(data.status);
      if (data.status === 'saved') {
        setLastSaved(data.timestamp);
        setError(null);
      }
    };

    autoSaveManager.on('save', handleSave);
    autoSaveManager.on('conflict', handleConflict);
    autoSaveManager.on('error', handleError);
    autoSaveManager.on('statusChange', handleStatusChange);

    return () => {
      autoSaveManager.off('save', handleSave);
      autoSaveManager.off('conflict', handleConflict);
      autoSaveManager.off('error', handleError);
      autoSaveManager.off('statusChange', handleStatusChange);
    };
  }, [autoSaveManager, config]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      autoSaveManager.destroy();
    };
  }, [autoSaveManager]);

  const scheduleSave = useCallback((data, immediate = false) => {
    autoSaveManager.scheduleSave(data, immediate);
  }, [autoSaveManager]);

  const forceSave = useCallback(async (data) => {
    return autoSaveManager.forceSave(data);
  }, [autoSaveManager]);

  const cancelSave = useCallback(() => {
    autoSaveManager.cancelSave();
  }, [autoSaveManager]);

  const resolveConflicts = useCallback((resolution) => {
    // Clear conflicts and resume auto-save
    setConflicts([]);
    setSaveStatus('idle');
    
    // If resolution includes data, schedule save
    if (resolution.data) {
      scheduleSave(resolution.data, true);
    }
  }, [scheduleSave]);

  const clearError = useCallback(() => {
    setError(null);
    setSaveStatus('idle');
  }, []);

  return {
    scheduleSave,
    forceSave,
    cancelSave,
    resolveConflicts,
    clearError,
    saveStatus,
    lastSaved,
    conflicts,
    error,
    isOnline: autoSaveManager.isOnline,
    getStatus: () => autoSaveManager.getStatus()
  };
}

/**
 * Auto-Save Status Component
 * Displays the current auto-save status to the user
 */
export const AutoSaveStatus = ({ 
  saveStatus, 
  lastSaved, 
  error, 
  conflicts, 
  onResolveConflicts,
  onRetry,
  className = '' 
}) => {
  const getStatusDisplay = () => {
    switch (saveStatus) {
      case 'pending':
        return {
          icon: '⏳',
          text: 'Changes pending...',
          className: 'text-amber-500'
        };
      
      case 'saving':
        return {
          icon: '💾',
          text: 'Saving changes...',
          className: 'text-blue-500'
        };
      
      case 'saved':
        return {
          icon: '✅',
          text: lastSaved ? `Saved ${formatTimeAgo(lastSaved)}` : 'All changes saved',
          className: 'text-green-500'
        };
      
      case 'retrying':
        return {
          icon: '🔄',
          text: 'Retrying save...',
          className: 'text-amber-500'
        };
      
      case 'conflict':
        return {
          icon: '⚠️',
          text: `${conflicts.length} conflict(s) detected`,
          className: 'text-red-500'
        };
      
      case 'error':
        return {
          icon: '❌',
          text: error?.message || 'Save failed',
          className: 'text-red-500'
        };
      
      case 'offline':
        return {
          icon: '📡',
          text: 'Offline - changes will save when online',
          className: 'text-gray-500'
        };
      
      default:
        return {
          icon: '💤',
          text: 'Ready',
          className: 'text-gray-500'
        };
    }
  };

  const status = getStatusDisplay();

  return (
    <div className={`auto-save-status flex items-center gap-2 text-sm ${className}`}>
      <span className="text-lg">{status.icon}</span>
      <span className={status.className}>{status.text}</span>
      
      {saveStatus === 'conflict' && onResolveConflicts && (
        <button
          onClick={onResolveConflicts}
          className="ml-2 px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
        >
          Resolve
        </button>
      )}
      
      {saveStatus === 'error' && onRetry && (
        <button
          onClick={onRetry}
          className="ml-2 px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
        >
          Retry
        </button>
      )}
    </div>
  );
};

// Utility function to format time ago
function formatTimeAgo(timestamp) {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now - time;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);

  if (diffSecs < 60) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else {
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ago`;
  }
}

export default AutoSaveManager;