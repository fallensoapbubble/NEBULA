/**
 * Unsaved Changes Manager
 * Handles preservation and restoration of unsaved user changes
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '../../lib/logger.js';

/**
 * Unsaved Changes Manager Class
 */
export class UnsavedChangesManager {
  constructor(options = {}) {
    this.options = {
      storageKey: options.storageKey || 'unsaved_changes',
      maxStorageSize: options.maxStorageSize || 5 * 1024 * 1024, // 5MB
      compressionEnabled: options.compressionEnabled !== false,
      autoCleanupAge: options.autoCleanupAge || 7 * 24 * 60 * 60 * 1000, // 7 days
      ...options
    };

    this.changes = new Map();
    this.listeners = new Map();
    this.storageTimer = null;

    // Initialize from storage
    this.loadFromStorage();
    
    // Setup auto-cleanup
    this.setupAutoCleanup();
  }

  /**
   * Set unsaved changes for a repository
   * @param {string} repoKey - Repository key (owner/repo)
   * @param {string} filePath - File path
   * @param {any} content - File content
   * @param {Object} metadata - Additional metadata
   */
  setUnsavedChange(repoKey, filePath, content, metadata = {}) {
    if (!this.changes.has(repoKey)) {
      this.changes.set(repoKey, new Map());
    }

    const repoChanges = this.changes.get(repoKey);
    const changeData = {
      content,
      metadata: {
        ...metadata,
        modified_at: new Date().toISOString(),
        original_sha: metadata.original_sha || null,
        file_type: this.detectFileType(filePath),
        size: this.calculateSize(content)
      }
    };

    repoChanges.set(filePath, changeData);
    
    // Emit change event
    this.emitChange(repoKey, filePath, changeData);
    
    // Schedule storage update
    this.scheduleStorageUpdate();

    logger.debug('Unsaved change recorded', {
      repoKey,
      filePath,
      size: changeData.metadata.size
    });
  }

  /**
   * Get unsaved changes for a repository
   * @param {string} repoKey - Repository key
   * @param {string} filePath - Optional specific file path
   * @returns {Object|Map} Unsaved changes
   */
  getUnsavedChanges(repoKey, filePath = null) {
    const repoChanges = this.changes.get(repoKey);
    
    if (!repoChanges) {
      return filePath ? null : new Map();
    }

    if (filePath) {
      return repoChanges.get(filePath) || null;
    }

    return new Map(repoChanges);
  }

  /**
   * Check if there are unsaved changes
   * @param {string} repoKey - Repository key
   * @param {string} filePath - Optional specific file path
   * @returns {boolean} Whether there are unsaved changes
   */
  hasUnsavedChanges(repoKey, filePath = null) {
    const repoChanges = this.changes.get(repoKey);
    
    if (!repoChanges || repoChanges.size === 0) {
      return false;
    }

    if (filePath) {
      return repoChanges.has(filePath);
    }

    return true;
  }

  /**
   * Clear unsaved changes
   * @param {string} repoKey - Repository key
   * @param {string|Array<string>} filePaths - Optional specific file paths
   */
  clearUnsavedChanges(repoKey, filePaths = null) {
    const repoChanges = this.changes.get(repoKey);
    
    if (!repoChanges) {
      return;
    }

    if (filePaths) {
      const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
      paths.forEach(path => {
        if (repoChanges.has(path)) {
          repoChanges.delete(path);
          this.emitChange(repoKey, path, null, 'cleared');
        }
      });
    } else {
      // Clear all changes for repository
      const clearedPaths = Array.from(repoChanges.keys());
      repoChanges.clear();
      
      clearedPaths.forEach(path => {
        this.emitChange(repoKey, path, null, 'cleared');
      });
    }

    // Clean up empty repository entries
    if (repoChanges.size === 0) {
      this.changes.delete(repoKey);
    }

    this.scheduleStorageUpdate();

    logger.debug('Unsaved changes cleared', {
      repoKey,
      filePaths: filePaths || 'all'
    });
  }

