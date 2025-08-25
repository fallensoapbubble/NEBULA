/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree and displays fallback UI
 */

import React from 'react';
import { ErrorHandler } from '../../lib/errors.js';
import { ErrorDisplay } from './ErrorDisplay.jsx';

export class ErrorBoundary extends React.Component {
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
    // Handle the error using our centralized error handler
    const nebulaError = ErrorHandler.handleError(error, {
      source: 'react_error_boundary',
      componentStack: errorInfo.componentStack,
      errorBoundary: true
    });

    this.setState({
      error: nebulaError,
      errorInfo
    });

    // Log to external error reporting service if configured
    if (this.props.onError) {
      this.props.onError(nebulaError, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
    
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      // Default error display
      return (
        <ErrorDisplay
          error={this.state.error}
          onRetry={this.handleRetry}
          showDetails={process.env.NODE_ENV === 'development'}
          context={{
            boundary: true,
            componentStack: this.state.errorInfo?.componentStack
          }}
        />
      );
    }

    return this.props.children;
  }
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