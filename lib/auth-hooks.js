'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './auth-context.js';

/**
 * Custom authentication hooks for common use cases
 */

/**
 * Hook for handling authentication state changes
 * Provides callbacks for login/logout events
 */
export function useAuthState(callbacks = {}) {
  const auth = useAuth();
  const { onLogin, onLogout, onError } = callbacks;
  
  useEffect(() => {
    if (auth.isReady && auth.isAuthenticated && onLogin) {
      onLogin(auth.user);
    }
  }, [auth.isReady, auth.isAuthenticated, auth.user, onLogin]);
  
  useEffect(() => {
    if (auth.isReady && !auth.isAuthenticated && onLogout) {
      onLogout();
    }
  }, [auth.isReady, auth.isAuthenticated, onLogout]);
  
  useEffect(() => {
    if (auth.error && onError) {
      onError(auth.error);
    }
  }, [auth.error, onError]);
  
  return auth;
}

/**
 * Hook for GitHub API operations with authentication
 * Automatically handles token validation and refresh
 */
export function useGitHubAPI() {
  const auth = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  /**
   * Make authenticated GitHub API request
   */
  const apiRequest = useCallback(async (endpoint, options = {}) => {
    if (!auth.isAuthenticated) {
      throw new Error('User not authenticated');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(endpoint, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
      
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [auth.isAuthenticated]);
  
  /**
   * Clear API error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  return {
    apiRequest,
    isLoading,
    error,
    clearError,
    isAuthenticated: auth.isAuthenticated,
    rateLimit: auth.rateLimit
  };
}

/**
 * Hook for managing user profile data
 * Provides methods to update and refresh user information
 */
export function useUserProfile() {
  const auth = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  
  /**
   * Refresh user profile from GitHub
   */
  const refreshProfile = useCallback(async () => {
    if (!auth.isAuthenticated) {
      return;
    }
    
    try {
      await auth.refresh();
    } catch (error) {
      console.error('Failed to refresh profile:', error);
      setUpdateError('Failed to refresh profile');
    }
  }, [auth]);
  
  /**
   * Update local user data (for optimistic updates)
   */
  const updateProfile = useCallback((updates) => {
    // This would typically trigger a context update
    // For now, we'll just refresh from the server
    refreshProfile();
  }, [refreshProfile]);
  
  return {
    user: auth.user,
    isUpdating,
    updateError,
    refreshProfile,
    updateProfile,
    clearError: () => setUpdateError(null)
  };
}

/**
 * Hook for permission-based UI rendering
 * Provides utilities for conditional rendering based on user permissions
 */
export function usePermissions() {
  const auth = useAuth();
  
  /**
   * Check if user has specific permission
   */
  const hasPermission = useCallback((scopes) => {
    return auth.hasPermission(Array.isArray(scopes) ? scopes : [scopes]);
  }, [auth]);
  
  /**
   * Render component only if user has required permissions
   */
  const renderIfPermitted = useCallback((scopes, component, fallback = null) => {
    return hasPermission(scopes) ? component : fallback;
  }, [hasPermission]);
  
  /**
   * Get permission status for multiple scopes
   */
  const getPermissionStatus = useCallback((scopeList) => {
    return scopeList.reduce((status, scope) => {
      status[scope] = hasPermission(scope);
      return status;
    }, {});
  }, [hasPermission]);
  
  return {
    hasPermission,
    renderIfPermitted,
    getPermissionStatus,
    permissions: auth.permissions,
    canAccessPrivateRepos: auth.canAccessPrivateRepos,
    canAccessPublicRepos: auth.canAccessPublicRepos
  };
}

/**
 * Hook for handling authentication errors
 * Provides error recovery and user feedback utilities
 */
export function useAuthError() {
  const auth = useAuth();
  const [dismissedErrors, setDismissedErrors] = useState(new Set());
  
  /**
   * Dismiss an error (prevent it from showing again)
   */
  const dismissError = useCallback((errorMessage) => {
    setDismissedErrors(prev => new Set([...prev, errorMessage]));
    auth.clearError();
  }, [auth]);
  
  /**
   * Check if error should be shown
   */
  const shouldShowError = useCallback((errorMessage) => {
    return errorMessage && !dismissedErrors.has(errorMessage);
  }, [dismissedErrors]);
  
  /**
   * Get user-friendly error message
   */
  const getErrorMessage = useCallback((error) => {
    if (!error) return null;
    
    // Map technical errors to user-friendly messages
    const errorMap = {
      'Invalid or expired token': 'Your session has expired. Please log in again.',
      'Token lacks required permissions': 'Additional permissions are required. Please re-authorize the application.',
      'Authentication check failed': 'Unable to verify your login status. Please try refreshing the page.',
      'Failed to check authentication status': 'Connection error. Please check your internet connection.',
      'No active session': 'You are not currently logged in.',
      'Session expired': 'Your session has expired. Please log in again.'
    };
    
    return errorMap[error] || error;
  }, []);
  
  /**
   * Get recovery action for error
   */
  const getRecoveryAction = useCallback((error) => {
    if (!error) return null;
    
    const actionMap = {
      'Invalid or expired token': () => auth.login(),
      'Token lacks required permissions': () => auth.login(),
      'Your session has expired. Please log in again.': () => auth.login(),
      'Additional permissions are required. Please re-authorize the application.': () => auth.login(),
      'You are not currently logged in.': () => auth.login()
    };
    
    const friendlyError = getErrorMessage(error);
    return actionMap[friendlyError] || actionMap[error];
  }, [auth, getErrorMessage]);
  
  return {
    error: auth.error,
    hasError: !!auth.error,
    shouldShowError: shouldShowError(auth.error),
    errorMessage: getErrorMessage(auth.error),
    dismissError: () => dismissError(auth.error),
    retry: getRecoveryAction(auth.error),
    clearAllDismissed: () => setDismissedErrors(new Set())
  };
}

/**
 * Hook for rate limit monitoring
 * Provides GitHub API rate limit information and warnings
 */
export function useRateLimit() {
  const auth = useAuth();
  const [warnings, setWarnings] = useState([]);
  
  useEffect(() => {
    if (!auth.rateLimit) return;
    
    const { remaining, limit, reset } = auth.rateLimit;
    const percentRemaining = (remaining / limit) * 100;
    
    // Clear existing warnings
    setWarnings([]);
    
    // Add warnings based on remaining rate limit
    if (percentRemaining <= 10) {
      setWarnings(prev => [...prev, {
        level: 'critical',
        message: `GitHub API rate limit critically low: ${remaining}/${limit} requests remaining`,
        resetTime: reset
      }]);
    } else if (percentRemaining <= 25) {
      setWarnings(prev => [...prev, {
        level: 'warning',
        message: `GitHub API rate limit low: ${remaining}/${limit} requests remaining`,
        resetTime: reset
      }]);
    }
  }, [auth.rateLimit]);
  
  return {
    rateLimit: auth.rateLimit,
    warnings,
    hasWarnings: warnings.length > 0,
    isLow: auth.rateLimit && (auth.rateLimit.remaining / auth.rateLimit.limit) <= 0.25,
    isCritical: auth.rateLimit && (auth.rateLimit.remaining / auth.rateLimit.limit) <= 0.10
  };
}