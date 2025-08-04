'use client';

import { useState } from 'react';
import { 
  useAuth, 
  useAuthState, 
  useGitHubAPI, 
  useUserProfile, 
  usePermissions, 
  useAuthError, 
  useRateLimit 
} from './index.js';

/**
 * Authentication Test Component
 * Comprehensive test of all authentication features
 * Only for development/testing purposes
 */
export default function AuthTest() {
  const [testResults, setTestResults] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  
  // All auth hooks
  const auth = useAuth();
  const authState = useAuthState({
    onLogin: (user) => console.log('Login callback:', user),
    onLogout: () => console.log('Logout callback'),
    onError: (error) => console.log('Error callback:', error)
  });
  const githubAPI = useGitHubAPI();
  const userProfile = useUserProfile();
  const permissions = usePermissions();
  const authError = useAuthError();
  const rateLimit = useRateLimit();
  
  const runTests = async () => {
    setIsRunning(true);
    const results = {};
    
    try {
      // Test 1: Basic auth state
      results.basicAuth = {
        isAuthenticated: auth.isAuthenticated,
        isLoading: auth.isLoading,
        hasUser: !!auth.user,
        isReady: auth.isReady
      };
      
      // Test 2: Permission checks
      results.permissions = {
        hasPublicRepo: permissions.hasPermission('public_repo'),
        hasRepo: permissions.hasPermission('repo'),
        canAccessPublic: permissions.canAccessPublicRepos,
        canAccessPrivate: permissions.canAccessPrivateRepos,
        allPermissions: permissions.permissions
      };
      
      // Test 3: Error handling
      results.errorHandling = {
        hasError: authError.hasError,
        errorMessage: authError.errorMessage,
        shouldShow: authError.shouldShowError,
        hasRetry: !!authError.retry
      };
      
      // Test 4: Rate limit info
      results.rateLimit = {
        hasRateLimit: !!rateLimit.rateLimit,
        hasWarnings: rateLimit.hasWarnings,
        isLow: rateLimit.isLow,
        isCritical: rateLimit.isCritical,
        warnings: rateLimit.warnings
      };
      
      // Test 5: API functionality (if authenticated)
      if (auth.isAuthenticated) {
        try {
          const validationResult = await githubAPI.apiRequest('/api/auth/validate');
          results.apiTest = {
            success: true,
            authenticated: validationResult.authenticated,
            hasUser: !!validationResult.user
          };
        } catch (error) {
          results.apiTest = {
            success: false,
            error: error.message
          };
        }
      } else {
        results.apiTest = {
          skipped: 'Not authenticated'
        };
      }
      
      // Test 6: User profile functionality
      results.userProfile = {
        hasUser: !!userProfile.user,
        isUpdating: userProfile.isUpdating,
        hasError: !!userProfile.updateError
      };
      
    } catch (error) {
      results.error = error.message;
    }
    
    setTestResults(results);
    setIsRunning(false);
  };
  
  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 w-96 bg-black/80 backdrop-blur-xl border border-white/20 rounded-xl p-4 text-xs font-mono z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-bold">Auth Test Panel</h3>
        <button
          onClick={runTests}
          disabled={isRunning}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-1 rounded text-xs transition-colors"
        >
          {isRunning ? 'Running...' : 'Run Tests'}
        </button>
      </div>
      
      {/* Current Auth State */}
      <div className="mb-4 p-2 bg-white/5 rounded">
        <div className="text-gray-300 mb-1">Current State:</div>
        <div className="text-white">
          {auth.isLoading ? '🔄 Loading...' : 
           auth.isAuthenticated ? `✅ Authenticated as ${auth.user?.login}` : 
           '❌ Not authenticated'}
        </div>
        {auth.error && (
          <div className="text-red-300 mt-1">
            ⚠️ {auth.error}
          </div>
        )}
      </div>
      
      {/* Test Results */}
      {Object.keys(testResults).length > 0 && (
        <div className="max-h-64 overflow-auto">
          <div className="text-gray-300 mb-2">Test Results:</div>
          <pre className="text-gray-100 whitespace-pre-wrap">
            {JSON.stringify(testResults, null, 2)}
          </pre>
        </div>
      )}
      
      {/* Quick Actions */}
      <div className="mt-3 pt-3 border-t border-white/10 flex gap-2">
        {!auth.isAuthenticated ? (
          <button
            onClick={auth.login}
            className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs transition-colors"
          >
            Login
          </button>
        ) : (
          <>
            <button
              onClick={auth.refresh}
              className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={auth.logout}
              className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs transition-colors"
            >
              Logout
            </button>
          </>
        )}
        {authError.hasError && (
          <button
            onClick={authError.dismissError}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-1 rounded text-xs transition-colors"
          >
            Dismiss Error
          </button>
        )}
      </div>
    </div>
  );
}