/**
 * Error Display Component
 * Displays user-friendly error messages with actionable feedback and retry mechanisms
 */

import React, { useState } from 'react';
import { AlertCircle, RefreshCw, ChevronDown, ChevronUp, ExternalLink, Copy, CheckCircle } from 'lucide-react';

export function ErrorDisplay({ 
  error, 
  onRetry, 
  showDetails = false, 
  context = {},
  className = '' 
}) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!error) {
    return null;
  }

  const handleCopyError = async () => {
    const errorDetails = {
      message: error.message,
      code: error.code,
      category: error.category,
      timestamp: error.timestamp,
      context
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy error details:', err);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'border-red-500 bg-red-50 text-red-900';
      case 'high':
        return 'border-red-400 bg-red-50 text-red-800';
      case 'medium':
        return 'border-yellow-400 bg-yellow-50 text-yellow-800';
      case 'low':
        return 'border-blue-400 bg-blue-50 text-blue-800';
      default:
        return 'border-gray-400 bg-gray-50 text-gray-800';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'authentication':
      case 'authorization':
        return '🔐';
      case 'github_api':
        return '🐙';
      case 'network':
        return '🌐';
      case 'rate_limit':
        return '⏱️';
      case 'repository':
        return '📁';
      case 'template':
        return '📄';
      case 'validation':
        return '✅';
      case 'content':
        return '📝';
      default:
        return '⚠️';
    }
  };

  return (
    <div className={`rounded-lg border-2 p-6 ${getSeverityColor(error.severity)} ${className}`}>
      {/* Error Header */}
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">{getCategoryIcon(error.category)}</span>
            <h3 className="text-lg font-semibold">
              {error.userMessage || error.message}
            </h3>
            {error.severity && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white bg-opacity-50">
                {error.severity.toUpperCase()}
              </span>
            )}
          </div>
          
          {error.code && (
            <p className="text-sm opacity-75 mb-3">
              Error Code: {error.code}
            </p>
          )}
        </div>
      </div>

      {/* Suggestions */}
      {error.suggestions && error.suggestions.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">What you can do:</h4>
          <ul className="space-y-1">
            {error.suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start space-x-2 text-sm">
                <span className="text-green-600 mt-0.5">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-6 flex flex-wrap gap-3">
        {error.isRetryable && onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </button>
        )}

        {error.category === 'github_api' && (
          <a
            href="https://www.githubstatus.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Check GitHub Status
          </a>
        )}

        {error.category === 'authentication' && (
          <button
            onClick={() => window.location.href = '/api/auth/signin'}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Sign In Again
          </button>
        )}

        <button
          onClick={handleCopyError}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          {copied ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Copy Error Details
            </>
          )}
        </button>
      </div>

      {/* Technical Details (Development/Debug) */}
      {showDetails && (
        <div className="mt-6 border-t border-gray-200 pt-4">
          <button
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            {showTechnicalDetails ? (
              <ChevronUp className="h-4 w-4 mr-1" />
            ) : (
              <ChevronDown className="h-4 w-4 mr-1" />
            )}
            Technical Details
          </button>
          
          {showTechnicalDetails && (
            <div className="mt-3 p-4 bg-gray-100 rounded-md">
              <div className="space-y-2 text-sm font-mono">
                <div><strong>Category:</strong> {error.category}</div>
                <div><strong>Code:</strong> {error.code}</div>
                <div><strong>Status:</strong> {error.statusCode}</div>
                <div><strong>Timestamp:</strong> {error.timestamp}</div>
                {error.endpoint && (
                  <div><strong>Endpoint:</strong> {error.endpoint}</div>
                )}
                {error.field && (
                  <div><strong>Field:</strong> {error.field}</div>
                )}
                {error.templatePath && (
                  <div><strong>Template:</strong> {error.templatePath}</div>
                )}
                {error.repository && (
                  <div><strong>Repository:</strong> {error.repository}</div>
                )}
                {error.filePath && (
                  <div><strong>File:</strong> {error.filePath}</div>
                )}
                {context && Object.keys(context).length > 0 && (
                  <div>
                    <strong>Context:</strong>
                    <pre className="mt-1 text-xs overflow-x-auto">
                      {JSON.stringify(context, null, 2)}
                    </pre>
                  </div>
                )}
                {error.stack && (
                  <div>
                    <strong>Stack Trace:</strong>
                    <pre className="mt-1 text-xs overflow-x-auto whitespace-pre-wrap">
                      {error.stack}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Retry Information */}
      {error.isRetryable && error.retryAfter && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Automatic retry:</strong> This error can be retried. 
            {error.retryAfter && (
              <span> Recommended wait time: {Math.ceil(error.retryAfter / 1000)} seconds.</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Compact Error Display for inline errors
 */
export function CompactErrorDisplay({ error, onRetry, className = '' }) {
  if (!error) return null;

  return (
    <div className={`flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md ${className}`}>
      <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
      <span className="text-sm text-red-800 flex-1">
        {error.userMessage || error.message}
      </span>
      {error.isRetryable && onRetry && (
        <button
          onClick={onRetry}
          className="text-sm text-red-600 hover:text-red-800 font-medium"
        >
          Retry
        </button>
      )}
    </div>
  );
}