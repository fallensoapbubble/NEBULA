/**
 * React Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree and displays fallback UI
 */

import React from 'react';
import { ErrorHandler } from '../../lib/errors.js';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error: error
    };
  }

  componentDidCatch(error, errorInfo) {
    // Generate unique error ID for tracking
    const errorId = Math.random().toString(36).substr(2, 9);
    
    // Handle the error through our centralized error handler
    const nebulaError = ErrorHandler.handleError(error, {
      source: 'react_boundary',
      componentStack: errorInfo.componentStack,
      errorBoundary: this.props.name || 'Unknown',
      errorId: errorId,
      userId: this.props.userId,
      sessionId: this.props.sessionId
    });

    this.setState({
      error: nebulaError,
      errorInfo: errorInfo,
      errorId: errorId
    });

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(nebulaError, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });

    // Call optional retry callback
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI provided by parent
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      // Default fallback UI
      return (
        <ErrorFallback
          error={this.state.error}
          errorId={this.state.errorId}
          onRetry={this.handleRetry}
          onReload={this.handleReload}
          showDetails={this.props.showDetails || process.env.NODE_ENV === 'development'}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Default Error Fallback Component with glassmorphic styling
 */
function ErrorFallback({ error, errorId, onRetry, onReload, showDetails = false }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="glass-card max-w-md w-full p-8 text-center">
        {/* Error Icon */}
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        </div>

        {/* Error Title */}
        <h2 className="text-xl font-semibold text-white mb-4">
          Something went wrong
        </h2>

        {/* Error Message */}
        <p className="text-gray-300 mb-6">
          {error?.userMessage || error?.message || 'An unexpected error occurred'}
        </p>

        {/* Error ID */}
        {errorId && (
          <p className="text-xs text-gray-500 mb-6">
            Error ID: {errorId}
          </p>
        )}

        {/* Recovery Suggestions */}
        {error?.suggestions && error.suggestions.length > 0 && (
          <div className="mb-6 text-left">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Try these solutions:</h3>
            <ul className="text-sm text-gray-400 space-y-1">
              {error.suggestions.slice(0, 3).map((suggestion, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {error?.isRetryable && (
            <button
              onClick={onRetry}
              className="glass-button px-4 py-2 text-white font-medium rounded-lg hover:bg-white/10 transition-colors"
            >
              Try Again
            </button>
          )}
          <button
            onClick={onReload}
            className="glass-button px-4 py-2 text-white font-medium rounded-lg hover:bg-white/10 transition-colors"
          >
            Reload Page
          </button>
        </div>

        {/* Error Details (Development Only) */}
        {showDetails && error && (
          <details className="mt-6 text-left">
            <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300">
              Technical Details
            </summary>
            <div className="mt-2 p-3 bg-black/20 rounded-lg text-xs text-gray-400 font-mono overflow-auto max-h-40">
              <div className="mb-2">
                <strong>Error:</strong> {error.name || 'Unknown'}
              </div>
              <div className="mb-2">
                <strong>Code:</strong> {error.code || 'N/A'}
              </div>
              <div className="mb-2">
                <strong>Category:</strong> {error.category || 'N/A'}
              </div>
              {error.stack && (
                <div>
                  <strong>Stack:</strong>
                  <pre className="mt-1 whitespace-pre-wrap">{error.stack}</pre>
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

/**
 * Higher-order component to wrap components with error boundary
 */
export function withErrorBoundary(Component, errorBoundaryProps = {}) {
  const WrappedComponent = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * Hook for handling errors in functional components
 */
export function useErrorHandler() {
  const handleError = React.useCallback((error, context = {}) => {
    const nebulaError = ErrorHandler.handleError(error, {
      source: 'react_hook',
      ...context
    });

    // In a real app, you might want to send this to an error reporting service
    console.error('Error handled by useErrorHandler:', nebulaError);

    return nebulaError;
  }, []);

  return handleError;
}

/**
 * Specialized error boundaries for different parts of the app
 */

// Editor Error Boundary
export function EditorErrorBoundary({ children, onError }) {
  return (
    <ErrorBoundary
      name="EditorErrorBoundary"
      onError={onError}
      fallback={(error, retry) => (
        <div className="glass-card p-6 m-4">
          <h3 className="text-lg font-semibold text-white mb-2">Editor Error</h3>
          <p className="text-gray-300 mb-4">
            The editor encountered an error. Your work has been preserved.
          </p>
          <div className="flex gap-2">
            <button
              onClick={retry}
              className="glass-button px-4 py-2 text-white rounded-lg"
            >
              Restart Editor
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="glass-button px-4 py-2 text-white rounded-lg"
            >
              Go Home
            </button>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

// Gallery Error Boundary
export function GalleryErrorBoundary({ children }) {
  return (
    <ErrorBoundary
      name="GalleryErrorBoundary"
      fallback={(error, retry) => (
        <div className="glass-card p-6 m-4 text-center">
          <h3 className="text-lg font-semibold text-white mb-2">Gallery Error</h3>
          <p className="text-gray-300 mb-4">
            Unable to load the template gallery.
          </p>
          <button
            onClick={retry}
            className="glass-button px-4 py-2 text-white rounded-lg"
          >
            Reload Gallery
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

// Portfolio Error Boundary
export function PortfolioErrorBoundary({ children, username, repo }) {
  return (
    <ErrorBoundary
      name="PortfolioErrorBoundary"
      fallback={(error, retry) => (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="glass-card max-w-md p-6 text-center">
            <h3 className="text-lg font-semibold text-white mb-2">Portfolio Error</h3>
            <p className="text-gray-300 mb-4">
              Unable to load the portfolio for {username}/{repo}.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={retry}
                className="glass-button px-4 py-2 text-white rounded-lg"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="glass-button px-4 py-2 text-white rounded-lg"
              >
                Browse Templates
              </button>
            </div>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}