  /**
   * Get summary of unsaved changes
   * @param {string} repoKey - Repository key
   * @returns {Object} Summary information
   */
  getChangesSummary(repoKey) {
    const repoChanges = this.changes.get(repoKey);
    
    if (!repoChanges || repoChanges.size === 0) {
      return {
        hasChanges: false,
        fileCount: 0,
        totalSize: 0,
        files: []
      };
    }

    let totalSize = 0;
    const files = [];

    for (const [filePath, changeData] of repoChanges) {
      totalSize += changeData.metadata.size || 0;
      files.push({
        path: filePath,
        modified_at: changeData.metadata.modified_at,
        size: changeData.metadata.size,
        type: changeData.metadata.file_type
      });
    }

    return {
      hasChanges: true,
      fileCount: repoChanges.size,
      totalSize,
      files: files.sort((a, b) => new Date(b.modified_at) - new Date(a.modified_at))
    };
  }

  /**
   * Preserve changes before repository refresh
   * @param {string} repoKey - Repository key
   * @returns {Object} Preservation data
   */
  preserveChangesForRefresh(repoKey) {
    const repoChanges = this.changes.get(repoKey);
    
    if (!repoChanges || repoChanges.size === 0) {
      return { hasChanges: false, preservationId: null };
    }

    const preservationId = `refresh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const preservationData = {
      id: preservationId,
      repoKey,
      changes: Object.fromEntries(repoChanges),
      preserved_at: new Date().toISOString(),
      reason: 'repository_refresh'
    };

    // Store preservation data
    this.storePreservationData(preservationId, preservationData);

    logger.info('Changes preserved for refresh', {
      repoKey,
      preservationId,
      fileCount: repoChanges.size
    });

    return {
      hasChanges: true,
      preservationId,
      fileCount: repoChanges.size,
      preservedAt: preservationData.preserved_at
    };
  }

  /**
   * Restore preserved changes after repository refresh
   * @param {string} preservationId - Preservation ID
   * @param {Object} options - Restoration options
   * @returns {boolean} Whether restoration was successful
   */
  restorePreservedChanges(preservationId, options = {}) {
    const preservationData = this.getPreservationData(preservationId);
    
    if (!preservationData) {
      logger.warn('No preservation data found', { preservationId });
      return false;
    }

    const { repoKey, changes } = preservationData;
    const { mergeWithCurrent = true, overwriteCurrent = false } = options;

    try {
      if (overwriteCurrent) {
        // Clear current changes and restore preserved ones
        this.changes.set(repoKey, new Map(Object.entries(changes)));
      } else if (mergeWithCurrent) {
        // Merge preserved changes with current ones
        if (!this.changes.has(repoKey)) {
          this.changes.set(repoKey, new Map());
        }
        
        const repoChanges = this.changes.get(repoKey);
        for (const [filePath, changeData] of Object.entries(changes)) {
          // Only restore if no current change exists for this file
          if (!repoChanges.has(filePath)) {
            repoChanges.set(filePath, changeData);
          }
        }
      } else {
        // Only restore if no current changes exist
        if (!this.hasUnsavedChanges(repoKey)) {
          this.changes.set(repoKey, new Map(Object.entries(changes)));
        }
      }

      // Clean up preservation data
      this.removePreservationData(preservationId);
      
      // Update storage
      this.scheduleStorageUpdate();

      logger.info('Preserved changes restored', {
        repoKey,
        preservationId,
        fileCount: Object.keys(changes).length
      });

      return true;

    } catch (error) {
      logger.error('Failed to restore preserved changes:', error);
      return false;
    }
  }

  /**
   * Get all preservation data for a repository
   * @param {string} repoKey - Repository key
   * @returns {Array} Array of preservation data
   */
  getRepositoryPreservations(repoKey) {
    const allPreservations = this.getAllPreservationData();
    return allPreservations.filter(p => p.repoKey === repoKey);
  }

  /**
   * Add change listener
   * @param {string} repoKey - Repository key
   * @param {Function} callback - Callback function
   */
  addChangeListener(repoKey, callback) {
    if (!this.listeners.has(repoKey)) {
      this.listeners.set(repoKey, []);
    }
    this.listeners.get(repoKey).push(callback);
  }

  /**
   * Remove change listener
   * @param {string} repoKey - Repository key
   * @param {Function} callback - Callback function
   */
  removeChangeListener(repoKey, callback) {
    const repoListeners = this.listeners.get(repoKey);
    if (repoListeners) {
      const index = repoListeners.indexOf(callback);
      if (index > -1) {
        repoListeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit change event
   * @private
   */
  emitChange(repoKey, filePath, changeData, action = 'changed') {
    const repoListeners = this.listeners.get(repoKey);
    if (repoListeners) {
      repoListeners.forEach(callback => {
        try {
          callback({
            repoKey,
            filePath,
            changeData,
            action,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          logger.error('Error in change listener:', error);
        }
      });
    }
  }

  /**
   * Detect file type from path
   * @private
   */
  detectFileType(filePath) {
    const extension = filePath.split('.').pop()?.toLowerCase();
    
    const typeMap = {
      'json': 'json',
      'md': 'markdown',
      'markdown': 'markdown',
      'yml': 'yaml',
      'yaml': 'yaml',
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'css': 'css',
      'scss': 'scss',
      'html': 'html',
      'txt': 'text'
    };

    return typeMap[extension] || 'unknown';
  }

  /**
   * Calculate content size
   * @private
   */
  calculateSize(content) {
    if (typeof content === 'string') {
      return new Blob([content]).size;
    }
    
    try {
      return new Blob([JSON.stringify(content)]).size;
    } catch {
      return 0;
    }
  }

  /**
   * Schedule storage update
   * @private
   */
  scheduleStorageUpdate() {
    if (this.storageTimer) {
      clearTimeout(this.storageTimer);
    }

    this.storageTimer = setTimeout(() => {
      this.saveToStorage();
    }, 1000); // Debounce storage updates
  }

  /**
   * Save to localStorage
   * @private
   */
  saveToStorage() {
    try {
      const data = {
        changes: Object.fromEntries(
          Array.from(this.changes.entries()).map(([repoKey, repoChanges]) => [
            repoKey,
            Object.fromEntries(repoChanges)
          ])
        ),
        saved_at: new Date().toISOString(),
        version: '1.0'
      };

      const serialized = JSON.stringify(data);
      
      // Check size limit
      if (serialized.length > this.options.maxStorageSize) {
        logger.warn('Unsaved changes exceed storage limit, performing cleanup');
        this.performStorageCleanup();
        return;
      }

      localStorage.setItem(this.options.storageKey, serialized);
      
    } catch (error) {
      logger.error('Failed to save unsaved changes to storage:', error);
    }
  }

  /**
   * Load from localStorage
   * @private
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.options.storageKey);
      if (!stored) return;

      const data = JSON.parse(stored);
      
      // Convert back to Maps
      for (const [repoKey, repoChanges] of Object.entries(data.changes || {})) {
        this.changes.set(repoKey, new Map(Object.entries(repoChanges)));
      }

      logger.debug('Unsaved changes loaded from storage', {
        repositories: Object.keys(data.changes || {}).length
      });

    } catch (error) {
      logger.error('Failed to load unsaved changes from storage:', error);
    }
  }

  /**
   * Store preservation data
   * @private
   */
  storePreservationData(preservationId, data) {
    try {
      const key = `${this.options.storageKey}_preservation_${preservationId}`;
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      logger.error('Failed to store preservation data:', error);
    }
  }

  /**
   * Get preservation data
   * @private
   */
  getPreservationData(preservationId) {
    try {
      const key = `${this.options.storageKey}_preservation_${preservationId}`;
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      logger.error('Failed to get preservation data:', error);
      return null;
    }
  }

  /**
   * Remove preservation data
   * @private
   */
  removePreservationData(preservationId) {
    try {
      const key = `${this.options.storageKey}_preservation_${preservationId}`;
      localStorage.removeItem(key);
    } catch (error) {
      logger.error('Failed to remove preservation data:', error);
    }
  }

  /**
   * Get all preservation data
   * @private
   */
  getAllPreservationData() {
    const preservations = [];
    const prefix = `${this.options.storageKey}_preservation_`;
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const data = JSON.parse(localStorage.getItem(key));
          preservations.push(data);
        }
      }
    } catch (error) {
      logger.error('Failed to get all preservation data:', error);
    }

    return preservations;
  }

  /**
   * Setup auto-cleanup
   * @private
   */
  setupAutoCleanup() {
    // Clean up old preservation data on initialization
    this.cleanupOldPreservations();
    
    // Setup periodic cleanup
    setInterval(() => {
      this.cleanupOldPreservations();
    }, 24 * 60 * 60 * 1000); // Daily cleanup
  }

  /**
   * Clean up old preservation data
   * @private
   */
  cleanupOldPreservations() {
    const now = Date.now();
    const preservations = this.getAllPreservationData();
    
    preservations.forEach(preservation => {
      const age = now - new Date(preservation.preserved_at).getTime();
      if (age > this.options.autoCleanupAge) {
        this.removePreservationData(preservation.id);
      }
    });
  }

  /**
   * Perform storage cleanup when size limit is exceeded
   * @private
   */
  performStorageCleanup() {
    // Remove oldest changes first
    const allChanges = [];
    
    for (const [repoKey, repoChanges] of this.changes) {
      for (const [filePath, changeData] of repoChanges) {
        allChanges.push({
          repoKey,
          filePath,
          modifiedAt: new Date(changeData.metadata.modified_at),
          size: changeData.metadata.size
        });
      }
    }

    // Sort by modification time (oldest first)
    allChanges.sort((a, b) => a.modifiedAt - b.modifiedAt);

    // Remove oldest changes until under size limit
    let removedSize = 0;
    const targetSize = this.options.maxStorageSize * 0.8; // Remove to 80% of limit
    
    for (const change of allChanges) {
      this.clearUnsavedChanges(change.repoKey, change.filePath);
      removedSize += change.size;
      
      // Check if we're under the target size
      const currentData = JSON.stringify({
        changes: Object.fromEntries(
          Array.from(this.changes.entries()).map(([repoKey, repoChanges]) => [
            repoKey,
            Object.fromEntries(repoChanges)
          ])
        )
      });
      
      if (currentData.length <= targetSize) {
        break;
      }
    }

    logger.info('Storage cleanup completed', {
      removedSize,
      remainingChanges: allChanges.length - removedSize
    });

    // Try saving again
    this.saveToStorage();
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.storageTimer) {
      clearTimeout(this.storageTimer);
    }
    
    // Save final state
    this.saveToStorage();
    
    // Clear listeners
    this.listeners.clear();
  }
}

/**
 * React hook for unsaved changes management
 */
export function useUnsavedChanges(repoKey, options = {}) {
  const [manager] = useState(() => new UnsavedChangesManager(options));
  const [changesSummary, setChangesSummary] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Update summary when changes occur
  const updateSummary = useCallback(() => {
    const summary = manager.getChangesSummary(repoKey);
    setChangesSummary(summary);
    setHasChanges(summary.hasChanges);
  }, [manager, repoKey]);

  // Setup change listener
  useEffect(() => {
    const handleChange = () => {
      updateSummary();
    };

    manager.addChangeListener(repoKey, handleChange);
    updateSummary(); // Initial update

    return () => {
      manager.removeChangeListener(repoKey, handleChange);
    };
  }, [manager, repoKey, updateSummary]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      manager.destroy();
    };
  }, [manager]);

  const setUnsavedChange = useCallback((filePath, content, metadata) => {
    manager.setUnsavedChange(repoKey, filePath, content, metadata);
  }, [manager, repoKey]);

  const getUnsavedChanges = useCallback((filePath) => {
    return manager.getUnsavedChanges(repoKey, filePath);
  }, [manager, repoKey]);

  const clearUnsavedChanges = useCallback((filePaths) => {
    manager.clearUnsavedChanges(repoKey, filePaths);
  }, [manager, repoKey]);

  const preserveChanges = useCallback(() => {
    return manager.preserveChangesForRefresh(repoKey);
  }, [manager, repoKey]);

  const restoreChanges = useCallback((preservationId, options) => {
    return manager.restorePreservedChanges(preservationId, options);
  }, [manager]);

  return {
    // State
    changesSummary,
    hasChanges,
    
    // Actions
    setUnsavedChange,
    getUnsavedChanges,
    clearUnsavedChanges,
    preserveChanges,
    restoreChanges,
    
    // Manager
    manager
  };
}

export default UnsavedChangesManager;