/**
 * Error Reporting Component
 * Provides user-friendly error reporting and debugging information collection
 */

import React, { useState } from 'react';
import { Send, AlertTriangle, CheckCircle, X } from 'lucide-react';

export function ErrorReporting({ 
  error, 
  onSubmit, 
  onClose,
  userContext = {},
  showUserInfo = true 
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [userDescription, setUserDescription] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [includeContext, setIncludeContext] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!onSubmit) return;

    setIsSubmitting(true);

    try {
      const reportData = {
        error: {
          message: error.message,
          code: error.code,
          category: error.category,
          severity: error.severity,
          timestamp: error.timestamp,
          stack: error.stack
        },
        userDescription,
        userEmail: showUserInfo ? userEmail : undefined,
        context: includeContext ? {
          ...userContext,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        } : undefined,
        reportId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      await onSubmit(reportData);
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit error report:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <div className="flex items-center space-x-3 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Report Submitted
            </h3>
          </div>
          
          <p className="text-gray-600 mb-6">
            Thank you for reporting this error. We'll investigate and work on a fix.
          </p>
          
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Report Error
            </h3>
          </div>
          
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Summary */}
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <h4 className="text-sm font-medium text-red-800 mb-2">
              Error Details
            </h4>
            <div className="text-sm text-red-700 space-y-1">
              <div><strong>Message:</strong> {error.userMessage || error.message}</div>
              <div><strong>Code:</strong> {error.code}</div>
              <div><strong>Category:</strong> {error.category}</div>
              <div><strong>Time:</strong> {new Date(error.timestamp).toLocaleString()}</div>
            </div>
          </div>

          {/* User Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              What were you trying to do when this error occurred?
            </label>
            <textarea
              id="description"
              value={userDescription}
              onChange={(e) => setUserDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Please describe the steps you took before encountering this error..."
            />
          </div>

          {/* User Email (Optional) */}
          {showUserInfo && (
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email (optional)
              </label>
              <input
                type="email"
                id="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="your.email@example.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                We'll only use this to follow up if we need more information.
              </p>
            </div>
          )}

          {/* Include Context */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="includeContext"
              checked={includeContext}
              onChange={(e) => setIncludeContext(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="includeContext" className="ml-2 block text-sm text-gray-700">
              Include technical details to help with debugging
            </label>
          </div>

          {/* Context Preview */}
          {includeContext && (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-gray-800 mb-2">
                Technical Information (will be included)
              </h4>
              <div className="text-xs text-gray-600 space-y-1">
                <div>• Current page URL</div>
                <div>• Browser information</div>
                <div>• Error stack trace</div>
                <div>• User session context</div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Report
                </>
              )}
            </button>
            
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Hook for error reporting functionality
 */
export function useErrorReporting() {
  const [isReportingOpen, setIsReportingOpen] = useState(false);
  const [reportingError, setReportingError] = useState(null);

  const openReporting = (error) => {
    setReportingError(error);
    setIsReportingOpen(true);
  };

  const closeReporting = () => {
    setIsReportingOpen(false);
    setReportingError(null);
  };

  const submitReport = async (reportData) => {
    // Default implementation - can be overridden
    console.log('Error report submitted:', reportData);
    
    // In a real implementation, this would send to an error reporting service
    // like Sentry, LogRocket, or a custom endpoint
    try {
      const response = await fetch('/api/error-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit error report');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to submit error report:', error);
      throw error;
    }
  };

  return {
    isReportingOpen,
    reportingError,
    openReporting,
    closeReporting,
    submitReport,
    ErrorReportingComponent: isReportingOpen && reportingError ? (
      <ErrorReporting
        error={reportingError}
        onSubmit={submitReport}
        onClose={closeReporting}
      />
    ) : null
  };
}