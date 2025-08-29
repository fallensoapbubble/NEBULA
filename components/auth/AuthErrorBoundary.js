'use client';

import React, { Component } from 'react';

/**
 * Error Boundary for Authentication Errors
 * Catches and handles authentication-related errors gracefully
 */
class AuthErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }
  
  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }
  
  componentDidCatch(error, errorInfo) {
    // Log the error for debugging
    console.error('Authentication Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });
    
    // Report to error tracking service if available
    if (typeof window !== 'undefined' && window.reportError) {
      window.reportError(error);
    }
  }
  
  handleRetry = () => {
    // Clear error state and retry
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
    
    // Refresh authentication status
    if (this.props.onRetry) {
      this.props.onRetry();
    } else {
      // Default retry: reload the page
      window.location.reload();
    }
  };
  
  handleLogin = () => {
    // Redirect to login
    window.location.href = '/api/auth/github';
  };
  
  render() {
    if (this.state.hasError) {
      // Custom error UI
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }
      
      // Default error UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center max-w-md w-full">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <h2 className="text-xl font-bold text-white mb-4">
              Authentication Error
            </h2>
            
            <p className="text-gray-300 mb-6">
              Something went wrong with the authentication system. This might be a temporary issue.
            </p>
            
            {/* Error details in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300 mb-2">
                  Error Details
                </summary>
                <div className="bg-black/20 rounded-lg p-3 text-xs text-red-300 font-mono overflow-auto max-h-32">
                  <div className="mb-2">
                    <strong>Error:</strong> {this.state.error.message}
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap mt-1">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </button>
              
              <button
                onClick={this.handleLogin}
                className="bg-indigo-600 hover:bg-indigo-700 border border-indigo-600 hover:border-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                Login Again
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}

export default AuthErrorBoundary;

/**
 * Hook version of error boundary for functional components
 * Note: This is a simplified version - full error boundaries require class components
 */
export function useAuthErrorHandler() {
  const handleError = (error, errorInfo) => {
    console.error('Authentication error:', error, errorInfo);
    
    // Report to error tracking service
    if (typeof window !== 'undefined' && window.reportError) {
      window.reportError(error);
    }
  };
  
  return { handleError };
}