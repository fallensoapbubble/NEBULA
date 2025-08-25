/**
 * Error Handling Example Component
 * Demonstrates comprehensive error handling patterns and user interfaces
 */

import React, { useState } from 'react';
import { ErrorBoundary } from './ErrorBoundary.jsx';
import { ErrorDisplay, CompactErrorDisplay } from './ErrorDisplay.jsx';
import { RetryHandler } from './RetryHandler.jsx';
import { useErrorHandler, useSimpleErrorHandler } from '../../lib/hooks/useErrorHandler.js';
import { GitHubOperationLogger } from '../../lib/github-error-logger.js';

// Simulate different types of errors for demonstration
const simulateError = (type) => {
  switch (type) {
    case 'github_auth':
      throw new Error('GitHub authentication failed');
    case 'github_rate_limit':
      const rateLimitError = new Error('API rate limit exceeded');
      rateLimitError.status = 403;
      rateLimitError.response = {
        headers: {
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': Math.floor(Date.now() / 1000) + 3600
        }
      };
      throw rateLimitError;
    case 'network':
      const networkError = new TypeError('Failed to fetch');
      networkError.name = 'TypeError';
      throw networkError;
    case 'validation':
      const validationError = new Error('Invalid input data');
      validationError.name = 'ValidationError';
      throw validationError;
    case 'repository':
      const repoError = new Error('Repository not found');
      repoError.status = 404;
      throw repoError;
    default:
      throw new Error('Unknown error occurred');
  }
};

// Component that throws errors for testing error boundary
function ErrorThrowingComponent({ errorType }) {
  if (errorType) {
    simulateError(errorType);
  }
  return <div>No error - component rendered successfully!</div>;
}

