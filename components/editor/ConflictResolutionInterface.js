/**
 * Conflict Resolution Interface
 * Handles repository conflicts and provides resolution options
 */

import React, { useState, useCallback, useEffect } from 'react';
import { logger } from '../../lib/logger.js';

/**
 * Main Conflict Resolution Interface Component
 */
export const ConflictResolutionInterface = ({
  conflicts = [],
  localChanges = {},
  remoteChanges = {},
  onResolve,
  onCancel,
  onRefresh,
  isVisible = false,
  repositoryInfo = {}
}) => {
  const [selectedResolution, setSelectedResolution] = useState('merge');
  const [resolvedConflicts, setResolvedConflicts] = useState({});
  const [isResolving, setIsResolving] = useState(false);
  const [preserveLocal, setPreserveLocal] = useState(true);

  // Reset state when conflicts change
  useEffect(() => {
    if (conflicts.length > 0) {
      setResolvedConflicts({});
      setSelectedResolution('merge');
    }
  }, [conflicts]);

  const handleResolutionChange = useCallback((conflictId, resolution) => {
    setResolvedConflicts(prev => ({
      ...prev,
      [conflictId]: resolution
    }));
  }, []);

  const handleResolve = useCallback(async () => {
    setIsResolving(true);
    
    try {
      const resolutionData = {
        strategy: selectedResolution,
        conflicts: resolvedConflicts,
        preserveLocalChanges: preserveLocal,
        localChanges,
        remoteChanges,
        timestamp: new Date().toISOString()
      };

      await onResolve?.(resolutionData);
      
      logger.info('Conflicts resolved successfully', {
        strategy: selectedResolution,
        conflictCount: conflicts.length
      });

    } catch (error) {
      logger.error('Failed to resolve conflicts:', error);
      // Error handling would be managed by parent component
    } finally {
      setIsResolving(false);
    }
  }, [selectedResolution, resolvedConflicts, preserveLocal, localChanges, remoteChanges, onResolve, conflicts.length]);

  const handleRefresh = useCallback(async () => {
    try {
      await onRefresh?.();
    } catch (error) {
      logger.error('Failed to refresh repository:', error);
    }
  }, [onRefresh]);

  if (!isVisible || conflicts.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <ConflictHeader 
          repositoryInfo={repositoryInfo}
          conflictCount={conflicts.length}
          onCancel={onCancel}
        />
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <ConflictSummary 
            conflicts={conflicts}
            localChanges={localChanges}
            remoteChanges={remoteChanges}
          />
          
          <ResolutionStrategy
            selectedStrategy={selectedResolution}
            onStrategyChange={setSelectedResolution}
            preserveLocal={preserveLocal}
            onPreserveLocalChange={setPreserveLocal}
          />
          
          <ConflictList
            conflicts={conflicts}
            resolvedConflicts={resolvedConflicts}
            onResolutionChange={handleResolutionChange}
            localChanges={localChanges}
            remoteChanges={remoteChanges}
          />
        </div>
        
        <ConflictActions
          onResolve={handleResolve}
          onCancel={onCancel}
          onRefresh={handleRefresh}
          isResolving={isResolving}
          canResolve={conflicts.every(c => resolvedConflicts[c.id] || selectedResolution === 'overwrite')}
        />
      </div>
    </div>
  );
};

/**
 * Conflict Header Component
 */
const ConflictHeader = ({ repositoryInfo, conflictCount, onCancel }) => (
  <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 p-4">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 flex items-center gap-2">
          <span className="text-2xl">⚠️</span>
          Repository Conflicts Detected
        </h2>
        <p className="text-red-600 dark:text-red-300 text-sm mt-1">
          {repositoryInfo.name && `Repository: ${repositoryInfo.name} • `}
          {conflictCount} conflict{conflictCount !== 1 ? 's' : ''} need resolution
        </p>
      </div>
      <button
        onClick={onCancel}
        className="text-red-500 hover:text-red-700 text-2xl"
        title="Cancel"
      >
        ×
      </button>
    </div>
  </div>
);

/**
 * Conflict Summary Component
 */
