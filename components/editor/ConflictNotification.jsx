/**
 * Conflict Notification Component
 * Displays conflict information and resolution options to users
 */

import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, GitMerge, AlertCircle, X } from 'lucide-react';

const ConflictNotification = ({ 
  conflicts, 
  resolutionStrategy, 
  onResolve, 
  onDismiss,
  isResolving = false 
}) => {
  const [selectedStrategy, setSelectedStrategy] = useState(resolutionStrategy?.recommended || 'refresh');
  const [showDetails, setShowDetails] = useState(false);

  if (!conflicts || conflicts.length === 0) return null;

  const getConflictIcon = (conflictType) => {
    switch (conflictType) {
      case 'file_modified':
        return <GitMerge className="w-4 h-4 text-yellow-500" />;
      case 'file_deleted':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStrategyIcon = (strategy) => {
    switch (strategy) {
      case 'refresh':
        return <RefreshCw className="w-4 h-4" />;
      case 'merge':
        return <GitMerge className="w-4 h-4" />;
      case 'overwrite':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6 text-yellow-500" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Repository Conflicts Detected
              </h2>
              <p className="text-sm text-gray-600">
                The repository has been modified externally
              </p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600"
            disabled={isResolving}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Conflict Summary */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Conflicts Found ({conflicts.length})
            </h3>
            <div className="space-y-2">
              {conflicts.map((conflict, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                >
                  {getConflictIcon(conflict.conflictType)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {conflict.path}
                    </p>
                    <p className="text-xs text-gray-500">
                      {conflict.conflictType === 'file_modified' && 'File was modified externally'}
                      {conflict.conflictType === 'file_deleted' && 'File was deleted externally'}
                      {conflict.conflictType === 'error' && `Error: ${conflict.error}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Show Details Toggle */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="mt-3 text-sm text-blue-600 hover:text-blue-800"
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>

            {/* Detailed Conflict Information */}
            {showDetails && (
              <div className="mt-4 space-y-4">
                {conflicts.map((conflict, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">{conflict.path}</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Conflict Type:</strong> {conflict.conflictType}</p>
                      {conflict.expectedSha && (
                        <p><strong>Expected SHA:</strong> {conflict.expectedSha.substring(0, 8)}...</p>
                      )}
                      {conflict.currentSha && (
                        <p><strong>Current SHA:</strong> {conflict.currentSha.substring(0, 8)}...</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resolution Strategies */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Choose Resolution Strategy
            </h3>
            <div className="space-y-3">
              {Object.entries(resolutionStrategy?.strategies || {}).map(([key, strategy]) => (
                <label
                  key={key}
                  className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedStrategy === key
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${!strategy.available && strategy.available !== undefined ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="radio"
                    name="strategy"
                    value={key}
                    checked={selectedStrategy === key}
                    onChange={(e) => setSelectedStrategy(e.target.value)}
                    disabled={!strategy.available && strategy.available !== undefined}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      {getStrategyIcon(key)}
                      <span className="font-medium text-gray-900">{strategy.name}</span>
                      <span className={`px-2 py-1 text-xs rounded-full border ${getRiskColor(strategy.risk)}`}>
                        {strategy.risk} risk
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{strategy.description}</p>
                    {!strategy.available && strategy.available !== undefined && (
                      <p className="text-xs text-red-600 mt-1">Not available for current conflicts</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {resolutionStrategy?.recommended === selectedStrategy && (
              <span className="text-green-600">✓ Recommended strategy</span>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onDismiss}
              disabled={isResolving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onResolve(selectedStrategy)}
              disabled={isResolving || (!resolutionStrategy?.strategies[selectedStrategy]?.available && resolutionStrategy?.strategies[selectedStrategy]?.available !== undefined)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              {isResolving && <RefreshCw className="w-4 h-4 animate-spin" />}
              <span>{isResolving ? 'Resolving...' : 'Resolve Conflict'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConflictNotification;