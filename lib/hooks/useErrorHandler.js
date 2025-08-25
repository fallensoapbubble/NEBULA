/**
 * Comprehensive Error Handling Hook
 * Provides centralized error handling, retry logic, and user feedback
 */

import { useState, useCallback, useRef } from 'react';
import { ErrorHandler } from '../errors.js';
import { useRetry } from '../../components/error/RetryHandler.jsx';
import { useErrorReporting } from '../../components/error/ErrorReporting.jsx';

export function useErrorHandler({
  maxRetries = 3,
  autoRetry = true,
  enableReporting = true,
  onError,
  onSuccess,
  context = {}
} = {}) {
  const [errors, setErrors] = useState([]);
  const [isHandlingError, setIsHandlingError] = useState(false);
  const errorIdCounter = useRef(0);

  const retry = useRetry({
    maxRetries,
    autoRetry
  });

  const errorReporting = useErrorReporting();

  /**
   * Handle an error with full processing
   */
  const handleError = useCallback((error, errorContext = {}) => {
    setIsHandlingError(true);

    try {
      // Create standardized error
      const nebulaError = ErrorHandler.handleError(error, {
        ...context,
        ...errorContext
      });

      // Add unique ID for tracking
      const errorId = `error_${Date.now()}_${++errorIdCounter.current}`;
      const errorWithId = {
        ...nebulaError,
        id: errorId,
        timestamp: new Date().toISOString()
      };

      // Add to errors list
      setErrors(prev => [...prev, errorWithId]);

      // Call custom error handler if provided
      if (onError) {
        onError(errorWithId);
      }

      return errorWithId;
    } finally {
      setIsHandlingError(false);
    }
  }, [context, onError]);

  /**
   * Execute an operation with error handling and retry logic
   */
  const executeWithErrorHandling = useCallback(async (operation, operationContext = {}) => {
    try {
      const result = await retry.execute(operation);
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (error) {
      const handledError = handleError(error, operationContext);
      throw handledError;
    }
  }, [retry, handleError, onSuccess]);

  /**
   * Clear a specific error by ID
   */
  const clearError = useCallback((errorId) => {
    setErrors(prev => prev.filter(error => error.id !== errorId));
  }, []);

  /**
   * Clear all errors
   */
  const clearAllErrors = useCallback(() => {
    setErrors([]);
  }, []);

  /**
   * Get the most recent error
   */
  const getLatestError = useCallback(() => {
    return errors.length > 0 ? errors[errors.length - 1] : null;
  }, [errors]);

  /**
   * Get errors by category
   */
  const getErrorsByCategory = useCallback((category) => {
    return errors.filter(error => error.category === category);
  }, [errors]);

  /**
   * Check if there are any errors of a specific severity
   */
  const hasErrorsOfSeverity = useCallback((severity) => {
    return errors.some(error => error.severity === severity);
  }, [errors]);

  /**
   * Retry a failed operation
   */
  const retryOperation = useCallback((operation) => {
    return retry.retry(operation);
  }, [retry]);

  /**
   * Report an error to the error reporting system
   */
  const reportError = useCallback((error) => {
    if (enableReporting) {
      errorReporting.openReporting(error);
    }
  }, [enableReporting, errorReporting]);

  /**
   * Create a wrapped version of an async function with error handling
   */
  const withErrorHandling = useCallback((asyncFunction, operationName = 'operation') => {
    return async (...args) => {
      try {
        const result = await asyncFunction(...args);
        return result;
      } catch (error) {
        const handledError = handleError(error, {
          operation: operationName,
          arguments: args
        });
        throw handledError;
      }
    };
  }, [handleError]);

  /**
   * Get error statistics
   */
  const getErrorStats = useCallback(() => {
    const stats = {
      total: errors.length,
      bySeverity: {},
      byCategory: {},
      retryable: 0,
      recent: 0 // errors in last 5 minutes
    };

    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);

    errors.forEach(error => {
      // Count by severity
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      
      // Count by category
      stats.byCategory[error.category] = (stats.byCategory[error.category] || 0) + 1;
      
      // Count retryable errors
      if (error.isRetryable) {
        stats.retryable++;
      }
      
      // Count recent errors
      if (new Date(error.timestamp).getTime() > fiveMinutesAgo) {
        stats.recent++;
      }
    });

    return stats;
  }, [errors]);

  return {
    // Error state
    errors,
    latestError: getLatestError(),
    hasErrors: errors.length > 0,
    isHandlingError,
    
    // Error handling functions
    handleError,
    executeWithErrorHandling,
    withErrorHandling,
    
    // Error management
    clearError,
    clearAllErrors,
    getErrorsByCategory,
    hasErrorsOfSeverity,
    getErrorStats,
    
    // Retry functionality
    retryOperation,
    isRetrying: retry.isRetrying,
    canRetry: retry.canRetry,
    retryCount: retry.retryCount,
    
    // Error reporting
    reportError,
    isReportingOpen: errorReporting.isReportingOpen,
    ErrorReportingComponent: errorReporting.ErrorReportingComponent,
    
    // Loading state
    isLoading: retry.isLoading
  };
}

/**
 * Simplified error handler hook for basic use cases
 */
export function useSimpleErrorHandler() {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleError = useCallback((err) => {
    const nebulaError = ErrorHandler.handleError(err);
    setError(nebulaError);
    return nebulaError;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const executeAsync = useCallback(async (operation) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await operation();
      return result;
    } catch (err) {
      const handledError = handleError(err);
      throw handledError;
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  return {
    error,
    isLoading,
    handleError,
    clearError,
    executeAsync
  };
}