'use client';

import { createContext, useContext, useReducer, useEffect } from 'react';

/**
 * Authentication Context for managing user authentication state
 */

// Initial authentication state
const initialState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  permissions: [],
  rateLimit: null,
  error: null
};

// Authentication action types
const AUTH_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_AUTHENTICATED: 'SET_AUTHENTICATED',
  SET_UNAUTHENTICATED: 'SET_UNAUTHENTICATED',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  UPDATE_USER: 'UPDATE_USER',
  UPDATE_RATE_LIMIT: 'UPDATE_RATE_LIMIT'
};

// Authentication reducer
function authReducer(state, action) {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
        error: null
      };
      
    case AUTH_ACTIONS.SET_AUTHENTICATED:
      return {
        ...state,
        isAuthenticated: true,
        isLoading: false,
        user: action.payload.user,
        permissions: action.payload.permissions || [],
        rateLimit: action.payload.rateLimit,
        error: null
      };
      
    case AUTH_ACTIONS.SET_UNAUTHENTICATED:
      return {
        ...initialState,
        isLoading: false,
        error: action.payload?.error || null
      };
      
    case AUTH_ACTIONS.SET_ERROR:
      return {
        ...state,
        isLoading: false,
        error: action.payload
      };
      
    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };
      
    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };
      
    case AUTH_ACTIONS.UPDATE_RATE_LIMIT:
      return {
        ...state,
        rateLimit: action.payload
      };
      
    default:
      return state;
  }
}

// Create authentication context
const AuthContext = createContext(null);

/**
 * Authentication Provider Component
 */
export function AuthProvider({ children }) {
  return (
    <AuthContextProvider>
      {children}
    </AuthContextProvider>
  );
}

/**
 * Internal Auth Context Provider that uses custom GitHub OAuth
 */
function AuthContextProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check authentication status on mount and periodically
  useEffect(() => {
    checkAuthStatus();
    
    // Check auth status every 5 minutes
    const interval = setInterval(checkAuthStatus, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  /**
   * Check current authentication status from session API
   */
  const checkAuthStatus = async () => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      
      const response = await fetch('/api/auth/session', {
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (result.success && result.authenticated && result.session) {
        dispatch({
          type: AUTH_ACTIONS.SET_AUTHENTICATED,
          payload: {
            user: result.user,
            permissions: result.session.permissions || ['public_repo'],
            accessToken: result.session.accessToken,
            rateLimit: null // Will be updated by API calls
          }
        });
      } else {
        dispatch({
          type: AUTH_ACTIONS.SET_UNAUTHENTICATED,
          payload: { error: result.error }
        });
      }
    } catch (error) {
      console.error('Auth status check failed:', error);
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: 'Failed to check authentication status'
      });
    }
  };

  /**
   * Initiate GitHub OAuth login
   */
  const login = async (redirectTo = '/') => {
    try {
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
      const loginUrl = `/api/auth/github${redirectTo !== '/' ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`;
      window.location.href = loginUrl;
    } catch (error) {
      console.error('Login initiation failed:', error);
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: 'Failed to initiate login'
      });
    }
  };

  /**
   * Logout user
   */
  const logout = async (redirectTo = '/') => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        dispatch({ type: AUTH_ACTIONS.SET_UNAUTHENTICATED });
        if (redirectTo !== window.location.pathname) {
          window.location.href = redirectTo;
        }
      } else {
        throw new Error('Logout request failed');
      }
    } catch (error) {
      console.error('Logout failed:', error);
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: 'Failed to logout'
      });
    }
  };

  /**
   * Refresh authentication status
   */
  const refresh = async () => {
    await checkAuthStatus();
  };

  /**
   * Clear authentication error
   */
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  /**
   * Check if user has required permissions
   */
  const hasPermission = (requiredScopes = ['public_repo']) => {
    if (!state.isAuthenticated || !state.permissions) {
      return false;
    }
    
    return requiredScopes.every(scope => 
      state.permissions.includes(scope) || 
      state.permissions.includes('repo') // 'repo' includes 'public_repo'
    );
  };

  // Context value
  const contextValue = {
    // State
    ...state,
    
    // Actions
    login,
    logout,
    refresh,
    clearError,
    hasPermission,
    
    // Utilities
    isReady: !state.isLoading,
    canAccessPrivateRepos: state.permissions?.includes('repo'),
    canAccessPublicRepos: state.permissions?.includes('public_repo') || state.permissions?.includes('repo')
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use authentication context
 * Must be used within AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

/**
 * Hook for authentication guards
 * Redirects to login if not authenticated
 */
export function useAuthGuard(requiredScopes = ['public_repo'], redirectTo = '/') {
  const auth = useAuth();
  
  useEffect(() => {
    if (auth.isReady && !auth.isAuthenticated) {
      auth.login(window.location.pathname);
    }
  }, [auth.isReady, auth.isAuthenticated, auth.login]);
  
  useEffect(() => {
    if (auth.isAuthenticated && !auth.hasPermission(requiredScopes)) {
      console.warn('User lacks required permissions:', requiredScopes);
      // Could redirect to permission request page or show error
    }
  }, [auth.isAuthenticated, auth.hasPermission, requiredScopes]);
  
  return {
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    hasRequiredPermissions: auth.hasPermission(requiredScopes),
    user: auth.user
  };
}

/**
 * Higher-order component for protecting routes
 */
export function withAuth(WrappedComponent, requiredScopes = ['public_repo']) {
  return function AuthenticatedComponent(props) {
    const auth = useAuthGuard(requiredScopes);
    
    // Show loading state
    if (auth.isLoading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              <span className="text-white">Checking authentication...</span>
            </div>
          </div>
        </div>
      );
    }
    
    // Show error if not authenticated (shouldn't happen due to redirect)
    if (!auth.isAuthenticated) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center">
            <h2 className="text-xl font-bold text-white mb-4">Authentication Required</h2>
            <p className="text-gray-300 mb-6">Please log in to access this page.</p>
            <button
              onClick={() => window.location.href = '/api/auth/github'}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Login with GitHub
            </button>
          </div>
        </div>
      );
    }
    
    // Show permission error if lacking required scopes
    if (!auth.hasRequiredPermissions) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center">
            <h2 className="text-xl font-bold text-white mb-4">Insufficient Permissions</h2>
            <p className="text-gray-300 mb-6">
              This page requires additional GitHub permissions: {requiredScopes.join(', ')}
            </p>
            <button
              onClick={() => window.location.href = '/api/auth/github'}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Re-authorize with GitHub
            </button>
          </div>
        </div>
      );
    }
    
    // Render protected component
    return <WrappedComponent {...props} />;
  };
}