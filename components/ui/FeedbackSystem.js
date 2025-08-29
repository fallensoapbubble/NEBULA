/**
 * User Feedback System
 * Provides comprehensive feedback for user interactions and system states
 */

import React, { useState, useEffect } from 'react';
import { useToast } from './Toast.js';
import { LoadingSpinner, ProgressBar } from './LoadingStates.js';

/**
 * Success confirmation component
 */
export function SuccessConfirmation({ 
  title = 'Success!', 
  message, 
  actions = [], 
  autoHide = true,
  duration = 5000,
  onHide = null 
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (autoHide && duration > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        if (onHide) onHide();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [autoHide, duration, onHide]);

  if (!visible) return null;

  return (
    <div className="glass-card p-6 border-l-4 border-green-500 bg-green-500/10">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-lg font-medium text-green-100">{title}</h3>
          {message && <p className="mt-1 text-green-200">{message}</p>}
          {actions.length > 0 && (
            <div className="mt-4 flex space-x-3">
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    action.primary
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {autoHide && (
          <button
            onClick={() => setVisible(false)}
            className="flex-shrink-0 text-green-200 hover:text-green-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Error display component with recovery options
 */
export function ErrorDisplay({ 
  error, 
  title = 'Something went wrong', 
  showDetails = false,
  onRetry = null,
  onDismiss = null 
}) {
  const [detailsVisible, setDetailsVisible] = useState(false);

  return (
    <div className="glass-card p-6 border-l-4 border-red-500 bg-red-500/10">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-lg font-medium text-red-100">{title}</h3>
          <p className="mt-1 text-red-200">
            {error?.userMessage || error?.message || 'An unexpected error occurred'}
          </p>
          
          {/* Recovery suggestions */}
          {error?.suggestions && error.suggestions.length > 0 && (
            <div className="mt-3">
              <h4 className="text-sm font-medium text-red-100 mb-2">Try these solutions:</h4>
              <ul className="text-sm text-red-200 space-y-1">
                {error.suggestions.slice(0, 3).map((suggestion, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-red-400 mr-2">•</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-4 flex items-center space-x-3">
            {onRetry && error?.isRetryable && (
              <button
                onClick={onRetry}
                className="px-4 py-2 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Try Again
              </button>
            )}
            {showDetails && (
              <button
                onClick={() => setDetailsVisible(!detailsVisible)}
                className="px-4 py-2 text-sm font-medium bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
              >
                {detailsVisible ? 'Hide Details' : 'Show Details'}
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-sm text-red-200 hover:text-red-100 underline"
              >
                Dismiss
              </button>
            )}
          </div>

          {/* Error details */}
          {detailsVisible && error && (
            <div className="mt-4 p-3 bg-black/20 rounded-lg">
              <h5 className="text-xs font-medium text-red-100 mb-2">Technical Details</h5>
              <div className="text-xs text-red-200 font-mono space-y-1">
                <div><strong>Error Code:</strong> {error.code || 'N/A'}</div>
                <div><strong>Category:</strong> {error.category || 'N/A'}</div>
                <div><strong>Timestamp:</strong> {error.timestamp || 'N/A'}</div>
                {error.endpoint && <div><strong>Endpoint:</strong> {error.endpoint}</div>}
                {error.stack && (
                  <details className="mt-2">
                    <summary className="cursor-pointer hover:text-red-100">Stack Trace</summary>
                    <pre className="mt-1 text-xs whitespace-pre-wrap">{error.stack}</pre>
                  </details>
                )}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-red-200 hover:text-red-100"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * Operation status component for long-running operations
 */
export function OperationStatus({ 
  operation, 
  status = 'idle', 
  progress = 0, 
  message = '', 
  error = null,
  onCancel = null,
  onRetry = null 
}) {
  const statusConfig = {
    idle: { color: 'gray', icon: null },
    loading: { 
      color: 'blue', 
      icon: <LoadingSpinner size="sm" />
    },
    success: { 
      color: 'green', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )
    },
    error: { 
      color: 'red', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      )
    }
  };

  const config = statusConfig[status] || statusConfig.idle;

  return (
    <div className={`glass-card p-4 border-l-4 border-${config.color}-500 bg-${config.color}-500/10`}>
      <div className="flex items-center">
        {config.icon && (
          <div className={`flex-shrink-0 text-${config.color}-400 mr-3`}>
            {config.icon}
          </div>
        )}
        <div className="flex-1">
          <h4 className={`font-medium text-${config.color}-100`}>
            {operation}
          </h4>
          {message && (
            <p className={`text-sm text-${config.color}-200 mt-1`}>
              {message}
            </p>
          )}
          {status === 'loading' && progress > 0 && (
            <div className="mt-2">
              <ProgressBar progress={progress} color={config.color} />
            </div>
          )}
          {error && (
            <p className="text-sm text-red-200 mt-2">
              {error.userMessage || error.message}
            </p>
          )}
        </div>
        <div className="flex-shrink-0 flex space-x-2">
          {status === 'loading' && onCancel && (
            <button
              onClick={onCancel}
              className="text-sm text-gray-300 hover:text-white underline"
            >
              Cancel
            </button>
          )}
          {status === 'error' && onRetry && (
            <button
              onClick={onRetry}
              className="text-sm text-red-200 hover:text-red-100 underline"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Batch operation feedback component
 */
export function BatchOperationFeedback({ 
  operations = [], 
  title = 'Processing Operations',
  onComplete = null 
}) {
  const completedCount = operations.filter(op => op.status === 'completed' || op.status === 'error').length;
  const totalCount = operations.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const hasErrors = operations.some(op => op.status === 'error');

  useEffect(() => {
    if (completedCount === totalCount && onComplete) {
      onComplete(operations);
    }
  }, [completedCount, totalCount, operations, onComplete]);

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-white">{title}</h3>
        <span className="text-sm text-gray-300">
          {completedCount} of {totalCount} completed
        </span>
      </div>
      
      <ProgressBar 
        progress={progress} 
        color={hasErrors ? 'red' : 'blue'} 
        className="mb-4" 
      />

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {operations.map((operation, index) => (
          <div key={index} className="flex items-center justify-between p-2 bg-white/5 rounded">
            <span className="text-sm text-white truncate flex-1">
              {operation.name}
            </span>
            <div className="flex items-center ml-2">
              {operation.status === 'pending' && (
                <div className="w-4 h-4 border border-gray-400 rounded-full" />
              )}
              {operation.status === 'processing' && (
                <LoadingSpinner size="sm" />
              )}
              {operation.status === 'completed' && (
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {operation.status === 'error' && (
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
          </div>
        ))}
      </div>

      {hasErrors && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded">
          <p className="text-sm text-red-200">
            Some operations failed. Check the details above and try again if needed.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Hook for managing operation feedback
 */
export function useOperationFeedback() {
  const { toast } = useToast();
  const [operations, setOperations] = useState({});

  const startOperation = (id, config = {}) => {
    setOperations(prev => ({
      ...prev,
      [id]: {
        id,
        status: 'loading',
        startTime: Date.now(),
        progress: 0,
        message: '',
        ...config
      }
    }));

    return {
      updateProgress: (progress, message) => {
        setOperations(prev => ({
          ...prev,
          [id]: { ...prev[id], progress, message }
        }));
      },
      complete: (message) => {
        setOperations(prev => ({
          ...prev,
          [id]: { 
            ...prev[id], 
            status: 'success', 
            progress: 100,
            message: message || 'Completed successfully',
            endTime: Date.now()
          }
        }));
        
        if (config.showSuccessToast !== false) {
          toast.success(message || `${config.name || 'Operation'} completed successfully`);
        }
      },
      error: (error) => {
        setOperations(prev => ({
          ...prev,
          [id]: { 
            ...prev[id], 
            status: 'error', 
            error,
            message: error.userMessage || error.message || 'Operation failed',
            endTime: Date.now()
          }
        }));
        
        if (config.showErrorToast !== false) {
          toast.error(error.userMessage || error.message || `${config.name || 'Operation'} failed`);
        }
      }
    };
  };

  const getOperation = (id) => operations[id];
  const clearOperation = (id) => {
    setOperations(prev => {
      const { [id]: removed, ...rest } = prev;
      return rest;
    });
  };

  return {
    operations,
    startOperation,
    getOperation,
    clearOperation
  };
}

/**
 * Predefined feedback configurations for common operations
 */
export const FeedbackPresets = {
  repositoryCreation: {
    name: 'Repository Creation',
    showSuccessToast: true,
    showErrorToast: true
  },
  fileSave: {
    name: 'File Save',
    showSuccessToast: true,
    showErrorToast: true
  },
  templateValidation: {
    name: 'Template Validation',
    showSuccessToast: false,
    showErrorToast: true
  },
  dataFetch: {
    name: 'Data Loading',
    showSuccessToast: false,
    showErrorToast: true
  }
};