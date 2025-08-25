/**
 * Retry Handler Component
 * Provides automatic retry functionality with exponential backoff for failed operations
 */

import React, { useState, useCallback, useEffect } from 'react';
import { ErrorHandler } from '../../lib/errors.js';
import { CompactErrorDisplay } from './ErrorDisplay.jsx';

export function RetryHandler({
  operation,
  maxRetries = 3,
  initialDelay = 1000,
  maxDelay = 30000,
  onSuccess,
  onError,
  children,
  renderError,
  autoRetry = true
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [retryTimeout, setRetryTimeout] = useState(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [retryTimeout]);

  const calculateDelay = useCallback((attempt) => {
    // Use error-specific delay if available
    if (error?.retryAfter) {
      return error.retryAfter;
    }

    // Exponential backoff with jitter
    const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
  }, [error, initialDelay, maxDelay]);

  const executeOperation = useCallback(async (isRetry = false) => {
    if (!operation) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await operation();
      
      // Reset retry count on success
      setRetryCount(0);
      setIsLoading(false);
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (err) {
      const nebulaError = ErrorHandler.handleError(err, {
        source: 'retry_handler',
        retryAttempt: retryCount,
        isRetry
      });

      setError(nebulaError);
      setIsLoading(false);

      // Determine if we should retry
      const shouldRetry = nebulaError.isRetryable && retryCount < maxRetries;

      if (shouldRetry && autoRetry) {
        const delay = calculateDelay(retryCount);
        setRetryCount(prev => prev + 1);
        
        const timeout = setTimeout(() => {
          executeOperation(true);
        }, delay);
        
        setRetryTimeout(timeout);
      } else {
        if (onError) {
          onError(nebulaError);
        }
      }

      throw nebulaError;
    }
  }, [operation, retryCount, maxRetries, autoRetry, calculateDelay, onSuccess, onError]);

  const manualRetry = useCallback(() => {
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      setRetryTimeout(null);
    }
    
    setRetryCount(prev => prev + 1);
    executeOperation(true);
  }, [executeOperation, retryTimeout]);

  const reset = useCallback(() => {
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      setRetryTimeout(null);
    }
    
    setError(null);
    setRetryCount(0);
    setIsLoading(false);
  }, [retryTimeout]);

  // Render function for children
  const renderProps = {
    execute: executeOperation,
    retry: manualRetry,
    reset,
    isLoading,
    error,
    retryCount,
    canRetry: error?.isRetryable && retryCount < maxRetries,
    isRetrying: retryTimeout !== null
  };

  // If children is a function, call it with render props
  if (typeof children === 'function') {
    return children(renderProps);
  }

  // Default rendering
  return (
    <div>
      {children}
      
      {error && (
        <div className="mt-4">
          {renderError ? (
            renderError(error, manualRetry, renderProps)
          ) : (
            <CompactErrorDisplay 
              error={error} 
              onRetry={renderProps.canRetry ? manualRetry : null}
            />
          )}
          
          {/* Retry Status */}
          {retryTimeout && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
              Retrying in a moment... (Attempt {retryCount + 1} of {maxRetries + 1})
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Hook for retry functionality
 */
export function useRetry({
  maxRetries = 3,
  initialDelay = 1000,
  maxDelay = 30000,
  autoRetry = true
} = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [retryTimeout, setRetryTimeout] = useState(null);

  const calculateDelay = useCallback((attempt, errorRetryAfter) => {
    if (errorRetryAfter) {
      return errorRetryAfter;
    }

    const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
  }, [initialDelay, maxDelay]);

  const execute = useCallback(async (operation, isRetry = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await operation();
      setRetryCount(0);
      setIsLoading(false);
      return result;
    } catch (err) {
      const nebulaError = ErrorHandler.handleError(err, {
        source: 'use_retry_hook',
        retryAttempt: retryCount,
        isRetry
      });

      setError(nebulaError);
      setIsLoading(false);

      const shouldRetry = nebulaError.isRetryable && retryCount < maxRetries;

      if (shouldRetry && autoRetry) {
        const delay = calculateDelay(retryCount, nebulaError.retryAfter);
        setRetryCount(prev => prev + 1);
        
        const timeout = setTimeout(() => {
          execute(operation, true);
        }, delay);
        
        setRetryTimeout(timeout);
      }

      throw nebulaError;
    }
  }, [retryCount, maxRetries, autoRetry, calculateDelay]);

  const retry = useCallback((operation) => {
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      setRetryTimeout(null);
    }
    
    setRetryCount(prev => prev + 1);
    return execute(operation, true);
  }, [execute, retryTimeout]);

  const reset = useCallback(() => {
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      setRetryTimeout(null);
    }
    
    setError(null);
    setRetryCount(0);
    setIsLoading(false);
  }, [retryTimeout]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [retryTimeout]);

  return {
    execute,
    retry,
    reset,
    isLoading,
    error,
    retryCount,
    canRetry: error?.isRetryable && retryCount < maxRetries,
    isRetrying: retryTimeout !== null
  };
}