export function ErrorHandlingExample() {
  const [selectedErrorType, setSelectedErrorType] = useState('');
  const [boundaryErrorType, setBoundaryErrorType] = useState('');
  
  // Comprehensive error handler
  const errorHandler = useErrorHandler({
    maxRetries: 3,
    autoRetry: false, // Manual retry for demo
    enableReporting: true,
    onError: (error) => {
      console.log('Error handled:', error);
    },
    onSuccess: (result) => {
      console.log('Operation succeeded:', result);
    }
  });

  // Simple error handler for basic cases
  const simpleErrorHandler = useSimpleErrorHandler();

  const handleSimulateError = async (errorType) => {
    try {
      await errorHandler.executeWithErrorHandling(
        () => simulateError(errorType),
        { operation: 'simulate_error', errorType }
      );
    } catch (error) {
      // Error is already handled by the error handler
      console.log('Caught handled error:', error);
    }
  };

  const handleSimpleError = async (errorType) => {
    try {
      await simpleErrorHandler.executeAsync(() => simulateError(errorType));
    } catch (error) {
      // Error is already handled
      console.log('Simple error caught:', error);
    }
  };

  // Simulate GitHub API operation with logging
  const handleGitHubOperation = async () => {
    try {
      await GitHubOperationLogger.repoAccess(
        '/repos/user/repo',
        () => simulateError('github_rate_limit'),
        { owner: 'user', repo: 'repo' }
      );
    } catch (error) {
      errorHandler.handleError(error, { source: 'github_demo' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Error Handling System Demo
        </h1>

        {/* Error Statistics */}
        {errorHandler.hasErrors && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Error Statistics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Total Errors:</span> {errorHandler.getErrorStats().total}
              </div>
              <div>
                <span className="font-medium">Recent:</span> {errorHandler.getErrorStats().recent}
              </div>
              <div>
                <span className="font-medium">Retryable:</span> {errorHandler.getErrorStats().retryable}
              </div>
              <div>
                <span className="font-medium">Critical:</span> {errorHandler.getErrorStats().bySeverity?.critical || 0}
              </div>
            </div>
          </div>
        )}

        {/* Comprehensive Error Handler Demo */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Comprehensive Error Handler
          </h2>
          
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {['github_auth', 'github_rate_limit', 'network', 'validation', 'repository'].map((type) => (
                <button
                  key={type}
                  onClick={() => handleSimulateError(type)}
                  disabled={errorHandler.isLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Simulate {type.replace('_', ' ')} Error
                </button>
              ))}
              
              <button
                onClick={handleGitHubOperation}
                disabled={errorHandler.isLoading}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                GitHub API Demo
              </button>
            </div>

            {errorHandler.isLoading && (
              <div className="flex items-center space-x-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Processing...</span>
              </div>
            )}

            {errorHandler.latestError && (
              <ErrorDisplay
                error={errorHandler.latestError}
                onRetry={errorHandler.canRetry ? () => errorHandler.retryOperation(() => simulateError(selectedErrorType)) : null}
                showDetails={true}
              />
            )}

            {errorHandler.hasErrors && (
              <div className="flex space-x-2">
                <button
                  onClick={() => errorHandler.reportError(errorHandler.latestError)}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
                >
                  Report Latest Error
                </button>
                
                <button
                  onClick={errorHandler.clearAllErrors}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Clear All Errors
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Simple Error Handler Demo */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Simple Error Handler
          </h2>
          
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {['network', 'validation'].map((type) => (
                <button
                  key={type}
                  onClick={() => handleSimpleError(type)}
                  disabled={simpleErrorHandler.isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Simple {type} Error
                </button>
              ))}
            </div>

            {simpleErrorHandler.error && (
              <CompactErrorDisplay
                error={simpleErrorHandler.error}
                onRetry={null}
              />
            )}

            {simpleErrorHandler.error && (
              <button
                onClick={simpleErrorHandler.clearError}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Clear Error
              </button>
            )}
          </div>
        </div>

        {/* Retry Handler Demo */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Retry Handler Component
          </h2>
          
          <RetryHandler
            operation={() => {
              // Simulate operation that fails 2 times then succeeds
              const attempts = parseInt(localStorage.getItem('retryAttempts') || '0');
              localStorage.setItem('retryAttempts', (attempts + 1).toString());
              
              if (attempts < 2) {
                simulateError('network');
              }
              
              localStorage.removeItem('retryAttempts');
              return Promise.resolve('Operation succeeded!');
            }}
            maxRetries={3}
            autoRetry={false}
            onSuccess={(result) => console.log('Retry success:', result)}
            onError={(error) => console.log('Retry error:', error)}
          >
            {({ execute, retry, isLoading, error, canRetry, retryCount }) => (
              <div className="space-y-4">
                <button
                  onClick={execute}
                  disabled={isLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Executing...' : 'Execute Retry Demo'}
                </button>
                
                {error && (
                  <CompactErrorDisplay
                    error={error}
                    onRetry={canRetry ? retry : null}
                  />
                )}
                
                {retryCount > 0 && (
                  <p className="text-sm text-gray-600">
                    Retry attempts: {retryCount}
                  </p>
                )}
              </div>
            )}
          </RetryHandler>
        </div>

        {/* Error Boundary Demo */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Error Boundary Demo
          </h2>
          
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <select
                value={boundaryErrorType}
                onChange={(e) => setBoundaryErrorType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No Error</option>
                <option value="github_auth">GitHub Auth Error</option>
                <option value="network">Network Error</option>
                <option value="validation">Validation Error</option>
              </select>
            </div>

            <ErrorBoundary
              onError={(error, errorInfo) => {
                console.log('Error boundary caught:', error, errorInfo);
              }}
              onRetry={() => {
                setBoundaryErrorType('');
              }}
            >
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                <ErrorThrowingComponent errorType={boundaryErrorType} />
              </div>
            </ErrorBoundary>
          </div>
        </div>

        {/* Error Reporting Component */}
        {errorHandler.ErrorReportingComponent}
      </div>
    </div>
  );
}