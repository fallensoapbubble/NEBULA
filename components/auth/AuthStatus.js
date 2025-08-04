'use client';

import { useAuth } from '../../lib/auth-context.js';
import { useAuthError, useRateLimit } from '../../lib/auth-hooks.js';

/**
 * Authentication Status Component
 * Shows current auth state, useful for debugging and development
 */
export default function AuthStatus({ showDetails = false, className = '' }) {
  const auth = useAuth();
  const { errorMessage, hasError, retry } = useAuthError();
  const { rateLimit, warnings, hasWarnings } = useRateLimit();
  
  if (!showDetails && auth.isAuthenticated) {
    return null; // Hide when authenticated and not showing details
  }
  
  return (
    <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-4 ${className}`}>
      {/* Authentication Status */}
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-3 h-3 rounded-full ${
          auth.isLoading ? 'bg-yellow-400 animate-pulse' :
          auth.isAuthenticated ? 'bg-green-400' : 'bg-red-400'
        }`} />
        <span className="text-white font-medium">
          {auth.isLoading ? 'Checking authentication...' :
           auth.isAuthenticated ? 'Authenticated' : 'Not authenticated'}
        </span>
      </div>
      
      {/* User Info */}
      {auth.isAuthenticated && auth.user && (
        <div className="mb-3 p-3 bg-white/5 rounded-lg">
          <div className="flex items-center gap-3">
            <img
              src={auth.user.avatarUrl || auth.user.avatar_url}
              alt={auth.user.name || auth.user.login}
              className="w-8 h-8 rounded-full border border-white/20"
            />
            <div>
              <div className="text-sm font-medium text-white">
                {auth.user.name || auth.user.login}
              </div>
              <div className="text-xs text-gray-400">
                @{auth.user.login}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Permissions */}
      {auth.isAuthenticated && auth.permissions && (
        <div className="mb-3">
          <div className="text-sm font-medium text-gray-300 mb-2">Permissions:</div>
          <div className="flex flex-wrap gap-1">
            {auth.permissions.map(permission => (
              <span
                key={permission}
                className="px-2 py-1 bg-indigo-500/20 text-indigo-300 text-xs rounded-full"
              >
                {permission}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Rate Limit Info */}
      {rateLimit && showDetails && (
        <div className="mb-3">
          <div className="text-sm font-medium text-gray-300 mb-2">GitHub API Rate Limit:</div>
          <div className="text-xs text-gray-400">
            {rateLimit.remaining}/{rateLimit.limit} requests remaining
          </div>
          <div className="text-xs text-gray-500">
            Resets at {new Date(rateLimit.reset).toLocaleTimeString()}
          </div>
          {hasWarnings && (
            <div className="mt-2">
              {warnings.map((warning, index) => (
                <div
                  key={index}
                  className={`text-xs p-2 rounded ${
                    warning.level === 'critical' 
                      ? 'bg-red-500/20 text-red-300' 
                      : 'bg-yellow-500/20 text-yellow-300'
                  }`}
                >
                  {warning.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Error Display */}
      {hasError && (
        <div className="mb-3 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
          <div className="text-sm font-medium text-red-300 mb-2">Authentication Error:</div>
          <div className="text-xs text-red-200 mb-2">{errorMessage}</div>
          {retry && (
            <button
              onClick={retry}
              className="text-xs bg-red-500/30 hover:bg-red-500/40 text-red-200 px-2 py-1 rounded transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      )}
      
      {/* Debug Info (only in development) */}
      {showDetails && process.env.NODE_ENV === 'development' && (
        <details className="mt-3">
          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
            Debug Info
          </summary>
          <pre className="text-xs text-gray-500 mt-2 p-2 bg-black/20 rounded overflow-auto">
            {JSON.stringify({
              isAuthenticated: auth.isAuthenticated,
              isLoading: auth.isLoading,
              hasUser: !!auth.user,
              permissions: auth.permissions,
              error: auth.error,
              rateLimit: rateLimit
            }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}