const ConflictSummary = ({ conflicts, localChanges, remoteChanges }) => {
  const fileConflicts = conflicts.filter(c => c.type === 'file');
  const contentConflicts = conflicts.filter(c => c.type === 'content');
  
  return (
    <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
      <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-3">Conflict Summary</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <div className="font-medium text-amber-700 dark:text-amber-300">File Conflicts</div>
          <div className="text-amber-600 dark:text-amber-400">{fileConflicts.length} files</div>
        </div>
        
        <div>
          <div className="font-medium text-amber-700 dark:text-amber-300">Content Conflicts</div>
          <div className="text-amber-600 dark:text-amber-400">{contentConflicts.length} sections</div>
        </div>
        
        <div>
          <div className="font-medium text-amber-700 dark:text-amber-300">Unsaved Changes</div>
          <div className="text-amber-600 dark:text-amber-400">
            {Object.keys(localChanges).length} files modified
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Resolution Strategy Component
 */
const ResolutionStrategy = ({ 
  selectedStrategy, 
  onStrategyChange, 
  preserveLocal, 
  onPreserveLocalChange 
}) => (
  <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
    <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">Resolution Strategy</h3>
    
    <div className="space-y-3">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="radio"
          name="resolution"
          value="merge"
          checked={selectedStrategy === 'merge'}
          onChange={(e) => onStrategyChange(e.target.value)}
          className="mt-1"
        />
        <div>
          <div className="font-medium text-blue-700 dark:text-blue-300">Smart Merge</div>
          <div className="text-sm text-blue-600 dark:text-blue-400">
            Automatically merge non-conflicting changes and prompt for conflicts
          </div>
        </div>
      </label>
      
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="radio"
          name="resolution"
          value="refresh"
          checked={selectedStrategy === 'refresh'}
          onChange={(e) => onStrategyChange(e.target.value)}
          className="mt-1"
        />
        <div>
          <div className="font-medium text-blue-700 dark:text-blue-300">Refresh from Remote</div>
          <div className="text-sm text-blue-600 dark:text-blue-400">
            Update to latest remote version (may lose local changes)
          </div>
        </div>
      </label>
      
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="radio"
          name="resolution"
          value="overwrite"
          checked={selectedStrategy === 'overwrite'}
          onChange={(e) => onStrategyChange(e.target.value)}
          className="mt-1"
        />
        <div>
          <div className="font-medium text-blue-700 dark:text-blue-300">Force Save Local</div>
          <div className="text-sm text-blue-600 dark:text-blue-400">
            Overwrite remote with local changes (may lose remote changes)
          </div>
        </div>
      </label>
    </div>
    
    {selectedStrategy !== 'overwrite' && (
      <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-700">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={preserveLocal}
            onChange={(e) => onPreserveLocalChange(e.target.checked)}
          />
          <span className="text-sm text-blue-700 dark:text-blue-300">
            Preserve unsaved local changes when possible
          </span>
        </label>
      </div>
    )}
  </div>
);

/**
 * Conflict List Component
 */
const ConflictList = ({ 
  conflicts, 
  resolvedConflicts, 
  onResolutionChange, 
  localChanges, 
  remoteChanges 
}) => {
  if (conflicts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-800 dark:text-gray-200">Individual Conflicts</h3>
      
      {conflicts.map((conflict) => (
        <ConflictItem
          key={conflict.id}
          conflict={conflict}
          resolution={resolvedConflicts[conflict.id]}
          onResolutionChange={(resolution) => onResolutionChange(conflict.id, resolution)}
          localChange={localChanges[conflict.path]}
          remoteChange={remoteChanges[conflict.path]}
        />
      ))}
    </div>
  );
};

/**
 * Individual Conflict Item Component
 */
const ConflictItem = ({ 
  conflict, 
  resolution, 
  onResolutionChange, 
  localChange, 
  remoteChange 
}) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-medium text-gray-800 dark:text-gray-200">
            {conflict.path}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {conflict.type === 'file' ? 'File conflict' : 'Content conflict'}
          </div>
        </div>
        
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-blue-500 hover:text-blue-700 text-sm"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>
      
      {showDetails && (
        <ConflictDetails
          conflict={conflict}
          localChange={localChange}
          remoteChange={remoteChange}
        />
      )}
      
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onResolutionChange('local')}
          className={`px-3 py-1 rounded text-sm ${
            resolution === 'local'
              ? 'bg-green-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          Use Local
        </button>
        
        <button
          onClick={() => onResolutionChange('remote')}
          className={`px-3 py-1 rounded text-sm ${
            resolution === 'remote'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          Use Remote
        </button>
        
        {conflict.type === 'content' && (
          <button
            onClick={() => onResolutionChange('manual')}
            className={`px-3 py-1 rounded text-sm ${
              resolution === 'manual'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Manual Merge
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Conflict Details Component
 */
const ConflictDetails = ({ conflict, localChange, remoteChange }) => (
  <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded border text-sm">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <div className="font-medium text-green-700 dark:text-green-400 mb-1">Local Changes</div>
        <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-200 dark:border-green-800">
          <pre className="whitespace-pre-wrap text-xs">
            {localChange ? JSON.stringify(localChange, null, 2) : 'No local changes'}
          </pre>
        </div>
      </div>
      
      <div>
        <div className="font-medium text-blue-700 dark:text-blue-400 mb-1">Remote Changes</div>
        <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-200 dark:border-blue-800">
          <pre className="whitespace-pre-wrap text-xs">
            {remoteChange ? JSON.stringify(remoteChange, null, 2) : 'No remote changes'}
          </pre>
        </div>
      </div>
    </div>
    
    {conflict.description && (
      <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
        <div className="font-medium text-amber-700 dark:text-amber-400 text-xs mb-1">Conflict Description</div>
        <div className="text-amber-600 dark:text-amber-300 text-xs">
          {conflict.description}
        </div>
      </div>
    )}
  </div>
);

/**
 * Conflict Actions Component
 */
const ConflictActions = ({ 
  onResolve, 
  onCancel, 
  onRefresh, 
  isResolving, 
  canResolve 
}) => (
  <div className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
    <div className="flex justify-between items-center">
      <button
        onClick={onRefresh}
        className="px-4 py-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 text-sm"
        disabled={isResolving}
      >
        🔄 Refresh Repository
      </button>
      
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          disabled={isResolving}
        >
          Cancel
        </button>
        
        <button
          onClick={onResolve}
          disabled={!canResolve || isResolving}
          className={`px-6 py-2 rounded font-medium ${
            canResolve && !isResolving
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          }`}
        >
          {isResolving ? 'Resolving...' : 'Resolve Conflicts'}
        </button>
      </div>
    </div>
  </div>
);

export default ConflictResolutionInterface;